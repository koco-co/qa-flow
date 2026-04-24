# PRD 需求讨论规则

> 适用于 test-case-gen 工作流的 discuss 节点（参见 `.claude/skills/test-case-gen/workflow/03-discuss.md`）。硬约束，违反即阻断 commit。

## 主持权

- discuss 节点禁派 writer-agent 等承担"需求讨论"职责的 subagent
- 派 `source-facts-agent` 执行只读源码扫描 + 图像语义化（3.2.5）；返回事实 / 摘要，由主 agent 整理后再向用户提问
- 仅允许派 Explore subagent 执行只读源码考古或归档检索（不做素材扫描）
- AskUserQuestion 由主 agent 直接发起；subagent 不得对用户发问

## 10 维度自检清单（完整清单见 `references/10-dimensions-checklist.md`）

- **全局层 4 维度**（quick 模式可跳过）：数据源 / 历史数据 / 测试范围 / PRD 合理性
- **功能层 6 维度**（快慢模式都必做）：字段定义 / 交互逻辑 / 导航路径 / 状态流转 / 权限控制 / 异常处理
- 每维度至少"过一遍"；即使"无疑问"也要在 3.6 扫描阶段显式表达 0 条记录
- 模糊语扫描参照 `references/ambiguity-patterns.md` 10 模式 + few-shot

## 3 选项提问格式

每条 AskUserQuestion 固定为 3 选项：

1. **推荐**（recommended_option，必填，描述具体值 + 依据）
2. **暂不回答 — 进入待确认清单**（保持 Q 状态为"待确认"，后续 compact 前产品回写）
3. **Other**（AskUserQuestion 自动提供；用户输入自由文本）

- 禁用"最多 4 个候选项"的旧写法
- 字段标签统一用"推荐"（非"AI 推荐"），状态值用"待确认"（非"待产品确认"）
- 自动默认项（`severity=defaultable_unknown`）不走 AskUserQuestion；直接 `add-pending` 后 `resolve --as-default`

## 6 项自审清单（complete 前必跑）

主 agent 在调 `discuss complete` 前，逐条自查：

1. **摘要四子节完整**：§1 的背景 / 痛点 / 目标 / 成功标准均已填（无"_TODO"占位）
2. **10 维度都过一遍**：每维度在 3.6 扫描阶段有记录（可为 0 条）
3. **模糊语全扫**：enhanced.md §2 正文 grep `references/ambiguity-patterns.md` 10 模式，命中全部转 `add-pending`
4. **锚点完整性**（Phase D2 新增）：`discuss validate` 6 项检查全过（正文脚注 ↔ §4 区块双链、稳定 id 格式、计数匹配）
5. **pending 全 resolve**：`discuss validate --require-zero-pending` 退出码 0，§4 无"待确认"状态 Q
6. **知识沉淀齐整**：本轮识别的术语/业务规则/踩坑均经 knowledge-keeper write 落地，已构造 `--knowledge-summary` JSON

自审失败 → 回 discuss 步骤 3.7 逐条补答；不得跳 complete。

## 沉淀知识

- 用户在讨论中提到的新术语 / 业务规则 / 踩坑必须经 `knowledge-keeper write` API 落地
- 严禁主 agent 直接写 `workspace/{project}/knowledge/` 下任何文件
- 沉淀完成后由 `discuss complete --knowledge-summary '<json>'` 同步写入 enhanced.md frontmatter 的 `knowledge_dropped`

## 源码引用许可

- 源码同步许可在 discuss 节点 3.2
- 用户同意后，主 agent 调 `kata-cli discuss set-repo-consent --content '<json>'` 写入 enhanced.md.source_consent
  - `set-repo-consent` 别名保留兼容；主路径名为 `set-source-consent`
- 切换仓库或讨论重置 → 强制 `--clear`，enhanced.md.source_reference 自动置 `none`

## enhanced.md 关键字段保护

- `schema_version` / `status` / `pending_count` / `resolved_count` / `defaulted_count` / `handoff_mode` / `reentry_from` / `source_consent` / `source_reference` / `q_counter` / `created_at` / `updated_at` / `migrated_from_plan` 字段由 discuss CLI 维护，主 agent 与人工不得手工编辑
- §1 摘要 / §2 功能细节 的正文可由主 agent 在讨论中通过 `discuss set-section --anchor s-... --content '...'` 修订；**禁止**直接 edit enhanced.md
- §4 待确认项 由 `add-pending` / `resolve` / `compact` 维护；手工编辑会被下次 CLI 写入覆盖
- Appendix A 由 source-facts-agent 通过 `set-source-facts` 写入；超 64KB 自动外溢 blob

## 重启检测

- init 节点必须先调 `discuss read` 检查 enhanced.md 状态：
  - `不存在` / `status=obsolete` → 进入节点 2 probe（创建新 enhanced.md）
  - `status=discussing` → 进入 discuss 节点恢复模式（从未 resolve 的 Q 续问）
  - `status=pending-review` → 进入 discuss 节点 "resolve 循环"（跳过 3.2-3.6）
  - `status=ready` → 跳过 discuss，进节点 4 analyze
  - `status=analyzing | writing` → 走对应节点的半冻结恢复分支
  - `status=completed` → 提示用户是否重跑

## 交接模式

- `discuss complete` 必须带 `--handoff-mode current|new`：
  - `current`：主 agent 在当前会话继续进入节点 4 analyze
  - `new`：输出交接 prompt，结束当前会话，由用户新开会话接力
- pending_count > 0 时（complete 前应为 0）CLI 会拒绝 complete；如确需保留待确认，采用 `暂不回答` 选项让 Q 保持"待确认"状态，complete 时 CLI 强制要求所有 Q 进入"已解决"或"默认采用"才放行

## 半冻结回射（analyze / write 触发新疑问）

- 下游节点发现新疑问 → 主 agent 调 `discuss add-pending`
- CLI 自动：status 回退 discussing + 记 reentry_from
- 回 discuss 3.7 续问 → 3.9 自审 → 3.10 complete
- CLI 按 reentry_from 恢复原 status，主 agent 增量重跑对应节点

## clarify_envelope 协议已完全弃用

- transform-agent / enhance-agent 已删除（Phase D2）
- `references/clarify-protocol.md` 仅供历史 PRD 兼容回退
- 所有澄清通过 enhanced.md §4 持久化
- Writer 阻断回射改用 `discuss add-pending`（见 `.claude/skills/test-case-gen/workflow/main.md` 共享协议段）
