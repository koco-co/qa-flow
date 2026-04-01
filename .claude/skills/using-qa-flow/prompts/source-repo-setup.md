# Source Repo Setup 交互式问答模板

> 此 prompt 在 `/using-qa-flow init` 的第 4 步「源码仓库设置」中使用。

## 目标

引导用户配置 `.repos/` 下的源码仓库，输出 `.repos/source-map.yaml` 作为本地仓库清单与初始化回显；后续 `sync-source-repos.mjs` 仍以 `.claude/config.json` 的 `repos` 与 `branchMapping` 为准。

## 前置状态检查

先列出 `.repos/` 当前已有目录：

```bash
ls -la .repos/ 2>/dev/null || echo "（.repos/ 目录为空或不存在）"
```

若 `.claude/config.json` 的 `branchMapping` 字段所指向的映射文件已存在，展示当前已配置的版本→分支映射，供参考。

## 交互流程

**提示语（逐项问答）：**

```
当前已检测到以下源码仓库目录：
<列出 .repos/ 下的目录>

qa-flow 使用以下仓库进行源码分析（来自 .claude/config.json 的 repos 字段）：
[从 config.json repos 字段读取，列出各仓库 key 和路径]

请逐个告知以下信息（可选，可跳过）：
1. 是否有已克隆到 .repos/ 的仓库需要在此登记？（y/n）
2. 如需新增：请告知 git clone URL 和目标路径
3. 默认使用分支（如 master / main）

如暂无源码仓库，直接跳过即可（配置了 repos 的项目会在 source-sync 步骤再次提示）。
```

**允许的回答格式：**

- `跳过` / `暂无` / `稍后配置` → 生成空 source-map.yaml，继续
- 提供仓库信息 → 逐条写入 source-map.yaml

## 输出格式

生成 `.repos/source-map.yaml`：

```yaml
# 由 using-qa-flow init 自动生成/维护
# 更新时间: <YYYY-MM-DD>
repos:
  - key: ${repo_key}
    path: .repos/${repo_path}/
    default_branch: ${default_branch}
initialized_at: "<YYYY-MM-DD>"
```

若用户跳过，生成最小化文件：

```yaml
# 由 using-qa-flow init 自动生成（暂无仓库配置）
repos: []
initialized_at: "<YYYY-MM-DD>"
```

## 完成提示

```
源码仓库清单已保存至 .repos/source-map.yaml。
如需后续添加仓库，可重新运行 /using-qa-flow init，或直接编辑该文件；真正参与 source-sync 的仓库路径与分支映射仍以 .claude/config.json 为准。
```
