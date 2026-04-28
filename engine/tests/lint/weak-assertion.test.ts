import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { lintWeakAssertion } from "../../src/lint/weak-assertion.ts";

const FIX = join(import.meta.dirname, "fixtures");

describe("lintWeakAssertion (E1-WEAK)", () => {
  test("flags toBeTruthy()", () => {
    const r = lintWeakAssertion(join(FIX, "lint-cases-bad"));
    expect(r.violations.some((v) => v.matched.includes("toBeTruthy"))).toBe(true);
  });

  test("flags filter(Boolean)", () => {
    const r = lintWeakAssertion(join(FIX, "lint-cases-bad"));
    expect(r.violations.some((v) => v.matched.includes("filter(Boolean)"))).toBe(true);
  });

  test("passes strict assertions", () => {
    const r = lintWeakAssertion(join(FIX, "lint-cases-good"));
    expect(r.passed).toBe(true);
  });
});
