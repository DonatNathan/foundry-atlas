import { createContext, useContext } from 'react';
import type { Application, AppLink, AppResource, Category } from './types';

export interface DataContextValue {
  /** Live applications (from the API, falling back to the bundled snapshot). */
  apps: Application[];
  appById: Map<string, Application>;
  /** Apps with a learning_order, in ascending order. */
  learningPath: Application[];
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
  resources: AppResource[];
  /** Learning resources for an application, in display order. */
  resourcesOf: (appId: string) => AppResource[];
}

export const DataContext = createContext<DataContextValue | null>(null);

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
