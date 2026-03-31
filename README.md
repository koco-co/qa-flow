# qa-flow

本仓库用于 QA 测试用例生成、蓝湖 URL 自动导入、历史归档转化与代码分析。

完整工作流、命名 contract 和路径规则以 `CLAUDE.md` 为准；`README.md` 仅作入口导览。

> 不知道从哪开始？输入 `/using-qa-flow` 查看功能菜单；首次使用输入 `/using-qa-flow init` 初始化环境。

---

## 快速开始

```bash
# 生成测试用例（完整流程）
为 Story-20260322 生成测试用例
生成测试用例 https://lanhuapp.com/web/#/item/project/product?tid=...&pid=...&docId=...

# 快速模式（跳过 Brainstorming/Checklist/确认）
为 Story-20260322 --quick 生成测试用例

# 续传 / 模块重跑
继续 Story-20260322 的用例生成
重新生成 Story-20260322 的「列表页」模块用例

# 单独使用各 Skill
帮我增强这个 PRD：<PRD文件路径>
帮我分析这个报错（附报错日志 + curl）
转化所有历史用例
```

> `--quick` 是推荐的快速模式写法；自然语言"快速生成测试用例"也会被识别为同一模式。

---

## 用户视角极简流程

```mermaid
flowchart LR
    A["输入蓝湖 URL\n/ PRD / Story"] --> B["底层自动处理\n蓝湖导入 → 分支同步 → PRD 整理 → PRD 增强\n→ 用例生成 → 评审 → XMind → 归档"]
    B --> C["根目录快捷链接\nlatest-output.xmind\nlatest-prd-enhanced.md"]
    C --> D["通知验收"]

    E["输入 curl\n/ 报错日志"] --> F["底层自动处理\n定位仓库 → 拉取代码 → 分析 → HTML 报告"]
    F --> G["根目录快捷链接\nlatest-bug-report.html\nlatest-conflict-report.html"]
    G --> D
```

---

## 架构概览

```mermaid
flowchart LR
    subgraph L1["Skills 入口层"]
        S1["test-case-generator"]
        S2["code-analysis-report"]
        S3["prd-enhancer\nxmind-converter"]
    end

    subgraph L2["Agents 执行层"]
        A1["case-writer（并行）"]
        A2["case-reviewer"]
        A3["prd-formalizer"]
        A4["code-analyzer"]
    end

    subgraph L3["Scripts 工具层"]
        T1["json-to-xmind.mjs"]
        T2["json-to-archive-md.mjs"]
        T3["sync-source-repos.mjs"]
    end

    S1 --> A1 & A2 & A3
    S2 --> A4
    S1 --> T1 & T2 & T3
```

---

## 测试用例生成详细流程

```mermaid
flowchart TD
    A["用户输入\nStory / PRD / 蓝湖 URL"] --> B["Step parse-input\n解析指令 + 续传检测"]

    B --> C{"蓝湖 URL?"}
    C -->|是| D["Step lanhu-ingest\nlanhu-mcp 提取原型内容"]
    C -->|否| E["扫描 Story 目录\n读取 PRD 文件列表"]
    D --> E

    E --> F{"存在 .qa-state.json?"}
    F -->|是| G["加载状态\n从 last_completed_step 续传"]
    F -->|否| H["初始化状态文件"]
    G & H --> I

    I["Step source-sync\nDTStack: 读取 config/repo-branch-mapping.yaml\n切换 .repos/ 到目标分支"]
    I --> J["Step prd-formalize\nDTStack: 结合源码生成正式需求文档"]
    J --> K["Step prd-enhancer\n增强 PRD + 健康度预检\n刷新 latest-prd-enhanced.md"]

    K --> L{"--quick 模式?"}
    L -->|否 full-mode| M["Step brainstorm\nBrainstorming + 解耦分析"]
    M --> N["Step checklist\nChecklist 预览 + 用户一次确认"]
    N --> O
    L -->|是 quick-mode| O

    O["Step writer\n并行 Writer Subagents"]
    O --> P{"所有 Writer\ncompleted/skipped?"}
    P -->|部分 failed| Q["等待用户决策\n重试 / 跳过 / 终止"]
    Q --> O
    P -->|是| R

    R["Step reviewer\nReviewer Subagent"]
    R --> S{"问题率?"}
    S -->|"> 40%"| T["阻断: reviewer_status=escalated\n等待用户决策"]
    T --> R
    S -->|"≤ 40%"| U

    U["Step xmind\nxmind-converter\n刷新 latest-output.xmind"]
    U --> V["Step archive\njson-to-archive-md\n生成归档 Markdown"]
    V --> W["发出验证提示\nawaiting_verification=true"]

    W --> X{"用户回复"}
    X -->|"「确认通过」"| Y["Step notify\n清理 temp/ + .qa-state.json\n输出完成摘要"]
    X -->|"「已修改，请同步」"| Z["重新读取 XMind\n更新 Archive Markdown\n清理并完成"]
    X -->|"「继续补改」"| W
```

---

## 状态续传图

```mermaid
stateDiagram-v2
    [*] --> parse_input
    parse_input --> source_sync
    source_sync --> prd_formalize
    prd_formalize --> prd_enhancer
    prd_enhancer --> brainstorm : full-mode
    prd_enhancer --> writer : quick-mode（跳过 brainstorm/checklist）
    brainstorm --> checklist
    checklist --> writer

    writer --> writer : pending/in_progress writer 继续
    writer --> WriterBlocked : writer failed
    WriterBlocked --> writer : 用户选择重试或跳过
    writer --> reviewer : 所有 writer completed/skipped

    reviewer --> ReviewerEscalated : 问题率 > 40%
    ReviewerEscalated --> reviewer : 用户决策后恢复
    reviewer --> xmind : reviewer completed

    xmind --> archive
    archive --> AwaitingVerification : awaiting_verification=true
    AwaitingVerification --> notify : 用户确认通过
    AwaitingVerification --> AwaitingVerification : 继续补改
    notify --> [*]
```

---

## 代码分析报告流程

```mermaid
flowchart TD
    A["输入 curl / 报错日志 / 冲突日志"] --> B{"模式识别"}
    B -->|Bug 报错| C["提取接口路径 / 环境 / 租户信息"]
    B -->|冲突日志| D["解析冲突片段 + 识别冲突类型"]

    C --> E["根据堆栈定位仓库\n（参考 stackTrace 映射）"]
    E --> F["确认目标分支\n执行 git fetch + checkout + pull"]
    F --> G["追踪堆栈 + 阅读 Service/DAO 源码\n构造修复建议"]
    G --> H["生成 Bug HTML 报告\n刷新 latest-bug-report.html"]

    D --> I["确认分支 + 拉取代码"]
    I --> J["分析冲突成因\n给出解决建议"]
    J --> K["生成冲突 HTML 报告\n刷新 latest-conflict-report.html"]

    H --> L["通知用户验收"]
    K --> L
```

---

## 快捷验收入口

| 输入类型               | 主要输出                            | 根目录快捷链接                                  | 建议回复                                   |
| ---------------------- | ----------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| 蓝湖 URL / PRD / Story | 增强 PRD + XMind + Archive Markdown | `latest-prd-enhanced.md`、`latest-output.xmind` | `确认通过` / `已修改，请同步` / `继续补改` |
| curl / 报错日志        | Bug HTML 报告                       | `latest-bug-report.html`                        | `报告通过` / `继续补充分析`                |
| Jenkins 冲突日志       | 冲突 HTML 报告                      | `latest-conflict-report.html`                   | `报告通过` / `继续补充分析`                |

---

---

## 目录结构

```text
qa-flow/
├── config/
│   └── repo-branch-mapping.yaml   # DTStack repo/branch 映射
├── CLAUDE.md                      # 权威工作流手册
├── README.md                      # 本文件（入口导览）
├── latest-output.xmind            # 符号链接：最新 XMind 输出
├── latest-prd-enhanced.md         # 符号链接：最新增强 PRD
├── latest-bug-report.html         # 符号链接：最新 Bug 报告
├── latest-conflict-report.html    # 符号链接：最新冲突报告
├── cases/
│   ├── xmind/                     # XMind 输出（按模块）
│   ├── archive/                   # 归档 Markdown 根目录
│   ├── requirements/              # PRD / Story 工作目录
│   └── history/                   # 历史 CSV 等原始资料
├── .repos/                        # 隐藏源码仓库（只读）
├── reports/
│   ├── bugs/
│   └── conflicts/
├── assets/images/
├── tools/lanhu-mcp/               # 内置蓝湖 MCP 服务
└── .claude/
    ├── config.json                # 模块/仓库/路径 source of truth
    ├── rules/                     # 主题细则（用例/XMind/Archive 等）
    ├── shared/
    │   └── scripts/               # 共享 Node.js 工具脚本
    │       ├── load-config.mjs
    │       └── output-naming-contracts.mjs
    └── skills/                    # Skill 入口层
        ├── test-case-generator/
        │   ├── SKILL.md           # 编排协议
        │   └── prompts/           # per-step 行为指导文件
        ├── prd-enhancer/
        ├── xmind-converter/
        ├── archive-converter/
        └── code-analysis-report/
```

---

## 先读哪里

1. `CLAUDE.md` — 权威工作流手册（推荐先读）
2. `.claude/rules/*.md` — 主题细则（用例、XMind、Archive、仓库安全等）
3. `.claude/config.json` — 模块 / 仓库 / 报告路径 source of truth

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
