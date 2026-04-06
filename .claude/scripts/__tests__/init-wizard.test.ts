import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { describe, it } from "node:test";

const ROOT = "/Users/poco/Documents/DTStack/qa-flow";
const SCRIPT = ".claude/skills/setup/scripts/init-wizard.ts";

function run(
  args: string[],
  extraEnv: Record<string, string> = {},
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync("npx", ["tsx", SCRIPT, ...args], {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, ...extraEnv },
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

// ---------------------------------------------------------------------------
// scan
// ---------------------------------------------------------------------------

describe("init-wizard scan", () => {
  it("exits 0 and outputs valid JSON", () => {
    const { stdout, code } = run(["scan"]);
    assert.equal(code, 0, `expected exit 0, got stderr: ${run(["scan"]).stderr}`);
    const result = JSON.parse(stdout) as unknown;
    assert.ok(typeof result === "object" && result !== null, "output should be a JSON object");
  });

  it("output has all required top-level fields", () => {
    const { stdout } = run(["scan"]);
    const result = JSON.parse(stdout) as Record<string, unknown>;

    assert.ok("node_version" in result, "missing node_version");
    assert.ok("node_ok" in result, "missing node_ok");
    assert.ok("deps_installed" in result, "missing deps_installed");
    assert.ok("workspace_exists" in result, "missing workspace_exists");
    assert.ok("env_configured" in result, "missing env_configured");
    assert.ok("plugins" in result, "missing plugins");
    assert.ok("repos" in result, "missing repos");
    assert.ok("issues" in result, "missing issues");
  });

  it("node_version is a string starting with v", () => {
    const { stdout } = run(["scan"]);
    const result = JSON.parse(stdout) as { node_version: string };
    assert.equal(typeof result.node_version, "string");
    assert.ok(result.node_version.startsWith("v"), "node_version should start with v");
  });

  it("node_ok is a boolean", () => {
    const { stdout } = run(["scan"]);
    const result = JSON.parse(stdout) as { node_ok: boolean };
    assert.equal(typeof result.node_ok, "boolean");
  });

  it("plugins is an array", () => {
    const { stdout } = run(["scan"]);
    const result = JSON.parse(stdout) as { plugins: unknown[] };
    assert.ok(Array.isArray(result.plugins), "plugins should be an array");
  });

  it("each plugin entry has name and active fields", () => {
    const { stdout } = run(["scan"]);
    const result = JSON.parse(stdout) as {
      plugins: Array<{ name: string; active: boolean }>;
    };
    for (const p of result.plugins) {
      assert.equal(typeof p.name, "string", "plugin.name should be a string");
      assert.equal(typeof p.active, "boolean", "plugin.active should be a boolean");
    }
  });

  it("repos is an array", () => {
    const { stdout } = run(["scan"]);
    const result = JSON.parse(stdout) as { repos: unknown[] };
    assert.ok(Array.isArray(result.repos), "repos should be an array");
  });

  it("each repo entry has group, repo, path fields", () => {
    const { stdout } = run(["scan"]);
    const result = JSON.parse(stdout) as {
      repos: Array<{ group: string; repo: string; path: string }>;
    };
    for (const r of result.repos) {
      assert.equal(typeof r.group, "string", "repo.group should be a string");
      assert.equal(typeof r.repo, "string", "repo.repo should be a string");
      assert.equal(typeof r.path, "string", "repo.path should be a string");
    }
  });

  it("issues is an array", () => {
    const { stdout } = run(["scan"]);
    const result = JSON.parse(stdout) as { issues: unknown[] };
    assert.ok(Array.isArray(result.issues), "issues should be an array");
  });

  it("discovers the three built-in plugins", () => {
    const { stdout } = run(["scan"]);
    const result = JSON.parse(stdout) as { plugins: Array<{ name: string }> };
    const names = result.plugins.map((p) => p.name);
    assert.ok(names.includes("lanhu"), "should include lanhu plugin");
    assert.ok(names.includes("notify"), "should include notify plugin");
    assert.ok(names.includes("zentao"), "should include zentao plugin");
  });

  it("lanhu is inactive when LANHU_COOKIE is empty", () => {
    const { stdout } = run(["scan"], {
      LANHU_COOKIE: "",
      // clear other plugin vars too so initEnv doesn't pick them up from .env
    });
    const result = JSON.parse(stdout) as { plugins: Array<{ name: string; active: boolean }> };
    const lanhu = result.plugins.find((p) => p.name === "lanhu");
    assert.ok(lanhu, "lanhu should be present");
    assert.equal(lanhu?.active, false);
  });

  it("lanhu is active when LANHU_COOKIE is set", () => {
    const { stdout } = run(["scan"], { LANHU_COOKIE: "session=test-cookie" });
    const result = JSON.parse(stdout) as { plugins: Array<{ name: string; active: boolean }> };
    const lanhu = result.plugins.find((p) => p.name === "lanhu");
    assert.ok(lanhu, "lanhu should be present");
    assert.equal(lanhu?.active, true);
  });
});

// ---------------------------------------------------------------------------
// verify
// ---------------------------------------------------------------------------

describe("init-wizard verify", () => {
  it("exits 0 and outputs valid JSON", () => {
    const { stdout, code } = run(["verify"]);
    assert.equal(code, 0);
    const result = JSON.parse(stdout) as unknown;
    assert.ok(typeof result === "object" && result !== null);
  });

  it("output has checks array and all_pass boolean", () => {
    const { stdout } = run(["verify"]);
    const result = JSON.parse(stdout) as { checks: unknown[]; all_pass: boolean };
    assert.ok(Array.isArray(result.checks), "checks should be an array");
    assert.equal(typeof result.all_pass, "boolean", "all_pass should be a boolean");
  });

  it("each check entry has name, status, and detail", () => {
    const { stdout } = run(["verify"]);
    const result = JSON.parse(stdout) as {
      checks: Array<{ name: string; status: string; detail: string }>;
    };
    for (const c of result.checks) {
      assert.equal(typeof c.name, "string", "check.name should be a string");
      assert.ok(
        ["pass", "fail", "skip"].includes(c.status),
        `check.status "${c.status}" should be pass/fail/skip`,
      );
      assert.equal(typeof c.detail, "string", "check.detail should be a string");
    }
  });

  it("includes at least the four mandatory checks", () => {
    const { stdout } = run(["verify"]);
    const result = JSON.parse(stdout) as { checks: Array<{ name: string }> };
    const names = result.checks.map((c) => c.name);
    assert.ok(names.some((n) => n.toLowerCase().includes("node")), "should have Node.js check");
    assert.ok(names.some((n) => n.includes("依赖安装")), "should have deps check");
    assert.ok(names.some((n) => n.includes("工作区")), "should have workspace check");
    assert.ok(names.some((n) => n.includes(".env")), "should have .env check");
  });

  it("checks array has at least 4 items", () => {
    const { stdout } = run(["verify"]);
    const result = JSON.parse(stdout) as { checks: unknown[] };
    assert.ok(result.checks.length >= 4, "should have at least 4 checks");
  });
});

// ---------------------------------------------------------------------------
// --help
// ---------------------------------------------------------------------------

describe("init-wizard --help", () => {
  it("exits successfully on --help", () => {
    const { code } = run(["--help"]);
    assert.equal(code, 0, "--help should exit 0");
  });

  it("scan --help exits successfully", () => {
    const { code } = run(["scan", "--help"]);
    assert.equal(code, 0, "scan --help should exit 0");
  });

  it("verify --help exits successfully", () => {
    const { code } = run(["verify", "--help"]);
    assert.equal(code, 0, "verify --help should exit 0");
  });
});
