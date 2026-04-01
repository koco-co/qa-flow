# Phase 5: IM Notification Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 05-im-notification-integration
**Areas discussed:** 通知模块架构, 触发点与消息内容, 渠道特殊处理, .env 配置与 dry-run

---

## 通知模块架构 — 渠道组织

| Option | Description | Selected |
|--------|-------------|----------|
| 单文件多函数 | notify.mjs 一个文件包含所有渠道适配器 + dispatch() | ✓ |
| 多文件插件式 | 每个渠道独立 .mjs 文件，notify.mjs 动态加载 | |
| 配置驱动加载 | 渠道由 config.json 注册，用户可添加自定义渠道 | |

**User's choice:** 单文件多函数

## 通知模块架构 — 消息格式

| Option | Description | Selected |
|--------|-------------|----------|
| Markdown 为主 | 消息体 Markdown，各渠道适配器负责格式转换 | ✓ |
| 纯文本通用 | 统一纯文本，不做格式转换 | |
| 结构化 JSON | 用 JSON 结构，渠道适配器生成富文本卡片 | |

**User's choice:** Markdown 为主

---

## 触发点与消息内容 — 触发事件

| Option | Description | Selected |
|--------|-------------|----------|
| 用例生成完成 | test-case-generator 成功后发送 | ✓ |
| Bug 报告生成 | code-analysis-report 完成后发送 | ✓ |
| 工作流失败 | 任何 Skill 执行失败时发送 | ✓ |
| 归档转化完成 | archive-converter 完成后发送 | ✓ |

**User's choice:** 全部四种事件

## 触发点与消息内容 — 消息模板

| Option | Description | Selected |
|--------|-------------|----------|
| 标准头 + 动态体 | 固定头部 + 按事件类型填充数据 | ✓ |
| 纯文本摘要 | 写死模板文本，变量替换 | |
| 卡片式富文本 | 卡片形式（标题+字段+按钮） | |

**User's choice:** 标准头 + 动态体

---

## 渠道特殊处理 — 钉钉安全关键词

| Option | Description | Selected |
|--------|-------------|----------|
| 配置化关键词 | .env 配置 DINGTALK_KEYWORD，自动检查并追加 | ✓ |
| 仅文档说明 | 不做自动处理，文档提示用户 | |
| 强制前缀 | 所有消息强制添加固定前缀 | |

**User's choice:** 配置化关键词

## 渠道特殊处理 — 签名校验

| Option | Description | Selected |
|--------|-------------|----------|
| 仅 webhook URL | v1 不实现签名校验，飞书企微用无签名 webhook | ✓ |
| 支持签名校验 | 实现飞书 HMAC-SHA256 和企微 IP 白名单 | |

**User's choice:** 仅 webhook URL

---

## .env 配置与 dry-run — 启停逻辑

| Option | Description | Selected |
|--------|-------------|----------|
| 有 URL 即启用 | 设置了 webhook URL 则自动启用，无需 ENABLE 开关 | ✓ |
| 显式开关 | 需要 ENABLED=true + URL 两个条件 | |
| 混合模式 | 有 URL 自动启用，可用 ENABLED=false 显式禁用 | |

**User's choice:** 有 URL 即启用

## .env 配置与 dry-run — 输出格式

| Option | Description | Selected |
|--------|-------------|----------|
| 完整 payload | 打印每个渠道的完整请求 JSON（URL/headers/body） | ✓ |
| 摘要信息 | 只打印渠道名 + 标题 + 状态 | |

**User's choice:** 完整 payload

---

## Claude's Discretion

- dispatch() API 签名设计
- 消息模板具体 Markdown 格式
- nodemailer SMTP 配置字段
- 错误处理（单渠道失败是否影响其他）
- 邮箱 HTML 转换实现

## Deferred Ideas

- 飞书 HMAC-SHA256 签名校验
- 企微 IP 白名单提示
- Slack/Teams 国际渠道
- 消息中嵌入可点击链接
