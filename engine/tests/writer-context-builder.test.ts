import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, afterEach, before, describe, it } from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const TMP_DIR = join(tmpdir(), `kata-writer-context-builder-test-${process.pid}`);

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "kata-cli",
      ["writer-context-builder", ...args],
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

const MOCK_RULES = {
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
      rules: Record<string, unknown>;
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

describe("writer-context-builder build — rules optional", () => {
  it("includes rules when --rules path provided", () => {
    const prdPath = join(TMP_DIR, "rules.md");
    const tpPath = join(TMP_DIR, "rules-tp.json");
    const rulesPath = join(TMP_DIR, "rules.json");
    writeFileSync(prdPath, MOCK_PRD, "utf8");
    writeFileSync(tpPath, JSON.stringify(MOCK_TEST_POINTS), "utf8");
    writeFileSync(rulesPath, JSON.stringify(MOCK_RULES), "utf8");

    const { code, stdout } = run([
      "build",
      "--prd", prdPath,
      "--test-points", tpPath,
      "--writer-id", "商品管理",
      "--rules", rulesPath,
    ]);

    assert.equal(code, 0);
    const out = JSON.parse(stdout) as {
      rules: Record<string, unknown>;
    };

    assert.equal(out.rules.priority_default, "P1");
    assert.equal(out.rules.language, "zh-CN");
  });

  it("returns empty rules object when --rules not provided", () => {
    const prdPath = join(TMP_DIR, "no-rules.md");
    const tpPath = join(TMP_DIR, "no-rules-tp.json");
    writeFileSync(prdPath, MOCK_PRD, "utf8");
    writeFileSync(tpPath, JSON.stringify(MOCK_TEST_POINTS), "utf8");

    const { code, stdout } = run([
      "build",
      "--prd", prdPath,
      "--test-points", tpPath,
      "--writer-id", "商品管理",
    ]);

    assert.equal(code, 0);
    const out = JSON.parse(stdout) as { rules: Record<string, unknown> };
    assert.deepEqual(out.rules, {});
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

// ─── Knowledge injection tests ─────────────────────────────────────────────────

const REPO_ROOT_FOR_FIXTURE = resolve(import.meta.dirname, "../../..");
const FIXTURE_PROJECT = "writer-ctx-fixture";
const FIXTURE_KNOWLEDGE_DIR = join(
  REPO_ROOT_FOR_FIXTURE,
  "workspace",
  FIXTURE_PROJECT,
  "knowledge",
);

function setupFixtureKnowledge(overviewContent?: string): void {
  mkdirSync(FIXTURE_KNOWLEDGE_DIR, { recursive: true });

  const overview = overviewContent ?? "\n# Fixture Overview\n\n## 业务概览\n\n这是测试项目的概览内容。\n";
  const overviewFm = [
    "---",
    `title: ${FIXTURE_PROJECT} 业务概览`,
    "type: overview",
    "tags: []",
    "confidence: high",
    "source: test",
    "updated: 2026-04-18",
    "---",
  ].join("\n");

  writeFileSync(
    join(FIXTURE_KNOWLEDGE_DIR, "overview.md"),
    `${overviewFm}${overview}`,
    "utf8",
  );

  const termsFm = [
    "---",
    `title: ${FIXTURE_PROJECT} 术语表`,
    "type: term",
    "tags: []",
    "confidence: high",
    "source: test",
    "updated: 2026-04-18",
    "---",
  ].join("\n");
  const termsBody = "\n# 术语表\n\n| 术语 | 中文 | 解释 | 别名 |\n|---|---|---|---|\n| TestTerm | 测试术语 | 用于测试 |  |\n";
  writeFileSync(
    join(FIXTURE_KNOWLEDGE_DIR, "terms.md"),
    `${termsFm}${termsBody}`,
    "utf8",
  );
}

function cleanupFixtureKnowledge(): void {
  try {
    rmSync(join(REPO_ROOT_FOR_FIXTURE, "workspace", FIXTURE_PROJECT), {
      recursive: true,
      force: true,
    });
  } catch {
    // ignore
  }
}

describe("writer-context-builder build — strategy_id and knowledge defaults", () => {
  it("outputs default strategy_id=S1 and knowledge is object when no flags provided", () => {
    const prdPath = join(TMP_DIR, "strat-default.md");
    const tpPath = join(TMP_DIR, "strat-default-tp.json");
    writeFileSync(prdPath, MOCK_PRD, "utf8");
    writeFileSync(tpPath, JSON.stringify(MOCK_TEST_POINTS), "utf8");

    const { code, stdout } = run([
      "build",
      "--prd", prdPath,
      "--test-points", tpPath,
      "--writer-id", "商品管理",
    ]);

    assert.equal(code, 0);
    const out = JSON.parse(stdout) as {
      strategy_id: string;
      knowledge: Record<string, unknown>;
    };

    assert.equal(out.strategy_id, "S1", "default strategy_id should be S1");
    assert.ok(
      out.knowledge !== null && typeof out.knowledge === "object",
      "knowledge should be an object",
    );
  });
});

describe("writer-context-builder build — knowledge-injection none", () => {
  afterEach(() => {
    cleanupFixtureKnowledge();
  });

  it("knowledge is empty object when --knowledge-injection none even if --project is provided", () => {
    setupFixtureKnowledge();

    const prdPath = join(TMP_DIR, "ki-none.md");
    const tpPath = join(TMP_DIR, "ki-none-tp.json");
    writeFileSync(prdPath, MOCK_PRD, "utf8");
    writeFileSync(tpPath, JSON.stringify(MOCK_TEST_POINTS), "utf8");

    const { code, stdout } = run([
      "build",
      "--prd", prdPath,
      "--test-points", tpPath,
      "--writer-id", "商品管理",
      "--knowledge-injection", "none",
      "--project", FIXTURE_PROJECT,
    ]);

    assert.equal(code, 0);
    const out = JSON.parse(stdout) as { knowledge: Record<string, unknown> };
    assert.deepEqual(out.knowledge, {}, "knowledge should be empty when injection mode is none");
  });
});

describe("writer-context-builder build — knowledge-injection read-core with fixture", () => {
  afterEach(() => {
    cleanupFixtureKnowledge();
  });

  it("knowledge.core is non-empty when --knowledge-injection read-core + valid project", () => {
    setupFixtureKnowledge();

    const prdPath = join(TMP_DIR, "ki-core.md");
    const tpPath = join(TMP_DIR, "ki-core-tp.json");
    writeFileSync(prdPath, MOCK_PRD, "utf8");
    writeFileSync(tpPath, JSON.stringify(MOCK_TEST_POINTS), "utf8");

    const { code, stdout } = run([
      "build",
      "--prd", prdPath,
      "--test-points", tpPath,
      "--writer-id", "商品管理",
      "--knowledge-injection", "read-core",
      "--project", FIXTURE_PROJECT,
    ]);

    assert.equal(code, 0);
    const out = JSON.parse(stdout) as {
      knowledge: { core?: { overview: string; terms: string } };
    };

    assert.ok(out.knowledge.core, "knowledge.core should be present");
    assert.ok(
      typeof out.knowledge.core.overview === "string" && out.knowledge.core.overview.length > 0,
      "knowledge.core.overview should be non-empty string",
    );
    assert.ok(
      typeof out.knowledge.core.terms === "string",
      "knowledge.core.terms should be a string",
    );
  });
});

describe("writer-context-builder build — knowledge fallback when project not found", () => {
  it("exits 0 and knowledge is an object when project does not exist", () => {
    const prdPath = join(TMP_DIR, "ki-no-proj.md");
    const tpPath = join(TMP_DIR, "ki-no-proj-tp.json");
    writeFileSync(prdPath, MOCK_PRD, "utf8");
    writeFileSync(tpPath, JSON.stringify(MOCK_TEST_POINTS), "utf8");

    const { code, stdout } = run([
      "build",
      "--prd", prdPath,
      "--test-points", tpPath,
      "--writer-id", "商品管理",
      "--knowledge-injection", "read-core",
      "--project", "nonexistent-project-xyz-9999",
    ]);

    // knowledge-keeper returns empty content (status 0) for nonexistent project
    // so the script should not crash and should return a valid knowledge object
    assert.equal(code, 0, "should not crash when project does not exist");
    const out = JSON.parse(stdout) as { knowledge: Record<string, unknown> };
    assert.ok(
      out.knowledge !== null && typeof out.knowledge === "object",
      "knowledge should be an object even when project does not exist",
    );
  });
});

describe("writer-context-builder build — --prd-slug + --yyyymm (enhanced.md primary path)", () => {
  const ENH_TMP = join(tmpdir(), `kata-wcb-enh-${process.pid}`);
  const PROJECT = "wcb-enh-fixture";
  const YM = "202604";
  const SLUG = "demo-feature";
  const PRD_DIR_ABS = join(ENH_TMP, PROJECT, "prds", YM, SLUG);
  const ENHANCED_PATH = join(PRD_DIR_ABS, "enhanced.md");
  const TP_PATH = join(ENH_TMP, "test-points-enh.json");
  const LEGACY_PRD = join(ENH_TMP, "legacy.md");

  before(() => {
    mkdirSync(PRD_DIR_ABS, { recursive: true });

    writeFileSync(
      ENHANCED_PATH,
      [
        "---",
        "schema_version: 1",
        "---",
        "",
        '## 1. 概述 <a id="s-1"></a>',
        "",
        "项目背景内容",
        "",
        '## 2. 用户登录 <a id="s-2-1-a1b2"></a>',
        "",
        "用户登录模块详细描述",
        "",
        '## 3. 数据看板 <a id="s-3-1-c3d4"></a>',
        "",
        "数据看板模块描述",
        "",
      ].join("\n"),
      "utf8",
    );

    writeFileSync(
      TP_PATH,
      JSON.stringify({
        modules: [
          {
            name: "用户登录",
            test_points: [{ id: "TP-1", description: "正向登录" }],
          },
          {
            name: "数据看板",
            test_points: [{ id: "TP-2", description: "看板加载" }],
          },
        ],
      }),
      "utf8",
    );

    writeFileSync(
      LEGACY_PRD,
      [
        "# 标题",
        "",
        "## 用户登录",
        "",
        "legacy 模块描述",
        "",
      ].join("\n"),
      "utf8",
    );
  });

  after(() => {
    try {
      rmSync(ENH_TMP, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("reads enhanced.md when --prd-slug + --yyyymm + --workspace-dir given", () => {
    const { code, stdout, stderr } = run([
      "build",
      "--prd-slug", SLUG,
      "--yyyymm", YM,
      "--project", PROJECT,
      "--workspace-dir", ENH_TMP,
      "--test-points", TP_PATH,
      "--writer-id", "用户登录",
      "--knowledge-injection", "none",
    ]);

    assert.equal(code, 0, `expected exit 0, stderr=${stderr}\nstdout=${stdout}`);
    const ctx = JSON.parse(stdout) as {
      module_prd_section: string;
      fallback: boolean;
    };
    assert.match(ctx.module_prd_section, /用户登录模块详细描述/);
    assert.equal(ctx.fallback, false);
  });

  it("falls back to legacy --prd <path> when --prd-slug omitted", () => {
    const { code, stdout, stderr } = run([
      "build",
      "--prd", LEGACY_PRD,
      "--test-points", TP_PATH,
      "--writer-id", "用户登录",
      "--knowledge-injection", "none",
    ]);

    assert.equal(code, 0, `expected exit 0, stderr=${stderr}\nstdout=${stdout}`);
    const ctx = JSON.parse(stdout) as { module_prd_section: string };
    assert.match(ctx.module_prd_section, /legacy 模块描述/);
  });

  it("errors when neither --prd nor --prd-slug given", () => {
    const { code, stdout, stderr } = run([
      "build",
      "--test-points", TP_PATH,
      "--writer-id", "用户登录",
      "--knowledge-injection", "none",
    ]);

    assert.notEqual(code, 0);
    assert.match(stdout + stderr, /--prd|--prd-slug/);
  });
});

describe("writer-context-builder build — 8KB truncation", () => {
  afterEach(() => {
    cleanupFixtureKnowledge();
  });

  it("knowledge.core.overview is truncated to <= 8192 bytes when overview > 8KB", () => {
    // Build an overview content larger than 8KB
    const longContent = "X".repeat(10 * 1024); // 10KB of content
    setupFixtureKnowledge(longContent);

    const prdPath = join(TMP_DIR, "ki-trunc.md");
    const tpPath = join(TMP_DIR, "ki-trunc-tp.json");
    writeFileSync(prdPath, MOCK_PRD, "utf8");
    writeFileSync(tpPath, JSON.stringify(MOCK_TEST_POINTS), "utf8");

    const { code, stdout } = run([
      "build",
      "--prd", prdPath,
      "--test-points", tpPath,
      "--writer-id", "商品管理",
      "--knowledge-injection", "read-core",
      "--project", FIXTURE_PROJECT,
    ]);

    assert.equal(code, 0);
    const out = JSON.parse(stdout) as {
      knowledge: { core?: { overview: string; terms: string } };
    };

    assert.ok(out.knowledge.core, "knowledge.core should be present");
    assert.ok(
      out.knowledge.core.overview.length <= 8192,
      `overview should be <= 8192 chars, got ${out.knowledge.core.overview.length}`,
    );
  });
});
