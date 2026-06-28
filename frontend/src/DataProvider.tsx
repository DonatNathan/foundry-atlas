import { useMemo, type ReactNode } from 'react';
import type { Application, AppLink, AppProject, AppResource, Category } from './types';
import { DataContext, type DataContextValue } from './DataContext';

const FALLBACK_COLOR = '#8F99A8';

export function DataProvider({
  apps,
  categories,
  links,
  resources,
  projects,
  children,
}: {
  apps: Application[];
  categories: Category[];
  links: AppLink[];
  resources: AppResource[];
  projects: AppProject[];
  children: ReactNode;
}) {
  const value = useMemo<DataContextValue>(() => {
    const appById = new Map(apps.map((a) => [a.id, a]));
    const learningPath = apps
      .filter((a) => a.learning_order != null)
      .sort((a, b) => (a.learning_order ?? 0) - (b.learning_order ?? 0));

    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const colorOfCategory = (id: string) => categoryById.get(id)?.color ?? FALLBACK_COLOR;

    const neighbors = new Map<string, Set<string>>();
    const link = (a: string, b: string) => {
      if (!neighbors.has(a)) neighbors.set(a, new Set());
      neighbors.get(a)!.add(b);
    };
    for (const l of links) {
      link(l.source_id, l.target_id);
      link(l.target_id, l.source_id);
    }

    const resourcesByApp = new Map<string, AppResource[]>();
    for (const r of resources) {
      if (!resourcesByApp.has(r.app_id)) resourcesByApp.set(r.app_id, []);
      resourcesByApp.get(r.app_id)!.push(r);
    }
    for (const list of resourcesByApp.values()) list.sort((a, b) => a.sort - b.sort);

    const projectsByApp = new Map<string, AppProject[]>();
    for (const p of projects) {
      if (!projectsByApp.has(p.app_id)) projectsByApp.set(p.app_id, []);
      projectsByApp.get(p.app_id)!.push(p);
    }
    for (const list of projectsByApp.values()) list.sort((a, b) => a.sort - b.sort);

    return {
      apps,
      appById,
      learningPath,
      categories,
      categoryById,
      colorOfCategory,
      colorOf: (app: Application) => colorOfCategory(app.category_id),
      links,
      neighbors,
      degreeOf: (id: string) => neighbors.get(id)?.size ?? 0,
      resources,
      resourcesOf: (appId: string) => resourcesByApp.get(appId) ?? [],
      projects,
      projectsOf: (appId: string) => projectsByApp.get(appId) ?? [],
    };
  }, [apps, categories, links, resources, projects]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
