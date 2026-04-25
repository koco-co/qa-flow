# case-format / reverse-sync — XMind ↔ Archive MD 反向同步工作流

> 由 SKILL.md 路由后加载。触发：用户在 XMind 软件中手动修改了用例，需要同步回 Archive MD。
> 触发词：同步 xmind / 同步 XMind 文件 / 反向同步。

---

## XMind 反向同步流程（XMind → Archive MD）

> 当用户在 XMind 软件中手动修改了用例后，需要将变更同步回 Archive MD 归档文件。
> 此流程**不走** 7 节点工作流，为独立的反向同步操作。

### 触发条件

用户输入包含触发词：同步 xmind、同步 XMind 文件、反向同步。
或指定了具体 XMind 文件路径（如 `同步 workspace/{{project}}/xmind/202604/数据质量.xmind`）。

### RS1: 确认 XMind 文件

若用户未指定 XMind 文件，使用 AskUserQuestion 工具询问：

- 问题：`请指定要同步的 XMind 文件路径，或输入关键词搜索`
- 选项 1：从最近生成的 XMind 中选择
- 选项 2：手动输入文件路径

若选择"从最近生成的 XMind 中选择"，列出 `workspace/{{project}}/xmind/` 下最近修改的文件供选择。

### RS2: 解析 XMind 文件

```bash
kata-cli history-convert --path {{xmind_file}} --project {{project}} --detect
```

展示解析结果，并使用 AskUserQuestion 确认：

- 问题：`已解析 {{xmind_file}}，共 {{count}} 条用例。确认同步到 Archive MD？`
- 选项 1：确认同步（推荐）— 覆盖对应的 Archive MD 文件
- 选项 2：预览变更 — 先生成到 tmp/ 目录，对比后再决定
- 选项 3：取消

### RS3: 定位对应 Archive MD

按以下优先级查找对应的 Archive MD 文件：

1. XMind 文件名匹配：`workspace/{{project}}/archive/{{YYYYMM}}/{{same_name}}.md`
2. 同月份目录下搜索 frontmatter 中 `suite_name` 匹配的文件
3. 未找到 → 使用 AskUserQuestion 询问用户指定目标路径或创建新文件

### RS4: 执行转换

```bash
kata-cli history-convert --path {{xmind_file}} --project {{project}}
```

转换完成后，将生成的 Archive MD 覆盖写入目标路径（或写入 tmp/ 供预览）。

### RS5: 完成摘要（状态展示，无需确认）

反向同步完成后，直接展示：

- Archive MD 已更新：`{{archive_path}}`
- 同步用例数：`{{count}}`
- 若用户继续提出查看或编辑诉求，再展示文件内容或路由 `case-format edit`
