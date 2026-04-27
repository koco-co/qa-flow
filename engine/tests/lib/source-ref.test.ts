import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseSourceRef, resolveSourceRef } from "../../lib/source-ref.ts";

describe("parseSourceRef", () => {
  it("parses prd scheme with section number", () => {
    assert.deepEqual(parseSourceRef("prd#section-2.1.3"), {
      scheme: "prd",
      anchor: "section-2.1.3",
    });
  });

  it("parses knowledge scheme with dotted anchor", () => {
    assert.deepEqual(parseSourceRef("knowledge#term.审批.中文解释"), {
      scheme: "knowledge",
      anchor: "term.审批.中文解释",
    });
  });

  it("parses repo scheme with line range", () => {
    assert.deepEqual(
      parseSourceRef("repo#studio/src/approval/list.tsx:L45-L60"),
      { scheme: "repo", anchor: "studio/src/approval/list.tsx:L45-L60" },
    );
  });

  it("returns null for unknown scheme", () => {
    assert.equal(parseSourceRef("foo#bar"), null);
  });

  it("returns null for missing separator", () => {
    assert.equal(parseSourceRef("prdq3"), null);
  });

  it("returns null for empty anchor", () => {
    assert.equal(parseSourceRef("prd#"), null);
  });

  it("rejects deprecated plan scheme", () => {
    assert.equal(parseSourceRef("plan#q3-数据源"), null);
  });

  it("parses enhanced scheme with section anchor", () => {
    assert.deepEqual(parseSourceRef("enhanced#s-2-1-a1b2"), {
      scheme: "enhanced",
      anchor: "s-2-1-a1b2",
    });
  });

  it("parses enhanced scheme with q-anchor", () => {
    assert.deepEqual(parseSourceRef("enhanced#q7"), {
      scheme: "enhanced",
      anchor: "q7",
    });
  });
});

describe("resolveSourceRef — prd / knowledge / repo schemes", () => {
  const tmp = mkdtempSync(join(tmpdir(), "kata-sr2-"));
  const prdPath = join(tmp, "req.md");
  writeFileSync(prdPath, "# 标题\n\n## 2.1.3 审批状态字段定义\n\n正文\n");

  const wsDir = join(tmp, "ws");
  const projName = "proj-c";
  mkdirSync(join(wsDir, projName, "knowledge"), { recursive: true });
  writeFileSync(join(wsDir, projName, "knowledge", "overview.md"), "# overview");
  mkdirSync(join(wsDir, projName, "knowledge", "term"), { recursive: true });

  const repoDir = join(tmp, "repo-studio");
  mkdirSync(join(repoDir, "src", "approval"), { recursive: true });
  writeFileSync(join(repoDir, "src", "approval", "list.tsx"), "// ok\n");

  it("prd heading slug matches section-2.1.3", () => {
    const r = resolveSourceRef("prd#2.1.3", { prdPath });
    assert.equal(r.ok, true);
  });

  it("prd heading by chinese slug", () => {
    const r = resolveSourceRef("prd#审批状态字段定义", { prdPath });
    assert.equal(r.ok, true);
  });

  it("prd miss → fail", () => {
    const r = resolveSourceRef("prd#不存在的小节", { prdPath });
    assert.equal(r.ok, false);
  });

  it("knowledge overview 入口存在", () => {
    const r = resolveSourceRef("knowledge#overview.数据源默认", {
      workspaceDir: wsDir,
      projectName: projName,
    });
    assert.equal(r.ok, true);
  });

  it("knowledge term 目录存在", () => {
    const r = resolveSourceRef("knowledge#term.审批.中文解释", {
      workspaceDir: wsDir,
      projectName: projName,
    });
    assert.equal(r.ok, true);
  });

  it("knowledge unknown type → fail", () => {
    const r = resolveSourceRef("knowledge#unknown.xxx", {
      workspaceDir: wsDir,
      projectName: projName,
    });
    assert.equal(r.ok, false);
    assert.match(r.reason ?? "", /type 非法/);
  });

  it("repo 文件存在（via ctx.repos）", () => {
    const r = resolveSourceRef("repo#studio/src/approval/list.tsx:L3", {
      repos: { studio: repoDir },
    });
    assert.equal(r.ok, true);
  });

  it("repo 文件不存在 → fail", () => {
    const r = resolveSourceRef("repo#studio/src/nope.tsx", {
      repos: { studio: repoDir },
    });
    assert.equal(r.ok, false);
  });

  after(() => rmSync(tmp, { recursive: true, force: true }));
});

describe("resolveSourceRef — enhanced scheme", () => {
  const tmp = mkdtempSync(join(tmpdir(), "kata-sr-enh-"));
  const docPath = join(tmp, "enhanced.md");
  writeFileSync(
    docPath,
    [
      "---",
      "version: 2",
      "---",
      "",
      '## 1. 概述 <a id="s-1"></a>',
      "",
      '### 1.1 背景 <a id="s-1-1-abc1"></a>',
      "",
      '## 2. 功能细节 <a id="s-2"></a>',
      "",
      '### 2.1 模块 A <a id="s-2-1-a1b2"></a>',
      "",
      '## 4. 待确认项 <a id="s-4"></a>',
      "",
      '### Q7 <a id="q7"></a>',
      "",
      '## Appendix A: 源码事实表 <a id="source-facts"></a>',
      "",
    ].join("\n"),
  );

  it("resolves enhanced#s-1 (top-level)", () => {
    const r = resolveSourceRef("enhanced#s-1", { enhancedDocPath: docPath });
    assert.equal(r.ok, true);
  });

  it("resolves enhanced#s-2-1-a1b2 (sub-section)", () => {
    const r = resolveSourceRef("enhanced#s-2-1-a1b2", { enhancedDocPath: docPath });
    assert.equal(r.ok, true);
  });

  it("resolves enhanced#q7 (pending question)", () => {
    const r = resolveSourceRef("enhanced#q7", { enhancedDocPath: docPath });
    assert.equal(r.ok, true);
  });

  it("resolves enhanced#source-facts (appendix)", () => {
    const r = resolveSourceRef("enhanced#source-facts", { enhancedDocPath: docPath });
    assert.equal(r.ok, true);
  });

  it("fails when anchor missing in enhanced.md", () => {
    const r = resolveSourceRef("enhanced#s-9", { enhancedDocPath: docPath });
    assert.equal(r.ok, false);
    assert.match(r.reason ?? "", /未找到锚点/);
  });

  it("fails when anchor format invalid", () => {
    const r = resolveSourceRef("enhanced#bad-anchor!", { enhancedDocPath: docPath });
    assert.equal(r.ok, false);
    assert.match(r.reason ?? "", /锚点格式非法/);
  });

  it("fails when ctx.enhancedDocPath missing", () => {
    const r = resolveSourceRef("enhanced#s-1", {});
    assert.equal(r.ok, false);
    assert.match(r.reason ?? "", /enhancedDocPath/);
  });

  it("fails when enhanced.md file not exist", () => {
    const r = resolveSourceRef("enhanced#s-1", {
      enhancedDocPath: join(tmp, "no-such.md"),
    });
    assert.equal(r.ok, false);
    assert.match(r.reason ?? "", /不存在/);
  });

  after(() => rmSync(tmp, { recursive: true, force: true }));
});
