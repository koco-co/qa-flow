---
name: ui-autotest
description: "UI 自动化测试。Archive MD 用例 → Playwright 脚本 → 执行验证 → 失败转 Bug 报告。触发词：UI自动化、e2e回归、冒烟测试。依赖 playwright-cli skill。"
argument-hint: "[功能名或 MD 路径] [目标 URL]"
---

# ui-autotest

## 触发词

UI自动化、e2e回归、冒烟测试

## 编排步骤

共享协议（确认策略、命令别名、Task schema、输出目录约定等）见 [`workflow.md#protocols`](workflow.md#protocols)。
异常处理见 [`workflow.md#protocols-exception`](workflow.md#protocols-exception)，按需加载。

### 步骤 1: 解析输入与确认范围

executor: direct
指令: .claude/skills/ui-autotest/workflow.md#step-1
> 步骤 1 完成后自动加载 [step-1.5-resume.md](workflow.md#step-1-5) 检查断点续传。

### 步骤 2: 登录态准备

executor: direct
指令: .claude/skills/ui-autotest/workflow.md#step-2

### 步骤 3: subagent A（写脚本 + 修复 + 收敛）

executor: subagent
agent: subagent-a-agent
model: sonnet
指令:
  - .claude/skills/ui-autotest/workflow.md#step-3a
  - .claude/skills/ui-autotest/workflow.md#step-3b
  - .claude/skills/ui-autotest/workflow.md#step-3c
gate 后: gates/R1.md

### 步骤 4: 合并脚本

executor: direct
指令: .claude/skills/ui-autotest/workflow.md#step-4

### 步骤 5: regression runner（执行测试）

executor: subagent
agent: regression-runner-agent
model: haiku
指令: .claude/skills/ui-autotest/workflow.md#step-5
gate 后: gates/R2.md

### 步骤 6: 处理结果与通知

executor: direct
指令: .claude/skills/ui-autotest/workflow.md#step-6

## 工作流说明

- `direct` → 主 agent 直接执行
- `subagent` → 派发 subagent 执行
- `gate` → 执行 review 后继续
