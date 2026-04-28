import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, it, expect } from "bun:test";

// 通过 process.argv[1] 或文件系统路径推算 REPO_ROOT，确保在 --test worker 模式下也正确解析
// REPO_ROOT 需要向上 3 层：ui-autotest/ → tests/ → engine/ → repo root
const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const PARSE_CASES_PATH = resolve(
  REPO_ROOT,
  "engine/src/ui-autotest/parse-cases.ts",
);

const {
  extractPriority,
  parseArchiveMd,
  parseStepTable,
  extractPreconditions,
} = await import(`file://${PARSE_CASES_PATH}`);
const TMP_DIR = join(tmpdir(), `kata-parse-cases-test-${process.pid}`);

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
    expect(extractPriority("【P0】验证列表页默认加载")).toBe("P0");
  });

  it("从【P1】前缀提取 P1", () => {
    expect(extractPriority("【P1】验证筛选功能")).toBe("P1");
  });

  it("从【P2】前缀提取 P2", () => {
    expect(extractPriority("【P2】验证分页功能")).toBe("P2");
  });

  it("无优先级前缀时默认返回 P2", () => {
    expect(extractPriority("验证无优先级标记的用例")).toBe("P2");
  });

  it("标题中间含优先级时正确提取", () => {
    expect(extractPriority("验证【P1】某功能")).toBe("P1");
  });
});

describe("parseStepTable", () => {
  it("解析标准步骤表格", () => {
    const table = `| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【商品管理】页面 | 页面正常加载 |
| 2 | 点击【新增】按钮 | 弹出新增对话框 |`;

    const steps = parseStepTable(table);
    expect(steps.length).toBe(2);
    expect(steps[0].step).toBe("进入【商品管理】页面");
    expect(steps[0].expected).toBe("页面正常加载");
    expect(steps[1].step).toBe("点击【新增】按钮");
    expect(steps[1].expected).toBe("弹出新增对话框");
  });

  it("跳过表头行", () => {
    const table = `| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 步骤A | 预期A |`;

    const steps = parseStepTable(table);
    expect(steps.length).toBe(1);
    expect(steps[0].step).toBe("步骤A");
  });

  it("空表格返回空数组", () => {
    const steps = parseStepTable("");
    expect(steps.length).toBe(0);
  });

  it("格式不规范时仍能解析", () => {
    const table = `|编号|步骤|预期|
|---|---|---|
|1|进入页面|正常加载|`;

    const steps = parseStepTable(table);
    expect(steps.length).toBe(1);
    expect(steps[0].step).toBe("进入页面");
    expect(steps[0].expected).toBe("正常加载");
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
    expect(
      preconditions.includes("环境已部署").toBeTruthy(),
      `应包含前置条件内容，实际：${preconditions}`,
    );
  });

  it("无前置条件时返回空字符串", () => {
    const block = `##### 【P1】验证xxx

> 用例步骤

| 编号 | 步骤 | 预期 |`;

    const result = extractPreconditions(block);
    expect(result).toBe("");
  });
});

describe("parseArchiveMd", () => {
  it("正确解析 suite_name 和用例总数", () => {
    const result = parseArchiveMd(FIXTURE_MD, "test.md");
    expect(result.suite_name).toBe("质量问题台账");
    expect(result.stats.total).toBe(3);
  });

  it("按优先级统计用例数量", () => {
    const result = parseArchiveMd(FIXTURE_MD, "test.md");
    expect(result.stats.P0).toBe(1);
    expect(result.stats.P1).toBe(1);
    expect(result.stats.P2).toBe(1);
  });

  it("每个用例包含完整字段", () => {
    const result = parseArchiveMd(FIXTURE_MD, "test.md");
    const firstTask = result.tasks[0];
    expect(firstTask).toBeTruthy();
    expect(firstTask.priority).toBe("P0");
    expect(
      firstTask.title.includes("默认加载").toBeTruthy(),
      `标题应包含关键词，实际：${firstTask.title}`,
    );
    expect(Array.isArray(firstTask.steps).toBeTruthy(), "steps 应为数组");
    expect(firstTask.steps.length > 0).toBeTruthy();
  });

  it("保留 Archive MD 的 B 格式标题并单独提取优先级", () => {
    const result = parseArchiveMd(FIXTURE_MD, "test.md");
    const secondTask = result.tasks[1];
    expect(secondTask).toBeTruthy();
    expect(secondTask.title).toBe("【P1】验证按问题类型筛选");
    expect(secondTask.priority).toBe("P1");
  });

  it("用例步骤包含 step 和 expected", () => {
    const result = parseArchiveMd(FIXTURE_MD, "test.md");
    const firstTask = result.tasks[0];
    const firstStep = firstTask.steps[0];
    expect(firstStep.step).toBeTruthy();
    expect(firstStep.expected).toBeTruthy();
  });

  it("无优先级前缀的用例默认 P2", () => {
    const result = parseArchiveMd(FIXTURE_MD_NO_PRIORITY, "test.md");
    expect(result.stats.total).toBe(1);
    expect(result.tasks[0].priority).toBe("P2");
  });

  it("无用例的 MD 返回空 tasks", () => {
    const result = parseArchiveMd(FIXTURE_MD_EMPTY, "test.md");
    expect(result.tasks.length).toBe(0);
    expect(result.stats.total).toBe(0);
  });

  it("source 字段使用传入的文件路径", () => {
    const result = parseArchiveMd(FIXTURE_MD, "/custom/path/test.md");
    expect(result.source).toBe("/custom/path/test.md");
  });

  it("每个任务有唯一 id", () => {
    const result = parseArchiveMd(FIXTURE_MD, "test.md");
    const ids = result.tasks.map((t: { id: string }) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
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
      ["run", "engine/src/ui-autotest/parse-cases.ts", ...args],
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

describe("parse-cases CLI", () => {
  it("解析测试夹具 MD 并输出有效 JSON", () => {
    const fixturePath = join(TMP_DIR, "fixture.md");
    writeFileSync(fixturePath, FIXTURE_MD, "utf-8");

    const { stdout, code } = runCli(["--file", fixturePath]);
    expect(code).toBe(0);

    const result = JSON.parse(stdout);
    expect(result.suite_name).toBe("质量问题台账");
    expect(result.stats.total).toBe(3);
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout);
    expect(result.stats.total).toBe(1);
    expect(result.tasks[0].priority).toBe("P0");
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout);
    expect(result.stats.total).toBe(2);
  });

  it("文件不存在时以非零状态码退出", () => {
    const { code } = runCli(["--file", "/nonexistent/path.md"]);
    expect(code).not.toBe(0);
  });

  it("--output 将结果写入文件", () => {
    const fixturePath = join(TMP_DIR, "fixture-output.md");
    const outputPath = join(TMP_DIR, "output.json");
    writeFileSync(fixturePath, FIXTURE_MD, "utf-8");

    const { code } = runCli(["--file", fixturePath, "--output", outputPath]);
    expect(code).toBe(0);

    const content = readFileSync(outputPath, "utf-8");
    const result = JSON.parse(content);
    expect(result.suite_name).toBe("质量问题台账");
  });
});
