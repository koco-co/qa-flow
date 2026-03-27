# qa-flow Workflow Handbook

本文件是 qa-flow 的 **canonical human-facing workflow handbook**。面向人工与 Skills：

- 工作流说明、目录结构、命名 contract 以本文件为准
- 细化规则以 `.claude/rules/*.md` 为准
- 路径映射以 `.claude/config.json` 为准
- 若 README、Skill、历史提示词出现旧称呼（如 `archive-cases/`），以本文件说明的当前目录为准

> 不知道从哪开始？输入 `/start` 查看功能菜单。

---

## 快速开始

```bash
# 生成测试用例（完整流程）
生成用例 Story-20260322 PRD-26
为 <Story目录> 写测试用例

# 快速模式（跳过交互）
为 <Story目录> 快速生成测试用例
<Story目录> --quick

# 续传 / 模块重跑
继续 <Story> 的用例生成
重新生成 <Story> 的「列表页」模块用例

# 单独使用各 Skill
帮我增强这个 PRD：<PRD文件路径>
帮我分析这个报错
转化所有历史用例
```

---

## 工作区结构

> 路径配置统一以 `.claude/config.json` 为准。

```text
qa-flow/
├── CLAUDE.md                      # 权威工作流手册（本文件）
├── README.md                      # 入口导览
├── cases/
│   ├── xmind/                     # XMind 输出
│   │   ├── batch-works/
│   │   ├── data-assets/
│   │   ├── data-query/
│   │   ├── variable-center/
│   │   ├── public-service/
│   │   └── custom/xyzh/
│   ├── archive/                   # 归档 Markdown 根目录（固定）
│   │   ├── batch-works/
│   │   ├── data-assets/
│   │   ├── data-query/
│   │   ├── variable-center/
│   │   ├── public-service/
│   │   └── custom/xyzh/
│   ├── requirements/
│   │   ├── data-assets/
│   │   └── xyzh/
│   └── history/
│       └── xyzh/
├── repos/                         # 源码仓库（只读）
├── reports/
│   ├── bugs/
│   └── conflicts/
├── assets/
│   └── images/
└── .claude/
    ├── config.json                # 模块 / 仓库 / 报告路径 source of truth
    ├── harness/                   # Harness Phase 1 控制平面
    │   ├── workflows/             # workflow manifests
    │   ├── delegates.json         # delegate 注册表
    │   └── contracts.json         # state / shortcut / quality contracts
    ├── rules/                     # 规则文档
    ├── skills/                    # 项目 Skills
    ├── agents/                    # 子代理定义
    └── scripts/                   # Node.js 工具脚本
```

---

## Harness Phase 1 控制平面

当前 `qa-flow` 的 Harness 化采用“**入口层保留、控制平面抽离、执行层复用**”策略：

- `Skill` 是入口层：只负责识别用户输入与路由。
- `.claude/harness/workflows/*.json` 是控制平面：定义 workflow 的入口、步骤顺序、依赖、resume 点、输出产物和失败策略。
- `.claude/harness/delegates.json` 是 delegate 注册表：将 step 绑定到具体 script / Skill / agent。
- `.claude/harness/contracts.json` 是治理 contract：统一 `.qa-state.json`、根目录 `latest-*` 快捷链接、质量门禁和恢复策略。
- `.claude/config.json` 继续保留全局路径、模块映射、仓库映射与集成入口，不再承载完整流程编排。

当前分层边界是：

`用户输入 → Skill 路由 → Harness workflow manifest → delegate 执行 → latest-* 快捷链接验收`

---

## 模块与路径命名约定

| 模块 key | 中文名   | 类型    | XMind 输出目录                   | Archive 输出目录                     | Requirements 根目录                  |
| -------- | -------- | ------- | -------------------------------- | ------------------------------------ | ------------------------------------ |
| batch-works | 离线开发 | DTStack | `cases/xmind/batch-works/`       | `cases/archive/batch-works/`         | — |
| data-assets | 数据资产 | DTStack | `cases/xmind/data-assets/`       | `cases/archive/data-assets/`         | `cases/requirements/data-assets/` |
| data-query | 统一查询 | DTStack | `cases/xmind/data-query/`        | `cases/archive/data-query/`          | — |
| variable-center | 变量中心 | DTStack | `cases/xmind/variable-center/`   | `cases/archive/variable-center/`     | — |
| public-service | 公共组件 | DTStack | `cases/xmind/public-service/`    | `cases/archive/public-service/`      | — |
| xyzh | 信永中和 | 定制 | `cases/xmind/custom/xyzh/` | `cases/archive/custom/xyzh/` | `cases/requirements/xyzh/` |

- `xyzh` 是 **模块 key**。它用于 `.claude/config.json`、状态文件、脚本参数、Skill/Prompt 内部传参。
- `custom/xyzh` 是 **文件系统路径别名**。它只用于 `cases/xmind/` 与 `cases/archive/` 下的目录层级，不是配置 key。
- `cases/history/xyzh/` 仍使用 `xyzh`，不会写成 `cases/history/custom/xyzh/`。
- `cases/archive/` 是固定归档根目录。旧文档中的 `archive-cases/` 一律视为 `cases/archive/`，不要新建平行目录；若某些 Skill / Prompt 仍写旧名，也仅是文案遗留，不代表真实目录。
- 例：命令参数写 `--module xyzh`；产物路径写 `cases/xmind/custom/xyzh/202603-Story-20260322.xmind`。

---

## Story / PRD 目录与命名

Story 和 PRD 输入遵循以下目录 contract：

- Story 工作目录：`cases/requirements/<requirements-root>/Story-YYYYMMDD/`（其中 `<requirements-root>` 表示上表中的模块需求目录名，如 `data-assets` 或 `xyzh`）
- PRD 原文：`PRD-XX-<功能名>.md`
- PRD 增强版：`PRD-XX-<功能名>-enhanced.md`
- 断点状态：Story 目录内 `.qa-state.json`

输出按 **PRD 级** 与 **Story 级** 两类管理：

| 粒度 | 适用场景 | XMind 文件名 | Archive 文件名 |
| ---- | -------- | ------------ | -------------- |
| PRD 级 | 单个 PRD 独立生成、局部重跑、按功能归档 | `YYYYMM-<功能名>.xmind` | `YYYYMM-<功能名>.md` |
| Story 级 | 同一 Story 聚合多个 PRD 的统一输出 | `YYYYMM-Story-YYYYMMDD.xmind` | `YYYYMM-Story-YYYYMMDD.md` |

- `YYYYMM` 使用当前需求批次/版本所属月份；`YYYYMMDD` 使用 Story 标识中的日期。
- 同一批输出中，XMind 与 Archive 默认共享同 basename，仅扩展名不同。
- 仓库中已存在的旧文件名仍保留可读，例如 `信永中和测试用例.xmind`、`20260322-信永中和测试用例.xmind`、`20260311-信永中和-管理域目录管理-L3业务责任人.xmind`。**不要因为锁定新 contract 而批量重命名历史文件。**

---

## 工作流总览（10 步）

| # | 步骤 | 说明 |
| --- | --- | --- |
| 1 | 解析指令 | 提取 Story/PRD 路径、输出范围、运行模式、断点状态 |
| 2 | PRD 增强 | 调用 `prd-enhancer`，处理图片描述、增量 diff、健康度预检 |
| 3 | Brainstorming | 讨论测试范围、高风险场景（`--quick` 跳过） |
| 4 | Checklist 预览 | 展示测试点树（`--quick` 跳过） |
| 5 | 用户确认 | 确认 PRD 摘要、拆分方案、历史去重结果（`--quick` 跳过） |
| 6 | 并行 Writer | `case-writer` 子代理并行生成用例 |
| 7 | Reviewer | `case-reviewer` 子代理修正问题并验证覆盖率 |
| 8 | XMind 输出 | `xmind-converter` 生成 `.xmind`，必要时追加到既有文件 |
| 9 | 归档同步 | 生成 Archive Markdown，提示用户验证输出 |
| 10 | 清理 | 用户确认通过后清理临时文件 |

### 增量与断点续传

- PRD 修改后重跑同一 Story，仅受影响模块重新生成。
- 流程中断后重新发起同一指令，自动从 `.qa-state.json` 记录的步骤恢复。
- 如需强制全量重跑，删除对应 PRD 的 `-enhanced.md` 与 Story 目录下的 `.qa-state.json`。

### 质量阈值

| 问题率 | 行为 |
| ------ | ---- |
| < 15% | 自动修正 |
| 15%–40% | 自动修正 + 质量警告 |
| > 40% | 阻断，等待用户决策 |

---

## 测试用例编写规范

> 细则见 `.claude/rules/test-case-writing.md`。当前 Skills 若只需要抓取硬性规则，可先引用本节，再按需下钻到规则文档。

### 结构与标题

- XMind 层级固定为：`Root → L1（版本/需求） → L2（模块/菜单） → L3（页面） → [L4（子组）] → 用例标题 → 步骤 → 预期结果`
- L2 必须对应实际菜单或独立功能模块名称。
- L3 按页面维度拆分，如列表页、新增页、编辑页、详情页。
- L4 为可选层级，仅在页面内部功能较多时使用，如搜索、导出、字段校验。
- 用例标题必须以 `验证` 开头，只描述测试目的，不写具体操作步骤。

### 步骤与预期

- 禁止出现 `步骤1:`、`步骤 1:`、`Step 1:` 等编号前缀。
- 第一个步骤必须以 `进入【xxx】页面` 开头。
- 步骤必须写明操作对象、操作行为和实际输入值；禁止 `尝试提交`、`填写相关信息`、`选择某状态` 这类模糊表达。
- 预期结果必须是可观察的系统行为；禁止 `操作成功`、`显示正确`、`提交失败` 这类空泛结论。

### 设计原则

- 正常用例可组合多个正向条件，覆盖完整主流程。
- 异常用例一次只验证一个逆向条件。
- 边界用例一次只验证一个边界点。
- 必须使用真实业务数据、具体枚举值和明确字段名。

### Reviewer 质量阈值

| 问题率 | 行为 |
| ------ | ---- |
| < 15% | 自动修正，无需通知用户 |
| 15%–40% | 自动修正，并给出质量警告 |
| > 40% | 立即停止，输出阻断报告，等待用户决策 |

---

## XMind 输出规范

> 细则见 `.claude/rules/xmind-output.md`；目录路径以 `.claude/config.json` 中 `modules[].xmind` / `modules[].archive` 字段为准。

### 命名 contract

- **PRD 级输出**：`YYYYMM-<功能名>.xmind`
- **Story 级输出**：`YYYYMM-Story-YYYYMMDD.xmind`
- Archive Markdown 与对应 XMind 默认共享 basename，仅将扩展名改为 `.md`
- 新输出遵循以上命名；历史遗留文件名继续保留，不做强制迁移

### 输出路径

| 模块 key | XMind 输出目录 | Archive 对应目录 |
| -------- | -------------- | ---------------- |
| batch-works | `cases/xmind/batch-works/` | `cases/archive/batch-works/` |
| data-assets | `cases/xmind/data-assets/` | `cases/archive/data-assets/` |
| data-query | `cases/xmind/data-query/` | `cases/archive/data-query/` |
| variable-center | `cases/xmind/variable-center/` | `cases/archive/variable-center/` |
| public-service | `cases/xmind/public-service/` | `cases/archive/public-service/` |
| xyzh | `cases/xmind/custom/xyzh/` | `cases/archive/custom/xyzh/` |

### 结构与追加模式

- 树结构遵循：`Root → L1（版本/需求） → L2（模块/菜单） → L3（页面） → [L4（子组）] → 用例标题 → 步骤 → 预期结果`
- 追加模式下，同一文件中的不同 PRD 用各自的 L1 节点区分。
- XMind 输出成功后会刷新仓库根目录 `latest-output.xmind` 符号链接，并始终指向最近一次实际生成或更新的 XMind 文件。
- 增强版 PRD 输出后，应刷新仓库根目录 `latest-prd-enhanced.md` 符号链接，指向最近一次增强成功的 `*-enhanced.md`。
- Bug / 冲突 HTML 报告输出后，应分别刷新 `latest-bug-report.html` 与 `latest-conflict-report.html`。

---

## 历史用例维护

> 归档模板见 `.claude/rules/archive-format.md`，目录/命名补充见 `.claude/rules/directory-naming.md`。

- **当前唯一归档根目录**：`cases/archive/`
- 历史输入来源主要有两类：
  1. `cases/xmind/**/*.xmind`
  2. `cases/history/xyzh/` 下的历史 CSV（若存在版本子目录，则沿用版本分流）
- 转化目标遵循以下规则：
  - DTStack 模块 XMind → `cases/archive/<module>/`
  - `xyzh` XMind → `cases/archive/custom/xyzh/`
  - `xyzh` CSV → `cases/archive/custom/xyzh/<version>/`（若 CSV 来自版本目录）；无版本信息时可直接落在 `cases/archive/custom/xyzh/`
- 旧文档、Skill 文案或 Prompt 中的 `archive-cases/` 是历史叫法，统一映射到 `cases/archive/`，不要新建同级目录。
- 当前脚本实际落盘也以 `cases/archive/` 为准；`archive-cases/` 只作为兼容阅读旧文案时的解释。
- 从 XMind / final JSON 生成的 Archive Markdown，默认与源文件共享 basename。
- 当输入来源可识别原始 PRD 文件名时，Archive Markdown 应优先保留 `PRD-XX-<功能名>.md` 命名，降低需求追踪成本。
- Story 聚合 Markdown 只在明确需要汇总时使用；默认优先维持“一份 PRD → 一份 MD”。
- 归档文件供 Brainstorming、Writer、Reviewer 去重和引用，**不要手动移动到其他模块目录**。

常用命令：

```bash
cd .claude/scripts && node convert-history-cases.mjs --detect
cd .claude/scripts && node convert-history-cases.mjs --module xyzh
cd .claude/scripts && node convert-history-cases.mjs --path cases/xmind/custom/xyzh/<file>.xmind
cd .claude/scripts && node convert-history-cases.mjs --force
```

---

## 源码仓库详细清单

> 仓库路径以 `.claude/config.json` 的 `repos` 字段为准；`repos/` 下仓库只读。

### 标准 DTStack 仓库

| 仓库 key | 路径 |
| -------- | ---- |
| dt-center-assets | `repos/dt-insight-web/dt-center-assets/` |
| dt-center-metadata | `repos/dt-insight-web/dt-center-metadata/` |
| DAGScheduleX | `repos/dt-insight-plat/DAGScheduleX/` |
| datasourcex | `repos/dt-insight-plat/datasourcex/` |
| dt-center-ide | `repos/dt-insight-plat/dt-center-ide/` |
| dt-public-service | `repos/dt-insight-plat/dt-public-service/` |
| SQLParser | `repos/dt-insight-plat/SQLParser/` |
| engine-plugins | `repos/dt-insight-engine/engine-plugins/` |
| flink | `repos/dt-insight-engine/flink/` |
| dt-insight-studio-front | `repos/dt-insight-front/dt-insight-studio/` |

### 定制 / CustomItem 仓库

| 仓库 key | 路径 |
| -------- | ---- |
| dt-insight-studio-custom | `repos/CustomItem/dt-insight-studio/` |
| dt-center-assets-custom | `repos/CustomItem/dt-center-assets/` |
| dt-center-metadata-custom | `repos/CustomItem/dt-center-metadata/` |
| dt-public-service-custom | `repos/CustomItem/dt-public-service/` |
| DatasourceX-custom | `repos/CustomItem/DatasourceX/` |
| dagschedulex-custom | `repos/CustomItem/dagschedulex/` |
| SQLParser-custom | `repos/CustomItem/SQLParser/` |
| dt-center-ide-custom | `repos/CustomItem/dt-center-ide/` |

### QA 工具仓库

| 仓库 key | 路径 |
| -------- | ---- |
| dt-insight-qa | `repos/dt-insight-qa/` |

### 报错堆栈 → 默认仓库 key

| Java 包名 / 关键词 | 默认仓库 key |
| ------------------ | ------------ |
| `com.dtstack.center.assets` | `dt-center-assets` |
| `com.dtstack.center.metadata` | `dt-center-metadata` |
| `com.dtstack.dagschedulex` | `DAGScheduleX` |
| `com.dtstack.datasource` | `datasourcex` |
| `com.dtstack.ide` | `dt-center-ide` |
| `com.dtstack.public.service` | `dt-public-service` |
| `com.dtstack.sql.parser` | `SQLParser` |
| `com.dtstack.engine` | `engine-plugins` |

> 前端报错通常优先查看 `dt-insight-studio-front`；定制前后端需求优先查看 `repos/CustomItem/` 下对应仓库。

---

## 源码仓库安全规则

> 细则见 `.claude/rules/repo-safety.md`。

- `repos/` 下所有仓库为只读引用，git 仓库位于二级子目录。
- 允许：`git fetch`、`git pull`、`git checkout`、`git log/show/diff/blame`、`grep/find/cat/view`。
- 禁止：`git push`、`git commit`、修改仓库文件、`git reset --hard`、`git rebase`、`git merge` 等破坏性操作。
- Bug / 冲突分析前必须先：
  1. 根据堆栈或接口路径定位仓库
  2. 确认目标分支
  3. 执行 `git fetch && git checkout && git pull`
  4. 记录最新 commit，再开始分析
- `repos/CustomItem/` 下的定制仓库执行同样的只读规则。

---

## 详细规范索引

| 文件 | 内容 | 适用范围 |
| ---- | ---- | -------- |
| `.claude/rules/test-case-writing.md` | 用例编写硬性规则（标题、步骤、预期、质量阈值） | `cases/**` |
| `.claude/rules/xmind-output.md` | XMind 命名、层级、输出路径、追加模式 | `cases/xmind/**` |
| `.claude/rules/archive-format.md` | Archive Markdown 模板、层级映射、历史来源落盘规则 | `cases/archive/**` |
| `.claude/rules/directory-naming.md` | 模块 key、路径别名、Story/PRD/产物命名规则 | 全局 |
| `.claude/rules/image-conventions.md` | 图片引用、路径、压缩规则 | `assets/**` |
| `.claude/rules/repo-safety.md` | 源码仓库只读规则 | `repos/**` |
| `.claude/config.json` | 模块、仓库、报告目录的 source of truth | 全局 |

---

## 工具依赖

```bash
cd .claude/scripts && npm install
```

- `xmind-generator@^1.0.1` — XMind 生成
- `jszip@^3.10.1` — ZIP 读写（`--append` 模式）
