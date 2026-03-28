<!-- step-id: source-sync | delegate: sourceRepoSync -->
# Step source-sync：DTStack 源码分支同步

> 本步骤仅在模块类型为 DTStack 时执行。如为 xyzh/自定义模块，此步骤应已被 workflow 条件跳过。

## 执行流程

1. 从蓝湖原文 / PRD 原文中提取 `开发版本`
2. 读取仓库根目录 `config/repo-branch-mapping.yaml`
3. 调用 `sync-source-repos.mjs`，根据 `config/repo-branch-mapping.yaml` 解析 repo profile 与 backend/frontend 目标分支：
   ```bash
   cd .claude/scripts && node sync-source-repos.mjs \
     --version "<开发版本>" \
     --module <module-key>
   ```
4. 执行 `git fetch && git checkout && git pull` 将 `.repos/` 中对应仓库切到目标分支
5. 将分支上下文写入 `.qa-state.json.source_context`：
   - `version`：解析出的开发版本
   - `backend_branch`：backend 目标分支
   - `frontend_branch`：frontend 目标分支
   - `repos`：受影响仓库路径列表
   - `commit`：各仓库最新 commit hash

## 映射无法解析时

如果 `config/repo-branch-mapping.yaml` 中无对应版本映射，询问用户：

```
未找到版本 <version> 的分支映射。
请提供以下信息：
- backend 目标分支（例如：release/6.4.10）
- frontend 目标分支（例如：release/6.4.10）
```

用户提供后，临时写入 source_context，继续流程。

## 只读约束

- `.repos/` 下仅允许只读操作（`git fetch`、`git checkout`、`git pull`、`git log/diff/blame`）
- 严禁 `git push`、`git commit`、修改任何仓库文件

## 步骤完成后

```bash
node .claude/scripts/harness-state-machine.mjs \
  --advance source-sync \
  --state-path <story-dir>/.qa-state.json
```
