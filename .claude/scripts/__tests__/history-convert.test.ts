import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const FIXTURE_CSV = join(import.meta.dirname, "fixtures/sample-history.csv");
const TMP_DIR = join(tmpdir(), `qa-flow-history-convert-test-${process.pid}`);

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync("npx", ["tsx", ".claude/scripts/history-convert.ts", ...args], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      timeout: 30_000,
    });
    return { stdout, stderr: "", code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", code: e.status ?? 1 };
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

describe("history-convert --help", () => {
  it("outputs usage information", () => {
    const { stdout, stderr, code } = run(["--help"]);
    const output = stdout + stderr;
    assert.equal(code, 0);
    assert.match(output, /history-convert|Convert/i);
    assert.match(output, /--path/);
    assert.match(output, /--detect/);
    assert.match(output, /--force/);
    assert.match(output, /--module/);
  });
});

describe("history-convert --detect", () => {
  it("lists CSV files without writing", () => {
    const dir = join(TMP_DIR, "detect-test");
    mkdirSync(dir, { recursive: true });
    const csvFile = join(dir, "my-cases.csv");
    writeFileSync(
      csvFile,
      "module,title,steps,expected,priority\n商品管理,验证列表,进入页面,加载完成,P0",
    );

    const { code, stdout } = run(["--path", dir, "--detect"]);
    assert.equal(code, 0);

    const entries = JSON.parse(stdout) as { path: string; type: string; outputPath: string }[];
    assert.ok(Array.isArray(entries));
    assert.ok(entries.length > 0);
    assert.equal(entries[0].type, "csv");
    assert.ok(entries[0].outputPath.endsWith(".md"));
    // Verify no file was written
    assert.ok(!existsSync(entries[0].outputPath), "should not write file in detect mode");
  });
});

describe("history-convert CSV conversion", () => {
  it("converts a CSV file to Archive Markdown", () => {
    const { code, stdout } = run(["--path", FIXTURE_CSV, "--force"]);
    assert.equal(code, 0);

    const out = JSON.parse(stdout) as {
      converted: number;
      skipped: number;
      failed: number;
      files: { input: string; output: string; status: string; caseCount?: number }[];
    };

    assert.ok(out.converted >= 1, "should convert at least 1 file");
    assert.equal(out.failed, 0, "should have no failures");

    const result = out.files.find((f) => f.input === FIXTURE_CSV);
    assert.ok(result, "should include the fixture CSV in results");
    assert.equal(result.status, "converted");
    assert.ok(result.output.endsWith(".md"), "output should be a .md file");
    assert.ok(existsSync(result.output), "output file should exist");
  });

  it("generated Markdown contains module sections and case titles", () => {
    // Run conversion and check content
    const { code, stdout } = run(["--path", FIXTURE_CSV, "--force"]);
    assert.equal(code, 0);

    const out = JSON.parse(stdout) as {
      files: { input: string; output: string; status: string }[];
    };
    const result = out.files.find((f) => f.input === FIXTURE_CSV);
    assert.ok(result && result.status === "converted");

    const content = readFileSync(result.output, "utf8");

    // Should have front-matter
    assert.match(content, /^---/, "should start with front-matter");
    assert.match(content, /suite_name/, "should have suite_name in front-matter");
    assert.match(content, /origin.*csv/, "should have origin: csv");

    // Should have module sections
    assert.match(content, /## 商品管理/, "should have 商品管理 module section");
    assert.match(content, /## 订单管理/, "should have 订单管理 module section");

    // Should have case titles with priority prefix
    assert.match(content, /验证商品列表默认加载/, "should contain case title");
    assert.match(content, /【P0】/, "should have P0 priority prefix");
  });

  it("skips existing output without --force", () => {
    // First conversion
    run(["--path", FIXTURE_CSV, "--force"]);

    // Second run without --force
    const { code, stdout } = run(["--path", FIXTURE_CSV]);
    assert.equal(code, 0);

    const out = JSON.parse(stdout) as { skipped: number };
    assert.ok(out.skipped >= 1, "should skip existing output");
  });

  it("converts with --force overwriting existing output", () => {
    // First conversion
    run(["--path", FIXTURE_CSV, "--force"]);
    // Second conversion with --force
    const { code, stdout } = run(["--path", FIXTURE_CSV, "--force"]);
    assert.equal(code, 0);
    const out = JSON.parse(stdout) as { converted: number };
    assert.ok(out.converted >= 1, "should convert again with --force");
  });
});

describe("history-convert directory scan", () => {
  it("scans a directory and converts all CSV files found", () => {
    const dir = join(TMP_DIR, "dir-scan");
    mkdirSync(dir, { recursive: true });

    // Create two CSV files
    writeFileSync(
      join(dir, "module-a.csv"),
      "module,title,steps,expected,priority\n模块A,验证功能A,步骤1,预期1,P0\n",
    );
    writeFileSync(
      join(dir, "module-b.csv"),
      "module,title,steps,expected,priority\n模块B,验证功能B,步骤1,预期1,P1\n",
    );
    // Non-CSV should be ignored
    writeFileSync(join(dir, "notes.txt"), "ignore me");

    const { code, stdout } = run(["--path", dir, "--force"]);
    assert.equal(code, 0);

    const out = JSON.parse(stdout) as { converted: number; files: { input: string }[] };
    assert.equal(out.converted, 2, "should convert both CSV files");
    assert.ok(
      out.files.every((f) => f.input.endsWith(".csv")),
      "should only process .csv files",
    );
  });
});

describe("history-convert --module filter", () => {
  it("filters files by module keyword", () => {
    const dir = join(TMP_DIR, "module-filter");
    mkdirSync(dir, { recursive: true });

    writeFileSync(
      join(dir, "商品管理.csv"),
      "module,title,steps,expected,priority\n商品,验证商品,步骤,预期,P0\n",
    );
    writeFileSync(
      join(dir, "订单管理.csv"),
      "module,title,steps,expected,priority\n订单,验证订单,步骤,预期,P1\n",
    );

    const { code, stdout } = run(["--path", dir, "--module", "商品", "--detect"]);
    assert.equal(code, 0);

    const entries = JSON.parse(stdout) as { path: string }[];
    assert.equal(entries.length, 1, "should only find files matching 商品");
    assert.ok(entries[0].path.includes("商品管理"), "matched file should be 商品管理.csv");
  });
});

describe("history-convert error handling", () => {
  it("exits with code 1 for non-existent path", () => {
    const { code, stderr } = run(["--path", "/tmp/non-existent-history-path-xyz"]);
    assert.equal(code, 1);
    assert.match(stderr, /path not found|Error/i);
  });

  it("output JSON has required top-level fields", () => {
    const dir = join(TMP_DIR, "shape-test");
    mkdirSync(dir, { recursive: true });

    const { code, stdout } = run(["--path", dir]);
    assert.equal(code, 0);
    const out = JSON.parse(stdout) as Record<string, unknown>;
    assert.ok("converted" in out);
    assert.ok("skipped" in out);
    assert.ok("failed" in out);
    assert.ok("files" in out);
  });
});
