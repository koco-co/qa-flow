---
phase: 01-generalization-refactor
plan: "01"
subsystem: config
tags: [node-test, esm, config-schema, validation, load-config, dtstack-generalization]

requires: []

provides:
  - "Generalized config.json schema with no DTStack field names (zentaoId, repoBranchMapping, dataAssetsVersionMap removed)"
  - "loadConfig() with required-field validation throwing descriptive errors"
  - "loadConfigFromPath(path) and resetConfigCache() for test isolation"
  - "getModuleKeys() replacing getDtstackModules()"
  - "getBranchMappingPath() reading config.branchMapping (not config.repoBranchMapping)"
  - "Wave 0 test scaffolds covering GEN-01 through GEN-06"

affects:
  - "01-02 (output-naming-contracts generalization — test scaffold ready)"
  - "01-03 (rules generalization — smoke test scaffold ready)"
  - "01-04 (prompts generalization — smoke test scaffold ready)"
  - "01-05 (branch migration — smoke test scaffold ready)"
  - "All downstream scripts importing getDtstackModules (now removed)"

tech-stack:
  added: ["node:test built-in test framework"]
  patterns:
    - "loadConfigFromPath(path) pattern for testability"
    - "resetConfigCache() for test isolation between test cases"
    - "Hand-written required-field validation with descriptive error messages"
    - "Wave 0 test scaffolds: write failing tests first, implement to make GREEN"

key-files:
  created:
    - ".claude/shared/scripts/load-config.test.mjs"
    - ".claude/shared/scripts/output-naming-contracts.test.mjs"
    - ".claude/shared/scripts/test-fixtures/config-generalized.json"
    - ".planning/tests/rules-generalization.test.mjs"
    - ".planning/tests/prompts-generalization.test.mjs"
    - ".planning/tests/branch-migration.test.mjs"
  modified:
    - ".claude/config.json"
    - ".claude/shared/scripts/load-config.mjs"
    - ".claude/tests/test-load-config.mjs"

key-decisions:
  - "Hand-written validation chosen over Ajv/Zod — schema is small, zero new dependencies"
  - "loadConfigFromPath(path) exported for test isolation — loadConfig() calls it with default CONFIG_PATH"
  - "resetConfigCache() exported for test isolation between test cases"
  - "getRepoBranchMappingPath() kept as deprecated alias to avoid breaking callers immediately"
  - "config.modules and modules[*].type field removed — module type distinction was DTStack-specific"
  - "Wave 0 test scaffolds intentionally fail RED until Plans 02-05 implement the changes"

patterns-established:
  - "Test isolation: use loadConfigFromPath(path) with temp config files, not the real config.json"
  - "Validation: assertRequiredFields() throws on first missing field with fieldPath in message"
  - "Deprecation: keep old function names as aliases calling new names during transition"

requirements-completed:
  - GEN-01
  - GEN-02
---

# Phase 1 Plan 01: Config Schema Generalization and Wave 0 Test Scaffolds Summary

**Generalized config.json schema removing all DTStack fields, added loadConfig() validation with descriptive errors, and created 5 Wave 0 test scaffolds covering all Phase 1 requirements (GEN-01 through GEN-06)**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-31T10:43:23Z
- **Completed:** 2026-03-31T10:48:22Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Removed all DTStack-specific fields from config.json (6 modules, 18 repo paths, 8 Java package mappings, zentaoId, repoBranchMapping, dataAssetsVersionMap)
- Added loadConfig() validation: throws descriptive errors naming missing fields (project.name, modules)
- Replaced getDtstackModules() with getModuleKeys(); added getBranchMappingPath(), loadConfigFromPath(), resetConfigCache() as exports
- Created 5 Wave 0 test scaffolds using node:test (no external dependencies) covering all GEN-01 through GEN-06 requirements
- All 16 load-config.test.mjs tests pass GREEN; smoke tests correctly fail RED (as designed) until Plans 02-05

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Wave 0 test scaffolds** — `a60185d` (test)
2. **Task 2: Redesign config.json and add loadConfig() validation** — `b4b352d` (feat)

## Files Created/Modified

- `.claude/config.json` — Generalized schema: empty modules/repos/stackTrace, branchMapping: null, no DTStack content
- `.claude/shared/scripts/load-config.mjs` — Added validation, getModuleKeys(), getBranchMappingPath(), loadConfigFromPath(), resetConfigCache(); removed getDtstackModules()
- `.claude/tests/test-load-config.mjs` — Updated legacy test file to match new schema (30 tests pass)
- `.claude/shared/scripts/load-config.test.mjs` — New node:test unit tests for GEN-01 and GEN-02 (16 tests)
- `.claude/shared/scripts/output-naming-contracts.test.mjs` — Test scaffold for GEN-05 (8 tests, 2 fail RED until Plan 02)
- `.claude/shared/scripts/test-fixtures/config-generalized.json` — Test fixture for load-config tests
- `.planning/tests/rules-generalization.test.mjs` — Smoke test for GEN-03 (25 tests, 1 fail RED until Plan 03)
- `.planning/tests/prompts-generalization.test.mjs` — Smoke test for GEN-04 (8 tests, 5 fail RED until Plan 04)
- `.planning/tests/branch-migration.test.mjs` — Smoke test for GEN-06 (12 tests, 10 fail RED until Plan 05)

## Decisions Made

- Used hand-written validation in assertRequiredFields() — no new dependencies, matches project's zero-dep preference (only jszip in package.json)
- Exported loadConfigFromPath(path) so tests can pass temp config files without module cache interference
- Exported resetConfigCache() for test isolation between test cases within the same process
- Kept getRepoBranchMappingPath() as deprecated alias calling getBranchMappingPath() — avoids immediate breakage of callers listed in plan interfaces
- Removed config.modules[*].type field — the dtstack/custom distinction was used only by getDtstackModules(), which is now removed; module type should be inferred from field presence, not hardcoded string
- Wave 0 test scaffolds correctly fail RED on current codebase, validating that they will accurately signal when Plans 02-05 are complete

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- Plan 01-02 (output-naming-contracts generalization) can begin: test scaffold exists at `.claude/shared/scripts/output-naming-contracts.test.mjs`
- Plan 01-03 (rules generalization) can begin: smoke test at `.planning/tests/rules-generalization.test.mjs` currently finds 1 DTStack reference in xmind-output.md
- Plan 01-04 (prompts generalization) can begin: smoke test at `.planning/tests/prompts-generalization.test.mjs` currently finds 5 failures (Doris/Hive/SparkThrift in step prompts)
- Plan 01-05 (branch migration) can begin: smoke test at `.planning/tests/branch-migration.test.mjs` shows 10 DTStack data dirs still present
- Callers of getDtstackModules() still reference it in 4 skill scripts (listed in plan interfaces) — Plan 01-02 must update these

---
*Phase: 01-generalization-refactor*
*Completed: 2026-03-31*
