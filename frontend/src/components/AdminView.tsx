import { useMemo, useState } from 'react';
import { Alert, Button, HTMLTable, Icon, InputGroup, Tag } from '@blueprintjs/core';
import type { Application } from '../types';
import { categories, categoryById, colorOf, STATUS_LABELS, TIER_LABELS } from '../data';
import EditAppDialog from './EditAppDialog';

interface AdminViewProps {
  apps: Application[];
  onCreate: (app: Application) => Promise<void>;
  onUpdate: (app: Application) => Promise<void>;
  onDelete: (app: Application) => Promise<void>;
}

type Editing = { app: Application; mode: 'create' | 'edit' };

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

export default function AdminView({ apps, onCreate, onUpdate, onDelete }: AdminViewProps) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<Application | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? apps.filter(
          (a) => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)
        )
      : apps;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [apps, query]);

  const save = async (app: Application) => {
    if (!editing) return;
    if (editing.mode === 'create') await onCreate(app);
    else await onUpdate(app);
    setEditing(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    setDeleteError(null);
    try {
      await onDelete(deleting);
      setDeleting(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <div className="admin-view bp6-dark">
      <div className="admin-view-bar">
        <div>
          <h2>Manage applications</h2>
          <p className="admin-view-sub">{apps.length} applications in the database</p>
        </div>
        <div className="admin-view-actions">
          <InputGroup
            leftIcon="search"
            placeholder="Find by name or id…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            round
          />
          <Button
            icon="add"
            intent="primary"
            text="New application"
            onClick={() => setEditing({ app: blankApp(), mode: 'create' })}
          />
        </div>
      </div>

      <div className="admin-scroll">
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
            {rows.map((a) => (
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
                    onClick={() => setEditing({ app: a, mode: 'edit' })}
                  >
                    <Icon icon="edit" size={14} />
                  </button>
                  <button
                    className="row-edit row-delete"
                    aria-label={`Delete ${a.name}`}
                    title="Delete"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleting(a);
                    }}
                  >
                    <Icon icon="trash" size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </HTMLTable>
      </div>

      <EditAppDialog
        app={editing?.app ?? null}
        mode={editing?.mode}
        onClose={() => setEditing(null)}
        onSave={save}
      />

      <Alert
        isOpen={deleting !== null}
        className="bp6-dark"
        intent="danger"
        icon="trash"
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        loading={deletingBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      >
        <p>
          Delete <strong>{deleting?.name}</strong>? This also removes every link
          connected to it. This cannot be undone.
        </p>
        {deleteError && <p className="admin-delete-error">{deleteError}</p>}
      </Alert>
    </div>
  );
}
