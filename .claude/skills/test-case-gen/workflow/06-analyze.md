# 节点 6: analyze — 历史检索与测试点规划

> 由 workflow/main.md 路由后加载。上游：节点 5 enhance；下游：节点 7 write。

**目标**：检索历史用例、QA 头脑风暴、生成测试点清单 JSON。

**⏳ Task**：将 `analyze` 任务标记为 `in_progress`。

### 6.1 历史用例检索

```bash
kata-cli archive-gen search --query "{{keywords}}" --project {{project}} --limit 20 \
  | kata-cli search-filter filter --top 5
```

> 注：`workspace/{{project}}/archive` 中的 `workspace` 对应 `.env` 中 `WORKSPACE_DIR` 的值（默认 `workspace`），`{{project}}` 为当前选中的项目名称。`search-filter.ts` 对结果做相关性排序并截取 top-5，减少传入 analyze-agent 的上下文体积。

### 6.2 测试点清单生成（AI 任务）

派发 `analyze-agent`（model: opus），结合增强后 PRD + 历史用例，生成结构化测试点清单。

--quick 模式下简化分析：跳过历史检索，直接从 PRD 提取测试点。

### 6.3 更新状态

```bash
kata-cli progress task-update --project {{project}} --session "$SESSION_ID" --task analyze --status done --payload '{{json}}'
```

**✅ Task**：将 `analyze` 任务标记为 `completed`（subject 更新为 `analyze — {{n}} 个模块，{{m}} 条测试点`）。

### 交互点 C — 测试点摘要（默认直接进入 write）

先在普通文本中展示测试点清单概览：

```
测试点清单（共 {{n}} 个模块，{{m}} 条测试点）：

┌─ {{module_a}}（{{count_a}} 条）
│  ├─ {{page_1}}: {{points}}...
│  └─ {{page_2}}: {{points}}...
└─ {{module_b}}（{{count_b}} 条）
```

默认行为：若测试点清单无 `blocking_unknown` / `invalid_input`，直接进入 write 节点。

仅当 analyze-agent 标记需要人工裁决，或用户明确要求修改范围时，才使用 AskUserQuestion：

- 问题：`测试点清单存在待裁决项，是否需要调整后再生成？`
- 选项 1：直接开始生成（推荐）
- 选项 2：调整测试点清单
- 选项 3：增加/删除测试点
