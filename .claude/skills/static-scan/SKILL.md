---
name: static-scan
description: "静态代码扫描：对 .repos/{repo} 的提测分支 vs 基线分支做 diff-based LLM 分析，只产出可复现 bug，结果以 JSON + 精美 HTML 落到 workspace/{project}/audits/。触发词：静态扫描、static-scan、提测分支扫描、扫描提测分支、release 分支审查、scan branch、--repo 静态扫描。"
argument-hint: "[--project <name>] [--repo <name>] [--head-branch <branch>] [--related-feature <ym-slug>]"
---

# static-scan SKILL

## 触发词

静态扫描、static-scan、提测分支扫描、扫描 release 分支、scan branch

## 工作流

主 agent 遵循 `workflow.md` 中的编排定义执行。

- 创建 audit、收集 base 分支（AskUserQuestion）
- 派发 `static-scan-agent` 分析 diff（subagent，sonnet）
- 主编排消费 agent 返回的 JSON 数组，逐条 `kata-cli scan-report add-bug`
- 自动渲染 HTML 报告

## CRUD

执行后用户可继续通过 `kata-cli scan-report` 子命令调整：set-meta / add-bug / update-bug / update-bug-steps / remove-bug / show / render。

## 编排定义

详见 [`workflow.md`](workflow.md)
