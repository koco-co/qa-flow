---
name: ui-autotest
description: UI 自动化测试 Skill。当用户提到「UI自动化测试」「自动化回归」「执行UI测试」「生成测试脚本」「e2e回归」「冒烟测试」时触发。接收 MD 测试用例文件 + 目标 URL + 提测分支，通过多 Sub-Agent 并行完成页面探索、Playwright 脚本生成、执行验证，输出 smoke.spec.ts（P0）和 full.spec.ts（全量），并在失败时生成含完整 curl 信息的 HTML Bug 报告。
---

# UI 自动化测试 Skill

## 用途与触发词

- **用途**：将 MD 测试用例转化为 Playwright TypeScript 自动化脚本，执行验证，并将执行结果反向同步到 MD 和 XMind。
- **触发词**：`UI自动化测试`、`自动化回归`、`执行UI测试`、`生成测试脚本`、`e2e回归`、`冒烟测试`
- **调用关系**：独立执行，收尾阶段调用 `xmind-converter` 和 `notify.mjs`。
- **依赖 Skill**：`playwright-cli`（用于浏览器交互和页面探索）

---

## 技术栈

- **TypeScript + Playwright v1.50+**：测试框架
- **playwright-cli**：浏览器自动化 CLI（页面探索、元素交互、snapshot、test generation）
- **Bun**：包管理和脚本执行
- **Node.js ESM**：脚本运行时
- **notify.mjs**：IM 通知

---

## 使用口径速查

```bash
# 完整流程
为 【功能名】 执行UI自动化测试
为 【功能名】 执行UI自动化测试 https://xxx.dtstack.cn

# 仅执行已有脚本（跳过生成阶段）
回归测试 【功能名】
冒烟测试 【功能名】
```

---

## 输入 / 输出契约

### 输入

| 参数 | 来源 | 说明 |
|------|------|------|
| MD 文件路径 | 用户提供 / 从功能名推断 | `cases/archive/YYYYMM/【功能名】.md` |
| 目标 URL | 用户提供 | 已部署的测试环境地址 |
| 前端分支 | 用户确认（主 agent 推断候选项） | `.repos/dt-insight-studio-front` 对应分支 |
| 后端分支 | 用户确认（通常一个） | `.repos/dt-center-*` 对应分支 |

### 输出

| 产物 | 路径 | 说明 |
|------|------|------|
| 冒烟脚本 | `tests/e2e/YYYYMM/【功能名】/smoke.spec.ts` | 仅 P0 用例 |
| 完整脚本 | `tests/e2e/YYYYMM/【功能名】/full.spec.ts` | P0+P1+P2 全量 |
| Bug 报告 | `reports/e2e/YYYYMM/【功能名】-e2e-report.html` | 仅在有失败时生成 |
| 更新 MD | `cases/archive/YYYYMM/【功能名】.md` | 仅在发现 MD 与实际 UI 不符时更新 |
| 更新 XMind | `cases/xmind/YYYYMM/【功能名】.xmind` | 仅在 MD 有变更时重新生成 |

---

## 步骤总表

| 步骤 | 动作 | 关键产物 |
|------|------|----------|
| 1 | 读取 MD，解析任务队列 | tasks[] |
| 2 | 交互式选择题确认提测信息（执行模式 + 环境 + 源码 + 部署状态） | branches 配置 |
| 3 | 拉取源码，执行 session-login.mjs | `.auth/session.json` |
| 4 | 写入状态文件，启动编排循环 | `.qa-state-ui-*.json` |
| 5 | 动态分发 Script-Writer Sub-Agent（≤5 并发） | SubAgentResult[] |
| 6 | 处理 blocked 任务（用户中转协议） | userAnswers |
| 7 | 合并 code blocks → smoke.spec.ts + full.spec.ts | spec 文件 |
| 8 | 应用 mdCorrections → 更新 MD | MD 更新 |
| 9 | MD 有变更 → 调用 xmind-converter | XMind 更新 |
| 10 | 有 failedCases → 触发 Bug-Reporter Sub-Agent | HTML 报告 |
| 11 | notify.mjs --event ui-test-completed | IM 通知 |

---

## 重跑策略

- 每个 L3 任务最多执行 **3 次**（首次 + 2 次修正重试），达到上限仍失败则上报 Bug-Reporter。
- 整体重跑时，状态文件 `attempts` 计数清零，spec 文件覆盖。

---

## 环境初始化检查（首次运行时自动执行）

```bash
# 检查 @playwright/test 是否安装
bun pm ls @playwright/test 2>/dev/null || bun add -d @playwright/test

# 检查 Chromium 是否安装
bunx playwright install chromium

# 检查 playwright-cli 是否可用
npx --no-install playwright-cli --version 2>/dev/null || npm install -g @playwright/cli@latest

# 检查 .env 配置
node .claude/skills/ui-autotest/scripts/load-qa-env.mjs

# 检查 .auth/ 在 .gitignore
grep -q '.auth/' .gitignore || echo '.auth/' >> .gitignore
```

---

## 详细编排流程

执行时读取 `prompts/00-orchestrator.md`，以其为主 Agent 的行动指南。

**Sub-Agent 读取文件映射：**
- Script-Writer → `prompts/01-script-writer.md`
- Bug-Reporter → `prompts/02-bug-reporter.md`
