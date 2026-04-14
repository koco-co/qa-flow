---
name: setup
description: "qa-flow 环境初始化向导。6 步交互式引导完成项目管理、工作区创建、依赖安装、源码仓库配置、插件配置和环境验证。触发词：初始化、init、环境配置、setup。也由 /using-qa-flow init 路由调用。"
argument-hint: "[step-number]"
---

<!-- 前置加载 -->

执行前先加载全局偏好并读取基础配置：
1. 全局 `preferences/` 目录下所有 `.md` 文件
2. 执行 `bun run .claude/scripts/config.ts`（从 `config.json` 和 `.env` 读取模块、仓库、路径配置）

偏好优先级：用户当前指令 > 项目级偏好 > 全局偏好 > 本 skill 内置规则。
在步骤 2 选定或创建 `{{project}}` 后，再加载 `workspace/{{project}}/preferences/` 目录下所有 `.md` 文件。

---

## 运行模式

| 模式       | 触发条件        | 行为差异                                |
| ---------- | --------------- | --------------------------------------- |
| 完整初始化 | 默认 / `init`   | 全 6 步 + 全部交互点                    |
| 单步跳转   | `[step-number]` | 仅执行指定步骤，如 `setup 3` 重跑步骤 3 |
| 状态查询   | `仅查看状态`    | 执行步骤 1 扫描后直接退出               |

---

## 步骤 1: 检测环境

**目标**：扫描运行环境，检测 Node.js、依赖、配置文件是否就绪。

### 1.0 环境检查清单（步骤 1 / 步骤 6 共用）

步骤 1 的扫描和步骤 6 的环境验证都以此清单为准：

| 检测项       | 通过条件                                       |
| ------------ | ---------------------------------------------- |
| Node.js 版本 | >= 22.0.0                                      |
| Bun          | `bun` 可执行                                   |
| config.json  | 项目根目录存在且可读取                         |
| .env 文件    | 项目根目录存在（内容不校验，运行时可覆盖配置） |
| 核心脚本     | 核心脚本可通过 `bun run` 执行                  |

### 1.1 执行环境扫描

按上述环境检查清单执行：

```bash
bun run .claude/skills/setup/scripts/init-wizard.ts scan
```

### 1.2 展示扫描结果

以表格形式展示扫描结果，标出问题项（❌）和通过项（✓）。

### 交互点 A

```
环境扫描结果：
✓ Node.js v{{version}}
✓ bun v{{version}}
{{❌ / ✓}} config.json
{{❌ / ✓}} .env 文件
{{❌ / ✓}} 核心脚本可执行

选项：
1. ✓ 继续初始化（推荐）
2. 仅查看状态（不修改任何文件）
```

若用户选择「仅查看状态」→ 输出完整扫描报告后退出，不进入后续步骤。

---

## 步骤 2: 项目管理

**目标**：选择已有项目或创建新项目，确定当前工作项目。

### 2.1 扫描已有项目

扫描 `workspace/` 下的已有项目目录（排除隐藏目录）。

### 交互点 B

```
已有项目：
{{project_list}}

选项：
1. 选择已有项目
2. 创建新项目
```

### 2.2 创建新项目（若选择创建）

- 输入项目名称（英文短名，如 `dataAssets`、`xyzh`）
- 创建目录结构：

```bash
mkdir -p workspace/{{project}}/{prds,xmind,archive,issues,historys,reports,tests,preferences,.repos,.temp}
```

- 将项目注册到 `config.json` 的 `projects.{{project}}` 下

### 2.3 记录当前项目

将选中的项目名称记为 `{{project}}`，后续步骤使用。

### 2.4 加载项目级偏好

在 `{{project}}` 确定后，再加载 `workspace/{{project}}/preferences/` 目录下所有 `.md` 文件；若目录不存在则按空目录处理。

---

## 步骤 3: 配置工作区

**目标**：创建标准工作区目录结构。

### 3.1 创建目录结构

```bash
mkdir -p workspace/{{project}}/{prds,xmind,archive,issues,historys,reports,tests,preferences,.repos,.temp}
```

创建成功后展示目录树：

```
workspace/{{project}}/
├── prds/          # PRD / Story 文档
├── xmind/         # XMind 输出
├── archive/       # 归档 Markdown
├── issues/        # 线上问题用例
├── historys/      # 历史 CSV 原始资料
├── reports/       # 代码分析报告
├── tests/         # 测试产物
├── preferences/   # 用户偏好规则
├── .repos/        # 源码仓库（只读）
└── .temp/         # 临时状态文件
```

### 3.2 写入工作区路径到 .env

将 `WORKSPACE_DIR` 写入 `.env` 文件。

---

## 步骤 4: 配置源码仓库（可选）

**目标**：clone 一个或多个源码仓库到工作区 `.repos/` 目录，供代码分析使用。

详细配置指南见 `${CLAUDE_SKILL_DIR}/references/repo-setup.md`。

### 交互点 C

```
是否需要配置源码仓库？（可跳过，后续使用时再配置）

1. 添加仓库 URL
2. 跳过
```

### 3.1 添加仓库

用户提供 Git URL → 解析 `{{group_name}}/{{repo_name}}` → clone 到 `workspace/{{project}}/.repos/{{group_name}}/{{repo_name}}/`：

```bash
bun run .claude/skills/setup/scripts/init-wizard.ts clone \
  --url {{repo_url}} \
  --branch {{branch}} \
  --base-dir workspace/{{project}}/.repos
```

URL 格式示例：`http://gitlab.example.com/{{group_name}}/{{repo_name}}.git`

分支默认为 `main`，可在提示中修改。

### 3.2 支持多仓库

每添加一个仓库后询问：

```
仓库 {{url}} 已克隆到 {{local_path}}

继续添加？
1. 添加下一个仓库
2. 完成，进入步骤 5
```

### 3.3 更新 .env

将成功克隆的仓库 URL 写入 `.env` 的 `SOURCE_REPOS` 字段（逗号分隔多个仓库）。

---

## 步骤 5: 配置插件（可选）

**目标**：逐个检查未激活插件，引导用户在 `.env` 文件中填写所需凭证。

### 5.1 读取插件清单

从 `plugins/` 目录下各子目录的 `plugin.json` 文件读取所有已知插件。

### 5.2 检查激活状态

逐个检查 `.env` 中对应的环境变量是否已配置。

### 交互点 D（每个未激活插件）

```
插件：{{plugin_name}}
说明：{{plugin_description}}
需要配置：{{env_keys}}

1. 现在配置（打开 .env 引导填写）
2. 跳过此插件
```

选择「现在配置」时，展示该插件的 `.env` 配置示例，并提示用户手动编辑 `.env` 文件，编辑完成后按任意键继续校验。

---

## 步骤 6: 验证汇总

**目标**：全面校验初始化结果，输出最终状态表。

### 6.1 执行验证

```bash
bun run .claude/skills/setup/scripts/init-wizard.ts verify
```

验证内容：

- 环境项复用步骤 1 的「环境检查清单」
- 另追加以下项目级验证：

| 验证项         | 说明                                                     |
| -------------- | -------------------------------------------------------- |
| 工作区目录     | 所有子目录均存在                                         |
| .env 工作区配置 | `WORKSPACE_DIR` 字段已写入                               |
| 源码仓库       | 已配置仓库均可 git fetch（或标注为跳过）                 |
| 插件凭证       | 已配置插件的环境变量非空                                 |
| 硬编码检查     | 脚本和测试中无硬编码绝对路径或凭证（详见 CLAUDE.md「禁止硬编码规则」） |

### 6.2 展示汇总表

```
qa-flow v2.0 初始化完成

┌──────────────────┬──────────┬────────────────────────────┐
│ 项目             │ 状态     │ 详情                       │
├──────────────────┼──────────┼────────────────────────────┤
│ Node.js          │ ✓ 通过   │ v{{version}}               │
│ 工作区目录       │ ✓ 通过   │ workspace/{{project}}/     │
│ .env             │ ✓ 通过   │ WORKSPACE_DIR=workspace    │
│ 源码仓库         │ {{status}}│ {{repo_count}} 个仓库      │
│ 钉钉通知         │ {{status}}│ {{detail}}                 │
│ 蓝湖插件         │ {{status}}│ {{detail}}                 │
└──────────────────┴──────────┴────────────────────────────┘

所有必需项通过，qa-flow 已就绪。
输入「生成测试用例」开始使用。
```

若存在未通过项，列出具体问题和修复建议，不阻断（可后续按需修复）。

---

## 异常处理

任意步骤失败时：

1. 记录失败步骤和错误信息
2. 提示用户可通过 `setup {{step_number}}` 重新执行该步骤
3. 发送 `workflow-failed` 通知（若通知插件已配置）：

```bash
bun run .claude/scripts/plugin-loader.ts notify \
  --event workflow-failed \
  --data '{"step":"setup-{{step}}","reason":"{{error_msg}}"}'
```
