/**
 * plugins/zentao/__tests__/fetch.test.ts
 *
 * Unit tests for zentao/fetch.ts.
 * No network calls — all tests use pure functions or CLI subprocess with controlled env.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { detectFixBranch, extractBugIdFromUrl } from "../fetch.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const FETCH_TS = resolve(__dirname, "../fetch.ts");
const PROJECT_ROOT = resolve(__dirname, "../../../");

const TMP_DIR = join(tmpdir(), `zentao-fetch-test-${process.pid}`);

afterEach(() => {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

// ─── extractBugIdFromUrl ──────────────────────────────────────────────────────

describe("extractBugIdFromUrl", () => {
  it("extracts bug ID from standard zentao bug URL", () => {
    const url = "http://zenpms.dtstack.cn/zentao/bug-view-138845.html";
    assert.equal(extractBugIdFromUrl(url), 138845);
  });

  it("extracts bug ID from URL without domain prefix", () => {
    assert.equal(extractBugIdFromUrl("/zentao/bug-view-999.html"), 999);
  });

  it("extracts bug ID from URL with extra query params", () => {
    const url = "http://zenpms.dtstack.cn/zentao/bug-view-12345.html?foo=bar";
    assert.equal(extractBugIdFromUrl(url), 12345);
  });

  it("returns null for URL without bug-view pattern", () => {
    assert.equal(extractBugIdFromUrl("http://zenpms.dtstack.cn/zentao/story-view-100.html"), null);
  });

  it("returns null for empty string", () => {
    assert.equal(extractBugIdFromUrl(""), null);
  });

  it("returns null for completely invalid input", () => {
    assert.equal(extractBugIdFromUrl("not-a-url"), null);
  });

  it("handles single-digit bug ID", () => {
    assert.equal(extractBugIdFromUrl("/zentao/bug-view-1.html"), 1);
  });

  it("handles large bug ID numbers", () => {
    assert.equal(extractBugIdFromUrl("/zentao/bug-view-9999999.html"), 9_999_999);
  });
});

// ─── detectFixBranch ─────────────────────────────────────────────────────────

describe("detectFixBranch", () => {
  it("detects hotfix_ pattern in resolvedBuild", () => {
    const branch = detectFixBranch(["hotfix_6.4.10_138845"]);
    assert.ok(branch?.startsWith("hotfix_"), `expected hotfix_, got: ${branch}`);
    assert.equal(branch, "hotfix_6.4.10_138845");
  });

  it("detects hotfix/ pattern (slash separator)", () => {
    const branch = detectFixBranch(["release/hotfix/v6.4.10"]);
    assert.ok(branch !== null, "should detect hotfix pattern");
  });

  it("detects hotfix in title string", () => {
    const branch = detectFixBranch([null, null, "修复分支: hotfix_6.4.11_bug123"]);
    assert.ok(branch?.includes("hotfix_"), `expected hotfix match, got: ${branch}`);
  });

  it("returns null when no branch info present", () => {
    assert.equal(detectFixBranch(["已修复", "已验证", "fix in next release"]), null);
  });

  it("returns null for empty array", () => {
    assert.equal(detectFixBranch([]), null);
  });

  it("returns null for array of nulls", () => {
    assert.equal(detectFixBranch([null, undefined, null]), null);
  });

  it("skips null entries and finds branch in later entry", () => {
    const branch = detectFixBranch([null, undefined, "hotfix_7.0.0_fix"]);
    assert.equal(branch, "hotfix_7.0.0_fix");
  });

  it("prefers first hotfix match found across candidates", () => {
    const branch = detectFixBranch(["hotfix_6.4.0_first", "hotfix_6.4.1_second"]);
    assert.equal(branch, "hotfix_6.4.0_first");
  });
});

// ─── CLI: --help ──────────────────────────────────────────────────────────────

describe("CLI: --help", () => {
  it("prints usage and exits 0", () => {
    let stdout = "";
    let exitCode = 0;
    try {
      stdout = execFileSync("npx", ["tsx", FETCH_TS, "--help"], {
        encoding: "utf8",
        cwd: PROJECT_ROOT,
        env: { ...process.env },
      });
    } catch (err) {
      const e = err as { status?: number; stdout?: string };
      exitCode = e.status ?? 1;
      stdout = e.stdout ?? "";
    }
    assert.equal(exitCode, 0, "should exit with code 0");
    assert.ok(
      stdout.includes("--bug-id") || stdout.includes("--url") || stdout.includes("Usage"),
      `should show options, got: ${stdout}`,
    );
  });
});

// ─── CLI: missing env vars ────────────────────────────────────────────────────

describe("CLI: missing env vars", () => {
  it("exits 1 when ZENTAO_BASE_URL, ZENTAO_ACCOUNT, ZENTAO_PASSWORD are all missing", () => {
    mkdirSync(TMP_DIR, { recursive: true });

    const strippedEnv = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          ([k]) =>
            k !== "ZENTAO_BASE_URL" && k !== "ZENTAO_ACCOUNT" && k !== "ZENTAO_PASSWORD",
        ),
      ),
      ZENTAO_BASE_URL: "",
      ZENTAO_ACCOUNT: "",
      ZENTAO_PASSWORD: "",
      // Point HOME away from real .env so initEnv won't load real credentials
    };

    let exitCode = 0;
    let stdout = "";
    try {
      execFileSync(
        "npx",
        ["tsx", FETCH_TS, "--bug-id", "138845", "--output", join(TMP_DIR, "out")],
        {
          encoding: "utf8",
          cwd: PROJECT_ROOT,
          env: strippedEnv,
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
    } catch (err) {
      const e = err as { status?: number; stdout?: string; stderr?: string };
      exitCode = e.status ?? 0;
      stdout = e.stdout ?? "";
    }

    assert.equal(exitCode, 1, "should exit with code 1");
    const parsed = JSON.parse(stdout) as { error: string; hint?: string };
    assert.ok(
      parsed.error.includes("ZENTAO_BASE_URL") ||
        parsed.error.includes("ZENTAO_ACCOUNT") ||
        parsed.error.includes("ZENTAO_PASSWORD") ||
        parsed.error.includes("缺少"),
      `should mention missing vars, got: ${parsed.error}`,
    );
  });
});

// ─── CLI: invalid bug ID ──────────────────────────────────────────────────────

describe("CLI: invalid bug ID format", () => {
  it("exits 1 for non-numeric --bug-id", () => {
    mkdirSync(TMP_DIR, { recursive: true });

    const strippedEnv = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          ([k]) =>
            k !== "ZENTAO_BASE_URL" && k !== "ZENTAO_ACCOUNT" && k !== "ZENTAO_PASSWORD",
        ),
      ),
      ZENTAO_BASE_URL: "",
      ZENTAO_ACCOUNT: "",
      ZENTAO_PASSWORD: "",
    };

    let exitCode = 0;
    let stdout = "";
    try {
      execFileSync(
        "npx",
        ["tsx", FETCH_TS, "--bug-id", "not-a-number", "--output", join(TMP_DIR, "out")],
        {
          encoding: "utf8",
          cwd: PROJECT_ROOT,
          env: strippedEnv,
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
    } catch (err) {
      const e = err as { status?: number; stdout?: string; stderr?: string };
      exitCode = e.status ?? 0;
      stdout = e.stdout ?? "";
    }

    assert.equal(exitCode, 1, "should exit with code 1");
    // Should output error about invalid bug ID before reaching env check
    const parsed = JSON.parse(stdout) as { error: string };
    assert.ok(
      parsed.error.includes("Bug ID") ||
        parsed.error.includes("格式") ||
        parsed.error.includes("整数"),
      `should mention invalid ID format, got: ${parsed.error}`,
    );
  });

  it("exits 1 for --url without bug-view pattern", () => {
    mkdirSync(TMP_DIR, { recursive: true });

    const strippedEnv = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          ([k]) =>
            k !== "ZENTAO_BASE_URL" && k !== "ZENTAO_ACCOUNT" && k !== "ZENTAO_PASSWORD",
        ),
      ),
      ZENTAO_BASE_URL: "",
      ZENTAO_ACCOUNT: "",
      ZENTAO_PASSWORD: "",
    };

    let exitCode = 0;
    let stdout = "";
    try {
      execFileSync(
        "npx",
        [
          "tsx",
          FETCH_TS,
          "--url",
          "http://zenpms.dtstack.cn/zentao/story-view-100.html",
          "--output",
          join(TMP_DIR, "out"),
        ],
        {
          encoding: "utf8",
          cwd: PROJECT_ROOT,
          env: strippedEnv,
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
    } catch (err) {
      const e = err as { status?: number; stdout?: string; stderr?: string };
      exitCode = e.status ?? 0;
      stdout = e.stdout ?? "";
    }

    assert.equal(exitCode, 1, "should exit with code 1");
    const parsed = JSON.parse(stdout) as { error: string };
    assert.ok(
      parsed.error.includes("Bug ID") || parsed.error.includes("bug-view"),
      `should mention URL format issue, got: ${parsed.error}`,
    );
  });
});
