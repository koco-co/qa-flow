---
name: bug-report
description: "Bug 报告生成。解析后端 Java 堆栈或前端 Console 报错，自动路由到对应 agent，输出 HTML 报告。触发词：分析报错、生成 bug 报告、Exception、TypeError、--template full。"
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

## 工作流总览

| 步骤 | 名称       | 职责                                                       |
| ---- | ---------- | ---------------------------------------------------------- |
| 1    | 路由识别   | 按 `<routing>` 信号判定后端/前端，歧义时 AskUser           |
| 2    | 源码引用   | 双门策略：sync 与 writeback 独立确认                       |
| 3    | 派发 Agent | 后端 → `backend-bug-agent` / 前端 → `frontend-bug-agent`   |
| 4    | 渲染报告   | 选模板（zentao 默认 / `--template full`），写入 reports/ |
| 5    | 发送通知   | 触发 plugin-loader notify 事件                             |
| 6    | 完成摘要   | 状态展示，无需确认                                         |

## 路由分支

- 路由识别与回退（含错误纠正策略）：详见 [`workflow/routing.md`](workflow/routing.md)
- 后端分支（步骤 2-3，含 `backend-bug-agent` 调用）：详见 [`workflow/backend.md`](workflow/backend.md)
- 前端分支（步骤 2-3，含 `frontend-bug-agent` 调用）：详见 [`workflow/frontend.md`](workflow/frontend.md)
- 渲染、通知与目录约定（步骤 4-6）：详见 [`workflow/rendering.md`](workflow/rendering.md)
