# Session 5: CLAUDE.md 瘦身 (T08)

> 分支: `feat/qa-workflow-optimize`
> 前置: Session 1-4 已完成

## 目标

将 CLAUDE.md 从 ~250 行精简到 ~100 行。移除与 `rules/*.md` 重复的内容，仅保留顶层导航和分流规则。

## 涉及文件

| 文件 | 改动类型 |
|------|---------|
| `CLAUDE.md` | 大幅精简 |

## 背景

当前 CLAUDE.md 包含大量与 `rules/` 下文件重复的内容：
- `模块与路径命名` 表格 → 已在 `rules/directory-naming.md` 中完整定义
- `DTStack 与 XYZH 分流规则` 中的详细步骤 → 部分与 `rules/repo-safety.md` 和 step prompt 重复
- `编排说明` → 已在 `SKILL.md` 中详细定义

CLAUDE.md 被 Claude Code 在每次对话开始时自动加载到 context，内容越多 = context 占用越多。

## 详细改动

将 CLAUDE.md 重写为以下结构（保留 YAML front-matter 之外的内容）：

```markdown
# qa-flow Workflow Handbook

本文件是 qa-flow 的权威工作流手册。细化规则以 `.claude/rules/*.md` 为准，路径映射以 `.claude/config.json` 为准。

> 不知道从哪开始？输入 `/using-qa-flow` 查看功能菜单；首次使用输入 `/using-qa-flow init` 初始化环境。

---

## 快速开始

​```bash
# 生成测试用例（完整流程）
为 Story-20260322 生成测试用例
为 Story-20260322 --quick 生成测试用例

# 蓝湖 URL 直接导入
生成测试用例 https://lanhuapp.com/web/#/item/project/product?tid=xxx&pid=xxx&docId=xxx

# 续传 / 模块重跑
继续 Story-20260322 的用例生成
重新生成 Story-20260322 的「列表页」模块用例

# 单独使用各 Skill
帮我增强这个 PRD：<PRD文件路径>
帮我分析这个报错
转化所有历史用例
​```

---

## 工作区结构

​```text
qa-flow/
├── config/repo-branch-mapping.yaml   # DTStack repo/branch 映射
├── CLAUDE.md                          # 本文件
├── cases/
│   ├── xmind/                         # XMind 输出
│   ├── archive/                       # 归档 Markdown
│   ├── requirements/                  # PRD / Story 文档
│   └── history/                       # 历史 CSV 原始资料
├── .repos/                            # 源码仓库（只读）
├── reports/                           # 代码分析报告
├── assets/images/                     # 全局图片
├── tools/                             # 内置第三方工具
└── .claude/
    ├── config.json                    # 模块/仓库/路径 source of truth
    ├── rules/                         # 全局规则
    ├── shared/                        # 共享脚本和 Schema
    └── skills/                        # 项目 Skills
​```

---

## Skill 索引

| Skill | 描述 | 触发词 |
| ----- | ---- | ------ |
| `using-qa-flow` | 功能菜单 + 环境初始化 | `/using-qa-flow` |
| `test-case-generator` | 完整用例生成流程 | `生成测试用例` / `为 Story-xxx` |
| `prd-enhancer` | PRD 图片描述 + 增强 + 健康度预检 | `帮我增强这个 PRD` |
| `xmind-converter` | JSON → XMind 转换 | `转换为 XMind` |
| `archive-converter` | CSV/XMind → 归档 Markdown | `转化历史用例` |
| `code-analysis-report` | 报错日志 → HTML 分析报告 | `帮我分析这个报错` |

---

## DTStack 与 XYZH 分流规则

### DTStack

- **PRD 只是线索，不是权威**。必须以 `.repos/` 目标分支源码为准。
- 蓝湖导入后强制执行：`source-sync` → `prd-formalizer` → `prd-enhancer` → Writer → Reviewer。
- Archive 按版本目录落盘：`cases/archive/<module>/v{version}/`。

### XYZH / 定制

- 沿用现有定制规范，不强制引入 DTStack 的源码分支同步与版本目录归档。

---

## 编排说明

- 断点状态：Story 目录下的 `.qa-state.json`
- 质量阈值：`< 15%` 自动修正；`15-40%` 自动修正+警告；`> 40%` 阻断
- 源码仓库清单：见 `.claude/config.json` 的 `repos` 字段
- 前端报错优先查 `dt-insight-studio-front`；定制需求优先查 `.repos/CustomItem/`

---

## 规范索引

| 文件 | 内容 |
| ---- | ---- |
| `.claude/rules/directory-naming.md` | 模块 key、路径别名、命名规则 |
| `.claude/rules/repo-safety.md` | 源码仓库只读规则 |
| `.claude/rules/archive-format.md` | Archive Markdown 模板与层级映射 |
| `.claude/rules/xmind-output.md` | XMind 命名、层级、输出路径 |
| `.claude/rules/test-case-writing.md` | 用例编写硬性规则 |
| `.claude/rules/image-conventions.md` | 图片引用、路径、压缩规则 |
| `.claude/shared/schemas/front-matter-schema.md` | PRD/Archive 统一 front-matter Schema |
| `.claude/config.json` | 模块、仓库、报告目录的 source of truth |
```

### 关键原则

1. **删除的内容不需要迁移** — 它们在 `rules/*.md` 中已经有 canonical 版本
2. **不要改动 `rules/*.md`** — 本 session 只改 CLAUDE.md
3. **保留 DTStack/XYZH 分流规则** — 这是 CLAUDE.md 独有的顶层分流逻辑
4. 删除以下段落（在 rules/ 中已有）：
   - `## 模块与路径命名` 完整表格（6 行 + 注释）→ directory-naming.md
   - 任何引用"层级映射"的表格 → archive-format.md
   - 任何引用"XMind 层级结构"的描述 → xmind-output.md
   - `DTStack 与 XYZH 分流规则` 中关于 `source-sync` 的详细步骤描述 → step-source-sync.md
   - `## Story / PRD / 产物命名规则` → directory-naming.md

## 完成标准

- [ ] CLAUDE.md 行数 ≤ 120 行（含空行）
- [ ] 保留：快速开始、工作区结构、Skill 索引表、DTStack/XYZH 分流规则、编排说明、规范索引
- [ ] 移除：完整的模块路径表、层级映射表、XMind 结构描述、命名规则详情
- [ ] 移除的内容在对应 `rules/*.md` 中确实存在（不新增不修改 rules 文件，只验证）
- [ ] 规范索引表中所有链接的文件实际存在

## Commit

```
git add -A && git commit -m "refactor: slim CLAUDE.md from ~250 to ~100 lines, deduplicate with rules/ (T08)"
```
