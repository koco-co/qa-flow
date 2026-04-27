#!/usr/bin/env bun
/**
 * search-filter.ts — 对 archive 搜索结果去重、排序、截断。
 * Usage:
 *   cat results.json | kata-cli search-filter filter --top 5
 *   kata-cli search-filter filter --input <file.json> --top 5
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createCli } from "./lib/cli-runner.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  path: string;
  suite_name: string;
  tags: string[];
  case_count: number;
}

interface FilteredResult {
  path: string;
  suite_name: string;
  case_count: number;
  preview: string;
}

// ─── Core Logic ───────────────────────────────────────────────────────────────

function deduplicateBySuiteName(results: SearchResult[]): SearchResult[] {
  const map = new Map<string, SearchResult>();
  for (const result of results) {
    const existing = map.get(result.suite_name);
    if (!existing || result.case_count > existing.case_count) {
      map.set(result.suite_name, result);
    }
  }
  return Array.from(map.values());
}

function sortByCountDesc(results: SearchResult[]): SearchResult[] {
  return [...results].sort((a, b) => b.case_count - a.case_count);
}

function truncateTopN(results: SearchResult[], n: number): SearchResult[] {
  return results.slice(0, n);
}

function readPreview(filePath: string): string {
  const absPath = resolve(filePath);
  if (!existsSync(absPath)) {
    return "";
  }
  try {
    const content = readFileSync(absPath, "utf8");
    const nonEmptyLines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    return nonEmptyLines.slice(0, 3).join("\n");
  } catch {
    return "";
  }
}

function applyFilter(results: SearchResult[], topN: number): FilteredResult[] {
  const deduped = deduplicateBySuiteName(results);
  const sorted = sortByCountDesc(deduped);
  const truncated = truncateTopN(sorted, topN);
  return truncated.map((r) => ({
    path: r.path,
    suite_name: r.suite_name,
    case_count: r.case_count,
    preview: readPreview(r.path),
  }));
}

// ─── Input Reading ────────────────────────────────────────────────────────────

function readInputFromFile(filePath: string): SearchResult[] {
  const absPath = resolve(filePath);
  if (!existsSync(absPath)) {
    return [];
  }
  try {
    const content = readFileSync(absPath, "utf8");
    return parseJsonArray(content);
  } catch {
    return [];
  }
}

function readInputFromStdin(): SearchResult[] {
  try {
    const content = readFileSync("/dev/stdin", "utf8");
    return parseJsonArray(content);
  } catch {
    return [];
  }
}

function parseJsonArray(raw: string): SearchResult[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as SearchResult[];
  } catch {
    return [];
  }
}

// ─── Command ──────────────────────────────────────────────────────────────────

async function runFilter(opts: {
  input?: string;
  top: number;
}): Promise<void> {
  const results =
    opts.input !== undefined
      ? readInputFromFile(opts.input)
      : readInputFromStdin();

  const filtered = applyFilter(results, opts.top);
  process.stdout.write(`${JSON.stringify(filtered, null, 2)}\n`);
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

export const program = createCli({
  name: "search-filter",
  description: "Deduplicate, sort, and truncate archive search results",
  commands: [
    {
      name: "filter",
      description:
        "Filter archive search results: deduplicate by suite_name, sort by case_count desc, truncate to top-N",
      options: [
        { flag: "--input <file>", description: "Path to JSON file with search results (default: stdin)" },
        { flag: "--top <n>", description: "Maximum number of results to return", defaultValue: "5" },
      ],
      action: async (opts: { input?: string; top: string }) => {
        const topN = parseInt(opts.top, 10);
        await runFilter({ input: opts.input, top: topN });
      },
    },
  ],
});
