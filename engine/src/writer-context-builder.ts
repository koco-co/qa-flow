#!/usr/bin/env bun
/**
 * writer-context-builder.ts — 按模块切分 PRD，为每个 writer 构建精简上下文。
 *
 * Usage:
 *   主路径 (enhanced.md):
 *     kata-cli writer-context-builder build \
 *       --project <name> --yyyymm <ym> --prd-slug <slug> \
 *       --test-points <path> --writer-id <module> [--rules <path>] \
 *       [--workspace-dir <dir>] [--strategy-id <id>] \
 *       [--knowledge-injection <mode>]
 *
 *   legacy (任意 PRD 文件):
 *     kata-cli writer-context-builder build \
 *       --prd <path> --test-points <path> --writer-id <module> [--rules <path>] \
 *       [--strategy-id <id>] [--knowledge-injection <mode>] [--project <name>]
 */

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { isAbsolute, join, resolve } from "node:path";
import { createCli } from "./lib/cli-runner.ts";
import { repoRoot } from "./lib/paths.ts";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TestPointModule {
  name: string;
  test_points: unknown[];
}

interface TestPointsJson {
  modules: TestPointModule[];
}

interface KnowledgePayload {
  core?: { overview: string; terms: string };
  module?: { frontmatter: Record<string, unknown>; content: string };
}

interface WriterContext {
  writer_id: string;
  module_prd_section: string;
  test_points: unknown[];
  rules: Record<string, unknown>;
  strategy_id: string;
  knowledge: KnowledgePayload;
  fallback: boolean;
}

// ─── PRD parsing ───────────────────────────────────────────────────────────────

/**
 * Splits a PRD markdown string into sections keyed by their `##` heading.
 * Returns an array of { heading, content } pairs in document order.
 */
function splitPrdIntoModules(prd: string): Array<{ heading: string; content: string }> {
  const lines = prd.split("\n");
  const modules: Array<{ heading: string; content: string }> = [];
  let current: { heading: string; lines: string[] } | null = null;

  for (const line of lines) {
    if (/^## /.test(line)) {
      if (current !== null) {
        modules.push({
          heading: current.heading,
          content: current.lines.join("\n").trimEnd(),
        });
      }
      current = { heading: line.slice(3).trim(), lines: [line] };
    } else if (current !== null) {
      current.lines.push(line);
    }
  }

  if (current !== null) {
    modules.push({
      heading: current.heading,
      content: current.lines.join("\n").trimEnd(),
    });
  }

  return modules;
}

/**
 * Fuzzy-match: returns the first module whose heading contains writerId (or
 * whose writerId contains the heading). Case-insensitive substring match.
 */
function findMatchingModule(
  modules: Array<{ heading: string; content: string }>,
  writerId: string,
): { heading: string; content: string } | null {
  const lower = writerId.toLowerCase();
  return (
    modules.find(
      (m) =>
        m.heading.toLowerCase().includes(lower) ||
        lower.includes(m.heading.toLowerCase()),
    ) ?? null
  );
}

// ─── Test-points filtering ─────────────────────────────────────────────────────

function filterTestPoints(tp: TestPointsJson, writerId: string): unknown[] {
  const lower = writerId.toLowerCase();
  const matched = tp.modules.find(
    (m) =>
      m.name.toLowerCase().includes(lower) ||
      lower.includes(m.name.toLowerCase()),
  );
  return matched?.test_points ?? [];
}

// ─── Knowledge injection ───────────────────────────────────────────────────────

const KNOWLEDGE_TRUNCATE_LIMIT = 8 * 1024; // 8KB

function truncateString(s: string, limit: number): string {
  if (s.length <= limit) return s;
  return s.slice(0, limit);
}

function invokeKnowledgeKeeper(args: string[]): unknown | null {
  const result = spawnSync(
    "kata-cli",
    ["knowledge-keeper", ...args],
    {
      encoding: "utf8",
      cwd: repoRoot(),
    },
  );
  if (result.status !== 0) return null;
  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}

function readKnowledgeCore(
  project: string,
): { overview: string; terms: string } | null {
  const result = invokeKnowledgeKeeper([
    "read-core",
    "--project",
    project,
  ]) as {
    overview?: { content?: string } | string;
    terms?: unknown;
  } | null;
  if (!result) return null;

  const overviewContent =
    typeof result.overview === "string"
      ? result.overview
      : result.overview && typeof result.overview === "object" && "content" in result.overview
        ? String(result.overview.content ?? "")
        : "";
  const termsStr = JSON.stringify(result.terms ?? []);

  return {
    overview: truncateString(overviewContent, KNOWLEDGE_TRUNCATE_LIMIT),
    terms: truncateString(termsStr, KNOWLEDGE_TRUNCATE_LIMIT),
  };
}

function readKnowledgeModule(
  project: string,
  moduleKebab: string,
): { frontmatter: Record<string, unknown>; content: string } | null {
  const result = invokeKnowledgeKeeper([
    "read-module",
    "--project",
    project,
    "--module",
    moduleKebab,
  ]) as { frontmatter?: Record<string, unknown>; content?: string } | null;
  if (!result) return null;

  return {
    frontmatter: result.frontmatter ?? {},
    content: truncateString(String(result.content ?? ""), KNOWLEDGE_TRUNCATE_LIMIT),
  };
}

function writerIdToKebab(writerId: string): string {
  return writerId
    .trim()
    .replace(/[ _]+/g, "-")
    .replace(/[A-Z]/g, (c) => c.toLowerCase());
}

// ─── Command ───────────────────────────────────────────────────────────────────

function runBuild(opts: {
  prd?: string;
  prdSlug?: string;
  yyyymm?: string;
  workspaceDir?: string;
  testPoints: string;
  writerId: string;
  rules?: string;
  strategyId: string;
  knowledgeInjection: string;
  project?: string;
}): void {
  const tpPath = resolve(opts.testPoints);

  // Read PRD —— primary path resolves enhanced.md from --prd-slug + --yyyymm + --project;
  // legacy --prd <path> remains as a compatibility branch.
  let prdContent: string;
  if (opts.prdSlug && opts.yyyymm && opts.project) {
    const wsRaw = opts.workspaceDir ?? process.env.WORKSPACE_DIR ?? "workspace";
    const enhancedPath = isAbsolute(wsRaw)
      ? join(wsRaw, opts.project, "prds", opts.yyyymm, opts.prdSlug, "enhanced.md")
      : resolve(wsRaw, opts.project, "prds", opts.yyyymm, opts.prdSlug, "enhanced.md");
    try {
      prdContent = readFileSync(enhancedPath, "utf8");
    } catch {
      process.stderr.write(`Error: cannot read enhanced.md "${enhancedPath}"\n`);
      process.exit(1);
      return;
    }
  } else if (opts.prd) {
    const prdPath = resolve(opts.prd);
    try {
      prdContent = readFileSync(prdPath, "utf8");
    } catch {
      process.stderr.write(`Error: cannot read PRD file "${prdPath}"\n`);
      process.exit(1);
      return;
    }
  } else {
    process.stderr.write(
      "Error: must provide --prd-slug + --yyyymm + --project (primary) or --prd <path> (legacy)\n",
    );
    process.exit(1);
    return;
  }

  // Read test-points
  let testPointsJson: TestPointsJson;
  try {
    const raw = readFileSync(tpPath, "utf8");
    testPointsJson = JSON.parse(raw) as TestPointsJson;
  } catch {
    process.stderr.write(`Error: cannot read test-points file "${tpPath}"\n`);
    process.exit(1);
  }

  // Read rules (optional)
  let rules: Record<string, unknown> = {};
  if (opts.rules) {
    try {
      const raw = readFileSync(resolve(opts.rules), "utf8");
      rules = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // Non-fatal: fall back to empty rules
      rules = {};
    }
  }

  // Split PRD into modules and find matching section
  const modules = splitPrdIntoModules(prdContent);
  const matched = findMatchingModule(modules, opts.writerId);

  let modulePrdSection: string;
  let testPoints: unknown[];
  let fallback: boolean;

  if (matched !== null) {
    modulePrdSection = matched.content;
    testPoints = filterTestPoints(testPointsJson, opts.writerId);
    fallback = false;
  } else {
    // Fallback: return full PRD text
    modulePrdSection = prdContent.trimEnd();
    testPoints = [];
    fallback = true;
  }

  // Build knowledge payload
  let knowledge: KnowledgePayload = {};
  if (opts.knowledgeInjection === "none") {
    knowledge = {};
  } else if (opts.project) {
    if (opts.knowledgeInjection === "read-core") {
      const core = readKnowledgeCore(opts.project);
      if (core) knowledge = { core };
    } else if (opts.knowledgeInjection === "read-module") {
      const core = readKnowledgeCore(opts.project);
      const moduleKebab = writerIdToKebab(opts.writerId);
      const mod = readKnowledgeModule(opts.project, moduleKebab);
      knowledge = {
        ...(core ? { core } : {}),
        ...(mod ? { module: mod } : {}),
      };
    }
  }
  // else (!opts.project && knowledge-injection !== "none") → knowledge = {}, no error

  const context: WriterContext = {
    writer_id: opts.writerId,
    module_prd_section: modulePrdSection,
    test_points: testPoints,
    rules,
    strategy_id: opts.strategyId ?? "S1",
    knowledge,
    fallback,
  };

  process.stdout.write(`${JSON.stringify(context, null, 2)}\n`);
}

export const program = createCli({
  name: "writer-context-builder",
  description: "按模块切分 PRD，为每个 writer 构建精简上下文",
  commands: [
    {
      name: "build",
      description: "Build writer context for a specific module",
      options: [
        { flag: "--prd <path>", description: "[legacy] Path to PRD Markdown file (prefer --prd-slug + --yyyymm)" },
        { flag: "--prd-slug <slug>", description: "PRD slug (primary path; pairs with --yyyymm + --project to read enhanced.md)" },
        { flag: "--yyyymm <ym>", description: "PRD month directory (primary path)" },
        { flag: "--workspace-dir <dir>", description: "Workspace root (primary path; overrides WORKSPACE_DIR env)" },
        { flag: "--test-points <path>", description: "Path to the test-points JSON file", required: true },
        { flag: "--writer-id <module>", description: "Module name (fuzzy-matched against PRD ## headings)", required: true },
        { flag: "--rules <path>", description: "Optional path to merged rules JSON" },
        { flag: "--strategy-id <id>", description: "Strategy id from router", defaultValue: "S1" },
        { flag: "--knowledge-injection <mode>", description: "read-core|read-module|none", defaultValue: "read-core" },
        { flag: "--project <name>", description: "Project name (for knowledge-keeper / primary path)" },
      ],
      action: runBuild,
    },
  ],
});
