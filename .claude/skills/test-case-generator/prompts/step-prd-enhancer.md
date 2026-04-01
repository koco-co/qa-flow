<!-- step-id: prd-enhancer | delegate: testCaseOrchestrator -->
# Step prd-enhancer：PRD 增强 + 页面信息提炼 + 健康度预检

> 前置条件: `last_completed_step` == `"prd-formalize"` 或 `"source-sync"`（config.repos 非空时经过 prd-formalize，否则直接从 source-sync 进入）
> 快速模式: 执行

## 执行方式

调用 `prd-enhancer` Skill（`.claude/skills/prd-enhancer/SKILL.md`），对 Step parse-input 中识别出的所有 PRD 文件逐一增强，补充 `图N 页面要点` 并沉淀页面信息提炼结果。

> 当 config.repos 非空时，输入应当是 **正式需求文档的临时整理结果或 formalize 摘要**，不是蓝湖原始文本 dump，也不要求在 requirements 目录保留 formalized 文件。

## prd-enhancer 的增量检测特性（自动生效）

- 若同目录下已有 `status: 已增强` 的 PRD 文件且原始 PRD 未修改 → 直接使用现有版本，跳过重新增强
- 若 PRD 有更新 → 只重新处理变更章节

## 健康度预检

增强完成后，prd-enhancer 输出页面信息提炼摘要与健康度预检报告。

**如有 ❌ 错误级问题：** 向用户展示，询问是否继续（推荐先修复 PRD）。
**如仅有 ⚠️ 警告：** 记录在报告中，不阻断流程。

## 快捷链接刷新

增强成功后，刷新根目录固定快捷链接 `latest-prd-enhanced.md`：

```bash
node .claude/shared/scripts/refresh-latest-link.mjs "<实际enhanced.md路径>" latest-prd-enhanced.md
```

## 错误处理

- **图片读取失败率 > 50%**：暂停并提示用户，建议修改 PRD 中的图片引用后重试

---

## 步骤完成后

更新 `.qa-state.json`：
- `last_completed_step` → `"prd-enhancer"`
- 记录增强完成的文件列表

同时向 `execution_log` 数组追加：
```json
{"step": "prd-enhancer", "status": "completed", "at": "<ISO8601>", "duration_ms": null, "summary": "完成 PRD 增强与页面信息提炼，原始文件已移入 .trash/，健康度报告已输出"}
```
