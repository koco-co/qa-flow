# `.qa-state.json` Schema 文档

> 当前为文档性说明，不做运行时强制校验。

## 写入来源

| 字段 | 写入者 | 说明 |
|------|--------|------|
| `workflow` | `harness-state-machine.mjs --init` | workflow 标识符 |
| `last_completed_step` | `harness-state-machine.mjs --advance` | 最后完成的步骤 id（字符串）或 0（初始） |
| `awaiting_verification` | `harness-state-machine.mjs --advance`（archive 步骤） | 是否等待用户验收 |
| `checklist_confirmed` | Skill 内 checklist 确认后直接写入 | 用户已确认 Checklist |
| `reviewer_status` | `harness-state-machine.mjs --advance`（reviewer 步骤） | `"pending"` / `"completed"` / `"escalated"` |
| `writers` | `harness-state-machine.mjs --set-writer` | 并行 Writer 状态集合 |
| `source_context` | `repo-branch-mapping.mjs writeRepoBranchPlanToState()` | DTStack 源码分支上下文 |
| `created_at` | `harness-state-machine.mjs --init` | ISO 8601 创建时间 |
| `*_failure` | `harness-state-machine.mjs --fail` | 动态键，`<step-id>_failure`，包含 reason/action |

## 字段详情

### `source_context`（由 `sync-source-repos.mjs` 写入）

```json
{
  "module_key": "data-assets",
  "repo_profile_key": "dtstack-default",
  "development_version": "6.4.10",
  "release_version": "v6.4.10",
  "requirement_title": "内置规则丰富",
  "backend": [
    { "role": "asset-backend", "repoKey": "dt-center-assets", "path": ".repos/...", "branch": "release/6.4.10" }
  ],
  "frontend": [
    { "role": "asset-frontend", "repoKey": "dt-insight-studio-front", "path": ".repos/...", "branch": "release/6.4.10" }
  ]
}
```

### `writers`（由 `harness-state-machine.mjs --set-writer` 写入）

```json
{
  "writer-A": { "name": "writer-A", "module": "列表页", "status": "completed" },
  "writer-B": { "name": "writer-B", "module": "新增页", "status": "in_progress" }
}
```

### `*_failure`（由 `harness-state-machine.mjs --fail` 写入）

```json
{
  "reviewer_failure": {
    "reason": "质量问题率 > 40%，阻断执行",
    "action": "等待用户决策"
  }
}
```

## 已知双写入器问题（P2）

`source_context` 由 `repo-branch-mapping.mjs` 的 `writeRepoBranchPlanToState()` 直接写入（读-合并-写），其余字段由 `harness-state-machine.mjs` 管理。由于当前 workflow 顺序执行（`source-sync` 在 `writer` 之前完成），不会产生竞争条件。

**后续优化**：将 `writeRepoBranchPlanToState()` 迁移为通过 `harness-state-machine.mjs --set-context` action 写入，统一写入器。
