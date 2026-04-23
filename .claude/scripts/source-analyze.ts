#!/usr/bin/env bun
/**
 * source-analyze.ts — 批量搜索源码仓库，返回结构化分析结果。
 * Usage:
 *   kata-cli source-analyze analyze --repo <path> --keywords "kw1,kw2"
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { createCli } from "./lib/cli-runner.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchResult {
  file: string;
  line: number;
  content: string;
  keyword: string;
  confidence: number;
}

interface AnalyzeOutput {
  a_level: MatchResult[];
  b_level: MatchResult[];
  coverage_rate: number;
  searched_files: number;
  matched_files: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPPORTED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".java",
  ".vue",
  ".py",
]);

const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "build"]);

const MAX_RESULTS_PER_LEVEL = 50;

// ─── File traversal ───────────────────────────────────────────────────────────

function collectFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(current: string): void {
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry)) continue;

      const fullPath = join(current, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (stat.isFile() && SUPPORTED_EXTENSIONS.has(extname(entry))) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

// ─── Match classification ─────────────────────────────────────────────────────

/**
 * A-level patterns: definition-level matches.
 * Returns true if the line is a definition for the given keyword.
 */
function isALevel(line: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`\\bfunction\\s+${escaped}\\b`),
    new RegExp(`\\bclass\\s+${escaped}\\b`),
    new RegExp(`\\binterface\\s+${escaped}\\b`),
    new RegExp(`\\bexport\\b.*\\b${escaped}\\b`),
    new RegExp(`\\bdef\\s+${escaped}\\b`),
  ];
  return patterns.some((p) => p.test(line));
}

// ─── Core analyze logic ───────────────────────────────────────────────────────

function analyzeRepo(repoPath: string, keywords: string[]): AnalyzeOutput {
  if (!existsSync(repoPath)) {
    throw new Error(`Repo path does not exist: ${repoPath}`);
  }

  const allFiles = collectFiles(repoPath);
  const searchedFiles = allFiles.length;

  const aLevelAll: MatchResult[] = [];
  const bLevelAll: MatchResult[] = [];
  const matchedFileSet = new Set<string>();

  for (const filePath of allFiles) {
    let content: string;
    try {
      content = readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    const lines = content.split("\n");
    const relPath = relative(repoPath, filePath);
    let fileMatched = false;

    for (let i = 0; i < lines.length; i++) {
      const lineContent = lines[i];
      const lineNumber = i + 1;

      for (const keyword of keywords) {
        if (!lineContent.includes(keyword)) continue;

        fileMatched = true;

        if (isALevel(lineContent, keyword)) {
          aLevelAll.push({
            file: relPath,
            line: lineNumber,
            content: lineContent.trim(),
            keyword,
            confidence: 0.95,
          });
        } else {
          bLevelAll.push({
            file: relPath,
            line: lineNumber,
            content: lineContent.trim(),
            keyword,
            confidence: 0.6,
          });
        }
      }
    }

    if (fileMatched) {
      matchedFileSet.add(filePath);
    }
  }

  const sortByConfidence = (a: MatchResult, b: MatchResult): number =>
    b.confidence - a.confidence;

  const aLevel = aLevelAll
    .sort(sortByConfidence)
    .slice(0, MAX_RESULTS_PER_LEVEL);

  const bLevel = bLevelAll
    .sort(sortByConfidence)
    .slice(0, MAX_RESULTS_PER_LEVEL);

  const matchedFiles = matchedFileSet.size;
  const coverageRate = searchedFiles === 0 ? 0 : matchedFiles / searchedFiles;

  return {
    a_level: aLevel,
    b_level: bLevel,
    coverage_rate: coverageRate,
    searched_files: searchedFiles,
    matched_files: matchedFiles,
  };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

function runAnalyze(opts: { repo: string; keywords: string }): void {
  const keywords = opts.keywords
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  let result: AnalyzeOutput;
  try {
    result = analyzeRepo(opts.repo, keywords);
  } catch (error) {
    process.stderr.write(
      `[source-analyze] Error: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
    return;
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

export const program = createCli({
  name: "source-analyze",
  description: "批量搜索源码仓库，返回结构化分析结果",
  commands: [
    {
      name: "analyze",
      description: "Analyze a repo directory for keyword matches",
      options: [
        { flag: "--repo <path>", description: "Path to the source code repository", required: true },
        { flag: "--keywords <keywords>", description: "Comma-separated list of keywords to search", required: true },
      ],
      action: runAnalyze,
    },
  ],
});
