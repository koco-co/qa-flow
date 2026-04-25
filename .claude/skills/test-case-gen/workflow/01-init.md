# 节点 1: init — 输入解析与环境准备

> 由 workflow/main.md 路由后加载。上游：用户输入；下游：节点 2 probe 或 节点 3 discuss。

**目标**：解析用户输入、检查插件、检测断点、确认运行参数、识别 enhanced.md 状态。

**⏳ Task**：使用 `TaskCreate` 创建 8 个主流程任务（见 workflow/main.md「任务可视化」章节），然后将 `init` 任务标记为 `in_progress`。

### 1.0 SESSION_ID 初始化

```bash
# Derive stable SESSION_ID from PRD slug + active env
PRD_SLUG="{{prd_slug or slugify(prd_path)}}"
SESSION_ID="test-case-gen/${PRD_SLUG}-${ACTIVE_ENV:-default}"

# Ensure session exists (create on first run, reuse on resume)
kata-cli progress session-read --project {{project}} --session "$SESSION_ID" 2>/dev/null \
  || kata-cli progress session-create --workflow test-case-gen --project {{project}} \
       --source-type prd --source-path "{{prd_path}}" --meta '{"mode":"{{mode}}"}' > /dev/null
```

### 1.1 断点续传检测

```bash
kata-cli progress session-resume --project {{project}} --session "$SESSION_ID" \
  && kata-cli progress session-read --project {{project}} --session "$SESSION_ID"
```

若返回有效状态 → 跳转到断点所在节点继续执行。

### 1.2 enhanced.md 状态检测（discuss 续跑路由）

```bash
kata-cli discuss read \
  --project {{project}} --yyyymm {{yyyymm}} --prd-slug {{prd_slug}} \
  2>/dev/null
```

按返回 `frontmatter.status` / `frontmatter.migrated_from_plan` / `frontmatter.reentry_from` 决定下游路由：

| 状态 | 下游 |
|---|---|
| `不存在` / `status=obsolete` | 进入节点 2 probe |
| `status=discussing` | 进入节点 3 discuss（恢复模式，3.7 从未 resolve 的 Q 续问） |
| `status=pending-review` | 进入节点 3 discuss（resolve 循环，跳过 3.2-3.6） |
| `status=ready` | 跳节点 4 analyze |
| `status=analyzing` | 进节点 4 analyze（半冻结恢复） |
| `status=writing` | 进节点 5 write（半冻结恢复） |
| `status=completed` | AskUserQuestion 问用户是否重跑（默认不重跑 → 退出） |
| `migrated_from_plan=true` | 进入节点 3 discuss；主 agent 从 3.2 补齐 source-facts + §2 |

> 提示：`progress session-resume` 与 `discuss read` 互补 — 前者管"工作流上次跑到哪个节点"，后者管"需求文档状态"。两者独立判定后按各自结论行事。

### 1.3 插件检测（蓝湖 URL 等）

```bash
kata-cli plugin-loader check --input "{{user_input}}"
```

若匹配插件（如蓝湖 URL）→ 执行插件 fetch 命令获取 PRD 内容；下游节点 2 probe 处理。

### 1.4 参数分歧处理（交互点 A — 仅在歧义时 AskUserQuestion）

默认行为：

- 用户已明确给出 `prd_path` / `prd_slug` 和 `mode` → 直接展示摘要并继续，不额外确认
- 仅当存在多个候选 PRD、需要切换模式、或用户明确要求改选输入时，才使用 AskUserQuestion

若需提问，展示以下选项：

- 问题：`已识别 PRD：{{prd_path or prd_slug}}，运行模式：{{mode}}。如何处理参数分歧？`
- 选项 1：继续使用当前识别结果（推荐）
- 选项 2：切换为快速模式
- 选项 3：指定其他 PRD 文件

完成分歧处理后，将 `init` 任务标记为 `completed`（subject 更新为 `init — 已识别 PRD，{{mode}} 模式，{{status_or_new}}`），按节点 1.2 的路由结论跳转。
