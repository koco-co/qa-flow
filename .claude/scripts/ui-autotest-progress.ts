#!/usr/bin/env bun
/**
 * ui-autotest-progress.ts — UI 自动化测试断点续传状态管理 CLI
 *
 * Usage:
 *   bun run .claude/scripts/ui-autotest-progress.ts create --project dataAssets --suite "套件名" --archive "archive/path.md" --url "http://..."
 *   bun run .claude/scripts/ui-autotest-progress.ts update --project dataAssets --suite "套件名" --case t1 --field test_status --value passed
 *   bun run .claude/scripts/ui-autotest-progress.ts read --project dataAssets --suite "套件名"
 *   bun run .claude/scripts/ui-autotest-progress.ts summary --project dataAssets --suite "套件名"
 *   bun run .claude/scripts/ui-autotest-progress.ts reset --project dataAssets --suite "套件名"
 */

import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Command } from "commander";
import { initEnv } from "./lib/env.ts";
import { tempDir } from "./lib/paths.ts";

// ── Types ────────────────────────────────────────────────────────────────────

type TestStatus = "pending" | "running" | "passed" | "failed";
type MergeStatus = "pending" | "completed";

interface CaseState {
  readonly title: string;
  readonly priority: string;
  readonly generated: boolean;
  readonly script_path: string | null;
  readonly test_status: TestStatus;
  readonly attempts: number;
  readonly last_error: string | null;
}

interface Progress {
  readonly version: 1;
  readonly suite_name: string;
  readonly env?: string;
  readonly archive_md: string;
  readonly url: string;
  readonly selected_priorities: readonly string[];
  readonly output_dir: string;
  readonly started_at: string;
  readonly updated_at: string;
  readonly current_step: number;
  readonly preconditions_ready: boolean;
  readonly cases: Readonly<Record<string, CaseState>>;
  readonly merge_status: MergeStatus;
  readonly cached_parse_result?: unknown;
  readonly source_mtime?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function slugify(name: string): string {
  return name
    .replace(/[()（）#【】&，。、；：""''《》？！\s]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function progressFilePath(project: string, suiteName: string, env?: string): string {
  const envSuffix = env ? `-${env.toLowerCase()}` : "";
  return `${tempDir(project)}/ui-autotest-progress-${slugify(suiteName)}${envSuffix}.json`;
}

export function uiBlocksDir(project: string, suiteName: string): string {
  return `${tempDir(project)}/ui-blocks/${slugify(suiteName)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function readProgress(project: string, suiteName: string, env?: string): Progress | null {
  const filePath = progressFilePath(project, suiteName, env);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as Progress;
  } catch (err) {
    throw new Error(`Failed to parse progress file: ${err}`);
  }
}

function writeProgress(project: string, suiteName: string, progress: Progress, env?: string): void {
  const filePath = progressFilePath(project, suiteName, env);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(progress, null, 2)}\n`, "utf8");
}

// ── Commander ────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name("ui-autotest-progress")
  .description("UI 自动化测试断点续传状态管理")
  .helpOption("-h, --help", "Display help information");

// ── create ────────────────────────────────────────────────────────────────────

program
  .command("create")
  .description("Create a new progress file for a test suite")
  .requiredOption("--project <name>", "Project name (e.g. dataAssets)")
  .requiredOption("--suite <name>", "Test suite name")
  .requiredOption("--archive <path>", "Archive MD path")
  .requiredOption("--url <url>", "Target URL for testing")
  .option("--priorities <csv>", "Comma-separated priorities to run", "P0")
  .option("--output-dir <dir>", "Output directory for test scripts", "tests/")
  .requiredOption("--cases <json>", "JSON map of case id → {title, priority}")
  .option("--env <name>", "环境标识（如 ci63、ltqcdev）")
  .action(
    (opts: {
      project: string;
      suite: string;
      archive: string;
      url: string;
      priorities: string;
      outputDir: string;
      cases: string;
      env?: string;
    }) => {
      initEnv();

      let rawCases: Record<string, { title: string; priority: string }>;
      try {
        rawCases = JSON.parse(opts.cases) as Record<
          string,
          { title: string; priority: string }
        >;
      } catch {
        process.stderr.write(`[ui-autotest-progress:create] invalid --cases JSON\n`);
        process.exit(1);
      }

      const now = nowIso();
      const cases: Record<string, CaseState> = Object.fromEntries(
        Object.entries(rawCases).map(([id, { title, priority }]) => [
          id,
          {
            title,
            priority,
            generated: false,
            script_path: null,
            test_status: "pending" as TestStatus,
            attempts: 0,
            last_error: null,
          } satisfies CaseState,
        ]),
      );

      const progress: Progress = {
        version: 1,
        suite_name: opts.suite,
        ...(opts.env ? { env: opts.env } : {}),
        archive_md: opts.archive,
        url: opts.url,
        selected_priorities: opts.priorities.split(",").map((p) => p.trim()),
        output_dir: opts.outputDir,
        started_at: now,
        updated_at: now,
        current_step: 4,
        preconditions_ready: false,
        cases,
        merge_status: "pending",
      };

      try {
        writeProgress(opts.project, opts.suite, progress, opts.env);
        process.stdout.write(`${JSON.stringify(progress, null, 2)}\n`);
      } catch (err) {
        process.stderr.write(`[ui-autotest-progress:create] error: ${err}\n`);
        process.exit(1);
      }
    },
  );

// ── update ────────────────────────────────────────────────────────────────────

program
  .command("update")
  .description("Update a field in the progress file")
  .requiredOption("--project <name>", "Project name")
  .requiredOption("--suite <name>", "Test suite name")
  .option("--case <id>", "Case ID to update (omit for top-level field)")
  .requiredOption("--field <name>", "Field name to update")
  .requiredOption("--value <val>", "New value")
  .option("--env <name>", "环境标识（如 ci63、ltqcdev）")
  .action(
    (opts: {
      project: string;
      suite: string;
      case?: string;
      field: string;
      value: string;
      env?: string;
    }) => {
      initEnv();

      const progress = readProgress(opts.project, opts.suite, opts.env);
      if (!progress) {
        process.stderr.write(
          `[ui-autotest-progress:update] progress file not found for suite "${opts.suite}"\n`,
        );
        process.exit(1);
      }

      // Type coercion
      const coerce = (field: string, raw: string): unknown => {
        if (raw === "null") return null;
        if (["generated", "preconditions_ready"].includes(field)) return raw === "true";
        if (["current_step", "attempts"].includes(field)) return Number(raw);
        return raw;
      };

      const coercedValue = coerce(opts.field, opts.value);

      let updated: Progress;

      if (opts.case !== undefined) {
        const caseId = opts.case;
        const existing = progress.cases[caseId];
        if (!existing) {
          process.stderr.write(
            `[ui-autotest-progress:update] case "${caseId}" not found\n`,
          );
          process.exit(1);
        }

        // Auto-increment attempts when test_status set to running
        const extraCaseFields: Partial<CaseState> =
          opts.field === "test_status" && opts.value === "running"
            ? { attempts: existing.attempts + 1 }
            : {};

        const updatedCase: CaseState = {
          ...existing,
          [opts.field]: coercedValue,
          ...extraCaseFields,
        };

        updated = {
          ...progress,
          cases: {
            ...progress.cases,
            [caseId]: updatedCase,
          },
          updated_at: nowIso(),
        };
      } else {
        updated = {
          ...progress,
          [opts.field]: coercedValue,
          updated_at: nowIso(),
        };
      }

      try {
        writeProgress(opts.project, opts.suite, updated, opts.env);
        process.stdout.write(`${JSON.stringify(updated, null, 2)}\n`);
      } catch (err) {
        process.stderr.write(`[ui-autotest-progress:update] error: ${err}\n`);
        process.exit(1);
      }
    },
  );

// ── read ──────────────────────────────────────────────────────────────────────

program
  .command("read")
  .description("Read and output current progress JSON")
  .requiredOption("--project <name>", "Project name")
  .requiredOption("--suite <name>", "Test suite name")
  .option("--env <name>", "环境标识（如 ci63、ltqcdev）")
  .action((opts: { project: string; suite: string; env?: string }) => {
    initEnv();

    const progress = readProgress(opts.project, opts.suite, opts.env);
    if (!progress) {
      process.stderr.write(
        `[ui-autotest-progress:read] progress file not found for suite "${opts.suite}"\n`,
      );
      process.exit(1);
    }

    process.stdout.write(`${JSON.stringify(progress, null, 2)}\n`);
  });

// ── summary ───────────────────────────────────────────────────────────────────

program
  .command("summary")
  .description("Output aggregated counts and status for a suite")
  .requiredOption("--project <name>", "Project name")
  .requiredOption("--suite <name>", "Test suite name")
  .option("--env <name>", "环境标识（如 ci63、ltqcdev）")
  .action((opts: { project: string; suite: string; env?: string }) => {
    initEnv();

    const progress = readProgress(opts.project, opts.suite, opts.env);
    if (!progress) {
      process.stderr.write(
        `[ui-autotest-progress:summary] progress file not found for suite "${opts.suite}"\n`,
      );
      process.exit(1);
    }

    const caseList = Object.values(progress.cases);
    const countByStatus = (status: TestStatus): number =>
      caseList.filter((c) => c.test_status === status).length;

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const expired = Date.now() - new Date(progress.updated_at).getTime() > SEVEN_DAYS_MS;

    const summary = {
      suite_name: progress.suite_name,
      ...(progress.env ? { env: progress.env } : {}),
      current_step: progress.current_step,
      preconditions_ready: progress.preconditions_ready,
      merge_status: progress.merge_status,
      total: caseList.length,
      generated: caseList.filter((c) => c.generated).length,
      passed: countByStatus("passed"),
      failed: countByStatus("failed"),
      running: countByStatus("running"),
      pending: countByStatus("pending"),
      expired,
      updated_at: progress.updated_at,
    };

    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  });

// ── reset ─────────────────────────────────────────────────────────────────────

program
  .command("reset")
  .description("Delete the progress file for a suite")
  .requiredOption("--project <name>", "Project name")
  .requiredOption("--suite <name>", "Test suite name")
  .option("--env <name>", "环境标识（如 ci63、ltqcdev）")
  .action((opts: { project: string; suite: string; env?: string }) => {
    initEnv();

    const filePath = progressFilePath(opts.project, opts.suite, opts.env);

    try {
      if (existsSync(filePath)) {
        rmSync(filePath);
      }
      process.stdout.write(
        `${JSON.stringify({ reset: true, path: filePath }, null, 2)}\n`,
      );
    } catch (err) {
      process.stderr.write(`[ui-autotest-progress:reset] error: ${err}\n`);
      process.exit(1);
    }
  });

// ── resume ────────────────────────────────────────────────────────────────────

program
  .command("resume")
  .description("Sanitize progress for resumption (reset running → pending, validate script_path)")
  .requiredOption("--project <name>", "Project name")
  .requiredOption("--suite <name>", "Test suite name")
  .option("--retry-failed", "Also reset failed cases to pending", false)
  .option("--env <name>", "环境标识（如 ci63、ltqcdev）")
  .action((opts: { project: string; suite: string; retryFailed: boolean; env?: string }) => {
    initEnv();

    const progress = readProgress(opts.project, opts.suite, opts.env);
    if (!progress) {
      process.stderr.write(
        `[ui-autotest-progress:resume] progress file not found for suite "${opts.suite}"\n`,
      );
      process.exit(1);
    }

    // If source_mtime is set, compare with actual archive file mtime.
    // If different, the archive has changed — clear cached_parse_result.
    let baseProgress: Progress = progress;
    if (progress.source_mtime && progress.archive_md) {
      try {
        const actualMtime = statSync(progress.archive_md).mtime.toISOString();
        if (actualMtime !== progress.source_mtime) {
          baseProgress = { ...progress, cached_parse_result: undefined };
        }
      } catch {
        // Archive file not accessible — leave cache as-is
      }
    }

    const sanitizedCases: Record<string, CaseState> = Object.fromEntries(
      Object.entries(baseProgress.cases).map(([id, c]) => {
        let updated: CaseState = c;

        // 1. Reset running → pending
        if (updated.test_status === "running") {
          updated = { ...updated, test_status: "pending" };
        }

        // 2. Reset failed → pending if --retry-failed
        if (opts.retryFailed && updated.test_status === "failed") {
          updated = { ...updated, test_status: "pending", attempts: 0, last_error: null };
        }

        // 3. Validate script_path: if generated but file missing, reset
        if (
          updated.generated === true &&
          updated.script_path !== null &&
          !existsSync(updated.script_path)
        ) {
          updated = { ...updated, generated: false, script_path: null };
        }

        return [id, updated];
      }),
    );

    const sanitized: Progress = {
      ...baseProgress,
      cases: sanitizedCases,
      updated_at: nowIso(),
    };

    try {
      writeProgress(opts.project, opts.suite, sanitized, opts.env);
      process.stdout.write(`${JSON.stringify(sanitized, null, 2)}\n`);
    } catch (err) {
      process.stderr.write(`[ui-autotest-progress:resume] error: ${err}\n`);
      process.exit(1);
    }
  });

if (import.meta.main) {
  program.parse(process.argv);
}
