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
import { afterEach, beforeEach, describe, it, expect } from "bun:test";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const FIXTURE_CSV = join(import.meta.dirname, "fixtures/sample-history.csv");
const TMP_DIR = join(tmpdir(), `kata-history-convert-test-${process.pid}`);
const TEST_PROJECT = "testProject";

/** Compute the archive directory the script writes to (mirrors computeOutputDir in history-convert.ts) */
function getArchiveDir(): string {
  const yyyymm = new Date().toISOString().slice(0, 7).replace("-", "");
  return join(REPO_ROOT, "workspace", TEST_PROJECT, "archive", yyyymm);
}

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "kata-cli",
      ["history-convert", ...args],
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

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
  // Remove the test project directory created by tests
  const testProjectDir = join(REPO_ROOT, "workspace", TEST_PROJECT);
  try {
    rmSync(testProjectDir, { recursive: true, force: true });
  } catch {
    // ignore if directory doesn't exist
  }
});

describe("history-convert --help", () => {
  it("outputs usage information", () => {
    const { stdout, stderr, code } = run(["convert", "--help"]);
    const output = stdout + stderr;
    expect(code).toBe(0);
    expect(output).toMatch(/history-convert|Convert/i);
    expect(output).toMatch(/--path/);
    expect(output).toMatch(/--detect/);
    expect(output).toMatch(/--force/);
    expect(output).toMatch(/--module/);
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

    const { code, stdout } = run(["--path", dir, "--project", TEST_PROJECT, "--detect"]);
    expect(code).toBe(0);

    const entries = JSON.parse(stdout) as {
      path: string;
      type: string;
      outputDir: string;
    }[];
    expect(Array.isArray(entries).toBeTruthy());
    expect(entries.length > 0).toBeTruthy();
    expect(entries[0].type).toBe("csv");
    expect(
      entries[0].outputDir.includes("archive").toBeTruthy(),
      "outputDir should point to archive directory",
    );
  });
});

describe("history-convert CSV conversion", () => {
  it("converts a CSV file to Archive Markdown", () => {
    const { code, stdout } = run(["--path", FIXTURE_CSV, "--project", TEST_PROJECT, "--force"]);
    expect(code).toBe(0);

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

    expect(out.converted >= 1).toBeTruthy();
    expect(out.failed).toBe(0);

    const result = out.files.find((f) => f.input === FIXTURE_CSV);
    expect(result).toBeTruthy();
    expect(result.status).toBe("converted");
    expect(result.output.endsWith(".md").toBeTruthy(), "output should be a .md file");
    expect(existsSync(result.output).toBeTruthy(), "output file should exist");
  });

  it("generated Markdown contains module sections and case titles", () => {
    // Run conversion and check content
    const { code, stdout } = run(["--path", FIXTURE_CSV, "--project", TEST_PROJECT, "--force"]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as {
      files: { input: string; output: string; status: string }[];
    };
    const result = out.files.find((f) => f.input === FIXTURE_CSV);
    expect(result && result.status === "converted").toBeTruthy();

    const content = readFileSync(result.output, "utf8");

    // Should have front-matter
    expect(content).toMatch(/^---/);
    expect(
      content).toMatch(/suite_name/);
    expect(content).toMatch(/origin.*csv/);

    // Should have module sections
    expect(content).toMatch(/## 商品管理/);
    expect(content).toMatch(/## 订单管理/);

    // Should have case titles with priority prefix
    expect(content).toMatch(/验证商品列表默认加载/);
    expect(content).toMatch(/【P0】/);
  });

  it("skips existing output without --force", () => {
    // First conversion
    run(["--path", FIXTURE_CSV, "--project", TEST_PROJECT, "--force"]);

    // Second run without --force
    const { code, stdout } = run(["--path", FIXTURE_CSV, "--project", TEST_PROJECT]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as { skipped: number };
    expect(out.skipped >= 1).toBeTruthy();
  });

  it("converts with --force overwriting existing output", () => {
    // First conversion
    run(["--path", FIXTURE_CSV, "--project", TEST_PROJECT, "--force"]);
    // Second conversion with --force
    const { code, stdout } = run(["--path", FIXTURE_CSV, "--project", TEST_PROJECT, "--force"]);
    expect(code).toBe(0);
    const out = JSON.parse(stdout) as { converted: number };
    expect(out.converted >= 1).toBeTruthy();
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

    const { code, stdout } = run(["--path", dir, "--project", TEST_PROJECT, "--force"]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as {
      converted: number;
      files: { input: string }[];
    };
    expect(out.converted).toBe(2);
    expect(out.files.every((f) => f.input.endsWith(".csv")).toBeTruthy(),
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
      "--project",
      TEST_PROJECT,
      "--module",
      "商品",
      "--detect",
    ]);
    expect(code).toBe(0);

    const entries = JSON.parse(stdout) as { path: string }[];
    expect(entries.length).toBe(1);
    expect(
      entries[0].path.includes("商品管理").toBeTruthy(),
      "matched file should be 商品管理.csv",
    );
  });
});

describe("history-convert error handling", () => {
  it("exits with code 1 for non-existent path", () => {
    const { code, stderr } = run([
      "--path",
      "/tmp/non-existent-history-path-xyz",
      "--project",
      TEST_PROJECT,
    ]);
    expect(code).toBe(1);
    expect(stderr).toMatch(/path not found|Error/i);
  });

  it("output JSON has required top-level fields", () => {
    const dir = join(TMP_DIR, "shape-test");
    mkdirSync(dir, { recursive: true });

    const { code, stdout } = run(["--path", dir, "--project", TEST_PROJECT]);
    expect(code).toBe(0);
    const out = JSON.parse(stdout) as Record<string, unknown>;
    expect("converted" in out).toBeTruthy();
    expect("skipped" in out).toBeTruthy();
    expect("failed" in out).toBeTruthy();
    expect("files" in out).toBeTruthy();
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
      "--project",
      TEST_PROJECT,
      "--no-split",
      "--force",
    ]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as {
      converted: number;
      files: { output: string; caseCount?: number; status: string }[];
    };
    expect(out.converted).toBe(1);
    expect(out.files.length).toBe(1);
    expect(out.files[0].caseCount).toBe(2);

    const content = readFileSync(out.files[0].output, "utf8");
    // Frontmatter should have merged suite_name
    expect(content).toMatch(/suite_name/);
    expect(content).toMatch(/case_count: 2/);
    // L1 titles should be H2
    expect(content).toMatch(/## 需求A（#1001）/);
    expect(content).toMatch(/## 需求B（#1002）/);
    // L2 modules should be H3
    expect(content).toMatch(/### 模块A1/);
    expect(content).toMatch(/### 模块B1/);
    // Both cases should be present
    expect(content).toMatch(/验证A功能/);
    expect(content).toMatch(/验证B功能/);
  });

  it("without --no-split produces separate files per L1", async () => {
    const xmindFile = join(TMP_DIR, "multi-l1-split.xmind");
    await createTestXmind(xmindFile);

    const { code, stdout } = run(["--path", xmindFile, "--project", TEST_PROJECT, "--force"]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as {
      converted: number;
      files: { output: string; status: string }[];
    };
    expect(
      out.converted).toBe(2);

    const outputs = out.files.map((entry) => entry.output).sort();
    expect(
      outputs[0].endsWith("/需求A.md").toBeTruthy(),
      `first output should strip full-width case_id suffix, got: ${outputs[0]}`,
    );
    expect(
      outputs[1].endsWith("/需求B.md").toBeTruthy(),
      `second output should strip full-width case_id suffix, got: ${outputs[1]}`,
    );

    const firstContent = readFileSync(outputs[0], "utf8");
    const secondContent = readFileSync(outputs[1], "utf8");

    expect(
      firstContent).toMatch(/suite_name: "需求A（#1001）"/);
    expect(
      firstContent).toMatch(/case_id: 1001/);
    expect(
      secondContent).toMatch(/suite_name: "需求B（#1002）"/);
    expect(
      secondContent).toMatch(/case_id: 1002/);
  });

  it("merges duplicate L1 titles into one requirement file when splitting", async () => {
    const { default: JSZip } = await import("jszip");
    const xmindFile = join(TMP_DIR, "duplicate-l1-split.xmind");
    const content = [
      {
        rootTopic: {
          title: "Root",
          children: {
            attached: [
              {
                title: "重复需求（#2001）",
                children: {
                  attached: [
                    {
                      title: "模块A",
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
                title: "重复需求（#2001）",
                children: {
                  attached: [
                    {
                      title: "模块B",
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
    writeFileSync(
      xmindFile,
      await zip.generateAsync({ type: "nodebuffer" }),
    );

    const { code, stdout } = run(["--path", xmindFile, "--project", TEST_PROJECT, "--force"]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as {
      converted: number;
      files: { output: string; caseCount?: number; status: string }[];
    };
    expect(
      out.converted).toBe(1);
    expect(out.files[0].caseCount).toBe(2);
    expect(
      out.files[0].output.endsWith("/重复需求.md").toBeTruthy(),
      `merged output should use the requirement title as file name, got: ${out.files[0].output}`,
    );

    const contentText = readFileSync(out.files[0].output, "utf8");
    expect(contentText).toMatch(/suite_name: "重复需求（#2001）"/);
    expect(contentText).toMatch(/case_count: 2/);
    expect(contentText).toMatch(/## 模块A/);
    expect(contentText).toMatch(/## 模块B/);
    expect(contentText).toMatch(/验证A功能/);
    expect(contentText).toMatch(/验证B功能/);
  });

  it("extracts case_id when the ticket token is followed by extra title markers", async () => {
    const { default: JSZip } = await import("jszip");
    const xmindFile = join(TMP_DIR, "case-id-before-marker.xmind");
    const content = [
      {
        rootTopic: {
          title: "Root",
          children: {
            attached: [
              {
                title: "需求A（#3001）【需求变更】",
                children: {
                  attached: [
                    {
                      title: "模块A",
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
            ],
          },
        },
      },
    ];
    const zip = new JSZip();
    zip.file("content.json", JSON.stringify(content));
    writeFileSync(
      xmindFile,
      await zip.generateAsync({ type: "nodebuffer" }),
    );

    const { code, stdout } = run(["--path", xmindFile, "--project", TEST_PROJECT, "--force"]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as {
      converted: number;
      files: { output: string; status: string }[];
    };
    expect(out.converted).toBe(1);
    expect(
      out.files[0].output.endsWith("/需求A【需求变更】.md").toBeTruthy(),
      `output should strip the embedded ticket token, got: ${out.files[0].output}`,
    );

    const contentText = readFileSync(out.files[0].output, "utf8");
    expect(contentText).toMatch(/suite_name: "需求A（#3001）【需求变更】"/);
    expect(contentText).toMatch(/case_id: 3001/);
  });
});
