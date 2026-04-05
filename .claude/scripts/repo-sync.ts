#!/usr/bin/env npx tsx
/**
 * repo-sync.ts — Sync source code repositories.
 *
 * Usage:
 *   npx tsx .claude/scripts/repo-sync.ts --url <git-url> --branch <branch> [--base-dir workspace/.repos]
 *   npx tsx .claude/scripts/repo-sync.ts --help
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { Command } from "commander";
import { parseGitUrl, repoRoot } from "./lib/paths.ts";

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
  return execSync(`git -C "${cwd}" ${args.join(" ")}`, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

function gitClone(url: string, targetDir: string): void {
  execSync(`git clone "${url}" "${targetDir}"`, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const program = new Command("repo-sync");
program
  .description("Clone or update a source code repository to a local directory")
  .requiredOption("--url <git-url>", "Git repository URL")
  .requiredOption("--branch <branch>", "Branch to check out")
  .option("--base-dir <dir>", "Base directory for repositories", "workspace/.repos")
  .action((opts: { url: string; branch: string; baseDir: string }) => {
    const { url, branch, baseDir } = opts;

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
  });

program.parse(process.argv);
