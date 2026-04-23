# ui-autotest · step 0 — 偏好预加载

> 由 SKILL.md 路由后加载。执行时机：工作流启动最初一次性执行。

工作流启动时一次性加载偏好：

```bash
kata-cli rule-loader load --project {{project}} > workspace/{{project}}/.temp/rules-merged.json
```

后续步骤通过此 JSON 传递规则给 sub-agent，不再各自读 `rules/` 目录。
