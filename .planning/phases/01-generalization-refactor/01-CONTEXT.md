# Phase 1: Generalization Refactor - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

移除所有 DTStack 特定耦合（config、rules、prompts、scripts），使 main 分支在空白配置下端到端可运行。DTStack 业务数据迁移至 dtstack-data 分支保留，不删除。

</domain>

<decisions>
## Implementation Decisions

### Config Schema 设计
- `type` 字段处理方式 → Claude's Discretion
- `repos` 和 `stackTrace` 保留为可选字段，默认值为空对象 `{}`，用户有源码仓库时可自行配置
- DTStack 专属字段泛化命名：`zentaoId` → `trackerId`，`repoBranchMapping` → `branchMapping`，`dataAssetsVersionMap` → 移除或泛化
- 最小必填字段范围 → Claude's Discretion（基于实际使用场景判断）

### 分支迁移策略
- 迁移范围 → Claude's Discretion（根据实际耦合程度决定哪些文件迁走、哪些就地改写）
- CLAUDE.md 采用条件化处理：DTStack 特定内容（如「DTStack 与 XYZH 分流规则」）改为条件语法——「当 config 配置了 X 时」自动启用，而非硬编码
- dtstack-data 分支创建时机 → Claude's Discretion

### Rules 通用化方案
- 示例风格采用变量化模板：用 `${module}`、`${table}`、`${datasource}` 等占位符，用户初始化时自动填充为真实值
- test-case-writing.md 的「DTStack 追加规则」泛化为条件块：当 config 中配置了 `repos` 字段时自动启用「源码优先」「SQL 前置条件补全」等规则
- repo-safety.md 中的 Java 包名→仓库硬编码映射表删除，改为「参考 config.json 的 stackTrace 字段」的指引

### 校验与错误处理
- 验证库选择 → Claude's Discretion
- 错误提示风格 → Claude's Discretion
- 严格/宽松模式 → Claude's Discretion

### Claude's Discretion
- Config schema 的 `type` 字段设计（删除、保留可选、或其他方案）
- 最小必填字段的具体边界
- DTStack 数据迁移到 dtstack-data 分支的具体文件清单和时机
- loadConfig() 的验证库选择（Ajv / Zod / 手写）
- 缺失字段的错误提示风格（一次性全部 vs 逐个）
- Schema 验证的严格程度（是否允许额外字段）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目定义
- `.planning/PROJECT.md` — 项目愿景、核心价值、技术栈、约束条件、关键决策
- `.planning/REQUIREMENTS.md` — GEN-01 至 GEN-06 需求定义和验收标准
- `.planning/ROADMAP.md` — Phase 1 成功标准（5 条 must-be-TRUE 条件）

### 当前耦合点（需要改写的文件）
- `.claude/config.json` — 6 个 DTStack 模块、18 个仓库路径、8 个 Java 包名映射、禅道 ID
- `.claude/rules/test-case-writing.md` — 7 处 DTStack 引用（源码优先、Doris/Hive/SparkThrift 前置条件）
- `.claude/rules/repo-safety.md` — 10 处 DTStack 引用（Java 包名→仓库映射表）
- `.claude/rules/archive-format.md` — 8 处 DTStack 引用（版本目录、DTStack 特殊规则）
- `.claude/rules/directory-naming.md` — 7 处 DTStack 引用（模块 key 映射表）
- `.claude/rules/xmind-output.md` — 4 处 DTStack 引用（DTStack 样例驱动规则）
- `.claude/shared/scripts/load-config.mjs` — `getDtstackModules()` 函数
- `.claude/shared/scripts/output-naming-contracts.mjs` — 4 处 DTStack 引用
- `CLAUDE.md` — DTStack 与 XYZH 分流规则、DTStack 特殊规则等段落

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `load-config.mjs` — 配置加载和缓存机制可复用，`loadConfig()`、`getModuleMap()`、`resolveWorkspacePath()` 是通用的
- `output-naming-contracts.mjs` — 命名约定逻辑框架可复用，只需替换 DTStack 特定分支
- `front-matter-utils.mjs` — Front-matter 解析工具完全通用，无需修改
- `audit-md-frontmatter.mjs` — 审计脚本框架可复用

### Established Patterns
- 配置集中化：所有路径通过 `config.json` 解析，脚本不硬编码路径（除 DTStack 特定部分）
- ESM 模块：所有 shared scripts 使用 ES Module 格式
- 分层结构：Rules 文件按职责分离（目录命名、归档格式、XMind 输出、用例编写、仓库安全、图片规范）

### Integration Points
- `load-config.mjs` 是所有脚本的配置入口 — 改动此文件影响全部下游脚本
- `CLAUDE.md` 是 Claude Code 的主行为入口 — 改动影响所有 Skill 的执行行为
- `config.json` 被 Skills 和 shared scripts 双重引用

</code_context>

<specifics>
## Specific Ideas

- 变量化模板示例：`${module}` → 用户项目的模块名，`${table}` → 用户项目的数据表名，`${datasource}` → 用户项目的数据源类型
- CLAUDE.md 条件化语法示例：「当 `config.repos` 非空时，启用源码仓库安全规则」而非「.repos/ 下的所有仓库为只读引用」
- PROJECT.md 已决定通用示例使用电商平台场景

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-generalization-refactor*
*Context gathered: 2026-03-31*
