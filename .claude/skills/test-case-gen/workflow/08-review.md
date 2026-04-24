# 节点 8: review — 质量审查与修正

> 由 workflow/main.md 路由后加载。上游：节点 7 write；下游：节点 9 format-check。

**目标**：对 Writer 产出执行质量审查，按阈值自动决策。

**⏳ Task**：将 `review` 任务标记为 `in_progress`。

### 8.1 质量审查（AI 任务）

派发 `reviewer-agent`（model: opus）执行质量审查。

质量阈值决策：

| 问题率    | 行为                           |
| --------- | ------------------------------ |
| < 15%     | 静默修正                       |
| 15% - 40% | 自动修正 + 质量警告            |
| > 40%     | 阻断，输出问题报告，等用户决策 |

问题率 = 含问题用例数 / 总用例数。

--quick 模式仅执行 1 轮审查。普通模式最多 2 轮（修正后复审）。

### 8.2 合并产出

将所有 Writer 输出合并为最终 JSON。

### 8.3 更新状态

```bash
kata-cli progress task-update --project {{project}} --session "$SESSION_ID" --task review --status done --payload '{{json}}'
```

**✅ Task**：将 `review` 任务标记为 `completed`（subject 更新为 `review — {{n}} 条用例，问题率 {{rate}}%`）。

### 交互点 D — 质量门禁决策（仅在 reviewer 阻断时使用 AskUserQuestion 工具）

默认行为：

- `verdict = pass` / `pass_with_warnings` → 直接进入 format-check，并在普通文本展示评审摘要
- `verdict = blocked` → 使用 AskUserQuestion 向用户请求决策

阻断时展示：

- 问题：`评审完成：共 {{n}} 条用例，修正 {{m}} 条，问题率 {{rate}}%，当前为阻断状态。如何处理？`
- 选项 1：返回 Writer 阶段重新生成（推荐）
- 选项 2：查看修正详情
- 选项 3：人工复核后继续
