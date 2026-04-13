#!/usr/bin/env bun
/**
 * config.ts — Outputs merged workspace config JSON to stdout.
 *
 * Usage:
 *   bun run .claude/scripts/config.ts
 *   bun run .claude/scripts/config.ts --help
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Command } from "commander";
import { getEnv, initEnv } from "./lib/env.ts";
import { pluginsDir, repoRoot } from "./lib/paths.ts";
import { loadAllPlugins } from "./lib/plugin-utils.ts";

interface PluginEntry {
  active: boolean;
  description: string;
  commands: Record<string, string>;
}

interface RepoRef {
  path: string;
  branch: string;
}

interface RepoProfile {
  repos: RepoRef[];
}

type RepoProfiles = Record<string, RepoProfile>;

interface ConfigOutput {
  workspace_dir: string;
  source_repos: string[];
  plugins: Record<string, PluginEntry>;
  repo_profiles: RepoProfiles;
}

function scanPlugins(dir: string): Record<string, PluginEntry> {
  const loaded = loadAllPlugins(dir);
  const plugins: Record<string, PluginEntry> = {};
  for (const p of loaded) {
    plugins[p.name] = {
      active: p.active,
      description: p.data.description ?? "",
      commands: p.data.commands ?? {},
    };
  }
  return plugins;
}

function readRepoProfiles(): RepoProfiles {
  const configPath = join(repoRoot(), "config.json");
  if (!existsSync(configPath)) return {};
  try {
    const raw = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
    return (raw.repo_profiles ?? {}) as RepoProfiles;
  } catch (err) {
    process.stderr.write(`[config] failed to parse config.json: ${err}\n`);
    return {};
  }
}

function buildConfig(): ConfigOutput {
  initEnv();

  const workspaceDir = getEnv("WORKSPACE_DIR") ?? "workspace";
  const sourceReposRaw = getEnv("SOURCE_REPOS") ?? "";
  const sourceRepos = sourceReposRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const plugins = scanPlugins(pluginsDir());
  const repoProfiles = readRepoProfiles();

  return {
    workspace_dir: workspaceDir,
    source_repos: sourceRepos,
    plugins,
    repo_profiles: repoProfiles,
  };
}

const program = new Command();

program
  .name("config")
  .description(
    "Output merged workspace config JSON (reads .env + scans plugins/)",
  )
  .helpOption("-h, --help", "Display help information")
  .action(() => {
    try {
      const config = buildConfig();
      process.stdout.write(`${JSON.stringify(config, null, 2)}\n`);
    } catch (err) {
      process.stderr.write(`[config] error: ${err}\n`);
      process.exit(1);
    }
  });

program.parse(process.argv);
