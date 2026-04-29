import { describe, test, expect } from "bun:test";
import { validateBug } from "../lib/scan-report-validate.ts";
import type { Bug } from "../lib/scan-report-types.ts";

function makeValid(): Bug {
  return {
    id: "b-001",
    title: "Tag bulk delete skips reference check",
    severity: "major",
    type: "data",
    module: "Tag Center",
    location: { file: "src/.../TagService.java", line: 156, function: "batchDelete" },
    phenomenon: "Referenced tags are physically deleted, leaving dangling tag_id.",
    reproduction_steps: [
      "1. Open Tag Center",
      "2. Select referenced tags",
      "3. Click batch delete",
    ],
    expected: "Block with reference warning",
    actual: "Silently deletes",
    root_cause: "ReferenceCheckInterceptor was removed in this diff",
    evidence: {
      diff_hunk: "@@ -148,8 +148,2 @@ public void batchDelete...",
    },
    suggestion: "Restore referenceCheck() at batchDelete entry",
    confidence: 0.85,
    confidence_reason: "Diff explicitly removes the check; sibling services keep it",
  };
}

describe("validateBug", () => {
  test("accepts a fully populated bug", () => {
    const r = validateBug(makeValid());
    expect(r.ok).toBe(true);
  });

  test("rejects when reproduction_steps shorter than 3", () => {
    const b = makeValid();
    b.reproduction_steps = ["only one"];
    const r = validateBug(b);
    expect(r.ok).toBe(false);
    expect(r.errors.join(",")).toContain("reproduction_steps");
  });

  test("rejects when confidence < 0.6", () => {
    const b = makeValid();
    b.confidence = 0.4;
    const r = validateBug(b);
    expect(r.ok).toBe(false);
    expect(r.errors.join(",")).toContain("confidence");
  });

  test("rejects when location.file empty or location.line <= 0", () => {
    const b = makeValid();
    b.location = { file: "", line: 0 };
    const r = validateBug(b);
    expect(r.ok).toBe(false);
    expect(r.errors.join(",")).toMatch(/location/);
  });

  test("rejects unknown severity / type", () => {
    const b = makeValid();
    (b as any).severity = "blocker";
    expect(validateBug(b).ok).toBe(false);
  });

  test("rejects empty diff_hunk", () => {
    const b = makeValid();
    b.evidence.diff_hunk = "";
    expect(validateBug(b).ok).toBe(false);
  });

  test("rejects empty required string fields", () => {
    const b = makeValid();
    b.root_cause = "";
    expect(validateBug(b).ok).toBe(false);
  });
});
