# 节点 4: transform — 源码分析与 PRD 结构化

> 由 workflow/main.md 路由后加载。上游：节点 3 discuss；下游：节点 5 enhance。

**目标**：交叉分析蓝湖素材 + 源码 + 归档用例，产出结构化测试增强 PRD。

**⏳ Task**：将 `transform` 任务标记为 `in_progress`。

### 4.1 源码配置匹配

```bash
kata-cli repo-profile match --text "{{prd_title_or_path}}"
```

### 4.2 源码引用许可（交互点）

先向用户展示引用摘要（使用 AskUserQuestion）：

```
📋 源码配置确认

命中映射规则：{{profile_name}}（若未命中则显示"未匹配"）

仓库 1：
  ● {{path}} @ {{branch}}（映射表默认）
  ○ 自行输入仓库路径和分支

仓库 2：
  ● {{path}} @ {{branch}}
  ○ 自行输入

  ○ 添加更多仓库
  ○ 不使用源码参考

引用许可选项：

- 选项 1：允许同步并引用以上仓库（推荐）
- 选项 2：仅引用当前已有的本地副本，不额外同步
- 选项 3：调整仓库/分支
- 选项 4：不使用源码参考

> **注意**：这是"允许引用/同步"的确认，不等于允许写回配置。
```

若用户提供了新的映射关系，仅在需要持久化时再进行第二道写回确认。先展示写入摘要：

- profile 名称：`{{name}}`
- repos 预览：`{{repos_json}}`
- 写入位置：repo profile 配置

然后使用 AskUserQuestion 询问：

- 选项 1：仅本次使用，不保存（默认）
- 选项 2：保存为新的 profile / 更新现有 profile
- 选项 3：取消刚才的映射调整

只有在用户明确允许写回时，才执行：

```bash
kata-cli repo-profile save --name "{{name}}" --repos '{{repos_json}}'
```

### 4.3 拉取源码

若用户选择"允许同步并引用以上仓库"，执行：

```bash
kata-cli repo-sync sync-profile --name "{{profile_name}}"
```

若用户自行输入了仓库（非 profile）且允许同步，则逐个调用：

```bash
kata-cli repo-sync --url {{repo_url}} --branch {{branch}}
```

将返回的 commit SHA 写入 PRD frontmatter。

### 4.4 PRD 结构化转换（AI 任务）

派发 `transform-agent`（model: sonnet），task prompt 中**必须**包含 plan.md 路径（见节点 3 落盘的 `{{prd_slug}}.plan.md`）：

```
plan_path: workspace/{{project}}/prds/{{YYYYMM}}/{{prd_slug}}.plan.md
```

transform-agent 执行：

- 蓝湖素材解析
- 源码状态检测与分析（A/B 级）
- 历史用例检索
- **读取 plan.md** §3 已澄清项 / §4 自动默认项 / §6 hints
- 按 `references/prd-template.md` 模板填充（已澄清项标 🟢、自动默认项标 🟡）
- 不再输出 `<clarify_envelope>`（envelope 协议已 deprecated，详见 `references/clarify-protocol.md` 顶部说明）

### 4.5 更新状态

```bash
kata-cli progress task-update --project {{project}} --session "$SESSION_ID" --task transform --status done --payload '{{json}}'
```

数据结构：参见 `.claude/references/output-schemas.json` 中的 `state_transform_data`。

**✅ Task**：将 `transform` 任务标记为 `completed`（subject 更新为 `transform — 置信度 {{confidence}}，{{clarify_count}} 项待确认`）。
