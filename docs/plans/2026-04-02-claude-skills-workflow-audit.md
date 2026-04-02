# CLAUDE.md + Skills Workflow Audit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 产出一份基于 Claude Code / `CLAUDE.md` / Skills 生态最佳实践的全仓工作流审查结果，列出当前仓库仍需优化的问题、优先级、建议改法与涉及文件，并交给用户确认。

**Architecture:** 先建立外部基线，再将仓库拆成入口、skills、配置路径、文案体验四条审查轨并行检查，最后和现有审计文档交叉复核，合并为一份去重后的问题清单。执行过程只新增/维护审查文档，不修改现有工作流代码或规范文件。

**Tech Stack:** Markdown、Git、`web_search` / `web_fetch`、`rg` / `glob` / `view`、GitHub Copilot CLI subagents、现有 Node.js 测试入口（`npm test`、`.claude/tests/run-all.mjs`）

---

### Task 1: 建立外部基线与审查模板

**Files:**
- Read: `docs/plans/2026-04-02-claude-skills-workflow-audit-design.md`
- Read: `CLAUDE.md`
- Create: `docs/plans/2026-04-02-claude-skills-workflow-audit-findings.md`

**Step 1: 重读已批准设计**

Read: `docs/plans/2026-04-02-claude-skills-workflow-audit-design.md`
Expected: 明确审查范围、5 条审查轨、P0/P1/P2 分级模型。

**Step 2: 搜集外部基线**

Use `web_search` with queries:
- `Claude Code CLAUDE.md skills best practices`
- `Anthropic Claude Code skills documentation structure`
- `Claude Code subagents prompt organization anti patterns`

Expected: 至少整理出 5-8 条稳定、可复用、可映射到当前仓库的最佳实践规则。

**Step 3: 创建 findings 文档骨架**

Create: `docs/plans/2026-04-02-claude-skills-workflow-audit-findings.md`

Include these sections:
- 审查范围
- 外部基线摘要
- 当前问题清单（P0 / P1 / P2）
- 已闭环项排除说明
- 待用户确认项

**Step 4: 写入统一问题模板**

Use this template in the findings file:

```md
## P1-示例：问题标题

- 问题：一句话描述问题
- 原因：为什么它违反了基线或当前 contract
- 影响：会误导谁、增加什么成本、可能造成什么偏差
- 建议：最小可行改法
- 涉及文件：`path/a`、`path/b`
```

**Step 5: Commit**

```bash
git add docs/plans/2026-04-02-claude-skills-workflow-audit-findings.md
git commit -m "docs: scaffold claude skills audit findings"
```

### Task 2: 审查仓库入口与高层路由

**Files:**
- Read: `CLAUDE.md`
- Read: `README.md`
- Read: `.claude/config.json`
- Read: `docs/qa-flow-workflow-audit-and-optimization.md`
- Modify: `docs/plans/2026-04-02-claude-skills-workflow-audit-findings.md`

**Step 1: 对齐入口定位**

Compare:
- `CLAUDE.md` 的“权威手册”定位
- `README.md` 的“入口导览”定位
- `.claude/config.json` 的 source-of-truth 字段

Expected: 列出入口、导览、配置三者之间是否一致，找出重复定义或口径漂移。

**Step 2: 审查触发词与路由文案**

Check whether the same capability is described consistently in:
- `CLAUDE.md`
- `README.md`
- `.claude/skills/using-qa-flow/SKILL.md`

Expected: 标记触发词、命令示例、快捷入口是否重复、冲突或过时。

**Step 3: 对照历史审计**

Read: `docs/qa-flow-workflow-audit-and-optimization.md`
Expected: 记录其中哪些入口类问题已闭环，哪些仍可能存在，避免重复上报旧问题。

**Step 4: 写入 findings**

Add only current, evidence-backed findings to:
`docs/plans/2026-04-02-claude-skills-workflow-audit-findings.md`

**Step 5: Commit**

```bash
git add docs/plans/2026-04-02-claude-skills-workflow-audit-findings.md
git commit -m "docs: audit workflow entry contracts"
```

### Task 3: 审查 Skills、prompts、references 的职责边界

**Files:**
- Read: `.claude/skills/*/SKILL.md`
- Read: `.claude/skills/test-case-generator/prompts/*.md`
- Read: `.claude/skills/*/references/*.md`
- Modify: `docs/plans/2026-04-02-claude-skills-workflow-audit-findings.md`

**Step 1: 建立 skill inventory**

List every skill with:
- 触发词
- 输入 / 输出契约
- 依赖的 prompt / reference / script
- 是否涉及 subagent / 多 agent

Expected: 得到一张可比对的 skill inventory。

**Step 2: 审查层次职责**

For each skill, verify whether:
- `SKILL.md` 只保留高层 contract
- `prompts/*.md` 承载步骤执行细节
- `references/*.md` 承载长说明、schema、规范

Expected: 标记职责混叠、重复维护、跨文档重复写状态结构或路径信息的地方。

**Step 3: 重点审查多 agent 设计**

Deep-read:
- `.claude/skills/test-case-generator/SKILL.md`
- `.claude/skills/test-case-generator/prompts/writer-subagent.md`
- `.claude/skills/test-case-generator/prompts/reviewer-subagent.md`
- `.claude/skills/test-case-generator/prompts/step-source-analyze.md`

Expected: 提炼当前多 agent 设计的优点、缺点、潜在扩展风险和说明不清点。

**Step 4: 写入 findings**

Group findings under:
- skill 规范
- prompt 分层
- reference 过载
- 多 agent 协同设计

**Step 5: Commit**

```bash
git add docs/plans/2026-04-02-claude-skills-workflow-audit-findings.md
git commit -m "docs: audit skill contracts and prompt layering"
```

### Task 4: 审查配置、路径引用与 source-of-truth 收口

**Files:**
- Read: `.claude/config.json`
- Read: `.claude/rules/*.md`
- Read: `.claude/shared/scripts/*.mjs`
- Read: `.claude/skills/*/rules/*.md`
- Modify: `docs/plans/2026-04-02-claude-skills-workflow-audit-findings.md`

**Step 1: 审查路径定义入口**

Verify where each of these is defined and consumed:
- cases root
- reports paths
- assets paths
- branch mapping
- runtime / integration paths

Expected: 标出“已配置化但未完全消费”“脚本 hardcode”“文档另写一份”的点。

**Step 2: 审查 rule 权威来源**

Compare global rules and skill-local rules:
- `.claude/rules/test-case-writing.md`
- `.claude/rules/archive-format.md`
- `.claude/rules/xmind-output.md`
- `.claude/skills/*/rules/*.md`

Expected: 标记哪些规则已经有镜像声明但仍缺少自动同步或 diff 守护。

**Step 3: 审查脚本与文档的路径 contract**

Check whether scripts, docs, and skill texts all point to the same paths.
Suggested commands:

```bash
rg -n "cases/(archive|prds|xmind|issues)|branchMapping|repo-branch-mapping|latest-" .
rg -n "\\.claude/scripts|requirements/|archive-cases/" .
```

Expected: 找出历史路径残留、旧名称别名、配置未完全收口的问题。

**Step 4: 写入 findings**

Group findings under:
- source-of-truth 漂移
- 路径引用问题
- rules 维护面过宽

**Step 5: Commit**

```bash
git add docs/plans/2026-04-02-claude-skills-workflow-audit-findings.md
git commit -m "docs: audit config paths and source of truth"
```

### Task 5: 审查向导、菜单、选项与文案体验

**Files:**
- Read: `.claude/skills/using-qa-flow/SKILL.md`
- Read: `.claude/skills/using-qa-flow/references/init-wizard-flow.md`
- Read: `.claude/skills/using-qa-flow/references/config-questionnaire.md`
- Read: `CLAUDE.md`
- Read: `README.md`
- Modify: `docs/plans/2026-04-02-claude-skills-workflow-audit-findings.md`

**Step 1: 审查新手入口**

Check whether a new user can infer:
- 从哪里开始
- 什么时候用 `/using-qa-flow`
- 什么时候直接说自然语言
- 什么时候需要 init

Expected: 列出高频迷惑点、说明过载点、冗余示例和可能误导的默认话术。

**Step 2: 审查向导结构**

Focus on:
- 问题顺序是否符合认知顺序
- 选项是否过多或缺少推荐项
- 同一个概念是否跨文档换叫法

Expected: 输出“向导优化 / 选项优化 / 文案润色 / 步骤顺序优化”类问题。

**Step 3: 审查 copywriting consistency**

Compare user-facing text across:
- `CLAUDE.md`
- `README.md`
- `using-qa-flow`
- 其他 skills 的顶部说明

Expected: 标记术语不一致、语气不统一、指令示例不够短或不够自然的地方。

**Step 4: 写入 findings**

Group findings under:
- 新手引导
- 选项设计
- 文案一致性
- 可读性

**Step 5: Commit**

```bash
git add docs/plans/2026-04-02-claude-skills-workflow-audit-findings.md
git commit -m "docs: audit wizard and copywriting experience"
```

### Task 6: 用现有测试与脚本验证关键 contract

**Files:**
- Read: `package.json`
- Read: `.claude/tests/package.json`
- Read: `.claude/tests/run-all.mjs`
- Read: `.claude/tests/*.mjs`
- Modify: `docs/plans/2026-04-02-claude-skills-workflow-audit-findings.md`

**Step 1: 跑仓库级测试入口**

Run:

```bash
npm test
```

Expected: 确认仓库根测试入口是否真实可用，并记录失败或通过结果。

**Step 2: 跑 tests 子目录入口**

Run:

```bash
cd .claude/tests && npm test
```

Expected: 确认 `.claude/tests/package.json` 与 `run-all.mjs` 的 contract 是否闭环。

**Step 3: 只在需要时补跑单测**

If any contract is unclear, run a targeted file such as:

```bash
node .claude/tests/test-workflow-doc-validator.mjs
node .claude/tests/test-no-hardcoded-paths.mjs
```

Expected: 为“文档声称 vs 实际行为”提供更精确证据。

**Step 4: 写入 findings**

Only record issues that materially affect:
- 文档可信度
- 路径 contract
- workflow contract
- 维护回归能力

**Step 5: Commit**

```bash
git add docs/plans/2026-04-02-claude-skills-workflow-audit-findings.md
git commit -m "docs: validate workflow contracts with tests"
```

### Task 7: 去重、归因并形成最终确认稿

**Files:**
- Read: `docs/qa-flow-workflow-audit-and-optimization.md`
- Modify: `docs/plans/2026-04-02-claude-skills-workflow-audit-findings.md`

**Step 1: 去重**

Merge overlapping findings from all tracks.
Expected: “同一根因的多个表象问题”合并成一个主条目。

**Step 2: 排除已闭环问题**

Cross-check every candidate issue against:
`docs/qa-flow-workflow-audit-and-optimization.md`

Expected: 不把已修复问题重新报成当前问题。

**Step 3: 统一优先级**

Apply the approved model:
- P0 = 阻断 / 误导 agent
- P1 = 漂移 / 双权威 / 高维护成本
- P2 = 可读性 / 文案 / 向导优化

Expected: 每条问题都有明确分级，不留“重要但未分级”的项。

**Step 4: 补一段执行建议**

Add a final section:
- 建议先做的 3-5 个点
- 可以延后的点
- 依赖型问题（先修 A 再修 B）

**Step 5: Commit**

```bash
git add docs/plans/2026-04-02-claude-skills-workflow-audit-findings.md
git commit -m "docs: finalize claude skills workflow audit findings"
```

### Task 8: 面向用户输出确认版

**Files:**
- Read: `docs/plans/2026-04-02-claude-skills-workflow-audit-findings.md`

**Step 1: 提炼聊天版摘要**

Summarize the findings into:
- 3-5 条最高优先级问题
- 5-10 条建议优先治理项
- 若干次级优化点

Expected: 聊天输出要短于文档，但保留文件路径与优先级。

**Step 2: 准备确认问题**

Ask the user to choose one of:
- 先改 P0/P1
- 先只整理规范文档
- 先做向导 / 文案 / 选项优化
- 先做 source-of-truth 收口

Expected: 用户能基于清单直接决定后续动作，而不是再让他们重新读一遍仓库。

**Step 3: 不要立即改代码**

Stop after user confirmation unless they explicitly ask for execution.
Expected: 审查阶段和整改阶段保持分离。
