# qa-flow 重构 Roadmap

> 最后更新：2026-04-17
> 本文档为整轮重构的索引入口。每阶段独立 spec → plan → 实施 → smoke → commit 循环。

---

## 原则

- **每阶段独立 CC 实例**：阶段结束时主 agent 必须生成"下阶段启动 prompt"，提示用户 `/clear` 或新开实例粘贴继续，以控制上下文成本
- **每阶段独立 spec**：产出于 `docs/refactor/specs/YYYY-MM-DD-<topic>-design.md`
- **每阶段独立 commit**：spec、实施、测试、文档分批 commit，smoke 验证通过后才算阶段完成
- **每阶段遵循"先调研 → 先方案 → 先对齐 → 再实施"**：未经用户批准的 spec 不得动手写代码

---

## 阶段索引

| # | 目标 | 状态 | Spec | 核心交付 |
| --- | --- | --- | --- | --- |
| **0** | 信息架构 + `rules/` 迁移 | ✅ DONE | [`2026-04-17-knowledge-architecture-design.md`](refactor/specs/2026-04-17-knowledge-architecture-design.md) | 三层边界定型、`preferences → rules` 迁移、`knowledge/` 空骨架、`knowledge-keeper` contract |
| **1** | `create-project` skill + `setup` 瘦身 + `knowledge-keeper` 实施 | ⏳ PENDING | — | 新 skill 创建、setup 移除项目管理步骤、knowledge-keeper 代码实施 |
| **2** | PRD 需求讨论阶段（目标 1.1） | ⏳ PENDING | — | 主 agent 亲自主持需求讨论、结构化 plan 模板、支持 `/clear` 重启 |
| **3** | UI 自动化（目标 1.3） | ⏳ PENDING | — | 技术调研、Playwright 工作流重构、Allure 报告、subagent 升级契约、多环境/多项目 session |
| **3.5** | skill 重排 | ⏳ PENDING | — | 删 `code-analysis`；新增 `hotfix-case-gen` / `bug-report` / `conflict-report`；`qa-flow` 菜单重排 |
| **4** | MD 用例策略矩阵（目标 1.2） | ⏳ PENDING | — | 源码/PRD/历史/知识库 多维度策略路由，替代三场景枚举 |
| **5** | 横切基础设施 | ⏳ PENDING | — | 断点续传强化、CLI 统一封装调研、`.env` 重组、Anthropic 最佳实践对齐 |
| **6** | 命名迁移 + README + 架构图 | ⏳ PENDING | — | `historys → history` 等批量改名、README 中英同步、drawio 架构图 |

---

## Skill 全景（目标态，11 个）

### 保留并优化（6）

| Skill | 变化 |
| --- | --- |
| `qa-flow` | 智能路由入口，菜单项随新增 skill 扩展并按频率重排 |
| `setup` | 瘦身（5 步，移除项目管理；该职责交给 `create-project`） |
| `test-case-gen` | Skill 不拆，内部 workflow 拆子模块（main / standardize / reverse-sync） |
| `ui-autotest` | Skill 不拆，按目标 1.3 大改（调研技术栈、引入 Allure、subagent 升级契约、多环境隔离、组件 helpers） |
| `xmind-editor` | 保持不变 |
| `playwright-cli` | 保持不变（Library 层） |

### 新增（5）

| Skill | 阶段 | 说明 |
| --- | --- | --- |
| `create-project` | 1 | 从 setup 拆出，负责可重复的项目创建 |
| `knowledge-keeper` | 1 | contract 在阶段 0 定型，代码在阶段 1 实施 |
| `hotfix-case-gen` | 3.5 | 从 `code-analysis` 拆出；禅道 Bug 链接直接触发 |
| `bug-report` | 3.5 | 从 `code-analysis` 拆出；内部分后端 / 前端分支 |
| `conflict-report` | 3.5 | 从 `code-analysis` 拆出；Git 冲突分析 |

### 删除（1）

| Skill | 阶段 | 说明 |
| --- | --- | --- |
| `code-analysis` | 3.5 | 五模式拆分后整体删除；"信息不足→追问"逻辑内化到各拆出 skill 的前置守卫 |

---

## 阶段切换约定

每阶段结束必须执行以下流程：

1. **单元测试全量通过**（`bun test ./.claude/scripts/__tests__`）
2. **smoke 验证通过**（阶段 spec 定义的 success criteria 全部对号入座）
3. **commit 完成**（可多次 atomic commit）
4. 主 agent **生成"下阶段启动 prompt"**（自包含，引用本 roadmap + 上阶段 spec + 下阶段 scope 摘要）
5. 主 agent 明确提示用户：
   > 「本阶段完成，建议 `/clear` 或新开 CC 实例，粘贴以下 prompt 继续阶段 X。」

---

## 待决策事项

（无 —— 整体设计已在阶段 0 讨论中对齐）

---

## 参考

- 原始重构提示词：当前对话（整体需求 + 9 大目标的源头）
- CLAUDE.md：项目约束与目录规范
- memory：`~/.claude/projects/-Users-poco-Projects-qa-flow/memory/` 下的长期偏好
