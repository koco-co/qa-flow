---
phase: 1
slug: generalization-refactor
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `node:test` (v25, no external deps) |
| **Config file** | none — use `--test` flag |
| **Quick run command** | `node --test .claude/shared/scripts/*.test.mjs` |
| **Full suite command** | `node --test .claude/shared/scripts/*.test.mjs && node --test .planning/tests/*.test.mjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test .claude/shared/scripts/load-config.test.mjs`
- **After every plan wave:** Run `node --test .claude/shared/scripts/*.test.mjs && node --test .planning/tests/*.test.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 0 | GEN-01, GEN-02 | unit | `node --test .claude/shared/scripts/load-config.test.mjs` | W0 | pending |
| 01-01-02 | 01 | 0 | GEN-05 | unit | `node --test .claude/shared/scripts/output-naming-contracts.test.mjs` | W0 | pending |
| 01-01-03 | 01 | 0 | GEN-03 | smoke | `node --test .planning/tests/rules-generalization.test.mjs` | W0 | pending |
| 01-01-04 | 01 | 0 | GEN-04 | smoke | `node --test .planning/tests/prompts-generalization.test.mjs` | W0 | pending |
| 01-01-05 | 01 | 0 | GEN-06 | smoke | `node --test .planning/tests/branch-migration.test.mjs` | W0 | pending |
| 01-02-01 | 02 | 2 | GEN-01 | unit | `node --test .claude/shared/scripts/load-config.test.mjs` | W0 | pending |
| 01-02-02 | 02 | 2 | GEN-02 | unit | `node --test .claude/shared/scripts/load-config.test.mjs` | W0 | pending |
| 01-03-01 | 03 | 1 | GEN-03 | smoke | `node --test .planning/tests/rules-generalization.test.mjs` | W0 | pending |
| 01-04-01 | 04 | 1 | GEN-04 | smoke | `node --test .planning/tests/prompts-generalization.test.mjs` | W0 | pending |
| 01-05-01 | 05 | 3 | GEN-06 | smoke | `node --test .planning/tests/branch-migration.test.mjs` | W0 | pending |
| 01-05-02 | 05 | 3 | GEN-01 | e2e | `node --test .planning/tests/blank-config-e2e.test.mjs` | W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `.claude/shared/scripts/load-config.test.mjs` — stubs for GEN-01, GEN-02
- [ ] `.claude/shared/scripts/output-naming-contracts.test.mjs` — stubs for GEN-05
- [ ] `.planning/tests/rules-generalization.test.mjs` — smoke: grep for hardcoded DTStack terms in rules files
- [ ] `.planning/tests/prompts-generalization.test.mjs` — smoke: grep for Doris/Hive/SparkThrift outside conditional blocks
- [ ] `.planning/tests/branch-migration.test.mjs` — smoke: verify expected dirs absent from release branch
- [ ] `.planning/tests/` directory — create this directory
- [ ] Framework install: none required (`node:test` is built-in)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DTStack data accessible from dtstack-data branch | GEN-06 | Requires branch checkout | `git checkout dtstack-data && ls cases/archive/data-assets/` |
| Workflow runs end-to-end on blank config | GEN-01 | Full workflow integration | Run test-case-generator with minimal config |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
