# 节点 5: enhance — PRD 增强

> 由 workflow/main.md 路由后加载。上游：节点 4 transform；下游：节点 6 analyze。

**目标**：图片识别、frontmatter 规范化、页面要点提取、需求澄清。

**⏳ Task**：将 `enhance` 任务标记为 `in_progress`。

> fetch 阶段已从 Axure 资源中提取独立元素图片（高清）+ 整页截图（全貌参考），
> 无需再做图片压缩。images/ 目录中 `N-uXXX.png` 为独立元素，`N-fullpage-*.png` 为整页截图。

### 5.1 Frontmatter 规范化

```bash
kata-cli prd-frontmatter normalize --file {{prd_path}}
```

### 5.2 PRD 增强（AI 任务）

派发 `enhance-agent`（model: sonnet），对 PRD 执行：

- 图片语义化描述
- 页面要点提取
- 需求歧义标注
- 健康度预检

### 5.3 更新状态

```bash
kata-cli progress task-update --project {{project}} --session "$SESSION_ID" --task enhance --status done --payload '{{json}}'
```

**✅ Task**：将 `enhance` 任务标记为 `completed`（subject 更新为 `enhance — {{n}} 张图片，{{m}} 个要点`）。

### 交互点 B — 健康度摘要（默认直接继续）

默认行为：展示增强摘要后直接进入 analyze。

仅当 `health_warnings` 中出现 `blocking_unknown` / `invalid_input`，或用户明确要求停下来查看增强结果时，才使用 AskUserQuestion：

- 问题：`增强完成：识别 {{n}} 张图片，{{m}} 个页面要点。健康度告警：{{health_warnings}}。如何处理？`
- 选项 1：继续分析（推荐）
- 选项 2：补充 PRD 信息
- 选项 3：查看增强后的文件
