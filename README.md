# QA Test Case Workspace

本仓库用于 QA 测试用例生成、历史归档转化与代码分析。`README.md` 只保留**入口导览**；完整工作流、命名 contract 和路径规则请以 `CLAUDE.md` 为准。

> 不知道从哪开始？输入 `/start` 查看功能菜单。

## 先读哪里

1. `CLAUDE.md` — 权威工作流手册（推荐先读）
2. `.claude/rules/*.md` — 主题细则（用例、XMind、Archive、仓库安全等）
3. `.claude/config.json` — 模块 / 仓库 / 报告路径 source of truth

## 常用指令

```bash
# 生成测试用例（完整流程）
生成用例 Story-20260322 PRD-26
为 <Story目录> 写测试用例

# 快速模式 / 续传 / 重跑
为 <Story目录> 快速生成测试用例
继续 <Story> 的用例生成
重新生成 <Story> 的「列表页」模块用例

# 单独使用各 Skill
帮我增强这个 PRD：<PRD文件路径>
帮我分析这个报错
转化所有历史用例
```

## 关键约定速览

- Archive 根目录固定为 `cases/archive/`。
- `xyzh` 是模块 key；`custom/xyzh` 只是 `cases/xmind/` 与 `cases/archive/` 下的路径别名。
- 输出分两类：
  - PRD 级：`YYYYMM-<功能名>.xmind` / `YYYYMM-<功能名>.md`
  - Story 级：`YYYYMM-Story-YYYYMMDD.xmind` / `YYYYMM-Story-YYYYMMDD.md`
- 仓库中已存在旧文件名（如 `信永中和测试用例.xmind`）时，不要求为对齐新 contract 而批量改名。
- `repos/` 下源码仓库只读；详细限制见 `CLAUDE.md#源码仓库安全规则` 与 `.claude/rules/repo-safety.md`。

## 目录入口

```text
WorkSpaces/
├── CLAUDE.md
├── README.md
├── cases/
│   ├── xmind/
│   ├── archive/
│   ├── requirements/
│   └── history/
├── repos/
├── reports/
├── assets/
└── .claude/
    ├── config.json
    └── rules/
```

## 详细规范入口

- `CLAUDE.md#测试用例编写规范`
- `CLAUDE.md#XMind 输出规范`
- `CLAUDE.md#历史用例维护`
- `CLAUDE.md#源码仓库详细清单`
- `CLAUDE.md#源码仓库安全规则`
- `.claude/rules/test-case-writing.md`
- `.claude/rules/xmind-output.md`
- `.claude/rules/archive-format.md`
- `.claude/rules/directory-naming.md`
- `.claude/rules/repo-safety.md`
