import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
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
