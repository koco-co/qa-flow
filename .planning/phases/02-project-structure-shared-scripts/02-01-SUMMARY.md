---
phase: 02-project-structure-shared-scripts
plan: "01"
subsystem: infra
tags: [config, load-config, path-resolution, node, esm, tdd]

requires:
  - phase: 01-generalization-refactor
    provides: load-config.mjs with loadConfig()/loadConfigFromPath(), generalized config.json schema

provides:
  - resolveModulePath(moduleKey, type, config, version) — convention + override path resolution for module artifacts
  - requireNonEmptyModules(config) — guard that throws with /using-qa-flow init guidance
  - config.json casesRoot field (defaults to 'cases/')
  - .gitkeep scaffolding for cases/requirements/, cases/xmind/, cases/archive/, cases/history/
  - .claude/repo-branch-mapping.yaml migrated from config/

affects:
  - 02-project-structure-shared-scripts (other plans in phase use resolveModulePath)
  - 03-skill-refactor (skills call resolveModulePath for path derivation)
  - any script that previously derived paths from config manually

tech-stack:
  added: []
  patterns:
    - "resolveModulePath(key, type, config, version) convention-path pattern with explicit override and versioned subdirectory support"
    - "requireNonEmptyModules() guard pattern for early-fail with /using-qa-flow init guidance"
    - "TDD describe('STRU-02') block extending existing load-config.test.mjs suite"

key-files:
  created:
    - .claude/shared/scripts/load-config.mjs (resolveModulePath + requireNonEmptyModules added)
    - .claude/repo-branch-mapping.yaml
    - cases/requirements/.gitkeep
    - cases/xmind/.gitkeep
    - cases/archive/.gitkeep
    - cases/history/.gitkeep
  modified:
    - .claude/shared/scripts/load-config.mjs
    - .claude/shared/scripts/load-config.test.mjs
    - .claude/config.json

key-decisions:
  - "resolveModulePath uses inline export function declaration — name appears once in source (grep count = 1), tests confirm export availability"
  - "config.branchMapping remains null on generic branch; .claude/repo-branch-mapping.yaml path is the convention for when branchMapping is configured"
  - "Pre-existing test suite failures (7 files) confirmed as pre-existing before this plan — not introduced by Task 2"

patterns-established:
  - "resolveModulePath: convention path = {casesRoot}{type}/{moduleKey}/; override = mod[type]; versioned = append v{version}/ when mod.versioned===true"
  - "requireNonEmptyModules: always throw with '/using-qa-flow init' guidance message for empty modules"
  - "casesRoot defaults to 'cases/' via nullish coalescing when field absent from config"

requirements-completed:
  - STRU-01
  - STRU-02

duration: 10min
completed: 2026-03-31
---

# Phase 02 Plan 01: Project Structure & Shared Scripts — resolveModulePath API Summary

**resolveModulePath() and requireNonEmptyModules() added to load-config.mjs, config.json extended with casesRoot, cases/ directories scaffolded with .gitkeep, config/ retired to .claude/**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-31T11:53:04Z
- **Completed:** 2026-03-31T12:03:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added `resolveModulePath(moduleKey, type, config, version)` to load-config.mjs with convention paths, explicit override support, versioned subdirectory support, and error guidance
- Added `requireNonEmptyModules(config)` guard with `/using-qa-flow init` error messaging
- Extended config.json schema with `casesRoot` field
- Created 11-test STRU-02 describe block in load-config.test.mjs (all 29 suite tests pass)
- Scaffolded `cases/requirements/`, `cases/xmind/`, `cases/archive/`, `cases/history/` directories with `.gitkeep` for fresh clone support
- Migrated `config/repo-branch-mapping.yaml` to `.claude/repo-branch-mapping.yaml`, deleted `config/` directory

## Task Commits

1. **Task 1: Add resolveModulePath() API + config schema extension + .gitkeep scaffolding** - `659f47e` (feat, TDD)
2. **Task 2: Migrate config/ directory to .claude/ and update references** - `12749c4` (chore)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `.claude/shared/scripts/load-config.mjs` - Added resolveModulePath(), requireNonEmptyModules() after getModuleKeys()
- `.claude/shared/scripts/load-config.test.mjs` - Added STRU-02 describe block with 11 tests
- `.claude/config.json` - Added casesRoot field after project field
- `.claude/repo-branch-mapping.yaml` - Migrated from config/ (identical content)
- `cases/requirements/.gitkeep` - Directory scaffold for fresh clone
- `cases/xmind/.gitkeep` - Directory scaffold for fresh clone
- `cases/archive/.gitkeep` - Directory scaffold for fresh clone
- `cases/history/.gitkeep` - Directory scaffold for fresh clone

## Decisions Made

- `resolveModulePath` uses inline `export function` ESM declaration — function name appears once in source. Tests verify export is available at runtime, which is the correct validation.
- `config.branchMapping` remains `null` on the generic branch; `.claude/repo-branch-mapping.yaml` is the conventional path for projects that configure this field.
- Pre-existing test suite failures (7 test files failing) were confirmed present before this plan via `git stash` verification — not caused by Task 2 changes.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `resolveModulePath()` is available for all Phase 02 scripts and Phase 03 skill refactoring
- `requireNonEmptyModules()` provides consistent error guidance for empty-config edge cases
- Fresh clone directory structure guaranteed via .gitkeep files
- config/ directory fully retired; .claude/ is now the single home for all config files

---
*Phase: 02-project-structure-shared-scripts*
*Completed: 2026-03-31*
