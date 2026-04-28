import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, it, expect } from "bun:test";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
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
          KATA_ROOT_OVERRIDE: TMP_DIR,
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
  return join(TMP_DIR, ".kata", project, `plan-${planId}.json`);
}

function planMdPath(project: string, planId: string): string {
  return join(TMP_DIR, ".kata", project, `plan-${planId}.md`);
}

beforeEach(() => {
  mkdirSync(join(TMP_DIR, ".kata", "dataAssets"), { recursive: true });
});

afterEach(() => {
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

    expect(code).toBe(0);
    const result = JSON.parse(stdout);
    expect(result.version).toBe(1);
    expect(result.workflow).toBe("test-case-gen");
    expect(result.project).toBe("dataAssets");
    expect(result.plan_id).toBe("tcg-my-feature-create");
    expect(result.steps.length).toBe(8);
    expect(result.steps[0].name).toBe("init");
    expect(result.steps[0].status).toBe("pending");
    expect(result.created_at).toBeTruthy();
    expect(result._md_path).toBeTruthy();
  });

  it("creates plan JSON and MD for ui-autotest workflow", () => {
    const { stdout, code } = runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "ui-autotest",
      "--inputs", '{"archive":"workspace/dataAssets/archive/test.md"}',
      "--plan-id", "uat-test-create",
    ]);

    expect(code).toBe(0);
    const result = JSON.parse(stdout);
    expect(result.workflow).toBe("ui-autotest");
    expect(result.steps.length).toBe(6);
    expect(result.steps[0].name).toBe("解析输入与范围确认");
  });

  it("JSON and MD files exist on disk after create", () => {
    const planId = "tcg-disk-check";
    runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--plan-id", planId,
    ]);

    expect(existsSync(planJsonPath("dataAssets", planId).toBeTruthy()), "JSON file should exist");
    expect(existsSync(planMdPath("dataAssets", planId).toBeTruthy()), "MD file should exist");
  });

  it("auto-generates plan-id when not provided", () => {
    const { stdout, code } = runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--inputs", '{"prd":"workspace/dataAssets/prds/202604/auto-id-test.md"}',
    ]);

    expect(code).toBe(0);
    const result = JSON.parse(stdout);
    expect(result.plan_id.startsWith("tcg-").toBeTruthy(), `plan_id should start with tcg-, got: ${result.plan_id}`);
    expect(result.plan_id.includes("auto-id-test").toBeTruthy(), `plan_id should contain input hint, got: ${result.plan_id}`);
  });

  it("exits 1 for unknown workflow", () => {
    const { code, stderr } = runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "unknown-workflow",
    ]);

    expect(code).toBe(1);
    expect(stderr).toMatch(/unknown workflow/);
  });

  it("exits 1 for invalid inputs JSON", () => {
    const { code, stderr } = runPlan([
      "create",
      "--project", "dataAssets",
      "--workflow", "test-case-gen",
      "--inputs", "{bad json",
    ]);

    expect(code).toBe(1);
    expect(stderr).toMatch(/invalid --inputs JSON/);
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
    expect(result.state_file).toBe("/some/state/path.json");
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
      expect(step.status).toBe("pending");
    }
    expect(result.steps[0].depends_on).toEqual([]);
    expect(result.steps[1].depends_on).toEqual(["step-1"]);
    expect(result.steps[7].depends_on).toEqual(["step-7"]);
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

    expect(code).toBe(0);
    const result = JSON.parse(stdout);
    const step1 = result.steps.find((s: { id: string }) => s.id === "step-1");
    expect(step1.status).toBe("in_progress");
    expect(step1.started_at).toBeTruthy();
    expect(step1.completed_at).toBe(undefined);
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
    expect(step1.status).toBe("completed");
    expect(step1.started_at).toBeTruthy();
    expect(step1.completed_at).toBeTruthy();
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
    expect(step1.metadata.confidence).toBe(0.95);
    expect(step1.metadata.modules).toBe(3);
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

    expect(firstStartedAt).toBe(secondStartedAt);
  });

  it("exits 1 for nonexistent plan", () => {
    const { code, stderr } = runPlan([
      "update",
      "--project", "dataAssets",
      "--plan-id", "nonexistent-plan",
      "--step", "step-1",
      "--status", "completed",
    ]);
    expect(code).toBe(1);
    expect(stderr).toMatch(/not found/);
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
    expect(code).toBe(1);
    expect(stderr).toMatch(/step.*not found/);
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
    expect(code).toBe(1);
    expect(stderr).toMatch(/invalid status/);
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
    expect(md.includes("\u2705").toBeTruthy(), "MD should contain completed emoji");
    expect(md.includes("完成").toBeTruthy(), "MD should contain completion label");
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

    expect(code).toBe(0);
    const summary = JSON.parse(stdout);
    expect(summary.total).toBe(8);
    expect(summary.completed).toBe(2);
    expect(summary.in_progress).toBe(1);
    expect(summary.pending).toBe(5);
    expect(summary.skipped).toBe(0);
    expect(summary.progress_pct).toBe(25);
    expect(summary.current_step.id).toBe("step-3");
    expect(summary.current_step.name).toBe("discuss");
  });

  it("exits 1 for nonexistent plan", () => {
    const { code } = runPlan([
      "summary",
      "--project", "dataAssets",
      "--plan-id", "nonexistent-summary",
    ]);
    expect(code).toBe(1);
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
    expect(summary.progress_pct).toBe(0);
    expect(summary.current_step.id).toBe("step-1");
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

    expect(code).toBe(0);
    const result = JSON.parse(stdout);
    expect(result.rendered).toBe(true);
    expect(result.path.endsWith(".md").toBeTruthy());

    const md = readFileSync(result.path, "utf8");
    expect(md.includes("test-case-gen").toBeTruthy());
    expect(md.includes("\u2705").toBeTruthy());
  });

  it("exits 1 for nonexistent plan", () => {
    const { code } = runPlan([
      "render",
      "--project", "dataAssets",
      "--plan-id", "nonexistent-render",
    ]);
    expect(code).toBe(1);
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

    expect(code).toBe(0);
    const plans = JSON.parse(stdout) as Array<{ plan_id: string }>;
    const ids = plans.map((p) => p.plan_id);
    expect(ids.includes("tcg-list-a").toBeTruthy());
    expect(ids.includes("uat-list-b").toBeTruthy());
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
      expect(p.workflow).toBe("ui-autotest");
    }
    expect(plans.some((p) => p.plan_id === "uat-filter-only")).toBeTruthy();
  });

  it("returns empty array for nonexistent project", () => {
    const { stdout, code } = runPlan([
      "list",
      "--project", "nonexistent-project",
    ]);

    expect(code).toBe(0);
    const plans = JSON.parse(stdout);
    expect(plans).toEqual([]);
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
    expect(target).toBeTruthy();
    expect(target.progress_pct).toBe(13); // 1/8 = 12.5 → round to 13
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
    expect(md.includes("test-case-gen").toBeTruthy());
    expect(md.includes("dataAssets").toBeTruthy());
    expect(md.includes("| # | 步骤 | 状态 | 耗时 |").toBeTruthy());
    expect(md.includes("init").toBeTruthy());
    expect(md.includes("prd").toBeTruthy());
    expect(md.includes("\u23F3").toBeTruthy()); // pending emoji
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
    expect(md.includes("跳过").toBeTruthy());
  });
});
