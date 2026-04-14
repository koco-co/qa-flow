---
name: ui-autotest
description: "UI 自动化测试。将 Archive MD 测试用例转化为 Playwright TypeScript 脚本，执行验证，失败时生成 Bug 报告。触发词：UI自动化测试、自动化回归、执行UI测试、e2e回归、冒烟测试。依赖 playwright-cli skill。"
argument-hint: "[功能名或 MD 路径] [目标 URL]"
---

# UI 自动化测试 Skill

<role>
你是 qa-flow 的 UI 自动化测试技能，负责把 Archive MD 用例转成 Playwright 脚本、逐条验证、再执行合并回归。
</role>

<inputs>
- Archive MD 路径或功能名
- 目标 URL
- 当前项目配置、登录 session、只读源码副本
- playwright-cli 能力与 Playwright 执行结果
</inputs>

<workflow>
  <step index="1">解析输入与用例</step>
  <step index="2">确定执行范围</step>
  <step index="3">准备登录态</step>
  <step index="4">并发生成脚本</step>
  <step index="5">逐条自测与修复</step>
  <step index="6">合并脚本</step>
  <step index="7">执行回归</step>
  <step index="8">处理结果</step>
  <step index="9">发送通知</step>
</workflow>

<confirmation_policy>
  <rule id="status_only">步骤完成统计、通过/失败摘要、报告路径展示仅作状态展示，不要求确认。</rule>
  <rule id="scope_selection">仅在 URL、执行范围或登录方式不明确时使用 AskUserQuestion。</rule>
  <rule id="reference_permission">允许用实际 DOM、playwright-cli snapshot 与只读源码来修正脚本；此许可不包含 Archive MD 写回。</rule>
  <rule id="archive_writeback">若拟回写 Archive MD，必须先展示差异预览，再单独确认；默认只记录建议，不写回。</rule>
</confirmation_policy>

<output_contract>
  <archive_contract>保留 Task 2 的 Archive MD 标题契约、`suite_name` 语义与 `parse-cases.ts` 解析约定。</archive_contract>
  <artifacts>产物包括 UI blocks、合并 spec、Playwright HTML 报告、可选的 Archive MD 校正建议。</artifacts>
</output_contract>

<error_handling>
  <defaultable_unknown>范围或环境细节缺失但不影响执行时，按默认值继续并在摘要中提示。</defaultable_unknown>
  <blocking_unknown>登录、环境或页面结构缺口导致脚本无法继续时，终止该用例并在结果中说明。</blocking_unknown>
  <invalid_input>Archive MD 路径、URL 或解析结果无效时，立即停止并要求修正输入。</invalid_input>
</error_handling>

<examples>
  <scope_default>用户未指定范围时默认执行 P0 冒烟；用户已明确指定时不再重复确认。</scope_default>
  <writeback_preview>发现 Archive MD 与真实系统不一致时，先展示拟修改步骤摘要，再单独确认是否写回。</writeback_preview>
</examples>

## 任务可视化（Task 工具）

> 全流程使用 `TaskCreate` / `TaskUpdate` 工具展示实时进度。

### 主流程（9 步）

workflow 启动时（步骤 1 开始前），使用 `TaskCreate` 一次性创建 9 个任务，按顺序设置 `addBlockedBy` 依赖：

| 任务 subject | activeForm |
|---|---|
| `步骤 1 — 解析输入` | `解析用例文件` |
| `步骤 2 — 执行范围` | `确认执行范围` |
| `步骤 3 — 登录态准备` | `准备登录 session` |
| `步骤 4 — 脚本生成` | `生成 Playwright 脚本` |
| `步骤 5 — 逐条自测` | `执行自测验证` |
| `步骤 6 — 合并脚本` | `合并验证通过的脚本` |
| `步骤 7 — 执行测试` | `执行全量回归` |
| `步骤 8 — 处理结果` | `处理测试结果` |
| `步骤 9 — 发送通知` | `发送完成通知` |

**状态推进规则**：
- 进入步骤时 → `TaskUpdate status: in_progress`
- 步骤完成时 → `TaskUpdate status: completed`，在 `subject` 末尾追加关键指标

### 步骤 5 逐条自测子任务

进入步骤 5 后，为每条待验证用例创建独立子任务：
- subject: `[自测] [{{priority}}] {{title}}`
- activeForm: `验证「{{title}}」`

每条用例状态更新：
- 开始执行 → `in_progress`（activeForm: `验证「{{title}}」— 第 {{n}} 轮`）
- 修复重试 → 更新 subject 为 `[自测] [{{priority}}] {{title}} — 第 {{n}} 轮修复中`
- 验证通过 → `completed`（subject: `[自测] [{{priority}}] {{title}} — 通过`）
- 3 轮仍失败 → `completed`（subject: `[自测] [{{priority}}] {{title}} — 失败（{{原因}}）`）

### 步骤 4 脚本生成子任务

进入步骤 4 后，为每条用例创建子任务：
- subject: `[脚本] [{{priority}}] {{title}}`
- Sub-Agent 完成时标记 `completed`

---

## 前置说明

本 Skill 依赖外部 `playwright-cli` skill（单独安装）。执行前检查是否已安装：若未安装，提示用户执行 `/playwright-cli` 安装后再继续。

### 项目选择

扫描 `workspace/` 目录下的子目录（排除以 `.` 开头的隐藏目录和通用目录如 `.repos`）：
- 若只有 **1 个项目**，自动选择，输出：`当前项目：{{project}}`
- 若有 **多个项目**，列出供用户选择：
  ```
  检测到多个项目，请选择：
  1. project-a
  2. project-b
  请输入编号（默认 1）：
  ```
- 若 **无项目**，提示用户先执行 `/qa-flow init` 初始化

选定的项目名称记为 `{{project}}`，后续所有路径均使用该变量。

### 读取配置

读取项目配置：执行 `bun run .claude/scripts/config.ts`（从 `.env` 读取模块路径配置）。

---

## 步骤 1：解析输入

**⏳ Task**：创建 9 个主流程任务（见「任务可视化」章节），将 `步骤 1` 标记为 `in_progress`。

**1.1 参数提取**

从用户输入中提取：

- `md_path`：Archive MD 文件路径（支持功能名模糊匹配 → 在 `workspace/{{project}}/archive/` 下搜索）
- `url`：目标测试 URL（如 `https://www.bing.com/`）

若 `md_path` 为功能名而非完整路径，在 `workspace/{{project}}/archive/` 中递归搜索匹配的 `.md` 文件。

若 `url` 未提供，向用户询问：

```
请提供目标测试 URL（如 https://www.bing.com/）：
```

**1.2 解析用例**

```bash
bun run .claude/skills/ui-autotest/scripts/parse-cases.ts --file {{md_path}}
```

解析输出为任务队列 JSON，格式：

```json
{
  "source": "workspace/{{project}}/archive/{{YYYYMM}}/xxx.md",
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

**✅ Task**：将 `步骤 1` 标记为 `completed`（subject: `步骤 1 — 解析完成，{{total}} 条用例`）。

## 步骤 2：执行范围确认（仅在范围未明确时提问）

**⏳ Task**：将 `步骤 2` 标记为 `in_progress`。

默认行为：

- 若用户输入已明确给出执行范围或优先级，直接采用并继续
- 若未明确，展示配置摘要并让用户选择执行范围

```
🧪 UI 自动化测试配置

目标 URL：{{url}}
用例文件：{{md_path}}
用例总数：{{total}}（P0: {{p0}}, P1: {{p1}}, P2: {{p2}}）
```

仅在需要用户选择范围时，展示：

```
请选择执行范围：
1. 冒烟测试（仅 P0，推荐先跑）
2. 完整测试（P0+P1+P2）
3. 自定义（指定优先级，如：P0,P1）

请输入选项编号（默认 1）：
```

根据用户输入或默认策略确定 `selected_priorities`（默认 `["P0"]`）。

---

**✅ Task**：将 `步骤 2` 标记为 `completed`（subject: `步骤 2 — {{scope}} 模式，{{n}} 条用例`）。

## 步骤 3：登录态准备

**⏳ Task**：将 `步骤 3` 标记为 `in_progress`。

**3.1 检查已有 session**

```bash
bun run .claude/skills/ui-autotest/scripts/session-login.ts --url {{url}} --output .auth/session.json
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

**✅ Task**：将 `步骤 3` 标记为 `completed`（subject: `步骤 3 — 登录态就绪`）。

## 步骤 4：脚本生成（Sub-Agent 并发）

**⏳ Task**：将 `步骤 4` 标记为 `in_progress`。为每条用例创建脚本生成子任务（见「任务可视化」章节）。

**4.1 分发任务**

按 `selected_priorities` 过滤 `tasks`，最多 **5 个 sub-agent 并发**执行脚本生成。

每个 sub-agent 接收：

- 单条测试用例数据（`id`, `title`, `priority`, `page`, `steps`, `preconditions`）
- 目标 URL
- 派发 `script-writer-agent`（model: sonnet），每个 sub-agent 独立生成一条脚本
- 参考资料：playwright-cli skill 的 references（获取 API 用法）

**4.2 SQL 前置条件处理**

当用例的 `preconditions` 包含 SQL 建表/数据准备时，sub-agent 必须在生成的脚本中使用 `setupPreconditions` API（来自 `assets-sql-sync` 插件），而非添加注释跳过。具体用法参见 `script-writer-agent` 的「前置条件处理」章节。

若用例同时包含多张表的 SQL，可将 SQL 文件放在 `workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/sql/` 目录下，脚本中通过 `readFileSync` 读取。

**4.3 输出格式**

每个 sub-agent 输出代码块，保存到：

```
workspace/{{project}}/.temp/ui-blocks/{{id}}.ts
```

代码块格式：

```typescript
// META: {"id":"t1","priority":"P0","title":"验证xxx"}
import { test, expect } from "@playwright/test";
// ... Playwright test code
```

---

**✅ Task**：所有 Sub-Agent 完成后，将 `步骤 4` 标记为 `completed`（subject: `步骤 4 — {{n}} 条脚本已生成`）。

## 步骤 5：逐条自测与修复（强制，不可跳过）

> **⚠️ 强制规则：每条脚本必须单独执行验证通过后才能进入合并阶段。仅编译通过不代表验证通过，未经实际执行验证的脚本禁止交付。**

**⏳ Task**：将 `步骤 5` 标记为 `in_progress`。为每条待验证用例创建自测子任务（见「任务可视化」章节的步骤 5 逐条自测子任务规则）。

**5.1 逐条执行验证**

对 `workspace/{{project}}/.temp/ui-blocks/` 中的每个代码块，逐条执行 Playwright 测试：

```bash
QA_PROJECT={{project}} bunx playwright test workspace/{{project}}/.temp/ui-blocks/{{id}}.ts --project=chromium --timeout=30000
```

**5.2 失败处理（最多重试 3 轮）**

脚本执行失败时，**不生成 bug 报告**，而是进入自修复循环：

1. **分析失败原因**：读取 Playwright 错误信息（超时、元素不存在、断言失败等）
2. **获取实际 DOM**：使用 playwright-cli 的 snapshot 工具获取当前页面的实际 DOM 结构
3. **参考源码校对**：结合 `workspace/.repos/` 下的前端源码，校对：
   - 实际路由路径（检查 `router/` 或 `routes/` 配置）
   - 实际菜单/侧边栏导航方式（检查 layout 组件）
   - 按钮文本、表单 label（检查对应组件的 JSX/template）
   - API 接口路径（检查 service 层调用）
4. **修复脚本**：根据实际 DOM 和源码修正选择器、导航方式、等待策略
5. **重新执行验证**：修复后再次运行，直到通过或达到 3 次重试上限

**5.3 引用实际系统行为与 Archive MD 写回门禁**

在自测修复过程中，若发现 MD 用例描述与实际系统行为不一致（如导航路径错误、按钮名称不对、步骤缺失），按以下双门策略处理：

1. **默认允许引用，不默认写回**：可直接引用实际 DOM、playwright-cli snapshot 和只读源码来修正脚本。
2. **若拟回写 Archive MD，先展示差异预览**：

   ```json
   {
     "archive_path": "{{md_path}}",
     "changes": [
       {
         "case_title": "{{title}}",
         "field": "step",
         "current": "进入【xxx】页面",
         "proposed": "进入【xxx → yyy】页面，等待列表加载完成",
         "evidence": "snapshot + 源码路由配置"
       }
     ]
   }
   ```

3. **展示预览后，使用 AskUserQuestion 单独确认写回权限**：

   - 选项 1：仅引用实际行为修正脚本，不写回 Archive MD（默认）
   - 选项 2：允许按上述预览写回 Archive MD
   - 选项 3：跳过该用例的写回建议

4. **仅在用户明确允许写回时**，才更新原 Archive MD 文件，并在修改的步骤后追加注释：`<!-- 由 ui-autotest 自测校正 -->`
5. **若用户未授权写回**，仅在最终结果中列出校正建议，不修改 Archive MD

**5.4 3 次重试仍失败的处理**

若某条用例经过 3 轮修复仍无法通过：

1. 记录为「环境/平台问题」，标记失败原因
2. 将该用例从待合并列表中移除（不影响其他用例）
3. 在最终报告中单独列出，注明失败原因和已尝试的修复措施
4. **不自动生成 Bug 报告**（可能是环境问题而非真实 Bug），改为向用户报告：

```
以下用例经过 3 轮自测修复仍未通过，可能为环境或平台问题：

- {{title}}：{{最后一次的错误摘要}}
  已尝试：{{修复措施列表}}

建议：手动检查测试环境后重试，或调整用例预期。
```

---

**✅ Task**：所有用例自测完成后，将 `步骤 5` 标记为 `completed`（subject: `步骤 5 — {{passed}}/{{total}} 通过`）。

## 步骤 6：合并脚本

**⏳ Task**：将 `步骤 6` 标记为 `in_progress`。

> 仅合并步骤 5 中**验证通过**的脚本。

```bash
bun run .claude/skills/ui-autotest/scripts/merge-specs.ts \
  --input workspace/{{project}}/.temp/ui-blocks/ \
  --output workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/
```

生成：

- `smoke.spec.ts`：仅含 P0 用例（已验证通过）
- `full.spec.ts`：含所有优先级用例（已验证通过）

输出结果：

```json
{
  "smoke_spec": "workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/smoke.spec.ts",
  "full_spec": "workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/full.spec.ts",
  "case_count": { "smoke": 5, "full": 20 },
  "skipped": ["{{跳过的用例 id 列表}}"]
}
```

---

**✅ Task**：将 `步骤 6` 标记为 `completed`（subject: `步骤 6 — 合并 {{n}} 条脚本`）。

## 步骤 7：执行测试（全量回归）

**⏳ Task**：将 `步骤 7` 标记为 `in_progress`。

> 此步骤为合并后的全量回归验证，因步骤 5 已逐条验证通过，此处预期全部通过。

根据执行范围选择 spec 文件：

```bash
# 冒烟测试
QA_PROJECT={{project}} QA_SUITE_NAME="{{suite_name}}" bunx playwright test workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/smoke.spec.ts \
  --project=chromium

# 完整测试
QA_PROJECT={{project}} QA_SUITE_NAME="{{suite_name}}" bunx playwright test workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/full.spec.ts \
  --project=chromium
```

> `QA_SUITE_NAME` 用于动态生成报告路径和标题，报告输出至 `workspace/{{project}}/reports/playwright/{{YYYYMM}}/{{suite_name}}/`。

记录执行开始时间，计算 `duration`。

---

**✅ Task**：将 `步骤 7` 标记为 `completed`（subject: `步骤 7 — 回归完成，{{passed}}/{{total}} 通过`）。

## 步骤 8：处理结果

**⏳ Task**：将 `步骤 8` 标记为 `in_progress`。

**输出模板中的变量说明：**

- `{{full_spec_path}}`：步骤 6 生成的 `full.spec.ts` 完整路径（如 `workspace/{{project}}/tests/202604/登录功能/full.spec.ts`）
- `{{YYYYMM}}`：当月年月（如 `202604`）
- `{{suite_name}}`：需求名称（如 `登录功能`）

**8.1 全部通过**

```
✅ {{需求名称}} UI 自动化测试完成

通过：{{passed}} / {{total}}
耗时：{{duration}}
报告：workspace/{{project}}/reports/playwright/{{YYYYMM}}/{{suite_name}}/{{suite_name}}.html

验收命令（可直接复制运行）：
QA_SUITE_NAME="{{suite_name}}" bunx playwright test {{full_spec_path}} --project=chromium
```

**8.2 存在失败**

为每个失败的用例派发 `bug-reporter-agent`（model: haiku），输入：

- 失败的测试用例数据
- Playwright 错误信息
- 截图路径（`workspace/{{project}}/reports/playwright/{{YYYYMM}}/{{suite_name}}/` 下的截图）
- Console 错误日志

Bug 报告输出至：`workspace/{{project}}/reports/bugs/{{YYYYMM}}/ui-autotest-{{suite_name}}.html`

```
❌ {{需求名称}} UI 自动化测试完成（存在失败）

通过：{{passed}} / {{total}}
失败：{{failed}} 条
耗时：{{duration}}

失败用例：
{{#each failed_cases}}
- {{title}}（{{error_summary}}）
{{/each}}

Bug 报告：workspace/{{project}}/reports/bugs/{{YYYYMM}}/ui-autotest-{{suite_name}}.html

验收命令（可直接复制运行）：
QA_SUITE_NAME="{{suite_name}}" bunx playwright test {{full_spec_path}} --project=chromium
```

---

**✅ Task**：将 `步骤 8` 标记为 `completed`（subject: `步骤 8 — 结果已处理`）。

## 步骤 9：发送通知

**⏳ Task**：将 `步骤 9` 标记为 `in_progress`。

```bash
bun run .claude/scripts/plugin-loader.ts notify \
  --event ui-test-completed \
  --data '{
    "passed": {{passed}},
    "failed": {{failed}},
    "specFiles": ["{{spec_file}}"],
    "reportFile": "workspace/{{project}}/reports/playwright/{{YYYYMM}}/{{suite_name}}/{{suite_name}}.html",
    "duration": "{{duration}}"
  }'
```

**✅ Task**：将 `步骤 9` 标记为 `completed`（subject: `步骤 9 — 通知已发送`）。

---

## 异常处理

任意步骤执行失败时：

1. 向用户报告失败节点和原因
2. 发送 `workflow-failed` 通知：

```bash
bun run .claude/scripts/plugin-loader.ts notify \
  --event workflow-failed \
  --data '{"step":"{{step_name}}","reason":"{{error_msg}}"}'
```

3. 提供重试选项，不强制退出

---

## 输出目录约定

| 类型                 | 路径                                                    |
| -------------------- | ------------------------------------------------------- |
| 临时代码块           | `workspace/{{project}}/.temp/ui-blocks/`                |
| E2E spec 文件        | `workspace/{{project}}/tests/YYYYMM/{{suite_name}}/`    |
| Playwright HTML 报告 | `workspace/{{project}}/reports/playwright/YYYYMMDD/`    |
| Bug 报告             | `workspace/{{project}}/reports/bugs/YYYYMMDD/`          |
| Session 文件         | `.auth/session.json`                                    |
