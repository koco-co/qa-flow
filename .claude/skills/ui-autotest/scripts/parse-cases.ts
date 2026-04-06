#!/usr/bin/env npx tsx
/**
 * parse-cases.ts — Archive MD 用例解析器
 *
 * 用法：
 *   npx tsx .claude/skills/ui-autotest/scripts/parse-cases.ts --file workspace/archive/202604/xxx.md
 *   npx tsx .claude/skills/ui-autotest/scripts/parse-cases.ts --file workspace/archive/202604/xxx.md --priority P0
 *   npx tsx .claude/skills/ui-autotest/scripts/parse-cases.ts --help
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { Command } from "commander";
import { parseFrontMatter } from "../../../scripts/lib/frontmatter.ts";

// ────────────────────────────────────────────────────────────
// 类型定义
// ────────────────────────────────────────────────────────────

export interface ParsedStep {
  step: string;
  expected: string;
}

export interface ParsedTask {
  id: string;
  title: string;
  priority: "P0" | "P1" | "P2" | "P3";
  page: string;
  steps: ParsedStep[];
  preconditions: string;
}

export interface ParseResult {
  source: string;
  suite_name: string;
  tasks: ParsedTask[];
  stats: {
    total: number;
    P0: number;
    P1: number;
    P2: number;
    P3: number;
  };
}

// ────────────────────────────────────────────────────────────
// 核心解析函数
// ────────────────────────────────────────────────────────────

/**
 * 从 H5 标题（#####）中提取优先级。
 * 格式：【P0】验证xxx，无前缀时默认 P2
 */
export function extractPriority(title: string): "P0" | "P1" | "P2" | "P3" {
  const match = title.match(/【(P[0-3])】/);
  if (match) return match[1] as "P0" | "P1" | "P2" | "P3";
  return "P2";
}

/**
 * 从步骤表格的 Markdown 行中解析 step 和 expected。
 *
 * 表格格式：
 * | 编号 | 步骤 | 预期 |
 * | ---- | ---- | ---- |
 * | 1    | xxx  | yyy  |
 */
export function parseStepTable(tableText: string): ParsedStep[] {
  const lines = tableText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|") && l.endsWith("|"));

  const steps: ParsedStep[] = [];
  let dataStarted = false;

  for (const line of lines) {
    // 分隔行（含 --- ）跳过，标记数据行开始
    if (/^\|[\s|:-]+\|$/.test(line) || line.includes("---")) {
      dataStarted = true;
      continue;
    }

    if (!dataStarted) {
      // 跳过表头
      continue;
    }

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());

    // 期望至少 3 列：编号、步骤、预期
    if (cells.length < 3) continue;

    const step = cells[1];
    const expected = cells[2];

    if (!step || step === "步骤") continue;

    steps.push({ step, expected: expected ?? "" });
  }

  return steps;
}

/**
 * 从用例块（H5 标题 + 正文）中提取前置条件。
 */
export function extractPreconditions(block: string): string {
  const preMatch = block.match(
    />\s*前置条件\s*\n+([\s\S]*?)(?=\n>|\n#+|\n\||$)/,
  );
  if (preMatch) {
    return preMatch[1]
      .split("\n")
      .map((l) => l.replace(/^>\s?/, "").trim())
      .filter((l) => l.length > 0)
      .join("\n");
  }

  // 尝试匹配 ``` 包裹的前置条件
  const codeMatch = block.match(/```\s*\n([\s\S]*?)\n```/);
  if (codeMatch) {
    return codeMatch[1].trim();
  }

  return "";
}

/**
 * 从 body 中查找当前用例所属的页面名称（H3 级别）。
 */
function findPageForCase(body: string, caseTitle: string): string {
  const lines = body.split("\n");
  let currentPage = "";

  for (const line of lines) {
    const h3Match = line.match(/^###\s+(.+)/);
    if (h3Match) {
      currentPage = h3Match[1].trim();
    }

    if (line.includes(caseTitle.slice(0, 20))) {
      return currentPage;
    }
  }

  return "默认页面";
}

/**
 * 主解析函数：将 Archive MD 文件解析为 ParseResult。
 */
export function parseArchiveMd(content: string, filePath: string): ParseResult {
  const { frontMatter, body } = parseFrontMatter(content);

  const suiteName =
    typeof frontMatter.suite_name === "string"
      ? frontMatter.suite_name
      : basename(filePath, ".md");

  const tasks: ParsedTask[] = [];
  let taskCounter = 0;

  // 按 H5 标题（#####）分割用例块
  // 使用 lookahead 保留分隔符
  const caseBlocks = body.split(/(?=^#####\s)/m).filter((b) => b.trim());

  for (const block of caseBlocks) {
    const titleMatch = block.match(/^#####\s+(.+)/m);
    if (!titleMatch) continue;

    const rawTitle = titleMatch[1].trim();
    const priority = extractPriority(rawTitle);

    // 查找步骤表格：先找 > 用例步骤 后面的表格，找不到则直接找第一个表格
    const tableMatch = block.match(/>\s*用例步骤\s*\n+([\s\S]*)/);
    const steps = tableMatch ? parseStepTable(tableMatch[1]) : [];

    // 如果没有 "用例步骤" 标签，直接搜索块中第一个 Markdown 表格
    const fallbackTableMatch =
      steps.length === 0 ? block.match(/(\|[^\n]+\|\s*\n[\s\S]*)/) : null;
    const finalSteps =
      steps.length > 0
        ? steps
        : fallbackTableMatch
          ? parseStepTable(fallbackTableMatch[1])
          : [];

    const preconditions = extractPreconditions(block);
    const page = findPageForCase(body, rawTitle);

    taskCounter += 1;
    tasks.push({
      id: `t${taskCounter}`,
      title: rawTitle,
      priority,
      page,
      steps: finalSteps,
      preconditions,
    });
  }

  const stats = {
    total: tasks.length,
    P0: tasks.filter((t) => t.priority === "P0").length,
    P1: tasks.filter((t) => t.priority === "P1").length,
    P2: tasks.filter((t) => t.priority === "P2").length,
    P3: tasks.filter((t) => t.priority === "P3").length,
  };

  return { source: filePath, suite_name: suiteName, tasks, stats };
}

// ────────────────────────────────────────────────────────────
// CLI 入口（仅在直接执行时运行，import 时跳过）
// ────────────────────────────────────────────────────────────

async function runCli(): Promise<void> {
  const program = new Command();

  program
    .name("parse-cases")
    .description("解析 Archive MD 测试用例，输出任务队列 JSON")
    .requiredOption("--file <path>", "Archive MD 文件路径")
    .option("--priority <p>", "按优先级过滤，如 P0 或 P0,P1")
    .option("--output <path>", "JSON 输出路径（默认输出到 stdout）")
    .parse(process.argv);

  const opts = program.opts<{
    file: string;
    priority?: string;
    output?: string;
  }>();

  const content = readFileSync(opts.file, "utf-8");
  const result = parseArchiveMd(content, opts.file);

  // 按优先级过滤
  if (opts.priority) {
    const priorities = opts.priority
      .split(",")
      .map((p) => p.trim().toUpperCase());
    result.tasks = result.tasks.filter((t) => priorities.includes(t.priority));
    result.stats.total = result.tasks.length;
    result.stats.P0 = result.tasks.filter((t) => t.priority === "P0").length;
    result.stats.P1 = result.tasks.filter((t) => t.priority === "P1").length;
    result.stats.P2 = result.tasks.filter((t) => t.priority === "P2").length;
    result.stats.P3 = result.tasks.filter((t) => t.priority === "P3").length;
  }

  const json = JSON.stringify(result, null, 2);

  if (opts.output) {
    const { mkdirSync: mkd, writeFileSync: wf } = await import("node:fs");
    const { dirname } = await import("node:path");
    mkd(dirname(opts.output), { recursive: true });
    wf(opts.output, json, "utf-8");
    process.stderr.write(`[parse-cases] 输出至 ${opts.output}\n`);
  } else {
    process.stdout.write(json + "\n");
  }
}

const argv1 = process.argv[1] ?? "";
if (argv1.endsWith("parse-cases.ts") || argv1.endsWith("parse-cases.js")) {
  runCli().catch((err) => {
    process.stderr.write(
      `[parse-cases] 错误：${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  });
}
