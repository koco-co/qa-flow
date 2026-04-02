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

### 来源可验证性说明

- 下列 Anthropic / Claude Code 相关直链已于 **2026-04-02** 通过 `web_fetch` 验证可访问；后文统一以来源编号引用，避免重复堆叠 URL。
- 若后续复查时某条直链不可访问，必须将对应条目改写为“基于 `web_search` 检索摘要”，并补充检索主题与日期；不得保留未核实但看似权威的失效链接。

| 编号 | 来源 | URL | 可验证性 |
| --- | --- | --- | --- |
| S1 | Anthropic《Using CLAUDE.md files》 | <https://claude.com/blog/using-claude-md-files> | 2026-04-02 `web_fetch` 可访问 |
| S2 | Anthropic《Creating custom skills》 | <https://claude.com/docs/skills/how-to> | 2026-04-02 `web_fetch` 可访问 |
| S3 | Anthropic《Skills overview》 | <https://claude.com/docs/skills/overview> | 2026-04-02 `web_fetch` 可访问 |
| S4 | Anthropic《Create custom subagents》 | <https://code.claude.com/docs/en/sub-agents> | 2026-04-02 `web_fetch` 可访问 |

### B1. `CLAUDE.md` 应只承载项目级、长期稳定、难以从代码直接推断的上下文

- **基线**：`CLAUDE.md` 的核心作用是给 Claude 持久化项目上下文，包括架构概览、关键目录、常用命令、编码约定、非显然警示与团队工作流；应保持简洁、易扫读、可长期维护。
- **可映射审查点**：是否塞入过多易变状态、重复说明、实现细节或脚本级步骤，导致主入口过长、失焦、难维护。
- **主要来源**：
  - S1

### B2. 主入口应描述“默认工作流契约”，而不是把所有执行细节都堆到一个文件里

- **基线**：官方建议在 `CLAUDE.md` 中定义标准工作流，回答“是否先调查、是否先规划、缺什么信息、如何验证有效性”等问题；高层契约应清晰，但不应演变为冗长执行手册。
- **可映射审查点**：是否把入口手册、步骤细则、例外分支、技能内部流程全部压到主入口，导致边界混叠。
- **主要来源**：
  - S1

### B3. Skill 应聚焦单一、可复用、可触发的工作流，避免“大而全”技能

- **基线**：Skill 应解决一个明确、可重复触发的任务；描述要能说明“什么时候用它”；多个小而聚焦的 skills 比一个包打天下的 skill 更易组合、更易维护。
- **可映射审查点**：skill 是否职责过宽、边界不清、触发词覆盖过散，或者多个 skill 之间存在高重叠。
- **主要来源**：
  - S2
  - S3

### B4. `SKILL.md` 应只保留高层契约；细节、资源、脚本应分层下沉

- **基线**：Skill 目录至少包含 `SKILL.md`，复杂 skill 再按需拆分 `references/`、`scripts/`、`assets/`；`SKILL.md` 应保留 frontmatter、触发描述、主流程与必要示例，详细资料应移到独立文件，避免单文件过长。
- **可映射审查点**：是否把路径、状态结构、长篇规范、脚本细节重复写在 `SKILL.md` 与其它文档中，导致多点维护和漂移。
- **主要来源**：
  - S2
  - S3

### B5. Skill 的触发描述、引用文件与使用边界应可验证、可测试

- **基线**：官方建议在创建 skill 时校验描述是否准确、引用文件是否存在、示例是否能触发正确加载，并通过逐步测试迭代 skill 说明。
- **可映射审查点**：技能说明是否和真实输出契约脱节、引用文件是否残缺、路由描述是否与仓库入口文案不一致。
- **主要来源**：
  - S2

### B6. 子代理应有明确角色、隔离上下文，并按职责限制工具与权限

- **基线**：子代理（Subagent）的价值在于上下文隔离、角色专精、成本控制与权限收束；描述必须清楚说明“何时委派给它”，并尽量为不同阶段或不同类型任务提供专门 agent，而不是一个笼统的万能代理。
- **可映射审查点**：多 agent 设计是否职责不清、提示词同质化、工具暴露过宽、不同阶段没有真正隔离。
- **主要来源**：
  - S4
  - S1

### B7. 子代理提示必须携带完整任务上下文、输出要求与成功标准，不能假设其自动继承父级上下文

- **基线**：官方文档明确说明 subagent 在独立上下文窗口中运行，拥有自己的 system prompt、工具与权限；它不会天然继承父会话的全部上下文与 skills，因此委派提示需要足够完整。
- **可映射审查点**：writer / reviewer / analyzer 一类子代理提示是否依赖隐式前提、默认共享状态或未明说的输出格式。
- **主要来源**：
  - S4

### B8. 关键约束优先靠可执行机制或单一权威收口，而不是分散在多份提示词里的自然语言提醒

- **基线**：Claude Code 已提供工具限制、权限模式、hooks、settings、skills 分层等机制；对关键路径、权限、路由和安全约束，应优先检查是否有可执行或单一权威的收口方式，而不是只靠重复文案“提醒不要这样做”。
- **可映射审查点**：路径规则、source-of-truth、只读约束、技能路由是否长期依赖多份文档口头约束，缺少配置化或集中声明。
- **主要来源**：
  - S4
  - S1
  - 外部调研：`Claude Code subagents prompt organization anti patterns`（本任务 web_search 检索结果汇总）

## 当前问题清单（P0 / P1 / P2）

> Task 1 不预写具体仓库结论。后续任务只在完成证据采集后，按以下分区追加问题。

### P0（阻断 / 误导 agent）

- 暂无预置条目。

### P1（漂移 / 双权威 / 高维护成本）

## P1-readme-second-contract：README 仍在承担第二套高层工作流 contract

- 问题：`README.md` 第 5 行声明自己“仅作入口导览”，但后文仍保留“用户视角极简流程”“架构概览”“测试用例生成详细流程”“代码分析报告流程”“快捷验收入口”“详细规范入口”等整套高层流程与验收 contract，实际已变成第二份主入口手册。
- 原因：当前仓库已明确由 `CLAUDE.md` 承担“权威工作流手册”，并由 `.claude/config.json` 承担路径 source of truth；`README.md` 继续手写 step 级流程、输出物和验收话术，会把“导览”与“权威 contract”边界重新混在一起。
- 影响：维护者后续只要调整高层步骤、验收回合或输出路径，就必须同步修改 `README.md`、`CLAUDE.md` 和下游 Skill；一旦 README 未同步，用户和 agent 会优先看到一套更具体但更容易过时的入口说明。
- 建议：把 `README.md` 收敛为 landing page，只保留仓库用途、最小快速开始、`/using-qa-flow` 入口和“先读哪里”；step 级流程图、验收回合和详细 route 统一回收到 `CLAUDE.md` / 对应 Skill / rules。
- 涉及文件：`README.md`、`CLAUDE.md`、`.claude/config.json`

## P1-readme-stale-entry-routes：README 的具体入口路径与验收出口已脱离当前权威 contract

- 问题：`README.md` 仍把测试用例工作目录写成 `cases/requirements/`，并把 `latest-prd-enhanced.md`、`latest-output.xmind`、`latest-bug-report.html`、`latest-conflict-report.html` 作为根目录快捷入口，还列出了 `CLAUDE.md#测试用例编写规范` 等当前不存在的章节锚点；但 `CLAUDE.md` / `.claude/config.json` 已切到 `cases/prds/`、`cases/issues/` 等目录口径，相关测试也已明确主流程不再依赖这些根目录快捷链接。
- 原因：README 手工复制了路径、输出物和文档导航，而这些信息的真实权威已经分散到 `CLAUDE.md`、`.claude/config.json` 与现有测试 contract；只要 README 不跟随单一权威收口，就会继续出现死链接、旧目录名和已废弃出口。
- 影响：首次进入仓库的用户/agent 可能把 PRD 放到错误目录、去仓库根目录寻找已退役的 `latest-*` 文件，或者沿 README 的锚点跳转到不存在的 CLAUDE 章节，直接削弱主入口可信度。
- 建议：README 不再枚举会漂移的目录树和输出快捷链接；目录入口应直接引用 `CLAUDE.md` 中的工作区结构 / 规范索引，路径名以 `.claude/config.json` 为准；“详细规范入口”改成真实存在的 rules / shared schema 链接，移除失效的 CLAUDE 章节锚点。
- 涉及文件：`README.md`、`CLAUDE.md`、`.claude/config.json`、`.claude/tests/test-workflow-doc-validator.mjs`、`.claude/tests/test-output-convention-migration.mjs`

### P2（文案 / 可读性 / 向导体验）

- 暂无新增条目；本轨低确定性口径差异见“待用户确认项”。

### 统一问题模板

- **统一标题格式**：`## P{级别}-{标识}：问题标题`
- **适用范围**：P0 / P1 / P2 全部问题条目统一使用该格式，不再按单一级别单独举例。
- **级别取值**：`{级别}` 仅允许 `0`、`1`、`2`。
- **标识规则**：`{标识}` 使用可检索、可复用的小写英文短横线标识，例如 `claude-entry-overlong`、`skill-boundary-drift`。

```md
## P{级别}-{标识}：问题标题

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

- **历史条目来源**：已提交版 `docs/qa-flow-workflow-audit-and-optimization.md` 的 `P2-1：README / 目录规则文档仍残留 .claude/scripts 旧树结构`。
  - **当前证据**：当前 `README.md` 目录树已经改为 `.claude/shared/scripts/`；`node .claude/tests/test-workflow-doc-validator.mjs` 中 “repo-facing 文档目录树不得残留旧的 .claude/scripts/ 描述” 已通过。
  - **排除原因**：旧的 `.claude/scripts/` 入口误导已闭环，本轮不应再按历史问题原样回报。
  - **备注**：已闭环；但 README 仍存在其他路径漂移，说明“目录树是否写进 README”本身仍需谨慎治理。

- **历史条目来源**：已提交版 `docs/qa-flow-workflow-audit-and-optimization.md` 中 “旧 P1-3 / 旧 P1-7 / 旧 P2-4 已修复（CLAUDE.md 与 config.json 已对齐当前实现）”。
  - **当前证据**：当前 `CLAUDE.md` 的工作区结构与 `.claude/config.json` 仍保持一致：`cases/prds`、`cases/issues`、`reports/bugs`、`reports/conflicts`、`assets/images` 均可在两处对应；`node .claude/tests/test-workflow-doc-validator.mjs` 也已通过 “CLAUDE.md 不再记录快捷链接 latest-output.xmind” 等入口 contract 校验。
  - **排除原因**：当前主入口轨的主要问题不在 `CLAUDE.md` / `config.json` 双权威，而在 README 重新扩写并产生新的漂移。
  - **备注**：已闭环但需观察；若未来继续在 README 或 Skill 重复手写路径 contract，仍可能再次出现“主入口已对齐、导览文档又漂移”的回归。

## 待用户确认项

- 本节只记录“需要维护者拍板的取舍项”，不记录纯事实性问题。
- 典型类型包括：
  - 主入口与技能文档之间的职责边界是否需要重新切分
  - 哪个文件应成为某类路径 / 规则 / 路由的单一权威
  - 兼容旧触发词、旧路径、旧话术的保留策略
- Task 1 暂不预写具体确认项；后续仅在出现真实分歧时追加。

- **测试用例公开示例口径是否统一到单一 canonical 写法**：`CLAUDE.md` / `README.md` 当前以 `为 Story-20260322 生成测试用例`、`继续 Story-20260322` 为主示例，但 `.claude/skills/using-qa-flow/SKILL.md` 仍以 `为 ${module_key} v${version} 生成测试用例`、`继续 ${module_key} v${version}` 为菜单示例，且 `README.md` 额外声明自然语言“快速生成测试用例”也等价于 `--quick`。若三套写法都要保留，建议维护者明确哪一套是对外 canonical 入口，哪一套只是兼容示例；否则后续 README / CLAUDE / menu 仍会持续分叉。
