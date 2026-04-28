import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, it, expect } from "bun:test";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const TMP_DIR = join(tmpdir(), `kata-prd-frontmatter-test-${process.pid}`);

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "kata-cli",
      ["prd-frontmatter", ...args],
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

function writeMd(name: string, content: string): string {
  const filePath = join(TMP_DIR, name);
  writeFileSync(filePath, content, "utf8");
  return filePath;
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

describe("prd-frontmatter --help", () => {
  it("outputs usage information", () => {
    const { stdout, stderr, code } = run(["--help"]);
    const output = stdout + stderr;
    expect(code).toBe(0);
    expect(output).toMatch(/normalize|prd-frontmatter/i);
  });
});

describe("prd-frontmatter normalize --dry-run", () => {
  it("returns changes without writing the file", () => {
    const content = `---\nsuite_name: ""\ncreate_at: ""\nstatus: ""\n---\n\n## 模块\n`;
    const filePath = writeMd("dry-run-test.md", content);

    const { code, stdout } = run([
      "normalize",
      "--file",
      filePath,
      "--dry-run",
    ]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as {
      path: string;
      changes: string[];
      dry_run: boolean;
    };
    expect(out.dry_run).toBe(true);
    expect(out.changes.length > 0).toBeTruthy();

    // File content should be unchanged
    const unchanged = readFileSync(filePath, "utf8");
    expect(unchanged).toBe(content);
  });

  it("reports added create_at when missing", () => {
    const filePath = writeMd(
      "missing-create-at.md",
      `---\nsuite_name: "Test"\nstatus: "草稿"\n---\n\n## Body\n`,
    );
    const { code, stdout } = run([
      "normalize",
      "--file",
      filePath,
      "--dry-run",
    ]);
    expect(code).toBe(0);
    const out = JSON.parse(stdout) as { changes: string[] };
    expect(out.changes.some((c) => c.includes("create_at")).toBeTruthy(),
      "should report added create_at",
    );
  });

  it("reports default status when missing", () => {
    const filePath = writeMd(
      "no-status.md",
      `---\nsuite_name: "Test"\ncreate_at: "2026-01-01"\n---\n\n## Body\n`,
    );
    const { code, stdout } = run([
      "normalize",
      "--file",
      filePath,
      "--dry-run",
    ]);
    expect(code).toBe(0);
    const out = JSON.parse(stdout) as { changes: string[] };
    expect(out.changes.some((c) => c.includes("status")).toBeTruthy(),
      "should report added status",
    );
  });
});

describe("prd-frontmatter normalize (actual write)", () => {
  it("writes normalized fields back to file", () => {
    const filePath = writeMd(
      "normalize-write.md",
      `---\nsuite_name: ""\ncreate_at: ""\nstatus: "draft"\n---\n\n## Content\n`,
    );

    const { code, stdout } = run(["normalize", "--file", filePath]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as { changes: string[]; dry_run: boolean };
    expect(out.dry_run).toBe(false);
    expect(out.changes.some((c) => c.includes("status")).toBeTruthy(),
      "should normalize status",
    );

    const written = readFileSync(filePath, "utf8");
    expect(written).toMatch(/草稿/);
  });

  it("normalizes English status values to Chinese", () => {
    const cases = [
      { input: "draft", expected: "草稿" },
      { input: "reviewed", expected: "已评审" },
      { input: "enhanced", expected: "已增强" },
    ];

    for (const { input, expected } of cases) {
      const filePath = writeMd(
        `status-${input}.md`,
        `---\nsuite_name: "Test"\ncreate_at: "2026-01-01"\nstatus: "${input}"\n---\n\n## Body\n`,
      );
      const { code, stdout } = run(["normalize", "--file", filePath]);
      expect(code).toBe(0);
      const out = JSON.parse(stdout) as { changes: string[] };
      expect(out.changes.some((c) => c.includes(expected)).toBeTruthy(),
        `should normalize "${input}" to "${expected}"`,
      );
    }
  });

  it("adds suite_name from filename when missing", () => {
    const filePath = writeMd(
      "PRD-26-商品管理.md",
      `---\nsuite_name: ""\ncreate_at: "2026-01-01"\nstatus: "草稿"\n---\n\n## Body\n`,
    );
    const { code, stdout } = run(["normalize", "--file", filePath]);
    expect(code).toBe(0);
    const out = JSON.parse(stdout) as { changes: string[] };
    expect(out.changes.some((c) => c.includes("suite_name"))).toBeTruthy();
    const written = readFileSync(filePath, "utf8");
    // Should contain the filename-derived suite_name
    expect(written).toMatch(/商品管理/);
  });

  it("makes no changes when all required fields are present and valid", () => {
    const filePath = writeMd(
      "already-normalized.md",
      `---\nsuite_name: "已有名称"\ncreate_at: "2026-01-01"\nstatus: "草稿"\n---\n\n## Body\n`,
    );
    const { code, stdout } = run(["normalize", "--file", filePath]);
    expect(code).toBe(0);
    const out = JSON.parse(stdout) as { changes: string[] };
    expect(out.changes.length).toBe(0);
  });
});

describe("prd-frontmatter normalize errors", () => {
  it("exits with code 1 for non-existent file", () => {
    const { code, stderr } = run([
      "normalize",
      "--file",
      "/tmp/non-existent-file-xyz.md",
    ]);
    expect(code).toBe(1);
    expect(stderr).toMatch(/cannot read|Error/i);
  });
});
