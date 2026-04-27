import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const TMP_DIR = join(tmpdir(), `kata-format-check-test-${process.pid}`);

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "kata-cli",
      ["format-check-script", ...args],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        timeout: 30_000,
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

/** Build a minimal valid Archive MD with given cases */
function buildArchiveMd(cases: string[]): string {
  const front = `---
suite_name: "格式检查测试"
create_at: "2026-04-15"
status: "草稿"
case_count: ${cases.length}
---

## 测试模块

### 测试页面

#### 测试功能

`;
  return front + cases.join("\n\n");
}

/** Write a temp archive file and return its path */
function writeTempArchive(content: string): string {
  const path = join(TMP_DIR, `archive-${Date.now()}-${Math.random().toString(36).slice(2)}.md`);
  writeFileSync(path, content);
  return path;
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

// ─── FC01: 标题格式检查 ────────────────────────────────────────────────────────

describe("format-check-script.ts check — FC01 标题缺少优先级前缀", () => {
  it("detects missing 【Px】 prefix as definite FC01 issue", () => {
    const md = buildArchiveMd([
      `##### 验证商品列表默认加载\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入【商品 → 列表页】页面，等待列表加载完成 | 列表展示 |`,
    ]);
    const path = writeTempArchive(md);
    const { code, stdout } = run(["check", "--input", path]);
    assert.equal(code, 0, `stdout: ${stdout}`);

    const result = JSON.parse(stdout) as {
      definite_issues: { rule: string }[];
      suspect_items: { rule: string }[];
      stats: { total_cases: number; definite_count: number };
    };
    const fc01 = result.definite_issues.filter((i) => i.rule === "FC01");
    assert.ok(fc01.length >= 1, "should have at least one FC01 definite issue");
    assert.equal(result.stats.total_cases, 1);
    assert.ok(result.stats.definite_count >= 1);
  });

  it("accepts valid 【P0】 title without FC01 issue", () => {
    const md = buildArchiveMd([
      `##### 【P0】验证商品列表默认加载\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入【商品 → 列表页】页面，等待列表加载完成 | 列表展示 |`,
    ]);
    const path = writeTempArchive(md);
    const { code, stdout } = run(["check", "--input", path]);
    assert.equal(code, 0);
    const result = JSON.parse(stdout) as { definite_issues: { rule: string }[] };
    const fc01 = result.definite_issues.filter((i) => i.rule === "FC01");
    assert.equal(fc01.length, 0, "valid title should not trigger FC01");
  });

  it("detects wrong priority 【P3】 as FC01 issue", () => {
    const md = buildArchiveMd([
      `##### 【P3】验证某功能\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入【模块 → 页面】页面 | 页面展示 |`,
    ]);
    const path = writeTempArchive(md);
    const { code, stdout } = run(["check", "--input", path]);
    assert.equal(code, 0);
    const result = JSON.parse(stdout) as { definite_issues: { rule: string }[] };
    const fc01 = result.definite_issues.filter((i) => i.rule === "FC01");
    assert.ok(fc01.length >= 1, "P3 priority should trigger FC01");
  });
});

// ─── FC02: 首步格式 ────────────────────────────────────────────────────────────

describe("format-check-script.ts check — FC02 首步缺少等待条件", () => {
  it("detects first step missing 等待 condition as FC02 issue", () => {
    const md = buildArchiveMd([
      `##### 【P1】验证搜索功能\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入【商品 → 搜索页】页面 | 页面加载 |\n| 2 | 输入关键词 | 搜索完成 |`,
    ]);
    const path = writeTempArchive(md);
    const { code, stdout } = run(["check", "--input", path]);
    assert.equal(code, 0);
    const result = JSON.parse(stdout) as { definite_issues: { rule: string }[] };
    const fc02 = result.definite_issues.filter((i) => i.rule === "FC02");
    assert.ok(fc02.length >= 1, "should detect FC02: first step missing wait condition");
  });

  it("accepts valid first step with wait condition", () => {
    const md = buildArchiveMd([
      `##### 【P1】验证搜索功能\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入【商品 → 搜索页】页面，等待页面加载完成 | 页面加载 |\n| 2 | 输入关键词 | 搜索完成 |`,
    ]);
    const path = writeTempArchive(md);
    const { code, stdout } = run(["check", "--input", path]);
    assert.equal(code, 0);
    const result = JSON.parse(stdout) as { definite_issues: { rule: string }[] };
    const fc02 = result.definite_issues.filter((i) => i.rule === "FC02");
    assert.equal(fc02.length, 0, "valid first step should not trigger FC02");
  });
});

// ─── FC03: 步骤编号格式 ─────────────────────────────────────────────────────────

describe("format-check-script.ts check — FC03 步骤用文字序号而非表格", () => {
  it("detects inline step numbering (步骤1:) as FC03 issue", () => {
    // Content block (non-table) with step numbering text
    const md = buildArchiveMd([
      `##### 【P0】验证列表功能\n\n步骤1：进入页面\n步骤2：查看数据`,
    ]);
    const path = writeTempArchive(md);
    const { code, stdout } = run(["check", "--input", path]);
    assert.equal(code, 0);
    const result = JSON.parse(stdout) as { definite_issues: { rule: string }[] };
    const fc03 = result.definite_issues.filter((i) => i.rule === "FC03");
    assert.ok(fc03.length >= 1, "should detect FC03: inline step numbering");
  });
});

// ─── FC04: 模糊词检测（suspect，非 definite）──────────────────────────────────

describe("format-check-script.ts check — FC04 模糊词归入 suspect", () => {
  it("puts 相关 fuzzy word into suspect_items NOT definite_issues", () => {
    const md = buildArchiveMd([
      `##### 【P1】验证相关数据显示\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入【商品 → 列表页】页面，等待列表加载完成 | 相关数据正常显示 |`,
    ]);
    const path = writeTempArchive(md);
    const { code, stdout } = run(["check", "--input", path]);
    assert.equal(code, 0);
    const result = JSON.parse(stdout) as {
      definite_issues: { rule: string }[];
      suspect_items: { rule: string }[];
    };
    const fc04Definite = result.definite_issues.filter((i) => i.rule === "FC04");
    const fc04Suspect = result.suspect_items.filter((i) => i.rule === "FC04");
    assert.equal(fc04Definite.length, 0, "FC04 must NOT be in definite_issues");
    assert.ok(fc04Suspect.length >= 1, "FC04 should appear in suspect_items");
  });

  it("puts 尝试 fuzzy word into suspect_items", () => {
    const md = buildArchiveMd([
      `##### 【P2】验证尝试登录功能\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入【登录】页面，等待页面加载完成 | 页面展示 |\n| 2 | 尝试输入账号密码 | 登录成功 |`,
    ]);
    const path = writeTempArchive(md);
    const { code, stdout } = run(["check", "--input", path]);
    assert.equal(code, 0);
    const result = JSON.parse(stdout) as {
      definite_issues: { rule: string }[];
      suspect_items: { rule: string }[];
    };
    const fc04Definite = result.definite_issues.filter((i) => i.rule === "FC04");
    const fc04Suspect = result.suspect_items.filter((i) => i.rule === "FC04");
    assert.equal(fc04Definite.length, 0, "FC04 must NOT be in definite_issues");
    assert.ok(fc04Suspect.length >= 1, "尝试 should appear in suspect_items");
  });
});

// ─── FC05: 占位符检测（definite）────────────────────────────────────────────────

describe("format-check-script.ts check — FC05 占位符检测", () => {
  it("detects placeholder 'test1' as definite FC05 issue", () => {
    const md = buildArchiveMd([
      `##### 【P0】验证登录功能\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入【登录】页面，等待页面加载完成 | 页面展示 |\n| 2 | 输入用户名 test1 和密码 | 登录成功 |`,
    ]);
    const path = writeTempArchive(md);
    const { code, stdout } = run(["check", "--input", path]);
    assert.equal(code, 0);
    const result = JSON.parse(stdout) as { definite_issues: { rule: string }[] };
    const fc05 = result.definite_issues.filter((i) => i.rule === "FC05");
    assert.ok(fc05.length >= 1, "should detect FC05: placeholder test1");
  });

  it("detects placeholder 'xxx' as definite FC05 issue", () => {
    const md = buildArchiveMd([
      `##### 【P1】验证搜索功能\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入【搜索】页面，等待页面加载完成 | 页面展示 |\n| 2 | 输入xxx搜索 | 搜索完成 |`,
    ]);
    const path = writeTempArchive(md);
    const { code, stdout } = run(["check", "--input", path]);
    assert.equal(code, 0);
    const result = JSON.parse(stdout) as { definite_issues: { rule: string }[] };
    const fc05 = result.definite_issues.filter((i) => i.rule === "FC05");
    assert.ok(fc05.length >= 1, "should detect FC05: placeholder xxx");
  });
});

// ─── FC06: 预期结果可断言性（suspect，非 definite）───────────────────────────────

describe("format-check-script.ts check — FC06 预期结果禁止词归入 suspect", () => {
  it("puts '操作成功' into suspect_items NOT definite_issues", () => {
    const md = buildArchiveMd([
      `##### 【P0】验证保存功能\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入【设置 → 保存页】页面，等待页面加载完成 | 页面展示 |\n| 2 | 点击【保存】 | 操作成功 |`,
    ]);
    const path = writeTempArchive(md);
    const { code, stdout } = run(["check", "--input", path]);
    assert.equal(code, 0);
    const result = JSON.parse(stdout) as {
      definite_issues: { rule: string }[];
      suspect_items: { rule: string }[];
    };
    const fc06Definite = result.definite_issues.filter((i) => i.rule === "FC06");
    const fc06Suspect = result.suspect_items.filter((i) => i.rule === "FC06");
    assert.equal(fc06Definite.length, 0, "FC06 must NOT be in definite_issues");
    assert.ok(fc06Suspect.length >= 1, "操作成功 should appear in suspect_items");
  });

  it("puts '显示正确' into suspect_items", () => {
    const md = buildArchiveMd([
      `##### 【P1】验证列表展示\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入【列表 → 详情页】页面，等待页面加载完成 | 页面展示 |\n| 2 | 查看数据 | 显示正确 |`,
    ]);
    const path = writeTempArchive(md);
    const { code, stdout } = run(["check", "--input", path]);
    assert.equal(code, 0);
    const result = JSON.parse(stdout) as {
      definite_issues: { rule: string }[];
      suspect_items: { rule: string }[];
    };
    const fc06Definite = result.definite_issues.filter((i) => i.rule === "FC06");
    const fc06Suspect = result.suspect_items.filter((i) => i.rule === "FC06");
    assert.equal(fc06Definite.length, 0, "FC06 must NOT be in definite_issues");
    assert.ok(fc06Suspect.length >= 1, "显示正确 should appear in suspect_items");
  });
});

// ─── FC08: 多字段堆在一行 ─────────────────────────────────────────────────────

describe("format-check-script.ts check — FC08 多字段堆在一行", () => {
  it("detects comma-separated multi-field step as definite FC08 issue", () => {
    const md = buildArchiveMd([
      `##### 【P0】验证新增功能\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入【新增 → 表单页】页面，等待表单加载完成 | 表单展示 |\n| 2 | 填写名称、选择类型、输入描述，点击【保存】 | 保存成功 |`,
    ]);
    const path = writeTempArchive(md);
    const { code, stdout } = run(["check", "--input", path]);
    assert.equal(code, 0);
    const result = JSON.parse(stdout) as { definite_issues: { rule: string }[] };
    const fc08 = result.definite_issues.filter((i) => i.rule === "FC08");
    assert.ok(fc08.length >= 1, "should detect FC08: multi-field in one step");
  });
});

// ─── FC10: 异步操作后缺少等待 ─────────────────────────────────────────────────

describe("format-check-script.ts check — FC10 异步操作后缺少等待条件", () => {
  it("detects async action (点击【查询】) without wait condition as FC10", () => {
    const md = buildArchiveMd([
      `##### 【P1】验证查询功能\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入【查询】页面，等待页面加载完成 | 页面展示 |\n| 2 | 点击【查询】 | 查询结果列出 |`,
    ]);
    const path = writeTempArchive(md);
    const { code, stdout } = run(["check", "--input", path]);
    assert.equal(code, 0);
    const result = JSON.parse(stdout) as { definite_issues: { rule: string }[] };
    const fc10 = result.definite_issues.filter((i) => i.rule === "FC10");
    assert.ok(fc10.length >= 1, "should detect FC10: async action without wait");
  });

  it("accepts async action with wait condition (no FC10)", () => {
    const md = buildArchiveMd([
      `##### 【P1】验证查询功能\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入【查询】页面，等待页面加载完成 | 页面展示 |\n| 2 | 点击【查询】，等待查询结果加载完成 | 查询结果列出 |`,
    ]);
    const path = writeTempArchive(md);
    const { code, stdout } = run(["check", "--input", path]);
    assert.equal(code, 0);
    const result = JSON.parse(stdout) as { definite_issues: { rule: string }[] };
    const fc10 = result.definite_issues.filter((i) => i.rule === "FC10");
    assert.equal(fc10.length, 0, "async action with wait should not trigger FC10");
  });
});

// ─── 合法 Archive（无问题）────────────────────────────────────────────────────

describe("format-check-script.ts check — 合法 archive 返回空 issues", () => {
  it("returns no issues for a perfectly formatted archive", () => {
    const md = buildArchiveMd([
      `##### 【P0】验证商品列表默认加载\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入【商品 → 列表页】页面，等待列表加载完成 | 列表展示 |\n| 2 | 查看分页信息 | 分页器显示总条数和当前页 |`,
      `##### 【P1】验证搜索过滤功能\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入【商品 → 搜索页】页面，等待搜索框加载完成 | 搜索框展示 |\n| 2 | 输入商品名称"测试商品A"，点击【搜索】，等待搜索结果加载完成 | 显示匹配商品列表 |`,
    ]);
    const path = writeTempArchive(md);
    const { code, stdout } = run(["check", "--input", path]);
    assert.equal(code, 0);
    const result = JSON.parse(stdout) as {
      definite_issues: unknown[];
      suspect_items: unknown[];
      stats: { total_cases: number; definite_count: number; suspect_count: number };
    };
    assert.equal(result.definite_issues.length, 0, "no definite issues expected");
    assert.equal(result.stats.total_cases, 2);
    assert.equal(result.stats.definite_count, 0);
    assert.equal(result.stats.suspect_count, 0);
  });
});

// ─── 混合场景 ────────────────────────────────────────────────────────────────

describe("format-check-script.ts check — 混合场景", () => {
  it("correctly classifies mixed issues across multiple cases", () => {
    const md = buildArchiveMd([
      // Case 1: valid
      `##### 【P0】验证列表加载\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入【商品 → 列表页】页面，等待列表加载完成 | 列表展示 |`,
      // Case 2: FC01 (missing prefix) + FC04 suspect (相关)
      `##### 验证相关数据显示\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入【数据 → 列表页】页面，等待数据加载完成 | 相关数据展示 |`,
      // Case 3: FC05 placeholder
      `##### 【P2】验证登录功能\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入【登录】页面，等待页面加载完成 | 页面展示 |\n| 2 | 输入用户名abc，密码123456 | 登录成功 |`,
    ]);
    const path = writeTempArchive(md);
    const { code, stdout } = run(["check", "--input", path]);
    assert.equal(code, 0);

    const result = JSON.parse(stdout) as {
      definite_issues: { rule: string; case_idx: number; case_title: string; description: string }[];
      suspect_items: { rule: string; case_idx: number }[];
      stats: { total_cases: number; definite_count: number; suspect_count: number };
    };

    assert.equal(result.stats.total_cases, 3);

    // FC01 for case 2
    const fc01Issues = result.definite_issues.filter((i) => i.rule === "FC01");
    assert.ok(fc01Issues.length >= 1, "should detect FC01 in case 2");

    // FC05 for case 3
    const fc05Issues = result.definite_issues.filter((i) => i.rule === "FC05");
    assert.ok(fc05Issues.length >= 1, "should detect FC05 in case 3");

    // FC04 must be in suspect, not definite
    const fc04Definite = result.definite_issues.filter((i) => i.rule === "FC04");
    const fc04Suspect = result.suspect_items.filter((i) => i.rule === "FC04");
    assert.equal(fc04Definite.length, 0, "FC04 must NOT be definite");
    assert.ok(fc04Suspect.length >= 1, "FC04 should be suspect");

    // Stats consistency
    assert.equal(result.stats.definite_count, result.definite_issues.length);
    assert.equal(result.stats.suspect_count, result.suspect_items.length);
  });
});

// ─── CLI 错误处理 ─────────────────────────────────────────────────────────────

describe("format-check-script.ts check — CLI 错误处理", () => {
  it("exits with non-zero when --input file does not exist", () => {
    const { code, stderr } = run(["check", "--input", "/nonexistent/path/archive.md"]);
    assert.ok(code !== 0, "should exit with non-zero for missing file");
    assert.ok(stderr.length > 0 || code !== 0, "should indicate error");
  });

  it("outputs JSON with correct structure keys", () => {
    const md = buildArchiveMd([
      `##### 【P0】验证功能\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入【模块 → 页面】页面，等待页面加载完成 | 页面展示 |`,
    ]);
    const path = writeTempArchive(md);
    const { code, stdout } = run(["check", "--input", path]);
    assert.equal(code, 0);
    const result = JSON.parse(stdout) as Record<string, unknown>;
    assert.ok("definite_issues" in result, "should have definite_issues key");
    assert.ok("suspect_items" in result, "should have suspect_items key");
    assert.ok("stats" in result, "should have stats key");

    const stats = result.stats as Record<string, unknown>;
    assert.ok("total_cases" in stats);
    assert.ok("definite_count" in stats);
    assert.ok("suspect_count" in stats);
  });
});
