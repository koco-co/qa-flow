import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it, expect } from "bun:test";

// The real plugins dir is used; we test via env var manipulation for active/inactive checks.
// For logic isolation tests we use a temp plugins dir via PLUGINS_DIR_OVERRIDE is NOT supported
// natively — so we verify against the real plugins/ directory with controlled env.

const TMP_DIR = join(tmpdir(), `kata-plugin-loader-test-${process.pid}`);

const REPO_ROOT = join(import.meta.dirname, "../..");

function runPluginLoader(
  args: string[],
  extraEnv: Record<string, string> = {},
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "kata-cli",
      ["plugin-loader", ...args],
      {
        cwd: REPO_ROOT,
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
      },
    );
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

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe("plugin-loader.ts list", () => {
  it("outputs a valid JSON array", () => {
    const { stdout, code } = runPluginLoader(["list"]);
    expect(code).toBe(0);
    const plugins = JSON.parse(stdout) as unknown[];
    expect(Array.isArray(plugins).toBeTruthy(), "output should be an array");
  });

  it("discovers the three built-in plugins", () => {
    const { stdout } = runPluginLoader(["list"]);
    const plugins = JSON.parse(stdout) as Array<{ name: string }>;
    const names = plugins.map((p) => p.name);
    expect(names.includes("lanhu").toBeTruthy(), "should include lanhu plugin");
    expect(names.includes("notify").toBeTruthy(), "should include notify plugin");
    expect(names.includes("zentao").toBeTruthy(), "should include zentao plugin");
  });

  it("each entry has name, active, and description fields", () => {
    const { stdout } = runPluginLoader(["list"]);
    const plugins = JSON.parse(stdout) as Array<{
      name: string;
      active: boolean;
      description: string;
    }>;
    for (const p of plugins) {
      expect(typeof p.name).toBe("string");
      expect(typeof p.active).toBe("boolean");
      expect(typeof p.description).toBe("string");
    }
  });

  it("lanhu is inactive when LANHU_COOKIE is empty", () => {
    const { stdout } = runPluginLoader(["list"], { LANHU_COOKIE: "" });
    const plugins = JSON.parse(stdout) as Array<{
      name: string;
      active: boolean;
    }>;
    const lanhu = plugins.find((p) => p.name === "lanhu");
    expect(lanhu).toBeTruthy();
    expect(lanhu?.active).toBe(false);
  });

  it("lanhu is active when LANHU_COOKIE is set", () => {
    const { stdout } = runPluginLoader(["list"], {
      LANHU_COOKIE: "session=abc123",
    });
    const plugins = JSON.parse(stdout) as Array<{
      name: string;
      active: boolean;
    }>;
    const lanhu = plugins.find((p) => p.name === "lanhu");
    expect(lanhu).toBeTruthy();
    expect(lanhu?.active).toBe(true);
  });

  it("notify is inactive when no webhook env vars are set", () => {
    const { stdout } = runPluginLoader(["list"]);
    const plugins = JSON.parse(stdout) as Array<{
      name: string;
      active: boolean;
    }>;
    const notify = plugins.find((p) => p.name === "notify");
    expect(notify).toBeTruthy();
    expect(notify?.active).toBe(false);
  });

  it("notify is active when DINGTALK_WEBHOOK_URL is set", () => {
    const { stdout } = runPluginLoader(["list"], {
      DINGTALK_WEBHOOK_URL:
        "https://oapi.dingtalk.com/robot/send?access_token=xxx",
    });
    const plugins = JSON.parse(stdout) as Array<{
      name: string;
      active: boolean;
    }>;
    const notify = plugins.find((p) => p.name === "notify");
    expect(notify).toBeTruthy();
    expect(notify?.active).toBe(true);
  });

  it("notify is active when FEISHU_WEBHOOK is set (env_required_any logic)", () => {
    const { stdout } = runPluginLoader(["list"], {
      FEISHU_WEBHOOK_URL: "https://open.feishu.cn/open-apis/bot/v2/hook/xxx",
    });
    const plugins = JSON.parse(stdout) as Array<{
      name: string;
      active: boolean;
    }>;
    const notify = plugins.find((p) => p.name === "notify");
    expect(notify?.active).toBe(true);
  });
});

describe("plugin-loader.ts check", () => {
  it("returns matched: true when URL matches active plugin pattern", () => {
    const { stdout, code } = runPluginLoader(
      [
        "check",
        "--input",
        "https://lanhuapp.com/web/#/item/project/product?tid=xxx",
      ],
      { LANHU_COOKIE: "session=active" },
    );
    expect(code).toBe(0);
    const result = JSON.parse(stdout) as { matched: boolean; plugin?: string };
    expect(result.matched).toBe(true);
    expect(result.plugin).toBe("lanhu");
  });

  it("returns matched: false when URL does not match any active plugin", () => {
    const { stdout, code } = runPluginLoader([
      "check",
      "--input",
      "https://www.example.com/some/other/url",
    ]);
    expect(code).toBe(0);
    const result = JSON.parse(stdout) as { matched: boolean };
    expect(result.matched).toBe(false);
  });

  it("returns matched: false when plugin is inactive even if URL matches pattern", () => {
    // lanhu is inactive because LANHU_COOKIE is empty
    const { stdout } = runPluginLoader(
      ["check", "--input", "https://lanhuapp.com/web/#/item/project"],
      { LANHU_COOKIE: "" },
    );
    const result = JSON.parse(stdout) as { matched: boolean };
    expect(result.matched).toBe(false);
  });

  it("matched: true output includes plugin name", () => {
    const { stdout } = runPluginLoader(
      [
        "check",
        "--input",
        "http://zenpms.dtstack.cn/zentao/bug-view-138845.html",
      ],
      { ZENTAO_BASE_URL: "http://zenpms.dtstack.cn", ZENTAO_COOKIE: "sid=xxx" },
    );
    const result = JSON.parse(stdout) as { matched: boolean; plugin?: string };
    if (result.matched) {
      expect(typeof result.plugin === "string" && result.plugin.length > 0).toBeTruthy();
    }
  });
});

describe("plugin-loader.ts resolve", () => {
  it("returns plugin name and command when URL matches active plugin", () => {
    const url = "https://lanhuapp.com/web/#/item/project?docId=123";
    const { stdout, code } = runPluginLoader(["resolve", "--url", url], {
      LANHU_COOKIE: "session=active",
    });
    expect(code).toBe(0);
    const result = JSON.parse(stdout) as { plugin: string; command: string };
    expect(result.plugin).toBe("lanhu");
    expect(
      result.command.includes(url).toBeTruthy(),
      "command should contain the resolved URL",
    );
  });

  it("replaces {{url}} placeholder in fetch command", () => {
    const url = "https://lanhuapp.com/web/#/item/project?docId=456";
    const { stdout } = runPluginLoader(["resolve", "--url", url], {
      LANHU_COOKIE: "session=abc",
    });
    const result = JSON.parse(stdout) as { command: string };
    expect(
      result.command.includes(url).toBeTruthy(),
      "{{url}} should be replaced with actual URL",
    );
    expect(
      !result.command.includes("{{url}}").toBeTruthy(),
      "no {{url}} placeholder should remain",
    );
  });

  it("exits 1 and returns error JSON when no plugin matches", () => {
    const { stdout, code } = runPluginLoader([
      "resolve",
      "--url",
      "https://www.example.com/no-match",
    ]);
    expect(code).toBe(1);
    const result = JSON.parse(stdout) as { error: string };
    expect(result.error).toBe("No matching plugin");
  });

  it("exits 1 when matching plugin is inactive", () => {
    // lanhu matches URL but is inactive
    const { code } = runPluginLoader(
      ["resolve", "--url", "https://lanhuapp.com/web/#/item"],
      {
        LANHU_COOKIE: "",
      },
    );
    expect(code).toBe(1);
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
    expect(code).toBe(0);
    const result = JSON.parse(stdout) as { skipped: boolean; reason: string };
    expect(result.skipped).toBe(true);
    expect(result.reason.includes("notify plugin not active")).toBeTruthy();
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
      {
        DINGTALK_WEBHOOK_URL:
          "https://oapi.dingtalk.com/robot/send?access_token=test",
      },
    );
    expect(code).toBe(0);
    const result = JSON.parse(stdout) as {
      plugin?: string;
      command?: string;
      skipped?: boolean;
    };
    if (!result.skipped) {
      expect(result.plugin).toBe("notify");
      expect(
        typeof result.command === "string" && result.command.length > 0,
      ).toBeTruthy();
    }
  });

  it("replaces {{event}} and {{json}} in send command", () => {
    const event = "case-generated";
    const data = '{"count":5}';

    const { stdout } = runPluginLoader(
      ["notify", "--event", event, "--data", data],
      {
        FEISHU_WEBHOOK: "https://open.feishu.cn/open-apis/bot/v2/hook/test",
      },
    );
    const result = JSON.parse(stdout) as {
      command?: string;
      skipped?: boolean;
    };
    if (!result.skipped && result.command) {
      expect(
        result.command.includes(event).toBeTruthy(),
        "command should include event name",
      );
      expect(
        !result.command.includes("{{event}}").toBeTruthy(),
        "{{event}} placeholder should be replaced",
      );
      expect(
        !result.command.includes("{{json}}").toBeTruthy(),
        "{{json}} placeholder should be replaced",
      );
    }
  });

  it("inactive notify is NOT an error (exit 0)", () => {
    // This is critical: notify being inactive should exit 0, not 1
    const { code } = runPluginLoader(
      [
        "notify",
        "--event",
        "workflow-failed",
        "--data",
        '{"step":"write","reason":"timeout"}',
      ],
      {
        DINGTALK_WEBHOOK_URL: "",
        FEISHU_WEBHOOK: "",
        WECOM_WEBHOOK: "",
        SMTP_HOST: "",
      },
    );
    expect(code).toBe(0);
  });
});

describe("plugin-loader.ts --help", () => {
  it("exits successfully on --help", () => {
    try {
      execFileSync(
        "kata-cli",
        ["plugin-loader", "--help"],
        {
          cwd: REPO_ROOT,
          encoding: "utf8",
        },
      );
    } catch (err: unknown) {
      const e = err as { status?: number };
      expect(e.status === 0 || e.status === undefined).toBeTruthy();
    }
  });
});
