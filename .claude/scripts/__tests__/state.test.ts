import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";

const TMP_DIR = join(tmpdir(), `qa-flow-state-test-${process.pid}`);
const WORKSPACE_TEMP = join(TMP_DIR, "workspace", ".temp");

interface QaState {
  prd: string;
  mode: string;
  current_node: string;
  completed_nodes: string[];
  node_outputs: Record<string, unknown>;
  writers: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function runState(
  args: string[],
  extraEnv: Record<string, string> = {},
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync("npx", ["tsx", ".claude/scripts/state.ts", ...args], {
      cwd: "/Users/poco/Documents/DTStack/qa-flow",
      encoding: "utf8",
      env: {
        ...process.env,
        WORKSPACE_DIR: join(TMP_DIR, "workspace"),
        ...extraEnv,
      },
    });
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

function stateFilePath(slug: string): string {
  return join(WORKSPACE_TEMP, `.qa-state-${slug}.json`);
}

before(() => {
  mkdirSync(TMP_DIR, { recursive: true });
  mkdirSync(WORKSPACE_TEMP, { recursive: true });
});

after(() => {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

beforeEach(() => {
  // Clean up any state files between tests
  try {
    const files = existsSync(WORKSPACE_TEMP) ? ([] as string[]) : [];
    for (const f of files) rmSync(join(WORKSPACE_TEMP, f));
  } catch {
    // ignore
  }
});

describe("state.ts init", () => {
  it("creates state file and outputs JSON", () => {
    const slug = `init-test-${Date.now()}`;
    const prd = `workspace/prds/202604/${slug}.md`;

    const { stdout, code } = runState(["init", "--prd", prd, "--mode", "normal"]);

    assert.equal(code, 0, `init should exit 0, stderr: ${stdout}`);
    const state = JSON.parse(stdout) as QaState;
    assert.equal(state.prd, prd);
    assert.equal(state.mode, "normal");
    assert.equal(state.current_node, "init");
    assert.deepEqual(state.completed_nodes, []);
    assert.deepEqual(state.node_outputs, {});
    assert.deepEqual(state.writers, {});
    assert.ok(state.created_at, "should have created_at");
    assert.ok(state.updated_at, "should have updated_at");
  });

  it("state file exists on disk after init", () => {
    const slug = `init-disk-${Date.now()}`;
    const prd = `workspace/prds/202604/${slug}.md`;

    runState(["init", "--prd", prd, "--mode", "normal"]);

    assert.ok(existsSync(stateFilePath(slug)), "state file should exist on disk");
  });

  it("derives prd-slug from PRD filename (basename without .md)", () => {
    const slug = `my-feature-prd-${Date.now()}`;
    const prd = `workspace/prds/202604/${slug}.md`;

    runState(["init", "--prd", prd]);

    assert.ok(existsSync(stateFilePath(slug)), `state file at expected path for slug "${slug}"`);
  });

  it("mode defaults to 'normal' when not specified", () => {
    const slug = `mode-default-${Date.now()}`;
    const prd = `workspace/prds/202604/${slug}.md`;

    const { stdout } = runState(["init", "--prd", prd]);
    const state = JSON.parse(stdout) as QaState;
    assert.equal(state.mode, "normal");
  });

  it("mode 'quick' is accepted", () => {
    const slug = `mode-quick-${Date.now()}`;
    const prd = `workspace/prds/202604/${slug}.md`;

    const { stdout } = runState(["init", "--prd", prd, "--mode", "quick"]);
    const state = JSON.parse(stdout) as QaState;
    assert.equal(state.mode, "quick");
  });

  it("created_at and updated_at are ISO8601 timestamps", () => {
    const slug = `ts-test-${Date.now()}`;
    const prd = `workspace/prds/202604/${slug}.md`;

    const { stdout } = runState(["init", "--prd", prd]);
    const state = JSON.parse(stdout) as QaState;
    assert.ok(!Number.isNaN(Date.parse(state.created_at)), "created_at should be valid ISO date");
    assert.ok(!Number.isNaN(Date.parse(state.updated_at)), "updated_at should be valid ISO date");
  });
});

describe("state.ts update", () => {
  it("advances current_node and appends to completed_nodes", () => {
    const slug = `update-test-${Date.now()}`;
    const prd = `workspace/prds/202604/${slug}.md`;

    runState(["init", "--prd", prd]);

    const { stdout, code } = runState([
      "update",
      "--prd-slug",
      slug,
      "--node",
      "enhance",
      "--data",
      "{}",
    ]);

    assert.equal(code, 0, "update should exit 0");
    const state = JSON.parse(stdout) as QaState;
    assert.equal(state.current_node, "enhance");
    assert.ok(state.completed_nodes.includes("enhance"), "enhance should be in completed_nodes");
  });

  it("merges --data into node_outputs[node]", () => {
    const slug = `update-data-${Date.now()}`;
    const prd = `workspace/prds/202604/${slug}.md`;

    runState(["init", "--prd", prd]);

    const { stdout } = runState([
      "update",
      "--prd-slug",
      slug,
      "--node",
      "enhance",
      "--data",
      '{"health_score":85}',
    ]);

    const state = JSON.parse(stdout) as QaState;
    const output = state.node_outputs.enhance as { health_score: number };
    assert.equal(output.health_score, 85);
  });

  it("merges additional data into same node on second update", () => {
    const slug = `update-merge-${Date.now()}`;
    const prd = `workspace/prds/202604/${slug}.md`;

    runState(["init", "--prd", prd]);

    runState(["update", "--prd-slug", slug, "--node", "enhance", "--data", '{"health_score":85}']);

    const { stdout } = runState([
      "update",
      "--prd-slug",
      slug,
      "--node",
      "enhance",
      "--data",
      '{"extra_key":"hello"}',
    ]);

    const state = JSON.parse(stdout) as QaState;
    const output = state.node_outputs.enhance as {
      health_score: number;
      extra_key: string;
    };
    assert.equal(output.health_score, 85);
    assert.equal(output.extra_key, "hello");
  });

  it("does not duplicate node in completed_nodes on repeated update", () => {
    const slug = `update-dedup-${Date.now()}`;
    const prd = `workspace/prds/202604/${slug}.md`;

    runState(["init", "--prd", prd]);
    runState(["update", "--prd-slug", slug, "--node", "enhance", "--data", "{}"]);
    const { stdout } = runState([
      "update",
      "--prd-slug",
      slug,
      "--node",
      "enhance",
      "--data",
      "{}",
    ]);

    const state = JSON.parse(stdout) as QaState;
    const count = state.completed_nodes.filter((n) => n === "enhance").length;
    assert.equal(count, 1, "enhance should appear only once in completed_nodes");
  });

  it("exits 1 when state file not found", () => {
    const { code } = runState([
      "update",
      "--prd-slug",
      "nonexistent-slug-xyz",
      "--node",
      "enhance",
      "--data",
      "{}",
    ]);
    assert.equal(code, 1);
  });

  it("persists updated_at different from created_at", async () => {
    const slug = `update-ts-${Date.now()}`;
    const prd = `workspace/prds/202604/${slug}.md`;

    const { stdout: initOut } = runState(["init", "--prd", prd]);
    const initState = JSON.parse(initOut) as QaState;

    // Small delay to ensure timestamp differs
    await new Promise((r) => setTimeout(r, 10));

    const { stdout: updateOut } = runState([
      "update",
      "--prd-slug",
      slug,
      "--node",
      "write",
      "--data",
      "{}",
    ]);
    const updatedState = JSON.parse(updateOut) as QaState;

    assert.equal(updatedState.created_at, initState.created_at, "created_at should not change");
    assert.notEqual(
      updatedState.updated_at,
      initState.updated_at,
      "updated_at should be refreshed",
    );
  });
});

describe("state.ts resume", () => {
  it("returns current state JSON", () => {
    const slug = `resume-test-${Date.now()}`;
    const prd = `workspace/prds/202604/${slug}.md`;

    const { stdout: initOut } = runState(["init", "--prd", prd]);
    const initState = JSON.parse(initOut) as QaState;

    const { stdout, code } = runState(["resume", "--prd-slug", slug]);

    assert.equal(code, 0);
    const state = JSON.parse(stdout) as QaState;
    assert.equal(state.prd, initState.prd);
    assert.equal(state.current_node, "init");
  });

  it("exits 1 and outputs error JSON when state file not found", () => {
    const { stdout, code } = runState(["resume", "--prd-slug", "nonexistent-slug-abc"]);

    assert.equal(code, 1);
    const result = JSON.parse(stdout) as { error: string };
    assert.equal(result.error, "State file not found");
  });
});

describe("state.ts clean", () => {
  it("deletes state file and returns cleaned=true", () => {
    const slug = `clean-test-${Date.now()}`;
    const prd = `workspace/prds/202604/${slug}.md`;

    runState(["init", "--prd", prd]);
    assert.ok(existsSync(stateFilePath(slug)), "file should exist before clean");

    const { stdout, code } = runState(["clean", "--prd-slug", slug]);

    assert.equal(code, 0);
    const result = JSON.parse(stdout) as { cleaned: boolean; path: string };
    assert.equal(result.cleaned, true);
    assert.ok(result.path.includes(slug), "path should contain the slug");
    assert.ok(!existsSync(stateFilePath(slug)), "file should not exist after clean");
  });

  it("succeeds even when state file does not exist", () => {
    const { stdout, code } = runState(["clean", "--prd-slug", "already-gone-slug"]);

    assert.equal(code, 0);
    const result = JSON.parse(stdout) as { cleaned: boolean };
    assert.equal(result.cleaned, true);
  });

  it("output contains path field", () => {
    const slug = `clean-path-${Date.now()}`;
    const prd = `workspace/prds/202604/${slug}.md`;

    runState(["init", "--prd", prd]);
    const { stdout } = runState(["clean", "--prd-slug", slug]);

    const result = JSON.parse(stdout) as { path: string };
    assert.ok(typeof result.path === "string" && result.path.length > 0);
  });
});
