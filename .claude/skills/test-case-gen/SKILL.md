---
name: test-case-gen
description: "QA 测试用例生成：PRD → 结构化测试用例（Archive MD + XMind）。触发词：生成测试用例、写用例、为 <需求名称> 生成用例、test case、重新生成 xxx 模块、追加用例、--quick 快速模式。标准化归档 / XMind 反向同步已迁至 case-format skill。"
argument-hint: "[PRD 路径或蓝湖 URL] [--quick]"
---

<!-- 前置加载 -->

### 偏好预加载

工作流启动时一次性加载偏好：

```bash
kata-cli rule-loader load --project {{project}} > workspace/{{project}}/.temp/rules-merged.json
```

后续节点通过此 JSON 传递规则给 sub-agent，不再各自读 `rules/` 目录。

<precedence>
用户当前指令 > 项目级 rules > 全局 rules > 本文件
</precedence>

<artifact_contract>
<xmind_intermediate contract="A">

<title>验证xxx</title>
<priority>P1</priority>
</xmind_intermediate>
<archive_md contract="B">
<display_title>【P1】验证xxx</display_title>
</archive_md>
</artifact_contract>

> 本文件引用的 `references/` 属于本 skill 的内置规则，一并受上述 precedence 约束。
> Contract A 适用于 Writer / Standardize / Reviewer 的中间 JSON 与 XMind 节点；Contract B 仅适用于 Archive MD 与其他展示面。

读取项目配置：执行 `kata-cli config`（从 `.env` 读取模块、仓库、路径配置）。
全程遵守 `.claude/rules/test-case-writing.md` 用例编写规范。

<role>
你是 kata 的编排型技能，负责在项目偏好优先级与 Task 2 A/B 产物契约保持不变的前提下，协调 PRD → 测试点 → 用例 → XMind/Archive MD 的交付。
</role>

<inputs>
- PRD 路径、蓝湖 URL、模块重跑指令
- 项目级与全局 `rules/`
- `config.ts`、`state.ts`、`workspace/{{project}}/`、只读源码仓库
</inputs>

<workflow>
  <primary>init → probe → discuss → analyze → write → review → format-check → output</primary>
</workflow>

### 确认策略

参见 `.claude/references/confirmation-policy.json`。核心原则：只在影响产物结构的决策点确认，数据填充类决策自动处理。

<output_contract>
<contract_preservation>保留 Task 2 已批准的 A/B 产物契约与文案，不改写 Writer 中间 JSON、Archive MD、XMind 的职责边界。</contract_preservation>
<discuss_handoff>discuss 节点产出 enhanced.md（见 `references/enhanced-doc-template.md`）；transform/enhance 节点已合入，不再有 `<clarify_envelope>` 协议。</discuss_handoff>
<writer_handoff>writer 通过 `<blocked_envelope>` / `<confirmed_context>` 交接；阻断时回射到 `discuss add-pending`（enhanced.md §4），半冻结状态机自动处理 reentry_from。</writer_handoff>
</output_contract>

<error_handling>
<defaultable_unknown>能安全默认的缺口记录为默认项并继续。</defaultable_unknown>
<blocking_unknown>影响 PRD、测试点或用例正确性的未知项转交澄清/阻断协议。</blocking_unknown>
<invalid_input>输入损坏、缺失或路径不合法时立即停止当前分支并提示修正。</invalid_input>
</error_handling>

---

## 项目选择

1. 扫描 `workspace/` 下的项目目录
2. 若只有 1 个项目，自动选中
3. 若有多个项目，提示用户选择
4. 将选中项目记为 `{{project}}`

---

### 运行模式

| 模式   | 触发      | 差异                           |
| ------ | --------- | ------------------------------ |
| normal | 默认      | 完整 8 节点 + 复审             |
| quick  | `--quick` | 跳过复审，format-check 仅 1 轮 |

---

## 任务可视化（Task 工具）

> 全流程使用 `TaskCreate` / `TaskUpdate` 工具展示实时进度，让用户在终端看到全局视图。

### 主流程（8 节点）

workflow 启动时（节点 1 开始前），使用 `TaskCreate` 一次性创建 8 个任务（含 discuss 与 format-check），按顺序设置 `addBlockedBy` 依赖：

| 任务 subject                          | activeForm                        |
| ------------------------------------- | --------------------------------- |
| `init — 输入解析与环境准备`           | `解析输入与检测断点`              |
| `probe — 4 维信号探针与策略派发`      | `采集 4 维信号并路由策略`         |
| `discuss — 主持需求讨论 + 素材扫描`  | `主持讨论与 enhanced.md 落地`     |
| `analyze — 测试点规划`                | `生成测试点清单`                  |
| `write — 并行生成用例`                | `派发 Writer 生成用例`            |
| `review — 质量审查`                   | `执行质量审查与修正`              |
| `format-check — 格式合规检查`         | `检查格式合规性`                  |
| `output — 产物生成`                   | `生成 XMind + Archive MD`         |

**状态推进规则**：

- 进入节点时 → `TaskUpdate status: in_progress`
- 节点完成时 → `TaskUpdate status: completed`，在 `subject` 末尾追加关键指标（如 `init — 已识别 PRD，普通模式`）
- 节点失败时 → 保持 `in_progress`，不标记 `completed`

### write 节点子任务

进入 write 节点后，为每个模块额外创建子任务：

- subject: `[write] {{模块名}}`
- activeForm: `生成「{{模块名}}」用例`
- 设置 `addBlockedBy` 指向 write 主任务

Writer Sub-Agent 完成时更新：`[write] {{模块名}} — {{n}} 条用例`

### format-check 循环子任务

进入 format-check 节点后，为第 1 轮创建子任务：

- subject: `[format-check] 第 1 轮`
- activeForm: `执行第 1 轮格式检查`

每轮完成时更新 subject 为 `[format-check] 第 {{n}} 轮 — {{偏差数}} 处偏差`，若需下一轮则创建新子任务。

---

## 流程路由（根据输入类型加载对应 workflow）

本 skill 仅负责主生成场景（PRD → 测试用例）。标准化归档和反向同步已迁至 `case-format` skill。

| 场景                | 触发词                                                                                           | 输入                               | 流程结构                                                                                                 | 读取文件           |
| ------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------ |
| `primary`（主生成） | 生成测试用例、生成用例、写用例、为 \<需求名称\> 生成用例、test case、重新生成 xxx 模块、追加用例 | PRD 路径 / 蓝湖 URL / 模块重跑指令 | 8 节点：init → probe → discuss → analyze → write → review → format-check → output | `workflow/main.md` |

`--quick` 参数对 `primary` 场景生效：跳过复审、format-check 仅 1 轮。

**加载方式**：使用 `Read` 工具读取 `.claude/skills/test-case-gen/workflow/main.md` 全文，然后按节点映射表动态 Read 各节点文件继续执行。Writer 阻断中转协议、断点续传说明、异常处理定义在 `workflow/main.md` 共享协议章节中。

---

## Writer 阻断中转协议（Phase D2：回射到 discuss add-pending）

**核心变更**：不再现场 AskUserQuestion 处理。Writer `<blocked_envelope>` 内每个 item 通过 `kata-cli discuss add-pending` 沉淀为 enhanced.md §4，半冻结状态机自动回退 status 到 discussing + 记 reentry_from=writing；用户在 discuss 3.7 resolve 后 complete 时 CLI 按 reentry_from 恢复 status=writing，writer 以 `<confirmed_context>` 带 `source_ref: enhanced#q{n}` 重派。

详细流程见 `workflow/main.md` 的"Writer 阻断中转协议"章节。`invalid_input` 分支仍直接停止模块并要求修正输入。

---

## 断点续传说明

- **状态文件位置**：`.kata/{project}/sessions/test-case-gen/{prd-slug}-{env}.json`
- **自动检测**：节点 1 的 `progress session-resume` 命令自动发现并恢复
- **节点更新**：每个节点完成时通过 `progress task-update` 写入进度
- **最终清理**：output 节点成功后执行 `progress session-delete` 删除状态文件
- **状态结构**：参见 `.claude/references/output-schemas.json` 中的 `qa_state_file`。

---

## 异常处理

任意节点执行失败时：

1. 更新状态文件记录失败节点
2. 发送 `workflow-failed` 通知：

```bash
kata-cli plugin-loader notify --event workflow-failed --data '{"step":"{{node}}","reason":"{{error_msg}}"}'
```

3. 向用户报告错误，提供重试选项
