import { readFileSync } from "fs";
import { resolve } from "path";
import { defineConfig, devices } from "@playwright/test";

// 手动解析 .env，确保 worker 继承时变量已就绪
function loadDotEnv() {
  try {
    const content = readFileSync(process.cwd() + "/.env", "utf8");
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

const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD

export default defineConfig({
  testMatch: "tests/e2e/**/*.spec.ts",
  timeout: 60000,
  reporter: [
    ["line"],
    ["html", { outputFolder: `workspace/reports/playwright/${date}`, open: "never" }],
  ],
  use: {
    headless: false,
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
