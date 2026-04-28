import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, beforeEach, describe, it, expect } from "bun:test";
import {
  migrateKataState,
  migrateSession,
  migrateUiAutotest,
} from "../../src/lib/progress-migrator.ts";
import {
  addTasks,
  createSession,
  readSession,
  writeSession,
} from "../../src/lib/progress-store.ts";

const TMP = join(tmpdir(), `migrator-test-${process.pid}`);
const WS = join(TMP, "workspace");

beforeEach(() => {
  process.env.KATA_ROOT_OVERRIDE = TMP;
  process.env.WORKSPACE_DIR = WS;
  mkdirSync(TMP, { recursive: true });
});
afterEach(() => {
  delete process.env.KATA_ROOT_OVERRIDE;
  delete process.env.WORKSPACE_DIR;
  try { rmSync(TMP, { recursive: true, force: true }); } catch {}
});
beforeEach(() => {
  process.env.KATA_ROOT_OVERRIDE = TMP;
  process.env.WORKSPACE_DIR = WS;
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
    expect(s.workflow).toBe("test-case-gen");
    expect(s.tasks.length).toBe(7);

    const byId = Object.fromEntries(s.tasks.map((t) => [t.id, t])) as Record<string, {
      status: string; depends_on: readonly string[]; payload: Record<string, unknown>;
    }>;
    expect(byId.transform.status).toBe("done");
    expect(byId.enhance.status).toBe("done");
    expect(byId.analyze.status).toBe("done");
    expect(byId.write.status).toBe("running");
    expect(byId.review.status).toBe("pending");
    expect(byId.enhance.depends_on).toEqual(["transform"]);
    expect(byId.analyze.depends_on).toEqual(["enhance"]);
    expect(byId.transform.payload.confidence).toBe(0.9);

    expect(s.artifacts.writers).toEqual({ w1: "data" });
    expect(s.artifacts.strategy_resolution).toEqual({ strategy: "cautious" });
    expect(s.source.path).toBe("workspace/dataAssets/prds/202604/prd-xxx.md");
    expect(s.meta.mode).toBe("normal");
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
    expect(existsSync(join(TMP, ".kata"))).toBe(false);
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
    await expect(
      () => migrateKataState({ legacyPath: legacyPath2, project: "dataAssets", env: "default", dryRun: false }),
    ).rejects.toThrow(/already exists/i);
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
    expect(s.workflow).toBe("ui-autotest");
    expect(s.session_id).toBe("ui-autotest/my-suite-ci63");
    expect(s.tasks.length).toBe(3);
    const suite = s.tasks.find((t) => t.kind === "phase")!;
    expect(suite.status).toBe("running");
    const cases = s.tasks.filter((t) => t.kind === "case");
    const t1 = cases.find((c) => c.id === "t1")!;
    const t2 = cases.find((c) => c.id === "t2")!;
    expect(t1.status).toBe("done");
    expect(t1.payload.script_path).toBe("tests/login.spec.ts");
    expect(t2.status).toBe("failed");
    expect(t2.errors.length).toBe(1);
    expect(t2.errors[0].message).toBe("timeout");
    expect(s.meta.url).toBe("http://localhost");
    expect(s.meta.suite_name).toBe("my-suite");
  });
});

// ── migrateSession (Phase D3) ────────────────────────────────────────────────

function seedSession(opts: {
  project: string;
  slug: string;
  yyyymm: string;
  taskIds: readonly string[];
}): string {
  const session = createSession({
    project: opts.project,
    workflow: "test-case-gen",
    slug: opts.slug,
    env: "default",
    source: {
      type: "prd",
      path: `workspace/${opts.project}/prds/${opts.yyyymm}/${opts.slug}.md`,
      mtime: null,
    },
    meta: {},
  });
  writeSession(opts.project, session);
  addTasks(
    opts.project,
    session.session_id,
    opts.taskIds.map((id, i) => ({
      id,
      name: id,
      kind: "node",
      order: i + 1,
    })),
  );
  return session.session_id;
}

function writeEnhancedMd(project: string, yyyymm: string, slug: string): void {
  const dir = join(WS, project, "prds", yyyymm, slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "enhanced.md"), "---\nschema_version: 1\n---\n");
}

describe("migrateSession", () => {
  it("auto-done when enhanced.md exists", () => {
    const sessionId = seedSession({
      project: "dataAssets",
      slug: "demo-feature",
      yyyymm: "202604",
      taskIds: ["transform", "enhance", "discuss", "analyze"],
    });
    writeEnhancedMd("dataAssets", "202604", "demo-feature");

    const report = migrateSession("dataAssets", sessionId);
    expect(report.action).toBe("auto-done");

    const s = readSession("dataAssets", sessionId)!;
    const transform = s.tasks.find((t) => t.id === "transform")!;
    const enhance = s.tasks.find((t) => t.id === "enhance")!;
    const analyze = s.tasks.find((t) => t.id === "analyze")!;
    expect(transform.status).toBe("done");
    expect(enhance.status).toBe("done");
    // unrelated tasks stay untouched
    expect(analyze.status).toBe("pending");
  });

  it("revert-to-discuss when enhanced.md missing", () => {
    const sessionId = seedSession({
      project: "dataAssets",
      slug: "missing-feature",
      yyyymm: "202604",
      taskIds: ["transform", "enhance", "discuss", "analyze"],
    });

    const report = migrateSession("dataAssets", sessionId);
    expect(report.action).toBe("revert-to-discuss");

    const s = readSession("dataAssets", sessionId)!;
    expect(s.tasks.find((t) => t.id === "transform")).toBe(undefined);
    expect(s.tasks.find((t) => t.id === "enhance")).toBe(undefined);
    const discuss = s.tasks.find((t) => t.id === "discuss")!;
    expect(discuss.status).toBe("pending");
    // unrelated tasks remain
    const analyze = s.tasks.find((t) => t.id === "analyze")!;
    expect(analyze.status).toBe("pending");
  });

  it("noop when session has no transform/enhance task", () => {
    const sessionId = seedSession({
      project: "dataAssets",
      slug: "fresh-feature",
      yyyymm: "202604",
      taskIds: ["discuss", "analyze", "write"],
    });

    const report = migrateSession("dataAssets", sessionId);
    expect(report.action).toBe("noop");

    const s = readSession("dataAssets", sessionId)!;
    // session shape is unchanged
    expect(s.tasks.length).toBe(3);
  });

  it("dryRun reports the action without mutating the session", () => {
    const sessionId = seedSession({
      project: "dataAssets",
      slug: "dryrun-feature",
      yyyymm: "202604",
      taskIds: ["transform", "enhance", "discuss"],
    });

    const report = migrateSession("dataAssets", sessionId, { dryRun: true });
    expect(report.action).toBe("revert-to-discuss");

    const s = readSession("dataAssets", sessionId)!;
    // tasks unchanged because dryRun
    expect(s.tasks.find((t) => t.id === "transform")?.status).toBe("pending");
    expect(s.tasks.find((t) => t.id === "enhance")?.status).toBe("pending");
    expect(s.tasks.find((t) => t.id === "discuss")?.status).toBe("pending");
  });
});
