# qa-flow Workflow Handbook

本文件是 qa-flow 的权威工作流手册。细化规则以 `.claude/rules/*.md` 为准，路径映射以 `.claude/config.json` 为准。

> 不知道从哪开始？输入 `/using-qa-flow` 查看功能菜单；首次使用输入 `/using-qa-flow init` 初始化环境。

---

## 快速开始

```bash
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
```

---

## 工作区结构

```text
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
```

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
