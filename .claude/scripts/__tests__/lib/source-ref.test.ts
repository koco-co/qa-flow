import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseSourceRef, resolveSourceRef } from "../../lib/source-ref.ts";

describe("parseSourceRef", () => {
  it("parses plan scheme", () => {
    assert.deepEqual(parseSourceRef("plan#q3-数据源"), {
      scheme: "plan",
      anchor: "q3-数据源",
    });
  });

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
    assert.equal(parseSourceRef("planq3"), null);
  });

  it("returns null for empty anchor", () => {
    assert.equal(parseSourceRef("plan#"), null);
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

describe("resolveSourceRef — plan scheme", () => {
  const tmp = mkdtempSync(join(tmpdir(), "kata-sr-"));
  const planPath = join(tmp, "smoke.plan.md");

  writeFileSync(
    planPath,
    `---\nplan_version: 2\nstatus: ready\n---\n\n## 3. 澄清问答清单\n\n\`\`\`json\n[{"id":"Q1","severity":"blocking_unknown","question":"审批状态?","location":"功能层 → 字段定义 → 审批状态"}]\n\`\`\`\n`,
  );

  it("resolves plan#q1-审批状态 OK when id exists", () => {
    const r = resolveSourceRef("plan#q1-审批状态", { planPath });
    assert.equal(r.ok, true);
  });

  it("fails resolve when q-id absent in plan §3", () => {
    const r = resolveSourceRef("plan#q99-不存在", { planPath });
    assert.equal(r.ok, false);
    assert.match(r.reason ?? "", /plan §3 未找到 id=Q99/);
  });

  it("fails resolve when plan file missing", () => {
    const r = resolveSourceRef("plan#q1-x", { planPath: join(tmp, "nope.md") });
    assert.equal(r.ok, false);
    assert.match(r.reason ?? "", /plan.md 不存在/);
  });

  after(() => rmSync(tmp, { recursive: true, force: true }));
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
