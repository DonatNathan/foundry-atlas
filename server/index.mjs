import { timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { query } from './db.mjs';

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
