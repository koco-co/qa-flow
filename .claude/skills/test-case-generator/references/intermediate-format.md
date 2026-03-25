# 中间 JSON 格式 Schema

Writer Subagent 输出的 JSON 文件必须严格符合本 Schema。

---

## 完整 Schema

```json
{
  "meta": {
    "project_name": "string  // 项目名称，如「信永中和」「DTStack」",
    "product": "string       // 产品名称，如「数据运营门户」",
    "version": "string       // 版本标识，如「0322版本」「202603版本」",
    "requirement_name": "string  // 需求名称，如「数据质量-质量问题台账」",
    "requirement_id": "string    // 需求ID，如「PRD-26」（可选）",
    "prd_path": "string          // PRD 文件相对路径（可选）",
    "generated_at": "string      // ISO8601 时间戳，如「2026-03-25T10:00:00Z」",
    "agent_id": "string          // Subagent 标识，如「writer-module-list」（可选）"
  },
  "modules": [
    {
      "name": "string  // 模块名称，对应 XMind L2 节点",
      "sub_groups": [  // 可选：子分组（对应 XMind L3 节点）
        {
          "name": "string  // 子分组名称",
          "test_cases": [
            {
              "title": "string       // 必须以「验证」开头",
              "precondition": "string // 前置条件（可为空字符串）",
              "priority": "string    // P0 / P1 / P2",
              "case_type": "string   // 正常用例 / 异常用例 / 边界用例 / 待核实（仅 Reviewer）",
              "steps": [
                {
                  "step": "string     // 操作步骤描述",
                  "expected": "string // 与步骤对应的预期结果"
                }
              ]
            }
          ]
        }
      ],
      "test_cases": []  // 可选：无子分组时直接放用例（sub_groups 和 test_cases 二选一）
    }
  ]
}
```

---

## 使用规则

### sub_groups 与 test_cases 的选择

- 模块包含多类操作（搜索/新增/编辑/删除）→ 使用 `sub_groups`
- 模块功能单一或用例数量少（≤5条）→ 直接使用 `test_cases`

示例（有子分组）：
```json
{
  "name": "质量问题台账列表",
  "sub_groups": [
    { "name": "搜索", "test_cases": [...] },
    { "name": "导出", "test_cases": [...] }
  ]
}
```

示例（无子分组）：
```json
{
  "name": "质量问题台账权限验证",
  "test_cases": [...]
}
```

---

## 字段约束

| 字段 | 约束 |
|------|------|
| `meta.project_name` | 必须与 XMind 输出目录对应 |
| `meta.version` | 格式：`YYYYMM版本` 或 `mmdd版本` |
| `test_cases[].title` | 必须以「验证」二字开头 |
| `test_cases[].priority` | 枚举：`P0` / `P1` / `P2` |
| `test_cases[].case_type` | 枚举：`正常用例` / `异常用例` / `边界用例` / `待核实`（仅 Reviewer 可设置） |
| `steps[].step` 数量 | 必须与 `steps[].expected` 数量相等 |

> **注意**：`待核实` 类型仅由 Reviewer Subagent 在 3 轮修正后仍无法确认的用例上标记，Writer Subagent 不应使用此值。标记为待核实的用例会在评审报告中单独列出，提醒用户人工核实。

---

## 临时文件命名规则

Writer Subagent 输出的临时 JSON 文件命名（按 Story 隔离）：

```
zentao-cases/<项目路径>/Requirement/<Story>/temp/<模块简称>.json
```

示例：
- `zentao-cases/customItem-platform/信永中和/Requirement/Story-20260322/temp/list.json`
- `zentao-cases/customItem-platform/信永中和/Requirement/Story-20260322/temp/create.json`

---

## Checklist JSON 格式

Writer 在生成完整用例前，先输出轻量级 Checklist（供用户审阅和调整），格式如下：

```json
{
  "module": "质量问题台账列表",
  "writer": "Writer A",
  "items": [
    { "point": "列表默认加载显示", "priority": "P0", "type": "正常用例", "include": true },
    { "point": "按行动编号单条件搜索", "priority": "P1", "type": "正常用例", "include": true },
    { "point": "按问题分类下拉搜索", "priority": "P1", "type": "正常用例", "include": true },
    { "point": "搜索无结果边界（暂无数据提示）", "priority": "P2", "type": "边界用例", "include": true },
    { "point": "重置搜索条件", "priority": "P2", "type": "正常用例", "include": true },
    { "point": "导出 Excel 功能", "priority": "P2", "type": "正常用例", "include": true }
  ]
}
```

Checklist 字段说明：

| 字段 | 说明 |
|------|------|
| `point` | 测试点简述（非完整用例标题，用于快速浏览） |
| `priority` | 预计优先级 P0/P1/P2 |
| `type` | 预计用例类型 |
| `include` | 用户可改为 `false` 以排除该测试点 |

**Checklist 用途：**
- 用户可在此阶段快速增减测试点，比修改完整用例成本低得多
- 确认后 Writer 基于 Checklist 生成完整 steps/expected 用例
- 不需要保存为独立文件，在对话中展示即可

---

## .qa-state.json 断点续传状态文件

每步完成后写入 Story 目录，用于中断恢复：

```
zentao-cases/<项目路径>/Requirement/<Story>/.qa-state.json
```

```json
{
  "story": "Story-20260322",
  "project_name": "信永中和",
  "prd_files": ["PRD-26-xxx.md", "PRD-27-xxx.md"],
  "last_completed_step": 4,
  "steps_completed": [1, 2, 3, 4],
  "prd_enhanced_at": "2026-03-25T10:00:00Z",
  "enhanced_files": [
    "PRD-26-数据质量-质量问题台账-enhanced.md"
  ],
  "checklist_confirmed": true,
  "writers": {
    "list": { "status": "completed", "file": "temp/list.json", "case_count": 12 },
    "create": { "status": "completed", "file": "temp/create.json", "case_count": 15 },
    "detail": { "status": "pending", "file": null, "case_count": 0 }
  },
  "reviewer_status": "pending",
  "final_json": null,
  "output_xmind": null,
  "mode": "normal",
  "created_at": "2026-03-25T10:00:00Z",
  "updated_at": "2026-03-25T10:30:00Z"
}
```

状态字段说明：

| 字段 | 说明 |
|------|------|
| `last_completed_step` | 最后完成的步骤编号（1-8） |
| `mode` | `normal` / `quick`（快速模式跳过 brainstorming 和确认） |
| `writers.<name>.status` | `pending` / `in_progress` / `completed` / `failed` |
| `reviewer_status` | `pending` / `completed` / `escalated`（需人工介入） |

**恢复时的行为：**
- 已完成步骤直接跳过，不重新执行
- `pending` 状态的 Writer 重新启动
- `in_progress` 状态的 Writer 也重新启动（上次可能被中断）
- Reviewer 状态为 `escalated` 时，直接提示用户处理
