import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// 手动解析 .env，确保 worker 继承时变量已就绪
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

// 根据 QA_ACTIVE_ENV 自动桥接 Cookie / BaseURL，无需命令行传参
const activeEnv = (process.env.QA_ACTIVE_ENV ?? "ltqc").toUpperCase();
const cookie = process.env[`QA_COOKIE_${activeEnv}`] ?? process.env.UI_AUTOTEST_COOKIE ?? "";
const baseUrl = process.env[`QA_BASE_URL_${activeEnv}`] ?? process.env.UI_AUTOTEST_BASE_URL ?? "";
process.env.UI_AUTOTEST_COOKIE = cookie;
if (baseUrl) process.env.UI_AUTOTEST_BASE_URL = baseUrl;

// 报告路径：workspace/reports/playwright/YYYYMM/{{需求名称}}/{{需求名称}}.html
// 通过环境变量 QA_SUITE_NAME 传入需求名称，默认 report
const yyyymm = new Date().toISOString().slice(0, 7).replace(/-/g, ""); // YYYYMM
const suiteName = process.env.QA_SUITE_NAME ?? "report";
const project = process.env.QA_PROJECT ?? "dataAssets";
const reportDir = `workspace/${project}/reports/playwright/${yyyymm}/${suiteName}`;

export default defineConfig({
  testMatch: `workspace/${project}/tests/**/*.spec.ts`,
  timeout: 60000,
  reporter: [
    ["line"],
    [
      "monocart-reporter",
      {
        name: `${suiteName} - UI自动化测试报告`,
        outputFile: `${reportDir}/${suiteName}.html`,
      },
    ],
  ],
  use: {
    headless: process.env.HEADLESS !== "false",
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
