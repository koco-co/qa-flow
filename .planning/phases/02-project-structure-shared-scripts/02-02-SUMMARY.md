---
phase: 02-project-structure-shared-scripts
plan: "02"
subsystem: shared-scripts
tags:
  - config-driven
  - hardcoded-paths
  - refactor
  - generalization
dependency_graph:
  requires:
    - 02-01
  provides:
    - config-driven archive scanning (build-archive-index.mjs)
    - config-driven audit scanning (audit-md-frontmatter.mjs)
    - resolveModulePath-based path resolution (md-content-source-resolver.mjs)
    - generic config-driven directory scaffold (unify-directory-structure.mjs)
  affects:
    - any consumer of build-archive-index.mjs
    - any consumer of audit-md-frontmatter.mjs
    - any consumer of md-content-source-resolver.mjs
    - any caller of unify-directory-structure.mjs
tech_stack:
  added: []
  patterns:
    - config.casesRoot ?? 'cases/' pattern for all path derivation
    - resolveModulePath() for known module paths, graceful fallback for unknown products
    - module.repoHints[] replaces hardcoded product-to-repo mapping
key_files:
  modified:
    - .claude/shared/scripts/build-archive-index.mjs
    - .claude/shared/scripts/audit-md-frontmatter.mjs
    - .claude/shared/scripts/md-content-source-resolver.mjs
    - .claude/shared/scripts/unify-directory-structure.mjs
    - .claude/tests/test-md-content-source-resolver.mjs
decisions:
  - resolveModulePaths() wraps resolveModulePath() in try/catch with casesRoot fallback for graceful degradation on unknown products
  - module.repoHints[] field is the config-driven replacement for the removed DEFAULT_REPO_HINT_KEYS_BY_PRODUCT constant
  - _casesRoot loaded once at module level from config for all path pattern regex construction
  - _archivePrefix and _requirementsPrefix constants extracted from CONFIG.casesRoot in audit-md-frontmatter.mjs
metrics:
  duration: 10
  completed_date: "2026-03-31"
  tasks_completed: 3
  files_modified: 5
---

# Phase 02 Plan 02: Refactor Shared Scripts to Config-Driven Paths Summary

Config-driven path refactor of four shared scripts eliminating all hardcoded `cases/` path literals via `config.casesRoot` and `resolveModulePath()`.

## Objective Achieved

All four shared scripts now derive paths exclusively from `config.casesRoot` and `resolveModulePath()`. No DTStack-specific logic (module names, repo mappings, migration functions) remains in any shared script. Full test suite maintained with no new regressions.

## Tasks Completed

### Task 1: Refactor build-archive-index.mjs and audit-md-frontmatter.mjs

**build-archive-index.mjs:**
- Replaced `join(ROOT, "cases/archive")` with `join(ROOT, config.casesRoot ?? 'cases/', 'archive')`
- Added `loadConfig` to the import from `load-config.mjs`
- Updated file comment to reflect config-driven path resolution

**audit-md-frontmatter.mjs:**
- Updated file comment header
- Replaced `collectMdFiles(join(ROOT, "cases/archive"))` / `collectMdFiles(join(ROOT, "cases/requirements"))` with casesRoot-derived paths
- Replaced `rel.startsWith("cases/archive/")` / `rel.startsWith("cases/requirements/")` with config-derived prefix constants `_archivePrefix` and `_requirementsPrefix`

**Commit:** `0700ea4` — feat(02-02): refactor build-archive-index and audit-md-frontmatter to use config-driven paths

### Task 2: Refactor md-content-source-resolver.mjs

- Added `resolveModulePath` to import from `load-config.mjs`
- Deleted `DEFAULT_REPO_HINT_KEYS_BY_PRODUCT` DTStack-specific hardcoded constant
- Updated `buildRepoCandidates()` to read `moduleConfig.repoHints || []` from config instead
- Rewrote `resolveModulePaths()` to use `resolveModulePath()` for known modules, with graceful fallback via casesRoot convention for unknown products
- Loaded `_casesRoot` at module level from config once for all pattern matching
- Updated `inferSourceOrigin()` to construct regex patterns from `_casesRoot` instead of literal `cases/`
- Updated `isXmindPath()` and `isHistoryPath()` to use `_casesRoot`-based string matching

**Commits:**
- `b1acfaa` — feat(02-02): refactor md-content-source-resolver to use resolveModulePath() and remove DTStack mapping
- `afe12c6` — test(02-02): update md-content-source-resolver tests to use module config repoHints

### Task 3: Replace unify-directory-structure.mjs DTStack logic with generic scaffold

The file was rewritten as a generic ~60-line config-driven scaffold (completed in commit `02f1e6b` as part of phase 02 plan 03 pre-work):
- No DTStack-specific functions (migrateDataAssets, migrateXyzh, SPECIAL_XMIND_DIRS removed)
- No file movement / trash logic
- No JSZip dependency
- Uses `resolveModulePath()` for all path derivation
- Uses `config.casesRoot` for the top-level root
- Preserves `--dry-run` flag for safety
- 60 lines total (vs original 760 lines)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test file required updating alongside implementation**
- **Found during:** Task 2
- **Issue:** test-md-content-source-resolver.mjs was testing repo hint resolution using the removed `DEFAULT_REPO_HINT_KEYS_BY_PRODUCT` constant implicitly. After removing the constant, 3 tests that previously relied on the DTStack hardcoded mapping (via implicit product-to-repo lookup) needed to be updated to use the new `module.repoHints[]` config field.
- **Fix:** Added `repoHints` field to module configs in test fixtures (`testConfig` and `testConfigXyzh`). Updated 3 test calls to pass explicit configs with repoHints.
- **Files modified:** `.claude/tests/test-md-content-source-resolver.mjs`
- **Commit:** `afe12c6`

**2. [Note] unify-directory-structure.mjs pre-completed**
- The Task 3 rewrite was found already completed in commit `02f1e6b` (feat(02-03): add hardcoded-path regression test + rewrite unify-directory-structure.mjs), executed as pre-work by the previous plan execution. Task 3 was verified as fully correct and all acceptance criteria passed.

## Verification Results

All acceptance criteria verified:

- `build-archive-index.mjs` does NOT contain `"cases/archive"` hardcoded string
- `audit-md-frontmatter.mjs` does NOT contain `join(ROOT, "cases/archive")` or `join(ROOT, "cases/requirements")`
- `audit-md-frontmatter.mjs` does NOT contain `rel.startsWith("cases/archive/")` or `rel.startsWith("cases/requirements/")`
- `audit-md-frontmatter.mjs` contains `CONFIG.casesRoot`
- `build-archive-index.mjs` contains `config.casesRoot` and `loadConfig()`
- `md-content-source-resolver.mjs` does NOT contain `DEFAULT_REPO_HINT_KEYS_BY_PRODUCT`
- `md-content-source-resolver.mjs` contains `import` of `resolveModulePath` from `./load-config.mjs`
- `unify-directory-structure.mjs` does NOT contain `migrateDataAssets`, `migrateXyzh`, or `SPECIAL_XMIND_DIRS`
- `unify-directory-structure.mjs` is 60 lines (under 100)
- `node .claude/shared/scripts/unify-directory-structure.mjs --dry-run` exits 0
- `node .claude/shared/scripts/build-archive-index.mjs --stats` exits 0, reports 183 files
- `node .claude/tests/test-md-content-source-resolver.mjs` exits 0 with 27/27 tests passing
- Full test suite: 16 test files, 6 pre-existing failures (all pre-date this plan), 0 new regressions

## Self-Check: PASSED

All key files verified present:
- FOUND: build-archive-index.mjs
- FOUND: audit-md-frontmatter.mjs
- FOUND: md-content-source-resolver.mjs
- FOUND: unify-directory-structure.mjs
- FOUND: 02-02-SUMMARY.md

All task commits verified:
- FOUND: 0700ea4 feat(02-02): refactor build-archive-index and audit-md-frontmatter
- FOUND: b1acfaa feat(02-02): refactor md-content-source-resolver
- FOUND: afe12c6 test(02-02): update md-content-source-resolver tests
