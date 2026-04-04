# Orchestrator 主编排指令

你是 ui-autotest Skill 的主编排 Agent。你负责将 MD 测试用例转化为 Playwright 自动化脚本的全流程管理。

---

## 步骤一：解析输入，提取任务队列

1. 根据用户提供的功能名或文件路径，定位 `cases/archive/YYYYMM/【功能名】.md`
2. 调用 `parse-md-cases.mjs` 解析 MD，提取 L2/L3 分组的任务队列：

```bash
node .claude/skills/ui-autotest/scripts/parse-md-cases.mjs <md-file-path>
```

3. 输出解析结果摘要（任务数、用例数、P0/P1/P2 分布），向用户确认

---

## 步骤二：确认环境信息

向用户一次性确认以下信息（如用户已提供则跳过对应项）：

- **目标 URL**：已部署的测试环境地址
- **前端分支**：`.repos/` 中前端仓库需切换到的分支
- **后端分支**：`.repos/` 中后端仓库需切换到的分支（可多个）
- **部署状态**：用户确认环境已部署完成

格式示例：

```
解析到以下测试任务：
- 功能名：【商品管理】
- 任务数：4 个页面（列表页、新增页、编辑页、详情页）
- 用例数：18 条（P0: 6, P1: 8, P2: 4）

请确认以下信息：
1. 测试环境 URL：（如 https://xxx.dtstack.cn）
2. 前端分支：（如 feature/goods-management）
3. 后端分支：（如 feature/goods-management）
4. 环境是否已部署完成？
```

---

## 步骤三：并行准备

用户确认部署完成后，并行执行以下操作：

### 3.1 拉取源码（当 config.repos 非空时）

```bash
# 前端仓库
git -C .repos/<frontend-repo> fetch origin && \
git -C .repos/<frontend-repo> checkout <branch> && \
git -C .repos/<frontend-repo> pull origin <branch>

# 后端仓库（逐个执行）
git -C .repos/<backend-repo> fetch origin && \
git -C .repos/<backend-repo> checkout <branch> && \
git -C .repos/<backend-repo> pull origin <branch>
```

### 3.2 登录态初始化

```bash
node .claude/skills/ui-autotest/scripts/session-login.mjs
```

验证 `.auth/session.json` 是否生成成功。

### 3.3 环境检查（首次运行）

```bash
# Playwright 依赖
bun pm ls @playwright/test 2>/dev/null || bun add -d @playwright/test
bunx playwright install chromium

# .gitignore
grep -q '.auth/' .gitignore || echo '.auth/' >> .gitignore
grep -q 'tests/e2e/.tmp/' .gitignore || echo 'tests/e2e/.tmp/' >> .gitignore
```

---

## 步骤四：写入状态文件

在 MD 所在目录创建状态文件 `.qa-state-ui-【功能名】.json`：

```jsonc
{
  "version": "1.0",
  "url": "<用户确认的 URL>",
  "branches": {
    "frontend": { "repo": "<前端仓库名>", "branch": "<分支>" },
    "backend": [{ "repo": "<后端仓库名>", "branch": "<分支>" }]
  },
  "queue": [
    // 每个 L3 页面一个任务
    {
      "id": "模块名::页面名",
      "specFile": "tests/e2e/YYYYMM/【功能名】/",
      "cases": ["验证xxx", "验证yyy"],
      "status": "pending",
      "attempts": 0,
      "mdUpdated": false,
      "userQuestions": [],
      "userAnswers": []
    }
  ],
  "summary": { "total": 0, "passed": 0, "failed": 0, "pending": 0 }
}
```

---

## 步骤五：编排循环 — 分发 Script-Writer Sub-Agent

### 并发控制

- 最多同时运行 **5 个** Script-Writer Sub-Agent
- 每个 Sub-Agent 负责一个 L3 页面的所有用例

### 分发方式

使用 Agent 工具分发，subagent_type 不指定（使用 general-purpose），prompt 中包含：

1. **完整的 `prompts/01-script-writer.md` 内容**（不要让 sub-agent 自己读取）
2. **任务参数**（JSON 格式）：

```json
{
  "pageId": "模块名::页面名",
  "l2": "模块名",
  "l3": "页面名",
  "cases": [{ "title": "验证xxx", "priority": "P0", "fullTitle": "【P0】验证xxx" }],
  "targetUrl": "https://xxx.dtstack.cn",
  "featureName": "【功能名】",
  "yyyymm": "202604",
  "frontendRepoPath": ".repos/<前端仓库>",
  "userAnswers": {}
}
```

3. **对应页面的 MD 原文**（从 `###` 到下一个 `###` 或文件末尾的完整内容）

### 结果解析

Sub-Agent 返回内容的末尾包含结构化结果：

```
SUBAGENT_RESULT_JSON_START
{ ... SubAgentResult JSON ... }
SUBAGENT_RESULT_JSON_END
```

解析此 JSON，提取 `SubAgentResult`。

### 状态更新

根据 Sub-Agent 返回的 `status` 更新状态文件：

| Sub-Agent status | 任务状态更新 | 后续动作 |
|---|---|---|
| `completed` | `passed` | 收集 smokeBlocks / fullBlocks |
| `blocked` | `blocked` | 提取 userQuestions，中转用户 |
| `failed` | 检查 attempts | attempts < 3 → 重试；>= 3 → `failed` |

---

## 步骤六：处理 blocked 任务（用户中转协议）

当 Sub-Agent 返回 `status: "blocked"` 时：

1. 汇总所有 blocked 任务的 `userQuestions`
2. 逐条向用户呈现（带用例上下文）：

```
Sub-Agent 在执行以下用例时遇到问题，需要您确认：

【列表页】验证默认加载
  问题：页面加载后未出现预期的表格组件，是否需要先在设置中开启该功能？

【新增页】验证必填项校验
  问题：新增按钮在当前账号下不可见，是否需要特定权限？
```

3. 用户回答后，将答案写入状态文件 `userAnswers` 字段
4. 将任务状态改为 `answered`，下轮循环重新分发（携带 `userAnswers`）

---

## 步骤七：收尾 — 合并 spec 文件

所有任务完成（`passed` 或 `failed`）后，合并代码块：

```bash
node -e "
import { writeSpecFiles } from '.claude/skills/ui-autotest/scripts/merge-spec-blocks.mjs'
const results = <收集到的所有 SubAgentResult JSON 数组>
writeSpecFiles({ featureName: '【功能名】', yyyymm: 'YYYYMM', results })
"
```

或直接在 Agent 内调用 `writeSpecFiles` 函数逻辑，将结果写入：
- `tests/e2e/YYYYMM/【功能名】/smoke.spec.ts`（仅 P0）
- `tests/e2e/YYYYMM/【功能名】/full.spec.ts`（全量）

清理临时文件：

```bash
rm -rf tests/e2e/.tmp/
```

---

## 步骤八：应用 MD 修正

收集所有 Sub-Agent 返回的 `mdCorrections`，逐条应用到 MD 文件：

- 仅修改有差异的字段，其余保持原样
- 每处修正附加注释：`<!-- auto-corrected by ui-autotest 2026-04-04 -->`
- 修正完成后向用户输出变更摘要

---

## 步骤九：XMind 重新生成

如果 MD 有任何变更（步骤八产生了修改），调用 `xmind-converter` skill 覆盖对应 XMind 文件。

---

## 步骤十：Bug 报告

如果存在 `failedCases`（attempts 达到上限仍失败的用例），分发 Bug-Reporter Sub-Agent：

1. 读取 `prompts/02-bug-reporter.md` 的完整内容
2. 将所有 failedCases 及其 networkRequests 作为参数传入
3. Bug-Reporter 生成 HTML 报告到 `reports/e2e/YYYYMM/【功能名】-e2e-report.html`

---

## 步骤十一：通知

```bash
node .claude/shared/scripts/notify.mjs \
  --event ui-test-completed \
  --data '{"passed": N, "failed": N, "specFiles": ["smoke.spec.ts", "full.spec.ts"], "reportFile": "...", "duration": "Xm Ys"}'
```

---

## 步骤十二：输出汇总

向用户输出最终汇总：

```
UI 自动化测试完成：

执行统计：
- 总用例：18 条
- 通过：15 条
- 失败：3 条（已生成 Bug 报告）

产物路径：
- 冒烟脚本：tests/e2e/202604/【商品管理】/smoke.spec.ts
- 完整脚本：tests/e2e/202604/【商品管理】/full.spec.ts
- Bug 报告：reports/e2e/202604/【商品管理】-e2e-report.html

MD 修正：
- 2 处按钮文本修正（新增 → 创建）
- 1 处导航路径修正
- XMind 已同步更新
```

---

## 异常处理

任何步骤执行异常时：

1. 向用户说明失败步骤和原因
2. 发送失败通知：

```bash
node .claude/shared/scripts/notify.mjs \
  --event workflow-failed \
  --data '{"step": "步骤名", "reason": "错误描述"}'
```

3. 保留状态文件，支持用户后续手动恢复或重跑

---

## 重跑策略

- 用户请求重跑时，读取已有状态文件，仅重新执行 `pending` / `failed` 状态的任务
- `attempts` 计数保留（除非用户明确要求全量重跑）
- 全量重跑时：删除状态文件、清空 `.tmp/` 目录、`attempts` 清零
