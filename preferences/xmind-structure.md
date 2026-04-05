# XMind 结构偏好

> 优先级：用户当前指令 > 本文件规则 > skill 内置规则
> 本文件由 AI 辅助维护，用户也可直接编辑

## Root 节点命名模板

```
root_title_template: `数据资产v{{prd_version}}迭代用例(#{{iteration_id}})`
iteration_id: 23
```

- `{{prd_version}}` — 从 `--version` 参数或蓝湖解析结果自动填充（如 `6.4.9`）
- `{{iteration_id}}` — 迭代 ID，默认 `23`
- 当未提供 version 时，退回 `--project` 参数值（默认 `数栈测试`）

## L1 节点规则

- 标题格式：`需求名称(#case_id)` — 如 `【数据质量】xxx(#10307)`
- `case_id` 从 frontmatter 的 `case_id` 字段提取
- 无 `case_id` 时不添加后缀

## "未分类" 节点处理

- L2=未分类 且 L3=未分类 → 用例直接挂 L1，不产生空节点
- L2=真实 且 L3=未分类 → 用例直接挂 L2，跳过 L3
- 优先级：保持层级扁平，避免无意义的中间层

## 用例标题

- XMind 中的用例标题不带 `【P0】`/`【P1】`/`【P2】` 前缀
- 优先级仅通过 marker 图标表示

## 输出目录

- XMind 文件输出到 `workspace/xmind/{yyyyMM}/`
- 中间 JSON 文件输出到 `workspace/xmind/{yyyyMM}/tmp/`
