/**
 * fetch-zentao-bug.mjs
 * 通过禅道 Session Cookie 登录并解析 Bug 详情页。
 *
 * 用法：node fetch-zentao-bug.mjs <bugId>
 *
 * 成功输出（JSON to stdout）：
 *   { bugId, title, steps, result, status, severity, assignedTo }
 *
 * 失败输出（JSON to stdout, exit code 1）：
 *   { error: "..." }
 *
 * 凭据读取顺序：
 *   1. 环境变量 ZENTAO_BASE_URL / ZENTAO_ACCOUNT / ZENTAO_PASSWORD（优先）
 *   2. 根目录 .env 文件
 *   3. tools/zentao/.env 文件（兼容旧配置）
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(__dirname, "../../..");
const TIMEOUT_MS = 10000;

// ─── 凭据加载 ────────────────────────────────────────────────────────────────

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const result = {};
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return result;
}

function loadCredentials() {
  // 优先读根目录 .env，其次读 tools/zentao/.env（兼容旧配置）
  const rootEnv = loadEnvFile(resolve(WORKSPACE_ROOT, ".env"));
  const zentaoEnv = loadEnvFile(resolve(WORKSPACE_ROOT, "tools/zentao/.env"));
  const merged = { ...zentaoEnv, ...rootEnv };

  const baseUrl = process.env.ZENTAO_BASE_URL || merged.ZENTAO_BASE_URL;
  const account = process.env.ZENTAO_ACCOUNT || merged.ZENTAO_ACCOUNT;
  const password = process.env.ZENTAO_PASSWORD || merged.ZENTAO_PASSWORD;
  if (!baseUrl || !account || !password) {
    throw new Error(
      "缺少禅道凭据。请在根目录 .env 中配置 ZENTAO_BASE_URL、ZENTAO_ACCOUNT、ZENTAO_PASSWORD"
    );
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), account, password };
}

// ─── HTTP 工具 ────────────────────────────────────────────────────────────────

function request(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: opts.method || "GET",
      headers: opts.headers || {},
      timeout: TIMEOUT_MS,
    };
    const req = lib.request(options, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () =>
        resolve({ status: res.statusCode, headers: res.headers, body: data })
      );
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("请求超时")); });
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// ─── 禅道登录（获取 Session Cookie）─────────────────────────────────────────

async function login(baseUrl, account, password) {
  const body = `account=${encodeURIComponent(account)}&password=${encodeURIComponent(password)}`;
  const res = await request(`${baseUrl}/zentao/user-login.html`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(body),
    },
    body,
  });

  // 提取所有 Set-Cookie
  const setCookie = res.headers["set-cookie"] || [];
  const cookies = setCookie
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");

  if (!cookies) {
    throw new Error(`禅道登录失败，未获取到 Cookie（HTTP ${res.status}）`);
  }

  // 验证登录成功：响应应跳转到 /zentao/ 而非停留在登录页
  const location = res.headers["location"] || res.body;
  if (res.body.includes("user-login")) {
    throw new Error("禅道登录失败：账号或密码错误");
  }

  return cookies;
}

// ─── HTML 解析 ────────────────────────────────────────────────────────────────

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractBetween(html, startTag, endTag) {
  const start = html.indexOf(startTag);
  if (start === -1) return "";
  const contentStart = start + startTag.length;
  const end = html.indexOf(endTag, contentStart);
  if (end === -1) return html.slice(contentStart, contentStart + 2000);
  return html.slice(contentStart, end);
}

function parseBugHtml(html, bugId) {
  // 标题
  const titleMatch = html.match(/class="text"[^>]*>([^<]+)<\/span>/);
  const title = titleMatch ? titleMatch[1].trim() : "";

  // 重现步骤（detail-title="重现步骤" 之后的 detail-content 块）
  const stepsStart = html.indexOf("重现步骤");
  let steps = "";
  if (stepsStart !== -1) {
    const contentBlock = extractBetween(
      html.slice(stepsStart),
      'class="detail-content article-content">',
      "</div>"
    );
    steps = stripTags(contentBlock).slice(0, 1000);
  }

  // 期望结果（若存在）
  const resultStart = html.indexOf("期望结果");
  let result = "";
  if (resultStart !== -1) {
    const contentBlock = extractBetween(
      html.slice(resultStart),
      'class="detail-content article-content">',
      "</div>"
    );
    result = stripTags(contentBlock).slice(0, 500);
  }

  // 严重程度
  const severityMatch = html.match(/data-severity='(\d+)'/);
  const severity = severityMatch ? Number(severityMatch[1]) : null;

  // Bug 状态
  const statusMatch = html.match(/class='status-bug status-([^']+)'/);
  const status = statusMatch ? statusMatch[1] : "";

  // 当前指派
  const assignedMatch = html.match(/<th>当前指派<\/th>\s*<td>([^<]+)</);
  const assignedTo = assignedMatch ? assignedMatch[1].trim().split(" 于 ")[0] : "";

  // 修复分支 Tab（#tagDetail 表格：应用 + 版本）
  // 表格列顺序：应用 | 版本 | 解决人 | 解决时间
  const fixBranches = [];
  const tagDetailIdx = Math.max(html.indexOf('id="tagDetail"'), html.indexOf("id='tagDetail'"));
  if (tagDetailIdx !== -1) {
    const tableBlock = extractBetween(html.slice(tagDetailIdx), "<tbody>", "</tbody>");
    // 逐行解析 <tr> 块
    const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tableBlock)) !== null) {
      const cells = [];
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        cells.push(stripTags(cellMatch[1]));
      }
      const app = cells[0]?.trim();
      const version = cells[1]?.trim();
      if (app && version) {
        fixBranches.push({ app, version });
      }
    }
  }

  return { bugId: Number(bugId), title, steps, result, severity, status, assignedTo, fixBranches };
}

// ─── 主逻辑 ───────────────────────────────────────────────────────────────────

async function main() {
  const bugId = process.argv[2];
  if (!bugId || isNaN(Number(bugId))) {
    process.stdout.write(JSON.stringify({ error: "用法：node fetch-zentao-bug.mjs <bugId>" }));
    process.exit(1);
  }

  try {
    const { baseUrl, account, password } = loadCredentials();

    const cookie = await login(baseUrl, account, password);

    const res = await request(`${baseUrl}/zentao/bug-view-${bugId}.html`, {
      headers: { Cookie: cookie },
    });

    if (res.status !== 200) {
      throw new Error(`获取 Bug #${bugId} 失败（HTTP ${res.status}）`);
    }
    if (res.body.includes("user-login")) {
      throw new Error("访问 Bug 页面时会话已失效，请检查账号权限");
    }

    const bugData = parseBugHtml(res.body, bugId);
    if (!bugData.title) {
      throw new Error(`未能从页面解析到 Bug #${bugId} 的标题，页面可能不存在或无权访问`);
    }

    process.stdout.write(JSON.stringify(bugData, null, 2));
    process.exit(0);
  } catch (err) {
    process.stdout.write(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

main();
