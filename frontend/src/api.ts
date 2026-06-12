import type { Application, GraphPayload } from './types';

/** Fetch the full graph (categories, applications, links) from the backend. */
export async function fetchGraph(): Promise<GraphPayload> {
  const res = await fetch('/api/graph');
  if (!res.ok) throw new Error(`Failed to load graph (${res.status})`);
  return res.json();
}

/** Verify an admin token. Returns true if the backend accepts it. */
export async function checkAdminToken(token: string): Promise<boolean> {
  const res = await fetch('/api/admin/check', {
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
  const res = await fetch(`/api/applications/${encodeURIComponent(app.id)}`, {
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
  const res = await fetch('/api/applications', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ id: app.id, ...editableFields(app) }),
  });
  return readOrThrow(res, 'Create failed');
}

/** Delete an application (and any links touching it). Requires a valid admin token. */
export async function deleteApplication(id: string, token: string): Promise<void> {
  const res = await fetch(`/api/applications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Delete failed (${res.status})`);
  }
}
