import rawGraph from './data/graph.json';
import type {
  Application,
  AppLink,
  AppResource,
  Category,
  Filters,
  GraphPayload,
  Relationship,
  Status,
  Tier,
} from './types';

const graph = rawGraph as GraphPayload;

export const categories: Category[] = graph.categories;
export const applications: Application[] = graph.applications;
export const links: AppLink[] = graph.links;
export const resources: AppResource[] = graph.resources ?? [];

export const appById = new Map<string, Application>(applications.map((a) => [a.id, a]));
export const categoryById = new Map<string, Category>(categories.map((c) => [c.id, c]));

export const colorOf = (app: Application): string =>
  categoryById.get(app.category_id)?.color ?? '#8F99A8';

/** Undirected adjacency: id -> set of neighbor ids. */
export const neighbors = new Map<string, Set<string>>();
for (const app of applications) neighbors.set(app.id, new Set());
for (const l of links) {
  neighbors.get(l.source_id)?.add(l.target_id);
  neighbors.get(l.target_id)?.add(l.source_id);
}

export const degreeOf = (id: string): number => neighbors.get(id)?.size ?? 0;

/** Recommended learning path, ordered. */
export const learningPath: Application[] = applications
  .filter((a) => a.learning_order != null)
  .sort((a, b) => (a.learning_order ?? 0) - (b.learning_order ?? 0));

/** Human-readable verbs for each relationship, from the source's and target's perspective. */
export const RELATIONSHIP_VERBS: Record<Relationship, { out: string; in: string }> = {
  feeds: { out: 'Feeds data to', in: 'Receives data from' },
  powers: { out: 'Powers', in: 'Is powered by' },
  'builds-on': { out: 'Builds on', in: 'Is the foundation of' },
  'embeds-in': { out: 'Embeds into', in: 'Can embed' },
  monitors: { out: 'Monitors', in: 'Is monitored by' },
  supersedes: { out: 'Supersedes', in: 'Is superseded by' },
  complements: { out: 'Complements', in: 'Complements' },
  packages: { out: 'Packages & ships', in: 'Is shipped via' },
  governs: { out: 'Governs', in: 'Is governed by' },
  assists: { out: 'Assists inside', in: 'Gets AI assistance from' },
};

export const TIER_LABELS: Record<Application['tier'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const STATUS_LABELS: Record<Application['status'], string> = {
  stable: 'Established',
  new: 'Newer (AIP era)',
  legacy: 'Legacy',
};

const ALL_TIERS: Tier[] = ['beginner', 'intermediate', 'advanced'];
const ALL_STATUSES: Status[] = ['stable', 'new', 'legacy'];

/** Whether an application is shown under the given filters (the map's predicate). */
export function matchesFilters(app: Application, f: Filters): boolean {
  return (
    f.categories.has(app.category_id) &&
    f.tiers.has(app.tier) &&
    f.statuses.has(app.status) &&
    (!f.coreOnly || app.is_core) &&
    (!f.devOnly || app.available_in_dev)
  );
}

/** Short human-readable chips for the active (narrowed) filters; empty when none. */
export function describeFilters(f: Filters, cats: Category[]): string[] {
  const chips: string[] = [];
  if (f.coreOnly) chips.push('Core only');
  if (f.devOnly) chips.push('Dev tier');
  if (f.categories.size < cats.length) {
    const names = cats.filter((c) => f.categories.has(c.id)).map((c) => c.name);
    chips.push(`Categories: ${names.join(', ')}`);
  }
  if (f.tiers.size < ALL_TIERS.length) {
    const names = ALL_TIERS.filter((t) => f.tiers.has(t)).map((t) => TIER_LABELS[t]);
    chips.push(`Levels: ${names.join(', ')}`);
  }
  if (f.statuses.size < ALL_STATUSES.length) {
    const names = ALL_STATUSES.filter((s) => f.statuses.has(s)).map((s) => STATUS_LABELS[s]);
    chips.push(`Generation: ${names.join(', ')}`);
  }
  return chips;
}
