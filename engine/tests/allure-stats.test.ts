import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  collectAllureStats,
  snapshotResultFiles,
} from "../lib/allure-stats.ts";

const TMP = join(tmpdir(), `kata-allure-stats-${process.pid}`);

function writeResult(
  dir: string,
  id: string,
  payload: Record<string, unknown>,
  mtimeMs?: number,
): string {
  const file = join(dir, `${id}-result.json`);
  writeFileSync(file, JSON.stringify(payload), "utf8");
  if (mtimeMs !== undefined) {
    const d = new Date(mtimeMs);
    utimesSync(file, d, d);
  }
  return file;
}

before(() => {
  mkdirSync(TMP, { recursive: true });
});

after(() => {
  rmSync(TMP, { recursive: true, force: true });
});

describe("collectAllureStats — counts by status", () => {
  it("aggregates passed/failed/broken/skipped counts", () => {
    const dir = join(TMP, "counts");
    mkdirSync(dir, { recursive: true });
    writeResult(dir, "a", { status: "passed", name: "a", start: 1, stop: 100 });
    writeResult(dir, "b", { status: "failed", name: "b", start: 1, stop: 200, statusDetails: { message: "boom" } });
    writeResult(dir, "c", { status: "broken", name: "c", start: 1, stop: 50 });
    writeResult(dir, "d", { status: "skipped", name: "d" });

    const stats = collectAllureStats(dir);
    assert.equal(stats.total, 4);
    assert.equal(stats.passed, 1);
    assert.equal(stats.failed, 1);
    assert.equal(stats.broken, 1);
    assert.equal(stats.skipped, 1);
    // duration sums only when start+stop present
    assert.equal(stats.durationMs, 99 + 199 + 49);
    assert.equal(stats.failedCases.length, 2);
    const titles = stats.failedCases.map((f) => f.title).sort();
    assert.deepEqual(titles, ["b", "c"]);
  });

  it("trims long failure messages to first line", () => {
    const dir = join(TMP, "messages");
    mkdirSync(dir, { recursive: true });
    writeResult(dir, "x", {
      status: "failed",
      name: "x",
      statusDetails: { message: "first\nsecond\nthird" },
    });
    const stats = collectAllureStats(dir);
    assert.equal(stats.failedCases[0].message, "first");
  });
});

describe("collectAllureStats — excludeFiles filter", () => {
  it("ignores result files in the exclude set", () => {
    const dir = join(TMP, "exclude");
    mkdirSync(dir, { recursive: true });
    writeResult(dir, "old", { status: "passed", name: "old" });
    const snapshot = snapshotResultFiles(dir);
    // Now add a new result that should be the only one counted
    writeResult(dir, "new", { status: "failed", name: "new" });

    const stats = collectAllureStats(dir, { excludeFiles: snapshot });
    assert.equal(stats.total, 1);
    assert.equal(stats.failed, 1);
    assert.equal(stats.failedCases[0].title, "new");
  });
});

describe("collectAllureStats — sinceMtimeMs filter", () => {
  it("only counts files with mtime >= threshold", () => {
    const dir = join(TMP, "since");
    mkdirSync(dir, { recursive: true });
    const oldTime = Date.now() - 3600_000;
    writeResult(dir, "old", { status: "passed", name: "old" }, oldTime);
    const threshold = Date.now();
    writeResult(dir, "recent", { status: "failed", name: "recent" });

    const stats = collectAllureStats(dir, { sinceMtimeMs: threshold });
    assert.equal(stats.total, 1);
    assert.equal(stats.failed, 1);
  });
});

describe("collectAllureStats — skips malformed result files", () => {
  it("does not throw on invalid JSON", () => {
    const dir = join(TMP, "malformed");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "bad-result.json"), "{not json", "utf8");
    writeResult(dir, "ok", { status: "passed", name: "ok" });

    const stats = collectAllureStats(dir);
    assert.equal(stats.total, 1);
    assert.equal(stats.passed, 1);
  });
});
