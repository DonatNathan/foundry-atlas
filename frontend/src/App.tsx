import { useMemo, useState } from 'react';
import GraphView from './components/GraphView';
import DetailPanel from './components/DetailPanel';
import Sidebar from './components/Sidebar';
import { appById, applications, categories, links } from './data';
import type { Filters, Status, Tier } from './types';

const allCategories = () => new Set(categories.map((c) => c.id));
const allTiers = () => new Set<Tier>(['beginner', 'intermediate', 'advanced']);
const allStatuses = () => new Set<Status>(['stable', 'new', 'legacy']);

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    categories: allCategories(),
    tiers: allTiers(),
    statuses: allStatuses(),
    coreOnly: false,
    learningPath: false,
  });

  const visibleApps = useMemo(
    () =>
      applications.filter(
        (a) =>
          filters.categories.has(a.category_id) &&
          filters.tiers.has(a.tier) &&
          filters.statuses.has(a.status) &&
          (!filters.coreOnly || a.is_core)
      ),
    [filters]
  );

  const selectedApp = selectedId ? (appById.get(selectedId) ?? null) : null;

  return (
    <div className="app bp6-dark">
      <GraphView
        apps={visibleApps}
        links={links}
        selectedId={selectedId}
        learningPathMode={filters.learningPath}
        onSelect={setSelectedId}
      />
      <Sidebar
        filters={filters}
        onFiltersChange={setFilters}
        onSelect={setSelectedId}
        visibleCount={visibleApps.length}
      />
      {selectedApp && (
        <DetailPanel
          app={selectedApp}
          onSelect={setSelectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
      <footer className="hint">
        Hover a node to see its neighborhood · click for details · drag to pin, right-click to
        release · scroll to zoom
      </footer>
    </div>
  );
}
