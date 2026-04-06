import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

// 文件位置：.claude/scripts/__tests__/ui-autotest/merge-specs.test.ts
// REPO_ROOT 需要向上 4 层
const REPO_ROOT_MERGE = resolve(import.meta.dirname, "../../../..");
const MERGE_SPECS_PATH = resolve(
  REPO_ROOT_MERGE,
  ".claude/skills/ui-autotest/scripts/merge-specs.ts",
);

const { buildSpecContent, mergeSpecs, parseBlockMeta, readCodeBlocks } = await import(
  `file://${MERGE_SPECS_PATH}`
);

const TMP_DIR = join(tmpdir(), `qa-flow-merge-specs-test-${process.pid}`);

// ────────────────────────────────────────────────────────────
// 测试夹具
// ────────────────────────────────────────────────────────────

const BLOCK_P0 = `// META: {"id":"t1","priority":"P0","title":"【P0】验证列表页默认加载"}
import { test, expect } from '@playwright/test';

test.use({ storageState: '.auth/session.json' });

test.describe('质量问题台账 - 列表页', () => {
  test('【P0】验证列表页默认加载', async ({ page }) => {
    await page.goto('https://test.example.com');
    await expect(page.getByRole('heading')).toBeVisible();
  });
});
`;

const BLOCK_P1 = `// META: {"id":"t2","priority":"P1","title":"【P1】验证筛选功能"}
import { test, expect } from '@playwright/test';

test.use({ storageState: '.auth/session.json' });

test.describe('质量问题台账 - 列表页', () => {
  test('【P1】验证筛选功能', async ({ page }) => {
    await page.goto('https://test.example.com');
    await page.getByText('数据缺失').click();
    await expect(page.locator('table tbody tr')).not.toHaveCount(0);
  });
});
`;

const BLOCK_P2 = `// META: {"id":"t3","priority":"P2","title":"【P2】验证分页功能"}
import { test, expect } from '@playwright/test';

test.describe('质量问题台账 - 列表页', () => {
  test('【P2】验证分页功能', async ({ page }) => {
    await page.goto('https://test.example.com');
    await page.getByRole('button', { name: '下一页' }).click();
    await expect(page.locator('table tbody tr')).toBeVisible();
  });
});
`;

const BLOCK_INVALID = `// 无 META 注释的代码块
import { test } from '@playwright/test';

test('without meta', async ({ page }) => {
  await page.goto('https://example.com');
});
`;

// ────────────────────────────────────────────────────────────
// setup/teardown
// ────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────
// 单元测试
// ────────────────────────────────────────────────────────────

describe("parseBlockMeta", () => {
  it("正确解析 META 注释", () => {
    const meta = parseBlockMeta(BLOCK_P0);
    assert.ok(meta, "应返回 meta 对象");
    assert.equal(meta.id, "t1");
    assert.equal(meta.priority, "P0");
    assert.ok(meta.title.includes("验证列表页"));
  });

  it("无 META 注释时返回 null", () => {
    const meta = parseBlockMeta(BLOCK_INVALID);
    assert.equal(meta, null);
  });

  it("空内容返回 null", () => {
    assert.equal(parseBlockMeta(""), null);
  });
});

describe("readCodeBlocks", () => {
  it("从目录读取所有代码块文件", () => {
    const blocksDir = join(TMP_DIR, "blocks-read-test");
    mkdirSync(blocksDir, { recursive: true });
    writeFileSync(join(blocksDir, "t1.ts"), BLOCK_P0, "utf-8");
    writeFileSync(join(blocksDir, "t2.ts"), BLOCK_P1, "utf-8");

    const blocks = readCodeBlocks(blocksDir);
    assert.equal(blocks.length, 2);
  });

  it("跳过无效 META 的代码块", () => {
    const blocksDir = join(TMP_DIR, "blocks-invalid-test");
    mkdirSync(blocksDir, { recursive: true });
    writeFileSync(join(blocksDir, "valid.ts"), BLOCK_P0, "utf-8");
    writeFileSync(join(blocksDir, "invalid.ts"), BLOCK_INVALID, "utf-8");

    const blocks = readCodeBlocks(blocksDir);
    assert.equal(blocks.length, 1, "应只读取有效代码块");
    assert.equal(blocks[0].meta.id, "t1");
  });

  it("目录不存在时返回空数组", () => {
    const blocks = readCodeBlocks("/nonexistent/dir");
    assert.deepEqual(blocks, []);
  });
});

describe("buildSpecContent", () => {
  it("空 blocks 时生成占位内容", () => {
    const content = buildSpecContent([], "冒烟测试");
    assert.ok(content.includes("冒烟测试"), "应包含标签");
    assert.ok(content.includes("import"), "应包含 import 语句");
  });

  it("生成内容包含所有 test.describe 块", () => {
    const blocksDir = join(TMP_DIR, "build-spec-test");
    mkdirSync(blocksDir, { recursive: true });
    writeFileSync(join(blocksDir, "t1.ts"), BLOCK_P0, "utf-8");
    writeFileSync(join(blocksDir, "t2.ts"), BLOCK_P1, "utf-8");

    const blocks = readCodeBlocks(blocksDir);
    const content = buildSpecContent(blocks, "完整测试");

    // 去除重复 import
    const importCount = (content.match(/^import /gm) ?? []).length;
    assert.equal(importCount, 1, "应只有一个 import 语句");

    // 包含两个 test.describe
    const describeCount = (content.match(/test\.describe\(/g) ?? []).length;
    assert.equal(describeCount, 2, "应包含两个 test.describe 块");
  });
});

describe("mergeSpecs", () => {
  it("生成 smoke.spec.ts 和 full.spec.ts", () => {
    const blocksDir = join(TMP_DIR, "merge-input");
    const outputDir = join(TMP_DIR, "merge-output");
    mkdirSync(blocksDir, { recursive: true });

    writeFileSync(join(blocksDir, "t1.ts"), BLOCK_P0, "utf-8");
    writeFileSync(join(blocksDir, "t2.ts"), BLOCK_P1, "utf-8");
    writeFileSync(join(blocksDir, "t3.ts"), BLOCK_P2, "utf-8");

    const result = mergeSpecs(blocksDir, outputDir);

    assert.ok(
      result.smoke_spec.endsWith("smoke.spec.ts"),
      "smoke_spec 路径应以 smoke.spec.ts 结尾",
    );
    assert.ok(result.full_spec.endsWith("full.spec.ts"), "full_spec 路径应以 full.spec.ts 结尾");
    assert.equal(result.case_count.smoke, 1, "冒烟测试应只含 P0 用例");
    assert.equal(result.case_count.full, 3, "全量测试应含全部用例");
  });

  it("smoke.spec.ts 只包含 P0 用例", () => {
    const blocksDir = join(TMP_DIR, "merge-smoke-check");
    const outputDir = join(TMP_DIR, "merge-smoke-output");
    mkdirSync(blocksDir, { recursive: true });

    writeFileSync(join(blocksDir, "t1.ts"), BLOCK_P0, "utf-8");
    writeFileSync(join(blocksDir, "t2.ts"), BLOCK_P1, "utf-8");

    const result = mergeSpecs(blocksDir, outputDir);

    const smokeContent = readFileSync(result.smoke_spec, "utf-8");
    assert.ok(smokeContent.includes("验证列表页默认加载"), "smoke spec 应包含 P0 用例");
    assert.ok(!smokeContent.includes("验证筛选功能"), "smoke spec 不应包含 P1 用例");
  });

  it("full.spec.ts 包含所有优先级用例", () => {
    const blocksDir = join(TMP_DIR, "merge-full-check");
    const outputDir = join(TMP_DIR, "merge-full-output");
    mkdirSync(blocksDir, { recursive: true });

    writeFileSync(join(blocksDir, "t1.ts"), BLOCK_P0, "utf-8");
    writeFileSync(join(blocksDir, "t2.ts"), BLOCK_P1, "utf-8");
    writeFileSync(join(blocksDir, "t3.ts"), BLOCK_P2, "utf-8");

    const result = mergeSpecs(blocksDir, outputDir);

    const fullContent = readFileSync(result.full_spec, "utf-8");
    assert.ok(fullContent.includes("验证列表页默认加载"), "应包含 P0 用例");
    assert.ok(fullContent.includes("验证筛选功能"), "应包含 P1 用例");
    assert.ok(fullContent.includes("验证分页功能"), "应包含 P2 用例");
  });

  it("输出目录不存在时自动创建", () => {
    const blocksDir = join(TMP_DIR, "merge-autocreate-blocks");
    const outputDir = join(TMP_DIR, "deep/nested/output");
    mkdirSync(blocksDir, { recursive: true });
    writeFileSync(join(blocksDir, "t1.ts"), BLOCK_P0, "utf-8");

    // 不预先创建 outputDir
    const result = mergeSpecs(blocksDir, outputDir);
    assert.ok(result.smoke_spec, "应成功生成 smoke_spec 路径");
  });
});
