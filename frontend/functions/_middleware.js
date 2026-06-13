// Cloudflare Pages Function — runs at the edge on every request.
//
// Social-link unfurlers (Slack, X, Discord, iMessage, Facebook) don't execute
// JavaScript, so they only see the static index.html. This middleware rewrites
// the page's title and Open Graph / Twitter meta tags based on the shared URL
// (`?app=<id>`), giving each permalink a rich, app-specific preview card.
//
// The catalog is bundled at build time from the same snapshot the app ships with.
import graph from '../src/data/graph.json';

const appById = new Map(graph.applications.map((a) => [a.id, a]));

const SITE = 'Foundry Atlas';
const DEFAULT_TITLE = 'Foundry Atlas — Palantir Foundry Application Map';
const DEFAULT_DESCRIPTION =
  'An interactive map of Palantir Foundry applications and how they interconnect.';

function clamp(text, max = 200) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

class SetAttribute {
  constructor(value, attr = 'content') {
    this.value = value;
    this.attr = attr;
  }
  element(el) {
    el.setAttribute(this.attr, this.value);
  }
}

class SetText {
  constructor(value) {
    this.value = value;
  }
  element(el) {
    el.setInnerContent(this.value);
  }
}

export async function onRequest(context) {
  const response = await context.next();

  // Only rewrite HTML documents; let assets (JS/CSS/images) pass through.
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const url = new URL(context.request.url);
  const app = appById.get(url.searchParams.get('app') || '');

  const title = app ? `${app.name} · ${SITE}` : DEFAULT_TITLE;
  const description = app ? clamp(app.description) : DEFAULT_DESCRIPTION;
  const image = `${url.origin}/og-cover.png`;
  const canonical = url.toString();

  return new HTMLRewriter()
    .on('title', new SetText(title))
    .on('meta[name="description"]', new SetAttribute(description))
    .on('meta[property="og:title"]', new SetAttribute(title))
    .on('meta[property="og:description"]', new SetAttribute(description))
    .on('meta[property="og:url"]', new SetAttribute(canonical))
    .on('meta[property="og:image"]', new SetAttribute(image))
    .on('meta[name="twitter:title"]', new SetAttribute(title))
    .on('meta[name="twitter:description"]', new SetAttribute(description))
    .on('meta[name="twitter:image"]', new SetAttribute(image))
    .transform(response);
}
