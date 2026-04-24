/**
 * progress-store.ts — Bottom-layer read/write + lock for the progress engine.
 *
 * Responsibilities: session CRUD (create/read/write/delete), session ID
 * composition, listing, and file-system-based exclusive locking.
 *
 * See spec: docs/refactor/specs/2026-04-24-unified-progress-engine-design.md
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import {
  LOCK_RETRY_BASE_MS,
  LOCK_RETRY_JITTER_MS,
  LOCK_TIMEOUT_MS,
  SCHEMA_VERSION,
  STALE_LOCK_MAX_AGE_MS,
} from "./progress-types.ts";
import type { Session, Source } from "./progress-types.ts";
import { kataDir, locksDir, sessionsDir } from "./paths.ts";

// ── Internal helpers ─────────────────────────────────────────────────────────

function splitSessionId(id: string): [string, string] {
  const idx = id.indexOf("/");
  if (idx < 0) throw new Error(`invalid session_id: "${id}" (expected "workflow/slug-env")`);
  return [id.slice(0, idx), id.slice(idx + 1)];
}

function sessionFileFor(project: string, sessionId: string): string {
  const [workflow, rest] = splitSessionId(sessionId);
  return join(sessionsDir(project, workflow), `${rest}.json`);
}

function lockFileFor(project: string, sessionId: string): string {
  const safe = sessionId.replaceAll("/", "__");
  return join(locksDir(project), `${safe}.lock`);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Compose a canonical session ID from its constituent parts.
 *
 * Format: `"{workflow}/{slug}-{env}"`
 */
export function sessionIdFor(opts: {
  workflow: string;
  slug: string;
  env: string;
}): string {
  return `${opts.workflow}/${opts.slug}-${opts.env}`;
}

/**
 * Create a new (unsaved) Session object with sensible defaults.
 * Call `writeSession` to persist it.
 */
export function createSession(opts: {
  project: string;
  workflow: string;
  slug: string;
  env: string;
  source: Source;
  meta: Record<string, unknown>;
}): Session {
  const now = new Date().toISOString();
  const session_id = sessionIdFor(opts);
  return {
    schema_version: SCHEMA_VERSION,
    session_id,
    workflow: opts.workflow,
    project: opts.project,
    env: opts.env,
    created_at: now,
    updated_at: now,
    source: opts.source,
    meta: opts.meta,
    tasks: [],
    artifacts: {},
  };
}

/**
 * Read a session from disk. Returns `null` if the file doesn't exist.
 * Throws on parse error.
 */
export function readSession(project: string, sessionId: string): Session | null {
  const path = sessionFileFor(project, sessionId);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Session;
  } catch (err) {
    throw new Error(`Failed to parse session file ${path}: ${err}`);
  }
}

/**
 * Write a session to disk, creating intermediate directories as needed.
 */
export function writeSession(project: string, session: Session): void {
  const path = sessionFileFor(project, session.session_id);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(session, null, 2)}\n`, "utf8");
}

/**
 * Delete a session file. Callers should hold the session lock before deleting
 * (via `withSessionLock`) to avoid races with concurrent readers/writers.
 * Does NOT release any held lock — the lock file lives separately.
 */
export function deleteSession(project: string, sessionId: string): void {
  const path = sessionFileFor(project, sessionId);
  if (existsSync(path)) rmSync(path);
}

/**
 * List all session IDs for a project, optionally filtered by workflow.
 * Returns IDs in `"workflow/slug-env"` format.
 */
export function listSessions(opts: {
  project: string;
  workflow?: string;
}): readonly string[] {
  const root = join(kataDir(opts.project), "sessions");
  if (!existsSync(root)) return [];
  const workflows = opts.workflow ? [opts.workflow] : readdirSync(root);
  const ids: string[] = [];
  for (const wf of workflows) {
    const wfDir = join(root, wf);
    if (!existsSync(wfDir)) continue;
    for (const f of readdirSync(wfDir)) {
      if (f.endsWith(".json")) ids.push(`${wf}/${f.slice(0, -5)}`);
    }
  }
  return ids;
}

// ── File-system lock ─────────────────────────────────────────────────────────

interface LockOpts {
  readonly timeoutMs?: number;
}

function cleanupStaleLock(lockPath: string): void {
  try {
    if (!existsSync(lockPath)) return;
    const st = statSync(lockPath);
    if (Date.now() - st.mtimeMs > STALE_LOCK_MAX_AGE_MS) {
      rmSync(lockPath);
    }
  } catch {
    // Ignore — another process may have already removed it.
  }
}

function tryWriteLock(lockPath: string): boolean {
  try {
    // "wx" — exclusive create; throws EEXIST if file already exists.
    writeFileSync(lockPath, `${process.pid}`, { flag: "wx" });
    return true;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireLock(lockPath: string, timeoutMs: number): Promise<void> {
  mkdirSync(dirname(lockPath), { recursive: true });
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    cleanupStaleLock(lockPath);
    if (tryWriteLock(lockPath)) return;
    const wait = LOCK_RETRY_BASE_MS + Math.random() * LOCK_RETRY_JITTER_MS;
    await sleep(wait);
  }
  throw new Error(`progress-store: lock acquisition timeout for ${lockPath}`);
}

function releaseLock(lockPath: string): void {
  try {
    if (existsSync(lockPath)) rmSync(lockPath);
  } catch {
    // Ignore — best-effort cleanup.
  }
}

/**
 * Run `fn` while holding an exclusive file-system lock for the given session.
 * The lock is always released via `finally`, even if `fn` throws.
 *
 * @throws {Error} if the lock cannot be acquired within `timeoutMs`.
 */
export async function withSessionLock<T>(
  project: string,
  sessionId: string,
  fn: () => Promise<T> | T,
  opts: LockOpts = {},
): Promise<T> {
  const lockPath = lockFileFor(project, sessionId);
  try {
    await acquireLock(lockPath, opts.timeoutMs ?? LOCK_TIMEOUT_MS);
  } catch (err) {
    throw new Error(
      `progress-store: failed to acquire lock for session ${sessionId}: ${(err as Error).message}`,
    );
  }
  try {
    return await fn();
  } finally {
    releaseLock(lockPath);
  }
}

// ── Task CRUD ─────────────────────────────────────────────────────────────────

import type { Task, TaskStatus, ErrorEntry } from "./progress-types.ts";

export interface TaskInput {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly order: number;
  readonly parent?: string | null;
  readonly depends_on?: readonly string[];
  readonly payload?: Record<string, unknown>;
}

export interface TaskUpdatePatch {
  readonly status?: TaskStatus;
  readonly reason?: string | null;
  readonly payload?: Record<string, unknown>;
  readonly depends_on?: readonly string[];
  readonly error?: string;
  readonly force?: boolean;
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeTask(input: TaskInput): Task {
  return {
    id: input.id,
    parent: input.parent ?? null,
    depends_on: input.depends_on ?? [],
    order: input.order,
    name: input.name,
    kind: input.kind,
    status: "pending",
    reason: null,
    attempts: 0,
    payload: input.payload ?? {},
    errors: [],
    started_at: null,
    completed_at: null,
  };
}

/**
 * Add a batch of tasks to an existing session. Throws if any id is a duplicate
 * (either within the batch or against existing tasks).
 */
export function addTasks(
  project: string,
  sessionId: string,
  inputs: readonly TaskInput[],
): void {
  const session = readSession(project, sessionId);
  if (!session) throw new Error(`session not found: ${sessionId}`);

  const existingIds = new Set(session.tasks.map((t) => t.id));
  const newIds = new Set<string>();
  for (const inp of inputs) {
    if (existingIds.has(inp.id) || newIds.has(inp.id)) {
      throw new Error(`duplicate task id: ${inp.id}`);
    }
    newIds.add(inp.id);
  }

  const tasks = [...session.tasks, ...inputs.map(makeTask)];
  writeSession(project, { ...session, tasks, updated_at: nowIso() });
}

/**
 * Remove a task by id from an existing session.
 * No-op if the task id does not exist.
 */
export function removeTask(
  project: string,
  sessionId: string,
  taskId: string,
): void {
  const session = readSession(project, sessionId);
  if (!session) throw new Error(`session not found: ${sessionId}`);
  const tasks = session.tasks.filter((t) => t.id !== taskId);
  writeSession(project, { ...session, tasks, updated_at: nowIso() });
}

/**
 * Apply a patch to a single task. Status transitions, error appending, reason,
 * payload merging, and depends_on updates are all supported.
 *
 * - `status=running` increments `attempts` and sets `started_at` (once).
 * - `status=done` sets `completed_at`.
 * - `error` appends an ErrorEntry regardless of status (intentional — enables
 *   forced-start records and diagnostic traces on running tasks).
 * - `payload` is shallow-merged with the existing payload.
 * - `force` is reserved for Task 10 and has no effect here.
 */
export function updateTask(
  project: string,
  sessionId: string,
  taskId: string,
  patch: TaskUpdatePatch,
): void {
  const session = readSession(project, sessionId);
  if (!session) throw new Error(`session not found: ${sessionId}`);
  const idx = session.tasks.findIndex((t) => t.id === taskId);
  if (idx < 0) throw new Error(`task not found: ${taskId}`);

  const current = session.tasks[idx];
  let next: Task = { ...current };

  if (patch.status !== undefined) {
    next = { ...next, status: patch.status };
    if (patch.status === "running") {
      next = {
        ...next,
        attempts: current.attempts + 1,
        started_at: current.started_at ?? nowIso(),
      };
    }
    if (patch.status === "done") {
      next = { ...next, completed_at: nowIso() };
    }
  }

  // error appends regardless of status
  if (patch.error !== undefined) {
    const entry: ErrorEntry = { at: nowIso(), message: patch.error };
    next = { ...next, errors: [...next.errors, entry] };
  }

  if (patch.reason !== undefined) {
    next = { ...next, reason: patch.reason };
  }

  if (patch.payload !== undefined) {
    next = { ...next, payload: { ...current.payload, ...patch.payload } };
  }

  if (patch.depends_on !== undefined) {
    next = { ...next, depends_on: patch.depends_on };
  }

  const tasks = [...session.tasks.slice(0, idx), next, ...session.tasks.slice(idx + 1)];
  writeSession(project, { ...session, tasks, updated_at: nowIso() });
}

// ── Task Query ────────────────────────────────────────────────────────────────

import {
  DEPENDENCY_SATISFIED_STATUSES,
  PARENT_VISIBLE_STATUSES,
} from "./progress-types.ts";

export interface QueryOpts {
  readonly status?: readonly TaskStatus[];
  readonly kind?: string;
  readonly parent?: string | null;
  readonly includeAll?: boolean;
  readonly includeBlocked?: boolean;
}

export interface QueryResult {
  readonly task: Task;
  readonly blocked_by?: readonly string[];
}

function parentStatusOf(
  tasks: readonly Task[],
  parentId: string | null,
): TaskStatus | null {
  if (parentId === null) return null;
  const p = tasks.find((t) => t.id === parentId);
  return p ? p.status : null;
}

function computeBlockedBy(task: Task, tasks: readonly Task[]): string[] {
  const reasons: string[] = [];

  const unsatisfiedDeps = task.depends_on.filter((depId) => {
    const dep = tasks.find((t) => t.id === depId);
    if (!dep) return true;
    return !DEPENDENCY_SATISFIED_STATUSES.includes(dep.status);
  });
  if (unsatisfiedDeps.length) {
    reasons.push(...unsatisfiedDeps.map((id) => `dep:${id}`));
  }

  if (task.parent) {
    const ps = parentStatusOf(tasks, task.parent);
    if (ps && !PARENT_VISIBLE_STATUSES.includes(ps)) {
      reasons.push(`parent:${task.parent}(${ps})`);
    }
  }

  return reasons;
}

export function queryTasks(
  project: string,
  sessionId: string,
  opts: QueryOpts,
): readonly QueryResult[] {
  const session = readSession(project, sessionId);
  if (!session) throw new Error(`session not found: ${sessionId}`);

  const filtered = session.tasks.filter((t) => {
    if (opts.status && !opts.status.includes(t.status)) return false;
    if (opts.kind !== undefined && t.kind !== opts.kind) return false;
    if (opts.parent !== undefined && t.parent !== opts.parent) return false;
    return true;
  });

  if (opts.includeAll) {
    return filtered.map((task) => ({ task }));
  }

  if (opts.includeBlocked) {
    return filtered
      .map((task) => ({ task, blocked_by: computeBlockedBy(task, session.tasks) }))
      .filter((r) => r.blocked_by!.length > 0);
  }

  // Default: only executable tasks (empty blocked_by).
  return filtered
    .filter((task) => computeBlockedBy(task, session.tasks).length === 0)
    .map((task) => ({ task }));
}

/**
 * Check whether a task's dependencies are satisfied. Used by CLI guard
 * on `task-update --status running`.
 */
export function isExecutable(
  project: string,
  sessionId: string,
  taskId: string,
): { ok: boolean; blocked_by: readonly string[] } {
  const session = readSession(project, sessionId);
  if (!session) throw new Error(`session not found: ${sessionId}`);
  const task = session.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`task not found: ${taskId}`);
  const blocked_by = computeBlockedBy(task, session.tasks);
  return { ok: blocked_by.length === 0, blocked_by };
}
