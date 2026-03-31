---
phase: 01-generalization-refactor
plan: 03
subsystem: documentation
tags: [rules, generalization, placeholder-templates, conditional-guards]

# Dependency graph
requires: []
provides:
  - ".claude/rules/test-case-writing.md generalized: DTStack section replaced by conditional guard with config.repos check and ${datasource_type} placeholder"
  - ".claude/rules/repo-safety.md generalized: Java package table removed, replaced with config.stackTrace pointer"
  - ".claude/rules/archive-format.md generalized: DTStack special rules replaced by trackerId conditional block, template examples use ${placeholder} vars"
  - ".claude/rules/directory-naming.md generalized: module key table replaced with ${module_key} template, branchMapping reference updated"
  - ".claude/rules/xmind-output.md generalized: DTStack sample-driven rules replaced by trackerId conditional block"
affects: [GEN-04, CLAUDE.md-generalization, future-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional prose guard pattern: section header '（当 config.X 非空时启用）' + blockquote guard sentence"
    - "Variable template placeholder pattern: ${module_key}, ${datasource_type}, ${schema}, ${table}, ${version}"

key-files:
  created: []
  modified:
    - .claude/rules/test-case-writing.md
    - .claude/rules/repo-safety.md
    - .claude/rules/archive-format.md
    - .claude/rules/directory-naming.md
    - .claude/rules/xmind-output.md

key-decisions:
  - "Doris/Hive/SparkThrift SQL examples collapsed into single ${datasource_type} template block (one generic example instead of three vendor-specific blocks)"
  - "Java package→repo hardcoded table deleted entirely; replaced with prose pointing to config.stackTrace field"
  - "Module key table replaced with single-row template using ${module_key}/${module_zh} placeholders; note added that actual list lives in config.json"
  - "DTStack section naming convention: prefix 'DTStack' dropped, replaced with prose conditional guard using trackerId/config.repos presence checks"

patterns-established:
  - "Conditional block pattern: '## 标题（当 config.X 非空时启用）' + '> 以下规则仅在 ... 时适用。若 ... 则跳过本节。'"
  - "Variable template pattern: use ${placeholder} in all examples instead of concrete business values"

requirements-completed:
  - GEN-03

# Metrics
duration: 20min
completed: 2026-03-31
---

# Phase 1 Plan 03: Rules Generalization Summary

**All 5 .claude/rules/*.md files generalized with ${placeholder} templates and conditional prose guards, zero DTStack/Doris/Hive/SparkThrift hardcoded terms, 25 smoke tests pass GREEN**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-31T10:43:18Z
- **Completed:** 2026-03-31T11:03:00Z
- **Tasks:** 1
- **Files modified:** 5

## Accomplishments

- Removed all 36 hardcoded DTStack references across 5 rules files (7+10+8+7+4)
- Replaced Doris/Hive/SparkThrift concrete SQL examples with single `${datasource_type}` template block
- Deleted Java package→repo hardcoded mapping table in repo-safety.md; replaced with pointer to `config.stackTrace`
- Replaced module key table with generic `${module_key}` template row; actual list delegates to config.json
- Updated all `zentaoId` → `trackerId` and `repoBranchMapping` → `branchMapping` references
- All 25 assertions in `.planning/tests/rules-generalization.test.mjs` pass GREEN

## Task Commits

1. **Task 1: Generalize all .claude/rules/*.md files** - `13418e8` (refactor)

**Plan metadata:** (pending final commit)

## Files Created/Modified

- `.claude/rules/test-case-writing.md` — "DTStack 追加规则" section replaced by "源码优先规则（当 config.repos 非空时启用）" with blockquote guard; Doris/Hive/SparkThrift blocks replaced with single `${datasource_type}` template; "DTStack 表单类步骤" → "表单类步骤"
- `.claude/rules/repo-safety.md` — "DTStack 用例生成的额外要求" renamed to conditional section; Java package table removed; `config.stackTrace` pointer added; `repoBranchMapping` → `branchMapping`
- `.claude/rules/archive-format.md` — Template front-matter examples use `${placeholder}` vars; "DTStack 特殊规则" → "版本目录归档规则（当模块配置了 trackerId 时适用）"; conversion mapping table simplified to generic `${module}` template rows; audit command examples use `${module}/${version}`
- `.claude/rules/directory-naming.md` — Module key table replaced with `${module_key}/${module_zh}` template row; DTStack/xyzh-specific bullets generalized; "DTStack 模块" section → "版本化模块（当模块配置了 trackerId 时适用）"; "定制模块（xyzh）" → "扁平模块（无版本子目录）"; 结构例外 section de-coupled from specific module names
- `.claude/rules/xmind-output.md` — Output path table replaced with `${module_key}` template; "特殊分类目录" table replaced with generic prose; "DTStack 样例驱动规则" → "样例驱动规则（当模块配置了 trackerId 时启用）"; `zentaoId` → `trackerId`

## Decisions Made

- Collapsed Doris/Hive/SparkThrift three-block SQL example into a single generic block with `${datasource_type}` — reduces visual noise and follows "one generic example" principle from RESEARCH.md
- Deleted the Java package table entirely rather than converting to conditional block — the table is purely DTStack-specific and the correct replacement is a config pointer, not a generalized table
- Kept xyzh `custom/` path alias intact in the template note (the path convention is a structural choice that persists) — only removed the DTStack-specific "xyzh 是模块 key" explanatory bullets

## Deviations from Plan

None — plan executed exactly as written. All 7 acceptance criteria from the plan passed on first verification run.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GEN-03 complete: all rules files are now project-agnostic
- Ready for GEN-04 (prompts/steps generalization) — skill prompts in `.claude/skills/test-case-generator/prompts/` still reference DTStack-specific steps (source-sync, prd-formalize, Writer template)
- `.planning/tests/rules-generalization.test.mjs` passes GREEN and will serve as regression guard

---
*Phase: 01-generalization-refactor*
*Completed: 2026-03-31*
