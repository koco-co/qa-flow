#!/usr/bin/env bun
/**
 * writer-context-builder.ts — 按模块切分 PRD，为每个 writer 构建精简上下文。
 * Usage:
 *   bun run .claude/scripts/writer-context-builder.ts build \
 *     --prd <path> --test-points <path> --writer-id <module> [--preferences <path>]
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TestPointModule {
  name: string;
  test_points: unknown[];
}

interface TestPointsJson {
  modules: TestPointModule[];
}

interface WriterContext {
  writer_id: string;
  module_prd_section: string;
  test_points: unknown[];
  preferences: Record<string, unknown>;
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

// ─── Command ───────────────────────────────────────────────────────────────────

const program = new Command("writer-context-builder");
program.description("按模块切分 PRD，为每个 writer 构建精简上下文");

const buildCmd = program
  .command("build")
  .description("Build writer context for a specific module")
  .requiredOption("--prd <path>", "Path to the PRD Markdown file")
  .requiredOption("--test-points <path>", "Path to the test-points JSON file")
  .requiredOption("--writer-id <module>", "Module name (fuzzy-matched against PRD ## headings)")
  .option("--preferences <path>", "Optional path to merged preferences JSON")
  .action(
    (opts: {
      prd: string;
      testPoints: string;
      writerId: string;
      preferences?: string;
    }) => {
      const prdPath = resolve(opts.prd);
      const tpPath = resolve(opts.testPoints);

      // Read PRD
      let prdContent: string;
      try {
        prdContent = readFileSync(prdPath, "utf8");
      } catch {
        process.stderr.write(`Error: cannot read PRD file "${prdPath}"\n`);
        process.exit(1);
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

      // Read preferences (optional)
      let preferences: Record<string, unknown> = {};
      if (opts.preferences) {
        try {
          const raw = readFileSync(resolve(opts.preferences), "utf8");
          preferences = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          // Non-fatal: fall back to empty preferences
          preferences = {};
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

      const context: WriterContext = {
        writer_id: opts.writerId,
        module_prd_section: modulePrdSection,
        test_points: testPoints,
        preferences,
        fallback,
      };

      process.stdout.write(`${JSON.stringify(context, null, 2)}\n`);
    },
  );

// Silence unused variable warning
void buildCmd;

program.parse(process.argv);
