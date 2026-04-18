#!/usr/bin/env bun
/**
 * migrate-helpers-split.ts — 一次性拆 workspace/{project}/tests/helpers/test-setup.ts 为 5 个文件
 *
 * Usage:
 *   bun run .claude/scripts/migrate-helpers-split.ts --project dataAssets [--dry-run]
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { Command } from "commander";

// ── Constants ──────────────────────────────────────────────────────────────────

const FUNCTION_TO_FILE: Record<string, string> = {
  // env-setup.ts (exported)
  getEnv: "env-setup.ts",
  normalizeBaseUrl: "env-setup.ts",
  normalizeDataAssetsBaseUrl: "env-setup.ts",
  normalizeOfflineBaseUrl: "env-setup.ts",
  buildDataAssetsUrl: "env-setup.ts",
  buildOfflineUrl: "env-setup.ts",
  applyRuntimeCookies: "env-setup.ts",

  // batch-sql.ts (exported)
  selectBatchProject: "batch-sql.ts",
  executeSqlViaBatchDoris: "batch-sql.ts",
  executeSqlSequenceViaBatchDoris: "batch-sql.ts",

  // metadata-sync.ts (exported)
  syncMetadata: "metadata-sync.ts",

  // quality-project.ts (exported)
  getAccessibleProjectIds: "quality-project.ts",
  getQualityProjectId: "quality-project.ts",
};

const PRIVATE_HELPER_TARGETS: Record<string, string> = {
  getRawBaseUrl: "env-setup.ts",
  openBatchDorisEditor: "batch-sql.ts",
  runSqlInCurrentBatchEditor: "batch-sql.ts",
  confirmBatchDdlModal: "batch-sql.ts",
};

const ALL_TARGETS = [
  "env-setup.ts",
  "batch-sql.ts",
  "metadata-sync.ts",
  "quality-project.ts",
];

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ParsedFunction {
  readonly name: string;
  readonly isExported: boolean;
  readonly source: string;
  readonly startLine: number;
  readonly endLine: number;
}

export interface ParsedSetup {
  readonly imports: readonly string[];
  readonly typeAliases: readonly string[];
  readonly reExports: readonly string[];
  readonly functions: readonly ParsedFunction[];
}

export interface SplitResult {
  readonly status: "split" | "already-split" | "dry-run";
  readonly project: string;
  readonly filesWritten: readonly string[];
}

// ── Parser ─────────────────────────────────────────────────────────────────────

/**
 * Parses a TypeScript test-setup.ts source file into its structural components.
 *
 * Handles:
 * - Single-line and multi-line import statements
 * - Multi-line export { ... } from "..." re-export blocks
 * - Type alias declarations (type Foo = ...)
 * - function/async function declarations (exported and private)
 * - Preceding JSDoc comments are included in function source
 */
export function parseTestSetup(source: string): ParsedSetup {
  const lines = source.split("\n");
  const imports: string[] = [];
  const typeAliases: string[] = [];
  const reExports: string[] = [];
  const functions: ParsedFunction[] = [];

  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (trimmed === "") {
      i++;
      continue;
    }

    // Multi-line or single-line import statement
    if (trimmed.startsWith("import ")) {
      const importLines: string[] = [line];
      // If it doesn't end the import on this line, collect until ";"
      if (!trimmed.includes(";") || (trimmed.includes("{") && !trimmed.includes("}"))) {
        // Multi-line import
        let j = i + 1;
        while (j < lines.length) {
          importLines.push(lines[j]);
          if (lines[j].includes(";")) break;
          j++;
        }
        i = j + 1;
      } else {
        i++;
      }
      imports.push(importLines.join("\n"));
      continue;
    }

    // Re-export block: export { ... } from "..."
    if (trimmed.startsWith("export {") || trimmed.startsWith("export{")) {
      const reExportLines: string[] = [line];
      if (!trimmed.includes("}")) {
        // Multi-line re-export
        let j = i + 1;
        while (j < lines.length) {
          reExportLines.push(lines[j]);
          if (lines[j].includes("}")) break;
          j++;
        }
        i = j + 1;
      } else {
        i++;
      }
      reExports.push(reExportLines.join("\n"));
      continue;
    }

    // Type alias declaration
    if (trimmed.startsWith("type ") || trimmed.startsWith("export type ")) {
      const typeLines: string[] = [line];
      // Collect until the line ends with ";" or we see a complete type
      if (!trimmed.endsWith(";") && !trimmed.endsWith("}")) {
        let j = i + 1;
        let depth = (trimmed.match(/\{/g) ?? []).length - (trimmed.match(/\}/g) ?? []).length;
        while (j < lines.length && depth > 0) {
          const tl = lines[j];
          typeLines.push(tl);
          depth += (tl.match(/\{/g) ?? []).length;
          depth -= (tl.match(/\}/g) ?? []).length;
          j++;
        }
        i = j;
      } else {
        i++;
      }
      typeAliases.push(typeLines.join("\n"));
      continue;
    }

    // JSDoc comment followed by a function declaration
    if (trimmed.startsWith("/**")) {
      // Collect the JSDoc block
      const jsdocLines: string[] = [line];
      let j = i + 1;
      while (j < lines.length && !lines[j - 1].includes("*/")) {
        jsdocLines.push(lines[j]);
        j++;
      }
      // Check if next non-empty line is a function declaration
      let k = j;
      while (k < lines.length && lines[k].trim() === "") k++;

      const nextLine = k < lines.length ? lines[k].trim() : "";
      const funcMatch = matchFunctionDeclaration(nextLine);

      if (funcMatch) {
        // Collect function body
        const funcLines: string[] = [lines[k]];
        let depth = (lines[k].match(/\{/g) ?? []).length - (lines[k].match(/\}/g) ?? []).length;
        let seenOpen = depth > 0;
        let m = k + 1;
        while (m < lines.length && (!seenOpen || depth > 0)) {
          funcLines.push(lines[m]);
          const opens = (lines[m].match(/\{/g) ?? []).length;
          const closes = (lines[m].match(/\}/g) ?? []).length;
          if (opens > 0) seenOpen = true;
          depth += opens - closes;
          m++;
        }

        const fullSource = [...jsdocLines, ...funcLines].join("\n");
        functions.push({
          name: funcMatch.name,
          isExported: funcMatch.isExported,
          source: fullSource,
          startLine: i + 1, // 1-based
          endLine: m,
        });
        i = m;
      } else {
        // Not a function — skip the jsdoc block
        i = j;
      }
      continue;
    }

    // Function declaration (no JSDoc)
    const funcMatch = matchFunctionDeclaration(trimmed);
    if (funcMatch) {
      const funcLines: string[] = [line];
      let depth = (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
      let seenOpen = depth > 0;
      let j = i + 1;
      while (j < lines.length && (!seenOpen || depth > 0)) {
        funcLines.push(lines[j]);
        const opens = (lines[j].match(/\{/g) ?? []).length;
        const closes = (lines[j].match(/\}/g) ?? []).length;
        if (opens > 0) seenOpen = true;
        depth += opens - closes;
        j++;
      }
      functions.push({
        name: funcMatch.name,
        isExported: funcMatch.isExported,
        source: funcLines.join("\n"),
        startLine: i + 1,
        endLine: j,
      });
      i = j;
      continue;
    }

    // Skip anything else (comments, blank lines, etc.)
    i++;
  }

  return {
    imports: Object.freeze(imports),
    typeAliases: Object.freeze(typeAliases),
    reExports: Object.freeze(reExports),
    functions: Object.freeze(functions),
  };
}

function matchFunctionDeclaration(
  line: string,
): { name: string; isExported: boolean } | null {
  // Patterns:
  // export async function name(
  // export function name(
  // async function name(
  // function name(
  const pattern =
    /^(export\s+)?(async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*[\(<]/;
  const match = line.match(pattern);
  if (!match) return null;
  return {
    isExported: Boolean(match[1]),
    name: match[3],
  };
}

// ── Planner ────────────────────────────────────────────────────────────────────

/**
 * Groups parsed functions into target files based on FUNCTION_TO_FILE and PRIVATE_HELPER_TARGETS.
 * Throws if a function name is not mapped to any target.
 */
export function planSplit(parsed: ParsedSetup): Map<string, ParsedFunction[]> {
  const plan = new Map<string, ParsedFunction[]>();

  // Initialize all targets
  for (const target of ALL_TARGETS) {
    plan.set(target, []);
  }

  for (const fn of parsed.functions) {
    const target =
      FUNCTION_TO_FILE[fn.name] ?? PRIVATE_HELPER_TARGETS[fn.name];

    if (!target) {
      throw new Error(
        `Unknown function "${fn.name}" — not mapped to any target file. ` +
        `Add it to FUNCTION_TO_FILE or PRIVATE_HELPER_TARGETS.`,
      );
    }

    const list = plan.get(target);
    if (list) {
      list.push(fn);
    } else {
      plan.set(target, [fn]);
    }
  }

  return plan;
}

// ── Renderers ──────────────────────────────────────────────────────────────────

/**
 * Renders the contents for a target split file.
 * Includes the full imports block and all assigned functions.
 */
export function renderTargetFile(
  target: string,
  imports: readonly string[],
  functions: readonly ParsedFunction[],
): string {
  const parts: string[] = [];

  // File header comment
  parts.push(`// ${target} — split from test-setup.ts`);
  parts.push("");

  // Full imports block (not filtered — intentional duplication)
  if (imports.length > 0) {
    parts.push(imports.join("\n"));
    parts.push("");
  }

  // Functions
  for (const fn of functions) {
    parts.push(fn.source);
    parts.push("");
  }

  return parts.join("\n").trimEnd() + "\n";
}

/**
 * Renders the barrel index.ts that re-exports everything from the 4 split files
 * plus re-exports from lib/playwright.
 */
export function renderIndexBarrel(reExports: readonly string[]): string {
  const parts: string[] = [];
  parts.push("// index.ts — barrel for helpers split");
  parts.push("");

  // Re-exports from lib/playwright (from original test-setup.ts)
  for (const re of reExports) {
    parts.push(re);
  }

  if (reExports.length > 0) {
    parts.push("");
  }

  // Re-exports from each target
  for (const target of ALL_TARGETS) {
    const base = target.replace(/\.ts$/, "");
    parts.push(`export * from "./${base}";`);
  }
  parts.push("");

  return parts.join("\n");
}

/**
 * Renders the compatibility shim that replaces the original test-setup.ts.
 * It simply re-exports everything from index.ts.
 */
export function renderCompatibilityShim(): string {
  return [
    "// test-setup.ts — compatibility shim (split via migrate-helpers-split.ts)",
    "// This file is intentionally thin. All helpers live in the split files.",
    "// To use individual helpers, import from ./index or the specific file.",
    "",
    'export * from "./index";',
    "",
  ].join("\n");
}

// ── Main split logic ───────────────────────────────────────────────────────────

export function runSplit(options: {
  project: string;
  dryRun: boolean;
  workspaceRoot: string;
}): SplitResult {
  const { project, dryRun, workspaceRoot } = options;

  const helpersDir = join(workspaceRoot, project, "tests", "helpers");
  const setupPath = join(helpersDir, "test-setup.ts");

  if (!existsSync(setupPath)) {
    throw new Error(`test-setup.ts not found at: ${setupPath}`);
  }

  const source = readFileSync(setupPath, "utf8");

  // Idempotency check
  const sourceLines = source.split("\n");
  if (
    source.includes('export * from "./index"') &&
    sourceLines.length < 30
  ) {
    return {
      status: "already-split",
      project,
      filesWritten: [],
    };
  }

  const parsed = parseTestSetup(source);
  const plan = planSplit(parsed);

  const filesWritten: string[] = [];

  // Write target files
  for (const target of ALL_TARGETS) {
    const functions = plan.get(target) ?? [];
    const content = renderTargetFile(target, parsed.imports, functions);
    const outPath = join(helpersDir, target);

    if (!dryRun) {
      writeFileSync(outPath, content, "utf8");
    }
    filesWritten.push(outPath);
  }

  // Write index.ts
  const indexContent = renderIndexBarrel(parsed.reExports);
  const indexPath = join(helpersDir, "index.ts");
  if (!dryRun) {
    writeFileSync(indexPath, indexContent, "utf8");
  }
  filesWritten.push(indexPath);

  // Write shim (overwrites test-setup.ts)
  const shimContent = renderCompatibilityShim();
  if (!dryRun) {
    writeFileSync(setupPath, shimContent, "utf8");
  }
  filesWritten.push(setupPath);

  return {
    status: dryRun ? "dry-run" : "split",
    project,
    filesWritten,
  };
}

// ── CLI entry point ────────────────────────────────────────────────────────────

if (import.meta.main) {
  const REPO_ROOT = resolve(import.meta.dirname, "../..");
  const WORKSPACE_ROOT = join(REPO_ROOT, "workspace");

  const program = new Command();

  program
    .name("migrate-helpers-split")
    .description(
      "Split workspace/{project}/tests/helpers/test-setup.ts into 5 focused files",
    )
    .option("--project <name>", "Project name (e.g. dataAssets)")
    .option("--dry-run", "Preview without writing any files", false)
    .action(
      (opts: { project?: string; dryRun: boolean }) => {
        try {
          const project = opts.project ?? "dataAssets";
          const result = runSplit({
            project,
            dryRun: opts.dryRun,
            workspaceRoot: WORKSPACE_ROOT,
          });
          process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        } catch (error) {
          process.stderr.write(
            `Error: ${error instanceof Error ? error.message : String(error)}\n`,
          );
          process.exit(1);
        }
      },
    );

  program.parse(process.argv);
}
