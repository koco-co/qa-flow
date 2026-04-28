import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { lintAgentShape } from "../../src/lint/agent-shape.ts";

const FIX = join(import.meta.dirname, "fixtures");

describe("lintAgentShape (A1)", () => {
  test("flags agents over 500 lines as A1 fail", () => {
    const r = lintAgentShape(join(FIX, "agent-shape-bad"));
    const fails = r.violations.filter((v) => v.rule === "A1" && v.message.includes("fail"));
    expect(fails.length).toBe(1);
    expect(fails[0]!.lineCount).toBeGreaterThanOrEqual(500);
  });

  test("flags agents over 300 lines as A1 warn", () => {
    const r = lintAgentShape(join(FIX, "agent-shape-bad"));
    const warns = r.violations.filter((v) => v.rule === "A1" && v.message.includes("warn"));
    expect(warns.length).toBe(1);
  });

  test("passes compact agents", () => {
    const r = lintAgentShape(join(FIX, "agent-shape-good"));
    expect(r.passed).toBe(true);
  });

  test("counts agent files scanned", () => {
    const r = lintAgentShape(join(FIX, "agent-shape-good"));
    expect(r.agents).toBe(1);
  });

  test("violation includes severity field", () => {
    const r = lintAgentShape(join(FIX, "agent-shape-bad"));
    expect(r.violations.every((v) => v.severity === "warn" || v.severity === "fail")).toBe(true);
  });
});
