# Directory Alignment Design

> 2026-04-29 | Status: Draft

## 背景

项目初始重构时规划了完整的目录层级架构，但实际执行中产生了多处偏差。本次变更的目标是一步到位对齐规划与现状，消除目录结构中的歧义和技术债。

## 变更范围

### 1. lanhu 合并

**问题**：`plugins/lanhu/`（TS fetch 插件）和 `tools/lanhu/`（Python MCP bridge，git submodule）功能不同但名称重复。

**方案**：合并到 `plugins/lanhu/`，Python MCP bridge 作为子目录。

```
plugins/lanhu/
├── fetch.ts              ← 原 plugins/lanhu/fetch.ts（不动）
├── plugin.json           ← 原 plugins/lanhu/plugin.json
├── __tests__/            ← 原 plugins/lanhu/__tests__/
├── README.md             ← 原 plugins/lanhu/README.md
└── mcp-bridge/           ← 原 tools/lanhu/（整体移入）
    ├── bridge.py
    ├── refresh-cookie.py
    ├── setup.sh
    └── lanhu-mcp/        ← git submodule（保持）
```

**操作**：

1. `git mv tools/lanhu plugins/lanhu/mcp-bridge`
2. 更新 `.gitmodules`：`path = tools/lanhu/lanhu-mcp` → `path = plugins/lanhu/mcp-bridge/lanhu-mcp`
3. 更新 `plugin.json` 中的 commands 路径（如有引用 tools/lanhu）

### 2. engine/lib 提升

**问题**：规划中 `engine/lib/` 是顶层目录，实际是 `engine/src/lib/`（41 个文件）。

**方案**：提升到 `engine/lib/`，`src/` 只保留入口脚本和 cli/。

```
engine/
├── lib/                  ← 从 engine/src/lib/ 提升
│   ├── (41 个文件)
├── hooks/                ← 保持
├── references/           ← 保持
├── src/
│   ├── cli/
│   ├── lint/
│   ├── codemod/
│   ├── migration/
│   ├── (30+ 入口脚本)
│   └── index.ts
├── bin/kata-cli
└── tests/
```

**操作**：

1. `git mv engine/src/lib engine/lib`
2. 更新 engine/src/ 下所有 import 路径：
   - `engine/src/*.ts` 中 `./lib/` → `../lib/`
   - `engine/src/cli/*.ts` 中 `../lib/` → `../../lib/`
3. `tsc --noEmit` 验证无编译错误

### 3. 目录结构补充说明

以下目录在原规划中未提及但实际存在，补充到架构文档中：

| 目录                 | 说明                                                                               | gitignore                 |
| -------------------- | ---------------------------------------------------------------------------------- | ------------------------- |
| `scripts/lint/`      | CI 辅助 lint 脚本（check-debug-files, check-runtime-artifacts, check-stale-paths） | 否                        |
| `.auth/`             | 运行时 session 数据（session.json）                                                | 是                        |
| `.kata/`             | Desktop app 数据（ui.db）                                                          | 是                        |
| `config/`            | repo-branch-mapping.yaml                                                           | 是（yaml），否（example） |
| `engine/hooks/`      | Claude Code hook 脚本（pre-bash-guard, post-edit-format 等）                       | 否                        |
| `engine/references/` | 引擎级参考文档（priority.md）                                                      | 否                        |

### 4. workspace 项目完整性

为 `workspace/dataAssets/` 和 `workspace/xyzh/` 补齐：

- `README.md` — 项目说明
- `project.json` — 项目元数据

### 5. features/{ym}-{slug}/tests/ 子目录规范

写入架构文档作为 kata-cli scaffold 的目标结构：

```
features/{ym}-{slug}/tests/
├── README.md                ← 套件说明：用例编号 → 业务场景映射
├── runners/
│   ├── full.spec.ts         ← 全量
│   ├── smoke.spec.ts        ← 冒烟
│   └── retry-failed.spec.ts ← 失败重跑
├── cases/
│   ├── README.md            ← 编号 → 场景映射表（强制）
│   └── {module}/            ← ≥15 case 时按模块分组
│       ├── t01-{slug}.ts
│       └── t02-{slug}.ts
├── helpers/
│   └── README.md
├── data/
│   └── README.md
├── unit/                    ← 可选
└── .debug/                  ← gitignore
```

**CI lint 规则**：

- `cases/*.ts` 匹配 `^t\d{2}-[a-z0-9-]+\.ts$`
- `helpers/*.ts` 单文件 ≤ 800 行
- `data/` 禁止 `*_v[0-9]` 变体
- `runners/` 只允许 `*.spec.ts`
- `cases/` ≥15 文件时必须有 ≥2 个模块子目录
- `cases/README.md` 必须存在

### 6. kata-cli scaffold 子命令

新增 `kata-cli scaffold tests --project {project} --feature {ym}-{slug}`：

- 创建上述目录骨架
- 生成模板 README.md
- 生成 runners/full.spec.ts + smoke.spec.ts 模板
- ui-autotest skill workflow 步骤 1 中调用

### 7. 文档更新

**架构文档**：`docs/architecture/directory-structure.md`

- 完整目录树
- 每个顶层目录一句话说明
- workspace/{project}/ 标准结构
- tests/ 子目录规范
- CI lint 规则清单

**README 更新**：README.md + README-EN.md 增加架构概览段落，指向 docs/architecture/。

### 8. skills/agents 路径影响

**无需变更**的引用（路径未受影响）：

- `.claude/skills/ui-autotest/` — 引用 `lib/playwright/`（不变）
- `.claude/agents/script-writer-agent.md` — 引用 `lib/playwright/`（不变）
- `.claude/agents/convergence-agent.md` — 引用 `lib/playwright/`（不变）
- 所有 skills/agents 中的 `workspace/` 引用（不变）

**需变更**的引用（engine/lib 提升）：

- `engine/src/*.ts` 中 `./lib/` → `../lib/`
- `engine/src/cli/*.ts` 中 `../lib/` → `../../lib/`

## 执行顺序

1. lanhu 合并（git mv + .gitmodules 更新）
2. engine/lib 提升（git mv + import 路径更新）
3. tsc --noEmit 验证
4. 补齐 workspace 项目元数据
5. 创建架构文档
6. 更新 README.md / README-EN.md
7. bun test --cwd engine 验证
8. 原子提交

## 验证标准

- `tsc --noEmit` 零错误
- `bun test --cwd engine` 全绿
- `biome check .` 通过
- `git grep 'tools/lanhu'` 无结果
- `git grep 'engine/src/lib/'` 无结果（除 git history）
