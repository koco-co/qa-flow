import { existsSync, mkdirSync, rmSync, writeFileSync, writeFileSync as fsWriteFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, beforeEach, describe, it, expect } from "bun:test";
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
} from "../../src/lib/progress-store.ts";
import type { Session } from "../../src/lib/progress-types.ts";

const TMP = join(tmpdir(), `progress-store-test-${process.pid}`);

beforeEach(() => {
  process.env.KATA_ROOT_OVERRIDE = TMP; // progress-store reads this via getEnv (see paths.ts kataRoot JSDoc)
  mkdirSync(TMP, { recursive: true });
});

afterEach(() => {
  delete process.env.KATA_ROOT_OVERRIDE;
  try { rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ }
});

beforeEach(() => {
  process.env.KATA_ROOT_OVERRIDE = TMP;  // reset to canonical value
  try { rmSync(join(TMP, ".kata"), { recursive: true, force: true }); } catch {}
});

describe("sessionIdFor", () => {
  it("composes workflow/slug-env", () => {
    expect(sessionIdFor({ workflow: "test-case-gen", slug: "prd-xxx", env: "default" })).toBe("test-case-gen/prd-xxx-default");
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
    expect(loaded).toBeTruthy();
    expect(loaded!.schema_version).toBe(1);
    expect(loaded!.session_id).toBe("test-case-gen/prd-a-default");
    expect(loaded!.tasks.length).toBe(0);
    expect(loaded!.artifacts).toEqual({});
  });

  it("readSession returns null when file missing", () => {
    const loaded = readSession("dataAssets", "test-case-gen/missing-default");
    expect(loaded).toBe(null);
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
      expect(final.meta[`k${n}`]).toBe(n);
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

    await expect(
      withSessionLock(project, base.session_id, async () => {}, { timeoutMs: 200 }),
    ).rejects.toThrow(/lock/i);
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
    expect(cur.tasks.length).toBe(2);
    expect(cur.tasks[0].status).toBe("pending");
    expect(cur.tasks[0].parent).toBe(null);
    expect(cur.tasks[0].attempts).toBe(0);
    expect(cur.tasks[1].depends_on).toEqual(["t1"]);
  });

  it("rejects duplicate ids", () => {
    const s = seed();
    addTasks(project, s.session_id, [{ id: "t1", name: "n", kind: "node", order: 1 }]);
    expect(() => addTasks(project, s.session_id, [{ id: "t1", name: "n", kind: "node", order: 2 }])).toThrow(/duplicate/i);
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
    expect(cur.tasks[0].status).toBe("running");
    expect(cur.tasks[0].attempts).toBe(1);
    expect(cur.tasks[0].started_at).toBeTruthy();
  });

  it("appends error entry when status=failed with error message", () => {
    const { sessionId } = seedWithTask();
    updateTask(project, sessionId, "t1", {
      status: "failed", error: "timeout",
    });
    const cur = readSession(project, sessionId)!;
    expect(cur.tasks[0].errors.length).toBe(1);
    expect(cur.tasks[0].errors[0].message).toBe("timeout");
  });

  it("appends error regardless of status (e.g. forced-start on running)", () => {
    const { sessionId } = seedWithTask();
    updateTask(project, sessionId, "t1", {
      status: "running", error: "forced-start",
    });
    const cur = readSession(project, sessionId)!;
    expect(cur.tasks[0].status).toBe("running");
    expect(cur.tasks[0].errors.length).toBe(1);
    expect(cur.tasks[0].errors[0].message).toMatch(/forced-start/);
  });

  it("sets reason when status=blocked", () => {
    const { sessionId } = seedWithTask();
    updateTask(project, sessionId, "t1", {
      status: "blocked", reason: "需确认",
    });
    const cur = readSession(project, sessionId)!;
    expect(cur.tasks[0].status).toBe("blocked");
    expect(cur.tasks[0].reason).toBe("需确认");
  });

  it("merges payload object", () => {
    const { sessionId } = seedWithTask();
    updateTask(project, sessionId, "t1", { payload: { a: 1 } });
    updateTask(project, sessionId, "t1", { payload: { b: 2 } });
    const cur = readSession(project, sessionId)!;
    expect(cur.tasks[0].payload).toEqual({ a: 1, b: 2 });
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
    expect(readSession(project).toBe(s.session_id)!.tasks.length, 0);
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
    expect(!ids.includes("t1").toBeTruthy(), "t1 should be hidden (parent pending)");
  });

  it("hides tasks with unsatisfied depends_on", () => {
    const sid = setup();
    const visible = queryTasks(project, sid, {});
    const ids = visible.map((r) => r.task.id);
    expect(!ids.includes("t5").toBeTruthy(), "t5 should be hidden (t6 not done)");
    expect(ids.includes("t6").toBeTruthy(), "t6 visible (parent running, no deps)");
  });

  it("--include-all returns everything", () => {
    const sid = setup();
    const all = queryTasks(project, sid, { includeAll: true });
    expect(all.length).toBe(7);
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
    expect(ids).toEqual(["t5", "t6"]);
  });

  it("--include-blocked returns hidden tasks with blocked_by reasons", () => {
    const sid = setup();
    const blocked = queryTasks(project, sid, { includeBlocked: true });
    const byId = Object.fromEntries(blocked.map((r) => [r.task.id, r]));
    expect(byId.t1).toBeTruthy();
    expect(byId.t1.blocked_by!.join(").toMatch("), /t0/);
    expect(byId.t5).toBeTruthy();
    expect(byId.t5.blocked_by!.join(").toMatch("), /t6/);
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
    expect(() => addTasks(project, s.session_id, [
        { id: "b", name: "b", kind: "node", order: 2, depends_on: ["a"] },
      ])).toThrow(/cycle/i);
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
    expect(() => updateTask(project, s.session_id, "a", { depends_on: ["b"] })).toThrow(/cycle/i);
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
    expect(cur.tasks.find((t) => t.id === "p")!.status).toBe("done");
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
    expect(() => rollupTask(project, s.session_id, "p")).toThrow(/unfinished/i);
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
    expect(cur.artifacts.k1).toEqual({ a: 1 });
    expect(getArtifact(project).toEqual(s.session_id), { a: 1 });
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
    expect(ref.$ref).toBeTruthy();
    const loaded = getArtifact(project, s.session_id, "blob");
    expect(loaded).toEqual(big);
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
    expect(readSession(project).toBe(s.session_id)!.tasks[0].status, "pending");
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
    expect(t.status).toBe("pending");
    expect(t.attempts).toBe(0);
    expect(t.errors).toEqual([]);
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
    expect(t.status).toBe("pending");
    expect(t.reason).toBe(null);
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
    expect(cur.artifacts.cached_parse_result).toBe(undefined);
  });

  it("--payload-path-check: missing file → reset task).toThrow(/cycle/i);
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
    expect(() => updateTask(project, s.session_id, "a", { depends_on: ["b"] })).toThrow(/cycle/i);
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
    expect(cur.tasks.find((t) => t.id === "p")!.status).toBe("done");
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
    expect(() => rollupTask(project, s.session_id, "p")).toThrow(/unfinished/i);
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
    expect(cur.artifacts.k1).toEqual({ a: 1 });
    expect(getArtifact(project).toEqual(s.session_id), { a: 1 });
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
    expect(ref.$ref).toBeTruthy();
    const loaded = getArtifact(project, s.session_id, "blob");
    expect(loaded).toEqual(big);
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
    expect(readSession(project).toBe(s.session_id)!.tasks[0].status, "pending");
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
    expect(t.status).toBe("pending");
    expect(t.attempts).toBe(0);
    expect(t.errors).toEqual([]);
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
    expect(t.status).toBe("pending");
    expect(t.reason).toBe(null);
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
    expect(cur.artifacts.cached_parse_result).toBe(undefined);
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
    expect(t.status).toBe("pending");
    expect(t.payload.generated).toBe(false);
  });
});
