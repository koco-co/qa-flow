import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import type { CaseLintReport, CaseLintViolation } from "./types.ts";

const FORBIDDEN = /(.+)-(debug|repro)\.spec\.ts$/;
const DIAG = /^diag_.+\.spec\.ts$/;

function walk(dir: string, out: string[]): void {
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p, out);
      else if (entry.isFile() && p.endsWith(".spec.ts")) out.push(p);
    }
  } catch { /* skip */ }
}

export function lintDebugFileNaming(scanPath: string): CaseLintReport {
  const files: string[] = [];
  walk(scanPath, files);
  const violations: CaseLintViolation[] = [];
  for (const file of files) {
    const name = basename(file);
    if (file.split("/").includes(".debug")) continue;
    if (FORBIDDEN.test(name) || DIAG.test(name)) {
      violations.push({
        rule: "E1-DEBUG",
        file,
        lineNumber: 1,
        matched: name,
        severity: "fail",
        message: `${name} is a debug/repro/diag spec outside .debug/ — move to .debug/ directory`,
      });
    }
  }
  return { scanRoot: scanPath, files: files.length, violations, passed: violations.length === 0 };
}
