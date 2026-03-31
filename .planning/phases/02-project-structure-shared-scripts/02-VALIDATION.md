---
phase: 2
slug: project-structure-shared-scripts
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js native test runner (run-all.mjs discovers test-*.mjs) |
| **Config file** | `.claude/tests/run-all.mjs` |
| **Quick run command** | `node .claude/tests/run-all.mjs` |
| **Full suite command** | `node .claude/tests/run-all.mjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node .claude/tests/run-all.mjs`
- **After every plan wave:** Run `node .claude/tests/run-all.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 0 | STRU-01 | unit | `node .claude/tests/run-all.mjs` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | STRU-01 | unit | `node .claude/tests/run-all.mjs` | ✅ | ⬜ pending |
| 02-02-01 | 02 | 1 | STRU-02 | unit | `node .claude/tests/run-all.mjs` | ✅ | ⬜ pending |
| 02-02-02 | 02 | 1 | STRU-02 | unit | `node .claude/tests/run-all.mjs` | ✅ | ⬜ pending |
| 02-03-01 | 03 | 2 | STRU-03 | regression | `node .claude/tests/run-all.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.claude/tests/test-no-hardcoded-paths.mjs` — grep-based regression gate for hardcoded path segments in .mjs files
- [ ] `.claude/tests/test-resolve-module-path.mjs` — stubs for resolveModulePath() convention + override scenarios
- [ ] `.gitkeep` files in `cases/requirements/`, `cases/xmind/`, `cases/archive/`, `cases/history/`

*These must exist before Wave 1 tasks execute.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fresh clone directory structure | STRU-01 | Requires clean git clone | Clone repo to temp dir, verify cases/ subdirs exist via .gitkeep |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
