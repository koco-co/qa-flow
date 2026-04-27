/**
 * progress-migrator.ts — Legacy state file migrators for the unified progress engine.
 *
 * Migrates:
 *   - `.kata-state-*.json`          → progress sessions (workflow: test-case-gen)
 *   - `ui-autotest-progress-*.json` → progress sessions (workflow: ui-autotest)
 *
 * Also exposes `migrateSession` for in-flight Phase D3 sessions: rewrites
 * legacy `transform`/`enhance` task nodes when unified-discuss subsumes them.
 *
 * See spec: docs/architecture/progress-engine.md (TBD: written in P9)
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import {
  createSession,
  writeSession,
  readSession,
  addTasks,
  updateTask,
  removeTask,
  setArtifact,
} from "./progress-store.ts";
import type { TaskInput } from "./progress-store.ts";
import { enhancedMd, legacyBackupDir, projectDir, tempDir } from "./paths.ts";

// ── Shared helpers ────────────────────────────────────────────────────────────

export interface MigrateOpts {
  readonly legacyPath: string;
  readonly project: string;
  readonly env?: string;
  readonly dryRun: boolean;
}

function moveToBackup(project: string, legacyPath: string): void {
  const dest = join(legacyBackupDir(project), basename(legacyPath));
  mkdirSync(dirname(dest), { recursive: true });
  renameSync(legacyPath, dest);
}

// ── kata-state migrator ───────────────────────────────────────────────────────

const PIPELINE_NODES = [
  "init", "transform", "enhance", "analyze", "write", "review", "output",
] as const;

/**
 * Migrate a single `.kata-state-*.json` legacy file to the unified progress
 * engine. On success, moves the source file to `.kata/{project}/legacy-backup/`.
 *
 * @throws if the target session already exists (duplicate guard).
 */
export async function migrateKataState(opts: MigrateOpts): Promise<{ sessionId: string }> {
  const raw = JSON.parse(readFileSync(opts.legacyPath, "utf8")) as {
    project: string;
    prd: string;
    mode: string;
    current_node: string;
    completed_nodes: string[];
    node_outputs: Record<string, Record<string, unknown>>;
    writers?: Record<string, unknown>;
    strategy_resolution?: unknown;
    cached_parse_result?: unknown;
    source_mtime?: string;
    created_at: string;
    updated_at: string;
  };

  const env = opts.env ?? "default";
  const slug = basename(raw.prd, ".md");
  const sessionId = `test-case-gen/${slug}-${env}`;

  if (opts.dryRun) {
    return { sessionId };
  }

  if (readSession(opts.project, sessionId)) {
    throw new Error(`session already exists: ${sessionId}`);
  }

  const session = createSession({
    project: opts.project,
    workflow: "test-case-gen",
    slug,
    env,
    source: { type: "prd", path: raw.prd, mtime: raw.source_mtime ?? null },
    meta: { mode: raw.mode },
  });
  writeSession(opts.project, session);

  const inputs: TaskInput[] = PIPELINE_NODES.map((name, i) => ({
    id: name,
    name,
    kind: "node",
    order: i + 1,
    depends_on: i === 0 ? [] : [PIPELINE_NODES[i - 1]],
    payload: raw.node_outputs[name] ?? {},
  }));
  addTasks(opts.project, sessionId, inputs);

  for (const name of raw.completed_nodes) {
    if ((PIPELINE_NODES as readonly string[]).includes(name)) {
      updateTask(opts.project, sessionId, name, { status: "done" });
    }
  }

  if (
    (PIPELINE_NODES as readonly string[]).includes(raw.current_node) &&
    !raw.completed_nodes.includes(raw.current_node)
  ) {
    updateTask(opts.project, sessionId, raw.current_node, { status: "running" });
  }

  if (raw.writers) {
    setArtifact(opts.project, sessionId, "writers", raw.writers);
  }
  if (raw.strategy_resolution !== undefined) {
    setArtifact(opts.project, sessionId, "strategy_resolution", raw.strategy_resolution);
  }
  if (raw.cached_parse_result !== undefined) {
    setArtifact(opts.project, sessionId, "cached_parse_result", raw.cached_parse_result);
  }

  moveToBackup(opts.project, opts.legacyPath);
  return { sessionId };
}

// ── ui-autotest-progress migrator ─────────────────────────────────────────────

/**
 * Migrate a single `ui-autotest-progress-*.json` legacy file to the unified
 * progress engine. On success, moves the source file to legacy-backup.
 *
 * @throws if the target session already exists (duplicate guard).
 */
export async function migrateUiAutotest(opts: MigrateOpts): Promise<{ sessionId: string }> {
  const raw = JSON.parse(readFileSync(opts.legacyPath, "utf8")) as {
    version: number;
    suite_name: string;
    env?: string;
    archive_md: string;
    url: string;
    selected_priorities: string[];
    output_dir: string;
    started_at: string;
    updated_at: string;
    current_step: number;
    preconditions_ready: boolean;
    merge_status: string;
    cases: Record<string, {
      title: string;
      priority: string;
      generated: boolean;
      script_path: string | null;
      test_status: "pending" | "running" | "passed" | "failed";
      attempts: number;
      error_history: readonly { at: string; message: string }[];
    }>;
    convergence?: unknown;
    convergence_status?: string;
    cached_parse_result?: unknown;
  };

  const env = opts.env ?? raw.env ?? "default";
  const slug = raw.suite_name.replace(/[^A-Za-z0-9_-]+/g, "-");
  const sessionId = `ui-autotest/${slug}-${env}`;

  if (opts.dryRun) {
    return { sessionId };
  }

  if (readSession(opts.project, sessionId)) {
    throw new Error(`session already exists: ${sessionId}`);
  }

  const session = createSession({
    project: opts.project,
    workflow: "ui-autotest",
    slug,
    env,
    source: { type: "archive", path: raw.archive_md, mtime: null },
    meta: {
      suite_name: raw.suite_name,
      url: raw.url,
      selected_priorities: raw.selected_priorities,
      output_dir: raw.output_dir,
    },
  });
  writeSession(opts.project, session);

  const suiteInput: TaskInput = {
    id: "suite",
    name: raw.suite_name,
    kind: "phase",
    order: 1,
  };
  const caseInputs: TaskInput[] = Object.entries(raw.cases).map(([id, c], i) => ({
    id,
    name: c.title,
    kind: "case",
    order: i + 1,
    parent: "suite",
    payload: {
      priority: c.priority,
      generated: c.generated,
      script_path: c.script_path,
    },
  }));
  addTasks(opts.project, sessionId, [suiteInput, ...caseInputs]);

  updateTask(opts.project, sessionId, "suite", { status: "running" });

  const statusMap: Record<string, "done" | "running" | "failed" | "pending"> = {
    passed: "done",
    failed: "failed",
    running: "running",
    pending: "pending",
  };

  for (const [id, c] of Object.entries(raw.cases)) {
    const mapped = statusMap[c.test_status] ?? "pending";
    if (mapped === "pending") continue;
    if (mapped === "failed") {
      for (const e of c.error_history) {
        updateTask(opts.project, sessionId, id, {
          status: "failed",
          error: e.message,
        });
      }
      if (c.error_history.length === 0) {
        updateTask(opts.project, sessionId, id, { status: "failed" });
      }
    } else {
      updateTask(opts.project, sessionId, id, { status: mapped });
    }
  }

  if (raw.convergence !== undefined) {
    setArtifact(opts.project, sessionId, "convergence", raw.convergence);
  }
  if (raw.convergence_status !== undefined) {
    setArtifact(opts.project, sessionId, "convergence_status", raw.convergence_status);
  }
  if (raw.cached_parse_result !== undefined) {
    setArtifact(opts.project, sessionId, "cached_parse_result", raw.cached_parse_result);
  }
  setArtifact(opts.project, sessionId, "ui_autotest_flow", {
    current_step: raw.current_step,
    preconditions_ready: raw.preconditions_ready,
    merge_status: raw.merge_status,
  });

  moveToBackup(opts.project, opts.legacyPath);
  return { sessionId };
}

// ── Legacy file discovery ─────────────────────────────────────────────────────

export interface LegacyEntry {
  readonly path: string;
  readonly kind: "kata-state" | "ui-autotest";
  readonly env: string;
}

/**
 * Scan legacy `.temp` directories and return all recognizable legacy files.
 *
 * Checks both the new `.kata/{project}/` and the old `workspace/{project}/.temp/`
 * locations for backward compatibility during the transition.
 *
 * Matches:
 *   - `.kata-state-{slug}-{env}.json`
 *   - `ui-autotest-progress-{slug}.json`  (excludes alias files)
 */
export function discoverLegacyFiles(project: string): LegacyEntry[] {
  const out: LegacyEntry[] = [];

  // Scan both new and old legacy locations
  const dirs = [
    tempDir(project),
    join(projectDir(project), ".temp"),
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (/^\.kata-state-.+\.json$/.test(f)) {
        const m = f.match(/^\.kata-state-(.+)-([^-]+)\.json$/);
        // Deduplicate by filename — prefer the first match
        if (out.some((e) => e.path.endsWith(f))) continue;
        out.push({
          path: join(dir, f),
          kind: "kata-state",
          env: m?.[2] ?? "default",
        });
      } else if (/^ui-autotest-progress-(?!alias-).+\.json$/.test(f)) {
        if (out.some((e) => e.path.endsWith(f))) continue;
        const filePath = join(dir, f);
        let env = "default";
        try {
          const raw = JSON.parse(readFileSync(filePath, "utf8")) as { env?: string };
          if (raw.env) env = raw.env;
        } catch { /* ignore malformed, leave default */ }
        out.push({
          path: filePath,
          kind: "ui-autotest",
          env,
        });
      }
    }
  }
  return out;
}

// ── In-flight session migrator (Phase D3: unified-discuss) ────────────────────

export type MigrateSessionAction =
  | "auto-done"
  | "revert-to-discuss"
  | "noop";

export interface MigrateSessionReport {
  readonly sessionId: string;
  readonly action: MigrateSessionAction;
  readonly details: readonly string[];
}

export interface MigrateSessionOpts {
  readonly dryRun?: boolean;
}

/**
 * Extract `{yyyymm, slug}` from a PRD source path of the form
 * `.../prds/{yyyymm}/{slug}.md` (or a directory layout `.../prds/{yyyymm}/{slug}/...`).
 * Returns `null` if the path does not match.
 */
function parsePrdLocator(
  sourcePath: string,
): { yyyymm: string; slug: string } | null {
  // Match `.../prds/<6 digits>/<rest>` and take first path segment of <rest>.
  const m = sourcePath.match(/\/prds\/(\d{6})\/([^/]+?)(?:\.md)?(?:\/|$)/);
  if (!m) return null;
  return { yyyymm: m[1], slug: m[2] };
}

/**
 * Migrate an in-flight progress session whose pipeline still references the
 * legacy `transform` / `enhance` task nodes. Behaviour depends on whether the
 * final artifact (`enhanced.md`) already exists for the session's PRD:
 *
 *   - artifact present  → mark `transform`/`enhance` as `done` (preserve work)
 *   - artifact missing  → drop those tasks and reset `discuss` to `pending`
 *                         (user must redo the clarification flow)
 *   - neither present   → no-op
 *
 * The action is reported regardless of `dryRun`; mutations are skipped only
 * when `dryRun` is true.
 */
export function migrateSession(
  project: string,
  sessionId: string,
  opts: MigrateSessionOpts = {},
): MigrateSessionReport {
  const session = readSession(project, sessionId);
  if (!session) {
    throw new Error(`session not found: ${sessionId}`);
  }

  const hasTransform = session.tasks.some((t) => t.id === "transform");
  const hasEnhance = session.tasks.some((t) => t.id === "enhance");
  const hasDiscuss = session.tasks.some((t) => t.id === "discuss");

  if (!hasTransform && !hasEnhance) {
    return {
      sessionId,
      action: "noop",
      details: ["session has no transform/enhance task"],
    };
  }

  const locator = parsePrdLocator(session.source.path ?? "");
  if (!locator) {
    return {
      sessionId,
      action: "noop",
      details: [
        `cannot derive yyyymm/slug from source.path "${session.source.path}"`,
      ],
    };
  }

  const enhancedPath = enhancedMd(project, locator.yyyymm, locator.slug);
  const details: string[] = [];

  if (existsSync(enhancedPath)) {
    if (!opts.dryRun) {
      if (hasTransform) {
        updateTask(project, sessionId, "transform", { status: "done" });
      }
      if (hasEnhance) {
        updateTask(project, sessionId, "enhance", { status: "done" });
      }
    }
    details.push(`enhanced.md present: ${enhancedPath}`);
    if (hasTransform) details.push("transform → done");
    if (hasEnhance) details.push("enhance → done");
    return { sessionId, action: "auto-done", details };
  }

  if (!opts.dryRun) {
    if (hasTransform) removeTask(project, sessionId, "transform");
    if (hasEnhance) removeTask(project, sessionId, "enhance");
    if (hasDiscuss) {
      updateTask(project, sessionId, "discuss", { status: "pending" });
    }
  }
  details.push(`enhanced.md missing: ${enhancedPath}`);
  if (hasTransform) details.push("transform removed");
  if (hasEnhance) details.push("enhance removed");
  if (hasDiscuss) details.push("discuss → pending");
  return { sessionId, action: "revert-to-discuss", details };
}
