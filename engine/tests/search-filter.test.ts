import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, it, expect } from "bun:test";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const TMP_DIR = join(tmpdir(), `kata-search-filter-test-${process.pid}`);

function run(
  args: string[],
  stdinData?: string,
): { stdout: string; stderr: string; code: number } {
  if (stdinData !== undefined) {
    const result = spawnSync(
      "kata-cli",
      ["search-filter", ...args],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        input: stdinData,
      },
    );
    return {
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      code: result.status ?? 1,
    };
  }

  try {
    const stdout = execFileSync(
      "kata-cli",
      ["search-filter", ...args],
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

interface FilteredResult {
  path: string;
  suite_name: string;
  case_count: number;
  preview: string;
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

// ─── Sorting + top-N truncation ───────────────────────────────────────────────

describe("search-filter.ts filter — sorts by case_count desc and truncates to top-N", () => {
  it("returns top 2 results sorted by case_count descending", () => {
    const input = JSON.stringify([
      {
        path: "workspace/dataAssets/archive/a.md",
        suite_name: "商品管理",
        tags: ["商品"],
        case_count: 5,
      },
      {
        path: "workspace/dataAssets/archive/b.md",
        suite_name: "订单管理",
        tags: ["订单"],
        case_count: 20,
      },
      {
        path: "workspace/dataAssets/archive/c.md",
        suite_name: "用户管理",
        tags: ["用户"],
        case_count: 10,
      },
    ]);

    const { code, stdout, stderr } = run(["filter", "--top", "2"], input);
    expect(code).toBe(0);

    const results = JSON.parse(stdout) as FilteredResult[];
    expect(results.length).toBe(2);
    expect(results[0].suite_name).toBe("订单管理");
    expect(results[1].suite_name).toBe("用户管理");
  });

  it("defaults to top 5 when --top is not specified", () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      path: `workspace/dataAssets/archive/item-${i}.md`,
      suite_name: `用例套件${i}`,
      tags: [],
      case_count: i + 1,
    }));
    const input = JSON.stringify(items);

    const { code, stdout, stderr } = run(["filter"], input);
    expect(code).toBe(0);

    const results = JSON.parse(stdout) as FilteredResult[];
    expect(results.length).toBe(5);
    expect(results[0].case_count).toBe(8);
  });

  it("returns all items when count is less than top-N", () => {
    const input = JSON.stringify([
      {
        path: "workspace/dataAssets/archive/x.md",
        suite_name: "小套件",
        tags: [],
        case_count: 3,
      },
    ]);

    const { code, stdout, stderr } = run(["filter", "--top", "10"], input);
    expect(code).toBe(0);

    const results = JSON.parse(stdout) as FilteredResult[];
    expect(results.length).toBe(1);
  });
});

// ─── Deduplication by suite_name ─────────────────────────────────────────────

describe("search-filter.ts filter — deduplicates by suite_name keeping max case_count", () => {
  it("keeps entry with larger case_count when suite_name duplicated", () => {
    const input = JSON.stringify([
      {
        path: "workspace/dataAssets/archive/v1.md",
        suite_name: "数据血缘",
        tags: ["血缘"],
        case_count: 8,
      },
      {
        path: "workspace/dataAssets/archive/v2.md",
        suite_name: "数据血缘",
        tags: ["血缘", "lineage"],
        case_count: 15,
      },
      {
        path: "workspace/dataAssets/archive/other.md",
        suite_name: "权限管理",
        tags: ["权限"],
        case_count: 5,
      },
    ]);

    const { code, stdout, stderr } = run(["filter", "--top", "5"], input);
    expect(code).toBe(0);

    const results = JSON.parse(stdout) as FilteredResult[];
    const bloodLineageResults = results.filter(
      (r) => r.suite_name === "数据血缘",
    );
    expect(
      bloodLineageResults.length).toBe(1);
    expect(
      bloodLineageResults[0].case_count).toBe(15);
    expect(
      bloodLineageResults[0].path.includes("v2.md").toBeTruthy(),
      "should keep path of larger entry",
    );
    expect(results.length).toBe(2);
  });

  it("handles multiple duplicates and keeps max each time", () => {
    const input = JSON.stringify([
      {
        path: "workspace/a1.md",
        suite_name: "套件A",
        tags: [],
        case_count: 3,
      },
      {
        path: "workspace/a2.md",
        suite_name: "套件A",
        tags: [],
        case_count: 10,
      },
      {
        path: "workspace/a3.md",
        suite_name: "套件A",
        tags: [],
        case_count: 7,
      },
      {
        path: "workspace/b1.md",
        suite_name: "套件B",
        tags: [],
        case_count: 2,
      },
    ]);

    const { code, stdout, stderr } = run(["filter", "--top", "5"], input);
    expect(code).toBe(0);

    const results = JSON.parse(stdout) as FilteredResult[];
    const suiteA = results.find((r) => r.suite_name === "套件A");
    expect(suiteA).toBeTruthy();
    expect(suiteA.case_count).toBe(10);
    expect(results.length).toBe(2);
  });
});

// ─── Input modes ─────────────────────────────────────────────────────────────

describe("search-filter.ts filter — supports both stdin and --input file", () => {
  it("reads from --input file when provided", () => {
    const archiveFile = join(TMP_DIR, "test-archive.md");
    writeFileSync(
      archiveFile,
      `---
suite_name: "档案套件A"
---

## 档案套件A

首行内容

第二行内容

第三行内容
`,
      "utf8",
    );

    const inputFile = join(TMP_DIR, "search-results.json");
    writeFileSync(
      inputFile,
      JSON.stringify([
        {
          path: archiveFile,
          suite_name: "档案套件A",
          tags: ["档案"],
          case_count: 6,
        },
      ]),
      "utf8",
    );

    const { code, stdout, stderr } = run([
      "filter",
      "--input",
      inputFile,
      "--top",
      "3",
    ]);
    expect(code).toBe(0);

    const results = JSON.parse(stdout) as FilteredResult[];
    expect(results.length).toBe(1);
    expect(results[0].suite_name).toBe("档案套件A");
  });

  it("reads from stdin when no --input provided", () => {
    const archiveFile = join(TMP_DIR, "stdin-archive.md");
    writeFileSync(
      archiveFile,
      `---
suite_name: "Stdin套件"
---

## Stdin套件

第一行非空内容
`,
      "utf8",
    );

    const input = JSON.stringify([
      {
        path: archiveFile,
        suite_name: "Stdin套件",
        tags: [],
        case_count: 4,
      },
    ]);

    const { code, stdout, stderr } = run(["filter", "--top", "5"], input);
    expect(code).toBe(0);

    const results = JSON.parse(stdout) as FilteredResult[];
    expect(results.length).toBe(1);
    expect(results[0].suite_name).toBe("Stdin套件");
  });
});

// ─── Empty input ──────────────────────────────────────────────────────────────

describe("search-filter.ts filter — handles empty input gracefully", () => {
  it("returns [] when stdin is empty", () => {
    const { code, stdout, stderr } = run(["filter"], "");
    expect(code).toBe(0);

    const results = JSON.parse(stdout) as unknown[];
    expect(Array.isArray(results).toBeTruthy(), "should return array");
    expect(results.length).toBe(0);
  });

  it("returns [] when --input file does not exist", () => {
    const { code, stdout, stderr } = run([
      "filter",
      "--input",
      "/nonexistent/path/results.json",
    ]);
    expect(code).toBe(0);

    const results = JSON.parse(stdout) as unknown[];
    expect(Array.isArray(results).toBeTruthy(), "should return array");
    expect(
      results.length).toBe(0);
  });

  it("returns [] when input is an empty JSON array", () => {
    const { code, stdout, stderr } = run(["filter"], "[]");
    expect(code).toBe(0);

    const results = JSON.parse(stdout) as unknown[];
    expect(results.length).toBe(0);
  });
});

// ─── Preview generation ───────────────────────────────────────────────────────

describe("search-filter.ts filter — generates preview from file content", () => {
  it("includes first 3 non-empty lines as preview", () => {
    const archiveFile = join(TMP_DIR, "preview-archive.md");
    writeFileSync(
      archiveFile,
      `---
suite_name: "预览测试"
---

## 预览测试

### 列表页

第一行非空
第二行内容
第三行正文
第四行不应包含
`,
      "utf8",
    );

    const input = JSON.stringify([
      {
        path: archiveFile,
        suite_name: "预览测试",
        tags: [],
        case_count: 3,
      },
    ]);

    const { code, stdout, stderr } = run(["filter", "--top", "5"], input);
    expect(code).toBe(0);

    const results = JSON.parse(stdout) as FilteredResult[];
    expect(results.length).toBe(1);
    expect(
      typeof results[0].preview === "string",
      "preview should be a string",
    ).toBeTruthy();

    const previewLines = results[0].preview
      .split("\n")
      .filter((l) => l.trim().length > 0);
    expect(
      previewLines.length <= 3,
      "preview should contain at most 3 non-empty lines",
    ).toBeTruthy();
    expect(
      results[0].preview.includes("预览测试").toBeTruthy(),
      "preview should contain content from the file",
    );
  });

  it("uses empty string for preview when archive file does not exist", () => {
    const input = JSON.stringify([
      {
        path: "/nonexistent/archive/missing.md",
        suite_name: "缺失文件套件",
        tags: [],
        case_count: 2,
      },
    ]);

    const { code, stdout, stderr } = run(["filter", "--top", "5"], input);
    expect(code).toBe(0);

    const results = JSON.parse(stdout) as FilteredResult[];
    expect(results.length).toBe(1);
    expect(results[0].preview).toBe("");
  });
});

// ─── --help ───────────────────────────────────────────────────────────────────

describe("search-filter.ts --help", () => {
  it("outputs usage information for top-level --help", () => {
    const { stdout, stderr, code } = run(["--help"]);
    const output = stdout + stderr;
    expect(code).toBe(0);
    expect(output).toMatch(/search-filter/);
    expect(output).toMatch(/filter/);
  });

  it("outputs --top option in filter subcommand help", () => {
    const { stdout, stderr, code } = run(["filter", "--help"]);
    const output = stdout + stderr;
    expect(code).toBe(0);
    expect(output).toMatch(/--top/);
  });
});
