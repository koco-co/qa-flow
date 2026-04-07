import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  formatMessage,
  detectChannels,
  isEmailEnabled,
  sendNotification,
  type FormattedMessage,
  type ChannelConfig,
} from "../send.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SEND_TS = resolve(__dirname, "../send.ts");

// ── Helpers ──────────────────────────────────────────────────────────────────

function stripEmoji(s: string): string {
  return s.replace(/^[\p{Emoji}\s]+/u, "").trim();
}

// ── Message Formatting ───────────────────────────────────────────────────────

describe("formatMessage", () => {
  it("case-generated: includes count, file, duration in markdown table", () => {
    const msg = formatMessage("case-generated", { count: 42, file: "test.xmind", duration: 30 });
    assert.ok(msg.text.includes("42"), "should include count");
    assert.ok(msg.text.includes("test.xmind"), "should include file");
    assert.ok(msg.text.includes("30"), "should include duration");
    assert.ok(msg.text.includes("✅"), "should contain ✅");
    assert.ok(msg.text.includes("| 项目 | 详情 |"), "should have markdown table header");
  });

  it("case-generated: title is heading without emoji/hash", () => {
    const msg = formatMessage("case-generated", { count: 1, file: "a.xmind" });
    assert.equal(msg.title, "用例生成完成");
  });

  it("bug-report: includes reportFile, summary, and severity", () => {
    const msg = formatMessage("bug-report", { reportFile: "report.html", summary: "3 issues", severity: "严重" });
    assert.ok(msg.text.includes("report.html"));
    assert.ok(msg.text.includes("3 issues"));
    assert.ok(msg.text.includes("严重"));
    assert.ok(msg.text.includes("🐛"));
  });

  it("bug-report: title strips emoji and markdown heading", () => {
    const msg = formatMessage("bug-report", {});
    assert.equal(msg.title, "Bug 分析报告");
  });

  it("conflict-analyzed: includes reportFile and conflictCount", () => {
    const msg = formatMessage("conflict-analyzed", { reportFile: "conflicts.html", conflictCount: 5 });
    assert.ok(msg.text.includes("conflicts.html"));
    assert.ok(msg.text.includes("5"));
    assert.ok(msg.text.includes("⚠️"));
  });

  it("hotfix-case-generated: includes bugId, branch, file", () => {
    const msg = formatMessage("hotfix-case-generated", { bugId: "BUG-123", branch: "hotfix/fix", file: "case.xmind" });
    assert.ok(msg.text.includes("BUG-123"));
    assert.ok(msg.text.includes("hotfix/fix"));
    assert.ok(msg.text.includes("case.xmind"));
    assert.ok(msg.text.includes("🔧"));
  });

  it("ui-test-completed: includes passed, failed, reportFile, pass rate", () => {
    const msg = formatMessage("ui-test-completed", { passed: 10, failed: 2, reportFile: "ui-report.html" });
    assert.ok(msg.text.includes("10"));
    assert.ok(msg.text.includes("2"));
    assert.ok(msg.text.includes("ui-report.html"));
    assert.ok(msg.text.includes("🧪"));
    assert.ok(msg.text.includes("83%"), "should calculate pass rate");
  });

  it("ui-test-completed: shows red icon when failures exist", () => {
    const msg = formatMessage("ui-test-completed", { passed: 5, failed: 3 });
    assert.ok(msg.text.includes("🔴"), "should show red icon for failures");
  });

  it("ui-test-completed: shows green icon when all pass", () => {
    const msg = formatMessage("ui-test-completed", { passed: 10, failed: 0 });
    assert.ok(msg.text.includes("🟢"), "should show green icon for all pass");
  });

  it("archive-converted: includes fileCount and caseCount", () => {
    const msg = formatMessage("archive-converted", { fileCount: 3, caseCount: 120 });
    assert.ok(msg.text.includes("3"));
    assert.ok(msg.text.includes("120"));
    assert.ok(msg.text.includes("📦"));
  });

  it("workflow-failed: includes step and reason", () => {
    const msg = formatMessage("workflow-failed", { step: "writer", reason: "timeout" });
    assert.ok(msg.text.includes("writer"));
    assert.ok(msg.text.includes("timeout"));
    assert.ok(msg.text.includes("❌"));
  });

  it("unknown event: falls back to JSON dump", () => {
    const msg = formatMessage("custom-event", { foo: "bar" });
    assert.ok(msg.text.includes("custom-event"));
    assert.ok(msg.text.includes("bar"));
    assert.ok(msg.text.includes("📢"));
  });

  it("missing data fields show dash placeholder", () => {
    const msg = formatMessage("case-generated", {});
    assert.ok(msg.text.includes("-"), "should use - for missing fields");
  });

  it("all events include timestamp footer", () => {
    const msg = formatMessage("case-generated", { count: 1 });
    assert.ok(msg.text.includes("QAFlow"), "should have QAFlow footer");
    assert.ok(msg.text.includes("🕐"), "should have timestamp icon");
  });
});

// ── Channel Detection ────────────────────────────────────────────────────────

describe("detectChannels", () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = {
      DINGTALK_WEBHOOK_URL: process.env.DINGTALK_WEBHOOK_URL,
      DINGTALK_KEYWORD: process.env.DINGTALK_KEYWORD,
      DINGTALK_SIGN_SECRET: process.env.DINGTALK_SIGN_SECRET,
      FEISHU_WEBHOOK_URL: process.env.FEISHU_WEBHOOK_URL,
      WECOM_WEBHOOK_URL: process.env.WECOM_WEBHOOK_URL,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      SMTP_FROM: process.env.SMTP_FROM,
      SMTP_TO: process.env.SMTP_TO,
    };
    // Clear all channel env vars
    for (const key of Object.keys(savedEnv)) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("returns undefined channels when no env vars set", () => {
    const cfg = detectChannels();
    assert.equal(cfg.dingtalk, undefined);
    assert.equal(cfg.feishu, undefined);
    assert.equal(cfg.wecom, undefined);
    assert.equal(cfg.email.host, undefined);
  });

  it("detects dingtalk channel", () => {
    process.env.DINGTALK_WEBHOOK_URL = "https://oapi.dingtalk.com/robot/send?access_token=test";
    const cfg = detectChannels();
    assert.equal(cfg.dingtalk, "https://oapi.dingtalk.com/robot/send?access_token=test");
  });

  it("detects feishu channel", () => {
    process.env.FEISHU_WEBHOOK_URL = "https://open.feishu.cn/open-apis/bot/v2/hook/test";
    const cfg = detectChannels();
    assert.equal(cfg.feishu, "https://open.feishu.cn/open-apis/bot/v2/hook/test");
  });

  it("detects wecom channel", () => {
    process.env.WECOM_WEBHOOK_URL = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test";
    const cfg = detectChannels();
    assert.equal(cfg.wecom, "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test");
  });

  it("detects dingtalk keyword and sign secret", () => {
    process.env.DINGTALK_WEBHOOK_URL = "https://example.com";
    process.env.DINGTALK_KEYWORD = "【测试】";
    process.env.DINGTALK_SIGN_SECRET = "SEC_test_secret";
    const cfg = detectChannels();
    assert.equal(cfg.dingtalkKeyword, "【测试】");
    assert.equal(cfg.dingtalkSignSecret, "SEC_test_secret");
  });
});

// ── Email Enabled Check ──────────────────────────────────────────────────────

describe("isEmailEnabled", () => {
  const fullEmailCfg: ChannelConfig = {
    dingtalk: undefined,
    dingtalkKeyword: undefined,
    dingtalkSignSecret: undefined,
    feishu: undefined,
    wecom: undefined,
    email: {
      host: "smtp.example.com",
      port: "587",
      user: "user@example.com",
      pass: "secret",
      from: "qa@example.com",
      to: "team@example.com",
    },
  };

  it("returns true when all email fields are set", () => {
    assert.equal(isEmailEnabled(fullEmailCfg), true);
  });

  it("returns false when host is missing", () => {
    const cfg: ChannelConfig = { ...fullEmailCfg, email: { ...fullEmailCfg.email, host: undefined } };
    assert.equal(isEmailEnabled(cfg), false);
  });

  it("returns false when user is missing", () => {
    const cfg: ChannelConfig = { ...fullEmailCfg, email: { ...fullEmailCfg.email, user: undefined } };
    assert.equal(isEmailEnabled(cfg), false);
  });

  it("returns false when pass is missing", () => {
    const cfg: ChannelConfig = { ...fullEmailCfg, email: { ...fullEmailCfg.email, pass: undefined } };
    assert.equal(isEmailEnabled(cfg), false);
  });

  it("returns false when to is missing", () => {
    const cfg: ChannelConfig = { ...fullEmailCfg, email: { ...fullEmailCfg.email, to: undefined } };
    assert.equal(isEmailEnabled(cfg), false);
  });

  it("returns false when no email fields set", () => {
    const emptyCfg: ChannelConfig = {
      ...fullEmailCfg,
      email: { host: undefined, port: undefined, user: undefined, pass: undefined, from: undefined, to: undefined },
    };
    assert.equal(isEmailEnabled(emptyCfg), false);
  });
});

// ── Dry Run ──────────────────────────────────────────────────────────────────

describe("sendNotification dry-run", () => {
  it("returns empty sent/failed/skipped arrays in dry-run mode", async () => {
    // Capture stdout by redirecting temporarily
    const chunks: Buffer[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: string | Buffer, ...args: unknown[]): boolean => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return true;
    };

    const result = await sendNotification(
      "case-generated",
      { count: 1, file: "a.xmind", duration: 5 },
      { dryRun: true },
    );

    process.stdout.write = originalWrite;

    const output = Buffer.concat(chunks).toString("utf8");
    const parsed = JSON.parse(output) as { dry_run: boolean; message: string };

    assert.equal(result.sent.length, 0);
    assert.equal(result.failed.length, 0);
    assert.equal(result.skipped.length, 0);
    assert.equal(parsed.dry_run, true);
    assert.ok(parsed.message.includes("用例生成完成"));
  });
});

// ── CLI Integration ──────────────────────────────────────────────────────────

describe("CLI --help", () => {
  it("--help exits with code 0 and shows usage", () => {
    const result = execSync(`bun run "${SEND_TS}" --help`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    assert.ok(result.includes("notify") || result.includes("event"), "help text should mention event");
  });
});

describe("CLI --dry-run", () => {
  it("outputs dry_run JSON to stdout", () => {
    const stdout = execSync(
      `bun run "${SEND_TS}" --dry-run --event case-generated --data '{"count":1,"file":"test.xmind","duration":30}'`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    );
    const parsed = JSON.parse(stdout) as { dry_run: boolean; message: string };
    assert.equal(parsed.dry_run, true);
    assert.ok(parsed.message.includes("用例生成完成"));
  });

  it("dry-run with workflow-failed event outputs correct message", () => {
    const stdout = execSync(
      `bun run "${SEND_TS}" --dry-run --event workflow-failed --data '{"step":"writer","reason":"timeout"}'`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    );
    const parsed = JSON.parse(stdout) as { dry_run: boolean; message: string };
    assert.ok(parsed.message.includes("writer"));
    assert.ok(parsed.message.includes("timeout"));
  });
});
