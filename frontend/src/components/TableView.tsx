import { useMemo, useState } from 'react';
import { HTMLTable, Icon, InputGroup, Tag } from '@blueprintjs/core';
import type { Application } from '../types';
import { categoryById, colorOf, degreeOf, STATUS_LABELS, TIER_LABELS } from '../data';

interface TableViewProps {
  apps: Application[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

type SortKey = 'name' | 'category' | 'tier' | 'status' | 'connections';
type SortDir = 'asc' | 'desc';

const TIER_ORDER: Record<Application['tier'], number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};
const STATUS_ORDER: Record<Application['status'], number> = {
  stable: 0,
  new: 1,
  legacy: 2,
};

const tierIntent = (t: Application['tier']) =>
  t === 'beginner' ? 'success' : t === 'intermediate' ? 'primary' : 'warning';
const statusIntent = (s: Application['status']) =>
  s === 'new' ? 'primary' : s === 'legacy' ? 'danger' : 'none';

export default function TableView({ apps, selectedId, onSelect }: TableViewProps) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? apps.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q) ||
            a.use_case.toLowerCase().includes(q) ||
            (categoryById.get(a.category_id)?.name.toLowerCase().includes(q) ?? false)
        )
      : apps;

    const cmp = (a: Application, b: Application): number => {
      switch (sortKey) {
        case 'category':
          return (categoryById.get(a.category_id)?.name ?? '').localeCompare(
            categoryById.get(b.category_id)?.name ?? ''
          );
        case 'tier':
          return TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
        case 'status':
          return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        case 'connections':
          return degreeOf(a.id) - degreeOf(b.id);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    };

    const sorted = [...filtered].sort(cmp);
    if (sortDir === 'desc') sorted.reverse();
    return sorted;
  }, [apps, query, sortKey, sortDir]);

  const header = (key: SortKey, label: string) => (
    <th className="th-sort" onClick={() => toggleSort(key)}>
      <span className="th-inner">
        {label}
        {sortKey === key && (
          <Icon icon={sortDir === 'asc' ? 'caret-up' : 'caret-down'} size={12} />
        )}
      </span>
    </th>
  );

  return (
    <div className="table-view bp6-dark">
      <div className="table-toolbar">
        <InputGroup
          leftIcon="search"
          placeholder="Filter applications…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          round
        />
        <span className="table-count">
          {rows.length} application{rows.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="table-scroll">
        <HTMLTable interactive striped className="app-table">
          <thead>
            <tr>
              {header('name', 'Application')}
              {header('category', 'Category')}
              {header('tier', 'Level')}
              {header('status', 'Generation')}
              {header('connections', 'Links')}
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const category = categoryById.get(a.category_id);
              return (
                <tr
                  key={a.id}
                  className={a.id === selectedId ? 'row-selected' : ''}
                  onClick={() => onSelect(a.id)}
                >
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
                  <td>{category?.name ?? '—'}</td>
                  <td>
                    <Tag minimal intent={tierIntent(a.tier)}>
                      {TIER_LABELS[a.tier]}
                    </Tag>
                  </td>
                  <td>
                    <Tag minimal intent={statusIntent(a.status)}>
                      {STATUS_LABELS[a.status]}
                    </Tag>
                  </td>
                  <td className="cell-num">{degreeOf(a.id)}</td>
                  <td className="cell-desc">{a.description}</td>
                </tr>
              );
            })}
          </tbody>
        </HTMLTable>
      </div>
    </div>
  );
}
