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
