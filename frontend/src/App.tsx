import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@blueprintjs/core';
import GraphView from './components/GraphView';
import DetailPanel from './components/DetailPanel';
import Sidebar from './components/Sidebar';
import TableView from './components/TableView';
import EditAppDialog from './components/EditAppDialog';
import AdminControls from './components/AdminControls';
import { applications, categories, links } from './data';
import { fetchGraph, updateApplication } from './api';
import type { Application, Filters, Status, Tier } from './types';

type View = 'map' | 'table';

const TOKEN_KEY = 'foundry-admin-token';

const allCategories = () => new Set(categories.map((c) => c.id));
const allTiers = () => new Set<Tier>(['beginner', 'intermediate', 'advanced']);
const allStatuses = () => new Set<Status>(['stable', 'new', 'legacy']);

export default function App() {
  const [view, setView] = useState<View>('map');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Seed from the bundled snapshot for instant render, then refresh from the API.
  const [apps, setApps] = useState<Application[]>(applications);
  const [adminToken, setAdminToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY)
  );
  const [filters, setFilters] = useState<Filters>({
    categories: allCategories(),
    tiers: allTiers(),
    statuses: allStatuses(),
    coreOnly: false,
    learningPath: false,
  });

  // Load the live data from the backend on mount (source of truth).
  useEffect(() => {
    fetchGraph()
      .then((g) => setApps(g.applications))
      .catch((e) => console.warn('Falling back to bundled data:', e));
  }, []);

  const appById = useMemo(() => new Map(apps.map((a) => [a.id, a])), [apps]);

  const visibleApps = useMemo(
    () =>
      apps.filter(
        (a) =>
          filters.categories.has(a.category_id) &&
          filters.tiers.has(a.tier) &&
          filters.statuses.has(a.status) &&
          (!filters.coreOnly || a.is_core)
      ),
    [apps, filters]
  );

  const selectedApp = selectedId ? (appById.get(selectedId) ?? null) : null;
  const editingApp = editingId ? (appById.get(editingId) ?? null) : null;

  const canEdit = adminToken !== null;

  const handleSave = async (updated: Application) => {
    if (!adminToken) throw new Error('Not authorized to edit.');
    const saved = await updateApplication(updated, adminToken);
    setApps((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
    setEditingId(null);
  };

  const handleUnlock = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    setAdminToken(token);
  };

  const handleLock = () => {
    localStorage.removeItem(TOKEN_KEY);
    setAdminToken(null);
    setEditingId(null);
  };

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
        <TableView
          apps={apps}
          selectedId={selectedId}
          canEdit={canEdit}
          onSelect={setSelectedId}
          onEdit={setEditingId}
        />
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
      <EditAppDialog app={editingApp} onClose={() => setEditingId(null)} onSave={handleSave} />
      <AdminControls unlocked={canEdit} onUnlock={handleUnlock} onLock={handleLock} />
    </div>
  );
}
