# ui-autotest · step 5 — 逐条自测与修复（强制，不可跳过）

> 由 SKILL.md 路由后加载。共性收敛阈值、Task schema、命令别名在 SKILL.md 前段定义，本文件不重复。
> 失败数 ≥ `convergence_threshold` 时，执行完本步后进入 `workflow/step-5.5-convergence.md`。

---

## 步骤 5：逐条自测与修复（强制，不可跳过）

> **⚠️ 强制规则：每条脚本必须单独执行验证通过后才能进入合并阶段。仅编译通过不代表验证通过，未经实际执行验证的脚本禁止交付。**

按 Task Schema 更新：将 `步骤 5` 标记为 `in_progress`，并为每条待验证用例创建自测子任务。

**5.1 逐条执行验证**

**💾 进度持久化 — 前置条件就绪**：

前置条件（建表/引入/同步/质量项目授权）完成后：

```bash
bun run .claude/scripts/ui-autotest-progress.ts update --project {{project}} --suite "{{suite_name}}" --env "{{env}}" --field preconditions_ready --value true
```

断点恢复时，若 `preconditions_ready === true`，跳过前置条件准备。

对 `workspace/{{project}}/.temp/ui-blocks/{{suite_slug}}/` 中的每个代码块，逐条执行 Playwright 测试：

```bash
ACTIVE_ENV={{env}} QA_PROJECT={{project}} bunx playwright test workspace/{{project}}/.temp/ui-blocks/{{suite_slug}}/{{id}}.ts --project=chromium --timeout=30000
```

**💾 进度持久化 — 自测状态**：

每条用例执行前：

```bash
bun run .claude/scripts/ui-autotest-progress.ts update --project {{project}} --suite "{{suite_name}}" --env "{{env}}" --case {{id}} --field test_status --value running
```

执行结果（通过）：

```bash
bun run .claude/scripts/ui-autotest-progress.ts update --project {{project}} --suite "{{suite_name}}" --env "{{env}}" --case {{id}} --field test_status --value passed
```

执行结果（失败）：

```bash
bun run .claude/scripts/ui-autotest-progress.ts update \
  --project {{project}} \
  --suite "{{suite_name}}" \
  --env "{{env}}" \
  --case {{tN}} \
  --field test_status --value failed \
  --error "{{error_summary}}"
```

断点恢复时，跳过 `test_status === "passed"` 的用例。对于 `test_status === "failed"` 且 `attempts >= 3` 的用例，也跳过（除非用户选择「重试失败项」）。

**5.2.0 共性收敛触发判断**

每条用例自测完成后，主 agent 检查：

```typescript
const failedCount = Object.values(progress.cases)
  .filter(c => c.test_status === "failed").length;

if (failedCount >= convergenceThreshold &&
    progress.convergence_status !== "completed") {
  // 跳出主流，进入步骤 5.5
}
```

如触发，按下文步骤 5.5 执行；不触发则继续走 5.2 单条修复。

**5.2 失败处理（派发 Sub-Agent，最多重试 3 轮）**

> **⚠️ 主 agent 上下文保护规则：主 agent 绝不自行调试脚本。** 失败时派发 `script-fixer-agent`，仅传递精简错误信息（见下文错误分类）。详细修复流程见 script-fixer-agent 自身定义。

**错误分类提取**

主 agent 从 Playwright stderr 用正则提取错误类型，不读完整输出：

| 正则模式 | error_type |
|----------|------------|
| `Timeout \d+ms exceeded` | timeout |
| `locator\..*resolved to \d+ elements?\|waiting for locator` | locator |
| `expect\(.*\)\.(toHave\|toBe\|toContain\|toMatch)` | assertion |
| 以上均不匹配 | unknown |

> **⚠️ assertion 类错误特别提醒**：派发 fixer 时，必须在输入中加 `"strict_assertion": true` 提示。fixer 不得通过放宽断言（扩大正则、换成 toBeVisible、包 try/catch、改用祖先元素 filter）绕过失败；详见 `script-fixer-agent` 的「断言修复红线」章节。预期文本必须严格对齐 Archive MD `expected` 列原文。

派发给 script-fixer-agent 的精简信息：

```json
{
  "error_type": "timeout | locator | assertion | unknown",
  "script_path": "workspace/{{project}}/.temp/ui-blocks/{{suite_slug}}/{{id}}.ts",
  "stderr_last_20_lines": "...",
  "attempt": 1,
  "url": "{{url}}",
  "repos_dir": "workspace/{{project}}/.repos/",
  "strict_assertion": true,
  "original_steps": [ /* 该用例的 Archive MD 步骤+预期原文数组 */ ]
}
```

> `original_steps` 必填：fixer 判断断言失败是 Bug 还是定位错误时，需要原始 `expected` 文本做对照。`strict_assertion` 恒为 `true`，fixer 不得放宽断言。

Sub-Agent 返回 `FIXED` → 更新进度 `test_status = "passed"`；返回 `STILL_FAILING` → 更新 `test_status = "failed"` 并通过 `--error` 追加到 `error_history`，`attempts < 3` 则再派发一轮，否则标记放弃。

**5.3 Archive MD 反向更新**

Sub-Agent 在修复过程中若发现 MD 用例描述与实际系统行为不一致，将在返回结果中附带 `corrections` 字段，并标注 `reason_type`：

- `frontend`：前端 DOM 变化（页面结构、字段名、按钮文本、流程步骤、选项值等）
- `logic`：需求逻辑变更（业务规则、预期结果等）

主 agent 收集所有 corrections 后，按 `reason_type` 分三类处理：

**前端类（自动写回）**

直接更新 Archive MD，追加注释 `<!-- 由 ui-autotest 自测校正 -->`，完成后通知用户：

```
已自动同步以下用例（前端 DOM 变更）：

{{#each frontend_corrections}}
- {{case_title}}：{{field}} "{{current}}" → "{{proposed}}"
{{/each}}
```

**逻辑类（需确认）**

展示差异预览，等待用户确认后才写回：

```
以下用例存在需求逻辑差异，请确认是否更新：

{{#each logic_corrections}}
- {{case_title}}：{{field}} "{{current}}" → "{{proposed}}" (依据: {{evidence}})
{{/each}}

是否更新 Archive MD？
1. 不更新（默认）
2. 更新
```

**potential_bug 类（不写回，上报用户）**

Archive MD 不变，脚本断言保持原用例预期文本，该用例标记为失败。主 agent 在失败汇总中突出列出，附带 fixer 收集的 DOM 证据：

```
以下用例断言失败，脚本已按用例原文严格断言，页面实际表现与预期不符 — 可能是业务 Bug：

{{#each potential_bug_corrections}}
- {{case_title}}
  步骤 {{step_no}}：{{field}}
  用例预期：{{current}}
  实际页面：{{proposed}}
  证据：{{evidence}}
{{/each}}

建议手工复现确认；确为 Bug 可直接用 /bug-report 生成报告。
```

这些用例**不进入**合并脚本，在步骤 8 的失败分类中归为「业务缺陷疑似」。

**5.4 3 次重试仍失败的处理**

若某条用例经过 3 轮 sub-agent 修复仍无法通过：

1. 记录为「环境/平台问题」，标记失败原因
2. 将该用例从待合并列表中移除（不影响其他用例）
3. 在最终报告中单独列出，注明失败原因和 sub-agent 已尝试的修复措施
4. **不自动生成 Bug 报告**，改为向用户报告：

```
以下用例经过 3 轮 sub-agent 修复仍未通过，可能为环境或平台问题：

- {{title}}：{{最后一次的错误摘要}}
  已尝试：{{修复措施列表}}

建议：手动检查测试环境后重试，或调整用例预期。
```

---

按 Task Schema 更新：所有用例自测完成后，将 `步骤 5` 标记为 `completed`（subject: `步骤 5 — {{passed}}/{{total}} 通过`）。

**💾 进度持久化 — 步骤 5 完成**：

```bash
bun run .claude/scripts/ui-autotest-progress.ts update --project {{project}} --suite "{{suite_name}}" --env "{{env}}" --field current_step --value 6
```

