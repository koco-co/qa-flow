# XMind 结构偏好

> 优先级：用户当前指令 > 项目级偏好规则 > 全局偏好规则 > skill 内置规则
> 本文件由 AI 辅助维护，用户也可直接编辑

<artifact_contract>
  <xmind_intermediate contract="A">
    <title>验证xxx</title>
    <priority>P1</priority>
  </xmind_intermediate>
  <archive_md contract="B">
    <display_title>【P1】验证xxx</display_title>
  </archive_md>
</artifact_contract>

## Root 节点命名模板

```
root_title_template: `数据资产v{{prd_version}}迭代用例(#{{iteration_id}})`
iteration_id: 23
```

- `{{prd_version}}` — 从 `--version` 参数或蓝湖解析结果自动填充（如 `6.3.10`），脚本会自动去除 `v` 前缀后再填充
- `{{iteration_id}}` — 迭代 ID，默认 `23`
- 当未提供 version 时，退回 `--project` 参数值（默认 `数栈测试`）
- 该模板用于生成 Archive MD frontmatter `root_name`；md → xmind 渲染时，若 frontmatter 已存在 `root_name`，则优先消费该值而不是重新推导模板

## Root 节点名称示例

| prd_version 输入 | 生成的 Root 节点名称（= frontmatter root_name） |
| ---------------- | ----------------------------------------------- |
| `v6.3.10`        | `数据资产v6.3.10迭代用例(#23)`                  |
| `6.3.10`         | `数据资产v6.3.10迭代用例(#23)`                  |

## Frontmatter root_name 字段

Archive MD 的 frontmatter 中包含 `root_name` 字段，其值通常根据 `prd_version` 和上述模板生成，代表该需求在 XMind 中的 Root 节点名称。

- 模板负责**生成** `root_name`
- md → xmind 渲染负责**消费** `root_name`
- 若 frontmatter 中存在 `root_name`，则 `root_name` wins；仅在缺失时才回退到模板 / `--project`

## 层级映射

| XMind 层级 | Archive MD 层级             | 说明                                                          |
| ---------- | --------------------------- | ------------------------------------------------------------- |
| Root       | frontmatter `root_name`     | `root_name` 存在时优先使用；缺失时才回退到模板 / 项目名       |
| L1         | frontmatter `suite_name`    | 需求名称                                                      |
| L2         | `## 标题` (H2)              | 模块名称                                                      |
| L3         | `### 标题` (H3)             | 菜单名称（多级菜单用横杠连接）                                |
| L4         | `#### 标题` (H4)            | 功能点名称（可选）                                            |
| L5         | `##### 【P1】验证xxx` (H5) | Archive MD 使用 Contract B；写入 XMind 时节点标题改为 Contract A `验证xxx`，优先级通过 marker 表达 |

## prd_version 格式

`prd_version` 必须为**完整版本号**（如 `v6.3.10`），不允许缩写为 `v6.3`。
