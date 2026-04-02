# 通知 Hook 规则（强制执行）

> 本规则定义 IM 通知的强制触发机制。所有 Skill 在产出终态交付物后 **必须** 执行通知，不可跳过。

## 触发时机（skill → event 映射表）

| Skill / 场景 | 事件类型 | 触发条件 | 必需 data 字段 |
|---|---|---|---|
| test-case-generator | `case-generated` | XMind 生成成功 | `count`, `file`, `duration` |
| code-analysis-report（Bug） | `bug-report` | HTML 报告生成完成 | `reportFile`, `summary` |
| code-analysis-report（冲突） | `conflict-analyzed` | 冲突分析报告生成完成 | `reportFile`, `conflictCount`, `branches` |
| code-analysis-report（Hotfix） | `hotfix-case-generated` | 线上问题用例转化完成 | `bugId`, `branch`, `file`, `changedFiles` |
| archive-converter | `archive-converted` | 批量归档完成 | `fileCount`, `caseCount` |
| 任意 Skill 失败 | `workflow-failed` | Skill 执行异常中断 | `step`, `reason` |

## 执行方式

```bash
node .claude/shared/scripts/notify.mjs \
  --event <event-type> \
  --data '<json>'
```

## 强制规则

1. **不可省略**：只要 `.env` 中配置了任意通道（钉钉/飞书/企微/邮件），通知就必须发送。
2. **失败不阻断**：`notify.mjs` 执行失败时仅 `console.error`，不影响已生成的交付物。
3. **异常也要通知**：Skill 执行异常中断时，发送 `workflow-failed` 事件（在 catch 块中调用）。
4. **`--dry-run` 不算完成**：调试用的 dry-run 不替代真实发送。

## 检查清单（Skill 结束前自审）

- [ ] 是否调用了 `notify.mjs`？
- [ ] event 类型是否匹配上表？
- [ ] data JSON 是否包含所有必需字段？
- [ ] 如果 Skill 异常退出，是否发送了 `workflow-failed`？
