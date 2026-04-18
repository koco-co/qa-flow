import assert from "node:assert/strict";
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
import { after, before, beforeEach, describe, it } from "node:test";

const TMP = join(tmpdir(), `qa-flow-cp-int-${process.pid}`);
const WORKSPACE_DIR = join(TMP, "workspace");
const CONFIG_PATH = join(TMP, "config.json");
const REPO_ROOT = resolve(import.meta.dirname, "../../..");

function runCp(
  args: string[],
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "bun",
      ["run", ".claude/scripts/create-project.ts", ...args],
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
  before(() => resetFixture());
  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("returns will_create plan without touching disk", () => {
    const { stdout, code } = runCp([
      "create",
      "--project",
      "newProj",
      "--dry-run",
    ]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.dry_run, true);
    assert.equal(data.will_register, true);
    assert.equal(data.will_call_index, true);
    assert.ok(Array.isArray(data.will_create.dirs));
    assert.ok(Array.isArray(data.will_create.files));
    assert.ok(Array.isArray(data.will_create.gitkeeps));
    assert.equal(data.will_create.dirs.length, 13);
    // Disk must remain untouched
    assert.equal(existsSync(join(WORKSPACE_DIR, "newProj")), false);
    // Config must remain unchanged
    const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    assert.deepEqual(cfg, { projects: {} });
  });

  it("dry-run rejects invalid name with exit 1", () => {
    const { stderr, code } = runCp([
      "create",
      "--project",
      "1bad",
      "--dry-run",
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /Invalid project name/);
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
      ".temp",
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
      ".temp",
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
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.skipped, true);
  });

  it("returns exit 2 when missing --confirmed and diff exists", () => {
    const { stderr, code } = runCp(["create", "--project", "newProj"]);
    assert.equal(code, 2);
    assert.match(stderr, /--confirmed/);
  });
});

describe("create-project scan", () => {
  before(() => resetFixture());
  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("rejects invalid project name", () => {
    const { stderr, code } = runCp(["scan", "--project", "1invalid"]);
    assert.equal(code, 1);
    assert.match(stderr, /\[create-project\] Invalid project name/);
  });

  it("reports non-existent project with all missing", () => {
    const { stdout, code } = runCp(["scan", "--project", "ghost"]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.project, "ghost");
    assert.equal(data.valid_name, true);
    assert.equal(data.exists, false);
    assert.equal(data.skeleton_complete, false);
    assert.equal(data.missing_dirs.length, 13);
    assert.equal(data.missing_gitkeeps.length, 11);
    assert.equal(data.missing_files.length, 3);
    assert.equal(data.config_registered, false);
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
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.config_registered, true);
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
      ".temp",
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
      ".temp",
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
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.exists, true);
    assert.equal(data.skeleton_complete, true);
    assert.equal(data.missing_dirs.length, 0);
    assert.equal(data.missing_files.length, 0);
    assert.equal(data.missing_gitkeeps.length, 0);
  });
});

describe("create-project create --confirmed", () => {
  before(() => resetFixture());
  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("materialises full skeleton end-to-end", () => {
    const { stdout, code } = runCp([
      "create",
      "--project",
      "fresh",
      "--confirmed",
    ]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.project, "fresh");
    assert.equal(data.registered_config, true);
    assert.equal(data.index_generated, true);
    assert.ok(data.index_path.endsWith("knowledge/_index.md"));

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
      ".temp",
    ]) {
      assert.ok(existsSync(join(projDir, d)), `dir missing: ${d}`);
    }
    assert.ok(existsSync(join(projDir, "prds", ".gitkeep")));
    assert.ok(existsSync(join(projDir, "knowledge", "modules", ".gitkeep")));
    const rulesReadme = readFileSync(
      join(projDir, "rules", "README.md"),
      "utf8",
    );
    assert.match(rulesReadme, /# fresh 项目级规则/);
    const overview = readFileSync(
      join(projDir, "knowledge", "overview.md"),
      "utf8",
    );
    assert.match(overview, /# fresh 业务概览/);
    assert.ok(existsSync(join(projDir, "knowledge", "_index.md")));
    const indexContent = readFileSync(
      join(projDir, "knowledge", "_index.md"),
      "utf8",
    );
    assert.match(indexContent, /last-indexed/);
    const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    assert.deepEqual(cfg.projects.fresh, { repo_profiles: {} });
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
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.skipped, true);
    const after = readFileSync(overviewPath, "utf8");
    assert.equal(after, before, "overview.md must not change on second run");
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
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data.created_dirs));
    assert.ok(data.created_dirs.some((p: string) => p.endsWith("knowledge/modules")));
    const content = readFileSync(overviewPath, "utf8");
    // create-project must not have replaced user content with the template
    assert.ok(
      !content.includes("partial 业务概览"),
      "overview.md must not be overwritten with template content",
    );
    assert.ok(
      content.includes("user-customised"),
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
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.legacy_renamed, true);
    assert.equal(data.legacy_conflict, false);
    assert.equal(existsSync(join(projDir, "history")), true);
    assert.equal(existsSync(join(projDir, "historys")), false);
    // Legacy content is preserved
    assert.equal(
      readFileSync(join(projDir, "history", "old-notes.md"), "utf8"),
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
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.legacy_renamed, false);
    assert.equal(data.legacy_conflict, true);
    // Both survive intact
    assert.equal(existsSync(join(projDir, "historys", "legacy.md")), true);
    assert.equal(existsSync(join(projDir, "history", "current.md")), true);
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
    assert.equal(code, 0);
    const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    assert.deepEqual(cfg.projects.prior, {
      repo_profiles: { foo: { repos: [] } },
    });
    assert.deepEqual(cfg.projects.newOne, { repo_profiles: {} });
    assert.equal(cfg.otherKey, "keep");
  });
});

describe("create-project clone-repo", () => {
  const BARE_DIR = join(TMP, "bare");
  const BARE_REPO = join(BARE_DIR, "demo.git");

  before(() => {
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

  after(() => rmSync(TMP, { recursive: true, force: true }));
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
    assert.equal(code, 1);
    assert.match(stderr, /project not found|does not exist/i);
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
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.project, "withRepo");
    assert.equal(data.repo, "demo");
    assert.equal(data.branch, "main");
    assert.ok(data.local_path.endsWith("/demo"));
    assert.ok(existsSync(join(data.local_path, ".git")), "cloned .git exists");
  });

  it("rejects when repo already cloned at target path", () => {
    const { stderr, code } = runCp([
      "clone-repo",
      "--project",
      "withRepo",
      "--url",
      `file://${BARE_REPO}`,
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /already cloned/i);
  });
});
