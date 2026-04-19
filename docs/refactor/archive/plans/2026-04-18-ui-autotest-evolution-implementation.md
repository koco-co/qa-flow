# UI Autotest Evolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不重构 9 节点主干的前提下，把 ui-autotest 的 4 类痛点固化：(1) 新增 `pattern-analyzer-agent` + SKILL.md 步骤 5.5 共性收敛；(2) Allure 完全替换 monocart-reporter；(3) session 多项目隔离；(4) `tests/helpers/test-setup.ts` 633 行拆 5 文件。

**Architecture:** 五大改动栈彼此独立可分批 commit。pattern-analyzer-agent 是新 haiku agent，主 agent 调度其在步骤 5.5 完成"探路 → 分析 → 应用 → 收敛"流程。Allure 替换通过 `playwright.config.ts` 的 reporter 切换 + `package.json` 加依赖完成。Session 路径 `.auth/{project}/session-{env}.json` 由 `playwright.config.ts` 读 `QA_PROJECT` 拼接，旧 session 一次性迁移。Helpers 拆分用 `migrate-helpers-split.ts` 按函数名映射表自动路由，外部 import 路径完全兼容。

**Tech Stack:** Bun + TypeScript（同 phase 1/2），Playwright，Allure，Markdown for SKILL/agents/rules。

**Spec:** [`../specs/2026-04-18-ui-autotest-evolution-design.md`](../specs/2026-04-18-ui-autotest-evolution-design.md)

**Roadmap:** [`../../refactor-roadmap.md`](../../refactor-roadmap.md)

**Upstream Phases:** Phase 0 / 1 / 2 已完成；本期不依赖任何未完成 phase。

---

## 关键不变量（跨 Task 守护）

1. `bun test ./.claude/scripts/__tests__` 在每 Task 结束时全绿；基线 653 通过 + 本 phase 新增 ≥ 25 条
2. 9 节点主干（init / 1.5 续传 / 范围 / 登录态 / 脚本生成 / 自测修复 / 合并 / 回归 / 结果 / 通知）不动；新增的 5.5 共性收敛是子节点延伸
3. 不动 `script-writer-agent` / `bug-reporter-agent` / `frontend-bug-agent` / `backend-bug-agent` 的契约
4. 不动 `parse-cases.ts` / `merge-specs.ts`
5. 不动 `lib/playwright/` 任何函数实现（新函数走 phase 5）
6. 不动 `plugins/assets-sql-sync/`
7. 现有 spec 文件 `import { ... } from "../../helpers/test-setup"` 完全保留可工作（兼容层）
8. 旧 progress 文件无 `convergence_status` 时自动补默认 `skipped`，不抛错
9. 旧 `.auth/session-{env}.json` 文件存在时 playwright.config.ts 仍能 fallback 找到（兼容窗口）
10. CLI 输出契约：stdout JSON、stderr `[script-name] <msg>\n`、exit 0/1/2
11. 任何向 `workspace/<fixture>/` / `.auth/<fixture>/` 的测试目录写入的文件必须在 `after()` 中清理
12. 无硬编码绝对路径 / 凭证；仓库根用 `repoRoot()` 或 `import.meta.dirname` 计算
13. 每条 commit 仅一个语义改动，commit message 用 `feat(phase3): <desc>` / `refactor(phase3): <desc>` / `docs(phase3): <desc>` 格式，无 Co-Authored-By，不 push

---

## 文件布局

| 文件 | 动作 | 责任 |
|---|---|---|
| `docs/refactor/plans/2026-04-18-ui-autotest-evolution-implementation.md` | Create | 本 plan |
| `.claude/scripts/ui-autotest-progress.ts` | Edit | 新增 `convergence_status` / `convergence` 字段、自动补默认值 |
| `.claude/scripts/__tests__/ui-autotest-progress.test.ts` | Edit | 追加 convergence schema 测试 |
| `.claude/references/output-schemas.json` | Edit | 新增 `pattern_analyzer_input` / `pattern_analyzer_output` schema |
| `.claude/agents/pattern-analyzer-agent.md` | Create | 新 haiku 级 agent，识别共性 + 输出 helpers diff |
| `.claude/agents/script-fixer-agent.md` | Edit | 输入加 `helpers_locked`，输出加 `helpers_modified`，新增第 6 修复原则 |
| `.claude/scripts/migrate-session-paths.ts` | Create | 一次性迁移 `.auth/session-*.json` → `.auth/{project}/session-*.json` |
| `.claude/scripts/__tests__/migrate-session-paths.test.ts` | Create | 单测 |
| `.claude/scripts/migrate-helpers-split.ts` | Create | 一次性拆 `tests/helpers/test-setup.ts` 为 5 文件 |
| `.claude/scripts/__tests__/migrate-helpers-split.test.ts` | Create | 单测 |
| `package.json` | Edit | 加 `allure-playwright` + `allure-commandline` devDependencies |
| `playwright.config.ts` | Edit | reporter 切 Allure、sessionPath 加 project 段（含旧路径 fallback） |
| `.claude/scripts/plugin-loader.ts` | Edit | notify event=ui-test-completed 的 reportFile 描述同步（Allure 路径） |
| `.claude/skills/ui-autotest/scripts/session-login.ts` | Edit | 新增 `--project` 参数、output 默认路径加 project 段 |
| `workspace/dataAssets/tests/helpers/env-setup.ts` | Create | 由 migrate 脚本生成 |
| `workspace/dataAssets/tests/helpers/batch-sql.ts` | Create | 同上 |
| `workspace/dataAssets/tests/helpers/metadata-sync.ts` | Create | 同上 |
| `workspace/dataAssets/tests/helpers/quality-project.ts` | Create | 同上 |
| `workspace/dataAssets/tests/helpers/index.ts` | Create | barrel re-export |
| `workspace/dataAssets/tests/helpers/test-setup.ts` | Edit | 改为兼容层 `export * from "./index"` |
| `.claude/skills/ui-autotest/SKILL.md` | Edit | 新增步骤 5.5、调整步骤 3/7/8/9、任务可视化、顶部 `convergence_threshold` 配置 |
| `docs/refactor-roadmap.md` | Edit (last) | phase 3 标 ✅ DONE + spec/plan 链接 |

---

## Task 1：progress schema 升级

**目的**：在 `ui-autotest-progress.ts` 加入 `convergence_status` 与 `convergence` 字段，read 时旧文件自动补默认值；CLI `update` 支持新字段写入。

**Files:**
- Edit: `.claude/scripts/ui-autotest-progress.ts`
- Edit: `.claude/scripts/__tests__/ui-autotest-progress.test.ts`

- [ ] **Step 1: 记录基线测试数**

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：`653 pass / 0 fail`。如基线偏差，停止报告。

- [ ] **Step 2: 在 ui-autotest-progress.ts 顶部 Types 区追加新类型**

在文件 ~33 行（`type MergeStatus` 之后）追加：

```typescript
type ConvergenceStatus = "skipped" | "active" | "completed";

interface ConvergencePattern {
  readonly id: string;
  readonly summary: string;
  readonly helper_target: string;
  readonly diff_kind: "patch" | "add_function" | "rewrite";
  readonly applied: boolean;
  readonly confidence: "high" | "medium" | "low";
}

interface ConvergenceState {
  readonly triggered_at?: string;
  readonly probe_attempts: readonly string[];
  readonly common_patterns: readonly ConvergencePattern[];
  readonly completed_at?: string;
}
```

并把 `Progress` interface 加上两个可选字段：

```typescript
interface Progress {
  // ... 现有字段保留不变
  readonly convergence_status?: ConvergenceStatus;
  readonly convergence?: ConvergenceState;
}
```

- [ ] **Step 3: readProgress 自动补默认值**

在 `readProgress` 函数（~112 行）的 `parsed as unknown as Progress` 返回点改为通过 `applyConvergenceDefaults`：

```typescript
function applyConvergenceDefaults(progress: Progress): Progress {
  if (progress.convergence_status !== undefined) return progress;
  return { ...progress, convergence_status: "skipped" };
}
```

将 `readProgress` 内 `if (!needsMigration) return parsed as unknown as Progress;` 替换为：

```typescript
if (!needsMigration) return applyConvergenceDefaults(parsed as unknown as Progress);
```

迁移分支末尾 `return { ...(parsed as unknown as Progress), cases: migratedCases };` 替换为：

```typescript
return applyConvergenceDefaults({
  ...(parsed as unknown as Progress),
  cases: migratedCases,
});
```

- [ ] **Step 4: update 命令允许 convergence_status / convergence 字段**

在 `update` 命令的 `coerce` 函数（~280 行附近）追加分支：

```typescript
if (field === "convergence_status") {
  const allowed = ["skipped", "active", "completed"];
  if (!allowed.includes(raw)) {
    throw new Error(`convergence_status must be one of ${allowed.join(",")}`);
  }
  return raw;
}
if (field === "convergence") {
  return JSON.parse(raw);
}
```

并放行写入：当前 update 函数应该已经接受任意 top-level 字段名；如果有白名单守卫，把 `convergence_status` / `convergence` 添加到允许列表（取决于现有代码模式，现读后调整）。

- [ ] **Step 5: 测试 — 旧文件兼容**

在 `ui-autotest-progress.test.ts` 追加 `describe("convergence schema")`：

```typescript
describe("convergence schema", () => {
  const fixtureProject = "convergence-fixture";
  const fixtureSuite = "schema-suite";

  afterEach(() => {
    rmSync(join(repoRoot(), "workspace", fixtureProject), {
      recursive: true,
      force: true,
    });
  });

  test("旧 progress 文件无 convergence_status 时自动补默认 skipped", () => {
    // 手工写一个无 convergence_status 的 progress.json
    const progressPath = join(
      tempDir(fixtureProject),
      `ui-autotest-progress-${slugify(fixtureSuite)}.json`,
    );
    mkdirSync(dirname(progressPath), { recursive: true });
    writeFileSync(
      progressPath,
      JSON.stringify({
        version: 1,
        suite_name: fixtureSuite,
        archive_md: "x.md",
        url: "http://x",
        selected_priorities: ["P0"],
        output_dir: "x",
        started_at: "2026-04-18T00:00:00Z",
        updated_at: "2026-04-18T00:00:00Z",
        current_step: 4,
        preconditions_ready: false,
        cases: {},
        merge_status: "pending",
      }),
    );

    // 触发 read 通过 summary 命令
    const result = Bun.spawnSync({
      cmd: [
        "bun",
        "run",
        join(repoRoot(), ".claude/scripts/ui-autotest-progress.ts"),
        "summary",
        "--project",
        fixtureProject,
        "--suite",
        fixtureSuite,
      ],
      stdout: "pipe",
    });
    const summary = JSON.parse(result.stdout.toString());
    expect(summary.convergence_status).toBe("skipped");
  });

  test("update --field convergence_status --value active 写入成功", () => {
    // ... 创建 progress、跑 update、验证 read 后 convergence_status === "active"
  });

  test("update --field convergence_status --value invalid 拒绝", () => {
    // ... 创建 progress、跑 update with --value foo、验证 exit 1
  });

  test("update --field convergence --value '<json>' 写入嵌套对象成功", () => {
    // ... 创建 progress、跑 update with --value '{"probe_attempts":["t1"], "common_patterns": []}'、验证 read 后 convergence.probe_attempts[0] === "t1"
  });
});
```

实际编码时把每个测试的 fixture 创建/清理走 `before/after` 提炼通用 helper。补全各 test 内部的 spawnSync 与断言（参考 `discuss.test.ts` 现有模式）。

- [ ] **Step 6: 跑测试**

```bash
bun test ./.claude/scripts/__tests__/ui-autotest-progress.test.ts 2>&1 | tail -10
```

预期：含新增 4 条用例全绿。

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：`>= 657 pass / 0 fail`。

- [ ] **Step 7: Commit**

```bash
git add .claude/scripts/ui-autotest-progress.ts .claude/scripts/__tests__/ui-autotest-progress.test.ts
git -c commit.gpgsign=false commit -m "feat(phase3): add convergence schema to ui-autotest progress"
```

---

## Task 2：output-schemas.json 加 pattern_analyzer schema

**目的**：在 `.claude/references/output-schemas.json` 入库 pattern-analyzer-agent 的输入与输出 schema，作为 agent 与主 agent 的契约依据。

**Files:**
- Edit: `.claude/references/output-schemas.json`

- [ ] **Step 1: 在 JSON 顶层追加两段 schema**

在 `output-schemas.json` 末尾倒数 `}` 之前（保持 JSON 合法）追加：

```json
,
  "pattern_analyzer_input": {
    "_description": "pattern-analyzer-agent 的输入 schema（由 ui-autotest skill 步骤 5.5 装配）",
    "probe_summaries": [
      {
        "case_id": "string — 用例 ID（如 t1）",
        "case_title": "string — 用例标题",
        "fixer_attempts": "number — 探路 fixer 修复轮次",
        "final_status": "string — FIXED | STILL_FAILING",
        "summary": "string — fixer 自述本次修了什么、踩了什么坑（最多 1500 字）",
        "corrections": "object[] — fixer 收集的 archive MD 校正建议（与 script-fixer 现有 corrections 结构一致）"
      }
    ],
    "all_failure_signatures": [
      {
        "case_id": "string",
        "error_type": "string — timeout | locator | assertion | unknown",
        "stderr_last_5_lines": "string"
      }
    ],
    "helpers_inventory": {
      "_description": "当前 helpers 函数清单（路径 → 函数名数组）",
      "<helper_path>": "string[] — 该文件导出的函数名"
    }
  },

  "pattern_analyzer_output": {
    "_description": "pattern-analyzer-agent 的输出 schema（被主 agent 消费应用 helpers diff）",
    "common_patterns": [
      {
        "id": "string — 模式 ID（如 P1）",
        "summary": "string — 一句话描述共性",
        "evidence": "string[] — 至少 2 个 case_id 证据",
        "helper_target": "string — 必须在 helpers_inventory 中的路径",
        "function_name": "string — 目标函数名",
        "diff_kind": "string — patch | add_function | rewrite",
        "diff_suggestion": "string — 改动描述（自然语言或代码片段）",
        "confidence": "string — high | medium | low"
      }
    ],
    "no_common_pattern_cases": "string[] — 个例失败 case_id 列表",
    "skip_reason": "string — 整批个例时返回 'all_individual'，否则缺省"
  }
```

- [ ] **Step 2: 验证 JSON 仍合法**

```bash
bun -e "JSON.parse(require('fs').readFileSync('.claude/references/output-schemas.json','utf8')); console.log('OK')"
```

预期：`OK`。

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：基线维持，无回归。

- [ ] **Step 3: Commit**

```bash
git add .claude/references/output-schemas.json
git -c commit.gpgsign=false commit -m "feat(phase3): add pattern_analyzer input/output schemas"
```

---

## Task 3：pattern-analyzer-agent.md 创建

**目的**：在 `.claude/agents/` 入库新 agent，model haiku，单一职责"读多份 fixer summary → 输出 common_patterns + helpers diff 建议"。

**Files:**
- Create: `.claude/agents/pattern-analyzer-agent.md`

- [ ] **Step 1: 创建 agent markdown**

写入 `.claude/agents/pattern-analyzer-agent.md`：

````markdown
---
name: pattern-analyzer-agent
description: "Pattern Analyzer Agent。读多份 script-fixer summary 归纳共性失败模式，输出结构化 helpers diff 建议。由 ui-autotest skill 步骤 5.5 派发。"
model: haiku
tools: Read, Grep, Glob
---

<role>
你是测试失败模式归纳专家。给定 1-2 份探路 fixer 的修复 summary 与所有失败用例的精简签名，识别"多个 case 共同踩到同一个 helper bug"的模式，并给出 helpers diff 建议供主 agent 应用。

> 本 Agent 由 ui-autotest skill 步骤 5.5「共性收敛」派发，每次只跑一次。
> 你**只输出结构化结论**，不写代码、不修改任何文件、不调任何 Bash 命令（除非 Read/Grep/Glob 用于查证 helpers 现状）。
</role>

<output_contract>
返回 JSON 对象，结构参见 `.claude/references/output-schemas.json` 中的 `pattern_analyzer_output`。

```json
{
  "common_patterns": [
    {
      "id": "P1",
      "summary": "Ant Select 虚拟滚动下 fallback 不触发",
      "evidence": ["t1", "t2", "t10", "t16"],
      "helper_target": "lib/playwright/ant-interactions.ts",
      "function_name": "selectAntOption",
      "diff_kind": "patch",
      "diff_suggestion": "fallback 分支增加 await page.waitForTimeout(300) 等待虚拟列表渲染",
      "confidence": "high"
    }
  ],
  "no_common_pattern_cases": ["t8"],
  "skip_reason": ""
}
```

整批都是个例时返回 `{"common_patterns": [], "no_common_pattern_cases": [...], "skip_reason": "all_individual"}`。
</output_contract>

---

## 输入

你将收到一段 JSON，结构参见 `pattern_analyzer_input` schema：

```json
{
  "probe_summaries": [
    {
      "case_id": "t1",
      "case_title": "...",
      "fixer_attempts": 2,
      "final_status": "FIXED",
      "summary": "...",
      "corrections": [...]
    }
  ],
  "all_failure_signatures": [
    {
      "case_id": "t10",
      "error_type": "timeout",
      "stderr_last_5_lines": "..."
    }
  ],
  "helpers_inventory": {
    "lib/playwright/ant-interactions.ts": ["selectAntOption", "expectAntMessage", ...],
    "workspace/dataAssets/tests/helpers/batch-sql.ts": [...]
  }
}
```

---

## 评估规则（必须遵守）

1. **共性证据数 ≥ 2**：一个 pattern 必须有至少 2 个 case 提供证据；只有 1 个 case 的归到 `no_common_pattern_cases`
2. **helper_target 必须在 helpers_inventory 中**：禁止建议改 spec 文件、禁止建议改不存在的文件
3. **function_name 必须在 helpers_inventory[helper_target] 中**（diff_kind=add_function 时除外）
4. **diff_kind 取值**：
   - `patch` → 既有函数小改（主 agent 直接 Edit）
   - `add_function` → 新增辅助函数（主 agent 在目标文件追加）
   - `rewrite` → 函数全量重写（主 agent 评估后决定是否拒绝）
5. **confidence 评级**：
   - `high` — ≥ 3 个 case 证据 + 错误签名高度一致
   - `medium` — 2 个 case 证据，错误签名相似但具体表现略不同
   - `low` — 推断性结论（如根据 stderr 关键字猜测）；主 agent 会用 AskUserQuestion 找用户拨
6. **diff_suggestion 必须可操作**：自然语言描述要能映射到具体代码改动，不允许"改进 helper"这种空话
7. **skip_reason 仅在整批个例时填**："all_individual"

---

## 工作流程

1. 读 `helpers_inventory`，建立可用 helper 列表
2. 对每份 `probe_summaries[i].summary` 抽取"修了什么 / 踩了什么坑"
3. 对每条 `all_failure_signatures[j]`，按 `error_type` 分组
4. 比对探路 fixer 踩到的坑与剩余失败签名，识别共性
5. 必要时用 Grep 工具读 helper 源码（如 `Grep "selectAntOption" lib/playwright/`）确认 diff 建议方向
6. 输出 JSON

---

## 禁止行为

- ❌ 不写代码：不输出实际的 TypeScript 改动，只输出自然语言 `diff_suggestion`
- ❌ 不修改文件：不调用 Edit / Write
- ❌ 不超过 3 个 pattern：超过则归并到最相关的 3 个
- ❌ 不发明 case_id：所有 evidence 必须来自输入数据
- ❌ 不评估"业务逻辑 bug"：那归 fixer 的 corrections，不是 helpers 共性

---

## 质量要求

1. 输出必须是合法 JSON，能被 `JSON.parse` 解析
2. 字段名严格按 `pattern_analyzer_output` schema
3. 中文 / 英文混用允许，但 case_id 必须英数字
4. 每个 pattern 的 evidence 列表无重复
````

- [ ] **Step 2: 验证 frontmatter 与 schema 引用一致**

```bash
grep -n "pattern_analyzer" .claude/references/output-schemas.json
grep -n "pattern_analyzer" .claude/agents/pattern-analyzer-agent.md
```

预期：两个文件互相引用一致。

- [ ] **Step 3: 跑全量单测确认无回归**

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：基线维持。

- [ ] **Step 4: Commit**

```bash
git add .claude/agents/pattern-analyzer-agent.md
git -c commit.gpgsign=false commit -m "feat(phase3): add pattern-analyzer-agent for fixer convergence"
```

---

## Task 4：script-fixer-agent.md 升级

**目的**：input 加 `helpers_locked: bool` 字段，output 加 `helpers_modified: string[]`，新增第 6 修复原则约束 helpers 修改。

**Files:**
- Edit: `.claude/agents/script-fixer-agent.md`

- [ ] **Step 1: 在「输入」段追加 helpers_locked 字段**

找到 `## 输入` 段的列表（第 21-30 行附近），追加一行：

```markdown
- `helpers_locked`：布尔值。`true` 时禁止修改 `tests/helpers/` 与 `lib/playwright/` 下任何文件；`false` 时（探路阶段）允许修改 helpers 用于诊断
```

- [ ] **Step 2: 修改 output_contract 段**

找到 `<output_contract>` 段，在末尾追加一句：

```markdown
返回 JSON 中必须包含 `helpers_modified: string[]` 字段，列出本次修复修改的 helpers 文件路径（含 `tests/helpers/*` 与 `lib/playwright/*`）。无修改时为空数组。主 agent 用此字段审计是否遵守 `helpers_locked` 约束。
```

- [ ] **Step 3: 在「修复原则」段追加第 6 条**

找到 `## 修复原则` 段（第 84 行附近），在末尾追加：

```markdown
6. **helpers_locked 守约**：当输入 `helpers_locked=true` 时，**禁止**修改以下路径下任何文件：
   - `workspace/{project}/tests/helpers/`
   - `lib/playwright/`

   只能修改 `script_path` 单文件本身（spec / .ts）。如发现共性 helper bug 也只能在 `corrections` 中描述，由后续主 agent 处理。

   返回 `helpers_modified: []` 表示遵守；返回非空数组将触发主 agent 拒绝采纳本次修复。
```

- [ ] **Step 4: 校验文件结构无破坏**

```bash
head -20 .claude/agents/script-fixer-agent.md
wc -l .claude/agents/script-fixer-agent.md
```

预期：frontmatter 完整、行数从 ~89 增到 ~105 左右。

- [ ] **Step 5: Commit**

```bash
git add .claude/agents/script-fixer-agent.md
git -c commit.gpgsign=false commit -m "feat(phase3): add helpers_locked contract to script-fixer-agent"
```

---

## Task 5：migrate-session-paths.ts CLI + 单测

**目的**：一次性迁移 `.auth/session-{env}.json` → `.auth/{project}/session-{env}.json`。脚本幂等、目标已存在不覆盖、源文件保留并 stderr warning。

**Files:**
- Create: `.claude/scripts/migrate-session-paths.ts`
- Create: `.claude/scripts/__tests__/migrate-session-paths.test.ts`

- [ ] **Step 1: 创建 CLI 脚本**

写入 `.claude/scripts/migrate-session-paths.ts`：

```typescript
#!/usr/bin/env bun
/**
 * migrate-session-paths.ts — 一次性迁移 .auth/session-{env}.json 到 .auth/{project}/session-{env}.json
 *
 * Usage:
 *   bun run .claude/scripts/migrate-session-paths.ts                # 自动按 defaultProject 迁移
 *   bun run .claude/scripts/migrate-session-paths.ts --project xyzh # 显式指定目标 project
 *   bun run .claude/scripts/migrate-session-paths.ts --dry-run      # 仅打印计划，不实际移动
 *
 * 行为：
 *   - 扫描 .auth/session-*.json（旧格式）
 *   - 移动到 .auth/{project}/session-*.json（新格式）
 *   - 目标已存在不覆盖，源文件保留并 stderr warning
 *   - 幂等：重复跑不出错
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { Command } from "commander";

interface MigrationResult {
  readonly source: string;
  readonly target: string;
  readonly action: "moved" | "skipped_target_exists" | "dry_run";
}

function repoRoot(): string {
  // 仓库根 = 本脚本所在 .claude/scripts 目录的上两层
  return join(import.meta.dirname, "../..");
}

function resolveProject(opts: { project?: string }): string {
  if (opts.project) return opts.project;

  // 读 config.json 顶层 defaultProject
  const configPath = join(repoRoot(), "config.json");
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(
        require("node:fs").readFileSync(configPath, "utf8"),
      ) as { defaultProject?: string };
      if (config.defaultProject) return config.defaultProject;
    } catch {
      // ignore
    }
  }

  // workspace 子目录数 = 1 时取该项目
  const workspaceDir = join(repoRoot(), "workspace");
  if (existsSync(workspaceDir)) {
    const subdirs = readdirSync(workspaceDir).filter(
      (name) =>
        !name.startsWith(".") && statSync(join(workspaceDir, name)).isDirectory(),
    );
    if (subdirs.length === 1) return subdirs[0];
    if (subdirs.length === 0) {
      throw new Error("No project found in workspace/ — pass --project explicitly");
    }
    throw new Error(
      `Multiple projects found in workspace/: ${subdirs.join(", ")}. Pass --project explicitly.`,
    );
  }

  throw new Error("workspace/ directory not found");
}

export function planMigration(
  authDir: string,
  project: string,
): MigrationResult[] {
  if (!existsSync(authDir)) return [];

  const entries = readdirSync(authDir).filter(
    (name) =>
      name.startsWith("session-") &&
      name.endsWith(".json") &&
      statSync(join(authDir, name)).isFile(),
  );

  return entries.map((name) => {
    const source = join(authDir, name);
    const target = join(authDir, project, name);
    const action: MigrationResult["action"] = existsSync(target)
      ? "skipped_target_exists"
      : "moved";
    return { source, target, action };
  });
}

export function applyMigration(
  plan: readonly MigrationResult[],
  options: { dryRun: boolean },
): readonly MigrationResult[] {
  const results: MigrationResult[] = [];
  for (const item of plan) {
    if (options.dryRun) {
      results.push({ ...item, action: "dry_run" });
      continue;
    }
    if (item.action === "skipped_target_exists") {
      process.stderr.write(
        `[migrate-session-paths] target exists, skipping: ${item.target}\n`,
      );
      results.push(item);
      continue;
    }
    mkdirSync(dirname(item.target), { recursive: true });
    renameSync(item.source, item.target);
    results.push(item);
  }
  return results;
}

const program = new Command();

program
  .name("migrate-session-paths")
  .description(
    "Migrate .auth/session-*.json (legacy) to .auth/{project}/session-*.json (multi-project layout)",
  )
  .option("--project <name>", "Target project (default: auto-detect)")
  .option("--dry-run", "Print migration plan without applying", false)
  .action((opts: { project?: string; dryRun: boolean }) => {
    let project: string;
    try {
      project = resolveProject(opts);
    } catch (err) {
      process.stderr.write(`[migrate-session-paths] ${err}\n`);
      process.exit(1);
    }

    const authDir = join(repoRoot(), ".auth");
    const plan = planMigration(authDir, project);

    if (plan.length === 0) {
      process.stdout.write(
        `${JSON.stringify({ project, migrations: [], message: "no legacy session files" }, null, 2)}\n`,
      );
      return;
    }

    const results = applyMigration(plan, { dryRun: opts.dryRun });

    process.stdout.write(
      `${JSON.stringify({ project, migrations: results }, null, 2)}\n`,
    );
  });

program.parse(process.argv);
```

- [ ] **Step 2: 创建单测**

写入 `.claude/scripts/__tests__/migrate-session-paths.test.ts`：

```typescript
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  applyMigration,
  planMigration,
} from "../migrate-session-paths.ts";

const repoRoot = join(import.meta.dirname, "../../..");
const fixtureAuth = join(repoRoot, ".auth-test-fixture");

describe("migrate-session-paths", () => {
  beforeEach(() => {
    rmSync(fixtureAuth, { recursive: true, force: true });
    mkdirSync(fixtureAuth, { recursive: true });
  });

  afterEach(() => {
    rmSync(fixtureAuth, { recursive: true, force: true });
  });

  test("planMigration returns empty when authDir absent", () => {
    expect(planMigration(join(repoRoot, ".auth-nope"), "dataAssets")).toEqual(
      [],
    );
  });

  test("planMigration finds legacy session files", () => {
    writeFileSync(join(fixtureAuth, "session-ltqcdev.json"), "{}");
    writeFileSync(join(fixtureAuth, "session-ci63.json"), "{}");
    const plan = planMigration(fixtureAuth, "dataAssets");
    expect(plan.length).toBe(2);
    expect(plan[0].action).toBe("moved");
    expect(plan[0].target).toContain("dataAssets/session-");
  });

  test("planMigration marks skipped when target exists", () => {
    writeFileSync(join(fixtureAuth, "session-ltqcdev.json"), "{}");
    mkdirSync(join(fixtureAuth, "dataAssets"), { recursive: true });
    writeFileSync(
      join(fixtureAuth, "dataAssets", "session-ltqcdev.json"),
      "{}",
    );
    const plan = planMigration(fixtureAuth, "dataAssets");
    expect(plan[0].action).toBe("skipped_target_exists");
  });

  test("applyMigration in dry-run does not move files", () => {
    writeFileSync(join(fixtureAuth, "session-x.json"), "{}");
    const plan = planMigration(fixtureAuth, "dataAssets");
    const results = applyMigration(plan, { dryRun: true });
    expect(results[0].action).toBe("dry_run");
    expect(existsSync(join(fixtureAuth, "session-x.json"))).toBe(true);
    expect(
      existsSync(join(fixtureAuth, "dataAssets", "session-x.json")),
    ).toBe(false);
  });

  test("applyMigration actually moves files", () => {
    writeFileSync(join(fixtureAuth, "session-x.json"), "{}");
    const plan = planMigration(fixtureAuth, "dataAssets");
    applyMigration(plan, { dryRun: false });
    expect(existsSync(join(fixtureAuth, "session-x.json"))).toBe(false);
    expect(
      existsSync(join(fixtureAuth, "dataAssets", "session-x.json")),
    ).toBe(true);
  });

  test("applyMigration is idempotent — second run no-op", () => {
    writeFileSync(join(fixtureAuth, "session-x.json"), "{}");
    applyMigration(planMigration(fixtureAuth, "dataAssets"), {
      dryRun: false,
    });
    const plan2 = planMigration(fixtureAuth, "dataAssets");
    expect(plan2.length).toBe(0);
  });
});
```

注意：测试只对 `applyMigration` / `planMigration` 纯函数做断言，使用 `.auth-test-fixture` 临时目录而非真实 `.auth/`。

- [ ] **Step 3: 跑测试**

```bash
bun test ./.claude/scripts/__tests__/migrate-session-paths.test.ts 2>&1 | tail -10
```

预期：6 条用例全绿。

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：`>= 663 pass / 0 fail`。

- [ ] **Step 4: Commit**

```bash
git add .claude/scripts/migrate-session-paths.ts .claude/scripts/__tests__/migrate-session-paths.test.ts
git -c commit.gpgsign=false commit -m "feat(phase3): add migrate-session-paths CLI for multi-project session"
```

---

## Task 6：migrate-helpers-split.ts CLI + 单测

**目的**：一次性把 `workspace/{project}/tests/helpers/test-setup.ts`（633 行）按已知函数名映射表拆分到 5 个文件，原 `test-setup.ts` 改为兼容层。

**Files:**
- Create: `.claude/scripts/migrate-helpers-split.ts`
- Create: `.claude/scripts/__tests__/migrate-helpers-split.test.ts`

- [ ] **Step 1: 设计函数 → 目标文件映射表**

在脚本顶部定义（与 spec §9.2 一致）：

```typescript
// 函数名 → 目标文件 的固定映射
const FUNCTION_TO_FILE: Record<string, string> = {
  // env-setup.ts
  getEnv: "env-setup.ts",
  normalizeBaseUrl: "env-setup.ts",
  normalizeDataAssetsBaseUrl: "env-setup.ts",
  normalizeOfflineBaseUrl: "env-setup.ts",
  buildDataAssetsUrl: "env-setup.ts",
  buildOfflineUrl: "env-setup.ts",
  applyRuntimeCookies: "env-setup.ts",

  // batch-sql.ts
  selectBatchProject: "batch-sql.ts",
  executeSqlViaBatchDoris: "batch-sql.ts",
  executeSqlSequenceViaBatchDoris: "batch-sql.ts",
  // 内部 helper：openBatchDorisEditor / runSqlInCurrentBatchEditor / confirmBatchDdlModal 自动归到 batch-sql.ts

  // metadata-sync.ts
  syncMetadata: "metadata-sync.ts",

  // quality-project.ts
  getAccessibleProjectIds: "quality-project.ts",
  getQualityProjectId: "quality-project.ts",
};

const PRIVATE_HELPER_TARGETS: Record<string, string> = {
  openBatchDorisEditor: "batch-sql.ts",
  runSqlInCurrentBatchEditor: "batch-sql.ts",
  confirmBatchDdlModal: "batch-sql.ts",
  // 后续若发现 metadata-sync.ts 内部有私有 helper（如 readSyncErrorText）也加这里
};
```

- [ ] **Step 2: 写主迁移逻辑**

完整脚本框架：

```typescript
#!/usr/bin/env bun
/**
 * migrate-helpers-split.ts — 一次性拆 workspace/{project}/tests/helpers/test-setup.ts 为 5 个职责文件
 *
 * Usage:
 *   bun run .claude/scripts/migrate-helpers-split.ts                # 扫描所有 workspace/* 项目
 *   bun run .claude/scripts/migrate-helpers-split.ts --project dataAssets  # 仅迁移指定项目
 *   bun run .claude/scripts/migrate-helpers-split.ts --dry-run      # 仅打印计划
 *
 * 行为：
 *   - 解析 test-setup.ts 中的所有 export 函数和 private helper 函数
 *   - 按 FUNCTION_TO_FILE / PRIVATE_HELPER_TARGETS 映射表分组
 *   - 写入 5 个目标文件，保留原 import / re-export
 *   - 改写 test-setup.ts 为兼容层（仅 export * from "./index"）
 *   - 生成 index.ts barrel
 *   - 幂等：检测到已经拆分过则 skip
 *   - 跑 tsc --noEmit 校验
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { Command } from "commander";

const FUNCTION_TO_FILE: Record<string, string> = { /* 见 Step 1 */ };
const PRIVATE_HELPER_TARGETS: Record<string, string> = { /* 见 Step 1 */ };

const ALL_TARGETS = [
  "env-setup.ts",
  "batch-sql.ts",
  "metadata-sync.ts",
  "quality-project.ts",
];

interface ParsedFunction {
  readonly name: string;
  readonly isExported: boolean;
  readonly source: string;  // 完整函数源码（含 leading comment / type 前缀）
  readonly startLine: number;
  readonly endLine: number;
}

interface ParsedSetup {
  readonly imports: readonly string[];           // 顶部 import 语句
  readonly typeAliases: readonly string[];       // type 定义（如 RuntimeEnv）
  readonly reExports: readonly string[];         // 现有 re-export from lib/playwright
  readonly functions: readonly ParsedFunction[];
}

function repoRoot(): string {
  return join(import.meta.dirname, "../..");
}

export function parseTestSetup(source: string): ParsedSetup {
  // 实现要点：
  // - 用正则 / 简单状态机识别 import / type / function declarations
  // - 处理 export function / async function / 默认 function / arrow function 赋值给 const
  // - 保留每个函数前的 JSDoc 注释（向上找到首个非空非注释行作为 startLine）
  // - 收集顶部 re-export from "../../../../lib/playwright/index"
  // - 不处理 default export（test-setup 当前无）
  // 参考实现略；测试驱动开发时先写 test，再实现 parser
  throw new Error("not implemented — see TDD steps below");
}

export function planSplit(
  parsed: ParsedSetup,
): Map<string, ParsedFunction[]> {
  // 按 FUNCTION_TO_FILE / PRIVATE_HELPER_TARGETS 把 functions 分组
  const groups = new Map<string, ParsedFunction[]>();
  for (const target of ALL_TARGETS) groups.set(target, []);

  for (const fn of parsed.functions) {
    const target =
      FUNCTION_TO_FILE[fn.name] ?? PRIVATE_HELPER_TARGETS[fn.name];
    if (!target) {
      throw new Error(
        `Unmapped function: ${fn.name}. Add to FUNCTION_TO_FILE or PRIVATE_HELPER_TARGETS in migrate-helpers-split.ts`,
      );
    }
    groups.get(target)!.push(fn);
  }

  return groups;
}

export function renderTargetFile(
  target: string,
  imports: readonly string[],
  functions: readonly ParsedFunction[],
): string {
  const header = `/**\n * ${target.replace(".ts", "")} — 由 migrate-helpers-split.ts 拆分自 test-setup.ts\n */\n`;
  const importBlock = imports.join("\n");
  const fnBlock = functions.map((f) => f.source).join("\n\n");
  return `${header}\n${importBlock}\n\n${fnBlock}\n`;
}

export function renderIndexBarrel(): string {
  return `/**
 * tests/helpers/index.ts — barrel re-export
 */

// 共享库（lib/playwright）
export * from "../../../../lib/playwright/index";

// 项目级 helpers
export * from "./env-setup";
export * from "./batch-sql";
export * from "./metadata-sync";
export * from "./quality-project";
`;
}

export function renderCompatibilityShim(): string {
  return `/**
 * test-setup.ts — 兼容层（保留旧 import 路径）
 *
 * 实际内容已拆分到 env-setup.ts / batch-sql.ts / metadata-sync.ts / quality-project.ts。
 * 通过 index.ts barrel re-export，保持外部 \`from "../../helpers/test-setup"\` 兼容。
 *
 * 物理删除留给 phase 6（命名迁移）。
 */
export * from "./index";
`;
}

const program = new Command();

program
  .name("migrate-helpers-split")
  .description("Split tests/helpers/test-setup.ts into 5 responsibility files")
  .option("--project <name>", "Only migrate the given project (default: all)")
  .option("--dry-run", "Print plan without writing files", false)
  .action((opts: { project?: string; dryRun: boolean }) => {
    const workspaceDir = join(repoRoot(), "workspace");
    const projects = opts.project
      ? [opts.project]
      : readdirSync(workspaceDir).filter(
          (name) =>
            !name.startsWith(".") &&
            statSync(join(workspaceDir, name)).isDirectory(),
        );

    const summary: Array<{ project: string; status: string; files: string[] }> =
      [];

    for (const project of projects) {
      const setupPath = join(
        workspaceDir,
        project,
        "tests",
        "helpers",
        "test-setup.ts",
      );
      if (!existsSync(setupPath)) {
        summary.push({ project, status: "no-test-setup", files: [] });
        continue;
      }

      const source = readFileSync(setupPath, "utf8");
      // 幂等检测：兼容层只有几行 export *
      if (
        source.includes('export * from "./index"') &&
        source.split("\n").length < 30
      ) {
        summary.push({ project, status: "already-split", files: [] });
        continue;
      }

      const parsed = parseTestSetup(source);
      const groups = planSplit(parsed);

      if (opts.dryRun) {
        summary.push({
          project,
          status: "dry-run",
          files: [...groups.entries()].map(
            ([target, fns]) => `${target}: ${fns.map((f) => f.name).join(",")}`,
          ),
        });
        continue;
      }

      const helpersDir = join(workspaceDir, project, "tests", "helpers");
      for (const [target, fns] of groups.entries()) {
        const filePath = join(helpersDir, target);
        writeFileSync(
          filePath,
          renderTargetFile(target, parsed.imports, fns),
          "utf8",
        );
      }
      writeFileSync(join(helpersDir, "index.ts"), renderIndexBarrel(), "utf8");
      writeFileSync(setupPath, renderCompatibilityShim(), "utf8");

      summary.push({
        project,
        status: "split",
        files: [...ALL_TARGETS, "index.ts", "test-setup.ts"],
      });
    }

    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  });

program.parse(process.argv);
```

注意 `parseTestSetup` 的具体实现需要根据真实 `test-setup.ts` 内容微调（处理 `function` / `const = async` / `export const Type` 等）。

- [ ] **Step 3: 写单测（TDD — 先写 test，再实现 parser）**

写入 `.claude/scripts/__tests__/migrate-helpers-split.test.ts`：

```typescript
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  parseTestSetup,
  planSplit,
  renderIndexBarrel,
  renderCompatibilityShim,
} from "../migrate-helpers-split.ts";

const repoRoot = join(import.meta.dirname, "../../..");
const fixtureWorkspace = join(repoRoot, "workspace", "helpers-split-fixture");
const fixtureHelpers = join(fixtureWorkspace, "tests", "helpers");

describe("migrate-helpers-split parser", () => {
  test("parses single export function with JSDoc", () => {
    const source = `import type { Page } from "@playwright/test";

/**
 * Foo helper
 */
export function getEnv(name: string): string | undefined {
  return process.env[name];
}
`;
    const parsed = parseTestSetup(source);
    expect(parsed.imports.length).toBe(1);
    expect(parsed.functions.length).toBe(1);
    expect(parsed.functions[0].name).toBe("getEnv");
    expect(parsed.functions[0].isExported).toBe(true);
  });

  test("parses async function declaration", () => {
    const source = `import type { Page } from "@playwright/test";

export async function syncMetadata(page: Page): Promise<void> {
  await page.goto("x");
}
`;
    const parsed = parseTestSetup(source);
    expect(parsed.functions[0].name).toBe("syncMetadata");
  });

  test("parses private (non-exported) helper", () => {
    const source = `function confirmBatchDdlModal(page: Page): Promise<void> {
  return Promise.resolve();
}

export async function executeSqlViaBatchDoris(): Promise<void> {
  await confirmBatchDdlModal();
}
`;
    const parsed = parseTestSetup(source);
    const names = parsed.functions.map((f) => f.name);
    expect(names).toContain("confirmBatchDdlModal");
    expect(names).toContain("executeSqlViaBatchDoris");
    expect(parsed.functions.find((f) => f.name === "confirmBatchDdlModal")?.isExported).toBe(false);
  });

  test("preserves re-exports from lib/playwright as imports", () => {
    const source = `export {
  selectAntOption,
  expectAntMessage,
} from "../../../../lib/playwright/index";

export function getEnv(): void {}
`;
    const parsed = parseTestSetup(source);
    expect(parsed.reExports.length).toBeGreaterThan(0);
    expect(parsed.reExports[0]).toContain("lib/playwright");
  });
});

describe("migrate-helpers-split planSplit", () => {
  test("groups exported functions by FUNCTION_TO_FILE map", () => {
    const fakeParsed = {
      imports: [],
      typeAliases: [],
      reExports: [],
      functions: [
        { name: "getEnv", isExported: true, source: "...", startLine: 1, endLine: 3 },
        { name: "syncMetadata", isExported: true, source: "...", startLine: 5, endLine: 8 },
      ],
    };
    const groups = planSplit(fakeParsed);
    expect(groups.get("env-setup.ts")?.length).toBe(1);
    expect(groups.get("metadata-sync.ts")?.length).toBe(1);
    expect(groups.get("batch-sql.ts")?.length).toBe(0);
  });

  test("throws on unmapped function name", () => {
    const fakeParsed = {
      imports: [],
      typeAliases: [],
      reExports: [],
      functions: [
        { name: "newFunctionNoMapping", isExported: true, source: "...", startLine: 1, endLine: 3 },
      ],
    };
    expect(() => planSplit(fakeParsed)).toThrow(/Unmapped function/);
  });

  test("private helper goes to PRIVATE_HELPER_TARGETS", () => {
    const fakeParsed = {
      imports: [],
      typeAliases: [],
      reExports: [],
      functions: [
        { name: "confirmBatchDdlModal", isExported: false, source: "...", startLine: 1, endLine: 3 },
      ],
    };
    const groups = planSplit(fakeParsed);
    expect(groups.get("batch-sql.ts")?.length).toBe(1);
  });
});

describe("migrate-helpers-split rendering", () => {
  test("renderIndexBarrel includes all 4 targets + lib/playwright", () => {
    const out = renderIndexBarrel();
    expect(out).toContain("./env-setup");
    expect(out).toContain("./batch-sql");
    expect(out).toContain("./metadata-sync");
    expect(out).toContain("./quality-project");
    expect(out).toContain("../../../../lib/playwright/index");
  });

  test("renderCompatibilityShim is short and re-exports index", () => {
    const out = renderCompatibilityShim();
    expect(out).toContain('export * from "./index"');
    expect(out.split("\n").length).toBeLessThan(15);
  });
});

describe("migrate-helpers-split end-to-end (fixture project)", () => {
  beforeEach(() => {
    rmSync(fixtureWorkspace, { recursive: true, force: true });
    mkdirSync(fixtureHelpers, { recursive: true });
    writeFileSync(
      join(fixtureHelpers, "test-setup.ts"),
      `import type { Page } from "@playwright/test";

export {
  selectAntOption,
} from "../../../../lib/playwright/index";

export function getEnv(name: string): string | undefined {
  return process.env[name];
}

export async function syncMetadata(page: Page): Promise<void> {
  await page.goto("x");
}

export async function getAccessibleProjectIds(page: Page): Promise<number[]> {
  return [];
}

export async function executeSqlViaBatchDoris(page: Page, sql: string): Promise<void> {
  await Promise.resolve();
}
`,
    );
  });

  afterEach(() => {
    rmSync(fixtureWorkspace, { recursive: true, force: true });
  });

  test("CLI splits fixture into 4 + index + shim", () => {
    const result = Bun.spawnSync({
      cmd: [
        "bun",
        "run",
        join(repoRoot, ".claude/scripts/migrate-helpers-split.ts"),
        "--project",
        "helpers-split-fixture",
      ],
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(result.exitCode).toBe(0);

    expect(existsSync(join(fixtureHelpers, "env-setup.ts"))).toBe(true);
    expect(existsSync(join(fixtureHelpers, "batch-sql.ts"))).toBe(true);
    expect(existsSync(join(fixtureHelpers, "metadata-sync.ts"))).toBe(true);
    expect(existsSync(join(fixtureHelpers, "quality-project.ts"))).toBe(true);
    expect(existsSync(join(fixtureHelpers, "index.ts"))).toBe(true);

    const shim = readFileSync(join(fixtureHelpers, "test-setup.ts"), "utf8");
    expect(shim).toContain('export * from "./index"');

    const envSetup = readFileSync(join(fixtureHelpers, "env-setup.ts"), "utf8");
    expect(envSetup).toContain("export function getEnv");
  });

  test("CLI is idempotent on already-split project", () => {
    // 第一次跑
    Bun.spawnSync({
      cmd: [
        "bun",
        "run",
        join(repoRoot, ".claude/scripts/migrate-helpers-split.ts"),
        "--project",
        "helpers-split-fixture",
      ],
    });
    // 第二次跑
    const result = Bun.spawnSync({
      cmd: [
        "bun",
        "run",
        join(repoRoot, ".claude/scripts/migrate-helpers-split.ts"),
        "--project",
        "helpers-split-fixture",
      ],
      stdout: "pipe",
    });
    const summary = JSON.parse(result.stdout.toString());
    expect(summary[0].status).toBe("already-split");
  });
});
```

- [ ] **Step 4: 实现 parseTestSetup**

回到 `migrate-helpers-split.ts` 实现 `parseTestSetup`。简化思路（不引入 TS AST 库）：

```typescript
export function parseTestSetup(source: string): ParsedSetup {
  const lines = source.split("\n");
  const imports: string[] = [];
  const typeAliases: string[] = [];
  const reExports: string[] = [];
  const functions: ParsedFunction[] = [];

  // Phase A: collect top-level imports & re-exports & types
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("import ")) {
      // 处理多行 import { ... } from "..."
      let buffer = line;
      while (!buffer.includes("from ") && !buffer.includes(";")) {
        i++;
        buffer += "\n" + lines[i];
      }
      // 如果是 import 多行，包到 ;
      if (!buffer.endsWith(";") && !buffer.includes('";')) {
        while (!buffer.endsWith(";") && i + 1 < lines.length) {
          i++;
          buffer += "\n" + lines[i];
        }
      }
      imports.push(buffer);
      i++;
      continue;
    }
    if (line.startsWith("export {") || line.startsWith("export type {")) {
      // 处理 export { ... } from "..." (re-export)
      let buffer = line;
      while (!buffer.includes("from ") && i + 1 < lines.length) {
        i++;
        buffer += "\n" + lines[i];
      }
      while (!buffer.endsWith(";") && i + 1 < lines.length) {
        i++;
        buffer += "\n" + lines[i];
      }
      if (buffer.includes("from ")) {
        reExports.push(buffer);
      } else {
        // 不是 re-export 而是局部 export
        // 留待后续处理
      }
      i++;
      continue;
    }
    if (line.startsWith("type ") || line.startsWith("export type ")) {
      // 单行 type
      let buffer = line;
      while (!buffer.endsWith(";") && i + 1 < lines.length) {
        i++;
        buffer += "\n" + lines[i];
      }
      typeAliases.push(buffer);
      i++;
      continue;
    }

    // 函数定义识别
    const fnMatch = line.match(
      /^(export\s+)?(async\s+)?function\s+(\w+)\s*[\(<]/,
    );
    if (fnMatch) {
      const name = fnMatch[3];
      const isExported = !!fnMatch[1];
      // 找到函数体结束的 } — 通过 brace 计数
      const startLine = findStartLineWithJSDoc(lines, i);
      const endLine = findFunctionEnd(lines, i);
      const fnSource = lines.slice(startLine, endLine + 1).join("\n");
      functions.push({ name, isExported, source: fnSource, startLine, endLine });
      i = endLine + 1;
      continue;
    }

    i++;
  }

  return { imports, typeAliases, reExports, functions };
}

function findStartLineWithJSDoc(lines: string[], fnLine: number): number {
  // 向上找 JSDoc 注释起始
  let i = fnLine - 1;
  while (i >= 0 && lines[i].trim() === "") i--;
  if (i >= 0 && lines[i].trim().endsWith("*/")) {
    while (i >= 0 && !lines[i].trim().startsWith("/**")) i--;
    return i;
  }
  return fnLine;
}

function findFunctionEnd(lines: string[], startLine: number): number {
  let braceCount = 0;
  let started = false;
  for (let i = startLine; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === "{") {
        braceCount++;
        started = true;
      } else if (ch === "}") {
        braceCount--;
        if (started && braceCount === 0) return i;
      }
    }
  }
  return lines.length - 1;
}
```

> 注意：这个 parser 仅针对 `test-setup.ts` 当前的语法子集（function declarations，无 arrow function 顶层 export），有限制但够用。如果遇到不支持的语法 → 抛错让用户手工拆。

- [ ] **Step 5: 跑测试**

```bash
bun test ./.claude/scripts/__tests__/migrate-helpers-split.test.ts 2>&1 | tail -20
```

预期：所有 parser / planSplit / rendering / e2e 用例全绿。

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：`>= 675 pass / 0 fail`。

- [ ] **Step 6: Commit**

```bash
git add .claude/scripts/migrate-helpers-split.ts .claude/scripts/__tests__/migrate-helpers-split.test.ts
git -c commit.gpgsign=false commit -m "feat(phase3): add migrate-helpers-split CLI for tests/helpers refactor"
```

---

## Task 7：package.json 加 allure 依赖

**目的**：把 `allure-playwright` 与 `allure-commandline` 加到 devDependencies，运行 `bun install` 让锁文件同步。

**Files:**
- Edit: `package.json`

- [ ] **Step 1: 加依赖**

打开 `package.json`，在 `devDependencies` 段追加：

```json
"allure-playwright": "^2.15.0",
"allure-commandline": "^2.27.0"
```

- [ ] **Step 2: 跑 bun install**

```bash
bun install 2>&1 | tail -5
```

预期：依赖安装成功，无错误。

- [ ] **Step 3: 验证可执行**

```bash
ls node_modules/allure-playwright/dist 2>&1 | head -3
bunx allure --version 2>&1 | head -3
```

预期：两个命令都有输出（具体版本号视实际锁定为准）。

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lockb
git -c commit.gpgsign=false commit -m "chore(phase3): add allure-playwright and allure-commandline deps"
```

---

## Task 8：playwright.config.ts reporter 切换 + sessionPath 多项目

**目的**：把 reporter 从 `monocart-reporter` 切到 `allure-playwright`，sessionPath 加 project 段且兼容旧路径 fallback。

**Files:**
- Edit: `playwright.config.ts`

- [ ] **Step 1: 替换 reporter 段**

打开 `playwright.config.ts`，找到（约 53-75 行）：

```typescript
const reportDir = `workspace/${project}/reports/playwright/${yyyymm}/${suiteName}/${envLower}`;

export default defineConfig({
  testMatch: [...],
  timeout: 60000,
  reporter: [
    ["line"],
    [
      "monocart-reporter",
      {
        name: `${suiteName} - UI自动化测试报告 (${envLower})`,
        outputFile: `${reportDir}/${suiteName}.html`,
      },
    ],
  ],
  // ...
});
```

替换为：

```typescript
const reportDir = `workspace/${project}/reports/allure/${yyyymm}/${suiteName}/${envLower}`;
const allureResultsDir = `${reportDir}/allure-results`;

export default defineConfig({
  testMatch: [...],
  timeout: 60000,
  reporter: [
    ["line"],
    [
      "allure-playwright",
      {
        detail: true,
        outputFolder: allureResultsDir,
        suiteTitle: `${suiteName} - UI自动化测试 (${envLower})`,
      },
    ],
  ],
  // ...
});
```

- [ ] **Step 2: sessionPath 加 project 段 + fallback**

找到（约 49-51 行）：

```typescript
const sessionPath = `.auth/session-${envLower}.json`;
process.env.UI_AUTOTEST_SESSION_PATH = sessionPath;
```

替换为：

```typescript
import { existsSync } from "node:fs";

const newSessionPath = `.auth/${project}/session-${envLower}.json`;
const legacySessionPath = `.auth/session-${envLower}.json`;
// 兼容窗口：新路径不存在时回退旧路径，stderr 提示用户跑 migrate
const sessionPath =
  existsSync(newSessionPath) || !existsSync(legacySessionPath)
    ? newSessionPath
    : legacySessionPath;

if (sessionPath === legacySessionPath) {
  process.stderr.write(
    `[playwright.config] 使用旧 session 路径 ${legacySessionPath}。建议运行：bun run .claude/scripts/migrate-session-paths.ts\n`,
  );
}
process.env.UI_AUTOTEST_SESSION_PATH = sessionPath;
```

注意 `import { existsSync }` 需要在文件顶部加（如果还没有的话；当前已 import `readFileSync`，追加即可）。

- [ ] **Step 3: 验证 config 仍可解析**

```bash
bun -e "import('./playwright.config.ts').then(c => console.log('OK:', typeof c.default))"
```

预期：`OK: object`。

```bash
bunx playwright test --list 2>&1 | tail -5
```

预期：能列出现有 test，不报错。

- [ ] **Step 4: 验证 monocart-reporter 仍在 node_modules（不要 uninstall）**

monocart-reporter 留在 node_modules 作为 fallback；本期不删 deps（删除归 phase 6）。

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts
git -c commit.gpgsign=false commit -m "feat(phase3): switch playwright reporter to allure + multi-project session path"
```

---

## Task 9：plugin-loader.ts notify reportFile 路径同步

**目的**：当前 plugin-loader 的 notify 命令是泛型派发，不强制路径格式；本任务在 SKILL.md 步骤 9 调用处统一传新路径，plugin-loader 自身代码不需要改（它只是把 `--data` JSON 透传给 notify plugin 的 send 命令）。

**Files:**
- Edit: `.claude/scripts/plugin-loader.ts`（仅文档注释更新）

- [ ] **Step 1: 检查 plugin-loader notify 签名**

```bash
grep -n "ui-test-completed\|reportFile" .claude/scripts/plugin-loader.ts
```

预期：找到的引用都在注释或 Usage 段。当前 notify 是 generic，`--data` 是任意 JSON。

- [ ] **Step 2: 更新 plugin-loader.ts 顶部 Usage 注释中的示例**

找到顶部 `Usage:` 段：

```typescript
 *   bun run .claude/scripts/plugin-loader.ts notify --event case-generated --data '{"count":42}'
```

追加一行：

```typescript
 *   bun run .claude/scripts/plugin-loader.ts notify --event ui-test-completed --data '{"reportFile":"workspace/.../allure-report/index.html"}'
```

- [ ] **Step 3: 验证脚本仍能 list / check / notify --help**

```bash
bun run .claude/scripts/plugin-loader.ts --help 2>&1 | tail -10
```

预期：完整帮助输出，无错误。

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：基线维持。

- [ ] **Step 4: Commit**

```bash
git add .claude/scripts/plugin-loader.ts
git -c commit.gpgsign=false commit -m "docs(phase3): document allure reportFile path in plugin-loader notify"
```

---

## Task 10：session-login.ts 加 --project 参数

**目的**：CLI 接受 `--project`，output 默认路径改为 `.auth/{project}/session-{env}.json`。

**Files:**
- Edit: `.claude/skills/ui-autotest/scripts/session-login.ts`

- [ ] **Step 1: 改 commander 选项段**

找到（约 166-172 行）：

```typescript
const envLabel = (
  process.env.ACTIVE_ENV ?? process.env.QA_ACTIVE_ENV ?? "default"
).toLowerCase();

const program = new Command();

program
  .name("session-login")
  .description("检查或创建 Playwright 登录 session")
  .requiredOption("--url <url>", "目标系统 URL")
  .option("--output <path>", "session.json 输出路径", `.auth/session-${envLabel}.json`)
  .option("--force", "强制重新登录，忽略现有 session")
  .parse(process.argv);
```

替换为：

```typescript
const envLabel = (
  process.env.ACTIVE_ENV ?? process.env.QA_ACTIVE_ENV ?? "default"
).toLowerCase();

const projectLabel = process.env.QA_PROJECT ?? "dataAssets";
const defaultOutput = `.auth/${projectLabel}/session-${envLabel}.json`;

const program = new Command();

program
  .name("session-login")
  .description("检查或创建 Playwright 登录 session")
  .requiredOption("--url <url>", "目标系统 URL")
  .option("--project <name>", "项目名（影响 output 默认路径）", projectLabel)
  .option("--output <path>", "session.json 输出路径", defaultOutput)
  .option("--force", "强制重新登录，忽略现有 session")
  .parse(process.argv);

const opts = program.opts<{
  url: string;
  project: string;
  output: string;
  force?: boolean;
}>();

// 当用户传了 --project 但没传 --output，重新计算 output
if (opts.project !== projectLabel && opts.output === defaultOutput) {
  opts.output = `.auth/${opts.project}/session-${envLabel}.json`;
}
```

> 移除原 `const opts = program.opts<{ url: string; output: string; force?: boolean }>();`（因为已合并到上面）。

- [ ] **Step 2: 验证脚本仍能跑 --help**

```bash
bun run .claude/skills/ui-autotest/scripts/session-login.ts --help 2>&1 | tail -15
```

预期：列出 `--project` 选项，default 显示 `dataAssets`。

- [ ] **Step 3: 验证已有调用兼容**

`--output` 显式传值时不受 `--project` 影响。手动测试：

```bash
bun run .claude/skills/ui-autotest/scripts/session-login.ts --url http://example.com --output /tmp/test-session.json --force 2>&1 | head -3
```

预期：会尝试启动浏览器（playwright 没装时报错亦可，关键是 CLI 解析 OK）。

- [ ] **Step 4: 跑全量单测确认无回归**

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：基线维持。

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/ui-autotest/scripts/session-login.ts
git -c commit.gpgsign=false commit -m "feat(phase3): add --project to session-login for multi-project layout"
```

---

## Task 11：执行 helpers 拆分（dataAssets）

**目的**：把 Task 6 的 `migrate-helpers-split.ts` 应用到真实 `dataAssets` 项目，拆 633 行 `test-setup.ts` 为 5 个文件，跑 `tsc --noEmit` 校验编译通过。

**Files:**
- Modify: `workspace/dataAssets/tests/helpers/test-setup.ts` (改为兼容层)
- Create: `workspace/dataAssets/tests/helpers/env-setup.ts`
- Create: `workspace/dataAssets/tests/helpers/batch-sql.ts`
- Create: `workspace/dataAssets/tests/helpers/metadata-sync.ts`
- Create: `workspace/dataAssets/tests/helpers/quality-project.ts`
- Create: `workspace/dataAssets/tests/helpers/index.ts`

- [ ] **Step 1: 备份当前 test-setup.ts**

```bash
cp workspace/dataAssets/tests/helpers/test-setup.ts /tmp/test-setup-backup.ts
wc -l /tmp/test-setup-backup.ts
```

预期：`633 /tmp/test-setup-backup.ts`。

- [ ] **Step 2: 跑 dry-run 看计划**

```bash
bun run .claude/scripts/migrate-helpers-split.ts --project dataAssets --dry-run
```

预期：JSON 输出 `status=dry-run`，files 字段列出每个目标文件包含的函数名。如果某函数报 `Unmapped function`，回到 Task 6 在 `FUNCTION_TO_FILE` 或 `PRIVATE_HELPER_TARGETS` 加映射。

- [ ] **Step 3: 实际跑迁移**

```bash
bun run .claude/scripts/migrate-helpers-split.ts --project dataAssets
ls workspace/dataAssets/tests/helpers/
wc -l workspace/dataAssets/tests/helpers/*.ts
```

预期：列出 6 个文件（env-setup、batch-sql、metadata-sync、quality-project、index、test-setup、preconditions），各文件行数符合 spec §9.1 估算。

- [ ] **Step 4: 跑 tsc 校验**

```bash
cd /Users/poco/Projects/qa-flow && bunx tsc --noEmit -p tsconfig.json 2>&1 | tail -20
```

预期：无错误。如有 import path / type 错误，逐个修复（多半是 parser 漏处理某个语法，回到 Task 6 修 parser 或人工补正）。

- [ ] **Step 5: 验证现有 spec 文件 import 仍可解析**

```bash
grep -rn 'from "../../helpers/test-setup"' workspace/dataAssets/tests/ | head -5
bunx tsc --noEmit workspace/dataAssets/tests/202604/资产-集成测试用例/full.spec.ts 2>&1 | tail -10
```

预期：无 import 错误。

- [ ] **Step 6: 跑现有单测全量**

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：基线维持。

- [ ] **Step 7: Commit**

```bash
git add workspace/dataAssets/tests/helpers/
git -c commit.gpgsign=false commit -m "refactor(phase3): split dataAssets test-setup.ts into 5 responsibility files"
```

---

## Task 12：SKILL.md 全量升级

**目的**：在 `.claude/skills/ui-autotest/SKILL.md` 一次性纳入：(1) 顶部「约定」加 `convergence_threshold` 配置；(2) 步骤 3 改用 `--project` 参数；(3) 新增步骤 5.5 共性收敛全文；(4) 步骤 5 的 5.2 失败处理段加触发判断；(5) 步骤 7-9 报告路径改 Allure；(6) 任务可视化更新（任务列表新增 5.5 节点）。

**Files:**
- Edit: `.claude/skills/ui-autotest/SKILL.md`

- [ ] **Step 1: 顶部「约定」段加 convergence_threshold**

找到 `### Task Schema` 之前的 `## 约定` 段（约 64 行），追加新小节：

```markdown
### 共性收敛阈值

`convergence_threshold` 默认 `5`：步骤 5 累计失败用例数 ≥ 此值时触发步骤 5.5 共性收敛流程。

可被环境变量覆盖：`UI_AUTOTEST_CONVERGENCE_THRESHOLD=3 ./run-ui-autotest.sh`（小套件想更早收敛时使用）。
```

- [ ] **Step 2: Task Schema 段更新（任务列表新增 5.5）**

找到 9 个任务 subject 表（约 71-83 行），在「步骤 5 — 逐条自测」后追加一行：

```markdown
| `步骤 5.5 — 共性收敛`   | `分析共性失败模式`     |
```

并在文字描述段（约 84-96 行）追加：

```markdown
**步骤 5.5（共性收敛，条件触发）**：步骤 5 失败数 ≥ `convergence_threshold` 时插入。任务初始 subject 为 `步骤 5.5 — 待评估`；触发时推进 `步骤 5.5 — 探路中` → `步骤 5.5 — 分析中` → `步骤 5.5 — 应用 N 项 helpers` → `步骤 5.5 — 完成`；不触发时 subject 设为 `步骤 5.5 — 未触发（失败<{{threshold}}）` 后 `completed`。
```

- [ ] **Step 3: 步骤 3「登录态准备」改 --project 参数**

找到步骤 3 的 `**3.1 检查已有 session**` 段（约 333-339 行），把命令更新为：

```bash
bun run .claude/skills/ui-autotest/scripts/session-login.ts --project {{project}} --url {{url}} --output .auth/{{project}}/session-{{env}}.json
```

- [ ] **Step 4: 步骤 5 的 5.2 失败处理段加触发判断**

找到 `**5.2 失败处理**` 段（约 508 行附近），在最前面追加触发判断：

```markdown
**5.2.0 共性收敛触发判断**

每条用例自测完成后，主 agent 检查：

```typescript
const failedCount = Object.values(progress.cases)
  .filter(c => c.test_status === "failed").length;

if (failedCount >= convergenceThreshold &&
    progress.convergence_status !== "completed") {
  // 跳出主流，进入步骤 5.5
}
```

如触发，按下文步骤 5.5 执行；不触发则继续走 5.2 单条修复。
```

- [ ] **Step 5: 在步骤 5 与步骤 6 之间新增步骤 5.5 整段**

找到「步骤 5」结束（`## 步骤 6：合并脚本` 之前），插入新整节：

```markdown
## 步骤 5.5：共性收敛（条件触发）

> **触发条件**：步骤 5 累计失败用例数 ≥ `convergence_threshold`（默认 5）且 `convergence_status !== "completed"`。
> **目的**：失败规模较大时，先识别共性问题（多个 case 共同踩到同一 helper bug），固化 helpers，再让剩余 fixer 在 `helpers_locked=true` 状态下只改单脚本。
> **基础**：memory `feedback_fixer_batch_strategy`（2026-04-17 事故复盘）。

按 Task Schema 更新：将 `步骤 5.5` 标记为 `in_progress`（subject `步骤 5.5 — 探路中`）。

**5.5.1 标记进入收敛态**

```bash
bun run .claude/scripts/ui-autotest-progress.ts update \
  --project {{project}} --suite "{{suite_name}}" --env "{{env}}" \
  --field convergence_status --value active
```

**5.5.2 选择 1-2 个探路 case**

从 `test_status === "failed"` 且 `attempts === 0` 的用例中，按以下优先级取 1-2 个：
- 不同 page 的（覆盖更多场景）
- 最近失败的
- 错误签名彼此最不同的

**5.5.3 派探路 fixer（最多 2 并发）**

派发 `script-fixer-agent`，输入加 `"helpers_locked": false`（探路允许改 helpers 用于诊断）：

```json
{
  "error_type": "...",
  "script_path": "...",
  "stderr_last_20_lines": "...",
  "attempt": 1,
  "url": "{{url}}",
  "repos_dir": "workspace/{{project}}/.repos/",
  "helpers_locked": false
}
```

收集每个 fixer 的 `summary` 字段（fixer 自述本次修了什么、踩了什么坑）。

按 Task Schema 更新：subject 推进 `步骤 5.5 — 分析中`。

**5.5.4 收集所有失败签名（精简）**

主 agent 遍历所有 `test_status === "failed"` 的 case，正则提取 error_type + stderr_last_5_lines（不读完整 stderr，保护上下文）。

**5.5.5 派 pattern-analyzer-agent**

派发 `pattern-analyzer-agent`，输入：

```json
{
  "probe_summaries": [/* 步骤 5.5.3 收集 */],
  "all_failure_signatures": [/* 步骤 5.5.4 提取 */],
  "helpers_inventory": {
    "lib/playwright/ant-interactions.ts": [/* 函数名列表 */],
    "workspace/{{project}}/tests/helpers/batch-sql.ts": [/* 函数名列表 */]
  }
}
```

`helpers_inventory` 由主 agent 用 `Grep "^export (async )?function" lib/playwright/ workspace/{{project}}/tests/helpers/` 自动构造。

接收 `common_patterns[]` + `no_common_pattern_cases` + 可选 `skip_reason`。

按 Task Schema 更新：subject 推进 `步骤 5.5 — 应用 {{N}} 项 helpers`。

**5.5.6 应用 helpers diff**

主 agent 按 `common_patterns[]` 逐条用 Edit 工具修改 `helper_target`：

- `diff_kind: "patch"` → 直接 Edit 改既有函数
- `diff_kind: "add_function"` → 在目标文件追加新函数
- `diff_kind: "rewrite"` → 主 agent 评估后决定是否拒绝（拒绝时记入 `convergence.common_patterns[].applied=false`）
- `confidence: "low"` → 必须用 AskUserQuestion 让用户拨

每条改完跑 `bunx tsc --noEmit -p tsconfig.json` 校验编译通过。失败则回滚该条改动并 stderr 警告。

**5.5.7 重置探路 case 的 test_status**

```bash
bun run .claude/scripts/ui-autotest-progress.ts update \
  --project {{project}} --suite "{{suite_name}}" --env "{{env}}" \
  --case {{probe_id}} --field test_status --value pending
```

让主流重跑这些 case，检验 helpers 修复是否真的解决问题。

**5.5.8 标记收敛完成**

```bash
bun run .claude/scripts/ui-autotest-progress.ts update \
  --project {{project}} --suite "{{suite_name}}" --env "{{env}}" \
  --field convergence_status --value completed

bun run .claude/scripts/ui-autotest-progress.ts update \
  --project {{project}} --suite "{{suite_name}}" --env "{{env}}" \
  --field convergence \
  --value '{"triggered_at":"...","probe_attempts":[...],"common_patterns":[...],"completed_at":"..."}'
```

按 Task Schema 更新：将 `步骤 5.5` 标记为 `completed`（subject `步骤 5.5 — 完成 ({{N}} 项 helpers)`）。

**5.5.9 回到步骤 5 主流**

继续派剩余失败 case 的 fixer，**所有 fixer 输入 `helpers_locked: true`**（禁止改 helpers，只允许改单脚本）。

**短路退出场景**：
- `convergence_status === "completed"` → 跳过 5.5 整段（断点续传时）
- `pattern-analyzer` 返回 `skip_reason === "all_individual"` → 5.5 直接 `completed`，不应用任何 diff

**禁止行为**：
- 主 agent 自行读多份 fixer summary 识别共性 → 必须派 pattern-analyzer
- 同一 suite run 内 5.5 触发 ≥ 2 次 → `convergence_status` 守卫禁止
- 探路 fixer 的 helpers 修改在 5.5.6 之后保留 → 5.5.6 以 analyzer 输出为准，覆盖探路修改
```

- [ ] **Step 6: 步骤 7「执行测试」更新报告路径**

找到步骤 7 的命令段（约 651-661 行），把命令更新为：

```bash
ACTIVE_ENV={{env}} QA_PROJECT={{project}} QA_SUITE_NAME="{{suite_name}}" \
  bunx playwright test workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/smoke.spec.ts \
  --project=chromium

# 完整测试
ACTIVE_ENV={{env}} QA_PROJECT={{project}} QA_SUITE_NAME="{{suite_name}}" \
  bunx playwright test workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/full.spec.ts \
  --project=chromium

# 生成 Allure HTML 报告（合并 / 回归后必跑）
npx allure generate \
  workspace/{{project}}/reports/allure/{{YYYYMM}}/{{suite_name}}/{{env}}/allure-results \
  --output workspace/{{project}}/reports/allure/{{YYYYMM}}/{{suite_name}}/{{env}}/allure-report \
  --clean
```

并将下面注释更新为：

```markdown
> 报告输出至 `workspace/{{project}}/reports/allure/{{YYYYMM}}/{{suite_name}}/{{env}}/`，含 `allure-results/`（原始数据）和 `allure-report/`（HTML 入口 `index.html`）两个子目录。
```

- [ ] **Step 7: 步骤 8「处理结果」更新报告路径**

找到步骤 8 的输出模板（约 686-720 行），把全部 `reports/playwright/...` 替换为 `reports/allure/.../allure-report/index.html`。例如：

```markdown
报告：workspace/{{project}}/reports/allure/{{YYYYMM}}/{{suite_name}}/{{env}}/allure-report/index.html
```

并把 8.2 段的 Bug 报告路径也调整（如有引用 monocart）。

- [ ] **Step 8: 步骤 9「发送通知」更新 reportFile 字段**

找到步骤 9 的 notify 命令（约 731-741 行），把 reportFile 改为：

```bash
bun run .claude/scripts/plugin-loader.ts notify \
  --event ui-test-completed \
  --data '{
    "passed": {{passed}},
    "failed": {{failed}},
    "specFiles": ["{{spec_file}}"],
    "reportFile": "workspace/{{project}}/reports/allure/{{YYYYMM}}/{{suite_name}}/{{env}}/allure-report/index.html",
    "duration": "{{duration}}"
  }'
```

- [ ] **Step 9: 文件末尾「输出目录约定」表格更新**

找到表格（约 763-770 行），更新两行：

```markdown
| Playwright HTML 报告 | `workspace/{{project}}/reports/allure/YYYYMM/{{suite_name}}/{{env}}/allure-report/index.html` |
| Bug 报告             | `workspace/{{project}}/reports/bugs/YYYYMM/ui-autotest-{{suite_name}}.html` |
| Session 文件         | `.auth/{{project}}/session-{{env}}.json`                                    |
```

- [ ] **Step 10: 校验整体结构**

```bash
wc -l .claude/skills/ui-autotest/SKILL.md
grep -n "^## 步骤" .claude/skills/ui-autotest/SKILL.md
```

预期：
- 行数从 ~771 增长到 ~900 左右
- 步骤标题序列：步骤 0 → 步骤 1 → 步骤 1.5 → 步骤 2 → 步骤 3 → 步骤 4 → 步骤 5 → **步骤 5.5（新）** → 步骤 6 → 步骤 7 → 步骤 8 → 步骤 9

- [ ] **Step 11: 跑全量单测确认无回归**

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：基线维持（SKILL.md 改动不影响测试）。

- [ ] **Step 12: Commit**

```bash
git add .claude/skills/ui-autotest/SKILL.md
git -c commit.gpgsign=false commit -m "feat(phase3): integrate convergence + allure + multi-project session into ui-autotest SKILL"
```

---

## Task 13：Smoke 验证 + roadmap 更新 + phase 3.5 启动 prompt

**目的**：手工跑 spec §11.3 的 6 项 smoke 验证、记录结果；更新 roadmap 标记 phase 3 ✅ DONE；生成 phase 3.5 启动 prompt 给用户。

**Files:**
- Edit: `docs/refactor-roadmap.md`

- [ ] **Step 1: Smoke S1 — pattern-analyzer-agent 烟雾**

构造 mock 输入文件 `/tmp/pattern-analyzer-smoke-input.json`：

```json
{
  "probe_summaries": [
    {
      "case_id": "t1",
      "case_title": "【P0】验证下拉选项搜索",
      "fixer_attempts": 2,
      "final_status": "FIXED",
      "summary": "Ant Select 虚拟滚动下，selectAntOption 的 fallback 分支没有等待虚拟列表渲染完成就尝试点击，导致 strict mode violation。加了 page.waitForTimeout(300) 解决。",
      "corrections": []
    },
    {
      "case_id": "t2",
      "case_title": "【P0】验证下拉选项过滤",
      "fixer_attempts": 1,
      "final_status": "FIXED",
      "summary": "同样的虚拟滚动问题，在 selectAntOption 内部加了等待。",
      "corrections": []
    }
  ],
  "all_failure_signatures": [
    {"case_id": "t10", "error_type": "locator", "stderr_last_5_lines": "strict mode violation: locator resolved to 5 elements"},
    {"case_id": "t16", "error_type": "locator", "stderr_last_5_lines": "strict mode violation"},
    {"case_id": "t8", "error_type": "timeout", "stderr_last_5_lines": "Timeout 30000ms exceeded waiting for table"}
  ],
  "helpers_inventory": {
    "lib/playwright/ant-interactions.ts": ["selectAntOption", "expectAntMessage"],
    "workspace/dataAssets/tests/helpers/batch-sql.ts": ["selectBatchProject"]
  }
}
```

通过 Claude Code 的 Agent 工具手动派一次 pattern-analyzer-agent，输入这个 JSON，验证返回的 JSON 含 `common_patterns[0].helper_target === "lib/playwright/ant-interactions.ts"` 且 `confidence === "high"`，t8 在 `no_common_pattern_cases` 中。

记录结果到 commit message 或 GitHub issue。

- [ ] **Step 2: Smoke S2 — Allure 安装 + 报告生成**

```bash
# 取一个已有 spec 跑（如果 dataAssets 没有现成可跑的，挑最简单的）
ACTIVE_ENV=ltqcdev QA_PROJECT=dataAssets QA_SUITE_NAME="smoke-allure" \
  bunx playwright test workspace/dataAssets/tests/202604/【通用配置】json格式配置/smoke.spec.ts --project=chromium 2>&1 | tail -10

# 生成 HTML
npx allure generate \
  workspace/dataAssets/reports/allure/202604/smoke-allure/ltqcdev/allure-results \
  --output workspace/dataAssets/reports/allure/202604/smoke-allure/ltqcdev/allure-report \
  --clean

ls workspace/dataAssets/reports/allure/202604/smoke-allure/ltqcdev/allure-report/
```

预期：含 `index.html` 文件、生成成功。

如果环境不允许真实跑 playwright（如 session 失效），改为：用 mock spec 文件验证 reporter 配置生成 `allure-results/` 目录即可。

- [ ] **Step 3: Smoke S3 — session 多项目路径**

```bash
# 创建一个 mock 旧 session
mkdir -p .auth
echo '{"cookies":[],"origins":[]}' > .auth/session-smoketest.json

# 跑迁移
bun run .claude/scripts/migrate-session-paths.ts --project dataAssets

ls .auth/dataAssets/  # 预期：包含 session-smoketest.json
ls .auth/session-smoketest.json 2>&1  # 预期：No such file（已被移走）

# 清理
rm -f .auth/dataAssets/session-smoketest.json
```

- [ ] **Step 4: Smoke S4 — helpers 拆分后 spec 兼容**

```bash
# 已经在 Task 11 执行过；二次验证 import 仍可解析
bunx tsc --noEmit -p tsconfig.json 2>&1 | tail -5
```

预期：无错误。

- [ ] **Step 5: Smoke S5 — 5.5 节点触发链路（人工验证 SKILL.md 流程）**

由于 5.5 触发需要真实 ≥ 5 失败用例，本 smoke 改为「文档校验」：

```bash
grep -n "convergence_threshold\|步骤 5.5" .claude/skills/ui-autotest/SKILL.md | head -10
grep -n "helpers_locked" .claude/agents/script-fixer-agent.md
grep -n "common_patterns" .claude/agents/pattern-analyzer-agent.md
```

预期：每个引用都能找到，证明流程链路在 SKILL/agent 文档中完整。真实触发验证留给下次实际跑大套件时。

- [ ] **Step 6: Smoke S6 — 5.5 不触发短路**

跑一个 < 5 失败的小套件（如果手头有），观察 progress 文件 `convergence_status` 是否保持 `skipped`。如无现成场景，跳过此 smoke，仅在文档中记录"待真实场景验证"。

- [ ] **Step 7: 跑全量单测最终基线**

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：`>= 678 pass / 0 fail`。

- [ ] **Step 8: 更新 roadmap 标记 phase 3 ✅ DONE**

打开 `docs/refactor-roadmap.md`，找到第 24 行（phase 3 行）：

```markdown
| **3** | UI 自动化（目标 1.3） | ⏳ PENDING | — | 技术调研、Playwright 工作流重构、Allure 报告、subagent 升级契约、多环境/多项目 session |
```

替换为：

```markdown
| **3** | UI 自动化（目标 1.3） | ✅ DONE | [`2026-04-18-ui-autotest-evolution-design.md`](refactor/specs/2026-04-18-ui-autotest-evolution-design.md) | pattern-analyzer-agent + 步骤 5.5 共性收敛、Allure 完全替换 monocart、session 多项目隔离、helpers 拆 5 文件、≥ 678 测试绿 |
```

- [ ] **Step 9: 生成 phase 3.5 启动 prompt（写到 commit message 或 chat 输出）**

phase 3.5 启动 prompt 内容（参考 phase 2 plan 末尾的 phase 3 prompt 格式）：

```markdown
# Phase 3.5 启动 prompt（skill 重排）

## 已完成前序
- 子目标 0：信息架构 + rules 迁移
- 子目标 1：knowledge-keeper、create-project、setup 瘦身
- Phase 2：PRD 需求讨论（discuss.ts CLI + plan.md）
- Phase 3：UI 自动化进化（pattern-analyzer-agent + 5.5 共性收敛 + Allure + 多项目 session + helpers 拆分）

## Phase 3.5 Scope（roadmap §阶段 3.5）
skill 重排（删 `code-analysis`，新增 `hotfix-case-gen` / `bug-report` / `conflict-report`，`qa-flow` 菜单重排）

## 执行约束
- cwd = /Users/poco/Projects/qa-flow
- workspace/{project}/.repos/ 只读
- 禁硬编码绝对路径/凭证
- 每改 .claude/scripts/ 同步单测并全量绿（基线 ≥ 678）
- 主 agent 禁自行调试
- commit 格式: feat(phase3.5): / docs(phase3.5): ；无 Co-Authored-By；无 push

## 首步
请阅读 docs/refactor-roadmap.md 阶段 3.5 段落、phase 3 spec
（docs/refactor/specs/2026-04-18-ui-autotest-evolution-design.md）、当前 code-analysis skill 实现
（.claude/skills/code-analysis/）、planned 新 skill 的输入输出场景。然后开始撰写 Phase 3.5 spec。
完成后停下来让用户 review。
```

把这个 prompt 文本展示给用户（chat 输出，无需写到文件）。

- [ ] **Step 10: 最终 commit**

```bash
git add docs/refactor-roadmap.md
git -c commit.gpgsign=false commit -m "docs(phase3): mark phase 3 done in roadmap"
```

- [ ] **Step 11: 总结 + 验证 git 状态干净**

```bash
git log --oneline | head -15
git status
```

预期：
- 13 个 phase 3 commit（spec / progress / schema / pattern-analyzer / fixer / migrate-session / migrate-helpers / allure deps / playwright.config / plugin-loader / session-login / helpers-split / SKILL.md / roadmap）
- working tree clean
- 用户最后会看到完整 phase 3 启动 prompt 提示，建议 `/clear` 进 phase 3.5

---

## 完成 Checklist（对号入座）

- [ ] 13 个 task 全完成
- [ ] `bun test ./.claude/scripts/__tests__` 全绿（≥ 678）
- [ ] 6 项 smoke 全跑过（S5/S6 文档校验或待真实场景）
- [ ] `git log --oneline` 显示 13 条 phase 3 commit，无 Co-Authored-By
- [ ] roadmap phase 3 ✅ DONE
- [ ] phase 3.5 启动 prompt 已展示给用户
- [ ] 用户被明确提示 `/clear` 或新开 CC 实例继续 phase 3.5
