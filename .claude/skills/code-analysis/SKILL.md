---
name: code-analysis
description: "代码分析报告。将报错日志、合并冲突、禅道 Bug 链接转化为结构化 HTML 报告或 Hotfix 测试用例。触发词：帮我分析这个报错、分析冲突、看看这个异常、生成 bug 报告。禅道 Bug 链接（{{ZENTAO_BASE_URL}}/zentao/bug-view-{{bug_id}}.html）直接触发 Hotfix 用例生成。"
argument-hint: "[报错日志 | 禅道链接 | 冲突代码]"
---

## 执行前准备

读取项目配置：执行 `npx tsx .claude/scripts/config.ts`（从 `.env` 读取模块、仓库、路径配置）。

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

**A1. 加载提示词**

读取 `${CLAUDE_SKILL_DIR}/prompts/backend-bug.md`，按其指令执行分析。

**A2. 源码同步（当 config.repos 非空且分析需要定位源码时）**

向用户确认目标仓库和分支：

```
需要查看源码以完成根因定位。
仓库：{{repo_name}}
当前分支：{{current_branch}}

请确认分析分支（直接回车使用当前分支）：
```

确认后执行：

```bash
npx tsx .claude/scripts/repo-sync.ts --url {{repo_url}} --branch {{branch}}
```

**A3. AI 分析**

按 `prompts/backend-bug.md` 指令分析报错，生成报告 JSON。

**A4. 输出 HTML 报告**

将报告数据写入 `workspace/reports/bugs/{{YYYYMMDD}}/{{Bug标题}}.html`。

若目录不存在则先创建：

```bash
mkdir -p workspace/reports/bugs/{{YYYYMMDD}}
```

**A5. 发送通知**

```bash
npx tsx .claude/scripts/plugin-loader.ts notify --event bug-report --data '{"reportFile":"{{path}}","summary":"{{one_line_summary}}"}'
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

**B1. 加载提示词**

读取 `${CLAUDE_SKILL_DIR}/prompts/conflict.md`，按其指令执行分析。

**B2. 获取分支信息（可选）**

若用户未提供冲突来源分支，询问：

```
请提供冲突涉及的分支信息（可跳过）：
- 当前分支（HEAD）：
- 合入分支：
```

**B3. AI 分析**

按 `prompts/conflict.md` 指令分析冲突块，生成报告 JSON。

**B4. 输出 HTML 报告**

将报告数据写入 `workspace/reports/conflicts/{{YYYYMMDD}}/{{冲突描述}}.html`。

```bash
mkdir -p workspace/reports/conflicts/{{YYYYMMDD}}
```

**B5. 发送通知**

```bash
npx tsx .claude/scripts/plugin-loader.ts notify --event conflict-analyzed --data '{"reportFile":"{{path}}","conflictCount":{{n}},"branches":["{{head}}","{{incoming}}"]}'
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

**C1. 加载提示词**

读取 `${CLAUDE_SKILL_DIR}/prompts/frontend-bug.md`，按其指令执行分析。

**C2. 源码同步（可选，同模式 A 的 A2 流程）**

**C3. AI 分析**

按 `prompts/frontend-bug.md` 指令分析报错，生成报告 JSON。

**C4. 输出 HTML 报告**

将报告数据写入 `workspace/reports/bugs/{{YYYYMMDD}}/{{Bug标题}}.html`。

**C5. 发送通知**

```bash
npx tsx .claude/scripts/plugin-loader.ts notify --event bug-report --data '{"reportFile":"{{path}}","summary":"{{one_line_summary}}"}'
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
npx tsx plugins/zentao/fetch.ts --url "{{ZENTAO_BASE_URL}}/zentao/bug-view-{{bug_id}}.html" --output workspace/.temp/zentao
```

读取输出 JSON，提取：`bug_id`、`title`、`severity`、`fix_branch`、`status`。

若返回 `partial: true`（API 不可达），则跳过 E2，直接用 URL 中的 Bug ID 继续后续步骤。

**E2. 源码同步（当检测到 fix_branch 时）**

向用户确认：

```
检测到修复分支：{{fix_branch}}
是否同步该分支代码以分析变更？（y/n，默认 y）
```

确认后执行：

```bash
npx tsx .claude/scripts/repo-sync.ts --url {{repo_url}} --branch {{fix_branch}}
```

**E3. AI 分析**

读取 `${CLAUDE_SKILL_DIR}/prompts/hotfix-case.md`，结合禅道 Bug 信息和 git diff 生成测试用例 Markdown。

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
npx tsx .claude/scripts/plugin-loader.ts notify --event hotfix-case-generated --data '{"bugId":"{{bugId}}","branch":"{{fix_branch}}","file":"{{output_path}}","changedFiles":{{changed_files_json}}}'
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
npx tsx .claude/scripts/plugin-loader.ts notify --event workflow-failed --data '{"step":"{{step_name}}","reason":"{{error_msg}}"}'
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
