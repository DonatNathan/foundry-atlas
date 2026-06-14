import { Icon } from '@blueprintjs/core';
import GraphView from './GraphView';
import DetailPanel from './DetailPanel';
import type { Application, Filters } from '../types';

interface EmbedFrameProps {
  apps: Application[];
  selectedId: string | null;
  selectedApp: Application | null;
  filters: Filters;
  backHref: string;
  onSelect: (id: string | null) => void;
}

// The chrome-free map shown inside an `?embed=map` iframe: the live graph, an
// optional detail panel on click, and a persistent badge linking back to the
// full app so every embed drives traffic home.
export default function EmbedFrame({
  apps,
  selectedId,
  selectedApp,
  filters,
  backHref,
  onSelect,
}: EmbedFrameProps) {
  return (
    <div className="embed-root bp6-dark">
      <GraphView
        apps={apps}
        selectedId={selectedId}
        learningPathMode={filters.learningPath}
        onSelect={onSelect}
      />
      {selectedApp && (
        <DetailPanel
          app={selectedApp}
          filters={filters}
          onSelect={onSelect}
          onClose={() => onSelect(null)}
        />
      )}
      <a className="embed-badge" href={backHref} target="_blank" rel="noopener noreferrer">
        <span className="embed-badge-mark" aria-hidden />
        <span>Foundry Atlas</span>
        <Icon icon="share" size={11} />
      </a>
    </div>
  );
}
