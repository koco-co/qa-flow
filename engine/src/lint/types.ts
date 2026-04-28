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
