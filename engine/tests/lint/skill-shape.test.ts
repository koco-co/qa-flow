import { test, expect } from "bun:test";
import { join } from "node:path";
import { lintSkillShape } from "../../src/lint/skill-shape.ts";

const FX = join(import.meta.dirname, "fixtures");

test("compliant skill passes", () => {
  const r = lintSkillShape(join(FX, "skill-good/skill-good-1"));
  expect(r.passed).toBe(true);
  expect(r.violations).toEqual([]);
});

test("S5: workflow/ subdir flagged", () => {
  const r = lintSkillShape(join(FX, "skill-bad/skill-with-workflow-subdir"));
  expect(r.violations.some((v) => v.rule === "S5" && v.path?.endsWith("workflow"))).toBe(true);
});

test("S5: modes/ subdir flagged", () => {
  const r = lintSkillShape(join(FX, "skill-bad/skill-with-modes"));
  expect(r.violations.some((v) => v.rule === "S5" && v.path?.endsWith("modes"))).toBe(true);
});

test("S4: SKILL.md > 100 lines flagged", () => {
  const r = lintSkillShape(join(FX, "skill-bad/skill-oversized-skill-md"));
  expect(r.violations.some((v) => v.rule === "S4")).toBe(true);
});
