#!/usr/bin/env bun
/**
 * kata notify plugin — send IM/email notifications
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
  | "ui-test-needs-input"
  | "archive-converted"
  | "workflow-failed"
  | (string & {});

export interface NotifyData {
  [key: string]: unknown;
}

// ── Event Schemas ────────────────────────────────────────────────────────────
// Single source of truth: drives --help, --describe and runtime field validation.

export interface FieldSpec {
  name: string;
  required?: boolean;
  type: "string" | "number" | "boolean" | "string[]" | "enum";
  desc: string;
  enum?: string[];
}

export interface EventSchema {
  summary: string;
  fields: FieldSpec[];
}

export const EVENT_SCHEMAS: Record<string, EventSchema> = {
  "case-generated": {
    summary: "测试用例生成完成（XMind / Archive）",
    fields: [
      { name: "count", type: "number", desc: "用例数量" },
      { name: "file", type: "string", desc: "XMind 文件路径" },
      { name: "archiveFile", type: "string", desc: "Archive MD 路径" },
      { name: "requirement", type: "string", desc: "需求名称" },
      { name: "duration", type: "number", desc: "耗时（秒）" },
    ],
  },
  "bug-report": {
    summary: "Bug 分析报告生成完成",
    fields: [
      { name: "summary", type: "string", desc: "一句话摘要" },
      { name: "problemType", type: "string", desc: "问题类型（前端/后端/...）" },
      { name: "severity", type: "string", desc: "严重度（critical/high/medium/low）" },
      { name: "rootCause", type: "string", desc: "根因描述" },
      { name: "fixSuggestion", type: "string", desc: "修复建议" },
      { name: "reportFile", type: "string", desc: "HTML 报告路径" },
    ],
  },
  "conflict-analyzed": {
    summary: "Git 合并冲突分析完成",
    fields: [
      { name: "conflictCount", type: "number", desc: "冲突总数" },
      { name: "autoResolvable", type: "number", desc: "可自动合并数" },
      { name: "manualRequired", type: "number", desc: "需人工决策数" },
      { name: "branches", type: "string[]", desc: "分支链（[base, target]）" },
      { name: "reportFile", type: "string", desc: "HTML 报告路径" },
    ],
  },
  "hotfix-case-generated": {
    summary: "Hotfix 验证用例生成完成",
    fields: [
      { name: "bugId", type: "string", desc: "禅道 Bug ID" },
      { name: "branch", type: "string", desc: "修复分支名" },
      { name: "caseCount", type: "number", desc: "用例数量" },
      { name: "file", type: "string", desc: "XMind 文件路径" },
    ],
  },
  "ui-test-completed": {
    summary: "UI 自动化测试套件执行完成",
    fields: [
      { name: "passed", required: true, type: "number", desc: "通过数" },
      { name: "failed", required: true, type: "number", desc: "失败数" },
      { name: "broken", type: "number", desc: "异常数" },
      { name: "skipped", type: "number", desc: "跳过数" },
      { name: "total", type: "number", desc: "总数（不传则自动求和）" },
      { name: "env", type: "string", desc: "环境标识（如 ltqcdev）" },
      { name: "envLabel", type: "string", desc: "环境展示名/URL" },
      { name: "tenant", type: "string", desc: "租户" },
      { name: "project", type: "string", desc: "项目名" },
      { name: "suite", type: "string", desc: "套件/需求名" },
      { name: "durationMs", type: "number", desc: "总耗时（毫秒）" },
      { name: "reportFile", type: "string", desc: "Allure 本地路径（兼容字段）" },
      { name: "reportURL", type: "string", desc: "Allure 在线访问 URL" },
      { name: "specFiles", type: "string[]", desc: "spec 文件列表" },
    ],
  },
  "ui-test-needs-input": {
    summary: "UI 自动化遇到无法自主判断的偏差，等待用户裁定",
    fields: [
      { name: "question", required: true, type: "string", desc: "向用户提出的一句话问题" },
      {
        name: "reasonType",
        required: true,
        type: "enum",
        enum: ["dom_mismatch", "assertion_ambiguity", "flow_missing", "selector_unknown", "potential_bug"],
        desc: "原因类型（卡片中按映射展示中文）",
      },
      { name: "caseTitle", required: true, type: "string", desc: "用例标题" },
      { name: "expected", type: "string", desc: "用例预期文本" },
      { name: "actual", type: "string", desc: "页面实际表现" },
      { name: "evidence", type: "string", desc: "DOM snippet / 截图路径 / 关键源码引用" },
      { name: "project", type: "string", desc: "项目名" },
      { name: "suite", type: "string", desc: "套件/需求名" },
    ],
  },
  "archive-converted": {
    summary: "Archive MD 批量归档完成（仅在新增文件时触发）",
    fields: [
      { name: "fileCount", type: "number", desc: "新增文件数" },
      { name: "caseCount", type: "number", desc: "用例数量（缺失时整行隐藏）" },
      { name: "outputDir", type: "string", desc: "归档目录（缺失时整行隐藏）" },
    ],
  },
  "workflow-failed": {
    summary: "工作流异常中断",
    fields: [
      { name: "step", required: true, type: "string", desc: "失败步骤标识" },
      { name: "reason", required: true, type: "string", desc: "失败原因" },
      { name: "retryable", type: "string", desc: "是否可重试（默认是）" },
    ],
  },
};

export interface ValidationResult {
  missingRequired: string[];
  unknownFields: string[];
  enumViolations: { field: string; value: unknown; allowed: string[] }[];
}

export function validateEventData(event: string, data: NotifyData): ValidationResult {
  const schema = EVENT_SCHEMAS[event];
  if (!schema) {
    return { missingRequired: [], unknownFields: [], enumViolations: [] };
  }
  const known = new Set(schema.fields.map((f) => f.name));
  const missingRequired = schema.fields
    .filter((f) => f.required && (data[f.name] === undefined || data[f.name] === null))
    .map((f) => f.name);
  const unknownFields = Object.keys(data).filter((k) => !known.has(k));
  const enumViolations = schema.fields
    .filter((f) => f.type === "enum" && data[f.name] !== undefined && f.enum)
    .filter((f) => !f.enum!.includes(String(data[f.name])))
    .map((f) => ({ field: f.name, value: data[f.name], allowed: f.enum! }));
  return { missingRequired, unknownFields, enumViolations };
}

export function describeEvent(event: string): string {
  const schema = EVENT_SCHEMAS[event];
  if (!schema) {
    const known = Object.keys(EVENT_SCHEMAS).join(", ");
    return `未知事件 "${event}"。已知事件: ${known}`;
  }
  const lines = [`事件: ${event}`, `说明: ${schema.summary}`, "", "字段:"];
  const nameWidth = Math.max(...schema.fields.map((f) => f.name.length));
  const typeWidth = Math.max(...schema.fields.map((f) => f.type.length));
  for (const f of schema.fields) {
    const flag = f.required ? "*" : " ";
    const enumHint = f.type === "enum" && f.enum ? `  [${f.enum.join(" | ")}]` : "";
    lines.push(
      `  ${flag} ${f.name.padEnd(nameWidth)}  ${f.type.padEnd(typeWidth)}  ${f.desc}${enumHint}`,
    );
  }
  lines.push("", "* = 必填");
  return lines.join("\n");
}

export function listAllEvents(): string {
  const lines = ["全部事件类型:"];
  const nameWidth = Math.max(...Object.keys(EVENT_SCHEMAS).map((n) => n.length));
  for (const [name, schema] of Object.entries(EVENT_SCHEMAS)) {
    lines.push(`  ${name.padEnd(nameWidth)}  ${schema.summary}`);
  }
  lines.push("", "查看单个事件字段: --describe <event>");
  return lines.join("\n");
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
        `🕐 ${timestamp} · Kata`,
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
        `🕐 ${timestamp} · Kata`,
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
        `🕐 ${timestamp} · Kata`,
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
        `🕐 ${timestamp} · Kata`,
      ].join("\n");

    case "ui-test-completed":
      return formatUiTestCompleted(data, timestamp);

    case "archive-converted": {
      const fileCount = data.fileCount;
      const caseCount = data.caseCount;
      const outputDir = data.outputDir;
      const rows = [
        ...(fileCount !== undefined && fileCount !== null
          ? [`| 📁 新增文件数 | **${fileCount}** |`]
          : []),
        ...(caseCount !== undefined && caseCount !== null
          ? [`| 📊 用例数 | **${caseCount}** |`]
          : []),
        ...(outputDir ? [`| 📂 目录 | ${outputDir} |`] : []),
      ];
      return [
        "## 📦 归档转化完成",
        "",
        `> **${fileCount ?? "-"}** 个文件已标准化归档`,
        "",
        "| 项目 | 详情 |",
        "| --- | --- |",
        ...rows,
        "",
        `---`,
        `🕐 ${timestamp} · Kata`,
      ].join("\n");
    }

    case "ui-test-needs-input": {
      const REASON_TYPE_LABELS: Record<string, string> = {
        dom_mismatch: "DOM 与用例不一致",
        assertion_ambiguity: "断言文本歧义",
        flow_missing: "流程步骤缺失",
        selector_unknown: "选择器无法确定",
        potential_bug: "疑似业务 Bug",
      };
      const caseTitle = data.caseTitle ? String(data.caseTitle) : "-";
      const rawReason = data.reasonType ? String(data.reasonType) : "-";
      const reasonType = REASON_TYPE_LABELS[rawReason] ?? rawReason;
      const question = data.question ? String(data.question) : "-";
      const expected = data.expected ? String(data.expected) : "";
      const actual = data.actual ? String(data.actual) : "";
      const evidence = data.evidence ? String(data.evidence) : "";
      const suite = data.suite ? String(data.suite) : "";
      const project = data.project ? String(data.project) : "";

      const titleSuffix = suite ? ` · ${suite}` : "";
      const rows = [
        ...(project ? [`| 📦 项目 | \`${project}\` |`] : []),
        ...(suite ? [`| 🎯 套件 | ${suite} |`] : []),
        `| 📝 用例 | ${caseTitle} |`,
        `| 🏷 类型 | ${reasonType} |`,
        ...(expected ? [`| 📖 用例预期 | ${expected} |`] : []),
        ...(actual ? [`| 🖥 实际表现 | ${actual} |`] : []),
      ];

      const lines: string[] = [
        `## ⏸ UI 自动化等待用户确认${titleSuffix}`,
        "",
        `> ${question}`,
        "",
        "| 项目 | 详情 |",
        "| --- | --- |",
        ...rows,
        "",
      ];
      if (evidence) {
        lines.push(`**🔍 证据：** ${evidence}`, "");
      }
      lines.push(
        "**⚡ 请回到 Claude Code 会话回答问题，工作流已暂停等待你的判断。**",
        "",
        "---",
        `🕐 ${timestamp} · Kata`,
      );
      return lines.join("\n");
    }

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
        `🕐 ${timestamp} · Kata`,
      ].join("\n");

    default:
      return [
        `## 📢 Kata 通知 | ${event}`,
        "",
        "```json",
        JSON.stringify(data, null, 2),
        "```",
        "",
        `---`,
        `🕐 ${timestamp} · Kata`,
      ].join("\n");
  }
}

function formatUiTestCompleted(data: NotifyData, timestamp: string): string {
  const passed = Number(data.passed ?? 0);
  const failed = Number(data.failed ?? 0);
  const broken = Number(data.broken ?? 0);
  const skipped = Number(data.skipped ?? 0);
  const total = Number(data.total ?? passed + failed + broken + skipped);
  const executed = total - skipped;
  const rate =
    executed > 0 ? `${Math.round((passed / executed) * 100)}%` : "-";

  const failedTotal = failed + broken;
  const statusIcon = failedTotal > 0 ? "🔴" : passed > 0 ? "🟢" : "⚪";
  const statusText = failedTotal > 0 ? "存在失败" : passed > 0 ? "全部通过" : "无通过用例";

  const envLabel = data.envLabel ? String(data.envLabel) : "";
  const envCode = data.env ? String(data.env) : "";
  const envDisplay = envLabel || envCode || "-";
  const tenant = data.tenant ? String(data.tenant) : "";
  const project = data.project ? String(data.project) : "";
  const suite = data.suite ? String(data.suite) : "";
  const durationText = formatDuration(Number(data.durationMs ?? 0));

  const titlePrefix = suite ? `${suite} - ` : "";

  const rows = [
    `| 🏷 环境 | ${formatEnvCell(envDisplay, envCode, envLabel)} |`,
    ...(tenant ? [`| 🏢 租户 | \`${tenant}\` |`] : []),
    ...(project ? [`| 📦 项目 | \`${project}\` |`] : []),
    ...(suite ? [`| 🎯 需求 | ${suite} |`] : []),
    `| 📊 总计 | **${total}**（执行 ${executed} · 跳过 ${skipped}） |`,
    `| ✅ 通过 | **${passed}** |`,
    `| ❌ 失败 | **${failed}** |`,
    ...(broken > 0 ? [`| ⚠️ 异常 | **${broken}** |`] : []),
    `| 📈 通过率 | **${rate}** |`,
    `| ⏱ 耗时 | ${durationText} |`,
  ];

  const lines: string[] = [
    `## 🧪 ${titlePrefix}UI 自动化测试完成 ${statusIcon}`,
    "",
    `> **${statusText}** · 通过率 **${rate}**（${passed}/${executed}）`,
    "",
    "| 指标 | 值 |",
    "| --- | --- |",
    ...rows,
    "",
  ];

  // Allure report section (supports both new `reportPath`/`reportUrl` and legacy `reportFile`/`reportURL`)
  const reportPath = data.reportPath
    ? String(data.reportPath)
    : data.reportFile
      ? String(data.reportFile)
      : "";
  const reportUrl = data.reportUrl
    ? String(data.reportUrl)
    : data.reportURL
      ? String(data.reportURL)
      : "";
  if (reportPath || reportUrl) {
    lines.push("**📄 Allure 报告**");
    lines.push("");
    if (reportUrl) {
      lines.push(`- 🔗 [在线查看](${reportUrl})`);
    }
    if (reportPath) {
      lines.push(`- 📁 本地路径：\`${reportPath}\``);
      lines.push(`- ▶️ 打开命令：\`allure open "${reportPath}"\``);
    }
    lines.push("");
  }

  // Top failed cases
  const failedCases = Array.isArray(data.failedCases)
    ? (data.failedCases as Array<{ title?: string; message?: string }>)
    : [];
  if (failedCases.length > 0) {
    const topN = 5;
    lines.push(`**❌ 失败用例（Top ${Math.min(topN, failedCases.length)}）**`);
    lines.push("");
    for (const fc of failedCases.slice(0, topN)) {
      const title = fc.title ?? "(未命名)";
      const msg = fc.message ? ` — ${fc.message}` : "";
      lines.push(`- ${title}${msg}`);
    }
    if (failedCases.length > topN) {
      lines.push(`- …另有 ${failedCases.length - topN} 条失败，详见报告`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(`🕐 ${timestamp} · Kata`);

  return lines.join("\n");
}

function formatEnvCell(display: string, code: string, label: string): string {
  // When we have a URL (label starts with http/https), render as clickable link + small code tag
  if (/^https?:\/\//i.test(display)) {
    const codeSuffix = code && code !== display ? ` · \`${code}\`` : "";
    return `[${display}](${display})${codeSuffix}`;
  }
  // Only env code (ltqc) available
  return `\`${display}\``;
}

function formatDuration(ms: number): string {
  if (!ms || ms < 0) return "-";
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
  const hour = Math.floor(min / 60);
  const remMin = min % 60;
  return `${hour}h ${remMin}m`;
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
    subject: `[kata] ${msg.title}`,
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
    .description("kata IM 通知发送工具")
    .version("1.0.0")
    .option("-e, --event <type>", "事件类型 (使用 --list-events 查看所有)")
    .option("-d, --data <json>", "事件数据 (JSON 字符串，字段见 --describe <event>)", "{}")
    .option("--dry-run", "仅格式化消息，不实际发送")
    .option("--list-events", "列出所有支持的事件类型")
    .option("--describe <event>", "打印某个事件支持的字段、类型和必填项")
    .option("--strict", "未知字段或缺失必填字段时直接失败（默认仅告警）")
    .addHelpText(
      "after",
      `
${listAllEvents()}

示例:
  $ bun run plugins/notify/send.ts --list-events
  $ bun run plugins/notify/send.ts --describe ui-test-needs-input
  $ bun run plugins/notify/send.ts --event case-generated --data '{"count":42,"file":"test.xmind"}'
  $ bun run plugins/notify/send.ts --dry-run --event workflow-failed --data '{"step":"writer","reason":"timeout"}'
`,
    );

  program.parse(process.argv);

  const opts = program.opts<{
    event?: string;
    data: string;
    dryRun?: boolean;
    listEvents?: boolean;
    describe?: string;
    strict?: boolean;
  }>();

  if (opts.listEvents) {
    process.stdout.write(listAllEvents() + "\n");
    return;
  }

  if (opts.describe) {
    process.stdout.write(describeEvent(opts.describe) + "\n");
    return;
  }

  if (!opts.event) {
    process.stderr.write("[notify] --event 必填（或使用 --list-events / --describe）\n");
    process.exit(1);
  }

  let data: NotifyData;
  try {
    data = JSON.parse(opts.data) as NotifyData;
  } catch {
    process.stderr.write(`[notify] Invalid --data JSON: ${opts.data}\n`);
    process.exit(1);
  }

  const validation = validateEventData(opts.event, data);
  const hasIssues =
    validation.missingRequired.length > 0 ||
    validation.unknownFields.length > 0 ||
    validation.enumViolations.length > 0;
  if (hasIssues) {
    if (validation.missingRequired.length > 0) {
      process.stderr.write(
        `[notify] 缺失必填字段 (${opts.event}): ${validation.missingRequired.join(", ")}\n`,
      );
    }
    if (validation.unknownFields.length > 0) {
      process.stderr.write(
        `[notify] 未知字段将被丢弃 (${opts.event}): ${validation.unknownFields.join(", ")}\n`,
      );
    }
    for (const v of validation.enumViolations) {
      process.stderr.write(
        `[notify] 字段 "${v.field}" 值 "${v.value}" 不在枚举范围: [${v.allowed.join(", ")}]\n`,
      );
    }
    process.stderr.write(`[notify] 提示: 运行 \`--describe ${opts.event}\` 查看完整 schema\n`);
    if (opts.strict) {
      process.exit(1);
    }
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
