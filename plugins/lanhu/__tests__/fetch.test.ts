import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  extractImageUrls,
  extractTextContent,
  extractTitle,
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
    assert.ok(result.apiUrl?.includes("lanhuapp.com/api/product/spec"));
    assert.ok(result.apiUrl?.includes("tid=team-001"));
    assert.ok(result.apiUrl?.includes("pid=proj-001"));
    assert.ok(result.apiUrl?.includes("docId=doc-001"));
  });

  it("includes versionId in apiUrl when present", () => {
    const url =
      "https://lanhuapp.com/web/#/item/project/product?tid=t1&pid=p1&docId=d1&versionId=v99";
    const result = parseLanhuUrl(url);
    assert.equal(result.pageType, "product-spec");
    assert.ok(result.apiUrl?.includes("versionId=v99"));
  });

  it("parses design image URL", () => {
    const url =
      "https://lanhuapp.com/web/#/item/project/board?tid=team-002&image=img-abc";
    const result = parseLanhuUrl(url);
    assert.equal(result.pageType, "design-image");
    assert.equal(result.params.tid, "team-002");
    assert.equal(result.params.image, "img-abc");
    assert.ok(result.apiUrl?.includes("lanhuapp.com/api/project/image"));
    assert.ok(result.apiUrl?.includes("image=img-abc"));
  });

  it("returns unknown for non-lanhu domain", () => {
    const result = parseLanhuUrl("https://example.com/?docId=123");
    assert.equal(result.pageType, "unknown");
    assert.equal(result.apiUrl, null);
  });

  it("returns unknown for lanhu URL without required params", () => {
    const result = parseLanhuUrl("https://lanhuapp.com/web/#/item/project/product?tid=t1");
    assert.equal(result.pageType, "unknown");
    assert.equal(result.apiUrl, null);
  });

  it("returns unknown for completely invalid URL", () => {
    const result = parseLanhuUrl("not-a-url-at-all");
    assert.equal(result.pageType, "unknown");
    assert.equal(result.apiUrl, null);
  });

  it("returns unknown for empty string", () => {
    const result = parseLanhuUrl("");
    assert.equal(result.pageType, "unknown");
    assert.equal(result.apiUrl, null);
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
    assert.ok(result.includes("a & b <c> \"d\""));
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
    assert.equal(urls.filter((u) => u === "https://cdn.lanhu.com/dup.png").length, 1);
  });

  it("recurses into nested objects", () => {
    const data = { outer: { inner: { url: "https://cdn.lanhu.com/nested.png" } } };
    const urls = extractImageUrls(data);
    assert.ok(urls.includes("https://cdn.lanhu.com/nested.png"));
  });

  it("recurses into arrays", () => {
    const data = [{ url: "https://cdn.lanhu.com/arr1.png" }, { url: "https://cdn.lanhu.com/arr2.png" }];
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

// ─── extractTitle ─────────────────────────────────────────────────────────────

describe("extractTitle", () => {
  it("extracts title field", () => {
    assert.equal(extractTitle({ title: "我的需求" }), "我的需求");
  });

  it("extracts name field when no title", () => {
    assert.equal(extractTitle({ name: "商品管理" }), "商品管理");
  });

  it("recurses into data wrapper", () => {
    assert.equal(extractTitle({ data: { title: "嵌套标题" } }), "嵌套标题");
  });

  it("returns default string when nothing found", () => {
    assert.equal(extractTitle({}), "蓝湖需求文档");
  });

  it("returns default string for null", () => {
    assert.equal(extractTitle(null), "蓝湖需求文档");
  });
});

// ─── extractTextContent ───────────────────────────────────────────────────────

describe("extractTextContent", () => {
  it("extracts content field", () => {
    const result = extractTextContent({ content: "这是需求内容" });
    assert.ok(result.includes("这是需求内容"));
  });

  it("converts HTML in content field", () => {
    const result = extractTextContent({ content: "<p>需求描述</p>" });
    assert.ok(result.includes("需求描述"));
    assert.ok(!result.includes("<p>"));
  });

  it("extracts description field", () => {
    const result = extractTextContent({ description: "接口描述" });
    assert.ok(result.includes("接口描述"));
  });

  it("returns empty string for empty object", () => {
    assert.equal(extractTextContent({}), "");
  });

  it("returns empty string for null", () => {
    assert.equal(extractTextContent(null), "");
  });
});

// ─── CLI Integration Tests ────────────────────────────────────────────────────

describe("CLI: --help", () => {
  it("prints usage and exits 0", () => {
    let stdout = "";
    let exitCode = 0;
    try {
      stdout = execSync(`npx tsx "${FETCH_TS}" --help`, {
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
    assert.ok(stdout.includes("--url") || stdout.includes("Usage"), "should show --url option");
  });
});

describe("CLI: missing LANHU_COOKIE", () => {
  it("exits 1 when LANHU_COOKIE is not set", () => {
    mkdirSync(TMP_DIR, { recursive: true });

    // Set LANHU_COOKIE to empty string so initEnv won't overwrite it from .env
    // (initEnv only sets process.env[key] if it's undefined, not if it's "")
    const filteredEnv = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([k]) => k !== "LANHU_COOKIE"),
      ),
      LANHU_COOKIE: "",
    };

    let exitCode = 0;
    let stderr = "";
    try {
      // Run from PROJECT_ROOT so relative .env resolution works,
      // but with LANHU_COOKIE stripped from env so initEnv finds nothing
      execSync(
        `npx tsx "${FETCH_TS}" --url "https://lanhuapp.com/web/#/item/project/product?tid=t&pid=p&docId=d" --output "${TMP_DIR}/out"`,
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
        `npx tsx "${FETCH_TS}" --url "https://example.com/not-lanhu" --output "${TMP_DIR}/out"`,
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
      stderr.includes("INVALID_URL") || stderr.includes("Invalid") || stderr.includes("Unsupported"),
      `stderr should mention invalid URL, got: ${stderr}`,
    );
  });

  it("exits 1 for URL missing required params", () => {
    mkdirSync(TMP_DIR, { recursive: true });

    let exitCode = 0;
    let stderr = "";
    try {
      execSync(
        `npx tsx "${FETCH_TS}" --url "https://lanhuapp.com/web/#/item/project/product?tid=only-tid" --output "${TMP_DIR}/out"`,
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
