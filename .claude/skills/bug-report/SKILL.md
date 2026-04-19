---
name: bug-report
description: "Bug 报告生成。解析后端 Java 异常堆栈或前端 Console 报错，按日志特征自动路由到 backend-bug-agent 或 frontend-bug-agent，输出结构化 HTML Bug 报告。触发词：分析这个报错、帮我看这个异常、生成 bug 报告、分析 Java 堆栈、分析前端报错、Exception、NullPointerException、TypeError、ReferenceError。默认用禅道兼容模板输出，可用 --template full 切换完整样式版。"
argument-hint: "[报错日志 / 堆栈文本 / 前端 Console 错误 | --template full]"
---

<role>
你是 bug-report 编排技能，负责把后端 Java 异常堆栈或前端 Console 报错路由到对应的分析 Agent（`backend-bug-agent` / `frontend-bug-agent`），并把 JSON 输出渲染为 HTML 报告。分析逻辑由 Agent 完成，本 skill 只负责路由、源码同步门禁、渲染和通知。
</role>

<inputs>
- 报错日志文本：Java 异常堆栈、HTTP 错误响应、curl 请求信息；或前端 Console 错误、React/Vue 运行时警告、白屏日志等
- `workspace/{{project}}` 输出目录、`config.ts` 配置、只读源码副本（按需同步）
- 可选参数：`--template full`（切换为完整样式 HTML，非禅道兼容）
</inputs>

<pre_guard>
<hard_required>报错主堆栈/主报错文本不可为空；必须包含可识别的异常关键字或用户明确声明后端/前端</hard_required>
<soft>缺少环境信息（JDK 版本、浏览器版本）/ 接口 curl / 重现步骤仍可继续分析，但需在报告中标注"未提供"</soft>
<blocking_unknown>仅有一句"报错了"、无堆栈、无错误文本 → 追问必填项，不进入 agent 派发</blocking_unknown>
<invalid_input>输入为空、纯截图无可解析文本 → 立即返回输入无效</invalid_input>
</pre_guard>

<routing>
  <backend_signals>
    - `Exception`、`Caused by`、`java.lang`、`at {{class_name}}.{{method_name}}`
    - Spring / MyBatis / Hibernate 包名
    - 数据库报错：`SQLException`、`DataIntegrityViolationException`
    - HTTP 5xx 响应（服务端错误）
  </backend_signals>
  <frontend_signals>
    - `TypeError`、`ReferenceError`、`ChunkLoadError`、`SyntaxError`
    - `React error`、`Vue warn`、`Cannot read properties of undefined`
    - `at http(s)://...`、`.js:{{line}}:{{column}}` 位置标注
    - 浏览器厂商专属错误：`webpack__require__`、`Failed to fetch dynamically imported module`
  </frontend_signals>
  <ambiguous>两类信号都没有或同时出现 → AskUserQuestion 询问"属于后端还是前端？"</ambiguous>
</routing>

<confirmation_policy>
<rule id="status_only">模式识别、分析摘要、报告生成完成仅作状态展示，不要求确认。</rule>
<rule id="no_merge">引用源码 / 执行 repo sync 与写回 `.env` / 分支映射是两道独立门禁，不得合并为一次确认。</rule>
<rule id="reference_sync">引用源码或执行 repo sync 前，先展示 repo/branch/path 摘要并请求允许。</rule>
<rule id="writeback">写回 `.env`、repo branch mapping 或其他配置前，必须单独展示变更预览并再次确认；拒绝写回时可继续本次分析。</rule>
</confirmation_policy>

<output_contract>
<backend_bug_json>{"title":"...","summary":"...","classification":"environment|code|mixed|unknown","root_cause":"...","evidence":[],"fix_suggestions":[],"uncertainty":[]}</backend_bug_json>
<frontend_bug_json>{"title":"...","summary":"...","classification":"environment|code|mixed|unknown","root_cause":"...","evidence":[],"fix_suggestions":[],"uncertainty":[]}</frontend_bug_json>
</output_contract>

## 执行前准备

参见 [`.claude/references/skill-preamble.md`](../../references/skill-preamble.md)（项目选择、读取配置、符号规则、异常处理通用片段）。

环境 vs 代码根因判断辅助：[`.claude/references/env-vs-code.md`](../../references/env-vs-code.md)。

---

## 步骤

### 1. 路由识别

根据 `<routing>` 判定走后端分支（派发 `backend-bug-agent`）或前端分支（派发 `frontend-bug-agent`）。若歧义，AskUserQuestion 询问。

### 2. 源码引用许可与可选写回（双门策略）

> **⚠️ 强制规则：引用源码 / 执行 repo sync 与写回 `.env` / 分支映射是两道独立门禁，不得合并为一次确认。**

执行流程：

1. 根据报错信息中的包名、模块名，从 `config.repos` 推断最可能的仓库和分支
2. 通过 AskUserQuestion 工具先展示"引用/同步"摘要并等待许可：

   确认格式：`确认 [源码引用] 分析 → 目标: [repo_name @ branch] → 来源: [config.repos 推断]`

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

### 3. 派发分析 Agent

- **后端分支**：派发 `backend-bug-agent`（model: sonnet），传入报错日志和源码上下文，Agent 返回 `backend_bug_json`
- **前端分支**：派发 `frontend-bug-agent`（model: sonnet），传入前端报错信息和源码上下文，Agent 返回 `frontend_bug_json`

### 4. 渲染 HTML 报告

将 JSON 数据写入 `workspace/{{project}}/reports/bugs/{{YYYYMMDD}}/{{Bug标题}}.html`。

可用模板（位于 `templates/` 目录）：

- `bug-report-zentao.html.hbs` — **默认**，禅道富文本编辑器兼容（全 inline style，table 布局，可直接粘贴到禅道）
- `bug-report-full.html.hbs` — 完整样式版，独立 HTML 查看，含 CSS 变量、渐变、flexbox 等高级样式
- `bug-report.html.hbs` — 旧版模板（保留兼容）

默认使用禅道兼容模板。用户可通过 `--template full` 参数切换为完整样式版。

若目录不存在则先创建：

```bash
mkdir -p workspace/{{project}}/reports/bugs/{{YYYYMMDD}}
```

### 5. 发送通知

```bash
bun run .claude/scripts/plugin-loader.ts notify --event bug-report --data '{"reportFile":"{{path}}","summary":"{{one_line_summary}}"}'
```

### 6. 完成摘要（状态展示，无需确认）

```
Bug 分析完成

报告：{{report_path}}
根因：{{root_cause_summary}}
```

---

## 输出目录约定

| 类型                  | 目录                                           |
| --------------------- | ---------------------------------------------- |
| Bug 报告（后端/前端） | `workspace/{{project}}/reports/bugs/YYYYMMDD/` |
| 临时文件              | `workspace/{{project}}/.temp/`                 |
