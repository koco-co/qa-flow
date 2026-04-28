import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { lintHardcodePath } from "../../src/lint/hardcode-path.ts";

const FIX = join(import.meta.dirname, "fixtures");

describe("lintHardcodePath (E1-PATH)", () => {
  test("flags absolute /Users/ paths", () => {
    const r = lintHardcodePath(join(FIX, "lint-cases-bad"));
    expect(r.violations.some((v) => v.matched.includes("/Users/"))).toBe(true);
  });

  test("passes paths using join() / import.meta.dirname", () => {
    const r = lintHardcodePath(join(FIX, "lint-cases-good"));
    expect(r.passed).toBe(true);
  });
});
