# qa-flow Workflow Handbook

使用中文回复, 不要使用英文或其它语言回复。
本文件是 qa-flow 的权威工作流手册。细化规则以 `.claude/rules/*.md` 为准，路径映射以 `.claude/config.json` 为准。

> 不知道从哪开始？输入 `/using-qa-flow` 查看功能菜单；首次使用「生成测试用例」前需完成 `/using-qa-flow init`；「分析报错」和「转化历史用例」可直接使用。

---

> **术语约定**：本项目中「PRD」「Story」「需求文档」均指同一类输入文件，统一存放于 `cases/prds/`。
> 「转化」指内容/格式归档（CSV→MD）；「转换」指格式变换（JSON→XMind）。

## 快速开始

```bash
# ⭐ 最常用 — 生成测试用例（完整流程）
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

# 局部修改/新增用例（不读 PRD，直接改 XMind）
修改用例 "验证导出仅导出当前筛选结果且文件命名符合规则"
新增用例 到 "规则列表页" 分组

# 线上问题转化（直接发禅道链接）
http://zenpms.dtstack.cn/zentao/bug-view-138845.html
```

---

## 工作区结构

```text
qa-flow/
├── config/                            # 项目级配置文件（如分支映射）
├── CLAUDE.md                          # 本文件
├── cases/
│   ├── xmind/                         # XMind 输出
│   ├── archive/                       # 归档 Markdown
│   ├── issues/                        # 线上问题用例（原 archive/online-cases/）
│   ├── prds/                          # PRD / Story 文档（原 requirements/）
│   └── history/                       # 历史 CSV 原始资料
├── .repos/                            # 源码仓库（只读，当 config.repos 非空时使用）
├── reports/                           # 代码分析报告
├── assets/images/                     # 全局图片
├── tools/                             # 内置第三方工具
└── .claude/
    ├── config.json                    # 模块/仓库/路径唯一权威来源
    ├── rules/                         # 全局规则
    ├── shared/                        # 共享脚本和 Schema
    └── skills/                        # 项目 Skills
```

---

## Skill 索引

| Skill                  | 描述                                               | 触发词                          |
| ---------------------- | -------------------------------------------------- | ------------------------------- |
| `using-qa-flow`        | 功能菜单 + 环境初始化                              | `/using-qa-flow` · `/using-qa-flow init`                |
| `test-case-generator`  | 完整用例生成流程                                   | `生成测试用例` · `为 Story-xxx` · `写用例` · `追加用例` · `从蓝湖导入` |
| `prd-enhancer`         | PRD 图片描述 + 增强 + 健康度预检                   | `增强 PRD` · `读取 PRD 图片` · `PRD 预处理`              |
| `xmind-converter`      | JSON → XMind 转换                                  | `转换为 XMind` · `生成 XMind 文件` · `输出 XMind`        |
| `xmind-editor`         | 局部修改/新增/删除 XMind 用例（无需读 PRD）         | `修改用例` · `编辑用例` · `新增用例` · `更新步骤` · `删除用例` |
| `archive-converter`    | CSV/XMind → 归档 Markdown                          | `转化历史用例` · `归档用例` · `更新归档用例`              |
| `code-analysis-report` | 报错日志 → HTML 分析报告；禅道 Bug → 线上问题用例  | `帮我分析这个报错` · `分析一下冲突` · 禅道 Bug 链接      |

---

## 源码仓库项目规则（当 config.repos 非空时启用）

> 以下规则仅在 config.json 中 `repos` 字段为非空对象时适用。若 `repos: {}` 则跳过本节。

- PRD 只是线索，必须以 `.repos/` 目标分支源码为准。
- 蓝湖导入后强制执行：`req-elicit` → `source-sync` → `prd-formalize` → `prd-enhancer` → Writer → Reviewer。
- Archive 按年月目录落盘：`cases/archive/YYYYMM/`。

---

## 编排说明

- 断点状态：
  - 单 PRD：`<prds目录>/.qa-state-{prd文件名}.json`
  - 批量：`<prds目录>/.qa-state.json`
- 质量阈值：`< 15%` 自动修正；`15-40%` 自动修正+警告；`> 40%` 阻断
- 源码仓库清单：见 `.claude/config.json` 的 `repos` 字段
- 报错定位：优先参考 config.json 的 `repos` 和 `stackTrace` 字段定位目标仓库

---

## 规范索引

| 文件                                            | 内容                                   |
| ----------------------------------------------- | -------------------------------------- |
| `.claude/rules/directory-naming.md`             | 模块 key、路径别名、命名规则           |
| `.claude/rules/repo-safety.md`                  | 源码仓库只读规则                       |
| `.claude/rules/archive-format.md`               | Archive Markdown 模板与层级映射        |
| `.claude/rules/xmind-output.md`                 | XMind 命名、层级、输出路径             |
| `.claude/rules/test-case-writing.md`            | 用例编写硬性规则                       |
| `.claude/rules/image-conventions.md`            | 图片引用、路径、压缩规则               |
| `.claude/shared/schemas/front-matter-schema.md` | PRD/Archive 统一 front-matter Schema   |
| `.claude/config.json`                           | 模块、仓库、报告目录的唯一权威来源 |
