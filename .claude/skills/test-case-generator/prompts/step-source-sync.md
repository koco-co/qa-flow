<!-- step-id: source-sync | delegate: testCaseOrchestrator -->
# Step source-sync：DTStack 源码分支同步

> 前置条件: `last_completed_step` == `"req-elicit"`
> 快速模式: 执行
> DTStack 专属: 是

> 本步骤仅在模块类型为 DTStack 时执行。如为 xyzh/自定义模块，此步骤应已被 workflow 条件跳过。

## 执行流程

1. **优先读取 `elicitation.target_branch_override`**：若 `.qa-state.json` 中 `elicitation.target_branch_override` 非空，直接使用该值作为目标分支（用户在需求澄清时已确认），跳过第 1 步的 PRD 文本解析
2. 从蓝湖原文 / PRD 原文（或 `## 需求澄清结果` 章节）中提取 `开发版本`（若 step 1 未命中）
3. 读取 `.claude/config.json` 的 `repoBranchMapping` 字段所指向的映射文件
4. 调用 `sync-source-repos.mjs`，根据 `repoBranchMapping` 指向的映射文件解析 repo profile 与 backend/frontend 目标分支：
   ```bash
   node .claude/skills/using-qa-flow/scripts/sync-source-repos.mjs \
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

如果 `repoBranchMapping` 指向的映射文件中无对应版本映射，询问用户：

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

## 部分成功处理

多仓库同步时，单个仓库失败不应阻断整体流程：

1. 逐个仓库执行 `git fetch && git checkout && git pull`，记录每个仓库的结果
2. 在 `.qa-state.json` 的 `source_context` 中为每个仓库记录状态：
   ```json
   {
     "source_context": {
       "backend": [
         {"repoKey": "dt-center-assets", "branch": "release/6.4.10", "status": "synced", "commit": "abc123"},
         {"repoKey": "DAGScheduleX", "branch": "release/6.4.10", "status": "failed", "error": "branch not found"}
       ],
       "frontend": [
         {"repoKey": "dt-insight-studio-front", "branch": "release/6.4.10", "status": "synced", "commit": "def456"}
       ]
     }
   }
   ```

3. 向用户展示同步结果摘要：
   ```
   源码分支同步结果：
   [v] dt-center-assets → release/6.4.10 (commit: abc123)
   [x] DAGScheduleX → release/6.4.10 (失败: branch not found)
   [v] dt-insight-studio-front → release/6.4.10 (commit: def456)

   1 个仓库同步失败。
   - 「继续」→ 后续 Writer 不参考失败仓库的源码
   - 「重试」→ 仅重新 sync 失败仓库
   - 「取消」→ 中止流程
   ```

4. 用户选「继续」→ step 标记为完成，Writer 的源码参考中排除 `status: "failed"` 的仓库
5. 用户选「重试」→ 仅对 failed 仓库重新执行 fetch/checkout/pull，成功后更新状态
6. 用户选「取消」→ 不更新 `last_completed_step`，流程停在 source-sync

## 错误处理

- **git fetch/checkout 失败**：按部分成功处理逻辑，记录失败仓库并向用户提供 继续/重试/取消 选项

---

## 步骤完成后

更新 `.qa-state.json`：
- `last_completed_step` → `"source-sync"`
- 记录 `source_context` 中的分支信息

同时向 `execution_log` 数组追加：
```json
{"step": "source-sync", "status": "completed", "at": "<ISO8601>", "duration_ms": null, "summary": "完成分支同步，切换至 <branch_name>"}
```
