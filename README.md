# Foundry Atlas — Interactive map of Palantir Foundry

An Obsidian-style, force-directed map of the Palantir Foundry platform: every major
application as a node, every meaningful relationship between them as a typed link.
Built for both beginners ("where do I start?") and experienced engineers ("how does
X relate to Y?").

![Tech](https://img.shields.io/badge/stack-React%20%2B%20TypeScript%20%2B%20PostgreSQL-blue)

The snapshot ships with **7 categories, 64 applications, and 100 typed links**.

## What's inside

```
server/              Express API — public reads, admin-token-gated writes (PostgreSQL)
├── schema.sql       Tables: category, application, application_link
├── seed.mjs         Seeds Postgres from frontend/src/data/graph.json
├── db.mjs           pg connection pool (DATABASE_URL or discrete PG* vars)
├── index.mjs        Routes: GET /api/graph (public); CRUD for applications,
│                    categories, and links (admin-only); serves frontend/dist if present
├── Dockerfile       Container image for the API (build from the repo root)
└── .env.example     DB connection, ADMIN_TOKEN, CORS_ORIGIN, PORT

frontend/            Vite + React 19 + TypeScript (Blueprint UI)
└── src/
    ├── data/graph.json          Bundled snapshot — instant render + the seed source
    ├── api.ts                   Talks to the backend
    ├── DataContext.tsx          Loads + shares graph data across the app
    ├── types.ts / data.ts       Shared types and view helpers
    ├── components/GraphView.tsx Force-directed canvas (react-force-graph-2d)
    ├── components/TableView.tsx Sortable/filterable read-only table
    ├── components/Sidebar.tsx   Search, filters, legend, learning path
    ├── components/DetailPanel.tsx   Per-application deep dive
    ├── components/AdminView.tsx     Admin-only CRUD tab (apps, categories, links)
    ├── components/EditAppDialog.tsx Create/edit application overlay
    ├── components/CategoryDialog.tsx Create/edit category overlay
    ├── components/LinkDialog.tsx     Create/edit link overlay
    └── components/AdminControls.tsx  Token unlock/lock

scripts/dev.mjs      Runs the API + Vite dev server together (npm run dev)
```

## Data, access & editing

- **The community gets read-only access.** Anyone can load the map and browse the
  data; the read API (`GET /api/graph`) is public.
- **Editing is gated to the admin** via a shared secret (`ADMIN_TOKEN`). The backend
  requires it for every write and compares it in constant time. In the UI, click
  **Admin** (top bar), paste the token, and an extra **Admin** tab appears with full
  CRUD over **applications, categories, and links**. Without the token the tab isn't
  rendered and the write endpoints reject the request.
- **PostgreSQL is the source of truth.** Edits persist to the database and survive
  reloads. The bundled `graph.json` is a build-time snapshot used for instant first
  render and as the one-time seed; the app refreshes from the API on load.

### API surface

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/api/graph` | public |
| `GET` | `/api/admin/check` | admin |
| `POST` / `PUT` / `DELETE` | `/api/applications[/:id]` | admin |
| `POST` / `PUT` / `DELETE` | `/api/categories[/:id]` | admin |
| `POST` / `PUT` / `DELETE` | `/api/links[/:id]` | admin |

## Quick start (local)

You need **Node ≥ 22** and a **PostgreSQL** database you can create tables in.

```bash
# 1. Create a database
createdb foundry_atlas

# 2. Configure the server
cd server
cp .env.example .env
#   edit .env — set EITHER DATABASE_URL or the discrete PGHOST/PGPORT/PGUSER/
#   PGPASSWORD/PGDATABASE vars, plus:
#     ADMIN_TOKEN=$(openssl rand -hex 32)   # your editing secret
npm install
npm run seed          # loads schema + the 64-app snapshot into Postgres

# 3. Install the frontend
cd ../frontend && npm install

# 4. Run both together (from the repo root)
cd .. && npm run dev  # API on :4000, web on http://localhost:5173 (proxies /api)
```

`npm run dev` launches the API and the Vite dev server together (see `scripts/dev.mjs`).
You can also run them separately with `npm run dev:server` and `npm run dev:web`.

## Deploying

The API runs as a container; PostgreSQL is provided by your environment (a managed
instance, or a shared `postgres` service in your stack). The frontend is a static bundle
hosted separately and points at the API over CORS.

**API (container).** The image is built from [server/Dockerfile](server/Dockerfile) with
the **repo root** as the build context (the seed reads `frontend/src/data/graph.json`):

```bash
docker build -f server/Dockerfile -t foundry-atlas-api .
```

Wire it into your Compose stack as a service — point `PGHOST` at your Postgres and fill in
the rest from the repo-root [`.env.example`](.env.example):

```yaml
services:
  foundry-atlas-api:
    build:
      context: .                      # repo root
      dockerfile: server/Dockerfile
    image: foundry-atlas-api
    restart: unless-stopped
    environment:
      PGHOST: postgres                # your Postgres host / service name
      PGPORT: "5432"
      PGUSER: ${PGUSER}
      PGPASSWORD: ${PGPASSWORD}
      PGDATABASE: ${PGDATABASE}
      ADMIN_TOKEN: ${ADMIN_TOKEN}
      CORS_ORIGIN: ${CORS_ORIGIN}     # your frontend's origin, for CORS
      PORT: "4000"
    ports:
      - "4000:4000"
```

Then bring it up and seed once:

```bash
docker compose up -d --build
docker compose run --rm foundry-atlas-api npm run seed   # one-time: schema + 64-app snapshot
```

> ⚠️ `npm run seed` resets the schema (it drops and recreates the tables). Run it **once**
> on first deploy — never on a database that already holds edits you want to keep.

**Frontend (static).** Build with `VITE_API_BASE` set to the API's public origin
(see [frontend/.env.example](frontend/.env.example)) and deploy the `dist/` output to any
static host:

```bash
VITE_API_BASE=https://api.yourdomain.com npm run build   # → frontend/dist
```

Keep `ADMIN_TOKEN` secret (env var only — never commit `.env`); rotate it by changing the
value and restarting the API container.

## The data model

Each **application** row records:

| Column | Meaning |
| --- | --- |
| `category_id` | Functional area (drives node color); references a `category` row |
| `description` / `use_case` | What it is, and what you concretely use it for |
| `tier` | `beginner` / `intermediate` / `advanced` |
| `is_core` + `learning_order` | The recommended learning path for newcomers |
| `status` | `stable` (established), `new` (AIP era, 2023+), `legacy` (superseded) |
| `era` | Free-text generation note, e.g. "Legacy — superseded by Workshop" |
| `docs_url` | Link into Palantir's official documentation |
| `tips` | Practical advice for learners |

**Links** are directed and typed — `feeds`, `powers`, `builds-on`, `embeds-in`,
`monitors`, `supersedes`, `complements`, `packages`, `governs`, `assists` — so the
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
  search across name/description/use case.
- **🎓 Learning path mode** — highlights the recommended beginner journey with
  numbered badges on the map.
- **Admin CRUD** — when unlocked, edit applications, categories, and links in
  center-screen overlays, all persisted to PostgreSQL.
- **Filters & search**, **link tooltips**, and a **Palantir look & feel** built with
  [Blueprint](https://blueprintjs.com/), Palantir's own open-source design system.

## Notes

- The application catalog reflects Foundry as of early 2026 and is hand-curated;
  Palantir evolves quickly, so treat `status`/`era` as guidance, not gospel.
- Docs links point at `palantir.com/docs/foundry/...` sections, which Palantir
  occasionally reorganizes.
- Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Security reports
  go through [SECURITY.md](SECURITY.md).

## Screenshots

<img width="1920" height="931" alt="Screenshot from 2026-06-12 15-42-54" src="https://github.com/user-attachments/assets/d9c0d003-eec9-4b67-833f-360ac9ea54d9" />

