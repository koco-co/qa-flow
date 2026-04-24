---
name: daily-task
description: "QA 日常任务集合：bug 报告生成 / 合并冲突分析 / hotfix 用例生成。触发词：
  - bug-report 模式：Java 堆栈、TypeError、Exception、Console 错误、分析报错、生成 bug 报告、--template full
  - conflict-report 模式：分析冲突、合并冲突、merge conflict、<<<<<<< HEAD
  - hotfix 模式：hotfix、线上 bug 验证、禅道 Bug、bug-view-、分析 bug 链接。
  根据第一个参数、自然语言关键词或粘贴内容自动切模式。"
argument-hint: "[bug | conflict | hotfix] [输入（堆栈 / 冲突片段 / 禅道 URL）]"
---

# daily-task

## 模式路由

| 模式 | 触发条件 | 入口文档 |
|---|---|---|
| `bug` | 参数 `bug` / 粘贴 Java 堆栈或 Console 报错 / Exception / TypeError | `modes/bug-report/README.md` |
| `conflict` | 参数 `conflict` / 粘贴含 `<<<<<<< HEAD` 的片段 | `modes/conflict-report/README.md` |
| `hotfix` | 参数 `hotfix` / 禅道 Bug URL（含 `bug-view-`）/ Bug ID | `modes/hotfix-case-gen/README.md` |

## 路由步骤

1. 识别模式（按「模式路由」表）
2. Read 对应 `modes/{mode}/README.md` 获取该模式的 `<role>` / `<workflow>` / 操作细节
3. 按其指引继续执行，使用 `modes/{mode}/` 目录下的 workflow 文件或其他文档

## 共享约束

- 所有产出写入 `workspace/{project}/reports/` 或 `workspace/{project}/issues/`
- 不改变三个原模式的 A/B 产物契约（HTML bug 报告、HTML conflict 报告、Archive MD hotfix）
