#!/usr/bin/env npx tsx
/**
 * config.ts — Outputs merged workspace config JSON to stdout.
 *
 * Usage:
 *   npx tsx .claude/scripts/config.ts
 *   npx tsx .claude/scripts/config.ts --help
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Command } from "commander";
import { getEnv, initEnv } from "./lib/env.ts";
import { pluginsDir } from "./lib/paths.ts";

interface PluginJson {
  description?: string;
  commands?: Record<string, string>;
  env_required?: string[];
  env_required_any?: string[];
  url_patterns?: string[];
  [key: string]: unknown;
}

interface PluginEntry {
  active: boolean;
  description: string;
  commands: Record<string, string>;
}

interface ConfigOutput {
  workspace_dir: string;
  source_repos: string[];
  plugins: Record<string, PluginEntry>;
}

function isPluginActive(plugin: PluginJson): boolean {
  if (plugin.env_required && plugin.env_required.length > 0) {
    return plugin.env_required.every((key) => {
      const val = getEnv(key);
      return val !== undefined && val !== "";
    });
  }
  if (plugin.env_required_any && plugin.env_required_any.length > 0) {
    return plugin.env_required_any.some((key) => {
      const val = getEnv(key);
      return val !== undefined && val !== "";
    });
  }
  return true;
}

function scanPlugins(dir: string): Record<string, PluginEntry> {
  const plugins: Record<string, PluginEntry> = {};

  if (!existsSync(dir)) {
    process.stderr.write(`[config] plugins dir not found: ${dir}\n`);
    return plugins;
  }

  let entries: string[];
  try {
    entries = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch (err) {
    process.stderr.write(`[config] failed to read plugins dir: ${err}\n`);
    return plugins;
  }

  for (const name of entries) {
    const pluginJsonPath = join(dir, name, "plugin.json");
    if (!existsSync(pluginJsonPath)) {
      process.stderr.write(`[config] skipping plugin "${name}": no plugin.json\n`);
      continue;
    }

    let plugin: PluginJson;
    try {
      plugin = JSON.parse(readFileSync(pluginJsonPath, "utf8")) as PluginJson;
    } catch (err) {
      process.stderr.write(`[config] failed to parse plugin.json for "${name}": ${err}\n`);
      continue;
    }

    plugins[name] = {
      active: isPluginActive(plugin),
      description: plugin.description ?? "",
      commands: plugin.commands ?? {},
    };
  }

  return plugins;
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

  return {
    workspace_dir: workspaceDir,
    source_repos: sourceRepos,
    plugins,
  };
}

const program = new Command();

program
  .name("config")
  .description("Output merged workspace config JSON (reads .env + scans plugins/)")
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
