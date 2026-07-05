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
  /** Whether the app is available in the Foundry Developer (dev) tier. */
  available_in_dev: boolean;
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

/** A self-learning "practice project" attached to an application. */
export interface AppProject {
  /** Stable row id from the API (absent in the bundled snapshot). */
  id?: number;
  app_id: string;
  kind: string;
  title: string;
  context: string;
  instructions: string;
  dataset_url: string | null;
  sort: number;
  /** Multi-project: shared label of an ordered series; null = solo project. */
  track: string | null;
  /** 1-based position within the track (0 when solo). */
  track_step: number;
}

export interface GraphPayload {
  categories: Category[];
  applications: Application[];
  links: AppLink[];
  resources: AppResource[];
  projects: AppProject[];
}

export interface Filters {
  categories: Set<string>;
  tiers: Set<Tier>;
  statuses: Set<Status>;
  coreOnly: boolean;
  devOnly: boolean;
  learningPath: boolean;
}

export type SuggestionKind = 'new_link' | 'correction' | 'edit_link' | 'feature' | 'resource';
export type SuggestionStatus = 'pending' | 'approved' | 'rejected';

/** A community-submitted correction, new link, or link edit, awaiting moderation. */
export interface Suggestion {
  id: number;
  kind: SuggestionKind;
  status: SuggestionStatus;
  // Correction payload (null for link kinds). Reused by 'resource': field =
  // resource kind, value = title, url = resource URL.
  app_id: string | null;
  field: string | null;
  value: string | null;
  url: string | null;
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
  // Resource suggestion (tutorial / video).
  resource_kind?: ResourceKind;
  title?: string;
  url?: string;
  comment?: string;
  submitter?: string;
}
