---
name: ui-autotest
description: "UI 自动化测试。将 Archive MD 测试用例转化为 Playwright TypeScript 脚本，执行验证，失败时生成 Bug 报告。触发词：UI自动化测试、自动化回归、执行UI测试、e2e回归、冒烟测试。依赖 playwright-cli skill。"
argument-hint: "[功能名或 MD 路径] [目标 URL]"
---

# UI 自动化测试 Skill

## 前置说明

本 Skill 依赖外部 `playwright-cli` skill（单独安装）。执行前检查是否已安装：若未安装，提示用户执行 `/playwright-cli` 安装后再继续。

读取项目配置：执行 `npx tsx .claude/scripts/config.ts`（从 `.env` 读取模块路径配置）。

---

## 步骤 1：解析输入

**1.1 参数提取**

从用户输入中提取：

- `md_path`：Archive MD 文件路径（支持功能名模糊匹配 → 在 `workspace/archive/` 下搜索）
- `url`：目标测试 URL（如 `https://www.bing.com/`）

若 `md_path` 为功能名而非完整路径，在 `workspace/archive/` 中递归搜索匹配的 `.md` 文件。

若 `url` 未提供，向用户询问：

```
请提供目标测试 URL（如 https://www.bing.com/）：
```

**1.2 解析用例**

```bash
npx tsx .claude/skills/ui-autotest/scripts/parse-cases.ts --file {{md_path}}
```

解析输出为任务队列 JSON，格式：

```json
{
  "source": "workspace/archive/{{YYYYMM}}/xxx.md",
  "suite_name": "功能名称",
  "tasks": [
    {
      "id": "t1",
      "title": "验证xxx",
      "priority": "P0",
      "page": "列表页",
      "steps": [{ "step": "进入【xxx】页面", "expected": "页面正常加载" }],
      "preconditions": "前置条件说明"
    }
  ],
  "stats": { "total": 20, "P0": 5, "P1": 10, "P2": 5 }
}
```

---

## 步骤 2：交互确认

向用户展示配置摘要并选择执行范围：

```
🧪 UI 自动化测试配置

目标 URL：{{url}}
用例文件：{{md_path}}
用例总数：{{total}}（P0: {{p0}}, P1: {{p1}}, P2: {{p2}}）

请选择执行范围：
1. 冒烟测试（仅 P0，推荐先跑）
2. 完整测试（P0+P1+P2）
3. 自定义（指定优先级，如：P0,P1）

请输入选项编号（默认 1）：
```

根据用户选择确定 `selected_priorities`（默认 `["P0"]`）。

---

## 步骤 3：登录态准备

**3.1 检查已有 session**

```bash
npx tsx .claude/skills/ui-autotest/scripts/session-login.ts --url {{url}} --output .auth/session.json
```

若返回 `{ "valid": true }`，直接复用，跳过登录。

**3.2 引导用户登录（session 无效时）**

脚本会自动打开浏览器，提示用户：

```
浏览器已打开，请手动登录系统。
登录完成后请回到此终端按 Enter 继续...
```

登录完成后，session 保存至 `.auth/session.json`。

---

## 步骤 4：脚本生成（Sub-Agent 并发）

**4.1 分发任务**

按 `selected_priorities` 过滤 `tasks`，最多 **5 个 sub-agent 并发**执行脚本生成。

每个 sub-agent 接收：

- 单条测试用例数据（`id`, `title`, `priority`, `page`, `steps`, `preconditions`）
- 目标 URL
- 提示词：读取 `${CLAUDE_SKILL_DIR}/prompts/script-writer.md`
- 参考资料：playwright-cli skill 的 references（获取 API 用法）

**4.2 输出格式**

每个 sub-agent 输出代码块，保存到：

```
workspace/.temp/ui-blocks/{{id}}.ts
```

代码块格式：

```typescript
// META: {"id":"t1","priority":"P0","title":"验证xxx"}
import { test, expect } from "@playwright/test";
// ... Playwright test code
```

---

## 步骤 5：合并脚本

```bash
npx tsx .claude/skills/ui-autotest/scripts/merge-specs.ts \
  --input workspace/.temp/ui-blocks/ \
  --output tests/e2e/{{YYYYMM}}/{{suite_name}}/
```

生成：

- `smoke.spec.ts`：仅含 P0 用例
- `full.spec.ts`：含所有优先级用例

输出结果：

```json
{
  "smoke_spec": "tests/e2e/{{YYYYMM}}/{{suite_name}}/smoke.spec.ts",
  "full_spec": "tests/e2e/{{YYYYMM}}/{{suite_name}}/full.spec.ts",
  "case_count": { "smoke": 5, "full": 20 }
}
```

---

## 步骤 6：执行测试

根据执行范围选择 spec 文件：

```bash
# 冒烟测试
npx playwright test tests/e2e/{{YYYYMM}}/{{suite_name}}/smoke.spec.ts \
  --project=chromium \
  --reporter=html \
  --output-folder=workspace/reports/playwright/{{YYYYMMDD}}/

# 完整测试
npx playwright test tests/e2e/{{YYYYMM}}/{{suite_name}}/full.spec.ts \
  --project=chromium \
  --reporter=html \
  --output-folder=workspace/reports/playwright/{{YYYYMMDD}}/
```

记录执行开始时间，计算 `duration`。

---

## 步骤 7：处理结果

**输出模板中的变量说明：**

- `{{full_spec_path}}`：步骤 5 生成的 `full.spec.ts` 完整路径（如 `tests/e2e/202604/登录功能/full.spec.ts`）
- `{{YYYYMMDD}}`：当天日期（如 `20260407`）

**7.1 全部通过**

```
✅ UI 自动化测试完成

通过：{{passed}} / {{total}}
耗时：{{duration}}
报告：workspace/reports/playwright/{{YYYYMMDD}}/index.html

验收命令（可直接复制运行）：
npx playwright test {{full_spec_path}} --project=chromium --reporter=html --output-folder=workspace/reports/playwright/{{YYYYMMDD}}/
```

**7.2 存在失败**

为每个失败的用例触发 bug-reporter sub-agent（读取 `${CLAUDE_SKILL_DIR}/prompts/bug-reporter.md`），输入：

- 失败的测试用例数据
- Playwright 错误信息
- 截图路径（`workspace/reports/playwright/{{YYYYMMDD}}/` 下的截图）
- Console 错误日志

Bug 报告输出至：`workspace/reports/bugs/{{YYYYMMDD}}/ui-autotest-{{suite_name}}.html`

```
❌ UI 自动化测试完成（存在失败）

通过：{{passed}} / {{total}}
失败：{{failed}} 条
耗时：{{duration}}

失败用例：
{{#each failed_cases}}
- {{title}}（{{error_summary}}）
{{/each}}

Bug 报告：workspace/reports/bugs/{{YYYYMMDD}}/ui-autotest-{{suite_name}}.html

验收命令（可直接复制运行）：
npx playwright test {{full_spec_path}} --project=chromium --reporter=html --output-folder=workspace/reports/playwright/{{YYYYMMDD}}/
```

---

## 步骤 8：发送通知

```bash
npx tsx .claude/scripts/plugin-loader.ts notify \
  --event ui-test-completed \
  --data '{
    "passed": {{passed}},
    "failed": {{failed}},
    "specFiles": ["{{spec_file}}"],
    "reportFile": "workspace/reports/playwright/{{YYYYMMDD}}/index.html",
    "duration": "{{duration}}"
  }'
```

---

## 异常处理

任意步骤执行失败时：

1. 向用户报告失败节点和原因
2. 发送 `workflow-failed` 通知：

```bash
npx tsx .claude/scripts/plugin-loader.ts notify \
  --event workflow-failed \
  --data '{"step":"{{step_name}}","reason":"{{error_msg}}"}'
```

3. 提供重试选项，不强制退出

---

## 输出目录约定

| 类型                 | 路径                                     |
| -------------------- | ---------------------------------------- |
| 临时代码块           | `workspace/.temp/ui-blocks/`             |
| E2E spec 文件        | `tests/e2e/YYYYMM/{{suite_name}}/`       |
| Playwright HTML 报告 | `workspace/reports/playwright/YYYYMMDD/` |
| Bug 报告             | `workspace/reports/bugs/YYYYMMDD/`       |
| Session 文件         | `.auth/session.json`                     |
