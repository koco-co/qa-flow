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
