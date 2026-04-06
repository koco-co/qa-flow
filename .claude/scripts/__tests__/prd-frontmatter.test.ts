import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const TMP_DIR = join(tmpdir(), `qa-flow-prd-frontmatter-test-${process.pid}`);

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync("npx", ["tsx", ".claude/scripts/prd-frontmatter.ts", ...args], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    return { stdout, stderr: "", code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", code: e.status ?? 1 };
  }
}

function writeMd(name: string, content: string): string {
  const filePath = join(TMP_DIR, name);
  writeFileSync(filePath, content, "utf8");
  return filePath;
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

describe("prd-frontmatter --help", () => {
  it("outputs usage information", () => {
    const { stdout, stderr, code } = run(["--help"]);
    const output = stdout + stderr;
    assert.equal(code, 0);
    assert.match(output, /normalize|prd-frontmatter/i);
  });
});

describe("prd-frontmatter normalize --dry-run", () => {
  it("returns changes without writing the file", () => {
    const content = `---\nsuite_name: ""\ncreate_at: ""\nstatus: ""\n---\n\n## 模块\n`;
    const filePath = writeMd("dry-run-test.md", content);

    const { code, stdout } = run(["normalize", "--file", filePath, "--dry-run"]);
    assert.equal(code, 0);

    const out = JSON.parse(stdout) as { path: string; changes: string[]; dry_run: boolean };
    assert.equal(out.dry_run, true);
    assert.ok(out.changes.length > 0, "should report changes");

    // File content should be unchanged
    const unchanged = readFileSync(filePath, "utf8");
    assert.equal(unchanged, content);
  });

  it("reports added create_at when missing", () => {
    const filePath = writeMd(
      "missing-create-at.md",
      `---\nsuite_name: "Test"\nstatus: "草稿"\n---\n\n## Body\n`,
    );
    const { code, stdout } = run(["normalize", "--file", filePath, "--dry-run"]);
    assert.equal(code, 0);
    const out = JSON.parse(stdout) as { changes: string[] };
    assert.ok(
      out.changes.some((c) => c.includes("create_at")),
      "should report added create_at",
    );
  });

  it("reports default status when missing", () => {
    const filePath = writeMd(
      "no-status.md",
      `---\nsuite_name: "Test"\ncreate_at: "2026-01-01"\n---\n\n## Body\n`,
    );
    const { code, stdout } = run(["normalize", "--file", filePath, "--dry-run"]);
    assert.equal(code, 0);
    const out = JSON.parse(stdout) as { changes: string[] };
    assert.ok(
      out.changes.some((c) => c.includes("status")),
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
    assert.equal(code, 0);

    const out = JSON.parse(stdout) as { changes: string[]; dry_run: boolean };
    assert.equal(out.dry_run, false);
    assert.ok(
      out.changes.some((c) => c.includes("status")),
      "should normalize status",
    );

    const written = readFileSync(filePath, "utf8");
    assert.match(written, /草稿/, "should contain normalized status 草稿");
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
      assert.equal(code, 0, `should succeed for status="${input}"`);
      const out = JSON.parse(stdout) as { changes: string[] };
      assert.ok(
        out.changes.some((c) => c.includes(expected)),
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
    assert.equal(code, 0);
    const out = JSON.parse(stdout) as { changes: string[] };
    assert.ok(out.changes.some((c) => c.includes("suite_name")));
    const written = readFileSync(filePath, "utf8");
    // Should contain the filename-derived suite_name
    assert.match(written, /商品管理/);
  });

  it("makes no changes when all required fields are present and valid", () => {
    const filePath = writeMd(
      "already-normalized.md",
      `---\nsuite_name: "已有名称"\ncreate_at: "2026-01-01"\nstatus: "草稿"\n---\n\n## Body\n`,
    );
    const { code, stdout } = run(["normalize", "--file", filePath]);
    assert.equal(code, 0);
    const out = JSON.parse(stdout) as { changes: string[] };
    assert.equal(out.changes.length, 0, "should report no changes");
  });
});

describe("prd-frontmatter normalize errors", () => {
  it("exits with code 1 for non-existent file", () => {
    const { code, stderr } = run(["normalize", "--file", "/tmp/non-existent-file-xyz.md"]);
    assert.equal(code, 1);
    assert.match(stderr, /cannot read|Error/i);
  });
});
