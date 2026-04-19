# 重构文档归档（Phase 0-8）

## 归档说明

qa-flow 项目 Phase 0-8 重构（**2026-04-17 ~ 2026-04-19**）已全部完成。本次重构涉及知识架构、skill 重组、create-project、setup 精简、PRD 讨论、md-case 策略矩阵、ui-autotest 演进、phase1 完整性补齐、跨切面基础设施、命名/README/图表统一、phase8 工作流拆分等多个主题。

为保留审计与溯源价值，原 `docs/refactor/specs/` 与 `docs/refactor/plans/` 下的全部 spec / plan 文档统一移入本归档目录：

- `archive/specs/` —— 设计稿（design specs）
- `archive/plans/` —— 实施计划（implementation plans）

顶层索引 `docs/refactor/refactor-roadmap.md` 仍保留在 `docs/refactor/` 原位，作为查询入口。

## 文件清单

### `archive/specs/`（12 份）

- `2026-04-17-knowledge-architecture-design.md`
- `2026-04-17-knowledge-keeper-design.md`
- `2026-04-18-create-project-skill-design.md`
- `2026-04-18-md-case-strategy-matrix-design.md`
- `2026-04-18-prd-discussion-design.md`
- `2026-04-18-setup-slim-design.md`
- `2026-04-18-skill-reorganization-design.md`
- `2026-04-18-ui-autotest-evolution-design.md`
- `2026-04-19-cross-cutting-infrastructure-design.md`
- `2026-04-19-naming-readme-diagrams-design.md`
- `2026-04-19-phase1-completeness-audit-design.md`
- `2026-04-19-phase8-workflow-split-design.md`

### `archive/plans/`（9 份）

- `2026-04-17-knowledge-keeper-implementation.md`
- `2026-04-17-phase0-implementation.md`
- `2026-04-18-create-project-implementation.md`
- `2026-04-18-md-case-strategy-matrix-implementation.md`
- `2026-04-18-prd-discussion-implementation.md`
- `2026-04-18-setup-slim-implementation.md`
- `2026-04-18-ui-autotest-evolution-implementation.md`
- `2026-04-19-phase7-audit.md`
- `2026-04-19-phase7-implementation.md`

## 检索指引

如需查阅某个 phase 的原始设计意图：

1. 先看 `docs/refactor/refactor-roadmap.md` 找到对应 phase / 主题
2. 在本目录 `archive/specs/` 或 `archive/plans/` 下按文件名 `grep` 关键词
3. 文件命名约定：`YYYY-MM-DD-<topic>-{design,implementation,audit}.md`

示例：

```bash
# 查 ui-autotest 演进设计
ls docs/refactor/archive/specs/ | grep ui-autotest

# 全文搜索 phase8 决策记录
grep -r "phase8" docs/refactor/archive/
```

## 重要警告

> **这些文档反映重构期（2026-04-17 ~ 2026-04-19）的设计与决策快照，当前代码状态可能已演进。**

请勿将本目录下的任何 spec / plan 作为"当前事实"引用：

- 配置项、字段名、目录结构以**当前代码 + `CLAUDE.md` + `rules/`** 为准
- 业务知识以 `workspace/{project}/knowledge/` 为准
- AI 协作偏好以 `~/.claude/projects/.../memory/` 为准

如发现归档文档与当前实现冲突，**以当前实现为准**，并视情况更新 `refactor-roadmap.md` 或新增后续 spec。
