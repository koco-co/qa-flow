import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { lintDebugFileNaming } from "../../src/lint/debug-file-naming.ts";

const FIX = join(import.meta.dirname, "fixtures");

describe("lintDebugFileNaming (E1-DEBUG)", () => {
  test("flags *-debug.spec.ts outside .debug/", () => {
    const r = lintDebugFileNaming(join(FIX, "lint-cases-bad"));
    expect(r.violations.some((v) => v.matched.includes("t99-debug.spec.ts"))).toBe(true);
  });

  test("flags diag_*.spec.ts outside .debug/", () => {
    const r = lintDebugFileNaming(join(FIX, "lint-cases-bad"));
    expect(r.violations.some((v) => v.matched.includes("diag_random.spec.ts"))).toBe(true);
  });

  test("passes *-debug.spec.ts inside .debug/", () => {
    const r = lintDebugFileNaming(join(FIX, "lint-cases-good"));
    expect(r.passed).toBe(true);
  });
});
