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
