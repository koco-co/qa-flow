# static-scan Skill — 设计稿

> 规格版本：v1
> 日期：2026-04-29
> 作者：QA / kata 团队
> 状态：已与用户对齐，待 writing-plans 拆实施计划

## 0. 背景与目标

### 0.1 背景

QA 在收到提测分支后，需要快速识别"提测改动引入的可复现缺陷"，目前依赖人工 code review，效率低、覆盖不全；现有 daily-task bug-report skill 解决"已发生报错日志 → bug 报告"，并不解决"代码 diff → 潜在 bug"。

### 0.2 目标

- 输入：用户给定 `.repos/{repo}` 仓库的两个分支（base 迭代分支 vs head 提测分支）
- 输出：一份精美 HTML + 配套 JSON 的扫描报告，仅包含**可复现**的 bug
- 支持：通过 kata-cli 子命令对报告内容（基本信息 / bug / 内嵌 RCA）做增删改查
- 落地：`workspace/{project}/audits/{ym}-{slug}/`

### 0.3 非目标（不做）

- 不做"全量库扫描"——只对 diff 范围分析
- 不集成静态扫描工具链（ESLint / SpotBugs / Semgrep）——纯 LLM 主导
- 不接禅道、不接 IDE、不做 CI hook
- 不做"HTML 编辑回写 JSON"
- 不做跨仓合并报告

## 1. 概念与术语

| 术语       | 含义                                                                                   |
| ---------- | -------------------------------------------------------------------------------------- |
| 提测分支   | 待审分支（如 `release_6.3.0_dev`）                                                     |
| 基线分支   | 对比基准分支，通常为迭代版本分支（如 `release_6.3.x`），由用户输入而非默认 main/master |
| 可复现 bug | 能给出≥3 步用户操作步骤、可触发到代码缺陷的 bug                                        |
| audit      | 一次扫描的产物集合，落在 `audits/{ym}-{slug}/`                                         |

## 2. 整体架构

```
┌─────────────────────┐         ┌──────────────────────┐
│  /static-scan       │ create  │ kata-cli repo-sync   │
│  Skill 编排         │────────▶│ + git diff           │
│  (workflow.md)      │         │ → diff.patch         │
└──────────┬──────────┘         └──────────────────────┘
           │ scan
           ▼
┌─────────────────────┐
│ static-scan-agent   │ 读 diff + 调 Read/Grep 抓上下文
│ (sonnet)            │ 输出 bug JSON[]
└──────────┬──────────┘
           │ 主编排逐条 add-bug（强校验）
           ▼
┌──────────────────────────────────────────────────┐
│ kata-cli scan-report (CRUD + render)             │
│   create / scan / set-meta / add-bug / ...       │
│   ↓ source of truth                              │
│   report.json                                    │
│   ↓ Handlebars                                   │
│   report.html (单文件、内嵌 CSS、零外部依赖)     │
└──────────────────────────────────────────────────┘
```

## 3. 文件与目录布局

### 3.1 工作目录

```
workspace/{project}/audits/{yyyymm}-{slug}/
├── meta.json          # 顶层元信息（独立文件，便于 set-meta 原子写）
├── report.json        # source of truth：bugs[] 含内嵌 RCA、summary
├── report.html        # 渲染产物
├── diff.patch         # 缓存 diff，便于复审/重跑
└── attachments/       # 可选附件（截图等）
```

### 3.2 slug 规则

- 默认：`{repo-shortname}_{base-slug}__{head-slug}`，如 `dt-engine_release-6-3-x__release-6-3-0-dev`
- 用户可 `--slug <自定义>` 覆盖
- yyyymm：取扫描创建时的当前年月（与 features/ incidents/ 一致）

### 3.3 paths.ts 扩展

新增：

- `auditDir(project, yyyymm, slug): string`
- `auditFile(project, yyyymm, slug, ...segments): string`

### 3.4 Skill 四文件契约

```
.claude/skills/static-scan/
├── SKILL.md           # 入口、触发词、argument-hint
├── workflow.md        # 编排步骤、agent 派发
├── rules.md           # bug 输出契约、禁止/鼓励类、CoT 流程
└── references/
    ├── skill-preamble.md     # 复用 daily-task 的 preamble（symlink 或 copy）
    └── prompt-cheatsheet.md  # agent 思考要点
```

## 4. CLI 命令面（kata-cli scan-report）

### 4.1 命令清单

| 命令         | 描述                                              | 必填参数                                             |
| ------------ | ------------------------------------------------- | ---------------------------------------------------- |
| `create`     | 拉 diff + 初始化 meta/report，不分析              | `--project --repo --base-branch --head-branch`       |
| `scan`       | 派发 agent 分析 diff，写入 bugs                   | `--project --slug`                                   |
| `set-meta`   | 改顶层 meta 字段                                  | `--project --slug --field --value`                   |
| `add-bug`    | 追加一条 bug（强校验）                            | `--project --slug --json <path>`                     |
| `update-bug` | 改 bug 字段（支持 `root_cause`/`suggestion`/...） | `--project --slug --bug-id --field --value`          |
| `remove-bug` | 删 bug                                            | `--project --slug --bug-id`                          |
| `show`       | 查                                                | `--project --slug [--bug-id] [--format json\|table]` |
| `render`     | 重渲 HTML（默认所有 mutating 命令自动调用）       | `--project --slug`                                   |

### 4.2 通用参数

- `--no-render`：mutating 命令不自动重渲
- `--out`：可选覆盖输出路径
- `--related-feature {ym}-{slug}`：（仅 create）关联 feature，把对应 prd.md 注入 agent 上下文

### 4.3 退出码

- 0：成功
- 1：参数错误 / 找不到 audit
- 2：bug 校验失败（add-bug 时缺必填字段）
- 3：底层 git/repo-sync 错误

### 4.4 输出格式

- 默认输出 JSON（机器友好，方便 skill 编排消费）
- `show --format table` 给人读
- 错误信息走 stderr，不污染 stdout

## 5. 数据模型

### 5.1 meta.json

```json
{
  "schema_version": "1.0",
  "project": "dataAssets",
  "repo": "dt-insight-engine",
  "base_branch": "release_6.3.x",
  "head_branch": "release_6.3.0_dev",
  "base_commit": "abc123",
  "head_commit": "def456",
  "scan_time": "2026-04-29T10:00:00Z",
  "reviewer": null,
  "related_feature": null,
  "diff_stats": { "files": 12, "additions": 320, "deletions": 80 },
  "summary": "本次扫描共发现 N 处可复现缺陷"
}
```

### 5.2 report.json

```json
{
  "schema_version": "1.0",
  "meta_ref": "./meta.json",
  "bugs": [
    /* Bug[] 见 5.3 */
  ]
}
```

`meta_ref` 为指针，render 时实际读 meta.json 拼接，避免双写不一致。

### 5.3 Bug schema

```json
{
  "id": "b-001",
  "title": "标签管理批量删除时未校验关联引用",
  "severity": "critical|major|normal|minor",
  "type": "logic|data|ui|api|concurrency|state",
  "module": "标签中心",
  "location": {
    "file": "src/main/java/com/dtstack/.../TagService.java",
    "line": 156,
    "function": "batchDelete"
  },
  "phenomenon": "...",
  "reproduction_steps": ["1. 进入...", "2. 选中...", "3. 点击..."],
  "expected": "...",
  "actual": "...",
  "root_cause": "...",
  "evidence": {
    "diff_hunk": "@@ -148,8 +148,2 @@ ...",
    "related_code": [{ "file": "...", "line": 156, "snippet": "..." }]
  },
  "suggestion": "...",
  "confidence": 0.85,
  "confidence_reason": "...",
  "tags": ["regression", "data-loss-risk"]
}
```

### 5.4 强制字段（add-bug 时校验，缺则退出码 2）

- `title`、`phenomenon`、`expected`、`actual`、`root_cause`、`suggestion`
- `severity` ∈ enum
- `type` ∈ enum
- `location.file` 非空 + `location.line > 0`
- `reproduction_steps.length >= 3`
- `evidence.diff_hunk` 非空
- `confidence >= 0.6`

不达标的 bug，agent 阶段就过滤掉；CLI 层兜底再校验一次。

### 5.5 ID 生成

- 格式：`b-{3 位序号}`（b-001、b-002...）
- 由 `add-bug` 自动分配：`max(existing numeric suffixes) + 1`（**不**用 bugs.length，避免删除后复用）
- 删除不回收（保持历史引用稳定）

### 5.6 update-bug 字段路径

`update-bug --field` 支持点路径访问嵌套字段，如：

- `--field title --value "..."`
- `--field location.line --value 200`
- `--field evidence.diff_hunk --value "@@ ..."`

数组类字段（`reproduction_steps`、`tags`）改用专用子命令：`update-bug-steps --bug-id b-001 --json steps.json` 整体替换。

## 6. 静态扫描工作流

### 6.1 phase-1：create

**职责切分**：

- Skill 编排层（Claude 端）：调用 `AskUserQuestion` 收集 base 分支，把 `release_*.x` 分支作为候选呈现
- CLI 层（`kata-cli scan-report create`）：纯无交互，强制要求 `--base-branch / --head-branch`，便于脚本化与测试

**步骤**：

1. 校验 `.repos/{repo}` 存在；不存在则提示用户先跑 `kata-cli repo-sync sync ...`
2. `git -C .repos/{repo} fetch origin`
3. `git diff {base}..{head} --unified=20 > diff.patch`
4. 计算 diff_stats（files/additions/deletions）
5. 写 meta.json + 空 report.json（bugs:[]）
6. stdout 输出 JSON：`{"slug": "...", "diff_files": N, "diff_lines": M}` 给编排层消费
7. Skill 编排层向用户提示："已生成 diff（N 文件 / M 行），运行 `scan` 开始分析"

### 6.2 phase-2：scan

1. 读 diff.patch 与 meta.json
2. 若 meta.related_feature 非空，读对应 feature 的 prd.md 作为上下文
3. 决定分批策略（自适应）：
   - ≤3 文件：整体投喂 1 个 agent
   - 4-30 文件：按文件并行（每文件 1 个 agent，最多并发 5）
   - \>30 文件：先派 hotspot-rank-agent 做轻量排序，取 Top 30 按文件并行
4. 每个 agent 输出 bug JSON[]
5. 主编排逐条 `add-bug`：
   - 通过强校验则写入
   - 不通过：警告并丢弃，记录到 `audits/{slug}/.scan-discarded.log`
6. 自动 `render`
7. 显示完成 summary：写入 N 条、丢弃 M 条、报告路径

### 6.3 phase-3：CRUD

- 用户或 Claude 通过 kata-cli 命令调整
- 所有 mutating 命令默认自动 render（除非 `--no-render`）

### 6.4 重跑（idempotent）

- `scan` 默认追加（不清空已有 bugs，避免覆盖手动修订）
- `scan --replace`：清空 bugs[] 再跑
- `scan --files <glob>`：只对指定文件子集重跑（追加，不动其他文件已有 bug）

## 7. agent 输出契约（rules.md 主体）

### 7.1 禁止类（出现即丢弃）

- 性能猜测：未给出 benchmark/触发条件的"可能慢"
- 安全猜测：未给出 payload/触发链的"可能 SQL 注入/XSS/越权"
- 元 bug："建议增加日志"、"建议加测试"、"建议补注释"
- 缺 file:line 的"代码气味"
- confidence < 0.6
- 与 diff 无直接关联的"代码库历史问题"

### 7.2 鼓励类

- 数据一致性破坏（删除未校验引用、批量更新跳过事务）
- 状态机错误（流程跳过中间态、回滚不完整）
- 边界值越界（数组、分页、字符串截断）
- 接口契约违背（参数类型不一致、返回结构变更未通知前端）
- 并发竞态（必须能给出触发时序）
- 业务规则被代码绕过（仅 PRD 注入存在时）

### 7.3 思考流程（CoT 内部，产出只保留结果）

1. 读 diff hunk → 识别"逻辑实质改变"（不是 rename/格式调整）
2. 反推"什么用户操作会触发新逻辑"
3. 判定该路径产出是否错误（数据丢失 / 状态错误 / 抛错 / UI 异常 / 接口契约违背）
4. 写不出可复现操作路径 → 丢弃
5. 写得出 → 按 schema 输出，写 confidence + 理由

## 8. HTML 模板（templates/scan-report.html.hbs）

### 8.1 视觉基线

继承 `templates/bug-report-full.html.hbs` 的设计 token：

- 深色渐变 header
- 卡片式内容区（白底 + 1px 边框 + 圆角）
- severity 用 critical/major/normal/minor 四色
- code 块深色（#1e293b bg + #e2e8f0 fg）

### 8.2 4 项增强（让"更精美"落地）

**E1 — Sticky 左侧目录**

- 240px 宽固定左栏
- 按 module 分组列出 bugs
- 滚动高亮当前可见 bug
- 移动端自动折叠为顶部抽屉

**E2 — 步骤气泡**

- `reproduction_steps` 渲染成 ❶❷❸ 圆形序号 + 步骤卡片
- 步骤间用淡色连接线（`border-left: 2px dashed`）
- 视觉上一眼能数出"复现需要几步"

**E3 — 严重级三处呼应**

- 左侧色条（card border-left）+ badge + 模块小标签同色
- 现版仅 badge 一处，新版三处统一

**E4 — Summary 面板**

- 顶部一排小卡：总数 / Critical / Major / Normal / Minor
- 每张卡含微型条形图（纯 CSS，不引图表库）
- 平均 confidence 显示

### 8.3 技术约束

- 单文件 HTML，内嵌 CSS / JS
- 零外部依赖（不引 Tailwind / 图表库 / icon 库）
- 文件路径含"复制"按钮（纯 JS，clipboard API）
- `@media print` 简化为黑白打印样式
- 文件大小目标：≤ 80KB（不含报告内容）

## 9. 与现有 kata 体系的接驳

| 接驳点          | 用法                                                            |
| --------------- | --------------------------------------------------------------- |
| `.repos/` 同步  | 复用 `kata-cli repo-sync sync`                                  |
| Handlebars 渲染 | 复用 `handlebars` npm 包（archive-gen / bug-report 已用）       |
| 路径函数        | `paths.ts` 加 `auditDir / auditFile`                            |
| CLI 注册        | `engine/src/cli/index.ts` `kata.addCommand(scanReport)`         |
| 模板目录        | 新模板放 `templates/scan-report.html.hbs`，与 GUIDE.md 同步登记 |
| skill audit     | 通过 `kata-cli skill:audit` 校验四文件契约                      |

## 10. 测试与质量

### 10.1 单元测试（按 CLAUDE.md 纪律，每模块配套单测）

测试目录沿用现有约定 `engine/tests/`（与 rule-loader.test.ts 等并列）：

- `engine/tests/scan-report-store.test.ts`：CRUD（create/add/update/remove/show）
- `engine/tests/scan-report-render.test.ts`：Handlebars 渲染快照
- `engine/tests/scan-report-cli.test.ts`：CLI 端到端（spawn kata-cli）
- `engine/tests/scan-report-validate.test.ts`：bug 强校验
- `engine/tests/audits-paths.test.ts`：路径函数

### 10.2 集成测试

- 用 `workspace/dataAssets/.repos/dt-insight-engine` 真仓造一个小 diff
- create → scan（mock agent 返回固定 JSON）→ render，校验 HTML 包含预期 bug
- 注意：测试结束后清理 `workspace/dataAssets/audits/test-*`

### 10.3 测试不许做的事

- 不允许测试调用真实 LLM agent（mock 掉）
- 不允许测试覆盖 .repos/ 真仓的 git 状态（用 fixture 仓或临时目录）

## 11. 风险与缓解

| 风险                             | 缓解                                                   |
| -------------------------------- | ------------------------------------------------------ |
| LLM 漏检关键 bug                 | 输出契约严格，宁少勿滥；用户可后续 add-bug 补          |
| LLM 幻觉 file:line               | 强校验 + Read 校验文件存在；不存在的位置直接丢弃       |
| 大 diff 投喂超 token             | 自适应分批 + hotspot 排序；单文件 > 2000 行直接拆分    |
| 提测分支强制 push 后 commit 漂移 | meta.json 记录 head_commit；`scan --refresh` 重拉 diff |
| 多人同时 add-bug 竞态            | 文件级 advisory lock（fs-advisory-lock 或类似）        |
| HTML 模板演进破坏旧报告          | render 总是基于 JSON 重建；schema_version 用于迁移     |

## 12. 实施顺序（writing-plans 输入提示）

预期分 3 个里程碑：

- **M1**：CLI 框架 + paths.ts (auditDir/auditFile) + meta.json/report.json schema + 强校验 + create/add-bug/update-bug/remove-bug/set-meta/show（无 agent，无 render）
- **M2**：HTML 模板（4 项增强）+ render 命令 + 集成测试（manual fixture report → snapshot）
- **M3**：static-scan-agent（rules.md / 输出契约 / CoT）+ scan workflow + 自适应分批 + skill 四文件 + skill:audit 通过

每个里程碑独立可交付、独立测试。M1 完成即可手工 add-bug 拼报告 JSON；M2 完成即可拿 fixture JSON 渲染 HTML 验证视觉；M3 收尾接通 LLM 自动化产出。

## 13. 待 writing-plans 细化的开放问题

- bug ID 生成在并发 add-bug 场景下的 advisory lock 策略：用 `proper-lockfile` 还是 fs O_EXCL？
- `scan --files` 的 glob 实现：minimatch 不在依赖中，需新增 minimatch 依赖 vs 改用 Node `fs.glob`（Node 22+）
- hotspot-rank-agent 的轻量提示词与排序产出格式（建议放 M3 内细化）
- 模板大小目标 80KB 是否包含 base64 嵌入图片？默认假设不嵌入
