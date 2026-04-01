# Phase 5: IM Notification Integration - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

构建统一通知模块 `notify.mjs`，支持钉钉、飞书、企微、SMTP 邮箱四渠道通知。QA 工作流完成关键事件后自动分发结构化通知，通过 `.env` 配置渠道启停，支持 `--dry-run` 调试模式。

</domain>

<decisions>
## Implementation Decisions

### 通知模块架构
- **D-01:** 采用**单文件多函数**架构 — `notify.mjs` 一个文件包含所有渠道适配器（sendDingTalk/sendFeishu/sendWeCom/sendEmail）+ dispatch() 统一入口。四个渠道代码量不大（各 30-50 行），无需拆分文件
- **D-02:** 消息格式以 **Markdown 为主** — 消息体用 Markdown 编写，各渠道适配器负责格式转换（钉钉原生 Markdown、飞书转富文本、企微原生 Markdown、邮箱转 HTML）

### 触发点与消息内容
- **D-03:** 触发四种工作流事件：① 用例生成完成（用例数/XMind 路径/耗时）② Bug 报告生成（报告摘要/文件路径）③ 工作流失败（步骤名/错误原因）④ 归档转化完成（文件数/用例数）
- **D-04:** 消息模板采用**标准头 + 动态体** — 固定头部（项目名 + 事件类型 + 时间戳），动态体根据事件类型填充具体数据

### 渠道特殊处理
- **D-05:** 钉钉安全关键词采用**配置化处理** — `.env` 中配置 `DINGTALK_KEYWORD`，发送前检查消息标题是否包含关键词，不包含则自动追加到标题末尾
- **D-06:** 飞书和企微 **v1 仅支持 webhook URL** — 不实现签名校验（HMAC-SHA256）和 IP 白名单。两者的自定义机器人都支持无签名 webhook 模式

### .env 配置与 dry-run
- **D-07:** 渠道启停采用**有 URL 即启用** — `.env` 中设置了 `DINGTALK_WEBHOOK_URL` 则钉钉自动启用，未设置则跳过。无需额外 ENABLE 开关
- **D-08:** `--dry-run` 输出**完整 payload** — 打印每个启用渠道的完整请求信息（JSON 格式，含 URL、headers、body），但不发送网络请求

### Claude's Discretion
- dispatch() 的具体 API 签名设计（参数命名和结构）
- 消息模板的具体 Markdown 格式和排版
- nodemailer 的 SMTP 配置字段命名
- 错误处理策略（单渠道失败是否影响其他渠道）
- 邮箱 HTML 转换的具体实现方式

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目定义
- `.planning/PROJECT.md` — 项目愿景、核心价值、技术栈约束（Node.js ESM，nodemailer 为邮箱唯一例外依赖）
- `.planning/REQUIREMENTS.md` — NOTF-01 至 NOTF-07 需求定义和验收标准
- `.planning/ROADMAP.md` — Phase 5 成功标准（5 条 must-be-TRUE 条件）

### 前序阶段上下文
- `.planning/phases/01-generalization-refactor/01-CONTEXT.md` — Config schema 泛化、手写验证、ESM 模块系统
- `.planning/phases/04-core-skills-redesign/04-CONTEXT.md` — Skill 改造策略、config 驱动模式

### 集成点
- `.claude/skills/test-case-generator/SKILL.md` — 触发点 1：用例生成完成后调用 notify
- `.claude/skills/code-analysis-report/SKILL.md` — 触发点 2：Bug 报告生成后调用 notify
- `.claude/skills/archive-converter/SKILL.md` — 触发点 4：归档转化完成后调用 notify
- `.claude/shared/scripts/load-config.mjs` — 配置加载入口（notify.mjs 可能需要读取 config）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `load-config.mjs` — 配置加载 + 路径解析，notify.mjs 可通过此获取项目名等信息
- Node.js 内置 `https` 模块 — webhook POST 请求无需外部 HTTP 库
- `dotenv` 不引入 — 用 Node.js 内置方式读取 `.env`（或由 Claude Code 环境注入）

### Established Patterns
- ESM 模块系统（.mjs 文件），named exports
- 零外部依赖偏好（nodemailer 为 NOTF-05 明确要求的例外）
- 脚本通过 `node notify.mjs <args>` 命令行调用，Claude 在 Skill 步骤中执行

### Integration Points
- 各 Skill 的最后一步需添加 notify 调用（通过 Skill prompts 中的步骤指令）
- `.env` 文件不进 git（已在 .gitignore 中），`.env.example` 作为模板提交
- `--dry-run` 参数在 CLI 调用时传入

</code_context>

<specifics>
## Specific Ideas

- dispatch() 调用示例：`node .claude/shared/scripts/notify.mjs --event case-generated --data '{"count":42,"file":"latest-output.xmind"}'`
- 钉钉关键词自动追加示例：配置 `DINGTALK_KEYWORD=qa-flow`，消息标题 "用例生成完成" → "用例生成完成 qa-flow"
- 消息标准头示例：`[qa-flow] 用例生成完成 | 2026-03-31 15:30`
- dry-run 输出示例：每渠道打印 `{ channel: "dingtalk", url: "https://...", body: {...} }`

</specifics>

<deferred>
## Deferred Ideas

- 飞书 HMAC-SHA256 签名校验 — v2 安全增强
- 企微 IP 白名单提示 — v2 安全增强
- Slack/Teams 等国际 IM 渠道支持 — 开源后按社区需求添加
- 通知消息中嵌入可点击链接（需要部署环境 URL 映射） — v2 功能

</deferred>

---

*Phase: 05-im-notification-integration*
*Context gathered: 2026-03-31*
