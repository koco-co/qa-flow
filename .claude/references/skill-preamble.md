# Skill 执行前准备（通用片段）

> 供 `bug-report` / `hotfix-case-gen` / `conflict-report` 等分析类 skill 在 SKILL.md 开头统一引用。

## 项目选择

扫描 `workspace/` 目录下的子目录（排除以 `.` 开头的隐藏目录和通用目录如 `.repos`）：

- 若只有 **1 个项目**，自动选择，输出：`当前项目：{{project}}`
- 若有 **多个项目**，列出供用户选择：
  ```
  检测到多个项目，请选择：
  1. project-a
  2. project-b
  请输入编号（默认 1）：
  ```
- 若 **无项目**，提示用户先执行 `/kata init` 初始化

选定的项目名称记为 `{{project}}`，后续所有路径均使用该变量。

## 读取配置

```bash
kata-cli config
```

（从 `.env` 读取模块、仓库、路径配置。）

## 符号使用规则（强制）

参见 `.claude/references/unicode-symbols.md`。所有报告输出必须遵守该规范。

## 异常处理

任意步骤执行失败时：

1. 向用户报告失败节点和原因
2. 发送 `workflow-failed` 通知：

```bash
kata-cli plugin-loader notify --event workflow-failed --data '{"step":"{{step_name}}","reason":"{{error_msg}}"}'
```

3. 提供重试选项，不强制退出
