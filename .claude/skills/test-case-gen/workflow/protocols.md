# 共享协议（test-case-gen）

> 各步骤以 `protocols.md#section` 引用。主 agent 启动时一次性加载。

## 1. Task 可视化

workflow 启动时（节点 1 开始前），使用 `TaskCreate` 一次性创建 8 个任务，按顺序设置 `addBlockedBy` 依赖：

| 任务 subject                        | activeForm                    |
| ----------------------------------- | ----------------------------- |
| `init — 输入解析与环境准备`         | `解析输入与检测断点`          |
| `probe — 4 维信号探针与策略派发`    | `采集 4 维信号并路由策略`     |
| `discuss — 主持需求讨论 + 素材扫描` | `主持讨论与 enhanced.md 落地` |
| `analyze — 测试点规划`              | `生成测试点清单`              |
| `write — 并行生成用例`              | `派发 Writer 生成用例`        |
| `review — 质量审查`                 | `执行质量审查与修正`          |
| `format-check — 格式合规检查`       | `检查格式合规性`              |
| `output — 产物生成`                 | `生成 XMind + Archive MD`     |

**状态推进规则**：

- 进入节点 → `TaskUpdate status: in_progress`
- 节点完成 → `TaskUpdate status: completed`，subject 末尾追加关键指标
- 节点失败 → 保持 `in_progress`，不标记 `completed`

### write 子任务

进入 write 节点后，为每个模块额外创建子任务，`addBlockedBy` 指向 write 主任务：

- subject: `[write] {{模块名}}`，activeForm: `生成「{{模块名}}」用例`
- Writer Sub-Agent 完成时更新：`[write] {{模块名}} — {{n}} 条用例`

### format-check 子任务

进入 format-check 后，为第 1 轮创建子任务：

- subject: `[format-check] 第 1 轮`，activeForm: `执行第 1 轮格式检查`
- 每轮完成更新 subject 为 `[format-check] 第 {{n}} 轮 — {{偏差数}} 处偏差`

## 2. Writer 阻断中转协议（Phase D2）

当 Writer Sub-Agent 返回 `<blocked_envelope>` 时，表示需求信息不足以继续编写。

### 处理流程

1. **解析 envelope**：从 `<blocked_envelope>` 提取 `items[]`

2. **分流 invalid_input**：若 `status = "invalid_input"` → 停止该模块并要求修正输入

3. **逐条回射到 `discuss add-pending`**（仅 `status = "needs_confirmation"` 分支）：

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

4. **回到 discuss 3.7 → 3.9 → 3.10**：主 agent 按 `03-discuss.md` 3.7 节逐条向用户确认，用户回答后再自审（3.9）+ complete（3.10）

5. **重入 writer**：调用方将 status 切回 `writing` 后，主 agent 回到节点 5 派发 Writer。重派前构建 `<confirmed_context>`：

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

6. **Writer 必须优先采纳 pending_answered**：writer-agent 的 `<confirmed_context>` 优先级规则不变

## 3. 确认策略

只在影响产物结构的决策点确认，数据填充类决策自动处理。

核心原则：

- 仅在歧义、多候选 PRD、模式切换时使用 AskUserQuestion
- PRD 识别成功且无歧义时直接展示摘要继续，不额外确认

## 4. 产物契约

| 契约       | 格式                                            | 适用范围                                              |
| ---------- | ----------------------------------------------- | ----------------------------------------------------- |
| Contract A | `<title>验证xxx</title><priority>P1</priority>` | Writer/Standardize/Reviewer 的中间 JSON 与 XMind 节点 |
| Contract B | `<display_title>【P1】验证xxx</display_title>`  | Archive MD 与其他展示面                               |

## 5. 异常处理

| 级别 | 场景                              | 处理                         |
| ---- | --------------------------------- | ---------------------------- |
| L1   | Subagent 超时/格式错/写文件失败   | 自动重试 1 次                |
| L2   | 连续 2 次失败 / gate 不通过 2 次  | 降级为直行，记入 step-errors |
| L3   | 关键步骤降级后仍失败 / 状态不一致 | 停止 pipeline，显示恢复点    |

任意节点执行失败时：

1. 更新状态文件记录失败节点
2. 发送 `workflow-failed` 通知：`kata-cli plugin-loader notify --event workflow-failed --data '{"step":"{{node}}","reason":"{{error_msg}}"}'`
3. 向用户报告错误，提供重试选项
