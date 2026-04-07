import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const FIXTURE_CSV = join(import.meta.dirname, "fixtures/sample-history.csv");
const TMP_DIR = join(tmpdir(), `qa-flow-history-convert-test-${process.pid}`);

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "bun",
      ["run", ".claude/scripts/history-convert.ts", ...args],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        timeout: 30_000,
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

    const entries = JSON.parse(stdout) as {
      path: string;
      type: string;
      outputDir: string;
    }[];
    assert.ok(Array.isArray(entries));
    assert.ok(entries.length > 0);
    assert.equal(entries[0].type, "csv");
    assert.ok(
      entries[0].outputDir.includes("archive"),
      "outputDir should point to archive directory",
    );
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
      files: {
        input: string;
        output: string;
        status: string;
        caseCount?: number;
      }[];
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
    assert.match(
      content,
      /suite_name/,
      "should have suite_name in front-matter",
    );
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

    const out = JSON.parse(stdout) as {
      converted: number;
      files: { input: string }[];
    };
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

    const { code, stdout } = run([
      "--path",
      dir,
      "--module",
      "商品",
      "--detect",
    ]);
    assert.equal(code, 0);

    const entries = JSON.parse(stdout) as { path: string }[];
    assert.equal(entries.length, 1, "should only find files matching 商品");
    assert.ok(
      entries[0].path.includes("商品管理"),
      "matched file should be 商品管理.csv",
    );
  });
});

describe("history-convert error handling", () => {
  it("exits with code 1 for non-existent path", () => {
    const { code, stderr } = run([
      "--path",
      "/tmp/non-existent-history-path-xyz",
    ]);
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

describe("history-convert --no-split XMind", () => {
  /**
   * Build a minimal .xmind file (ZIP with content.json) containing two L1 nodes.
   */
  async function createTestXmind(outputPath: string): Promise<void> {
    const { default: JSZip } = await import("jszip");
    // Structure: Root → L1 → L2(module) → case(with marker, ≥2 steps) → step → expected
    // Cases must have ≥2 steps so parent nodes aren't misidentified as cases by isCaseNode heuristic
    const content = [
      {
        rootTopic: {
          title: "Root",
          children: {
            attached: [
              {
                title: "需求A（#1001）",
                children: {
                  attached: [
                    {
                      title: "模块A1",
                      children: {
                        attached: [
                          {
                            title: "验证A功能",
                            markers: [{ markerId: "priority-1" }],
                            children: {
                              attached: [
                                {
                                  title: "步骤A-1",
                                  children: {
                                    attached: [{ title: "预期A-1" }],
                                  },
                                },
                                {
                                  title: "步骤A-2",
                                  children: {
                                    attached: [{ title: "预期A-2" }],
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                title: "需求B（#1002）",
                children: {
                  attached: [
                    {
                      title: "模块B1",
                      children: {
                        attached: [
                          {
                            title: "验证B功能",
                            markers: [{ markerId: "priority-2" }],
                            children: {
                              attached: [
                                {
                                  title: "步骤B-1",
                                  children: {
                                    attached: [{ title: "预期B-1" }],
                                  },
                                },
                                {
                                  title: "步骤B-2",
                                  children: {
                                    attached: [{ title: "预期B-2" }],
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    ];

    const zip = new JSZip();
    zip.file("content.json", JSON.stringify(content));
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    writeFileSync(outputPath, buffer);
  }

  it("merges all L1 nodes into a single file", async () => {
    const xmindFile = join(TMP_DIR, "multi-l1-test.xmind");
    await createTestXmind(xmindFile);

    const { code, stdout } = run([
      "--path",
      xmindFile,
      "--no-split",
      "--force",
    ]);
    assert.equal(code, 0);

    const out = JSON.parse(stdout) as {
      converted: number;
      files: { output: string; caseCount?: number; status: string }[];
    };
    assert.equal(out.converted, 1, "should produce exactly 1 file");
    assert.equal(out.files.length, 1, "should have exactly 1 result entry");
    assert.equal(out.files[0].caseCount, 2, "should count 2 total cases");

    const content = readFileSync(out.files[0].output, "utf8");
    // Frontmatter should have merged suite_name
    assert.match(content, /suite_name/, "should have suite_name");
    assert.match(content, /case_count: 2/, "should have case_count: 2");
    // L1 titles should be H2
    assert.match(content, /## 需求A（#1001）/, "should contain L1-A as H2");
    assert.match(content, /## 需求B（#1002）/, "should contain L1-B as H2");
    // L2 modules should be H3
    assert.match(content, /### 模块A1/, "should contain module A1 as H3");
    assert.match(content, /### 模块B1/, "should contain module B1 as H3");
    // Both cases should be present
    assert.match(content, /验证A功能/, "should contain case A");
    assert.match(content, /验证B功能/, "should contain case B");
  });

  it("without --no-split produces separate files per L1", async () => {
    const xmindFile = join(TMP_DIR, "multi-l1-split.xmind");
    await createTestXmind(xmindFile);

    const { code, stdout } = run(["--path", xmindFile, "--force"]);
    assert.equal(code, 0);

    const out = JSON.parse(stdout) as {
      converted: number;
      files: { output: string; status: string }[];
    };
    assert.equal(
      out.converted,
      2,
      "default should produce 2 files (one per L1)",
    );
  });
});
