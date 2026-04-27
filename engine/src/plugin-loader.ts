#!/usr/bin/env bun
/**
 * plugin-loader.ts — Plugin discovery and dispatch CLI.
 *
 * Usage:
 *   kata-cli plugin-loader list
 *   kata-cli plugin-loader check --input "https://lanhuapp.com/..."
 *   kata-cli plugin-loader resolve --url "https://lanhuapp.com/..."
 *   kata-cli plugin-loader notify --event case-generated --data '{"count":42}'
 *   kata-cli plugin-loader notify --event ui-test-completed --data '{"reportFile":"workspace/.../allure-report/index.html"}'
 *   kata-cli plugin-loader --help
 */

import { createCli } from "./lib/cli-runner.ts";
import { getEnv } from "./lib/env.ts";
import { pluginsDir } from "./lib/paths.ts";
import { loadAllPlugins } from "./lib/plugin-utils.ts";

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function matchesUrlPattern(url: string, patterns: string[]): boolean {
  return patterns.some((pattern) => url.includes(pattern));
}

// ── list ──────────────────────────────────────────────────────────────────────

function runList(): void {
  const plugins = loadAllPlugins(pluginsDir());
  const output = plugins.map(({ name, active, data }) => ({
    name,
    active,
    description: data.description ?? "",
  }));

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

// ── check ─────────────────────────────────────────────────────────────────────

function runCheck(opts: { input: string }): void {
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
}

// ── resolve ───────────────────────────────────────────────────────────────────

function runResolve(opts: { url: string }): void {
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
          JSON.stringify(
            { error: `Plugin "${plugin.name}" has no fetch command` },
            null,
            2,
          ) + "\n",
        );
        process.exit(1);
      }

      const command = fetchCmd
        .replace(/\{\{url\}\}/g, shellEscape(opts.url))
        .replace(/\{\{output\}\}/g, shellEscape(`${workspaceDir}/../.kata/plugin-output`));

      process.stdout.write(
        `${JSON.stringify({ plugin: plugin.name, command }, null, 2)}\n`,
      );
      return;
    }
  }

  process.stdout.write(
    `${JSON.stringify({ error: "No matching plugin" }, null, 2)}\n`,
  );
  process.exit(1);
}

// ── notify ────────────────────────────────────────────────────────────────────

function runNotify(opts: { event: string; data: string }): void {
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
      JSON.stringify(
        { skipped: true, reason: "notify plugin has no send command" },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  const command = sendCmd
    .replace(/\{\{event\}\}/g, shellEscape(opts.event))
    .replace(/\{\{json\}\}/g, shellEscape(opts.data));

  process.stdout.write(
    `${JSON.stringify({ plugin: "notify", command }, null, 2)}\n`,
  );
}

export const program = createCli({
  name: "plugin-loader",
  description: "Plugin discovery and dispatch for kata",
  commands: [
    {
      name: "list",
      description: "List all discovered plugins with their active status",
      action: () => runList(),
    },
    {
      name: "check",
      description: "Check if an input URL matches any active plugin's url_patterns",
      options: [
        {
          flag: "--input <url>",
          description: "URL to check against active plugins",
          required: true,
        },
      ],
      action: runCheck,
    },
    {
      name: "resolve",
      description:
        "Resolve fetch command for a URL by matching active plugin url_patterns",
      options: [
        { flag: "--url <url>", description: "URL to resolve", required: true },
      ],
      action: runResolve,
    },
    {
      name: "notify",
      description: "Dispatch a notification event via the notify plugin",
      options: [
        {
          flag: "--event <event>",
          description: "Event type (e.g. case-generated)",
          required: true,
        },
        {
          flag: "--data <json>",
          description: "JSON payload for the event",
          required: true,
        },
      ],
      action: runNotify,
    },
  ],
});
