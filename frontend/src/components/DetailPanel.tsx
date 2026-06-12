import { AnchorButton, Button, Callout, Divider, Tag } from '@blueprintjs/core';
import type { Application } from '../types';
import { appById, links, RELATIONSHIP_VERBS, STATUS_LABELS, TIER_LABELS } from '../data';
import { useData } from '../DataContext';

interface DetailPanelProps {
  app: Application;
  onSelect: (id: string) => void;
  onClose: () => void;
}

interface Connection {
  other: Application;
  verb: string;
  desc: string | null;
}

export default function DetailPanel({ app, onSelect, onClose }: DetailPanelProps) {
  const { categoryById, colorOf } = useData();
  const category = categoryById.get(app.category_id);
  const color = colorOf(app);

  const connections: Connection[] = [];
  for (const l of links) {
    if (l.source_id === app.id) {
      const other = appById.get(l.target_id);
      if (other)
        connections.push({
          other,
          verb: RELATIONSHIP_VERBS[l.relationship].out,
          desc: l.description,
        });
    } else if (l.target_id === app.id) {
      const other = appById.get(l.source_id);
      if (other)
        connections.push({
          other,
          verb: RELATIONSHIP_VERBS[l.relationship].in,
          desc: l.description,
        });
    }
  }

  const tierIntent =
    app.tier === 'beginner' ? 'success' : app.tier === 'intermediate' ? 'primary' : 'warning';

  return (
    <aside className="detail-panel bp6-dark">
      <div className="detail-header" style={{ borderTop: `3px solid ${color}` }}>
        <div className="detail-title-row">
          <h2>{app.name}</h2>
          <Button variant="minimal" icon="cross" aria-label="Close" onClick={onClose} />
        </div>
        <div className="detail-tags">
          {category && (
            <Tag minimal style={{ color }} icon={<span className="dot" style={{ background: color }} />}>
              {category.name}
            </Tag>
          )}
          <Tag minimal intent={tierIntent}>
            {TIER_LABELS[app.tier]}
          </Tag>
          {app.is_core && <Tag intent="success">Core — learn early</Tag>}
          {app.status === 'new' && <Tag intent="primary">{STATUS_LABELS.new}</Tag>}
          {app.status === 'legacy' && <Tag intent="danger">{STATUS_LABELS.legacy}</Tag>}
          {app.learning_order != null && (
            <Tag minimal round>
              Learning path · step {app.learning_order}
            </Tag>
          )}
        </div>
        {app.era && <p className="detail-era">{app.era}</p>}
      </div>

      <div className="detail-body">
        <h4>What is it?</h4>
        <p>{app.description}</p>

        <h4>What is it used for?</h4>
        <p>{app.use_case}</p>

        {app.tips && (
          <Callout icon="learning" title="Learning tip" intent="primary" compact>
            {app.tips}
          </Callout>
        )}

        {app.docs_url && (
          <AnchorButton
            href={app.docs_url}
            target="_blank"
            rel="noreferrer"
            icon="manual"
            endIcon="share"
            intent="primary"
            variant="outlined"
            fill
            className="docs-button"
          >
            Official documentation
          </AnchorButton>
        )}

        <Divider />

        <h4>
          Connections <span className="count">({connections.length})</span>
        </h4>
        <ul className="connection-list">
          {connections.map((c, i) => (
            <li key={i}>
              <button
                className="connection-row"
                onClick={() => onSelect(c.other.id)}
                title={c.desc ?? undefined}
              >
                <span className="connection-verb">{c.verb}</span>
                <span className="connection-target">
                  <span className="dot" style={{ background: colorOf(c.other) }} />
                  {c.other.name}
                </span>
                {c.desc && <span className="connection-desc">{c.desc}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
