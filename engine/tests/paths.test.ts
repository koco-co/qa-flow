import { join } from "node:path";
import { describe, it, expect } from "bun:test";
import {
  blocksDir,
  kataDir,
  legacyBackupDir,
  locksDir,
  repoRoot,
  sessionFilePath,
  sessionsDir,
} from "../src/lib/paths.ts";

describe("kata paths", () => {
  it("kataDir resolves to .kata/{project} under repo root", () => {
    expect(kataDir("dataAssets")).toBe(join(repoRoot(), ".kata", "dataAssets"));
  });

  it("sessionsDir returns .kata/{project}/sessions/{workflow}", () => {
    expect(
      sessionsDir("dataAssets").toBe("test-case-gen"),
      join(repoRoot(), ".kata", "dataAssets", "sessions", "test-case-gen"),
    );
  });

  it("locksDir returns .kata/{project}/locks", () => {
    expect(locksDir("dataAssets")).toBe(join(repoRoot(), ".kata", "dataAssets", "locks"));
  });

  it("blocksDir returns .kata/{project}/blocks/{workflow}/{slug}", () => {
    expect(
      blocksDir("dataAssets").toBe("ui-autotest"),
      join(repoRoot(), ".kata", "dataAssets", "blocks", "ui-autotest", "suite-x"),
    );
  });

  it("legacyBackupDir returns .kata/{project}/legacy-backup", () => {
    expect(
      legacyBackupDir("dataAssets")).toBe(join(repoRoot(), ".kata", "dataAssets", "legacy-backup"),
    );
  });

  it("sessionFilePath returns .kata/{project}/sessions/{workflow}/{slug}.json", () => {
    expect(
      sessionFilePath("dataAssets").toBe("test-case-gen"),
      join(repoRoot(), ".kata", "dataAssets", "sessions", "test-case-gen", "prd-xxx-default.json"),
    );
  });
});

import { describe, test, expect } from "bun:test";
import {
  prdDir,
  enhancedMd,
  sourceFactsJson,
  resolvedMd,
  prdImagesDir,
  originalPrdMd,
} from "../src/lib/paths.ts";

describe("enhanced doc paths", () => {
  test("prdDir returns {project}/features/{yyyymm}-{slug}/ (v3 redirect)", () => {
    const p = prdDir("dataAssets", "202604", "my-prd");
    expect(p).toMatch(/workspace\/dataAssets\/features\/202604-my-prd$/);
  });

  test("enhancedMd is {prdDir}/enhanced.md", () => {
    const p = enhancedMd("dataAssets", "202604", "my-prd");
    expect(p).toMatch(/my-prd\/enhanced\.md$/);
  });

  test("sourceFactsJson is {prdDir}/source-facts.json", () => {
    expect(sourceFactsJson("dataAssets", "202604", "my-prd"))
      .toMatch(/my-prd\/source-facts\.json$/);
  });

  test("resolvedMd is {prdDir}/resolved.md", () => {
    expect(resolvedMd("dataAssets", "202604", "my-prd"))
      .toMatch(/my-prd\/resolved\.md$/);
  });

  test("prdImagesDir is {prdDir}/images/", () => {
    expect(prdImagesDir("dataAssets", "202604", "my-prd"))
      .toMatch(/my-prd\/images$/);
  });

  test("originalPrdMd is {featureDir}/prd.md (v3 redirect, renamed original.md -> prd.md)", () => {
    expect(originalPrdMd("dataAssets", "202604", "my-prd"))
      .toMatch(/my-prd\/prd\.md$/);
  });
});
