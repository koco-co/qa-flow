# 源码仓库配置指南

> 本文件为 setup skill 步骤 4 的详细参考。源码仓库仅供只读分析，严禁 push 或 commit。

## URL 格式

支持标准 Git HTTP/HTTPS/SSH URL：

```
http://gitlab.example.com/group/repo.git
https://github.com/org/repo.git
git@gitlab.example.com:group/repo.git
```

## 本地路径规则

URL 自动解析为 `{group}/{repo}` 分组，clone 到工作区 `.repos/` 目录：

| Git URL                                | 本地路径                          |
| -------------------------------------- | --------------------------------- |
| `http://gitlab.xxx/frontend/app.git`   | `workspace/{{project}}/.repos/frontend/app/`  |
| `https://github.com/myorg/backend.git` | `workspace/{{project}}/.repos/myorg/backend/` |
| `git@gitlab.xxx:data/pipeline.git`     | `workspace/{{project}}/.repos/data/pipeline/` |

## 克隆命令

通过 init-wizard.ts 克隆（推荐，自动写入 .env）：

```bash
bun run .claude/skills/setup/scripts/init-wizard.ts clone \
  --url <git-url> \
  --branch <branch> \
  --base-dir workspace/{{project}}/.repos
```

或手动克隆（需自行更新 .env 的 SOURCE_REPOS 字段）：

```bash
git clone <git-url> workspace/{{project}}/.repos/{group}/{repo}
```

## 支持多个仓库

逗号分隔（批量克隆）：

```bash
bun run .claude/skills/setup/scripts/init-wizard.ts clone \
  --url "http://gitlab.xxx/g/repo1.git,http://gitlab.xxx/g/repo2.git" \
  --branch main \
  --base-dir workspace/{{project}}/.repos
```

或在 setup 交互中逐个添加：每成功克隆一个后，系统会询问是否继续添加下一个。

## 分支切换

```bash
bun run .claude/skills/setup/scripts/init-wizard.ts clone \
  --url <git-url> \
  --branch <target-branch> \
  --base-dir workspace/{{project}}/.repos
```

也可直接使用 git 命令切换已克隆仓库的分支：

```bash
git -C workspace/{{project}}/.repos/{group}/{repo} fetch origin
git -C workspace/{{project}}/.repos/{group}/{repo} checkout <branch>
git -C workspace/{{project}}/.repos/{group}/{repo} pull origin <branch>
```

## 只读规则（强制）

| 操作               | 是否允许 |
| ------------------ | -------- |
| `git fetch`        | ✓ 允许   |
| `git checkout`     | ✓ 允许   |
| `git pull`         | ✓ 允许   |
| `git log / diff`   | ✓ 允许   |
| `git push`         | ❌ 禁止  |
| `git commit`       | ❌ 禁止  |
| 修改/创建/删除文件 | ❌ 禁止  |

详细只读规则见 `.claude/rules/repo-safety.md`。
