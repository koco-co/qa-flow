#!/usr/bin/env bun
/**
 * parse-cases.ts — Archive MD 用例解析器
 *
 * 输出格式为 TaskState（含 per-task 状态字段），
 * 默认写入 features/{ym}-{slug}/tests/.task-state.json。
 *
 * 用法：
 *   bun run engine/src/ui-autotest/parse-cases.ts --file workspace/{{project}}/features/{{ym}}-{{slug}}/archive.md
 *   bun run engine/src/ui-autotest/parse-cases.ts --file path/to/archive.md --project my-project
 *   bun run engine/src/ui-autotest/parse-cases.ts --file path/to/archive.md --resume
 *   bun run engine/src/ui-autotest/parse-cases.ts --help
 *
 * 兼容旧用法（输出到 stdout 或指定路径）：
 *   bun run engine/src/ui-autotest/parse-cases.ts --file archive.md --output result.json
 *   bun run engine/src/ui-autotest/parse-cases.ts --file archive.md --priority P0
 */

import { readFileSync } from "node:fs";
import { basename, dirname, relative } from "node:path";
import { Command } from "commander";
import { parseFrontMatter } from "../../lib/frontmatter.ts";
import {
  calcStats,
  createTaskState,
  readTaskState,
  resolveTestsDirFromFile,
} from "./task-state.ts";
import type { TaskPriority, TaskState } from "./task-state.ts";

// ────────────────────────────────────────────────────────────
// 类型定义（向后兼容）
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
// 核心解析函数（不变，向后兼容）
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
  const preMatch = block.match(/>\s*前置条件\s*\n+([\s\S]*?)(?=\n>|\n#+|\n\||$)/);
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
 * 主解析函数：将 Archive MD 文件解析为 ParseResult（向后兼容）。
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
// TaskState 转换（新增）
// ────────────────────────────────────────────────────────────

/**
 * 从 Archive MD 路径和内容推导项目名。
 * 路径模式：workspace/{project}/features/{ym}-{slug}/archive.md
 */
export function detectProjectFromPath(filePath: string): string {
  const parts = filePath.replace(/\\/g, "/").split("/");
  const workspaceIdx = parts.lastIndexOf("workspace");
  if (workspaceIdx !== -1 && workspaceIdx + 1 < parts.length) {
    return parts[workspaceIdx + 1];
  }
  return "unknown";
}

/**
 * 从文件路径推导 feature 名。
 * 优先匹配 features/{ym}-{slug} 模式。
 */
export function detectFeatureFromPath(filePath: string): string {
  const match = filePath.match(/features\/(\d{6}-[^/]+)/);
  if (match) return match[1];
  // fallback: 取文件名去掉 .md
  return basename(filePath, ".md");
}

/**
 * 将 Archive MD 解析为 TaskState 格式。
 * 支持 --resume 模式：读取已有 .task-state.json，保留已完成任务状态。
 */
export function parseToTaskState(
  content: string,
  filePath: string,
  options?: {
    project?: string;
    feature?: string;
    resume?: boolean;
  },
): TaskState {
  const parsed = parseArchiveMd(content, filePath);
  const project = options?.project ?? detectProjectFromPath(filePath);
  const feature = options?.feature ?? detectFeatureFromPath(filePath);

  // 续传模式：读取已有状态，合并
  if (options?.resume) {
    const testsDir = resolveTestsDirFromFile(filePath);
    const existing = readTaskState(testsDir);
    if (existing) {
      // 用旧状态中的 task 状态覆盖新解析的同名 task
      const existingMap = new Map(existing.tasks.map((t) => [t.id, t]));
      const mergedTasks = parsed.tasks.map((t) => {
        const old = existingMap.get(t.id);
        if (old && (old.status === "completed" || old.status === "failed" || old.status === "skipped")) {
          return { ...old }; // 保留已完成/失败/跳过的状态
        }
        // 新 task 或未完成的任务重置为 pending
        return t;
      });

      const state = createTaskState({
        project: existing.project,
        feature: existing.feature,
        suite_name: existing.suite_name,
        source_file: filePath,
        tasks: mergedTasks.map((t) => ({
          id: t.id,
          title: t.title,
          priority: t.priority as TaskPriority,
          page: t.page,
          steps: t.steps,
          preconditions: t.preconditions ?? "",
        })),
      });

      // 恢复已完成/失败/跳过任务的状态
      for (const task of state.tasks) {
        const old = existingMap.get(task.id);
        if (old && (old.status === "completed" || old.status === "failed" || old.status === "skipped")) {
          task.status = old.status;
          task.phase = old.phase;
          task.script_path = old.script_path;
          task.fix_result = old.fix_result;
          task.error = old.error;
        } else if (old && old.status === "in_progress") {
          // 中断时 in_progress 的任务重置为 pending
          task.status = "pending";
          task.phase = old.phase;
        }
      }
      state.workflow_status = "in_progress";
      state.stats = calcStats(state.tasks);

      return state;
    }
  }

  return createTaskState({
    project,
    feature,
    suite_name: parsed.suite_name,
    source_file: filePath,
    tasks: parsed.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority as TaskPriority,
      page: t.page,
      steps: t.steps,
      preconditions: t.preconditions ?? "",
    })),
  });
}

// ────────────────────────────────────────────────────────────
// 优先级过滤
// ────────────────────────────────────────────────────────────

function filterTasksByPriority(
  state: TaskState,
  priorities: string[],
): TaskState {
  const filtered = state.tasks.filter((t) =>
    priorities.includes(t.priority),
  );
  state.tasks = filtered;
  state.stats = {
    total: filtered.length,
    pending: filtered.filter((t) => t.status === "pending").length,
    in_progress: filtered.filter((t) => t.status === "in_progress").length,
    completed: filtered.filter((t) => t.status === "completed").length,
    failed: filtered.filter((t) => t.status === "failed").length,
    skipped: filtered.filter((t) => t.status === "skipped").length,
    p0_total: filtered.filter((t) => t.priority === "P0").length,
    p0_completed: filtered.filter((t) => t.priority === "P0" && t.status === "completed").length,
  };
  return state;
}

// ────────────────────────────────────────────────────────────
// CLI 入口
// ────────────────────────────────────────────────────────────

async function runCli(): Promise<void> {
  const program = new Command();

  program
    .name("parse-cases")
    .description("解析 Archive MD 测试用例，输出 .task-state.json")
    .requiredOption("--file <path>", "Archive MD 文件路径")
    .option("--priority <p>", "按优先级过滤，如 P0 或 P0,P1")
    .option("--output <path>", "输出路径（默认自动推导到 tests/.task-state.json）")
    .option("--project <name>", "项目名（默认从路径推导）")
    .option("--resume", "续传模式：保留已有 .task-state.json 中的已完成任务")
    .option("--legacy", "兼容旧格式：输出 ParseResult 而非 TaskState")
    .parse(process.argv);

  const opts = program.opts<{
    file: string;
    priority?: string;
    output?: string;
    project?: string;
    resume?: boolean;
    legacy?: boolean;
  }>();

  // ── 兼容旧格式 ──────────────────────────────────────────
  if (opts.legacy) {
    const content = readFileSync(opts.file, "utf-8");
    const result = parseArchiveMd(content, opts.file);

    if (opts.priority) {
      const priorities = opts.priority.split(",").map((p) => p.trim().toUpperCase());
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
    return;
  }

  // ── 新格式 ─────────────────────────────────────────────
  const content = readFileSync(opts.file, "utf-8");
  let state = parseToTaskState(content, opts.file, {
    project: opts.project,
    resume: opts.resume,
  });

  // 优先级过滤
  if (opts.priority) {
    const priorities = opts.priority.split(",").map((p) => p.trim().toUpperCase());
    state = filterTasksByPriority(state, priorities);
  }

  // 确定输出路径
  const outputPath =
    opts.output ?? resolveTestsDirFromFile(opts.file) + "/.task-state.json";

  // 写入
  const { mkdirSync: mkd, writeFileSync: wf } = await import("node:fs");
  const { dirname } = await import("node:path");
  mkd(dirname(outputPath), { recursive: true });
  wf(outputPath, JSON.stringify(state, null, 2), "utf-8");

  // 信息输出到 stderr，不污染管道
  const mode = opts.resume ? "续传" : "全新";
  process.stderr.write(
    `[parse-cases] ${mode} | project=${state.project} feature=${state.feature} suite=${state.suite_name} tasks=${state.stats.total} output=${outputPath}\n`,
  );

  // 有 p0 统计时额外输出
  if (state.stats.p0_total > 0) {
    process.stderr.write(
      `[parse-cases]  P0: ${state.stats.p0_completed}/${state.stats.p0_total}\n`,
    );
  }
}

const argv1 = process.argv[1] ?? "";
if (
  argv1.endsWith("parse-cases.ts") ||
  argv1.endsWith("parse-cases.js") ||
  argv1.endsWith("parse-cases")
) {
  runCli().catch((err) => {
    process.stderr.write(
      `[parse-cases] 错误：${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  });
}
