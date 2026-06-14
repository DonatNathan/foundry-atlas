import { Icon, Tag } from '@blueprintjs/core';
import type { Application, Filters } from '../types';
import { appById, matchesFilters, STATUS_LABELS, TIER_LABELS } from '../data';
import { useData } from '../DataContext';

interface EmbedCardProps {
  app: Application | null;
  filters: Filters;
  backHref: string;
}

// A compact, self-contained app card shown inside an `?embed=card` iframe —
// the live-HTML cousin of the exported PNG. Reflects the active filters and
// links back to the same app on the full map.
export default function EmbedCard({ app, filters, backHref }: EmbedCardProps) {
  const { categoryById, colorOf, links } = useData();

  if (!app) {
    return (
      <div className="embed-card-root bp6-dark">
        <p className="embed-card-empty">No application selected to embed.</p>
      </div>
    );
  }

  const category = categoryById.get(app.category_id);
  const color = colorOf(app);

  const connections: Application[] = [];
  const seen = new Set<string>();
  for (const l of links) {
    const otherId =
      l.source_id === app.id ? l.target_id : l.target_id === app.id ? l.source_id : null;
    if (!otherId || seen.has(otherId)) continue;
    const other = appById.get(otherId);
    if (other && matchesFilters(other, filters)) {
      connections.push(other);
      seen.add(otherId);
    }
  }

  const tierIntent =
    app.tier === 'beginner' ? 'success' : app.tier === 'intermediate' ? 'primary' : 'warning';
  const MAX_CHIPS = 10;
  const shown = connections.slice(0, MAX_CHIPS);
  const overflow = connections.length - shown.length;

  return (
    <div className="embed-card-root bp6-dark">
      <article className="embed-card" style={{ borderTop: `3px solid ${color}` }}>
        <div className="embed-card-head">
          <h2>{app.name}</h2>
          <div className="embed-card-tags">
            {category && (
              <Tag minimal style={{ color }} icon={<span className="dot" style={{ background: color }} />}>
                {category.name}
              </Tag>
            )}
            <Tag minimal intent={tierIntent}>
              {TIER_LABELS[app.tier]}
            </Tag>
            {app.is_core && <Tag intent="success">Core</Tag>}
            {app.status === 'new' && <Tag intent="primary">{STATUS_LABELS.new}</Tag>}
            {app.status === 'legacy' && <Tag intent="danger">{STATUS_LABELS.legacy}</Tag>}
          </div>
        </div>

        <p className="embed-card-desc">{app.description}</p>

        <div className="embed-card-connections">
          <span className="embed-card-count" style={{ color }}>
            {connections.length}
          </span>{' '}
          connection{connections.length === 1 ? '' : 's'}
          <div className="embed-card-chips">
            {shown.map((c) => (
              <span className="embed-chip" key={c.id}>
                <span className="dot" style={{ background: colorOf(c) }} />
                {c.name}
              </span>
            ))}
            {overflow > 0 && <span className="embed-chip embed-chip-more">+{overflow} more</span>}
          </div>
        </div>

        <a
          className="embed-card-foot"
          href={backHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="embed-badge-mark" aria-hidden />
          <span className="embed-card-foot-name">Foundry Atlas</span>
          <span className="embed-card-foot-cta">
            Explore the full map <Icon icon="share" size={11} />
          </span>
        </a>
      </article>
    </div>
  );
}
