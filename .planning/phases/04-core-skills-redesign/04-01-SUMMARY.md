---
phase: 04-core-skills-redesign
plan: 01
subsystem: testing
tags: [xmind, config-driven, node-test, tdd, skill-refactor]

requires:
  - phase: 01-generalization-refactor
    provides: "loadConfig() with loadConfigFromPath/resetConfigCache APIs, config.project.displayName, config.modules[key].trackerId"
  - phase: 02-project-structure-shared-scripts
    provides: "resolveModulePath() for config-driven path resolution"

provides:
  - "config-driven buildRootTitle() in json-to-xmind.mjs — no DTStack coupling"
  - "config-driven buildL1Title() — unified 【version】name(#ticket) format"
  - "exported buildRootTitle/buildL1Title for unit testing"
  - "isDirectExecution() guard in json-to-xmind.mjs for importability"
  - "6 unit tests for buildRootTitle/buildL1Title behavior"
  - "generalized xmind-converter SKILL.md with config-driven output directory table"

affects:
  - test-case-generator
  - archive-converter
  - using-qa-flow

tech-stack:
  added: []
  patterns:
    - "isDirectExecution() guard pattern extended to json-to-xmind.mjs (same as json-to-archive-md.mjs)"
    - "buildRootTitle optional _config parameter for test isolation without config file mutation"
    - "node:test it() style unit tests with loadConfigFromPath for full isolation"

key-files:
  created:
    - ".claude/tests/test_json-to-xmind_root-title.mjs"
  modified:
    - ".claude/skills/xmind-converter/scripts/json-to-xmind.mjs"
    - ".claude/skills/xmind-converter/SKILL.md"
    - ".claude/tests/test-json-to-xmind.mjs"

key-decisions:
  - "buildRootTitle accepts optional _config parameter for test isolation — avoids writing to real config.json in tests"
  - "isDtstackMeta fully deleted — replaced by config.modules[key].trackerId presence check for folding behavior"
  - "buildL1Title unified format 【version】name(#ticket) for all projects — no special-casing"
  - "L1 folding (branch='folded') now controlled by mod?.trackerId in config, not isDtstackMeta"
  - "test-json-to-xmind.mjs DTStack assertions updated to reflect new config-driven behavior"

patterns-established:
  - "Config injection pattern: exported functions accept optional _config for testability"
  - "isDirectExecution() guard: all CLI scripts use this pattern to be importable as modules"

requirements-completed: [SKIL-04]

duration: 14min
completed: 2026-03-31
---

# Phase 4 Plan 01: XMind Converter Generalization Summary

**Removed isDtstackMeta() from json-to-xmind.mjs and replaced with config-driven buildRootTitle/buildL1Title using config.project.displayName and mod.trackerId fallback chain**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-31T17:13:12Z
- **Completed:** 2026-03-31T17:27:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Deleted `isDtstackMeta()` function and all 4 call sites from json-to-xmind.mjs
- `buildRootTitle` now uses `mod?.zh || config.project?.displayName || meta.project_name` fallback chain
- `buildL1Title` unified to `【version】name(#ticket)` format for all projects (no special-casing)
- Added `isDirectExecution()` guard and exported `buildRootTitle`/`buildL1Title` for unit testing
- Created 6 passing unit tests covering all specified behaviors
- Updated xmind-converter SKILL.md: replaced DTStack product table with config-driven `resolveModulePath` description

## Task Commits

Each task was committed atomically:

1. **Task 1: TDD — buildRootTitle and buildL1Title unit tests + script refactor** - `eb92779` (feat)
2. **Task 2: Generalize xmind-converter SKILL.md** - `9a83cd1` (feat)

## Files Created/Modified

- `.claude/skills/xmind-converter/scripts/json-to-xmind.mjs` - Removed isDtstackMeta, added config-driven title builders, isDirectExecution guard, exports
- `.claude/tests/test_json-to-xmind_root-title.mjs` - 6 unit tests for buildRootTitle/buildL1Title
- `.claude/skills/xmind-converter/SKILL.md` - Generalized output directory table and verification criteria
- `.claude/tests/test-json-to-xmind.mjs` - Updated DTStack assertions to match new config-driven behavior

## Decisions Made

- `buildRootTitle` accepts an optional `_config` parameter so tests can inject a config object directly instead of writing to the real config.json — avoids file mutation race conditions in concurrent test execution
- `isDtstackMeta` fully deleted (not preserved as deprecated) — the function checked `source_standard === 'dtstack'` and module key membership, both of which are now replaced by config-driven logic
- L1 folding (`branch='folded'`) now controlled by `mod?.trackerId` in config instead of isDtstackMeta — projects without trackerId get unfolded L1 nodes by default

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test isolation issue with shared config.json**
- **Found during:** Task 1 (TDD RED phase)
- **Issue:** Initial test design wrote to real config.json and relied on process.on('exit') for cleanup. Concurrent test execution in node:test caused config file to remain overwritten after test failures, breaking other tests.
- **Fix:** Redesigned test to use `loadConfigFromPath` with temp config files and pass config directly to `buildRootTitle` via optional `_config` parameter. No shared file mutation.
- **Files modified:** `.claude/tests/test_json-to-xmind_root-title.mjs`, `.claude/skills/xmind-converter/scripts/json-to-xmind.mjs`
- **Verification:** 6 tests pass with full isolation, no config.json side effects
- **Committed in:** eb92779 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug: test isolation)
**Impact on plan:** The fix improved the implementation by adding the optional `_config` parameter pattern to `buildRootTitle`, which is better API design for testability. No scope creep.

## Issues Encountered

- Pre-existing test failure in `test-archive-history-scripts.mjs` (XYZH routing test, 1 failure of 33) — this failure pre-dates this plan and is unrelated to xmind-converter changes. Logged as out-of-scope.

## Next Phase Readiness

- xmind-converter is fully config-driven with no DTStack coupling
- `buildRootTitle` and `buildL1Title` are exported and unit-tested
- Ready for archive-converter generalization (Plan 04-02 dependency)

---
*Phase: 04-core-skills-redesign*
*Completed: 2026-03-31*
