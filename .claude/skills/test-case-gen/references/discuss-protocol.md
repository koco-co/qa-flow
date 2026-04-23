# discuss 节点协议

> test-case-gen 工作流 `discuss` 节点（主 agent 主持）操作手册。硬约束见 `rules/prd-discussion.md`。

## 触发与恢复

| 场景 | 来源 | 行为 |
|---|---|---|
| 全新需求 | 无 plan.md | `discuss init` → 6 维度自检 → 逐条澄清 → `complete` |
| 中断恢复 | plan.md status=discussing | `discuss read` 恢复 §3 已答清单 → 续问未答 → `complete` |
| 已完成 | plan.md status=ready | 跳过 discuss，主 agent 直派 transform |
| obsolete | PRD mtime > plan updated_at 且超 5 分钟容差 | `discuss reset` → `init` 重新讨论 |

## 6 维度自检清单

主 agent 逐页扫描以下维度（迁自旧 transform-agent §5.1）：

| 维度 | 检查问题 |
|---|---|
| 字段定义 | 是否有字段的类型 / 必填性 / 校验规则三方均未明确？ |
| 交互逻辑 | 是否有按钮点击后的行为 / 联动规则无法从三方确定？ |
| 导航路径 | 是否有页面的菜单入口无法从路由配置或截图确定？ |
| 状态流转 | 是否有状态变更的触发条件或目标状态不明确？ |
| 权限控制 | 是否有角色权限划分未在代码或 PRD 中明确定义？ |
| 异常处理 | 是否有异常场景的系统行为（提示文案 / 阻断 / 放行）未知？ |

> plan.md §2 的表格由 `append-clarify` 累积写入的 `location` 字段自动统计（按维度关键字匹配）。主 agent 在构造 clarification 时，应将 `location` 开头写明所属维度（例如 `审批列表页 → 字段定义 → 审批状态`）。

## 不确定性分类

- **defaultable_unknown** → 直接 `append-clarify` with `default_policy`；不向用户发问
- **blocking_unknown** → AskUserQuestion 单条问 → `append-clarify` with `user_answer`
- **invalid_input** → 立即停止，要求修正输入；不写 plan

## AskUserQuestion 约束

- 单条问题最多 4 个候选项
- 候选项中标注 `推荐` 的为 `recommended_option`
- 用户回答后立即调 `append-clarify` 落盘，避免 conversation 丢失

## 知识沉淀流程

1. 主 agent 识别用户在讨论中提到的术语 / 业务规则 / 踩坑
2. 调 knowledge-keeper write API：

```bash
kata-cli knowledge-keeper write \
  --project {{project}} \
  --type term|module|pitfall \
  --content '{"term":"...","zh":"...","desc":"..."}' \
  --confidence high \
  --confirmed
```

3. 收集所有落地条目 → 构造 `[{"type":"term","name":"..."},...]` JSON
4. `discuss complete --knowledge-summary '<json>'` 时 CLI 自动写入 plan.md frontmatter

## complete 前置守卫

- 调 `discuss read` 验证 §3 全部 `severity=blocking_unknown` 的条目均已 `user_answer`
- 收集本轮沉淀的 knowledge 列表 → 构造 `--knowledge-summary` JSON
- §6 下游 hints 由 CLI 自动生成（基于已答 blocking 与 auto_defaulted 数）

## 与 clarify-protocol.md 的关系

`references/clarify-protocol.md` 已标记为 deprecated。其 envelope 数据模型在 discuss 节点不再使用；transform-agent 不再产出 `<clarify_envelope>`。新流程下所有澄清都通过 plan.md §3 持久化。
