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
  /** Stable row id from the API (absent in the bundled snapshot). */
  id?: number;
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

export type SuggestionKind = 'new_link' | 'correction';
export type SuggestionStatus = 'pending' | 'approved' | 'rejected';

/** A community-submitted correction or new link, awaiting moderation. */
export interface Suggestion {
  id: number;
  kind: SuggestionKind;
  status: SuggestionStatus;
  // Correction payload (null for new_link).
  app_id: string | null;
  field: string | null;
  value: string | null;
  // New-link payload (null for correction).
  source_id: string | null;
  target_id: string | null;
  relationship: Relationship | null;
  link_description: string | null;
  // Common metadata.
  comment: string | null;
  submitter: string | null;
  created_at: string;
  resolved_at: string | null;
}

/** What the public submit form sends to the server. */
export interface SuggestionInput {
  kind: SuggestionKind;
  app_id?: string;
  field?: string;
  value?: string;
  source_id?: string;
  target_id?: string;
  relationship?: Relationship;
  link_description?: string;
  comment?: string;
  submitter?: string;
}
