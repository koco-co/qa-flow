# setup Skill 瘦身设计文档

**Phase**: 1 · `create-project` skill + `setup` 瘦身 + `knowledge-keeper` 实施（子目标 3 of 3）
**Date**: 2026-04-18
**Status**: Draft — awaiting user review
**Parent Roadmap**: [`../../refactor-roadmap.md`](../../refactor-roadmap.md)
**Upstream Architecture**: [`2026-04-17-knowledge-architecture-design.md`](./2026-04-17-knowledge-architecture-design.md)
**Sibling (Sub-goal 1)**: [`2026-04-17-knowledge-keeper-design.md`](./2026-04-17-knowledge-keeper-design.md)
**Sibling (Sub-goal 2)**: [`2026-04-18-create-project-skill-design.md`](./2026-04-18-create-project-skill-design.md)

---

## 1. Context

Phase 1 子目标 1（`knowledge-keeper`）与子目标 2（`create-project`）已交付：

- `knowledge-keeper` 接管业务知识层的全部读写（7 actions、Phase 0 骨架兼容、551 测试绿）
- `create-project` 接管"项目诞生"的全部职责（scan / create / clone-repo、模板复刻、config.json 注册、链式 `knowledge-keeper index`、604 测试绿）

`setup` skill（`.claude/skills/setup/SKILL.md`，283 行、6 步）当前仍承担：

| 步骤 | 当前职责 | 现状评估 |
|---|---|---|
| 1 | 环境扫描（Node / Bun / config.json / .env / 核心脚本） | ✅ 仍属 setup 唯一职责 |
| 2 | 项目管理（扫已有项目、新建、`mkdir -p`、注册 config.json） | ❌ 与 create-project 重叠 100% |
| 3 | 配置工作区（同上 mkdir、写 `.env`） | ❌ 骨架由 create-project 复刻；`.env WORKSPACE_DIR` 与 create-project 任一职责无冲突，但写入语义错位（应在创建项目时一并完成） |
| 4 | 配置源码仓库（init-wizard.ts clone 子命令） | ❌ clone 子命令已迁出（子目标 2）；交互块与 create-project A6 重叠 100% |
| 5 | 配置插件（扫 `plugins/*/plugin.json` + 引导填 `.env`） | ✅ 仍属 setup 唯一职责 |
| 6 | 验证汇总（init-wizard.ts verify） | ✅ 仍属 setup 唯一职责 |

衍生问题：

- `.claude/skills/setup/references/repo-setup.md`（84 行）描述的 clone 命令已废止（init-wizard.ts 的 clone 子命令已迁到 `.claude/scripts/create-project.ts`）
- 步骤 4 的 `init-wizard.ts clone` 调用样例无法运行（命令不存在）
- 用户在初始化场景下被迫同时回答"环境是否就绪 + 是否新建项目 + 是否克隆仓库"三个语义不同的问题，认知负担高
- `init-wizard.ts` 的 `scan` / `verify` 子命令仍 100% 健康，仅需 SKILL 文档层瘦身，无需改 TS 代码

子目标 3 把 `setup` 收敛为"环境健康检查向导"：只关心 `qa-flow` 自身能不能跑（环境 + 插件 + 验证），项目级的"骨架 / 仓库"全部转交 `create-project`。

---

## 2. Goals

1. `setup` SKILL.md 瘦身为 4 步：scan → route-to-create-project → plugin-config → verify
2. 删除步骤 2「项目管理」交互块（A/B 选项），改为「检测到无项目 → 引导用户调用 `/create-project`」的路由提示
3. 删除步骤 3「配置工作区」整步（mkdir / 目录树 / `.env WORKSPACE_DIR` 三段全删，骨架交 create-project）
4. 删除步骤 4「配置源码仓库」交互块（C 选项 + add/skip 循环），改为「需要克隆仓库 → 引导用户调用 `/create-project clone-repo`」的路由提示
5. 删除 `references/repo-setup.md`（核心信息已在 create-project skill；只读规则在 `.claude/rules/repo-safety.md`）
6. 保留步骤 1 / 5 / 6 的执行逻辑、CLI 调用、交互文案，仅微调编号
7. 更新 `setup` 的 `description` 与 `argument-hint`，反映 4 步与新职责
8. `init-wizard.ts` 的 `scan` / `verify` 子命令、纯函数、单测**保持不变**（避免回归既有 551+604 测试）
9. Smoke：单步跳转复跑 `setup 1` / `setup 3`（新插件配置）/ `setup 4`（新验证）+ create-project 联动 + `init-wizard.ts scan/verify` 输出对比无差异

---

## 3. Non-Goals

- `init-wizard.ts` 的代码改动（含 `scan` / `verify` 行为、JSON 结构）→ 本子目标只动文档与 SKILL.md，不改 TS
- `setup` 调用链的下游 skill（`qa-flow` 菜单 / `using-qa-flow init`）的描述改写 → 由 Phase 3.5 的「skill 重排」统一处理；本子目标只改 setup 自身
- `.env WORKSPACE_DIR` 字段的清理或迁移 → 该字段已废弃语义（workspace 路径常量化于 `paths.ts`），但其他地方可能引用，本期仅"setup 不再写入"，不删字段
- 项目级偏好加载（旧步骤 2.4）→ 由各业务 skill（`test-case-gen` / `ui-autotest`）在选 project 后自行调 `rule-loader.ts load --project`，setup 不再代劳
- create-project / knowledge-keeper / 其他脚本 → 不动
- `setup` 的整 skill 删除 → 不删；环境健康检查与插件引导仍是合理需求

---

## 4. Architecture

### 4.1 SKILL 职责重划

```
┌─────────────── 旧 setup（6 步） ───────────────┐
│  1. 检测环境          ✓ 保留                    │
│  2. 项目管理          ✗ 转交 create-project     │
│  3. 配置工作区        ✗ 转交 create-project     │
│  4. 配置源码仓库      ✗ 转交 create-project     │
│  5. 配置插件          ✓ 保留（编号 → 3）        │
│  6. 验证汇总          ✓ 保留（编号 → 4）        │
└─────────────────────────────────────────────────┘

           ▼  瘦身  ▼

┌─────────────── 新 setup（4 步） ───────────────┐
│  1. 检测环境          init-wizard.ts scan       │
│  2. 路由到 create-project（条件式提示）         │
│  3. 配置插件          .env 引导                 │
│  4. 验证汇总          init-wizard.ts verify     │
└─────────────────────────────────────────────────┘
```

### 4.2 步骤 2「路由到 create-project」语义

`setup` 不再代理项目创建，但仍然有义务在「环境就绪后、插件配置前」提醒用户：当前 `workspace/` 是否有可用项目？是否需要克隆源码仓库？

该步骤只做**检测 + 提示**，不做任何写操作：

| 检测项 | 来源 | 行为 |
|---|---|---|
| 已有项目列表 | 复用 `init-wizard.ts scan` 的 `projects` 字段 | 列出；为空时建议 `/create-project` |
| 任一项目的 `.repos/` 是否为空 | 复用 `init-wizard.ts scan` 的 `repos` 字段（按项目分组） | 全空时建议 `/create-project clone-repo` |
| 是否需要追加新项目 | 用户主观需求 | 引导命令而非交互 AskUser |

文案模板（详见 §5.2）以**"提示 + 命令样例"**形式呈现，不出现 `[选项 1] [选项 2]` 式的强制选择，避免与 create-project 自身的 AskUserQuestion 重复发问。

### 4.3 与 create-project 的边界（不变量）

| 维度 | setup 不做 | create-project 做 |
|---|---|---|
| `mkdir -p workspace/{project}/...` | ✅ | ✅ |
| `templates/project-skeleton/` 复刻 | ✅ | ✅ |
| `config.json projects.{name}` 注册 | ✅ | ✅ |
| `knowledge-keeper index` 链式调用 | ✅ | ✅ |
| `.repos/{group}/{repo}/` git clone | ✅ | ✅ |
| 项目级 rules 加载 | ✅（不再代劳） | ✅（自身需要时） |
| 环境健康检查 | ✅ | ✅（不感知） |
| 插件 `.env` 引导 | ✅ | ✅（不感知） |
| 验证汇总表 | ✅ | ✅（不感知） |

任何"创建文件 / 写 config.json / git clone"动作 100% 归 create-project；setup 只做"读 + 提示 + 调 init-wizard"。

### 4.4 init-wizard.ts 不变量

- `scan` 子命令：JSON 结构不变（`projects` / `repos` 字段已被 setup 步骤 2 复用）
- `verify` 子命令：检查项不变；本子目标**不**新增"项目骨架完整性"检查（属于 create-project 的 scan 职责，避免重叠）
- 现有单测：`.claude/skills/setup/scripts/__tests__/init-wizard.test.ts`（若存在）保持不变；本子目标只在「smoke 验证」阶段确认输出无差异

---

## 5. SKILL.md 目标态

### 5.1 frontmatter 与前置加载

```markdown
---
name: setup
description: "qa-flow 环境健康检查向导。4 步完成环境扫描、项目路由、插件配置和验证汇总。项目骨架与源码仓库由 create-project 接管。触发词：环境检查、健康检查、init、setup。"
argument-hint: "[step-number]"
---

<!-- 前置加载 -->

执行前先加载全局规则并读取基础配置：

1. 全局 `rules/` 目录下所有 `.md` 文件（`bun run .claude/scripts/rule-loader.ts load`）
2. 执行 `bun run .claude/scripts/config.ts`（读取 `config.json` 与 `.env`）

偏好优先级：用户当前指令 > 全局偏好 > 本 skill 内置规则。

> setup 自身不感知"当前项目"概念。项目级 rules / knowledge / 骨架的初始化与维护由 `create-project` 与 `knowledge-keeper` 负责。

---

## 运行模式

| 模式       | 触发条件        | 行为差异                                |
| ---------- | --------------- | --------------------------------------- |
| 完整初始化 | 默认 / `init`   | 全 4 步 + 全部交互点                    |
| 单步跳转   | `[step-number]` | 仅执行指定步骤，如 `setup 3` 重跑步骤 3 |
| 状态查询   | `仅查看状态`    | 执行步骤 1 扫描后直接退出               |
```

### 5.2 步骤 2「路由到 create-project」目标文案

```markdown
## 步骤 2: 路由到项目管理（条件式）

**目标**：根据步骤 1 扫描结果，提示用户是否需要创建项目或克隆源码仓库。本步骤不创建文件，不修改配置；所有项目级写操作交由 `create-project` 完成。

### 2.1 读取步骤 1 输出

复用步骤 1 的 `init-wizard.ts scan` JSON：

- `projects: string[]` — workspace/ 下已存在项目目录列表
- `repos: { group, repo, path }[]` — 已挂载的源码仓库列表

### 2.2 路由分支

| 检测情况 | 提示文案 |
|---|---|
| `projects.length === 0` | "未发现任何项目。运行 `/create-project` 创建首个项目（推荐 camelCase 短名，如 `dataAssets`）。" |
| `projects.length > 0` + `repos.length === 0` | "已有项目：{{projects.join(', ')}}。如需挂载源码仓库供分析使用，运行 `/create-project clone-repo --project <name> --url <git-url>`。" |
| `projects.length > 0` + `repos.length > 0` | "已有 {{projects.length}} 个项目、{{repos.length}} 个源码仓库。如需新增项目或仓库，使用 `/create-project`。" |

### 2.3 不阻塞

本步骤为提示性步骤，不发起 AskUserQuestion；用户可在另一会话中执行 `/create-project`，或直接进入步骤 3。
```

### 5.3 步骤 3 / 4 的来源映射

- 新步骤 3 = 旧步骤 5（配置插件），文案不变，仅交互点编号 D → C
- 新步骤 4 = 旧步骤 6（验证汇总），文案不变；汇总表去掉「工作区目录 / .env WORKSPACE_DIR / 源码仓库」三行（这些由 create-project 验证），保留 Node / 依赖 / 插件凭证 / 硬编码检查

### 5.4 异常处理段

保持原文案。`workflow-failed` 通知中的 `step` 字段值变更：`setup-2` 不再触发（步骤 2 不会失败）；`setup-3` 对应插件配置；`setup-4` 对应验证汇总。

### 5.5 删除段（明确清单）

| 删除项 | 旧位置 | 处置 |
|---|---|---|
| 步骤 2「项目管理」整段 | SKILL.md L76–L113 | 删除，由新步骤 2 路由提示替代 |
| 步骤 3「配置工作区」整段 | SKILL.md L115–L146 | 删除（mkdir / 目录树 / `.env WORKSPACE_DIR` 三段），由 create-project 接管 |
| 步骤 4「配置源码仓库」整段 | SKILL.md L148–L193 | 删除，由 create-project A5/A6 + clone-repo 接管 |
| `references/repo-setup.md` 文件 | `.claude/skills/setup/references/repo-setup.md` | 删除整个文件 |
| 步骤 4 文档引用 | "详细配置指南见 `${CLAUDE_SKILL_DIR}/references/repo-setup.md`" | 随步骤 4 整段删除，无需替换 |

---

## 6. 修改文件清单

### 6.1 修改

```
.claude/skills/setup/SKILL.md          # 283 行 → 预估 110-130 行
```

### 6.2 删除

```
.claude/skills/setup/references/repo-setup.md   # 84 行
.claude/skills/setup/references/                # 若变空目录则一并删除
```

### 6.3 不动

```
.claude/skills/setup/scripts/init-wizard.ts                # TS 代码 0 改动
.claude/skills/setup/scripts/__tests__/                    # 若有单测，0 改动
.claude/scripts/create-project.ts                          # 0 改动
.claude/scripts/lib/create-project.ts                      # 0 改动
.claude/skills/create-project/SKILL.md                     # 0 改动
templates/project-skeleton/                                # 0 改动
config.json / .env / .env.example                          # 0 改动
其他 skill（test-case-gen / ui-autotest / qa-flow / ...）  # 0 改动
```

### 6.4 路由提示交叉引用

`qa-flow` 主菜单 SKILL（`.claude/skills/qa-flow/SKILL.md`）当前可能仍引用"setup 第 2 步建项目"。本子目标**不**修改 qa-flow 菜单文案；该交叉清理留给 Phase 3.5「skill 重排」统一处理。本期仅在 spec 中标注待办。

---

## 7. 测试与 Smoke 策略

### 7.1 单元测试

无新增。`init-wizard.ts` 不变 → 既有 `scan` / `verify` 单测保持绿。

`bun test ./.claude/scripts/__tests__` 全量重跑作为基线确认（应保持子目标 2 完成时的测试数 + 全绿）。

### 7.2 Smoke 验证（手动）

| 步骤 | 命令 | 期望 |
|---|---|---|
| S1 | `bun run .claude/skills/setup/scripts/init-wizard.ts scan` | JSON 输出包含 `projects` / `repos` 字段，与子目标 2 完成时输出对齐 |
| S2 | `bun run .claude/skills/setup/scripts/init-wizard.ts verify` | JSON `all_pass` 为 true（前置环境齐全时），输出与子目标 2 完成时对齐 |
| S3 | 阅读 `.claude/skills/setup/SKILL.md` | 4 步结构、步骤 2 为路由提示、无 mkdir 命令、无 `init-wizard.ts clone` 引用 |
| S4 | `grep -r "init-wizard.ts clone" .claude/ docs/` | 无命中（已彻底废止） |
| S5 | `grep -r "references/repo-setup.md" .claude/ docs/` | 无命中（已彻底删除） |
| S6 | `ls .claude/skills/setup/references/` | 目录已删除或空 |
| S7 | `bun run .claude/scripts/create-project.ts scan --project dataAssets` | `skeleton_complete: true`（确认 create-project 与现有项目无回归） |
| S8 | `bun run .claude/scripts/create-project.ts scan --project nonexistent` | `valid_name: true`、`exists: false`、`missing_*` 填满（路由提示文案的真实数据源） |

### 7.3 反向回归检查

- `git grep "项目管理"` 在 setup 范围内应无残留旧术语（除路由提示中明确指向 create-project 的语句）
- `git grep "配置工作区"` 在 setup SKILL.md 内应无残留
- `git grep "WORKSPACE_DIR"` 应不在新 SKILL.md 中出现（旧步骤 3.2 写入语义已删）

---

## 8. Success Criteria

- [ ] 本 spec 入库：`docs/refactor/specs/2026-04-18-setup-slim-design.md`
- [ ] Plan 入库：`docs/refactor/plans/2026-04-18-setup-slim-implementation.md`
- [ ] `setup` SKILL.md 瘦身为 4 步，行数 ≤ 130
- [ ] `references/repo-setup.md` 删除；`references/` 目录空则一并删除
- [ ] description / argument-hint 已更新，反映 4 步与新职责
- [ ] `init-wizard.ts` 与其单测 0 改动
- [ ] `bun test ./.claude/scripts/__tests__` 与子目标 2 完成时同口径全绿
- [ ] Smoke S1–S8 全通过
- [ ] 无残留 `init-wizard.ts clone` / `references/repo-setup.md` / 旧步骤 3 mkdir 命令
- [ ] 原子 commit：spec / plan / SKILL.md 重写 / references 删除 各独立

---

## 9. Risks

| 风险 | 缓解 |
|---|---|
| 用户已习惯 setup 第 2 步交互式建项目，瘦身后困惑 | 步骤 2 路由提示给出明确命令样例（`/create-project`、`/create-project clone-repo`）；description 在触发词中保留 `init` |
| 其他文档（README / qa-flow 菜单 / `using-qa-flow init`）仍引用旧步骤编号 | 本子目标范围内只改 setup 自身；交叉引用清理在 Phase 3.5「skill 重排」统一处理；smoke S4/S5 至少保证 `init-wizard.ts clone` 与 `references/repo-setup.md` 两个硬引用 0 残留 |
| `.env WORKSPACE_DIR` 字段被其他脚本读取，setup 不再写入导致回归 | 子目标 2 已确认 paths.ts 通过 `repoRoot()` 推导路径，不依赖 `WORKSPACE_DIR`；该字段已是惰性遗留，setup 不写不影响；如发现其他读取点，由 Phase 5 横切清理 |
| init-wizard verify 移除「工作区目录 / 源码仓库」检查后，验证表过空 | verify 仍保留 Node / 依赖 / .env / 插件 / 硬编码 5 类；表头依然有用；如需更详的项目级体检，引导用户运行 `create-project scan --project <name>` |
| 步骤 2 路由提示与 create-project 自身的 AskUser 重复发问 | 步骤 2 不发起 AskUserQuestion，仅输出引导命令；只有用户在另会话执行 `/create-project` 时才进入交互流程 |
| 旧 setup 引用的项目级 rules 加载（旧 2.4）丢失 | 业务 skill（test-case-gen / ui-autotest 等）已自行在选 project 时调用 `rule-loader.ts load --project <name>`；setup 不感知项目，不需要项目级 rules |
| smoke S1/S2 输出格式漂移 | init-wizard.ts 0 改动，理论上无漂移；S1/S2 的"对齐"以子目标 2 完成时的快照为基线（手动对比） |

---

## 10. Out of Scope（转入后续阶段或 Not Do）

- `qa-flow` 菜单 SKILL.md 的 setup 引用更新 → Phase 3.5「skill 重排」
- `using-qa-flow init` 命令的描述对齐 → Phase 3.5
- `.env WORKSPACE_DIR` 字段的最终清理 → Phase 5「横切基础设施」
- init-wizard.ts 的代码 / 单测 / JSON 结构变更 → 不做
- 在 verify 中追加"项目骨架完整性"检查 → 不做（属 create-project scan 职责，避免重叠）
- README / 中文文档同步 → Phase 6「命名迁移 + README + 架构图」
- setup 自身的删除 → 不做（环境健康检查与插件引导仍是合理需求）

---

## 11. 交付后下一步

1. 本 spec 由用户审查通过后，`brainstorming` 阶段终结，转入 `writing-plans`
2. writing-plans 产出 `docs/refactor/plans/2026-04-18-setup-slim-implementation.md`
3. 实施阶段走 `subagent-driven-development`：spec → plan → SKILL.md 重写 → references 删除 → smoke → 原子 commit
4. 全部 Success Criteria 对号入座 + 原子 commit 后，主 agent 生成"阶段 2 启动 prompt"（PRD 需求讨论阶段，对应 roadmap §1.1），并提示用户 `/clear` 或新开 CC 实例继续
