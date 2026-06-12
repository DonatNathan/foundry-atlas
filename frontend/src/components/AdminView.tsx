import { useMemo, useState } from 'react';
import { Alert, Button, HTMLTable, Icon, InputGroup, Tag } from '@blueprintjs/core';
import type { Application, Category } from '../types';
import { STATUS_LABELS, TIER_LABELS } from '../data';
import { useData } from '../DataContext';
import EditAppDialog from './EditAppDialog';
import CategoryDialog from './CategoryDialog';

interface AdminViewProps {
  apps: Application[];
  onCreate: (app: Application) => Promise<void>;
  onUpdate: (app: Application) => Promise<void>;
  onDelete: (app: Application) => Promise<void>;
  onCreateCategory: (c: Category) => Promise<void>;
  onUpdateCategory: (c: Category) => Promise<void>;
  onDeleteCategory: (c: Category) => Promise<void>;
}

type Section = 'apps' | 'categories';
type AppEditing = { app: Application; mode: 'create' | 'edit' };
type CatEditing = { category: Category; mode: 'create' | 'edit' };

export default function AdminView({
  apps,
  onCreate,
  onUpdate,
  onDelete,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: AdminViewProps) {
  const { categories, categoryById, colorOf } = useData();

  const [section, setSection] = useState<Section>('apps');
  const [query, setQuery] = useState('');

  const [appEditing, setAppEditing] = useState<AppEditing | null>(null);
  const [appDeleting, setAppDeleting] = useState<Application | null>(null);
  const [catEditing, setCatEditing] = useState<CatEditing | null>(null);
  const [catDeleting, setCatDeleting] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const blankApp = (): Application => ({
    id: '',
    name: '',
    category_id: categories[0]?.id ?? '',
    description: '',
    use_case: '',
    tier: 'beginner',
    is_core: false,
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

  return (
    <div className="admin-view bp6-dark">
      <div className="admin-view-bar">
        <div>
          <h2>Manage database</h2>
          <p className="admin-view-sub">
            {apps.length} applications · {categories.length} categories
          </p>
        </div>
        <div className="admin-view-actions">
          {section === 'apps' && (
            <InputGroup
              leftIcon="search"
              placeholder="Find by name or id…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              round
            />
          )}
          {section === 'apps' ? (
            <Button
              icon="add"
              intent="primary"
              text="New application"
              onClick={() => setAppEditing({ app: blankApp(), mode: 'create' })}
            />
          ) : (
            <Button
              icon="add"
              intent="primary"
              text="New category"
              onClick={() => setCatEditing({ category: blankCategory(), mode: 'create' })}
            />
          )}
        </div>
      </div>

      <div className="admin-sections">
        <button
          className={section === 'apps' ? 'active' : ''}
          onClick={() => setSection('apps')}
        >
          Applications
        </button>
        <button
          className={section === 'categories' ? 'active' : ''}
          onClick={() => setSection('categories')}
        >
          Categories
        </button>
      </div>

      <div className="admin-scroll">
        {section === 'apps' ? (
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
                      aria-label={`Edit ${a.name}`}
                      title="Edit"
                      onClick={() => setAppEditing({ app: a, mode: 'edit' })}
                    >
                      <Icon icon="edit" size={14} />
                    </button>
                    <button
                      className="row-edit row-delete"
                      aria-label={`Delete ${a.name}`}
                      title="Delete"
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
        ) : (
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
              {catRows.map((c) => {
                const count = appsPerCategory.get(c.id) ?? 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <span className="cell-name">
                        <span className="dot" style={{ background: c.color }} />
                        {c.name}
                      </span>
                    </td>
                    <td className="cell-id">{c.id}</td>
                    <td>
                      <span className="cell-id">{c.color}</span>
                    </td>
                    <td className="cell-num">{c.sort}</td>
                    <td className="cell-num">{count}</td>
                    <td className="cell-actions">
                      <button
                        className="row-edit"
                        aria-label={`Edit ${c.name}`}
                        title="Edit"
                        onClick={() => setCatEditing({ category: c, mode: 'edit' })}
                      >
                        <Icon icon="edit" size={14} />
                      </button>
                      <button
                        className="row-edit row-delete"
                        aria-label={`Delete ${c.name}`}
                        title={count > 0 ? 'In use — reassign apps first' : 'Delete'}
                        onClick={() => {
                          setDeleteError(null);
                          setCatDeleting(c);
                        }}
                      >
                        <Icon icon="trash" size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </HTMLTable>
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
    </div>
  );
}
