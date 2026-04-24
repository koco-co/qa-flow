# test-case-gen · primary workflow

> 由 SKILL.md 路由后加载。适用场景：PRD 路径 / 蓝湖 URL / 模块重跑指令。
> 共享的契约、断点续传、Writer 阻断协议、异常处理定义见本文件末尾；节点正文拆入 `workflow/0N-<name>.md`。

## 节点映射表

| # | 名称 | 文件 | 默认超时 | 可跳过条件 |
|---|---|---|---|---|
| 1 | init | workflow/01-init.md | 30s | — |
| 2 | probe | workflow/02-probe.md | 2min | 断点恢复 |
| 3 | discuss | workflow/03-discuss.md | 15min | plan.status=ready |
| 4 | transform | workflow/04-transform.md | 5min | — |
| 5 | enhance | workflow/05-enhance.md | 3min | --quick |
| 6 | analyze | workflow/06-analyze.md | 5min | — |
| 7 | write | workflow/07-write.md | 10min | — |
| 8 | review | workflow/08-review.md | 3min | --quick |
| 9 | format-check | workflow/09-format-check.md | 5min | — |
| 10 | output | workflow/10-output.md | 1min | — |

**加载规则**：主 agent 按映射表 `文件` 字段动态 Read；同会话已读无需重复读。

---

## 任务可视化（TaskCreate 10 任务）

> 全流程使用 `TaskCreate` / `TaskUpdate` 工具展示实时进度，让用户在终端看到全局视图。

workflow 启动时（节点 1 开始前），使用 `TaskCreate` 一次性创建 10 个任务（含 discuss 与 format-check），按顺序设置 `addBlockedBy` 依赖：

| 任务 subject                        | activeForm                       |
| ----------------------------------- | -------------------------------- |
| `init — 输入解析与环境准备`         | `解析输入与检测断点`             |
| `probe — 4 维信号探针与策略派发`    | `采集 4 维信号并路由策略`        |
| `discuss — 主 agent 主持需求讨论`   | `主持需求讨论与 plan.md 落地`    |
| `transform — 源码分析与 PRD 结构化` | `分析源码与结构化 PRD`           |
| `enhance — PRD 增强`                | `增强 PRD（图片识别、要点提取）` |
| `analyze — 测试点规划`              | `生成测试点清单`                 |
| `write — 并行生成用例`              | `派发 Writer 生成用例`           |
| `review — 质量审查`                 | `执行质量审查与修正`             |
| `format-check — 格式合规检查`       | `检查格式合规性`                 |
| `output — 产物生成`                 | `生成 XMind + Archive MD`        |

**状态推进规则**：

- 进入节点时 → `TaskUpdate status: in_progress`
- 节点完成时 → `TaskUpdate status: completed`，在 `subject` 末尾追加关键指标（如 `init — 已识别 PRD，普通模式`）
- 节点失败时 → 保持 `in_progress`，不标记 `completed`

### write 节点子任务

进入 write 节点后，为每个模块额外创建子任务：

- subject: `[write] {{模块名}}`
- activeForm: `生成「{{模块名}}」用例`
- 设置 `addBlockedBy` 指向 write 主任务

Writer Sub-Agent 完成时更新：`[write] {{模块名}} — {{n}} 条用例`

### format-check 循环子任务

进入节点 9 format-check 后，为第 1 轮创建子任务：

- subject: `[format-check] 第 1 轮`
- activeForm: `执行第 1 轮格式检查`

每轮完成时更新 subject 为 `[format-check] 第 {{n}} 轮 — {{偏差数}} 处偏差`，若需下一轮则创建新子任务。

---

## 共享协议

### Writer 阻断中转协议

当 Writer Sub-Agent 返回 `<blocked_envelope>` 时，表示需求信息不足以继续编写，或输入无效。

#### 处理流程

1. **解析**：从 `<blocked_envelope>` 中提取 `items`
2. **逐条询问**（使用 AskUserQuestion 工具）：每次只向用户提出一个问题，使用 AskUserQuestion 工具：

- 问题：`Writer 需要确认（{{current}}/{{total}}）：{{question_description}}`
- 选项按候选答案列出，AI 推荐项标注"（推荐）"

3. **默认项处理**：若 item 为 `defaultable_unknown`，直接采用推荐项并记录为 `auto_defaulted`
4. **invalid_input 处理**：若 `status = "invalid_input"`，停止该模块并要求修正输入，不重启 Writer
5. **收集完毕**：将所有答案与默认项注入 `<confirmed_context>`，重启该模块的 Writer
6. **注入格式**：

```xml
<confirmed_context>
{
  "writer_id": "{{writer_id}}",
  "items": [
    {
      "id": "B1",
      "resolution": "user_selected",
      "selected_option": "A",
      "value": "{{answer_1}}"
    },
    {
      "id": "B2",
      "resolution": "auto_defaulted",
      "selected_option": "B",
      "value": "{{answer_2}}"
    }
  ]
}
</confirmed_context>
```

### 断点续传说明

- **状态文件位置**：`.kata/{project}/sessions/test-case-gen/{prd-slug}-{env}.json`
- **自动检测**：节点 1 的 `progress session-resume` 命令自动发现并恢复
- **节点更新**：每个节点完成时通过 `progress task-update` 写入进度
- **最终清理**：节点 10 output 成功后执行 `progress session-delete` 删除状态文件
- **状态结构**：参见 `.claude/references/output-schemas.json` 中的 `qa_state_file`。

### 异常处理

任意节点执行失败时：

1. 更新状态文件记录失败节点
2. 发送 `workflow-failed` 通知：

```bash
kata-cli plugin-loader notify --event workflow-failed --data '{"step":"{{node}}","reason":"{{error_msg}}"}'
```

3. 向用户报告错误，提供重试选项
