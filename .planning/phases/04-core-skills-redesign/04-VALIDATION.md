---
phase: 4
slug: core-skills-redesign
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js ESM test suite (custom runner) |
| **Config file** | `.claude/tests/run-all.mjs` |
| **Quick run command** | `node .claude/tests/run-all.mjs` |
| **Full suite command** | `node .claude/tests/run-all.mjs` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node .claude/tests/run-all.mjs`
- **After every plan wave:** Run `node .claude/tests/run-all.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | SKIL-04 | unit | `node .claude/tests/run-all.mjs` | ✅ | ⬜ pending |
| 04-01-02 | 01 | 1 | SKIL-04 | grep | `grep -r "isDtstackMeta\|DTStack" .claude/skills/xmind-converter/` | ✅ | ⬜ pending |
| 04-02-01 | 02 | 1 | SKIL-05 | grep | `grep -r "MODULE_MAP\|DTStack" .claude/skills/archive-converter/` | ✅ | ⬜ pending |
| 04-03-01 | 03 | 2 | SKIL-02 | grep | `grep -r "DTStack\|Doris\|Hive\|SparkThrift" .claude/skills/prd-enhancer/` | ✅ | ⬜ pending |
| 04-04-01 | 04 | 2 | SKIL-03 | grep | `grep -r "DTStack\|dt-insight" .claude/skills/code-analysis-report/` | ✅ | ⬜ pending |
| 04-05-01 | 05 | 3 | SKIL-01 | grep | `grep -r "DTStack\|Doris\|Hive\|data-assets\|batch-works" .claude/skills/test-case-generator/` | ✅ | ⬜ pending |
| 04-06-01 | 06 | 3 | SKIL-06 | grep | `grep -r "DTStack" .claude/skills/using-qa-flow/` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The test suite at `.claude/tests/run-all.mjs` already validates shared scripts (load-config, json-to-xmind, etc.). Phase 4 work is primarily Markdown content changes, verified by grep-based DTStack term scanning.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| E-commerce example quality | SKIL-01 | Subjective — example relevance | Review Writer/Reviewer prompts for concrete, useful e-commerce examples |
| Feature menu accuracy | SKIL-06 | UI layout | Run `/using-qa-flow` and verify menu reflects all Skills |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
