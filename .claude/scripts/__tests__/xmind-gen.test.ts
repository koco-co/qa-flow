import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import JSZip from "jszip";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const FIXTURE = join(import.meta.dirname, "fixtures/sample-cases.json");
const TMP_DIR = join(tmpdir(), `qa-flow-xmind-test-${process.pid}`);

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "bun",
      ["run", ".claude/scripts/xmind-gen.ts", ...args],
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

async function readContentJson(xmindPath: string): Promise<unknown> {
  const buffer = readFileSync(xmindPath);
  const zip = await JSZip.loadAsync(buffer);
  const contentFile = zip.file("content.json");
  assert.ok(contentFile, "content.json not found in .xmind archive");
  const str = await contentFile.async("string");
  return JSON.parse(str);
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

describe("xmind-gen.ts --help", () => {
  it("outputs usage information", () => {
    const { stdout, stderr, code } = run(["--help"]);
    const output = stdout + stderr;
    assert.equal(code, 0);
    assert.match(output, /xmind-gen/);
    assert.match(output, /--input/);
    assert.match(output, /--output/);
    assert.match(output, /--mode/);
  });
});

describe("xmind-gen.ts create mode", () => {
  it("creates .xmind file from valid JSON fixture", () => {
    const output = join(TMP_DIR, "test-create.xmind");
    const { code, stderr } = run(["--input", FIXTURE, "--output", output]);
    assert.equal(code, 0, `stderr: ${stderr}`);
    assert.ok(existsSync(output), ".xmind file was not created");
    assert.ok(statSync(output).size > 0, ".xmind file is empty");
  });

  it("outputs valid JSON result to stdout", () => {
    const output = join(TMP_DIR, "test-stdout.xmind");
    const { code, stdout, stderr } = run([
      "--input",
      FIXTURE,
      "--output",
      output,
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as {
      output_path: string;
      mode: string;
      root_title: string;
      l1_title: string;
      case_count: number;
    };

    assert.equal(result.root_title, "数据资产v6.4.10迭代用例(#23)");
    assert.equal(result.l1_title, "质量问题台账");
    assert.equal(result.mode, "create");
    assert.ok(result.output_path.endsWith("test-stdout.xmind"));
    // 3 sub_group cases + 1 page-level case (列表页) + 1 page-level case (新增页) = 5
    assert.equal(result.case_count, 5);
  });

  it("exits with code 1 if output file already exists", () => {
    const output = join(TMP_DIR, "test-existing.xmind");
    // Create first time (should succeed)
    const first = run(["--input", FIXTURE, "--output", output]);
    assert.equal(first.code, 0);

    // Create again (should fail)
    const second = run(["--input", FIXTURE, "--output", output]);
    assert.equal(second.code, 1);
    assert.match(second.stderr, /already exists/);
  });

  it("uses frontmatter root_name before CLI project name for md input", async () => {
    const input = join(TMP_DIR, "root-name-precedence.md");
    const output = join(TMP_DIR, "root-name-precedence.xmind");
    const archiveMd = `---
suite_name: "质量问题台账"
root_name: "自定义 Root 节点"
prd_version: "v6.4.10"
---

## 质量问题台账

### 列表页

#### 搜索筛选

##### 【P1】验证按问题类型筛选

> 前置条件

\`\`\`
已准备测试数据
\`\`\`

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 质量问题台账】页面 | 页面正常加载 |
`;
    writeFileSync(input, archiveMd, "utf8");

    const { code, stdout, stderr } = run([
      "--input",
      input,
      "--output",
      output,
      "--project",
      "CLI项目名",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);
    assert.ok(
      stdout.includes("自定义 Root 节点") || existsSync(output),
      "xmind-gen should finish and create the output file",
    );

    const sheets = (await readContentJson(output)) as {
      rootTopic?: { title?: string };
    }[];
    assert.equal(sheets[0]?.rootTopic?.title, "自定义 Root 节点");
  });
});

describe("xmind-gen.ts validation", () => {
  it("exits with code 1 when meta.project_name is missing", () => {
    const badFixture = join(TMP_DIR, "missing-project-name.json");
    const data = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<
      string,
      unknown
    >;
    const meta = { ...(data.meta as Record<string, unknown>) };
    delete meta.project_name;
    const badData = { ...data, meta };
    writeFileSync(badFixture, JSON.stringify(badData));

    const output = join(TMP_DIR, "bad-output-1.xmind");
    const { code, stderr } = run(["--input", badFixture, "--output", output]);
    assert.equal(code, 1);
    assert.match(stderr, /project_name/);
  });

  it("exits with code 1 when modules is empty", () => {
    const badFixture = join(TMP_DIR, "empty-modules.json");
    const data = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<
      string,
      unknown
    >;
    const badData = { ...data, modules: [] };
    writeFileSync(badFixture, JSON.stringify(badData));

    const output = join(TMP_DIR, "bad-output-2.xmind");
    const { code, stderr } = run(["--input", badFixture, "--output", output]);
    assert.equal(code, 1);
    assert.match(stderr, /modules/);
  });

  it("exits with code 1 for invalid --mode value", () => {
    const output = join(TMP_DIR, "bad-mode.xmind");
    const { code, stderr } = run([
      "--input",
      FIXTURE,
      "--output",
      output,
      "--mode",
      "invalid",
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /mode/i);
  });
});

describe("xmind-gen.ts content.json validation", () => {
  it("created .xmind contains valid content.json", async () => {
    const output = join(TMP_DIR, "test-content.xmind");
    const { code, stderr } = run(["--input", FIXTURE, "--output", output]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const sheets = await readContentJson(output);
    assert.ok(
      Array.isArray(sheets),
      "content.json should be an array of sheets",
    );
    assert.ok(
      (sheets as unknown[]).length > 0,
      "content.json should have at least one sheet",
    );
  });

  it("content.json has correct hierarchy: root → L1 → L2 → L3 → cases", async () => {
    const output = join(TMP_DIR, "test-hierarchy.xmind");
    const { code, stderr } = run(["--input", FIXTURE, "--output", output]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    type SheetNode = {
      title?: string;
      children?: { attached?: SheetNode[] };
      markers?: { markerId: string }[];
      notes?: { plain: { content: string } };
    };
    type Sheet = { rootTopic?: SheetNode };

    const sheets = (await readContentJson(output)) as Sheet[];
    const rootTopic = sheets[0]?.rootTopic;
    assert.ok(rootTopic, "rootTopic missing");

    // Root title
    assert.equal(
      rootTopic.title,
      "数据资产v6.4.10迭代用例(#23)",
      "root title mismatch",
    );

    // L1: requirement_name with version prefix
    const l1Nodes = rootTopic.children?.attached ?? [];
    assert.ok(l1Nodes.length > 0, "L1 nodes missing");
    const l1 = l1Nodes[0];
    assert.equal(l1.title, "质量问题台账", "L1 title mismatch");

    // L2: module name
    const l2Nodes = l1.children?.attached ?? [];
    assert.ok(l2Nodes.length > 0, "L2 (module) nodes missing");
    const l2 = l2Nodes[0];
    assert.equal(l2.title, "质量问题台账", "L2 module title mismatch");

    // L3: page name
    const l3Nodes = l2.children?.attached ?? [];
    assert.ok(l3Nodes.length > 0, "L3 (page) nodes missing");
    const l3 = l3Nodes[0];
    assert.equal(l3.title, "列表页", "L3 page title mismatch");

    // L4: sub_group
    const l4Nodes = l3.children?.attached ?? [];
    assert.ok(l4Nodes.length > 0, "L4 nodes missing");
    // First child should be the sub_group
    const l4SubGroup = l4Nodes[0];
    assert.equal(l4SubGroup.title, "搜索筛选", "L4 sub_group title mismatch");

    // Case under sub_group
    const caseNodes = l4SubGroup.children?.attached ?? [];
    assert.ok(caseNodes.length > 0, "case nodes missing");
    const firstCase = caseNodes[0];
    assert.equal(firstCase.title, "验证默认加载列表页", "case title mismatch");

    // Priority marker present
    assert.ok(
      firstCase.markers && firstCase.markers.length > 0,
      "priority marker missing on P0 case",
    );

    // Precondition note present
    assert.ok(
      firstCase.notes?.plain?.content,
      "precondition note missing on P0 case",
    );
    assert.match(firstCase.notes!.plain.content, /环境已部署/);

    // Step → expected hierarchy
    const stepNodes = firstCase.children?.attached ?? [];
    assert.ok(stepNodes.length > 0, "step nodes missing");
    assert.equal(
      stepNodes[0].title,
      "进入【数据质量 → 质量问题台账】页面",
      "step title mismatch",
    );
    const expectedNodes = stepNodes[0].children?.attached ?? [];
    assert.ok(expectedNodes.length > 0, "expected result node missing");
    assert.equal(
      expectedNodes[0].title,
      "页面正常加载",
      "expected result mismatch",
    );
  });
});

describe("xmind-gen.ts append mode", () => {
  it("appends L1 node to existing .xmind without replacing", async () => {
    const output = join(TMP_DIR, "test-append.xmind");

    // Create first
    const first = run(["--input", FIXTURE, "--output", output]);
    assert.equal(first.code, 0);

    // Build a second input with different requirement
    const data = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<
      string,
      unknown
    >;
    const meta = {
      ...(data.meta as Record<string, unknown>),
      requirement_name: "数据质量规则",
      version: "v6.4.11",
    };
    const secondFixture = join(TMP_DIR, "second-input.json");
    writeFileSync(secondFixture, JSON.stringify({ ...data, meta }));

    const second = run([
      "--input",
      secondFixture,
      "--output",
      output,
      "--mode",
      "append",
    ]);
    assert.equal(second.code, 0, `stderr: ${second.stderr}`);

    type SheetNode = { title?: string; children?: { attached?: SheetNode[] } };
    type Sheet = { rootTopic?: SheetNode };

    const sheets = (await readContentJson(output)) as Sheet[];
    const attached = sheets[0]?.rootTopic?.children?.attached ?? [];
    assert.ok(attached.length >= 2, "Should have 2 L1 nodes after append");

    const titles = attached.map((n) => n.title);
    assert.ok(titles.includes("质量问题台账"), "Original L1 should be present");
    assert.ok(titles.includes("数据质量规则"), "Appended L1 should be present");
  });

  it("creates new file if output does not exist in append mode", () => {
    const output = join(TMP_DIR, "test-append-new.xmind");
    assert.ok(!existsSync(output));

    const { code, stderr } = run([
      "--input",
      FIXTURE,
      "--output",
      output,
      "--mode",
      "append",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);
    assert.ok(existsSync(output), "file should have been created");
  });
});

describe("xmind-gen.ts <br> tag sanitization", () => {
  const BR_FIXTURE = join(
    import.meta.dirname,
    "fixtures/sample-cases-with-br.json",
  );

  it("converts <br> tags to newlines in step, expected, and preconditions", async () => {
    const output = join(TMP_DIR, "test-br-sanitize.xmind");
    const { code, stderr } = run(["--input", BR_FIXTURE, "--output", output]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    type SheetNode = {
      title?: string;
      children?: { attached?: SheetNode[] };
      notes?: { plain: { content: string } };
    };
    type Sheet = { rootTopic?: SheetNode };

    const sheets = (await readContentJson(output)) as Sheet[];
    const root = sheets[0]?.rootTopic;
    assert.ok(root);

    // Navigate to the case node: root → L1 → L2 → L3 → L4(sub_group) → case
    const l1 = root.children?.attached?.[0];
    assert.ok(l1);
    const l2 = l1.children?.attached?.[0];
    assert.ok(l2);
    const l3 = l2.children?.attached?.[0];
    assert.ok(l3);
    const l4SubGroup = l3.children?.attached?.[0];
    assert.ok(l4SubGroup, "sub_group node missing");
    const caseNode = l4SubGroup.children?.attached?.[0];
    assert.ok(caseNode, "case node missing");

    // Preconditions should have <br> converted to \n
    assert.ok(caseNode.notes?.plain?.content, "precondition note missing");
    assert.ok(
      !caseNode.notes!.plain.content.includes("<br"),
      "preconditions still contains <br> tag",
    );
    assert.ok(
      caseNode.notes!.plain.content.includes("\n"),
      "preconditions should contain newline",
    );

    // Step nodes
    const stepNodes = caseNode.children?.attached ?? [];
    assert.ok(stepNodes.length >= 2, "should have at least 2 steps");

    // Second step has <br> in both step and expected
    const step2 = stepNodes[1];
    assert.ok(step2.title, "step 2 title missing");
    assert.ok(
      !step2.title!.includes("<br"),
      `step title still contains <br> tag: ${step2.title}`,
    );
    assert.ok(
      step2.title!.includes("\n"),
      "step title should contain newline after <br> conversion",
    );

    // Expected of step 2
    const expected2 = step2.children?.attached?.[0];
    assert.ok(expected2?.title, "expected 2 title missing");
    assert.ok(
      !expected2!.title!.includes("<br"),
      `expected title still contains <br> tag: ${expected2!.title}`,
    );
    assert.ok(
      expected2!.title!.includes("\n"),
      "expected title should contain newline after <br> conversion",
    );
  });
});

describe("xmind-gen.ts L1 title strips trailing (#id)", () => {
  it("l1_title strips trailing (#23) from requirement_name", () => {
    const fixture = join(TMP_DIR, "l1-strip.json");
    const data = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<
      string,
      unknown
    >;
    const meta = {
      ...(data.meta as Record<string, unknown>),
      requirement_name: "质量问题台账(#23)",
    };
    writeFileSync(fixture, JSON.stringify({ ...data, meta }));

    const output = join(TMP_DIR, "test-l1-strip.xmind");
    const { code, stdout, stderr } = run([
      "--input",
      fixture,
      "--output",
      output,
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as { l1_title: string };
    assert.equal(
      result.l1_title,
      "质量问题台账",
      "l1_title should strip trailing (#23)",
    );
  });

  it("l1_title unchanged when no trailing (#id)", () => {
    const output = join(TMP_DIR, "test-l1-no-strip.xmind");
    const { code, stdout, stderr } = run([
      "--input",
      FIXTURE,
      "--output",
      output,
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as { l1_title: string };
    assert.equal(
      result.l1_title,
      "质量问题台账",
      "l1_title should remain unchanged",
    );
  });
});

describe("xmind-gen.ts validation — missing requirement_name", () => {
  it("exits with code 1 when meta.requirement_name is missing", () => {
    const badFixture = join(TMP_DIR, "missing-req-name.json");
    const data = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<
      string,
      unknown
    >;
    const meta = { ...(data.meta as Record<string, unknown>) };
    delete meta.requirement_name;
    writeFileSync(badFixture, JSON.stringify({ ...data, meta }));

    const output = join(TMP_DIR, "bad-output-req.xmind");
    const { code, stderr } = run(["--input", badFixture, "--output", output]);
    assert.equal(code, 1);
    assert.match(stderr, /requirement_name/);
  });
});

describe("xmind-gen.ts replace mode", () => {
  it("replaces matching L1 node in existing .xmind", async () => {
    const output = join(TMP_DIR, "test-replace.xmind");

    // Create original
    const first = run(["--input", FIXTURE, "--output", output]);
    assert.equal(first.code, 0);

    // Build a replacement with same requirement_name but different version
    const data = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<
      string,
      unknown
    >;
    const meta = {
      ...(data.meta as Record<string, unknown>),
      version: "v6.4.99",
    };
    const replaceFixture = join(TMP_DIR, "replace-input.json");
    writeFileSync(replaceFixture, JSON.stringify({ ...data, meta }));

    const second = run([
      "--input",
      replaceFixture,
      "--output",
      output,
      "--mode",
      "replace",
    ]);
    assert.equal(second.code, 0, `stderr: ${second.stderr}`);

    type SheetNode = { title?: string; children?: { attached?: SheetNode[] } };
    type Sheet = { rootTopic?: SheetNode };

    const sheets = (await readContentJson(output)) as Sheet[];
    const attached = sheets[0]?.rootTopic?.children?.attached ?? [];

    // The original L1 should be gone, replaced by the new one
    const titles = attached.map((n) => n.title);
    assert.ok(
      titles.includes("质量问题台账"),
      "L1 should be present (replaced with new version)",
    );
    assert.equal(
      attached.length,
      1,
      "Should still have exactly 1 L1 node after replace",
    );
  });
});
