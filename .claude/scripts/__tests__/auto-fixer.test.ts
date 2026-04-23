import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const TMP_DIR = join(tmpdir(), `kata-auto-fixer-test-${process.pid}`);

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "kata-cli",
      ["auto-fixer", ...args],
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

// ─── Shared writer JSON builder ───────────────────────────────────────────────

function makeWriterJson(overrides: Record<string, unknown> = {}) {
  return {
    meta: {
      project_name: "数据资产",
      requirement_name: "质量问题台账",
      version: "v6.4.10",
    },
    modules: [
      {
        name: "质量问题台账",
        pages: [
          {
            name: "列表页",
            sub_groups: [
              {
                name: "搜索筛选",
                test_cases: [
                  {
                    title: "验证默认加载列表页",
                    priority: "P0",
                    steps: [
                      { step: "进入页面", expected: "页面正常加载" },
                    ],
                    ...overrides,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

// ─── FC01: 标题前缀补全 ───────────────────────────────────────────────────────

describe("auto-fixer fix — FC01 标题缺少优先级前缀", () => {
  it("补全 【P0】 前缀", () => {
    const writerJson = makeWriterJson({
      title: "验证默认加载列表页",
      priority: "P0",
    });
    const writerPath = join(TMP_DIR, "fc01-writer.json");
    const issuesPath = join(TMP_DIR, "fc01-issues.json");
    const outputPath = join(TMP_DIR, "fc01-output.json");

    writeFileSync(writerPath, JSON.stringify(writerJson, null, 2));
    writeFileSync(
      issuesPath,
      JSON.stringify({
        issues: [
          {
            rule: "FC01",
            case_path: "modules[0].pages[0].sub_groups[0].test_cases[0]",
            description: "标题缺少 【P0】 前缀",
          },
        ],
      }),
    );

    const { code, stdout, stderr } = run([
      "fix",
      "--input",
      writerPath,
      "--issues",
      issuesPath,
      "--output",
      outputPath,
    ]);

    assert.equal(code, 0, `stderr: ${stderr}`);

    const output = JSON.parse(readFileSync(outputPath, "utf8"));
    const title =
      output.modules[0].pages[0].sub_groups[0].test_cases[0].title as string;
    assert.ok(title.startsWith("【P0】"), `Expected title to start with 【P0】, got: ${title}`);

    const report = JSON.parse(stdout) as { fixed: number; skipped_manual: number; total: number };
    assert.equal(report.fixed, 1);
    assert.equal(report.skipped_manual, 0);
    assert.equal(report.total, 1);
  });

  it("不重复添加已有前缀", () => {
    const writerJson = makeWriterJson({
      title: "【P1】验证按问题类型筛选",
      priority: "P1",
    });
    const writerPath = join(TMP_DIR, "fc01-dup-writer.json");
    const issuesPath = join(TMP_DIR, "fc01-dup-issues.json");
    const outputPath = join(TMP_DIR, "fc01-dup-output.json");

    writeFileSync(writerPath, JSON.stringify(writerJson, null, 2));
    writeFileSync(
      issuesPath,
      JSON.stringify({
        issues: [
          {
            rule: "FC01",
            case_path: "modules[0].pages[0].sub_groups[0].test_cases[0]",
            description: "标题缺少 【P1】 前缀",
          },
        ],
      }),
    );

    const { code } = run([
      "fix",
      "--input",
      writerPath,
      "--issues",
      issuesPath,
      "--output",
      outputPath,
    ]);
    assert.equal(code, 0);

    const output = JSON.parse(readFileSync(outputPath, "utf8"));
    const title =
      output.modules[0].pages[0].sub_groups[0].test_cases[0].title as string;
    // Should not double-prefix
    assert.ok(!title.startsWith("【P1】【P1】"), `Title has double prefix: ${title}`);
  });
});

// ─── FC03: 步骤编号移除 ───────────────────────────────────────────────────────

describe("auto-fixer fix — FC03 步骤内容含编号前缀", () => {
  it("移除步骤前缀 '步骤1：'", () => {
    const writerJson = makeWriterJson({
      title: "验证搜索功能",
      priority: "P1",
      steps: [
        { step: "步骤1：进入页面", expected: "页面正常加载" },
        { step: "步骤2：输入关键字", expected: "显示搜索结果" },
      ],
    });
    const writerPath = join(TMP_DIR, "fc03-writer.json");
    const issuesPath = join(TMP_DIR, "fc03-issues.json");
    const outputPath = join(TMP_DIR, "fc03-output.json");

    writeFileSync(writerPath, JSON.stringify(writerJson, null, 2));
    writeFileSync(
      issuesPath,
      JSON.stringify({
        issues: [
          {
            rule: "FC03",
            case_path: "modules[0].pages[0].sub_groups[0].test_cases[0]",
            description: "步骤含编号前缀",
          },
        ],
      }),
    );

    const { code, stderr } = run([
      "fix",
      "--input",
      writerPath,
      "--issues",
      issuesPath,
      "--output",
      outputPath,
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const output = JSON.parse(readFileSync(outputPath, "utf8"));
    const steps = output.modules[0].pages[0].sub_groups[0].test_cases[0].steps as Array<{ step: string; expected: string }>;
    assert.equal(steps[0].step, "进入页面");
    assert.equal(steps[1].step, "输入关键字");
  });

  it("移除步骤前缀 'Step 1: '", () => {
    const writerJson = makeWriterJson({
      title: "验证搜索功能",
      priority: "P1",
      steps: [
        { step: "Step 1: Open page", expected: "Page loads" },
        { step: "Step 2: Enter keyword", expected: "Results shown" },
      ],
    });
    const writerPath = join(TMP_DIR, "fc03-en-writer.json");
    const issuesPath = join(TMP_DIR, "fc03-en-issues.json");
    const outputPath = join(TMP_DIR, "fc03-en-output.json");

    writeFileSync(writerPath, JSON.stringify(writerJson, null, 2));
    writeFileSync(
      issuesPath,
      JSON.stringify({
        issues: [
          {
            rule: "FC03",
            case_path: "modules[0].pages[0].sub_groups[0].test_cases[0]",
            description: "步骤含编号前缀",
          },
        ],
      }),
    );

    const { code } = run([
      "fix",
      "--input",
      writerPath,
      "--issues",
      issuesPath,
      "--output",
      outputPath,
    ]);
    assert.equal(code, 0);

    const output = JSON.parse(readFileSync(outputPath, "utf8"));
    const steps = output.modules[0].pages[0].sub_groups[0].test_cases[0].steps as Array<{ step: string }>;
    assert.equal(steps[0].step, "Open page");
    assert.equal(steps[1].step, "Enter keyword");
  });
});

// ─── F13: 模糊兜底删除 ────────────────────────────────────────────────────────

describe("auto-fixer fix — F13 预期结果含模糊兜底", () => {
  it("删除 '或等价...$' 后缀", () => {
    const writerJson = makeWriterJson({
      title: "验证提交功能",
      priority: "P0",
      steps: [
        {
          step: "点击提交按钮",
          expected: "显示成功提示或等价提示信息",
        },
      ],
    });
    const writerPath = join(TMP_DIR, "f13-writer.json");
    const issuesPath = join(TMP_DIR, "f13-issues.json");
    const outputPath = join(TMP_DIR, "f13-output.json");

    writeFileSync(writerPath, JSON.stringify(writerJson, null, 2));
    writeFileSync(
      issuesPath,
      JSON.stringify({
        issues: [
          {
            rule: "F13",
            case_path: "modules[0].pages[0].sub_groups[0].test_cases[0]",
            description: "预期结果含模糊兜底",
          },
        ],
      }),
    );

    const { code, stdout, stderr } = run([
      "fix",
      "--input",
      writerPath,
      "--issues",
      issuesPath,
      "--output",
      outputPath,
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const output = JSON.parse(readFileSync(outputPath, "utf8"));
    const expected =
      output.modules[0].pages[0].sub_groups[0].test_cases[0].steps[0].expected as string;
    assert.ok(!expected.includes("或等价"), `Expected result still has 或等价: ${expected}`);
    assert.equal(expected, "显示成功提示");

    const report = JSON.parse(stdout) as { fixed: number };
    assert.equal(report.fixed, 1);
  });

  it("删除 '或类似...$' 后缀", () => {
    const writerJson = makeWriterJson({
      title: "验证提交功能",
      priority: "P0",
      steps: [
        {
          step: "点击提交按钮",
          expected: "弹出确认对话框或类似弹框提示",
        },
      ],
    });
    const writerPath = join(TMP_DIR, "f13-leisi-writer.json");
    const issuesPath = join(TMP_DIR, "f13-leisi-issues.json");
    const outputPath = join(TMP_DIR, "f13-leisi-output.json");

    writeFileSync(writerPath, JSON.stringify(writerJson, null, 2));
    writeFileSync(
      issuesPath,
      JSON.stringify({
        issues: [
          {
            rule: "F13",
            case_path: "modules[0].pages[0].sub_groups[0].test_cases[0]",
            description: "预期结果含模糊兜底",
          },
        ],
      }),
    );

    const { code } = run([
      "fix",
      "--input",
      writerPath,
      "--issues",
      issuesPath,
      "--output",
      outputPath,
    ]);
    assert.equal(code, 0);

    const output = JSON.parse(readFileSync(outputPath, "utf8"));
    const expected =
      output.modules[0].pages[0].sub_groups[0].test_cases[0].steps[0].expected as string;
    assert.ok(!expected.includes("或类似"), `Expected result still has 或类似: ${expected}`);
    assert.equal(expected, "弹出确认对话框");
  });

  it("删除 '或等效...$' 后缀", () => {
    const writerJson = makeWriterJson({
      title: "验证提交功能",
      priority: "P1",
      steps: [
        {
          step: "点击保存",
          expected: "数据保存成功或等效操作成功",
        },
      ],
    });
    const writerPath = join(TMP_DIR, "f13-dengxiao-writer.json");
    const issuesPath = join(TMP_DIR, "f13-dengxiao-issues.json");
    const outputPath = join(TMP_DIR, "f13-dengxiao-output.json");

    writeFileSync(writerPath, JSON.stringify(writerJson, null, 2));
    writeFileSync(
      issuesPath,
      JSON.stringify({
        issues: [
          {
            rule: "F13",
            case_path: "modules[0].pages[0].sub_groups[0].test_cases[0]",
            description: "预期结果含模糊兜底",
          },
        ],
      }),
    );

    const { code } = run([
      "fix",
      "--input",
      writerPath,
      "--issues",
      issuesPath,
      "--output",
      outputPath,
    ]);
    assert.equal(code, 0);

    const output = JSON.parse(readFileSync(outputPath, "utf8"));
    const expected =
      output.modules[0].pages[0].sub_groups[0].test_cases[0].steps[0].expected as string;
    assert.ok(!expected.includes("或等效"), `Expected result still has 或等效: ${expected}`);
    assert.equal(expected, "数据保存成功");
  });
});

// ─── F12: 多项编号换行 ────────────────────────────────────────────────────────

describe("auto-fixer fix — F12 预期结果多项未编号", () => {
  it("3+ 分号分隔子项拆分为编号格式", () => {
    const writerJson = makeWriterJson({
      title: "验证列表展示",
      priority: "P1",
      steps: [
        {
          step: "查看列表",
          expected: "显示问题ID；显示问题类型；显示创建时间；显示状态",
        },
      ],
    });
    const writerPath = join(TMP_DIR, "f12-writer.json");
    const issuesPath = join(TMP_DIR, "f12-issues.json");
    const outputPath = join(TMP_DIR, "f12-output.json");

    writeFileSync(writerPath, JSON.stringify(writerJson, null, 2));
    writeFileSync(
      issuesPath,
      JSON.stringify({
        issues: [
          {
            rule: "F12",
            case_path: "modules[0].pages[0].sub_groups[0].test_cases[0]",
            description: "预期结果多项未编号",
          },
        ],
      }),
    );

    const { code, stdout, stderr } = run([
      "fix",
      "--input",
      writerPath,
      "--issues",
      issuesPath,
      "--output",
      outputPath,
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const output = JSON.parse(readFileSync(outputPath, "utf8"));
    const expected =
      output.modules[0].pages[0].sub_groups[0].test_cases[0].steps[0].expected as string;
    assert.ok(expected.includes("1)"), `Expected numbered format, got: ${expected}`);
    assert.ok(expected.includes("2)"), `Expected numbered format, got: ${expected}`);
    assert.ok(expected.includes("3)"), `Expected numbered format, got: ${expected}`);
    assert.ok(expected.includes("4)"), `Expected numbered format, got: ${expected}`);

    const report = JSON.parse(stdout) as { fixed: number };
    assert.equal(report.fixed, 1);
  });

  it("3+ 逗号分隔子项拆分为编号格式", () => {
    const writerJson = makeWriterJson({
      title: "验证字段显示",
      priority: "P2",
      steps: [
        {
          step: "查看详情",
          expected: "显示名称，显示描述，显示创建人，显示更新时间",
        },
      ],
    });
    const writerPath = join(TMP_DIR, "f12-comma-writer.json");
    const issuesPath = join(TMP_DIR, "f12-comma-issues.json");
    const outputPath = join(TMP_DIR, "f12-comma-output.json");

    writeFileSync(writerPath, JSON.stringify(writerJson, null, 2));
    writeFileSync(
      issuesPath,
      JSON.stringify({
        issues: [
          {
            rule: "F12",
            case_path: "modules[0].pages[0].sub_groups[0].test_cases[0]",
            description: "预期结果多项未编号",
          },
        ],
      }),
    );

    const { code } = run([
      "fix",
      "--input",
      writerPath,
      "--issues",
      issuesPath,
      "--output",
      outputPath,
    ]);
    assert.equal(code, 0);

    const output = JSON.parse(readFileSync(outputPath, "utf8"));
    const expected =
      output.modules[0].pages[0].sub_groups[0].test_cases[0].steps[0].expected as string;
    assert.ok(expected.includes("1)"), `Expected numbered format, got: ${expected}`);
    assert.ok(expected.includes("4)"), `Expected numbered format, got: ${expected}`);
  });

  it("2 项分隔时不拆分", () => {
    const writerJson = makeWriterJson({
      title: "验证字段显示",
      priority: "P2",
      steps: [
        {
          step: "查看详情",
          expected: "显示名称；显示描述",
        },
      ],
    });
    const writerPath = join(TMP_DIR, "f12-two-writer.json");
    const issuesPath = join(TMP_DIR, "f12-two-issues.json");
    const outputPath = join(TMP_DIR, "f12-two-output.json");

    writeFileSync(writerPath, JSON.stringify(writerJson, null, 2));
    writeFileSync(
      issuesPath,
      JSON.stringify({
        issues: [
          {
            rule: "F12",
            case_path: "modules[0].pages[0].sub_groups[0].test_cases[0]",
            description: "预期结果多项未编号",
          },
        ],
      }),
    );

    const { code } = run([
      "fix",
      "--input",
      writerPath,
      "--issues",
      issuesPath,
      "--output",
      outputPath,
    ]);
    assert.equal(code, 0);

    const output = JSON.parse(readFileSync(outputPath, "utf8"));
    const expected =
      output.modules[0].pages[0].sub_groups[0].test_cases[0].steps[0].expected as string;
    // Should remain unchanged (2 items < 3 threshold)
    assert.ok(!expected.includes("1)"), `Should not reformat 2-item list, got: ${expected}`);
  });
});

// ─── manual=true 跳过 ─────────────────────────────────────────────────────────

describe("auto-fixer fix — manual=true 的问题跳过不修改", () => {
  it("manual issues 不修改用例内容", () => {
    const writerJson = makeWriterJson({
      title: "验证默认加载列表页",
      priority: "P0",
    });
    const writerPath = join(TMP_DIR, "manual-writer.json");
    const issuesPath = join(TMP_DIR, "manual-issues.json");
    const outputPath = join(TMP_DIR, "manual-output.json");

    writeFileSync(writerPath, JSON.stringify(writerJson, null, 2));
    writeFileSync(
      issuesPath,
      JSON.stringify({
        issues: [
          {
            rule: "F14",
            case_path: "modules[0].pages[0].sub_groups[0].test_cases[0]",
            description: "需要手动修复的问题",
            manual: true,
          },
        ],
      }),
    );

    const { code, stdout, stderr } = run([
      "fix",
      "--input",
      writerPath,
      "--issues",
      issuesPath,
      "--output",
      outputPath,
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const output = JSON.parse(readFileSync(outputPath, "utf8"));
    const title =
      output.modules[0].pages[0].sub_groups[0].test_cases[0].title as string;
    // Title should remain unchanged
    assert.equal(title, "验证默认加载列表页");

    const report = JSON.parse(stdout) as { fixed: number; skipped_manual: number; total: number };
    assert.equal(report.fixed, 0);
    assert.equal(report.skipped_manual, 1);
    assert.equal(report.total, 1);
  });
});

// ─── 无问题时输入输出一致 ─────────────────────────────────────────────────────

describe("auto-fixer fix — 无问题时输入输出一致", () => {
  it("空 issues 列表时输出与输入完全相同", () => {
    const writerJson = makeWriterJson({
      title: "验证默认加载列表页",
      priority: "P0",
    });
    const writerPath = join(TMP_DIR, "empty-writer.json");
    const issuesPath = join(TMP_DIR, "empty-issues.json");
    const outputPath = join(TMP_DIR, "empty-output.json");

    writeFileSync(writerPath, JSON.stringify(writerJson, null, 2));
    writeFileSync(
      issuesPath,
      JSON.stringify({ issues: [] }),
    );

    const { code, stdout, stderr } = run([
      "fix",
      "--input",
      writerPath,
      "--issues",
      issuesPath,
      "--output",
      outputPath,
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const output = JSON.parse(readFileSync(outputPath, "utf8"));
    assert.deepEqual(output, writerJson);

    const report = JSON.parse(stdout) as { fixed: number; skipped_manual: number; total: number };
    assert.equal(report.fixed, 0);
    assert.equal(report.skipped_manual, 0);
    assert.equal(report.total, 0);
  });
});

// ─── mixed issues ─────────────────────────────────────────────────────────────

describe("auto-fixer fix — 混合 issues 正确统计", () => {
  it("auto + manual 混合时报告统计正确", () => {
    const writerJson = makeWriterJson({
      title: "验证默认加载列表页",
      priority: "P0",
    });
    const writerPath = join(TMP_DIR, "mixed-writer.json");
    const issuesPath = join(TMP_DIR, "mixed-issues.json");
    const outputPath = join(TMP_DIR, "mixed-output.json");

    writeFileSync(writerPath, JSON.stringify(writerJson, null, 2));
    writeFileSync(
      issuesPath,
      JSON.stringify({
        issues: [
          {
            rule: "FC01",
            case_path: "modules[0].pages[0].sub_groups[0].test_cases[0]",
            description: "标题缺少 【P0】 前缀",
          },
          {
            rule: "F14",
            case_path: "modules[0].pages[0].sub_groups[0].test_cases[0]",
            description: "需要手动修复",
            manual: true,
          },
        ],
      }),
    );

    const { code, stdout, stderr } = run([
      "fix",
      "--input",
      writerPath,
      "--issues",
      issuesPath,
      "--output",
      outputPath,
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const report = JSON.parse(stdout) as { fixed: number; skipped_manual: number; total: number };
    assert.equal(report.fixed, 1);
    assert.equal(report.skipped_manual, 1);
    assert.equal(report.total, 2);
  });
});
