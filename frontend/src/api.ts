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

/** Persist an edited application. Requires a valid admin token. */
export async function updateApplication(
  app: Application,
  token: string
): Promise<Application> {
  const res = await fetch(`/api/applications/${encodeURIComponent(app.id)}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
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
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Save failed (${res.status})`);
  }
  return res.json();
}
