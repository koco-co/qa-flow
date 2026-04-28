import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  parseBlockMeta,
  readCodeBlocks,
  buildSpecContent,
  mergeSpecs,
} from "../merge-specs.ts";

// ────────────────────────────────────────────────────────────
// parseBlockMeta
// ────────────────────────────────────────────────────────────

describe("parseBlockMeta", () => {
  it("parses valid META line", () => {
    const content = '// META: {"id":"t1","priority":"P0","title":"验证xxx"}\nsome code';
    const meta = parseBlockMeta(content);
    assert.ok(meta);
    assert.equal(meta.id, "t1");
    assert.equal(meta.priority, "P0");
    assert.equal(meta.title, "验证xxx");
  });

  it("returns null for missing META", () => {
    const result = parseBlockMeta("// no meta here\ncode");
    assert.equal(result, null);
  });

  it("returns null for malformed JSON in META", () => {
    const result = parseBlockMeta("// META: {bad json}\ncode");
    assert.equal(result, null);
  });
});

// ────────────────────────────────────────────────────────────
// readCodeBlocks
// ────────────────────────────────────────────────────────────

describe("readCodeBlocks", () => {
  let tmpIn: string;

  before(() => {
    tmpIn = join(tmpdir(), `merge-specs-test-read-${Date.now()}`);
    mkdirSync(tmpIn, { recursive: true });
    writeFileSync(
      join(tmpIn, "t1.ts"),
      '// META: {"id":"t1","priority":"P0","title":"test1"}\nexport const a = 1;\n',
      "utf-8",
    );
    writeFileSync(
      join(tmpIn, "t2.ts"),
      '// META: {"id":"t2","priority":"P1","title":"test2"}\nexport const b = 2;\n',
      "utf-8",
    );
    writeFileSync(join(tmpIn, "skip.ts"), "// no meta\nexport const c = 3;\n", "utf-8");
  });

  after(() => {
    rmSync(tmpIn, { recursive: true, force: true });
  });

  it("reads files with valid META and skips those without", () => {
    const blocks = readCodeBlocks(tmpIn);
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].meta.id, "t1");
    assert.equal(blocks[1].meta.id, "t2");
  });

  it("returns empty array for non-existent directory", () => {
    const blocks = readCodeBlocks("/non/existent/path");
    assert.deepEqual(blocks, []);
  });
});

// ────────────────────────────────────────────────────────────
// buildSpecContent
// ────────────────────────────────────────────────────────────

describe("buildSpecContent", () => {
  const blocks = [
    { meta: { id: "t1", priority: "P0" as const, title: "test1" }, code: "", fileName: "t1" },
    { meta: { id: "t2", priority: "P1" as const, title: "test2" }, code: "", fileName: "t2" },
  ];

  it("generates import lines for each block", () => {
    const content = buildSpecContent(blocks, "全量测试");
    assert.ok(content.includes('import "./t1";'));
    assert.ok(content.includes('import "./t2";'));
  });

  it("returns empty export for zero blocks", () => {
    const content = buildSpecContent([], "冒烟测试");
    assert.ok(content.includes("export {};"));
  });
});

// ────────────────────────────────────────────────────────────
// mergeSpecs — basic
// ────────────────────────────────────────────────────────────

describe("mergeSpecs (basic)", () => {
  let tmpIn: string;
  let tmpOut: string;

  before(() => {
    tmpIn = join(tmpdir(), `merge-specs-test-basic-in-${Date.now()}`);
    tmpOut = join(tmpdir(), `merge-specs-test-basic-out-${Date.now()}`);
    mkdirSync(tmpIn, { recursive: true });
    writeFileSync(
      join(tmpIn, "t1.ts"),
      '// META: {"id":"t1","priority":"P0","title":"smoke test"}\nexport const x = 1;\n',
      "utf-8",
    );
    writeFileSync(
      join(tmpIn, "t2.ts"),
      '// META: {"id":"t2","priority":"P1","title":"full test"}\nexport const y = 2;\n',
      "utf-8",
    );
  });

  after(() => {
    rmSync(tmpIn, { recursive: true, force: true });
    rmSync(tmpOut, { recursive: true, force: true });
  });

  it("returns correct case counts", () => {
    const result = mergeSpecs(tmpIn, tmpOut);
    assert.equal(result.case_count.smoke, 1);
    assert.equal(result.case_count.full, 2);
  });

  it("smoke_spec path ends with smoke.spec.ts", () => {
    const result = mergeSpecs(tmpIn, tmpOut);
    assert.ok(result.smoke_spec.endsWith("smoke.spec.ts"));
  });
});

// ────────────────────────────────────────────────────────────
// mergeSpecs — compile gate (tsc)
// ────────────────────────────────────────────────────────────

describe("mergeSpecs compileCheck", () => {
  let tmpInBad: string;
  let tmpOutBad: string;
  let tmpInGood: string;
  let tmpOutGood: string;

  before(() => {
    const ts = Date.now();
    tmpInBad = join(tmpdir(), `merge-specs-bad-in-${ts}`);
    tmpOutBad = join(tmpdir(), `merge-specs-bad-out-${ts}`);
    tmpInGood = join(tmpdir(), `merge-specs-good-in-${ts}`);
    tmpOutGood = join(tmpdir(), `merge-specs-good-out-${ts}`);

    mkdirSync(tmpInBad, { recursive: true });
    mkdirSync(tmpInGood, { recursive: true });

    // Bad block: type error
    writeFileSync(
      join(tmpInBad, "bad.ts"),
      '// META: {"id":"t1","priority":"P0","title":"bad"}\nconst x: number = "oops";\n',
      "utf-8",
    );

    // Good block: clean TypeScript
    writeFileSync(
      join(tmpInGood, "good.ts"),
      '// META: {"id":"t1","priority":"P0","title":"good"}\nexport const x: number = 1;\n',
      "utf-8",
    );
  });

  after(() => {
    rmSync(tmpInBad, { recursive: true, force: true });
    rmSync(tmpOutBad, { recursive: true, force: true });
    rmSync(tmpInGood, { recursive: true, force: true });
    rmSync(tmpOutGood, { recursive: true, force: true });
  });

  it("throws when compileCheck=true and block has type error", () => {
    assert.throws(
      () => mergeSpecs(tmpInBad, tmpOutBad, { compileCheck: true }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /tsc|type/i);
        return true;
      },
    );
  });

  it("does not throw when compileCheck=true and block is valid TypeScript", () => {
    assert.doesNotThrow(() => mergeSpecs(tmpInGood, tmpOutGood, { compileCheck: true }));
  });

  it("does not throw when compileCheck=false even with type errors", () => {
    const tmpIn2 = join(tmpdir(), `merge-specs-no-check-in-${Date.now()}`);
    const tmpOut2 = join(tmpdir(), `merge-specs-no-check-out-${Date.now()}`);
    mkdirSync(tmpIn2, { recursive: true });
    writeFileSync(
      join(tmpIn2, "bad.ts"),
      '// META: {"id":"t1","priority":"P0","title":"bad"}\nconst x: number = "oops";\n',
      "utf-8",
    );
    try {
      assert.doesNotThrow(() => mergeSpecs(tmpIn2, tmpOut2, { compileCheck: false }));
    } finally {
      rmSync(tmpIn2, { recursive: true, force: true });
      rmSync(tmpOut2, { recursive: true, force: true });
    }
  });

  it("does not false-positive when block imports @playwright/test", () => {
    const tmpIn = join(tmpdir(), `merge-realistic-${Date.now()}`);
    mkdirSync(tmpIn, { recursive: true });
    writeFileSync(
      join(tmpIn, "t1.ts"),
      '// META: {"id":"t1","priority":"P0","title":"x"}\nimport { test } from "@playwright/test";\ntest("x", async () => {});\n',
      "utf-8",
    );
    const tmpOut = `${tmpIn}-out`;
    try {
      assert.doesNotThrow(() => mergeSpecs(tmpIn, tmpOut, { compileCheck: true }));
    } finally {
      rmSync(tmpIn, { recursive: true, force: true });
      rmSync(tmpOut, { recursive: true, force: true });
    }
  });
});
