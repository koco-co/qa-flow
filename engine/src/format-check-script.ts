#!/usr/bin/env bun
/**
 * format-check-script.ts — Archive MD 格式规则确定性检查。
 * Usage:
 *   kata-cli format-check-script check --input <archive-md-path>
 */

import { existsSync, readFileSync } from "node:fs";
import { createCli } from "./lib/cli-runner.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedCase {
  title: string;
  idx: number;
  rawContent: string;
  steps: StepRow[];
  lineOffset: number;
}

interface StepRow {
  num: number;
  step: string;
  expected: string;
  lineInDoc: number;
}

interface DefiniteIssue {
  rule: string;
  case_idx: number;
  case_title: string;
  line: number;
  description: string;
  context: string;
}

interface SuspectItem {
  rule: string;
  case_idx: number;
  case_title: string;
  line: number;
  context: string;
  reason: string;
}

interface CheckOutput {
  definite_issues: DefiniteIssue[];
  suspect_items: SuspectItem[];
  stats: {
    total_cases: number;
    definite_count: number;
    suspect_count: number;
  };
}

// ─── Archive Parser ───────────────────────────────────────────────────────────

/**
 * Parse the Archive MD content into individual cases.
 * Cases are delimited by ##### headings.
 */
function parseArchiveMd(content: string): ParsedCase[] {
  const lines = content.split("\n");
  const cases: ParsedCase[] = [];
  let currentStart = -1;
  let currentTitle = "";
  let currentLineOffset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("##### ")) {
      if (currentStart !== -1) {
        const rawContent = lines.slice(currentStart, i).join("\n");
        cases.push(buildCase(cases.length, currentTitle, rawContent, currentLineOffset));
      }
      currentTitle = line.slice(6).trim();
      currentStart = i;
      currentLineOffset = i + 1;
    }
  }

  if (currentStart !== -1) {
    const rawContent = lines.slice(currentStart).join("\n");
    cases.push(buildCase(cases.length, currentTitle, rawContent, currentLineOffset));
  }

  return cases;
}

function buildCase(idx: number, title: string, rawContent: string, lineOffset: number): ParsedCase {
  return {
    title,
    idx,
    rawContent,
    steps: parseStepTable(rawContent, lineOffset),
    lineOffset,
  };
}

/** Parse markdown table rows into StepRow objects */
function parseStepTable(content: string, lineOffset: number): StepRow[] {
  const lines = content.split("\n");
  const rows: StepRow[] = [];
  let inTable = false;
  let headerPassed = false;
  let rowNum = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!inTable) {
      // detect table header: | 编号 | 步骤 | 预期 |
      if (line.startsWith("|") && (line.includes("步骤") || line.includes("Step"))) {
        inTable = true;
        headerPassed = false;
        continue;
      }
      continue;
    }
    // separator line
    if (line.startsWith("|") && /^\|[\s\-:|]+\|/.test(line)) {
      headerPassed = true;
      continue;
    }
    // data rows
    if (headerPassed && line.startsWith("|")) {
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.length >= 3) {
        rowNum++;
        rows.push({
          num: rowNum,
          step: cells[1] ?? "",
          expected: cells[2] ?? "",
          lineInDoc: lineOffset + i,
        });
      }
    } else if (inTable && !line.startsWith("|") && line !== "") {
      inTable = false;
      headerPassed = false;
    }
  }

  return rows;
}

// ─── Rule Checkers ────────────────────────────────────────────────────────────

/**
 * FC01: 标题必须匹配 ^【P[012]】验证.+
 * Returns a DefiniteIssue if violated.
 */
function checkFC01(c: ParsedCase): DefiniteIssue | null {
  const valid = /^【P[012]】验证.+/.test(c.title);
  if (valid) return null;
  return {
    rule: "FC01",
    case_idx: c.idx,
    case_title: c.title,
    line: c.lineOffset,
    description: "标题缺少【P0/P1/P2】优先级前缀或不以'验证'开头",
    context: c.title.slice(0, 40),
  };
}

/**
 * FC02: 首步必须以 进入【...】页面 开头，且包含等待条件（等待/wait）
 * Returns a DefiniteIssue if violated.
 */
function checkFC02(c: ParsedCase): DefiniteIssue | null {
  if (c.steps.length === 0) return null;
  const firstStep = c.steps[0].step;
  const hasNavPrefix = /^进入【[^】]+】页面/.test(firstStep);
  if (!hasNavPrefix) return null; // 首步不是进入页面，不检查等待条件
  const hasWait = /等待|wait/i.test(firstStep);
  if (hasWait) return null;
  return {
    rule: "FC02",
    case_idx: c.idx,
    case_title: c.title,
    line: c.steps[0].lineInDoc,
    description: "首步进入页面后缺少等待条件（如'等待页面加载完成'）",
    context: firstStep.slice(0, 60),
  };
}

/**
 * FC03: 步骤不应使用行内文字编号（步骤N: 或 StepN:），应用表格
 * Returns DefiniteIssues for each line with inline step numbering.
 */
function checkFC03(c: ParsedCase): DefiniteIssue[] {
  const issues: DefiniteIssue[] = [];
  const lines = c.rawContent.split("\n");
  const inlineStepRe = /^(步骤|Step)\s*\d+\s*[:：]/i;
  for (let i = 0; i < lines.length; i++) {
    if (inlineStepRe.test(lines[i].trim())) {
      issues.push({
        rule: "FC03",
        case_idx: c.idx,
        case_title: c.title,
        line: c.lineOffset + i,
        description: "步骤使用行内文字编号，应改为表格格式",
        context: lines[i].trim().slice(0, 60),
      });
    }
  }
  return issues;
}

/**
 * FC04: 模糊词检测 — 归入 suspect（非 definite）
 */
const FUZZY_WORDS = ["尝试", "相关", "某个", "适当的", "正常的", "一些", "若干", "等等", "其他"];
const FUZZY_RE = new RegExp(FUZZY_WORDS.join("|"), "g");

function checkFC04(c: ParsedCase): SuspectItem[] {
  const items: SuspectItem[] = [];
  const allLines = c.rawContent.split("\n");
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const matches = line.match(FUZZY_RE);
    if (matches) {
      for (const word of new Set(matches)) {
        items.push({
          rule: "FC04",
          case_idx: c.idx,
          case_title: c.title,
          line: c.lineOffset + i,
          context: line.trim().slice(0, 60),
          reason: `疑似模糊词'${word}'`,
        });
      }
    }
  }
  return items;
}

/**
 * FC05: 占位符检测（test1/abc/xxx/123456 等）→ definite
 */
const PLACEHOLDER_RE = /\b(test\d+|abc|xxx|yyy|zzz|foo|bar|qwerty|123456|password123|demo\d*)\b/i;

function checkFC05(c: ParsedCase): DefiniteIssue[] {
  const issues: DefiniteIssue[] = [];
  for (const step of c.steps) {
    const match = step.step.match(PLACEHOLDER_RE) ?? step.expected.match(PLACEHOLDER_RE);
    if (match) {
      issues.push({
        rule: "FC05",
        case_idx: c.idx,
        case_title: c.title,
        line: step.lineInDoc,
        description: `步骤或预期结果包含占位符'${match[0]}'`,
        context: step.step.slice(0, 60),
      });
    }
  }
  return issues;
}

/**
 * FC06: 预期结果禁止词检测 — 归入 suspect（非 definite）
 */
const VAGUE_EXPECTED_WORDS = [
  "操作成功",
  "显示正确",
  "加载正常",
  "功能正常",
  "运行正常",
  "执行成功",
  "处理成功",
];
const VAGUE_EXPECTED_RE = new RegExp(VAGUE_EXPECTED_WORDS.join("|"), "g");

function checkFC06(c: ParsedCase): SuspectItem[] {
  const items: SuspectItem[] = [];
  for (const step of c.steps) {
    const matches = step.expected.match(VAGUE_EXPECTED_RE);
    if (matches) {
      for (const word of new Set(matches)) {
        items.push({
          rule: "FC06",
          case_idx: c.idx,
          case_title: c.title,
          line: step.lineInDoc,
          context: step.expected.slice(0, 60),
          reason: `预期结果使用模糊断言词'${word}'，不够具体可验证`,
        });
      }
    }
  }
  return items;
}

/**
 * FC08: 检测多字段堆在一行（逗号/顿号连接多字段）→ definite
 * 触发条件: 步骤中出现 2 个或以上的顿号（、）或逗号连接的操作序列（填写X、选择Y、输入Z）
 */
const MULTI_FIELD_RE = /[\u3001,]([^,，\u3001【】\n]{2,20}[\u3001,]){1,}/;

function checkFC08(c: ParsedCase): DefiniteIssue[] {
  const issues: DefiniteIssue[] = [];
  for (const step of c.steps) {
    if (MULTI_FIELD_RE.test(step.step)) {
      issues.push({
        rule: "FC08",
        case_idx: c.idx,
        case_title: c.title,
        line: step.lineInDoc,
        description: "步骤中多个字段操作堆叠在一行，应拆分为独立步骤",
        context: step.step.slice(0, 60),
      });
    }
  }
  return issues;
}

/**
 * FC10: 检测异步操作（点击按钮/提交等）后缺少等待条件 → definite
 * 触发: 步骤包含 点击【xxx】 但不包含 等待/wait
 */
const ASYNC_ACTION_RE = /点击【[^】]+】/;

function checkFC10(c: ParsedCase): DefiniteIssue[] {
  const issues: DefiniteIssue[] = [];
  for (const step of c.steps) {
    if (ASYNC_ACTION_RE.test(step.step) && !/等待|wait/i.test(step.step)) {
      issues.push({
        rule: "FC10",
        case_idx: c.idx,
        case_title: c.title,
        line: step.lineInDoc,
        description: "异步操作（点击按钮）后缺少等待条件",
        context: step.step.slice(0, 60),
      });
    }
  }
  return issues;
}

// ─── Main Check Logic ─────────────────────────────────────────────────────────

function checkArchive(filePath: string): CheckOutput {
  const content = readFileSync(filePath, "utf8");
  const cases = parseArchiveMd(content);

  const definite_issues: DefiniteIssue[] = [];
  const suspect_items: SuspectItem[] = [];

  for (const c of cases) {
    // FC01
    const fc01 = checkFC01(c);
    if (fc01) definite_issues.push(fc01);

    // FC02
    const fc02 = checkFC02(c);
    if (fc02) definite_issues.push(fc02);

    // FC03
    definite_issues.push(...checkFC03(c));

    // FC04 (suspect)
    suspect_items.push(...checkFC04(c));

    // FC05
    definite_issues.push(...checkFC05(c));

    // FC06 (suspect)
    suspect_items.push(...checkFC06(c));

    // FC08
    definite_issues.push(...checkFC08(c));

    // FC10
    definite_issues.push(...checkFC10(c));
  }

  return {
    definite_issues,
    suspect_items,
    stats: {
      total_cases: cases.length,
      definite_count: definite_issues.length,
      suspect_count: suspect_items.length,
    },
  };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

function runCheck(opts: { input: string }): void {
  const inputPath = opts.input;
  if (!existsSync(inputPath)) {
    process.stderr.write(`Error: File not found: ${inputPath}\n`);
    process.exit(1);
  }
  try {
    const output = checkArchive(inputPath);
    process.stdout.write(JSON.stringify(output, null, 2) + "\n");
  } catch (err) {
    process.stderr.write(`Error: ${String(err)}\n`);
    process.exit(1);
  }
}

export const program = createCli({
  name: "format-check-script",
  description: "Archive MD 格式规则确定性检查",
  commands: [
    {
      name: "check",
      description: "检查 Archive MD 文件的格式规则",
      options: [
        { flag: "--input <path>", description: "Archive MD 文件路径", required: true },
      ],
      action: runCheck,
    },
  ],
});
