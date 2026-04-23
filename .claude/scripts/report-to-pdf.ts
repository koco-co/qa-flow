#!/usr/bin/env bun
/**
 * report-to-pdf.ts — Convert monocart HTML/JSON report to a self-contained PDF.
 *
 * Reads the JSON data file (generated alongside HTML by monocart-reporter),
 * builds a printable HTML page with embedded screenshots, then uses Playwright
 * to export it as PDF.  Designed for non-technical stakeholders — no error
 * stack traces or file paths; clean visual layout with status badges and
 * full-width screenshots.
 *
 * Usage:
 *   kata-cli report-to-pdf <path-to-html-or-json>
 *   kata-cli report-to-pdf workspace/reports/playwright/202604/xxx/xxx.html
 *
 * Output: PDF file alongside the source file (same name, .pdf extension).
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname, basename, join, extname } from "node:path";
import { createCli } from "./lib/cli-runner.ts";

// ─── Types ───────────────────────────────────────────────────────────

interface Attachment {
  readonly name: string;
  readonly path: string;
  readonly contentType: string;
}

interface TestCase {
  readonly title: string;
  readonly status: string;
  readonly duration?: number;
  readonly attachments?: readonly Attachment[];
  readonly errorId?: string;
  readonly errorNum?: number;
}

interface TestRow {
  readonly title: string;
  readonly type: string;
  readonly subs?: readonly TestRow[];
  readonly status?: string;
  readonly duration?: number;
  readonly attachments?: readonly Attachment[];
  readonly errorId?: string;
  readonly errorNum?: number;
}

interface ReportSummaryItem {
  readonly name: string;
  readonly value: number;
  readonly color?: string;
}

interface ReportData {
  readonly name: string;
  readonly dateH?: string;
  readonly date: number;
  readonly durationH?: string;
  readonly summary: Record<string, ReportSummaryItem>;
  readonly rows: readonly TestRow[];
  readonly outputDir?: string;
}

interface ConvertOptions {
  readonly sourcePath: string;
  readonly outputPath?: string;
}

interface ConvertResult {
  readonly pdfPath: string;
  readonly success: boolean;
  readonly error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

export function findCases(rows: readonly TestRow[]): readonly TestCase[] {
  const cases: TestCase[] = [];
  for (const row of rows) {
    if (row.type === "case") {
      cases.push(row);
    }
    if (row.subs) {
      cases.push(...findCases(row.subs));
    }
  }
  return cases;
}

function imageToBase64DataUri(imagePath: string): string {
  const data = readFileSync(imagePath);
  return `data:image/png;base64,${data.toString("base64")}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDuration(ms?: number): string {
  if (ms === undefined) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    passed: "通过",
    failed: "未通过",
    skipped: "跳过",
    flaky: "不稳定",
  };
  return map[status] ?? status;
}

function statusBadgeColor(status: string): { bg: string; fg: string } {
  switch (status) {
    case "passed":
      return { bg: "#e8f5e9", fg: "#2e7d32" };
    case "failed":
      return { bg: "#ffebee", fg: "#c62828" };
    case "skipped":
      return { bg: "#f5f5f5", fg: "#757575" };
    case "flaky":
      return { bg: "#fff3e0", fg: "#e65100" };
    default:
      return { bg: "#f5f5f5", fg: "#666" };
  }
}

/** Extract step label from attachment name, stripping emoji prefixes. */
export function extractStepLabel(name: string): string {
  return name.replace(/^[^\p{L}\p{N}【]*/u, "").trim();
}

// ─── Summary helpers ─────────────────────────────────────────────────

function summaryCardColor(key: string): { bg: string; fg: string; accent: string } {
  switch (key) {
    case "tests":
      return { bg: "#f0f4ff", fg: "#1a237e", accent: "#3f51b5" };
    case "passed":
      return { bg: "#e8f5e9", fg: "#1b5e20", accent: "#4caf50" };
    case "failed":
      return { bg: "#ffebee", fg: "#b71c1c", accent: "#ef5350" };
    case "skipped":
      return { bg: "#f5f5f5", fg: "#616161", accent: "#9e9e9e" };
    default:
      return { bg: "#f5f5f5", fg: "#333", accent: "#999" };
  }
}

function summaryCardLabel(key: string): string {
  const map: Record<string, string> = {
    tests: "总用例",
    passed: "通过",
    failed: "未通过",
    skipped: "跳过",
  };
  return map[key] ?? key;
}

// ─── HTML Builder ────────────────────────────────────────────────────

export function buildPrintableHtml(
  data: ReportData,
  reportDir: string,
): string {
  const cases = findCases(data.rows);
  const { summary } = data;
  const dateStr = data.dateH ?? new Date(data.date).toLocaleString();

  // --- Summary cards ---
  const summaryKeys = ["tests", "passed", "failed", "skipped"];
  const summaryCards = summaryKeys
    .filter((k) => summary[k])
    .map((k) => {
      const item = summary[k];
      const c = summaryCardColor(k);
      return `
        <div class="stat-card" style="background:${c.bg}; border-left: 4px solid ${c.accent};">
          <div class="stat-value" style="color:${c.fg}">${item.value}</div>
          <div class="stat-label" style="color:${c.fg}">${summaryCardLabel(k)}</div>
        </div>`;
    })
    .join("");

  // --- Pass rate ---
  const total = summary.tests?.value ?? 0;
  const passed = summary.passed?.value ?? 0;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const rateColor = passRate >= 80 ? "#2e7d32" : passRate >= 50 ? "#e65100" : "#c62828";

  // --- Test case cards ---
  const caseSections = cases.map((tc, idx) => {
    const badge = statusBadgeColor(tc.status);

    // Only image attachments — no error markdowns
    const screenshots = (tc.attachments ?? []).filter((a) =>
      a.contentType.startsWith("image/"),
    );

    const screenshotHtml = screenshots
      .map((ss) => {
        const imgPath = join(reportDir, ss.path);
        if (!existsSync(imgPath)) return "";
        const dataUri = imageToBase64DataUri(imgPath);
        const label = extractStepLabel(ss.name);
        return `
          <div class="screenshot-block">
            <div class="step-label">${escapeHtml(label)}</div>
            <img src="${dataUri}" />
          </div>`;
      })
      .filter(Boolean)
      .join("");

    return `
      <div class="case-card">
        <div class="case-header">
          <span class="case-index">${idx + 1}</span>
          <span class="case-title">${escapeHtml(tc.title)}</span>
          <span class="badge" style="background:${badge.bg}; color:${badge.fg}">${statusLabel(tc.status)}</span>
          <span class="case-duration">${formatDuration(tc.duration)}</span>
        </div>
        ${screenshotHtml}
      </div>`;
  });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
      color: #333; line-height: 1.6; background: #f8fafc;
      print-color-adjust: exact; -webkit-print-color-adjust: exact;
    }

    /* ── Header ── */
    .report-header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff; padding: 24pt 20pt; border-radius: 8px;
      margin-bottom: 16pt;
    }
    .report-title { font-size: 16pt; font-weight: 600; margin-bottom: 4pt; }
    .report-meta { font-size: 9pt; color: #b0bec5; }

    /* ── Summary ── */
    .summary-row {
      display: flex; gap: 10pt; margin-bottom: 16pt;
    }
    .stat-card {
      flex: 1; padding: 12pt 14pt; border-radius: 6px;
      text-align: center;
    }
    .stat-value { font-size: 22pt; font-weight: 700; line-height: 1.2; }
    .stat-label { font-size: 9pt; margin-top: 2pt; opacity: 0.85; }

    .pass-rate {
      text-align: right; font-size: 9pt; color: #999;
      margin-bottom: 14pt; padding-right: 2pt;
    }
    .pass-rate b { font-size: 13pt; }

    /* ── Case cards ── */
    .case-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;
      margin-bottom: 14pt; overflow: hidden;
    }
    .case-header {
      display: flex; align-items: center; gap: 8pt;
      padding: 10pt 14pt; border-bottom: 1px solid #f0f0f0;
      break-after: avoid; page-break-after: avoid;
    }
    .case-index {
      width: 22pt; height: 22pt; border-radius: 50%;
      background: #f0f4ff; color: #3f51b5;
      display: flex; align-items: center; justify-content: center;
      font-size: 9pt; font-weight: 600; flex-shrink: 0;
    }
    .case-title { flex: 1; font-size: 11pt; font-weight: 500; }
    .badge {
      padding: 2pt 10pt; border-radius: 12pt;
      font-size: 8pt; font-weight: 600; flex-shrink: 0;
    }
    .case-duration { color: #b0bec5; font-size: 8pt; flex-shrink: 0; }

    /* ── Screenshots ── */
    .screenshot-block {
      padding: 10pt 14pt 0;
      break-inside: avoid; page-break-inside: avoid;
    }
    .screenshot-block:last-child { padding-bottom: 14pt; }
    .step-label {
      font-size: 9pt; color: #546e7a; margin-bottom: 4pt;
      padding-left: 2pt; font-weight: 500;
    }
    .screenshot-block img {
      width: 100%; border: 1px solid #e2e8f0; border-radius: 6px;
      display: block;
    }

    /* ── Footer ── */
    .report-footer {
      text-align: center; font-size: 7pt; color: #b0bec5;
      margin-top: 20pt; padding-top: 10pt;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="report-title">${escapeHtml(data.name)}</div>
    <div class="report-meta">${dateStr} &nbsp;&middot;&nbsp; ${data.durationH ?? "-"}</div>
  </div>

  <div class="summary-row">${summaryCards}</div>
  <div class="pass-rate">通过率 <b style="color:${rateColor}">${passRate}%</b></div>

  ${caseSections.join("\n")}

  <div class="report-footer">UI Autotest Report &middot; Generated by kata</div>
</body>
</html>`;
}

// ─── Core ────────────────────────────────────────────────────────────

function resolveJsonPath(sourcePath: string): string {
  const absPath = resolve(sourcePath);
  if (extname(absPath) === ".json") return absPath;
  const dir = dirname(absPath);
  const name = basename(absPath, ".html");
  return join(dir, `${name}.json`);
}

function resolvePdfPath(sourcePath: string, outputPath?: string): string {
  if (outputPath) return resolve(outputPath);
  const absPath = resolve(sourcePath);
  const dir = dirname(absPath);
  const ext = extname(absPath);
  const name = basename(absPath, ext);
  return join(dir, `${name}.pdf`);
}

export async function convertReportToPdf(
  options: ConvertOptions,
): Promise<ConvertResult> {
  const jsonPath = resolveJsonPath(options.sourcePath);

  if (!existsSync(jsonPath)) {
    return {
      pdfPath: "",
      success: false,
      error: `JSON data file not found: ${jsonPath}`,
    };
  }

  const pdfPath = resolvePdfPath(options.sourcePath, options.outputPath);
  const reportDir = dirname(jsonPath);

  try {
    const data: ReportData = JSON.parse(readFileSync(jsonPath, "utf8"));
    const html = buildPrintableHtml(data, reportDir);

    const { chromium } = await import("playwright-core");
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);

      await page.pdf({
        path: pdfPath,
        format: "A4",
        printBackground: true,
        margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
      });

      return { pdfPath, success: true };
    } finally {
      await browser.close().catch(() => {});
    }
  } catch (err) {
    return {
      pdfPath,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────

export const program = createCli({
  name: "report-to-pdf",
  description: "Convert monocart HTML/JSON report to self-contained PDF",
  rootAction: {
    arguments: [
      { name: "sourcePath", description: "Path to the HTML or JSON report file", required: true },
    ],
    options: [
      { flag: "-o, --output <path>", description: "Custom output PDF path" },
    ],
    action: async (rawOpts: Record<string, unknown>) => {
      const opts = rawOpts as { sourcePath: string; output?: string };
      const result = await convertReportToPdf({
        sourcePath: opts.sourcePath,
        outputPath: opts.output,
      });

      if (result.success) {
        process.stdout.write(`PDF saved: ${result.pdfPath}\n`);
      } else {
        process.stderr.write(`Failed: ${result.error}\n`);
        process.exit(1);
      }
    },
  },
});
