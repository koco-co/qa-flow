/**
 * Parse allure-results/*-result.json into summary statistics.
 *
 * Allure Playwright reporter emits one `<uuid>-result.json` per test attempt.
 * Relevant fields consumed here:
 *  - `status`: "passed" | "failed" | "broken" | "skipped" | "unknown"
 *  - `name`: test case title
 *  - `fullName`: `file#suite title` (fallback when suite label missing)
 *  - `start`, `stop`: epoch millis
 *  - `statusDetails.message` / `trace`: failure detail
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export type AllureStatus =
  | "passed"
  | "failed"
  | "broken"
  | "skipped"
  | "unknown";

export interface FailedCase {
  title: string;
  message: string;
  spec: string;
}

export interface AllureStats {
  total: number;
  passed: number;
  failed: number;
  broken: number;
  skipped: number;
  unknown: number;
  durationMs: number;
  firstStart: number | null;
  lastStop: number | null;
  failedCases: FailedCase[];
}

interface AllureResult {
  status?: string;
  statusDetails?: { message?: string; trace?: string };
  name?: string;
  fullName?: string;
  start?: number;
  stop?: number;
  labels?: Array<{ name?: string; value?: string }>;
}

export interface CollectOptions {
  /** Only include result files with mtime >= this epoch millis (filters out stale files from earlier runs). */
  sinceMtimeMs?: number;
  /** Alternatively, exclude these result file basenames (snapshot taken before the run). */
  excludeFiles?: Set<string>;
}

/**
 * Scan an `allure-results` directory and aggregate stats.
 */
export function collectAllureStats(
  resultsDir: string,
  opts: CollectOptions = {},
): AllureStats {
  const stats: AllureStats = {
    total: 0,
    passed: 0,
    failed: 0,
    broken: 0,
    skipped: 0,
    unknown: 0,
    durationMs: 0,
    firstStart: null,
    lastStop: null,
    failedCases: [],
  };

  const entries = readdirSync(resultsDir);
  for (const entry of entries) {
    if (!entry.endsWith("-result.json")) continue;
    if (opts.excludeFiles?.has(entry)) continue;

    const full = join(resultsDir, entry);
    if (opts.sinceMtimeMs !== undefined) {
      const st = statSync(full);
      if (st.mtimeMs < opts.sinceMtimeMs) continue;
    }

    let result: AllureResult;
    try {
      result = JSON.parse(readFileSync(full, "utf8")) as AllureResult;
    } catch {
      continue; // skip malformed files
    }

    const status = normalizeStatus(result.status);
    stats.total += 1;
    stats[status] += 1;

    if (typeof result.start === "number" && typeof result.stop === "number") {
      stats.durationMs += Math.max(0, result.stop - result.start);
      stats.firstStart =
        stats.firstStart === null
          ? result.start
          : Math.min(stats.firstStart, result.start);
      stats.lastStop =
        stats.lastStop === null
          ? result.stop
          : Math.max(stats.lastStop, result.stop);
    }

    if (status === "failed" || status === "broken") {
      stats.failedCases.push({
        title: result.name ?? "(未命名用例)",
        message: firstLine(result.statusDetails?.message ?? ""),
        spec: extractSpec(result),
      });
    }
  }

  return stats;
}

/**
 * Snapshot the set of existing `*-result.json` file names.
 * Use `excludeFiles` option in `collectAllureStats` afterwards to only count new results.
 */
export function snapshotResultFiles(resultsDir: string): Set<string> {
  try {
    return new Set(
      readdirSync(resultsDir).filter((f) => f.endsWith("-result.json")),
    );
  } catch {
    return new Set();
  }
}

function normalizeStatus(raw: string | undefined): AllureStatus {
  switch (raw) {
    case "passed":
    case "failed":
    case "broken":
    case "skipped":
      return raw;
    default:
      return "unknown";
  }
}

function firstLine(s: string): string {
  const line = s.split("\n").find((l) => l.trim().length > 0) ?? "";
  return line.length > 160 ? `${line.slice(0, 157)}...` : line;
}

function extractSpec(r: AllureResult): string {
  // fullName format: "<spec path>#<suite> <title>" or plain
  if (r.fullName) {
    const hashIdx = r.fullName.indexOf("#");
    return hashIdx > 0 ? r.fullName.slice(0, hashIdx) : r.fullName;
  }
  const suiteLabel = r.labels?.find((l) => l.name === "suite")?.value;
  return suiteLabel ?? "";
}
