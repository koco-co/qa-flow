---
phase: 03-init-wizard
plan: "02"
subsystem: init-wizard
tags: [init, config, template, reinit, cli]
dependency_graph:
  requires: [scanProject, parseHistoryFile, inferModuleKeyFromFilename]
  provides: [buildConfigObject, writeOutputs, loadExistingConfig, renderTemplate, mergeConfigGroups]
  affects: [03-03-PLAN]
tech_stack:
  added: []
  patterns: [validated config writer, placeholder-based template rendering, group-based re-init merge]
key_files:
  created:
    - .claude/skills/using-qa-flow/templates/CLAUDE.md.template
  modified:
    - .claude/skills/using-qa-flow/scripts/init-wizard.mjs
    - .claude/tests/test-init-wizard.mjs
decisions:
  - "loadExistingConfig first validates via loadConfigFromPath, then falls back to raw JSON parsing so broken legacy configs still surface for re-init instead of crashing"
  - "mergeConfigGroups replaces only the selected top-level groups so incremental re-init preserves all unselected values exactly"
metrics:
  duration_seconds: 720
  completed: "2026-03-31T15:10:30Z"
  tasks_completed: 2
  tasks_total: 2
  test_count: 62
  test_pass: 62
  files_created: 1
  files_modified: 2
---

# Phase 03 Plan 02: Init Wizard Write Layer + Template Rendering Summary

**Config generation, CLAUDE.md template rendering, and incremental re-init group merging for the init wizard write layer**

## What Was Built

### init-wizard.mjs (Write + Re-init Layer)
- **`buildConfigObject()`** builds a complete `.claude/config.json` payload with defaults for `trash`, `assets`, `reports`, `integrations.lanhuMcp`, and `shortcuts`
- **`writeOutputs()`** validates generated config, writes `.claude/config.json`, and optionally writes `CLAUDE.md`
- **`loadExistingConfig()`** loads existing config for re-init flows and tolerates partially broken legacy JSON by falling back to raw parsing
- **`renderTemplate()`** replaces `{{PROJECT_NAME}}`, `{{MODULE_KEY_EXAMPLE}}`, and `{{CASES_ROOT}}`, then rejects any residual placeholders
- **`mergeConfigGroups()`** supports incremental re-init by replacing only selected groups: `basic`, `modules`, `repos`, `integrations`, `shortcuts`

### CLAUDE.md Template
- Added `.claude/skills/using-qa-flow/templates/CLAUDE.md.template`
- Mirrors the current handbook structure while parameterizing:
  - `{{PROJECT_NAME}}`
  - `{{MODULE_KEY_EXAMPLE}}`
  - `{{CASES_ROOT}}`
- Keeps the repo-rules section and generic `<module-key>` examples for initialized projects

## CLI Surface

- `node init-wizard.mjs --command write --config-json '<json>' [--claude-md '<content>']`
- `node init-wizard.mjs --command load-existing [--root-dir <path>]`
- `node init-wizard.mjs --command render-template --template-path <path> --replacements '<json>'`

## Test Coverage

Extended `test-init-wizard.mjs` from 9 groups / 32 assertions to 19 groups / 62 assertions:

| Area | Coverage |
|------|----------|
| Config builder | required fields, defaults, displayName fallback |
| File writer | writes valid config + CLAUDE.md, rejects invalid config |
| Template rendering | replaces all placeholders, fails on unknown placeholders |
| Re-init loader | empty directory → null, existing config → parsed object |
| Incremental merge | preserves unselected groups, replaces selected groups |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `d913bd6` | feat(03-02): add init wizard write and template support |
| 2 | `01ab145` | test(03-02): extend init wizard write and re-init coverage |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — write/load/render/merge logic is fully implemented.

## Requirements Addressed

- **INIT-04**: CLAUDE.md template generation with placeholder replacement
- **INIT-05**: config.json generation, validation, and re-init support

## Self-Check: PASSED
