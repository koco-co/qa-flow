# MD 用例策略矩阵 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 test-case-gen 主流程前端新增 `probe` 节点（workflow 9 → 10），引入 4 维信号 × 3 档 × 5 套策略矩阵；knowledge-keeper 首次接入 writer 上下文；S5 场景建议切 hotfix-case-gen。

**Architecture:** 新增两个 CLI：`.claude/scripts/signal-probe.ts`（4 维度采集）+ `.claude/scripts/strategy-router.ts`（策略派发）。两者都走"纯函数 lib + CLI"范式（`lib/signal-probe.ts` / `lib/strategy-router.ts`）。策略模板单点维护在 `.claude/references/strategy-templates.md`；JSON schema 在 `.claude/references/strategy-schema.json`。discuss.ts 增 `set-strategy` 子命令；state.ts 的 qa_state 增 `strategy_resolution` 字段；plan.md frontmatter 增 `strategy` 字段。三个 agent（transform / analyze / writer）prompt 追加统一"读策略"入口 section，具体差异读 strategy-templates.md。

**Tech Stack:** Bun + TypeScript（同 discuss / knowledge-keeper / create-project），Markdown only for SKILL/agents/rules/references。

**Spec:** [`../specs/2026-04-18-md-case-strategy-matrix-design.md`](../specs/2026-04-18-md-case-strategy-matrix-design.md)

**Roadmap:** [`../../refactor-roadmap.md`](../../refactor-roadmap.md)

**Upstream Phases:** Phase 0（信息架构）/ Phase 2（discuss + plan.md）/ Phase 3（ui-autotest）/ Phase 3.5（skill 重排，hotfix-case-gen 已拆出）均已完成。

---

## Open Questions 决策（来自 spec §9.2）

| # | 问题 | Plan 阶段决策 | 实施注记 |
|---|---|---|---|
| 1 | S3 历史回归基线复用率 50% 是否写死？ | **写死 0.5 作为默认值** + 允许 analyze-agent 根据 `historical_coverage.length` 动态调高（>10 条时 0.6）；调整逻辑写入 analyze-agent prompt 的 S3 section，不做代码路径 | 落 Task 11 |
| 2 | knowledge 模块匹配多模块？ | **本期仅按 PRD frontmatter `modules[0]` 单模块匹配** → kebab-case → 查 `knowledge/modules/<kebab>.md`；多模块合并留给 phase 5 | 落 Task 3 |
| 3 | S5 外转是否增加"就地生成"选项？ | **保持 spec 约定**：3 选项（切 skill / 降级 S4 / 取消）；不加"就地生成"新分支，避免 skill 边界混淆 | 落 Task 12 |
| 4 | probe 缓存？ | **按 PRD mtime 做文件缓存**：`workspace/{project}/.temp/probe-cache/{slug}.json`；mtime 变化或 `--no-cache` 时重跑；缓存键=PRD mtime + signal-probe.ts mtime | 落 Task 3/4 |
| 5 | strategy-templates.md 结构化验证？ | **本期仅校验 15 个 section 齐全**（5 策略 × 3 agent）：单测用正则扫描 `## S{n} / {agent}` 标题；YAML 结构化留给 phase 5 CLI 统一封装 | 落 Task 2 |

---

## 关键不变量（跨 Task 守护）

1. `bun test ./.claude/scripts/__tests__` 在每 Task 结束时全绿；基线 **686**（phase 3 收尾），phase 4 完工 **≥ 740**
2. 不动 `archive-gen.ts` / `xmind-gen.ts` / `history-convert.ts` / `format-check-script.ts` / `format-report-locator.ts` / `repo-profile.ts` 任一字节
3. 不动 `reviewer-agent` / `format-checker-agent` / `enhance-agent` / `standardize-agent` / `hotfix-case-agent` / `bug-reporter-agent` / `script-writer-agent` / `script-fixer-agent` / `pattern-analyzer-agent`
4. `transform-agent` / `analyze-agent` / `writer-agent` 现有步骤**只扩不改**：仅追加一段"策略模板"入口 section，不动 6 步 / 4 步 / 5 步主流程
5. 不动 `standardize` / `reverse_sync` workflow 分支（spec §3 已确认）
6. strategy_id 未提供时默认 **S1** 行为（向后兼容），旧 plan.md / 旧 qa-state 自动容错
7. CLI 契约对齐既有脚本：stdout 输出 JSON、stderr `[signal-probe] <msg>\n` / `[strategy-router] <msg>\n`、exit 0/1/2
8. 所有向 `workspace/{project}/` 测试目录写入必须在 `after()` 清理，使用独立 fixture project（`probe-fixture` / `router-fixture`）
9. 无硬编码绝对路径 / 凭证；仓库根用 `repoRoot()`，项目路径用 `paths.ts` helper
10. 任何 archive / knowledge / source 的调用都走既有脚本契约（`archive-gen search` / `knowledge-keeper read-core|read-module` / `source-analyze analyze`），**禁止**新实现同类功能
11. knowledge 注入到 writer-context 时，写入前按 8KB 截断（避免 context 膨胀）
12. probe 缓存路径用 `workspace/{project}/.temp/probe-cache/`，不污染 `workspace/{project}/.temp` 的其他状态文件

---

## 文件布局

| 文件 | 动作 | 责任 |
|---|---|---|
| `docs/refactor/plans/2026-04-18-md-case-strategy-matrix-implementation.md` | Create | 本 plan |
| `.claude/scripts/lib/paths.ts` | Edit | 新增 `probeCachePath(project, slug)` helper |
| `.claude/scripts/__tests__/lib/paths.test.ts` | Edit | 补 probeCachePath 单测 |
| `.claude/references/strategy-schema.json` | Create | signal_profile + strategy_resolution JSON Schema |
| `.claude/references/strategy-templates.md` | Create | 5 策略 × 3 agent = 15 section 的模板定义 |
| `.claude/scripts/__tests__/references/strategy-templates.test.ts` | Create | 结构校验（15 section 齐全） |
| `.claude/scripts/lib/signal-probe.ts` | Create | 纯函数：判档 / 合成 profile / 缓存键 |
| `.claude/scripts/__tests__/lib/signal-probe.test.ts` | Create | 纯函数单测 |
| `.claude/scripts/signal-probe.ts` | Create | CLI 入口（probe action） |
| `.claude/scripts/__tests__/signal-probe.test.ts` | Create | CLI 集成测试 |
| `.claude/scripts/lib/strategy-router.ts` | Create | 纯函数：命中规则 / override 生成 |
| `.claude/scripts/__tests__/lib/strategy-router.test.ts` | Create | 纯函数单测 |
| `.claude/scripts/strategy-router.ts` | Create | CLI 入口（resolve action） |
| `.claude/scripts/__tests__/strategy-router.test.ts` | Create | CLI 集成测试 |
| `.claude/scripts/lib/discuss.ts` | Edit | 新增 `setStrategyInPlan(raw, resolution)` / `PlanFrontmatter.strategy` 字段类型 |
| `.claude/scripts/discuss.ts` | Edit | 新增 `set-strategy` 子命令 |
| `.claude/scripts/__tests__/lib/discuss.test.ts` | Edit | 补 setStrategyInPlan 单测 |
| `.claude/scripts/__tests__/discuss.test.ts` | Edit | 补 set-strategy 集成测试 |
| `.claude/scripts/state.ts` | Edit | qa_state 增 `strategy_resolution` 字段（读写容错） |
| `.claude/scripts/__tests__/state.test.ts` | Edit | 补 strategy_resolution 读写单测 |
| `.claude/scripts/writer-context-builder.ts` | Edit | 接受 `--strategy-id` / `--knowledge-injection` 参数，输出扩展 `strategy_id` + `knowledge` 字段 |
| `.claude/scripts/__tests__/writer-context-builder.test.ts` | Edit | 补 strategy / knowledge 注入单测 |
| `.claude/skills/test-case-gen/SKILL.md` | Edit | 插入节点 1.75「probe」（9 → 10 节点），任务可视化更新 |
| `.claude/agents/transform-agent.md` | Edit | 追加"策略模板"入口 section |
| `.claude/agents/analyze-agent.md` | Edit | 追加"策略模板"入口 section |
| `.claude/agents/writer-agent.md` | Edit | 追加"策略模板"入口 section |
| `.claude/references/output-schemas.json` | Edit | 追加 `signal_profile` / `strategy_resolution` schema 引用；扩 `qa_state_file` |
| `docs/refactor-roadmap.md` | Edit (last) | phase 4 标 ✅ DONE |

---

## Task 1：基线快照 + paths.ts 扩展

**目的**：锁定基线测试数 + 在 `paths.ts` 增加 probe-cache 路径 helper。

**Files:**
- Edit: `.claude/scripts/lib/paths.ts`
- Edit: `.claude/scripts/__tests__/lib/paths.test.ts`

- [ ] **Step 1: 记录基线测试数**

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：`686 pass / 0 fail`（与 phase 3.5 收尾一致）。如基线偏差，停止并向用户报告。

- [ ] **Step 2: paths.ts 追加 helper**

在 `tempDir(project)` 之后追加：

```typescript
export function probeCacheDir(project: string): string {
  return join(tempDir(project), "probe-cache");
}

export function probeCachePath(project: string, prdSlug: string): string {
  return join(probeCacheDir(project), `${prdSlug}.json`);
}
```

- [ ] **Step 3: 单测**

在 `paths.test.ts` 补：
- `probeCacheDir("dataAssets")` → `<workspaceDir>/dataAssets/.temp/probe-cache`
- `probeCachePath("dataAssets", "15695-quality")` → `.../.temp/probe-cache/15695-quality.json`
- 不依赖文件系统，纯路径拼接断言

- [ ] **Step 4: 测试**

```bash
bun test ./.claude/scripts/__tests__/lib/paths.test.ts
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：`>= 688 pass / 0 fail`。

- [ ] **Commit:**

```
feat(phase4): add probe-cache path helpers in paths.ts
```

---

## Task 2：strategy-schema.json + strategy-templates.md 文档骨架

**目的**：先落地 JSON Schema 和模板文档骨架，供后续脚本与 agent 引用；本 Task 不落地脚本。

**Files:**
- Create: `.claude/references/strategy-schema.json`
- Create: `.claude/references/strategy-templates.md`
- Create: `.claude/scripts/__tests__/references/strategy-templates.test.ts`

- [ ] **Step 1: strategy-schema.json 内容**

按 spec §4.2.2 / §4.3.2 的 JSON 结构落 Schema。根对象包含两个 definitions：

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Strategy Matrix Schema",
  "definitions": {
    "SignalLevel": {
      "enum": ["strong", "weak", "missing"]
    },
    "StrategyId": {
      "enum": ["S1", "S2", "S3", "S4", "S5"]
    },
    "SignalProfile": {
      "type": "object",
      "required": ["source", "prd", "history", "knowledge", "probed_at", "project", "prd_path"],
      "properties": {
        "source": { "$ref": "#/definitions/SignalEntry" },
        "prd": { "$ref": "#/definitions/SignalEntry" },
        "history": { "$ref": "#/definitions/SignalEntry" },
        "knowledge": { "$ref": "#/definitions/SignalEntry" },
        "probed_at": { "type": "string", "format": "date-time" },
        "project": { "type": "string" },
        "prd_path": { "type": "string" }
      }
    },
    "SignalEntry": {
      "type": "object",
      "required": ["level", "evidence"],
      "properties": {
        "level": { "$ref": "#/definitions/SignalLevel" },
        "evidence": { "type": "object" }
      }
    },
    "StrategyResolution": {
      "type": "object",
      "required": ["strategy_id", "strategy_name", "signal_profile", "overrides", "resolved_at"],
      "properties": {
        "strategy_id": { "$ref": "#/definitions/StrategyId" },
        "strategy_name": { "type": "string" },
        "signal_profile": { "$ref": "#/definitions/SignalProfile" },
        "overrides": {
          "type": "object",
          "properties": {
            "transform": { "type": "object" },
            "analyze": { "type": "object" },
            "writer": { "type": "object" },
            "review": { "type": "object" },
            "thresholds": { "type": "object" }
          }
        },
        "resolved_at": { "type": "string", "format": "date-time" }
      }
    }
  }
}
```

- [ ] **Step 2: strategy-templates.md 内容**

按 spec §4.3.1 的 5 套策略 × 3 agent 落 15 个 section。文件结构：

```markdown
# 策略模板

> 单点维护 5 套策略（S1-S5）在 transform / analyze / writer 三个 agent 下的 prompt 变体。
> 本文件为静态定义；agent 在任务提示收到 `strategy_id` 时读取对应 section。

## 命中顺序

S5 → S2 → S3 → S1 → S4（默认兜底）

## S1 / transform

（transform-agent 在 S1 下的行为差异描述）

## S1 / analyze
...（其余 14 个 section 按相同格式落）
```

每个 section 固定四行：
1. **prompt_variant**：变体名（如 `standard` / `source_first` / `regression_focused` / `conservative` / `blocked`）
2. **关键差异**：与 S1 标准行为的对比
3. **override 字段**：JSON 片段，示例化 `overrides.{agent}` 结构
4. **引用**：指回 spec 章节号

具体内容按 spec §4.3.1 表格 + §4.3.3 knowledge 加成填充。

- [ ] **Step 3: 结构校验单测**

创建 `strategy-templates.test.ts`：

```typescript
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../..");
const templatesPath = resolve(repoRoot, ".claude/references/strategy-templates.md");

describe("strategy-templates.md", () => {
  const content = readFileSync(templatesPath, "utf8");

  const strategies = ["S1", "S2", "S3", "S4", "S5"];
  const agents = ["transform", "analyze", "writer"];

  for (const s of strategies) {
    for (const a of agents) {
      test(`contains section ## ${s} / ${a}`, () => {
        const header = `## ${s} / ${a}`;
        expect(content).toContain(header);
      });
    }
  }

  test("contains 命中顺序 section", () => {
    expect(content).toContain("## 命中顺序");
    expect(content).toContain("S5 → S2 → S3 → S1 → S4");
  });
});
```

- [ ] **Step 4: JSON Schema 合规性单测**

在同文件补：

```typescript
test("strategy-schema.json is valid JSON and exposes required definitions", () => {
  const schemaPath = resolve(repoRoot, ".claude/references/strategy-schema.json");
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  expect(schema.definitions).toBeDefined();
  expect(schema.definitions.SignalProfile).toBeDefined();
  expect(schema.definitions.StrategyResolution).toBeDefined();
  expect(schema.definitions.SignalLevel.enum).toEqual(["strong", "weak", "missing"]);
  expect(schema.definitions.StrategyId.enum).toEqual(["S1", "S2", "S3", "S4", "S5"]);
});
```

- [ ] **Step 5: 测试**

```bash
bun test ./.claude/scripts/__tests__/references/strategy-templates.test.ts
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：含 17 条新增测试（15 section + 命中顺序 + schema 合规）；`>= 705 pass`。

- [ ] **Commit:**

```
feat(phase4): add strategy schema and templates references
```

---

## Task 3：lib/signal-probe.ts 纯函数实现

**目的**：实现 4 维度判档、signal_profile 合成、缓存键计算全部纯函数，零 I/O（I/O 留给 CLI 层）。

**Files:**
- Create: `.claude/scripts/lib/signal-probe.ts`

- [ ] **Step 1: 类型定义**

```typescript
export type SignalLevel = "strong" | "weak" | "missing";

export interface SignalEntry {
  level: SignalLevel;
  evidence: Record<string, unknown>;
}

export interface SignalProfile {
  source: SignalEntry;
  prd: SignalEntry;
  history: SignalEntry;
  knowledge: SignalEntry;
  probed_at: string;
  project: string;
  prd_path: string;
}

export interface SourceAnalyzeOutput {
  a_level: Array<unknown>;
  b_level: Array<unknown>;
  coverage_rate: number;
  searched_files: number;
  matched_files: number;
}

export interface ArchiveSearchHit {
  score: number;
  path: string;
  suite_name?: string;
}

export interface KnowledgeReadCore {
  overview: string;
  terms: string;
  index?: string;
}

export interface ProbeCacheEntry {
  prd_mtime_ms: number;
  probe_script_mtime_ms: number;
  profile: SignalProfile;
}
```

- [ ] **Step 2: 判档纯函数**

```typescript
export function classifySource(output: SourceAnalyzeOutput | null): SignalEntry;
export function classifyPrd(input: {
  fieldFillRate: number;
  confidence: number;
  pageCount: number;
}): SignalEntry;
export function classifyHistory(hits: ArchiveSearchHit[]): SignalEntry;
export function classifyKnowledge(input: {
  core: KnowledgeReadCore | null;
  matchedModuleContent: string | null;
}): SignalEntry;
```

实现要点（按 spec §4.2.1 判据）：
- `classifySource`：output=null → missing；`a_level.length >= 3 && coverage_rate >= 0.05` → strong；`a_level.length in [1,2]` 或仅 b_level 非空 → weak；否则 missing
- `classifyPrd`：`fieldFillRate >= 0.7 && confidence >= 0.8` → strong；`fieldFillRate in [0.3, 0.7)` → weak；否则 missing
- `classifyHistory`：相关度 `>= 0.7 && hits_count >= 2` → strong；`>= 0.5 && hits_count >= 1` → weak；否则 missing
- `classifyKnowledge`：`core !== null && matchedModuleContent !== null` → strong；`core !== null` → weak；否则 missing
- 所有 evidence 字段必填：source → `{ a_level_count, b_level_count, coverage_rate }`；prd → `{ field_fill_rate, confidence, page_count }`；history → `{ top_hits, best_score }`；knowledge → `{ core_nonempty, matched_module }`

- [ ] **Step 3: 字段填充率计算纯函数**

```typescript
export function computeFieldFillRate(prdMarkdown: string): {
  fillRate: number;
  pageCount: number;
};
```

实现：
- 以 `### 字段定义` 为锚点切出每页字段表
- 表格每行（跳过分隔符行）的 `字段名 / 控件类型 / 必填 / 校验规则` 四列非空占比 → 累加平均
- 无字段表 → 返回 `fillRate: 0, pageCount: 0`
- 容错：表格头标识模糊时按 `| 字段名 |` 前缀识别

- [ ] **Step 4: matched module kebab-case 转换**

```typescript
export function firstModuleKebab(prdFrontmatter: {
  modules?: string[];
}): string | null;
```

实现：
- `modules` 为空或未定义 → null
- 取 `modules[0]`，空格转 `-`，中文/ASCII 混合原样保留（测试用 fixture 校验）；调用方负责检查文件存在

- [ ] **Step 5: 缓存键函数**

```typescript
export function isCacheValid(
  entry: ProbeCacheEntry | null,
  prdMtimeMs: number,
  probeScriptMtimeMs: number,
): boolean;

export function buildCacheEntry(
  profile: SignalProfile,
  prdMtimeMs: number,
  probeScriptMtimeMs: number,
): ProbeCacheEntry;
```

实现：
- `isCacheValid` → 当且仅当 entry.prd_mtime_ms === prdMtimeMs && entry.probe_script_mtime_ms === probeScriptMtimeMs

- [ ] **Step 6: 组装 profile 纯函数**

```typescript
export function composeProfile(input: {
  project: string;
  prdPath: string;
  source: SignalEntry;
  prd: SignalEntry;
  history: SignalEntry;
  knowledge: SignalEntry;
  now: Date;
}): SignalProfile;
```

返回完整 `SignalProfile`，`probed_at` 由 `now.toISOString()` 生成。

- [ ] **Step 7: 防御**

- 所有外部数据输入 null/undefined 容错（见 spec §4.2.3）
- 不依赖 `process.cwd()`；不访问文件系统

- [ ] **Commit:**

```
feat(phase4): add lib/signal-probe.ts pure functions for 4-dim classification
```

---

## Task 4：lib/signal-probe.ts 单元测试

**目的**：≥ 12 条纯函数测试覆盖 4 维度 × 3 档边界 + 字段填充率 + 缓存键。

**Files:**
- Create: `.claude/scripts/__tests__/lib/signal-probe.test.ts`

- [ ] **Step 1: 测试组**

- `classifySource` — a_level ≥ 3 & coverage ≥ 0.05 → strong / a_level=2 → weak / 仅 b_level → weak / 全空 → missing / output=null → missing（5 用例）
- `classifyPrd` — fill=0.85 & conf=0.9 → strong / fill=0.5 → weak / fill=0.2 → missing（3 用例）
- `classifyHistory` — 3 hits 全 ≥ 0.8 → strong / 1 hit 0.6 → weak / 全 < 0.5 → missing（3 用例）
- `classifyKnowledge` — core+module → strong / 仅 core → weak / null → missing（3 用例）
- `computeFieldFillRate` — 3 页完整填充 90% → pageCount=3 / fillRate≈0.9；无字段表 → fillRate=0（2 用例）
- `firstModuleKebab` — `["商品管理"]` → `商品管理`；`[]` → null；undefined → null（3 用例）
- `isCacheValid` / `buildCacheEntry` — mtime 匹配 true / mtime 不匹配 false / entry=null false（3 用例）
- `composeProfile` — 固定 now → probed_at 正确（1 用例）

- [ ] **Step 2: 固定时钟**

```typescript
const now = new Date("2026-04-18T10:30:00+08:00");
```

- [ ] **Step 3: 测试**

```bash
bun test ./.claude/scripts/__tests__/lib/signal-probe.test.ts
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：≥ 23 用例全绿；`>= 728 pass`。

- [ ] **Commit:**

```
test(phase4): add unit tests for lib/signal-probe.ts
```

---

## Task 5：signal-probe.ts CLI + 集成测试

**目的**：CLI 包装 lib/signal-probe.ts，提供 `probe` action；走真实 `source-analyze` / `archive-gen search` / `knowledge-keeper read-core|read-module` 采集；实现 PRD mtime 缓存。

**Files:**
- Create: `.claude/scripts/signal-probe.ts`
- Create: `.claude/scripts/__tests__/signal-probe.test.ts`

- [ ] **Step 1: CLI 入口骨架**

```typescript
#!/usr/bin/env bun
/**
 * signal-probe.ts — 4 维信号探针（源码/PRD/历史/知识库）。
 * Usage: bun run .claude/scripts/signal-probe.ts probe --project <name> --prd <path> [--no-cache] [--output json]
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { Command } from "commander";
import { repoRoot } from "./lib/env.ts";
import { probeCachePath } from "./lib/paths.ts";
import {
  buildCacheEntry,
  classifyHistory,
  classifyKnowledge,
  classifyPrd,
  classifySource,
  composeProfile,
  computeFieldFillRate,
  firstModuleKebab,
  isCacheValid,
  ProbeCacheEntry,
  SignalProfile,
} from "./lib/signal-probe.ts";
import { parseFrontMatter } from "./lib/frontmatter.ts";
```

- [ ] **Step 2: 子命令 invoker 封装**

```typescript
function invokeJson(args: string[]): unknown | null {
  const result = spawnSync("bun", ["run", ...args], {
    encoding: "utf8",
    cwd: repoRoot(),
  });
  if (result.status !== 0) {
    process.stderr.write(`[signal-probe] delegate exit ${result.status}: ${args.join(" ")}\n`);
    return null;
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: 采集 4 维信号**

`probe` action 流程：

1. 读 PRD frontmatter + 正文
2. **源码**：从 frontmatter `repos[]` 提取仓库；按第一个 repo 调 `.claude/scripts/source-analyze.ts analyze --repo <path> --keywords <...>`；无 repos → null
3. **PRD**：`computeFieldFillRate(prdBody)` + frontmatter.confidence
4. **历史**：读 frontmatter `requirement_name` 或 `modules[0]` 作为 query，调 `archive-gen.ts search --query <> --project <> --limit 5`；过滤 `search-filter.ts filter --top 5 --output json`
5. **知识库**：调 `knowledge-keeper.ts read-core --project <>`；用 `firstModuleKebab` 算模块 kebab；若非 null 调 `read-module --project <> --module <kebab>`；均通过 `invokeJson` 容错

- [ ] **Step 4: 缓存层**

```typescript
function resolveCache(cachePath: string): ProbeCacheEntry | null;
function saveCache(cachePath: string, entry: ProbeCacheEntry): void;
```

缓存命中：
- 读 `probeCachePath(project, prdSlug)`
- `isCacheValid(entry, prdMtime, probeScriptMtime)` === true → 直接输出 `entry.profile` + stderr `[signal-probe] cache hit\n`
- 否则重跑 4 维采集 → saveCache → 输出

`--no-cache` 强制重跑且不更新缓存。

- [ ] **Step 5: CLI 参数**

```typescript
program
  .command("probe")
  .requiredOption("--project <name>", "Project name under workspace/")
  .requiredOption("--prd <path>", "Absolute or relative path to PRD markdown")
  .option("--no-cache", "Bypass cache and re-run probe")
  .option("--output <format>", "Output format (json|summary)", "json")
  .action(async (opts) => { /* ... */ });
```

输出：
- `--output json`（默认）→ stdout 完整 `SignalProfile` JSON
- `--output summary` → stderr 打印 `[signal-probe] source=strong prd=weak history=strong knowledge=missing`（供人工调试）；stdout 仍输出 JSON

- [ ] **Step 6: 集成测试 fixture**

```typescript
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

const repoRoot = resolve(import.meta.dirname, "..");
const project = "probe-fixture";
const prdDir = join(repoRoot, "workspace", project, "prds", "202604");
const prdPath = join(prdDir, "smoke-probe.md");

beforeEach(() => {
  mkdirSync(prdDir, { recursive: true });
  mkdirSync(join(repoRoot, "workspace", project, "knowledge"), { recursive: true });
  writeFileSync(prdPath, [
    "---",
    "requirement_id: 99999",
    "requirement_name: 探针烟雾",
    "modules: [\"商品管理\"]",
    "confidence: 0.2",
    "repos: []",
    "---",
    "# 探针烟雾",
    "",
  ].join("\n"));
});

afterEach(() => {
  rmSync(join(repoRoot, "workspace", project), { recursive: true, force: true });
});

function runCli(args: string[]) {
  return spawnSync("bun", ["run", join(repoRoot, ".claude/scripts/signal-probe.ts"), ...args], {
    encoding: "utf8",
    cwd: repoRoot,
  });
}
```

- [ ] **Step 7: 集成用例**

- probe 返回合法 SignalProfile JSON / status=0
- 无 repos + 无历史 + 无 knowledge → 全部 missing/weak 档
- PRD confidence=0.2 → prd.level === "missing"
- `--no-cache` 不创建 cache 文件
- 首次 probe 创建 cache；PRD mtime 不变时重跑命中缓存（stderr 含 `cache hit`）
- PRD touch 后重跑不命中缓存

- [ ] **Step 8: 测试**

```bash
bun test ./.claude/scripts/__tests__/signal-probe.test.ts
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：≥ 6 集成用例全绿；`>= 734 pass`。

- [ ] **Step 9: 副作用清理验证**

```bash
ls workspace/probe-fixture 2>/dev/null && echo "FAIL: residue" || echo "clean"
```

预期：`clean`。

- [ ] **Commit:**

```
feat(phase4): add signal-probe CLI with 4-dim collection and mtime cache
```

---

## Task 6：lib/strategy-router.ts 纯函数实现

**目的**：5 套策略命中规则 + override 生成，全部纯函数。

**Files:**
- Create: `.claude/scripts/lib/strategy-router.ts`

- [ ] **Step 1: 类型**

```typescript
import type { SignalLevel, SignalProfile } from "./signal-probe.ts";

export type StrategyId = "S1" | "S2" | "S3" | "S4" | "S5";

export interface StrategyOverrides {
  transform?: Record<string, unknown>;
  analyze?: Record<string, unknown>;
  writer?: Record<string, unknown>;
  review?: Record<string, unknown>;
  thresholds?: Record<string, unknown>;
}

export interface StrategyResolution {
  strategy_id: StrategyId;
  strategy_name: string;
  signal_profile: SignalProfile;
  overrides: StrategyOverrides;
  resolved_at: string;
}
```

- [ ] **Step 2: 命中顺序函数**

```typescript
export function selectStrategy(profile: SignalProfile): StrategyId;
```

按 spec §4.3.1 命中顺序：
1. `prd.level === "missing" && source.level === "strong"` → S5
2. `source.level === "strong" && (prd.level === "weak" || prd.level === "missing")` → S2
3. `prd.level === "strong" && history.level === "strong" && source.level === "weak"` → S3
4. `source.level === "strong" && prd.level === "strong" && history.level === "strong"` → S1
5. 否则 → S4

- [ ] **Step 3: overrides 生成**

```typescript
export function buildOverrides(
  strategyId: StrategyId,
  knowledgeLevel: SignalLevel,
): StrategyOverrides;
```

按 spec §4.3 + §4.3.3：
- S1：标准行为；knowledge strong → writer.knowledge_injection="read-module"；knowledge weak → "read-core"；knowledge missing → "none"
- S2：writer.prompt_variant="source_first"；transform.prd_fill_priority="source_first"；knowledge 同 S1 规则
- S3：analyze.dimensions=["functional_positive","functional_negative","boundary","regression"]；writer.prompt_variant="regression_focused"；writer.reuse_history_ratio=0.5；knowledge 同
- S4：writer.prompt_variant="conservative"；review.problem_rate_block=0.3；thresholds.clarify_default_severity="blocking_unknown"
- S5：writer.prompt_variant="blocked"；transform.skip=true；analyze.skip=true（S5 不下发 writer）

- [ ] **Step 4: compose**

```typescript
export function composeResolution(
  profile: SignalProfile,
  now: Date,
): StrategyResolution;
```

内部调 `selectStrategy` + `buildOverrides`，`resolved_at = now.toISOString()`。

- [ ] **Step 5: 策略名映射**

```typescript
const STRATEGY_NAMES: Record<StrategyId, string> = {
  S1: "完整型",
  S2: "源码为主",
  S3: "历史回归",
  S4: "保守兜底",
  S5: "路由外转",
};
```

- [ ] **Commit:**

```
feat(phase4): add lib/strategy-router.ts pure functions for strategy dispatch
```

---

## Task 7：lib/strategy-router.ts 单元测试

**目的**：5 策略命中 + overrides + knowledge 加成独立。

**Files:**
- Create: `.claude/scripts/__tests__/lib/strategy-router.test.ts`

- [ ] **Step 1: selectStrategy 命中用例**

- all-strong → S1
- source=strong, prd=weak, history=strong, knowledge=weak → S2（源码优先，不走 S1）
- prd=strong, source=weak, history=strong, knowledge=strong → S3
- prd=weak, source=weak, history=weak, knowledge=missing → S4（兜底）
- prd=missing, source=strong, history=weak, knowledge=missing → S5（外转优先于 S2）
- 边界：prd=missing, source=weak → S4（S5 要求源码强）
- 边界：prd=strong, source=strong, history=weak → S4（S1 要求 history 强）

（≥ 7 用例）

- [ ] **Step 2: buildOverrides knowledge 加成独立**

- S1 + knowledge=strong → `writer.knowledge_injection === "read-module"`
- S1 + knowledge=weak → `writer.knowledge_injection === "read-core"`
- S1 + knowledge=missing → `writer.knowledge_injection === "none"`
- S3 + knowledge=strong → 同时包含 reuse_history_ratio=0.5 + knowledge_injection="read-module"
- S5 + knowledge=strong → writer.prompt_variant="blocked" 仍保持 knowledge_injection 字段存在

（≥ 5 用例）

- [ ] **Step 3: composeResolution 集成**

- 固定 now=`2026-04-18T10:30:00+08:00` → `resolved_at === "2026-04-18T02:30:00.000Z"`
- 所有必填字段非空

（≥ 2 用例）

- [ ] **Step 4: 测试**

```bash
bun test ./.claude/scripts/__tests__/lib/strategy-router.test.ts
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：≥ 14 用例；`>= 748 pass`。

- [ ] **Commit:**

```
test(phase4): add unit tests for lib/strategy-router.ts
```

---

## Task 8：strategy-router.ts CLI + 集成测试

**目的**：CLI 包装 lib/strategy-router.ts，接收 `--profile <json>` 输出 StrategyResolution。

**Files:**
- Create: `.claude/scripts/strategy-router.ts`
- Create: `.claude/scripts/__tests__/strategy-router.test.ts`

- [ ] **Step 1: CLI**

```typescript
program
  .command("resolve")
  .requiredOption("--profile <json|@path>", "SignalProfile JSON string or @<path>")
  .option("--output <format>", "json|summary", "json")
  .action((opts) => {
    let profileRaw: string;
    if (opts.profile.startsWith("@")) {
      profileRaw = readFileSync(opts.profile.slice(1), "utf8");
    } else {
      profileRaw = opts.profile;
    }
    const profile = JSON.parse(profileRaw);
    // TODO: schema validate against strategy-schema.json#SignalProfile（本期通过 typeof check 简化）
    const resolution = composeResolution(profile, new Date());
    process.stdout.write(`${JSON.stringify(resolution, null, 2)}\n`);
  });
```

- [ ] **Step 2: 集成用例**

- 传 `--profile <inline JSON>` → stdout 合法 StrategyResolution JSON
- 传 `--profile @path/to/file.json` → 同
- 非法 JSON → exit 1
- strategy_id 落到期望值（对 5 组固定 profile 输入验证）

（≥ 5 用例）

- [ ] **Step 3: 测试**

```bash
bun test ./.claude/scripts/__tests__/strategy-router.test.ts
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：`>= 753 pass`。

- [ ] **Commit:**

```
feat(phase4): add strategy-router CLI
```

---

## Task 9：discuss.ts set-strategy 子命令 + state.ts 扩展

**目的**：plan.md frontmatter 增 `strategy` 字段；state.ts qa_state 增 `strategy_resolution` 字段。两者独立 Task 但一次 commit。

**Files:**
- Edit: `.claude/scripts/lib/discuss.ts`
- Edit: `.claude/scripts/discuss.ts`
- Edit: `.claude/scripts/state.ts`
- Edit: `.claude/scripts/__tests__/lib/discuss.test.ts`
- Edit: `.claude/scripts/__tests__/discuss.test.ts`
- Edit: `.claude/scripts/__tests__/state.test.ts`

- [ ] **Step 1: lib/discuss.ts 扩 frontmatter 字段**

在 `PlanFrontmatter` interface 追加（可选字段保持向后兼容）：

```typescript
import type { StrategyResolution } from "./strategy-router.ts";

export interface PlanFrontmatter {
  // ... 既有字段
  strategy?: {
    id: string;
    name: string;
    signal_profile: Record<string, unknown>;  // 打平以适配 YAML serialization
    probed_at: string;
  };
}
```

新增 setStrategy 函数：

```typescript
export function setStrategyInPlan(
  raw: string,
  resolution: StrategyResolution,
  now: Date,
): string;
```

实现：
- 解析原 frontmatter
- 追加/覆盖 `strategy` 字段（YAML 嵌套对象序列化；采用 inline JSON 字符串形式 `strategy: '{"id":"S3",...}'` 避免深层 YAML 解析复杂度）
- 更新 `updated_at`

- [ ] **Step 2: discuss.ts 新增 set-strategy action**

```typescript
program
  .command("set-strategy")
  .requiredOption("--project <name>")
  .requiredOption("--prd <path>")
  .requiredOption("--strategy-resolution <json|@path>", "StrategyResolution JSON or @path")
  .action((opts) => { /* 读 plan → setStrategyInPlan → 写回 */ });
```

- [ ] **Step 3: state.ts 扩 strategy_resolution**

在 `update` / `resume` action 中：
- `--data` 支持 `strategy_resolution` 字段写入（位于 root level，非 node data）
- `resume` 时返回 JSON 包含 `strategy_resolution`（若存在）
- 旧 state 文件缺字段 → 默认 null，不报错

- [ ] **Step 4: lib/discuss.ts 单测**

- setStrategyInPlan 新建 strategy 字段 → frontmatter 含 strategy.id === "S3"
- setStrategyInPlan 覆盖已有 strategy → 替换而非追加
- updated_at 同步刷新

- [ ] **Step 5: discuss.ts 集成测试**

- `bun run discuss.ts set-strategy` → plan.md 更新
- set-strategy 前先 init → 否则 exit 1

- [ ] **Step 6: state.test.ts 补用例**

- `update --data '{"strategy_resolution": {...}}'` → state 文件含字段
- `resume` 返回 strategy_resolution
- 旧 state 无字段 → resume 返回 strategy_resolution=null

- [ ] **Step 7: 测试**

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：`>= 765 pass`。

- [ ] **Commit:**

```
feat(phase4): wire strategy into plan.md frontmatter and qa-state
```

---

## Task 10：writer-context-builder 扩 knowledge 注入

**目的**：`writer-context-builder.ts` 接受 `--strategy-id` / `--knowledge-injection` 参数，输出 `strategy_id` + `knowledge` 字段；knowledge 片段按策略读入并截断 8KB。

**Files:**
- Edit: `.claude/scripts/writer-context-builder.ts`
- Edit: `.claude/scripts/__tests__/writer-context-builder.test.ts`

- [ ] **Step 1: 类型扩展**

```typescript
interface WriterContext {
  writer_id: string;
  module_prd_section: string;
  test_points: unknown[];
  rules: Record<string, unknown>;
  strategy_id: string;
  knowledge: {
    core?: { overview: string; terms: string };
    module?: { frontmatter: Record<string, unknown>; content: string };
  };
  fallback: boolean;
}
```

- [ ] **Step 2: CLI 参数**

```typescript
.option("--strategy-id <id>", "Strategy id from router", "S1")
.option("--knowledge-injection <mode>", "read-core|read-module|none", "read-core")
```

- [ ] **Step 3: knowledge 注入逻辑**

- `--knowledge-injection none` → `knowledge = {}`，跳过
- `--knowledge-injection read-core` → 调 `knowledge-keeper.ts read-core --project`，截断 overview/terms 各 8KB
- `--knowledge-injection read-module` → 先 read-core；再用 writer_id kebab-case 调 `read-module --module <kebab>`；内容截断 8KB；read-module 返回 null 时静默降级为 read-core 结果

- [ ] **Step 4: 单测**

- 默认 `strategy_id === "S1"`，`knowledge.core` 非空
- `--knowledge-injection none` → `knowledge === {}`
- `--knowledge-injection read-module` + fixture knowledge/modules → `knowledge.module.content` 非空
- knowledge-keeper 不存在（fallback）时 `knowledge = {}` 且 status=0
- 8KB 截断生效（fixture 长文本）

- [ ] **Step 5: 测试**

```bash
bun test ./.claude/scripts/__tests__/writer-context-builder.test.ts
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：`>= 770 pass`。

- [ ] **Commit:**

```
feat(phase4): inject knowledge into writer-context-builder by strategy
```

---

## Task 11：三个 agent prompt 追加"策略模板"入口

**目的**：transform-agent / analyze-agent / writer-agent 各追加一段统一"读策略"入口 section；具体差异不内联，引用 strategy-templates.md。

**Files:**
- Edit: `.claude/agents/transform-agent.md`
- Edit: `.claude/agents/analyze-agent.md`
- Edit: `.claude/agents/writer-agent.md`

- [ ] **Step 1: 统一插入位置**

三个 agent 文件均在 `## 步骤` 段之前、`## 输入` 段之后插入如下固定段：

```markdown
## 策略模板（phase 4）

任务提示中包含 `strategy_id`（S1–S5 之一）。按以下规则读取并套用：

1. 读取 `.claude/references/strategy-templates.md`
2. 定位 `## {{strategy_id}} / {{agent_name}}` section（{{agent_name}} = `transform` / `analyze` / `writer`）
3. 按 section 内 `prompt_variant` / 其他 override 字段调整本次执行
4. 未提供 `strategy_id` 时，默认走 S1（向后兼容）
5. strategy_id === "S5" 时：transform 与 analyze 应立即停止并在 stderr 输出 `[<agent>] blocked by S5`；writer 不被派发

> **重要**：本 section 是单点入口；具体差异不在本 agent 文件内内联。修改策略行为请改 strategy-templates.md。
```

- [ ] **Step 2: 写入 `overrides.writer.knowledge` 引用（仅 writer-agent）**

在 writer-agent.md 末尾 `## 注意事项` 段追加：

```markdown
7. 任务提示中若包含 `<knowledge_context>` 片段（由 writer-context-builder 注入），优先级介于"源码上下文"与"历史用例参考"之间，用于统一术语 / 避免已记录的踩坑
```

- [ ] **Step 3: agent prompt 合规性校验**

不新增单测（agent prompt 是纯 markdown；Task 2 已覆盖 strategy-templates 结构）。

- [ ] **Commit:**

```
feat(phase4): add strategy template entry to transform/analyze/writer agents
```

---

## Task 12：SKILL.md 插入 probe 节点 + S5 外转逻辑

**目的**：test-case-gen workflow 9 → 10 节点；init 节点 1.2 之后插入 "probe"；S5 时主 agent AskUserQuestion 引导切 hotfix-case-gen。

**Files:**
- Edit: `.claude/skills/test-case-gen/SKILL.md`

- [ ] **Step 1: workflow 块**

```xml
<workflow>
  <primary>init → probe → discuss → transform → enhance → analyze → write → review → format-check → output</primary>
  <standardize>parse → standardize → review → output</standardize>
  <reverse_sync>confirm_xmind → parse → locate_archive → preview_or_write → report</reverse_sync>
</workflow>
```

- [ ] **Step 2: 任务可视化表**

`### 主流程（9 节点）` → `### 主流程（10 节点）`；init 行之后、discuss 行之前插入：

```
| `probe — 4 维信号探针与策略派发`     | `采集 4 维信号并路由策略`         |
```

任务数 `9 → 10`。

- [ ] **Step 3: init 节点 1.2 之后插入节点 1.75「probe」**

位置：`## 节点 1.5: discuss` 之前。

```markdown
---

## 节点 1.75: probe — 4 维信号探针与策略派发

**目标**：采集 4 维信号（源码 / PRD / 历史 / 知识库），派发到 5 套策略模板之一（S1–S5），结果写入 state + plan.md。

**⏳ Task**：将 `probe` 任务标记为 `in_progress`。

### 1.75.1 触发探针

\`\`\`bash
bun run .claude/scripts/signal-probe.ts probe \
  --project {{project}} \
  --prd {{prd_path}} \
  --output json
\`\`\`

### 1.75.2 策略路由

\`\`\`bash
echo '{{signal_profile_json}}' | bun run .claude/scripts/strategy-router.ts resolve \
  --profile @- \
  --output json
\`\`\`

或用文件形式：

\`\`\`bash
bun run .claude/scripts/strategy-router.ts resolve \
  --profile @workspace/{{project}}/.temp/probe-cache/{{prd_slug}}.json.profile \
  --output json
\`\`\`

### 1.75.3 落盘

- **state.ts**：`bun run .claude/scripts/state.ts update --prd-slug {{slug}} --project {{project}} --node probe --data '{"strategy_resolution": {{resolution_json}}}'`
- **plan.md**（若已存在）：`bun run .claude/scripts/discuss.ts set-strategy --project {{project}} --prd {{prd_path}} --strategy-resolution '{{resolution_json}}'`
  - plan.md 不存在时跳过（discuss 节点会在 init 时由 discuss.ts init 自动带上 strategy 字段）

### 1.75.4 S5 外转处理（交互点 P1）

当 `strategy_resolution.strategy_id === "S5"`：

使用 AskUserQuestion：

- 问题：`检测到 PRD 缺失但源码变更明显（信号：{{signal_summary}}）。建议切换到 Hotfix 用例生成流程。如何处理？`
- 选项 1：切换到 `hotfix-case-gen`（推荐）
- 选项 2：继续主流程（降级为 S4 保守模式）
- 选项 3：取消本次执行

**选项 1**：主 agent 立即停止当前 workflow，引导用户重新输入 `/hotfix-case-gen <Bug URL>`
**选项 2**：调用 `strategy-router.ts resolve --profile ... --force-strategy S4`（后续实现），把 resolution 覆盖为 S4 后继续
**选项 3**：state clean + exit

### 1.75.5 非 S5 情况

直接进入节点 1.5 discuss，把 strategy_id 作为 task prompt 的一部分传递。

**✅ Task**：将 `probe` 任务标记为 `completed`（subject 更新为 `probe — {{strategy_id}} {{strategy_name}}`）。
```

- [ ] **Step 4: discuss / transform / analyze / write 节点任务提示补 strategy_id**

在 discuss / transform / analyze / write 节点的 "派发 subagent" 相关段加一行：

> 派发 subagent 时，task prompt 包含 `strategy_id: {{resolution.strategy_id}}`（若为空默认 S1）。subagent 按 `strategy-templates.md` 对应 section 调整行为。

（写一次置于节点 1.5 末尾，下游节点引用即可，避免 4 次重复）

- [ ] **Step 5: Writer context 命令行参数补全**

节点 5.1（派发 Writer）处现有命令：

```bash
bun run .claude/scripts/writer-context-builder.ts build \
  --prd {{enhanced_prd}} \
  --test-points {{test_points}} \
  --writer-id {{module}} \
  --rules {{rules_merged}} \
  --strategy-id {{resolution.strategy_id}} \
  --knowledge-injection {{resolution.overrides.writer.knowledge_injection}}
```

追加两个参数，其余行不变。

- [ ] **Step 6: strategy-router 的 force-strategy 支持**

Task 8 CLI 追加：

```typescript
.option("--force-strategy <id>", "Override selected strategy (e.g. S4 after user decline)")
```

force 时跳过 selectStrategy，直接取 `--force-strategy` 值构造 resolution。

并在 strategy-router 的集成测试补一用例：`--force-strategy S4` 绕过命中逻辑。

- [ ] **Step 7: 测试**

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：`>= 771 pass / 0 fail`。

- [ ] **Commit:**

```
feat(phase4): add probe node and S5 routing to test-case-gen workflow
```

---

## Task 13：output-schemas.json 更新 + smoke + roadmap

**目的**：output-schemas.json 追加新引用；手动 smoke S1/S3/S4 三套路径；roadmap 标 ✅。

**Files:**
- Edit: `.claude/references/output-schemas.json`
- Edit: `docs/refactor-roadmap.md`

- [ ] **Step 1: output-schemas.json**

在 root definitions 追加：

```json
{
  "signal_profile": { "$ref": "./strategy-schema.json#/definitions/SignalProfile" },
  "strategy_resolution": { "$ref": "./strategy-schema.json#/definitions/StrategyResolution" }
}
```

并在 `qa_state_file` schema 追加可选字段 `strategy_resolution`。

- [ ] **Step 2: smoke S1 完整型**

准备 fixture PRD（字段表 90% 填充 + `repos: [{path,branch,commit}]` 指向真实仓库 + 同模块 ≥ 8 条历史），跑：

```bash
bun run .claude/scripts/signal-probe.ts probe --project dataAssets --prd fixtures/phase4-s1.md
# 期望 profile: source=strong, prd=strong, history=strong
bun run .claude/scripts/strategy-router.ts resolve --profile @<probe_json_path>
# 期望 strategy_id=S1
```

- [ ] **Step 3: smoke S3 历史回归**

fixture PRD 字段表 70% + 源码仅 B 级命中（用 `--keywords` 故意选只出现在 b_level 的词）+ 12 条历史：

```bash
bun run .claude/scripts/signal-probe.ts probe --project dataAssets --prd fixtures/phase4-s3.md
# 期望 profile: source=weak, prd=strong, history=strong
bun run .claude/scripts/strategy-router.ts resolve --profile @...
# 期望 strategy_id=S3
```

- [ ] **Step 4: smoke S4 保守兜底**

fixture PRD 字段表 20% + 无 repos + 0 条历史：

```bash
# 期望 strategy_id=S4
```

- [ ] **Step 5: smoke S5 路由外转**

构造 PRD 仅 frontmatter 无正文，但 repos 非空并在源码里命中关键词：

```bash
# 期望 strategy_id=S5；主流程中会触发 AskUserQuestion（手动验证）
```

- [ ] **Step 6: 端到端 writer-context 注入**

```bash
bun run .claude/scripts/writer-context-builder.ts build \
  --prd fixtures/phase4-s1.md --test-points fixtures/phase4-tp.json \
  --writer-id 商品管理 --strategy-id S1 --knowledge-injection read-core
# stdout JSON 应含 .knowledge.core.overview 字段
```

- [ ] **Step 7: 清理 smoke fixture**

```bash
rm -rf workspace/dataAssets/.temp/probe-cache/phase4-*
```

- [ ] **Step 8: 全量单测**

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

预期：`>= 740 pass / 0 fail`（spec §7.1 最低基线）。

- [ ] **Step 9: roadmap 更新**

```markdown
| **4** | MD 用例策略矩阵（目标 1.2） | ✅ DONE | [`2026-04-18-md-case-strategy-matrix-design.md`](refactor/specs/2026-04-18-md-case-strategy-matrix-design.md) | 4 维信号探针 + 5 策略派发 + probe 节点（10 workflow）+ knowledge 接入 writer + S5 外转到 hotfix-case-gen；≥ 740 测试绿 |
```

同步更新 `> 最后更新：` 行为 `2026-04-18（phase 4 完成）`。

- [ ] **Commit:**

```
docs(phase4): mark phase 4 done in roadmap
```

---

## 完成标准

- [ ] Task 1–13 全部 checkbox 已勾
- [ ] `bun test ./.claude/scripts/__tests__` ≥ 740 pass / 0 fail
- [ ] smoke S1 / S3 / S4 三条路径端到端走通（含 probe + router + writer-context-builder）
- [ ] smoke S5 手动触发 AskUserQuestion 路径验证
- [ ] plan.md frontmatter 的 `strategy` 字段能在 `discuss read` 后 round-trip 还原
- [ ] state.ts qa-state 旧文件（无 `strategy_resolution` 字段）加载不报错
- [ ] agent 未传 `strategy_id` 时默认 S1 行为（兼容 phase 3 及之前产物）
- [ ] roadmap phase 4 标 ✅ DONE
- [ ] git log 含至少 13 个 phase4 atomic commit
- [ ] 主 agent 在最后一条用户消息生成"phase 5 启动 prompt"（横切基础设施），并提示用户 `/clear` 或新开 CC 实例继续

---

## Task 间依赖图

```
Task 1（paths helpers）
    ↓
Task 2（schema + templates）─────┐
    ↓                            │
Task 3（lib/signal-probe）       │
    ↓                            │
Task 4（signal-probe 单测）      │
    ↓                            │
Task 5（signal-probe CLI）───────┤
    ↓                            │
Task 6（lib/strategy-router）    │
    ↓                            │
Task 7（router 单测）            │
    ↓                            │
Task 8（router CLI）─────────────┤
    ↓                            │
Task 9（discuss set-strategy + state）
    ↓                            │
Task 10（writer-context + knowledge）
    ↓
Task 11（agent prompt 扩展）←────┘（依赖 Task 2 strategy-templates 存在）
    ↓
Task 12（SKILL.md + probe 节点）
    ↓
Task 13（smoke + roadmap）
```

**并行机会**：Task 6 可与 Task 4 并行（两者都依赖 Task 3 完成）；Task 11 可与 Task 9-10 并行（只改 agent md）。

---

## 风险与回退点

| 风险 | 回退方式 |
|---|---|
| signal-probe 对真实仓库搜索耗时过长 | 增加 `--timeout-ms` + 单维度失败降级为 missing；spec §4.2.3 已约定 |
| strategy-router 命中顺序实际不符合人工预期 | strategy-templates.md 的顺序章节可微调；selectStrategy 修改局部，不动其他模块 |
| plan.md frontmatter `strategy` inline JSON 造成 YAML 解析失败 | 回退为纯字符串 + JSON.parse 消费方；不影响其他字段 |
| writer-context knowledge 注入过大 | Task 10 已做 8KB 截断；不足时直接 `--knowledge-injection none` 绕过 |
| Task 11 agent prompt 追加导致既有 prompt 变长触发 token 限制 | "策略模板"入口 ≤ 200 字；内容全部引用 strategy-templates.md，不内联 |
| Task 12 SKILL.md 改动幅度大，可能与 phase 3.5 hooks 冲突 | 仅追加 probe 节点 + 补 strategy_id 参数；不动 standardize / reverse_sync / 任务可视化段落结构 |
| smoke Task 13 外部依赖（仓库已同步 / 历史归档齐全）不到位 | smoke 不阻塞完成；spec §7.2 约定为"手动"；单测覆盖率达标即可放行 |
