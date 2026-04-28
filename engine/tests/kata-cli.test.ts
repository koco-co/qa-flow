import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, it, expect } from "bun:test";

const REPO_ROOT = resolve(import.meta.dirname, "../..");

function run(
  args: string[],
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync("kata-cli", args, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: { ...process.env },
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

describe("kata-cli unified CLI", () => {
  it("top-level --help exits 0", () => {
    const { code } = run(["--help"]);
    expect(code).toBe(0);
  });

  it("top-level --help shows kata-cli name", () => {
    const { stdout } = run(["--help"]);
    expect(stdout).toMatch(/kata-cli/);
  });

  it("top-level --help shows description", () => {
    const { stdout } = run(["--help"]);
    expect(stdout).toMatch(/kata unified CLI/);
  });

  it("unknown subcommand exits non-zero", () => {
    const { code } = run(["nonexistent-module"]);
    expect(code).not.toBe(0);
  });
});
