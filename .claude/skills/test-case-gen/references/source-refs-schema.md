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
