# Phase B — discuss 节点增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `test-case-gen/workflow/03-discuss.md` 从 6 维度自检 / 4 选项提问 / 无自审 升级为 10 维度 / 3 选项 / 带自审门禁的需求讨论闭环，并在 `kata-cli discuss` CLI 层落地 `pending_for_pm` severity、`validate` 子命令、`--handoff-mode` 交接模式与 `set-repo-consent`，为 Phase C 下游门禁铺底。

**Architecture:** 纯增量扩展。`lib/discuss.ts` 内先扩 frontmatter schema（pending_count / handoff_mode / repo_consent）与 severity 枚举（+pending_for_pm），再扩 CLI 子命令（4 变更 + 2 新增）。所有改动 TDD 覆盖，保持 18 条现有集成测试为绿基线。workflow / rules / references 文档在 CLI 稳态后一次性重写。**本 phase 不改任何下游节点（04-transform 起），下游门禁归 Phase C。**

**Tech Stack:** bun / TypeScript / commander（kata-cli）/ node:test

**Spec reference:** `docs/refactor/specs/2026-04-24-discuss-enhancement-and-skills-refactor-design.md` Part 1 + Part 5 Phase B 段

**Phase A baseline:** tag `phase-a-skills-refactor-done`（778 单测全绿），已拆分 `workflow/01-init.md ... 10-output.md`

---

## File Structure

变更涉及的文件全貌（路径已按 Phase A 拆分后的新编号）：

**纯函数层**
- Modify: `.claude/scripts/lib/discuss.ts` — schema 扩展（pending_count / handoff_mode / repo_consent）、severity 扩 pending_for_pm、renderPlan §1 4 子节 / §6 pending 列表 / §2 10 维度表 / §7 编号顺延、新增 `validatePending` / `applyHandoffMode` / `setRepoConsentInPlan` 纯函数

**CLI 层**
- Modify: `.claude/scripts/discuss.ts` — append-clarify 放开 pending_for_pm、complete 新增 `--handoff-mode`、新增 `validate`、新增 `set-repo-consent`

**测试层**
- Modify: `.claude/scripts/__tests__/discuss.test.ts` — 新增 4 个 describe 块（pending / handoff / validate / repo-consent），现有 18 测试保持不动

**Skills 与 Rules**
- Create: `.claude/skills/test-case-gen/references/10-dimensions-checklist.md`
- Create: `.claude/skills/test-case-gen/references/ambiguity-patterns.md`
- Create: `.claude/skills/test-case-gen/references/source-refs-schema.md`
- Rewrite: `rules/prd-discussion.md`
- Rewrite: `.claude/skills/test-case-gen/workflow/03-discuss.md`

**未变动但需确认引用仍对齐**
- `.claude/skills/test-case-gen/references/discuss-protocol.md`（Phase A 拆分保留）— plan 的 Task 7 会顺手检查并增补交叉索引
- `.claude/skills/test-case-gen/workflow/04-transform.md` 4.2/4.3 源码许可段落 — Phase B 不改，但 Task 10 要写一条「临时横幅」提示
- `.claude/skills/test-case-gen/workflow/01-init.md` 1.2 路由表 — Phase B 不改路由行为，仅节点 3 内部升级

---

## Task 1: lib/discuss.ts — frontmatter schema 扩展（pending_count / handoff_mode / repo_consent）

**Files:**
- Modify: `.claude/scripts/lib/discuss.ts`
- Modify: `.claude/scripts/__tests__/discuss.test.ts`（追加 schema 断言）

**Why first:** 所有后续 CLI 扩展都先要有 schema 锚点。本 task 只动 PlanFrontmatter interface、renderFrontmatter、parseFrontmatter、buildInitialPlan、validatePlanSchema；severity 枚举 / §1 / §6 留到 Task 2+。

- [ ] **Step 1: 写 failing test — 初始 plan 的新字段默认值**

在 `.claude/scripts/__tests__/discuss.test.ts` 现有 `describe("discuss read", ...)` 块下方追加：

```typescript
describe("discuss read — phase B schema", () => {
  before(() => resetFixture());
  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("exposes pending_count / handoff_mode / repo_consent defaults after init", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { stdout, code } = runCli(["read", "--project", PROJECT, "--prd", PRD_ABS]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.frontmatter.plan_version, 2);
    assert.equal(data.frontmatter.pending_count, 0);
    assert.equal(data.frontmatter.handoff_mode, null);
    assert.equal(data.frontmatter.repo_consent, null);
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `bun test ./.claude/scripts/__tests__/discuss.test.ts 2>&1 | tail -20`
Expected: 该测试 FAIL（plan_version=1 / 字段不存在）。

- [ ] **Step 3: 修改 lib/discuss.ts — PlanFrontmatter 接口 + PLAN_VERSION**

Edit `.claude/scripts/lib/discuss.ts`:

```diff
-export const PLAN_VERSION = 1;
+export const PLAN_VERSION = 2;
```

```diff
 export type ClarifySeverity =
   | "blocking_unknown"
   | "defaultable_unknown"
+  | "pending_for_pm"
   | "invalid_input";
```

```diff
 export interface KnowledgeDropped {
   type: "term" | "module" | "pitfall" | "overview";
   name: string;
 }
+
+export interface RepoConsentRepo {
+  path: string;
+  branch: string;
+  sha?: string;
+}
+
+export interface RepoConsent {
+  repos: RepoConsentRepo[];
+  granted_at: string;
+}
+
+export type HandoffMode = "current" | "new";
```

```diff
 export interface PlanFrontmatter {
   plan_version: number;
   prd_slug: string;
   prd_path: string;
   project: string;
   requirement_id: string;
   requirement_name: string;
   created_at: string;
   updated_at: string;
   status: PlanStatus;
   discussion_rounds: number;
   clarify_count: number;
   auto_defaulted_count: number;
+  pending_count: number;
   resume_anchor: ResumeAnchor;
   knowledge_dropped: KnowledgeDropped[];
+  handoff_mode: HandoffMode | null;
+  repo_consent: RepoConsent | null;
   strategy?: string;  // inline JSON string
 }
```

- [ ] **Step 4: 修改 lib/discuss.ts — renderFrontmatter 支持新字段**

在 `renderFrontmatter` 函数内，在 `lines.push(`auto_defaulted_count: ${fm.auto_defaulted_count}`);` 之后插入：

```typescript
  lines.push(`pending_count: ${fm.pending_count}`);
```

在 `lines.push(`resume_anchor: ${fm.resume_anchor}`);` 之后插入：

```typescript
  if (fm.handoff_mode === null || fm.handoff_mode === undefined) {
    lines.push(`handoff_mode: null`);
  } else {
    lines.push(`handoff_mode: ${fm.handoff_mode}`);
  }
```

在 `knowledge_dropped` 序列化块之后（`if (fm.strategy !== undefined)` 之前）插入：

```typescript
  if (fm.repo_consent === null || fm.repo_consent === undefined) {
    lines.push("repo_consent: null");
  } else {
    lines.push("repo_consent:");
    lines.push(`  granted_at: ${fm.repo_consent.granted_at}`);
    if (fm.repo_consent.repos.length === 0) {
      lines.push("  repos: []");
    } else {
      lines.push("  repos:");
      for (const r of fm.repo_consent.repos) {
        lines.push(`    - path: ${r.path}`);
        lines.push(`      branch: ${r.branch}`);
        if (r.sha !== undefined) {
          lines.push(`      sha: ${r.sha}`);
        }
      }
    }
  }
```

- [ ] **Step 5: 修改 lib/discuss.ts — parseFrontmatter 识别新字段**

在 `parseFrontmatter` 函数的 `while (i < fmLines.length)` 循环体内，找到 `if (/^knowledge_dropped:\s*\[\s*\]\s*$/.test(trimmed))` 分支，在其下方新增 `repo_consent` 的两种形态解析：

```typescript
    if (/^repo_consent:\s*null\s*$/.test(trimmed)) {
      fm.repo_consent = null;
      i++;
      continue;
    }
    if (/^repo_consent:\s*$/.test(trimmed)) {
      i++;
      let grantedAt = "";
      const repos: RepoConsentRepo[] = [];
      while (i < fmLines.length) {
        const sub = fmLines[i];
        const subTrim = sub.trim();
        if (!subTrim) {
          i++;
          continue;
        }
        const grantedMatch = sub.match(/^\s+granted_at:\s*(.+?)\s*$/);
        if (grantedMatch) {
          grantedAt = grantedMatch[1];
          i++;
          continue;
        }
        if (/^\s+repos:\s*\[\s*\]\s*$/.test(sub)) {
          i++;
          continue;
        }
        if (/^\s+repos:\s*$/.test(sub)) {
          i++;
          while (i < fmLines.length) {
            const rSub = fmLines[i];
            const pathMatch = rSub.match(/^\s+-\s+path:\s*(.+?)\s*$/);
            if (!pathMatch) break;
            const repo: RepoConsentRepo = { path: pathMatch[1], branch: "" };
            i++;
            while (i < fmLines.length) {
              const field = fmLines[i];
              const bm = field.match(/^\s+branch:\s*(.+?)\s*$/);
              const sm = field.match(/^\s+sha:\s*(.+?)\s*$/);
              if (bm) {
                repo.branch = bm[1];
                i++;
              } else if (sm) {
                repo.sha = sm[1];
                i++;
              } else {
                break;
              }
            }
            repos.push(repo);
          }
          continue;
        }
        break;
      }
      fm.repo_consent = { repos, granted_at: grantedAt };
      continue;
    }
```

在 `scalarMatch` 之后的 `switch (key)` 内新增三个 case：

```diff
       case "auto_defaulted_count":
         fm.auto_defaulted_count = Number.parseInt(value, 10);
         break;
+      case "pending_count":
+        fm.pending_count = Number.parseInt(value, 10);
+        break;
+      case "handoff_mode":
+        fm.handoff_mode = value === "null" ? null : (value as HandoffMode);
+        break;
```

- [ ] **Step 6: 修改 lib/discuss.ts — buildInitialPlan 默认值**

```diff
   const fm: PlanFrontmatter = {
     plan_version: PLAN_VERSION,
     prd_slug: input.prdSlug,
     prd_path: input.prdPath,
     project: input.project,
     requirement_id: input.requirementId,
     requirement_name: input.requirementName,
     created_at: iso,
     updated_at: iso,
     status: "discussing",
     discussion_rounds: 0,
     clarify_count: 0,
     auto_defaulted_count: 0,
+    pending_count: 0,
     resume_anchor: "discuss-in-progress",
     knowledge_dropped: [],
+    handoff_mode: null,
+    repo_consent: null,
   };
```

- [ ] **Step 7: 修改 lib/discuss.ts — parsePlan 默认值兜底**

在 `parsePlan` 函数内，`if (!fm.knowledge_dropped) fm.knowledge_dropped = [];` 下方加：

```typescript
  if (fm.pending_count === undefined) fm.pending_count = 0;
  if (fm.handoff_mode === undefined) fm.handoff_mode = null;
  if (fm.repo_consent === undefined) fm.repo_consent = null;
```

- [ ] **Step 8: 修改 lib/discuss.ts — validatePlanSchema 补充 required**

```diff
   const required: Array<keyof PlanFrontmatter> = [
     "plan_version",
     "prd_slug",
     "prd_path",
     "project",
     "requirement_id",
     "requirement_name",
     "created_at",
     "updated_at",
     "status",
     "discussion_rounds",
     "clarify_count",
     "auto_defaulted_count",
+    "pending_count",
     "resume_anchor",
   ];
```

`handoff_mode` / `repo_consent` 允许为 `null`，不纳入 required；但需要类型校验：

```typescript
  if (
    fm.handoff_mode !== undefined &&
    fm.handoff_mode !== null &&
    !["current", "new"].includes(fm.handoff_mode)
  ) {
    errors.push(`invalid handoff_mode: ${fm.handoff_mode}`);
  }
```

放在 `invalid resume_anchor` 校验块之后。

- [ ] **Step 9: 运行验证通过**

Run: `bun test ./.claude/scripts/__tests__/discuss.test.ts 2>&1 | tail -20`
Expected: 19 tests pass（原 18 + 新增 1）。

若失败，按失败信息定位：最可能是 `renderFrontmatter` 字段顺序或 `parseFrontmatter` 分支遗漏 → 对照 Step 4/5 修正。

- [ ] **Step 10: 提交**

```bash
cd /Users/poco/Projects/kata
git add .claude/scripts/lib/discuss.ts .claude/scripts/__tests__/discuss.test.ts
git commit -m "feat(discuss): extend plan.md frontmatter with pending_count / handoff_mode / repo_consent

- bump PLAN_VERSION 1 -> 2
- add ClarifySeverity.pending_for_pm to enum (rendering in later task)
- renderFrontmatter / parseFrontmatter round-trip the three new fields
- buildInitialPlan defaults: pending_count=0, handoff_mode=null, repo_consent=null
- validatePlanSchema enforces pending_count; handoff_mode guard"
```

---

## Task 2: lib/discuss.ts — §1 4 子节 + §6 pending 列表 + §2 10 维度统计

**Files:**
- Modify: `.claude/scripts/lib/discuss.ts`（renderPlan / renderSelfCheckTable + 新增 renderPendingList）
- Modify: `.claude/scripts/__tests__/discuss.test.ts`（断言新章节存在）

**Why second:** Task 1 已定好 schema，§6 / §2 模板依赖 pending_for_pm 与 pending_count。本 task 只改 rendering，不碰 CLI 入口。

- [ ] **Step 1: 写 failing tests — §1 4 子节 / §6 占位 / §2 两层表**

在 `.claude/scripts/__tests__/discuss.test.ts` 文件末尾追加：

```typescript
describe("discuss init — phase B template shape", () => {
  before(() => resetFixture());
  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("renders §1 summary with 4 subsections", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const raw = readFileSync(PLAN_ABS, "utf8");
    assert.match(raw, /### 背景/);
    assert.match(raw, /### 痛点/);
    assert.match(raw, /### 目标/);
    assert.match(raw, /### 成功标准/);
  });

  it("renders §2 self-check table with global and functional layers", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const raw = readFileSync(PLAN_ABS, "utf8");
    assert.match(raw, /### 全局层（4 维度）/);
    assert.match(raw, /### 功能层（6 维度）/);
    // 全局层维度
    assert.match(raw, /\| 数据源 \|/);
    assert.match(raw, /\| 历史数据 \|/);
    assert.match(raw, /\| 测试范围 \|/);
    assert.match(raw, /\| PRD 合理性 \|/);
    // 功能层维度保留
    assert.match(raw, /\| 字段定义 \|/);
    assert.match(raw, /\| 异常处理 \|/);
  });

  it("renders §6 pending placeholder and §7 downstream hints", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const raw = readFileSync(PLAN_ABS, "utf8");
    assert.match(raw, /## 6\. 待定清单（pending_for_pm）/);
    assert.match(raw, /<!-- pending:begin -->/);
    assert.match(raw, /<!-- pending:end -->/);
    assert.match(raw, /## 7\. 下游节点 hint/);
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `bun test ./.claude/scripts/__tests__/discuss.test.ts 2>&1 | tail -25`
Expected: 3 新测试 FAIL（章节标题不匹配）。

- [ ] **Step 3: 修改 lib/discuss.ts — §2 渲染扩展为 10 维度**

替换整个 `renderSelfCheckTable` 函数：

```typescript
const GLOBAL_DIMS = [
  { key: "数据源", label: "数据源" },
  { key: "历史数据", label: "历史数据" },
  { key: "测试范围", label: "测试范围" },
  { key: "PRD 合理性", label: "PRD 合理性" },
];

const FUNCTIONAL_DIMS = [
  { key: "字段定义", label: "字段定义" },
  { key: "交互逻辑", label: "交互逻辑" },
  { key: "导航路径", label: "导航路径" },
  { key: "状态流转", label: "状态流转" },
  { key: "权限控制", label: "权限控制" },
  { key: "异常处理", label: "异常处理" },
];

interface DimCount {
  total: number;
  clarified: number;
  autoDefaulted: number;
  pending: number;
}

function countByDimensions(
  dims: Array<{ key: string; label: string }>,
  clarifications: Clarification[],
): Map<string, DimCount> {
  const counts = new Map<string, DimCount>();
  for (const dim of dims) {
    counts.set(dim.key, { total: 0, clarified: 0, autoDefaulted: 0, pending: 0 });
  }
  for (const c of clarifications) {
    for (const dim of dims) {
      if (c.location.includes(dim.key)) {
        const entry = counts.get(dim.key);
        if (!entry) break;
        entry.total += 1;
        if (c.severity === "blocking_unknown" && c.user_answer) entry.clarified += 1;
        if (c.severity === "defaultable_unknown") entry.autoDefaulted += 1;
        if (c.severity === "pending_for_pm") entry.pending += 1;
        break;
      }
    }
  }
  return counts;
}

function renderDimTable(
  dims: Array<{ key: string; label: string }>,
  counts: Map<string, DimCount>,
): string {
  const lines = [
    "| 维度 | 命中条数 | 已澄清 | 自动默认 | 待定 |",
    "|---|---|---|---|---|",
  ];
  for (const dim of dims) {
    const c = counts.get(dim.key) ?? { total: 0, clarified: 0, autoDefaulted: 0, pending: 0 };
    lines.push(`| ${dim.label} | ${c.total} | ${c.clarified} | ${c.autoDefaulted} | ${c.pending} |`);
  }
  return lines.join("\n");
}

function renderSelfCheckTable(clarifications: Clarification[]): string {
  const globalCounts = countByDimensions(GLOBAL_DIMS, clarifications);
  const funcCounts = countByDimensions(FUNCTIONAL_DIMS, clarifications);
  return [
    "### 全局层（4 维度）",
    "",
    renderDimTable(GLOBAL_DIMS, globalCounts),
    "",
    "### 功能层（6 维度）",
    "",
    renderDimTable(FUNCTIONAL_DIMS, funcCounts),
  ].join("\n");
}
```

- [ ] **Step 4: 修改 lib/discuss.ts — 新增 §6 pending 渲染**

在 `renderDownstreamHints` 函数之前新增：

```typescript
const PENDING_FENCE_OPEN = "<!-- pending:begin -->";
const PENDING_FENCE_CLOSE = "<!-- pending:end -->";

function extractDimensionKeyword(location: string): string {
  for (const dim of [...GLOBAL_DIMS, ...FUNCTIONAL_DIMS]) {
    if (location.includes(dim.key)) return dim.label;
  }
  return "未分类";
}

function renderPendingList(clarifications: Clarification[]): string {
  const pending = clarifications.filter((c) => c.severity === "pending_for_pm");
  const lines: string[] = [PENDING_FENCE_OPEN];
  if (pending.length === 0) {
    lines.push("");
    lines.push("_暂无待产品确认项。_");
    lines.push("");
  } else {
    for (const c of pending) {
      const dim = extractDimensionKeyword(c.location);
      const rec = c.recommended_option || "（未提供）";
      lines.push(`- [ ] **[${dim}]** ${c.id}: ${c.question}`);
      lines.push(`  - AI 推荐: ${rec}`);
      lines.push(`  - 请产品打勾确认或补充说明。`);
    }
  }
  lines.push(PENDING_FENCE_CLOSE);
  return lines.join("\n");
}
```

同步把 `PENDING_FENCE_OPEN` / `PENDING_FENCE_CLOSE` 导出到 `__internal`：

```diff
 export const __internal = {
   renderPlan,
   parseFrontmatter,
   toIsoOffset,
   CLARIFY_FENCE_OPEN,
   CLARIFY_FENCE_CLOSE,
   SUMMARY_MARKER_OPEN,
   SUMMARY_MARKER_CLOSE,
+  PENDING_FENCE_OPEN,
+  PENDING_FENCE_CLOSE,
 };
```

- [ ] **Step 5: 修改 lib/discuss.ts — renderPlan 骨架更新**

把 renderPlan 函数内 body 数组重写为：

```typescript
  const summaryBlock = [
    SUMMARY_MARKER_OPEN,
    "",
    summary || [
      "### 背景",
      "_TODO 主 agent 摘录业务背景（为何要做这个需求）_",
      "",
      "### 痛点",
      "_TODO 主 agent 摘录当前痛点（现状有什么问题）_",
      "",
      "### 目标",
      "_TODO 主 agent 摘录目标（做完后达成什么）_",
      "",
      "### 成功标准",
      "_TODO 主 agent 摘录可衡量的成功标准_",
    ].join("\n"),
    "",
    SUMMARY_MARKER_CLOSE,
  ].join("\n");

  const clarifyJson = JSON.stringify(clarifications, null, 2);
  const fenceBlock = [
    CLARIFY_FENCE_OPEN,
    "```json",
    clarifyJson,
    "```",
    CLARIFY_FENCE_CLOSE,
  ].join("\n");

  const body = [
    "",
    `# 需求讨论 Plan：${fm.requirement_name}（#${fm.requirement_id}）`,
    "",
    "> 本文件由 test-case-gen 的 discuss 节点生成。",
    "> 下游节点从本文件恢复上下文；frontmatter 关键字段（plan_version / status / resume_anchor / *_count / *_at / handoff_mode / repo_consent）由 discuss CLI 维护，请勿手工编辑。",
    "",
    "## 1. 需求摘要",
    "",
    summaryBlock,
    "",
    "## 2. 10 维度自检结果",
    "",
    renderSelfCheckTable(clarifications),
    "",
    "## 3. 澄清记录",
    "",
    renderClarificationsMd(clarifications),
    "",
    fenceBlock,
    "",
    "## 4. 自动默认项汇总",
    "",
    renderAutoDefaultedTable(clarifications),
    "",
    "## 5. 沉淀的 knowledge",
    "",
    renderKnowledgeSection(fm.knowledge_dropped),
    "",
    "## 6. 待定清单（pending_for_pm）",
    "",
    renderPendingList(clarifications),
    "",
    "## 7. 下游节点 hint",
    "",
    renderDownstreamHints(fm.status, clarifications),
    "",
  ].join("\n");

  return `${frontmatter}\n${body}`;
```

注意：

- 章节编号 §1 → §7（§6 编号新增，原 §6 编号顺延为 §7）
- summary marker 内 TODO 文案扩展为 4 子节占位
- 标题「2. 10 维度自检结果」（不是「6 维度」）

- [ ] **Step 6: 修改 renderClarificationsMd — pending 条目显示**

找到 `renderClarificationsMd` 中 `answerLine` 的 `c.severity === "defaultable_unknown"` 分支，扩展为：

```typescript
    const answerLine = c.user_answer
      ? `- **用户答案**：${c.user_answer.selected_option}（${c.user_answer.value}）\n- **答时**：${c.user_answer.answered_at}`
      : c.severity === "defaultable_unknown"
        ? `- **自动默认**：${c.default_policy ?? "采用 recommended_option"}`
        : c.severity === "pending_for_pm"
          ? `- **状态**：待产品确认（见 §6）`
          : "- **状态**：待解答";
```

- [ ] **Step 7: 修改 renderDownstreamHints — 引用新章节号**

找到 `renderDownstreamHints` 返回的三行，把 `§3` / `§4` / `§5` / `§6` 的语义保留，但描述上新增一条 pending 警告：

```typescript
function renderDownstreamHints(status: PlanStatus, clarifications: Clarification[]): string {
  if (status !== "ready") {
    return "_讨论未完成，下游 hints 将在 complete 时写入。_";
  }
  const blockingCount = clarifications.filter(
    (c) => c.severity === "blocking_unknown" && c.user_answer,
  ).length;
  const defaultCount = clarifications.filter((c) => c.severity === "defaultable_unknown").length;
  const pendingCount = clarifications.filter((c) => c.severity === "pending_for_pm").length;
  const lines = [
    `- **transform**：本需求字段已在 discuss 阶段确认（${blockingCount} 条已澄清 + ${defaultCount} 条自动默认）。按 §3 / §4 直接落入 PRD，分别标注 🟢/🟡。不再生成 clarify_envelope。`,
    `- **analyze**：测试点必须覆盖 §3 全部 blocking_unknown 已澄清场景；§4 自动默认项不必单独出测试点。`,
    `- **write**：参考 §5 沉淀条目；Writer 若遇到 §3 未覆盖的 blocking_unknown，直接走 blocked_envelope 回到主 agent。`,
  ];
  if (pendingCount > 0) {
    lines.push(
      `- **⚠️ 存在 ${pendingCount} 条 pending_for_pm**：下游门禁（Phase C）会拦截，请先把 §6 打勾回写为 blocking_unknown + user_answer。`,
    );
  }
  return lines.join("\n");
}
```

- [ ] **Step 8: 修改 appendClarificationToPlan — 计数支持 pending_count**

```diff
   // Recompute counts from scratch for idempotency
   fm.clarify_count = nextList.filter(
     (c) => c.severity === "blocking_unknown" && c.user_answer !== undefined,
   ).length;
   fm.auto_defaulted_count = nextList.filter(
     (c) => c.severity === "defaultable_unknown",
   ).length;
+  fm.pending_count = nextList.filter(
+    (c) => c.severity === "pending_for_pm",
+  ).length;
```

- [ ] **Step 9: 运行验证通过**

Run: `bun test ./.claude/scripts/__tests__/discuss.test.ts 2>&1 | tail -25`
Expected: 原 19 + 新 3 = 22 pass。

若 `discuss init creates plan.md with status=discussing` 等老测试挂了，检查 parsePlan 对 summary 的 extractSummary — 现在初始 summary 块含 4 个 H3，extractSummary 返回值不再是空串。老测试没断言 summary 具体内容，应该通过。

- [ ] **Step 10: 提交**

```bash
git add .claude/scripts/lib/discuss.ts .claude/scripts/__tests__/discuss.test.ts
git commit -m "feat(discuss): extend plan.md template with §1 4 subsections / §2 10 dimensions / §6 pending list

- §1 摘要占位改为 背景 / 痛点 / 目标 / 成功标准 四子节
- §2 自检表拆为「全局层（4）」+「功能层（6）」两层，新增待定列
- §6 新增待定清单（pending:begin/end fence），Markdown checkbox 给产品打勾
- §7 编号顺延（原 §6 → §7），pending_count > 0 时追加下游门禁警告
- renderClarificationsMd / appendClarificationToPlan 全面支持 pending_for_pm"
```

---

## Task 3: CLI append-clarify 支持 pending_for_pm severity

**Files:**
- Modify: `.claude/scripts/discuss.ts`（runAppendClarify 校验放开）
- Modify: `.claude/scripts/__tests__/discuss.test.ts`（新增 pending_for_pm 测试）

**Why now:** Task 2 已能渲染 pending。本 task 打通入口，让主 agent 可通过 `kata-cli discuss append-clarify --content '{"severity":"pending_for_pm",...}'` 写入。

- [ ] **Step 1: 写 failing test — pending_for_pm 走通整条路径**

在 `.claude/scripts/__tests__/discuss.test.ts` 的 `describe("discuss append-clarify", ...)` 块结尾追加测试（替换现有 describe 闭合，或在结尾新增 it）：

```typescript
  it("appends pending_for_pm, updates pending_count and renders §6 checkbox", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const payload = {
      id: "Q3",
      severity: "pending_for_pm",
      question: "是否支持 Kafka 数据源？",
      location: "全局层 → 数据源",
      recommended_option: "否（knowledge/overview.md 默认 spark thrift 2.x）",
      options: [],
    };
    const { stdout, code } = runCli([
      "append-clarify",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--content",
      JSON.stringify(payload),
    ]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.action, "appended");
    assert.equal(data.pending_count, 1);
    assert.equal(data.clarify_count, 0);
    assert.equal(data.auto_defaulted_count, 0);

    const raw = readFileSync(PLAN_ABS, "utf8");
    assert.match(raw, /pending_count: 1/);
    assert.match(raw, /- \[ \] \*\*\[数据源\]\*\* Q3: 是否支持 Kafka/);
    assert.match(raw, /AI 推荐: 否（knowledge\/overview\.md/);
  });
```

- [ ] **Step 2: 运行验证失败**

Run: `bun test ./.claude/scripts/__tests__/discuss.test.ts 2>&1 | tail -10`
Expected: 新测试 FAIL（原因：要么 stdout 没 `pending_count` 字段，要么 runAppendClarify 校验不让 options 为空）。

- [ ] **Step 3: 修改 discuss.ts — runAppendClarify options 校验放开**

现在 runAppendClarify 有 `if (!payload.options) payload.options = [];`（允许 options 缺省）但 id / severity / question / location 必须存在。pending_for_pm 的 options 可以为空数组，已符合现有逻辑，无需放开。

仅需在 stdout JSON 补 `pending_count` 字段：

```diff
   process.stdout.write(
     JSON.stringify(
       {
         plan_path: planAbs,
         clarification_id: payload.id,
         action: isNew ? "appended" : "replaced",
         clarify_count: parsed.frontmatter.clarify_count,
         auto_defaulted_count: parsed.frontmatter.auto_defaulted_count,
+        pending_count: parsed.frontmatter.pending_count,
         discussion_rounds: parsed.frontmatter.discussion_rounds,
       },
       null,
       2,
     ) + "\n",
   );
```

- [ ] **Step 4: 修改 discuss.ts — runRead 输出补 pending_count / handoff_mode**

根据 spec 1.3：`discuss read` 返回值新增 `pending_count`、`handoff_mode`。由于 read 当前已返回 `frontmatter`（包含所有字段），新增字段已随 frontmatter 自然出现。但 spec 要求顶层也暴露快捷字段。改为：

```diff
   const payload = {
     plan_path: planAbs,
     frontmatter: parsed.frontmatter,
     summary: parsed.summary,
     clarifications: parsed.clarifications,
     schema_valid: validation.valid,
     schema_errors: validation.errors,
+    pending_count: parsed.frontmatter.pending_count,
+    handoff_mode: parsed.frontmatter.handoff_mode,
   };
```

- [ ] **Step 5: 为 read 顶层字段加测试**

在 `describe("discuss read — phase B schema", ...)` 块内追加：

```typescript
  it("exposes pending_count and handoff_mode as top-level convenience fields", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { stdout } = runCli(["read", "--project", PROJECT, "--prd", PRD_ABS]);
    const data = JSON.parse(stdout);
    assert.equal(data.pending_count, 0);
    assert.equal(data.handoff_mode, null);
  });
```

- [ ] **Step 6: 运行验证通过**

Run: `bun test ./.claude/scripts/__tests__/discuss.test.ts 2>&1 | tail -10`
Expected: 22 + 2 = 24 pass。

- [ ] **Step 7: 提交**

```bash
git add .claude/scripts/discuss.ts .claude/scripts/__tests__/discuss.test.ts
git commit -m "feat(discuss): append-clarify accepts pending_for_pm; read exposes pending_count/handoff_mode

- runAppendClarify returns pending_count in stdout JSON
- runRead surfaces pending_count + handoff_mode as top-level convenience fields
- integration tests cover pending_for_pm end-to-end (frontmatter count + §6 checkbox)"
```

---

## Task 4: CLI complete 支持 --handoff-mode

**Files:**
- Modify: `.claude/scripts/lib/discuss.ts`（completePlanText 接受 handoffMode）
- Modify: `.claude/scripts/discuss.ts`（新增 --handoff-mode 参数）
- Modify: `.claude/scripts/__tests__/discuss.test.ts`（handoff-mode 测试）

**Why now:** Task 1 schema 已含 handoff_mode，现在只是把 CLI 入口暴露出来。pending 的复杂语义（complete 是否允许带 pending）按 spec 1.4.2：discuss complete 出口允许带 pending，下游门禁才拦截 — 本 task 不做 pending 拦截。

- [ ] **Step 1: 写 failing tests — --handoff-mode current/new/非法值**

在 `.claude/scripts/__tests__/discuss.test.ts` 末尾追加：

```typescript
describe("discuss complete — handoff mode", () => {
  before(() => resetFixture());
  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("stores handoff_mode=current in frontmatter", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { stdout, code } = runCli([
      "complete",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--handoff-mode",
      "current",
    ]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.status, "ready");
    assert.equal(data.handoff_mode, "current");
    const raw = readFileSync(PLAN_ABS, "utf8");
    assert.match(raw, /handoff_mode: current/);
  });

  it("stores handoff_mode=new", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { stdout } = runCli([
      "complete",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--handoff-mode",
      "new",
    ]);
    const data = JSON.parse(stdout);
    assert.equal(data.handoff_mode, "new");
  });

  it("rejects invalid --handoff-mode value", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { code, stderr } = runCli([
      "complete",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--handoff-mode",
      "bogus",
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /handoff-mode must be/);
  });

  it("complete without --handoff-mode keeps handoff_mode=null", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { stdout } = runCli(["complete", "--project", PROJECT, "--prd", PRD_ABS]);
    const data = JSON.parse(stdout);
    assert.equal(data.handoff_mode, null);
  });

  it("allows completing with pending_for_pm entries (does not block)", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    runCli([
      "append-clarify",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--content",
      JSON.stringify({
        id: "Q1",
        severity: "pending_for_pm",
        question: "Kafka?",
        location: "全局层 → 数据源",
        recommended_option: "否",
        options: [],
      }),
    ]);
    const { code, stdout } = runCli([
      "complete",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--handoff-mode",
      "current",
    ]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.status, "ready");
    assert.equal(data.blocking_remaining, 0);
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `bun test ./.claude/scripts/__tests__/discuss.test.ts 2>&1 | tail -20`
Expected: 5 新测试 FAIL（`--handoff-mode` 参数未知）。

- [ ] **Step 3: 修改 lib/discuss.ts — completePlanText 接受 handoff_mode**

```diff
 export function completePlanText(
   raw: string,
   now: Date,
   knowledgeSummary?: KnowledgeDropped[],
+  handoffMode?: HandoffMode | null,
 ): { plan: string; remainingBlocking: number } {
   const parsed = parsePlan(raw);
   const remaining = parsed.clarifications.filter(
     (c) => c.severity === "blocking_unknown" && !c.user_answer,
   ).length;

   const fm = { ...parsed.frontmatter };
   if (remaining === 0) {
     fm.status = "ready";
     fm.resume_anchor = "discuss-completed";
   }
   fm.updated_at = toIsoOffset(now);
   if (knowledgeSummary !== undefined) {
     fm.knowledge_dropped = knowledgeSummary;
   }
+  if (handoffMode !== undefined) {
+    fm.handoff_mode = handoffMode;
+  }
```

同时，把接口 `HandoffMode` 已在 Task 1 导出，不需额外动。

- [ ] **Step 4: 修改 discuss.ts — runComplete 接受 handoffMode 参数**

```diff
 function runComplete(opts: {
   project: string;
   prd: string;
   knowledgeSummary?: string;
+  handoffMode?: string;
 }): void {
   const { planAbs } = resolvePlanPath(opts.project, opts.prd);
   if (!existsSync(planAbs)) {
     fail(`Plan not found: ${planAbs}`);
   }

+  let handoff: HandoffMode | null | undefined;
+  if (opts.handoffMode !== undefined) {
+    if (opts.handoffMode !== "current" && opts.handoffMode !== "new") {
+      fail(`--handoff-mode must be 'current' or 'new', got: ${opts.handoffMode}`);
+    }
+    handoff = opts.handoffMode as HandoffMode;
+  }
+
   let knowledge: KnowledgeDropped[] | undefined;
```

调用 `completePlanText` 处：

```diff
-  const { plan: next, remainingBlocking } = completePlanText(raw, now, knowledge);
+  const { plan: next, remainingBlocking } = completePlanText(raw, now, knowledge, handoff);
```

stdout 输出 +handoff_mode：

```diff
   process.stdout.write(
     JSON.stringify(
       {
         plan_path: planAbs,
         status: parsed.frontmatter.status,
         resume_anchor: parsed.frontmatter.resume_anchor,
         blocking_remaining: 0,
         knowledge_count: parsed.frontmatter.knowledge_dropped.length,
+        handoff_mode: parsed.frontmatter.handoff_mode,
+        pending_count: parsed.frontmatter.pending_count,
       },
       null,
       2,
     ) + "\n",
   );
```

import 顶部补 `HandoffMode`：

```diff
 import {
   appendClarificationToPlan,
   buildInitialPlan,
   Clarification,
   completePlanText,
+  HandoffMode,
   KnowledgeDropped,
   parsePlan,
   setStrategyInPlan,
   validatePlanSchema,
 } from "./lib/discuss.ts";
```

- [ ] **Step 5: 修改 discuss.ts — commander 注册 --handoff-mode**

`complete` 子命令的 options 加一条：

```diff
     {
       name: "complete",
       description: "完成讨论，标记 status=ready",
       options: [
         { flag: "--project <name>", description: "项目名", required: true },
         { flag: "--prd <path>", description: "PRD 文件路径", required: true },
         {
           flag: "--knowledge-summary <json>",
           description: "已沉淀的 knowledge 列表 JSON",
         },
+        {
+          flag: "--handoff-mode <mode>",
+          description: "交接模式：current（同会话继续）| new（新会话）",
+        },
       ],
       action: (opts: {
         project: string;
         prd: string;
         knowledgeSummary?: string;
+        handoffMode?: string;
       }) =>
         runComplete({
           project: opts.project,
           prd: opts.prd,
           knowledgeSummary: opts.knowledgeSummary,
+          handoffMode: opts.handoffMode,
         }),
     },
```

- [ ] **Step 6: 运行验证通过**

Run: `bun test ./.claude/scripts/__tests__/discuss.test.ts 2>&1 | tail -15`
Expected: 24 + 5 = 29 pass。

- [ ] **Step 7: 提交**

```bash
git add .claude/scripts/lib/discuss.ts .claude/scripts/discuss.ts .claude/scripts/__tests__/discuss.test.ts
git commit -m "feat(discuss): complete --handoff-mode current|new stores handoff into frontmatter

- completePlanText accepts optional handoffMode argument (undefined = keep current value)
- runComplete validates handoff-mode enum, surfaces handoff_mode + pending_count in stdout
- pending_for_pm entries do not block completion (spec 1.4.2: out gate allows pending)"
```

---

## Task 5: CLI set-repo-consent 新增子命令

**Files:**
- Modify: `.claude/scripts/lib/discuss.ts`（新增 setRepoConsentInPlan）
- Modify: `.claude/scripts/discuss.ts`（新增 set-repo-consent 子命令）
- Modify: `.claude/scripts/__tests__/discuss.test.ts`（set-repo-consent 测试）

**Why now:** 节点 3.2 需要在 discuss init 之后立刻写入源码许可。spec CLI 变更表 1.3 未单列此命令（仅说"repo-profile match / repo-sync 前移到 discuss"），但落地到 plan.md 的 repo_consent 字段必须经 CLI 入口 — 不允许主 agent 直接手改 frontmatter（rules/prd-discussion.md 明确禁止）。因此新增 `discuss set-repo-consent`。

- [ ] **Step 1: 写 failing tests — set-repo-consent 多形态**

在 `.claude/scripts/__tests__/discuss.test.ts` 末尾追加：

```typescript
describe("discuss set-repo-consent", () => {
  before(() => resetFixture());
  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("writes repo_consent into frontmatter with multiple repos", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const consent = {
      repos: [
        { path: "workspace/p/.repos/studio", branch: "master", sha: "abc123" },
        { path: "workspace/p/.repos/backend", branch: "main" },
      ],
      granted_at: "2026-04-24T10:01:00+08:00",
    };
    const { stdout, code } = runCli([
      "set-repo-consent",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--content",
      JSON.stringify(consent),
    ]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.ok, true);
    assert.equal(data.repos_count, 2);

    const { stdout: read } = runCli(["read", "--project", PROJECT, "--prd", PRD_ABS]);
    const parsed = JSON.parse(read);
    assert.equal(parsed.frontmatter.repo_consent.repos.length, 2);
    assert.equal(parsed.frontmatter.repo_consent.repos[0].path, "workspace/p/.repos/studio");
    assert.equal(parsed.frontmatter.repo_consent.repos[0].sha, "abc123");
    assert.equal(parsed.frontmatter.repo_consent.repos[1].branch, "main");
    assert.equal(parsed.frontmatter.repo_consent.granted_at, "2026-04-24T10:01:00+08:00");
  });

  it("accepts --clear to reset repo_consent to null", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    runCli([
      "set-repo-consent",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--content",
      JSON.stringify({
        repos: [{ path: "a", branch: "b" }],
        granted_at: "2026-04-24T10:01:00+08:00",
      }),
    ]);
    const { stdout, code } = runCli([
      "set-repo-consent",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--clear",
    ]);
    assert.equal(code, 0);
    const { stdout: read } = runCli(["read", "--project", PROJECT, "--prd", PRD_ABS]);
    assert.equal(JSON.parse(read).frontmatter.repo_consent, null);
  });

  it("rejects malformed content JSON", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { code, stderr } = runCli([
      "set-repo-consent",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--content",
      "{bad json",
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /not valid JSON/);
  });

  it("rejects content missing repos or granted_at", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { code, stderr } = runCli([
      "set-repo-consent",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--content",
      JSON.stringify({ repos: [{ path: "x", branch: "y" }] }),
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /granted_at/);
  });

  it("fails when neither --content nor --clear provided", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { code, stderr } = runCli([
      "set-repo-consent",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /--content or --clear/);
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `bun test ./.claude/scripts/__tests__/discuss.test.ts 2>&1 | tail -20`
Expected: 5 新测试 FAIL（子命令未注册）。

- [ ] **Step 3: 修改 lib/discuss.ts — 新增 setRepoConsentInPlan**

在 `setStrategyInPlan` 函数之后追加：

```typescript
export function setRepoConsentInPlan(
  raw: string,
  consent: RepoConsent | null,
  now: Date,
): string {
  const parsed = parsePlan(raw);
  const fm = { ...parsed.frontmatter };
  fm.repo_consent = consent;
  fm.updated_at = toIsoOffset(now);
  return renderPlan(fm, parsed.clarifications, parsed.summary);
}
```

- [ ] **Step 4: 修改 discuss.ts — 新增 runSetRepoConsent**

文件顶部 import 追加：

```diff
 import {
   appendClarificationToPlan,
   buildInitialPlan,
   Clarification,
   completePlanText,
   HandoffMode,
   KnowledgeDropped,
   parsePlan,
+  RepoConsent,
+  setRepoConsentInPlan,
   setStrategyInPlan,
   validatePlanSchema,
 } from "./lib/discuss.ts";
```

在 `runSetStrategy` 之后追加：

```typescript
// ============================================================================
// set-repo-consent
// ============================================================================

function runSetRepoConsent(opts: {
  project: string;
  prd: string;
  content?: string;
  clear: boolean;
}): void {
  if (!opts.content && !opts.clear) {
    fail("--content or --clear is required");
  }
  const { planAbs } = resolvePlanPath(opts.project, opts.prd);
  if (!existsSync(planAbs)) {
    fail(`Plan not found: ${planAbs}. Run 'init' first.`);
  }

  let consent: RepoConsent | null = null;
  if (!opts.clear) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(opts.content as string);
    } catch (err) {
      fail(`--content is not valid JSON: ${(err as Error).message}`);
    }
    const obj = parsed as Partial<RepoConsent>;
    if (!Array.isArray(obj.repos)) {
      fail("repo_consent.repos must be an array");
    }
    if (typeof obj.granted_at !== "string" || obj.granted_at.length === 0) {
      fail("repo_consent.granted_at must be a non-empty ISO string");
    }
    for (const r of obj.repos) {
      if (typeof r.path !== "string" || typeof r.branch !== "string") {
        fail("each repo must include path and branch strings");
      }
    }
    consent = { repos: obj.repos, granted_at: obj.granted_at };
  }

  const raw = readFileSync(planAbs, "utf8");
  const next = setRepoConsentInPlan(raw, consent, new Date());
  writeFileSync(planAbs, next);

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        plan_path: planAbs,
        repos_count: consent ? consent.repos.length : 0,
        cleared: opts.clear === true,
      },
      null,
      2,
    ) + "\n",
  );
}
```

- [ ] **Step 5: 修改 discuss.ts — commander 注册 set-repo-consent**

在 commands 数组末尾（`set-strategy` 之后）追加：

```typescript
    {
      name: "set-repo-consent",
      description: "写入或清空源码引用许可（frontmatter.repo_consent）",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--prd <path>", description: "PRD 文件路径", required: true },
        {
          flag: "--content <json>",
          description: 'RepoConsent JSON，如 \'{"repos":[{"path":"...","branch":"..."}],"granted_at":"..."}\'',
        },
        {
          flag: "--clear",
          description: "清空 repo_consent（置为 null）",
          defaultValue: false,
        },
      ],
      action: (opts: {
        project: string;
        prd: string;
        content?: string;
        clear: boolean;
      }) => runSetRepoConsent(opts),
    },
```

- [ ] **Step 6: 运行验证通过**

Run: `bun test ./.claude/scripts/__tests__/discuss.test.ts 2>&1 | tail -10`
Expected: 29 + 5 = 34 pass。

- [ ] **Step 7: 提交**

```bash
git add .claude/scripts/lib/discuss.ts .claude/scripts/discuss.ts .claude/scripts/__tests__/discuss.test.ts
git commit -m "feat(discuss): add set-repo-consent subcommand to write repo_consent into plan.md

- lib: setRepoConsentInPlan(raw, consent | null, now) pure function
- CLI: --content <json> | --clear mutually exclusive; validates repos + granted_at
- used by node 3.2 source consent flow; stops main agent from hand-editing frontmatter"
```

---

## Task 6: CLI validate 新增子命令（自审门禁）

**Files:**
- Modify: `.claude/scripts/discuss.ts`（新增 validate 子命令）
- Modify: `.claude/scripts/__tests__/discuss.test.ts`（validate 测试）

**Why now:** 自审闭环的基石。spec 要求：`--require-zero-blocking`（硬）、`--require-zero-pending`（可选），退出码非 0 = 不通过。退出码约定：0 = 通过；2 = blocking 未完结；3 = pending 未回填；1 = 参数/加载错误。

- [ ] **Step 1: 写 failing tests**

在 `.claude/scripts/__tests__/discuss.test.ts` 末尾追加：

```typescript
describe("discuss validate", () => {
  before(() => resetFixture());
  after(() => rmSync(TMP, { recursive: true, force: true }));
  beforeEach(() => resetFixture());

  it("passes when plan has no clarifications", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    const { stdout, code } = runCli([
      "validate",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--require-zero-blocking",
    ]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.equal(data.ok, true);
    assert.equal(data.blocking_unanswered, 0);
    assert.equal(data.pending_count, 0);
  });

  it("fails exit=2 when blocking unanswered remains", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    runCli([
      "append-clarify",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--content",
      JSON.stringify({
        id: "Q1",
        severity: "blocking_unknown",
        question: "?",
        location: "字段定义 → x",
        recommended_option: "A",
        options: [{ id: "A", description: "x" }],
      }),
    ]);
    const { code, stderr, stdout } = runCli([
      "validate",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--require-zero-blocking",
    ]);
    assert.equal(code, 2);
    assert.match(stderr, /blocking_unanswered=1/);
    const data = JSON.parse(stdout);
    assert.equal(data.ok, false);
    assert.equal(data.blocking_unanswered, 1);
  });

  it("passes exit=0 with pending when --require-zero-pending NOT set", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    runCli([
      "append-clarify",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--content",
      JSON.stringify({
        id: "Q2",
        severity: "pending_for_pm",
        question: "Kafka?",
        location: "全局层 → 数据源",
        recommended_option: "否",
        options: [],
      }),
    ]);
    const { code, stdout } = runCli([
      "validate",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--require-zero-blocking",
    ]);
    assert.equal(code, 0);
    assert.equal(JSON.parse(stdout).pending_count, 1);
  });

  it("fails exit=3 when --require-zero-pending and pending_count > 0", () => {
    runCli(["init", "--project", PROJECT, "--prd", PRD_ABS]);
    runCli([
      "append-clarify",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--content",
      JSON.stringify({
        id: "Q3",
        severity: "pending_for_pm",
        question: "Kafka?",
        location: "全局层 → 数据源",
        recommended_option: "否",
        options: [],
      }),
    ]);
    const { code, stderr } = runCli([
      "validate",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--require-zero-blocking",
      "--require-zero-pending",
    ]);
    assert.equal(code, 3);
    assert.match(stderr, /pending_count=1/);
  });

  it("fails exit=1 when plan not found", () => {
    const { code, stderr } = runCli([
      "validate",
      "--project",
      PROJECT,
      "--prd",
      PRD_ABS,
      "--require-zero-blocking",
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /Plan not found/);
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `bun test ./.claude/scripts/__tests__/discuss.test.ts 2>&1 | tail -20`
Expected: 5 新测试 FAIL。

- [ ] **Step 3: 修改 discuss.ts — 新增 runValidate**

在 `runSetRepoConsent` 之后追加：

```typescript
// ============================================================================
// validate
// ============================================================================

function runValidate(opts: {
  project: string;
  prd: string;
  requireZeroBlocking: boolean;
  requireZeroPending: boolean;
}): void {
  const { planAbs } = resolvePlanPath(opts.project, opts.prd);
  if (!existsSync(planAbs)) {
    fail(`Plan not found: ${planAbs}`);
  }
  const raw = readFileSync(planAbs, "utf8");
  const parsed = parsePlan(raw);
  const validation = validatePlanSchema(parsed.frontmatter);

  const blockingUnanswered = parsed.clarifications.filter(
    (c) => c.severity === "blocking_unknown" && !c.user_answer,
  ).length;
  const pendingCount = parsed.frontmatter.pending_count ?? 0;

  const reasons: string[] = [];
  if (!validation.valid) {
    for (const e of validation.errors) reasons.push(`schema: ${e}`);
  }
  if (opts.requireZeroBlocking && blockingUnanswered > 0) {
    reasons.push(`blocking_unanswered=${blockingUnanswered}`);
  }
  if (opts.requireZeroPending && pendingCount > 0) {
    reasons.push(`pending_count=${pendingCount}`);
  }

  const ok = reasons.length === 0;
  const payload = {
    ok,
    plan_path: planAbs,
    status: parsed.frontmatter.status,
    blocking_unanswered: blockingUnanswered,
    pending_count: pendingCount,
    handoff_mode: parsed.frontmatter.handoff_mode,
    schema_valid: validation.valid,
    reasons,
  };
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");

  if (ok) {
    return;
  }

  // Exit code precedence: schema error (1) > blocking (2) > pending (3)
  if (!validation.valid) {
    info(`validate failed: ${reasons.join("; ")}`);
    process.exit(1);
  }
  if (opts.requireZeroBlocking && blockingUnanswered > 0) {
    info(`validate failed: blocking_unanswered=${blockingUnanswered}`);
    process.exit(2);
  }
  if (opts.requireZeroPending && pendingCount > 0) {
    info(`validate failed: pending_count=${pendingCount}`);
    process.exit(3);
  }
}
```

- [ ] **Step 4: 修改 discuss.ts — commander 注册 validate**

在 commands 数组末尾（`set-repo-consent` 之后）追加：

```typescript
    {
      name: "validate",
      description: "校验 plan.md 状态，可作为下游节点门禁",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--prd <path>", description: "PRD 文件路径", required: true },
        {
          flag: "--require-zero-blocking",
          description: "未答 blocking_unknown > 0 则退出码 2",
          defaultValue: false,
        },
        {
          flag: "--require-zero-pending",
          description: "pending_count > 0 则退出码 3",
          defaultValue: false,
        },
      ],
      action: (opts: {
        project: string;
        prd: string;
        requireZeroBlocking: boolean;
        requireZeroPending: boolean;
      }) => runValidate(opts),
    },
```

注意：commander.js 把 `--require-zero-blocking` 驼峰化为 `requireZeroBlocking`，直接用即可。

- [ ] **Step 5: 运行验证通过**

Run: `bun test ./.claude/scripts/__tests__/discuss.test.ts 2>&1 | tail -10`
Expected: 34 + 5 = 39 pass。

- [ ] **Step 6: 提交**

```bash
git add .claude/scripts/discuss.ts .claude/scripts/__tests__/discuss.test.ts
git commit -m "feat(discuss): add validate subcommand for self-check and downstream gates

- --require-zero-blocking -> exit 2 on unanswered blocking_unknown
- --require-zero-pending -> exit 3 on pending_count > 0
- exit 1 reserved for plan-not-found / schema invalid
- stdout JSON with ok/reasons/counts so callers can structure decisions"
```

---

## Task 7: 新增 3 个 references 文档

**Files:**
- Create: `.claude/skills/test-case-gen/references/10-dimensions-checklist.md`
- Create: `.claude/skills/test-case-gen/references/ambiguity-patterns.md`
- Create: `.claude/skills/test-case-gen/references/source-refs-schema.md`

**Why now:** CLI 已稳态，文档可定稿。

- [ ] **Step 1: 创建 10-dimensions-checklist.md**

Write `.claude/skills/test-case-gen/references/10-dimensions-checklist.md`:

```markdown
# 10 维度自检清单

> 供 test-case-gen 的 discuss 节点（`workflow/03-discuss.md`）使用。
> 前 4 维度（全局层）结合 `workspace/{project}/knowledge/overview.md` 的默认假设；后 6 维度（功能层）逐页逐字段扫 PRD + 源码。
> quick 模式（`--quick`）下跳过全局层 4 维度，仅做功能层 6 维度。

## 全局层（4 维度）

### 1. 数据源

- 本需求是否明确数据源（后端接口 / 数据库 / 第三方服务 / 本地配置）？
- 默认假设（来自 knowledge/overview.md）是否适用？例如"本项目默认仅 spark thrift 2.x"。
- 若 PRD 未提但与默认假设冲突 → 生成 `blocking_unknown` 或 `pending_for_pm`。

**典型提问模板：**
- "本需求的数据源是 X，对吗？"（AI 推荐）
- "暂定按默认假设（Y），留给产品确认"（pending_for_pm）

### 2. 历史数据

- 上线前已有的存量数据如何处理？（迁移 / 重算 / 忽略）
- 是否需要历史兼容（老版本字段/状态）？
- 默认假设：历史数据原状保留（非破坏性变更）。

### 3. 测试范围

- 需求描述的功能是否需要全链路覆盖？还是仅前端/仅后端？
- 是否涉及跨模块联动（例如 A 模块变更影响 B 模块报表）？
- 默认假设：只测需求本身涉及的模块 + 直接上下游调用。

### 4. PRD 合理性

- PRD 内是否存在逻辑悖论（例如"仅 A 状态可编辑"与"B 状态可编辑"同存）？
- 是否有不符合常识的设计（例如导出功能不带权限校验）？
- PRD 合理性问题以 `blocking_unknown` 形态提交，AI 推荐项给出"建议改为 X"。

## 功能层（6 维度）

### 5. 字段定义

- 每个字段是否有类型 / 必填性 / 校验规则三方确认（PRD / 源码 / 截图）？
- 字段之间的依赖关系（例如字段 A 为空时字段 B 不可编辑）是否明确？

### 6. 交互逻辑

- 按钮点击后行为是否明确？（跳转 / 弹窗 / 请求 / 本地状态）
- 联动规则（例如多选影响单选、下拉联动）是否完整？

### 7. 导航路径

- 每个页面的菜单入口 / URL / 返回路径是否明确？
- 是否有深链、外部入口、Tab 切换场景？

### 8. 状态流转

- 状态变更的触发条件（时间 / 事件 / 人工）是否齐全？
- 目标状态是否唯一（避免二义性）？
- 反向流转（撤销 / 回退）是否允许？

### 9. 权限控制

- 角色矩阵是否在 PRD 或源码中明确？
- 未授权用户访问时行为（提示 / 阻断 / 路由跳转）？

### 10. 异常处理

- 异常场景（接口失败 / 参数非法 / 超时 / 并发冲突）的系统行为？
- 提示文案是否与产品规范对齐？
- 是否允许重试 / 降级？

## 维度与 location 的映射约定

主 agent 在构造 clarification 时，`location` 字段格式建议为：

```
{层级} → {维度关键字} → {具体位置}
```

例如：

- `全局层 → 数据源 → Kafka 支持`
- `功能层 → 字段定义 → 审批状态`
- `功能层 → 异常处理 → 接口 400 提示`

`lib/discuss.ts` 的 `renderSelfCheckTable` 会匹配「维度关键字」做统计。若 `location` 未含任何维度关键字，该条在 §2 汇总表中不计数（§3 仍会保留）。
```

- [ ] **Step 2: 创建 ambiguity-patterns.md**

Write `.claude/skills/test-case-gen/references/ambiguity-patterns.md`:

```markdown
# 模糊语信号表 & few-shot

> 供 test-case-gen discuss 节点扫描 PRD 时识别"隐含待澄清点"。检测到即生成 clarification。

## 模糊信号 10 模式

| # | 信号 | 示例 | 对应维度（典型） | 处理建议 |
|---|---|---|---|---|
| 1 | "仅支持 X"（枚举不封闭） | "仅支持 MySQL / Oracle" | 数据源 / 字段定义 | 问"是否支持 X 之外的其他选项？" |
| 2 | "支持 A、B（未说 C）" | "支持筛选、排序" | 交互逻辑 | 问"是否还支持分页 / 多选 / 清除筛选？" |
| 3 | "如果 X 则 Y"（未穷举 else） | "若校验失败则弹窗" | 异常处理 | 问"校验通过时的提示？其他异常如何处理？" |
| 4 | "默认值（未说来源）" | "默认按创建时间倒序" | 字段定义 / 交互逻辑 | 问"默认值来自接口？配置？硬编码？" |
| 5 | "必填 / 可选"（未明确校验） | "姓名必填" | 字段定义 | 问"长度 / 字符集 / 空白字符是否允许？" |
| 6 | "权限限制"（未定义角色） | "管理员可导出" | 权限控制 | 问"管理员之外的角色进入该页行为？" |
| 7 | "状态变更"（未定义触发条件） | "审批通过后变更为已生效" | 状态流转 | 问"变更是同步还是异步？失败重试？" |
| 8 | "兼容历史数据"（未说边界） | "兼容旧版本数据" | 历史数据 | 问"旧版本具体版本？不兼容数据如何标记？" |
| 9 | "批量操作"（未说上限 / 原子性） | "批量删除" | 异常处理 / 交互逻辑 | 问"单次上限？部分失败处理？" |
| 10 | "导出 / 报表"（未说字段 / 格式） | "支持导出 Excel" | 字段定义 / 测试范围 | 问"导出字段范围？格式 xlsx/csv？大小限制？" |

## few-shot 示例

### 示例 A：字段定义模糊

**PRD 片段：**
> 用户列表页显示姓名、手机号、角色。支持按角色筛选。

**检测到的模糊语：**
- 信号 #5：姓名 / 手机号字段未定义长度与校验
- 信号 #6：角色筛选未定义角色枚举

**生成的 clarification（示意）：**

```json
{
  "id": "Q1",
  "severity": "blocking_unknown",
  "question": "手机号字段校验规则（长度 / 是否允许 +86 前缀 / 空白符处理）？",
  "location": "功能层 → 字段定义 → 手机号",
  "recommended_option": "A",
  "options": [
    { "id": "A", "description": "11 位纯数字，禁止前缀，禁止空白" },
    { "id": "B", "description": "允许 +86 前缀，允许中间空白" }
  ]
}
```

### 示例 B：交互逻辑模糊

**PRD 片段：**
> 用户点击"提交"按钮后，展示处理中状态，成功后跳转到结果页。

**检测到的模糊语：**
- 信号 #3：失败分支未说明
- 信号 #9：处理中期间是否可重复点击未说明

**生成的 clarification：**

```json
{
  "id": "Q2",
  "severity": "blocking_unknown",
  "question": "提交失败时系统行为（错误提示 / 按钮是否恢复可点 / 是否自动重试）？",
  "location": "功能层 → 异常处理 → 提交按钮",
  "recommended_option": "A",
  "options": [
    { "id": "A", "description": "Toast 错误文案 + 按钮恢复可点，不自动重试" },
    { "id": "B", "description": "弹窗错误 + 自动重试 3 次" }
  ]
}
```

### 示例 C：全局层 pending_for_pm

**PRD 片段：**
> 数据来源于内部接口，支持 MySQL 查询。

**检测到的模糊语：**
- 信号 #1 + 全局维度"数据源"：未提 Kafka / Oracle 等常见数据源

**生成的 clarification（留给产品确认）：**

```json
{
  "id": "Q3",
  "severity": "pending_for_pm",
  "question": "是否需要在未来版本扩展 Kafka 或 Oracle 数据源？",
  "location": "全局层 → 数据源 → 扩展性",
  "recommended_option": "否（基于 knowledge/overview.md 默认仅 spark thrift 2.x + MySQL）",
  "options": []
}
```

## 使用规则

- 模糊信号检测是"召回优先"，即使弱匹配也应提 clarification（错杀好过漏杀）
- 每个模糊语转 1 条 clarification；多模糊聚合到同一条需在 question 内显式列出
- `pending_for_pm` 的 options 允许为空数组（AskUserQuestion 不展示给用户；仅在 §6 给产品打勾）
```

- [ ] **Step 3: 创建 source-refs-schema.md**

Write `.claude/skills/test-case-gen/references/source-refs-schema.md`:

```markdown
# source_ref 锚点规范

> 供 Phase C 下游节点（analyze / write / review）使用。Phase B 先落规范文档，不强制检查。
> 在 discuss 阶段产出的 clarification 中，推荐填 `context.source` 字段引用 PRD / knowledge / plan 锚点；下游测试点沿用同语法。

## 语法

```
source_ref ::= <scheme>#<anchor>
scheme     ::= plan | prd | knowledge | repo
```

### plan 锚点

指向当前讨论 plan.md 的 §3 条目：

```
plan#q3-数据源
plan#q12-审批状态
```

**渲染规则：**
- `q{id}` 小写，`id` 取自 clarification.id
- `-{slug}` 为 location 最末段的中文 slug（去掉箭头、空格），便于人读

### prd 锚点

指向 PRD 文件小节（GitHub 风格 anchor，小写、空格转 `-`）：

```
prd#section-2.1.3
prd#审批状态字段定义
```

**渲染规则：**
- PRD 文件路径由 frontmatter.prd_path 决定，锚点本身不带文件名
- 子节编号（若 PRD 有）优先使用；否则用小节标题 slug

### knowledge 锚点

指向 `workspace/{project}/knowledge/` 某个条目：

```
knowledge#overview.数据源默认
knowledge#term.审批.中文解释
knowledge#pitfall.前端缓存穿透
```

**渲染规则：**
- 首段为条目类型（overview / term / module / pitfall）
- 第二段为条目名（支持中文）
- 第三段可选，为子字段

### repo 锚点（可选）

指向源码行：

```
repo#studio/src/approval/list.tsx:L123
repo#backend/ApprovalController.java:L45-L60
```

**渲染规则：**
- `{repo_name}/{relative_path}:L{line}` 或 `:L{start}-L{end}`
- repo_name 取自 plan.md.repo_consent.repos[i].path 的最末段

## 在 Clarification 中使用

```json
{
  "id": "Q1",
  "severity": "blocking_unknown",
  "question": "审批状态是否包含"已驳回"？",
  "location": "功能层 → 字段定义 → 审批状态",
  "context": {
    "source": "repo#studio/src/approval/list.tsx:L45",
    "archive": "knowledge#module.审批.状态流转"
  },
  "recommended_option": "B",
  "options": [
    { "id": "A", "description": "仅待审批/已通过" },
    { "id": "B", "description": "包含已驳回" }
  ]
}
```

## Phase C 将强制的地方

| 节点 | 强制字段 | 失败行为 |
|---|---|---|
| analyze 产出测试点 | `source_ref` 必填 | 缺失 → 重派 analyze 或降级走 PRD 锚点 |
| write 产出用例 | 继承自测试点的 `source_ref` | 缺失 → reviewer 判定严重问题 |
| review | 校验锚点可解析 | 锚点不可解析 → 标记为严重问题 |

Phase B 不检查，只规范文档。主 agent 与 subagent 在 discuss 阶段已可提前按本规范填 context.source。
```

- [ ] **Step 4: 验证 3 个文件存在且含关键章节**

```bash
cd /Users/poco/Projects/kata
ls .claude/skills/test-case-gen/references/10-dimensions-checklist.md \
   .claude/skills/test-case-gen/references/ambiguity-patterns.md \
   .claude/skills/test-case-gen/references/source-refs-schema.md
grep -c "### " .claude/skills/test-case-gen/references/10-dimensions-checklist.md
grep -c "### " .claude/skills/test-case-gen/references/ambiguity-patterns.md
grep -c "### " .claude/skills/test-case-gen/references/source-refs-schema.md
```

Expected: 3 个文件都存在；每个文件 `###` 出现次数 ≥ 4。

- [ ] **Step 5: 提交**

```bash
git add .claude/skills/test-case-gen/references/10-dimensions-checklist.md \
        .claude/skills/test-case-gen/references/ambiguity-patterns.md \
        .claude/skills/test-case-gen/references/source-refs-schema.md
git commit -m "docs(test-case-gen): add 10-dimensions-checklist / ambiguity-patterns / source-refs-schema references

- 10 维度清单：全局层 4（数据源/历史数据/测试范围/PRD 合理性）+ 功能层 6（保留）
- 模糊语信号表：10 模式 + 3 few-shot 示例覆盖字段 / 交互 / pending_for_pm
- source_ref 锚点规范：plan/prd/knowledge/repo 四种 scheme，Phase C 下游强制化的基础"
```

---

## Task 8: 重写 rules/prd-discussion.md

**Files:**
- Rewrite: `rules/prd-discussion.md`

**Why now:** rules 是硬约束，文档与 CLI 对齐后再固化。要覆盖 10 维度 / 3 选项 / 5 项自审 / 模糊检测引用。

- [ ] **Step 1: 重写 rules/prd-discussion.md**

Overwrite `rules/prd-discussion.md`:

```markdown
# PRD 需求讨论规则

> 适用于 test-case-gen 工作流的 discuss 节点（参见 `.claude/skills/test-case-gen/workflow/03-discuss.md`）。硬约束，违反即阻断 commit。

## 主持权

- discuss 节点禁派 transform-agent / writer-agent 等承担"需求讨论"职责的 subagent
- 仅允许派 Explore subagent 执行只读源码考古或归档检索；Explore 返回的事实摘要由主 agent 整理后再向用户提问
- AskUserQuestion 由主 agent 直接发起；subagent 不得对用户发问

## 10 维度自检清单（完整清单见 `references/10-dimensions-checklist.md`）

- **全局层 4 维度**（quick 模式可跳过）：数据源 / 历史数据 / 测试范围 / PRD 合理性
- **功能层 6 维度**（快慢模式都必做）：字段定义 / 交互逻辑 / 导航路径 / 状态流转 / 权限控制 / 异常处理
- 每维度至少"过一遍"；即使"无疑问"也要在 plan.md §2 表中体现 0 条记录
- 模糊语扫描参照 `references/ambiguity-patterns.md` 10 模式 + few-shot

## 3 选项提问格式

每条 AskUserQuestion 固定为 3 选项：

1. **AI 推荐**（recommended_option，必填，描述具体值 + 依据）
2. **暂定 — 留给产品确认**（触发 `severity=pending_for_pm`，写入 plan.md §3 + §6 双链）
3. **Other**（AskUserQuestion 自动提供；用户输入自由文本）

- 禁用"最多 4 个候选项"的旧写法
- 自动默认项（`severity=defaultable_unknown`）不走 AskUserQuestion；直接 `append-clarify` with `default_policy`

## 5 项自审清单（complete 前必跑）

主 agent 在调 `discuss complete` 前，逐条自查：

1. **摘要四子节完整**：§1 的背景 / 痛点 / 目标 / 成功标准均已填（无"_TODO"占位）
2. **10 维度都过一遍**：§2 表全 10 行都有记录（可为 0 条）
3. **模糊语全扫**：PRD 原文 grep `references/ambiguity-patterns.md` 10 模式，命中全部转 clarification
4. **blocking 全答**：`kata-cli discuss validate --require-zero-blocking` 退出码 0
5. **pending 已入 §6**：所有 `severity=pending_for_pm` 的条目在 plan.md §6 有 Markdown checkbox 占位

自审失败 → 回 discuss 步骤 3.6 逐条补答；不得跳 complete。

## 沉淀知识

- 用户在讨论中提到的新术语 / 业务规则 / 踩坑必须经 `knowledge-keeper write` API 落地
- 严禁主 agent 直接写 `workspace/{project}/knowledge/` 下任何文件
- 沉淀完成后由 `discuss complete --knowledge-summary '<json>'` 同步写入 plan.md frontmatter 的 `knowledge_dropped`

## 源码引用许可

- 源码同步许可前移至 discuss 节点 3.2（原 transform 2.2）
- 用户同意后，主 agent 调 `kata-cli discuss set-repo-consent --content '<json>'` 写入 plan.md.repo_consent
- 切换仓库或讨论重置 → 强制 `discuss set-repo-consent --clear`

## plan.md 关键字段保护

- `plan_version` / `status` / `resume_anchor` / `*_count` / `handoff_mode` / `repo_consent` / `created_at` / `updated_at` 字段由 discuss CLI 维护，主 agent 与人工不得手工编辑
- §1 摘要 / §3 用户答案文本可由主 agent 在讨论中追加修订，但应优先通过 `append-clarify` API
- §2 自检表 / §4 自动默认 / §6 待定清单 / §7 下游 hints 由 CLI 自动渲染，手工修改会被下次写入覆盖

## 重启检测

- init 节点必须先调 `discuss read` 检查 plan 状态：
  - `不存在` 或 `status=obsolete` → 进入 discuss 节点 init 模式
  - `status=discussing` → 进入 discuss 节点恢复模式（从未答 Q\* / 未回填 pending 续问）
  - `status=ready` → 跳过 discuss 节点，直接进入 transform（Phase C 启用下游门禁后，再跑一次 `discuss validate --require-zero-blocking --require-zero-pending`）

## 交接模式

- `discuss complete` 必须带 `--handoff-mode current|new`：
  - `current`：主 agent 在当前会话继续进入 transform
  - `new`：输出交接 prompt，结束当前会话，由用户新开会话接力
- pending_count > 0 时，主 agent 在 AskUserQuestion 中应标红警告（Phase C 启用下游门禁会拦截）

## clarify_envelope 协议已弃用

- transform-agent 不再产出 `<clarify_envelope>` XML 块
- 旧 `references/clarify-protocol.md` 仅供历史 PRD 兼容回退使用
- 所有澄清都通过 plan.md §3 持久化；Writer 阻断回射到 discuss append-clarify（Phase C 实施）
```

- [ ] **Step 2: 验证无遗留旧表述**

```bash
grep -n "最多 4 个\|6 维度" rules/prd-discussion.md
```

Expected: 无命中（均已改为 "10 维度" / "3 选项"）。

- [ ] **Step 3: 提交**

```bash
git add rules/prd-discussion.md
git commit -m "docs(rules): rewrite prd-discussion.md for 10 dims / 3 options / 5-item self-review

- 10 dimensions (global 4 + functional 6), replacing the old 6-dimension list
- 3-option question format supersedes 'at most 4 candidates'
- 5-item self-review checklist gates complete
- source consent + handoff_mode wording aligned with new CLI"
```

---

## Task 9: 重写 workflow/03-discuss.md

**Files:**
- Rewrite: `.claude/skills/test-case-gen/workflow/03-discuss.md`

**Why now:** 所有依赖的 CLI / rules / references 全部就位，discuss 节点的 SOP 文档可最终落地。

- [ ] **Step 1: 重写 workflow/03-discuss.md**

Overwrite `.claude/skills/test-case-gen/workflow/03-discuss.md`:

```markdown
# 节点 3: discuss — 主 agent 主持需求讨论（10 维度 / 3 选项 / 自审闭环）

> 由 workflow/main.md 路由后加载。上游：节点 2 probe；下游：节点 4 transform。
> 硬约束：`rules/prd-discussion.md`。引用资源：`references/10-dimensions-checklist.md` / `references/ambiguity-patterns.md` / `references/source-refs-schema.md`。

**目标**：在 transform 之前由主 agent 亲自主持需求讨论，落地 10 维度自检 + 3 选项提问 + 5 项自审 + 交接弹窗，产出带 pending 清单的 plan.md。

**⏳ Task**：将 `discuss` 任务标记为 `in_progress`。

> **⚠️ 主持原则**：
>
> - 本节点禁派 transform-agent / writer-agent 等承担需求讨论职责的 subagent
> - 仅允许派 Explore subagent 执行只读源码考古或归档检索
> - AskUserQuestion 由主 agent 直接发起；subagent 不得对用户发问
> - 3.3 起所有写入 plan.md 的动作必须经 `kata-cli discuss ...` CLI，禁止手改 frontmatter

---

## 3.1 plan.md 初始化或恢复

按节点 1.2 的检测结果：

- 全新讨论 → `kata-cli discuss init --project {{project}} --prd {{prd_path}}`
- 恢复 → `kata-cli discuss read --project {{project}} --prd {{prd_path}}` 拿到已答清单 + 未答 Q\* + pending_count

> `status=ready` 的 plan 已在节点 1.2 触发跳过，不会进入本节点。

## 3.2 源码引用许可（原 transform 2.2 前移）

### 3.2.1 profile 匹配

```bash
kata-cli repo-profile match --text "{{prd_title_or_path}}"
```

返回 profile_name + repos 列表。

### 3.2.2 AskUserQuestion 许可确认

展示以下（3 选项严格对齐）：

```
📋 源码引用许可（命中 profile：{{profile_name}}）

仓库预览：
  - {{path_1}} @ {{branch_1}}
  - {{path_2}} @ {{branch_2}}

选项：
  - AI 推荐：允许同步并引用以上仓库
  - 暂定 — 留给产品确认：仅本次引用现有本地副本（下一次讨论时再决定同步）
  - Other：调整仓库 / 不使用源码参考 / 自行输入
```

### 3.2.3 落盘 + 可选同步

**允许同步** → 先执行：

```bash
kata-cli repo-sync sync-profile --name "{{profile_name}}"
```

取返回的 SHA。然后写入 plan.md：

```bash
kata-cli discuss set-repo-consent \
  --project {{project}} --prd {{prd_path}} \
  --content '{"repos":[{"path":"workspace/{{project}}/.repos/studio","branch":"master","sha":"{{sha_1}}"}],"granted_at":"{{iso_now}}"}'
```

**仅引用本地副本** → 不做同步；直接 set-repo-consent 但 sha 省略。

**拒绝 / 不使用源码** → `kata-cli discuss set-repo-consent --project {{project}} --prd {{prd_path}} --clear`。

> **切换仓库 / 重启讨论** → 强制 `set-repo-consent --clear`，下一轮重新询问。

### 3.2.4 后续节点不再重复问

frontmatter.repo_consent 非空即表示同意已落地。节点 4 transform 的原 2.2 源码许可段降级为"仅写回 profile 二道确认"（如用户提出保存新 profile 映射），同步许可不再重复问。

## 3.3 需求摘要（plan §1 — 4 子节）

主 agent 综合 PRD + `workspace/{{project}}/knowledge/overview.md` + 已同步源码（若有）推导初稿，结构：

- **背景**：为什么要做这个需求（业务 / 历史 / 用户反馈）
- **痛点**：现状有什么问题
- **目标**：做完后达成什么（功能 / 性能 / 合规）
- **成功标准**：可衡量的验收指标

AskUserQuestion 逐子节确认或修正。确认后由主 agent 直接编辑 plan.md `<!-- summary:begin --> ... <!-- summary:end -->` 块（仅 §1 段；frontmatter 与 §3 JSON fence 不动）。

## 3.4 全局层扫描（新增 4 维度）

> quick 模式跳过本节（直接进入 3.5）。

对每个维度逐一检测（完整清单见 `references/10-dimensions-checklist.md`）：

### 3.4.1 数据源

- 先读 `workspace/{{project}}/knowledge/overview.md` 的项目默认假设（例如"仅 spark thrift 2.x"）
- PRD 未提 → 若与默认假设一致，可 `append-clarify` with `severity=defaultable_unknown`
- PRD 与默认假设冲突 / PRD 未说且默认假设不覆盖 → `blocking_unknown` 或 `pending_for_pm`

### 3.4.2 历史数据影响

- 存量数据迁移 / 兼容策略？
- 默认假设：非破坏性变更

### 3.4.3 测试范围

- 前端 / 后端 / 全链路？
- 跨模块联动？
- 默认假设：只测需求本身 + 直接上下游

### 3.4.4 PRD 合理性审查

- 逻辑悖论（互斥状态同存）
- 常识性缺失（导出无权限校验等）

> 每检测到一条 → 立刻 `kata-cli discuss append-clarify --content '<json>'` 落盘。

## 3.5 功能层扫描（原 6 维度，保留）

对 PRD 每个功能点逐一检查：

- 字段定义 / 交互逻辑 / 导航路径 / 状态流转 / 权限控制 / 异常处理
- 结合 `references/ambiguity-patterns.md` 10 模式做模糊语扫描
- 可派 Explore subagent 做源码考古（只读），事实摘要返回后由主 agent 整理问题

每条 clarification 的 `location` 建议格式：`功能层 → {维度关键字} → {具体位置}`，便于 §2 自检表自动统计。

## 3.6 逐条澄清（plan §3 + §4 + §6）

对每条 `blocking_unknown`：

```
AskUserQuestion(
  question: "{{Q.question}}",
  options: [
    "AI 推荐：{{Q.recommended_option.description}}（依据：{{rationale}}）",
    "暂定 — 留给产品确认（会进入 §6 待定清单）",
    "Other"（AskUserQuestion 自动提供）
  ]
)
```

用户答案 → 立刻 `append-clarify` 落盘：

| 用户选择 | severity | 写入位置 |
|---|---|---|
| AI 推荐 | `blocking_unknown` + `user_answer` | §3（自动更新 clarify_count） |
| 暂定 — 留给产品确认 | `pending_for_pm` | §3 + §6（自动更新 pending_count） |
| Other + 自由文本 | `blocking_unknown` + `user_answer` | §3 |

`defaultable_unknown` 直接 `append-clarify` with `default_policy`，不向用户发问。

示例 payload：

```bash
kata-cli discuss append-clarify \
  --project {{project}} --prd {{prd_path}} \
  --content '{
    "id": "Q1",
    "severity": "pending_for_pm",
    "question": "是否支持 Kafka 数据源？",
    "location": "全局层 → 数据源 → Kafka 支持",
    "recommended_option": "否（基于 knowledge/overview.md 默认仅 spark thrift 2.x）",
    "options": []
  }'
```

## 3.7 知识沉淀（plan §5，不变）

用户在讨论中提到的新术语 / 业务规则 / 踩坑 → 显式调：

```bash
kata-cli knowledge-keeper write \
  --project {{project}} --type term|module|pitfall \
  --content '{...}' --confidence high --confirmed
```

收集所有沉淀条目 → 待 3.9 一并传入 `complete --knowledge-summary`。

## 3.8 自审闭环（新增）

主 agent 在 complete 之前，按 `rules/prd-discussion.md` 5 项自审清单逐条自查：

1. 摘要四子节完整（无 _TODO 占位）
2. 10 维度都过一遍（quick 模式仅 6 维度）
3. 模糊语 10 模式全扫
4. blocking 全答
5. pending 已入 §6

完成后调 CLI 自审：

```bash
kata-cli discuss validate \
  --project {{project}} --prd {{prd_path}} \
  --require-zero-blocking
```

- 退出码 0 → 进入 3.9
- 退出码 2（blocking_unanswered > 0）→ 回 3.6 续问
- 退出码 1（schema error）→ 检查 plan.md 是否被误改

> **注意**：本节点不加 `--require-zero-pending`；出口允许带 pending（下游 Phase C 入口才拦截）。

## 3.9 complete + 交接模式弹窗（新增）

### 3.9.1 AskUserQuestion 选交接模式

若 pending_count > 0，展示时标红警告：

```
⚠️ 当前有 {{pending_count}} 条 pending_for_pm 待产品确认（详见 plan.md §6）。
下游门禁（Phase C）会拦截，必须先把 §6 打勾回写后才能跑 transform。

如何继续？

- Current-Session-Driven（同会话继续）
- New-Session-Driven（输出交接 prompt，结束当前会话，由用户新开会话接力）
```

### 3.9.2 调 complete

```bash
kata-cli discuss complete \
  --project {{project}} --prd {{prd_path}} \
  --handoff-mode current|new \
  --knowledge-summary '[{"type":"term","name":"..."},...]'
```

- 成功 → status=ready / resume_anchor=discuss-completed / handoff_mode 落盘
- 退出 1（仍有未答 blocking）→ 回 3.6

### 3.9.3 交接分支

**Current-Session-Driven** → 进入节点 4 transform。若 pending_count > 0，**本 phase 暂不拦截**（Phase C 才启用）；但在下一次执行 transform 前应先在 plan.md §6 打勾 + `append-clarify` 转 `blocking_unknown` + `user_answer`。

**New-Session-Driven** → 输出交接 prompt 并结束当前会话：

```
📋 Handoff to new session

项目：{{project}}
PRD：{{prd_path}}
plan.md：workspace/{{project}}/prds/{{YYYYMM}}/{{prd_slug}}.plan.md
pending_count：{{n}}
下一步建议：
  1. 产品在 plan.md §6 打勾回写
  2. 在新会话中：/test-case-gen {{prd_path}} —— 主 agent 会自动从 discuss-completed 恢复
  3. 跑 transform 前主 agent 会再调 discuss validate
```

**⚠️ 临时横幅**（Phase B/C 间隔期提示）：

```
⚠️ Phase B 已上线，但下游门禁（Phase C）未启用。
若 pending_count > 0 且你选择继续 transform，plan.md §6 的未打勾项不会被自动拦截。
建议：pending_count > 0 时，先请产品回写 §6，再手动触发 transform。
```

**✅ Task**：将 `discuss` 任务标记为 `completed`（subject 更新为 `discuss — {{clarify_count}} 条澄清 / {{auto_defaulted_count}} 条默认 / {{pending_count}} 条待定`）。

## 3.10 strategy_id 传递（不变，原 3.7）

从本节点起，派发下游 subagent（transform / analyze / writer）时，task prompt 必须包含：

```
strategy_id: {{resolution.strategy_id}}
```

（若 probe 节点返回空 resolution，默认 S1）

subagent 按 `.claude/references/strategy-templates.md` 对应 section 调整行为。

---

## 异常分支

| 情况 | 处理 |
|---|---|
| `discuss read` 返回 schema 错误 | `discuss reset` → 重新 init |
| `set-repo-consent` 失败（plan 不存在） | 先走 3.1 init |
| 源码同步失败 | 提示用户；降级为"仅引用本地副本"走 3.2.3 分支 2 |
| validate 返回 exit 2 | 回 3.6 |
| 用户中途切换 PRD | 禁止当前 plan 复用；走 `discuss reset` + 重新 init |
```

- [ ] **Step 2: 验证文件结构与关键章节**

```bash
wc -l .claude/skills/test-case-gen/workflow/03-discuss.md
# Expected: 200-280 行（spec 预期 200-250 行，允许小幅溢出）

grep -c "^## 3\." .claude/skills/test-case-gen/workflow/03-discuss.md
# Expected: 10（3.1 ~ 3.10）

grep -n "--handoff-mode\|set-repo-consent\|discuss validate\|pending_for_pm" \
  .claude/skills/test-case-gen/workflow/03-discuss.md | head
# Expected: 4 类关键字都至少出现一次
```

- [ ] **Step 3: 提交**

```bash
git add .claude/skills/test-case-gen/workflow/03-discuss.md
git commit -m "refactor(test-case-gen): rewrite 03-discuss.md for 10-dim / 3-option / self-review / handoff

- 3.2 源码许可前移（原 transform 2.2）+ set-repo-consent 写入
- 3.3 摘要扩展 4 子节（背景/痛点/目标/成功标准）
- 3.4 全局层 4 维度（数据源/历史数据/测试范围/PRD 合理性）
- 3.5 功能层 6 维度保留（引用 ambiguity-patterns.md）
- 3.6 3 选项 AskUserQuestion（AI 推荐 / 暂定 / Other）
- 3.8 5 项自审 + discuss validate CLI
- 3.9 complete + handoff-mode 弹窗 + Phase B/C 横幅"
```

---

## Task 10: 回归 + 横幅 + tag

**Files:**
- 读取（不修改）：全仓库 skills 结构
- Modify（可选）：`.claude/skills/test-case-gen/workflow/04-transform.md`（加 Phase B 横幅）

**Why last:** 全量单测 + 冒烟脚本 + tag Phase B 完成。

- [ ] **Step 1: 全量单测**

```bash
cd /Users/poco/Projects/kata
bun test ./.claude/scripts/__tests__ 2>&1 | tail -10
```

Expected: 778 + 20（Phase B 新增约 20 测试）≈ 798 pass，0 fail。

若单测数对不上：

- 若 discuss.test.ts 内新增数 ≠ 21，以实测为准；只要全绿即可
- 若其他脚本单测挂了，大概率是 lib/discuss.ts 被外部引用（grep `from ".*lib/discuss"` .claude/scripts/**/*.ts）

- [ ] **Step 2: CLI 冒烟（端到端）**

```bash
# 使用临时 workspace，避免污染真实项目
TMP=$(mktemp -d)
WORKSPACE_DIR=$TMP/ws
mkdir -p $WORKSPACE_DIR/phase-b-smoke/prds/202604
cat > $WORKSPACE_DIR/phase-b-smoke/prds/202604/smoke.md <<'PRD'
---
requirement_id: 77777
requirement_name: Phase B 冒烟
---
# Phase B 冒烟需求
仅用于验证 discuss CLI 链路。
PRD

WORKSPACE_DIR=$WORKSPACE_DIR kata-cli discuss init --project phase-b-smoke --prd $WORKSPACE_DIR/phase-b-smoke/prds/202604/smoke.md

WORKSPACE_DIR=$WORKSPACE_DIR kata-cli discuss append-clarify --project phase-b-smoke --prd $WORKSPACE_DIR/phase-b-smoke/prds/202604/smoke.md --content '{"id":"Q1","severity":"pending_for_pm","question":"Kafka?","location":"全局层 → 数据源","recommended_option":"否","options":[]}'

WORKSPACE_DIR=$WORKSPACE_DIR kata-cli discuss set-repo-consent --project phase-b-smoke --prd $WORKSPACE_DIR/phase-b-smoke/prds/202604/smoke.md --content '{"repos":[{"path":"workspace/phase-b-smoke/.repos/dummy","branch":"main","sha":"abc"}],"granted_at":"2026-04-24T10:00:00+08:00"}'

WORKSPACE_DIR=$WORKSPACE_DIR kata-cli discuss validate --project phase-b-smoke --prd $WORKSPACE_DIR/phase-b-smoke/prds/202604/smoke.md --require-zero-blocking
# Expected: exit 0, ok=true, pending_count=1

WORKSPACE_DIR=$WORKSPACE_DIR kata-cli discuss validate --project phase-b-smoke --prd $WORKSPACE_DIR/phase-b-smoke/prds/202604/smoke.md --require-zero-blocking --require-zero-pending
# Expected: exit 3

WORKSPACE_DIR=$WORKSPACE_DIR kata-cli discuss complete --project phase-b-smoke --prd $WORKSPACE_DIR/phase-b-smoke/prds/202604/smoke.md --handoff-mode current
# Expected: status=ready, handoff_mode=current, pending_count=1

cat $WORKSPACE_DIR/phase-b-smoke/prds/202604/smoke.plan.md | head -40
# Expected: frontmatter 含 pending_count: 1 / handoff_mode: current / repo_consent 非空

rm -rf $TMP
```

Expected: 每条命令如注释所述。若任一步骤失败，定位后回对应 Task 修正。

- [ ] **Step 3: 在 04-transform.md 顶部加 Phase B/C 间隔期横幅（可选）**

Phase B 出口的行为约束之一：告知用户 transform 之前未启用自动门禁。只改 04-transform.md 头部加一条 admonition（不动原步骤逻辑），避免下游节点实质改动。

Edit `.claude/skills/test-case-gen/workflow/04-transform.md` 顶部（`# 节点 4: transform` 行之后）插入：

```markdown
> **⚠️ Phase B 临时横幅**：discuss 出口可能带 `pending_count > 0`。Phase C 启用下游门禁前，主 agent 应在启动 transform 前手动调
> `kata-cli discuss validate --require-zero-blocking --require-zero-pending`
> 校验；退出非 0 → 回 discuss 步骤 3.6 回填。本节点下的 4.x 步骤保持 Phase A 时行为。
```

- [ ] **Step 4: 提交（含横幅）**

```bash
git add .claude/skills/test-case-gen/workflow/04-transform.md
git commit -m "docs(transform): add Phase B interim banner warning about non-gated pending

- reminds main agent to run 'discuss validate --require-zero-pending' manually
- behavior unchanged; Phase C will make the gate automatic"
```

- [ ] **Step 5: 打 tag 标记 Phase B 完成**

```bash
git tag -a phase-b-discuss-enhancement-done -m "Phase B — discuss 节点增强完成"
```

---

## Self-Review

**1. Spec coverage（对照 spec Part 1 + Part 5 Phase B 段）：**

- ✅ 1.1 节点重塑（3.1-3.10 10 子节） → Task 9
- ✅ 1.1 3.2 源码引用许可前移 → Task 5 CLI + Task 9 SOP
- ✅ 1.1 3.3 摘要 4 子节 → Task 2 + Task 9
- ✅ 1.1 3.4 全局层 4 维度 → Task 7 references + Task 9 SOP
- ✅ 1.1 3.5 功能层 6 维度（保留 + 模糊扫描） → Task 7 + Task 9
- ✅ 1.1 3.6 3 选项提问 → Task 3 CLI + Task 8 rules + Task 9 SOP
- ✅ 1.1 3.8 自审闭环（5 项 + validate） → Task 6 CLI + Task 8 rules + Task 9 SOP
- ✅ 1.1 3.9 complete + 交接弹窗 → Task 4 CLI + Task 9 SOP
- ✅ 1.2 plan.md 结构变化（pending_count / handoff_mode / repo_consent / §1 4 子节 / §6 pending / §7 编号顺延） → Task 1 + Task 2
- ✅ 1.3 CLI 变更（init / read / append-clarify / validate / complete + set-repo-consent） → Tasks 1-6
- ✅ 1.5 新增 3 个 references → Task 7
- ✅ 1.6 rules 重写 → Task 8
- ✅ 1.7 quick 模式 → Task 9 3.4 开头声明 + Task 8 rules
- ✅ Phase B 出口横幅提示 → Task 10 Step 3

**2. Placeholder scan：** 已检查无 TODO / TBD / "similar to ..."；每个 step 含可执行命令或完整代码。`_TODO 主 agent 摘录_` 是 plan.md 模板占位（给用户看的渲染结果），不是 plan 文档自身的 TBD。

**3. Type consistency：**
- `HandoffMode = "current" | "new"` — Task 1 定义，Task 4 CLI 使用，Task 9 SOP 使用一致
- `RepoConsent` 形状 `{ repos: [...], granted_at }` — Task 1 定义，Task 5 CLI 接受，Task 9 SOP 写入命令对齐
- severity 枚举 `pending_for_pm` — Task 1 定义，Task 2 渲染，Task 3 CLI 接受，Task 8 rules 引用一致
- `renderPendingList` / `renderSelfCheckTable` / `countByDimensions` 命名前后一致（Task 2）
- `--require-zero-blocking` / `--require-zero-pending` flag 拼写在 Task 6 测试、CLI 实现、Task 8 rules、Task 9 SOP 完全一致

**已知开放项：**

- Task 5 的 set-repo-consent 不在 spec 1.3 CLI 变更表中，但 spec 1.2 要求 frontmatter 有 repo_consent 字段，且 rules 明确禁止主 agent 手改 frontmatter → 必须新增 CLI。命名与 `set-strategy` 保持一致。如需后续合规，可在 spec 补录。
- Task 10 Step 1 预期 `778 + 20 ≈ 798`，具体数字随实际增删波动，以全绿为判据。
- Task 10 Step 3 的 transform 横幅是 Phase B 专属；Phase C 开始时应删除（Phase C plan 会处理）。

---

## Execution Handoff

Plan 保存至 `docs/refactor/specs/2026-04-24-phase-b-discuss-enhancement-plan.md`。

**两种执行方式**：

**1. Subagent-Driven（推荐）** — 每个 task 派一个新的 subagent 执行，主 agent 在 task 之间做两阶段 review（spec review + code quality review）。优点：上下文干净、快速迭代、每个 task 独立可回滚。与 Phase A 相同。

**2. Inline Execution** — 在当前会话中按 task 顺序执行，带 checkpoint 让用户审阅。

---

## 后续计划

Phase B 落地后，Phase C（下游门禁 + source_ref 硬约束）将基于本 phase 产出的：

- `set-repo-consent` + `repo_consent` frontmatter
- `validate` CLI 门禁
- `pending_for_pm` severity
- 3 份 references（含 source-refs-schema）

继续细化。Phase C plan 预期产出：

- `docs/refactor/specs/2026-04-24-phase-c-downstream-gate-plan.md`

Phase C 需改 transform / enhance / analyze / write / review 5 个下游节点，并在 04-transform.md 移除 Task 10 加的临时横幅。
