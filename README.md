# qa-flow

本仓库用于 QA 测试用例生成、蓝湖 URL 自动导入、历史归档转化与代码分析。`README.md` 只保留**入口导览**；完整工作流、命名 contract 和路径规则请以 `CLAUDE.md` 为准。

> 不知道从哪开始？输入 `/start` 查看功能菜单。

## 先读哪里

1. `CLAUDE.md` — 权威工作流手册（推荐先读）
2. `.claude/rules/*.md` — 主题细则（用例、XMind、Archive、仓库安全等）
3. `.claude/config.json` — 模块 / 仓库 / 报告路径 source of truth
4. `.claude/harness/*.json` — Harness Phase 1 控制平面（workflow / delegate / contract）

## 常用指令

```bash
# 生成测试用例（完整流程）
生成用例 Story-20260322 PRD-26
为 <Story目录> 写测试用例
生成测试用例 https://lanhuapp.com/web/#/item/project/product?tid=...&pid=...&docId=...

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
- 根目录快捷链接：
  - `latest-output.xmind`
  - `latest-prd-enhanced.md`
  - `latest-bug-report.html`
  - `latest-conflict-report.html`

## 快捷验收入口

| 输入类型 | 主要输出 | 根目录快捷链接 | 验收方式 |
| --- | --- | --- | --- |
| 蓝湖 URL / PRD / Story | 增强 PRD + XMind + Archive Markdown | `latest-prd-enhanced.md`、`latest-output.xmind` | 打开链接检查结构与内容 |
| curl / 报错日志 | Bug HTML 报告 | `latest-bug-report.html` | 在浏览器中打开，或复制到禅道 |
| Jenkins 冲突日志 | 冲突 HTML 报告 | `latest-conflict-report.html` | 检查冲突分类与建议 |

## Harness Phase 1 控制平面

- `Skill` 仍是**入口层**：负责理解用户输入并决定走哪条 workflow。
- `.claude/harness/workflows/*.json` 是**控制平面**：定义步骤顺序、依赖、resume 点、输出产物。
- `.claude/harness/delegates.json` 是**delegate 注册表**：把 workflow step 绑定到实际 script / Skill / agent。
- `.claude/harness/contracts.json` 是**治理层 contract**：统一 `.qa-state.json`、`latest-*` 快捷链接、质量阈值和恢复策略。
- `.claude/config.json` 继续只做**全局路径/映射 source of truth**，不再承载整条流程定义。

## Mermaid 流程图

### 1. 统一入口路由图

```mermaid
flowchart TD
    A[用户打开 qa-flow] --> B{输入内容类型}
    B -->|蓝湖 URL| C[lanhu-mcp-runtime status/start]
    B -->|本地 PRD / Story| D[直接进入 PRD / Story 解析]
    B -->|curl / 报错日志| E[code-analysis-report]
    B -->|Jenkins 冲突| F[conflict analysis]
    B -->|历史 CSV / XMind| G[archive-converter]

    C --> H[lanhu-mcp 提取原型内容]
    H --> I[保存 PRD 到 cases/requirements/...]
    D --> J[prd-enhancer]
    I --> J

    J --> K[刷新 latest-prd-enhanced.md]
    K --> L[test-case-generator 主流程]
    L --> M[xmind-converter]
    M --> N[刷新 latest-output.xmind]
    N --> O[json-to-archive-md / cases/archive]
    O --> P[通知用户验收]

    E --> Q[确认分支 + 拉取代码]
    Q --> R[生成 Bug HTML]
    R --> S[刷新 latest-bug-report.html]
    S --> P

    F --> T[确认分支 + 拉取代码]
    T --> U[生成冲突 HTML]
    U --> V[刷新 latest-conflict-report.html]
    V --> P

    G --> W[转为 Archive Markdown]
    W --> P
```

### 2. 测试用例生成详细交互图

```mermaid
flowchart TD
    A[输入 Story / PRD / 蓝湖 URL] --> B[Step 1 解析指令]
    B --> C{是否蓝湖 URL}
    C -->|是| D[lanhu-mcp 抽取 PRD]
    C -->|否| E[扫描 Story 目录]
    D --> E
    E --> F{是否存在 .qa-state.json}
    F -->|是| G[按 last_completed_step 续传]
    F -->|否| H[初始化状态文件]
    G --> I[Step 2 prd-enhancer]
    H --> I
    I --> J[刷新 latest-prd-enhanced.md]
    J --> K{是否 --quick}
    K -->|否| L[Step 3 Brainstorming]
    L --> M[Step 4 Checklist 预览]
    M --> N[Step 5 用户确认]
    K -->|是| O[跳过 3/4/5]
    N --> P[Step 6 并行 Writer]
    O --> P
    P --> Q[Step 7 Reviewer]
    Q --> R[Step 8 XMind 输出]
    R --> S[刷新 latest-output.xmind]
    S --> T[Step 9 Archive 同步]
    T --> U[Step 9.5 提示用户验收]
    U --> V{用户确认通过?}
    V -->|是| W[Step 10 清理 temp 与 .qa-state.json]
    V -->|否| X[保留状态并等待重试/补改]
```

### 3. 状态续传图

```mermaid
stateDiagram-v2
    [*] --> Step1
    Step1 --> Step2
    Step2 --> Step3
    Step3 --> Step4
    Step4 --> Step5
    Step5 --> Step6
    Step6 --> Step7: writers 全部 completed/skipped
    Step6 --> Step6: pending / in_progress writer 继续
    Step6 --> Blocked: writer failed 等待重试或跳过
    Blocked --> Step6
    Step7 --> Escalated: reviewer escalated
    Escalated --> Step7
    Step7 --> Step8: reviewer completed
    Step8 --> Step9
    Step9 --> AwaitingVerification: awaiting_verification=true
    AwaitingVerification --> Step10: 用户确认通过
    AwaitingVerification --> AwaitingVerification: 用户要求补改
    Step10 --> [*]
```

### 4. 代码分析报告交互图

```mermaid
flowchart TD
    A[输入 curl / 报错 / 冲突日志] --> B{模式识别}
    B -->|Bug| C[提取接口 / 环境 / 租户信息]
    B -->|冲突| D[解析冲突片段]
    C --> E[定位仓库]
    D --> E
    E --> F[确认分支并 pull]
    F --> G{问题类型}
    G -->|环境问题| H[输出环境排查建议]
    G -->|代码问题| I[追踪堆栈 + 阅读源码 + 构造修复建议]
    D --> J[识别冲突类型 + 给出解决建议]
    H --> K[生成 HTML 报告]
    I --> K
    J --> L[生成冲突 HTML 报告]
    K --> M[刷新 latest-bug-report.html]
    L --> N[刷新 latest-conflict-report.html]
    M --> O[通知用户验收]
    N --> O
```

## 目录入口

```text
qa-flow/
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
    ├── harness/
    │   ├── workflows/
    │   ├── delegates.json
    │   └── contracts.json
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
