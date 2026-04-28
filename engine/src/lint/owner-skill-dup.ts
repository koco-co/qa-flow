import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CaseLintReport, CaseLintViolation } from "./types.ts";

function walk(dir: string, out: string[]): void {
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p, out);
      else if (entry.isFile() && p.endsWith(".md")) out.push(p);
    }
  } catch { /* skip */ }
}

export function lintOwnerSkillDup(scanPath: string): CaseLintReport {
  const files: string[] = [];
  walk(scanPath, files);
  const violations: CaseLintViolation[] = [];
  const re = /^owner_skill:/gm;
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const count = (content.match(re) || []).length;
    if (count > 1) {
      violations.push({
        rule: "E1-OWNER",
        file,
        lineNumber: 1,
        matched: "owner_skill",
        severity: "fail",
        message: `owner_skill appears ${count} times — only 1 allowed in frontmatter; check for duplicate in body`,
      });
    }
  }
  return { scanRoot: scanPath, files: files.length, violations, passed: violations.length === 0 };
}
