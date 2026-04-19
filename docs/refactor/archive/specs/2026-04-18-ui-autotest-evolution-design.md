# UI Autotest Evolution 设计文档

**Phase**: 3 · UI 自动化（roadmap §阶段 3 / 目标 1.3）
**Date**: 2026-04-18
**Status**: Draft — awaiting user review
**Parent Roadmap**: [`../../refactor-roadmap.md`](../../refactor-roadmap.md)
**Upstream**:
- [`2026-04-17-knowledge-architecture-design.md`](./2026-04-17-knowledge-architecture-design.md)
- [`2026-04-17-knowledge-keeper-design.md`](./2026-04-17-knowledge-keeper-design.md)
- [`2026-04-18-create-project-skill-design.md`](./2026-04-18-create-project-skill-design.md)
- [`2026-04-18-setup-slim-design.md`](./2026-04-18-setup-slim-design.md)
- [`2026-04-18-prd-discussion-design.md`](./2026-04-18-prd-discussion-design.md)

---

## 1. Context

`ui-autotest` skill 在过去半年的实战中已经形成 9 节点稳态工作流（init → 1.5 续传 → 范围 → 登录态 → 脚本生成 → 自测修复 → 合并 → 回归 → 结果 → 通知），并在 2026-04-16 完成多环境隔离（`ACTIVE_ENV` / `.auth/session-{env}.json` / `progress-{suite}-{env}.json` / `reports/.../{suite}/{env}/`）。但仍有四类未固化的痛点：

1. **fixer 重复发现共性问题**：memory `feedback_fixer_batch_strategy` 已记录"33 条用例 31 条失败、5 个并行 fixer 在 helpers 上各自重复发现同一批问题（Enter 不触发搜索、spin 遮罩拦截、弹窗延迟关闭）、200k+ tokens 浪费、Opus 额度 30 分钟打爆"的原始事故。流程骨架已定（探路 → 固化 → 收敛），但**没在 SKILL.md 里强制**——下一次同样规模的失败仍会重演
2. **报告无趋势/历史能力**：`monocart-reporter` 输出单文件 HTML，能看本次结果但无法对比"上一次跑同一套件多少通过、新增了多少失败、哪些是 flaky"。Allure 是行业事实标准，原生支持 trends / categories / history / retry 标记
3. **session 仅按环境隔离，未按项目隔离**：当前 `.auth/session-{env}.json` 全项目共用。多项目场景下（dataAssets + xyzh），即使同 env 也可能账号体系/cookie 域不同，混用导致跨项目污染；多个 CC 实例并行（一个跑 dataAssets、一个跑 xyzh）时 session 互相覆盖
4. **`tests/helpers/test-setup.ts` 已 633 行**：堆积了 env+url 构建 / cookie 注入 / batch SQL / 元数据同步 / 质量项目 五块独立职责，违背 CLAUDE.md "200-400 行典型，800 max" 指引；新增 helper 函数没明确归属，越长越像抽屉

衍生问题：
- 主 agent 上下文保护（memory `feedback_orchestrator_no_debug` 硬规则）要求"绝不读多份 fixer summary 自己识别共性"，但当前流程没有把这个逻辑下沉到专职 sub-agent
- 通知插件（`plugin-loader.ts notify event=ui-test-completed`）传的 `reportFile` 路径与 reporter 强耦合，切换 reporter 必须同步改

Phase 3 在不重构 9 节点主干的前提下，把上面 4 类痛点一次性固化到 skill / agent / 配置 / 文件结构里。

---

## 2. Goals

1. 新增 `pattern-analyzer-agent`（haiku 级），承担"读多份 fixer summary → 识别共性 → 输出 helpers diff 建议"职责
2. 在 SKILL.md 步骤 5 之后插入条件触发的「步骤 5.5：共性收敛」节点（失败 ≥ 阈值时激活，类比步骤 1.5）
3. `script-fixer-agent` 输入契约升级：新增 `helpers_locked: bool` 字段；true 时 fixer 只改单脚本，禁动 `tests/helpers/`
4. Allure 完全替换 `monocart-reporter`：`playwright.config.ts` reporter 切换、报告路径调整为 `allure-results` + `allure-report` 两段、`step-screenshot.ts` 兼容性验证、`plugin-loader.ts notify` reportFile 路径同步
5. session 多项目隔离：`.auth/{project}/session-{env}.json`；`playwright.config.ts` 读 `QA_PROJECT` 拼路径；`session-login.ts` CLI 加 `--project` 参数
6. `tests/helpers/test-setup.ts` 拆 5 个职责文件（`env-setup` / `batch-sql` / `metadata-sync` / `quality-project` / `index.ts` barrel），外部 import 路径完全兼容
7. 进度文件 schema 升级：新增 `convergence_status: skipped | active | completed` 字段与 `convergence` 子对象，记录共性收敛触发与结果
8. 单元 + 集成测试覆盖：pattern-analyzer-agent IO schema、Allure reporter 配置、session 路径生成、helpers 拆分后 barrel re-export、progress convergence 字段
9. 不破坏既有契约：现有 spec 文件 `import { ... } from "../../helpers/test-setup"` 仍可工作；进度文件旧结构（无 `convergence_status`）回退兼容；旧 session 路径 `.auth/session-{env}.json` 一次性迁移脚本

---

## 3. Non-Goals

- 重构 9 节点主干工作流 → 与 phase 3 B 方案承诺一致，主干稳定
- 替换 `script-writer-agent` / `script-fixer-agent` 模型（保持 sonnet）→ 模型策略归 phase 5「横切基础设施」
- 移除 `lib/playwright/` 下任何函数 → phase 6
- helpers 文件再拆为更细粒度（如 batch-sql 内部按 doris/spark 拆）→ 超 scope
- 多分支 session 持久化（同账号同环境多 cookie 状态切换）→ 超 scope
- Allure trends/history 跨 CI 实例聚合（需要中央存储）→ 超 scope；本期只产本地报告
- pattern-analyzer-agent 直接修改 helpers 代码 → 不允许；分析 agent 只输出 diff 建议，主 agent 应用
- `bug-reporter-agent` / 前后端 bug agent 重构 → 不在本期；继续按现有契约（重构归 phase 3.5）

---

## 4. Architecture

### 4.1 五大改动栈

| # | 改动 | 受影响文件 | 风险 |
|---|---|---|---|
| 1 | pattern-analyzer-agent | `.claude/agents/pattern-analyzer-agent.md`、`.claude/references/output-schemas.json` | 低 |
| 2 | SKILL.md 步骤 5.5 + script-fixer 契约 | `.claude/skills/ui-autotest/SKILL.md`、`script-fixer-agent.md`、`ui-autotest-progress.ts` | 中 |
| 3 | Allure 替换 | `playwright.config.ts`、`package.json`、`plugin-loader.ts`、SKILL.md 步骤 7-9 | 中 |
| 4 | session 多项目隔离 | `playwright.config.ts`、`session-login.ts`、SKILL.md 步骤 3 | 低 |
| 5 | helpers 拆 5 文件 | `workspace/{project}/tests/helpers/` 全部 + spec 文件 import 不变 | 低 |

### 4.2 工作流（节点结构）

```
┌─────────────────────────── 9 + 1.5 + 5.5 节点 ──────────────────────────┐
│  init → 1.5 续传 → 范围 → 登录态 → 脚本生成 → 自测修复                    │
│                                                ├─ 失败 ≥ 5? ─┐            │
│                                                │             ↓            │
│                                                │  5.5 共性收敛（条件）    │
│                                                │   ├ 派 1-2 探路 fixer    │
│                                                │   ├ 派 pattern-analyzer  │
│                                                │   ├ 主 agent 应用 helpers│
│                                                │   └ 剩余 fixer (locked)  │
│                                                │             ↓            │
│                                                └← 回到自测修复主流 ────┘  │
│                                                                           │
│  → 合并 → 回归 → 结果 → 通知                                              │
└───────────────────────────────────────────────────────────────────────────┘
```

主干 1-9 节点不动；1.5 / 5.5 是子节点延伸（类比已存在的 1.5 断点续传）。

### 4.3 5.5 节点的触发与退出

- **触发**：步骤 5 累计 `test_status === "failed"` 数 ≥ `convergence_threshold`（默认 5，可在 SKILL.md 顶部配置）
- **短路退出**：进度文件 `convergence_status === "completed"`（断点续传时跳过；同一 suite run 内 5.5 最多触发一次）
- **退出**：pattern-analyzer 返回的 `common_patterns[]` 全部应用、`convergence_status` 置 `completed`、回到步骤 5 主流继续派剩余 fixer

### 4.4 主 agent vs sub-agent 职责（5.5 节点）

| 职责 | 主 agent | script-fixer | pattern-analyzer |
|---|---|---|---|
| 派探路 fixer (1-2 个) | ✅ | — | — |
| 修复单脚本 | — | ✅ | — |
| 返回结构化 summary | — | ✅ | — |
| 读 N 份 summary 识别共性 | ❌ | — | ✅ |
| 输出 `common_patterns[]` + helpers diff | — | — | ✅ |
| 应用 helpers diff（Edit 文件） | ✅ | — | — |
| 派剩余 fixer（`helpers_locked=true`） | ✅ | — | — |

核心原则：**主 agent 不读详细 fixer 输出**，只消费 pattern-analyzer 的结构化结论。

### 4.5 progress 文件 schema 扩展

```typescript
interface Progress {
  // ... 现有字段
  readonly convergence_status?: "skipped" | "active" | "completed";  // 新增
  readonly convergence?: {                                            // 新增
    readonly triggered_at?: string;       // ISO8601
    readonly probe_attempts: readonly string[];  // 探路 fixer 处理的 case id
    readonly common_patterns: readonly {
      readonly id: string;
      readonly summary: string;
      readonly helper_target: string;     // 如 "lib/playwright/ant-interactions.ts"
      readonly diff_kind: "patch" | "add_function" | "rewrite";
      readonly applied: boolean;
      readonly confidence: "high" | "medium" | "low";
    }[];
    readonly completed_at?: string;
  };
}
```

向后兼容：旧 progress 文件没有这两个字段时，CLI 自动补默认 `convergence_status = "skipped"`，无 active/completed 切换记录。

---

## 5. pattern-analyzer-agent 设计

### 5.1 文件位置 + 模型

`.claude/agents/pattern-analyzer-agent.md`，model: **haiku**（只做结构化归纳，不写代码，haiku 足够且省 token）

### 5.2 输入契约

```typescript
{
  "probe_summaries": [        // 1-2 份探路 fixer 的输出
    {
      "case_id": "t1",
      "case_title": "...",
      "fixer_attempts": 2,
      "final_status": "FIXED" | "STILL_FAILING",
      "summary": "string (fixer 自述本次修了什么、踩了什么坑，最多 1500 字)",
      "corrections": [...]    // fixer 已收集的 archive MD 校正建议
    }
  ],
  "all_failure_signatures": [ // 主 agent 用正则提取的失败签名
    {
      "case_id": "t10",
      "error_type": "timeout" | "locator" | "assertion" | "unknown",
      "stderr_last_5_lines": "string"
    }
  ],
  "helpers_inventory": {      // 当前 helpers 函数清单（路径 + 签名）
    "lib/playwright/ant-interactions.ts": ["selectAntOption", "..."],
    "tests/helpers/batch-sql.ts": ["..."]
  }
}
```

### 5.3 输出契约

```typescript
{
  "common_patterns": [
    {
      "id": "P1",
      "summary": "Ant Select 虚拟滚动下 fallback 不触发",
      "evidence": ["t1", "t2", "t10", "t16"],   // 至少 2 个 case 验证
      "helper_target": "lib/playwright/ant-interactions.ts",
      "function_name": "selectAntOption",
      "diff_kind": "patch" | "add_function" | "rewrite",
      "diff_suggestion": "fallback 中加 page.waitForTimeout(300) 等待虚拟列表渲染",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "no_common_pattern_cases": ["t8"],   // 个例失败（不能归到共性的）
  "skip_reason"?: "all_individual"      // 整批都是个例时返回此字段
}
```

### 5.4 评估规则

- 一个 pattern 必须有 ≥ 2 case 证据，否则归为 `no_common_pattern_cases`
- `helper_target` 必须在 `helpers_inventory` 中，禁止建议改 spec 文件本身
- `diff_kind` 决定主 agent 应用方式：
  - `patch` → 主 agent 直接 Edit
  - `add_function` → 在目标文件追加新函数
  - `rewrite` → 主 agent 评估后决定（可能拒绝）
- `confidence: low` 的 pattern 主 agent 必须用 AskUserQuestion 让用户拨

### 5.5 调用方

只有 `ui-autotest` skill 步骤 5.5 派发，不在其他 skill 复用（本期）。

---

## 6. SKILL.md 改动（步骤 5 + 5.5）

### 6.1 步骤 5 内增加触发判断

`convergence_threshold` 在 SKILL.md「约定」段新增：默认 `5`，可被环境变量 `UI_AUTOTEST_CONVERGENCE_THRESHOLD` 覆盖（用户单次跑临时调整）。

每条用例自测完成后（无论 passed/failed），检查累计失败数：

```
if (failed_count >= convergence_threshold && convergence_status !== "completed"):
    跳出主流，进入步骤 5.5
```

### 6.2 步骤 5.5：共性收敛（新增）

```
5.5.1 设置 convergence_status = "active"
  - bun run ui-autotest-progress.ts update --field convergence_status --value active

5.5.2 选择探路 case（1-2 个）
  - 优先取最近失败的、不同 page 的、attempt=1 的 case
  - 派 script-fixer-agent，输入 helpers_locked=false（探路允许改 helpers，但仅用于诊断）
  - 收集 fixer 返回的 summary

5.5.3 收集所有失败签名（精简）
  - 对所有 test_status="failed" 的 case，正则提取 error_type + stderr_last_5_lines
  - 不读完整 stderr

5.5.4 派 pattern-analyzer-agent
  - 输入：probe_summaries + all_failure_signatures + helpers_inventory
  - 等待返回 common_patterns[]

5.5.5 应用 helpers diff
  - 主 agent 按 common_patterns[] 逐条用 Edit 工具修改 helper_target
  - 修改后跑 `tsc --noEmit` 校验
  - confidence=low 的 pattern → AskUserQuestion 拨

5.5.6 重置探路 case 的 test_status
  - 探路过程中可能误改的 case，重置为 pending 待主流重跑

5.5.7 设置 convergence_status = "completed"
  - 记录 common_patterns 到 progress.convergence

5.5.8 回到步骤 5 主流
  - 派剩余 fixer，输入 helpers_locked=true
```

### 6.3 script-fixer-agent.md 改动

- 输入新增 `helpers_locked: bool` 字段
- 修复原则新增第 6 条：「`helpers_locked=true` 时禁止修改 `tests/helpers/` 与 `lib/playwright/` 下任何文件；只能改 `script_path` 单文件」
- 输出 schema 增加 `helpers_modified: string[]`（列出修改的 helpers 路径，主 agent 用来 audit 是否破规）

### 6.4 步骤 7-9（Allure）

- 步骤 7 命令更新（见 §7）
- 步骤 8 报告路径更新：`workspace/{project}/reports/allure/{YYYYMM}/{suite}/{env}/`（替换 `playwright/`）
- 步骤 9 通知插件传的 `reportFile` 改为 `index.html`（Allure HTML 入口）

### 6.5 任务可视化更新

主流程任务列表新增「步骤 5.5 — 共性收敛」，置于步骤 5 与步骤 6 之间。`{{threshold}}` 取 SKILL.md 顶部 `约定 → convergence_threshold`（默认 5）。

- 不触发：subject = `步骤 5.5 — 未触发（失败<{{threshold}}）`，状态直接 `completed`
- 触发：subject 推进 `步骤 5.5 — 探路中` → `步骤 5.5 — 分析中` → `步骤 5.5 — 应用 N 项 helpers` → `步骤 5.5 — 完成`

---

## 7. Allure 接入

### 7.1 依赖

`package.json` 新增：

```json
{
  "devDependencies": {
    "allure-playwright": "^2.15.0",
    "allure-commandline": "^2.27.0"
  }
}
```

### 7.2 playwright.config.ts 改动

```typescript
const reportDir = `workspace/${project}/reports/allure/${yyyymm}/${suiteName}/${envLower}`;
const allureResultsDir = `${reportDir}/allure-results`;
const allureReportDir = `${reportDir}/allure-report`;

export default defineConfig({
  // ...
  reporter: [
    ["line"],
    ["allure-playwright", {
      detail: true,
      outputFolder: allureResultsDir,
      suiteTitle: `${suiteName} - UI自动化测试 (${envLower})`,
    }],
  ],
});
```

### 7.3 step-screenshot.ts 兼容性

`testInfo.attach()` 是 Playwright 标准 API，Allure reporter 直接消费，无需改 fixture 代码。

### 7.4 报告生成步骤

合并/回归后增加一步生成 HTML：

```bash
# 步骤 7 完成后
npx allure generate {allureResultsDir} --output {allureReportDir} --clean
```

### 7.5 通知插件路径同步

`plugin-loader.ts notify event=ui-test-completed` 传的 `reportFile` 改为 `${allureReportDir}/index.html`。

### 7.6 旧报告清理

不删 `workspace/{project}/reports/playwright/` 历史目录（保留作回滚 reference，体积可忽略）；新报告全部写到 `reports/allure/`。物理清理留给 phase 6 命名迁移。

---

## 8. session 多项目隔离

### 8.1 路径变更

- 旧：`.auth/session-{env}.json`
- 新：`.auth/{project}/session-{env}.json`

### 8.2 playwright.config.ts 改动

```typescript
const project = process.env.QA_PROJECT ?? "dataAssets";
const sessionPath = `.auth/${project}/session-${envLower}.json`;
```

### 8.3 session-login.ts CLI 改动

新增 `--project` 参数；输出路径自动拼 project 段：

```bash
bun run .claude/skills/ui-autotest/scripts/session-login.ts \
  --project dataAssets --url <url> --output .auth/dataAssets/session-ltqcdev.json
```

### 8.4 SKILL.md 步骤 3 改动

调用 session-login.ts 时传 `--project {{project}}`。

### 8.5 旧 session 迁移

新增一次性迁移脚本 `.claude/scripts/migrate-session-paths.ts`：扫描 `.auth/session-*.json`，按以下优先级解析目标 project：

1. 命令行 `--project <name>` 显式指定
2. `config.json` 顶层 `defaultProject` 字段
3. `workspace/` 下子目录数 = 1 时取该项目
4. 多项目无显式默认 → CLI 交互式让用户拨

匹配后移到 `.auth/{project}/session-*.json`。脚本幂等：目标已存在不覆盖，源文件保留并 stderr warning。第一次跑 ui-autotest 时如检测到旧路径文件，自动提示用户执行。

### 8.6 .gitignore

`.gitignore` 已经 ignore 整个 `.auth/`，不需要改。

---

## 9. helpers 拆分（5 文件）

### 9.1 目标结构

```
workspace/{project}/tests/helpers/
├── env-setup.ts              # ~85 行
├── batch-sql.ts              # ~230 行
├── metadata-sync.ts          # ~145 行
├── quality-project.ts        # ~50 行
├── preconditions.ts          # 不动（已是 plugin re-export）
├── test-setup.ts             # 改为兼容层 re-export ./index
└── index.ts                  # barrel re-export，~50 行
```

### 9.2 内容映射

| 原文件 | 原段落 | 新文件 |
|---|---|---|
| test-setup.ts | `getEnv` / `normalize*Url` / `build*Url` / `applyRuntimeCookies` | env-setup.ts |
| test-setup.ts | `selectBatchProject` / `executeSqlVia*` / `openBatchDorisEditor` / `runSqlInCurrentBatchEditor` / `confirmBatchDdlModal` | batch-sql.ts |
| test-setup.ts | `syncMetadata` | metadata-sync.ts |
| test-setup.ts | `getAccessibleProjectIds` / `getQualityProjectId` | quality-project.ts |
| test-setup.ts | re-export from `lib/playwright/index` | index.ts |

### 9.3 兼容写法

`index.ts` re-export 全部新文件 + `lib/playwright/index`。`test-setup.ts` 改为兼容层（仅 `export * from "./index"`）。

外部现有 `import { ... } from "../../helpers/test-setup"` 完全不变；推荐写法 `from "../../helpers"`（barrel）。

### 9.4 删除时机

`test-setup.ts` 兼容层在 phase 6（命名迁移）一并删除；本期保留。

### 9.5 所有项目同步

`migrate-helpers-split.ts` 扫描 `workspace/*/tests/helpers/test-setup.ts`，对每个**实际存在**的 `test-setup.ts` 执行拆分（当前仅 dataAssets 已存在 633 行实体；其他项目若 helpers 是空骨架则跳过）。脚本：

- 一次性、幂等
- 按已知函数名清单（spec §9.2 的固定映射表）路由到目标文件
- 未识别的函数 → 交互式 AskUser 让用户拨归属（默认归到 `env-setup.ts`，标注 `// FIXME: review classification`）
- 拆分后自动跑 `tsc --noEmit` 校验项目级 TypeScript 编译通过

---

## 10. 文件清单

### 10.1 新建

```
.claude/agents/pattern-analyzer-agent.md
.claude/scripts/migrate-session-paths.ts
.claude/scripts/migrate-helpers-split.ts
.claude/scripts/__tests__/migrate-session-paths.test.ts
.claude/scripts/__tests__/migrate-helpers-split.test.ts
workspace/{project}/tests/helpers/env-setup.ts        # 每个项目
workspace/{project}/tests/helpers/batch-sql.ts        # 每个项目
workspace/{project}/tests/helpers/metadata-sync.ts    # 每个项目
workspace/{project}/tests/helpers/quality-project.ts  # 每个项目
workspace/{project}/tests/helpers/index.ts            # 每个项目
```

### 10.2 修改

```
.claude/skills/ui-autotest/SKILL.md                   # 新增 5.5 节、步骤 7-9 Allure 路径、步骤 3 session 多项目、任务可视化
.claude/agents/script-fixer-agent.md                  # 新增 helpers_locked、helpers_modified 字段
.claude/scripts/ui-autotest-progress.ts               # 新增 convergence_status / convergence 字段
.claude/scripts/__tests__/ui-autotest-progress.test.ts # 新增 convergence schema 测试
.claude/skills/ui-autotest/scripts/session-login.ts   # --project 参数
.claude/scripts/plugin-loader.ts                      # notify reportFile 路径
playwright.config.ts                                  # reporter Allure + sessionPath project 段
package.json                                          # allure-playwright + allure-commandline deps
.claude/references/output-schemas.json                # 新增 pattern_analyzer_input/output schema
workspace/{project}/tests/helpers/test-setup.ts       # 改为兼容层（每个项目）
docs/refactor-roadmap.md                              # 标记 phase 3 ✅ DONE（实施完成时）
```

### 10.3 不动

```
.claude/agents/script-writer-agent.md                 # 不改契约
.claude/agents/bug-reporter-agent.md                  # 不改契约
.claude/agents/frontend-bug-agent.md                  # 不改
.claude/agents/backend-bug-agent.md                   # 不改
lib/playwright/                                       # 函数实现不动；新函数走 phase 5
plugins/assets-sql-sync/                              # 不动
.claude/skills/ui-autotest/scripts/parse-cases.ts     # 不动
.claude/skills/ui-autotest/scripts/merge-specs.ts     # 不动
workspace/{project}/tests/helpers/preconditions.ts    # 不动（已是 plugin re-export）
其他 skill                                              # 不动
```

---

## 11. 测试策略

### 11.1 单元测试（`.claude/scripts/__tests__/`）

| 测试文件 | 覆盖 |
|---|---|
| `ui-autotest-progress.test.ts`（追加） | `convergence_status` 默认值（旧 progress 文件兼容）、字段写入、`convergence.common_patterns` 序列化 |
| `migrate-session-paths.test.ts` | 旧路径检测、迁移幂等、目标已存在不覆盖 |
| `migrate-helpers-split.test.ts` | 5 文件生成、test-setup.ts 改为兼容层、index.ts barrel 完整性 |

### 11.2 schema 测试（`.claude/references/output-schemas.json`）

新增 `pattern_analyzer_input` / `pattern_analyzer_output` JSON Schema，验证 agent 输出结构。

### 11.3 Smoke 验证（手动）

```bash
# S1: pattern-analyzer-agent 烟雾
# 准备 2 份 mock fixer summary → 派 pattern-analyzer → 验证返回 common_patterns 结构
# （手工构造 prompt，验证 agent 不写代码、只输出结构化建议）

# S2: Allure 安装 + 报告生成
bun add -d allure-playwright allure-commandline
ACTIVE_ENV=ltqcdev QA_PROJECT=dataAssets QA_SUITE_NAME="smoke-allure" \
  bunx playwright test workspace/dataAssets/tests/202604/【通用配置】json格式配置/smoke.spec.ts --project=chromium
npx allure generate workspace/dataAssets/reports/allure/202604/smoke-allure/ltqcdev/allure-results \
  --output workspace/dataAssets/reports/allure/202604/smoke-allure/ltqcdev/allure-report --clean
# 预期：allure-report/index.html 存在、含 trends/categories tab

# S3: session 多项目路径
bun run .claude/scripts/migrate-session-paths.ts
ls .auth/dataAssets/  # 应有 session-*.json
ACTIVE_ENV=ltqcdev QA_PROJECT=dataAssets bunx playwright test ... # 应正常加载

# S4: helpers 拆分后 spec 兼容
bun run .claude/scripts/migrate-helpers-split.ts
# 跑现有 spec 文件，验证 import 没有 broken
ACTIVE_ENV=ltqcdev QA_PROJECT=dataAssets bunx playwright test workspace/dataAssets/tests/202604/资产-集成测试用例/full.spec.ts

# S5: 5.5 节点触发链路（mock 失败注入）
# 准备一个 5+ 用例 archive，故意写错一个 helper 让多条 fail
# 跑 ui-autotest，观察步骤 5.5 是否触发、convergence_status 变化、helpers 是否被改

# S6: 5.5 不触发短路（失败 < 5）
# 跑只有 2 条 fail 的套件，验证 convergence_status 保持 skipped
```

### 11.4 单测基线维持

`bun test ./.claude/scripts/__tests__` 全绿，基线 653 + 新增 ≥ 25 条。

---

## 12. Success Criteria

- [ ] 本 spec 入库：`docs/refactor/specs/2026-04-18-ui-autotest-evolution-design.md`
- [ ] Plan 入库：`docs/refactor/plans/2026-04-18-ui-autotest-evolution-implementation.md`
- [ ] `pattern-analyzer-agent.md` 入库 + `output-schemas.json` schema 入库
- [ ] `script-fixer-agent.md` 升级（`helpers_locked`、`helpers_modified`）
- [ ] `ui-autotest-progress.ts` schema 升级 + 单测追加
- [ ] `migrate-session-paths.ts` + `migrate-helpers-split.ts` 入库 + 单测全绿
- [ ] `package.json` 加 allure 依赖、`playwright.config.ts` reporter 切换
- [ ] `plugin-loader.ts` reportFile 路径同步
- [ ] `session-login.ts` `--project` 参数
- [ ] 所有 `workspace/{project}/tests/helpers/` 拆 5 文件 + 兼容 `test-setup.ts`
- [ ] SKILL.md 新增 5.5 节、步骤 3/7/8/9 改动、任务可视化更新
- [ ] Smoke S1-S6 全通过
- [ ] `bun test ./.claude/scripts/__tests__` 全绿（≥ 678 条）
- [ ] 现有 spec 文件（dataAssets / xyzh）不修改即可继续运行
- [ ] 无硬编码：脚本/测试无绝对路径/凭证
- [ ] 原子 commit：spec / plan / agent / progress schema / migrate scripts / Allure / session / helpers / SKILL.md / smoke 各自独立

---

## 13. Risks

| 风险 | 缓解 |
|---|---|
| Allure 命令行不在 CI 镜像中 | smoke 阶段验证本地 + CI 镜像安装 instructions 在 plan 中明示；CI 失败不阻断 phase 3 完成（CI 是 phase 5 横切） |
| pattern-analyzer 误判（low confidence pattern 被误应用） | 强制 `confidence=low` 走 AskUserQuestion；helpers diff 应用前必须 `tsc --noEmit` 通过 |
| 5.5 死循环（应用 helpers 后剩余 fixer 又触发新一轮 5.5） | `convergence_status="completed"` 后短路；同一 suite run 内 5.5 最多触发一次 |
| 旧 progress 文件无 `convergence_status` 导致解析报错 | progress.ts read 时自动补默认值；schema 解析失败仅 warning 不抛错 |
| 旧 `.auth/session-*.json` 用户没跑 migrate 直接跑 ui-autotest | session-login.ts 启动时检测旧路径存在 → 自动提示 + 一键迁移 |
| 多项目 session 路径破坏现有 CI/playbook | playwright.config 兼容旧 sessionPath（同时 fallback 检查 `.auth/session-{env}.json`） |
| helpers 拆分后某些项目独有的 helper 函数被误归类 | 拆分脚本交互式（每个函数 propose 归属，让用户拨）；不能纯自动 |
| `test-setup.ts` 兼容层导致循环 import | barrel `index.ts` 不 import `test-setup.ts`，反过来 `test-setup` re-export `index`；单向无环 |
| Allure 报告大小膨胀（每步截图） | 复用 `UI_AUTOTEST_STEP_CAPTURE=failed` 模式，CI 默认 failed-only |
| 通知插件第三方接收方依赖 monocart HTML 路径 | plan 中确认 plugin-loader notify 现在的 consumer 只用 `reportFile` 字符串，不解析 HTML 内容；切 Allure 路径无破坏 |
| 步骤 5.5 在所有 fixer 都失败时无法应用 helpers | pattern-analyzer 返回 `skip_reason=all_individual` 时 5.5 直接 completed 退出，不阻断主流 |
| 5.5 探路 fixer 与剩余 fixer 之间 helpers 状态不一致 | 探路 fixer 修改 helpers 视为"诊断用"，5.5.5 应用阶段以 analyzer 输出为准（覆盖探路修改） |

---

## 14. 🔴 待用户决策（review 时拨方向）

### D-A：`convergence_threshold` 默认值

- **倾向**：5（与 memory `feedback_fixer_batch_strategy` 一致）
- **替代**：3（更早触发收敛、更省 token）/ 8（避免小套件误触发）
- **影响**：决定 SKILL.md 配置项默认值

### D-B：5.5 节点对外可见性

- **倾向**：TaskCreate 任务列表始终展示「步骤 5.5 — 共性收敛」，不触发时标 `[未触发，失败<{{threshold}}]` 后直接 `completed`
- **替代**：只在触发时动态新增任务（用户视角更干净，但断点续传时 task list 不一致）
- **影响**：TaskCreate schema 与可视化

### D-C：旧 monocart 报告路径是否清理

- **倾向**：不动（保留作回滚 reference，体积可忽略）
- **替代**：phase 3 commit 中物理删除 `workspace/{project}/reports/playwright/` 历史目录
- **影响**：commit 体积 + 可回滚性

### D-D：helpers 拆分时是否同步把 dataAssets 独有的 batch-sql / metadata-sync 提到 lib/playwright

- **倾向**：本期不提。`lib/playwright` 当前是 Ant Design 通用层，batch-sql 是数据栈业务专属，提上去会污染通用层
- **替代**：评估 batch-sql 是否对其他项目（xyzh）有复用价值；有 → 提；无 → 留 helpers
- **影响**：长期 lib 层职责边界

---

## 15. Out of Scope（转入后续阶段或 Not Do）

- 9 节点主干工作流重构 → 不做
- script-writer / script-fixer 模型策略调整 → phase 5
- bug-reporter / 前后端 bug agent 重构 → phase 3.5（skill 重排）
- pattern-analyzer 跨 suite / 跨 run 知识沉淀（应用到 knowledge-keeper 或 helpers）→ phase 4
- Allure 跨 CI 实例 history 聚合（中央存储）→ phase 5
- helpers 跨项目共享层（batch-sql 提上 lib/）→ phase 5
- 多分支 session（同账号同环境多 cookie 状态）→ 超 scope
- session-login 自动化（无人值守扫码登录）→ 超 scope
- monocart 报告物理清理 → phase 6（命名迁移时一并）

---

## 16. 交付后下一步

1. 本 spec 由用户审查通过后，`brainstorming` skill 阶段终结，转入 `writing-plans` 阶段
2. writing-plans 产出 `docs/refactor/plans/2026-04-18-ui-autotest-evolution-implementation.md`
3. 实施阶段走 `subagent-driven-development`：spec → plan → agent → progress schema → CLI migrate → Allure → session → helpers → SKILL.md → smoke → 原子 commit
4. 全部 Success Criteria 对号入座 + 原子 commit 后，主 agent 生成"phase 3.5 启动 prompt"（skill 重排），并提示用户 `/clear` 或新开 CC 实例继续
