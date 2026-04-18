import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

import {
  configJsonPath,
  diffProjectSkeleton,
  RESERVED_NAMES,
  resolveSkeletonPaths,
  SKELETON_SPEC,
  validateProjectName,
} from "../../lib/create-project.ts";

describe("validateProjectName", () => {
  it("accepts camelCase name dataAssets", () => {
    const r = validateProjectName("dataAssets");
    assert.equal(r.valid, true);
    assert.equal(r.error, undefined);
  });

  it("accepts kebab-case name data-assets", () => {
    assert.equal(validateProjectName("data-assets").valid, true);
  });

  it("accepts all-lowercase pinyin xyzh", () => {
    assert.equal(validateProjectName("xyzh").valid, true);
  });

  it("rejects empty name", () => {
    const r = validateProjectName("");
    assert.equal(r.valid, false);
    assert.match(r.error!, /length/);
  });

  it("rejects single character (too short)", () => {
    const r = validateProjectName("a");
    assert.equal(r.valid, false);
    assert.match(r.error!, /length/);
  });

  it("rejects name over 32 chars", () => {
    const r = validateProjectName("a".repeat(33));
    assert.equal(r.valid, false);
    assert.match(r.error!, /length/);
  });

  it("rejects name starting with digit", () => {
    const r = validateProjectName("1project");
    assert.equal(r.valid, false);
    assert.match(r.error!, /character set/);
  });

  it("rejects name starting with dash", () => {
    const r = validateProjectName("-project");
    assert.equal(r.valid, false);
    assert.match(r.error!, /character set/);
  });

  it("rejects underscore", () => {
    const r = validateProjectName("my_project");
    assert.equal(r.valid, false);
    assert.match(r.error!, /character set/);
  });

  it("rejects space", () => {
    const r = validateProjectName("my project");
    assert.equal(r.valid, false);
  });

  it("rejects dot", () => {
    const r = validateProjectName("my.project");
    assert.equal(r.valid, false);
  });

  it("rejects slash", () => {
    const r = validateProjectName("my/project");
    assert.equal(r.valid, false);
  });

  it("rejects reserved name 'knowledge'", () => {
    const r = validateProjectName("knowledge");
    assert.equal(r.valid, false);
    assert.match(r.error!, /reserved/);
  });

  it("rejects every reserved name in RESERVED_NAMES", () => {
    for (const reserved of RESERVED_NAMES) {
      if (!/^[A-Za-z]/.test(reserved)) continue; // 保留名 '.repos'/'.temp' 本就被字符集规则拒
      const r = validateProjectName(reserved);
      assert.equal(r.valid, false, `expected "${reserved}" to be rejected`);
    }
  });
});

describe("configJsonPath", () => {
  it("respects CONFIG_JSON_PATH env override", () => {
    const original = process.env.CONFIG_JSON_PATH;
    process.env.CONFIG_JSON_PATH = "/tmp/custom-config.json";
    try {
      assert.equal(configJsonPath(), "/tmp/custom-config.json");
    } finally {
      if (original === undefined) delete process.env.CONFIG_JSON_PATH;
      else process.env.CONFIG_JSON_PATH = original;
    }
  });

  it("ignores empty CONFIG_JSON_PATH and uses repo default", () => {
    const original = process.env.CONFIG_JSON_PATH;
    process.env.CONFIG_JSON_PATH = "";
    try {
      const p = configJsonPath();
      assert.ok(p.endsWith("/config.json"), `expected default, got ${p}`);
    } finally {
      if (original === undefined) delete process.env.CONFIG_JSON_PATH;
      else process.env.CONFIG_JSON_PATH = original;
    }
  });

  it("defaults to <repoRoot>/config.json when CONFIG_JSON_PATH unset", () => {
    const original = process.env.CONFIG_JSON_PATH;
    delete process.env.CONFIG_JSON_PATH;
    try {
      const p = configJsonPath();
      assert.ok(p.endsWith("/config.json"));
      assert.ok(p.startsWith("/"), "absolute path");
    } finally {
      if (original !== undefined) process.env.CONFIG_JSON_PATH = original;
    }
  });
});

describe("SKELETON_SPEC shape", () => {
  it("has 13 directories", () => {
    assert.equal(SKELETON_SPEC.dirs.length, 13);
  });

  it("has 11 gitkeep directories", () => {
    assert.equal(SKELETON_SPEC.gitkeep_dirs.length, 11);
  });

  it("has 3 template files", () => {
    assert.equal(Object.keys(SKELETON_SPEC.template_files).length, 3);
  });

  it("gitkeep_dirs is a subset of dirs", () => {
    for (const d of SKELETON_SPEC.gitkeep_dirs) {
      assert.ok(
        SKELETON_SPEC.dirs.includes(d as (typeof SKELETON_SPEC.dirs)[number]),
        `${d} not in dirs`,
      );
    }
  });

  it("template_files dst paths are not in gitkeep_dirs' directories of same file", () => {
    assert.ok(!SKELETON_SPEC.gitkeep_dirs.includes("rules"));
  });
});

describe("resolveSkeletonPaths", () => {
  it("returns absolute paths derived from projectDir", () => {
    const projDir = "/tmp/x/workspace/demoProj";
    const r = resolveSkeletonPaths(projDir);
    assert.ok(r.dirs.every((d) => d.startsWith(projDir + "/")));
    assert.ok(r.gitkeeps.every((g) => g.endsWith(".gitkeep")));
    assert.ok(r.templates.every((t) => t.dst_abs.startsWith(projDir + "/")));
  });

  it("produces 13 dirs, 11 gitkeeps, 3 templates", () => {
    const r = resolveSkeletonPaths("/tmp/foo");
    assert.equal(r.dirs.length, 13);
    assert.equal(r.gitkeeps.length, 11);
    assert.equal(r.templates.length, 3);
  });
});

describe("diffProjectSkeleton", () => {
  const TMP = join(tmpdir(), `qa-flow-cp-unit-${process.pid}`);
  const TPL = join(TMP, "templates", "project-skeleton");
  const EMPTY_PROJ = join(TMP, "empty-proj");
  const FULL_PROJ = join(TMP, "full-proj");

  before(() => {
    mkdirSync(join(TPL, "rules"), { recursive: true });
    mkdirSync(join(TPL, "knowledge"), { recursive: true });
    writeFileSync(join(TPL, "rules", "README.md"), "# {{project}}");
    writeFileSync(join(TPL, "knowledge", "overview.md"), "# {{project}}");
    writeFileSync(join(TPL, "knowledge", "terms.md"), "# {{project}}");

    for (const d of SKELETON_SPEC.dirs) {
      mkdirSync(join(FULL_PROJ, d), { recursive: true });
    }
    for (const g of SKELETON_SPEC.gitkeep_dirs) {
      writeFileSync(join(FULL_PROJ, g, ".gitkeep"), "");
    }
    for (const rel of Object.keys(SKELETON_SPEC.template_files)) {
      writeFileSync(join(FULL_PROJ, rel), "# existing");
    }
  });

  after(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it("empty project: exists=false, all missing", () => {
    const diff = diffProjectSkeleton(EMPTY_PROJ, TPL);
    assert.equal(diff.exists, false);
    assert.equal(diff.missing_dirs.length, 13);
    assert.equal(diff.missing_gitkeeps.length, 11);
    assert.equal(diff.missing_files.length, 3);
    assert.equal(diff.skeleton_complete, false);
  });

  it("full project: exists=true, nothing missing, skeleton_complete", () => {
    const diff = diffProjectSkeleton(FULL_PROJ, TPL);
    assert.equal(diff.exists, true);
    assert.equal(diff.missing_dirs.length, 0);
    assert.equal(diff.missing_gitkeeps.length, 0);
    assert.equal(diff.missing_files.length, 0);
    assert.equal(diff.skeleton_complete, true);
  });

  it("partial project: only missing what's absent", () => {
    rmSync(join(FULL_PROJ, "knowledge", "modules"), { recursive: true });
    const diff = diffProjectSkeleton(FULL_PROJ, TPL);
    assert.equal(diff.exists, true);
    assert.deepEqual(diff.missing_dirs, ["knowledge/modules"]);
    assert.deepEqual(diff.missing_gitkeeps, ["knowledge/modules/.gitkeep"]);
    assert.equal(diff.skeleton_complete, false);
    mkdirSync(join(FULL_PROJ, "knowledge", "modules"), { recursive: true });
    writeFileSync(join(FULL_PROJ, "knowledge", "modules", ".gitkeep"), "");
  });
});
