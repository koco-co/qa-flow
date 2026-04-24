import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";
import { migrateKataState, migrateUiAutotest } from "../../lib/progress-migrator.ts";
import { readSession } from "../../lib/progress-store.ts";

const TMP = join(tmpdir(), `migrator-test-${process.pid}`);

before(() => {
  process.env.KATA_ROOT_OVERRIDE = TMP;
  mkdirSync(TMP, { recursive: true });
});
after(() => {
  delete process.env.KATA_ROOT_OVERRIDE;
  try { rmSync(TMP, { recursive: true, force: true }); } catch {}
});
beforeEach(() => {
  process.env.KATA_ROOT_OVERRIDE = TMP;
  try { rmSync(join(TMP, ".kata"), { recursive: true, force: true }); } catch {}
  try { rmSync(join(TMP, "workspace"), { recursive: true, force: true }); } catch {}
});

function writeLegacyKataState(fileName: string, data: object): string {
  const dir = join(TMP, "workspace", "dataAssets", ".temp");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, fileName);
  writeFileSync(path, JSON.stringify(data));
  return path;
}

describe("migrateKataState", () => {
  it("converts completed_nodes + current_node to done/running tasks", async () => {
    const legacyPath = writeLegacyKataState(".kata-state-prd-xxx-default.json", {
      project: "dataAssets",
      prd: "workspace/dataAssets/prds/202604/prd-xxx.md",
      mode: "normal",
      current_node: "write",
      completed_nodes: ["transform", "enhance", "analyze"],
      node_outputs: {
        transform: { confidence: 0.9 },
        enhance: { notes: "ok" },
      },
      writers: { w1: "data" },
      strategy_resolution: { strategy: "cautious" },
      created_at: "2026-04-24T10:00:00Z",
      updated_at: "2026-04-24T11:00:00Z",
    });

    const { sessionId } = await migrateKataState({
      legacyPath, project: "dataAssets", env: "default", dryRun: false,
    });

    const s = readSession("dataAssets", sessionId)!;
    assert.equal(s.workflow, "test-case-gen");
    assert.equal(s.tasks.length, 7);

    const byId = Object.fromEntries(s.tasks.map((t) => [t.id, t])) as Record<string, {
      status: string; depends_on: readonly string[]; payload: Record<string, unknown>;
    }>;
    assert.equal(byId.transform.status, "done");
    assert.equal(byId.enhance.status, "done");
    assert.equal(byId.analyze.status, "done");
    assert.equal(byId.write.status, "running");
    assert.equal(byId.review.status, "pending");
    assert.deepEqual(byId.enhance.depends_on, ["transform"]);
    assert.deepEqual(byId.analyze.depends_on, ["enhance"]);
    assert.equal(byId.transform.payload.confidence, 0.9);

    assert.deepEqual(s.artifacts.writers, { w1: "data" });
    assert.deepEqual(s.artifacts.strategy_resolution, { strategy: "cautious" });
    assert.equal(s.source.path, "workspace/dataAssets/prds/202604/prd-xxx.md");
    assert.equal(s.meta.mode, "normal");
  });

  it("dry-run does not create any file", async () => {
    const legacyPath = writeLegacyKataState(".kata-state-prd-yyy-default.json", {
      project: "dataAssets", prd: "y.md", mode: "normal",
      current_node: "init", completed_nodes: [], node_outputs: {},
      writers: {}, created_at: "now", updated_at: "now",
    });
    await migrateKataState({
      legacyPath, project: "dataAssets", env: "default", dryRun: true,
    });
    assert.equal(existsSync(join(TMP, ".kata")), false);
  });

  it("refuses to overwrite existing session", async () => {
    const legacyPath = writeLegacyKataState(".kata-state-prd-zzz-default.json", {
      project: "dataAssets", prd: "z.md", mode: "normal",
      current_node: "init", completed_nodes: [], node_outputs: {},
      writers: {}, created_at: "now", updated_at: "now",
    });
    await migrateKataState({ legacyPath, project: "dataAssets", env: "default", dryRun: false });
    // Since first call moved legacyPath to backup, re-seed a fresh legacy file for the second call
    const legacyPath2 = writeLegacyKataState(".kata-state-prd-zzz-default.json", {
      project: "dataAssets", prd: "z.md", mode: "normal",
      current_node: "init", completed_nodes: [], node_outputs: {},
      writers: {}, created_at: "now", updated_at: "now",
    });
    await assert.rejects(
      () => migrateKataState({ legacyPath: legacyPath2, project: "dataAssets", env: "default", dryRun: false }),
      /already exists/i,
    );
  });
});

function writeLegacyUiAutotest(fileName: string, data: object): string {
  const dir = join(TMP, "workspace", "dataAssets", ".temp");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, fileName);
  writeFileSync(path, JSON.stringify(data));
  return path;
}

describe("migrateUiAutotest", () => {
  it("converts cases to tasks under a virtual suite phase", async () => {
    const legacyPath = writeLegacyUiAutotest("ui-autotest-progress-my-suite-ci63.json", {
      version: 1,
      suite_name: "my-suite",
      env: "ci63",
      archive_md: "workspace/dataAssets/archive/foo.md",
      url: "http://localhost",
      selected_priorities: ["P0"],
      output_dir: "tests/",
      started_at: "2026-04-24T10:00:00Z",
      updated_at: "2026-04-24T11:00:00Z",
      current_step: 5,
      preconditions_ready: true,
      merge_status: "pending",
      cases: {
        t1: {
          title: "login", priority: "P0",
          generated: true, script_path: "tests/login.spec.ts",
          test_status: "passed", attempts: 1,
          error_history: [],
        },
        t2: {
          title: "logout", priority: "P0",
          generated: true, script_path: "tests/logout.spec.ts",
          test_status: "failed", attempts: 2,
          error_history: [{ at: "2026-04-24T10:30:00Z", message: "timeout" }],
        },
      },
    });

    const { sessionId } = await migrateUiAutotest({
      legacyPath, project: "dataAssets", env: "ci63", dryRun: false,
    });
    const s = readSession("dataAssets", sessionId)!;
    assert.equal(s.workflow, "ui-autotest");
    assert.equal(s.session_id, "ui-autotest/my-suite-ci63");
    assert.equal(s.tasks.length, 3);
    const suite = s.tasks.find((t) => t.kind === "phase")!;
    assert.equal(suite.status, "running");
    const cases = s.tasks.filter((t) => t.kind === "case");
    const t1 = cases.find((c) => c.id === "t1")!;
    const t2 = cases.find((c) => c.id === "t2")!;
    assert.equal(t1.status, "done");
    assert.equal(t1.payload.script_path, "tests/login.spec.ts");
    assert.equal(t2.status, "failed");
    assert.equal(t2.errors.length, 1);
    assert.equal(t2.errors[0].message, "timeout");
    assert.equal(s.meta.url, "http://localhost");
    assert.equal(s.meta.suite_name, "my-suite");
  });
});
