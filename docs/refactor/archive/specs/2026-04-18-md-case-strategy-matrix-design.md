# MD 用例策略矩阵设计文档

**Phase**: 4 · MD 用例策略矩阵（roadmap §阶段 4 / 目标 1.2）
**Date**: 2026-04-18
**Status**: Draft — awaiting user review
**Parent Roadmap**: [`../../refactor-roadmap.md`](../../refactor-roadmap.md)
**Upstream**:
- [`2026-04-17-knowledge-architecture-design.md`](./2026-04-17-knowledge-architecture-design.md)（三层边界、knowledge/ 骨架）
- [`2026-04-17-knowledge-keeper-design.md`](./2026-04-17-knowledge-keeper-design.md)（knowledge-keeper 读写 contract）
- [`2026-04-18-prd-discussion-design.md`](./2026-04-18-prd-discussion-design.md)（discuss 节点 + plan.md）
- [`2026-04-18-skill-reorganization-design.md`](./2026-04-18-skill-reorganization-design.md)（hotfix-case-gen 拆分）

---

## 1. Context

phase 0–3.5 解决了"信息在哪"（三层信息架构）、"需求怎么讨论"（discuss 节点）、"自动化怎么跑"（ui-autotest 进化）、"skill 怎么排"（3.5 重排）。但 **MD 用例生成逻辑本身仍然是单一策略** —— 无论输入信号强弱如何，`transform → enhance → analyze → write → review → format-check` 走同一套 prompt，只有 `--quick` 一个维度的粗粒度开关。

### 1.1 现状盘点

`test-case-gen` skill 内部并列三个工作流（`<workflow>`）：

1. **primary**：PRD → 9 节点主流程
2. **standardize**：XMind/CSV → S1-S4 标准化归档
3. **reverse_sync**：XMind → RS1-RS5 反向同步

路由判据硬编码在 SKILL.md 文本里："文件扩展名为 `.xmind` / `.csv` → standardize"、"关键词含 `同步 xmind` → reverse_sync"、"其他 → primary"。**主流程内部不感知信号强弱**：PRD 字段表填 10% 还是 90%、源码 A 级命中 0 条还是 30 条、历史归档相关 0 条还是 20 条、knowledge 非空与否，writer 拿到的上下文模板都是同一份。

信息源标注用"三色枚举"（`prd-template.md` / `transform-agent` / `writer-agent` 统一）：

- 🟢 蓝湖原文
- 🔵 源码推断
- 🟡 历史参考

（🔴 仅作为阻断标记，不是独立场景）

三色**只用于标源**，不参与路由决策。

### 1.2 暴露的痛点

1. **Hotfix 类需求被硬塞进 PRD 主流程**：用户从源码/Bug 出发生成用例时，没有 PRD 或 PRD 极薄；主流程依然会走 transform 的"蓝湖解析 + 字段定义表填充"逻辑，产出大量空表，浪费 token 且结果不可用。正确出口（`hotfix-case-gen`）只在 Bug 链接输入时才被触发
2. **历史回归类需求没有差异化写作**：同模块已有 10+ 条历史用例时，应优先以回归覆盖为主、新增为辅；当前 analyze-agent 的 7 维度头脑风暴与无历史时一致，容易产出大量重复/低价值新用例
3. **保守兜底场景缺乏护栏**：PRD 薄 + 源码缺 + 历史缺时，writer 仍会按常规 prompt 硬推，产出大量 🟡 默认项，格式检查与评审反复返工；应改为低置信度 + 强制停下来确认
4. **知识库写了没人读**：`knowledge-keeper` skill（phase 1）已就绪且 `workspace/{project}/knowledge/` 骨架已落盘，但 transform / analyze / writer 三个 agent **从未调用** `read-core` / `read-module`，术语统一、踩坑提示无法落到产物；`knowledge-keeper/SKILL.md` 第 177 行自述"其他 skill 的集成不做强制修改"
5. **三色枚举固化在文档里**：新增"知识库"第 4 源时，每个 agent 的 prompt、模板、自检表都要改字符串，缺乏单点控制

### 1.3 目标态直觉

把**三色标源枚举**升级为**四维信号矩阵**，并把矩阵结果作为**策略派发入参**注入下游 agent：

- 维度：源码 / PRD / 历史 / 知识库
- 档位：强 / 弱 / 缺
- 策略：5 套模板 S1–S5（完整型 / 源码为主 / 历史回归 / 保守兜底 / 路由外转）
- 注入：每个 agent 接收 `strategy_id` + `signal_profile`，按策略调整 prompt 侧重 / 注入深度 / 阻断阈值

phase 4 同时解决 **A 入口路由** 与 **B 写作策略** 两层问题。

---

## 2. Goals

1. 新增 `.claude/scripts/signal-probe.ts`：收集 4 维信号（源码 / PRD / 历史 / 知识库），输出标准 `signal_profile` JSON（每维 `{ level: "strong"|"weak"|"missing", evidence: {...} }`）
2. 新增 `.claude/scripts/strategy-router.ts`：按 `signal_profile` 派发到 5 套策略模板之一（S1–S5），输出 `strategy_id` + `overrides`
3. 新增 `.claude/references/strategy-templates.md`：5 套策略模板定义（单点维护 transform / analyze / writer / knowledge 注入四象的参数差异）
4. 新增 `.claude/references/strategy-schema.json`：`signal_profile` + `strategy_resolution` 结构，供单测/agent 校验
5. 改造 `test-case-gen/SKILL.md`：在 `init` 节点后、`discuss` 节点前新增 `probe` 节点（workflow 9 → 10 节点）；`discuss` / `transform` / `analyze` / `write` 节点接受 `strategy_id` 参数
6. 改造三个 agent（transform / analyze / writer），在 task prompt 中接收 `strategy_id` 并按模板调整行为；每个 agent 在 prompt 里保留统一入口 section，具体差异全部读 `strategy-templates.md`
7. 扩展 `writer-context-builder.ts`：按 `strategy_id` 调用 `knowledge-keeper read-core` / `read-module`，把 knowledge 片段纳入 writer context
8. **S5 路由外转**：probe 判定 "PRD 缺 + 源码强（Hotfix 征兆）" 时，主 agent 直接 AskUserQuestion 建议切 `hotfix-case-gen`，不串接调用（保持 skill 边界清晰）
9. 扩展 `plan.md` frontmatter：新增 `strategy: { id: "S1", signal_profile: {...} }` 字段，支持 `/clear` 恢复
10. 扩展 `state.ts` 的 qa-state 文件结构：新增 `strategy_resolution` 字段，断点续传时沿用
11. 测试：`signal-probe.test.ts` / `strategy-router.test.ts` / 现有 9 个 agent 单测保持绿；端到端 smoke 至少覆盖 S1 / S2 / S3 三个主路径
12. 不破坏既有契约：Archive MD / XMind 产物结构、Contract A/B、`<blocked_envelope>`、`<confirmed_context>` 协议、plan.md §1–§6 结构全部保留

---

## 3. Non-Goals

- **重写 transform / analyze / writer 内部核心逻辑** → 只加 `strategy_id` 开关位与模板读取 section，不动蓝湖解析 / 源码 A/B 级分析 / 7 维度头脑风暴等硬逻辑
- **改造 standardize / reverse_sync 流程** → 这两个分支没有 PRD 输入，策略矩阵不适用；保持现状
- **HIL 介入信号判档** → 探针全自动，用户不插手调档位；只在 S5 外转建议时 AskUser
- **拆 test-case-gen skill** → 所有改动在内部 workflow；discuss / probe 都是节点，不独立成 skill
- **跨维度动态权重** → 4 维度平权；不引入按项目学习出的权重矩阵
- **策略模板的热重载** → `strategy-templates.md` 为静态文件；改模板需要改 md；不做运行时覆盖机制
- **S5 外转的自动串接** → 不自动调 hotfix-case-gen；仅主 agent AskUserQuestion 引导，由用户确认后跳 skill
- **knowledge 写入** → phase 4 只消费 knowledge，不写入；写入仍走 knowledge-keeper 既有契约
- **format-check / review 节点策略化** → 这两个节点评的是产物合规性，与信号强弱无关；保持一套规则
- **PRD-less 场景（Hotfix）内部矩阵** → Hotfix 走独立 skill，phase 4 不复用矩阵到 hotfix-case-gen

---

## 4. Architecture

### 4.1 节点重排

```
旧：init → discuss → transform → enhance → analyze → write → review → format-check → output      (9)
新：init → probe   → discuss  → transform → enhance → analyze → write → review → format-check → output  (10)
```

**probe 节点**（新增）：

- 主 agent 直接调 `signal-probe.ts` + `strategy-router.ts`，得到 `strategy_id` + `signal_profile`
- 结果写入 `state.ts` 的 `strategy_resolution` 字段 + plan.md frontmatter `strategy` 字段
- 若 `strategy_id === "S5"`：AskUserQuestion 建议切 `hotfix-case-gen`，用户选"继续走主流程"时降级为 S4；选"切换 skill"时停止当前 workflow

**init 职责**：解析输入、识别 workflow 分支（primary / standardize / reverse_sync）。只有 primary 会进 probe；standardize / reverse_sync 跳过。

**discuss 职责不变**，但接受 `strategy_id` 作为上下文（影响 6 维度自检侧重、澄清优先级）。

**transform / enhance / analyze / write**：每个 agent 在 task prompt 收到 `strategy_id`，按 `strategy-templates.md` 对应 section 调整 prompt。

### 4.2 信号探针（signal-probe.ts）

#### 4.2.1 4 维度判据

| 维度       | 强 (strong)                                                         | 弱 (weak)                                 | 缺 (missing)                               |
| ---------- | ------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------ |
| **源码**   | `source-analyze` → `a_level.length ≥ 3` 且 `coverage_rate ≥ 0.05`  | 仅 `b_level` 命中 或 `a_level ∈ [1,2]`   | 无仓库配置 / `coverage_rate === 0`         |
| **PRD**    | 字段定义表填充率 ≥ 0.7 且 `confidence ≥ 0.8`                        | 填充率 ∈ [0.3, 0.7)                      | PRD 文件缺失 / `confidence < 0.3`          |
| **历史**   | `archive-gen search --top 5` 中 ≥ 2 条相关度 ≥ 0.7                  | top-5 中 1 条相关度 ≥ 0.5                | 空结果 / 全部相关度 < 0.5                  |
| **知识库** | `read-core` 返回非空 + 匹配模块 `read-module <name>` 返回非空      | 仅 terms/overview 非空，无匹配模块        | `_index.md` 空骨架（全 placeholder）       |

**字段定义表填充率**：统计 PRD 中所有 `### 字段定义` 表格的 `字段名 / 控件类型 / 必填 / 校验规则` 四列非空占比。脚本逐页聚合后取平均。

**相关度评分**：沿用 `search-filter.ts` 的现有 score（关键词 TF-IDF + suite_name 模糊匹配），不新发明算法。

**knowledge 匹配模块名**：从 PRD frontmatter `modules[]` 取第一个模块名，转 kebab-case 后查 `workspace/{project}/knowledge/modules/{kebab}.md`。

#### 4.2.2 输入/输出

```bash
bun run .claude/scripts/signal-probe.ts probe \
  --project {{project}} \
  --prd workspace/{{project}}/prds/202604/xxx.md \
  --output json
```

输出 JSON（见 `references/strategy-schema.json` → `signal_profile`）：

```json
{
  "source": {
    "level": "strong",
    "evidence": { "a_level_count": 8, "b_level_count": 15, "coverage_rate": 0.12 }
  },
  "prd": {
    "level": "weak",
    "evidence": { "field_fill_rate": 0.42, "confidence": 0.55, "page_count": 3 }
  },
  "history": {
    "level": "strong",
    "evidence": { "top_hits": 3, "best_score": 0.81 }
  },
  "knowledge": {
    "level": "weak",
    "evidence": { "core_nonempty": true, "matched_module": null }
  },
  "probed_at": "2026-04-18T12:00:00Z",
  "project": "dataAssets",
  "prd_path": "workspace/dataAssets/prds/202604/xxx.md"
}
```

#### 4.2.3 容错

- 缺仓库配置 → `source.level = "missing"`，不报错
- PRD 未 transform → `prd.level` 按原始蓝湖素材计算（此时 `field_fill_rate = 0`，退化为 weak/missing）
- archive-gen 搜索失败 → `history.level = "missing"`，stderr 告警
- knowledge-keeper CLI 缺失 → `knowledge.level = "missing"`，不阻断

### 4.3 策略路由（strategy-router.ts）

#### 4.3.1 5 套策略模板

| ID     | 名称       | 触发组合                                    | 核心差异                                                                                   |
| ------ | ---------- | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **S1** | 完整型     | source=strong + prd=strong + history=strong | 现状行为；三方交叉；writer 并发数按 analyze 建议；知识库 read-module 全注入                |
| **S2** | 源码为主   | source=strong + prd=weak/missing            | transform 重源码、轻 PRD 填充；writer 优先从源码推 API/字段；知识库 read-core 注入        |
| **S3** | 历史回归   | prd=strong + history=strong + source=weak  | analyze 7 维度裁剪为 4 维（正/逆/边界/回归）；writer prompt 加回归基线；复用历史模板 ≥50% |
| **S4** | 保守兜底   | 其余（含 all-weak / all-missing）           | 低置信度；🟡 阈值降到 0.5；review 节点 problem_rate 阈值收紧（30% 就阻断）                |
| **S5** | 路由外转   | prd=missing + source=strong                 | 停止主流程，AskUserQuestion 引导切 hotfix-case-gen 或降级 S4                              |

**命中顺序**：S5 → S2 → S3 → S1 → S4（默认兜底）。先判断可否外转，再按高优先级能力型（S2 源码 / S3 历史）路由，完整型 S1 需三维度同时强，否则一律 S4。

#### 4.3.2 输入/输出

```bash
bun run .claude/scripts/strategy-router.ts resolve \
  --profile {{signal_profile_json}} \
  --output json
```

输出（见 `references/strategy-schema.json` → `strategy_resolution`）：

```json
{
  "strategy_id": "S3",
  "strategy_name": "历史回归",
  "signal_profile": { /* 原样回传 */ },
  "overrides": {
    "transform": { "prd_fill_priority": "history_first", "skip_field_table_healthcheck": false },
    "analyze": { "dimensions": ["functional_positive", "functional_negative", "boundary", "regression"], "regression_baseline": true },
    "writer": { "prompt_variant": "regression_focused", "reuse_history_ratio": 0.5, "knowledge_injection": "read-core" },
    "review": { "problem_rate_block": 0.4 },
    "thresholds": { "clarify_default_severity": "defaultable_unknown" }
  },
  "resolved_at": "2026-04-18T12:00:02Z"
}
```

#### 4.3.3 知识库作为加成维度

knowledge 档位**不决定 S1–S5 选择**，但决定 `overrides.writer.knowledge_injection`：

| knowledge 档位 | 注入行为                                                          |
| -------------- | ----------------------------------------------------------------- |
| strong         | `read-module <matched>` + `read-core`（术语 + 匹配模块正文注入） |
| weak           | `read-core`（仅术语表 + overview 注入）                           |
| missing        | 跳过（不污染 writer context）                                     |

### 4.4 Agent 改造

三个 agent 的 prompt 模板统一加一段：

```markdown
## 策略模板

任务提示中包含 `strategy_id`（S1–S5 之一）。按以下规则读取并套用：

1. 读取 `.claude/references/strategy-templates.md`
2. 定位 `## {{strategy_id}} / {{agent_name}}` section（如 `## S3 / analyze`）
3. 按 section 内 `prompt_variant` / `dimensions` / 其他 override 调整本次执行
4. 未提供 `strategy_id` 时，默认走 S1（向后兼容）

**不在本文件内内联模板内容** —— 所有差异单点维护在 `strategy-templates.md`。
```

每个 agent 的现有步骤（transform 6 步 / analyze 4 步 / writer 5 步）保持不变；只在"步骤 0"前插入"读策略"子步骤。

### 4.5 `writer-context-builder.ts` 扩展

当前脚本输出 `{ writer_id, module_prd_section, test_points, rules, fallback }`。phase 4 追加：

```typescript
interface WriterContext {
  writer_id: string;
  module_prd_section: string;
  test_points: unknown[];
  rules: Record<string, unknown>;
  strategy_id: string;        // 新增
  knowledge: {                 // 新增
    core?: { overview: string; terms: string };
    module?: { frontmatter: Record<string, unknown>; content: string };
  };
  fallback: boolean;
}
```

新增 CLI flags：`--strategy-id <id>` / `--knowledge-injection <read-core|read-module|none>`。knowledge 读取沿用 `knowledge-keeper.ts read-core` / `read-module` 契约，不新实现读取逻辑。

### 4.6 plan.md frontmatter 扩展

```yaml
---
prd_slug: xxx
status: ready
resume_anchor: discuss-completed
strategy:
  id: S3
  name: 历史回归
  signal_profile:
    source: { level: weak, evidence: { ... } }
    prd: { level: strong, evidence: { ... } }
    history: { level: strong, evidence: { ... } }
    knowledge: { level: weak, evidence: { ... } }
  probed_at: "2026-04-18T12:00:00Z"
---
```

`discuss.ts` CLI 新增 `set-strategy` 子命令：

```bash
bun run .claude/scripts/discuss.ts set-strategy \
  --project {{project}} --prd {{prd_path}} \
  --strategy-resolution '{{json}}'
```

### 4.7 state.ts 扩展

`qa_state_file` schema 追加：

```json
{
  "prd_slug": "xxx",
  "current_node": "write",
  "strategy_resolution": { /* 同 4.3.2 输出 */ },
  "nodes": { /* 既有 */ }
}
```

断点续传时读取 `strategy_resolution` 注入下游节点，不重跑 probe。

---

## 5. Flow 示例

### 5.1 S1 完整型（现状路径）

```
用户粘 PRD 路径（字段表填充率 85%，源码仓库配置完整，同模块归档 8 条）
  ↓
init：识别 primary workflow
  ↓
probe：signal-probe → source=strong / prd=strong / history=strong / knowledge=weak
  ↓
strategy-router → S1 完整型 + knowledge_injection=read-core
  ↓
discuss：按 S1 模板主持（自检 6 维度不裁剪）
  ↓
transform：正常填充，🔵 标注优先
  ↓
enhance / analyze / write（与现状一致；writer context 新增 core knowledge）
  ↓
output
```

### 5.2 S3 历史回归（新增差异化）

```
用户粘 PRD（填充率 75%），源码仅 B 级命中，同模块归档 12 条高相关
  ↓
probe → source=weak / prd=strong / history=strong / knowledge=strong
  ↓
router → S3 历史回归
  ↓
discuss：按 S3 模板，澄清优先级偏"与历史一致性"维度
  ↓
transform：🟡 标注允许更高比例
  ↓
analyze：7 维度裁剪为 4 维（正/逆/边界/回归），生成回归基线
  ↓
write：writer 接收 read-module 注入 + 回归模板，复用历史 ≥ 50%
  ↓
review：problem_rate 阈值不收紧
```

### 5.3 S5 路由外转

```
用户粘"某 Bug 修复分支已完成，生成用例"，无 PRD 文件
  ↓
init：无 PRD 路径 → 降级为 keyword 模式继续 probe
  ↓
probe → source=strong / prd=missing / history=weak / knowledge=weak
  ↓
router → S5 路由外转
  ↓
主 agent AskUserQuestion：
  "检测到 PRD 缺失但源码变更明显，建议切换到 hotfix-case-gen skill。如何处理？"
  - 选项 1：切换到 hotfix-case-gen（推荐）
  - 选项 2：继续走主流程（降级到 S4 保守模式）
  - 选项 3：取消
  ↓
用户选 1 → workflow 停止，提示 `/hotfix-case-gen <Bug URL>`
用户选 2 → strategy 降级为 S4，继续
```

---

## 6. 实施步骤（拟 plan 时细化）

1. **foundation**（新增脚本 + schema，不改 skill）
   - `.claude/scripts/signal-probe.ts` + 单测
   - `.claude/scripts/strategy-router.ts` + 单测
   - `.claude/references/strategy-schema.json`（JSON Schema）
   - `.claude/references/strategy-templates.md`（静态模板文档）
2. **state/plan 扩展**
   - `state.ts` 扩 `strategy_resolution` 字段 + 单测
   - `discuss.ts` 扩 `set-strategy` 子命令 + 单测
   - plan.md frontmatter schema 更新
3. **SKILL.md 重排**
   - `test-case-gen/SKILL.md` 插入 `probe` 节点（workflow 9 → 10）
   - 任务可视化章节 Task 列表从 9 加到 10 个
   - init 节点 1.6 新增"probe 触发"子步骤
4. **agent 改造**
   - transform / analyze / writer 三个 agent prompt 追加"策略模板"入口 section
   - `writer-context-builder.ts` 扩 `strategy_id` / `knowledge` 字段 + 单测
5. **S5 外转处理**
   - 主 agent 侧实现 AskUserQuestion 逻辑（写在 SKILL.md probe 节点内）
   - hotfix-case-gen 不需要改动（由用户显式切换）
6. **端到端 smoke**
   - 准备 3 个夹具 PRD（对应 S1 / S3 / S4）
   - 跑全流程验证产物路径 + strategy_id 落盘
7. **文档 + roadmap 收尾**
   - roadmap phase 4 标记 DONE
   - 生成下阶段启动 prompt

---

## 7. 测试计划

### 7.1 单测基线

当前 686 绿 → phase 4 完成后 **≥ 710**（保守预估 +24）。

| 测试文件                              | 覆盖点                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `signal-probe.test.ts`（新增）        | 4 维度判据各 3 档边界、缺仓库/缺 PRD 容错、JSON schema 合规、mtime 幂等                      |
| `strategy-router.test.ts`（新增）     | 5 套策略命中顺序（S5 > S2 > S3 > S1 > S4）、override 正确填充、knowledge 加成独立            |
| `state.test.ts`（追加）               | `strategy_resolution` 字段读写、resume 时沿用                                                |
| `discuss.test.ts`（追加）             | `set-strategy` 子命令、plan.md frontmatter 正确落盘                                          |
| `writer-context-builder.test.ts`（追加） | `--strategy-id` / `--knowledge-injection` 参数分支、knowledge 片段注入                    |
| `strategy-templates.test.ts`（新增）  | md 文件结构合规（必须存在 `## S{n} / {agent}` section 全 5×3=15 组）                         |

### 7.2 端到端 smoke（手动）

准备三个夹具 PRD：

- `fixtures/phase4-s1.md`：字段表 90% 填充 + 配置仓库 + 8 条历史
- `fixtures/phase4-s3.md`：字段表 70% + 仅 B 级源码命中 + 12 条历史
- `fixtures/phase4-s4.md`：字段表 20% + 无仓库 + 0 条历史

每个走完整 10 节点，人工确认：
1. plan.md frontmatter `strategy.id` 正确
2. state.ts 的 `strategy_resolution` 非空
3. Archive MD 的 🟡 比例符合策略预期（S4 > S3 > S1）
4. XMind 结构保持 Contract A/B 不变

### 7.3 回归保护

- 所有 agent 单测：`transform-agent` / `analyze-agent` / `writer-agent` / `reviewer-agent` / `format-checker-agent` 保持绿；断言新增 section"策略模板"前向兼容（未传 `strategy_id` 时默认 S1）
- 关键脚本：`archive-gen.ts` / `xmind-gen.ts` / `history-convert.ts` / `format-check-script.ts` 的 fixture-based 测试保持绿

---

## 8. 迁移策略

### 8.1 向后兼容

| 旧行为                                              | 迁移策略                                                          |
| --------------------------------------------------- | ----------------------------------------------------------------- |
| 无 plan.md（legacy）                                | probe 仍运行；strategy 仅写入 state.ts，plan 不落盘                |
| plan.md 无 `strategy` frontmatter                   | probe 运行后追加 `strategy` 字段；老 plan 不破坏                   |
| state.ts 无 `strategy_resolution` 字段              | 读取时容错默认 null；续跑时自动重跑 probe                         |
| agent 任务提示无 `strategy_id`                      | 默认 S1 行为（向后兼容现状）                                      |
| 用户显式 `--quick` 模式                             | 保持；与 strategy 正交（quick 影响审查/检查轮次，strategy 影响写作） |

### 8.2 文档 / menu 同步

- `qa-flow/SKILL.md` 不改（路由逻辑在 test-case-gen 内部）
- `CLAUDE.md` 加一条：策略矩阵入口 + `signal-probe` / `strategy-router` 脚本地位
- `docs/refactor-roadmap.md` phase 4 标 ✅ + 下阶段指引

---

## 9. 风险与开放问题

### 9.1 风险

| 风险                                                                  | 缓解                                                                  |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 4 维度判据阈值拍脑袋，实际项目易误判                                  | 夹具+smoke 覆盖边界；阈值写在 `strategy-templates.md`，便于后续调校   |
| 5 套策略模板维护成本增高                                              | 所有差异单点落在 `strategy-templates.md`；agent 仅读不写              |
| knowledge 注入膨胀 writer context tokens                              | read-module 按匹配命中才注入；写入前做 8KB 截断                       |
| S5 外转打断用户心流                                                   | AskUserQuestion 第 2 选项允许继续走 S4 降级，不强制切 skill          |
| 老 PRD（无 plan.md）跑 probe 时 `field_fill_rate` 偏差                 | 文档标注 legacy 兼容行为；后续可加 `--mode legacy` 粗档位             |
| strategy-router 决策链与 `--quick` 模式耦合                           | 矩阵只决定写作策略；`--quick` 只压审查轮次；互不影响                  |

### 9.2 开放问题（留给用户 review 或 plan 阶段）

1. **历史回归基线复用率 50% 是否合适？** S3 strategy 写死 `reuse_history_ratio: 0.5`，可以改为"analyze-agent 推荐值"
2. **knowledge 模块匹配策略** 目前只按 PRD frontmatter 第一个模块名匹配；是否需要支持多模块（read-module 多个然后合并）？
3. **S5 外转选项是否增加"仅生成 Hotfix 用例但留在当前 skill"** 的选项？当前默认切 skill，用户可能觉得要再粘 Bug ID 一次麻烦
4. **probe 是否需要 cache？** 每次 /clear 后续跑会重跑 probe（通常 1-3s）；是否按 PRD mtime 做缓存键值
5. **strategy-templates.md 的结构化验证** 目前按 `## S{n} / {agent}` 标题正则查找；后续是否升级为 YAML front-matter + markdown body 的结构？

---

## 10. 下阶段启动 prompt（占位）

phase 4 完成后，主 agent 生成类似 phase 3.5 结束时的启动 prompt，指向 phase 5「横切基础设施」：

```
# Phase 5 启动 prompt（横切基础设施）

## 已完成前序
... phase 0/1/2/3/3.5/4 的一行摘要 ...

## Phase 5 Scope（roadmap §阶段 5）
断点续传强化、CLI 统一封装调研、.env 重组、Anthropic 最佳实践对齐

## 首步
1. 读 docs/refactor-roadmap.md §阶段 5
2. 调研 state.ts 当前断点续传机制的痛点
3. 调研 commander.ts 的统一封装方案
4. 撰写 Phase 5 spec，停下来让用户 review
```

（完整版在 phase 4 完工时生成。）
