<!-- step-id: xmind | delegate: testCaseOrchestrator -->
# Step xmind：XMind 输出

> 前置条件: `last_completed_step` == `"reviewer"`
> 快速模式: 执行

## 执行方式

调用 `xmind-converter` Skill（`.claude/skills/xmind-converter/SKILL.md`）。
文件命名和输出路径见 CLAUDE.md「XMind 输出规范」。

## 目标文件判断

- 文件不存在 → 新建
- 文件已存在，本次 requirement_name 不同 → `--append` 追加模式
- 文件已存在，requirement_name 相同 → 询问用户覆盖还是跳过

## 错误处理

- **json-to-xmind.mjs 脚本执行失败**：展示错误日志，建议用户检查 JSON 格式

---

## 步骤完成后

验证 .xmind 文件存在后，更新 `.qa-state.json`：
- `output_xmind` → 实际 XMind 文件路径
- `last_completed_step` → `"xmind"`

同时向 `execution_log` 数组追加：
```json
{"step": "xmind", "status": "completed", "at": "<ISO8601>", "duration_ms": null, "summary": "生成 XMind 文件，路径: <xmind-path>，包含 M 条用例"}
```

> 注意：Step xmind 完成后不删除临时文件，延迟到 Step notify（用户确认后）清理。
