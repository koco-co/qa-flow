# discuss 节点协议（enhanced.md 版）

> test-case-gen 工作流 `discuss` 节点（主 agent 主持）操作手册。硬约束见 `rules/prd-discussion.md`。模板见 `references/enhanced-doc-template.md`、`references/pending-item-schema.md`。

## 触发与恢复

| 场景 | 来源 | 行为 |
|---|---|---|
| 全新需求 | 无 enhanced.md | `discuss init` → 3.2 源码许可 → 3.2.5 source-facts-agent → 3.3-3.7 讨论 → `complete` |
| 中断恢复 | enhanced.md status=discussing | `discuss read` 恢复 §4 已 resolve + 未 resolve 清单 → 续走 3.7 |
| 已完成 | enhanced.md status=ready | 跳过 discuss，主 agent 直接进节点 4 analyze |
| 半冻结回射 | enhanced.md status=analyzing / writing | `add-pending` 自动回退到 discussing 并记 `reentry_from`；回到 3.7 续问 |
| 迁移恢复 | enhanced.md migrated_from_plan=true | 从 3.2 开始补齐 Appendix A + §2 + §3 |
| obsolete | enhanced.md updated_at < original.md mtime 且超 5 分钟 | `discuss reset` → `init` 重新讨论 |

## 10 维度自检清单

参见 `references/10-dimensions-checklist.md`。分两组：

- **全局层 4 维度**（quick 模式可跳过）：数据源 / 历史数据影响 / 测试范围 / PRD 合理性审查
- **功能层 6 维度**（快慢模式都必做）：字段定义 / 交互逻辑 / 导航路径 / 状态流转 / 权限控制 / 异常处理

每维度至少"过一遍"（即使"无疑问"）；模糊语扫描参照 `references/ambiguity-patterns.md` 10 模式。

每发现一条 → `kata-cli discuss add-pending` 落 enhanced.md §4。

## 不确定性分类

- **defaultable_unknown** → `add-pending`，随即 `resolve --as-default`；不向用户发问
- **blocking_unknown** → AskUserQuestion 单条问 → `resolve --id q{n} --answer "..."` / 保持"待确认"
- **invalid_input** → 立即停止，要求修正输入；不写 enhanced.md

## AskUserQuestion 约束（3 选项格式）

每条 AskUserQuestion 固定为 3 选项：

1. **推荐**（recommended_option，必填，描述具体值 + 依据）
2. **暂不回答 — 进入待确认清单**（保持 Q 状态为"待确认"）
3. **Other**（AskUserQuestion 自动提供；用户输入自由文本）

- 禁用"最多 4 个候选项"的旧写法
- 字段标签统一用"推荐"（非"AI 推荐"），状态值用"待确认"（非"待产品确认"）

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
4. `discuss complete --knowledge-summary '<json>'` 时 CLI 自动写入 enhanced.md frontmatter.knowledge_dropped

严禁主 agent 直接写 `workspace/{project}/knowledge/` 下任何文件。

## complete 前置守卫

- 调 `discuss validate --require-zero-pending` 验证 §4 所有 Q 均已 resolve（或为"默认采用"状态）
- 检查锚点完整性（validate 内置的 6 项检查）
- 收集本轮沉淀的 knowledge 列表 → 构造 `--knowledge-summary` JSON
- 选 `--handoff-mode current|new`：
  - `current`：主 agent 在当前会话进节点 4 analyze
  - `new`：输出交接 prompt，结束当前会话，由用户新开会话接力
- `source_reference=none` 时输出降级 banner：

  ```
  ⚠️ 本次讨论未引用源码，待确认项的推荐值可能不够精准。
    下游 source_ref 将只指向 PRD 原文 / knowledge 锚点；
    analyze 阶段发现的新疑问会更多，请做好回射准备。
  ```

## 半冻结回射（analyze / write 下新增 Q）

analyze 或 write 节点发现新疑问 / Writer 输出 `<blocked_envelope>`：

1. 主 agent 调 `discuss add-pending`（参数含 location / question / recommended / expected）
2. CLI 内部：
   - 检测 `status ∈ {analyzing, writing}` → 写 `frontmatter.reentry_from = {current_status}`
   - `status` 回退到 `discussing`
   - §4 追加新 Q 区块，脚注插入到对应 `s-*` 锚点段落
3. 主 agent 回到 discuss 3.7 对新 Q 逐条 AskUserQuestion + resolve
4. 所有新 Q 解决 → 3.9 自审 + `discuss validate --require-zero-pending`
5. `discuss complete --handoff-mode current` → CLI 按 `reentry_from` 把 status 恢复到 `analyzing` / `writing`
6. 主 agent 回到节点 4 / 5 增量重跑：已产出的 test_points / cases 保留，仅对新 Q 相关的 source_ref 重算

Writer `<blocked_envelope>` 回射的 item → add-pending 映射：

```json
{
  "id": "{{auto-assigned q-id}}",
  "location": "writer-回射：{{item.location}}（writer_id={{writer_id}}）",
  "question": "{{item.question}}",
  "recommended": "{{item.recommended_option.description}}",
  "expected": "<写作后根据推荐生成>",
  "context": {
    "writer_id": "{{writer_id}}",
    "type": "{{item.type}}",
    "source": "{{item.context}}"
  }
}
```

complete 后回到 writing，writer-agent 重跑构建 `<confirmed_context>`：

```xml
<confirmed_context>
{
  "writer_id": "{{writer_id}}",
  "items": [
    {
      "id": "B1",
      "resolution": "pending_answered",
      "source_ref": "enhanced#q{n}",
      "value": "{{Q.answer}}"
    }
  ]
}
</confirmed_context>
```

## 与 clarify-protocol.md 的关系

`references/clarify-protocol.md` 已标 DEPRECATED（Phase B 起）；其 envelope 协议在 discuss 节点不再使用。Phase D2 起 transform-agent / enhance-agent 已删除。所有澄清通过 enhanced.md §4 + `add-pending` / `resolve` 持久化。
