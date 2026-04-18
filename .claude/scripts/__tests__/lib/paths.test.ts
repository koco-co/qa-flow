import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  currentYYYYMM,
  parseGitUrl,
  projectDir,
  projectPath,
  xmindDir,
  xmindPath,
  archiveDir,
  prdsDir,
  issuesDir,
  reportsDir,
  testsDir,
  reposDir,
  tempDir,
  projectRulesDir,
  knowledgeDir,
  knowledgePath,
  knowledgeModulesDir,
  knowledgePitfallsDir,
  plansDir,
  planPath,
  listProjects,
  repoRoot,
  scriptsDir,
  skillsDir,
} from "../../lib/paths.ts";

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
    assert.equal(result.group, "team");
    assert.equal(result.repo, "service");
  });

  it("extracts from https git URL with .git suffix", () => {
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

describe("projectDir", () => {
  it("returns workspace/{project} under repoRoot", () => {
    const dir = projectDir("dataAssets");
    const root = repoRoot();
    assert.equal(dir, join(root, "workspace", "dataAssets"));
  });

  it("works with different project names", () => {
    const dir = projectDir("xyzh");
    assert.ok(dir.endsWith("workspace/xyzh"));
  });
});

describe("projectPath", () => {
  it("joins segments under project dir", () => {
    const p = projectPath("dataAssets", "prds", "202604");
    assert.ok(p.endsWith("workspace/dataAssets/prds/202604"));
  });
});

describe("xmindDir", () => {
  it("returns workspace/{project}/xmind", () => {
    const dir = xmindDir("dataAssets");
    assert.ok(dir.endsWith("workspace/dataAssets/xmind"));
  });
});

describe("xmindPath", () => {
  it("joins segments under xmind dir", () => {
    const p = xmindPath("dataAssets", "202604", "test.xmind");
    assert.ok(p.endsWith("workspace/dataAssets/xmind/202604/test.xmind"));
  });
});

describe("archiveDir", () => {
  it("returns workspace/{project}/archive", () => {
    const dir = archiveDir("dataAssets");
    assert.ok(dir.endsWith("workspace/dataAssets/archive"));
  });
});

describe("prdsDir", () => {
  it("returns workspace/{project}/prds", () => {
    const dir = prdsDir("xyzh");
    assert.ok(dir.endsWith("workspace/xyzh/prds"));
  });
});

describe("issuesDir", () => {
  it("returns workspace/{project}/issues", () => {
    const dir = issuesDir("dataAssets");
    assert.ok(dir.endsWith("workspace/dataAssets/issues"));
  });
});

describe("reportsDir", () => {
  it("returns workspace/{project}/reports", () => {
    const dir = reportsDir("dataAssets");
    assert.ok(dir.endsWith("workspace/dataAssets/reports"));
  });
});

describe("testsDir", () => {
  it("returns workspace/{project}/tests", () => {
    const dir = testsDir("dataAssets");
    assert.ok(dir.endsWith("workspace/dataAssets/tests"));
  });
});

describe("reposDir", () => {
  it("returns workspace/{project}/.repos", () => {
    const dir = reposDir("dataAssets");
    assert.ok(dir.endsWith("workspace/dataAssets/.repos"));
  });
});

describe("tempDir", () => {
  it("returns workspace/{project}/.temp", () => {
    const dir = tempDir("xyzh");
    assert.ok(dir.endsWith("workspace/xyzh/.temp"));
  });
});

describe("projectRulesDir", () => {
  it("returns workspace/{project}/rules", () => {
    const dir = projectRulesDir("dataAssets");
    assert.ok(dir.endsWith("workspace/dataAssets/rules"));
  });
});

describe("knowledgeDir", () => {
  it("returns <workspace>/<project>/knowledge", () => {
    const dir = knowledgeDir("dataAssets");
    assert.ok(dir.endsWith("workspace/dataAssets/knowledge"), `got: ${dir}`);
  });
});

describe("knowledgePath", () => {
  it("joins segments under knowledge dir", () => {
    const p = knowledgePath("dataAssets", "modules", "data-source.md");
    assert.ok(p.endsWith("workspace/dataAssets/knowledge/modules/data-source.md"), `got: ${p}`);
  });

  it("returns knowledge dir itself when no segments", () => {
    const p = knowledgePath("dataAssets");
    assert.ok(p.endsWith("workspace/dataAssets/knowledge"), `got: ${p}`);
  });
});

describe("knowledgeModulesDir", () => {
  it("returns <knowledge>/modules", () => {
    const dir = knowledgeModulesDir("dataAssets");
    assert.ok(dir.endsWith("workspace/dataAssets/knowledge/modules"), `got: ${dir}`);
  });
});

describe("knowledgePitfallsDir", () => {
  it("returns <knowledge>/pitfalls", () => {
    const dir = knowledgePitfallsDir("dataAssets");
    assert.ok(dir.endsWith("workspace/dataAssets/knowledge/pitfalls"), `got: ${dir}`);
  });
});

describe("plansDir", () => {
  it("returns workspace/{project}/prds/{yyyymm}", () => {
    const dir = plansDir("dataAssets", "202604");
    assert.ok(dir.endsWith("workspace/dataAssets/prds/202604"), `got: ${dir}`);
  });

  it("nests under prdsDir for the given project", () => {
    const dir = plansDir("xyzh", "202512");
    const root = repoRoot();
    assert.equal(dir, join(root, "workspace", "xyzh", "prds", "202512"));
  });
});

describe("planPath", () => {
  it("returns {plansDir}/{slug}.plan.md", () => {
    const p = planPath("dataAssets", "202604", "15695-quality-check");
    assert.ok(
      p.endsWith("workspace/dataAssets/prds/202604/15695-quality-check.plan.md"),
      `got: ${p}`,
    );
  });

  it("preserves slug verbatim including dashes and digits", () => {
    const p = planPath("dataAssets", "202604", "abc-123-xyz");
    assert.ok(p.endsWith("abc-123-xyz.plan.md"), `got: ${p}`);
  });
});

describe("listProjects", () => {
  it("returns an array", () => {
    const projects = listProjects();
    assert.ok(Array.isArray(projects));
  });

  it("does not include dot-prefixed directories", () => {
    const projects = listProjects();
    for (const p of projects) {
      assert.ok(!p.startsWith("."), `${p} should not start with dot`);
    }
  });
});
