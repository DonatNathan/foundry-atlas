import type {
  Application,
  AppLink,
  AppResource,
  Category,
  GraphPayload,
  Suggestion,
  SuggestionInput,
  SuggestionStatus,
} from './types';

// Where the API lives. Empty in dev (the Vite proxy forwards /api to the local
// server); set VITE_API_BASE to the API origin in production, e.g.
// https://api.yourdomain.com
const API_BASE = import.meta.env.VITE_API_BASE ?? '';
const url = (path: string) => `${API_BASE}${path}`;

/** Fetch the full graph (categories, applications, links) from the backend. */
export async function fetchGraph(): Promise<GraphPayload> {
  const res = await fetch(url('/api/graph'));
  if (!res.ok) throw new Error(`Failed to load graph (${res.status})`);
  return res.json();
}

/** Verify an admin token. Returns true if the backend accepts it. */
export async function checkAdminToken(token: string): Promise<boolean> {
  const res = await fetch(url('/api/admin/check'), {
    headers: { authorization: `Bearer ${token}` },
  });
  return res.ok;
}

const editableFields = (app: Application) => ({
  name: app.name,
  category_id: app.category_id,
  description: app.description,
  use_case: app.use_case,
  tier: app.tier,
  is_core: app.is_core,
  available_in_dev: app.available_in_dev,
  learning_order: app.learning_order,
  status: app.status,
  era: app.era,
  docs_url: app.docs_url,
  tips: app.tips,
});

async function readOrThrow(res: Response, fallback: string): Promise<Application> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `${fallback} (${res.status})`);
  }
  return res.json();
}

/** Persist an edited application. Requires a valid admin token. */
export async function updateApplication(
  app: Application,
  token: string
): Promise<Application> {
  const res = await fetch(url(`/api/applications/${encodeURIComponent(app.id)}`), {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(editableFields(app)),
  });
  return readOrThrow(res, 'Save failed');
}

/** Create a new application. Requires a valid admin token. */
export async function createApplication(
  app: Application,
  token: string
): Promise<Application> {
  const res = await fetch(url('/api/applications'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ id: app.id, ...editableFields(app) }),
  });
  return readOrThrow(res, 'Create failed');
}

/** Delete an application (and any links touching it). Requires a valid admin token. */
export async function deleteApplication(id: string, token: string): Promise<void> {
  const res = await fetch(url(`/api/applications/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Delete failed (${res.status})`);
  }
}

async function readCategory(res: Response, fallback: string): Promise<Category> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `${fallback} (${res.status})`);
  }
  return res.json();
}

/** Create a new category. Requires a valid admin token. */
export async function createCategory(category: Category, token: string): Promise<Category> {
  const res = await fetch(url('/api/categories'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(category),
  });
  return readCategory(res, 'Create failed');
}

/** Update a category. Requires a valid admin token. */
export async function updateCategory(category: Category, token: string): Promise<Category> {
  const res = await fetch(url(`/api/categories/${encodeURIComponent(category.id)}`), {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: category.name, color: category.color, sort: category.sort }),
  });
  return readCategory(res, 'Save failed');
}

/** Delete a category (must be unused). Requires a valid admin token. */
export async function deleteCategory(id: string, token: string): Promise<void> {
  const res = await fetch(url(`/api/categories/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Delete failed (${res.status})`);
  }
}

const linkBody = (l: AppLink) => ({
  source_id: l.source_id,
  target_id: l.target_id,
  relationship: l.relationship,
  description: l.description,
});

async function readLink(res: Response, fallback: string): Promise<AppLink> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `${fallback} (${res.status})`);
  }
  return res.json();
}

/** Create a new link. Requires a valid admin token. */
export async function createLink(link: AppLink, token: string): Promise<AppLink> {
  const res = await fetch(url('/api/links'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(linkBody(link)),
  });
  return readLink(res, 'Create failed');
}

/** Update a link by id. Requires a valid admin token. */
export async function updateLink(link: AppLink, token: string): Promise<AppLink> {
  const res = await fetch(url(`/api/links/${link.id}`), {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(linkBody(link)),
  });
  return readLink(res, 'Save failed');
}

/** Delete a link by id. Requires a valid admin token. */
export async function deleteLink(id: number, token: string): Promise<void> {
  const res = await fetch(url(`/api/links/${id}`), {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Delete failed (${res.status})`);
  }
}

// ---- learning resources ----------------------------------------------------

const resourceBody = (r: AppResource) => ({
  app_id: r.app_id,
  kind: r.kind,
  title: r.title,
  url: r.url,
  sort: r.sort,
});

async function readResource(res: Response, fallback: string): Promise<AppResource> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `${fallback} (${res.status})`);
  }
  return res.json();
}

/** Create a learning resource. Requires a valid admin token. */
export async function createResource(resource: AppResource, token: string): Promise<AppResource> {
  const res = await fetch(url('/api/resources'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(resourceBody(resource)),
  });
  return readResource(res, 'Create failed');
}

/** Update a learning resource by id. Requires a valid admin token. */
export async function updateResource(resource: AppResource, token: string): Promise<AppResource> {
  const res = await fetch(url(`/api/resources/${resource.id}`), {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(resourceBody(resource)),
  });
  return readResource(res, 'Save failed');
}

/** Delete a learning resource by id. Requires a valid admin token. */
export async function deleteResource(id: number, token: string): Promise<void> {
  const res = await fetch(url(`/api/resources/${id}`), {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Delete failed (${res.status})`);
  }
}

// ---- suggestions -----------------------------------------------------------

/** Submit a community suggestion (correction or new link). No token required. */
export async function submitSuggestion(input: SuggestionInput): Promise<Suggestion> {
  const res = await fetch(url('/api/suggestions'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Could not submit suggestion (${res.status})`);
  }
  return res.json();
}

/** Fetch suggestions by status (default: the pending queue). Requires a token. */
export async function fetchSuggestions(
  token: string,
  status: SuggestionStatus = 'pending'
): Promise<Suggestion[]> {
  const res = await fetch(url(`/api/suggestions?status=${status}`), {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to load suggestions (${res.status})`);
  return res.json();
}

/** Approve a suggestion (applies the change). Requires a valid admin token. */
export async function approveSuggestion(id: number, token: string): Promise<void> {
  const res = await fetch(url(`/api/suggestions/${id}/approve`), {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Approve failed (${res.status})`);
  }
}

/** Reject a suggestion. Requires a valid admin token. */
export async function rejectSuggestion(id: number, token: string): Promise<void> {
  const res = await fetch(url(`/api/suggestions/${id}/reject`), {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Reject failed (${res.status})`);
  }
}
