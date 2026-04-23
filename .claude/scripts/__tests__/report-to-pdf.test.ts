import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

import {
  extractStepLabel,
  buildPrintableHtml,
  findCases,
} from "../report-to-pdf.ts";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const TMP_DIR = join(tmpdir(), `qa-flow-report-to-pdf-test-${process.pid}`);

function run(
  args: string[],
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "kata-cli",
      ["report-to-pdf", ...args],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        timeout: 60_000,
      },
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

function createMinimalReportJson(dir: string): string {
  const reportDir = join(dir, "test-report");
  const attachmentsDir = join(reportDir, "attachments");
  mkdirSync(attachmentsDir, { recursive: true });

  // Create a minimal 1x1 red PNG
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
    0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x03, 0x00, 0x01, 0x36, 0x28, 0x19, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
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

// ─── Unit tests for exported helpers ────────────────────────────────

describe("extractStepLabel", () => {
  it("strips emoji prefix from step name", () => {
    assert.equal(
      extractStepLabel("✅ 步骤-1 进入页面 预期-1 正常打开"),
      "步骤-1 进入页面 预期-1 正常打开",
    );
  });

  it("strips cross-mark emoji prefix", () => {
    assert.equal(
      extractStepLabel("❌ 步骤-2 查看菜单 预期-2 名称已修改"),
      "步骤-2 查看菜单 预期-2 名称已修改",
    );
  });

  it("handles names without emoji prefix", () => {
    assert.equal(extractStepLabel("step-1 screenshot"), "step-1 screenshot");
  });

  it("handles empty string", () => {
    assert.equal(extractStepLabel(""), "");
  });

  it("preserves Chinese brackets", () => {
    assert.equal(
      extractStepLabel("【P0】验证功能"),
      "【P0】验证功能",
    );
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
    assert.equal(cases.length, 2);
    assert.equal(cases[0].title, "case-1");
    assert.equal(cases[1].title, "case-2");
  });

  it("returns empty array for no cases", () => {
    const cases = findCases([{ title: "suite", type: "suite" }]);
    assert.equal(cases.length, 0);
  });
});

describe("buildPrintableHtml", () => {
  it("generates HTML without error details or file paths", () => {
    const jsonPath = createMinimalReportJson(join(TMP_DIR, "html-check"));
    const reportDir = join(TMP_DIR, "html-check", "test-report");
    const data = JSON.parse(readFileSync(jsonPath, "utf8"));

    const html = buildPrintableHtml(data, reportDir);

    // Should contain summary stats
    assert.match(html, /总用例/);
    assert.match(html, /通过率/);

    // Should contain test case title
    assert.match(html, /should work correctly/);

    // Should NOT contain error details or file paths
    assert.ok(!html.includes("Error: test failed"), "Should not include error text");
    assert.ok(!html.includes("test-file.spec.ts"), "Should not include file paths");
    assert.ok(!html.includes("error-context"), "Should not include error markdown name");

    // Should contain base64 image
    assert.match(html, /data:image\/png;base64,/);

    // Should contain pass rate
    assert.match(html, /50%/);
  });

  it("shows correct status labels in Chinese", () => {
    const jsonPath = createMinimalReportJson(join(TMP_DIR, "status-check"));
    const reportDir = join(TMP_DIR, "status-check", "test-report");
    const data = JSON.parse(readFileSync(jsonPath, "utf8"));

    const html = buildPrintableHtml(data, reportDir);

    assert.match(html, /未通过/);
    assert.match(html, /通过<\/div>/);
  });
});

// ─── CLI integration tests ──────────────────────────────────────────

describe("report-to-pdf --help", () => {
  it("outputs usage information", () => {
    const { stdout, stderr, code } = run(["--help"]);
    const output = stdout + stderr;
    assert.equal(code, 0);
    assert.match(output, /report-to-pdf/i);
    assert.match(output, /source.?path/i);
  });
});

describe("report-to-pdf with missing file", () => {
  it("fails with error message for non-existent file", () => {
    const { stderr, code } = run(["/nonexistent/report.html"]);
    assert.notEqual(code, 0);
    assert.match(stderr, /not found/i);
  });
});

describe("report-to-pdf with minimal report", () => {
  it("generates PDF from JSON report data", () => {
    const jsonPath = createMinimalReportJson(join(TMP_DIR, "pdf-gen"));
    const { stdout, code } = run([jsonPath]);
    assert.equal(code, 0, `Expected exit code 0, got ${code}`);
    assert.match(stdout, /PDF saved/);

    const expectedPdf = jsonPath.replace(/\.json$/, ".pdf");
    assert.ok(existsSync(expectedPdf), "PDF file should exist");

    const pdfContent = readFileSync(expectedPdf);
    assert.ok(pdfContent.length > 0, "PDF should not be empty");
    assert.ok(
      pdfContent.subarray(0, 5).toString() === "%PDF-",
      "File should start with PDF header",
    );
  });

  it("generates PDF with custom output path", () => {
    const jsonPath = createMinimalReportJson(
      join(TMP_DIR, "custom-output"),
    );
    const customOutput = join(TMP_DIR, "custom-output", "my-report.pdf");
    const { stdout, code } = run([jsonPath, "-o", customOutput]);
    assert.equal(code, 0);
    assert.match(stdout, /PDF saved/);
    assert.ok(existsSync(customOutput), "Custom PDF path should exist");
  });

  it("resolves JSON from HTML path", () => {
    const jsonPath = createMinimalReportJson(
      join(TMP_DIR, "html-resolve"),
    );
    const htmlPath = jsonPath.replace(/\.json$/, ".html");
    writeFileSync(htmlPath, "<html></html>");

    const { stdout, code } = run([htmlPath]);
    assert.equal(code, 0);
    assert.match(stdout, /PDF saved/);
  });
});
