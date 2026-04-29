import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it, expect } from "bun:test";

import {
  configJsonPath,
  diffProjectSkeleton,
  mergeProjectConfig,
  renderTemplate,
  RESERVED_NAMES,
  resolveSkeletonPaths,
  SKELETON_SPEC,
  validateProjectName,
} from "../../lib/create-project.ts";

describe("validateProjectName", () => {
  it("accepts camelCase name dataAssets", () => {
    const r = validateProjectName("dataAssets");
    expect(r.valid).toBe(true);
    expect(r.error).toBe(undefined);
  });

  it("accepts kebab-case name data-assets", () => {
    expect(validateProjectName("data-assets").valid).toBe(true);
  });

  it("accepts all-lowercase pinyin xyzh", () => {
    expect(validateProjectName("xyzh").valid).toBe(true);
  });

  it("rejects empty name", () => {
    const r = validateProjectName("");
    expect(r.valid).toBe(false);
    expect(r.error!).toMatch(/length/);
  });

  it("rejects single character (too short)", () => {
    const r = validateProjectName("a");
    expect(r.valid).toBe(false);
    expect(r.error!).toMatch(/length/);
  });

  it("rejects name over 32 chars", () => {
    const r = validateProjectName("a".repeat(33));
    expect(r.valid).toBe(false);
    expect(r.error!).toMatch(/length/);
  });

  it("rejects name starting with digit", () => {
    const r = validateProjectName("1project");
    expect(r.valid).toBe(false);
    expect(r.error!).toMatch(/character set/);
  });

  it("rejects name starting with dash", () => {
    const r = validateProjectName("-project");
    expect(r.valid).toBe(false);
    expect(r.error!).toMatch(/character set/);
  });

  it("rejects underscore", () => {
    const r = validateProjectName("my_project");
    expect(r.valid).toBe(false);
    expect(r.error!).toMatch(/character set/);
  });

  it("rejects space", () => {
    const r = validateProjectName("my project");
    expect(r.valid).toBe(false);
  });

  it("rejects dot", () => {
    const r = validateProjectName("my.project");
    expect(r.valid).toBe(false);
  });

  it("rejects slash", () => {
    const r = validateProjectName("my/project");
    expect(r.valid).toBe(false);
  });

  it("rejects reserved name 'knowledge'", () => {
    const r = validateProjectName("knowledge");
    expect(r.valid).toBe(false);
    expect(r.error!).toMatch(/reserved/);
  });

  it("rejects every reserved name in RESERVED_NAMES", () => {
    for (const reserved of RESERVED_NAMES) {
      if (!/^[A-Za-z]/.test(reserved)) continue; // 保留名 '.repos'/'.temp' 本就被字符集规则拒
      const r = validateProjectName(reserved);
      expect(r.valid).toBe(false);
    }
  });
});

describe("configJsonPath", () => {
  it("respects CONFIG_JSON_PATH env override", () => {
    const original = process.env.CONFIG_JSON_PATH;
    process.env.CONFIG_JSON_PATH = "/tmp/custom-config.json";
    try {
      expect(configJsonPath()).toBe("/tmp/custom-config.json");
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
      expect(p.endsWith("/config.json")).toBeTruthy();
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
      expect(p.endsWith("/config.json")).toBeTruthy();
      expect(p.startsWith("/")).toBeTruthy();
    } finally {
      if (original !== undefined) process.env.CONFIG_JSON_PATH = original;
    }
  });
});

describe("SKELETON_SPEC shape", () => {
  it("has 12 directories", () => {
    expect(SKELETON_SPEC.dirs.length).toBe(12);
  });

  it("has 10 gitkeep directories", () => {
    expect(SKELETON_SPEC.gitkeep_dirs.length).toBe(10);
  });

  it("has 3 template files", () => {
    expect(Object.keys(SKELETON_SPEC.template_files).length).toBe(3);
  });

  it("gitkeep_dirs is a subset of dirs", () => {
    for (const d of SKELETON_SPEC.gitkeep_dirs) {
      expect(
        SKELETON_SPEC.dirs.includes(d as (typeof SKELETON_SPEC.dirs)[number]),
        `${d} not in dirs`,
      );
    }
  });

  it("template_files dst paths are not in gitkeep_dirs' directories of same file", () => {
    expect(!SKELETON_SPEC.gitkeep_dirs.includes("rules")).toBeTruthy();
  });
});

describe("resolveSkeletonPaths", () => {
  it("returns absolute paths derived from projectDir", () => {
    const projDir = "/tmp/x/workspace/demoProj";
    const r = resolveSkeletonPaths(projDir);
    expect(r.dirs.every((d) => d.startsWith(projDir + "/"))).toBeTruthy();
    expect(r.gitkeeps.every((g) => g.endsWith(".gitkeep"))).toBeTruthy();
    expect(r.templates.every((t) => t.dst_abs.startsWith(projDir + "/"))).toBeTruthy();
  });

  it("produces 12 dirs, 10 gitkeeps, 3 templates", () => {
    const r = resolveSkeletonPaths("/tmp/foo");
    expect(r.dirs.length).toBe(12);
    expect(r.gitkeeps.length).toBe(10);
    expect(r.templates.length).toBe(3);
  });
});

describe("diffProjectSkeleton", () => {
  const TMP = join(tmpdir(), `kata-cp-unit-${process.pid}`);
  const TPL = join(TMP, "templates", "project-skeleton");
  const EMPTY_PROJ = join(TMP, "empty-proj");
  const FULL_PROJ = join(TMP, "full-proj");

  beforeEach(() => {
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

  afterEach(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it("empty project: exists=false, all missing", () => {
    const diff = diffProjectSkeleton(EMPTY_PROJ, TPL);
    expect(diff.exists).toBe(false);
    expect(diff.missing_dirs.length).toBe(12);
    expect(diff.missing_gitkeeps.length).toBe(10);
    expect(diff.missing_files.length).toBe(3);
    expect(diff.skeleton_complete).toBe(false);
  });

  it("full project: exists=true, nothing missing, skeleton_complete", () => {
    const diff = diffProjectSkeleton(FULL_PROJ, TPL);
    expect(diff.exists).toBe(true);
    expect(diff.missing_dirs.length).toBe(0);
    expect(diff.missing_gitkeeps.length).toBe(0);
    expect(diff.missing_files.length).toBe(0);
    expect(diff.skeleton_complete).toBe(true);
  });

  it("partial project: only missing what's absent", () => {
    rmSync(join(FULL_PROJ, "knowledge", "modules"), { recursive: true });
    const diff = diffProjectSkeleton(FULL_PROJ, TPL);
    expect(diff.exists).toBe(true);
    expect(diff.missing_dirs).toEqual(["knowledge/modules"]);
    expect(diff.missing_gitkeeps).toEqual(["knowledge/modules/.gitkeep"]);
    expect(diff.skeleton_complete).toBe(false);
    mkdirSync(join(FULL_PROJ, "knowledge", "modules"), { recursive: true });
    writeFileSync(join(FULL_PROJ, "knowledge", "modules", ".gitkeep"), "");
  });
});

describe("mergeProjectConfig", () => {
  it("adds project to empty config", () => {
    const { merged, added } = mergeProjectConfig({}, "newProj");
    expect(added).toBe(true);
    expect(merged).toEqual({
      projects: { newProj: { repo_profiles: {} } },
    });
  });

  it("adds project alongside existing projects", () => {
    const existing = {
      projects: {
        dataAssets: { repo_profiles: { 岚图: { repos: [] } } },
      },
    };
    const { merged, added } = mergeProjectConfig(existing, "newProj");
    expect(added).toBe(true);
    expect((merged as any).projects.dataAssets.repo_profiles).toEqual({ 岚图: { repos: [] } });
    expect((merged as any).projects.newProj).toEqual({ repo_profiles: {} });
  });

  it("skips when project already registered", () => {
    const existing = {
      projects: {
        existProj: { repo_profiles: { foo: { repos: [{ path: "a" }] } } },
      },
    };
    const { merged, added } = mergeProjectConfig(existing, "existProj");
    expect(added).toBe(false);
    expect((merged as any).projects.existProj.repo_profiles).toEqual({
      foo: { repos: [{ path: "a" }] },
    });
  });

  it("preserves top-level keys outside projects", () => {
    const existing = { otherField: "keepme", projects: {} };
    const { merged } = mergeProjectConfig(existing, "x");
    expect((merged as any).otherField).toBe("keepme");
  });

  it("handles missing projects key", () => {
    const existing = { someOtherField: 1 };
    const { merged, added } = mergeProjectConfig(existing, "y");
    expect(added).toBe(true);
    expect("projects" in merged).toBeTruthy();
    expect((merged as any).projects).toEqual({
      y: { repo_profiles: {} },
    });
  });

  it("does not mutate the input (immutability)", () => {
    const existing = { projects: { a: { repo_profiles: {} } } };
    const snapshot = JSON.stringify(existing);
    mergeProjectConfig(existing, "b");
    expect(JSON.stringify(existing)).toBe(snapshot);
  });
});

describe("renderTemplate", () => {
  it("replaces single {{project}} placeholder", () => {
    expect(renderTemplate("Hello {{project}}", { project: "myProj" })).toBe("Hello myProj");
  });

  it("replaces multiple occurrences", () => {
    const raw = "# {{project}}\n\nSee rules for {{project}}.";
    const out = renderTemplate(raw, { project: "dataAssets" });
    expect(out).toBe("# dataAssets\n\nSee rules for dataAssets.");
  });

  it("returns original string when no placeholder", () => {
    const raw = "Plain content without placeholder";
    expect(renderTemplate(raw, { project: "p" })).toBe(raw);
  });

  it("handles empty string", () => {
    expect(renderTemplate("", { project: "x" })).toBe("");
  });

  it("does not replace {{ project }} with spaces (strict token)", () => {
    const raw = "{{ project }}";
    expect(renderTemplate(raw, { project: "x" })).toBe("{{ project }}");
  });
});
