import { execFileSync, execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, it, expect } from "bun:test";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
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

describe("image-compress --help", () => {
  it("outputs usage information", () => {
    const { stdout, stderr, code } = run(["compress", "--help"]);
    const output = stdout + stderr;
    expect(code).toBe(0);
    expect(output).toMatch(/image-compress|Compress/i);
    expect(output).toMatch(/--dir/);
    expect(output).toMatch(/--max-size/);
    expect(output).toMatch(/--dry-run/);
  });
});

describe("image-compress sips unavailable path", () => {
  it("handles non-macOS gracefully (skipped=true)", () => {
    if (!isSipsAvailable()) {
      // We ARE on non-macOS (or sips missing), run the script and check output
      const { stdout, code } = run(["--dir", TMP_DIR]);
      expect(code).toBe(0);
      const out = JSON.parse(stdout) as { error: string; skipped: boolean };
      expect(out.skipped).toBe(true);
      expect(out.error).toMatch(/sips not available/);
    } else {
      // On macOS, just verify the script runs without error on an empty dir
      const { code, stdout } = run(["--dir", TMP_DIR]);
      expect(code).toBe(0);
      const out = JSON.parse(stdout) as { processed: number; skipped: number };
      expect(typeof out.processed).toBe("number");
      expect(typeof out.skipped).toBe("number");
    }
  });
});

describe("image-compress with empty dir", () => {
  it("returns zero counts for empty directory", () => {
    if (!isSipsAvailable()) return; // skip on non-macOS

    const emptyDir = join(TMP_DIR, "empty");
    mkdirSync(emptyDir, { recursive: true });

    const { code, stdout } = run(["--dir", emptyDir]);
    expect(code).toBe(0);
    const out = JSON.parse(stdout) as {
      processed: number;
      skipped: number;
      files: unknown[];
    };
    expect(out.processed).toBe(0);
    expect(out.skipped).toBe(0);
    expect(out.files.length).toBe(0);
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
    expect(code).toBe(0);
    const out = JSON.parse(stdout) as { processed: number; skipped: number };
    expect(out.processed).toBe(0);
    expect(out.skipped).toBe(0);
  });
});

describe("image-compress JSON output shape", () => {
  it("output has required fields: processed, skipped, files", () => {
    if (!isSipsAvailable()) return;

    const { code, stdout } = run(["--dir", TMP_DIR]);
    expect(code).toBe(0);
    const out = JSON.parse(stdout) as Record<string, unknown>;
    expect("processed" in out).toBeTruthy();
    expect("skipped" in out).toBeTruthy();
    expect("files" in out).toBeTruthy();
    expect(Array.isArray(out.files).toBeTruthy());
  });
});
