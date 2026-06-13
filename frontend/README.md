# Foundry Atlas — frontend

The web client for [Foundry Atlas](../README.md): Vite + React 19 + TypeScript, with
[Blueprint](https://blueprintjs.com/) UI and an Obsidian-style force-directed graph
(`react-force-graph-2d`).

## Scripts

```bash
npm run dev       # Vite dev server on http://localhost:5173 (proxies /api → :4000)
npm run build     # type-check (tsc -b) + production build → dist/
npm run preview   # serve the built bundle locally
npm run lint      # eslint
```

For the full setup (database, API, seeding) see the [root README](../README.md). Run
`npm run dev` from the **repo root** to start the API and this frontend together.

## Configuration

Build-time config lives in `.env` (see [.env.example](.env.example)). The only variable
is `VITE_API_BASE` — leave it empty for local dev (the Vite proxy forwards `/api` to the
server); in a split deployment, set it to your API origin.
