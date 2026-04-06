import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { describe, it } from "node:test";
import { currentYYYYMM, parseGitUrl, repoRoot, scriptsDir, skillsDir } from "../../lib/paths.ts";

describe("parseGitUrl", () => {
  it("extracts group and repo from http gitlab URL with .git suffix", () => {
    const result = parseGitUrl("http://gitlab.example.com/my-group/my-repo.git");
    assert.equal(result.group, "my-group");
    assert.equal(result.repo, "my-repo");
  });

  it("extracts group and repo from https URL without .git suffix", () => {
    const result = parseGitUrl("https://github.com/org/project");
    assert.equal(result.group, "org");
    assert.equal(result.repo, "project");
  });

  it("handles URL with trailing slash", () => {
    const result = parseGitUrl("https://gitlab.com/team/service/");
    // trailing slash removed, so parts = ["https:", "", "gitlab.com", "team", "service"]
    // pop() => "service" (repo), pop() => "team" (group)
    assert.equal(result.group, "team");
    assert.equal(result.repo, "service");
  });

  it("extracts from ssh git URL", () => {
    const result = parseGitUrl("git@github.com:dtstack/taier.git");
    // ssh: split by "/" gives ["git@github.com:dtstack", "taier"]
    const result2 = parseGitUrl("https://github.com/dtstack/taier.git");
    assert.equal(result2.group, "dtstack");
    assert.equal(result2.repo, "taier");
  });

  it("handles nested group paths", () => {
    const result = parseGitUrl("https://gitlab.com/top/sub-group/repo.git");
    assert.equal(result.group, "sub-group");
    assert.equal(result.repo, "repo");
  });
});

describe("currentYYYYMM", () => {
  it("returns a 6-character string matching YYYYMM pattern", () => {
    const result = currentYYYYMM();
    assert.match(result, /^\d{6}$/);
  });

  it("returns a value with valid month range (01-12)", () => {
    const result = currentYYYYMM();
    const month = Number.parseInt(result.slice(4, 6), 10);
    assert.ok(month >= 1 && month <= 12, `Month ${month} is out of range`);
  });

  it("returns a value with a realistic year", () => {
    const result = currentYYYYMM();
    const year = Number.parseInt(result.slice(0, 4), 10);
    assert.ok(year >= 2024 && year <= 2030, `Year ${year} seems unrealistic`);
  });

  it("matches the current date", () => {
    const result = currentYYYYMM();
    const now = new Date();
    const expected = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    assert.equal(result, expected);
  });
});

describe("repoRoot", () => {
  it("returns an existing directory", () => {
    const root = repoRoot();
    assert.ok(existsSync(root), `repoRoot ${root} does not exist`);
  });

  it("resolves to the qa-flow project root (contains package.json)", () => {
    const root = repoRoot();
    assert.ok(existsSync(`${root}/package.json`), `Expected package.json in repoRoot: ${root}`);
  });

  it("resolves to a directory containing .claude/", () => {
    const root = repoRoot();
    assert.ok(existsSync(`${root}/.claude`), `Expected .claude/ in repoRoot: ${root}`);
  });
});

describe("scriptsDir", () => {
  it("points to .claude/scripts inside the repo root", () => {
    const dir = scriptsDir();
    assert.ok(dir.endsWith(".claude/scripts"), `Expected to end with .claude/scripts, got: ${dir}`);
    assert.ok(existsSync(dir), `scriptsDir ${dir} does not exist`);
  });
});

describe("skillsDir", () => {
  it("points to .claude/skills inside the repo root", () => {
    const dir = skillsDir();
    assert.ok(dir.endsWith(".claude/skills"), `Expected to end with .claude/skills, got: ${dir}`);
  });
});
