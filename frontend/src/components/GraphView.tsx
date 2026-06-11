import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from 'react-force-graph-2d';
import type { Application, AppLink, Relationship } from '../types';
import { colorOf, degreeOf, neighbors, RELATIONSHIP_VERBS } from '../data';

interface NodeExtra {
  app: Application;
  color: string;
  radius: number;
}
interface LinkExtra {
  rel: Relationship;
  desc: string | null;
}
type GNode = NodeObject<NodeExtra>;
type GLink = LinkObject<NodeExtra, LinkExtra>;

interface GraphViewProps {
  apps: Application[];
  links: AppLink[];
  selectedId: string | null;
  learningPathMode: boolean;
  onSelect: (id: string | null) => void;
}

const BG = '#10141A';
const DIM_ALPHA = 0.12;
const LINK_BASE = 'rgba(95, 107, 124, 0.25)';

const linkEnd = (end: GLink['source']): string =>
  typeof end === 'object' && end !== null ? String(end.id) : String(end);

export default function GraphView({
  apps,
  links,
  selectedId,
  learningPathMode,
  onSelect,
}: GraphViewProps) {
  const fgRef = useRef<ForceGraphMethods<GNode, GLink> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [hoverId, setHoverId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setSize({ w: el.clientWidth, h: el.clientHeight })
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Rebuild node/link objects only when the filtered set changes, so the
  // simulation keeps its positions across hover/selection re-renders.
  const graphData = useMemo(() => {
    const present = new Set(apps.map((a) => a.id));
    const nodes: GNode[] = apps.map((app) => ({
      id: app.id,
      app,
      color: colorOf(app),
      radius: 4 + Math.sqrt(degreeOf(app.id)) * 2.1,
    }));
    const visibleLinks: GLink[] = links
      .filter((l) => present.has(l.source_id) && present.has(l.target_id))
      .map((l) => ({
        source: l.source_id,
        target: l.target_id,
        rel: l.relationship,
        desc: l.description,
      }));
    return { nodes, links: visibleLinks };
  }, [apps, links]);

  // Tune forces for an airy, Obsidian-like layout.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force('charge')?.strength(-260);
    fg.d3Force('link')?.distance(72);
    fg.d3ReheatSimulation();
  }, [graphData]);

  // Pan to the selected node (e.g. picked from search or the learning path).
  useEffect(() => {
    if (!selectedId) return;
    const node = graphData.nodes.find((n) => n.id === selectedId);
    if (node && node.x != null && node.y != null) {
      fgRef.current?.centerAt(node.x, node.y, 600);
    }
  }, [selectedId, graphData]);

  const zoomToFit = useCallback(() => fgRef.current?.zoomToFit(500, 70), []);
  useEffect(() => {
    const t = setTimeout(zoomToFit, 600);
    return () => clearTimeout(t);
  }, [graphData, zoomToFit]);

  // The id whose neighborhood is highlighted (hover wins over selection).
  const focusId = hoverId ?? selectedId;
  const focusSet = useMemo(() => {
    if (!focusId) return null;
    const set = new Set<string>([focusId]);
    for (const n of neighbors.get(focusId) ?? []) set.add(n);
    return set;
  }, [focusId]);

  const nodeAlpha = useCallback(
    (id: string, app: Application): number => {
      if (focusSet) return focusSet.has(id) ? 1 : DIM_ALPHA;
      if (learningPathMode) return app.learning_order != null ? 1 : DIM_ALPHA;
      return 1;
    },
    [focusSet, learningPathMode]
  );

  const paintNode = useCallback(
    (node: GNode, ctx: CanvasRenderingContext2D, scale: number) => {
      const { app, color, radius } = node;
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const id = String(node.id);
      const alpha = nodeAlpha(id, app);
      const isFocus = id === focusId;
      const legacy = app.status === 'legacy';

      ctx.save();
      ctx.globalAlpha = alpha;

      // Soft glow behind focused / core nodes
      if (isFocus || (app.is_core && alpha === 1)) {
        ctx.shadowColor = color;
        ctx.shadowBlur = isFocus ? 22 : 10;
      }

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = legacy ? '#3a4149' : color;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Legacy: dashed ring in category color. New: thin bright outer ring.
      if (legacy) {
        ctx.setLineDash([2.5, 2]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x, y, radius + 2, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (app.status === 'new') {
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(x, y, radius + 1.8, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Selection ring
      if (id === selectedId) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(x, y, radius + 3.6, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Learning-path step badge
      if (learningPathMode && app.learning_order != null) {
        const br = 5.5;
        const bx = x + radius * 0.75 + br;
        const by = y - radius * 0.75 - br;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, 2 * Math.PI);
        ctx.fillStyle = '#FBD065';
        ctx.fill();
        ctx.fillStyle = '#1C2127';
        ctx.font = 'bold 7px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(app.learning_order), bx, by + 0.5);
      }

      // Label: fades in with zoom; always visible for the focused node.
      const labelAlpha = isFocus || id === selectedId
        ? 1
        : Math.max(0, Math.min(1, (scale - 0.85) / 0.9));
      if (labelAlpha > 0.02) {
        const fontSize = Math.max(3.4, 11 / scale);
        ctx.font = `${app.is_core ? '600' : '400'} ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.globalAlpha = alpha * labelAlpha;
        ctx.fillStyle = '#C5CBD3';
        ctx.fillText(app.name, x, y + radius + 2.5);
      }
      ctx.restore();
    },
    [focusId, selectedId, learningPathMode, nodeAlpha]
  );

  const paintPointerArea = useCallback(
    (node: GNode, color: string, ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, node.radius + 6, 0, 2 * Math.PI);
      ctx.fill();
    },
    []
  );

  const linkTouchesFocus = useCallback(
    (l: GLink) =>
      focusId != null &&
      (linkEnd(l.source) === focusId || linkEnd(l.target) === focusId),
    [focusId]
  );

  return (
    <div ref={containerRef} className="graph-container">
      <ForceGraph2D<NodeExtra, LinkExtra>
        ref={fgRef}
        width={size.w}
        height={size.h}
        graphData={graphData}
        backgroundColor={BG}
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={paintPointerArea}
        nodeLabel={() => ''}
        onNodeHover={(n) => setHoverId(n ? String(n.id) : null)}
        onNodeClick={(n) => onSelect(String(n.id))}
        onBackgroundClick={() => onSelect(null)}
        linkColor={(l) => {
          if (linkTouchesFocus(l)) return 'rgba(173, 196, 255, 0.85)';
          if (focusSet || learningPathMode) return 'rgba(95, 107, 124, 0.07)';
          return LINK_BASE;
        }}
        linkWidth={(l) => (linkTouchesFocus(l) ? 1.6 : 0.7)}
        linkDirectionalArrowLength={(l) => (linkTouchesFocus(l) ? 4 : 0)}
        linkDirectionalArrowRelPos={0.92}
        linkDirectionalParticles={(l) => (linkTouchesFocus(l) ? 2 : 0)}
        linkDirectionalParticleWidth={2.2}
        linkDirectionalParticleSpeed={0.006}
        linkLabel={(l) => {
          const s = linkEnd(l.source);
          const t = linkEnd(l.target);
          const verb = RELATIONSHIP_VERBS[l.rel].out.toLowerCase();
          return `<div class="link-tooltip"><b>${s}</b> ${verb} <b>${t}</b>${
            l.desc ? `<br/><span>${l.desc}</span>` : ''
          }</div>`;
        }}
        cooldownTicks={120}
        warmupTicks={40}
      />
      <button className="fit-button bp6-button bp6-small" onClick={zoomToFit} title="Zoom to fit">
        ⤢ Fit
      </button>
    </div>
  );
}
