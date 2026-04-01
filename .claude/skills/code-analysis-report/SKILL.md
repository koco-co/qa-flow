---
name: code-analysis-report
description: 测试工程师专用的代码分析报告工作流 Skill。当用户粘贴前端或后端报错日志、curl 请求信息、Jenkins 合并冲突信息，或提到「帮我分析这个报错」「生成 bug 报告」「分析一下这个错误」「分析一下冲突」「看看这个异常」时，必须触发此 Skill。还支持 Hotfix 分支用例生成：当用户发送禅道 Bug 链接（如 http://zenpms.dtstack.cn/zentao/bug-view-145513.html）时，自动从禅道页面提取修复分支信息、拉取代码、分析变更、生成一条线上问题转化测试用例。支持四种模式：(1) 后端 Bug 分析 → 生成 HTML 格式报告存入 reports/bugs/ 目录；(2) Jenkins 合并冲突分析 → 生成 HTML 报告存入 reports/conflicts/ 目录；(3) 前端报错分析 → 生成 HTML 报告存入 reports/bugs/ 目录；(4) Hotfix 用例生成 → 转化线上 Bug 为测试用例存入 cases/archive/online-cases/ 目录。所有模式在开始分析前必须确认代码分支并自动拉取。
---

# Code Analysis Report Skill

## 用途与触发词

- **用途**：将后端 / 前端报错、Jenkins 合并冲突与 Hotfix 线上问题线索，转化为可直接交付给开发或测试使用的 HTML 报告 / Markdown 测试用例。
- **触发词**：`帮我分析这个报错`、`生成 bug 报告`、`分析一下这个错误`、`分析一下冲突`、`看看这个异常`、禅道 Bug 链接、`应用: {org}/{repo}, 版本: hotfix_{version}_{bugId}`
- **调用关系**：本 Skill 独立执行，不属于 `test-case-generator` 的任何步骤。

---

## 使用口径速查

- 本 Skill 有 **后端 Bug 分析**、**合并冲突分析**、**前端报错分析** 与 **Hotfix 用例生成** 四种执行模式，以及 **信息不足补料** 门禁；不使用测试用例流程里的"快速模式 / 续传 / 模块级重跑"口令。
- **Hotfix 用例生成（模式E）**：发送禅道 Bug 链接（如 `http://zenpms.dtstack.cn/zentao/bug-view-138845.html`）即可**直接触发**，无需选择菜单，自动从禅道页面提取修复分支、拉代码、分析变更、生成单条用例。主验收入口是根目录同名 `.md` 快捷链接。
- Bug 分析的主验收入口是 `latest-bug-report.html`；合并冲突分析的主验收入口是 `latest-conflict-report.html`。
- `确认通过` / `已修改，请同步` 仅用于测试用例生成流程，不用于本 Skill；若报告信息不足，应继续补充日志、curl、仓库或分支信息。

---

## 模式识别（收到输入后首先执行）

### ⚡ 最高优先级识别规则

> 若用户输入匹配以下任意一种格式，**立即跳转 Mode E，禁止展示模式选择菜单，禁止向用户提问**：
>
> - **格式1（推荐）**：`http://zenpms.dtstack.cn/zentao/bug-view-{bugId}.html`
> - **格式2（兼容）**：`应用: {org}/{repo}, 版本: hotfix_{version}_{bugId}`

---

| 模式 | 触发信号 | 执行路径 |
| --- | --- | --- |
| **模式A：后端 Bug 分析** | 含 `Exception`/`Caused by`/`at com.`/`java.lang` 等 Java 堆栈特征，或后端 curl 报错 | `references/backend-analysis-flow.md` |
| **模式B：合并冲突** | 含 `<<<<<<< HEAD`/`=======`/`>>>>>>>` 标记，或提到 Jenkins 冲突 | `references/conflict-analysis-flow.md` |
| **模式C：前端报错分析** | 含 `TypeError`/`ReferenceError`/`[Vue warn]`/`React`/`Uncaught Error`/`error TS`/`Hydration failed` 等前端错误关键词 | `references/frontend-analysis-flow.md` |
| **模式E：Hotfix 用例生成** | 禅道 Bug 链接，或旧格式 `应用: {org}/{repo}, 版本: hotfix_...` | `references/hotfix-case-flow.md` |
| **模式D：信息不足** | 描述模糊，缺少日志或冲突内容 | 告知用户需补充的材料，不生成占位产物 |

**推荐最小输入包：**

- 模式 A：`报错日志 + curl`（若知道分支，也建议一并提供）
- 模式 B：`冲突日志 / 冲突代码 + 当前分支信息`
- 模式 C：`前端错误堆栈 / 控制台报错 + 页面或组件线索`
- 模式 E：禅道 Bug 链接；若无法自动访问禅道，不阻塞先拉代码、看变更、出用例

---

## 输入 / 输出契约

### 输入

| 模式 | 最小输入 | 可选补充 |
| --- | --- | --- |
| 模式A | 后端报错日志；建议附 curl | 分支名、仓库名、环境信息、租户信息 |
| 模式B | 冲突片段或 Jenkins 冲突日志 | 仓库路径、当前分支、来源分支 |
| 模式C | 前端错误堆栈、控制台日志或框架报错 | 组件路径、页面入口、浏览器 / Node 版本 |
| 模式D | 任意不完整描述 | 补齐对应模式缺失材料后重新执行 |
| 模式E | 禅道 Bug 链接 或 `应用: {org}/{repo}, 版本: hotfix_{version}_{bugId}` | 禅道截图 / 文本、前端仓库信息、历史用例线索 |

### 输出

| 模式 | 产物 | 存储位置 | 主验收入口 |
| --- | --- | --- | --- |
| 模式A | `<Bug标题>.json` + `<Bug标题>.html` | `reports/bugs/{yyyy-MM-dd}/` | `latest-bug-report.html` |
| 模式B | `<冲突描述>.json` + `<冲突描述>.html` | `reports/conflicts/{yyyy-MM-dd}/` | `latest-conflict-report.html` |
| 模式C | `<Bug标题>.json` + `<Bug标题>.html` | `reports/bugs/{yyyy-MM-dd}/` | `latest-bug-report.html` |
| 模式D | 补料清单 | 终端输出 | 补齐后重试 |
| 模式E | `hotfix_{version}_{bugId}-{功能简述}.md` | `cases/archive/online-cases/{yyyy-MM-dd}/` + 根目录同名快捷链接 | 根目录同名快捷链接 |

---

## Canonical 步骤总表

| 模式 | Canonical 步骤 | 细则引用 |
| --- | --- | --- |
| 模式A | 1) 提取 curl 上下文 → 2) 定位仓库 + 确认分支 + 自动拉取 → 3) 判断环境问题 / 代码问题 → 4) 深度代码分析 → 5) 生成 JSON / HTML 并刷新快捷链接 → 6) IM 通知 | `references/backend-analysis-flow.md` |
| 模式B | 1) 归一化冲突材料 → 2) 确认仓库 / 分支上下文（可定位时必须拉取）→ 3) 解析冲突块并分类 → 4) 形成合并建议 / 人工决策项 → 5) 生成 JSON / HTML 并刷新快捷链接 → 6) IM 通知 | `references/conflict-analysis-flow.md` |
| 模式C | 1) 识别报错类型 → 2) 定位前端仓库 / 组件与分支 → 3) 从组件 / 数据 / 环境 / 框架四层做根因分析 → 4) 生成 JSON / HTML 并刷新快捷链接 → 5) IM 通知 | `references/frontend-analysis-flow.md` |
| 模式D | 1) 罗列缺失材料 → 2) 明确补充格式 → 3) 暂不生成产物，等待补料 | — |
| 模式E | 1) 获取禅道 Bug + 提取修复分支 → 2) 拉取后端 hotfix 分支 → 3) 分析 hotfix 代码变更 → 4) 确定前端仓库和分支 → 5) 注入禅道信息 → 6) 参考历史用例 → 7) 生成测试用例 → 8) 输出文件 → 9) 完成报告 → 10) 自审清单 → 11) IM 通知 | `references/hotfix-case-flow.md` |

---

## 执行约束

- 执行前必须阅读：本文件，以及当前模式对应的 references/ 流程文档。
- 生成 HTML 报告时，还必须阅读 `references/bug-report-template.md`、`references/env-vs-code-checklist.md`、`references/conflict-resolution.md`。
- 对 `.repos/` 下的仓库，只允许 `fetch`、`pull`、`checkout` 等只读同步操作；严禁 `push`、`commit`、修改任何源码文件。
- 模式 A / C 需要读源码时，必须先确认仓库和分支；若用户未给分支，则先输出当前仓库 / remote / branch / latest commit，等待确认后再继续。
- 模式 E 一旦命中触发信号，必须直接进入流程，不展示模式选择菜单、不向用户提问。
- 模式 E 的固定顺序：先拉取后端 hotfix 分支 → 分析代码变更 → 确定前端仓库和分支 → 非阻塞尝试获取禅道 Bug。
- 模式 E 生成用例的标题必须使用 `【{zentao_bug_id}】验证xxx`，禁止使用 `【P0/P1/P2】`。
- 模式 D 只负责补料门禁，不生成占位 HTML 或占位 Markdown。
- IM 通知强制执行，见 `.claude/rules/notification-hook.md`；失败时仅 console.error，不阻断交付物。

---

## 完成定义

满足以下条件，才算本 Skill 完成：

1. 已完成模式识别，且 A / B / C / D / E 的路由结果与输入信号一致。
2. 需要读取源码的模式已完成仓库定位、分支确认与自动拉取，且报告中记录了实际分支 / commit 信息。
3. 模式 A / B / C 已输出结构完整的 JSON 与 HTML 产物，并刷新对应快捷入口。
4. 模式 E 已输出 `cases/archive/online-cases/` 下的 Hotfix 用例，并创建仓库根目录同名快捷链接。
5. 模式 D 已明确列出缺失材料，未误生成任何伪产物。
6. 各模式均已发送 IM 通知（或记录失败原因）。

---

## 引用索引

| 文件 | 说明 |
| --- | --- |
| `references/backend-analysis-flow.md` | 模式 A 后端 Bug 分析完整流程 |
| `references/conflict-analysis-flow.md` | 模式 B 合并冲突分析完整流程 |
| `references/frontend-analysis-flow.md` | 模式 C 前端报错分析完整流程 |
| `references/hotfix-case-flow.md` | 模式 E Hotfix 用例生成完整流程 |
| `references/hotfix-case-writing.md` | 模式 E 用例编写规范（标题、frontmatter、预期结果、自审清单） |
| `references/bug-report-template.md` | 后端 / 前端 Bug HTML 报告 JSON Schema 与模板 |
| `references/env-vs-code-checklist.md` | 环境问题 vs 代码问题判断清单 |
| `references/conflict-resolution.md` | 合并冲突分类与 HTML 输出规范 |
