/**
 * test-harness-runtime.mjs
 *
 * 测试 Harness Runtime Protocol 层：
 * - harness-step-resolver.mjs 步骤解析器
 * - harness-state-machine.mjs 状态机
 * - load-config.mjs 新增导出函数
 */
import { execSync } from "child_process";
import { writeFileSync, unlinkSync, existsSync, mkdtempSync } from "fs";
import { resolve, join } from "path";
import { tmpdir } from "os";
import {
  resolveStepDelegate,
  getWorkflowStepOrder,
  evaluateStepConditions,
  loadHarnessWorkflow,
} from "./load-config.mjs";

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ ${msg}`);
    failed++;
  }
}

function runResolver(args) {
  try {
    const out = execSync(`node harness-step-resolver.mjs ${args}`, {
      cwd: resolve("."),
      encoding: "utf8",
    });
    return { code: 0, output: out };
  } catch (e) {
    return { code: e.status ?? 1, output: e.stdout ?? e.message };
  }
}

function runStateMachine(args) {
  try {
    const out = execSync(`node harness-state-machine.mjs ${args}`, {
      cwd: resolve("."),
      encoding: "utf8",
    });
    return { code: 0, output: out };
  } catch (e) {
    return { code: e.status ?? 1, output: e.stdout ?? e.message };
  }
}

function makeTempState(content = null) {
  const dir = mkdtempSync(join(tmpdir(), "qa-harness-test-"));
  const path = join(dir, ".qa-state.json");
  if (content) {
    writeFileSync(path, JSON.stringify(content, null, 2));
  }
  return { path, dir };
}

function cleanup(path) {
  try { unlinkSync(path); } catch {}
}

// ─── load-config.mjs 新增导出 ─────────────────────────────────────────────────

console.log("\n=== Test: resolveStepDelegate ===");

const prdEnhancerDelegate = resolveStepDelegate("testCaseGeneration", "prd-enhancer");
assert(prdEnhancerDelegate !== null, "prd-enhancer delegate 可解析");
assert(prdEnhancerDelegate?.id === "prdEnhancer", "delegate id 正确");
assert(prdEnhancerDelegate?.kind === "skill", "prd-enhancer kind 为 skill");
assert(
  prdEnhancerDelegate?.entry === ".claude/skills/prd-enhancer/SKILL.md",
  "prd-enhancer entry 正确"
);

const caseWriterDelegate = resolveStepDelegate("testCaseGeneration", "writer");
assert(caseWriterDelegate !== null, "writer delegate 可解析");
assert(caseWriterDelegate?.id === "caseWriter", "writer delegate id 正确");
assert(caseWriterDelegate?.kind === "agent", "writer kind 为 agent");

const unknownDelegate = resolveStepDelegate("testCaseGeneration", "nonexistent-step");
assert(unknownDelegate === null, "不存在的步骤返回 null");

const wrongWorkflow = resolveStepDelegate("nonexistentWorkflow", "prd-enhancer");
assert(wrongWorkflow === null, "不存在的 workflow 返回 null");

// ─── getWorkflowStepOrder ─────────────────────────────────────────────────────

console.log("\n=== Test: getWorkflowStepOrder ===");

const stepOrder = getWorkflowStepOrder("testCaseGeneration");
assert(Array.isArray(stepOrder), "返回数组");
assert(stepOrder.length > 0, "步骤列表非空");
assert(stepOrder[0].id === "parse-input", "第一步为 parse-input");

// parse-input 必须在 lanhu-ingest 之前
const parseIdx = stepOrder.findIndex((s) => s.id === "parse-input");
const lanhuIdx = stepOrder.findIndex((s) => s.id === "lanhu-ingest");
assert(parseIdx < lanhuIdx, "parse-input 在 lanhu-ingest 之前");

// source-sync 在 prd-formalize 之前
const sourceSyncIdx = stepOrder.findIndex((s) => s.id === "source-sync");
const prdFormalizeIdx = stepOrder.findIndex((s) => s.id === "prd-formalize");
assert(sourceSyncIdx < prdFormalizeIdx, "source-sync 在 prd-formalize 之前");

// prd-enhancer 在 writer 之前
const prdEnhancerIdx = stepOrder.findIndex((s) => s.id === "prd-enhancer");
const writerIdx = stepOrder.findIndex((s) => s.id === "writer");
assert(prdEnhancerIdx < writerIdx, "prd-enhancer 在 writer 之前");

// ─── evaluateStepConditions ───────────────────────────────────────────────────

console.log("\n=== Test: evaluateStepConditions ===");

const brainstormQuick = evaluateStepConditions("testCaseGeneration", "brainstorm", ["quick-mode"]);
assert(brainstormQuick.skip === true, "quick-mode 下 brainstorm 应跳过");
assert(brainstormQuick.reason === "quick-mode", "跳过原因为 quick-mode");

const brainstormFull = evaluateStepConditions("testCaseGeneration", "brainstorm", ["full-mode"]);
assert(brainstormFull.skip === false, "full-mode 下 brainstorm 不跳过");

const checklistQuick = evaluateStepConditions("testCaseGeneration", "checklist", ["quick-mode"]);
assert(checklistQuick.skip === true, "quick-mode 下 checklist 应跳过");

const parseInputQuick = evaluateStepConditions("testCaseGeneration", "parse-input", ["quick-mode"]);
assert(parseInputQuick.skip === false, "parse-input 不受 quick-mode 影响");

// ─── harness-step-resolver: validate ─────────────────────────────────────────

console.log("\n=== Test: harness-step-resolver validate ===");

const valResult = runResolver("--workflow testCaseGeneration --action validate");
assert(valResult.code === 0, "validate testCaseGeneration 退出码 0");
const valData = JSON.parse(valResult.output);
assert(valData.valid === true, "testCaseGeneration workflow 结构有效");
assert(valData.errors.length === 0, "无结构错误");

const valCodeAnalysis = runResolver("--workflow codeAnalysis --action validate");
assert(valCodeAnalysis.code === 0, "validate codeAnalysis 退出码 0");
const valCAData = JSON.parse(valCodeAnalysis.output);
assert(valCAData.valid === true, "codeAnalysis workflow 结构有效");

const valBad = runResolver("--workflow nonexistentWorkflow --action validate");
assert(valBad.code !== 0, "不存在的 workflow 返回非零退出码");

// ─── harness-step-resolver: next（无状态，新流程）────────────────────────────

console.log("\n=== Test: harness-step-resolver next（新流程）===");

const nextNew = runResolver("--workflow testCaseGeneration --action next");
assert(nextNew.code === 0, "新流程 next 退出码 0");
const nextNewData = JSON.parse(nextNew.output);
assert(nextNewData.nextStep?.id === "parse-input", "新流程第一步为 parse-input");
assert(nextNewData.completedSteps.length === 0, "新流程无已完成步骤");
assert(nextNewData.isComplete === false, "新流程未完成");

// ─── harness-step-resolver: quick mode ───────────────────────────────────────

console.log("\n=== Test: harness-step-resolver quick-mode 跳过 brainstorm/checklist ===");

// 模拟 prd-enhancer 已完成的状态
const { path: statePathQuick, dir: dirQuick } = makeTempState({
  last_completed_step: "prd-enhancer",
  awaiting_verification: false,
  reviewer_status: "pending",
  writers: {},
});

const nextQuick = runResolver(
  `--workflow testCaseGeneration --state "${statePathQuick}" --action next --mode quick`
);
assert(nextQuick.code === 0, "quick-mode next 退出码 0");
const nextQuickData = JSON.parse(nextQuick.output);
// brainstorm 和 checklist 被跳过，下一步应该是 writer（因为 checklist 被跳过，modeDependencies quick-mode = []）
assert(
  nextQuickData.nextStep?.id === "writer",
  `quick-mode 下 prd-enhancer 完成后直接到 writer（实际: ${nextQuickData.nextStep?.id}）`
);
assert(
  nextQuickData.skippedSteps?.some((s) => s.id === "brainstorm"),
  "quick-mode 下 brainstorm 在 skippedSteps 中"
);
assert(
  nextQuickData.skippedSteps?.some((s) => s.id === "checklist"),
  "quick-mode 下 checklist 在 skippedSteps 中"
);
cleanup(statePathQuick);

// ─── harness-step-resolver: awaiting_verification ────────────────────────────

console.log("\n=== Test: harness-step-resolver awaiting_verification ===");

const { path: statePathAwaiting } = makeTempState({
  last_completed_step: "archive",
  awaiting_verification: true,
  reviewer_status: "completed",
  writers: {},
});

const nextAwaiting = runResolver(
  `--workflow testCaseGeneration --state "${statePathAwaiting}" --action next`
);
assert(nextAwaiting.code === 0, "awaiting_verification next 退出码 0");
const nextAwaitingData = JSON.parse(nextAwaiting.output);
assert(
  nextAwaitingData.nextStep?.id === "notify",
  "awaiting_verification 状态下返回 notify 步骤"
);
assert(nextAwaitingData.isComplete === false, "仍未完成（等待用户）");
cleanup(statePathAwaiting);

// ─── harness-step-resolver: reviewer escalated ───────────────────────────────

console.log("\n=== Test: harness-step-resolver reviewer escalated ===");

const { path: statePathEscalated } = makeTempState({
  last_completed_step: "writer",
  awaiting_verification: false,
  reviewer_status: "escalated",
  writers: {},
});

const nextEscalated = runResolver(
  `--workflow testCaseGeneration --state "${statePathEscalated}" --action next`
);
assert(nextEscalated.code === 0, "escalated next 退出码 0");
const nextEscalatedData = JSON.parse(nextEscalated.output);
assert(nextEscalatedData.isBlocked === true, "escalated 状态下标记为阻断");
assert(nextEscalatedData.nextStep?.id === "reviewer", "阻断时返回 reviewer 步骤");
cleanup(statePathEscalated);

// ─── harness-step-resolver: status ───────────────────────────────────────────

console.log("\n=== Test: harness-step-resolver status ===");

const { path: statePathStatus } = makeTempState({
  last_completed_step: "prd-enhancer",
  awaiting_verification: false,
  reviewer_status: "pending",
  writers: {},
});

const statusResult = runResolver(
  `--workflow testCaseGeneration --state "${statePathStatus}" --action status`
);
assert(statusResult.code === 0, "status 退出码 0");
const statusData = JSON.parse(statusResult.output);
assert(statusData.action === "status", "返回 action=status");
assert(statusData.totalSteps > 0, "totalSteps > 0");
assert(statusData.completedCount > 0, "completedCount > 0");
const prdEnhancerStatus = statusData.steps?.find((s) => s.id === "prd-enhancer");
assert(prdEnhancerStatus?.status === "completed", "prd-enhancer 状态为 completed");
cleanup(statePathStatus);

// ─── harness-state-machine: init ─────────────────────────────────────────────

console.log("\n=== Test: harness-state-machine init ===");

const { path: statePathInit } = makeTempState();
const initResult = runStateMachine(
  `--init testCaseGeneration --state-path "${statePathInit}"`
);
assert(initResult.code === 0, "init 退出码 0");
const initData = JSON.parse(initResult.output);
assert(initData.result === "created", "result=created");
assert(initData.state.last_completed_step === 0, "初始 last_completed_step=0");
assert(initData.state.reviewer_status === "pending", "初始 reviewer_status=pending");
assert(initData.state.awaiting_verification === false, "初始 awaiting_verification=false");

// 再次 init 应返回 already-exists
const initAgain = runStateMachine(
  `--init testCaseGeneration --state-path "${statePathInit}"`
);
assert(initAgain.code === 0, "重复 init 退出码 0");
const initAgainData = JSON.parse(initAgain.output);
assert(initAgainData.result === "already-exists", "重复 init 返回 already-exists");
cleanup(statePathInit);

// ─── harness-state-machine: advance ──────────────────────────────────────────

console.log("\n=== Test: harness-state-machine advance ===");

const { path: statePathAdv } = makeTempState();
runStateMachine(`--init testCaseGeneration --state-path "${statePathAdv}"`);

const advResult = runStateMachine(
  `--advance parse-input --state-path "${statePathAdv}"`
);
assert(advResult.code === 0, "advance parse-input 退出码 0");
const advData = JSON.parse(advResult.output);
assert(advData.result === "ok", "advance result=ok");
assert(advData.state.last_completed_step === "parse-input", "last_completed_step 更新为 parse-input");

// archive 步骤推进后应设置 awaiting_verification
runStateMachine(`--advance lanhu-ingest --state-path "${statePathAdv}"`);
runStateMachine(`--advance source-sync --state-path "${statePathAdv}"`);
runStateMachine(`--advance prd-formalize --state-path "${statePathAdv}"`);
runStateMachine(`--advance prd-enhancer --state-path "${statePathAdv}"`);
runStateMachine(`--advance writer --state-path "${statePathAdv}"`);
runStateMachine(`--advance reviewer --state-path "${statePathAdv}"`);
runStateMachine(`--advance xmind --state-path "${statePathAdv}"`);

const archiveAdv = runStateMachine(
  `--advance archive --state-path "${statePathAdv}"`
);
const archiveAdvData = JSON.parse(archiveAdv.output);
assert(
  archiveAdvData.state.awaiting_verification === true,
  "archive 步骤完成后 awaiting_verification=true"
);
cleanup(statePathAdv);

// ─── harness-state-machine: Writer 收敛阻断 ───────────────────────────────────

console.log("\n=== Test: harness-state-machine Writer 收敛阻断 ===");

const { path: statePathWriter } = makeTempState({
  last_completed_step: "prd-enhancer",
  awaiting_verification: false,
  reviewer_status: "pending",
  writers: {
    "writer-A": { name: "writer-A", status: "completed" },
    "writer-B": { name: "writer-B", status: "in_progress" },
  },
});

const writerAdvBlock = runStateMachine(
  `--advance writer --state-path "${statePathWriter}"`
);
assert(writerAdvBlock.code === 0, "writer 收敛阻断退出码 0（警告但不错误）");
const writerBlockData = JSON.parse(writerAdvBlock.output);
assert(writerBlockData.result === "blocked", "writer 有未完成时返回 blocked");
assert(
  writerBlockData.pendingWriters?.includes("writer-B"),
  "pending writers 包含 writer-B"
);
cleanup(statePathWriter);

// ─── harness-state-machine: fail + recovery ──────────────────────────────────

console.log("\n=== Test: harness-state-machine fail ===");

const { path: statePathFail } = makeTempState({
  last_completed_step: "prd-enhancer",
  awaiting_verification: false,
  reviewer_status: "pending",
  writers: {},
});

const failResult = runStateMachine(
  `--fail reviewer --reason "问题率 45%" --state-path "${statePathFail}"`
);
assert(failResult.code === 0, "fail reviewer 退出码 0");
const failData = JSON.parse(failResult.output);
assert(failData.result === "recorded", "fail result=recorded");
assert(failData.state.reviewer_status === "escalated", "reviewer_status 更新为 escalated");
assert(failData.recoveryHook === "pause-for-user", "recovery hook 为 pause-for-user");
cleanup(statePathFail);

// ─── harness-state-machine: set-writer ───────────────────────────────────────

console.log("\n=== Test: harness-state-machine set-writer ===");

const { path: statePathSW } = makeTempState({
  last_completed_step: "prd-enhancer",
  awaiting_verification: false,
  reviewer_status: "pending",
  writers: {},
});

const swResult = runStateMachine(
  `--set-writer "列表页" --writer-status in_progress --state-path "${statePathSW}"`
);
assert(swResult.code === 0, "set-writer 退出码 0");
const swData = JSON.parse(swResult.output);
assert(swData.result === "ok", "set-writer result=ok");
assert(swData.state.writers["列表页"]?.status === "in_progress", "writer 状态为 in_progress");
assert(swData.convergenceReady === false, "writer 未全部完成时 convergenceReady=false");

runStateMachine(`--set-writer "列表页" --writer-status completed --state-path "${statePathSW}"`);
const swQuery = runStateMachine(`--query --state-path "${statePathSW}"`);
const swQueryData = JSON.parse(swQuery.output);
assert(
  swQueryData.writerConvergence.ready === true,
  "所有 writer 完成后 convergenceReady=true"
);
cleanup(statePathSW);

// ─── harness-state-machine: query ────────────────────────────────────────────

console.log("\n=== Test: harness-state-machine query ===");

const { path: statePathQuery } = makeTempState({
  workflow: "testCaseGeneration",
  last_completed_step: "writer",
  awaiting_verification: false,
  reviewer_status: "pending",
  writers: { "A": { name: "A", status: "completed" } },
});

const queryResult = runStateMachine(`--query --state-path "${statePathQuery}"`);
assert(queryResult.code === 0, "query 退出码 0");
const queryData = JSON.parse(queryResult.output);
assert(queryData.exists === true, "exists=true");
assert(queryData.lastCompletedStep === "writer", "lastCompletedStep 正确");
assert(queryData.awaitingVerification === false, "awaitingVerification=false");
assert(queryData.reviewerStatus === "pending", "reviewerStatus=pending");
cleanup(statePathQuery);

// 查询不存在的状态文件
const nonExistPath = "/tmp/qa-harness-test-nonexistent-12345.json";
const queryNone = runStateMachine(`--query --state-path "${nonExistPath}"`);
assert(queryNone.code === 0, "查询不存在文件退出码 0");
const queryNoneData = JSON.parse(queryNone.output);
assert(queryNoneData.exists === false, "不存在文件返回 exists=false");

// ─── 环检测测试 ──────────────────────────────────────────────────────────────────

console.log("\n=== Test: getWorkflowStepOrder cycle detection ===");

// 正常工作流不抛出异常，且返回有序步骤列表
try {
  const steps = getWorkflowStepOrder("testCaseGeneration");
  assert(steps.length > 0, "正常工作流拓扑排序返回步骤列表");
  // 验证 parse-input 排在 brainstorm 之前（基本依赖顺序）
  const ids = steps.map((s) => s.id);
  const parseIdx = ids.indexOf("parse-input");
  const brainstormIdx = ids.indexOf("brainstorm");
  assert(parseIdx < brainstormIdx, "parse-input 排在 brainstorm 之前");
} catch (err) {
  assert(false, `正常工作流拓扑排序不应抛出异常: ${err.message}`);
}

// code-analysis 工作流也无环
try {
  const caSteps = getWorkflowStepOrder("codeAnalysis");
  assert(caSteps.length > 0, "code-analysis 工作流拓扑排序返回步骤列表");
} catch (err) {
  assert(false, `code-analysis 工作流拓扑排序不应抛出异常: ${err.message}`);
}

// ─── 摘要 ──────────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(50)}`);
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log("═".repeat(50));

if (failed > 0) process.exit(1);
