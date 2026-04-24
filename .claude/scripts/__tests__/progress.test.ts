import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";

const TMP = join(tmpdir(), `progress-cli-test-${process.pid}`);
const CWD = resolve(import.meta.dirname, "../..");

function run(args: string[], extra: Record<string, string> = {}) {
  try {
    const stdout = execFileSync("kata-cli", ["progress", ...args], {
      cwd: CWD, encoding: "utf8",
      env: { ...process.env, KATA_ROOT_OVERRIDE: TMP, ...extra },
    });
    return { stdout, stderr: "", code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", code: e.status ?? 1 };
  }
}

before(() => mkdirSync(TMP, { recursive: true }));
after(() => { try { rmSync(TMP, { recursive: true, force: true }); } catch {} });
beforeEach(() => {
  try { rmSync(join(TMP, ".kata"), { recursive: true, force: true }); } catch {}
});

describe("session-create + session-read", () => {
  it("creates a session and reads it back", () => {
    const create = run([
      "session-create",
      "--workflow", "test-case-gen",
      "--project", "dataAssets",
      "--source-type", "prd",
      "--source-path", "workspace/dataAssets/prds/x.md",
      "--env", "default",
      "--meta", JSON.stringify({ mode: "normal" }),
    ]);
    assert.equal(create.code, 0);
    const created = JSON.parse(create.stdout);
    assert.equal(created.session_id, "test-case-gen/x-default");

    const read = run(["session-read", "--session", created.session_id, "--project", "dataAssets"]);
    assert.equal(read.code, 0);
    const loaded = JSON.parse(read.stdout);
    assert.equal(loaded.schema_version, 1);
  });
});

describe("session-summary", () => {
  it("aggregates counts by status", () => {
    const create = JSON.parse(run([
      "session-create",
      "--workflow", "w", "--project", "dataAssets",
      "--source-type", "prd", "--source-path", "x.md",
    ]).stdout);
    const sid = create.session_id;
    run(["task-add", "--project", "dataAssets", "--session", sid,
      "--tasks", JSON.stringify([
        { id: "t1", name: "n", kind: "node", order: 1 },
        { id: "t2", name: "n", kind: "node", order: 2 },
      ])]);
    run(["task-update", "--project", "dataAssets", "--session", sid,
      "--task", "t1", "--status", "done"]);
    const out = JSON.parse(
      run(["session-summary", "--project", "dataAssets", "--session", sid]).stdout,
    );
    assert.equal(out.total, 2);
    assert.equal(out.done, 1);
    assert.equal(out.pending, 1);
  });
});

describe("session-resume", () => {
  it("resets running → pending", () => {
    const sid = JSON.parse(run([
      "session-create",
      "--workflow", "w", "--project", "dataAssets",
      "--source-type", "prd", "--source-path", "x.md",
    ]).stdout).session_id;
    run(["task-add", "--project", "dataAssets", "--session", sid,
      "--tasks", JSON.stringify([{ id: "t1", name: "n", kind: "node", order: 1 }])]);
    run(["task-update", "--project", "dataAssets", "--session", sid,
      "--task", "t1", "--status", "running"]);
    run(["session-resume", "--project", "dataAssets", "--session", sid]);
    const loaded = JSON.parse(
      run(["session-read", "--project", "dataAssets", "--session", sid]).stdout,
    );
    assert.equal(loaded.tasks[0].status, "pending");
  });
});

describe("session-list + session-delete", () => {
  it("lists and deletes", () => {
    run(["session-create", "--workflow", "w", "--project", "dataAssets",
      "--source-type", "prd", "--source-path", "a.md"]);
    run(["session-create", "--workflow", "w", "--project", "dataAssets",
      "--source-type", "prd", "--source-path", "b.md"]);
    const list = JSON.parse(
      run(["session-list", "--project", "dataAssets"]).stdout,
    );
    assert.equal(list.length, 2);
    run(["session-delete", "--project", "dataAssets", "--session", "w/a-default"]);
    const after = JSON.parse(
      run(["session-list", "--project", "dataAssets"]).stdout,
    );
    assert.equal(after.length, 1);
  });
});

describe("task-add + task-query + task-update", () => {
  function seed() {
    const sid = JSON.parse(run([
      "session-create", "--workflow", "w", "--project", "dataAssets",
      "--source-type", "prd", "--source-path", "t.md",
    ]).stdout).session_id;
    run(["task-add", "--project", "dataAssets", "--session", sid,
      "--tasks", JSON.stringify([
        { id: "t1", name: "n", kind: "node", order: 1 },
        { id: "t2", name: "n", kind: "node", order: 2, depends_on: ["t1"] },
      ])]);
    return sid;
  }

  it("task-add adds tasks", () => {
    const sid = seed();
    const s = JSON.parse(run(["session-read", "--project", "dataAssets", "--session", sid]).stdout);
    assert.equal(s.tasks.length, 2);
  });

  it("task-update --status running auto-increments attempts", () => {
    const sid = seed();
    run(["task-update", "--project", "dataAssets", "--session", sid,
      "--task", "t1", "--status", "running"]);
    const s = JSON.parse(run(["session-read", "--project", "dataAssets", "--session", sid]).stdout);
    assert.equal(s.tasks[0].status, "running");
    assert.equal(s.tasks[0].attempts, 1);
  });

  it("task-update --status running fails with exit 4 when deps unsatisfied", () => {
    const sid = seed();
    const res = run(["task-update", "--project", "dataAssets", "--session", sid,
      "--task", "t2", "--status", "running"]);
    assert.equal(res.code, 4);
    assert.match(res.stderr, /dep/);
  });

  it("task-update --force bypasses dep check and records forced-start", () => {
    const sid = seed();
    const res = run(["task-update", "--project", "dataAssets", "--session", sid,
      "--task", "t2", "--status", "running", "--force"]);
    assert.equal(res.code, 0);
    const s = JSON.parse(run(["session-read", "--project", "dataAssets", "--session", sid]).stdout);
    const t2 = s.tasks.find((t: { id: string }) => t.id === "t2");
    assert.equal(t2.attempts, 1);
    assert.ok(t2.errors.some((e: { message: string }) => /forced-start/.test(e.message)));
  });

  it("task-query default hides tasks with unsatisfied deps", () => {
    const sid = seed();
    const out = JSON.parse(run([
      "task-query", "--project", "dataAssets", "--session", sid, "--format", "json",
    ]).stdout);
    const ids = out.map((r: { task: { id: string } }) => r.task.id);
    assert.deepEqual(ids, ["t1"]);
  });

  it("task-query --include-blocked shows blocked_by reasons", () => {
    const sid = seed();
    const out = JSON.parse(run([
      "task-query", "--project", "dataAssets", "--session", sid,
      "--include-blocked", "--format", "json",
    ]).stdout);
    assert.equal(out.length, 1);
    assert.equal(out[0].task.id, "t2");
    assert.match(out[0].blocked_by.join(","), /t1/);
  });
});

describe("task-block / task-unblock / task-rollup", () => {
  function seedRollup() {
    const sid = JSON.parse(run([
      "session-create", "--workflow", "w", "--project", "dataAssets",
      "--source-type", "prd", "--source-path", "r.md",
    ]).stdout).session_id;
    run(["task-add", "--project", "dataAssets", "--session", sid,
      "--tasks", JSON.stringify([
        { id: "p", name: "p", kind: "phase", order: 1 },
        { id: "c1", name: "c", kind: "case", order: 1, parent: "p" },
        { id: "c2", name: "c", kind: "case", order: 2, parent: "p" },
      ])]);
    run(["task-update", "--project", "dataAssets", "--session", sid,
      "--task", "p", "--status", "running"]);
    return sid;
  }

  it("task-block sets status=blocked with reason", () => {
    const sid = seedRollup();
    run(["task-block", "--project", "dataAssets", "--session", sid,
      "--task", "c1", "--reason", "需人工"]);
    const s = JSON.parse(run(["session-read", "--project", "dataAssets", "--session", sid]).stdout);
    const c1 = s.tasks.find((t: { id: string }) => t.id === "c1");
    assert.equal(c1.status, "blocked");
    assert.equal(c1.reason, "需人工");
  });

  it("task-rollup fails with exit 5 when children unfinished", () => {
    const sid = seedRollup();
    const res = run(["task-rollup", "--project", "dataAssets", "--session", sid, "--task", "p"]);
    assert.equal(res.code, 5);
  });

  it("task-rollup succeeds when all children done", () => {
    const sid = seedRollup();
    run(["task-update", "--project", "dataAssets", "--session", sid, "--task", "c1", "--status", "done"]);
    run(["task-update", "--project", "dataAssets", "--session", sid, "--task", "c2", "--status", "done"]);
    const res = run(["task-rollup", "--project", "dataAssets", "--session", sid, "--task", "p"]);
    assert.equal(res.code, 0);
    const s = JSON.parse(run(["session-read", "--project", "dataAssets", "--session", sid]).stdout);
    assert.equal(s.tasks.find((t: { id: string }) => t.id === "p").status, "done");
  });
});

describe("artifact-set + artifact-get", () => {
  it("round-trips small value", () => {
    const sid = JSON.parse(run([
      "session-create", "--workflow", "w", "--project", "dataAssets",
      "--source-type", "prd", "--source-path", "a.md",
    ]).stdout).session_id;
    run(["artifact-set", "--project", "dataAssets", "--session", sid,
      "--key", "k1", "--value", JSON.stringify({ x: 1 })]);
    const got = JSON.parse(run([
      "artifact-get", "--project", "dataAssets", "--session", sid, "--key", "k1",
    ]).stdout);
    assert.deepEqual(got, { x: 1 });
  });

  it("spills and reads back large value", () => {
    const sid = JSON.parse(run([
      "session-create", "--workflow", "w", "--project", "dataAssets",
      "--source-type", "prd", "--source-path", "a2.md",
    ]).stdout).session_id;
    const big = { data: "y".repeat(100_000) };
    run(["artifact-set", "--project", "dataAssets", "--session", sid,
      "--key", "blob", "--value", JSON.stringify(big)]);
    const got = JSON.parse(run([
      "artifact-get", "--project", "dataAssets", "--session", sid, "--key", "blob",
    ]).stdout);
    assert.equal(got.data.length, 100_000);
  });
});

describe("progress migrate --from legacy", () => {
  it("scans workspace .temp and migrates all legacy files", () => {
    const wsTemp = join(TMP, "workspace", "dataAssets", ".temp");
    mkdirSync(wsTemp, { recursive: true });
    writeFileSync(join(wsTemp, ".kata-state-prd-a-default.json"), JSON.stringify({
      project: "dataAssets", prd: "prd-a.md", mode: "normal",
      current_node: "init", completed_nodes: [], node_outputs: {}, writers: {},
      created_at: "x", updated_at: "x",
    }));
    writeFileSync(join(wsTemp, "ui-autotest-progress-my-suite.json"), JSON.stringify({
      version: 1, suite_name: "my-suite",
      archive_md: "x.md", url: "u", selected_priorities: ["P0"],
      output_dir: "t/", started_at: "x", updated_at: "x",
      current_step: 4, preconditions_ready: false, merge_status: "pending",
      cases: {},
    }));

    const dry = JSON.parse(run(["migrate", "--from", "legacy", "--project", "dataAssets",
      "--dry-run"], { WORKSPACE_DIR: join(TMP, "workspace") }).stdout);
    assert.equal(dry.plan.length, 2);

    const real = JSON.parse(run(["migrate", "--from", "legacy", "--project", "dataAssets"],
      { WORKSPACE_DIR: join(TMP, "workspace") }).stdout);
    assert.equal(real.migrated, 2);

    const again = JSON.parse(run(["migrate", "--from", "legacy", "--project", "dataAssets"],
      { WORKSPACE_DIR: join(TMP, "workspace") }).stdout);
    assert.equal(again.migrated, 0);
  });

  it("distinguishes ui-autotest files by their legacy env", () => {
    const wsTemp = join(TMP, "workspace", "dataAssets", ".temp");
    mkdirSync(wsTemp, { recursive: true });
    const base = {
      version: 1, suite_name: "shared-suite",
      archive_md: "x.md", url: "u", selected_priorities: ["P0"],
      output_dir: "t/", started_at: "x", updated_at: "x",
      current_step: 4, preconditions_ready: false, merge_status: "pending",
      cases: {},
    };
    writeFileSync(join(wsTemp, "ui-autotest-progress-shared-suite-a.json"),
      JSON.stringify({ ...base, env: "alpha" }));
    writeFileSync(join(wsTemp, "ui-autotest-progress-shared-suite-b.json"),
      JSON.stringify({ ...base, env: "beta" }));

    const result = JSON.parse(run(["migrate", "--from", "legacy", "--project", "dataAssets"],
      { WORKSPACE_DIR: join(TMP, "workspace") }).stdout);
    assert.equal(result.migrated, 2);
    const sessionIds = result.results.map((r: { sessionId: string }) => r.sessionId).sort();
    assert.deepEqual(sessionIds, ["ui-autotest/shared-suite-alpha", "ui-autotest/shared-suite-beta"]);
  });
});
