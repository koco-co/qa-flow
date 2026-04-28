import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, it, expect } from "bun:test";

import { extractStepLabel, buildPrintableHtml, findCases } from "../src/report-to-pdf.ts";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const TMP_DIR = join(tmpdir(), `kata-report-to-pdf-test-${process.pid}`);

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync("kata-cli", ["report-to-pdf", ...args], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      timeout: 60_000,
    });
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

function createMinimalReportJson(dir: string): string {
  const reportDir = join(dir, "test-report");
  const attachmentsDir = join(reportDir, "attachments");
  mkdirSync(attachmentsDir, { recursive: true });

  // Create a minimal 1x1 red PNG
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x03, 0x00, 0x01, 0x36, 0x28, 0x19, 0x00, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
    0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  writeFileSync(join(attachmentsDir, "screenshot.png"), pngHeader);

  // Create error markdown (should be ignored in new layout)
  writeFileSync(
    join(attachmentsDir, "error.md"),
    "# Error details\n```\nError: test failed\n```\n",
  );

  const reportData = {
    name: "Test Report",
    date: Date.now(),
    dateH: "2026/4/7 12:00:00",
    durationH: "5.0s",
    summary: {
      tests: { name: "Tests", value: 2 },
      failed: { name: "Failed", value: 1, color: "#d00" },
      flaky: { name: "Flaky", value: 0, color: "orange" },
      skipped: { name: "Skipped", value: 0, color: "gray" },
      passed: { name: "Passed", value: 1, color: "green" },
    },
    rows: [
      {
        title: "chromium",
        type: "suite",
        subs: [
          {
            title: "test-file.spec.ts",
            type: "suite",
            subs: [
              {
                title: "Test Suite",
                type: "suite",
                subs: [
                  {
                    title: "should work correctly",
                    type: "case",
                    status: "failed",
                    duration: 5000,
                    errorNum: 1,
                    errorId: "err1",
                    attachments: [
                      {
                        name: "step-1 screenshot",
                        path: "attachments/screenshot.png",
                        contentType: "image/png",
                      },
                      {
                        name: "error-context",
                        path: "attachments/error.md",
                        contentType: "text/markdown",
                      },
                    ],
                  },
                  {
                    title: "should pass test",
                    type: "case",
                    status: "passed",
                    duration: 2000,
                    attachments: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    artifacts: [],
  };

  const jsonPath = join(reportDir, "report.json");
  writeFileSync(jsonPath, JSON.stringify(reportData));
  return jsonPath;
}

beforeAll(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterAll(() => {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

// ─── Unit tests for exported helpers ────────────────────────────────

describe("extractStepLabel", () => {
  it("strips emoji prefix from step name", () => {
    expect(extractStepLabel("✅ 步骤-1 进入页面 预期-1 正常打开")).toBe(
      "步骤-1 进入页面 预期-1 正常打开",
    );
  });

  it("strips cross-mark emoji prefix", () => {
    expect(extractStepLabel("❌ 步骤-2 查看菜单 预期-2 名称已修改")).toBe(
      "步骤-2 查看菜单 预期-2 名称已修改",
    );
  });

  it("handles names without emoji prefix", () => {
    expect(extractStepLabel("step-1 screenshot")).toBe("step-1 screenshot");
  });

  it("handles empty string", () => {
    expect(extractStepLabel("")).toBe("");
  });

  it("preserves Chinese brackets", () => {
    expect(extractStepLabel("【P0】验证功能")).toBe("【P0】验证功能");
  });
});

describe("findCases", () => {
  it("extracts test cases from nested rows", () => {
    const rows = [
      {
        title: "suite",
        type: "suite",
        subs: [
          { title: "case-1", type: "case", status: "passed" },
          { title: "case-2", type: "case", status: "failed" },
        ],
      },
    ];
    const cases = findCases(rows);
    expect(cases.length).toBe(2);
    expect(cases[0].title).toBe("case-1");
    expect(cases[1].title).toBe("case-2");
  });

  it("returns empty array for no cases", () => {
    const cases = findCases([{ title: "suite", type: "suite" }]);
    expect(cases.length).toBe(0);
  });
});

describe("buildPrintableHtml", () => {
  it("generates HTML without error details or file paths", () => {
    const jsonPath = createMinimalReportJson(join(TMP_DIR, "html-check"));
    const reportDir = join(TMP_DIR, "html-check", "test-report");
    const data = JSON.parse(readFileSync(jsonPath, "utf8"));

    const html = buildPrintableHtml(data, reportDir);

    // Should contain summary stats
    expect(html).toMatch(/总用例/);
    expect(html).toMatch(/通过率/);

    // Should contain test case title
    expect(html).toMatch(/should work correctly/);

    // Should NOT contain error details or file paths
    expect(!html.includes("Error: test failed").toBeTruthy(), "Should not include error text");
    expect(!html.includes("test-file.spec.ts").toBeTruthy(), "Should not include file paths");
    expect(!html.includes("error-context").toBeTruthy(), "Should not include error markdown name");

    // Should contain base64 image
    expect(html).toMatch(/data:image\/png;base64,/);

    // Should contain pass rate
    expect(html).toMatch(/50%/);
  });

  it("shows correct status labels in Chinese", () => {
    const jsonPath = createMinimalReportJson(join(TMP_DIR, "status-check"));
    const reportDir = join(TMP_DIR, "status-check", "test-report");
    const data = JSON.parse(readFileSync(jsonPath, "utf8"));

    const html = buildPrintableHtml(data, reportDir);

    expect(html).toMatch(/未通过/);
    expect(html).toMatch(/通过<\/div>/);
  });
});

// ─── CLI integration tests ──────────────────────────────────────────

describe("report-to-pdf --help", () => {
  it("outputs usage information", () => {
    const { stdout, stderr, code } = run(["--help"]);
    const output = stdout + stderr;
    expect(code).toBe(0);
    expect(output).toMatch(/report-to-pdf/i);
    expect(output).toMatch(/source.?path/i);
  });
});

describe("report-to-pdf with missing file", () => {
  it("fails with error message for non-existent file", () => {
    const { stderr, code } = run(["/nonexistent/report.html"]);
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/not found/i);
  });
});

describe("report-to-pdf with minimal report", () => {
  it("generates PDF from JSON report data", () => {
    const jsonPath = createMinimalReportJson(join(TMP_DIR, "pdf-gen"));
    const { stdout, code } = run([jsonPath]);
    expect(code).toBe(0);
    expect(stdout).toMatch(/PDF saved/);

    const expectedPdf = jsonPath.replace(/\.json$/, ".pdf");
    expect(existsSync(expectedPdf).toBeTruthy(), "PDF file should exist");

    const pdfContent = readFileSync(expectedPdf);
    expect(pdfContent.length > 0).toBeTruthy();
    expect(
      pdfContent.subarray(0, 5).toBeTruthy().toString() === "%PDF-",
      "File should start with PDF header",
    );
  });

  it("generates PDF with custom output path", () => {
    const jsonPath = createMinimalReportJson(join(TMP_DIR, "custom-output"));
    const customOutput = join(TMP_DIR, "custom-output", "my-report.pdf");
    const { stdout, code } = run([jsonPath, "-o", customOutput]);
    expect(code).toBe(0);
    expect(stdout).toMatch(/PDF saved/);
    expect(existsSync(customOutput).toBeTruthy(), "Custom PDF path should exist");
  });

  it("resolves JSON from HTML path", () => {
    const jsonPath = createMinimalReportJson(join(TMP_DIR, "html-resolve"));
    const htmlPath = jsonPath.replace(/\.json$/, ".html");
    writeFileSync(htmlPath, "<html></html>");

    const { stdout, code } = run([htmlPath]);
    expect(code).toBe(0);
    expect(stdout).toMatch(/PDF saved/);
  });
});
