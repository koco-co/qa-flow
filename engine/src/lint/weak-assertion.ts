import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { CaseLintReport, CaseLintViolation } from "./types.ts";

interface RuleDef {
  id: "E1-WEAK";
  regex: RegExp;
  message: string;
}

const RULES: RuleDef[] = [
  { id: "E1-WEAK", regex: /\.toBeTruthy\(\)/g, message: "weak assertion .toBeTruthy() — use toBeVisible() / toHaveText() / toHaveCount() with concrete expected value" },
  { id: "E1-WEAK", regex: /\.filter\(Boolean\)/g, message: "filter(Boolean) hides falsy values — be explicit about what is filtered" },
];

const SUFFIXES = [".ts", ".tsx", ".js"];

function walk(dir: string, out: string[]): void {
  try {
    const st = statSync(dir);
    if (st.isFile()) {
      if (SUFFIXES.some((s) => dir.endsWith(s))) out.push(dir);
      return;
    }
    if (!st.isDirectory()) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      walk(join(dir, entry.name), out);
    }
  } catch { /* skip */ }
}

export function lintWeakAssertion(scanPath: string): CaseLintReport {
  const files: string[] = [];
  walk(scanPath, files);
  const violations: CaseLintViolation[] = [];
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      for (const rule of RULES) {
        rule.regex.lastIndex = 0;
        const m = rule.regex.exec(line);
        if (m) {
          violations.push({ rule: rule.id, file, lineNumber: i + 1, matched: m[0], severity: "warn", message: rule.message });
        }
      }
    }
  }
  return { scanRoot: scanPath, files: files.length, violations, passed: violations.length === 0 };
}
