#!/usr/bin/env npx tsx
/**
 * plugin-loader.ts — Plugin discovery and dispatch CLI.
 *
 * Usage:
 *   npx tsx .claude/scripts/plugin-loader.ts list
 *   npx tsx .claude/scripts/plugin-loader.ts check --input "https://lanhuapp.com/..."
 *   npx tsx .claude/scripts/plugin-loader.ts resolve --url "https://lanhuapp.com/..."
 *   npx tsx .claude/scripts/plugin-loader.ts notify --event case-generated --data '{"count":42}'
 *   npx tsx .claude/scripts/plugin-loader.ts --help
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

interface LoadedPlugin {
  name: string;
  active: boolean;
  data: PluginJson;
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

function loadAllPlugins(dir: string): LoadedPlugin[] {
  const plugins: LoadedPlugin[] = [];

  if (!existsSync(dir)) {
    return plugins;
  }

  let entries: string[];
  try {
    entries = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return plugins;
  }

  for (const name of entries) {
    const pluginJsonPath = join(dir, name, "plugin.json");
    if (!existsSync(pluginJsonPath)) continue;

    let data: PluginJson;
    try {
      data = JSON.parse(readFileSync(pluginJsonPath, "utf8")) as PluginJson;
    } catch (err) {
      process.stderr.write(`[plugin-loader] failed to parse plugin.json for "${name}": ${err}\n`);
      continue;
    }

    plugins.push({ name, active: isPluginActive(data), data });
  }

  return plugins;
}

function matchesUrlPattern(url: string, patterns: string[]): boolean {
  return patterns.some((pattern) => url.includes(pattern));
}

const program = new Command();

program
  .name("plugin-loader")
  .description("Plugin discovery and dispatch for qa-flow")
  .helpOption("-h, --help", "Display help information");

// ── list ──────────────────────────────────────────────────────────────────────

program
  .command("list")
  .description("List all discovered plugins with their active status")
  .action(() => {
    initEnv();

    const plugins = loadAllPlugins(pluginsDir());
    const output = plugins.map(({ name, active, data }) => ({
      name,
      active,
      description: data.description ?? "",
    }));

    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  });

// ── check ─────────────────────────────────────────────────────────────────────

program
  .command("check")
  .description("Check if an input URL matches any active plugin's url_patterns")
  .requiredOption("--input <url>", "URL to check against active plugins")
  .action((opts: { input: string }) => {
    initEnv();

    const plugins = loadAllPlugins(pluginsDir());

    for (const plugin of plugins) {
      if (!plugin.active) continue;
      const patterns = plugin.data.url_patterns ?? [];
      if (matchesUrlPattern(opts.input, patterns)) {
        process.stdout.write(
          `${JSON.stringify({ matched: true, plugin: plugin.name }, null, 2)}\n`,
        );
        return;
      }
    }

    process.stdout.write(`${JSON.stringify({ matched: false }, null, 2)}\n`);
  });

// ── resolve ───────────────────────────────────────────────────────────────────

program
  .command("resolve")
  .description("Resolve fetch command for a URL by matching active plugin url_patterns")
  .requiredOption("--url <url>", "URL to resolve")
  .action((opts: { url: string }) => {
    initEnv();

    const plugins = loadAllPlugins(pluginsDir());
    const workspaceDir = getEnv("WORKSPACE_DIR") ?? "workspace";

    for (const plugin of plugins) {
      if (!plugin.active) continue;
      const patterns = plugin.data.url_patterns ?? [];
      if (matchesUrlPattern(opts.url, patterns)) {
        const fetchCmd = plugin.data.commands?.fetch ?? "";
        if (!fetchCmd) {
          process.stderr.write(
            `[plugin-loader] plugin "${plugin.name}" matched but has no fetch command\n`,
          );
          process.stdout.write(
            JSON.stringify({ error: `Plugin "${plugin.name}" has no fetch command` }, null, 2) +
              "\n",
          );
          process.exit(1);
        }

        const command = fetchCmd
          .replace(/\{\{url\}\}/g, opts.url)
          .replace(/\{\{output\}\}/g, `${workspaceDir}/.temp`);

        process.stdout.write(`${JSON.stringify({ plugin: plugin.name, command }, null, 2)}\n`);
        return;
      }
    }

    process.stdout.write(`${JSON.stringify({ error: "No matching plugin" }, null, 2)}\n`);
    process.exit(1);
  });

// ── notify ────────────────────────────────────────────────────────────────────

program
  .command("notify")
  .description("Dispatch a notification event via the notify plugin")
  .requiredOption("--event <event>", "Event type (e.g. case-generated)")
  .requiredOption("--data <json>", "JSON payload for the event")
  .action((opts: { event: string; data: string }) => {
    initEnv();

    const plugins = loadAllPlugins(pluginsDir());
    const notifyPlugin = plugins.find((p) => p.name === "notify");

    if (!notifyPlugin?.active) {
      process.stdout.write(
        `${JSON.stringify({ skipped: true, reason: "notify plugin not active" }, null, 2)}\n`,
      );
      return;
    }

    const sendCmd = notifyPlugin.data.commands?.send ?? "";
    if (!sendCmd) {
      process.stdout.write(
        JSON.stringify({ skipped: true, reason: "notify plugin has no send command" }, null, 2) +
          "\n",
      );
      return;
    }

    const command = sendCmd
      .replace(/\{\{event\}\}/g, opts.event)
      .replace(/\{\{json\}\}/g, opts.data);

    process.stdout.write(`${JSON.stringify({ plugin: "notify", command }, null, 2)}\n`);
  });

program.parse(process.argv);
