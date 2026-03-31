---
phase: 04-core-skills-redesign
plan: "03"
subsystem: skills
tags:
  - prd-enhancer
  - code-analysis-report
  - generalization
  - frontend-errors
  - mode-c
dependency_graph:
  requires:
    - 04-01
    - 04-02
  provides:
    - generalized-prd-enhancer
    - frontend-error-mode-c
  affects:
    - test-case-generator
    - code-analysis-report
tech_stack:
  added: []
  patterns:
    - config.repos conditional guard pattern
    - mode-based routing for skill execution
key_files:
  modified:
    - .claude/skills/prd-enhancer/SKILL.md
    - .claude/skills/prd-enhancer/prompts/prd-formalizer.md
    - .claude/skills/code-analysis-report/SKILL.md
    - .claude/skills/code-analysis-report/references/bug-report-template.md
    - .claude/skills/code-analysis-report/references/env-vs-code-checklist.md
decisions:
  - "prd-enhancer Step 0.5 conditionalized on config.repos non-empty; no DTStack coupling remains"
  - "code-analysis-report Mode C (frontend) uses keyword matching: TypeError/ReferenceError/[Vue warn]/React/Uncaught Error/error TS/Hydration failed"
  - "Old Mode C (信息不足) renamed to Mode D to make room for frontend Mode C"
  - "Frontend HTML template reuses existing bug-report-template.md styles with frontend-specific fields"
metrics:
  duration_minutes: 8
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 5
requirements: [SKIL-02, SKIL-03]
---

# Phase 04 Plan 03: Generalize prd-enhancer + Add Frontend Error Mode C Summary

**One-liner:** Generalized prd-enhancer with config.repos conditional Step 0.5; extended code-analysis-report with Mode C frontend error analysis using keyword auto-detection and HTML report template.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Generalize prd-enhancer SKILL.md + prd-formalizer.md | 8cf3d11 | SKILL.md, prompts/prd-formalizer.md |
| 2 | Add frontend error analysis Mode C to code-analysis-report | a817cb4, d524505 | SKILL.md, bug-report-template.md, env-vs-code-checklist.md |

## What Was Built

### Task 1: Generalized prd-enhancer

- Removed `DTStack 特殊说明` paragraph from description block; replaced with generic `config.repos` conditional note
- Step 0.5 title changed from `DTStack 正式需求文档检查` to `原始平台文本检查（条件步骤）`
- Step 0.5 body rewritten to use `config.repos 非空` guard pattern — skipped entirely when config.repos is empty
- All remaining DTStack references in file naming examples and reference link descriptions replaced with generic equivalents
- `prd-formalizer.md` section header `DTStack 强规则` replaced with `源码优先规则（config.repos 非空时适用）`; first rule generalized to conditional on config.repos

### Task 2: Frontend Error Mode C in code-analysis-report

- Mode recognition table updated: old Mode C (信息不足) moved to Mode D; new Mode C (前端报错分析) inserted with keyword detection table
- Keywords: `TypeError`/`ReferenceError`/`[Vue warn]`/`React`/`Uncaught Error`/`error TS`/`Hydration failed`
- Description YAML updated: `当用户粘贴后端报错日志` → `当用户粘贴前端或后端报错日志`; `专为禅道富文本编辑器粘贴使用` → `输出精美 HTML 格式报告`
- Step 2a extended with frontend repo location logic: config.stackTrace key matching + .repos/ package.json fallback + no-repos graceful skip
- New `第四章：前端报错分析模式（模式C）完整流程` added with 4 steps: type detection, repo location, root cause analysis (4 dimensions), HTML report generation
- Frontend HTML report template added to `bug-report-template.md` reusing existing inline CSS styles
- Frontend `env-vs-code-checklist.md` section (五、前端报错判断规则) added with 8 common scenarios
- All 禅道 references removed from SKILL.md

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

All acceptance criteria passed:
- `grep -c 'DTStack' .claude/skills/prd-enhancer/SKILL.md` returns 0
- SKILL.md contains `原始平台文本检查（条件步骤）`
- SKILL.md contains `config.repos 非空` (conditional guard)
- SKILL.md does NOT contain `DTStack 特殊说明`
- SKILL.md does NOT contain `DTStack 正式需求文档检查`
- code-analysis-report SKILL.md contains `模式C：前端报错分析`
- code-analysis-report SKILL.md contains `第四章：前端报错分析模式`
- Mode detection table contains `TypeError`, `Vue warn`, `React`
- bug-report-template.md contains `前端报错分析报告`
- env-vs-code-checklist.md contains `前端报错判断规则`
- `grep -c '禅道' .claude/skills/code-analysis-report/SKILL.md` returns 0

## Self-Check: PASSED
