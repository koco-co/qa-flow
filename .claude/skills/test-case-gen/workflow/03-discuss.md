# 节点 3: discuss — 主 agent 主持需求讨论（吸收 transform / enhance）

> 由 workflow/main.md 路由后加载。上游：节点 2 probe；下游：节点 4 analyze（非 Legacy，原 6）。
> 硬约束：`rules/prd-discussion.md`。引用资源：`references/10-dimensions-checklist.md` / `references/ambiguity-patterns.md` / `references/source-refs-schema.md` / `references/enhanced-doc-template.md` / `references/pending-item-schema.md` / `references/anchor-id-spec.md` / `references/discuss-protocol.md`。

**目标**：在 analyze 之前由主 agent 亲自主持需求讨论与素材扫描，产出完整 enhanced.md（含 §1 概述、§2 功能细节、§3 图像与页面要点、§4 已 resolve 待确认项、Appendix A 源码事实表）。

**⏳ Task**：将 `discuss` 任务标记为 `in_progress`。

> **⚠️ 主持原则**：
>
> - 本节点禁派 writer-agent 等承担需求讨论职责的 subagent
> - 允许派 `source-facts-agent` 做素材扫描（3.2.5）；允许派 Explore subagent 做只读源码考古或归档检索
> - AskUserQuestion 由主 agent 直接发起；subagent 不得对用户发问
> - 所有写入 enhanced.md 的动作必须经 `kata-cli discuss ...` CLI，禁止手改文档正文或 frontmatter
> - 半冻结状态下（status=analyzing / writing）只允许 `add-pending`；其它写入接口 CLI 会拒绝

---

## 3.1 enhanced.md 初始化或恢复

按节点 1.2 的检测结果：

- 全新讨论（probe 刚创建）→ 直接进 3.2（骨架已由 probe 2.5 创建）
- 恢复 `status=discussing` → `kata-cli discuss read --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}}` 拿到 §4 已 resolve + 未 resolve 清单 + pending_count
- 恢复 `status=pending-review` → 进 3.7 resolve 循环（跳过 3.2-3.6）
- `migrated_from_plan=true` → 从 3.2 开始补齐 source-facts + §2；§1 由 migrate-plan 迁入，跳过 3.3 若不空

> `status=ready` 已在节点 1.2 触发跳过，不会进入本节点。

## 3.2 源码引用许可

### 3.2.1 profile 匹配

```bash
kata-cli repo-profile match --text "{{prd_title_or_path}}"
```

返回 profile_name + repos 列表。

### 3.2.2 AskUserQuestion 许可确认

展示以下（3 选项严格对齐，措辞按规则）：

```
📋 源码引用许可（命中 profile：{{profile_name}}）

仓库预览：
  - {{path_1}} @ {{branch_1}}
  - {{path_2}} @ {{branch_2}}

选项：
  - 推荐：允许同步并引用以上仓库
  - 暂不回答 — 进入待确认清单：仅本次引用现有本地副本（下一次讨论时再决定同步）
  - Other：调整仓库 / 不使用源码参考 / 自行输入
```

### 3.2.3 落盘 + 可选同步

**允许同步** → 先执行：

```bash
kata-cli repo-sync sync-profile --name "{{profile_name}}"
```

取返回的 SHA。然后写入 enhanced.md：

```bash
kata-cli discuss set-repo-consent \
  --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}} \
  --content '{"repos":[{"path":"workspace/{{project}}/.repos/studio","branch":"master","sha":"{{sha_1}}"}],"granted_at":"{{iso_now}}"}'
```

**仅引用本地副本** → 不做同步；直接 set-repo-consent 但 sha 省略。

**拒绝 / 不使用源码** → `kata-cli discuss set-repo-consent --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}} --clear`。CLI 自动把 `frontmatter.source_reference` 置 `none`。

> **切换仓库 / 重启讨论** → 强制 `set-repo-consent --clear`，下一轮重新询问。

## 3.2.5 系统性素材扫描（合并原 transform + enhance 职责）

派 `source-facts-agent`（model: sonnet）一次性扫描前后端 + images：

```
prompt:
  project: {{project}}
  yyyymm: {{YYYYMM}}
  prd_slug: {{prd_slug}}
  strategy_id: {{strategy_id}}
```

agent 内部：

- 源码：按 PRD 章节关键词定位模块 → 字段清单 / 路由表 / 状态枚举 / 权限点 / API 签名 → 通过 `discuss set-source-facts` 写入 Appendix A
- images/：图像语义化描述 + 整页要点 → 通过 `discuss set-section --anchor s-3` 写入 §3
- 缓存键 `{repo_sha}-{prd_mtime}`；命中则跳过实际扫描

**分支**：

- `source_consent.repos` 为空 → 仅扫 images；Appendix A 留空骨架，`frontmatter.source_reference=none`
- 超时（> 5min/仓库）→ warning 不阻断，Appendix A 末尾追加"扫描受限说明"
- `strategy_id=S5` → source-facts 立即返回 blocked；主 agent 应回到节点 2.7 重新决策

subagent 返回控制台 JSON `{ images_scanned, fields_found, cache_hit, duration_ms, warnings }`；主 agent 不再 Read `Appendix A` 原文，直接进 3.3（enhanced.md 数据已落盘）。

## 3.3 需求摘要（enhanced.md §1 — 4 子节）

主 agent 综合 original.md + `workspace/{{project}}/knowledge/overview.md` + enhanced.md Appendix A（`discuss read` 自动 deref） 推导初稿，结构：

- **背景**：为什么要做这个需求（业务 / 历史 / 用户反馈）
- **痛点**：现状有什么问题
- **目标**：做完后达成什么（功能 / 性能 / 合规）
- **成功标准**：可衡量的验收指标

AskUserQuestion 逐子节确认或修正。确认后调 CLI 写入：

```bash
kata-cli discuss set-section \
  --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}} \
  --anchor s-1-1-{{uuid}} \
  --content "{{user-approved text}}"
```

（uuid 由 probe 2.5 init 时预分配；可通过 `discuss read` 获取）

`migrated_from_plan=true` 时 §1 已从旧 plan.md §1 摘要迁入，本步骤仅做 AskUserQuestion 复核。

## 3.4 功能细节初稿（enhanced.md §2）

主 agent 按 original.md 章节 + Appendix A 填充字段 / 交互 / 导航。模糊或无法确定处插入 `[^Q{placeholder}]` 脚注占位（具体 Q id 由后续 `add-pending` 返回）。

调 CLI 写入：

```bash
kata-cli discuss set-section --anchor s-2-1-{{uuid}} --content "..."
kata-cli discuss set-section --anchor s-2-2-{{uuid}} --content "..."
# 如需新增小节
kata-cli discuss add-section --parent s-2 --title "..."
```

quick 模式可跳过本节的 AskUserQuestion 交叉确认，直接进 3.5。

## 3.5 frontmatter 规范化

仅当 probe 2 未 normalize 时：

```bash
kata-cli prd-frontmatter normalize --file "$PRD_DIR/original.md"
```

enhanced.md frontmatter 由 CLI 全程维护，无需额外 normalize。

图像与页面要点已在 3.2.5 完成。

## 3.6 10 维度扫描 + 模糊语扫描

> quick 模式跳过全局层 4 维度（数据源 / 历史数据 / 测试范围 / PRD 合理性），直接进功能层 6 维度。

对每个维度逐一检测（完整清单见 `references/10-dimensions-checklist.md`）：

### 3.6.1 全局层 4 维度

- **数据源**：先读 `knowledge/overview.md` 项目默认；PRD 未提且与默认一致 → `defaultable_unknown`；冲突 → `blocking_unknown`
- **历史数据影响**：存量数据迁移 / 兼容策略
- **测试范围**：前端 / 后端 / 全链路；跨模块联动
- **PRD 合理性**：逻辑悖论（互斥状态同存）、常识性缺失

### 3.6.2 功能层 6 维度

按 PRD 每个功能点逐一检查：

- 字段定义 / 交互逻辑 / 导航路径 / 状态流转 / 权限控制 / 异常处理
- 结合 `references/ambiguity-patterns.md` 10 模式做模糊语扫描
- 以 Appendix A 为 ground truth；可派 Explore subagent 做源码考古（只读）

每检测到一条 → 立刻 `kata-cli discuss add-pending` 落 §4：

```bash
kata-cli discuss add-pending \
  --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}} \
  --location "§2.1 功能块 1 → 字段定义 → format" \
  --question "PDF 导出是否需要分页？" \
  --recommended "否（现有实现为单页长图）" \
  --expected "单页长图（≤ 10MB），超限降级为分页" \
  --context '{"source":"repo#ExportController.java:L45"}'
```

CLI 自动：分配 `q{++q_counter}` id、追加 §4 Q 区块、在正文指定锚点段落插入 `[^Q{n}]` 脚注。

## 3.7 逐条 resolve（AskUserQuestion 3 选项）

对每条"待确认"状态的 Q（`kata-cli discuss list-pending --format json` 拿列表）：

```
AskUserQuestion(
  question: "{{Q.question}}",
  options: [
    "推荐：{{Q.recommended}}（预期：{{Q.expected}}）",
    "暂不回答 — 进入待确认清单",
    "Other"（AskUserQuestion 自动提供）
  ]
)
```

用户答案 → 立刻调 CLI：

| 用户选择 | 调用 | 效果 |
|---|---|---|
| 推荐 | `discuss resolve --id q{n} --answer "{{Q.recommended}}"` | Q 区块套删除线，脚注替换为答案 |
| 暂不回答 | 不调 resolve | Q 保持"待确认"状态 |
| Other（自由文本） | `discuss resolve --id q{n} --answer "{{user_text}}"` | 同推荐，但 answer 为用户文本 |

`defaultable_unknown` 直接 `discuss resolve --id q{n} --as-default`，不向用户发问（Q 状态 → "默认采用"，仍套删除线）。

## 3.8 知识沉淀（knowledge-keeper write）

用户在讨论中提到的新术语 / 业务规则 / 踩坑 → 显式调：

```bash
kata-cli knowledge-keeper write \
  --project {{project}} --type term|module|pitfall \
  --content '{...}' --confidence high --confirmed
```

收集所有沉淀条目 → 待 3.10 一并传入 `complete --knowledge-summary`。

## 3.9 自审闭环（6 项清单）

主 agent 在 complete 之前，按 `rules/prd-discussion.md` 6 项自审清单逐条自查：

1. 摘要四子节完整（无 _TODO 占位）
2. 10 维度都过一遍（quick 模式仅功能层 6 维度）
3. 模糊语 10 模式全扫
4. 锚点完整性（validate 6 项）
5. pending 全 resolve（`--require-zero-pending`）
6. 知识沉淀齐整

调 CLI 自审：

```bash
kata-cli discuss validate \
  --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}} \
  --require-zero-pending
```

- 退出码 0 → 进入 3.10
- 退出码 2（pending > 0）→ 回 3.7 续 resolve
- 退出码 1（schema / 锚点异常）→ 检查是否被手改；必要时 `discuss reset`

## 3.10 complete + 交接模式弹窗

### 3.10.1 AskUserQuestion 选交接模式

```
讨论已完成：{{resolved_count}} 条已解决 / {{defaulted_count}} 条默认采用 / {{pending_count=0}} 条待确认。

如何继续？

- Current-Session-Driven（同会话继续分析）
- New-Session-Driven（输出交接 prompt，结束当前会话）
```

### 3.10.2 调 complete

```bash
kata-cli discuss complete \
  --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}} \
  --handoff-mode current|new \
  --knowledge-summary '[{"type":"term","name":"..."},...]'
```

- 成功 → status=ready / handoff_mode 落盘
- 退出 1（仍有未 resolve）→ 回 3.7

若 `frontmatter.source_reference=none`，CLI stdout 会输出降级 banner：

```
⚠️ 本次讨论未引用源码，待确认项的推荐值可能不够精准。
  下游 source_ref 将只指向 PRD 原文 / knowledge 锚点；
  analyze 阶段发现的新疑问会更多，请做好回射准备。
```

### 3.10.3 交接分支

**Current-Session-Driven** → 进入节点 4 analyze（主 agent 继续）

**New-Session-Driven** → 输出交接 prompt 并结束当前会话：

```
📋 Handoff to new session

项目：{{project}}
PRD slug：{{prd_slug}}
enhanced.md：workspace/{{project}}/prds/{{YYYYMM}}/{{prd_slug}}/enhanced.md
status：ready
下一步建议：
  1. 在新会话中：/test-case-gen {{prd_path or prd_slug}}
     主 agent 会自动从 status=ready 恢复，跳过 discuss，直接进节点 4 analyze
```

**✅ Task**：将 `discuss` 任务标记为 `completed`（subject 更新为 `discuss — {{resolved_count}} 条已解决 / {{defaulted_count}} 条默认 / Appendix A {{fields_found}} 字段`）。

## 3.11 strategy_id 传递（不变）

从本节点起，派发下游 subagent（analyze / writer）时，task prompt 必须包含：

```
strategy_id: {{resolution.strategy_id}}
```

（若 probe 节点返回空 resolution，默认 S1）

subagent 按 `.claude/references/strategy-templates.md` 对应 section 调整行为。

---

## 半冻结回射分支（analyze / write 触发 add-pending）

analyze / write 节点发现新疑问 / Writer `<blocked_envelope>` → 主 agent 调 `discuss add-pending`。CLI 内部：

1. 检测 `status ∈ {analyzing, writing}` → 写 `frontmatter.reentry_from = {current_status}`
2. `status` 回退到 `discussing`
3. §4 追加新 Q 区块 + 脚注

主 agent 重回本节点：

1. 跳 3.1-3.6，直接进 3.7 对新 Q AskUserQuestion
2. 3.8（本轮额外沉淀的知识）
3. 3.9 自审
4. 3.10 complete → CLI 按 `reentry_from` 把 status 切回 `analyzing` / `writing`
5. 主 agent 回到对应节点增量重跑：已产出的 test_points / cases 保留，仅对新 Q 相关的 source_ref 重算

---

## 异常分支

| 情况 | 处理 |
|---|---|
| `discuss read` 返回 schema 错误 | 检查 enhanced.md 是否被手改；`discuss reset` → 重新 init |
| `set-repo-consent` 失败（enhanced.md 不存在） | 回 probe 2.5 重新 init |
| 源码同步失败 | 提示用户；降级为"仅引用本地副本"走 3.2.3 分支 2 |
| validate 退出 2（pending > 0） | 回 3.7 |
| validate 退出 1（锚点/schema 异常） | 检查手改痕迹；必要时 `discuss reset` |
| 用户中途切换 PRD | 禁止当前 enhanced.md 复用；走 `discuss reset` + 节点 1/2 重跑 |
| source-facts-agent 超时 | warning 继续；必要时重跑 3.2.5 |
