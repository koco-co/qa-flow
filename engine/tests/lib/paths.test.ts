import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "bun:test";
import {
  currentYYYYMM,
  enhancedMd,
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
  probeCacheDir,
  probeCachePath,
  projectRulesDir,
  knowledgeDir,
  knowledgePath,
  knowledgeModulesDir,
  knowledgePitfallsDir,
  listProjects,
  repoRoot,
  scriptsDir,
  skillsDir,
} from "../../src/lib/paths.ts";

import {
  featureDir,
  featureFile,
  incidentDir,
  projectShared,
  regressionDir,
} from "../../src/lib/paths.ts";

describe("parseGitUrl", () => {
  it("extracts group and repo from http gitlab URL with .git suffix", () => {
    const result = parseGitUrl("http://gitlab.example.com/my-group/my-repo.git");
    expect(result.group).toBe("my-group");
    expect(result.repo).toBe("my-repo");
  });

  it("extracts group and repo from https URL without .git suffix", () => {
    const result = parseGitUrl("https://github.com/org/project");
    expect(result.group).toBe("org");
    expect(result.repo).toBe("project");
  });

  it("handles URL with trailing slash", () => {
    const result = parseGitUrl("https://gitlab.com/team/service/");
    expect(result.group).toBe("team");
    expect(result.repo).toBe("service");
  });

  it("extracts from https git URL with .git suffix", () => {
    const result2 = parseGitUrl("https://github.com/dtstack/taier.git");
    expect(result2.group).toBe("dtstack");
    expect(result2.repo).toBe("taier");
  });

  it("handles nested group paths", () => {
    const result = parseGitUrl("https://gitlab.com/top/sub-group/repo.git");
    expect(result.group).toBe("sub-group");
    expect(result.repo).toBe("repo");
  });
});

describe("currentYYYYMM", () => {
  it("returns a 6-character string matching YYYYMM pattern", () => {
    const result = currentYYYYMM();
    expect(result).toMatch(/^\d{6}$/);
  });

  it("returns a value with valid month range (01-12)", () => {
    const result = currentYYYYMM();
    const month = Number.parseInt(result.slice(4, 6), 10);
    expect(month >= 1 && month <= 12, `Month ${month} is out of range`).toBeTruthy();
  });

  it("returns a value with a realistic year", () => {
    const result = currentYYYYMM();
    const year = Number.parseInt(result.slice(0, 4), 10);
    expect(year >= 2024 && year <= 2030, `Year ${year} seems unrealistic`).toBeTruthy();
  });

  it("matches the current date", () => {
    const result = currentYYYYMM();
    const now = new Date();
    const expected = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    expect(result).toBe(expected);
  });
});

describe("repoRoot", () => {
  it("returns an existing directory", () => {
    const root = repoRoot();
    expect(existsSync(root).toBeTruthy(), `repoRoot ${root} does not exist`);
  });

  it("resolves to the kata project root (contains package.json)", () => {
    const root = repoRoot();
    expect(existsSync(`${root}/package.json`).toBeTruthy(), `Expected package.json in repoRoot: ${root}`);
  });

  it("resolves to a directory containing .claude/", () => {
    const root = repoRoot();
    expect(existsSync(`${root}/.claude`).toBeTruthy(), `Expected .claude/ in repoRoot: ${root}`);
  });
});

describe("scriptsDir", () => {
  it("points to engine/src inside the repo root", () => {
    const dir = scriptsDir();
    expect(dir.endsWith("engine/src").toBeTruthy(), `Expected to end with engine/src, got: ${dir}`);
    expect(existsSync(dir).toBeTruthy(), `scriptsDir ${dir} does not exist`);
  });
});

describe("skillsDir", () => {
  it("points to .claude/skills inside the repo root", () => {
    const dir = skillsDir();
    expect(dir.endsWith(".claude/skills").toBeTruthy(), `Expected to end with .claude/skills, got: ${dir}`);
  });
});

describe("projectDir", () => {
  it("returns workspace/{project} under repoRoot", () => {
    const dir = projectDir("dataAssets");
    const root = repoRoot();
    expect(dir).toBe(join(root, "workspace"));
  });

  it("works with different project names", () => {
    const dir = projectDir("xyzh");
    expect(dir.endsWith("workspace/xyzh")).toBeTruthy();
  });
});

describe("projectPath", () => {
  it("joins segments under project dir", () => {
    const p = projectPath("dataAssets", "prds", "202604");
    expect(p.endsWith("workspace/dataAssets/prds/202604")).toBeTruthy();
  });
});

describe("xmindDir", () => {
  it("returns workspace/{project}/xmind", () => {
    const dir = xmindDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/xmind")).toBeTruthy();
  });
});

describe("xmindPath", () => {
  it("joins segments under xmind dir", () => {
    const p = xmindPath("dataAssets", "202604", "test.xmind");
    expect(p.endsWith("workspace/dataAssets/xmind/202604/test.xmind")).toBeTruthy();
  });
});

describe("archiveDir", () => {
  it("returns workspace/{project}/archive", () => {
    const dir = archiveDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/archive")).toBeTruthy();
  });
});

describe("prdsDir", () => {
  it("returns workspace/{project}/prds", () => {
    const dir = prdsDir("xyzh");
    expect(dir.endsWith("workspace/xyzh/prds")).toBeTruthy();
  });
});

describe("issuesDir", () => {
  it("returns workspace/{project}/issues", () => {
    const dir = issuesDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/issues")).toBeTruthy();
  });
});

describe("reportsDir", () => {
  it("returns workspace/{project}/reports", () => {
    const dir = reportsDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/reports")).toBeTruthy();
  });
});

describe("testsDir", () => {
  it("returns workspace/{project}/tests", () => {
    const dir = testsDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/tests")).toBeTruthy();
  });
});

describe("reposDir", () => {
  it("returns workspace/{project}/.repos", () => {
    const dir = reposDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/.repos")).toBeTruthy();
  });
});

describe("tempDir", () => {
  it("returns .kata/{project}", () => {
    const dir = tempDir("xyzh");
    expect(dir.endsWith(".kata/xyzh")).toBeTruthy();
  });
});

describe("probeCacheDir", () => {
  it("returns .kata/{project}/probe-cache", () => {
    const dir = probeCacheDir("dataAssets");
    expect(dir.endsWith(".kata/dataAssets/probe-cache")).toBeTruthy();
  });
});

describe("probeCachePath", () => {
  it("returns .kata/{project}/probe-cache/{prdSlug}.json", () => {
    const path = probeCachePath("dataAssets", "15695-quality");
    expect(path.endsWith(".kata/dataAssets/probe-cache/15695-quality.json")).toBeTruthy();
  });

  it("preserves slug verbatim including dashes and digits", () => {
    const path = probeCachePath("xyzh", "abc-123-xyz");
    expect(path.endsWith(".kata/xyzh/probe-cache/abc-123-xyz.json")).toBeTruthy();
  });
});

describe("projectRulesDir", () => {
  it("returns workspace/{project}/rules", () => {
    const dir = projectRulesDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/rules")).toBeTruthy();
  });
});

describe("knowledgeDir", () => {
  it("returns <workspace>/<project>/knowledge", () => {
    const dir = knowledgeDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/knowledge").toBeTruthy(), `got: ${dir}`);
  });
});

describe("knowledgePath", () => {
  it("joins segments under knowledge dir", () => {
    const p = knowledgePath("dataAssets", "modules", "data-source.md");
    expect(p.endsWith("workspace/dataAssets/knowledge/modules/data-source.md").toBeTruthy(), `got: ${p}`);
  });

  it("returns knowledge dir itself when no segments", () => {
    const p = knowledgePath("dataAssets");
    expect(p.endsWith("workspace/dataAssets/knowledge").toBeTruthy(), `got: ${p}`);
  });
});

describe("knowledgeModulesDir", () => {
  it("returns <knowledge>/modules", () => {
    const dir = knowledgeModulesDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/knowledge/modules").toBeTruthy(), `got: ${dir}`);
  });
});

describe("knowledgePitfallsDir", () => {
  it("returns <knowledge>/pitfalls", () => {
    const dir = knowledgePitfallsDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/knowledge/pitfalls").toBeTruthy(), `got: ${dir}`);
  });
});

describe("listProjects", () => {
  it("returns an array", () => {
    const projects = listProjects();
    expect(Array.isArray(projects)).toBeTruthy();
  });

  it("does not include dot-prefixed directories", () => {
    const projects = listProjects();
    for (const p of projects) {
      expect(!p.startsWith(".").toBeTruthy(), `${p} should not start with dot`);
    }
  });
});

describe("featureDir / featureFile (new v3 API)", () => {
  test("featureDir returns workspace/{p}/features/{ym}-{slug}/", () => {
    const result = featureDir("dataAssets", "202604", "【test】slug-with-中文");
    expect(result).toMatch(/workspace\/dataAssets\/features\/202604-【test】slug-with-中文$/);
  });

  test("featureFile joins additional segments", () => {
    const result = featureFile("dataAssets", "202604", "myslug", "tests", "t01.ts");
    expect(result).toMatch(/workspace\/dataAssets\/features\/202604-myslug\/tests\/t01\.ts$/);
  });

  test("featureFile with single segment returns file inside feature dir", () => {
    const result = featureFile("dataAssets", "202604", "myslug", "archive.md");
    expect(result).toMatch(/workspace\/dataAssets\/features\/202604-myslug\/archive\.md$/);
  });
});

describe("projectShared (new v3 API)", () => {
  test("projectShared returns workspace/{p}/shared/{kind}/...", () => {
    const result = projectShared("dataAssets", "fixtures", "auth", "session.json");
    expect(result).toMatch(/workspace\/dataAssets\/shared\/fixtures\/auth\/session\.json$/);
  });

  test("projectShared with no segments returns the kind dir", () => {
    const result = projectShared("dataAssets", "helpers");
    expect(result).toMatch(/workspace\/dataAssets\/shared\/helpers$/);
  });
});

describe("incidentDir / regressionDir (new v3 API)", () => {
  test("incidentDir returns workspace/{p}/incidents/{date}-{slug}/", () => {
    const result = incidentDir("dataAssets", "20260428", "console-error");
    expect(result).toMatch(/workspace\/dataAssets\/incidents\/20260428-console-error$/);
  });

  test("regressionDir returns workspace/{p}/regressions/{date}-{batch}/", () => {
    const result = regressionDir("dataAssets", "20260428", "smoke");
    expect(result).toMatch(/workspace\/dataAssets\/regressions\/20260428-smoke$/);
  });
});

describe("deprecated alias: enhancedMd routes to feature path", () => {
  test("enhancedMd returns features/{ym}-{slug}/enhanced.md (post-v3 redirect)", () => {
    const result = enhancedMd("dataAssets", "202604", "myslug");
    expect(result).toMatch(/workspace\/dataAssets\/features\/202604-myslug\/enhanced\.md$/);
  });
});
