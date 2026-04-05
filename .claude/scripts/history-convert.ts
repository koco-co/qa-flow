#!/usr/bin/env npx tsx
/**
 * history-convert.ts — Convert historical CSV/XMind files to Archive Markdown.
 *
 * Usage:
 *   npx tsx .claude/scripts/history-convert.ts --path <file-or-dir> [--module <key>] [--detect] [--force]
 *   npx tsx .claude/scripts/history-convert.ts --help
 */

import {
  createReadStream,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { Command } from "commander";
import JSZip from "jszip";
import { buildMarkdown, todayString } from "./lib/frontmatter.ts";
import { getEnv } from "./lib/env.ts";
import { currentYYYYMM, repoRoot } from "./lib/paths.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CsvRow {
  module: string;
  title: string;
  steps: string;
  expected: string;
  priority: string;
}

interface XMindTopicNode {
  title?: string;
  children?: { attached?: XMindTopicNode[] };
  [key: string]: unknown;
}

interface XMindSheet {
  rootTopic?: XMindTopicNode;
  [key: string]: unknown;
}

interface CaseEntry {
  module: string;
  title: string;
  priority: string;
  steps: { step: string; expected: string }[];
}

interface FileConvertResult {
  input: string;
  output: string;
  status: "converted" | "skipped" | "failed";
  reason?: string;
  caseCount?: number;
}

interface DetectEntry {
  path: string;
  type: "csv" | "xmind";
  outputDir: string;
}

interface ConvertOutput {
  converted: number;
  skipped: number;
  failed: number;
  files: FileConvertResult[];
}

// ─── Tag Inference ───────────────────────────────────────────────────────────

/** Stop words that should not become tags (too generic) */
const TAG_STOP_WORDS = new Set([
  "列表页", "新增页", "编辑页", "详情页", "设置页", "配置页",
  "新增", "编辑", "删除", "详情", "查询", "搜索", "导入", "导出",
  "页面", "功能", "模块", "列表", "测试", "验证", "测试用例", "用例",
  "步骤", "预期", "前置条件", "未分类",
]);

/** Infer tags from module names, page names, sub-group names, and case titles */
function inferTags(options: {
  suiteName: string;
  modules: string[];
  pages: string[];
  subGroups: string[];
  caseTitles: string[];
}): string[] {
  const candidates = new Set<string>();

  // Suite name itself
  if (options.suiteName) candidates.add(options.suiteName);

  // Module names (high value)
  for (const m of options.modules) {
    if (m && !TAG_STOP_WORDS.has(m)) candidates.add(m);
  }

  // Page names (medium value — extract meaningful parts)
  for (const p of options.pages) {
    if (p && !TAG_STOP_WORDS.has(p)) candidates.add(p);
  }

  // Sub-group names (medium value)
  for (const sg of options.subGroups) {
    if (sg && !TAG_STOP_WORDS.has(sg)) candidates.add(sg);
  }

  // Extract business keywords from case titles (remove priority prefix + "验证" prefix)
  for (const title of options.caseTitles) {
    const cleaned = title
      .replace(/^【P[012]】/, "")
      .replace(/^验证/, "")
      .trim();
    // Extract noun phrases (Chinese: 2-6 char segments that look like feature names)
    const matches = cleaned.match(/[\u4e00-\u9fff]{2,8}/g);
    if (matches) {
      for (const m of matches) {
        if (!TAG_STOP_WORDS.has(m) && m.length >= 2) {
          candidates.add(m);
        }
      }
    }
  }

  // Deduplicate and limit to 15 tags, prioritize shorter (more specific) tags
  return [...candidates]
    .filter((t) => t.length >= 2)
    .sort((a, b) => a.length - b.length)
    .slice(0, 15);
}

// ─── CSV Parsing ──────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

async function parseCsvFile(filePath: string): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];
    const rl = createInterface({
      input: createReadStream(filePath),
      crlfDelay: Number.POSITIVE_INFINITY,
    });

    let headers: string[] = [];
    let isFirst = true;

    rl.on("line", (line: string) => {
      if (!line.trim()) return;
      const cols = parseCSVLine(line);

      if (isFirst) {
        headers = cols.map((h) => h.toLowerCase().replace(/\s+/g, "_"));
        isFirst = false;
        return;
      }

      const idxModule = headers.indexOf("module");
      const idxTitle = headers.findIndex(
        (h) => h === "title" || h === "用例标题" || h === "标题",
      );
      const idxSteps = headers.findIndex((h) => h === "steps" || h === "步骤");
      const idxExpected = headers.findIndex(
        (h) => h === "expected" || h === "预期" || h === "预期结果",
      );
      const idxPriority = headers.findIndex(
        (h) => h === "priority" || h === "优先级",
      );

      rows.push({
        module: idxModule >= 0 ? (cols[idxModule] ?? "") : "",
        title: idxTitle >= 0 ? (cols[idxTitle] ?? "") : (cols[1] ?? ""),
        steps: idxSteps >= 0 ? (cols[idxSteps] ?? "") : "",
        expected: idxExpected >= 0 ? (cols[idxExpected] ?? "") : "",
        priority: idxPriority >= 0 ? (cols[idxPriority] ?? "P2") : "P2",
      });
    });

    rl.on("close", () => resolve(rows));
    rl.on("error", reject);
  });
}

function csvRowsToMarkdown(rows: CsvRow[], suiteName: string): string {
  const byModule = new Map<string, CsvRow[]>();
  for (const row of rows) {
    const mod = row.module || "未分类";
    const existing = byModule.get(mod) ?? [];
    byModule.set(mod, [...existing, row]);
  }

  const tags = inferTags({
    suiteName,
    modules: [...byModule.keys()],
    pages: [],
    subGroups: [],
    caseTitles: rows.map((r) => r.title).filter(Boolean),
  });

  const fm = {
    suite_name: suiteName,
    description: `${suiteName}历史用例归档`,
    tags,
    create_at: todayString(),
    status: "草稿",
    origin: "csv",
    case_count: rows.length,
  };

  const bodyParts: string[] = [];
  for (const [modName, modRows] of byModule) {
    bodyParts.push(`## ${modName}`);
    bodyParts.push("");
    for (const row of modRows) {
      if (!row.title) continue;
      const priorityTag = normalizePriority(row.priority);
      bodyParts.push(`##### 【${priorityTag}】${row.title}`);
      bodyParts.push("");
      if (row.steps || row.expected) {
        bodyParts.push("> 用例步骤");
        bodyParts.push("");
        bodyParts.push("| 编号 | 步骤 | 预期 |");
        bodyParts.push("| ---- | ---- | ---- |");
        const stepLines = row.steps ? row.steps.split(/\n|；|;/) : [""];
        const expectedLines = row.expected
          ? row.expected.split(/\n|；|;/)
          : [""];
        const count = Math.max(stepLines.length, expectedLines.length, 1);
        for (let i = 0; i < count; i++) {
          const step = (stepLines[i] ?? "").trim();
          const exp = (expectedLines[i] ?? "").trim();
          bodyParts.push(`| ${i + 1} | ${step} | ${exp} |`);
        }
        bodyParts.push("");
      }
    }
  }

  return buildMarkdown(fm, bodyParts.join("\n"));
}

function normalizePriority(raw: string): string {
  const upper = raw.toUpperCase().trim();
  if (upper === "P0" || upper === "高" || upper === "HIGH") return "P0";
  if (upper === "P1" || upper === "中" || upper === "MEDIUM") return "P1";
  return "P2";
}

// ─── XMind Parsing ────────────────────────────────────────────────────────────

const MARKER_TO_PRIORITY: Record<string, string> = {
  "priority-1": "P0",
  "priority-2": "P1",
  "priority-3": "P2",
};

async function readXmindContentJson(filePath: string): Promise<XMindSheet[]> {
  const buffer = readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const contentFile = zip.file("content.json");
  if (!contentFile) throw new Error("content.json not found in .xmind archive");
  const str = await contentFile.async("string");
  return JSON.parse(str) as XMindSheet[];
}

/** Extract priority from XMind topic markers */
function extractPriority(node: XMindTopicNode): string {
  const markers = (node as Record<string, unknown>).markers as
    | Array<{ markerId?: string }>
    | undefined;
  if (!markers) return "P2";
  for (const m of markers) {
    if (m.markerId && MARKER_TO_PRIORITY[m.markerId]) {
      return MARKER_TO_PRIORITY[m.markerId];
    }
  }
  // Also check title for existing priority prefix
  const titleMatch = (node.title ?? "").match(/【(P[012])】/);
  if (titleMatch) return titleMatch[1];
  return "P2";
}

/** Extract preconditions from XMind topic notes */
function extractNotes(node: XMindTopicNode): string {
  const notes = (node as Record<string, unknown>).notes as
    | { plain?: { content?: string } }
    | undefined;
  return notes?.plain?.content ?? "";
}

/** Strip priority prefix from title if already present */
function stripPriorityPrefix(title: string): string {
  return title.replace(/^【P[012]】\s*/, "").trim();
}

/**
 * Determine if a node is a "case" node (has step→expected children structure)
 * or a structural grouping node (has children that are themselves groups/cases).
 *
 * Heuristic: a case node's children represent steps (each step's child = expected result).
 * If a node has markers (priority), it's likely a case.
 * If a node's children also have children with further depth, it's a grouping node.
 */
function isCaseNode(node: XMindTopicNode): boolean {
  const markers = (node as Record<string, unknown>).markers as
    | Array<{ markerId?: string }>
    | undefined;
  if (markers && markers.length > 0) return true;
  // Title starts with priority prefix
  if (/^【P[012]】/.test(node.title ?? "")) return true;
  // If this node has children and grandchildren but no great-grandchildren, likely a case
  const children = node.children?.attached ?? [];
  if (children.length === 0) return true; // Leaf = case (no steps)
  // Check if children look like steps (text with at most 1 child = expected)
  const allChildrenAreStepLike = children.every((child) => {
    const grandchildren = child.children?.attached ?? [];
    return grandchildren.length <= 1;
  });
  return allChildrenAreStepLike;
}

/** Extract steps from a case node's children: child = step, grandchild = expected */
function extractSteps(node: XMindTopicNode): { step: string; expected: string }[] {
  const children = node.children?.attached ?? [];
  return children.map((child) => {
    const expected = child.children?.attached?.[0]?.title ?? "";
    return { step: child.title ?? "", expected };
  });
}

/** Parsed L1 node representing one requirement/suite */
interface ParsedL1 {
  title: string;
  modules: ParsedModule[];
  totalCases: number;
}

interface ParsedModule {
  name: string;
  pages: ParsedPage[];
}

interface ParsedPage {
  name: string;
  subGroups: ParsedSubGroup[];
  cases: ParsedCase[];
}

interface ParsedSubGroup {
  name: string;
  cases: ParsedCase[];
}

interface ParsedCase {
  title: string;
  priority: string;
  preconditions: string;
  steps: { step: string; expected: string }[];
}

/** Parse an L2 (module) node and all its descendants */
function parseL2Module(l2: XMindTopicNode): ParsedModule {
  const pages: ParsedPage[] = [];
  const l2Children = l2.children?.attached ?? [];

  for (const l3 of l2Children) {
    if (isCaseNode(l3)) {
      // L3 is itself a case (shallow structure: L2 → case)
      const fallbackPage: ParsedPage = pages.find((p) => p.name === "未分类") ?? {
        name: "未分类",
        subGroups: [],
        cases: [],
      };
      if (!pages.includes(fallbackPage)) pages.push(fallbackPage);
      fallbackPage.cases.push({
        title: stripPriorityPrefix(l3.title ?? ""),
        priority: extractPriority(l3),
        preconditions: extractNotes(l3),
        steps: extractSteps(l3),
      });
      continue;
    }

    // L3 is a page node
    const page: ParsedPage = { name: l3.title ?? "", subGroups: [], cases: [] };
    const l3Children = l3.children?.attached ?? [];

    for (const l4 of l3Children) {
      if (isCaseNode(l4)) {
        // L4 is a case directly under page (no sub_group)
        page.cases.push({
          title: stripPriorityPrefix(l4.title ?? ""),
          priority: extractPriority(l4),
          preconditions: extractNotes(l4),
          steps: extractSteps(l4),
        });
      } else {
        // L4 is a sub_group
        const sg: ParsedSubGroup = { name: l4.title ?? "", cases: [] };
        const l4Children = l4.children?.attached ?? [];
        for (const caseNode of l4Children) {
          sg.cases.push({
            title: stripPriorityPrefix(caseNode.title ?? ""),
            priority: extractPriority(caseNode),
            preconditions: extractNotes(caseNode),
            steps: extractSteps(caseNode),
          });
        }
        page.subGroups.push(sg);
      }
    }
    pages.push(page);
  }

  return { name: l2.title ?? "未分类", pages };
}

/** Parse all L1 nodes from XMind sheets, each L1 becomes a separate file */
function parseXmindToL1s(sheets: XMindSheet[]): ParsedL1[] {
  const l1s: ParsedL1[] = [];

  for (const sheet of sheets) {
    const root = sheet.rootTopic;
    if (!root) continue;
    const rootChildren = root.children?.attached ?? [];

    for (const l1Node of rootChildren) {
      const l1Title = l1Node.title ?? "未命名需求";
      const modules: ParsedModule[] = [];
      const l1Children = l1Node.children?.attached ?? [];

      for (const l2Node of l1Children) {
        if (isCaseNode(l2Node)) {
          // L2 is itself a case (very shallow: L1 → case)
          const fallbackMod: ParsedModule = modules.find((m) => m.name === "未分类") ?? {
            name: "未分类",
            pages: [],
          };
          if (!modules.includes(fallbackMod)) modules.push(fallbackMod);
          const fallbackPage: ParsedPage = fallbackMod.pages.find((p) => p.name === "未分类") ?? {
            name: "未分类",
            subGroups: [],
            cases: [],
          };
          if (!fallbackMod.pages.includes(fallbackPage)) fallbackMod.pages.push(fallbackPage);
          fallbackPage.cases.push({
            title: stripPriorityPrefix(l2Node.title ?? ""),
            priority: extractPriority(l2Node),
            preconditions: extractNotes(l2Node),
            steps: extractSteps(l2Node),
          });
        } else {
          modules.push(parseL2Module(l2Node));
        }
      }

      let totalCases = 0;
      for (const m of modules) {
        for (const p of m.pages) {
          totalCases += p.cases.length;
          for (const sg of p.subGroups) {
            totalCases += sg.cases.length;
          }
        }
      }

      l1s.push({ title: l1Title, modules, totalCases });
    }
  }

  return l1s;
}

/** Render a single parsed case to Markdown lines */
function renderCase(c: ParsedCase): string[] {
  const lines: string[] = [];
  lines.push(`##### 【${c.priority}】${c.title}`);
  lines.push("");

  if (c.preconditions) {
    lines.push("> 前置条件");
    lines.push("```");
    lines.push(c.preconditions);
    lines.push("```");
    lines.push("");
  }

  if (c.steps.length > 0) {
    lines.push("> 用例步骤");
    lines.push("");
    lines.push("| 编号 | 步骤 | 预期 |");
    lines.push("| --- | --- | --- |");
    for (let i = 0; i < c.steps.length; i++) {
      const s = c.steps[i];
      const step = s.step.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
      const exp = s.expected.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
      lines.push(`| ${i + 1} | ${step} | ${exp} |`);
    }
    lines.push("");
  }

  return lines;
}

/** Render a ParsedL1 to complete Archive Markdown */
function l1ToMarkdown(l1: ParsedL1): string {
  // Collect names for tag inference
  const moduleNames: string[] = [];
  const pageNames: string[] = [];
  const subGroupNames: string[] = [];
  const caseTitles: string[] = [];

  for (const mod of l1.modules) {
    moduleNames.push(mod.name);
    for (const page of mod.pages) {
      pageNames.push(page.name);
      for (const c of page.cases) caseTitles.push(c.title);
      for (const sg of page.subGroups) {
        subGroupNames.push(sg.name);
        for (const c of sg.cases) caseTitles.push(c.title);
      }
    }
  }

  const tags = inferTags({
    suiteName: l1.title,
    modules: moduleNames,
    pages: pageNames,
    subGroups: subGroupNames,
    caseTitles,
  });

  const { name: cleanName, caseId } = parseL1Title(l1.title);

  const suiteLabel = caseId ? `${cleanName}(#${caseId})` : cleanName;

  const fm: Record<string, string | number | boolean | string[]> = {
    suite_name: suiteLabel,
    description: `${suiteLabel}用例归档`,
    tags,
    create_at: todayString(),
    status: "草稿",
    origin: "xmind",
    case_count: l1.totalCases,
  };
  if (caseId) {
    fm.case_id = caseId;
  }

  const bodyParts: string[] = [];

  for (const mod of l1.modules) {
    bodyParts.push(`## ${mod.name}`);
    bodyParts.push("");

    for (const page of mod.pages) {
      bodyParts.push(`### ${page.name}`);
      bodyParts.push("");

      // Direct page cases (no sub_group)
      for (const c of page.cases) {
        bodyParts.push(...renderCase(c));
      }

      // Sub-group cases
      for (const sg of page.subGroups) {
        bodyParts.push(`#### ${sg.name}`);
        bodyParts.push("");
        for (const c of sg.cases) {
          bodyParts.push(...renderCase(c));
        }
      }
    }
  }

  return buildMarkdown(fm, bodyParts.join("\n"));
}

// ─── File Discovery ───────────────────────────────────────────────────────────

function scanDirectory(dir: string, moduleFilter?: string): string[] {
  const resolved = resolve(dir);
  try {
    return readdirSync(resolved)
      .filter((f) => {
        const ext = extname(f).toLowerCase();
        if (ext !== ".csv" && ext !== ".xmind") return false;
        if (moduleFilter) {
          return f.toLowerCase().includes(moduleFilter.toLowerCase());
        }
        return true;
      })
      .map((f) => join(resolved, f))
      .filter((f) => statSync(f).isFile());
  } catch {
    return [];
  }
}

function computeOutputDir(): string {
  const root = repoRoot();
  const yyyymm = currentYYYYMM();
  const wsDir = getEnv("WORKSPACE_DIR") ?? "workspace";
  return join(root, wsDir, "archive", yyyymm);
}

/** Extract case_id from L1 title like "xxx(#10305)" → "10305", and the clean name without the ticket suffix */
function parseL1Title(title: string): { name: string; caseId?: string } {
  const m = title.match(/\(#(\d+)\)\s*$/);
  if (m) {
    return {
      name: title.slice(0, m.index).trim(),
      caseId: m[1],
    };
  }
  return { name: title };
}

/** Sanitize L1 title for use as filename — preserve【】, remove ticket suffix, strip unsafe chars */
function sanitizeFilename(title: string): string {
  const { name } = parseL1Title(title);
  return name
    .replace(/[\/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim() || "未命名";
}

// ─── Conversion ───────────────────────────────────────────────────────────────

async function convertFile(
  inputPath: string,
  force: boolean,
): Promise<FileConvertResult[]> {
  const ext = extname(inputPath).toLowerCase();
  const outDir = computeOutputDir();

  try {
    const { mkdirSync: mkdir } = await import("node:fs");
    mkdir(outDir, { recursive: true });

    if (ext === ".csv") {
      const outputPath = join(outDir, `${basename(inputPath, extname(inputPath))}.md`);
      if (existsSync(outputPath) && !force) {
        return [{
          input: inputPath,
          output: outputPath,
          status: "skipped",
          reason: "output exists, use --force to overwrite",
        }];
      }
      const rows = await parseCsvFile(inputPath);
      const suiteName = basename(inputPath, extname(inputPath));
      const content = csvRowsToMarkdown(rows, suiteName);
      writeFileSync(outputPath, content, "utf8");
      return [{
        input: inputPath,
        output: outputPath,
        status: "converted",
        caseCount: rows.filter((r) => r.title).length,
      }];
    }

    if (ext === ".xmind") {
      const sheets = await readXmindContentJson(inputPath);
      const l1s = parseXmindToL1s(sheets);

      if (l1s.length === 0) {
        return [{
          input: inputPath,
          output: outDir,
          status: "failed",
          reason: "no L1 nodes found in XMind file",
        }];
      }

      const results: FileConvertResult[] = [];

      for (const l1 of l1s) {
        const fileName = `${sanitizeFilename(l1.title)}.md`;
        const outputPath = join(outDir, fileName);

        if (existsSync(outputPath) && !force) {
          results.push({
            input: inputPath,
            output: outputPath,
            status: "skipped",
            reason: `output exists (L1: ${l1.title}), use --force to overwrite`,
          });
          continue;
        }

        const content = l1ToMarkdown(l1);
        writeFileSync(outputPath, content, "utf8");
        results.push({
          input: inputPath,
          output: outputPath,
          status: "converted",
          caseCount: l1.totalCases,
        });
      }

      return results;
    }

    return [{
      input: inputPath,
      output: outDir,
      status: "failed",
      reason: `unsupported type: ${ext}`,
    }];
  } catch (err) {
    return [{
      input: inputPath,
      output: outDir,
      status: "failed",
      reason: err instanceof Error ? err.message : String(err),
    }];
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const program = new Command("history-convert");
program
  .description("Convert historical CSV/XMind files to Archive Markdown")
  .requiredOption("--path <file-or-dir>", "File or directory to convert")
  .option("--module <key>", "Filter files by module name keyword")
  .option("--detect", "Scan only, report what would be converted (no write)")
  .option("--force", "Overwrite existing archive files")
  .action(
    async (opts: {
      path: string;
      module?: string;
      detect?: boolean;
      force?: boolean;
    }) => {
      const inputPath = resolve(opts.path);
      const detect = opts.detect === true;
      const force = opts.force === true;

      // Collect files to process
      let files: string[] = [];
      if (!existsSync(inputPath)) {
        process.stderr.write(`Error: path not found: "${inputPath}"\n`);
        process.exit(1);
      }

      const stat = statSync(inputPath);
      if (stat.isDirectory()) {
        files = scanDirectory(inputPath, opts.module);
      } else {
        files = [inputPath];
      }

      if (detect) {
        const entries: DetectEntry[] = files.map((f) => ({
          path: f,
          type: extname(f).toLowerCase() === ".csv" ? "csv" : "xmind",
          outputDir: computeOutputDir(),
        }));
        process.stdout.write(`${JSON.stringify(entries, null, 2)}\n`);
        return;
      }

      const results: FileConvertResult[] = [];
      for (const f of files) {
        const fileResults = await convertFile(f, force);
        results.push(...fileResults);
      }

      const out: ConvertOutput = {
        converted: results.filter((r) => r.status === "converted").length,
        skipped: results.filter((r) => r.status === "skipped").length,
        failed: results.filter((r) => r.status === "failed").length,
        files: results,
      };

      process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
    },
  );

program.parseAsync(process.argv);
