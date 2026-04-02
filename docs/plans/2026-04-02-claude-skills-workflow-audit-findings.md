---
title: "CLAUDE.md + Skills 工作流审查发现清单"
status: "in_progress"
owner: "Copilot"
date: "2026-04-02"
---

# CLAUDE.md + Skills 工作流审查发现清单

> 本文件是本轮审查的唯一问题清单追加入口。Task 1 只建立外部基线、分级口径与记录模板，不提前写入当前仓库结论。

## 审查范围

- **审查目标**：基于 Claude Code / `CLAUDE.md` / Skills / 子代理生态最佳实践，对 qa-flow 仓库的工作流治理做全仓审查。
- **审查对象**：`CLAUDE.md`、`README.md`、`.claude/config.json`、`.claude/rules/`、`.claude/shared/`、`.claude/skills/`、必要测试入口与历史审计材料。
- **审查轨道**：
  1. 生态基线轨
  2. 主入口轨
  3. Skill 契约轨
  4. 配置与路径轨
  5. 体验与文案轨
- **分级模型**：
  - **P0**：直接误导 agent 或阻断主流程
  - **P1**：不会立刻失败，但持续制造漂移、重复维护或高误用率
  - **P2**：偏文案、可读性、向导体验、模板润色、结构优化
- **非目标**：本轮不直接改造现有工作流代码，不扩展到通用 Agent 框架横评。
- **记录原则**：后续只追加“当前仍成立、证据充分、可定位到文件、可提出最小改法”的问题；未完成证据闭环的观察项不进入问题清单。

## 外部基线摘要

> 以下条目是后续审查的判尺，不等同于“当前仓库已存在问题”。只有当仓库证据与外部基线形成明确偏差时，才转入后文的 P0 / P1 / P2 清单。

### B1. `CLAUDE.md` 应只承载项目级、长期稳定、难以从代码直接推断的上下文

- **基线**：`CLAUDE.md` 的核心作用是给 Claude 持久化项目上下文，包括架构概览、关键目录、常用命令、编码约定、非显然警示与团队工作流；应保持简洁、易扫读、可长期维护。
- **可映射审查点**：是否塞入过多易变状态、重复说明、实现细节或脚本级步骤，导致主入口过长、失焦、难维护。
- **主要来源**：
  - Anthropic《Using CLAUDE.md files》：<https://claude.com/blog/using-claude-md-files>

### B2. 主入口应描述“默认工作流契约”，而不是把所有执行细节都堆到一个文件里

- **基线**：官方建议在 `CLAUDE.md` 中定义标准工作流，回答“是否先调查、是否先规划、缺什么信息、如何验证有效性”等问题；高层契约应清晰，但不应演变为冗长执行手册。
- **可映射审查点**：是否把入口手册、步骤细则、例外分支、技能内部流程全部压到主入口，导致边界混叠。
- **主要来源**：
  - Anthropic《Using CLAUDE.md files》：<https://claude.com/blog/using-claude-md-files>

### B3. Skill 应聚焦单一、可复用、可触发的工作流，避免“大而全”技能

- **基线**：Skill 应解决一个明确、可重复触发的任务；描述要能说明“什么时候用它”；多个小而聚焦的 skills 比一个包打天下的 skill 更易组合、更易维护。
- **可映射审查点**：skill 是否职责过宽、边界不清、触发词覆盖过散，或者多个 skill 之间存在高重叠。
- **主要来源**：
  - Anthropic《Creating custom skills》：<https://claude.com/docs/skills/how-to>
  - Anthropic《Skills overview》：<https://claude.com/docs/skills/overview>

### B4. `SKILL.md` 应只保留高层契约；细节、资源、脚本应分层下沉

- **基线**：Skill 目录至少包含 `SKILL.md`，复杂 skill 再按需拆分 `references/`、`scripts/`、`assets/`；`SKILL.md` 应保留 frontmatter、触发描述、主流程与必要示例，详细资料应移到独立文件，避免单文件过长。
- **可映射审查点**：是否把路径、状态结构、长篇规范、脚本细节重复写在 `SKILL.md` 与其它文档中，导致多点维护和漂移。
- **主要来源**：
  - Anthropic《Creating custom skills》：<https://claude.com/docs/skills/how-to>
  - Anthropic《Skills overview》：<https://claude.com/docs/skills/overview>

### B5. Skill 的触发描述、引用文件与使用边界应可验证、可测试

- **基线**：官方建议在创建 skill 时校验描述是否准确、引用文件是否存在、示例是否能触发正确加载，并通过逐步测试迭代 skill 说明。
- **可映射审查点**：技能说明是否和真实输出契约脱节、引用文件是否残缺、路由描述是否与仓库入口文案不一致。
- **主要来源**：
  - Anthropic《Creating custom skills》：<https://claude.com/docs/skills/how-to>

### B6. 子代理应有明确角色、隔离上下文，并按职责限制工具与权限

- **基线**：子代理（Subagent）的价值在于上下文隔离、角色专精、成本控制与权限收束；描述必须清楚说明“何时委派给它”，并尽量为不同阶段或不同类型任务提供专门 agent，而不是一个笼统的万能代理。
- **可映射审查点**：多 agent 设计是否职责不清、提示词同质化、工具暴露过宽、不同阶段没有真正隔离。
- **主要来源**：
  - Anthropic《Create custom subagents》：<https://code.claude.com/docs/en/sub-agents>
  - Anthropic《Using CLAUDE.md files》：<https://claude.com/blog/using-claude-md-files>

### B7. 子代理提示必须携带完整任务上下文、输出要求与成功标准，不能假设其自动继承父级上下文

- **基线**：官方文档明确说明 subagent 在独立上下文窗口中运行，拥有自己的 system prompt、工具与权限；它不会天然继承父会话的全部上下文与 skills，因此委派提示需要足够完整。
- **可映射审查点**：writer / reviewer / analyzer 一类子代理提示是否依赖隐式前提、默认共享状态或未明说的输出格式。
- **主要来源**：
  - Anthropic《Create custom subagents》：<https://code.claude.com/docs/en/sub-agents>

### B8. 关键约束优先靠可执行机制或单一权威收口，而不是分散在多份提示词里的自然语言提醒

- **基线**：Claude Code 已提供工具限制、权限模式、hooks、settings、skills 分层等机制；对关键路径、权限、路由和安全约束，应优先检查是否有可执行或单一权威的收口方式，而不是只靠重复文案“提醒不要这样做”。
- **可映射审查点**：路径规则、source-of-truth、只读约束、技能路由是否长期依赖多份文档口头约束，缺少配置化或集中声明。
- **主要来源**：
  - Anthropic《Create custom subagents》：<https://code.claude.com/docs/en/sub-agents>
  - Anthropic《Using CLAUDE.md files》：<https://claude.com/blog/using-claude-md-files>
  - 外部调研：`Claude Code subagents prompt organization anti patterns`（本任务 web_search 检索结果汇总）

## 当前问题清单（P0 / P1 / P2）

> Task 1 不预写具体仓库结论。后续任务只在完成证据采集后，按以下分区追加问题。

### P0（阻断 / 误导 agent）

- 暂无预置条目。

### P1（漂移 / 双权威 / 高维护成本）

- 暂无预置条目。

### P2（文案 / 可读性 / 向导体验）

- 暂无预置条目。

### 统一问题模板

```md
## P1-示例：问题标题

- 问题：一句话描述问题
- 原因：为什么它违反了基线或当前契约
- 影响：会误导谁、增加什么成本、可能造成什么偏差
- 建议：最小可行改法
- 涉及文件：`path/a`、`path/b`
```

## 已闭环项排除说明

- 本节用于记录“历史曾出现、但当前已不应重复上报”的条目。
- Task 1 只建立排除口径，不提前判定任何问题已闭环。
- 后续每次排除时，至少补充以下信息：
  - **历史条目来源**：来自哪份历史审计或哪次整改
  - **当前证据**：当前文件、脚本、测试或提交证据
  - **排除原因**：为什么不再列为当前问题
  - **备注**：如仍有残余风险，需写清“已闭环但需观察”

## 待用户确认项

- 本节只记录“需要维护者拍板的取舍项”，不记录纯事实性问题。
- 典型类型包括：
  - 主入口与技能文档之间的职责边界是否需要重新切分
  - 哪个文件应成为某类路径 / 规则 / 路由的单一权威
  - 兼容旧触发词、旧路径、旧话术的保留策略
- Task 1 暂不预写具体确认项；后续仅在出现真实分歧时追加。
