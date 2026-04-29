import {
  type Bug,
  BUG_TYPES,
  SEVERITIES,
} from "./scan-report-types.ts";

export interface ValidateResult {
  ok: boolean;
  errors: string[];
}

const REQUIRED_STRING_FIELDS: ReadonlyArray<keyof Bug> = [
  "title",
  "module",
  "phenomenon",
  "expected",
  "actual",
  "root_cause",
  "suggestion",
  "confidence_reason",
];

export function validateBug(bug: Bug): ValidateResult {
  const errors: string[] = [];

  for (const f of REQUIRED_STRING_FIELDS) {
    const v = bug[f];
    if (typeof v !== "string" || v.trim().length === 0) {
      errors.push(`field "${String(f)}" must be a non-empty string`);
    }
  }

  if (!SEVERITIES.includes(bug.severity)) {
    errors.push(`severity must be one of ${SEVERITIES.join("|")}`);
  }
  if (!BUG_TYPES.includes(bug.type)) {
    errors.push(`type must be one of ${BUG_TYPES.join("|")}`);
  }

  if (
    !bug.location ||
    typeof bug.location.file !== "string" ||
    bug.location.file.trim().length === 0
  ) {
    errors.push("location.file must be a non-empty string");
  }
  if (
    !bug.location ||
    typeof bug.location.line !== "number" ||
    bug.location.line <= 0
  ) {
    errors.push("location.line must be a positive integer");
  }

  if (
    !Array.isArray(bug.reproduction_steps) ||
    bug.reproduction_steps.length < 3 ||
    bug.reproduction_steps.some((s) => typeof s !== "string" || s.trim() === "")
  ) {
    errors.push("reproduction_steps must be an array of >= 3 non-empty strings");
  }

  if (
    !bug.evidence ||
    typeof bug.evidence.diff_hunk !== "string" ||
    bug.evidence.diff_hunk.trim().length === 0
  ) {
    errors.push("evidence.diff_hunk must be a non-empty string");
  }

  if (
    typeof bug.confidence !== "number" ||
    bug.confidence < 0.6 ||
    bug.confidence > 1
  ) {
    errors.push("confidence must be a number in [0.6, 1]");
  }

  return { ok: errors.length === 0, errors };
}
