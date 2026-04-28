import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractPriority,
  parseStepTable,
  extractPreconditions,
  parseArchiveMd,
} from "../parse-cases.ts";

describe("extractPriority", () => {
  it("extracts P0 from title", () => {
    assert.equal(extractPriority("【P0】验证列表加载"), "P0");
  });

  it("extracts P1 from title", () => {
    assert.equal(extractPriority("【P1】验证搜索功能"), "P1");
  });

  it("extracts P2 from title", () => {
    assert.equal(extractPriority("【P2】验证排序功能"), "P2");
  });

  it("defaults to P2 when no priority prefix", () => {
    assert.equal(extractPriority("验证无前缀标题"), "P2");
  });
});

describe("parseStepTable", () => {
  it("parses a standard step table", () => {
    const table = `| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入列表页 | 页面正常加载 |
| 2 | 点击新增按钮 | 弹窗出现 |`;

    const steps = parseStepTable(table);
    assert.equal(steps.length, 2);
    assert.equal(steps[0].step, "进入列表页");
    assert.equal(steps[0].expected, "页面正常加载");
    assert.equal(steps[1].step, "点击新增按钮");
    assert.equal(steps[1].expected, "弹窗出现");
  });

  it("handles empty table", () => {
    const table = `| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |`;
    const steps = parseStepTable(table);
    assert.equal(steps.length, 0);
  });
});

describe("extractPreconditions", () => {
  it("extracts preconditions from code block under blockquote", () => {
    const block = `##### 【P0】验证xxx

> 前置条件

\`\`\`
1) 登录系统
2) 进入列表页
\`\`\`

> 用例步骤`;
    const result = extractPreconditions(block);
    assert.ok(result.includes("登录系统"));
    assert.ok(result.includes("进入列表页"));
  });

  it("extracts preconditions from code block format", () => {
    const block = `##### 【P0】验证xxx

> 前置条件

\`\`\`
1) 登录系统
2) 数据准备完成
\`\`\`

> 用例步骤`;
    const result = extractPreconditions(block);
    assert.ok(result.includes("登录系统"));
    assert.ok(result.includes("数据准备完成"));
  });

  it("handles preconditions containing letter z without truncation", () => {
    const block = `##### 【P0】验证xxx

> 前置条件

\`\`\`
1) 登录 zenith 系统
2) 配置 zookeeper 连接
\`\`\`

> 用例步骤`;
    const result = extractPreconditions(block);
    assert.ok(result.includes("zenith"), "should not truncate at letter z");
    assert.ok(result.includes("zookeeper"), "should include zookeeper");
  });
});

describe("parseArchiveMd", () => {
  const sampleMd = `---
suite_name: "测试套件"
case_count: 2
---

## 模块A

### 列表页

##### 【P0】验证列表默认加载

> 前置条件

\`\`\`
1) 使用 admin 账号登录系统
\`\`\`

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入列表页 | 页面正常加载 |

##### 【P1】验证搜索功能

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 输入关键词 | 列表更新 |
| 2 | 点击查询 | 显示筛选结果 |
`;

  it("parses archive MD into tasks", () => {
    const result = parseArchiveMd(sampleMd, "test.md");
    assert.equal(result.suite_name, "测试套件");
    assert.equal(result.tasks.length, 2);
    assert.equal(result.stats.total, 2);
    assert.equal(result.stats.P0, 1);
    assert.equal(result.stats.P1, 1);
  });

  it("extracts correct page from H3 heading", () => {
    const result = parseArchiveMd(sampleMd, "test.md");
    assert.equal(result.tasks[0].page, "列表页");
  });

  it("extracts steps correctly", () => {
    const result = parseArchiveMd(sampleMd, "test.md");
    assert.equal(result.tasks[0].steps.length, 1);
    assert.equal(result.tasks[1].steps.length, 2);
  });

  it("assigns sequential IDs", () => {
    const result = parseArchiveMd(sampleMd, "test.md");
    assert.equal(result.tasks[0].id, "t1");
    assert.equal(result.tasks[1].id, "t2");
  });

  it("extracts preconditions for cases that have them", () => {
    const result = parseArchiveMd(sampleMd, "test.md");
    assert.ok(result.tasks[0].preconditions.includes("admin"));
    assert.equal(result.tasks[1].preconditions, "");
  });
});
