# 节点 3: discuss — 主 agent 主持需求讨论

> 由 workflow/main.md 路由后加载。上游：节点 2 probe；下游：节点 4 transform。

**目标**：在 transform 之前由主 agent 亲自主持需求讨论，将 6 维度自检结果与用户答案落地为 plan.md。完整协议见 `references/discuss-protocol.md` 与 `rules/prd-discussion.md`。

**⏳ Task**：将 `discuss` 任务标记为 `in_progress`。

> **⚠️ 主持原则**：
>
> - 本节点禁派 transform-agent / writer-agent 等承担需求讨论职责的 subagent
> - 仅允许派 Explore subagent 执行只读源码考古或归档检索
> - AskUserQuestion 由主 agent 直接发起；subagent 不得对用户发问

### 3.1 plan.md 初始化或恢复

按节点 1.2 的检测结果：

- 全新讨论 → `kata-cli discuss init --project {{project}} --prd {{prd_path}}`
- 恢复 → `kata-cli discuss read --project {{project}} --prd {{prd_path}}` 拿到已答清单 + 未答 Q\*

### 3.2 需求摘要（plan §1）

主 agent 读 PRD 原文 → 摘录 1-3 段核心需求 → AskUserQuestion 让用户确认或修正。
摘要确认后由主 agent 直接编辑 plan.md `<!-- summary:begin --> ... <!-- summary:end -->` 段落（仅 §1 段，frontmatter 与 §3 JSON fence 不动）。

### 3.3 6 维度自检（plan §2）

主 agent 自己执行（不派 subagent 做最终判断），必要时调辅助工具：

```bash
kata-cli source-analyze analyze --repo {{repo}} --keywords "..." --output json
kata-cli archive-gen search --query "..." --project {{project}}
```

> 深度源码考古可派 Explore subagent，但 Explore 仅返回事实摘要，最终澄清问题由主 agent 整理后向用户提问。

§2 自检表由 §3 累积写入的 `location` 字段自动统计渲染（按维度关键字匹配），主 agent 无需手工维护。

### 3.4 逐条澄清（plan §3 + §4）

对每条 `blocking_unknown`：

```
AskUserQuestion(
  question: "{{Q.question}}",
  options: 最多 4 项（含 recommended_option 标注 推荐）,
)
```

收到答案后立即调 `append-clarify` 落盘：

```bash
kata-cli discuss append-clarify \
  --project {{project}} --prd {{prd_path}} \
  --content '{{json}}'
```

`defaultable_unknown` 直接 `append-clarify` with `default_policy`，不向用户发问。

### 3.5 知识沉淀（plan §5）

用户在讨论中提到的新术语 / 业务规则 / 踩坑 → 显式调：

```bash
kata-cli knowledge-keeper write \
  --project {{project}} --type term|module|pitfall \
  --content '{...}' --confidence high --confirmed
```

收集所有沉淀条目 → 待 3.6 一并传入 `complete --knowledge-summary`。

### 3.6 complete

```bash
kata-cli discuss complete \
  --project {{project}} --prd {{prd_path}} \
  --knowledge-summary '[{"type":"term","name":"..."},...]'
```

成功 → status=ready / resume_anchor=discuss-completed → 进入节点 4 transform。
若返回 exit 1（仍有未答 blocking）→ 回 3.4 续问后再 complete。

**✅ Task**：将 `discuss` 任务标记为 `completed`（subject 更新为 `discuss — {{n}} 条澄清，{{m}} 条自动默认`）。

### 3.7 strategy_id 传递（phase 4）

从本节点起，派发下游 subagent（transform / analyze / writer）时，task prompt 必须包含：

```
strategy_id: {{resolution.strategy_id}}
```

（若 probe 节点返回空 resolution，默认 S1）

subagent 按 `.claude/references/strategy-templates.md` 对应 section 调整行为。
