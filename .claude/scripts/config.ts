#!/usr/bin/env bun
/**
 * config.ts — Outputs merged workspace config JSON to stdout.
 *
 * Usage:
 *   kata-cli config show
 *   kata-cli config --help
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createCli } from "./lib/cli-runner.ts";
import { getEnv } from "./lib/env.ts";
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

interface ProjectConfig {
  repo_profiles: RepoProfiles;
}

interface ConfigOutput {
  workspace_dir: string;
  source_repos: string[];
  plugins: Record<string, PluginEntry>;
  projects: Record<string, ProjectConfig>;
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

function readProjectConfigs(): Record<string, ProjectConfig> {
  const configPath = join(repoRoot(), "config.json");
  if (!existsSync(configPath)) return {};
  try {
    const raw = JSON.parse(readFileSync(configPath, "utf8")) as Record<
      string,
      unknown
    >;
    return (raw.projects ?? {}) as Record<string, ProjectConfig>;
  } catch (err) {
    process.stderr.write(`[config] failed to parse config.json: ${err}\n`);
    return {};
  }
}

function buildConfig(): ConfigOutput {
  const workspaceDir = getEnv("WORKSPACE_DIR") ?? "workspace";
  const sourceReposRaw = getEnv("SOURCE_REPOS") ?? "";
  const sourceRepos = sourceReposRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const plugins = scanPlugins(pluginsDir());
  const projects = readProjectConfigs();

  return {
    workspace_dir: workspaceDir,
    source_repos: sourceRepos,
    plugins,
    projects,
  };
}

function runShow(): void {
  try {
    const config = buildConfig();
    process.stdout.write(`${JSON.stringify(config, null, 2)}\n`);
  } catch (err) {
    process.stderr.write(`[config] error: ${err}\n`);
    process.exit(1);
  }
}

export const program = createCli({
  name: "config",
  description:
    "Output merged workspace config JSON (reads .env + scans plugins/)",
  rootAction: {
    action: () => runShow(),
  },
});
