#!/usr/bin/env npx tsx
/**
 * plugins/lanhu/fetch.ts — 蓝湖 PRD 内容 + 截图抓取器
 *
 * Usage:
 *   npx tsx plugins/lanhu/fetch.ts --url "https://lanhuapp.com/web/#/item/..." --output workspace/.temp/lanhu-import
 *   npx tsx plugins/lanhu/fetch.ts --help
 */

import { execSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
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
  apiUrl: string | null;
}

interface ImageRef {
  url: string;
  name: string;
}

interface FetchOutput {
  prd_path: string;
  title: string;
  images_count: number;
  output_dir: string;
}

interface ErrorOutput {
  error: string;
  code: string;
}

// ─── URL Parsing ─────────────────────────────────────────────────────────────

export function parseLanhuUrl(rawUrl: string): ParsedLanhuUrl {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { pageType: "unknown", params: {}, apiUrl: null };
  }

  if (!url.hostname.includes("lanhuapp.com")) {
    return { pageType: "unknown", params: {}, apiUrl: null };
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
  const hashPath = hashQueryIdx !== -1 ? hashPart.slice(0, hashQueryIdx) : hashPart;

  if (params.docId && params.tid && params.pid) {
    const apiUrl =
      `https://lanhuapp.com/api/product/spec` +
      `?tid=${encodeURIComponent(params.tid)}` +
      `&pid=${encodeURIComponent(params.pid)}` +
      `&docId=${encodeURIComponent(params.docId)}` +
      (params.versionId ? `&versionId=${encodeURIComponent(params.versionId)}` : "");
    return { pageType: "product-spec", params, apiUrl };
  }

  if (params.image && params.tid) {
    const apiUrl =
      `https://lanhuapp.com/api/project/image` +
      `?tid=${encodeURIComponent(params.tid)}` +
      `&image=${encodeURIComponent(params.image)}`;
    return { pageType: "design-image", params, apiUrl };
  }

  return { pageType: "unknown", params, apiUrl: null };
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

// ─── Text extraction ─────────────────────────────────────────────────────────

export function extractTitle(data: unknown): string {
  if (!data || typeof data !== "object") return "蓝湖需求文档";
  const obj = data as Record<string, unknown>;

  for (const key of ["title", "name", "docName", "productName"]) {
    if (typeof obj[key] === "string" && obj[key]) return obj[key] as string;
  }

  // Recurse into common wrapper keys
  for (const key of ["data", "result", "doc", "page"]) {
    if (obj[key] && typeof obj[key] === "object") {
      const found = extractTitle(obj[key]);
      if (found !== "蓝湖需求文档") return found;
    }
  }

  return "蓝湖需求文档";
}

export function extractTextContent(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const obj = data as Record<string, unknown>;

  const parts: string[] = [];

  function collectText(node: unknown): void {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) collectText(item);
      return;
    }
    const o = node as Record<string, unknown>;
    for (const key of ["content", "description", "detail", "text", "html", "richText"]) {
      if (typeof o[key] === "string" && o[key]) {
        const raw = o[key] as string;
        const converted = raw.includes("<") ? htmlToMarkdown(raw) : raw.trim();
        if (converted) parts.push(converted);
      }
    }
    for (const val of Object.values(o)) {
      if (val && typeof val === "object") collectText(val);
    }
  }

  collectText(data);
  return parts.join("\n\n");
}

// ─── HTTP Helpers ─────────────────────────────────────────────────────────────

const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  Referer: "https://lanhuapp.com/",
};

async function fetchJson(apiUrl: string, cookie: string): Promise<unknown> {
  const response = await fetch(apiUrl, {
    headers: {
      ...COMMON_HEADERS,
      Cookie: cookie,
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw Object.assign(new Error("COOKIE_EXPIRED"), { statusCode: response.status });
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function downloadImage(
  imageUrl: string,
  destPath: string,
  cookie: string,
): Promise<void> {
  const response = await fetch(imageUrl, {
    headers: {
      ...COMMON_HEADERS,
      Cookie: cookie,
      Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
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

// ─── Main Logic ───────────────────────────────────────────────────────────────

async function run(rawUrl: string, outputDir: string): Promise<void> {
  // 1. Load .env from project root (two levels up from plugins/lanhu/)
  const projectRoot = resolve(__dirname, "../../");
  initEnv(resolve(projectRoot, ".env"));

  const cookie = getEnv("LANHU_COOKIE");
  if (!cookie) {
    const err: ErrorOutput = {
      error: "LANHU_COOKIE is not set. Please configure it in .env file.",
      code: "MISSING_COOKIE",
    };
    process.stderr.write(`${JSON.stringify(err, null, 2)}\n`);
    process.exit(1);
  }

  // 2. Parse URL
  const parsed = parseLanhuUrl(rawUrl);
  if (parsed.pageType === "unknown" || !parsed.apiUrl) {
    const err: ErrorOutput = {
      error:
        "Invalid or unsupported Lanhu URL. Expected format: https://lanhuapp.com/web/#/item/project/product?tid=xxx&pid=xxx&docId=xxx",
      code: "INVALID_URL",
    };
    process.stderr.write(`${JSON.stringify(err, null, 2)}\n`);
    process.exit(1);
  }

  // 3. Setup output directory
  const absOutput = resolve(outputDir);
  const imagesDir = join(absOutput, "images");
  mkdirSync(imagesDir, { recursive: true });

  // 4. Fetch API data
  let apiData: unknown;
  try {
    apiData = await fetchJson(parsed.apiUrl, cookie);
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.message === "COOKIE_EXPIRED") {
      const out: ErrorOutput = {
        error: `Cookie 已过期，请更新 .env 中的 LANHU_COOKIE (HTTP ${e.statusCode ?? "401/403"})`,
        code: "COOKIE_EXPIRED",
      };
      process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
      process.exit(1);
    }
    const out: ErrorOutput = {
      error: `Network error: ${e.message}`,
      code: "NETWORK_ERROR",
    };
    process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exit(1);
  }

  // 5. Extract content
  const title = extractTitle(apiData);
  const textContent = extractTextContent(apiData);
  const imageUrls = extractImageUrls(apiData);

  // 6. Download images
  const downloadedImages: ImageRef[] = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    try {
      const urlObj = new URL(imageUrl);
      const rawName = urlObj.pathname.split("/").pop() ?? `image-${i + 1}`;
      const ext = rawName.includes(".") ? rawName.split(".").pop() ?? "png" : "png";
      const slug = slugify(rawName.replace(/\.[^.]+$/, "")) || `image-${i + 1}`;
      const fileName = `${i + 1}-${slug}.${ext}`;
      const destPath = join(imagesDir, fileName);
      await downloadImage(imageUrl, destPath, cookie);
      downloadedImages.push({ url: imageUrl, name: fileName });
    } catch {
      // Non-fatal: skip failed image downloads
    }
  }

  // 7. Compress images
  if (downloadedImages.length > 0) {
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

  // 8. Build front-matter + body
  const fetchDate = new Date().toISOString().slice(0, 10);
  const imagesMd = downloadedImages
    .map((img, idx) => `![页面截图-${idx + 1}](images/${img.name})`)
    .join("\n\n");

  const frontMatter = [
    "---",
    `source: "lanhu"`,
    `source_url: "${rawUrl}"`,
    `fetch_date: "${fetchDate}"`,
    `status: "原始"`,
    "---",
  ].join("\n");

  const bodyParts: string[] = [`# ${title}`];
  if (textContent) bodyParts.push(textContent);
  if (imagesMd) bodyParts.push(imagesMd);

  const prdContent = `${frontMatter}\n\n${bodyParts.join("\n\n")}\n`;

  // 9. Write raw-prd.md
  const prdPath = join(absOutput, "raw-prd.md");
  writeFileSync(prdPath, prdContent, "utf8");

  // 10. Output JSON result
  const output: FetchOutput = {
    prd_path: prdPath,
    title,
    images_count: downloadedImages.length,
    output_dir: absOutput,
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

// Only run CLI when executed directly (not when imported by tests)
const isMain = process.argv[1] === __filename || process.argv[1]?.endsWith("fetch.ts");

if (isMain) {
  const program = new Command("lanhu-fetch");
  program
    .description("从蓝湖 URL 抓取 PRD 内容和截图，生成原始 PRD Markdown")
    .requiredOption(
      "--url <url>",
      '蓝湖页面 URL，例如 "https://lanhuapp.com/web/#/item/project/product?tid=xxx&pid=xxx&docId=xxx"',
    )
    .requiredOption("--output <dir>", "输出目录路径，例如 workspace/.temp/lanhu-import")
    .action(async (opts: { url: string; output: string }) => {
      await run(opts.url, opts.output);
    });

  program.parse(process.argv);
}
