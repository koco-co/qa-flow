import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, it, expect } from "bun:test";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as AnalyzeResult;
    expect(result.a_level.length > 0).toBeTruthy();
    const match = result.a_level[0];
    expect(match.keyword).toBe("createTable");
    expect(match.file.endsWith("table.ts").toBeTruthy(), "file should be table.ts");
    expect(match.line > 0).toBeTruthy();
    expect(
      match.content.includes("createTable").toBeTruthy(),
      "content should include keyword",
    );
    expect(match.confidence >= 0.9).toBeTruthy();
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as AnalyzeResult;
    expect(result.a_level.length > 0).toBeTruthy();
    expect(result.a_level[0].keyword).toBe("UserService");
    expect(result.a_level[0].confidence >= 0.9).toBeTruthy();
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as AnalyzeResult;
    expect(result.a_level.length > 0).toBeTruthy();
    expect(result.a_level[0].keyword).toBe("IDataSource");
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as AnalyzeResult;
    expect(result.a_level.length > 0).toBeTruthy();
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as AnalyzeResult;
    expect(result.a_level.length > 0).toBeTruthy();
    expect(result.a_level[0].keyword).toBe("fetchData");
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as AnalyzeResult;
    expect(result.b_level.length > 0).toBeTruthy();
    expect(result.b_level[0].keyword).toBe("createTable");
    expect(result.b_level[0].confidence < 0.9).toBeTruthy();
    expect(result.b_level[0].confidence > 0).toBeTruthy();
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as AnalyzeResult;
    // Line 1 (function declaration) must only be in a_level
    const aLines = result.a_level.map((m) => m.line);
    const bLines = result.b_level.map((m) => m.line);
    const duplicates = aLines.filter((l) => bLines.includes(l) && result.a_level.find((m) => m.line === l)?.file === result.b_level.find((m) => m.line === l)?.file);
    expect(duplicates.length).toBe(0);
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as AnalyzeResult;
    expect(result.searched_files).toBe(3);
    expect(result.matched_files).toBe(2);
    expect(
      Math.abs(result.coverage_rate - 2 / 3).toBeTruthy() < 0.001,
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as AnalyzeResult;
    expect(result.matched_files).toBe(0);
    expect(result.coverage_rate).toBe(0);
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
    expect(code).toBe(1);
    expect(stderr.length > 0 || code === 1).toBeTruthy();
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as AnalyzeResult;
    expect(
      result.a_level.length + result.b_level.length).toBe(0);
    expect(result.matched_files).toBe(0);
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as AnalyzeResult;
    expect(
      result.a_level.length + result.b_level.length).toBe(0);
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as AnalyzeResult;
    const keywords = new Set(result.a_level.map((m) => m.keyword));
    expect(keywords.has("alphaFunc").toBeTruthy(), "should find alphaFunc");
    expect(keywords.has("betaFunc").toBeTruthy(), "should find betaFunc");
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as AnalyzeResult;
    expect(Array.isArray(result.a_level).toBeTruthy(), "a_level should be array");
    expect(Array.isArray(result.b_level).toBeTruthy(), "b_level should be array");
    expect(typeof result.coverage_rate === "number").toBeTruthy();
    expect(typeof result.searched_files === "number").toBeTruthy();
    expect(typeof result.matched_files === "number").toBeTruthy();

    if (result.a_level.length > 0) {
      const item = result.a_level[0];
      expect(typeof item.file === "string").toBeTruthy();
      expect(typeof item.line === "number").toBeTruthy();
      expect(typeof item.content === "string").toBeTruthy();
      expect(typeof item.keyword === "string").toBeTruthy();
      expect(typeof item.confidence === "number").toBeTruthy();
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as AnalyzeResult;
    for (let i = 1; i < result.a_level.length; i++) {
      expect(
        result.a_level[i - 1].confidence >= result.a_level[i].confidence,
        "a_level should be sorted by confidence descending",
      ).toBeTruthy();
    }
    for (let i = 1; i < result.b_level.length; i++) {
      expect(
        result.b_level[i - 1].confidence >= result.b_level[i].confidence,
        "b_level should be sorted by confidence descending",
      ).toBeTruthy();
    }
  });
});

// ─── --help ───────────────────────────────────────────────────────────────────

describe("source-analyze --help", () => {
  it("outputs usage information", () => {
    const { stdout, stderr, code } = run(["--help"]);
    const output = stdout + stderr;
    expect(code).toBe(0);
    expect(output).toMatch(/source-analyze|analyze/i);
  });
});
