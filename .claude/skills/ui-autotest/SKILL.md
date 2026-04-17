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
<rule id="reference_permission">允许用实际 DOM、playwright-cli snapshot 与只读源码来修正脚本；前端 DOM 与用例不符时，直接反向更新 Archive MD，无需确认。</rule>
<rule id="archive_writeback">前端 DOM 不一致（页面结构、字段名、按钮文本、流程步骤等）→ 直接写回 Archive MD，追加注释后通知用户；非前端原因（需求逻辑变更等）→ 展示差异预览并请用户确认。</rule>
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
| `步骤 6 — 合并脚本`   | `合并验证通过的脚本`   |
| `步骤 7 — 执行测试`   | `执行全量回归`         |
| `步骤 8 — 处理结果`   | `处理测试结果`         |
| `步骤 9 — 发送通知`   | `发送完成通知`         |

**状态推进规则**：

| 时机 | 操作 | subject 格式 |
|------|------|-------------|
| 步骤开始 | `TaskUpdate status=in_progress` | `步骤 N — 开始` |
| 步骤完成 | `TaskUpdate status=completed` | `步骤 N — {{结果摘要}}` |
| 步骤 5 子任务 | 每条用例创建子任务 | `自测 {{case_id}} — {{title}}` |

各步骤遵循此 schema，不再单独说明。

步骤 4 进入后，为每条用例创建子任务（subject: `[脚本] {{title}}`），Sub-Agent 完成时标记 `completed`。

步骤 5 进入后，为每条待验证用例创建独立子任务（subject: `[自测] {{title}}`，activeForm: `执行「{{title}}」`）。每条用例：开始执行 → `in_progress`；修复重试 → subject 追加 `— 第 {{n}} 轮修复中`；通过 → `completed`（subject: `[自测] {{title}} — 通过`）；3 轮失败 → `completed`（subject: `[自测] {{title}} — 失败（{{原因}}）`）。

### 命令别名

| 别名 | 完整命令 |
|------|----------|
| `@progress:create` | `bun run .claude/scripts/ui-autotest-progress.ts create --project {{project}} --suite "{{suite}}" ...` |
| `@progress:update` | `bun run .claude/scripts/ui-autotest-progress.ts update --project {{project}} --suite "{{suite}}" ...` |
| `@progress:summary` | `bun run .claude/scripts/ui-autotest-progress.ts summary --project {{project}} --suite "{{suite}}"` |
| `@progress:reset` | `bun run .claude/scripts/ui-autotest-progress.ts reset --project {{project}} --suite "{{suite}}"` |
| `@progress:resume` | `bun run .claude/scripts/ui-autotest-progress.ts resume --project {{project}} --suite "{{suite}}"` |
| `@parse-cases` | `bun run .claude/skills/ui-autotest/scripts/parse-cases.ts --file {{md_path}}` |
| `@merge-specs` | `bun run .claude/skills/ui-autotest/scripts/merge-specs.ts ...` |

> 当 `{{env}}` 已确定时，所有 `@progress:*` 命令均追加 `--env {{env}}` 参数。

### 脚本编码规范

参见 `.claude/references/playwright-patterns.md`，包含：

- **共享工具库分层架构**（第 1 章）— 函数归属判断标准、新增函数规则
- step() 函数、Meta 注释、定位器优先级、表单填写和表格验证模式

### 共享工具库

`lib/playwright/` 提供跨项目通用的 Ant Design 交互函数，所有 sub-agent 生成脚本时**必须优先使用**，禁止内联重新实现：

| 分类 | 函数 | 用途 |
|------|------|------|
| Select | `selectAntOption` | 下拉选择（含虚拟滚动 fallback） |
| Message | `expectAntMessage` | 等待 Message/Notification 提示 |
| Modal | `waitForAntModal` / `confirmAntModal` / `closeAntModal` | 弹窗操作 |
| Drawer | `waitForAntDrawer` / `closeAntDrawer` / `waitForOverlay` | 抽屉 & 浮层 |
| Popconfirm | `confirmPopconfirm` / `cancelPopconfirm` | 气泡确认框 |
| Table | `waitForTableLoaded` / `findTableRow` | 表格加载 & 行定位 |
| Form | `locateFormItem` / `expectFormError` / `expectNoFormError` | 表单字段 & 验证 |
| Tabs | `switchAntTab` | 标签页切换 |
| Checkbox | `checkAntCheckbox` / `uncheckAntCheckbox` | 复选框（幂等） |
| Radio | `clickAntRadio` | 单选 |
| Dropdown | `clickDropdownMenuItem` | 下拉菜单项点击 |
| Navigation | `navigateViaMenu` | 侧边栏菜单导航 |
| Utils | `uniqueName` / `todayStr` | 测试数据工具 |

引用方式：`import { selectAntOption } from "../../helpers/test-setup"` （通过项目 helpers re-export）。

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
bun run .claude/scripts/preference-loader.ts load --project {{project}} > workspace/{{project}}/.temp/preferences-merged.json
```

后续步骤通过此 JSON 传递偏好给 sub-agent，不再各自读 preferences/ 目录。

---

## 步骤 1：解析输入

按 Task Schema 更新：创建 9 个主流程任务，将 `步骤 1` 标记为 `in_progress`。

**1.1 参数提取**

从用户输入中提取：

- `md_path`：Archive MD 文件路径（支持功能名模糊匹配 → 在 `workspace/{{project}}/archive/` 下搜索）
- `url`：目标测试 URL（如 `https://www.bing.com/`）
- `env`：环境标识（如 `ltqcdev`、`ci63`）。优先从用户输入提取；若未指定，读取 `ACTIVE_ENV` 环境变量；若仍为空，从 `url` 的域名推断或向用户询问

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
      "title": "【P0】验证xxx",
      "priority": "P0",
      "page": "列表页",
      "steps": [{ "step": "进入【xxx】页面", "expected": "页面正常加载" }],
      "preconditions": "前置条件说明"
    }
  ],
  "stats": { "total": 20, "P0": 5, "P1": 10, "P2": 5 }
}
```

其中 `title` 保留 Archive MD 原始 H5 标题（Contract B），`priority` 为从该标题中额外提取出的结构化字段。

---

按 Task Schema 更新：将 `步骤 1` 标记为 `completed`（subject: `步骤 1 — 解析完成，{{total}} 条用例`）。

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

然后读取 summary，向用户展示：

```
检测到上次未完成的执行进度：

套件：{{suite_name}}
中断于：步骤 {{current_step}}
进度：{{passed}} 通过, {{failed}} 失败, {{pending}} 待执行
上次更新：{{updated_at}}
{{#if expired}}⚠️ 上次进度已超过 7 天，环境可能已变化。建议选择「全部重新开始」。{{/if}}

请选择：
1. 继续执行（跳过已通过，从待执行的继续）
2. 重试失败项（重跑失败用例，再继续待执行的）
3. 全部重新开始（清空进度，从头来）
```

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
bun run .claude/skills/ui-autotest/scripts/session-login.ts --url {{url}} --output .auth/session-{{env}}.json
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

按 Task Schema 更新：将 `步骤 4` 标记为 `in_progress`，并为每条用例创建脚本生成子任务。

**💾 进度持久化 — 初始化**：

若不是从断点恢复（即步骤 1.5 未检测到进度文件），创建进度文件：

```bash
bun run .claude/scripts/ui-autotest-progress.ts create \
  --project {{project}} \
  --suite "{{suite_name}}" \
  --env "{{env}}" \
  --archive "{{md_path}}" \
  --url "{{url}}" \
  --priorities "{{selected_priorities | join(',')}}" \
  --output-dir "workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/" \
  --cases '{{tasks_json}}'
```

其中 `tasks_json` 为 `{id: {title, priority}}` 格式的 JSON，从步骤 1 解析结果构造。

**4.0 源码分析（每次生成脚本前必做）**

在生成任何脚本之前，先阅读 `workspace/{{project}}/.repos/` 下的相关前端源码，梳理：

- **当前迭代需求与主流程的关系**：理解新增功能在现有系统中的位置
- **页面路由和菜单结构**：确认导航方式和路径（检查 `router/`、`routes/` 配置）
- **组件层次和表单结构**：了解页面实际的表单项、按钮文本、选择器结构
- **接口调用方式**：确认 API 路径（检查 service 层）

> 这一步的信息将直接指导脚本中选择器和导航方式的编写，避免盲猜。

**4.1 分发任务**

按 `selected_priorities` 过滤 `tasks`，最多 **5 个 sub-agent 并发**执行脚本生成。

每个 sub-agent 接收：

- 单条测试用例数据（`id`, `title`, `priority`, `page`, `steps`, `preconditions`）
- 目标 URL
- 派发 `script-writer-agent`（model: sonnet），每个 sub-agent 独立生成一条脚本
- **共享工具库清单**：`lib/playwright/index.ts` 的导出函数列表（agent 必须优先使用，禁止重复实现）
- 参考资料：playwright-cli skill 的 references（获取 API 用法）
- 步骤 4.0 中源码分析的关键发现（路由路径、组件结构、API 路径等）

**4.2 前置条件处理（6 步工作流）**

> **核心原则**：建表只看 CREATE TABLE 语句，不纠结数据库名称。数据库通过离线 API 操作。**禁止**生成单独的 `setup.spec.ts` 通过 UI 自动化建表。

当用例的 `preconditions` 包含 SQL 建表/数据准备时：

1. **分析建表语句**：从前置条件中提取 CREATE TABLE + INSERT 语句，忽略数据库名
2. **通过 API 建表**：在脚本的 `test.beforeAll` 中使用 `setupPreconditions`（来自 `assets-sql-sync` 插件），它会自动：查找离线项目 → 获取数据源 → 执行 DDL → 引入数据源 → 元数据同步
3. **数据源引入**：`setupPreconditions` 自动处理，无需额外操作
4. **判断是否涉及数据质量**：如果需求与数据质量模块相关（规则集、规则任务、质量报告等），需要额外创建资产项目（命名：`Story_{{prd_id}}`）
5. **数据源授权**：将测试数据源授权给资产项目
6. **验证可见性**：测试第一步验证数据质量模块能看到数据源/库/表

如果离线开发中没有项目或对接计算引擎太复杂，使用 AskUserQuestion 请求用户手动创建。

具体用法参见 `script-writer-agent` 的「前置条件处理」章节。

若用例同时包含多张表的 SQL，可将 SQL 文件放在 `workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/sql/` 目录下，脚本中通过 `readFileSync` 读取。

**4.3 输出格式**

每个 sub-agent 输出代码块，保存到：

```
workspace/{{project}}/.temp/ui-blocks/{{suite_slug}}/{{id}}.ts
```

代码块格式（import 路径须与 `script-writer-agent` 的 output_contract 一致）：

```typescript
// META: {"id":"t1","priority":"P0","title":"【P0】验证xxx"}
import { test, expect } from "../../fixtures/step-screenshot";
// ... Playwright test code
```

---

**💾 进度持久化 — 脚本生成完成**：

每条用例的 sub-agent 完成后，更新进度：

```bash
bun run .claude/scripts/ui-autotest-progress.ts update --project {{project}} --suite "{{suite_name}}" --env "{{env}}" --case {{id}} --field generated --value true
bun run .claude/scripts/ui-autotest-progress.ts update --project {{project}} --suite "{{suite_name}}" --env "{{env}}" --case {{id}} --field script_path --value "workspace/{{project}}/.temp/ui-blocks/{{suite_slug}}/{{id}}.ts"
```

断点恢复时，跳过 `generated === true` 的用例，只生成剩余的。

按 Task Schema 更新：所有 Sub-Agent 完成后，将 `步骤 4` 标记为 `completed`（subject: `步骤 4 — {{n}} 条脚本已生成`）。

**💾 进度持久化 — 步骤 4 完成**：

```bash
bun run .claude/scripts/ui-autotest-progress.ts update --project {{project}} --suite "{{suite_name}}" --env "{{env}}" --field current_step --value 5
```

## 步骤 5：逐条自测与修复（强制，不可跳过）

> **⚠️ 强制规则：每条脚本必须单独执行验证通过后才能进入合并阶段。仅编译通过不代表验证通过，未经实际执行验证的脚本禁止交付。**

按 Task Schema 更新：将 `步骤 5` 标记为 `in_progress`，并为每条待验证用例创建自测子任务。

**5.1 逐条执行验证**

**💾 进度持久化 — 前置条件就绪**：

前置条件（建表/引入/同步/质量项目授权）完成后：

```bash
bun run .claude/scripts/ui-autotest-progress.ts update --project {{project}} --suite "{{suite_name}}" --env "{{env}}" --field preconditions_ready --value true
```

断点恢复时，若 `preconditions_ready === true`，跳过前置条件准备。

对 `workspace/{{project}}/.temp/ui-blocks/{{suite_slug}}/` 中的每个代码块，逐条执行 Playwright 测试：

```bash
ACTIVE_ENV={{env}} QA_PROJECT={{project}} bunx playwright test workspace/{{project}}/.temp/ui-blocks/{{suite_slug}}/{{id}}.ts --project=chromium --timeout=30000
```

**💾 进度持久化 — 自测状态**：

每条用例执行前：

```bash
bun run .claude/scripts/ui-autotest-progress.ts update --project {{project}} --suite "{{suite_name}}" --env "{{env}}" --case {{id}} --field test_status --value running
```

执行结果（通过）：

```bash
bun run .claude/scripts/ui-autotest-progress.ts update --project {{project}} --suite "{{suite_name}}" --env "{{env}}" --case {{id}} --field test_status --value passed
```

执行结果（失败）：

```bash
bun run .claude/scripts/ui-autotest-progress.ts update \
  --project {{project}} \
  --suite "{{suite_name}}" \
  --env "{{env}}" \
  --case {{tN}} \
  --field test_status --value failed \
  --error "{{error_summary}}"
```

断点恢复时，跳过 `test_status === "passed"` 的用例。对于 `test_status === "failed"` 且 `attempts >= 3` 的用例，也跳过（除非用户选择「重试失败项」）。

**5.2 失败处理（派发 Sub-Agent，最多重试 3 轮）**

> **⚠️ 主 agent 上下文保护规则：主 agent 绝不自行调试脚本。** 失败时派发 `script-fixer-agent`，仅传递精简错误信息（见下文错误分类）。详细修复流程见 script-fixer-agent 自身定义。

**错误分类提取**

主 agent 从 Playwright stderr 用正则提取错误类型，不读完整输出：

| 正则模式 | error_type |
|----------|------------|
| `Timeout \d+ms exceeded` | timeout |
| `locator\..*resolved to \d+ elements?\|waiting for locator` | locator |
| `expect\(.*\)\.(toHave\|toBe\|toContain\|toMatch)` | assertion |
| 以上均不匹配 | unknown |

派发给 script-fixer-agent 的精简信息：

```json
{
  "error_type": "timeout | locator | assertion | unknown",
  "script_path": "workspace/{{project}}/.temp/ui-blocks/{{suite_slug}}/{{id}}.ts",
  "stderr_last_20_lines": "...",
  "attempt": 1,
  "url": "{{url}}",
  "repos_dir": "workspace/{{project}}/.repos/"
}
```

Sub-Agent 返回 `FIXED` → 更新进度 `test_status = "passed"`；返回 `STILL_FAILING` → 更新 `test_status = "failed"` 并通过 `--error` 追加到 `error_history`，`attempts < 3` 则再派发一轮，否则标记放弃。

**5.3 Archive MD 反向更新**

Sub-Agent 在修复过程中若发现 MD 用例描述与实际系统行为不一致，将在返回结果中附带 `corrections` 字段，并标注 `reason_type`：

- `frontend`：前端 DOM 变化（页面结构、字段名、按钮文本、流程步骤、选项值等）
- `logic`：需求逻辑变更（业务规则、预期结果等）

主 agent 收集所有 corrections 后，按 `reason_type` 分两类处理：

**前端类（自动写回）**

直接更新 Archive MD，追加注释 `<!-- 由 ui-autotest 自测校正 -->`，完成后通知用户：

```
已自动同步以下用例（前端 DOM 变更）：

{{#each frontend_corrections}}
- {{case_title}}：{{field}} "{{current}}" → "{{proposed}}"
{{/each}}
```

**逻辑类（需确认）**

展示差异预览，等待用户确认后才写回：

```
以下用例存在需求逻辑差异，请确认是否更新：

{{#each logic_corrections}}
- {{case_title}}：{{field}} "{{current}}" → "{{proposed}}" (依据: {{evidence}})
{{/each}}

是否更新 Archive MD？
1. 不更新（默认）
2. 更新
```

**5.4 3 次重试仍失败的处理**

若某条用例经过 3 轮 sub-agent 修复仍无法通过：

1. 记录为「环境/平台问题」，标记失败原因
2. 将该用例从待合并列表中移除（不影响其他用例）
3. 在最终报告中单独列出，注明失败原因和 sub-agent 已尝试的修复措施
4. **不自动生成 Bug 报告**，改为向用户报告：

```
以下用例经过 3 轮 sub-agent 修复仍未通过，可能为环境或平台问题：

- {{title}}：{{最后一次的错误摘要}}
  已尝试：{{修复措施列表}}

建议：手动检查测试环境后重试，或调整用例预期。
```

---

按 Task Schema 更新：所有用例自测完成后，将 `步骤 5` 标记为 `completed`（subject: `步骤 5 — {{passed}}/{{total}} 通过`）。

**💾 进度持久化 — 步骤 5 完成**：

```bash
bun run .claude/scripts/ui-autotest-progress.ts update --project {{project}} --suite "{{suite_name}}" --env "{{env}}" --field current_step --value 6
```

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
ACTIVE_ENV={{env}} QA_PROJECT={{project}} QA_SUITE_NAME="{{suite_name}}" bunx playwright test workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/smoke.spec.ts \
  --project=chromium

# 完整测试
ACTIVE_ENV={{env}} QA_PROJECT={{project}} QA_SUITE_NAME="{{suite_name}}" bunx playwright test workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/full.spec.ts \
  --project=chromium
```

> `QA_SUITE_NAME` 用于动态生成报告路径和标题，报告输出至 `workspace/{{project}}/reports/playwright/{{YYYYMM}}/{{suite_name}}/{{env}}/`。

记录执行开始时间，计算 `duration`。

---

按 Task Schema 更新：将 `步骤 7` 标记为 `completed`（subject: `步骤 7 — 回归完成，{{passed}}/{{total}} 通过`）。

## 步骤 8：处理结果

按 Task Schema 更新：将 `步骤 8` 标记为 `in_progress`。

**输出模板中的变量说明：**

- `{{full_spec_path}}`：步骤 6 生成的 `full.spec.ts` 完整路径（如 `workspace/{{project}}/tests/202604/登录功能/full.spec.ts`）
- `{{YYYYMM}}`：当月年月（如 `202604`）
- `{{suite_name}}`：需求名称（如 `登录功能`）

**8.1 全部通过**

```
✅ {{需求名称}} UI 自动化测试完成

通过：{{passed}} / {{total}}
耗时：{{duration}}
报告：workspace/{{project}}/reports/playwright/{{YYYYMM}}/{{suite_name}}/{{env}}/{{suite_name}}.html

验收命令（可直接复制运行）：
ACTIVE_ENV={{env}} QA_SUITE_NAME="{{suite_name}}" bunx playwright test {{full_spec_path}} --project=chromium
```

**8.2 存在失败**

为每个失败的用例派发 `bug-reporter-agent`（model: haiku），输入：

- 失败的测试用例数据
- Playwright 错误信息
- 截图路径（`workspace/{{project}}/reports/playwright/{{YYYYMM}}/{{suite_name}}/{{env}}/` 下的截图）
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
ACTIVE_ENV={{env}} QA_SUITE_NAME="{{suite_name}}" bunx playwright test {{full_spec_path}} --project=chromium
```

---

按 Task Schema 更新：将 `步骤 8` 标记为 `completed`（subject: `步骤 8 — 结果已处理`）。

## 步骤 9：发送通知

按 Task Schema 更新：将 `步骤 9` 标记为 `in_progress`。

```bash
bun run .claude/scripts/plugin-loader.ts notify \
  --event ui-test-completed \
  --data '{
    "passed": {{passed}},
    "failed": {{failed}},
    "specFiles": ["{{spec_file}}"],
    "reportFile": "workspace/{{project}}/reports/playwright/{{YYYYMM}}/{{suite_name}}/{{env}}/{{suite_name}}.html",
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

| 类型                 | 路径                                                                        |
| -------------------- | --------------------------------------------------------------------------- |
| 临时代码块           | `workspace/{{project}}/.temp/ui-blocks/{{suite_slug}}/`                     |
| E2E spec 文件        | `workspace/{{project}}/tests/YYYYMM/{{suite_name}}/`                        |
| Playwright HTML 报告 | `workspace/{{project}}/reports/playwright/YYYYMM/{{suite_name}}/{{env}}/`   |
| Bug 报告             | `workspace/{{project}}/reports/bugs/YYYYMM/ui-autotest-{{suite_name}}.html` |
| Session 文件         | `.auth/session-{{env}}.json`                                                |
