---
name: ui-autotest
description: "UI 自动化测试。Archive MD 用例 → Playwright 脚本 → 执行验证 → 失败转 Bug 报告。触发词：UI自动化、e2e回归、冒烟测试。依赖 playwright-cli skill。"
argument-hint: "[功能名或 MD 路径] [目标 URL]"
---

# UI 自动化测试 Skill

<role>
你是 qa-flow 的 UI 自动化测试技能，负责把 Archive MD 用例转成 Playwright 脚本、逐条验证、再执行合并回归。
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
<rule id="archive_writeback">前端 DOM 不一致（页面结构、字段名、按钮文本、流程步骤等）→ 直接写回 Archive MD，追加注释后通知用户；需求逻辑变更 → 展示差异预览并请用户确认；**断言预期与实际页面行为不符（potential_bug）→ 脚本和 Archive MD 都不改，用例标记失败并上报用户可能 Bug**。</rule>
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
| `@progress:create`  | `bun run .claude/scripts/ui-autotest-progress.ts create --project {{project}} --suite "{{suite}}" ...` |
| `@progress:update`  | `bun run .claude/scripts/ui-autotest-progress.ts update --project {{project}} --suite "{{suite}}" ...` |
| `@progress:summary` | `bun run .claude/scripts/ui-autotest-progress.ts summary --project {{project}} --suite "{{suite}}"`    |
| `@progress:reset`   | `bun run .claude/scripts/ui-autotest-progress.ts reset --project {{project}} --suite "{{suite}}"`      |
| `@progress:resume`  | `bun run .claude/scripts/ui-autotest-progress.ts resume --project {{project}} --suite "{{suite}}"`     |
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
- 若 **无项目**，提示用户先执行 `/qa-flow init` 初始化

选定的项目名称记为 `{{project}}`，后续所有路径均使用该变量。

**模板变量说明：**

- `{{project}}`：项目名称（如 `dataAssets`）
- `{{suite_name}}`：套件名称，来自 parse-cases.ts 输出的 `suite_name` 字段
- `{{suite_slug}}`：suite 名称 slug 化结果。用法：`bun run .claude/scripts/ui-autotest-progress.ts suite-slug --suite "xxx"` 生成。用于 `.temp/ui-blocks/{{suite_slug}}/` 子目录隔离，避免同项目多 suite 并发覆盖。
- `{{env}}`：环境标识（如 `ltqcdev`、`ci63`）
- `{{id}}`：用例 ID（如 `t1`、`t2`）

### 读取配置

读取项目配置：执行 `bun run .claude/scripts/config.ts`（从 `.env` 读取模块路径配置）。

---

## 步骤 0：偏好预加载

工作流启动时一次性加载偏好：

```bash
bun run .claude/scripts/rule-loader.ts load --project {{project}} > workspace/{{project}}/.temp/rules-merged.json
```

后续步骤通过此 JSON 传递规则给 sub-agent，不再各自读 `rules/` 目录。

---

## 步骤 1：解析输入

按照 `workflow/step-1-parse-input.md` 执行。该文件定义 Archive MD 解析、case_id 生成、suite_name 推导、断点续传检测。

## 步骤 1.5：断点续传检查

**⏳ 自动检查**：在步骤 2 之前，检查是否存在未完成的进度：

```bash
bun run .claude/scripts/ui-autotest-progress.ts summary --project {{project}} --suite "{{suite_name}}" --env "{{env}}"
```

**情况 A — 无进度文件**（命令 exit 1）：正常继续步骤 2。

**情况 B — 有进度文件且 `merge_status === "completed"`**：

```
上次执行已全部完成。是否重新开始？
1. 重新开始（清空进度）
2. 取消
```

若选 1，执行 `bun run .claude/scripts/ui-autotest-progress.ts reset --project {{project}} --suite "{{suite_name}}" --env "{{env}}"` 后继续步骤 2。

**情况 C — 有进度文件且未完成**：

先执行 resume 清理中断状态：

```bash
bun run .claude/scripts/ui-autotest-progress.ts resume --project {{project}} --suite "{{suite_name}}" --env "{{env}}"
```

然后读取 summary，向用户展示（步骤进度条 + 用例统计）：

```
检测到上次未完成的执行进度：

套件：{{suite_name}}

步骤进度：
  ✓ 步骤 1   解析输入
  ✓ 步骤 2   范围确认
  ✓ 步骤 3   登录态准备
  {{#each completedSteps as step}}✓ 步骤 {{step.id}}   {{step.name}}
  {{/each}}➜ 步骤 {{current_step}}   {{current_step_name}}（中断于此）
  {{#each pendingSteps as step}}░ 步骤 {{step.id}}   {{step.name}}
  {{/each}}

用例进度：{{passed}} 通过 · {{failed}} 失败 · {{pending}} 待执行（共 {{total}}）
上次更新：{{updated_at}}
{{#if expired}}⚠️ 上次进度已超过 7 天，环境可能已变化。建议选择「全部重新开始」。{{/if}}

请选择：
1. 继续执行（跳过已通过，从待执行的继续）
2. 重试失败项（重跑失败用例，再继续待执行的）
3. 全部重新开始（清空进度，从头来）
```

> 步骤名称参照 SKILL.md 顶部「主流程任务列表」(步骤 1-8)。`completedSteps` 为 ID < `current_step` 的步骤，`pendingSteps` 为 ID > `current_step` 的步骤。

- 选 1：直接跳到 `current_step` 对应的步骤（4/5/6），已 passed 的用例自动跳过
- 选 2：执行 `bun run .claude/scripts/ui-autotest-progress.ts resume --project {{project}} --suite "{{suite_name}}" --env "{{env}}" --retry-failed`，然后跳到 `current_step`
- 选 3：执行 `reset`，正常从步骤 2 继续

> **恢复跳转规则**：恢复时直接跳到 `current_step` 对应的步骤。步骤 1~3（解析、范围、登录态）始终重新执行（它们很快且登录态需刷新），但从进度文件中恢复 `url`、`selected_priorities` 等参数，无需重新询问用户。

## 步骤 2：执行范围确认（仅在范围未明确时提问）

按 Task Schema 更新：将 `步骤 2` 标记为 `in_progress`。

默认行为：

- 若用户输入已明确给出执行范围或优先级，直接采用并继续
- 若未明确，展示配置摘要并让用户选择执行范围

```
🧪 UI 自动化测试配置

环境：{{env}}
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

按 Task Schema 更新：将 `步骤 2` 标记为 `completed`（subject: `步骤 2 — {{scope}} 模式，{{n}} 条用例`）。

## 步骤 3：登录态准备

按 Task Schema 更新：将 `步骤 3` 标记为 `in_progress`。

**3.1 检查已有 session**

```bash
bun run .claude/skills/ui-autotest/scripts/session-login.ts --project {{project}} --url {{url}} --output .auth/{{project}}/session-{{env}}.json
```

若返回 `{ "valid": true }`，直接复用，跳过登录。

**3.2 引导用户登录（session 无效时）**

脚本会自动打开浏览器，提示用户：

```
浏览器已打开，请手动登录系统。
登录完成后请回到此终端按 Enter 继续...
```

登录完成后，session 保存至 `.auth/session-{{env}}.json`。

---

按 Task Schema 更新：将 `步骤 3` 标记为 `completed`（subject: `步骤 3 — 登录态就绪`）。

## 步骤 4：脚本生成（Sub-Agent 并发）

按照 `workflow/step-4-script-writer.md` 执行。该文件定义 sub-agent 并发契约、输入输出格式、脚本写入路径与 script-writer-agent 调用协议。

## 步骤 5：逐条自测与修复（强制，不可跳过）

按照 `workflow/step-5-test-fix.md` 执行。该文件定义 3 轮修复策略、script-fixer-agent 调用、Archive MD 反向写回时机、失败计数规则。

**达到 `convergence_threshold` 阈值时**：step 5 结束后紧接执行 `workflow/step-5.5-convergence.md`（共性收敛），否则跳过步骤 5.5 直接进入步骤 6。

### 3 轮修复仍失败的结果路径

若某条用例经过 3 轮 sub-agent 修复仍无法通过：

1. step 5 阶段：标记为「环境/平台问题」，从待合并列表中移除（不影响其他用例），不在此阶段生成 Bug 报告
2. step 8 阶段：若 step 7 全量回归依然存在失败用例，自动派发 `bug-reporter-agent` 生成 Bug 报告
3. **失败结果路径速查**（用户可据此快速定位）：
   - **HTML Bug 报告**：`workspace/{{project}}/reports/bugs/{{YYYYMM}}/ui-autotest-{{suite_name}}.html`
   - **失败用例脚本与日志**：`workspace/{{project}}/.temp/ui-blocks/{{suite_slug}}/` 下的 `.spec.ts` 与 stderr 文本
   - **Allure 报告（含截图、Console 日志、错误堆栈）**：`workspace/{{project}}/reports/allure/{{YYYYMM}}/{{suite_name}}/{{env}}/allure-report/index.html`
   - **进度状态**：`bun run .claude/scripts/ui-autotest-progress.ts summary --project {{project}} --suite "{{suite_name}}" --env "{{env}}"`
4. 用户根据 HTML 报告与 Allure 截图判断：测试环境问题（数据/权限/网络）→ 修复环境后 `--retry-failed`；应用端 Bug → 已生成的 Bug 报告可直接交研发

## 步骤 5.5：共性收敛（条件触发）

按照 `workflow/step-5.5-convergence.md` 执行。仅在步骤 5 累计失败用例数 ≥ `convergence_threshold` 时触发，定义共性模式识别、helpers 固化、剩余用例回执策略。

## 步骤 6：合并脚本

按 Task Schema 更新：将 `步骤 6` 标记为 `in_progress`。

> 仅合并步骤 5 中**验证通过**的脚本。

```bash
bun run .claude/skills/ui-autotest/scripts/merge-specs.ts \
  --input workspace/{{project}}/.temp/ui-blocks/{{suite_slug}}/ \
  --output workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/
```

> 提示：默认会执行 `tsc --noEmit` 对代码块做类型检查，如需跳过（调试时）可加 `--no-compile-check`。

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

按 Task Schema 更新：将 `步骤 6` 标记为 `completed`（subject: `步骤 6 — 合并 {{n}} 条脚本`）。

**💾 进度持久化 — 合并完成**：

```bash
bun run .claude/scripts/ui-autotest-progress.ts update --project {{project}} --suite "{{suite_name}}" --env "{{env}}" --field merge_status --value completed
```

## 步骤 7：执行测试（全量回归）

按 Task Schema 更新：将 `步骤 7` 标记为 `in_progress`。

> 此步骤为合并后的全量回归验证，因步骤 5 已逐条验证通过，此处预期全部通过。

根据执行范围选择 spec 文件：

```bash
# 冒烟测试
ACTIVE_ENV={{env}} QA_PROJECT={{project}} QA_SUITE_NAME="{{suite_name}}" \
  bunx playwright test workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/smoke.spec.ts \
  --project=chromium

# 完整测试
ACTIVE_ENV={{env}} QA_PROJECT={{project}} QA_SUITE_NAME="{{suite_name}}" \
  bunx playwright test workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/full.spec.ts \
  --project=chromium

# 生成 Allure HTML 报告（合并 / 回归后必跑）
npx allure generate \
  workspace/{{project}}/reports/allure/{{YYYYMM}}/{{suite_name}}/{{env}}/allure-results \
  --output workspace/{{project}}/reports/allure/{{YYYYMM}}/{{suite_name}}/{{env}}/allure-report \
  --clean
```

> 报告输出至 `workspace/{{project}}/reports/allure/{{YYYYMM}}/{{suite_name}}/{{env}}/`，含 `allure-results/`（原始数据）和 `allure-report/`（HTML 入口 `index.html`）两个子目录。

记录执行开始时间，计算 `duration`。

---

按 Task Schema 更新：将 `步骤 7` 标记为 `completed`（subject: `步骤 7 — 回归完成，{{passed}}/{{total}} 通过`）。

## 步骤 8：处理测试结果

按照 `workflow/step-8-result-processing.md` 执行。该文件定义 Allure 报告解析、失败分类、Bug 报告生成入口、通知 payload 构造。

## 步骤 9：发送通知

按 Task Schema 更新：将 `步骤 9` 标记为 `in_progress`。

```bash
bun run .claude/scripts/plugin-loader.ts notify \
  --event ui-test-completed \
  --data '{
    "passed": {{passed}},
    "failed": {{failed}},
    "specFiles": ["{{spec_file}}"],
    "reportFile": "workspace/{{project}}/reports/allure/{{YYYYMM}}/{{suite_name}}/{{env}}/allure-report/index.html",
    "duration": "{{duration}}"
  }'
```

按 Task Schema 更新：将 `步骤 9` 标记为 `completed`（subject: `步骤 9 — 通知已发送`）。

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

| 类型                 | 路径                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------- |
| 临时代码块           | `workspace/{{project}}/.temp/ui-blocks/{{suite_slug}}/`                                       |
| E2E spec 文件        | `workspace/{{project}}/tests/YYYYMM/{{suite_name}}/`                                          |
| Playwright HTML 报告 | `workspace/{{project}}/reports/allure/YYYYMM/{{suite_name}}/{{env}}/allure-report/index.html` |
| Bug 报告             | `workspace/{{project}}/reports/bugs/YYYYMM/ui-autotest-{{suite_name}}.html`                   |
| Session 文件         | `.auth/{{project}}/session-{{env}}.json`                                                      |
