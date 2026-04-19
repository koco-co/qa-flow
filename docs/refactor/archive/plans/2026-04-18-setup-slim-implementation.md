# setup Skill 瘦身 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `setup` SKILL.md 从 6 步 283 行瘦身为 4 步 ≤130 行：scan → route-to-create-project → plugin-config → verify。删除与 `create-project` 重叠的项目管理（旧步骤 2）/ 工作区配置（旧步骤 3）/ 源码仓库（旧步骤 4）三段，删除引用废止 clone 命令的 `references/repo-setup.md`，保留 `init-wizard.ts` 与单测 0 改动。

**Architecture:** 纯文档级重构。不动任何 TS 代码、不动 `init-wizard.ts` 的 `scan` / `verify` JSON 结构、不动单测、不动 create-project / knowledge-keeper / templates / config.json。变更范围严格限定在 `.claude/skills/setup/` 目录的 SKILL.md 重写与 `references/` 删除。`bun test ./.claude/scripts/__tests__` 在变更前后保持同口径全绿（基线 604 通过）。

**Tech Stack:** Markdown only.

**Spec:** [`../specs/2026-04-18-setup-slim-design.md`](../specs/2026-04-18-setup-slim-design.md)

**Roadmap:** [`../../refactor-roadmap.md`](../../refactor-roadmap.md)

**Sibling (Sub-goal 1)：** knowledge-keeper 已实施
**Sibling (Sub-goal 2)：** create-project 已实施（CLI + Skill + 模板 + 604 测试绿）

---

## 关键不变量（跨 Task 守护）

1. `.claude/skills/setup/scripts/init-wizard.ts` **0 字节改动**
2. `.claude/scripts/` 下任意 TS / 单测文件 **0 字节改动**
3. `.claude/scripts/lib/` 下任意文件 **0 字节改动**
4. `.claude/skills/create-project/` 下任意文件 **0 字节改动**
5. `templates/` 下任意文件 **0 字节改动**
6. `config.json` / `.env` / `.env.example` **0 字节改动**
7. `bun test ./.claude/scripts/__tests__` 保持 604 通过 0 失败
8. `init-wizard.ts scan` 与 `init-wizard.ts verify` 的 JSON 输出与变更前完全一致

---

## 文件布局

| 文件 | 动作 | 责任 |
|---|---|---|
| `.claude/skills/setup/SKILL.md` | Rewrite | 6 步 283 行 → 4 步 ≤130 行 |
| `.claude/skills/setup/references/repo-setup.md` | Delete | 引用已废止的 `init-wizard.ts clone` 命令 |
| `.claude/skills/setup/references/` | Delete (if empty) | 子目录变空后一并清理 |
| `docs/refactor/plans/2026-04-18-setup-slim-implementation.md` | Create | 本 plan 文档 |

---

## Task 1：基线快照

**目的**：在动 SKILL.md 之前，保存 `init-wizard.ts scan` / `verify` 的 JSON 输出作为对比基线，确保子目标 3 不引入任何运行时回归。

**Files:**
- 仅运行命令 + 临时文件（`/tmp/qa-flow-setup-slim-baseline-{scan,verify}.json`），无源码变更

- [ ] **Step 1: 运行 init-wizard scan，保存 JSON 到临时文件**

```bash
bun run .claude/skills/setup/scripts/init-wizard.ts scan > /tmp/qa-flow-setup-slim-baseline-scan.json
```

期望：exit 0；文件包含 `node_version` / `node_ok` / `deps_installed` / `workspace_exists` / `env_configured` / `plugins` / `repos` / `projects` / `issues` 字段。

- [ ] **Step 2: 运行 init-wizard verify，保存 JSON 到临时文件**

```bash
bun run .claude/skills/setup/scripts/init-wizard.ts verify > /tmp/qa-flow-setup-slim-baseline-verify.json
```

期望：exit 0；文件包含 `checks` 数组与 `all_pass` 布尔字段。

- [ ] **Step 3: 运行单测基线**

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

期望：`604 pass`、`0 fail`（如该数字与子目标 2 完成时不一致，停止并向用户报告偏差）。

- [ ] **Step 4: 记录基线哈希**

```bash
shasum -a 256 \
  /tmp/qa-flow-setup-slim-baseline-scan.json \
  /tmp/qa-flow-setup-slim-baseline-verify.json
```

期望：两个 SHA-256 哈希值；记录在本任务的 reviewer 报告中，Task 4 用作对比参照。

**无 commit**：本任务为只读基线快照，不产生 git 变更。

---

## Task 2：重写 SKILL.md 为 4 步

**目的**：将 `.claude/skills/setup/SKILL.md` 整文件替换为新 4 步结构。文案以 spec §5 为准。

**Files:**
- Rewrite: `.claude/skills/setup/SKILL.md`

- [ ] **Step 1: 整文件重写**

用以下完整内容替换 `.claude/skills/setup/SKILL.md`（外层为 4-反引号围栏，内嵌 3-反引号代码块按原样写入文件）：

````markdown
---
name: setup
description: "qa-flow 环境健康检查向导。4 步完成环境扫描、项目路由、插件配置和验证汇总。项目骨架与源码仓库由 create-project 接管。触发词：环境检查、健康检查、init、setup。"
argument-hint: "[step-number]"
---

<!-- 前置加载 -->

执行前先加载全局规则并读取基础配置：

1. 全局 `rules/` 目录下所有 `.md` 文件（`bun run .claude/scripts/rule-loader.ts load`）
2. 执行 `bun run .claude/scripts/config.ts`（从 `config.json` 和 `.env` 读取模块、仓库、路径配置）

偏好优先级：用户当前指令 > 全局偏好 > 本 skill 内置规则。

> setup 自身不感知"当前项目"概念。项目级 rules / knowledge / 骨架的初始化与维护由 `create-project` 与 `knowledge-keeper` 负责。

---

## 运行模式

| 模式       | 触发条件        | 行为差异                                |
| ---------- | --------------- | --------------------------------------- |
| 完整初始化 | 默认 / `init`   | 全 4 步 + 全部交互点                    |
| 单步跳转   | `[step-number]` | 仅执行指定步骤，如 `setup 3` 重跑步骤 3 |
| 状态查询   | `仅查看状态`    | 执行步骤 1 扫描后直接退出               |

---

## 步骤 1: 检测环境

**目标**：扫描运行环境，检测 Node.js、依赖、配置文件是否就绪。

### 1.0 环境检查清单（步骤 1 / 步骤 4 共用）

步骤 1 的扫描和步骤 4 的环境验证都以此清单为准：

| 检测项       | 通过条件                                       |
| ------------ | ---------------------------------------------- |
| Node.js 版本 | >= 22.0.0                                      |
| Bun          | `bun` 可执行                                   |
| config.json  | 项目根目录存在且可读取                         |
| .env 文件    | 项目根目录存在（内容不校验，运行时可覆盖配置） |
| 核心脚本     | 核心脚本可通过 `bun run` 执行                  |

### 1.1 执行环境扫描

```bash
bun run .claude/skills/setup/scripts/init-wizard.ts scan
```

### 1.2 展示扫描结果

以表格形式展示扫描结果，标出问题项（❌）和通过项（✓）。同时记下输出 JSON 中的 `projects: string[]` 与 `repos: { group, repo, path }[]` 字段，供步骤 2 复用。

### 交互点 A

```
环境扫描结果：
✓ Node.js v{{version}}
✓ bun v{{version}}
{{❌ / ✓}} config.json
{{❌ / ✓}} .env 文件
{{❌ / ✓}} 核心脚本可执行

选项：
1. ✓ 继续初始化（推荐）
2. 仅查看状态（不修改任何文件）
```

若用户选择「仅查看状态」→ 输出完整扫描报告后退出，不进入后续步骤。

---

## 步骤 2: 路由到项目管理（条件式提示）

**目标**：根据步骤 1 扫描结果，提示用户是否需要创建项目或克隆源码仓库。本步骤不创建文件、不修改配置；所有项目级写操作由 `create-project` 完成。

### 2.1 复用步骤 1 输出

直接读取步骤 1 已经获得的 `projects` 与 `repos` 字段，不再重复调用 `init-wizard.ts scan`。

### 2.2 路由分支

| 检测情况 | 提示文案 |
|---|---|
| `projects.length === 0` | 「未发现任何项目。运行 `/create-project` 创建首个项目（推荐 camelCase 短名，如 `dataAssets`）。」 |
| `projects.length > 0` 且 `repos.length === 0` | 「已有项目：{{projects.join(', ')}}。如需挂载源码仓库供分析使用，运行 `/create-project clone-repo --project <name> --url <git-url>`。」 |
| `projects.length > 0` 且 `repos.length > 0` | 「已有 {{projects.length}} 个项目、{{repos.length}} 个源码仓库。如需新增项目或仓库，使用 `/create-project`。」 |

### 2.3 不阻塞

本步骤为提示性步骤，不发起 AskUserQuestion；用户可在另一会话中执行 `/create-project`，或直接进入步骤 3。

---

## 步骤 3: 配置插件（可选）

**目标**：逐个检查未激活插件，引导用户在 `.env` 文件中填写所需凭证。

### 3.1 读取插件清单

从 `plugins/` 目录下各子目录的 `plugin.json` 文件读取所有已知插件。

### 3.2 检查激活状态

逐个检查 `.env` 中对应的环境变量是否已配置。

### 交互点 C（每个未激活插件）

```
插件：{{plugin_name}}
说明：{{plugin_description}}
需要配置：{{env_keys}}

1. 现在配置（打开 .env 引导填写）
2. 跳过此插件
```

选择「现在配置」时，展示该插件的 `.env` 配置示例，并提示用户手动编辑 `.env` 文件，编辑完成后按任意键继续校验。

---

## 步骤 4: 验证汇总

**目标**：全面校验初始化结果，输出最终状态表。

### 4.1 执行验证

```bash
bun run .claude/skills/setup/scripts/init-wizard.ts verify
```

验证内容：

- 环境项复用步骤 1 的「环境检查清单」
- 另追加以下项目级验证：

| 验证项     | 说明                                                                   |
| ---------- | ---------------------------------------------------------------------- |
| 插件凭证   | 已配置插件的环境变量非空                                               |
| 硬编码检查 | 脚本和测试中无硬编码绝对路径或凭证（详见 CLAUDE.md「禁止硬编码规则」） |

> 项目骨架完整性、`.repos/` 仓库可达性等项目级验证由 `bun run .claude/scripts/create-project.ts scan --project <name>` 提供，不在 setup 范围内。

### 4.2 展示汇总表

```
qa-flow v2.0 环境健康检查完成

┌──────────────────┬──────────┬────────────────────────────┐
│ 项目             │ 状态     │ 详情                       │
├──────────────────┼──────────┼────────────────────────────┤
│ Node.js          │ ✓ 通过   │ v{{version}}               │
│ 依赖安装         │ ✓ 通过   │ node_modules/ 存在         │
│ .env             │ ✓ 通过   │ 已配置                     │
│ 钉钉通知         │ {{status}}│ {{detail}}                │
│ 蓝湖插件         │ {{status}}│ {{detail}}                │
└──────────────────┴──────────┴────────────────────────────┘

所有必需项通过，qa-flow 环境已就绪。
- 创建/补齐项目：`/create-project`
- 生成测试用例：`/test-case-gen`
```

若存在未通过项，列出具体问题和修复建议，不阻断（可后续按需修复）。

---

## 异常处理

任意步骤失败时：

1. 记录失败步骤和错误信息
2. 提示用户可通过 `setup {{step_number}}` 重新执行该步骤
3. 发送 `workflow-failed` 通知（若通知插件已配置）：

```bash
bun run .claude/scripts/plugin-loader.ts notify \
  --event workflow-failed \
  --data '{"step":"setup-{{step}}","reason":"{{error_msg}}"}'
```
````

注意：

- 上述外层 4-反引号围栏是 plan 文档对 SKILL.md 内容的包裹；写入 SKILL.md 时**只写**外层 4-反引号之间的内容（含其中的 3-反引号代码块），**不**包含外层 4-反引号本身
- 步骤 1.0 标题里 "（步骤 1 / 步骤 4 共用）" 中的 `4` 必须与新编号一致（旧版是 `6`）
- 验证表的「状态」列宽与原版一致，不强制美化

- [ ] **Step 2: 行数核查**

```bash
wc -l .claude/skills/setup/SKILL.md
```

期望：行数在 110–150 区间内（spec 目标 ≤ 130，留 20 行冗余余量）。若超过 150，回到 Step 1 删冗余空行；若低于 100，确认是否漏写章节。

- [ ] **Step 3: 关键字符串校验**

```bash
grep -c "步骤 4: 验证汇总" .claude/skills/setup/SKILL.md
grep -c "步骤 3: 配置插件" .claude/skills/setup/SKILL.md
grep -c "步骤 2: 路由到项目管理" .claude/skills/setup/SKILL.md
grep -c "步骤 1: 检测环境" .claude/skills/setup/SKILL.md
```

期望：4 个命令均输出 `1`。

- [ ] **Step 4: 残留检查（项目管理 / 工作区 / 源码仓库 / WORKSPACE_DIR / init-wizard.ts clone / repo-setup.md）**

```bash
grep -n "项目管理\|配置工作区\|配置源码仓库\|WORKSPACE_DIR\|init-wizard.ts clone\|references/repo-setup.md\|mkdir -p workspace" .claude/skills/setup/SKILL.md
```

期望：仅"路由到项目管理"标题命中（包含子串"项目管理"），其余 0 命中。若 grep 输出包含旧步骤片段，回 Step 1 修复。

- [ ] **Step 5: 步骤编号连续性检查**

```bash
grep -n "^## 步骤" .claude/skills/setup/SKILL.md
```

期望：恰好 4 行，依次为 `## 步骤 1: ` / `## 步骤 2: ` / `## 步骤 3: ` / `## 步骤 4: `。

- [ ] **Step 6: 提交**

```bash
git add .claude/skills/setup/SKILL.md
git commit -m "feat(phase1): slim setup skill to 4 steps"
```

---

## Task 3：删除 references/repo-setup.md

**目的**：清理引用已废止 `init-wizard.ts clone` 命令的参考文档。该文件的核心信息（URL 格式、本地路径规则、只读规则）分别由 `create-project` SKILL 与 `.claude/rules/repo-safety.md` 承接。

**Files:**
- Delete: `.claude/skills/setup/references/repo-setup.md`
- Delete (conditional): `.claude/skills/setup/references/`（仅在变空时）

- [ ] **Step 1: 确认文件路径与内容**

```bash
ls -la .claude/skills/setup/references/
```

期望：列出 `repo-setup.md`（可能还有其他文件）。

- [ ] **Step 2: 删除 repo-setup.md**

```bash
git rm .claude/skills/setup/references/repo-setup.md
```

期望：`rm '.claude/skills/setup/references/repo-setup.md'`。

- [ ] **Step 3: 检查 references 目录是否变空，若是则一并删除**

```bash
ls -A .claude/skills/setup/references/ 2>/dev/null && echo "NOT_EMPTY" || echo "EMPTY_OR_GONE"
```

若输出 `EMPTY_OR_GONE` → 跳过 Step 4
若输出包含其他文件 + `NOT_EMPTY` → 跳过 Step 4
若仅输出空行 + `NOT_EMPTY` → 执行 Step 4

- [ ] **Step 4 (条件)：删除空 references 目录**

```bash
rmdir .claude/skills/setup/references/
```

期望：成功删除（git rm 已处理跟踪文件，rmdir 删除磁盘空目录）。

- [ ] **Step 5: 仓库内残留引用扫描**

```bash
grep -rn "references/repo-setup.md" . --include="*.md" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=workspace
```

期望：0 命中（spec 与本 plan 文档中的引用属于历史记录，不在 `.md` 内活跃引用范围；如有命中需逐条评估）。如发现 `.claude/` 或 `docs/` 内活跃引用，记录在 reviewer 报告中并修复。

- [ ] **Step 6: 提交**

```bash
git add -A .claude/skills/setup/references/
git commit -m "feat(phase1): remove obsolete setup repo-setup reference"
```

---

## Task 4：Smoke 验证（S1–S8）

**目的**：对照 spec §7.2 全量执行 8 项 smoke 检查，确认运行时 0 回归 + 文档层目标全部达成。

**Files:** 仅命令验证，无源码变更。

- [ ] **Step 1: S1 — init-wizard scan 输出对齐基线**

```bash
bun run .claude/skills/setup/scripts/init-wizard.ts scan > /tmp/qa-flow-setup-slim-after-scan.json
diff /tmp/qa-flow-setup-slim-baseline-scan.json /tmp/qa-flow-setup-slim-after-scan.json
```

期望：`diff` 无输出（exit 0）。如有差异（除非是环境状态在测试期间发生了真实变化，如新挂载仓库），停止并向用户报告。

- [ ] **Step 2: S2 — init-wizard verify 输出对齐基线**

```bash
bun run .claude/skills/setup/scripts/init-wizard.ts verify > /tmp/qa-flow-setup-slim-after-verify.json
diff /tmp/qa-flow-setup-slim-baseline-verify.json /tmp/qa-flow-setup-slim-after-verify.json
```

期望：`diff` 无输出。

- [ ] **Step 3: S3 — SKILL.md 4 步结构与无废弃命令引用**

```bash
grep -c "^## 步骤" .claude/skills/setup/SKILL.md
grep -c "init-wizard.ts clone\|mkdir -p workspace\|WORKSPACE_DIR" .claude/skills/setup/SKILL.md
```

期望：第一条输出 `4`；第二条输出 `0`。

- [ ] **Step 4: S4 — 仓库内 init-wizard.ts clone 引用 0 残留**

```bash
grep -rn "init-wizard.ts clone" .claude/ docs/ --include="*.md" --include="*.ts"
```

期望：0 命中。docs/refactor/specs/2026-04-18-setup-slim-design.md 中作为"已废止"引用允许出现，但应作为字符串而非命令引用；若命中均为 spec/plan 中的回顾性表述（明确以"已废止"或"曾"修饰），可接受。

- [ ] **Step 5: S5 — 仓库内 references/repo-setup.md 引用 0 残留**

```bash
grep -rn "references/repo-setup.md" .claude/ docs/ --include="*.md" --include="*.ts"
```

期望：0 命中（同 S4，spec 历史描述允许）。

- [ ] **Step 6: S6 — references 目录已删除或空**

```bash
ls -la .claude/skills/setup/references/ 2>&1
```

期望：`No such file or directory`（已删）或空目录列表。

- [ ] **Step 7: S7 — create-project 对现有 dataAssets 项目 scan 无回归**

```bash
bun run .claude/scripts/create-project.ts scan --project dataAssets | jq '{exists, skeleton_complete, valid_name}'
```

期望：`{ "exists": true, "skeleton_complete": true, "valid_name": true }`。

- [ ] **Step 8: S8 — create-project 对不存在项目 scan 输出路由数据源**

```bash
bun run .claude/scripts/create-project.ts scan --project nonexistent-smoke-target | jq '{exists, valid_name, skeleton_complete}'
```

期望：`{ "exists": false, "valid_name": true, "skeleton_complete": false }`。

- [ ] **Step 9: 单测全量回归**

```bash
bun test ./.claude/scripts/__tests__ 2>&1 | tail -5
```

期望：`604 pass`、`0 fail`（与基线一致）。

- [ ] **Step 10: 反向回归检查**

```bash
grep -n "项目管理" .claude/skills/setup/SKILL.md
grep -n "配置工作区" .claude/skills/setup/SKILL.md
```

期望：第一条仅命中"步骤 2: 路由到项目管理"标题（且仅 1 行）；第二条 0 命中。

- [ ] **Step 11: 清理临时基线文件**

```bash
rm -f /tmp/qa-flow-setup-slim-baseline-scan.json /tmp/qa-flow-setup-slim-baseline-verify.json /tmp/qa-flow-setup-slim-after-scan.json /tmp/qa-flow-setup-slim-after-verify.json
```

期望：4 个临时文件删除完成。

**无 commit**：本任务为只读验证，不产生 git 变更。如 Step 1–10 任意一项失败，停止并向用户报告（不要试图自行修复 SKILL.md，回到 Task 2 的 Step 1 重做）。

---

## Task 5：交叉引用回归与子目标 3 收尾

**目的**：确保子目标 3 不破坏其他 skill / docs 对 setup 的引用预期；标注 Phase 3.5 待清理项；生成阶段 2 启动 prompt 草稿。

**Files:** 仅 grep 与 prompt 草稿输出，无源码变更（阶段 2 prompt 由主 agent 在交付时贴在对话中，不入库）。

- [ ] **Step 1: 扫描其他 skill 对旧 setup 步骤编号的引用**

```bash
grep -rn "setup 步骤 [2-6]\|setup-2\|setup-3\|setup-4\|setup-5\|setup-6" .claude/ docs/ --include="*.md" --include="*.ts" --exclude-dir=node_modules
```

期望：可能命中 docs/refactor/specs/* 中的回顾性描述（允许）。如命中 `.claude/skills/qa-flow/` 或其他活跃 skill 的运行时引用，记录在 reviewer 报告中（不修复，留待 Phase 3.5「skill 重排」统一处理）。

- [ ] **Step 2: 扫描其他 skill 对项目管理步骤的引用**

```bash
grep -rn "setup.*项目管理\|setup.*第.*步.*创建项目" .claude/ docs/ --include="*.md" --exclude-dir=node_modules
```

期望：0 活跃命中或仅 spec 历史描述。命中其他 skill 的运行时引用 → 记录、不修复、留待 Phase 3.5。

- [ ] **Step 3: 确认 init-wizard.ts 与单测 0 改动**

```bash
git diff HEAD~3 HEAD -- .claude/skills/setup/scripts/init-wizard.ts
git diff HEAD~3 HEAD -- '.claude/scripts/**/*.ts'
```

期望：第一条 0 输出（`init-wizard.ts` 未在子目标 3 任何 commit 中改动）；第二条若 `**/*.ts` 通配在 zsh 下不展开，可改为 `git log --name-only HEAD~3..HEAD -- .claude/scripts/ | grep '\.ts$'` 验证。如发现 `.claude/scripts/` 下 `.ts` 文件出现在子目标 3 的 commit 中，停止并向用户报告（违反不变量）。

- [ ] **Step 4: 检查 git status 干净**

```bash
git status --short | grep -v "^??.*workspace/dataAssets/.repos/" | grep -v "^.M.*workspace/dataAssets/.repos/"
```

期望：除 workspace/.repos/ 子模块的常规变化（在仓库根 git status 中显示但不属于子目标 3）外，无其他未提交变更。

- [ ] **Step 5: 撰写阶段 2 启动 prompt 草稿（用户对话回执）**

不写入文件。在主 agent 给用户的最终回复中包含：

```
# Phase 2 启动 prompt（PRD 需求讨论阶段，对应 roadmap 目标 1.1）

## 已完成前序
- 子目标 0：信息架构 + rules 迁移
- 子目标 1：knowledge-keeper（CLI + Skill + 551 测试）
- 子目标 2：create-project（CLI + Skill + 模板 + 604 测试）
- 子目标 3：setup 瘦身（4 步、references 清理、单测 604 全绿、smoke S1–S8 通过）

## Phase 2 Scope（roadmap §阶段 2）
主 agent 亲自主持 PRD 需求讨论 → 结构化 plan 模板 → 支持 /clear 重启
（此处为 placeholder，由 Phase 2 spec 撰写阶段在 brainstorming 中具化）

## 执行约束（与子目标 1/2/3 一致）
- cwd = /Users/poco/Projects/qa-flow
- workspace/{project}/.repos/ 只读
- 禁硬编码绝对路径/凭证
- 每改 .claude/scripts/ 同步单测并全量 bun test ./.claude/scripts/__tests__ 绿
- 主 agent 禁自行调试
- commit 格式: feat(phase2): <desc> / docs(phase2): <desc>，无 Co-Authored-By，无 push

## 首步
请阅读 docs/refactor-roadmap.md 阶段 2 段落与所有子目标 0–3 的 spec，然后开始撰写 Phase 2 spec。完成后停下来让用户 review。

建议：/clear 或新开 CC 实例继续。
```

期望：用户读到 prompt 后可决定下一步是否 `/clear`。

**无 commit**：本任务无文件变更。

---

## 自审清单（writer 自查）

- [x] 每 task 都有明确文件路径与产出
- [x] 每 task 末尾要么 commit 要么标注「无 commit」
- [x] 不变量（init-wizard.ts 0 改动 / TS 0 改动 / 604 测试绿）在 Task 1 / Task 4 / Task 5 三处独立 enforce
- [x] SKILL.md 重写以完整可粘贴的 markdown 给出（不留 TBD/TODO）
- [x] grep 命令均使用绝对/相对正确的路径与 glob
- [x] commit message 用 `feat(phase1): ...`，符合用户约束（无 Co-Authored-By）
- [x] Smoke 8 项与 spec §7.2 一一对应（S1–S8 + 单测回归 + 反向 grep + 临时文件清理）
- [x] Phase 3.5 待清理项明确标注（qa-flow 菜单 / using-qa-flow init 描述 / 其他 skill 中的 setup 步骤引用）

---

## 执行风格备忘

- 主 agent **不**自行执行 Task 2 的 SKILL.md 重写（违反「主 agent 禁自行调试」）；派发 subagent 走 subagent-driven-development
- Task 2 是文档型任务，subagent 可能尝试加自己的"优化"。在派发 prompt 中明确：「严格按 plan Step 1 内容粘贴，不要自行调整文案 / 标题层级 / 表格格式」
- Task 4 的 diff 命令在用户运行测试期间挂载新仓库的情况下可能误报；如出现，subagent 应先解释差异是否来自步骤 1/4 之外的环境变化，再决定是否阻断
- Task 5 不修复其他 skill 的旧引用——这是 Phase 3.5「skill 重排」的职责，越界会污染本 phase 的 commit 边界
