# XMind 输出规范

## Canonical 命名 contract

输出前先确定粒度：

- **PRD 级输出**：单个 PRD 独立生成，文件名为 `<功能名>.xmind`
- **Story 级输出**：同一 Story 聚合输出，文件名为 `Story-YYYYMMDD.xmind`
- 对应 Archive Markdown 在可识别原始 PRD 文件名时，优先使用 `PRD-XX-<功能名>.md`；仅 Story 聚合输出默认与 Story 级 XMind 共用 basename

## 输出路径

参考 `.claude/config.json` 中的 `modules[].xmind` 与 `modules[].archive` 字段确定输出目录。

**DTStack 模块**新生成的 xmind 文件按版本放入 `v{version}/` 子目录，每需求一个独立文件：

| 模块 key | XMind 路径                              | Archive 路径                         |
| -------- | --------------------------------------- | ------------------------------------ |
| batch-works | `cases/xmind/batch-works/v{version}/`  | `cases/archive/batch-works/v{version}/` |
| data-assets | `cases/xmind/data-assets/v{version}/`  | `cases/archive/data-assets/v{version}/` |
| data-query | `cases/xmind/data-query/v{version}/`   | `cases/archive/data-query/v{version}/` |
| variable-center | `cases/xmind/variable-center/v{version}/` | `cases/archive/variable-center/v{version}/` |
| public-service | `cases/xmind/public-service/v{version}/` | `cases/archive/public-service/v{version}/` |
| xyzh | `cases/xmind/custom/xyzh/` | `cases/archive/custom/xyzh/` |

**特殊分类目录**（不含版本号，按功能类型归档）：

| 模块 | 路径 | 说明 |
|------|------|------|
| data-assets | `cases/xmind/data-assets/主流程/` | 主流程回归用例 |
| data-assets | `cases/xmind/data-assets/岚图标品/` | 岚图标品整理用例 |
| batch-works | `cases/xmind/batch-works/6.3.x/` | 6.3.x 系列主流程 |
| batch-works | `cases/xmind/batch-works/集成测试/` | 集成测试用例 |

> 注意：`xyzh` 是模块 key，`custom/xyzh` 是文件系统路径别名，不要在配置或脚本参数中混用。

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

## DTStack 样例驱动规则

DTStack（尤其 `data-assets`）输出优先对齐 `cases/xmind/data-assets/数据资产v6.4.9.xmind`：

- Root：`<中文产品名><版本>迭代用例(#<禅道产品ID>)`（禅道产品ID 来自 `config.json` 的 `modules[].zentaoId`，无 zentaoId 时省略该后缀）
- L1 title：`<需求标题>(#<requirement_ticket>)`
- L1 labels：`(#<requirement_id>)`（对应 Archive frontmatter `prd_id`，来源为 `meta.requirement_id`）
- L1 默认 `folded`
- 其余层级继续沿用 `模块/菜单 → 页面 → [子组] → 用例 → 步骤 → 预期`

## XMind 快捷访问

生成、追加或替换成功后，脚本只会在仓库根目录创建或刷新固定快捷链接 `latest-output.xmind`，用于指向本次最新生成的真实 XMind 文件。
