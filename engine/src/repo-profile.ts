#!/usr/bin/env bun
/**
 * repo-profile.ts — Repo profile management for transform node.
 *
 * Commands:
 *   match  --text <text>         Match a profile by keyword in text
 *   save   --name <n> --repos <json>  Save/update a profile in config.json
 *   list                         List all profiles
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCli } from "./lib/cli-runner.ts";
import { repoRoot } from "./lib/paths.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RepoRef {
  path: string;
  branch: string;
}

interface RepoProfile {
  repos: RepoRef[];
}

type RepoProfiles = Record<string, RepoProfile>;

interface ConfigJson {
  repo_profiles?: RepoProfiles;
  [key: string]: unknown;
}

interface MatchOutput {
  matched: boolean;
  profile_name: string | null;
  repos: RepoRef[];
  all_profiles: string[];
}

// ─── Config I/O ──────────────────────────────────────────────────────────────

function configPath(): string {
  return join(repoRoot(), "config.json");
}

function readConfig(): ConfigJson {
  const p = configPath();
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf8")) as ConfigJson;
  } catch {
    return {};
  }
}

function writeConfig(config: ConfigJson): void {
  writeFileSync(configPath(), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function getProfiles(config: ConfigJson): RepoProfiles {
  return config.repo_profiles ?? {};
}

// ─── Match Logic ─────────────────────────────────────────────────────────────

function matchProfile(text: string, profiles: RepoProfiles): { name: string; profile: RepoProfile } | null {
  const lowerText = text.toLowerCase();
  for (const [name, profile] of Object.entries(profiles)) {
    if (lowerText.includes(name.toLowerCase())) {
      return { name, profile };
    }
  }
  return null;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function runMatch(opts: { text: string }): void {
  const config = readConfig();
  const profiles = getProfiles(config);
  const result = matchProfile(opts.text, profiles);
  const output: MatchOutput = {
    matched: result !== null,
    profile_name: result?.name ?? null,
    repos: result?.profile.repos ?? [],
    all_profiles: Object.keys(profiles),
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

function runSave(opts: { name: string; repos: string }): void {
  let repos: RepoRef[];
  try {
    repos = JSON.parse(opts.repos) as RepoRef[];
  } catch {
    process.stderr.write(`[repo-profile:save] invalid --repos JSON\n`);
    process.exit(1);
    return;
  }
  const config = readConfig();
  const profiles = getProfiles(config);
  const updated: ConfigJson = {
    ...config,
    repo_profiles: { ...profiles, [opts.name]: { repos } },
  };
  writeConfig(updated);
  process.stdout.write(`${JSON.stringify({ saved: opts.name, repos }, null, 2)}\n`);
}

function runList(): void {
  const config = readConfig();
  const profiles = getProfiles(config);
  const entries = Object.entries(profiles).map(([name, profile]) => ({
    name,
    repo_count: profile.repos.length,
    repos: profile.repos,
  }));
  process.stdout.write(`${JSON.stringify(entries, null, 2)}\n`);
}

export const program = createCli({
  name: "repo-profile",
  description: "Manage repo profiles for source code mapping",
  commands: [
    {
      name: "match",
      description: "Match a repo profile by keyword in text",
      options: [
        {
          flag: "--text <text>",
          description: "Text to search for profile keywords",
          required: true,
        },
      ],
      action: runMatch,
    },
    {
      name: "save",
      description: "Save or update a repo profile in config.json",
      options: [
        { flag: "--name <name>", description: "Profile name", required: true },
        { flag: "--repos <json>", description: "Repos JSON array", required: true },
      ],
      action: runSave,
    },
    {
      name: "list",
      description: "List all repo profiles",
      action: () => runList(),
    },
  ],
});
