#!/usr/bin/env bun
/**
 * format-report-locator.ts — Maps format-checker issues to Archive MD line numbers.
 *
 * Usage:
 *   kata-cli format-report-locator locate --report <json> --archive <md> --output <json>
 *   kata-cli format-report-locator print --report <json> --archive <md>
 *   kata-cli format-report-locator --help
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { createCli } from "./lib/cli-runner.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface IssueLocation {
  module: string;
  page: string;
  group: string;
  line: number;
}

interface FormatIssue {
  rule: string;
  rule_name: string;
  case_title: string;
  location: IssueLocation;
  field: string;
  step_number: number | null;
  current: string;
  problem: string;
  expected_pattern: string;
  severity: string;
}

interface FormatReport {
  verdict: string;
  round: number;
  max_rounds: number;
  total_cases: number;
  issues_count: number;
  issues: FormatIssue[];
  summary: string;
}

interface CaseIndex {
  title: string;
  line: number;
  stepLines: Map<number, number>;
}

interface LocateResult {
  total_issues: number;
  located: number;
  unlocated: number;
  output_path: string;
}

// ─── MD Parser ───────────────────────────────────────────────────────────────

function buildCaseIndex(mdContent: string): Map<string, CaseIndex> {
  const lines = mdContent.split("\n");
  const index = new Map<string, CaseIndex>();

  let currentCase: CaseIndex | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    const caseMatch = line.match(/^#{5}\s+(.+)$/);
    if (caseMatch) {
      const title = caseMatch[1].trim();
      currentCase = { title, line: lineNum, stepLines: new Map() };
      index.set(title, currentCase);
      continue;
    }

    if (currentCase && line.match(/^\|\s*\d+\s*\|/)) {
      const stepMatch = line.match(/^\|\s*(\d+)\s*\|/);
      if (stepMatch) {
        const stepNum = parseInt(stepMatch[1], 10);
        currentCase.stepLines.set(stepNum, lineNum);
      }
    }
  }

  return index;
}

function locateLine(
  caseIndex: Map<string, CaseIndex>,
  issue: FormatIssue,
): number {
  const entry = caseIndex.get(issue.case_title);
  if (!entry) return -1;

  if (issue.field === "title" || issue.step_number === null) {
    return entry.line;
  }

  const stepLine = entry.stepLines.get(issue.step_number);
  return stepLine ?? entry.line;
}

// ─── Terminal Report ─────────────────────────────────────────────────────────

function formatTerminalReport(
  report: FormatReport,
  enrichedIssues: FormatIssue[],
  archiveName: string,
): string {
  const lines: string[] = [];
  const verdict = report.verdict.toUpperCase();

  lines.push("+--------------------------------------------------+");
  lines.push(
    `|  Format Check Report -- Round ${report.round}/${report.max_rounds}  ·  ${verdict}`.padEnd(51) + "|",
  );
  lines.push(
    `|  ${report.issues_count} issues in ${report.total_cases} cases`.padEnd(51) + "|",
  );
  lines.push("+--------------------------------------------------+");
  lines.push("");

  for (const issue of enrichedIssues) {
    const lineRef = issue.location.line > 0 ? `:${issue.location.line}` : "";
    lines.push(`[${issue.rule}] ${issue.rule_name}  -- ${archiveName}${lineRef}`);
    lines.push(`  用例：${issue.case_title}`);

    if (issue.step_number !== null) {
      const fieldLabel = issue.field === "expected" ? "预期 " : "";
      lines.push(`  步骤 ${issue.step_number} ${fieldLabel}> ${issue.current}`);
    } else if (issue.field === "precondition") {
      lines.push(`  前置条件 > ${issue.current}`);
    } else {
      lines.push(`  标题 > ${issue.current}`);
    }

    lines.push(`  问题：${issue.problem}`);
    lines.push(`  期望：${issue.expected_pattern}`);
    lines.push("");
  }

  const ruleCounts = new Map<string, { name: string; count: number }>();
  for (const issue of enrichedIssues) {
    const existing = ruleCounts.get(issue.rule);
    if (existing) {
      existing.count++;
    } else {
      ruleCounts.set(issue.rule, { name: issue.rule_name, count: 1 });
    }
  }

  lines.push("-- Summary ------------------------------------------------");
  for (const [code, { name, count }] of ruleCounts) {
    lines.push(`${code} ${name.padEnd(14)} x${count}`);
  }

  return lines.join("\n");
}

// ─── Commands ────────────────────────────────────────────────────────────────

function readReport(reportPath: string): FormatReport {
  const absPath = resolve(reportPath);
  try {
    return JSON.parse(readFileSync(absPath, "utf8")) as FormatReport;
  } catch (err) {
    process.stderr.write(`[format-report-locator] Failed to read report: ${err}\n`);
    process.exit(1);
  }
}

function readArchive(archivePath: string): string {
  const absPath = resolve(archivePath);
  try {
    return readFileSync(absPath, "utf8");
  } catch (err) {
    process.stderr.write(`[format-report-locator] Failed to read archive: ${err}\n`);
    process.exit(1);
  }
}

function enrichIssues(report: FormatReport, mdContent: string): FormatIssue[] {
  const caseIndex = buildCaseIndex(mdContent);
  return report.issues.map((issue) => ({
    ...issue,
    location: {
      ...issue.location,
      line: locateLine(caseIndex, issue),
    },
  }));
}

async function runLocate(opts: {
  report: string;
  archive: string;
  output: string;
}): Promise<void> {
  const report = readReport(opts.report);
  const mdContent = readArchive(opts.archive);
  const enrichedIssues = enrichIssues(report, mdContent);

  const enrichedReport: FormatReport = { ...report, issues: enrichedIssues };

  const outputPath = resolve(opts.output);
  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  writeFileSync(outputPath, JSON.stringify(enrichedReport, null, 2), "utf8");

  const located = enrichedIssues.filter((i) => i.location.line > 0).length;
  const result: LocateResult = {
    total_issues: report.issues_count,
    located,
    unlocated: report.issues_count - located,
    output_path: outputPath,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

async function runPrint(opts: {
  report: string;
  archive: string;
}): Promise<void> {
  const report = readReport(opts.report);
  const mdContent = readArchive(opts.archive);
  const enrichedIssues = enrichIssues(report, mdContent);
  const archiveName = basename(opts.archive);

  const output = formatTerminalReport(report, enrichedIssues, archiveName);
  process.stdout.write(`${output}\n`);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

export const program = createCli({
  name: "format-report-locator",
  description: "Map format-checker issues to Archive MD line numbers",
  commands: [
    {
      name: "locate",
      description: "Enrich format-checker report with line numbers from Archive MD",
      options: [
        { flag: "--report <path>", description: "Path to format-checker JSON report", required: true },
        { flag: "--archive <path>", description: "Path to Archive MD file", required: true },
        { flag: "--output <path>", description: "Path to write enriched JSON report", required: true },
      ],
      action: async (opts: { report: string; archive: string; output: string }) => {
        await runLocate(opts);
      },
    },
    {
      name: "print",
      description: "Print terminal-readable format check report",
      options: [
        { flag: "--report <path>", description: "Path to format-checker JSON report", required: true },
        { flag: "--archive <path>", description: "Path to Archive MD file", required: true },
      ],
      action: async (opts: { report: string; archive: string }) => {
        await runPrint(opts);
      },
    },
  ],
});
