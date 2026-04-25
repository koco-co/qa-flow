# Subagent A · 阶段 3 — 共性收敛（条件触发）

> 本文件是 subagent A（`main.md` 步骤 3）内部第三阶段。
> 仅当阶段 2 累计失败用例数 ≥ `convergence_threshold`（默认 5）时执行。收敛完成后回到阶段 2 继续修复。

## 阶段 3：共性失败模式收敛

### 3.1 收集探路案例

从失败用例中选 1-2 个覆盖不同 page 的作为探路 case。

### 3.2 派发 pattern-analyzer-agent

收集以下信息：

- 探路 case 的修复摘要
- 所有失败 case 的错误签名（error_type + stderr 最后 5 行）
- `lib/playwright/` 和 `workspace/{{project}}/tests/helpers/` 的导出函数清单

派发 `pattern-analyzer-agent`，接收其返回的 `common_patterns[]` 清单。

### 3.3 应用 helpers 修复

按 `common_patterns[]` 逐条修改对应 helper 文件：

- `diff_kind: "patch"` → Edit 改既有函数
- `diff_kind: "add_function"` → 追加新函数
- `confidence: "low"` → 记入 `NEED_USER_INPUT` 列表

每条改完跑 `bunx tsc --noEmit -p tsconfig.json` 校验编译。

### 3.4 回到阶段 2

重置探路 case 的状态，回到阶段 2 继续修复剩余失败用例。后续所有 fixer 的 `helpers_locked=true`（禁止再改 helpers）。

### 短路退出

- `pattern-analyzer` 返回 `skip_reason === "all_individual"` → 阶段 3 直接结束，不应用任何 diff
