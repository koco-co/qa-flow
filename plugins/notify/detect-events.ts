#!/usr/bin/env bun
/**
 * kata notify event detector — scans git diff for workspace artifacts
 * and fires matching notification events.
 *
 * Designed to run as a Claude Code Stop hook (before auto-commit).
 *
 * Usage:
 *   bun run plugins/notify/detect-events.ts
 *   bun run plugins/notify/detect-events.ts --dry-run
 */

import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initEnv } from "../../.claude/scripts/lib/env.ts";
import {
  detectChannels,
  isEmailEnabled,
  sendNotification,
  type EventType,
  type NotifyData,
} from "./send.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");

// ── Types ───────────────────────────────────────────────────────────────────

export interface DetectedEvent {
  event: EventType;
  data: NotifyData;
}

interface PatternRule {
  pattern: RegExp;
  event: EventType;
  /** When true, only count newly added files (not modifications). */
  addedOnly?: boolean;
  extract: (files: string[]) => NotifyData;
}

// ── Pattern Rules ───────────────────────────────────────────────────────────

const PATTERN_RULES: readonly PatternRule[] = [
  {
    pattern: /^workspace\/[^/]+\/xmind\/\d{6}\/.*\.xmind$/,
    event: "case-generated",
    extract: (files) => ({
      count: files.length,
      file: files.join(", "),
    }),
  },
  {
    pattern: /^workspace\/[^/]+\/reports\/bugs\/\d{8}\/.*\.html$/,
    event: "bug-report",
    extract: (files) => ({
      reportFile: files.join(", "),
      summary: `${files.length} report(s)`,
    }),
  },
  {
    pattern: /^workspace\/[^/]+\/reports\/conflicts\/\d{8}\/.*\.html$/,
    event: "conflict-analyzed",
    extract: (files) => ({
      reportFile: files.join(", "),
      conflictCount: files.length,
    }),
  },
  {
    pattern: /^workspace\/[^/]+\/reports\/playwright\/\d{8}\//,
    event: "ui-test-completed",
    extract: (files) => ({
      reportFile: files[0],
    }),
  },
  {
    pattern: /^workspace\/[^/]+\/archive\/\d{6}\/(?!tmp\/).*\.md$/,
    event: "archive-converted",
    addedOnly: true,
    extract: (files) => ({
      fileCount: files.length,
    }),
  },
];

// ── Detection Logic ─────────────────────────────────────────────────────────

export interface ChangedFile {
  path: string;
  /** True for newly added/untracked files; false for modifications/renames. */
  added: boolean;
}

export function getChangedFiles(cwd: string): ChangedFile[] {
  try {
    // --porcelain=v1 with -z gives stable, NUL-separated output with status flags.
    const output = execSync("git status --porcelain=v1 --untracked-files=all", {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const seen = new Map<string, boolean>();
    for (const line of output.split("\n")) {
      if (!line) continue;
      // Format: "XY path" where X=index status, Y=worktree status
      const xy = line.slice(0, 2);
      const path = line.slice(3).trim();
      if (!path) continue;
      // Added if untracked (??) or index-add (A in either column)
      const added = xy === "??" || xy.includes("A");
      // If both added and modified entries exist for same path, "added" wins
      if (!seen.has(path) || added) {
        seen.set(path, added);
      }
    }
    return [...seen.entries()].map(([path, added]) => ({ path, added }));
  } catch {
    return [];
  }
}

export function matchEvents(changedFiles: readonly ChangedFile[]): DetectedEvent[] {
  const raw: DetectedEvent[] = [];

  for (const rule of PATTERN_RULES) {
    const matched = changedFiles
      .filter((f) => rule.pattern.test(f.path))
      .filter((f) => (rule.addedOnly ? f.added : true))
      .map((f) => f.path);
    if (matched.length > 0) {
      raw.push({
        event: rule.event,
        data: rule.extract(matched),
      });
    }
  }

  // When both xmind and archive are detected, merge into case-generated
  // (test-case-gen produces both simultaneously)
  const hasXmind = raw.some((e) => e.event === "case-generated");
  const archiveIdx = raw.findIndex((e) => e.event === "archive-converted");

  if (hasXmind && archiveIdx !== -1) {
    const caseEvent = raw.find((e) => e.event === "case-generated")!;
    const archiveEvent = raw[archiveIdx];
    caseEvent.data = {
      ...caseEvent.data,
      archiveFile: (archiveEvent.data.files as string) ?? `${archiveEvent.data.fileCount} file(s)`,
    };
    return raw.filter((_, i) => i !== archiveIdx);
  }

  return raw;
}

export function hasAnyChannel(): boolean {
  const cfg = detectChannels();
  return Boolean(cfg.dingtalk || cfg.feishu || cfg.wecom || isEmailEnabled(cfg));
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  initEnv(resolve(ROOT, ".env"));

  // Silent skip when no channel is configured
  if (!dryRun && !hasAnyChannel()) {
    return;
  }

  const changedFiles = getChangedFiles(ROOT);
  if (changedFiles.length === 0) return;

  const events = matchEvents(changedFiles);
  if (events.length === 0) return;

  for (const { event, data } of events) {
    if (dryRun) {
      process.stderr.write(`[detect] would notify: ${event} ${JSON.stringify(data)}\n`);
    } else {
      await sendNotification(event, data);
    }
  }

  if (dryRun) {
    process.stdout.write(
      JSON.stringify({ detected: events.length, events: events.map((e) => e.event) }, null, 2) +
        "\n",
    );
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  main().catch((err: unknown) => {
    // Stop hooks must not block — swallow errors silently
    process.stderr.write(`[notify-detect] ${err}\n`);
  });
}
