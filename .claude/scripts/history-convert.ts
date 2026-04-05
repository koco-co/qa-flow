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
  outputPath: string;
}

interface ConvertOutput {
  converted: number;
  skipped: number;
  failed: number;
  files: FileConvertResult[];
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
      const idxTitle = headers.findIndex((h) => h === "title" || h === "用例标题" || h === "标题");
      const idxSteps = headers.findIndex((h) => h === "steps" || h === "步骤");
      const idxExpected = headers.findIndex(
        (h) => h === "expected" || h === "预期" || h === "预期结果",
      );
      const idxPriority = headers.findIndex((h) => h === "priority" || h === "优先级");

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

  const fm = {
    suite_name: suiteName,
    description: `${suiteName}历史用例归档`,
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
        const expectedLines = row.expected ? row.expected.split(/\n|；|;/) : [""];
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

async function readXmindContentJson(filePath: string): Promise<XMindSheet[]> {
  const buffer = readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const contentFile = zip.file("content.json");
  if (!contentFile) throw new Error("content.json not found in .xmind archive");
  const str = await contentFile.async("string");
  return JSON.parse(str) as XMindSheet[];
}

function walkXmindTree(
  node: XMindTopicNode,
  depth: number,
  cases: CaseEntry[],
  ancestors: string[],
): void {
  const title = node.title ?? "";
  const children = node.children?.attached ?? [];

  // Leaf node (no children) → treat as test case
  if (children.length === 0 && depth >= 3) {
    const module = ancestors[1] ?? ancestors[0] ?? "未分类";
    cases.push({
      module,
      title,
      priority: "P2",
      steps: [],
    });
    return;
  }

  for (const child of children) {
    walkXmindTree(child, depth + 1, cases, [...ancestors, title]);
  }
}

function xmindSheetsToMarkdown(sheets: XMindSheet[], suiteName: string): string {
  const cases: CaseEntry[] = [];

  for (const sheet of sheets) {
    const root = sheet.rootTopic;
    if (!root) continue;
    const l1s = root.children?.attached ?? [];
    for (const l1 of l1s) {
      walkXmindTree(l1, 1, cases, [l1.title ?? ""]);
    }
  }

  const byModule = new Map<string, CaseEntry[]>();
  for (const c of cases) {
    const existing = byModule.get(c.module) ?? [];
    byModule.set(c.module, [...existing, c]);
  }

  const fm = {
    suite_name: suiteName,
    description: `${suiteName}历史用例归档`,
    create_at: todayString(),
    status: "草稿",
    origin: "xmind",
    case_count: cases.length,
  };

  const bodyParts: string[] = [];
  for (const [modName, modCases] of byModule) {
    bodyParts.push(`## ${modName}`);
    bodyParts.push("");
    for (const c of modCases) {
      bodyParts.push(`##### 【${c.priority}】${c.title}`);
      bodyParts.push("");
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

function computeOutputPath(inputPath: string): string {
  const root = repoRoot();
  const yyyymm = currentYYYYMM();
  const base = basename(inputPath, extname(inputPath));
  return join(root, "cases", "archive", yyyymm, `${base}.md`);
}

// ─── Conversion ───────────────────────────────────────────────────────────────

async function convertFile(inputPath: string, force: boolean): Promise<FileConvertResult> {
  const ext = extname(inputPath).toLowerCase();
  const outputPath = computeOutputPath(inputPath);
  const suiteName = basename(inputPath, extname(inputPath));

  if (existsSync(outputPath) && !force) {
    return {
      input: inputPath,
      output: outputPath,
      status: "skipped",
      reason: "output exists, use --force to overwrite",
    };
  }

  try {
    let content: string;
    let caseCount = 0;

    if (ext === ".csv") {
      const rows = await parseCsvFile(inputPath);
      content = csvRowsToMarkdown(rows, suiteName);
      caseCount = rows.filter((r) => r.title).length;
    } else if (ext === ".xmind") {
      const sheets = await readXmindContentJson(inputPath);
      content = xmindSheetsToMarkdown(sheets, suiteName);
      // Count ##### headers as cases
      caseCount = (content.match(/^#{5}\s+/gm) ?? []).length;
    } else {
      return {
        input: inputPath,
        output: outputPath,
        status: "failed",
        reason: `unsupported type: ${ext}`,
      };
    }

    // Ensure output dir exists
    const { mkdirSync: mkdir } = await import("node:fs");
    mkdir(resolve(outputPath, ".."), { recursive: true });

    writeFileSync(outputPath, content, "utf8");
    return { input: inputPath, output: outputPath, status: "converted", caseCount };
  } catch (err) {
    return {
      input: inputPath,
      output: outputPath,
      status: "failed",
      reason: err instanceof Error ? err.message : String(err),
    };
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
  .action(async (opts: { path: string; module?: string; detect?: boolean; force?: boolean }) => {
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
        outputPath: computeOutputPath(f),
      }));
      process.stdout.write(`${JSON.stringify(entries, null, 2)}\n`);
      return;
    }

    const results: FileConvertResult[] = [];
    for (const f of files) {
      const result = await convertFile(f, force);
      results.push(result);
    }

    const out: ConvertOutput = {
      converted: results.filter((r) => r.status === "converted").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      failed: results.filter((r) => r.status === "failed").length,
      files: results,
    };

    process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
  });

program.parseAsync(process.argv);
