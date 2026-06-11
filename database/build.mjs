#!/usr/bin/env node
// Builds foundry.db from schema.sql + seed.sql, then exports the graph
// as JSON for the frontend (frontend/src/data/graph.json).
//
// Usage: node build.mjs   (Node >= 22, uses the built-in node:sqlite)

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dbPath = join(here, 'foundry.db');
const outPath = join(here, '..', 'frontend', 'src', 'data', 'graph.json');

rmSync(dbPath, { force: true });
const db = new DatabaseSync(dbPath);

db.exec(readFileSync(join(here, 'schema.sql'), 'utf8'));
db.exec(readFileSync(join(here, 'seed.sql'), 'utf8'));

// --- Sanity checks -----------------------------------------------------------
const orphans = db
  .prepare(
    `SELECT l.source_id, l.target_id FROM application_link l
     LEFT JOIN application s ON s.id = l.source_id
     LEFT JOIN application t ON t.id = l.target_id
     WHERE s.id IS NULL OR t.id IS NULL`
  )
  .all();
if (orphans.length > 0) {
  console.error('Links referencing unknown applications:', orphans);
  process.exit(1);
}

const isolated = db
  .prepare(
    `SELECT a.id FROM application a
     WHERE NOT EXISTS (SELECT 1 FROM application_link l
                       WHERE l.source_id = a.id OR l.target_id = a.id)`
  )
  .all();
if (isolated.length > 0) {
  console.warn('Applications with no links (will float alone in the map):',
    isolated.map((r) => r.id));
}

// --- Export ------------------------------------------------------------------
const categories = db.prepare('SELECT * FROM category ORDER BY sort').all();
const applications = db
  .prepare('SELECT * FROM application ORDER BY category_id, name')
  .all()
  .map((a) => ({ ...a, is_core: a.is_core === 1 }));
const links = db
  .prepare('SELECT source_id, target_id, relationship, description FROM application_link')
  .all();

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({ categories, applications, links }, null, 2));

console.log(`foundry.db built: ${applications.length} applications, ${links.length} links, ${categories.length} categories`);
console.log(`graph exported to ${outPath}`);
