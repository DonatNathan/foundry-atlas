# Contributing to Foundry Atlas

Thanks for your interest in improving Foundry Atlas! Contributions of all kinds are
welcome — fixing the application catalog, improving the UI, or adding features.

## Ways to contribute

- **Correct or expand the data.** The map is hand-curated and Foundry moves fast. If an
  application, relationship, or description is wrong or missing, that's the most valuable
  contribution. Open an issue, or edit the seed and open a PR (see below).
- **Improve the app** — bug fixes, accessibility, performance, new features.
- **Report bugs / suggest features** via the issue templates.

## Local setup

You need **Node ≥ 22** and a **PostgreSQL** database. Full details are in the
[README](README.md), in short:

```bash
# 1. Database
createdb foundry_atlas
cd server && cp .env.example .env      # set DATABASE_URL + ADMIN_TOKEN
npm install && npm run seed

# 2. Frontend
cd ../frontend && npm install

# 3. Run both (from the repo root)
cd .. && npm run dev                    # API :4000 + web http://localhost:5173
```

> Tip: run the app with **`npm run dev` only** — it starts the API and web together.
> Don't also start a standalone `npm run server`; two processes fighting over port 4000
> is a classic source of "my changes aren't loading" confusion.

## Editing the data

The catalog lives in the database. The bundled snapshot
`frontend/src/data/graph.json` is what the app ships with and what `npm run seed` loads.
For data changes, the easiest path is to use the in-app **Admin** tab (unlock with your
local `ADMIN_TOKEN`) to add/edit applications, categories, and links, then export the
result. For larger structural changes, edit the data and open a PR describing the change.

## Before you open a PR

- `cd frontend && npm run lint && npm run build` — must pass (CI runs these).
- Keep changes focused; match the surrounding code style (TypeScript, Blueprint, the
  existing component patterns).
- Describe **what** changed and **why** in the PR. Screenshots help for UI changes.
- For data changes, cite a source (Palantir docs link) where possible.

## Code overview

- `frontend/` — Vite + React 19 + TypeScript (Blueprint UI, react-force-graph).
- `server/` — Express API (public reads, admin-token-gated writes) over PostgreSQL.

By contributing, you agree your contributions are licensed under the same terms as this
project (see [LICENSE](LICENSE)).
