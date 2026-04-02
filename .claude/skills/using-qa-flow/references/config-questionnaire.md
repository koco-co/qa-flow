# 配置问卷

本文件承载 `/using-qa-flow init` 中 Step 0.4 的详细问答、默认值说明与重新初始化规则，`SKILL.md` 只保留入口摘要。

## 重新初始化和部分更新规则

当 `signals.existingConfig` 不为 null 时，先读取当前配置作为默认值来源：

```bash
node .claude/skills/using-qa-flow/scripts/init-wizard.mjs --command load-existing
```

- 询问用户：「检测到已有项目配置。请选择：(1) 完整重新配置 (2) 只更新部分配置」
- 选择 (2) 时，展示五个功能组让用户勾选要重新配置的组（D-15）：
  - ① 基础信息（项目名、显示名、用例根目录）
  - ② 模块配置
  - ③ 源码仓库
  - ④ 集成工具
  - ⑤ 快捷方式和目录
- 未勾选的组保持现有值不变
- 如果选择 (1)，执行完整的 0.1 ~ 0.5 流程
- 在部分更新模式下，每个问题都应先展示当前值，允许用户直接回车接受默认值

## 默认值说明

- `project.name`、`displayName`、`casesRoot`：优先回填现有 config；若无现有值，再使用目录推断结果或默认 `cases/`
- 模块列表：优先使用目录扫描 + 历史文件解析后的合并结果；无结果时从空列表开始问答
- `repos`、`branchMapping`、`stackTrace`：如用户选择不配置源码仓库，则写入 `repos = {}`、`branchMapping = null`、`stackTrace = {}`
- `lanhuCli`：如用户不自定义，使用默认 `tools/lanhu-cli/`、`tools/lanhu-cli/.env` 等字段
- 最终确认阶段不展示完整 JSON（D-10），只展示纯文字分组摘要

## 五大功能组问题模板

### ① 基础信息

```text
### ① 基础信息
请提供以下信息：
- 项目英文标识（project.name）：（用于内部标识，如 my-project）
- 项目显示名（displayName）：（用于展示，如「我的项目」）
- 用例根目录（casesRoot）：（默认 cases/）
```

### ② 模块配置

```text
### ② 模块配置
以下是当前确认的模块列表（来自扫描 + 历史文件解析）：
{展示模块表格}

需要添加新模块吗？(y/n)
如果 y：询问模块 key、是否版本化、中文名（可选）

对每个模块最终确认 versioned 状态。
```

### ③ 源码仓库

```text
### ③ 源码仓库配置
{如果 signals.hasReposDir: '检测到 .repos/ 目录，建议配置源码仓库。'}

是否需要配置源码仓库分析能力？(y/n)
如果 y：
- 询问仓库名和本地路径（可多次添加）
- 是否配置分支映射文件？（默认路径 config/repo-branch-mapping.yaml）
- 是否配置 stackTrace 分析？（Java 包名等）
如果 n：repos = {}, branchMapping = null, stackTrace = {}
```

### ④ 集成工具

```text
### ④ 集成工具
是否需要配置蓝湖 CLI 集成？(y/n)
如果 y：逐一确认各字段（展示默认值，用户可直接回车接受）
- cliPath（默认 tools/lanhu-cli/）
- envFile（默认 tools/lanhu-cli/.env）
如果 n：使用默认 lanhuCli 配置
```

### ⑤ 最终确认写入（D-10）

```text
### ⑤ 确认写入

以下是将要写入的配置摘要：

**基础信息**
- 项目标识：{project.name}
- 显示名：{displayName}
- 用例根目录：{casesRoot}

**模块配置（{moduleCount} 个）**
{模块列表}

**源码仓库**
{repos 摘要或「未配置」}

**集成工具**
{lanhuCli 摘要}

确认写入吗？(y/n)
```
