import { createContext, useContext } from 'react';
import type { Application, AppLink, Category } from './types';

export interface DataContextValue {
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

export const DataContext = createContext<DataContextValue | null>(null);

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
