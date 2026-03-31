# Copilot 配置指南

## 概述

本项目使用 Copilot 配置文件来统一设置语言、工作区和行为准则。

## 配置文件说明

### `.copilot.json`（项目根目录）

主配置文件，定义了 Copilot CLI 的全局设置：

| 字段 | 说明 |
|-----|-----|
| `language` | 界面语言（zh-CN 为中文）|
| `instructions.responses` | 回复语言设定为中文 |
| `instructions.comments` | 代码注释语言设定为中文 |
| `instructions.documentation` | 文档语言设定为中文 |
| `workspace.*` | 工作区目录映射 |
| `gsd.enabled` | 启用 GSD（Get Shit Done）工作流 |

### `.claude/copilot-init.js`（初始化脚本）

用于加载和验证 Copilot 配置：

- ✓ 加载 `.copilot.json` 配置
- ✓ 设置环境变量
- ✓ 验证工作区目录完整性
- ✓ 输出初始化状态

## 使用方法

### 1. 初始化环境

```bash
# 从项目根目录运行
node .claude/copilot-init.js
```

输出示例：
```
✓ Copilot 配置已加载
  项目: qa-flow
  语言: zh-CN
  回复语言: 中文

✓ 工作区验证:
  ✓ .claude/config.json
  ✓ .planning
  ✓ cases
```

### 2. 在脚本中使用

```javascript
// 加载配置
const config = require('./.copilot.json');

// 使用语言设置
if (config.language === 'zh-CN') {
  console.log('使用中文回复');
}

// 使用工作区路径
const casesRoot = config.workspace.cases_root;
```

### 3. 环境变量

初始化脚本会设置以下环境变量：

- `COPILOT_LANGUAGE=zh-CN`
- `COPILOT_RESPONSE_LANGUAGE=中文`

这些变量可在其他脚本中使用。

## 配置项详解

### language
- 值: `zh-CN`（中文简体）
- 用途: 设置 Copilot 的界面和默认交互语言

### instructions
定义不同类型内容的语言：
- `responses`: Copilot 的回复语言
- `comments`: 代码注释语言
- `documentation`: 文档生成语言
- `error_messages`: 错误消息语言

### workspace
工作区目录映射：
- `claude_config`: `.claude/config.json` - 项目级配置
- `planning_root`: `.planning/` - GSD 计划目录
- `cases_root`: `cases/` - 测试用例根目录
- `reports_root`: `reports/` - 报告输出目录

### behaviors
行为配置：
- `verbose`: 是否输出详细日志
- `preserve_context`: 保留上下文
- `auto_commit`: 自动提交
- `commit_messages`: 提交消息语言（中文）

### gsd
GSD 工作流配置：
- `enabled`: 启用/禁用 GSD
- `workflow_templates`: 工作流模板位置
- `phase_naming`: 阶段命名约定（numeric-prefix = 01-, 02- 等）

## 修改配置

编辑 `.copilot.json` 来改变 Copilot 的行为：

```json
{
  "language": "zh-CN",
  "instructions": {
    "responses": "中文"
  },
  "behaviors": {
    "verbose": true
  }
}
```

修改后运行初始化脚本使其生效：

```bash
node .claude/copilot-init.js
```

## 故障排除

### 配置文件不存在

```
⚠ 未找到 .copilot.json 配置文件
```

**解决方案：** 从项目根目录重新创建配置文件。

### 工作区验证失败

```
✗ .planning
```

**解决方案：** 检查 `.planning/` 目录是否存在，或运行 `/using-qa-flow init` 初始化。

## 下一步

- 查看 `.claude/config.json` 了解项目级配置
- 阅读 `CLAUDE.md` 了解 qa-flow 工作流
- 运行 `/using-qa-flow` 查看可用命令

---

**版本**: 1.0.0  
**最后更新**: 2026-03-31
