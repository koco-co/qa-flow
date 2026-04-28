import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, it, expect } from "bun:test";
import { parseFrontMatter } from "../src/lib/frontmatter.js";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const FIXTURE = join(import.meta.dirname, "fixtures/sample-cases.json");
const TMP_DIR = join(tmpdir(), `kata-archive-test-${process.pid}`);

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "kata-cli",
      ["archive-gen", ...args],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
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

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

// ─── convert subcommand ───────────────────────────────────────────────────────

describe("archive-gen.ts convert — generates valid Markdown with front-matter", () => {
  it("exits with code 0 and outputs JSON result", () => {
    const output = join(TMP_DIR, "test-convert.md");
    const { code, stdout, stderr } = run([
      "convert",
      "--input",
      FIXTURE,
      "--output",
      output,
    ]);
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as {
      output_path: string;
      case_count: number;
      module_count: number;
    };
    expect(
      result.output_path.endsWith("test-convert.md").toBeTruthy(),
      "output_path should end with .md",
    );
    expect(
      typeof result.case_count === "number",
      "case_count should be a number",
    ).toBeTruthy();
    expect(
      typeof result.module_count === "number",
      "module_count should be a number",
    ).toBeTruthy();
  });
});

describe("archive-gen.ts convert — correct suite_name in front-matter", () => {
  it("generated MD has suite_name matching meta.requirement_name", () => {
    const output = join(TMP_DIR, "test-suitename.md");
    const { code, stderr } = run([
      "convert",
      "--input",
      FIXTURE,
      "--output",
      output,
    ]);
    expect(code).toBe(0);

    const content = readFileSync(output, "utf8");
    const { frontMatter } = parseFrontMatter(content);

    expect(
      frontMatter.suite_name).toBe("质量问题台账");
  });
});

describe("archive-gen.ts convert — correct case_count", () => {
  it("generated MD case_count matches total test cases in JSON (5)", () => {
    const output = join(TMP_DIR, "test-casecount.md");
    const { code, stdout, stderr } = run([
      "convert",
      "--input",
      FIXTURE,
      "--output",
      output,
    ]);
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as { case_count: number };
    // 3 sub_group cases (搜索筛选) + 1 page-level (列表页) + 1 page-level (新增页) = 5
    expect(result.case_count).toBe(5);

    const content = readFileSync(output, "utf8");
    const { frontMatter } = parseFrontMatter(content);
    expect(
      frontMatter.case_count).toBe(5);
  });
});

describe("archive-gen.ts convert — H2/H3/H4/H5 body structure", () => {
  it("generated MD body has correct heading hierarchy", () => {
    const output = join(TMP_DIR, "test-structure.md");
    const { code, stderr } = run([
      "convert",
      "--input",
      FIXTURE,
      "--output",
      output,
    ]);
    expect(code).toBe(0);

    const content = readFileSync(output, "utf8");
    const { body } = parseFrontMatter(content);

    // H2 — module
    expect(body).toMatch(/^## 质量问题台账/m);
    // H3 — page
    expect(body).toMatch(/^### 列表页/m);
    expect(body).toMatch(/^### 新增页/m);
    // H4 — sub_group
    expect(body).toMatch(/^#### 搜索筛选/m);
    // H5 — test case with priority prefix
    expect(
      body).toMatch(/^##### 【P0】验证默认加载列表页/m);
    expect(
      body).toMatch(/^##### 【P1】验证按问题类型筛选/m);
    expect(
      body).toMatch(/^##### 【P0】验证填写完整表单后成功提交/m);
  });
});

describe("archive-gen.ts convert — strips duplicate priority prefix", () => {
  it("removes existing 【P0】/【P1】 prefix from title before prepending", () => {
    // Build a fixture whose titles already carry 【P0】 / 【P1】 prefixes
    // (this mirrors what writer-agent produces in real intermediate JSON).
    const rawFixture = JSON.parse(readFileSync(FIXTURE, "utf8")) as {
      modules: Array<{
        pages: Array<{
          sub_groups?: Array<{ test_cases: Array<{ priority: string; title: string }> }>;
          test_cases?: Array<{ priority: string; title: string }>;
        }>;
      }>;
    };
    for (const mod of rawFixture.modules) {
      for (const page of mod.pages) {
        for (const sg of page.sub_groups ?? []) {
          for (const tc of sg.test_cases) {
            tc.title = `【${tc.priority}】${tc.title}`;
          }
        }
        for (const tc of page.test_cases ?? []) {
          tc.title = `【${tc.priority}】${tc.title}`;
        }
      }
    }

    const prefixedInput = join(TMP_DIR, "prefixed-fixture.json");
    writeFileSync(prefixedInput, JSON.stringify(rawFixture), "utf8");

    const output = join(TMP_DIR, "test-dup-prefix.md");
    const { code, stderr } = run([
      "convert",
      "--input",
      prefixedInput,
      "--output",
      output,
    ]);
    expect(code).toBe(0);

    const content = readFileSync(output, "utf8");
    expect(
      content).not.toMatch(/【P\d】【P\d】/);
    expect(
      content).toMatch(/^##### 【P0】验证默认加载列表页/m);
  });
});

describe("archive-gen.ts convert — step table format", () => {
  it("step tables have correct header format (| 编号 | 步骤 | 预期 |)", () => {
    const output = join(TMP_DIR, "test-table.md");
    const { code, stderr } = run([
      "convert",
      "--input",
      FIXTURE,
      "--output",
      output,
    ]);
    expect(code).toBe(0);

    const content = readFileSync(output, "utf8");
    const { body } = parseFrontMatter(content);

    // Table header must appear (multiple times, once per case)
    const tableHeaders = body.match(/\| 编号 \| 步骤 \| 预期 \|/g) ?? [];
    expect(
      tableHeaders.length > 0,
      "No step tables with correct header found",
    ).toBeTruthy();

    // Body has numbered rows starting with | 1 |
    expect(body).toMatch(/\| 1 \|/);

    // Separator row
    expect(body).toMatch(/\| ---- \|/);
  });

  it("precondition blocks appear before step tables", () => {
    const output = join(TMP_DIR, "test-precondition.md");
    const { code, stderr } = run([
      "convert",
      "--input",
      FIXTURE,
      "--output",
      output,
    ]);
    expect(code).toBe(0);

    const content = readFileSync(output, "utf8");
    const { body } = parseFrontMatter(content);

    // Precondition block should contain the text from the fixture
    expect(body).toMatch(/> 前置条件/);
    expect(
      body).toMatch(/环境已部署/);
  });
});

// ─── search subcommand ────────────────────────────────────────────────────────

describe("archive-gen.ts search — finds archive by suite_name keyword", () => {
  it("returns matching result for known suite_name keyword", () => {
    // Create a temp archive file with known front-matter
    const archiveDir = join(TMP_DIR, "archive-search-1");
    mkdirSync(archiveDir, { recursive: true });
    const archiveFile = join(archiveDir, "test-archive.md");
    writeFileSync(
      archiveFile,
      `---
suite_name: "质量问题台账"
description: "测试描述"
product: "data-assets"
tags:
  - "质量"
  - "台账"
create_at: "2026-04-04"
status: "草稿"
case_count: 5
origin: "xmind"
---

## 质量问题台账

### 列表页

##### 【P0】验证默认加载
`,
      "utf8",
    );

    const { code, stdout, stderr } = run([
      "search",
      "--query",
      "质量问题台账",
      "--dir",
      archiveDir,
    ]);
    expect(code).toBe(0);

    const results = JSON.parse(stdout) as Array<{
      path: string;
      suite_name: string;
      tags: string[];
      case_count: number;
    }>;
    expect(Array.isArray(results).toBeTruthy(), "search output should be an array");
    expect(results.length > 0).toBeTruthy();
    expect(
      results[0].suite_name).toBe("质量问题台账");
    expect(
      results[0].path.includes("test-archive.md").toBeTruthy(),
      "path should reference the file",
    );
    expect(
      typeof results[0].case_count === "number",
      "case_count should be a number",
    ).toBeTruthy();
  });

  it("finds archive by tags keyword", () => {
    const archiveDir = join(TMP_DIR, "archive-search-tags");
    mkdirSync(archiveDir, { recursive: true });
    writeFileSync(
      join(archiveDir, "tagged-archive.md"),
      `---
suite_name: "数据血缘功能"
description: "血缘测试"
product: "data-assets"
tags:
  - "blood-lineage"
  - "数据资产"
create_at: "2026-04-04"
status: "草稿"
case_count: 3
origin: "xmind"
---

## 血缘管理

### 血缘列表页

##### 【P1】验证血缘解析
`,
      "utf8",
    );

    const { code, stdout, stderr } = run([
      "search",
      "--query",
      "blood-lineage",
      "--dir",
      archiveDir,
    ]);
    expect(code).toBe(0);

    const results = JSON.parse(stdout) as Array<{ suite_name: string }>;
    expect(results.length > 0).toBeTruthy();
    expect(results[0].suite_name).toBe("数据血缘功能");
  });
});

describe("archive-gen.ts search — returns empty array when no match", () => {
  it("returns [] for unknown keyword", () => {
    const archiveDir = join(TMP_DIR, "archive-no-match");
    mkdirSync(archiveDir, { recursive: true });
    writeFileSync(
      join(archiveDir, "some-archive.md"),
      `---
suite_name: "商品管理"
description: "商品管理测试"
product: "shop"
tags:
  - "商品"
create_at: "2026-04-04"
status: "草稿"
case_count: 2
origin: "xmind"
---

## 商品管理

##### 【P0】验证商品列表加载
`,
      "utf8",
    );

    const { code, stdout, stderr } = run([
      "search",
      "--query",
      "xyzNonExistentKeyword12345",
      "--dir",
      archiveDir,
    ]);
    expect(code).toBe(0);

    const results = JSON.parse(stdout) as unknown[];
    expect(Array.isArray(results).toBeTruthy(), "result should be an array");
    expect(
      results.length).toBe(0);
  });

  it("returns [] when archive directory is empty", () => {
    const emptyDir = join(TMP_DIR, "archive-empty");
    mkdirSync(emptyDir, { recursive: true });

    const { code, stdout, stderr } = run([
      "search",
      "--query",
      "anything",
      "--dir",
      emptyDir,
    ]);
    expect(code).toBe(0);

    const results = JSON.parse(stdout) as unknown[];
    expect(
      results.length).toBe(0);
  });
});

describe("archive-gen.ts search — --project resolves to workspace/<project>/archive", () => {
  it("uses workspace/<project>/archive when --project is provided", () => {
    // Create a project-scoped archive directory under workspace
    const projectArchiveDir = join(
      REPO_ROOT,
      "workspace",
      "testProject",
      "archive",
    );
    mkdirSync(projectArchiveDir, { recursive: true });
    const archiveFile = join(projectArchiveDir, "project-scoped.md");
    writeFileSync(
      archiveFile,
      `---
suite_name: "项目级归档"
description: "项目级归档测试"
product: "data-assets"
project: "testProject"
tags:
  - "项目级"
create_at: "2026-04-14"
status: "草稿"
case_count: 1
origin: "xmind"
---

## 项目级归档

##### 【P0】验证项目级搜索
`,
      "utf8",
    );

    try {
      const { code, stdout, stderr } = run([
        "search",
        "--query",
        "项目级归档",
        "--project",
        "testProject",
      ]);
      expect(code).toBe(0);

      const results = JSON.parse(stdout) as Array<{
        path: string;
        suite_name: string;
      }>;
      expect(results.length > 0).toBeTruthy();
      expect(results[0].suite_name).toBe("项目级归档");
      expect(
        results[0].path.includes("testProject/archive").toBeTruthy(),
        "path should contain project-scoped archive dir",
      );
    } finally {
      // Clean up the created project archive directory
      rmSync(join(REPO_ROOT, "workspace", "testProject"), {
        recursive: true,
        force: true,
      });
    }
  });

  it("--dir overrides --project when both are provided", () => {
    const archiveDir = join(TMP_DIR, "archive-dir-override");
    mkdirSync(archiveDir, { recursive: true });
    writeFileSync(
      join(archiveDir, "override-test.md"),
      `---
suite_name: "Dir覆盖测试"
description: "测试"
product: "test"
tags:
  - "override"
create_at: "2026-04-14"
status: "草稿"
case_count: 1
origin: "xmind"
---

## Dir覆盖

##### 【P0】覆盖验证
`,
      "utf8",
    );

    const { code, stdout, stderr } = run([
      "search",
      "--query",
      "Dir覆盖测试",
      "--project",
      "nonExistentProject",
      "--dir",
      archiveDir,
    ]);
    expect(code).toBe(0);

    const results = JSON.parse(stdout) as Array<{ suite_name: string }>;
    expect(results.length > 0).toBeTruthy();
    expect(results[0].suite_name).toBe("Dir覆盖测试");
  });
});

describe("archive-gen.ts convert — --project injects project field into front-matter", () => {
  it("includes project in front-matter when --project is provided", () => {
    const output = join(TMP_DIR, "test-project-fm.md");
    const { code, stderr } = run([
      "convert",
      "--input",
      FIXTURE,
      "--output",
      output,
      "--project",
      "dataAssets",
    ]);
    expect(code).toBe(0);

    const content = readFileSync(output, "utf8");
    const { frontMatter } = parseFrontMatter(content);
    expect(
      frontMatter.project).toBe("dataAssets");
  });

  it("omits project from front-matter when --project is not provided", () => {
    const output = join(TMP_DIR, "test-no-project-fm.md");
    const { code, stderr } = run([
      "convert",
      "--input",
      FIXTURE,
      "--output",
      output,
    ]);
    expect(code).toBe(0);

    const content = readFileSync(output, "utf8");
    const { frontMatter } = parseFrontMatter(content);
    expect(
      frontMatter.project).toBe(undefined);
  });
});

describe("archive-gen.ts --help", () => {
  it("outputs usage information", () => {
    const { stdout, stderr, code } = run(["--help"]);
    const output = stdout + stderr;
    expect(code).toBe(0);
    expect(output).toMatch(/archive-gen/);
    expect(output).toMatch(/convert/);
    expect(output).toMatch(/search/);
  });
});

// ─── tag inference ──────────────────────────────────────────────────────────

describe("archive-gen.ts convert — tag inference from meta fields", () => {
  it("includes module_key, version, module names, page names, sub_group names, and prd_id in tags", () => {
    const output = join(TMP_DIR, "test-tags.md");
    const { code, stderr } = run([
      "convert",
      "--input",
      FIXTURE,
      "--output",
      output,
    ]);
    expect(code).toBe(0);

    const content = readFileSync(output, "utf8");
    const { frontMatter } = parseFrontMatter(content);
    const tags = frontMatter.tags as string[];

    expect(Array.isArray(tags).toBeTruthy(), "tags should be an array");
    expect(tags.includes("data-assets").toBeTruthy(), "tags should include module_key");
    expect(tags.includes("v6.4.10").toBeTruthy(), "tags should include version");
    expect(
      tags.includes("质量问题台账").toBeTruthy(),
      "tags should include module name",
    );
    expect(tags.includes("列表页").toBeTruthy(), "tags should include page name");
    expect(tags.includes("新增页").toBeTruthy(), "tags should include page name");
    expect(tags.includes("搜索筛选").toBeTruthy(), "tags should include sub_group name");
    expect(tags.includes("#10287").toBeTruthy(), "tags should include prd_id with # prefix");
  });

  it("extracts bracket content from requirement_name into tags", () => {
    const bracketFixture = join(TMP_DIR, "bracket-req.json");
    const data = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<
      string,
      unknown
    >;
    const meta = {
      ...(data.meta as Record<string, unknown>),
      requirement_name: "【数据质量】问题台账优化",
    };
    writeFileSync(bracketFixture, JSON.stringify({ ...data, meta }));

    const output = join(TMP_DIR, "test-bracket-tags.md");
    const { code, stderr } = run([
      "convert",
      "--input",
      bracketFixture,
      "--output",
      output,
    ]);
    expect(code).toBe(0);

    const content = readFileSync(output, "utf8");
    const { frontMatter } = parseFrontMatter(content);
    const tags = frontMatter.tags as string[];

    expect(
      tags.includes("数据质量").toBeTruthy(),
      "tags should include bracket-extracted content '数据质量'",
    );
    expect(
      tags.includes("问题台账优化").toBeTruthy(),
      "tags should include text after brackets",
    );
  });

  it("excludes '未分类' module/page names from tags", () => {
    const unclassifiedFixture = join(TMP_DIR, "unclassified.json");
    const data = {
      meta: {
        project_name: "测试项目",
        requirement_name: "测试需求",
        version: "v1.0",
        module_key: "test-mod",
      },
      modules: [
        {
          name: "未分类",
          pages: [
            {
              name: "未分类",
              test_cases: [
                {
                  title: "测试用例",
                  priority: "P0",
                  steps: [{ step: "步骤1", expected: "预期1" }],
                },
              ],
            },
          ],
        },
      ],
    };
    writeFileSync(unclassifiedFixture, JSON.stringify(data));

    const output = join(TMP_DIR, "test-unclassified-tags.md");
    const { code, stderr } = run([
      "convert",
      "--input",
      unclassifiedFixture,
      "--output",
      output,
    ]);
    expect(code).toBe(0);

    const content = readFileSync(output, "utf8");
    const { frontMatter } = parseFrontMatter(content);
    const tags = frontMatter.tags as string[];

    expect(
      !tags.includes("未分类").toBeTruthy(),
      "tags should not include '未分类'",
    );
  });
});

// ─── case counting edge cases ───────────────────────────────────────────────

describe("archive-gen.ts convert — case counting edge cases", () => {
  it("counts only page-level test_cases when no sub_groups exist", () => {
    const fixture = join(TMP_DIR, "page-only-cases.json");
    const data = {
      meta: {
        project_name: "测试",
        requirement_name: "仅页面用例",
      },
      modules: [
        {
          name: "模块A",
          pages: [
            {
              name: "页面1",
              test_cases: [
                {
                  title: "用例1",
                  priority: "P0",
                  steps: [{ step: "s1", expected: "e1" }],
                },
                {
                  title: "用例2",
                  priority: "P1",
                  steps: [{ step: "s2", expected: "e2" }],
                },
              ],
            },
          ],
        },
      ],
    };
    writeFileSync(fixture, JSON.stringify(data));

    const output = join(TMP_DIR, "page-only-out.md");
    const { code, stdout, stderr } = run([
      "convert",
      "--input",
      fixture,
      "--output",
      output,
    ]);
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as { case_count: number };
    expect(result.case_count).toBe(2);
  });

  it("counts both sub_group and page-level test_cases", () => {
    // The default fixture has 3 sub_group + 2 page-level = 5
    const output = join(TMP_DIR, "mixed-count.md");
    const { code, stdout, stderr } = run([
      "convert",
      "--input",
      FIXTURE,
      "--output",
      output,
    ]);
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as { case_count: number };
    expect(
      result.case_count).toBe(5);
  });
});

// ─── table cell escaping ────────────────────────────────────────────────────

describe("archive-gen.ts convert — pipe and newline escaping in step tables", () => {
  it("escapes pipe characters in step text to \\|", () => {
    const fixture = join(TMP_DIR, "pipe-escape.json");
    const data = {
      meta: {
        project_name: "测试",
        requirement_name: "管道转义测试",
      },
      modules: [
        {
          name: "模块",
          pages: [
            {
              name: "页面",
              test_cases: [
                {
                  title: "含管道符的步骤",
                  priority: "P0",
                  steps: [
                    {
                      step: "输入 A|B|C",
                      expected: "显示 X|Y",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    writeFileSync(fixture, JSON.stringify(data));

    const output = join(TMP_DIR, "pipe-escape-out.md");
    const { code, stderr } = run([
      "convert",
      "--input",
      fixture,
      "--output",
      output,
    ]);
    expect(code).toBe(0);

    const content = readFileSync(output, "utf8");
    expect(
      content.includes("A\\|B\\|C").toBeTruthy(),
      "pipe chars in step should be escaped",
    );
    expect(
      content.includes("X\\|Y").toBeTruthy(),
      "pipe chars in expected should be escaped",
    );
  });
});
