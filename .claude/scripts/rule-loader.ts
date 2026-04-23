#!/usr/bin/env bun
/**
 * rule-loader.ts — 一次性加载并合并多级规则，输出 JSON。
 * Usage:
 *   bun run .claude/scripts/rule-loader.ts load --project <name>
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { createCli } from "./lib/cli-runner.ts";
import { getEnv } from "./lib/env.ts";
import { repoRoot, projectRulesDir } from "./lib/paths.ts";

type RuleMap = Record<string, Record<string, string>>;

function globalRulesDir(): string {
  const override = getEnv("QA_RULES_DIR");
  if (override) return override;
  return resolve(repoRoot(), "rules");
}

/**
 * Parse key/value pairs from a .md rule file.
 * Skips lines starting with #, >, ( and blank lines.
 * Splits on first : to get key/value.
 */
function parseRuleFile(content: string): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#") || line.startsWith(">") || line.startsWith("(")) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (!key) continue;
    entries[key] = value;
  }
  return entries;
}

/**
 * Load all .md files from a directory and parse them into a rule map.
 * Returns an object keyed by filename without the .md extension.
 */
function loadRulesFromDir(dir: string): RuleMap {
  if (!existsSync(dir)) return {};
  const result: RuleMap = {};
  try {
    const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const key = basename(file, ".md");
      try {
        const content = readFileSync(join(dir, file), "utf8");
        result[key] = parseRuleFile(content);
      } catch {
        // skip unreadable files
      }
    }
  } catch {
    // skip unreadable directory
  }
  return result;
}

/**
 * Deep merge two rule maps. Project-level values override global values.
 */
function mergeRuleMaps(global: RuleMap, project: RuleMap): RuleMap {
  const merged: RuleMap = {};
  const allKeys = new Set([...Object.keys(global), ...Object.keys(project)]);
  for (const key of allKeys) {
    merged[key] = {
      ...(global[key] ?? {}),
      ...(project[key] ?? {}),
    };
  }
  return merged;
}

function loadRules(projectName: string): RuleMap {
  const globalDir = globalRulesDir();
  const projectDir = projectRulesDir(projectName);

  const globalRules = loadRulesFromDir(globalDir);
  const projectRules = loadRulesFromDir(projectDir);

  return mergeRuleMaps(globalRules, projectRules);
}

function runLoad(opts: { project: string }): void {
  const merged = loadRules(opts.project);
  process.stdout.write(JSON.stringify(merged, null, 2) + "\n");
}

export const program = createCli({
  name: "rule-loader",
  description: "Load and merge multi-level rules, output JSON",
  commands: [
    {
      name: "load",
      description: "Load rules for a project and output merged JSON to stdout",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
      ],
      action: runLoad,
    },
  ],
});

if (import.meta.main) {
  program.parse(process.argv);
}
