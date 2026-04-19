# PRD 需求讨论阶段 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `test-case-gen` 工作流前端新增 `discuss` 节点（主 agent 亲自主持），交付落盘的结构化 `plan.md`，实现 `/clear` 重启续跑下游节点。剥离 `transform-agent` 的 6 维度自检 + clarify_envelope 职责。

**Architecture:** 新增 CLI `.claude/scripts/discuss.ts`（5 actions：init / read / append-clarify / complete / reset）+ 纯函数 `lib/discuss.ts`。plan.md 落盘于 `workspace/{project}/prds/{YYYYMM}/{slug}.plan.md`（PRD 同目录、加 `.plan.md` 后缀）。test-case-gen SKILL.md 在 init 与 transform 之间插入新节点 1.5 「discuss」。transform-agent 接受 plan.md 路径作为 input 并简化输出契约（移除 clarify_envelope）。

**Tech Stack:** Bun + TypeScript（同 knowledge-keeper / create-project），Markdown only for SKILL/agents/rules。

**Spec:** [`../specs/2026-04-18-prd-discussion-design.md`](../specs/2026-04-18-prd-discussion-design.md)

**Roadmap:** [`../../refactor-roadmap.md`](../../refactor-roadmap.md)

**Upstream Phases:** Phase 0（架构）/ Phase 1.1（knowledge-keeper）/ Phase 1.2（create-project）/ Phase 1.3（setup-slim）已完成。

---

## 关键不变量（跨 Task 守护）

1. `bun test ./.claude/scripts/__tests__` 在每 Task 结束时全绿；基线 604 通过 + 本 phase 新增 ≥ 30 条
2. 不动 `state.ts` / `archive-gen.ts` / `source-analyze.ts` / `knowledge-keeper.ts` / `create-project.ts` 任意字节
3. 不动 `writer-agent` / `reviewer-agent` / `format-checker-agent` / `enhance-agent` 等下游 agents
4. 不动 `init-wizard.ts` / setup SKILL.md
5. CLI `discuss.ts` 输出契约对齐 knowledge-keeper / create-project：stdout JSON、stderr `[discuss] <msg>\n`、exit 0/1/2
6. `clarify-protocol.md` 仅追加 deprecated 标记，不删除
7. transform-agent 在 plan.md 缺失时按"无 plan = 旧行为"回退兼容
8. plan.md frontmatter 字段名稳定（`plan_version: 1` 锁版本）
9. 任何向 `workspace/discuss-fixture/` 等测试目录写入的文件必须在 `after()` 中清理
10. 无硬编码绝对路径 / 凭证；仓库根用 `repoRoot()`，项目路径用 `paths.ts` helper

---

## 文件布局

| 文件 | 动作 | 责任 |
|---|---|---|
| `docs/refactor/plans/2026-04-18-prd-discussion-implementation.md` | Create | 本 plan |
| `.claude/scripts/lib/paths.ts` | Edit | 新增 `plansDir(project, yyyymm)` / `planPath(project, slug)` helper |
| `.claude/scripts/lib/discuss.ts` | Create | 纯函数：schema / parse / render / append / complete / reset 计算 |
| `.claude/scripts/discuss.ts` | Create | CLI 入口（5 actions） |
| `.claude/scripts/__tests__/lib/discuss.test.ts` | Create | 单元测试 |
| `.claude/scripts/__tests__/lib/paths.test.ts` | Edit | 补 plan 路径 helper 单测 |
| `.claude/scripts/__tests__/discuss.test.ts` | Create | 集成测试（Bun.spawn） |
| `rules/prd-discussion.md` | Create | 全局规则：主 agent 主持守则 |
| `.claude/skills/test-case-gen/references/discuss-protocol.md` | Create | discuss 节点协议 |
| `.claude/skills/test-case-gen/references/clarify-protocol.md` | Edit | 标注 deprecated |
| `.claude/skills/test-case-gen/SKILL.md` | Edit | 新增节点 1.5、init 扩容、任务可视化更新 |
| `.claude/agents/transform-agent.md` | Edit | 删步骤 5、读 plan.md、output 契约简化 |
| `docs/refactor-roadmap.md` | Edit (last) | phase 2 标 ✅ DONE |

---

## Task 1：基线快照与路径 helper

**目的**：锁定基线测试数 + 在 paths.ts 增加 plan 路径函数（无 schema 改动，仅复用现有 prdsDir 结构）。

**Files:**
- Edit: `.claude/scripts/lib/paths.ts`
- Edit: `.claude/scripts/__tests__/lib/paths.test.ts`

- [ ] **Step 1: 记录基线测试数**

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：`604 pass / 0 fail`（与子目标 3 完成时一致）。如基线偏差，停止报告。

- [ ] **Step 2: 在 paths.ts 追加 plan 路径 helper**

在 `prdsDir(project)` 之后追加：

```typescript
export function plansDir(project: string, yyyymm: string): string {
  return join(prdsDir(project), yyyymm);
}

export function planPath(project: string, yyyymm: string, slug: string): string {
  return join(plansDir(project, yyyymm), `${slug}.plan.md`);
}
```

- [ ] **Step 3: 单测**

在 `paths.test.ts` 补 `plansDir` / `planPath` 用例：
- 项目 `dataAssets`、yyyymm `202604`、slug `15695-quality-check` → `<workspaceDir>/dataAssets/prds/202604/15695-quality-check.plan.md`
- 不依赖文件系统，纯路径拼接断言

- [ ] **Step 4: 测试**

```bash
bun test ./.claude/scripts/__tests__/lib/paths.test.ts
```

预期：含新增用例全绿。

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：`>= 606 pass / 0 fail`。

- [ ] **Commit:**

```
feat(phase2): add plan path helpers in paths.ts
```

---

## Task 2：lib/discuss.ts 纯函数实现

**目的**：实现 schema 校验、parse、render、append、complete、reset 全部纯函数，零文件 I/O（I/O 留给 CLI 层）。

**Files:**
- Create: `.claude/scripts/lib/discuss.ts`

- [ ] **Step 1: 类型定义**

定义 TypeScript 接口：

```typescript
export const PLAN_VERSION = 1;

export type PlanStatus = "discussing" | "ready" | "obsolete";
export type ResumeAnchor = "discuss-in-progress" | "discuss-completed";
export type ClarifySeverity = "blocking_unknown" | "defaultable_unknown" | "invalid_input";

export interface KnowledgeDropped {
  type: "term" | "module" | "pitfall" | "overview";
  name: string;
}

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
  resume_anchor: ResumeAnchor;
  knowledge_dropped: KnowledgeDropped[];
}

export interface ClarifyOption {
  id: string;
  description: string;
  reason?: string;
}

export interface ClarifyAnswer {
  selected_option: string;
  value: string;
  answered_at: string;
}

export interface Clarification {
  id: string;
  severity: ClarifySeverity;
  question: string;
  context?: { lanhu?: string; source?: string; archive?: string };
  location: string;
  recommended_option: string;
  options: ClarifyOption[];
  user_answer?: ClarifyAnswer;
  default_policy?: string;
}

export interface ParsedPlan {
  frontmatter: PlanFrontmatter;
  sections: {
    summary: string;
    self_check_table_raw: string;
    clarifications: Clarification[];
    auto_defaulted_raw: string;
    knowledge_dropped_raw: string;
    downstream_hints_raw: string;
  };
  raw: string;
}
```

- [ ] **Step 2: 核心函数签名**

```typescript
export function buildInitialPlan(input: {
  project: string;
  prdPath: string;
  prdSlug: string;
  requirementId: string;
  requirementName: string;
  now: Date;
}): string;

export function parsePlan(raw: string): ParsedPlan;

export function appendClarificationToPlan(
  raw: string,
  clarification: Clarification,
  now: Date,
): { plan: string; isNew: boolean };

export function completePlanText(
  raw: string,
  now: Date,
  knowledgeSummary?: KnowledgeDropped[],
): { plan: string; remainingBlocking: number };

export function validatePlanSchema(fm: Partial<PlanFrontmatter>): {
  valid: boolean;
  errors: string[];
};

export function shouldObsolete(
  planMtime: Date,
  prdMtime: Date,
): boolean;
```

- [ ] **Step 3: 实现要点**

- frontmatter 解析复用 `lib/knowledge.ts parseFrontmatter` 模式：极简 YAML 子集（单行 string、int、enum；数组用 `[a, b]`、`knowledge_dropped` 用 `- type: ... \n  name: ...` 的 inline-style）
- `buildInitialPlan` 严格按 spec §5.2 模板渲染，章节用 `## N. ...` 编号；§3 / §4 留空表头；§1 留 `{{TODO 主 agent 摘录}}` 占位；frontmatter `status=discussing`、`resume_anchor=discuss-in-progress`、`knowledge_dropped=[]`、`discussion_rounds=0`、`clarify_count=0`、`auto_defaulted_count=0`
- `parsePlan` 把 §3 解析成 `Clarification[]`：每个 `### Q<N>` 子标题为一条；解析 `severity` / `question` / `recommended_option` / `user_answer.selected_option` 等字段
- `appendClarificationToPlan`：若 §3 已有同 id 的条目 → 替换；否则追加；同步更新 frontmatter `updated_at` / `discussion_rounds += 1`；如有 `user_answer` 且 severity=blocking → `clarify_count += 1`；如 severity=defaultable → `auto_defaulted_count += 1`
- `completePlanText`：扫 §3 全部 `severity=blocking_unknown` 检查 `user_answer` 是否非空；返回 `remainingBlocking`；若为 0，更新 `status=ready` / `resume_anchor=discuss-completed` / 更新 §5（如传入 knowledge summary）
- `validatePlanSchema`：必填字段检查、`status` enum、`resume_anchor` enum、`plan_version === 1`
- `shouldObsolete`：`prdMtime > planMtime + 5min` 视为需要复核

- [ ] **Step 4: 防御**

- 所有日期字段统一 ISO8601 with `+08:00` 偏移（同项目惯例：见 knowledge `updated` 但 plan 用 ISO 完整时间）
- 所有 stdout/输入字符串处理使用 `\n` 而非 `\r\n`（兼容 Linux/macOS）
- 不依赖 process.cwd()，全部接受参数

- [ ] **Commit:**

```
feat(phase2): add lib/discuss.ts pure functions for plan schema and rendering
```

---

## Task 3：lib/discuss.ts 单元测试

**目的**：100% 覆盖纯函数边界。

**Files:**
- Create: `.claude/scripts/__tests__/lib/discuss.test.ts`

- [ ] **Step 1: 测试组**

按 spec §9.1 全部覆盖：
- `buildInitialPlan` — frontmatter 字段齐全 / 模板章节齐全 / 占位符替换正确 / 时间戳格式
- `parsePlan` — 完整 / 缺章节 / 多 clarification / 含 user_answer / knowledge_dropped 数组
- `appendClarificationToPlan` — 新增 Q1 / 替换已存在 Q1 / blocking with answer 计数 +1 / defaultable 计数 +1 / discussion_rounds 自增
- `completePlanText` — 全部 blocking 已答 → status=ready / 仍有未答 → 拒绝并返回 remaining 数 / knowledge summary 写入 §5
- `validatePlanSchema` — plan_version 不识别 / status 非法 / resume_anchor 非法 / 缺必填字段
- `shouldObsolete` — prd 较新 / plan 较新 / 5 分钟容差边界

- [ ] **Step 2: 单测固定时钟**

所有测试传入固定 `now = new Date("2026-04-18T10:30:00+08:00")` 避免漂移。

- [ ] **Step 3: 测试**

```bash
bun test ./.claude/scripts/__tests__/lib/discuss.test.ts
```

预期：≥ 20 用例全绿。

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：`>= 626 pass / 0 fail`。

- [ ] **Commit:**

```
test(phase2): add unit tests for lib/discuss.ts
```

---

## Task 4：discuss.ts CLI 实现

**目的**：实现 5 actions（init / read / append-clarify / complete / reset），全部走 lib/discuss.ts 纯函数。

**Files:**
- Create: `.claude/scripts/discuss.ts`

- [ ] **Step 1: 入口骨架**

参照 `.claude/scripts/create-project.ts` / `.claude/scripts/knowledge-keeper.ts` 范式：

```typescript
#!/usr/bin/env bun
/**
 * discuss.ts — PRD 需求讨论 plan.md 管理。
 * Usage:
 *   bun run .claude/scripts/discuss.ts <action> --project <name> --prd <prd_path> [...]
 * Actions: init | read | append-clarify | complete | reset
 */

import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Command } from "commander";
import { initEnv } from "./lib/env.ts";
import { planPath, plansDir, prdsDir } from "./lib/paths.ts";
import {
  appendClarificationToPlan,
  buildInitialPlan,
  Clarification,
  completePlanText,
  KnowledgeDropped,
  parsePlan,
  PLAN_VERSION,
} from "./lib/discuss.ts";
```

- [ ] **Step 2: 共用 helpers**

```typescript
function fail(message: string, code = 1): never {
  process.stderr.write(`[discuss] ${message}\n`);
  process.exit(code);
}

function readPrdFrontmatter(prdPath: string): { slug: string; yyyymm: string; requirementId: string; requirementName: string };
function resolvePlanPath(project: string, prdPath: string): { yyyymm: string; slug: string; planPath: string };
```

- 从 PRD 路径提取 `{YYYYMM}` 与 slug：路径形如 `workspace/{project}/prds/{YYYYMM}/{slug}.md` → 直接 `path.basename` 与 `path.dirname` 拆分
- PRD frontmatter 用 `lib/frontmatter.ts parseFrontMatter` 读取 `requirement_id` / `requirement_name`；缺失时退化为空字符串（不阻塞 init，留给主 agent 在 §1 摘要中补）

- [ ] **Step 3: action 实现**

| Action | 行为 | exit |
|---|---|---|
| `init` | 已存在且 status≠obsolete 且无 `--force` → fail；`--force` → 备份 `{slug}.plan.{ISO timestamp}.md` + 重建；否则直接 mkdirp + 写 `buildInitialPlan(...)` | 0/1 |
| `read` | 不存在 → fail 1；schema validate 失败 → exit 2 + partial JSON；正常 → exit 0 + 完整 ParsedPlan JSON | 0/1/2 |
| `append-clarify` | 解析 `--content` JSON → `appendClarificationToPlan` → 写回；不存在 → fail | 0/1 |
| `complete` | `completePlanText` → 若仍有 blocking → fail 1；否则写回 + 输出 `{ status, resume_anchor, blocking_remaining }` | 0/1 |
| `reset` | 备份当前 plan 到 `{slug}.plan.{timestamp}.md` → 删除原文件；不存在 → fail | 0/1 |

- [ ] **Step 4: backup 命名**

```typescript
const ts = now.toISOString().replace(/[:.]/g, "-");  // 2026-04-18T10-30-00-000Z
const backupPath = planPath.replace(/\.plan\.md$/, `.plan.${ts}.md`);
```

- [ ] **Step 5: 命令行解析**

用 commander，每个 action 一个 `.command(...)`。`--content` 用 `--content <json>` 字符串传入，CLI 内 `JSON.parse` 后按 schema 校验。

- [ ] **Step 6: 手动 smoke**

```bash
mkdir -p workspace/dataAssets/prds/202604
echo "---
requirement_id: 99999
requirement_name: 烟雾测试
---
# 烟雾测试" > workspace/dataAssets/prds/202604/smoke-discuss.md

bun run .claude/scripts/discuss.ts init --project dataAssets --prd workspace/dataAssets/prds/202604/smoke-discuss.md
ls workspace/dataAssets/prds/202604/

# clean
rm -f workspace/dataAssets/prds/202604/smoke-discuss*
```

预期 `smoke-discuss.plan.md` 创建，frontmatter `status=discussing`。

- [ ] **Commit:**

```
feat(phase2): add discuss.ts CLI with init/read/append-clarify/complete/reset
```

---

## Task 5：集成测试

**目的**：通过 `Bun.spawn` 走真实 CLI 验证 5 actions 的端到端行为。

**Files:**
- Create: `.claude/scripts/__tests__/discuss.test.ts`

- [ ] **Step 1: fixture**

```typescript
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(import.meta.dirname, "../..");
const fixtureProject = "discuss-fixture";
const fixturePrdDir = join(repoRoot, "workspace", fixtureProject, "prds", "202604");
const fixturePrd = join(fixturePrdDir, "smoke-need.md");
const fixturePlan = join(fixturePrdDir, "smoke-need.plan.md");

beforeEach(() => {
  mkdirSync(fixturePrdDir, { recursive: true });
  writeFileSync(fixturePrd, [
    "---",
    "requirement_id: 99999",
    "requirement_name: 烟雾需求",
    "---",
    "# 烟雾需求",
    "",
  ].join("\n"));
});

afterEach(() => {
  rmSync(join(repoRoot, "workspace", fixtureProject), { recursive: true, force: true });
});
```

- [ ] **Step 2: helper**

```typescript
function runCli(args: string[]): { stdout: string; stderr: string; status: number } {
  const result = spawnSync(
    "bun",
    ["run", join(repoRoot, ".claude/scripts/discuss.ts"), ...args],
    { encoding: "utf8" },
  );
  return { stdout: result.stdout, stderr: result.stderr, status: result.status ?? -1 };
}
```

- [ ] **Step 3: 用例**

按 spec §9.2：
- init 创建 plan.md → frontmatter status=discussing / resume_anchor=discuss-in-progress
- 二次 init 拒绝（exit 1）
- init --force 备份旧 plan + 重建（断言备份文件名匹配 `*.plan.*.md`）
- read 不存在 → exit 1
- append-clarify Q1 + read 验证 §3 含 Q1 / clarify_count 自增
- append-clarify Q2 defaultable + read 验证 auto_defaulted_count 自增
- complete 全部已答 → status=ready / resume_anchor=discuss-completed
- complete 仍有 blocking 未答 → exit 1
- reset 备份 + 删除原文件

- [ ] **Step 4: 测试**

```bash
bun test ./.claude/scripts/__tests__/discuss.test.ts
```

预期：≥ 10 用例全绿。

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：`>= 636 pass / 0 fail`。

- [ ] **Step 5: 验证副作用清理**

```bash
ls workspace/discuss-fixture 2>/dev/null && echo "FAIL: residue" || echo "clean"
```

预期：`clean`。

- [ ] **Commit:**

```
test(phase2): add integration tests for discuss CLI
```

---

## Task 6：rules/prd-discussion.md

**目的**：把"主 agent 主持讨论"的硬约束沉淀为全局规则文件。

**Files:**
- Create: `rules/prd-discussion.md`

- [ ] **Step 1: 内容**

```markdown
# PRD 需求讨论规则

> 适用于 test-case-gen 工作流的 discuss 节点。

## 主持权

- discuss 节点禁派 transform-agent / writer-agent 等任何承担"需求讨论"职责的 subagent
- 仅允许派 Explore subagent 执行只读源码考古或归档检索，且必须由主 agent 整理结果再向用户提问
- AskUserQuestion 由主 agent 直接发起，subagent 不得对用户发问

## 提问粒度

- 每次 AskUserQuestion 单条最多 4 个候选项
- 自动默认项必须在 plan.md §4 记录依据（source 文件路径、归档需求 ID 之一）
- defaultable_unknown 一律自动落地，不向用户发问

## 沉淀知识

- 用户在讨论中提到的新术语 / 业务规则 / 踩坑 → 必须经 knowledge-keeper write API 落地
- 严禁主 agent 直接写 workspace/{project}/knowledge/ 下任何文件
- 沉淀完成后由 discuss complete 时同步写入 plan.md frontmatter 的 knowledge_dropped

## plan.md 关键字段保护

- `status` / `resume_anchor` / `plan_version` 字段由 discuss CLI 维护，主 agent 与人工不得手工编辑
- §1 摘要 / §3 用户答案文本可由主 agent 在讨论中追加修订
- §6 下游 hints 仅由 discuss complete 阶段写入

## 重启检测

- init 节点必须先调 `discuss read` 检查 plan 状态：
  - status=ready → 跳 discuss 直进 transform
  - status=discussing → 进 discuss 节点恢复（从未答 Q* 续问）
  - 不存在 → 进 discuss 节点 init
```

- [ ] **Step 2: 验证规则被加载**

```bash
bun run .claude/scripts/rule-loader.ts load --project dataAssets 2>&1 | grep prd-discussion
```

预期：含 `prd-discussion.md` 路径。

- [ ] **Commit:**

```
docs(phase2): add rules/prd-discussion.md for discuss node
```

---

## Task 7：references/discuss-protocol.md

**目的**：在 test-case-gen skill 内置规则中提供 discuss 节点的细节协议（供主 agent 自检）。

**Files:**
- Create: `.claude/skills/test-case-gen/references/discuss-protocol.md`

- [ ] **Step 1: 内容大纲**

```markdown
# discuss 节点协议

> test-case-gen 工作流的 discuss 节点（主 agent 主持）操作手册。

## 触发与恢复

| 场景 | 来源 | 行为 |
|---|---|---|
| 全新需求 | 无 plan.md | discuss init → 6 维度自检 → 逐条澄清 → complete |
| 中断恢复 | plan.md status=discussing | discuss read 恢复 §3 已答清单 → 续问未答 → complete |
| 已完成 | plan.md status=ready | 跳过 discuss，主 agent 直派 transform |
| obsolete | PRD mtime > plan updated_at | discuss reset → init 重新讨论 |

## 6 维度自检清单（迁自 transform-agent §5.1）

| 维度 | 检查问题 |
|---|---|
| 字段定义 | 是否有字段的类型 / 必填性 / 校验规则三方均未明确？ |
| 交互逻辑 | 是否有按钮点击后的行为 / 联动规则无法从三方确定？ |
| 导航路径 | 是否有页面的菜单入口无法从路由配置或截图确定？ |
| 状态流转 | 是否有状态变更的触发条件或目标状态不明确？ |
| 权限控制 | 是否有角色权限划分未在代码或 PRD 中明确定义？ |
| 异常处理 | 是否有异常场景的系统行为（提示文案 / 阻断 / 放行）未知？ |

## 不确定性分类

- **defaultable_unknown** → 直接 append-clarify with default_policy；不向用户发问
- **blocking_unknown** → AskUserQuestion 单条问 → append-clarify with user_answer
- **invalid_input** → 立即停止，要求修正输入；不写 plan

## 知识沉淀流程

1. 主 agent 识别用户在讨论中提到的术语 / 业务规则 / 踩坑
2. 调 `bun run .claude/scripts/knowledge-keeper.ts write --project {{project}} --type term|module|pitfall ...`
3. 全部沉淀完成后传入 `complete --knowledge-summary '<json>'`，CLI 写回 plan.md frontmatter

## complete 前置守卫

- 调 `read` 验证 §3 全部 blocking_unknown 已 user_answer
- 收集本轮沉淀的 knowledge → 构造 `--knowledge-summary` JSON
- 输出 §6 下游 hints 至 plan.md（CLI 自动追加）

## 与 clarify-protocol.md 的关系

clarify-protocol.md 已 deprecated。其 envelope 数据模型在 discuss 节点不再使用；transform-agent 不再产出 envelope。新流程下所有澄清都通过 plan.md §3 持久化。
```

- [ ] **Commit:**

```
docs(phase2): add discuss-protocol.md to test-case-gen references
```

---

## Task 8：clarify-protocol.md 标 deprecated

**目的**：保留文档供历史参考，但显式标注 deprecated 引导读者转向新协议。

**Files:**
- Edit: `.claude/skills/test-case-gen/references/clarify-protocol.md`

- [ ] **Step 1: 在文件顶部插入 deprecation 块**

在 `# 结构化澄清中转协议` 标题之后立即插入：

```markdown
> **⚠️ DEPRECATED（自 phase 2 起）**
>
> 本协议在 phase 2「PRD 需求讨论阶段」之后由 plan.md 机制取代。
> - 新流程见 `references/discuss-protocol.md` 与全局 `rules/prd-discussion.md`
> - transform-agent 不再产出 `<clarify_envelope>`；discuss 节点用 plan.md §3 持久化澄清
> - 本文件保留供历史 PRD（无 plan.md）回退或文档考古使用
```

- [ ] **Commit:**

```
docs(phase2): mark clarify-protocol.md as deprecated
```

---

## Task 9：transform-agent.md 简化

**目的**：移除 6 维度自检 + clarify_envelope 段；增加 plan.md input 与"无 plan 兼容"说明。

**Files:**
- Edit: `.claude/agents/transform-agent.md`

- [ ] **Step 1: workflow 步骤精简**

将 `<workflow>` 修改为：

```xml
<workflow>
  <step index="1">解析蓝湖原始素材</step>
  <step index="2">检测源码状态并执行 A/B 级分析</step>
  <step index="3">检索历史归档用例</step>
  <step index="4">读取 plan.md（如存在）并按 §3/§4/§6 hints 行事</step>
  <step index="5">按模板填充结构化 PRD</step>
  <step index="6">置信度计算并输出结果</step>
</workflow>
```

- [ ] **Step 2: confirmation_policy 改写**

```xml
<confirmation_policy>
<rule>Transform 不直接向用户提问；当存在已确认的 plan.md，按 §3 user_answer 与 §4 default_policy 落地内容。</rule>
<rule>plan.md 缺失（旧版 PRD 兼容）时，可临时回退为 deprecated 的 clarify_envelope 行为，但应在控制台 stderr 提示 "no plan.md, falling back to legacy clarify_envelope"。</rule>
</confirmation_policy>
```

- [ ] **Step 3: output_contract 改写**

```xml
<output_contract>
<primary_artifact>覆盖写回原 PRD 路径，结构符合 references/prd-template.md。</primary_artifact>
<status_json>控制台摘要 JSON 继续输出 confidence/page_count/field_count/source_hit/clarify_count/repos_used；clarify_count 取自 plan.md（如有），否则为 0。</status_json>
</output_contract>
```

（移除 `<clarify_artifact>` 行）

- [ ] **Step 4: 删除步骤 5 全段（旧"生成结构化 clarify_envelope"）**

整段删除，包括 5.1 / 5.2 / 5.3 子段。如有外部链接引用，保留 `references/clarify-protocol.md`（已 deprecated）即可。

- [ ] **Step 5: 新增"步骤 4：读取 plan.md"段（在原步骤 4 之前插入）**

```markdown
### 步骤 4：读取 plan.md（如存在）

任务提示中若包含 `plan_path`，先读取并解析：

\`\`\`bash
bun run .claude/scripts/discuss.ts read --project {{project}} --prd {{prd_path}}
\`\`\`

按返回的 JSON：
- §3 clarifications 中 user_answer 非空 → 直接以已确认值填入 PRD 对应字段，标注 🟢（用户确认）
- §4 auto_defaulted → 填入并标注 🟡（自动默认）
- §6 downstream_hints.transform → 作为整体提示参与填充策略

plan.md 不存在时（旧版兼容）：跳过本步骤，按"步骤 5 模板填充"中的最佳推断行事；不再生成新的 clarify_envelope（envelope 协议已 deprecated）。
```

- [ ] **Step 6: 重要约束补充**

在 `## 重要约束` 段尾追加：

```markdown
- **plan.md 优先**：若 plan.md 存在且 status=ready，PRD 中所有 🔴 标记必须降级为 🟢/🟡（澄清已在 discuss 阶段完成）；transform 不应再产生 🔴
- **no clarify_envelope**：禁止再输出 `<clarify_envelope>` XML 块；该协议已 deprecated
```

- [ ] **Commit:**

```
refactor(phase2): simplify transform-agent for plan.md consumption
```

---

## Task 10：test-case-gen SKILL.md 集成 discuss 节点

**目的**：在 SKILL.md 中插入节点 1.5「discuss」、扩容 init 节点的 plan.md 检测、更新任务可视化。

**Files:**
- Edit: `.claude/skills/test-case-gen/SKILL.md`

- [ ] **Step 1: workflow 块更新**

```xml
<workflow>
  <primary>init → discuss → transform → enhance → analyze → write → review → format-check → output</primary>
  <standardize>parse → standardize → review → output</standardize>
  <reverse_sync>confirm_xmind → parse → locate_archive → preview_or_write → report</reverse_sync>
</workflow>
```

- [ ] **Step 2: 任务可视化表更新（"主流程（7 节点）"段改为 9 节点）**

将原 8 行任务表改为 9 行，在 init 行下、transform 行上插入：

```
| `discuss — 主 agent 主持需求讨论`     | `主持需求讨论与 plan.md 落地`     |
```

并将段标题从 `### 主流程（7 节点）` 改为 `### 主流程（9 节点）`，文案中"使用 TaskCreate 一次性创建 8 个任务"改为"9 个任务"。

- [ ] **Step 3: init 节点 1.1 扩容**

在 `### 1.1 断点续传检测` 后追加：

```markdown
### 1.2 plan.md 状态检测（新增）

\`\`\`bash
bun run .claude/scripts/discuss.ts read --project {{project}} --prd {{prd_path}} 2>/dev/null
\`\`\`

按返回 status / resume_anchor 决定下游路由：
- 不存在 / status=obsolete → 进入节点 1.5 discuss（init 模式）
- status=discussing → 进入节点 1.5 discuss（恢复模式）
- status=ready → 跳过节点 1.5 discuss，直接进入节点 2 transform

> 提示：`state.ts resume` 与 `discuss read` 互补 — 前者管"工作流上次跑到哪个节点"，后者管"需求讨论是否已落地"。两个都通过时按各自结论行事。
```

将原本的 1.2 / 1.3 顺延为 1.3 / 1.4。

- [ ] **Step 4: 新增节点 1.5「discuss」整段**

在 `## 节点 2: transform` 之前插入：

```markdown
---

## 节点 1.5: discuss — 主 agent 主持需求讨论

**目标**：在 transform 之前由主 agent 亲自主持需求讨论，将 6 维度自检结果与用户答案落地为 plan.md。

**⏳ Task**：将 `discuss` 任务标记为 `in_progress`。

> **⚠️ 主持原则**（详见 `rules/prd-discussion.md`）：
> - 本节点禁派 transform-agent / writer-agent 等承担需求讨论职责的 subagent
> - 仅允许派 Explore subagent 执行只读源码考古或归档检索
> - AskUserQuestion 由主 agent 直接发起

### 1.5.1 plan.md 初始化或恢复

根据 init 节点 1.2 的检测结果：
- 全新讨论 → `bun run .claude/scripts/discuss.ts init --project {{project}} --prd {{prd_path}}`
- 恢复 → `bun run .claude/scripts/discuss.ts read --project {{project}} --prd {{prd_path}}` 拿到已答清单

### 1.5.2 需求摘要（plan §1）

主 agent 读 PRD 原文 → 摘录 1-3 段核心需求 → AskUserQuestion 让用户确认或修正。
确认后用 `append-clarify` 是错位用法；§1 摘要由用户审定后由主 agent 直接编辑 plan.md（仅 §1 段，frontmatter 不动）。

### 1.5.3 6 维度自检（plan §2）

主 agent 自己执行，必要时调辅助工具：
- `bun run .claude/scripts/source-analyze.ts analyze ...`（深度源码考古时可派 Explore subagent）
- `bun run .claude/scripts/archive-gen.ts search ...`（历史用例参照）

输出每维度的命中数与处理路径，供 §2 表格填充。

### 1.5.4 逐条澄清（plan §3 + §4）

对每条 blocking_unknown：

\`\`\`
AskUserQuestion(
  question: "{{Q.question}}",
  options: Q.options 前 4 个,
  recommended: Q.recommended_option
)
\`\`\`

收到答案后立即调 append-clarify 落盘：

\`\`\`bash
bun run .claude/scripts/discuss.ts append-clarify \
  --project {{project}} --prd {{prd_path}} \
  --content '{{json}}'
\`\`\`

defaultable_unknown 直接 append-clarify with `default_policy`，不向用户发问。

### 1.5.5 知识沉淀（plan §5）

用户在讨论中提到新术语 / 业务规则 / 踩坑 → 显式调：

\`\`\`bash
bun run .claude/scripts/knowledge-keeper.ts write --project {{project}} --type term|module|pitfall ...
\`\`\`

收集所有沉淀条目 → 待 1.5.6 一并传入 complete。

### 1.5.6 complete

\`\`\`bash
bun run .claude/scripts/discuss.ts complete \
  --project {{project}} --prd {{prd_path}} \
  --knowledge-summary '{{knowledge_dropped_json}}'
\`\`\`

成功 → status=ready / resume_anchor=discuss-completed → 进入节点 2 transform。

**✅ Task**：将 `discuss` 任务标记为 `completed`（subject 更新为 `discuss — {{n}} 条澄清，{{m}} 条自动默认`）。
```

- [ ] **Step 5: transform 节点引用 plan.md**

在 `## 节点 2: transform` 的"派发 transform-agent"段（约现 2.4）追加：

```markdown
**plan.md 优先消费**：派发 transform-agent 时，task prompt 中明确提供 `plan_path`。transform-agent 读取 plan.md 后，按 §3/§4/§6 hints 填充 PRD，禁止再输出 clarify_envelope。

clarify_envelope 协议已 deprecated（见 `references/clarify-protocol.md` 顶部说明）。
```

并删除原 `### 2.5 结构化澄清中转（强制检查）` 整段。

- [ ] **Step 6: 测试加载**

```bash
bun run .claude/scripts/rule-loader.ts load --project dataAssets > /dev/null
```

预期：exit 0。

- [ ] **Commit:**

```
feat(phase2): integrate discuss node into test-case-gen SKILL.md
```

---

## Task 11：roadmap 标记完成 + smoke

**目的**：手动 smoke 验证 spec §9.3 的 7 步；roadmap phase 2 行标记 ✅ DONE。

**Files:**
- Edit: `docs/refactor-roadmap.md`

- [ ] **Step 1: smoke S1-S6 顺跑**

按 spec §9.3 在 dataAssets 项目跑：

```bash
mkdir -p workspace/dataAssets/prds/202604
cat > workspace/dataAssets/prds/202604/smoke-discuss.md <<'EOF'
---
requirement_id: 99999
requirement_name: 烟雾测试需求
---

# 烟雾测试需求
EOF

# S1
bun run .claude/scripts/discuss.ts init --project dataAssets \
  --prd workspace/dataAssets/prds/202604/smoke-discuss.md

# S2
bun run .claude/scripts/discuss.ts append-clarify --project dataAssets \
  --prd workspace/dataAssets/prds/202604/smoke-discuss.md \
  --content '{"id":"Q1","severity":"blocking_unknown","question":"是否启用审计日志？","location":"配置 → 审计","recommended_option":"A","options":[{"id":"A","description":"启用"},{"id":"B","description":"禁用"}],"user_answer":{"selected_option":"A","value":"启用","answered_at":"2026-04-18T12:00:00+08:00"}}'

# S3
bun run .claude/scripts/discuss.ts complete --project dataAssets \
  --prd workspace/dataAssets/prds/202604/smoke-discuss.md

# S4
bun run .claude/scripts/discuss.ts read --project dataAssets \
  --prd workspace/dataAssets/prds/202604/smoke-discuss.md \
  | jq '.frontmatter.status, .frontmatter.resume_anchor'

# S5
bun run .claude/scripts/discuss.ts reset --project dataAssets \
  --prd workspace/dataAssets/prds/202604/smoke-discuss.md
ls workspace/dataAssets/prds/202604/ | grep -E "smoke-discuss\.plan(\.[^/]+)?\.md$"

# S6
rm -f workspace/dataAssets/prds/202604/smoke-discuss*
```

记录每步 exit code / stdout 摘要到 commit message。

- [ ] **Step 2: S7 兼容验证**

跳过：transform-agent 兼容验证依赖真实 PRD 与外部 fetch，留给后续真实需求触发；本期仅在 transform-agent.md 中明文要求"plan.md 缺失时回退到 legacy 行为"，不强制 smoke。

- [ ] **Step 3: 全量单测**

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：`>= 636 pass / 0 fail`。

- [ ] **Step 4: roadmap 更新**

在 `docs/refactor-roadmap.md` 阶段索引表中：

```
| **2** | PRD 需求讨论阶段（目标 1.1） | ✅ DONE | [`2026-04-18-prd-discussion-design.md`](refactor/specs/2026-04-18-prd-discussion-design.md) | 主 agent 主持讨论 + plan.md 落盘 + transform 简化 |
```

- [ ] **Commit:**

```
docs(phase2): mark phase 2 done in roadmap
```

---

## 完成标准

- [ ] Task 1-11 全部 checkbox 已勾
- [ ] `bun test ./.claude/scripts/__tests__` ≥ 636 pass / 0 fail
- [ ] smoke S1–S6 全通过
- [ ] roadmap phase 2 标 ✅ DONE
- [ ] git log 含至少 11 个 phase2 atomic commit
- [ ] 主 agent 在最后一条用户消息生成"phase 3 启动 prompt"（UI 自动化 / 目标 1.3），并提示用户 `/clear` 或新开 CC 实例继续
