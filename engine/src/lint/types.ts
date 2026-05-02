export type LintRuleId = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7" | "L8" | "L9" | "L10" | "L11";

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

// ── Path treatment lint (§4.2) ──────────────────────────────

export type PathRuleId = "P-S1" | "P-S2" | "P-S3" | "P-S4";

export interface PathViolation {
  rule: PathRuleId;
  file: string;
  lineNumber: number;
  matched: string;
  message: string;
}

export interface PathReport {
  scanRoot: string;
  violations: PathViolation[];
  passed: boolean;
}

// ── Agent audit (§10.2/§10.4) ───────────────────────────────────

export type AgentRule = "A1" | "A6" | "N1";

export interface AgentViolation {
  rule: AgentRule;
  file: string;
  lineCount?: number;
  matched?: string;
  severity?: "warn" | "fail";
  message: string;
}

export interface AgentReport {
  scanRoot: string;
  agents: number;
  violations: AgentViolation[];
  passed: boolean;
}

// ── Case lint (§10.7) ──────────────────────────────────────────

export interface CaseLintViolation {
  rule: string;
  file: string;
  lineNumber: number;
  matched: string;
  severity?: "warn" | "fail";
  message: string;
}

export interface CaseLintReport {
  scanRoot: string;
  files: number;
  violations: CaseLintViolation[];
  passed: boolean;
}
