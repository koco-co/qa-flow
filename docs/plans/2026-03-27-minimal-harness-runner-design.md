# Minimal Harness Runner Design

## Background

`qa-flow` now has a stable Harness control plane:

- `.claude/harness/workflows/*.json` defines workflows
- `.claude/harness/delegates.json` defines delegate bindings
- `.claude/harness/hooks.json` defines precheck / condition / recovery / convergence hooks
- `.claude/harness/contracts.json` defines state, shortcut, quality, and naming contracts

What is still missing is a real runtime that can execute these manifests deterministically instead of treating them as documentation plus validation only.

## Goal

Build a **minimal executable runner** that turns the current manifests into a usable control-plane runtime with low risk.

Phase-1 runner scope:

- **Fully support `code-analysis` workflow execution state**
- **Support `test-case-generation` as dry-run and resume-audit only**
- Keep existing Skills and agents as business executors
- Let the runner own flow progression, dependency evaluation, checkpoint validation, and output verification

## Chosen Approach

### Recommended approach

Use a **state-machine runner** as an internal executor.

The runner will:

- load workflow / hook / contract definitions
- compute ready steps from `dependsOn`, `skippableWhen`, `modeDependencies`, and `resumePoint`
- track runtime progress
- validate outputs and shortcuts at checkpoint time
- return deterministic next actions to the outer orchestration layer

The runner will **not** replace existing Skills or agents in the first version.

### Rejected alternatives

1. **Semi-automatic full orchestrator**
   - Would try to normalize script delegates and some executor calls in one step
   - Better long-term shape, but too much boundary work for the first runner

2. **Fully automatic universal runner**
   - Would try to directly run Skills and agents end-to-end
   - Highest ambition, but too much coupling and too much risk right now

## Architecture

### New scripts

#### 1. `run-harness-workflow.mjs`

Single internal runner entry with three commands:

- `plan`
- `checkpoint`
- `verify`

Responsibilities:

- load manifest, hook, and contract data
- resolve current run state
- compute which steps are ready, blocked, skipped, or complete
- validate transitions
- validate required outputs before allowing progression

#### 2. `workflow-run-state.mjs`

Shared state helper for reading and writing runner state.

Responsibilities:

- create run IDs
- persist step status
- persist selected workflow mode
- persist produced outputs
- expose helper methods for resume and verification

## State model

### `code-analysis`

State files will live under:

```text
.claude/tmp/harness-runs/code-analysis/<run-id>.json
```

Reason:

- avoids polluting requirement directories
- keeps analysis runs ephemeral and infrastructure-oriented
- separates runner state from product outputs

### `test-case-generation`

Phase-1 runner does **not** replace `.qa-state.json`.

Instead it will:

- read manifest + `.qa-state.json`
- compute the theoretical current step
- report resume mismatches
- support dry-run and audit use cases only

This keeps the first runner compatible with the current test-case orchestration.

## Data flow

### `code-analysis` execution flow

1. Caller invokes runner with `plan`
2. Runner returns:
   - workflow mode context
   - ready step
   - blocking dependencies
   - unresolved prechecks
3. Outer Skill / agent executes the step
4. Caller invokes runner with `checkpoint`
5. Runner validates:
   - dependency legality
   - state transition legality
   - expected HTML output presence
   - expected `latest-*` shortcut refresh
6. Runner marks step complete and returns next ready step
7. Caller invokes `verify` at workflow end
8. Runner confirms final workflow completeness

### `test-case-generation` dry-run / resume-audit flow

1. Caller provides Story context and existing `.qa-state.json`
2. Runner loads `test-case-generation` manifest
3. Runner maps current state to theoretical manifest step
4. Runner returns:
   - current inferred step
   - next expected step
   - skipped steps due to mode
   - mismatches between state and manifest

## Delegate boundary

The first runner treats delegates as orchestration metadata, not universal executors.

- `skill` delegates stay owned by existing Skill prompts
- `agent` delegates stay owned by the current agent orchestration
- `script` hooks and output validators can be executed directly by the runner where safe

This keeps business logic stable while moving process logic into a deterministic runtime.

## Error handling

The first runner blocks on three classes of errors:

1. **Contract errors**
   - invalid workflow / hook / contract shape
   - missing delegate references

2. **Transition errors**
   - trying to checkpoint a step whose dependencies are incomplete
   - attempting to advance past an unresolved blocking state

3. **Output errors**
   - HTML report missing after `html-report`
   - required shortcut not refreshed after `shortcut-refresh`
   - mode/output mismatch, such as bug mode producing only conflict outputs

Errors should be explicit and machine-readable enough for future UI wrapping.

## Testing strategy

### Unit tests

- dependency resolution
- condition skipping
- mode dependency handling
- resume point calculation
- transition validation

### Scenario tests

For `code-analysis`:

- happy path
- missing output HTML
- missing latest shortcut
- invalid step order
- wrong mode/output pairing

### Audit tests

For `test-case-generation`:

- `.qa-state.json` maps cleanly to expected manifest step
- quick mode correctly skips Brainstorming / Checklist / Confirmation
- resume mismatch is surfaced clearly

## Non-goals

The first runner will **not**:

- replace current Skill prompts
- directly run all Skills and agents end-to-end
- rewrite `test-case-generator` to a new state format
- redesign output contracts again

## Future expansion

After this minimal runner is stable, the next phase can add:

- richer delegate execution adapters
- true `test-case-generation` runtime orchestration
- unified run history and observability
- policy enforcement before execution
- recovery automation using manifest-declared recovery hooks

## Success criteria

This design is considered successful when:

- `code-analysis` can be driven through manifest-aware `plan / checkpoint / verify`
- `test-case-generation` can be audited for dry-run and resume correctness
- outputs and shortcuts are machine-checked by the runner
- the new runner improves determinism without breaking current user-facing workflows
