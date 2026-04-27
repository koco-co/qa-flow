import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

const TMP = join(tmpdir(), `kata-kk-test-${process.pid}`);
const WORKSPACE_DIR = join(TMP, "workspace");
const PROJECT = "kk-fixture";
const PROJECT_KNOWLEDGE = join(WORKSPACE_DIR, PROJECT, "knowledge");

function runKk(
  args: string[],
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "kata-cli",
      ["knowledge-keeper", ...args],
      {
        cwd: resolve(import.meta.dirname, "../../.."),
        encoding: "utf8",
        env: { ...process.env, WORKSPACE_DIR },
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

function resetFixture(): void {
  rmSync(join(WORKSPACE_DIR, PROJECT), { recursive: true, force: true });
  mkdirSync(join(PROJECT_KNOWLEDGE, "modules"), { recursive: true });
  mkdirSync(join(PROJECT_KNOWLEDGE, "pitfalls"), { recursive: true });
  writeFileSync(
    join(PROJECT_KNOWLEDGE, "overview.md"),
    `---
title: kk 业务概览
type: overview
tags: []
confidence: high
source: ""
updated: 2026-04-17
---

# kk 业务概览

## 产品定位

占位。

## 主流程

1. 占位
`,
  );
  writeFileSync(
    join(PROJECT_KNOWLEDGE, "terms.md"),
    `---
title: kk 术语表
type: term
tags: []
confidence: high
source: ""
updated: 2026-04-17
---

# kk 术语表

| 术语 | 中文 | 解释 | 别名 |
|---|---|---|---|
`,
  );
}

before(() => {
  mkdirSync(WORKSPACE_DIR, { recursive: true });
});
after(() => {
  try { rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("knowledge-keeper CLI skeleton", () => {
  it("prints help when no args", () => {
    const { stdout, code } = runKk(["--help"]);
    assert.equal(code, 0);
    assert.ok(stdout.includes("knowledge-keeper"));
    assert.ok(stdout.includes("read-core"));
  });

  it("errors when --project missing", () => {
    const { code, stderr } = runKk(["read-core"]);
    assert.notEqual(code, 0);
    assert.ok(stderr.includes("--project") || stderr.includes("required"));
  });
});

describe("read-core", () => {
  before(resetFixture);

  it("returns shape: project / overview / terms / index", () => {
    const { stdout, code } = runKk(["read-core", "--project", PROJECT]);
    assert.equal(code, 0, `stderr? stdout=${stdout}`);
    const obj = JSON.parse(stdout);
    assert.equal(obj.project, PROJECT);
    assert.ok(obj.overview);
    assert.equal(typeof obj.overview.title, "string");
    assert.ok(obj.overview.content.includes("产品定位"));
    assert.ok(Array.isArray(obj.terms));
    assert.ok(obj.index);
    assert.ok(Array.isArray(obj.index.modules));
    assert.ok(Array.isArray(obj.index.pitfalls));
  });

  it("parses terms table with rows", () => {
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "terms.md"),
      `---
title: terms
type: term
tags: []
confidence: high
source: ""
updated: 2026-04-17
---

| 术语 | 中文 | 解释 | 别名 |
|---|---|---|---|
| QI | 质量项 | 数据质量实体 | quality-item |
| DS | 数据源 | 数据接入 | data-source |
`,
    );
    const { stdout } = runKk(["read-core", "--project", PROJECT]);
    const obj = JSON.parse(stdout);
    assert.equal(obj.terms.length, 2);
    assert.equal(obj.terms[0].term, "QI");
    assert.equal(obj.terms[0].zh, "质量项");
    assert.equal(obj.terms[1].alias, "data-source");
  });
});

describe("read-module", () => {
  before(resetFixture);

  it("returns frontmatter + content for existing module", () => {
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "modules", "data-source.md"),
      `---
title: 数据源接入
type: module
tags: [ds, auth]
confidence: high
source: src.ts
updated: 2026-04-17
---

# 数据源接入

模块正文。
`,
    );
    const { stdout, code } = runKk(["read-module", "--project", PROJECT, "--module", "data-source"]);
    assert.equal(code, 0);
    const obj = JSON.parse(stdout);
    assert.equal(obj.module, "data-source");
    assert.equal(obj.frontmatter.title, "数据源接入");
    assert.deepEqual(obj.frontmatter.tags, ["ds", "auth"]);
    assert.ok(obj.content.includes("模块正文"));
  });

  it("exits 1 when module not found", () => {
    const { code, stderr } = runKk(["read-module", "--project", PROJECT, "--module", "nope"]);
    assert.notEqual(code, 0);
    assert.ok(stderr.includes("Module not found"));
  });
});

describe("read-pitfall", () => {
  before(() => {
    resetFixture();
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "pitfalls", "ui-dom-drift.md"),
      `---
title: UI DOM 漂移
type: pitfall
tags: [ui, playwright]
confidence: high
source: x.ts:1
updated: 2026-04-17
---
body`,
    );
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "pitfalls", "auth-expire.md"),
      `---
title: 认证过期
type: pitfall
tags: [auth]
confidence: medium
source: ""
updated: 2026-04-17
---
body`,
    );
  });

  it("matches filename substring", () => {
    const { stdout, code } = runKk(["read-pitfall", "--project", PROJECT, "--query", "dom"]);
    assert.equal(code, 0);
    const obj = JSON.parse(stdout);
    assert.equal(obj.matches.length, 1);
    assert.equal(obj.matches[0].name, "ui-dom-drift");
    assert.ok(obj.matches[0].match_by.includes("filename"));
  });

  it("matches tag substring", () => {
    const { stdout } = runKk(["read-pitfall", "--project", PROJECT, "--query", "auth"]);
    const obj = JSON.parse(stdout);
    assert.equal(obj.matches.length, 1);
    assert.equal(obj.matches[0].name, "auth-expire");
    assert.ok(obj.matches[0].match_by.includes("tags"));
  });

  it("returns empty matches with exit 0", () => {
    const { stdout, code } = runKk(["read-pitfall", "--project", PROJECT, "--query", "xyzzy"]);
    assert.equal(code, 0);
    const obj = JSON.parse(stdout);
    assert.deepEqual(obj.matches, []);
  });
});

describe("index", () => {
  before(() => {
    resetFixture();
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "modules", "ds.md"),
      `---
title: 数据源
type: module
tags: [ds]
confidence: high
source: ""
updated: 2026-04-17
---
body`,
    );
  });

  it("writes a _index.md with correct structure", () => {
    const { stdout, code } = runKk(["index", "--project", PROJECT]);
    assert.equal(code, 0);
    const obj = JSON.parse(stdout);
    assert.equal(obj.project, PROJECT);
    assert.equal(obj.modules_count, 1);
    assert.equal(obj.pitfalls_count, 0);

    const idxContent = readFileSync(join(PROJECT_KNOWLEDGE, "_index.md"), "utf8");
    assert.ok(idxContent.includes("## Core"));
    assert.ok(idxContent.includes("[ds.md](modules/ds.md)"));
    assert.ok(idxContent.includes("<!-- last-indexed: "));
  });

  it("fixes missing frontmatter and reports in fixed_frontmatter", () => {
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "modules", "legacy.md"),
      "# 遗留模块\n\n正文\n",
    );
    const { stdout } = runKk(["index", "--project", PROJECT]);
    const obj = JSON.parse(stdout);
    assert.ok(obj.fixed_frontmatter.includes("modules/legacy.md"));
    const fixed = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "legacy.md"), "utf8");
    assert.ok(fixed.startsWith("---\n"));
    assert.ok(fixed.includes("type: module"));
  });
});

describe("write --type term", () => {
  before(resetFixture);

  it("dry-run does not persist", () => {
    const { stdout, code } = runKk([
      "write", "--project", PROJECT,
      "--type", "term",
      "--content", JSON.stringify({ term: "XYZ", zh: "测试术语", desc: "", alias: "" }),
      "--confidence", "high",
      "--dry-run",
    ]);
    assert.equal(code, 0);
    const obj = JSON.parse(stdout);
    assert.equal(obj.dry_run, true);
    const terms = readFileSync(join(PROJECT_KNOWLEDGE, "terms.md"), "utf8");
    assert.ok(!terms.includes("XYZ"), "terms.md should not contain XYZ after dry-run");
  });

  it("high confidence real write persists term row", () => {
    const { stdout, code } = runKk([
      "write", "--project", PROJECT,
      "--type", "term",
      "--content", JSON.stringify({ term: "XYZ", zh: "术语 X", desc: "说明", alias: "x" }),
      "--confidence", "high",
    ]);
    assert.equal(code, 0);
    const obj = JSON.parse(stdout);
    assert.ok(obj.file.endsWith("terms.md"));
    const terms = readFileSync(join(PROJECT_KNOWLEDGE, "terms.md"), "utf8");
    assert.ok(terms.includes("| XYZ | 术语 X | 说明 | x |"));
  });

  it("medium without --confirmed fails", () => {
    const { code, stderr } = runKk([
      "write", "--project", PROJECT,
      "--type", "term",
      "--content", JSON.stringify({ term: "M", zh: "m", desc: "", alias: "" }),
      "--confidence", "medium",
    ]);
    assert.notEqual(code, 0);
    assert.ok(stderr.includes("--confirmed"));
  });

  it("low always fails", () => {
    const { code, stderr } = runKk([
      "write", "--project", PROJECT,
      "--type", "term",
      "--content", JSON.stringify({ term: "L", zh: "l", desc: "", alias: "" }),
      "--confidence", "low",
      "--confirmed",
    ]);
    assert.notEqual(code, 0);
    assert.ok(stderr.includes("Low"));
  });
});

describe("write --type overview", () => {
  before(resetFixture);

  it("replaces a section body", () => {
    const { code } = runKk([
      "write", "--project", PROJECT,
      "--type", "overview",
      "--content", JSON.stringify({ section: "产品定位", body: "企业级数据资产平台", mode: "replace" }),
      "--confidence", "high",
      "--force",
    ]);
    assert.equal(code, 0);
    const ov = readFileSync(join(PROJECT_KNOWLEDGE, "overview.md"), "utf8");
    assert.ok(ov.includes("企业级数据资产平台"));
    assert.ok(!ov.includes("占位。\n"));
  });

  it("appends to a section body", () => {
    const { code } = runKk([
      "write", "--project", PROJECT,
      "--type", "overview",
      "--content", JSON.stringify({ section: "主流程", body: "\n新增一条流程说明", mode: "append" }),
      "--confidence", "high",
    ]);
    assert.equal(code, 0);
    const ov = readFileSync(join(PROJECT_KNOWLEDGE, "overview.md"), "utf8");
    assert.ok(ov.includes("新增一条流程说明"));
  });
});

describe("write --type module", () => {
  before(resetFixture);

  it("creates a new module file with frontmatter", () => {
    const { stdout, code } = runKk([
      "write", "--project", PROJECT,
      "--type", "module",
      "--content", JSON.stringify({ name: "data-source", title: "数据源", tags: ["ds"], body: "正文", source: "" }),
      "--confidence", "high",
    ]);
    assert.equal(code, 0);
    const obj = JSON.parse(stdout);
    assert.ok(obj.file.endsWith("modules/data-source.md"));
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "data-source.md"), "utf8");
    assert.ok(content.startsWith("---\n"));
    assert.ok(content.includes("title: 数据源"));
    assert.ok(content.includes("正文"));
  });

  it("refuses to overwrite existing file without --overwrite", () => {
    const { code, stderr } = runKk([
      "write", "--project", PROJECT,
      "--type", "module",
      "--content", JSON.stringify({ name: "data-source", title: "覆盖尝试", tags: [], body: "new", source: "" }),
      "--confidence", "high",
    ]);
    assert.notEqual(code, 0);
    assert.ok(stderr.includes("File exists"));
  });

  it("allows overwrite with --overwrite", () => {
    const { code } = runKk([
      "write", "--project", PROJECT,
      "--type", "module",
      "--content", JSON.stringify({ name: "data-source", title: "已覆盖", tags: ["new"], body: "new body", source: "" }),
      "--confidence", "high",
      "--overwrite",
    ]);
    assert.equal(code, 0);
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "data-source.md"), "utf8");
    assert.ok(content.includes("title: 已覆盖"));
  });
});

describe("write --type pitfall", () => {
  before(resetFixture);

  it("creates a pitfall file", () => {
    const { code } = runKk([
      "write", "--project", PROJECT,
      "--type", "pitfall",
      "--content", JSON.stringify({ name: "dom-drift", title: "DOM 漂移", tags: ["ui"], body: "详情", source: "" }),
      "--confidence", "high",
    ]);
    assert.equal(code, 0);
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "pitfalls", "dom-drift.md"), "utf8");
    assert.ok(content.includes("type: pitfall"));
  });
});

describe("update action", () => {
  before(() => {
    resetFixture();
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "modules", "m1.md"),
      `---
title: 原标题
type: module
tags: [a]
confidence: medium
source: "old"
updated: 2026-04-15
---

原 body
`,
    );
  });

  it("patches frontmatter fields", () => {
    const { code } = runKk([
      "update", "--project", PROJECT,
      "--path", "modules/m1.md",
      "--content", JSON.stringify({
        frontmatter_patch: { title: "新标题", tags: ["a", "b"] },
        mode: "patch",
      }),
      "--confirmed",
      "--force",
    ]);
    assert.equal(code, 0);
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "m1.md"), "utf8");
    assert.ok(content.includes("title: 新标题"));
    assert.ok(content.includes("tags: [a, b]"));
    // unchanged fields stay
    assert.ok(content.includes("source: old"));
    // body unchanged
    assert.ok(content.includes("原 body"));
  });

  it("patches body for module type replaces new_body fully", () => {
    const { code } = runKk([
      "update", "--project", PROJECT,
      "--path", "modules/m1.md",
      "--content", JSON.stringify({
        body_patch: { new_body: "更新后的正文\n" },
        mode: "patch",
      }),
      "--confirmed",
    ]);
    assert.equal(code, 0);
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "m1.md"), "utf8");
    assert.ok(content.includes("更新后的正文"));
    assert.ok(!content.includes("原 body"));
  });

  it("module body_patch with section appends when section missing (preserves body)", () => {
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "modules", "m1.md"),
      `---
title: 原标题
type: module
tags: [a]
confidence: medium
source: "old"
updated: 2026-04-15
---

# m1

## 已有章节

已有内容
`,
    );
    const { code } = runKk([
      "update", "--project", PROJECT,
      "--path", "modules/m1.md",
      "--content", JSON.stringify({
        body_patch: { section: "新章节", new_body: "新增的正文段落" },
        mode: "patch",
      }),
      "--confirmed",
    ]);
    assert.equal(code, 0);
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "m1.md"), "utf8");
    // 原内容必须保留
    assert.ok(content.includes("## 已有章节"));
    assert.ok(content.includes("已有内容"));
    // 新 section 被追加
    assert.ok(content.includes("## 新章节"));
    assert.ok(content.includes("新增的正文段落"));
  });

  it("module body_patch with existing section replaces only that section", () => {
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "modules", "m1.md"),
      `---
title: 原标题
type: module
tags: [a]
confidence: medium
source: "old"
updated: 2026-04-15
---

# m1

## 章节A

A 旧内容

## 章节B

B 旧内容
`,
    );
    const { code } = runKk([
      "update", "--project", PROJECT,
      "--path", "modules/m1.md",
      "--content", JSON.stringify({
        body_patch: { section: "章节A", new_body: "A 新内容" },
        mode: "patch",
      }),
      "--confirmed",
    ]);
    assert.equal(code, 0);
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "m1.md"), "utf8");
    assert.ok(content.includes("A 新内容"));
    assert.ok(!content.includes("A 旧内容"));
    // 其他 section 不变
    assert.ok(content.includes("## 章节B"));
    assert.ok(content.includes("B 旧内容"));
  });

  it("dry-run does not persist", () => {
    const { stdout } = runKk([
      "update", "--project", PROJECT,
      "--path", "modules/m1.md",
      "--content", JSON.stringify({ frontmatter_patch: { title: "XXX" }, mode: "patch" }),
      "--confirmed", "--dry-run",
    ]);
    const obj = JSON.parse(stdout);
    assert.equal(obj.dry_run, true);
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "m1.md"), "utf8");
    assert.ok(!content.includes("title: XXX"));
  });

  it("exits 1 on missing file", () => {
    const { code, stderr } = runKk([
      "update", "--project", PROJECT,
      "--path", "modules/nonexistent.md",
      "--content", JSON.stringify({ frontmatter_patch: {}, mode: "patch" }),
      "--confirmed",
    ]);
    assert.notEqual(code, 0);
    assert.ok(stderr.includes("not found") || stderr.includes("does not exist"));
  });
});

describe("write/update auto-triggers index", () => {
  before(resetFixture);

  it("after write module, _index.md is regenerated", () => {
    // Remove existing _index.md so we can verify re-creation
    const idxPath = join(PROJECT_KNOWLEDGE, "_index.md");
    if (existsSync(idxPath)) rmSync(idxPath);

    runKk([
      "write", "--project", PROJECT,
      "--type", "module",
      "--content", JSON.stringify({ name: "auto-idx", title: "自动索引测试", tags: ["t"], body: "x", source: "" }),
      "--confidence", "high",
    ]);

    const idx = readFileSync(idxPath, "utf8");
    assert.ok(idx.includes("auto-idx.md"));
    assert.ok(idx.includes("<!-- last-indexed: "));
  });

  it("after update module, _index.md last-indexed timestamp advances", () => {
    const idxPath = join(PROJECT_KNOWLEDGE, "_index.md");
    const before = readFileSync(idxPath, "utf8");
    const beforeTs = before.match(/last-indexed: (\S+)/)?.[1];

    // Sleep 1ms to ensure timestamp changes
    const t = Date.now();
    while (Date.now() - t < 10) { /* busy wait 10ms */ }

    runKk([
      "update", "--project", PROJECT,
      "--path", "modules/auto-idx.md",
      "--content", JSON.stringify({ frontmatter_patch: { title: "变更标题" }, mode: "patch" }),
      "--confirmed",
    ]);

    const after = readFileSync(idxPath, "utf8");
    const afterTs = after.match(/last-indexed: (\S+)/)?.[1];
    assert.notEqual(beforeTs, afterTs, "last-indexed should change");
  });
});

describe("lint action", () => {
  before(() => {
    resetFixture();
    // Create a module with all errors
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "modules", "Bad_Name.md"),
      `---
type: pitfall
tags: []
confidence: high
source: ""
updated: 2026-04-17
---
body`,
    );
    // Ensure _index.md exists (otherwise orphan warning would fire always)
    runKk(["index", "--project", PROJECT]);
  });

  it("reports errors and exits 1 for violations", () => {
    const { stdout, code } = runKk(["lint", "--project", PROJECT]);
    assert.equal(code, 1, `expected exit 1, got ${code}. stdout=${stdout}`);
    const obj = JSON.parse(stdout);
    assert.ok(obj.errors.length >= 2, `expected >= 2 errors. got: ${JSON.stringify(obj.errors)}`);
    const rules = obj.errors.map((e: { rule: string }) => e.rule);
    assert.ok(rules.includes("non-kebab-case-name"));
    assert.ok(rules.includes("type-dir-mismatch"));
  });

  it("returns exit 2 when only warnings", () => {
    // Clean errors; introduce orphan/empty-tags warning only
    rmSync(join(PROJECT_KNOWLEDGE, "modules", "Bad_Name.md"));
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "modules", "notag.md"),
      `---
title: notag
type: module
tags: []
confidence: high
source: "x"
updated: 2026-04-17
---
body`,
    );
    // Do NOT run index so orphan warning fires
    rmSync(join(PROJECT_KNOWLEDGE, "_index.md"), { force: true });

    const { stdout, code } = runKk(["lint", "--project", PROJECT]);
    assert.equal(code, 2, `expected exit 2 (warnings). got ${code}. stdout=${stdout}`);
    const obj = JSON.parse(stdout);
    assert.equal(obj.errors.length, 0);
    assert.ok(obj.warnings.length >= 1);
  });

  it("exit 0 when clean", () => {
    // Remove all artifacts + rebuild index
    rmSync(join(PROJECT_KNOWLEDGE, "modules", "notag.md"), { force: true });
    runKk(["index", "--project", PROJECT]);
    const { stdout, code } = runKk(["lint", "--project", PROJECT]);
    assert.equal(code, 0, `expected exit 0. stdout=${stdout}`);
  });

  it("--strict upgrades warnings to errors", () => {
    // Reintroduce warning-only file
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "modules", "warn-only.md"),
      `---
title: warn
type: module
tags: []
confidence: high
source: "x"
updated: 2026-04-17
---
body`,
    );
    rmSync(join(PROJECT_KNOWLEDGE, "_index.md"), { force: true });
    const { code } = runKk(["lint", "--project", PROJECT, "--strict"]);
    assert.equal(code, 1);
  });
});
