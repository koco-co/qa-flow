import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync, writeFileSync, writeFileSync as fsWriteFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";
import {
  createSession,
  readSession,
  writeSession,
  withSessionLock,
  sessionIdFor,
  addTasks,
  updateTask,
  removeTask,
  queryTasks,
  rollupTask,
  setArtifact,
  getArtifact,
  resumeSession,
} from "../../lib/progress-store.ts";
import type { Session } from "../../lib/progress-types.ts";

const TMP = join(tmpdir(), `progress-store-test-${process.pid}`);

before(() => {
  process.env.KATA_ROOT_OVERRIDE = TMP; // progress-store reads this via getEnv (see paths.ts kataRoot JSDoc)
  mkdirSync(TMP, { recursive: true });
});

after(() => {
  delete process.env.KATA_ROOT_OVERRIDE;
  try { rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ }
});

beforeEach(() => {
  process.env.KATA_ROOT_OVERRIDE = TMP;  // reset to canonical value
  try { rmSync(join(TMP, ".kata"), { recursive: true, force: true }); } catch {}
});

describe("sessionIdFor", () => {
  it("composes workflow/slug-env", () => {
    assert.equal(
      sessionIdFor({ workflow: "test-case-gen", slug: "prd-xxx", env: "default" }),
      "test-case-gen/prd-xxx-default",
    );
  });
});

describe("createSession + readSession", () => {
  it("creates an empty session with schema_version=1", () => {
    const session = createSession({
      project: "dataAssets",
      workflow: "test-case-gen",
      slug: "prd-a",
      env: "default",
      source: { type: "prd", path: "workspace/dataAssets/prds/x.md", mtime: null },
      meta: { mode: "normal" },
    });
    writeSession("dataAssets", session);

    const loaded = readSession("dataAssets", "test-case-gen/prd-a-default");
    assert.ok(loaded);
    assert.equal(loaded!.schema_version, 1);
    assert.equal(loaded!.session_id, "test-case-gen/prd-a-default");
    assert.equal(loaded!.tasks.length, 0);
    assert.deepEqual(loaded!.artifacts, {});
  });

  it("readSession returns null when file missing", () => {
    const loaded = readSession("dataAssets", "test-case-gen/missing-default");
    assert.equal(loaded, null);
  });
});

describe("withSessionLock", () => {
  it("serializes concurrent writes (no data loss)", async () => {
    const project = "dataAssets";
    const base = createSession({
      project, workflow: "w", slug: "s", env: "default",
      source: { type: "prd", path: "p", mtime: null }, meta: {},
    });
    writeSession(project, base);

    const runs = Array.from({ length: 5 }, (_, i) => i);
    await Promise.all(runs.map((n) =>
      withSessionLock(project, base.session_id, async () => {
        const cur = readSession(project, base.session_id)!;
        const updated: Session = {
          ...cur,
          meta: { ...cur.meta, [`k${n}`]: n },
          updated_at: new Date().toISOString(),
        };
        writeSession(project, updated);
      }),
    ));

    const final = readSession(project, base.session_id)!;
    for (const n of runs) {
      assert.equal(final.meta[`k${n}`], n);
    }
  });

  it("throws after LOCK_TIMEOUT_MS if lock not released", async () => {
    const project = "dataAssets";
    const base = createSession({
      project, workflow: "w", slug: "lock", env: "default",
      source: { type: "prd", path: "p", mtime: null }, meta: {},
    });
    writeSession(project, base);

    const lockDir = join(TMP, ".kata", project, "locks");
    mkdirSync(lockDir, { recursive: true });
    writeFileSync(join(lockDir, `${base.session_id.replace("/", "__")}.lock`), "99999");

    await assert.rejects(
      withSessionLock(project, base.session_id, async () => {}, { timeoutMs: 200 }),
      /lock/i,
    );
  });
});

describe("addTasks", () => {
  const project = "dataAssets";
  function seed(): Session {
    const s = createSession({
      project, workflow: "test-case-gen", slug: "p1", env: "default",
      source: { type: "prd", path: "x.md", mtime: null }, meta: {},
    });
    writeSession(project, s);
    return s;
  }

  it("adds batch tasks with defaults for omitted fields", () => {
    const s = seed();
    addTasks(project, s.session_id, [
      { id: "t1", name: "transform", kind: "node", order: 1 },
      { id: "t2", name: "enhance", kind: "node", order: 2, depends_on: ["t1"] },
    ]);
    const cur = readSession(project, s.session_id)!;
    assert.equal(cur.tasks.length, 2);
    assert.equal(cur.tasks[0].status, "pending");
    assert.equal(cur.tasks[0].parent, null);
    assert.equal(cur.tasks[0].attempts, 0);
    assert.deepEqual(cur.tasks[1].depends_on, ["t1"]);
  });

  it("rejects duplicate ids", () => {
    const s = seed();
    addTasks(project, s.session_id, [{ id: "t1", name: "n", kind: "node", order: 1 }]);
    assert.throws(
      () => addTasks(project, s.session_id, [{ id: "t1", name: "n", kind: "node", order: 2 }]),
      /duplicate/i,
    );
  });
});

describe("updateTask", () => {
  const project = "dataAssets";
  function seedWithTask(): { sessionId: string } {
    const s = createSession({
      project, workflow: "w", slug: "u", env: "default",
      source: { type: "prd", path: "x", mtime: null }, meta: {},
    });
    writeSession(project, s);
    addTasks(project, s.session_id, [{ id: "t1", name: "n", kind: "node", order: 1 }]);
    return { sessionId: s.session_id };
  }

  it("increments attempts when status set to running", () => {
    const { sessionId } = seedWithTask();
    updateTask(project, sessionId, "t1", { status: "running" });
    const cur = readSession(project, sessionId)!;
    assert.equal(cur.tasks[0].status, "running");
    assert.equal(cur.tasks[0].attempts, 1);
    assert.ok(cur.tasks[0].started_at);
  });

  it("appends error entry when status=failed with error message", () => {
    const { sessionId } = seedWithTask();
    updateTask(project, sessionId, "t1", {
      status: "failed", error: "timeout",
    });
    const cur = readSession(project, sessionId)!;
    assert.equal(cur.tasks[0].errors.length, 1);
    assert.equal(cur.tasks[0].errors[0].message, "timeout");
  });

  it("appends error regardless of status (e.g. forced-start on running)", () => {
    const { sessionId } = seedWithTask();
    updateTask(project, sessionId, "t1", {
      status: "running", error: "forced-start",
    });
    const cur = readSession(project, sessionId)!;
    assert.equal(cur.tasks[0].status, "running");
    assert.equal(cur.tasks[0].errors.length, 1);
    assert.match(cur.tasks[0].errors[0].message, /forced-start/);
  });

  it("sets reason when status=blocked", () => {
    const { sessionId } = seedWithTask();
    updateTask(project, sessionId, "t1", {
      status: "blocked", reason: "需确认",
    });
    const cur = readSession(project, sessionId)!;
    assert.equal(cur.tasks[0].status, "blocked");
    assert.equal(cur.tasks[0].reason, "需确认");
  });

  it("merges payload object", () => {
    const { sessionId } = seedWithTask();
    updateTask(project, sessionId, "t1", { payload: { a: 1 } });
    updateTask(project, sessionId, "t1", { payload: { b: 2 } });
    const cur = readSession(project, sessionId)!;
    assert.deepEqual(cur.tasks[0].payload, { a: 1, b: 2 });
  });
});

describe("removeTask", () => {
  it("removes task by id", () => {
    const project = "dataAssets";
    const s = createSession({
      project, workflow: "w", slug: "r", env: "default",
      source: { type: "prd", path: "x", mtime: null }, meta: {},
    });
    writeSession(project, s);
    addTasks(project, s.session_id, [{ id: "t1", name: "n", kind: "node", order: 1 }]);
    removeTask(project, s.session_id, "t1");
    assert.equal(readSession(project, s.session_id)!.tasks.length, 0);
  });
});

describe("queryTasks visibility rules", () => {
  const project = "dataAssets";
  function setup(): string {
    const s = createSession({
      project, workflow: "w", slug: "q", env: "default",
      source: { type: "prd", path: "x", mtime: null }, meta: {},
    });
    writeSession(project, s);
    // Parent t0 pending, child t1 hidden
    // Parent t2 running, child t3 visible (deps ok)
    // Parent t4 running, child t5 hidden (t6 not done)
    addTasks(project, s.session_id, [
      { id: "t0", name: "phase0", kind: "phase", order: 1 },
      { id: "t1", name: "c1", kind: "case", order: 1, parent: "t0" },
      { id: "t2", name: "phase2", kind: "phase", order: 2 },
      { id: "t3", name: "c3", kind: "case", order: 1, parent: "t2" },
      { id: "t4", name: "phase4", kind: "phase", order: 3 },
      { id: "t5", name: "c5", kind: "case", order: 1, parent: "t4", depends_on: ["t6"] },
      { id: "t6", name: "c6", kind: "case", order: 2, parent: "t4" },
    ]);
    updateTask(project, s.session_id, "t2", { status: "running" });
    updateTask(project, s.session_id, "t4", { status: "running" });
    return s.session_id;
  }

  it("hides tasks whose parent is pending", () => {
    const sid = setup();
    const visible = queryTasks(project, sid, {});
    const ids = visible.map((r) => r.task.id);
    assert.ok(!ids.includes("t1"), "t1 should be hidden (parent pending)");
  });

  it("hides tasks with unsatisfied depends_on", () => {
    const sid = setup();
    const visible = queryTasks(project, sid, {});
    const ids = visible.map((r) => r.task.id);
    assert.ok(!ids.includes("t5"), "t5 should be hidden (t6 not done)");
    assert.ok(ids.includes("t6"), "t6 visible (parent running, no deps)");
  });

  it("--include-all returns everything", () => {
    const sid = setup();
    const all = queryTasks(project, sid, { includeAll: true });
    assert.equal(all.length, 7);
  });

  it("filters by status + kind + parent", () => {
    const sid = setup();
    const filtered = queryTasks(project, sid, {
      includeAll: true,
      status: ["pending"],
      kind: "case",
      parent: "t4",
    });
    const ids = filtered.map((r) => r.task.id).sort();
    assert.deepEqual(ids, ["t5", "t6"]);
  });

  it("--include-blocked returns hidden tasks with blocked_by reasons", () => {
    const sid = setup();
    const blocked = queryTasks(project, sid, { includeBlocked: true });
    const byId = Object.fromEntries(blocked.map((r) => [r.task.id, r]));
    assert.ok(byId.t1);
    assert.match(byId.t1.blocked_by!.join(","), /t0/);
    assert.ok(byId.t5);
    assert.match(byId.t5.blocked_by!.join(","), /t6/);
  });
});

describe("cycle detection", () => {
  const project = "dataAssets";
  it("rejects addTasks that introduces a cycle", () => {
    const s = createSession({
      project, workflow: "w", slug: "c1", env: "default",
      source: { type: "prd", path: "x", mtime: null }, meta: {},
    });
    writeSession(project, s);
    addTasks(project, s.session_id, [
      { id: "a", name: "a", kind: "node", order: 1, depends_on: ["b"] },
    ]);
    assert.throws(
      () => addTasks(project, s.session_id, [
        { id: "b", name: "b", kind: "node", order: 2, depends_on: ["a"] },
      ]),
      /cycle/i,
    );
  });

  it("rejects updateTask --depends-on introducing cycle", () => {
    const s = createSession({
      project, workflow: "w", slug: "c2", env: "default",
      source: { type: "prd", path: "x", mtime: null }, meta: {},
    });
    writeSession(project, s);
    addTasks(project, s.session_id, [
      { id: "a", name: "a", kind: "node", order: 1 },
      { id: "b", name: "b", kind: "node", order: 2, depends_on: ["a"] },
    ]);
    assert.throws(
      () => updateTask(project, s.session_id, "a", { depends_on: ["b"] }),
      /cycle/i,
    );
  });
});

describe("rollupTask", () => {
  const project = "dataAssets";
  it("sets parent to done when all children done/skipped", () => {
    const s = createSession({
      project, workflow: "w", slug: "r1", env: "default",
      source: { type: "prd", path: "x", mtime: null }, meta: {},
    });
    writeSession(project, s);
    addTasks(project, s.session_id, [
      { id: "p", name: "p", kind: "phase", order: 1 },
      { id: "c1", name: "c1", kind: "case", order: 1, parent: "p" },
      { id: "c2", name: "c2", kind: "case", order: 2, parent: "p" },
    ]);
    updateTask(project, s.session_id, "p", { status: "running" });
    updateTask(project, s.session_id, "c1", { status: "done" });
    updateTask(project, s.session_id, "c2", { status: "skipped" });
    rollupTask(project, s.session_id, "p");
    const cur = readSession(project, s.session_id)!;
    assert.equal(cur.tasks.find((t) => t.id === "p")!.status, "done");
  });

  it("throws when any child unfinished", () => {
    const s = createSession({
      project, workflow: "w", slug: "r2", env: "default",
      source: { type: "prd", path: "x", mtime: null }, meta: {},
    });
    writeSession(project, s);
    addTasks(project, s.session_id, [
      { id: "p", name: "p", kind: "phase", order: 1 },
      { id: "c1", name: "c1", kind: "case", order: 1, parent: "p" },
    ]);
    updateTask(project, s.session_id, "p", { status: "running" });
    assert.throws(() => rollupTask(project, s.session_id, "p"), /unfinished/i);
  });
});

describe("artifacts inline + overflow", () => {
  const project = "dataAssets";

  it("stores small artifact inline", () => {
    const s = createSession({
      project, workflow: "w", slug: "a1", env: "default",
      source: { type: "prd", path: "x", mtime: null }, meta: {},
    });
    writeSession(project, s);
    setArtifact(project, s.session_id, "k1", { a: 1 });
    const cur = readSession(project, s.session_id)!;
    assert.deepEqual(cur.artifacts.k1, { a: 1 });
    assert.deepEqual(getArtifact(project, s.session_id, "k1"), { a: 1 });
  });

  it("spills large artifact to blocks/ and stores $ref inline", () => {
    const s = createSession({
      project, workflow: "w", slug: "a2", env: "default",
      source: { type: "prd", path: "x", mtime: null }, meta: {},
    });
    writeSession(project, s);
    const big = { data: "x".repeat(100_000) };
    setArtifact(project, s.session_id, "blob", big);
    const cur = readSession(project, s.session_id)!;
    const ref = cur.artifacts.blob as { $ref?: string };
    assert.ok(ref.$ref, "inline value should be a $ref");
    const loaded = getArtifact(project, s.session_id, "blob");
    assert.deepEqual(loaded, big);
  });
});

describe("resumeSession", () => {
  const project = "dataAssets";

  it("resets running → pending", () => {
    const s = createSession({
      project, workflow: "w", slug: "res1", env: "default",
      source: { type: "prd", path: "x", mtime: null }, meta: {},
    });
    writeSession(project, s);
    addTasks(project, s.session_id, [{ id: "t1", name: "n", kind: "node", order: 1 }]);
    updateTask(project, s.session_id, "t1", { status: "running" });
    resumeSession(project, s.session_id, {});
    assert.equal(readSession(project, s.session_id)!.tasks[0].status, "pending");
  });

  it("--retry-failed clears errors and resets attempts", () => {
    const s = createSession({
      project, workflow: "w", slug: "res2", env: "default",
      source: { type: "prd", path: "x", mtime: null }, meta: {},
    });
    writeSession(project, s);
    addTasks(project, s.session_id, [{ id: "t1", name: "n", kind: "node", order: 1 }]);
    updateTask(project, s.session_id, "t1", { status: "failed", error: "boom" });
    resumeSession(project, s.session_id, { retryFailed: true });
    const t = readSession(project, s.session_id)!.tasks[0];
    assert.equal(t.status, "pending");
    assert.equal(t.attempts, 0);
    assert.deepEqual(t.errors, []);
  });

  it("--retry-blocked clears reason and resets to pending", () => {
    const s = createSession({
      project, workflow: "w", slug: "res3", env: "default",
      source: { type: "prd", path: "x", mtime: null }, meta: {},
    });
    writeSession(project, s);
    addTasks(project, s.session_id, [{ id: "t1", name: "n", kind: "node", order: 1 }]);
    updateTask(project, s.session_id, "t1", { status: "blocked", reason: "r" });
    resumeSession(project, s.session_id, { retryBlocked: true });
    const t = readSession(project, s.session_id)!.tasks[0];
    assert.equal(t.status, "pending");
    assert.equal(t.reason, null);
  });

  it("clears artifacts.cached_parse_result when source.mtime changed", () => {
    const prdPath = join(TMP, "fake.md");
    fsWriteFileSync(prdPath, "content");
    const originalMtime = new Date(Date.now() - 60_000);
    utimesSync(prdPath, originalMtime, originalMtime);

    const s = createSession({
      project, workflow: "w", slug: "res4", env: "default",
      source: { type: "prd", path: prdPath, mtime: originalMtime.toISOString() },
      meta: {},
    });
    writeSession(project, s);
    setArtifact(project, s.session_id, "cached_parse_result", { cached: true });

    const nowMtime = new Date();
    utimesSync(prdPath, nowMtime, nowMtime);
    resumeSession(project, s.session_id, {});

    const cur = readSession(project, s.session_id)!;
    assert.equal(cur.artifacts.cached_parse_result, undefined);
  });

  it("--payload-path-check: missing file → reset task, set generated=false", () => {
    const s = createSession({
      project, workflow: "w", slug: "res5", env: "default",
      source: { type: "prd", path: "x", mtime: null }, meta: {},
    });
    writeSession(project, s);
    addTasks(project, s.session_id, [{ id: "t1", name: "n", kind: "case", order: 1 }]);
    updateTask(project, s.session_id, "t1", {
      status: "done",
      payload: { script_path: "/nonexistent/path.spec.ts", generated: true },
    });
    resumeSession(project, s.session_id, { payloadPathCheck: "script_path" });
    const t = readSession(project, s.session_id)!.tasks[0];
    assert.equal(t.status, "pending");
    assert.equal(t.payload.generated, false);
  });
});
