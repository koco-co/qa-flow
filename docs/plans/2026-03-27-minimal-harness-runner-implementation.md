# Minimal Harness Runner Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a minimal internal Harness runner that can execute `code-analysis` as a real manifest-driven state machine, while providing dry-run and resume-audit support for `test-case-generation`.

**Architecture:** Add a small Node.js runner entry plus a state helper under `.claude/scripts/`. The runner will load existing workflow / hook / contract manifests, compute ready steps, validate checkpoints and outputs, and keep run-state deterministic without replacing current Skill or agent business logic.

**Tech Stack:** Node.js ESM, existing `.claude/scripts` test harness, JSON manifests under `.claude/harness/`, existing `load-config.mjs` helpers, repo `npm test --silent`

---

### Task 1: Add runner state helper

**Files:**
- Create: `.claude/scripts/workflow-run-state.mjs`
- Create: `.claude/scripts/test-run-harness-workflow.mjs`
- Modify: `.claude/scripts/package.json`

**Step 1: Write the failing test**

Add a new test section in `.claude/scripts/test-run-harness-workflow.mjs` that expects state files to be created under `.claude/tmp/harness-runs/code-analysis/<run-id>.json` and to persist:

```js
const run = createWorkflowRun({
  workflowId: "code-analysis",
  mode: "bug",
  workspaceRoot: repoRoot,
});

assert(run.workflowId === "code-analysis");
assert(run.mode === "bug");
assert(existsSync(run.statePath));
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd .claude/scripts && node test-run-harness-workflow.mjs
```

Expected: FAIL because `workflow-run-state.mjs` does not exist yet.

**Step 3: Write minimal implementation**

Implement `.claude/scripts/workflow-run-state.mjs` with helpers:

- `createWorkflowRun({ workflowId, mode, workspaceRoot })`
- `loadWorkflowRun(statePath)`
- `updateWorkflowRun(statePath, updater)`
- `markStepStatus(statePath, stepId, status, metadata = {})`

State shape should include:

```js
{
  version: 1,
  workflowId: "code-analysis",
  mode: "bug",
  statePath: "...",
  createdAt: "...",
  updatedAt: "...",
  steps: {
    "mode-detect": { status: "pending" }
  },
  outputs: {},
  history: []
}
```

**Step 4: Run test to verify it passes**

Run:

```bash
cd .claude/scripts && node test-run-harness-workflow.mjs
```

Expected: PASS for state-file creation and read/write assertions.

**Step 5: Commit**

```bash
git add .claude/scripts/workflow-run-state.mjs .claude/scripts/test-run-harness-workflow.mjs .claude/scripts/package.json
git commit -m "feat: add harness runner state helper"
```

### Task 2: Add `plan` command for manifest-driven next-step resolution

**Files:**
- Create: `.claude/scripts/run-harness-workflow.mjs`
- Modify: `.claude/scripts/test-run-harness-workflow.mjs`
- Modify: `.claude/scripts/package.json`

**Step 1: Write the failing test**

Add tests that call:

```bash
node run-harness-workflow.mjs plan --workflow code-analysis --mode bug --json
```

and expect JSON like:

```json
{
  "workflowId": "code-analysis",
  "mode": "bug",
  "readyStep": "mode-detect",
  "blockedBy": [],
  "missingPrechecks": []
}
```

Also add a second test that marks `mode-detect` complete and expects `branch-sync` to become ready with prechecks `branch-confirmed` and `repo-updated`.

**Step 2: Run test to verify it fails**

Run:

```bash
cd .claude/scripts && node test-run-harness-workflow.mjs
```

Expected: FAIL because `run-harness-workflow.mjs` and plan resolution do not exist.

**Step 3: Write minimal implementation**

Implement `plan` in `.claude/scripts/run-harness-workflow.mjs`:

- load workflow via `loadHarnessWorkflow`
- load hooks via `loadHarnessHooks`
- create/load run state
- compute completed steps
- find first ready step where all dependencies are done
- return unresolved prechecks from `step.precheck`
- support `--json`

Minimal return shape:

```js
{
  workflowId,
  mode,
  runId,
  readyStep,
  blockedBy,
  missingPrechecks,
}
```

**Step 4: Run test to verify it passes**

Run:

```bash
cd .claude/scripts && node test-run-harness-workflow.mjs
```

Expected: PASS for `plan` happy-path and dependency gating.

**Step 5: Commit**

```bash
git add .claude/scripts/run-harness-workflow.mjs .claude/scripts/test-run-harness-workflow.mjs .claude/scripts/package.json
git commit -m "feat: add harness runner plan command"
```

### Task 3: Add `checkpoint` and `verify` for `code-analysis`

**Files:**
- Modify: `.claude/scripts/run-harness-workflow.mjs`
- Modify: `.claude/scripts/workflow-run-state.mjs`
- Modify: `.claude/scripts/test-run-harness-workflow.mjs`

**Step 1: Write the failing test**

Add scenario tests for:

1. checkpointing `mode-detect` promotes `branch-sync`
2. checkpointing `html-report` without an HTML path fails
3. checkpointing `shortcut-refresh` without refreshed `latest-bug-report.html` fails
4. `verify` passes only when all required steps and outputs for the selected mode are complete

Example failing assertion:

```js
assert(result.code !== 0);
assert(result.stderr.includes("latest-bug-report.html"));
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd .claude/scripts && node test-run-harness-workflow.mjs
```

Expected: FAIL because checkpoint validation and end-state verification are incomplete.

**Step 3: Write minimal implementation**

Add `checkpoint` support in `.claude/scripts/run-harness-workflow.mjs`:

- require `--run-state`
- require `--step`
- accept `--output-path` and `--shortcut-path`
- mark step complete
- for `html-report`, verify target HTML exists
- for `shortcut-refresh`, verify correct `latest-*` symlink exists

Add `verify` support:

- ensure all non-skipped required steps are complete
- ensure mode-matched output contract exists
- return `verified: true` when done

**Step 4: Run test to verify it passes**

Run:

```bash
cd .claude/scripts && node test-run-harness-workflow.mjs
```

Expected: PASS for `checkpoint` and `verify` scenarios.

**Step 5: Commit**

```bash
git add .claude/scripts/run-harness-workflow.mjs .claude/scripts/workflow-run-state.mjs .claude/scripts/test-run-harness-workflow.mjs
git commit -m "feat: add harness runner checkpoint verification"
```

### Task 4: Add `test-case-generation` dry-run and resume-audit mode

**Files:**
- Modify: `.claude/scripts/run-harness-workflow.mjs`
- Modify: `.claude/scripts/test-run-harness-workflow.mjs`

**Step 1: Write the failing test**

Add tests with a temporary `.qa-state.json` fixture such as:

```json
{
  "last_completed_step": 7,
  "awaiting_verification": true,
  "output_xmind": "cases/xmind/data-assets/202603-Story-20260322.xmind",
  "archive_md_path": "cases/archive/data-assets/202603-Story-20260322.md"
}
```

Expect:

```json
{
  "workflowId": "test-case-generation",
  "mode": "quick",
  "currentManifestStep": "archive",
  "nextExpectedStep": "notify",
  "resumeState": "awaiting-verification"
}
```

Also add a quick-mode test proving `brainstorm` and `checklist` are skipped in dry-run output.

**Step 2: Run test to verify it fails**

Run:

```bash
cd .claude/scripts && node test-run-harness-workflow.mjs
```

Expected: FAIL because test-case dry-run / audit output is not implemented.

**Step 3: Write minimal implementation**

Extend `run-harness-workflow.mjs` with a dry-run path:

- `--workflow test-case-generation`
- `--qa-state <path>`
- `--mode quick|full`

Behavior:

- read workflow manifest
- read provided `.qa-state.json`
- map state to current manifest step
- compute skipped steps from `skippableWhen` and `modeDependencies`
- return mismatch details without mutating `.qa-state.json`

**Step 4: Run test to verify it passes**

Run:

```bash
cd .claude/scripts && node test-run-harness-workflow.mjs
```

Expected: PASS for quick-mode skip logic and resume-audit mapping.

**Step 5: Commit**

```bash
git add .claude/scripts/run-harness-workflow.mjs .claude/scripts/test-run-harness-workflow.mjs
git commit -m "feat: add test-case dry-run audit to harness runner"
```

### Task 5: Wire tests, docs, and final verification

**Files:**
- Modify: `.claude/scripts/package.json`
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `.claude/skills/code-analysis-report/SKILL.md`
- Modify: `.claude/skills/test-case-generator/SKILL.md`
- Test: `.claude/scripts/test-run-harness-workflow.mjs`

**Step 1: Write the failing test**

Add package-level expectation that `npm test --silent` includes the new runner suite.

Also add a documentation regression note in the plan for the exact terms to mention:

- internal runner
- `plan / checkpoint / verify`
- `code-analysis` first
- `test-case-generation` dry-run / resume-audit only

**Step 2: Run test to verify it fails**

Run:

```bash
cd .claude/scripts && npm test --silent
```

Expected: FAIL because the new runner suite is not yet wired into package-level test execution or docs are stale.

**Step 3: Write minimal implementation**

Update `.claude/scripts/package.json` so `npm test --silent` runs `test-run-harness-workflow.mjs`.

Document in:

- `README.md`: Harness next-stage runtime note
- `CLAUDE.md`: internal runner boundary and first-phase coverage
- `.claude/skills/code-analysis-report/SKILL.md`: runner-backed code-analysis progression
- `.claude/skills/test-case-generator/SKILL.md`: dry-run / resume-audit only note

**Step 4: Run test to verify it passes**

Run:

```bash
cd .claude/scripts && npm test --silent
cd /Users/poco/Documents/DTStack/WorkSpaces && git --no-pager diff --check
```

Expected:

- all tests PASS
- `git diff --check` returns exit code 0

**Step 5: Commit**

```bash
git add .claude/scripts/package.json README.md CLAUDE.md .claude/skills/code-analysis-report/SKILL.md .claude/skills/test-case-generator/SKILL.md .claude/scripts/test-run-harness-workflow.mjs
git commit -m "feat: document and verify minimal harness runner"
```

### Task 6: Final integration verification

**Files:**
- Verify only

**Step 1: Run focused runner tests**

```bash
cd .claude/scripts && node test-run-harness-workflow.mjs
```

Expected: PASS

**Step 2: Run repository script suite**

```bash
cd .claude/scripts && npm test --silent
```

Expected: PASS

**Step 3: Run repository diff validation**

```bash
cd /Users/poco/Documents/DTStack/WorkSpaces && git --no-pager diff --check
```

Expected: exit code 0

**Step 4: Push**

```bash
git push origin main
```

Expected: remote `main` updated successfully

**Step 5: Commit bookkeeping note**

No new commit here unless Task 5 produced additional follow-up fixes. Prefer ending with a clean working tree.
