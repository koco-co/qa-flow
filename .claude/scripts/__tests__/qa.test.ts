import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, describe, it } from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const TMP_DIR = join(tmpdir(), `qa-flow-qa-test-${process.pid}`);
const GLOBAL_RULES_DIR = join(TMP_DIR, "global-rules");
const WORKSPACE_DIR = join(TMP_DIR, "workspace");

function setupFixture(): void {
  mkdirSync(GLOBAL_RULES_DIR, { recursive: true });
  writeFileSync(
    join(GLOBAL_RULES_DIR, "sample.md"),
    "# Sample\n\nkey: value\nother: data\n",
    "utf8",
  );
}

function run(
  args: string[],
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync("bun", ["run", "qa", ...args], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: {
        ...process.env,
        WORKSPACE_DIR,
        QA_RULES_DIR: GLOBAL_RULES_DIR,
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

describe("qa unified CLI", () => {
  after(() => {
    rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it("top-level --help lists registered modules", () => {
    const { stdout, code } = run(["--help"]);
    assert.equal(code, 0);
    assert.match(stdout, /rule-loader/);
    assert.match(stdout, /knowledge-keeper/);
    assert.match(stdout, /repo-sync/);
  });

  it("dispatches `qa rule-loader load` identically to direct script call", () => {
    setupFixture();
    const { stdout, code } = run([
      "rule-loader",
      "load",
      "--project",
      "someproject",
    ]);
    assert.equal(code, 0, `unexpected failure, stdout=${stdout}`);
    const parsed = JSON.parse(stdout);
    assert.deepEqual(parsed.sample, { key: "value", other: "data" });
  });

  it("shows choices in nested help (qa knowledge-keeper write --help)", () => {
    const { stdout, code } = run(["knowledge-keeper", "write", "--help"]);
    assert.equal(code, 0);
    assert.match(stdout, /choices:\s*"term",\s*"overview",\s*"module",\s*"pitfall"/);
    assert.match(stdout, /choices:\s*"high",\s*"medium",\s*"low"/);
  });

  it("rejects invalid enum through qa wrapper", () => {
    const { code, stderr, stdout } = run([
      "knowledge-keeper",
      "write",
      "--project",
      "x",
      "--type",
      "bogus",
      "--content",
      "{}",
    ]);
    assert.equal(code, 1);
    // commander prints to stderr; in some envs bun may consolidate it
    const combined = stderr + stdout;
    assert.match(combined, /invalid.*Allowed choices/i);
  });
});
