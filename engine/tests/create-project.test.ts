import { execFileSync, execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, beforeEach, describe, it, expect } from "bun:test";

const TMP = join(tmpdir(), `kata-cp-int-${process.pid}`);
const WORKSPACE_DIR = join(TMP, "workspace");
const CONFIG_PATH = join(TMP, "config.json");
const REPO_ROOT = resolve(import.meta.dirname, "../..");

function runCp(
  args: string[],
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "kata-cli",
      ["create-project", ...args],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: {
          ...process.env,
          WORKSPACE_DIR,
          CONFIG_JSON_PATH: CONFIG_PATH,
        },
      },
    );
    return { stdout, stderr: "", code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      code: e.status ?? 1,
    };
  }
}

function resetFixture(): void {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(WORKSPACE_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify({ projects: {} }, null, 2));
}

describe("create-project create --dry-run", () => {
  beforeEach(() => resetFixture());
  afterEach(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("returns will_create plan without touching disk", () => {
    const { stdout, code } = runCp([
      "create",
      "--project",
      "newProj",
      "--dry-run",
    ]);
    expect(code).toBe(0);
    const data = JSON.parse(stdout);
    expect(data.dry_run).toBe(true);
    expect(data.will_register).toBe(true);
    expect(data.will_call_index).toBe(true);
    expect(Array.isArray(data.will_create.dirs)).toBeTruthy();
    expect(Array.isArray(data.will_create.files)).toBeTruthy();
    expect(Array.isArray(data.will_create.gitkeeps)).toBeTruthy();
    expect(data.will_create.dirs.length).toBe(12);
    // Disk must remain untouched
    expect(existsSync(join(WORKSPACE_DIR).toBe("newProj")), false);
    // Config must remain unchanged
    const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    expect(cfg).toEqual({ projects: {} });
  });

  it("dry-run rejects invalid name with exit 1", () => {
    const { stderr, code } = runCp([
      "create",
      "--project",
      "1bad",
      "--dry-run",
    ]);
    expect(code).toBe(1);
    expect(stderr).toMatch(/Invalid project name/);
  });

  it("dry-run on complete project returns skipped=true", () => {
    const projDir = join(WORKSPACE_DIR, "complete");
    for (const d of [
      "prds",
      "xmind",
      "archive",
      "issues",
      "history",
      "reports",
      "tests",
      "rules",
      "knowledge",
      "knowledge/modules",
      "knowledge/pitfalls",
      ".repos",
    ]) mkdirSync(join(projDir, d), { recursive: true });
    for (const g of [
      "prds",
      "xmind",
      "archive",
      "issues",
      "history",
      "reports",
      "tests",
      "knowledge/modules",
      "knowledge/pitfalls",
      ".repos",
    ]) writeFileSync(join(projDir, g, ".gitkeep"), "");
    writeFileSync(join(projDir, "rules", "README.md"), "# complete");
    writeFileSync(join(projDir, "knowledge", "overview.md"), "# complete");
    writeFileSync(join(projDir, "knowledge", "terms.md"), "# complete");
    writeFileSync(
      CONFIG_PATH,
      JSON.stringify({ projects: { complete: { repo_profiles: {} } } }, null, 2),
    );
    const { stdout, code } = runCp([
      "create",
      "--project",
      "complete",
      "--dry-run",
    ]);
    expect(code).toBe(0);
    const data = JSON.parse(stdout);
    expect(data.skipped).toBe(true);
  });

  it("returns exit 2 when missing --confirmed and diff exists", () => {
    const { stderr, code } = runCp(["create", "--project", "newProj"]);
    expect(code).toBe(2);
    expect(stderr).toMatch(/--confirmed/);
  });
});

describe("create-project scan", () => {
  beforeEach(() => resetFixture());
  afterEach(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("rejects invalid project name", () => {
    const { stderr, code } = runCp(["scan", "--project", "1invalid"]);
    expect(code).toBe(1);
    expect(stderr).toMatch(/\[create-project\] Invalid project name/);
  });

  it("reports non-existent project with all missing", () => {
    const { stdout, code } = runCp(["scan", "--project", "ghost"]);
    expect(code).toBe(0);
    const data = JSON.parse(stdout);
    expect(data.project).toBe("ghost");
    expect(data.valid_name).toBe(true);
    expect(data.exists).toBe(false);
    expect(data.skeleton_complete).toBe(false);
    expect(data.missing_dirs.length).toBe(12);
    expect(data.missing_gitkeeps.length).toBe(10);
    expect(data.missing_files.length).toBe(3);
    expect(data.config_registered).toBe(false);
  });

  it("reports config_registered=true when project exists in config.json", () => {
    writeFileSync(
      CONFIG_PATH,
      JSON.stringify(
        { projects: { registered: { repo_profiles: {} } } },
        null,
        2,
      ),
    );
    const { stdout, code } = runCp(["scan", "--project", "registered"]);
    expect(code).toBe(0);
    const data = JSON.parse(stdout);
    expect(data.config_registered).toBe(true);
  });

  it("reports skeleton_complete=true for fully populated project", () => {
    const projDir = join(WORKSPACE_DIR, "fullProj");
    const tplRoot = join(REPO_ROOT, "templates", "project-skeleton");
    const dirs = [
      "prds",
      "xmind",
      "archive",
      "issues",
      "history",
      "reports",
      "tests",
      "rules",
      "knowledge",
      "knowledge/modules",
      "knowledge/pitfalls",
      ".repos",
    ];
    for (const d of dirs) mkdirSync(join(projDir, d), { recursive: true });
    const gks = [
      "prds",
      "xmind",
      "archive",
      "issues",
      "history",
      "reports",
      "tests",
      "knowledge/modules",
      "knowledge/pitfalls",
      ".repos",
    ];
    for (const g of gks) writeFileSync(join(projDir, g, ".gitkeep"), "");
    writeFileSync(join(projDir, "rules", "README.md"), "# fullProj rules");
    writeFileSync(
      join(projDir, "knowledge", "overview.md"),
      "# fullProj overview",
    );
    writeFileSync(join(projDir, "knowledge", "terms.md"), "# fullProj terms");

    void tplRoot;

    const { stdout, code } = runCp(["scan", "--project", "fullProj"]);
    expect(code).toBe(0);
    const data = JSON.parse(stdout);
    expect(data.exists).toBe(true);
    expect(data.skeleton_complete).toBe(true);
    expect(data.missing_dirs.length).toBe(0);
    expect(data.missing_files.length).toBe(0);
    expect(data.missing_gitkeeps.length).toBe(0);
  });
});

describe("create-project create --confirmed", () => {
  beforeEach(() => resetFixture());
  afterEach(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("materialises full skeleton end-to-end", () => {
    const { stdout, code } = runCp([
      "create",
      "--project",
      "fresh",
      "--confirmed",
    ]);
    expect(code).toBe(0);
    const data = JSON.parse(stdout);
    expect(data.project).toBe("fresh");
    expect(data.registered_config).toBe(true);
    expect(data.index_generated).toBe(true);
    expect(data.index_path.endsWith("knowledge/_index.md")).toBeTruthy();

    const projDir = join(WORKSPACE_DIR, "fresh");
    for (const d of [
      "prds",
      "xmind",
      "archive",
      "issues",
      "history",
      "reports",
      "tests",
      "rules",
      "knowledge",
      "knowledge/modules",
      "knowledge/pitfalls",
      ".repos",
    ]) {
      expect(existsSync(join(projDir, d)).toBeTruthy());
    }
    expect(existsSync(join(projDir, "prds")).toBeTruthy());
    expect(existsSync(join(projDir, "knowledge", "modules")).toBeTruthy());
    const rulesReadme = readFileSync(
      join(projDir, "rules", "README.md"),
      "utf8",
    );
    expect(rulesReadme).toMatch(/# fresh 项目级规则/);
    const overview = readFileSync(
      join(projDir, "knowledge", "overview.md"),
      "utf8",
    );
    expect(overview).toMatch(/# fresh 业务概览/);
    expect(existsSync(join(projDir, "knowledge")).toBeTruthy());
    const indexContent = readFileSync(
      join(projDir, "knowledge", "_index.md"),
      "utf8",
    );
    expect(indexContent).toMatch(/last-indexed/);
    const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    expect(cfg.projects.fresh).toEqual({ repo_profiles: {} });
  });

  it("is idempotent: second run returns skipped=true and does not touch disk", () => {
    runCp(["create", "--project", "again", "--confirmed"]);
    const overviewPath = join(
      WORKSPACE_DIR,
      "again",
      "knowledge",
      "overview.md",
    );
    const before = readFileSync(overviewPath, "utf8");

    const { stdout, code } = runCp([
      "create",
      "--project",
      "again",
      "--confirmed",
    ]);
    expect(code).toBe(0);
    const data = JSON.parse(stdout);
    expect(data.skipped).toBe(true);
    const after = readFileSync(overviewPath, "utf8");
    expect(after).toBe(before);
  });

  it("preserves user-edited files during partial repair", () => {
    runCp(["create", "--project", "partial", "--confirmed"]);
    const overviewPath = join(
      WORKSPACE_DIR,
      "partial",
      "knowledge",
      "overview.md",
    );
    // Write content with a frontmatter block so knowledge-keeper index will not
    // auto-fix it — the test intent is to verify create-project does NOT
    // overwrite existing files, not to freeze the exact byte content.
    const userContent =
      "---\ntitle: user-customised\ntype: overview\ntags: []\nconfidence: high\nsource: \"\"\nupdated: 2026-04-18\n---\n\n# user-customised content";
    writeFileSync(overviewPath, userContent);
    rmSync(join(WORKSPACE_DIR, "partial", "knowledge", "modules"), {
      recursive: true,
    });

    const { stdout, code } = runCp([
      "create",
      "--project",
      "partial",
      "--confirmed",
    ]);
    expect(code).toBe(0);
    const data = JSON.parse(stdout);
    expect(Array.isArray(data.created_dirs)).toBeTruthy();
    expect(data.created_dirs.some((p: string) => p.endsWith("knowledge/modules"))).toBeTruthy();
    const content = readFileSync(overviewPath, "utf8");
    // create-project must not have replaced user content with the template
    expect(
      !content.includes("partial 业务概览").toBeTruthy(),
      "overview.md must not be overwritten with template content",
    );
    expect(
      content.includes("user-customised").toBeTruthy(),
      "overview.md must still contain user content",
    );
  });

  it("renames legacy historys/ → history/ on repair", () => {
    const projDir = join(WORKSPACE_DIR, "legacyProj");
    mkdirSync(join(projDir, "historys"), { recursive: true });
    writeFileSync(join(projDir, "historys", "old-notes.md"), "legacy data");

    const { stdout, code } = runCp([
      "create",
      "--project",
      "legacyProj",
      "--confirmed",
    ]);
    expect(code).toBe(0);
    const data = JSON.parse(stdout);
    expect(data.legacy_renamed).toBe(true);
    expect(data.legacy_conflict).toBe(false);
    expect(existsSync(join(projDir).toBe("history")), true);
    expect(existsSync(join(projDir).toBe("historys")), false);
    // Legacy content is preserved
    expect(
      readFileSync(join(projDir).toBe("history"), "utf8"),
      "legacy data",
    );
  });

  it("flags conflict without clobbering when both historys/ and history/ coexist", () => {
    const projDir = join(WORKSPACE_DIR, "bothDirs");
    mkdirSync(join(projDir, "historys"), { recursive: true });
    mkdirSync(join(projDir, "history"), { recursive: true });
    writeFileSync(join(projDir, "historys", "legacy.md"), "legacy");
    writeFileSync(join(projDir, "history", "current.md"), "current");

    const { stdout, code } = runCp([
      "create",
      "--project",
      "bothDirs",
      "--confirmed",
    ]);
    expect(code).toBe(0);
    const data = JSON.parse(stdout);
    expect(data.legacy_renamed).toBe(false);
    expect(data.legacy_conflict).toBe(true);
    // Both survive intact
    expect(existsSync(join(projDir).toBe("historys")), true);
    expect(existsSync(join(projDir).toBe("history")), true);
  });

  it("registers config.json alongside other existing projects", () => {
    writeFileSync(
      CONFIG_PATH,
      JSON.stringify(
        {
          projects: {
            prior: { repo_profiles: { foo: { repos: [] } } },
          },
          otherKey: "keep",
        },
        null,
        2,
      ),
    );
    const { code } = runCp(["create", "--project", "newOne", "--confirmed"]);
    expect(code).toBe(0);
    const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    expect(cfg.projects.prior).toEqual({
      repo_profiles: { foo: { repos: [] } },
    });
    expect(cfg.projects.newOne).toEqual({ repo_profiles: {} });
    expect(cfg.otherKey).toBe("keep");
  });
});

describe("create-project clone-repo", () => {
  const BARE_DIR = join(TMP, "bare");
  const BARE_REPO = join(BARE_DIR, "demo.git");

  beforeEach(() => {
    resetFixture();
    mkdirSync(BARE_DIR, { recursive: true });
    execSync(`git init --bare "${BARE_REPO}"`);
    const wt = join(TMP, "seed-wt");
    execSync(`git init "${wt}"`);
    execSync(
      `cd "${wt}" && git config user.email test@local && git config user.name test && echo hello > a.txt && git add a.txt && git commit -m seed && git branch -M main && git remote add origin "file://${BARE_REPO}" && git push origin main`,
      { shell: "/bin/bash" },
    );
    rmSync(wt, { recursive: true, force: true });
  });

  afterEach(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => {
    const barePreserve = readFileSync(CONFIG_PATH, "utf8");
    void barePreserve;
  });

  it("rejects if project does not exist", () => {
    rmSync(join(WORKSPACE_DIR, "noproj"), { recursive: true, force: true });
    const { stderr, code } = runCp([
      "clone-repo",
      "--project",
      "noproj",
      "--url",
      `file://${BARE_REPO}`,
    ]);
    expect(code).toBe(1);
    expect(stderr).toMatch(/project not found|does not exist/i);
  });

  it("clones bare repo into .repos/<group>/<repo>", () => {
    runCp(["create", "--project", "withRepo", "--confirmed"]);

    const { stdout, code } = runCp([
      "clone-repo",
      "--project",
      "withRepo",
      "--url",
      `file://${BARE_REPO}`,
    ]);
    expect(code).toBe(0);
    const data = JSON.parse(stdout);
    expect(data.project).toBe("withRepo");
    expect(data.repo).toBe("demo");
    expect(data.branch).toBe("main");
    expect(data.local_path.endsWith("/demo")).toBeTruthy();
    expect(existsSync(join(data.local_path)).toBeTruthy(), "cloned .git exists");
  });

  it("rejects when repo already cloned at target path", () => {
    const { stderr, code } = runCp([
      "clone-repo",
      "--project",
      "withRepo",
      "--url",
      `file://${BARE_REPO}`,
    ]);
    expect(code).toBe(1);
    expect(stderr).toMatch(/already cloned/i);
  });
});
