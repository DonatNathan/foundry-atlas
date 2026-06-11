export type Tier = 'beginner' | 'intermediate' | 'advanced';
export type Status = 'stable' | 'new' | 'legacy';

export type Relationship =
  | 'feeds'
  | 'powers'
  | 'builds-on'
  | 'embeds-in'
  | 'monitors'
  | 'supersedes'
  | 'complements'
  | 'packages'
  | 'governs'
  | 'assists';

export interface Category {
  id: string;
  name: string;
  color: string;
  sort: number;
}

export interface Application {
  id: string;
  name: string;
  category_id: string;
  description: string;
  use_case: string;
  tier: Tier;
  is_core: boolean;
  learning_order: number | null;
  status: Status;
  era: string | null;
  docs_url: string | null;
  tips: string | null;
}

export interface AppLink {
  source_id: string;
  target_id: string;
  relationship: Relationship;
  description: string | null;
}

export interface GraphPayload {
  categories: Category[];
  applications: Application[];
  links: AppLink[];
}

export interface Filters {
  categories: Set<string>;
  tiers: Set<Tier>;
  statuses: Set<Status>;
  coreOnly: boolean;
  learningPath: boolean;
}
