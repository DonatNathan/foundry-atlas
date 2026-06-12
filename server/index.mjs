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
app.use(cors());
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
  'is_core', 'learning_order', 'status', 'era', 'docs_url', 'tips',
];
const TIERS = new Set(['beginner', 'intermediate', 'advanced']);
const STATUSES = new Set(['stable', 'new', 'legacy']);

const rowToApp = (r) => ({ ...r, is_core: r.is_core === true });

// ---- read endpoints (public) ----------------------------------------------

app.get('/api/graph', async (_req, res, next) => {
  try {
    const [categories, applications, links] = await Promise.all([
      query('SELECT id, name, color, sort FROM category ORDER BY sort'),
      query(
        `SELECT id, name, category_id, description, use_case, tier, is_core,
                learning_order, status, era, docs_url, tips
         FROM application ORDER BY category_id, name`
      ),
      query(
        'SELECT source_id, target_id, relationship, description FROM application_link'
      ),
    ]);
    res.json({
      categories: categories.rows,
      applications: applications.rows.map(rowToApp),
      links: links.rows,
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
                 learning_order, status, era, docs_url, tips`,
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
          learning_order, status, era, docs_url, tips)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, name, category_id, description, use_case, tier, is_core,
                 learning_order, status, era, docs_url, tips`,
      [
        b.id, b.name, b.category_id, b.description, b.use_case, b.tier,
        b.is_core ?? false, b.learning_order ?? null, b.status,
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

app.listen(PORT, () => console.log(`Foundry Atlas API listening on :${PORT}`));
