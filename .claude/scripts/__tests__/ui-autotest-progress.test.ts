import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

const TMP_DIR = join(tmpdir(), `qa-flow-uap-test-${process.pid}`);
const SCRIPT = ".claude/scripts/ui-autotest-progress.ts";
const CWD = resolve(import.meta.dirname, "../../..");

function run(
  args: string[],
  extraEnv: Record<string, string> = {},
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync("bun", ["run", SCRIPT, ...args], {
      cwd: CWD,
      encoding: "utf8",
      env: { ...process.env, WORKSPACE_DIR: join(TMP_DIR, "workspace"), ...extraEnv },
    });
    return { stdout, stderr: "", code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", code: e.status ?? 1 };
  }
}

before(() => {
  mkdirSync(join(TMP_DIR, "workspace", "dataAssets", ".temp"), { recursive: true });
});

after(() => {
  try { rmSync(TMP_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("ui-autotest-progress.ts --help", () => {
  it("shows help without error", () => {
    const { code } = run(["--help"]);
    assert.equal(code, 0);
  });
});
