# Foundry Atlas — an interactive map of Palantir Foundry

An Obsidian-style, force-directed map of the Palantir Foundry platform: every major
application as a node, every meaningful relationship between them as a typed link.
Built for both beginners ("where do I start?") and experienced engineers ("how does
X relate to Y?").

![Tech](https://img.shields.io/badge/stack-React%20%2B%20TypeScript%20%2B%20SQLite-blue)

## What's inside

```
database/            Source of truth
├── schema.sql       Tables: category, application, application_link
├── seed.sql         35 curated Foundry applications + 62 typed links
├── build.mjs        Builds foundry.db and exports the graph JSON (Node ≥ 22, no deps)
└── foundry.db       Generated SQLite database

frontend/            Vite + React 19 + TypeScript
└── src/
    ├── data/graph.json          Generated from the database — do not edit by hand
    ├── components/GraphView.tsx Force-directed canvas (react-force-graph-2d)
    ├── components/Sidebar.tsx   Search, filters, legend, learning path
    └── components/DetailPanel.tsx  Per-application deep dive
```

## Quick start

```bash
# 1. Build the database and export the graph (Node 22+, uses built-in node:sqlite)
cd database && node build.mjs

# 2. Run the frontend
cd ../frontend
npm install
npm run dev          # → http://localhost:5173
```

## The data model

Each **application** row records:

| Column | Meaning |
| --- | --- |
| `description` / `use_case` | What it is, and what you concretely use it for |
| `tier` | `beginner` / `intermediate` / `advanced` |
| `is_core` + `learning_order` | The recommended 12-step learning path for newcomers |
| `status` | `stable` (established), `new` (AIP era, 2023+), `legacy` (superseded) |
| `era` | Free-text generation note, e.g. "Legacy — superseded by Workshop" |
| `docs_url` | Link into Palantir's official documentation |
| `tips` | Practical advice for learners |

**Links** are directed and typed — `feeds`, `powers`, `embeds-in`, `monitors`,
`supersedes`, `complements`, `packages`, `governs`, `assists`, `builds-on` — so the
map can say things like *"Pipeline Builder feeds the Ontology"* or *"Workshop
supersedes Slate"*.

To add or correct an application, edit `database/seed.sql` and re-run
`node build.mjs` — the frontend picks the new JSON up automatically.

## Features

- **Obsidian-style graph** — hover a node to light up its neighborhood, drag to
  rearrange, scroll to zoom; node size reflects how connected an app is (the
  Ontology Manager is visibly the center of gravity of the platform).
- **Detail panel** — click any node for its description, use case, learning tip,
  docs link, and a clickable list of every connection with a human-readable verb.
- **🎓 Learning path mode** — highlights the recommended 12-step beginner journey
  (Projects & Files → Dataset Preview → Pipeline Builder → … → Data Lineage) with
  numbered badges on the map.
- **Filters** — by category, experience level, and generation (established / newer
  AIP-era / legacy). Legacy apps render with dashed rings; AIP-era apps get a bright
  outer ring.
- **Search** — by name, description, or use case, with fly-to on selection.
- **Link tooltips** — hover an edge to see exactly how two apps relate.
- **Palantir look & feel** — built with [Blueprint](https://blueprintjs.com/)
  (Palantir's own open-source design system), dark theme, Blueprint color palette.

## Notes

- The application catalog reflects Foundry as of early 2026 and is hand-curated;
  Palantir evolves quickly, so treat `status`/`era` as guidance, not gospel.
- Docs links point at `palantir.com/docs/foundry/...` sections, which Palantir
  occasionally reorganizes.
