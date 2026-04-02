> **注意**：本文件是 `.claude/rules/xmind-output.md` 的 skill 内镜像，以全局版本为准。如有冲突，请以 `.claude/rules/xmind-output.md` 为准。

# XMind 输出规范

## Canonical 命名 contract

输出前先确定粒度：

- **PRD 级输出**：单个 PRD 独立生成，文件名为 `<功能名>.xmind`
- **Story 级输出**：同一 Story 聚合输出，文件名为 `Story-YYYYMMDD.xmind`
- 对应 Archive Markdown 在可识别原始 PRD 文件名时，优先使用 `PRD-XX-<功能名>.md`；仅 Story 聚合输出默认与 Story 级 XMind 共用 basename

## 输出路径

参考 `.claude/config.json` 中的 `modules[].xmind` 与 `modules[].archive` 字段确定输出目录。

输出路径由 `.claude/config.json` 中各模块的 `xmind` 和 `archive` 字段决定。以下是通用路径模式：

| 模块 key | XMind 路径                           | Archive 路径                            |
| -------- | ------------------------------------ | --------------------------------------- |
| `${module}` | `cases/xmind/${module}/`          | `cases/archive/${module}/`              |
| `${module}` (含版本) | `cases/xmind/${module}/v${version}/` | `cases/archive/${module}/v${version}/` |

> 实际模块 key 和路径从 `.claude/config.json` 的 `modules` 字段读取。模块 key 与文件系统路径别名不同时，以 config.json 的配置为准。

## 层级结构

```text
Root → L1（版本/需求） → L2（模块/菜单） → L3（页面） → [L4（子组）] → 用例标题 → 步骤 → 预期结果
```

- L1 用于区分不同 PRD / 需求版本。
- L2 必须对应实际菜单或独立功能模块名称。
- L3 按页面维度拆分，如列表页、新增页、编辑页、详情页。
- L4 为可选层级，仅在页面内部功能较多时使用，如搜索、导出、字段校验。

## 追加模式

- 同一 XMind 文件中，不同 PRD 的用例通过各自的 L1 节点区分。
- 需要跨 PRD 聚合时，优先使用 Story 级文件名，而不是继续扩展旧式自定义文件名。

## Archive MD 与 XMind 格式对应说明

XMind L1 对应 Archive MD 的 `suite_name` frontmatter 字段：

- Archive MD **不含** `#`（H1）层级；需求标题存入 frontmatter `suite_name` 字段
- XMind L1 → Archive frontmatter `suite_name`（不再生成 H1 正文标题）
- XMind L2 → Archive `## 模块/菜单名`
- XMind L3 → Archive `### 页面名`
- XMind [L4] → Archive `#### 功能子组`
- 用例标题 → Archive `##### 【P0】验证xxx`（优先级前缀格式）

## Issue Tracker 标注规则（当 config.modules[].trackerId 非空时启用）

> 以下规则仅在 config.json 中对应模块的 `trackerId` 字段为非空值时适用。若 `trackerId` 未配置，省略括号标注。

- Root：`<项目名><版本>迭代用例(#<trackerId>)`（trackerId 来自 `config.json` 的 `modules[].trackerId`，无 trackerId 时省略该后缀）
- L1 title：`<需求标题>(#<requirement_ticket>)`
- L1 labels：`(#<requirement_id>)`（对应 Archive frontmatter `prd_id`，来源为 `meta.requirement_id`）
- L1 默认 `folded`
- 其余层级继续沿用 `模块/菜单 → 页面 → [子组] → 用例 → 步骤 → 预期`

## XMind 输出路径

生成、追加或替换成功后，脚本在终端输出真实 XMind 文件的绝对路径，供用户直接访问。
