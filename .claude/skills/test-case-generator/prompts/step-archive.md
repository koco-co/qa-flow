<!-- step-id: archive | delegate: testCaseOrchestrator -->
# Step archive：归档 MD 同步 + 用户验证提示

> 前置条件: `last_completed_step` == `"xmind"`
> 快速模式: 执行
## 9.1 生成归档 MD

调用 `json-to-archive-md.mjs` 将 Reviewer 输出的 final JSON 转换为 `cases/archive` 下的 Markdown 归档文件：

```bash
node .claude/skills/archive-converter/scripts/json-to-archive-md.mjs \
  <cases/prds/YYYYMM/temp/final-reviewed.json> \
  [output-dir]
```

输出路径自动推断（根据 meta.project_name 和 meta.version），也可手动指定。

目录路由规则：
- 归档目录统一为 `cases/archive/YYYYMM/`（YYYYMM 为产物生成年月）
- 文件名：如存在 `archive_file_name` / `requirement_title`，优先使用具体需求标题

## 9.1.5 重建归档索引

归档 MD 写入后，重建 `cases/archive/INDEX.json` 使后续查询保持最新：

```bash
node .claude/shared/scripts/build-archive-index.mjs
```

## 9.2 向用户发出验证提示

```
✅ XMind 文件已生成：<xmind-path>
📄 归档用例 MD 已同步：<archive-md-path>

请通过以下路径进行验收（路径已在终端输出）：
- 主验收：XMind 文件（路径见上方终端输出）
- 辅助回看：增强版 PRD 文件（仅用于核对上游 PRD 增强内容，不替代 XMind 验收）

检查完毕后，请直接回复：
- 「确认通过」— 保持当前 XMind / Archive，直接完成流程
- 「已修改，请同步」— 你已在 XMind 中人工修改，系统将重新读取 XMind 并更新归档 MD
- 「继续补改」— 保留断点，等待继续修改 / 重跑
```

## 错误处理

- **json-to-archive-md.mjs 失败**：展示错误并阻断 archive 成功态写入；保持流程停在 `xmind`，不得写入 `archive_md_path`、`awaiting_verification: true` 或 `last_completed_step: "archive"`

---

## 步骤完成后

仅当 archive 文件真实落盘后，才允许更新 `.qa-state.json`；也就是 archive 文件真实落盘后，才允许写入 `archive_md_path`：
- `archive_md_path` → 实际归档 MD 文件路径
- `awaiting_verification` → `true`
- `last_completed_step` → `"archive"`

断点续传时，如果读取到 `awaiting_verification: true`，只重新展示 9.2 的验证提示，不重新执行 9.1。

同时向 `execution_log` 数组追加：
```json
{"step": "archive", "status": "completed", "at": "<ISO8601>", "duration_ms": null, "summary": "生成归档 MD，路径: <archive-md-path>，等待用户验证"}
```
