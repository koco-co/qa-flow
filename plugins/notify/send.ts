#!/usr/bin/env bun
/**
 * qa-flow notify plugin — send IM/email notifications
 *
 * Usage:
 *   bun run plugins/notify/send.ts --event case-generated --data '{"count":42,"file":"test.xmind"}'
 *   bun run plugins/notify/send.ts --dry-run --event case-generated --data '{"count":42}'
 *   bun run plugins/notify/send.ts --help
 */

import crypto from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { initEnv, getEnv } from "../../.claude/scripts/lib/env.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// ── Types ────────────────────────────────────────────────────────────────────

export type EventType =
  | "case-generated"
  | "bug-report"
  | "conflict-analyzed"
  | "hotfix-case-generated"
  | "ui-test-completed"
  | "archive-converted"
  | "workflow-failed"
  | (string & {});

export interface NotifyData {
  [key: string]: unknown;
}

export interface FormattedMessage {
  title: string;
  text: string;
}

export interface SendResult {
  sent: string[];
  failed: string[];
  skipped: string[];
}

// ── Message Formatting ───────────────────────────────────────────────────────

export function formatMessage(
  event: EventType,
  data: NotifyData,
): FormattedMessage {
  const timestamp = new Date().toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
  });
  const text = formatByEvent(event, data, timestamp);

  const firstLine = text.split("\n")[0];
  const title = firstLine.replace(/^[\p{Emoji}\s]+/u, "").trim();

  return { title, text };
}

function formatByEvent(
  event: EventType,
  data: NotifyData,
  timestamp: string,
): string {
  switch (event) {
    case "case-generated":
      return [
        "## ✅ 用例生成完成",
        "",
        `> **${data.requirement ?? "测试用例"}** 已生成`,
        "",
        "| 项目 | 详情 |",
        "| --- | --- |",
        `| 📊 用例数 | **${data.count ?? "-"}** |`,
        `| 📁 XMind | ${data.file ?? "-"} |`,
        `| 📝 Archive | ${data.archiveFile ?? "-"} |`,
        `| ⏱ 耗时 | ${data.duration ? `${data.duration}s` : "-"} |`,
        "",
        `---`,
        `🕐 ${timestamp} · QAFlow`,
      ].join("\n");

    case "bug-report":
      return [
        "## 🐛 Bug 分析报告",
        "",
        `> ${data.summary ?? "分析完成"}`,
        "",
        "| 项目 | 详情 |",
        "| --- | --- |",
        `| 🏷 类型 | ${data.problemType ?? "-"} |`,
        `| 🔴 严重度 | **${data.severity ?? "-"}** |`,
        `| 📍 根因 | ${data.rootCause ?? "-"} |`,
        `| 📄 报告 | ${data.reportFile ?? "-"} |`,
        "",
        data.fixSuggestion ? `**💡 修复建议：** ${data.fixSuggestion}` : "",
        "",
        `---`,
        `🕐 ${timestamp} · QAFlow`,
      ]
        .filter(Boolean)
        .join("\n");

    case "conflict-analyzed": {
      const total = data.conflictCount ?? "-";
      const auto = data.autoResolvable ?? "-";
      const manual = data.manualRequired ?? "-";
      return [
        "## ⚠️ 合并冲突分析",
        "",
        `> 检测到 **${total}** 处冲突`,
        "",
        "| 项目 | 详情 |",
        "| --- | --- |",
        `| 📊 冲突总数 | **${total}** |`,
        `| 🤖 可自动合并 | ${auto} |`,
        `| 👤 需人工决策 | ${manual} |`,
        `| 📄 报告 | ${data.reportFile ?? "-"} |`,
        "",
        data.branches
          ? `**🔀 分支：** ${(data.branches as string[]).join(" ← ")}`
          : "",
        "",
        `---`,
        `🕐 ${timestamp} · QAFlow`,
      ]
        .filter(Boolean)
        .join("\n");
    }

    case "hotfix-case-generated":
      return [
        "## 🔧 Hotfix 用例生成",
        "",
        `> Bug **#${data.bugId ?? "-"}** 的验证用例已就绪`,
        "",
        "| 项目 | 详情 |",
        "| --- | --- |",
        `| 🐛 Bug ID | #${data.bugId ?? "-"} |`,
        `| 🔀 修复分支 | ${data.branch ?? "-"} |`,
        `| 📊 用例数 | ${data.caseCount ?? "-"} |`,
        `| 📁 文件 | ${data.file ?? "-"} |`,
        "",
        `---`,
        `🕐 ${timestamp} · QAFlow`,
      ].join("\n");

    case "ui-test-completed": {
      const passed = Number(data.passed ?? 0);
      const failed = Number(data.failed ?? 0);
      const total = passed + failed;
      const rate = total > 0 ? `${Math.round((passed / total) * 100)}%` : "-";
      const statusIcon = failed > 0 ? "🔴" : "🟢";
      return [
        `## 🧪 UI 自动化测试完成 ${statusIcon}`,
        "",
        `> 通过率 **${rate}**（${passed}/${total}）`,
        "",
        "| 项目 | 详情 |",
        "| --- | --- |",
        `| ✅ 通过 | **${data.passed ?? "-"}** |`,
        `| ❌ 失败 | **${data.failed ?? "-"}** |`,
        `| 📊 通过率 | ${rate} |`,
        `| 📄 报告 | ${data.reportFile ?? "-"} |`,
        "",
        `---`,
        `🕐 ${timestamp} · QAFlow`,
      ].join("\n");
    }

    case "archive-converted":
      return [
        "## 📦 归档转化完成",
        "",
        `> **${data.fileCount ?? "-"}** 个文件已标准化归档`,
        "",
        "| 项目 | 详情 |",
        "| --- | --- |",
        `| 📁 文件数 | **${data.fileCount ?? "-"}** |`,
        `| 📊 用例数 | **${data.caseCount ?? "-"}** |`,
        `| 📂 目录 | ${data.outputDir ?? "-"} |`,
        "",
        `---`,
        `🕐 ${timestamp} · QAFlow`,
      ].join("\n");

    case "workflow-failed":
      return [
        "## ❌ 工作流异常中断",
        "",
        `> 步骤 **${data.step ?? "-"}** 执行失败`,
        "",
        "| 项目 | 详情 |",
        "| --- | --- |",
        `| 📍 失败步骤 | **${data.step ?? "-"}** |`,
        `| 💬 原因 | ${data.reason ?? "-"} |`,
        `| 🔄 可重试 | ${data.retryable ?? "是"} |`,
        "",
        "**⚡ 建议：** 检查上述原因后重新执行该步骤",
        "",
        `---`,
        `🕐 ${timestamp} · QAFlow`,
      ].join("\n");

    default:
      return [
        `## 📢 QAFlow 通知 | ${event}`,
        "",
        "```json",
        JSON.stringify(data, null, 2),
        "```",
        "",
        `---`,
        `🕐 ${timestamp} · QAFlow`,
      ].join("\n");
  }
}

// ── Channel Detection ────────────────────────────────────────────────────────

export interface ChannelConfig {
  dingtalk: string | undefined;
  dingtalkKeyword: string | undefined;
  dingtalkSignSecret: string | undefined;
  feishu: string | undefined;
  wecom: string | undefined;
  email: {
    host: string | undefined;
    port: string | undefined;
    user: string | undefined;
    pass: string | undefined;
    from: string | undefined;
    to: string | undefined;
  };
}

export function detectChannels(): ChannelConfig {
  return {
    dingtalk: getEnv("DINGTALK_WEBHOOK_URL"),
    dingtalkKeyword: getEnv("DINGTALK_KEYWORD"),
    dingtalkSignSecret: getEnv("DINGTALK_SIGN_SECRET"),
    feishu: getEnv("FEISHU_WEBHOOK_URL"),
    wecom: getEnv("WECOM_WEBHOOK_URL"),
    email: {
      host: getEnv("SMTP_HOST"),
      port: getEnv("SMTP_PORT"),
      user: getEnv("SMTP_USER"),
      pass: getEnv("SMTP_PASS"),
      from: getEnv("SMTP_FROM"),
      to: getEnv("SMTP_TO"),
    },
  };
}

export function isEmailEnabled(cfg: ChannelConfig): boolean {
  return Boolean(
    cfg.email.host &&
    cfg.email.user &&
    cfg.email.pass &&
    cfg.email.from &&
    cfg.email.to,
  );
}

// ── DingTalk ─────────────────────────────────────────────────────────────────

function buildDingtalkUrl(baseUrl: string, signSecret?: string): string {
  if (!signSecret) return baseUrl;

  const timestamp = Date.now();
  const stringToSign = `${timestamp}\n${signSecret}`;
  const sign = crypto
    .createHmac("sha256", signSecret)
    .update(stringToSign)
    .digest("base64");
  const encodedSign = encodeURIComponent(sign);

  return `${baseUrl}&timestamp=${timestamp}&sign=${encodedSign}`;
}

async function sendDingtalk(
  cfg: ChannelConfig,
  msg: FormattedMessage,
): Promise<void> {
  const url = buildDingtalkUrl(cfg.dingtalk!, cfg.dingtalkSignSecret);
  const title = cfg.dingtalkKeyword
    ? `${cfg.dingtalkKeyword} ${msg.title}`
    : msg.title;

  const body = {
    msgtype: "markdown",
    markdown: { title, text: msg.text },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`DingTalk responded ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as { errcode?: number; errmsg?: string };
  if (json.errcode && json.errcode !== 0) {
    throw new Error(`DingTalk error ${json.errcode}: ${json.errmsg}`);
  }
}

// ── Feishu ───────────────────────────────────────────────────────────────────

async function sendFeishu(
  cfg: ChannelConfig,
  msg: FormattedMessage,
): Promise<void> {
  const body = {
    msg_type: "post",
    content: {
      post: {
        zh_cn: {
          title: msg.title,
          content: [[{ tag: "text", text: msg.text }]],
        },
      },
    },
  };

  const res = await fetch(cfg.feishu!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Feishu responded ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as { code?: number; msg?: string };
  if (json.code && json.code !== 0) {
    throw new Error(`Feishu error ${json.code}: ${json.msg}`);
  }
}

// ── WeCom ────────────────────────────────────────────────────────────────────

async function sendWecom(
  cfg: ChannelConfig,
  msg: FormattedMessage,
): Promise<void> {
  const body = {
    msgtype: "markdown",
    markdown: { content: msg.text },
  };

  const res = await fetch(cfg.wecom!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`WeCom responded ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as { errcode?: number; errmsg?: string };
  if (json.errcode && json.errcode !== 0) {
    throw new Error(`WeCom error ${json.errcode}: ${json.errmsg}`);
  }
}

// ── Email ────────────────────────────────────────────────────────────────────

async function sendEmail(
  cfg: ChannelConfig,
  msg: FormattedMessage,
): Promise<void> {
  const { email } = cfg;
  // Dynamic import to avoid loading nodemailer when not needed
  const nodemailer = await import("nodemailer");

  const transporter = nodemailer.default.createTransport({
    host: email.host,
    port: email.port ? Number.parseInt(email.port, 10) : 587,
    secure: false,
    auth: { user: email.user, pass: email.pass },
  });

  const htmlBody = msg.text
    .split("\n")
    .map((line) => (line === "" ? "<br>" : `<p>${line}</p>`))
    .join("\n");

  await transporter.sendMail({
    from: email.from,
    to: email.to,
    subject: `[qa-flow] ${msg.title}`,
    text: msg.text,
    html: `<div style="font-family: sans-serif;">${htmlBody}</div>`,
  });
}

// ── Orchestration ────────────────────────────────────────────────────────────

export async function sendNotification(
  event: EventType,
  data: NotifyData,
  options: { dryRun?: boolean } = {},
): Promise<SendResult> {
  initEnv(resolve(__dirname, "../../.env"));

  const msg = formatMessage(event, data);
  const channels = detectChannels();

  if (options.dryRun) {
    process.stderr.write(`[dry-run] event=${event}\n${msg.text}\n`);
    const output = { dry_run: true, message: msg.text };
    process.stdout.write(JSON.stringify(output, null, 2) + "\n");
    return { sent: [], failed: [], skipped: [] };
  }

  const tasks: Array<{ name: string; fn: () => Promise<void> }> = [];
  const skipped: string[] = [];

  if (channels.dingtalk) {
    tasks.push({ name: "dingtalk", fn: () => sendDingtalk(channels, msg) });
  } else {
    skipped.push("dingtalk");
  }

  if (channels.feishu) {
    tasks.push({ name: "feishu", fn: () => sendFeishu(channels, msg) });
  } else {
    skipped.push("feishu");
  }

  if (channels.wecom) {
    tasks.push({ name: "wecom", fn: () => sendWecom(channels, msg) });
  } else {
    skipped.push("wecom");
  }

  if (isEmailEnabled(channels)) {
    tasks.push({ name: "email", fn: () => sendEmail(channels, msg) });
  } else {
    skipped.push("email");
  }

  const results = await Promise.allSettled(tasks.map((t) => t.fn()));

  const sent: string[] = [];
  const failed: string[] = [];

  results.forEach((result, index) => {
    const name = tasks[index].name;
    if (result.status === "fulfilled") {
      sent.push(name);
    } else {
      failed.push(name);
      process.stderr.write(`[notify] ${name} failed: ${result.reason}\n`);
    }
  });

  return { sent, failed, skipped };
}

// ── CLI Entry Point ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const program = new Command();

  program
    .name("notify")
    .description("qa-flow IM 通知发送工具")
    .version("1.0.0")
    .requiredOption(
      "-e, --event <type>",
      "事件类型 (case-generated, bug-report, ...)",
    )
    .option("-d, --data <json>", "事件数据 (JSON 字符串)", "{}")
    .option("--dry-run", "仅格式化消息，不实际发送")
    .addHelpText(
      "after",
      `
示例:
  $ bun run plugins/notify/send.ts --event case-generated --data '{"count":42,"file":"test.xmind","duration":30}'
  $ bun run plugins/notify/send.ts --dry-run --event workflow-failed --data '{"step":"writer","reason":"timeout"}'

支持的事件类型:
  case-generated       用例生成完成
  bug-report           Bug 分析报告生成完成
  conflict-analyzed    冲突分析完成
  hotfix-case-generated  线上问题用例转化完成
  ui-test-completed    UI 自动化测试完成
  archive-converted    批量归档完成
  workflow-failed      工作流异常中断
`,
    );

  program.parse(process.argv);

  const opts = program.opts<{
    event: string;
    data: string;
    dryRun?: boolean;
  }>();

  let data: NotifyData;
  try {
    data = JSON.parse(opts.data) as NotifyData;
  } catch {
    process.stderr.write(`[notify] Invalid --data JSON: ${opts.data}\n`);
    process.exit(1);
  }

  const result = await sendNotification(opts.event, data, {
    dryRun: opts.dryRun,
  });

  if (!opts.dryRun) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  }
}

// Only run CLI when this file is executed directly (not imported as a module)
const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  main().catch((err: unknown) => {
    process.stderr.write(`[notify] Fatal error: ${err}\n`);
    process.exit(1);
  });
}
