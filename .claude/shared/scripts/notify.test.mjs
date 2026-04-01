/**
 * notify.test.mjs
 * Unit tests for NOTF-01 through NOTF-05: unified notification module.
 * Run: node --test .claude/shared/scripts/notify.test.mjs
 */
import { describe, it, before, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
// Env cleanup helpers
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

/** Capture console.log output during an async operation */
async function captureLog(fn) {
  let captured = "";
  const orig = console.log;
  console.log = (...args) => { captured += args.join(" ") + "\n"; };
  try {
    await fn();
  } finally {
    console.log = orig;
  }
  return captured;
}

/** Write a temp .env file and return its path */
function writeTempEnv(content) {
  const dir = join(tmpdir(), "qa-notify-tests-" + Date.now());
  mkdirSync(dir, { recursive: true });
  const path = join(dir, ".env");
  writeFileSync(path, content, "utf8");
  return path;
}

// ─────────────────────────────────────────────
// 1. loadDotEnv
// ─────────────────────────────────────────────
describe("loadDotEnv", () => {
  afterEach(() => {
    // Clean up test env keys
    delete process.env.TEST_KEY_1;
    delete process.env.TEST_KEY_2;
    delete process.env.TEST_KEY_3;
    delete process.env.TEST_KEY_EMPTY;
  });

  it("parses KEY=VALUE and sets env vars", () => {
    const path = writeTempEnv("TEST_KEY_1=value1\n# comment\nTEST_KEY_2=hello\n");
    loadDotEnv(path);
    assert.equal(process.env.TEST_KEY_1, "value1");
    assert.equal(process.env.TEST_KEY_2, "hello");
  });

  it("strips surrounding quotes from values", () => {
    const path = writeTempEnv('TEST_KEY_2="quoted value"\n');
    loadDotEnv(path);
    assert.equal(process.env.TEST_KEY_2, "quoted value");
  });

  it("does NOT overwrite already-set env vars", () => {
    process.env.TEST_KEY_3 = "original";
    const path = writeTempEnv("TEST_KEY_3=overwritten\n");
    loadDotEnv(path);
    assert.equal(process.env.TEST_KEY_3, "original");
  });

  it("does not throw on nonexistent path", () => {
    assert.doesNotThrow(() => loadDotEnv("/nonexistent/path/.env"));
  });
});

// ─────────────────────────────────────────────
// 2. getEnabledChannels
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
// 3. buildMessage
// ─────────────────────────────────────────────
describe("buildMessage", () => {
  it("returns object with title, markdown, html keys", () => {
    const result = buildMessage("case-generated", { count: 42, file: "x.xmind" });
    assert.ok("title" in result);
    assert.ok("markdown" in result);
    assert.ok("html" in result);
  });

  it("title starts with '[' (project prefix) and contains event label", () => {
    const result = buildMessage("case-generated", { count: 42, file: "x.xmind" });
    assert.ok(result.title.startsWith("["), `title should start with '[', got: ${result.title}`);
    assert.ok(result.title.includes("用例生成完成"), `title should include event label`);
  });

  it("markdown contains count and file data for case-generated", () => {
    const result = buildMessage("case-generated", { count: 42, file: "test.xmind" });
    assert.ok(result.markdown.includes("42"), "markdown should contain count");
    assert.ok(result.markdown.includes("test.xmind"), "markdown should contain file");
  });

  it("workflow-failed event fills step and reason in markdown", () => {
    const result = buildMessage("workflow-failed", { step: "writer", reason: "PRD error" });
    assert.ok(result.markdown.includes("writer"));
    assert.ok(result.markdown.includes("PRD error"));
  });

  it("unknown event type does not throw, markdown contains data", () => {
    const result = buildMessage("custom-event", { foo: "bar" });
    assert.ok(result.markdown.includes("bar"), "unknown event data should appear in markdown");
  });
});

// ─────────────────────────────────────────────
// 4. mdToHtml
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

  it("converts - items to <li> at least twice", () => {
    const html = mdToHtml("- item1\n- item2");
    const liCount = (html.match(/<li>/g) || []).length;
    assert.ok(liCount >= 2, `expected at least 2 <li>, got: ${liCount}`);
  });
});

// ─────────────────────────────────────────────
// 5. sendDingTalk (dry-run)
// ─────────────────────────────────────────────
describe("sendDingTalk", () => {
  beforeEach(saveEnv);
  afterEach(restoreEnv);

  it("appends DINGTALK_KEYWORD to title when missing", async () => {
    process.env.DINGTALK_KEYWORD = "qa-flow";
    process.env.DINGTALK_WEBHOOK_URL = "https://example.com/hook";
    const captured = await captureLog(() => sendDingTalk("用例生成完成", "body text", true));
    assert.ok(captured.includes("dingtalk"), "output should mention 'dingtalk'");
    assert.ok(captured.includes("用例生成完成 qa-flow"), "keyword should be appended");
  });

  it("does NOT double-append keyword when title already contains it", async () => {
    process.env.DINGTALK_KEYWORD = "qa-flow";
    process.env.DINGTALK_WEBHOOK_URL = "https://example.com/hook";
    const captured = await captureLog(() => sendDingTalk("完成 qa-flow", "body", true));
    assert.ok(!captured.includes("qa-flow qa-flow"), "keyword should not be duplicated");
  });

  it("title unchanged when no DINGTALK_KEYWORD set", async () => {
    process.env.DINGTALK_WEBHOOK_URL = "https://example.com/hook";
    const captured = await captureLog(() => sendDingTalk("plain title", "body", true));
    const parsed = JSON.parse(captured);
    assert.equal(parsed.body.markdown.title, "plain title");
  });
});

// ─────────────────────────────────────────────
// 6. sendFeishu (dry-run)
// ─────────────────────────────────────────────
describe("sendFeishu", () => {
  beforeEach(saveEnv);
  afterEach(restoreEnv);

  it("dry-run output contains channel=feishu, msg_type=post", async () => {
    process.env.FEISHU_WEBHOOK_URL = "https://feishu.example.com/hook";
    const captured = await captureLog(() => sendFeishu("title", "body text", true));
    assert.ok(captured.includes("feishu"), "output should contain 'feishu'");
    assert.ok(captured.includes("msg_type"), "output should contain 'msg_type'");
    assert.ok(captured.includes("post"), "msg_type should be 'post'");
  });

  it("dry-run output contains zh_cn locale key", async () => {
    process.env.FEISHU_WEBHOOK_URL = "https://feishu.example.com/hook";
    const captured = await captureLog(() => sendFeishu("title", "body text", true));
    assert.ok(captured.includes("zh_cn"), "output should contain zh_cn locale");
  });
});

// ─────────────────────────────────────────────
// 7. sendWeCom (dry-run)
// ─────────────────────────────────────────────
describe("sendWeCom", () => {
  beforeEach(saveEnv);
  afterEach(restoreEnv);

  it("dry-run output contains channel=wecom, msgtype=markdown", async () => {
    process.env.WECOM_WEBHOOK_URL = "https://wecom.example.com/hook";
    const captured = await captureLog(() => sendWeCom("markdown body", true));
    assert.ok(captured.includes("wecom"), "output should contain 'wecom'");
    assert.ok(captured.includes("markdown"), "output should contain 'markdown'");
    assert.ok(captured.includes("msgtype"), "output should contain 'msgtype'");
  });

  it("dry-run output contains the markdown body text", async () => {
    process.env.WECOM_WEBHOOK_URL = "https://wecom.example.com/hook";
    const captured = await captureLog(() => sendWeCom("unique-markdown-body-text", true));
    assert.ok(captured.includes("unique-markdown-body-text"), "output should include the markdown body");
  });
});

// ─────────────────────────────────────────────
// 8. sendEmail (dry-run)
// ─────────────────────────────────────────────
describe("sendEmail", () => {
  beforeEach(saveEnv);
  afterEach(restoreEnv);

  it("dry-run output contains channel=email, subject and html", async () => {
    process.env.SMTP_HOST = "smtp.test.com";
    process.env.SMTP_USER = "test@test.com";
    process.env.SMTP_PORT = "587";
    const captured = await captureLog(() => sendEmail("test subject", "<h1>html body</h1>", true));
    assert.ok(captured.includes("email"), "output should contain 'email'");
    assert.ok(captured.includes("test subject"), "output should contain subject");
    assert.ok(captured.includes("html"), "output should contain html reference");
  });

  it("dry-run output contains the configured SMTP host", async () => {
    process.env.SMTP_HOST = "smtp.mycompany.com";
    process.env.SMTP_USER = "user@company.com";
    const captured = await captureLog(() => sendEmail("subj", "<p>body</p>", true));
    assert.ok(captured.includes("smtp.mycompany.com"), "output should contain SMTP host");
  });
});

// ─────────────────────────────────────────────
// 9. dispatch (dry-run)
// ─────────────────────────────────────────────
describe("dispatch", () => {
  beforeEach(saveEnv);
  afterEach(restoreEnv);

  it("returns [] when no channels configured", async () => {
    const results = await dispatch("case-generated", {}, { dryRun: true });
    assert.deepEqual(results, []);
  });

  it("returns array of length 1 with status property for dingtalk only", async () => {
    process.env.DINGTALK_WEBHOOK_URL = "https://example.com/hook";
    const results = await dispatch("case-generated", { count: 1, file: "x" }, { dryRun: true });
    assert.equal(results.length, 1);
    assert.ok("status" in results[0], "each result should have status property");
  });

  it("returns array of length 2 for dingtalk + feishu", async () => {
    process.env.DINGTALK_WEBHOOK_URL = "https://example.com/dt";
    process.env.FEISHU_WEBHOOK_URL = "https://example.com/fs";
    const results = await dispatch("bug-report", { reportFile: "r.html" }, { dryRun: true });
    assert.equal(results.length, 2);
  });
});
