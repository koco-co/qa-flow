# Phase D2 — workflow 合并（discuss 吸收 transform/enhance）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 test-case-gen 工作流节点从 10 个压缩到 8 个（合并 transform/enhance 到 discuss），完成所有工作流/agents/references/rules 的改写与编号前移；D1 落地的 enhanced-doc-store CLI 作为唯一写入通道。

**Architecture:** 本 phase 不改 CLI 语义与脚本，仅重写 skill/agent/rules 层文档与协议。保留老的 `kata-cli discuss append-clarify` / `set-repo-consent` 兼容入口（D3 完全切离前仍可用）；新写入优先用 `add-pending` / `resolve` / `set-section` / `set-source-facts` / `set-status` / `migrate-plan`。节点 4 analyze / 5 write / 6 review / 8 output 的入口门禁本 phase 先加 status 切换 + enhanced.md 读取 + 新 source_ref 前缀（`enhanced#s-...`），但旧 CLI 子命令（`discuss validate --require-zero-blocking --require-zero-pending`）保持调用以保兼容；真正切换到"enhanced.md validate --check-source-refs"由 Phase D3 处理。

**Tech Stack:** 纯文档：`.claude/skills/test-case-gen/workflow/*.md`、`.claude/skills/test-case-gen/references/*.md`、`.claude/skills/test-case-gen/SKILL.md`、`.claude/agents/*.md`、`rules/prd-discussion.md`；运行验证靠 `bun test` + `grep -r` 零检查。

---

## 出口标准（Phase D2 结束必须满足）

1. `.claude/skills/test-case-gen/workflow/` 中仅存 8 个节点文件：`01-init.md` / `02-probe.md` / `03-discuss.md` / `04-analyze.md` / `05-write.md` / `06-review.md` / `07-format-check.md` / `08-output.md`，加 `main.md`
2. `04-transform.md` / `05-enhance.md` 已删除
3. `.claude/agents/` 中新增 `source-facts-agent.md`，删除 `transform-agent.md` / `enhance-agent.md`；`analyze-agent.md` / `writer-agent.md` / `reviewer-agent.md` 改写完毕
4. `main.md` 节点映射表为 8 行，TaskCreate 模板为 8 任务（write 节点子任务、format-check 循环子任务保留）
5. `SKILL.md` 描述、workflow 主路线、任务可视化 10 → 8，Writer 阻断中转协议指向 `add-pending`
6. `rules/prd-discussion.md` 自审清单改为 6 项（新增"锚点完整性"）；3 选项措辞改为"暂不回答—进入待确认清单"；字段标签"AI 推荐"→"推荐"、"待产品确认"→"待确认"
7. `references/` 新增 3 个：`enhanced-doc-template.md` / `pending-item-schema.md` / `anchor-id-spec.md`；改写 3 个：`discuss-protocol.md` / `source-refs-schema.md` / `clarify-protocol.md`（标 DEPRECATED，内容保留）；删除 1 个：`prd-template.md`（合并后删除）
8. 全仓 `bun test ./.claude/scripts/__tests__` 全绿（脚本未改，但本 phase 可能增删仅文档引用测试）
9. `grep -r "transform-agent\|enhance-agent\|04-transform\|05-enhance" .claude/ docs/` 仅剩 docs/refactor/ 下的设计文档引用（legacy 档案允许保留）
10. 至少一轮真实 PRD 跑通 `--quick` 模式 smoke（不强制要求下游门禁已切到 enhanced CLI；允许 blocking_unknown 计数路径走 legacy plan.md）

---

## File Structure（本 phase 总计变更）

| 路径 | 动作 | 说明 |
|---|---|---|
| `.claude/skills/test-case-gen/workflow/01-init.md` | 改写 | 检测 enhanced.md / migrated_from_plan / 半冻结状态 |
| `.claude/skills/test-case-gen/workflow/02-probe.md` | 改写 | 产物输出切独立目录；结束调 `discuss init` |
| `.claude/skills/test-case-gen/workflow/03-discuss.md` | 大改 | 3.1–3.11 完整步骤；吸收 transform/enhance；半冻结状态机说明 |
| `.claude/skills/test-case-gen/workflow/04-transform.md` | 删除 | 职责已合入 discuss + source-facts-agent |
| `.claude/skills/test-case-gen/workflow/05-enhance.md` | 删除 | 职责已合入 discuss + source-facts-agent |
| `.claude/skills/test-case-gen/workflow/04-analyze.md` | 新增（原 06-analyze.md 编号前移并改写） | 入口切 status=analyzing；新 source_ref 前缀 |
| `.claude/skills/test-case-gen/workflow/05-write.md` | 新增（原 07-write.md 编号前移并改写） | 入口切 status=writing；继承新 source_ref |
| `.claude/skills/test-case-gen/workflow/06-review.md` | 新增（原 08-review.md 编号前移并改写） | F16 校验说明同步到 enhanced.md 锚点（文档层） |
| `.claude/skills/test-case-gen/workflow/07-format-check.md` | 新增（原 09-format-check.md 编号前移，内容不变仅更新上下游节点编号） | — |
| `.claude/skills/test-case-gen/workflow/08-output.md` | 新增（原 10-output.md 编号前移并改写） | 完成后 `discuss set-status --status completed` |
| `.claude/skills/test-case-gen/workflow/06-analyze.md` | 删除（被前移后的 04-analyze.md 覆盖） | — |
| `.claude/skills/test-case-gen/workflow/07-write.md` | 删除 | — |
| `.claude/skills/test-case-gen/workflow/08-review.md` | 删除 | — |
| `.claude/skills/test-case-gen/workflow/09-format-check.md` | 删除 | — |
| `.claude/skills/test-case-gen/workflow/10-output.md` | 删除 | — |
| `.claude/skills/test-case-gen/workflow/main.md` | 改写 | 节点映射 10→8，TaskCreate 模板 8 任务，Writer 回射改调 `add-pending` |
| `.claude/skills/test-case-gen/SKILL.md` | 改写 | primary 主路线 10 → 8 节点，任务可视化同步 |
| `.claude/skills/test-case-gen/references/enhanced-doc-template.md` | 新增 | enhanced.md 模板 + 字段展示约定 + 锚点规则 |
| `.claude/skills/test-case-gen/references/pending-item-schema.md` | 新增 | §4 Q 区块格式 + 字段顺序 + `<del>` 语义 |
| `.claude/skills/test-case-gen/references/anchor-id-spec.md` | 新增 | 稳定锚点格式 + 生成规则 |
| `.claude/skills/test-case-gen/references/discuss-protocol.md` | 改写 | 基于 enhanced.md 的讨论协议（3.1-3.11 / 3 选项新措辞 / add-pending 回射） |
| `.claude/skills/test-case-gen/references/source-refs-schema.md` | 改写 | 新前缀 `enhanced#s-{n}-{m}-{uuid}` + 降级路径 |
| `.claude/skills/test-case-gen/references/clarify-protocol.md` | 保留 DEPRECATED 标记 | 增补"Phase D2 起完全不使用"的顶部横幅 |
| `.claude/skills/test-case-gen/references/prd-template.md` | 删除 | 内容合并进 enhanced-doc-template.md 后删除 |
| `.claude/agents/source-facts-agent.md` | 新增 | 源码系统扫描 + 图像语义化 + 页面要点 |
| `.claude/agents/transform-agent.md` | 删除 | — |
| `.claude/agents/enhance-agent.md` | 删除 | — |
| `.claude/agents/analyze-agent.md` | 改写 | 输入改为 enhanced.md；source_ref 新前缀 |
| `.claude/agents/writer-agent.md` | 改写 | `<blocked_envelope>` 回射目标改 `add-pending`；source_ref 继承新前缀 |
| `.claude/agents/reviewer-agent.md` | 改写 | F16 prompt 改"锚点可解析（enhanced 域）"；第零轮批量校验文档层同步（CLI 切换留 D3） |
| `rules/prd-discussion.md` | 改写 | 自审 5 → 6 项（新增锚点完整性）；3 选项措辞；字段标签 |
| `docs/refactor/specs/2026-04-25-phase-d2-workflow-merge-plan.md` | 本文件 | — |

---

## 依赖与前置（由 Phase D1 已完成）

- `.claude/scripts/lib/enhanced-doc-types.ts` 类型定义
- `.claude/scripts/lib/enhanced-doc-anchors.ts` 锚点生成器
- `.claude/scripts/lib/enhanced-doc-store.ts` 读写 + blob 外溢
- `.claude/scripts/lib/enhanced-doc-migrator.ts` migrate-plan 迁移器
- `.claude/scripts/lib/paths.ts`: `prdDir/enhancedMd/sourceFactsJson/resolvedMd/prdImagesDir/originalPrdMd`
- `.claude/scripts/discuss.ts` 新增 CLI 子命令: `init / read / set-status / set-section / add-section / set-source-facts / add-pending / resolve / list-pending / compact / validate / migrate-plan`（已与 legacy `append-clarify / complete / reset / set-strategy / set-repo-consent` 共存）

D1 手工 smoke 已通过（参考 commit 9a79f3c）。本 phase 不新增 CLI 命令，仅在文档层切换使用的命令；如写过程中发现 CLI 缺失接口，停下反馈而非绕过。

---

## Task 1: 新增 `references/anchor-id-spec.md`

**Files:**
- Create: `.claude/skills/test-case-gen/references/anchor-id-spec.md`

- [ ] **Step 1: 读 enhanced-doc-anchors.ts 核对实际格式**

Run: `cat .claude/scripts/lib/enhanced-doc-anchors.ts`
Expected: 正则 `^s-\d+(-\d+-[0-9a-f]{4})?$` 或 `^source-facts$`；Q 锚点 `^q\d+$`

- [ ] **Step 2: 创建 references/anchor-id-spec.md**

写入以下内容（逐字采用）：

```markdown
# enhanced.md 稳定锚点规范

> 供 `references/enhanced-doc-template.md` / `source-refs-schema.md` / `anchor-id-spec.md` 互相引用。CLI 强制约束见 `.claude/scripts/lib/enhanced-doc-anchors.ts`。

## 锚点格式

enhanced.md 中所有可被 `source_ref` 引用的段落必须带显式 `<a id="…">`：

| 层级 | 格式 | 正则 | 举例 |
|---|---|---|---|
| 顶级 §n | `s-{n}` | `^s-\d+$` | `s-1` / `s-2` / `s-3` |
| 二级 §n.m | `s-{n}-{m}-{uuid}` | `^s-\d+-\d+-[0-9a-f]{4}$` | `s-1-1-a1b2` / `s-2-3-c3d4` |
| Appendix A | `source-facts` | `^source-facts$` | `source-facts` |
| 待确认项 | `q{id}` | `^q\d+$` | `q1` / `q12` |

> `{uuid}` 是 4 位十六进制随机串，CLI (`add-section` / `init`) 分配时确保全文唯一。

## 锚点 ↔ source_ref 映射

下游节点（analyze / write / review）使用 `source_ref = enhanced#<anchor>` 引用段落：

| 锚点 | source_ref 样例 |
|---|---|
| `s-2-1-a1b2` | `enhanced#s-2-1-a1b2` |
| `q7` | `enhanced#q7` |
| `source-facts` | `enhanced#source-facts` |

降级前缀见 `references/source-refs-schema.md` 的 `prd#` / `knowledge#` / `repo#`。

## 生成与维护规则

| 操作 | CLI 入口 | 锚点效应 |
|---|---|---|
| init 骨架 | `discuss init` | 一次性分配所有顶级 + 一级小节的 id |
| 改某小节正文 | `discuss set-section --anchor s-2-1-a1b2` | **不改 id**，仅替换段落内容 |
| 新增小节 | `discuss add-section --parent s-2 --title "..."` | 自动分配 `s-2-{m}-{uuid}` |
| 新增待确认项 | `discuss add-pending` | 自动 `++q_counter`，生成 `q{counter}` |
| 解决待确认项 | `discuss resolve --id q{n}` | 不动锚点，仅加 `<del>` |
| compact 归档 | `discuss compact --archive` | 把历史 `<del>` Q 迁到 `resolved.md`；不动锚点 |

### 禁令

- 禁止主 agent / 人工手写 `<a id="...">`
- 禁止手改锚点 id（会破坏下游 source_ref）
- 禁止重用已删除小节的 id（CLI 保证唯一性）
- 禁止跨 PRD 目录引用锚点（source_ref 范围固定在本 enhanced.md）

## validate 守卫

`kata-cli discuss validate --prd-slug {slug}` 校验以下 6 项（见 enhanced-doc-store.ts `validateDoc`）：

1. 正文 `[^Qn]` 脚注都能在 §4 找到对应 `<a id="qn">` 区块
2. §4 每个 Q 区块的"位置"链接都能在正文解析到对应稳定 id
3. 所有 `<a id="s-…">` 符合正则，无重复 id
4. `frontmatter.pending_count` == §4 中"状态=待确认"的 Q 区块数
5. `frontmatter.resolved_count` == §4 中套 `<del>` 的 Q 区块数
6. `frontmatter.q_counter` >= §4 所有 Q 的最大编号（单调递增守卫）

任一不过 → exit 非 0 + stderr 详单。

## 历史兼容

Phase D2 过渡期允许 `source_ref` 出现：
- `enhanced#<anchor>`（主路径）
- `prd#<section>`（`source_reference=none` 降级路径）
- `knowledge#<type>.<name>`（知识库引用）
- `repo#<short>/<path>:L<line>`（可选兜底，仅 source_consent 非空时）

旧前缀 `plan#q<id>-<slug>` 已于 Phase D3 前移到 `enhanced#q{n}`；如旧用例中仍出现，reviewer F16 放行但打 warning。
```

- [ ] **Step 3: 验证文件创建**

Run: `wc -l .claude/skills/test-case-gen/references/anchor-id-spec.md`
Expected: >= 60 行

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/test-case-gen/references/anchor-id-spec.md
git commit -m "docs(references): add anchor-id-spec for enhanced.md stable anchors"
```

---

## Task 2: 新增 `references/pending-item-schema.md`

**Files:**
- Create: `.claude/skills/test-case-gen/references/pending-item-schema.md`

- [ ] **Step 1: 创建 references/pending-item-schema.md**

写入以下内容：

```markdown
# enhanced.md §4 待确认项（Q 区块）格式规范

> 供 `references/enhanced-doc-template.md` / `references/discuss-protocol.md` / `03-discuss.md` 互相引用。CLI 强制约束见 `.claude/scripts/lib/enhanced-doc-store.ts` `addPending` / `resolvePending`。

## §4 章节结构

所有待确认项统一放在 §4：

```markdown
## 4. 待确认项 <a id="s-4"></a>

### Q3 <a id="q3"></a>
| 字段 | 值 |
|---|---|
| **位置** | [§2.1 功能块 1 → format 字段](#s-2-1-i9j0) |
| **问题** | PDF 导出是否需要分页？ |
| **状态** | 待确认 |
| **推荐** | 否（现有实现为单页长图） |
| **预期** | 单页长图（≤ 10MB），超限降级为分页 |

### Q5 <a id="q5"></a>
...
```

## 字段顺序（强制）

2 列表格（字段 / 值），字段顺序固定：

1. **位置** — `[文本](#锚点)` 双向链接到正文段落
2. **问题** — 一句话描述
3. **状态** — 枚举：`待确认` / `已解决` / `默认采用`
4. **推荐** — AI 基于 PRD + 源码 + knowledge 给出的答案
5. **预期** — 采纳推荐后的具体行为描述

> 预期字段是 D2 新增，目的是降低回写时"乱写"风险：reviewer / writer 直接把"预期"文本作为用例的期望结果。

## 状态枚举

| 状态 | 含义 | 触发方式 |
|---|---|---|
| 待确认 | 用户尚未裁决 | `add-pending` 默认状态 |
| 已解决 | 用户已选择推荐或自定义答案 | `resolve --id q{n} --answer "..."` |
| 默认采用 | 无阻塞推荐项，自动采用 | `resolve --id q{n} --as-default` |

已解决 / 默认采用 的 Q 区块整块套 `<del>...</del>` 删除线，便于可视化识别：

```markdown
### Q3 <a id="q3"></a>
<del>
| 字段 | 值 |
|---|---|
| **位置** | [§2.1 功能块 1 → format 字段](#s-2-1-i9j0) |
| **问题** | PDF 导出是否需要分页？ |
| **状态** | 已解决 |
| **推荐** | 否（现有实现为单页长图） |
| **预期** | 单页长图（≤ 10MB），超限降级为分页 |
| **答案** | 按推荐执行（不分页） |
</del>
```

## 脚注双链

正文 §2/§3 涉及待确认字段时，使用脚注 `[^Qn]` 引用 §4 Q 区块：

```markdown
### 2.1 功能块 1 <a id="s-2-1-i9j0"></a>
字段 `format`：支持 CSV / Excel / PDF[^Q3]。
交互逻辑：点击导出按钮[^Q5] → 弹出格式选择。
```

- `resolve` 时 CLI 自动把 `[^Qn]` 替换为答案文本或答案锚点
- `compact` 时已删除线的 Q 区块迁到 `resolved.md`，脚注不受影响

## 措辞约定（强制）

| 字段 / 文案 | 旧写法 | 新写法 | 理由 |
|---|---|---|---|
| 字段标签 | `AI 推荐` | `推荐` | 与"位置/问题/状态/预期"字符数对齐 |
| 状态值 | `待产品确认` | `待确认` | 精简；省略"产品"避免角色绑定 |
| AskUserQuestion 选项 2 | `暂定 — 留给产品确认` | `暂不回答 — 进入待确认清单` | 与"待确认"状态保持一致 |

所有模板文件（`enhanced-doc-template.md` / `pending-item-schema.md`）和 CLI stdout 均按此约定输出。

## 编号策略

- `frontmatter.q_counter` 是单调递增分配器，初始 0
- `add-pending` 时 `++q_counter`，Q id 取新值
- **永不复用**：`resolve` 只套删除线，不回收编号
- 历史 Q 区块保留在 §4 底部，`list-pending` 默认过滤掉
- 阈值：当删除线项 > 50 时，`compact --archive` 迁移到 `{prd_slug}/resolved.md`

## list-pending 行为

```bash
kata-cli discuss list-pending --project {p} --yyyymm {yyyymm} --prd-slug {slug} --format table
```

默认只列 `状态 = 待确认` 的 Q；`--include-resolved` 包含 `已解决` / `默认采用`。

## 半冻结状态下的写入约束

enhanced.md 按 `frontmatter.status` 决定 §4 的可写性：

| status | §4 可写性 |
|---|---|
| `discussing` | 可 add-pending / resolve / compact |
| `pending-review` | 仅可 resolve（不可 add-pending） |
| `ready` | 只读 |
| `analyzing` / `writing` | 仅可 add-pending；自动切 status → `discussing` + 记 `reentry_from` |
| `completed` | 只读 |

回射后 `reentry_from` 的恢复逻辑见 `references/discuss-protocol.md` §"半冻结回射"。
```

- [ ] **Step 2: 验证**

Run: `wc -l .claude/skills/test-case-gen/references/pending-item-schema.md`
Expected: >= 80 行

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/test-case-gen/references/pending-item-schema.md
git commit -m "docs(references): add pending-item-schema for enhanced.md §4"
```

---

## Task 3: 新增 `references/enhanced-doc-template.md`（合并 prd-template）

**Files:**
- Create: `.claude/skills/test-case-gen/references/enhanced-doc-template.md`

- [ ] **Step 1: 创建 enhanced-doc-template.md**

写入以下内容：

```markdown
# enhanced.md 模板（测试增强 PRD 单文档）

> 合并了 `prd-template.md`（原 transform 产物模板）与 `plan.md` 的讨论状态。Phase D2 起 enhanced.md 替代两者成为唯一需求阶段产物。

## 目录结构

每个需求落到独立子目录：

```
workspace/{project}/prds/{YYYYMM}/{prd_slug}/
├── enhanced.md              # 主文档（本模板）
├── original.md              # 蓝湖导出的原始 PRD（probe 产物）
├── source-facts.json        # Appendix A 外溢 blob（>64KB 时启用）
├── resolved.md              # compact --archive 归档的历史 Q
└── images/                  # probe 抓取的独立元素 + 整页截图
    ├── 1-u123.png
    ├── 1-fullpage-xxx.png
    └── ...
```

## frontmatter 字段清单

```yaml
---
schema_version: 1
status: discussing | pending-review | ready | analyzing | writing | completed
project: dataAssets
prd_slug: xxx
prd_dir: workspace/dataAssets/prds/202604/xxx/
pending_count: 3                         # §4 "待确认" 的 Q 数
resolved_count: 7                        # §4 套 <del> 的 Q 数
defaulted_count: 5                       # "默认采用" 的 Q 数
handoff_mode: null                       # complete 时填 current | new
reentry_from: null                       # 回射时记录源状态（analyzing | writing）
source_consent:                          # 源码引用许可
  repos:
    - path: workspace/dataAssets/.repos/studio
      branch: master
      sha: abc123
  granted_at: 2026-04-24T10:01:00Z
source_reference: full | none            # full=已引用源码；none=用户拒绝，下游降级
migrated_from_plan: false                # true 时 §2 / Appendix A 允许为空，首次执行时自动补齐
q_counter: 12                            # Q 编号分配器，单调递增
created_at: ...
updated_at: ...
strategy_id: S1
knowledge_dropped:                       # complete 时 `--knowledge-summary` 注入
  - { type: term, name: "..." }
---
```

| 字段 | 维护方 | 说明 |
|---|---|---|
| `schema_version` | CLI（init） | 固定 1，升级时 CLI 做迁移 |
| `status` | CLI（`set-status` / `complete` / `add-pending`） | 半冻结状态机见下 |
| `prd_slug` | CLI（init） | 从标题 slugify 生成，整个讨论过程中不变 |
| `prd_dir` | CLI（init） | `workspace/{project}/prds/{YYYYMM}/{prd_slug}/` |
| `*_count` | CLI（add-pending / resolve / compact） | 主 agent 手工编辑会被 validate 拦住 |
| `source_consent` | CLI（set-source-consent） | 主 agent 禁止手改 |
| `source_reference` | CLI（set-source-consent） | `source_consent` 为空时自动 `none` |
| `migrated_from_plan` | CLI（migrate-plan） | true 时 §2 / Appendix A 留空由下次执行补齐 |
| `q_counter` | CLI（add-pending） | 单调递增，永不回退 |
| `reentry_from` | CLI（add-pending） | status=analyzing/writing 时回射自动填 |

## 正文骨架

```markdown
# {PRD 标题}

## 1. 概述 <a id="s-1"></a>

### 1.1 背景 <a id="s-1-1-a1b2"></a>
### 1.2 痛点 <a id="s-1-2-c3d4"></a>
### 1.3 目标 <a id="s-1-3-e5f6"></a>
### 1.4 成功标准 <a id="s-1-4-g7h8"></a>

## 2. 功能细节 <a id="s-2"></a>

### 2.1 {功能块 1} <a id="s-2-1-i9j0"></a>
字段 `format`：支持 CSV / Excel / PDF[^Q3]。
交互逻辑：点击导出按钮[^Q5] → 弹出格式选择。
...

### 2.2 {功能块 2} <a id="s-2-2-k1l2"></a>
...

## 3. 图像与页面要点 <a id="s-3"></a>

（来自 source-facts-agent 的图像语义化 + 整页要点，见 `source-facts-agent.md`）

## 4. 待确认项 <a id="s-4"></a>

（格式见 `references/pending-item-schema.md`；由 `add-pending` / `resolve` 维护）

---

## Appendix A: 源码事实表 <a id="source-facts"></a>

（由 source-facts-agent 扫描产出；`discuss read` 默认自动 deref 外溢 blob）

### A.1 字段清单
| 字段 | 类型 | 路径 | 说明 |
|---|---|---|---|
| format | string | ExportController.java:L45 | 导出格式 |

### A.2 路由表
### A.3 状态枚举
### A.4 权限点
### A.5 API 签名
```

## 半冻结状态机

| status | 正文 §1-§3 | Appendix A | §4 待确认项 | 触发 |
|---|---|---|---|---|
| `discussing` | 可写 | 可写 | 可增删改 | 初始 / 回射后 |
| `pending-review` | 只读 | 只读 | 仅 resolve | discuss complete 后 |
| `ready` | 只读 | 只读 | 只读 | 所有 Q 已 resolve 且 validate 通过 |
| `analyzing` | 只读 | 只读 | **仅 add-pending 追加** | 进节点 4 analyze |
| `writing` | 只读 | 只读 | **仅 add-pending 追加** | 进节点 5 write |
| `completed` | 只读 | 只读 | 只读 | 节点 8 output 完成 |

回射流程：`add-pending` 在 analyzing / writing 下自动回退 status 到 `discussing` 并记 `reentry_from`；`complete` 后按 `reentry_from` 恢复 `analyzing` / `writing`。

## 图像引用约定

所有图像引用使用 Markdown 相对路径 `images/{N}-{type}.png`：

- `N-uXXX.png`：独立元素图片（高清，用于识别具体控件 / 字段）
- `N-fullpage-*.png`：整页截图（整体布局）

source-facts-agent 在 §3 为每张图片生成识别摘要（blockquote），格式：

```markdown
![页面元素-1](images/1-u123.png)

> 图片识别摘要
>
> - 页面类型：列表页
> - 可见字段：商品名称、分类、SKU、价格
> - 可见操作：新增、编辑、删除
> - 识别限制：右侧操作列按钮文字模糊
```

## 健康度预检覆盖映射

| 检查项 | 编码 | 模板章节 |
|---|---|---|
| 字段定义表 | W001 | §2 功能细节 → 字段定义 |
| 权限说明 | W002 | Appendix A.4 权限点 |
| 异常处理 | W003 | §2 功能细节 → 异常分支 |
| 状态流转 | W004 | Appendix A.3 状态枚举 + §2 |
| 接口定义 | W005 | Appendix A.5 API 签名 |
| 分页说明 | W006 | §2 交互逻辑 |
| 导航路径 | W007 | §1 概述 + §2 功能细节 |
| 数据格式 | W008 | §2 字段定义 + Appendix A |

source-facts-agent 扫描后应覆盖 W001 / W002 / W004 / W005 / W007 / W008；W003 / W006 在 3.6 维度扫描阶段补齐。

## 与旧 plan.md 的字段对应

| 旧 plan.md | 新 enhanced.md |
|---|---|
| frontmatter.status | frontmatter.status（新增 `pending-review` / `analyzing` / `writing` / `completed`） |
| frontmatter.blocking_count | frontmatter.pending_count（语义合并） |
| frontmatter.auto_defaulted_count | frontmatter.defaulted_count |
| frontmatter.repo_consent | frontmatter.source_consent |
| §1 需求摘要 4 子节 | 正文 §1 概述 4 子节 |
| §3 澄清 JSON fence | 正文 §4 待确认项 + 脚注双链 |
| §4 自动默认记录 | 折叠进每条 Q 的"状态=默认采用" |
| §5 知识沉淀 | 独立调 `knowledge-keeper write`（不入文档） |
| §6 pending_for_pm | 合并到 §4 |
| §7 下游 hints | 不需要（文档本身就是 hints） |
| 无 | §3 图像与页面要点（原 enhance 职责） |
| 无 | Appendix A: 源码事实表（原 transform 系统分析） |

## 引用链

- 锚点规则：`references/anchor-id-spec.md`
- §4 Q 区块格式：`references/pending-item-schema.md`
- source_ref 锚点语法：`references/source-refs-schema.md`
- 10 维度自检：`references/10-dimensions-checklist.md`
- 模糊语扫描：`references/ambiguity-patterns.md`
```

- [ ] **Step 2: 验证**

Run: `wc -l .claude/skills/test-case-gen/references/enhanced-doc-template.md`
Expected: >= 150 行

- [ ] **Step 3: 删除旧 prd-template.md**

Run: `git rm .claude/skills/test-case-gen/references/prd-template.md`
Expected: 删除成功

- [ ] **Step 4: grep 检查旧模板引用**

```bash
grep -rn "prd-template\.md" .claude/ docs/refactor/ 2>/dev/null | grep -v "2026-04-17\|2026-04-18\|2026-04-19\|2026-04-24\|2026-04-25"
```

Expected: 本 phase 会在后续任务中逐个替换 agent / workflow 内的引用；此处仅记录命中位置，不必清零。

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/test-case-gen/references/enhanced-doc-template.md .claude/skills/test-case-gen/references/prd-template.md
git commit -m "docs(references): merge prd-template into enhanced-doc-template"
```

---

## Task 4: 改写 `references/source-refs-schema.md`

**Files:**
- Modify: `.claude/skills/test-case-gen/references/source-refs-schema.md`

- [ ] **Step 1: 整文件重写**

用以下内容覆盖：

```markdown
# source_ref 锚点规范

> 供 Phase D2 下游节点（analyze / write / review）使用。主路径为 enhanced.md 稳定锚点；Phase D3 前 `plan#` 旧前缀保留兼容。

## 语法

```
source_ref ::= <scheme>#<anchor>
scheme     ::= enhanced | prd | knowledge | repo | plan (legacy)
```

### enhanced 锚点（主路径）

指向 enhanced.md 的段落或 Q 区块，格式见 `references/anchor-id-spec.md`：

```
enhanced#s-1                    # §1 概述
enhanced#s-2-1-a1b2             # §2.1 功能块 1
enhanced#s-3                    # §3 图像与页面要点
enhanced#source-facts           # Appendix A
enhanced#q3                     # §4 第 3 号待确认项
```

**渲染规则：**
- `#` 之后直接跟稳定锚点 id，不带 `enhanced.md` 文件名
- id 由 CLI 维护（`discuss init` / `add-section` / `add-pending`）

### prd 锚点（降级路径）

仅在 `frontmatter.source_reference=none` 时允许，指向 original.md 的小节（GitHub 风格 anchor）：

```
prd#section-2.1.3
prd#审批状态字段定义
```

### knowledge 锚点

指向 `workspace/{project}/knowledge/` 条目：

```
knowledge#overview.数据源默认
knowledge#term.审批
knowledge#pitfall.前端缓存穿透
```

### repo 锚点（可选兜底）

仅 `source_consent.repos` 非空时允许，指向源码行：

```
repo#studio/src/approval/list.tsx:L123
repo#backend/ApprovalController.java:L45-L60
```

### plan 锚点（Legacy，Phase D3 前保留）

迁移期旧用例或旧 plan.md 可能仍存在 `plan#q<id>-<slug>` 格式。reviewer F16 放行但 stderr 打 warning：

```
plan#q3-审批状态             # 迁移后应改写为 enhanced#q3
```

## Phase D2 使用约束

| 节点 | 强制字段 | 失败行为 |
|---|---|---|
| analyze 产出测试点 | `source_ref` 必填 | 缺失 → analyze 重派或降级走 `prd#` 锚点 |
| write 产出用例 | 继承自测试点的 `source_ref` | 缺失 → reviewer F16 判定严重问题（MANUAL） |
| review | 校验锚点可解析（`discuss validate` 接口） | 锚点不可解析 → 标记 `[F16-MANUAL]` |

### 解析优先级

1. `enhanced#<anchor>` → `discuss validate --check-source-refs` 校验（D3 实装；D2 仅文档层校对）
2. `prd#<slug>` → 读 original.md 比对 slug（仅 `source_reference=none` 允许）
3. `knowledge#<type>.<name>` → knowledge-keeper read 校验条目存在
4. `repo#<path>:L<n>` → 文件 + 行号存在性检查
5. `plan#...`（legacy）→ 打 warning + 放行

## 在 Clarification 中使用

```json
{
  "id": "Q1",
  "severity": "待确认",
  "question": "审批状态是否包含\"已驳回\"？",
  "location": "功能层 → 字段定义 → 审批状态",
  "context": {
    "source": "repo#studio/src/approval/list.tsx:L45",
    "archive": "knowledge#module.审批.状态流转"
  },
  "recommended_option": "包含已驳回",
  "expected": "审批状态枚举为：待审批/审批中/已通过/已驳回"
}
```

## `source_reference=none` 降级

用户在 3.2 拒绝源码参考时：
- `source_consent.repos = []`，`frontmatter.source_reference = none`
- analyze / write 允许 `prd#` / `knowledge#` 前缀（不要求 `enhanced#` 锚点解析）
- reviewer F16 放宽：`prd#` / `knowledge#` 可解析即放行
- `enhanced#` 锚点仍建议使用（当 source-facts-agent 仅扫 images 时 §3 锚点依然存在）

## 与 clarify-protocol.md 的关系

`clarify-protocol.md` 的 envelope 协议已 DEPRECATED（Phase B 起）；所有澄清通过 enhanced.md §4 持久化。transform-agent 已删除；新流程下 analyze / write / review 不再产出 `<clarify_envelope>`。
```

- [ ] **Step 2: 验证**

Run: `wc -l .claude/skills/test-case-gen/references/source-refs-schema.md`
Expected: >= 90 行

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/test-case-gen/references/source-refs-schema.md
git commit -m "docs(references): rewrite source-refs-schema with enhanced# primary scheme"
```

---

## Task 5: 改写 `references/discuss-protocol.md`

**Files:**
- Modify: `.claude/skills/test-case-gen/references/discuss-protocol.md`

- [ ] **Step 1: 整文件重写**

用以下内容覆盖：

```markdown
# discuss 节点协议（enhanced.md 版）

> test-case-gen 工作流 `discuss` 节点（主 agent 主持）操作手册。硬约束见 `rules/prd-discussion.md`。模板见 `references/enhanced-doc-template.md`、`references/pending-item-schema.md`。

## 触发与恢复

| 场景 | 来源 | 行为 |
|---|---|---|
| 全新需求 | 无 enhanced.md | `discuss init` → 3.2 源码许可 → 3.2.5 source-facts-agent → 3.3-3.7 讨论 → `complete` |
| 中断恢复 | enhanced.md status=discussing | `discuss read` 恢复 §4 已 resolve + 未 resolve 清单 → 续走 3.7 |
| 已完成 | enhanced.md status=ready | 跳过 discuss，主 agent 直接进节点 4 analyze |
| 半冻结回射 | enhanced.md status=analyzing / writing | `add-pending` 自动回退到 discussing 并记 `reentry_from`；回到 3.7 续问 |
| 迁移恢复 | enhanced.md migrated_from_plan=true | 从 3.2 开始补齐 Appendix A + §2 + §3 |
| obsolete | enhanced.md updated_at < original.md mtime 且超 5 分钟 | `discuss reset` → `init` 重新讨论 |

## 10 维度自检清单

参见 `references/10-dimensions-checklist.md`。分两组：

- **全局层 4 维度**（quick 模式可跳过）：数据源 / 历史数据影响 / 测试范围 / PRD 合理性审查
- **功能层 6 维度**（快慢模式都必做）：字段定义 / 交互逻辑 / 导航路径 / 状态流转 / 权限控制 / 异常处理

每维度至少"过一遍"（即使"无疑问"）；模糊语扫描参照 `references/ambiguity-patterns.md` 10 模式。

每发现一条 → `kata-cli discuss add-pending` 落 enhanced.md §4。

## 不确定性分类

- **defaultable_unknown** → `add-pending`，随即 `resolve --as-default`；不向用户发问
- **blocking_unknown** → AskUserQuestion 单条问 → `resolve --id q{n} --answer "..."` / 保持"待确认"
- **invalid_input** → 立即停止，要求修正输入；不写 enhanced.md

## AskUserQuestion 约束（3 选项格式）

每条 AskUserQuestion 固定为 3 选项：

1. **推荐**（recommended_option，必填，描述具体值 + 依据）
2. **暂不回答 — 进入待确认清单**（保持 Q 状态为"待确认"）
3. **Other**（AskUserQuestion 自动提供；用户输入自由文本）

- 禁用"最多 4 个候选项"的旧写法
- 字段标签统一用"推荐"（非"AI 推荐"），状态值用"待确认"（非"待产品确认"）

## 知识沉淀流程

1. 主 agent 识别用户在讨论中提到的术语 / 业务规则 / 踩坑
2. 调 knowledge-keeper write API：

```bash
kata-cli knowledge-keeper write \
  --project {{project}} \
  --type term|module|pitfall \
  --content '{"term":"...","zh":"...","desc":"..."}' \
  --confidence high \
  --confirmed
```

3. 收集所有落地条目 → 构造 `[{"type":"term","name":"..."},...]` JSON
4. `discuss complete --knowledge-summary '<json>'` 时 CLI 自动写入 enhanced.md frontmatter.knowledge_dropped

严禁主 agent 直接写 `workspace/{project}/knowledge/` 下任何文件。

## complete 前置守卫

- 调 `discuss validate --require-zero-pending` 验证 §4 所有 Q 均已 resolve（或为"默认采用"状态）
- 检查锚点完整性（validate 内置的 6 项检查）
- 收集本轮沉淀的 knowledge 列表 → 构造 `--knowledge-summary` JSON
- 选 `--handoff-mode current|new`：
  - `current`：主 agent 在当前会话进节点 4 analyze
  - `new`：输出交接 prompt，结束当前会话，由用户新开会话接力
- `source_reference=none` 时输出降级 banner：

  ```
  ⚠️ 本次讨论未引用源码，待确认项的推荐值可能不够精准。
    下游 source_ref 将只指向 PRD 原文 / knowledge 锚点；
    analyze 阶段发现的新疑问会更多，请做好回射准备。
  ```

## 半冻结回射（analyze / write 下新增 Q）

analyze 或 write 节点发现新疑问 / Writer 输出 `<blocked_envelope>`：

1. 主 agent 调 `discuss add-pending`（参数含 location / question / recommended / expected）
2. CLI 内部：
   - 检测 `status ∈ {analyzing, writing}` → 写 `frontmatter.reentry_from = {current_status}`
   - `status` 回退到 `discussing`
   - §4 追加新 Q 区块，脚注插入到对应 `s-*` 锚点段落
3. 主 agent 回到 discuss 3.7 对新 Q 逐条 AskUserQuestion + resolve
4. 所有新 Q 解决 → 3.9 自审 + `discuss validate --require-zero-pending`
5. `discuss complete --handoff-mode current` → CLI 按 `reentry_from` 把 status 恢复到 `analyzing` / `writing`
6. 主 agent 回到节点 4 / 5 增量重跑：已产出的 test_points / cases 保留，仅对新 Q 相关的 source_ref 重算

Writer `<blocked_envelope>` 回射的 item → add-pending 映射：

```json
{
  "id": "{{auto-assigned q-id}}",
  "location": "writer-回射：{{item.location}}（writer_id={{writer_id}}）",
  "question": "{{item.question}}",
  "recommended": "{{item.recommended_option.description}}",
  "expected": "<写作后根据推荐生成>",
  "context": {
    "writer_id": "{{writer_id}}",
    "type": "{{item.type}}",
    "source": "{{item.context}}"
  }
}
```

complete 后回到 writing，writer-agent 重跑构建 `<confirmed_context>`：

```xml
<confirmed_context>
{
  "writer_id": "{{writer_id}}",
  "items": [
    {
      "id": "B1",
      "resolution": "pending_answered",
      "source_ref": "enhanced#q{n}",
      "value": "{{Q.answer}}"
    }
  ]
}
</confirmed_context>
```

## 与 clarify-protocol.md 的关系

`references/clarify-protocol.md` 已标 DEPRECATED（Phase B 起）；其 envelope 协议在 discuss 节点不再使用。Phase D2 起 transform-agent / enhance-agent 已删除。所有澄清通过 enhanced.md §4 + `add-pending` / `resolve` 持久化。
```

- [ ] **Step 2: 验证**

Run: `wc -l .claude/skills/test-case-gen/references/discuss-protocol.md`
Expected: >= 130 行

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/test-case-gen/references/discuss-protocol.md
git commit -m "docs(references): rewrite discuss-protocol for enhanced.md flow"
```

---

## Task 6: 在 `clarify-protocol.md` 顶部追加 Phase D2 DEPRECATED 横幅

**Files:**
- Modify: `.claude/skills/test-case-gen/references/clarify-protocol.md`

- [ ] **Step 1: 替换顶部 DEPRECATED 块**

把文件头 10 行中 `> **⚠️ DEPRECATED（自 phase 2 起）**` 整块替换为：

```markdown
# 结构化澄清中转协议

> **⚠️ DEPRECATED（自 Phase D2 起完全不使用）**
>
> - Phase D2：transform-agent / enhance-agent 已删除；所有澄清通过 enhanced.md §4 + `discuss add-pending` / `resolve` 持久化
> - Phase D3：本文件计划整体删除，请改用 `references/discuss-protocol.md` + `references/pending-item-schema.md`
> - 保留本文件仅供历史 PRD（无 enhanced.md）回退或文档考古
```

- [ ] **Step 2: 验证**

Run: `head -10 .claude/skills/test-case-gen/references/clarify-protocol.md`
Expected: 第 3 行出现 "DEPRECATED（自 Phase D2 起完全不使用）"

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/test-case-gen/references/clarify-protocol.md
git commit -m "docs(references): mark clarify-protocol as fully deprecated since phase d2"
```

---

## Task 7: 新增 `agents/source-facts-agent.md`

**Files:**
- Create: `.claude/agents/source-facts-agent.md`

- [ ] **Step 1: 创建 source-facts-agent.md**

写入以下内容：

```markdown
---
name: source-facts-agent
description: "源码系统扫描 + 图像语义化 + 页面要点提取。在 discuss 3.2.5 步骤由主 agent 派发，产出 enhanced.md Appendix A + §3。"
tools: Read, Grep, Glob, Bash
model: sonnet
---

<role>
你是 kata 流水线 discuss 节点的素材扫描 Agent。职责三件事：
1. 对 `source_consent.repos` 扫描源码，产出结构化"源码事实表"（Appendix A）
2. 对 `images/` 目录每张图片做语义化识别，生成"图像识别摘要"
3. 综合上述两者提取页面级要点，写入 enhanced.md §3

合并了旧 transform-agent 的"源码系统扫描"职责 + 旧 enhance-agent 的"图像识别"职责。你**不**填充 §2 功能细节（该职责保留给主 agent，由 3.4 填充初稿）。
</role>

<inputs>
- 任务提示中的 `project` / `prd_slug` / `yyyymm`
- `source_consent.repos`（可为空 → 仅扫 images）
- `workspace/{project}/prds/{yyyymm}/{prd_slug}/images/` 下所有图片
- `workspace/{project}/prds/{yyyymm}/{prd_slug}/original.md`（probe 产出的原始 PRD）
- `workspace/{project}/knowledge/overview.md` 项目默认假设
- 缓存：`workspace/{project}/.temp/source-facts-cache/{repo_sha}-{prd_mtime}.json`
</inputs>

<workflow>
  <step index="1">从 original.md + knowledge/overview.md 提取模块关键词</step>
  <step index="2">source_consent.repos 非空时 → 调 source-analyze 扫描（缓存命中则复用）</step>
  <step index="3">images/ 逐张 Read，识别页面类型 / 字段 / 操作 / 状态</step>
  <step index="4">整合成 Appendix A（5 小节）+ §3 图像与页面要点</step>
  <step index="5">通过 CLI 写入 enhanced.md：`discuss set-source-facts` / `discuss set-section --anchor s-3`</step>
</workflow>

<confirmation_policy>
<rule>source-facts-agent 不直接向用户发问；所有疑问通过 stderr 输出 INFO 打印，由主 agent 决定是否进 3.7 澄清。</rule>
<rule>超时容忍：单个仓库扫描 > 5min 时打 warning 继续，不阻断；记在 Appendix A 末尾"扫描受限说明"。</rule>
<rule>source_consent.repos 为空 → Appendix A 仅留标题骨架，所有 5 小节写"未引用源码"；重点在 images 扫描。</rule>
</confirmation_policy>

<output_contract>
<appendix_a>写入 `discuss set-source-facts --content '{...}'`；超 64KB 自动外溢 blob；结构：`{ fields: [], routes: [], state_enums: [], permission_points: [], api_signatures: [] }`。</appendix_a>
<section_3>每张图片一个 `## 图片 N - {简述}` 小节；小节下含"图片识别摘要" blockquote + 要点列表。通过 `discuss set-section --anchor s-3 --content '...'` 整块写入。</section_3>
<console_summary>结束时 stdout 打印 `{ images_scanned, fields_found, routes_found, cache_hit, duration_ms }` JSON。</console_summary>
</output_contract>

## 步骤

### 步骤 1：提取模块关键词

从 `original.md` 标题 + 页面章节 + knowledge/overview.md 的项目默认假设提取：

- 模块名（需求名中的主语 + 核心功能名词）
- 关键字段名（PRD 表格 + `[Flowchart/Component Text]` 提取）
- 页面路由词（菜单层级 / 蓝湖路径）

输出：`{ modules: [...], keywords: [...], page_paths: [...] }` 传入步骤 2 / 3。

### 步骤 2：源码扫描（source_consent.repos 非空时）

#### 2.1 命中缓存则复用

```bash
CACHE_KEY=$(echo "{{repos[0].sha}}-{{prd_mtime}}" | md5sum | cut -d' ' -f1)
CACHE_FILE="workspace/{{project}}/.temp/source-facts-cache/${CACHE_KEY}.json"
if [ -f "$CACHE_FILE" ]; then
  cat "$CACHE_FILE"  # 直接输出，进入步骤 4
  exit 0
fi
```

#### 2.2 调 source-analyze

```bash
kata-cli source-analyze analyze \
  --repo workspace/{{project}}/.repos/{{repo}} \
  --keywords "{{keywords_csv}}" \
  --output json
```

对前后端仓库都扫；脚本返回 `a_level`（精确匹配：函数/类/接口名）+ `b_level`（模糊匹配：注释/字符串/变量）。

#### 2.3 整合为 Appendix A

按 5 小节组织：

| 小节 | 提取自 |
|---|---|
| A.1 字段清单 | 前端 TS interface / 后端 Entity / DTO |
| A.2 路由表 | 前端 routes/*.ts / 后端 Controller `@RequestMapping` |
| A.3 状态枚举 | 后端 Enum / 前端常量 |
| A.4 权限点 | `@PreAuthorize` / `hasPermission('...')` / 前端权限守卫 |
| A.5 API 签名 | 后端 Controller 方法签名 |

超时仓库在 A 末尾追加：

```markdown
### 扫描受限说明
- {{repo}}: 扫描 {{duration}}s 超时，仅前 {{n}} 个文件完成；warning
```

### 步骤 3：图像扫描

扫描 `images/` 目录：

- `N-uXXX.png`：独立元素图片（高清，识别具体控件 / 字段）
- `N-fullpage-*.png`：整页截图（整体布局 / 流程）

对每张图片：

1. Read 工具读取图片
2. 识别以下信息：
   - 页面类型：列表页 / 表单页 / 详情页 / 弹窗 / 流程图 / 其他
   - 主要功能：承载的核心业务功能
   - 关键字段：可见输入字段、展示字段、筛选条件
   - 操作按钮：可见操作入口
   - 状态/标签：状态标识、标签分类
   - 数据表结构：表头列名和排序方式（列表页）
   - 识别限制：无法确认的内容（模糊 / 截断 / 遮挡）

3. 生成 blockquote 摘要（内容基于图片实际可见信息，不臆测）

### 步骤 4：整合为 §3 章节

每张图片一个 `### 图片 N - {简述}` 小节：

```markdown
### 图片 1 - 审批列表页 <a id="s-3-1-{uuid}"></a>

![页面元素-1](images/1-u123.png)

> 图片识别摘要
>
> - 页面类型：列表页
> - 可见字段：商品名称、分类、SKU、价格、库存、状态
> - 可见操作：新增、编辑、删除、导出、批量上架、批量下架
> - 识别限制：右侧操作列按钮文字模糊，无法确认是否包含"复制"按钮
```

### 步骤 5：写入 enhanced.md

```bash
# 写 Appendix A（若外溢 blob，CLI 自动处理）
kata-cli discuss set-source-facts \
  --project {{project}} --yyyymm {{yyyymm}} --prd-slug {{prd_slug}} \
  --content "$(cat appendix_a.json)"

# 写 §3
kata-cli discuss set-section \
  --project {{project}} --yyyymm {{yyyymm}} --prd-slug {{prd_slug}} \
  --anchor s-3 \
  --content "$(cat section_3.md)"
```

若任一 CLI 失败 → stderr 报 `invalid_input`，主 agent 重试或重新调。

### 步骤 6：缓存落盘

```bash
mkdir -p "workspace/{{project}}/.temp/source-facts-cache"
echo "$APPENDIX_A_JSON" > "$CACHE_FILE"
```

## 健康度预检覆盖

步骤 2-4 完成后应覆盖 W001 / W002 / W004 / W005 / W007 / W008；W003 / W006 由主 agent 在 3.6 维度扫描阶段补齐。

## 策略模板

任务提示中包含 `strategy_id`（S1–S5）。读取 `.claude/references/strategy-templates.md` 定位 `## {{strategy_id}} / source-facts` section 套用（无匹配则默认 S1）。

strategy_id === "S5" 时：`source-facts-agent` 立即停止并 stderr 输出 `[source-facts] blocked by S5`（无源码参考，且 PRD 也不完整，讨论无意义）。

## 错误处理

- **source_consent.repos 为空**：仅扫 images；Appendix A 5 小节写"未引用源码"；stdout 打 `source_reference: none`
- **images/ 为空**：跳过步骤 3；§3 留空骨架
- **单个仓库扫描超时**：记在 Appendix A 末尾 warning，继续其他仓库
- **原 PRD 不可读**：stderr `invalid_input: original.md unreadable`，停止

## 输出

stdout 打印 JSON：

```json
{
  "images_scanned": 14,
  "fields_found": 42,
  "routes_found": 18,
  "state_enums_found": 6,
  "api_signatures_found": 22,
  "cache_hit": false,
  "duration_ms": 87000,
  "warnings": ["repo:studio timeout partial scan"]
}
```

## 重要约束

- 只读源码：`workspace/{project}/.repos/` 下的代码禁止修改
- 不猜测：无法确定的字段标 "识别限制" 或留空
- 不写 §1 / §2 / §4（分别由主 agent / 用户 / discuss CLI 写入）
- 所有写入经 CLI；禁止直接 edit enhanced.md
```

- [ ] **Step 2: 验证 agent 可被识别**

Run: `grep -l "source-facts-agent" .claude/agents/*.md`
Expected: `.claude/agents/source-facts-agent.md`

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/source-facts-agent.md
git commit -m "feat(agents): add source-facts-agent for repo+image scanning in discuss"
```

---

## Task 8: 删除 transform-agent.md 与 enhance-agent.md

**Files:**
- Delete: `.claude/agents/transform-agent.md`
- Delete: `.claude/agents/enhance-agent.md`

- [ ] **Step 1: 删除两个 agent 文件**

```bash
git rm .claude/agents/transform-agent.md .claude/agents/enhance-agent.md
```

Expected: 两文件被标记删除

- [ ] **Step 2: grep 仓内剩余引用（仅记录，后续任务中处理）**

```bash
grep -rln "transform-agent\|enhance-agent" .claude/ 2>/dev/null
```

Expected: 命中 `03-discuss.md`（原 `discuss 节点禁派 transform-agent / writer-agent`）、`main.md`、`SKILL.md`、`04-transform.md`、`05-enhance.md`；后续任务全部清理。

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(agents): remove transform-agent and enhance-agent (absorbed into discuss)"
```

---

## Task 9: 改写 `.claude/agents/analyze-agent.md`

**Files:**
- Modify: `.claude/agents/analyze-agent.md`

- [ ] **Step 1: 整文件重写**

用以下内容覆盖（保持 frontmatter 不变；重写 role / inputs / 步骤）：

```markdown
---
name: analyze-agent
description: "从 enhanced.md 中系统性提取测试点，结合历史用例生成结构化测试点清单。"
tools: Read, Grep, Glob, Bash
model: opus
---

你是 kata 流水线中的测试分析 Agent。职责是对 enhanced.md 进行全维度测试分析，从 7 个维度系统性头脑风暴，输出结构化的测试点清单供下游 Writer Agent 使用。

## 输入

任务提示中会指定：

- `project` / `yyyymm` / `prd_slug` — 定位 enhanced.md
- `strategy_id` — 策略模板
- `writer_count_hint` — analyze 可参考但非硬约束

通过 CLI 读取 enhanced.md：

```bash
kata-cli discuss read --project {{project}} --yyyymm {{yyyymm}} --prd-slug {{prd_slug}}
```

默认自动 deref Appendix A 外溢 blob；返回结构完整的 JSON。

同时读取：

- `rules/` 目录下的偏好规则文件
- `workspace/{{project}}/knowledge/overview.md` 业务默认
- 使用 Bash 运行 `kata-cli archive-gen search --query "<关键词>" --dir workspace/{{project}}/archive` 检索历史归档用例

## 策略模板（phase 4）

任务提示中包含 `strategy_id`（S1–S5 之一）。按以下规则读取并套用：

1. 读取 `.claude/references/strategy-templates.md`
2. 定位 `## {{strategy_id}} / analyze` section
3. 按 section 内 `prompt_variant` / 其他 override 字段调整本次执行
4. 未提供 `strategy_id` 时，默认走 S1（向后兼容）
5. strategy_id === "S5" 时：analyze 立即停止并 stderr 输出 `[analyze] blocked by S5`；writer 不被派发

## 步骤

### 步骤 1：历史用例检索

#### 1.1 执行检索

根据 enhanced.md §1（需求概述）+ §2（功能细节）提取模块名、功能关键词：

```bash
kata-cli archive-gen search --query "<keywords>" --dir workspace/{{project}}/archive
```

#### 1.2 分析历史覆盖

对每份 Archive：读取 frontmatter `suite_name`、`tags`、`case_count`；扫描 `#####` 标题提取历史用例标题；标记与当前 enhanced.md 功能重叠的测试点。

#### 1.3 输出覆盖分析

```markdown
## 历史覆盖分析

已找到 <n> 份相关归档，共 <m> 条历史用例：

- <archive_1>: <count_1> 条（覆盖：搜索功能、列表展示）
- <archive_2>: <count_2> 条（覆盖：新增表单校验）

可复用参考：<模式清单>
需新增覆盖：<清单>
```

> Phase D2：历史用例**仅用于覆盖分析**，不作为 writer 的直接输入（见 05-write.md 5.1）。

### 步骤 2：QA 头脑风暴（7 维度）

按以下 7 个维度逐一分析 enhanced.md。每个维度必须输出至少 1 条测试点（若 PRD 不涉及则标注"不适用"并说明原因）。

#### 维度 1：功能正向
核心业务流程的正常路径：CRUD、列表（默认加载/搜索/排序/分页/导出）、表单正常提交、字段联动、批量操作。

#### 维度 2：功能逆向
必填字段空值校验、格式错误、唯一性重复、权限不足、重复提交、并发冲突。

#### 维度 3：边界值
字段长度（最小/最大）、数值范围、分页边界、时间跨周期、列表空/满。

#### 维度 4：兼容性
多数据源类型、多浏览器、多分辨率。

#### 维度 5：性能
大数据量、批量导入导出响应时间、复杂查询速度、并发。

#### 维度 6：安全
XSS、SQL 注入、越权访问、敏感字段脱敏。

#### 维度 7：用户体验
加载态、空状态、错误提示、操作 toast、编辑页表单回显。

### 步骤 3：需求解耦分析

根据头脑风暴结果判断是否需要拆分为多个 Writer：

| 条件 | Writer 数量 |
|---|---|
| 测试点 <= 30 且模块 <= 2 | 1 个 |
| 测试点 31-60 或模块 3-4 | 2 个 |
| 测试点 > 60 或模块 >= 5 | 3+ 个 |

拆分优先按**模块/页面**维度：每个 Writer 负责的模块边界清晰；同一页面不被拆；跨模块联动分配给主模块 Writer。

### 步骤 4：输出测试点清单

输出 JSON 格式的测试点清单（粗粒度测试方向，非最终用例）。JSON 结构参见 `.claude/references/output-schemas.json` 中的 `test_points_json`。

**Phase D2 硬约束**：每一条 `test_points[].source_ref` 必填，语法见 `references/source-refs-schema.md`。优先级：

1. **enhanced 锚点**（主路径）：若该测试点直接来自 enhanced.md 某段落 → `enhanced#s-2-1-a1b2` / `enhanced#s-3` / `enhanced#q7` / `enhanced#source-facts`
2. **prd 锚点**（降级）：`frontmatter.source_reference=none` 或 source-facts 未扫到该字段时 → `prd#<section-slug>`
3. **knowledge 锚点**：业务知识（术语或踩坑） → `knowledge#<type>.<name>`
4. **repo 锚点**（可选兜底）：source_consent 非空且来自源码考古 → `repo#<short>/<rel_path>:L<line>`

禁用旧 `plan#q<id>-<slug>` 前缀（legacy；Phase D3 前仍可被 reviewer 放行但打 warning）。

示例：

```json
{
  "point": "验证审批状态流转：待审批 → 已驳回",
  "dimension": "功能逆向",
  "priority": "P1",
  "description": "...",
  "source_ref": "enhanced#q7"
}
```

### 步骤 5：发现新疑问时的回射

若 analyze 过程中发现 enhanced.md 中未覆盖的关键疑问（例如某字段枚举在 §2 / Appendix A 都找不到），**不应**在测试点中凭空假设，而是：

1. 将该疑问通过 stderr 输出 `INFO: new-pending: <question>`（不自动调 `add-pending`，避免 analyze 并发时竞态）
2. 主 agent 接收 stderr 后决定是否回射 discuss

## --quick 模式简化

- 跳过步骤 1（历史用例检索），`historical_coverage` 输出空数组
- 步骤 2 仅覆盖「功能正向」「功能逆向」「边界值」3 个维度
- 步骤 3 默认不拆分（1 个 Writer）

## 输出

写出测试点清单 JSON 后，打印如下摘要：

```
测试分析完成
  PRD:             workspace/{{project}}/prds/{{yyyymm}}/{{prd_slug}}/enhanced.md
  测试点总数:      <N> 条
  维度分布:        功能正向 <N> / 功能逆向 <N> / 边界值 <N> / 兼容性 <N> / 性能 <N> / 安全 <N> / 用户体验 <N>
  建议 Writer 数:  <N>
  历史覆盖:        <N> 份归档参考
  source_ref 前缀分布:  enhanced <N> / prd <N> / knowledge <N> / repo <N>
```

## 错误处理

遵循 `.claude/references/error-handling-patterns.md` 中的标准分类与恢复策略。

## 注意事项

1. 测试点必须基于 enhanced.md 实际描述（§1 概述 + §2 功能细节 + §3 图像要点 + Appendix A），不可凭空创造
2. 每个测试点的 `description` 应具体到可指导 Writer 编写用例的程度
3. 不再产出 `[待澄清]` 前缀；任何模糊点走步骤 5 的 stderr 回射协议
4. 历史用例覆盖的功能点仍需列入清单（可能需要回归验证），标注 `[已有历史]`
5. 涉及数据表/血缘/同步的测试点，在 description 中注明需要准备的数据源类型
6. 任务提示中若包含 `<knowledge_context>`（由 writer-context-builder 注入），优先级介于"Appendix A"与"历史用例"之间
```

- [ ] **Step 2: 验证关键字段**

```bash
grep -E "enhanced\.md|enhanced#|source-facts|plan#" .claude/agents/analyze-agent.md | head -10
```

Expected: 至少 5 行命中 `enhanced.md` / `enhanced#`；`plan#` 仅在"legacy"警告上下文出现。

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/analyze-agent.md
git commit -m "refactor(agents): analyze-agent reads enhanced.md with enhanced# source_ref"
```

---

## Task 10: 改写 `.claude/agents/writer-agent.md`

**Files:**
- Modify: `.claude/agents/writer-agent.md`

- [ ] **Step 1: 三处局部改写**

不整文件重写（保留硬性规则 / artifact_contract / 输出示例的结构），仅修改 3 个关键段落：

**1.1 修改 `<inputs>` 与顶部 role 描述**

Old string:
```
- 源码上下文（可选，来自 transform 🔵 标注；不再含历史用例参考）
```
New string:
```
- 源码上下文（可选，来自 discuss 3.2.5 产出的 enhanced.md Appendix A，🔵 标注；不再含历史用例参考）
```

**1.2 修改 `<confirmation_policy>` 的 Phase C 规则**

Old string:
```
<rule>Phase C：`<confirmed_context>` 中 `resolution=plan_answered` 的条目带有 `plan_ref`，必须把 plan_ref 作为该用例 `source_ref` 字段的值（优于从 test_point 继承）。</rule>
```
New string:
```
<rule>Phase D2：`<confirmed_context>` 中 `resolution=pending_answered` 的条目带有 `source_ref`（格式 `enhanced#q{n}`），必须把该 source_ref 作为用例 source_ref 字段的值（优于从 test_point 继承）。</rule>
```

**1.3 修改"硬性规则"部分 R12**

Old string:
```
- **R12/F16**: source_ref 继承与可解析性（Phase C 新增）——每条 test_case 必须带 `source_ref` 字段，值直接继承自对应 test_point.source_ref；主 agent 在 review 节点会用 `kata-cli source-ref resolve` 批量校验
```
New string:
```
- **R12/F16**: source_ref 继承与可解析性（Phase D2 起使用 enhanced.md 锚点）——每条 test_case 必须带 `source_ref` 字段，值直接继承自对应 test_point.source_ref（主路径 `enhanced#<anchor>`）；主 agent 在 review 节点会用 `kata-cli discuss validate --check-source-refs` 批量校验可解析性
```

**1.4 修改"用例设计流程"第五步的自检附注**

Old string：（在"历史用例参考"所在第二步表之后）
```
2. **偏好规则**（rules/）：菜单结构、业务流程关系、表单字段清单
3. **增强 PRD**：页面描述、交互逻辑
4. **历史用例参考**：同模块的导航路径和操作习惯
```
New string:
```
2. **偏好规则**（rules/）：菜单结构、业务流程关系、表单字段清单
3. **enhanced.md**：§2 功能细节 + §3 图像要点 + Appendix A 源码事实表
4. **历史用例参考**：同模块的导航路径和操作习惯（Phase D2 起仅由 analyze 做覆盖分析，不直接注入 writer）
```

**1.5 修改"已确认上下文处理"**

Old string:
```
## 已确认上下文处理

如果任务提示中包含已确认信息或 `<confirmed_context>`，其中的答案：

- **优先级最高**：优先于 PRD 原文中的模糊描述
- **直接采纳**：无需再次验证或质疑
- **不可覆盖**：不得用推测答案替代已确认答案
```
New string:
```
## 已确认上下文处理

如果任务提示中包含已确认信息或 `<confirmed_context>`（由 discuss add-pending 回射后的 complete 注入）：

- **优先级最高**：优先于 enhanced.md 原文中的模糊描述
- **直接采纳**：无需再次验证或质疑
- **不可覆盖**：不得用推测答案替代已确认答案
- **source_ref**：`resolution=pending_answered` 的 items 必须把 `source_ref` 字段（格式 `enhanced#q{n}`）透传到该用例 source_ref

## Phase D2 阻断回射（改为 add-pending）

Writer 输出 `<blocked_envelope status="needs_confirmation">` 时，主 agent 不再调 `append-clarify`（旧 plan.md），而是：

1. 遍历 items：每条调 `kata-cli discuss add-pending --project {p} --yyyymm {ym} --prd-slug {slug} --location "writer 回射：{item.location}" --question "{item.question}" --recommended "{item.recommended_option.description}" --expected "..."`
2. CLI 内部自动：
   - 在 §4 追加新 Q 区块
   - 正文对应 `s-*` 锚点段落插入 `[^Q{new_id}]` 脚注
   - status 若为 `writing` → 自动回退 `discussing` + 记 `frontmatter.reentry_from=writing`
3. 主 agent 回到 discuss 3.7 逐条澄清
4. complete 后 CLI 按 reentry_from 把 status 切回 `writing`；主 agent 重派 writer 并注入 `<confirmed_context>`（每条 item 含 `source_ref: enhanced#q{new_id}`）

Writer 在重派后的 `<confirmed_context>` 中：

```xml
<confirmed_context>
{
  "writer_id": "{{writer_id}}",
  "items": [
    {
      "id": "B1",
      "resolution": "pending_answered",
      "source_ref": "enhanced#q15",
      "value": "{{§4 Q15 的答案文本}}"
    }
  ]
}
</confirmed_context>
```
```

- [ ] **Step 2: 验证改写生效**

```bash
grep -cE "enhanced\.md|enhanced#|pending_answered" .claude/agents/writer-agent.md
```

Expected: >= 5

```bash
grep -c "plan_answered\|append-clarify" .claude/agents/writer-agent.md
```

Expected: 0（不出现旧协议名）

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/writer-agent.md
git commit -m "refactor(agents): writer-agent uses enhanced# refs + add-pending re-entry"
```

---

## Task 11: 改写 `.claude/agents/reviewer-agent.md`

**Files:**
- Modify: `.claude/agents/reviewer-agent.md`

- [ ] **Step 1: 改写"第零轮 source_ref 批量解析"段**

Old string:
```
### 第零轮：source_ref 批量解析（Phase C 新增）

先把待审查的 writer_json 里所有 `test_case` 的 `source_ref` 聚合成一个数组，写到临时 JSON 文件，然后调 CLI 批量解析：

```bash
cat > /tmp/refs-$$.json <<EOF
[
  {"ref": "<test_case_1.source_ref>"},
  {"ref": "<test_case_2.source_ref>"},
  ...
]
EOF

kata-cli source-ref batch \
  --refs-json /tmp/refs-$$.json \
  --plan {{plan_path}} --prd {{prd_path}} \
  --project {{project}}
```

批量 CLI 的退出码：

- `0` → 全部可解析，第一轮不产出 F16
- `2` → 至少一条不可解析；读 stdout JSON 的 `fails[]` 数组，把每条 `{ref, reason}` 映射到对应 `test_case` 的 `issues[]`：
  ```json
  {
    "code": "F16",
    "description": "source_ref 不可解析: {{reason}}",
    "severity": "manual",
    "original": "{{source_ref}}",
    "fixed": null
  }
  ```
- `1` → CLI 本身异常（参数错误等），停止审查并返回 `invalid_input` verdict

F16 计入问题率，但**不触发自动修正**；标记为 `[F16-MANUAL]` 在 manual_items 输出。
```

New string:
```
### 第零轮：source_ref 批量解析（Phase D2 起基于 enhanced.md）

先把待审查的 writer_json 里所有 `test_case` 的 `source_ref` 聚合成一个数组，调 CLI 批量解析：

```bash
cat > /tmp/refs-$$.json <<EOF
[
  {"ref": "<test_case_1.source_ref>"},
  {"ref": "<test_case_2.source_ref>"},
  ...
]
EOF

# Phase D2 过渡期：`source-ref batch` CLI 仍调用，内部会 dispatch 到
# `discuss validate --check-source-refs`（主路径）或老 plan.md 解析（legacy）。
kata-cli source-ref batch \
  --refs-json /tmp/refs-$$.json \
  --project {{project}} --yyyymm {{yyyymm}} --prd-slug {{prd_slug}}
```

批量 CLI 的退出码（保持与 Phase C 兼容）：

- `0` → 全部可解析，第一轮不产出 F16
- `2` → 至少一条不可解析；stdout 的 `fails[]` 含 `{ref, reason, anchor_candidates?}`；把每条映射到对应 `test_case` 的 `issues[]`：
  ```json
  {
    "code": "F16",
    "description": "source_ref 不可解析: {{reason}}",
    "severity": "manual",
    "original": "{{source_ref}}",
    "fixed": null
  }
  ```
- `1` → CLI 参数错误或 enhanced.md schema 异常，停止审查并返回 `invalid_input` verdict

**Phase D2 校验规则**：

| 前缀 | 校验 | 放行策略 |
|---|---|---|
| `enhanced#<anchor>` | `discuss validate --check-source-refs` 精确匹配 | 严格 |
| `prd#<slug>` | 读 `{prd_dir}/original.md` slug 匹配 | 仅 `source_reference=none` 允许；否则 F16 |
| `knowledge#<type>.<name>` | knowledge-keeper read 条目存在 | 严格 |
| `repo#<path>:L<n>` | 文件 + 行号存在 | 仅 source_consent 非空允许 |
| `plan#...`（legacy） | 旧 plan.md 尝试解析 | **打 warning 但放行**；Phase D3 前保留 |

F16 计入问题率，但**不触发自动修正**；标记为 `[F16-MANUAL]` 在 manual_items 输出。
```

- [ ] **Step 2: 改写顶部 role 说明**

Old string:
```
2. **增强后的 PRD**（可选）：从任务提示指定路径读取，用于业务逻辑交叉验证；缺失时跳过业务验证并记录 `defaultable_unknown`
3. **测试点清单**（可选）：从任务提示指定路径读取，用于覆盖率核查；缺失时跳过覆盖率验证
```
New string:
```
2. **enhanced.md**（可选）：通过 `kata-cli discuss read --project {{project}} --yyyymm {{yyyymm}} --prd-slug {{prd_slug}}` 读取，用于业务逻辑交叉验证；缺失时跳过业务验证并记录 `defaultable_unknown`
3. **测试点清单**（可选）：从任务提示指定路径读取，用于覆盖率核查；缺失时跳过覆盖率验证
```

- [ ] **Step 3: 验证**

```bash
grep -cE "enhanced\.md|discuss validate --check-source-refs" .claude/agents/reviewer-agent.md
```

Expected: >= 3

- [ ] **Step 4: Commit**

```bash
git add .claude/agents/reviewer-agent.md
git commit -m "refactor(agents): reviewer-agent F16 validates against enhanced.md anchors"
```

---

## Task 12: 改写 `rules/prd-discussion.md`（自审 5→6 项 + 措辞对齐）

**Files:**
- Modify: `rules/prd-discussion.md`

- [ ] **Step 1: 整文件重写**

用以下内容覆盖：

```markdown
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
```

- [ ] **Step 2: 验证 6 项自审**

```bash
grep -cE "^\d+\. \*\*" rules/prd-discussion.md
```

Expected: >= 6

- [ ] **Step 3: Commit**

```bash
git add rules/prd-discussion.md
git commit -m "docs(rules): prd-discussion self-audit 5→6 items + enhanced.md terminology"
```

---

## Task 13: 改写 `workflow/01-init.md`

**Files:**
- Modify: `.claude/skills/test-case-gen/workflow/01-init.md`

- [ ] **Step 1: 整文件重写**

用以下内容覆盖：

```markdown
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
```

- [ ] **Step 2: 验证**

```bash
grep -E "enhanced\.md|kata-cli discuss read" .claude/skills/test-case-gen/workflow/01-init.md | head -5
```

Expected: >= 2 行命中

```bash
grep -cE "plan\.md" .claude/skills/test-case-gen/workflow/01-init.md
```

Expected: 0

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/test-case-gen/workflow/01-init.md
git commit -m "refactor(workflow): 01-init reads enhanced.md state with 8-task init"
```

---

## Task 14: 改写 `workflow/02-probe.md`

**Files:**
- Modify: `.claude/skills/test-case-gen/workflow/02-probe.md`

- [ ] **Step 1: 整文件重写**

用以下内容覆盖：

```markdown
# 节点 2: probe — 4 维信号探针与策略派发

> 由 workflow/main.md 路由后加载。上游：节点 1 init；下游：节点 3 discuss。

**目标**：采集 4 维信号（源码 / PRD / 历史 / 知识库），派发到 5 套策略模板之一（S1–S5），结果写入 session state + 创建 enhanced.md 骨架。

**⏳ Task**：将 `probe` 任务标记为 `in_progress`。

### 2.1 确定产物目录

```bash
# 生成 prd_slug（若 1.3 插件已产出则直接复用）
kata-cli prd-slug --title "{{prd_title}}" --project {{project}}
# 产物目录规则
PRD_DIR="workspace/{{project}}/prds/{{YYYYMM}}/{{prd_slug}}"
mkdir -p "$PRD_DIR/images"
```

### 2.2 蓝湖/Axure fetch

若 1.3 检测出蓝湖 URL：

```bash
kata-cli plugin-loader fetch --input "{{lanhu_url}}" \
  --output "$PRD_DIR/original.md" \
  --images-dir "$PRD_DIR/images"
```

产出：

- `$PRD_DIR/original.md` — 原始 PRD（保留蓝湖结构）
- `$PRD_DIR/images/N-uXXX.png` — 独立元素图片（≥ 2KB）
- `$PRD_DIR/images/N-fullpage-*.png` — 整页截图

非蓝湖 URL（用户直接给 md 路径）：复制到 `$PRD_DIR/original.md`。

### 2.3 触发探针

```bash
kata-cli case-signal-analyzer probe \
  --project {{project}} \
  --prd "$PRD_DIR/original.md" \
  --output json
```

stdout 输出完整 SignalProfile JSON。

### 2.4 策略路由

```bash
kata-cli case-strategy-resolver resolve \
  --profile '{{signal_profile_json}}' \
  --output json
```

或用文件形式（profile 已缓存在 probe-cache）：

```bash
kata-cli case-strategy-resolver resolve \
  --profile @workspace/{{project}}/.temp/probe-cache/{{prd_slug}}.json \
  --output json
```

stdout 输出 StrategyResolution JSON。

### 2.5 创建 enhanced.md 骨架

probe 结束后立即调 `discuss init` 创建骨架（预分配所有稳定锚点 id）：

```bash
kata-cli discuss init \
  --project {{project}} \
  --yyyymm {{YYYYMM}} \
  --prd-slug {{prd_slug}}
```

CLI 自动生成 `$PRD_DIR/enhanced.md` 骨架（§1 / §2 / §3 / §4 / Appendix A），初始 status=`discussing`。

### 2.6 落盘策略信息

- **progress**：

  ```bash
  kata-cli progress task-update \
    --project {{project}} --session "$SESSION_ID" \
    --task probe --status done \
    --payload '{"strategy_resolution": {{resolution_json}}, "prd_dir": "'$PRD_DIR'"}'
  ```

- **enhanced.md frontmatter**：

  ```bash
  kata-cli discuss set-strategy \
    --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}} \
    --strategy-resolution '{{resolution_json}}'
  ```

### 2.7 S5 外转处理（交互点 P1）

当 `strategy_resolution.strategy_id === "S5"`：使用 AskUserQuestion 工具，按以下格式提问：

- 问题：`检测到 PRD 缺失但源码变更明显（信号：{{signal_summary}}）。建议切换到 Hotfix 用例生成流程。如何处理？`
- 选项 1：切换到 `hotfix-case-gen`（推荐）
- 选项 2：继续主流程（降级为 S4 保守模式）
- 选项 3：取消本次执行

**选项 1**：主 agent 立即停止当前 workflow，引导用户重新输入 `/daily-task hotfix <Bug URL>`
**选项 2**：调 `case-strategy-resolver resolve --profile ... --force-strategy S4` 把 resolution 覆盖为 S4 后继续
**选项 3**：`discuss reset` + `state.ts clean` + 退出

### 2.8 非 S5 情况

直接进入节点 3 discuss，把 `strategy_id` 作为下游节点 task prompt 的一部分传递。

**✅ Task**：将 `probe` 任务标记为 `completed`（subject 更新为 `probe — {{strategy_id}} {{strategy_name}} / enhanced.md 已创建`）。
```

- [ ] **Step 2: 验证**

```bash
grep -cE "enhanced\.md|discuss init" .claude/skills/test-case-gen/workflow/02-probe.md
```

Expected: >= 3

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/test-case-gen/workflow/02-probe.md
git commit -m "refactor(workflow): 02-probe emits prd-dir and creates enhanced.md skeleton"
```

---

## Task 15: 大改 `workflow/03-discuss.md`

**Files:**
- Modify: `.claude/skills/test-case-gen/workflow/03-discuss.md`

- [ ] **Step 1: 整文件重写**

用以下内容覆盖（完整 3.1-3.11 步骤）：

```markdown
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
```

- [ ] **Step 2: 验证大小**

```bash
wc -l .claude/skills/test-case-gen/workflow/03-discuss.md
```

Expected: >= 250 行

- [ ] **Step 3: 验证关键内容**

```bash
grep -cE "3\.1|3\.2|3\.2\.5|3\.3|3\.4|3\.5|3\.6|3\.7|3\.8|3\.9|3\.10|3\.11|source-facts-agent|add-pending|resolve|enhanced\.md" .claude/skills/test-case-gen/workflow/03-discuss.md
```

Expected: >= 20

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/test-case-gen/workflow/03-discuss.md
git commit -m "refactor(workflow): 03-discuss absorbs transform/enhance with 3.1-3.11 steps"
```

---

## Task 16: 删除 `04-transform.md` 与 `05-enhance.md`

**Files:**
- Delete: `.claude/skills/test-case-gen/workflow/04-transform.md`
- Delete: `.claude/skills/test-case-gen/workflow/05-enhance.md`

- [ ] **Step 1: 删除两个 workflow 文件**

```bash
git rm .claude/skills/test-case-gen/workflow/04-transform.md .claude/skills/test-case-gen/workflow/05-enhance.md
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(workflow): remove 04-transform and 05-enhance nodes"
```

---

## Task 17: 编号前移 analyze 节点（06→04）并改写

**Files:**
- Rename + rewrite: `.claude/skills/test-case-gen/workflow/06-analyze.md` → `04-analyze.md`

- [ ] **Step 1: git mv**

```bash
git mv .claude/skills/test-case-gen/workflow/06-analyze.md .claude/skills/test-case-gen/workflow/04-analyze.md
```

- [ ] **Step 2: 整文件重写**

用以下内容覆盖 `04-analyze.md`：

```markdown
# 节点 4: analyze — 历史检索与测试点规划

> 由 workflow/main.md 路由后加载。上游：节点 3 discuss；下游：节点 5 write。

**目标**：基于 enhanced.md 检索历史用例、QA 头脑风暴、生成测试点清单 JSON。

**⏳ Task**：将 `analyze` 任务标记为 `in_progress`。

### 4.0 入口门禁 + status 切换

```bash
# 校验（Phase D2：仍调老 CLI 语义，D3 切 --check-source-refs）
kata-cli discuss validate \
  --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}} \
  --require-zero-pending
```

退出码约定：

| 退出码 | 情况 | 处理 |
|---|---|---|
| 0 | §4 pending=0，锚点完整 | 继续 4.1 |
| 1 | schema / 锚点异常 | 回 discuss 节点 `discuss reset` |
| 2 | pending > 0 | 回 discuss 节点 3.7 续 resolve |

通过后把 status 切到 `analyzing`：

```bash
kata-cli discuss set-status \
  --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}} \
  --status analyzing
```

进入 `analyzing` 后 enhanced.md 半冻结（仅允许 add-pending）；如 analyze 发现新疑问 → 调 `add-pending` 触发回射（见 03-discuss.md"半冻结回射分支"）。

### 4.1 历史用例检索

```bash
kata-cli archive-gen search --query "{{keywords}}" --project {{project}} --limit 20 \
  | kata-cli search-filter filter --top 5
```

> 注：historical_coverage 仅用于 analyze 的覆盖分析；Phase D2 起**不**作为 writer 的直接输入（见 05-write.md 5.1）。

### 4.2 测试点清单生成（AI 任务）

派发 `analyze-agent`（model: opus），task prompt：

```
project: {{project}}
yyyymm: {{YYYYMM}}
prd_slug: {{prd_slug}}
strategy_id: {{resolution.strategy_id}}
mode: {{mode}}
writer_count_hint: {{from-3.10-or-analyze-decides}}
```

analyze-agent 自己通过 `kata-cli discuss read` 读 enhanced.md（默认 deref Appendix A），不要在 prompt 里贴整份文档。

--quick 模式下简化分析：跳过历史检索，直接从 enhanced.md 提取测试点。

### 4.3 更新状态

```bash
kata-cli progress task-update --project {{project}} --session "$SESSION_ID" --task analyze --status done --payload '{{json}}'
```

**✅ Task**：将 `analyze` 任务标记为 `completed`（subject 更新为 `analyze — {{n}} 个模块，{{m}} 条测试点`）。

### 交互点 B — 测试点摘要（默认直接进入 write）

先在普通文本中展示测试点清单概览：

```
测试点清单（共 {{n}} 个模块，{{m}} 条测试点）：

┌─ {{module_a}}（{{count_a}} 条）
│  ├─ {{page_1}}: {{points}}...
│  └─ {{page_2}}: {{points}}...
└─ {{module_b}}（{{count_b}} 条）

source_ref 前缀分布：enhanced <N> / prd <N> / knowledge <N> / repo <N>
```

默认行为：若测试点清单无 `[INFO: new-pending]` / `invalid_input` 提示，直接进入 write 节点。

仅当 analyze-agent 通过 stderr 回射了新疑问（`INFO: new-pending: <question>`），主 agent 应：

1. 把这些疑问逐条调 `kata-cli discuss add-pending`（半冻结机制自动触发 `reentry_from=analyzing`）
2. 回到 discuss 节点 3.7 对新 Q resolve
3. complete 后 CLI 自动切回 `analyzing`，回到 4.1 增量重跑（仅对新 Q 相关的测试点重算）
```

- [ ] **Step 3: 验证**

```bash
grep -cE "discuss read|discuss set-status|enhanced\.md" .claude/skills/test-case-gen/workflow/04-analyze.md
```

Expected: >= 4

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/test-case-gen/workflow/04-analyze.md
git commit -m "refactor(workflow): analyze renamed 06→04 with enhanced.md + status switch"
```

---

## Task 18: 编号前移 write 节点（07→05）并改写

**Files:**
- Rename + rewrite: `.claude/skills/test-case-gen/workflow/07-write.md` → `05-write.md`

- [ ] **Step 1: git mv**

```bash
git mv .claude/skills/test-case-gen/workflow/07-write.md .claude/skills/test-case-gen/workflow/05-write.md
```

- [ ] **Step 2: 整文件重写**

```markdown
# 节点 5: write — 并行 Writer 生成用例

> 由 workflow/main.md 路由后加载。上游：节点 4 analyze；下游：节点 6 review。

**目标**：按模块并行派发 Writer Sub-Agent，生成结构化用例 JSON。

**⏳ Task**：将 `write` 任务标记为 `in_progress`。然后为每个模块创建子任务（subject: `[write] {{模块名}}`，activeForm: `生成「{{模块名}}」用例`）。

### 5.0 入口门禁 + status 切换

```bash
kata-cli discuss validate \
  --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}} \
  --require-zero-pending
```

退出码处理同 04-analyze 4.0。通过后：

```bash
kata-cli discuss set-status \
  --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}} \
  --status writing
```

进入 `writing` 后半冻结（仅 add-pending 允许）。

### 5.1 派发 Writer Sub-Agent

为每个模块派发独立 `writer-agent`（model: sonnet），派发前先构建 writer 上下文：

```bash
kata-cli writer-context-builder build \
  --prd-slug {{prd_slug}} --yyyymm {{YYYYMM}} \
  --test-points {{test_points_json}} \
  --writer-id {{module}} \
  --rules {{rules_merged}} \
  --strategy-id {{resolution.strategy_id}} \
  --knowledge-injection {{resolution.overrides.writer.knowledge_injection}} \
  --project {{project}}
```

输入包含：

- enhanced.md 对应模块内容（writer-context-builder 内部调 `discuss read`）
- 该模块已确认的测试点清单（**每条必含 `source_ref`**，由 analyze 步骤注入；writer 继承到每条 test_case）
- 合并后规则 JSON（来自 `workspace/{{project}}/.temp/rules-merged.json`）
- 已确认上下文（`<confirmed_context>`）
- 源码上下文（来自 enhanced.md Appendix A + §2 🔵 标注）

> **Phase D2 变化**：
>
> 1. 历史归档用例**不再**作为 writer 直接输入——历史只在 analyze 做覆盖分析
> 2. 每条 test_case 必须继承 test_point.source_ref（主路径 `enhanced#<anchor>`）；reviewer F16 会校验锚点可解析

### 5.2 结构化阻断中转（强制检查）

> **⚠️ Writer subagent 在阻断时必须输出 `<blocked_envelope>`；否则输出 Contract A JSON。主 agent 不得接受半成品。**

- Writer 直接输出 Contract A JSON → 视为无阻断，正常继续
- Writer 输出 `<blocked_envelope status="needs_confirmation">` → 执行 main.md 共享的"Writer 阻断中转协议"（回射到 discuss `add-pending`，半冻结自动切 reentry_from=writing）
- Writer 输出 `<blocked_envelope status="invalid_input">` → 停止该模块并要求修正输入

**✅ Task**：每个 Writer Sub-Agent 完成时，将对应子任务标记为 `completed`（subject 更新为 `[write] {{模块名}} — {{n}} 条用例`）。所有 Writer 完成后，将 `write` 主任务标记为 `completed`（subject 更新为 `write — {{total}} 条用例，{{module_count}} 个模块`）。

### 5.3 更新状态

每个 Writer 完成后：

```bash
kata-cli progress task-update --project {{project}} --session "$SESSION_ID" --task write --status done --payload '{{json}}'
```
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/test-case-gen/workflow/05-write.md
git commit -m "refactor(workflow): write renamed 07→05 with writing-status gate + add-pending recirc"
```

---

## Task 19: 编号前移 review 节点（08→06）并改写

**Files:**
- Rename + rewrite: `.claude/skills/test-case-gen/workflow/08-review.md` → `06-review.md`

- [ ] **Step 1: git mv**

```bash
git mv .claude/skills/test-case-gen/workflow/08-review.md .claude/skills/test-case-gen/workflow/06-review.md
```

- [ ] **Step 2: 整文件重写**

```markdown
# 节点 6: review — 质量审查与修正

> 由 workflow/main.md 路由后加载。上游：节点 5 write；下游：节点 7 format-check。

**目标**：对 Writer 产出执行质量审查，按阈值自动决策。

**⏳ Task**：将 `review` 任务标记为 `in_progress`。

### 6.1 质量审查（AI 任务）

派发 `reviewer-agent`（model: opus）执行质量审查。

质量阈值决策：

| 问题率    | 行为                           |
| --------- | ------------------------------ |
| < 15%     | 静默修正                       |
| 15% - 40% | 自动修正 + 质量警告            |
| > 40%     | 阻断，输出问题报告，等用户决策 |

问题率 = 含问题用例数 / 总用例数（F07-F16 任一命中即计为一条问题用例；F16 只在 MANUAL 分支，不自动修正）。

--quick 模式仅执行 1 轮审查。普通模式最多 2 轮（修正后复审）。

### 6.2 source_ref 锚点校验（Phase D2）

reviewer-agent 在第零轮审查中批量调：

```bash
kata-cli source-ref batch --refs-json /tmp/refs-*.json \
  --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}}
```

CLI 内部按前缀 dispatch：

- `enhanced#...` → 调 `discuss validate --check-source-refs`（D3 前仍可走 legacy plan.md path；D2 过渡期 CLI 兼容两种）
- `prd#...` → 读 `{prd_dir}/original.md` slug 校验
- `knowledge#...` → knowledge-keeper read 校验
- `repo#...` → 文件 + 行号存在校验
- `plan#...` → legacy 兼容，warning 放行

批量结果按 F16 规则计入 issues。主 agent 不必在 skill 层重复调用——审查输出 JSON 中的 `issues[].code="F16"` 已承担结果汇聚职责。

### 6.3 合并产出

将所有 Writer 输出合并为最终 JSON。

### 6.4 更新状态

```bash
kata-cli progress task-update --project {{project}} --session "$SESSION_ID" --task review --status done --payload '{{json}}'
```

**✅ Task**：将 `review` 任务标记为 `completed`（subject 更新为 `review — {{n}} 条用例，问题率 {{rate}}%`）。

### 交互点 C — 质量门禁决策（仅在 reviewer 阻断时使用 AskUserQuestion 工具）

默认行为：

- `verdict = pass` / `pass_with_warnings` → 直接进入 format-check，并在普通文本展示评审摘要
- `verdict = blocked` → 使用 AskUserQuestion 向用户请求决策

阻断时展示：

- 问题：`评审完成：共 {{n}} 条用例，修正 {{m}} 条，问题率 {{rate}}%，当前为阻断状态。如何处理？`
- 选项 1：返回 Writer 阶段重新生成（推荐）
- 选项 2：查看修正详情
- 选项 3：人工复核后继续
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/test-case-gen/workflow/06-review.md
git commit -m "refactor(workflow): review renamed 08→06 with enhanced# F16 dispatch"
```

---

## Task 20: 编号前移 format-check（09→07）保留内容微改

**Files:**
- Rename + modify: `.claude/skills/test-case-gen/workflow/09-format-check.md` → `07-format-check.md`

- [ ] **Step 1: git mv**

```bash
git mv .claude/skills/test-case-gen/workflow/09-format-check.md .claude/skills/test-case-gen/workflow/07-format-check.md
```

- [ ] **Step 2: 更新首行注释中的上下游编号**

Old string (在文件第 3 行附近):
```
> 由 workflow/main.md 路由后加载。上游：节点 8 review；下游：节点 10 output。
```
New string:
```
> 由 workflow/main.md 路由后加载。上游：节点 6 review；下游：节点 8 output。
```

- [ ] **Step 3: 更新 9.6 的 depends_on 与 task 注册**

Old string (在文件末尾附近):
```
kata-cli progress task-add --project {{project}} --session "$SESSION_ID" \
  --tasks '[{"id":"format-check","name":"format-check","kind":"node","order":8,"depends_on":["review"]}]' \
  2>/dev/null || true
```
New string:
```
kata-cli progress task-add --project {{project}} --session "$SESSION_ID" \
  --tasks '[{"id":"format-check","name":"format-check","kind":"node","order":7,"depends_on":["review"]}]' \
  2>/dev/null || true
```

- [ ] **Step 4: 验证**

```bash
grep -E "节点 6 review|节点 8 output|order.*:7" .claude/skills/test-case-gen/workflow/07-format-check.md
```

Expected: 全部命中

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/test-case-gen/workflow/07-format-check.md
git commit -m "refactor(workflow): format-check renamed 09→07 with updated node refs"
```

---

## Task 21: 编号前移 output 节点（10→08）并改写

**Files:**
- Rename + modify: `.claude/skills/test-case-gen/workflow/10-output.md` → `08-output.md`

- [ ] **Step 1: git mv**

```bash
git mv .claude/skills/test-case-gen/workflow/10-output.md .claude/skills/test-case-gen/workflow/08-output.md
```

- [ ] **Step 2: 更新首行注释 + 追加 status=completed 动作**

Old string (文件前 3 行):
```
# 节点 10: output — 产物生成与通知

> 由 workflow/main.md 路由后加载。上游：节点 9 format-check；下游：（完成）。
```
New string:
```
# 节点 8: output — 产物生成与通知

> 由 workflow/main.md 路由后加载。上游：节点 7 format-check；下游：（完成）。
```

Old string (接近末尾 "### 10.4 清理状态"):
```
### 10.4 清理状态

```bash
kata-cli progress session-delete --project {{project}} --session "$SESSION_ID"
```

**✅ Task**：将 `output` 任务标记为 `completed`（subject 更新为 `output — {{n}} 条用例，XMind + Archive MD 已生成`）。
```
New string:
```
### 10.4 标记 enhanced.md 完成

```bash
kata-cli discuss set-status \
  --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}} \
  --status completed
```

### 10.5 清理状态

```bash
kata-cli progress session-delete --project {{project}} --session "$SESSION_ID"
```

**✅ Task**：将 `output` 任务标记为 `completed`（subject 更新为 `output — {{n}} 条用例，XMind + Archive MD 已生成 / enhanced.md status=completed`）。
```

- [ ] **Step 3: 更新章节编号**

将文件中所有 `10.1` → `8.1`、`10.2` → `8.2`、`10.3` → `8.3`、`10.4` → `8.4`、`10.5` → `8.5`（若有）。

```bash
sed -i '' 's/### 10\.\([0-9]\)/### 8.\1/g' .claude/skills/test-case-gen/workflow/08-output.md
```

（macOS sed in-place 用 `-i ''`；谨慎验证）

Run: `grep -E "^### 8\." .claude/skills/test-case-gen/workflow/08-output.md | head -5`
Expected: 8.1 / 8.2 / 8.3 / 8.4 / 8.5 全部命中

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/test-case-gen/workflow/08-output.md
git commit -m "refactor(workflow): output renamed 10→08 with status=completed write-back"
```

---

## Task 22: 重写 `workflow/main.md`（节点映射 10→8 + 任务可视化 + Writer 回射协议）

**Files:**
- Modify: `.claude/skills/test-case-gen/workflow/main.md`

- [ ] **Step 1: 整文件重写**

```markdown
# test-case-gen · primary workflow

> 由 SKILL.md 路由后加载。适用场景：PRD 路径 / 蓝湖 URL / 模块重跑指令。
> 共享的契约、断点续传、Writer 阻断协议、异常处理定义见本文件末尾；节点正文拆入 `workflow/0N-<name>.md`。

## 节点映射表（Phase D2 起 10→8）

| #   | 名称         | 文件                        | 默认超时 | 可跳过条件                   |
| --- | ------------ | --------------------------- | -------- | ---------------------------- |
| 1   | init         | workflow/01-init.md         | 30s      | —                            |
| 2   | probe        | workflow/02-probe.md        | 2min     | 断点恢复                     |
| 3   | discuss      | workflow/03-discuss.md      | 15min    | enhanced.md.status=ready     |
| 4   | analyze      | workflow/04-analyze.md      | 5min     | —                            |
| 5   | write        | workflow/05-write.md        | 10min    | —                            |
| 6   | review       | workflow/06-review.md       | 3min     | --quick                      |
| 7   | format-check | workflow/07-format-check.md | 5min     | —                            |
| 8   | output       | workflow/08-output.md       | 1min     | —                            |

**加载规则**：主 agent 按映射表 `文件` 字段动态 Read；同会话已读无需重复读。

---

## 任务可视化（TaskCreate 8 任务）

> 全流程使用 `TaskCreate` / `TaskUpdate` 工具展示实时进度，让用户在终端看到全局视图。

workflow 启动时（节点 1 开始前），使用 `TaskCreate` 一次性创建 8 个任务，按顺序设置 `addBlockedBy` 依赖：

| 任务 subject                         | activeForm                       |
| ------------------------------------ | -------------------------------- |
| `init — 输入解析与环境准备`          | `解析输入与检测断点`             |
| `probe — 4 维信号探针与策略派发`     | `采集 4 维信号并路由策略`        |
| `discuss — 主持需求讨论 + 素材扫描` | `主持讨论与 enhanced.md 落地`    |
| `analyze — 测试点规划`               | `生成测试点清单`                 |
| `write — 并行生成用例`               | `派发 Writer 生成用例`           |
| `review — 质量审查`                  | `执行质量审查与修正`             |
| `format-check — 格式合规检查`        | `检查格式合规性`                 |
| `output — 产物生成`                  | `生成 XMind + Archive MD`        |

**状态推进规则**：

- 进入节点时 → `TaskUpdate status: in_progress`
- 节点完成时 → `TaskUpdate status: completed`，在 `subject` 末尾追加关键指标
- 节点失败时 → 保持 `in_progress`，不标记 `completed`

### write 节点子任务

进入 write 节点后，为每个模块额外创建子任务：

- subject: `[write] {{模块名}}`
- activeForm: `生成「{{模块名}}」用例`
- 设置 `addBlockedBy` 指向 write 主任务

Writer Sub-Agent 完成时更新：`[write] {{模块名}} — {{n}} 条用例`

### format-check 循环子任务

进入节点 7 format-check 后，为第 1 轮创建子任务：

- subject: `[format-check] 第 1 轮`
- activeForm: `执行第 1 轮格式检查`

每轮完成时更新 subject 为 `[format-check] 第 {{n}} 轮 — {{偏差数}} 处偏差`，若需下一轮则创建新子任务。

---

## 共享协议

### Writer 阻断中转协议（Phase D2：回射到 discuss add-pending）

当 Writer Sub-Agent 返回 `<blocked_envelope>` 时，表示需求信息不足以继续编写，或输入无效。

**核心变更**：Phase D2 起不再调 `discuss append-clarify`（legacy），改为调 `discuss add-pending` 把阻断条目沉淀为 enhanced.md §4 的持久记录。enhanced.md 在 `analyzing`/`writing` 下允许 add-pending，CLI 内部自动回退 status 并记 `reentry_from`。

#### 处理流程

1. **解析 envelope**：从 `<blocked_envelope>` 提取 `items[]`

2. **分流 invalid_input**：
   - 若 `status = "invalid_input"` → 停止该模块并要求修正输入（PRD / 测试点 / writer_id 本身损坏），不走本协议剩余步骤

3. **逐条回射到 `discuss add-pending`**（仅 `status = "needs_confirmation"` 的分支）：

   每个 item 映射为 CLI 调用：

   ```bash
   kata-cli discuss add-pending \
     --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}} \
     --location "writer-回射：{{item.location}}（writer_id={{writer_id}}）" \
     --question "{{item.question}}" \
     --recommended "{{item.recommended_option.description or 'A'}}" \
     --expected "<主 agent 根据 options 构造期望描述>" \
     --context '{"writer_id":"{{writer_id}}","type":"{{item.type}}","source":"{{item.context}}"}'
   ```

   CLI 自动：
   - 在 §4 追加新 Q 区块
   - 正文对应 `s-*` 锚点段落插入 `[^Q{new_id}]` 脚注
   - `status=writing` → 自动回退 `discussing` + 记 `frontmatter.reentry_from=writing`

4. **回到 discuss 3.7 → 3.9 → 3.10**：主 agent 按 `workflow/03-discuss.md` 3.7 节逐条向用户确认（仍是 3 选项格式），用户回答后再次自审（3.9）+ complete（3.10）。

5. **重入 writer**：discuss complete 成功返回 `status=writing` 后（CLI 按 reentry_from 自动恢复），主 agent 回到节点 5 write 派发该模块 Writer。重派前构建 `<confirmed_context>`：

   ```xml
   <confirmed_context>
   {
     "writer_id": "{{writer_id}}",
     "items": [
       {
         "id": "B1",
         "resolution": "pending_answered",
         "source_ref": "enhanced#q{{new_q_id}}",
         "value": "{{§4 Q 区块的 answer 字段文本}}"
       }
     ]
   }
   </confirmed_context>
   ```

   - 所有 item 的 `resolution` 固定为 `"pending_answered"`（不再区分 `user_selected` / `auto_defaulted`，因为值都来自 enhanced.md §4）
   - `source_ref` 必填，格式 `enhanced#q{n}`；writer 以该值作为用例 source_ref

6. **Writer 必须优先采纳 pending_answered**：writer-agent 的 `<confirmed_context>` 优先级规则不变；但主 agent 不得再以"auto_defaulted"重注入回射条目——Phase D2 要求全部沉淀到 enhanced.md §4。

### 断点续传说明

- **状态文件位置**：`.kata/{project}/sessions/test-case-gen/{prd-slug}-{env}.json`
- **自动检测**：节点 1 的 `progress session-resume` 命令自动发现并恢复
- **节点更新**：每个节点完成时通过 `progress task-update` 写入进度
- **最终清理**：节点 8 output 成功后执行 `progress session-delete` 删除状态文件
- **状态结构**：参见 `.claude/references/output-schemas.json` 中的 `qa_state_file`。

### 异常处理

任意节点执行失败时：

1. 更新状态文件记录失败节点
2. 发送 `workflow-failed` 通知：

```bash
kata-cli plugin-loader notify --event workflow-failed --data '{"step":"{{node}}","reason":"{{error_msg}}"}'
```

3. 向用户报告错误，提供重试选项
```

- [ ] **Step 2: 验证**

```bash
grep -cE "workflow/0[1-8]-" .claude/skills/test-case-gen/workflow/main.md
```

Expected: 8

```bash
grep -cE "transform|enhance|append-clarify|plan_answered|10 任务" .claude/skills/test-case-gen/workflow/main.md
```

Expected: 0

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/test-case-gen/workflow/main.md
git commit -m "refactor(workflow): main.md node mapping 10→8 with add-pending recirc"
```

---

## Task 23: 改写 `.claude/skills/test-case-gen/SKILL.md`

**Files:**
- Modify: `.claude/skills/test-case-gen/SKILL.md`

- [ ] **Step 1: 替换 primary workflow 一行**

Old string:
```
  <primary>init → probe → discuss → transform → enhance → analyze → write → review → format-check → output</primary>
```
New string:
```
  <primary>init → probe → discuss → analyze → write → review → format-check → output</primary>
```

- [ ] **Step 2: 替换"主流程（10 节点）" + 任务可视化表**

Old string:
```
## 任务可视化（Task 工具）

> 全流程使用 `TaskCreate` / `TaskUpdate` 工具展示实时进度，让用户在终端看到全局视图。

### 主流程（10 节点）

workflow 启动时（节点 1 开始前），使用 `TaskCreate` 一次性创建 10 个任务（含 discuss 与 format-check），按顺序设置 `addBlockedBy` 依赖：

| 任务 subject                        | activeForm                       |
| ----------------------------------- | -------------------------------- |
| `init — 输入解析与环境准备`         | `解析输入与检测断点`             |
| `probe — 4 维信号探针与策略派发`    | `采集 4 维信号并路由策略`        |
| `discuss — 主 agent 主持需求讨论`   | `主持需求讨论与 plan.md 落地`    |
| `transform — 源码分析与 PRD 结构化` | `分析源码与结构化 PRD`           |
| `enhance — PRD 增强`                | `增强 PRD（图片识别、要点提取）` |
| `analyze — 测试点规划`              | `生成测试点清单`                 |
| `write — 并行生成用例`              | `派发 Writer 生成用例`           |
| `review — 质量审查`                 | `执行质量审查与修正`             |
| `format-check — 格式合规检查`       | `检查格式合规性`                 |
| `output — 产物生成`                 | `生成 XMind + Archive MD`        |
```

New string:
```
## 任务可视化（Task 工具）

> 全流程使用 `TaskCreate` / `TaskUpdate` 工具展示实时进度，让用户在终端看到全局视图。

### 主流程（8 节点）

workflow 启动时（节点 1 开始前），使用 `TaskCreate` 一次性创建 8 个任务（含 discuss 与 format-check），按顺序设置 `addBlockedBy` 依赖：

| 任务 subject                          | activeForm                        |
| ------------------------------------- | --------------------------------- |
| `init — 输入解析与环境准备`           | `解析输入与检测断点`              |
| `probe — 4 维信号探针与策略派发`      | `采集 4 维信号并路由策略`         |
| `discuss — 主持需求讨论 + 素材扫描`  | `主持讨论与 enhanced.md 落地`     |
| `analyze — 测试点规划`                | `生成测试点清单`                  |
| `write — 并行生成用例`                | `派发 Writer 生成用例`            |
| `review — 质量审查`                   | `执行质量审查与修正`              |
| `format-check — 格式合规检查`         | `检查格式合规性`                  |
| `output — 产物生成`                   | `生成 XMind + Archive MD`         |
```

- [ ] **Step 3: 更新 output_contract 协议块**

Old string:
```
<output_contract>
<contract_preservation>保留 Task 2 已批准的 A/B 产物契约与文案，不改写 Writer 中间 JSON、Archive MD、XMind 的职责边界。</contract_preservation>
<transform_handoff>transform 通过 `<clarify_envelope>` / `<confirmed_context>` 交接，不再依赖旧式 Markdown 协议块。</transform_handoff>
<writer_handoff>writer 通过 `<blocked_envelope>` / `<confirmed_context>` 交接；阻断时也必须保持机器可读。</writer_handoff>
</output_contract>
```

New string:
```
<output_contract>
<contract_preservation>保留 Task 2 已批准的 A/B 产物契约与文案，不改写 Writer 中间 JSON、Archive MD、XMind 的职责边界。</contract_preservation>
<discuss_handoff>discuss 节点产出 enhanced.md（见 `references/enhanced-doc-template.md`）；transform/enhance 节点已合入，不再有 `<clarify_envelope>` 协议。</discuss_handoff>
<writer_handoff>writer 通过 `<blocked_envelope>` / `<confirmed_context>` 交接；阻断时回射到 `discuss add-pending`（enhanced.md §4），半冻结状态机自动处理 reentry_from。</writer_handoff>
</output_contract>
```

- [ ] **Step 4: 更新"流程路由"表**

Old string:
```
| `primary`（主生成） | 生成测试用例、生成用例、写用例、为 \<需求名称\> 生成用例、test case、重新生成 xxx 模块、追加用例 | PRD 路径 / 蓝湖 URL / 模块重跑指令 | 10 节点：init → probe → discuss → transform → enhance → analyze → write → review → format-check → output | `workflow/main.md` |
```

New string:
```
| `primary`（主生成） | 生成测试用例、生成用例、写用例、为 \<需求名称\> 生成用例、test case、重新生成 xxx 模块、追加用例 | PRD 路径 / 蓝湖 URL / 模块重跑指令 | 8 节点：init → probe → discuss → analyze → write → review → format-check → output | `workflow/main.md` |
```

- [ ] **Step 5: 重写 "Writer 阻断中转协议" 小节**

Old string (从 `## Writer 阻断中转协议` 到下一个 `## 断点续传说明` 前的整块):
```
## Writer 阻断中转协议

当 Writer Sub-Agent 返回 `<blocked_envelope>` 时，表示需求信息不足以继续编写，或输入无效。

### 处理流程

1. **解析**：从 `<blocked_envelope>` 中提取 `items`
2. **逐条询问**（使用 AskUserQuestion 工具）：每次只向用户提出一个问题，使用 AskUserQuestion 工具：

- 问题：`Writer 需要确认（{{current}}/{{total}}）：{{question_description}}`
- 选项按候选答案列出，AI 推荐项标注"（推荐）"

3. **默认项处理**：若 item 为 `defaultable_unknown`，直接采用推荐项并记录为 `auto_defaulted`
4. **invalid_input 处理**：若 `status = "invalid_input"`，停止该模块并要求修正输入，不重启 Writer
5. **收集完毕**：将所有答案与默认项注入 `<confirmed_context>`，重启该模块的 Writer
6. **注入格式**：

```xml
<confirmed_context>
{
  "writer_id": "{{writer_id}}",
  "items": [
    {
      "id": "B1",
      "resolution": "user_selected",
      "selected_option": "A",
      "value": "{{answer_1}}"
    },
    {
      "id": "B2",
      "resolution": "auto_defaulted",
      "selected_option": "B",
      "value": "{{answer_2}}"
    }
  ]
}
</confirmed_context>
```

---
```

New string:
```
## Writer 阻断中转协议（Phase D2：回射到 discuss add-pending）

**核心变更**：不再现场 AskUserQuestion 处理。Writer `<blocked_envelope>` 内每个 item 通过 `kata-cli discuss add-pending` 沉淀为 enhanced.md §4，半冻结状态机自动回退 status 到 discussing + 记 reentry_from=writing；用户在 discuss 3.7 resolve 后 complete 时 CLI 按 reentry_from 恢复 status=writing，writer 以 `<confirmed_context>` 带 `source_ref: enhanced#q{n}` 重派。

详细流程见 `workflow/main.md` 的"Writer 阻断中转协议"章节。`invalid_input` 分支仍直接停止模块并要求修正输入。

---
```

- [ ] **Step 6: 验证**

```bash
grep -cE "transform|enhance|10 节点|10 个任务" .claude/skills/test-case-gen/SKILL.md
```

Expected: 0

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/test-case-gen/SKILL.md
git commit -m "refactor(skill): SKILL.md primary workflow 10→8 + add-pending writer recirc"
```

---

## Task 24: 刷新 confirmation-policy.json 说明（如涉及）

**Files:**
- Check: `.claude/references/confirmation-policy.json`

- [ ] **Step 1: grep 是否包含 transform/enhance/plan.md 字段**

```bash
grep -E "transform|enhance|plan\.md" .claude/references/confirmation-policy.json
```

- [ ] **Step 2: 若命中 → 编辑移除，不命中 → 跳过**

若命中：Read 文件，按需将 transform/enhance 节点条目合并到 discuss 条目下。若不命中，跳过本 task，直接进 Task 25。

（若编辑，commit message 为 `refactor(references): confirmation-policy absorb transform/enhance into discuss`）

---

## Task 25: 验证 bun 单测全绿

**Files:**
- Test: `.claude/scripts/__tests__/`

- [ ] **Step 1: 全量测试**

```bash
bun test ./.claude/scripts/__tests__
```

Expected: 全部通过（本 phase 未改脚本，仅改文档；应与 D1 收尾时数量一致）

- [ ] **Step 2: 若失败**

诊断原因：本 phase 不应动 `.ts` 代码。若某测试是为 `.md` 文件内容做存在性断言并失败，按正确内容调整断言（优先调整测试；不得弱化断言）。若是硬编码路径失败，修复路径 logic 而非绕过。

---

## Task 26: 全仓 grep 零检查

**Files:** 无（仅验证）

- [ ] **Step 1: transform/enhance agent 引用**

```bash
grep -rln "transform-agent\|enhance-agent" .claude/ 2>/dev/null | grep -v docs/
```

Expected: 空（agents/ 已删除；workflow/main.md / SKILL.md / 03-discuss.md 应无残留）。允许 docs/refactor/ 下的设计文档引用。

- [ ] **Step 2: 旧节点文件引用**

```bash
grep -rln "04-transform\|05-enhance\|06-analyze\|07-write\|08-review\|09-format-check\|10-output" .claude/ 2>/dev/null
```

Expected: 空。若仍有命中 → 回到对应 task 补齐。

- [ ] **Step 3: plan.md 协议引用**

```bash
grep -rln "append-clarify\|plan_answered\|plan_ref" .claude/ 2>/dev/null | grep -v docs/ | grep -v "references/clarify-protocol\|scripts/discuss.ts\|scripts/lib/discuss.ts\|scripts/lib/enhanced-doc-migrator.ts\|scripts/__tests__"
```

Expected: 空（skills/agents/rules 层已切完；scripts 层 legacy 兼容保留到 D3）。

- [ ] **Step 4: Commit 汇总（无文件变更则跳过）**

若 Step 1-3 命中任一项 → 当时修复并 commit；本 task 结束时应全部为空。

---

## Task 27: 真实 PRD smoke 验证（--quick）

**Files:** 无（运行时验证）

- [ ] **Step 1: 选一份已迁移的 enhanced.md（或创建新）**

```bash
ls workspace/*/prds/*/ | head -20
```

找到一份 enhanced.md 已存在且 status=ready 的（Phase D1 手工 smoke 已产出 enhanced.md，可参考 commit 9a79f3c）。若没有 → 手工创建一个极简 PRD：

```bash
MOCK_DIR="workspace/dataAssets/prds/202604/d2-smoke-test"
mkdir -p "$MOCK_DIR/images"
cat > "$MOCK_DIR/original.md" <<EOF
# D2 Smoke Test
功能：简单导出
EOF

kata-cli discuss init --project dataAssets --yyyymm 202604 --prd-slug d2-smoke-test
```

- [ ] **Step 2: 跑 discuss read → validate**

```bash
kata-cli discuss read --project dataAssets --yyyymm 202604 --prd-slug d2-smoke-test
kata-cli discuss validate --project dataAssets --yyyymm 202604 --prd-slug d2-smoke-test --require-zero-pending
```

Expected: read 返回完整骨架；validate 初始 exit 0（骨架无 pending）。

- [ ] **Step 3: 手工验证节点 4 analyze 入口门禁写作正确性（不实际派 agent）**

按 `04-analyze.md` 4.0 的 CLI 串行运行，确认 set-status 能切到 analyzing，然后切回（清理）：

```bash
kata-cli discuss validate --project dataAssets --yyyymm 202604 --prd-slug d2-smoke-test --require-zero-pending
kata-cli discuss set-status --project dataAssets --yyyymm 202604 --prd-slug d2-smoke-test --status analyzing
kata-cli discuss read --project dataAssets --yyyymm 202604 --prd-slug d2-smoke-test | grep status
# 应显示 status: analyzing
kata-cli discuss set-status --project dataAssets --yyyymm 202604 --prd-slug d2-smoke-test --status ready
```

Expected: 每一步退出码 0；status 切换可观察。

- [ ] **Step 4: 清理测试数据**

```bash
kata-cli discuss reset --project dataAssets --yyyymm 202604 --prd-slug d2-smoke-test 2>/dev/null || rm -rf workspace/dataAssets/prds/202604/d2-smoke-test
```

- [ ] **Step 5: 标记 smoke 通过（空 commit 留痕）**

```bash
git commit --allow-empty -m "test(phase-d2): manual smoke passed for status switch + validate + renaming"
```

---

## Phase D2 出口检查清单

- [ ] workflow/ 目录只有 `01-init.md` ~ `08-output.md` + `main.md`，共 9 个文件
- [ ] agents/ 目录新增 `source-facts-agent.md`；`transform-agent.md` / `enhance-agent.md` 已删除
- [ ] analyze/writer/reviewer agents 已改写为 enhanced.md 读写 + enhanced# source_ref
- [ ] rules/prd-discussion.md 自审 6 项 + 措辞对齐
- [ ] references/ 新增 3 个（anchor-id-spec / pending-item-schema / enhanced-doc-template）；删除 1 个（prd-template）；改写 2 个（discuss-protocol / source-refs-schema）；clarify-protocol 加 Phase D2 DEPRECATED 横幅
- [ ] SKILL.md primary workflow 8 节点
- [ ] `bun test` 全绿
- [ ] `grep -r "transform-agent\|enhance-agent\|04-transform\|05-enhance" .claude/` 仅 docs 引用
- [ ] 真实 smoke 跑通

---

## 后续（Phase D3）

- `source-ref.ts` CLI 真正支持 `enhanced#` 前缀（当前 D2 过渡期通过 legacy dispatch 兼容）
- `discuss validate --check-source-refs` 实装 + reviewer F16 切到该接口
- `writer-context-builder` 内部 `--prd-slug` 改由 `discuss read` 取代旧 plan.md 读取
- Writer `<blocked_envelope>` 回射流程实际演练（半冻结 → complete → reentry_from=writing 恢复）
- `progress migrate-session` 处理在途 session（transform/enhance 任务置 done 或重置到 discuss）
- 执行真实 `discuss migrate-plan`（去 `--dry-run`）
- 全仓 grep 零检查：`plan\.md|transform-agent|enhance-agent|append-clarify|plan_answered` 仅剩 legacy 备份引用
- 删除 `clarify-protocol.md`
- 回归 1 轮真实 PRD → 用例全流程
