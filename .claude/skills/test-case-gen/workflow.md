# test-case-gen — Workflow

## Pipeline overview

8-step pipeline (sequence with gates):

1. [Init](#step-1) — input parsing & environment setup
2. [Probe](#step-2) — 4-signal probe & strategy dispatch
3. [Discuss](#step-3) — moderated discussion + source scan
4. [Analyze](#step-4) — test point planning
5. [Write](#step-5) — parallel case generation
6. [Review](#step-6) — quality review & fix
7. [Format check](#step-7) — format compliance check
8. [Output](#step-8) — XMind + Archive MD generation

## Protocols

- [Task visualization](#protocols)
- [Writer blocking relay](#protocols)
- [Sub-agent management](#protocols)
- [Output contract](#protocols)

## Gates

- [R1 — Probe review](#gate-r1)
- [R2 — Discuss review](#gate-r2)
- [R3 — Analyze review](#gate-r3)

---

## <a id="step-1"></a>Step 1: Init

Executor: direct (main agent)

Input parsing and environment preparation:

1. Parse user input (PRD path, feature name, quick mode flag)
2. Load project rules: `kata-cli rule-loader load --project {{project}}`
3. Check for resume session (`.kata/{{project}}/workflow-state/test-case-gen-{{name}}-{{env}}.json`)
4. Create Task visualization (8 tasks with blockedBy dependencies)
5. Determine strategy from input signal:
   - PRD path → full workflow
   - Quick mode → skip probe direct to write
   - Resume → restore session and continue

---

## <a id="step-2"></a>Step 2: Probe

Executor: main agent (direct) + subagent (`source-scanner-agent`, haiku)
Gate after: [R1](#gate-r1)

Collect 4 signals from the source system:

1. **Source scan** (subagent): Dispatch `source-scanner-agent` to scan `.repos/` for feature-related code — page objects, API endpoints, data models. Outputs Appendix A.
2. **Image semantics** (main agent inline): Read `images/` directory with Read tool, extract UI semantics from screenshots/designs in the PRD. Write §3 to enhanced.md via `discuss set-section --anchor s-3`.
3. **Page key points** (main agent inline): Extract business logic from page elements, combine source scan + image results.
4. **Historical cases**: Scan `features/*/archive.md` and `history/` for related existing test cases.

Output: `enhanced.md` — appended with source signals (Appendix A + §3).

---

## <a id="step-3"></a>Step 3: Discuss

Executor: subagent (`writer-agent`, sonnet)
Gate after: [R2](#gate-r2)

Moderated requirement discussion and source material scanning:

1. **Present signals**: Show the 4-dimension signal report from Step 2
2. **Identify gaps**: Ask user for any missing information
3. **Define scope**: Agree on test scope (modules, priorities, exclusions)
4. **Add pending**: If Writer blocks on missing info, cycle back through `add-pending`
5. **Output**: `enhanced.md` fully populated with all sections

Blocking relay protocol: When Writer returns `<blocked_envelope>`, parse items and route back to discuss for clarification.

---

## <a id="step-4"></a>Step 4: Analyze

Executor: subagent (`analyze-agent`, sonnet)
Gate after: [R3](#gate-r3)

Generate structured test point checklist from enhanced.md:

1. Extract CRUD closure test points
2. Identify boundary conditions
3. Plan L1-L5 assertion levels per scenario
4. Output: `test-point-checklist.md` with structured sections

---

## <a id="step-5"></a>Step 5: Write

Executor: subagent (`writer-agent`, sonnet) — one per module

Parallel case generation per module:

1. Create child tasks: `[write] {{module}}`
2. Dispatch Writer per module with test points and enhanced.md
3. Writer generates:
   - Archive MD cases with L1-L5 assertions
   - XMind source blocks
4. Each Writer completes → update task: `[write] {{module}} — {{n}} cases`

---

## <a id="step-6"></a>Step 6: Review

Executor: subagent (`reviewer-agent`, sonnet)

Quality review and auto-fix:

1. Review generated cases against spec:
   - Design logic correctness
   - CRUD completeness
   - Assertion coverage
2. Auto-fix identified issues
3. Calculate issue rate vs threshold
4. Report: `review-report.md` with violations and fixes

---

## <a id="step-7"></a>Step 7: Format check

Executor: subagent (`format-check-agent`, haiku)

Format compliance check (iterative):

1. Run `kata-cli format-check-script` against generated Archive MD
2. Report deviations per round
3. Auto-fix on round 1; if deviations remain, cycle round 2
4. After max rounds, report remaining deviations as warnings
5. Update task: `[format-check] Round {{n}} — {{count}} deviations`

---

## <a id="step-8"></a>Step 8: Output

Executor: direct (main agent)

Generate final artifacts:

1. Run `kata-cli xmind-gen` from Archive MD
2. Archive MD → `workspace/{{project}}/features/{{ym}}-{{slug}}/archive.md`
3. XMind → `workspace/{{project}}/features/{{ym}}-{{slug}}/cases.xmind`
4. Session file cleanup (mark complete)
5. Summary report with case counts

---

## <a id="protocols"></a>Protocols

### Task visualization

Create 8 tasks on workflow start with blockedBy dependencies (see main.md for full table). Each step:

- Entering → `TaskUpdate status: in_progress`
- Complete → `TaskUpdate status: completed`, append key metrics to subject
- Failed → remain `in_progress`

### Writer blocking relay

When Writer returns `<blocked_envelope>`:

1. Parse `items[]` from envelope
2. If `status = "invalid_input"` → stop module, request fix
3. If `status = "needs_confirmation"` → route back to discuss `add-pending`

### Sub-agent management

- Sub-agents run independently; results merged into main workflow
- Each sub-agent gets the session file for resume support
- Agent timeouts → allow resume from session snapshot

### Output contract

- Archive MD: full case text with L1-L5 assertions
- XMind: auto-generated from Archive MD
- All artifacts in `workspace/{{project}}/` under date-named directories

---

## <a id="gate-r1"></a>Gate R1: Probe review

- [ ] Source scan results complete and relevant
- [ ] Image semantics extracted correctly
- [ ] Page key points cover main features
- [ ] Historical cases matched

## <a id="gate-r2"></a>Gate R2: Discuss review

- [ ] All requirements clarified with user
- [ ] Scope definition unambiguous
- [ ] enhanced.md contains all sections

## <a id="gate-r3"></a>Gate R3: Analyze review

- [ ] Test points cover CRUD closure
- [ ] Boundary conditions identified
- [ ] Assertion levels (L1-L5) correctly assigned
