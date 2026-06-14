// Shareable-permalink state: serialize the current view, selected app, and
// filters to/from the URL query string. Keeping this in one place means the
// app and the Cloudflare Pages OG-injection function agree on the param names.
//
// Example: ?view=map&app=ontology-manager&path=true
import type { Filters, Status, Tier } from './types';

export type ShareView = 'map' | 'table';

export interface ShareState {
  view: ShareView;
  selectedId: string | null;
  filters: Filters;
}

const ALL_TIERS: Tier[] = ['beginner', 'intermediate', 'advanced'];
const ALL_STATUSES: Status[] = ['stable', 'new', 'legacy'];

// A comma-separated set param; an absent param means "all" (the default), so we
// only ever encode a filter when it's been narrowed from the full set.
function parseSet<T extends string>(raw: string | null, all: readonly T[]): Set<T> {
  if (raw === null) return new Set(all);
  const allowed = new Set<string>(all);
  return new Set(raw.split(',').filter((v) => allowed.has(v)) as T[]);
}

function appendSet<T extends string>(
  params: URLSearchParams,
  key: string,
  set: Set<T>,
  all: readonly T[],
): void {
  const isAll = set.size === all.length && all.every((v) => set.has(v));
  if (isAll) return; // default — omit to keep links short
  params.set(key, [...set].join(','));
}

/** Read shareable state from a query string (e.g. `window.location.search`). */
export function parseShareState(search: string, allCategoryIds: readonly string[]): ShareState {
  const p = new URLSearchParams(search);
  return {
    view: p.get('view') === 'table' ? 'table' : 'map',
    selectedId: p.get('app') || null,
    filters: {
      categories: parseSet(p.get('cat'), allCategoryIds),
      tiers: parseSet(p.get('tier'), ALL_TIERS),
      statuses: parseSet(p.get('status'), ALL_STATUSES),
      coreOnly: p.get('core') === 'true',
      learningPath: p.get('path') === 'true',
    },
  };
}

// ---------- embed mode ----------
//
// `?embed=map` renders the live graph with the app chrome stripped away;
// `?embed=card` renders a single app's card (requires `app=`). Both link back
// to the full app. The snippet builders below produce the <iframe> users paste.

export type EmbedMode = 'map' | 'card';

/** Read the embed mode from a query string, or null when not embedded. */
export function parseEmbedMode(search: string): EmbedMode | null {
  const v = new URLSearchParams(search).get('embed');
  return v === 'map' || v === 'card' ? v : null;
}

/** Absolute URL for an iframe `src`: the current state plus `embed=<mode>`. */
export function buildEmbedSrc(
  state: ShareState,
  allCategoryIds: readonly string[],
  mode: EmbedMode,
): string {
  const params = new URLSearchParams(buildShareQuery(state, allCategoryIds));
  params.set('embed', mode);
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?${params.toString()}`;
}

/** The full `<iframe>` HTML snippet to paste into Notion, a wiki, a blog, … */
export function buildEmbedSnippet(src: string, width: string, height: string): string {
  return (
    `<iframe src="${src}" width="${width}" height="${height}" ` +
    `style="border:0;border-radius:10px;max-width:100%" ` +
    `title="Foundry Atlas" loading="lazy" allow="fullscreen"></iframe>`
  );
}

/** Build the query string (no leading `?`) that encodes the given state. */
export function buildShareQuery(state: ShareState, allCategoryIds: readonly string[]): string {
  const p = new URLSearchParams();
  p.set('view', state.view);
  if (state.selectedId) p.set('app', state.selectedId);
  if (state.filters.learningPath) p.set('path', 'true');
  if (state.filters.coreOnly) p.set('core', 'true');
  appendSet(p, 'cat', state.filters.categories, allCategoryIds);
  appendSet(p, 'tier', state.filters.tiers, ALL_TIERS);
  appendSet(p, 'status', state.filters.statuses, ALL_STATUSES);
  return p.toString();
}
