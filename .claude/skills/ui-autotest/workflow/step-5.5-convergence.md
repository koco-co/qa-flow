# ui-autotest · step 5.5 — 共性收敛（条件触发）

> 由 SKILL.md 路由后加载。仅在 step 5 累计失败用例数 ≥ `convergence_threshold` 时执行，否则跳过。
> 收敛完成后回到 SKILL.md 的步骤 6（合并脚本）。

---

## 步骤 5.5：共性收敛（条件触发）

> **触发条件**：步骤 5 累计失败用例数 ≥ `convergence_threshold`（默认 5）且 `convergence_status !== "completed"`。
> **目的**：失败规模较大时，先识别共性问题（多个 case 共同踩到同一 helper bug），固化 helpers，再让剩余 fixer 在 `helpers_locked=true` 状态下只改单脚本。
> **基础**：memory `feedback_fixer_batch_strategy`（2026-04-17 事故复盘）。

按 Task Schema 更新：将 `步骤 5.5` 标记为 `in_progress`（subject `步骤 5.5 — 探路中`）。

**5.5.1 标记进入收敛态**

```bash
EXISTING=$(kata-cli progress artifact-get --project {{project}} --session "$SESSION_ID" --key ui_autotest_flow 2>/dev/null || echo "{}")
UPDATED=$(echo "$EXISTING" | jq '. + {"convergence_status": "active"}')
kata-cli progress artifact-set --project {{project}} --session "$SESSION_ID" --key ui_autotest_flow --value "$UPDATED"
```

**5.5.2 选择 1-2 个探路 case**

从 `test_status === "failed"` 且 `attempts === 0` 的用例中，按以下优先级取 1-2 个：
- 不同 page 的（覆盖更多场景）
- 最近失败的
- 错误签名彼此最不同的

**5.5.3 派探路 fixer（最多 2 并发）**

派发 `script-fixer-agent`，输入加 `"helpers_locked": false`（探路允许改 helpers 用于诊断）：

```json
{
  "error_type": "...",
  "script_path": "...",
  "stderr_last_20_lines": "...",
  "attempt": 1,
  "url": "{{url}}",
  "repos_dir": "workspace/{{project}}/.repos/",
  "helpers_locked": false
}
```

收集每个 fixer 的 `summary` 字段（fixer 自述本次修了什么、踩了什么坑）。

按 Task Schema 更新：subject 推进 `步骤 5.5 — 分析中`。

**5.5.4 收集所有失败签名（精简）**

主 agent 遍历所有 `test_status === "failed"` 的 case，正则提取 error_type + stderr_last_5_lines（不读完整 stderr，保护上下文）。

**5.5.5 派 pattern-analyzer-agent**

派发 `pattern-analyzer-agent`，输入：

```json
{
  "probe_summaries": [/* 步骤 5.5.3 收集 */],
  "all_failure_signatures": [/* 步骤 5.5.4 提取 */],
  "helpers_inventory": {
    "lib/playwright/ant-interactions.ts": [/* 函数名列表 */],
    "workspace/{{project}}/tests/helpers/batch-sql.ts": [/* 函数名列表 */]
  }
}
```

`helpers_inventory` 由主 agent 用 `Grep "^export (async )?function" lib/playwright/ workspace/{{project}}/tests/helpers/` 自动构造。

接收 `common_patterns[]` + `no_common_pattern_cases` + 可选 `skip_reason`。

按 Task Schema 更新：subject 推进 `步骤 5.5 — 应用 {{N}} 项 helpers`。

**5.5.6 应用 helpers diff**

主 agent 按 `common_patterns[]` 逐条用 Edit 工具修改 `helper_target`：

- `diff_kind: "patch"` → 直接 Edit 改既有函数
- `diff_kind: "add_function"` → 在目标文件追加新函数
- `diff_kind: "rewrite"` → 主 agent 评估后决定是否拒绝（拒绝时记入 `convergence.common_patterns[].applied=false`）
- `confidence: "low"` → 必须用 AskUserQuestion 让用户拨

每条改完跑 `bunx tsc --noEmit -p tsconfig.json` 校验编译通过。失败则回滚该条改动并 stderr 警告。

**5.5.7 重置探路 case 的 test_status**

```bash
kata-cli progress task-update --project {{project}} --session "$SESSION_ID" --task {{probe_id}} --status pending
```

让主流重跑这些 case，检验 helpers 修复是否真的解决问题。

**5.5.8 标记收敛完成**

```bash
EXISTING=$(kata-cli progress artifact-get --project {{project}} --session "$SESSION_ID" --key ui_autotest_flow 2>/dev/null || echo "{}")
UPDATED=$(echo "$EXISTING" | jq '. + {"convergence_status": "completed", "convergence": {"triggered_at":"...","probe_attempts":[...],"common_patterns":[...],"completed_at":"..."}}')
kata-cli progress artifact-set --project {{project}} --session "$SESSION_ID" --key ui_autotest_flow --value "$UPDATED"
```

按 Task Schema 更新：将 `步骤 5.5` 标记为 `completed`（subject `步骤 5.5 — 完成 ({{N}} 项 helpers)`）。

**5.5.9 回到步骤 5 主流**

继续派剩余失败 case 的 fixer，**所有 fixer 输入 `helpers_locked: true`**（禁止改 helpers，只允许改单脚本）。

**短路退出场景**：
- `convergence_status === "completed"` → 跳过 5.5 整段（断点续传时）
- `pattern-analyzer` 返回 `skip_reason === "all_individual"` → 5.5 直接 `completed`，不应用任何 diff

**禁止行为**：
- 主 agent 自行读多份 fixer summary 识别共性 → 必须派 pattern-analyzer
- 同一 suite run 内 5.5 触发 ≥ 2 次 → `convergence_status` 守卫禁止
- 探路 fixer 的 helpers 修改在 5.5.6 之后保留 → 5.5.6 以 analyzer 输出为准，覆盖探路修改

