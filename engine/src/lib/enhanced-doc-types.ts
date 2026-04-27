export type EnhancedStatus =
  | "discussing"
  | "pending-review"
  | "ready"
  | "analyzing"
  | "writing"
  | "completed";

export type ReentryFrom = "analyzing" | "writing" | null;

export type SourceReference = "full" | "none";

export interface RepoConsent {
  repos: Array<{ path: string; branch: string; sha?: string }>;
  granted_at: string;
}

export interface EnhancedFrontmatter {
  schema_version: 1;
  status: EnhancedStatus;
  project: string;
  prd_slug: string;
  prd_dir: string;
  pending_count: number;
  resolved_count: number;
  defaulted_count: number;
  handoff_mode: "current" | "new" | null;
  reentry_from: ReentryFrom;
  source_consent: RepoConsent | null;
  source_reference: SourceReference;
  migrated_from_plan: boolean;
  q_counter: number;
  created_at: string;
  updated_at: string;
  strategy_id: string;
  knowledge_dropped: string[];
}

export type PendingSeverity = "blocking_unknown" | "defaultable_unknown" | "pending_for_pm";
export type PendingStatus = "待确认" | "已解决" | "默认采用";

export interface PendingItem {
  id: string;                       // "Q1", "Q2", ...
  location_anchor: string;          // "s-2-1-i9j0"
  location_label: string;           // "§2.1 功能块 1 → format 字段"
  question: string;
  status: PendingStatus;
  recommended: string;
  expected: string;                 // 新增
  answer: string | null;            // resolve 时填入
  severity: PendingSeverity;
  resolved_at: string | null;
}

export interface SourceFacts {
  fields: Array<{ name: string; type: string; path: string; note: string }>;
  routes: Array<{ method: string; path: string; handler: string }>;
  state_enums: Array<{ name: string; values: string[]; file: string }>;
  permissions: Array<{ code: string; scope: string; file: string }>;
  api_signatures: Array<{ name: string; signature: string; file: string }>;
}

export interface SectionContent {
  anchor: string;                   // "s-1-1-a1b2"
  title: string;
  body: string;                     // markdown body, excluding heading line
}

export interface EnhancedDoc {
  frontmatter: EnhancedFrontmatter;
  overview: SectionContent[];        // §1.x
  functional: SectionContent[];      // §2.x
  images_summary: string;            // §3 正文（无子节）
  pending: PendingItem[];            // §4 所有 Q（含 resolved）
  source_facts: SourceFacts | null;  // Appendix A（已 deref）
  source_facts_ref: string | null;   // 若外溢则存 $ref 路径
}

export const ANCHOR_REGEX = /^s-\d+(-\d+-[0-9a-f]{4})?$/;
export const SOURCE_FACTS_ANCHOR = "source-facts";
export const Q_ANCHOR_REGEX = /^q\d+$/;
export const SOURCE_FACTS_BLOB_THRESHOLD = 64 * 1024;  // 64KB
