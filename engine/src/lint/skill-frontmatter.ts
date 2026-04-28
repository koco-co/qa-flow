import { readFileSync } from "node:fs";
import matter from "gray-matter";
import type { SkillReport, SkillViolation } from "./types.ts";

const REF_LINK_REGEX = /\.claude\/skills\/([a-z0-9-]+)\/references\/[^\s)`'"]+/g;

export function lintAgentFrontmatter(filePath: string, knownSkills: Set<string>): SkillReport {
  const violations: SkillViolation[] = [];
  const raw = readFileSync(filePath, "utf8");
  let parsed;
  try {
    parsed = matter(raw);
  } catch {
    violations.push({ rule: "A1", skillDir: filePath, path: filePath, message: "frontmatter parse error" });
    return { skillDir: filePath, violations, passed: false };
  }
  // A1: frontmatter present
  if (!parsed.data || Object.keys(parsed.data).length === 0) {
    violations.push({ rule: "A1", skillDir: filePath, path: filePath, message: "no frontmatter" });
  }
  const owner = parsed.data?.owner_skill;
  // A2: owner_skill declared
  if (!owner || typeof owner !== "string") {
    violations.push({ rule: "A2", skillDir: filePath, path: filePath, message: "owner_skill not declared" });
  } else if (!knownSkills.has(owner)) {
    // A3: owner_skill matches known skill
    violations.push({ rule: "A3", skillDir: filePath, path: filePath, message: `owner_skill '${owner}' is not a known skill` });
  } else {
    // A4: reference-scope check — links must point within owner_skill
    let m: RegExpExecArray | null;
    const refRe = new RegExp(REF_LINK_REGEX.source, "g");
    while ((m = refRe.exec(parsed.content)) !== null) {
      const referencedSkill = m[1]!;
      if (referencedSkill !== owner) {
        violations.push({
          rule: "A4",
          skillDir: filePath,
          path: filePath,
          message: `cross-skill reference: links to '${referencedSkill}' but owner_skill is '${owner}'`,
        });
      }
    }
  }
  return { skillDir: filePath, violations, passed: violations.length === 0 };
}
