# Phase C — 下游门禁 + source_ref 硬约束 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `test-case-gen` 下游 5 节点（transform / enhance / analyze / write / review）引入 `discuss validate` 入口门禁与 `source_ref` 硬约束，把 Phase B 的 pending_for_pm / handoff_mode / repo_consent 体系落成真正"带 pending 无法跳 transform、source_ref 缺失无法过 review"的闭环。

**Architecture:** 增量约束为主，无新 schema 库。新增一个纯函数 `lib/source-ref.ts`（parse + resolve）配套 `kata-cli source-ref resolve` 子命令；其余是 workflow 节点 md / agent system prompt / output-schemas.json / rules 的文字与字段级修订。Writer `<blocked_envelope>` 阻断回射借助 Phase B 的 `discuss append-clarify` 子命令，无需新 CLI。Phase B 临时横幅（04-transform.md）在 Task 3 随节点改造一并删除。

**Tech Stack:** bun / TypeScript / commander（kata-cli）/ node:test

**Spec reference:** `docs/refactor/specs/2026-04-24-discuss-enhancement-and-skills-refactor-design.md` Part 1.4 + Part 5 Phase C 段

**Phase B baseline:** tag `phase-b-discuss-enhancement-done`（820 单测全绿），`kata-cli discuss validate / set-repo-consent / complete --handoff-mode` 已就绪；`references/source-refs-schema.md` 已落稿

---

## File Structure

变更涉及的文件全貌（只有 `lib/source-ref.ts` 与 CLI 注册是新增，其余均为已有文件的修订）：

**纯函数层 + 新 CLI**
- Create: `.claude/scripts/lib/source-ref.ts` — `parseSourceRef` / `resolveSourceRef` 纯函数，四种 scheme（plan / prd / knowledge / repo）
- Create: `.claude/scripts/source-ref.ts` — commander 子命令 `kata-cli source-ref resolve` + `kata-cli source-ref batch`（从 JSON 列表批量解析）
- Modify: `.claude/scripts/kata-cli.ts` — 注册 `sourceRef` program

**测试层**
- Create: `.claude/scripts/__tests__/lib/source-ref.test.ts` — parse + resolve 单元测试
- Create: `.claude/scripts/__tests__/source-ref.test.ts` — CLI 集成测试

**Schema**
- Modify: `.claude/references/output-schemas.json` — `test_points_json.modules[].pages[].test_points[]` 与 `writer_json.pages[].sub_groups[].test_cases[]` 增加 `source_ref` 字段；`review_json.report.details[].issues[].code` 枚举新增 `F16`

**Workflow 节点**
- Modify: `.claude/skills/test-case-gen/workflow/04-transform.md` — 删除 Phase B 横幅，新增 4.0 门禁步骤，降级 4.2 源码许可段为"写回许可确认"，向 transform-agent prompt 注入 plan.md §1 / §6 路径
- Modify: `.claude/skills/test-case-gen/workflow/05-enhance.md` — 5.2 职责里删除"需求歧义标注"，改为引用 plan.md §3 / §6
- Modify: `.claude/skills/test-case-gen/workflow/06-analyze.md` — 新增 6.0 门禁步骤，--quick 模式下的历史检索裁剪说明保持不变，但明确下游 writer 不再消费历史覆盖
- Modify: `.claude/skills/test-case-gen/workflow/07-write.md` — 新增 7.0 门禁步骤，7.1 输入清单删除"历史归档用例参考"
- Modify: `.claude/skills/test-case-gen/workflow/08-review.md` — 新增 8.2 source_ref 存在性校验步骤
- Modify: `.claude/skills/test-case-gen/workflow/main.md` — "Writer 阻断中转协议" 重写为"回射到 discuss append-clarify"

**Agent system prompts**
- Modify: `.claude/agents/analyze-agent.md` — 步骤 1 历史检索仍保留，但在步骤 4 输出约束里新增 `source_ref` 必填；步骤 2 去掉"[待澄清]"前缀说明（discuss 已前置）
- Modify: `.claude/agents/writer-agent.md` — 删除"历史用例参考"输入，每条 `test_case` 继承 `source_ref`；`<blocked_envelope>` 协议保留输出格式不变，但主 agent 侧改为回射到 discuss（见 workflow/main.md）
- Modify: `.claude/agents/enhance-agent.md` — 输出小节删除与"需求歧义标注"相关的描述
- Modify: `.claude/agents/reviewer-agent.md` — 审查规则索引加入 F16；审查流程步骤新增"source_ref 解析批次"

**Rules / References**
- Modify: `.claude/references/test-case-standards.md` — 新增 "F16: source_ref 锚点可解析性"（放在 F15 之后），质量门禁计算口径包含 F16
- Modify: `.claude/references/prd-template.md`（若存在 template 则无需改；否则跳过）
- Modify: `rules/prd-discussion.md` — Phase B/C 衔接说明由"下游将要 enforce"改为"下游已 enforce"（小改）

**不改动但需在 plan Task 10 回归时确认向后兼容**
- `.claude/scripts/writer-context-builder.ts` — 当前不向 writer 注入历史用例；Phase C 仅在 doc 层面确认 writer 不再从 `historical_coverage` 加载归档文件
- `.claude/scripts/archive-gen.ts` / `search-filter.ts` — 不改动（analyze 仍可用作 QA 参考）
- `.claude/skills/test-case-gen/workflow/09-format-check.md` / `10-output.md` — Phase C 不动

---

## Task 1: lib/source-ref.ts — parse + resolve 纯函数 + 新 CLI

**Files:**
- Create: `.claude/scripts/lib/source-ref.ts`
- Create: `.claude/scripts/source-ref.ts`
- Create: `.claude/scripts/__tests__/lib/source-ref.test.ts`
- Create: `.claude/scripts/__tests__/source-ref.test.ts`
- Modify: `.claude/scripts/kata-cli.ts`

**Why first:** reviewer-agent（Task 8）批量校验 source_ref 可解析性时要直接调 `kata-cli source-ref resolve`。lib 与 CLI 先稳态，再改 agent system prompt / workflow md，才能保证下游依赖有准确实现可引用。

锚点语法见 `.claude/skills/test-case-gen/references/source-refs-schema.md`（Phase B 已落稿）。本 task 不新增语法，只把文档定义变成可执行代码。

- [ ] **Step 1: 写 parseSourceRef 失败测试**

Create `.claude/scripts/__tests__/lib/source-ref.test.ts`:

```ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSourceRef } from "../../lib/source-ref.ts";

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
});
```

- [ ] **Step 2: 跑测试验证失败**

```bash
bun test ./.claude/scripts/__tests__/lib/source-ref.test.ts 2>&1 | tail -15
```

Expected: FAIL — `Cannot find module .../lib/source-ref.ts`。

- [ ] **Step 3: 写 parseSourceRef 最小实现**

Create `.claude/scripts/lib/source-ref.ts`:

```ts
/**
 * source-ref.ts — 解析 Phase B 定义的 source_ref 锚点语法
 *
 * 完整规范见 `.claude/skills/test-case-gen/references/source-refs-schema.md`。
 *
 * Syntax:
 *   source_ref ::= <scheme>#<anchor>
 *   scheme     ::= plan | prd | knowledge | repo
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve as resolvePath } from "node:path";

export type SourceRefScheme = "plan" | "prd" | "knowledge" | "repo";

export interface ParsedSourceRef {
  scheme: SourceRefScheme;
  anchor: string;
}

const SCHEMES: readonly SourceRefScheme[] = ["plan", "prd", "knowledge", "repo"];

export function parseSourceRef(raw: string): ParsedSourceRef | null {
  if (typeof raw !== "string") return null;
  const idx = raw.indexOf("#");
  if (idx <= 0 || idx === raw.length - 1) return null;

  const scheme = raw.slice(0, idx);
  const anchor = raw.slice(idx + 1);
  if (!SCHEMES.includes(scheme as SourceRefScheme)) return null;
  return { scheme: scheme as SourceRefScheme, anchor };
}
```

- [ ] **Step 4: 跑测试验证通过**

```bash
bun test ./.claude/scripts/__tests__/lib/source-ref.test.ts 2>&1 | tail -10
```

Expected: PASS — 7/7 测试绿。

- [ ] **Step 5: 写 resolveSourceRef 失败测试（plan scheme）**

Append to `.claude/scripts/__tests__/lib/source-ref.test.ts`:

```ts
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveSourceRef } from "../../lib/source-ref.ts";

describe("resolveSourceRef — plan scheme", () => {
  const tmp = mkdtempSync(join(tmpdir(), "kata-sr-"));
  const planPath = join(tmp, "smoke.plan.md");

  // minimal plan.md with §3 Q1 entry
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
```

- [ ] **Step 6: 跑测试验证失败**

```bash
bun test ./.claude/scripts/__tests__/lib/source-ref.test.ts 2>&1 | tail -15
```

Expected: FAIL — `resolveSourceRef` not exported。

- [ ] **Step 7: 实现 resolveSourceRef（plan scheme）**

Append to `.claude/scripts/lib/source-ref.ts`:

```ts
export interface ResolveContext {
  planPath?: string;
  prdPath?: string;
  workspaceDir?: string;
  projectName?: string;
  /** Mapping of repo-short-name → absolute path. If repo scheme anchor's
   *  first path segment matches a key, its file lookup is rooted there. */
  repos?: Record<string, string>;
}

export interface ResolveResult {
  ok: boolean;
  reason?: string;
}

export function resolveSourceRef(raw: string, ctx: ResolveContext): ResolveResult {
  const parsed = parseSourceRef(raw);
  if (parsed === null) {
    return { ok: false, reason: `锚点格式非法: ${raw}` };
  }
  switch (parsed.scheme) {
    case "plan":
      return resolvePlan(parsed.anchor, ctx);
    case "prd":
      return resolvePrd(parsed.anchor, ctx);
    case "knowledge":
      return resolveKnowledge(parsed.anchor, ctx);
    case "repo":
      return resolveRepo(parsed.anchor, ctx);
  }
}

function resolvePlan(anchor: string, ctx: ResolveContext): ResolveResult {
  if (ctx.planPath === undefined) {
    return { ok: false, reason: "plan scheme 需要 ctx.planPath" };
  }
  if (!existsSync(ctx.planPath)) {
    return { ok: false, reason: `plan.md 不存在: ${ctx.planPath}` };
  }
  // anchor = "q3-数据源"；我们只校验 q-id 部分
  const m = anchor.match(/^q(\d+)(?:-.*)?$/i);
  if (m === null) {
    return { ok: false, reason: `plan 锚点需为 q<id> 或 q<id>-<slug>: ${anchor}` };
  }
  const qId = `Q${m[1]}`;
  const text = readFileSync(ctx.planPath, "utf8");
  const jsonBlock = text.match(/## 3\. 澄清问答清单[\s\S]*?```json\s*([\s\S]*?)```/);
  if (jsonBlock === null) {
    return { ok: false, reason: "plan.md §3 JSON 块未找到" };
  }
  try {
    const arr = JSON.parse(jsonBlock[1]) as Array<{ id?: string }>;
    if (!Array.isArray(arr)) {
      return { ok: false, reason: "plan §3 期待数组" };
    }
    const found = arr.some((item) => typeof item?.id === "string" && item.id.toUpperCase() === qId);
    if (!found) {
      return { ok: false, reason: `plan §3 未找到 id=${qId}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: `plan §3 JSON 解析失败: ${(e as Error).message}` };
  }
}

function resolvePrd(anchor: string, ctx: ResolveContext): ResolveResult {
  if (ctx.prdPath === undefined) {
    return { ok: false, reason: "prd scheme 需要 ctx.prdPath" };
  }
  if (!existsSync(ctx.prdPath)) {
    return { ok: false, reason: `prd 文件不存在: ${ctx.prdPath}` };
  }
  const text = readFileSync(ctx.prdPath, "utf8");
  // anchor = "section-2.1.3" 或 "审批状态字段定义"
  // 策略：把 markdown heading slug 化后做包含匹配（GitHub 风格）
  const headings = Array.from(text.matchAll(/^#{1,6}\s+(.+)$/gm)).map((m) =>
    slugifyHeading(m[1].trim()),
  );
  if (headings.includes(slugifyHeading(anchor))) {
    return { ok: true };
  }
  // 兼容 section-x.y.z 的裸数字引用：若 heading 文本以该编号开头也视为命中
  const looseMatch = headings.some((h) => h.includes(anchor.toLowerCase()));
  return looseMatch
    ? { ok: true }
    : { ok: false, reason: `prd 未找到匹配锚点: ${anchor}` };
}

function slugifyHeading(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^0-9a-z一-龥\-.]/g, "");
}

function resolveKnowledge(anchor: string, ctx: ResolveContext): ResolveResult {
  if (ctx.workspaceDir === undefined || ctx.projectName === undefined) {
    return { ok: false, reason: "knowledge scheme 需要 ctx.workspaceDir + ctx.projectName" };
  }
  // anchor = "overview.数据源默认" / "term.审批.中文解释" / "module.xxx" / "pitfall.xxx"
  const dot = anchor.indexOf(".");
  if (dot <= 0) {
    return { ok: false, reason: `knowledge 锚点需形如 <type>.<name>: ${anchor}` };
  }
  const type = anchor.slice(0, dot);
  const ALLOWED = new Set(["overview", "term", "module", "pitfall"]);
  if (!ALLOWED.has(type)) {
    return { ok: false, reason: `knowledge 锚点 type 非法: ${type}` };
  }
  const kdir = join(ctx.workspaceDir, ctx.projectName, "knowledge");
  if (!existsSync(kdir)) {
    return { ok: false, reason: `knowledge 目录不存在: ${kdir}` };
  }
  // 简化：只校验 type 目录或 overview.md 存在；细粒度条目校验由 knowledge-keeper 负责
  const candidates = [
    join(kdir, `${type}.md`),
    join(kdir, type),
    join(kdir, `${type}s.md`),
    join(kdir, `${type}s`),
  ];
  if (candidates.some((p) => existsSync(p))) {
    return { ok: true };
  }
  return { ok: false, reason: `knowledge 未找到 type=${type} 的入口文件或目录` };
}

function resolveRepo(anchor: string, ctx: ResolveContext): ResolveResult {
  // anchor = "studio/src/approval/list.tsx:L45" 或 "xxx.java:L45-L60"
  const m = anchor.match(/^([^:]+)(?::L(\d+)(?:-L(\d+))?)?$/);
  if (m === null) {
    return { ok: false, reason: `repo 锚点需形如 <path>(:L<start>(-L<end>)?): ${anchor}` };
  }
  const relPath = m[1];
  const firstSeg = relPath.split("/")[0];

  // 优先查 ctx.repos[firstSeg] 下的完整路径
  if (ctx.repos !== undefined && ctx.repos[firstSeg] !== undefined) {
    const abs = join(ctx.repos[firstSeg], relPath.slice(firstSeg.length + 1));
    return existsSync(abs)
      ? { ok: true }
      : { ok: false, reason: `repo 文件不存在: ${abs}` };
  }

  // 降级：workspace/{project}/.repos/ 下查同名目录
  if (ctx.workspaceDir !== undefined && ctx.projectName !== undefined) {
    const reposDir = join(ctx.workspaceDir, ctx.projectName, ".repos");
    const tryAbs = join(reposDir, relPath);
    if (existsSync(tryAbs)) return { ok: true };
  }

  return { ok: false, reason: `repo 未在 ctx.repos 或 workspace/.repos 中找到: ${firstSeg}` };
}
```

注意 `after()` 钩子需要 import：

```ts
import { after } from "node:test";
```

（在 test 文件顶部 import 区加一行；若 Step 5 已补则跳过）

- [ ] **Step 8: 跑测试验证通过**

```bash
bun test ./.claude/scripts/__tests__/lib/source-ref.test.ts 2>&1 | tail -10
```

Expected: PASS — 10/10 测试绿。

- [ ] **Step 9: 补充 prd / knowledge / repo scheme 测试**

Append to `.claude/scripts/__tests__/lib/source-ref.test.ts`:

```ts
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
```

- [ ] **Step 10: 跑测试验证通过**

```bash
bun test ./.claude/scripts/__tests__/lib/source-ref.test.ts 2>&1 | tail -10
```

Expected: PASS — 18/18 测试绿。

- [ ] **Step 11: 写 CLI 子命令 `source-ref resolve`**

Create `.claude/scripts/source-ref.ts`:

```ts
#!/usr/bin/env bun
/**
 * source-ref.ts — CLI 入口，封装 lib/source-ref.ts 的 parse + resolve。
 *
 * Usage:
 *   kata-cli source-ref resolve --ref <source_ref>
 *                               [--plan <path>] [--prd <path>]
 *                               [--project <name>] [--workspace-dir <dir>]
 *   kata-cli source-ref batch --refs-json <path-to-json-array>
 *                             [--plan <path>] [--prd <path>] ...
 */

import { readFileSync } from "node:fs";
import { createCli } from "./lib/cli-runner.ts";
import { env } from "./lib/env.ts";
import { resolveSourceRef, type ResolveContext } from "./lib/source-ref.ts";

function buildCtx(opts: Record<string, unknown>): ResolveContext {
  return {
    planPath: (opts.plan as string | undefined) ?? undefined,
    prdPath: (opts.prd as string | undefined) ?? undefined,
    projectName: (opts.project as string | undefined) ?? undefined,
    workspaceDir:
      (opts.workspaceDir as string | undefined) ?? env.WORKSPACE_DIR,
  };
}

export const program = createCli({
  name: "source-ref",
  description: "Parse and resolve source_ref anchors (plan / prd / knowledge / repo).",
  commands: [
    {
      name: "resolve",
      description: "Resolve a single source_ref. Exit 0 if OK, 1 if unresolvable.",
      options: [
        { flag: "--ref <ref>", description: "source_ref string", required: true },
        { flag: "--plan <path>", description: "plan.md path (for plan scheme)" },
        { flag: "--prd <path>", description: "prd file path (for prd scheme)" },
        { flag: "--project <name>", description: "project name" },
        { flag: "--workspace-dir <dir>", description: "workspace dir override" },
      ],
      action: (opts, ctx) => {
        const res = resolveSourceRef(opts.ref as string, buildCtx(opts as Record<string, unknown>));
        ctx.log.info(JSON.stringify({ ref: opts.ref, ...res }, null, 2));
        if (!res.ok) process.exit(1);
      },
    },
    {
      name: "batch",
      description: "Resolve a JSON array of {ref} entries. Exit 0 if all OK, 2 if any fails.",
      options: [
        { flag: "--refs-json <path>", description: "JSON file: [{ref: string, ...}]", required: true },
        { flag: "--plan <path>", description: "plan.md path" },
        { flag: "--prd <path>", description: "prd path" },
        { flag: "--project <name>", description: "project name" },
        { flag: "--workspace-dir <dir>", description: "workspace dir override" },
      ],
      action: (opts, ctx) => {
        const raw = readFileSync(opts.refsJson as string, "utf8");
        const items = JSON.parse(raw) as Array<{ ref: string }>;
        const resolveCtx = buildCtx(opts as Record<string, unknown>);
        const results = items.map((it) => ({
          ref: it.ref,
          ...resolveSourceRef(it.ref, resolveCtx),
        }));
        ctx.log.info(JSON.stringify({ total: results.length, fails: results.filter((r) => !r.ok), results }, null, 2));
        if (results.some((r) => !r.ok)) process.exit(2);
      },
    },
  ],
});

if (import.meta.main) {
  program.parseAsync(process.argv);
}
```

- [ ] **Step 12: 注册到 kata-cli**

Edit `.claude/scripts/kata-cli.ts`：

在 import 区按字母序插入：

```ts
import { program as sourceRef } from "./source-ref.ts";
```

在 `kata.addCommand(...)` 区按字母序插入：

```ts
kata.addCommand(sourceRef);
```

`sourceAnalyze` 在前，`sourceRef` 紧随其后；`writerContextBuilder` 之前。

- [ ] **Step 13: 写 CLI 集成测试**

Create `.claude/scripts/__tests__/source-ref.test.ts`:

```ts
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolve as resolvePath } from "node:path";

const REPO_ROOT = resolvePath(import.meta.dirname, "../..");
const CLI = ["bun", join(REPO_ROOT, ".claude/scripts/kata-cli.ts"), "source-ref"];

describe("kata-cli source-ref resolve (integration)", () => {
  const tmp = mkdtempSync(join(tmpdir(), "kata-sr-cli-"));
  const planPath = join(tmp, "smoke.plan.md");
  writeFileSync(
    planPath,
    `---\nplan_version: 2\n---\n\n## 3. 澄清问答清单\n\n\`\`\`json\n[{"id":"Q1","severity":"blocking_unknown"}]\n\`\`\`\n`,
  );

  it("exits 0 when plan anchor resolves", () => {
    const r = spawnSync(CLI[0], [...CLI.slice(1), "resolve", "--ref", "plan#q1-xxx", "--plan", planPath], {
      encoding: "utf8",
    });
    assert.equal(r.status, 0, `stderr=${r.stderr}`);
    assert.match(r.stdout, /"ok":\s*true/);
  });

  it("exits 1 when plan anchor missing", () => {
    const r = spawnSync(CLI[0], [...CLI.slice(1), "resolve", "--ref", "plan#q99-none", "--plan", planPath], {
      encoding: "utf8",
    });
    assert.equal(r.status, 1);
    assert.match(r.stdout, /"ok":\s*false/);
  });

  it("batch exits 2 when any fails", () => {
    const refsJson = join(tmp, "refs.json");
    writeFileSync(refsJson, JSON.stringify([{ ref: "plan#q1-x" }, { ref: "plan#q99-x" }]));
    const r = spawnSync(CLI[0], [...CLI.slice(1), "batch", "--refs-json", refsJson, "--plan", planPath], {
      encoding: "utf8",
    });
    assert.equal(r.status, 2);
    assert.match(r.stdout, /"total":\s*2/);
  });

  after(() => rmSync(tmp, { recursive: true, force: true }));
});
```

- [ ] **Step 14: 跑全量测试，确保零回归**

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -10
```

Expected: `820 + 18 (lib/source-ref) + 3 (cli) ≈ 841 pass, 0 fail`。若数字差 ±3 以内且全绿，即合格。

- [ ] **Step 15: 提交**

```bash
git add .claude/scripts/lib/source-ref.ts \
        .claude/scripts/source-ref.ts \
        .claude/scripts/kata-cli.ts \
        .claude/scripts/__tests__/lib/source-ref.test.ts \
        .claude/scripts/__tests__/source-ref.test.ts
git commit -m "feat(source-ref): add parseSourceRef / resolveSourceRef lib + kata-cli source-ref resolve|batch

- 四种 scheme：plan#q<id>-slug / prd#section-slug / knowledge#type.name / repo#path:Lstart-Lend
- plan 验 §3 JSON fence 中的 Q-id；prd 按 GitHub 风格 slug 匹配 heading；knowledge 验 type 入口文件/目录；repo 验文件存在
- CLI：resolve（exit 0 ok / exit 1 fail）+ batch（exit 0/2）
- 配 Phase C 下游 review 节点的 F16 锚点可解析性校验"
```

---

## Task 2: output-schemas.json 扩展 source_ref + F16

**Files:**
- Modify: `.claude/references/output-schemas.json`

**Why now:** 先把 schema 里的字段名和位置钉住，后续 analyze-agent / writer-agent / reviewer-agent 改 system prompt 时直接引用。

- [ ] **Step 1: 给 test_points_json 的 test_points 项加 source_ref**

Edit `.claude/references/output-schemas.json` 对 `"test_points_json"` 段做如下精确修改：

定位原字段：

```json
"test_points": [
  {
    "point": "string — 测试点标题",
    "dimension": "string — 测试维度（功能正向/功能逆向/边界值/兼容性/性能/安全/用户体验）",
    "priority": "string — P0/P1/P2",
    "description": "string — 可指导 Writer 编写用例的详细说明"
  }
]
```

替换为：

```json
"test_points": [
  {
    "point": "string — 测试点标题",
    "dimension": "string — 测试维度（功能正向/功能逆向/边界值/兼容性/性能/安全/用户体验）",
    "priority": "string — P0/P1/P2",
    "description": "string — 可指导 Writer 编写用例的详细说明",
    "source_ref": "string — 必填，形如 plan#q3-数据源 / prd#2.1.3 / knowledge#overview.数据源默认 / repo#studio/src/approval/list.tsx:L45。Phase C 起 reviewer 会按 F16 规则校验可解析性。"
  }
]
```

- [ ] **Step 2: 给 writer_json 的 test_cases 项加 source_ref**

定位原字段：

```json
"test_cases": [
  {
    "title": "string — 裸标题（Contract A：仅写「验证xxx」，不含优先级前缀）",
    "priority": "string — P0/P1/P2（单独字段，不内嵌到 title）",
    "type": "string — positive/negative/boundary",
    "preconditions": "string[] — 前置条件列表（每条描述如何达到该状态）",
    "steps": [
```

替换为：

```json
"test_cases": [
  {
    "title": "string — 裸标题（Contract A：仅写「验证xxx」，不含优先级前缀）",
    "priority": "string — P0/P1/P2（单独字段，不内嵌到 title）",
    "type": "string — positive/negative/boundary",
    "source_ref": "string — 必填，继承自对应测试点的 source_ref；Phase C 起缺失或不可解析会被 reviewer 判 F16",
    "preconditions": "string[] — 前置条件列表（每条描述如何达到该状态）",
    "steps": [
```

- [ ] **Step 3: 在 review_json.report.details[].issues[] 的 code 注释里列入 F16**

定位原字段：

```json
"issues": [
  {
    "code": "string — 规则编号（F07-F15）",
```

替换为：

```json
"issues": [
  {
    "code": "string — 规则编号（F07-F16）",
```

再定位 `"quality_report"` 的子字段注释（若存在 `F01-F15` 字样），全部替换为 `F01-F16`。命令行确认：

```bash
grep -n "F01-F15\|F07-F15" .claude/references/output-schemas.json
```

若仍有命中，逐条替换为带 F16 的表述（同目录搜索优先用 Edit 精确替换，不用 sed）。

- [ ] **Step 4: 语法检查**

```bash
bun -e 'JSON.parse(require("fs").readFileSync(".claude/references/output-schemas.json","utf8")); console.log("OK")'
```

Expected: `OK`（文件仍然是合法 JSON）。

- [ ] **Step 5: 提交**

```bash
git add .claude/references/output-schemas.json
git commit -m "feat(schemas): add source_ref to test_points_json / writer_json; extend issues code to F16

- test_points_json.modules[].pages[].test_points[].source_ref: required
- writer_json.pages[].sub_groups[].test_cases[].source_ref: required (inherited)
- review_json issues code annotation extended to F01-F16
- aligned with Phase C downstream gate + F16 (source_ref anchor resolvability)"
```

---

## Task 3: 04-transform.md — 删 Phase B 横幅，加 4.0 门禁，降级 4.2 源码许可

**Files:**
- Modify: `.claude/skills/test-case-gen/workflow/04-transform.md`

**Why now:** Phase C 的第一个入口节点。改完即可手验"带 pending 的 plan.md 在 transform 入口被拦截"。

- [ ] **Step 1: 删除 Phase B 临时横幅**

Edit `.claude/skills/test-case-gen/workflow/04-transform.md`：

删除第 3-5 行的 Phase B 横幅（即以下三行 blockquote）：

```markdown
> **⚠️ Phase B 临时横幅**：discuss 出口可能带 `pending_count > 0`。Phase C 启用下游门禁前，主 agent 应在启动 transform 前手动调
> `kata-cli discuss validate --require-zero-blocking --require-zero-pending`
> 校验；退出非 0 → 回 discuss 步骤 3.6 回填。本节点下的 4.x 步骤保持 Phase A 时行为。
```

删除前把 `# 节点 4: transform — 源码分析与 PRD 结构化` 后的空行和上游说明回复为 Phase A 原状。

- [ ] **Step 2: 在 `**⏳ Task**` 行之后、`### 4.1` 之前插入 4.0 门禁**

Edit 同一文件，在 `**⏳ Task**：将 \`transform\` 任务标记为 \`in_progress\`。` 行之后追加：

````markdown

### 4.0 下游入口门禁（Phase C 新增）

进入本节点**前必须**执行 discuss 门禁：

```bash
kata-cli discuss validate \
  --project {{project}} --prd {{prd_path}} \
  --require-zero-blocking --require-zero-pending
```

退出码约定（由 `kata-cli discuss validate` Phase B 已实现）：

| 退出码 | 情况 | 处理 |
|---|---|---|
| 0 | plan §3 blocking_unanswered = 0 且 pending_count = 0 | 继续 4.1 |
| 1 | schema error | 检查 plan.md 是否被误改；回 discuss 节点 reset |
| 2 | blocking_unanswered > 0 | 回 discuss 节点 3.6 续问 |
| 3 | pending_count > 0 | 主 agent 在 AskUserQuestion 中引导产品在 plan.md §6 打勾回写，并调 `discuss append-clarify` 把 pending 转 blocking_unknown + user_answer；再跑 3.9 complete 后重入本节点 |

**禁止绕过门禁**：主 agent 不得以"用户已口头回答"等理由跳过 CLI 校验；违反硬约束即阻断当前会话并报警。
````

- [ ] **Step 3: 降级 4.2 源码引用许可为"写回许可确认"**

定位文件中 `### 4.2 源码引用许可（交互点）` 到 `### 4.3 拉取源码` 的整段内容，整体替换为：

````markdown
### 4.2 源码引用写回许可（交互点 — Phase C 降级）

> **⚠️ 同步许可已在节点 3.2 拿到**（写入 plan.md frontmatter.repo_consent）。本节点只负责"是否把这次的 profile 映射保存为新 profile"的二道确认。
> 若 plan.md.repo_consent 为空或被 `set-repo-consent --clear` 清掉，**不要**在本节点补问——应回到 discuss 节点 3.2 重新发起。

仅当用户本轮讨论中提出了**新的 profile 映射**（新增仓库、调整分支），展示写入摘要：

- profile 名称：`{{name}}`
- repos 预览：`{{repos_json}}`
- 写入位置：repo profile 配置

然后使用 AskUserQuestion 询问：

- 选项 1：仅本次使用，不保存（默认）
- 选项 2：保存为新的 profile / 更新现有 profile
- 选项 3：取消刚才的映射调整

只有选项 2 才执行：

```bash
kata-cli repo-profile save --name "{{name}}" --repos '{{repos_json}}'
```

若本轮未改过 profile 映射，本步骤**完全跳过**，直接进 4.3。
````

- [ ] **Step 4: 4.3 拉取源码改为"幂等校验同步状态"**

定位 `### 4.3 拉取源码` 段落。原来在这里补做 `repo-sync`；Phase C 起同步已在节点 3.2.3 完成，本节点仅校验落盘 SHA 是否和 plan.md.repo_consent 一致。替换该段为：

````markdown
### 4.3 源码同步状态校验（幂等）

Phase C 起，真正的 `repo-sync` 已在节点 3.2.3 完成。本节点只做一次幂等校验：

```bash
kata-cli discuss read --project {{project}} --prd {{prd_path}} \
  | bun -e 'JSON.parse(require("fs").readFileSync(0,"utf8")).repo_consent?.repos?.forEach(r => console.log(r.path, r.sha ?? "(no-sync)"))'
```

若 `repo_consent` 为空（用户在 3.2 选了"不使用源码参考"）→ 跳过 4.4 的源码交叉分析分支。

若 `repo_consent.repos[].sha` 全部非空且 `.repos/` 目录存在 → 继续 4.4。

若 `sha` 存在但工作区已变更（`git rev-parse HEAD ≠ sha`）→ 提示用户但不阻断；让 transform-agent 在任务提示中记录"sha 漂移"标记。
````

- [ ] **Step 5: 4.4 task prompt 注入 plan.md §1 + §6 路径**

定位 `### 4.4 PRD 结构化转换（AI 任务）` 段。修改 transform-agent prompt 的示例，从：

```
plan_path: workspace/{{project}}/prds/{{YYYYMM}}/{{prd_slug}}.plan.md
```

扩展为：

```
plan_path: workspace/{{project}}/prds/{{YYYYMM}}/{{prd_slug}}.plan.md
plan_summary_section: §1  # 4 子节：背景 / 痛点 / 目标 / 成功标准
plan_pending_section: §6  # 产品待确认清单（此时应为空，作为健康标记）
source_consent_repos: {{repo_consent.repos_as_json}}  # 来自 plan.md frontmatter，可为 []
```

transform-agent 读取时：

- §1 4 子节直接粘贴到增强 PRD 的 "概述" 章节
- §6 若非空 → 打印警告（本不应发生，因 4.0 门禁已拦）
- source_consent_repos 作为源码分析的入口列表

- [ ] **Step 6: 验证 diff**

```bash
grep -c "^### 4\.0\|^### 4\.1\|^### 4\.2\|^### 4\.3\|^### 4\.4\|^### 4\.5" .claude/skills/test-case-gen/workflow/04-transform.md
# Expected: 6（4.0 新增 + 4.1~4.5 原有）

grep -n "Phase B 临时横幅\|Phase B 横幅" .claude/skills/test-case-gen/workflow/04-transform.md
# Expected: 无命中

grep -n "plan_summary_section\|plan_pending_section\|--require-zero-pending" .claude/skills/test-case-gen/workflow/04-transform.md
# Expected: 3 处命中
```

- [ ] **Step 7: 提交**

```bash
git add .claude/skills/test-case-gen/workflow/04-transform.md
git commit -m "refactor(transform): add 4.0 downstream gate, drop Phase B banner, downgrade 4.2 source consent

- 4.0 新增：kata-cli discuss validate --require-zero-blocking --require-zero-pending 硬门禁
- 删除 Phase B 临时横幅（同步迁移到 Phase C 正式门禁）
- 4.2 降级为仅'写回 profile 二道确认'；同步许可已在 discuss 3.2 拿
- 4.3 变为幂等校验 sha / 漂移告警，不再重跑 repo-sync
- 4.4 prompt 注入 plan.md §1（4 子节）/ §6 / repo_consent 列表"
```

---

## Task 4: 05-enhance.md + enhance-agent.md — 删除需求歧义标注职责

**Files:**
- Modify: `.claude/skills/test-case-gen/workflow/05-enhance.md`
- Modify: `.claude/agents/enhance-agent.md`

**Why now:** discuss 节点已经承担了"歧义澄清"的全部职责（10 维度 / 模糊扫描 / pending）；enhance 节点继续保留会产生职责重叠 + 二义性。

- [ ] **Step 1: 从 05-enhance.md 5.2 移除"需求歧义标注"**

Edit `.claude/skills/test-case-gen/workflow/05-enhance.md`：

定位：

```markdown
### 5.2 PRD 增强（AI 任务）

派发 `enhance-agent`（model: sonnet），对 PRD 执行：

- 图片语义化描述
- 页面要点提取
- 需求歧义标注
- 健康度预检
```

改为：

```markdown
### 5.2 PRD 增强（AI 任务）

派发 `enhance-agent`（model: sonnet），对 PRD 执行：

- 图片语义化描述
- 页面要点提取
- 健康度预检

> **Phase C 移除**：需求歧义标注职责已全部迁往节点 3 discuss（10 维度 / 模糊扫描 / pending_for_pm）。enhance 节点不再产出 `[待澄清]` 标记或 blocking 提示；若发现 PRD 有新的疑问点，应回退到 discuss 的 `append-clarify`。
```

- [ ] **Step 2: 从交互点 B 段移除歧义告警路径**

定位：

```markdown
仅当 `health_warnings` 中出现 `blocking_unknown` / `invalid_input`，或用户明确要求停下来查看增强结果时，才使用 AskUserQuestion：
```

改为：

```markdown
仅当 `health_warnings` 中出现 `invalid_input`（PRD 本身格式破损），或用户明确要求停下来查看增强结果时，才使用 AskUserQuestion：
```

> 原因：`blocking_unknown` 在 Phase C 里只应出现在 plan.md §3；enhance 不再产出这一类 warning。

- [ ] **Step 3: enhance-agent.md 同步删除歧义相关描述**

Edit `.claude/agents/enhance-agent.md`：

逐处搜索确认：

```bash
grep -n "歧义\|ambiguity\|blocking_unknown\|待澄清" .claude/agents/enhance-agent.md
```

若有任何命中，按"Phase C 迁移到 discuss"语气删除该段落（enhance-agent 当前代码 review 中没看到显式"歧义标注"章节；如全文无命中，本 step 无 diff，直接进入 Step 4）。

特别地，把文件顶部 role 描述：

```markdown
你是 kata 流水线中的 PRD 增强 Agent。你的职责是对 transform 节点已完成结构化转换的 PRD 进行图片处理、格式标准化和健康度最终检查。
```

调整为（明确 Phase C 起职责边界）：

```markdown
你是 kata 流水线中的 PRD 增强 Agent。你的职责是对 transform 节点已完成结构化转换的 PRD 进行图片处理、格式标准化和健康度最终检查。

> **Phase C 职责收窄**：你**不再**承担需求歧义标注；所有澄清逻辑已在节点 3 discuss 落地（10 维度 / 模糊扫描 / pending_for_pm）。发现 PRD 疑问点时不要输出 `[待澄清]` 前缀或 `blocking_unknown` 告警，而是打印一条中性观察（以 INFO: 开头），让主 agent 决定是否回退 discuss。
```

- [ ] **Step 4: 验证**

```bash
grep -c "需求歧义标注\|\\[待澄清\\]\\b" .claude/skills/test-case-gen/workflow/05-enhance.md .claude/agents/enhance-agent.md
# Expected: 0
```

- [ ] **Step 5: 提交**

```bash
git add .claude/skills/test-case-gen/workflow/05-enhance.md .claude/agents/enhance-agent.md
git commit -m "refactor(enhance): drop ambiguity-annotation duty; owned by discuss now

- 05-enhance.md 5.2 删除'需求歧义标注'bullet
- 交互点 B 从 'blocking_unknown' 判定收窄为 'invalid_input'
- enhance-agent.md role 增加 Phase C 职责边界说明，禁用 [待澄清] / blocking_unknown 告警
- 所有歧义澄清回归到节点 3 discuss"
```

---

## Task 5: 06-analyze.md + analyze-agent.md — 6.0 门禁 + source_ref 必填

**Files:**
- Modify: `.claude/skills/test-case-gen/workflow/06-analyze.md`
- Modify: `.claude/agents/analyze-agent.md`

**Why now:** analyze 是测试点产出起点；`source_ref` 的源头在这里。先让 analyze-agent 输出带锚点，后面 write / review 才能继承 / 校验。

- [ ] **Step 1: 06-analyze.md 插入 6.0 门禁**

Edit `.claude/skills/test-case-gen/workflow/06-analyze.md`：

在 `**⏳ Task**：将 \`analyze\` 任务标记为 \`in_progress\`。` 行之后、`### 6.1 历史用例检索` 之前插入：

````markdown

### 6.0 下游入口门禁（Phase C 新增）

进入本节点**前必须**执行 discuss 门禁（与 4.0 同口径）：

```bash
kata-cli discuss validate \
  --project {{project}} --prd {{prd_path}} \
  --require-zero-blocking --require-zero-pending
```

退出码处理同 4.0。退出 3（pending > 0）→ 回 discuss 节点 3.6 把产品回写的 §6 条目转 blocking+answer，再跑 3.9 complete 后重入本节点。

> **为什么在 analyze 也要拦一道**：用户可能直接跳过 transform（例如测试点重做）。保守冗余一次门禁比事后修补便宜。
````

- [ ] **Step 2: 6.1 历史检索结尾加一条 Phase C 说明**

在 `### 6.1 历史用例检索` 段末尾的 `> 注：...` blockquote 之后追加一条：

```markdown
> **Phase C 变化**：历史用例仅用于本节点 analyze-agent 自身的"覆盖分析"（避免重复产出同类测试点），**不再**作为 writer 的参考输入（见 07-write.md 7.1）。`historical_coverage` 输出字段保留，用于审计和日志回放，writer-agent 在 Phase C 不再读取它。
```

- [ ] **Step 3: analyze-agent.md 步骤 4 输出约束加 source_ref 必填**

Edit `.claude/agents/analyze-agent.md`：

定位：

```markdown
### 步骤 4：输出测试点清单

输出 JSON 格式的测试点清单（粗粒度测试方向，非最终用例）。

JSON 结构参见 `.claude/references/output-schemas.json` 中的 `test_points_json`。
```

替换为：

````markdown
### 步骤 4：输出测试点清单

输出 JSON 格式的测试点清单（粗粒度测试方向，非最终用例）。

JSON 结构参见 `.claude/references/output-schemas.json` 中的 `test_points_json`。

**Phase C 硬约束**：每一条 `test_points[].source_ref` 必填，语法见 `.claude/skills/test-case-gen/references/source-refs-schema.md`。优先级：

1. **plan 锚点**：若该测试点对应 plan.md §3 某条澄清 → `plan#q<id>-<slug>`（slug 取 location 最末段）
2. **prd 锚点**：若该测试点直接来自 PRD 某小节 → `prd#<section-slug>`（用 PRD 标题的 GitHub slug）
3. **knowledge 锚点**：若该测试点来自业务知识（例如术语或踩坑） → `knowledge#<type>.<name>`
4. **repo 锚点**（可选兜底）：若 plan.md.repo_consent 非空且本测试点来自源码考古 → `repo#<short_name>/<rel_path>:L<line>`

示例：

```json
{
  "point": "验证审批状态流转：待审批 → 已驳回",
  "dimension": "功能逆向",
  "priority": "P1",
  "description": "...",
  "source_ref": "plan#q7-审批状态"
}
```

缺失 `source_ref` 的测试点会在 review 节点被判为 F16（详见 `references/test-case-standards.md` F16）。
````

- [ ] **Step 4: analyze-agent.md 步骤 2.2 删除"[待澄清]"前缀约定**

Edit `.claude/agents/analyze-agent.md`：

定位"注意事项"小节的第 3 条：

```markdown
3. 若 PRD 中某功能描述模糊，在测试点中标注 `[待澄清]` 前缀
```

替换为：

```markdown
3. Phase C 起不再标注 `[待澄清]` 前缀；任何模糊点都应回退到节点 3 discuss 的 `append-clarify`（blocking 或 pending），analyze 步骤前置门禁（6.0）已确保 plan 上不再有未答 blocking。若出现漏网的模糊点，将其记入 historical_coverage 的 notes 字段由主 agent 决策是否补澄清
```

- [ ] **Step 5: 验证**

```bash
grep -n "source_ref" .claude/agents/analyze-agent.md
# Expected: 至少 3 行命中

grep -n "\\[待澄清\\]" .claude/agents/analyze-agent.md
# Expected: 仅 1 行（Phase C 说明里描述"不再标注"），不可有任何"要求标注"的表述
```

- [ ] **Step 6: 提交**

```bash
git add .claude/skills/test-case-gen/workflow/06-analyze.md .claude/agents/analyze-agent.md
git commit -m "refactor(analyze): add 6.0 gate; test_points require source_ref; drop [待澄清] prefix

- 06-analyze.md 新增 6.0 入口门禁（同 4.0），防止绕过 transform 直跑 analyze
- 6.1 说明 historical_coverage 不再作为 writer 输入
- analyze-agent.md 步骤 4 强制 source_ref；四种 scheme 优先级说明
- 注意事项 #3：Phase C 起不再用 [待澄清] 前缀，模糊点回退 discuss"
```

---

## Task 6: 07-write.md + writer-agent.md — 7.0 门禁 + 去掉历史用例 + source_ref 继承

**Files:**
- Modify: `.claude/skills/test-case-gen/workflow/07-write.md`
- Modify: `.claude/agents/writer-agent.md`

**Why now:** write 是测试点落到用例的最后一跳；必须确保 `source_ref` 从 test_point 一路传到每条 test_case，reviewer 才有得校验。

- [ ] **Step 1: 07-write.md 插入 7.0 门禁**

Edit `.claude/skills/test-case-gen/workflow/07-write.md`：

在 `**⏳ Task**：...` 行之后、`### 7.1 派发 Writer Sub-Agent` 之前插入：

````markdown

### 7.0 下游入口门禁（Phase C 新增）

```bash
kata-cli discuss validate \
  --project {{project}} --prd {{prd_path}} \
  --require-zero-blocking --require-zero-pending
```

退出码处理同 4.0 / 6.0。这是第 3 道入口校验（冗余但必须）——若用户在 analyze 之后、write 之前手动打开了 plan.md 加了 pending，也会被拦住。
````

- [ ] **Step 2: 7.1 输入清单删除"历史归档用例参考"**

定位：

```markdown
输入包含：

- 增强后 PRD 对应模块内容
- 该模块已确认的测试点清单
- 合并后规则 JSON（来自 `workspace/{{project}}/.temp/rules-merged.json`）
- 历史归档用例参考（来自 analyze 步骤）
- 已确认上下文（来自 `<confirmed_context>`）
- 源码上下文（来自 transform 步骤的源码分析结果，包括按钮名称、表单结构、字段定义、导航路径等 🔵 标注信息。若 transform 阶段完成了 B 级分析，须将关键 UI 结构摘要传给 Writer）
```

替换为：

````markdown
输入包含：

- 增强后 PRD 对应模块内容
- 该模块已确认的测试点清单（**每条必含 `source_ref`**，由 analyze 步骤注入；writer 继承到生成的每条 test_case）
- 合并后规则 JSON（来自 `workspace/{{project}}/.temp/rules-merged.json`）
- 已确认上下文（来自 `<confirmed_context>`）
- 源码上下文（来自 transform 步骤的源码分析结果，包括按钮名称、表单结构、字段定义、导航路径等 🔵 标注信息。若 transform 阶段完成了 B 级分析，须将关键 UI 结构摘要传给 Writer）

> **Phase C 变化**：
>
> 1. 删除了"历史归档用例参考"作为 writer 直接输入——历史只在 analyze 做覆盖分析，不再污染 writer 的上下文
> 2. 每条 test_case 必须继承 test_point.source_ref；reviewer F16 规则会校验锚点可解析
````

- [ ] **Step 3: writer-agent.md 删掉"历史用例参考"输入条目**

Edit `.claude/agents/writer-agent.md`：

定位 `## 输入` 段的第 6 条：

```markdown
6. **历史用例参考**（可选）：若测试点清单中有 `historical_coverage` 引用的归档文件，读取对应文件参考格式和数据模式
```

整条删除（#7 升位为 #6）。

- [ ] **Step 4: writer-agent.md `<inputs>` 块同步更新**

定位顶部：

```markdown
<inputs>
- 增强后的 PRD
- 指定 `writer_id` 的测试点清单
- 偏好规则、用例编写规范、中间格式规范
- 历史用例参考与源码上下文（可选）
</inputs>
```

替换为：

```markdown
<inputs>
- 增强后的 PRD
- 指定 `writer_id` 的测试点清单（每条含 `source_ref`）
- 偏好规则、用例编写规范、中间格式规范
- 源码上下文（可选，来自 transform 🔵 标注；不再含历史用例参考）
</inputs>
```

- [ ] **Step 5: writer-agent.md "硬性规则"后新增 R12 source_ref 继承**

定位：

```markdown
## 硬性规则

完整规则定义参见 `.claude/references/test-case-standards.md`，以下为规则 ID 索引：

- **R01/FC01**: 用例标题契约（Contract A：title=验证xxx，priority 独立）
```

在该索引列表末尾（保留原有 R01~R11 顺序）追加一条：

```markdown
- **R12/F16**: source_ref 继承与可解析性（Phase C 新增）——每条 test_case 必须带 `source_ref` 字段，值直接继承自对应 test_point.source_ref；主 agent 在 review 节点会用 `kata-cli source-ref resolve` 批量校验
```

- [ ] **Step 6: writer-agent.md 在 Contract A 示例里补 source_ref**

定位成功示例的第一条 test_case：

```json
"test_cases": [
  {
    "title": "验证填写完整表单后成功新增记录",
    "priority": "P0",
    "preconditions": "当前账号具有「{{module_name}}」新增权限\n已存在可选的分类「示例分类A」",
    "steps": [
```

在 `priority` 之后插入 `source_ref`：

```json
"test_cases": [
  {
    "title": "验证填写完整表单后成功新增记录",
    "priority": "P0",
    "source_ref": "plan#q3-新增流程",
    "preconditions": "当前账号具有「{{module_name}}」新增权限\n已存在可选的分类「示例分类A」",
    "steps": [
```

对成功示例第二条 `"title": "验证名称字段超过最大长度时提示错误"` 也同样插入 `source_ref`（示例值：`"source_ref": "plan#q5-名称字段校验"`）。

- [ ] **Step 7: writer-agent.md 阻断自检清单补一条 source_ref**

定位 `## 硬性规则` 之后、阻断判据之前的自检清单（若不存在则跳过）。在阻断自检 `- 存在 blocking_unknown / invalid_input → 仅输出 <blocked_envelope>` 上方追加一条：

```markdown
- 每条 test_case 必含 `source_ref` 字段，且值直接继承自对应 test_point.source_ref；若 test_point 未提供 → 按 `blocking_unknown` 阻断，不可自造锚点
```

- [ ] **Step 8: 验证**

```bash
grep -n "历史用例\|historical_coverage" .claude/agents/writer-agent.md
# Expected: 0-1 行（仅 analyze-agent 相关引用说明可保留）

grep -n "source_ref" .claude/agents/writer-agent.md
# Expected: ≥ 4 行命中（inputs / 硬性规则 / 2 处示例）

grep -n "7\\.0\\|source_ref" .claude/skills/test-case-gen/workflow/07-write.md
# Expected: 两类关键字都至少 1 行
```

- [ ] **Step 9: 提交**

```bash
git add .claude/skills/test-case-gen/workflow/07-write.md .claude/agents/writer-agent.md
git commit -m "refactor(write): add 7.0 gate, drop historical cases input, enforce source_ref inheritance

- 07-write.md 新增 7.0 discuss-validate 门禁（同 4.0）
- 7.1 输入清单删除'历史归档用例参考'；明确 source_ref 从 test_point 继承
- writer-agent.md <inputs> 同步删除历史用例；新增 R12/F16 硬性规则条目
- Contract A 示例 test_case 加 source_ref 字段；阻断自检加一条 source_ref 必填"
```

---

## Task 7: workflow/main.md — Writer 阻断中转协议回射到 discuss

**Files:**
- Modify: `.claude/skills/test-case-gen/workflow/main.md`

**Why now:** Writer 的 `<blocked_envelope>` 过去是"主 agent 现场 AskUserQuestion"；Phase C 要沉淀回 plan.md，让同类需求下次讨论就能提前识别。

- [ ] **Step 1: 重写 "Writer 阻断中转协议" 段**

Edit `.claude/skills/test-case-gen/workflow/main.md`：

定位 `### Writer 阻断中转协议` 的整段（从 `### Writer 阻断中转协议` 到 `### 断点续传说明` 之前）。整体替换为：

````markdown
### Writer 阻断中转协议（Phase C：回射到 discuss）

当 Writer Sub-Agent 返回 `<blocked_envelope>` 时，表示需求信息不足以继续编写，或输入无效。

**核心变更**：Phase C 起不再"现场 AskUserQuestion"，而是把阻断条目回射到 discuss 节点沉淀为 plan.md §3 的持久记录。目的是让同类需求在下一次讨论阶段就能提前识别漏掉的维度。

#### 处理流程

1. **解析 envelope**：从 `<blocked_envelope>` 提取 `items[]`

2. **分流 invalid_input**：
   - 若 `status = "invalid_input"` → 停止该模块并要求修正输入（PRD / 测试点 / writer_id 本身损坏），不走本协议剩余步骤

3. **逐条回射到 discuss append-clarify**（仅 `status = "needs_confirmation"` 的分支）：

   每个 item 映射为：

   ```json
   {
     "id": "{{item.id}}",
     "severity": "blocking_unknown",
     "question": "{{item.question}}",
     "location": "writer-回射：{{item.location}}（writer_id={{writer_id}}）",
     "recommended_option": "{{item.recommended_option}}",
     "options": "{{item.options}}",
     "context": {
       "writer_id": "{{writer_id}}",
       "type": "{{item.type}}",
       "source": "{{item.context}}"
     }
   }
   ```

   调 CLI 逐条落盘：

   ```bash
   kata-cli discuss append-clarify \
     --project {{project}} --prd {{prd_path}} \
     --content '<json 上表>'
   ```

   注意：`kata-cli discuss append-clarify` 会自动把 plan.md.status 从 `ready` 重置为 `discussing`，`resume_anchor` 会被顺带清零——这正是 Phase C 期望的行为（写作已中断，需要重走 discuss 闭环）。

4. **回到 discuss 3.6 → 3.8 → 3.9**：主 agent 按 `workflow/03-discuss.md` 3.6 节逐条 AskUserQuestion（仍是 3 选项格式），用户回答后再次自审（3.8）+ complete（3.9）。

5. **重入 writer**：discuss complete 成功返回 `status=ready` 后，主 agent 回到节点 7 write 派发该模块 Writer。重派前构建 `<confirmed_context>`：

   ```xml
   <confirmed_context>
   {
     "writer_id": "{{writer_id}}",
     "items": [
       {
         "id": "B1",
         "resolution": "plan_answered",
         "plan_ref": "plan#q{{new_q_id}}-{{slug}}",
         "value": "{{plan §3 的 user_answer 字段}}"
       }
     ]
   }
   </confirmed_context>
   ```

   - 所有 item 的 `resolution` 固定为 `"plan_answered"`（不再区分 `user_selected` / `auto_defaulted`，因为值都来自 plan.md）
   - `plan_ref` 必填，指向 discuss 回射后的新 Q 条目

6. **Writer 必须优先采纳 plan_answered**：writer-agent 的 `<confirmed_context>` 优先级规则不变；但主 agent 不得再以"auto_defaulted"重注入回射条目——Phase C 要求全部沉淀到 plan.md。
````

- [ ] **Step 2: writer-agent.md 顶部注入 confirmed_context 解释同步微调**

Edit `.claude/agents/writer-agent.md`：

定位 `<confirmation_policy>` 段（若存在）：

```markdown
<confirmation_policy>
<rule>Writer 不直接向用户提问；如任务提示中包含 `<confirmed_context>`，必须直接采纳。</rule>
<rule>`defaultable_unknown` 可按推荐默认继续并记录推断依据；只有 `blocking_unknown` / `invalid_input` 才输出 `<blocked_envelope>` 交回主 agent。</rule>
</confirmation_policy>
```

在末尾追加一条 rule：

```markdown
<rule>Phase C：`<confirmed_context>` 中 `resolution=plan_answered` 的条目带有 `plan_ref`，必须把 plan_ref 作为该用例 `source_ref` 字段的值（优于从 test_point 继承）。</rule>
```

- [ ] **Step 3: 验证**

```bash
grep -n "plan_answered\|回射" .claude/skills/test-case-gen/workflow/main.md
# Expected: ≥ 3 行命中

grep -n "AskUserQuestion" .claude/skills/test-case-gen/workflow/main.md
# Expected: 0（现场 AskUserQuestion 全部迁移到 discuss 节点）
```

> 如果出现 AskUserQuestion 行，说明 diff 漏删了旧协议。

- [ ] **Step 4: 提交**

```bash
git add .claude/skills/test-case-gen/workflow/main.md .claude/agents/writer-agent.md
git commit -m "refactor(main): rewrite Writer blocked-envelope protocol to re-emit into discuss

- Writer 阻断不再现场 AskUserQuestion；每个 item → kata-cli discuss append-clarify
- plan.md.status 自动回退到 discussing；用户走 3.6/3.8/3.9 闭环后重入 writer
- confirmed_context resolution 统一为 plan_answered + plan_ref 锚点
- writer-agent.md 新增 rule：plan_ref 作为 source_ref 值，优先级高于 test_point 继承"
```

---

## Task 8: 08-review.md + reviewer-agent.md + test-case-standards.md — F16 source_ref 存在性

**Files:**
- Modify: `.claude/skills/test-case-gen/workflow/08-review.md`
- Modify: `.claude/agents/reviewer-agent.md`
- Modify: `.claude/references/test-case-standards.md`

**Why now:** reviewer 是 source_ref 链路的终点；F16 的规则文本 + 批处理执行协议在此节点落地后，整个 Phase C 硬约束就形成闭环。

- [ ] **Step 1: test-case-standards.md 在 F15 之后追加 F16 规则**

Edit `.claude/references/test-case-standards.md`：

定位第 220 行附近：

```markdown
### F15: 前置条件多步操作闭合

- 多步表单须描述每步完整配置直至保存
- **无法自动修正** → 标记 `[F15-MANUAL]`

### 跨模块去重
```

在 `### 跨模块去重` 之前插入：

````markdown
### F16: source_ref 锚点可解析性（Phase C 新增）

- 每条 test_case 必带 `source_ref` 字段；缺失即 F16 命中
- 调 `kata-cli source-ref resolve --ref <source_ref> --plan <plan.md> --prd <prd path> --project <proj>`；退出码 0 视为通过，1 视为不可解析
- **不可自动修正**：锚点是事实性引用，错误锚点需回退到源头（analyze / writer / discuss）；reviewer 标 `[F16-MANUAL]` 并把不可解析原因写到 issues[].description
- **严重度**：`pass_with_warnings`；单条 F16 不阻断整个 review，但进入问题率计算
````

- [ ] **Step 2: test-case-standards.md 更新"第六：质量门禁"的计算范围**

定位：

```markdown
问题率 = 含任意 F07-F15 问题的用例数 / 总用例数 × 100%
```

替换为：

```markdown
问题率 = 含任意 F07-F16 问题的用例数 / 总用例数 × 100%
```

再定位"第七：规则分类索引"：

```markdown
### 审查修正规则

F07(正向合并), F08(逆向拆分), F09(表单合并), F10(前置条件SQL), F11(表单换行), F12(编号换行), F13(模糊兜底), F14(笼统概括), F15(多步闭合)

### 可自动修正

F07, F08, F09, F11, F12, F13（模糊兜底部分）

### 需人工处理
```

追加：

```markdown
### 审查修正规则

F07(正向合并), F08(逆向拆分), F09(表单合并), F10(前置条件SQL), F11(表单换行), F12(编号换行), F13(模糊兜底), F14(笼统概括), F15(多步闭合), F16(source_ref 可解析性)

### 可自动修正

F07, F08, F09, F11, F12, F13（模糊兜底部分）

### 需人工处理

F10, F13(选言备选), F14, F15, F16
```

（若文件已有 `### 需人工处理` 小节并列了前几条，原地追加 `F16`）

- [ ] **Step 3: reviewer-agent.md 规则索引 + 审查流程加 F16**

Edit `.claude/agents/reviewer-agent.md`：

定位审查规则索引行：

```markdown
规则索引：F07(正向合并), F08(逆向单一), F09(表单合并), F10(前置条件SQL), F11(表单换行), F12(多项编号), F13(预期模糊兜底 / 选言备选), F14(前置条件笼统), F15(多步闭合)
```

替换为：

```markdown
规则索引：F07(正向合并), F08(逆向单一), F09(表单合并), F10(前置条件SQL), F11(表单换行), F12(多项编号), F13(预期模糊兜底 / 选言备选), F14(前置条件笼统), F15(多步闭合), F16(source_ref 可解析性)
```

同段"**可自动修正**"/"**需人工标记**"两行同步扩：

```markdown
**可自动修正**：F07, F08, F09, F11, F12, F13（模糊兜底部分） → 调用 `auto-fixer.ts` 执行确定性修正
**需人工标记**：F10(`[F10-MANUAL]`), F13(选言备选需拆分两条用例时标 `[F13-MANUAL]`), F14(`[F14-MANUAL]`), F15(`[F15-MANUAL]`), F16(`[F16-MANUAL]`)
```

- [ ] **Step 4: reviewer-agent.md 审查流程新增 F16 批处理步骤**

定位 `### 第一轮：逐条审查` 之前，在 `## 审查流程` 段下新增子段：

````markdown
### 第零轮：source_ref 批量解析（Phase C 新增）

先把待审查的 writer_json 里所有 `test_case` 的 `source_ref` 聚合成一个数组，写到临时 JSON 文件，然后调 CLI 批量解析：

```bash
cat > /tmp/refs-$$.json <<EOF
[
  {"ref": "<test_case_1.source_ref>"},
  {"ref": "<test_case_2.source_ref>"},
  ...
]
EOF

kata-cli source-ref batch \
  --refs-json /tmp/refs-$$.json \
  --plan {{plan_path}} --prd {{prd_path}} \
  --project {{project}}
```

批量 CLI 的退出码：

- `0` → 全部可解析，第一轮不产出 F16
- `2` → 至少一条不可解析；读 stdout JSON 的 `fails[]` 数组，把每条 `{ref, reason}` 映射到对应 `test_case` 的 `issues[]`：
  ```json
  {
    "code": "F16",
    "description": "source_ref 不可解析: {{reason}}",
    "severity": "manual",
    "original": "{{source_ref}}",
    "fixed": null
  }
  ```
- `1` → CLI 本身异常（参数错误等），停止审查并返回 `invalid_input` verdict

F16 计入问题率，但**不触发自动修正**；标记为 `[F16-MANUAL]` 在 manual_items 输出。
````

- [ ] **Step 5: 08-review.md 新增 8.2 source_ref 校验**

Edit `.claude/skills/test-case-gen/workflow/08-review.md`：

在 `### 8.1 质量审查（AI 任务）` 之后、`### 8.2 合并产出` 之前（现有 8.2 会被顺延为 8.3）插入：

````markdown
### 8.2 source_ref 锚点校验（Phase C 新增）

reviewer-agent 在第零轮审查中批量调：

```bash
kata-cli source-ref batch --refs-json /tmp/refs-*.json \
  --plan {{plan_path}} --prd {{prd_path}} --project {{project}}
```

批量结果按 F16 规则计入 issues。主 agent 不必在 skill 层重复调用——审查输出 JSON 中的 `issues[].code="F16"` 已承担结果汇聚职责。
````

将原 `### 8.2 合并产出` 改为 `### 8.3 合并产出`，原 `### 8.3 更新状态` 改为 `### 8.4 更新状态`。

- [ ] **Step 6: 08-review.md 质量阈值表加 F16 说明**

定位：

```markdown
| 问题率    | 行为                           |
| --------- | ------------------------------ |
| < 15%     | 静默修正                       |
| 15% - 40% | 自动修正 + 质量警告            |
| > 40%     | 阻断，输出问题报告，等用户决策 |

问题率 = 含问题用例数 / 总用例数。
```

替换为：

```markdown
| 问题率    | 行为                           |
| --------- | ------------------------------ |
| < 15%     | 静默修正                       |
| 15% - 40% | 自动修正 + 质量警告            |
| > 40%     | 阻断，输出问题报告，等用户决策 |

问题率 = 含问题用例数 / 总用例数（F07-F16 任一命中即计为一条问题用例；F16 只在 MANUAL 分支，不自动修正）。
```

- [ ] **Step 7: 验证**

```bash
grep -n "F16" .claude/references/test-case-standards.md .claude/agents/reviewer-agent.md .claude/skills/test-case-gen/workflow/08-review.md
# Expected: 每个文件 ≥ 2 行命中

grep -c "^### 8\\." .claude/skills/test-case-gen/workflow/08-review.md
# Expected: 4（8.1 / 8.2 / 8.3 / 8.4）
```

- [ ] **Step 8: 提交**

```bash
git add .claude/references/test-case-standards.md .claude/agents/reviewer-agent.md .claude/skills/test-case-gen/workflow/08-review.md
git commit -m "feat(review): add F16 source_ref anchor resolvability rule + reviewer batch flow

- test-case-standards.md 新增 F16 规则定义；问题率口径扩至 F07-F16
- reviewer-agent.md 规则索引 + 第零轮批处理流程调用 kata-cli source-ref batch
- 08-review.md 新增 8.2 source_ref 校验，原 8.2/8.3 顺延；质量阈值说明同步更新"
```

---

## Task 9: rules/prd-discussion.md — Phase B/C 衔接说明收尾

**Files:**
- Modify: `rules/prd-discussion.md`

**Why now:** Phase B rules 里写的是"Phase C 启用下游门禁会拦截"（未来时）；Phase C 上线后应改为"下游已 enforce"（现在时）。

- [ ] **Step 1: 更新重启检测段**

Edit `rules/prd-discussion.md`：

定位：

```markdown
## 重启检测

- init 节点必须先调 `discuss read` 检查 plan 状态：
  - `不存在` 或 `status=obsolete` → 进入 discuss 节点 init 模式
  - `status=discussing` → 进入 discuss 节点恢复模式（从未答 Q\* / 未回填 pending 续问）
  - `status=ready` → 跳过 discuss 节点，直接进入 transform（Phase C 启用下游门禁后，再跑一次 `discuss validate --require-zero-blocking --require-zero-pending`）
```

替换最后一条（把括号里的未来时改成现在时）：

```markdown
  - `status=ready` → 跳过 discuss 节点，直接进入 transform；transform / analyze / write 入口均已 enforce `discuss validate --require-zero-blocking --require-zero-pending`（见各节点 4.0 / 6.0 / 7.0）
```

- [ ] **Step 2: 更新交接模式段**

定位：

```markdown
## 交接模式

- `discuss complete` 必须带 `--handoff-mode current|new`：
  - `current`：主 agent 在当前会话继续进入 transform
  - `new`：输出交接 prompt，结束当前会话，由用户新开会话接力
- pending_count > 0 时，主 agent 在 AskUserQuestion 中应标红警告（Phase C 启用下游门禁会拦截）
```

替换最后一条：

```markdown
- pending_count > 0 时，主 agent 在 AskUserQuestion 中应标红警告：Phase C 下游门禁已 enforce，带 pending 的 plan 进入 transform 会被 4.0 直接拦截
```

- [ ] **Step 3: 更新"clarify_envelope 协议已弃用"段**

定位：

```markdown
- 所有澄清都通过 plan.md §3 持久化；Writer 阻断回射到 discuss append-clarify（Phase C 实施）
```

替换为：

```markdown
- 所有澄清都通过 plan.md §3 持久化；Writer 阻断回射到 `discuss append-clarify`（见 `.claude/skills/test-case-gen/workflow/main.md` 共享协议段）
```

- [ ] **Step 4: 验证**

```bash
grep -n "Phase C 启用\|Phase C 实施\|Phase C 才" rules/prd-discussion.md
# Expected: 0（所有"未来时"表达都应改为现在时）
```

- [ ] **Step 5: 提交**

```bash
git add rules/prd-discussion.md
git commit -m "docs(rules): update Phase C wording from 'will enforce' to 'already enforced'

- 重启检测：status=ready 分支显式提及 4.0/6.0/7.0 入口门禁
- 交接模式：pending_count > 0 警告口径同步更新
- clarify_envelope：Writer 阻断回射表述改为现在时"
```

---

## Task 10: 回归 + 端到端冒烟 + tag

**Files:**
- 读取（不修改）：全仓 skills / agents / scripts
- Create：`/tmp/phase-c-smoke/*`（测试临时文件，最后清理）

**Why last:** 所有 Phase C 改动落盘后，必须做一次 --quick 端到端回归，确认真正拦得住 pending，并且 source_ref 确实从 analyze 到 reviewer 一路传递。

- [ ] **Step 1: 全量单元测试**

```bash
cd /Users/poco/Projects/kata
bun test ./.claude/scripts/__tests__ 2>&1 | tail -12
```

Expected: 全绿；单测数 ≥ 820（Phase B 基线）+ 18（Task 1 新增）+ 3（Task 1 CLI 集成）= 841。差 ±3 以内且无 fail 即合格。

若挂：

- 新增测试失败 → 读 stderr 定位 Task 1 实现；补代码直到绿
- 旧测试挂 → `grep -rn "from .*source-ref\|from .*output-schemas"` 找到被波及的旧脚本；若 schema 文本变更影响了快照断言，更新快照

- [ ] **Step 2: discuss CLI 门禁冒烟（与 Phase B 基线相同）**

```bash
TMP=$(mktemp -d)
WORKSPACE_DIR=$TMP/ws
mkdir -p $WORKSPACE_DIR/phase-c-smoke/prds/202604
cat > $WORKSPACE_DIR/phase-c-smoke/prds/202604/smoke.md <<'PRD'
---
requirement_id: 88888
requirement_name: Phase C 冒烟
---
# Phase C 冒烟需求
仅用于验证 Phase C 下游门禁链路。
## 2.1 审批流程
字段：审批状态 / 备注
PRD

export WORKSPACE_DIR

# Phase B 路径跑通
kata-cli discuss init --project phase-c-smoke --prd $WORKSPACE_DIR/phase-c-smoke/prds/202604/smoke.md
kata-cli discuss append-clarify --project phase-c-smoke --prd $WORKSPACE_DIR/phase-c-smoke/prds/202604/smoke.md \
  --content '{"id":"Q1","severity":"pending_for_pm","question":"Kafka?","location":"全局层 → 数据源","recommended_option":"否","options":[]}'

# Phase C 门禁断言：带 pending 的 plan 必须被挡
set +e
kata-cli discuss validate --project phase-c-smoke --prd $WORKSPACE_DIR/phase-c-smoke/prds/202604/smoke.md \
  --require-zero-blocking --require-zero-pending
GATE_EXIT=$?
set -e
echo "gate exit = $GATE_EXIT"
[ "$GATE_EXIT" = "3" ] || { echo "FAIL: expect exit 3 when pending > 0"; exit 1; }

# 用户回写 pending → 转 blocking+answer
kata-cli discuss append-clarify --project phase-c-smoke --prd $WORKSPACE_DIR/phase-c-smoke/prds/202604/smoke.md \
  --content '{"id":"Q1","severity":"blocking_unknown","question":"Kafka?","location":"全局层 → 数据源","user_answer":"否"}'

# 现在门禁应放行
kata-cli discuss validate --project phase-c-smoke --prd $WORKSPACE_DIR/phase-c-smoke/prds/202604/smoke.md \
  --require-zero-blocking --require-zero-pending
echo "gate ok"

kata-cli discuss complete --project phase-c-smoke --prd $WORKSPACE_DIR/phase-c-smoke/prds/202604/smoke.md --handoff-mode current

rm -rf $TMP
```

Expected: 最后打印 `gate ok`，整个脚本 exit 0。

- [ ] **Step 3: source-ref CLI 冒烟**

```bash
TMP=$(mktemp -d)
PLAN=$TMP/smoke.plan.md
cat > $PLAN <<'PLAN'
---
plan_version: 2
status: ready
---

## 3. 澄清问答清单

```json
[{"id":"Q1","severity":"blocking_unknown","question":"审批?","location":"功能层 → 字段定义 → 审批状态"}]
```
PLAN

# Happy path
kata-cli source-ref resolve --ref 'plan#q1-审批状态' --plan $PLAN
echo "resolve ok: $?"

# Fail path (exit 1)
set +e
kata-cli source-ref resolve --ref 'plan#q99-none' --plan $PLAN
RC=$?
set -e
[ "$RC" = "1" ] || { echo "FAIL: expect exit 1 when q-id missing"; exit 1; }
echo "fail path ok"

# Batch fail path (exit 2)
REFS=$TMP/refs.json
echo '[{"ref":"plan#q1-x"},{"ref":"plan#q99-x"}]' > $REFS
set +e
kata-cli source-ref batch --refs-json $REFS --plan $PLAN
RC=$?
set -e
[ "$RC" = "2" ] || { echo "FAIL: expect exit 2 on batch with any fail"; exit 1; }
echo "batch ok"

rm -rf $TMP
```

Expected: 三段命令全 OK，脚本 exit 0。

- [ ] **Step 4: 检查 04-transform.md 没有残留 Phase B 横幅**

```bash
grep -n "Phase B 临时横幅\|Phase B 横幅" .claude/skills/test-case-gen/workflow/04-transform.md
# Expected: 0 lines
```

- [ ] **Step 5: 检查下游 5 节点都有门禁调用**

```bash
grep -cE "kata-cli discuss validate.*require-zero-blocking.*require-zero-pending" \
  .claude/skills/test-case-gen/workflow/04-transform.md \
  .claude/skills/test-case-gen/workflow/06-analyze.md \
  .claude/skills/test-case-gen/workflow/07-write.md
# Expected: 4-transform / 6-analyze / 7-write 每个文件至少 1 行命中
```

- [ ] **Step 6: 检查 F16 / source_ref 在 review 侧可见**

```bash
grep -c "F16\|source_ref\|source-ref" \
  .claude/agents/reviewer-agent.md \
  .claude/skills/test-case-gen/workflow/08-review.md \
  .claude/references/test-case-standards.md
# Expected: 每文件 ≥ 2 命中
```

- [ ] **Step 7: 检查 writer / analyze 输出面要求 source_ref**

```bash
grep -c "source_ref" \
  .claude/agents/writer-agent.md \
  .claude/agents/analyze-agent.md \
  .claude/references/output-schemas.json
# Expected: 每文件 ≥ 1，output-schemas.json ≥ 2（test_points_json + writer_json）
```

- [ ] **Step 8: 打 Phase C 完成 tag**

```bash
git tag -a phase-c-downstream-gate-done -m "Phase C — 下游门禁 + source_ref 硬约束完成"
git tag -l phase-c-downstream-gate-done
```

- [ ] **Step 9: （可选）推送到 origin**

```bash
git log origin/main..HEAD --oneline
```

让用户决策是否要 `git push origin main --follow-tags`（主动推送属于 blast-radius 较大动作，按项目规范需要人工确认）。

---

## Self-Review

**1. Spec coverage（对照 design 文档 Part 1.4 + Part 5 Phase C）：**

| Spec 要求 | Task 落点 |
|---|---|
| 4 transform 启动前调 `discuss validate --require-zero-*` | Task 3 Step 2（4.0） |
| 4 transform 原 4.2 源码许可降级为"写回确认" | Task 3 Step 3 |
| 4 transform task prompt 注入 plan.md §1 / §6 | Task 3 Step 5 |
| 5 enhance 移除需求歧义标注职责 | Task 4 Step 1-3 |
| 6 analyze 启动前调 `discuss validate` | Task 5 Step 1（6.0） |
| 6 analyze 历史检索保留作"补齐参考" | Task 5 Step 2（明确不再作 writer 输入） |
| 6 analyze 生成的测试点强制 `source_ref` | Task 5 Step 3 + Task 2 Step 1 |
| 7 write 启动前调 `discuss validate` | Task 6 Step 1（7.0） |
| 7 writer-context-builder 不再传历史用例 | Task 6 Step 2-4（现有 context-builder 本就不传历史，此处为 doc/prompt 断言） |
| 7 每条用例强制继承 `source_ref` | Task 6 Step 5-7 + Task 2 Step 2 |
| 7 Writer `<blocked_envelope>` 回射到 discuss | Task 7 Step 1-2 |
| 8 review 新增 source_ref 存在性校验 | Task 8 Step 1-5（F16 + 第零轮 + 8.2） |
| `references/source-refs-schema.md` 已规范（Phase B） + CLI 可解析 | Task 1 全套 |
| 04-transform.md 删除 Phase B 临时横幅 | Task 3 Step 1 |
| Phase B 风险窗口弥合 | Task 10 Step 2 冒烟验证 pending 被拦 |

**2. Placeholder scan：**

- 无 `TBD` / `TODO` / `implement later` / `"Similar to Task N"`
- 每一步含可执行命令或完整代码块
- Step 间无未定义的函数 / 字段（`parseSourceRef`、`resolveSourceRef`、`ResolveContext`、`F16`、`plan_answered`、`plan_ref` 全部在较早 Task 里定义）

**3. Type consistency：**

- `ResolveContext` 字段命名（`planPath` / `prdPath` / `workspaceDir` / `projectName` / `repos`）在 Task 1 lib / CLI / 测试全部一致
- `ParsedSourceRef.scheme` 固定为 `"plan" | "prd" | "knowledge" | "repo"`，未出现缩写或别名
- `F16` 规则 ID 在 test-case-standards / reviewer-agent / 08-review / output-schemas 四处一致
- `source_ref` 字段名在 schema / analyze-agent / writer-agent / reviewer-agent 全部小写下划线
- `--require-zero-blocking` / `--require-zero-pending` 拼写在 4.0 / 6.0 / 7.0 / 冒烟脚本一致
- Writer `<confirmed_context>` 新增的 `resolution=plan_answered` + `plan_ref` 在 Task 7 定义，在 writer-agent.md 硬性规则条目引用

**已知开放项：**

- Task 8 的 reviewer 第零轮批处理依赖 bash 临时文件；若 reviewer-agent 所在的 subagent 沙箱限制 tmp 写入，可能需要改为 stdin 管道（`echo '[...]' | kata-cli source-ref batch --refs-json -`）——Phase C 目前按 tmp 文件路径，若遇阻，后续 hotfix 补 `-` 输入支持即可
- Task 5 的 analyze-agent 要求每条 test_point 都产出 `source_ref`；--quick 模式下历史检索跳过、plan §3 可能也为空，此时优先级回退到 `prd#<section-slug>`——示例已覆盖，但 few-shot 密度不高，可在 Phase C 上线后看 bug 率决定是否补样例
- Task 6 的 writer-agent.md 阻断自检清单更改点在注释中描述 "若存在则跳过"，因源文件当前位置需实际 edit 时再确认；若发现不存在这段自检清单，请在 Task 6 Step 7 改为"新增自检清单章节"

---

## Execution Handoff

Plan 保存至 `docs/refactor/specs/2026-04-24-phase-c-downstream-gate-plan.md`。

**两种执行方式**：

**1. Subagent-Driven（推荐）** — 每个 task 派一个新的 subagent 执行，主 agent 在 task 之间做两阶段 review（spec review + code quality review）。上下文干净、可回滚。与 Phase A/B 相同。

**2. Inline Execution** — 在当前会话中按 task 顺序执行，带 checkpoint 让用户审阅。

---

## 后续计划

Phase C 落地后，Phase D（可选）的候选命题：

- `kata-cli discuss migrate --from-clarify-envelope` — 批量把老 PRD 里遗留的 `<clarify_envelope>` 转为 plan.md §3（清 clarify-protocol.md 的历史兼容层）
- transform-agent 的 prompt 减脂 — `references/prd-template.md` 拆分为每章节独立文件，transform-agent 按 plan §1 子节动态加载
- reviewer 的 F16 诊断 message 本地化 — 把锚点解析失败原因翻译为"建议用户在 analyze 重跑 + 填 plan#q<n>"之类的可执行建议

以上为候选，是否开 Phase D 视 Phase C 上线后 2-4 周的稳定性指标决定。
