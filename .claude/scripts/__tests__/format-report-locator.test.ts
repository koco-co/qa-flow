import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const FIXTURE_REPORT = join(
  import.meta.dirname,
  "fixtures/sample-format-report.json",
);
const FIXTURE_ARCHIVE = join(
  import.meta.dirname,
  "fixtures/sample-archive-with-issues.md",
);
const TMP_DIR = join(tmpdir(), `kata-format-locator-test-${process.pid}`);

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "kata-cli",
      ["format-report-locator", ...args],
      { cwd: REPO_ROOT, encoding: "utf8" },
    );
    return { stdout, stderr: "", code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      code: e.status ?? 1,
    };
  }
}

before(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

after(() => {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe("format-report-locator.ts locate — maps issues to line numbers", () => {
  it("exits with code 0 and outputs enriched JSON", () => {
    const outputPath = join(TMP_DIR, "enriched-report.json");
    const { code, stdout, stderr } = run([
      "locate",
      "--report", FIXTURE_REPORT,
      "--archive", FIXTURE_ARCHIVE,
      "--output", outputPath,
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as {
      total_issues: number;
      located: number;
      unlocated: number;
      output_path: string;
    };
    assert.equal(result.total_issues, 8);
    assert.ok(result.located > 0, "should locate at least some issues");
    assert.ok(result.output_path.endsWith("enriched-report.json"));
  });

  it("enriched JSON contains line numbers for located issues", () => {
    const outputPath = join(TMP_DIR, "enriched-report-2.json");
    run([
      "locate",
      "--report", FIXTURE_REPORT,
      "--archive", FIXTURE_ARCHIVE,
      "--output", outputPath,
    ]);

    const enriched = JSON.parse(readFileSync(outputPath, "utf8")) as {
      issues: Array<{ rule: string; location: { line: number } }>;
    };

    const fc02Issue = enriched.issues.find(
      (i) => i.rule === "FC02" && i.location.line > 0,
    );
    assert.ok(fc02Issue, "FC02 issue should have a located line number");
  });

  it("handles case title matching for title-level issues", () => {
    const outputPath = join(TMP_DIR, "enriched-report-3.json");
    run([
      "locate",
      "--report", FIXTURE_REPORT,
      "--archive", FIXTURE_ARCHIVE,
      "--output", outputPath,
    ]);

    const enriched = JSON.parse(readFileSync(outputPath, "utf8")) as {
      issues: Array<{ rule: string; case_title: string; location: { line: number } }>;
    };

    const fc01Issue = enriched.issues.find(
      (i) => i.rule === "FC01" && i.case_title === "验证新增功能",
    );
    assert.ok(fc01Issue, "FC01 issue for missing prefix should exist");
    assert.ok(fc01Issue.location.line > 0, "should have a positive line number");
  });
});

describe("format-report-locator.ts error handling", () => {
  it("exits with code 1 when report file is missing", () => {
    const { code, stderr } = run([
      "locate",
      "--report", "/nonexistent/report.json",
      "--archive", FIXTURE_ARCHIVE,
      "--output", join(TMP_DIR, "out.json"),
    ]);
    assert.equal(code, 1);
    assert.ok(stderr.includes("Failed to read"), "should report read error");
  });

  it("exits with code 1 when archive file is missing", () => {
    const { code, stderr } = run([
      "locate",
      "--report", FIXTURE_REPORT,
      "--archive", "/nonexistent/archive.md",
      "--output", join(TMP_DIR, "out.json"),
    ]);
    assert.equal(code, 1);
    assert.ok(stderr.includes("Failed to read"), "should report read error");
  });
});

describe("format-report-locator.ts print — terminal-readable report", () => {
  it("outputs formatted terminal report to stdout", () => {
    const { code, stdout } = run([
      "print",
      "--report", FIXTURE_REPORT,
      "--archive", FIXTURE_ARCHIVE,
    ]);
    assert.equal(code, 0);
    assert.match(stdout, /Format Check Report/, "should have report header");
    assert.match(stdout, /\[FC02\]/, "should reference FC02");
    assert.match(stdout, /:\d+/, "should have line number references");
    assert.match(stdout, /Summary/, "should have summary section");
  });
});
