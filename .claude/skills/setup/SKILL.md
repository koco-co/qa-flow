---
name: setup
description: "qa-flow 环境初始化向导。5 步交互式引导完成工作区创建、依赖安装、源码仓库配置、插件配置和环境验证。触发词：初始化、init、环境配置、setup。也由 /using-qa-flow init 路由调用。"
argument-hint: "[step-number]"
---

<!-- 前置加载 -->

执行前读取 `preferences/` 目录下所有 `.md` 文件（如存在）。
偏好优先级：用户当前指令 > preferences/ 规则 > 本 skill 内置规则。
读取项目配置：执行 `npx tsx .claude/scripts/config.ts`（从 `.env` 读取模块、仓库、路径配置）。

---

## 运行模式

| 模式       | 触发条件        | 行为差异                                |
| ---------- | --------------- | --------------------------------------- |
| 完整初始化 | 默认 / `init`   | 全 5 步 + 全部交互点                    |
| 单步跳转   | `[step-number]` | 仅执行指定步骤，如 `setup 3` 重跑步骤 3 |
| 状态查询   | `仅查看状态`    | 执行步骤 1 扫描后直接退出               |

---

## 步骤 1: 检测环境

**目标**：扫描运行环境，检测 Node.js、依赖、配置文件是否就绪。

### 1.1 执行环境扫描

```bash
npx tsx .claude/skills/setup/scripts/init-wizard.ts scan
```

扫描项目包括：

| 检测项       | 通过条件                                       |
| ------------ | ---------------------------------------------- |
| Node.js 版本 | >= 18.0.0                                      |
| 包管理器     | bun / npm / pnpm / yarn 任意一种可用           |
| .env         | 项目根目录存在（内容不校验，覆盖 config.json） |
| .env 文件    | 项目根目录存在（内容不校验）                   |
| 脚本依赖     | `tsx` 可执行                                   |

### 1.2 展示扫描结果

以表格形式展示扫描结果，标出问题项（❌）和通过项（✓）。

### 交互点 A

```
环境扫描结果：
✓ Node.js v{{version}}
✓ bun v{{version}}
{{❌ / ✓}} config.json
{{❌ / ✓}} .env 文件
{{❌ / ✓}} tsx 可执行

选项：
1. ✓ 继续初始化（推荐）
2. 仅查看状态（不修改任何文件）
```

若用户选择「仅查看状态」→ 输出完整扫描报告后退出，不进入后续步骤。

---

## 步骤 2: 配置工作区

**目标**：创建标准工作区目录结构，支持自定义目录名。

### 2.1 询问工作区目录名

### 交互点 B

```
工作区目录名？

1. ✓ workspace（推荐）
2. 自定义名称（请输入）
```

### 2.2 创建目录结构

```bash
mkdir -p {{workspace_dir}}/{prds,xmind,archive,issues,history,reports,.repos,.temp}
```

创建成功后展示目录树：

```
{{workspace_dir}}/
├── prds/          # PRD / Story 文档
├── xmind/         # XMind 输出
├── archive/       # 归档 Markdown
├── issues/        # 线上问题用例
├── history/       # 历史 CSV 原始资料
├── reports/       # 代码分析报告
├── .repos/        # 源码仓库（只读）
└── .temp/         # 临时状态文件
```

### 2.3 写入工作区路径到 .env

将 `WORKSPACE_DIR` 写入 `.env` 文件。

---

## 步骤 3: 配置源码仓库（可选）

**目标**：clone 一个或多个源码仓库到工作区 `.repos/` 目录，供代码分析使用。

详细配置指南见 `${CLAUDE_SKILL_DIR}/references/repo-setup.md`。

### 交互点 C

```
是否需要配置源码仓库？（可跳过，后续使用时再配置）

1. 添加仓库 URL
2. 跳过
```

### 3.1 添加仓库

用户提供 Git URL → 解析 `{{group_name}}/{{repo_name}}` → clone 到 `{{workspace_dir}}/.repos/{{group_name}}/{{repo_name}}/`：

```bash
npx tsx .claude/skills/setup/scripts/init-wizard.ts clone \
  --url {{repo_url}} \
  --branch {{branch}} \
  --base-dir {{workspace_dir}}/.repos
```

URL 格式示例：`http://gitlab.example.com/{{group_name}}/{{repo_name}}.git`

分支默认为 `main`，可在提示中修改。

### 3.2 支持多仓库

每添加一个仓库后询问：

```
仓库 {{url}} 已克隆到 {{local_path}}

继续添加？
1. 添加下一个仓库
2. 完成，进入步骤 4
```

### 3.3 更新 .env

将成功克隆的仓库 URL 写入 `.env` 的 `SOURCE_REPOS` 字段（逗号分隔多个仓库）。

---

## 步骤 4: 配置插件（可选）

**目标**：逐个检查未激活插件，引导用户在 `.env` 文件中填写所需凭证。

### 4.1 读取插件清单

从 `plugins/` 目录下各子目录的 `plugin.json` 文件读取所有已知插件。

### 4.2 检查激活状态

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

## 步骤 5: 验证汇总

**目标**：全面校验初始化结果，输出最终状态表。

### 5.1 执行验证

```bash
npx tsx .claude/skills/setup/scripts/init-wizard.ts verify
```

验证内容：

| 验证项     | 说明                                     |
| ---------- | ---------------------------------------- |
| 工作区目录 | 所有子目录均存在                         |
| .env 文件  | 存在且 WORKSPACE_DIR 字段已写入          |
| 源码仓库   | 已配置仓库均可 git fetch（或标注为跳过） |
| 插件凭证   | 已配置插件的环境变量非空                 |
| 脚本可执行 | init-wizard.ts 等核心脚本可被 tsx 调用   |

### 5.2 展示汇总表

```
qa-flow v2.0 初始化完成

┌──────────────────┬──────────┬────────────────────────────┐
│ 项目             │ 状态     │ 详情                       │
├──────────────────┼──────────┼────────────────────────────┤
│ Node.js          │ ✓ 通过   │ v{{version}}               │
│ 工作区目录       │ ✓ 通过   │ {{workspace_dir}}/         │
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
node .claude/shared/scripts/notify.mjs \
  --event workflow-failed \
  --data '{"step":"setup-{{step}}","reason":"{{error_msg}}"}'
```
