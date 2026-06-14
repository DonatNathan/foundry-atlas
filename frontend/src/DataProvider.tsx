import { useMemo, type ReactNode } from 'react';
import type { Application, AppLink, AppResource, Category } from './types';
import { DataContext, type DataContextValue } from './DataContext';

const FALLBACK_COLOR = '#8F99A8';

export function DataProvider({
  categories,
  links,
  resources,
  children,
}: {
  categories: Category[];
  links: AppLink[];
  resources: AppResource[];
  children: ReactNode;
}) {
  const value = useMemo<DataContextValue>(() => {
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

    return {
      categories,
      categoryById,
      colorOfCategory,
      colorOf: (app: Application) => colorOfCategory(app.category_id),
      links,
      neighbors,
      degreeOf: (id: string) => neighbors.get(id)?.size ?? 0,
      resources,
      resourcesOf: (appId: string) => resourcesByApp.get(appId) ?? [],
    };
  }, [categories, links, resources]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
