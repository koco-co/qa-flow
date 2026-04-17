/**
 * 临时 Playwright 配置 — 用于 ui-blocks 自测阶段
 * 与主 config 相同逻辑，但 testMatch 改为匹配 .temp/ui-blocks/
 */
import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

function loadDotEnv() {
  try {
    const content = readFileSync(`${process.cwd()}/.env`, "utf8");
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
    // .env 不存在时静默跳过
  }
}

loadDotEnv();

const env = (
  process.env.ACTIVE_ENV ??
  process.env.QA_ACTIVE_ENV ??
  "ltqc"
).toUpperCase();
const envLower = env.toLowerCase();

const cookie =
  process.env[`${env}_COOKIE`] ??
  process.env[`QA_COOKIE_${env}`] ??
  process.env.UI_AUTOTEST_COOKIE ??
  "";

const baseUrl =
  process.env[`${env}_BASE_URL`] ??
  process.env[`QA_BASE_URL_${env}`] ??
  process.env.UI_AUTOTEST_BASE_URL ??
  "";

process.env.UI_AUTOTEST_COOKIE = cookie;
if (baseUrl) process.env.UI_AUTOTEST_BASE_URL = baseUrl;

const sessionPath = `.auth/session-${envLower}.json`;
process.env.UI_AUTOTEST_SESSION_PATH = sessionPath;

const yyyymm = new Date().toISOString().slice(0, 7).replace(/-/g, "");
const suiteName = process.env.QA_SUITE_NAME ?? "selftest";
const project = process.env.QA_PROJECT ?? "dataAssets";
const reportDir = `workspace/${project}/reports/playwright/${yyyymm}/${suiteName}/${envLower}`;
const htmlReportDir = `${reportDir}/html`;
const jsonReportFile = `${reportDir}/${suiteName}.json`;

export default defineConfig({
  testMatch: "**/*.ts",
  fullyParallel: false,
  workers: 1,
  testIgnore: [
    "**/*helpers.ts",
    "**/*utils.ts",
    "**/test-data.ts",
    "**/test-data-*.ts",
    "**/data-*.ts",
  ],
  timeout: 60000,
  reporter: [
    ["line"],
    ["json", { outputFile: jsonReportFile }],
    ["html", { outputFolder: htmlReportDir, open: "never" }],
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
