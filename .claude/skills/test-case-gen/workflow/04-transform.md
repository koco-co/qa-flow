# 节点 4: transform — 源码分析与 PRD 结构化

> 由 workflow/main.md 路由后加载。上游：节点 3 discuss；下游：节点 5 enhance。

**目标**：交叉分析蓝湖素材 + 源码 + 归档用例，产出结构化测试增强 PRD。

**⏳ Task**：将 `transform` 任务标记为 `in_progress`。

### 4.0 下游入口门禁（Phase C 新增）

进入本节点**前必须**执行 discuss 门禁：

```bash
kata-cli discuss validate \
  --project {{project}} --prd {{prd_path}} \
  --require-zero-blocking --require-zero-pending
```

退出码约定（由 `kata-cli discuss validate` Phase B 已实现）：

| 退出码 | 情况 | 处理 |
|---|---|---|
| 0 | plan §3 blocking_unanswered = 0 且 pending_count = 0 | 继续 4.1 |
| 1 | schema error | 检查 plan.md 是否被误改；回 discuss 节点 reset |
| 2 | blocking_unanswered > 0 | 回 discuss 节点 3.6 续问 |
| 3 | pending_count > 0 | 主 agent 在 AskUserQuestion 中引导产品在 plan.md §6 打勾回写，并调 `discuss append-clarify` 把 pending 转 blocking_unknown + user_answer；再跑 3.9 complete 后重入本节点 |

**禁止绕过门禁**：主 agent 不得以"用户已口头回答"等理由跳过 CLI 校验；违反硬约束即阻断当前会话并报警。

### 4.1 源码配置匹配

```bash
kata-cli repo-profile match --text "{{prd_title_or_path}}"
```

### 4.2 源码引用写回许可（交互点 — Phase C 降级）

> **⚠️ 同步许可已在节点 3.2 拿到**（写入 plan.md frontmatter.repo_consent）。本节点只负责"是否把这次的 profile 映射保存为新 profile"的二道确认。
> 若 plan.md.repo_consent 为空或被 `set-repo-consent --clear` 清掉，**不要**在本节点补问——应回到 discuss 节点 3.2 重新发起。

仅当用户本轮讨论中提出了**新的 profile 映射**（新增仓库、调整分支），展示写入摘要：

- profile 名称：`{{name}}`
- repos 预览：`{{repos_json}}`
- 写入位置：repo profile 配置

然后使用 AskUserQuestion 询问：

- 选项 1：仅本次使用，不保存（默认）
- 选项 2：保存为新的 profile / 更新现有 profile
- 选项 3：取消刚才的映射调整

只有选项 2 才执行：

```bash
kata-cli repo-profile save --name "{{name}}" --repos '{{repos_json}}'
```

若本轮未改过 profile 映射，本步骤**完全跳过**，直接进 4.3。

### 4.3 源码同步状态校验（幂等）

Phase C 起，真正的 `repo-sync` 已在节点 3.2.3 完成。本节点只做一次幂等校验：

```bash
kata-cli discuss read --project {{project}} --prd {{prd_path}} \
  | bun -e 'JSON.parse(require("fs").readFileSync(0,"utf8")).repo_consent?.repos?.forEach(r => console.log(r.path, r.sha ?? "(no-sync)"))'
```

若 `repo_consent` 为空（用户在 3.2 选了"不使用源码参考"）→ 跳过 4.4 的源码交叉分析分支。

若 `repo_consent.repos[].sha` 全部非空且 `.repos/` 目录存在 → 继续 4.4。

若 `sha` 存在但工作区已变更（`git rev-parse HEAD ≠ sha`）→ 提示用户但不阻断；让 transform-agent 在任务提示中记录"sha 漂移"标记。

### 4.4 PRD 结构化转换（AI 任务）

派发 `transform-agent`（model: sonnet），task prompt 中**必须**包含 plan.md 路径（见节点 3 落盘的 `{{prd_slug}}.plan.md`）：

```
plan_path: workspace/{{project}}/prds/{{YYYYMM}}/{{prd_slug}}.plan.md
plan_summary_section: §1  # 4 子节：背景 / 痛点 / 目标 / 成功标准
plan_pending_section: §6  # 产品待确认清单（此时应为空，作为健康标记）
source_consent_repos: {{repo_consent.repos_as_json}}  # 来自 plan.md frontmatter，可为 []
```

transform-agent 读取时：

- §1 4 子节直接粘贴到增强 PRD 的 "概述" 章节
- §6 若非空 → 打印警告（本不应发生，因 4.0 门禁已拦）
- source_consent_repos 作为源码分析的入口列表

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
