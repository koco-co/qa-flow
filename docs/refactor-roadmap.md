# kata 重构 Roadmap

> 最后更新：2026-04-19（phase 8 完成）
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
| **1** | `create-project` skill + `setup` 瘦身 + `knowledge-keeper` 实施 | ✅ DONE | [`2026-04-17-knowledge-keeper-design.md`](refactor/specs/2026-04-17-knowledge-keeper-design.md) / [`2026-04-18-create-project-skill-design.md`](refactor/specs/2026-04-18-create-project-skill-design.md) / [`2026-04-19-phase1-completeness-audit-design.md`](refactor/specs/2026-04-19-phase1-completeness-audit-design.md) | 三子目标代码随 phase 0/6 合流落地；phase 7 补齐 smoke 验证与审计报告；init-wizard 文案修正；824 测试绿 |
| **2** | PRD 需求讨论阶段（目标 1.1） | ✅ DONE | [`2026-04-18-prd-discussion-design.md`](refactor/specs/2026-04-18-prd-discussion-design.md) | 主 agent 主持讨论、`discuss.ts` CLI、`plan.md` 落盘、transform 简化、653 测试绿 |
| **3** | UI 自动化（目标 1.3） | ✅ DONE | [`2026-04-18-ui-autotest-evolution-design.md`](refactor/specs/2026-04-18-ui-autotest-evolution-design.md) | pattern-analyzer-agent + 步骤 5.5 共性收敛、Allure 完全替换 monocart、session 多项目隔离、helpers 拆 5 文件、686 测试绿 |
| **3.5** | skill 重排 | ✅ DONE | [`2026-04-18-skill-reorganization-design.md`](refactor/specs/2026-04-18-skill-reorganization-design.md) | 删 `code-analysis`；新增 `hotfix-case-gen` / `bug-report` / `conflict-report`；三个 skill 各自内化信息不足前置守卫；`kata` 菜单按频率重排；runtime 辅助（hooks / model-tiers / zentao plugin / templates footer）全部同步；686 测试绿 |
| **4** | MD 用例策略矩阵（目标 1.2） | ✅ DONE | [`2026-04-18-md-case-strategy-matrix-design.md`](refactor/specs/2026-04-18-md-case-strategy-matrix-design.md) | 4 维信号探针（case-signal-analyzer.ts）+ 5 策略派发（case-strategy-resolver.ts）+ probe 节点（10 节点 workflow）+ knowledge 注入 writer-context-builder + S5 外转到 hotfix-case-gen；plan.md frontmatter 新增 strategy 字段、kata-state 新增 strategy_resolution；785 测试绿 |
| **5** | 横切基础设施 | ✅ DONE | [`2026-04-19-cross-cutting-infrastructure-design.md`](refactor/specs/2026-04-19-cross-cutting-infrastructure-design.md) | `lib/cli-runner.ts` 工厂（commander 封装 + initEnv + logger + onError）；27/28 CLI 迁移（`report-to-pdf` 保留）；`.env` 三段式（`.env` + `.env.envs` + `.env.local`）；`env-schema` 增 `validateActiveEnv`；state.ts 多环境隔离（`.kata-state-{slug}-{env}.json`）+ 自动迁移 + plan.md 仲裁；`logger.ts` 提升 `initLogLevel` 为 public API（LOG_LEVEL 支持）；821 测试绿 |
| **6** | 命名迁移 + README + 架构图 | ✅ DONE | [`2026-04-19-naming-readme-diagrams-design.md`](refactor/specs/2026-04-19-naming-readme-diagrams-design.md) | `historys → history` 全仓统一 + legacy auto-rename；README 中英同步 phase 0-5 终态 + 新增「横切基础设施」章节；architecture / test-case-gen / ui-autotest drawio 重绘；删除 code-analysis 僵尸图；823 测试绿 |
| **7** | Phase 1 完备性审计 | ✅ DONE | [`2026-04-19-phase1-completeness-audit-design.md`](refactor/specs/2026-04-19-phase1-completeness-audit-design.md) | Smoke 验证归档（knowledge-keeper / create-project / legacy historys 三链路）+ init-wizard `/using-kata init` → `/kata init` 文案补丁 + roadmap 状态对齐；整轮重构主干 0-7 闭环；824 测试绿 |
| **8** | `test-case-gen` / `ui-autotest` workflow 目录拆分 | ✅ DONE | [`2026-04-19-phase8-workflow-split-design.md`](refactor/specs/2026-04-19-phase8-workflow-split-design.md) | 回填 Phase 0 §Skill 全景承诺：`test-case-gen` 按 scenario 拆 `workflow/{main,standardize,reverse-sync}.md`（SKILL.md 1056→233 行）；`ui-autotest` 按痛点 step 拆 `workflow/step-{1,4,5,5.5,8}.md`（SKILL.md 920→455 行）；零语义改动，824 测试绿 |

---

## Skill 全景（目标态，11 个）

### 保留并优化（6）

| Skill | 变化 |
| --- | --- |
| `kata` | 智能路由入口，菜单项随新增 skill 扩展并按频率重排 |
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
- memory：`~/.claude/projects/-Users-poco-Projects-kata/memory/` 下的长期偏好
