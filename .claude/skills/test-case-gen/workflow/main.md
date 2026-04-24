# test-case-gen · primary workflow（PRD → 测试用例全链路）

> 由 SKILL.md 路由后加载。适用场景：PRD 路径 / 蓝湖 URL / 模块重跑指令。
> 共享的契约、断点续传、Writer 阻断协议、异常处理定义在 SKILL.md 中，不在此重复。

---

## 节点 1: init — 输入解析与环境准备

**目标**：解析用户输入、检查插件、检测断点、确认运行参数。

**⏳ Task**：使用 `TaskCreate` 创建 10 个主流程任务（见「任务可视化」章节），然后将 `init` 任务标记为 `in_progress`。

### 1.0 SESSION_ID 初始化

```bash
# Derive stable SESSION_ID from PRD filename + active env
PRD_SLUG=$(basename "{{prd_path}}" .md)
SESSION_ID="test-case-gen/${PRD_SLUG}-${ACTIVE_ENV:-default}"

# Ensure session exists (create on first run, reuse on resume)
kata-cli progress session-read --project {{project}} --session "$SESSION_ID" 2>/dev/null \
  || kata-cli progress session-create --workflow test-case-gen --project {{project}} \
       --source-type prd --source-path "{{prd_path}}" --meta '{"mode":"{{mode}}"}' > /dev/null
```

### 1.1 断点续传检测

```bash
kata-cli progress session-resume --project {{project}} --session "$SESSION_ID" \
  && kata-cli progress session-read --project {{project}} --session "$SESSION_ID"
```

若返回有效状态 → 跳转到断点所在节点继续执行。

### 1.2 plan.md 状态检测（discuss 续跑路由）

```bash
kata-cli discuss read --project {{project}} --prd {{prd_path}} 2>/dev/null
```

按返回 `frontmatter.status` / `frontmatter.resume_anchor` 决定下游路由：

- 不存在 / status=obsolete → 进入节点 1.5 discuss（init 模式）
- status=discussing → 进入节点 1.5 discuss（恢复模式，从未答 Q\* 续问）
- status=ready → **跳过节点 1.5 discuss，直接进入节点 2 transform**（并把 plan_path 作为 task prompt 传给 transform-agent）

> 提示：`state.ts resume` 与 `discuss read` 互补 — 前者管"工作流上次跑到哪个节点"，后者管"需求讨论是否已落地"。两个独立判定后按各自结论行事。

### 1.4 插件检测（蓝湖 URL 等）

```bash
kata-cli plugin-loader check --input "{{user_input}}"
```

若匹配插件（如蓝湖 URL）→ 执行插件 fetch 命令获取 PRD 内容。

### 1.5 初始化状态

SESSION_ID 已在节点 1.0 完成初始化，此处无需额外操作。

### 交互点 A — 参数分歧处理（仅在输入存在歧义时使用 AskUserQuestion 工具）

默认行为：

- 用户已明确给出 `prd_path` 和 `mode` → 直接展示摘要并继续，不额外确认
- 仅当存在多个候选 PRD、需要切换模式、或用户明确要求改选输入时，才使用 AskUserQuestion

若需提问，展示以下选项：

- 问题：`已识别 PRD：{{prd_path}}，运行模式：{{mode}}。如何处理参数分歧？`
- 选项 1：继续使用当前识别结果（推荐）
- 选项 2：切换为快速模式
- 选项 3：指定其他 PRD 文件

完成分歧处理后，将 `init` 任务标记为 `completed`（subject 更新为 `init — 已识别 PRD，{{mode}} 模式`），按节点 1.2 的路由结论进入节点 1.5（discuss）或直接跳到节点 2（transform）。

---

## 节点 1.75: probe — 4 维信号探针与策略派发

**目标**：采集 4 维信号（源码 / PRD / 历史 / 知识库），派发到 5 套策略模板之一（S1–S5），结果写入 state + plan.md。

**⏳ Task**：将 `probe` 任务标记为 `in_progress`。

### 1.75.1 触发探针

```bash
kata-cli case-signal-analyzer probe \
  --project {{project}} \
  --prd {{prd_path}} \
  --output json
```

stdout 输出完整 SignalProfile JSON。

### 1.75.2 策略路由

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

### 1.75.3 落盘

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

### 1.75.4 S5 外转处理（交互点 P1）

当 `strategy_resolution.strategy_id === "S5"`：使用 AskUserQuestion 工具，按以下格式提问：

- 问题：`检测到 PRD 缺失但源码变更明显（信号：{{signal_summary}}）。建议切换到 Hotfix 用例生成流程。如何处理？`
- 选项 1：切换到 `hotfix-case-gen`（推荐）
- 选项 2：继续主流程（降级为 S4 保守模式）
- 选项 3：取消本次执行

**选项 1**：主 agent 立即停止当前 workflow，引导用户重新输入 `/hotfix-case-gen <Bug URL>`
**选项 2**：调 `case-strategy-resolver.ts resolve --profile ... --force-strategy S4`（CLI 已支持）把 resolution 覆盖为 S4 后继续
**选项 3**：`state.ts clean` + 退出

### 1.75.5 非 S5 情况

直接进入节点 1.5 discuss，把 `strategy_id` 作为下游节点 task prompt 的一部分传递。

**✅ Task**：将 `probe` 任务标记为 `completed`（subject 更新为 `probe — {{strategy_id}} {{strategy_name}}`）。

---

## 节点 1.5: discuss — 主 agent 主持需求讨论

**目标**：在 transform 之前由主 agent 亲自主持需求讨论，将 6 维度自检结果与用户答案落地为 plan.md。完整协议见 `references/discuss-protocol.md` 与 `rules/prd-discussion.md`。

**⏳ Task**：将 `discuss` 任务标记为 `in_progress`。

> **⚠️ 主持原则**：
>
> - 本节点禁派 transform-agent / writer-agent 等承担需求讨论职责的 subagent
> - 仅允许派 Explore subagent 执行只读源码考古或归档检索
> - AskUserQuestion 由主 agent 直接发起；subagent 不得对用户发问

### 1.5.1 plan.md 初始化或恢复

按节点 1.2 的检测结果：

- 全新讨论 → `kata-cli discuss init --project {{project}} --prd {{prd_path}}`
- 恢复 → `kata-cli discuss read --project {{project}} --prd {{prd_path}}` 拿到已答清单 + 未答 Q\*

### 1.5.2 需求摘要（plan §1）

主 agent 读 PRD 原文 → 摘录 1-3 段核心需求 → AskUserQuestion 让用户确认或修正。
摘要确认后由主 agent 直接编辑 plan.md `<!-- summary:begin --> ... <!-- summary:end -->` 段落（仅 §1 段，frontmatter 与 §3 JSON fence 不动）。

### 1.5.3 6 维度自检（plan §2）

主 agent 自己执行（不派 subagent 做最终判断），必要时调辅助工具：

```bash
kata-cli source-analyze analyze --repo {{repo}} --keywords "..." --output json
kata-cli archive-gen search --query "..." --project {{project}}
```

> 深度源码考古可派 Explore subagent，但 Explore 仅返回事实摘要，最终澄清问题由主 agent 整理后向用户提问。

§2 自检表由 §3 累积写入的 `location` 字段自动统计渲染（按维度关键字匹配），主 agent 无需手工维护。

### 1.5.4 逐条澄清（plan §3 + §4）

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

### 1.5.5 知识沉淀（plan §5）

用户在讨论中提到的新术语 / 业务规则 / 踩坑 → 显式调：

```bash
kata-cli knowledge-keeper write \
  --project {{project}} --type term|module|pitfall \
  --content '{...}' --confidence high --confirmed
```

收集所有沉淀条目 → 待 1.5.6 一并传入 `complete --knowledge-summary`。

### 1.5.6 complete

```bash
kata-cli discuss complete \
  --project {{project}} --prd {{prd_path}} \
  --knowledge-summary '[{"type":"term","name":"..."},...]'
```

成功 → status=ready / resume_anchor=discuss-completed → 进入节点 2 transform。
若返回 exit 1（仍有未答 blocking）→ 回 1.5.4 续问后再 complete。

**✅ Task**：将 `discuss` 任务标记为 `completed`（subject 更新为 `discuss — {{n}} 条澄清，{{m}} 条自动默认`）。

### 1.5.7 strategy_id 传递（phase 4）

从本节点起，派发下游 subagent（transform / analyze / writer）时，task prompt 必须包含：

```
strategy_id: {{resolution.strategy_id}}
```

（若 probe 节点返回空 resolution，默认 S1）

subagent 按 `.claude/references/strategy-templates.md` 对应 section 调整行为。

---

## 节点 2: transform — 源码分析与 PRD 结构化

**目标**：交叉分析蓝湖素材 + 源码 + 归档用例，产出结构化测试增强 PRD。

**⏳ Task**：将 `transform` 任务标记为 `in_progress`。

### 2.1 源码配置匹配

```bash
kata-cli repo-profile match --text "{{prd_title_or_path}}"
```

### 2.2 源码引用许可（交互点）

先向用户展示引用摘要（使用 AskUserQuestion）：

```
📋 源码配置确认

命中映射规则：{{profile_name}}（若未命中则显示"未匹配"）

仓库 1：
  ● {{path}} @ {{branch}}（映射表默认）
  ○ 自行输入仓库路径和分支

仓库 2：
  ● {{path}} @ {{branch}}
  ○ 自行输入

  ○ 添加更多仓库
  ○ 不使用源码参考

引用许可选项：

- 选项 1：允许同步并引用以上仓库（推荐）
- 选项 2：仅引用当前已有的本地副本，不额外同步
- 选项 3：调整仓库/分支
- 选项 4：不使用源码参考

> **注意**：这是"允许引用/同步"的确认，不等于允许写回配置。
```

若用户提供了新的映射关系，仅在需要持久化时再进行第二道写回确认。先展示写入摘要：

- profile 名称：`{{name}}`
- repos 预览：`{{repos_json}}`
- 写入位置：repo profile 配置

然后使用 AskUserQuestion 询问：

- 选项 1：仅本次使用，不保存（默认）
- 选项 2：保存为新的 profile / 更新现有 profile
- 选项 3：取消刚才的映射调整

只有在用户明确允许写回时，才执行：

```bash
kata-cli repo-profile save --name "{{name}}" --repos '{{repos_json}}'
```

### 2.3 拉取源码

若用户选择"允许同步并引用以上仓库"，执行：

```bash
kata-cli repo-sync sync-profile --name "{{profile_name}}"
```

若用户自行输入了仓库（非 profile）且允许同步，则逐个调用：

```bash
kata-cli repo-sync --url {{repo_url}} --branch {{branch}}
```

将返回的 commit SHA 写入 PRD frontmatter。

### 2.4 PRD 结构化转换（AI 任务）

派发 `transform-agent`（model: sonnet），task prompt 中**必须**包含 plan.md 路径（见节点 1.5 落盘的 `{{prd_slug}}.plan.md`）：

```
plan_path: workspace/{{project}}/prds/{{YYYYMM}}/{{prd_slug}}.plan.md
```

transform-agent 执行：

- 蓝湖素材解析
- 源码状态检测与分析（A/B 级）
- 历史用例检索
- **读取 plan.md** §3 已澄清项 / §4 自动默认项 / §6 hints
- 按 `references/prd-template.md` 模板填充（已澄清项标 🟢、自动默认项标 🟡）
- 不再输出 `<clarify_envelope>`（envelope 协议已 deprecated，详见 `references/clarify-protocol.md` 顶部说明）

### 2.5 更新状态

```bash
kata-cli progress task-update --project {{project}} --session "$SESSION_ID" --task transform --status done --payload '{{json}}'
```

数据结构：参见 `.claude/references/output-schemas.json` 中的 `state_transform_data`。

**✅ Task**：将 `transform` 任务标记为 `completed`（subject 更新为 `transform — 置信度 {{confidence}}，{{clarify_count}} 项待确认`）。

---

## 节点 3: enhance — PRD 增强

**目标**：图片识别、frontmatter 规范化、页面要点提取、需求澄清。

**⏳ Task**：将 `enhance` 任务标记为 `in_progress`。

> fetch 阶段已从 Axure 资源中提取独立元素图片（高清）+ 整页截图（全貌参考），
> 无需再做图片压缩。images/ 目录中 `N-uXXX.png` 为独立元素，`N-fullpage-*.png` 为整页截图。

### 3.1 Frontmatter 规范化

```bash
kata-cli prd-frontmatter normalize --file {{prd_path}}
```

### 3.2 PRD 增强（AI 任务）

派发 `enhance-agent`（model: sonnet），对 PRD 执行：

- 图片语义化描述
- 页面要点提取
- 需求歧义标注
- 健康度预检

### 3.3 更新状态

```bash
kata-cli progress task-update --project {{project}} --session "$SESSION_ID" --task enhance --status done --payload '{{json}}'
```

**✅ Task**：将 `enhance` 任务标记为 `completed`（subject 更新为 `enhance — {{n}} 张图片，{{m}} 个要点`）。

### 交互点 B — 健康度摘要（默认直接继续）

默认行为：展示增强摘要后直接进入 analyze。

仅当 `health_warnings` 中出现 `blocking_unknown` / `invalid_input`，或用户明确要求停下来查看增强结果时，才使用 AskUserQuestion：

- 问题：`增强完成：识别 {{n}} 张图片，{{m}} 个页面要点。健康度告警：{{health_warnings}}。如何处理？`
- 选项 1：继续分析（推荐）
- 选项 2：补充 PRD 信息
- 选项 3：查看增强后的文件

---

## 节点 4: analyze — 历史检索与测试点规划

**目标**：检索历史用例、QA 头脑风暴、生成测试点清单 JSON。

**⏳ Task**：将 `analyze` 任务标记为 `in_progress`。

### 4.1 历史用例检索

```bash
kata-cli archive-gen search --query "{{keywords}}" --project {{project}} --limit 20 \
  | kata-cli search-filter filter --top 5
```

> 注：`workspace/{{project}}/archive` 中的 `workspace` 对应 `.env` 中 `WORKSPACE_DIR` 的值（默认 `workspace`），`{{project}}` 为当前选中的项目名称。`search-filter.ts` 对结果做相关性排序并截取 top-5，减少传入 analyze-agent 的上下文体积。

### 4.2 测试点清单生成（AI 任务）

派发 `analyze-agent`（model: opus），结合增强后 PRD + 历史用例，生成结构化测试点清单。

--quick 模式下简化分析：跳过历史检索，直接从 PRD 提取测试点。

### 4.3 更新状态

```bash
kata-cli progress task-update --project {{project}} --session "$SESSION_ID" --task analyze --status done --payload '{{json}}'
```

**✅ Task**：将 `analyze` 任务标记为 `completed`（subject 更新为 `analyze — {{n}} 个模块，{{m}} 条测试点`）。

### 交互点 C — 测试点摘要（默认直接进入 write）

先在普通文本中展示测试点清单概览：

```
测试点清单（共 {{n}} 个模块，{{m}} 条测试点）：

┌─ {{module_a}}（{{count_a}} 条）
│  ├─ {{page_1}}: {{points}}...
│  └─ {{page_2}}: {{points}}...
└─ {{module_b}}（{{count_b}} 条）
```

默认行为：若测试点清单无 `blocking_unknown` / `invalid_input`，直接进入 write 节点。

仅当 analyze-agent 标记需要人工裁决，或用户明确要求修改范围时，才使用 AskUserQuestion：

- 问题：`测试点清单存在待裁决项，是否需要调整后再生成？`
- 选项 1：直接开始生成（推荐）
- 选项 2：调整测试点清单
- 选项 3：增加/删除测试点

---

## 节点 5: write — 并行 Writer 生成用例

**目标**：按模块并行派发 Writer Sub-Agent，生成结构化用例 JSON。

**⏳ Task**：将 `write` 任务标记为 `in_progress`。然后为每个模块创建子任务（subject: `[write] {{模块名}}`，activeForm: `生成「{{模块名}}」用例`）。

### 5.1 派发 Writer Sub-Agent

为每个模块派发独立 `writer-agent`（model: sonnet），派发前先构建 writer 上下文：

```bash
kata-cli writer-context-builder build \
  --prd {{enhanced_prd}} \
  --test-points {{test_points}} \
  --writer-id {{module}} \
  --rules {{rules_merged}} \
  --strategy-id {{resolution.strategy_id}} \
  --knowledge-injection {{resolution.overrides.writer.knowledge_injection}} \
  --project {{project}}
```

输入包含：

- 增强后 PRD 对应模块内容
- 该模块已确认的测试点清单
- 合并后规则 JSON（来自 `workspace/{{project}}/.temp/rules-merged.json`）
- 历史归档用例参考（来自 analyze 步骤）
- 已确认上下文（来自 `<confirmed_context>`）
- 源码上下文（来自 transform 步骤的源码分析结果，包括按钮名称、表单结构、字段定义、导航路径等 🔵 标注信息。若 transform 阶段完成了 B 级分析，须将关键 UI 结构摘要传给 Writer）

### 5.2 结构化阻断中转（强制检查）

> **⚠️ Writer subagent 在阻断时必须输出 `<blocked_envelope>`；若无阻断则直接输出 Contract A JSON（见 Contract A/B 定义）。若主 agent 无法确认 subagent 已完成 5 维度自检，须要求其补充执行。**

- Writer 直接输出 Contract A JSON → 视为无阻断，正常继续
- Writer 输出 `<blocked_envelope status="needs_confirmation">` → 执行下文的 Writer 阻断中转协议
- Writer 输出 `<blocked_envelope status="invalid_input">` → 停止该模块并要求修正输入

**✅ Task**：每个 Writer Sub-Agent 完成时，将对应子任务标记为 `completed`（subject 更新为 `[write] {{模块名}} — {{n}} 条用例`）。所有 Writer 完成后，将 `write` 主任务标记为 `completed`（subject 更新为 `write — {{total}} 条用例，{{module_count}} 个模块`）。

### 5.3 更新状态

每个 Writer 完成后更新状态：

```bash
kata-cli progress task-update --project {{project}} --session "$SESSION_ID" --task write --status done --payload '{{json}}'
```

---

## 节点 6: review — 质量审查与修正

**目标**：对 Writer 产出执行质量审查，按阈值自动决策。

**⏳ Task**：将 `review` 任务标记为 `in_progress`。

### 6.1 质量审查（AI 任务）

派发 `reviewer-agent`（model: opus）执行质量审查。

质量阈值决策：

| 问题率    | 行为                           |
| --------- | ------------------------------ |
| < 15%     | 静默修正                       |
| 15% - 40% | 自动修正 + 质量警告            |
| > 40%     | 阻断，输出问题报告，等用户决策 |

问题率 = 含问题用例数 / 总用例数。

--quick 模式仅执行 1 轮审查。普通模式最多 2 轮（修正后复审）。

### 6.2 合并产出

将所有 Writer 输出合并为最终 JSON。

### 6.3 更新状态

```bash
kata-cli progress task-update --project {{project}} --session "$SESSION_ID" --task review --status done --payload '{{json}}'
```

**✅ Task**：将 `review` 任务标记为 `completed`（subject 更新为 `review — {{n}} 条用例，问题率 {{rate}}%`）。

### 交互点 D — 质量门禁决策（仅在 reviewer 阻断时使用 AskUserQuestion 工具）

默认行为：

- `verdict = pass` / `pass_with_warnings` → 直接进入 format-check，并在普通文本展示评审摘要
- `verdict = blocked` → 使用 AskUserQuestion 向用户请求决策

阻断时展示：

- 问题：`评审完成：共 {{n}} 条用例，修正 {{m}} 条，问题率 {{rate}}%，当前为阻断状态。如何处理？`
- 选项 1：返回 Writer 阶段重新生成（推荐）
- 选项 2：查看修正详情
- 选项 3：人工复核后继续

---

## 节点 6.5: format-check — 格式合规检查闭环

**目标**：确保 Writer 产出的用例在格式层面严格符合 R01-R11 编写规范，零偏差才放行。

> **最大轮次**：普通模式最多 5 轮；--quick 模式最多 2 轮。

**⏳ Task**：将 `format-check` 任务标记为 `in_progress`。创建第 1 轮子任务（subject: `[format-check] 第 1 轮`，activeForm: `执行第 1 轮格式检查`）。

### 6.5.1 生成临时 Archive MD

```bash
kata-cli archive-gen convert \
  --input {{review_json}} \
  --project {{project}} \
  --output workspace/{{project}}/archive/{{YYYYMM}}/tmp/{{name}}-format-check.md
```

### 6.5.2 格式检查（分层流水线）

**第一层：脚本确定性检查**

```bash
kata-cli format-check-script check --input workspace/{{project}}/.temp/{{prd_slug}}-format-check.md
```

脚本输出 JSON：`definite_issues`（纯格式违规）+ `suspect_items`（FC04/FC06 疑似项）。

**第二层：语义判断（仅 suspect_items 非空时）**

若 `suspect_items` 为空 → 跳过 haiku 调用，直接合并结果。
若非空 → 派发 `format-checker-agent`（model: haiku），仅传入 suspect_items，不传完整 Archive。

输入（仅传给 haiku 时）：

- `suspect_items`：疑似违规条目列表
- 当前轮次信息：`第 {{round}} 轮 / 最大 {{max_rounds}} 轮`
- 上一轮偏差报告（第 2 轮起）

**合并**：脚本 `definite_issues` + agent `confirmed_issues` = 完整偏差报告。

**循环**：违规项修正后重新执行第一层（最多 5 轮）。

### 6.5.3 行号定位

```bash
kata-cli format-report-locator locate \
  --report {{format_checker_json}} \
  --archive workspace/{{project}}/archive/{{YYYYMM}}/tmp/{{name}}-format-check.md \
  --output workspace/{{project}}/archive/{{YYYYMM}}/tmp/{{name}}-format-enriched.json
```

可选：终端可读报告

```bash
kata-cli format-report-locator print \
  --report {{format_checker_json}} \
  --archive workspace/{{project}}/archive/{{YYYYMM}}/tmp/{{name}}-format-check.md
```

### 6.5.4 Verdict 判定

**✅ Task**：将当前轮子任务标记为 `completed`（subject 更新为 `[format-check] 第 {{n}} 轮 — {{偏差数}} 处偏差`）。

- `verdict === "pass"` → 将 `format-check` 主任务标记为 `completed`（subject: `format-check — 通过（第 {{n}} 轮）`），进入节点 7（output）
- `verdict === "fail"` 且 `round < max_rounds` → 创建下一轮子任务（subject: `[format-check] 第 {{n+1}} 轮`），进入修正循环（6.5.5）
- `verdict === "fail"` 且 `round >= max_rounds` → 交互点 D2（超限决策）

### 6.5.5 修正循环

1. 将偏差报告转为 `<format_issues>` 载荷
2. 派发 Writer Sub-Agent 修正报告中列出的用例（仅修正偏差用例，其余原样保留）
3. Writer 输出修正后的 JSON
4. 派发 `reviewer-agent`（model: opus）对修正后的 JSON 执行 F07-F15 设计逻辑复审
5. 回到 6.5.1 重新生成临时 Archive MD → 6.5.2 再检

### 6.5.6 更新状态

每轮循环后更新状态：

```bash
# format-check 是自定义节点，首次使用前需确保已注册
kata-cli progress task-add --project {{project}} --session "$SESSION_ID" \
  --tasks '[{"id":"format-check","name":"format-check","kind":"node","order":8,"depends_on":["review"]}]' \
  2>/dev/null || true
kata-cli progress task-update --project {{project}} --session "$SESSION_ID" --task format-check --status done --payload '{{json}}'
```

数据结构：参见 `.claude/references/output-schemas.json` 中的 `state_format_check_data`。

### 交互点 D2 — 格式检查超限决策（使用 AskUserQuestion 工具）

当 format-check 循环达到最大轮次但仍有偏差时触发：

使用 AskUserQuestion 工具向用户展示：

- 问题：`格式检查已执行 {{max_rounds}} 轮，仍有 {{n}} 处偏差未修正。如何处理？`
- 选项 1：强制输出（忽略剩余偏差）
- 选项 2：查看未修正项详情
- 选项 3：人工修正后继续

---

## 节点 7: output — 产物生成与通知

**目标**：生成 XMind + Archive MD，发送通知，清理状态。

**⏳ Task**：将 `output` 任务标记为 `in_progress`。

> **产物路径规则**（严格遵守）：
>
> - XMind → `workspace/{{project}}/xmind/{{YYYYMM}}/{{需求名称}}.xmind`
> - Archive MD → `workspace/{{project}}/archive/{{YYYYMM}}/{{需求名称}}.md`
> - **中间 JSON** → `workspace/{{project}}/archive/{{YYYYMM}}/tmp/{{需求名称}}.json`（中间产物必须放在 `tmp/` 子目录）
> - 禁止输出到 `workspace/cases/` 目录（该目录不存在且不应被创建）
> - 禁止将中间 JSON 放在 `archive/YYYYMM/` 根目录下

### 7.1 生成 XMind

```bash
kata-cli xmind-gen --input {{final_json}} --project {{project}} --output workspace/{{project}}/xmind/{{YYYYMM}}/{{需求名称}}.xmind --mode create
```

### 7.2 生成 Archive MD

```bash
kata-cli archive-gen convert --input {{final_json}} --project {{project}} --output workspace/{{project}}/archive/{{YYYYMM}}/{{需求名称}}.md
```

### 7.3 发送通知

```bash
kata-cli plugin-loader notify --event case-generated --data '{{notify_data}}'
```

notify_data 必需字段：`count`、`file`、`duration`。

### 7.4 清理状态

```bash
kata-cli progress session-delete --project {{project}} --session "$SESSION_ID"
```

**✅ Task**：将 `output` 任务标记为 `completed`（subject 更新为 `output — {{n}} 条用例，XMind + Archive MD 已生成`）。

### 交付摘要（状态展示，无需确认）

用例生成完成后，直接展示产物摘要：

- XMind：`{{xmind_path}}`
- Archive：`{{archive_path}}`
- 共 `{{n}}` 条用例（P0: `{{p0}}`, P1: `{{p1}}`, P2: `{{p2}}`）
- 若用户后续提出编辑或重跑诉求，再路由到 `xmind-editor` 或模块重跑流程
