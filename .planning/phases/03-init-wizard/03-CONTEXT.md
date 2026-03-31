# Phase 3: Init Wizard - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

构建交互式 `using-qa-flow init` 向导，让新用户在空白项目上一键完成项目结构推断、config.json 生成和 CLAUDE.md 模板创建，无需阅读源码或手动配置。

具体交付物：
1. 可运行的 init 向导（在 using-qa-flow SKILL.md 中编排，通过 Claude 对话执行）
2. 生成语法合法、可直接被 test-case-generator 使用的 `config.json`
3. 生成含关键变量替换的 `CLAUDE.md` 模板
4. 支持 CSV/XMind 历史文件解析推断模块结构
5. 支持多模块、多版本场景（versioned: true/false）
6. 支持 re-init（已有 config.json 的增量更新场景）

</domain>

<decisions>
## Implementation Decisions

### 结构推断策略
- **D-01:** 采用**智能混合模式** — 先扫描项目目录，检测到有意义结构则用推断结果作为默认值展示确认；完全空目录时退化为纯问答引导
- **D-02:** 扫描采集五类信号：① `cases/` 下子目录名 → 推断模块 key；② PRD 文件名中版本号（如 `v6.4.10`）→ 推断版本化模块；③ `.xmind`/`.csv` 历史文件 → 辅助推断模块和层级；④ `.repos/` 下 git 仓库 → 推断需要源码分析能力；⑤ `assets/images/` 存在图片 → 推断 PRD 含图片
- **D-03:** 推断结果用 **Markdown 表格摘要**展示（列：模块 key / 是否版本化 / 路径 / 推断来源），用户整体确认后再写任何文件，扫描阶段不做写操作
- **D-04:** 用户发现摘要有误时，采用**向导内问答修正** — 逐项询问，用户输入新值，向导实时更新后重新展示确认表格

### 历史文件解析
- **D-05:** 解析触发采用**两者皆可模式** — 扫描阶段自动检测 `cases/history/` 下文件，同时在摘要确认后追问「还有其他历史文件要导入吗？」，支持用户主动提供路径
- **D-06:** 模块 key 推断采用**向导询问确认** — 先从文件名（正则去除日期前缀、版本号后缀）和文件内容（CSV 表头、XMind 根节点/L1 节点）提取候选名，展示「检测到模块名 yyy，请确认或输入正确 key」，用户最终拍板
- **D-07:** 多来源合并采用**分别展示再合并** — 先展示目录扫描推断结果，再单独展示来自历史文件解析的新增项或冲突项，用户逐项决定保留哪个版本

### Config 生成交互模式
- **D-08:** 采用**全量问答** — 向导逐一询问所有配置字段，不预设跳过任何字段
- **D-09:** 采用**功能分组顺序**：
  - ① 基础信息（project.name、displayName、casesRoot）
  - ② 模块配置（已在扫描/推断阶段完成，此步骤做最终确认）
  - ③ 源码仓库（repos、branchMapping、stackTrace）
  - ④ 集成工具（lanhu MCP 配置：runtimePath、envFile 等）
  - ⑤ 最终确认写入
- **D-10:** 写入前用**纯文字摘要确认** — 按分组列出所有字段的最终值，问「确认写入吗？」，不展示完整 JSON

### CLAUDE.md 模板生成
- **D-11:** 采用**模板 + 占位符替换** — 使用固定标准模板，init 完成时将关键变量（项目名、模块路径示例、触发词中的模块名）自动替换为用户真实配置值
- **D-12:** Skill 快速示例保留**通用占位符格式** — 示例写成 `为 <module-key> 生成测试用例` 形式，不填入具体模块名
- **D-13 (Agent's Discretion):** CLAUDE.md 中 `repos` 条件块的处理方式（始终写入完整条件块 vs 按 config.repos 是否配置裁剪）交给 Claude 实现时决定

### Re-init / 增量更新
- **D-14:** 检测到已有 `config.json` 时**先问意图** — 询问用户「完整重新配置」还是「只更新某些项」
- **D-15:** 选择增量更新时，粒度为**功能组** — 展示五个功能组让用户勾选要重新配置的，未选组保持现有值不变
- **D-16:** 每次 re-init 都**询问是否同时更新 CLAUDE.md** — 不默认覆盖，用户明确确认后才重新生成

### Agent's Discretion
- CLAUDE.md 中 repos 条件块的写入策略（D-13）
- `cases/history/` 内文件的具体解析逻辑（XMind 节点深度映射、CSV 表头列识别规则）
- 模块 key 候选名的中文转英文 slug 策略
- init 向导的具体实现载体（新增 Node.js 脚本 vs 纯 Claude 对话编排）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目定义
- `.planning/PROJECT.md` — 项目愿景、核心价值、技术栈约束（Node.js ESM，无额外运行时）
- `.planning/REQUIREMENTS.md` — INIT-01 至 INIT-05 需求定义和验收标准
- `.planning/ROADMAP.md` — Phase 3 成功标准（4 条 must-be-TRUE 条件）

### 前序阶段上下文
- `.planning/phases/01-generalization-refactor/01-CONTEXT.md` — Config schema 泛化决策、手写验证风格（无 Ajv/Zod）
- `.planning/phases/02-project-structure-shared-scripts/02-CONTEXT.md` — resolveModulePath 约定路径、config/ 退役、requireNonEmptyModules 引导入口

### 核心代码（必读）
- `.claude/shared/scripts/load-config.mjs` — loadConfig()、resolveModulePath()、requireNonEmptyModules() 实现；理解 modules.versioned 字段和 casesRoot 约定
- `.claude/config.json` — 当前 config schema 的完整字段清单（init 向导需生成与此兼容的 config）
- `.claude/skills/using-qa-flow/SKILL.md` — 现有 init 5 步流程（Python 环境/依赖/Node.js/源码仓库/验证），init 向导是对「Step 0 配置」的前置扩展

### CLAUDE.md 模板参考
- `CLAUDE.md` — 现有主编排文件结构，init 向导生成的 CLAUDE.md 需与此格式对齐，关键变量占位符替换后结构应一致

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `load-config.mjs:resolveModulePath()` — 路径约定逻辑，init 生成的 config 必须与此 API 兼容
- `load-config.mjs:requireNonEmptyModules()` — 空模块时的错误提示，与 init 向导形成引导闭环
- `load-config.mjs:loadConfigFromPath()` — init 向导 re-init 场景可用此函数加载已有 config 作为初始值
- `.claude/skills/using-qa-flow/SKILL.md` — 现有 5 步 init 流程，新 config 生成向导在此基础上扩展（增加 Step 0 或替换现有 Step）

### Established Patterns
- Config schema 采用手写验证，无外部验证库依赖（Phase 1 决策，必须延续）
- 空模块 `modules:{}` 是合法 config，但脚本会报错引导运行 init（requireNonEmptyModules 模式）
- 所有路径通过 config 字段解析，脚本中零硬编码路径段（Phase 2 决策，新增 init 脚本需遵循）
- ESM 模块系统（.mjs 文件），Node.js v25，不引入新运行时

### Integration Points
- init 向导结束后写入 `.claude/config.json`
- init 向导结束后写入项目根目录 `CLAUDE.md`
- 生成的 config 必须能被 `loadConfig()` 无错误读取（字段完整性由 init 保证）
- using-qa-flow SKILL.md 中的 init 入口需更新，引导用户先完成 config 设置再进行环境初始化

</code_context>

<specifics>
## Specific Ideas

- 向导展示推断摘要时用 Markdown 表格格式（| 模块 key | 版本化 | 路径 | 来源 |），与 Claude 代码风格一致易读
- 功能分组问答采用「标题 + 逐字段」模式，每组开始前展示组名和说明（如「### 源码仓库配置\n如果你需要分析后端代码，请提供仓库路径...」）
- Re-init 增量更新时，未选组的字段值原样保留，不要求用户重新输入
- 历史文件解析的中文模块名 → 英文 slug 转换（如「信永中和」→ `xyzh`）需要用户确认，不能全自动

</specifics>

<deferred>
## Deferred Ideas

- 生成 `.env.example` 文件（lanhu MCP token 模板）— 属于 Phase 5 IM 通知或 Phase 6 文档范畴
- init 完成后自动触发 archive-converter 将检测到的历史 CSV/XMind 批量归档 — 可作为 Phase 4 Skills 重设计的一部分

</deferred>

---

*Phase: 03-init-wizard*
*Context gathered: 2026-03-31*
