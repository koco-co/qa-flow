import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import { asciiSlugify, slugify, uiBlocksDir } from "../ui-autotest-progress.ts";

const TMP_DIR = join(tmpdir(), `qa-flow-uap-test-${process.pid}`);
const SCRIPT = ".claude/scripts/ui-autotest-progress.ts";
const CWD = resolve(import.meta.dirname, "../../..");

function run(
  args: string[],
  extraEnv: Record<string, string> = {},
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync("bun", ["run", SCRIPT, ...args], {
      cwd: CWD,
      encoding: "utf8",
      env: { ...process.env, WORKSPACE_DIR: join(TMP_DIR, "workspace"), ...extraEnv },
    });
    return { stdout, stderr: "", code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", code: e.status ?? 1 };
  }
}

before(() => {
  mkdirSync(join(TMP_DIR, "workspace", "dataAssets", ".temp"), { recursive: true });
});

after(() => {
  try { rmSync(TMP_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
});

function createTestSuite(
  suite: string,
  cases: Record<string, { title: string; priority: string }> = { t1: { title: "c1", priority: "P0" } },
): void {
  run([
    "create", "--project", "dataAssets",
    "--suite", suite,
    "--archive", "test.md", "--url", "http://localhost",
    "--priorities", "P0", "--output-dir", "tests/",
    "--cases", JSON.stringify(cases),
  ]);
}

describe("ui-autotest-progress.ts --help", () => {
  it("shows help without error", () => {
    const { code } = run(["--help"]);
    assert.equal(code, 0);
  });
});

// ── create ─────────────────────────────────────────────────────────────────────

describe("create", () => {
  it("creates progress file and outputs valid JSON with correct structure", () => {
    const { stdout, code } = run([
      "create",
      "--project", "dataAssets",
      "--suite", "create-test-suite",
      "--archive", "archive/test.md",
      "--url", "http://localhost:3000",
      "--priorities", "P0,P1",
      "--output-dir", "tests/ui/",
      "--cases", JSON.stringify({ t1: { title: "Login test", priority: "P0" }, t2: { title: "Logout test", priority: "P1" } }),
    ]);

    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.version, 1);
    assert.equal(progress.suite_name, "create-test-suite");
    assert.equal(progress.archive_md, "archive/test.md");
    assert.equal(progress.url, "http://localhost:3000");
    assert.deepEqual(progress.selected_priorities, ["P0", "P1"]);
    assert.equal(progress.output_dir, "tests/ui/");
    assert.equal(progress.current_step, 4);
    assert.equal(progress.preconditions_ready, false);
    assert.equal(progress.merge_status, "pending");
    assert.ok(progress.started_at);
    assert.ok(progress.updated_at);
  });

  it("file exists on disk after create", () => {
    run([
      "create",
      "--project", "dataAssets",
      "--suite", "file-exists-suite",
      "--archive", "test.md",
      "--url", "http://localhost",
      "--cases", JSON.stringify({ t1: { title: "c1", priority: "P0" } }),
    ]);

    const filePath = join(TMP_DIR, "workspace", "dataAssets", ".temp", "ui-autotest-progress-file-exists-suite.json");
    assert.ok(existsSync(filePath), "progress file should exist on disk");
  });

  it("cases initialized correctly", () => {
    const { stdout, code } = run([
      "create",
      "--project", "dataAssets",
      "--suite", "cases-init-suite",
      "--archive", "test.md",
      "--url", "http://localhost",
      "--cases", JSON.stringify({
        t1: { title: "Case One", priority: "P0" },
        t2: { title: "Case Two", priority: "P1" },
      }),
    ]);

    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    const t1 = progress.cases.t1;
    assert.equal(t1.title, "Case One");
    assert.equal(t1.priority, "P0");
    assert.equal(t1.generated, false);
    assert.equal(t1.test_status, "pending");
    assert.equal(t1.attempts, 0);
    assert.deepEqual(t1.error_history, []);
    assert.equal(t1.script_path, null);

    const t2 = progress.cases.t2;
    assert.equal(t2.title, "Case Two");
    assert.equal(t2.priority, "P1");
  });
});

// ── update ─────────────────────────────────────────────────────────────────────

describe("update", () => {
  it("updates test_status to passed", () => {
    createTestSuite("update-status-suite");
    const { stdout, code } = run([
      "update",
      "--project", "dataAssets",
      "--suite", "update-status-suite",
      "--case", "t1",
      "--field", "test_status",
      "--value", "passed",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.cases.t1.test_status, "passed");
  });

  it("updates generated to true (boolean coercion)", () => {
    createTestSuite("update-generated-suite");
    const { stdout, code } = run([
      "update",
      "--project", "dataAssets",
      "--suite", "update-generated-suite",
      "--case", "t1",
      "--field", "generated",
      "--value", "true",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.cases.t1.generated, true);
  });

  it("updates script_path (string)", () => {
    createTestSuite("update-path-suite");
    const { stdout, code } = run([
      "update",
      "--project", "dataAssets",
      "--suite", "update-path-suite",
      "--case", "t1",
      "--field", "script_path",
      "--value", "tests/ui/t1.spec.ts",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.cases.t1.script_path, "tests/ui/t1.spec.ts");
  });

  it("increments attempts when test_status set to running (twice → attempts=2)", () => {
    createTestSuite("update-attempts-suite");
    // First running
    run([
      "update", "--project", "dataAssets", "--suite", "update-attempts-suite",
      "--case", "t1", "--field", "test_status", "--value", "running",
    ]);
    // Second running
    const { stdout, code } = run([
      "update", "--project", "dataAssets", "--suite", "update-attempts-suite",
      "--case", "t1", "--field", "test_status", "--value", "running",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.cases.t1.attempts, 2);
    assert.equal(progress.cases.t1.test_status, "running");
  });

  it("--error flag appends to error_history when status set to failed", () => {
    createTestSuite("update-error-suite");
    const { stdout, code } = run([
      "update",
      "--project", "dataAssets",
      "--suite", "update-error-suite",
      "--case", "t1",
      "--field", "test_status",
      "--value", "failed",
      "--error", "Timeout after 30s",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.cases.t1.error_history.length, 1);
    assert.equal(progress.cases.t1.error_history[0].message, "Timeout after 30s");
    assert.ok(progress.cases.t1.error_history[0].at, "at should be an ISO date string");
  });

  it("updates top-level current_step (number coercion)", () => {
    createTestSuite("update-step-suite");
    const { stdout, code } = run([
      "update",
      "--project", "dataAssets",
      "--suite", "update-step-suite",
      "--field", "current_step",
      "--value", "6",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.current_step, 6);
  });

  it("updates top-level preconditions_ready (boolean coercion)", () => {
    createTestSuite("update-precond-suite");
    const { stdout, code } = run([
      "update",
      "--project", "dataAssets",
      "--suite", "update-precond-suite",
      "--field", "preconditions_ready",
      "--value", "true",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.preconditions_ready, true);
  });

  it("updates top-level merge_status", () => {
    createTestSuite("update-merge-suite");
    const { stdout, code } = run([
      "update",
      "--project", "dataAssets",
      "--suite", "update-merge-suite",
      "--field", "merge_status",
      "--value", "completed",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.merge_status, "completed");
  });

  it("refreshes updated_at", () => {
    createTestSuite("update-time-suite");
    // Read original updated_at
    const { stdout: readOut } = run([
      "read", "--project", "dataAssets", "--suite", "update-time-suite",
    ]);
    const original = JSON.parse(readOut).updated_at;

    // Small sleep to ensure timestamp differs
    Bun.sleepSync(10);

    const { stdout, code } = run([
      "update", "--project", "dataAssets", "--suite", "update-time-suite",
      "--field", "current_step", "--value", "5",
    ]);
    assert.equal(code, 0);
    const updated = JSON.parse(stdout).updated_at;
    assert.notEqual(updated, original);
  });

  it("exits 1 when progress not found", () => {
    const { code } = run([
      "update",
      "--project", "dataAssets",
      "--suite", "nonexistent-suite-xyz",
      "--field", "current_step",
      "--value", "5",
    ]);
    assert.equal(code, 1);
  });

  it("exits 1 when case not found", () => {
    createTestSuite("update-nocase-suite");
    const { code } = run([
      "update",
      "--project", "dataAssets",
      "--suite", "update-nocase-suite",
      "--case", "nonexistent-case",
      "--field", "test_status",
      "--value", "passed",
    ]);
    assert.equal(code, 1);
  });
});

// ── read ───────────────────────────────────────────────────────────────────────

describe("read", () => {
  it("returns progress JSON", () => {
    createTestSuite("read-test-suite");
    const { stdout, code } = run([
      "read", "--project", "dataAssets", "--suite", "read-test-suite",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.suite_name, "read-test-suite");
    assert.equal(progress.version, 1);
  });

  it("exits 1 when not found", () => {
    const { code } = run([
      "read", "--project", "dataAssets", "--suite", "nonexistent-read-suite",
    ]);
    assert.equal(code, 1);
  });
});

// ── summary ────────────────────────────────────────────────────────────────────

describe("summary", () => {
  it("returns correct counts (3 cases, 1 passed, 1 failed)", () => {
    createTestSuite("summary-counts-suite", {
      t1: { title: "Case 1", priority: "P0" },
      t2: { title: "Case 2", priority: "P0" },
      t3: { title: "Case 3", priority: "P1" },
    });

    run([
      "update", "--project", "dataAssets", "--suite", "summary-counts-suite",
      "--case", "t1", "--field", "test_status", "--value", "passed",
    ]);
    run([
      "update", "--project", "dataAssets", "--suite", "summary-counts-suite",
      "--case", "t2", "--field", "test_status", "--value", "failed",
    ]);

    const { stdout, code } = run([
      "summary", "--project", "dataAssets", "--suite", "summary-counts-suite",
    ]);
    assert.equal(code, 0);
    const summary = JSON.parse(stdout);
    assert.equal(summary.suite_name, "summary-counts-suite");
    assert.equal(summary.total, 3);
    assert.equal(summary.passed, 1);
    assert.equal(summary.failed, 1);
    assert.equal(summary.pending, 1);
    assert.equal(summary.running, 0);
    assert.equal(summary.generated, 0);
    assert.equal(summary.expired, false);
  });

  it("detects expired progress (old updated_at → expired=true)", () => {
    createTestSuite("summary-expired-suite");

    // Read current progress and write it back with an old updated_at
    const { stdout: readOut } = run([
      "read", "--project", "dataAssets", "--suite", "summary-expired-suite",
    ]);
    const progress = JSON.parse(readOut);
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const oldProgress = { ...progress, updated_at: oldDate };

    const filePath = join(TMP_DIR, "workspace", "dataAssets", ".temp", "ui-autotest-progress-summary-expired-suite.json");
    writeFileSync(filePath, `${JSON.stringify(oldProgress, null, 2)}\n`, "utf8");

    const { stdout, code } = run([
      "summary", "--project", "dataAssets", "--suite", "summary-expired-suite",
    ]);
    assert.equal(code, 0);
    const summary = JSON.parse(stdout);
    assert.equal(summary.expired, true);
  });

  it("exits 1 when not found", () => {
    const { code } = run([
      "summary", "--project", "dataAssets", "--suite", "nonexistent-summary-suite",
    ]);
    assert.equal(code, 1);
  });
});

// ── reset ──────────────────────────────────────────────────────────────────────

describe("reset", () => {
  it("deletes file; subsequent read returns exit 1", () => {
    createTestSuite("reset-delete-suite");

    const { stdout, code } = run([
      "reset", "--project", "dataAssets", "--suite", "reset-delete-suite",
    ]);
    assert.equal(code, 0);
    const result = JSON.parse(stdout);
    assert.equal(result.reset, true);
    assert.ok(result.path);

    // Now read should fail
    const { code: readCode } = run([
      "read", "--project", "dataAssets", "--suite", "reset-delete-suite",
    ]);
    assert.equal(readCode, 1);
  });

  it("succeeds even if file does not exist", () => {
    const { stdout, code } = run([
      "reset", "--project", "dataAssets", "--suite", "nonexistent-reset-suite",
    ]);
    assert.equal(code, 0);
    const result = JSON.parse(stdout);
    assert.equal(result.reset, true);
  });
});

// ── resume ─────────────────────────────────────────────────────────────────────

describe("resume", () => {
  it("resets running cases to pending", () => {
    createTestSuite("resume-running-suite");
    run([
      "update", "--project", "dataAssets", "--suite", "resume-running-suite",
      "--case", "t1", "--field", "test_status", "--value", "running",
    ]);

    const { stdout, code } = run([
      "resume", "--project", "dataAssets", "--suite", "resume-running-suite",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.cases.t1.test_status, "pending");
  });

  it("with --retry-failed: resets failed to pending, clears attempts", () => {
    createTestSuite("resume-failed-suite");
    // Set running to increment attempts once
    run([
      "update", "--project", "dataAssets", "--suite", "resume-failed-suite",
      "--case", "t1", "--field", "test_status", "--value", "running",
    ]);
    // Now set to failed
    run([
      "update", "--project", "dataAssets", "--suite", "resume-failed-suite",
      "--case", "t1", "--field", "test_status", "--value", "failed",
    ]);
    run([
      "update", "--project", "dataAssets", "--suite", "resume-failed-suite",
      "--case", "t1", "--field", "test_status", "--value", "failed", "--error", "Assertion failed",
    ]);

    const { stdout, code } = run([
      "resume", "--project", "dataAssets", "--suite", "resume-failed-suite",
      "--retry-failed",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.cases.t1.test_status, "pending");
    assert.equal(progress.cases.t1.attempts, 0);
    assert.deepEqual(progress.cases.t1.error_history, []);
  });

  it("validates script_path, resets generated if file missing", () => {
    createTestSuite("resume-scriptpath-suite");
    // Mark as generated with a nonexistent path
    run([
      "update", "--project", "dataAssets", "--suite", "resume-scriptpath-suite",
      "--case", "t1", "--field", "generated", "--value", "true",
    ]);
    run([
      "update", "--project", "dataAssets", "--suite", "resume-scriptpath-suite",
      "--case", "t1", "--field", "script_path", "--value", "/nonexistent/path/t1.spec.ts",
    ]);

    const { stdout, code } = run([
      "resume", "--project", "dataAssets", "--suite", "resume-scriptpath-suite",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.cases.t1.generated, false);
    assert.equal(progress.cases.t1.script_path, null);
  });

  it("persists to disk (read after resume shows sanitized state)", () => {
    createTestSuite("resume-persist-suite");
    run([
      "update", "--project", "dataAssets", "--suite", "resume-persist-suite",
      "--case", "t1", "--field", "test_status", "--value", "running",
    ]);

    run([
      "resume", "--project", "dataAssets", "--suite", "resume-persist-suite",
    ]);

    const { stdout, code } = run([
      "read", "--project", "dataAssets", "--suite", "resume-persist-suite",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.cases.t1.test_status, "pending");
  });

  it("exits 1 when not found", () => {
    const { code } = run([
      "resume", "--project", "dataAssets", "--suite", "nonexistent-resume-suite",
    ]);
    assert.equal(code, 1);
  });
});

// ── cached_parse_result and source_mtime ──────────────────────────────────────

describe("cached_parse_result and source_mtime", () => {
  it("update top-level field source_mtime is stored and returned by read", () => {
    createTestSuite("cache-mtime-store-suite");
    const { stdout, code } = run([
      "update",
      "--project", "dataAssets",
      "--suite", "cache-mtime-store-suite",
      "--field", "source_mtime",
      "--value", "2024-06-01T00:00:00.000Z",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.source_mtime, "2024-06-01T00:00:00.000Z");
  });

  it("resume clears cached_parse_result when source_mtime differs from archive file mtime", () => {
    // Create a real archive file so statSync works
    const archiveDir = join(TMP_DIR, "workspace", "dataAssets", "archive");
    mkdirSync(archiveDir, { recursive: true });
    const archivePath = join(archiveDir, "test-cache-clear.md");
    writeFileSync(archivePath, "# Archive\n", "utf8");

    run([
      "create",
      "--project", "dataAssets",
      "--suite", "cache-clear-suite",
      "--archive", archivePath,
      "--url", "http://localhost",
      "--priorities", "P0",
      "--output-dir", "tests/",
      "--cases", JSON.stringify({ t1: { title: "c1", priority: "P0" } }),
    ]);

    // Set a stale source_mtime (different from actual file mtime)
    run([
      "update",
      "--project", "dataAssets",
      "--suite", "cache-clear-suite",
      "--field", "source_mtime",
      "--value", "2000-01-01T00:00:00.000Z",
    ]);

    // Touch the archive file to get a newer mtime (ensure mismatch)
    const newTime = new Date(Date.now() + 5000);
    utimesSync(archivePath, newTime, newTime);

    // Resume should detect mtime mismatch and clear cached_parse_result
    const { stdout, code } = run([
      "resume",
      "--project", "dataAssets",
      "--suite", "cache-clear-suite",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    // cached_parse_result should be cleared (undefined/absent)
    assert.equal(progress.cached_parse_result, undefined);
  });

  it("resume preserves cached_parse_result when source_mtime matches archive file mtime", () => {
    // Create a real archive file
    const archiveDir = join(TMP_DIR, "workspace", "dataAssets", "archive");
    mkdirSync(archiveDir, { recursive: true });
    const archivePath = join(archiveDir, "test-cache-preserve.md");
    writeFileSync(archivePath, "# Archive\n", "utf8");

    // Capture the actual mtime
    const { statSync: nodeStat } = require("node:fs");
    const { mtime } = nodeStat(archivePath);
    const actualMtime = mtime.toISOString();

    run([
      "create",
      "--project", "dataAssets",
      "--suite", "cache-preserve-suite",
      "--archive", archivePath,
      "--url", "http://localhost",
      "--priorities", "P0",
      "--output-dir", "tests/",
      "--cases", JSON.stringify({ t1: { title: "c1", priority: "P0" } }),
    ]);

    // Set source_mtime to match the actual file mtime, and set cached_parse_result
    run([
      "update",
      "--project", "dataAssets",
      "--suite", "cache-preserve-suite",
      "--field", "source_mtime",
      "--value", actualMtime,
    ]);

    // Directly write cached_parse_result by reading and rewriting the file
    const progressFilePath = join(
      TMP_DIR, "workspace", "dataAssets", ".temp",
      "ui-autotest-progress-cache-preserve-suite.json",
    );
    const existing = JSON.parse(require("node:fs").readFileSync(progressFilePath, "utf8"));
    const withCache = { ...existing, cached_parse_result: { tasks: ["t1"] } };
    writeFileSync(progressFilePath, `${JSON.stringify(withCache, null, 2)}\n`, "utf8");

    // Resume should see matching mtime and preserve cached_parse_result
    const { stdout, code } = run([
      "resume",
      "--project", "dataAssets",
      "--suite", "cache-preserve-suite",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    // cached_parse_result should still be present
    assert.deepEqual(progress.cached_parse_result, { tasks: ["t1"] });
  });
});

// ── env isolation ─────────────────────────────────────────────────────────────

describe("env isolation", () => {
  it("create with --env produces env-scoped progress file", () => {
    const { stdout, code } = run([
      "create",
      "--project", "dataAssets",
      "--suite", "env-scoped-suite",
      "--archive", "test.md",
      "--url", "http://localhost",
      "--env", "ci63",
      "--cases", JSON.stringify({ t1: { title: "c1", priority: "P0" } }),
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.env, "ci63");

    const filePath = join(
      TMP_DIR, "workspace", "dataAssets", ".temp",
      "ui-autotest-progress-env-scoped-suite-ci63.json",
    );
    assert.ok(existsSync(filePath), "env-scoped progress file should exist");
  });

  it("same suite different env produces separate files", () => {
    run([
      "create", "--project", "dataAssets", "--suite", "multi-env-suite",
      "--archive", "test.md", "--url", "http://ci63",
      "--env", "ci63",
      "--cases", JSON.stringify({ t1: { title: "c1", priority: "P0" } }),
    ]);
    run([
      "create", "--project", "dataAssets", "--suite", "multi-env-suite",
      "--archive", "test.md", "--url", "http://ltqcdev",
      "--env", "ltqcdev",
      "--cases", JSON.stringify({ t1: { title: "c1", priority: "P0" } }),
    ]);

    const ci63Path = join(
      TMP_DIR, "workspace", "dataAssets", ".temp",
      "ui-autotest-progress-multi-env-suite-ci63.json",
    );
    const ltqcdevPath = join(
      TMP_DIR, "workspace", "dataAssets", ".temp",
      "ui-autotest-progress-multi-env-suite-ltqcdev.json",
    );
    assert.ok(existsSync(ci63Path));
    assert.ok(existsSync(ltqcdevPath));

    const { stdout: ci63Out } = run([
      "read", "--project", "dataAssets", "--suite", "multi-env-suite", "--env", "ci63",
    ]);
    const { stdout: ltqcdevOut } = run([
      "read", "--project", "dataAssets", "--suite", "multi-env-suite", "--env", "ltqcdev",
    ]);
    assert.equal(JSON.parse(ci63Out).url, "http://ci63");
    assert.equal(JSON.parse(ltqcdevOut).url, "http://ltqcdev");
  });

  it("commands without --env still work (backward compat)", () => {
    // Use the existing createTestSuite helper (no --env)
    createTestSuite("no-env-compat-suite");
    const { stdout, code } = run([
      "read", "--project", "dataAssets", "--suite", "no-env-compat-suite",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.env, undefined);
  });

  it("summary includes env field when set", () => {
    run([
      "create", "--project", "dataAssets", "--suite", "env-summary-suite",
      "--archive", "test.md", "--url", "http://localhost",
      "--env", "ci78",
      "--cases", JSON.stringify({ t1: { title: "c1", priority: "P0" } }),
    ]);

    const { stdout, code } = run([
      "summary", "--project", "dataAssets", "--suite", "env-summary-suite", "--env", "ci78",
    ]);
    assert.equal(code, 0);
    const summary = JSON.parse(stdout);
    assert.equal(summary.env, "ci78");
  });

  it("update with --env targets correct file", () => {
    run([
      "create", "--project", "dataAssets", "--suite", "env-update-suite",
      "--archive", "test.md", "--url", "http://localhost",
      "--env", "ci63",
      "--cases", JSON.stringify({ t1: { title: "c1", priority: "P0" } }),
    ]);

    const { stdout, code } = run([
      "update", "--project", "dataAssets", "--suite", "env-update-suite",
      "--env", "ci63",
      "--case", "t1", "--field", "test_status", "--value", "passed",
    ]);
    assert.equal(code, 0);
    assert.equal(JSON.parse(stdout).cases.t1.test_status, "passed");
  });

  it("reset with --env only deletes env-specific file", () => {
    run([
      "create", "--project", "dataAssets", "--suite", "env-reset-suite",
      "--archive", "test.md", "--url", "http://ci63",
      "--env", "ci63",
      "--cases", JSON.stringify({ t1: { title: "c1", priority: "P0" } }),
    ]);
    run([
      "create", "--project", "dataAssets", "--suite", "env-reset-suite",
      "--archive", "test.md", "--url", "http://ltqcdev",
      "--env", "ltqcdev",
      "--cases", JSON.stringify({ t1: { title: "c1", priority: "P0" } }),
    ]);

    // Reset ci63 only
    run(["reset", "--project", "dataAssets", "--suite", "env-reset-suite", "--env", "ci63"]);

    // ci63 should be gone
    const { code: ci63Code } = run([
      "read", "--project", "dataAssets", "--suite", "env-reset-suite", "--env", "ci63",
    ]);
    assert.equal(ci63Code, 1);

    // ltqcdev should still exist
    const { code: ltqcdevCode } = run([
      "read", "--project", "dataAssets", "--suite", "env-reset-suite", "--env", "ltqcdev",
    ]);
    assert.equal(ltqcdevCode, 0);
  });

  it("resume with --env targets correct file", () => {
    run([
      "create", "--project", "dataAssets", "--suite", "env-resume-suite",
      "--archive", "test.md", "--url", "http://localhost",
      "--env", "ci63",
      "--cases", JSON.stringify({ t1: { title: "c1", priority: "P0" } }),
    ]);
    run([
      "update", "--project", "dataAssets", "--suite", "env-resume-suite",
      "--env", "ci63",
      "--case", "t1", "--field", "test_status", "--value", "running",
    ]);

    const { stdout, code } = run([
      "resume", "--project", "dataAssets", "--suite", "env-resume-suite", "--env", "ci63",
    ]);
    assert.equal(code, 0);
    assert.equal(JSON.parse(stdout).cases.t1.test_status, "pending");
  });
});

// ── error_history ─────────────────────────────────────────────────────────────

describe("error_history", () => {
  it("create initializes error_history as [] for each case", () => {
    const { stdout, code } = run([
      "create",
      "--project", "dataAssets",
      "--suite", "error-history-init-suite",
      "--archive", "test.md",
      "--url", "http://localhost",
      "--cases", JSON.stringify({ t1: { title: "c1", priority: "P0" }, t2: { title: "c2", priority: "P1" } }),
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.deepEqual(progress.cases.t1.error_history, []);
    assert.deepEqual(progress.cases.t2.error_history, []);
  });

  it("update --error appends one entry with at and message", () => {
    createTestSuite("error-history-append-suite");
    const { stdout, code } = run([
      "update",
      "--project", "dataAssets",
      "--suite", "error-history-append-suite",
      "--case", "t1",
      "--field", "test_status",
      "--value", "failed",
      "--error", "Element not found",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    const history = progress.cases.t1.error_history;
    assert.equal(history.length, 1);
    assert.equal(history[0].message, "Element not found");
    assert.ok(history[0].at, "at should be present");
    // Verify at is a valid ISO date string
    assert.ok(!Number.isNaN(Date.parse(history[0].at)), "at should be a valid ISO date");
  });

  it("two sequential failed updates append two entries in order", () => {
    createTestSuite("error-history-two-entries-suite");
    run([
      "update",
      "--project", "dataAssets",
      "--suite", "error-history-two-entries-suite",
      "--case", "t1",
      "--field", "test_status",
      "--value", "failed",
      "--error", "First failure",
    ]);
    const { stdout, code } = run([
      "update",
      "--project", "dataAssets",
      "--suite", "error-history-two-entries-suite",
      "--case", "t1",
      "--field", "test_status",
      "--value", "failed",
      "--error", "Second failure",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    const history = progress.cases.t1.error_history;
    assert.equal(history.length, 2);
    assert.equal(history[0].message, "First failure");
    assert.equal(history[1].message, "Second failure");
  });

  it("update to passed does NOT mutate error_history", () => {
    createTestSuite("error-history-passed-suite");
    // First add a failure
    run([
      "update",
      "--project", "dataAssets",
      "--suite", "error-history-passed-suite",
      "--case", "t1",
      "--field", "test_status",
      "--value", "failed",
      "--error", "Initial failure",
    ]);
    // Then update to passed
    const { stdout, code } = run([
      "update",
      "--project", "dataAssets",
      "--suite", "error-history-passed-suite",
      "--case", "t1",
      "--field", "test_status",
      "--value", "passed",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    // error_history should still have the original entry
    assert.equal(progress.cases.t1.error_history.length, 1);
    assert.equal(progress.cases.t1.error_history[0].message, "Initial failure");
    assert.equal(progress.cases.t1.test_status, "passed");
  });

  it("migration: legacy last_error is converted to error_history on read", () => {
    const suiteName = "error-history-migration-suite";
    // Manually write a legacy progress file with last_error
    const filePath = join(
      TMP_DIR, "workspace", "dataAssets", ".temp",
      `ui-autotest-progress-${slugify(suiteName)}.json`,
    );
    const legacyProgress = {
      version: 1,
      suite_name: suiteName,
      archive_md: "test.md",
      url: "http://localhost",
      selected_priorities: ["P0"],
      output_dir: "tests/",
      started_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-02T00:00:00.000Z",
      current_step: 4,
      preconditions_ready: false,
      cases: {
        t1: {
          title: "c1",
          priority: "P0",
          generated: false,
          script_path: null,
          test_status: "failed",
          attempts: 1,
          last_error: "Old error from legacy format",
        },
      },
      merge_status: "pending",
    };
    writeFileSync(filePath, `${JSON.stringify(legacyProgress, null, 2)}\n`, "utf8");

    const { stdout, code } = run([
      "read", "--project", "dataAssets", "--suite", suiteName,
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    // Should have error_history migrated from last_error
    assert.equal(progress.cases.t1.error_history.length, 1);
    assert.equal(progress.cases.t1.error_history[0].message, "Old error from legacy format");
    assert.equal(progress.cases.t1.error_history[0].at, "2024-01-02T00:00:00.000Z");
    // last_error should be stripped
    assert.equal(progress.cases.t1.last_error, undefined);
  });

  it("migration: legacy last_error=null produces empty error_history", () => {
    const suiteName = "error-history-migration-null-suite";
    const filePath = join(
      TMP_DIR, "workspace", "dataAssets", ".temp",
      `ui-autotest-progress-${slugify(suiteName)}.json`,
    );
    const legacyProgress = {
      version: 1,
      suite_name: suiteName,
      archive_md: "test.md",
      url: "http://localhost",
      selected_priorities: ["P0"],
      output_dir: "tests/",
      started_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-02T00:00:00.000Z",
      current_step: 4,
      preconditions_ready: false,
      cases: {
        t1: {
          title: "c1",
          priority: "P0",
          generated: false,
          script_path: null,
          test_status: "pending",
          attempts: 0,
          last_error: null,
        },
      },
      merge_status: "pending",
    };
    writeFileSync(filePath, `${JSON.stringify(legacyProgress, null, 2)}\n`, "utf8");

    const { stdout, code } = run([
      "read", "--project", "dataAssets", "--suite", suiteName,
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.deepEqual(progress.cases.t1.error_history, []);
    assert.equal(progress.cases.t1.last_error, undefined);
  });

  it("resume --retry-failed resets error_history to []", () => {
    createTestSuite("error-history-resume-suite");
    run([
      "update", "--project", "dataAssets", "--suite", "error-history-resume-suite",
      "--case", "t1", "--field", "test_status", "--value", "failed",
      "--error", "Failure before retry",
    ]);

    const { stdout, code } = run([
      "resume", "--project", "dataAssets", "--suite", "error-history-resume-suite",
      "--retry-failed",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.cases.t1.test_status, "pending");
    assert.deepEqual(progress.cases.t1.error_history, []);
  });
});

// ── update: reject structured-field direct writes ─────────────────────────────

describe("update: reject direct writes to structured fields", () => {
  it("exits non-zero with stderr when --field last_error is used", () => {
    createTestSuite("reject-last-error-suite");
    const { code, stderr } = run([
      "update",
      "--project", "dataAssets",
      "--suite", "reject-last-error-suite",
      "--case", "t1",
      "--field", "last_error",
      "--value", "some error",
    ]);
    assert.equal(code, 1);
    assert.ok(
      stderr.includes("last_error") && stderr.includes("cannot be set directly"),
      `expected "last_error cannot be set directly" in stderr, got: ${stderr}`,
    );
  });

  it("exits non-zero with stderr when --field error_history is used", () => {
    createTestSuite("reject-error-history-suite");
    const { code, stderr } = run([
      "update",
      "--project", "dataAssets",
      "--suite", "reject-error-history-suite",
      "--case", "t1",
      "--field", "error_history",
      "--value", "[]",
    ]);
    assert.equal(code, 1);
    assert.ok(
      stderr.includes("error_history") && stderr.includes("cannot be set directly"),
      `expected "error_history cannot be set directly" in stderr, got: ${stderr}`,
    );
  });
});

// ── migration: strip last_error even when error_history already exists ─────────

describe("migration: strip last_error when error_history already exists", () => {
  it("strips last_error but preserves existing error_history when both are present", () => {
    const suiteName = "migration-both-fields-suite";
    const filePath = join(
      TMP_DIR, "workspace", "dataAssets", ".temp",
      `ui-autotest-progress-${slugify(suiteName)}.json`,
    );
    const legacyProgress = {
      version: 1,
      suite_name: suiteName,
      archive_md: "test.md",
      url: "http://localhost",
      selected_priorities: ["P0"],
      output_dir: "tests/",
      started_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-02T00:00:00.000Z",
      current_step: 4,
      preconditions_ready: false,
      cases: {
        t1: {
          title: "c1",
          priority: "P0",
          generated: false,
          script_path: null,
          test_status: "failed",
          attempts: 2,
          // Both fields present — legacy leak scenario
          last_error: "foo",
          error_history: [{ at: "2024-01-02T00:00:00.000Z", message: "bar" }],
        },
      },
      merge_status: "pending",
    };
    writeFileSync(filePath, `${JSON.stringify(legacyProgress, null, 2)}\n`, "utf8");

    const { stdout, code } = run([
      "read", "--project", "dataAssets", "--suite", suiteName,
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    // error_history must be preserved exactly as written
    assert.deepEqual(
      progress.cases.t1.error_history,
      [{ at: "2024-01-02T00:00:00.000Z", message: "bar" }],
    );
    // last_error must be stripped entirely
    assert.equal(
      progress.cases.t1.last_error,
      undefined,
      "last_error should be stripped even when error_history already exists",
    );
  });
});

// ── slugify ───────────────────────────────────────────────────────────────────

describe("slugify()", () => {
  it("replaces special chars and collapses dashes", () => {
    assert.equal(slugify("【通用配置】json格式配置(#15696)"), "通用配置-json格式配置-15696");
  });

  it("handles plain ASCII with spaces and parens", () => {
    assert.equal(slugify("Abc (Def) #123"), "Abc-Def-123");
  });

  it("trims leading and trailing dashes", () => {
    assert.equal(slugify("(leading)"), "leading");
  });
});

// ── asciiSlugify ──────────────────────────────────────────────────────────────

describe("asciiSlugify()", () => {
  it("strips CJK characters and collapses dashes", () => {
    assert.equal(asciiSlugify("【通用】中文-xyz(#999)"), "xyz-999");
  });

  it("handles pure ASCII the same as slugify for ASCII input", () => {
    assert.equal(asciiSlugify("Abc (Def) #123"), "Abc-Def-123");
  });

  it("trims leading and trailing dashes", () => {
    assert.equal(asciiSlugify("(leading)"), "leading");
  });

  it("produces only ASCII characters", () => {
    const result = asciiSlugify("【通用配置】json格式配置(#15696)");
    assert.ok(/^[\x00-\x7f]+$/.test(result), `expected ASCII-only result, got: ${result}`);
    assert.equal(result, "json-15696");
  });
});

// ── slug alias file ───────────────────────────────────────────────────────────

describe("slug alias file", () => {
  it("writes a shell-safe ASCII alias alongside cjk progress file", () => {
    const project = "dataAssets";
    const suite = "【通用】中文-xyz(#999)";
    run(["create", "--project", project, "--suite", suite,
         "--archive", "a.md", "--url", "http://x",
         "--cases", JSON.stringify({ t1: { title: "c1", priority: "P0" } })]);
    // primary path uses slugify (keeps CJK)
    const primary = join(TMP_DIR, "workspace", "dataAssets", ".temp",
      `ui-autotest-progress-${slugify(suite)}.json`);
    const aliasPath = join(TMP_DIR, "workspace", "dataAssets", ".temp",
      `ui-autotest-progress-alias-${asciiSlugify(suite)}.json`);
    assert.ok(existsSync(aliasPath), `alias should exist at: ${aliasPath}`);
    // alias path must be ASCII-only (the path segment we control)
    const aliasFilename = `ui-autotest-progress-alias-${asciiSlugify(suite)}.json`;
    assert.ok(/^[\x00-\x7f]+$/.test(aliasFilename), "alias filename must be ASCII");
    // content identical
    const a = JSON.parse(readFileSync(aliasPath, "utf8"));
    const p = JSON.parse(readFileSync(primary, "utf8"));
    assert.deepEqual(a, p);
  });

  it("also writes alias for ASCII-only suite name (different prefix guarantees distinct path)", () => {
    const suite = "ascii-only-suite";
    run(["create", "--project", "dataAssets", "--suite", suite,
         "--archive", "a.md", "--url", "http://x",
         "--cases", JSON.stringify({ t1: { title: "c1", priority: "P0" } })]);
    const primary = join(TMP_DIR, "workspace", "dataAssets", ".temp",
      `ui-autotest-progress-${slugify(suite)}.json`);
    const alias = join(TMP_DIR, "workspace", "dataAssets", ".temp",
      `ui-autotest-progress-alias-${asciiSlugify(suite)}.json`);
    // Both files should exist (different prefix means different path)
    assert.equal(existsSync(primary), true);
    assert.equal(existsSync(alias), true);
    // Contents should be equal
    const a = JSON.parse(readFileSync(alias, "utf8"));
    const p = JSON.parse(readFileSync(primary, "utf8"));
    assert.deepEqual(a, p);
  });

  it("reset also removes the alias file", () => {
    const suite = "reset-alias-suite";
    run(["create", "--project", "dataAssets", "--suite", suite,
         "--archive", "a.md", "--url", "http://x",
         "--cases", JSON.stringify({ t1: { title: "c1", priority: "P0" } })]);
    const alias = join(TMP_DIR, "workspace", "dataAssets", ".temp",
      `ui-autotest-progress-alias-${asciiSlugify(suite)}.json`);
    assert.ok(existsSync(alias), "alias should exist before reset");

    run(["reset", "--project", "dataAssets", "--suite", suite]);
    assert.equal(existsSync(alias), false, "alias should be removed after reset");
  });
});

// ── suite-slug command ────────────────────────────────────────────────────────

describe("suite-slug command", () => {
  it("prints slug only (no newline, no extra output)", () => {
    const { stdout, code } = run(["suite-slug", "--suite", "【X】a b"]);
    assert.equal(code, 0);
    assert.equal(stdout, "X-a-b");
  });

  it("slug matches the slug embedded in progressFilePath", () => {
    const suite = "【通用】中文-xyz(#999)";
    const { stdout } = run(["suite-slug", "--suite", suite]);
    assert.equal(stdout, slugify(suite));
  });
});

// ── uiBlocksDir() ─────────────────────────────────────────────────────────────

describe("uiBlocksDir()", () => {
  let savedWorkspaceDir: string | undefined;

  before(() => {
    savedWorkspaceDir = process.env.WORKSPACE_DIR;
    process.env.WORKSPACE_DIR = join(TMP_DIR, "workspace");
  });

  after(() => {
    if (savedWorkspaceDir === undefined) delete process.env.WORKSPACE_DIR;
    else process.env.WORKSPACE_DIR = savedWorkspaceDir;
  });

  it("returns {tempDir}/ui-blocks/{slug} for given project+suite", () => {
    const result = uiBlocksDir("dataAssets", "【通用配置】json格式配置(#15696)");
    assert.match(result, /\/workspace\/dataAssets\/\.temp\/ui-blocks\/通用配置-json格式配置-15696$/);
  });

  it("slugifies identical to progressFilePath", () => {
    const blocksDir = uiBlocksDir("dataAssets", "Abc (Def) #123");
    assert.ok(blocksDir.endsWith("/ui-blocks/Abc-Def-123"));
  });
});
