# 节点 2: probe — 4 维信号探针与策略派发

> 由 workflow/main.md 路由后加载。上游：节点 1 init；下游：节点 3 discuss。

**目标**：采集 4 维信号（源码 / PRD / 历史 / 知识库），派发到 5 套策略模板之一（S1–S5），结果写入 state + plan.md。

**⏳ Task**：将 `probe` 任务标记为 `in_progress`。

### 2.1 触发探针

```bash
kata-cli case-signal-analyzer probe \
  --project {{project}} \
  --prd {{prd_path}} \
  --output json
```

stdout 输出完整 SignalProfile JSON。

### 2.2 策略路由

```bash
kata-cli case-strategy-resolver resolve \
  --profile '{{signal_profile_json}}' \
  --output json
```

或用文件形式（profile 已缓存在 probe-cache）：

```bash
kata-cli case-strategy-resolver resolve \
  --profile @workspace/{{project}}/.temp/probe-cache/{{prd_slug}}.json \
  --output json
```

stdout 输出 StrategyResolution JSON。

### 2.3 落盘

- **progress**：

  ```bash
  kata-cli progress task-update \
    --project {{project}} --session "$SESSION_ID" \
    --task probe --status done \
    --payload '{"strategy_resolution": {{resolution_json}}}'
  ```

- **plan.md**（若已存在）：

  ```bash
  kata-cli discuss set-strategy \
    --project {{project}} --prd {{prd_path}} \
    --strategy-resolution '{{resolution_json}}'
  ```

  plan.md 不存在时跳过（discuss init 时会自动带上 strategy 字段）。

### 2.4 S5 外转处理（交互点 P1）

当 `strategy_resolution.strategy_id === "S5"`：使用 AskUserQuestion 工具，按以下格式提问：

- 问题：`检测到 PRD 缺失但源码变更明显（信号：{{signal_summary}}）。建议切换到 Hotfix 用例生成流程。如何处理？`
- 选项 1：切换到 `hotfix-case-gen`（推荐）
- 选项 2：继续主流程（降级为 S4 保守模式）
- 选项 3：取消本次执行

**选项 1**：主 agent 立即停止当前 workflow，引导用户重新输入 `/hotfix-case-gen <Bug URL>`
**选项 2**：调 `case-strategy-resolver.ts resolve --profile ... --force-strategy S4`（CLI 已支持）把 resolution 覆盖为 S4 后继续
**选项 3**：`state.ts clean` + 退出

### 2.5 非 S5 情况

直接进入节点 3 discuss，把 `strategy_id` 作为下游节点 task prompt 的一部分传递。

**✅ Task**：将 `probe` 任务标记为 `completed`（subject 更新为 `probe — {{strategy_id}} {{strategy_name}}`）。
