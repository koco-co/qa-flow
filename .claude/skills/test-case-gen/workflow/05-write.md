# 节点 5: write — 并行 Writer 生成用例

> 由 workflow/main.md 路由后加载。上游：节点 4 analyze；下游：节点 6 review。

**目标**：按模块并行派发 Writer Sub-Agent，生成结构化用例 JSON。

**⏳ Task**：将 `write` 任务标记为 `in_progress`。然后为每个模块创建子任务（subject: `[write] {{模块名}}`，activeForm: `生成「{{模块名}}」用例`）。

### 5.0 入口门禁 + status 切换

```bash
kata-cli discuss validate \
  --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}} \
  --require-zero-pending
```

退出码处理同 04-analyze 4.0。通过后：

```bash
kata-cli discuss set-status \
  --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}} \
  --status writing
```

进入 `writing` 后半冻结（仅 add-pending 允许）。

### 5.1 派发 Writer Sub-Agent

为每个模块派发独立 `writer-agent`（model: sonnet），派发前先构建 writer 上下文：

```bash
kata-cli writer-context-builder build \
  --prd-slug {{prd_slug}} --yyyymm {{YYYYMM}} \
  --test-points {{test_points_json}} \
  --writer-id {{module}} \
  --rules {{rules_merged}} \
  --strategy-id {{resolution.strategy_id}} \
  --knowledge-injection {{resolution.overrides.writer.knowledge_injection}} \
  --project {{project}}
```

输入包含：

- enhanced.md 对应模块内容（writer-context-builder 内部调 `discuss read`）
- 该模块已确认的测试点清单（**每条必含 `source_ref`**，由 analyze 步骤注入；writer 继承到每条 test_case）
- 合并后规则 JSON（来自 `workspace/{{project}}/.temp/rules-merged.json`）
- 已确认上下文（`<confirmed_context>`）
- 源码上下文（来自 enhanced.md Appendix A + §2 🔵 标注）

> **Phase D2 变化**：
>
> 1. 历史归档用例**不再**作为 writer 直接输入——历史只在 analyze 做覆盖分析
> 2. 每条 test_case 必须继承 test_point.source_ref（主路径 `enhanced#<anchor>`）；reviewer F16 会校验锚点可解析

### 5.2 结构化阻断中转（强制检查）

> **⚠️ Writer subagent 在阻断时必须输出 `<blocked_envelope>`；否则输出 Contract A JSON。主 agent 不得接受半成品。**

- Writer 直接输出 Contract A JSON → 视为无阻断，正常继续
- Writer 输出 `<blocked_envelope status="needs_confirmation">` → 执行 main.md 共享的"Writer 阻断中转协议"（回射到 discuss `add-pending`，半冻结自动切 reentry_from=writing）
- Writer 输出 `<blocked_envelope status="invalid_input">` → 停止该模块并要求修正输入

**✅ Task**：每个 Writer Sub-Agent 完成时，将对应子任务标记为 `completed`（subject 更新为 `[write] {{模块名}} — {{n}} 条用例`）。所有 Writer 完成后，将 `write` 主任务标记为 `completed`（subject 更新为 `write — {{total}} 条用例，{{module_count}} 个模块`）。

### 5.3 更新状态

每个 Writer 完成后：

```bash
kata-cli progress task-update --project {{project}} --session "$SESSION_ID" --task write --status done --payload '{{json}}'
```
