---
name: ui-autotest
description: "UI 自动化测试。Archive MD 用例 → Playwright 脚本 → 执行验证 → 失败转 Bug 报告。触发词：UI自动化、e2e回归、冒烟测试。依赖 playwright-cli skill。"
argument-hint: "[功能名或 MD 路径] [目标 URL]"
---

# ui-autotest

## 触发词

UI自动化、e2e回归、冒烟测试

## 编排步骤

共享协议（确认策略、命令别名、Task schema、输出目录约定等）见 [`workflow/protocols.md`](workflow/protocols.md)。
异常处理见 [`workflow/protocols-exception.md`](workflow/protocols-exception.md)，按需加载。

### 步骤 1: 解析输入与确认范围

executor: direct
指令: .claude/skills/ui-autotest/workflow/step-1-parse-and-scope.md
> 步骤 1 完成后自动加载 [step-1.5-resume.md](workflow/step-1.5-resume.md) 检查断点续传。

### 步骤 2: 登录态准备

executor: direct
指令: .claude/skills/ui-autotest/workflow/step-2-login.md

### 步骤 3: subagent A（写脚本 + 修复 + 收敛）

executor: subagent
agent: subagent-a-agent
model: sonnet
指令:
  - .claude/skills/ui-autotest/workflow/step-3a-subagent-a.md
  - .claude/skills/ui-autotest/workflow/step-3b-test-fix.md
  - .claude/skills/ui-autotest/workflow/step-3c-convergence.md
gate 后: gates/R1.md

### 步骤 4: 合并脚本

executor: direct
指令: .claude/skills/ui-autotest/workflow/step-4-merge.md

### 步骤 5: subagent B（执行测试）

executor: subagent
agent: subagent-b-agent
model: haiku
指令: .claude/skills/ui-autotest/workflow/step-5-execute.md
gate 后: gates/R2.md

### 步骤 6: 处理结果与通知

executor: direct
指令: .claude/skills/ui-autotest/workflow/step-6-result-notify.md

## 工作流说明

- `direct` → 主 agent 直接执行
- `subagent` → 派发 subagent 执行
- `gate` → 执行 review 后继续
