-- Palantir Foundry Application Map — database schema
-- Source of truth for the interactive map. Built into foundry.db by build.mjs,
-- which also exports frontend/src/data/graph.json for the React app.

PRAGMA foreign_keys = ON;

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
  description    TEXT NOT NULL,      -- what the application is
  use_case       TEXT NOT NULL,      -- what you use it for, concretely
  tier           TEXT NOT NULL CHECK (tier IN ('beginner', 'intermediate', 'advanced')),
  is_core        INTEGER NOT NULL DEFAULT 0,  -- 1 = part of the recommended starter set
  learning_order INTEGER,            -- position on the recommended learning path (NULL = off-path)
  status         TEXT NOT NULL CHECK (status IN ('stable', 'new', 'legacy')),
  era            TEXT,               -- free-text generation note, e.g. "AIP era (2023+)"
  docs_url       TEXT,               -- official Palantir documentation
  tips           TEXT                -- practical advice for learners
);

-- Directed edge between two applications.
CREATE TABLE application_link (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id    TEXT NOT NULL REFERENCES application(id),
  target_id    TEXT NOT NULL REFERENCES application(id),
  relationship TEXT NOT NULL CHECK (relationship IN (
    'feeds',        -- source produces data consumed by target
    'powers',       -- source provides the foundation target runs on
    'builds-on',    -- source is built on top of / publishes into target
    'embeds-in',    -- source content can be embedded inside target
    'monitors',     -- source observes / checks / evaluates target
    'supersedes',   -- source is the modern replacement for target
    'complements',  -- source and target are commonly used together
    'packages',     -- source bundles and distributes target artifacts
    'governs',      -- source enforces policy / permissions over target
    'assists'       -- source provides AI assistance inside target
  )),
  description  TEXT,
  UNIQUE (source_id, target_id, relationship)
);

CREATE INDEX idx_link_source ON application_link(source_id);
CREATE INDEX idx_link_target ON application_link(target_id);
