import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { describe, it, expect } from "bun:test";

const ROOT = join(import.meta.dirname, "../..");
const SCRIPT = "engine/src/init-wizard.ts";

function run(
  args: string[],
  extraEnv: Record<string, string> = {},
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync("bun", ["run", SCRIPT, ...args], {
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
    expect(
      code).toBe(0);
    const result = JSON.parse(stdout) as unknown;
    expect(
      typeof result === "object" && result !== null,
      "output should be a JSON object",
    ).toBeTruthy();
  });

  it("output has all required top-level fields", () => {
    const { stdout } = run(["scan"]);
    const result = JSON.parse(stdout) as Record<string, unknown>;

    expect("node_version" in result).toBeTruthy();
    expect("node_ok" in result).toBeTruthy();
    expect("deps_installed" in result).toBeTruthy();
    expect("workspace_exists" in result).toBeTruthy();
    expect("env_configured" in result).toBeTruthy();
    expect("plugins" in result).toBeTruthy();
    expect("repos" in result).toBeTruthy();
    expect("projects" in result).toBeTruthy();
    expect("issues" in result).toBeTruthy();
  });

  it("node_version is a string starting with v", () => {
    const { stdout } = run(["scan"]);
    const result = JSON.parse(stdout) as { node_version: string };
    expect(typeof result.node_version).toBe("string");
    expect(
      result.node_version.startsWith("v").toBeTruthy(),
      "node_version should start with v",
    );
  });

  it("node_ok is a boolean", () => {
    const { stdout } = run(["scan"]);
    const result = JSON.parse(stdout) as { node_ok: boolean };
    expect(typeof result.node_ok).toBe("boolean");
  });

  it("plugins is an array", () => {
    const { stdout } = run(["scan"]);
    const result = JSON.parse(stdout) as { plugins: unknown[] };
    expect(Array.isArray(result.plugins).toBeTruthy(), "plugins should be an array");
  });

  it("each plugin entry has name and active fields", () => {
    const { stdout } = run(["scan"]);
    const result = JSON.parse(stdout) as {
      plugins: Array<{ name: string; active: boolean }>;
    };
    for (const p of result.plugins) {
      expect(typeof p.name).toBe("string");
      expect(
        typeof p.active).toBe("boolean");
    }
  });

  it("repos is an array", () => {
    const { stdout } = run(["scan"]);
    const result = JSON.parse(stdout) as { repos: unknown[] };
    expect(Array.isArray(result.repos).toBeTruthy(), "repos should be an array");
  });

  it("each repo entry has group, repo, path fields", () => {
    const { stdout } = run(["scan"]);
    const result = JSON.parse(stdout) as {
      repos: Array<{ group: string; repo: string; path: string }>;
    };
    for (const r of result.repos) {
      expect(typeof r.group).toBe("string");
      expect(typeof r.repo).toBe("string");
      expect(typeof r.path).toBe("string");
    }
  });

  it("projects is an array of strings", () => {
    const { stdout } = run(["scan"]);
    const result = JSON.parse(stdout) as { projects: unknown[] };
    expect(Array.isArray(result.projects).toBeTruthy(), "projects should be an array");
    for (const p of result.projects) {
      expect(typeof p).toBe("string");
    }
  });

  it("issues is an array", () => {
    const { stdout } = run(["scan"]);
    const result = JSON.parse(stdout) as { issues: unknown[] };
    expect(Array.isArray(result.issues).toBeTruthy(), "issues should be an array");
  });

  it("discovers the three built-in plugins", () => {
    const { stdout } = run(["scan"]);
    const result = JSON.parse(stdout) as { plugins: Array<{ name: string }> };
    const names = result.plugins.map((p) => p.name);
    expect(names.includes("lanhu").toBeTruthy(), "should include lanhu plugin");
    expect(names.includes("notify").toBeTruthy(), "should include notify plugin");
    expect(names.includes("zentao").toBeTruthy(), "should include zentao plugin");
  });

  it("lanhu is inactive when LANHU_COOKIE is empty", () => {
    const { stdout } = run(["scan"], {
      LANHU_COOKIE: "",
      // clear other plugin vars too so initEnv doesn't pick them up from .env
    });
    const result = JSON.parse(stdout) as {
      plugins: Array<{ name: string; active: boolean }>;
    };
    const lanhu = result.plugins.find((p) => p.name === "lanhu");
    expect(lanhu).toBeTruthy();
    expect(lanhu?.active).toBe(false);
  });

  it("lanhu is active when LANHU_COOKIE is set", () => {
    const { stdout } = run(["scan"], { LANHU_COOKIE: "session=test-cookie" });
    const result = JSON.parse(stdout) as {
      plugins: Array<{ name: string; active: boolean }>;
    };
    const lanhu = result.plugins.find((p) => p.name === "lanhu");
    expect(lanhu).toBeTruthy();
    expect(lanhu?.active).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// verify
// ---------------------------------------------------------------------------

describe("init-wizard verify", () => {
  it("exits 0 and outputs valid JSON", () => {
    const { stdout, code } = run(["verify"]);
    expect(code).toBe(0);
    const result = JSON.parse(stdout) as unknown;
    expect(typeof result === "object" && result !== null).toBeTruthy();
  });

  it("output has checks array and all_pass boolean", () => {
    const { stdout } = run(["verify"]);
    const result = JSON.parse(stdout) as {
      checks: unknown[];
      all_pass: boolean;
    };
    expect(Array.isArray(result.checks).toBeTruthy(), "checks should be an array");
    expect(
      typeof result.all_pass).toBe("boolean");
  });

  it("each check entry has name, status, and detail", () => {
    const { stdout } = run(["verify"]);
    const result = JSON.parse(stdout) as {
      checks: Array<{ name: string; status: string; detail: string }>;
    };
    for (const c of result.checks) {
      expect(typeof c.name).toBe("string");
      expect(
        ["pass", "fail", "skip"].includes(c.status).toBeTruthy(),
        `check.status "${c.status}" should be pass/fail/skip`,
      );
      expect(
        typeof c.detail).toBe("string");
    }
  });

  it("includes at least the four mandatory checks", () => {
    const { stdout } = run(["verify"]);
    const result = JSON.parse(stdout) as { checks: Array<{ name: string }> };
    const names = result.checks.map((c) => c.name);
    expect(names.some((n) => n.toLowerCase().includes("node"))).toBeTruthy();
    expect(names.some((n) => n.includes("依赖安装")).toBeTruthy(),
      "should have deps check",
    );
    expect(names.some((n) => n.includes("工作区")).toBeTruthy(),
      "should have workspace check",
    );
    expect(names.some((n) => n.includes(".env")).toBeTruthy(),
      "should have .env check",
    );
  });

  it("checks array has at least 4 items", () => {
    const { stdout } = run(["verify"]);
    const result = JSON.parse(stdout) as { checks: unknown[] };
    expect(result.checks.length >= 4).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// --help
// ---------------------------------------------------------------------------

describe("init-wizard --help", () => {
  it("exits successfully on --help", () => {
    const { code } = run(["--help"]);
    expect(code).toBe(0);
  });

  it("scan --help exits successfully", () => {
    const { code } = run(["scan", "--help"]);
    expect(code).toBe(0);
  });

  it("verify --help exits successfully", () => {
    const { code } = run(["verify", "--help"]);
    expect(code).toBe(0);
  });
});
