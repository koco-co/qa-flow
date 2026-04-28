import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, it, expect } from "bun:test";

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
        cwd: resolve(import.meta.dirname, "../.."),
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

beforeEach(() => {
  mkdirSync(WORKSPACE_DIR, { recursive: true });
});
afterEach(() => {
  try { rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("knowledge-keeper CLI skeleton", () => {
  it("prints help when no args", () => {
    const { stdout, code } = runKk(["--help"]);
    expect(code).toBe(0);
    expect(stdout.includes("knowledge-keeper").toBeTruthy());
    expect(stdout.includes("read-core").toBeTruthy());
  });

  it("errors when --project missing", () => {
    const { code, stderr } = runKk(["read-core"]);
    expect(code).not.toBe(0);
    expect(stderr.includes("--project").toBeTruthy() || stderr.includes("required"));
  });
});

describe("read-core", () => {
  beforeEach(resetFixture);

  it("returns shape: project / overview / terms / index", () => {
    const { stdout, code } = runKk(["read-core", "--project", PROJECT]);
    expect(code).toBe(0);
    const obj = JSON.parse(stdout);
    expect(obj.project).toBe(PROJECT);
    expect(obj.overview).toBeTruthy();
    expect(typeof obj.overview.title).toBe("string");
    expect(obj.overview.content.includes("产品定位").toBeTruthy());
    expect(Array.isArray(obj.terms).toBeTruthy());
    expect(obj.index).toBeTruthy();
    expect(Array.isArray(obj.index.modules).toBeTruthy());
    expect(Array.isArray(obj.index.pitfalls).toBeTruthy());
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
    expect(obj.terms.length).toBe(2);
    expect(obj.terms[0].term).toBe("QI");
    expect(obj.terms[0].zh).toBe("质量项");
    expect(obj.terms[1].alias).toBe("data-source");
  });
});

describe("read-module", () => {
  beforeEach(resetFixture);

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
    expect(code).toBe(0);
    const obj = JSON.parse(stdout);
    expect(obj.module).toBe("data-source");
    expect(obj.frontmatter.title).toBe("数据源接入");
    expect(obj.frontmatter.tags).toEqual(["ds", "auth"]);
    expect(obj.content.includes("模块正文").toBeTruthy());
  });

  it("exits 1 when module not found", () => {
    const { code, stderr } = runKk(["read-module", "--project", PROJECT, "--module", "nope"]);
    expect(code).not.toBe(0);
    expect(stderr.includes("Module not found").toBeTruthy());
  });
});

describe("read-pitfall", () => {
  beforeEach(() => {
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
    expect(code).toBe(0);
    const obj = JSON.parse(stdout);
    expect(obj.matches.length).toBe(1);
    expect(obj.matches[0].name).toBe("ui-dom-drift");
    expect(obj.matches[0].match_by.includes("filename").toBeTruthy());
  });

  it("matches tag substring", () => {
    const { stdout } = runKk(["read-pitfall", "--project", PROJECT, "--query", "auth"]);
    const obj = JSON.parse(stdout);
    expect(obj.matches.length).toBe(1);
    expect(obj.matches[0].name).toBe("auth-expire");
    expect(obj.matches[0].match_by.includes("tags").toBeTruthy());
  });

  it("returns empty matches with exit 0", () => {
    const { stdout, code } = runKk(["read-pitfall", "--project", PROJECT, "--query", "xyzzy"]);
    expect(code).toBe(0);
    const obj = JSON.parse(stdout);
    expect(obj.matches).toEqual([]);
  });
});

describe("index", () => {
  beforeEach(() => {
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
    expect(code).toBe(0);
    const obj = JSON.parse(stdout);
    expect(obj.project).toBe(PROJECT);
    expect(obj.modules_count).toBe(1);
    expect(obj.pitfalls_count).toBe(0);

    const idxContent = readFileSync(join(PROJECT_KNOWLEDGE, "_index.md"), "utf8");
    expect(idxContent.includes("## Core").toBeTruthy());
    expect(idxContent.includes("[ds.md](modules/ds.md).toBeTruthy()"));
    expect(idxContent.includes("<!-- last-indexed: ").toBeTruthy());
  });

  it("fixes missing frontmatter and reports in fixed_frontmatter", () => {
    writeFileSync(
      join(PROJECT_KNOWLEDGE, "modules", "legacy.md"),
      "# 遗留模块\n\n正文\n",
    );
    const { stdout } = runKk(["index", "--project", PROJECT]);
    const obj = JSON.parse(stdout);
    expect(obj.fixed_frontmatter.includes("modules/legacy.md").toBeTruthy());
    const fixed = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "legacy.md"), "utf8");
    expect(fixed.startsWith("---\n").toBeTruthy());
    expect(fixed.includes("type: module").toBeTruthy());
  });
});

describe("write --type term", () => {
  beforeEach(resetFixture);

  it("dry-run does not persist", () => {
    const { stdout, code } = runKk([
      "write", "--project", PROJECT,
      "--type", "term",
      "--content", JSON.stringify({ term: "XYZ", zh: "测试术语", desc: "", alias: "" }),
      "--confidence", "high",
      "--dry-run",
    ]);
    expect(code).toBe(0);
    const obj = JSON.parse(stdout);
    expect(obj.dry_run).toBe(true);
    const terms = readFileSync(join(PROJECT_KNOWLEDGE, "terms.md"), "utf8");
    expect(!terms.includes("XYZ").toBeTruthy(), "terms.md should not contain XYZ after dry-run");
  });

  it("high confidence real write persists term row", () => {
    const { stdout, code } = runKk([
      "write", "--project", PROJECT,
      "--type", "term",
      "--content", JSON.stringify({ term: "XYZ", zh: "术语 X", desc: "说明", alias: "x" }),
      "--confidence", "high",
    ]);
    expect(code).toBe(0);
    const obj = JSON.parse(stdout);
    expect(obj.file.endsWith("terms.md").toBeTruthy());
    const terms = readFileSync(join(PROJECT_KNOWLEDGE, "terms.md"), "utf8");
    expect(terms.includes("| XYZ | 术语 X | 说明 | x |").toBeTruthy());
  });

  it("medium without --confirmed fails", () => {
    const { code, stderr } = runKk([
      "write", "--project", PROJECT,
      "--type", "term",
      "--content", JSON.stringify({ term: "M", zh: "m", desc: "", alias: "" }),
      "--confidence", "medium",
    ]);
    expect(code).not.toBe(0);
    expect(stderr.includes("--confirmed").toBeTruthy());
  });

  it("low always fails", () => {
    const { code, stderr } = runKk([
      "write", "--project", PROJECT,
      "--type", "term",
      "--content", JSON.stringify({ term: "L", zh: "l", desc: "", alias: "" }),
      "--confidence", "low",
      "--confirmed",
    ]);
    expect(code).not.toBe(0);
    expect(stderr.includes("Low").toBeTruthy());
  });
});

describe("write --type overview", () => {
  beforeEach(resetFixture);

  it("replaces a section body", () => {
    const { code } = runKk([
      "write", "--project", PROJECT,
      "--type", "overview",
      "--content", JSON.stringify({ section: "产品定位", body: "企业级数据资产平台", mode: "replace" }),
      "--confidence", "high",
      "--force",
    ]);
    expect(code).toBe(0);
    const ov = readFileSync(join(PROJECT_KNOWLEDGE, "overview.md"), "utf8");
    expect(ov.includes("企业级数据资产平台").toBeTruthy());
    expect(!ov.includes("占位。\n").toBeTruthy());
  });

  it("appends to a section body", () => {
    const { code } = runKk([
      "write", "--project", PROJECT,
      "--type", "overview",
      "--content", JSON.stringify({ section: "主流程", body: "\n新增一条流程说明", mode: "append" }),
      "--confidence", "high",
    ]);
    expect(code).toBe(0);
    const ov = readFileSync(join(PROJECT_KNOWLEDGE, "overview.md"), "utf8");
    expect(ov.includes("新增一条流程说明").toBeTruthy());
  });
});

describe("write --type module", () => {
  beforeEach(resetFixture);

  it("creates a new module file with frontmatter", () => {
    const { stdout, code } = runKk([
      "write", "--project", PROJECT,
      "--type", "module",
      "--content", JSON.stringify({ name: "data-source", title: "数据源", tags: ["ds"], body: "正文", source: "" }),
      "--confidence", "high",
    ]);
    expect(code).toBe(0);
    const obj = JSON.parse(stdout);
    expect(obj.file.endsWith("modules/data-source.md").toBeTruthy());
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "data-source.md"), "utf8");
    expect(content.startsWith("---\n").toBeTruthy());
    expect(content.includes("title: 数据源").toBeTruthy());
    expect(content.includes("正文").toBeTruthy());
  });

  it("refuses to overwrite existing file without --overwrite", () => {
    const { code, stderr } = runKk([
      "write", "--project", PROJECT,
      "--type", "module",
      "--content", JSON.stringify({ name: "data-source", title: "覆盖尝试", tags: [], body: "new", source: "" }),
      "--confidence", "high",
    ]);
    expect(code).not.toBe(0);
    expect(stderr.includes("File exists").toBeTruthy());
  });

  it("allows overwrite with --overwrite", () => {
    const { code } = runKk([
      "write", "--project", PROJECT,
      "--type", "module",
      "--content", JSON.stringify({ name: "data-source", title: "已覆盖", tags: ["new"], body: "new body", source: "" }),
      "--confidence", "high",
      "--overwrite",
    ]);
    expect(code).toBe(0);
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "data-source.md"), "utf8");
    expect(content.includes("title: 已覆盖").toBeTruthy());
  });
});

describe("write --type pitfall", () => {
  beforeEach(resetFixture);

  it("creates a pitfall file", () => {
    const { code } = runKk([
      "write", "--project", PROJECT,
      "--type", "pitfall",
      "--content", JSON.stringify({ name: "dom-drift", title: "DOM 漂移", tags: ["ui"], body: "详情", source: "" }),
      "--confidence", "high",
    ]);
    expect(code).toBe(0);
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "pitfalls", "dom-drift.md"), "utf8");
    expect(content.includes("type: pitfall").toBeTruthy());
  });
});

describe("update action", () => {
  beforeEach(() => {
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
    expect(code).toBe(0);
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "m1.md"), "utf8");
    expect(content.includes("title: 新标题").toBeTruthy());
    expect(content.includes("tags: [a, b]").toBeTruthy());
    // unchanged fields stay
    expect(content.includes("source: old").toBeTruthy());
    // body unchanged
    expect(content.includes("原 body").toBeTruthy());
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
    expect(code).toBe(0);
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "m1.md"), "utf8");
    expect(content.includes("更新后的正文").toBeTruthy());
    expect(!content.includes("原 body").toBeTruthy());
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
    expect(code).toBe(0);
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "m1.md"), "utf8");
    // 原内容必须保留
    expect(content.includes("## 已有章节").toBeTruthy());
    expect(content.includes("已有内容").toBeTruthy());
    // 新 section 被追加
    expect(content.includes("## 新章节").toBeTruthy());
    expect(content.includes("新增的正文段落").toBeTruthy());
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
    expect(code).toBe(0);
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "m1.md"), "utf8");
    expect(content.includes("A 新内容").toBeTruthy());
    expect(!content.includes("A 旧内容").toBeTruthy());
    // 其他 section 不变
    expect(content.includes("## 章节B").toBeTruthy());
    expect(content.includes("B 旧内容").toBeTruthy());
  });

  it("dry-run does not persist", () => {
    const { stdout } = runKk([
      "update", "--project", PROJECT,
      "--path", "modules/m1.md",
      "--content", JSON.stringify({ frontmatter_patch: { title: "XXX" }, mode: "patch" }),
      "--confirmed", "--dry-run",
    ]);
    const obj = JSON.parse(stdout);
    expect(obj.dry_run).toBe(true);
    const content = readFileSync(join(PROJECT_KNOWLEDGE, "modules", "m1.md"), "utf8");
    expect(!content.includes("title: XXX").toBeTruthy());
  });

  it("exits 1 on missing file", () => {
    const { code, stderr } = runKk([
      "update", "--project", PROJECT,
      "--path", "modules/nonexistent.md",
      "--content", JSON.stringify({ frontmatter_patch: {}, mode: "patch" }),
      "--confirmed",
    ]);
    expect(code).not.toBe(0);
    expect(stderr.includes("not found").toBeTruthy() || stderr.includes("does not exist"));
  });
});

describe("write/update auto-triggers index", () => {
  beforeEach(resetFixture);

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
    expect(idx.includes("auto-idx.md").toBeTruthy());
    expect(idx.includes("<!-- last-indexed: ").toBeTruthy());
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
    expect(beforeTs).not.toBe(afterTs);
  });
});

describe("lint action", () => {
  beforeEach(() => {
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
    expect(code).toBe(1);
    const obj = JSON.parse(stdout);
    expect(obj.errors.length >= 2, `expected >= 2 errors. got: ${JSON.stringify(obj.errors).toBeTruthy()}`);
    const rules = obj.errors.map((e: { rule: string }) => e.rule);
    expect(rules.includes("non-kebab-case-name").toBeTruthy());
    expect(rules.includes("type-dir-mismatch").toBeTruthy());
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
    expect(code).toBe(2);
    const obj = JSON.parse(stdout);
    expect(obj.errors.length).toBe(0);
    expect(obj.warnings.length >= 1).toBeTruthy();
  });

  it("exit 0 when clean", () => {
    // Remove all artifacts + rebuild index
    rmSync(join(PROJECT_KNOWLEDGE, "modules", "notag.md"), { force: true });
    runKk(["index", "--project", PROJECT]);
    const { stdout, code } = runKk(["lint", "--project", PROJECT]);
    expect(code).toBe(0);
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
    expect(code).toBe(1);
  });
});
