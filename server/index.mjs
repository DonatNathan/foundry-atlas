import { timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { pool, query } from './db.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ?? 4000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.error('ADMIN_TOKEN is not set — refusing to start. See server/.env.example.');
  process.exit(1);
}

const app = express();

// Restrict cross-origin requests to the configured frontend origin(s) in
// production. CORS_ORIGIN is a comma-separated list, e.g.
// "https://map.yourdomain.com". Unset = allow any origin (fine for local dev,
// where the frontend is same-origin via the Vite proxy anyway).
const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : true }));

app.use(express.json());

// ---- helpers ---------------------------------------------------------------

// Constant-time comparison so we don't leak the token length/contents via timing.
const tokenMatches = (provided) => {
  if (typeof provided !== 'string' || provided.length === 0) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(ADMIN_TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
};

const requireAdmin = (req, res, next) => {
  const header = req.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.get('x-admin-token');
  if (!tokenMatches(token)) {
    return res.status(401).json({ error: 'Invalid or missing admin token.' });
  }
  next();
};

// Columns an admin is allowed to edit on an application.
const EDITABLE = [
  'name', 'category_id', 'description', 'use_case', 'tier',
  'is_core', 'available_in_dev', 'learning_order', 'status', 'era', 'docs_url', 'tips',
];
// Boolean columns — coerced from 'true'/'false' strings where needed.
const BOOLEAN_FIELDS = new Set(['is_core', 'available_in_dev']);
const TIERS = new Set(['beginner', 'intermediate', 'advanced']);
const STATUSES = new Set(['stable', 'new', 'legacy']);

const rowToApp = (r) => ({
  ...r,
  is_core: r.is_core === true,
  available_in_dev: r.available_in_dev === true,
});

// Adds columns introduced after the initial schema, idempotently on startup, so
// existing deployments pick them up without a destructive reseed.
const ensureApplicationColumns = async () => {
  await query(
    'ALTER TABLE application ADD COLUMN IF NOT EXISTS available_in_dev BOOLEAN NOT NULL DEFAULT FALSE'
  );
};

// ---- read endpoints (public) ----------------------------------------------

app.get('/api/graph', async (_req, res, next) => {
  try {
    const [categories, applications, links, resources, projects] = await Promise.all([
      query('SELECT id, name, color, sort FROM category ORDER BY sort'),
      query(
        `SELECT id, name, category_id, description, use_case, tier, is_core,
                available_in_dev, learning_order, status, era, docs_url, tips
         FROM application ORDER BY category_id, name`
      ),
      query(
        'SELECT id, source_id, target_id, relationship, description FROM application_link ORDER BY id'
      ),
      query('SELECT id, app_id, kind, title, url, sort FROM app_resource ORDER BY app_id, sort, id'),
      query(
        `SELECT id, app_id, kind, title, context, instructions, dataset_url, sort
         FROM app_project ORDER BY app_id, sort, id`
      ),
    ]);
    res.json({
      categories: categories.rows,
      applications: applications.rows.map(rowToApp),
      links: links.rows,
      resources: resources.rows,
      projects: projects.rows,
    });
  } catch (err) {
    next(err);
  }
});

// Lets the frontend confirm a token before unlocking the editor UI.
app.get('/api/admin/check', requireAdmin, (_req, res) => res.json({ ok: true }));

// ---- write endpoints (admin only) -----------------------------------------

app.put('/api/applications/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body ?? {};

    // Validate constrained fields up front for clearer errors than a 500.
    if (body.tier !== undefined && !TIERS.has(body.tier)) {
      return res.status(400).json({ error: `Invalid tier: ${body.tier}` });
    }
    if (body.status !== undefined && !STATUSES.has(body.status)) {
      return res.status(400).json({ error: `Invalid status: ${body.status}` });
    }
    if (body.name !== undefined && String(body.name).trim() === '') {
      return res.status(400).json({ error: 'Name cannot be empty.' });
    }

    const fields = EDITABLE.filter((k) => k in body);
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No editable fields provided.' });
    }

    const set = fields.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = fields.map((k) => body[k]);
    const result = await query(
      `UPDATE application SET ${set}, updated_at = now() WHERE id = $1
       RETURNING id, name, category_id, description, use_case, tier, is_core,
                 available_in_dev, learning_order, status, era, docs_url, tips`,
      [id, ...values]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: `Application not found: ${id}` });
    }
    res.json(rowToApp(result.rows[0]));
  } catch (err) {
    // Foreign-key / check-constraint violations come back as 400, not 500.
    if (err.code === '23503' || err.code === '23514') {
      return res.status(400).json({ error: err.detail ?? err.message });
    }
    next(err);
  }
});

const REQUIRED = ['id', 'name', 'category_id', 'description', 'use_case', 'tier', 'status'];
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

app.post('/api/applications', requireAdmin, async (req, res, next) => {
  try {
    const b = req.body ?? {};
    const missing = REQUIRED.filter((k) => b[k] === undefined || String(b[k]).trim() === '');
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` });
    }
    if (!KEBAB.test(b.id)) {
      return res.status(400).json({ error: 'id must be kebab-case (lowercase letters, digits, hyphens).' });
    }
    if (!TIERS.has(b.tier)) return res.status(400).json({ error: `Invalid tier: ${b.tier}` });
    if (!STATUSES.has(b.status)) return res.status(400).json({ error: `Invalid status: ${b.status}` });

    const result = await query(
      `INSERT INTO application
         (id, name, category_id, description, use_case, tier, is_core,
          available_in_dev, learning_order, status, era, docs_url, tips)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id, name, category_id, description, use_case, tier, is_core,
                 available_in_dev, learning_order, status, era, docs_url, tips`,
      [
        b.id, b.name, b.category_id, b.description, b.use_case, b.tier,
        b.is_core ?? false, b.available_in_dev ?? false, b.learning_order ?? null, b.status,
        b.era ?? null, b.docs_url ?? null, b.tips ?? null,
      ]
    );
    res.status(201).json(rowToApp(result.rows[0]));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An application with that id already exists.' });
    }
    if (err.code === '23503' || err.code === '23514') {
      return res.status(400).json({ error: err.detail ?? err.message });
    }
    next(err);
  }
});

// Deleting an application also removes any links touching it (transactional).
app.delete('/api/applications/:id', requireAdmin, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');
    const links = await client.query(
      'DELETE FROM application_link WHERE source_id = $1 OR target_id = $1',
      [id]
    );
    const del = await client.query('DELETE FROM application WHERE id = $1', [id]);
    if (del.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `Application not found: ${id}` });
    }
    await client.query('COMMIT');
    res.json({ id, removedLinks: links.rowCount });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ---- categories (admin only) ----------------------------------------------

const HEX = /^#[0-9a-fA-F]{6}$/;

const validateCategory = (b, { partial = false } = {}) => {
  if (!partial || b.name !== undefined) {
    if (!b.name || String(b.name).trim() === '') return 'Name is required.';
  }
  if (!partial || b.color !== undefined) {
    if (!HEX.test(String(b.color ?? ''))) return 'Color must be a hex value like #4C90F0.';
  }
  if (!partial || b.sort !== undefined) {
    if (!Number.isInteger(b.sort)) return 'Sort must be an integer.';
  }
  return null;
};

app.post('/api/categories', requireAdmin, async (req, res, next) => {
  try {
    const b = req.body ?? {};
    if (!KEBAB.test(b.id ?? '')) {
      return res.status(400).json({ error: 'id must be kebab-case (lowercase letters, digits, hyphens).' });
    }
    const invalid = validateCategory(b);
    if (invalid) return res.status(400).json({ error: invalid });

    const result = await query(
      'INSERT INTO category (id, name, color, sort) VALUES ($1, $2, $3, $4) RETURNING id, name, color, sort',
      [b.id, b.name, b.color, b.sort]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A category with that id already exists.' });
    }
    next(err);
  }
});

app.put('/api/categories/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const b = req.body ?? {};
    const invalid = validateCategory(b, { partial: true });
    if (invalid) return res.status(400).json({ error: invalid });

    const fields = ['name', 'color', 'sort'].filter((k) => k in b);
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No editable fields provided.' });
    }
    const set = fields.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const result = await query(
      `UPDATE category SET ${set} WHERE id = $1 RETURNING id, name, color, sort`,
      [id, ...fields.map((k) => b[k])]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: `Category not found: ${id}` });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/categories/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const inUse = await query('SELECT count(*)::int AS n FROM application WHERE category_id = $1', [id]);
    if (inUse.rows[0].n > 0) {
      return res.status(409).json({
        error: `Cannot delete: ${inUse.rows[0].n} application(s) still use this category. Reassign them first.`,
      });
    }
    const del = await query('DELETE FROM category WHERE id = $1', [id]);
    if (del.rowCount === 0) {
      return res.status(404).json({ error: `Category not found: ${id}` });
    }
    res.json({ id });
  } catch (err) {
    next(err);
  }
});

// ---- links (admin only) ----------------------------------------------------

const RELATIONSHIPS = new Set([
  'feeds', 'powers', 'builds-on', 'embeds-in', 'monitors',
  'supersedes', 'complements', 'packages', 'governs', 'assists',
]);

const validateLink = (b) => {
  if (!b.source_id || !b.target_id) return 'source_id and target_id are required.';
  if (b.source_id === b.target_id) return 'A link cannot connect an application to itself.';
  if (!RELATIONSHIPS.has(b.relationship)) return `Invalid relationship: ${b.relationship}`;
  return null;
};

app.post('/api/links', requireAdmin, async (req, res, next) => {
  try {
    const b = req.body ?? {};
    const invalid = validateLink(b);
    if (invalid) return res.status(400).json({ error: invalid });
    const result = await query(
      `INSERT INTO application_link (source_id, target_id, relationship, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, source_id, target_id, relationship, description`,
      [b.source_id, b.target_id, b.relationship, b.description ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'That exact link already exists.' });
    }
    if (err.code === '23503') {
      return res.status(400).json({ error: 'source_id or target_id does not exist.' });
    }
    next(err);
  }
});

app.put('/api/links/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid link id.' });
    const b = req.body ?? {};
    const invalid = validateLink(b);
    if (invalid) return res.status(400).json({ error: invalid });
    const result = await query(
      `UPDATE application_link
         SET source_id = $2, target_id = $3, relationship = $4, description = $5
       WHERE id = $1
       RETURNING id, source_id, target_id, relationship, description`,
      [id, b.source_id, b.target_id, b.relationship, b.description ?? null]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: `Link not found: ${id}` });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'That exact link already exists.' });
    }
    if (err.code === '23503') {
      return res.status(400).json({ error: 'source_id or target_id does not exist.' });
    }
    next(err);
  }
});

app.delete('/api/links/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid link id.' });
    const del = await query('DELETE FROM application_link WHERE id = $1', [id]);
    if (del.rowCount === 0) {
      return res.status(404).json({ error: `Link not found: ${id}` });
    }
    res.json({ id });
  } catch (err) {
    next(err);
  }
});

// ---- learning resources (admin only) --------------------------------------

// Created idempotently on startup so existing deployments pick up the feature
// without a destructive reseed. Canonical definition lives in schema.sql.
const ensureResourceTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS app_resource (
      id      SERIAL PRIMARY KEY,
      app_id  TEXT NOT NULL REFERENCES application(id) ON DELETE CASCADE,
      kind    TEXT NOT NULL CHECK (kind IN ('tutorial', 'video')),
      title   TEXT NOT NULL,
      url     TEXT NOT NULL,
      sort    INTEGER NOT NULL DEFAULT 0
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_resource_app ON app_resource(app_id)');
};

const RESOURCE_KINDS = new Set(['tutorial', 'video']);
const RESOURCE_COLUMNS = 'id, app_id, kind, title, url, sort';
const isHttpUrl = (s) => typeof s === 'string' && /^https?:\/\/\S+$/i.test(s.trim());

const validateResource = (b) => {
  if (!b.app_id || String(b.app_id).trim() === '') return 'app_id is required.';
  if (!RESOURCE_KINDS.has(b.kind)) return `Invalid kind: ${b.kind}`;
  if (!b.title || String(b.title).trim() === '') return 'Title is required.';
  if (!isHttpUrl(b.url)) return 'URL must start with http:// or https://';
  if (b.sort !== undefined && b.sort !== null && !Number.isInteger(b.sort)) {
    return 'Sort must be an integer.';
  }
  return null;
};

app.post('/api/resources', requireAdmin, async (req, res, next) => {
  try {
    const b = req.body ?? {};
    const invalid = validateResource(b);
    if (invalid) return res.status(400).json({ error: invalid });
    const result = await query(
      `INSERT INTO app_resource (app_id, kind, title, url, sort)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${RESOURCE_COLUMNS}`,
      [b.app_id, b.kind, b.title.trim(), b.url.trim(), b.sort ?? 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'app_id does not exist.' });
    next(err);
  }
});

app.put('/api/resources/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid resource id.' });
    const b = req.body ?? {};
    const invalid = validateResource(b);
    if (invalid) return res.status(400).json({ error: invalid });
    const result = await query(
      `UPDATE app_resource SET app_id = $2, kind = $3, title = $4, url = $5, sort = $6
       WHERE id = $1
       RETURNING ${RESOURCE_COLUMNS}`,
      [id, b.app_id, b.kind, b.title.trim(), b.url.trim(), b.sort ?? 0]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: `Resource not found: ${id}` });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'app_id does not exist.' });
    next(err);
  }
});

app.delete('/api/resources/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid resource id.' });
    const del = await query('DELETE FROM app_resource WHERE id = $1', [id]);
    if (del.rowCount === 0) return res.status(404).json({ error: `Resource not found: ${id}` });
    res.json({ id });
  } catch (err) {
    next(err);
  }
});

// ---- self-learning projects (admin only) -----------------------------------

// Created idempotently on startup so existing deployments pick up the feature
// without a destructive reseed. Canonical definition lives in schema.sql.
const ensureProjectTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS app_project (
      id           SERIAL PRIMARY KEY,
      app_id       TEXT NOT NULL REFERENCES application(id) ON DELETE CASCADE,
      kind         TEXT NOT NULL,
      title        TEXT NOT NULL,
      context      TEXT NOT NULL,
      instructions TEXT NOT NULL,
      dataset_url  TEXT,
      sort         INTEGER NOT NULL DEFAULT 0
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_project_app ON app_project(app_id)');
};

const PROJECT_COLUMNS = 'id, app_id, kind, title, context, instructions, dataset_url, sort';

const validateProject = (b) => {
  if (!b.app_id || String(b.app_id).trim() === '') return 'app_id is required.';
  if (!b.kind || String(b.kind).trim() === '') return 'Kind is required.';
  if (!b.title || String(b.title).trim() === '') return 'Title is required.';
  if (!b.context || String(b.context).trim() === '') return 'Context is required.';
  if (!b.instructions || String(b.instructions).trim() === '') return 'Instructions are required.';
  if (b.dataset_url && !isHttpUrl(b.dataset_url)) {
    return 'Dataset URL must start with http:// or https://';
  }
  if (b.sort !== undefined && b.sort !== null && !Number.isInteger(b.sort)) {
    return 'Sort must be an integer.';
  }
  return null;
};

const projectValues = (b) => [
  b.app_id,
  b.kind.trim(),
  b.title.trim(),
  b.context.trim(),
  b.instructions.trim(),
  b.dataset_url ? b.dataset_url.trim() : null,
  b.sort ?? 0,
];

app.post('/api/projects', requireAdmin, async (req, res, next) => {
  try {
    const b = req.body ?? {};
    const invalid = validateProject(b);
    if (invalid) return res.status(400).json({ error: invalid });
    const result = await query(
      `INSERT INTO app_project (app_id, kind, title, context, instructions, dataset_url, sort)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${PROJECT_COLUMNS}`,
      projectValues(b)
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'app_id does not exist.' });
    next(err);
  }
});

app.put('/api/projects/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid project id.' });
    const b = req.body ?? {};
    const invalid = validateProject(b);
    if (invalid) return res.status(400).json({ error: invalid });
    const result = await query(
      `UPDATE app_project
         SET app_id = $2, kind = $3, title = $4, context = $5, instructions = $6,
             dataset_url = $7, sort = $8
       WHERE id = $1
       RETURNING ${PROJECT_COLUMNS}`,
      [id, ...projectValues(b)]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: `Project not found: ${id}` });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'app_id does not exist.' });
    next(err);
  }
});

app.delete('/api/projects/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid project id.' });
    const del = await query('DELETE FROM app_project WHERE id = $1', [id]);
    if (del.rowCount === 0) return res.status(404).json({ error: `Project not found: ${id}` });
    res.json({ id });
  } catch (err) {
    next(err);
  }
});

// ---- suggestions (public create, admin moderation) -------------------------
//
// The community is read-only, but they know Foundry. They can submit a proposed
// new link or a field correction here without a token; an admin then approves
// (which APPLIES the change) or rejects in the Admin tab.

const SUGGESTION_COLUMNS = `id, kind, status, app_id, field, value, url,
  link_id, source_id, target_id, relationship, link_description, comment, submitter,
  created_at, resolved_at`;

// Created idempotently on startup so existing deployments pick up the feature
// without a destructive reseed. Canonical definition lives in schema.sql.
const ensureSuggestionTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS suggestion (
      id           SERIAL PRIMARY KEY,
      kind         TEXT NOT NULL
                     CHECK (kind IN ('new_link', 'correction', 'edit_link', 'feature', 'resource')),
      status       TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected')),
      app_id       TEXT REFERENCES application(id) ON DELETE CASCADE,
      field        TEXT,
      value        TEXT,
      url          TEXT,
      link_id          INTEGER REFERENCES application_link(id) ON DELETE CASCADE,
      source_id        TEXT REFERENCES application(id) ON DELETE CASCADE,
      target_id        TEXT REFERENCES application(id) ON DELETE CASCADE,
      relationship     TEXT,
      link_description TEXT,
      comment      TEXT,
      submitter    TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      resolved_at  TIMESTAMPTZ
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_suggestion_status ON suggestion(status, created_at)');
  // Migrate tables created before edit_link existed: add the column and widen the
  // kind check. Safe to run every startup.
  await query(
    'ALTER TABLE suggestion ADD COLUMN IF NOT EXISTS link_id INTEGER REFERENCES application_link(id) ON DELETE CASCADE'
  );
  await query('ALTER TABLE suggestion ADD COLUMN IF NOT EXISTS url TEXT');
  await query('ALTER TABLE suggestion DROP CONSTRAINT IF EXISTS suggestion_kind_check');
  await query(
    "ALTER TABLE suggestion ADD CONSTRAINT suggestion_kind_check CHECK (kind IN ('new_link', 'correction', 'edit_link', 'feature', 'resource'))"
  );
};

// Fields a correction may target — the same set an admin can edit directly.
const CORRECTABLE = new Set(EDITABLE);
const NULLABLE_FIELDS = new Set(['learning_order', 'era', 'docs_url', 'tips']);
const MAX = { value: 4000, comment: 1000, submitter: 120, description: 600, feature: 2000 };

const trimOrNull = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

// Validate & coerce a correction's proposed value for one application column.
// Returns { value } (the value to store/apply) or { error }.
const coerceCorrection = (field, raw) => {
  if (field === 'tier') {
    if (!TIERS.has(raw)) return { error: `Invalid tier: ${raw}` };
    return { value: raw };
  }
  if (field === 'status') {
    if (!STATUSES.has(raw)) return { error: `Invalid status: ${raw}` };
    return { value: raw };
  }
  if (BOOLEAN_FIELDS.has(field)) {
    if (raw === true || raw === 'true') return { value: true };
    if (raw === false || raw === 'false') return { value: false };
    return { error: `${field} must be true or false.` };
  }
  if (field === 'learning_order') {
    const s = trimOrNull(raw);
    if (s === null) return { value: null };
    const n = Number(s);
    if (!Number.isInteger(n) || n < 0) return { error: 'learning_order must be a non-negative integer.' };
    return { value: n };
  }
  // Text columns.
  const s = trimOrNull(raw);
  if (s === null && !NULLABLE_FIELDS.has(field)) {
    return { error: `${field} cannot be empty.` };
  }
  if (s !== null && s.length > MAX.value) {
    return { error: `${field} is too long (max ${MAX.value} characters).` };
  }
  return { value: s };
};

// Confirm the referenced application id(s) exist; returns a list of missing ids.
const missingApps = async (ids) => {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  const found = await query('SELECT id FROM application WHERE id = ANY($1)', [unique]);
  const have = new Set(found.rows.map((r) => r.id));
  return unique.filter((id) => !have.has(id));
};

// Public: submit a suggestion. No token required.
app.post('/api/suggestions', async (req, res, next) => {
  try {
    const b = req.body ?? {};
    const kind = b.kind;
    if (!['new_link', 'correction', 'edit_link', 'feature', 'resource'].includes(kind)) {
      return res.status(400).json({ error: 'Invalid suggestion kind.' });
    }

    const comment = trimOrNull(b.comment);
    const submitter = trimOrNull(b.submitter);
    // For a feature idea the comment IS the content, so allow more room.
    const commentMax = kind === 'feature' ? MAX.feature : MAX.comment;
    if (comment && comment.length > commentMax) {
      return res.status(400).json({ error: `Text is too long (max ${commentMax}).` });
    }
    if (submitter && submitter.length > MAX.submitter) {
      return res.status(400).json({ error: `Name is too long (max ${MAX.submitter}).` });
    }

    let row;
    if (kind === 'correction') {
      const appId = trimOrNull(b.app_id);
      const field = trimOrNull(b.field);
      if (!appId) return res.status(400).json({ error: 'app_id is required for a correction.' });
      if (!field || !CORRECTABLE.has(field)) {
        return res.status(400).json({ error: `field must be one of: ${[...CORRECTABLE].join(', ')}` });
      }
      const coerced = coerceCorrection(field, b.value);
      if (coerced.error) return res.status(400).json({ error: coerced.error });

      const missing = await missingApps([appId]);
      if (missing.length) return res.status(400).json({ error: `Unknown application: ${missing[0]}` });

      const result = await query(
        `INSERT INTO suggestion (kind, app_id, field, value, comment, submitter)
         VALUES ('correction', $1, $2, $3, $4, $5)
         RETURNING ${SUGGESTION_COLUMNS}`,
        [appId, field, coerced.value === null ? null : String(coerced.value), comment, submitter]
      );
      row = result.rows[0];
    } else if (kind === 'edit_link') {
      const linkId = Number(b.link_id);
      if (!Number.isInteger(linkId)) return res.status(400).json({ error: 'link_id is required for an edit.' });
      const relationship = trimOrNull(b.relationship);
      const linkDesc = trimOrNull(b.link_description);
      if (!RELATIONSHIPS.has(relationship)) {
        return res.status(400).json({ error: `Invalid relationship: ${relationship}` });
      }
      if (linkDesc && linkDesc.length > MAX.description) {
        return res.status(400).json({ error: `Link description is too long (max ${MAX.description}).` });
      }
      const existing = await query('SELECT id FROM application_link WHERE id = $1', [linkId]);
      if (existing.rowCount === 0) return res.status(400).json({ error: `Unknown link: ${linkId}` });

      const result = await query(
        `INSERT INTO suggestion (kind, link_id, relationship, link_description, comment, submitter)
         VALUES ('edit_link', $1, $2, $3, $4, $5)
         RETURNING ${SUGGESTION_COLUMNS}`,
        [linkId, relationship, linkDesc, comment, submitter]
      );
      row = result.rows[0];
    } else if (kind === 'feature') {
      if (!comment) return res.status(400).json({ error: 'Describe the feature you have in mind.' });
      const result = await query(
        `INSERT INTO suggestion (kind, comment, submitter)
         VALUES ('feature', $1, $2)
         RETURNING ${SUGGESTION_COLUMNS}`,
        [comment, submitter]
      );
      row = result.rows[0];
    } else if (kind === 'resource') {
      const appId = trimOrNull(b.app_id);
      const resKind = trimOrNull(b.resource_kind);
      const title = trimOrNull(b.title);
      const resUrl = trimOrNull(b.url);
      if (!appId) return res.status(400).json({ error: 'app_id is required for a resource.' });
      if (!RESOURCE_KINDS.has(resKind)) {
        return res.status(400).json({ error: "resource_kind must be 'tutorial' or 'video'." });
      }
      if (!title) return res.status(400).json({ error: 'Title is required.' });
      if (title.length > 200) return res.status(400).json({ error: 'Title is too long (max 200).' });
      if (!isHttpUrl(resUrl)) {
        return res.status(400).json({ error: 'URL must start with http:// or https://' });
      }
      const missing = await missingApps([appId]);
      if (missing.length) return res.status(400).json({ error: `Unknown application: ${missing[0]}` });

      const result = await query(
        `INSERT INTO suggestion (kind, app_id, field, value, url, comment, submitter)
         VALUES ('resource', $1, $2, $3, $4, $5, $6)
         RETURNING ${SUGGESTION_COLUMNS}`,
        [appId, resKind, title, resUrl, comment, submitter]
      );
      row = result.rows[0];
    } else {
      const sourceId = trimOrNull(b.source_id);
      const targetId = trimOrNull(b.target_id);
      const relationship = trimOrNull(b.relationship);
      const linkDesc = trimOrNull(b.link_description);
      const invalid = validateLink({ source_id: sourceId, target_id: targetId, relationship });
      if (invalid) return res.status(400).json({ error: invalid });
      if (linkDesc && linkDesc.length > MAX.description) {
        return res.status(400).json({ error: `Link description is too long (max ${MAX.description}).` });
      }

      const missing = await missingApps([sourceId, targetId]);
      if (missing.length) return res.status(400).json({ error: `Unknown application: ${missing.join(', ')}` });

      const result = await query(
        `INSERT INTO suggestion (kind, source_id, target_id, relationship, link_description, comment, submitter)
         VALUES ('new_link', $1, $2, $3, $4, $5, $6)
         RETURNING ${SUGGESTION_COLUMNS}`,
        [sourceId, targetId, relationship, linkDesc, comment, submitter]
      );
      row = result.rows[0];
    }

    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

// Admin: list suggestions (default: the pending moderation queue, oldest first).
app.get('/api/suggestions', requireAdmin, async (req, res, next) => {
  try {
    const status = req.query.status ?? 'pending';
    if (!['pending', 'approved', 'rejected', 'all'].includes(status)) {
      return res.status(400).json({ error: `Invalid status filter: ${status}` });
    }
    const result =
      status === 'all'
        ? await query(`SELECT ${SUGGESTION_COLUMNS} FROM suggestion ORDER BY created_at DESC`)
        : await query(
            `SELECT ${SUGGESTION_COLUMNS} FROM suggestion WHERE status = $1 ORDER BY created_at ASC`,
            [status]
          );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Admin: approve a pending suggestion — APPLIES the change, then marks it resolved.
app.post('/api/suggestions/:id/approve', requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid suggestion id.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(
      `SELECT ${SUGGESTION_COLUMNS} FROM suggestion WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (found.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `Suggestion not found: ${id}` });
    }
    const s = found.rows[0];
    if (s.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Suggestion already ${s.status}.` });
    }

    if (s.kind === 'correction') {
      if (!s.app_id) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'The target application no longer exists.' });
      }
      if (!CORRECTABLE.has(s.field)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Field is no longer editable: ${s.field}` });
      }
      const coerced = coerceCorrection(s.field, s.value);
      if (coerced.error) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: coerced.error });
      }
      const upd = await client.query(
        `UPDATE application SET ${s.field} = $2, updated_at = now() WHERE id = $1`,
        [s.app_id, coerced.value]
      );
      if (upd.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'The target application no longer exists.' });
      }
    } else if (s.kind === 'edit_link') {
      if (!s.link_id) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'The link no longer exists.' });
      }
      try {
        const upd = await client.query(
          `UPDATE application_link SET relationship = $2, description = $3 WHERE id = $1`,
          [s.link_id, s.relationship, s.link_description]
        );
        if (upd.rowCount === 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'The link no longer exists.' });
        }
      } catch (e) {
        await client.query('ROLLBACK');
        if (e.code === '23505') return res.status(409).json({ error: 'That exact link already exists.' });
        if (e.code === '23514') return res.status(400).json({ error: 'Invalid relationship.' });
        throw e;
      }
    } else if (s.kind === 'resource') {
      if (!s.app_id) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'The target application no longer exists.' });
      }
      if (!RESOURCE_KINDS.has(s.field)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Invalid resource kind: ${s.field}` });
      }
      try {
        await client.query(
          `INSERT INTO app_resource (app_id, kind, title, url, sort) VALUES ($1, $2, $3, $4, 0)`,
          [s.app_id, s.field, s.value, s.url]
        );
      } catch (e) {
        await client.query('ROLLBACK');
        if (e.code === '23503') return res.status(409).json({ error: 'The target application no longer exists.' });
        throw e;
      }
    } else if (s.kind === 'new_link') {
      if (!s.source_id || !s.target_id) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'A linked application no longer exists.' });
      }
      try {
        await client.query(
          `INSERT INTO application_link (source_id, target_id, relationship, description)
           VALUES ($1, $2, $3, $4)`,
          [s.source_id, s.target_id, s.relationship, s.link_description]
        );
      } catch (e) {
        await client.query('ROLLBACK');
        if (e.code === '23505') return res.status(409).json({ error: 'That exact link already exists.' });
        if (e.code === '23503') return res.status(409).json({ error: 'source or target application no longer exists.' });
        if (e.code === '23514') return res.status(400).json({ error: 'Invalid relationship.' });
        throw e;
      }
    }
    // 'feature' suggestions carry no data change — approving just acknowledges them.

    const resolved = await client.query(
      `UPDATE suggestion SET status = 'approved', resolved_at = now() WHERE id = $1
       RETURNING ${SUGGESTION_COLUMNS}`,
      [id]
    );
    await client.query('COMMIT');
    res.json({ ok: true, suggestion: resolved.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// Admin: reject a pending suggestion (marks it resolved; applies nothing).
app.post('/api/suggestions/:id/reject', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid suggestion id.' });
    const result = await query(
      `UPDATE suggestion SET status = 'rejected', resolved_at = now()
       WHERE id = $1 AND status = 'pending'
       RETURNING ${SUGGESTION_COLUMNS}`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(409).json({ error: 'Suggestion not found or already resolved.' });
    }
    res.json({ ok: true, suggestion: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---- static frontend (production) ------------------------------------------

const dist = join(here, '..', 'frontend', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')));
}

// ---- error handler ---------------------------------------------------------

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

Promise.all([
  ensureApplicationColumns(),
  ensureSuggestionTable(),
  ensureResourceTable(),
  ensureProjectTable(),
])
  .then(() => app.listen(PORT, () => console.log(`Foundry Atlas API listening on :${PORT}`)))
  .catch((err) => {
    console.error('Failed to ensure feature tables exist:', err);
    process.exit(1);
  });
