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
import { Command } from "commander";
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

// ─── CLI ─────────────────────────────────────────────────────────────────────

const program = new Command("repo-profile");
program.description("Manage repo profiles for source code mapping");

program
  .command("match")
  .description("Match a repo profile by keyword in text")
  .requiredOption("--text <text>", "Text to search for profile keywords")
  .action((opts: { text: string }) => {
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
  });

program
  .command("save")
  .description("Save or update a repo profile in config.json")
  .requiredOption("--name <name>", "Profile name")
  .requiredOption("--repos <json>", "Repos JSON array")
  .action((opts: { name: string; repos: string }) => {
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
  });

program
  .command("list")
  .description("List all repo profiles")
  .action(() => {
    const config = readConfig();
    const profiles = getProfiles(config);
    const entries = Object.entries(profiles).map(([name, profile]) => ({
      name,
      repo_count: profile.repos.length,
      repos: profile.repos,
    }));
    process.stdout.write(`${JSON.stringify(entries, null, 2)}\n`);
  });

program.parse(process.argv);
