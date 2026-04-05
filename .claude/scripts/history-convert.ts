#!/usr/bin/env npx tsx
/**
 * history-convert.ts — Convert historical CSV/XMind files to Archive Markdown.
 *
 * Usage:
 *   npx tsx .claude/scripts/history-convert.ts --path <file-or-dir> [--module <key>] [--detect] [--force]
 *   npx tsx .claude/scripts/history-convert.ts --help
 */

import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { Command } from "commander";
import JSZip from "jszip";
import { buildMarkdown, todayString } from "./lib/frontmatter.ts";
import { getEnv } from "./lib/env.ts";
import { currentYYYYMM, repoRoot } from "./lib/paths.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CsvRow {
  id: string;
  product: string;
  module: string;
  requirement: string;
  title: string;
  preconditions: string;
  steps: string;
  expected: string;
  priority: string;
  createDate: string;
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
  "列表页",
  "新增页",
  "编辑页",
  "详情页",
  "设置页",
  "配置页",
  "新增",
  "编辑",
  "删除",
  "详情",
  "查询",
  "搜索",
  "导入",
  "导出",
  "页面",
  "功能",
  "模块",
  "列表",
  "测试",
  "验证",
  "测试用例",
  "用例",
  "步骤",
  "预期",
  "前置条件",
  "未分类",
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

/**
 * Parse CSV with proper multi-line quoted field support.
 * Reads the entire file and splits into records respecting quoted newlines.
 */
function parseCsvRecords(content: string): string[][] {
  const records: string[][] = [];
  let current = "";
  let inQuotes = false;
  const row: string[] = [];

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(current.trim());
        current = "";
      } else if (ch === "\n" || (ch === "\r" && content[i + 1] === "\n")) {
        if (ch === "\r") i++;
        row.push(current.trim());
        current = "";
        if (row.length > 1 || row[0] !== "") {
          records.push([...row]);
        }
        row.length = 0;
      } else {
        current += ch;
      }
    }
  }
  // Flush last row
  if (current || row.length > 0) {
    row.push(current.trim());
    if (row.length > 1 || row[0] !== "") {
      records.push([...row]);
    }
  }

  return records;
}

/** CSV header name mappings */
const CSV_HEADER_MAP: Record<string, string> = {
  用例编号: "id",
  所属产品: "product",
  所属模块: "module",
  相关需求: "requirement",
  用例标题: "title",
  前置条件: "preconditions",
  步骤: "steps",
  预期: "expected",
  优先级: "priority",
  创建日期: "create_date",
};

async function parseCsvFile(filePath: string): Promise<CsvRow[]> {
  const raw = readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");
  const records = parseCsvRecords(raw);
  if (records.length < 2) return [];

  const headerRow = records[0];
  const colMap = new Map<string, number>();
  for (let i = 0; i < headerRow.length; i++) {
    const normalized = CSV_HEADER_MAP[headerRow[i]] ?? headerRow[i].toLowerCase().replace(/\s+/g, "_");
    colMap.set(normalized, i);
  }

  const get = (row: string[], key: string): string => {
    const idx = colMap.get(key);
    return idx !== undefined ? (row[idx] ?? "") : "";
  };

  const rows: CsvRow[] = [];
  for (let i = 1; i < records.length; i++) {
    const r = records[i];
    const title = get(r, "title");
    if (!title) continue;
    rows.push({
      id: get(r, "id"),
      product: get(r, "product"),
      module: get(r, "module"),
      requirement: get(r, "requirement"),
      title,
      preconditions: cleanRichText(get(r, "preconditions")),
      steps: get(r, "steps"),
      expected: get(r, "expected"),
      priority: get(r, "priority"),
      createDate: get(r, "create_date"),
    });
  }
  return rows;
}

/** Clean HTML entities, tags, and rich-text garbage from Zentao export */
function cleanRichText(text: string): string {
  if (!text) return text;
  return (
    text
      // Decode common HTML entities
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      // Strip HTML tags
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(p|div|span|font|b|i|u|em|strong|li|ul|ol|table|tr|td|th|thead|tbody|a|img|h[1-6])[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      // Collapse excessive blank lines
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/** Parse module path like /版本迭代测试用例/v6.4.8/【需求名】(#10220) */
function parseModulePath(modulePath: string): {
  version: string;
  l1Name: string;
  caseId?: string;
} {
  const segments = modulePath.split("/").filter(Boolean);
  // Typical: ["版本迭代测试用例", "v6.4.8", "【需求名】(#10220)"]
  let version = "";
  let l1Name = "";
  let caseId: string | undefined;

  for (const seg of segments) {
    const vMatch = seg.match(/^v(\d+\.\d+(?:\.\d+)?)$/i);
    if (vMatch) {
      version = vMatch[1];
      continue;
    }
    // L1 requirement segment with possible (#caseId)
    const cidMatch = seg.match(/\(#(\d+)\)\s*$/);
    if (cidMatch) {
      l1Name = seg.slice(0, cidMatch.index).trim();
      caseId = cidMatch[1];
    } else if (seg !== "版本迭代测试用例") {
      l1Name = seg;
    }
  }

  return { version, l1Name: l1Name || "未命名", caseId };
}

/** Known customer prefix → dev_version mapping */
const DEV_VERSION_MAP: Record<string, string> = {
  岚图: "岚图汽车",
  Gate: "Gate",
};

/**
 * Extract dev_version(s) from requirement field prefixes.
 * e.g. "【岚图】【规则集管理】..." → ["岚图汽车"]
 * No known prefix → ["袋鼠云"]
 */
function extractDevVersions(requirements: string[]): string[] {
  const found = new Set<string>();
  for (const req of requirements) {
    if (!req) continue;
    // Match leading 【xxx】 sequences and check against known customers
    const prefixes = [...req.matchAll(/^(?:【([^】]+)】)+/g)];
    let matched = false;
    for (const [, name] of req.matchAll(/【([^】]+)】/g)) {
      const mapped = DEV_VERSION_MAP[name];
      if (mapped) {
        found.add(mapped);
        matched = true;
        break; // first customer prefix wins per requirement
      }
    }
    if (!matched) {
      found.add("袋鼠云");
    }
  }
  return found.size > 0 ? [...found].sort() : ["袋鼠云"];
}

/** Parse product string like 数据资产_STD(#23) */
function parseProduct(product: string): { productName: string; iterationId?: string } {
  const m = product.match(/^(.+?)\(#(\d+)\)\s*$/);
  if (m) return { productName: m[1], iterationId: m[2] };
  return { productName: product };
}

/** Parse multi-line numbered steps into step array */
function parseNumberedLines(text: string): string[] {
  if (!text.trim()) return [];
  // Split by numbered prefix: "1. xxx\n2. xxx" or "1、xxx"
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const result: string[] = [];
  let current = "";

  for (const line of lines) {
    // Check if line starts with a number prefix like "1. " or "1、"
    if (/^\d+[.、)\s]/.test(line)) {
      if (current) result.push(current);
      current = line.replace(/^\d+[.、)\s]+/, "").trim();
    } else {
      // Continuation of previous step
      current = current ? `${current} ${line}` : line;
    }
  }
  if (current) result.push(current);
  return result;
}

/**
 * Split a CSV title into heading path + case title at "验证".
 *
 * Pattern A: 验证「L2」-「L3」-「L4」xxx  → headings=[L2,L3,L4], caseTitle=验证xxx
 * Pattern B: 数据质量-规则库管理 自定义SQL模版 新增 验证xxx → headings=[数据质量-规则库管理,自定义SQL模版,新增], caseTitle=验证xxx
 * Pattern C: 验证xxx (no path prefix) → headings=[], caseTitle=验证xxx
 */
function splitCsvTitle(title: string): { headings: string[]; caseTitle: string } {
  // Pattern A: 验证「X」-「Y」-「Z」rest  or  验证「X」-「Y」rest
  const patA = title.match(
    /^验证((?:「[^」]+」[-,\-—]+)+)(.+)$/,
  );
  if (patA) {
    const pathPart = patA[1];
    const rest = patA[2];
    const headings = [...pathPart.matchAll(/「([^」]+)」/g)].map((m) => m[1]);
    return { headings, caseTitle: `验证${rest}` };
  }

  // Pattern B0: "段 ❯ 段 ❯ 验证xxx" (❯ delimited, Zentao breadcrumb style)
  // Note: ❯ may also appear inside case titles (e.g. in parentheses), so split
  // only the prefix before "验证" by ❯, and keep everything from 验证 onward as title.
  if (title.includes("❯")) {
    const vIdx = title.indexOf("验证");
    if (vIdx > 0) {
      const prefix = title.slice(0, vIdx);
      const caseTitle = title.slice(vIdx);
      const headings = prefix
        .split(/\s*❯\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
      return { headings, caseTitle };
    }
    // No 验证 found — split all by ❯, last part is caseTitle
    const parts = title.split(/\s*❯\s*/);
    return {
      headings: parts.slice(0, -1).filter(Boolean),
      caseTitle: parts[parts.length - 1],
    };
  }

  // Pattern B: "路径段 路径段 ... 验证xxx"
  const idxVerify = title.indexOf("验证");
  if (idxVerify > 0) {
    const prefix = title.slice(0, idxVerify).trim();
    const caseTitle = title.slice(idxVerify);
    const headings = prefix
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return { headings, caseTitle };
  }

  // Pattern C: no hierarchy prefix
  return { headings: [], caseTitle: title };
}

/** Derive archive yyyyMM from create dates of rows in a group */
function deriveArchiveYYYYMM(rows: CsvRow[]): string {
  for (const row of rows) {
    if (row.createDate) {
      const m = row.createDate.match(/^(\d{4})-(\d{2})/);
      if (m) return `${m[1]}${m[2]}`;
    }
  }
  return currentYYYYMM();
}

/**
 * Group CSV rows by L1 (requirement) and convert each group to a separate archive MD.
 * Returns array of { fileName, content, caseCount, caseId, version, archiveYYYYMM }.
 */
function csvRowsToArchives(
  rows: CsvRow[],
): Array<{
  fileName: string;
  content: string;
  caseCount: number;
  caseId?: string;
  version: string;
  productName: string;
  iterationId?: string;
  archiveYYYYMM: string;
}> {
  // Group rows by L1 requirement
  const l1Groups = new Map<
    string,
    { rows: CsvRow[]; caseId?: string; version: string }
  >();

  let productName = "";
  let iterationId: string | undefined;

  for (const row of rows) {
    if (!productName && row.product) {
      const parsed = parseProduct(row.product);
      productName = parsed.productName;
      iterationId = parsed.iterationId;
    }
    const { version, l1Name, caseId } = parseModulePath(row.module);
    const key = l1Name;
    const existing = l1Groups.get(key);
    if (existing) {
      existing.rows.push(row);
      if (!existing.caseId && caseId) existing.caseId = caseId;
      if (!existing.version && version) existing.version = version;
    } else {
      l1Groups.set(key, { rows: [row], caseId, version });
    }
  }

  const results: Array<{
    fileName: string;
    content: string;
    caseCount: number;
    caseId?: string;
    version: string;
    productName: string;
    iterationId?: string;
    archiveYYYYMM: string;
  }> = [];

  for (const [l1Name, group] of l1Groups) {
    const { caseId, version } = group;
    const archiveYYYYMM = deriveArchiveYYYYMM(group.rows);

    const tags = inferTags({
      suiteName: l1Name,
      modules: [],
      pages: [],
      subGroups: [],
      caseTitles: group.rows.map((r) => r.title).filter(Boolean),
    });

    const fm: Record<string, string | number | boolean | string[]> = {
      suite_name: l1Name,
      description: `${l1Name}用例归档`,
      tags,
      prd_version: version ? `v${version}` : "",
      dev_version: extractDevVersions(group.rows.map((r) => r.requirement)),
      create_at: todayString(),
      status: "草稿",
      origin: "csv",
      case_count: group.rows.length,
    };
    if (caseId) fm.case_id = Number(caseId);

    // Group cases by heading path for structured output
    interface CaseWithPath {
      headings: string[];
      caseTitle: string;
      row: CsvRow;
    }
    const casesWithPath: CaseWithPath[] = group.rows
      .filter((r) => r.title)
      .map((r) => {
        const { headings, caseTitle } = splitCsvTitle(r.title);
        return { headings, caseTitle, row: r };
      });

    const bodyParts: string[] = [];
    let prevH2 = "";
    let prevH3 = "";
    let prevH4 = "";

    for (const { headings, caseTitle, row } of casesWithPath) {
      const h2 = headings[0] ?? "";
      const h3 = headings[1] ?? "";
      const h4 = headings[2] ?? "";

      if (h2 && h2 !== prevH2) {
        bodyParts.push(`## ${h2}`);
        bodyParts.push("");
        prevH2 = h2;
        prevH3 = "";
        prevH4 = "";
      }
      if (h3 && h3 !== prevH3) {
        bodyParts.push(`### ${h3}`);
        bodyParts.push("");
        prevH3 = h3;
        prevH4 = "";
      }
      if (h4 && h4 !== prevH4) {
        bodyParts.push(`#### ${h4}`);
        bodyParts.push("");
        prevH4 = h4;
      }

      const priorityTag = normalizePriority(row.priority);
      bodyParts.push(`##### 【${priorityTag}】${caseTitle}`);
      bodyParts.push("");

      // Preconditions
      if (row.preconditions && row.preconditions.trim()) {
        bodyParts.push("> 前置条件");
        bodyParts.push("");
        bodyParts.push("```");
        bodyParts.push(row.preconditions.trim());
        bodyParts.push("```");
        bodyParts.push("");
      }

      // Steps table
      if (row.steps || row.expected) {
        bodyParts.push("> 用例步骤");
        bodyParts.push("");
        bodyParts.push("| 编号 | 步骤 | 预期 |");
        bodyParts.push("| ---- | ---- | ---- |");

        const stepLines = parseNumberedLines(row.steps);
        const expectedLines = parseNumberedLines(row.expected);
        const count = Math.max(stepLines.length, expectedLines.length, 1);

        for (let i = 0; i < count; i++) {
          const step = (stepLines[i] ?? "").replace(/\|/g, "\\|");
          const exp = (expectedLines[i] ?? "").replace(/\|/g, "\\|");
          bodyParts.push(`| ${i + 1} | ${step} | ${exp} |`);
        }
        bodyParts.push("");
      }
    }

    const fileName = sanitizeFilename(l1Name);

    results.push({
      fileName: `${fileName}.md`,
      content: buildMarkdown(fm, bodyParts.join("\n")),
      caseCount: group.rows.length,
      caseId,
      version,
      productName,
      iterationId,
      archiveYYYYMM,
    });
  }

  return results;
}

function normalizePriority(raw: string): string {
  const v = raw.trim();
  if (v === "1" || v.toUpperCase() === "P0" || v === "高" || v.toUpperCase() === "HIGH") return "P0";
  if (v === "2" || v.toUpperCase() === "P1" || v === "中" || v.toUpperCase() === "MEDIUM") return "P1";
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
function extractSteps(
  node: XMindTopicNode,
): { step: string; expected: string }[] {
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
      const fallbackPage: ParsedPage = pages.find(
        (p) => p.name === "未分类",
      ) ?? {
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
          const fallbackMod: ParsedModule = modules.find(
            (m) => m.name === "未分类",
          ) ?? {
            name: "未分类",
            pages: [],
          };
          if (!modules.includes(fallbackMod)) modules.push(fallbackMod);
          const fallbackPage: ParsedPage = fallbackMod.pages.find(
            (p) => p.name === "未分类",
          ) ?? {
            name: "未分类",
            subGroups: [],
            cases: [],
          };
          if (!fallbackMod.pages.includes(fallbackPage))
            fallbackMod.pages.push(fallbackPage);
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
function l1ToMarkdown(l1: ParsedL1, prdVersion?: string): string {
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

  const suiteLabel = cleanName;

  const fm: Record<string, string | number | boolean | string[]> = {
    suite_name: suiteLabel,
    description: `${suiteLabel}用例归档`,
    tags,
    prd_version: prdVersion ?? "",
    dev_version: extractDevVersions([l1.title]),
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
  return (
    name
      .replace(/[\/\\:*?"<>|]/g, "-")
      .replace(/\s+/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .trim() || "未命名"
  );
}

// ─── Conversion ───────────────────────────────────────────────────────────────

async function convertFile(
  inputPath: string,
  force: boolean,
  prdVersion?: string,
): Promise<FileConvertResult[]> {
  const ext = extname(inputPath).toLowerCase();
  const outDir = computeOutputDir();

  try {
    const { mkdirSync: mkdir } = await import("node:fs");
    mkdir(outDir, { recursive: true });

    if (ext === ".csv") {
      const rows = await parseCsvFile(inputPath);
      if (rows.length === 0) {
        return [
          {
            input: inputPath,
            output: outDir,
            status: "failed",
            reason: "no valid rows found in CSV",
          },
        ];
      }

      const archives = csvRowsToArchives(rows);
      const results: FileConvertResult[] = [];

      for (const archive of archives) {
        // Use date-based directory derived from createDate
        const archiveDir = join(
          repoRoot(),
          "workspace",
          "archive",
          archive.archiveYYYYMM,
        );
        mkdir(archiveDir, { recursive: true });

        const outputPath = join(archiveDir, archive.fileName);
        if (existsSync(outputPath) && !force) {
          results.push({
            input: inputPath,
            output: outputPath,
            status: "skipped",
            reason: `output exists (${archive.fileName}), use --force to overwrite`,
          });
          continue;
        }
        writeFileSync(outputPath, archive.content, "utf8");
        results.push({
          input: inputPath,
          output: outputPath,
          status: "converted",
          caseCount: archive.caseCount,
        });
      }

      return results;
    }

    if (ext === ".xmind") {
      const sheets = await readXmindContentJson(inputPath);
      const l1s = parseXmindToL1s(sheets);

      if (l1s.length === 0) {
        return [
          {
            input: inputPath,
            output: outDir,
            status: "failed",
            reason: "no L1 nodes found in XMind file",
          },
        ];
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

        const content = l1ToMarkdown(l1, prdVersion);
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

    return [
      {
        input: inputPath,
        output: outDir,
        status: "failed",
        reason: `unsupported type: ${ext}`,
      },
    ];
  } catch (err) {
    return [
      {
        input: inputPath,
        output: outDir,
        status: "failed",
        reason: err instanceof Error ? err.message : String(err),
      },
    ];
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const program = new Command("history-convert");
program
  .description("Convert historical CSV/XMind files to Archive Markdown")
  .requiredOption("--path <file-or-dir>", "File or directory to convert")
  .option("--module <key>", "Filter files by module name keyword")
  .option("--version <ver>", "PRD version (e.g. v6.4.8)")
  .option("--detect", "Scan only, report what would be converted (no write)")
  .option("--force", "Overwrite existing archive files")
  .action(
    async (opts: {
      path: string;
      module?: string;
      version?: string;
      detect?: boolean;
      force?: boolean;
    }) => {
      const inputPath = resolve(opts.path);
      const detect = opts.detect === true;
      const force = opts.force === true;
      const prdVersion = opts.version;

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
        const fileResults = await convertFile(f, force, prdVersion);
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
