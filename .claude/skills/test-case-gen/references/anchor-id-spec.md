# enhanced.md 稳定锚点规范

> 供 `references/enhanced-doc-template.md` / `source-refs-schema.md` / `anchor-id-spec.md` 互相引用。CLI 强制约束见 `engine/lib/enhanced-doc-anchors.ts`。

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

`source_ref` 当前合法 scheme：
- `enhanced#<anchor>`（主路径）
- `prd#<section>`（`source_reference=none` 降级路径）
- `knowledge#<type>.<name>`（知识库引用）
- `repo#<short>/<path>:L<line>`（可选兜底，仅 source_consent 非空时）

旧前缀 `plan#q<id>-<slug>` 已于 Phase D4 彻底下线，parser 直接拒绝；所有澄清问题统一使用 `enhanced#q{n}`（与 enhanced.md §4 待确认项锚点对齐）。
