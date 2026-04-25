# ui-autotest · step 1.5 — 断点续传检查

> 由 SKILL.md 路由后加载。执行时机：步骤 1 完成、步骤 2 开始前。

**⏳ 自动检查**：检查是否存在未完成的进度：

```bash
kata-cli progress session-summary --project {{project}} --session "$SESSION_ID"
```

**情况 A — 无进度文件**（命令 exit 1）：正常继续步骤 1.5 → 步骤 2（登录态准备）。

**情况 B — 有进度文件且 `merge_status === "completed"`**：

```
上次执行已全部完成。是否重新开始？
1. 重新开始（清空进度）
2. 取消
```

若选 1，执行 `kata-cli progress session-delete --project {{project}} --session "$SESSION_ID"` 后继续步骤 1.5 → 步骤 2。

**情况 C — 有进度文件且未完成**：

先执行 resume 清理中断状态：

```bash
kata-cli progress session-resume --project {{project}} --session "$SESSION_ID" --payload-path-check script_path
```

然后读取 summary，向用户展示（步骤进度条 + 用例统计）：

```
检测到上次未完成的执行进度：

套件：{{suite_name}}

步骤进度：
  ✓ 步骤 1   解析输入与确认范围
  ✓ 步骤 2   登录态准备
  {{#each completedSteps as step}}✓ 步骤 {{step.id}}   {{step.name}}
  {{/each}}➜ 步骤 {{current_step}}   {{current_step_name}}（中断于此）
  {{#each pendingSteps as step}}░ 步骤 {{step.id}}   {{step.name}}
  {{/each}}

用例进度：{{passed}} 通过 · {{failed}} 失败 · {{pending}} 待执行（共 {{total}}）
上次更新：{{updated_at}}
{{#if expired}}⚠️ 上次进度已超过 7 天，环境可能已变化。建议选择「全部重新开始」。{{/if}}

请选择：
1. 继续执行（跳过已通过，从待执行的继续）
2. 重试失败项（重跑失败用例，再继续待执行的）
3. 全部重新开始（清空进度，从头来）
```

> 步骤名称参照 protocols.md §4 Task Schema（步骤 1-6）。`completedSteps` 为 ID < `current_step` 的步骤，`pendingSteps` 为 ID > `current_step` 的步骤。

- 选 1：直接跳到 `current_step` 对应的步骤（3/4/5），已 passed 的用例自动跳过
- 选 2：执行 `kata-cli progress session-resume --project {{project}} --session "$SESSION_ID" --retry-failed --payload-path-check script_path`，然后跳到 `current_step`
- 选 3：执行 `reset`，正常继续后续步骤

> **恢复跳转规则**：恢复时直接跳到 `current_step` 对应的步骤。步骤 1~2（解析与范围、登录态）始终重新执行（它们很快且登录态需刷新），但从进度文件中恢复 `url`、`selected_priorities` 等参数，无需重新询问用户。
