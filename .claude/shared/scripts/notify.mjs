/**
 * notify.mjs
 * Unified notification module — dispatch to DingTalk, Feishu, WeCom, and SMTP email.
 *
 * NOTF-01: Single dispatch() entry point, multi-channel delivery
 * NOTF-02: DingTalk webhook with keyword security support (D-05)
 * NOTF-03: Feishu webhook (msg_type: post format)
 * NOTF-04: WeCom webhook (msgtype: markdown)
 * NOTF-05: Email via nodemailer SMTP
 * NOTF-07: Channel enable/disable by URL presence (D-07)
 *
 * CLI usage:
 *   node .claude/shared/scripts/notify.mjs --event case-generated --data '{"count":42,"file":"latest-output.xmind"}'
 *   node .claude/shared/scripts/notify.mjs --event workflow-failed --data '{"step":"writer","reason":"PRD error"}' --dry-run
 */

import { request } from "node:https";
import { createHmac } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";
import { loadConfig } from "./load-config.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// 1. loadDotEnv — parse .env file, do NOT overwrite existing env vars
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a .env file and set env vars that are not already present.
 * @param {string} [envPath] - Path to .env file; defaults to <cwd>/.env
 */
export function loadDotEnv(envPath) {
  const target = envPath ?? resolve(process.cwd(), ".env");
  if (!existsSync(target)) return;
  let content;
  try {
    content = readFileSync(target, "utf8");
  } catch {
    return;
  }
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// Load .env at module top level (non-destructive — only sets unset vars)
loadDotEnv();

// ─────────────────────────────────────────────────────────────────────────────
// 2. httpsPost — minimal HTTPS JSON POST using node:https
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST JSON to a URL using node:https (zero external deps).
 * @param {string} url
 * @param {object} body
 * @returns {Promise<object|string>} parsed JSON response or raw string
 */
export function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };
    const req = request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve(raw);
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. mdToHtml — simple regex-based Markdown → HTML (no external library)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a Markdown subset to HTML.
 * Handles: ## headings, ### headings, **bold**, *italic*, - list items, double newlines.
 * @param {string} markdown
 * @returns {string} HTML string wrapped in a styled <div>
 */
export function mdToHtml(markdown) {
  let html = markdown;

  // Headings (must come before bold/italic)
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");

  // Bold (**text**) — must come before italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic (*text*) — only single asterisks not followed by another asterisk
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");

  // List items (- item) — collect consecutive lines into <ul>
  // First mark each item, then wrap groups in <ul>
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  // Double newlines → <br><br>
  html = html.replace(/\n\n/g, "<br><br>");

  return `<div style="font-family: sans-serif; line-height: 1.6;">${html}</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. getEnabledChannels — "has URL = enabled" (D-07)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return list of channel names that are currently enabled via env vars.
 * @returns {string[]} e.g. ["dingtalk", "email"]
 */
export function getEnabledChannels() {
  const channels = [];
  if (process.env.DINGTALK_WEBHOOK_URL) channels.push("dingtalk");
  if (process.env.FEISHU_WEBHOOK_URL)   channels.push("feishu");
  if (process.env.WECOM_WEBHOOK_URL)    channels.push("wecom");
  if (process.env.SMTP_HOST && process.env.SMTP_USER) channels.push("email");
  return channels;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. buildMessage — standard header + event-specific body (D-04)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a notification message for a workflow event.
 * @param {string} event - Event type: "case-generated" | "bug-report" | "workflow-failed" | "archive-converted" | "hotfix-case-generated" | "conflict-analyzed"
 * @param {object} data  - Event-specific data
 * @returns {{ title: string, markdown: string, html: string }}
 */
export function buildMessage(event, data) {
  // Project name from config (graceful fallback)
  let projectName = "qa-flow";
  try {
    projectName = loadConfig().project?.name ?? "qa-flow";
  } catch {
    // Config unavailable — use default
  }

  const timestamp = new Date().toLocaleString("zh-CN", { hour12: false });

  // Helper: extract filename from path
  const fileName = (p) => p ? p.split("/").pop() : "";

  // Helper: only include a line when value is meaningful
  const line = (label, value) =>
    (value && value !== "N/A" && value !== "0" && value !== 0)
      ? `> **${label}**：${value}`
      : null;

  const emojiMap = {
    "case-generated":        "✅",
    "bug-report":            "🐛",
    "workflow-failed":       "❌",
    "archive-converted":     "📦",
    "hotfix-case-generated": "🚑",
    "conflict-analyzed":     "⚠️",
  };
  const labelMap = {
    "case-generated":        "用例生成完成",
    "bug-report":            "Bug 报告已生成",
    "workflow-failed":       "工作流异常中断",
    "archive-converted":     "归档转化完成",
    "hotfix-case-generated": "线上问题用例转化完成",
    "conflict-analyzed":     "合并冲突分析完成",
  };
  const emoji = emojiMap[event] ?? "📌";
  const label = labelMap[event] ?? event;

  // Push title: short, contains keyword for DingTalk security filter
  const title = `[${projectName}] ${emoji} ${label}`;

  // Build body per event
  const gitRemoteUrl = process.env.GIT_REMOTE_URL;
  const serverWorkspacePath = process.env.SERVER_WORKSPACE_PATH;

  let bodyLines;
  switch (event) {
    case "case-generated": {
      const xmindName = fileName(data.file);
      const absPath = (serverWorkspacePath && data.file)
        ? serverWorkspacePath.replace(/\/$/, "") + "/" + data.file.replace(/^\//, "")
        : null;
      bodyLines = [
        `## ${emoji} ${label}`,
        "",
        line("需求", xmindName.replace(/\.xmind$/, "")),
        line("用例数", data.count ? `${data.count} 条` : null),
        line("耗时", data.duration),
        line("完整路径", absPath),
        "",
        `> 完成时间：${timestamp}`,
      ];
      break;
    }
    case "bug-report": {
      const absPath = (serverWorkspacePath && data.reportFile)
        ? serverWorkspacePath.replace(/\/$/, "") + "/" + data.reportFile.replace(/^\//, "")
        : null;
      bodyLines = [
        `## ${emoji} ${label}`,
        "",
        line("报告", fileName(data.reportFile)),
        line("摘要", data.summary),
        line("完整路径", absPath),
        "",
        `> 完成时间：${timestamp}`,
      ];
      break;
    }
    case "workflow-failed":
      bodyLines = [
        `## ${emoji} ${label}`,
        "",
        `> **失败步骤**：${data.step}`,
        `> **错误原因**：${data.reason}`,
        "",
        `> 发生时间：${timestamp}`,
      ];
      break;
    case "archive-converted":
      bodyLines = [
        `## ${emoji} ${label}`,
        "",
        line("文件数", data.fileCount ? `${data.fileCount} 个` : null),
        line("用例数", data.caseCount ? `${data.caseCount} 条` : null),
        "",
        `> 完成时间：${timestamp}`,
      ];
      break;
    case "hotfix-case-generated": {
      const absPath = (serverWorkspacePath && data.file)
        ? serverWorkspacePath.replace(/\/$/, "") + "/" + data.file.replace(/^\//, "")
        : null;
      bodyLines = [
        `## ${emoji} ${label}`,
        "",
        line("Bug ID", data.bugId),
        line("修复分支", data.branch),
        line("用例文件", fileName(data.file)),
        line("变更文件数", data.changedFiles ? `${data.changedFiles} 个` : null),
        line("完整路径", absPath),
        "",
        `> 完成时间：${timestamp}`,
      ];
      break;
    }
    case "conflict-analyzed": {
      const absPath = (serverWorkspacePath && data.reportFile)
        ? serverWorkspacePath.replace(/\/$/, "") + "/" + data.reportFile.replace(/^\//, "")
        : null;
      bodyLines = [
        `## ${emoji} ${label}`,
        "",
        line("报告", fileName(data.reportFile)),
        line("冲突文件数", data.conflictCount ? `${data.conflictCount} 个` : null),
        line("涉及分支", data.branches),
        line("完整路径", absPath),
        "",
        `> 完成时间：${timestamp}`,
      ];
      break;
    }
    default:
      bodyLines = [
        `## ${emoji} ${event}`,
        "",
        `\`\`\`\n${JSON.stringify(data, null, 2)}\n\`\`\``,
        "",
        `> ${timestamp}`,
      ];
  }

  // Append repo link in footer if configured
  if (gitRemoteUrl) {
    bodyLines.push("", `---`, `[${projectName}](${gitRemoteUrl})`);
  }

  const markdown = bodyLines.filter((l) => l !== null).join("\n");
  return { title, markdown, html: mdToHtml(markdown) };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. sendDingTalk — DingTalk webhook adapter (NOTF-02, D-05)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute DingTalk HMAC-SHA256 signature for signed-mode robots.
 * @param {string} secret - The signing secret (SEC...)
 * @param {number} timestamp - Current timestamp in milliseconds
 * @returns {string} URL-encoded Base64 signature
 */
function dingtalkSign(secret, timestamp) {
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = createHmac("sha256", secret).update(stringToSign).digest("base64");
  return encodeURIComponent(hmac);
}

/**
 * Send a markdown message to DingTalk webhook.
 * Supports two security modes:
 * - Keyword mode (D-05): auto-appends DINGTALK_KEYWORD to title
 * - Signing mode: HMAC-SHA256 via DINGTALK_SIGN_SECRET
 * @param {string} title
 * @param {string} markdownText
 * @param {boolean} [dryRun=false]
 */
export async function sendDingTalk(title, markdownText, dryRun = false) {
  const keyword = process.env.DINGTALK_KEYWORD;
  const safeTitle = (keyword && !title.includes(keyword))
    ? `${title} ${keyword}`
    : title;

  const payload = {
    msgtype: "markdown",
    markdown: { title: safeTitle, text: markdownText },
  };
  let url = process.env.DINGTALK_WEBHOOK_URL;

  // Signing mode: append timestamp + sign to URL
  const signSecret = process.env.DINGTALK_SIGN_SECRET;
  if (signSecret) {
    const timestamp = Date.now();
    const sign = dingtalkSign(signSecret, timestamp);
    const sep = url.includes("?") ? "&" : "?";
    url = `${url}${sep}timestamp=${timestamp}&sign=${sign}`;
  }

  if (dryRun) {
    console.log(JSON.stringify({ channel: "dingtalk", url, body: payload }, null, 2));
    return;
  }

  const res = await httpsPost(url, payload);
  if (res && res.errcode !== 0) {
    console.error("[notify] DingTalk error:", res);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. sendFeishu — Feishu webhook adapter (NOTF-03, D-06)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send a post-format message to Feishu webhook.
 * @param {string} title
 * @param {string} markdownText
 * @param {boolean} [dryRun=false]
 */
export async function sendFeishu(title, markdownText, dryRun = false) {
  const payload = {
    msg_type: "post",
    content: {
      post: {
        zh_cn: {
          title,
          content: [[{ tag: "text", text: markdownText }]],
        },
      },
    },
  };
  const url = process.env.FEISHU_WEBHOOK_URL;

  if (dryRun) {
    console.log(JSON.stringify({ channel: "feishu", url, body: payload }, null, 2));
    return;
  }

  const res = await httpsPost(url, payload);
  if (res && res.code !== 0) {
    console.error("[notify] Feishu error:", res);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. sendWeCom — WeCom webhook adapter (NOTF-04, D-06)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send a markdown message to WeCom webhook.
 * @param {string} markdownText
 * @param {boolean} [dryRun=false]
 */
export async function sendWeCom(markdownText, dryRun = false) {
  const payload = {
    msgtype: "markdown",
    markdown: { content: markdownText },
  };
  const url = process.env.WECOM_WEBHOOK_URL;

  if (dryRun) {
    console.log(JSON.stringify({ channel: "wecom", url, body: payload }, null, 2));
    return;
  }

  const res = await httpsPost(url, payload);
  if (res && res.errcode !== 0) {
    console.error("[notify] WeCom error:", res);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. sendEmail — SMTP email adapter via nodemailer (NOTF-05)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send an HTML email via SMTP using nodemailer.
 * @param {string} subject
 * @param {string} htmlBody
 * @param {boolean} [dryRun=false]
 */
export async function sendEmail(subject, htmlBody, dryRun = false) {
  const host    = process.env.SMTP_HOST;
  const port    = Number(process.env.SMTP_PORT ?? 587);
  const secure  = process.env.SMTP_SECURE === "true";
  const user    = process.env.SMTP_USER;
  const pass    = process.env.SMTP_PASS;
  const from    = process.env.SMTP_FROM ?? user;
  const to      = process.env.SMTP_TO;

  const mailOptions = { from, to, subject, html: htmlBody };

  if (dryRun) {
    console.log(JSON.stringify({
      channel: "email",
      transport: { host, port, secure },
      mailOptions,
    }, null, 2));
    return;
  }

  const transport = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  try {
    await transport.sendMail(mailOptions);
  } finally {
    transport.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. dispatch — unified entry point (D-01), Promise.allSettled (Pitfall 5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dispatch a notification to all enabled channels.
 * Uses Promise.allSettled — a single channel failure does not block others.
 * @param {string} event  - Event type
 * @param {object} data   - Event-specific payload
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<PromiseSettledResult[]>} Results per channel (or [] if no channels)
 */
export async function dispatch(event, data, { dryRun = false } = {}) {
  const { title, markdown, html } = buildMessage(event, data);
  const channels = getEnabledChannels();

  if (channels.length === 0) {
    console.log("[notify] No channels configured, skipping.");
    return [];
  }

  const promises = channels.map((channel) => {
    switch (channel) {
      case "dingtalk": return sendDingTalk(title, markdown, dryRun);
      case "feishu":   return sendFeishu(title, markdown, dryRun);
      case "wecom":    return sendWeCom(markdown, dryRun);
      case "email":    return sendEmail(title, html, dryRun);
      default:         return Promise.resolve();
    }
  });

  const results = await Promise.allSettled(promises);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[notify] Channel failed:", result.reason);
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. CLI entry point
// ─────────────────────────────────────────────────────────────────────────────

function isDirectExecution() {
  return process.argv[1] && resolve(process.argv[1]) === __filename;
}

if (isDirectExecution()) {
  const args = process.argv.slice(2);
  const DRY_RUN = args.includes("--dry-run");

  const eventIdx = args.indexOf("--event");
  const dataIdx  = args.indexOf("--data");

  const event = eventIdx !== -1 ? args[eventIdx + 1] : null;
  const dataArg = dataIdx !== -1 ? args[dataIdx + 1] : null;

  if (!event) {
    console.error("Usage: node notify.mjs --event <type> --data '<json>' [--dry-run]");
    console.error("Events: case-generated, bug-report, workflow-failed, archive-converted, hotfix-case-generated, conflict-analyzed");
    process.exit(1);
  }

  let data = {};
  if (dataArg) {
    try {
      data = JSON.parse(dataArg);
    } catch {
      console.error("[notify] Warning: --data is not valid JSON, using {}");
    }
  }

  (async () => {
    const channels = getEnabledChannels();
    const results = await dispatch(event, data, { dryRun: DRY_RUN });

    if (results.length === 0) {
      console.log("[notify] No channels configured. Set DINGTALK_WEBHOOK_URL, FEISHU_WEBHOOK_URL, WECOM_WEBHOOK_URL, or SMTP_HOST+SMTP_USER in .env");
    } else {
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed    = results.filter((r) => r.status === "rejected").length;
      console.log(`[notify] Dispatched to ${channels.length} channel(s): ${succeeded} succeeded, ${failed} failed`);
    }
  })().catch((err) => {
    console.error("[notify] Fatal error:", err);
    process.exit(1);
  });
}
