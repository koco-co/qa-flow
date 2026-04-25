---
name: test-case-gen
description: "QA 测试用例生成：PRD → 结构化测试用例（Archive MD + XMind）。触发词：生成测试用例、写用例、为 <需求名称> 生成用例、test case、重新生成 xxx 模块、追加用例、--quick 快速模式。标准化归档 / XMind 反向同步已迁至 case-format skill。"
argument-hint: "[PRD 路径或蓝湖 URL] [--quick]"
---

# test-case-gen SKILL

## 触发词
生成测试用例、写用例、为 <需求名称> 生成用例

## 工作流
主 agent 遵循 `workflow/main.md` 中的编排定义执行。
步骤分为三种执行模式：
- `direct` → 主 agent 直接执行
- `subagent` → 派发 subagent 执行
- `gate` → 执行 review 后继续
共享协议（Task 可视化、Writer 阻断中转、产物契约等）见 [`workflow/protocols.md`](workflow/protocols.md)。

## 编排定义
详见 [`workflow/main.md`](workflow/main.md)
