import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@blueprintjs/core';
import GraphView from './components/GraphView';
import DetailPanel from './components/DetailPanel';
import Sidebar from './components/Sidebar';
import TableView from './components/TableView';
import AdminView from './components/AdminView';
import AdminControls from './components/AdminControls';
import ShareButton from './components/ShareButton';
import EmbedButton from './components/EmbedButton';
import EmbedFrame from './components/EmbedFrame';
import EmbedCard from './components/EmbedCard';
import { DataProvider } from './DataProvider';
import { buildShareQuery, parseEmbedMode, parseShareState } from './urlState';
import { applications, categories as seedCategories, links as seedLinks } from './data';
import {
  createApplication,
  createCategory,
  createLink,
  deleteApplication,
  deleteCategory,
  deleteLink,
  fetchGraph,
  updateApplication,
  updateCategory,
  updateLink,
} from './api';
import type { Application, AppLink, Category, Filters } from './types';

type View = 'map' | 'table' | 'admin';

const TOKEN_KEY = 'foundry-admin-token';

export default function App() {
  // Restore view, selected app, and filters from the URL so permalinks reopen
  // the exact same view. Parsed once on mount against the bundled categories.
  const initialState = useMemo(
    () => parseShareState(window.location.search, seedCategories.map((c) => c.id)),
    []
  );
  // Embed mode is fixed for the life of the iframe (read once from the URL).
  const embedMode = useMemo(() => parseEmbedMode(window.location.search), []);
  const [view, setView] = useState<View>(initialState.view);
  const [selectedId, setSelectedId] = useState<string | null>(initialState.selectedId);
  // Seed from the bundled snapshot for instant render, then refresh from the API.
  const [apps, setApps] = useState<Application[]>(applications);
  const [categories, setCategories] = useState<Category[]>(seedCategories);
  const [links, setLinks] = useState<AppLink[]>(seedLinks);
  const [adminToken, setAdminToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY)
  );
  const [filters, setFilters] = useState<Filters>(initialState.filters);

  // Load the live data from the backend on mount (source of truth).
  useEffect(() => {
    fetchGraph()
      .then((g) => {
        setApps(g.applications);
        setCategories(g.categories);
        setLinks(g.links);
      })
      .catch((e) => console.warn('Falling back to bundled data:', e));
  }, []);

  // Keep the category filter coherent as categories are added/removed: new
  // categories show by default, deleted ones drop out of the filter set.
  const knownCategoryIds = useRef(new Set(seedCategories.map((c) => c.id)));
  useEffect(() => {
    const current = new Set(categories.map((c) => c.id));
    const added = [...current].filter((id) => !knownCategoryIds.current.has(id));
    const removed = [...knownCategoryIds.current].filter((id) => !current.has(id));
    if (added.length || removed.length) {
      setFilters((f) => {
        const next = new Set(f.categories);
        added.forEach((id) => next.add(id));
        removed.forEach((id) => next.delete(id));
        return { ...f, categories: next };
      });
    }
    knownCategoryIds.current = current;
  }, [categories]);

  // Mirror the shareable state into the URL so the current view can be copied as
  // a permalink (handled by the Share button). Admin is local-only and excluded.
  useEffect(() => {
    if (view === 'admin') return;
    const params = new URLSearchParams(
      buildShareQuery({ view, selectedId, filters }, categories.map((c) => c.id))
    );
    // Keep the iframe pointed at its embed view across state changes.
    if (embedMode) params.set('embed', embedMode);
    const qs = params.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', url);
  }, [view, selectedId, filters, categories, embedMode]);

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
  const activeView: View = view === 'admin' && !canEdit ? 'map' : view;

  const selectedApp = selectedId ? (appById.get(selectedId) ?? null) : null;

  // Link an embed back to the full app (same selection/filters, no embed param).
  const backHref = useMemo(() => {
    const qs = buildShareQuery(
      { view: 'map', selectedId, filters },
      categories.map((c) => c.id)
    );
    return `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ''}`;
  }, [selectedId, filters, categories]);

  const requireToken = () => {
    if (!adminToken) throw new Error('Not authorized.');
    return adminToken;
  };

  const handleUpdate = async (updated: Application) => {
    const saved = await updateApplication(updated, requireToken());
    setApps((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
  };

  const handleCreate = async (created: Application) => {
    const saved = await createApplication(created, requireToken());
    setApps((prev) => [...prev, saved]);
  };

  const handleDelete = async (app: Application) => {
    await deleteApplication(app.id, requireToken());
    setApps((prev) => prev.filter((a) => a.id !== app.id));
    // The backend cascades link deletion, so drop them locally too.
    setLinks((prev) => prev.filter((l) => l.source_id !== app.id && l.target_id !== app.id));
    if (selectedId === app.id) setSelectedId(null);
  };

  const handleCreateCategory = async (c: Category) => {
    const saved = await createCategory(c, requireToken());
    setCategories((prev) => [...prev, saved]);
  };

  const handleUpdateCategory = async (c: Category) => {
    const saved = await updateCategory(c, requireToken());
    setCategories((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
  };

  const handleDeleteCategory = async (c: Category) => {
    await deleteCategory(c.id, requireToken());
    setCategories((prev) => prev.filter((x) => x.id !== c.id));
  };

  const handleCreateLink = async (l: AppLink) => {
    const saved = await createLink(l, requireToken());
    setLinks((prev) => [...prev, saved]);
  };

  const handleUpdateLink = async (l: AppLink) => {
    const saved = await updateLink(l, requireToken());
    setLinks((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
  };

  const handleDeleteLink = async (l: AppLink) => {
    if (l.id == null) throw new Error('This link has no id and cannot be deleted.');
    await deleteLink(l.id, requireToken());
    setLinks((prev) => prev.filter((x) => x.id !== l.id));
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

  if (embedMode) {
    return (
      <DataProvider categories={categories} links={links}>
        {embedMode === 'card' ? (
          <EmbedCard app={selectedApp} filters={filters} backHref={backHref} />
        ) : (
          <EmbedFrame
            apps={visibleApps}
            selectedId={selectedId}
            selectedApp={selectedApp}
            filters={filters}
            backHref={backHref}
            onSelect={setSelectedId}
          />
        )}
      </DataProvider>
    );
  }

  return (
    <DataProvider categories={categories} links={links}>
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
          <ShareButton />
          <EmbedButton
            selectedId={selectedId}
            selectedAppName={selectedApp?.name ?? null}
            filters={filters}
            allCategoryIds={categories.map((c) => c.id)}
          />
          <AdminControls unlocked={canEdit} onUnlock={handleUnlock} onLock={handleLock} />
        </div>

        {activeView === 'map' && (
          <GraphView
            apps={visibleApps}
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
            onCreateCategory={handleCreateCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onCreateLink={handleCreateLink}
            onUpdateLink={handleUpdateLink}
            onDeleteLink={handleDeleteLink}
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
            filters={filters}
            onSelect={setSelectedId}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </DataProvider>
  );
}
