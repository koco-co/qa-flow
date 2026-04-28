import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, beforeEach, describe, it, expect } from "bun:test";

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

beforeEach(() => mkdirSync(TMP, { recursive: true }));
afterEach(() => { try { rmSync(TMP, { recursive: true, force: true }); } catch {} });
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
    expect(create.code).toBe(0);
    const created = JSON.parse(create.stdout);
    expect(created.session_id).toBe("test-case-gen/x-default");

    const read = run(["session-read", "--session", created.session_id, "--project", "dataAssets"]);
    expect(read.code).toBe(0);
    const loaded = JSON.parse(read.stdout);
    expect(loaded.schema_version).toBe(1);
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
    expect(out.total).toBe(2);
    expect(out.done).toBe(1);
    expect(out.pending).toBe(1);
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
    expect(loaded.tasks[0].status).toBe("pending");
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
    expect(list.length).toBe(2);
    run(["session-delete", "--project", "dataAssets", "--session", "w/a-default"]);
    const after = JSON.parse(
      run(["session-list", "--project", "dataAssets"]).stdout,
    );
    expect(after.length).toBe(1);
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
    expect(s.tasks.length).toBe(2);
  });

  it("task-update --status running auto-increments attempts", () => {
    const sid = seed();
    run(["task-update", "--project", "dataAssets", "--session", sid,
      "--task", "t1", "--status", "running"]);
    const s = JSON.parse(run(["session-read", "--project", "dataAssets", "--session", sid]).stdout);
    expect(s.tasks[0].status).toBe("running");
    expect(s.tasks[0].attempts).toBe(1);
  });

  it("task-update --status running fails with exit 4 when deps unsatisfied", () => {
    const sid = seed();
    const res = run(["task-update", "--project", "dataAssets", "--session", sid,
      "--task", "t2", "--status", "running"]);
    expect(res.code).toBe(4);
    expect(res.stderr).toMatch(/dep/);
  });

  it("task-update --force bypasses dep check and records forced-start", () => {
    const sid = seed();
    const res = run(["task-update", "--project", "dataAssets", "--session", sid,
      "--task", "t2", "--status", "running", "--force"]);
    expect(res.code).toBe(0);
    const s = JSON.parse(run(["session-read", "--project", "dataAssets", "--session", sid]).stdout);
    const t2 = s.tasks.find((t: { id: string }) => t.id === "t2");
    expect(t2.attempts).toBe(1);
    expect(t2.errors.some((e: { message: string }) => /forced-start/.test(e.message))).toBeTruthy();
  });

  it("task-query default hides tasks with unsatisfied deps", () => {
    const sid = seed();
    const out = JSON.parse(run([
      "task-query", "--project", "dataAssets", "--session", sid, "--format", "json",
    ]).stdout);
    const ids = out.map((r: { task: { id: string } }) => r.task.id);
    expect(ids).toEqual(["t1"]);
  });

  it("task-query --include-blocked shows blocked_by reasons", () => {
    const sid = seed();
    const out = JSON.parse(run([
      "task-query", "--project", "dataAssets", "--session", sid,
      "--include-blocked", "--format", "json",
    ]).stdout);
    expect(out.length).toBe(1);
    expect(out[0].task.id).toBe("t2");
    expect(out[0].blocked_by.join(").toMatch("), /t1/);
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
    expect(c1.status).toBe("blocked");
    expect(c1.reason).toBe("需人工");
  });

  it("task-rollup fails with exit 5 when children unfinished", () => {
    const sid = seedRollup();
    const res = run(["task-rollup", "--project", "dataAssets", "--session", sid, "--task", "p"]);
    expect(res.code).toBe(5);
  });

  it("task-rollup succeeds when all children done", () => {
    const sid = seedRollup();
    run(["task-update", "--project", "dataAssets", "--session", sid, "--task", "c1", "--status", "done"]);
    run(["task-update", "--project", "dataAssets", "--session", sid, "--task", "c2", "--status", "done"]);
    const res = run(["task-rollup", "--project", "dataAssets", "--session", sid, "--task", "p"]);
    expect(res.code).toBe(0);
    const s = JSON.parse(run(["session-read", "--project", "dataAssets", "--session", sid]).stdout);
    expect(s.tasks.find((t: { id: string }) => t.id === "p").status).toBe("done");
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
    expect(got).toEqual({ x: 1 });
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
    expect(got.data.length).toBe(100_000);
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
    expect(dry.plan.length).toBe(2);

    const real = JSON.parse(run(["migrate", "--from", "legacy", "--project", "dataAssets"],
      { WORKSPACE_DIR: join(TMP, "workspace") }).stdout);
    expect(real.migrated).toBe(2);

    const again = JSON.parse(run(["migrate", "--from", "legacy", "--project", "dataAssets"],
      { WORKSPACE_DIR: join(TMP, "workspace") }).stdout);
    expect(again.migrated).toBe(0);
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
    expect(result.migrated).toBe(2);
    const sessionIds = result.results.map((r: { sessionId: string }) => r.sessionId).sort();
    expect(sessionIds).toEqual(["ui-autotest/shared-suite-alpha", "ui-autotest/shared-suite-beta"]);
  });
});

describe("migrate-session", () => {
  function setupSession(opts: { slug: string; withEnhanced: boolean }) {
    const sourcePath = `workspace/dataAssets/prds/202604/${opts.slug}.md`;
    const sid = JSON.parse(run([
      "session-create",
      "--workflow", "test-case-gen", "--project", "dataAssets",
      "--source-type", "prd", "--source-path", sourcePath,
    ]).stdout).session_id;
    run(["task-add", "--project", "dataAssets", "--session", sid,
      "--tasks", JSON.stringify([
        { id: "transform", name: "Transform", kind: "node", order: 1 },
        { id: "enhance", name: "Enhance", kind: "node", order: 2 },
        { id: "discuss", name: "Discuss", kind: "node", order: 3 },
      ])]);
    if (opts.withEnhanced) {
      const dir = join(TMP, "workspace", "dataAssets", "prds", "202604", opts.slug);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "enhanced.md"), "---\nschema_version: 1\n---\n");
    }
    return sid;
  }

  it("auto-done when enhanced.md exists", () => {
    const sid = setupSession({ slug: "demo-auto", withEnhanced: true });
    const result = JSON.parse(
      run(["migrate-session", "--project", "dataAssets", "--session-id", sid],
        { WORKSPACE_DIR: join(TMP, "workspace") }).stdout,
    );
    expect(result.migrated.length).toBe(1);
    expect(result.migrated[0].action).toBe("auto-done");
    expect(result.dry_run).toBe(false);

    const session = JSON.parse(run([
      "session-read", "--project", "dataAssets", "--session", sid,
    ]).stdout);
    const transform = session.tasks.find((t: { id: string }) => t.id === "transform");
    const enhance = session.tasks.find((t: { id: string }) => t.id === "enhance");
    expect(transform.status).toBe("done");
    expect(enhance.status).toBe("done");
  });

  it("revert-to-discuss when enhanced.md missing", () => {
    const sid = setupSession({ slug: "demo-revert", withEnhanced: false });
    const result = JSON.parse(
      run(["migrate-session", "--project", "dataAssets", "--session-id", sid],
        { WORKSPACE_DIR: join(TMP, "workspace") }).stdout,
    );
    expect(result.migrated[0].action).toBe("revert-to-discuss");

    const session = JSON.parse(run([
      "session-read", "--project", "dataAssets", "--session", sid,
    ]).stdout);
    const transform = session.tasks.find((t: { id: string }) => t.id === "transform");
    const discuss = session.tasks.find((t: { id: string }) => t.id === "discuss");
    expect(transform).toBe(undefined);
    expect(discuss.status).toBe("pending");
  });

  it("dry-run reports without mutating", () => {
    const sid = setupSession({ slug: "demo-dry", withEnhanced: true });
    const result = JSON.parse(
      run(["migrate-session", "--project", "dataAssets", "--session-id", sid, "--dry-run"],
        { WORKSPACE_DIR: join(TMP, "workspace") }).stdout,
    );
    expect(result.dry_run).toBe(true);
    expect(result.migrated[0].action).toBe("auto-done");

    const session = JSON.parse(run([
      "session-read", "--project", "dataAssets", "--session", sid,
    ]).stdout);
    const transform = session.tasks.find((t: { id: string }) => t.id === "transform");
    expect(transform.status).toBe("pending");
  });

  it("migrates all sessions when --session-id omitted", () => {
    setupSession({ slug: "batch-a", withEnhanced: true });
    setupSession({ slug: "batch-b", withEnhanced: false });
    const result = JSON.parse(
      run(["migrate-session", "--project", "dataAssets"],
        { WORKSPACE_DIR: join(TMP, "workspace") }).stdout,
    );
    expect(result.migrated.length).toBe(2);
    const actions = result.migrated.map((r: { action: string }) => r.action).sort();
    expect(actions).toEqual(["auto-done", "revert-to-discuss"]);
  });
});
).toBe("blocked");
    expect(c1.reason).toBe("需人工");
  });

  it("task-rollup fails with exit 5 when children unfinished", () => {
    const sid = seedRollup();
    const res = run(["task-rollup", "--project", "dataAssets", "--session", sid, "--task", "p"]);
    expect(res.code).toBe(5);
  });

  it("task-rollup succeeds when all children done", () => {
    const sid = seedRollup();
    run(["task-update", "--project", "dataAssets", "--session", sid, "--task", "c1", "--status", "done"]);
    run(["task-update", "--project", "dataAssets", "--session", sid, "--task", "c2", "--status", "done"]);
    const res = run(["task-rollup", "--project", "dataAssets", "--session", sid, "--task", "p"]);
    expect(res.code).toBe(0);
    const s = JSON.parse(run(["session-read", "--project", "dataAssets", "--session", sid]).stdout);
    expect(s.tasks.find((t: { id: string }) => t.id === "p").status).toBe("done");
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
    expect(got).toEqual({ x: 1 });
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
    expect(got.data.length).toBe(100_000);
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
    expect(dry.plan.length).toBe(2);

    const real = JSON.parse(run(["migrate", "--from", "legacy", "--project", "dataAssets"],
      { WORKSPACE_DIR: join(TMP, "workspace") }).stdout);
    expect(real.migrated).toBe(2);

    const again = JSON.parse(run(["migrate", "--from", "legacy", "--project", "dataAssets"],
      { WORKSPACE_DIR: join(TMP, "workspace") }).stdout);
    expect(again.migrated).toBe(0);
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
    expect(result.migrated).toBe(2);
    const sessionIds = result.results.map((r: { sessionId: string }) => r.sessionId).sort();
    expect(sessionIds).toEqual(["ui-autotest/shared-suite-alpha", "ui-autotest/shared-suite-beta"]);
  });
});

describe("migrate-session", () => {
  function setupSession(opts: { slug: string; withEnhanced: boolean }) {
    const sourcePath = `workspace/dataAssets/prds/202604/${opts.slug}.md`;
    const sid = JSON.parse(run([
      "session-create",
      "--workflow", "test-case-gen", "--project", "dataAssets",
      "--source-type", "prd", "--source-path", sourcePath,
    ]).stdout).session_id;
    run(["task-add", "--project", "dataAssets", "--session", sid,
      "--tasks", JSON.stringify([
        { id: "transform", name: "Transform", kind: "node", order: 1 },
        { id: "enhance", name: "Enhance", kind: "node", order: 2 },
        { id: "discuss", name: "Discuss", kind: "node", order: 3 },
      ])]);
    if (opts.withEnhanced) {
      const dir = join(TMP, "workspace", "dataAssets", "prds", "202604", opts.slug);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "enhanced.md"), "---\nschema_version: 1\n---\n");
    }
    return sid;
  }

  it("auto-done when enhanced.md exists", () => {
    const sid = setupSession({ slug: "demo-auto", withEnhanced: true });
    const result = JSON.parse(
      run(["migrate-session", "--project", "dataAssets", "--session-id", sid],
        { WORKSPACE_DIR: join(TMP, "workspace") }).stdout,
    );
    expect(result.migrated.length).toBe(1);
    expect(result.migrated[0].action).toBe("auto-done");
    expect(result.dry_run).toBe(false);

    const session = JSON.parse(run([
      "session-read", "--project", "dataAssets", "--session", sid,
    ]).stdout);
    const transform = session.tasks.find((t: { id: string }) => t.id === "transform");
    const enhance = session.tasks.find((t: { id: string }) => t.id === "enhance");
    expect(transform.status).toBe("done");
    expect(enhance.status).toBe("done");
  });

  it("revert-to-discuss when enhanced.md missing", () => {
    const sid = setupSession({ slug: "demo-revert", withEnhanced: false });
    const result = JSON.parse(
      run(["migrate-session", "--project", "dataAssets", "--session-id", sid],
        { WORKSPACE_DIR: join(TMP, "workspace") }).stdout,
    );
    expect(result.migrated[0].action).toBe("revert-to-discuss");

    const session = JSON.parse(run([
      "session-read", "--project", "dataAssets", "--session", sid,
    ]).stdout);
    const transform = session.tasks.find((t: { id: string }) => t.id === "transform");
    const discuss = session.tasks.find((t: { id: string }) => t.id === "discuss");
    expect(transform).toBe(undefined);
    expect(discuss.status).toBe("pending");
  });

  it("dry-run reports without mutating", () => {
    const sid = setupSession({ slug: "demo-dry", withEnhanced: true });
    const result = JSON.parse(
      run(["migrate-session", "--project", "dataAssets", "--session-id", sid, "--dry-run"],
        { WORKSPACE_DIR: join(TMP, "workspace") }).stdout,
    );
    expect(result.dry_run).toBe(true);
    expect(result.migrated[0].action).toBe("auto-done");

    const session = JSON.parse(run([
      "session-read", "--project", "dataAssets", "--session", sid,
    ]).stdout);
    const transform = session.tasks.find((t: { id: string }) => t.id === "transform");
    expect(transform.status).toBe("pending");
  });

  it("migrates all sessions when --session-id omitted", () => {
    setupSession({ slug: "batch-a", withEnhanced: true });
    setupSession({ slug: "batch-b", withEnhanced: false });
    const result = JSON.parse(
      run(["migrate-session", "--project", "dataAssets"],
        { WORKSPACE_DIR: join(TMP, "workspace") }).stdout,
    );
    expect(result.migrated.length).toBe(2);
    const actions = result.migrated.map((r: { action: string }) => r.action).sort();
    expect(actions).toEqual(["auto-done", "revert-to-discuss"]);
  });
});
