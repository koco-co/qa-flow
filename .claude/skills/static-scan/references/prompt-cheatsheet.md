# static-scan-agent prompt cheatsheet

派发 agent 时的 prompt 骨架（编排层填充 `{{...}}`）：

```
你是 static-scan-agent。请按 .claude/agents/static-scan-agent.md 的契约工作。

输入：
- diff_path: workspace/{{project}}/audits/{{ym}}-{{slug}}/diff.patch
- meta_path: workspace/{{project}}/audits/{{ym}}-{{slug}}/meta.json
- repo_path: workspace/{{project}}/.repos/{{repo}}
{{#if prd_path}}
- prd_path: {{prd_path}}
{{/if}}

请输出 JSON 数组（不要包裹任何说明文字）。空数组 [] 表示 diff 中没有可复现 bug。
```

并发提示：

- diff 文件数 ≤ 3：单 agent 整体投喂
- 4 ≤ 文件数 ≤ 30：按文件分批，最多并发 5 个 agent
- 文件数 > 30：先派一个轻量 hotspot-rank-agent，让它按"代码逻辑修改密度"排序，取 Top 30 按文件并行（M3 收尾再细化）
