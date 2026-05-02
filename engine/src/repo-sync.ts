#!/usr/bin/env bun
/**
 * repo-sync.ts — Sync source code repositories.
 *
 * Usage:
 *   kata-cli repo-sync sync --url <git-url> --branch <branch> [--base-dir workspace/.repos]
 *   kata-cli repo-sync sync-profile --name <profile>
 *   kata-cli repo-sync --help
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createCli } from "../lib/cli-runner.ts";
import { parseGitUrl, repoRoot } from "../lib/paths.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SyncOutput {
  repo: string;
  group: string;
  branch: string;
  commit: string;
  path: string;
}

interface ErrorOutput {
  error: string;
  step: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function git(cwd: string, args: string[]): string {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

function gitClone(url: string, targetDir: string): void {
  execFileSync("git", ["clone", url, targetDir], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function runSync(opts: {
  url?: string;
  branch?: string;
  project?: string;
  baseDir?: string;
}): void {
  const { url, branch } = opts;
  if (!opts.baseDir && !opts.project) {
    const out: ErrorOutput = {
      error: "--project is required (or use --base-dir to override)",
      step: "validate-args",
    };
    process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exit(1);
  }
  const baseDir = opts.baseDir ?? `workspace/${opts.project}/.repos`;

  if (!url || !branch) {
    const out: ErrorOutput = {
      error: "Both --url and --branch are required",
      step: "validate-args",
    };
    process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exit(1);
  }

  const { group, repo } = parseGitUrl(url);
  if (!group || !repo) {
    const out: ErrorOutput = {
      error: `Cannot parse git URL: "${url}"`,
      step: "parse-url",
    };
    process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exit(1);
  }

  const absoluteBase = resolve(repoRoot(), baseDir);
  const targetDir = join(absoluteBase, group, repo);

  // Clone if not present
  if (!existsSync(targetDir)) {
    try {
      mkdirSync(join(absoluteBase, group), { recursive: true });
      gitClone(url, targetDir);
    } catch (err) {
      const out: ErrorOutput = {
        error: `git clone failed: ${err instanceof Error ? err.message : String(err)}`,
        step: "clone",
      };
      process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
      process.exit(1);
    }
  }

  // fetch
  try {
    git(targetDir, ["fetch", "origin"]);
  } catch (err) {
    const out: ErrorOutput = {
      error: `git fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      step: "fetch",
    };
    process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exit(1);
  }

  // checkout
  try {
    git(targetDir, ["checkout", branch]);
  } catch (err) {
    const out: ErrorOutput = {
      error: `git checkout failed: ${err instanceof Error ? err.message : String(err)}`,
      step: "checkout",
    };
    process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exit(1);
  }

  // pull
  try {
    git(targetDir, ["pull", "origin", branch]);
  } catch (err) {
    const out: ErrorOutput = {
      error: `git pull failed: ${err instanceof Error ? err.message : String(err)}`,
      step: "pull",
    };
    process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exit(1);
  }

  // get commit
  let commit = "unknown";
  try {
    commit = git(targetDir, ["rev-parse", "--short", "HEAD"]);
  } catch {
    // non-fatal
  }

  const out: SyncOutput = {
    repo,
    group,
    branch,
    commit,
    path: resolve(targetDir),
  };
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

function runSyncProfile(opts: { name: string }): void {
  const configPath = join(repoRoot(), "config.json");
  if (!existsSync(configPath)) {
    const out: ErrorOutput = {
      error: "config.json not found",
      step: "read-config",
    };
    process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exit(1);
  }

  let profiles: Record<
    string,
    { repos: Array<{ path: string; branch: string }> }
  >;
  try {
    const raw = JSON.parse(readFileSync(configPath, "utf8")) as Record<
      string,
      unknown
    >;
    profiles = (raw.repo_profiles ?? {}) as typeof profiles;
  } catch (err) {
    const out: ErrorOutput = {
      error: `Failed to parse config.json: ${err}`,
      step: "read-config",
    };
    process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exit(1);
    return;
  }

  const profile = profiles[opts.name];
  if (!profile) {
    const out: ErrorOutput = {
      error: `Profile "${opts.name}" not found. Available: ${Object.keys(profiles).join(", ")}`,
      step: "find-profile",
    };
    process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exit(1);
    return;
  }

  const results: SyncOutput[] = [];
  const errors: ErrorOutput[] = [];

  for (const repoRef of profile.repos) {
    const absolutePath = resolve(repoRoot(), repoRef.path);
    const parts = repoRef.path.split("/");
    const repoName = parts.pop() ?? "";
    const groupName = parts.pop() ?? "";

    if (!existsSync(absolutePath)) {
      errors.push({
        error: `Repository not found at ${absolutePath}. Clone it first.`,
        step: "check-path",
      });
      continue;
    }

    try {
      git(absolutePath, ["fetch", "origin"]);
      git(absolutePath, ["checkout", repoRef.branch]);
      git(absolutePath, ["pull", "origin", repoRef.branch]);

      let commit = "unknown";
      try {
        commit = git(absolutePath, ["rev-parse", "--short", "HEAD"]);
      } catch {
        // non-fatal
      }

      results.push({
        repo: repoName,
        group: groupName,
        branch: repoRef.branch,
        commit,
        path: absolutePath,
      });
    } catch (err) {
      errors.push({
        error: `Sync failed for ${repoRef.path}@${repoRef.branch}: ${err instanceof Error ? err.message : String(err)}`,
        step: "sync",
      });
    }
  }

  const output = { profile: opts.name, synced: results, errors };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

  if (errors.length > 0 && results.length === 0) {
    process.exit(1);
  }
}

export const program = createCli({
  name: "repo-sync",
  description: "克隆或更新源码仓库到本地",
  rootAction: {
    options: [
      { flag: "--url <git-url>", description: "Git repository URL" },
      { flag: "--branch <branch>", description: "Branch to check out" },
      { flag: "--project <name>", description: "Project name" },
      {
        flag: "--base-dir <dir>",
        description:
          "Base directory for repositories (overrides project default)",
      },
    ],
    action: runSync,
  },
  commands: [
    {
      name: "sync-profile",
      description: "Sync all repositories in a named profile from config.json",
      options: [
        {
          flag: "--name <name>",
          description: "Profile name (e.g. 岚图)",
          required: true,
        },
      ],
      action: runSyncProfile,
    },
  ],
});
