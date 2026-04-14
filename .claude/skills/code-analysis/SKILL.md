---
name: code-analysis
description: "代码分析报告。将报错日志、合并冲突、禅道 Bug 链接转化为结构化 HTML 报告或 Hotfix 测试用例。触发词：帮我分析这个报错、分析冲突、看看这个异常、生成 bug 报告。禅道 Bug 链接（{{ZENTAO_BASE_URL}}/zentao/bug-view-{{bug_id}}.html）直接触发 Hotfix 用例生成。"
argument-hint: "[报错日志 | 禅道链接 | 冲突代码]"
---

<role>
你是 code-analysis 编排技能，负责把异常日志、冲突片段、禅道 Bug 链接路由到对应分析流程，并输出结构化 HTML 报告或 Hotfix 用例。
</role>

<inputs>
- 报错日志、冲突代码片段、禅道 Bug 链接、用户补充上下文
- `workspace/{{project}}` 输出目录、`config.ts` 配置、只读源码副本、报告模板
- 子 agent 返回的结构化 JSON 或 Archive Markdown
</inputs>

<modes>
  <mode id="A" output="HTML bug report">后端 Bug 分析</mode>
  <mode id="B" output="HTML conflict report">合并冲突分析</mode>
  <mode id="C" output="HTML bug report">前端 Bug 分析</mode>
  <mode id="D" output="补料清单">信息不足</mode>
  <mode id="E" output="Hotfix Archive MD">Hotfix 用例生成</mode>
</modes>

<confirmation_policy>
  <rule id="status_only">模式识别、分析摘要、报告生成完成仅作状态展示，不要求确认。</rule>
  <rule id="reference_sync">引用源码或执行 repo sync 前，先展示 repo/branch/path 摘要并请求允许；Hotfix 模式若已给出 fix_branch，可自动 sync 作为 reference，但不自动写回配置。</rule>
  <rule id="writeback">写回 `.env`、repo branch mapping 或其他配置前，必须单独展示变更预览并再次确认；拒绝写回时可继续本次分析。</rule>
</confirmation_policy>

<output_contract>
  <backend_bug_json>{"title":"...","summary":"...","classification":"environment|code|mixed|unknown","root_cause":"...","evidence":[],"fix_suggestions":[],"uncertainty":[]}</backend_bug_json>
  <frontend_bug_json>{"title":"...","summary":"...","classification":"environment|code|mixed|unknown","root_cause":"...","evidence":[],"fix_suggestions":[],"uncertainty":[]}</frontend_bug_json>
  <conflict_json>{"summary":"...","conflict_type":"logic|format|dependency","manual_decisions":[],"recommendations":[]}</conflict_json>
  <hotfix_artifact>Hotfix 场景输出 Archive Markdown，用于后续验证与归档。</hotfix_artifact>
</output_contract>

<error_handling>
  <defaultable_unknown>缺少辅助环境信息但主日志完整时，继续分析并给出补充检查项。</defaultable_unknown>
  <blocking_unknown>缺少完整堆栈、关键冲突块、repo/branch 等核心上下文时，返回补料请求或等待用户决策。</blocking_unknown>
  <invalid_input>输入为空、链接损坏、内容与识别模式不匹配时，立即返回输入无效。</invalid_input>
</error_handling>

<examples>
  <reference_gate>允许引用源码与允许写回配置是两道独立门禁，不能一次确认同时覆盖。</reference_gate>
  <status_summary>报告生成完成后直接展示路径和摘要；只有阻断态才继续追问。</status_summary>
</examples>

## 执行前准备

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

读取项目配置：执行 `bun run .claude/scripts/config.ts`（从 `.env` 读取模块、仓库、路径配置）。

---

## 符号使用规则（强制）

报告内容可能被粘贴到禅道等系统的富文本编辑器中，部分 Unicode 符号无法保存。必须遵守以下规则：

### 允许使用的符号（U+26xx 范围，已验证可写入禅道）

模板固定位置可使用以下符号作为视觉标记：

| 符号 | 用途 |
| --- | --- |
| ⚠️ | 警告、注意事项 |
| ⚙️ | 配置、环境相关 |
| ☑️ | 已完成、已验证 |
| ♻️ | 重构、可重试 |
| ✅ | 通过、正常 |
| ❌ | 失败、异常 |
| ☐ | 待办、未完成 |
| ⇒ | 指向、导致 |

### 禁止使用的符号（U+1Fxxx 范围，禅道无法保存）

**绝对不可**在报告输出中出现以下编码范围的符号：

> 🐛 📡 🚀 🔧 📦 🧪 💡 🔴 🟢 📊 📁 📝 🕐 📄 🏷 📍 🔀 ⚡ 👤 🤖 等所有 U+1Fxxx 编码符号

### AI 填充数据的约束

**模板中的固定文字**（标题、表头、分隔符等）可使用上述允许的符号。

**AI 分析后填入模板的动态数据**（root_cause、summary、fix_suggestions 等字段值）**不得包含任何 emoji 符号**，仅使用纯文本。

---

## 模式识别与路由

**优先级从高到低**，匹配到第一个即路由，不再继续检测：

| 优先级 | 模式               | 信号特征                                                                                | 输出          |
| ------ | ------------------ | --------------------------------------------------------------------------------------- | ------------- |
| 1      | **E: Hotfix 用例** | URL 含 `{{ZENTAO_BASE_URL}}/zentao/bug-view-`                                           | MD 用例文件   |
| 2      | **B: 合并冲突**    | 文本含 `<<<<<<< HEAD` / `=======` / `>>>>>>>`                                           | HTML 冲突报告 |
| 3      | **A: 后端 Bug**    | 含 `Exception`、`Caused by`、`java.lang`、堆栈行（`at {{class_name}}.{{method_name}}`） | HTML Bug 报告 |
| 4      | **C: 前端 Bug**    | 含 `TypeError`、`ReferenceError`、`ChunkLoadError`、`React error`、`Vue warn`           | HTML Bug 报告 |
| 5      | **D: 信息不足**    | 描述模糊，无明确错误信号                                                                | 补料清单      |

---

## 模式 A — 后端 Bug 分析

### 步骤

**A1. 派发分析 Agent**

派发 `backend-bug-agent`（model: sonnet），传入报错日志和源码上下文，由 Agent 独立完成分析并返回结构化 JSON。

**A2. 源码引用许可与可选写回（双门策略）**

> **⚠️ 强制规则：引用源码 / 执行 repo sync 与写回 `.env` / 分支映射是两道独立门禁，不得合并为一次确认。**

执行流程：

1. 根据报错信息中的包名、模块名，从 config.repos 中推断最可能的仓库和分支。
2. 通过 AskUserQuestion 工具先展示“引用/同步”摘要并等待许可：

```
开始分析前，请确认源码参考信息：

  仓库：{{推断的 repo_name}}
  路径：{{workspace/.repos/ 下的实际路径}}
  分支：{{当前分支或推断的分支}}

可选仓库列表：
{{逐行列出 config.repos 中所有仓库名称}}

请选择：
1. 允许同步并引用该仓库（推荐）
2. 仅引用当前已有副本，不额外同步
3. 不引用源码，仅基于日志分析
4. 更换仓库 / 分支
```

3. 仅当用户允许同步时，执行：

```bash
bun run .claude/scripts/repo-sync.ts --url {{repo_url}} --branch {{branch}}
```

4. 若用户提供了新的仓库 URL 或纠正了分支信息，先展示写回预览，再单独确认是否持久化：

   - `.env` 将追加的 `SOURCE_REPOS`：`{{repo_url}}`
   - 分支映射文件：`{{repo_name}} -> {{branch}}`

   AskUserQuestion 选项：
   - 仅本次分析使用，不写回（默认）
   - 允许写回 `.env` 与分支映射
   - 取消新增的仓库 / 分支修正

5. 若 config.repos 为空（无已配置仓库），改为询问用户是否需要提供源码路径；若用户拒绝，转为纯日志分析。

**A3. AI 分析**

`backend-bug-agent` 返回报告 JSON 后，进入输出阶段。

**A4. 输出 HTML 报告**

将报告数据写入 `workspace/{{project}}/reports/bugs/{{YYYYMMDD}}/{{Bug标题}}.html`。

可用模板（位于 `templates/` 目录）：
- `bug-report-zentao.html.hbs` — **默认**，禅道富文本编辑器兼容（全 inline style，table 布局，可直接粘贴到禅道）
- `bug-report-full.html.hbs` — 完整样式版，独立 HTML 查看，含 CSS 变量、渐变、flexbox 等高级样式
- `bug-report.html.hbs` — 旧版模板（保留兼容）

默认使用禅道兼容模板。用户可通过 `--template full` 参数切换为完整样式版。

若目录不存在则先创建：

```bash
mkdir -p workspace/{{project}}/reports/bugs/{{YYYYMMDD}}
```

**A5. 发送通知**

```bash
bun run .claude/scripts/plugin-loader.ts notify --event bug-report --data '{"reportFile":"{{path}}","summary":"{{one_line_summary}}"}'
```

**A6. 完成摘要（状态展示，无需确认）**

```
Bug 分析完成

报告：{{report_path}}
根因：{{root_cause_summary}}
```

---

## 模式 B — 合并冲突分析

### 步骤

**B1. 派发分析 Agent**

派发 `conflict-agent`（model: sonnet），传入冲突代码片段和分支信息，由 Agent 独立完成分析并返回结构化 JSON。

**B2. 获取分支信息（可选）**

若用户未提供冲突来源分支，询问：

```
请提供冲突涉及的分支信息（可跳过）：
- 当前分支（HEAD）：
- 合入分支：
```

**B3. AI 分析**

`conflict-agent` 返回报告 JSON 后，进入输出阶段。

**B4. 输出 HTML 报告**

将报告数据写入 `workspace/{{project}}/reports/conflicts/{{YYYYMMDD}}/{{冲突描述}}.html`。

```bash
mkdir -p workspace/{{project}}/reports/conflicts/{{YYYYMMDD}}
```

**B5. 发送通知**

```bash
bun run .claude/scripts/plugin-loader.ts notify --event conflict-analyzed --data '{"reportFile":"{{path}}","conflictCount":{{n}},"branches":["{{head}}","{{incoming}}"]}'
```

**B6. 完成摘要（状态展示，无需确认）**

```
冲突分析完成

报告：{{report_path}}
冲突块：{{conflict_count}} 处
需人工决策：{{manual_count}} 处
```

---

## 模式 C — 前端 Bug 分析

### 步骤

**C1. 派发分析 Agent**

派发 `frontend-bug-agent`（model: sonnet），传入前端报错信息和源码上下文，由 Agent 独立完成分析并返回结构化 JSON。

**C2. 源码引用许可与可选写回（同模式 A 的双门策略）**

**C3. AI 分析**

`frontend-bug-agent` 返回报告 JSON 后，进入输出阶段。

**C4. 输出 HTML 报告**

将报告数据写入 `workspace/{{project}}/reports/bugs/{{YYYYMMDD}}/{{Bug标题}}.html`。

**C5. 发送通知**

```bash
bun run .claude/scripts/plugin-loader.ts notify --event bug-report --data '{"reportFile":"{{path}}","summary":"{{one_line_summary}}"}'
```

**C6. 完成摘要**（同模式 A 的 A6）

---

## 模式 D — 信息不足

直接向用户输出补料清单，不进入分析流程：

```
需要更多信息才能分析，请提供以下内容：

必填：
□ 完整报错堆栈（或冲突代码片段）
□ 触发该报错的操作步骤

选填（有助于提升分析质量）：
□ 环境信息（服务器/浏览器版本、JDK/Node 版本）
□ 相关接口的 curl 命令或请求参数
□ 禅道 Bug 链接（若已录入缺陷系统）

提供信息后，请重新发送给我。
```

说明：

- 缺少完整日志或冲突块 → 视为 `blocking_unknown`
- 输入为空、链接损坏、内容明显与分析模式不匹配 → 视为 `invalid_input`
- 仅缺辅助环境信息 → 视为 `defaultable_unknown`，可在补充后提升报告质量

---

## 模式 E — Hotfix 用例生成（禅道 Bug 链接）

### 步骤

**E1. 抓取禅道 Bug 信息**

```bash
bun run plugins/zentao/fetch.ts --bug-id {{bug_id}} --project {{project}} --output workspace/{{project}}/.temp/zentao
```

读取输出 JSON，提取：`bug_id`、`title`、`severity`、`fix_branch`、`status`。

若返回 `partial: true`（API 不可达），则跳过 E2，直接用 URL 中的 Bug ID 继续后续步骤。

**E2. 源码同步（自动优先，必要时才确认）**

根据 fix_branch 是否可用，分两种路径：

**路径 A — fix_branch 已获取（自动引用，不自动写回配置）：**

1. 从 fix_branch 名称中推断仓库（匹配 config.repos 中已有的仓库，或根据分支前缀、Bug 所属产品推断）
2. 直接执行同步，不询问用户：

```bash
bun run .claude/scripts/repo-sync.ts --url {{repo_url}} --branch {{fix_branch}}
```

3. 同步完成后输出一行状态信息即可：`源码已同步：{{repo_name}} @ {{fix_branch}}`
4. 若需要把推断出的 repo / branch 持久化到 `.env` 或分支映射，仍按模式 A 的写回门禁单独确认。

**路径 B — fix_branch 为 null（需要用户确认）：**

通过 AskUserQuestion 工具询问仓库和分支：

```
禅道未返回修复分支信息，请提供：

  仓库：{{推断的 repo_name 或 "待确认"}}
  分支：{{待确认}}

可选仓库列表：
{{逐行列出 config.repos 中所有仓库名称}}
```

用户确认后执行同步。若提供了新仓库或分支，仍需先展示写回预览，再按模式 A 的 A2 步骤 4 决定是否持久化到配置。

**E3. AI 分析**

派发 `hotfix-case-agent`（model: sonnet），传入禅道 Bug 信息和 git diff，由 Agent 独立完成分析并返回 Archive 格式 Markdown。

**E4. 输出用例文件**

文件路径：`workspace/{{project}}/issues/{{YYYYMM}}/hotfix_{{version}}_{{bugId}}-{{summary}}.md`

其中：

- `{{YYYYMM}}`：当前年月，如 `202604`
- `{{version}}`：从 fix_branch 提取版本号（如 `6.4.10`），无法提取时省略该段
- `{{bugId}}`：Bug ID
- `{{summary}}`：Bug 标题前 20 字（去除特殊字符）

```bash
mkdir -p workspace/{{project}}/issues/{{YYYYMM}}
```

**E5. 发送通知**

```bash
bun run .claude/scripts/plugin-loader.ts notify --event hotfix-case-generated --data '{"bugId":"{{bugId}}","branch":"{{fix_branch}}","file":"{{output_path}}","changedFiles":{{changed_files_json}}}'
```

**E6. 完成摘要（状态展示，无需确认）**

```
Hotfix 用例生成完成

Bug：#{{bugId}} {{title}}
修复分支：{{fix_branch}}
用例文件：{{output_path}}
```

---

## 异常处理

任意步骤执行失败时：

1. 向用户报告失败节点和原因
2. 发送 `workflow-failed` 通知：

```bash
bun run .claude/scripts/plugin-loader.ts notify --event workflow-failed --data '{"step":"{{step_name}}","reason":"{{error_msg}}"}'
```

3. 提供重试选项，不强制退出

---

## 报告输出目录约定

| 类型                  | 目录                                                |
| --------------------- | --------------------------------------------------- |
| Bug 报告（后端/前端） | `workspace/{{project}}/reports/bugs/YYYYMMDD/`      |
| 冲突分析报告          | `workspace/{{project}}/reports/conflicts/YYYYMMDD/` |
| Hotfix 用例           | `workspace/{{project}}/issues/YYYYMM/`              |
| 临时文件              | `workspace/{{project}}/.temp/`                      |
