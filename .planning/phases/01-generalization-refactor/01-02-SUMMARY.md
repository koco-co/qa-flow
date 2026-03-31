---
phase: 01-generalization-refactor
plan: "02"
subsystem: scripts
tags: [mjs, output-naming, load-config, xmind, archive, generalization]

requires:
  - phase: 01-generalization-refactor/01-01
    provides: "getModuleKeys(), getBranchMappingPath(), loadConfigFromPath() exports in load-config.mjs"

provides:
  - "getPreferredArchiveBaseName exported from output-naming-contracts.mjs (generic, no source_standard check)"
  - "getDtstackPreferredArchiveBaseName removed; deriveArchiveBaseName works for any project"
  - "All script call sites updated: getDtstackModules -> getModuleKeys, zentaoId -> trackerId, dataAssetsVersionMap -> versionMap"
  - "output-naming-contracts.test.mjs unit tests (8 passing)"

affects:
  - 01-generalization-refactor/01-03
  - xmind-converter skill scripts
  - archive-converter skill scripts
  - unify-directory-structure script

tech-stack:
  added: []
  patterns:
    - "getPreferredArchiveBaseName: generic meta-field title resolution (archive_file_name || requirement_title || page_title)"
    - "config.versionMap || {} pattern: all optional config map fields guarded with || {} fallback"
    - "getModuleKeys() as generic replacement for all getDtstackModules() call sites"

key-files:
  created:
    - .claude/shared/scripts/output-naming-contracts.test.mjs
  modified:
    - .claude/shared/scripts/output-naming-contracts.mjs
    - .claude/skills/archive-converter/scripts/json-to-archive-md.mjs
    - .claude/skills/archive-converter/scripts/convert-history-cases.mjs
    - .claude/skills/xmind-converter/scripts/json-to-xmind.mjs
    - .claude/skills/xmind-converter/scripts/patch-xmind-roots.mjs
    - .claude/skills/archive-converter/scripts/convert-data-assets-v2.mjs
    - .claude/shared/scripts/unify-directory-structure.mjs

key-decisions:
  - "getPreferredArchiveBaseName is exported (public API) so callers can use it directly without going through deriveArchiveBaseName"
  - "isDtstackMeta() in json-to-xmind.mjs re-derives zh module names from config.modules at runtime instead of from removed getDtstackModules()"
  - "convert-data-assets-v2.mjs retains DTStack-specific logic with NOTE comment marking it for GEN-06 branch migration"
  - "unify-directory-structure.mjs versionMap passed per-module (null for empty map) to preserve existing behavior when no versionMap configured"

patterns-established:
  - "Pattern: All optional config map fields use config.fieldName || {} to avoid crashes on absent fields"
  - "Pattern: getModuleKeys() for module enumeration; getModuleMap() for zh->key lookup"

requirements-completed:
  - GEN-05

duration: 4min
completed: "2026-03-31"
---

# Phase 01 Plan 02: Script Call Sites Generalization Summary

**Renamed getDtstackPreferredArchiveBaseName to getPreferredArchiveBaseName (removing source_standard guard), and replaced all getDtstackModules/zentaoId/dataAssetsVersionMap references across 6 skill/shared scripts**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-31T10:55:39Z
- **Completed:** 2026-03-31T10:59:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Generalized `output-naming-contracts.mjs`: `getPreferredArchiveBaseName` exported as public API, works for any project (no `source_standard` guard)
- All 6 script call sites updated: zero remaining `getDtstackModules`, `zentaoId`, or `dataAssetsVersionMap` references in functional code
- `versionMap` absence handled gracefully with `|| {}` fallback in `unify-directory-structure.mjs`
- TDD: 8 output-naming-contracts tests GREEN, 16 load-config tests GREEN, 30 legacy tests GREEN

## Task Commits

Each task was committed atomically:

1. **Task 1: Generalize output-naming-contracts.mjs and create its test file** - `c16266c` (feat)
2. **Task 2: Update all script call sites for getDtstackModules, zentaoId, and dataAssetsVersionMap** - `8ee462d` (feat)

## Files Created/Modified

- `.claude/shared/scripts/output-naming-contracts.mjs` - Renamed getDtstackPreferredArchiveBaseName to getPreferredArchiveBaseName; removed source_standard guard; exported as public API
- `.claude/shared/scripts/output-naming-contracts.test.mjs` - 8 unit tests covering generalized behavior (existed as scaffold, already correct)
- `.claude/skills/archive-converter/scripts/json-to-archive-md.mjs` - Replace getDtstackModules import with getModuleKeys + loadConfig; rebuild module map from config
- `.claude/skills/archive-converter/scripts/convert-history-cases.mjs` - Replace getDtstackModules with getModuleKeys; DTSTACK_MODULES_EN/ZH -> ALL_MODULE_KEYS
- `.claude/skills/xmind-converter/scripts/json-to-xmind.mjs` - Replace getDtstackModules with getModuleKeys; zentaoId -> trackerId in buildRootTitle
- `.claude/skills/xmind-converter/scripts/patch-xmind-roots.mjs` - zentaoId -> trackerId in findVersionedXmindFiles and buildExpectedRoot
- `.claude/skills/archive-converter/scripts/convert-data-assets-v2.mjs` - dataAssetsVersionMap -> versionMap with DTStack-specific NOTE
- `.claude/shared/scripts/unify-directory-structure.mjs` - All 7 dataAssetsVersionMap references renamed to versionMap with config.versionMap || {} fallback

## Decisions Made

- `getPreferredArchiveBaseName` exported as public API (not just internal) so callers can use it directly
- `isDtstackMeta()` in json-to-xmind.mjs re-derives zh module names from `config.modules` at runtime instead of caching from removed getDtstackModules()
- `convert-data-assets-v2.mjs` retains DTStack-specific logic with a NOTE comment marking it for GEN-06 branch migration
- `unify-directory-structure.mjs` uses `configVersionMap` (config.versionMap || {}) and passes null to processXmindModule when empty, preserving existing behavior

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- All shared scripts and skill scripts now use generic config field names and function names
- Zero DTStack-specific identifiers remain in functional script code
- Ready for Plan 03 (config.json schema finalization) and Plan 04 (prompts/CLAUDE.md generalization)

---
*Phase: 01-generalization-refactor*
*Completed: 2026-03-31*
