# Phase 5: IM Notification Integration - Research

**Researched:** 2026-04-01
**Domain:** Node.js ESM webhook notifications (DingTalk / Feishu / WeCom / SMTP)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** 单文件多函数架构 — `notify.mjs` 包含所有渠道适配器（sendDingTalk/sendFeishu/sendWeCom/sendEmail）+ `dispatch()` 统一入口
- **D-02:** 消息格式以 Markdown 为主 — 各适配器负责格式转换（钉钉原生 Markdown、飞书转富文本、企微原生 Markdown、邮箱转 HTML）
- **D-03:** 触发四种工作流事件：① 用例生成完成 ② Bug 报告生成 ③ 工作流失败 ④ 归档转化完成
- **D-04:** 消息模板采用标准头 + 动态体 — 固定头部（项目名 + 事件类型 + 时间戳），动态体根据事件类型填充
- **D-05:** 钉钉安全关键词配置化 — `DINGTALK_KEYWORD` 环境变量，发送前检查标题，不含则自动追加
- **D-06:** 飞书和企微 v1 仅支持 webhook URL — 不实现签名校验（HMAC-SHA256）和 IP 白名单
- **D-07:** 渠道启停采用「有 URL 即启用」 — 设置了 `DINGTALK_WEBHOOK_URL` 则钉钉自动启用，未设置跳过；无 ENABLE 开关
- **D-08:** `--dry-run` 输出完整 payload — 打印每个启用渠道的完整请求信息（JSON，含 URL、headers、body），不发送网络请求

### Claude's Discretion

- `dispatch()` 的具体 API 签名设计（参数命名和结构）
- 消息模板的具体 Markdown 格式和排版
- nodemailer 的 SMTP 配置字段命名
- 错误处理策略（单渠道失败是否影响其他渠道）
- 邮箱 HTML 转换的具体实现方式

### Deferred Ideas (OUT OF SCOPE)

- 飞书 HMAC-SHA256 签名校验 — v2 安全增强
- 企微 IP 白名单提示 — v2 安全增强
- Slack/Teams 等国际 IM 渠道支持 — 开源后按社区需求添加
- 通知消息中嵌入可点击链接（需要部署环境 URL 映射） — v2 功能
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NOTF-01 | 统一 notify.mjs 通知模块 — 单一入口，多渠道分发 | D-01：单文件 + `dispatch()` 入口；CLI 参数解析模式（`process.argv.slice(2)`）见 Architecture Patterns |
| NOTF-02 | 钉钉 webhook 通知 — 支持安全关键词配置 | DingTalk webhook API、`msgtype:markdown`、关键词自动追加逻辑（D-05）|
| NOTF-03 | 飞书 webhook 通知 | Feishu bot webhook API、`msg_type:interactive` 或 `text`、无签名模式（D-06）|
| NOTF-04 | 企业微信 webhook 通知 | WeCom webhook API、`msgtype:markdown`、无签名模式（D-06）|
| NOTF-05 | 邮箱通知 — 使用 nodemailer | nodemailer 8.x SMTP transport、Markdown→HTML 转换、SMTP env vars |
| NOTF-06 | 通知触发点集成 — Bug 报告 / 用例生成 / 脚本执行完成后自动触发 | 三个 Skill SKILL.md 最后一步添加 `notify` step；step ID = `notify` 已在 test-case-generator 中定义 |
| NOTF-07 | .env 配置模板 — 各渠道 webhook URL / SMTP 配置 | `.env.example` 模板结构；D-07「有 URL 即启用」模式 |
</phase_requirements>

---

## Summary

Phase 5 构建一个完全自包含的 `notify.mjs` 脚本（放置于 `.claude/shared/scripts/`），遵循项目已有的零外部依赖偏好（nodemailer 为唯一 npm 例外）。

**核心逻辑**：CLI 传入 `--event` + `--data`（JSON 字符串），`dispatch()` 读取环境变量决定启用哪些渠道，并行发送到所有已配置渠道。各渠道适配器各自处理格式转换，互相独立。`--dry-run` 模式拦截所有 HTTP 调用，只打印 payload。

**四个渠道 API 特征**：DingTalk/WeCom 原生支持 Markdown；飞书推荐用 `interactive` card 或 `post` 富文本（可降级为 text）；邮箱需 Markdown→HTML 转换（可手工实现 marked-subset，不引入第三方库）。

**Primary recommendation:** 使用 Node.js 内置 `https` 模块发 webhook，nodemailer 处理 SMTP，`process.argv.slice(2)` 解析 CLI 参数，遵循现有 `--dry-run` 模式（参考 `audit-md-frontmatter.mjs`）。

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:https` | 内置 | DingTalk/Feishu/WeCom webhook POST | 零依赖，项目约束 |
| `nodemailer` | 8.0.4 (latest) | SMTP 邮件发送 | NOTF-05 明确要求；node:net 不支持 SMTP 协议 |
| `node:test` + `node:assert` | 内置 | 单元测试 | 项目现有测试框架（load-config.test.mjs 范例）|

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:fs` | 内置 | 读取 .env 文件（若需要手动解析）| .env 非 git 跟踪，需自行解析 |
| `load-config.mjs` | 项目内部 | 获取 `config.project.name` 作为消息头前缀 | 构造标准头时读取项目名 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node:https` | `node-fetch` / `axios` | 违反零依赖约束；`https` 内置足够 |
| 手工 MD→HTML | `marked` | 引入依赖；简单 subset 转换（`## → <h2>`、`**bold**`、换行）已够用 |
| 手工 .env 解析 | `dotenv` | 引入依赖；只需 20 行解析即可满足需求 |

**Installation:**
```bash
# 在 .claude/shared/scripts/ 目录下
npm install nodemailer
```

**Version verification:**
```
nodemailer: 8.0.4 (verified via npm view nodemailer version)
```

---

## Architecture Patterns

### Recommended Project Structure

```
.claude/shared/scripts/
├── notify.mjs                  # 新增：统一通知模块（NOTF-01 至 NOTF-07）
└── notify.test.mjs             # 新增：单元测试

.env.example                    # 新增（根目录）：所有渠道配置模板
```

**Skill 触发点修改（NOTF-06）：**
```
.claude/skills/test-case-generator/SKILL.md   # step 11 已有 notify 占位，补充调用指令
.claude/skills/code-analysis-report/SKILL.md  # 最后步骤添加 notify 调用
.claude/skills/archive-converter/SKILL.md     # 第八节「完成通知」改为调用 notify.mjs
```

### Pattern 1: dispatch() 统一入口

**What:** 外部调用唯一入口，读取 env 决定启用哪些渠道，并行发送，聚合结果

**When to use:** 所有 Skill 触发点均通过此函数

```javascript
// Source: D-01 + 项目现有 CLI 模式（audit-md-frontmatter.mjs）
// CLI 调用示例
// node .claude/shared/scripts/notify.mjs --event case-generated --data '{"count":42,"file":"latest-output.xmind"}'

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const eventIndex = args.indexOf("--event");
const dataIndex = args.indexOf("--data");
const event = eventIndex !== -1 ? args[eventIndex + 1] : null;
const data = dataIndex !== -1 ? JSON.parse(args[dataIndex + 1]) : {};

export async function dispatch(event, data, { dryRun = false } = {}) {
  const channels = getEnabledChannels();  // 读取 env
  const results = await Promise.allSettled(
    channels.map(ch => sendToChannel(ch, event, data, dryRun))
  );
  return results;
}
```

### Pattern 2: 渠道启停（D-07）

```javascript
// 有 URL 即启用，无需 ENABLE 开关
function getEnabledChannels() {
  const channels = [];
  if (process.env.DINGTALK_WEBHOOK_URL) channels.push("dingtalk");
  if (process.env.FEISHU_WEBHOOK_URL)   channels.push("feishu");
  if (process.env.WECOM_WEBHOOK_URL)    channels.push("wecom");
  if (process.env.SMTP_HOST && process.env.SMTP_USER) channels.push("email");
  return channels;
}
```

### Pattern 3: 钉钉 Webhook API（NOTF-02）

**API:** `POST https://oapi.dingtalk.com/robot/send?access_token=<TOKEN>`

```javascript
// Source: DingTalk open platform docs
// msgtype: "markdown" 原生支持，title 用于手机通知栏显示
async function sendDingTalk(title, markdownText, dryRun) {
  // D-05: 关键词检查
  const keyword = process.env.DINGTALK_KEYWORD;
  const safeTitle = keyword && !title.includes(keyword)
    ? `${title} ${keyword}`
    : title;

  const payload = {
    msgtype: "markdown",
    markdown: { title: safeTitle, text: markdownText }
  };
  const url = process.env.DINGTALK_WEBHOOK_URL;
  if (dryRun) {
    console.log(JSON.stringify({ channel: "dingtalk", url, body: payload }, null, 2));
    return;
  }
  return httpsPost(url, payload);
}
```

### Pattern 4: 飞书 Webhook API（NOTF-03）

**API:** `POST https://open.feishu.cn/open-apis/bot/v2/hook/<HOOK_ID>`

```javascript
// Source: Feishu open platform docs
// 无签名模式（D-06）。msg_type 推荐 "interactive" card，降级可用 "text"
// 简单实现用 "post"（富文本）可展示 Markdown 段落
async function sendFeishu(title, markdownText, dryRun) {
  // 飞书不支持原生 Markdown，转为 post 富文本（简单实现）
  const payload = {
    msg_type: "post",
    content: {
      post: {
        zh_cn: {
          title,
          content: [[{ tag: "text", text: markdownText }]]
        }
      }
    }
  };
  const url = process.env.FEISHU_WEBHOOK_URL;
  if (dryRun) {
    console.log(JSON.stringify({ channel: "feishu", url, body: payload }, null, 2));
    return;
  }
  return httpsPost(url, payload);
}
```

### Pattern 5: 企微 Webhook API（NOTF-04）

**API:** `POST https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=<KEY>`

```javascript
// Source: WeCom open platform docs
// msgtype: "markdown" 原生支持
async function sendWeCom(markdownText, dryRun) {
  const payload = {
    msgtype: "markdown",
    markdown: { content: markdownText }
  };
  const url = process.env.WECOM_WEBHOOK_URL;
  if (dryRun) {
    console.log(JSON.stringify({ channel: "wecom", url, body: payload }, null, 2));
    return;
  }
  return httpsPost(url, payload);
}
```

### Pattern 6: nodemailer SMTP（NOTF-05）

```javascript
// Source: nodemailer 8.x official docs — https://nodemailer.com/usage/
import nodemailer from "nodemailer";

async function sendEmail(subject, htmlBody, dryRun) {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  const mailOptions = {
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to: process.env.SMTP_TO,
    subject,
    html: htmlBody,
  };
  if (dryRun) {
    console.log(JSON.stringify({ channel: "email", mailOptions }, null, 2));
    return;
  }
  return transport.sendMail(mailOptions);
}
```

### Pattern 7: https POST 辅助函数

```javascript
// Source: Node.js 内置 https 模块
import { request } from "node:https";

function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data = JSON.stringify(body);
    const req = request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    }, (res) => {
      let raw = "";
      res.on("data", chunk => raw += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve(raw); }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}
```

### Pattern 8: 消息模板（D-04）

```javascript
// 标准头 + 动态体
function buildMessage(event, data) {
  const config = loadConfig();
  const projectName = config.project?.name ?? "qa-flow";
  const timestamp = new Date().toLocaleString("zh-CN", { hour12: false });

  const eventLabels = {
    "case-generated":   "用例生成完成",
    "bug-report":       "Bug 报告生成",
    "workflow-failed":  "工作流失败",
    "archive-converted":"归档转化完成",
  };
  const label = eventLabels[event] ?? event;
  const title = `[${projectName}] ${label}`;  // 用于钉钉 title + email subject
  const header = `**[${projectName}] ${label}** | ${timestamp}`;

  // 动态体由调用方通过 data 传入
  const body = buildBody(event, data);
  const markdown = `${header}\n\n${body}`;
  return { title, markdown, html: mdToHtml(markdown) };
}
```

### Pattern 9: .env 文件解析（零依赖）

```javascript
// 项目不引入 dotenv（D-07 context）
// 如果 Claude Code 环境注入了 env，直接读 process.env 即可
// 如果需要手工解析（本地调试），以下 20 行足够
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv(path = resolve(process.cwd(), ".env")) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;  // 不覆盖已有 env
  }
}
```

### Anti-Patterns to Avoid

- **在 Skill 步骤中直接拼 webhook URL**：应通过 `notify.mjs` 统一调用，保持单一出口
- **单渠道失败阻断其他渠道**：使用 `Promise.allSettled` 而非 `Promise.all`，确保单渠道失败不影响其他
- **硬编码项目名**：从 `load-config.mjs` 读取 `config.project.name`
- **飞书使用原生 Markdown**：飞书 webhook 不支持 Markdown，需转 `post` 或 `interactive` 格式
- **DingTalk 不设 title**：`msgtype:markdown` 必须有 `title` 字段，否则手机通知栏显示异常

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SMTP 协议实现 | 自写 TCP/TLS SMTP 握手 | `nodemailer` | AUTH、STARTTLS、重试、连接池有大量边界情况 |
| 完整 Markdown parser | 自写完整 AST parser | 简单 subset 转换 (5-10 regex) | 邮件 HTML 只需 heading/bold/italic/列表，无需完整 CommonMark |

**Key insight:** DingTalk/WeCom 原生 Markdown 不需要任何转换；飞书只需简单文本包装；邮件只需基础 HTML tags。不要为转换引入 `marked` 等库。

---

## Common Pitfalls

### Pitfall 1: DingTalk 安全关键词未命中导致消息被丢弃

**What goes wrong:** 钉钉机器人配置了关键词安全设置时，消息中不含该关键词会被静默丢弃（HTTP 200 但 `errcode != 0`）

**Why it happens:** DingTalk webhook 响应 `{"errcode":310000,"errmsg":"keywords not in content"}` 但 HTTP 状态码仍为 200

**How to avoid:** D-05 实现标题自动追加；同时检查 webhook 响应 body 的 `errcode` 字段，非 0 视为失败并 `console.error`

**Warning signs:** 消息无声无息未送达，检查返回 JSON 的 `errcode`

### Pitfall 2: 飞书 msg_type 错误

**What goes wrong:** 直接把 DingTalk 的 Markdown payload 发到飞书会报错

**Why it happens:** 飞书不支持 `msgtype:markdown`；其格式为 `msg_type: "text"/"post"/"interactive"`

**How to avoid:** 飞书适配器必须独立构造 `post` 或 `text` 格式 payload

### Pitfall 3: .env 未被 Claude Code 自动注入时读取失败

**What goes wrong:** 本地 `node notify.mjs` 时找不到 env 变量，`DINGTALK_WEBHOOK_URL` 为 undefined，通道被静默跳过

**Why it happens:** 项目不引入 `dotenv`，Claude Code 环境注入的 env 在直接 CLI 运行时不存在

**How to avoid:** `loadDotEnv()` 在脚本顶部调用（仅不覆盖已有 env）；在 .env.example 上方注明此行为

### Pitfall 4: nodemailer transport 未关闭

**What goes wrong:** SMTP 连接池未关闭，脚本不退出

**Why it happens:** nodemailer 内部保持连接池

**How to avoid:** `sendMail` 结束后调用 `transport.close()`

### Pitfall 5: Promise.all 导致一个渠道失败阻断所有渠道

**What goes wrong:** 网络超时或配置错误导致其他渠道通知也未送出

**Why it happens:** `Promise.all` 在第一个 rejected 时立即 throw

**How to avoid:** 使用 `Promise.allSettled`，对每个 `{ status: "rejected" }` 结果单独 `console.error`

---

## Code Examples

### 完整消息头示例（D-04）
```
**[qa-flow] 用例生成完成** | 2026-04-01 15:30:00

- 用例数：42 条
- 输出文件：latest-output.xmind
- 耗时：3m 21s
```

### 钉钉关键词追加（D-05）
```
配置 DINGTALK_KEYWORD=qa-flow
消息标题 "用例生成完成" → "用例生成完成 qa-flow"
消息标题 "用例生成完成 qa-flow" → 不变
```

### dry-run 输出示例（D-08）
```json
{
  "channel": "dingtalk",
  "url": "https://oapi.dingtalk.com/robot/send?access_token=xxx",
  "body": {
    "msgtype": "markdown",
    "markdown": {
      "title": "用例生成完成 qa-flow",
      "text": "**[qa-flow] 用例生成完成** | 2026-04-01 15:30\n\n- 用例数：42 条\n..."
    }
  }
}
```

### Skill 触发点调用示例（NOTF-06）
```bash
# test-case-generator step 11 (notify)
node .claude/shared/scripts/notify.mjs \
  --event case-generated \
  --data '{"count":42,"file":"latest-output.xmind","duration":"3m21s"}'

# code-analysis-report 完成后
node .claude/shared/scripts/notify.mjs \
  --event bug-report \
  --data '{"reportFile":"reports/bug-analysis-xxx.html","summary":"发现 3 个 P1 Bug"}'

# archive-converter 完成后
node .claude/shared/scripts/notify.mjs \
  --event archive-converted \
  --data '{"fileCount":5,"caseCount":128}'

# 工作流异常时
node .claude/shared/scripts/notify.mjs \
  --event workflow-failed \
  --data '{"step":"writer","reason":"PRD 健康度低于阈值 40%"}'
```

### .env.example 模板（NOTF-07）
```bash
# ──────────────────────────────────────────────
# 钉钉机器人 Webhook（不配置则跳过）
# ──────────────────────────────────────────────
DINGTALK_WEBHOOK_URL=https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN
# 安全关键词（机器人后台设置了关键词安全时必填，会自动追加到消息标题）
DINGTALK_KEYWORD=qa-flow

# ──────────────────────────────────────────────
# 飞书机器人 Webhook（不配置则跳过）
# ──────────────────────────────────────────────
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/YOUR_HOOK_ID

# ──────────────────────────────────────────────
# 企业微信机器人 Webhook（不配置则跳过）
# ──────────────────────────────────────────────
WECOM_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY

# ──────────────────────────────────────────────
# SMTP 邮件通知（SMTP_HOST + SMTP_USER 同时配置才启用）
# ──────────────────────────────────────────────
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false         # true = 465/SSL，false = 587/STARTTLS
SMTP_USER=user@example.com
SMTP_PASS=your_password
SMTP_FROM=qa-flow <user@example.com>   # 可选，默认同 SMTP_USER
SMTP_TO=team@example.com               # 收件人，多个用逗号分隔
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| nodemailer `createTransport` with `smtp://` URL | `createTransport({host, port, auth})` object config | v6+ | URL 方式仍支持但 object 为推荐 |
| 飞书 `msg_type: "text"` 单纯文本 | `msg_type: "post"` 富文本或 `interactive` card | 长期支持 | post 支持标题+正文分离，更清晰 |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | notify.mjs 运行时 | ✓ | 项目既有 | — |
| npm | nodemailer install | ✓ | 既有 | — |
| nodemailer | NOTF-05 | 需安装 | 8.0.4 | 无（NOTF-05 明确要求）|
| DingTalk/Feishu/WeCom webhook URL | 渠道测试 | 用户配置 | — | `--dry-run` 模式可验证 payload 格式 |
| SMTP server | NOTF-05 | 用户配置 | — | `--dry-run` 模式可验证 mailOptions |

**Missing dependencies with fallback:**
- webhook URL / SMTP 配置：测试时可用 `--dry-run` 验证 payload，无需真实凭据
- nodemailer：需在 `.claude/shared/scripts/` 目录执行 `npm install nodemailer`

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` + `node:assert/strict` |
| Config file | 无（内置，无配置文件）|
| Quick run command | `node --test .claude/shared/scripts/notify.test.mjs` |
| Full suite command | `node --test .claude/shared/scripts/*.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NOTF-01 | `dispatch()` 调用所有启用渠道 | unit | `node --test .claude/shared/scripts/notify.test.mjs` | ❌ Wave 0 |
| NOTF-02 | 钉钉 payload 含 markdown、关键词追加 | unit | same | ❌ Wave 0 |
| NOTF-03 | 飞书 payload 为 `msg_type:post` 格式 | unit | same | ❌ Wave 0 |
| NOTF-04 | 企微 payload 为 `msgtype:markdown` 格式 | unit | same | ❌ Wave 0 |
| NOTF-05 | nodemailer mailOptions 含 subject/html/to | unit | same | ❌ Wave 0 |
| NOTF-06 | Skill SKILL.md 含 notify 调用指令 | manual | 人工 review Skill 文件末尾 | N/A |
| NOTF-07 | .env.example 含所有必要变量 | manual | 人工 review .env.example | N/A |
| D-07 | 未配置 URL 的渠道被跳过 | unit | same | ❌ Wave 0 |
| D-08 | --dry-run 不发出网络请求 | unit | same | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test .claude/shared/scripts/notify.test.mjs`
- **Per wave merge:** `node --test .claude/shared/scripts/*.test.mjs`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `.claude/shared/scripts/notify.test.mjs` — 覆盖 NOTF-01 至 NOTF-05、D-07、D-08
  - 测试时用 `process.env` 注入测试 URL，mock `httpsPost` 和 `nodemailer.createTransport`
  - `--dry-run` 测试：拦截 `console.log` 验证输出，断言无真实 HTTP 调用

---

## Open Questions

1. **飞书格式：`post` vs `interactive` card**
   - What we know: 两种都支持无签名 webhook；`interactive` 更丰富但结构更复杂
   - What's unclear: 项目目标团队使用的飞书版本是否支持 interactive card
   - Recommendation: 默认实现 `post` 富文本（更简单、兼容性更好）；D-02 已决定 Markdown 为主，`post` 足够

2. **`.env` 在 Claude Code 环境中是否自动注入**
   - What we know: CLAUDE.md 未提及 dotenv 或 env 注入机制；项目 `.env` 在 .gitignore 中
   - What's unclear: Claude Code agent 运行 `node notify.mjs` 时是否已有 env 变量
   - Recommendation: 在 `notify.mjs` 顶部加 `loadDotEnv()`（仅不覆盖已有 env），同时支持两种场景

3. **Skill 触发点：是否在所有失败路径也发通知**
   - What we know: D-03 包含「工作流失败」事件
   - What's unclear: 哪些 Skill 的哪些步骤失败需要 notify（非正常退出）
   - Recommendation: 简单实现 — 只在正常完成路径触发；失败通知由未来迭代添加

---

## Sources

### Primary (HIGH confidence)
- 项目 `.planning/phases/05-im-notification-integration/05-CONTEXT.md` — 架构决策 D-01 至 D-08
- 项目 `.claude/shared/scripts/audit-md-frontmatter.mjs` — `--dry-run` 实现模式
- 项目 `.claude/shared/scripts/unify-directory-structure.mjs` — CLI 参数解析模式
- 项目 `.claude/shared/scripts/load-config.test.mjs` — `node:test` 测试范例
- nodemailer 官方文档 — https://nodemailer.com/usage/ (v8.x)
- `npm view nodemailer version` → 8.0.4 (verified)

### Secondary (MEDIUM confidence)
- DingTalk 开放平台自定义机器人 API — https://open.dingtalk.com/document/robots/custom-robot-access
- Feishu 自定义机器人 API — https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot
- WeCom 群机器人 API — https://developer.work.weixin.qq.com/document/path/91770

### Tertiary (LOW confidence)
- 无

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — nodemailer 版本已通过 npm verify；内置模块无版本问题
- Architecture: HIGH — 基于项目现有模式（process.argv, --dry-run, load-config）直接推断
- Webhook APIs: MEDIUM — 基于训练数据（DingTalk/Feishu/WeCom）；实际字段名稳定但建议实现前参考官方文档确认
- Pitfalls: HIGH — DingTalk keyword 行为、Promise.allSettled 均为已知问题
- Test Patterns: HIGH — 完全基于项目现有 `node:test` 测试文件

**Research date:** 2026-04-01
**Valid until:** 2026-05-01（webhook API 相对稳定；nodemailer 8.x 无 breaking changes 预期）
