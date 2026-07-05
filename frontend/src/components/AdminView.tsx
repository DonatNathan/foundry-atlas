import { useMemo, useState } from 'react';
import { Alert, Button, HTMLTable, Icon, InputGroup, Tag } from '@blueprintjs/core';
import type {
  Application,
  AppLink,
  AppProject,
  AppResource,
  Category,
  Suggestion,
  SuggestionStatus,
} from '../types';
import { STATUS_LABELS, TIER_LABELS } from '../data';
import { useData } from '../DataContext';
import EditAppDialog from './EditAppDialog';
import CategoryDialog from './CategoryDialog';
import LinkDialog from './LinkDialog';
import ResourceDialog from './ResourceDialog';
import ProjectDialog from './ProjectDialog';
import SuggestionQueue from './SuggestionQueue';

interface AdminViewProps {
  apps: Application[];
  onCreate: (app: Application) => Promise<void>;
  onUpdate: (app: Application) => Promise<void>;
  onDelete: (app: Application) => Promise<void>;
  onCreateCategory: (c: Category) => Promise<void>;
  onUpdateCategory: (c: Category) => Promise<void>;
  onDeleteCategory: (c: Category) => Promise<void>;
  onCreateLink: (l: AppLink) => Promise<void>;
  onUpdateLink: (l: AppLink) => Promise<void>;
  onDeleteLink: (l: AppLink) => Promise<void>;
  onCreateResource: (r: AppResource) => Promise<void>;
  onUpdateResource: (r: AppResource) => Promise<void>;
  onDeleteResource: (r: AppResource) => Promise<void>;
  onCreateProject: (p: AppProject) => Promise<void>;
  onUpdateProject: (p: AppProject) => Promise<void>;
  onDeleteProject: (p: AppProject) => Promise<void>;
  suggestions: Suggestion[];
  onApproveSuggestion: (s: Suggestion) => Promise<void>;
  onRejectSuggestion: (s: Suggestion) => Promise<void>;
  onFetchSuggestions: (status: SuggestionStatus) => Promise<Suggestion[]>;
}

type Section = 'apps' | 'categories' | 'links' | 'resources' | 'projects' | 'suggestions';
type AppEditing = { app: Application; mode: 'create' | 'edit' };
type CatEditing = { category: Category; mode: 'create' | 'edit' };
type LinkEditing = { link: AppLink; mode: 'create' | 'edit' };
type ResourceEditing = { resource: AppResource; mode: 'create' | 'edit' };
type ProjectEditing = { project: AppProject; mode: 'create' | 'edit' };

export default function AdminView({
  apps,
  onCreate,
  onUpdate,
  onDelete,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onCreateLink,
  onUpdateLink,
  onDeleteLink,
  onCreateResource,
  onUpdateResource,
  onDeleteResource,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  suggestions,
  onApproveSuggestion,
  onRejectSuggestion,
  onFetchSuggestions,
}: AdminViewProps) {
  const { categories, categoryById, colorOf, links, resources, projects } = useData();

  const [section, setSection] = useState<Section>('apps');
  const [query, setQuery] = useState('');

  const [appEditing, setAppEditing] = useState<AppEditing | null>(null);
  const [appDeleting, setAppDeleting] = useState<Application | null>(null);
  const [catEditing, setCatEditing] = useState<CatEditing | null>(null);
  const [catDeleting, setCatDeleting] = useState<Category | null>(null);
  const [linkEditing, setLinkEditing] = useState<LinkEditing | null>(null);
  const [linkDeleting, setLinkDeleting] = useState<AppLink | null>(null);
  const [resourceEditing, setResourceEditing] = useState<ResourceEditing | null>(null);
  const [resourceDeleting, setResourceDeleting] = useState<AppResource | null>(null);
  const [projectEditing, setProjectEditing] = useState<ProjectEditing | null>(null);
  const [projectDeleting, setProjectDeleting] = useState<AppProject | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Suggestions sub-filter. Pending uses the live `suggestions` prop (which the
  // badge and approve/reject mutations track); approved/rejected are fetched
  // on demand when their tab is opened.
  const [suggestionStatus, setSuggestionStatus] = useState<SuggestionStatus>('pending');
  const [resolved, setResolved] = useState<Suggestion[]>([]);
  const [resolvedLoading, setResolvedLoading] = useState(false);
  const [resolvedError, setResolvedError] = useState<string | null>(null);

  const showSuggestionStatus = async (status: SuggestionStatus) => {
    setSuggestionStatus(status);
    if (status === 'pending') return;
    setResolvedLoading(true);
    setResolvedError(null);
    try {
      setResolved(await onFetchSuggestions(status));
    } catch (e) {
      setResolvedError(e instanceof Error ? e.message : 'Could not load suggestions.');
      setResolved([]);
    } finally {
      setResolvedLoading(false);
    }
  };

  const appById = useMemo(() => new Map(apps.map((a) => [a.id, a])), [apps]);
  const nameOf = (id: string) => appById.get(id)?.name ?? id;
  const dotColor = (id: string) => {
    const a = appById.get(id);
    return a ? colorOf(a) : '#8F99A8';
  };

  const blankApp = (): Application => ({
    id: '',
    name: '',
    category_id: categories[0]?.id ?? '',
    description: '',
    use_case: '',
    tier: 'beginner',
    is_core: false,
    available_in_dev: false,
    learning_order: null,
    status: 'stable',
    era: null,
    docs_url: null,
    tips: null,
  });

  const blankCategory = (): Category => ({
    id: '',
    name: '',
    color: '#4C90F0',
    sort: (categories.reduce((m, c) => Math.max(m, c.sort), 0) || 0) + 1,
  });

  const blankLink = (): AppLink => ({
    source_id: '',
    target_id: '',
    relationship: 'feeds',
    description: null,
  });

  const blankResource = (): AppResource => ({
    app_id: apps[0]?.id ?? '',
    kind: 'tutorial',
    title: '',
    url: '',
    sort: 0,
  });

  const blankProject = (): AppProject => ({
    app_id: apps[0]?.id ?? '',
    kind: '',
    title: '',
    context: '',
    instructions: '',
    dataset_url: null,
    sort: 0,
    track: null,
    track_step: 0,
  });

  const appRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? apps.filter((a) => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))
      : apps;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [apps, query]);

  const catRows = useMemo(() => [...categories].sort((a, b) => a.sort - b.sort), [categories]);
  const appsPerCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of apps) counts.set(a.category_id, (counts.get(a.category_id) ?? 0) + 1);
    return counts;
  }, [apps]);

  const linkRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? links.filter(
          (l) =>
            nameOf(l.source_id).toLowerCase().includes(q) ||
            nameOf(l.target_id).toLowerCase().includes(q) ||
            l.relationship.includes(q)
        )
      : links;
    return [...list].sort((a, b) =>
      nameOf(a.source_id).localeCompare(nameOf(b.source_id)) ||
      nameOf(a.target_id).localeCompare(nameOf(b.target_id))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [links, query, appById]);

  const saveApp = async (app: Application) => {
    if (!appEditing) return;
    if (appEditing.mode === 'create') await onCreate(app);
    else await onUpdate(app);
    setAppEditing(null);
  };

  const saveCat = async (c: Category) => {
    if (!catEditing) return;
    if (catEditing.mode === 'create') await onCreateCategory(c);
    else await onUpdateCategory(c);
    setCatEditing(null);
  };

  const resourceRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? resources.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            nameOf(r.app_id).toLowerCase().includes(q) ||
            r.kind.includes(q)
        )
      : resources;
    return [...list].sort(
      (a, b) => nameOf(a.app_id).localeCompare(nameOf(b.app_id)) || a.sort - b.sort
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resources, query, appById]);

  const saveLink = async (l: AppLink) => {
    if (!linkEditing) return;
    if (linkEditing.mode === 'create') await onCreateLink(l);
    else await onUpdateLink(l);
    setLinkEditing(null);
  };

  const saveResource = async (r: AppResource) => {
    if (!resourceEditing) return;
    if (resourceEditing.mode === 'create') await onCreateResource(r);
    else await onUpdateResource(r);
    setResourceEditing(null);
  };

  const projectRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? projects.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.kind.toLowerCase().includes(q) ||
            nameOf(p.app_id).toLowerCase().includes(q)
        )
      : projects;
    return [...list].sort(
      (a, b) => nameOf(a.app_id).localeCompare(nameOf(b.app_id)) || a.sort - b.sort
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, query, appById]);

  const saveProject = async (p: AppProject) => {
    if (!projectEditing) return;
    if (projectEditing.mode === 'create') await onCreateProject(p);
    else await onUpdateProject(p);
    setProjectEditing(null);
  };

  const runDelete = async (fn: () => Promise<void>, clear: () => void) => {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await fn();
      clear();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const newButton =
    section === 'apps' ? (
      <Button
        icon="add"
        intent="primary"
        text="New application"
        onClick={() => setAppEditing({ app: blankApp(), mode: 'create' })}
      />
    ) : section === 'categories' ? (
      <Button
        icon="add"
        intent="primary"
        text="New category"
        onClick={() => setCatEditing({ category: blankCategory(), mode: 'create' })}
      />
    ) : section === 'links' ? (
      <Button
        icon="add"
        intent="primary"
        text="New link"
        onClick={() => setLinkEditing({ link: blankLink(), mode: 'create' })}
      />
    ) : section === 'resources' ? (
      <Button
        icon="add"
        intent="primary"
        text="New resource"
        disabled={apps.length === 0}
        onClick={() => setResourceEditing({ resource: blankResource(), mode: 'create' })}
      />
    ) : section === 'projects' ? (
      <Button
        icon="add"
        intent="primary"
        text="New project"
        disabled={apps.length === 0}
        onClick={() => setProjectEditing({ project: blankProject(), mode: 'create' })}
      />
    ) : null;

  const searchable =
    section === 'apps' || section === 'links' || section === 'resources' || section === 'projects';

  return (
    <div className="admin-view bp6-dark">
      <div className="admin-view-bar">
        <div>
          <h2>Manage database</h2>
          <p className="admin-view-sub">
            {apps.length} applications · {categories.length} categories · {links.length} links
          </p>
        </div>
        <div className="admin-view-actions">
          <InputGroup
            leftIcon="search"
            placeholder={searchable ? 'Search…' : 'Search isn’t available here…'}
            value={query}
            disabled={!searchable}
            onChange={(e) => setQuery(e.target.value)}
            round
          />
          {newButton}
        </div>
      </div>

      <div className="admin-sections">
        <button className={section === 'apps' ? 'active' : ''} onClick={() => setSection('apps')}>
          Applications
        </button>
        <button
          className={section === 'categories' ? 'active' : ''}
          onClick={() => setSection('categories')}
        >
          Categories
        </button>
        <button className={section === 'links' ? 'active' : ''} onClick={() => setSection('links')}>
          Links
        </button>
        <button
          className={section === 'resources' ? 'active' : ''}
          onClick={() => setSection('resources')}
        >
          Resources
        </button>
        <button
          className={section === 'projects' ? 'active' : ''}
          onClick={() => setSection('projects')}
        >
          Projects
        </button>
        <button
          className={section === 'suggestions' ? 'active' : ''}
          onClick={() => setSection('suggestions')}
        >
          Suggestions
          {suggestions.length > 0 && (
            <Tag round intent="warning" minimal className="section-badge">
              {suggestions.length}
            </Tag>
          )}
        </button>
      </div>

      <div className="admin-scroll">
        {section === 'apps' && (
          <HTMLTable striped className="app-table admin-table">
            <thead>
              <tr>
                <th>Application</th>
                <th>ID</th>
                <th>Category</th>
                <th>Level</th>
                <th>Generation</th>
                <th className="th-actions" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {appRows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <span className="cell-name">
                      <span className="dot" style={{ background: colorOf(a) }} />
                      {a.name}
                      {a.is_core && (
                        <Tag minimal intent="success" round>
                          Core
                        </Tag>
                      )}
                    </span>
                  </td>
                  <td className="cell-id">{a.id}</td>
                  <td>{categoryById.get(a.category_id)?.name ?? '—'}</td>
                  <td>{TIER_LABELS[a.tier]}</td>
                  <td>{STATUS_LABELS[a.status]}</td>
                  <td className="cell-actions">
                    <button
                      className="row-edit"
                      title="Edit"
                      aria-label={`Edit ${a.name}`}
                      onClick={() => setAppEditing({ app: a, mode: 'edit' })}
                    >
                      <Icon icon="edit" size={14} />
                    </button>
                    <button
                      className="row-edit row-delete"
                      title="Delete"
                      aria-label={`Delete ${a.name}`}
                      onClick={() => {
                        setDeleteError(null);
                        setAppDeleting(a);
                      }}
                    >
                      <Icon icon="trash" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </HTMLTable>
        )}

        {section === 'categories' && (
          <HTMLTable striped className="app-table admin-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>ID</th>
                <th>Color</th>
                <th>Sort</th>
                <th>Apps</th>
                <th className="th-actions" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {catRows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="cell-name">
                      <span className="dot" style={{ background: c.color }} />
                      {c.name}
                    </span>
                  </td>
                  <td className="cell-id">{c.id}</td>
                  <td className="cell-id">{c.color}</td>
                  <td className="cell-num">{c.sort}</td>
                  <td className="cell-num">{appsPerCategory.get(c.id) ?? 0}</td>
                  <td className="cell-actions">
                    <button
                      className="row-edit"
                      title="Edit"
                      aria-label={`Edit ${c.name}`}
                      onClick={() => setCatEditing({ category: c, mode: 'edit' })}
                    >
                      <Icon icon="edit" size={14} />
                    </button>
                    <button
                      className="row-edit row-delete"
                      title="Delete"
                      aria-label={`Delete ${c.name}`}
                      onClick={() => {
                        setDeleteError(null);
                        setCatDeleting(c);
                      }}
                    >
                      <Icon icon="trash" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </HTMLTable>
        )}

        {section === 'links' && (
          <HTMLTable striped className="app-table admin-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Relationship</th>
                <th>Target</th>
                <th>Description</th>
                <th className="th-actions" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {linkRows.map((l) => (
                <tr key={l.id ?? `${l.source_id}-${l.target_id}-${l.relationship}`}>
                  <td>
                    <span className="cell-name">
                      <span className="dot" style={{ background: dotColor(l.source_id) }} />
                      {nameOf(l.source_id)}
                    </span>
                  </td>
                  <td>
                    <Tag minimal>{l.relationship}</Tag>
                  </td>
                  <td>
                    <span className="cell-name">
                      <span className="dot" style={{ background: dotColor(l.target_id) }} />
                      {nameOf(l.target_id)}
                    </span>
                  </td>
                  <td className="cell-desc">{l.description}</td>
                  <td className="cell-actions">
                    <button
                      className="row-edit"
                      title="Edit"
                      aria-label="Edit link"
                      onClick={() => setLinkEditing({ link: l, mode: 'edit' })}
                    >
                      <Icon icon="edit" size={14} />
                    </button>
                    <button
                      className="row-edit row-delete"
                      title="Delete"
                      aria-label="Delete link"
                      onClick={() => {
                        setDeleteError(null);
                        setLinkDeleting(l);
                      }}
                    >
                      <Icon icon="trash" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </HTMLTable>
        )}

        {section === 'resources' && (
          <HTMLTable striped className="app-table admin-table">
            <thead>
              <tr>
                <th>Application</th>
                <th>Kind</th>
                <th>Title</th>
                <th>URL</th>
                <th className="th-actions" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {resourceRows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="cell-name">
                      <span className="dot" style={{ background: dotColor(r.app_id) }} />
                      {nameOf(r.app_id)}
                    </span>
                  </td>
                  <td>
                    <Tag minimal intent={r.kind === 'video' ? 'danger' : 'primary'}>
                      {r.kind === 'video' ? 'Video' : 'Tutorial'}
                    </Tag>
                  </td>
                  <td>{r.title}</td>
                  <td className="cell-desc">
                    <a href={r.url} target="_blank" rel="noreferrer">
                      {r.url}
                    </a>
                  </td>
                  <td className="cell-actions">
                    <button
                      className="row-edit"
                      title="Edit"
                      aria-label={`Edit ${r.title}`}
                      onClick={() => setResourceEditing({ resource: r, mode: 'edit' })}
                    >
                      <Icon icon="edit" size={14} />
                    </button>
                    <button
                      className="row-edit row-delete"
                      title="Delete"
                      aria-label={`Delete ${r.title}`}
                      onClick={() => {
                        setDeleteError(null);
                        setResourceDeleting(r);
                      }}
                    >
                      <Icon icon="trash" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </HTMLTable>
        )}

        {section === 'projects' && (
          <HTMLTable striped className="app-table admin-table">
            <thead>
              <tr>
                <th>Application</th>
                <th>Kind</th>
                <th>Title</th>
                <th>Dataset</th>
                <th className="th-actions" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {projectRows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="cell-name">
                      <span className="dot" style={{ background: dotColor(p.app_id) }} />
                      {nameOf(p.app_id)}
                    </span>
                  </td>
                  <td>
                    <Tag minimal intent="primary">
                      {p.kind}
                    </Tag>
                  </td>
                  <td>{p.title}</td>
                  <td className="cell-num">
                    {p.dataset_url ? <Icon icon="tick" size={14} /> : '—'}
                  </td>
                  <td className="cell-actions">
                    <button
                      className="row-edit"
                      title="Edit"
                      aria-label={`Edit ${p.title}`}
                      onClick={() => setProjectEditing({ project: p, mode: 'edit' })}
                    >
                      <Icon icon="edit" size={14} />
                    </button>
                    <button
                      className="row-edit row-delete"
                      title="Delete"
                      aria-label={`Delete ${p.title}`}
                      onClick={() => {
                        setDeleteError(null);
                        setProjectDeleting(p);
                      }}
                    >
                      <Icon icon="trash" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </HTMLTable>
        )}

        {section === 'suggestions' && (
          <div className="suggestion-panel">
            <div className="suggestion-statusbar">
              {(['pending', 'approved', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  className={suggestionStatus === st ? 'active' : ''}
                  onClick={() => showSuggestionStatus(st)}
                >
                  {st[0].toUpperCase() + st.slice(1)}
                  {st === 'pending' && suggestions.length > 0 && (
                    <Tag round intent="warning" minimal className="section-badge">
                      {suggestions.length}
                    </Tag>
                  )}
                </button>
              ))}
            </div>

            {resolvedError && suggestionStatus !== 'pending' && (
              <p className="admin-delete-error" style={{ padding: '0 12px' }}>
                {resolvedError}
              </p>
            )}

            {suggestionStatus !== 'pending' && resolvedLoading ? (
              <p className="suggestion-loading">Loading…</p>
            ) : (
              <SuggestionQueue
                suggestions={suggestionStatus === 'pending' ? suggestions : resolved}
                readOnly={suggestionStatus !== 'pending'}
                statusFilter={suggestionStatus}
                nameOf={nameOf}
                dotColor={dotColor}
                categoryName={(id) => categoryById.get(id)?.name ?? id}
                linkById={(id) => links.find((l) => l.id === id)}
                onApprove={onApproveSuggestion}
                onReject={onRejectSuggestion}
              />
            )}
          </div>
        )}
      </div>

      <EditAppDialog
        app={appEditing?.app ?? null}
        mode={appEditing?.mode}
        onClose={() => setAppEditing(null)}
        onSave={saveApp}
      />

      <CategoryDialog
        category={catEditing?.category ?? null}
        mode={catEditing?.mode}
        onClose={() => setCatEditing(null)}
        onSave={saveCat}
      />

      <LinkDialog
        link={linkEditing?.link ?? null}
        mode={linkEditing?.mode}
        apps={apps}
        onClose={() => setLinkEditing(null)}
        onSave={saveLink}
      />

      <ResourceDialog
        resource={resourceEditing?.resource ?? null}
        mode={resourceEditing?.mode}
        apps={apps}
        onClose={() => setResourceEditing(null)}
        onSave={saveResource}
      />

      <ProjectDialog
        project={projectEditing?.project ?? null}
        mode={projectEditing?.mode}
        apps={apps}
        onClose={() => setProjectEditing(null)}
        onSave={saveProject}
      />

      <Alert
        isOpen={appDeleting !== null}
        className="bp6-dark"
        intent="danger"
        icon="trash"
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        loading={deleteBusy}
        onCancel={() => setAppDeleting(null)}
        onConfirm={() =>
          appDeleting && runDelete(() => onDelete(appDeleting), () => setAppDeleting(null))
        }
      >
        <p>
          Delete <strong>{appDeleting?.name}</strong>? This also removes every link
          connected to it. This cannot be undone.
        </p>
        {deleteError && <p className="admin-delete-error">{deleteError}</p>}
      </Alert>

      <Alert
        isOpen={catDeleting !== null}
        className="bp6-dark"
        intent="danger"
        icon="trash"
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        loading={deleteBusy}
        onCancel={() => setCatDeleting(null)}
        onConfirm={() =>
          catDeleting && runDelete(() => onDeleteCategory(catDeleting), () => setCatDeleting(null))
        }
      >
        <p>
          Delete category <strong>{catDeleting?.name}</strong>? This cannot be undone.
        </p>
        {deleteError && <p className="admin-delete-error">{deleteError}</p>}
      </Alert>

      <Alert
        isOpen={linkDeleting !== null}
        className="bp6-dark"
        intent="danger"
        icon="trash"
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        loading={deleteBusy}
        onCancel={() => setLinkDeleting(null)}
        onConfirm={() =>
          linkDeleting && runDelete(() => onDeleteLink(linkDeleting), () => setLinkDeleting(null))
        }
      >
        <p>
          Delete the link{' '}
          <strong>
            {linkDeleting && `${nameOf(linkDeleting.source_id)} → ${nameOf(linkDeleting.target_id)}`}
          </strong>
          ? This cannot be undone.
        </p>
        {deleteError && <p className="admin-delete-error">{deleteError}</p>}
      </Alert>

      <Alert
        isOpen={resourceDeleting !== null}
        className="bp6-dark"
        intent="danger"
        icon="trash"
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        loading={deleteBusy}
        onCancel={() => setResourceDeleting(null)}
        onConfirm={() =>
          resourceDeleting &&
          runDelete(() => onDeleteResource(resourceDeleting), () => setResourceDeleting(null))
        }
      >
        <p>
          Delete the resource <strong>{resourceDeleting?.title}</strong>? This cannot be undone.
        </p>
        {deleteError && <p className="admin-delete-error">{deleteError}</p>}
      </Alert>

      <Alert
        isOpen={projectDeleting !== null}
        className="bp6-dark"
        intent="danger"
        icon="trash"
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        loading={deleteBusy}
        onCancel={() => setProjectDeleting(null)}
        onConfirm={() =>
          projectDeleting &&
          runDelete(() => onDeleteProject(projectDeleting), () => setProjectDeleting(null))
        }
      >
        <p>
          Delete the project <strong>{projectDeleting?.title}</strong>? This cannot be undone.
        </p>
        {deleteError && <p className="admin-delete-error">{deleteError}</p>}
      </Alert>
    </div>
  );
}
