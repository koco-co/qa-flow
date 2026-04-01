---
phase: 5
slug: im-notification-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `node:test` + `node:assert/strict` |
| **Config file** | none — built-in, no config |
| **Quick run command** | `node --test .claude/shared/scripts/notify.test.mjs` |
| **Full suite command** | `node --test .claude/shared/scripts/*.test.mjs` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test .claude/shared/scripts/notify.test.mjs`
- **After every plan wave:** Run `node --test .claude/shared/scripts/*.test.mjs`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | NOTF-01 | unit | `node --test .claude/shared/scripts/notify.test.mjs` | W0 | pending |
| 05-01-02 | 01 | 1 | NOTF-02 | unit | same | W0 | pending |
| 05-01-03 | 01 | 1 | NOTF-03 | unit | same | W0 | pending |
| 05-01-04 | 01 | 1 | NOTF-04 | unit | same | W0 | pending |
| 05-01-05 | 01 | 1 | NOTF-05 | unit | same | W0 | pending |
| 05-02-01 | 02 | 2 | NOTF-06 | manual | review Skill SKILL.md files | N/A | pending |
| 05-02-02 | 02 | 2 | NOTF-07 | manual | review .env.example | N/A | pending |

---

## Wave 0 Requirements

- [ ] `.claude/shared/scripts/notify.test.mjs` — test stubs for NOTF-01 through NOTF-05
- [ ] `npm install nodemailer` — in `.claude/shared/scripts/` directory

*Existing infrastructure covers test framework (node:test already used in project).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Skill SKILL.md contains notify step | NOTF-06 | Markdown file content review | Check test-case-generator, code-analysis-report, archive-converter SKILL.md files for notify.mjs call |
| .env.example has all env vars | NOTF-07 | Template completeness check | Verify all 4 channels' vars documented with examples |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
