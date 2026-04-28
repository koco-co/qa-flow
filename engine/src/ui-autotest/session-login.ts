#!/usr/bin/env bun

/**
 * session-login.ts — Playwright 登录态管理
 *
 * 用法：
 *   bun run .claude/skills/ui-autotest/scripts/session-login.ts \
 *     --url https://xxx.dtstack.cn \
 *     --output .auth/session.json
 *
 * 功能：
 * 1. 检查已有 session.json 是否有效（未过期）
 * 2. 若无效或缺失，打开浏览器引导用户手动登录
 * 3. 保存 storageState 到指定路径
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createInterface } from "node:readline";
import { Command } from "commander";

// ────────────────────────────────────────────────────────────
// 类型定义
// ────────────────────────────────────────────────────────────

interface SessionResult {
  session_path: string;
  valid: boolean;
  expires?: string;
  message?: string;
}

interface StorageState {
  cookies?: Array<{
    name: string;
    expires: number;
    [key: string]: unknown;
  }>;
  origins?: unknown[];
}

// ────────────────────────────────────────────────────────────
// Session 校验
// ────────────────────────────────────────────────────────────

/**
 * 检查 session.json 是否存在且未过期。
 * 通过读取 cookies 中的过期时间判断。
 */
export function checkSessionValid(sessionPath: string): {
  valid: boolean;
  expires?: string;
} {
  if (!existsSync(sessionPath)) {
    return { valid: false };
  }

  try {
    const raw = readFileSync(sessionPath, "utf-8");
    const state: StorageState = JSON.parse(raw);

    if (!state.cookies || state.cookies.length === 0) {
      return { valid: false };
    }

    // 找最晚过期的 cookie
    let latestExpiry = 0;
    for (const cookie of state.cookies) {
      if (cookie.expires && cookie.expires > latestExpiry) {
        latestExpiry = cookie.expires;
      }
    }

    if (latestExpiry === 0) {
      // session cookie（无过期时间），视为有效
      return { valid: true };
    }

    const nowSeconds = Date.now() / 1000;
    if (latestExpiry > nowSeconds) {
      const expiresDate = new Date(latestExpiry * 1000).toISOString();
      return { valid: true, expires: expiresDate };
    }

    return {
      valid: false,
      expires: new Date(latestExpiry * 1000).toISOString(),
    };
  } catch {
    return { valid: false };
  }
}

/**
 * 等待用户按 Enter 键
 */
function waitForEnter(prompt: string): Promise<void> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

/**
 * 引导用户完成登录，保存 storageState。
 */
async function guidedLogin(url: string, outputPath: string): Promise<void> {
  // 动态导入 playwright，避免在未安装时报错
  let chromium: unknown;
  try {
    const pw = await import("playwright");
    chromium = (pw as { chromium: unknown }).chromium;
  } catch {
    throw new Error(
      "未找到 playwright 模块。请先安装：bun install @playwright/test && bunx playwright install chromium",
    );
  }

  const { launch } = chromium as {
    launch: (opts: unknown) => Promise<unknown>;
  };

  process.stderr.write(`[session-login] 正在打开浏览器，请手动登录...\n`);

  const browser = await launch({ headless: false });
  const context = await (
    browser as { newContext: () => Promise<unknown> }
  ).newContext();
  const page = await (context as { newPage: () => Promise<unknown> }).newPage();

  await (page as { goto: (url: string) => Promise<void> }).goto(url);

  await waitForEnter(
    "\n>>> 请在浏览器中完成登录，登录成功后按 Enter 继续...\n",
  );

  // 保存 storageState
  mkdirSync(dirname(outputPath), { recursive: true });
  await (
    context as { storageState: (opts: unknown) => Promise<void> }
  ).storageState({
    path: outputPath,
  });

  await (browser as { close: () => Promise<void> }).close();

  process.stderr.write(`[session-login] Session 已保存至 ${outputPath}\n`);
}

// ────────────────────────────────────────────────────────────
// CLI 入口
// ────────────────────────────────────────────────────────────

const envLabel = (
  process.env.ACTIVE_ENV ?? process.env.QA_ACTIVE_ENV ?? "default"
).toLowerCase();

const projectLabel = process.env.QA_PROJECT ?? "dataAssets";
const defaultOutput = `.auth/${projectLabel}/session-${envLabel}.json`;

const program = new Command();

program
  .name("session-login")
  .description("检查或创建 Playwright 登录 session")
  .requiredOption("--url <url>", "目标系统 URL")
  .option("--project <name>", "项目名（影响 output 默认路径）", projectLabel)
  .option("--output <path>", "session.json 输出路径", defaultOutput)
  .option("--force", "强制重新登录，忽略现有 session")
  .parse(process.argv);

const opts = program.opts<{
  url: string;
  project: string;
  output: string;
  force?: boolean;
}>();

// 当用户传了 --project 但没传 --output，重新计算 output
if (opts.project !== projectLabel && opts.output === defaultOutput) {
  opts.output = `.auth/${opts.project}/session-${envLabel}.json`;
}

async function main(): Promise<void> {
  const { url, output, force } = opts;

  // 检查现有 session
  if (!force) {
    const check = checkSessionValid(output);
    if (check.valid) {
      const result: SessionResult = {
        session_path: output,
        valid: true,
        expires: check.expires,
        message: "现有 session 有效，直接复用",
      };
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
      return;
    }

    if (existsSync(output)) {
      process.stderr.write(
        `[session-login] 现有 session 已过期（${check.expires ?? "无过期信息"}），需要重新登录\n`,
      );
    }
  }

  // 引导登录
  try {
    await guidedLogin(url, output);

    const check = checkSessionValid(output);
    const result: SessionResult = {
      session_path: output,
      valid: check.valid,
      expires: check.expires,
      message: check.valid
        ? "登录成功，session 已保存"
        : "登录完成，但 session 可能无效",
    };
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[session-login] 错误：${errMsg}\n`);

    // 若 playwright 未安装，输出降级结果（允许后续步骤决定是否继续）
    const result: SessionResult = {
      session_path: output,
      valid: false,
      message: errMsg,
    };
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(
    `[session-login] 未处理异常：${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
