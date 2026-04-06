#!/usr/bin/env npx tsx
/**
 * archive-gen.ts — Converts intermediate JSON test cases to Archive Markdown files,
 * and searches existing archives.
 *
 * Usage:
 *   npx tsx .claude/scripts/archive-gen.ts convert --input <json> --output <path> [--template templates/archive.md.hbs]
 *   npx tsx .claude/scripts/archive-gen.ts search --query <keywords> [--dir workspace/archive] [--limit 20]
 *   npx tsx .claude/scripts/archive-gen.ts --help
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { Command } from "commander";
import Handlebars from "handlebars";
import {
  buildMarkdown,
  type FrontMatter,
  parseFrontMatter,
  serializeFrontMatter,
  todayString,
} from "./lib/frontmatter.js";

// ─── Root name builder ──────────────────────────────────────────────────────

interface XmindPreferences {
  root_title_template: string;
  iteration_id: string;
}

function loadXmindPreferences(): XmindPreferences {
  const defaults: XmindPreferences = {
    root_title_template: "数据资产v{{prd_version}}迭代用例(#{{iteration_id}})",
    iteration_id: "23",
  };

  try {
    const prefPath = resolve(
      dirname(new URL(import.meta.url).pathname),
      "../preferences/xmind-structure.md",
    );
    if (!existsSync(prefPath)) return defaults;

    const content = readFileSync(prefPath, "utf-8");

    const tmplMatch = content.match(/root_title_template:\s*`([^`]+)`/);
    if (tmplMatch) defaults.root_title_template = tmplMatch[1];

    const idMatch = content.match(/iteration_id:\s*(\S+)/);
    if (idMatch) defaults.iteration_id = idMatch[1];
  } catch {
    // ignore
  }
  return defaults;
}

function buildRootName(version?: string): string {
  if (!version) return "";
  const prefs = loadXmindPreferences();
  const ver = version.replace(/^v/i, "");
  return prefs.root_title_template
    .replace("{{prd_version}}", ver)
    .replace("{{iteration_id}}", prefs.iteration_id);
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface TestStep {
  step: string;
  expected: string;
}

interface TestCase {
  title: string;
  priority: string;
  preconditions?: string;
  steps: TestStep[];
}

interface SubGroup {
  name: string;
  test_cases: TestCase[];
}

interface Page {
  name: string;
  sub_groups?: SubGroup[];
  test_cases?: TestCase[];
}

interface Module {
  name: string;
  pages: Page[];
}

interface Meta {
  project_name: string;
  requirement_name: string;
  version?: string;
  module_key?: string;
  requirement_id?: number;
  requirement_ticket?: string;
  description?: string;
}

interface IntermediateJson {
  meta: Meta;
  modules: Module[];
}

interface ConvertResult {
  output_path: string;
  case_count: number;
  module_count: number;
}

interface SearchResult {
  path: string;
  suite_name: string;
  tags: string[];
  case_count: number;
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateInput(data: unknown): asserts data is IntermediateJson {
  if (!data || typeof data !== "object") {
    throw new Error("Input must be a JSON object");
  }
  const obj = data as Record<string, unknown>;
  if (!obj.meta || typeof obj.meta !== "object") {
    throw new Error("Missing required field: meta");
  }
  const meta = obj.meta as Record<string, unknown>;
  if (!meta.requirement_name || typeof meta.requirement_name !== "string") {
    throw new Error("Missing required field: meta.requirement_name");
  }
  if (!Array.isArray(obj.modules) || obj.modules.length === 0) {
    throw new Error("modules must be a non-empty array");
  }
}

// ─── Case counting ───────────────────────────────────────────────────────────

function countCasesInModules(modules: Module[]): number {
  let count = 0;
  for (const mod of modules) {
    for (const page of mod.pages) {
      for (const sg of page.sub_groups ?? []) {
        count += sg.test_cases.length;
      }
      count += page.test_cases?.length ?? 0;
    }
  }
  return count;
}

// ─── Tag inference ────────────────────────────────────────────────────────────

function inferTags(meta: Meta, modules: Module[]): string[] {
  const tags = new Set<string>();

  // Add module_key (e.g. "数据质量")
  if (meta.module_key) tags.add(meta.module_key);

  // Add requirement name without brackets prefix as a separate tag
  if (meta.requirement_name) {
    // Extract bracket content: 【xxx】 → "xxx"
    const bracketMatch = meta.requirement_name.match(/^【(.+?)】/);
    if (bracketMatch) {
      tags.add(bracketMatch[1]);
    }
    // Extract the part after brackets
    const afterBracket = meta.requirement_name.replace(/^【.+?】/, "").trim();
    if (afterBracket) {
      tags.add(afterBracket);
    }
  }

  // Add version tag
  if (meta.version) tags.add(meta.version);

  // Add module names (L2)
  for (const mod of modules) {
    if (mod.name && mod.name !== "未分类") tags.add(mod.name);
    // Add page names (L3)
    for (const page of mod.pages) {
      if (page.name && page.name !== "未分类") tags.add(page.name);
      // Add sub_group names (L4)
      for (const sg of page.sub_groups ?? []) {
        if (sg.name) tags.add(sg.name);
      }
    }
  }

  // Add prd_id tag
  if (meta.requirement_id) tags.add(`#${meta.requirement_id}`);

  return Array.from(tags).slice(0, 10);
}

// ─── Body generation ─────────────────────────────────────────────────────────

function escapeTableCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

function buildCaseBody(tc: TestCase): string {
  const lines: string[] = [];

  if (tc.preconditions) {
    lines.push("> 前置条件");
    lines.push("```");
    lines.push(tc.preconditions);
    lines.push("```");
    lines.push("");
  }

  lines.push("> 用例步骤");
  lines.push("");
  lines.push("| 编号 | 步骤 | 预期 |");
  lines.push("| ---- | ------------ | ------------ |");

  for (let i = 0; i < tc.steps.length; i++) {
    const s = tc.steps[i];
    lines.push(
      `| ${i + 1} | ${escapeTableCell(s.step)} | ${escapeTableCell(s.expected)} |`,
    );
  }

  return lines.join("\n");
}

function buildBodyFromModules(modules: Module[]): string {
  const lines: string[] = [];

  for (const mod of modules) {
    lines.push(`## ${mod.name}`);
    lines.push("");

    for (const page of mod.pages) {
      lines.push(`### ${page.name}`);
      lines.push("");

      // Sub-groups → H4
      for (const sg of page.sub_groups ?? []) {
        if (sg.test_cases.length > 0) {
          lines.push(`#### ${sg.name}`);
          lines.push("");

          for (const tc of sg.test_cases) {
            lines.push(`##### 【${tc.priority}】${tc.title}`);
            lines.push("");
            lines.push(buildCaseBody(tc));
            lines.push("");
          }
        }
      }

      // Direct page test_cases (no sub-group)
      for (const tc of page.test_cases ?? []) {
        lines.push(`##### 【${tc.priority}】${tc.title}`);
        lines.push("");
        lines.push(buildCaseBody(tc));
        lines.push("");
      }
    }
  }

  return lines.join("\n").trim();
}

// ─── Built-in template renderer ───────────────────────────────────────────────

function renderBuiltIn(data: IntermediateJson): string {
  const { meta, modules } = data;
  const caseCount = countCasesInModules(modules);
  const rootName = buildRootName(meta.version);

  const fm: FrontMatter = {
    suite_name: meta.requirement_name,
    ...(rootName ? { root_name: rootName } : {}),
    description: meta.description ?? meta.requirement_name,
    ...(meta.requirement_id !== undefined
      ? { prd_id: meta.requirement_id }
      : {}),
    ...(meta.version ? { prd_version: meta.version } : {}),
    product: meta.module_key ?? "",
    tags: inferTags(meta, modules),
    create_at: todayString(),
    status: "草稿",
    case_count: caseCount,
    origin: "xmind",
  };

  const body = buildBodyFromModules(modules);
  return buildMarkdown(fm, body);
}

// ─── Handlebars helpers ──────────────────────────────────────────────────────

function registerHandlebarsHelpers(): void {
  // Add 1-based indexing for step tables
  Handlebars.registerHelper("add", (a: number, b: number) => a + b);

  // Escape pipe characters and newlines in table cells
  Handlebars.registerHelper("escapeCell", (text: string) => {
    return new Handlebars.SafeString(
      String(text).replace(/\|/g, "\\|").replace(/\n/g, "<br>"),
    );
  });
}

// ─── Handlebars template renderer ─────────────────────────────────────────────

function renderWithTemplate(
  data: IntermediateJson,
  templatePath: string,
): string {
  registerHandlebarsHelpers();

  const templateSrc = readFileSync(resolve(templatePath), "utf8");
  const template = Handlebars.compile(templateSrc);

  const { meta, modules } = data;
  const caseCount = countCasesInModules(modules);
  const rootName = buildRootName(meta.version);
  const fm: FrontMatter = {
    suite_name: meta.requirement_name,
    ...(rootName ? { root_name: rootName } : {}),
    description: meta.description ?? meta.requirement_name,
    ...(meta.requirement_id !== undefined
      ? { prd_id: meta.requirement_id }
      : {}),
    ...(meta.version ? { prd_version: meta.version } : {}),
    product: meta.module_key ?? "",
    tags: inferTags(meta, modules),
    create_at: todayString(),
    status: "草稿",
    case_count: caseCount,
    origin: "xmind",
  };

  return template({
    meta,
    modules,
    fm,
    frontMatterStr: serializeFrontMatter(fm),
  });
}

// ─── Subcommand: convert ──────────────────────────────────────────────────────

async function runConvert(opts: {
  input: string;
  output: string;
  template?: string;
}): Promise<void> {
  const inputPath = resolve(opts.input);
  const outputPath = resolve(opts.output);

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(inputPath, "utf8"));
  } catch (err) {
    process.stderr.write(`[archive-gen] Failed to read input file: ${err}\n`);
    process.exit(1);
  }

  try {
    validateInput(raw);
  } catch (err) {
    process.stderr.write(`[archive-gen] Validation error: ${err}\n`);
    process.exit(1);
  }

  const data = raw as IntermediateJson;

  let markdown: string;
  try {
    if (opts.template) {
      markdown = renderWithTemplate(data, opts.template);
    } else {
      markdown = renderBuiltIn(data);
    }
  } catch (err) {
    process.stderr.write(`[archive-gen] Render error: ${err}\n`);
    process.exit(1);
  }

  const outDir = dirname(outputPath);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  writeFileSync(outputPath, markdown, "utf8");

  const result: ConvertResult = {
    output_path: outputPath,
    case_count: countCasesInModules(data.modules),
    module_count: data.modules.length,
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

// ─── Subcommand: search ───────────────────────────────────────────────────────

function collectMdFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = `${dir}/${entry}`;
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...collectMdFiles(fullPath));
    } else if (entry.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

function matchesQuery(filePath: string, query: string): SearchResult | null {
  let content: string;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return null;
  }

  const { frontMatter, body } = parseFrontMatter(content);
  const q = query.toLowerCase();

  const suiteName = String(frontMatter.suite_name ?? "");
  const tags = Array.isArray(frontMatter.tags)
    ? (frontMatter.tags as string[])
    : [];
  const caseCount =
    typeof frontMatter.case_count === "number"
      ? frontMatter.case_count
      : (body.match(/^#{5}\s+/gm) ?? []).length;

  const suiteMatch = suiteName.toLowerCase().includes(q);
  const tagMatch = tags.some((t) => t.toLowerCase().includes(q));

  // Match body headings (lines starting with #)
  const headingMatch = body
    .split("\n")
    .filter((l) => l.startsWith("#"))
    .some((h) => h.toLowerCase().includes(q));

  if (!suiteMatch && !tagMatch && !headingMatch) return null;

  return {
    path: filePath,
    suite_name: suiteName,
    tags,
    case_count: caseCount,
  };
}

async function runSearch(opts: {
  query: string;
  dir: string;
  limit: number;
}): Promise<void> {
  const searchDir = resolve(opts.dir);
  const files = collectMdFiles(searchDir);

  const results: SearchResult[] = [];
  for (const file of files) {
    if (results.length >= opts.limit) break;
    const match = matchesQuery(file, opts.query);
    if (match) results.push(match);
  }

  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const program = new Command();

  program
    .name("archive-gen")
    .description(
      "Convert intermediate JSON to Archive Markdown, or search existing archives",
    );

  program
    .command("convert")
    .description("Convert intermediate JSON test cases to Archive Markdown")
    .requiredOption("--input <path>", "Path to input JSON file")
    .requiredOption("--output <path>", "Path to output Markdown file")
    .option(
      "--template <path>",
      "Path to Handlebars template (uses built-in if omitted)",
    )
    .action(
      async (opts: { input: string; output: string; template?: string }) => {
        await runConvert(opts);
      },
    );

  program
    .command("search")
    .description("Search archive Markdown files by keyword")
    .requiredOption("--query <keywords>", "Search keyword(s)")
    .option("--dir <path>", "Archive directory to search", "workspace/archive")
    .option("--limit <n>", "Maximum results to return", "20")
    .action(async (opts: { query: string; dir: string; limit: string }) => {
      await runSearch({
        query: opts.query,
        dir: opts.dir,
        limit: Number.parseInt(opts.limit, 10) || 20,
      });
    });

  program.parse(process.argv);
}

main().catch((err) => {
  process.stderr.write(`[archive-gen] Unexpected error: ${err}\n`);
  process.exit(1);
});
