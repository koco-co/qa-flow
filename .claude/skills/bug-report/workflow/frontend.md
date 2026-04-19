# bug-report · frontend 分析

> 由 SKILL.md 路由后加载。共享的输入校验、确认策略、契约定义在 SKILL.md 前段，本文件不重复。

---

## 源码引用许可与可选写回（双门策略）

> **⚠️ 强制规则：引用源码 / 执行 repo sync 与写回 `.env` / 分支映射是两道独立门禁，不得合并为一次确认。**

执行流程：

1. 根据报错信息中的模块路径（如 `webpack__require__`、bundle 文件名、动态导入路径），从 `config.repos` 推断最可能的前端仓库和分支
2. 通过 AskUserQuestion 工具先展示"引用/同步"摘要并等待许可：

   确认格式：`确认 [源码引用] 分析 → 目标: [repo_name @ branch] → 来源: [config.repos 推断]`

3. 仅当用户允许同步时，执行：

```bash
bun run .claude/scripts/repo-sync.ts --url {{repo_url}} --branch {{branch}}
```

4. 若用户提供了新的仓库 URL 或纠正了分支信息，先展示写回预览，再单独确认是否持久化：
   - `.env` 将追加的 `SOURCE_REPOS`：`{{repo_url}}`
   - 分支映射文件：`{{repo_name}} -> {{branch}}`

   AskUserQuestion 选项：
   - 仅本次分析使用，不写回（默认）
   - 允许写回 `.env` 与分支映射
   - 取消新增的仓库 / 分支修正

5. 若 config.repos 为空（无已配置仓库），改为询问用户是否需要提供源码路径；若用户拒绝，转为纯日志分析。

---

## 派发 frontend-bug-agent

派发 `frontend-bug-agent`（model: sonnet），输入：

- 前端报错信息（Console 错误、`TypeError`/`ReferenceError`/`ChunkLoadError`、React/Vue 运行时警告、白屏日志等）
- 源码上下文（可选，若 E1 同步成功；如有 sourcemap 优先解析）
- 环境信息（浏览器版本、构建工具版本等，缺失时标注"未提供"）

Agent 返回 `frontend_bug_json`：

```json
{
  "title": "...",
  "summary": "...",
  "classification": "environment|code|mixed|unknown",
  "root_cause": "...",
  "evidence": [],
  "fix_suggestions": [],
  "uncertainty": []
}
```

---

## 后续处理

返回的 JSON 移交给 `workflow/rendering.md` 进行 HTML 渲染与通知发送。
