import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, cpSync, readdirSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  discoverFeatures,
  planMigration,
  applyMigration,
  rollbackFromLog,
} from "../../src/migration/v3-workspace.ts";

const FIXTURE = resolve(import.meta.dir, "fixtures/mini-workspace");

function freshShadow(): string {
  const dir = mkdtempSync(join(tmpdir(), "kata-mig-"));
  const projectDir = join(dir, "myproj");
  cpSync(FIXTURE, projectDir, { recursive: true });
  return projectDir;
}

describe("discoverFeatures", () => {
  test("finds all 3 features across full / archive-only / recent-only", () => {
    const projectDir = freshShadow();
    const { features } = discoverFeatures(projectDir);
    const slugs = features.map((f) => `${f.yyyymm}-${f.slug}`).sort();
    expect(slugs).toEqual([
      "202512-legacy-prd",
      "202604-full-prd",
      "202604-recent-prd",
    ]);
  });

  test("full-prd has all 4 source paths populated", () => {
    const projectDir = freshShadow();
    const { features } = discoverFeatures(projectDir);
    const f = features.find((x) => x.slug === "full-prd")!;
    expect(f.prdDir).toBeDefined();
    expect(f.archivePath).toBeDefined();
    expect(f.xmindPath).toBeDefined();
    expect(f.testsPath).toBeDefined();
  });

  test("recent-prd has only prdDir, no archive/xmind", () => {
    const projectDir = freshShadow();
    const { features } = discoverFeatures(projectDir);
    const f = features.find((x) => x.slug === "recent-prd")!;
    expect(f.prdDir).toBeDefined();
    expect(f.archivePath).toBeUndefined();
    expect(f.xmindPath).toBeUndefined();
  });

  test("legacy-prd has only archive + xmind, no prdDir", () => {
    const projectDir = freshShadow();
    const { features } = discoverFeatures(projectDir);
    const f = features.find((x) => x.slug === "legacy-prd")!;
    expect(f.prdDir).toBeUndefined();
    expect(f.archivePath).toBeDefined();
    expect(f.xmindPath).toBeDefined();
  });
});

describe("discoverFeatures: non-yyyymm subdirs", () => {
  test("non-yyyymm dirs under archive/ are reported as skipped, not silently ignored", () => {
    const projectDir = freshShadow();
    const result = discoverFeatures(projectDir);
    expect(Array.isArray((result as any).features ?? result)).toBe(true);
    const skipped = (result as any).skipped as string[] | undefined;
    expect(skipped).toBeDefined();
    expect(skipped!.some((p) => p.includes("non-yyyymm-folder"))).toBe(true);
  });
});

describe("planMigration", () => {
  test("output is deterministic (same input -> same ops)", () => {
    const projectDir = freshShadow();
    const { features } = discoverFeatures(projectDir);
    const a = planMigration(features, projectDir);
    const b = planMigration(features, projectDir);
    expect(a).toEqual(b);
  });

  test("all mkdir ops come before mv ops (no orphan moves)", () => {
    const projectDir = freshShadow();
    const { features } = discoverFeatures(projectDir);
    const ops = planMigration(features, projectDir);
    const lastMkdir = ops.findLastIndex((o) => o.type === "mkdir");
    const firstMv = ops.findIndex((o) => o.type === "mv");
    expect(lastMkdir).toBeLessThan(firstMv);
  });
});

describe("applyMigration dry mode", () => {
  test("dry mode does not touch the filesystem", () => {
    const projectDir = freshShadow();
    const { features } = discoverFeatures(projectDir);
    const ops = planMigration(features, projectDir);
    const logPath = join(projectDir, "..", "dryrun.log.json");
    const before = readdirSync(projectDir).sort();
    applyMigration(ops, { mode: "dry", project: "myproj", logPath });
    const after = readdirSync(projectDir).sort();
    expect(after).toEqual(before);
    expect(existsSync(logPath)).toBe(true);
  });
});

describe("applyMigration: incremental log persistence", () => {
  test("log file exists and is valid JSON after applying first 3 non-log ops", () => {
    const projectDir = freshShadow();
    const { features } = discoverFeatures(projectDir);
    const ops = planMigration(features, projectDir);
    const logPath = join(projectDir, "..", "incremental.log.json");
    const firstThree = ops.filter((o) => o.type !== "log").slice(0, 3);
    applyMigration(firstThree, { mode: "real", project: "myproj", logPath });
    const persisted = JSON.parse(readFileSync(logPath, "utf8"));
    expect(persisted.operations.length).toBeGreaterThanOrEqual(3);
  });
});

describe("applyMigration real mode + rollback (inverse property)", () => {
  test("apply(real) then rollbackFromLog produces a tree byte-identical to original", () => {
    const projectDir = freshShadow();

    function snap(root: string): Map<string, string> {
      const out = new Map<string, string>();
      function walk(p: string, rel = "") {
        for (const entry of readdirSync(p, { withFileTypes: true })) {
          const full = join(p, entry.name);
          const r = rel ? `${rel}/${entry.name}` : entry.name;
          if (entry.isDirectory()) walk(full, r);
          else out.set(r, createHash("sha256").update(readFileSync(full)).digest("hex"));
        }
      }
      walk(root);
      return out;
    }

    const before = snap(projectDir);
    const { features } = discoverFeatures(projectDir);
    const ops = planMigration(features, projectDir);
    const logPath = join(projectDir, "..", "real.log.json");
    applyMigration(ops, { mode: "real", project: "myproj", logPath });
    rollbackFromLog(logPath);
    const after = snap(projectDir);

    expect(after.size).toBe(before.size);
    for (const [k, v] of before) expect(after.get(k)).toBe(v);
  });
});
