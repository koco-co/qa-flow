---
name: ui-autotest
description: "UI 自动化测试。Archive MD 用例 → Playwright 脚本 → 执行验证 → 失败转 Bug 报告。触发词：UI自动化、e2e回归、冒烟测试。依赖 playwright-cli skill。"
argument-hint: "[功能名或 MD 路径] [目标 URL]"
---

# UI 自动化测试 Skill

<role>
你是 kata 的 UI 自动化测试技能，负责把 Archive MD 用例转成 Playwright 脚本、逐条验证、再执行合并回归。
</role>

<inputs>
- Archive MD 路径或功能名
- 目标 URL
- 环境标识（env）：从用户输入或 ACTIVE_ENV 环境变量获取，如 ltqcdev、ci63
- 当前项目配置、登录 session、只读源码副本
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
<rule id="reference_permission">允许用实际 DOM、playwright-cli snapshot 与只读源码来修正脚本的**操作步骤部分**（选择器、按钮文本、流程顺序）；断言/预期必须严格忠实于用例 `expected` 列原文，禁止为了通过而放宽断言。</rule>
<rule id="archive_writeback">**任何**与前端实际 DOM 不一致的偏差（页面结构、字段名、按钮文本、流程步骤、字段值等）一律由主 agent 通过 AskUserQuestion 让用户确认是「Bug / 用例描述错误 / 需求变更」三类之一后才能动作；禁止 sub-agent 自主判断"是 frontend 类就直接改 Archive"。同时必须发送 `ui-test-needs-input` IM 通知，把工作流挂起等用户回答。</rule>
<rule id="subagent_no_guess">Sub-agent（script-writer / script-fixer）遇到任何无法靠"读源码 + 看 DOM"机械确定的偏差，**必须**返回 `NEED_USER_INPUT` 状态把决策权交还主 agent，禁止自行猜测断言文本、字段名或流程步骤；这是反死循环的硬约束。</rule>
<rule id="assertion_fidelity">断言文本必须严格对齐用例预期原文。禁止扩大正则匹配（如 `/匹配成功|符合正则/`）、禁止用祖先元素全局 `filter({ hasText })`、禁止用 `toBeVisible()` 替代文本断言、禁止 try/catch 吞断言。违反即 Bug 被吞。</rule>
</confirmation_policy>

<output_contract>
<archive_contract>保留 Task 2 的 Archive MD 标题契约、`suite_name` 语义与 `parse-cases.ts` 解析约定。</archive_contract>
<artifacts>产物包括 UI blocks、合并 spec、Playwright HTML 报告；前端 DOM 不一致时自动更新 Archive MD；需求逻辑差异时输出校正建议待用户确认。</artifacts>
</output_contract>

<error_handling>
<defaultable_unknown>范围或环境细节缺失但不影响执行时，按默认值继续并在摘要中提示。</defaultable_unknown>
<blocking_unknown>登录、环境或页面结构缺口导致脚本无法继续时，终止该用例并在结果中说明。</blocking_unknown>
<invalid_input>Archive MD 路径、URL 或解析结果无效时，立即停止并要求修正输入。</invalid_input>
</error_handling>

<artifact_contract>
<xmind_intermediate contract="A">

<title>验证xxx</title>
<priority>P1</priority>
</xmind_intermediate>
<archive_md contract="B">
<display_title>【P1】验证xxx</display_title>
</archive_md>
</artifact_contract>

> 本 Skill 消费的是 Archive MD（Contract B）。
> `parse-cases.ts` 会保留原始 H5 标题到 `title`（如 `【P1】验证xxx`），并单独提取 `priority=P1`；示例与任务命名必须按此契约书写。

## 约定

### 共性收敛阈值

`convergence_threshold` 默认 `5`：步骤 5 累计失败用例数 ≥ 此值时触发步骤 5.5 共性收敛流程。

可被环境变量覆盖：`UI_AUTOTEST_CONVERGENCE_THRESHOLD=3 ./run-ui-autotest.sh`（小套件想更早收敛时使用）。

### Task Schema

> 全流程使用 `TaskCreate` / `TaskUpdate` 工具展示实时进度。

workflow 启动时（步骤 1 开始前），使用 `TaskCreate` 一次性创建 9 个任务，按顺序设置 `addBlockedBy` 依赖：

| 任务 subject          | activeForm             |
| --------------------- | ---------------------- |
| `步骤 1 — 解析输入`   | `解析用例文件`         |
| `步骤 2 — 执行范围`   | `确认执行范围`         |
| `步骤 3 — 登录态准备` | `准备登录 session`     |
| `步骤 4 — 脚本生成`   | `生成 Playwright 脚本` |
| `步骤 5 — 逐条自测`   | `执行自测验证`         |
| `步骤 5.5 — 共性收敛` | `分析共性失败模式`     |
| `步骤 6 — 合并脚本`   | `合并验证通过的脚本`   |
| `步骤 7 — 执行测试`   | `执行全量回归`         |
| `步骤 8 — 处理结果`   | `处理测试结果`         |
| `步骤 9 — 发送通知`   | `发送完成通知`         |

**状态推进规则**：

| 时机          | 操作                            | subject 格式                   |
| ------------- | ------------------------------- | ------------------------------ |
| 步骤开始      | `TaskUpdate status=in_progress` | `步骤 N — 开始`                |
| 步骤完成      | `TaskUpdate status=completed`   | `步骤 N — {{结果摘要}}`        |
| 步骤 5 子任务 | 每条用例创建子任务              | `自测 {{case_id}} — {{title}}` |

各步骤遵循此 schema，不再单独说明。

步骤 4 进入后，为每条用例创建子任务（subject: `[脚本] {{title}}`），Sub-Agent 完成时标记 `completed`。

步骤 5 进入后，为每条待验证用例创建独立子任务（subject: `[自测] {{title}}`，activeForm: `执行「{{title}}」`）。每条用例：开始执行 → `in_progress`；修复重试 → subject 追加 `— 第 {{n}} 轮修复中`；通过 → `completed`（subject: `[自测] {{title}} — 通过`）；3 轮失败 → `completed`（subject: `[自测] {{title}} — 失败（{{原因}}）`）。

**步骤 5.5（共性收敛，条件触发）**：步骤 5 失败数 ≥ `convergence_threshold` 时插入。任务初始 subject 为 `步骤 5.5 — 待评估`；触发时推进 `步骤 5.5 — 探路中` → `步骤 5.5 — 分析中` → `步骤 5.5 — 应用 N 项 helpers` → `步骤 5.5 — 完成`；不触发时 subject 设为 `步骤 5.5 — 未触发（失败<{{threshold}}）` 后 `completed`。

### 命令别名

| 别名                | 完整命令                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| `@progress:create`  | `kata-cli ui-autotest-progress create --project {{project}} --suite "{{suite}}" ...` |
| `@progress:update`  | `kata-cli ui-autotest-progress update --project {{project}} --suite "{{suite}}" ...` |
| `@progress:summary` | `kata-cli ui-autotest-progress summary --project {{project}} --suite "{{suite}}"`    |
| `@progress:reset`   | `kata-cli ui-autotest-progress reset --project {{project}} --suite "{{suite}}"`      |
| `@progress:resume`  | `kata-cli ui-autotest-progress resume --project {{project}} --suite "{{suite}}"`     |
| `@parse-cases`      | `bun run .claude/skills/ui-autotest/scripts/parse-cases.ts --file {{md_path}}`                         |
| `@merge-specs`      | `bun run .claude/skills/ui-autotest/scripts/merge-specs.ts ...`                                        |

> 当 `{{env}}` 已确定时，所有 `@progress:*` 命令均追加 `--env {{env}}` 参数。

### 脚本编码规范

参见 `.claude/references/playwright-patterns.md`，包含：

- **共享工具库分层架构**（第 1 章）— 函数归属判断标准、新增函数规则
- step() 函数、Meta 注释、定位器优先级、表单填写和表格验证模式

### 共享工具库

`lib/playwright/` 提供跨项目通用的 Ant Design 交互函数，所有 sub-agent 生成脚本时**必须优先使用**，禁止内联重新实现。函数清单、引用方式、禁止事项详见 `.claude/references/playwright-shared-lib.md`。

### 断言忠实原则

脚本生成/修复必须严格对齐用例 `expected` 原文，禁止用 `|` 扩大正则、祖先 `filter({hasText})`、`toBeVisible` 替代文本断言、try/catch 吞断言。完整规则详见 `.claude/references/assertion-fidelity.md`。

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
- 若 **无项目**，提示用户先执行 `/kata init` 初始化

选定的项目名称记为 `{{project}}`，后续所有路径均使用该变量。

**模板变量说明：**

- `{{project}}`：项目名称（如 `dataAssets`）
- `{{suite_name}}`：套件名称，来自 parse-cases.ts 输出的 `suite_name` 字段
- `{{suite_slug}}`：suite 名称 slug 化结果。用法：`kata-cli ui-autotest-progress suite-slug --suite "xxx"` 生成。用于 `.temp/ui-blocks/{{suite_slug}}/` 子目录隔离，避免同项目多 suite 并发覆盖。
- `{{env}}`：环境标识（如 `ltqcdev`、`ci63`）
- `{{id}}`：用例 ID（如 `t1`、`t2`）

### 读取配置

读取项目配置：执行 `kata-cli config`（从 `.env` 读取模块路径配置）。

---

## 步骤执行入口

各步骤的具体执行细节放在 `workflow/` 子目录，按需加载：

| 步骤 | 加载文件                                   |
| ---- | ------------------------------------------ |
| 0    | `workflow/step-0-preferences.md`           |
| 1    | `workflow/step-1-parse-input.md`           |
| 1.5  | `workflow/step-1.5-resume.md`              |
| 2    | `workflow/step-2-scope.md`                 |
| 3    | `workflow/step-3-login.md`                 |
| 4    | `workflow/step-4-script-writer.md`         |
| 5    | `workflow/step-5-test-fix.md`              |
| 5.5  | `workflow/step-5.5-convergence.md`（条件） |
| 6    | `workflow/step-6-merge.md`                 |
| 7    | `workflow/step-7-execute.md`               |
| 8    | `workflow/step-8-result-processing.md`     |
| 9    | `workflow/step-9-notify.md`                |

**执行约定**：

- 步骤 5 结束后，若累计失败数 ≥ `convergence_threshold`，加载 step-5.5，否则跳过直达步骤 6。
- 步骤 9 **必须由主 agent 亲自执行**（不派发 subagent），因为要用 `run_in_background` 启动常驻 allure 服务并读取 URL。

### 步骤 5 失败用例的结果路径速查

步骤 5 中某条用例经过 3 轮 sub-agent 修复仍无法通过时：

1. 标记为「环境/平台问题」，从待合并列表中移除（不影响其他用例），不在此阶段生成 Bug 报告
2. 若步骤 7 全量回归依然存在失败用例，步骤 8 自动派发 `bug-reporter-agent` 生成 Bug 报告
3. **失败结果路径**（用户可据此快速定位）：
   - **HTML Bug 报告**：`workspace/{{project}}/reports/bugs/{{YYYYMM}}/ui-autotest-{{suite_name}}.html`
   - **失败用例脚本与日志**：`workspace/{{project}}/.temp/ui-blocks/{{suite_slug}}/` 下的 `.spec.ts` 与 stderr 文本
   - **Allure 报告（含截图、Console 日志、错误堆栈）**：`workspace/{{project}}/reports/allure/{{YYYYMM}}/{{suite_name}}/{{env}}/allure-report/index.html`
   - **进度状态**：`kata-cli ui-autotest-progress summary --project {{project}} --suite "{{suite_name}}" --env "{{env}}"`
4. 用户根据 HTML 报告与 Allure 截图判断：测试环境问题（数据/权限/网络）→ 修复环境后 `--retry-failed`；应用端 Bug → 已生成的 Bug 报告可直接交研发

---

## 异常处理

任意步骤执行失败时：

1. 向用户报告失败节点和原因
2. 发送 `workflow-failed` 通知：

```bash
kata-cli plugin-loader notify \
  --event workflow-failed \
  --data '{"step":"{{step_name}}","reason":"{{error_msg}}"}'
```

3. 提供重试选项，不强制退出

---

## 输出目录约定

| 类型                 | 路径                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------- |
| 临时代码块           | `workspace/{{project}}/.temp/ui-blocks/{{suite_slug}}/`                                       |
| E2E spec 文件        | `workspace/{{project}}/tests/YYYYMM/{{suite_name}}/`                                          |
| Playwright HTML 报告 | `workspace/{{project}}/reports/allure/YYYYMM/{{suite_name}}/{{env}}/allure-report/index.html` |
| Bug 报告             | `workspace/{{project}}/reports/bugs/YYYYMM/ui-autotest-{{suite_name}}.html`                   |
| Session 文件         | `.auth/{{project}}/session-{{env}}.json`                                                      |
