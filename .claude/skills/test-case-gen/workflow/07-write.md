# 节点 7: write — 并行 Writer 生成用例

> 由 workflow/main.md 路由后加载。上游：节点 6 analyze；下游：节点 8 review。

**目标**：按模块并行派发 Writer Sub-Agent，生成结构化用例 JSON。

**⏳ Task**：将 `write` 任务标记为 `in_progress`。然后为每个模块创建子任务（subject: `[write] {{模块名}}`，activeForm: `生成「{{模块名}}」用例`）。

### 7.1 派发 Writer Sub-Agent

为每个模块派发独立 `writer-agent`（model: sonnet），派发前先构建 writer 上下文：

```bash
kata-cli writer-context-builder build \
  --prd {{enhanced_prd}} \
  --test-points {{test_points}} \
  --writer-id {{module}} \
  --rules {{rules_merged}} \
  --strategy-id {{resolution.strategy_id}} \
  --knowledge-injection {{resolution.overrides.writer.knowledge_injection}} \
  --project {{project}}
```

输入包含：

- 增强后 PRD 对应模块内容
- 该模块已确认的测试点清单
- 合并后规则 JSON（来自 `workspace/{{project}}/.temp/rules-merged.json`）
- 历史归档用例参考（来自 analyze 步骤）
- 已确认上下文（来自 `<confirmed_context>`）
- 源码上下文（来自 transform 步骤的源码分析结果，包括按钮名称、表单结构、字段定义、导航路径等 🔵 标注信息。若 transform 阶段完成了 B 级分析，须将关键 UI 结构摘要传给 Writer）

### 7.2 结构化阻断中转（强制检查）

> **⚠️ Writer subagent 在阻断时必须输出 `<blocked_envelope>`；若无阻断则直接输出 Contract A JSON（见 Contract A/B 定义）。若主 agent 无法确认 subagent 已完成 5 维度自检，须要求其补充执行。**

- Writer 直接输出 Contract A JSON → 视为无阻断，正常继续
- Writer 输出 `<blocked_envelope status="needs_confirmation">` → 执行下文的 Writer 阻断中转协议（见 workflow/main.md）
- Writer 输出 `<blocked_envelope status="invalid_input">` → 停止该模块并要求修正输入

**✅ Task**：每个 Writer Sub-Agent 完成时，将对应子任务标记为 `completed`（subject 更新为 `[write] {{模块名}} — {{n}} 条用例`）。所有 Writer 完成后，将 `write` 主任务标记为 `completed`（subject 更新为 `write — {{total}} 条用例，{{module_count}} 个模块`）。

### 7.3 更新状态

每个 Writer 完成后更新状态：

```bash
kata-cli progress task-update --project {{project}} --session "$SESSION_ID" --task write --status done --payload '{{json}}'
```
