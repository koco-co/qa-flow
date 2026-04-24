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
} from "./lib/progress-store.ts";
import { ExitCode } from "./lib/progress-types.ts";

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
  ],
});
