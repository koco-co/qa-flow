<!-- step-id: notify | delegate: testCaseOrchestrator -->
# Step notify：用户验证后同步（条件执行）

> 前置条件: `last_completed_step` == `"archive"`
> 快速模式: 执行
> DTStack 专属: 否

收到用户回复后，根据回复内容执行不同操作：

---

## 「确认通过」

1. 删除临时文件：`rm -rf <working_dir>/temp/`
2. 删除状态文件：`rm -f <working_dir>/.qa-state.json`
3. 向用户输出最终完成通知（见「完成通知」章节）

---

## 「已修改，请同步」

1. 调用 `json-to-archive-md.mjs --from-xmind <xmind-path> <archive-dir>` 重新生成归档 MD
2. 向用户展示变更概要（用例数变化等）
3. 删除临时文件和状态文件
4. 输出完成通知

---

## 「继续补改」

1. 保留 `.qa-state.json`
2. 不删除 `temp/`
3. 等待用户后续继续、重跑或补改指令

---

## 完成通知

输出生成摘要：

- XMind 路径、模式（新建/追加）、用例统计
- 归档 MD 路径
- 主验收快捷链接：`latest-output.xmind`
- 上游 PRD 快捷链接：`latest-prd-enhanced.md`
- Reviewer 质量评分
- 提示用户可执行后续操作

---

## 错误处理

- **temp/ 删除失败**：记录错误日志后继续，不阻断流程（XMind 与归档 MD 已生成可用）

---

## 终态说明

Step notify 为终态清理：写入 `last_completed_step: "notify"` 为可选；如实现需要，可在删除前瞬时写入该值；但流程正常完成后必须删除 `.qa-state.json`，不保留稳定的可恢复状态。

`「确认通过」` / `「已修改，请同步」` 这两个固定回复仅用于测试用例生成流程，不用于单独 PRD 增强、Bug 分析或冲突分析。

---

## 步骤完成后

Step notify 为终态；状态文件已在「确认通过」或「已修改，请同步」分支中删除，此条目仅作记录说明：

- `last_completed_step` → `"notify"`（瞬时写入，随即删除状态文件）

向 `execution_log` 追加（在删除文件前写入）：
```json
{"step": "notify", "status": "completed", "at": "<ISO8601>", "duration_ms": null, "summary": "流程结束，临时文件已清理"}
```
