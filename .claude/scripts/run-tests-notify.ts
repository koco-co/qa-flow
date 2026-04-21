#!/usr/bin/env bun
/**
 * run-tests-notify.ts — 跑 Playwright，自动刷新 Allure HTML 报告并推送 IM 通知。
 *
 * 用法：
 *   ACTIVE_ENV=ltqc QA_SUITE_NAME="【通用配置】json格式配置-15696" \
 *     bun run .claude/scripts/run-tests-notify.ts \
 *     "workspace/dataAssets/tests/202604/【通用配置】json格式配置/full.spec.ts" \
 *     --project=chromium
 *
 * 所有位置参数/flag 会原样透传给 `bunx playwright test`。
 *
 * 环境变量（与 playwright.config.ts 保持一致）：
 *   - ACTIVE_ENV / QA_ACTIVE_ENV  环境标识，默认 ltqc
 *   - QA_PROJECT                  qa-flow 内部项目名（workspace 目录），默认 dataAssets
 *   - QA_SUITE_NAME               套件名（需求名），默认 report
 *
 * 通知卡片展示（按优先级取值）：
 *   - 环境 URL：`{ENV}_BASE_URL` → `UI_AUTOTEST_BASE_URL`
 *   - 租户：`QA_TENANT` → 从 `{ENV}_COOKIE` 解析 `dt_tenant_name=`
 *   - 项目：`QA_PROJECT_LABEL` → 租户值兜底 → `QA_PROJECT`
 *
 * 可选开关：
 *   - SKIP_NOTIFY=1           跳过通知发送
 *   - SKIP_ALLURE_GEN=1       跳过 HTML 报告生成
 *   - ALLURE_REPORT_BASE_URL  若配置，将生成在线链接 `${base}/YYYYMM/{suite}/{env}/`
 *   - ALLURE_BIN              allure 可执行路径，默认 `allure`
 *
 * 两阶段执行（并发 + 串行回退）：
 *   - PW_TWO_PHASE=1          启用两阶段：
 *       阶段 1：`--grep-invert=@serial`（默认 PW_FULLY_PARALLEL=1，并发跑通用用例）
 *       阶段 2：`--grep=@serial`（强制 PW_WORKERS=1，串行跑并发不安全用例）
 *     两阶段共享同一 allure-results 目录，最终只生成一次报告 + 发一次通知。
 *     用户自定义 --grep / --grep-invert 与 PW_TWO_PHASE 冲突，会报错退出。
 *     推荐搭配：PW_TWO_PHASE=1 PW_WORKERS=4（阶段 1 并发度，阶段 2 自动降 1）。
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initEnv, getEnv } from "./lib/env.ts";
import {
  collectAllureStats,
  snapshotResultFiles,
  type AllureStats,
} from "./lib/allure-stats.ts";
import { repoRoot } from "./lib/paths.ts";

interface Paths {
  env: string;
  project: string;
  suiteName: string;
  yyyymm: string;
  reportDir: string;
  allureResultsDir: string;
  allureReportDir: string;
}

/** Extract `dt_tenant_name` value from a DTStack cookie string (URL-decoded). */
export function extractTenantFromCookie(cookie: string | undefined): string | undefined {
  if (!cookie) return undefined;
  const match = cookie.match(/(?:^|[;\s])dt_tenant_name=([^;]+)/);
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1]).trim();
  } catch {
    return match[1].trim();
  }
}

function resolvePaths(): Paths {
  const env = (
    process.env.ACTIVE_ENV ??
    process.env.QA_ACTIVE_ENV ??
    "ltqc"
  ).toLowerCase();
  const project = process.env.QA_PROJECT ?? "dataAssets";
  const suiteName = process.env.QA_SUITE_NAME ?? "report";
  const yyyymm = new Date().toISOString().slice(0, 7).replace(/-/g, "");
  const reportDir = resolve(
    repoRoot(),
    `workspace/${project}/reports/allure/${yyyymm}/${suiteName}/${env}`,
  );
  return {
    env,
    project,
    suiteName,
    yyyymm,
    reportDir,
    allureResultsDir: resolve(reportDir, "allure-results"),
    allureReportDir: resolve(reportDir, "allure-report"),
  };
}

function runCommand(
  cmd: string,
  args: string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<number> {
  return new Promise((resolvePromise) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      cwd: opts.cwd ?? repoRoot(),
      env: opts.env ?? process.env,
    });
    child.on("close", (code) => resolvePromise(code ?? 1));
    child.on("error", (err) => {
      process.stderr.write(`[run-tests-notify] spawn error: ${err}\n`);
      resolvePromise(1);
    });
  });
}

export type PhaseName = "single" | "parallel" | "serial";

export interface PhasePlan {
  name: PhaseName;
  args: string[];
  envOverrides: Record<string, string>;
}

/**
 * 将用户透传的 Playwright 参数转为执行计划。
 *
 * - 未启用 two-phase：返回单个 `single` 计划，原样透传 args。
 * - 启用 two-phase：返回 `parallel` + `serial` 两阶段，分别注入 grep 过滤和并发 env。
 *   若用户已自带 `--grep` / `--grep-invert`，抛错以避免静默覆盖用户意图。
 */
export function buildPhasePlans(
  userArgs: readonly string[],
  twoPhase: boolean,
): PhasePlan[] {
  if (!twoPhase) {
    return [{ name: "single", args: [...userArgs], envOverrides: {} }];
  }

  const hasUserGrep = userArgs.some(
    (a) =>
      a === "--grep" ||
      a === "--grep-invert" ||
      a.startsWith("--grep=") ||
      a.startsWith("--grep-invert="),
  );
  if (hasUserGrep) {
    throw new Error(
      "PW_TWO_PHASE=1 与用户自带的 --grep / --grep-invert 冲突；请二选一",
    );
  }

  return [
    {
      name: "parallel",
      args: [...userArgs, "--grep-invert=@serial", "--pass-with-no-tests"],
      envOverrides: { PW_FULLY_PARALLEL: "1" },
    },
    {
      name: "serial",
      args: [...userArgs, "--grep=@serial", "--pass-with-no-tests"],
      envOverrides: { PW_FULLY_PARALLEL: "", PW_WORKERS: "1" },
    },
  ];
}

function buildReportUrl(paths: Paths): string | undefined {
  const base = process.env.ALLURE_REPORT_BASE_URL?.replace(/\/+$/, "");
  if (!base) return undefined;
  const segments = [
    paths.yyyymm,
    paths.suiteName,
    paths.env,
    "allure-report",
  ].map(encodeURIComponent);
  return `${base}/${segments.join("/")}/`;
}

async function main(): Promise<void> {
  initEnv({ cwd: repoRoot() });

  const pwArgs = process.argv.slice(2);
  if (pwArgs.length === 0) {
    process.stderr.write(
      "[run-tests-notify] 缺少 Playwright 参数。示例：\n" +
        '  bun run .claude/scripts/run-tests-notify.ts "workspace/.../full.spec.ts" --project=chromium\n',
    );
    process.exit(2);
  }

  const paths = resolvePaths();
  mkdirSync(paths.allureResultsDir, { recursive: true });

  // Snapshot existing result files so we can filter to only this run's output
  const priorResults = snapshotResultFiles(paths.allureResultsDir);

  process.stderr.write(
    `[run-tests-notify] env=${paths.env} project=${paths.project} suite=${paths.suiteName}\n`,
  );

  // 1. Run Playwright（支持两阶段）
  const twoPhase = process.env.PW_TWO_PHASE === "1";
  let plans: PhasePlan[];
  try {
    plans = buildPhasePlans(pwArgs, twoPhase);
  } catch (err) {
    process.stderr.write(`[run-tests-notify] ${(err as Error).message}\n`);
    process.exit(2);
  }
  if (twoPhase) {
    process.stderr.write(
      `[run-tests-notify] PW_TWO_PHASE=1：先跑 --grep-invert=@serial 并发，再跑 --grep=@serial workers=1\n`,
    );
  }

  const runStart = Date.now();
  let pwExitCode = 0;
  for (const plan of plans) {
    process.stderr.write(
      `[run-tests-notify] phase=${plan.name} args=${plan.args.join(" ")}\n`,
    );
    const phaseEnv: NodeJS.ProcessEnv = {
      ...process.env,
      ...plan.envOverrides,
    };
    const code = await runCommand(
      "bunx",
      ["playwright", "test", ...plan.args],
      { env: phaseEnv },
    );
    process.stderr.write(
      `[run-tests-notify] phase=${plan.name} exit code: ${code}\n`,
    );
    if (code !== 0) pwExitCode = code;
  }
  const runEnd = Date.now();
  process.stderr.write(
    `[run-tests-notify] playwright overall exit code: ${pwExitCode}\n`,
  );

  // 2. Collect stats
  const stats = collectAllureStats(paths.allureResultsDir, {
    excludeFiles: priorResults,
  });

  // Fall back to whole-directory stats if nothing new was recorded (edge case: fresh suite)
  const effectiveStats: AllureStats =
    stats.total === 0 && priorResults.size === 0
      ? collectAllureStats(paths.allureResultsDir)
      : stats;

  // 3. Generate allure HTML
  if (process.env.SKIP_ALLURE_GEN !== "1") {
    const allureBin = process.env.ALLURE_BIN ?? "allure";
    const genCode = await runCommand(allureBin, [
      "generate",
      "--clean",
      "-o",
      paths.allureReportDir,
      paths.allureResultsDir,
    ]);
    if (genCode !== 0) {
      process.stderr.write(
        `[run-tests-notify] allure generate 失败 (exit ${genCode})，继续发送通知\n`,
      );
    }
  }

  // 4. Send notification
  if (process.env.SKIP_NOTIFY === "1") {
    process.stderr.write(`[run-tests-notify] SKIP_NOTIFY=1，跳过通知\n`);
    process.exit(pwExitCode);
  }

  const reportPath = existsSync(paths.allureReportDir)
    ? paths.allureReportDir
    : paths.allureResultsDir;
  const reportUrl = buildReportUrl(paths);

  const envKey = paths.env.toUpperCase();
  const envLabel =
    getEnv(`${envKey}_BASE_URL`) ??
    getEnv("UI_AUTOTEST_BASE_URL") ??
    "";
  const tenant =
    getEnv("QA_TENANT") ??
    extractTenantFromCookie(getEnv(`${envKey}_COOKIE`)) ??
    "";
  const projectLabel = getEnv("QA_PROJECT_LABEL") ?? tenant ?? paths.project;

  const durationMs =
    effectiveStats.durationMs > 0 ? effectiveStats.durationMs : runEnd - runStart;

  const payload = {
    env: paths.env,
    ...(envLabel ? { envLabel } : {}),
    ...(tenant ? { tenant } : {}),
    project: projectLabel,
    suite: paths.suiteName,
    total: effectiveStats.total,
    passed: effectiveStats.passed,
    failed: effectiveStats.failed,
    broken: effectiveStats.broken,
    skipped: effectiveStats.skipped,
    durationMs,
    reportPath,
    ...(reportUrl ? { reportUrl } : {}),
    failedCases: effectiveStats.failedCases,
  };

  const notifyScript = resolve(
    repoRoot(),
    "plugins/notify/send.ts",
  );
  const notifyCode = await runCommand("bun", [
    "run",
    notifyScript,
    "--event",
    "ui-test-completed",
    "--data",
    JSON.stringify(payload),
  ]);
  if (notifyCode !== 0) {
    process.stderr.write(
      `[run-tests-notify] notify 失败 (exit ${notifyCode})\n`,
    );
  }

  // Preserve playwright's exit code so CI sees test failures
  process.exit(pwExitCode);
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  main().catch((err: unknown) => {
    process.stderr.write(`[run-tests-notify] fatal: ${err}\n`);
    process.exit(1);
  });
}
