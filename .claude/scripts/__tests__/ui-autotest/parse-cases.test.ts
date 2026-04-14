import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

// 通过 process.argv[1] 或文件系统路径推算 REPO_ROOT，确保在 --test worker 模式下也正确解析
// 文件位置：.claude/scripts/__tests__/ui-autotest/parse-cases.test.ts
// REPO_ROOT 需要向上 4 层：ui-autotest/ → __tests__/ → scripts/ → .claude/ → repo root
const REPO_ROOT = resolve(import.meta.dirname, "../../../..");
const PARSE_CASES_PATH = resolve(
  REPO_ROOT,
  ".claude/skills/ui-autotest/scripts/parse-cases.ts",
);

const {
  extractPriority,
  parseArchiveMd,
  parseStepTable,
  extractPreconditions,
} = await import(`file://${PARSE_CASES_PATH}`);
const TMP_DIR = join(tmpdir(), `qa-flow-parse-cases-test-${process.pid}`);

// ────────────────────────────────────────────────────────────
// 测试夹具（Archive MD 示例）
// ────────────────────────────────────────────────────────────

const FIXTURE_MD = `---
suite_name: "质量问题台账"
description: "质量问题台账功能测试用例"
product: data-assets
create_at: "2026-04-04"
tags:
  - 数据质量
  - 台账
---

## 数据质量

### 列表页

#### 搜索筛选

##### 【P0】验证质量问题台账列表页默认加载

> 前置条件
\`\`\`
1、环境已部署
2、已有测试数据
\`\`\`

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 质量问题台账】页面 | 页面正常加载 |
| 2 | 查看列表默认数据 | 显示最近创建的问题记录 |

##### 【P1】验证按问题类型筛选

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 质量问题台账】页面 | 页面正常加载 |
| 2 | 在「问题类型」下拉框选择「数据缺失」 | 列表仅显示问题类型为「数据缺失」的记录 |

##### 【P2】验证按时间范围筛选

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 质量问题台账】页面 | 页面正常加载 |
| 2 | 在「创建时间」选择「2026-01-01 至 2026-03-31」 | 列表仅显示该时间范围内的记录 |
`;

const FIXTURE_MD_NO_PRIORITY = `---
suite_name: "无优先级用例"
create_at: "2026-04-04"
---

## 模块

### 页面

##### 验证无优先级前缀的用例标题

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入页面 | 页面正常加载 |
`;

const FIXTURE_MD_EMPTY = `---
suite_name: "空用例"
create_at: "2026-04-04"
---

## 模块

这里没有任何用例。
`;

// ────────────────────────────────────────────────────────────
// 单元测试
// ────────────────────────────────────────────────────────────

describe("extractPriority", () => {
  it("从【P0】前缀提取 P0", () => {
    assert.equal(extractPriority("【P0】验证列表页默认加载"), "P0");
  });

  it("从【P1】前缀提取 P1", () => {
    assert.equal(extractPriority("【P1】验证筛选功能"), "P1");
  });

  it("从【P2】前缀提取 P2", () => {
    assert.equal(extractPriority("【P2】验证分页功能"), "P2");
  });

  it("无优先级前缀时默认返回 P2", () => {
    assert.equal(extractPriority("验证无优先级标记的用例"), "P2");
  });

  it("标题中间含优先级时正确提取", () => {
    assert.equal(extractPriority("验证【P1】某功能"), "P1");
  });
});

describe("parseStepTable", () => {
  it("解析标准步骤表格", () => {
    const table = `| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【商品管理】页面 | 页面正常加载 |
| 2 | 点击【新增】按钮 | 弹出新增对话框 |`;

    const steps = parseStepTable(table);
    assert.equal(steps.length, 2);
    assert.equal(steps[0].step, "进入【商品管理】页面");
    assert.equal(steps[0].expected, "页面正常加载");
    assert.equal(steps[1].step, "点击【新增】按钮");
    assert.equal(steps[1].expected, "弹出新增对话框");
  });

  it("跳过表头行", () => {
    const table = `| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 步骤A | 预期A |`;

    const steps = parseStepTable(table);
    assert.equal(steps.length, 1);
    assert.equal(steps[0].step, "步骤A");
  });

  it("空表格返回空数组", () => {
    const steps = parseStepTable("");
    assert.equal(steps.length, 0);
  });

  it("格式不规范时仍能解析", () => {
    const table = `|编号|步骤|预期|
|---|---|---|
|1|进入页面|正常加载|`;

    const steps = parseStepTable(table);
    assert.equal(steps.length, 1);
    assert.equal(steps[0].step, "进入页面");
    assert.equal(steps[0].expected, "正常加载");
  });
});

describe("extractPreconditions", () => {
  it("提取 > 前置条件 后的代码块内容", () => {
    const block = `##### 【P0】验证xxx

> 前置条件
\`\`\`
1、环境已部署
2、已有测试数据
\`\`\`

> 用例步骤`;

    const preconditions = extractPreconditions(block);
    assert.ok(
      preconditions.includes("环境已部署"),
      `应包含前置条件内容，实际：${preconditions}`,
    );
  });

  it("无前置条件时返回空字符串", () => {
    const block = `##### 【P1】验证xxx

> 用例步骤

| 编号 | 步骤 | 预期 |`;

    const result = extractPreconditions(block);
    assert.equal(result, "");
  });
});

describe("parseArchiveMd", () => {
  it("正确解析 suite_name 和用例总数", () => {
    const result = parseArchiveMd(FIXTURE_MD, "test.md");
    assert.equal(result.suite_name, "质量问题台账");
    assert.equal(result.stats.total, 3);
  });

  it("按优先级统计用例数量", () => {
    const result = parseArchiveMd(FIXTURE_MD, "test.md");
    assert.equal(result.stats.P0, 1);
    assert.equal(result.stats.P1, 1);
    assert.equal(result.stats.P2, 1);
  });

  it("每个用例包含完整字段", () => {
    const result = parseArchiveMd(FIXTURE_MD, "test.md");
    const firstTask = result.tasks[0];
    assert.ok(firstTask, "应有至少一条用例");
    assert.equal(firstTask.priority, "P0");
    assert.ok(
      firstTask.title.includes("默认加载"),
      `标题应包含关键词，实际：${firstTask.title}`,
    );
    assert.ok(Array.isArray(firstTask.steps), "steps 应为数组");
    assert.ok(firstTask.steps.length > 0, "steps 不应为空");
  });

  it("保留 Archive MD 的 B 格式标题并单独提取优先级", () => {
    const result = parseArchiveMd(FIXTURE_MD, "test.md");
    const secondTask = result.tasks[1];
    assert.ok(secondTask, "应解析出第二条用例");
    assert.equal(secondTask.title, "【P1】验证按问题类型筛选");
    assert.equal(secondTask.priority, "P1");
  });

  it("用例步骤包含 step 和 expected", () => {
    const result = parseArchiveMd(FIXTURE_MD, "test.md");
    const firstTask = result.tasks[0];
    const firstStep = firstTask.steps[0];
    assert.ok(firstStep.step, "step 字段不应为空");
    assert.ok(firstStep.expected, "expected 字段不应为空");
  });

  it("无优先级前缀的用例默认 P2", () => {
    const result = parseArchiveMd(FIXTURE_MD_NO_PRIORITY, "test.md");
    assert.equal(result.stats.total, 1);
    assert.equal(result.tasks[0].priority, "P2");
  });

  it("无用例的 MD 返回空 tasks", () => {
    const result = parseArchiveMd(FIXTURE_MD_EMPTY, "test.md");
    assert.equal(result.tasks.length, 0);
    assert.equal(result.stats.total, 0);
  });

  it("source 字段使用传入的文件路径", () => {
    const result = parseArchiveMd(FIXTURE_MD, "/custom/path/test.md");
    assert.equal(result.source, "/custom/path/test.md");
  });

  it("每个任务有唯一 id", () => {
    const result = parseArchiveMd(FIXTURE_MD, "test.md");
    const ids = result.tasks.map((t: { id: string }) => t.id);
    const uniqueIds = new Set(ids);
    assert.equal(uniqueIds.size, ids.length, "所有 id 应唯一");
  });
});

// ────────────────────────────────────────────────────────────
// CLI 集成测试
// ────────────────────────────────────────────────────────────

function runCli(args: string[]): {
  stdout: string;
  stderr: string;
  code: number;
} {
  try {
    const stdout = execFileSync(
      "bun",
      ["run", ".claude/skills/ui-autotest/scripts/parse-cases.ts", ...args],
      { cwd: REPO_ROOT, encoding: "utf8" },
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

describe("parse-cases CLI", () => {
  it("解析测试夹具 MD 并输出有效 JSON", () => {
    const fixturePath = join(TMP_DIR, "fixture.md");
    writeFileSync(fixturePath, FIXTURE_MD, "utf-8");

    const { stdout, code } = runCli(["--file", fixturePath]);
    assert.equal(code, 0, "CLI 应以 0 退出");

    const result = JSON.parse(stdout);
    assert.equal(result.suite_name, "质量问题台账");
    assert.equal(result.stats.total, 3);
  });

  it("--priority P0 过滤后只返回 P0 用例", () => {
    const fixturePath = join(TMP_DIR, "fixture-priority.md");
    writeFileSync(fixturePath, FIXTURE_MD, "utf-8");

    const { stdout, code } = runCli([
      "--file",
      fixturePath,
      "--priority",
      "P0",
    ]);
    assert.equal(code, 0);

    const result = JSON.parse(stdout);
    assert.equal(result.stats.total, 1);
    assert.equal(result.tasks[0].priority, "P0");
  });

  it("--priority P0,P1 过滤后返回 P0 和 P1 用例", () => {
    const fixturePath = join(TMP_DIR, "fixture-multi.md");
    writeFileSync(fixturePath, FIXTURE_MD, "utf-8");

    const { stdout, code } = runCli([
      "--file",
      fixturePath,
      "--priority",
      "P0,P1",
    ]);
    assert.equal(code, 0);

    const result = JSON.parse(stdout);
    assert.equal(result.stats.total, 2);
  });

  it("文件不存在时以非零状态码退出", () => {
    const { code } = runCli(["--file", "/nonexistent/path.md"]);
    assert.notEqual(code, 0, "文件不存在时应以非零状态码退出");
  });

  it("--output 将结果写入文件", () => {
    const fixturePath = join(TMP_DIR, "fixture-output.md");
    const outputPath = join(TMP_DIR, "output.json");
    writeFileSync(fixturePath, FIXTURE_MD, "utf-8");

    const { code } = runCli(["--file", fixturePath, "--output", outputPath]);
    assert.equal(code, 0);

    const content = readFileSync(outputPath, "utf-8");
    const result = JSON.parse(content);
    assert.equal(result.suite_name, "质量问题台账");
  });
});
