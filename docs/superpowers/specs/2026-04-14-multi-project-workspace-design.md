# 多项目 Workspace 管理 — 设计文档

**日期**：2026-04-14  
**状态**：已批准，待实施

---

## 背景

qa-flow 目前的 `workspace/` 是单项目扁平结构，所有产物（xmind、archive、prds、issues、reports）都混放在同一层级。随着信永中和（xyzh）等新项目加入，需要按项目名称隔离工作区。

---

## 目标

- `workspace/` 下每个项目有独立子目录，互不污染
- 脚本、Skills 统一通过 `project` 参数寻址
- 支持项目级偏好规则覆盖全局偏好
- 渐进式迁移：框架改完后新内容直接写新结构，旧内容手动迁移

---

## 目录结构

```
workspace/
├── dataAssets/                  # 数据资产项目
│   ├── prds/YYYYMM/             # PRD 需求文档
│   ├── xmind/YYYYMM/            # XMind 测试用例
│   ├── archive/YYYYMM/          # Archive Markdown 归档
│   │   └── tmp/                 # 中间产物（标准化 JSON 等）
│   ├── issues/YYYYMM/           # Hotfix 用例
│   ├── reports/                 # 分析报告（HTML/PDF）
│   │   ├── bugs/YYYYMMDD/
│   │   └── playwright/YYYYMM/
│   ├── historys/                # 历史数据
│   ├── tests/                   # Playwright 自动化脚本（原 e2e/）
│   ├── preferences/             # 项目级偏好（覆盖全局 preferences/）
│   ├── .repos/                  # 源码仓库克隆（只读）
│   └── .temp/                   # 状态文件
│       └── .qa-state-*.json
├── xyzh/                        # 信永中和项目
│   ├── prds/YYYYMM/
│   ├── xmind/YYYYMM/
│   ├── archive/YYYYMM/
│   ├── issues/YYYYMM/
│   ├── reports/
│   ├── historys/
│   ├── tests/
│   ├── preferences/
│   ├── .repos/
│   └── .temp/
└── .gitkeep
```

全局 `preferences/` 保留，项目级 `preferences/` 优先。

---

## 路径系统（paths.ts）

所有路径函数增加 `project` 必需参数，无向后兼容旧路径。

```typescript
function projectDir(project: string): string
  → `workspace/${project}`

function xmindDir(project: string): string
  → `workspace/${project}/xmind`

function archiveDir(project: string): string
  → `workspace/${project}/archive`

function prdsDir(project: string): string
  → `workspace/${project}/prds`

function issuesDir(project: string): string
  → `workspace/${project}/issues`

function reportsDir(project: string): string
  → `workspace/${project}/reports`

function testsDir(project: string): string
  → `workspace/${project}/tests`

function reposDir(project: string): string
  → `workspace/${project}/.repos`

function tempDir(project: string): string
  → `workspace/${project}/.temp`

function preferencesDir(project: string): string
  → `workspace/${project}/preferences`
```

---

## 配置结构（config.json）

```json
{
  "projects": {
    "dataAssets": {
      "repo_profiles": {
        "岚图": {
          "repos": [
            { "path": ".repos/customltem/dt-center-assets", "branch": "release_6.3.x_ltqc" },
            { "path": ".repos/customltem/dt-insight-studio", "branch": "dataAssets/release_6.3.x_ltqc" }
          ]
        }
      }
    },
    "xyzh": {
      "repo_profiles": {}
    }
  }
}
```

`.repos` 路径相对于项目目录（即 `workspace/${project}/`）。

---

## Frontmatter 变更

所有 archive/issues 下的 MD 文件 frontmatter 新增 `project` 字段：

```yaml
---
project: "dataAssets"
suite_name: "xxx"
description: "..."
prd_version: "v6.4.x"
# ... 其余字段不变
---
```

---

## 状态文件变更（state.ts）

```
旧：workspace/.temp/.qa-state-${prd-slug}.json
新：workspace/${project}/.temp/.qa-state-${prd-slug}.json
```

状态 JSON 新增 `project` 字段：

```json
{
  "project": "dataAssets",
  "prd": "workspace/dataAssets/prds/202604/xxx.md",
  "current_node": "...",
  "..."
}
```

旧 `.temp/` 下的状态文件直接丢弃，不做兼容。

---

## 偏好加载策略（lib/preferences.ts）

加载顺序（后者覆盖前者）：

1. 全局 `preferences/` 下对应文件
2. `workspace/${project}/preferences/` 下同名文件（若存在）

合并为同一规则集，项目级规则优先。

---

## Skill 变更

### setup/skill.md

- 增加步骤 1（项目管理）：选择已有项目或创建新项目
- 输入项目名称（英文短名，如 `dataAssets`）
- 自动创建 `workspace/${project}/` 完整子目录结构
- 将项目写入 `config.json`

### qa-flow/skill.md

- 菜单显示当前项目名称
- 新增选项 6：切换项目

### test-case-gen、code-analysis、xmind-editor、ui-autotest

- 流程开头扫描 `workspace/` 下的项目列表
- 若只有 1 个项目，自动选中
- 若有多个项目，提示用户选择
- 所有路径引用加上 `workspace/${project}/` 前缀

### ui-autotest/skill.md

- 测试脚本路径：`workspace/${project}/tests/`（去掉旧的 `e2e/` 目录）
- 报告输出：`workspace/${project}/reports/playwright/`

---

## 改动范围汇总

| 层级 | 涉及文件 | 改动程度 |
|------|----------|----------|
| 脚本核心（lib/paths.ts 等） | ~12 | 中等 |
| Skills（6 个 skill.md） | ~6 | 中等 |
| 测试（__tests__/） | ~12 | 中等 |
| 配置（config.json、.env） | ~2 | 小 |
| 插件（lanhu/fetch.ts 等） | ~2 | 小 |
| **总计** | **~34 个文件** | |

---

## 实施顺序（渐进式）

### Phase 1 — 框架改造（先行）

1. `lib/paths.ts` — 所有函数增加 `project` 必需参数
2. `lib/env-schema.ts` — 新增 `PROJECT_NAME` 可选字段
3. `config.ts` — 配置读取改为 `projects.${project}` 层级
4. `config.json` — 结构改造
5. `state.ts` — 状态路径适配
6. `lib/preferences.ts` — 支持项目级偏好
7. 所有 `__tests__/` 全量适配并通过

### Phase 2 — Skills 改造

1. `setup/skill.md` — 项目创建流程
2. `qa-flow/skill.md` — 入口菜单
3. `test-case-gen/skill.md`
4. `code-analysis/skill.md`
5. `xmind-editor/skill.md`
6. `ui-autotest/skill.md`

### Phase 3 — 脚本调用方适配

1. `archive-gen.ts`、`xmind-gen.ts`、`xmind-edit.ts`
2. `repo-sync.ts`、`report-to-pdf.ts`、`prd-frontmatter.ts`
3. `history-convert.ts`
4. `plugins/lanhu/fetch.ts`

### Phase 4 — 数据迁移（手动，按需）

- `workspace/xmind/` → `workspace/dataAssets/xmind/`
- `workspace/archive/` → `workspace/dataAssets/archive/`（信永中和文件移至 `workspace/xyzh/`）
- `workspace/prds/` → `workspace/dataAssets/prds/`
- `workspace/issues/` → `workspace/dataAssets/issues/`
- `workspace/reports/` → `workspace/dataAssets/reports/`
- 迁移完成后删除旧扁平目录

---

## 验收标准

- [ ] `bun test .claude/scripts/__tests__` 全量通过
- [ ] `/qa-flow init` 能创建新项目并生成完整子目录结构
- [ ] `/test-case-gen` 在指定项目下正常完成 PRD → XMind + Archive 流程
- [ ] `/xmind-editor` 能搜索指定项目的 xmind 文件
- [ ] `/code-analysis` 输出到指定项目的 issues 目录
- [ ] `/ui-autotest` 脚本存放于 `tests/`，报告输出到 `reports/`
- [ ] Archive/Issues MD frontmatter 包含 `project` 字段
- [ ] 项目级 `preferences/` 能覆盖全局规则
- [ ] 多项目场景下选择项目流程正常
