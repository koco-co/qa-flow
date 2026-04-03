<!-- step-id: xmind | delegate: testCaseOrchestrator -->
# Step xmind：XMind 输出

> 前置条件: `last_completed_step` == `"reviewer"`
> 快速模式: 执行

## 执行方式

调用 `xmind-converter` Skill（`.claude/skills/xmind-converter/SKILL.md`）。
文件命名和输出路径见 CLAUDE.md「XMind 输出规范」。

## 目标文件判断

**目标文件路径规则（强制）**：每个 PRD 始终对应独立的 XMind 文件，路径为 `cases/xmind/YYYYMM/<功能名>.xmind`，其中 `<功能名>` 来自当前 PRD 的 `meta.requirement_name`（做路径安全替换）。

- 目标文件不存在 → 新建
- 目标文件已存在，requirement_name 相同 → 询问用户覆盖还是跳过

> ⚠️ **严禁**：因目录下已存在**其他 PRD** 的 XMind 文件而触发 `--append` 追加模式。  
> 多 PRD 场景（批量生成或逐个生成）下，每个 PRD 必须独立建立自己的 `.xmind` 文件，  
> 不得合并到 `Story-YYYYMMDD.xmind` 聚合文件。`--append` 模式仅在用户**明确要求**将多需求追加到同一文件时才允许使用。

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
