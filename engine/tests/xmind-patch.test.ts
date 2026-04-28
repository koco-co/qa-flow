import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, it, expect } from "bun:test";
import JSZip from "jszip";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const FIXTURE = join(import.meta.dirname, "fixtures/sample-cases.json");
const TMP_DIR = join(tmpdir(), `kata-xmind-patch-test-${process.pid}`);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function runGen(args: string[]): {
  stdout: string;
  stderr: string;
  code: number;
} {
  try {
    const stdout = execFileSync(
      "kata-cli",
      ["xmind-gen", ...args],
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
      "kata-cli",
      ["xmind-patch", ...args],
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
  expect(contentFile).toBeTruthy();
  const str = await contentFile.async("string");
  return JSON.parse(str);
}

/** Create a fresh test .xmind file from the fixture */
function createTestXmind(name: string): string {
  const outputPath = join(TMP_DIR, `${name}.xmind`);
  const { code, stderr } = runGen(["--input", FIXTURE, "--output", outputPath]);
  expect(code).toBe(0);
  return outputPath;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

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

// ─── search ──────────────────────────────────────────────────────────────────

describe("xmind-patch search", () => {
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
    expect(code).toBe(0);

    const results = JSON.parse(stdout) as {
      file: string;
      tree_path: string[];
      title: string;
      priority: string;
    }[];

    expect(Array.isArray(results).toBeTruthy(), "result should be an array");
    expect(results.length > 0).toBeTruthy();

    const match = results.find((r) => r.title === "验证默认加载列表页");
    expect(match).toBeTruthy();
    expect(match.file).toBe(xmindPath);
    expect(match.priority).toBe("P0");
    expect(Array.isArray(match.tree_path).toBeTruthy(), "tree_path should be an array");
    expect(
      match.tree_path.includes("验证默认加载列表页").toBeTruthy(),
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
    expect(code).toBe(0);
    const results = JSON.parse(stdout) as unknown[];
    expect(Array.isArray(results).toBeTruthy());
    expect(results.length).toBe(0);
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
    expect(code).toBe(0);
    const results = JSON.parse(stdout) as unknown[];
    expect(
      results.length <= 2,
      `got ${results.length} results, expected at most 2`,
    ).toBeTruthy();
  });
});

// ─── show ─────────────────────────────────────────────────────────────────────

describe("xmind-patch show", () => {
  it("displays full case details for a matching title", () => {
    const xmindPath = createTestXmind("show-test");
    const { code, stdout, stderr } = runEdit([
      "show",
      "--file",
      xmindPath,
      "--title",
      "验证默认加载列表页",
    ]);
    expect(code).toBe(0);

    const caseData = JSON.parse(stdout) as {
      title: string;
      priority: string;
      preconditions?: string;
      steps: { step: string; expected: string }[];
      tree_path: string[];
    };

    expect(caseData.title).toBe("验证默认加载列表页");
    expect(caseData.priority).toBe("P0");
    expect(caseData.preconditions).toBeTruthy();
    expect(caseData.preconditions!).toMatch(/环境已部署/);
    expect(Array.isArray(caseData.steps).toBeTruthy(), "steps should be an array");
    expect(caseData.steps.length > 0).toBeTruthy();
    expect(caseData.steps[0].step).toBe("进入【数据质量 → 质量问题台账】页面");
    expect(caseData.steps[0].expected).toBe("页面正常加载");
    expect(Array.isArray(caseData.tree_path).toBeTruthy(), "tree_path should be present");
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
    expect(code).toBe(1);
    expect(stderr).toMatch(/No topic found/);
  });
});

// ─── patch ────────────────────────────────────────────────────────────────────

describe("xmind-patch patch", () => {
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as {
      before: { priority: string };
      after: { priority: string };
    };
    expect(result.before.priority).toBe("P0");
    expect(result.after.priority).toBe("P2");

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
    expect(rootTopic).toBeTruthy();
    const caseNode = findByTitle(rootTopic, "验证默认加载列表页");
    expect(caseNode).toBeTruthy();
    expect(caseNode.markers?.some((m) => m.markerId === "priority-3")).toBeTruthy();
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
    expect(code).toBe(0);

    // Verify file was updated with new steps
    const { code: showCode, stdout: showOut } = runEdit([
      "show",
      "--file",
      xmindPath,
      "--title",
      "验证翻页功能",
    ]);
    expect(showCode).toBe(0);
    const updated = JSON.parse(showOut) as {
      steps: { step: string; expected: string }[];
    };
    expect(updated.steps.length).toBe(2);
    expect(updated.steps[0].step).toBe("打开页面");
    expect(updated.steps[1].expected).toBe("弹出确认框");
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
    expect(showCode1).toBe(0);
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
    expect(code).toBe(0);

    const { code: showCode2, stdout: showOut2 } = runEdit([
      "show",
      "--file",
      xmindPath,
      "--title",
      "验证默认加载列表页",
    ]);
    expect(showCode2).toBe(0);
    const after = JSON.parse(showOut2) as {
      priority: string;
      preconditions?: string;
      steps: unknown[];
    };

    // Priority was patched
    expect(after.priority).toBe("P1");
    // Preconditions untouched
    expect(after.preconditions).toBe(before.preconditions);
    // Steps untouched
    expect(after.steps.length).toBe(before.steps.length);
  });

  it("dry-run previews patch without mutating the file", async () => {
    const xmindPath = createTestXmind("patch-dry-run");
    const beforeFile = readFileSync(xmindPath);
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as {
      dry_run: boolean;
      before: { title: string; priority: string };
      after: { title: string; priority: string };
      file: string;
    };
    expect(result.dry_run).toBe(true);
    expect(result.before.title).toBe("验证默认加载列表页");
    expect(result.before.priority).toBe("P0");
    expect(result.after.title).toBe("验证默认加载列表页（预览）");
    expect(result.after.priority).toBe("P2");
    expect(result.file).toBe(xmindPath);

    const afterFile = readFileSync(xmindPath);
    const afterContent = await readContentJson(xmindPath);
    expect(afterFile).toEqual(beforeFile);
    expect(afterContent).toEqual(beforeContent);
  });
});

// ─── add ──────────────────────────────────────────────────────────────────────

describe("xmind-patch add", () => {
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as {
      added: { title: string; priority: string };
      parent: string[];
      file: string;
    };
    expect(result.added.title).toBe("验证新增的测试用例");
    expect(result.added.priority).toBe("P1");
    expect(result.file).toBe(xmindPath);

    // Verify we can find the added case via show
    const { code: showCode, stdout: showOut } = runEdit([
      "show",
      "--file",
      xmindPath,
      "--title",
      "验证新增的测试用例",
    ]);
    expect(showCode).toBe(0);
    const shown = JSON.parse(showOut) as {
      title: string;
      steps: { step: string; expected: string }[];
    };
    expect(shown.title).toBe("验证新增的测试用例");
    expect(shown.steps[0].step).toBe("进入页面");
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
    expect(code).toBe(1);
    expect(stderr).toMatch(/No parent topic found/);
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
    expect(c1).toBe(0);
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
    expect(c2).toBe(0);
    const after = (JSON.parse(s2) as unknown[]).filter((r) => {
      const rec = r as { file: string };
      return rec.file === xmindPath;
    }).length;

    expect(
      after > before,
      `after (${after}).toBeTruthy() should be greater than before (${before})`,
    );
  });

  it("dry-run previews add without mutating the file", async () => {
    const xmindPath = createTestXmind("add-dry-run");
    const beforeFile = readFileSync(xmindPath);
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as {
      dry_run: boolean;
      would_add: { title: string; priority: string };
      parent: string[];
      file: string;
    };
    expect(result.dry_run).toBe(true);
    expect(result.would_add.title).toBe("验证仅预览新增用例");
    expect(result.would_add.priority).toBe("P1");
    expect(result.parent.at(-1)).toBe("搜索筛选");
    expect(result.file).toBe(xmindPath);

    const afterFile = readFileSync(xmindPath);
    const afterContent = await readContentJson(xmindPath);
    expect(afterFile).toEqual(beforeFile);
    expect(afterContent).toEqual(beforeContent);

    const { code: showCode } = runEdit([
      "show",
      "--file",
      xmindPath,
      "--title",
      "验证仅预览新增用例",
    ]);
    expect(showCode).toBe(1);
  });
});

// ─── delete ───────────────────────────────────────────────────────────────────

describe("xmind-patch delete", () => {
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
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as {
      dry_run: boolean;
      would_delete: { title: string };
      file: string;
    };
    expect(result.dry_run).toBe(true);
    expect(result.would_delete.title).toBe("验证翻页功能");

    // File should NOT be modified — case should still exist
    const { code: showCode } = runEdit([
      "show",
      "--file",
      xmindPath,
      "--title",
      "验证翻页功能",
    ]);
    expect(showCode).toBe(0);
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
    expect(pre).toBe(0);

    // Delete
    const { code, stdout, stderr } = runEdit([
      "delete",
      "--file",
      xmindPath,
      "--title",
      "验证翻页功能",
    ]);
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as {
      deleted: { title: string };
      file: string;
    };
    expect(result.deleted.title).toBe("验证翻页功能");
    expect(result.file).toBe(xmindPath);

    // Verify case no longer exists
    const { code: post } = runEdit([
      "show",
      "--file",
      xmindPath,
      "--title",
      "验证翻页功能",
    ]);
    expect(post).toBe(1);
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
    expect(code).toBe(1);
    expect(stderr).toMatch(/No topic found/);
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
    expect(code).toBe(0);

    // The deleted case should be gone
    const { code: c1 } = runEdit([
      "show",
      "--file",
      xmindPath,
      "--title",
      "验证按问题类型筛选",
    ]);
    expect(c1).toBe(1);

    // Another case in same group should still exist
    const { code: c2 } = runEdit([
      "show",
      "--file",
      xmindPath,
      "--title",
      "验证默认加载列表页",
    ]);
    expect(c2).toBe(0);
  });
});

// ─── --help ───────────────────────────────────────────────────────────────────

describe("xmind-patch --help", () => {
  it("outputs usage information", () => {
    const { stdout, stderr, code } = runEdit(["--help"]);
    const output = stdout + stderr;
    expect(code).toBe(0);
    expect(output).toMatch(/xmind-patch/);
    expect(output).toMatch(/search/);
    expect(output).toMatch(/show/);
    expect(output).toMatch(/patch/);
    expect(output).toMatch(/add/);
    expect(output).toMatch(/delete/);
  });
});
