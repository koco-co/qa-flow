# ui-autotest · step 6 — 合并脚本

> 由 SKILL.md 路由后加载。执行时机：步骤 5（及可能的 5.5）完成后。

按 Task Schema 更新：将 `步骤 6` 标记为 `in_progress`。

> 仅合并步骤 5 中**验证通过**的脚本。

```bash
bun run .claude/skills/ui-autotest/scripts/merge-specs.ts \
  --input workspace/{{project}}/.temp/ui-blocks/{{suite_slug}}/ \
  --output workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/
```

> 提示：默认会执行 `tsc --noEmit` 对代码块做类型检查，如需跳过（调试时）可加 `--no-compile-check`。

生成：

- `smoke.spec.ts`：仅含 P0 用例（已验证通过）
- `full.spec.ts`：含所有优先级用例（已验证通过）

输出结果：

```json
{
  "smoke_spec": "workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/smoke.spec.ts",
  "full_spec": "workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/full.spec.ts",
  "case_count": { "smoke": 5, "full": 20 },
  "skipped": ["{{跳过的用例 id 列表}}"]
}
```

---

按 Task Schema 更新：将 `步骤 6` 标记为 `completed`（subject: `步骤 6 — 合并 {{n}} 条脚本`）。

**💾 进度持久化 — 合并完成**：

```bash
kata-cli ui-autotest-progress update --project {{project}} --suite "{{suite_name}}" --env "{{env}}" --field merge_status --value completed
```
