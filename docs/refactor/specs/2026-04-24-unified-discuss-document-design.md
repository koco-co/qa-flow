# 统一 discuss 文档化 — 设计文档

> **状态**：Design（待 writing-plans 拆解为实施计划）
> **日期**：2026-04-24
> **作者**：koco-co（brainstorming 输出）
> **前置 spec**：`2026-04-24-discuss-enhancement-and-skills-refactor-design.md`（已完成 Phase A/B/C，本 spec 继续精简与合并）

## 目的与动机

当前 `test-case-gen` 的需求阶段横跨 3 个节点：

- **节点 3 discuss**：用户问答 → 产出 `plan.md`（澄清记录 + 待定清单 JSON）
- **节点 4 transform**：AI 批处理 → 产出增强 PRD 文档
- **节点 5 enhance**：AI 批处理 → 图像识别 / frontmatter / 页面要点

用户认知成本有两个：要同时理解 `plan.md`（内部数据）和增强 PRD（最终文档）；discuss 阶段只做点状考古，提问精度不够，容易漏维度导致"虚无测试点"。

本 spec 把节点 3/4/5 **合并为一个节点**，产出**单一结构化 PRD 文档**。需求阶段的所有输入（PRD + 源码 + 知识库 + 澄清）和所有输出（需求描述 + 待确认项 + 源码事实 + 图像描述）都收敛到这一份 markdown 文件中，通过锚点双向链接实现"待确认项 ↔ 需求段落"的一眼可见。

## 非目标

- 不改 `kata-cli` 全局子命令体系（仅 `discuss` 子命令扩展）
- 不动 `knowledge-keeper` / `ui-autotest` / `playwright-cli` 三个 skill
- 不改 XMind / Archive MD 的最终用例产物契约
- 不保留旧节点 4/5 的文件与任务项

---

## Part 1 — 单文档模型

### 1.0 目录结构（独立目录）

每个需求落到独立子目录，关联产物全部汇聚：

```
workspace/{project}/prds/{YYYYMM}/{prd_slug}/
├── enhanced.md              # 主文档（本 spec 核心产物）
├── original.md              # 蓝湖导出的原始 PRD（probe 产物）
├── source-facts.json        # Appendix A 外溢 blob（>64KB 时启用）
├── resolved.md              # compact --archive 归档的历史 Q
└── images/                  # probe 抓取的独立元素 + 整页截图
    ├── 1-u123.png
    ├── 1-fullpage-xxx.png
    └── ...
```

命名约定：

- `prd_slug` 来自 PRD 标题 slugify（英数字 + 连字符 + 中文保留），由 `kata-cli prd-slug` 生成，整个讨论过程中**不变**
- 需求正式名称（可能在 discuss 中调整）落在 `enhanced.md` §1 概述的标题；不影响目录名
- 旧平铺格式 `workspace/{project}/prds/{YYYYMM}/{slug}.md` 由 `migrate-plan` 迁入新目录；原文件移到 `{slug}/original.md`

### 1.1 产物：`enhanced.md`

替代当前的 `{prd_slug}.plan.md` + 结构化 PRD 两份文件。

```markdown
---
schema_version: 1
status: discussing | pending-review | ready | analyzing | writing | completed
project: dataAssets
prd_slug: xxx
prd_dir: workspace/dataAssets/prds/202604/xxx/
pending_count: 3
resolved_count: 7
defaulted_count: 5
handoff_mode: null                       # complete 时填 current|new
source_consent:                          # 源码引用许可
  repos:
    - path: workspace/dataAssets/.repos/studio
      branch: master
      sha: abc123
  granted_at: 2026-04-24T10:01:00Z
source_reference: full | none            # full=已引用源码；none=用户拒绝，下游降级
migrated_from_plan: false                # true 时正文 §2 / Appendix A 允许为空，首次运行自动补齐
q_counter: 12                            # Q 编号分配器，单调递增、永不复用
created_at: ...
updated_at: ...
strategy_id: S1
knowledge_dropped: [...]
---

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

## 3. 图像与页面要点
（enhance 原职责：图像识别摘要 + 整页要点清单）

## 4. 待确认项

### Q3 <a id="q3"></a>
| 字段 | 值 |
|---|---|
| **位置** | [§2.1 功能块 1 → format 字段](#s-2-1-i9j0) |
| **问题** | PDF 导出是否需要分页？ |
| **状态** | 待确认 |
| **推荐** | 否（现有实现为单页长图） |
| **预期** | 单页长图（≤ 10MB），超限降级为分页 |

### Q5 <a id="q5"></a>
| 字段 | 值 |
|---|---|
| **位置** | [§2.1 功能块 1 → 交互逻辑](#s-2-1-i9j0) |
| **问题** | 导出按钮是否需要权限校验？ |
| **状态** | 待确认 |
| **推荐** | 是（源码 ExportController 已有 @PermissionCheck） |
| **预期** | 需要 `data:export` 权限；无权限时按钮置灰 |

---

## Appendix A: 源码事实表 <a id="source-facts"></a>
（3.2.5 系统扫描产物；analyze/write 阶段的 ground truth）

### A.1 字段清单
| 字段 | 类型 | 路径 | 说明 |
|---|---|---|---|
| format | string | ExportController.java:L45 | 导出格式 |

### A.2 路由表
### A.3 状态枚举
### A.4 权限点
### A.5 API 签名
```

### 1.2 字段展示约定

待确认项统一采用 2 列表格（字段 / 值），字段顺序固定：

1. **位置** — 双向锚点链接到正文段落
2. **问题** — 一句话描述
3. **状态** — 枚举：`待确认` / `已解决` / `默认采用`
4. **推荐** — AI 基于 PRD + 源码 + knowledge 给出的答案
5. **预期** — 采纳推荐后的具体行为描述（新增字段，降低产品回写时"乱写"风险）

**措辞约定**（本 spec 强制）：

| 字段 / 文案 | 旧写法 | 新写法 | 理由 |
|---|---|---|---|
| 字段标签 | `AI 推荐` | `推荐` | 与"位置/问题/状态/预期"字符数对齐 |
| 状态值 | `待产品确认` | `待确认` | 精简；省略"产品"避免角色绑定（可能是 PM、BA、技术负责人等）|

> 所有模板文件（`references/prd-template.md`、`references/pending-item-template.md`）和 CLI stdout 均按此约定输出。

### 1.3 解决状态可视化

当一条待确认项被 `resolve` 后：

- 文末 Q 区块整块套 `<del>...</del>` 删除线（保留历史可查）
- 正文脚注 `[^Q3]` 替换为答案文本或答案锚点
- `frontmatter.resolved_count++`，`pending_count--`

最终 complete 时所有 Q 都应为删除线状态（或 status=`默认采用`），`pending_count=0`。

### 1.4 锚点规范（稳定 id）

所有可被 `source_ref` 引用的段落必须带显式 `<a id="…">`，格式固定：

```
s-{n}            # §n 顶级标题（如 s-1 / s-2 / s-3 / source-facts）
s-{n}-{m}-{uuid} # §n.m 二级小节（uuid 取 4 位 hex）
q{n}             # 待确认项（q1 / q2 / q3 ...）
```

CLI 规则：

- `discuss init` 生成骨架时一次性分配所有顶级 + 一级小节的 id
- `discuss set-section --anchor s-2-1-i9j0 --content '...'` 只替换该锚点所辖段落内容，**不改 id**
- 新增小节通过 `discuss add-section --parent s-2 --title "..."`，CLI 自动分配 `s-2-{m}-{uuid}`
- 标题文本可随意改，锚点 id 与标题解耦，下游 `source_ref` 永远稳定

禁止主 agent 手写 `<a id="...">`；任何手改破坏锚点的操作会被 `discuss validate` 识别为"孤立锚点"或"缺失锚点"。

### 1.5 Q 编号策略

- `frontmatter.q_counter` 是单调递增分配器，初始 0
- `add-pending` 时 `++q_counter`，Q id 取新值
- **永不复用**：`resolve` 只套删除线，不回收编号；迁移时旧 Q 编号保留，续编从 max+1 开始
- 历史 Q 区块（已 `<del>`）保留在 §4 底部，`list-pending` 默认过滤掉
- 文档臃肿阈值：当删除线项 > 50 时，`discuss compact --archive` 可把历史 Q 迁到 `{prd_slug}.resolved.md`（不影响锚点，因为下游不引用已解决 Q）

### 1.6 与当前 plan.md 的字段对应

| 旧 plan.md | 新 enhanced.md |
|---|---|
| frontmatter.status (`discussing/ready/obsolete`) | frontmatter.status（新增中间态 `pending-review`）|
| frontmatter.blocking_count | frontmatter.pending_count（语义合并：所有未 resolve 项都叫 pending）|
| frontmatter.auto_defaulted_count | frontmatter.defaulted_count（重命名）|
| frontmatter.repo_consent | frontmatter.source_consent（重命名，与 `source-facts` 呼应）|
| §1 需求摘要 4 子节 | 正文 §1 概述（4 子节）|
| §3 澄清 JSON fence | 正文 §4 待确认项 + 脚注双链 |
| §4 自动默认记录 | 折叠进每条 Q 的 "状态=默认采用" |
| §5 知识沉淀 | 独立调 `knowledge-keeper write`，不入文档 |
| §6 pending_for_pm | 合并到 §4（所有待确认项同一章节）|
| §7 下游 hints | 不需要（文档本身就是 hints）|
| 无 | **§3 图像与页面要点**（原 enhance 职责）|
| 无 | **Appendix A: 源码事实表**（原 transform 系统分析）|

---

## Part 2 — 节点重组

### 2.1 节点编号调整

```
旧编号 → 新编号         备注
─────────────────────
1       1   init       改写：检测 enhanced.md / migrated_from_plan / 半冻结状态
2       2   probe      改写：产物输出路径切换到独立目录；结束后调 discuss init
3       3   discuss    ★ 合并 4/5，扩展为完整需求阶段
4       -   删除       transform 职责并入 3
5       -   删除       enhance 职责并入 3
6       4   analyze    改写：入口切 status=analyzing；读 enhanced.md；source_ref 新格式
7       5   write      改写：入口切 status=writing；writer source_ref 继承新格式
8       6   review     改写：F16 校验改用 discuss validate 锚点检查
9       7   format-check  不变
10      8   output     改写：完成后置 status=completed
```

### 2.1.1 每个节点的具体改动

**节点 1 init**

- 检测 `{prd_dir}/enhanced.md` 是否存在
  - 不存在 → 走节点 2 probe
  - 存在 + `status ∈ {discussing, pending-review}` → 进节点 3 resume
  - 存在 + `status=ready` → 跳节点 4 analyze
  - 存在 + `status=analyzing/writing` → 半冻结恢复，跳对应节点
  - 存在 + `migrated_from_plan=true` → 走节点 3，内部从 3.2.5 补齐
  - 存在 + `status=completed` → 提示用户是否重跑
- 断点检测逻辑读 progress session 而非旧 `kata-state`

**节点 2 probe**

- 产物路径由 `workspace/{project}/prds/{YYYYMM}/{slug}.md + images/` 改为 `workspace/{project}/prds/{YYYYMM}/{slug}/{original.md, images/}`
- probe 结束后立即调 `kata-cli discuss init --project ... --prd-slug ...` 创建 enhanced.md 骨架（预分配锚点 id）
- Axure fetch / 蓝湖爬虫不变

**节点 3 discuss**

已在 Part 2.2 完整描述。

**节点 4 analyze**（原 6）

- 入口执行：
  1. `kata-cli discuss validate --prd-slug {slug} --require-zero-pending`（exit !=0 回 discuss）
  2. `kata-cli discuss set-status --prd-slug {slug} --status analyzing`
- 读 enhanced.md：`kata-cli discuss read --prd-slug {slug}`（默认 deref Appendix A）
- 派 analyze-agent：prompt 中 `source_ref` 示例从 `prd#section-2.1.3` 改为 `enhanced#s-2-1-i9j0`
- 产出测试点落 progress artifacts

**节点 5 write**（原 7）

- 入口 `discuss set-status --status writing`
- writer-agent prompt 模板中 source_ref 继承规则写明：从测试点的 `enhanced#s-…` 原样透传
- `<blocked_envelope>` 回射协议：改调 `kata-cli discuss add-pending --prd-slug ...`，CLI 内部自动切 status 回 `discussing` + 记 `reentry_from=writing`，complete 后回 writing

**节点 6 review**（原 8）

- F16 `source_ref` 存在性校验改为：`discuss validate --prd-slug ... --check-source-refs <json-array>`；CLI 遍历 source_ref，校验每个锚点在 enhanced.md 可解析
- reviewer-agent 的 F16 prompt 同步改写
- 非锚点前缀（`prd#` / `knowledge#`）仅在 `source_reference=none` 降级路径下允许

**节点 7 format-check**（原 9）

- 不变（xmind / archive 产物契约不变）

**节点 8 output**（原 10）

- 输出 xmind/archive 成功后：`kata-cli discuss set-status --prd-slug ... --status completed`

### 2.2 节点 3 discuss 内部步骤（重写）

```
3.1  init / resume — 创建或恢复 enhanced.md
3.2  源码引用许可（保留）
  3.2.1  repo-profile match
  3.2.2  AskUserQuestion 许可确认
  3.2.3  落盘 source_consent + 可选 repo-sync
3.2.5 系统性素材扫描（合并原 transform + enhance 职责）
  派 source-facts-agent 一次性扫描（前后端都扫，超时仅 warning 不阻断）：
  - 源码：按 PRD 标题/章节关键词定位模块（复用 repo-profile match）
    → 字段清单 / 路由表 / 状态枚举 / 权限点 / API 签名
    → 通过 `discuss set-source-facts` 追加为 Appendix A
  - images/：图像语义化描述 + 整页要点
    → 通过 `discuss set-section --anchor s-3` 写入正文 §3
  缓存键 `{repo_sha}-{prd_mtime}`；命中则跳过
  source_consent 为空时仅扫 images/，Appendix A 留空并在 frontmatter 标 source_reference=none
3.3  需求摘要初稿（正文 §1）
  综合 PRD + knowledge/overview.md + Appendix A → 4 子节初稿
  AskUserQuestion 逐子节确认
3.4  功能细节初稿（正文 §2）
  按 PRD 章节 + Appendix A 填充字段 / 交互 / 导航
  未知或模糊处自动插入 `[^Qn]` 脚注占位
3.5  frontmatter 规范化（prd-frontmatter normalize）
  mechanical CLI 任务；图像与页面要点已在 3.2.5 完成
3.6  10 维度扫描 + 模糊语扫描
  以 Appendix A 为 ground truth；每发现一条 → add-pending 落 §4
3.7  逐条澄清（3 选项格式）
  推荐 / 暂不回答—进入待确认清单 / Other
  用户选 "推荐"：自动调 resolve，脚注替换，Q 区块加删除线
  用户选 "暂不回答"：状态保持 待确认
3.8  知识沉淀（knowledge-keeper write，不入文档）
3.9  自审闭环
  5 项自审清单（摘要完整 / 10 维度过一遍 / 模糊扫描 / 脚注锚点可解析 / 无孤立 Q 区块）
  kata-cli discuss validate --require-zero-pending（可选硬约束）
3.10 complete + 交接模式弹窗
  Current-Session-Driven → 进节点 4 analyze
  New-Session-Driven → 输出 handoff prompt，结束会话
3.11 strategy_id 传递（不变）
```

### 2.3 活文档冻结状态机（半冻结策略）

enhanced.md 不是永远可写，按 `frontmatter.status` 决定各区域可写性：

| status | §1/§2/§3 正文 | Appendix A | §4 待确认项 | 触发 |
|---|---|---|---|---|
| `discussing` | 可写 | 可写 | 可增删改 | 初始 / 回射后 |
| `pending-review` | 只读 | 只读 | 仅 resolve（删除线）| discuss complete 后 |
| `ready` | 只读 | 只读 | 只读 | 所有 Q 已 resolve 且 validate 通过 |
| `analyzing` | 只读 | 只读 | **仅 add-pending 追加** | 进入节点 4 analyze |
| `writing` | 只读 | 只读 | **仅 add-pending 追加** | 进入节点 5 write |
| `completed` | 只读 | 只读 | 只读 | 节点 8 output 完成 |

**回射链路**（Writer `<blocked_envelope>` 或 analyze 发现新疑问）：

1. 主 agent 调 `discuss add-pending`（status `analyzing`/`writing` 下允许追加但不允许改正文）
2. `add-pending` 内部：检测当前 status → 自动把 status 回退到 `discussing` + 记录 `frontmatter.reentry_from: analyzing|writing`
3. 回到节点 3.7 对新 Q 逐条澄清 → 3.9 自审 → 3.10 complete
4. status 切回 `analyzing`/`writing` 按 `reentry_from` 决定
5. analyze/write 重跑时做**增量合并**：已产出的 test_points / cases 保留，仅对新 Q 相关的 source_ref 重算

### 2.4 handoff_mode=new 的恢复流程

新会话执行 `/test-case-gen {prd_path}`：

1. 检测 `enhanced.md` 存在 + `frontmatter.status=pending-review` → 进入"resolve 循环"
2. `kata-cli discuss list-pending --prd {{path}} --format table` 列出未 resolve 的 Q
3. 对每条 Q 调 AskUserQuestion（3 选项同 3.7）
4. 用户答完 → `discuss validate --require-zero-pending` 过线 → `discuss complete`
5. 进节点 4 analyze

无需重跑 3.2～3.6，Appendix A 和正文内容直接复用。

若 `frontmatter.migrated_from_plan=true`：首次进入 3.1 时自动从 3.2.5 开始跑（补齐 Appendix A + §2 + §3），再进 resolve 循环。

---

## Part 3 — CLI 合约

### 3.1 `kata-cli discuss` 子命令（重构后）

| 命令 | 职责 | 主要参数 |
|---|---|---|
| `init` | 创建 enhanced.md 骨架，预分配所有稳定锚点 id | `--project --prd [--migrated-from-plan]` |
| `read` | 读取完整结构；默认自动 deref 外溢的 Appendix A | `--project --prd [--raw]` |
| `set-source-consent` | 写入/清空 source_consent；清空时 source_reference 自动置 none | `--content / --clear` |
| `set-source-facts` | 写入 Appendix A；超 64KB 自动外溢 `.kata/blocks/` | `--content '<json>'` |
| `set-section` | 更新正文某小节内容（不改锚点 id） | `--anchor --content` |
| `add-section` | 在父节点下新增小节，自动分配锚点 id | `--parent --title` |
| `add-pending` | 分配 Q 编号 → 正文插脚注 + §4 追加 Q 区块；status 若为 analyzing/writing 则自动回退到 discussing 并记 reentry_from | `--location --question --recommended --expected` |
| `resolve` | 1) 脚注替换 2) Q 区块套删除线 3) `pending_count--` `resolved_count++` | `--id --answer [--as-default]` |
| `list-pending` | 列未 resolve 的 Q（已删除线默认过滤） | `--format json\|table [--include-resolved]` |
| `compact` | 把历史 `<del>` Q 迁到 `{prd_slug}.resolved.md` | `--archive [--threshold 50]` |
| `validate` | 校验 5 项：schema / 锚点完整性 / 稳定 id 一致性 / 计数匹配 / pending 门禁 | `[--require-zero-pending]` |
| `complete` | status=ready + handoff_mode 落盘；若 source_reference=none 输出降级 banner | `--handoff-mode current\|new` |
| `migrate-plan` | 一次性迁移旧 plan.md → enhanced.md 骨架 | `[--project] [--dry-run]` |
| `reset` | 备份 + 清空 | - |

### 3.2 锚点完整性检查（validate 新职责）

1. 正文所有 `[^Qn]` 脚注都能在 §4 找到对应 `<a id="qn">` 区块
2. 所有 §4 Q 区块的"位置"链接都能在正文解析到对应稳定 id（`s-{n}-{m}-{uuid}`）
3. 所有 `<a id="s-…">` 符合正则 `^s-\d+(-\d+-[0-9a-f]{4})?$` 或 `^source-facts$`，无重复 id
4. `frontmatter.pending_count` == §4 中"状态=待确认"的 Q 区块数
5. `frontmatter.resolved_count` == §4 中套 `<del>` 的 Q 区块数
6. `frontmatter.q_counter` >= §4 所有 Q 的最大编号（单调递增守卫）

任一不过 → exit 非 0 + stderr 详单。

### 3.3 禁止主 agent 手改 enhanced.md

所有写入必须经 CLI。理由：

- 锚点维护复杂，人工编辑易破坏双链
- 统一通过 CLI 可在每次写入后自动跑 validate
- 迁移到 schema v2 时只改 CLI，不动 skill 提示词

例外：`set-section` 主体内容可由主 agent 组合好后作为 `--content` 参数传入，CLI 负责替换对应锚点段落。

---

## Part 4 — 下游节点改动

| 节点 | 改动 |
|---|---|
| **4 analyze**（原 6）| 入口调 `discuss validate --require-zero-pending` + 把 status 切到 `analyzing`；读 enhanced.md（正文 §1-§3 + Appendix A）生成测试点；source_ref 指向稳定锚点（如 `enhanced#s-2-1-i9j0`）|
| **5 write**（原 7）| 入口把 status 切到 `writing`；writer 接收测试点 + enhanced.md 路径；用例的 source_ref 继承测试点 |
| **6 review**（原 8）| F16 source_ref 存在性校验改为"稳定锚点可解析"（`discuss validate` 单独子命令可复用）|
| **7 format-check**（原 9）| 不变 |
| **8 output**（原 10）| 完成后把 status 置 `completed` |
| **Writer `<blocked_envelope>` 回射** | 从 `discuss append-clarify`（plan.md）改为 `discuss add-pending`（enhanced.md），CLI 内部自动把 status 回退到 `discussing` + 记 `reentry_from`，回节点 3.7 续问，complete 后按 reentry_from 恢复 analyzing/writing |

### 4.1 `source_reference=none` 的降级路径

用户在 3.2 拒绝源码参考时：

- Appendix A 留空，`frontmatter.source_reference=none`
- 3.2.5 仅跑图像扫描
- 3.6 维度扫描精度降级（仅 PRD + knowledge ground truth）
- `discuss complete` 输出醒目 banner：

  ```
  ⚠️ 本次讨论未引用源码，待确认项的推荐值可能不够精准。
    下游 source_ref 将只指向 PRD 原文 / knowledge 锚点；
    analyze 阶段发现的新疑问会更多，请做好回射准备。
  ```

- analyze/write 的 source_ref 允许 `prd#...` / `knowledge#...` 两类前缀，review F16 放宽对应规则

---

## Part 5 — 迁移路径

### 5.1 废弃的文件与引用

**删除**：

- `.claude/skills/test-case-gen/workflow/04-transform.md`
- `.claude/skills/test-case-gen/workflow/05-enhance.md`
- `.claude/agents/transform-agent.md`（职责吸收进主 agent + source-facts-agent）
- `.claude/agents/enhance-agent.md`（图像识别能力合入 source-facts-agent）
- `.claude/scripts/lib/discuss-plan-store.ts` 中 plan.md 特有逻辑（JSON fence / §6 pending / §7 hints）

**新增**：

- `.claude/agents/source-facts-agent.md`（扩展职责：源码系统扫描 + 图像语义化 + 页面要点）
- `.claude/skills/test-case-gen/references/enhanced-doc-template.md`
- `.claude/skills/test-case-gen/references/pending-item-schema.md`
- `.claude/skills/test-case-gen/references/anchor-id-spec.md`（稳定锚点格式与生成规则）
- `.claude/scripts/lib/enhanced-doc-store.ts`（读写 + 锚点维护 + slug 生成 + blob 外溢 + validate）

**重命名与重写**：

- `03-discuss.md` 大改（步骤扩展为 3.1～3.11）
- `04-analyze.md` / `05-write.md` / `06-review.md` / `07-format-check.md` / `08-output.md`（编号前移）
- `main.md` 节点映射表更新（10 行 → 8 行）

### 5.2 plan.md → enhanced.md 一次性迁移脚本

`kata-cli discuss migrate-plan --project {{p}} [--dry-run]`

**仅迁讨论状态**，不尝试重建 §2 / §3 / Appendix A：

1. 读旧 plan.md frontmatter + §1 摘要 + §3 澄清清单 + §6 pending
2. 映射到 enhanced.md 骨架：
   - frontmatter 字段按 1.6 表对应，新增 `migrated_from_plan: true`
   - §1 4 子节正文直接复制 + 加稳定锚点 id
   - §3 澄清清单 → §4 Q 区块；§6 pending → §4 Q 区块，状态=待确认
   - §2 / §3 / Appendix A **留空**（由下次执行 `/test-case-gen` 在 3.2.5 自动补齐）
   - `q_counter` 初始化为旧清单 max Q 编号
3. 旧 plan.md 移入 `workspace/{{project}}/.temp/legacy-plan/`（保留 30 天）
4. 输出迁移摘要（每份 PRD 的 Q 数、§2 空 / 非空、警告项）

迁移后首次执行流程：主 agent 检测 `migrated_from_plan=true` → 进入 3.2 source consent（若旧 plan 有 repo_consent 直接迁入则跳过许可问询）→ 3.2.5 补齐 Appendix A + §3 → 3.4 补齐 §2 → 进入 resolve 循环。

### 5.3 横切改动

**主工作流（test-case-gen 内部）**：

- `workflow/main.md` 节点映射表 10 → 8 行，TaskCreate 模板从 10 任务改 8 任务
- `SKILL.md` 描述更新：删除"transform / enhance 职责"相关措辞

**Progress session 迁移**：

- `kata-cli progress migrate-session`（新增）：扫描在途 session，把 `transform` / `enhance` 任务标记为 `done`（因已吸收进 discuss），task 列表从 10 项重排为 8 项
- 对 `status=blocked` 停在 transform/enhance 的 session 特殊处理：重置为 discuss 任务 `pending`，提示用户"原 transform/enhance 阶段已合并到 discuss，请重新检查澄清项"

**Agents 调整**：

| 文件 | 动作 | 说明 |
|---|---|---|
| `.claude/agents/transform-agent.md` | 删除 | 职责拆分：系统扫描→source-facts-agent；模板填充→主 agent |
| `.claude/agents/enhance-agent.md` | 删除 | 图像识别并入 source-facts-agent |
| `.claude/agents/source-facts-agent.md` | 新增 | 源码系统扫描 + 图像语义化 + 页面要点 |
| `.claude/agents/analyze-agent.md` | 改写 | 输入改为 enhanced.md；source_ref 示例新格式；历史用例职责保留 |
| `.claude/agents/writer-agent.md` | 改写 | source_ref 继承说明；`<blocked_envelope>` 回射目标改 `add-pending` |
| `.claude/agents/reviewer-agent.md` | 改写 | F16 规则改为调 `discuss validate --check-source-refs` |
| `.claude/agents/format-checker-agent.md` | 不变 | — |
| 其它 bug/conflict/hotfix/script-*/standardize/pattern-analyzer agents | 不变 | 与 test-case-gen 无耦合 |

**References 调整**：

| 文件 | 动作 |
|---|---|
| `references/prd-template.md` | 合并进 `enhanced-doc-template.md` 后删除 |
| `references/clarify-protocol.md` | 标 DEPRECATED；Phase D3 结束后删除 |
| `references/discuss-protocol.md` | 改写为基于 enhanced.md 的讨论协议 |
| `references/source-refs-schema.md` | 更新为稳定锚点格式 `enhanced#s-{n}-{m}-{uuid}` + 降级前缀 `prd#` / `knowledge#` |
| `references/10-dimensions-checklist.md` | 不变（维度定义不变）|
| `references/ambiguity-patterns.md` | 不变 |
| `references/xmind-structure.md` | 不变 |
| `references/enhanced-doc-template.md` | 新增 |
| `references/pending-item-schema.md` | 新增 |
| `references/anchor-id-spec.md` | 新增 |

**Scripts 调整**：

| 文件 | 动作 |
|---|---|
| `.claude/scripts/discuss.ts` | 大改：新增子命令（init/read/set-*/add-pending/resolve/list-pending/compact/migrate-plan/set-status/check-source-refs）|
| `.claude/scripts/lib/discuss.ts` | 重命名为 `enhanced-doc-store.ts`；实现锚点生成 / blob 外溢 / validate |
| `.claude/scripts/lib/paths.ts` | 新增 `prdDir()` / `enhancedMd()` / `sourceFactsJson()` / `resolvedMd()` |
| `.claude/scripts/source-ref.ts` | 改：支持 `enhanced#s-…` 前缀解析，保留 `prd#` / `knowledge#` 兼容 |
| `.claude/scripts/lib/source-ref.ts` | 同上 |
| `.claude/scripts/progress.ts` | 新增 `migrate-session` 子命令 |

**波及范围（已 grep 核查）**：

test-case-gen 之外的 skills 和 agents **均无** `plan.md` / `transform-agent` / `enhance-agent` / `append-clarify` 引用。具体：

- `daily-task`（bug-report / conflict-report / hotfix-case-gen）：无依赖
- `ui-autotest`（含 step-*.md / hotfix-case-agent）：无依赖
- `knowledge-keeper`：无依赖
- `case-format`：无依赖
- `using-kata`：无依赖

结论：重构影响严格限制在 `test-case-gen` skill + 5 个 agent 文件 + 6 个 script 文件范围内。

### 5.4 切换顺序（一次性）

1. 落地 `enhanced-doc-store.ts` + CLI + 单测全绿
2. 落地 `source-facts-agent` + enhance 能力合并主 agent
3. 改写 `03-discuss.md`，删除 `04-transform.md` / `05-enhance.md`
4. 迁移：`kata-cli discuss migrate-plan --dry-run` → 人工核对 → 真实迁移
5. 更新 `main.md` / `analyze/write/review` 节点入口门禁读取路径
6. 删除 transform-agent / enhance-agent
7. grep 零检查：`grep -r "plan\.md\|transform-agent\|enhance-agent" .claude/` 应仅剩 legacy-plan 备份引用
8. 回归 1 轮真实 PRD → 用例流程

---

## Part 6 — 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| enhanced.md 文件过大（含 Appendix A 源码事实）| 加载 / 传 subagent 成本 | Appendix A 可通过 `$ref` 外溢到 `.kata/blocks/{sha}.json`，enhanced.md 仅保留摘要；复用 progress-store 的 blob 外溢机制 |
| 主 agent 手改文档破坏锚点 | validate 失败 / 下游节点定位错乱 | CLI 强制约束；validate 作为 3.9 自审必过项；主 agent 禁令写入 skill 提示词 |
| 产品在文档里误改 Q 区块（误删锚点 / 误写字段）| resolve 失败 | validate 给出精确定位；resolve 前自动 validate；必要时 `discuss reset` 重跑 |
| 迁移脚本漏字段 | 历史 plan.md 信息丢失 | `--dry-run` 人工核对；legacy-plan/ 备份保留 30 天 |
| source-facts-agent 扫描慢（分钟级）| 用户等待 | 加进度提示；扫描结果缓存到 `artifacts.cached_source_facts`，source_consent 的 sha 不变就复用 |
| Writer 回射链路变长 | 回到 discuss 需要重跑 3.7 | 回射只 pop 相关脚注 + 新增 Q，不全量重扫；复用 resume-pending-loop |
| 锚点 slugify 规则与 CommonMark 不一致 | `[text](#anchor)` 断链 | 改用显式 `<a id="s-{n}-{m}-{uuid}">`，与标题文本解耦；CLI 统一生成，单测覆盖 |
| Q 编号永不复用导致文档膨胀 | §4 堆积几十条删除线项 | `discuss compact --archive` 阈值（默认 50）触发归档到 `{prd_slug}.resolved.md` |
| 半冻结策略下 reentry_from 丢失 | 回射后 status 无法还原 | CLI 强保证；reentry 期间禁止 `complete --handoff-mode` 省略 reentry_from 的写回 |
| 迁移的 enhanced.md 因 §2 空导致 analyze 无法跑 | 用户直接点 analyze 会 validate 失败 | `migrate-plan` 后强制 status=`discussing` + 提示"下次 /test-case-gen 继续"，analyze 入口拒绝 §2 为空的文档 |
| source_facts-agent 扫描边界漏模块 | Appendix A 缺关键字段 | 允许用户在 3.7 澄清时手动 `discuss set-source-facts --append` 补录 |

---

## Part 7 — 实施阶段建议

建议分 3 个 phase：

**Phase D1：enhanced-doc-store + CLI（不动 workflow）**

- 新增 `.claude/scripts/lib/enhanced-doc-store.ts`（读写 / 锚点 / blob 外溢）
- `kata-cli discuss` 子命令扩展（init / add-pending / resolve / list-pending / set-section / set-source-facts / validate 锚点检查 / migrate-plan）
- 单测：锚点生成幂等、resolve 删除线、list-pending 过滤、validate 四项检查
- **出口**：CLI 能独立产出 enhanced.md，`migrate-plan --dry-run` 对 5 份真实 plan.md 验证通过

**Phase D2：workflow 合并（discuss 吸收 transform/enhance）**

- 新增 `source-facts-agent.md`（职责含源码扫描 + 图像语义化 + 页面要点）
- 重写 `01-init.md`（识别 enhanced.md / migrated_from_plan / 半冻结恢复分支）
- 重写 `02-probe.md`（产物路径切独立目录；结束调 `discuss init`）
- 重写 `03-discuss.md`（3.1～3.11，含半冻结状态机说明）
- 删除 `04-transform.md` / `05-enhance.md`、`transform-agent.md` / `enhance-agent.md`
- 编号前移 + 改写 `04-analyze.md` / `05-write.md` / `06-review.md` / `08-output.md`（加 status 切换 + 新 source_ref 格式）
- 改写 `analyze-agent.md` / `writer-agent.md` / `reviewer-agent.md`（prompt 模板 + source_ref 示例）
- 更新 `main.md` 节点映射（10 → 8，TaskCreate 模板 8 任务）
- 更新 `SKILL.md` 描述（删除 transform/enhance 措辞）
- 合并 references：`prd-template.md` → `enhanced-doc-template.md`；新增 `pending-item-schema.md` / `anchor-id-spec.md`；`clarify-protocol.md` 标 DEPRECATED；`discuss-protocol.md` 重写；`source-refs-schema.md` 更新锚点格式
- 同步更新 `rules/prd-discussion.md`：
  - 自审清单 5 项 → 6 项（新增"锚点完整性"）
  - 3 选项措辞对齐（"暂定—留给产品确认" → "暂不回答—进入待确认清单"）
  - 字段标签"AI 推荐" → "推荐"，"待产品确认" → "待确认"
- **出口**：单轮 PRD 跑通（下游门禁读取路径可能暂未切，允许）

**Phase D3：下游适配 + 迁移**

- `analyze/write/review` 三节点入口门禁完全切到 enhanced.md，进入时切 status
- F16 source_ref 校验改为调 `discuss validate --check-source-refs`
- Writer `<blocked_envelope>` 回射目标切到 `add-pending`（半冻结状态机自动处理 reentry）
- `progress migrate-session` 处理在途 session（transform/enhance 任务置 done 或重置到 discuss）
- 执行真实 `discuss migrate-plan`（去掉 --dry-run）
- 全仓 grep 零检查：`plan\.md|transform-agent|enhance-agent|append-clarify` 仅保留 legacy 备份引用
- 删除 `clarify-protocol.md`
- 回归 1 轮真实 PRD → 用例全流程

每个 phase 结束回归一次 `--quick` 跑通。

---

## 附录：决策记录

### A. 初版 brainstorming（2026-04-24）

| 决策 | 选择 |
|---|---|
| 产物数量 | 1 份（enhanced.md），取代 plan.md + 增强 PRD |
| 待确认项展示 | 2 列表格，字段顺序：位置 / 问题 / 状态 / 推荐 / 预期 |
| 字段标签 | `推荐`（非 `AI 推荐`），`待确认`（非 `待产品确认`）|
| 预期字段 | 新增，降低回写时"乱写"风险 |
| 双向链接 | 正文 `[^Qn]` 脚注 + §4 `<a id="qn">` 区块 |
| 解决可视化 | `<del>` 删除线保留历史 |
| 系统源码分析 | 前移到 discuss 3.2.5，产出 Appendix A 作 ground truth |
| 图像识别 | 并入 discuss（原 enhance 职责）|
| 节点数 | 10 → 8（删 4 transform / 5 enhance）|
| 主 agent 写入约束 | 必须经 CLI；禁止手改文档正文 |
| handoff 恢复 | 新会话识别 `status=pending-review` → 直接 resolve 循环 |
| Writer 阻断回射 | 改用 `add-pending`，回到 3.7 |
| plan.md 迁移 | `discuss migrate-plan` 一次性 + legacy 备份 30 天 |

### B. 二轮逐条确认（2026-04-24，全按推荐）

| # | 决策点 | 选择 |
|---|---|---|
| 1 | enhance-agent 去留 | 删除；图像识别合进 source-facts-agent |
| 2 | 锚点稳定性 | 强制显式 `<a id="s-{n}-{m}-{uuid}">`，CLI 自动分配；标题文本与锚点解耦 |
| 3 | Appendix A 外溢 deref | `discuss read` 默认自动 deref，`--raw` flag 保留 `$ref` |
| 4 | source-facts-agent 扫描边界 | 按 PRD 章节关键词定位模块（复用 repo-profile match），前后端都扫；超时 warning 不阻断；缓存键 `{repo_sha}-{prd_mtime}` |
| 5 | 迁移脚本的 §2 内容 | 仅迁 frontmatter + §1 + §3→§4；§2 / §3 / Appendix A 留空；`migrated_from_plan=true` 下次执行自动补齐 |
| 6 | 活文档冻结时机 | 半冻结：analyze/write 阶段正文只读，§4 仅可 add-pending；回射自动切 status 回 discussing + 记 reentry_from；下游做增量合并 |
| 7 | Q 编号策略 | 单调递增、永不复用；`q_counter` 守卫；删除线项占号；`compact --archive` 阈值 50 |
| 8 | source_consent 为空降级 | `source_reference=none`；complete banner；source_ref 允许 `prd#…` / `knowledge#…` 前缀 |
| 9 | rules + ui-autotest 兼容 | Phase D2 同步改 `rules/prd-discussion.md`（6 项自审 + 措辞对齐）；ui-autotest 若 grep 命中 source_ref 读逻辑纳入 D3，否则仅文档层注明 |

### C. 三轮增补确认（2026-04-24，全按推荐）

| # | 决策点 | 选择 |
|---|---|---|
| 10 | 文件命名 | 方案 A：独立子目录 `{prd_slug}/` 汇聚 enhanced.md + original.md + source-facts.json + resolved.md + images/；`prd_slug` 由 CLI 生成后不变，与需求正式名称解耦 |
| 11 | 其它节点改动 | 01~08 全部按"节点改动清单"改写，含 probe 产物路径切换、analyze/write/output 的 status 切换、reviewer F16 改调 CLI 校验 |
| 12 | 横切影响 | main.md / progress session / agents（5 个）/ references（新 3 / 改 3 / 删 1） / scripts（6 个）全部纳入 Phase D2/D3 |
| 13 | 波及范围（grep 确认）| test-case-gen 之外的 skills / agents **零依赖**；重构严格限制在本 skill + 5 agent + 6 script |
