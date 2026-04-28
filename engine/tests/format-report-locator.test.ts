import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, it, expect } from "bun:test";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
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

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as {
      total_issues: number;
      located: number;
      unlocated: number;
      output_path: string;
    };
    expect(result.total_issues).toBe(8);
    expect(result.located > 0).toBeTruthy();
    expect(result.output_path.endsWith("enriched-report.json")).toBeTruthy();
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
    expect(fc02Issue).toBeTruthy();
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
    expect(fc01Issue).toBeTruthy();
    expect(fc01Issue.location.line > 0).toBeTruthy();
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
    expect(code).toBe(1);
    expect(stderr.includes("Failed to read").toBeTruthy(), "should report read error");
  });

  it("exits with code 1 when archive file is missing", () => {
    const { code, stderr } = run([
      "locate",
      "--report", FIXTURE_REPORT,
      "--archive", "/nonexistent/archive.md",
      "--output", join(TMP_DIR, "out.json"),
    ]);
    expect(code).toBe(1);
    expect(stderr.includes("Failed to read").toBeTruthy(), "should report read error");
  });
});

describe("format-report-locator.ts print — terminal-readable report", () => {
  it("outputs formatted terminal report to stdout", () => {
    const { code, stdout } = run([
      "print",
      "--report", FIXTURE_REPORT,
      "--archive", FIXTURE_ARCHIVE,
    ]);
    expect(code).toBe(0);
    expect(stdout).toMatch(/Format Check Report/);
    expect(stdout).toMatch(/\[FC02\]/);
    expect(stdout).toMatch(/:\d+/);
    expect(stdout).toMatch(/Summary/);
  });
});
