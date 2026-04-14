import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import JSZip from "jszip";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const FIXTURE = join(import.meta.dirname, "fixtures/sample-cases.json");
const TMP_DIR = join(tmpdir(), `qa-flow-xmind-edit-test-${process.pid}`);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function runGen(args: string[]): {
  stdout: string;
  stderr: string;
  code: number;
} {
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

function runEdit(args: string[]): {
  stdout: string;
  stderr: string;
  code: number;
} {
  try {
    const stdout = execFileSync(
      "bun",
      ["run", ".claude/scripts/xmind-edit.ts", ...args],
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

async function readContentJson(
  xmindPath: string,
): Promise<
  { rootTopic?: { title?: string; children?: { attached?: unknown[] } } }[]
> {
  const buffer = readFileSync(xmindPath);
  const zip = await JSZip.loadAsync(buffer);
  const contentFile = zip.file("content.json");
  assert.ok(contentFile, "content.json not found in .xmind archive");
  const str = await contentFile.async("string");
  return JSON.parse(str);
}

/** Create a fresh test .xmind file from the fixture */
function createTestXmind(name: string): string {
  const outputPath = join(TMP_DIR, `${name}.xmind`);
  const { code, stderr } = runGen(["--input", FIXTURE, "--output", outputPath]);
  assert.equal(code, 0, `xmind-gen failed: ${stderr}`);
  return outputPath;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

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

// ─── search ──────────────────────────────────────────────────────────────────

describe("xmind-edit search", () => {
  it("finds cases by keyword across xmind files", () => {
    const xmindPath = createTestXmind("search-test");
    const { code, stdout, stderr } = runEdit([
      "search",
      "验证默认加载",
      "--dir",
      TMP_DIR,
      "--limit",
      "10",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const results = JSON.parse(stdout) as {
      file: string;
      tree_path: string[];
      title: string;
      priority: string;
    }[];

    assert.ok(Array.isArray(results), "result should be an array");
    assert.ok(results.length > 0, "should find at least one match");

    const match = results.find((r) => r.title === "验证默认加载列表页");
    assert.ok(match, "should find '验证默认加载列表页'");
    assert.equal(match.file, xmindPath);
    assert.equal(match.priority, "P0");
    assert.ok(Array.isArray(match.tree_path), "tree_path should be an array");
    assert.ok(
      match.tree_path.includes("验证默认加载列表页"),
      "tree_path should contain case title",
    );
  });

  it("returns empty array when no matches found", () => {
    createTestXmind("search-no-match");
    const { code, stdout } = runEdit([
      "search",
      "XXXXXXXXXXX_DEFINITELY_NOT_THERE",
      "--dir",
      TMP_DIR,
    ]);
    assert.equal(code, 0);
    const results = JSON.parse(stdout) as unknown[];
    assert.ok(Array.isArray(results));
    assert.equal(results.length, 0);
  });

  it("respects --limit option", () => {
    createTestXmind("search-limit");
    const { code, stdout } = runEdit([
      "search",
      "验证",
      "--dir",
      TMP_DIR,
      "--limit",
      "2",
    ]);
    assert.equal(code, 0);
    const results = JSON.parse(stdout) as unknown[];
    assert.ok(
      results.length <= 2,
      `got ${results.length} results, expected at most 2`,
    );
  });
});

// ─── show ─────────────────────────────────────────────────────────────────────

describe("xmind-edit show", () => {
  it("displays full case details for a matching title", () => {
    const xmindPath = createTestXmind("show-test");
    const { code, stdout, stderr } = runEdit([
      "show",
      "--file",
      xmindPath,
      "--title",
      "验证默认加载列表页",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const caseData = JSON.parse(stdout) as {
      title: string;
      priority: string;
      preconditions?: string;
      steps: { step: string; expected: string }[];
      tree_path: string[];
    };

    assert.equal(caseData.title, "验证默认加载列表页");
    assert.equal(caseData.priority, "P0");
    assert.ok(caseData.preconditions, "preconditions should be present");
    assert.match(caseData.preconditions!, /环境已部署/);
    assert.ok(Array.isArray(caseData.steps), "steps should be an array");
    assert.ok(caseData.steps.length > 0, "should have at least one step");
    assert.equal(caseData.steps[0].step, "进入【数据质量 → 质量问题台账】页面");
    assert.equal(caseData.steps[0].expected, "页面正常加载");
    assert.ok(Array.isArray(caseData.tree_path), "tree_path should be present");
  });

  it("exits with code 1 when title is not found", () => {
    const xmindPath = createTestXmind("show-not-found");
    const { code, stderr } = runEdit([
      "show",
      "--file",
      xmindPath,
      "--title",
      "XXXX_NOT_EXIST",
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /No topic found/);
  });
});

// ─── patch ────────────────────────────────────────────────────────────────────

describe("xmind-edit patch", () => {
  it("patches priority of an existing case", async () => {
    const xmindPath = createTestXmind("patch-priority");
    const patch = JSON.stringify({ priority: "P2" });

    const { code, stdout, stderr } = runEdit([
      "patch",
      "--file",
      xmindPath,
      "--title",
      "验证默认加载列表页",
      "--case-json",
      patch,
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as {
      before: { priority: string };
      after: { priority: string };
    };
    assert.equal(result.before.priority, "P0");
    assert.equal(result.after.priority, "P2");

    // Verify actual file was updated
    const sheets = await readContentJson(xmindPath);
    type SheetNode = {
      title?: string;
      children?: { attached?: SheetNode[] };
      markers?: { markerId: string }[];
    };
    function findByTitle(
      node: SheetNode,
      title: string,
    ): SheetNode | undefined {
      if (node.title === title) return node;
      for (const child of node.children?.attached ?? []) {
        const found = findByTitle(child as SheetNode, title);
        if (found) return found;
      }
      return undefined;
    }
    const rootTopic = (sheets[0] as { rootTopic?: SheetNode }).rootTopic;
    assert.ok(rootTopic);
    const caseNode = findByTitle(rootTopic, "验证默认加载列表页");
    assert.ok(caseNode, "case node should exist after patch");
    assert.ok(
      caseNode.markers?.some((m) => m.markerId === "priority-3"),
      "marker should be priority-3 (P2)",
    );
  });

  it("patches steps of an existing case", async () => {
    const xmindPath = createTestXmind("patch-steps");
    const newSteps = [
      { step: "打开页面", expected: "加载完成" },
      { step: "点击按钮", expected: "弹出确认框" },
    ];
    const patch = JSON.stringify({ steps: newSteps });

    const { code, stderr } = runEdit([
      "patch",
      "--file",
      xmindPath,
      "--title",
      "验证翻页功能",
      "--case-json",
      patch,
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    // Verify file was updated with new steps
    const { code: showCode, stdout: showOut } = runEdit([
      "show",
      "--file",
      xmindPath,
      "--title",
      "验证翻页功能",
    ]);
    assert.equal(showCode, 0);
    const updated = JSON.parse(showOut) as {
      steps: { step: string; expected: string }[];
    };
    assert.equal(updated.steps.length, 2);
    assert.equal(updated.steps[0].step, "打开页面");
    assert.equal(updated.steps[1].expected, "弹出确认框");
  });

  it("keeps non-patched fields intact", () => {
    const xmindPath = createTestXmind("patch-keep");
    const patch = JSON.stringify({ priority: "P1" });

    const { code: showCode1, stdout: showOut1 } = runEdit([
      "show",
      "--file",
      xmindPath,
      "--title",
      "验证默认加载列表页",
    ]);
    assert.equal(showCode1, 0);
    const before = JSON.parse(showOut1) as {
      preconditions?: string;
      steps: unknown[];
    };

    const { code } = runEdit([
      "patch",
      "--file",
      xmindPath,
      "--title",
      "验证默认加载列表页",
      "--case-json",
      patch,
    ]);
    assert.equal(code, 0);

    const { code: showCode2, stdout: showOut2 } = runEdit([
      "show",
      "--file",
      xmindPath,
      "--title",
      "验证默认加载列表页",
    ]);
    assert.equal(showCode2, 0);
    const after = JSON.parse(showOut2) as {
      priority: string;
      preconditions?: string;
      steps: unknown[];
    };

    // Priority was patched
    assert.equal(after.priority, "P1");
    // Preconditions untouched
    assert.equal(after.preconditions, before.preconditions);
    // Steps untouched
    assert.equal(after.steps.length, before.steps.length);
  });

  it("dry-run previews patch without mutating the file", async () => {
    const xmindPath = createTestXmind("patch-dry-run");
    const beforeContent = await readContentJson(xmindPath);
    const patch = JSON.stringify({
      title: "验证默认加载列表页（预览）",
      priority: "P2",
    });

    const { code, stdout, stderr } = runEdit([
      "patch",
      "--file",
      xmindPath,
      "--title",
      "验证默认加载列表页",
      "--case-json",
      patch,
      "--dry-run",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as {
      dry_run: boolean;
      before: { title: string; priority: string };
      after: { title: string; priority: string };
      file: string;
    };
    assert.equal(result.dry_run, true);
    assert.equal(result.before.title, "验证默认加载列表页");
    assert.equal(result.before.priority, "P0");
    assert.equal(result.after.title, "验证默认加载列表页（预览）");
    assert.equal(result.after.priority, "P2");
    assert.equal(result.file, xmindPath);

    const afterContent = await readContentJson(xmindPath);
    assert.deepEqual(afterContent, beforeContent);
  });
});

// ─── add ──────────────────────────────────────────────────────────────────────

describe("xmind-edit add", () => {
  it("inserts a new case under a parent topic", async () => {
    const xmindPath = createTestXmind("add-test");
    const newCase = JSON.stringify({
      title: "验证新增的测试用例",
      priority: "P1",
      preconditions: "测试前提条件",
      steps: [
        { step: "进入页面", expected: "页面正常加载" },
        { step: "执行操作", expected: "操作成功" },
      ],
    });

    const { code, stdout, stderr } = runEdit([
      "add",
      "--file",
      xmindPath,
      "--parent",
      "搜索筛选",
      "--case-json",
      newCase,
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as {
      added: { title: string; priority: string };
      parent: string[];
      file: string;
    };
    assert.equal(result.added.title, "验证新增的测试用例");
    assert.equal(result.added.priority, "P1");
    assert.equal(result.file, xmindPath);

    // Verify we can find the added case via show
    const { code: showCode, stdout: showOut } = runEdit([
      "show",
      "--file",
      xmindPath,
      "--title",
      "验证新增的测试用例",
    ]);
    assert.equal(showCode, 0, "should be able to show newly added case");
    const shown = JSON.parse(showOut) as {
      title: string;
      steps: { step: string; expected: string }[];
    };
    assert.equal(shown.title, "验证新增的测试用例");
    assert.equal(shown.steps[0].step, "进入页面");
  });

  it("exits with code 1 when parent not found", () => {
    const xmindPath = createTestXmind("add-no-parent");
    const newCase = JSON.stringify({
      title: "测试",
      priority: "P1",
      steps: [],
    });

    const { code, stderr } = runEdit([
      "add",
      "--file",
      xmindPath,
      "--parent",
      "XXXX_NOT_EXIST",
      "--case-json",
      newCase,
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /No parent topic found/);
  });

  it("counts increase after add", () => {
    const xmindPath = createTestXmind("add-count");

    // Count before
    const { code: c1, stdout: s1 } = runEdit([
      "search",
      "验证",
      "--dir",
      TMP_DIR,
      "--limit",
      "100",
    ]);
    assert.equal(c1, 0);
    const before = (JSON.parse(s1) as unknown[]).filter((r) => {
      const rec = r as { file: string };
      return rec.file === xmindPath;
    }).length;

    const newCase = JSON.stringify({
      title: "验证计数增加用例",
      priority: "P2",
      steps: [],
    });
    runEdit([
      "add",
      "--file",
      xmindPath,
      "--parent",
      "新增页",
      "--case-json",
      newCase,
    ]);

    const { code: c2, stdout: s2 } = runEdit([
      "search",
      "验证",
      "--dir",
      TMP_DIR,
      "--limit",
      "100",
    ]);
    assert.equal(c2, 0);
    const after = (JSON.parse(s2) as unknown[]).filter((r) => {
      const rec = r as { file: string };
      return rec.file === xmindPath;
    }).length;

    assert.ok(
      after > before,
      `after (${after}) should be greater than before (${before})`,
    );
  });

  it("dry-run previews add without mutating the file", async () => {
    const xmindPath = createTestXmind("add-dry-run");
    const beforeContent = await readContentJson(xmindPath);
    const newCase = JSON.stringify({
      title: "验证仅预览新增用例",
      priority: "P1",
      preconditions: "预览前置条件",
      steps: [{ step: "进入页面", expected: "页面正常加载" }],
    });

    const { code, stdout, stderr } = runEdit([
      "add",
      "--file",
      xmindPath,
      "--parent",
      "搜索筛选",
      "--case-json",
      newCase,
      "--dry-run",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as {
      dry_run: boolean;
      would_add: { title: string; priority: string };
      parent: string[];
      file: string;
    };
    assert.equal(result.dry_run, true);
    assert.equal(result.would_add.title, "验证仅预览新增用例");
    assert.equal(result.would_add.priority, "P1");
    assert.equal(result.parent.at(-1), "搜索筛选");
    assert.equal(result.file, xmindPath);

    const afterContent = await readContentJson(xmindPath);
    assert.deepEqual(afterContent, beforeContent);

    const { code: showCode } = runEdit([
      "show",
      "--file",
      xmindPath,
      "--title",
      "验证仅预览新增用例",
    ]);
    assert.equal(showCode, 1, "dry-run should not persist the new case");
  });
});

// ─── delete ───────────────────────────────────────────────────────────────────

describe("xmind-edit delete", () => {
  it("dry-run shows what would be deleted without modifying the file", async () => {
    const xmindPath = createTestXmind("delete-dry-run");

    const { code, stdout, stderr } = runEdit([
      "delete",
      "--file",
      xmindPath,
      "--title",
      "验证翻页功能",
      "--dry-run",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as {
      dry_run: boolean;
      would_delete: { title: string };
      file: string;
    };
    assert.equal(result.dry_run, true);
    assert.equal(result.would_delete.title, "验证翻页功能");

    // File should NOT be modified — case should still exist
    const { code: showCode } = runEdit([
      "show",
      "--file",
      xmindPath,
      "--title",
      "验证翻页功能",
    ]);
    assert.equal(showCode, 0, "case should still exist after dry-run");
  });

  it("actually deletes the case (no --dry-run)", () => {
    const xmindPath = createTestXmind("delete-real");

    // Verify case exists
    const { code: pre } = runEdit([
      "show",
      "--file",
      xmindPath,
      "--title",
      "验证翻页功能",
    ]);
    assert.equal(pre, 0, "case should exist before delete");

    // Delete
    const { code, stdout, stderr } = runEdit([
      "delete",
      "--file",
      xmindPath,
      "--title",
      "验证翻页功能",
    ]);
    assert.equal(code, 0, `stderr: ${stderr}`);

    const result = JSON.parse(stdout) as {
      deleted: { title: string };
      file: string;
    };
    assert.equal(result.deleted.title, "验证翻页功能");
    assert.equal(result.file, xmindPath);

    // Verify case no longer exists
    const { code: post } = runEdit([
      "show",
      "--file",
      xmindPath,
      "--title",
      "验证翻页功能",
    ]);
    assert.equal(post, 1, "case should not exist after delete");
  });

  it("exits with code 1 when title is not found", () => {
    const xmindPath = createTestXmind("delete-not-found");
    const { code, stderr } = runEdit([
      "delete",
      "--file",
      xmindPath,
      "--title",
      "XXXX_NOT_EXIST",
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /No topic found/);
  });

  it("deletes a sub-group case and leaves other cases intact", () => {
    const xmindPath = createTestXmind("delete-subgroup");

    // Delete one case from sub-group
    const { code } = runEdit([
      "delete",
      "--file",
      xmindPath,
      "--title",
      "验证按问题类型筛选",
    ]);
    assert.equal(code, 0);

    // The deleted case should be gone
    const { code: c1 } = runEdit([
      "show",
      "--file",
      xmindPath,
      "--title",
      "验证按问题类型筛选",
    ]);
    assert.equal(c1, 1, "deleted case should be gone");

    // Another case in same group should still exist
    const { code: c2 } = runEdit([
      "show",
      "--file",
      xmindPath,
      "--title",
      "验证默认加载列表页",
    ]);
    assert.equal(c2, 0, "sibling case should still exist");
  });
});

// ─── --help ───────────────────────────────────────────────────────────────────

describe("xmind-edit --help", () => {
  it("outputs usage information", () => {
    const { stdout, stderr, code } = runEdit(["--help"]);
    const output = stdout + stderr;
    assert.equal(code, 0);
    assert.match(output, /xmind-edit/);
    assert.match(output, /search/);
    assert.match(output, /show/);
    assert.match(output, /patch/);
    assert.match(output, /add/);
    assert.match(output, /delete/);
  });
});
