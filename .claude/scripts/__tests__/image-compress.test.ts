import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const TMP_DIR = join(tmpdir(), `kata-image-compress-test-${process.pid}`);

function isSipsAvailable(): boolean {
  try {
    execSync("which sips", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "kata-cli",
      ["image-compress", ...args],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
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

describe("image-compress --help", () => {
  it("outputs usage information", () => {
    const { stdout, stderr, code } = run(["compress", "--help"]);
    const output = stdout + stderr;
    assert.equal(code, 0);
    assert.match(output, /image-compress|Compress/i);
    assert.match(output, /--dir/);
    assert.match(output, /--max-size/);
    assert.match(output, /--dry-run/);
  });
});

describe("image-compress sips unavailable path", () => {
  it("handles non-macOS gracefully (skipped=true)", () => {
    if (!isSipsAvailable()) {
      // We ARE on non-macOS (or sips missing), run the script and check output
      const { stdout, code } = run(["--dir", TMP_DIR]);
      assert.equal(code, 0);
      const out = JSON.parse(stdout) as { error: string; skipped: boolean };
      assert.equal(out.skipped, true);
      assert.match(out.error, /sips not available/);
    } else {
      // On macOS, just verify the script runs without error on an empty dir
      const { code, stdout } = run(["--dir", TMP_DIR]);
      assert.equal(code, 0);
      const out = JSON.parse(stdout) as { processed: number; skipped: number };
      assert.equal(typeof out.processed, "number");
      assert.equal(typeof out.skipped, "number");
    }
  });
});

describe("image-compress with empty dir", () => {
  it("returns zero counts for empty directory", () => {
    if (!isSipsAvailable()) return; // skip on non-macOS

    const emptyDir = join(TMP_DIR, "empty");
    mkdirSync(emptyDir, { recursive: true });

    const { code, stdout } = run(["--dir", emptyDir]);
    assert.equal(code, 0);
    const out = JSON.parse(stdout) as {
      processed: number;
      skipped: number;
      files: unknown[];
    };
    assert.equal(out.processed, 0);
    assert.equal(out.skipped, 0);
    assert.equal(out.files.length, 0);
  });
});

describe("image-compress --dry-run", () => {
  it("does not fail on a directory with non-image files", () => {
    if (!isSipsAvailable()) return;

    const dir = join(TMP_DIR, "dry-run-test");
    mkdirSync(dir, { recursive: true });
    // Create a text file (should be ignored)
    writeFileSync(join(dir, "readme.txt"), "hello");

    const { code, stdout } = run(["--dir", dir, "--dry-run"]);
    assert.equal(code, 0);
    const out = JSON.parse(stdout) as { processed: number; skipped: number };
    assert.equal(out.processed, 0);
    assert.equal(out.skipped, 0);
  });
});

describe("image-compress JSON output shape", () => {
  it("output has required fields: processed, skipped, files", () => {
    if (!isSipsAvailable()) return;

    const { code, stdout } = run(["--dir", TMP_DIR]);
    assert.equal(code, 0);
    const out = JSON.parse(stdout) as Record<string, unknown>;
    assert.ok("processed" in out);
    assert.ok("skipped" in out);
    assert.ok("files" in out);
    assert.ok(Array.isArray(out.files));
  });
});
