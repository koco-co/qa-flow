# qa-flow Workflow Handbook

本文件是 qa-flow 的 **canonical human-facing workflow handbook**。面向人工与 Skills：

- 工作流说明、目录结构、命名 contract 以本文件为准
- 细化规则以 `.claude/rules/*.md` 为准
- 路径映射以 `.claude/config.json` 为准
- 若 README、Skill、历史提示词出现旧称呼（如 `archive-cases/`），以本文件说明的当前目录为准

> 不知道从哪开始？输入 `/using-qa-flow` 查看功能菜单；首次使用输入 `/using-qa-flow init` 初始化环境。

---

## 快速开始

```bash
# 生成测试用例（完整流程）
为 Story-20260322 生成测试用例
为 Story-20260322 --quick 生成测试用例

# 续传 / 模块重跑
继续 Story-20260322 的用例生成
重新生成 Story-20260322 的「列表页」模块用例

# 强制全量重跑
rm -f cases/requirements/<root>/Story-YYYYMMDD/.qa-state.json
rm -f cases/requirements/<root>/Story-YYYYMMDD/PRD-XX-<功能名>-enhanced.md

# 单独使用各 Skill
帮我增强这个 PRD：<PRD文件路径>
帮我分析这个报错
转化所有历史用例
```

---

## 工作区结构

```text
qa-flow/
├── config/
│   └── repo-branch-mapping.yaml   # DTStack repo/branch 映射（source of truth）
├── CLAUDE.md                      # 权威工作流手册（本文件）
├── cases/
│   ├── xmind/                     # XMind 输出
│   ├── archive/                   # 归档 Markdown 根目录
│   ├── requirements/              # PRD / Story 文档
│   └── history/                   # 历史 CSV 原始资料
├── .repos/                        # 源码仓库（只读）
├── reports/                       # 代码分析报告
├── assets/images/                 # 全局图片
├── tools/                         # 内置第三方工具（lanhu-mcp）
└── .claude/
    ├── config.json                # 模块 / 仓库 / 路径 source of truth
    ├── rules/                     # 全局规则（directory-naming, repo-safety）
    ├── shared/scripts/            # 共享基础脚本
    ├── shared/schemas/            # 统一 Schema 定义
    └── skills/                    # 项目 Skills
```

---

## Skill 索引

| Skill | 描述 | 触发词 |
| ----- | ---- | ------ |
| `using-qa-flow` | 功能菜单 + 5 步环境初始化 | `/using-qa-flow` |
| `test-case-generator` | 完整用例生成流程（10 步） | `生成测试用例` / `为 Story-xxx` |
| `prd-enhancer` | PRD 图片描述 + 增强 + 健康度预检 | `帮我增强这个 PRD` |
| `xmind-converter` | JSON → XMind 转换 | `转换为 XMind` / `生成 XMind` |
| `archive-converter` | CSV/XMind → 归档 Markdown | `转化历史用例` / `归档` |
| `code-analysis-report` | 报错日志 → HTML 分析报告 | `帮我分析这个报错` |

---

## 模块与路径命名

| 模块 key | 中文名 | 类型 | XMind 目录 | Archive 目录 | Requirements 目录 |
| -------- | ------ | ---- | ---------- | ------------ | ----------------- |
| batch-works | 离线开发 | DTStack | `cases/xmind/batch-works/` | `cases/archive/batch-works/` | — |
| data-assets | 数据资产 | DTStack | `cases/xmind/data-assets/` | `cases/archive/data-assets/` | `cases/requirements/data-assets/` |
| data-query | 统一查询 | DTStack | `cases/xmind/data-query/` | `cases/archive/data-query/` | — |
| variable-center | 变量中心 | DTStack | `cases/xmind/variable-center/` | `cases/archive/variable-center/` | — |
| public-service | 公共组件 | DTStack | `cases/xmind/public-service/` | `cases/archive/public-service/` | — |
| xyzh | 信永中和 | 定制 | `cases/xmind/custom/xyzh/` | `cases/archive/custom/xyzh/` | `cases/requirements/custom/xyzh/` |

- `xyzh` 是**模块 key**（用于 config.json、脚本参数；在 Archive/PRD frontmatter 中对应 `product` 字段）；`custom/xyzh` 是**文件系统路径别名**（用于 xmind、archive、requirements 目录层级）
- `cases/archive/` 是固定归档根目录；历史文案中的 `archive-cases/` 统一映射到此处
- DTStack requirements 版本目录：`cases/requirements/<module>/v{version}/`；文件名使用需求标题
- DTStack xmind 版本目录：`cases/xmind/<module>/v{version}/`；每需求一个独立 xmind 文件
- XYZH requirements 扁平目录：`cases/requirements/custom/xyzh/`；文件名使用需求标题（无 Story 层级）

---

## DTStack 与 XYZH 分流规则

### DTStack

- **PRD 只是线索，不是权威**。必须以 `.repos/` 目标分支源码为准理解真实逻辑与字段名。
- 在 Writer/Reviewer 前，必须先完成 `source-sync`（切到 `config/repo-branch-mapping.yaml` 解析的目标分支）。
- 蓝湖导入后强制执行：`source-sync` → `prd-formalizer` → `prd-enhancer` → Writer → Reviewer。
- Archive 按版本目录落盘：`cases/archive/data-assets/v6.4.10/`；单需求文件名优先使用需求标题。

### XYZH / 定制

- 沿用现有定制规范，不强制引入 DTStack 的源码分支同步与版本目录归档。

---

## 编排说明

- 断点状态：Story 目录下的 `.qa-state.json`（直接读写 JSON）
- 质量阈值：`< 15%` 自动修正；`15–40%` 自动修正+警告；`> 40%` 阻断等待决策
- 源码仓库清单：见 `.claude/config.json` `repos` 字段
- 前端报错优先查 `dt-insight-studio-front`；定制需求优先查 `.repos/CustomItem/`

---

## 规范索引

| 文件 | 内容 |
| ---- | ---- |
| `.claude/rules/directory-naming.md` | 模块 key、路径别名、Story/PRD/产物命名规则 |
| `.claude/rules/repo-safety.md` | 源码仓库只读规则 |
| `.claude/shared/schemas/front-matter-schema.md` | PRD/Archive 统一 front-matter Schema |
| `.claude/skills/test-case-generator/rules/test-case-writing.md` | 用例编写硬性规则 |
| `.claude/skills/xmind-converter/rules/xmind-output.md` | XMind 命名、层级、输出路径 |
| `.claude/skills/archive-converter/rules/archive-format.md` | Archive Markdown 模板与层级映射 |
| `.claude/skills/prd-enhancer/rules/image-conventions.md` | 图片引用、路径、压缩规则 |
| `.claude/config.json` | 模块、仓库、报告目录的 source of truth |
