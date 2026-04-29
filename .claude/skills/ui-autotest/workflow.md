# ui-autotest — Workflow

## Steps overview

- [Step 1: Parse and scope](#step-1)
- [Step 1.5: Resume](#step-1-5)
- [Step 2: Login](#step-2)
- [Step 3a: Script writer — script generation](#step-3a)
- [Step 3b: Test fix](#step-3b)
- [Step 3c: Convergence](#step-3c)
- [Step 4: Merge](#step-4)
- [Step 5: Execute](#step-5)
- [Step 6: Result & notify](#step-6)

## Protocols

- [Standard protocol](#protocols)
- [Exception handling](#protocols-exception)

## Gates

- [R1 — Script generation review](#gate-r1)
- [R2 — Post-execution review](#gate-r2)

---

## <a id="step-1"></a>Step 1: Parse and scope

Parse the user's Archive MD input and confirm the test scope.

Protocols reference: See [Standard protocol](#protocols) for confirmation policy, command aliases, Task schema.

1. Parse user input: Archive MD file path, feature name, or test scenario description
2. Confirm scope with user:
   - Which feature/module to test
   - Priority levels to include (P0/P1/P2)
   - Smoke test only or full regression
3. Update Task schema: create 6 workflow tasks, mark Step 1 as `in_progress`

Script reference: `bun run engine/src/ui-autotest/parse-cases.ts --file {{md_path}}`

---

## <a id="step-1-5"></a>Step 1.5: Resume

Continue an interrupted session from saved state.

1. Read `.kata/{{project}}/workflow-state/ui-autotest-{{session-file}}.json`
2. Restore all 6 task statuses
3. Resume from the first non-completed step

---

## <a id="step-2"></a>Step 2: Login

Perform browser session login for the target environment.

```bash
bun run engine/src/ui-autotest/session-login.ts --project {{project}} --url {{url}} --output .auth/{{project}}/session-{{env}}.json
```

The script creates an authenticated session state file for subsequent test runs.

---

## <a id="step-3a"></a>Step 3a: Script writer — script generation

Dispatch `script-writer-agent` to generate Playwright scripts from Archive MD cases.

1. Read Archive MD feature file
2. Generate test scripts per case block, applying:
   - Archive MD → Playwright test structure conversion
   - Screenshot step integration
   - Data-driven test generation
3. Output: individual spec files in `tests/{{feature}}/cases/`

## <a id="step-3b"></a>Step 3b: Script fixer — self-test fix

Dispatch `script-fixer-agent` to run generated scripts and fix failures.

1. Run `bunx playwright test {file}` per spec
2. Analyze failure (selector / timeout / assertion)
3. Apply minimal fix via snapshot + inspect
4. Re-verify until FIXED or STILL_FAILING

## <a id="step-3c"></a>Step 3c: Convergence — pattern summarization

Dispatch `convergence-agent` to summarize common failure patterns.

1. Read all fixer summaries
2. Group by error type
3. Identify 3+ case common patterns
4. Output helpers diff suggestion JSON

Review gate: After generation, run [R1 review](#gate-r1).

---

## <a id="step-3b"></a>Step 3b: Test fix

Fix test compilation and basic execution issues.

1. Run `bun test --cwd tests/{{feature}}` to detect compilation errors
2. Fix:
   - Import path issues
   - Missing fixture/helper references
   - Type errors in test code
3. Iterate until tests compile clean

---

## <a id="step-3c"></a>Step 3c: Convergence

Converge generated scripts into a coherent test suite.

1. Run lint and fix recurring patterns
2. Normalize naming conventions across all generated files
3. Apply common patterns from [references/playwright-patterns.md](references/playwright-patterns.md)

When all 3 sub-steps pass clean → mark Step 3 complete.

---

## <a id="step-4"></a>Step 4: Merge

Merge generated case scripts into consolidated spec files (smoke + full).

```bash
bun run engine/src/ui-autotest/merge-specs.ts \
  --input workspace/{{project}}/features/{{feature}}/tests/cases \
  --output workspace/{{project}}/features/{{feature}}/tests/runners
```

The merge script:

- Reads all `cases/` files with valid META headers
- Generates `smoke.spec.ts` (P0 only) and `full.spec.ts` (all priorities)
- Validates TypeScript compilation (optional `--compile-check`)

---

## <a id="step-5"></a>Step 5: Execute

Run the generated test suite.

```bash
bun test --cwd workspace/{{project}}/features/{{feature}}/tests/runners
```

Report results: pass/fail/error counts per spec file.

---

## <a id="step-6"></a>Step 6: Result & notify

Summarize execution results and notify the user.

1. Generate execution summary (pass rate, failures list)
2. If pass rate ≥ 80%: success notification
3. If pass rate < 80%: flag severe failures for Bug report generation
4. Apply [R2 review](#gate-r2)

---

## <a id="protocols"></a>Protocols: Standard

### Confirmation policy

- Read-only operations (parse, scope, status check) → no confirmation needed
- Stateful operations (login session, file writes, git operations) → confirm before execution
- Destructive operations (delete, overwrite, clean) → explicit confirmation with impact preview

### Command aliases

| Alias          | Command                                                            |
| -------------- | ------------------------------------------------------------------ |
| `@parse-cases` | `bun run engine/src/ui-autotest/parse-cases.ts --file {{md_path}}` |
| `@merge-specs` | `bun run engine/src/ui-autotest/merge-specs.ts ...`                |

### Task schema

Create 6 tasks in order, marking progress as each step completes.

---

## <a id="protocols-exception"></a>Protocols: Exception handling

| Situation                           | Response                                            |
| ----------------------------------- | --------------------------------------------------- |
| Session login fails                 | Retry with new credentials; ask user if env changes |
| Test compilation error              | Route to Step 3b fix loop                           |
| Flaky tests (intermittent failures) | Retry 3×; report as flaky if inconsistent           |
| Missing Archive MD                  | Ask user for file path or fallback to manual input  |
| Subagent timeout                    | Restart with `--resume` flag (Step 1.5)             |

---

## <a id="gate-r1"></a>Gate R1: Script generation review

Checklist:

- [ ] Selectors are reasonable (prefer `text`/`role`, avoid fragile CSS paths)
- [ ] Assertions match Archive MD expectations
- [ ] Test isolation is maintained (no shared mutable state)
- [ ] Error messages are descriptive

---

## <a id="gate-r2"></a>Gate R2: Post-execution review

Checklist:

- [ ] Test pass rate ≥ threshold (default 80%)
- [ ] Severe failures auto-converted to Bug report
- [ ] Flaky tests documented with retry counts
