---
phase: 04-core-skills-redesign
plan: "04"
subsystem: skills
tags:
  - test-case-generator
  - prompt-generalization
  - config-driven
  - e-commerce
  - routing
dependency_graph:
  requires:
    - 04-01
    - 04-02
    - 04-03
  provides:
    - generalized-test-case-generator-prompts
    - config-driven-parse-input-guidance
    - aligned-test-case-writing-examples
  affects:
    - using-qa-flow
    - writer-subagent
    - reviewer-subagent
tech_stack:
  added: []
  patterns:
    - e-commerce example normalization across skill prompts
    - resolveModulePath-style path guidance in orchestration docs
    - shared rule mirror kept consistent with global rule file
key_files:
  modified:
    - .claude/skills/test-case-generator/SKILL.md
    - .claude/skills/test-case-generator/prompts/step-parse-input.md
    - .claude/skills/test-case-generator/prompts/step-source-sync.md
    - .claude/skills/test-case-generator/prompts/step-req-elicit.md
    - .claude/skills/test-case-generator/prompts/writer-subagent.md
    - .claude/skills/test-case-generator/references/elicitation-dimensions.md
    - .claude/skills/test-case-generator/references/intermediate-format.md
    - .claude/skills/test-case-generator/rules/test-case-writing.md
    - .claude/rules/test-case-writing.md
decisions:
  - "parse-input 模块确认与保存路径示例改为 config.modules + resolveModulePath 风格，不再区分 DTStack/XYZH 分支"
  - "test-case-generator 的用户可见示例统一到电商场景（商品管理/订单中心/用户中心）"
  - "skill 内镜像规则与全局 test-case-writing 规则同步更新，避免示例再次漂移"
metrics:
  duration_minutes: 12
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 9
requirements: [SKIL-01]
---

# Phase 04 Plan 04: Generalize test-case-generator prompts + routing guidance Summary

**test-case-generator 现已使用通用电商示例、config 驱动路径说明与泛化状态文件示例，不再暴露 DTStack/XYZH 专属口径。**

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Generalize Writer / parse-input / routing examples | n/a（dirty worktree，未单独提交） | writer-subagent.md, step-parse-input.md, step-source-sync.md, step-req-elicit.md, SKILL.md |
| 2 | Align test-case references and rule docs with generic examples | n/a（dirty worktree，未单独提交） | elicitation-dimensions.md, intermediate-format.md, skill-local/global test-case-writing.md |

## What Was Built

### Task 1: Generalized orchestration prompts and routing hints

- `writer-subagent.md` 中剩余的业务示例统一为电商场景，数据准备说明改为通用“数据接入 / 批量同步 / 调度”表述
- `step-parse-input.md` 的蓝湖页面示例、模块确认菜单、保存路径说明、工作目录示例和状态文件示例全部改为通用模块与版本占位符
- `step-source-sync.md` 的仓库同步示例改为中性的 `orders-service` / `inventory-worker` / `commerce-web`
- `step-req-elicit.md` 的前置条件示例改为商品分类 / 仓库配置等通用前置配置
- `SKILL.md` 的 Writer reference 精简加载描述与按钮文案示例已去除 DTStack 专属词汇

### Task 2: Aligned supporting references and rule mirrors

- `elicitation-dimensions.md` 的目标版本 / 分支问题改为通用产品线与发布分支示例
- `intermediate-format.md` 的 `module_key`、状态文件和路径示例统一为 `orders/products` 风格
- `.claude/skills/test-case-generator/rules/test-case-writing.md` 与 `.claude/rules/test-case-writing.md` 的所有用例示例切换到商品管理场景
- 规则中的表单、标题、步骤、预期和结构化字段示例均与 Writer prompt 保持一致

## Deviations from Plan

### Auto-fixed Scope Extension

- **Found during:** Task 1 / Task 2 verification
- **Issue:** 按 04-04 原始文件清单修改后，`test-case-generator/` 内仍有 DTStack 痕迹残留在 `step-parse-input.md`、`intermediate-format.md` 与 skill-local rules 中，计划内 grep 验证仍会失败
- **Fix:** 将清理范围扩展到这些直接影响验收的配套文档，并同步更新全局 `.claude/rules/test-case-writing.md`，避免 skill 镜像与权威规则冲突
- **Impact:** 属于完成 SKIL-01 所需的必要补齐，无额外功能扩张

## Verification Results

- `rg 'DTStack|data-assets|xyzh|信永中和|质量问题台账|数据质量|离线开发|规则集|岚图|DAGScheduleX|dt-center|dt-insight|通用配置|数据地图|禅道' .claude/skills/test-case-generator` → 无匹配
- `writer-subagent.md` 包含 `商品名称` 与 `${datasource_type}`
- `step-source-sync.md` 与 `step-prd-formalize.md` 均包含 `last_completed_step` 跳过状态更新说明
- 计划级 acceptance checks（04-04 相关）全部通过
- 仓库级测试仍存在 pre-existing / external failures：`test-archive-history-scripts.mjs`、`test-formalized-prd-contract.mjs`，以及后续由 archive-routing 行为触发的 `test-md-xmind-regeneration.mjs`；这些失败点均不在本次修改文件内

## Issues Encountered

- 工作树存在预先未提交改动，且包含本计划会触达的目录；本次执行选择在现有改动之上谨慎叠加，不回退用户改动
- `step-parse-input.md` 修改后需要二次修正 YAML 示例缩进与案例名称，已当场修复

## Next Phase Readiness

- `test-case-generator` 主编排的用户可见口径已泛化，`using-qa-flow` 可以安全读取并展示新的触发示例
- 剩余 Phase 4 收尾工作集中在入口菜单与 CLAUDE.md 索引同步（04-05）

## Self-Check: PASSED
