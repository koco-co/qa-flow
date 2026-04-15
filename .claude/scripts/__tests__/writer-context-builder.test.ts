import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const TMP_DIR = join(tmpdir(), `qa-flow-writer-context-builder-test-${process.pid}`);

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "bun",
      ["run", ".claude/scripts/writer-context-builder.ts", ...args],
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

const MOCK_PRD = `# 商品系统需求文档

## 商品管理

商品管理模块负责商品的创建、编辑、上下架等操作。

### 功能点
- 创建商品
- 编辑商品信息
- 商品上架/下架

## 订单管理

订单管理模块负责订单的查询、处理等操作。

### 功能点
- 查询订单
- 处理退款

## 用户管理

用户管理模块负责用户账户的维护。
`;

const MOCK_TEST_POINTS = {
  modules: [
    {
      name: "商品管理",
      test_points: [
        { id: "TP-001", description: "验证商品创建流程" },
        { id: "TP-002", description: "验证商品编辑功能" },
      ],
    },
    {
      name: "订单管理",
      test_points: [
        { id: "TP-003", description: "验证订单查询" },
      ],
    },
  ],
};

const MOCK_PREFERENCES = {
  priority_default: "P1",
  language: "zh-CN",
};

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

describe("writer-context-builder build — module match", () => {
  it("returns matching module PRD section and filtered test points", () => {
    const prdPath = join(TMP_DIR, "test.md");
    const tpPath = join(TMP_DIR, "test-points.json");
    writeFileSync(prdPath, MOCK_PRD, "utf8");
    writeFileSync(tpPath, JSON.stringify(MOCK_TEST_POINTS), "utf8");

    const { code, stdout } = run([
      "build",
      "--prd", prdPath,
      "--test-points", tpPath,
      "--writer-id", "商品管理",
    ]);

    assert.equal(code, 0, `expected exit 0, stderr was: ${stdout}`);
    const out = JSON.parse(stdout) as {
      writer_id: string;
      module_prd_section: string;
      test_points: unknown[];
      preferences: Record<string, unknown>;
      fallback: boolean;
    };

    assert.equal(out.writer_id, "商品管理");
    assert.ok(
      out.module_prd_section.includes("## 商品管理"),
      "should include the module heading",
    );
    assert.ok(
      !out.module_prd_section.includes("## 订单管理"),
      "should NOT include other module headings",
    );
    assert.equal(out.fallback, false);
    assert.equal(out.test_points.length, 2, "should return 2 test points for 商品管理");
  });

  it("fuzzy-matches module by partial writer-id", () => {
    const prdPath = join(TMP_DIR, "fuzzy.md");
    const tpPath = join(TMP_DIR, "fuzzy-tp.json");
    writeFileSync(prdPath, MOCK_PRD, "utf8");
    writeFileSync(tpPath, JSON.stringify(MOCK_TEST_POINTS), "utf8");

    const { code, stdout } = run([
      "build",
      "--prd", prdPath,
      "--test-points", tpPath,
      "--writer-id", "商品",  // partial match
    ]);

    assert.equal(code, 0);
    const out = JSON.parse(stdout) as { module_prd_section: string; fallback: boolean };
    assert.ok(out.module_prd_section.includes("## 商品管理"), "should fuzzy-match 商品 to 商品管理");
    assert.equal(out.fallback, false);
  });
});

describe("writer-context-builder build — no match fallback", () => {
  it("returns full PRD text with fallback=true when writer-id does not match any module", () => {
    const prdPath = join(TMP_DIR, "fallback.md");
    const tpPath = join(TMP_DIR, "fallback-tp.json");
    writeFileSync(prdPath, MOCK_PRD, "utf8");
    writeFileSync(tpPath, JSON.stringify(MOCK_TEST_POINTS), "utf8");

    const { code, stdout } = run([
      "build",
      "--prd", prdPath,
      "--test-points", tpPath,
      "--writer-id", "不存在的模块",
    ]);

    assert.equal(code, 0);
    const out = JSON.parse(stdout) as {
      module_prd_section: string;
      test_points: unknown[];
      fallback: boolean;
    };

    assert.equal(out.fallback, true, "should set fallback=true");
    assert.ok(
      out.module_prd_section.includes("## 商品管理"),
      "fallback should include full PRD",
    );
    assert.ok(
      out.module_prd_section.includes("## 订单管理"),
      "fallback should include full PRD",
    );
    assert.equal(out.test_points.length, 0, "should return empty test_points on fallback");
  });
});

describe("writer-context-builder build — test-points filtering", () => {
  it("filters test points to only those belonging to matching module", () => {
    const prdPath = join(TMP_DIR, "filter.md");
    const tpPath = join(TMP_DIR, "filter-tp.json");
    writeFileSync(prdPath, MOCK_PRD, "utf8");
    writeFileSync(tpPath, JSON.stringify(MOCK_TEST_POINTS), "utf8");

    const { code, stdout } = run([
      "build",
      "--prd", prdPath,
      "--test-points", tpPath,
      "--writer-id", "订单管理",
    ]);

    assert.equal(code, 0);
    const out = JSON.parse(stdout) as {
      writer_id: string;
      test_points: Array<{ id: string }>;
    };

    assert.equal(out.writer_id, "订单管理");
    assert.equal(out.test_points.length, 1);
    assert.equal(out.test_points[0]!.id, "TP-003");
  });
});

describe("writer-context-builder build — preferences optional", () => {
  it("includes preferences when --preferences path provided", () => {
    const prdPath = join(TMP_DIR, "prefs.md");
    const tpPath = join(TMP_DIR, "prefs-tp.json");
    const prefsPath = join(TMP_DIR, "prefs.json");
    writeFileSync(prdPath, MOCK_PRD, "utf8");
    writeFileSync(tpPath, JSON.stringify(MOCK_TEST_POINTS), "utf8");
    writeFileSync(prefsPath, JSON.stringify(MOCK_PREFERENCES), "utf8");

    const { code, stdout } = run([
      "build",
      "--prd", prdPath,
      "--test-points", tpPath,
      "--writer-id", "商品管理",
      "--preferences", prefsPath,
    ]);

    assert.equal(code, 0);
    const out = JSON.parse(stdout) as {
      preferences: Record<string, unknown>;
    };

    assert.equal(out.preferences.priority_default, "P1");
    assert.equal(out.preferences.language, "zh-CN");
  });

  it("returns empty preferences object when --preferences not provided", () => {
    const prdPath = join(TMP_DIR, "no-prefs.md");
    const tpPath = join(TMP_DIR, "no-prefs-tp.json");
    writeFileSync(prdPath, MOCK_PRD, "utf8");
    writeFileSync(tpPath, JSON.stringify(MOCK_TEST_POINTS), "utf8");

    const { code, stdout } = run([
      "build",
      "--prd", prdPath,
      "--test-points", tpPath,
      "--writer-id", "商品管理",
    ]);

    assert.equal(code, 0);
    const out = JSON.parse(stdout) as { preferences: Record<string, unknown> };
    assert.deepEqual(out.preferences, {});
  });
});

describe("writer-context-builder build — errors", () => {
  it("exits with code 1 when PRD file does not exist", () => {
    const tpPath = join(TMP_DIR, "err-tp.json");
    writeFileSync(tpPath, JSON.stringify(MOCK_TEST_POINTS), "utf8");

    const { code, stderr } = run([
      "build",
      "--prd", "/tmp/nonexistent-prd-xyz.md",
      "--test-points", tpPath,
      "--writer-id", "商品管理",
    ]);

    assert.equal(code, 1);
    assert.match(stderr, /cannot read|Error/i);
  });

  it("exits with code 1 when test-points file does not exist", () => {
    const prdPath = join(TMP_DIR, "err-prd.md");
    writeFileSync(prdPath, MOCK_PRD, "utf8");

    const { code, stderr } = run([
      "build",
      "--prd", prdPath,
      "--test-points", "/tmp/nonexistent-tp-xyz.json",
      "--writer-id", "商品管理",
    ]);

    assert.equal(code, 1);
    assert.match(stderr, /cannot read|Error/i);
  });
});
