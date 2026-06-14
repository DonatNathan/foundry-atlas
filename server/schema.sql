-- Palantir Foundry Application Map — PostgreSQL schema.
-- The deployed source of truth. Seeded from frontend/src/data/graph.json by seed.mjs.

DROP TABLE IF EXISTS suggestion;
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

-- Community-submitted corrections / new links, written via a PUBLIC endpoint and
-- moderated in the Admin tab. Approving a row applies the change; rejecting just
-- marks it resolved. This crowdsources accuracy without weakening admin-write.
-- (Kept in sync with ensureSuggestionTable() in index.mjs, which creates this
-- idempotently on startup so existing deployments don't need a destructive reseed.)
CREATE TABLE suggestion (
  id           SERIAL PRIMARY KEY,
  kind         TEXT NOT NULL CHECK (kind IN ('new_link', 'correction')),
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Correction payload (NULL for new_link): propose a new value for one column
  -- of one application.
  app_id       TEXT REFERENCES application(id) ON DELETE CASCADE,
  field        TEXT,
  value        TEXT,

  -- New-link payload (NULL for correction).
  source_id        TEXT REFERENCES application(id) ON DELETE CASCADE,
  target_id        TEXT REFERENCES application(id) ON DELETE CASCADE,
  relationship     TEXT,
  link_description TEXT,

  -- Common metadata.
  comment      TEXT,                 -- submitter's rationale (optional)
  submitter    TEXT,                 -- submitter's name / handle (optional)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

CREATE INDEX idx_suggestion_status ON suggestion(status, created_at);
