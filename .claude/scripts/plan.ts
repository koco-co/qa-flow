#!/usr/bin/env bun
/**
 * plan.ts — Workflow execution plan management CLI.
 *
 * Sits above `progress.ts` (the unified progress engine) as a higher-level plan layer.
 * Generates human-readable MD + machine-readable JSON for workflow tracking.
 *
 * Usage:
 *   kata-cli plan create --project dataAssets --workflow test-case-gen --inputs '{"prd":"..."}'
 *   kata-cli plan update --project dataAssets --plan-id "tcg-xxx" --step step-1 --status completed
 *   kata-cli plan summary --project dataAssets --plan-id "tcg-xxx"
 *   kata-cli plan render --project dataAssets --plan-id "tcg-xxx"
 *   kata-cli plan list --project dataAssets
 *   kata-cli plan --help
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { createCli } from "./lib/cli-runner.ts";
import { outputJson, errorExit } from "./lib/cli.ts";
import { tempDir } from "./lib/paths.ts";

// ── Types ────────────────────────────────────────────────────────────────────

type StepStatus = "pending" | "in_progress" | "completed" | "skipped";

interface PlanStep {
  readonly id: string;
  readonly name: string;
  readonly status: StepStatus;
  readonly description: string;
  readonly depends_on: readonly string[];
  readonly outputs?: readonly string[];
  readonly started_at?: string;
  readonly completed_at?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

interface Plan {
  readonly version: 1;
  readonly workflow: string;
  readonly project: string;
  readonly plan_id: string;
  readonly inputs: Readonly<Record<string, unknown>>;
  readonly steps: readonly PlanStep[];
  readonly created_at: string;
  readonly updated_at: string;
  readonly state_file?: string;
}

type WorkflowType = "test-case-gen" | "ui-autotest";

// ── Step Templates ───────────────────────────────────────────────────────────

const STEP_TEMPLATES: Record<WorkflowType, ReadonlyArray<Omit<PlanStep, "status" | "id">>> = {
  "test-case-gen": [
    { name: "init", description: "识别 PRD，确定运行模式", depends_on: [] },
    { name: "transform", description: "PRD 结构化转换", depends_on: ["step-1"] },
    { name: "enhance", description: "PRD 增强（图片识别、要点补充）", depends_on: ["step-2"] },
    { name: "analyze", description: "测试点提取", depends_on: ["step-3"] },
    { name: "write", description: "用例编写（按模块并行）", depends_on: ["step-4"] },
    { name: "review", description: "质量审查", depends_on: ["step-5"] },
    { name: "format-check", description: "格式规范检查", depends_on: ["step-6"] },
    { name: "output", description: "输出归档（XMind + Archive MD）", depends_on: ["step-7"] },
  ],
  "ui-autotest": [
    { name: "解析用例", description: "解析 Archive MD，提取用例列表", depends_on: [] },
    { name: "筛选范围", description: "按优先级筛选待执行用例", depends_on: ["step-1"] },
    { name: "登录态准备", description: "准备登录 session", depends_on: ["step-2"] },
    { name: "脚本生成", description: "为每条用例生成 Playwright 脚本", depends_on: ["step-3"] },
    { name: "自测验证", description: "执行脚本并修复失败用例", depends_on: ["step-4"] },
    { name: "合并输出", description: "合并脚本为最终 spec 文件", depends_on: ["step-5"] },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString();
}

function slugify(name: string): string {
  return name
    .replace(/[()（）#【】&，。、；：""''《》？！\s]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function planJsonPath(project: string, planId: string): string {
  return join(tempDir(project), `plan-${planId}.json`);
}

function planMdPath(project: string, planId: string): string {
  return join(tempDir(project), `plan-${planId}.md`);
}

function readPlan(project: string, planId: string): Plan | null {
  const filePath = planJsonPath(project, planId);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as Plan;
  } catch (err) {
    throw new Error(`Failed to parse plan file: ${err}`);
  }
}

function writePlan(project: string, planId: string, plan: Plan): void {
  const filePath = planJsonPath(project, planId);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
}

function buildSteps(workflow: WorkflowType): PlanStep[] {
  const templates = STEP_TEMPLATES[workflow];
  return templates.map((t, i) => ({
    ...t,
    id: `step-${i + 1}`,
    status: "pending" as StepStatus,
  }));
}

function generatePlanId(workflow: string, inputs: Record<string, unknown>): string {
  const prefix = workflow === "test-case-gen" ? "tcg" : workflow === "ui-autotest" ? "uat" : slugify(workflow);
  const hint = typeof inputs.prd === "string"
    ? basename(inputs.prd as string, ".md")
    : typeof inputs.archive === "string"
      ? basename(inputs.archive as string, ".md")
      : "plan";
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${prefix}-${slugify(hint)}-${date}`;
}

// ── Status emoji for MD rendering ────────────────────────────────────────────

function statusEmoji(status: StepStatus): string {
  switch (status) {
    case "completed": return "\u2705";
    case "in_progress": return "\uD83D\uDD04";
    case "skipped": return "\u23ED\uFE0F";
    default: return "\u23F3";
  }
}

function statusLabel(status: StepStatus): string {
  switch (status) {
    case "completed": return "完成";
    case "in_progress": return "进行中";
    case "skipped": return "跳过";
    default: return "待开始";
  }
}

function formatDuration(startedAt?: string, completedAt?: string): string {
  if (!startedAt) return "-";
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const seconds = Math.round((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return `${minutes}m${remainSeconds}s`;
}

function renderMd(plan: Plan): string {
  const lines: string[] = [];
  lines.push(`# 计划：${plan.plan_id}`);
  lines.push("");
  lines.push(`- **工作流**: ${plan.workflow}`);
  lines.push(`- **项目**: ${plan.project}`);
  lines.push(`- **创建时间**: ${plan.created_at}`);
  lines.push(`- **更新时间**: ${plan.updated_at}`);
  lines.push("");
  lines.push("## 步骤");
  lines.push("");
  lines.push("| # | 步骤 | 状态 | 耗时 |");
  lines.push("|---|------|------|------|");
  for (const step of plan.steps) {
    const num = step.id.replace("step-", "");
    const emoji = statusEmoji(step.status);
    const label = statusLabel(step.status);
    const duration = formatDuration(step.started_at, step.completed_at);
    lines.push(`| ${num} | ${step.name} | ${emoji} ${label} | ${duration} |`);
  }
  lines.push("");
  lines.push("## 输入");
  lines.push("");
  for (const [key, value] of Object.entries(plan.inputs)) {
    lines.push(`- ${key}: \`${String(value)}\``);
  }
  lines.push("");
  return lines.join("\n");
}

function writeMd(project: string, planId: string, plan: Plan): string {
  const mdPath = planMdPath(project, planId);
  mkdirSync(dirname(mdPath), { recursive: true });
  writeFileSync(mdPath, renderMd(plan), "utf8");
  return mdPath;
}

function isValidWorkflow(workflow: string): workflow is WorkflowType {
  return workflow in STEP_TEMPLATES;
}

// ── Commander ────────────────────────────────────────────────────────────────

function runCreate(opts: {
  project: string;
  workflow: string;
  inputs: string;
  planId?: string;
  stateFile?: string;
}): void {
  if (!isValidWorkflow(opts.workflow)) {
    errorExit(`[plan:create] unknown workflow "${opts.workflow}". Available: ${Object.keys(STEP_TEMPLATES).join(", ")}`);
  }

  let inputs: Record<string, unknown>;
  try {
    inputs = JSON.parse(opts.inputs) as Record<string, unknown>;
  } catch {
    errorExit(`[plan:create] invalid --inputs JSON: ${opts.inputs}`);
  }

  const planId = opts.planId ?? generatePlanId(opts.workflow, inputs);
  const now = nowIso();

  const plan: Plan = {
    version: 1,
    workflow: opts.workflow,
    project: opts.project,
    plan_id: planId,
    inputs,
    steps: buildSteps(opts.workflow),
    created_at: now,
    updated_at: now,
    ...(opts.stateFile ? { state_file: opts.stateFile } : {}),
  };

  writePlan(opts.project, planId, plan);
  const mdPath = writeMd(opts.project, planId, plan);

  outputJson({ ...plan, _md_path: mdPath });
}

function runUpdate(opts: {
  project: string;
  planId: string;
  step: string;
  status: string;
  metadata: string;
}): void {
  const plan = readPlan(opts.project, opts.planId);
  if (!plan) {
    errorExit(`[plan:update] plan "${opts.planId}" not found`);
  }

  const validStatuses: StepStatus[] = ["pending", "in_progress", "completed", "skipped"];
  if (!validStatuses.includes(opts.status as StepStatus)) {
    errorExit(`[plan:update] invalid status "${opts.status}". Available: ${validStatuses.join(", ")}`);
  }

  const stepIndex = plan.steps.findIndex((s) => s.id === opts.step);
  if (stepIndex === -1) {
    errorExit(`[plan:update] step "${opts.step}" not found in plan "${opts.planId}"`);
  }

  let metadata: Record<string, unknown>;
  try {
    metadata = JSON.parse(opts.metadata) as Record<string, unknown>;
  } catch {
    errorExit(`[plan:update] invalid --metadata JSON: ${opts.metadata}`);
  }

  const now = nowIso();
  const existingStep = plan.steps[stepIndex];
  const newStatus = opts.status as StepStatus;

  const updatedStep: PlanStep = {
    ...existingStep,
    status: newStatus,
    started_at: newStatus === "in_progress" && !existingStep.started_at
      ? now
      : existingStep.started_at,
    completed_at: newStatus === "completed" || newStatus === "skipped"
      ? now
      : existingStep.completed_at,
    metadata: Object.keys(metadata).length > 0
      ? { ...(existingStep.metadata ?? {}), ...metadata }
      : existingStep.metadata,
  };

  const updatedSteps = plan.steps.map((s, i) => i === stepIndex ? updatedStep : s);

  const updated: Plan = {
    ...plan,
    steps: updatedSteps,
    updated_at: now,
  };

  writePlan(opts.project, opts.planId, updated);
  writeMd(opts.project, opts.planId, updated);

  outputJson(updated);
}

function runSummary(opts: { project: string; planId: string }): void {
  const plan = readPlan(opts.project, opts.planId);
  if (!plan) {
    errorExit(`[plan:summary] plan "${opts.planId}" not found`);
  }

  const total = plan.steps.length;
  const countByStatus = (status: StepStatus): number =>
    plan.steps.filter((s) => s.status === status).length;

  const completed = countByStatus("completed");
  const inProgress = countByStatus("in_progress");
  const pending = countByStatus("pending");
  const skipped = countByStatus("skipped");

  const currentStep = plan.steps.find((s) => s.status === "in_progress")
    ?? plan.steps.find((s) => s.status === "pending");

  const summary = {
    plan_id: plan.plan_id,
    workflow: plan.workflow,
    project: plan.project,
    total,
    completed,
    in_progress: inProgress,
    pending,
    skipped,
    progress_pct: total > 0 ? Math.round((completed / total) * 100) : 0,
    current_step: currentStep ? { id: currentStep.id, name: currentStep.name } : null,
    created_at: plan.created_at,
    updated_at: plan.updated_at,
  };

  outputJson(summary);
}

function runRender(opts: { project: string; planId: string }): void {
  const plan = readPlan(opts.project, opts.planId);
  if (!plan) {
    errorExit(`[plan:render] plan "${opts.planId}" not found`);
  }

  const mdPath = writeMd(opts.project, opts.planId, plan);
  outputJson({ rendered: true, path: mdPath });
}

function runList(opts: { project: string; workflow?: string }): void {
  const dir = tempDir(opts.project);
  if (!existsSync(dir)) {
    outputJson([]);
    return;
  }

  const files = readdirSync(dir).filter((f) => f.startsWith("plan-") && f.endsWith(".json"));

  const plans: Array<{
    plan_id: string;
    workflow: string;
    progress_pct: number;
    updated_at: string;
  }> = [];

  for (const file of files) {
    try {
      const plan = JSON.parse(readFileSync(join(dir, file), "utf8")) as Plan;
      if (opts.workflow && plan.workflow !== opts.workflow) continue;

      const completed = plan.steps.filter((s) => s.status === "completed").length;
      plans.push({
        plan_id: plan.plan_id,
        workflow: plan.workflow,
        progress_pct: plan.steps.length > 0 ? Math.round((completed / plan.steps.length) * 100) : 0,
        updated_at: plan.updated_at,
      });
    } catch {
      // skip corrupted files
    }
  }

  outputJson(plans);
}

export const program = createCli({
  name: "plan",
  description: "Workflow execution plan management for kata",
  commands: [
    {
      name: "create",
      description: "Create a new plan for a workflow",
      options: [
        { flag: "--project <name>", description: "Project name (e.g. dataAssets)", required: true },
        { flag: "--workflow <type>", description: "Workflow type (test-case-gen | ui-autotest)", required: true },
        { flag: "--inputs <json>", description: "JSON object of workflow inputs", defaultValue: "{}" },
        { flag: "--plan-id <id>", description: "Custom plan ID (auto-generated if omitted)" },
        { flag: "--state-file <path>", description: "Path to associated state file" },
      ],
      action: runCreate,
    },
    {
      name: "update",
      description: "Update a step status in an existing plan",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--plan-id <id>", description: "Plan ID", required: true },
        { flag: "--step <id>", description: "Step ID (e.g. step-1)", required: true },
        { flag: "--status <status>", description: "New status (pending | in_progress | completed | skipped)", required: true },
        { flag: "--metadata <json>", description: "JSON to merge into step metadata", defaultValue: "{}" },
      ],
      action: runUpdate,
    },
    {
      name: "summary",
      description: "Output aggregated progress summary for a plan",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--plan-id <id>", description: "Plan ID", required: true },
      ],
      action: runSummary,
    },
    {
      name: "render",
      description: "Re-generate the MD file from current plan JSON",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--plan-id <id>", description: "Plan ID", required: true },
      ],
      action: runRender,
    },
    {
      name: "list",
      description: "List all plans for a project",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--workflow <type>", description: "Filter by workflow type" },
      ],
      action: runList,
    },
  ],
});
