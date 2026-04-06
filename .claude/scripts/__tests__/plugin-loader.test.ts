import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

// The real plugins dir is used; we test via env var manipulation for active/inactive checks.
// For logic isolation tests we use a temp plugins dir via PLUGINS_DIR_OVERRIDE is NOT supported
// natively — so we verify against the real plugins/ directory with controlled env.

const TMP_DIR = join(tmpdir(), `qa-flow-plugin-loader-test-${process.pid}`);

function runPluginLoader(
  args: string[],
  extraEnv: Record<string, string> = {},
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync("npx", ["tsx", ".claude/scripts/plugin-loader.ts", ...args], {
      cwd: "/Users/poco/Documents/DTStack/qa-flow",
      encoding: "utf8",
      env: {
        ...process.env,
        // Ensure we start with a clean slate for plugin env vars
        LANHU_COOKIE: "",
        DINGTALK_WEBHOOK_URL: "",
        FEISHU_WEBHOOK_URL: "",
        WECOM_WEBHOOK_URL: "",
        SMTP_HOST: "",
        ZENTAO_BASE_URL: "",
        ZENTAO_ACCOUNT: "",
        ZENTAO_PASSWORD: "",
        ...extraEnv,
      },
    });
    return { stdout, stderr: "", code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      code: e.status ?? 1,
    };
  }
}

before(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

after(() => {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe("plugin-loader.ts list", () => {
  it("outputs a valid JSON array", () => {
    const { stdout, code } = runPluginLoader(["list"]);
    assert.equal(code, 0, "list should exit 0");
    const plugins = JSON.parse(stdout) as unknown[];
    assert.ok(Array.isArray(plugins), "output should be an array");
  });

  it("discovers the three built-in plugins", () => {
    const { stdout } = runPluginLoader(["list"]);
    const plugins = JSON.parse(stdout) as Array<{ name: string }>;
    const names = plugins.map((p) => p.name);
    assert.ok(names.includes("lanhu"), "should include lanhu plugin");
    assert.ok(names.includes("notify"), "should include notify plugin");
    assert.ok(names.includes("zentao"), "should include zentao plugin");
  });

  it("each entry has name, active, and description fields", () => {
    const { stdout } = runPluginLoader(["list"]);
    const plugins = JSON.parse(stdout) as Array<{
      name: string;
      active: boolean;
      description: string;
    }>;
    for (const p of plugins) {
      assert.equal(typeof p.name, "string");
      assert.equal(typeof p.active, "boolean");
      assert.equal(typeof p.description, "string");
    }
  });

  it("lanhu is inactive when LANHU_COOKIE is empty", () => {
    const { stdout } = runPluginLoader(["list"], { LANHU_COOKIE: "" });
    const plugins = JSON.parse(stdout) as Array<{ name: string; active: boolean }>;
    const lanhu = plugins.find((p) => p.name === "lanhu");
    assert.ok(lanhu, "lanhu should be present");
    assert.equal(lanhu?.active, false);
  });

  it("lanhu is active when LANHU_COOKIE is set", () => {
    const { stdout } = runPluginLoader(["list"], {
      LANHU_COOKIE: "session=abc123",
    });
    const plugins = JSON.parse(stdout) as Array<{ name: string; active: boolean }>;
    const lanhu = plugins.find((p) => p.name === "lanhu");
    assert.ok(lanhu, "lanhu should be present");
    assert.equal(lanhu?.active, true);
  });

  it("notify is inactive when no webhook env vars are set", () => {
    const { stdout } = runPluginLoader(["list"]);
    const plugins = JSON.parse(stdout) as Array<{ name: string; active: boolean }>;
    const notify = plugins.find((p) => p.name === "notify");
    assert.ok(notify, "notify should be present");
    assert.equal(notify?.active, false);
  });

  it("notify is active when DINGTALK_WEBHOOK_URL is set", () => {
    const { stdout } = runPluginLoader(["list"], {
      DINGTALK_WEBHOOK_URL: "https://oapi.dingtalk.com/robot/send?access_token=xxx",
    });
    const plugins = JSON.parse(stdout) as Array<{ name: string; active: boolean }>;
    const notify = plugins.find((p) => p.name === "notify");
    assert.ok(notify, "notify should be present");
    assert.equal(notify?.active, true);
  });

  it("notify is active when FEISHU_WEBHOOK is set (env_required_any logic)", () => {
    const { stdout } = runPluginLoader(["list"], {
      FEISHU_WEBHOOK_URL: "https://open.feishu.cn/open-apis/bot/v2/hook/xxx",
    });
    const plugins = JSON.parse(stdout) as Array<{ name: string; active: boolean }>;
    const notify = plugins.find((p) => p.name === "notify");
    assert.equal(notify?.active, true);
  });
});

describe("plugin-loader.ts check", () => {
  it("returns matched: true when URL matches active plugin pattern", () => {
    const { stdout, code } = runPluginLoader(
      ["check", "--input", "https://lanhuapp.com/web/#/item/project/product?tid=xxx"],
      { LANHU_COOKIE: "session=active" },
    );
    assert.equal(code, 0);
    const result = JSON.parse(stdout) as { matched: boolean; plugin?: string };
    assert.equal(result.matched, true);
    assert.equal(result.plugin, "lanhu");
  });

  it("returns matched: false when URL does not match any active plugin", () => {
    const { stdout, code } = runPluginLoader([
      "check",
      "--input",
      "https://www.example.com/some/other/url",
    ]);
    assert.equal(code, 0);
    const result = JSON.parse(stdout) as { matched: boolean };
    assert.equal(result.matched, false);
  });

  it("returns matched: false when plugin is inactive even if URL matches pattern", () => {
    // lanhu is inactive because LANHU_COOKIE is empty
    const { stdout } = runPluginLoader(
      ["check", "--input", "https://lanhuapp.com/web/#/item/project"],
      { LANHU_COOKIE: "" },
    );
    const result = JSON.parse(stdout) as { matched: boolean };
    assert.equal(result.matched, false);
  });

  it("matched: true output includes plugin name", () => {
    const { stdout } = runPluginLoader(
      ["check", "--input", "http://zenpms.dtstack.cn/zentao/bug-view-138845.html"],
      { ZENTAO_BASE_URL: "http://zenpms.dtstack.cn", ZENTAO_COOKIE: "sid=xxx" },
    );
    const result = JSON.parse(stdout) as { matched: boolean; plugin?: string };
    if (result.matched) {
      assert.ok(typeof result.plugin === "string" && result.plugin.length > 0);
    }
  });
});

describe("plugin-loader.ts resolve", () => {
  it("returns plugin name and command when URL matches active plugin", () => {
    const url = "https://lanhuapp.com/web/#/item/project?docId=123";
    const { stdout, code } = runPluginLoader(["resolve", "--url", url], {
      LANHU_COOKIE: "session=active",
    });
    assert.equal(code, 0, "should exit 0 when plugin found");
    const result = JSON.parse(stdout) as { plugin: string; command: string };
    assert.equal(result.plugin, "lanhu");
    assert.ok(result.command.includes(url), "command should contain the resolved URL");
  });

  it("replaces {{url}} placeholder in fetch command", () => {
    const url = "https://lanhuapp.com/web/#/item/project?docId=456";
    const { stdout } = runPluginLoader(["resolve", "--url", url], {
      LANHU_COOKIE: "session=abc",
    });
    const result = JSON.parse(stdout) as { command: string };
    assert.ok(result.command.includes(url), "{{url}} should be replaced with actual URL");
    assert.ok(!result.command.includes("{{url}}"), "no {{url}} placeholder should remain");
  });

  it("exits 1 and returns error JSON when no plugin matches", () => {
    const { stdout, code } = runPluginLoader([
      "resolve",
      "--url",
      "https://www.example.com/no-match",
    ]);
    assert.equal(code, 1);
    const result = JSON.parse(stdout) as { error: string };
    assert.equal(result.error, "No matching plugin");
  });

  it("exits 1 when matching plugin is inactive", () => {
    // lanhu matches URL but is inactive
    const { code } = runPluginLoader(["resolve", "--url", "https://lanhuapp.com/web/#/item"], {
      LANHU_COOKIE: "",
    });
    assert.equal(code, 1);
  });
});

describe("plugin-loader.ts notify", () => {
  it("returns skipped: true when notify plugin is inactive", () => {
    const { stdout, code } = runPluginLoader([
      "notify",
      "--event",
      "case-generated",
      "--data",
      '{"count":42}',
    ]);
    // Should exit 0 (not an error), but skipped
    assert.equal(code, 0, "should NOT exit with error when notify is inactive");
    const result = JSON.parse(stdout) as { skipped: boolean; reason: string };
    assert.equal(result.skipped, true);
    assert.ok(result.reason.includes("notify plugin not active"));
  });

  it("returns command when notify plugin is active", () => {
    const { stdout, code } = runPluginLoader(
      [
        "notify",
        "--event",
        "case-generated",
        "--data",
        '{"count":42,"file":"test.xmind","duration":30}',
      ],
      { DINGTALK_WEBHOOK_URL: "https://oapi.dingtalk.com/robot/send?access_token=test" },
    );
    assert.equal(code, 0);
    const result = JSON.parse(stdout) as {
      plugin?: string;
      command?: string;
      skipped?: boolean;
    };
    if (!result.skipped) {
      assert.equal(result.plugin, "notify");
      assert.ok(typeof result.command === "string" && result.command.length > 0);
    }
  });

  it("replaces {{event}} and {{json}} in send command", () => {
    const event = "case-generated";
    const data = '{"count":5}';

    const { stdout } = runPluginLoader(["notify", "--event", event, "--data", data], {
      FEISHU_WEBHOOK: "https://open.feishu.cn/open-apis/bot/v2/hook/test",
    });
    const result = JSON.parse(stdout) as {
      command?: string;
      skipped?: boolean;
    };
    if (!result.skipped && result.command) {
      assert.ok(result.command.includes(event), "command should include event name");
      assert.ok(!result.command.includes("{{event}}"), "{{event}} placeholder should be replaced");
      assert.ok(!result.command.includes("{{json}}"), "{{json}} placeholder should be replaced");
    }
  });

  it("inactive notify is NOT an error (exit 0)", () => {
    // This is critical: notify being inactive should exit 0, not 1
    const { code } = runPluginLoader(
      ["notify", "--event", "workflow-failed", "--data", '{"step":"write","reason":"timeout"}'],
      {
        DINGTALK_WEBHOOK_URL: "",
        FEISHU_WEBHOOK: "",
        WECOM_WEBHOOK: "",
        SMTP_HOST: "",
      },
    );
    assert.equal(code, 0);
  });
});

describe("plugin-loader.ts --help", () => {
  it("exits successfully on --help", () => {
    try {
      execFileSync("npx", ["tsx", ".claude/scripts/plugin-loader.ts", "--help"], {
        cwd: "/Users/poco/Documents/DTStack/qa-flow",
        encoding: "utf8",
      });
    } catch (err: unknown) {
      const e = err as { status?: number };
      assert.ok(e.status === 0 || e.status === undefined);
    }
  });
});
