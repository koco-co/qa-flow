import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  blocksDir,
  kataDir,
  legacyBackupDir,
  locksDir,
  repoRoot,
  sessionFilePath,
  sessionsDir,
} from "../lib/paths.ts";

describe("kata paths", () => {
  it("kataDir resolves to .kata/{project} under repo root", () => {
    assert.equal(kataDir("dataAssets"), join(repoRoot(), ".kata", "dataAssets"));
  });

  it("sessionsDir returns .kata/{project}/sessions/{workflow}", () => {
    assert.equal(
      sessionsDir("dataAssets", "test-case-gen"),
      join(repoRoot(), ".kata", "dataAssets", "sessions", "test-case-gen"),
    );
  });

  it("locksDir returns .kata/{project}/locks", () => {
    assert.equal(locksDir("dataAssets"), join(repoRoot(), ".kata", "dataAssets", "locks"));
  });

  it("blocksDir returns .kata/{project}/blocks/{workflow}/{slug}", () => {
    assert.equal(
      blocksDir("dataAssets", "ui-autotest", "suite-x"),
      join(repoRoot(), ".kata", "dataAssets", "blocks", "ui-autotest", "suite-x"),
    );
  });

  it("legacyBackupDir returns .kata/{project}/legacy-backup", () => {
    assert.equal(
      legacyBackupDir("dataAssets"),
      join(repoRoot(), ".kata", "dataAssets", "legacy-backup"),
    );
  });

  it("sessionFilePath returns .kata/{project}/sessions/{workflow}/{slug}.json", () => {
    assert.equal(
      sessionFilePath("dataAssets", "test-case-gen", "prd-xxx-default"),
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
} from "../lib/paths.ts";

describe("enhanced doc paths", () => {
  test("prdDir returns {project}/prds/{yyyymm}/{slug}/", () => {
    const p = prdDir("dataAssets", "202604", "my-prd");
    expect(p).toMatch(/workspace\/dataAssets\/prds\/202604\/my-prd$/);
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

  test("originalPrdMd is {prdDir}/original.md", () => {
    expect(originalPrdMd("dataAssets", "202604", "my-prd"))
      .toMatch(/my-prd\/original\.md$/);
  });
});
