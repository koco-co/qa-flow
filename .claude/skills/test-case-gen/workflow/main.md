# test-case-gen · primary workflow

> 由 SKILL.md 路由后加载。适用场景：PRD 路径 / 蓝湖 URL / 模块重跑指令。
> 共享的契约、断点续传、Writer 阻断协议、异常处理定义见本文件末尾；节点正文拆入 `workflow/0N-<name>.md`。

## 节点映射表（Phase D2 起 10→8）

| #   | 名称         | 文件                        | 默认超时 | 可跳过条件                   |
| --- | ------------ | --------------------------- | -------- | ---------------------------- |
| 1   | init         | workflow/01-init.md         | 30s      | —                            |
| 2   | probe        | workflow/02-probe.md        | 2min     | 断点恢复                     |
| 3   | discuss      | workflow/03-discuss.md      | 15min    | enhanced.md.status=ready     |
| 4   | analyze      | workflow/04-analyze.md      | 5min     | —                            |
| 5   | write        | workflow/05-write.md        | 10min    | —                            |
| 6   | review       | workflow/06-review.md       | 3min     | --quick                      |
| 7   | format-check | workflow/07-format-check.md | 5min     | —                            |
| 8   | output       | workflow/08-output.md       | 1min     | —                            |

**加载规则**：主 agent 按映射表 `文件` 字段动态 Read；同会话已读无需重复读。

---

## 任务可视化（TaskCreate 8 任务）

> 全流程使用 `TaskCreate` / `TaskUpdate` 工具展示实时进度，让用户在终端看到全局视图。

workflow 启动时（节点 1 开始前），使用 `TaskCreate` 一次性创建 8 个任务，按顺序设置 `addBlockedBy` 依赖：

| 任务 subject                         | activeForm                       |
| ------------------------------------ | -------------------------------- |
| `init — 输入解析与环境准备`          | `解析输入与检测断点`             |
| `probe — 4 维信号探针与策略派发`     | `采集 4 维信号并路由策略`        |
| `discuss — 主持需求讨论 + 素材扫描` | `主持讨论与 enhanced.md 落地`    |
| `analyze — 测试点规划`               | `生成测试点清单`                 |
| `write — 并行生成用例`               | `派发 Writer 生成用例`           |
| `review — 质量审查`                  | `执行质量审查与修正`             |
| `format-check — 格式合规检查`        | `检查格式合规性`                 |
| `output — 产物生成`                  | `生成 XMind + Archive MD`        |

**状态推进规则**：

- 进入节点时 → `TaskUpdate status: in_progress`
- 节点完成时 → `TaskUpdate status: completed`，在 `subject` 末尾追加关键指标
- 节点失败时 → 保持 `in_progress`，不标记 `completed`

### write 节点子任务

进入 write 节点后，为每个模块额外创建子任务：

- subject: `[write] {{模块名}}`
- activeForm: `生成「{{模块名}}」用例`
- 设置 `addBlockedBy` 指向 write 主任务

Writer Sub-Agent 完成时更新：`[write] {{模块名}} — {{n}} 条用例`

### format-check 循环子任务

进入节点 7 format-check 后，为第 1 轮创建子任务：

- subject: `[format-check] 第 1 轮`
- activeForm: `执行第 1 轮格式检查`

每轮完成时更新 subject 为 `[format-check] 第 {{n}} 轮 — {{偏差数}} 处偏差`，若需下一轮则创建新子任务。

---

## 共享协议

### Writer 阻断中转协议（Phase D2：回射到 discuss add-pending）

当 Writer Sub-Agent 返回 `<blocked_envelope>` 时，表示需求信息不足以继续编写，或输入无效。

**核心变更**：Phase D2 起不再调 `discuss append-clarify`（legacy），改为调 `discuss add-pending` 把阻断条目沉淀为 enhanced.md §4 的持久记录。enhanced.md 在 `analyzing`/`writing` 下允许 add-pending，CLI 内部自动回退 status 并记 `reentry_from`。

#### 处理流程

1. **解析 envelope**：从 `<blocked_envelope>` 提取 `items[]`

2. **分流 invalid_input**：
   - 若 `status = "invalid_input"` → 停止该模块并要求修正输入（PRD / 测试点 / writer_id 本身损坏），不走本协议剩余步骤

3. **逐条回射到 `discuss add-pending`**（仅 `status = "needs_confirmation"` 的分支）：

   每个 item 映射为 CLI 调用：

   ```bash
   kata-cli discuss add-pending \
     --project {{project}} --yyyymm {{YYYYMM}} --prd-slug {{prd_slug}} \
     --location "writer-回射：{{item.location}}（writer_id={{writer_id}}）" \
     --question "{{item.question}}" \
     --recommended "{{item.recommended_option.description or 'A'}}" \
     --expected "<主 agent 根据 options 构造期望描述>" \
     --context '{"writer_id":"{{writer_id}}","type":"{{item.type}}","source":"{{item.context}}"}'
   ```

   CLI 自动：
   - 在 §4 追加新 Q 区块
   - 正文对应 `s-*` 锚点段落插入 `[^Q{new_id}]` 脚注
   - `status=writing` → 自动回退 `discussing` + 记 `frontmatter.reentry_from=writing`

4. **回到 discuss 3.7 → 3.9 → 3.10**：主 agent 按 `workflow/03-discuss.md` 3.7 节逐条向用户确认（仍是 3 选项格式），用户回答后再次自审（3.9）+ complete（3.10）。

5. **重入 writer**：discuss complete 成功返回 `status=writing` 后（CLI 按 reentry_from 自动恢复），主 agent 回到节点 5 write 派发该模块 Writer。重派前构建 `<confirmed_context>`：

   ```xml
   <confirmed_context>
   {
     "writer_id": "{{writer_id}}",
     "items": [
       {
         "id": "B1",
         "resolution": "pending_answered",
         "source_ref": "enhanced#q{{new_q_id}}",
         "value": "{{§4 Q 区块的 answer 字段文本}}"
       }
     ]
   }
   </confirmed_context>
   ```

   - 所有 item 的 `resolution` 固定为 `"pending_answered"`（不再区分 `user_selected` / `auto_defaulted`，因为值都来自 enhanced.md §4）
   - `source_ref` 必填，格式 `enhanced#q{n}`；writer 以该值作为用例 source_ref

6. **Writer 必须优先采纳 pending_answered**：writer-agent 的 `<confirmed_context>` 优先级规则不变；但主 agent 不得再以"auto_defaulted"重注入回射条目——Phase D2 要求全部沉淀到 enhanced.md §4。

### 断点续传说明

- **状态文件位置**：`.kata/{project}/sessions/test-case-gen/{prd-slug}-{env}.json`
- **自动检测**：节点 1 的 `progress session-resume` 命令自动发现并恢复
- **节点更新**：每个节点完成时通过 `progress task-update` 写入进度
- **最终清理**：节点 8 output 成功后执行 `progress session-delete` 删除状态文件
- **状态结构**：参见 `.claude/references/output-schemas.json` 中的 `qa_state_file`。

### 异常处理

任意节点执行失败时：

1. 更新状态文件记录失败节点
2. 发送 `workflow-failed` 通知：

```bash
kata-cli plugin-loader notify --event workflow-failed --data '{"step":"{{node}}","reason":"{{error_msg}}"}'
```

3. 向用户报告错误，提供重试选项
