---
name: code-analysis
description: "代码分析报告。将报错日志、合并冲突、禅道 Bug 链接转化为结构化 HTML 报告或 Hotfix 测试用例。触发词：帮我分析这个报错、分析冲突、看看这个异常、生成 bug 报告。禅道 Bug 链接（{{ZENTAO_BASE_URL}}/zentao/bug-view-{{bug_id}}.html）直接触发 Hotfix 用例生成。"
argument-hint: "[报错日志 | 禅道链接 | 冲突代码]"
---

## 执行前准备

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

**A2. 源码确认与同步（强制，不可跳过）**

> **⚠️ 强制规则：无论 config.repos 是否为空，在进入 A3 分析步骤之前，必须通过 AskUserQuestion 工具向用户展示即将参考的源码信息并获得确认。禁止跳过此步骤直接输出报告。**

执行流程：

1. 根据报错信息中的包名、模块名，从 config.repos 中推断最可能的仓库和分支
2. **必须**通过 AskUserQuestion 工具向用户展示以下信息并等待确认：

```
开始分析前，请确认源码参考信息：

  仓库：{{推断的 repo_name}}
  路径：{{workspace/.repos/ 下的实际路径}}
  分支：{{当前分支或推断的分支}}

可选仓库列表：
{{逐行列出 config.repos 中所有仓库名称}}

以上信息是否正确？如需调整请告知仓库名和分支名。
```

3. 用户确认或纠正后，执行同步：

```bash
bun run .claude/scripts/repo-sync.ts --url {{repo_url}} --branch {{branch}}
```

4. **反向写入配置**：若用户在确认时提供了新的仓库 URL 或纠正了分支信息，必须主动将变更写回配置：

   - **新仓库 URL**：追加到 `.env` 的 `SOURCE_REPOS` 字段（逗号分隔，去重）。若该字段不存在则新增一行。
   - **分支信息**：若项目配置了 `REPO_BRANCH_MAPPING_PATH`（默认 `config/repo-branch-mapping.yaml`），将仓库与分支的映射写入该文件。

   示例 — 用户提供了新仓库 `http://git.example.com/new-repo.git`：
   ```bash
   # 读取当前 SOURCE_REPOS，追加新 URL，写回 .env
   # 确保不重复、不丢失已有配置
   ```

5. 若 config.repos 为空（无已配置仓库），改为询问用户是否需要提供源码路径：

```
当前未配置源码仓库。是否需要提供源码路径或仓库地址以辅助分析？
如不需要，将仅基于报错日志进行分析。
```

若用户提供了新仓库地址，执行 repo-sync 后同样按步骤 4 写入 `.env`。

**A3. AI 分析**

`backend-bug-agent` 返回报告 JSON 后，进入输出阶段。

**A4. 输出 HTML 报告**

将报告数据写入 `workspace/reports/bugs/{{YYYYMMDD}}/{{Bug标题}}.html`。

可用模板（位于 `templates/` 目录）：
- `bug-report-zentao.html.hbs` — **默认**，禅道富文本编辑器兼容（全 inline style，table 布局，可直接粘贴到禅道）
- `bug-report-full.html.hbs` — 完整样式版，独立 HTML 查看，含 CSS 变量、渐变、flexbox 等高级样式
- `bug-report.html.hbs` — 旧版模板（保留兼容）

默认使用禅道兼容模板。用户可通过 `--template full` 参数切换为完整样式版。

若目录不存在则先创建：

```bash
mkdir -p workspace/reports/bugs/{{YYYYMMDD}}
```

**A5. 发送通知**

```bash
bun run .claude/scripts/plugin-loader.ts notify --event bug-report --data '{"reportFile":"{{path}}","summary":"{{one_line_summary}}"}'
```

**A6. 完成确认**

```
Bug 分析完成

报告：{{report_path}}
根因：{{root_cause_summary}}

选项：
1. 完成
2. 补充更多上下文，重新分析
3. 查看完整报告
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

将报告数据写入 `workspace/reports/conflicts/{{YYYYMMDD}}/{{冲突描述}}.html`。

```bash
mkdir -p workspace/reports/conflicts/{{YYYYMMDD}}
```

**B5. 发送通知**

```bash
bun run .claude/scripts/plugin-loader.ts notify --event conflict-analyzed --data '{"reportFile":"{{path}}","conflictCount":{{n}},"branches":["{{head}}","{{incoming}}"]}'
```

**B6. 完成确认**

```
冲突分析完成

报告：{{report_path}}
冲突块：{{conflict_count}} 处
需人工决策：{{manual_count}} 处

选项：
1. 完成
2. 查看完整报告
3. 针对某处冲突深入分析
```

---

## 模式 C — 前端 Bug 分析

### 步骤

**C1. 派发分析 Agent**

派发 `frontend-bug-agent`（model: sonnet），传入前端报错信息和源码上下文，由 Agent 独立完成分析并返回结构化 JSON。

**C2. 源码确认与同步（强制，不可跳过，流程同模式 A 的 A2）**

**C3. AI 分析**

`frontend-bug-agent` 返回报告 JSON 后，进入输出阶段。

**C4. 输出 HTML 报告**

将报告数据写入 `workspace/reports/bugs/{{YYYYMMDD}}/{{Bug标题}}.html`。

**C5. 发送通知**

```bash
bun run .claude/scripts/plugin-loader.ts notify --event bug-report --data '{"reportFile":"{{path}}","summary":"{{one_line_summary}}"}'
```

**C6. 完成确认**（同模式 A 的 A6）

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

---

## 模式 E — Hotfix 用例生成（禅道 Bug 链接）

### 步骤

**E1. 抓取禅道 Bug 信息**

```bash
bun run plugins/zentao/fetch.ts --url "{{ZENTAO_BASE_URL}}/zentao/bug-view-{{bug_id}}.html" --output workspace/.temp/zentao
```

读取输出 JSON，提取：`bug_id`、`title`、`severity`、`fix_branch`、`status`。

若返回 `partial: true`（API 不可达），则跳过 E2，直接用 URL 中的 Bug ID 继续后续步骤。

**E2. 源码同步（自动优先，必要时才确认）**

根据 fix_branch 是否可用，分两种路径：

**路径 A — fix_branch 已获取（自动执行，无需用户确认）：**

1. 从 fix_branch 名称中推断仓库（匹配 config.repos 中已有的仓库，或根据分支前缀、Bug 所属产品推断）
2. 直接执行同步，不询问用户：

```bash
bun run .claude/scripts/repo-sync.ts --url {{repo_url}} --branch {{fix_branch}}
```

3. 同步完成后输出一行确认信息即可：`源码已同步：{{repo_name}} @ {{fix_branch}}`

**路径 B — fix_branch 为 null（需要用户确认）：**

通过 AskUserQuestion 工具询问仓库和分支：

```
禅道未返回修复分支信息，请提供：

  仓库：{{推断的 repo_name 或 "待确认"}}
  分支：{{待确认}}

可选仓库列表：
{{逐行列出 config.repos 中所有仓库名称}}
```

用户确认后执行同步，若提供了新仓库或分支，按模式 A 的 A2 步骤 4 反向写入 `.env`。

**E3. AI 分析**

派发 `hotfix-case-agent`（model: sonnet），传入禅道 Bug 信息和 git diff，由 Agent 独立完成分析并返回 Archive 格式 Markdown。

**E4. 输出用例文件**

文件路径：`workspace/issues/{{YYYYMM}}/hotfix_{{version}}_{{bugId}}-{{summary}}.md`

其中：

- `{{YYYYMM}}`：当前年月，如 `202604`
- `{{version}}`：从 fix_branch 提取版本号（如 `6.4.10`），无法提取时省略该段
- `{{bugId}}`：Bug ID
- `{{summary}}`：Bug 标题前 20 字（去除特殊字符）

```bash
mkdir -p workspace/issues/{{YYYYMM}}
```

**E5. 发送通知**

```bash
bun run .claude/scripts/plugin-loader.ts notify --event hotfix-case-generated --data '{"bugId":"{{bugId}}","branch":"{{fix_branch}}","file":"{{output_path}}","changedFiles":{{changed_files_json}}}'
```

**E6. 完成确认**

```
Hotfix 用例生成完成

Bug：#{{bugId}} {{title}}
修复分支：{{fix_branch}}
用例文件：{{output_path}}

选项：
1. 完成
2. 查看用例内容
3. 补充测试步骤
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

| 类型                  | 目录                                    |
| --------------------- | --------------------------------------- |
| Bug 报告（后端/前端） | `workspace/reports/bugs/YYYYMMDD/`      |
| 冲突分析报告          | `workspace/reports/conflicts/YYYYMMDD/` |
| Hotfix 用例           | `workspace/issues/YYYYMM/`              |
| 临时文件              | `workspace/.temp/`                      |
