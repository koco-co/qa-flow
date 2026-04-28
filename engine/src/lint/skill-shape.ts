import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import type { SkillReport, SkillViolation } from "./types.ts";

const ALLOWED_TOP_LEVEL_FILES = new Set(["SKILL.md", "workflow.md", "rules.md"]);
const ALLOWED_TOP_LEVEL_DIRS = new Set(["references"]);
const SKILL_MD_LINE_LIMIT = 100;
const REFERENCE_NON_MD_EXCEPTIONS: Record<string, Set<string>> = {
  "test-case-gen": new Set(["xmind-gen.ts", "strategy-schema.json"]),
};

export function lintSkillShape(skillDir: string): SkillReport {
  const violations: SkillViolation[] = [];
  const skillName = basename(skillDir);

  // S1: SKILL.md missing
  const skillMd = join(skillDir, "SKILL.md");
  if (!existsSync(skillMd)) {
    violations.push({ rule: "S1", skillDir, path: skillMd, message: "SKILL.md missing" });
  } else {
    // S4: SKILL.md > 100 lines
    const lines = readFileSync(skillMd, "utf8").split("\n").length;
    if (lines > SKILL_MD_LINE_LIMIT) {
      violations.push({ rule: "S4", skillDir, path: skillMd, message: `SKILL.md has ${lines} lines (limit ${SKILL_MD_LINE_LIMIT})` });
    }
  }

  // S2: workflow.md missing
  if (!existsSync(join(skillDir, "workflow.md"))) {
    violations.push({ rule: "S2", skillDir, path: join(skillDir, "workflow.md"), message: "workflow.md missing" });
  }

  // S3: rules.md missing
  if (!existsSync(join(skillDir, "rules.md"))) {
    violations.push({ rule: "S3", skillDir, path: join(skillDir, "rules.md"), message: "rules.md missing" });
  }

  // Walk top-level entries for S5, S6, S7
  for (const entry of readdirSync(skillDir, { withFileTypes: true })) {
    const full = join(skillDir, entry.name);
    if (entry.isDirectory()) {
      // S5: forbidden subdir
      if (!ALLOWED_TOP_LEVEL_DIRS.has(entry.name)) {
        violations.push({ rule: "S5", skillDir, path: full, message: `forbidden subdir '${entry.name}'; only 'references/' allowed` });
      } else if (entry.name === "references") {
        // S7: non-.md files in references/
        for (const ref of walkAll(full)) {
          const refName = basename(ref);
          if (!ref.endsWith(".md")) {
            const allowList = REFERENCE_NON_MD_EXCEPTIONS[skillName];
            if (!allowList || !allowList.has(refName)) {
              violations.push({ rule: "S7", skillDir, path: ref, message: `non-.md file '${refName}' in references/; add to exception list if intentional` });
            }
          }
        }
      }
    } else if (entry.isFile()) {
      // S6: forbidden top-level file
      if (!ALLOWED_TOP_LEVEL_FILES.has(entry.name)) {
        violations.push({ rule: "S6", skillDir, path: full, message: `forbidden top-level file '${entry.name}'; only SKILL.md/workflow.md/rules.md allowed` });
      }
    }
  }

  return { skillDir, violations, passed: violations.length === 0 };
}

function walkAll(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...walkAll(full));
    else if (e.isFile()) out.push(full);
  }
  return out;
}
