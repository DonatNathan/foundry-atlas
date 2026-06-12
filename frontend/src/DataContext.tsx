import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Application, AppLink, Category } from './types';

const FALLBACK_COLOR = '#8F99A8';

interface DataContextValue {
  categories: Category[];
  categoryById: Map<string, Category>;
  /** Color for an application, derived from its category. */
  colorOf: (app: Application) => string;
  /** Color for a category id directly. */
  colorOfCategory: (categoryId: string) => string;
  links: AppLink[];
  /** Undirected adjacency: id -> set of neighbor ids. */
  neighbors: Map<string, Set<string>>;
  /** Number of distinct neighbors an application has. */
  degreeOf: (id: string) => number;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({
  categories,
  links,
  children,
}: {
  categories: Category[];
  links: AppLink[];
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

    return {
      categories,
      categoryById,
      colorOfCategory,
      colorOf: (app: Application) => colorOfCategory(app.category_id),
      links,
      neighbors,
      degreeOf: (id: string) => neighbors.get(id)?.size ?? 0,
    };
  }, [categories, links]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
