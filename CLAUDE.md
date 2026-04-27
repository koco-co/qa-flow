# kata

输入 `/using-kata` 查看功能菜单；首次安装见仓库根目录 `INSTALL.md`。

## 命令索引

| 命令             | 功能                                       |
| ---------------- | ------------------------------------------ |
| `/using-kata`    | 功能菜单 + 项目创建                        |
| `/test-case-gen` | 生成测试用例（PRD → 用例）                  |
| `/case-format`   | XMind 编辑 / XMind↔Archive 同步 / 格式转换  |
| `/daily-task`    | bug / conflict / hotfix 三模式             |
| `dtstack-cli`    | 平台前置条件 CLI（SQL/项目/资产同步），用法见 `tools/dtstack-cli/docs/usage.md` |
| `/ui-autotest`   | UI 自动化测试                              |

## 工作区布局

`workspace/{project}/` 每项目独立组织，子目录：

- `prds/` `xmind/` `archive/` — PRD、XMind、Archive Markdown 用例
- `issues/` `reports/` `history/` — Hotfix 用例、分析报告、历史数据
- `tests/` — Playwright 自动化脚本
- `rules/` `knowledge/` — 项目级规则与业务知识库
- `.repos/` — **只读**源码仓库（禁止 push/commit）
- `.temp/` — 状态文件

脚本通过 `--project` 指定项目；路径函数见 `paths.ts`；配置按 `projects.{name}` 组织于 `config.json`。

## 核心约束

- `.repos/` 下源码仓库**只读**，禁止 push/commit
- 生成产物（PRD、XMind、Archive、报告、测试脚本）写入 `workspace/{project}/`，不污染框架代码
- 配置类修改（`.env`、`config.json`、project rules、project knowledge）须经对应 skill 声明并获得用户确认
- 规则优先级：用户当前指令 > `workspace/{project}/rules/` > 全局 `rules/` > skill 内置规则

## 协作偏好

- **委派**：3+ 任务的计划优先派给 sub-agent；分阶段重构每个原子任务/提交派一个独立 sub-agent；只在真正的设计决策点回主会话
- **文档视角**：知识库、模块文档、README 默认**业务/用户视角**（解决什么问题、谁在用、流程与输入输出），非源码视角；仅用户明确要求时才写实现细节
- **Framing 不清先问一句**（业务 vs 源码视角、委派 vs 直接执行、目标环境名），避免整份重写

## 三层信息架构

| 层                | 路径                                    | 作用域      | 语义                  |
| ----------------- | --------------------------------------- | ----------- | --------------------- |
| memory（偏好）    | `~/.claude/projects/.../memory/`        | 用户级      | AI 协作偏好 + 项目状态 |
| rules（规则）     | `rules/` + `workspace/{project}/rules/` | 项目 + 全局 | 编写/格式硬约束       |
| knowledge（知识） | `workspace/{project}/knowledge/`        | 项目级      | 业务事实（流程、术语、踩坑）|

读写：`rules/` 由 `kata-cli rule-loader load --project {{project}}` 合并加载，AI 在 case-format 等场景可追加写入；`knowledge/` 由 `knowledge-keeper` skill 统一读写，subagent 不得直接改文件；`memory/` 由 Claude Code 自动持久化。

详见 [docs/architecture/information-architecture.md](docs/architecture/information-architecture.md)（计划于 P9 阶段补齐；当前以 [docs/superpowers/specs/2026-04-27-architecture-redesign-design.md](docs/superpowers/specs/2026-04-27-architecture-redesign-design.md) §5 为权威定义）。

## 脚本变更（`engine/src/`）

- 修改 ts 脚本后**必须**同步更新或新增对应单元测试
- 交付前**必须**全量运行 `bun test --cwd engine` 确认全绿

## 测试与提交纪律

- 重构或多文件改动后跑全量测试，报告通过数增量（如 `785 → 821`）
- 每任务一次原子提交，不捆绑无关改动
- 阶段收尾产出 handoff 三件套：状态快照（测试通过数、SHA、未决项）+ 可粘贴的 handoff prompt + 待用户拍板的决策清单

## 测试用例保真度

- SQL 前置条件必须**完整自洽**：`CREATE TABLE` + `INSERT`，不是片段
- 默认 SQL 方言为 SparkThrift，除非另行指定
- **严禁弱化 Playwright 断言让测试通过**——如实报告真实失败
  - 不用 `.toBeTruthy()` 兜底空数组；不用 `filter(Boolean)` 绕过渲染异常
  - 数值/文本断言必须与 PRD/用例一致

## 禁止硬编码

| 类型         | 错误示例                             | 正确做法                                                  |
| ------------ | ------------------------------------ | --------------------------------------------------------- |
| 绝对路径     | `"/Users/poco/Projects/kata"`        | `join(import.meta.dirname, "../../..")` 动态计算          |
| 内部服务地址 | `"http://172.16.122.52"`             | 从 `.env` 读取（`process.env.CI_BASE_URL`）               |
| 账号密码     | `username: "admin@dtstack.com"`      | 写入 `.env`，环境变量读取                                 |
| Cookie/Token | `LANHU_COOKIE: "session=real_value"` | 测试用占位假值（如 `"test-stub"`），生产值写入 `.env`     |

- 单元测试仓库根路径：统一用 `join(import.meta.dirname, "../../..")` 或 `resolve(...)`，不写死字符串
- 单元测试若向 `workspace/` 等真实目录写入，**必须**在 `after()` 清理
