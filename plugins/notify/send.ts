#!/usr/bin/env npx tsx
/**
 * qa-flow notify plugin — send IM/email notifications
 *
 * Usage:
 *   npx tsx plugins/notify/send.ts --event case-generated --data '{"count":42,"file":"test.xmind"}'
 *   npx tsx plugins/notify/send.ts --dry-run --event case-generated --data '{"count":42}'
 *   npx tsx plugins/notify/send.ts --help
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

export function formatMessage(event: EventType, data: NotifyData): FormattedMessage {
  let text: string;

  switch (event) {
    case "case-generated":
      text = `✅ 用例生成完成\n\n- 用例数：${data.count ?? "-"}\n- 文件：${data.file ?? "-"}\n- 耗时：${data.duration ?? "-"}s`;
      break;
    case "bug-report":
      text = `🐛 Bug 分析报告\n\n- 报告：${data.reportFile ?? "-"}\n- 摘要：${data.summary ?? "-"}`;
      break;
    case "conflict-analyzed":
      text = `⚠️ 冲突分析完成\n\n- 报告：${data.reportFile ?? "-"}\n- 冲突数：${data.conflictCount ?? "-"}`;
      break;
    case "hotfix-case-generated":
      text = `🔧 Hotfix 用例生成\n\n- Bug：${data.bugId ?? "-"}\n- 分支：${data.branch ?? "-"}\n- 文件：${data.file ?? "-"}`;
      break;
    case "ui-test-completed":
      text = `🧪 UI 测试完成\n\n- 通过：${data.passed ?? "-"}\n- 失败：${data.failed ?? "-"}\n- 报告：${data.reportFile ?? "-"}`;
      break;
    case "archive-converted":
      text = `📦 归档转化完成\n\n- 文件数：${data.fileCount ?? "-"}\n- 用例数：${data.caseCount ?? "-"}`;
      break;
    case "workflow-failed":
      text = `❌ 工作流异常\n\n- 步骤：${data.step ?? "-"}\n- 原因：${data.reason ?? "-"}`;
      break;
    default:
      text = `📢 qa-flow | ${event}\n\n${JSON.stringify(data, null, 2)}`;
  }

  // Title = first line without emoji (strip leading emoji + space)
  const firstLine = text.split("\n")[0];
  const title = firstLine.replace(/^[\p{Emoji}\s]+/u, "").trim();

  return { title, text };
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

async function sendDingtalk(cfg: ChannelConfig, msg: FormattedMessage): Promise<void> {
  const url = buildDingtalkUrl(cfg.dingtalk!, cfg.dingtalkSignSecret);
  const title = cfg.dingtalkKeyword ? `${cfg.dingtalkKeyword} ${msg.title}` : msg.title;

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

async function sendFeishu(cfg: ChannelConfig, msg: FormattedMessage): Promise<void> {
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

async function sendWecom(cfg: ChannelConfig, msg: FormattedMessage): Promise<void> {
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

async function sendEmail(cfg: ChannelConfig, msg: FormattedMessage): Promise<void> {
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
    .requiredOption("-e, --event <type>", "事件类型 (case-generated, bug-report, ...)")
    .option("-d, --data <json>", "事件数据 (JSON 字符串)", "{}")
    .option("--dry-run", "仅格式化消息，不实际发送")
    .addHelpText(
      "after",
      `
示例:
  $ npx tsx plugins/notify/send.ts --event case-generated --data '{"count":42,"file":"test.xmind","duration":30}'
  $ npx tsx plugins/notify/send.ts --dry-run --event workflow-failed --data '{"step":"writer","reason":"timeout"}'

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

  const opts = program.opts<{ event: string; data: string; dryRun?: boolean }>();

  let data: NotifyData;
  try {
    data = JSON.parse(opts.data) as NotifyData;
  } catch {
    process.stderr.write(`[notify] Invalid --data JSON: ${opts.data}\n`);
    process.exit(1);
  }

  const result = await sendNotification(opts.event, data, { dryRun: opts.dryRun });

  if (!opts.dryRun) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  }
}

// Only run CLI when this file is executed directly (not imported as a module)
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  main().catch((err: unknown) => {
    process.stderr.write(`[notify] Fatal error: ${err}\n`);
    process.exit(1);
  });
}
