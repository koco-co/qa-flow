#!/usr/bin/env npx tsx
/**
 * plugins/lanhu/fetch.ts — 蓝湖 PRD 内容 + 截图抓取器 (bridge adapter)
 *
 * Calls tools/lanhu/bridge.py via subprocess to fetch PRD content,
 * then downloads images and produces per-requirement PRD files.
 *
 * Usage:
 *   npx tsx plugins/lanhu/fetch.ts --url "https://lanhuapp.com/web/#/item/..." --base-dir workspace/prds
 *   npx tsx plugins/lanhu/fetch.ts --url "https://lanhuapp.com/web/#/item/..." --pages "15525,15529"
 *   npx tsx plugins/lanhu/fetch.ts --help
 */

import { execSync } from "node:child_process";
import { copyFileSync, createWriteStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { initEnv, getEnv } from "../../.claude/scripts/lib/env.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = fileURLToPath(new URL(".", import.meta.url));

// ─── Types ───────────────────────────────────────────────────────────────────

interface LanhuQueryParams {
  tid?: string;
  pid?: string;
  docId?: string;
  image?: string;
  versionId?: string;
  [key: string]: string | undefined;
}

type PageType = "product-spec" | "design-image" | "unknown";

interface ParsedLanhuUrl {
  pageType: PageType;
  params: LanhuQueryParams;
}

interface BridgePage {
  name: string;
  path: string;
  content: string;
  images: string[];
}

interface BridgeOutput {
  title: string;
  doc_type: string;
  total_pages: number;
  pages: BridgePage[];
}

interface BridgeListPage {
  name: string;
  path: string;
  id: string;
  requirement_id: string | null;
}

interface BridgeListOutput {
  title: string;
  doc_type: string;
  total_pages: number;
  pages: BridgeListPage[];
}

interface ImageRef {
  url: string;
  name: string;
}

interface RequirementInfo {
  requirement_id: string;
  requirement_name: string;
  project: string;
  prd_dir: string;
  prd_path: string;
  images_count: number;
}

interface FetchOutput {
  title: string;
  total_requirements: number;
  requirements: RequirementInfo[];
}

interface ErrorOutput {
  error: string;
  code: string;
}

interface ParsedRequirement {
  project: string;
  requirementId: string;
  requirementName: string;
}

// ─── URL Parsing ─────────────────────────────────────────────────────────────

export function parseLanhuUrl(rawUrl: string): ParsedLanhuUrl {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { pageType: "unknown", params: {} };
  }

  if (!url.hostname.includes("lanhuapp.com")) {
    return { pageType: "unknown", params: {} };
  }

  // Lanhu uses hash-based routing; query params are in the fragment after '?'
  const hashPart = url.hash; // e.g. "#/item/project/product?tid=xxx&pid=xxx&docId=xxx"
  const hashQueryIdx = hashPart.indexOf("?");
  const params: LanhuQueryParams = {};

  if (hashQueryIdx !== -1) {
    const hashQuery = hashPart.slice(hashQueryIdx + 1);
    for (const [key, val] of new URLSearchParams(hashQuery)) {
      params[key] = val;
    }
  }

  // Also parse real query params (some share links use real query)
  for (const [key, val] of url.searchParams) {
    params[key] = val;
  }

  // Determine page type
  if (params.docId && params.tid && params.pid) {
    return { pageType: "product-spec", params };
  }

  if (params.image && params.tid) {
    return { pageType: "design-image", params };
  }

  return { pageType: "unknown", params: {} };
}

// ─── HTML → Markdown ─────────────────────────────────────────────────────────

export function htmlToMarkdown(html: string): string {
  return html
    // Block elements → newlines
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<h([1-6])[^>]*>/gi, (_, n) => "#".repeat(Number(n)) + " ")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    // Decode common HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Collapse excess blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── Slug ─────────────────────────────────────────────────────────────────────

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fa5-]/g, "")
    .slice(0, 60);
}

// ─── Image extraction ────────────────────────────────────────────────────────

export function extractImageUrls(data: unknown): string[] {
  const urls: string[] = [];

  function walk(node: unknown): void {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    const obj = node as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj)) {
      if (
        typeof value === "string" &&
        (key === "url" || key === "src" || key === "imageUrl" || key === "cover") &&
        (value.startsWith("http") || value.startsWith("//"))
      ) {
        urls.push(value.startsWith("//") ? `https:${value}` : value);
      } else {
        walk(value);
      }
    }
  }

  walk(data);
  return [...new Set(urls)];
}

// ─── HTTP Helpers ─────────────────────────────────────────────────────────────

const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
  Referer: "https://lanhuapp.com/",
};

async function downloadImage(
  imageUrl: string,
  destPath: string,
  cookie: string,
): Promise<void> {
  const response = await fetch(imageUrl, {
    headers: {
      ...COMMON_HEADERS,
      Cookie: cookie,
    },
  });

  if (!response.ok) {
    throw new Error(`Image download failed: HTTP ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const dest = createWriteStream(destPath);
  await pipeline(response.body as unknown as NodeJS.ReadableStream, dest);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function currentYYYYMM(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function parseRequirementFromPageName(pageName: string, pagePath: string): ParsedRequirement {
  // pagePath format: "岚图/15525【内置规则丰富】一致性，..."
  // pageName format: "15525【内置规则丰富】一致性，..."
  const pathParts = pagePath.split("/");
  const project = pathParts.length > 1 ? pathParts[0] : "";

  // Extract requirement ID (leading number from name)
  const idMatch = pageName.match(/^(\d+)/);
  const requirementId = idMatch ? idMatch[1] : "";

  // Full requirement name (including 【】 part)
  const requirementName = pageName;

  return { project, requirementId, requirementName };
}

// ─── Bridge Helpers ──────────────────────────────────────────────────────────

function ensureLanhuMcpReady(projectRoot: string): void {
  const venvPath = join(projectRoot, "tools/lanhu/lanhu-mcp/.venv");
  if (!existsSync(venvPath)) {
    const setupScript = join(projectRoot, "tools/lanhu/setup.sh");
    execSync(`bash "${setupScript}"`, {
      stdio: "pipe",
      cwd: projectRoot,
    });
  }
}

interface BridgeCallError {
  error: string;
  code: string;
  isCookieError: boolean;
}

function callBridgeListPages(
  projectRoot: string,
  rawUrl: string,
  cookie: string,
): BridgeListOutput {
  const bridgeScript = resolve(projectRoot, "tools/lanhu/bridge.py");
  const mcpDir = resolve(projectRoot, "tools/lanhu/lanhu-mcp");
  const cmd = [`"uv"`, `"run"`, `"python"`, `"${bridgeScript}"`, `"--url"`, `"${rawUrl}"`, `"--list-pages"`].join(" ");

  const stdout = execSync(cmd, {
    cwd: mcpDir,
    env: { ...process.env, LANHU_COOKIE: cookie },
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 60_000,
  });

  return JSON.parse(stdout) as BridgeListOutput;
}

function tryCallBridge(
  projectRoot: string,
  rawUrl: string,
  pageId: string | undefined,
  cookie: string,
  pageNames?: string,
): BridgeOutput | BridgeCallError {
  const bridgeScript = resolve(projectRoot, "tools/lanhu/bridge.py");
  const mcpDir = resolve(projectRoot, "tools/lanhu/lanhu-mcp");

  const args = [`uv`, `run`, `python`, bridgeScript, `--url`, rawUrl];
  if (pageId) {
    args.push(`--page-id`, pageId);
  }
  if (pageNames) {
    args.push(`--page-names`, pageNames);
  }

  const cmd = args.map((a) => `"${a}"`).join(" ");

  try {
    const stdout = execSync(cmd, {
      cwd: mcpDir,
      env: {
        ...process.env,
        LANHU_COOKIE: cookie,
      },
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 180_000,
    });

    return JSON.parse(stdout) as BridgeOutput;
  } catch (err) {
    const e = err as { stderr?: string; message?: string };
    const stderrText = e.stderr ?? "";

    // Try to parse structured error from bridge.py stderr
    try {
      const bridgeError = JSON.parse(stderrText) as ErrorOutput;
      const isCookieError =
        bridgeError.code === "COOKIE_EXPIRED" ||
        bridgeError.code === "MISSING_COOKIE" ||
        bridgeError.error.includes("418") ||
        bridgeError.error.includes("permission") ||
        bridgeError.error.includes("401") ||
        bridgeError.error.includes("403");
      return { ...bridgeError, isCookieError };
    } catch {
      const msg = stderrText || e.message || "unknown error";
      const isCookieError =
        msg.includes("418") || msg.includes("permission") || msg.includes("Cookie");
      return {
        error: `Bridge call failed: ${msg}`,
        code: "BRIDGE_ERROR",
        isCookieError,
      };
    }
  }
}

// ─── Cookie Refresh ─────────────────────────────────────────────────────────

function refreshCookie(projectRoot: string, targetUrl: string): string | null {
  const refreshScript = resolve(projectRoot, "tools/lanhu/refresh-cookie.py");
  const mcpDir = resolve(projectRoot, "tools/lanhu/lanhu-mcp");
  const envPath = resolve(projectRoot, ".env");

  const args = [
    `uv`, `run`, `python`, refreshScript,
    `--target-url`, targetUrl,
    `--update-env`, envPath,
  ];
  const cmd = args.map((a) => `"${a}"`).join(" ");

  try {
    const newCookie = execSync(cmd, {
      cwd: mcpDir,
      encoding: "utf8",
      stdio: ["inherit", "pipe", "inherit"],
      timeout: 120_000,
    });
    return newCookie.trim() || null;
  } catch {
    return null;
  }
}

function callBridgeWithRetry(
  projectRoot: string,
  rawUrl: string,
  pageId: string | undefined,
  cookie: string,
  pageNames?: string,
): BridgeOutput {
  const result = tryCallBridge(projectRoot, rawUrl, pageId, cookie, pageNames);

  // Success on first try
  if ("pages" in result) {
    return result;
  }

  // Not a cookie error — fail immediately
  if (!result.isCookieError) {
    process.stderr.write(`${JSON.stringify({ error: result.error, code: result.code }, null, 2)}\n`);
    process.exit(1);
  }

  // Cookie error — attempt auto-refresh
  process.stderr.write("Cookie 失效，正在自动刷新...\n");
  const newCookie = refreshCookie(projectRoot, rawUrl);

  if (!newCookie) {
    process.stderr.write(`${JSON.stringify({
      error: "Cookie 刷新失败。请手动更新 .env 中的 LANHU_COOKIE，或配置 LANHU_USERNAME/LANHU_PASSWORD。",
      code: "COOKIE_REFRESH_FAILED",
    }, null, 2)}\n`);
    process.exit(1);
  }

  // Retry with new cookie
  const retry = tryCallBridge(projectRoot, rawUrl, pageId, newCookie, pageNames);
  if ("pages" in retry) {
    return retry;
  }

  process.stderr.write(`${JSON.stringify({ error: retry.error, code: retry.code }, null, 2)}\n`);
  process.exit(1);
  throw new Error("Unreachable");
}

// ─── Main Logic ───────────────────────────────────────────────────────────────

async function run(rawUrl: string, baseDir: string, pagesFilter?: string): Promise<void> {
  // 1. Load .env from project root (two levels up from plugins/lanhu/)
  const projectRoot = resolve(__dirname, "../../");
  initEnv(resolve(projectRoot, ".env"));

  let cookie = getEnv("LANHU_COOKIE") ?? "";
  if (!cookie) {
    // No cookie at all — try to get one via auto-login
    process.stderr.write("LANHU_COOKIE 未配置，尝试自动登录获取...\n");
    const newCookie = refreshCookie(projectRoot, rawUrl);
    if (!newCookie) {
      const err: ErrorOutput = {
        error: "LANHU_COOKIE 未配置且自动登录失败。请配置 LANHU_USERNAME/LANHU_PASSWORD 或手动设置 LANHU_COOKIE。",
        code: "MISSING_COOKIE",
      };
      process.stderr.write(`${JSON.stringify(err, null, 2)}\n`);
      process.exit(1);
    }
    cookie = newCookie;
  }

  // 2. Parse URL
  const parsed = parseLanhuUrl(rawUrl);
  if (parsed.pageType === "unknown") {
    const err: ErrorOutput = {
      error:
        "Invalid or unsupported Lanhu URL. Expected format: https://lanhuapp.com/web/#/item/project/product?tid=xxx&pid=xxx&docId=xxx",
      code: "INVALID_URL",
    };
    process.stderr.write(`${JSON.stringify(err, null, 2)}\n`);
    process.exit(1);
  }

  // 3. Ensure bridge dependencies are ready
  ensureLanhuMcpReady(projectRoot);

  // 4. List all pages from document
  const listResult = callBridgeListPages(projectRoot, rawUrl, cookie);
  const title = listResult.title || "蓝湖需求文档";

  // 5. Parse page names to extract requirement info
  const allRequirements = listResult.pages.map((page) => ({
    page,
    parsed: parseRequirementFromPageName(page.name, page.path),
  }));

  // 6. Filter by --pages if specified
  const filterIds = pagesFilter
    ? new Set(pagesFilter.split(",").map((id) => id.trim()))
    : null;

  const selectedRequirements = filterIds
    ? allRequirements.filter((r) => filterIds.has(r.parsed.requirementId))
    : allRequirements;

  if (selectedRequirements.length === 0) {
    const err: ErrorOutput = {
      error: `No requirements matched the filter: ${pagesFilter}`,
      code: "NO_MATCHING_REQUIREMENTS",
    };
    process.stderr.write(`${JSON.stringify(err, null, 2)}\n`);
    process.exit(1);
  }

  // 7. Process each requirement
  const yyyymm = currentYYYYMM();
  const absBaseDir = resolve(baseDir);
  const requirementInfos: RequirementInfo[] = [];

  for (const { page, parsed: reqInfo } of selectedRequirements) {
    const reqDirName = reqInfo.requirementName;
    const reqDir = join(absBaseDir, yyyymm, reqDirName);
    const imagesDir = join(reqDir, "images");
    const tmpDir = join(reqDir, "tmp");
    mkdirSync(imagesDir, { recursive: true });
    mkdirSync(tmpDir, { recursive: true });

    // Fetch content for this specific requirement
    const bridgeResult = callBridgeWithRetry(
      projectRoot, rawUrl, undefined, cookie, page.name,
    );

    // Collect screenshots (only local file paths from Playwright, not inline [图片] refs)
    const collectedImages: ImageRef[] = [];
    let imgIdx = 0;
    for (const bridgePage of bridgeResult.pages) {
      for (const imgSrc of bridgePage.images) {
        imgIdx++;
        try {
          if (imgSrc.startsWith("http://") || imgSrc.startsWith("https://") || imgSrc.startsWith("//")) {
            // Remote URL — download (these are actual screenshots, not inline element images)
            const fullUrl = imgSrc.startsWith("//") ? `https:${imgSrc}` : imgSrc;
            const urlObj = new URL(fullUrl);
            const rawName = urlObj.pathname.split("/").pop() ?? `image-${imgIdx}`;
            const ext = rawName.includes(".") ? rawName.split(".").pop() ?? "png" : "png";
            const slug = slugify(rawName.replace(/\.[^.]+$/, "")) || `image-${imgIdx}`;
            const fileName = `${imgIdx}-${slug}.${ext}`;
            const destPath = join(imagesDir, fileName);
            await downloadImage(fullUrl, destPath, cookie);
            collectedImages.push({ url: fullUrl, name: fileName });
          } else if (existsSync(imgSrc)) {
            // Local file path (screenshot from lanhu-mcp) — copy
            const ext = extname(imgSrc) || ".png";
            const rawName = basename(imgSrc, ext);
            const slug = slugify(rawName) || `screenshot-${imgIdx}`;
            const fileName = `${imgIdx}-${slug}${ext}`;
            const destPath = join(imagesDir, fileName);
            copyFileSync(imgSrc, destPath);
            collectedImages.push({ url: imgSrc, name: fileName });
          }
        } catch {
          // Non-fatal: skip failed images
        }
      }
    }

    // Compress images
    if (collectedImages.length > 0) {
      try {
        const compressScript = resolve(projectRoot, ".claude/scripts/image-compress.ts");
        execSync(`npx tsx "${compressScript}" --dir "${imagesDir}"`, {
          stdio: "pipe",
          cwd: projectRoot,
        });
      } catch {
        // Non-fatal: compression failure doesn't block output
      }
    }

    // Build front-matter + body
    const fetchDate = new Date().toISOString().slice(0, 10);
    const imagesMd = collectedImages
      .map((img, idx) => `![页面截图-${idx + 1}](../images/${img.name})`)
      .join("\n\n");

    const frontMatter = [
      "---",
      `source: "lanhu"`,
      `source_url: "${rawUrl}"`,
      `fetch_date: "${fetchDate}"`,
      `requirement_id: "${reqInfo.requirementId}"`,
      `project: "${reqInfo.project}"`,
      `status: "原始"`,
      "---",
    ].join("\n");

    const bodyParts: string[] = [`# ${reqInfo.requirementName}`];

    // Strip useless [图片] references from Axure text extraction
    for (const bridgePage of bridgeResult.pages) {
      if (bridgePage.content) {
        const cleaned = bridgePage.content
          .replace(/\[图片\]\s*images\/[^\s]+(\s*\(\d+x\d+\))?/g, "")
          .replace(/\n{3,}/g, "\n\n");
        bodyParts.push(cleaned);
      }
    }

    if (imagesMd) {
      bodyParts.push(imagesMd);
    }

    const prdContent = `${frontMatter}\n\n${bodyParts.join("\n\n")}\n`;

    // Write raw PRD to tmp/
    const prdFileName = `${reqInfo.requirementName}.md`;
    const prdPath = join(tmpDir, prdFileName);
    writeFileSync(prdPath, prdContent, "utf8");

    requirementInfos.push({
      requirement_id: reqInfo.requirementId,
      requirement_name: reqInfo.requirementName,
      project: reqInfo.project,
      prd_dir: reqDir,
      prd_path: prdPath,
      images_count: collectedImages.length,
    });
  }

  // 8. Output JSON result
  const output: FetchOutput = {
    title,
    total_requirements: requirementInfos.length,
    requirements: requirementInfos,
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

// Only run CLI when executed directly (not when imported by tests)
const isMain = process.argv[1] === __filename || process.argv[1]?.endsWith("fetch.ts");

if (isMain) {
  const program = new Command("lanhu-fetch");
  program
    .description("从蓝湖 URL 抓取 PRD 内容和截图，按需求生成独立 PRD 文件")
    .requiredOption(
      "--url <url>",
      '蓝湖页面 URL，例如 "https://lanhuapp.com/web/#/item/project/product?tid=xxx&pid=xxx&docId=xxx"',
    )
    .option("--base-dir <dir>", "PRD 输出基目录", "workspace/prds")
    .option("--pages <ids>", "要获取的需求 ID（逗号分隔），不指定则获取全部")
    .action(async (opts: { url: string; baseDir: string; pages?: string }) => {
      await run(opts.url, opts.baseDir, opts.pages);
    });

  program.parse(process.argv);
}
