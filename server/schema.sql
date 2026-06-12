-- Palantir Foundry Application Map — PostgreSQL schema.
-- The deployed source of truth. Seeded from frontend/src/data/graph.json by seed.mjs.

DROP TABLE IF EXISTS application_link;
DROP TABLE IF EXISTS application;
DROP TABLE IF EXISTS category;

-- Functional area an application belongs to. Drives node colors in the map.
CREATE TABLE category (
  id    TEXT PRIMARY KEY,            -- kebab-case slug
  name  TEXT NOT NULL,
  color TEXT NOT NULL,               -- hex color used by the frontend
  sort  INTEGER NOT NULL             -- display order in legend / filters
);

-- One row per Foundry application.
CREATE TABLE application (
  id             TEXT PRIMARY KEY,   -- kebab-case slug, used as node id
  name           TEXT NOT NULL,
  category_id    TEXT NOT NULL REFERENCES category(id),
  description    TEXT NOT NULL,
  use_case       TEXT NOT NULL,
  tier           TEXT NOT NULL CHECK (tier IN ('beginner', 'intermediate', 'advanced')),
  is_core        BOOLEAN NOT NULL DEFAULT FALSE,
  learning_order INTEGER,
  status         TEXT NOT NULL CHECK (status IN ('stable', 'new', 'legacy')),
  era            TEXT,
  docs_url       TEXT,
  tips           TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Directed edge between two applications.
CREATE TABLE application_link (
  id           SERIAL PRIMARY KEY,
  source_id    TEXT NOT NULL REFERENCES application(id),
  target_id    TEXT NOT NULL REFERENCES application(id),
  relationship TEXT NOT NULL CHECK (relationship IN (
    'feeds', 'powers', 'builds-on', 'embeds-in', 'monitors',
    'supersedes', 'complements', 'packages', 'governs', 'assists'
  )),
  description  TEXT,
  UNIQUE (source_id, target_id, relationship)
);

CREATE INDEX idx_link_source ON application_link(source_id);
CREATE INDEX idx_link_target ON application_link(target_id);
