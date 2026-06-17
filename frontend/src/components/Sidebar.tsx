import { useMemo, useState } from 'react';
import { Button, Checkbox, InputGroup, Switch, Tag } from '@blueprintjs/core';
import type { Application, Filters, Status, Tier } from '../types';
import { describeFilters, matchesFilters, STATUS_LABELS, TIER_LABELS } from '../data';
import { useData } from '../DataContext';
import { exportLearningPathCard } from '../exportCard';

interface SidebarProps {
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  onSelect: (id: string) => void;
  visibleCount: number;
}

const TIERS: Tier[] = ['beginner', 'intermediate', 'advanced'];
const STATUSES: Status[] = ['stable', 'new', 'legacy'];

export default function Sidebar({
  filters,
  onFiltersChange,
  onSelect,
  visibleCount,
}: SidebarProps) {
  const { apps, categories, colorOf, learningPath, links } = useData();
  const pathSteps = learningPath.filter((a) => matchesFilters(a, filters));
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const results: Application[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const rank = (a: Application): number => {
      const name = a.name.toLowerCase();
      if (name.startsWith(q)) return 0;
      if (name.includes(q)) return 1;
      if (a.description.toLowerCase().includes(q) || a.use_case.toLowerCase().includes(q))
        return 2;
      return 3;
    };
    return apps
      .map((a) => [a, rank(a)] as const)
      .filter(([, r]) => r < 3)
      .sort((x, y) => x[1] - y[1])
      .map(([a]) => a)
      .slice(0, 8);
  }, [apps, query]);

  const toggle = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const pick = (id: string) => {
    onSelect(id);
    setQuery('');
  };

  return (
    <aside className={`sidebar bp6-dark ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div>
          <h1>Foundry Atlas</h1>
          <p className="subtitle">An interactive map of Palantir Foundry</p>
        </div>
        <Button
          variant="minimal"
          icon={collapsed ? 'chevron-down' : 'chevron-up'}
          aria-label="Toggle panel"
          onClick={() => setCollapsed(!collapsed)}
        />
      </div>

      {!collapsed && (
        <div className="sidebar-body">
          <div className="search-wrap">
            <InputGroup
              leftIcon="search"
              placeholder="Search applications…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              round
            />
            {results.length > 0 && (
              <ul className="search-results">
                {results.map((a) => (
                  <li key={a.id}>
                    <button onClick={() => pick(a.id)}>
                      <span className="dot" style={{ background: colorOf(a) }} />
                      <span className="result-name">{a.name}</span>
                      <span className="result-tier">{TIER_LABELS[a.tier]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Switch
            checked={filters.learningPath}
            label="🎓 Learning path mode"
            onChange={(e) =>
              onFiltersChange({ ...filters, learningPath: e.currentTarget.checked })
            }
          />
          {filters.learningPath && (
            <>
              <ol className="path-list">
                {pathSteps.map((a) => (
                  <li key={a.id}>
                    <button onClick={() => onSelect(a.id)}>
                      <span className="path-step">{a.learning_order}</span>
                      <span className="dot" style={{ background: colorOf(a) }} />
                      {a.name}
                    </button>
                  </li>
                ))}
              </ol>
              <Button
                variant="outlined"
                icon="export"
                fill
                className="path-export"
                disabled={pathSteps.length === 0}
                onClick={() =>
                  exportLearningPathCard(
                    pathSteps.map((a) => ({ app: a, color: colorOf(a) })),
                    describeFilters(filters, categories),
                  )
                }
              >
                Export path as PNG
              </Button>
            </>
          )}

          <Switch
            checked={filters.coreOnly}
            label="Core applications only"
            onChange={(e) =>
              onFiltersChange({ ...filters, coreOnly: e.currentTarget.checked })
            }
          />

          <h4>Categories</h4>
          {categories.map((c) => (
            <Checkbox
              key={c.id}
              checked={filters.categories.has(c.id)}
              onChange={() =>
                onFiltersChange({ ...filters, categories: toggle(filters.categories, c.id) })
              }
              labelElement={
                <span className="legend-label">
                  <span className="dot" style={{ background: c.color }} /> {c.name}
                </span>
              }
            />
          ))}

          <h4>Experience level</h4>
          <div className="tag-row">
            {TIERS.map((t) => (
              <Tag
                key={t}
                interactive
                round
                minimal={!filters.tiers.has(t)}
                intent={t === 'beginner' ? 'success' : t === 'intermediate' ? 'primary' : 'warning'}
                onClick={() => onFiltersChange({ ...filters, tiers: toggle(filters.tiers, t) })}
              >
                {TIER_LABELS[t]}
              </Tag>
            ))}
          </div>

          <h4>Generation</h4>
          <div className="tag-row">
            {STATUSES.map((s) => (
              <Tag
                key={s}
                interactive
                round
                minimal={!filters.statuses.has(s)}
                intent={s === 'new' ? 'primary' : s === 'legacy' ? 'danger' : 'none'}
                onClick={() =>
                  onFiltersChange({ ...filters, statuses: toggle(filters.statuses, s) })
                }
              >
                {STATUS_LABELS[s]}
              </Tag>
            ))}
          </div>

          <p className="stats">
            {visibleCount} / {apps.length} applications · {links.length} links
          </p>
        </div>
      )}
    </aside>
  );
}
