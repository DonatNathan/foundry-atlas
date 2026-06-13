// Renders clean, shareable PNG "cards" entirely on an offscreen canvas — no
// extra dependencies, no screenshotting of the live DOM. Two card types:
//   - a single app's *neighborhood* ("how X connects to everything")
//   - a *learning path* (the ordered guided route)
// Both share the dark Atlas theme so the images read as part of the product.
import type { Application } from './types';

// Logical card size (Open Graph 1.91:1). Drawn at 2x for crisp output.
const W = 1200;
const H = 630;
const SCALE = 2;

const BG = '#10141A';
const TEXT = '#F6F7F9';
const MUTED = '#ABB3BF';
const FAINT = '#5F6B7C';
const PANEL_BORDER = '#2F343C';
const GREEN = '#3DCC91';
const BLUE = '#4C90F0';
const RED = '#FF7373';
const FONT = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export interface CardConnection {
  app: Application;
  verb: string;
  color: string;
}

export interface NeighborhoodCard {
  app: Application;
  color: string;
  categoryName: string;
  connections: CardConnection[];
}

export interface PathStep {
  app: Application;
  color: string;
}

// ---------- low-level canvas helpers ----------

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else {
      line = next;
    }
  }
  if (lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines) lines[maxLines - 1] = truncate(ctx, lines[maxLines - 1], maxWidth);
  return lines.filter(Boolean);
}

// A colored pill (tag). Returns the x where the next pill should start.
function pill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
  withDot: boolean,
): number {
  const h = 30;
  ctx.font = `600 14px ${FONT}`;
  const padX = 13;
  const dotW = withDot ? 16 : 0;
  const w = ctx.measureText(text).width + padX * 2 + dotW;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = `${color}22`;
  ctx.fill();
  let tx = x + padX;
  if (withDot) {
    ctx.beginPath();
    ctx.arc(tx + 4, y + h / 2, 4.5, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    tx += dotW;
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, tx, y + h / 2 + 0.5);
  return x + w + 8;
}

function tierColor(tier: Application['tier']): string {
  return tier === 'beginner' ? GREEN : tier === 'intermediate' ? BLUE : '#FBD065';
}
function tierLabel(tier: Application['tier']): string {
  return tier[0].toUpperCase() + tier.slice(1);
}

function background(ctx: CanvasRenderingContext2D, glow: string): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  // Subtle branded glow so the card doesn't read as a flat rectangle.
  const g = ctx.createRadialGradient(W * 0.72, H * 0.42, 40, W * 0.72, H * 0.42, 520);
  g.addColorStop(0, `${glow}1f`);
  g.addColorStop(1, `${glow}00`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function footer(ctx: CanvasRenderingContext2D): void {
  const y = H - 42;
  ctx.strokeStyle = PANEL_BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(48, y - 16);
  ctx.lineTo(W - 48, y - 16);
  ctx.stroke();

  // Hexagon wordmark.
  const hx = 56;
  const hy = y + 2;
  const r = 9;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const px = hx + r * Math.cos(a);
    const py = hy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = `700 16px ${FONT}`;
  ctx.fillStyle = TEXT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Foundry Atlas', hx + 18, hy + 1);

  ctx.font = `400 14px ${FONT}`;
  ctx.fillStyle = FAINT;
  ctx.textAlign = 'right';
  const host = typeof window !== 'undefined' ? window.location.host : '';
  ctx.fillText(host || 'an interactive map of Palantir Foundry', W - 48, hy + 1);
}

// ---------- card composition ----------

function drawHeaderColumn(
  ctx: CanvasRenderingContext2D,
  card: NeighborhoodCard,
  colW: number,
): void {
  const x = 56;
  let y = 70;

  // Eyebrow.
  ctx.font = `600 13px ${FONT}`;
  ctx.fillStyle = FAINT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('NEIGHBORHOOD', x, y);
  y += 26;

  // App name (up to two lines).
  ctx.font = `800 40px ${FONT}`;
  ctx.fillStyle = TEXT;
  const nameLines = wrap(ctx, card.app.name, colW, 2);
  ctx.textBaseline = 'top';
  for (const line of nameLines) {
    ctx.fillText(line, x, y);
    y += 46;
  }
  y += 4;

  // Accent underline in the category color.
  roundRect(ctx, x, y, 64, 4, 2);
  ctx.fillStyle = card.color;
  ctx.fill();
  y += 22;

  // Tags.
  let px = pill(ctx, x, y, card.categoryName, card.color, true);
  px = pill(ctx, px, y, tierLabel(card.app.tier), tierColor(card.app.tier), false);
  if (px > x + colW - 90 && card.app.is_core) {
    y += 38;
    px = x;
  }
  if (card.app.is_core) px = pill(ctx, px, y, 'Core', GREEN, false);
  if (card.app.status === 'new') pill(ctx, px, y, 'Newer', BLUE, false);
  if (card.app.status === 'legacy') pill(ctx, px, y, 'Legacy', RED, false);
  y += 50;

  // Description.
  ctx.font = `400 16px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.textBaseline = 'top';
  for (const line of wrap(ctx, card.app.description, colW, 4)) {
    ctx.fillText(line, x, y);
    y += 24;
  }
  y += 14;

  // Connection count stat.
  const n = card.connections.length;
  ctx.font = `800 34px ${FONT}`;
  ctx.fillStyle = card.color;
  ctx.fillText(String(n), x, y);
  const numW = ctx.measureText(String(n)).width;
  ctx.font = `500 16px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`connection${n === 1 ? '' : 's'} across the Atlas`, x + numW + 10, y + 27);
}

function drawNeighborhood(
  ctx: CanvasRenderingContext2D,
  card: NeighborhoodCard,
  cx: number,
  cy: number,
): void {
  const MAX = 16;
  const shown = card.connections.slice(0, MAX);
  const overflow = card.connections.length - shown.length;
  const R = 158;
  const focalR = 34;
  const nodeR = 11;

  // Faint orbit ring.
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.strokeStyle = `${PANEL_BORDER}`;
  ctx.setLineDash([3, 5]);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);

  const n = Math.max(shown.length, 1);
  const showVerbs = shown.length > 0 && shown.length <= 7;

  const positions = shown.map((c, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { c, a, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  });

  // Links (behind nodes).
  for (const p of positions) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = `${p.c.color}66`;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    if (showVerbs) {
      const mx = cx + (p.x - cx) * 0.52;
      const my = cy + (p.y - cy) * 0.52;
      let ang = p.a;
      if (Math.cos(p.a) < 0) ang += Math.PI; // keep text upright
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(ang);
      ctx.font = `600 10px ${FONT}`;
      ctx.fillStyle = FAINT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(p.c.verb.toUpperCase(), 0, -4);
      ctx.restore();
    }
  }

  // Neighbor nodes + labels.
  for (const p of positions) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, nodeR, 0, 2 * Math.PI);
    ctx.fillStyle = p.c.color;
    ctx.fill();
    ctx.strokeStyle = BG;
    ctx.lineWidth = 2;
    ctx.stroke();

    const cos = Math.cos(p.a);
    const sin = Math.sin(p.a);
    const lx = p.x + cos * (nodeR + 8);
    const ly = p.y + sin * (nodeR + 8);
    ctx.font = `500 14px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.textAlign = cos > 0.25 ? 'left' : cos < -0.25 ? 'right' : 'center';
    ctx.textBaseline = sin > 0.25 ? 'top' : sin < -0.25 ? 'bottom' : 'middle';
    ctx.fillText(truncate(ctx, p.c.app.name, 150), lx, ly);
  }

  // Focal node with glow.
  ctx.save();
  ctx.shadowColor = card.color;
  ctx.shadowBlur = 28;
  ctx.beginPath();
  ctx.arc(cx, cy, focalR, 0, 2 * Math.PI);
  ctx.fillStyle = card.color;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, focalR + 4, 0, 2 * Math.PI);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Focal label pill beneath the node so the diagram stands alone.
  ctx.font = `700 15px ${FONT}`;
  const label = truncate(ctx, card.app.name, 220);
  const lw = ctx.measureText(label).width + 22;
  const ly = cy + focalR + 14;
  roundRect(ctx, cx - lw / 2, ly, lw, 26, 13);
  ctx.fillStyle = '#1C2127';
  ctx.fill();
  ctx.strokeStyle = PANEL_BORDER;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = TEXT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, ly + 14);

  if (overflow > 0) {
    ctx.font = `500 13px ${FONT}`;
    ctx.fillStyle = FAINT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`+${overflow} more connection${overflow === 1 ? '' : 's'}`, cx, cy + R + 26);
  }
}

function newCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);
  return { canvas, ctx };
}

function download(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}

// Ensure the web font is ready so canvas text isn't drawn in a fallback face.
async function fontsReady(): Promise<void> {
  try {
    await document.fonts?.ready;
  } catch {
    /* fonts API unavailable — fall back to system fonts */
  }
}

/** Export a single app's neighborhood as a shareable PNG. */
export async function exportNeighborhoodCard(card: NeighborhoodCard): Promise<void> {
  await fontsReady();
  const { canvas, ctx } = newCanvas();
  background(ctx, card.color);
  const colW = 430;
  drawHeaderColumn(ctx, card, colW);
  // Diagram occupies the right of the card.
  const diagLeft = 56 + colW + 40;
  const cx = (diagLeft + (W - 56)) / 2;
  drawNeighborhood(ctx, card, cx, 300);
  footer(ctx);
  await download(canvas, `foundry-atlas-${card.app.id}-neighborhood.png`);
}

/** Export the ordered learning path as a shareable PNG. */
export async function exportLearningPathCard(steps: PathStep[]): Promise<void> {
  await fontsReady();
  const { canvas, ctx } = newCanvas();
  background(ctx, GREEN);

  const x = 56;
  let y = 70;
  ctx.font = `600 13px ${FONT}`;
  ctx.fillStyle = FAINT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('GUIDED ROUTE', x, y);
  y += 30;
  ctx.font = `800 40px ${FONT}`;
  ctx.fillStyle = TEXT;
  ctx.fillText('Learning Path', x, y);
  y += 22;
  ctx.font = `400 16px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(`${steps.length} steps through Foundry, in order`, x, y);

  // Lay steps out in up to two columns within the body area.
  const top = 180;
  const bottom = H - 80;
  const perCol = Math.ceil(steps.length / (steps.length > 8 ? 2 : 1));
  const colW = 540;
  const rowH = Math.min(56, (bottom - top) / perCol);

  ctx.textBaseline = 'middle';
  steps.forEach((step, i) => {
    const col = Math.floor(i / perCol);
    const row = i % perCol;
    const sx = 56 + col * colW;
    const sy = top + row * rowH + rowH / 2;

    // Connector line to the previous step in the same column.
    if (row > 0) {
      ctx.beginPath();
      ctx.moveTo(sx + 17, sy - rowH + 17);
      ctx.lineTo(sx + 17, sy - 17);
      ctx.strokeStyle = PANEL_BORDER;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Step badge.
    ctx.beginPath();
    ctx.arc(sx + 17, sy, 17, 0, 2 * Math.PI);
    ctx.fillStyle = step.color;
    ctx.fill();
    ctx.font = `700 15px ${FONT}`;
    ctx.fillStyle = '#10141A';
    ctx.textAlign = 'center';
    ctx.fillText(String(step.app.learning_order ?? i + 1), sx + 17, sy + 1);

    // App name + tier.
    ctx.font = `600 18px ${FONT}`;
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'left';
    ctx.fillText(truncate(ctx, step.app.name, colW - 150), sx + 46, sy - 8);
    ctx.font = `400 13px ${FONT}`;
    ctx.fillStyle = FAINT;
    ctx.fillText(tierLabel(step.app.tier), sx + 46, sy + 11);
  });

  footer(ctx);
  await download(canvas, 'foundry-atlas-learning-path.png');
}
