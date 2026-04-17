# qa-flow 全面审查与重构 —— 工作提示词

> 用途：在一个干净的 Claude Code 实例中，作为起始提示词粘贴给主 agent，启动对 `qa-flow` 项目的系统性审查与重构工作。
> 适用对象：主 agent（不要把整个任务一次性丢给 subagent）。
> 基本原则：**有任何疑问都必须向我确认，并同时给出你自己的推荐选项；不得推测、不得假设。**

---

## 一、项目背景

`qa-flow` 是一个 QA 测试工作流框架，当前由若干 skills（`test-case-gen`、`ui-autotest`、`code-analysis`、`xmind-editor`、`setup`、`qa-flow` 菜单等）组成，支持多项目工作区（`workspace/{project}/`）。

我在长期实际使用中暴露了大量问题，需要你配合我做一次**全方位的审查与重构**。这不是一次小修小补，而是一次结构性的升级。

请先阅读以下材料建立全局认识：
- `CLAUDE.md`（项目根）—— 核心约束与目录规范
- `README.md` / `README.en.md` / `README.zh.md`（若存在）
- `.claude/skills/` 下所有 skill 的 `SKILL.md`
- `.claude/scripts/` 下的 ts 脚本与测试
- `workspace/` 目录组织
- `preferences/` 与 `workspace/{project}/preferences/`
- `.env` / `.env.example`
- `memory/MEMORY.md`（用户长期偏好）

不要直接开始改代码。**先做调研、先给方案、先对齐**。

---

## 二、重构目标（按重要性排序）

### 目标 1：三大核心工作流的系统性重构 🔥

#### 1.1 PRD 处理工作流（蓝湖 PRD → 结构化 PRD）

当前痛点：
- PRD 输出模版不统一
- 步骤描述存在歧义：**"头脑风暴阶段"这个命名是错的**，应该叫 **"需求讨论阶段"**
- 需求讨论阶段目前交给了 subagent 处理 —— **这是错误的**

重构要求：
- **需求讨论阶段必须由主 agent 亲自执行**，不得派发给 subagent。理由：这是最关键的理解对齐环节，主 agent 才拥有与用户直接对话的上下文。
- 讨论结束后，**生成一份结构化的 plan 文档**（路径明确、模板统一），然后**主动停下来**，向用户呈现文档路径并提供两个选项：
  1. **当前窗口继续**执行后续的用例生成
  2. **新开一个 CC 实例或 /clear 之后**再继续 —— 此时输出一份**简短、自包含的 prompt**，供用户粘贴到干净上下文中
- 模板要统一、字段要收敛，避免每次格式漂移。
- 参考 `superpowers` 插件的 brainstorming + plan 思路，但命名必须落在"需求讨论"语境下。

#### 1.2 MD 用例生成工作流（`test-case-gen`）

当前痛点：用例生成策略是"一刀切"的，没有根据项目可用资源做分支。

重构要求：**明确三种场景分支**，在 skill 中显式路由：

| 场景 | 可用资源 | 参考优先级 | 用例详细程度 |
|------|----------|-----------|------------|
| A | 源码 + 知识库 + PRD + 历史用例 | 知识库 > 源码 = PRD > 历史用例 | 详细、步骤清晰、可读性高；遵循编写规则（MD/XMind 换行、表单填写规范等） |
| B（最常见）| 源码（仅历史功能，新功能代码未开发）+ PRD + 历史用例 + 知识库 | PRD（目标）→ 源码（理解现有）→ 历史用例（参考） | 中等详细，结合 PRD 与现有源码推断 |
| C | 仅 PRD + 历史用例（无源码、无知识库）| PRD + 历史 PRD + 历史用例 | **不按内置规则那么详细**，否则在无源码参照下根本无法执行 |

场景判定与规则落地机制：
- `create-project` 创建项目时，通过问答收集"有无源码 / 知识库 / PRD / 历史用例"
- 将分支策略**写入对应项目的规则文件**（`workspace/{project}/preferences/` 或项目级 CLAUDE.md）
- `test-case-gen` 运行时**先读取项目规则**再选分支

#### 1.3 UI 自动化工作流（`ui-autotest`：MD 用例 → Playwright）

当前痛点（**最严重**，请重点重构）：

1. **Subagent 死循环**：Sonnet subagent 找不到 DOM 就死磕、不向主 agent 报告、不向用户反馈，浪费大量 token。
2. **机械对齐按钮文案**：MD 用例中的文案与前端不一致时，subagent 一直调试，而没有直接参考**源码中的按钮文案/DOM 结构**来对齐。
3. **多环境**：本地、客户测试、客户生产等多套环境需要验证，当前 session 管理难以应对。
4. **多项目并行**：经常同时对多个项目的需求进行脚本生成与调试，单 session 管理混乱。
5. **报告可读性差**：应该替换为 **Allure**，每条用例展示步骤、预期、截图，方便用户验收。
6. **组件交互没有沉淀**：Ant Design 等常用组件（Select、DatePicker、Table、Modal、Upload、Tree 等）的交互应**封装到工具类/helpers 中**复用。
7. **问题经验未沉淀**：同一个调试问题反复踩，解决后没写回知识库。

重构要求：
- **先做调研**：针对"数据中台类复杂页面的 UI 自动化"调研现状，给出结论：是换技术栈（Cypress/WebDriverIO/Codegen/自研 DSL…）还是优化 Playwright 工作流。给我**对比表 + 推荐 + 风险**。
- **硬性超时与升级机制**：Subagent 对同一选择器/DOM 连续失败 N 次（建议 2~3）必须**停止死磕**，主动向主 agent 汇报（结构化报告：尝试了什么、DOM snapshot、源码对照结果），由主 agent 决策：继续、换策略、或向用户确认。
- **源码优先对齐**：遇到文案/DOM 不匹配时，**默认去源码里 grep 真实文案/testid**，不要硬啃 MD。把这条作为 fixer 的第一原则。
- **多环境架构复用**（项目里已有 ACTIVE_ENV，见 memory）：session/进度/报告**按环境 + 项目隔离**到不同目录。
- **多项目并行**：session 设计要支持 `{project}/{env}/{feature}` 三维命名空间。
- **Allure 报告**：集成 allure-playwright，每步附截图、期望、实际、网络/控制台日志。
- **组件 helpers**：建立 `helpers/antd/`（或更通用的 `helpers/ui-kit/`），按组件分文件封装，主 agent 在发现重复交互模式时负责固化（与 memory 中的 fixer 批处理策略一致）。
- **问题沉淀**：每次 fixer 修复后，把"问题 → 根因 → 方案"写入**项目知识库**（见目标 2），下次优先检索。

### 目标 2：新增 `create-project` skill 🔥

用于在 `workspace/` 下创建新项目并初始化全部子结构。要点：

- **使用 AskUserQuestion 工具**，逐项询问用户（给出推荐默认值）：
  - 项目名称、中文描述
  - 是否有源码仓库？（若有：仓库地址、分支、`.repos/` 映射、是否只读锁）
  - 是否有知识库？（若无，自动创建空目录并解释用途）
  - 是否有 PRD？（蓝湖/本地/无）
  - 是否有历史用例？（XMind/CSV/MD）
  - 运行环境列表与对应 URL（本地/测试/生产…）
  - 登录凭证存放策略（`.env` 变量名约定）
  - 默认用例生成场景（A/B/C，见目标 1.2）
- 生成结果：
  - `workspace/{name}/` 完整子目录（prds, xmind, archive, issues, reports, historys, tests, preferences, **knowledge/**, .repos/, .temp/）
  - `workspace/{name}/preferences/` 写入分支策略、换行规范、组件交互偏好等
  - `workspace/{name}/CLAUDE.md`（项目级）记录关键约束
  - 向 `config.json` 的 `projects.{name}` 写入配置
  - 向 `.env.example` 追加该项目需要的占位变量（不写真实值）

### 目标 3：知识库体系（`workspace/{project}/knowledge/`）

当前项目**没有知识库**。需要新建：

- 存放内容：业务规则、主流程说明、术语表、常见 UI 交互约定、已踩过的坑（UI 自动化问题沉淀）
- 写入时机：
  1. `create-project` 初始化时
  2. 后续使用中，用户反馈/反驳时（主 agent 主动问"是否沉淀到知识库？"）
  3. 主 agent 从源码中提炼业务规则时 —— **必须用 AskUserQuestion 向用户确认正确性后再写入**
- 用例生成时**优先读取**知识库以建立主流程认知

### 目标 4：断点续传 / 任务可视化

所有复杂工作流（用例生成、脚本实现）必须支持断点续传：
- Plan 文档必须**足够详细**，列出每个任务
- 配套一个 **JSON 任务状态文件**（位置、schema 由你设计并在提示词中明示），subagent 通过脚本对 JSON 任务**查询 / 更新 / 新增**
- 脚本命令**明确写进 skill 的 SKILL.md**（不要让 subagent 自行推断命令）
- 任务状态要能可视化（CLI 命令输出表格或进度条）

### 目标 5：CLI 统一封装

调研：把 `.claude/scripts/` 下所有脚本**统一封装到一个 CLI 命令**是否合适（如 `qaflow <subcommand> --args`）。
- 给出优缺点、迁移成本、子命令设计建议
- **先给方案让我确认再动手**

### 目标 6：`.env` / `.env.example` 整理

当前管理混乱。请：
- 审计所有 `.env` 键
- 按"通用 / 项目级 / 环境级"分组
- 统一命名规范（如 `QAFLOW_{PROJECT}_{ENV}_{KEY}`，由你提方案）
- 更新 `.env.example` 对齐
- 记得遵循 CLAUDE.md 的"禁止硬编码"规则

### 目标 7：命名 / 路径 / 引用 优化

- 工作目录命名（`workspace/` 下的各子目录是否都合理？`historys` 是否应改为 `history`？）
- skill 命名、script 文件命名、变量命名的一致性
- 所有文档/脚本中的**引用路径**梳理（死链、指向错误路径）
- 提出变更清单，**先让我确认再批量改**

### 目标 8：README 与架构/流程图

- 更新 `README.md`（中文）与 `README.en.md`（英文），保持同步
- 使用 `/Users/poco/Projects/CLI-Anything/drawio` 这个 CLI 工具，**为每个核心工作流绘制**：
  - 整体架构图
  - PRD 工作流
  - MD 用例生成工作流（三种场景分支）
  - UI 自动化工作流（含多环境、多项目、断点续传、Allure）
  - create-project 流程
- 图片输出到 `docs/diagrams/`，README 中相对路径引用

### 目标 9：Anthropic 官方最佳实践对齐

所有 skill/agent 提示词按 Anthropic 最佳实践审查：
- 职责单一、前置条件明确、输出格式契约化
- 主 agent 与 subagent 的分工边界清晰（参考 memory 中"主 agent 禁止自行调试"）
- 工具白名单精确（只给必须的）
- 错误升级路径明确（subagent 何时必须回报）
- Prompt 结构：Role → Context → Task → Constraints → Output format → Examples

---

## 三、工作方式约定（非常重要）

1. **先调研、再方案、再动手**。每一个目标都先出方案让我确认。
2. **有任何疑问立刻用 AskUserQuestion 问我，并给出你的推荐选项**。严禁推测、严禁假设。
3. **主 agent 不做脏活**：具体的调研检索、代码扫描、文件改动可以派发 subagent；但**需求讨论、方案决策、与我对话**必须主 agent 亲自做。
4. **保护上下文**：大块调研派 Explore/general-purpose subagent，返回精简结论。
5. **每一阶段都用 TodoWrite 管理任务**，状态可视化。
6. **不破坏现有约束**：
   - `workspace/{project}/.repos/` 只读
   - 禁止硬编码路径/凭证
   - 不创建不必要的 `.md` 文档（除非任务本身要求）
   - 脚本改动必须同步测试并全量跑通
7. **分阶段交付 + 分阶段提交**，每完成一个目标做一次小范围 review 再进入下一个。
8. **回到 memory**：开始前先读 `memory/MEMORY.md`，结束时把有价值的新偏好沉淀回去。

---

## 四、启动步骤（建议的第一轮动作）

1. 读完上文 + 阅读项目关键文件（CLAUDE.md、README、skills、scripts、memory）
2. 用 TodoWrite 列出 9 个目标
3. 从**目标 1.1（PRD 需求讨论阶段）**开始，或先做**目标 3（知识库）+ 目标 2（create-project）** 打底 —— 你给推荐并问我
4. 对**目标 1.3（UI 自动化调研）**尽早开分支调研，因为结论影响大
5. 每进入一个新目标前，先给我一份**该目标的方案大纲**（1 页以内），我确认后再动手

---

## 五、验收标准

- 每个目标都有可检验的产出（代码、文档、图、测试）
- README 中英同步、图与文一致
- 所有 skill 可独立被触发并通过一遍 smoke 流程
- 单元测试全量通过
- 没有硬编码、没有脏数据残留、没有死链
- 关键决策都留有记录（方案文档 / commit message / memory）

---

**现在，请开始。先告诉我你阅读完项目后的整体理解，以及你建议的重构推进顺序，然后等我确认再进入第一个目标。**
