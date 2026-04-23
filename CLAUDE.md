# kata

## 快速开始

输入 `/kata` 查看功能菜单，首次使用请先执行 `/kata init`。

## 功能索引

| 命令               | 功能             |
| ------------------ | ---------------- |
| `/kata`         | 功能菜单         |
| `/kata init`    | 环境初始化       |
| `/test-case-gen`   | 生成测试用例     |
| `/ui-autotest`     | UI 自动化测试    |
| `/xmind-editor`    | 编辑 XMind 用例  |
| `/hotfix-case-gen` | 生成 Hotfix 用例 |
| `/bug-report`      | 分析 Bug 报告    |
| `/conflict-report` | 分析合并冲突     |

## 多项目工作区

`workspace/` 按项目名称组织，每个项目有独立子目录：

```
workspace/
├── dataAssets/          # 数据资产项目
│   ├── prds/            # PRD 需求文档
│   ├── xmind/           # XMind 测试用例
│   ├── archive/         # Archive Markdown 归档
│   ├── issues/          # Hotfix 用例
│   ├── reports/         # 分析报告
│   ├── history/         # 历史数据
│   ├── tests/           # Playwright 自动化脚本
│   ├── rules/            # 项目级规则（覆盖全局）
│   ├── knowledge/        # 项目级业务知识库
│   ├── .repos/           # 源码仓库（只读）
│   └── .temp/            # 状态文件
├── xyzh/                # 信永中和项目
│   └── ...              # 同上结构
```

- 脚本通过 `--project` 参数指定项目，路径函数见 `paths.ts`
- `config.json` 按 `projects.{name}` 组织配置
- 规则优先级：用户当前指令 > 项目级 `workspace/{project}/rules/` > 全局 `rules/` > skill 内置规则

## 核心约束

- `workspace/{project}/.repos/` 下的源码仓库为只读，禁止 push/commit
- 规则见 `rules/` 目录（全局）和 `workspace/{project}/rules/`（项目级），优先级高于 skill 内置规则
- 生成产物（PRD、XMind、Archive、报告、测试脚本等）写入 `workspace/{project}/`，不污染框架代码
- 配置类修改（如 `.env`、`config.json`、project rules、project knowledge）仅在对应 skill 明确声明并获得确认后允许写入

## 三层信息架构

kata 的协作偏好、规则、业务知识分三层存放，职责互斥：

| 层                    | 路径                                    | 寿命                  | 作用域              | 语义                         | 典型内容                                                       |
| --------------------- | --------------------------------------- | --------------------- | ------------------- | ---------------------------- | -------------------------------------------------------------- |
| **偏好（memory）**    | `~/.claude/projects/.../memory/`        | 长（跨项目）          | 用户级              | AI 协作偏好 + 项目状态小便签 | `feedback_*`（AI 协作风格）、`project_*`（如"当前迭代 15695"） |
| **规则（rules）**     | `rules/` + `workspace/{project}/rules/` | 中（项目周期）        | 项目 + 全局（双层） | 硬约束                       | 用例编写规范、XMind 结构约束、格式/命名约定                    |
| **知识（knowledge）** | `workspace/{project}/knowledge/`        | 短-中（业务迭代更新） | 仅项目级            | 业务知识库                   | 主流程、术语表、业务规则、踩坑                                 |

**边界判断口诀：**

- 跨项目可复用的 AI 协作偏好 → memory
- 项目内硬性编写/格式约束 → rules
- 项目内业务事实（"是什么"、"怎么做业务"）→ knowledge

**读写约束：**

- `rules/` 通过 `kata-cli rule-loader load --project {{project}}` 合并加载；主 agent 读、skill 读；AI 在 xmind-editor 等场景下可追加写入
- `knowledge/` 由 `knowledge-keeper` skill（阶段 1 实施）统一读写；subagent 不得直接改文件
- `memory/` 由 Claude Code 自动持久化；AI 主动写入

详见 [`docs/refactor/specs/2026-04-17-knowledge-architecture-design.md`](docs/refactor/specs/2026-04-17-knowledge-architecture-design.md)。

## 脚本变更规则

- 每次修改 `.claude/scripts/` 下的 ts 脚本后，**必须**同步更新或新增对应的单元测试
- 修改完成后，**必须**全量运行一遍单元测试（`bun test ./.claude/scripts/__tests__`），确认全部通过后才能交付

## 禁止硬编码规则

脚本和测试中**严禁**出现以下硬编码：

| 类型         | 错误示例                             | 正确做法                                                           |
| ------------ | ------------------------------------ | ------------------------------------------------------------------ |
| 绝对路径     | `"/Users/poco/Projects/kata"`     | `join(import.meta.dirname, "../../..")` 或 `resolve(...)` 动态计算 |
| 内部服务地址 | `"http://172.16.122.52"`             | 从 `.env` 读取，如 `process.env.CI_BASE_URL`                       |
| 账号密码     | `username: "admin@dtstack.com"`      | 写入 `.env` 或配置文件，通过环境变量读取                           |
| Cookie/Token | `LANHU_COOKIE: "session=real_value"` | 测试中使用明确的占位假值（如 `"test-stub"`），生产值写入 `.env`    |

**检查时机**：每次新增或修改脚本/测试时，确认无硬编码绝对路径或凭证。
**单元测试中的仓库根路径**：统一使用 `join(import.meta.dirname, "../../..")` 或 `resolve(import.meta.dirname, "../../..")` 获取，不得写死路径字符串。
**单元测试副作用清理**：测试若向 `workspace/` 等真实目录写入文件，**必须**在 `after()` 中清理，避免脏数据残留。
