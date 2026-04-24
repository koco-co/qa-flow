import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { readFileSync, existsSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { migratePlanToEnhanced } from "../lib/enhanced-doc-migrator.ts";
import { readDoc } from "../lib/enhanced-doc-store.ts";
import { repoRoot, plansDir, enhancedMd } from "../lib/paths.ts";

const P = "test-d1-migrator";
const YM = "202604";
const SLUG = "sample";

function cleanup() {
  const ws = join(repoRoot(), "workspace", P);
  if (existsSync(ws)) rmSync(ws, { recursive: true, force: true });
}

function seedLegacyPlan() {
  const dir = plansDir(P, YM);
  mkdirSync(dir, { recursive: true });
  const src = readFileSync(join(import.meta.dirname, "fixtures/legacy-plan-sample.md"), "utf8");
  writeFileSync(join(dir, `${SLUG}.plan.md`), src, "utf8");
}

describe("migrate-plan", () => {
  beforeEach(() => { cleanup(); seedLegacyPlan(); });
  afterEach(cleanup);

  test("dryRun produces report without writing enhanced.md", () => {
    const report = migratePlanToEnhanced(P, YM, SLUG, { dryRun: true });
    expect(report.qCount).toBe(3);
    expect(report.migratedFromPlan).toBe(true);
    expect(existsSync(enhancedMd(P, YM, SLUG))).toBe(false);
  });

  test("real migration writes enhanced.md with migrated_from_plan=true", () => {
    migratePlanToEnhanced(P, YM, SLUG, { dryRun: false });
    const doc = readDoc(P, YM, SLUG);
    expect(doc.frontmatter.migrated_from_plan).toBe(true);
    expect(doc.frontmatter.status).toBe("discussing");
    expect(doc.frontmatter.q_counter).toBeGreaterThanOrEqual(3);
    expect(doc.pending.length).toBe(3);
    expect(doc.pending.find(p => p.id === "q1")?.status).toBe("已解决");
    expect(doc.pending.find(p => p.id === "q3")?.status).toBe("待确认");
    // §1 overview should contain 4 sub-sections with inherited text
    expect(doc.overview.length).toBe(4);
    expect(doc.overview[0].body).toContain("历史系统");
    // §2 / §3 / Appendix A empty for next-run backfill
    expect(doc.functional.length).toBe(0);
    expect(doc.images_summary).toBe("_TODO_");
    expect(doc.source_facts).toBeNull();
  });

  test("source plan.md is moved to legacy backup", () => {
    migratePlanToEnhanced(P, YM, SLUG, { dryRun: false });
    const src = join(plansDir(P, YM), `${SLUG}.plan.md`);
    expect(existsSync(src)).toBe(false);
    const backup = join(repoRoot(), "workspace", P, ".temp", "legacy-plan", `${SLUG}.plan.md`);
    expect(existsSync(backup)).toBe(true);
  });
});
