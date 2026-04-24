# PRD 需求讨论规则

> 适用于 test-case-gen 工作流的 discuss 节点（参见 `.claude/skills/test-case-gen/workflow/03-discuss.md`）。硬约束，违反即阻断 commit。

## 主持权

- discuss 节点禁派 transform-agent / writer-agent 等承担"需求讨论"职责的 subagent
- 仅允许派 Explore subagent 执行只读源码考古或归档检索；Explore 返回的事实摘要由主 agent 整理后再向用户提问
- AskUserQuestion 由主 agent 直接发起；subagent 不得对用户发问

## 10 维度自检清单（完整清单见 `references/10-dimensions-checklist.md`）

- **全局层 4 维度**（quick 模式可跳过）：数据源 / 历史数据 / 测试范围 / PRD 合理性
- **功能层 6 维度**（快慢模式都必做）：字段定义 / 交互逻辑 / 导航路径 / 状态流转 / 权限控制 / 异常处理
- 每维度至少"过一遍"；即使"无疑问"也要在 plan.md §2 表中体现 0 条记录
- 模糊语扫描参照 `references/ambiguity-patterns.md` 10 模式 + few-shot

## 3 选项提问格式

每条 AskUserQuestion 固定为 3 选项：

1. **AI 推荐**（recommended_option，必填，描述具体值 + 依据）
2. **暂定 — 留给产品确认**（触发 `severity=pending_for_pm`，写入 plan.md §3 + §6 双链）
3. **Other**（AskUserQuestion 自动提供；用户输入自由文本）

- 禁用"最多 4 个候选项"的旧写法
- 自动默认项（`severity=defaultable_unknown`）不走 AskUserQuestion；直接 `append-clarify` with `default_policy`

## 5 项自审清单（complete 前必跑）

主 agent 在调 `discuss complete` 前，逐条自查：

1. **摘要四子节完整**：§1 的背景 / 痛点 / 目标 / 成功标准均已填（无"_TODO"占位）
2. **10 维度都过一遍**：§2 表全 10 行都有记录（可为 0 条）
3. **模糊语全扫**：PRD 原文 grep `references/ambiguity-patterns.md` 10 模式，命中全部转 clarification
4. **blocking 全答**：`kata-cli discuss validate --require-zero-blocking` 退出码 0
5. **pending 已入 §6**：所有 `severity=pending_for_pm` 的条目在 plan.md §6 有 Markdown checkbox 占位

自审失败 → 回 discuss 步骤 3.6 逐条补答；不得跳 complete。

## 沉淀知识

- 用户在讨论中提到的新术语 / 业务规则 / 踩坑必须经 `knowledge-keeper write` API 落地
- 严禁主 agent 直接写 `workspace/{project}/knowledge/` 下任何文件
- 沉淀完成后由 `discuss complete --knowledge-summary '<json>'` 同步写入 plan.md frontmatter 的 `knowledge_dropped`

## 源码引用许可

- 源码同步许可前移至 discuss 节点 3.2（原 transform 2.2）
- 用户同意后，主 agent 调 `kata-cli discuss set-repo-consent --content '<json>'` 写入 plan.md.repo_consent
- 切换仓库或讨论重置 → 强制 `discuss set-repo-consent --clear`

## plan.md 关键字段保护

- `plan_version` / `status` / `resume_anchor` / `*_count` / `handoff_mode` / `repo_consent` / `created_at` / `updated_at` 字段由 discuss CLI 维护，主 agent 与人工不得手工编辑
- §1 摘要 / §3 用户答案文本可由主 agent 在讨论中追加修订，但应优先通过 `append-clarify` API
- §2 自检表 / §4 自动默认 / §6 待定清单 / §7 下游 hints 由 CLI 自动渲染，手工修改会被下次写入覆盖

## 重启检测

- init 节点必须先调 `discuss read` 检查 plan 状态：
  - `不存在` 或 `status=obsolete` → 进入 discuss 节点 init 模式
  - `status=discussing` → 进入 discuss 节点恢复模式（从未答 Q\* / 未回填 pending 续问）
  - `status=ready` → 跳过 discuss 节点，直接进入 transform；transform / analyze / write 入口均已 enforce `discuss validate --require-zero-blocking --require-zero-pending`（见各节点 4.0 / 6.0 / 7.0）

## 交接模式

- `discuss complete` 必须带 `--handoff-mode current|new`：
  - `current`：主 agent 在当前会话继续进入 transform
  - `new`：输出交接 prompt，结束当前会话，由用户新开会话接力
- pending_count > 0 时，主 agent 在 AskUserQuestion 中应标红警告：Phase C 下游门禁已 enforce，带 pending 的 plan 进入 transform 会被 4.0 直接拦截

## clarify_envelope 协议已弃用

- transform-agent 不再产出 `<clarify_envelope>` XML 块
- 旧 `references/clarify-protocol.md` 仅供历史 PRD 兼容回退使用
- 所有澄清都通过 plan.md §3 持久化；Writer 阻断回射到 `discuss append-clarify`（见 `.claude/skills/test-case-gen/workflow/main.md` 共享协议段）
