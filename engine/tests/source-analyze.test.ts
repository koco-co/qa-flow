import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const TMP_DIR = join(tmpdir(), `kata-source-analyze-test-${process.pid}`);

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "kata-cli",
      ["source-analyze", ...args],
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

interface AnalyzeResult {
  a_level: Array<{
    file: string;
    line: number;
    content: string;
    keyword: string;
    confidence: number;
  }>;
  b_level: Array<{
    file: string;
    line: number;
    content: string;
    keyword: string;
    confidence: number;
  }>;
  coverage_rate: number;
  searched_files: number;
  matched_files: number;
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

// ─── A-level exact match ──────────────────────────────────────────────────────

describe("source-analyze analyze — A-level exact match (function declaration)", () => {
  it("detects 'function createTable' as A-level match", () => {
    const repoDir = join(TMP_DIR, "repo-a-function");
    mkdirSync(repoDir, { recursive: true });
    writeFileSync(
      join(repoDir, "table.ts"),
      `export function createTable(name: string) {\n  return name;\n}\n`,
      "utf8",
    );
    writeFileSync(
      join(repoDir, "unrelated.ts"),
      `const x = 1;\nconst y = 2;\n`,
      "utf8",
    );

    const { code, stdout, stderr } = run([
      "analyze",
      "--repo",
      repoDir,
      "--keywords",
      "createTable",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as AnalyzeResult;
    assert.ok(result.a_level.length > 0, "a_level should have matches");
    const match = result.a_level[0];
    assert.equal(match.keyword, "createTable");
    assert.ok(match.file.endsWith("table.ts"), "file should be table.ts");
    assert.ok(match.line > 0, "line should be positive");
    assert.ok(
      match.content.includes("createTable"),
      "content should include keyword",
    );
    assert.ok(match.confidence >= 0.9, "A-level confidence should be >= 0.9");
  });

  it("detects 'class UserService' as A-level match", () => {
    const repoDir = join(TMP_DIR, "repo-a-class");
    mkdirSync(repoDir, { recursive: true });
    writeFileSync(
      join(repoDir, "service.ts"),
      `class UserService {\n  getUser() {}\n}\n`,
      "utf8",
    );

    const { code, stdout, stderr } = run([
      "analyze",
      "--repo",
      repoDir,
      "--keywords",
      "UserService",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as AnalyzeResult;
    assert.ok(result.a_level.length > 0, "a_level should match class UserService");
    assert.equal(result.a_level[0].keyword, "UserService");
    assert.ok(result.a_level[0].confidence >= 0.9);
  });

  it("detects 'interface IDataSource' as A-level match", () => {
    const repoDir = join(TMP_DIR, "repo-a-interface");
    mkdirSync(repoDir, { recursive: true });
    writeFileSync(
      join(repoDir, "types.ts"),
      `interface IDataSource {\n  connect(): void;\n}\n`,
      "utf8",
    );

    const { code, stdout, stderr } = run([
      "analyze",
      "--repo",
      repoDir,
      "--keywords",
      "IDataSource",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as AnalyzeResult;
    assert.ok(result.a_level.length > 0, "a_level should match interface");
    assert.equal(result.a_level[0].keyword, "IDataSource");
  });

  it("detects 'export.*createTable' pattern as A-level match", () => {
    const repoDir = join(TMP_DIR, "repo-a-export");
    mkdirSync(repoDir, { recursive: true });
    writeFileSync(
      join(repoDir, "utils.ts"),
      `export const createTable = (name: string) => name;\n`,
      "utf8",
    );

    const { code, stdout, stderr } = run([
      "analyze",
      "--repo",
      repoDir,
      "--keywords",
      "createTable",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as AnalyzeResult;
    assert.ok(result.a_level.length > 0, "export const should be A-level");
  });

  it("detects Python 'def fetchData' as A-level match", () => {
    const repoDir = join(TMP_DIR, "repo-a-python");
    mkdirSync(repoDir, { recursive: true });
    writeFileSync(
      join(repoDir, "data.py"),
      `def fetchData(url):\n    return url\n`,
      "utf8",
    );

    const { code, stdout, stderr } = run([
      "analyze",
      "--repo",
      repoDir,
      "--keywords",
      "fetchData",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as AnalyzeResult;
    assert.ok(result.a_level.length > 0, "Python def should be A-level");
    assert.equal(result.a_level[0].keyword, "fetchData");
  });
});

// ─── B-level fuzzy match ──────────────────────────────────────────────────────

describe("source-analyze analyze — B-level fuzzy match", () => {
  it("detects comment reference as B-level match", () => {
    const repoDir = join(TMP_DIR, "repo-b-comment");
    mkdirSync(repoDir, { recursive: true });
    writeFileSync(
      join(repoDir, "helper.ts"),
      `// createTable helper function\nconst x = 1;\n`,
      "utf8",
    );

    const { code, stdout, stderr } = run([
      "analyze",
      "--repo",
      repoDir,
      "--keywords",
      "createTable",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as AnalyzeResult;
    assert.ok(result.b_level.length > 0, "comment should be B-level");
    assert.equal(result.b_level[0].keyword, "createTable");
    assert.ok(result.b_level[0].confidence < 0.9, "B-level confidence should be < 0.9");
    assert.ok(result.b_level[0].confidence > 0, "B-level confidence should be > 0");
  });

  it("A-level result is NOT duplicated in B-level", () => {
    const repoDir = join(TMP_DIR, "repo-no-duplicate");
    mkdirSync(repoDir, { recursive: true });
    writeFileSync(
      join(repoDir, "svc.ts"),
      `export function myService() {}\n// myService is great\n`,
      "utf8",
    );

    const { code, stdout, stderr } = run([
      "analyze",
      "--repo",
      repoDir,
      "--keywords",
      "myService",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as AnalyzeResult;
    // Line 1 (function declaration) must only be in a_level
    const aLines = result.a_level.map((m) => m.line);
    const bLines = result.b_level.map((m) => m.line);
    const duplicates = aLines.filter((l) => bLines.includes(l) && result.a_level.find((m) => m.line === l)?.file === result.b_level.find((m) => m.line === l)?.file);
    assert.equal(duplicates.length, 0, "A-level lines should not be duplicated in B-level");
  });
});

// ─── coverage_rate calculation ────────────────────────────────────────────────

describe("source-analyze analyze — coverage_rate calculation", () => {
  it("calculates correct coverage_rate = matched_files / searched_files", () => {
    const repoDir = join(TMP_DIR, "repo-coverage");
    mkdirSync(repoDir, { recursive: true });

    // 3 files: 2 match, 1 doesn't
    writeFileSync(join(repoDir, "match1.ts"), `function myFunc() {}\n`, "utf8");
    writeFileSync(join(repoDir, "match2.ts"), `// myFunc reference\nconst x = 1;\n`, "utf8");
    writeFileSync(join(repoDir, "nomatch.ts"), `const y = 2;\nconst z = 3;\n`, "utf8");

    const { code, stdout, stderr } = run([
      "analyze",
      "--repo",
      repoDir,
      "--keywords",
      "myFunc",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as AnalyzeResult;
    assert.equal(result.searched_files, 3, "searched_files should be 3");
    assert.equal(result.matched_files, 2, "matched_files should be 2");
    assert.ok(
      Math.abs(result.coverage_rate - 2 / 3) < 0.001,
      `coverage_rate should be ~0.667, got ${result.coverage_rate}`,
    );
  });

  it("coverage_rate is 0 when no files match", () => {
    const repoDir = join(TMP_DIR, "repo-zero-coverage");
    mkdirSync(repoDir, { recursive: true });
    writeFileSync(join(repoDir, "a.ts"), `const x = 1;\n`, "utf8");
    writeFileSync(join(repoDir, "b.ts"), `const y = 2;\n`, "utf8");

    const { code, stdout, stderr } = run([
      "analyze",
      "--repo",
      repoDir,
      "--keywords",
      "nonExistentKeyword99999",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as AnalyzeResult;
    assert.equal(result.matched_files, 0);
    assert.equal(result.coverage_rate, 0);
  });
});

// ─── nonexistent repo path ────────────────────────────────────────────────────

describe("source-analyze analyze — nonexistent repo path error", () => {
  it("exits with code 1 when repo path does not exist", () => {
    const { code, stderr } = run([
      "analyze",
      "--repo",
      "/nonexistent/path/that/does/not/exist/99999",
      "--keywords",
      "someKeyword",
    ]);
    assert.equal(code, 1, "should exit with code 1 for invalid repo path");
    assert.ok(stderr.length > 0 || code === 1, "should report error");
  });
});

// ─── node_modules ignored ─────────────────────────────────────────────────────

describe("source-analyze analyze — ignores node_modules", () => {
  it("does not search files inside node_modules/", () => {
    const repoDir = join(TMP_DIR, "repo-ignore-nm");
    const nmDir = join(repoDir, "node_modules", "some-pkg");
    mkdirSync(nmDir, { recursive: true });

    // Place keyword ONLY in node_modules — should not match
    writeFileSync(
      join(nmDir, "index.ts"),
      `export function ignoredFunction() {}\n`,
      "utf8",
    );
    // A real source file without the keyword
    writeFileSync(join(repoDir, "src.ts"), `const x = 1;\n`, "utf8");

    const { code, stdout, stderr } = run([
      "analyze",
      "--repo",
      repoDir,
      "--keywords",
      "ignoredFunction",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as AnalyzeResult;
    assert.equal(
      result.a_level.length + result.b_level.length,
      0,
      "files in node_modules should be ignored",
    );
    assert.equal(result.matched_files, 0);
  });

  it("does not search files inside .git/", () => {
    const repoDir = join(TMP_DIR, "repo-ignore-git");
    const gitDir = join(repoDir, ".git", "hooks");
    mkdirSync(gitDir, { recursive: true });

    writeFileSync(
      join(gitDir, "pre-commit"),
      `function gitHookFunc() {}\n`,
      "utf8",
    );
    writeFileSync(join(repoDir, "main.ts"), `const a = 1;\n`, "utf8");

    const { code, stdout, stderr } = run([
      "analyze",
      "--repo",
      repoDir,
      "--keywords",
      "gitHookFunc",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as AnalyzeResult;
    assert.equal(
      result.a_level.length + result.b_level.length,
      0,
      ".git files should be ignored",
    );
  });
});

// ─── multiple keywords ────────────────────────────────────────────────────────

describe("source-analyze analyze — multiple keywords", () => {
  it("searches all keywords when comma-separated", () => {
    const repoDir = join(TMP_DIR, "repo-multi-kw");
    mkdirSync(repoDir, { recursive: true });
    writeFileSync(
      join(repoDir, "alpha.ts"),
      `export function alphaFunc() {}\n`,
      "utf8",
    );
    writeFileSync(
      join(repoDir, "beta.ts"),
      `export function betaFunc() {}\n`,
      "utf8",
    );

    const { code, stdout, stderr } = run([
      "analyze",
      "--repo",
      repoDir,
      "--keywords",
      "alphaFunc,betaFunc",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as AnalyzeResult;
    const keywords = new Set(result.a_level.map((m) => m.keyword));
    assert.ok(keywords.has("alphaFunc"), "should find alphaFunc");
    assert.ok(keywords.has("betaFunc"), "should find betaFunc");
  });
});

// ─── output JSON schema ───────────────────────────────────────────────────────

describe("source-analyze analyze — output JSON schema", () => {
  it("output has all required fields", () => {
    const repoDir = join(TMP_DIR, "repo-schema");
    mkdirSync(repoDir, { recursive: true });
    writeFileSync(join(repoDir, "x.ts"), `function schemaFunc() {}\n`, "utf8");

    const { code, stdout, stderr } = run([
      "analyze",
      "--repo",
      repoDir,
      "--keywords",
      "schemaFunc",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as AnalyzeResult;
    assert.ok(Array.isArray(result.a_level), "a_level should be array");
    assert.ok(Array.isArray(result.b_level), "b_level should be array");
    assert.ok(typeof result.coverage_rate === "number", "coverage_rate should be number");
    assert.ok(typeof result.searched_files === "number", "searched_files should be number");
    assert.ok(typeof result.matched_files === "number", "matched_files should be number");

    if (result.a_level.length > 0) {
      const item = result.a_level[0];
      assert.ok(typeof item.file === "string", "file should be string");
      assert.ok(typeof item.line === "number", "line should be number");
      assert.ok(typeof item.content === "string", "content should be string");
      assert.ok(typeof item.keyword === "string", "keyword should be string");
      assert.ok(typeof item.confidence === "number", "confidence should be number");
    }
  });

  it("results are sorted by confidence descending", () => {
    const repoDir = join(TMP_DIR, "repo-sort");
    mkdirSync(repoDir, { recursive: true });
    writeFileSync(
      join(repoDir, "sorted.ts"),
      `export function sortedFunc() {}\n// sortedFunc reference\nconst sortedFunc = 1;\n`,
      "utf8",
    );

    const { code, stdout, stderr } = run([
      "analyze",
      "--repo",
      repoDir,
      "--keywords",
      "sortedFunc",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as AnalyzeResult;
    for (let i = 1; i < result.a_level.length; i++) {
      assert.ok(
        result.a_level[i - 1].confidence >= result.a_level[i].confidence,
        "a_level should be sorted by confidence descending",
      );
    }
    for (let i = 1; i < result.b_level.length; i++) {
      assert.ok(
        result.b_level[i - 1].confidence >= result.b_level[i].confidence,
        "b_level should be sorted by confidence descending",
      );
    }
  });
});

// ─── --help ───────────────────────────────────────────────────────────────────

describe("source-analyze --help", () => {
  it("outputs usage information", () => {
    const { stdout, stderr, code } = run(["--help"]);
    const output = stdout + stderr;
    assert.equal(code, 0);
    assert.match(output, /source-analyze|analyze/i);
  });
});
