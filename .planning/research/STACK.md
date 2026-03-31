# Technology Stack

**Project:** qa-flow v2 — WebUI Automation + IM Notifications + Project Management Integration
**Researched:** 2026-03-31
**Scope:** New additions only. Does not re-document the existing stack (see `.planning/codebase/STACK.md`).

---

## Context: What the Existing Stack Already Provides

The existing system runs on **JavaScript ESM + Node.js v25 + Python 3.10+**. It already includes:
- `playwright >=1.48.0` (Python, inside `tools/lanhu-mcp/.venv`) — used for Lanhu page rendering
- `fastmcp >=2.0.0` (Python) — MCP server framework for Lanhu integration
- `jszip ^3.10.1` + `xmind-generator ^1.0.1` (Node.js) — XMind file I/O

The new milestone adds three capability areas: **Playwright-based UI automation**, **IM notifications**, and **Zentao project management integration**. All new dependencies should be Node.js ESM unless a Python component is strictly required.

---

## Recommended Stack — New Additions

### 1. WebUI Automation: Playwright MCP

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| `@playwright/mcp` | `@latest` (v0.0.69 as of 2026-03-30) | MCP server giving Claude Code direct browser control for UI test execution | HIGH |

**Why `@playwright/mcp` and not `playwright` directly:**

The project's runtime is Claude Code. Claude Code drives automation by calling MCP tools, not by running scripts imperatively. `@playwright/mcp` exposes Playwright through the Model Context Protocol so Claude can navigate, click, fill forms, and observe results directly — without generating and executing intermediate scripts. This is the Microsoft-official package, not the community `@executeautomation/playwright-mcp-server`.

**Why not the Python Playwright already present:**

The existing `playwright` Python installation is scoped to `tools/lanhu-mcp/.venv` and serves only Lanhu page scraping. UI automation for QA test execution is a separate concern and should use the dedicated MCP server which manages its own browser instances.

**Installation (Claude Code project scope):**
```bash
claude mcp add --scope project playwright npx @playwright/mcp@latest
```

This registers the server in the project's `.mcp.json`, making it available to all team members who clone the repo.

**Key configuration options to document in `using-qa-flow` skill:**
- `--headless` — for CI-style execution without a visible browser
- `--browser chromium|firefox|webkit` — browser selection
- `--viewport-size "1280,720"` — consistent viewport for screenshot reproducibility
- `--config path/to/playwright-mcp.json` — per-project configuration file

**What NOT to use:**
- `@executeautomation/playwright-mcp-server` — community project with a different, non-official API surface; avoid to prevent confusion with Microsoft's package
- Raw `playwright` Node.js scripts executed via `Bash` tool — this is less token-efficient and bypasses the structured MCP interface that Claude Code is optimized for

---

### 2. IM Notifications

Four channels are required. The implementation pattern is identical for three of them (webhook POST), with one requiring an SDK.

#### 2a. DingTalk (钉钉)

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| Node.js built-in `crypto` + `fetch` | Node.js ≥18 built-in | HMAC-SHA256 signature + HTTP POST to webhook URL | HIGH |

**Why no external SDK:**

DingTalk's group robot webhook is a plain HTTPS POST to `https://oapi.dingtalk.com/robot/send?access_token=TOKEN`. The only non-trivial part is the optional signature security mode (HMAC-SHA256 of `timestamp\nsecret`, Base64-encoded, URL-encoded). Both `crypto` (HMAC) and `fetch` are built into Node.js ≥18. Adding an SDK adds a dependency for two function calls. The official `dingtalk-stream-sdk-nodejs` is for Stream Mode (persistent connections) — overkill for fire-and-forget notifications.

**Signature algorithm (use Node.js built-ins):**
```javascript
// timestamp in ms + "\n" + secret → HMAC-SHA256 → Base64 → encodeURIComponent
const timestamp = Date.now()
const sign = encodeURIComponent(
  crypto.createHmac('sha256', secret)
    .update(`${timestamp}\n${secret}`)
    .digest('base64')
)
const url = `${webhookUrl}&timestamp=${timestamp}&sign=${sign}`
```

**Supported message types:** `text`, `markdown`, `link`, `actionCard`, `feedCard`
Use `markdown` for bug reports (supports headers, code blocks, links).

#### 2b. Feishu / Lark (飞书)

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| Node.js built-in `fetch` | Node.js ≥18 built-in | HTTP POST to custom bot webhook URL | HIGH |
| `@larksuiteoapi/node-sdk` | latest (official SDK) | Only if full app integration (non-webhook) is needed | MEDIUM |

**Recommendation: use the webhook path, not the SDK.**

Feishu's custom bot webhook (`https://open.feishu.cn/open-apis/bot/v2/hook/<token>`) accepts JSON POST with no authentication beyond the URL token. Optional signature uses HMAC-SHA256 of `timestamp + key`, same pattern as DingTalk. The `@larksuiteoapi/node-sdk` is for full OAuth app flows (reading docs, managing calendars, etc.) — far more than needed for send-only notifications.

Note: `FEISHU_WEBHOOK_URL` is already present in `.env` (observed in existing `tools/lanhu-mcp/config.example.env`). The webhook infrastructure is already partially in place.

**Supported message types for webhook bot:** `text`, `post` (rich text), `interactive` (card), `image`
Use `interactive` (card) for structured bug reports — supports sections, fields, and action buttons.

#### 2c. WeCom / WeChat Work (企业微信)

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| Node.js built-in `fetch` | Node.js ≥18 built-in | HTTP POST to group robot webhook URL | HIGH |

**Why no external SDK:**

WeCom's group robot webhook (`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=KEY`) is a plain HTTP POST. No authentication signing required (the key is in the URL). Message types: `text`, `markdown`, `image`, `news`, `file`, `template_card`. Use `markdown` for notifications.

#### 2d. Email

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| `nodemailer` | `^8.0.4` | SMTP email sending for bug reports and test completion summaries | HIGH |

**Why nodemailer over built-ins:**

Node.js has no built-in SMTP client. `nodemailer` is the de-facto standard with zero runtime dependencies, MIT-0 license, and 8+ million weekly downloads. Latest version is 8.0.4 (as of early 2026).

**ESM caveat:** nodemailer 8.x still ships as CommonJS. Use `createRequire` workaround in ESM context:
```javascript
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const nodemailer = require('nodemailer')
```
This is a known limitation tracked in [nodemailer#1518](https://github.com/nodemailer/nodemailer/issues/1518). It works reliably and is the documented workaround until a native ESM release ships.

**What NOT to use:**
- `emailjs` — lighter but less maintained
- AWS SES SDK / SendGrid SDK — adds vendor lock-in; nodemailer supports these as transports if needed later
- Feishu email API — separate concern from the webhook bot integration

---

### 3. Zentao Project Management Integration

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| Node.js built-in `fetch` | Node.js ≥18 built-in | Direct calls to Zentao REST API v1 | HIGH |
| `@makun111/zentao-mcp-server` | latest (community MCP) | Optional: MCP-based Zentao access for agentic workflows | LOW |

**Recommendation: use the Zentao REST API v1 directly with `fetch`, not `node-zentao`.**

**Why not `node-zentao`:**
The `node-zentao` npm package (v1.0.1) was last published approximately 6 years ago (circa 2019), has zero dependent packages, and is unmaintained. Do not use it.

**Why not `@makun111/zentao-mcp-server`:**
This is a community MCP server for Zentao. It solves a different problem (giving Claude Code agentic Zentao access) than what is needed here (programmatic bug creation from a notification script). Confidence is LOW because it is early-stage and community-maintained. Suitable for future exploration if the agentic pattern proves more useful.

**Direct API approach (recommended):**

Zentao REST API v1 is available in Zentao ≥12.x. Authentication requires:
1. `POST /api.php/v1/tokens` with `{"account": "...", "password": "..."}` → returns `token`
2. All subsequent requests include header `Token: <token>`

Key endpoints for this milestone:
```
POST /api.php/v1/bugs          — Create bug
GET  /api.php/v1/bugs/{id}     — Get bug details
GET  /api.php/v1/products      — List products (for product_id lookup)
GET  /api.php/v1/users/me      — Verify auth + get current user
```

Bug creation payload minimum fields:
```javascript
{
  product: productId,      // required: number
  module: moduleId,        // required: number (0 for no module)
  title: "Bug title",      // required: string
  severity: 3,             // 1-4, default 3
  priority: 3,             // 1-4, default 3
  steps: "Steps to repro", // required: string
  type: "codeerror"        // optional: codeerror|config|install|security|performance|standard|automation|designchange|other
}
```

**Token caching:** Zentao tokens expire (default session duration). Implement a simple in-memory cache with expiry check to avoid re-authenticating on every call. Store `{ token, expiresAt }` in the `.qa-state` JSON between sessions (but treat as ephemeral).

**Security note:** Store Zentao credentials in `.env` (already the pattern for `LANHU_COOKIE`). Never hardcode in scripts.

---

## Unified Notification Module Architecture

All four IM channels plus Zentao integration should live in a single shared script:

```
.claude/shared/scripts/notify.mjs
```

This script exports channel-specific send functions and a unified `notify(channel, payload)` dispatcher. The `using-qa-flow` init skill writes channel configuration to `.env`.

**Environment variables to add to config template:**
```bash
# IM Notifications (add to tools/lanhu-mcp/config.example.env or a new .env.example)
NOTIFY_CHANNELS=feishu,dingtalk       # comma-separated: feishu|dingtalk|wecom|email
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/...
FEISHU_WEBHOOK_SECRET=                # optional, leave blank if not using signature mode
DINGTALK_WEBHOOK_URL=https://oapi.dingtalk.com/robot/send?access_token=...
DINGTALK_WEBHOOK_SECRET=              # optional
WECOM_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...
EMAIL_SMTP_HOST=smtp.example.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=
EMAIL_SMTP_PASS=
EMAIL_FROM=noreply@example.com
EMAIL_TO=qa-team@example.com

# Zentao
ZENTAO_BASE_URL=http://zentao.example.com
ZENTAO_ACCOUNT=
ZENTAO_PASSWORD=
ZENTAO_DEFAULT_PRODUCT_ID=1
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Browser automation | `@playwright/mcp@latest` | `@executeautomation/playwright-mcp-server` | Community fork, different API, non-Microsoft |
| Browser automation | `@playwright/mcp@latest` | Raw Playwright Node.js scripts | Less token-efficient in Claude Code context |
| DingTalk | Built-in `fetch` + `crypto` | `dingtalk-stream-sdk-nodejs` | Stream mode SDK is overkill for fire-and-forget webhooks |
| Feishu | Built-in `fetch` | `@larksuiteoapi/node-sdk` | Full OAuth SDK not needed for simple webhook notifications |
| Zentao client | Direct `fetch` calls | `node-zentao` npm package | Unmaintained since ~2019, last version 1.0.1, zero active users |
| Email | `nodemailer ^8.0.4` | `emailjs` | Less maintained; nodemailer has wider adoption and zero runtime deps |

---

## Installation

```bash
# Node.js notification dependencies (add to .claude/shared/scripts/package.json)
npm install nodemailer

# Playwright MCP — Claude Code project scope (writes to .mcp.json)
claude mcp add --scope project playwright npx @playwright/mcp@latest
```

No new Python dependencies are required for this milestone.

---

## Sources

- `@playwright/mcp` GitHub Releases: [github.com/microsoft/playwright-mcp/releases](https://github.com/microsoft/playwright-mcp/releases) — HIGH confidence (official Microsoft repo, v0.0.69 confirmed 2026-03-30)
- Playwright MCP Claude Code guide: [til.simonwillison.net/claude-code/playwright-mcp-claude-code](https://til.simonwillison.net/claude-code/playwright-mcp-claude-code) — HIGH confidence (verified against official docs)
- Feishu custom bot webhook: [open.larkoffice.com/document/client-docs/bot-v3/add-custom-bot](https://open.larkoffice.com/document/client-docs/bot-v3/add-custom-bot) — HIGH confidence (official Lark Open Platform)
- `@larksuiteoapi/node-sdk` npm: [npmjs.com/package/@larksuiteoapi/node-sdk](https://www.npmjs.com/package/@larksuiteoapi/node-sdk) — HIGH confidence (official Lark SDK)
- DingTalk webhook documentation: [alibabacloud.com/help/en/arms/alarm-operation-center/obtain-the-webhook-url-of-a-dingtalk-chatbot](https://www.alibabacloud.com/help/en/arms/alarm-operation-center/obtain-the-webhook-url-of-a-dingtalk-chatbot) — HIGH confidence
- WeCom group robot: [bika.ai/help/reference/integration/we-com](https://bika.ai/help/reference/integration/we-com) — MEDIUM confidence (third-party guide, WeCom API is stable)
- nodemailer npm: [npmjs.com/package/nodemailer](https://www.npmjs.com/package/nodemailer) — HIGH confidence (v8.0.4 confirmed)
- Zentao REST API v1 authentication: [zentao.net/book/api/1397.html](https://www.zentao.net/book/api/1397.html) — MEDIUM confidence (official docs in Chinese, endpoint pattern confirmed via multiple sources)
- `node-zentao` npm (abandoned): [npmjs.com/package/node-zentao](https://www.npmjs.com/package/node-zentao) — HIGH confidence (last published 6 years ago, confirmed abandoned)
- `@makun111/zentao-mcp-server`: [glama.ai/mcp/servers/@Valiant-Cat/zentao-mcp-server](https://glama.ai/mcp/servers/@Valiant-Cat/zentao-mcp-server) — LOW confidence (community project, early-stage)
