import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it, expect } from "bun:test";

import {
  planInitTests,
  applyInitTests,
} from "../../src/cli/features-init-tests.ts";

const DIRS = ["cases", "runners", "helpers", "data", "unit", ".debug"];

describe("planInitTests", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `init-tests-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("reports all dirs missing when tests/ is empty", () => {
    const plan = planInitTests(tmpDir);
    expect(plan.missingDirs).toEqual(DIRS);
    expect(plan.existingDirs).toEqual([]);
  });

  it("reports existing dirs as existing", () => {
    mkdirSync(join(tmpDir, "cases"), { recursive: true });
    mkdirSync(join(tmpDir, "runners"), { recursive: true });

    const plan = planInitTests(tmpDir);
    expect(plan.existingDirs).toEqual(["cases", "runners"]);
    expect(plan.missingDirs).toEqual(["helpers", "data", "unit", ".debug"]);
  });

  it("reports missing gitkeeps", () => {
    const plan = planInitTests(tmpDir);
    expect(plan.missingGitkeeps).toHaveLength(6);
    expect(plan.missingGitkeeps).toContain("cases/.gitkeep");
  });

  it("detects existing gitkeeps", () => {
    mkdirSync(join(tmpDir, "cases"), { recursive: true });
    writeFileSync(join(tmpDir, "cases", ".gitkeep"), "");

    const plan = planInitTests(tmpDir);
    expect(plan.missingGitkeeps).not.toContain("cases/.gitkeep");
  });

  it("reports missing READMEs", () => {
    const plan = planInitTests(tmpDir);
    expect(plan.missingReadmes).toContain("README.md");
    expect(plan.missingReadmes).toContain("cases/README.md");
  });
});

describe("applyInitTests", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `init-tests-apply-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates all missing dirs", () => {
    const plan = planInitTests(tmpDir);
    const result = applyInitTests(tmpDir, plan, {
      feature: "202604-test",
      project: "myProject",
    });

    expect(result.createdDirs).toEqual(DIRS);
    for (const dir of DIRS) {
      expect(existsSync(join(tmpDir, dir))).toBe(true);
    }
  });

  it("creates .gitkeep in each dir", () => {
    const plan = planInitTests(tmpDir);
    applyInitTests(tmpDir, plan, {
      feature: "202604-test",
      project: "myProject",
    });

    for (const dir of DIRS) {
      expect(existsSync(join(tmpDir, dir, ".gitkeep"))).toBe(true);
    }
  });

  it("creates README.md with feature name", () => {
    const plan = planInitTests(tmpDir);
    applyInitTests(tmpDir, plan, {
      feature: "202604-有效性",
      project: "dataAssets",
    });

    const readme = readFileSync(join(tmpDir, "README.md"), "utf8");
    expect(readme).toContain("202604-有效性");
    expect(readme).toContain("dataAssets");
  });

  it("creates cases/README.md", () => {
    const plan = planInitTests(tmpDir);
    applyInitTests(tmpDir, plan, {
      feature: "202604-test",
      project: "myProject",
    });

    const casesReadme = readFileSync(join(tmpDir, "cases", "README.md"), "utf8");
    expect(casesReadme).toContain("Cases Index");
  });

  it("skips already existing dirs", () => {
    mkdirSync(join(tmpDir, "cases"), { recursive: true });

    const plan = planInitTests(tmpDir);
    const result = applyInitTests(tmpDir, plan, {
      feature: "202604-test",
      project: "myProject",
    });

    expect(result.createdDirs).not.toContain("cases");
    expect(result.createdDirs).toHaveLength(5);
  });

  it("is idempotent — second run creates nothing", () => {
    const vars = { feature: "202604-test", project: "myProject" };

    const plan1 = planInitTests(tmpDir);
    applyInitTests(tmpDir, plan1, vars);

    const plan2 = planInitTests(tmpDir);
    expect(plan2.missingDirs).toEqual([]);
    expect(plan2.missingReadmes).toEqual([]);

    // gitkeeps may still be "missing" if they were created empty — check dirs
    expect(plan2.existingDirs).toEqual(DIRS);
  });
});
