---
name: code-analysis-report
description: 测试工程师专用的代码分析报告工作流 Skill。当用户粘贴前端或后端报错日志、curl 请求信息、Jenkins 合并冲突信息，或提到「帮我分析这个报错」「生成 bug 报告」「分析一下这个错误」「分析一下冲突」「看看这个异常」时，必须触发此 Skill。还支持 Hotfix 分支用例生成：当用户发送禅道 Bug 链接（如 http://zenpms.dtstack.cn/zentao/bug-view-145513.html）时，自动从禅道页面提取修复分支信息、拉取代码、分析变更、生成一条线上问题转化测试用例。支持四种模式：(1) 后端 Bug 分析 → 生成 HTML 格式报告存入 reports/bugs/ 目录；(2) Jenkins 合并冲突分析 → 生成 HTML 报告存入 reports/conflicts/ 目录；(3) 前端报错分析 → 生成 HTML 报告存入 reports/bugs/ 目录；(4) Hotfix 用例生成 → 转化线上 Bug 为测试用例存入 cases/archive/online-cases/ 目录。所有模式在开始分析前必须确认代码分支并自动拉取。
---

# Code Analysis Report Skill

## 用途与触发词

- **用途**：将后端 / 前端报错、Jenkins 合并冲突与 Hotfix 线上问题线索，转化为可直接交付给开发或测试使用的 HTML 报告 / Markdown 测试用例。
- **触发词**：`帮我分析这个报错`、`生成 bug 报告`、`分析一下这个错误`、`分析一下冲突`、`看看这个异常`、`应用: {org}/{repo}, 版本: hotfix_{version}_{bugId}`
- **调用关系**：本 Skill 独立执行，不属于 `test-case-generator` 的任何步骤。

---

## 使用口径速查

- 本 Skill 有 **后端 Bug 分析**、**合并冲突分析**、**前端报错分析** 与 **Hotfix 用例生成** 四种模式；不使用测试用例流程里的”快速模式 / 续传 / 模块级重跑”口令。
- **Hotfix 用例生成（模式E）**：发送禅道 Bug 链接（如 `http://zenpms.dtstack.cn/zentao/bug-view-138845.html`）即可**直接触发**，无需选择菜单，自动从禅道页面提取修复分支（应用+版本）、拉代码、分析变更、生成单条用例。主验收入口是根目录同名 `.md` 快捷链接。
- 需要重新分析时，直接补充新的日志、curl、冲突片段或分支信息即可；每次运行都会生成新的 HTML，并刷新对应的 `latest-*` 快捷链接。
- Bug 分析的主验收入口是 `latest-bug-report.html`；合并冲突分析的主验收入口是 `latest-conflict-report.html`。
- `确认通过` / `已修改，请同步` 仅用于测试用例生成流程，不用于本 Skill；若报告信息不足，应继续补充日志、curl、仓库或分支信息。

---

## 模式识别（收到输入后首先执行）

### ⚡ 最高优先级识别规则（先看这里，再看下方表格）

> **若用户输入匹配以下任意一种格式：**
>
> **格式1（禅道链接，推荐）：**
> ```
> http://zenpms.dtstack.cn/zentao/bug-view-{bugId}.html
> ```
>
> **格式2（旧格式，兼容）：**
> ```
> 应用: {org}/{repo}, 版本: hotfix_{version}_{bugId}
> ```
>
> → **立即跳转到第五章执行 Mode E**
> → **禁止展示模式选择菜单**
> → **禁止向用户询问任何问题，直接开始执行**
>
> **格式1 示例**（直接触发，无需确认）：
> `http://zenpms.dtstack.cn/zentao/bug-view-145513.html`
>
> **格式2 示例**（兼容旧格式）：
> `应用: dt-insight-web/dt-center-assets, 版本: hotfix_6.2.x_145513`

---

| 模式                        | 触发信号                                                                                                              | 执行路径               |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **模式A：后端 Bug 分析**    | 含 `Exception`/`Caused by`/`at com.`/`java.lang` 等 Java 堆栈特征，或后端 curl 报错                                  | → 执行第二章           |
| **模式B：合并冲突**         | 含 `<<<<<<< HEAD`/`=======`/`>>>>>>>` 标记，或提到 Jenkins 冲突                                                       | → 执行第三章           |
| **模式C：前端报错分析**     | 含 `TypeError`/`ReferenceError`/`[Vue warn]`/`React`/`Uncaught Error`/`error TS`/`Hydration failed` 等前端错误关键词  | → 执行第四章           |
| **模式E：Hotfix 用例生成**  | 输入为禅道 Bug 链接（`zenpms.dtstack.cn/zentao/bug-view-{id}.html`），或旧格式 `应用: {org}/{repo}, 版本: hotfix_...` | → 执行第五章           |
| **模式D：信息不足**         | 描述模糊，缺少日志或冲突内容                                                                                           | → 告知用户需补充的材料 |

**推荐最小输入包：**

- 模式 A：`报错日志 + curl`（若知道分支，也建议一并提供）
- 模式 B：`冲突日志 / 冲突代码 + 当前分支信息`
- 模式 C：`前端错误堆栈 / 控制台报错 + 页面或组件线索`
- 模式 E：`应用: {org}/{repo}, 版本: hotfix_{version}_{bugId}`；若无法自动访问禅道，仅作为补充信息，不阻塞先拉代码、看变更、出用例

---

## 输入 / 输出契约

### 输入

| 模式 | 最小输入 | 可选补充 |
| --- | --- | --- |
| 模式A | 后端报错日志；建议附 curl | 分支名、仓库名、环境信息、租户信息 |
| 模式B | 冲突片段或 Jenkins 冲突日志 | 仓库路径、当前分支、来源分支 |
| 模式C | 前端错误堆栈、控制台日志或框架报错 | 组件路径、页面入口、浏览器 / Node 版本 |
| 模式D | 任意不完整描述 | 补齐对应模式缺失材料后重新执行 |
| 模式E | `应用: {org}/{repo}, 版本: hotfix_{version}_{bugId}` | 禅道截图 / 文本、前端仓库信息、历史用例线索 |

### 输出

| 模式 | 产物 | 存储位置 | 主验收入口 |
| --- | --- | --- | --- |
| 模式A | `<Bug标题>.json` + `<Bug标题>.html` | `reports/bugs/{yyyy-MM-dd}/` | `latest-bug-report.html` |
| 模式B | `<冲突描述>.json` + `<冲突描述>.html` | `reports/conflicts/{yyyy-MM-dd}/` | `latest-conflict-report.html` |
| 模式C | `<Bug标题>.json` + `<Bug标题>.html` | `reports/bugs/{yyyy-MM-dd}/` | `latest-bug-report.html` |
| 模式D | 补料清单 | 终端输出 | 补齐后重试 |
| 模式E | `hotfix_{version}_{bugId}-{功能简述}.md` | `cases/archive/online-cases/` + 仓库根目录同名快捷链接 | 根目录同名快捷链接 |

---

## Canonical 步骤总表

| 模式 | Canonical 步骤 | 细则引用 |
| --- | --- | --- |
| 模式A | 1) 提取 curl 上下文 → 2) 定位仓库 + 确认分支 + 自动拉取 → 3) 判断环境问题 / 代码问题 → 4) 深度代码分析 → 5) 生成 JSON / HTML 并刷新快捷链接 | `.claude/skills/code-analysis-report/references/backend-analysis-flow.md` |
| 模式B | 1) 归一化冲突材料 → 2) 确认仓库 / 分支上下文（可定位时必须拉取）→ 3) 解析冲突块并分类 → 4) 形成合并建议 / 人工决策项 → 5) 生成 JSON / HTML 并刷新快捷链接 | `.claude/skills/code-analysis-report/references/conflict-analysis-flow.md` |
| 模式C | 1) 识别报错类型 → 2) 定位前端仓库 / 组件与分支 → 3) 从组件 / 数据 / 环境 / 框架四层做根因分析 → 4) 生成 JSON / HTML 并刷新快捷链接 | `.claude/skills/code-analysis-report/references/frontend-analysis-flow.md` |
| 模式D | 1) 罗列缺失材料 → 2) 明确补充格式 → 3) 暂不生成产物，等待补料 | 本文件当前章节 |
| 模式E | 1) 解析 Hotfix 输入 → 2) 拉取后端 hotfix 分支 → 3) 分析 Hotfix 代码变更 → 4) 确定前端仓库和分支 → 5) 非阻塞尝试获取禅道 Bug → 6) 参考历史用例 → 7) 生成一条测试用例（标题使用 `【{zentao_bug_id}】验证xxx`，并遵循 `.claude/skills/code-analysis-report/references/hotfix-case-writing.md`）→ 8) 写入 `cases/archive/online-cases/` 并创建快捷链接 → 9) 完成报告 → 10) 自审清单 | `.claude/skills/code-analysis-report/references/hotfix-case-flow.md` |

---

## 执行约束

- 执行前必须阅读：本文件，以及当前模式对应的 `.claude/skills/code-analysis-report/references/backend-analysis-flow.md` / `.claude/skills/code-analysis-report/references/conflict-analysis-flow.md` / `.claude/skills/code-analysis-report/references/frontend-analysis-flow.md` / `.claude/skills/code-analysis-report/references/hotfix-case-flow.md`。
- 生成 HTML 报告时，还必须阅读 `.claude/skills/code-analysis-report/references/bug-report-template.md`、`.claude/skills/code-analysis-report/references/env-vs-code-checklist.md`、`.claude/skills/code-analysis-report/references/conflict-resolution.md`。
- 对 `.repos/` 下的仓库，只允许 `fetch`、`pull`、`checkout` 等只读同步操作；严禁 `push`、`commit`、修改任何源码文件。
- 模式 A / C 需要读源码时，必须先确认仓库和分支；若用户未给分支，则先输出当前仓库 / remote / branch / latest commit，等待确认后再继续。
- 模式 E 一旦命中 `应用: {org}/{repo}, 版本: hotfix_{version}_{bugId}`，必须直接进入流程，不展示模式选择菜单、不向用户提问，立即拉取后端 hotfix 分支。
- 模式 E 的固定顺序必须是：先拉取后端 hotfix 分支，再分析 hotfix 代码变更，再确定前端仓库和分支，最后非阻塞尝试获取禅道 Bug。
- 模式 E 生成用例时必须同时遵循 `.claude/skills/code-analysis-report/references/hotfix-case-flow.md` 与 `.claude/skills/code-analysis-report/references/hotfix-case-writing.md`；标题必须使用 `【{zentao_bug_id}】验证xxx`，禁止使用 `【P0/P1/P2】`。
- 模式 E 必须保留 `Hotfix` 线上问题转化的完整步骤，尤其是 `Step 3：分析 hotfix 代码变更` 的差异扫描实现，不得简化为只看提交标题。
- 模式 D 只负责补料门禁，不生成占位 HTML 或占位 Markdown。

---

## 完成定义

满足以下条件，才算本 Skill 完成：

1. 已完成模式识别，且 A / B / C / D / E 的路由结果与输入信号一致。
2. 需要读取源码的模式已完成仓库定位、分支确认与自动拉取，且报告中记录了实际分支 / commit 信息。
3. 模式 A / B / C 已输出结构完整的 JSON 与 HTML 产物，并刷新对应快捷入口。
4. 模式 E 已输出 `cases/archive/online-cases/` 下的 Hotfix 用例，并创建仓库根目录同名快捷链接。
5. 模式 D 已明确列出缺失材料，未误生成任何伪产物。
6. 所有输出均遵守引用规范中的字段、路径、安全与自审要求。

---

## 引用索引

1. 将分析结果整理为 JSON 数据文件，写入 `reports/bugs/{YYYY-MM-DD}/{BugTitle}.json`
   - 字段定义见 `references/bug-report-template.md` 的 JSON Schema 章节
2. 执行渲染：
   ```bash
   node .claude/skills/code-analysis-report/scripts/render-report.mjs \
     .claude/skills/code-analysis-report/templates/bug-report-backend.html \
     reports/bugs/{date}/{BugTitle}.json \
     reports/bugs/{date}/{BugTitle}.html
   ```
3. 刷新快捷链接：`node .claude/shared/scripts/refresh-latest-link.mjs`

---

## 三、合并冲突模式（模式B）

详细分析逻辑与 HTML 输出格式见 → `references/conflict-resolution.md`

**快速流程：**

1. 解析冲突标记，识别当前分支与来源分支各自的代码意图
2. 判断冲突类型：安全合并型 / 逻辑互斥型 / 重复修改型 / 依赖版本冲突 / 格式注释冲突
3. 输出 HTML 冲突报告，逻辑互斥型必须注明「需开发人工确认」

**存储路径：**`reports/conflicts/${yyyy-MM-dd}/<冲突描述>.json` → 渲染为 `.html`

**生成流程：**

1. 将分析结果写入 `reports/conflicts/{date}/{description}.json`（字段定义见 `references/conflict-resolution.md`）
2. 执行渲染：
   ```bash
   node .claude/skills/code-analysis-report/scripts/render-report.mjs \
     .claude/skills/code-analysis-report/templates/conflict-report.html \
     reports/conflicts/{date}/{description}.json \
     reports/conflicts/{date}/{description}.html
   ```
3. 刷新快捷链接：`node .claude/shared/scripts/refresh-latest-link.mjs`

`latest-conflict-report.html` 是合并冲突分析流程的主验收入口。

---

## 四、第四章：前端报错分析模式（模式C）完整流程

### Step 1：报错类型识别

| 报错特征关键词 | 判定 |
|--------------|------|
| `TypeError: Cannot read` / `ReferenceError` / `Uncaught Error` | JavaScript 运行时错误 |
| `Warning: ` / `React.createElement` / `React Hook` / `at Object.<anonymous>` | React 框架错误 |
| `[Vue warn]` / `VueComponent` | Vue 框架错误 |
| `Error: Hydration failed` / `getServerSideProps` / `getStaticProps` | Next.js SSR 错误 |
| `error TS` / `Cannot find module` (无 Java 包名) | TypeScript 编译错误 |

### Step 2：仓库定位（条件步骤）

> 仅在 config.repos 非空时执行。

1. 从报错堆栈中提取文件路径或组件名
2. 匹配 config.stackTrace 中的前端键（如 `@/components` → `.repos/frontend/src/components/`）
3. 若匹配成功，定位到具体源码文件
4. 若无匹配，提示用户补充仓库信息或跳过源码定位

### Step 3：根因分析

按以下维度分析前端报错：

1. **组件层**：渲染错误、props 类型不匹配、state 管理异常
2. **数据层**：API 返回数据结构变更、空值未处理、类型转换失败
3. **环境层**：Node 版本不兼容、依赖版本冲突、构建配置错误
4. **框架层**：SSR/CSR hydration 不一致、路由配置错误、中间件异常

### Step 4：生成报告

1. 将分析结果写入 `reports/bugs/{date}/{BugTitle}.json`（字段定义见 `references/bug-report-template.md` 前端 JSON Schema）
2. 执行渲染：
   ```bash
   node .claude/skills/code-analysis-report/scripts/render-report.mjs \
     .claude/skills/code-analysis-report/templates/bug-report-frontend.html \
     reports/bugs/{date}/{BugTitle}.json \
     reports/bugs/{date}/{BugTitle}.html
   ```
3. 刷新快捷链接：`node .claude/shared/scripts/refresh-latest-link.mjs`

---

## 五、Hotfix 用例生成模式（模式E）完整流程

> ⚡ **零等待执行**：收到匹配输入后立即开始执行，不展示菜单，不询问问题内容，不等待用户提供任何信息。所有可自动完成的步骤均无需用户介入。

### 触发信号

**推荐（禅道链接）：**

```
http://zenpms.dtstack.cn/zentao/bug-view-{bugId}.html
```

**兼容（旧格式）：**

```
应用: {org}/{repo}, 版本: hotfix_{version}_{bugId}
```

---

### Step 1：获取禅道 Bug 详情 + 提取修复分支

```bash
node .claude/shared/scripts/fetch-zentao-bug.mjs {bugId}
```

脚本自动通过 Session Cookie 登录禅道，解析 Bug 详情页，返回 JSON。

**成功**：从 `fixBranches` 数组中提取应用和版本信息：

```json
{
  "bugId": 138845,
  "title": "【数据质量】单表校验-自定义sql无法保存报错",
  "steps": "客户复现步骤...",
  "severity": 3,
  "status": "resolved",
  "fixBranches": [
    { "app": "dt-insight-web/dt-center-valid", "version": "hotfix_5.0.x_138845" }
  ]
}
```

从 `fixBranches[0]` 解析出：

| 字段       | 示例值                          | 来源                      |
| ---------- | ------------------------------- | ------------------------- |
| `org/repo` | `dt-insight-web/dt-center-valid` | `fixBranches[0].app`      |
| `version`  | `5.0.x`                         | 从分支名提取中间版本段    |
| `bugId`    | `138845`                        | 从分支名提取末尾 ID       |
| 完整分支名 | `hotfix_5.0.x_138845`           | `fixBranches[0].version`  |

> **多条修复分支时**：若 `fixBranches` 包含多个有效条目（app 非空），列出所有条目，每条独立执行后续 Step 2-8，分别生成用例。

**失败（网络不通或凭据错误）**：
- 输出：`⚠ 禅道访问失败`
- **若用户输入的是旧格式**（已含 org/repo + 版本），继续以旧格式执行
- **若用户仅提供了禅道链接**，提示用户检查网络或手动提供 `应用: {org}/{repo}, 版本: hotfix_...`

---

### Step 2：拉取后端 hotfix 分支（立即执行）

```bash
cd .repos/{org}/{repo}
git fetch origin {完整分支名}
git checkout origin/{完整分支名}
```

执行后输出确认信息：

```
[v] 仓库：.repos/{org}/{repo}
[v] 已切换至分支：{完整分支名}
    最新 commit：{hash} {message}
```

---

### Step 3：分析 hotfix 代码变更（立即执行）

```bash
cd .repos/{org}/{repo}
git log --oneline origin/master..HEAD 2>/dev/null || git log --oneline -10
git diff origin/master HEAD
```

重点关注：
- 新增文件（定时任务 / 新功能）
- 修改文件（bug fix 核心逻辑）
- Mapper XML / 建表 SQL（字段名）
- 枚举类 / 常量类（状态值）

---

### Step 4：确定前端仓库和分支

**默认映射规则：**

| 后端 org         | 前端仓库                             | 前端分支格式                   |
| ---------------- | ------------------------------------ | ------------------------------ |
| `dt-insight-web` | `dt-insight-front/dt-insight-studio` | `dataAssets/release_{version}` |

> 若后端 org 命中上表，直接拉取，**无需询问用户**。
> 若后端 org 不在上表中，则**展示候选仓库列表**请求用户确认，这是 Mode E 中唯一允许的交互点。

```bash
cd .repos/dt-insight-front/dt-insight-studio
git fetch origin
git checkout {frontendBranch}
git pull origin {frontendBranch}
```

---

### Step 5：使用禅道信息（已在 Step 1 获取）

Step 1 成功时，以下字段直接作为 Step 7 的补充上下文：

| 字段 | 用途 |
|------|------|
| `title` | 辅助确认用例标题的功能描述 |
| `steps` | 参考客户复现步骤，提炼前置条件（图片引用跳过） |
| `result` | 若有期望效果，对照填写预期结果 |
| `severity` | 了解 Bug 严重程度（1-4） |

Step 1 失败时，在用例底部补充备注：

```markdown
> 注：禅道信息不可用，本用例基于代码变更生成。如需补充 Bug 背景，请参考：{zentao_url}
```

---

### Step 6：参考历史用例

在 `cases/archive/` 下搜索同功能模块的历史用例，用于：
- 确认导航路径和菜单名称
- 参考用例步骤结构
- 避免重复或遗漏已有覆盖场景

---

### Step 7：生成测试用例

遵循以下规则，仅生成 **一条** 精准的功能测试用例：

1. **用例标题格式**：使用 `【{zentao_bug_id}】验证xxx`，**不使用** `【P0/P1/P2】` 优先级前缀（覆盖通用规范）
2. **导航路径**：必须从前端路由配置 / 菜单配置中确认，禁止猜测
3. **表单字段**：必须从前端源码（TSX 组件）中确认，包含字段名、是否必填、长度限制
4. **SQL 字段名**：必须从 Mapper XML / 建表 SQL 中确认，禁止使用猜测的字段名
5. **步骤完整性**：从零开始（包含新建测试数据），不假设数据已存在
6. **预期结果格式**：必须同时写「修复前：xxx」和「修复后：xxx」两行，缺一不可
7. **禁止模糊词**：不得出现"应该"、"可能"、"大概"等不确定词汇

**禅道信息注入规则（当 Step 5 成功时）：**

| 禅道字段 | 注入位置 | 说明 |
|---------|---------|------|
| `title` | 用例标题 / description frontmatter | 从标题中提炼功能动词和对象 |
| `steps` | 前置条件 | 将复现步骤中涉及的数据环境要求提炼为前置条件；图片描述跳过 |
| `result` | 预期结果 | 对照填写「修复前」的错误表现；「修复后」的正确行为基于代码分析推断 |

详细规范见 `references/hotfix-case-writing.md`

---

### Step 8：输出文件

**文件命名：**

```
{hotfix_version}_{bugId}-{功能简述}.md
```

例：`hotfix_6.2.x_145513-资产目录列表分页.md`

**frontmatter 模板：**

```yaml
---
title: "「在线问题转化」{功能简述}"
suite_name: "在线问题转化"
description: "{一句话描述本用例验证的内容}"
prd_id: ""
prd_version: ""
prd_path: ""
product: "{产品名}"
zentao_bug_id: {bugId}
zentao_url: "http://zenpms.dtstack.cn/zentao/bug-view-{bugId}.html"
dev_version: "hotfix_{version}_{bugId}"
tags:
  - hotfix
  - online-case
  - {功能关键词}
keywords: "{大版本}|{模块}|{数据源类型}|{集群类型}|{最低修复版本}|{Bug原因}"
create_at: "{YYYY-MM-DD}"
update_at: "{YYYY-MM-DD}"
status: "draft"
repos:
  - ".repos/{org}/{repo}"
case_count: 1
origin: zentao
---
```

**存储路径：** `cases/archive/online-cases/{yyyy-MM-dd}/{filename}.md`

**创建根目录快捷链接（同名）：**

```bash
node .claude/shared/scripts/refresh-latest-link.mjs \
  "cases/archive/online-cases/{yyyy-MM-dd}/{filename}.md" \
  "{filename}.md"
```

---

### Step 9：完成报告（固定模版）

任务完成后，在终端输出以下报告：

```
══════════════════════════════════════════
📋 Hotfix 用例生成完成
══════════════════════════════════════════
Bug ID   : #{bugId}
应用     : {org}/{repo}
分支     : hotfix_{version}_{bugId}
输出文件 : cases/archive/online-cases/{yyyy-MM-dd}/{filename}.md
快捷链接 : ./{filename}.md（根目录）

👉 请前往以下路径查收用例：
   cases/archive/online-cases/{yyyy-MM-dd}/{filename}.md
══════════════════════════════════════════
```

---

### IM 通知（自动，强制执行 — 见 `.claude/rules/notification-hook.md`）

根据模式选择对应事件类型：

**模式 A/B/C（Bug 分析 / 前端报错）：**
```bash
node .claude/shared/scripts/notify.mjs \
  --event bug-report \
  --data '{"reportFile":"<报告文件路径>","summary":"<报告摘要，如：发现 N 个 P1 Bug>"}'
```

**模式 D（合并冲突分析）：**
```bash
node .claude/shared/scripts/notify.mjs \
  --event conflict-analyzed \
  --data '{"reportFile":"<报告文件路径>","conflictCount":<冲突文件数>,"branches":"<涉及分支>"}'
```

**模式 E（Hotfix 用例生成 / 线上问题转化）：**
```bash
node .claude/shared/scripts/notify.mjs \
  --event hotfix-case-generated \
  --data '{"bugId":"<禅道BugID>","branch":"<hotfix分支>","file":"<用例文件路径>","changedFiles":<变更文件数>}'
```

> ⚠️ 若 notify.mjs 执行失败，仅 console.error 记录，不影响已生成的报告文件。
> 💡 调试：添加 `--dry-run` 查看发送内容。

---

### Step 10：自审查清单（必须执行，不可跳过）

- [ ] 导航路径与前端菜单配置一致（已对照源码验证）
- [ ] 表单字段名称与前端 TSX 源码一致
- [ ] SQL 字段名与 Mapper XML / 建表 SQL 一致
- [ ] 预期结果同时包含「修复前：xxx」和「修复后：xxx」两行，缺一不可
- [ ] frontmatter `origin: zentao`，`prd_id/prd_version/prd_path` 均为空字符串
- [ ] `keywords` 已填写（6个位置，未知项留空，格式：`版本|模块|数据源|集群|修复版本|原因`）
- [ ] 文件已保存到 `cases/archive/online-cases/{yyyy-MM-dd}/`
- [ ] 根目录同名快捷链接已创建并指向正确路径
- [ ] 步骤从零开始（包含新建测试数据），无跳步假设
- [ ] 无模糊词（"应该"、"可能"、"参考"等）

---

## 六、输出汇总

| 模式          | 文件格式                          | 存储位置                          |
| ------------- | --------------------------------- | --------------------------------- |
| 后端 Bug 分析 | `<Bug标题>.html`                  | `reports/bugs/{yyyy-MM-dd}/`      |
| 合并冲突      | `<冲突描述>.html`                 | `reports/conflicts/{yyyy-MM-dd}/` |
| 前端报错分析  | `<Bug标题>.html`                  | `reports/bugs/{yyyy-MM-dd}/`      |
| Hotfix 用例   | `hotfix_{version}_{bugId}-{功能简述}.md` | `cases/archive/online-cases/{yyyy-MM-dd}/` + 根目录同名快捷链接 |

---

## 七、参考文件

| 文件                                    | 说明                                 |
| --------------------------------------- | ------------------------------------ |
| `references/bug-report-template.md`     | Bug 报告完整 HTML 模板（含样式规范） |
| `references/env-vs-code-checklist.md`   | 环境问题 vs 代码问题判断清单         |
| `references/conflict-resolution.md`     | 合并冲突分析与 HTML 输出格式规范     |
| `references/hotfix-case-writing.md`     | Hotfix 用例编写规范（预期结果格式、frontmatter 模板、质量清单） |
| `references/backend-analysis-flow.md`   | 模式 A 后端 Bug 分析完整流程         |
| `references/conflict-analysis-flow.md`  | 模式 B 合并冲突分析完整流程          |
| `references/frontend-analysis-flow.md`  | 模式 C 前端报错分析完整流程          |
| `references/hotfix-case-flow.md`        | 模式 E Hotfix 用例生成完整流程       |

---

## 八、JSON 数据完整性检查清单

生成 JSON 前确认：
- [ ] `severity` 已填写（P0/P1/P2/P3）
- [ ] `ENVIRONMENT_URL` 为完整 baseURL（非相对路径）
- [ ] `BRANCH_NAME` 和 `COMMIT_HASH` 已从仓库读取
- [ ] `ROOT_CAUSE` 为自然语言，非堆栈信息
- [ ] `PROBLEM_CODE` 中错误行包含 `// <-- 问题在这里` 注释
- [ ] `FIX_CODE` 包含 3-5 行上下文（可直接粘贴）
- [ ] 敏感信息已替换为 `***`
- [ ] 所有必填字段均已填写

---

## 九、关联说明

| 项目       | 说明                                                           |
| ---------- | -------------------------------------------------------------- |
| 工作流关系 | **完全独立**，不属于 test-case-generator 的任何步骤            |
| 代码仓库   | 使用 `.repos/` 下的源码仓库，详见 CLAUDE.md「编排说明」 |
| 安全规则   | 只读访问，禁止 push/commit，详见 CLAUDE.md「规范索引」 |
