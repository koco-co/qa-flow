export type LintRuleId = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7" | "L8";

export interface LintViolation {
  rule: LintRuleId;
  file: string;
  message: string;
}

export interface LintReport {
  featureDir: string;
  violations: LintViolation[];
  passed: boolean;
}

// ── Skill shape audit (4-file contract, §5.4) ──────────────

export type SkillRuleId = "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "A1" | "A2" | "A3" | "A4";

export interface SkillViolation {
  rule: SkillRuleId;
  skillDir: string;
  path?: string;
  message: string;
}

export interface SkillReport {
  skillDir: string;
  violations: SkillViolation[];
  passed: boolean;
}
