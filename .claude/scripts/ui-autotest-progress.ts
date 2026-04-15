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

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .replace(/[()（）#【】&，。、；：""''《》？！\s]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function progressFilePath(project: string, suiteName: string): string {
  return `${tempDir(project)}/ui-autotest-progress-${slugify(suiteName)}.json`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function readProgress(project: string, suiteName: string): Progress | null {
  const filePath = progressFilePath(project, suiteName);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as Progress;
  } catch (err) {
    throw new Error(`Failed to parse progress file: ${err}`);
  }
}

function writeProgress(project: string, suiteName: string, progress: Progress): void {
  const filePath = progressFilePath(project, suiteName);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(progress, null, 2)}\n`, "utf8");
}

// ── Commander ────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name("ui-autotest-progress")
  .description("UI 自动化测试断点续传状态管理")
  .helpOption("-h, --help", "Display help information");

program.parse(process.argv);
