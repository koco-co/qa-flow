<!-- step-id: notify | delegate: testCaseOrchestrator -->
# Step notify：用户验证后同步（条件执行）

> 前置条件: `last_completed_step` == `"archive"`
> 快速模式: 执行

收到用户回复后，根据回复内容执行不同操作：

---

## 「确认通过」

> ⚠️ **严格按以下顺序执行，每步必须实际运行，不可跳过**

1. **调用 IM 通知**（见「IM 通知」章节）— 必须先于清理和输出执行，确保通知不被遗漏
2. 删除临时文件：`rm -rf <working_dir>/temp/`
3. 删除状态文件：`rm -f <working_dir>/<state_file>`（`<state_file>` 为本次流程使用的状态文件名，单 PRD 为 `.qa-state-{prd-slug}.json`，批量为 `.qa-state.json`）
4. 向用户输出最终完成通知（见「完成通知」章节）

---

## 「已修改，请同步」

> ⚠️ **严格按以下顺序执行，每步必须实际运行，不可跳过**

1. 调用 `json-to-archive-md.mjs --from-xmind <xmind-path> <archive-dir>` 重新生成归档 MD
2. **调用 IM 通知**（见「IM 通知」章节）— 必须在输出完成消息前执行
3. 删除临时文件和状态文件
4. 向用户展示变更概要（用例数变化等）并输出完成通知

---

## 「继续补改」

1. 保留当前状态文件（`.qa-state-{prd-slug}.json` 或 `.qa-state.json`）
2. 不删除 `temp/`
3. 等待用户后续继续、重跑或补改指令

---

## 完成通知

输出生成摘要：

- XMind 路径、模式（新建/追加）、用例统计
- 归档 MD 路径
- XMind 文件绝对路径
- 增强版 PRD 文件路径
- Reviewer 质量评分
- 提示用户可执行后续操作

---

## IM 通知

在终端输出完成通知后，调用通知模块向已配置的 IM 渠道发送通知：

```bash
node .claude/shared/scripts/notify.mjs \
  --event case-generated \
  --data '{"count":<用例总数>,"file":"<xmind输出文件路径>","duration":"<耗时>"}'
```

参数说明：
- `count`：生成的用例总数（数字）
- `file`：XMind 输出文件的相对路径（真实文件路径，如 `cases/xmind/orders/v2.0/功能名.xmind`）
- `duration`：工作流总耗时（如 `3m21s`，可从 execution_log 首尾时间差计算）

> 💡 调试提示：添加 `--dry-run` 参数可打印完整 payload 而不发送网络请求。
> ⚠️ 若 notify.mjs 执行失败（如 .env 未配置），仅 console.error 记录，不阻断流程。流程的用例文件已经生成完毕。

---

## 错误处理

- **temp/ 删除失败**：记录错误日志后继续，不阻断流程（XMind 与归档 MD 已生成可用）

---

## 终态说明

Step notify 为终态清理：写入 `last_completed_step: "notify"` 为可选；如实现需要，可在删除前瞬时写入该值；但流程正常完成后必须删除当前 PRD 对应的状态文件（`.qa-state-{prd-slug}.json` 或 `.qa-state.json`），不保留稳定的可恢复状态。

`「确认通过」` / `「已修改，请同步」` 这两个固定回复仅用于测试用例生成流程，不用于单独 PRD 增强、Bug 分析或冲突分析。

---

## 步骤完成后

Step notify 为终态；状态文件已在「确认通过」或「已修改，请同步」分支中删除，此条目仅作记录说明：

- `last_completed_step` → `"notify"`（瞬时写入，随即删除状态文件）

向 `execution_log` 追加（在删除文件前写入）：
```json
{"step": "notify", "status": "completed", "at": "<ISO8601>", "duration_ms": null, "summary": "流程结束，临时文件已清理"}
```
