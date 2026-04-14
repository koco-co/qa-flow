---
name: test-case-gen
description:
  "QA 测试用例生成与标准化归档。将 PRD 需求文档转化为结构化 XMind + Markdown 测试用例。
  7 节点工作流：init → transform → enhance → analyze → write → review → output。
  触发词：生成测试用例、生成用例、写用例、为 <需求名称> 生成用例、test case、
  重新生成 xxx 模块、追加用例。支持 --quick 快速模式和蓝湖 URL 输入。
  也支持标准化归档：当用户提供 .xmind 或 .csv 文件时，触发归档标准化流程。
  触发词：标准化归档、归档用例、转化用例、标准化 xmind、标准化 csv。
  也支持 XMind 反向同步：将手动修改的 XMind 同步回 Archive MD。
  触发词：同步 xmind、同步 XMind 文件、反向同步。"
argument-hint: "[PRD 路径或蓝湖 URL 或 XMind/CSV 文件] [--quick]"
---

<!-- 前置加载 -->

执行前收集偏好上下文（读取顺序如下；冲突时按 precedence 裁决）：

1. 全局 `preferences/` 目录下所有 `.md` 文件
2. 项目级 `workspace/{{project}}/preferences/` 目录下所有 `.md` 文件

<precedence>
用户当前指令 > 项目级 preferences > 全局 preferences > 本文件
</precedence>

<artifact_contract>
<xmind_intermediate contract="A">

<title>验证xxx</title>
<priority>P1</priority>
</xmind_intermediate>
<archive_md contract="B">
<display_title>【P1】验证xxx</display_title>
</archive_md>
</artifact_contract>

> 本文件引用的 `references/` 属于本 skill 的内置规则，一并受上述 precedence 约束。
> Contract A 适用于 Writer / Standardize / Reviewer 的中间 JSON 与 XMind 节点；Contract B 仅适用于 Archive MD 与其他展示面。

读取项目配置：执行 `bun run .claude/scripts/config.ts`（从 `.env` 读取模块、仓库、路径配置）。
全程遵守 `.claude/rules/test-case-writing.md` 用例编写规范。

<role>
你是 qa-flow 的编排型技能，负责在项目偏好优先级与 Task 2 A/B 产物契约保持不变的前提下，协调 PRD → 测试点 → 用例 → XMind/Archive MD 的交付，或执行标准化归档 / XMind 反向同步。
</role>

<inputs>
- PRD 路径、蓝湖 URL、XMind/CSV 文件、模块重跑指令、反向同步指令
- 项目级与全局 `preferences/`
- `config.ts`、`state.ts`、`workspace/{{project}}/`、只读源码仓库
- subagent 输出的结构化 JSON / `<clarify_envelope>` / `<blocked_envelope>` / `<confirmed_context>`
</inputs>

<workflow>
  <primary>init → transform → enhance → analyze → write → review → format-check → output</primary>
  <standardize>parse → standardize → review → output</standardize>
  <reverse_sync>confirm_xmind → parse → locate_archive → preview_or_write → report</reverse_sync>
</workflow>

<confirmation_policy>
<rule id="status_only">纯状态展示、任务进度、完成摘要不要求确认；直接继续下一节点。</rule>
<rule id="scope_or_ambiguity">仅在输入存在歧义、范围可变、或用户明确要求人工审阅时使用 AskUserQuestion。</rule>
<rule id="stateful_write">覆盖已有文件、保存 repo 映射、反向同步 Archive MD、持久化 profile / config 前，先展示预览或写入摘要，再确认。</rule>
<rule id="reference_vs_writeback">允许引用源码/历史/已有产物用于分析，不等于允许写回配置或归档；写回必须单独授权。</rule>
</confirmation_policy>

<output_contract>
<artifact_contract>保留 Task 2 已批准的 A/B 产物契约与文案，不改写 Writer 中间 JSON、Archive MD、XMind 的职责边界。</artifact_contract>
<transform_handoff>transform 通过 `<clarify_envelope>` / `<confirmed_context>` 交接，不再依赖旧式 Markdown 协议块。</transform_handoff>
<writer_handoff>writer 通过 `<blocked_envelope>` / `<confirmed_context>` 交接；阻断时也必须保持机器可读。</writer_handoff>
</output_contract>

<error_handling>
<defaultable_unknown>能安全默认的缺口记录为默认项并继续。</defaultable_unknown>
<blocking_unknown>影响 PRD、测试点或用例正确性的未知项转交澄清/阻断协议。</blocking_unknown>
<invalid_input>输入损坏、缺失或路径不合法时立即停止当前分支并提示修正。</invalid_input>
</error_handling>

<examples>
  <normal_run>普通模式默认连续推进；只有歧义输入、阻断未知或写回动作才触发确认。</normal_run>
  <writeback_gate>反向同步 Archive MD、保存 repo profile 等持久化写入必须先预览再确认。</writeback_gate>
</examples>

---

## 项目选择

1. 扫描 `workspace/` 下的项目目录
2. 若只有 1 个项目，自动选中
3. 若有多个项目，提示用户选择
4. 将选中项目记为 `{{project}}`

---

## 运行模式

| 模式       | 触发条件                               | 行为差异                                                             |
| ---------- | -------------------------------------- | -------------------------------------------------------------------- |
| 普通       | 默认                                   | 全 7 节点 + 全部交互点                                               |
| 快速       | `--quick`                              | 跳过交互点 B/C，analyze 简化，review 仅 1 轮，format-check 最多 2 轮 |
| 续传       | 自动检测 `.temp/.qa-state-*.json` 存在 | 从断点节点继续                                                       |
| 模块重跑   | `重新生成 xxx 的「yyy」模块`           | 仅执行 write → review → output（replace 模式）                       |
| 标准化归档 | 用户提供 `.xmind` 或 `.csv` 文件       | 走独立流程：parse → standardize → review → output                    |
| 反向同步   | `同步 xmind`、`反向同步`               | XMind → Archive MD，走独立 5 步流程                                  |

---

## 任务可视化（Task 工具）

> 全流程使用 `TaskCreate` / `TaskUpdate` 工具展示实时进度，让用户在终端看到全局视图。

### 主流程（7 节点）

workflow 启动时（节点 1 开始前），使用 `TaskCreate` 一次性创建 8 个任务（含 format-check），按顺序设置 `addBlockedBy` 依赖：

| 任务 subject                        | activeForm                       |
| ----------------------------------- | -------------------------------- |
| `init — 输入解析与环境准备`         | `解析输入与检测断点`             |
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

进入 format-check 节点后，为第 1 轮创建子任务：

- subject: `[format-check] 第 1 轮`
- activeForm: `执行第 1 轮格式检查`

每轮完成时更新 subject 为 `[format-check] 第 {{n}} 轮 — {{偏差数}} 处偏差`，若需下一轮则创建新子任务。

### 标准化归档流程子任务

进入标准化归档流程时，创建 4 个任务（S1-S4），规则同上。

### 反向同步流程子任务

进入反向同步流程时，创建 5 个任务（RS1-RS5），规则同上。

---

## 标准化归档流程（XMind / CSV 输入）

> 当用户提供的输入是 `.xmind` 或 `.csv` 文件（而非 PRD）时，进入此流程。
> 此流程**不走** 7 节点工作流，而是走独立的 4 步标准化流程。

### 触发条件

用户输入文件扩展名为 `.xmind` 或 `.csv`，或包含触发词：标准化归档、归档用例、转化用例。

**⏳ Task**：使用 `TaskCreate` 创建 4 个标准化归档任务（`S1 解析源文件`、`S2 标准化重写`、`S3 质量审查`、`S4 输出`），按顺序设置 `addBlockedBy` 依赖。将 `S1` 标记为 `in_progress`。

### 步骤 S1: 解析源文件

```bash
bun run .claude/scripts/history-convert.ts --path {{input_file}} --detect
```

展示解析结果后，使用 AskUserQuestion 工具向用户确认：

- 问题：`已解析源文件 {{input_file}}（{{xmind|csv}}），共 {{count}} 条用例。选择处理方式？`
- 选项 1：标准化归档 — AI 按规则重写用例（推荐）
- 选项 2：仅格式转换 — 保留原始内容，直接转为 Archive MD
- 选项 3：查看原始用例内容

> **选项 1（标准化归档）**：AI 读取原始用例内容，按 `test-case-rules.md` 全部规则重写步骤、预期、前置条件，确保达到自动化可执行精度。原始 XMind/CSV 内容**不直接放入**产物中。
> **选项 2（仅格式转换）**：调用 `history-convert.ts` 直接转换，不经过 AI 重写。

**✅ Task**：将 `S1` 标记为 `completed`（subject: `S1 解析源文件 — {{count}} 条用例`）。

### 步骤 S2: AI 标准化重写（仅选项 1）

**⏳ Task**：将 `S2` 标记为 `in_progress`。

派发 `standardize-agent`（model: sonnet）对解析出的原始用例逐模块执行标准化重写：

- 应用步骤三要素（操作位置 + 操作对象 + 操作动作）
- 补充等待条件
- 预期结果可断言化
- 前置条件操作化
- 标题与优先级遵循 Contract A：`title=验证xxx`，`priority` 独立存放
- 模糊步骤具体化、占位数据替换为真实业务数据
- 合并符合条件的正向用例

输出中间 JSON 格式（与 writer 输出一致，使用 Contract A；如需 `【P1】验证xxx`，仅在 Archive MD / 展示面按 Contract B 组装）。

**✅ Task**：将 `S2` 标记为 `completed`（subject: `S2 标准化重写 — 完成`）。

### 步骤 S3: 质量审查

**⏳ Task**：将 `S3` 标记为 `in_progress`。

派发 `reviewer-agent`（model: opus）对标准化后的 JSON 执行审查。
质量门禁与普通模式一致（15% / 40%）。

**✅ Task**：将 `S3` 标记为 `completed`（subject: `S3 质量审查 — 问题率 {{rate}}%`）。

### 步骤 S4: 输出

**⏳ Task**：将 `S4` 标记为 `in_progress`。

> **路径规则**：标准化产物（含 `-standardized` 后缀的 MD 和 XMind）属于中间产物，必须输出到 archive 下的 `tmp/` 子目录，不得直接放在 archive 或 xmind 根目录下。
>
> - Archive MD → `workspace/{{project}}/archive/{{YYYYMM}}/tmp/{{name}}-standardized.md`
> - XMind → `workspace/{{project}}/archive/{{YYYYMM}}/tmp/{{name}}-standardized.xmind`
> - 中间 JSON 也保留在同一 `tmp/` 目录
> - 禁止输出到 `workspace/cases/` 目录（该目录不存在且不应被创建）

```bash
# 生成标准化 Archive MD（输出到 tmp/ 子目录）
bun run .claude/scripts/archive-gen.ts convert --input {{final_json}} --project {{project}} --output {{archive_tmp_path}}

# 从标准化 JSON 生成 XMind（输出到 tmp/ 子目录）
bun run .claude/scripts/xmind-gen.ts --input {{final_json}} --project {{project}} --output {{xmind_tmp_path}} --mode create

# 通知
bun run .claude/scripts/plugin-loader.ts notify --event archive-converted --data '{"fileCount":1,"caseCount":{{count}}}'
```

**✅ Task**：将 `S4` 标记为 `completed`（subject: `S4 输出 — {{count}} 条用例已归档`）。

### 完成摘要（状态展示，无需确认）

标准化归档完成后，直接展示摘要并结束当前流程：

- Archive MD：`{{archive_tmp_path}}`
- XMind：`{{xmind_tmp_path}}`
- 用例数：标准化前 `{{original_count}}` 条，标准化后 `{{final_count}}` 条
- 如用户后续提出编辑意图，再路由到 `xmind-editor` skill

---

## XMind 反向同步流程（XMind → Archive MD）

> 当用户在 XMind 软件中手动修改了用例后，需要将变更同步回 Archive MD 归档文件。
> 此流程**不走** 7 节点工作流，为独立的反向同步操作。

### 触发条件

用户输入包含触发词：同步 xmind、同步 XMind 文件、反向同步。
或指定了具体 XMind 文件路径（如 `同步 workspace/{{project}}/xmind/202604/数据质量.xmind`）。

### RS1: 确认 XMind 文件

若用户未指定 XMind 文件，使用 AskUserQuestion 工具询问：

- 问题：`请指定要同步的 XMind 文件路径，或输入关键词搜索`
- 选项 1：从最近生成的 XMind 中选择
- 选项 2：手动输入文件路径

若选择"从最近生成的 XMind 中选择"，列出 `workspace/{{project}}/xmind/` 下最近修改的文件供选择。

### RS2: 解析 XMind 文件

```bash
bun run .claude/scripts/history-convert.ts --path {{xmind_file}} --detect
```

展示解析结果，并使用 AskUserQuestion 确认：

- 问题：`已解析 {{xmind_file}}，共 {{count}} 条用例。确认同步到 Archive MD？`
- 选项 1：确认同步（推荐）— 覆盖对应的 Archive MD 文件
- 选项 2：预览变更 — 先生成到 tmp/ 目录，对比后再决定
- 选项 3：取消

### RS3: 定位对应 Archive MD

按以下优先级查找对应的 Archive MD 文件：

1. XMind 文件名匹配：`workspace/{{project}}/archive/{{YYYYMM}}/{{same_name}}.md`
2. 同月份目录下搜索 frontmatter 中 `suite_name` 匹配的文件
3. 未找到 → 使用 AskUserQuestion 询问用户指定目标路径或创建新文件

### RS4: 执行转换

```bash
bun run .claude/scripts/history-convert.ts --path {{xmind_file}}
```

转换完成后，将生成的 Archive MD 覆盖写入目标路径（或写入 tmp/ 供预览）。

### RS5: 完成摘要（状态展示，无需确认）

反向同步完成后，直接展示：

- Archive MD 已更新：`{{archive_path}}`
- 同步用例数：`{{count}}`
- 若用户继续提出查看或编辑诉求，再展示文件内容或路由 `xmind-editor`

---

## 节点 1: init — 输入解析与环境准备

**目标**：解析用户输入、检查插件、检测断点、确认运行参数。

**⏳ Task**：使用 `TaskCreate` 创建 8 个主流程任务（见「任务可视化」章节），然后将 `init` 任务标记为 `in_progress`。

### 1.1 断点续传检测

```bash
bun run .claude/scripts/state.ts resume --prd-slug {{prd_slug}} --project {{project}}
```

若返回有效状态 → 跳转到断点所在节点继续执行。

### 1.2 插件检测（蓝湖 URL 等）

```bash
bun run .claude/scripts/plugin-loader.ts check --input "{{user_input}}"
```

若匹配插件（如蓝湖 URL）→ 执行插件 fetch 命令获取 PRD 内容。

### 1.3 初始化状态

```bash
bun run .claude/scripts/state.ts init --prd {{prd_path}} --project {{project}} --mode {{mode}}
```

### 交互点 A — 参数分歧处理（仅在输入存在歧义时使用 AskUserQuestion 工具）

默认行为：

- 用户已明确给出 `prd_path` 和 `mode` → 直接展示摘要并继续，不额外确认
- 仅当存在多个候选 PRD、需要切换模式、或用户明确要求改选输入时，才使用 AskUserQuestion

若需提问，展示以下选项：

- 问题：`已识别 PRD：{{prd_path}}，运行模式：{{mode}}。如何处理参数分歧？`
- 选项 1：继续使用当前识别结果（推荐）
- 选项 2：切换为快速模式
- 选项 3：指定其他 PRD 文件

完成分歧处理后，将 `init` 任务标记为 `completed`（subject 更新为 `init — 已识别 PRD，{{mode}} 模式`），进入节点 2。

---

## 节点 2: transform — 源码分析与 PRD 结构化

**目标**：交叉分析蓝湖素材 + 源码 + 归档用例，产出结构化测试增强 PRD。

**⏳ Task**：将 `transform` 任务标记为 `in_progress`。

### 2.1 源码配置匹配

```bash
bun run .claude/scripts/repo-profile.ts match --text "{{prd_title_or_path}}"
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

> **注意**：这是“允许引用/同步”的确认，不等于允许写回配置。
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
bun run .claude/scripts/repo-profile.ts save --name "{{name}}" --repos '{{repos_json}}'
```

### 2.3 拉取源码

若用户选择“允许同步并引用以上仓库”，执行：

```bash
bun run .claude/scripts/repo-sync.ts sync-profile --name "{{profile_name}}"
```

若用户自行输入了仓库（非 profile）且允许同步，则逐个调用：

```bash
bun run .claude/scripts/repo-sync.ts --url {{repo_url}} --branch {{branch}}
```

将返回的 commit SHA 写入 PRD frontmatter。

### 2.4 PRD 结构化转换（AI 任务）

派发 `transform-agent`（model: sonnet），执行：

- 蓝湖素材解析
- 源码状态检测与分析（A/B 级）
- 历史用例检索
- 按 `references/prd-template.md` 模板填充
- 输出 `<clarify_envelope>`（含空载荷或待确认项）

### 2.5 结构化澄清中转（强制检查）

> **⚠️ transform subagent 必须输出 `<clarify_envelope>`（含空载荷或待确认项）。若缺失，主 agent 须要求 subagent 补充执行 6 维度自检。**

处理流程参见 `references/clarify-protocol.md`：

1. 检查 transform 输出中是否包含 `<clarify_envelope>`
   - **缺失** → 通过 SendMessage 要求 subagent 执行步骤 5 的 6 维度自检
   - **`status = "ready"` 且 `items = []`** → 正常进入下一节点
   - **`status = "invalid_input"`** → 停止 transform，要求修正输入
2. 将 `defaultable_unknown` 项按推荐默认整理到 `<confirmed_context>`，无需额外确认
3. 仅对 `blocking_unknown` 项逐个使用 AskUserQuestion，保留推荐答案与备选
4. 将用户答案与自动默认项合并为 `<confirmed_context>` 发回 transform subagent
5. subagent 合入确认结果，移除对应 🔴 标记
6. 若产生新的 `blocking_unknown` → 最多循环 3 轮；否则输出最终 PRD

### 2.6 更新状态

```bash
bun run .claude/scripts/state.ts update --prd-slug {{slug}} --project {{project}} --node transform --data '{{json}}'
```

数据结构：

```json
{
  "confidence": 0.85,
  "page_count": 14,
  "field_count": 42,
  "source_hit": "B",
  "clarify_count": 3
}
```

**✅ Task**：将 `transform` 任务标记为 `completed`（subject 更新为 `transform — 置信度 {{confidence}}，{{clarify_count}} 项待确认`）。

---

## 节点 3: enhance — PRD 增强

**目标**：图片识别、frontmatter 规范化、页面要点提取、需求澄清。

**⏳ Task**：将 `enhance` 任务标记为 `in_progress`。

> fetch 阶段已从 Axure 资源中提取独立元素图片（高清）+ 整页截图（全貌参考），
> 无需再做图片压缩。images/ 目录中 `N-uXXX.png` 为独立元素，`N-fullpage-*.png` 为整页截图。

### 3.1 Frontmatter 规范化

```bash
bun run .claude/scripts/prd-frontmatter.ts normalize --file {{prd_path}}
```

### 3.2 PRD 增强（AI 任务）

派发 `enhance-agent`（model: sonnet），对 PRD 执行：

- 图片语义化描述
- 页面要点提取
- 需求歧义标注
- 健康度预检

### 3.3 更新状态

```bash
bun run .claude/scripts/state.ts update --prd-slug {{slug}} --project {{project}} --node enhance --data '{{json}}'
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
bun run .claude/scripts/archive-gen.ts search --query "{{keywords}}" --dir workspace/{{project}}/archive --project {{project}}
```

> 注：`workspace/{{project}}/archive` 中的 `workspace` 对应 `.env` 中 `WORKSPACE_DIR` 的值（默认 `workspace`），`{{project}}` 为当前选中的项目名称。

### 4.2 测试点清单生成（AI 任务）

派发 `analyze-agent`（model: opus），结合增强后 PRD + 历史用例，生成结构化测试点清单。

--quick 模式下简化分析：跳过历史检索，直接从 PRD 提取测试点。

### 4.3 更新状态

```bash
bun run .claude/scripts/state.ts update --prd-slug {{slug}} --project {{project}} --node analyze --data '{{json}}'
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

为每个模块派发独立 `writer-agent`（model: sonnet），输入包含：

- 增强后 PRD 对应模块内容
- 该模块已确认的测试点清单
- preferences/ 目录下的偏好规则（若存在）
- 历史归档用例参考（来自 analyze 步骤）
- 已确认上下文（来自 `<confirmed_context>`）
- 源码上下文（来自 transform 步骤的源码分析结果，包括按钮名称、表单结构、字段定义、导航路径等 🔵 标注信息。若 transform 阶段完成了 B 级分析，须将关键 UI 结构摘要传给 Writer）

### 5.2 结构化阻断中转（强制检查）

> **⚠️ Writer subagent 在阻断时必须输出 `<blocked_envelope>`；若无阻断则直接输出 Contract A JSON。若主 agent 无法确认 subagent 已完成 5 维度自检，须要求其补充执行。**

- Writer 直接输出 Contract A JSON → 视为无阻断，正常继续
- Writer 输出 `<blocked_envelope status="needs_confirmation">` → 执行下文的 Writer 阻断中转协议
- Writer 输出 `<blocked_envelope status="invalid_input">` → 停止该模块并要求修正输入

**✅ Task**：每个 Writer Sub-Agent 完成时，将对应子任务标记为 `completed`（subject 更新为 `[write] {{模块名}} — {{n}} 条用例`）。所有 Writer 完成后，将 `write` 主任务标记为 `completed`（subject 更新为 `write — {{total}} 条用例，{{module_count}} 个模块`）。

### 5.3 更新状态

每个 Writer 完成后更新状态：

```bash
bun run .claude/scripts/state.ts update --prd-slug {{slug}} --project {{project}} --node write --data '{{json}}'
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
bun run .claude/scripts/state.ts update --prd-slug {{slug}} --project {{project}} --node review --data '{{json}}'
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

**⏳ Task**：将 `format-check` 任务标记为 `in_progress`。创建第 1 轮子任务（subject: `[format-check] 第 1 轮`，activeForm: `执行第 1 轮格式检查`）。

### 6.5.1 生成临时 Archive MD

```bash
bun run .claude/scripts/archive-gen.ts convert \
  --input {{review_json}} \
  --project {{project}} \
  --output workspace/{{project}}/archive/{{YYYYMM}}/tmp/{{name}}-format-check.md
```

### 6.5.2 格式合规检查（AI 任务）

派发 `format-checker-agent`（model: haiku）执行格式检查。

输入：

- 临时 Archive MD 文件内容
- 当前轮次信息：`第 {{round}} 轮 / 最大 {{max_rounds}} 轮`
- 上一轮偏差报告（第 2 轮起）

Format Checker 输出结构化 JSON 偏差报告。

### 6.5.3 行号定位

```bash
bun run .claude/scripts/format-report-locator.ts locate \
  --report {{format_checker_json}} \
  --archive workspace/{{project}}/archive/{{YYYYMM}}/tmp/{{name}}-format-check.md \
  --output workspace/{{project}}/archive/{{YYYYMM}}/tmp/{{name}}-format-enriched.json
```

可选：终端可读报告

```bash
bun run .claude/scripts/format-report-locator.ts print \
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
bun run .claude/scripts/state.ts update --prd-slug {{slug}} --project {{project}} --node format-check --data '{{json}}'
```

数据结构：

```json
{
  "format_check": {
    "current_round": 2,
    "max_rounds": 5,
    "issues_history": [8, 3],
    "verdict": "fail"
  }
}
```

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
bun run .claude/scripts/xmind-gen.ts --input {{final_json}} --project {{project}} --output workspace/{{project}}/xmind/{{YYYYMM}}/{{需求名称}}.xmind --mode create
```

### 7.2 生成 Archive MD

```bash
bun run .claude/scripts/archive-gen.ts convert --input {{final_json}} --project {{project}} --output workspace/{{project}}/archive/{{YYYYMM}}/{{需求名称}}.md
```

### 7.3 发送通知

```bash
bun run .claude/scripts/plugin-loader.ts notify --event case-generated --data '{{notify_data}}'
```

notify_data 必需字段：`count`、`file`、`duration`。

### 7.4 清理状态

```bash
bun run .claude/scripts/state.ts clean --prd-slug {{slug}} --project {{project}}
```

**✅ Task**：将 `output` 任务标记为 `completed`（subject 更新为 `output — {{n}} 条用例，XMind + Archive MD 已生成`）。

### 交付摘要（状态展示，无需确认）

用例生成完成后，直接展示产物摘要：

- XMind：`{{xmind_path}}`
- Archive：`{{archive_path}}`
- 共 `{{n}}` 条用例（P0: `{{p0}}`, P1: `{{p1}}`, P2: `{{p2}}`）
- 若用户后续提出编辑或重跑诉求，再路由到 `xmind-editor` 或模块重跑流程

---

## Writer 阻断中转协议

当 Writer Sub-Agent 返回 `<blocked_envelope>` 时，表示需求信息不足以继续编写，或输入无效。

### 处理流程

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

---

## 断点续传说明

- **状态文件位置**：与 PRD 同目录的 `.qa-state-{prd-slug}.json`
- **自动检测**：节点 1 的 `state.ts resume` 命令自动发现并恢复
- **节点更新**：每个节点完成时通过 `state.ts update` 写入进度
- **最终清理**：output 节点成功后执行 `state.ts clean` 删除状态文件
- **状态结构**：

```json
{
  "prd_slug": "xxx",
  "project": "{{project}}",
  "mode": "normal|quick",
  "current_node": "transform|enhance|analyze|write|review|format-check|output",
  "transform": { "confidence": 0, "clarify_count": 0 },
  "enhance": { "health_warnings": [], "image_count": 0 },
  "analyze": { "checklist": {} },
  "write": { "modules": {}, "blocked": [] },
  "review": { "issue_rate": 0, "fixed_count": 0 },
  "format_check": {
    "current_round": 0,
    "max_rounds": 5,
    "issues_history": [],
    "verdict": ""
  },
  "source_context": { "branch": "", "commit": "" }
}
```

---

## 异常处理

任意节点执行失败时：

1. 更新状态文件记录失败节点
2. 发送 `workflow-failed` 通知：

```bash
bun run .claude/scripts/plugin-loader.ts notify --event workflow-failed --data '{"step":"{{node}}","reason":"{{error_msg}}"}'
```

3. 向用户报告错误，提供重试选项
