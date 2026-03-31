---
phase: 03-init-wizard
plan: "01"
subsystem: init-wizard
tags: [init, scanning, parsing, csv, xmind, inference]
dependency_graph:
  requires: []
  provides: [scanProject, parseHistoryFile, inferModuleKeyFromFilename]
  affects: [03-02-PLAN, 03-03-PLAN]
tech_stack:
  added: [jszip]
  patterns: [CLI sub-command router, recursive directory scan, dynamic import for optional deps]
key_files:
  created:
    - .claude/skills/using-qa-flow/scripts/init-wizard.mjs
    - .claude/skills/using-qa-flow/scripts/package.json
    - .claude/tests/test-init-wizard.mjs
  modified: []
decisions:
  - "parseHistoryFile is async (returns Promise) due to JSZip async API; CSV path also returns Promise for API consistency"
  - "Modules from cases/archive/ and cases/requirements/ enrich paths of existing xmind-discovered modules rather than creating duplicates"
  - "CLI uses isMain guard (process.argv[1] === __filename) so imports don't trigger CLI routing"
metrics:
  duration_seconds: 277
  completed: "2026-03-31T14:21:33Z"
  tasks_completed: 2
  tasks_total: 2
  test_count: 32
  test_pass: 32
  files_created: 3
  files_modified: 0
---

# Phase 03 Plan 01: Init Wizard Scanning + History File Parsing Summary

**One-liner:** Read-only project directory scanner (5 signals) and CSV/XMind history file parser with JSZip for init wizard inference layer

## What Was Built

### init-wizard.mjs (Core Script)
- **`scanProject(rootDir)`** — Scans a project directory and returns structured JSON with:
  - `modules[]` array: each module has `key`, `versioned` (boolean), `inferredFrom`, and `paths` object
  - `signals.hasCasesDir` — whether cases/ directory exists
  - `signals.hasReposDir` — whether .repos/ directory exists
  - `signals.hasImages` — whether assets/images/ contains image files
  - `signals.historyFiles` — array of {path, type} for .csv/.xmind under cases/history/
  - `signals.prdVersionPatterns` — version strings extracted from requirements directory/file names
  - `signals.existingConfig` — parsed config.json if found (for re-init scenario)
- **`parseHistoryFile(filePath)`** — Dispatches on extension:
  - CSV: strips BOM, extracts first header field + filename-derived candidate
  - XMind: uses JSZip to read content.json (fallback content.xml), extracts root topic title + filename candidate
- **`inferModuleKeyFromFilename(filename)`** — Strips date prefix, version suffix, and extension to produce clean module key

### CLI Interface
- `node init-wizard.mjs --command scan [--root-dir <path>]` — outputs JSON scan result
- `node init-wizard.mjs --command parse-file --path <file>` — outputs JSON parse result

### Read-Only Guarantee (D-03)
The script imports only read operations from node:fs (`readdirSync`, `statSync`, `existsSync`, `readFileSync`). Zero calls to `writeFileSync` or `mkdirSync`.

## Test Coverage

32 assertions across 9 test groups, all passing:

| Group | Coverage | Key Assertions |
|-------|----------|----------------|
| inferModuleKeyFromFilename | 5 edge cases | Date prefix, version suffix, underscore separator, extension stripping |
| scanProject — module inference | 5 assertions | Module key from xmind/, versioned=false, inferredFrom, hasCasesDir |
| scanProject — versioned (INIT-03) | 2 assertions | v6.4.10/ subdir → versioned=true |
| scanProject — empty directory | 7 assertions | All signals false/empty/null on empty dir |
| scanProject — signal detection | 4 assertions | .repos, images, history CSV detection |
| scanProject — read-only (D-03) | 1 assertion | Directory snapshot before/after identical |
| parseHistoryFile — CSV | 4 assertions | BOM handling, header + filename candidates |
| parseHistoryFile — XMind (INIT-02) | 3 assertions | Root topic title, filename candidate, source=xmind |
| scanProject — PRD versions | 1 assertion | v1.2.3 extracted from requirements dir |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `16ef7e2` | feat(03-01): create init-wizard.mjs with scan + parse-file sub-commands |
| 2 | `19fe4fc` | test(03-01): add unit tests for init-wizard scan + parse behaviors |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all functions are fully implemented with real logic, no placeholders.

## Requirements Addressed

- **INIT-01**: Automatic project structure inference → `scanProject()` with 5-signal scanning
- **INIT-02**: CSV/XMind history file parsing → `parseHistoryFile()` with BOM handling and JSZip
- **INIT-03**: Multi-version detection → versioned subdirectory detection (`/^v\d+/` pattern)

## Self-Check: PASSED
