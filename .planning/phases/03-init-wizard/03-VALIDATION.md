---
phase: 3
slug: init-wizard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | 自定义 node runner（run-all.mjs） |
| **Config file** | `.claude/tests/run-all.mjs`（自动发现 `test-*.mjs`） |
| **Quick run command** | `node .claude/tests/test-init-wizard.mjs` |
| **Full suite command** | `node .claude/tests/run-all.mjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node .claude/tests/test-init-wizard.mjs`
- **After every plan wave:** Run `node .claude/tests/run-all.mjs`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | INIT-01 | unit | `node .claude/tests/test-init-wizard.mjs` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | INIT-01 | unit | `node .claude/tests/test-init-wizard.mjs` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | INIT-02 | unit | `node .claude/tests/test-init-wizard.mjs` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | INIT-02 | unit | `node .claude/tests/test-init-wizard.mjs` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | INIT-03 | unit | `node .claude/tests/test-init-wizard.mjs` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 2 | INIT-04 | unit | `node .claude/tests/test-init-wizard.mjs` | ❌ W0 | ⬜ pending |
| 03-05-01 | 05 | 2 | INIT-05 | unit | `node .claude/tests/test-init-wizard.mjs` | ❌ W0 | ⬜ pending |
| 03-05-02 | 05 | 2 | INIT-05 | unit | `node .claude/tests/test-init-wizard.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.claude/tests/test-init-wizard.mjs` — stubs for INIT-01 through INIT-05
- [ ] `.claude/skills/using-qa-flow/scripts/package.json` — jszip dependency declaration + npm install
- [ ] `.claude/skills/using-qa-flow/templates/CLAUDE.md.template` — template file for CLAUDE.md generation

*Wave 0 must complete before any Wave 1 task.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 交互式问答流程（Markdown 表格展示、逐字段确认） | INIT-01 | Claude 对话交互无法自动化测试 | 在空目录运行 `using-qa-flow init`，验证摘要表格显示、确认后才写文件 |
| Re-init 意图询问（完整 vs 增量） | INIT-05 | 需要用户对话选择 | 在已有 config 的目录运行 init，验证询问意图后走增量路径 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
