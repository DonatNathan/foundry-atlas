import { useState } from 'react';
import { AnchorButton, Button, Callout, Divider, Icon, Tag } from '@blueprintjs/core';
import type { Application, Filters } from '../types';
import { describeFilters, matchesFilters, RELATIONSHIP_VERBS, STATUS_LABELS, TIER_LABELS } from '../data';
import { useData } from '../DataContext';
import { exportNeighborhoodCard } from '../exportCard';
import ProjectsDialog from './ProjectsDialog';

interface DetailPanelProps {
  app: Application;
  filters: Filters;
  onSelect: (id: string) => void;
  onClose: () => void;
  /** Open the suggestion form pre-filled with this app (omitted in embeds). */
  onSuggest?: () => void;
}

interface Connection {
  other: Application;
  verb: string;
  desc: string | null;
}

// Extract the YouTube video id from common URL shapes so we can show a thumbnail.
function youtubeId(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
    if (u.hostname.endsWith('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const m = u.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/);
      if (m) return m[1];
    }
  } catch {
    /* not a parseable URL */
  }
  return null;
}

export default function DetailPanel({ app, filters, onSelect, onClose, onSuggest }: DetailPanelProps) {
  const { appById, categories, categoryById, colorOf, links, resourcesOf, projectsOf } = useData();
  const resources = resourcesOf(app.id);
  const tutorials = resources.filter((r) => r.kind === 'tutorial');
  const videos = resources.filter((r) => r.kind === 'video');
  const projects = projectsOf(app.id);
  const category = categoryById.get(app.category_id);
  const color = colorOf(app);
  const [exporting, setExporting] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);

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

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportNeighborhoodCard({
        app,
        color,
        categoryName: category?.name ?? 'Uncategorized',
        // Mirror the map: only neighbors that pass the active filters.
        connections: connections
          .filter((c) => matchesFilters(c.other, filters))
          .map((c) => ({
            app: c.other,
            color: colorOf(c.other),
          })),
        filters: describeFilters(filters, categories),
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <aside className="detail-panel bp6-dark">
      <div className="detail-header" style={{ borderTop: `3px solid ${color}` }}>
        <div className="detail-title-row">
          <h2>{app.name}</h2>
          <div className="detail-header-actions">
            <Button
              variant="minimal"
              icon="export"
              aria-label="Export neighborhood as PNG"
              title="Export this neighborhood as a shareable PNG"
              loading={exporting}
              onClick={handleExport}
            />
            <Button variant="minimal" icon="cross" aria-label="Close" onClick={onClose} />
          </div>
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
          {app.available_in_dev && (
            <Tag minimal intent="success" icon="code">
              Dev tier
            </Tag>
          )}
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
        <Button
          intent="primary"
          icon="learning"
          fill
          className="projects-cta"
          onClick={() => setProjectsOpen(true)}
        >
          Practice projects{projects.length > 0 ? ` (${projects.length})` : ''}
        </Button>

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

        {resources.length > 0 && (
          <>
            <Divider />
            {tutorials.length > 0 && (
              <>
                <h4>Foundry tutorials</h4>
                <ul className="resource-list">
                  {tutorials.map((r) => (
                    <li key={r.id}>
                      <a className="resource-link" href={r.url} target="_blank" rel="noreferrer">
                        <Icon icon="learning" size={14} />
                        <span className="resource-title">{r.title}</span>
                        <Icon icon="share" size={11} />
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {videos.length > 0 && (
              <>
                <h4>Videos</h4>
                <div className="resource-videos">
                  {videos.map((r) => {
                    const id = youtubeId(r.url);
                    return (
                      <a
                        key={r.id}
                        className="resource-video"
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        title={r.title}
                      >
                        <span className="resource-thumb">
                          {id ? (
                            <img
                              src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <Icon icon="video" size={20} />
                          )}
                          <span className="resource-play">
                            <Icon icon="play" size={16} />
                          </span>
                        </span>
                        <span className="resource-title">{r.title}</span>
                      </a>
                    );
                  })}
                </div>
              </>
            )}
          </>
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

        {onSuggest && (
          <>
            <Divider />
            <Button
              variant="minimal"
              icon="lightbulb"
              className="suggest-link"
              fill
              onClick={onSuggest}
            >
              Suggest a correction or link
            </Button>
          </>
        )}
      </div>

      <ProjectsDialog
        isOpen={projectsOpen}
        appName={app.name}
        projects={projects}
        onClose={() => setProjectsOpen(false)}
      />
    </aside>
  );
}
