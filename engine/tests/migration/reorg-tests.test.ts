import { test, expect } from "bun:test";
import { mkdtempSync, cpSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { planReorg, applyReorg } from "../../src/migration/reorg-tests.ts";

function setupFixture(): string {
  const tmp = mkdtempSync(join(tmpdir(), "reorg-tests-"));
  const fxRoot = join(import.meta.dirname, "fixtures/reorg-source");
  cpSync(fxRoot, tmp, { recursive: true });
  return tmp;
}

test("planReorg: classifies all 7 file types", () => {
  const tmp = setupFixture();
  try {
    const plan = planReorg(join(tmp, "feature-X/tests"));
    const byKind = (k: string) => plan.ops.filter((o) => o.kind === k);
    expect(byKind("case").length).toBe(2); // t1.ts, t2.ts
    expect(byKind("runner-clean").length).toBe(1); // full.spec.ts
    expect(byKind("runner-inline").length).toBe(1); // oversized.spec.ts (manual)
    expect(byKind("unit").length).toBe(1);
    expect(byKind("debug").length).toBe(1);
    expect(byKind("helper").length).toBe(1); // helper-a.ts
    expect(byKind("data").length).toBe(1); // test-data.ts
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("applyReorg: moves files to canonical subdirs and renames cases", () => {
  const tmp = setupFixture();
  try {
    const plan = planReorg(join(tmp, "feature-X/tests"));
    applyReorg(plan, { mode: "real" });
    const tests = join(tmp, "feature-X/tests");
    expect(existsSync(join(tests, "cases/t01-create-rule-positive-flow.ts"))).toBe(true);
    expect(existsSync(join(tests, "cases/t02-edit-rule-basic.ts"))).toBe(true);
    expect(existsSync(join(tests, "runners/full.spec.ts"))).toBe(true);
    expect(existsSync(join(tests, "unit/unit-foo.test.ts"))).toBe(true);
    expect(existsSync(join(tests, ".debug/bug-repro.spec.ts"))).toBe(true);
    expect(existsSync(join(tests, "helpers/helper-a.ts"))).toBe(true);
    expect(existsSync(join(tests, "data/test-data.ts"))).toBe(true);
    // oversized.spec.ts NOT moved — manual triage marker
    expect(existsSync(join(tests, "oversized.spec.ts"))).toBe(true);
    expect(existsSync(join(tests, "MANUAL-TRIAGE.md"))).toBe(true);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("fixCaseImports: adjusts shared/ depth in all reorged files", () => {
  const tmp = setupFixture();
  try {
    const plan = planReorg(join(tmp, "feature-X/tests"));
    applyReorg(plan, { mode: "real" });
    const tests = join(tmp, "feature-X/tests");
    // Cases in cases/ (1 level deep): ../../../shared/ -> ../../../../shared/
    const t1 = readFileSync(join(tests, "cases/t01-create-rule-positive-flow.ts"), "utf8");
    expect(t1).toContain('from "../../../../shared/fixtures/step-screenshot"');
    expect(t1).not.toContain('from "../../../shared/');
    const t2 = readFileSync(join(tests, "cases/t02-edit-rule-basic.ts"), "utf8");
    expect(t2).toContain('from "../../../../shared/helpers/test-setup"');
    // Helpers in helpers/ (1 level deep): ../../../shared/ -> ../../../../shared/
    const helper = readFileSync(join(tests, "helpers/helper-a.ts"), "utf8");
    expect(helper).toContain('from "../../../../shared/fixtures/step-screenshot"');
    expect(helper).not.toContain('from "../../../shared/');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("applyReorg: rewrites runner imports to ../cases/...", () => {
  const tmp = setupFixture();
  try {
    const plan = planReorg(join(tmp, "feature-X/tests"));
    applyReorg(plan, { mode: "real" });
    const runner = readFileSync(join(tmp, "feature-X/tests/runners/full.spec.ts"), "utf8");
    expect(runner).toContain('import "../cases/t01-create-rule-positive-flow.ts"');
    expect(runner).toContain('import "../cases/t02-edit-rule-basic.ts"');
    expect(runner).not.toContain('import "./t1.ts"');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("applyReorg dry mode does not write", () => {
  const tmp = setupFixture();
  try {
    const before = existsSync(join(tmp, "feature-X/tests/cases"));
    const plan = planReorg(join(tmp, "feature-X/tests"));
    applyReorg(plan, { mode: "dry" });
    const after = existsSync(join(tmp, "feature-X/tests/cases"));
    expect(before).toBe(false);
    expect(after).toBe(false);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
