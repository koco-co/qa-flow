# 节点 6: review — 质量审查与修正

> 由 workflow/main.md 路由后加载。上游：节点 5 write；下游：节点 7 format-check。

**目标**：对 Writer 产出执行质量审查，按阈值自动决策。

**⏳ Task**：将 `review` 任务标记为 `in_progress`。

### 6.1 质量审查（AI 任务）

派发 `reviewer-agent`（model: opus）执行质量审查。

质量阈值决策：

| 问题率    | 行为                           |
| --------- | ------------------------------ |
| < 15%     | 静默修正                       |
| 15% - 40% | 自动修正 + 质量警告            |
| > 40%     | 阻断，输出问题报告，等用户决策 |

问题率 = 含问题用例数 / 总用例数（F07-F16 任一命中即计为一条问题用例；F16 只在 MANUAL 分支，不自动修正）。

--quick 模式仅执行 1 轮审查。普通模式最多 2 轮（修正后复审）。

### 6.2 source_ref 锚点校验（Phase D2）

reviewer-agent 在第零轮审查中批量调：

```bash
kata-cli source-ref batch --refs-json /tmp/refs-*.json \
  --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}}
```

CLI 内部按前缀 dispatch：

- `enhanced#...` → 调 `discuss validate --check-source-refs`（D3 前仍可走 legacy plan.md path；D2 过渡期 CLI 兼容两种）
- `prd#...` → 读 `{prd_dir}/original.md` slug 校验
- `knowledge#...` → knowledge-keeper read 校验
- `repo#...` → 文件 + 行号存在校验
- `plan#...` → legacy 兼容，warning 放行

批量结果按 F16 规则计入 issues。主 agent 不必在 skill 层重复调用——审查输出 JSON 中的 `issues[].code="F16"` 已承担结果汇聚职责。

### 6.3 合并产出

将所有 Writer 输出合并为最终 JSON。

### 6.4 更新状态

```bash
kata-cli progress task-update --project {{project}} --session "$SESSION_ID" --task review --status done --payload '{{json}}'
```

**✅ Task**：将 `review` 任务标记为 `completed`（subject 更新为 `review — {{n}} 条用例，问题率 {{rate}}%`）。

### 交互点 C — 质量门禁决策（仅在 reviewer 阻断时使用 AskUserQuestion 工具）

默认行为：

- `verdict = pass` / `pass_with_warnings` → 直接进入 format-check，并在普通文本展示评审摘要
- `verdict = blocked` → 使用 AskUserQuestion 向用户请求决策

阻断时展示：

- 问题：`评审完成：共 {{n}} 条用例，修正 {{m}} 条，问题率 {{rate}}%，当前为阻断状态。如何处理？`
- 选项 1：返回 Writer 阶段重新生成（推荐）
- 选项 2：查看修正详情
- 选项 3：人工复核后继续
