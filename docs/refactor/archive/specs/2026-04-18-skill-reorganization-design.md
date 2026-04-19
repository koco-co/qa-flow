# Skill 重排设计文档（Phase 3.5）

**Phase**: 3.5 · Skill 重排（roadmap §阶段 3.5）
**Date**: 2026-04-18
**Status**: Draft — awaiting user review
**Parent Roadmap**: [`../../refactor-roadmap.md`](../../refactor-roadmap.md)
**Upstream**:
- [`2026-04-17-knowledge-architecture-design.md`](./2026-04-17-knowledge-architecture-design.md)
- [`2026-04-18-prd-discussion-design.md`](./2026-04-18-prd-discussion-design.md)
- [`2026-04-18-ui-autotest-evolution-design.md`](./2026-04-18-ui-autotest-evolution-design.md)

---

## 1. Context

`code-analysis` 是 qa-flow 的早期"瑞士军刀"skill：一个入口承载五种互不相关的输入——禅道 Bug 链接 / Java 堆栈 / 前端 Console / git 冲突片段 / "信息不足"兜底——内部用正则信号路由到 A/B/C/D/E 五模式。半年迭代后暴露以下结构性问题：

1. **单一入口违反 skill 触发词分层**
   - Skill 通过 `description` 中的触发词被激活。一个 skill 同时挂"帮我分析这个报错 / 分析冲突 / 生成 bug 报告 / 禅道链接"四组高置信度触发词，Claude 在 2+ 场景并存时只能"加载 SKILL.md 全文"再二次分流，浪费入口 token
   - 用户把"分析冲突"和"分析这个 Exception"视为完全不同的工作流；强行合并造成心智负担
2. **输入护栏无法精确**
   - 模式 D（信息不足）作为兜底落进 code-analysis，真正需要"此类输入还差哪些关键字段"的判断被稀释成一份通用补料清单。每种输入类型的"前置守卫"有不同硬需求（Hotfix 必须禅道 Bug ID；后端 Bug 必须完整堆栈；冲突必须含 `<<<<<<< HEAD` 标记），而 code-analysis 仅凭一份 D 模式兜底无法分别表达
3. **agent 层已按业务职责拆好，skill 层未对齐**
   - `.claude/agents/` 已有 `hotfix-case-agent` / `backend-bug-agent` / `frontend-bug-agent` / `conflict-agent` / `bug-reporter-agent` 五个专职 agent，每个 agent 有独立输出契约与 sonnet/haiku 模型选择。skill 层再用一份大 SKILL.md 统管，属于 agent 职责与 skill 边界反向耦合
4. **菜单顺序与真实使用频率不匹配**
   - 当前 `qa-flow` 菜单 0-6 项按历史上线顺序排列（setup → test-case-gen → code-analysis → xmind-editor → ui-autotest → 标准化 → 切换项目），但实战高频是"生成用例 / UI 自动化 / Hotfix 用例生成"，当前排序让最常用入口靠后

Phase 3.5 把 code-analysis 的五模式沿业务边界拆成三个触发词独立、守卫前置的专职 skill，并按频率重排 qa-flow 菜单。agent 层不动、报告模板不动、输出目录不动——所有拆分在 skill 编排层内部完成。

---

## 2. Goals

1. 新增 `hotfix-case-gen` skill：唯一入口是禅道 Bug 链接（`{{ZENTAO_BASE_URL}}/zentao/bug-view-{{bug_id}}.html`），派发 `hotfix-case-agent`，输出 `workspace/{project}/issues/YYYYMM/`
2. 新增 `bug-report` skill：入口为后端 Java 堆栈 / 前端 Console 报错，内部按日志特征派发 `backend-bug-agent` 或 `frontend-bug-agent`，输出 `workspace/{project}/reports/bugs/YYYYMMDD/`
3. 新增 `conflict-report` skill：入口为含 `<<<<<<< HEAD` 标记的 git 冲突片段，派发 `conflict-agent`，输出 `workspace/{project}/reports/conflicts/YYYYMMDD/`
4. 三个新 skill 每个都内化"信息不足 → 追问"逻辑（取代 code-analysis 模式 D 的统一兜底），守卫项按输入类型精确化
5. 删除 `.claude/skills/code-analysis/` 整个目录（含 `references/env-vs-code.md`、`SKILL.md`）
6. 同步更新：
   - 五个 agent 的 frontmatter 描述与"由 code-analysis skill 派发"注释
   - `qa-flow` skill 的菜单表与路由逻辑（3 个新 skill 接入）
   - `CLAUDE.md` 功能索引表
   - `README.md` / `README-EN.md` 的命令列表
7. qa-flow 菜单按使用频率重排，init 项位置保持可发现但不占一级槽位
8. 单元测试全绿（基线 ≥ 686 条）；若新增任何 .ts 脚本变更须同步单测

---

## 3. Non-Goals

- 不重写任何 agent：五个专职 agent 保留现有 prompt、模型、工具、输出契约
- 不改报告模板：`templates/bug-report-*.hbs`、`templates/conflict-report.html.hbs` 原样沿用
- 不改输出目录：`reports/bugs/` / `reports/conflicts/` / `issues/` 路径不变，避免旧产出失效
- 不新增 CLI 脚本：三个新 skill 均为"编排层 markdown"，没有新增 TypeScript 逻辑，也不会引入新的 `.claude/scripts/` 文件
- 不调整 plugin 通知事件名：`bug-report` / `conflict-analyzed` / `hotfix-case-generated` 与 `workflow-failed` 原样保留
- 不做报告 HTML 质量改进：属于 phase 5 / phase 6 关注点
- 不处理多个分析任务批量模式：单次一个输入
- 不更新 `.claude/scripts/lib/model-tiers.ts` / `hooks.ts` 中的示例字符串（仅含"code-analysis"作为注释/示例时可忽略，若是运行时键则必须改——实施时对这些文件做二次核查）

---

## 4. Architecture

### 4.1 Skill 边界

| 新 Skill | 触发信号（SKILL.md description 关键词） | 派发 Agent | 产物 | 对应旧模式 |
|---|---|---|---|---|
| `hotfix-case-gen` | 禅道 Bug URL、`hotfix 用例`、`线上 bug 验证`、`分析这个 bug 链接` | `hotfix-case-agent` | `issues/YYYYMM/hotfix_*.md` | E |
| `bug-report` | `分析这个报错`、`帮我看这个异常`、`生成 bug 报告`、`Java 堆栈`、`前端报错` | `backend-bug-agent` 或 `frontend-bug-agent` | `reports/bugs/YYYYMMDD/*.html` | A + C |
| `conflict-report` | `分析冲突`、`合并冲突`、`git conflict` | `conflict-agent` | `reports/conflicts/YYYYMMDD/*.html` | B |

**路由层取消**：原 code-analysis 在 SKILL.md 内部做正则路由（优先级 E > B > A > C > D）。拆分后，**路由上移到 Claude 原生 skill 触发机制**——Claude 读取各 skill description，对输入做语义匹配。模式 D（信息不足）从"全局兜底"降级为"每个 skill 入口的前置守卫子节"，直接针对本 skill 所需字段追问。

### 4.2 Agent / 模板关系（不变）

```
hotfix-case-gen ──► hotfix-case-agent  (sonnet) ──► Archive MD
bug-report      ──► backend-bug-agent  (sonnet) ──► JSON ──► bug-report-*.hbs
                └► frontend-bug-agent  (sonnet) ──► JSON ──► bug-report-*.hbs
conflict-report ──► conflict-agent     (sonnet) ──► JSON ──► conflict-report.html.hbs
```

五个 agent 的 frontmatter 备注由"由 code-analysis skill 在模式 X 时派发"改为"由 {new-skill-name} skill 派发"。

### 4.3 公共前置步骤（每个新 skill 各自内嵌）

三个新 skill 都需要：

1. **项目选择**：扫描 `workspace/` 子目录；单项目自动选中、多项目询问、无项目提示 `/qa-flow init`
2. **读取配置**：`bun run .claude/scripts/config.ts`
3. **符号使用规则**：引用 `.claude/references/unicode-symbols.md`

为避免三份 SKILL.md 拷贝相同前置文字，**抽出共享片段到 `.claude/references/skill-preamble.md`**，每个新 skill 用一行 `参见 .claude/references/skill-preamble.md` 引用即可。该 references 文件是纯展示文档，不含逻辑。

### 4.4 双门策略（bug-report / hotfix-case-gen 沿用）

模式 A/C/E 原有"引用源码 vs 写回 `.env`/branch mapping 两道独立门禁"逻辑保持不变：

- `bug-report` skill 按"路径 A：读取配置自动推断 repo+branch → 展示摘要 → 用户允许后 sync → 若用户修正 repo/branch 再单独询问是否写回 `.env`"流程
- `hotfix-case-gen` skill 按"路径 A：fix_branch 已获取时自动 sync 作为 reference、不自动写回配置；路径 B：fix_branch 为空时通过 AskUserQuestion 询问"流程
- `conflict-report` 无需同步源码（冲突代码片段由用户直接提供），仅在需要展示分支上下文时询问

### 4.5 `qa-flow` 菜单重排

按"高频 → 低频"重排，同时保证 init 在菜单上可发现：

| 新编号 | 功能 | 触发命令 | 说明 |
|---|---|---|---|
| 1 | 生成测试用例 | `/qa-flow 1` 或 `为 <需求名称> 生成测试用例` | 最高频 |
| 2 | UI 自动化测试 | `/qa-flow 2` 或 `UI自动化测试` | 次高频 |
| 3 | 编辑 XMind 用例 | `/qa-flow 3` 或 `修改用例 "..."` | 日常用例微调 |
| 4 | 生成 Hotfix 用例 | `/qa-flow 4` 或 粘贴禅道 Bug 链接 | 线上故障场景 |
| 5 | 分析 Bug 报告 | `/qa-flow 5` 或 `帮我分析这个报错` | 调试场景 |
| 6 | 分析合并冲突 | `/qa-flow 6` 或 `分析冲突` | 偶发 |
| 7 | 标准化归档 | `/qa-flow 7` 或 粘贴 .xmind/.csv | 存量迁移 |
| 8 | 切换项目 | `/qa-flow 8` 或 `切换项目` | 辅助 |
| 0 | 环境初始化 | `/qa-flow init` 或 `/setup` | 首次/异常时 |

**init 保持 0 号**：不占一级数字槽，但仍是"首次使用"明确指引；`/qa-flow init` 与 `/setup` 均可触发。

**路由关键词更新**：原 `2 或 报错/bug 相关关键词 → 分析报错/冲突` 拆成三条：
- `4` 或 `hotfix` / `禅道链接` / `bug-view-` → `hotfix-case-gen`
- `5` 或 `报错` / `异常` / `Exception` / `Console 错误` → `bug-report`
- `6` 或 `冲突` / `merge conflict` / `<<<<<<< HEAD` → `conflict-report`

---

## 5. Skill 设计详图

### 5.1 `hotfix-case-gen` SKILL.md（骨架）

```markdown
---
name: hotfix-case-gen
description: "Hotfix 用例生成。粘贴禅道 Bug 链接即触发，自动抓取 Bug 信息、同步源码、生成 Archive MD 验证用例。触发词：hotfix、hotfix 用例、线上 bug 验证、分析这个 bug、禅道链接"
argument-hint: "[禅道 Bug URL]"
---

<role>Hotfix 用例生成编排技能，把禅道 Bug 链接 + git diff 转化为可执行的 Archive MD 验证用例。</role>

<inputs>
- 禅道 Bug URL（{{ZENTAO_BASE_URL}}/zentao/bug-view-{{bug_id}}.html）
- 可选：用户补充的 fix_branch、repo_name
</inputs>

<pre_guard>
  <required>必须是合法禅道 Bug URL 或 Bug ID；否则请求用户提供链接或 ID</required>
  <soft>fix_branch 为空时允许通过 AskUserQuestion 补充</soft>
</pre_guard>

<confirmation_policy>
  双门策略：引用源码 / 执行 repo sync 与写回 .env / 分支映射是两道独立门禁。
</confirmation_policy>

## 执行前准备
参见 .claude/references/skill-preamble.md（项目选择、读取配置、符号规则）

## 步骤
E1. 抓取禅道 Bug 信息（bun run plugins/zentao/fetch.ts）
E2. 源码同步（路径 A / 路径 B）
E3. 派发 hotfix-case-agent
E4. 输出用例文件到 workspace/{{project}}/issues/{{YYYYMM}}/
E5. 发送 hotfix-case-generated 通知
E6. 完成摘要
```

完整内容复用 code-analysis 模式 E 的现有步骤文本（字面拷贝，仅替换"由 code-analysis skill 在模式 E 时派发"的自我指涉）。

### 5.2 `bug-report` SKILL.md（骨架）

```markdown
---
name: bug-report
description: "Bug 报告生成。解析 Java 异常堆栈或前端 Console 报错，自动路由到后端/前端分析分支，输出 HTML Bug 报告。触发词：分析这个报错、帮我看异常、生成 bug 报告、Java 堆栈、前端报错"
argument-hint: "[报错日志 | 堆栈文本]"
---

<role>Bug 报告生成编排技能，按日志特征识别前后端，派发对应分析 agent，输出结构化 HTML 报告。</role>

<pre_guard>
  <required>报错日志必须包含可识别的异常关键字（Exception / TypeError / ReferenceError / ...）或用户明确声明后端/前端</required>
  <hard_required>主堆栈/主报错文本不可为空</hard_required>
  <soft>环境信息、接口 curl、重现步骤：缺失仍继续分析并在报告中标注</soft>
</pre_guard>

<routing>
  后端信号：含 Exception / Caused by / java.lang / at {{class_name}}.{{method_name}} / Spring / MyBatis
  前端信号：含 TypeError / ReferenceError / ChunkLoadError / React error / Vue warn / at http(s)://
  不明确时：通过 AskUserQuestion 询问"属于后端还是前端？"
</routing>

## 步骤
1. 参见 preamble
2. 路由（后端 → backend-bug-agent；前端 → frontend-bug-agent）
3. 双门：源码引用 + 可选写回
4. 派发 agent 得到 JSON
5. 渲染模板到 workspace/{{project}}/reports/bugs/{{YYYYMMDD}}/
6. 发送 bug-report 通知
7. 完成摘要
```

### 5.3 `conflict-report` SKILL.md（骨架）

```markdown
---
name: conflict-report
description: "合并冲突分析。解析 git 冲突代码，判断冲突类型（逻辑/格式/依赖），输出合并建议 HTML 报告。触发词：分析冲突、合并冲突、git conflict、<<<<<<< HEAD"
argument-hint: "[冲突代码片段]"
---

<role>合并冲突分析编排技能，派发 conflict-agent 得到冲突类型/建议，输出 HTML 报告。</role>

<pre_guard>
  <hard_required>输入文本必须包含 <<<<<<< / ======= / >>>>>>> 三段标记</hard_required>
  <soft>冲突涉及的分支信息（HEAD / incoming）可选，缺失时在报告中标注"未提供"</soft>
</pre_guard>

## 步骤
1. 参见 preamble
2. 询问分支信息（可跳过）
3. 派发 conflict-agent
4. 渲染到 workspace/{{project}}/reports/conflicts/{{YYYYMMDD}}/
5. 发送 conflict-analyzed 通知
6. 完成摘要
```

---

## 6. 删除 code-analysis 的影响面

| 引用来源 | 处理 |
|---|---|
| `.claude/skills/code-analysis/SKILL.md` | 删除 |
| `.claude/skills/code-analysis/references/env-vs-code.md` | 迁移到 `.claude/references/env-vs-code.md`（为 bug-report 所用）并从新 skill 引用 |
| `.claude/agents/{backend,frontend,conflict,hotfix}-*agent.md` frontmatter 注释行 | 改写为引用新 skill 名 |
| `CLAUDE.md` 功能索引表 `/code-analysis` 行 | 替换为三行新 skill |
| `README.md` / `README-EN.md` 命令列表 | 同上 |
| `assets/diagrams/code-analysis.drawio` / 关联 svg | **保留**（作为历史工件存档），不再被文档引用；不强制删除以免破坏外链 |
| `workspace/*/reports/bugs/*.html`（已存报告） | **保留**（历史产物），不处理 |
| `docs/refactor/plans/2026-04-18-ui-autotest-evolution-implementation.md` 等 phase 3 plan 中的 "code-analysis" 引用 | 历史 plan 不改；新建 phase 3.5 plan 引用新 skill |
| `.claude/scripts/lib/model-tiers.ts` / `hooks.ts` | 二次核查：若仅是示例注释则保留；若是运行时键（如从 skill 名派生的路径）必须改 |
| `templates/GUIDE.md` / `plugins/GUIDE.md` | 检查其中"code-analysis"出现位置，逐条改写 |

实施阶段首先运行 `grep -r "code-analysis" .claude/ docs/refactor-roadmap.md CLAUDE.md README*.md templates/GUIDE.md plugins/GUIDE.md` 生成精确影响清单，再逐个处理。

---

## 7. Testing Strategy

### 7.1 单元测试（基线 686）

本 phase 本质上不新增运行时 TS 逻辑，但仍需要：

1. **现有单测全绿**：`bun test ./.claude/scripts/__tests__`
2. **若修改 `lib/model-tiers.ts` / `lib/hooks.ts`**：新增/更新对应单测
3. **rule-loader 单测**：确认 skill 目录的 rules 读取路径没有写死 `code-analysis`
4. **knowledge-keeper index 单测**：确认无 `code-analysis` 硬编码（应该没有，phase 1 交付时已按通用 skill 扫描）

### 7.2 Skill-level 校验（手工 smoke）

- 输入禅道 URL → 自动路由到 `hotfix-case-gen`，生成文件后成功发送 `hotfix-case-generated` 事件
- 输入 `Exception in thread "main" java.lang...` → 路由到 `bug-report` → 走后端分支
- 输入 `TypeError: Cannot read properties of undefined` → 路由到 `bug-report` → 走前端分支
- 输入含 `<<<<<<< HEAD` 的文本 → 路由到 `conflict-report`
- 输入空白或"帮我分析下" → 任一前置守卫触发追问，而非通用"code-analysis 模式 D"兜底

### 7.3 回归风险

| 风险点 | 缓解 |
|---|---|
| 旧 URL 依然指向 code-analysis skill 的 slash command | slash command 发现基于 skill description，skill 删除后 `/code-analysis` 自然失效；若用户仍键入 `/code-analysis`，Claude 会回到通用对话并检索其他 skill 描述，误触风险可接受。`qa-flow` 菜单已指向新 skill，主要入口无影响 |
| agent frontmatter 注释漏改 | 影响文档可读性但不影响运行；PR review 清单里明确列出五个 agent |
| 现有 bug 报告 HTML 中的 "code-analysis" 文案 | 仅历史产出，跳过 |

---

## 8. Rollout / Commit Plan

五段 commit（都带 `(phase3.5)` 前缀；无 Co-Authored-By；无自动 push）：

1. `docs(phase3.5): add skill reorganization design spec` — 本 spec 入仓
2. `feat(phase3.5): add hotfix-case-gen / bug-report / conflict-report skills` — 新增三个 SKILL.md + 新 `.claude/references/skill-preamble.md` + 迁移 `env-vs-code.md` + 更新 5 个 agent frontmatter
3. `feat(phase3.5): remove code-analysis skill` — 删除旧 skill 目录；更新 `qa-flow` SKILL.md 菜单；更新 CLAUDE.md / README
4. `test(phase3.5): verify unit tests remain green after skill reorg` — 若触发测试更新（如 model-tiers.ts）附单测；跑全量得到 686+ 绿
5. `docs(phase3.5): mark phase 3.5 done in roadmap + add phase 4 launch prompt` — roadmap 状态表更新 + phase 4 prompt

---

## 9. Success Criteria

- [ ] `code-analysis` skill 目录完全移除，仓库中仅保留历史报告 HTML 的文案（不处理）
- [ ] `hotfix-case-gen` / `bug-report` / `conflict-report` 三个新 skill 可通过 `/qa-flow 4|5|6` 或语义触发访问
- [ ] 三个新 skill 各自具备精确的前置守卫（不共享通用兜底）
- [ ] `qa-flow` 菜单按频率重排且 init 仍可发现
- [ ] 五个 agent frontmatter 注释指向新 skill
- [ ] CLAUDE.md / README 命令列表同步更新
- [ ] `.claude/scripts/__tests__` 全量绿，计数 ≥ 686
- [ ] phase 3.5 spec 入库、五次 commit 按计划落地
- [ ] 下阶段（Phase 4）启动 prompt 随 roadmap 更新一起交付

---

## 10. Open Questions（等用户 review）

1. **menu 顺序**：当前草案把 `hotfix-case-gen` 放在第 4 位（高于 bug-report / conflict-report）。是否接受该频率排序？或希望把"分析 Bug 报告"放到 4（更通用）、Hotfix 放 5？
2. **`env-vs-code.md` 归属**：是否可以迁移到 `.claude/references/`（通用化）而非挂在某一个 skill 下？bug-report 主要使用者，但 hotfix 场景也可能需要
3. **`assets/diagrams/code-analysis.drawio`**：保留 vs 删除？保留=历史工件；删除=避免文档漂移
4. **`.claude/scripts/lib/model-tiers.ts` / `hooks.ts`**：请确认当前出现的"code-analysis"字符串是示例/注释（保留）还是运行时键（必须改）——实施时我会先 grep 读取上下文
5. **qa-flow 切换项目项**：目前 `6` 号，新菜单草案放 `8`；是否接受下沉
