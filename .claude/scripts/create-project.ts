#!/usr/bin/env bun
/**
 * create-project.ts — 项目创建 + 骨架补齐 + 源码仓库克隆。
 * Usage:
 *   bun run .claude/scripts/create-project.ts <action> --project <name> [...]
 * Actions: scan | create | clone-repo
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCli } from "./lib/cli-runner.ts";
import {
  configJsonPath,
  diffProjectSkeleton,
  mergeProjectConfig,
  migrateLegacyHistorys,
  renderTemplate,
  SKELETON_SPEC,
  TEMPLATE_ROOT_REL,
  validateProjectName,
} from "./lib/create-project.ts";
import { knowledgeDir, parseGitUrl, projectDir, reposDir } from "./lib/paths.ts";

function repoRoot(): string {
  return resolve(fileURLToPath(import.meta.url), "../../..");
}

function readConfig(): Record<string, unknown> {
  const p = configJsonPath();
  if (!existsSync(p)) return { projects: {} };
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>;
  } catch {
    return { projects: {} };
  }
}

function isProjectRegistered(name: string): boolean {
  const cfg = readConfig();
  const projects = (cfg.projects as Record<string, unknown> | undefined) ?? {};
  return Object.prototype.hasOwnProperty.call(projects, name);
}

function fail(message: string, code = 1): never {
  process.stderr.write(`[create-project] ${message}\n`);
  process.exit(code);
}

function runScan(project: string): void {
  const nameCheck = validateProjectName(project);
  if (!nameCheck.valid) {
    fail(`Invalid project name: ${nameCheck.error}`);
  }
  const projDir = projectDir(project);
  const tplRoot = resolve(repoRoot(), TEMPLATE_ROOT_REL);
  const diff = diffProjectSkeleton(projDir, tplRoot);
  const out = {
    project,
    valid_name: true,
    name_error: "",
    exists: diff.exists,
    missing_dirs: diff.missing_dirs,
    missing_files: diff.missing_files,
    missing_gitkeeps: diff.missing_gitkeeps,
    config_registered: isProjectRegistered(project),
    repos_configured: 0,
    skeleton_complete: diff.skeleton_complete,
  };
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
}

interface CreatePlan {
  dirs: string[];
  files: string[];
  gitkeeps: string[];
}

function computeCreatePlan(project: string): {
  plan: CreatePlan;
  skeleton_complete: boolean;
  config_registered: boolean;
} {
  const projDir = projectDir(project);
  const tplRoot = resolve(repoRoot(), TEMPLATE_ROOT_REL);
  const diff = diffProjectSkeleton(projDir, tplRoot);
  return {
    plan: {
      dirs: diff.missing_dirs,
      files: diff.missing_files,
      gitkeeps: diff.missing_gitkeeps,
    },
    skeleton_complete: diff.skeleton_complete,
    config_registered: isProjectRegistered(project),
  };
}

function runCreate(project: string, dryRun: boolean, confirmed: boolean): void {
  const nameCheck = validateProjectName(project);
  if (!nameCheck.valid) {
    fail(`Invalid project name: ${nameCheck.error}`);
  }

  const { plan, skeleton_complete, config_registered } = computeCreatePlan(project);

  if (skeleton_complete && config_registered) {
    process.stdout.write(
      JSON.stringify(
        {
          skipped: true,
          project,
          message: "已完整，无需补齐",
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  if (dryRun) {
    process.stdout.write(
      JSON.stringify(
        {
          dry_run: true,
          project,
          will_create: plan,
          will_register: !config_registered,
          will_call_index: true,
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  if (!confirmed) {
    fail(
      "Add --confirmed to apply. Run with --dry-run to preview.",
      2,
    );
  }

  const result = applyCreate(project);
  process.stdout.write(
    JSON.stringify({ project, ...result }, null, 2) + "\n",
  );
}

function applyCreate(project: string): {
  created_dirs: string[];
  created_files: string[];
  created_gitkeeps: string[];
  registered_config: boolean;
  index_generated: boolean;
  index_path: string;
  legacy_renamed: boolean;
  legacy_conflict: boolean;
} {
  const projDir = projectDir(project);
  const tplRoot = resolve(repoRoot(), TEMPLATE_ROOT_REL);

  const migration = migrateLegacyHistorys(projDir);
  const legacyConflict = !migration.renamed && migration.from !== undefined;
  if (migration.renamed) {
    process.stderr.write(
      `[create-project] renamed legacy directory: historys → history\n`,
    );
  } else if (legacyConflict) {
    process.stderr.write(
      `[create-project] warn: both historys/ and history/ exist; keeping history/ and leaving historys/ intact — please merge manually\n`,
    );
  }

  const diff = diffProjectSkeleton(projDir, tplRoot);

  const created_dirs: string[] = [];
  for (const rel of diff.missing_dirs) {
    const abs = join(projDir, rel);
    mkdirSync(abs, { recursive: true });
    created_dirs.push(abs);
  }

  const created_gitkeeps: string[] = [];
  for (const rel of diff.missing_gitkeeps) {
    const abs = join(projDir, rel);
    writeFileSync(abs, "");
    created_gitkeeps.push(abs);
  }

  const created_files: string[] = [];
  for (const rel of diff.missing_files) {
    const src = join(tplRoot, SKELETON_SPEC.template_files[rel]);
    const dst = join(projDir, rel);
    mkdirSync(dirname(dst), { recursive: true });
    const raw = readFileSync(src, "utf8");
    writeFileSync(dst, renderTemplate(raw, { project }));
    created_files.push(dst);
  }

  // config.json merge
  const cfgPath = configJsonPath();
  const existing = existsSync(cfgPath)
    ? (JSON.parse(readFileSync(cfgPath, "utf8")) as Record<string, unknown>)
    : {};
  const { merged, added } = mergeProjectConfig(existing, project);
  writeFileSync(cfgPath, JSON.stringify(merged, null, 2) + "\n");

  // Invoke knowledge-keeper index
  const indexPath = join(knowledgeDir(project), "_index.md");
  const kk = spawnSync(
    "bun",
    [
      "run",
      ".claude/scripts/knowledge-keeper.ts",
      "index",
      "--project",
      project,
    ],
    {
      cwd: repoRoot(),
      env: process.env,
      encoding: "utf8",
    },
  );
  if (kk.status !== 0) {
    process.stderr.write(kk.stderr || "");
    fail(`knowledge-keeper index failed (exit ${kk.status})`);
  }

  return {
    created_dirs,
    created_files,
    created_gitkeeps,
    registered_config: added,
    index_generated: existsSync(indexPath),
    index_path: indexPath,
    legacy_renamed: migration.renamed,
    legacy_conflict: legacyConflict,
  };
}

function runCloneRepo(project: string, url: string, branch: string): void {
  const nameCheck = validateProjectName(project);
  if (!nameCheck.valid) {
    fail(`Invalid project name: ${nameCheck.error}`);
  }
  const projDir = projectDir(project);
  if (!existsSync(projDir)) {
    fail(`Project not found: ${project}. Run 'create' first.`);
  }

  const { group, repo } = parseGitUrl(url);
  if (!group || !repo) {
    fail(`Cannot parse git URL: ${url}`);
  }
  const targetDir = join(reposDir(project), group, repo);
  if (existsSync(targetDir)) {
    fail(`Repo already cloned: ${targetDir}`);
  }

  mkdirSync(dirname(targetDir), { recursive: true });
  const args = ["clone"];
  if (branch) {
    args.push("--branch", branch, "--single-branch");
  }
  args.push(url, targetDir);
  const result = spawnSync("git", args, {
    cwd: repoRoot(),
    env: process.env,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || "");
    fail(`git clone failed (exit ${result.status})`);
  }

  process.stdout.write(
    JSON.stringify(
      {
        project,
        url,
        group,
        repo,
        branch: branch || "main",
        local_path: targetDir,
      },
      null,
      2,
    ) + "\n",
  );
}

createCli({
  name: "create-project",
  description: "创建新项目或补齐残缺项目骨架",
  commands: [
    {
      name: "scan",
      description: "扫描项目骨架与目标态的差异",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
      ],
      action: (opts: { project: string }) => {
        runScan(opts.project);
      },
    },
    {
      name: "create",
      description: "创建或补齐项目骨架",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--dry-run", description: "预览将要创建的内容，不落盘" },
        { flag: "--confirmed", description: "真实执行写入" },
      ],
      action: (opts: { project: string; dryRun?: boolean; confirmed?: boolean }) => {
        runCreate(opts.project, opts.dryRun === true, opts.confirmed === true);
      },
    },
    {
      name: "clone-repo",
      description: "克隆源码仓库到项目 .repos 目录",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--url <git-url>", description: "Git URL", required: true },
        { flag: "--branch <branch>", description: "分支（默认 main）", defaultValue: "" },
      ],
      action: (opts: { project: string; url: string; branch?: string }) => {
        runCloneRepo(opts.project, opts.url, opts.branch ?? "");
      },
    },
  ],
}).parse(process.argv);
