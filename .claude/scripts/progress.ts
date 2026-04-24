/**
 * progress.ts — unified task progress engine CLI.
 *
 * Replaces kata-state.ts and ui-autotest-progress.ts. See spec:
 *   docs/refactor/specs/2026-04-24-unified-progress-engine-design.md
 */
import { basename } from "node:path";
import { createCli } from "./lib/cli-runner.ts";
import {
  createSession, readSession, writeSession, deleteSession,
  listSessions, resumeSession,
  addTasks, updateTask, removeTask,
  queryTasks, isExecutable, rollupTask,
  withSessionLock,
  setArtifact, getArtifact,
} from "./lib/progress-store.ts";
import type { TaskInput, TaskUpdatePatch } from "./lib/progress-store.ts";
import { ExitCode } from "./lib/progress-types.ts";
import type { TaskStatus } from "./lib/progress-types.ts";
import {
  migrateKataState, migrateUiAutotest, discoverLegacyFiles,
} from "./lib/progress-migrator.ts";

function slugFromPath(p: string): string {
  return basename(p, ".md").replace(/\.[^.]+$/, "");
}

function emit(obj: unknown): void {
  process.stdout.write(`${JSON.stringify(obj, null, 2)}\n`);
}

function fail(subcmd: string, message: string, code: number): never {
  process.stderr.write(`[progress:${subcmd}] ${message}\n`);
  process.exit(code);
}

// ── session-create ──────────────────────────────────────

function runSessionCreate(opts: {
  workflow: string;
  project: string;
  sourceType: string;
  sourcePath: string;
  env?: string;
  meta?: string;
}): void {
  const env = opts.env ?? "default";
  let meta: Record<string, unknown> = {};
  if (opts.meta) {
    try { meta = JSON.parse(opts.meta) as Record<string, unknown>; }
    catch { fail("session-create", `invalid --meta JSON`, ExitCode.ARG_ERROR); }
  }
  const slug = slugFromPath(opts.sourcePath);
  const session = createSession({
    project: opts.project,
    workflow: opts.workflow,
    slug, env,
    source: { type: opts.sourceType, path: opts.sourcePath, mtime: null },
    meta,
  });
  writeSession(opts.project, session);
  emit(session);
}

// ── session-read ────────────────────────────────────────

function runSessionRead(opts: { project: string; session: string }): void {
  const s = readSession(opts.project, opts.session);
  if (!s) fail("session-read", `session not found: ${opts.session}`, ExitCode.NOT_FOUND);
  emit(s);
}

// ── session-delete ──────────────────────────────────────

function runSessionDelete(opts: { project: string; session: string }): void {
  deleteSession(opts.project, opts.session);
  emit({ deleted: true, session: opts.session });
}

// ── session-list ────────────────────────────────────────

function runSessionList(opts: { project: string; workflow?: string }): void {
  emit(listSessions({ project: opts.project, workflow: opts.workflow }));
}

// ── session-summary ─────────────────────────────────────

function runSessionSummary(opts: { project: string; session: string }): void {
  const s = readSession(opts.project, opts.session);
  if (!s) fail("session-summary", `session not found: ${opts.session}`, ExitCode.NOT_FOUND);
  const count = (status: string) => s!.tasks.filter((t) => t.status === status).length;
  emit({
    session_id: s!.session_id,
    workflow: s!.workflow,
    project: s!.project,
    env: s!.env,
    total: s!.tasks.length,
    pending: count("pending"),
    running: count("running"),
    done: count("done"),
    blocked: count("blocked"),
    failed: count("failed"),
    skipped: count("skipped"),
    updated_at: s!.updated_at,
  });
}

// ── session-resume ──────────────────────────────────────

function runSessionResume(opts: {
  project: string; session: string;
  retryFailed?: boolean; retryBlocked?: boolean; payloadPathCheck?: string;
}): void {
  resumeSession(opts.project, opts.session, {
    retryFailed: opts.retryFailed,
    retryBlocked: opts.retryBlocked,
    payloadPathCheck: opts.payloadPathCheck,
  });
  const s = readSession(opts.project, opts.session);
  emit(s);
}

// ── task-add ────────────────────────────────────────────

async function runTaskAdd(opts: {
  project: string; session: string; tasks: string;
}): Promise<void> {
  let inputs: TaskInput[];
  try {
    inputs = JSON.parse(opts.tasks) as TaskInput[];
    if (!Array.isArray(inputs)) throw new Error("--tasks must be a JSON array");
  } catch (err) {
    fail("task-add", `invalid --tasks JSON: ${(err as Error).message}`, ExitCode.ARG_ERROR);
  }
  try {
    await withSessionLock(opts.project, opts.session, () =>
      addTasks(opts.project, opts.session, inputs));
  } catch (err) {
    fail("task-add", (err as Error).message, ExitCode.ARG_ERROR);
  }
  emit(readSession(opts.project, opts.session));
}

// ── task-update ─────────────────────────────────────────

async function runTaskUpdate(opts: {
  project: string; session: string; task: string;
  status?: string; reason?: string; payload?: string;
  dependsOn?: string; error?: string; force?: boolean;
}): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (opts.status) {
    if (!["pending","running","done","blocked","failed","skipped"].includes(opts.status)) {
      fail("task-update", `invalid --status ${opts.status}`, ExitCode.ARG_ERROR);
    }
    patch.status = opts.status;
  }
  if (opts.reason !== undefined) patch.reason = opts.reason;
  if (opts.error !== undefined) patch.error = opts.error;
  if (opts.payload) {
    try { patch.payload = JSON.parse(opts.payload); }
    catch { fail("task-update", `invalid --payload JSON`, ExitCode.ARG_ERROR); }
  }
  if (opts.dependsOn !== undefined) {
    patch.depends_on = opts.dependsOn
      ? opts.dependsOn.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
  }

  // Guard: when transitioning to running, check deps (unless --force)
  if (patch.status === "running") {
    const gate = isExecutable(opts.project, opts.session, opts.task);
    if (!gate.ok) {
      if (!opts.force) {
        fail("task-update",
          `cannot start ${opts.task}: blocked_by ${gate.blocked_by.join(",")}`,
          ExitCode.DEPENDENCY_UNSATISFIED);
      }
      // --force: record forced-start in errors
      patch.error = `forced-start: blocked_by ${gate.blocked_by.join(",")}`;
    }
  }

  try {
    await withSessionLock(opts.project, opts.session, () =>
      updateTask(opts.project, opts.session, opts.task, patch as TaskUpdatePatch));
  } catch (err) {
    fail("task-update", (err as Error).message, ExitCode.ARG_ERROR);
  }
  emit(readSession(opts.project, opts.session));
}

// ── task-remove ─────────────────────────────────────────

async function runTaskRemove(opts: {
  project: string; session: string; task: string;
}): Promise<void> {
  await withSessionLock(opts.project, opts.session, () =>
    removeTask(opts.project, opts.session, opts.task));
  emit(readSession(opts.project, opts.session));
}

// ── task-query ──────────────────────────────────────────

function runTaskQuery(opts: {
  project: string; session: string;
  status?: string; kind?: string; parent?: string;
  includeAll?: boolean; includeBlocked?: boolean; format?: string;
}): void {
  const results = queryTasks(opts.project, opts.session, {
    status: opts.status
      ? (opts.status.split(",").map((s) => s.trim()) as TaskStatus[])
      : undefined,
    kind: opts.kind,
    parent: opts.parent,
    includeAll: opts.includeAll,
    includeBlocked: opts.includeBlocked,
  });

  if (opts.format === "table") {
    const lines = [
      ["id", "name", "status", "kind", "parent", "blocked_by"].join("\t"),
      ...results.map((r) => [
        r.task.id, r.task.name, r.task.status, r.task.kind,
        r.task.parent ?? "-", (r.blocked_by ?? []).join(",") || "-",
      ].join("\t")),
    ];
    process.stdout.write(`${lines.join("\n")}\n`);
    return;
  }
  emit(results);
}

// ── task-block / task-unblock ───────────────────────────

async function runTaskBlock(opts: {
  project: string; session: string; task: string; reason: string;
}): Promise<void> {
  await withSessionLock(opts.project, opts.session, () =>
    updateTask(opts.project, opts.session, opts.task, {
      status: "blocked", reason: opts.reason,
    }));
  emit(readSession(opts.project, opts.session));
}

async function runTaskUnblock(opts: {
  project: string; session: string; task: string;
}): Promise<void> {
  await withSessionLock(opts.project, opts.session, () =>
    updateTask(opts.project, opts.session, opts.task, {
      status: "pending", reason: null,
    }));
  emit(readSession(opts.project, opts.session));
}

// ── task-rollup ─────────────────────────────────────────

async function runTaskRollup(opts: {
  project: string; session: string; task: string;
}): Promise<void> {
  try {
    await withSessionLock(opts.project, opts.session, () =>
      rollupTask(opts.project, opts.session, opts.task));
  } catch (err) {
    const msg = (err as Error).message;
    if (/unfinished/i.test(msg)) {
      fail("task-rollup", msg, ExitCode.ROLLUP_INCOMPLETE);
    }
    fail("task-rollup", msg, ExitCode.ARG_ERROR);
  }
  emit(readSession(opts.project, opts.session));
}

// ── artifact-set / artifact-get ─────────────────────────

async function runArtifactSet(opts: {
  project: string; session: string; key: string; value: string;
}): Promise<void> {
  let parsed: unknown;
  try { parsed = JSON.parse(opts.value); }
  catch { fail("artifact-set", `invalid --value JSON`, ExitCode.ARG_ERROR); }
  await withSessionLock(opts.project, opts.session, () =>
    setArtifact(opts.project, opts.session, opts.key, parsed));
  emit(readSession(opts.project, opts.session));
}

function runArtifactGet(opts: { project: string; session: string; key: string }): void {
  const v = getArtifact(opts.project, opts.session, opts.key);
  emit(v);
}

// ── migrate ─────────────────────────────────────────────

async function runMigrate(opts: {
  from: string;
  project: string;
  dryRun?: boolean;
}): Promise<void> {
  if (opts.from !== "legacy") {
    fail("migrate", `unsupported --from value: ${opts.from}`, ExitCode.ARG_ERROR);
  }
  const entries = discoverLegacyFiles(opts.project);

  if (opts.dryRun) {
    emit({ plan: entries });
    return;
  }

  let migrated = 0;
  const results: Array<{ path: string; sessionId: string; kind: string }> = [];
  for (const entry of entries) {
    const result = entry.kind === "kata-state"
      ? await migrateKataState({
          legacyPath: entry.path, project: opts.project, env: entry.env, dryRun: false,
        })
      : await migrateUiAutotest({
          legacyPath: entry.path, project: opts.project, env: entry.env, dryRun: false,
        });
    migrated++;
    results.push({ path: entry.path, sessionId: result.sessionId, kind: entry.kind });
  }
  emit({ migrated, results });
}

// ── registration ────────────────────────────────────────

export const program = createCli({
  name: "progress",
  description: "Unified task progress engine for kata workflows",
  commands: [
    {
      name: "session-create",
      description: "Create a new progress session",
      options: [
        { flag: "--workflow <name>", description: "Workflow name (e.g. test-case-gen)", required: true },
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--source-type <type>", description: "Source type (prd/archive/bug)", required: true },
        { flag: "--source-path <path>", description: "Source file path", required: true },
        { flag: "--env <name>", description: "Environment tag", defaultValue: "default" },
        { flag: "--meta <json>", description: "Arbitrary metadata JSON" },
      ],
      action: runSessionCreate,
    },
    {
      name: "session-read",
      description: "Read full session JSON",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--session <id>", description: "Session id", required: true },
      ],
      action: runSessionRead,
    },
    {
      name: "session-delete",
      description: "Delete a session",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--session <id>", description: "Session id", required: true },
      ],
      action: runSessionDelete,
    },
    {
      name: "session-list",
      description: "List sessions under a project",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--workflow <name>", description: "Filter by workflow" },
      ],
      action: runSessionList,
    },
    {
      name: "session-summary",
      description: "Aggregate counts by task status",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--session <id>", description: "Session id", required: true },
      ],
      action: runSessionSummary,
    },
    {
      name: "session-resume",
      description: "Resume session: running → pending, optional retry flags",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--session <id>", description: "Session id", required: true },
        { flag: "--retry-failed", description: "Reset failed tasks to pending", defaultValue: false },
        { flag: "--retry-blocked", description: "Reset blocked tasks to pending", defaultValue: false },
        { flag: "--payload-path-check <key>", description: "Reset task if payload[key] file is missing" },
      ],
      action: runSessionResume,
    },
    {
      name: "task-add",
      description: "Add tasks (batch via --tasks JSON array)",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--session <id>", description: "Session id", required: true },
        { flag: "--tasks <json>", description: "JSON array of TaskInput", required: true },
      ],
      action: runTaskAdd,
    },
    {
      name: "task-update",
      description: "Update task fields",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--session <id>", description: "Session id", required: true },
        { flag: "--task <id>", description: "Task id", required: true },
        { flag: "--status <s>", description: "pending|running|done|blocked|failed|skipped" },
        { flag: "--reason <msg>", description: "Block / skip reason" },
        { flag: "--payload <json>", description: "Merge into task payload" },
        { flag: "--depends-on <csv>", description: "Replace depends_on list (comma-separated)" },
        { flag: "--error <msg>", description: "Append to errors (with failed/blocked status)" },
        { flag: "--force", description: "Bypass dependency check when starting", defaultValue: false },
      ],
      action: runTaskUpdate,
    },
    {
      name: "task-remove",
      description: "Remove a task by id",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--session <id>", description: "Session id", required: true },
        { flag: "--task <id>", description: "Task id", required: true },
      ],
      action: runTaskRemove,
    },
    {
      name: "task-query",
      description: "Query tasks with visibility rules",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--session <id>", description: "Session id", required: true },
        { flag: "--status <csv>", description: "Comma-separated statuses" },
        { flag: "--kind <k>", description: "Filter by kind" },
        { flag: "--parent <id>", description: "Filter by parent id" },
        { flag: "--include-all", description: "Bypass all visibility filters", defaultValue: false },
        { flag: "--include-blocked", description: "Show hidden (blocked) tasks with reasons", defaultValue: false },
        { flag: "--format <fmt>", description: "json | table", defaultValue: "json" },
      ],
      action: runTaskQuery,
    },
    {
      name: "task-block",
      description: "Shortcut: set status=blocked with reason",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--session <id>", description: "Session id", required: true },
        { flag: "--task <id>", description: "Task id", required: true },
        { flag: "--reason <msg>", description: "Block reason", required: true },
      ],
      action: runTaskBlock,
    },
    {
      name: "task-unblock",
      description: "Shortcut: clear blocked, return to pending",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--session <id>", description: "Session id", required: true },
        { flag: "--task <id>", description: "Task id", required: true },
      ],
      action: runTaskUnblock,
    },
    {
      name: "task-rollup",
      description: "Mark parent done if all children done/skipped",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--session <id>", description: "Session id", required: true },
        { flag: "--task <id>", description: "Parent task id", required: true },
      ],
      action: runTaskRollup,
    },
    {
      name: "artifact-set",
      description: "Set session-level artifact (auto-spill > 64KB)",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--session <id>", description: "Session id", required: true },
        { flag: "--key <k>", description: "Artifact key", required: true },
        { flag: "--value <json>", description: "Value JSON", required: true },
      ],
      action: runArtifactSet,
    },
    {
      name: "artifact-get",
      description: "Read artifact (dereferences blob $ref automatically)",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--session <id>", description: "Session id", required: true },
        { flag: "--key <k>", description: "Artifact key", required: true },
      ],
      action: runArtifactGet,
    },
    {
      name: "migrate",
      description: "Migrate legacy kata-state / ui-autotest-progress files",
      options: [
        { flag: "--from <source>", description: "Migration source (only 'legacy' supported)", required: true },
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--dry-run", description: "Show plan without writing anything", defaultValue: false },
      ],
      action: runMigrate,
    },
  ],
});
