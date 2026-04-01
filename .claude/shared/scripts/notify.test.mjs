/**
 * notify.test.mjs
 * Unit tests for NOTF-01 through NOTF-05: unified notification module.
 * Run: node --test .claude/shared/scripts/notify.test.mjs
 *
 * TDD RED phase — tests will fail until notify.mjs is created.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  dispatch,
  getEnabledChannels,
  buildMessage,
  sendDingTalk,
  sendFeishu,
  sendWeCom,
  sendEmail,
  loadDotEnv,
  httpsPost,
  mdToHtml,
} from "./notify.mjs";

// ─────────────────────────────────────────────
// Env cleanup helper
// ─────────────────────────────────────────────
const ENV_KEYS = [
  "DINGTALK_WEBHOOK_URL", "DINGTALK_KEYWORD",
  "FEISHU_WEBHOOK_URL",
  "WECOM_WEBHOOK_URL",
  "SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "SMTP_TO",
];
let savedEnv = {};
function saveEnv() {
  ENV_KEYS.forEach(k => { savedEnv[k] = process.env[k]; delete process.env[k]; });
}
function restoreEnv() {
  ENV_KEYS.forEach(k => {
    if (savedEnv[k] !== undefined) process.env[k] = savedEnv[k];
    else delete process.env[k];
  });
}

// ─────────────────────────────────────────────
// getEnabledChannels
// ─────────────────────────────────────────────
describe("getEnabledChannels", () => {
  beforeEach(saveEnv);
  afterEach(restoreEnv);

  it("returns [] when no env vars set", () => {
    assert.deepEqual(getEnabledChannels(), []);
  });

  it("returns ['dingtalk'] when only DINGTALK_WEBHOOK_URL is set", () => {
    process.env.DINGTALK_WEBHOOK_URL = "https://example.com/hook";
    assert.deepEqual(getEnabledChannels(), ["dingtalk"]);
  });

  it("returns [] when only SMTP_HOST is set (SMTP_USER also required)", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    assert.deepEqual(getEnabledChannels(), []);
  });

  it("returns ['email'] when both SMTP_HOST and SMTP_USER are set", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "user@example.com";
    assert.deepEqual(getEnabledChannels(), ["email"]);
  });

  it("returns all 4 channels when all configured", () => {
    process.env.DINGTALK_WEBHOOK_URL = "https://dingtalk.example.com";
    process.env.FEISHU_WEBHOOK_URL = "https://feishu.example.com";
    process.env.WECOM_WEBHOOK_URL = "https://wecom.example.com";
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "user@example.com";
    const channels = getEnabledChannels();
    assert.equal(channels.length, 4);
    assert.ok(channels.includes("dingtalk"));
    assert.ok(channels.includes("feishu"));
    assert.ok(channels.includes("wecom"));
    assert.ok(channels.includes("email"));
  });
});

// ─────────────────────────────────────────────
// buildMessage
// ─────────────────────────────────────────────
describe("buildMessage", () => {
  it("returns object with title, markdown, html keys", () => {
    const result = buildMessage("case-generated", { count: 42, file: "x.xmind" });
    assert.ok("title" in result);
    assert.ok("markdown" in result);
    assert.ok("html" in result);
  });

  it("title starts with '[' (project prefix)", () => {
    const result = buildMessage("case-generated", { count: 42, file: "x.xmind" });
    assert.ok(result.title.startsWith("["), `title should start with '[', got: ${result.title}`);
  });

  it("markdown contains count and file data", () => {
    const result = buildMessage("case-generated", { count: 42, file: "test.xmind" });
    assert.ok(result.markdown.includes("42"), "markdown should contain count");
    assert.ok(result.markdown.includes("test.xmind"), "markdown should contain file");
  });

  it("workflow-failed event fills step and reason", () => {
    const result = buildMessage("workflow-failed", { step: "writer", reason: "PRD error" });
    assert.ok(result.markdown.includes("writer"));
    assert.ok(result.markdown.includes("PRD error"));
  });

  it("unknown event type does not throw", () => {
    assert.doesNotThrow(() => buildMessage("custom-event", { foo: "bar" }));
  });
});

// ─────────────────────────────────────────────
// mdToHtml
// ─────────────────────────────────────────────
describe("mdToHtml", () => {
  it("converts ## heading to <h2>", () => {
    const html = mdToHtml("## Heading");
    assert.ok(html.includes("<h2>"), `expected <h2>, got: ${html}`);
    assert.ok(html.includes("Heading"));
  });

  it("converts **bold** to <strong>", () => {
    const html = mdToHtml("**bold text**");
    assert.ok(html.includes("<strong>"), `expected <strong>, got: ${html}`);
    assert.ok(html.includes("bold text"));
  });

  it("converts - items to <li>", () => {
    const html = mdToHtml("- item1\n- item2");
    const liCount = (html.match(/<li>/g) || []).length;
    assert.ok(liCount >= 2, `expected at least 2 <li>, got: ${liCount}`);
  });
});

// ─────────────────────────────────────────────
// sendDingTalk (dry-run)
// ─────────────────────────────────────────────
describe("sendDingTalk", () => {
  beforeEach(saveEnv);
  afterEach(restoreEnv);

  it("appends DINGTALK_KEYWORD to title when missing", async () => {
    process.env.DINGTALK_KEYWORD = "qa-flow";
    process.env.DINGTALK_WEBHOOK_URL = "https://example.com/hook";
    let captured = "";
    const orig = console.log;
    console.log = (...args) => { captured += args.join(" ") + "\n"; };
    try {
      await sendDingTalk("用例生成完成", "body text", true);
    } finally {
      console.log = orig;
    }
    assert.ok(captured.includes("dingtalk"), "output should mention 'dingtalk'");
    assert.ok(captured.includes("用例生成完成 qa-flow"), "keyword should be appended");
  });

  it("does NOT double-append keyword when title already contains it", async () => {
    process.env.DINGTALK_KEYWORD = "qa-flow";
    process.env.DINGTALK_WEBHOOK_URL = "https://example.com/hook";
    let captured = "";
    const orig = console.log;
    console.log = (...args) => { captured += args.join(" ") + "\n"; };
    try {
      await sendDingTalk("完成 qa-flow", "body", true);
    } finally {
      console.log = orig;
    }
    // Should not have "qa-flow qa-flow"
    assert.ok(!captured.includes("qa-flow qa-flow"), "keyword should not be duplicated");
  });

  it("title unchanged when no DINGTALK_KEYWORD set", async () => {
    process.env.DINGTALK_WEBHOOK_URL = "https://example.com/hook";
    let captured = "";
    const orig = console.log;
    console.log = (...args) => { captured += args.join(" ") + "\n"; };
    try {
      await sendDingTalk("plain title", "body", true);
    } finally {
      console.log = orig;
    }
    const parsed = JSON.parse(captured);
    assert.equal(parsed.body.markdown.title, "plain title");
  });
});

// ─────────────────────────────────────────────
// dispatch (dry-run)
// ─────────────────────────────────────────────
describe("dispatch", () => {
  beforeEach(saveEnv);
  afterEach(restoreEnv);

  it("returns [] when no channels configured", async () => {
    const results = await dispatch("case-generated", {}, { dryRun: true });
    assert.deepEqual(results, []);
  });

  it("returns array of length 1 with dingtalk only", async () => {
    process.env.DINGTALK_WEBHOOK_URL = "https://example.com/hook";
    const results = await dispatch("case-generated", { count: 1, file: "x" }, { dryRun: true });
    assert.equal(results.length, 1);
    assert.ok(results[0].status === "fulfilled" || results[0].status === "rejected");
  });

  it("returns array of length 2 for dingtalk + feishu", async () => {
    process.env.DINGTALK_WEBHOOK_URL = "https://example.com/dt";
    process.env.FEISHU_WEBHOOK_URL = "https://example.com/fs";
    const results = await dispatch("bug-report", { reportFile: "r.html" }, { dryRun: true });
    assert.equal(results.length, 2);
  });
});
