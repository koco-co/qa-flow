import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getEnv } from "./env.ts";

export interface PluginJson {
  description?: string;
  commands?: Record<string, string>;
  env_required?: string[];
  env_required_any?: string[];
  url_patterns?: string[];
  [key: string]: unknown;
}

export interface LoadedPlugin {
  name: string;
  active: boolean;
  data: PluginJson;
}

export function isPluginActive(plugin: PluginJson): boolean {
  if (plugin.env_required && plugin.env_required.length > 0) {
    return plugin.env_required.every((key) => {
      const val = getEnv(key);
      return val !== undefined && val.trim() !== "";
    });
  }
  if (plugin.env_required_any && plugin.env_required_any.length > 0) {
    return plugin.env_required_any.some((key) => {
      const val = getEnv(key);
      return val !== undefined && val.trim() !== "";
    });
  }
  return true;
}

export function loadAllPlugins(dir: string): LoadedPlugin[] {
  const plugins: LoadedPlugin[] = [];
  if (!existsSync(dir)) return plugins;

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
      process.stderr.write(`[plugin] failed to parse ${pluginJsonPath}: ${err}\n`);
      continue;
    }

    plugins.push({ name, active: isPluginActive(data), data });
  }

  return plugins;
}
