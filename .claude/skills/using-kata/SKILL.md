---
name: using-kata
description: "kata 功能菜单与项目管理入口。触发词：kata、功能菜单、帮助、创建项目、新建项目、补齐项目、项目初始化。"
argument-hint: "[menu | create] [项目名或关键词]"
---

# using-kata

## 模式路由

| 模式 | 触发 | 入口文件 |
|---|---|---|
| `menu`（默认） | 空输入 / `help` / 功能菜单 / 帮助 | `workflow/menu.md` |
| `create` | 创建项目 / 新建项目 / 补齐项目 / 项目初始化 / `create` | `workflow/create-project/README.md` |

## 菜单入口（默认）

Read `workflow/menu.md` 并按其中的路由逻辑响应用户命令。

> 环境初始化不再由 skill 承担；参见仓库根目录 `INSTALL.md`（由 Coding Agent 按指令集执行）。

## 共享约束

- 不修改 `workspace/{project}/` 结构，create 模式仅创建新骨架或补齐缺失子目录
- 不执行 destructive 操作
