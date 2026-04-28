import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const HOOK = join(import.meta.dirname, "../../hooks/pre-bash-guard.ts");

describe("pre-bash-guard hook (H2)", () => {
  test("blocks rm -rf workspace (bare dir)", () => {
    const input = JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: "rm -rf workspace" },
    });
    const r = spawnSync("bun", ["run", HOOK], { input, encoding: "utf8" });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("rm -rf workspace");
  });

  test("blocks rm -rf workspace/ (with trailing slash)", () => {
    const input = JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: "rm -rf workspace/" },
    });
    const r = spawnSync("bun", ["run", HOOK], { input, encoding: "utf8" });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("rm -rf workspace");
  });

  test("allows rm -rf workspace/dataAssets/.temp/foo (subdirectory)", () => {
    const input = JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: "rm -rf workspace/dataAssets/.temp/foo" },
    });
    const r = spawnSync("bun", ["run", HOOK], { input, encoding: "utf8" });
    expect(r.status).toBe(0);
  });

  test("allows rm -rf /tmp/foo (not root)", () => {
    const input = JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: "rm -rf /tmp/foo" },
    });
    const r = spawnSync("bun", ["run", HOOK], { input, encoding: "utf8" });
    expect(r.status).toBe(0);
  });

  test("allows echo \"rm -rf /\" (string content)", () => {
    const input = JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: 'echo "rm -rf /"' },
    });
    const r = spawnSync("bun", ["run", HOOK], { input, encoding: "utf8" });
    expect(r.status).toBe(0);
  });

  test("blocks git push from .repos/", () => {
    const input = JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: "cd workspace/x/.repos/foo && git push origin main" },
    });
    const r = spawnSync("bun", ["run", HOOK], { input, encoding: "utf8" });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain(".repos/");
  });

  test("allows git status in workspace/", () => {
    const input = JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: "git status" },
    });
    const r = spawnSync("bun", ["run", HOOK], { input, encoding: "utf8" });
    expect(r.status).toBe(0);
  });

  test("allows safe commands like ls", () => {
    const input = JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: "ls -la" },
    });
    const r = spawnSync("bun", ["run", HOOK], { input, encoding: "utf8" });
    expect(r.status).toBe(0);
  });
});
