# create-project Skill 设计文档

**Phase**: 1 · `create-project` skill + `setup` 瘦身 + `knowledge-keeper` 实施（子目标 2 of 3）
**Date**: 2026-04-18
**Status**: Draft — awaiting user review
**Parent Roadmap**: [`../../refactor-roadmap.md`](../../refactor-roadmap.md)
**Upstream Architecture**: [`2026-04-17-knowledge-architecture-design.md`](./2026-04-17-knowledge-architecture-design.md)
**Sibling (Sub-goal 1)**: [`2026-04-17-knowledge-keeper-design.md`](./2026-04-17-knowledge-keeper-design.md)

---

## 1. Context

Phase 0 已落地三层信息架构（memory / rules / knowledge），子目标 1 已交付 `knowledge-keeper` CLI + Skill（7 个 actions、Phase 0 骨架自动兼容、551 测试全绿）。

当前 `setup` skill 第 2 步仍承担"项目管理（扫描/创建新项目）"职责；第 4 步承担"源码仓库配置"。两者都是**项目级资产**，放在跨项目的初始化向导里存在以下问题：

- 新建项目流程被拆成"setup 第 2 步 + setup 第 4 步"两段，不完整
- 项目骨架创建逻辑硬编码在 SKILL.md（`mkdir -p` 字面命令），不可单测
- Phase 0 骨架（含 `knowledge/` 引导文案）在新项目创建时无法自动复刻
- init-wizard.ts 368 行偏大，违反"小文件"原则，继续加项目级逻辑只会更糟

子目标 2 交付独立的 `create-project` skill，承接"项目诞生"的完整职责（目录骨架 + 模板 + config.json 注册 + 源码仓库克隆），通过幂等补齐同时覆盖"修复残缺项目"场景，并复用子目标 1 的 `knowledge-keeper index` 生成 `_index.md`，避免硬编码模板。

---

## 2. Goals

1. 交付可执行的 create-project CLI 脚本（`.claude/scripts/create-project.ts` + `lib/create-project.ts`）
2. 交付 create-project skill（`.claude/skills/create-project/SKILL.md`）
3. 实施 3 个 CLI actions：`scan` / `create` / `clone-repo`
4. 实施**幂等补齐**：连跑两次 `create --confirmed` 无副作用；残缺项目自动补齐缺失子目录、模板、config.json 注册项
5. 新增 `templates/project-skeleton/` 骨架模板（knowledge overview/terms + rules README）
6. 从 init-wizard.ts 迁移 `clone` 子命令到 create-project.ts（setup 瘦身铺路）
7. 实施项目名校验规则（允许 camelCase + kebab + 拼音，禁系统保留字）
8. 单元测试全覆盖纯函数层，集成测试走真实 CLI 调用
9. 创建后自动调用 `knowledge-keeper index` 生成 `_index.md`

---

## 3. Non-Goals

- `setup` skill SKILL.md 瘦身（删除第 2/4 步交互块）→ 子目标 3
- init-wizard.ts 其他子命令（`scan` / `verify`）的改动 → 子目标 3
- 其他 skill（test-case-gen / ui-autotest）感知新项目 → 各 skill 自身的项目选择逻辑已足够
- 项目删除/重命名 → 超出子目标 2 scope
- config.json repo_profiles 的交互式配置 → 由 `clone-repo` 追加仓库时被动更新，不新增单独 action
- 跨项目资源迁移（如复制 xmind 文件）→ 超出项目诞生语义

---

## 4. Architecture

### 4.1 双层职责边界

```
┌────────────── Claude Code ───────────────┐
│  主 agent                                  │
│       │                                    │
│       │ 触发词 / "创建新项目"              │
│       ▼                                    │
│  ┌──────────────────────────┐              │
│  │ create-project (Skill)   │              │
│  │ ─ 项目名输入 + 预校验     │              │
│  │ ─ scan 输出 diff 表渲染   │              │
│  │ ─ AskUserQuestion        │              │
│  │ ─ 源码仓库交互循环        │              │
│  │ ─ 调 knowledge-keeper     │              │
│  └────────────┬─────────────┘              │
│               │ bun run CLI                │
│               ▼                            │
│  ┌──────────────────────────┐              │
│  │ create-project.ts (CLI)  │              │
│  │ ─ 纯文件 I/O             │              │
│  │ ─ 无 TTY 交互             │              │
│  │ ─ stdout JSON             │              │
│  │ ─ exit code 分级          │              │
│  └────────────┬─────────────┘              │
│               ▼                            │
│    workspace/{project}/ + config.json      │
└────────────────────────────────────────────┘
```

| 职责 | Skill 层 | CLI 层 |
|---|---|---|
| 对话/提问 | AskUserQuestion | 永不询问 |
| 项目名输入 | 收集 + 预渲染校验反馈 | 硬校验（拒绝非法名） |
| diff 展示 | 渲染 markdown 表 | 输出 JSON |
| 文件 I/O | 不 | 独占 |
| config.json 注册 | 不 | 独占 |
| 源码仓库 clone | 循环询问 | `clone-repo` 子命令 |
| `_index.md` 生成 | 不 | `create` 成功后链式调 `knowledge-keeper index` |

### 4.2 CLI 输出契约

对齐 knowledge-keeper.ts / init-wizard.ts 范式：

- **stdout**：JSON
- **stderr**：`[create-project] <message>\n`
- **exit code**：`0` 成功 / `1` 错误（不允许继续） / `2` 未执行但有可补齐项（用于 CI/脚本化场景）

### 4.3 数据流

**scan 流**：Skill 调 CLI → CLI 比对目标骨架 vs 实际 → JSON diff → Skill 渲染表

**create 流**：
1. Skill 收集项目名 + 预校验反馈给用户
2. CLI `scan` 返回 diff
3. Skill 渲染 diff 表 + AskUser 确认
4. 确认后调 CLI `create --confirmed`
5. CLI：mkdir 缺失目录 → 拷贝缺失模板（保留现有文件）→ merge config.json → 调 `knowledge-keeper index`
6. CLI 输出最终状态 JSON
7. Skill 渲染摘要 + 提示下一步命令

**clone-repo 流**：
1. Skill 收集 URL / branch
2. CLI 解析 `{group}/{repo}` → 克隆到 `workspace/{project}/.repos/{group}/{repo}/`
3. 输出 `{ project, url, branch, local_path }`

---

## 5. 文件布局与模板契约

### 5.1 新建文件

```
.claude/scripts/
├── create-project.ts                  # CLI 入口
├── lib/
│   └── create-project.ts              # 纯函数层
└── __tests__/
    ├── create-project.test.ts         # CLI 集成测试
    └── lib/
        └── create-project.test.ts     # 纯函数单测

.claude/skills/create-project/
└── SKILL.md

templates/project-skeleton/
├── knowledge/
│   ├── overview.md                    # 引导文案 + {{project}} 占位
│   └── terms.md                       # 空表格 + 填充指南
└── rules/
    └── README.md                      # 项目级规则使用指南
```

### 5.2 修改文件

```
.claude/skills/setup/scripts/init-wizard.ts    # 移除 clone 子命令（迁到 create-project.ts）
```

**本子目标不改**：
- setup 的 SKILL.md（子目标 3 做）
- init-wizard.ts 的 `scan` / `verify` 子命令（子目标 3 视情况改）
- `lib/paths.ts`（Phase 0 / 子目标 1 已齐）
- knowledge-keeper.ts / lib/knowledge.ts（只消费，不改）

### 5.3 templates/project-skeleton/ 契约

**`knowledge/overview.md`** — 文案参考现有 `workspace/dataAssets/knowledge/overview.md`，保留 5 段（产品定位 / 主流程 / 术语入口 / 模块入口 / 踩坑入口）+ 填充指南，占位符 `{{project}}` 在 H1 与引用链接替换。文件末尾不带 frontmatter（由 `knowledge-keeper index` 首次运行自动补齐，走 Phase 0 兼容路径）。

**`knowledge/terms.md`** — 文案参考现有 `workspace/dataAssets/knowledge/terms.md`。空表头 + 填充示例行 + 使用说明。同样不带 frontmatter。

**`rules/README.md`** — 项目级规则使用指南：
```markdown
# {{project}} 项目级规则

本目录下的规则覆盖全局 `rules/`。优先级：用户当前指令 > 项目级 rules > 全局 rules > skill 内置。

## 如何添加项目级规则

1. 从仓库根目录 `rules/` 拷贝需要覆盖的 `.md` 文件到本目录
2. 修改该文件即可（保留 frontmatter 若有）
3. 规则加载由以下命令完成：
   `bun run .claude/scripts/rule-loader.ts load --project {{project}}`

## 常见场景

- 覆盖用例编写规范：拷贝 `rules/case-writing.md` 到本目录修改
- 覆盖 XMind 结构约束：拷贝 `rules/xmind-structure.md` 到本目录修改
- 仅项目独有规则：直接新建 `.md` 文件（如 `hotfix-frontmatter.md`）
```

### 5.4 目录骨架（create 创建目标态）

```
workspace/{project}/
├── prds/                  .gitkeep
├── xmind/                 .gitkeep
├── archive/               .gitkeep
├── issues/                .gitkeep
├── historys/              .gitkeep
├── reports/               .gitkeep
├── tests/                 .gitkeep
├── rules/
│   └── README.md          (来自模板，{{project}} 已替换)
├── knowledge/
│   ├── overview.md        (来自模板，{{project}} 已替换)
│   ├── terms.md           (来自模板，{{project}} 已替换)
│   ├── modules/           .gitkeep
│   ├── pitfalls/          .gitkeep
│   └── _index.md          (由 knowledge-keeper index 生成)
├── .repos/                .gitkeep
└── .temp/                 .gitkeep
```

---

## 6. CLI API（3 个 actions 完整签名）

CLI 入口：`bun run .claude/scripts/create-project.ts <action> [...]`

所有 action 必带 `--project <name>`。成功 stdout 均为 JSON。

### 6.1 `scan`

```bash
bun run .claude/scripts/create-project.ts scan --project <name>
```

**返回：**

```json
{
  "project": "newProj",
  "valid_name": true,
  "name_error": "",
  "exists": true,
  "missing_dirs": ["knowledge/modules", "knowledge/pitfalls"],
  "missing_files": ["rules/README.md", "knowledge/overview.md"],
  "missing_gitkeeps": ["prds/.gitkeep"],
  "config_registered": false,
  "repos_configured": 0,
  "skeleton_complete": false
}
```

**exit 分级：**
- `valid_name=false` → stderr `[create-project] Invalid project name: <reason>` + exit 1（不输出 JSON）
- 合法名（无论项目是否存在、是否完整）→ 输出上述 JSON + exit 0
- scan 是纯读操作，不按 diff 是否存在分级 exit

**字段语义：**
- 项目不存在 → `exists=false` + 所有 `missing_*` 字段填满目标骨架
- 项目完整 → `skeleton_complete=true` + 所有 `missing_*` 空数组

### 6.2 `create`

```bash
bun run .claude/scripts/create-project.ts create \
  --project <name> \
  [--dry-run] [--confirmed]
```

**分支规则：**

| 情况 | 行为 | exit |
|---|---|---|
| 项目名非法 | stderr 原因 | 1 |
| `--dry-run` | 输出 `{ dry_run: true, will_create: {...}, will_register: bool, will_call_index: bool }` | 0 |
| `skeleton_complete=true` + `config_registered=true` | 跳过所有操作，输出 `{ skipped: true, project, message: "已完整" }` | 0 |
| 有缺失 + 无 `--confirmed` | stderr `Add --confirmed to apply` + 返回 scan diff | 2 |
| `--confirmed` | 顺序执行：mkdir 缺失目录 → 创建 .gitkeep → 拷贝缺失模板（已存在文件跳过）→ merge config.json → spawn `knowledge-keeper index` | 0 |
| knowledge-keeper index 失败 | stderr 转发 + rollback 不做（部分状态留给用户） | 1 |

**输出（`--confirmed` 成功）：**

```json
{
  "project": "newProj",
  "created_dirs": ["workspace/newProj/prds", "..."],
  "created_files": ["workspace/newProj/rules/README.md", "..."],
  "created_gitkeeps": ["workspace/newProj/prds/.gitkeep", "..."],
  "registered_config": true,
  "index_generated": true,
  "index_path": "workspace/newProj/knowledge/_index.md"
}
```

**硬约束：**
- 已存在的文件**永不覆盖**（保护用户编辑）
- 已注册的 `config.json projects.<name>` 不覆盖 `repo_profiles`
- **不做回滚**：任何步骤失败（mkdir / 拷贝模板 / config.json 写入 / knowledge-keeper index）均透传错误 + exit 1，已完成的前置写入保留在磁盘上。用户通过再跑一次 `create --confirmed`（幂等）继续补齐，或排障后手动处理。

### 6.3 `clone-repo`

```bash
bun run .claude/scripts/create-project.ts clone-repo \
  --project <name> \
  --url <git-url> \
  [--branch <branch>]
```

**逻辑：**

1. 校验项目已存在（未存在 → exit 1 提示先 create）
2. 解析 URL → `{group}/{repo}`（复用 `parseGitUrl` in paths.ts）
3. 目标路径 `workspace/{project}/.repos/{group}/{repo}/`
4. 已存在 → stderr `Repo already cloned: <path>` + exit 1
5. 执行 `git clone <url> <path>`，分支默认 `main`；带 `--branch` 时 `git clone --branch <branch> --single-branch`
6. 输出：

```json
{
  "project": "newProj",
  "url": "http://gitlab.example/foo/bar.git",
  "group": "foo",
  "repo": "bar",
  "branch": "main",
  "local_path": "workspace/newProj/.repos/foo/bar"
}
```

**注意**：本 action **不**自动更新 config.json `repo_profiles`。repo profile 的组织（如 `岚图` profile 下放哪些 repo）属于业务语义，由用户显式编辑 config.json 或未来 skill 介入。clone-repo 只负责磁盘克隆。

### 6.4 命名校验规则（lib 纯函数）

```typescript
export function validateProjectName(name: string): { valid: boolean; error?: string };
```

| 规则 | 约束 |
|---|---|
| 字符集 | `^[A-Za-z][A-Za-z0-9-]*$`（首字母必字母，允许 camelCase `dataAssets`、kebab `data-assets`、全小写拼音 `xyzh`） |
| 长度 | 2–32 字符 |
| 保留字 | `workspace`、`repos`、`.repos`、`.temp`、`knowledge`、`rules`、`archive`、`xmind`、`prds`、`issues`、`reports`、`historys`、`tests`、`templates`、`scripts`、`plugins`、`skills` 禁用 |
| 下划线/空格/点 | 禁用（避免与路径 / 环境变量冲突） |
| 已注册 | `create` 时若 `config.json` 已存在同名 → 走幂等补齐路径，不阻塞 |

错误信息格式：`Invalid project name "<name>": <reason>`

---

## 7. SKILL.md 交互流程

### 7.1 Skill 结构

```markdown
---
name: create-project
description: "创建新项目或补齐残缺项目骨架。初始化 workspace/{project}/ 完整子目录结构，注册 config.json，可选配置源码仓库。触发词：创建项目、新建项目、create-project、补齐项目、项目初始化。"
argument-hint: "[项目名]"
---

# create-project

## 前置加载
  └─ 全局规则（rule-loader，project 暂不注入）

## 场景 A：新建项目（主流程）
  ├─ A1. 收集项目名（argument-hint / AskUser）
  ├─ A2. CLI scan 预校验
  ├─ A3. AskUser 确认（含 diff 表）
  ├─ A4. CLI create --confirmed
  ├─ A5. AskUser 配置源码仓库？
  ├─ A6. CLI clone-repo 循环
  └─ A7. 输出摘要 + 下一步提示

## 场景 B：补齐残缺项目
  ├─ B1. 识别意图（用户说"补齐 xxx"）
  ├─ B2. CLI scan
  ├─ B3. 无差异 → 退出
  ├─ B4. 有差异 → AskUser 补齐
  └─ B5. CLI create --confirmed

## 场景 C：仅查看状态（只读）
  └─ CLI scan + 格式化展示

## 异常处理
```

### 7.2 新建流程（A 场景）详细

```
A1. 收集项目名
    ├─ 优先从 argument-hint 取（/create-project myProj）
    ├─ 否则 AskUser："请输入项目名称（英文短名，允许 camelCase 或 kebab）"
    └─ 预展示校验规则（字符集 / 长度 / 保留字）

A2. CLI scan
    bun run .claude/scripts/create-project.ts scan --project {{name}}

    ├─ 非法名 → 展示 name_error + 回 A1
    ├─ 已完整项目 → 跳到 B3
    └─ 缺失项 → 进 A3

A3. 展示 diff 表 + AskUser
    ```
    目标项目：{{name}}
    状态：{{exists ? "已存在，将补齐" : "全新创建"}}

    将创建的目录：
    - workspace/{{name}}/{{missing_dirs}}
    将创建的文件：
    - workspace/{{name}}/{{missing_files}}
    将注册 config.json：{{config_registered ? "已注册，跳过" : "是"}}
    将调用 knowledge-keeper index：是

    选项：[确认创建] [调整名称] [取消]
    ```

A4. CLI create --confirmed
    bun run .claude/scripts/create-project.ts create --project {{name}} --confirmed

    展示输出 JSON 的 markdown 摘要（created_dirs / created_files / registered_config / index_path）

A5. AskUser 源码仓库
    ```
    是否配置源码仓库？（可跳过，后续需要时再加）
    选项：[配置仓库] [跳过]
    ```

A6. clone-repo 循环
    AskUser 每次：
    ```
    请输入 Git URL（http://... 或 git@...）：
    分支（默认 main）：
    ```

    bun run .claude/scripts/create-project.ts clone-repo \
      --project {{name}} --url {{url}} [--branch {{branch}}]

    成功后：
    ```
    已克隆：{{local_path}}
    选项：[继续添加] [完成]
    ```

A7. 摘要 + 下一步
    ```
    ✓ 项目 {{name}} 已创建
    ✓ {{created_dirs.length}} 个子目录、{{created_files.length}} 个模板文件、{{repo_count}} 个仓库
    ✓ config.json 已注册
    ✓ knowledge/_index.md 已生成

    下一步：
    - 生成测试用例：/test-case-gen（选择项目 {{name}}）
    - 编辑业务知识：/knowledge-keeper（选择项目 {{name}}）
    - 追加源码仓库：/create-project clone-repo --project {{name}} --url ...
    ```
```

### 7.3 补齐流程（B 场景）

```
B1. 识别意图
    ├─ 用户直接 /create-project 已存在项目名
    └─ 或在 A2 scan 发现 exists=true + skeleton_complete=false

B2. CLI scan（同 A2）

B3. 无差异
    ```
    ✓ 项目 {{name}} 结构完整，无需补齐
    ```

B4. 有差异 → 复用 A3 展示 + A4 执行
```

### 7.4 只读查询流程（C 场景）

```
触发词："查看项目 xxx 状态" / "列出所有项目"

CLI scan → markdown 表渲染（不做任何修改）
多项目列表：扫描 workspace/ 所有子目录对每个跑 scan
```

### 7.5 Subagent 调用守则

- subagent **禁止**直接调 `create` / `clone-repo`（写操作）
- subagent 可自由调 `scan`（只读安全）
- subagent 发现需创建项目时，在返回报告标注：`建议创建项目：{{name}}`
- 主 agent 收到后由本 skill 统一处理

---

## 8. 测试策略

### 8.1 Layer 1：单元测试

`.claude/scripts/__tests__/lib/create-project.test.ts` 覆盖 `lib/create-project.ts` 纯函数：

| 测试组 | 核心用例 |
|---|---|
| `validateProjectName` | 合法 camelCase / 合法 kebab / 合法拼音 / 首字符数字拒 / 保留字拒 / 过长拒 / 过短拒 / 特殊字符拒 |
| `diffProjectSkeleton` | 空项目 / 完整项目 / 缺单目录 / 缺单模板文件 / 只缺 .gitkeep |
| `mergeProjectConfig` | 空 config / 已有其他项目 / 已有同名项目（不覆盖 repo_profiles） |
| `renderTemplate` | `{{project}}` 单次替换 / 多次替换 / 无占位原样返回 |
| `resolveSkeletonSpec` | 目标骨架常量的组成（目录列表 / 模板文件映射） |

### 8.2 Layer 2：集成测试

`.claude/scripts/__tests__/create-project.test.ts` 通过 `Bun.spawn` 走真实 CLI：

**fixture 策略：**

```typescript
const fixtureProject = "cp-fixture-test";
const fixtureWorkspace = join(repoRoot(), "workspace", fixtureProject);
const configPath = join(repoRoot(), "config.json");
let configBackup: string;

before(() => {
  configBackup = readFileSync(configPath, "utf-8");
});

after(() => {
  rmSync(fixtureWorkspace, { recursive: true, force: true });
  writeFileSync(configPath, configBackup);
});
```

**覆盖场景：**

- `scan` 不存在项目 → `exists: false` + `missing_dirs` 填满
- `scan` 完整项目（手工 mkdir 所有目录后）→ `skeleton_complete: true`
- `create --dry-run` 不落盘 + 输出 `will_create`
- `create --confirmed` 落盘 + config.json 注册 + _index.md 生成
- `create` 幂等：第二次调用 → `{ skipped: true }`
- `create` 已存在但缺某目录 → 只补缺失目录，不覆盖已有文件
- `create` 非法名 → exit 1 + stderr 含 reason
- `clone-repo` 用本地 bare repo 做 e2e（避免外部网络依赖）：
  - 在 `os.tmpdir()` 下创建临时目录 + `git init --bare test-bare.git`
  - `clone-repo --project cp-fixture-test --url file:///<tmp>/test-bare.git`
  - 断言 `workspace/cp-fixture-test/.repos/<tmp-parent>/test-bare/.git/` 存在
  - `after()` 清理 tmpdir
- `clone-repo` 已克隆 → exit 1
- `clone-repo` 项目不存在 → exit 1

**副作用清理铁律**：所有向 `workspace/cp-fixture-test/` 写入的测试必须在 `after` 清理 + config.json 回滚（对齐 CLAUDE.md）。

### 8.3 Layer 3：Smoke 验证（阶段末手动）

```bash
# 1. 创建烟雾项目
bun run .claude/scripts/create-project.ts create --project smokeProj --confirmed

# 2. 验证骨架
ls workspace/smokeProj/knowledge/
cat workspace/smokeProj/knowledge/_index.md | head -5

# 3. 验证 config.json
jq '.projects.smokeProj' config.json

# 4. 验证幂等
bun run .claude/scripts/create-project.ts create --project smokeProj --confirmed
# 期望：{ "skipped": true, ... }

# 5. 验证 knowledge-keeper 集成
bun run .claude/scripts/knowledge-keeper.ts lint --project smokeProj
# 期望：errors=[], warnings 可能存在（overview.md / terms.md 默认 tags=[]）

# 6. 清理
rm -rf workspace/smokeProj
git checkout config.json
```

---

## 9. Success Criteria

- [ ] 本 spec 入库：`docs/refactor/specs/2026-04-18-create-project-skill-design.md`
- [ ] Plan 入库：`docs/refactor/plans/2026-04-18-create-project-implementation.md`
- [ ] CLI 入口脚本：`.claude/scripts/create-project.ts`
- [ ] 纯函数库：`.claude/scripts/lib/create-project.ts`
- [ ] SKILL：`.claude/skills/create-project/SKILL.md`
- [ ] Templates：`templates/project-skeleton/knowledge/overview.md` / `terms.md` / `rules/README.md`
- [ ] 单元测试：`.claude/scripts/__tests__/lib/create-project.test.ts`
- [ ] 集成测试：`.claude/scripts/__tests__/create-project.test.ts`
- [ ] init-wizard.ts 的 clone 子命令迁出（调用改引用新 CLI；setup SKILL.md 引用留子目标 3 清理）
- [ ] `bun test ./.claude/scripts/__tests__` 全绿（原 551 条 + 新增）
- [ ] Smoke 步骤 1-6 全通过
- [ ] 幂等性：同项目连跑两次 `create --confirmed` 无磁盘变动
- [ ] 现有项目 `dataAssets` / `xyzh` scan 后 `skeleton_complete=true`（Phase 0 骨架兼容）
- [ ] 无硬编码：无绝对路径、无凭证、无内部服务地址（用 `repoRoot()` / `workspaceDir()`）
- [ ] 原子 commit：spec / plan / lib / CLI / templates / tests / SKILL / init-wizard 迁移各独立

---

## 10. Risks

| 风险 | 缓解 |
|---|---|
| 现有 `dataAssets` / `xyzh` 骨架与新模板文案漂移 | create 幂等补齐默认**不覆盖**已存在文件，现有项目文案保留原样 |
| init-wizard.ts clone 子命令被外部脚本或文档引用 | 迁移前 `grep -r "init-wizard.ts clone" .`，更新所有调用；setup SKILL.md 的文案由子目标 3 清理 |
| Phase 0 骨架 `_index.md` 首次被 `knowledge-keeper index` 重写 | 符合预期（子目标 1 已兼容）；新项目无旧 _index.md，全新生成无冲突 |
| 项目名校验过严拒绝历史项目 | 字符集兼容 camelCase + kebab + 全拼音；保留字仅限系统目录名；附 `--force-name` 逃生口（本期 Not Do，仅文档预留） |
| config.json 写入时其他进程并发修改 | 仅单 CC session 场景；read → merge → write 原子性由 fs.writeFileSync 保证 |
| clone-repo 用 http/ssh 远端仓库慢或失败 | 非致命（用户可稍后重试）；本 CLI 仅调 `git clone`，失败码透传 |
| 模板文件占位 `{{project}}` 写错或遗漏 | renderTemplate 单测覆盖；smoke 验证 overview.md H1 包含项目名 |
| 新增测试触发 workspace/cp-fixture-test/ 残留 | after() 铁律清理；CI 跑完确认 `git status` 干净 |
| knowledge-keeper index 失败导致 create 半途 | CLI 透传错误；用户可重跑 `create --confirmed`（幂等）或手动调 `knowledge-keeper index` |

---

## 11. Out of Scope（转入后续阶段或 Not Do）

- `setup` SKILL.md 瘦身 → 子目标 3
- init-wizard.ts 其他子命令重构 → 子目标 3
- 项目删除 / 重命名 skill → 超 scope
- 项目间资源迁移 → 超 scope
- config.json repo_profiles 的交互式管理 UI → 超 scope
- 项目名的 `--force-name` 逃生口 → 本期 Not Do
- 并发写锁 → 超 scope（单 session 假设）
- knowledge-keeper index 失败时的自动回滚 → 超 scope（用户重跑即可）

---

## 12. 交付后下一步

1. 本 spec 由用户审查通过后，`brainstorming` skill 交棒 `writing-plans` skill
2. writing-plans 产出 `docs/refactor/plans/2026-04-18-create-project-implementation.md`
3. 实施阶段走 `subagent-driven-development`
4. 全部 Success Criteria 对号入座 + 原子 commit 后，继续 Phase 1 子目标 3（setup 瘦身）
