---
phase: 04-core-skills-redesign
plan: "05"
subsystem: skills
tags:
  - using-qa-flow
  - claude-md
  - menu-sync
  - generalization
  - frontend-errors
dependency_graph:
  requires:
    - 04-01
    - 04-02
    - 04-03
    - 04-04
  provides:
    - generalized-entry-menu
    - synchronized-skill-index
  affects:
    - using-qa-flow
    - CLAUDE.md
    - onboarding
tech_stack:
  added: []
  patterns:
    - generic entrypoint examples with ${module_key}/${version} placeholders
    - legacy DTStack hints preserved only inside HTML comments
    - skill descriptions synchronized from SKILL metadata to handbook
key_files:
  modified:
    - .claude/skills/using-qa-flow/SKILL.md
    - CLAUDE.md
decisions:
  - "using-qa-flow Function 3 明确标注支持前端/后端/冲突分析，与 code-analysis-report Mode C 保持一致"
  - "旧 DTStack 示例仅在 using-qa-flow 中以 HTML 注释保留，用户可见正文全部切换为通用示例"
metrics:
  duration_minutes: 5
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 2
requirements: [SKIL-06]
---

# Phase 04 Plan 05: Sync using-qa-flow menu + CLAUDE handbook Summary

**using-qa-flow 菜单、快速示例和 CLAUDE.md Skill 索引现已与 Phase 4 的通用化结果保持一致，并明确反映前端报错分析能力。**

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Generalize using-qa-flow menu and routing examples | n/a（dirty worktree，未单独提交） | .claude/skills/using-qa-flow/SKILL.md |
| 2 | Synchronize handbook skill index wording | n/a（dirty worktree，未单独提交） | CLAUDE.md |

## What Was Built

### Task 1: Updated using-qa-flow as the generic entry point

- 功能菜单第 3 项现明确写为“支持前端/后端/冲突分析”
- 功能 1、2、4、5 的路由示例全部改为 `${module_key}` / `${version}` 占位符和 `orders v2.0` 等通用示例
- 初始化完成提示与快速示例不再直接暴露 DTStack 模块名
- 为兼容旧用户，保留两条 DTStack 示例为 HTML comments，不出现在正文展示或 grep 非注释扫描中

### Task 2: Synchronized CLAUDE.md skill index

- `CLAUDE.md` 中 `code-analysis-report` 描述更新为“报错日志 → HTML 分析报告（支持前端/后端/冲突分析）”
- Skill 索引与入口菜单的功能口径保持一致，避免新用户从菜单和手册读到不同描述

## Deviations from Plan

None — plan executed as intended. DTStack 示例仅按研究结论保留在 HTML 注释中，未进入用户可见正文。

## Verification Results

- `grep -v '<!--' .claude/skills/using-qa-flow/SKILL.md | rg 'data-assets v[0-9]|DTStack|信永中和|数据质量|离线开发|质量问题台账'` → 无匹配
- `.claude/skills/using-qa-flow/SKILL.md` 包含 `前端/后端/冲突分析`
- `.claude/skills/using-qa-flow/SKILL.md` 包含 `${module_key}`
- `CLAUDE.md` 中 `code-analysis-report` 行包含 `前端/后端/冲突分析`

## Issues Encountered

- 需要同时满足“正文去 DTStack 化”和“研究要求允许保留旧示例”的双重约束，因此采用 HTML comments 保留兼容提示

## Next Phase Readiness

- Phase 4 的入口菜单、主编排 Skill 与手册索引已完成同步
- 可进入 phase-level verification；若验证通过，可推进 Phase 5（IM Notification Integration）

## Self-Check: PASSED
