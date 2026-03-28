#!/usr/bin/env node
/**
 * harness-step-resolver.mjs
 *
 * Harness 步骤解析器。读取 workflow manifest + .qa-state.json，
 * 返回下一个待执行步骤的完整信息（delegate、prechecks、conditions）。
 *
 * 用法:
 *   node harness-step-resolver.mjs --workflow <name> --state <path> --action next
 *   node harness-step-resolver.mjs --workflow <name> --state <path> --action status
 *   node harness-step-resolver.mjs --workflow <name> --action validate
 *
 * Options:
 *   --workflow <name>   workflow key，如 testCaseGeneration / codeAnalysis
 *   --state <path>      .qa-state.json 路径（action=next/status 时必须）
 *   --action <verb>     next | status | validate
 *   --mode <mode>       quick | full（影响 skippableWhen 评估，默认 full）
 *   --input-type <t>    lanhu-url | story-path | prd-path（影响 optionalFor 评估）
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  loadHarnessWorkflow,
  loadHarnessDelegates,
  loadHarnessHooks,
  loadHarnessContracts,
  getWorkflowStepOrder,
  evaluateStepConditions,
  resolveStepDelegate,
} from "./load-config.mjs";

// ─── CLI 解析 ────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

// ─── 状态读取 ─────────────────────────────────────────────────────────────────

function loadState(statePath) {
  if (!statePath) return null;
  const abs = resolve(statePath);
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8"));
  } catch {
    return null;
  }
}

// ─── 条件评估 ─────────────────────────────────────────────────────────────────

function buildActiveConditions({ mode, inputType }) {
  const conds = [];
  if (mode === "quick") conds.push("quick-mode");
  if (mode === "full" || !mode) conds.push("full-mode");
  if (inputType) conds.push(inputType);
  return conds;
}

// ─── 依赖检查 ─────────────────────────────────────────────────────────────────

/**
 * 检查一个步骤的所有依赖是否满足（已完成或跳过）
 */
function areDepsComplete(step, completedSteps, skippedSteps) {
  const deps = step.dependsOn ?? [];
  return deps.every((dep) => completedSteps.has(dep) || skippedSteps.has(dep));
}

// ─── optionalFor 判断 ─────────────────────────────────────────────────────────

/**
 * 如果步骤有 optionalFor 且当前 inputType 在列表中，则该步骤可跳过
 */
function isOptionalForInput(step, inputType) {
  const optionalFor = step.optionalFor ?? [];
  return optionalFor.length > 0 && inputType && optionalFor.includes(inputType);
}

// ─── modeDependencies 处理 ────────────────────────────────────────────────────

/**
 * 根据当前模式获取步骤的有效依赖列表
 * modeDependencies 覆盖 dependsOn 中的模式相关部分
 */
function getEffectiveDeps(step, activeConditions) {
  const modeDeps = step.modeDependencies;
  if (!modeDeps) return step.dependsOn ?? [];

  const base = step.dependsOn ?? [];
  for (const [modeKey, modeDep] of Object.entries(modeDeps)) {
    if (activeConditions.includes(modeKey)) {
      // 合并 base deps（排除其他模式专属的 dep）和当前模式 deps
      const allModeDepLists = Object.values(modeDeps).flat();
      const nonModeDeps = base.filter((d) => !allModeDepLists.includes(d));
      return [...new Set([...nonModeDeps, ...modeDep])];
    }
  }
  return base;
}

// ─── 完成步骤集合 ─────────────────────────────────────────────────────────────

/**
 * 从 .qa-state.json 推导已完成和已跳过的步骤 Set
 * @param {object|null} state - .qa-state.json 内容
 * @param {object} workflow - workflow manifest 对象
 * @param {string[]} activeConditions - 激活的条件列表
 * @param {string} wfName - workflow key（用于 getWorkflowStepOrder）
 */
function deriveCompletedSets(state, workflow, activeConditions, wfName) {
  const completed = new Set();
  const skipped = new Set();

  if (!state) return { completed, skipped };

  const lastStep = state.last_completed_step;
  const steps = workflow.steps ?? [];

  // 使用拓扑排序顺序（而非 JSON 数组顺序）推导"已完成"集合，确保依赖关系正确
  const topoOrdered = getWorkflowStepOrder(wfName);

  if (typeof lastStep === "number") {
    // 旧数字格式兼容（step 编号 1-10）
    for (let i = 0; i < Math.min(lastStep, topoOrdered.length); i++) {
      completed.add(topoOrdered[i].id);
    }
  } else if (typeof lastStep === "string") {
    // 新字符串格式（step id）— 按拓扑顺序标记"到此步骤为止"都已完成
    for (const s of topoOrdered) {
      completed.add(s.id);
      if (s.id === lastStep) break;
    }
  }

  // 计算应跳过的步骤
  for (const step of steps) {
    if (completed.has(step.id)) continue;
    const condEval = evaluateStepConditions(
      workflow.id ?? "",
      step.id,
      activeConditions
    );
    if (condEval.skip) {
      skipped.add(step.id);
    }
    if (isOptionalForInput(step, activeConditions.find((c) => ["lanhu-url", "story-path", "prd-path"].includes(c)))) {
      skipped.add(step.id);
    }
  }

  return { completed, skipped };
}

// ─── action: next ─────────────────────────────────────────────────────────────

function actionNext(workflowName, state, activeConditions, inputType) {
  const workflow = loadHarnessWorkflow(workflowName);
  if (!workflow) {
    return { error: `workflow "${workflowName}" 不存在` };
  }

  const delegates = loadHarnessDelegates();
  const hooks = loadHarnessHooks();
  const steps = workflow.steps ?? [];

  // 特殊状态：等待验证
  if (state?.awaiting_verification) {
    const notifyStep = steps.find((s) => s.id === "notify");
    if (notifyStep) {
      const delegate = delegates?.[notifyStep.delegate];
      return {
        action: "next",
        currentStep: "awaiting-verification",
        nextStep: {
          id: "notify",
          delegate: delegate ? { id: notifyStep.delegate, ...delegate } : null,
          resumePoint: true,
          reason: "awaiting_verification=true，重播验证提示后等待 Step 10",
        },
        skippedSteps: [],
        completedSteps: [],
        isComplete: false,
      };
    }
  }

  // 特殊状态：Reviewer 阻断
  if (state?.reviewer_status === "escalated") {
    return {
      action: "next",
      currentStep: "reviewer-escalated",
      nextStep: {
        id: "reviewer",
        delegate: delegates ? { id: "caseReviewer", ...delegates["caseReviewer"] } : null,
        resumePoint: true,
        reason: "reviewer_status=escalated，需用户决策后恢复",
      },
      skippedSteps: [],
      completedSteps: [],
      isBlocked: true,
      blockReason: "Reviewer 阻断：问题率 > 40%，等待用户决策",
    };
  }

  const { completed, skipped } = deriveCompletedSets(state, workflow, activeConditions, workflowName);

  // 找到第一个未完成、未跳过、且依赖已满足的步骤
  const pendingSkips = [];
  for (const step of steps) {
    if (completed.has(step.id)) continue;

    // 检查是否应跳过（条件）
    const condEval = evaluateStepConditions(workflowName, step.id, activeConditions);
    if (condEval.skip || skipped.has(step.id)) {
      pendingSkips.push({ id: step.id, reason: condEval.reason ?? "optionalFor" });
      continue;
    }

    // 检查 optionalFor
    if (isOptionalForInput(step, inputType)) {
      pendingSkips.push({ id: step.id, reason: `optional for ${inputType}` });
      continue;
    }

    // 检查依赖（使用 modeDependencies 覆盖）
    const effectiveDeps = getEffectiveDeps(step, activeConditions);
    const depsReady = effectiveDeps.every(
      (dep) => completed.has(dep) || skipped.has(dep)
    );
    if (!depsReady) {
      // 依赖未满足，等待（不是可执行的下一步）
      continue;
    }

    // 找到可执行步骤
    const delegateId = step.delegate;
    const delegate = delegates?.[delegateId];

    // 获取 prechecks
    const prechecks = (step.precheck ?? []).map((hookName) => {
      const hook = hooks?.prechecks?.[hookName];
      return hook ? { name: hookName, ...hook } : { name: hookName };
    });

    // 获取 convergence hook
    let convergenceHook = null;
    if (step.convergenceHook) {
      const hook = hooks?.convergence?.[step.convergenceHook];
      convergenceHook = hook ? { name: step.convergenceHook, ...hook } : { name: step.convergenceHook };
    }

    return {
      action: "next",
      nextStep: {
        id: step.id,
        delegate: delegate ? { id: delegateId, ...delegate } : { id: delegateId },
        prechecks,
        convergenceHook,
        isParallel: step.parallel ?? false,
        resumePoint: step.resumePoint ?? false,
        failureMode: step.failureMode ?? "block",
      },
      skippedSteps: pendingSkips,
      completedSteps: Array.from(completed),
      isComplete: false,
    };
  }

  // 所有步骤已完成或跳过
  return {
    action: "next",
    nextStep: null,
    skippedSteps: pendingSkips,
    completedSteps: Array.from(completed),
    isComplete: true,
  };
}

// ─── action: status ───────────────────────────────────────────────────────────

function actionStatus(workflowName, state, activeConditions) {
  const workflow = loadHarnessWorkflow(workflowName);
  if (!workflow) {
    return { error: `workflow "${workflowName}" 不存在` };
  }

  const steps = workflow.steps ?? [];
  const { completed, skipped } = deriveCompletedSets(state, workflow, activeConditions, workflowName);

  const stepStatuses = steps.map((step) => {
    if (completed.has(step.id)) return { id: step.id, status: "completed" };
    if (skipped.has(step.id)) return { id: step.id, status: "skipped" };
    return { id: step.id, status: "pending" };
  });

  return {
    action: "status",
    workflow: workflowName,
    lastCompletedStep: state?.last_completed_step ?? null,
    awaitingVerification: state?.awaiting_verification ?? false,
    reviewerStatus: state?.reviewer_status ?? null,
    steps: stepStatuses,
    totalSteps: steps.length,
    completedCount: completed.size,
    skippedCount: skipped.size,
    pendingCount: steps.length - completed.size - skipped.size,
  };
}

// ─── action: validate ─────────────────────────────────────────────────────────

function actionValidate(workflowName) {
  const workflow = loadHarnessWorkflow(workflowName);
  if (!workflow) {
    return { valid: false, errors: [`workflow "${workflowName}" 不存在`] };
  }

  const delegates = loadHarnessDelegates();
  const hooks = loadHarnessHooks();
  const errors = [];
  const warnings = [];

  const stepIds = new Set((workflow.steps ?? []).map((s) => s.id));

  for (const step of workflow.steps ?? []) {
    // 检查 delegate 存在
    if (!delegates?.[step.delegate]) {
      errors.push(`步骤 "${step.id}": delegate "${step.delegate}" 未在 delegates.json 注册`);
    }

    // 检查依赖存在
    for (const dep of step.dependsOn ?? []) {
      if (!stepIds.has(dep)) {
        errors.push(`步骤 "${step.id}": dependsOn "${dep}" 引用了不存在的步骤`);
      }
    }

    // 检查 prechecks 存在
    for (const hookName of step.precheck ?? []) {
      if (!hooks?.prechecks?.[hookName]) {
        errors.push(`步骤 "${step.id}": precheck "${hookName}" 未在 hooks.json 注册`);
      }
    }

    // 检查 convergenceHook 存在
    if (step.convergenceHook && !hooks?.convergence?.[step.convergenceHook]) {
      errors.push(`步骤 "${step.id}": convergenceHook "${step.convergenceHook}" 未在 hooks.json 注册`);
    }

    // 检查 skippableWhen 条件存在
    for (const cond of step.skippableWhen ?? []) {
      if (!hooks?.conditions?.[cond]) {
        warnings.push(`步骤 "${step.id}": skippableWhen "${cond}" 未在 hooks.json conditions 注册`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stepCount: (workflow.steps ?? []).length,
  };
}

// ─── main ─────────────────────────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2));

if (!args.workflow) {
  console.error("错误：缺少 --workflow 参数");
  console.error("用法: node harness-step-resolver.mjs --workflow <name> --state <path> --action <next|status|validate>");
  process.exit(1);
}

if (!args.action) {
  console.error("错误：缺少 --action 参数（next | status | validate）");
  process.exit(1);
}

const workflowName = args.workflow;
const statePath = args.state ?? null;
const mode = args.mode ?? "full";
const inputType = args["input-type"] ?? null;
const activeConditions = buildActiveConditions({ mode, inputType });

let state = null;
if (statePath) {
  state = loadState(statePath);
}

let result;
switch (args.action) {
  case "next":
    result = actionNext(workflowName, state, activeConditions, inputType);
    break;
  case "status":
    result = actionStatus(workflowName, state, activeConditions);
    break;
  case "validate":
    result = actionValidate(workflowName);
    break;
  default:
    console.error(`未知 action: "${args.action}"，支持: next | status | validate`);
    process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
if (result.error || (result.valid === false && args.action === "validate")) {
  process.exit(1);
}
