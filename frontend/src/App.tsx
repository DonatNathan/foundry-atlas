import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@blueprintjs/core';
import GraphView from './components/GraphView';
import DetailPanel from './components/DetailPanel';
import Sidebar from './components/Sidebar';
import TableView from './components/TableView';
import AdminView from './components/AdminView';
import AdminControls from './components/AdminControls';
import { applications, categories, links } from './data';
import { createApplication, deleteApplication, fetchGraph, updateApplication } from './api';
import type { Application, Filters, Status, Tier } from './types';

type View = 'map' | 'table' | 'admin';

const TOKEN_KEY = 'foundry-admin-token';

const allCategories = () => new Set(categories.map((c) => c.id));
const allTiers = () => new Set<Tier>(['beginner', 'intermediate', 'advanced']);
const allStatuses = () => new Set<Status>(['stable', 'new', 'legacy']);

export default function App() {
  const [view, setView] = useState<View>('map');
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const canEdit = adminToken !== null;
  // The admin view is only reachable while unlocked.
  const activeView: View = view === 'admin' && !canEdit ? 'map' : view;

  const selectedApp = selectedId ? (appById.get(selectedId) ?? null) : null;

  const handleUpdate = async (updated: Application) => {
    if (!adminToken) throw new Error('Not authorized to edit.');
    const saved = await updateApplication(updated, adminToken);
    setApps((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
  };

  const handleCreate = async (created: Application) => {
    if (!adminToken) throw new Error('Not authorized to create.');
    const saved = await createApplication(created, adminToken);
    setApps((prev) => [...prev, saved]);
  };

  const handleDelete = async (app: Application) => {
    if (!adminToken) throw new Error('Not authorized to delete.');
    await deleteApplication(app.id, adminToken);
    setApps((prev) => prev.filter((a) => a.id !== app.id));
    if (selectedId === app.id) setSelectedId(null);
  };

  const handleUnlock = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    setAdminToken(token);
  };

  const handleLock = () => {
    localStorage.removeItem(TOKEN_KEY);
    setAdminToken(null);
    if (view === 'admin') setView('map');
  };

  return (
    <div className="app bp6-dark">
      <div className="top-bar">
        <div className="view-tabs">
          <button className={activeView === 'map' ? 'active' : ''} onClick={() => setView('map')}>
            <Icon icon="graph" size={14} /> Map
          </button>
          <button
            className={activeView === 'table' ? 'active' : ''}
            onClick={() => setView('table')}
          >
            <Icon icon="th" size={14} /> Table
          </button>
          {canEdit && (
            <button
              className={activeView === 'admin' ? 'active' : ''}
              onClick={() => setView('admin')}
            >
              <Icon icon="cog" size={14} /> Admin
            </button>
          )}
        </div>
        <AdminControls unlocked={canEdit} onUnlock={handleUnlock} onLock={handleLock} />
      </div>

      {activeView === 'map' && (
        <GraphView
          apps={visibleApps}
          links={links}
          selectedId={selectedId}
          learningPathMode={filters.learningPath}
          onSelect={setSelectedId}
        />
      )}
      {activeView === 'table' && (
        <TableView apps={apps} selectedId={selectedId} onSelect={setSelectedId} />
      )}
      {activeView === 'admin' && (
        <AdminView
          apps={apps}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {activeView === 'map' && (
        <Sidebar
          filters={filters}
          onFiltersChange={setFilters}
          onSelect={setSelectedId}
          visibleCount={visibleApps.length}
        />
      )}
      {selectedApp && activeView !== 'admin' && (
        <DetailPanel
          app={selectedApp}
          onSelect={setSelectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
