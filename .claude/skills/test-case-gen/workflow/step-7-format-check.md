# 节点 7: format-check — 格式合规检查闭环

> 由 workflow/main.md 路由后加载。上游：节点 6 review；下游：节点 8 output。

**目标**：确保 Writer 产出的用例在格式层面严格符合 R01-R11 编写规范，零偏差才放行。

> **最大轮次**：普通模式最多 5 轮；--quick 模式最多 2 轮。

**⏳ Task**：将 `format-check` 任务标记为 `in_progress`。创建第 1 轮子任务（subject: `[format-check] 第 1 轮`，activeForm: `执行第 1 轮格式检查`）。

### 7.1 生成临时 Archive MD

```bash
kata-cli archive-gen convert \
  --input {{review_json}} \
  --project {{project}} \
  --output workspace/{{project}}/archive/{{YYYYMM}}/tmp/{{name}}-format-check.md
```

### 7.2 格式检查（分层流水线）

**第一层：脚本确定性检查**

```bash
kata-cli format-check-script check --input workspace/{{project}}/.temp/{{prd_slug}}-format-check.md
```

脚本输出 JSON：`definite_issues`（纯格式违规）+ `suspect_items`（FC04/FC06 疑似项）。

**第二层：语义判断（仅 suspect_items 非空时）**

若 `suspect_items` 为空 → 跳过 haiku 调用，直接合并结果。
若非空 → 派发 `format-checker-agent`（model: haiku），仅传入 suspect_items，不传完整 Archive。

输入（仅传给 haiku 时）：

- `suspect_items`：疑似违规条目列表
- 当前轮次信息：`第 {{round}} 轮 / 最大 {{max_rounds}} 轮`
- 上一轮偏差报告（第 2 轮起）

**合并**：脚本 `definite_issues` + agent `confirmed_issues` = 完整偏差报告。

**循环**：违规项修正后重新执行第一层（最多 5 轮）。

### 7.3 行号定位

```bash
kata-cli format-report-locator locate \
  --report {{format_checker_json}} \
  --archive workspace/{{project}}/archive/{{YYYYMM}}/tmp/{{name}}-format-check.md \
  --output workspace/{{project}}/archive/{{YYYYMM}}/tmp/{{name}}-format-enriched.json
```

可选：终端可读报告

```bash
kata-cli format-report-locator print \
  --report {{format_checker_json}} \
  --archive workspace/{{project}}/archive/{{YYYYMM}}/tmp/{{name}}-format-check.md
```

### 7.4 Verdict 判定

**✅ Task**：将当前轮子任务标记为 `completed`（subject 更新为 `[format-check] 第 {{n}} 轮 — {{偏差数}} 处偏差`）。

- `verdict === "pass"` → 将 `format-check` 主任务标记为 `completed`（subject: `format-check — 通过（第 {{n}} 轮）`），进入节点 8（output）
- `verdict === "fail"` 且 `round < max_rounds` → 创建下一轮子任务（subject: `[format-check] 第 {{n+1}} 轮`），进入修正循环（9.5）
- `verdict === "fail"` 且 `round >= max_rounds` → 交互点 D2（超限决策）

### 7.5 修正循环

1. 将偏差报告转为 `<format_issues>` 载荷
2. 派发 Writer Sub-Agent 修正报告中列出的用例（仅修正偏差用例，其余原样保留）
3. Writer 输出修正后的 JSON
4. 派发 `reviewer-agent`（model: opus）对修正后的 JSON 执行 F07-F15 设计逻辑复审
5. 回到 9.1 重新生成临时 Archive MD → 9.2 再检

### 7.6 更新状态

每轮循环后更新状态：

```bash
# format-check 是自定义节点，首次使用前需确保已注册
kata-cli progress task-add --project {{project}} --session "$SESSION_ID" \
  --tasks '[{"id":"format-check","name":"format-check","kind":"node","order":7,"depends_on":["review"]}]' \
  2>/dev/null || true
kata-cli progress task-update --project {{project}} --session "$SESSION_ID" --task format-check --status done --payload '{{json}}'
```

数据结构：参见 `.claude/references/output-schemas.json` 中的 `state_format_check_data`。

### 交互点 D2 — 格式检查超限决策（使用 AskUserQuestion 工具）

当 format-check 循环达到最大轮次但仍有偏差时触发：

使用 AskUserQuestion 工具向用户展示：

- 问题：`格式检查已执行 {{max_rounds}} 轮，仍有 {{n}} 处偏差未修正。如何处理？`
- 选项 1：强制输出（忽略剩余偏差）
- 选项 2：查看未修正项详情
- 选项 3：人工修正后继续
