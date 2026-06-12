#!/usr/bin/env node
// Creates the schema and seeds Postgres from the bundled graph snapshot
// (frontend/src/data/graph.json). Run once on a fresh database:
//
//   DATABASE_URL=postgres://... node seed.mjs
//
// WARNING: this DROPs and recreates the tables — it resets any admin edits.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(here, 'schema.sql'), 'utf8');
const graph = JSON.parse(
  readFileSync(join(here, '..', 'frontend', 'src', 'data', 'graph.json'), 'utf8')
);

const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query(schema);

  for (const c of graph.categories) {
    await client.query(
      'INSERT INTO category (id, name, color, sort) VALUES ($1, $2, $3, $4)',
      [c.id, c.name, c.color, c.sort]
    );
  }

  for (const a of graph.applications) {
    await client.query(
      `INSERT INTO application
         (id, name, category_id, description, use_case, tier, is_core,
          learning_order, status, era, docs_url, tips)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        a.id, a.name, a.category_id, a.description, a.use_case, a.tier,
        a.is_core, a.learning_order, a.status, a.era, a.docs_url, a.tips,
      ]
    );
  }

  for (const l of graph.links) {
    await client.query(
      `INSERT INTO application_link (source_id, target_id, relationship, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (source_id, target_id, relationship) DO NOTHING`,
      [l.source_id, l.target_id, l.relationship, l.description]
    );
  }

  await client.query('COMMIT');
  console.log(
    `Seeded: ${graph.categories.length} categories, ` +
      `${graph.applications.length} applications, ${graph.links.length} links.`
  );
} catch (err) {
  await client.query('ROLLBACK');
  console.error('Seed failed:', err);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
