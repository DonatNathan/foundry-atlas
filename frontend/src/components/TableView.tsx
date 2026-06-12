import { useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  HTMLSelect,
  HTMLTable,
  Icon,
  InputGroup,
  Tag,
} from '@blueprintjs/core';
import type { Application, Status, Tier } from '../types';
import { degreeOf, STATUS_LABELS, TIER_LABELS } from '../data';
import { useData } from '../DataContext';

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
  const { categories, categoryById, colorOf } = useData();
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<Tier | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = apps.filter((a) => {
      if (categoryFilter !== 'all' && a.category_id !== categoryFilter) return false;
      if (tierFilter !== 'all' && a.tier !== tierFilter) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.use_case.toLowerCase().includes(q) ||
        (categoryById.get(a.category_id)?.name.toLowerCase().includes(q) ?? false)
      );
    });

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
  }, [apps, query, sortKey, sortDir, categoryFilter, tierFilter, statusFilter, categoryById]);

  const sortLabel = (key: SortKey, label: string) => (
    <span className="th-inner" onClick={() => toggleSort(key)}>
      {label}
      {sortKey === key && (
        <Icon icon={sortDir === 'asc' ? 'caret-up' : 'caret-down'} size={12} />
      )}
    </span>
  );

  const header = (key: SortKey, label: string) => (
    <th className="th-sort">{sortLabel(key, label)}</th>
  );

  const activeFilters =
    (categoryFilter !== 'all' ? 1 : 0) +
    (tierFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0);

  const clearFilters = () => {
    setCategoryFilter('all');
    setTierFilter('all');
    setStatusFilter('all');
  };

  // The same three filters, rendered either inline (toolbar, desktop) or
  // stacked inside the popover menu (mobile).
  const filterFields = (menu: boolean) => {
    const labelClass = menu ? 'filter-field' : 'table-filter';
    const all = (label: string) => (menu ? label : 'All');
    return (
      <>
        <label className={labelClass}>
          <span>Category</span>
          <HTMLSelect
            fill={menu}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.currentTarget.value)}
          >
            <option value="all">{all('All categories')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </HTMLSelect>
        </label>
        <label className={labelClass}>
          <span>Level</span>
          <HTMLSelect
            fill={menu}
            value={tierFilter}
            onChange={(e) => setTierFilter(e.currentTarget.value as Tier | 'all')}
          >
            <option value="all">{all('All levels')}</option>
            {(['beginner', 'intermediate', 'advanced'] as Tier[]).map((t) => (
              <option key={t} value={t}>
                {TIER_LABELS[t]}
              </option>
            ))}
          </HTMLSelect>
        </label>
        <label className={labelClass}>
          <span>Generation</span>
          <HTMLSelect
            fill={menu}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.currentTarget.value as Status | 'all')}
          >
            <option value="all">{all('All generations')}</option>
            {(['stable', 'new', 'legacy'] as Status[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </HTMLSelect>
        </label>
      </>
    );
  };

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

        {/* Desktop: filters laid out inline in the toolbar. */}
        <div className="table-filters">{filterFields(false)}</div>

        {/* Mobile: filters collapsed behind a button that opens a centered dialog. */}
        <div className="filter-menu-trigger">
          <Button
            icon="filter"
            intent={activeFilters > 0 ? 'primary' : 'none'}
            text={activeFilters > 0 ? `Filters (${activeFilters})` : 'Filters'}
            onClick={() => setFiltersOpen(true)}
          />
        </div>
      </div>

      <Dialog
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        icon="filter"
        className="bp6-dark filter-dialog"
      >
        <DialogBody>
          <div className="filter-menu">{filterFields(true)}</div>
        </DialogBody>
        <DialogFooter
          actions={
            <>
              {activeFilters > 0 && <Button variant="minimal" text="Clear" onClick={clearFilters} />}
              <Button intent="primary" text="Done" onClick={() => setFiltersOpen(false)} />
            </>
          }
        />
      </Dialog>

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
