# 节点 4: analyze — 历史检索与测试点规划

> 由 workflow/main.md 路由后加载。上游：节点 3 discuss；下游：节点 5 write。

**目标**：基于 enhanced.md 检索历史用例、QA 头脑风暴、生成测试点清单 JSON。

**⏳ Task**：将 `analyze` 任务标记为 `in_progress`。

### 4.0 入口门禁 + status 切换

```bash
# 校验（Phase D2：仍调老 CLI 语义，D3 切 --check-source-refs）
kata-cli discuss validate \
  --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}} \
  --require-zero-pending
```

退出码约定：

| 退出码 | 情况 | 处理 |
|---|---|---|
| 0 | §4 pending=0，锚点完整 | 继续 4.1 |
| 1 | schema / 锚点异常 | 回 discuss 节点 `discuss reset` |
| 2 | pending > 0 | 回 discuss 节点 3.7 续 resolve |

通过后把 status 切到 `analyzing`：

```bash
kata-cli discuss set-status \
  --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}} \
  --status analyzing
```

进入 `analyzing` 后 enhanced.md 半冻结（仅允许 add-pending）；如 analyze 发现新疑问 → 调 `add-pending` 触发回射（见 03-discuss.md"半冻结回射分支"）。

### 4.1 历史用例检索

```bash
kata-cli archive-gen search --query "{{keywords}}" --project {{project}} --limit 20 \
  | kata-cli search-filter filter --top 5
```

> 注：historical_coverage 仅用于 analyze 的覆盖分析；Phase D2 起**不**作为 writer 的直接输入（见 05-write.md 5.1）。

### 4.2 测试点清单生成（AI 任务）

派发 `analyze-agent`（model: opus），task prompt：

```
project: {{project}}
yyyymm: {{YYYYMM}}
prd_slug: {{prd_slug}}
strategy_id: {{resolution.strategy_id}}
mode: {{mode}}
writer_count_hint: {{from-3.10-or-analyze-decides}}
```

analyze-agent 自己通过 `kata-cli discuss read` 读 enhanced.md（默认 deref Appendix A），不要在 prompt 里贴整份文档。

--quick 模式下简化分析：跳过历史检索，直接从 enhanced.md 提取测试点。

### 4.3 更新状态

```bash
kata-cli progress task-update --project {{project}} --session "$SESSION_ID" --task analyze --status done --payload '{{json}}'
```

**✅ Task**：将 `analyze` 任务标记为 `completed`（subject 更新为 `analyze — {{n}} 个模块，{{m}} 条测试点`）。

### 交互点 B — 测试点摘要（默认直接进入 write）

先在普通文本中展示测试点清单概览：

```
测试点清单（共 {{n}} 个模块，{{m}} 条测试点）：

┌─ {{module_a}}（{{count_a}} 条）
│  ├─ {{page_1}}: {{points}}...
│  └─ {{page_2}}: {{points}}...
└─ {{module_b}}（{{count_b}} 条）

source_ref 前缀分布：enhanced <N> / prd <N> / knowledge <N> / repo <N>
```

默认行为：若测试点清单无 `[INFO: new-pending]` / `invalid_input` 提示，直接进入 write 节点。

仅当 analyze-agent 通过 stderr 回射了新疑问（`INFO: new-pending: <question>`），主 agent 应：

1. 把这些疑问逐条调 `kata-cli discuss add-pending`（半冻结机制自动触发 `reentry_from=analyzing`）
2. 回到 discuss 节点 3.7 对新 Q resolve
3. complete 后 CLI 自动切回 `analyzing`，回到 4.1 增量重跑（仅对新 Q 相关的测试点重算）
