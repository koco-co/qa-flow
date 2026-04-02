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

#### source-of-truth 漂移

## P0-lanhu-integration-contract-split：蓝湖集成的配置、脚本与入口文档已经分裂成三套 path contract

- 问题：`.claude/config.json` 已把蓝湖集成 canonical 化为 `integrations.lanhuMcp`，仓库中实际也只有 `tools/lanhu-mcp/`；但 `.claude/skills/using-qa-flow/SKILL.md` Step 2、`references/config-questionnaire.md` 与 `test-case-generator/prompts/step-parse-input.md` 仍要求安装 / 调用 `tools/lanhu-cli/.venv/bin/lanhu`、在 `tools/lanhu-cli/.env` 里维护 Cookie。另一边，`lanhu-mcp-runtime.mjs` 与 `.claude/tests/test-load-config.mjs` / `test-lanhu-mcp-runtime.mjs` 已明确 `envFile` 不再通过 config 传递、主路径改为根 `.env` 优先；但 `refresh-lanhu-cookie.py` 仍把 `integrations.lanhuMcp.envFile` 当成必填并写死“刷新 `tools/lanhu-mcp/.env`”。
- 原因：蓝湖接入从 `lanhu-cli + envFile` 迁到 `lanhuMcp + runtime helper` 后，配置文件、运行时 helper、初始化问卷和上游 prompt 没有一次性收口到同一 source-of-truth。
- 影响：用户 / agent 按菜单或 prompt 执行蓝湖导入时会直接落到仓库中不存在的 `tools/lanhu-cli/`；即使改为走当前 config 指向的 `cookieRefreshScript`，脚本也会继续要求已经移除的 `envFile` schema。蓝湖 URL 导入与 Cookie 刷新因此存在事实性阻断，而不是单纯文案过时。
- 建议：以 `.claude/config.json` 的 `integrations.lanhuMcp` 为唯一权威，统一三处 contract：1）`using-qa-flow` / `test-case-generator` 全部改写为 `lanhu-mcp`；2）`refresh-lanhu-cookie.py` 与 `lanhu-mcp-runtime.mjs` 使用同一 `.env` 读取 / 回写策略；3）`config-questionnaire.md` / `init-wizard.mjs` 删除 `lanhuCli` / `envFile` 旧模型，改成 `lanhuMcp` 字段组或显式兼容层。
- 涉及文件：`.claude/config.json`、`.claude/skills/using-qa-flow/SKILL.md`、`.claude/skills/using-qa-flow/references/config-questionnaire.md`、`.claude/skills/using-qa-flow/scripts/init-wizard.mjs`、`.claude/skills/using-qa-flow/scripts/lanhu-mcp-runtime.mjs`、`.claude/skills/using-qa-flow/scripts/refresh-lanhu-cookie.py`、`.claude/skills/test-case-generator/prompts/step-parse-input.md`、`.claude/tests/test-load-config.mjs`、`.claude/tests/test-lanhu-mcp-runtime.mjs`、`tools/lanhu-mcp/`

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

## P1-test-case-public-example-conflict：测试用例公开示例写法在主入口与 using-qa-flow 菜单之间已形成事实性冲突

- 问题：`CLAUDE.md` 与 `README.md` 的公开示例均以 `为 Story-20260322 生成测试用例`、`继续 Story-20260322 的用例生成` 为主入口写法，但 `.claude/skills/using-qa-flow/SKILL.md` 的功能菜单与“快速示例”却要求 `为 ${module_key} v${version} 生成测试用例`、`继续 ${module_key} v${version} 的用例生成`。这已经是同一路由的两套对外示例 contract 冲突，而非单纯风格差异。
- 原因：主入口文档与 `/using-qa-flow` 菜单分别手写测试用例入口示例，却没有明确单一 canonical 写法与兼容策略；`Story-xxx` 和 `${module_key} v${version}` 分别占据不同入口后，公开路由说明自然分叉。
- 影响：用户和 agent 从不同入口进入时会收到不同格式指引，难以判断当前产品要求的是 Story 标识还是 module/version 组合；后续若测试、帮助文案或 reviewer 只沿用其中一套示例，另一套就会继续被误判为非标准入口，放大主入口漂移。
- 建议：将测试用例公开示例冲突作为正式入口问题收口，统一一套对外 canonical 写法，并把另一套写法明确标注为兼容别名或内部映射；`CLAUDE.md`、`README.md`、`.claude/skills/using-qa-flow/SKILL.md` 只保留同一主示例及必要兼容说明。
- 涉及文件：`CLAUDE.md`、`README.md`、`.claude/skills/using-qa-flow/SKILL.md`

## P1-code-analysis-hotfix-route-missing：禅道 Bug / Hotfix 线上问题转化路由未在入口文档中得到对等覆盖

- 问题：`CLAUDE.md` 已明确 `code-analysis-report` 支持“禅道 Bug 链接 → 自动提取修复分支 → 线上问题转化测试用例”，并给出 `http://zenpms.dtstack.cn/zentao/bug-view-{bugId}.html` 入口示例；但 `README.md` 的快速开始仍只写“帮我分析这个报错（附报错日志 + curl）”，`.claude/skills/using-qa-flow/SKILL.md` 的功能菜单与“快速示例”也仅覆盖粘贴报错日志的 route，基本未覆盖禅道 Bug URL / Hotfix 入口。
- 原因：主入口与 `/using-qa-flow` 菜单对 `code-analysis-report` 的描述仍停留在“日志分析 → HTML 报告”，没有同步 `CLAUDE.md` 已经成立的双路由 contract（报错分析 + 禅道 Bug / Hotfix 线上问题转化）。
- 影响：用户和 agent 很难从 README 或 `/using-qa-flow` 菜单得知可以直接发送禅道 Bug URL 触发线上问题转化，导致实际已支持的 route 在主要入口不可发现；不同入口对同一 skill 的能力描述不一致，也会削弱主入口可信度与路由稳定性。
- 建议：在 `README.md` 的快速开始、`.claude/skills/using-qa-flow/SKILL.md` 的功能菜单与“快速示例”中补充“直接发送禅道 Bug URL / Hotfix 线上问题转化”入口，并与 `CLAUDE.md` 使用同一表述，明确这是 `code-analysis-report` 的标准 route 之一。
- 涉及文件：`CLAUDE.md`、`README.md`、`.claude/skills/using-qa-flow/SKILL.md`

> Skill inventory 复核结论：本轮已对 `.claude/skills/` 下 6 个现有 skills 全量复核。`archive-converter`、`prd-enhancer`、`xmind-converter` 属于单一工作流且整体健康；`code-analysis-report` 虽为多模式网关型，但本轮未见显著分层失真；职责边界与多 agent contract 问题主要集中在 `using-qa-flow`（网关型）与 `test-case-generator`（编排型）。

#### 精简 skill inventory 摘要

| Skill | 类型判断 | 多 agent | 是否发现明显分层问题 | 精简证据 |
| --- | --- | --- | --- | --- |
| `archive-converter` | 单一工作流 | 否 | 未见明显问题 | `.claude/skills/archive-converter/SKILL.md:8-12「用途与触发词」/53-61「Canonical 步骤总表」` 聚焦“历史 CSV / XMind 用例 → Archive Markdown”单一路由，canonical 步骤 1-5 直接收口到 `convert-history-cases.mjs`。 |
| `prd-enhancer` | 单一工作流 | 否 | 未见明显问题 | `.claude/skills/prd-enhancer/SKILL.md:16-24「使用口径速查」/51-69「主流程」` 只围绕“单个 PRD 的增强与标准化”“图N 页面要点”“PRD 健康度预检”展开，输入 / 输出边界清楚。 |
| `xmind-converter` | 单一工作流 | 否 | 未见明显问题 | `.claude/skills/xmind-converter/SKILL.md:16-21「使用口径速查」/52-62「Canonical 步骤总表」` 收敛为“JSON → XMind 单一产物”，主步骤集中在输入识别、路径计算、转换与结构验证。 |
| `code-analysis-report` | 网关型 | 否 | 未见本轮显著问题 | `.claude/skills/code-analysis-report/SKILL.md:16-21「四种执行模式 + 信息不足补料」/36-42「模式A/B/C/E/D 路由表」/77-85「Canonical 步骤总表」` 负责多模式识别与路由，但模式入口、产物目录与 reference 绑定关系仍相对清晰；本轮问题主要出在上游入口未对等暴露 Hotfix route。 |
| `using-qa-flow` | 网关型 | 否 | **有** | `.claude/skills/using-qa-flow/SKILL.md:11-20「功能菜单」/69-125「Step 0: 项目配置向导」/127-200「环境初始化（Step 1-5）」` 同时承担菜单路由、项目配置向导与环境初始化命令手册；与其 references 声称“主文档只保留流程总览 / 入口摘要”不一致。 |
| `test-case-generator` | 编排型 | **是** | **有** | `.claude/skills/test-case-generator/SKILL.md:40-58「步骤顺序定义（canonical）」/95-123「Writer 步骤 / Reviewer 步骤」` 明确串联 11 个 step，并同时承载 `source-analyze` 双 Agent、并行 Writer、Reviewer 分片、重试与状态机约束；本轮 prompt / reference / 多 agent 协同问题主要集中于此。 |

#### skill 规范

## P1-skill-contract-layer-break：`using-qa-flow` 与 `test-case-generator` 的 `SKILL.md` 仍在承担 step / reference 级细节

- 问题：`using-qa-flow/references/init-wizard-flow.md:3`、`references/config-questionnaire.md:3` 都明确声明 `SKILL.md` “只保留入口摘要”，但 `using-qa-flow/SKILL.md` 仍完整展开 Step 0.1~0.5 与环境初始化 Step 1~5 的命令级细节；`test-case-generator/SKILL.md:13` 虽声明“本文件仅定义编排流程”，却继续承载 `.qa-state` 初始结构、Writer 自动重试、Reviewer 并行拆分阈值、模块级重跑流程等执行细节。
- 原因：两个复杂 skill 仍把 `SKILL.md` 同时当作“高层 contract”“执行手册”“状态机补充说明”使用，导致高层说明没有真正与 prompt / reference 层分离。
- 影响：维护者调整初始化命令、状态字段或 reviewer 策略时，必须同步改 `SKILL.md`、step prompt、reference 多处文档；复杂 skill 的稳定 contract 无法沉淀，轻量 skill 与重型 skill 的文档分层标准也会继续失真。
- 建议：`SKILL.md` 仅保留触发词、输入/输出契约、模式说明、step 索引和必要边界；命令级步骤、状态机、问答模板与阈值规则收口到单一 reference / prompt，并让 `SKILL.md` 只引用而不重复叙述。
- 涉及文件：`.claude/skills/using-qa-flow/SKILL.md`、`.claude/skills/using-qa-flow/references/init-wizard-flow.md`、`.claude/skills/using-qa-flow/references/config-questionnaire.md`、`.claude/skills/test-case-generator/SKILL.md`、`.claude/skills/test-case-generator/references/intermediate-format.md`

#### prompt 分层

## P1-test-case-generator-contract-drift：`test-case-generator` 的快速模式与 `.qa-state` contract 已出现事实性漂移

- 问题：同一流程规则在 `SKILL.md`、step prompt、reference 中重复维护后已经出现冲突：`SKILL.md:93` 说明快速模式的 `brainstorm` “仅执行历史用例检索”，`step-brainstorm.md:5/22` 也明确它是“部分执行”而不是跳过；但 `SKILL.md:97` 又要求 Writer 在“`brainstorm` 步骤已跳过”时重做同一历史检索。另一处，`SKILL.md:99-113/140` 将 Writer 自动重试定义为“自动重试 1 次”，而 `references/intermediate-format.md:304` 又写成 “达到上限（默认 2 次）后写 failed”。
- 原因：`SKILL.md` 仍在手写快速模式、重试与断点续传的细粒度行为；step prompt 与 reference 也各自补充同一 contract，缺少单一权威。
- 影响：实现编排器或后续维护 prompt 时，很难判断“快速模式到底是部分执行还是跳过”“retry_count 到底代表 1 次还是 2 次重试”；续传、Writer 回退和质量阻断逻辑都可能因读取不同文档而走到不同分支。
- 建议：把快速模式 / 重试 / 状态转移 contract 收口到单一状态机 reference（或单个 canonical step 文档）；`SKILL.md` 仅保留模式摘要；移除当前已经无法成立的“`brainstorm` 已跳过时再做历史检索”分支，并统一 `retry_count` 语义。
- 涉及文件：`.claude/skills/test-case-generator/SKILL.md`、`.claude/skills/test-case-generator/prompts/step-brainstorm.md`、`.claude/skills/test-case-generator/prompts/step-parse-input.md`、`.claude/skills/test-case-generator/references/intermediate-format.md`

#### reference 过载

## P1-intermediate-format-reference-overload：`intermediate-format.md` 已从输出 Schema 膨胀成编排状态手册

- 问题：`.claude/skills/test-case-generator/references/intermediate-format.md` 除了 Writer / Reviewer 的中间 JSON Schema 外，还同时承载 Archive/PRD frontmatter 映射、Checklist JSON 格式、`.qa-state` 命名规则、字段说明与完整状态转移表，实际已经覆盖“输出格式 + 工作流状态机 + 对话中间产物”三类不同 contract。
- 原因：当前 reference 没有按“输出结构”“状态结构”“评审中间产物”拆开，后续新增 contract 时不断追加到同一文件，文件名与真实职责逐渐失配。
- 影响：Writer 为了查 JSON Schema 被迫读取大量编排状态说明；状态字段或 checklist 变更时也会改动一个名为“intermediate-format”的文件，进一步诱发 `SKILL.md` / step prompt 对局部内容的二次摘录和漂移。
- 建议：至少拆成 “case JSON schema”“qa-state schema / transition”“frontmatter / checklist mapping” 三个 reference；`writer-subagent.md` 仅引用 case JSON schema，状态机相关文档只由编排层和相关 step prompt 消费。
- 涉及文件：`.claude/skills/test-case-generator/references/intermediate-format.md`、`.claude/skills/test-case-generator/SKILL.md`、`.claude/skills/test-case-generator/prompts/writer-subagent.md`、`.claude/skills/test-case-generator/prompts/step-parse-input.md`

#### 多 agent 协同设计

## P1-source-analyze-authority-blur：`source-analyze` 与 Writer 的源码阅读职责没有收敛到单一权威

- 问题：`step-source-analyze.md:14-15` 把该步骤定义为“集中完成一次源码分析”，并要求 Writer / Reviewer 直接读取 `source-context.md`、无需再全量 grep 源码仓库；`writer-subagent.md:53` 也要求“直接 Read 上方文件路径即可，无需自行 grep 源码仓库”。但 `writer-subagent-reference.md:78-92` 又把 “Grep 搜索 Controller”“提取 DTO/VO 字段”“提取业务逻辑分支” 定义为 Writer 在有源码时必须执行的动作；`step-source-analyze.md:70` 还在部分失败分支写入“Writer 请自行 grep”。
- 原因：`source-analyze` 作为预提取层加入后，Writer 的旧版深度源码分析义务没有同步退场，导致“预提取是权威输入”还是“只是性能优化”没有写清。
- 影响：源码阅读被 source-analyzer 与 Writer 双重承担，多 agent 的上下文隔离优势被削弱；后续若 source-context 与 Writer 二次 grep 结果不一致，也缺少明确的裁决规则。
- 建议：维护者需要选定单一模式并写成 contract：要么 `source-analyze` 成为唯一正常路径、Writer 仅在明确降级条件下回源 grep；要么显式把它定义为缓存 / 预热层，并写清 Writer 允许二次 grep 的触发条件与优先级。
- 涉及文件：`.claude/skills/test-case-generator/prompts/step-source-analyze.md`、`.claude/skills/test-case-generator/prompts/writer-subagent.md`、`.claude/skills/test-case-generator/prompts/writer-subagent-reference.md`、`.claude/skills/test-case-generator/references/intermediate-format.md`

## P1-reviewer-shard-global-contract-conflict：Reviewer 分片策略与全局查漏 / 去重职责互相冲突

- 问题：`test-case-generator/SKILL.md:115-122` 规定总用例数 > 80 条时拆成 2 个并行 `case-reviewer`，分别只接收前 / 后半 Writer 输出，编排器最后仅做一次“跨 Reviewer 的同名用例标题轻量去重”。但 `prompts/reviewer-subagent.md:17-23` 把 Reviewer 定义为“对所有 Writer 生成的用例进行系统性评审、查漏补缺，并直接输出修正后的完整 JSON”；`reviewer-subagent.md:110-123` 又要求其基于增强 PRD 对全量功能点查漏补缺，`reviewer-subagent.md:212-223/232-242` 还要求在最终输出前做历史用例去重与多文件全量合并。也就是说，分片 Reviewer 实际只拿到局部输入，却被要求承担“基于全部 Writer 输出做全局查漏、历史去重并产出完整 JSON”的 contract；这个 contract 在输入条件上就无法成立。
- 原因：编排层新增了 Reviewer 分片并行策略，但 reviewer prompt 仍按“单个全局 Reviewer”撰写，没有补一个最终全局 reviewer / aggregator 来承接跨分片 coverage、历史去重与最终合并裁决。
- 影响：这不是“可能漏补”，而是分片 Reviewer 必然无法独立完成 prompt 要求的全局查漏 / 历史去重 contract：它从未拿到另一半 Writer 输出，也看不到合并后的全量语义，因此逻辑上不可能验证“全部功能点是否覆盖”“历史重复是否已消解”。编排器末尾仅按同名标题做轻量扫描，也不足以替代基于完整 PRD / 历史语义的全局复核；结果是当前并行策略下，全局 Reviewer contract 本身不可完成，跨分片漏补、重复补 case 或合并后 JSON 再漂移就不是边缘风险，而是未被 contract 兜住的确定性缺口。
- 建议：二选一收口：要么恢复单 Reviewer 的全局语义；要么把 Reviewer 显式拆成“局部分片 Reviewer + 最终全局 Reviewer / Aggregator”两层，并把 `reviewer-subagent.md` 改写为局部 / 全局两套不同 contract，避免让分片 reviewer 持有无法完成的全局职责。
- 涉及文件：`.claude/skills/test-case-generator/SKILL.md`、`.claude/skills/test-case-generator/prompts/reviewer-subagent.md`

## P1-uncertainty-owner-conflict：Writer / Reviewer 对“待核实”标记没有单一所有者

- 问题：核心冲突很直接：`references/intermediate-format.md:158-164` 与 `reviewer-subagent.md:208-210` 都规定 `[待核实]` 是 Reviewer 专属标记；但 `writer-subagent-reference.md:67-69` 却要求 Writer 在 PRD 矛盾时，直接在 `precondition` 末尾写 `[待核实：...]`。`writer-subagent.md:191/263` 对 Writer 的禁止规则只是进一步加剧混乱——它让 Writer 处于“reference 要求写、主 prompt 又禁止写”的叠加冲突中，但主冲突首先已经发生在 `[待核实]` 的 owner 定义本身。
- 原因：不确定性处理被拆散到 Writer 主 prompt、Writer reference、Reviewer prompt 和 Schema 四处维护，没有单一 owner。
- 影响：Writer 的合法输出边界变成自相矛盾：既被要求禁止写 `[待核实]`，又被 reference 指导去写；Reviewer 也无法判断“待核实”是自己接管的问题，还是 Writer 可以提前暴露的标记，进而污染中间 JSON 与最终用例文本。
- 建议：把“不确定性如何暴露”收口到单一角色（建议继续由 Reviewer / 评审报告独占）；Writer reference 改为输出摘要或跳过原因，而不是在用户可见用例正文里夹带 `[待核实]` 注释。
- 涉及文件：`.claude/skills/test-case-generator/prompts/writer-subagent-reference.md`、`.claude/skills/test-case-generator/prompts/writer-subagent.md`、`.claude/skills/test-case-generator/prompts/reviewer-subagent.md`、`.claude/skills/test-case-generator/references/intermediate-format.md`

#### source-of-truth 漂移

## P1-config-paths-not-fully-consumed：`config.json` 已配置化的非 cases 路径仍由 wizard / docs / prompts 各写一份

- 问题：`.claude/config.json` 已集中声明 `assets.images`、`reports.bugs`、`reports.conflicts` 与 `branchMapping`；但 `init-wizard.mjs` 仍在 `buildConfigObject()` 中手写同一组默认值，`code-analysis-report` 的 `SKILL.md` / `code-analyzer.md` / references 多处手写 `reports/bugs/`、`reports/conflicts/`，`prd-enhancer` 的 `SKILL.md` / rules / `migrate_images.py` 多处手写 `assets/images/`，`config-questionnaire.md` 也继续把 `config/repo-branch-mapping.yaml` 写成问卷默认路径。
- 原因：当前配置只在运行时 helper 中被读取，wizard 文本、Skill 文案和 reference 没有模板化 / 生成式收口，导致“已配置化”只停留在 config 文件层，外围契约仍是人工多点同步。
- 影响：只要图片目录、报告目录或分支映射文件位置发生调整，维护者就必须同时改 config、向导脚本、Skill 文案与 reference；即使 config 已更新，外围文档仍可能继续提供一套过时 path contract。
- 建议：要么让 repo-facing 文本尽量改成“读取 `.claude/config.json` 的对应字段”，不再重复字面路径；要么把这些默认值收口成模板 / helper，并增加回归检查，校验文档与 prompt 中的路径字面量始终与 config 同步。
- 涉及文件：`.claude/config.json`、`.claude/skills/using-qa-flow/scripts/init-wizard.mjs`、`.claude/skills/using-qa-flow/references/config-questionnaire.md`、`.claude/skills/code-analysis-report/SKILL.md`、`.claude/skills/code-analysis-report/prompts/code-analyzer.md`、`.claude/skills/code-analysis-report/references/backend-analysis-flow.md`、`.claude/skills/code-analysis-report/references/frontend-analysis-flow.md`、`.claude/skills/code-analysis-report/references/conflict-analysis-flow.md`、`.claude/skills/prd-enhancer/SKILL.md`、`.claude/rules/image-conventions.md`、`.claude/skills/prd-enhancer/rules/image-conventions.md`、`.claude/skills/prd-enhancer/scripts/migrate_images.py`

#### 路径引用问题

## P1-cases-path-alias-not-retired：`casesRoot` / `casesTypes` 已存在，但核心脚本仍把 `requirements` 当作一等目录

- 问题：`.claude/config.json` 已声明 `casesRoot` 与 `casesTypes = ["prds","archive","xmind","issues","history"]`，`load-config.mjs` 也已有 `resolveTimePeriodPath()`；但目前只有 `unify-directory-structure.mjs` 真正消费了 `casesTypes`。其余核心 helper 仍把 `requirements` 当作一等路径：`audit-md-frontmatter.mjs` 默认扫描 `archive + requirements + prds + issues`，且 `getDocType()` 只返回 `archive | requirements`；`md-content-source-resolver.mjs` 继续构造 `requirementsDir` 并用 `casesRoot + "requirements/"` 做来源识别；`front-matter-utils.mjs` 的 doc type / module key 解析也内建了 `/cases/requirements/`。更下游的 `backfill-prd-frontmatter.mjs`、`migrate_images.py` 与多份测试 fixture 仍持续写入 `cases/requirements/...`。
- 原因：目录迁移停留在“新旧两套都兼容”阶段，但 legacy alias 没有被隔离到迁移层；resolver、审计脚本和测试 fixture 仍原生承认旧树结构。
- 影响：`casesRoot` / `casesTypes` 目前只是半成品配置化：一旦要彻底退役 `requirements` 或调整 PRD 目录布局，仍需同时改 resolver、审计脚本、迁移脚本和大量测试夹具。旧路径也更容易在新增脚本时被重新抄回主流程。
- 建议：把 canonical case-type 与 legacy alias map 一起下沉到 shared helper（由 config 驱动）；主流程只消费 `prds/archive/xmind/issues/history`，`requirements` 支持下放到显式迁移 / 兼容层，并逐步清理仍把旧目录当作正常输入的脚本与测试。
- 涉及文件：`.claude/config.json`、`.claude/shared/scripts/load-config.mjs`、`.claude/shared/scripts/unify-directory-structure.mjs`、`.claude/shared/scripts/audit-md-frontmatter.mjs`、`.claude/shared/scripts/md-content-source-resolver.mjs`、`.claude/shared/scripts/front-matter-utils.mjs`、`.claude/skills/prd-enhancer/scripts/backfill-prd-frontmatter.mjs`、`.claude/skills/prd-enhancer/scripts/migrate_images.py`、`.claude/tests/test-md-content-source-resolver.mjs`、`.claude/tests/test-md-frontmatter-audit.mjs`、`.claude/tests/test-front-matter-utils.mjs`

#### rules 维护面过宽

## P1-rule-mirror-drift-without-guard：global rules 与 skill-local 镜像仍是双权威，且守护覆盖不完整

- 问题：`.claude/skills/archive-converter/rules/archive-format.md`、`test-case-generator/rules/test-case-writing.md`、`xmind-converter/rules/xmind-output.md` 都声明“以 `.claude/rules/*.md` 全局版本为准”；其中 `archive-format` 已在 `test-workflow-doc-validator.mjs` 中通过 `stripMirrorNotice(archiveSkillRuleMirrorContent) === archiveFormatContent.trim()` 做单点镜像一致性校验，说明仓库并非完全没有 guard。但 `test-case-writing` 与 `xmind-output` 仍缺少同类成对守护，且当前已出现事实性漂移。最明显的两组：全局 `test-case-writing.md` 已新增 Archive MD 层级、`【P0/P1/P2】` 优先级前缀、`> 用例步骤` 标签、正向用例合并与表单多字段合并规则，skill 镜像仍停留在旧版简化写法；全局 `xmind-output.md` 已改为 `cases/xmind/YYYYMM/` / `cases/archive/YYYYMM/` 的年月制路径与 `<中文产品名>` Root 描述，但 skill 镜像仍写成 `${module}/v${version}` 路径与 `<项目名>` Root。
- 原因：这些“镜像规则”本质上仍是手工复制件。`archive-format` 的单点 guard 证明“镜像一致性校验”可行，但仓库缺少统一的生成链路或成对覆盖策略，导致 `test-case-writing`、`xmind-output` 仍主要依赖文件开头一句“以全局版本为准”提醒，双权威没有真正收口。
- 影响：当前风险不是“完全无守护”，而是“守护覆盖不完整 + 双权威仍存在”。这意味着 `archive-format` 之外的镜像仍可能在维护者只改一侧时继续漂移；读取全局 rules 的 agent 与只读取 skill-local rules 的 agent 仍会在 XMind 路径 / Root contract、用例正文结构等关键输出上得到不同结果。
- 建议：以 `archive-format` 已存在的 `test-workflow-doc-validator.mjs` 单点 guard 为最小模板，将 `test-case-writing` 与 `xmind-output` 也补成 pair-wise diff 守护，或直接让 skill-local rules 退化为薄引用 / 生成产物。问题本质是“守护覆盖不完整 + 双权威未收口”，而不是“仓库完全没有守护”。
- 涉及文件：`.claude/rules/archive-format.md`、`.claude/skills/archive-converter/rules/archive-format.md`、`.claude/rules/test-case-writing.md`、`.claude/skills/test-case-generator/rules/test-case-writing.md`、`.claude/rules/xmind-output.md`、`.claude/skills/xmind-converter/rules/xmind-output.md`

## P1-load-config-test-expectation-drift：`test-load-config.mjs` 的 4 项断言假设与 `config.json` 实际状态不一致

- 问题：`test-load-config.mjs` 中 4 项断言——"空 modules 时 getModuleMap() 返回空对象"、"空 modules 时 getModuleKeys() 返回空数组"、"branchMapping 为 null 时 getBranchMappingPath() 返回 null"、"getRepoBranchMappingPath() 作为 alias 正常工作"——均假设 `config.json` 的 `modules` 为空对象且 `branchMapping` 为 `null`。但当前 `config.json` 已声明 `modules: { "data-assets": ... }` 和 `branchMapping: "config/repo-branch-mapping.yaml"`，导致这 4 项断言必然失败。
- 原因：测试用例是在配置"空态"阶段编写的，但 `config.json` 后续填入了真实配置值，测试断言未同步更新。测试既没有使用 fixture/mock 隔离，也没有读取实际 config 做动态断言。
- 影响：`load-config` 是几乎所有 workflow 路径的第一跳；4/38 持续红灯导致该测试文件的回归守护信度降低——开发者无法一眼区分"老旧 false negative"和"真实新故障"，削弱了维护回归能力。
- 建议：将这 4 项断言改为基于 `loadConfig()` 返回值的动态断言（例如 `keys.length === Object.keys(config.modules).length`），或使用 `loadConfigFromPath()` 传入 fixture config 隔离环境。
- 涉及文件：`.claude/tests/test-load-config.mjs`、`.claude/config.json`

### 测试验证摘要（Task 6）

> 以下是 Task 6 运行全量测试后对 workflow contract 闭环状态的客观记录。

#### 测试环境

- 入口：`npm test` → `node .claude/tests/run-all.mjs`
- 测试文件数：17
- 总断言数：约 500+（17 文件各自汇总）

#### 关键 contract 测试结果

| 测试文件 | 结果 | 与 workflow contract 的关系 |
| --- | --- | --- |
| `test-workflow-doc-validator.mjs` | ✅ 40/40 | Skill 路径引用、CLAUDE.md 章节锚定、快捷链接废弃、archive 落盘状态 |
| `test-no-hardcoded-paths.mjs` | ✅ 13/13 | shared scripts 不含硬编码 `cases/` 路径字面量 |
| `test-output-convention-migration.mjs` | ✅ 6/6 | XMind 日期前缀移除、快捷链接清理、state 文件迁移 |
| `test-load-config.mjs` | ⚠️ 34/38 | config 读取 contract（4 项 false negative，见 P1-load-config-test-expectation-drift） |
| `test-front-matter-utils.mjs` | ✅ 21/21 | front-matter 解析 / 序列化契约 |
| `test-formalized-prd-contract.mjs` | ✅ 6/6 | PRD 形式化输出契约 |
| `test-init-wizard.mjs` | ✅ 62/62 | 初始化向导 contract |
| `test-md-frontmatter-audit.mjs` | ✅ 95/95 | front-matter 审计规则 |
| `test-md-body-normalization.mjs` | ✅ 26/26 | Markdown 正文规范化 |
| `test-md-content-source-resolver.mjs` | ✅ 27/27 | 内容来源解析 |
| `test-md-semantic-enrichment.mjs` | ✅ 11/11 | 语义增强 |
| `test-md-xmind-regeneration.mjs` | ✅ 40/40 | XMind 再生成 |
| `test-lanhu-mcp-runtime.mjs` | ✅ 13/13 | 蓝湖 MCP 运行时 |
| `test-latest-link-utils.mjs` | ✅ 14/14 | 快捷链接工具函数 |

#### 既存失败（已排除，非新发现）

| 测试文件 | 失败数 | 排除原因 |
| --- | --- | --- |
| `test-archive-history-scripts.mjs` | 8/68 | archive 归档路由与 CSV 转换的既存模块映射问题，属于 archive 脚本迭代中的已知断裂，不涉及 workflow 入口 contract |
| `test-json-to-xmind.mjs` | 2/37 | XMind L1 title 通用格式的既存规范变更，属于输出格式迭代，不影响 workflow 路由或文档可信度 |
| `test-repo-branch-mapping.mjs` | 1/19 | 前端分支映射值的既存偏差，属于配置数据层问题，不影响 workflow contract 本身 |

#### 已验证闭环的正面结论

1. **仓库级测试入口 contract 完整**：`package.json#scripts.test` → `run-all.mjs` → 自动发现 `test-*.mjs` 的三层链路可用，`.claude/tests/package.json#scripts.test` 也可独立运行，两个入口等价。
2. **文档-代码路径 contract 已闭环**：`test-workflow-doc-validator` 验证了 Skill 文档引用的 `.claude/rules/` 路径、CLAUDE.md 章节锚点、快捷链接废弃、archive 状态写入等关键 contract 全部一致。
3. **硬编码路径 contract 已闭环**：`test-no-hardcoded-paths` 验证了 13 个 shared script 均不含 `cases/` 硬编码字面量，与 `load-config` 配置化路径 contract 一致。
4. **输出命名迁移 contract 已闭环**：`test-output-convention-migration` 验证了 XMind 无日期前缀命名、快捷链接清理、state 文件更新均已到位。

### P2（文案 / 可读性 / 向导体验）

#### 新手引导

## P2-quickstart-no-recommended-path：快速开始示例缺少"最推荐的一种"标记，新手扫读后选择困难

- 问题：`CLAUDE.md` 快速开始一次性列出 8 条示例（涵盖 5 种功能 + 续传 + 重跑 + 禅道），`README.md` 也列出 6 条，`using-qa-flow` 的"快速示例"又列出 9 条；三处均无推荐标记（如 ⭐ 或"推荐"徽标），也没有"第一次只需试这一个"的引导句。
- 原因：每处文档独立扩写示例后，都追求覆盖面而没有做减法或加优先级标注；缺少面向新手的"推荐入口"设计惯例。
- 影响：首次接触的用户面对三份几乎等长的示例列表，无法快速判断"最常用的功能是什么、第一步应该输入什么"，选择困难导致 onboarding 成本升高。
- 建议：在 `CLAUDE.md` 和 `using-qa-flow` 的快速开始中，将"生成测试用例"标为推荐入口（如 `# ⭐ 最常用` 或加粗 + 一句提示），其余示例折叠到"更多用法"或用次级标题分隔；`README.md` 作为 landing page 只保留 1–2 条最短示例。
- 涉及文件：`CLAUDE.md`、`README.md`、`.claude/skills/using-qa-flow/SKILL.md`

## P2-init-timing-unclear：init 时机和必要性说明不足，用户不清楚何时需要初始化

- 问题：`CLAUDE.md` 和 `README.md` 的引导条都写"首次使用输入 `/using-qa-flow init` 初始化环境"，但没有说明哪些功能不需要 init 即可使用（如"帮我分析这个报错"只需粘贴日志，不依赖 `config.json`）。`using-qa-flow` 的 Step 0 标题为"首次使用必须完成"，但功能菜单的编号 0 又叫"项目配置 + 环境初始化"——"首次使用必须"与"项目配置"之间的关系没有显式说明。
- 原因：init 同时承载了两件事——项目配置向导（`config.json` 生成）和环境初始化（Python/Node.js/lanhu/repos），但面向用户的文案没有区分"哪些功能依赖 config、哪些不依赖"。
- 影响：新用户可能以为必须跑完 5 步 init 才能开始任何操作，或者反过来跳过 init 后使用"生成测试用例"时才遇到 config 缺失报错，体验不连贯。
- 建议：在引导条或快速开始区域补充一句说明，例如："首次使用'生成测试用例'前需完成 init；'分析报错'和'转化历史用例'可直接使用。" 同时在 `using-qa-flow` 功能 0 的描述中区分"项目配置（必需）"和"环境初始化（按需）"。
- 涉及文件：`CLAUDE.md`、`README.md`、`.claude/skills/using-qa-flow/SKILL.md`

#### 选项设计

## P2-menu-lacks-recommendation-and-grouping：功能菜单选项无推荐标记，init 向导功能组缺"可选"提示

- 问题：`using-qa-flow` 功能菜单有 6 个选项（0–5），但功能 1"生成测试用例"作为最高频入口没有任何推荐标记；功能 0"项目配置 + 环境初始化"的编号最小却排在表格最后一行，位置与编号逻辑矛盾。`config-questionnaire.md` 的 5 个功能组（①–⑤）也全部以同等权重展示，③ 源码仓库和 ④ 集成工具对大多数新用户属于高级选项，但既没有标注"可选/高级"，也没有给出推荐默认值（如 ③ 默认为 n）。
- 原因：菜单和向导都追求完整性而没有做分级标注或默认值推荐。
- 影响：新手看到等权重的选项列表时，容易在源码仓库和集成工具上犹豫或误配，延长 onboarding 时长；菜单编号 0 放最后也让"init"的入口位置不直觉。
- 建议：1）功能菜单给功能 1 加推荐标记，将功能 0 移到表格首行或尾注独立区域并标注"首次使用"；2）`config-questionnaire.md` 的 ③④ 标注为"可选 / 高级"，并在问题文案中给出推荐默认值（如"是否需要配置源码仓库？(y/n，大多数项目选 n)"）。
- 涉及文件：`.claude/skills/using-qa-flow/SKILL.md`、`.claude/skills/using-qa-flow/references/config-questionnaire.md`

## P2-wizard-question-order-not-progressive：init 向导步骤未按"简单→复杂"排列，历史文件步骤对空项目冗余

- 问题：init 向导的执行顺序为 0.1 扫描 → 0.2 展示推断 → 0.3 历史文件解析 → 0.4 功能分组问答 → 0.5 写入。步骤 0.3 对没有历史文件的项目（占新用户多数场景）会产生一轮"还有其他历史文件要导入吗？(y/n)"的无效交互。同时，环境初始化 Step 1–5 的排列是 Python → lanhu-cli → Node.js → 源码仓库 → 验证，但实际依赖关系是 Node.js 被 xmind-converter 直接需要、Python 仅被 lanhu 间接需要；先装 Python 再装 lanhu-cli 的顺序虽无硬依赖问题，但从"最常用到最不常用"的认知顺序看，Node.js / xmind-converter 应该更靠前。
- 原因：向导步骤按实现层的逻辑拆分（扫描→解析→问答），没有按用户认知或频率排序；环境初始化沿用了 Python 优先的安装惯例但没有考虑业务频率。
- 影响：空项目用户被迫在 0.3 回答无用问题；环境初始化在最先安装的 Python/lanhu 上花费较多时间，但这两步并非必须（纯文本模式可跳过 Playwright），延长了首次可用时间。
- 建议：1）0.3 在 `historyFiles` 为空时自动跳过，不再追问；2）环境初始化调整为 Node.js → Python → lanhu → 源码仓库 → 验证，或至少将 Node.js 提到 Python 之前，并在每步开头标注"必需/可选"。
- 涉及文件：`.claude/skills/using-qa-flow/references/init-wizard-flow.md`、`.claude/skills/using-qa-flow/SKILL.md`

#### 文案一致性

## P2-terminology-convert-vs-transform：跨文档"转换"与"转化"混用，"历史用例"与"归档用例"边界模糊

- 问题：同一个动作在不同位置使用了不同动词——`using-qa-flow` 菜单功能 4 叫"转换历史用例"、快速示例写"转化所有历史用例"、`CLAUDE.md` Skill 索引触发词写"转化历史用例"、`archive-converter` description 写"历史用例归档转化"；功能 5 则叫"XMind 转换"。"转换"与"转化"在中文语境下语义不同（转换偏格式变换、转化偏质变归档），但当前使用无规律。同时，"历史用例"（输入端原始 CSV/XMind）与"归档用例"（输出端 Markdown）这对概念在菜单和触发词中混为一体，用户无法从文案判断到底是在操作输入还是输出。
- 原因：多处文案独立编写，没有统一术语表；"归档"既是动词（转化到归档格式）又是名词（归档目录），增加混淆。
- 影响：用户搜索帮助或回忆触发词时可能用错动词，触发词匹配率下降；维护者也容易在迭代中继续引入新变体。
- 建议：统一为一组约定——例如动作统一用"转化"（convert & archive），输入端称"历史用例"，输出端称"归档用例"或"归档 Markdown"；在 `CLAUDE.md`、`README.md`、`using-qa-flow` 菜单、`archive-converter` description 中一次性对齐；格式变换类（JSON→XMind）统一用"转换"。
- 涉及文件：`CLAUDE.md`、`README.md`、`.claude/skills/using-qa-flow/SKILL.md`、`.claude/skills/archive-converter/SKILL.md`

## P2-terminology-prd-story-requirement：同一概念在跨文档中有多个叫法——PRD / Story / 需求文档 / requirements / prds

- 问题：用户输入的需求来源在不同位置有至少 5 种叫法：`CLAUDE.md` 工作区结构写 `PRD / Story 文档（原 requirements/）`；`CLAUDE.md` Skill 索引写 `PRD 图片描述`；`README.md` 写 `帮我增强这个 PRD`；`using-qa-flow` 菜单写 `PRD 文档` 和 `PRD 文件路径`；`test-case-generator` description 写 `根据需求文档生成用例`；目录名用 `cases/prds/`；`README.md` 目录树仍残留 `cases/requirements/`。用户无法确定"PRD"、"Story"、"需求文档"是同一个东西还是不同东西。
- 原因：项目经历了从 `requirements/` 到 `prds/` 的目录迁移，但文案层面没有做一次性术语归一；`Story-xxx` 是版本标识写法、`PRD` 是文档类型、`需求文档` 是通俗称呼，三者各有使用场景但从未显式定义关系。
- 影响：新用户不确定自己手上的文件应该叫"PRD"还是"Story"，不确定应该放到 `prds/` 还是 `requirements/`（后者在 README 仍可见），触发词也会因为叫法不统一而犹豫。
- 建议：在 `CLAUDE.md` 快速开始或 Skill 索引上方增加一句术语约定（如"本项目中 PRD、Story、需求文档均指同一类输入文件，统一存放于 `cases/prds/`"），并在 `README.md` 和 `using-qa-flow` 中保持同一主称呼（建议以"PRD"为主称，"Story-xxx"仅作为版本标识写法说明）。
- 涉及文件：`CLAUDE.md`、`README.md`、`.claude/skills/using-qa-flow/SKILL.md`、`.claude/skills/test-case-generator/SKILL.md`

## P2-skill-title-language-inconsistency：Skill 标题与 heading 语言风格不统一，`code-analysis-report` 使用英文而其余全中文

- 问题：5 个 Skill 的 `SKILL.md` 一级标题中，`test-case-generator` 用 `# 测试用例生成编排 Skill`、`prd-enhancer` 用 `# PRD 文档增强 Skill`、`xmind-converter` 用 `# XMind 转换 Skill`、`archive-converter` 用 `# 历史用例归档转化 Skill`，但 `code-analysis-report` 用 `# Code Analysis Report Skill`（全英文）。`CLAUDE.md` 顶部明确要求"使用中文回复"。
- 原因：`code-analysis-report` 的标题可能是早期英文模板遗留，后续迭代未统一。
- 影响：语言不一致会降低文档整体专业感，也可能让 agent 在生成回复时混用中英文。
- 建议：将 `code-analysis-report/SKILL.md` 的标题改为 `# 代码分析报告 Skill`，与其他 4 个 Skill 保持一致的中文标题风格。
- 涉及文件：`.claude/skills/code-analysis-report/SKILL.md`

#### 可读性

## P2-using-qa-flow-route1-overload：`using-qa-flow` 功能 1 的引导说明信息过载，单个选项下堆叠 8 行指引

- 问题：`using-qa-flow/SKILL.md` 在 `$ARGUMENTS` 包含 `1` 的路由下，一次性给出普通模式、快速模式、蓝湖 URL 导入、PRD 目录提示、续传检测、模块重跑共 8 行说明（第 38–46 行）。这些信息虽然都与"生成测试用例"相关，但新手在第一次看到时无法消化全部变体。
- 原因：功能 1 的所有使用模式被平铺在同一路由下，没有按"基本用法 → 进阶用法"分层或折叠。
- 影响：agent 按路由展示引导时，会一次性输出全部 8 行，用户面对长文本容易忽略关键信息（如最基本的写法）或感到压迫。
- 建议：将功能 1 的引导拆为两层——第一层只展示最基本写法（`为 xxx 生成测试用例`）和一个进阶提示（"输入 `更多选项` 查看快速模式、蓝湖 URL、续传等用法"）；第二层按需展开。
- 涉及文件：`.claude/skills/using-qa-flow/SKILL.md`

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

- **历史条目来源**：`load-config` 泛化迁移期间关于“顶层字段仍残留 `repoBranchMapping`”的历史问题（见 `.claude/shared/scripts/load-config.test.mjs` 与 `.claude/tests/test-load-config.mjs` 的迁移断言）。
  - **当前证据**：当前 `.claude/config.json` 顶层字段已为 `branchMapping`；`load-config.mjs#getBranchMappingPath()` 明确读取 `config.branchMapping`；`.claude/tests/test-load-config.mjs` 也持续断言 `config.repoBranchMapping === undefined`。
  - **排除原因**：字段名迁移本身已闭环，本轮无需再把“`repoBranchMapping` 仍是正式 schema”当作活动问题上报。
  - **备注**：已闭环但需观察；个别测试提示词仍保留 `repoBranchMapping` 字样，属于文案残留，不再等同于 schema 仍未迁移。

## 待用户确认项

- 本节只记录“需要维护者拍板的取舍项”，不记录纯事实性问题。
- 典型类型包括：
  - 主入口与技能文档之间的职责边界是否需要重新切分
  - 哪个文件应成为某类路径 / 规则 / 路由的单一权威
  - 兼容旧触发词、旧路径、旧话术的保留策略
- Task 1 暂不预写具体确认项；后续仅在出现真实分歧时追加。

- **测试用例公开示例的兼容策略是否继续保留双写法**：`P1-test-case-public-example-conflict` 已确认 `Story-xxx` 与 `${module_key} v${version}` 同时对外暴露属于事实性入口冲突；本节仅保留整改策略层面的待拍板项：最终对外 canonical 写法选哪一套，另一套是否作为兼容 alias 保留，以及 README 中“快速生成测试用例”这类自然语言等价提示是否继续公开展示。该项属于取舍问题，不再替代正式 findings。
- **`source-analyze` 是权威输入还是性能优化层**：`P1-source-analyze-authority-blur` 已证实 `source-analyze`、Writer 主 prompt、Writer reference 对源码阅读职责存在双写；需要维护者拍板：后续是把 `source-context.md` 定义为 Writer / Reviewer 的唯一正常输入，还是允许 Writer 在常规路径继续二次 grep 源码。该项决定多 agent 设计究竟走“集中预提取”还是“预提取 + 自主回源”模型。
- **大体量用例是否保留 Reviewer 分片模型**：`P1-reviewer-shard-global-contract-conflict` 已确认当前 >80 条时的 Reviewer 分片，与 `reviewer-subagent.md` 要求的全量查漏补缺 / 历史去重职责存在事实性冲突；需要维护者拍板是回退为单 Reviewer，还是补“局部分片 + 最终全局总审”两层模型，并同步重写 reviewer prompt / 编排 contract。
- **`using-qa-flow` 是否允许作为例外继续承载命令级 onboarding 内容**：`P1-skill-contract-layer-break` 已确认 `using-qa-flow` 当前没有遵守其 reference 所声明的“SKILL.md 只保留入口摘要”；若维护者认为它本质上兼具菜单与 onboarding 手册双角色，应把这一例外明确写进 contract，而不是继续保持 `SKILL.md` 与 references 互相否定的状态。
- **蓝湖接入的 canonical 方案是否彻底切到 `lanhu-mcp`**：`P0-lanhu-integration-contract-split` 已确认当前同时存在 `tools/lanhu-cli`、`tools/lanhu-mcp`、根 `.env` / `tools/lanhu-mcp/.env` 三套口径；需要维护者拍板后续是完全移除 `lanhu-cli` / `envFile` 旧模型，还是保留兼容壳并把兼容边界显式写入 config / docs / scripts。
- **`cases/requirements/` 是否只保留为迁移兼容层**：`P1-cases-path-alias-not-retired` 已确认旧目录仍被 resolver、审计脚本和测试 fixture 原生消费；需要维护者决定后续是继续长期保留 read-only alias，还是将其下放到一次性迁移工具并把主流程 / 回归测试彻底收口到 `cases/prds/`。
