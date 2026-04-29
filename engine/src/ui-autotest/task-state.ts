#!/usr/bin/env bun
/**
 * task-state.ts — .task-state.json 读写工具
 *
 * 提供 TaskState/TaskItem 类型定义与原子化读写操作，
 * 供 parse-cases.ts、script-case-agent、主 agent 共享使用。
 *
 * 约定路径：features/{ym}-{slug}/tests/.task-state.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

// ────────────────────────────────────────────────────────────
// 类型定义
// ────────────────────────────────────────────────────────────

export interface TaskStep {
  step: string;
  expected: string;
}

export type TaskPriority = "P0" | "P1" | "P2" | "P3";
export type TaskStatus = "pending" | "in_progress" | "completed" | "failed" | "skipped";
export type TaskPhase = "writing" | "fixing" | "done";
export type FixStatus = "FIXED" | "STILL_FAILING" | "NEED_USER_INPUT";
export type WorkflowStatus = "initialized" | "in_progress" | "completed" | "interrupted";

export interface TaskError {
  message: string;
  phase: "writing" | "fixing";
  attempts: number;
}

export interface FixResult {
  fix_status: FixStatus;
  summary: string;
}

export interface SuggestedSiteKnowledge {
  /** Type of knowledge (site-selectors, site-traps, site-api, site-overview) */
  type: "site-selectors" | "site-traps" | "site-api" | "site-overview";
  /** Site domain (e.g. github.com) */
  domain: string;
  /** Knowledge content (markdown text) */
  content: string;
  /** Confidence level */
  confidence: "high" | "medium" | "low";
}

export interface TaskItem {
  id: string;
  title: string;
  priority: TaskPriority;
  page: string;
  steps: TaskStep[];
  preconditions: string;
  status: TaskStatus;
  phase: TaskPhase;
  assignee?: string;
  error?: TaskError;
  script_path?: string;
  fix_result?: FixResult;
  created_at: string;
  updated_at: string;
}

export interface TaskStateStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  failed: number;
  skipped: number;
  p0_total: number;
  p0_completed: number;
}

export interface TaskStateMeta {
  current_step: string;
  completed_steps: string[];
  started_at: string;
  updated_at: string;
}

export interface TaskState {
  schema_version: "3";
  project: string;
  feature: string;
  suite_name: string;
  source_file: string;
  workflow_status: WorkflowStatus;
  stats: TaskStateStats;
  tasks: TaskItem[];
  meta: TaskStateMeta;
}

// ────────────────────────────────────────────────────────────
// 路径工具
// ────────────────────────────────────────────────────────────

const STATE_FILENAME = ".task-state.json";

/**
 * 从 Archive MD 文件路径推导 tests 目录。
 * 约定：features/{ym}-{slug}/archive.md → features/{ym}-{slug}/tests/
 */
export function resolveTestsDirFromFile(filePath: string): string {
  const resolved = resolve(filePath);
  return join(dirname(resolved), "tests");
}

/**
 * 获取 .task-state.json 的完整路径。
 */
export function stateFilePath(testsDir: string): string {
  return join(testsDir, STATE_FILENAME);
}

// ────────────────────────────────────────────────────────────
// 读写操作
// ────────────────────────────────────────────────────────────

/**
 * 读取 .task-state.json，文件不存在时返回 null。
 */
export function readTaskState(testsDir: string): TaskState | null {
  const filePath = stateFilePath(testsDir);
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as TaskState;
  } catch {
    return null;
  }
}

/**
 * 写入 .task-state.json，自动创建目录。
 */
export function writeTaskState(testsDir: string, state: TaskState): void {
  const filePath = stateFilePath(testsDir);
  mkdirSync(dirname(filePath), { recursive: true });
  state.meta.updated_at = new Date().toISOString();
  writeFileSync(filePath, JSON.stringify(state, null, 2), "utf-8");
}

// ────────────────────────────────────────────────────────────
// 工厂函数
// ────────────────────────────────────────────────────────────

/**
 * 从 parse-cases 的输出创建初始 TaskState。
 */
export function createTaskState(params: {
  project: string;
  feature: string;
  suite_name: string;
  source_file: string;
  tasks: Array<{
    id: string;
    title: string;
    priority: TaskPriority;
    page: string;
    steps: TaskStep[];
    preconditions: string;
  }>;
}): TaskState {
  const now = new Date().toISOString();
  const taskItems: TaskItem[] = params.tasks.map((t) => ({
    ...t,
    status: "pending",
    phase: "writing",
    created_at: now,
    updated_at: now,
  }));

  const stats = calcStats(taskItems);

  return {
    schema_version: "3",
    project: params.project,
    feature: params.feature,
    suite_name: params.suite_name,
    source_file: params.source_file,
    workflow_status: "initialized",
    stats,
    tasks: taskItems,
    meta: {
      current_step: "init",
      completed_steps: [],
      started_at: now,
      updated_at: now,
    },
  };
}

// ────────────────────────────────────────────────────────────
// 状态操作
// ────────────────────────────────────────────────────────────

/**
 * 重新计算 stats 聚合数据。
 */
export function calcStats(tasks: TaskItem[]): TaskStateStats {
  return {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    failed: tasks.filter((t) => t.status === "failed").length,
    skipped: tasks.filter((t) => t.status === "skipped").length,
    p0_total: tasks.filter((t) => t.priority === "P0").length,
    p0_completed: tasks.filter((t) => t.priority === "P0" && t.status === "completed").length,
  };
}

/**
 * 领取下一个待处理任务（原子化：读 → 找 → 标记 → 写回）。
 *
 * 返回 { task, state }；若无可用任务返回 null。
 * agentName 用于 assignee 标记，防止多个 agent 抢同一任务。
 */
export function claimPendingTask(
  testsDir: string,
  agentName: string,
): { task: TaskItem; state: TaskState } | null {
  const state = readTaskState(testsDir);
  if (!state) return null;

  const pending = state.tasks.find((t) => t.status === "pending");
  if (!pending) return null;

  const now = new Date().toISOString();
  pending.status = "in_progress";
  pending.assignee = agentName;
  pending.updated_at = now;

  state.stats = calcStats(state.tasks);
  writeTaskState(testsDir, state);

  return { task: { ...pending }, state };
}

/**
 * 更新指定任务的字段并写回文件。
 */
export function updateTask(
  testsDir: string,
  taskId: string,
  patch: Partial<TaskItem>,
): TaskState | null {
  const state = readTaskState(testsDir);
  if (!state) return null;

  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const now = new Date().toISOString();
  Object.assign(task, patch, { updated_at: now });
  state.stats = calcStats(state.tasks);
  writeTaskState(testsDir, state);

  return state;
}

/**
 * 批量更新任务（用于续传时批量恢复状态）。
 */
export function updateTasks(
  testsDir: string,
  patches: Array<{ id: string; patch: Partial<TaskItem> }>,
): TaskState | null {
  const state = readTaskState(testsDir);
  if (!state) return null;

  const now = new Date().toISOString();
  for (const { id, patch } of patches) {
    const task = state.tasks.find((t) => t.id === id);
    if (task) {
      Object.assign(task, patch, { updated_at: now });
    }
  }
  state.stats = calcStats(state.tasks);
  writeTaskState(testsDir, state);

  return state;
}

// ────────────────────────────────────────────────────────────
// 续传检测
// ────────────────────────────────────────────────────────────

/**
 * 检测 .task-state.json 是否存在且可续传。
 *
 * - 文件不存在 → null
 * - workflow_status 为 completed → can_resume=false, summary="上次已完成"
 * - 有 in_progress 任务 → 标记为 stale_locks，建议续传后重置为 pending
 */
export function detectResume(testsDir: string): {
  can_resume: boolean;
  summary: string;
  stale_locks: string[];
  state: TaskState;
} | null {
  const state = readTaskState(testsDir);
  if (!state) return null;

  const staleLocks = state.tasks
    .filter((t) => t.status === "in_progress")
    .map((t) => `${t.id} (${t.assignee ?? "unknown"})`);

  const { stats } = state;

  let canResume = false;
  let summary: string;

  if (state.workflow_status === "completed") {
    summary = `上次已完成：${stats.completed}/${stats.total}，${stats.failed} 失败`;
  } else if (staleLocks.length > 0) {
    canResume = true;
    summary = `中断于 ${state.meta.updated_at}，已完成 ${stats.completed}/${stats.total}，${stats.pending} 待处理，${staleLocks.length} 个任务可能被锁`;
  } else if (stats.completed > 0 || stats.failed > 0) {
    canResume = true;
    summary = `已完成 ${stats.completed}/${stats.total}，${stats.failed} 失败，${stats.pending} 待处理`;
  } else {
    canResume = false;
    summary = `任务尚未开始（${stats.total} 个待处理）`;
  }

  return { can_resume: canResume, summary, stale_locks: staleLocks, state };
}
