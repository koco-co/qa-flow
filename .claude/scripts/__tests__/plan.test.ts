import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const TMP_DIR = join(tmpdir(), `kata-plan-test-${process.pid}`);

function runPlan(
  args: string[],
  extraEnv: Record<string, string> = {},
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(
      "kata-cli",
      ["plan", ...args],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: {
          ...process.env,
          WORKSPACE_DIR: join(TMP_DIR, "workspace"),
          ...extraEnv,
        },
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

function planJsonPath(project: string, planId: string): string {
  return join(TMP_DIR, "workspace", project, ".temp", `plan-${planId}.json`);
}

function planMdPath(project: string, planId: string): string {
  return join(TMP_DIR, "workspace", project, ".temp", `plan-${planId}.md`);
}

before(() => {
  mkdirSync(join(TMP_DIR, "workspace", "dataAssets", ".temp"), { recursive: true });
});

after(() => {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

// ── create ───────────────────────────────────────────────────────────────────

describe("plan.ts create", () => {
  it("creates plan JSON and MD for test-case-gen workflow", () => {
    const { stdout, code } = runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--inputs", '{"prd":"workspace/dataAssets/prds/202604/my-feature.md","mode":"normal"}',
      "--plan-id", "tcg-my-feature-create",
    ]);

    assert.equal(code, 0, `should exit 0, got stderr: ${stdout}`);
    const result = JSON.parse(stdout);
    assert.equal(result.version, 1);
    assert.equal(result.workflow, "test-case-gen");
    assert.equal(result.project, "dataAssets");
    assert.equal(result.plan_id, "tcg-my-feature-create");
    assert.equal(result.steps.length, 8);
    assert.equal(result.steps[0].name, "init");
    assert.equal(result.steps[0].status, "pending");
    assert.ok(result.created_at);
    assert.ok(result._md_path);
  });

  it("creates plan JSON and MD for ui-autotest workflow", () => {
    const { stdout, code } = runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "ui-autotest",
      "--inputs", '{"archive":"workspace/dataAssets/archive/test.md"}',
      "--plan-id", "uat-test-create",
    ]);

    assert.equal(code, 0);
    const result = JSON.parse(stdout);
    assert.equal(result.workflow, "ui-autotest");
    assert.equal(result.steps.length, 6);
    assert.equal(result.steps[0].name, "解析用例");
  });

  it("JSON and MD files exist on disk after create", () => {
    const planId = "tcg-disk-check";
    runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--plan-id", planId,
    ]);

    assert.ok(existsSync(planJsonPath("dataAssets", planId)), "JSON file should exist");
    assert.ok(existsSync(planMdPath("dataAssets", planId)), "MD file should exist");
  });

  it("auto-generates plan-id when not provided", () => {
    const { stdout, code } = runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--inputs", '{"prd":"workspace/dataAssets/prds/202604/auto-id-test.md"}',
    ]);

    assert.equal(code, 0);
    const result = JSON.parse(stdout);
    assert.ok(result.plan_id.startsWith("tcg-"), `plan_id should start with tcg-, got: ${result.plan_id}`);
    assert.ok(result.plan_id.includes("auto-id-test"), `plan_id should contain input hint, got: ${result.plan_id}`);
  });

  it("exits 1 for unknown workflow", () => {
    const { code, stderr } = runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "unknown-workflow",
    ]);

    assert.equal(code, 1);
    assert.match(stderr, /unknown workflow/);
  });

  it("exits 1 for invalid inputs JSON", () => {
    const { code, stderr } = runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--inputs", "{bad json",
    ]);

    assert.equal(code, 1);
    assert.match(stderr, /invalid --inputs JSON/);
  });

  it("stores state-file when provided", () => {
    const planId = "tcg-state-file";
    const { stdout } = runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--plan-id", planId,
      "--state-file", "/some/state/path.json",
    ]);

    const result = JSON.parse(stdout);
    assert.equal(result.state_file, "/some/state/path.json");
  });

  it("all steps have pending status and correct depends_on", () => {
    const { stdout } = runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--plan-id", "tcg-deps-check",
    ]);

    const result = JSON.parse(stdout);
    for (const step of result.steps) {
      assert.equal(step.status, "pending");
    }
    assert.deepEqual(result.steps[0].depends_on, []);
    assert.deepEqual(result.steps[1].depends_on, ["step-1"]);
    assert.deepEqual(result.steps[7].depends_on, ["step-7"]);
  });
});

// ── update ───────────────────────────────────────────────────────────────────

describe("plan.ts update", () => {
  const PLAN_ID = "tcg-update-test";

  it("updates step status to in_progress with started_at", () => {
    runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--plan-id", PLAN_ID,
    ]);

    const { stdout, code } = runPlan([
      "update",
      "--project", "dataAssets",
      "--plan-id", PLAN_ID,
      "--step", "step-1",
      "--status", "in_progress",
    ]);

    assert.equal(code, 0);
    const result = JSON.parse(stdout);
    const step1 = result.steps.find((s: { id: string }) => s.id === "step-1");
    assert.equal(step1.status, "in_progress");
    assert.ok(step1.started_at, "should have started_at");
    assert.equal(step1.completed_at, undefined);
  });

  it("updates step status to completed with completed_at", () => {
    const planId = "tcg-complete-test";
    runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--plan-id", planId,
    ]);

    runPlan([
      "update",
      "--project", "dataAssets",
      "--plan-id", planId,
      "--step", "step-1",
      "--status", "in_progress",
    ]);

    const { stdout } = runPlan([
      "update",
      "--project", "dataAssets",
      "--plan-id", planId,
      "--step", "step-1",
      "--status", "completed",
    ]);

    const result = JSON.parse(stdout);
    const step1 = result.steps.find((s: { id: string }) => s.id === "step-1");
    assert.equal(step1.status, "completed");
    assert.ok(step1.started_at);
    assert.ok(step1.completed_at);
  });

  it("merges metadata into step", () => {
    const planId = "tcg-metadata-test";
    runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--plan-id", planId,
    ]);

    const { stdout } = runPlan([
      "update",
      "--project", "dataAssets",
      "--plan-id", planId,
      "--step", "step-1",
      "--status", "completed",
      "--metadata", '{"confidence":0.95,"modules":3}',
    ]);

    const result = JSON.parse(stdout);
    const step1 = result.steps.find((s: { id: string }) => s.id === "step-1");
    assert.equal(step1.metadata.confidence, 0.95);
    assert.equal(step1.metadata.modules, 3);
  });

  it("does not overwrite started_at on repeated in_progress", () => {
    const planId = "tcg-no-overwrite-start";
    runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--plan-id", planId,
    ]);

    const { stdout: first } = runPlan([
      "update",
      "--project", "dataAssets",
      "--plan-id", planId,
      "--step", "step-1",
      "--status", "in_progress",
    ]);
    const firstStartedAt = JSON.parse(first).steps.find((s: { id: string }) => s.id === "step-1").started_at;

    const { stdout: second } = runPlan([
      "update",
      "--project", "dataAssets",
      "--plan-id", planId,
      "--step", "step-1",
      "--status", "in_progress",
    ]);
    const secondStartedAt = JSON.parse(second).steps.find((s: { id: string }) => s.id === "step-1").started_at;

    assert.equal(firstStartedAt, secondStartedAt, "started_at should not change on repeated in_progress");
  });

  it("exits 1 for nonexistent plan", () => {
    const { code, stderr } = runPlan([
      "update",
      "--project", "dataAssets",
      "--plan-id", "nonexistent-plan",
      "--step", "step-1",
      "--status", "completed",
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /not found/);
  });

  it("exits 1 for nonexistent step", () => {
    const planId = "tcg-bad-step";
    runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--plan-id", planId,
    ]);

    const { code, stderr } = runPlan([
      "update",
      "--project", "dataAssets",
      "--plan-id", planId,
      "--step", "step-99",
      "--status", "completed",
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /step.*not found/);
  });

  it("exits 1 for invalid status", () => {
    const planId = "tcg-bad-status";
    runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--plan-id", planId,
    ]);

    const { code, stderr } = runPlan([
      "update",
      "--project", "dataAssets",
      "--plan-id", planId,
      "--step", "step-1",
      "--status", "invalid-status",
    ]);
    assert.equal(code, 1);
    assert.match(stderr, /invalid status/);
  });

  it("also updates the MD file", () => {
    const planId = "tcg-md-update";
    runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--plan-id", planId,
    ]);

    runPlan([
      "update",
      "--project", "dataAssets",
      "--plan-id", planId,
      "--step", "step-1",
      "--status", "completed",
    ]);

    const md = readFileSync(planMdPath("dataAssets", planId), "utf8");
    assert.ok(md.includes("\u2705"), "MD should contain completed emoji");
    assert.ok(md.includes("完成"), "MD should contain completion label");
  });
});

// ── summary ──────────────────────────────────────────────────────────────────

describe("plan.ts summary", () => {
  it("returns correct progress counts", () => {
    const planId = "tcg-summary-test";
    runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--plan-id", planId,
    ]);

    runPlan(["update", "--project", "dataAssets", "--plan-id", planId, "--step", "step-1", "--status", "completed"]);
    runPlan(["update", "--project", "dataAssets", "--plan-id", planId, "--step", "step-2", "--status", "completed"]);
    runPlan(["update", "--project", "dataAssets", "--plan-id", planId, "--step", "step-3", "--status", "in_progress"]);

    const { stdout, code } = runPlan([
      "summary",
      "--project", "dataAssets",
      "--plan-id", planId,
    ]);

    assert.equal(code, 0);
    const summary = JSON.parse(stdout);
    assert.equal(summary.total, 8);
    assert.equal(summary.completed, 2);
    assert.equal(summary.in_progress, 1);
    assert.equal(summary.pending, 5);
    assert.equal(summary.skipped, 0);
    assert.equal(summary.progress_pct, 25);
    assert.equal(summary.current_step.id, "step-3");
    assert.equal(summary.current_step.name, "enhance");
  });

  it("exits 1 for nonexistent plan", () => {
    const { code } = runPlan([
      "summary",
      "--project", "dataAssets",
      "--plan-id", "nonexistent-summary",
    ]);
    assert.equal(code, 1);
  });

  it("returns 0% when all steps are pending", () => {
    const planId = "tcg-all-pending";
    runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--plan-id", planId,
    ]);

    const { stdout } = runPlan([
      "summary",
      "--project", "dataAssets",
      "--plan-id", planId,
    ]);

    const summary = JSON.parse(stdout);
    assert.equal(summary.progress_pct, 0);
    assert.equal(summary.current_step.id, "step-1");
  });
});

// ── render ───────────────────────────────────────────────────────────────────

describe("plan.ts render", () => {
  it("regenerates MD from current JSON state", () => {
    const planId = "tcg-render-test";
    runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--plan-id", planId,
    ]);

    runPlan(["update", "--project", "dataAssets", "--plan-id", planId, "--step", "step-1", "--status", "completed"]);

    const { stdout, code } = runPlan([
      "render",
      "--project", "dataAssets",
      "--plan-id", planId,
    ]);

    assert.equal(code, 0);
    const result = JSON.parse(stdout);
    assert.equal(result.rendered, true);
    assert.ok(result.path.endsWith(".md"));

    const md = readFileSync(result.path, "utf8");
    assert.ok(md.includes("test-case-gen"));
    assert.ok(md.includes("\u2705"));
  });

  it("exits 1 for nonexistent plan", () => {
    const { code } = runPlan([
      "render",
      "--project", "dataAssets",
      "--plan-id", "nonexistent-render",
    ]);
    assert.equal(code, 1);
  });
});

// ── list ─────────────────────────────────────────────────────────────────────

describe("plan.ts list", () => {
  it("lists all plans for a project", () => {
    runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--plan-id", "tcg-list-a",
    ]);
    runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "ui-autotest",
      "--plan-id", "uat-list-b",
    ]);

    const { stdout, code } = runPlan([
      "list",
      "--project", "dataAssets",
    ]);

    assert.equal(code, 0);
    const plans = JSON.parse(stdout) as Array<{ plan_id: string }>;
    const ids = plans.map((p) => p.plan_id);
    assert.ok(ids.includes("tcg-list-a"));
    assert.ok(ids.includes("uat-list-b"));
  });

  it("filters by workflow type", () => {
    runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--plan-id", "tcg-filter-only",
    ]);
    runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "ui-autotest",
      "--plan-id", "uat-filter-only",
    ]);

    const { stdout } = runPlan([
      "list",
      "--project", "dataAssets",
      "--workflow", "ui-autotest",
    ]);

    const plans = JSON.parse(stdout) as Array<{ plan_id: string; workflow: string }>;
    for (const p of plans) {
      assert.equal(p.workflow, "ui-autotest");
    }
    assert.ok(plans.some((p) => p.plan_id === "uat-filter-only"));
  });

  it("returns empty array for nonexistent project", () => {
    const { stdout, code } = runPlan([
      "list",
      "--project", "nonexistent-project",
    ]);

    assert.equal(code, 0);
    const plans = JSON.parse(stdout);
    assert.deepEqual(plans, []);
  });

  it("includes progress_pct in list output", () => {
    const planId = "tcg-list-pct";
    runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--plan-id", planId,
    ]);
    runPlan(["update", "--project", "dataAssets", "--plan-id", planId, "--step", "step-1", "--status", "completed"]);

    const { stdout } = runPlan(["list", "--project", "dataAssets"]);
    const plans = JSON.parse(stdout) as Array<{ plan_id: string; progress_pct: number }>;
    const target = plans.find((p) => p.plan_id === planId);
    assert.ok(target);
    assert.equal(target.progress_pct, 13); // 1/8 = 12.5 → round to 13
  });
});

// ── MD content ───────────────────────────────────────────────────────────────

describe("plan.ts MD rendering", () => {
  it("MD contains workflow, project, and step table", () => {
    const planId = "tcg-md-content";
    runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--plan-id", planId,
      "--inputs", '{"prd":"test.md"}',
    ]);

    const md = readFileSync(planMdPath("dataAssets", planId), "utf8");
    assert.ok(md.includes("test-case-gen"));
    assert.ok(md.includes("dataAssets"));
    assert.ok(md.includes("| # | 步骤 | 状态 | 耗时 |"));
    assert.ok(md.includes("init"));
    assert.ok(md.includes("prd"));
    assert.ok(md.includes("\u23F3")); // pending emoji
  });

  it("skipped status renders correctly", () => {
    const planId = "tcg-md-skip";
    runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--plan-id", planId,
    ]);

    runPlan([
      "update",
      "--project", "dataAssets",
      "--plan-id", planId,
      "--step", "step-3",
      "--status", "skipped",
    ]);

    const md = readFileSync(planMdPath("dataAssets", planId), "utf8");
    assert.ok(md.includes("跳过"));
  });
});
