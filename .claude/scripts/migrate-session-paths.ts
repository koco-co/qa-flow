#!/usr/bin/env bun
/**
 * migrate-session-paths.ts — 一次性迁移 .auth/session-{env}.json 到 .auth/{project}/session-{env}.json
 *
 * Usage:
 *   bun run .claude/scripts/migrate-session-paths.ts                # 自动按 defaultProject 迁移
 *   bun run .claude/scripts/migrate-session-paths.ts --project xyzh # 显式指定目标 project
 *   bun run .claude/scripts/migrate-session-paths.ts --dry-run      # 仅打印计划，不实际移动
 *
 * 行为：
 *   - 扫描 .auth/session-*.json（旧格式）
 *   - 移动到 .auth/{project}/session-*.json（新格式）
 *   - 目标已存在不覆盖，源文件保留并 stderr warning
 *   - 幂等：重复跑不出错
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { Command } from "commander";

interface MigrationResult {
  readonly source: string;
  readonly target: string;
  readonly action: "moved" | "skipped_target_exists" | "dry_run";
}

function repoRoot(): string {
  return join(import.meta.dirname, "../..");
}

function resolveProject(opts: { project?: string }): string {
  if (opts.project) return opts.project;

  const configPath = join(repoRoot(), "config.json");
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, "utf8")) as {
        defaultProject?: string;
      };
      if (config.defaultProject) return config.defaultProject;
    } catch {
      // ignore
    }
  }

  const workspaceDir = join(repoRoot(), "workspace");
  if (existsSync(workspaceDir)) {
    const subdirs = readdirSync(workspaceDir).filter(
      (name) =>
        !name.startsWith(".") &&
        statSync(join(workspaceDir, name)).isDirectory(),
    );
    if (subdirs.length === 1) return subdirs[0];
    if (subdirs.length === 0) {
      throw new Error(
        "No project found in workspace/ — pass --project explicitly",
      );
    }
    throw new Error(
      `Multiple projects found in workspace/: ${subdirs.join(", ")}. Pass --project explicitly.`,
    );
  }

  throw new Error("workspace/ directory not found");
}

export function planMigration(
  authDir: string,
  project: string,
): MigrationResult[] {
  if (!existsSync(authDir)) return [];

  const entries = readdirSync(authDir).filter(
    (name) =>
      name.startsWith("session-") &&
      name.endsWith(".json") &&
      statSync(join(authDir, name)).isFile(),
  );

  return entries.map((name) => {
    const source = join(authDir, name);
    const target = join(authDir, project, name);
    const action: MigrationResult["action"] = existsSync(target)
      ? "skipped_target_exists"
      : "moved";
    return { source, target, action };
  });
}

export function applyMigration(
  plan: readonly MigrationResult[],
  options: { dryRun: boolean },
): readonly MigrationResult[] {
  const results: MigrationResult[] = [];
  for (const item of plan) {
    if (options.dryRun) {
      results.push({ ...item, action: "dry_run" });
      continue;
    }
    if (item.action === "skipped_target_exists") {
      process.stderr.write(
        `[migrate-session-paths] target exists, skipping: ${item.target}\n`,
      );
      results.push(item);
      continue;
    }
    mkdirSync(dirname(item.target), { recursive: true });
    renameSync(item.source, item.target);
    results.push(item);
  }
  return results;
}

if (import.meta.main) {
  const program = new Command();

  program
    .name("migrate-session-paths")
    .description(
      "Migrate .auth/session-*.json (legacy) to .auth/{project}/session-*.json (multi-project layout)",
    )
    .option("--project <name>", "Target project (default: auto-detect)")
    .option("--dry-run", "Print migration plan without applying", false)
    .action((opts: { project?: string; dryRun: boolean }) => {
      let project: string;
      try {
        project = resolveProject(opts);
      } catch (err) {
        process.stderr.write(`[migrate-session-paths] ${err}\n`);
        process.exit(1);
      }

      const authDir = join(repoRoot(), ".auth");
      const plan = planMigration(authDir, project);

      if (plan.length === 0) {
        process.stdout.write(
          `${JSON.stringify({ project, migrations: [], message: "no legacy session files" }, null, 2)}\n`,
        );
        return;
      }

      const results = applyMigration(plan, { dryRun: opts.dryRun });

      process.stdout.write(
        `${JSON.stringify({ project, migrations: results }, null, 2)}\n`,
      );
    });

  program.parse(process.argv);
}
