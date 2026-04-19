# PRD 需求讨论阶段设计文档

**Phase**: 2 · PRD 需求讨论阶段（roadmap §阶段 2 / 目标 1.1）
**Date**: 2026-04-18
**Status**: Draft — awaiting user review
**Parent Roadmap**: [`../../refactor-roadmap.md`](../../refactor-roadmap.md)
**Upstream**:
- [`2026-04-17-knowledge-architecture-design.md`](./2026-04-17-knowledge-architecture-design.md)
- [`2026-04-17-knowledge-keeper-design.md`](./2026-04-17-knowledge-keeper-design.md)
- [`2026-04-18-create-project-skill-design.md`](./2026-04-18-create-project-skill-design.md)
- [`2026-04-18-setup-slim-design.md`](./2026-04-18-setup-slim-design.md)

---

## 1. Context

`test-case-gen` 当前 7 节点工作流把"需求讨论"塞在 `transform` 节点内：subagent 完成 PRD 结构化 + 6 维度自检 + 输出 `<clarify_envelope>`，主 agent 才接管 AskUser 循环。这套设计在过去半年暴露三个问题：

1. **主导权倒挂**：transform-agent 是 sonnet 级 subagent，需求讨论本质是与用户的高频互动，应由主 agent（更丰富上下文 + 直接对话能力）主持，而不是 subagent 隔层把问题打包丢回来
2. **澄清成本高**：每轮 clarify 都需要 subagent 重启 → 重读 PRD → 重做 6 维度自检 → 重新输出 envelope，3 轮上限频繁触顶；用户感受到的是"机器在反复扫描而不是在与我讨论"
3. **/clear 不可恢复**：需求讨论结果（用户回答、auto-defaulted 默认项、上下文澄清）只活在 conversation 中，一旦 `/clear` 或新开 CC 实例，前置讨论的成果全部丢失，必须从头再走 transform

衍生痛点：
- transform-agent 同时承担"硬填充"（蓝湖 → PRD 结构）+"软讨论"（澄清未决项）两类职责，单测难写、subagent 体量超 300 行
- 用户反馈"我希望先与你（主 agent）聊清楚需求再让流水线干活"，与现状错位
- knowledge-keeper（phase 1）已就绪，需求讨论中沉淀的术语 / 业务事实可在讨论阶段直接落地为 knowledge，但 transform-agent 不感知 knowledge-keeper

Phase 2 把"需求讨论"独立成一个**主 agent 亲自主持的节点**，前置于 transform：先讨论 → 落地结构化 plan → 再让 transform / analyze / write 等节点按 plan 执行。plan 文件持久化到磁盘，`/clear` 后任何 CC 实例都能从 plan 重启后续节点。

---

## 2. Goals

1. 在 `test-case-gen` 工作流前端新增 `discuss` 节点，由主 agent 亲自主持需求讨论（不派 subagent）
2. 交付**结构化 PRD plan 模板**（YAML frontmatter + Markdown 章节），落盘于 `workspace/{project}/prds/{YYYYMM}/{slug}.plan.md`
3. 实施**可重启契约**：任何 CC 实例 `/clear` 后能根据 plan.md 续跑下游节点（transform / analyze / write / review / format-check / output），无需重做需求讨论
4. 重构 `transform-agent`：剥离"6 维度自检 + clarify_envelope"职责（迁到 discuss 节点的主 agent 主持），保留"硬填充"（蓝湖解析 / 源码 A/B 级分析 / 历史检索 / 模板填充）
5. discuss 节点按 phase 1 `knowledge-keeper` 契约**主动写入沉淀**（用户口述的新术语 / 业务规则在讨论时落地）
6. 提供 `discuss` CLI 工具：plan 文件的初始化、读取、追加澄清结果、状态校验
7. SKILL.md 工作流编号调整：`init → discuss → transform → enhance → analyze → write → review → format-check → output`（8 → 9 节点）
8. 单元 + 集成测试覆盖 plan 文件 schema 校验、resume 检测、clarify 回写
9. 不破坏既有契约：transform 输出的 PRD 文件路径 / Contract A/B / clarify_envelope 简化版仍兼容

---

## 3. Non-Goals

- 重构 `analyze` / `write` / `review` / `format-check` / `output` 节点的内部逻辑 → 各自下游 phase
- 把需求讨论从 `test-case-gen` 抽出成独立 skill → 现阶段保持"discuss 是 test-case-gen 内部节点"的局部改动；独立成 skill 太重，留给 phase 4「MD 用例策略矩阵」时统一评估
- plan 模板的可视化预览 UI / 浏览器渲染 → 超 scope；plan.md 是纯文本，IDE 直接打开
- 多分支 plan（A/B 实验）→ 超 scope；单 plan 单需求
- 替换 transform-agent 的"硬填充"逻辑（蓝湖 fetch / source-analyze / search-filter）→ 不动
- 用户讨论的 voice/audio 输入 → 超 scope
- 跨 PRD 联动 plan（一份 plan 涵盖多需求）→ 超 scope；一份 PRD 一份 plan

---

## 4. Architecture

### 4.1 节点重排

```
┌─────────────────────────── 旧 8 节点 ───────────────────────────┐
│  init → transform → enhance → analyze → write → review →        │
│         format-check → output                                    │
│                                                                  │
│  transform 内含: 蓝湖解析 + 源码分析 + 历史检索 + 模板填充       │
│                  + 6 维度自检 + clarify_envelope ← 与用户讨论    │
└──────────────────────────────────────────────────────────────────┘

                            ▼  Phase 2  ▼

┌─────────────────────────── 新 9 节点 ───────────────────────────┐
│  init → discuss → transform → enhance → analyze → write →        │
│         review → format-check → output                           │
│                                                                  │
│  discuss（主 agent 主持，不派 subagent）:                        │
│    ├─ 读取原始 PRD（蓝湖素材或本地 Markdown）                    │
│    ├─ 6 维度自检（迁自 transform-agent 步骤 5）                  │
│    ├─ AskUserQuestion 逐条澄清                                   │
│    ├─ 自动落地 defaultable_unknown                               │
│    ├─ 调用 knowledge-keeper 沉淀术语 / 业务规则                  │
│    └─ 写出 plan.md（落盘，下游节点全部读 plan）                  │
│                                                                  │
│  transform（subagent，简化）:                                    │
│    ├─ 蓝湖解析 + 源码分析 + 历史检索 + 模板填充                  │
│    └─ 不再做 6 维度自检 / clarify_envelope                       │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 主 agent vs subagent 职责（discuss 节点）

| 职责 | 主 agent | subagent |
|---|---|---|
| 读取 PRD / 蓝湖素材 | ✅ | ❌ |
| 6 维度自检 | ✅ | ❌ |
| AskUserQuestion 与用户讨论 | ✅ | ❌ |
| 调用 `discuss` CLI 写 plan.md | ✅ | ❌ |
| 调用 `knowledge-keeper write` 沉淀术语 | ✅ | ❌ |
| 大规模源码扫描（如需在讨论中查证） | 派 Explore agent | ✅ |
| 历史用例检索 | 直接调 archive-gen.ts | 不必派 |

**核心原则**：discuss 节点不预先派任何 subagent。仅当主 agent 在讨论中需要"深度源码考古"或"大规模归档检索"时，才按需派 Explore subagent，且结果回到主 agent 后由主 agent 与用户对话。

### 4.3 plan.md 在工作流中的角色

```
┌───────────────────────── plan.md（落盘） ─────────────────────────┐
│  frontmatter:                                                     │
│    - prd_path / project / requirement_id / created_at             │
│    - status: discussing | ready | obsolete                        │
│    - resume_anchor: 下游节点恢复时的检查点                         │
│  章节:                                                            │
│    1. 需求摘要（主 agent 摘录）                                   │
│    2. 6 维度自检结果（含每条 severity）                           │
│    3. 澄清记录（每条问题 / 选项 / 用户答案 / 时间）               │
│    4. 自动默认项（auto_defaulted 列表）                           │
│    5. 沉淀的 knowledge（术语 / 业务规则 / 踩坑）                  │
│    6. 下游节点 hint（给 transform/analyze 的关键摘要）            │
└───────────────────────────────────────────────────────────────────┘

         ▲                                          ▲
         │                                          │
   discuss 写                                  transform/analyze/
                                               write 节点恢复时读
```

下游节点不再依赖 conversation 中的 `<confirmed_context>`，全部从 plan.md 读取已确认的上下文。这就是"/clear 重启"的物理基础。

### 4.4 双层职责边界（discuss CLI）

```
┌─────────────────── Claude Code ────────────────────┐
│  主 agent                                            │
│       │                                              │
│       │ /test-case-gen <prd> 或恢复中                 │
│       ▼                                              │
│  ┌──────────────────────────┐                        │
│  │ test-case-gen (Skill)    │                        │
│  │  ─ discuss 节点（本期）   │                        │
│  │  ─ 主持讨论 / AskUser     │                        │
│  └────────────┬─────────────┘                        │
│               │ bun run CLI                          │
│               ▼                                      │
│  ┌──────────────────────────┐                        │
│  │ discuss.ts (CLI)         │                        │
│  │  ─ plan.md 文件 I/O      │                        │
│  │  ─ frontmatter 解析       │                        │
│  │  ─ resume 状态判定         │                        │
│  │  ─ schema 校验             │                        │
│  │  ─ stdout JSON             │                        │
│  └────────────┬─────────────┘                        │
│               ▼                                      │
│    workspace/{project}/prds/{YYYYMM}/                │
│      {slug}.md       (PRD 原文，由 transform 填充)    │
│      {slug}.plan.md  (本 phase 新增)                  │
└──────────────────────────────────────────────────────┘
```

| 职责 | Skill / 主 agent | CLI |
|---|---|---|
| AskUserQuestion | ✅ | 永不 |
| 6 维度自检的语义判断 | ✅（主 agent 自己思考） | ❌ |
| plan.md 写文件 | ❌ | ✅ |
| plan.md 读文件 | 间接（CLI 返回 JSON） | ✅ |
| schema 校验 | ❌ | ✅ |
| resume 锚点判定 | ❌（消费 CLI 结论） | ✅ |
| knowledge-keeper 调用 | ✅（主 agent 直接 spawn 子流程） | ❌ |

### 4.5 CLI 输出契约

对齐 knowledge-keeper.ts / create-project.ts / init-wizard.ts：

- **stdout**：JSON
- **stderr**：`[discuss] <message>\n`
- **exit code**：`0` 成功 / `1` 错误 / `2` schema warning（plan 存在但字段不全）

---

## 5. plan.md 文件契约

### 5.1 路径

```
workspace/{project}/prds/{YYYYMM}/{slug}.plan.md
```

与 PRD 同目录、同 slug、加 `.plan.md` 后缀。`{YYYYMM}` 与 PRD 写入月份一致。

### 5.2 完整模板

```markdown
---
plan_version: 1
prd_slug: 15695-quality-check
prd_path: workspace/dataAssets/prds/202604/15695-quality-check.md
project: dataAssets
requirement_id: 15695
requirement_name: 质量项目检查
created_at: 2026-04-18T10:30:00+08:00
updated_at: 2026-04-18T11:05:00+08:00
status: ready                    # discussing | ready | obsolete
discussion_rounds: 2
clarify_count: 5                 # blocking_unknown 已解答数
auto_defaulted_count: 3          # defaultable_unknown 已自动落地数
resume_anchor: discuss-completed # 下游节点恢复检查点（见 §5.4）
knowledge_dropped:               # discuss 期间向 knowledge-keeper 写入的条目
  - type: term
    name: 质量项
  - type: pitfall
    name: ui-quality-check-redirect
---

# 需求讨论 Plan：{{requirement_name}}（#{{requirement_id}}）

> 本文件由 `test-case-gen` 的 `discuss` 节点生成。
> 下游节点（transform / analyze / write / ...）从本文件恢复上下文，禁止手工修改 frontmatter 字段（status / resume_anchor 等关键字段）。

## 1. 需求摘要

{{主 agent 在讨论开始时摘录的 1-3 段核心需求；用户可在讨论中追加修订。}}

## 2. 6 维度自检结果

| 维度 | 检查问题 | 命中条数 | 处理方式 |
|---|---|---|---|
| 字段定义 | ... | 2 | 1 已澄清 / 1 自动默认 |
| 交互逻辑 | ... | 1 | 已澄清 |
| 导航路径 | ... | 0 | — |
| 状态流转 | ... | 1 | 已澄清 |
| 权限控制 | ... | 1 | 自动默认 |
| 异常处理 | ... | 3 | 1 已澄清 / 2 自动默认 |

## 3. 澄清记录

### Q1（severity: blocking_unknown，已解答）
- **问题**：审批状态字段是否包含"已驳回"？
- **来源**：lanhu(待审批/已通过) / source(枚举类未同步) / archive(历史出现已驳回但版本不同)
- **位置**：审批列表页 → 字段定义 → 审批状态
- **推荐答案**：B（包含 待审批/审批中/已通过/已驳回）
- **用户答案**：B
- **答时**：2026-04-18T10:42:00+08:00

### Q2（severity: defaultable_unknown，自动默认）
- **问题**：列表默认排序字段是否为创建时间倒序？
- **默认策略**：采用推荐项 A
- **value**：创建时间倒序

...

## 4. 自动默认项汇总

| ID | 字段 | 默认值 | 依据 |
|---|---|---|---|
| Q2 | 列表排序 | 创建时间倒序 | source 接口默认 + 同模块归档 |
| Q5 | 异常 toast 提示 | 标准模式 | 同模块归档 |
| Q7 | 默认权限 | 普通管理员 | 后端默认配置 |

## 5. 沉淀的 knowledge

讨论中沉淀到 `workspace/{{project}}/knowledge/` 的条目：

- **term**：`质量项`（中文：质量项；英文别名：QualityItem）— 已写入 `terms.md`
- **pitfall**：`ui-quality-check-redirect`（质量检查通过后跳转 路径冲突）— 已写入 `pitfalls/ui-quality-check-redirect.md`

## 6. 下游节点 hint

> 给 transform / analyze / write 在恢复时使用的关键摘要，避免它们重复扫描。

- **transform**：本需求字段已通过讨论确认，请按 §3 / §4 写入 PRD 时统一标注 🟢（用户确认）或 🟡（自动默认）；不必再生成 clarify_envelope
- **analyze**：测试点必须覆盖 §3 中的 5 个 blocking_unknown 已澄清场景；§4 自动默认项不必单独出测试点
- **write**：参考 §5 沉淀的 pitfall `ui-quality-check-redirect`，覆盖跳转用例

---

<!-- machine-readable end -->
```

### 5.3 frontmatter 字段语义

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `plan_version` | int | ✅ | 当前 `1`，未来 schema breaking change 升版本 |
| `prd_slug` | string | ✅ | 与 PRD frontmatter 一致 |
| `prd_path` | string | ✅ | PRD 文件相对仓库根的路径 |
| `project` | string | ✅ | 项目名 |
| `requirement_id` | string | ✅ | 需求 ID（含 `-` 等字符按字符串处理） |
| `requirement_name` | string | ✅ | 需求名称 |
| `created_at` / `updated_at` | ISO8601 | ✅ | CLI 自动维护 |
| `status` | enum | ✅ | `discussing`（讨论进行中）/ `ready`（讨论完成可下游）/ `obsolete`（PRD 重写需重讨论） |
| `discussion_rounds` | int | ✅ | 主 agent 累计 AskUser 轮次（用于复盘） |
| `clarify_count` | int | ✅ | 已解答的 blocking_unknown 数 |
| `auto_defaulted_count` | int | ✅ | 自动落地的 defaultable_unknown 数 |
| `resume_anchor` | enum | ✅ | 见 §5.4 |
| `knowledge_dropped` | array | ⚠️ | 可空数组；记录已沉淀的 knowledge 条目（type + name） |

### 5.4 resume_anchor 状态机

下游节点根据 `resume_anchor` 决定从哪儿继续：

| 值 | 语义 | 下游消费者 |
|---|---|---|
| `discuss-in-progress` | discuss 节点未结束（主 agent 半路 /clear） | discuss 节点恢复点；从澄清记录续问 |
| `discuss-completed` | discuss 完成、status=ready | transform 节点入口 |
| `transform-completed` | transform 完成 | enhance 节点入口（由 transform 负责回写 plan） |
| `enhance-completed` | enhance 完成 | analyze 节点入口 |
| ... | ... | ... |

> 本期只实施 `discuss-in-progress` / `discuss-completed` 两个值。`transform-completed` 等下游 anchor 由各节点在自己重构时再补；本期不强求 transform 节点写回 anchor，保持向后兼容（缺失时下游按"未完成"重跑）。

### 5.5 obsolete 触发场景

- 用户显式说"PRD 已经改了，重新讨论一遍"
- 主 agent 检测到 PRD 文件 `mtime > plan updated_at` 且 frontmatter 关键字段变化
- 用户主动跑 `discuss reset`

进入 obsolete 后，下次 discuss 启动时自动备份旧 plan 到 `{slug}.plan.{old-timestamp}.md`，重新生成新 plan。

---

## 6. CLI API（5 个 actions）

CLI 入口：`bun run .claude/scripts/discuss.ts <action> [...]`

所有 action 必带 `--project <name>` 与 `--prd <prd_path>`。成功 stdout 均为 JSON。

### 6.1 `init`

```bash
bun run .claude/scripts/discuss.ts init \
  --project <name> \
  --prd <prd_path> \
  [--force]
```

逻辑：
- 计算目标 plan.md 路径
- 已存在且 `status != obsolete` 且无 `--force` → `exit 1` + stderr 提示走 `resume`
- 已存在且 `--force` → 备份旧 plan 到 `{slug}.plan.{old-timestamp}.md`
- 创建初始 plan.md：frontmatter 全部填好、§1 摘要由主 agent 后续补、§2-§6 留空模板
- `status=discussing`，`resume_anchor=discuss-in-progress`

输出：
```json
{ "plan_path": "...", "status": "discussing", "resume_anchor": "discuss-in-progress" }
```

### 6.2 `read`

```bash
bun run .claude/scripts/discuss.ts read --project <name> --prd <prd_path>
```

返回 plan.md 完整解析结果（frontmatter + 章节结构化对象）：

```json
{
  "frontmatter": { ... },
  "sections": {
    "summary": "...",
    "self_check_table": [ ... ],
    "clarifications": [ { "id": "Q1", "severity": "...", "question": "...", "user_answer": "..." } ],
    "auto_defaulted": [ ... ],
    "knowledge_dropped": [ ... ],
    "downstream_hints": { "transform": "...", "analyze": "...", "write": "..." }
  }
}
```

`exit 1` 当 plan 不存在；`exit 2` 当 plan 存在但 schema 不完整（fields 缺失但仍可返回 partial 结果）。

### 6.3 `append-clarify`

```bash
bun run .claude/scripts/discuss.ts append-clarify \
  --project <name> --prd <prd_path> \
  --content '<json>'
```

`--content` JSON schema：
```typescript
{
  id: "Q1",
  severity: "blocking_unknown" | "defaultable_unknown" | "invalid_input",
  question: string,
  context: { lanhu?: string, source?: string, archive?: string },
  location: string,
  recommended_option: string,
  options: Array<{ id: string, description: string, reason?: string }>,
  user_answer?: { selected_option: string, value: string, answered_at: string },
  default_policy?: string  // 仅 auto_defaulted 时填
}
```

行为：
- 解析 plan.md → 在 §3 追加新 clarification 记录
- 如有 `user_answer` → 更新 `clarify_count`；如为 `auto_defaulted` → 更新 `auto_defaulted_count`
- 更新 `updated_at` / `discussion_rounds`（自增）
- 不修改 `status` / `resume_anchor`（由 `complete` 显式更新）

### 6.4 `complete`

```bash
bun run .claude/scripts/discuss.ts complete \
  --project <name> --prd <prd_path> \
  [--knowledge-summary '<json>']
```

行为：
- 读 plan.md → 校验 §3 全部 blocking_unknown 已 answered
- 设置 `status=ready` / `resume_anchor=discuss-completed`
- 写入 §6 下游 hints（如带 `--knowledge-summary` 则同步写 §5）
- `exit 1` 当存在未解答 blocking_unknown

输出：
```json
{ "status": "ready", "resume_anchor": "discuss-completed", "blocking_remaining": 0 }
```

### 6.5 `reset`

```bash
bun run .claude/scripts/discuss.ts reset --project <name> --prd <prd_path>
```

将当前 plan.md 备份为 `{slug}.plan.{old-timestamp}.md` 并删除原文件。下次 `init` 重新生成。

---

## 7. SKILL.md 改动（test-case-gen）

### 7.1 工作流编号变更

```
旧：init → transform → enhance → analyze → write → review → format-check → output
新：init → discuss → transform → enhance → analyze → write → review → format-check → output
```

### 7.2 新增「节点 1.5: discuss」段落

详细伪流程：

```
1.5.1 检测 plan.md
  - read CLI；不存在 → init；存在且 status=ready → 跳到 transform
  - 存在且 status=discussing → resume 续问（恢复未解答的 Q*）

1.5.2 生成需求摘要（§1）
  - 主 agent 读 PRD 原文 → 摘录 1-3 段
  - 用 AskUserQuestion 让用户确认或修正

1.5.3 6 维度自检（§2）
  - 主 agent 自己思考（不派 subagent）
  - 必要时调 archive-gen / source-analyze 工具支撑判断
  - 结果生成 §2 表格 + §3 clarification 草稿

1.5.4 逐条澄清（§3 + §4）
  - 对每个 blocking_unknown 用 AskUserQuestion 单条问
  - 每条用户答完立即调 append-clarify 落盘
  - defaultable_unknown 自动落地，不发问，但同样 append-clarify 记录

1.5.5 知识沉淀（§5）
  - 用户在讨论中提供新术语 → 主 agent 显式调 knowledge-keeper write type=term
  - 用户在讨论中提到的踩坑 → 主 agent 显式调 knowledge-keeper write type=pitfall
  - 全部沉淀完成后回写 plan.md frontmatter 的 knowledge_dropped

1.5.6 收尾
  - 主 agent 总结 §6 下游 hints 写入
  - 调 complete CLI → status=ready
```

### 7.3 transform 节点简化

- 删除 `transform-agent` 步骤 5「生成 clarify_envelope」整段
- 删除步骤 5.1「6 维度自检」
- transform-agent input 加一段："读取 plan.md（路径由 task prompt 给出），按 §6 hints 行事；按 §3 已澄清的内容直接落 🟢；按 §4 自动默认项落 🟡；不再产生新的 blocking_unknown"
- transform-agent output 移除 `<clarify_envelope>` 段；保留 PRD 写回与 status JSON
- 主 agent 在派 transform-agent 时把 plan.md 路径作为 task prompt 一部分传入

### 7.4 init 节点扩展

`init` 节点的 1.1 断点续传检测扩容：除现有 `state.ts resume` 外，新增「plan.md 存在性检查」：

```bash
bun run .claude/scripts/discuss.ts read --project {{project}} --prd {{prd}} 2>/dev/null
```

按返回 status / resume_anchor 决定下游路由：
- 无 plan → 进 discuss 节点
- `discussing` → 进 discuss 节点恢复
- `ready` → 跳 discuss 直进 transform

### 7.5 任务可视化更新

主流程任务列表新增 `discuss — 主 agent 主持需求讨论`，置于 `init` 与 `transform` 之间。

### 7.6 规则文件

新增 `rules/prd-discussion.md`（全局），约束：
- 主 agent 主持讨论时禁派 transform-agent
- AskUserQuestion 单条不得超过 4 个候选项
- 自动默认项必须有依据（source / archive 之一）
- 沉淀 knowledge 时强制走 knowledge-keeper（不直接写文件）

---

## 8. 文件清单

### 8.1 新建

```
.claude/scripts/discuss.ts                                        # CLI 入口
.claude/scripts/lib/discuss.ts                                    # 纯函数（schema / parse / render）
.claude/scripts/__tests__/discuss.test.ts                         # 集成测试
.claude/scripts/__tests__/lib/discuss.test.ts                     # 单元测试
.claude/skills/test-case-gen/references/discuss-protocol.md       # discuss 节点协议（供主 agent 自检）
rules/prd-discussion.md                                           # 全局规则
```

### 8.2 修改

```
.claude/skills/test-case-gen/SKILL.md                  # 新增节点 1.5、调整任务可视化、init 扩容
.claude/agents/transform-agent.md                      # 删除步骤 5、加 plan.md 读入、output_contract 移除 clarify_artifact
.claude/skills/test-case-gen/references/clarify-protocol.md  # 标注 deprecated（保留供其他 phase 引用）
docs/refactor-roadmap.md                               # 标记 phase 2 为 ✅ DONE（实施完成时）
```

### 8.3 不动

```
.claude/scripts/state.ts                               # 0 改动；仍负责节点级 resume，与 plan.md 互补
.claude/scripts/archive-gen.ts                         # 0
.claude/scripts/source-analyze.ts                      # 0
.claude/scripts/knowledge-keeper.ts                    # 0（被消费）
其他 agents（writer / reviewer / format-checker / ...）# 0
```

---

## 9. 测试策略

### 9.1 单元测试（`lib/discuss.test.ts`）

| 测试组 | 核心用例 |
|---|---|
| `parsePlanFrontmatter` | 完整 plan / 缺字段 / 非法 status / 非法 resume_anchor |
| `parsePlanSections` | 完整 6 节 / 缺 §3 / §3 含多条 clarification / 表格行解析 |
| `renderPlanTemplate` | init 时空模板 / 含 1 条 clarification / knowledge_dropped 数组渲染 |
| `appendClarification` | 追加新 Q / 更新已存在 Q 的 user_answer / auto_defaulted 计数自增 |
| `completePlan` | 全部 blocking 已答 → ready / 仍有未答 → 拒绝 |
| `validateSchema` | plan_version 不识别 / status 非法值 / resume_anchor 非法值 |
| `obsoleteDetection` | mtime 比对 / 强制 reset 备份命名 |

### 9.2 集成测试（`discuss.test.ts`，Bun.spawn）

fixture：
```typescript
const fixtureProject = "discuss-fixture";
const fixturePrdDir = join(repoRoot(), "workspace", fixtureProject, "prds", "202604");
const fixturePrd = join(fixturePrdDir, "smoke-need.md");

before(() => {
  mkdirSync(fixturePrdDir, { recursive: true });
  writeFileSync(fixturePrd, "---\nrequirement_id: 99999\nrequirement_name: 烟雾需求\n---\n# 烟雾需求\n");
});

after(() => rmSync(join(repoRoot(), "workspace", fixtureProject), { recursive: true, force: true }));
```

覆盖：
- `init` 创建 plan.md → 二次 init 拒绝（无 --force）
- `init --force` 备份旧 plan + 重建
- `read` 不存在 → exit 1
- `read` schema 不全 → exit 2 + partial JSON
- `append-clarify` 追加 Q1 → `read` 验证 §3 含 Q1
- `complete` 全部已答 → status=ready / resume_anchor=discuss-completed
- `complete` 仍有未答 blocking → exit 1
- `reset` 备份命名规则 + 删除原文件

### 9.3 Smoke 验证（手动）

```bash
# S1：discuss init
bun run .claude/scripts/discuss.ts init --project dataAssets \
  --prd workspace/dataAssets/prds/202604/smoke-discuss.md
# 预期：plan.md 创建、status=discussing

# S2：append-clarify（blocking 已答）
bun run .claude/scripts/discuss.ts append-clarify --project dataAssets \
  --prd workspace/dataAssets/prds/202604/smoke-discuss.md \
  --content '{"id":"Q1","severity":"blocking_unknown","question":"...","location":"...","recommended_option":"A","options":[{"id":"A","description":"x"}],"user_answer":{"selected_option":"A","value":"x","answered_at":"2026-04-18T12:00:00+08:00"}}'

# S3：complete
bun run .claude/scripts/discuss.ts complete --project dataAssets \
  --prd workspace/dataAssets/prds/202604/smoke-discuss.md
# 预期：status=ready

# S4：read 验证 frontmatter
bun run .claude/scripts/discuss.ts read --project dataAssets \
  --prd workspace/dataAssets/prds/202604/smoke-discuss.md \
  | jq '.frontmatter.status, .frontmatter.resume_anchor'

# S5：reset
bun run .claude/scripts/discuss.ts reset --project dataAssets \
  --prd workspace/dataAssets/prds/202604/smoke-discuss.md
ls workspace/dataAssets/prds/202604/ | grep -E "smoke-discuss\.plan(\..*)?\.md"

# S6：清理
rm -f workspace/dataAssets/prds/202604/smoke-discuss.*

# S7：transform-agent 兼容
# 用一个真实 plan.md ready 的需求触发 transform，验证 PRD 正常生成且 stdout 不再含 clarify_envelope
```

---

## 10. Success Criteria

- [ ] 本 spec 入库
- [ ] Plan 入库：`docs/refactor/plans/2026-04-18-prd-discussion-implementation.md`
- [ ] CLI：`.claude/scripts/discuss.ts` + `.claude/scripts/lib/discuss.ts`
- [ ] 单测 + 集成测试新增；`bun test ./.claude/scripts/__tests__` 全绿（604 + 新增 ≥ 30 条）
- [ ] `test-case-gen` SKILL.md 新增节点 1.5、init 扩容、任务可视化更新
- [ ] `transform-agent.md` 步骤 5 删除、output_contract 简化
- [ ] `rules/prd-discussion.md` 入库
- [ ] `clarify-protocol.md` 标注 deprecated
- [ ] Smoke S1–S7 全通过
- [ ] /clear 重启验证：在 dataAssets 跑完 discuss → /clear → 新会话能从 `read --status=ready` 直接派 transform，不再需要主 agent 重做需求讨论
- [ ] knowledge-keeper 联动：discuss 中沉淀 1 条 term + 1 条 pitfall，验证 plan.md `knowledge_dropped` 与 knowledge 文件均落盘
- [ ] 无硬编码：脚本 / 测试无绝对路径 / 凭证
- [ ] 原子 commit：spec / plan / lib / CLI / templates / 单测 / 集成测试 / SKILL.md / agent / rules / smoke 各自独立

---

## 11. Risks

| 风险 | 缓解 |
|---|---|
| 主 agent 主持讨论时上下文消耗大 | discuss 节点强制每条澄清落盘 → 即使中途 /clear 也不丢；不依赖 conversation 完整保留 |
| transform 简化后历史 PRD 重跑出现 schema 漂移 | clarify-protocol.md 仅标注 deprecated 不删；transform-agent 在 plan.md 不存在时回退到旧逻辑（最少改动兼容） |
| plan.md 与 PRD 路径耦合，PRD 重命名后 plan 找不到 | discuss 在 read 时按 prd_slug + 同目录搜索；mtime 比对触发 obsolete 提示 |
| 用户改了 PRD 但忘了重讨论 | discuss read 检测 PRD mtime > plan updated_at → 输出 stderr warning + 输出 status=ready 但 hint 中追加 "PRD 改动需复核" |
| knowledge-keeper 写入失败导致 discuss 卡住 | discuss 节点把 knowledge-keeper 调用降级为"非阻塞"；失败时记录到 plan §5 但不阻断 complete |
| 主 agent 误把 6 维度自检派给 subagent | rules/prd-discussion.md 明文禁止 + SKILL.md 反复强调；plan.md `discussion_rounds` 字段帮 review 复盘是否真主持 |
| plan 文件与 state.ts 状态文件重叠/冲突 | 两者职责不同：state.ts 管节点 in-progress 状态、plan.md 管需求讨论结果；status 字段语义不重叠（state.ts 不感知 plan）；本期不合并 |
| 既有 PRD（无 plan）触发 transform 时回退路径漂移 | transform-agent 检查 plan.md 缺失时按"无 plan = ready 空"行事，等价旧行为；input prompt 中加一行 "如未传 plan.md，按旧 transform 步骤 5 自检" |
| Smoke S7 兼容验证依赖真实 PRD | smoke 中给出最小 PRD 模板（仅 frontmatter + 一个空页面），手动验证；不进 CI |
| 单测向 workspace/discuss-fixture/ 写入残留 | after() 铁律清理；CI 跑完 git status 干净（对齐 CLAUDE.md） |

---

## 12. 🔴 待用户决策（review 时拨方向）

以下三处属于"我倾向于 X，但 Y 也合理"，请用户在 review 时拍板：

### D1：discuss 是 test-case-gen 内部节点 vs 独立 skill？
- **倾向**：内部节点（最小侵入；与 transform / analyze / write 同生命周期）
- **替代**：独立成 `prd-discuss` skill，可独立触发、独立沉淀，但需要在 test-case-gen 里加"先跑 prd-discuss 再跑后续"的编排，复杂度提升
- **影响**：决定 SKILL.md 是新增节点 vs 抽成新 skill

### D2：plan.md 是否要承担"下游节点完成态"的全工作流持久化？
- **倾向**：本期只承担 discuss 完成态（resume_anchor 仅两个值）；下游节点不写 plan，仍走 state.ts
- **替代**：plan.md 一并接管 transform/enhance/analyze/.../output 完成态，state.ts 退役
- **影响**：决定本期 scope。倾向方案保守、解耦；替代方案"大一统"，但触面广，建议留给 phase 5「横切基础设施」

### D3：6 维度自检时主 agent 是否允许派 Explore subagent 协助源码考古？
- **倾向**：允许，但仅限"Explore 只读 / 返回事实摘要"，不允许 Explore 直接与用户对话；最终澄清问题仍由主 agent 自己组织 AskUserQuestion
- **替代**：完全禁派任何 subagent，主 agent 自己 grep
- **影响**：决定 rules/prd-discussion.md 的边界条款写法

---

## 13. Out of Scope（转入后续阶段或 Not Do）

- 抽 discuss 为独立 skill → phase 4 评估
- plan.md 接管全工作流持久化 → phase 5
- plan.md 浏览器/IDE 可视化插件 → 超 scope
- 多分支 plan / A-B plan → 超 scope
- voice 输入 → 超 scope
- 跨需求 plan → 超 scope
- transform-agent 内部硬填充逻辑重构（蓝湖 fetch / source-analyze）→ phase 4 / 6
- README / 中文文档同步 → phase 6
- analyze / write / review / format-check / output 节点的 plan 消费改造 → 各下游 phase 自行接入

---

## 14. 交付后下一步

1. 本 spec 由用户审查通过后，`brainstorming` skill 阶段终结，转入 `writing-plans` 阶段
2. writing-plans 产出 `docs/refactor/plans/2026-04-18-prd-discussion-implementation.md`
3. 实施阶段走 `subagent-driven-development`：spec → plan → lib → CLI → templates / rules → 单测 → 集成测试 → SKILL.md → agent 改 → smoke → 原子 commit
4. 全部 Success Criteria 对号入座 + 原子 commit 后，主 agent 生成"phase 3 启动 prompt"（UI 自动化 / 目标 1.3），并提示用户 `/clear` 或新开 CC 实例继续
