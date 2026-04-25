# 节点 8: output — 产物生成与通知

> 由 workflow/main.md 路由后加载。上游：节点 7 format-check；下游：（完成）。

**目标**：生成 XMind + Archive MD，发送通知，清理状态。

**⏳ Task**：将 `output` 任务标记为 `in_progress`。

> **产物路径规则**（严格遵守）：
>
> - XMind → `workspace/{{project}}/xmind/{{YYYYMM}}/{{需求名称}}.xmind`
> - Archive MD → `workspace/{{project}}/archive/{{YYYYMM}}/{{需求名称}}.md`
> - **中间 JSON** → `workspace/{{project}}/archive/{{YYYYMM}}/tmp/{{需求名称}}.json`（中间产物必须放在 `tmp/` 子目录）
> - 禁止输出到 `workspace/cases/` 目录（该目录不存在且不应被创建）
> - 禁止将中间 JSON 放在 `archive/YYYYMM/` 根目录下

### 8.1 生成 XMind

```bash
kata-cli xmind-gen --input {{final_json}} --project {{project}} --output workspace/{{project}}/xmind/{{YYYYMM}}/{{需求名称}}.xmind --mode create
```

### 8.2 生成 Archive MD

```bash
kata-cli archive-gen convert --input {{final_json}} --project {{project}} --output workspace/{{project}}/archive/{{YYYYMM}}/{{需求名称}}.md
```

### 8.3 发送通知

```bash
kata-cli plugin-loader notify --event case-generated --data '{{notify_data}}'
```

notify_data 必需字段：`count`、`file`、`duration`。

### 8.4 标记 enhanced.md 完成

```bash
kata-cli discuss set-status \
  --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}} \
  --status completed
```

### 8.5 清理状态

```bash
kata-cli progress session-delete --project {{project}} --session "$SESSION_ID"
```

**✅ Task**：将 `output` 任务标记为 `completed`（subject 更新为 `output — {{n}} 条用例，XMind + Archive MD 已生成 / enhanced.md status=completed`）。

### 交付摘要（状态展示，无需确认）

用例生成完成后，直接展示产物摘要：

- XMind：`{{xmind_path}}`
- Archive：`{{archive_path}}`
- 共 `{{n}}` 条用例（P0: `{{p0}}`, P1: `{{p1}}`, P2: `{{p2}}`）
- 若用户后续提出编辑或重跑诉求，再路由到 `xmind-editor` 或模块重跑流程
