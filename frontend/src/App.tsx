import { useMemo, useState } from 'react';
import { Icon } from '@blueprintjs/core';
import GraphView from './components/GraphView';
import DetailPanel from './components/DetailPanel';
import Sidebar from './components/Sidebar';
import TableView from './components/TableView';
import { appById, applications, categories, links } from './data';
import type { Filters, Status, Tier } from './types';

type View = 'map' | 'table';

const allCategories = () => new Set(categories.map((c) => c.id));
const allTiers = () => new Set<Tier>(['beginner', 'intermediate', 'advanced']);
const allStatuses = () => new Set<Status>(['stable', 'new', 'legacy']);

export default function App() {
  const [view, setView] = useState<View>('map');
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
      <div className="view-tabs">
        <button
          className={view === 'map' ? 'active' : ''}
          onClick={() => setView('map')}
        >
          <Icon icon="graph" size={14} /> Map
        </button>
        <button
          className={view === 'table' ? 'active' : ''}
          onClick={() => setView('table')}
        >
          <Icon icon="th" size={14} /> Table
        </button>
      </div>

      {view === 'map' ? (
        <GraphView
          apps={visibleApps}
          links={links}
          selectedId={selectedId}
          learningPathMode={filters.learningPath}
          onSelect={setSelectedId}
        />
      ) : (
        <TableView apps={applications} selectedId={selectedId} onSelect={setSelectedId} />
      )}

      {view === 'map' && (
        <Sidebar
          filters={filters}
          onFiltersChange={setFilters}
          onSelect={setSelectedId}
          visibleCount={visibleApps.length}
        />
      )}
      {selectedApp && (
        <DetailPanel
          app={selectedApp}
          onSelect={setSelectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
