# lanhu-mcp Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace broken lanhu API calls with lanhu-mcp submodule integration via Python bridge script, keeping existing plugin interface unchanged.

**Architecture:** Git submodule at `tools/lanhu/lanhu-mcp/`, Python bridge script calls `LanhuExtractor` directly, TypeScript adapter (`fetch.ts`) spawns bridge via subprocess and formats output as `raw-prd.md`.

**Tech Stack:** TypeScript (Node.js), Python 3.10+, uv, git submodules, lanhu-mcp (fastmcp + httpx + beautifulsoup4)

---

## File Structure

| File                                    | Action             | Responsibility                                          |
| --------------------------------------- | ------------------ | ------------------------------------------------------- |
| `.gitmodules`                           | Create             | Declare lanhu-mcp submodule                             |
| `tools/lanhu/lanhu-mcp/`                | Create (submodule) | Upstream lanhu-mcp code                                 |
| `tools/lanhu/bridge.py`                 | Create             | Import LanhuExtractor, call APIs, output JSON to stdout |
| `tools/lanhu/setup.sh`                  | Create             | Init submodule + uv sync                                |
| `plugins/lanhu/fetch.ts`                | Modify             | Replace direct API calls with subprocess to bridge.py   |
| `plugins/lanhu/__tests__/fetch.test.ts` | Modify             | Update tests for new flow                               |

---

### Task 1: Add lanhu-mcp as git submodule + setup script

**Files:**

- Create: `.gitmodules`
- Create: `tools/lanhu/setup.sh`

- [ ] **Step 1: Create tools/lanhu directory and add submodule**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
mkdir -p tools/lanhu
git submodule add https://github.com/dsphper/lanhu-mcp.git tools/lanhu/lanhu-mcp
```

- [ ] **Step 2: Create setup.sh**

Create `tools/lanhu/setup.sh`:

```bash
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Check uv is installed
if ! command -v uv &> /dev/null; then
  echo "[lanhu] ERROR: uv is not installed."
  echo "[lanhu] Install it with: curl -LsSf https://astral.sh/uv/install.sh | sh"
  exit 1
fi

# Update submodule
echo "[lanhu] Updating submodule..."
cd "$PROJECT_ROOT"
git submodule update --init --remote tools/lanhu/lanhu-mcp

# Install Python dependencies
echo "[lanhu] Installing Python dependencies..."
cd "$SCRIPT_DIR/lanhu-mcp"
uv sync

echo "[lanhu] Ready."
```

- [ ] **Step 3: Make setup.sh executable**

```bash
chmod +x tools/lanhu/setup.sh
```

- [ ] **Step 4: Run setup.sh to verify it works**

```bash
bash tools/lanhu/setup.sh
```

Expected: submodule cloned, `tools/lanhu/lanhu-mcp/.venv/` created with all dependencies.

- [ ] **Step 5: Commit**

```bash
git add .gitmodules tools/lanhu/lanhu-mcp tools/lanhu/setup.sh
git commit -m "chore: add lanhu-mcp as git submodule with setup script"
```

---

### Task 2: Create bridge.py

**Files:**

- Create: `tools/lanhu/bridge.py`

- [ ] **Step 1: Verify lanhu-mcp function signatures**

Read `tools/lanhu/lanhu-mcp/lanhu_mcp_server.py` to confirm:

- `LanhuExtractor.__init__()` takes no args, reads `COOKIE` from `os.getenv("LANHU_COOKIE")`
- `extractor.parse_url(url)` returns `{"team_id", "project_id", "doc_id", "version_id"}`
- `extractor.get_pages_list(url)` is async, takes url string, returns dict with `document_name`, `document_type`, `pages[]`
- `lanhu_get_ai_analyze_page_result(url, page_names, mode, analysis_mode, ctx)` is async, returns `List[Union[str, Image]]`

- [ ] **Step 2: Create bridge.py**

Create `tools/lanhu/bridge.py`:

```python
#!/usr/bin/env python3
"""
Bridge script: imports lanhu_mcp_server.LanhuExtractor,
fetches PRD pages, outputs structured JSON to stdout.

Usage:
  uv run bridge.py --url <lanhu_url> [--page-id <id>]

Environment:
  LANHU_COOKIE - required, passed from fetch.ts
"""

import argparse
import asyncio
import json
import os
import sys

# Add lanhu-mcp to path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(SCRIPT_DIR, "lanhu-mcp"))

from lanhu_mcp_server import LanhuExtractor, lanhu_get_ai_analyze_page_result


def error_exit(message: str, code: str) -> None:
    json.dump({"error": message, "code": code}, sys.stderr, ensure_ascii=False)
    sys.stderr.write("\n")
    sys.exit(1)


async def main(url: str, page_id: str | None = None) -> None:
    cookie = os.getenv("LANHU_COOKIE", "")
    if not cookie:
        error_exit("LANHU_COOKIE is not set", "MISSING_COOKIE")

    extractor = LanhuExtractor()

    # Step 1: Parse URL to validate
    try:
        parsed = extractor.parse_url(url)
    except ValueError as e:
        error_exit(f"Invalid URL: {e}", "INVALID_URL")
        return

    if not parsed.get("doc_id"):
        error_exit(
            "URL must contain docId parameter for PRD documents",
            "MISSING_DOC_ID",
        )

    # Step 2: Get pages list
    try:
        pages_result = await extractor.get_pages_list(url)
    except Exception as e:
        error_exit(f"Failed to get pages list: {e}", "PAGES_LIST_ERROR")
        return

    pages = pages_result.get("pages", [])
    if not pages:
        error_exit("No pages found in document", "NO_PAGES")

    # Step 3: Filter pages if page_id specified
    if page_id:
        pages = [p for p in pages if p.get("id") == page_id or p.get("filename") == page_id]
        if not pages:
            error_exit(f"Page not found: {page_id}", "PAGE_NOT_FOUND")

    # Step 4: Analyze pages with tester perspective
    page_names = [p["name"] for p in pages]
    try:
        analysis_results = await lanhu_get_ai_analyze_page_result(
            url=url,
            page_names=page_names,
            mode="text_only",
            analysis_mode="tester",
            ctx=None,
        )
    except Exception as e:
        error_exit(f"Failed to analyze pages: {e}", "ANALYSIS_ERROR")
        return

    # Step 5: Build output — pair pages with analysis results
    # analysis_results is List[Union[str, Image]], in text_only mode it's all strings
    # Each page may produce one or more text blocks; merge them per page
    result_pages = []
    text_blocks = [r for r in analysis_results if isinstance(r, str)]

    # If we got fewer blocks than pages, distribute what we have
    for i, page in enumerate(pages):
        content = text_blocks[i] if i < len(text_blocks) else ""
        result_pages.append({
            "name": page.get("name", ""),
            "path": page.get("path", ""),
            "content": content,
            "images": [],
        })

    output = {
        "title": pages_result.get("document_name", "蓝湖需求文档"),
        "doc_type": pages_result.get("document_type", "unknown"),
        "total_pages": len(result_pages),
        "pages": result_pages,
    }

    json.dump(output, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Lanhu PRD bridge")
    parser.add_argument("--url", required=True, help="Lanhu document URL")
    parser.add_argument("--page-id", default=None, help="Specific page ID to fetch")
    args = parser.parse_args()

    asyncio.run(main(args.url, args.page_id))
```

- [ ] **Step 3: Test bridge.py manually**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
source .env  # or export LANHU_COOKIE manually
cd tools/lanhu
uv run bridge.py --url "https://lanhuapp.com/web/#/item/project/product?tid=24a1c6b2-a52e-454c-8d51-8aff866598b1&pid=7de90493-e80f-4592-a263-38fb2d2e98c0&versionId=236fbc84-10a3-4808-9559-66c1ef54ae55&docId=fc0fee93-74f5-4eff-a769-99e68506b296&docType=axure&pageId=e08ead471bc2471489e6fc7443d060c6&image_id=fc0fee93-74f5-4eff-a769-99e68506b296&parentId=9a152fb2-6417-4ee0-8df3-6f74f7deb413"
```

Expected: JSON output with `title`, `doc_type`, `total_pages`, `pages[]` containing page content.

- [ ] **Step 4: Fix any issues found during manual test**

If `lanhu_get_ai_analyze_page_result` signature or behavior doesn't match expectations, adjust the bridge.py accordingly. The function may need different argument passing or the text extraction from results may need adjustment.

- [ ] **Step 5: Commit**

```bash
git add tools/lanhu/bridge.py
git commit -m "feat: add Python bridge script for lanhu-mcp integration"
```

---

### Task 3: Rewrite fetch.ts as adapter

**Files:**

- Modify: `plugins/lanhu/fetch.ts`

- [ ] **Step 1: Write the failing test for subprocess integration**

Add to `plugins/lanhu/__tests__/fetch.test.ts` — a new test that validates `parseLanhuUrl` now extracts `pageId`:

```typescript
it("extracts pageId from hash query params", () => {
  const url =
    "https://lanhuapp.com/web/#/item/project/product?tid=t1&pid=p1&docId=d1&pageId=page-abc";
  const result = parseLanhuUrl(url);
  assert.equal(result.pageType, "product-spec");
  assert.equal(result.params.pageId, "page-abc");
});
```

- [ ] **Step 2: Run test to verify it passes (pageId is already extracted by existing logic)**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
bun test plugins/lanhu/__tests__/fetch.test.ts
```

Expected: PASS — `parseLanhuUrl` already extracts all hash query params into `params`.

- [ ] **Step 3: Rewrite fetch.ts**

Replace the content of `plugins/lanhu/fetch.ts`. Keep: CLI interface, `parseLanhuUrl` (simplified), `downloadImage`, `htmlToMarkdown`, `slugify`, front-matter output. Remove: `fetchJson`, `extractTitle`, `extractTextContent`, direct API URL construction. Add: subprocess call to bridge.py, auto-setup check.

```typescript
#!/usr/bin/env bun
/**
 * plugins/lanhu/fetch.ts — 蓝湖 PRD 适配层
 *
 * 通过 subprocess 调用 tools/lanhu/bridge.py 获取 PRD 内容，
 * 下载图片并输出 raw-prd.md。
 */

import { execSync } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
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
  pageId?: string;
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
    return { pageType: "unknown", params: {} };
  }

  if (!url.hostname.includes("lanhuapp.com")) {
    return { pageType: "unknown", params: {} };
  }

  const hashPart = url.hash;
  const hashQueryIdx = hashPart.indexOf("?");
  const params: LanhuQueryParams = {};

  if (hashQueryIdx !== -1) {
    const hashQuery = hashPart.slice(hashQueryIdx + 1);
    for (const [key, val] of new URLSearchParams(hashQuery)) {
      params[key] = val;
    }
  }

  for (const [key, val] of url.searchParams) {
    params[key] = val;
  }

  if (params.docId && params.tid && params.pid) {
    return { pageType: "product-spec", params };
  }

  if (params.image && params.tid) {
    return { pageType: "design-image", params };
  }

  return { pageType: "unknown", params };
}

// ─── HTML → Markdown ─────────────────────────────────────────────────────────

export function htmlToMarkdown(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<h([1-6])[^>]*>/gi, (_, n) => "#".repeat(Number(n)) + " ")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
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

// ─── Image extraction (kept for bridge output images) ────────────────────────

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
        (key === "url" ||
          key === "src" ||
          key === "imageUrl" ||
          key === "cover") &&
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
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
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

// ─── Setup Check ─────────────────────────────────────────────────────────────

function ensureLanhuMcpReady(projectRoot: string): void {
  const venvPath = resolve(projectRoot, "tools/lanhu/lanhu-mcp/.venv");
  if (existsSync(venvPath)) return;

  const setupScript = resolve(projectRoot, "tools/lanhu/setup.sh");
  if (!existsSync(setupScript)) {
    throw new Error(
      "tools/lanhu/setup.sh not found. Run `/qa-flow init` first.",
    );
  }

  try {
    execSync(`bash "${setupScript}"`, {
      stdio: "pipe",
      cwd: projectRoot,
    });
  } catch (err) {
    const e = err as Error;
    throw new Error(`lanhu-mcp setup failed: ${e.message}`);
  }
}

// ─── Bridge Call ─────────────────────────────────────────────────────────────

function callBridge(
  projectRoot: string,
  rawUrl: string,
  pageId: string | undefined,
  cookie: string,
): BridgeOutput {
  const bridgePath = resolve(projectRoot, "tools/lanhu/bridge.py");
  const lanhuMcpDir = resolve(projectRoot, "tools/lanhu");

  const args = [`--url`, rawUrl];
  if (pageId) {
    args.push(`--page-id`, pageId);
  }

  const argsStr = args.map((a) => `"${a}"`).join(" ");
  const cmd = `uv run bridge.py ${argsStr}`;

  try {
    const stdout = execSync(cmd, {
      encoding: "utf8",
      cwd: lanhuMcpDir,
      env: { ...process.env, LANHU_COOKIE: cookie },
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 120_000,
    });
    return JSON.parse(stdout) as BridgeOutput;
  } catch (err) {
    const e = err as Error & { stderr?: string; status?: number };
    const stderr = e.stderr ?? "";

    // Try to parse structured error from bridge.py
    try {
      const bridgeError = JSON.parse(stderr) as ErrorOutput;
      throw Object.assign(new Error(bridgeError.error), {
        code: bridgeError.code,
      });
    } catch (parseErr) {
      if (parseErr instanceof SyntaxError) {
        throw new Error(`Bridge error: ${stderr || e.message}`);
      }
      throw parseErr;
    }
  }
}

// ─── Main Logic ───────────────────────────────────────────────────────────────

async function run(rawUrl: string, outputDir: string): Promise<void> {
  const projectRoot = resolve(__dirname, "../../");
  initEnv(resolve(projectRoot, ".env"));

  // 1. Validate cookie
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
  if (parsed.pageType === "unknown") {
    const err: ErrorOutput = {
      error:
        "Invalid or unsupported Lanhu URL. Expected format: https://lanhuapp.com/web/#/item/project/product?tid=xxx&pid=xxx&docId=xxx",
      code: "INVALID_URL",
    };
    process.stderr.write(`${JSON.stringify(err, null, 2)}\n`);
    process.exit(1);
  }

  // 3. Ensure lanhu-mcp is set up
  try {
    ensureLanhuMcpReady(projectRoot);
  } catch (err) {
    const e = err as Error;
    const out: ErrorOutput = {
      error: e.message,
      code: "SETUP_ERROR",
    };
    process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exit(1);
  }

  // 4. Setup output directory
  const absOutput = resolve(outputDir);
  const imagesDir = join(absOutput, "images");
  mkdirSync(imagesDir, { recursive: true });

  // 5. Call bridge.py
  let bridgeData: BridgeOutput;
  try {
    bridgeData = callBridge(projectRoot, rawUrl, parsed.params.pageId, cookie);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "MISSING_COOKIE" || e.message?.includes("Cookie")) {
      const out: ErrorOutput = {
        error: `Cookie 已过期，请更新 .env 中的 LANHU_COOKIE`,
        code: "COOKIE_EXPIRED",
      };
      process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
      process.exit(1);
    }
    const out: ErrorOutput = {
      error: `Bridge error: ${e.message}`,
      code: e.code ?? "BRIDGE_ERROR",
    };
    process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exit(1);
  }

  // 6. Collect and download images from all pages
  const allImageUrls: string[] = [];
  for (const page of bridgeData.pages) {
    allImageUrls.push(...page.images);
  }
  const uniqueImageUrls = [...new Set(allImageUrls)];

  interface ImageRef {
    url: string;
    name: string;
  }
  const downloadedImages: ImageRef[] = [];
  for (let i = 0; i < uniqueImageUrls.length; i++) {
    const imageUrl = uniqueImageUrls[i];
    try {
      const urlObj = new URL(imageUrl);
      const rawName = urlObj.pathname.split("/").pop() ?? `image-${i + 1}`;
      const ext = rawName.includes(".")
        ? (rawName.split(".").pop() ?? "png")
        : "png";
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
      const compressScript = resolve(
        projectRoot,
        ".claude/scripts/image-compress.ts",
      );
      execSync(`bun run "${compressScript}" --dir "${imagesDir}"`, {
        stdio: "pipe",
        cwd: projectRoot,
      });
    } catch {
      // Non-fatal
    }
  }

  // 8. Build raw-prd.md
  const fetchDate = new Date().toISOString().slice(0, 10);
  const frontMatter = [
    "---",
    `source: "lanhu"`,
    `source_url: "${rawUrl}"`,
    `fetch_date: "${fetchDate}"`,
    `status: "原始"`,
    "---",
  ].join("\n");

  const bodyParts: string[] = [`# ${bridgeData.title}`];

  for (const page of bridgeData.pages) {
    if (bridgeData.total_pages > 1) {
      bodyParts.push(`## ${page.path || page.name}`);
    }
    if (page.content) {
      bodyParts.push(page.content);
    }
  }

  if (downloadedImages.length > 0) {
    const imagesMd = downloadedImages
      .map((img, idx) => `![页面截图-${idx + 1}](images/${img.name})`)
      .join("\n\n");
    bodyParts.push(imagesMd);
  }

  const prdContent = `${frontMatter}\n\n${bodyParts.join("\n\n")}\n`;
  const prdPath = join(absOutput, "raw-prd.md");
  writeFileSync(prdPath, prdContent, "utf8");

  // 9. Output JSON result
  const output: FetchOutput = {
    prd_path: prdPath,
    title: bridgeData.title,
    images_count: downloadedImages.length,
    output_dir: absOutput,
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const isMain =
  process.argv[1] === __filename || process.argv[1]?.endsWith("fetch.ts");

if (isMain) {
  const program = new Command("lanhu-fetch");
  program
    .description("从蓝湖 URL 抓取 PRD 内容和截图，生成原始 PRD Markdown")
    .requiredOption(
      "--url <url>",
      '蓝湖页面 URL，例如 "https://lanhuapp.com/web/#/item/project/product?tid=xxx&pid=xxx&docId=xxx"',
    )
    .requiredOption(
      "--output <dir>",
      "输出目录路径，例如 workspace/.temp/lanhu-import",
    )
    .action(async (opts: { url: string; output: string }) => {
      await run(opts.url, opts.output);
    });

  program.parse(process.argv);
}
```

- [ ] **Step 4: Run existing tests to check backward compatibility**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
bun test plugins/lanhu/__tests__/fetch.test.ts
```

Expected: `parseLanhuUrl` tests still pass. `extractTitle`/`extractTextContent` tests will fail because those functions are removed. CLI integration tests should still pass (MISSING_COOKIE, INVALID_URL checks are preserved).

- [ ] **Step 5: Commit**

```bash
git add plugins/lanhu/fetch.ts
git commit -m "feat: rewrite fetch.ts as adapter calling lanhu-mcp bridge"
```

---

### Task 4: Update tests

**Files:**

- Modify: `plugins/lanhu/__tests__/fetch.test.ts`

- [ ] **Step 1: Update test imports and remove deleted function tests**

Remove imports and test suites for `extractTitle`, `extractTextContent` (these are now handled by bridge.py). Keep all other test suites: `parseLanhuUrl`, `htmlToMarkdown`, `slugify`, `extractImageUrls`, CLI integration tests.

Update `parseLanhuUrl` tests: remove `apiUrl` assertions (field removed from return type).

Updated test file:

```typescript
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  extractImageUrls,
  htmlToMarkdown,
  parseLanhuUrl,
  slugify,
} from "../fetch.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const FETCH_TS = resolve(__dirname, "../fetch.ts");
const PROJECT_ROOT = resolve(__dirname, "../../../");

const TMP_DIR = join(tmpdir(), `lanhu-fetch-test-${process.pid}`);

afterEach(() => {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

// ─── parseLanhuUrl ────────────────────────────────────────────────────────────

describe("parseLanhuUrl", () => {
  it("parses product spec URL with hash-based query params", () => {
    const url =
      "https://lanhuapp.com/web/#/item/project/product?tid=team-001&pid=proj-001&docId=doc-001";
    const result = parseLanhuUrl(url);
    assert.equal(result.pageType, "product-spec");
    assert.equal(result.params.tid, "team-001");
    assert.equal(result.params.pid, "proj-001");
    assert.equal(result.params.docId, "doc-001");
  });

  it("includes versionId in params when present", () => {
    const url =
      "https://lanhuapp.com/web/#/item/project/product?tid=t1&pid=p1&docId=d1&versionId=v99";
    const result = parseLanhuUrl(url);
    assert.equal(result.pageType, "product-spec");
    assert.equal(result.params.versionId, "v99");
  });

  it("extracts pageId from hash query params", () => {
    const url =
      "https://lanhuapp.com/web/#/item/project/product?tid=t1&pid=p1&docId=d1&pageId=page-abc";
    const result = parseLanhuUrl(url);
    assert.equal(result.pageType, "product-spec");
    assert.equal(result.params.pageId, "page-abc");
  });

  it("parses design image URL", () => {
    const url =
      "https://lanhuapp.com/web/#/item/project/board?tid=team-002&image=img-abc";
    const result = parseLanhuUrl(url);
    assert.equal(result.pageType, "design-image");
    assert.equal(result.params.tid, "team-002");
    assert.equal(result.params.image, "img-abc");
  });

  it("returns unknown for non-lanhu domain", () => {
    const result = parseLanhuUrl("https://example.com/?docId=123");
    assert.equal(result.pageType, "unknown");
  });

  it("returns unknown for lanhu URL without required params", () => {
    const result = parseLanhuUrl(
      "https://lanhuapp.com/web/#/item/project/product?tid=t1",
    );
    assert.equal(result.pageType, "unknown");
  });

  it("returns unknown for completely invalid URL", () => {
    const result = parseLanhuUrl("not-a-url-at-all");
    assert.equal(result.pageType, "unknown");
  });

  it("returns unknown for empty string", () => {
    const result = parseLanhuUrl("");
    assert.equal(result.pageType, "unknown");
  });
});

// ─── htmlToMarkdown ───────────────────────────────────────────────────────────

describe("htmlToMarkdown", () => {
  it("converts <br> to newline", () => {
    const result = htmlToMarkdown("line1<br>line2");
    assert.ok(result.includes("line1\nline2"));
  });

  it("strips plain HTML tags", () => {
    const result = htmlToMarkdown("<p>Hello <b>world</b></p>");
    assert.ok(result.includes("Hello world"));
    assert.ok(!result.includes("<"));
  });

  it("decodes HTML entities", () => {
    const result = htmlToMarkdown("a &amp; b &lt;c&gt; &quot;d&quot; &nbsp;e");
    assert.ok(result.includes('a & b <c> "d"'));
    assert.ok(result.includes("e"));
  });

  it("converts heading tags", () => {
    const result = htmlToMarkdown("<h2>Section</h2>");
    assert.ok(result.includes("## Section"));
  });

  it("converts list items", () => {
    const result = htmlToMarkdown("<ul><li>Item A</li><li>Item B</li></ul>");
    assert.ok(result.includes("- Item A"));
    assert.ok(result.includes("- Item B"));
  });

  it("collapses excessive blank lines", () => {
    const result = htmlToMarkdown("<p>A</p><p></p><p></p><p>B</p>");
    assert.ok(!result.includes("\n\n\n"));
  });
});

// ─── slugify ─────────────────────────────────────────────────────────────────

describe("slugify", () => {
  it("lowercases and replaces spaces with dashes", () => {
    assert.equal(slugify("Hello World"), "hello-world");
  });

  it("strips special characters except dashes and CJK", () => {
    assert.equal(slugify("foo!@#bar"), "foobar");
  });

  it("preserves CJK characters", () => {
    const result = slugify("商品管理列表");
    assert.ok(result.includes("商品管理列表"));
  });

  it("truncates to 60 characters", () => {
    const long = "a".repeat(100);
    assert.equal(slugify(long).length, 60);
  });

  it("handles empty string", () => {
    assert.equal(slugify(""), "");
  });
});

// ─── extractImageUrls ─────────────────────────────────────────────────────────

describe("extractImageUrls", () => {
  it("extracts url fields starting with http", () => {
    const data = { url: "https://cdn.lanhu.com/img1.png" };
    const urls = extractImageUrls(data);
    assert.ok(urls.includes("https://cdn.lanhu.com/img1.png"));
  });

  it("extracts imageUrl fields", () => {
    const data = { imageUrl: "https://cdn.lanhu.com/img2.png" };
    const urls = extractImageUrls(data);
    assert.ok(urls.includes("https://cdn.lanhu.com/img2.png"));
  });

  it("converts protocol-relative URLs to https", () => {
    const data = { url: "//cdn.lanhu.com/img3.png" };
    const urls = extractImageUrls(data);
    assert.ok(urls.includes("https://cdn.lanhu.com/img3.png"));
  });

  it("deduplicates identical URLs", () => {
    const data = [
      { url: "https://cdn.lanhu.com/dup.png" },
      { url: "https://cdn.lanhu.com/dup.png" },
    ];
    const urls = extractImageUrls(data);
    assert.equal(
      urls.filter((u) => u === "https://cdn.lanhu.com/dup.png").length,
      1,
    );
  });

  it("recurses into nested objects", () => {
    const data = {
      outer: { inner: { url: "https://cdn.lanhu.com/nested.png" } },
    };
    const urls = extractImageUrls(data);
    assert.ok(urls.includes("https://cdn.lanhu.com/nested.png"));
  });

  it("recurses into arrays", () => {
    const data = [
      { url: "https://cdn.lanhu.com/arr1.png" },
      { url: "https://cdn.lanhu.com/arr2.png" },
    ];
    const urls = extractImageUrls(data);
    assert.equal(urls.length, 2);
  });

  it("ignores non-http string fields not named url/src/imageUrl/cover", () => {
    const data = { title: "https://cdn.lanhu.com/not-an-image.png" };
    const urls = extractImageUrls(data);
    assert.equal(urls.length, 0);
  });

  it("returns empty array for null input", () => {
    assert.deepEqual(extractImageUrls(null), []);
  });
});

// ─── CLI Integration Tests ────────────────────────────────────────────────────

describe("CLI: --help", () => {
  it("prints usage and exits 0", () => {
    let stdout = "";
    let exitCode = 0;
    try {
      stdout = execSync(`bun run "${FETCH_TS}" --help`, {
        encoding: "utf8",
        cwd: PROJECT_ROOT,
        env: { ...process.env },
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (err) {
      const e = err as { status?: number; stdout?: string };
      exitCode = e.status ?? 1;
      stdout = e.stdout ?? "";
    }
    assert.equal(exitCode, 0);
    assert.ok(
      stdout.includes("--url") || stdout.includes("Usage"),
      "should show --url option",
    );
  });
});

describe("CLI: missing LANHU_COOKIE", () => {
  it("exits 1 when LANHU_COOKIE is not set", () => {
    mkdirSync(TMP_DIR, { recursive: true });

    const filteredEnv = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([k]) => k !== "LANHU_COOKIE"),
      ),
      LANHU_COOKIE: "",
    };

    let exitCode = 0;
    let stderr = "";
    try {
      execSync(
        `bun run "${FETCH_TS}" --url "https://lanhuapp.com/web/#/item/project/product?tid=t&pid=p&docId=d" --output "${TMP_DIR}/out"`,
        {
          encoding: "utf8",
          cwd: PROJECT_ROOT,
          env: filteredEnv,
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
    } catch (err) {
      const e = err as { status?: number; stderr?: string };
      exitCode = e.status ?? 0;
      stderr = e.stderr ?? "";
    }

    assert.equal(exitCode, 1, "should exit with code 1");
    assert.ok(
      stderr.includes("LANHU_COOKIE") || stderr.includes("MISSING_COOKIE"),
      `stderr should mention LANHU_COOKIE, got: ${stderr}`,
    );
  });
});

describe("CLI: invalid URL format", () => {
  it("exits 1 for non-lanhu URL", () => {
    mkdirSync(TMP_DIR, { recursive: true });

    let exitCode = 0;
    let stderr = "";
    try {
      execSync(
        `bun run "${FETCH_TS}" --url "https://example.com/not-lanhu" --output "${TMP_DIR}/out"`,
        {
          encoding: "utf8",
          cwd: PROJECT_ROOT,
          env: { ...process.env, LANHU_COOKIE: "fake-cookie-for-url-test" },
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
    } catch (err) {
      const e = err as { status?: number; stderr?: string };
      exitCode = e.status ?? 0;
      stderr = e.stderr ?? "";
    }

    assert.equal(exitCode, 1, "should exit with code 1");
    assert.ok(
      stderr.includes("INVALID_URL") ||
        stderr.includes("Invalid") ||
        stderr.includes("Unsupported"),
      `stderr should mention invalid URL, got: ${stderr}`,
    );
  });

  it("exits 1 for URL missing required params", () => {
    mkdirSync(TMP_DIR, { recursive: true });

    let exitCode = 0;
    let stderr = "";
    try {
      execSync(
        `bun run "${FETCH_TS}" --url "https://lanhuapp.com/web/#/item/project/product?tid=only-tid" --output "${TMP_DIR}/out"`,
        {
          encoding: "utf8",
          cwd: PROJECT_ROOT,
          env: { ...process.env, LANHU_COOKIE: "fake-cookie-for-url-test" },
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
    } catch (err) {
      const e = err as { status?: number; stderr?: string };
      exitCode = e.status ?? 0;
      stderr = e.stderr ?? "";
    }

    assert.equal(exitCode, 1, "should exit with code 1");
    assert.ok(
      stderr.includes("INVALID_URL") || stderr.includes("Invalid"),
      `stderr should mention invalid URL, got: ${stderr}`,
    );
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
bun test plugins/lanhu/__tests__/fetch.test.ts
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add plugins/lanhu/__tests__/fetch.test.ts
git commit -m "test: update fetch tests for bridge adapter architecture"
```

---

### Task 5: End-to-end verification

**Files:** None (verification only)

- [ ] **Step 1: Run full fetch with test URL**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
bun run plugins/lanhu/fetch.ts \
  --url "https://lanhuapp.com/web/#/item/project/product?tid=24a1c6b2-a52e-454c-8d51-8aff866598b1&pid=7de90493-e80f-4592-a263-38fb2d2e98c0&versionId=236fbc84-10a3-4808-9559-66c1ef54ae55&docId=fc0fee93-74f5-4eff-a769-99e68506b296&docType=axure&pageId=e08ead471bc2471489e6fc7443d060c6&image_id=fc0fee93-74f5-4eff-a769-99e68506b296&parentId=9a152fb2-6417-4ee0-8df3-6f74f7deb413" \
  --output workspace/.temp/lanhu-e2e-test
```

Expected: exits 0, stdout contains FetchOutput JSON with `prd_path`, `title`, `images_count`.

- [ ] **Step 2: Verify raw-prd.md content**

```bash
head -30 workspace/.temp/lanhu-e2e-test/raw-prd.md
```

Expected: YAML front-matter with `source: "lanhu"`, followed by `# <document title>`, then page content in tester perspective.

- [ ] **Step 3: Compare output with lanhu-mcp direct call**

Run lanhu-mcp directly to compare:

```bash
cd tools/lanhu
uv run bridge.py --url "https://lanhuapp.com/web/#/item/project/product?tid=24a1c6b2-a52e-454c-8d51-8aff866598b1&pid=7de90493-e80f-4592-a263-38fb2d2e98c0&versionId=236fbc84-10a3-4808-9559-66c1ef54ae55&docId=fc0fee93-74f5-4eff-a769-99e68506b296&docType=axure&pageId=e08ead471bc2471489e6fc7443d060c6" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Title: {d[\"title\"]}, Pages: {d[\"total_pages\"]}')"
```

Expected: title and page count match the raw-prd.md output.

- [ ] **Step 4: Clean up test artifacts**

```bash
rm -rf workspace/.temp/lanhu-e2e-test
```

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: adjustments from e2e verification"
```

Only run if Step 1-3 required code fixes.
