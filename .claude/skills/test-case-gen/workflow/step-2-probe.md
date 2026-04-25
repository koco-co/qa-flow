# 节点 2: probe — 4 维信号探针与策略派发

> 由 workflow/main.md 路由后加载。上游：节点 1 init；下游：节点 3 discuss。

**目标**：采集 4 维信号（源码 / PRD / 历史 / 知识库），派发到 5 套策略模板之一（S1–S5），结果写入 session state + 创建 enhanced.md 骨架。

**⏳ Task**：将 `probe` 任务标记为 `in_progress`。

### 2.1 确定产物目录

```bash
# 生成 prd_slug（若 1.3 插件已产出则直接复用）
kata-cli prd-slug --title "{{prd_title}}" --project {{project}}
# 产物目录规则
PRD_DIR="workspace/{{project}}/prds/{{YYYYMM}}/{{prd_slug}}"
mkdir -p "$PRD_DIR/images"
```

### 2.2 蓝湖/Axure fetch

若 1.3 检测出蓝湖 URL：

```bash
kata-cli plugin-loader fetch --input "{{lanhu_url}}" \
  --output "$PRD_DIR/original.md" \
  --images-dir "$PRD_DIR/images"
```

产出：

- `$PRD_DIR/original.md` — 原始 PRD（保留蓝湖结构）
- `$PRD_DIR/images/N-uXXX.png` — 独立元素图片（≥ 2KB）
- `$PRD_DIR/images/N-fullpage-*.png` — 整页截图

非蓝湖 URL（用户直接给 md 路径）：复制到 `$PRD_DIR/original.md`。

### 2.3 触发探针

```bash
kata-cli case-signal-analyzer probe \
  --project {{project}} \
  --prd "$PRD_DIR/original.md" \
  --output json
```

stdout 输出完整 SignalProfile JSON。

### 2.4 策略路由

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

### 2.5 创建 enhanced.md 骨架

probe 结束后立即调 `discuss init` 创建骨架（预分配所有稳定锚点 id）：

```bash
kata-cli discuss init \
  --project {{project}} \
  --yyyymm {{YYYYMM}} \
  --prd-slug {{prd_slug}}
```

CLI 自动生成 `$PRD_DIR/enhanced.md` 骨架（§1 / §2 / §3 / §4 / Appendix A），初始 status=`discussing`。

### 2.6 落盘策略信息

- **progress**：

  ```bash
  kata-cli progress task-update \
    --project {{project}} --session "$SESSION_ID" \
    --task probe --status done \
    --payload '{"strategy_resolution": {{resolution_json}}, "prd_dir": "'$PRD_DIR'"}'
  ```

- **enhanced.md §2 自检表**：策略写入由 enhanced.md `set-section`（§2 自检表锚点）等操作完成；具体 anchor 由 probe 2.5 init 时预分配，可通过 `discuss read` 获取。

### 2.7 S5 外转处理（交互点 P1）

当 `strategy_resolution.strategy_id === "S5"`：使用 AskUserQuestion 工具，按以下格式提问：

- 问题：`检测到 PRD 缺失但源码变更明显（信号：{{signal_summary}}）。建议切换到 Hotfix 用例生成流程。如何处理？`
- 选项 1：切换到 `hotfix-case-gen`（推荐）
- 选项 2：继续主流程（降级为 S4 保守模式）
- 选项 3：取消本次执行

**选项 1**：主 agent 立即停止当前 workflow，引导用户重新输入 `/daily-task hotfix <Bug URL>`
**选项 2**：调 `case-strategy-resolver resolve --profile ... --force-strategy S4` 把 resolution 覆盖为 S4 后继续
**选项 3**：删除 enhanced.md + `state.ts clean` + 退出

### 2.8 非 S5 情况

直接进入节点 3 discuss，把 `strategy_id` 作为下游节点 task prompt 的一部分传递。

**✅ Task**：将 `probe` 任务标记为 `completed`（subject 更新为 `probe — {{strategy_id}} {{strategy_name}} / enhanced.md 已创建`）。
