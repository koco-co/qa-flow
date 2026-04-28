import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const HOOK = join(import.meta.dirname, "../../hooks/pre-bash-guard.ts");

describe("pre-bash-guard hook (H2)", () => {
  test("blocks rm -rf workspace/", () => {
    const input = JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: "rm -rf workspace/dataAssets/features" },
    });
    const r = spawnSync("bun", ["run", HOOK], { input, encoding: "utf8" });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("rm -rf workspace");
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
