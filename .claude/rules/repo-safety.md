# 源码仓库安全规则

> .repos/ 下的所有仓库为只读引用，严禁修改。
> git 仓库位于二级子目录（非一级目录本身）。

## 绝对禁止的操作

- `git push` — 禁止向任何远程仓库推送
- `git commit` — 禁止在源码仓库中创建提交
- 修改、创建、删除源码仓库中的任何文件
- `git reset --hard`、`git rebase`、`git merge` 等破坏性操作

## 允许的操作（只读）

- `git fetch origin` — 拉取远程更新
- `git pull origin <branch>` — 拉取并切换到指定分支
- `git checkout <branch>` — 切换分支
- `git log`、`git show`、`git diff`、`git blame` — 查看历史和代码
- `grep`、`find`、`cat`、`view` — 搜索和读取文件

## 分析前自动拉取流程

每次用户请求代码分析（Bug 报告 / 冲突分析）时，必须：

1. 根据报错信息定位目标仓库（参考 `.claude/config.json` 中的 `stackTrace` 映射）
2. 询问用户提供分支名（若未提供）
3. 执行 `git -C <仓库路径> fetch origin && git -C <仓库路径> checkout <分支> && git -C <仓库路径> pull origin <分支>`
4. 确认分支和最新 commit 后，才开始分析

## 用例生成的源码同步要求（当 config.repos 非空时启用）

> 以下规则仅在 config.json 中 `repos` 字段为非空对象时适用。若 `repos: {}` 则跳过本节。

当执行测试用例生成时，同样必须先完成源码分支同步：

1. 从需求原文中提取目标版本或分支信息
2. 读取 `.claude/config.json` 的 `branchMapping` 字段所指向的映射文件
3. 使用 `sync-source-repos.mjs` 解析 repo profile 与目标分支
4. 执行 `git fetch && git checkout && git pull`
5. 将分支上下文写入 `.qa-state.json.source_context` 后，再进入 Writer / Reviewer

## 堆栈定位

报错堆栈中的包名/关键词与仓库的映射关系，参考 config.json 的 `config.stackTrace` 字段。
