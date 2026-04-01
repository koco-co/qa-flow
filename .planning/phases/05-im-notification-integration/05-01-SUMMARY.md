---
phase: 05-im-notification-integration
plan: "01"
subsystem: shared-scripts/notify
tags: [notification, dingtalk, feishu, wecom, email, nodemailer, tdd]
dependency_graph:
  requires: []
  provides: [notify.mjs, dispatch, getEnabledChannels, buildMessage, 4-channel-adapters]
  affects: [05-02-PLAN.md]
tech_stack:
  added: [nodemailer@8.0.4]
  patterns: [Promise.allSettled, loadDotEnv, isDirectExecution, dry-run CLI flag]
key_files:
  created:
    - .claude/shared/scripts/notify.mjs
    - .claude/shared/scripts/notify.test.mjs
    - .env.example
  modified:
    - .claude/shared/scripts/package.json
    - .claude/shared/scripts/package-lock.json
    - .gitignore
decisions:
  - "Single-file architecture: all 4 channel adapters + dispatch() in notify.mjs (D-01)"
  - "DingTalk keyword auto-append: checks title.includes(keyword) before appending (D-05)"
  - "Channel enable rule: has URL = enabled, missing = skip (D-07)"
  - "isDirectExecution() guard for CLI entry point (Phase 04 pattern)"
  - "mdToHtml regex-based subset: no external library (Research recommendation)"
metrics:
  duration: "15 min"
  completed: "2026-04-01"
  tasks_completed: 2
  files_changed: 6
---

# Phase 05 Plan 01: Notify Module — Unified IM Notification Infrastructure

**One-liner:** Single-file `notify.mjs` with `dispatch()` entry, DingTalk/Feishu/WeCom/SMTP adapters, keyword auto-append, Promise.allSettled delivery, dry-run support, and 29 passing unit tests.

## What Was Built

Created `.claude/shared/scripts/notify.mjs` — the unified notification module that all Phase 05 Plan 02 Skill integrations will call.

### notify.mjs (340 lines)

All 10 functions exported for testability:

| Function | Purpose |
|----------|---------|
| `loadDotEnv(path?)` | Parse `.env` file, only set unset vars |
| `httpsPost(url, body)` | Zero-dependency HTTPS JSON POST via `node:https` |
| `mdToHtml(markdown)` | Regex-based MD→HTML (no external library) |
| `getEnabledChannels()` | "has URL = enabled" — returns active channel list |
| `buildMessage(event, data)` | Standard header + event-specific body → `{title, markdown, html}` |
| `sendDingTalk(title, md, dryRun)` | DingTalk webhook, DINGTALK_KEYWORD auto-append |
| `sendFeishu(title, md, dryRun)` | Feishu webhook, `msg_type: "post"` format |
| `sendWeCom(md, dryRun)` | WeCom webhook, `msgtype: "markdown"` |
| `sendEmail(subject, html, dryRun)` | nodemailer SMTP, `transport.close()` per best practice |
| `dispatch(event, data, opts)` | Unified entry, Promise.allSettled, no single-channel failure blocks others |

CLI: `node notify.mjs --event case-generated --data '{"count":42}' --dry-run`

### .env.example

Documents all 4 channels: DingTalk, Feishu, WeCom, SMTP (10 vars total). Root `.env` added to `.gitignore`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests scaffold | 8a3e1e3 | notify.test.mjs |
| 1 (GREEN) | notify.mjs + nodemailer + .env.example + .gitignore | 87b0145 | notify.mjs, package.json, package-lock.json, .env.example, .gitignore |
| 2 | Comprehensive notify.test.mjs (29 tests) | 6e7d6ef | notify.test.mjs |

## Test Results

```
notify.test.mjs:  29 tests, 29 pass, 0 fail
Full suite:       66 tests, 66 pass, 0 fail (no regressions)
```

Test groups: `loadDotEnv` (4), `getEnabledChannels` (5), `buildMessage` (5), `mdToHtml` (3), `sendDingTalk` (3), `sendFeishu` (2), `sendWeCom` (2), `sendEmail` (2), `dispatch` (3)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all functions are fully implemented. Channel adapters use real HTTPS calls (non-dry-run) or accurate dry-run JSON output.

## Self-Check: PASSED

Files exist:
- `.claude/shared/scripts/notify.mjs` ✓
- `.claude/shared/scripts/notify.test.mjs` ✓
- `.env.example` ✓

Commits exist:
- `8a3e1e3` test(05-01): add failing tests for notify.mjs (RED) ✓
- `87b0145` feat(05-01): create notify.mjs with all 4 channel adapters ✓
- `6e7d6ef` feat(05-01): comprehensive notify.test.mjs with 29 passing tests ✓
