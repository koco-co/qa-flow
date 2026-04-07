import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { matchEvents, type DetectedEvent } from "../detect-events.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DETECT_TS = resolve(__dirname, "../detect-events.ts");

// ── matchEvents ─────────────────────────────────────────────────────────────

describe("matchEvents", () => {
  it("detects case-generated from xmind files", () => {
    const files = ["workspace/xmind/202604/data-quality.xmind"];
    const events = matchEvents(files);
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "case-generated");
    assert.equal(events[0].data.count, 1);
    assert.ok((events[0].data.file as string).includes("data-quality.xmind"));
  });

  it("detects multiple xmind files as single event with count", () => {
    const files = [
      "workspace/xmind/202604/a.xmind",
      "workspace/xmind/202604/b.xmind",
    ];
    const events = matchEvents(files);
    assert.equal(events.length, 1);
    assert.equal(events[0].data.count, 2);
  });

  it("detects bug-report from reports/bugs html files", () => {
    const files = ["workspace/reports/bugs/20260407/login-error.html"];
    const events = matchEvents(files);
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "bug-report");
    assert.ok((events[0].data.reportFile as string).includes("login-error.html"));
  });

  it("detects conflict-analyzed from reports/conflicts html files", () => {
    const files = ["workspace/reports/conflicts/20260407/merge-conflict.html"];
    const events = matchEvents(files);
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "conflict-analyzed");
    assert.equal(events[0].data.conflictCount, 1);
  });

  it("detects ui-test-completed from reports/playwright files", () => {
    const files = ["workspace/reports/playwright/20260407/index.html"];
    const events = matchEvents(files);
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "ui-test-completed");
  });

  it("detects archive-converted from archive md files", () => {
    const files = ["workspace/archive/202604/data-quality.md"];
    const events = matchEvents(files);
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "archive-converted");
    assert.equal(events[0].data.fileCount, 1);
  });

  it("ignores archive tmp/ files", () => {
    const files = ["workspace/archive/202604/tmp/data-quality.md"];
    const events = matchEvents(files);
    const archiveEvents = events.filter((e) => e.event === "archive-converted");
    assert.equal(archiveEvents.length, 0);
  });

  it("merges xmind + archive into single case-generated event", () => {
    const files = [
      "workspace/xmind/202604/feature.xmind",
      "workspace/archive/202604/feature.md",
    ];
    const events = matchEvents(files);
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "case-generated");
    assert.ok("archiveFile" in events[0].data, "should merge archive info into case-generated");
  });

  it("detects multiple event types from mixed files (xmind+archive merged)", () => {
    const files = [
      "workspace/xmind/202604/feature.xmind",
      "workspace/reports/bugs/20260407/crash.html",
      "workspace/archive/202604/feature.md",
      "README.md", // should be ignored
    ];
    const events = matchEvents(files);
    const types = events.map((e) => e.event);
    assert.ok(types.includes("case-generated"));
    assert.ok(types.includes("bug-report"));
    assert.ok(!types.includes("archive-converted"), "archive should be merged into case-generated");
    assert.equal(events.length, 2);
  });

  it("keeps archive-converted when no xmind files present", () => {
    const files = [
      "workspace/archive/202604/standalone.md",
    ];
    const events = matchEvents(files);
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "archive-converted");
  });

  it("returns empty array when no patterns match", () => {
    const files = [
      "README.md",
      "src/index.ts",
      ".claude/settings.json",
    ];
    const events = matchEvents(files);
    assert.equal(events.length, 0);
  });

  it("returns empty array for empty input", () => {
    const events = matchEvents([]);
    assert.equal(events.length, 0);
  });

  it("ignores non-workspace files", () => {
    const files = [
      "plugins/notify/send.ts",
      ".env",
      "package.json",
    ];
    const events = matchEvents(files);
    assert.equal(events.length, 0);
  });
});

// ── CLI Integration ─────────────────────────────────────────────────────────

describe("CLI --dry-run", () => {
  it("--dry-run exits without error", () => {
    // Should not throw even with no git changes
    const result = execSync(`bun run "${DETECT_TS}" --dry-run`, {
      encoding: "utf8",
      cwd: resolve(__dirname, "../../.."),
      stdio: ["pipe", "pipe", "pipe"],
    });
    // Output may be empty (no changes) or JSON — both are valid
    if (result.trim()) {
      const parsed = JSON.parse(result);
      assert.ok(typeof parsed.detected === "number");
    }
  });
});
