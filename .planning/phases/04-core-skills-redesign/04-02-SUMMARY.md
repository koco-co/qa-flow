---
phase: 04-core-skills-redesign
plan: 02
subsystem: archive-converter
tags:
  - generalization
  - config-driven
  - module-map
  - archive-converter
  - tdd
dependency_graph:
  requires:
    - 04-01 (xmind-converter generalization)
    - Phase 01 (load-config generalized API)
    - Phase 02 (resolveModulePath, casesRoot)
  provides:
    - Config-driven archive output path resolution
    - Dynamic module map building from config.modules
    - Testable buildModuleMap() and resolveOutputDir() exports
  affects:
    - test-case-generator (calls archive-converter)
    - using-qa-flow (menu references archive-converter)
tech_stack:
  added: []
  patterns:
    - isDirectExecution() guard for testability
    - buildCsvDirs() dynamic history scanning
    - buildModuleMap() config-driven module map
key_files:
  created:
    - .claude/tests/test_convert-history-cases_module-map.mjs
  modified:
    - .claude/skills/archive-converter/SKILL.md
    - .claude/skills/archive-converter/scripts/convert-history-cases.mjs
    - .claude/skills/archive-converter/scripts/json-to-archive-md.mjs
    - .claude/shared/scripts/load-config.mjs (worktree sync from Phase 1-2)
decisions:
  - Moved VALID_MODULES validation from module top-level to main() to enable clean import during tests
  - Added isDirectExecution() guard to convert-history-cases.mjs (same pattern as json-to-archive-md.mjs)
  - buildCsvDirs() dynamically scans cases/history/ — no hardcoded module dirs
  - getArchiveCSVFiles() kept as legacy fallback for archive-based CSVs
  - Kept archive-format.md rule file DTStack examples out of scope (not in scripts or SKILL.md)
  - Worktree load-config.mjs synced from main repo to access Phase 1-2 API
metrics:
  duration_minutes: 16
  completed_date: "2026-04-01"
  tasks: 2
  files: 4
requirements:
  - SKIL-05
---

# Phase 04 Plan 02: archive-converter Generalization Summary

**One-liner:** Config-driven archive-converter with dynamic buildModuleMap() from config.modules, removing all hardcoded DTStack/XYZH module paths and names.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 (RED) | TDD — add failing tests for buildModuleMap/resolveOutputDir | 920442e | Done |
| 1 (GREEN) | Script refactor — config-driven module map + isDirectExecution guard | 8c4ffcf | Done |
| 2 | Generalize SKILL.md — remove DTStack/XYZH tables and examples | 63028ea | Done |

## What Was Done

### Task 1: Script Refactor (TDD)

**RED Phase:** Created `.claude/tests/test_convert-history-cases_module-map.mjs` with 3 tests:
1. `buildModuleMap()` maps zh names and keys to module key
2. `buildModuleMap()` returns empty object for empty config.modules
3. `resolveOutputDir()` uses resolveModulePath for archive path with version

All 3 tests failed as expected (exports not yet present).

**GREEN Phase — convert-history-cases.mjs:**
- Added `buildModuleMap(configPath?)` export — builds module map dynamically from config.modules
- Added `resolveOutputDir(meta, configPath?)` export — uses resolveModulePath for consistent path resolution
- Replaced hardcoded `CUSTOM_CSV_DIRS` (cases/history/xyzh/v0.2.0, v0.2.1) with `buildCsvDirs()` that dynamically scans cases/history/
- Removed hardcoded `VALID_MODULES` array (was checked at module top level, now config-driven in main())
- Added `isDirectExecution()` guard so script doesn't auto-run on import (enables clean testing)
- Renamed `getDtstackCSVFiles` → `getArchiveCSVFiles` (no longer DTStack-specific)

**GREEN Phase — json-to-archive-md.mjs:**
- Renamed `DTSTACK_MODULE_MAP` → `MODULE_MAP`
- Removed `DTSTACK_MODULES` variable
- Removed `projectName === "信永中和"` special case
- Unified module key resolution via `resolveModuleKey()` for all modules
- Removed DTStack comment from prd_version extraction

### Task 2: SKILL.md Generalization

- Section 一: CSV source path updated to generic `${module_key}/${version}/*.csv`
- Section 二: Replaced hardcoded DTStack/XYZH table with config-driven `resolveModulePath` description
- Section 六: Replaced hardcoded module mapping table with dynamic config.modules description
- Section 四: Removed batch-works/xyzh specific examples, replaced with generic `${module_key}`
- Zero DTStack/信永中和/xyzh references remaining in scripts and SKILL.md

## Verification Results

```
DTStack/XYZH in scripts:  0 occurrences
Test suite (new tests):   pass 3 / fail 0
Scripts use config API:   15 occurrences
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree load-config.mjs was stale from pre-Phase-1 version**
- **Found during:** Task 1 GREEN — import of convert-history-cases.mjs failed with "does not provide export named 'getModuleKeys'"
- **Issue:** Worktree was created before Phase 1-2 generalized load-config.mjs. Old version had `getDtstackModules` instead of `getModuleKeys`, `loadConfigFromPath`, `resolveModulePath`
- **Fix:** Copied updated load-config.mjs from main repo into worktree
- **Files modified:** `.claude/shared/scripts/load-config.mjs`
- **Commit:** 8c4ffcf

**2. [Rule 2 - Missing Critical] isDirectExecution guard missing from convert-history-cases.mjs**
- **Found during:** Task 1 GREEN — module ran main() unconditionally on import, preventing test isolation
- **Issue:** Unlike json-to-archive-md.mjs, convert-history-cases.mjs had no isDirectExecution guard
- **Fix:** Added isDirectExecution() function + guard at module end; moved VALID_MODULES validation into main()
- **Files modified:** `.claude/skills/archive-converter/scripts/convert-history-cases.mjs`
- **Commit:** 8c4ffcf

## Self-Check: PASSED

All created files verified to exist.
All commits verified to exist:
- 920442e: test(04-02): add failing tests for buildModuleMap and resolveOutputDir
- 8c4ffcf: feat(04-02): generalize archive-converter scripts — config-driven module map
- 63028ea: feat(04-02): generalize archive-converter SKILL.md — remove DTStack/XYZH tables
