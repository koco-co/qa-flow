import { test, expect } from "bun:test";
import { join } from "node:path";
import { lintFeatureTests } from "../../src/lint/tests-layout.ts";

const FX = join(import.meta.dirname, "fixtures/violating-tests");

test("L1: numeric-only tN.ts filenames are flagged", () => {
  const report = lintFeatureTests(join(FX, "feature-bad/tests"));
  const l1 = report.violations.filter((v) => v.rule === "L1");
  expect(l1.some((v) => v.file.endsWith("t1.ts"))).toBe(true);
  expect(l1.some((v) => v.file.endsWith("t02-create-rule.ts"))).toBe(false);
});

test("L3: missing cases/README.md is flagged", () => {
  const report = lintFeatureTests(join(FX, "feature-bad/tests"));
  expect(report.violations.some((v) => v.rule === "L3")).toBe(true);
});

test("L4: helper > 800 lines is flagged", () => {
  const report = lintFeatureTests(join(FX, "feature-bad/tests"));
  const l4 = report.violations.filter((v) => v.rule === "L4");
  expect(l4.length).toBe(1);
  expect(l4[0]!.file).toContain("oversized.ts");
});

test("L5: *.spec.ts under cases/ is flagged", () => {
  const report = lintFeatureTests(join(FX, "feature-bad/tests"));
  expect(report.violations.some((v) => v.rule === "L5" && v.file.includes("wrong.spec.ts"))).toBe(true);
});

test("L6: *.spec.ts under unit/ is flagged", () => {
  const report = lintFeatureTests(join(FX, "feature-bad/tests"));
  expect(report.violations.some((v) => v.rule === "L6" && v.file.includes("unit/wrong.spec.ts"))).toBe(true);
});

test("L7: versioned data file (_v2) is flagged", () => {
  const report = lintFeatureTests(join(FX, "feature-bad/tests"));
  expect(report.violations.some((v) => v.rule === "L7" && v.file.includes("seed_v2.ts"))).toBe(true);
});

test("compliant fixture passes", () => {
  const report = lintFeatureTests(join(FX, "feature-good/tests"));
  expect(report.passed).toBe(true);
  expect(report.violations).toEqual([]);
});
