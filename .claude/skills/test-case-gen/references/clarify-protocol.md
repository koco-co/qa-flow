# 结构化澄清中转协议

> transform subagent 与主 agent 之间的需求澄清交互协议。

<clarify_protocol>
  <trigger>当蓝湖、源码、归档三方仍无法可靠确定某条信息时触发。</trigger>
  <severity_model>
    <level name="defaultable_unknown">信息不完整，但存在高置信度推荐项，可继续产出并记录默认策略。</level>
    <level name="blocking_unknown">缺失信息会影响 PRD 正确性，必须回到主 agent 请求确认。</level>
    <level name="invalid_input">输入缺失、损坏或自相矛盾，需先修正输入再继续。</level>
  </severity_model>
</clarify_protocol>

## subagent → 主 agent

subagent 必须输出 `<clarify_envelope>`，载荷为 JSON；禁止再输出旧式 Markdown 澄清标题块。

### 空载荷示例

```xml
<clarify_envelope>
{
  "status": "ready",
  "round": 1,
  "items": [],
  "summary": "已完成 6 维度自检，无需补充确认。"
}
</clarify_envelope>
```

### 待确认示例

```xml
<clarify_envelope>
{
  "status": "needs_confirmation",
  "round": 1,
  "items": [
    {
      "id": "Q1",
      "severity": "blocking_unknown",
      "question": "「审批状态」字段的可选值是否包含“已驳回”？",
      "context": {
        "lanhu": "蓝湖仅出现“待审批/已通过”文案",
        "source": "后端枚举类未同步到当前分支",
        "archive": "历史用例出现“已驳回”但版本不同"
      },
      "location": "审批列表页 → 字段定义 → 审批状态",
      "recommended_option": "B",
      "options": [
        { "id": "A", "description": "仅保留待审批/已通过" },
        { "id": "B", "description": "包含待审批/审批中/已通过/已驳回", "reason": "历史归档与 UI 截图均出现驳回入口" },
        { "id": "C", "description": "由用户自行补充" }
      ]
    },
    {
      "id": "Q2",
      "severity": "defaultable_unknown",
      "question": "列表默认排序字段是否为创建时间倒序？",
      "context": {
        "lanhu": "未标明排序字段",
        "source": "列表接口默认 orderBy=create_time desc",
        "archive": "同模块历史用例使用创建时间倒序"
      },
      "location": "列表页 → 交互逻辑 → 默认排序",
      "recommended_option": "A",
      "default_policy": "采用推荐项并在 PRD 中标记为 🟡 推断"
    }
  ],
  "summary": "存在 1 个 blocking_unknown、1 个 defaultable_unknown。"
}
</clarify_envelope>
```

### 输入无效示例

```xml
<clarify_envelope>
{
  "status": "invalid_input",
  "round": 1,
  "items": [
    {
      "id": "Q0",
      "severity": "invalid_input",
      "question": "PRD frontmatter 缺少 requirement_id，无法建立追踪关系。",
      "location": "frontmatter",
      "recommended_option": "C",
      "options": [
        { "id": "A", "description": "从文件名推断 requirement_id" },
        { "id": "B", "description": "从页面标题推断 requirement_id" },
        { "id": "C", "description": "要求补充有效输入后重试" }
      ]
    }
  ],
  "summary": "输入不完整，需修正后再执行 transform。"
}
</clarify_envelope>
```

## 主 agent 处理流程

1. 解析 `<clarify_envelope>`。
2. `status = "ready"` 且 `items = []` → 直接继续。
3. `severity = "defaultable_unknown"` → 默认采用推荐项并记录为 `auto_defaulted`；若用户主动要求复核，再转为问答。
4. `severity = "blocking_unknown"` → 使用 AskUserQuestion 逐条确认，保留推荐答案与备选答案。
5. `severity = "invalid_input"` → 停止 transform，要求修正输入；不得伪造答案继续。
6. 将用户答案与自动默认项合并为 `<confirmed_context>` 回传 subagent。

## 主 agent → subagent

主 agent 回传 `<confirmed_context>`，载荷为 JSON；禁止再发送旧式 Markdown 确认标题块。

```xml
<confirmed_context>
{
  "round": 1,
  "items": [
    {
      "id": "Q1",
      "resolution": "user_selected",
      "selected_option": "B",
      "value": "包含待审批/审批中/已通过/已驳回"
    },
    {
      "id": "Q2",
      "resolution": "auto_defaulted",
      "selected_option": "A",
      "value": "创建时间倒序"
    }
  ]
}
</confirmed_context>
```

## subagent 处理 confirmed_context

1. 解析每个 `id` 的确认结果。
2. 将确认结果合入 PRD 对应位置：`defaultable_unknown` 转为 🟡 推断说明，`blocking_unknown` 转为已确认内容。
3. 更新“不确定项追踪”表与“变更记录”。
4. 若仍产生新的 `blocking_unknown`，重新输出新的 `<clarify_envelope>`。
5. 若仅剩 `defaultable_unknown`，按推荐策略落地并完成输出。

## 循环终止

- 最多 3 轮澄清循环。
- `defaultable_unknown` 在第 3 轮后仍无人覆盖时，可记录为 `auto_defaulted_after_review`。
- `blocking_unknown` 在第 3 轮后仍无答案时，保持 `needs_confirmation` 状态返回主 agent，不得伪造结论。
- `invalid_input` 任一轮出现时，立即终止并要求修正输入。

## 与 writer 阻断协议的区别

| 维度 | clarify_envelope | blocked_envelope |
| --- | --- | --- |
| 使用节点 | transform | write |
| 触发时机 | PRD 结构化阶段 | 用例编写阶段 |
| 问题粒度 | 需求级（字段定义、业务规则） | 用例级（导航路径、枚举值、权限前置） |
| 默认项处理 | 支持 `defaultable_unknown` 自动落地 | 仅可对不影响用例正确性的默认项自动落地 |
| 阻断条件 | `blocking_unknown` / `invalid_input` | `blocking_unknown` / `invalid_input` |
