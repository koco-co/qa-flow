# 节点 1: init — 输入解析与环境准备

> 由 workflow/main.md 路由后加载。上游：用户输入；下游：节点 2 probe。

**目标**：解析用户输入、检查插件、检测断点、确认运行参数。

**⏳ Task**：使用 `TaskCreate` 创建 10 个主流程任务（见 workflow/main.md「任务可视化」章节），然后将 `init` 任务标记为 `in_progress`。

### 1.0 SESSION_ID 初始化

```bash
# Derive stable SESSION_ID from PRD filename + active env
PRD_SLUG=$(basename "{{prd_path}}" .md)
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

### 1.2 plan.md 状态检测（discuss 续跑路由）

```bash
kata-cli discuss read --project {{project}} --prd {{prd_path}} 2>/dev/null
```

按返回 `frontmatter.status` / `frontmatter.resume_anchor` 决定下游路由：

- 不存在 / status=obsolete → 进入节点 3 discuss（init 模式）
- status=discussing → 进入节点 3 discuss（恢复模式，从未答 Q\* 续问）
- status=ready → **跳过节点 3 discuss，直接进入节点 4 transform**（并把 plan_path 作为 task prompt 传给 transform-agent）

> 提示：`state.ts resume` 与 `discuss read` 互补 — 前者管"工作流上次跑到哪个节点"，后者管"需求讨论是否已落地"。两个独立判定后按各自结论行事。

### 1.4 插件检测（蓝湖 URL 等）

```bash
kata-cli plugin-loader check --input "{{user_input}}"
```

若匹配插件（如蓝湖 URL）→ 执行插件 fetch 命令获取 PRD 内容。

### 1.5 初始化状态

SESSION_ID 已在节点 1.0 完成初始化，此处无需额外操作。

### 交互点 A — 参数分歧处理（仅在输入存在歧义时使用 AskUserQuestion 工具）

默认行为：

- 用户已明确给出 `prd_path` 和 `mode` → 直接展示摘要并继续，不额外确认
- 仅当存在多个候选 PRD、需要切换模式、或用户明确要求改选输入时，才使用 AskUserQuestion

若需提问，展示以下选项：

- 问题：`已识别 PRD：{{prd_path}}，运行模式：{{mode}}。如何处理参数分歧？`
- 选项 1：继续使用当前识别结果（推荐）
- 选项 2：切换为快速模式
- 选项 3：指定其他 PRD 文件

完成分歧处理后，将 `init` 任务标记为 `completed`（subject 更新为 `init — 已识别 PRD，{{mode}} 模式`），按节点 1.2 的路由结论进入节点 3（discuss）或直接跳到节点 4（transform）。
