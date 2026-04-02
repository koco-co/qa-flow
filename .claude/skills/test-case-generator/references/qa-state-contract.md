# .qa-state.json 断点续传状态文件

> 本文件从 `intermediate-format.md` 拆出，是 `.qa-state.json` 的唯一权威定义。
> JSON 输出格式请参考 [`intermediate-format.md`](./intermediate-format.md)。

每步完成后写入工作目录，用于中断恢复。**文件名按本次生成范围区分：**

| 生成范围 | 状态文件名 | 示例 |
|---------|-----------|------|
| **单 PRD**（指定了一个具体 PRD 文件） | `.qa-state-{prd-slug}.json` | `cases/prds/202604/.qa-state-商品列表.json` |
| **批量**（未指定，生成目录下全部 PRD） | `.qa-state.json` | `cases/prds/202604/.qa-state.json` |

示例（同年月目录下多 PRD 并行进行，互不干扰）：
- `cases/prds/202604/.qa-state-商品列表.json`（商品列表，等待验收中）
- `cases/prds/202604/.qa-state-退款审批.json`（退款审批，生成中）

**prd-slug**：取目标 PRD 文件的 basename 去掉 `.md` 后缀。

```json
{
  "working_dir": "cases/prds/202604",
  "project_name": "电商平台",
  "prd_files": ["PRD-01-商品管理.md", "PRD-02-订单处理.md"],
  "last_completed_step": "prd-enhancer",
  "elicitation": {
    "status": "completed",
    "testability_score_before": 62,
    "testability_score_after": 88,
    "questions_asked": 5,
    "questions_answered": 5,
    "auto_inferred_count": 3,
    "dimension_scores": {
      "goal": 100,
      "target_user": 80,
      "usage_scenario": 60,
      "page_inventory": 100,
      "field_definition": 75,
      "io_criteria": 50,
      "business_rules": 60,
      "time_limits": 0,
      "tech_constraints": 0,
      "risks_boundaries": 40
    },
    "target_branch_override": null
  },
  "prd_enhanced_at": "2026-03-25T10:00:00Z",
  "enhanced_files": [
    "PRD-01-商品管理-enhanced.md"
  ],
  "checklist_confirmed": true,
  "formalize_warnings": ["字段信息不足", "源码补充章节为空"],
  "writers": {
    "list": { "status": "completed", "file": "temp/list.json", "case_count": 12 },
    "create": { "status": "completed", "file": "temp/create.json", "case_count": 15 },
    "detail": { "status": "pending", "file": null, "case_count": 0 }
  },
  "source_context_file": "cases/prds/202604/temp/source-context.md",
  "reviewer_status": "pending",
  "final_json": null,
  "output_xmind": null,
  "archive_md_path": null,
  "awaiting_verification": false,
  "mode": "normal",
  "created_at": "2026-03-25T10:00:00Z",
  "updated_at": "2026-03-25T10:30:00Z",
  "execution_log": [
    {
      "step": "parse-input",
      "status": "completed",
      "at": "2026-03-25T10:01:00Z",
      "duration_ms": 3200,
      "summary": "解析 Story 目录，发现 2 个 PRD 文件"
    }
  ]
}
```

## 状态字段说明

| 字段 | 说明 |
|------|------|
| `last_completed_step` | 已稳定完成的最后步骤，字符串 step ID（初始值为数字 0 表示未开始）。取值范围见 SKILL.md 步骤顺序定义表 |
| `elicitation` | 需求澄清阶段的状态与结果对象（Step req-elicit 写入，下游步骤只读）。`status` 枚举：`completed` / `skipped`；`target_branch_override` 非空时 source-sync 优先采用该值作为目标分支；`dimension_scores` 记录 10 个可测试性维度得分（0-100）；`testability_score_after` 为加权总评分（权重见 elicitation-dimensions.md） |
| `mode` | `normal` / `quick`（快速模式跳过 brainstorming 和确认） |
| `writers.<name>.status` | `pending` / `in_progress` / `completed` / `failed` / `skipped`（`skipped` 表示用户明确跳过该模块，Reviewer 不合并其内容） |
| `reviewer_status` | `pending` / `completed` / `escalated`（`pending` 覆盖未开始和 Reviewer 执行中；`escalated` 表示 Step 7 被阻断，需人工介入） |
| `output_xmind` | Step 9 生成并写入的 XMind 文件路径；Step 10 只读取该值用于验证提示，必须保持原值不变 |
| `awaiting_verification` | Step 10 设置为 `true`，表示流程停在用户验证阶段；恢复时只重放验证提示，不重跑 Step 10；Step 11 消费该状态后删除状态文件 |
| `archive_md_path` | Step 10 生成的归档 MD 文件路径 |
| `source_context_file` | source-analyze 步骤（Step 4.5）输出的源码上下文文件路径；config.repos 为空或分析失败时为空字符串 `""`；Writer/Reviewer 通过此字段定位预提取的前端/后端信息 |
| `formalize_warnings` | prd-formalize 质量闸口产生的警告列表。非阻断警告记录于此，在后续 prd-enhancer 健康度报告中一并展示 |
| `retry_count` | Writer 自动重试次数（由编排器在 Writer 失败后递增）。达到上限（默认 2 次）后写 `failed` 并停止重试 |
| `execution_log` | 步骤执行记录数组（可选）。每步完成或失败时追加一条记录，包含 step/status/at/duration_ms/summary。仅用于事后排查，不影响续传逻辑 |

## 恢复行为

- 已完成步骤直接跳过，不重新执行
- `completed` / `skipped` 状态的 Writer 不重跑
- `pending` / 中断的 `in_progress` 状态 Writer 在普通续传时重新启动
- `failed` 状态 Writer 视为终态；普通续传不自动重启，需用户/编排器显式选择重试。选择重试时，先将其状态写回 `in_progress` 再启动
- Reviewer 状态为 `escalated` 时，流程停留在 Step 7，先提示用户处理阻断决策
- `awaiting_verification: true` 时：向用户重新展示验证提示（XMind 路径 + 归档 MD 路径），保持 `last_completed_step: "archive"`，等待用户回复「确认通过」或「已修改，请同步」

## 关键状态转移（供实现 / 校验使用）

| 场景 | 前置条件 | 必要状态变化 | 校验要点 |
|------|----------|--------------|----------|
| Step 1：新流程初始化 | 当前 PRD 对应的状态文件不存在，或用户明确选择重置 | 创建状态文件，并写入 `last_completed_step: 0`、`checklist_confirmed: false`、`reviewer_status: "pending"`、`awaiting_verification: false` | 初始状态不得直接从 `"parse-input"` 开始 |
| Step 1：等待验证续传 | 已有状态文件，且 `awaiting_verification: true` | 保持 `last_completed_step: "archive"`、`output_xmind`、`archive_md_path` 原值 | 只能重放验证提示，不得重跑 Step 10 |
| Step 7：Writer 启动 | 模块已拆分并准备启动 Writer | 首次启动时，对应 `writers.<name>.status` 从 `pending` 写为 `in_progress`；如用户/编排器显式选择重试 `failed` Writer，也先写回 `in_progress` | `in_progress` 为启动前/启动时写入的乐观运行态；若启动失败或执行失败，必须回写为 `failed`；中断的 `in_progress` 可在普通续传时按原输入恢复执行 |
| Step 7：Writer 终态 | 单个 Writer 结束 | 成功写 `completed`；失败写 `failed`；用户显式跳过写 `skipped` | Reviewer 仅合并 `completed` 的 Writer 输出 |
| Step 7：Writer 收敛完成 | 所有 Writer 都已进入终态 | 仅当全部为 `completed` / `skipped` 时，才写 `last_completed_step: "writer"` | 只要存在 `pending` / `in_progress` / `failed`，就不能进入 Step 8 |
| Step 8：Reviewer 成功 | Step 7 已完成 | 写 `reviewer_status: "completed"`、`last_completed_step: "reviewer"`，并产出 `final_json` | `final_json` 应为非空路径 |
| Step 8：Reviewer 阻断 | 问题率 > 40% | 写 `reviewer_status: "escalated"`，`last_completed_step` 保持 `"writer"` | 流程暂停在 Step 8，等待用户决策 |
| Step 10：等待用户验证 | Step 9 已成功，归档 MD 已生成 | 保持 Step 9 写入的 `output_xmind` 原值不变，并写 `last_completed_step: "archive"`、`archive_md_path`、`awaiting_verification: true` | `output_xmind` 与 `archive_md_path` 都应可用，且 Step 10 不得重写 `output_xmind` |
| Step 11：终态清理 | 用户回复「确认通过」或「已修改，请同步」 | 完成同步 / 清理后删除 `temp/` 与当前 PRD 的状态文件（`.qa-state-{prd-slug}.json` 或 `.qa-state.json`） | 写入 `last_completed_step: "notify"` 为可选；如有写入，仅允许在删除状态文件前瞬时出现，且不得作为稳定可恢复状态保留 |
