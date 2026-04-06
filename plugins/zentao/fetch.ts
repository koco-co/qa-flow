#!/usr/bin/env npx tsx
/**
 * plugins/zentao/fetch.ts — 禅道 Bug 信息 + 修复分支抓取器
 *
 * Usage:
 *   npx tsx plugins/zentao/fetch.ts --bug-id 138845 --output workspace/.temp/zentao
 *   npx tsx plugins/zentao/fetch.ts --url "http://zenpms.dtstack.cn/zentao/bug-view-138845.html" --output workspace/.temp/zentao
 *   npx tsx plugins/zentao/fetch.ts --help
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { initEnv, getEnv } from "../../.claude/scripts/lib/env.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = fileURLToPath(new URL(".", import.meta.url));

// ─── Types ───────────────────────────────────────────────────────────────────

interface BugOutput {
  bug_id: number;
  title: string | null;
  severity: string | null;
  priority: number | null;
  status: string | null;
  fix_branch: string | null;
  assigned_to: string | null;
  module: string | null;
  output_path: string;
}

interface PartialBugOutput {
  bug_id: number;
  title: null;
  fix_branch: null;
  error: string;
  partial: true;
}

interface ErrorOutput {
  error: string;
  hint?: string;
  partial?: boolean;
}

// ─── URL Parsing ─────────────────────────────────────────────────────────────

/**
 * Extracts bug ID from a zentao bug URL.
 * Supports patterns like: /zentao/bug-view-138845.html
 */
export function extractBugIdFromUrl(url: string): number | null {
  const match = url.match(/bug-view-(\d+)\.html/);
  if (!match) return null;
  const id = Number.parseInt(match[1], 10);
  return Number.isNaN(id) ? null : id;
}

// ─── Fix Branch Detection ─────────────────────────────────────────────────────

const HOTFIX_PATTERN = /hotfix[_/-][\w./-]+/gi;
const BRANCH_PATTERN = /(?:branch|分支)[:\s]*([^\s,;，；]+)/gi;

/**
 * Attempts to find a fix branch name from various bug fields.
 * Prioritises hotfix_ patterns, then falls back to branch mentions.
 */
export function detectFixBranch(candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const hotfixMatches = candidate.match(HOTFIX_PATTERN);
    if (hotfixMatches && hotfixMatches.length > 0) {
      return hotfixMatches[0];
    }
  }
  // Secondary pass: generic branch mentions
  for (const candidate of candidates) {
    if (!candidate) continue;
    const branchMatches = candidate.matchAll(BRANCH_PATTERN);
    for (const m of branchMatches) {
      if (m[1]) return m[1];
    }
  }
  return null;
}

// ─── Response Parsers ─────────────────────────────────────────────────────────

interface RawBugData {
  title?: string;
  severity?: string;
  pri?: number;
  priority?: number;
  status?: string;
  resolvedBuild?: string;
  resolution?: string;
  assignedTo?: string;
  openedBy?: string;
  resolvedBy?: string;
  product?: string | number;
  module?: string | number;
  productName?: string;
  moduleName?: string;
  steps?: string;
  comment?: string;
  comments?: Array<{ content?: string; text?: string }>;
  [key: string]: unknown;
}

function parseSeverity(raw: unknown): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const s = String(raw).toLowerCase();
  if (s === "1" || s === "fatal" || s === "critical") return "critical";
  if (s === "2" || s === "serious" || s === "major") return "major";
  if (s === "3" || s === "normal" || s === "average") return "normal";
  if (s === "4" || s === "minor" || s === "small") return "minor";
  return s;
}

function parsePriority(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

function extractBugFields(data: RawBugData): Omit<BugOutput, "bug_id" | "output_path"> {
  const title = typeof data.title === "string" ? data.title : null;
  const severity = parseSeverity(data.severity);
  const priority = parsePriority(data.pri ?? data.priority);
  const status = typeof data.status === "string" ? data.status.toLowerCase() : null;
  const assignedTo = typeof data.assignedTo === "string" ? data.assignedTo : null;
  const moduleName =
    typeof data.moduleName === "string"
      ? data.moduleName
      : typeof data.productName === "string"
        ? data.productName
        : null;

  // Collect all text candidates for branch detection
  const commentTexts = Array.isArray(data.comments)
    ? data.comments.map((c) => c.content ?? c.text ?? "").filter(Boolean)
    : [];

  const fix_branch = detectFixBranch([
    data.resolvedBuild,
    data.resolution,
    data.steps,
    data.comment,
    title,
    ...commentTexts,
  ]);

  return { title, severity, priority, status, fix_branch, assigned_to: assignedTo, module: moduleName };
}

// ─── Zentao HTTP Helpers ──────────────────────────────────────────────────────

interface LoginResult {
  cookie: string;
}

async function zentaoLogin(baseUrl: string, account: string, password: string): Promise<LoginResult> {
  const loginUrl = `${baseUrl}/zentao/user-login.json`;
  const body = `account=${encodeURIComponent(account)}&password=${encodeURIComponent(password)}`;

  let response: Response;
  try {
    response = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "qa-flow/2.0 zentao-plugin",
        Accept: "application/json",
      },
      body,
    });
  } catch (err) {
    throw Object.assign(new Error(`网络连接失败: ${(err as Error).message}`), { code: "NETWORK_ERROR" });
  }

  if (!response.ok) {
    throw Object.assign(
      new Error(`禅道登录失败，HTTP ${response.status}`),
      { code: "LOGIN_FAILED" },
    );
  }

  // Extract Set-Cookie header for session
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    // Some zentao versions return token in JSON body
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      // ignore parse failure
    }
    const b = body as Record<string, unknown> | undefined;
    if (b?.sessionID || b?.token || b?.sid) {
      const sessionId = String(b.sessionID ?? b.token ?? b.sid);
      return { cookie: `zentaosid=${sessionId}` };
    }
    throw Object.assign(
      new Error("禅道登录失败：响应中没有 Set-Cookie 头"),
      { code: "LOGIN_FAILED" },
    );
  }

  // Parse the session cookie value (zentaosid=xxx or PHPSESSID=xxx)
  const cookieParts = setCookie
    .split(",")
    .map((s) => s.split(";")[0].trim())
    .filter((s) => s.includes("="));

  const sessionCookie =
    cookieParts.find((s) => s.startsWith("zentaosid=") || s.startsWith("PHPSESSID=")) ??
    cookieParts[0];

  if (!sessionCookie) {
    throw Object.assign(
      new Error("禅道登录失败：无法解析 Session Cookie"),
      { code: "LOGIN_FAILED" },
    );
  }

  return { cookie: sessionCookie };
}

async function zentaoFetchBug(
  baseUrl: string,
  bugId: number,
  sessionCookie: string,
): Promise<RawBugData> {
  const bugUrl = `${baseUrl}/zentao/bug-view-${bugId}.json`;

  let response: Response;
  try {
    response = await fetch(bugUrl, {
      headers: {
        Cookie: sessionCookie,
        "User-Agent": "qa-flow/2.0 zentao-plugin",
        Accept: "application/json",
      },
    });
  } catch (err) {
    throw Object.assign(new Error(`网络连接失败: ${(err as Error).message}`), { code: "NETWORK_ERROR" });
  }

  if (response.status === 404) {
    throw Object.assign(new Error(`Bug #${bugId} 不存在`), { code: "BUG_NOT_FOUND" });
  }

  if (!response.ok) {
    throw Object.assign(
      new Error(`获取 Bug 失败，HTTP ${response.status}`),
      { code: "FETCH_FAILED" },
    );
  }

  // Older zentao versions may return HTML even for .json URLs
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    // Graceful degradation: return minimal data
    const htmlText = await response.text();
    const titleMatch = htmlText.match(/<title[^>]*>([^<]+)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1].trim() : null;
    return { title: rawTitle ?? undefined };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw Object.assign(new Error("禅道 API 返回了非 JSON 响应"), { code: "PARSE_ERROR" });
  }

  // Zentao often wraps response in { bug: {...} } or { data: {...} }
  const d = data as Record<string, unknown>;
  const bugData = (d.bug ?? d.data ?? d) as RawBugData;
  return bugData;
}

// ─── Main Logic ───────────────────────────────────────────────────────────────

async function run(options: { bugId?: number; url?: string; output: string }): Promise<void> {
  const projectRoot = resolve(__dirname, "../../");
  initEnv(resolve(projectRoot, ".env"));

  // Resolve bug ID
  let bugId: number;
  if (options.bugId !== undefined) {
    bugId = options.bugId;
  } else if (options.url) {
    const extracted = extractBugIdFromUrl(options.url);
    if (extracted === null) {
      const err: ErrorOutput = { error: `无法从 URL 提取 Bug ID，预期格式：bug-view-{数字}.html` };
      process.stdout.write(`${JSON.stringify(err, null, 2)}\n`);
      process.exit(1);
    }
    bugId = extracted;
  } else {
    const err: ErrorOutput = { error: "必须提供 --bug-id 或 --url 参数" };
    process.stdout.write(`${JSON.stringify(err, null, 2)}\n`);
    process.exit(1);
  }

  // Validate env vars
  const baseUrl = getEnv("ZENTAO_BASE_URL");
  const account = getEnv("ZENTAO_ACCOUNT");
  const password = getEnv("ZENTAO_PASSWORD");

  const missingVars: string[] = [];
  if (!baseUrl) missingVars.push("ZENTAO_BASE_URL");
  if (!account) missingVars.push("ZENTAO_ACCOUNT");
  if (!password) missingVars.push("ZENTAO_PASSWORD");

  if (missingVars.length > 0) {
    const err: ErrorOutput = {
      error: `缺少必要的环境变量：${missingVars.join(", ")}`,
      hint: "请在项目根目录 .env 文件中配置 ZENTAO_BASE_URL、ZENTAO_ACCOUNT 和 ZENTAO_PASSWORD",
    };
    process.stdout.write(`${JSON.stringify(err, null, 2)}\n`);
    process.exit(1);
  }

  // Setup output directory
  const absOutput = resolve(options.output);
  mkdirSync(absOutput, { recursive: true });
  const outputPath = `${absOutput}/bug-${bugId}.json`;

  // If API is unreachable but URL was provided, graceful degradation
  let sessionCookie: string;
  try {
    const loginResult = await zentaoLogin(baseUrl as string, account as string, password as string);
    sessionCookie = loginResult.cookie;
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NETWORK_ERROR" && options.url) {
      const partial: PartialBugOutput = {
        bug_id: bugId,
        title: null,
        fix_branch: null,
        error: "禅道 API 不可达，仅从 URL 提取了 Bug ID",
        partial: true,
      };
      writeFileSync(outputPath, JSON.stringify(partial, null, 2), "utf8");
      process.stdout.write(`${JSON.stringify(partial, null, 2)}\n`);
      return;
    }

    if (e.code === "LOGIN_FAILED") {
      const out: ErrorOutput = {
        error: "禅道登录失败",
        hint: "请检查 ZENTAO_ACCOUNT 和 ZENTAO_PASSWORD",
      };
      process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
      process.exit(1);
    }

    const out: ErrorOutput = { error: `网络连接失败: ${e.message}`, partial: true };
    process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exit(1);
  }

  // Fetch bug data
  let rawData: RawBugData;
  try {
    rawData = await zentaoFetchBug(baseUrl as string, bugId, sessionCookie);
  } catch (err) {
    const e = err as Error & { code?: string };

    if (e.code === "BUG_NOT_FOUND") {
      const out: ErrorOutput = { error: `Bug #${bugId} 不存在` };
      process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
      process.exit(1);
    }

    if (e.code === "NETWORK_ERROR" && options.url) {
      const partial: PartialBugOutput = {
        bug_id: bugId,
        title: null,
        fix_branch: null,
        error: "禅道 API 不可达，仅从 URL 提取了 Bug ID",
        partial: true,
      };
      writeFileSync(outputPath, JSON.stringify(partial, null, 2), "utf8");
      process.stdout.write(`${JSON.stringify(partial, null, 2)}\n`);
      return;
    }

    const out: ErrorOutput = { error: `网络连接失败: ${e.message}`, partial: true };
    process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exit(1);
  }

  // Parse and assemble output
  const fields = extractBugFields(rawData);
  const output: BugOutput = {
    bug_id: bugId,
    ...fields,
    output_path: outputPath,
  };

  // Write to disk
  writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");

  // Print to stdout
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const isMain = process.argv[1] === __filename || process.argv[1]?.endsWith("fetch.ts");

if (isMain) {
  const program = new Command("zentao-fetch");
  program
    .description("从禅道 Bug 链接提取缺陷详情和修复分支")
    .option("--bug-id <number>", "禅道 Bug ID（数字），例如 138845")
    .option(
      "--url <url>",
      '禅道 Bug 页面 URL，例如 "http://zenpms.dtstack.cn/zentao/bug-view-138845.html"',
    )
    .requiredOption("--output <dir>", "输出目录路径，例如 workspace/.temp/zentao")
    .action(async (opts: { bugId?: string; url?: string; output: string }) => {
      let parsedBugId: number | undefined;
      if (opts.bugId !== undefined) {
        parsedBugId = Number.parseInt(opts.bugId, 10);
        if (Number.isNaN(parsedBugId)) {
          const err: ErrorOutput = { error: `无效的 Bug ID 格式："${opts.bugId}"，必须为正整数` };
          process.stdout.write(`${JSON.stringify(err, null, 2)}\n`);
          process.exit(1);
        }
      }

      if (parsedBugId === undefined && !opts.url) {
        const err: ErrorOutput = { error: "必须提供 --bug-id 或 --url 参数" };
        process.stdout.write(`${JSON.stringify(err, null, 2)}\n`);
        process.exit(1);
      }

      await run({ bugId: parsedBugId, url: opts.url, output: opts.output });
    });

  program.parse(process.argv);
}
