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

  it("ui-test-completed: includes passed, failed, reportFile (legacy), pass rate", () => {
    const msg = formatMessage("ui-test-completed", { passed: 10, failed: 2, reportFile: "ui-report.html" });
    assert.ok(msg.text.includes("10"));
    assert.ok(msg.text.includes("2"));
    assert.ok(msg.text.includes("ui-report.html"));
    assert.ok(msg.text.includes("🧪"));
    assert.ok(msg.text.includes("83%"), "should calculate pass rate");
  });

  it("validateEventData: flags missing required, unknown fields and enum violations", async () => {
    const { validateEventData } = await import("../send.ts");
    const result = validateEventData("ui-test-needs-input", {
      question: "x",
      reasonType: "bogus",
      wrongField: 1,
    });
    assert.deepEqual(result.missingRequired.sort(), ["caseTitle"]);
    assert.deepEqual(result.unknownFields, ["wrongField"]);
    assert.equal(result.enumViolations.length, 1);
    assert.equal(result.enumViolations[0].field, "reasonType");
  });

  it("describeEvent: returns multi-line schema for known event", async () => {
    const { describeEvent } = await import("../send.ts");
    const text = describeEvent("ui-test-needs-input");
    assert.ok(text.includes("question"));
    assert.ok(text.includes("dom_mismatch"));
    assert.ok(text.includes("* = 必填"));
  });

  it("listAllEvents: lists every event in EVENT_SCHEMAS", async () => {
    const { listAllEvents, EVENT_SCHEMAS } = await import("../send.ts");
    const text = listAllEvents();
    for (const name of Object.keys(EVENT_SCHEMAS)) {
      assert.ok(text.includes(name), `missing ${name} in listAllEvents output`);
    }
  });

  it("ui-test-needs-input: includes question, expected, actual, suite", () => {
    const msg = formatMessage("ui-test-needs-input", {
      project: "dataAssets",
      suite: "json格式配置",
      caseTitle: "验证 JSON 格式校验提示",
      reasonType: "dom_mismatch",
      question: "用例预期『校验通过』但页面显示『匹配成功』，是 Bug 还是用例文案要更新？",
      expected: "校验通过",
      actual: "匹配成功",
      evidence: "div.result-banner",
    });
    assert.ok(msg.text.includes("等待用户确认"));
    assert.ok(msg.text.includes("DOM 与用例不一致"), "reasonType should be rendered in Chinese");
    assert.ok(!msg.text.includes("dom_mismatch"), "raw enum should not appear in user-facing text");
    assert.ok(msg.text.includes("校验通过"));
    assert.ok(msg.text.includes("匹配成功"));
    assert.ok(msg.text.includes("json格式配置"));
    assert.ok(msg.text.includes("⏸"));
  });

  it("ui-test-completed: shows red icon when failures exist", () => {
    const msg = formatMessage("ui-test-completed", { passed: 5, failed: 3 });
    assert.ok(msg.text.includes("🔴"), "should show red icon for failures");
  });

  it("ui-test-completed: shows green icon when all pass", () => {
    const msg = formatMessage("ui-test-completed", { passed: 10, failed: 0 });
    assert.ok(msg.text.includes("🟢"), "should show green icon for all pass");
  });

  it("ui-test-completed: requirement name prepended to title and 需求 row present", () => {
    const msg = formatMessage("ui-test-completed", {
      suite: "【通用配置】json格式配置-15696",
      passed: 10,
      failed: 0,
    });
    assert.ok(
      msg.text.startsWith("## 🧪 【通用配置】json格式配置-15696 - UI 自动化测试完成"),
      "title should include requirement name prefix",
    );
    assert.ok(msg.text.includes("🎯 需求"), "label should be 需求 not 套件");
  });

  it("ui-test-completed: envLabel URL rendered as clickable link", () => {
    const msg = formatMessage("ui-test-completed", {
      env: "ltqc",
      envLabel: "http://shuzhan63-test-ltqc.k8s.dtstack.cn",
      passed: 1,
      failed: 0,
    });
    assert.ok(
      msg.text.includes("[http://shuzhan63-test-ltqc.k8s.dtstack.cn](http://shuzhan63-test-ltqc.k8s.dtstack.cn)"),
      "should render URL as markdown link",
    );
    assert.ok(msg.text.includes("`ltqc`"), "should append env code");
  });

  it("ui-test-completed: env code only when no URL available", () => {
    const msg = formatMessage("ui-test-completed", {
      env: "ltqc",
      passed: 1,
      failed: 0,
    });
    assert.ok(msg.text.includes("| 🏷 环境 | `ltqc` |"));
    assert.ok(!msg.text.includes("[ltqc]"));
  });

  it("ui-test-completed: renders tenant/project/duration and allure open command", () => {
    const msg = formatMessage("ui-test-completed", {
      env: "ltqc",
      envLabel: "http://shuzhan63-test-ltqc.k8s.dtstack.cn",
      tenant: "pw_test",
      project: "pw_test",
      suite: "【通用配置】json格式配置-15696",
      passed: 40,
      failed: 3,
      skipped: 0,
      broken: 0,
      durationMs: 125_000,
      reportPath: "/abs/path/allure-report",
      failedCases: [
        { title: "【P1】验证A", message: "timeout" },
        { title: "【P0】验证B", message: "element not found" },
      ],
    });
    assert.ok(msg.text.includes("pw_test"));
    assert.ok(msg.text.includes("【通用配置】json格式配置-15696"));
    assert.ok(msg.text.includes("93%"), "pass rate 40/43");
    assert.ok(msg.text.includes("2m 5s"), "duration formatting");
    assert.ok(msg.text.includes("allure open"));
    assert.ok(msg.text.includes("/abs/path/allure-report"));
    assert.ok(msg.text.includes("【P1】验证A"));
    assert.ok(msg.text.includes("timeout"));
  });

  it("ui-test-completed: online link section when reportUrl provided", () => {
    const msg = formatMessage("ui-test-completed", {
      passed: 1,
      failed: 0,
      reportUrl: "https://reports.example.com/abc/",
    });
    assert.ok(msg.text.includes("在线查看"));
    assert.ok(msg.text.includes("https://reports.example.com/abc/"));
  });

  it("ui-test-completed: caps failedCases list at 5 and shows overflow note", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      title: `case-${i}`,
      message: `msg-${i}`,
    }));
    const msg = formatMessage("ui-test-completed", {
      passed: 0,
      failed: 8,
      failedCases: many,
    });
    assert.ok(msg.text.includes("case-0"));
    assert.ok(msg.text.includes("case-4"));
    assert.ok(!msg.text.includes("case-5 —"), "should not list the 6th case");
    assert.ok(msg.text.includes("另有 3 条失败"));
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
    assert.ok(msg.text.includes("Kata"), "should have Kata footer");
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
