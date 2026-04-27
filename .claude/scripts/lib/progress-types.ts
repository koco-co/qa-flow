/**
 * progress-types.ts — Shared types for the unified progress engine.
 *
 * See spec: docs/architecture/progress-engine.md (TBD: written in P9)
 */

export const SCHEMA_VERSION = 1 as const;

/** Maximum size for inline artifact values before spilling to blocks/. */
export const BLOB_OVERFLOW_THRESHOLD_BYTES = 64 * 1024;

/** Lock acquisition retry configuration. */
export const LOCK_TIMEOUT_MS = 5_000;
export const LOCK_RETRY_BASE_MS = 50;
export const LOCK_RETRY_JITTER_MS = 50;
export const STALE_LOCK_MAX_AGE_MS = 10 * 60 * 1000;

export type TaskStatus =
  | "pending"
  | "running"
  | "done"
  | "blocked"
  | "failed"
  | "skipped";

export const TASK_STATUSES: readonly TaskStatus[] = [
  "pending",
  "running",
  "done",
  "blocked",
  "failed",
  "skipped",
] as const;

/** Statuses that satisfy a `depends_on` prerequisite. */
export const DEPENDENCY_SATISFIED_STATUSES: readonly TaskStatus[] = [
  "done",
  "skipped",
] as const;

/** Parent statuses that make children visible in task-query. */
export const PARENT_VISIBLE_STATUSES: readonly TaskStatus[] = [
  "running",
  "done",
] as const;

export interface ErrorEntry {
  readonly at: string;
  readonly message: string;
}

export interface Task {
  readonly id: string;
  readonly parent: string | null;
  readonly depends_on: readonly string[];
  readonly order: number;
  readonly name: string;
  readonly kind: string;
  readonly status: TaskStatus;
  readonly reason: string | null;
  readonly attempts: number;
  readonly payload: Record<string, unknown>;
  readonly errors: readonly ErrorEntry[];
  readonly started_at: string | null;
  readonly completed_at: string | null;
}

export interface BlobRef {
  readonly $ref: string;
}

export type ArtifactValue = unknown | BlobRef;

export interface Source {
  readonly type: string;
  readonly path: string;
  readonly mtime: string | null;
}

export interface Session {
  readonly schema_version: typeof SCHEMA_VERSION;
  readonly session_id: string;
  readonly workflow: string;
  readonly project: string;
  readonly env: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly source: Source;
  readonly meta: Record<string, unknown>;
  readonly tasks: readonly Task[];
  readonly artifacts: Record<string, ArtifactValue>;
}

/** Exit codes used by progress CLI. Keep in sync with spec. */
export const ExitCode = {
  SUCCESS: 0,
  ARG_ERROR: 1,
  NOT_FOUND: 2,
  LOCK_TIMEOUT: 3,
  DEPENDENCY_UNSATISFIED: 4,
  ROLLUP_INCOMPLETE: 5,
} as const;
