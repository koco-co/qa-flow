import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";

function runCli(args: string[], env: Record<string, string> = {}): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const p = spawn("bun", ["run", "tools/dtstack-cli/src/cli.ts", ...args], {
      env: { ...process.env, DTSTACK_CLI_TEST_DRY: "1", ...env },
    });
    let stdout = ""; let stderr = "";
    p.stdout.on("data", (d) => { stdout += d.toString(); });
    p.stderr.on("data", (d) => { stderr += d.toString(); });
    p.on("close", (code) => resolve({ stdout, stderr, code: code ?? 0 }));
  });
}

describe("CLI dispatch (dry-run)", () => {
  test("sql exec parses platform-mode flags", async () => {
    const { stdout, code } = await runCli([
      "sql", "exec",
      "--project", "p1", "--datasource", "Doris", "--sql", "SELECT 1",
    ]);
    expect(code).toBe(0);
    const out = JSON.parse(stdout);
    expect(out).toMatchObject({ command: "sql exec", mode: "platform", project: "p1", datasource: "Doris", sql: "SELECT 1" });
  });

  test("sql exec --mode direct parses --source", async () => {
    const { stdout, code } = await runCli([
      "sql", "exec", "--mode", "direct", "--source", "doris-x", "--sql", "SELECT 1",
    ]);
    expect(code).toBe(0);
    const out = JSON.parse(stdout);
    expect(out).toMatchObject({ command: "sql exec", mode: "direct", source: "doris-x" });
  });

  test("precond setup parses --tables-from", async () => {
    const { stdout, code } = await runCli([
      "precond", "setup", "--project", "p", "--datasource", "Doris", "--tables-from", "tables.yaml",
    ]);
    expect(code).toBe(0);
    const out = JSON.parse(stdout);
    expect(out).toMatchObject({ command: "precond setup", project: "p", tablesFrom: "tables.yaml" });
  });

  test("project ensure parses --engines as comma list", async () => {
    const { stdout, code } = await runCli([
      "project", "ensure", "--name", "p", "--engines", "doris3,default",
    ]);
    expect(code).toBe(0);
    const out = JSON.parse(stdout);
    expect(out).toMatchObject({ command: "project ensure", name: "p", engines: ["doris3", "default"] });
  });
});
