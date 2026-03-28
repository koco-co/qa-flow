#!/usr/bin/env node
/**
 * harness-state-machine.mjs
 *
 * Harness 状态机。管理 .qa-state.json 的生命周期：
 * 初始化、步骤推进、失败记录、状态查询。
 *
 * 用法:
 *   node harness-state-machine.mjs --init <workflowName> --state-path <path>
 *   node harness-state-machine.mjs --advance <step-id> --state-path <path>
 *   node harness-state-machine.mjs --fail <step-id> --reason "<msg>" --state-path <path>
 *   node harness-state-machine.mjs --set-writer <name> --writer-status <status> --state-path <path>
 *   node harness-state-machine.mjs --query --state-path <path>
 *
 * writer-status 枚举: pending | in_progress | completed | failed | skipped
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadHarnessContracts, loadHarnessWorkflow } from "./load-config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

// ─── 状态读写 ─────────────────────────────────────────────────────────────────

function readState(statePath) {
  const abs = resolve(statePath);
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8"));
  } catch (e) {
    throw new Error(`无法读取状态文件 ${abs}: ${e.message}`);
  }
}

function writeState(statePath, state) {
  const abs = resolve(statePath);
  writeFileSync(abs, JSON.stringify(state, null, 2), "utf8");
}

// ─── Writer 步骤收敛检查 ──────────────────────────────────────────────────────

function checkWriterConvergence(state) {
  const writers = state.writers ?? {};
  const writerEntries = Object.values(writers);
  if (writerEntries.length === 0) return { ready: true, pending: [] };

  const terminal = ["completed", "skipped"];
  const pending = writerEntries
    .filter((w) => !terminal.includes(w.status))
    .map((w) => w.name ?? w.module ?? "unknown");

  return { ready: pending.length === 0, pending };
}

// ─── action: --init ───────────────────────────────────────────────────────────

function actionInit(workflowName, statePath) {
  const abs = resolve(statePath);
  if (existsSync(abs)) {
    const content = readFileSync(abs, "utf8").trim();
    if (content.length > 0) {
      let existing = null;
      try { existing = JSON.parse(content); } catch {}
      if (existing) {
        console.log(JSON.stringify({
          action: "init",
          result: "already-exists",
          state: existing,
          message: "状态文件已存在，跳过初始化。如需重置请先删除文件。",
        }, null, 2));
        return;
      }
    }
  }

  const contracts = loadHarnessContracts();
  const stateContract = contracts?.state ?? {};

  const initial = {
    workflow: workflowName,
    [stateContract.lastCompletedStepField ?? "last_completed_step"]: 0,
    [stateContract.awaitingVerificationField ?? "awaiting_verification"]: false,
    checklist_confirmed: false,
    reviewer_status: "pending",
    writers: {},
    created_at: new Date().toISOString(),
  };

  writeState(statePath, initial);

  console.log(JSON.stringify({
    action: "init",
    result: "created",
    statePath: resolve(statePath),
    state: initial,
  }, null, 2));
}

// ─── action: --advance ────────────────────────────────────────────────────────

function actionAdvance(stepId, statePath) {
  const state = readState(statePath);
  if (!state) {
    console.error(JSON.stringify({ error: `状态文件不存在: ${statePath}` }));
    process.exit(1);
  }

  const contracts = loadHarnessContracts();
  const lastStepField = contracts?.state?.lastCompletedStepField ?? "last_completed_step";
  const awaitingField = contracts?.state?.awaitingVerificationField ?? "awaiting_verification";

  // Writer 步骤的特殊收敛检查
  if (stepId === "writer") {
    const convergence = checkWriterConvergence(state);
    if (!convergence.ready) {
      console.log(JSON.stringify({
        action: "advance",
        result: "blocked",
        stepId,
        reason: `Writer 收敛未完成，以下 writer 仍在进行: ${convergence.pending.join(", ")}`,
        pendingWriters: convergence.pending,
      }, null, 2));
      return;
    }
  }

  // Reviewer 阻断时不推进
  if (stepId === "reviewer" && state.reviewer_status === "escalated") {
    console.log(JSON.stringify({
      action: "advance",
      result: "blocked",
      stepId,
      reason: "reviewer_status=escalated，需用户决策后才可推进",
    }, null, 2));
    return;
  }

  const updated = {
    ...state,
    [lastStepField]: stepId,
  };

  // 步骤 archive（Step 9）完成时设置 awaiting_verification
  if (stepId === "archive") {
    updated[awaitingField] = true;
  }

  // Reviewer 完成
  if (stepId === "reviewer") {
    updated.reviewer_status = "completed";
  }

  writeState(statePath, updated);

  console.log(JSON.stringify({
    action: "advance",
    result: "ok",
    stepId,
    state: updated,
  }, null, 2));
}

// ─── action: --fail ───────────────────────────────────────────────────────────

function actionFail(stepId, reason, statePath) {
  const state = readState(statePath);
  if (!state) {
    console.error(JSON.stringify({ error: `状态文件不存在: ${statePath}` }));
    process.exit(1);
  }

  const contracts = loadHarnessContracts();
  const recovery = contracts?.recovery ?? {};

  // 找到对应的 recovery 策略
  const recoveryMap = {
    "writer": recovery.writerFailure ?? "resume-from-writer",
    "reviewer": recovery.reviewerEscalation ?? "pause-for-user",
    "lanhu-ingest": recovery.lanhuCookieExpired ?? "refresh-cookie-or-block",
  };
  const recoveryHook = recoveryMap[stepId] ?? "pause-for-user";

  const updated = {
    ...state,
    [`${stepId}_failure`]: {
      reason: reason ?? "未知错误",
      failed_at: new Date().toISOString(),
    },
  };

  // Reviewer 失败时更新 reviewer_status
  if (stepId === "reviewer") {
    updated.reviewer_status = "escalated";
  }

  writeState(statePath, updated);

  console.log(JSON.stringify({
    action: "fail",
    result: "recorded",
    stepId,
    reason,
    recoveryHook,
    state: updated,
  }, null, 2));
}

// ─── action: --set-writer ─────────────────────────────────────────────────────

function actionSetWriter(writerName, writerStatus, statePath) {
  const validStatuses = ["pending", "in_progress", "completed", "failed", "skipped"];
  if (!validStatuses.includes(writerStatus)) {
    console.error(JSON.stringify({
      error: `无效的 writer-status: "${writerStatus}"，支持: ${validStatuses.join(" | ")}`,
    }));
    process.exit(1);
  }

  const state = readState(statePath);
  if (!state) {
    console.error(JSON.stringify({ error: `状态文件不存在: ${statePath}` }));
    process.exit(1);
  }

  const writers = { ...(state.writers ?? {}) };
  writers[writerName] = {
    ...(writers[writerName] ?? { name: writerName }),
    status: writerStatus,
    updated_at: new Date().toISOString(),
  };

  const updated = { ...state, writers };
  writeState(statePath, updated);

  console.log(JSON.stringify({
    action: "set-writer",
    result: "ok",
    writerName,
    writerStatus,
    convergenceReady: checkWriterConvergence(updated).ready,
    state: updated,
  }, null, 2));
}

// ─── action: --query ──────────────────────────────────────────────────────────

function actionQuery(statePath) {
  const state = readState(statePath);
  if (!state) {
    console.log(JSON.stringify({
      action: "query",
      exists: false,
      statePath: resolve(statePath),
    }, null, 2));
    return;
  }

  const contracts = loadHarnessContracts();
  const lastStepField = contracts?.state?.lastCompletedStepField ?? "last_completed_step";
  const awaitingField = contracts?.state?.awaitingVerificationField ?? "awaiting_verification";

  const writerConvergence = checkWriterConvergence(state);

  console.log(JSON.stringify({
    action: "query",
    exists: true,
    statePath: resolve(statePath),
    workflow: state.workflow ?? null,
    lastCompletedStep: state[lastStepField] ?? null,
    awaitingVerification: state[awaitingField] ?? false,
    reviewerStatus: state.reviewer_status ?? null,
    writerConvergence,
    writers: state.writers ?? {},
    createdAt: state.created_at ?? null,
    raw: state,
  }, null, 2));
}

// ─── main ─────────────────────────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2));

if (args.init) {
  if (!args["state-path"]) {
    console.error("错误：--init 需要 --state-path");
    process.exit(1);
  }
  actionInit(args.init, args["state-path"]);
} else if (args.advance) {
  if (!args["state-path"]) {
    console.error("错误：--advance 需要 --state-path");
    process.exit(1);
  }
  actionAdvance(args.advance, args["state-path"]);
} else if (args.fail) {
  if (!args["state-path"]) {
    console.error("错误：--fail 需要 --state-path");
    process.exit(1);
  }
  actionFail(args.fail, args.reason ?? null, args["state-path"]);
} else if (args["set-writer"]) {
  if (!args["state-path"] || !args["writer-status"]) {
    console.error("错误：--set-writer 需要 --writer-status 和 --state-path");
    process.exit(1);
  }
  actionSetWriter(args["set-writer"], args["writer-status"], args["state-path"]);
} else if (args.query) {
  if (!args["state-path"]) {
    console.error("错误：--query 需要 --state-path");
    process.exit(1);
  }
  actionQuery(args["state-path"]);
} else {
  console.error("错误：未指定操作。支持: --init | --advance | --fail | --set-writer | --query");
  console.error("用法:");
  console.error("  node harness-state-machine.mjs --init <workflowName> --state-path <path>");
  console.error("  node harness-state-machine.mjs --advance <step-id> --state-path <path>");
  console.error("  node harness-state-machine.mjs --fail <step-id> --reason '<msg>' --state-path <path>");
  console.error("  node harness-state-machine.mjs --set-writer <name> --writer-status <status> --state-path <path>");
  console.error("  node harness-state-machine.mjs --query --state-path <path>");
  process.exit(1);
}
