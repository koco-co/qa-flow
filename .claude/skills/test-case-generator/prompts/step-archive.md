<!-- step-id: archive | delegate: archiveConverter -->
# Step archive：归档 MD 同步 + 用户验证提示

## 9.1 生成归档 MD

调用 `json-to-archive-md.mjs` 将 Reviewer 输出的 final JSON 转换为 `cases/archive` 下的 Markdown 归档文件：

```bash
node .claude/scripts/json-to-archive-md.mjs \
  <cases/requirements/<requirements-root>/Story-20260322/temp/final-reviewed.json> \
  [output-dir]
```

输出路径自动推断（根据 meta.project_name 和 meta.version），也可手动指定。

DTStack 如识别到语义版本（如 `v6.4.10`），默认会落到 `cases/archive/<module>/v6.4.10/`；如存在 `archive_file_name` / `requirement_title`，文件名优先使用具体需求标题。

## 9.2 向用户发出验证提示

```
✅ XMind 文件已生成：<xmind-path>
📄 归档用例 MD 已同步：<archive-md-path>

请先从以下快捷入口验收：
- 主验收：latest-output.xmind
- 辅助回看：latest-prd-enhanced.md（仅用于核对上游 PRD 增强内容，不替代 XMind 验收）

检查完毕后，请直接回复：
- 「确认通过」— 保持当前 XMind / Archive，直接完成流程
- 「已修改，请同步」— 你已在 XMind 中人工修改，系统将重新读取 XMind 并更新归档 MD
- 「继续补改」— 保留断点，等待继续修改 / 重跑
```

## 步骤完成后

```bash
node .claude/scripts/harness-state-machine.mjs \
  --advance archive \
  --state-path <story-dir>/.qa-state.json
```

state-machine 的 `--advance archive` 会自动设置 `awaiting_verification: true`。
同时写入 `archive_md_path: "<path>"`（在 advance 前写入）。

断点续传时，如果读取到 `awaiting_verification: true`，只重新展示 9.2 的验证提示，不重新执行 9.1。
