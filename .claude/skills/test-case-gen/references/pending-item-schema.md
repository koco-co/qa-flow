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
