import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentReport, AgentViolation } from "./types.ts";

const WARN_LINES = 300;
const FAIL_LINES = 500;

function walk(dir: string, out: string[]): void {
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p, out);
      else if (entry.isFile() && p.endsWith(".md")) out.push(p);
    }
  } catch { /* skip */ }
}

export function lintAgentShape(scanPath: string): AgentReport {
  const files: string[] = [];
  walk(scanPath, files);
  const violations: AgentViolation[] = [];
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const raw = content.split("\n").length;
    const lines = content.endsWith("\n") ? raw - 1 : raw;
    if (lines >= FAIL_LINES) {
      violations.push({
        rule: "A1",
        file,
        lineCount: lines,
        severity: "fail",
        message: `agent body ${lines} lines >= ${FAIL_LINES} (A1 fail); split into sub-agents per spec §10.2`,
      });
    } else if (lines > WARN_LINES) {
      violations.push({
        rule: "A1",
        file,
        lineCount: lines,
        severity: "warn",
        message: `agent body ${lines} lines > ${WARN_LINES} (A1 warn); extract sections to references/`,
      });
    }
  }
  return { scanRoot: scanPath, agents: files.length, violations, passed: violations.length === 0 };
}
