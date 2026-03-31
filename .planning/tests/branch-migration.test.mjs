/**
 * branch-migration.test.mjs
 * Smoke test: verify that DTStack-specific data directories do NOT exist on the
 * current branch (main/release). They should have been migrated to dtstack-data branch.
 *
 * Run: node --test .planning/tests/branch-migration.test.mjs
 *
 * TDD Note: These tests will FAIL (RED) until Plan 05 performs the branch migration.
 * That is expected behavior per the Wave 0 test scaffold design.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(__dirname, "../..");

describe("GEN-06: DTStack data directories must NOT exist on main/release branch", () => {
  const dtStackArchiveDirs = [
    "cases/archive/data-assets",
    "cases/archive/batch-works",
    "cases/archive/data-query",
    "cases/archive/variable-center",
    "cases/archive/public-service",
  ];

  for (const dir of dtStackArchiveDirs) {
    it(`${dir}/ does not exist on current branch`, () => {
      const fullPath = resolve(WORKSPACE_ROOT, dir);
      assert.equal(
        existsSync(fullPath),
        false,
        `${dir}/ should not exist on main/release branch. ` +
          `DTStack archive data must be migrated to dtstack-data branch.`
      );
    });
  }

  const dtStackXmindDirs = [
    "cases/xmind/data-assets",
    "cases/xmind/batch-works",
    "cases/xmind/data-query",
    "cases/xmind/variable-center",
    "cases/xmind/public-service",
  ];

  for (const dir of dtStackXmindDirs) {
    it(`${dir}/ does not exist on current branch`, () => {
      const fullPath = resolve(WORKSPACE_ROOT, dir);
      assert.equal(
        existsSync(fullPath),
        false,
        `${dir}/ should not exist on main/release branch. ` +
          `DTStack xmind data must be migrated to dtstack-data branch.`
      );
    });
  }

  it("cases/history/ does not exist on current branch", () => {
    const fullPath = resolve(WORKSPACE_ROOT, "cases/history");
    assert.equal(
      existsSync(fullPath),
      false,
      "cases/history/ should not exist on main/release branch. " +
        "Historical CSV source material must be migrated to dtstack-data branch."
    );
  });
});

describe("GEN-06: repo-branch-mapping.yaml must not contain DTStack-specific profiles", () => {
  it("config/repo-branch-mapping.yaml does not contain DTStack repo profiles", () => {
    const mappingPath = resolve(WORKSPACE_ROOT, "config/repo-branch-mapping.yaml");

    if (!existsSync(mappingPath)) {
      // File absent is acceptable — it means DTStack config was removed
      return;
    }

    const content = readFileSync(mappingPath, "utf8");
    const hasDtInsight = content.includes("dt-insight");
    const hasDtStack = content.includes("DTStack");

    assert.equal(
      hasDtInsight,
      false,
      "config/repo-branch-mapping.yaml should not contain 'dt-insight' (DTStack-specific repo profiles). " +
        "Migrate this file to dtstack-data branch or replace with a generic template."
    );
    assert.equal(
      hasDtStack,
      false,
      "config/repo-branch-mapping.yaml should not contain 'DTStack' references. " +
        "Migrate this file to dtstack-data branch or replace with a generic template."
    );
  });
});
