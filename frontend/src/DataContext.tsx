import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Application, Category } from './types';

const FALLBACK_COLOR = '#8F99A8';

interface DataContextValue {
  categories: Category[];
  categoryById: Map<string, Category>;
  /** Color for an application, derived from its category. */
  colorOf: (app: Application) => string;
  /** Color for a category id directly. */
  colorOfCategory: (categoryId: string) => string;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({
  categories,
  children,
}: {
  categories: Category[];
  children: ReactNode;
}) {
  const value = useMemo<DataContextValue>(() => {
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const colorOfCategory = (id: string) => categoryById.get(id)?.color ?? FALLBACK_COLOR;
    return {
      categories,
      categoryById,
      colorOfCategory,
      colorOf: (app: Application) => colorOfCategory(app.category_id),
    };
  }, [categories]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
