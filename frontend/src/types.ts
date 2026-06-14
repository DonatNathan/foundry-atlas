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

export type ResourceKind = 'tutorial' | 'video';

/** A learning resource attached to an application (Foundry tutorial or video). */
export interface AppResource {
  /** Stable row id from the API (absent in the bundled snapshot). */
  id?: number;
  app_id: string;
  kind: ResourceKind;
  title: string;
  url: string;
  sort: number;
}

export interface GraphPayload {
  categories: Category[];
  applications: Application[];
  links: AppLink[];
  resources: AppResource[];
}

export interface Filters {
  categories: Set<string>;
  tiers: Set<Tier>;
  statuses: Set<Status>;
  coreOnly: boolean;
  learningPath: boolean;
}

export type SuggestionKind = 'new_link' | 'correction' | 'edit_link';
export type SuggestionStatus = 'pending' | 'approved' | 'rejected';

/** A community-submitted correction, new link, or link edit, awaiting moderation. */
export interface Suggestion {
  id: number;
  kind: SuggestionKind;
  status: SuggestionStatus;
  // Correction payload (null for link kinds).
  app_id: string | null;
  field: string | null;
  value: string | null;
  // Link payload: link_id is set for edit_link; source/target for new_link.
  link_id: number | null;
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
  link_id?: number;
  source_id?: string;
  target_id?: string;
  relationship?: Relationship;
  link_description?: string;
  comment?: string;
  submitter?: string;
}
