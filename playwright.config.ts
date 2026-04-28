import { existsSync, readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// 手动解析 .env / .env.envs / .env.local，确保 worker 继承时变量已就绪
// 加载顺序（低 → 高）：.env → .env.envs → .env.local，后加载的不覆盖已有 process.env 值
function loadDotEnvFile(filename: string) {
  try {
    const content = readFileSync(`${process.cwd()}/${filename}`, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1);
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // 文件不存在时静默跳过
  }
}

function loadDotEnv() {
  loadDotEnvFile(".env");
  loadDotEnvFile(".env.envs");
  loadDotEnvFile(".env.local");
}

loadDotEnv();

// §3.4 F7: outputDir 必须按项目隔离，不允许多 project 共用根 test-results/
function resolveOutputDir(): string {
  const project = process.env.KATA_ACTIVE_PROJECT;
  if (!project) {
    // 兼容期：未设置时仍写到仓库根（CI 不应该走到这）
    console.warn(
      "[playwright.config] KATA_ACTIVE_PROJECT not set; falling back to ./test-results. " +
      "This will be rejected in P11 lint."
    );
    return "test-results";
  }
  return `workspace/${project}/.runs/test-results`;
}

// 根据 ACTIVE_ENV 自动桥接 Cookie / BaseURL，无需命令行传参
// 向后兼容：优先读新名 ACTIVE_ENV，回退到旧名 QA_ACTIVE_ENV
const env = (
  process.env.ACTIVE_ENV ?? process.env.QA_ACTIVE_ENV ?? "ltqc"
).toUpperCase();
const envLower = env.toLowerCase();

// Cookie：新名 {ENV}_COOKIE → 旧名 QA_COOKIE_{ENV} → 已有桥接变量
const cookie =
  process.env[`${env}_COOKIE`] ??
  process.env[`QA_COOKIE_${env}`] ??
  process.env.UI_AUTOTEST_COOKIE ??
  "";

// BaseURL：新名 {ENV}_BASE_URL → 旧名 QA_BASE_URL_{ENV} → 已有桥接变量
const baseUrl =
  process.env[`${env}_BASE_URL`] ??
  process.env[`QA_BASE_URL_${env}`] ??
  process.env.UI_AUTOTEST_BASE_URL ??
  "";

// 写入桥接变量供 test-setup.ts 消费
process.env.UI_AUTOTEST_COOKIE = cookie;
if (baseUrl) process.env.UI_AUTOTEST_BASE_URL = baseUrl;

// 报告路径：workspace/{project}/reports/allure/YYYYMM/{suiteName}/{env}/
// 通过环境变量 QA_SUITE_NAME 传入需求名称，默认 report
const yyyymm = new Date().toISOString().slice(0, 7).replace(/-/g, ""); // YYYYMM
const suiteName = process.env.QA_SUITE_NAME ?? "report";
const project = process.env.QA_PROJECT ?? "dataAssets";
// TODO(P10/§10.11): Playwright 测试体系治理时归一化此路径。
// 当前的 month/suite/env 分区有运维价值（多次 run 不互相覆盖），
// 在 P0.5 不做收敛，避免越界。Spec §3.4 P0.5 仅强制 outputDir 归位。
const reportDir = `workspace/${project}/reports/allure/${yyyymm}/${suiteName}/${envLower}`;
const allureResultsDir = `${reportDir}/allure-results`;

// 多项目 session 路径：.auth/{project}/session-{env}.json
// 兼容窗口：新路径不存在且旧路径存在时回退旧路径，并 stderr 提示用户跑 migrate
const newSessionPath = `.auth/${project}/session-${envLower}.json`;
const legacySessionPath = `.auth/session-${envLower}.json`;
const sessionPath =
  existsSync(newSessionPath) || !existsSync(legacySessionPath)
    ? newSessionPath
    : legacySessionPath;

if (sessionPath === legacySessionPath) {
  process.stderr.write(
    `[playwright.config] 使用旧 session 路径 ${legacySessionPath}。建议手动迁移到 .auth/${project}/session-${envLower}.json\n`,
  );
}
process.env.UI_AUTOTEST_SESSION_PATH = sessionPath;

// 并发控制：默认串行（向后兼容），通过环境变量按需开启并发
// - PW_FULLY_PARALLEL=1：同文件内（含 describe 内）用例也并发
// - PW_WORKERS=N：worker 数量；未设置则走 Playwright 默认（CPU / 2）
const fullyParallel = process.env.PW_FULLY_PARALLEL === "1";
const workersEnv = process.env.PW_WORKERS;
const workers =
  workersEnv && /^\d+$/.test(workersEnv) ? Number(workersEnv) : undefined;

export default defineConfig({
  testMatch: [
    `workspace/${project}/tests/**/*.spec.ts`,
    `workspace/${project}/features/**/tests/runners/*.spec.ts`,
    `.kata/${project}/ui-blocks/**/*.ts`,
  ],
  // 排除 .kata/ui-blocks 里的 helpers（被 t*.ts 以相对路径 import）
  // 以及 tests/ 下同目录的 *-helpers.ts（与 spec 并列的工具文件）
  testIgnore: [
    `.kata/${project}/ui-blocks/**/*-helpers.ts`,
    `workspace/${project}/tests/**/*-helpers.ts`,
    `workspace/${project}/features/**/tests/runners/*-helpers.ts`,
  ],
  outputDir: resolveOutputDir(),
  fullyParallel,
  ...(workers !== undefined ? { workers } : {}),
  timeout: 60000,
  reporter: [
    ["line"],
    [
      "allure-playwright",
      {
        detail: true,
        outputFolder: allureResultsDir,
        suiteTitle: `${suiteName} - UI自动化测试 (${envLower})`,
      },
    ],
  ],
  use: {
    headless: process.env.HEADLESS !== "false",
    viewport: { width: 1280, height: 720 },
    storageState: sessionPath,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
