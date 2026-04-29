# Claude Code 配置优化设计

## 概述

对 kata 项目的 `.claude/` 配置体系进行分层优化，整合 6 项配置组件（CLAUDE.local.md、hooks、commands、rules、output_styles、statusline）为统一的分层配置栈。

## 设计原则

1. **分层职责** — 每层只做一件事，不重叠
2. **按需加载** — rules 通过 CLAUDE.local.md 引用，不自动扫描
3. **轻量优先** — 能用一个脚本解决的不拆成多个
4. **不重复 skill** — commands 只做"动作类"辅助操作，不替代 skill

## 整体架构

```
CLAUDE.local.md
  ├─ output_style: terse
  ├─ rules 引用（.claude/rules/tests.md 等）
  └─ 个人环境变量/路径别名

.claude/
├── hooks/
│   └── SessionStart/
│       ├── env-check.sh
│       ├── workspace-check.sh
│       └── knowledge-check.sh
├── commands/
│   ├── check-health.md
│   ├── status.md
│   └── reset.md
├── rules/
│   ├── tests.md
│   └── archive.md
├── output_styles/
│   ├── terse.md
│   └── verbose.md
```

## 各组件详细设计

### 1. CLAUDE.local.md

**定位**：用户本地私有配置入口，不提交到 git。

内容：

- `output_style: terse` — 默认简洁回复
- 引用 `.claude/rules/` 中的规则文件
- 个人开发环境变量（非敏感）
- `.gitignore` 中已排除 `CLAUDE.local.md`

### 2. Hooks

新建 `.claude/hooks/SessionStart/` 目录，每个脚本一个文件。

| 脚本                 | 功能                                                      | 失败处理                       |
| -------------------- | --------------------------------------------------------- | ------------------------------ |
| `env-check.sh`       | 并行检查 node/bun/git/playwright 版本                     | 缺失则打印具体修复命令，不阻塞 |
| `workspace-check.sh` | 检查 workspace 目录结构（features/tests/knowledge/rules） | 缺失则打印初始化提示           |
| `knowledge-check.sh` | 检查 knowledge/ 下 frontmatter name 是否唯一              | 重复则打印重复项列表           |

hooks 通过 `settings.local.json` 注册，不修改公共的 `settings.json`：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/SessionStart/env-check.sh"
          }
        ]
      }
    ]
  }
}
```

### 3. Commands

`.claude/commands/` 下每个文件一个命令。

| 命令           | 文件              | 功能                                                   |
| -------------- | ----------------- | ------------------------------------------------------ |
| `check-health` | `check-health.md` | 项目健康检查：workspace 目录、配置文件完整性、依赖版本 |
| `status`       | `status.md`       | 快速会话恢复：当前分支、测试通过数、未决变更           |
| `reset`        | `reset.md`        | 清理工作区：清 `.temp/`、lock 文件、测试产物           |

setup-env 不单独做命令，直接读 INSTALL.md 执行。

### 4. Rules

`.claude/rules/` 下的规则文件由 `CLAUDE.local.md` 引用加载，不自动扫描。

| 文件         | 适用场景                    | 规则要点                                                                                               |
| ------------ | --------------------------- | ------------------------------------------------------------------------------------------------------ |
| `tests.md`   | ui-autotest / test-case-gen | tests/ 目录下必须按 feature 分组，每个 case 文件必须包含分层断言（L1-L5），命名格式 `t{NNN}-{desc}.ts` |
| `archive.md` | case-format                 | Archive 文件必须包含标准 frontmatter（id、name、description、layers），字段值必须在预定义枚举范围内    |

### 5. Output Styles

| 文件         | 用途                                                  |
| ------------ | ----------------------------------------------------- |
| `terse.md`   | 默认：不总结刚做的事、不提前解释设计、直接给结论+证据 |
| `verbose.md` | 可选：bug 分析、code review 等需详细输出的场景        |

默认 terse，通过 `CLAUDE.local.md` 设置 `output_style: terse`。

### 6. Statusline

全局 `~/.claude/settings.json` 已配置 claude-hud，项目级不做额外覆盖。

## 简洁化 INSTALL.md

精简为约 40 行，去掉 agent 行为规范（Role、Constraints、Failure Protocol、Done Criteria），保留核心：

- 前置依赖检查（node/bun/git 版本）
- 4 步安装命令（bun install → env → config → test）
- 凭据配置提示
- 完成标志

## 未包含（明确排除）

- 不创建 `.claude/statusline/` 项目级覆盖（全局 claude-hud 够用）
- 不添加 PostToolUse 钩子扩展（现有的 3 个够用）
- 不创建 setup-env 命令（由 INSTALL.md 替代）
- 规则文件不自动加载（由 CLAUDE.local.md 手动引用）
