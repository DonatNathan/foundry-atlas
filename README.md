# Foundry Atlas — an interactive map of Palantir Foundry

An Obsidian-style, force-directed map of the Palantir Foundry platform: every major
application as a node, every meaningful relationship between them as a typed link.
Built for both beginners ("where do I start?") and experienced engineers ("how does
X relate to Y?").

![Tech](https://img.shields.io/badge/stack-React%20%2B%20TypeScript%20%2B%20PostgreSQL-blue)

## What's inside

```
server/              Node API — public reads, admin-token-gated writes (PostgreSQL)
├── schema.sql       Tables: category, application, application_link
├── seed.mjs         Seeds Postgres from frontend/src/data/graph.json
├── db.mjs           pg connection pool (uses DATABASE_URL)
├── index.mjs        Express: GET /api/graph (public), POST/PUT/DELETE /api/applications (admin)
└── .env.example     DATABASE_URL, ADMIN_TOKEN, PORT

frontend/            Vite + React 19 + TypeScript
└── src/
    ├── data/graph.json          Bundled snapshot — instant render + the seed source
    ├── api.ts                   Talks to the backend
    ├── components/GraphView.tsx Force-directed canvas (react-force-graph-2d)
    ├── components/TableView.tsx Sortable/filterable read-only table
    ├── components/AdminView.tsx Admin-only CRUD tab (create/edit/delete)
    ├── components/Sidebar.tsx   Search, filters, legend, learning path
    ├── components/DetailPanel.tsx   Per-application deep dive
    ├── components/EditAppDialog.tsx Create/edit overlay
    └── components/AdminControls.tsx Token unlock/lock

database/            ⚠️ Legacy local SQLite pipeline (superseded by server/).
                     Kept for reference; `npm run db:sqlite` still regenerates
                     graph.json from seed.sql, but Postgres is now the source of truth.
```

## Data, access & editing

- **The community gets read-only access.** Anyone can load the map and browse the
  data; the read API (`GET /api/graph`) is public.
- **Editing is gated to the admin** via a shared secret (`ADMIN_TOKEN`). The backend
  requires it for every write — `POST`/`PUT`/`DELETE /api/applications[/:id]` — compared
  in constant time. In the UI, click **Admin** (top bar), paste the token, and an
  extra **Admin** tab appears with a full CRUD table (create, edit, delete). Without
  the token the tab isn't rendered and the write endpoints reject the request.
- **PostgreSQL is the source of truth.** Edits persist to the database and survive
  reloads. The bundled `graph.json` is a build-time snapshot used for instant first
  render and as the one-time seed; the app refreshes from the API on load.

## Quick start (local)

You need **Node ≥ 22** and a **PostgreSQL** database you can create tables in.

```bash
# 1. Create a database
createdb foundry_atlas

# 2. Configure the server
cd server
cp .env.example .env
#   edit .env:
#     DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/foundry_atlas
#     ADMIN_TOKEN=$(openssl rand -hex 32)   # your editing secret
npm install
npm run seed          # loads schema + the 64-app snapshot into Postgres

# 3. Install the frontend
cd ../frontend && npm install

# 4. Run both together (from the repo root)
cd .. && npm run dev  # API on :4000, web on http://localhost:5173 (proxies /api)
```

`npm run dev` launches the API and the Vite dev server together. You can also run
them separately with `npm run dev:server` and `npm run dev:web`.

## Deploying (long-running Node server)

```bash
# Build the static frontend
npm run build                 # → frontend/dist

# Start the API; it serves frontend/dist when present (single origin, so /api just works)
DATABASE_URL=...  ADMIN_TOKEN=...  PGSSL=require  npm run server
```

Run `npm run seed` once against the production database. Set `PGSSL=require` if your
managed Postgres needs SSL. Keep `ADMIN_TOKEN` secret (env var only — never commit
`.env`); rotate it by changing the value and restarting.

## The data model

Each **application** row records:

| Column | Meaning |
| --- | --- |
| `description` / `use_case` | What it is, and what you concretely use it for |
| `tier` | `beginner` / `intermediate` / `advanced` |
| `is_core` + `learning_order` | The recommended learning path for newcomers |
| `status` | `stable` (established), `new` (AIP era, 2023+), `legacy` (superseded) |
| `era` | Free-text generation note, e.g. "Legacy — superseded by Workshop" |
| `docs_url` | Link into Palantir's official documentation |
| `tips` | Practical advice for learners |

**Links** are directed and typed — `feeds`, `powers`, `embeds-in`, `monitors`,
`supersedes`, `complements`, `packages`, `governs`, `assists`, `builds-on` — so the
map can say things like *"Pipeline Builder feeds the Ontology"* or *"Workshop
supersedes Slate"*.

## Features

- **Two views** — an Obsidian-style force-directed graph and a sortable, filterable
  table, switchable from the top tabs.
- **Obsidian-style graph** — hover a node to light up its neighborhood, drag to
  rearrange, scroll to zoom; node size reflects how connected an app is.
- **Detail panel** — click any node for its description, use case, learning tip,
  docs link, and a clickable list of every connection with a human-readable verb.
- **Table view** — sort by any column; filter by category, level, and generation;
  search across name/description/use case; admins edit any row in a center overlay.
- **🎓 Learning path mode** — highlights the recommended beginner journey with
  numbered badges on the map.
- **Filters & search**, **link tooltips**, and a **Palantir look & feel** built with
  [Blueprint](https://blueprintjs.com/), Palantir's own open-source design system.

## Notes

- The application catalog reflects Foundry as of early 2026 and is hand-curated;
  Palantir evolves quickly, so treat `status`/`era` as guidance, not gospel.
- Docs links point at `palantir.com/docs/foundry/...` sections, which Palantir
  occasionally reorganizes.
