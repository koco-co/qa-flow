# 错误处理模式

> 所有 agent 共享的标准错误分类与恢复策略。Agent 提示词中引用本文件，不再内联错误处理段落。

## 错误分类

| 类型                  | 描述                                                                                 | 恢复策略                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `invalid_input`       | 输入格式不合法（JSON 解析失败、必填字段缺失、类型不匹配、文件不存在）                | 返回 `status: "invalid_input"` 的 JSON envelope，说明错误位置和原因，不继续处理                  |
| `blocking_unknown`    | 无法推断的关键信息（核心业务逻辑不明、导航路径未知、字段枚举值缺失、按钮名称不确定） | 生成 blocked_envelope 或 clarify_envelope，标记待确认项，中止当前条目，交由上游处理              |
| `defaultable_unknown` | 可推断或有合理默认值的信息（非必填字段、可从上下文推导的值、源码/历史归档可佐证）    | 使用默认值并在输出中标记 🟡（默认推断）或 🔴（待确认），记录推断依据，继续处理                   |
| `external_failure`    | 外部依赖失败（文件不存在、网络超时、脚本执行错误、source code 不可读）               | 重试 1 次，失败则输出错误详情并中止当前步骤；若为非关键路径，记录为 `defaultable_unknown` 并跳过 |
| `partial_result`      | 处理过程中部分条目成功、部分失败                                                     | 输出已成功部分 + 失败条目清单，计数统计（success/failed），不丢弃成功结果                        |

## Agent 应用规则

### 原则

1. **分类先行**：遇到错误时先准确分类，再按对应策略处理
2. **不静默吞掉**：所有错误至少在输出 JSON 的 `issues` / `warnings` / `uncertainty` / `context_gaps` 数组中记录
3. **批量不因单条中止**：除非是 `blocking_unknown` 且影响全局，否则不因单条数据错误终止整个批次
4. **提供上下文**：每个错误记录须包含：发生位置、输入值、期望值、建议处理方式

### 按 Agent 职责分工

| Agent                    | 负责阶段   | 处理方式                                                                                                                   |
| ------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| **transform-agent**      | PRD 增强   | `invalid_input` → clarify_envelope；`blocking_unknown` → clarify_envelope 且标记 🔴；`defaultable_unknown` → PRD 中标记 🟡 |
| **analyze-agent**        | 测试分析   | `invalid_input` → 输出警告并失败；`defaultable_unknown` → 继续分析并记录；外部脚本失败 → 跳过该步骤                        |
| **writer-agent**         | 用例编写   | `blocking_unknown` → blocked_envelope；`defaultable_unknown` → 继续并在思路中保留依据                                      |
| **reviewer-agent**       | 用例审查   | `invalid_input` → 返回 envelope；`blocking_unknown` → context_gaps；自动修正时若无法修正 → 标记 `[FXX-MANUAL]`             |
| **format-checker-agent** | 格式检查   | `invalid_input` → JSON envelope 的 `uncertainty` 数组；无用例 → 警告 + pass                                                |
| **standardize-agent**    | 用例标准化 | `invalid_input` → 输出错误信息并失败；无法推断 → 标注 `[待确认：xxx]`                                                      |

## blocked_envelope / clarify_envelope 结构

### writer-agent 的 blocked_envelope 格式

```json
{
  "status": "needs_confirmation|invalid_input",
  "writer_id": "module-a",
  "items": [
    {
      "id": "B1",
      "severity": "blocking_unknown|invalid_input",
      "type": "field_enum|navigation_path|data_source_type|button_name|missing_writer_input",
      "location": "页面名 → 功能点 → 字段名",
      "question": "具体问题描述",
      "recommended_option": "A",
      "options": [
        { "id": "A", "description": "推荐选项" },
        { "id": "B", "description": "备选选项" }
      ],
      "context": "背景信息"
    }
  ],
  "summary": "问题摘要"
}
```

### transform-agent 的 clarify_envelope 格式

```xml
<clarify_envelope>
{
  "status": "needs_confirmation|ready|invalid_input",
  "round": 1,
  "items": [
    {
      "id": "Q1",
      "severity": "blocking_unknown|defaultable_unknown|invalid_input",
      "question": "具体问题",
      "context": {
        "lanhu": "蓝湖原文描述",
        "source": "源码中找到的相关内容",
        "archive": "归档历史用例参考"
      },
      "location": "页面名 → 章节 → 字段/规则",
      "recommended_option": "A",
      "options": [
        { "id": "A", "description": "选项", "reason": "推荐理由" }
      ]
    }
  ],
  "summary": "汇总说明"
}
</clarify_envelope>
```

### format-checker-agent / reviewer-agent 的错误记录格式

```json
{
  "severity": "invalid_input|blocking_unknown|defaultable_unknown",
  "field": "archive_path|json_structure|user_input",
  "description": "具体错误描述",
  "suggestion": "建议处理方式（可选）"
}
```

## 常见场景处理

### 场景 1：文件不存在或不可读

**分类**：`invalid_input`

**处理**：

- 输出错误 envelope，说明文件路径和原因
- 不继续处理
- 若是可选文件（如历史用例参考），改为 `defaultable_unknown`，跳过该步骤

**示例**（transform-agent）：

```json
{
  "status": "invalid_input",
  "items": [
    {
      "severity": "invalid_input",
      "field": "prd_path",
      "description": "增强 PRD 文件不存在：workspace/xxx/prds/202604/xxx.md"
    }
  ]
}
```

### 场景 2：JSON 格式错误

**分类**：`invalid_input`

**处理**：

- 输出 envelope 说明错误位置（行号、字段名）
- 不继续处理

**示例**（reviewer-agent）：

```json
{
  "status": "invalid_input",
  "items": [
    {
      "severity": "invalid_input",
      "field": "writer_json",
      "description": "JSON 结构不匹配：缺少 modules 字段"
    }
  ]
}
```

### 场景 3：关键信息缺失（导航路径、字段枚举、权限角色）

**分类**：`blocking_unknown`

**处理**：

- 输出 blocked_envelope 或 clarify_envelope
- 列出具体缺失项
- 提供推荐答案（若有源码/历史参考）
- 等待上游确认

**示例**（writer-agent）：

```json
{
  "status": "needs_confirmation",
  "items": [
    {
      "id": "B1",
      "severity": "blocking_unknown",
      "type": "field_enum",
      "location": "列表页 → 状态筛选",
      "question": "「审批状态」字段的可选值有哪些？",
      "recommended_option": "A",
      "options": [
        {
          "id": "A",
          "description": "待审批/审批中/已通过/已驳回",
          "reason": "历史归档出现驳回"
        }
      ]
    }
  ]
}
```

### 场景 4：可推断但不完全确定的信息

**分类**：`defaultable_unknown`

**处理**：

- 在输出中标记 🟡（源码推测）或 🔴（仅历史参考）
- 记录推断的依据和置信度
- 继续处理，不阻断

**示例**（transform-agent）：

```
🟡 [推测：基于同模块 UserListPage 组件推断] 导航路径为「用户管理 → 用户列表」

🟡 归档#15694 列表页搜索功能默认支持模糊匹配
```

### 场景 5：外部脚本执行失败

**分类**：`external_failure`

**处理**：

- 重试 1 次
- 失败则：
  - 若为关键路径（如 PRD 是必需），输出 `invalid_input` envelope
  - 若为辅助路径（如历史用例检索），跳过该步骤并在摘要注明
  - 记录错误日志（stderr、exit code）

**示例**（analyze-agent）：

```
若 `archive-gen.ts search` 失败：
  → 记录：`defaultable_unknown`
  → 行为：跳过历史检索步骤，在摘要中注明「历史用例检索失败，已跳过」
  → 继续进行头脑风暴分析
```

### 场景 6：批量处理中部分条目失败

**分类**：`partial_result`

**处理**：

- 输出已成功部分的 JSON 结构
- 在 `summary` 或 `issues` 中列出失败条目清单
- 统计：`success_count` / `failed_count` / `total_count`
- 不丢弃成功结果

**示例**（format-checker-agent）：

```json
{
  "total_cases": 42,
  "issues_count": 3,
  "issues": [
    { "case_title": "【P1】验证xxx", "rule": "FC02", "problem": "..." },
    { "case_title": "【P1】验证yyy", "rule": "FC04", "problem": "..." },
    { "case_title": "【P1】验证zzz", "rule": "FC06", "problem": "..." }
  ],
  "summary": "共检查 42 条用例，发现 3 处偏差。verdict: fail。"
}
```

## 输出约定

### 所有错误输出必须是 JSON 格式

- **不输出 Markdown 块**（如 `## 错误` 标题）
- **总是返回 JSON envelope**，即使失败
- **exception 时输出结构化错误**，包含 `status`、`message`、`context`

### JSON envelope 通用字段

```json
{
  "status": "pass|fail|blocked|invalid_input|partial_result",
  "verdict": "pass|fail|blocked|invalid_input",
  "round": 1,
  "issues_count": 0,
  "issues": [],
  "uncertainty": [],
  "context_gaps": [],
  "summary": "文字摘要"
}
```

### Markdown 输出仅用于摘要

```
处理完成
  总数:        <N>
  成功:        <N>
  失败:        <N>
  待确认:      <N>
  状态:        <pass/blocked/...>
```

## 注意事项

1. **prioritize 推荐选项**：当 `blocking_unknown` 时，若有源码或历史参考可推荐，务必在 envelope 中标注推荐选项和理由
2. **记录依据**：所有 🟡、🔴、`[FXX-MANUAL]` 标记都须有对应的推理依据，供审查或后续处理
3. **不要放大不确定性**：`defaultable_unknown` 可直接继续，不必等待确认；仅 `blocking_unknown` / `invalid_input` 需要阻断
4. **传播确认结果**：当上游对 blocking_unknown 进行了确认，下游 agent 必须在 `<confirmed_context>` 中采纳，不再质疑

## Agent 引用本文件的方式

在各 agent 的提示词中添加：

```markdown
## 错误处理

遵循 `.claude/references/error-handling-patterns.md` 中的标准分类与恢复策略。

### 自检清单

- [ ] 是否准确分类为 invalid_input / blocking_unknown / defaultable_unknown / external_failure / partial_result？
- [ ] 是否在输出 JSON 中记录了所有错误和不确定项？
- [ ] 是否给出了推荐的处理方向（尤其是 blocking_unknown）？
- [ ] 是否遵循了 envelope 格式？
```

---

**版本**：v1.0  
**创建日期**：2026-04-15  
**维护者**：kata agent team
