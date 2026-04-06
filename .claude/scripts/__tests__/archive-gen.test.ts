import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import { parseFrontMatter } from "../lib/frontmatter.js";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const FIXTURE = join(import.meta.dirname, "fixtures/sample-cases.json");
const TMP_DIR = join(tmpdir(), `qa-flow-archive-test-${process.pid}`);

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync("npx", ["tsx", ".claude/scripts/archive-gen.ts", ...args], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
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

before(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

after(() => {
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
    const { code, stdout, stderr } = run(["convert", "--input", FIXTURE, "--output", output]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as {
      output_path: string;
      case_count: number;
      module_count: number;
    };
    assert.ok(result.output_path.endsWith("test-convert.md"), "output_path should end with .md");
    assert.ok(typeof result.case_count === "number", "case_count should be a number");
    assert.ok(typeof result.module_count === "number", "module_count should be a number");
  });
});

describe("archive-gen.ts convert — correct suite_name in front-matter", () => {
  it("generated MD has suite_name matching meta.requirement_name", () => {
    const output = join(TMP_DIR, "test-suitename.md");
    const { code, stderr } = run(["convert", "--input", FIXTURE, "--output", output]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const content = readFileSync(output, "utf8");
    const { frontMatter } = parseFrontMatter(content);

    assert.equal(
      frontMatter.suite_name,
      "质量问题台账",
      "suite_name should match meta.requirement_name",
    );
  });
});

describe("archive-gen.ts convert — correct case_count", () => {
  it("generated MD case_count matches total test cases in JSON (5)", () => {
    const output = join(TMP_DIR, "test-casecount.md");
    const { code, stdout, stderr } = run(["convert", "--input", FIXTURE, "--output", output]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as { case_count: number };
    // 3 sub_group cases (搜索筛选) + 1 page-level (列表页) + 1 page-level (新增页) = 5
    assert.equal(result.case_count, 5, "case_count should be 5");

    const content = readFileSync(output, "utf8");
    const { frontMatter } = parseFrontMatter(content);
    assert.equal(frontMatter.case_count, 5, "front-matter case_count should be 5");
  });
});

describe("archive-gen.ts convert — H2/H3/H4/H5 body structure", () => {
  it("generated MD body has correct heading hierarchy", () => {
    const output = join(TMP_DIR, "test-structure.md");
    const { code, stderr } = run(["convert", "--input", FIXTURE, "--output", output]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const content = readFileSync(output, "utf8");
    const { body } = parseFrontMatter(content);

    // H2 — module
    assert.match(body, /^## 质量问题台账/m, "H2 module heading missing");
    // H3 — page
    assert.match(body, /^### 列表页/m, "H3 page heading '列表页' missing");
    assert.match(body, /^### 新增页/m, "H3 page heading '新增页' missing");
    // H4 — sub_group
    assert.match(body, /^#### 搜索筛选/m, "H4 sub_group heading missing");
    // H5 — test case with priority prefix
    assert.match(body, /^##### 【P0】验证默认加载列表页/m, "H5 case with P0 prefix missing");
    assert.match(body, /^##### 【P1】验证按问题类型筛选/m, "H5 case with P1 prefix missing");
    assert.match(
      body,
      /^##### 【P0】验证填写完整表单后成功提交/m,
      "H5 case with P0 prefix missing",
    );
  });
});

describe("archive-gen.ts convert — step table format", () => {
  it("step tables have correct header format (| 编号 | 步骤 | 预期 |)", () => {
    const output = join(TMP_DIR, "test-table.md");
    const { code, stderr } = run(["convert", "--input", FIXTURE, "--output", output]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const content = readFileSync(output, "utf8");
    const { body } = parseFrontMatter(content);

    // Table header must appear (multiple times, once per case)
    const tableHeaders = body.match(/\| 编号 \| 步骤 \| 预期 \|/g) ?? [];
    assert.ok(tableHeaders.length > 0, "No step tables with correct header found");

    // Body has numbered rows starting with | 1 |
    assert.match(body, /\| 1 \|/, "Table row starting with | 1 | not found");

    // Separator row
    assert.match(body, /\| ---- \|/, "Table separator row not found");
  });

  it("precondition blocks appear before step tables", () => {
    const output = join(TMP_DIR, "test-precondition.md");
    const { code, stderr } = run(["convert", "--input", FIXTURE, "--output", output]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const content = readFileSync(output, "utf8");
    const { body } = parseFrontMatter(content);

    // Precondition block should contain the text from the fixture
    assert.match(body, /> 前置条件/, "> 前置条件 label missing");
    assert.match(body, /环境已部署/, "Precondition content '环境已部署' missing");
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
    assert.equal(code, 0, `stderr: ${stderr}`);

    const results = JSON.parse(stdout) as Array<{
      path: string;
      suite_name: string;
      tags: string[];
      case_count: number;
    }>;
    assert.ok(Array.isArray(results), "search output should be an array");
    assert.ok(results.length > 0, "should find at least one result");
    assert.equal(results[0].suite_name, "质量问题台账", "suite_name should match");
    assert.ok(results[0].path.includes("test-archive.md"), "path should reference the file");
    assert.ok(typeof results[0].case_count === "number", "case_count should be a number");
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
    assert.equal(code, 0, `stderr: ${stderr}`);

    const results = JSON.parse(stdout) as Array<{ suite_name: string }>;
    assert.ok(results.length > 0, "should find result matching tag");
    assert.equal(results[0].suite_name, "数据血缘功能");
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
    assert.equal(code, 0, `stderr: ${stderr}`);

    const results = JSON.parse(stdout) as unknown[];
    assert.ok(Array.isArray(results), "result should be an array");
    assert.equal(results.length, 0, "result should be empty for unknown keyword");
  });

  it("returns [] when archive directory is empty", () => {
    const emptyDir = join(TMP_DIR, "archive-empty");
    mkdirSync(emptyDir, { recursive: true });

    const { code, stdout, stderr } = run(["search", "--query", "anything", "--dir", emptyDir]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const results = JSON.parse(stdout) as unknown[];
    assert.equal(results.length, 0, "empty directory should return empty results");
  });
});

describe("archive-gen.ts --help", () => {
  it("outputs usage information", () => {
    const { stdout, stderr, code } = run(["--help"]);
    const output = stdout + stderr;
    assert.equal(code, 0);
    assert.match(output, /archive-gen/);
    assert.match(output, /convert/);
    assert.match(output, /search/);
  });
});
