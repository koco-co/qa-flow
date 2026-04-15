import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

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
    assert.equal(t1.last_error, null);
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

  it("updates last_error", () => {
    createTestSuite("update-error-suite");
    const { stdout, code } = run([
      "update",
      "--project", "dataAssets",
      "--suite", "update-error-suite",
      "--case", "t1",
      "--field", "last_error",
      "--value", "Timeout after 30s",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.cases.t1.last_error, "Timeout after 30s");
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
      "--case", "t1", "--field", "last_error", "--value", "Assertion failed",
    ]);

    const { stdout, code } = run([
      "resume", "--project", "dataAssets", "--suite", "resume-failed-suite",
      "--retry-failed",
    ]);
    assert.equal(code, 0);
    const progress = JSON.parse(stdout);
    assert.equal(progress.cases.t1.test_status, "pending");
    assert.equal(progress.cases.t1.attempts, 0);
    assert.equal(progress.cases.t1.last_error, null);
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
