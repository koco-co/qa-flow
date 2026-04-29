---
name: ui-autotest
description: "UI 自动化测试。Archive MD 用例 → Playwright 脚本 → 执行验证 → 失败转 Bug 报告。触发词：UI自动化、e2e回归、冒烟测试。依赖 playwright-cli skill。"
argument-hint: "[功能名或 MD 路径] [目标 URL]"
---

# ui-autotest

## 触发词

UI自动化、e2e回归、冒烟测试

## 编排步骤

参考材料：协议见 `references/protocols.md`，目录规范见 `references/directory-layout.md`，Task schema 见 `references/task-schema.md`。按需加载。

### 步骤 0: 环境检查（Pre-flight）

executor: direct
指令: .claude/skills/ui-autotest/workflow.md#step-0

### 步骤 1: 解析输入与确认范围

executor: direct
指令: .claude/skills/ui-autotest/workflow.md#step-1

### 步骤 2: 登录态准备

executor: direct
指令: .claude/skills/ui-autotest/workflow.md#step-2

### 步骤 3: 并行处理用例（写+修一条龙）

executor: subagent（并行派发）
agent: script-case-agent
model: sonnet
指令: .claude/skills/ui-autotest/workflow.md#step-3
gate 后: .claude/skills/ui-autotest/workflow.md#gate-r1

### 步骤 4: 合并脚本

executor: direct
指令: .claude/skills/ui-autotest/workflow.md#step-4

### 步骤 5: regression runner（执行测试）

executor: subagent
agent: regression-runner-agent
model: haiku
指令: .claude/skills/ui-autotest/workflow.md#step-5
gate 后: .claude/skills/ui-autotest/workflow.md#gate-r2

### 步骤 6: 处理结果与通知

executor: direct
指令: .claude/skills/ui-autotest/workflow.md#step-6

## 任务进度管理

使用文件化 `.task-state.json` + Claude 原生 Task 工具实现双重进度追踪：

**文件状态（持久化）**：`.task-state.json` 存储每个 case 的详细状态，支持断点续传和跨 session 恢复

**Claude Task（会话级）**：7 个主任务（T0~T6）用于会话内进度追踪

**Step 3 动态子任务**：每批派发 script-case-agent 时创建批次子任务

## 工作流说明

- `direct` → 主 agent 直接执行
- `subagent` → 派发 subagent 执行
- `gate` → 执行 review 后继续
