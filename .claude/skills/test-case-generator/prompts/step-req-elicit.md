<!-- step-id: req-elicit | delegate: testCaseOrchestrator -->
# Step req-elicit：需求澄清

> 前置条件: `last_completed_step` == `"parse-input"`
> 快速模式: **简化执行**（最多 3 个问题，仅 Tier 1 维度，1 轮 Q&A）
> DTStack 专属: 否

本步骤在进入流水线执行之前，先评估需求的可测试性，识别关键缺失信息，通过 3-7 个有针对性的问题补全，最终将澄清结果追加到 raw PRD 中。

**执行前必须阅读 `references/elicitation-dimensions.md`（维度定义、评分规则、问题模板）。**

---

## Phase 1: 可测试性评估（自动，无需等待用户）

读取工作目录下所有 raw PRD 文件内容，按 `elicitation-dimensions.md` 中定义的 10 个维度评分：

1. 对每个维度，根据评分规则计算 0-100% 的得分
2. 可选维度（`time_limits`、`tech_constraints`）：检测 PRD 中是否含对应关键词，有则启用，否则标记 `N/A`
3. 计算加权平均分（字段定义 3x、页面清单 2x、验收标准 2x，其余 1x）

**根据评分决定下一步行为：**

| 评分 | 行为 |
|------|------|
| 普通模式 >= 90% | 跳过澄清，直接完成此步骤（输出跳过原因） |
| 快速模式 >= 70% | 跳过澄清，直接完成此步骤 |
| 普通模式 < 40% | 进入 Phase 2，但先输出「目标/已知/缺失/建议」摘要 |
| 其他 | 进入 Phase 2 |

**跳过时的输出：**

```
需求可测试性评分 {score}%，信息充分，跳过需求澄清步骤。

维度得分概览：字段定义 {fd}% | 页面清单 {pi}% | 验收标准 {io}% | 其他均 >= 80%
```

---

## Phase 2: 源码预扫描（DTStack only，轻量）

**触发条件**: 模块类型为 DTStack，且 `.repos/` 目录下存在已 checkout 的仓库（即使分支可能不是最新的）。

**目的**: 减少需要用户回答的问题数量（源码能回答的，不问用户）。

执行以下轻量扫描（仅用于减少问题，结果标记为 advisory，非权威）：

```bash
# 1. 推断目标分支
cat config/repo-branch-mapping.yaml  # 结合 PRD 中的 dev_version 推断

# 2. 查找 DTO/VO 类（按 PRD 中的功能名/模块名关键词）
grep -r "class.*{keyword}.*DTO\|class.*{keyword}.*VO\|class.*{keyword}.*Param" \
  .repos/DTStack/dt-center-assets/src --include="*.java" -l | head -5

# 3. 提取字段和注解
grep -r "@NotNull\|@NotBlank\|@Length\|@Size\|@Min\|@Max\|@Pattern" \
  .repos/DTStack/dt-center-assets/src/{found_dto_path} | head -30

# 4. 查找枚举定义
grep -r "enum.*{keyword}" .repos/DTStack/dt-center-assets/src --include="*.java" -l | head -5

# 5. 前端字段标签（如 frontend 仓库存在）
grep -r "label.*[\u4e00-\u9fa5]\|FormItem\|Form.Item" \
  .repos/DTStack/dt-insight-studio-front/src -r --include="*.tsx" -l | head -5
```

将找到的信息整理为「已自动推断」列表，供 Phase 3 使用。

**非 DTStack 模块（如 xyzh）**: 跳过此 Phase，所有字段级问题均需询问用户。

---

## Phase 3: 问题生成与展示

### 3.1 整理已知信息

收集以下来源的已知信息：
- Phase 1 评估结果（哪些维度得分充足）
- Phase 2 源码预扫描结果（哪些字段信息可自动推断）
- PRD frontmatter（已填写的 `dev_version`、`product` 等字段）

### 3.2 生成问题

**过滤规则**:
- 得分 >= 80% 的维度：不提问
- 源码已明确推断的信息：归入「已自动推断」区，不提问
- 剩余不足的维度：按 `elicitation-dimensions.md` 权重排序，生成问题

**问题数量控制**:
- 普通模式: 3-7 个（不超过 7 个，合并同维度问题为一组）
- 快速模式: 1-3 个（仅 Tier 1：`field_definition`、`page_inventory`、`io_criteria`）
- 若所有高权重维度都充足，可以提出 0 个问题（但评分应已触发跳过）

### 3.3 展示格式

每个推断项和问题都以 **A/B/C 选项卡** 呈现，AI 推荐选项标注 `← 推荐`；最后一项固定为「自定义输入」。

````
需求可测试性评分：{score}%（字段定义 {fd}%↓ | 页面清单 {pi}% | 验收标准 {io}%↓ | ...）

以下 {N} 个问题将显著提升测试用例质量（预计 {T} 分钟）：

━━━ 已自动推断（请确认）━━━

【推断 1】目标分支
  检测到 dev_version「{dev_version}」→ 计划切换至 `{branch_name}`，仓库: {repo_name}

  A  ✓ 确认正确                                   ← 推荐
  B    分支有误，我来指定

【推断 2】「{field_name}」为必填字段
  源码 `{DtoClass}.{field}` 标注 `@NotNull`，枚举值: [{enum_values}]

  A  ✓ 确认正确                                   ← 推荐
  B    枚举值有出入，我来补充
  C    该字段非必填

━━━ 需要您补充的信息 ━━━

【Q1】字段定义 ★★★  {question_text}

  A  {option_a}                                   ← 推荐（{inference_basis}）
  B  {option_b}
  C  跳过，AI 自动推断
  D  自定义输入...

【Q2】验收标准 ★★  {question_text}

  A  {option_a}                                   ← 推荐（{inference_basis}）
  B  {option_b}
  C  {option_c}
  D  跳过，AI 自动推断
  E  自定义输入...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
回复示例：  推断1: A  推断2: B  Q1: A  Q2: C
快捷选项：  全部推荐  （接受所有「← 推荐」选项）
跳过全部：  直接开始  （跳过澄清，继续流程）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
````

**选项生成规则**：

| 选项位置 | 内容 |
|---------|------|
| 第一项（A） | AI 最优推断结果，标注 `← 推荐` 和推断来源（源码推断/PRD原文/常见模式） |
| 中间项（B/C/...） | 次优选项或常见替代值（来自同类需求、领域经验） |
| 倒数第二项 | 「跳过，AI 自动推断」（始终存在，字母按序递增） |
| 最后一项 | 「自定义输入...」（始终存在，字母按序递增） |

**星级标注**（紧跟维度名）：
- `★★★` = 字段定义（weight 3x，最高优先级）
- `★★` = 页面清单 / 验收标准（weight 2x）
- `★` = 其他维度

**选项数量控制**：
- 字段枚举类问题：A + 2-3 个替代值 + 跳过 + 自定义（共 5-6 个）
- 是/否/描述类问题：A + 1-2 个替代 + 跳过 + 自定义（共 4-5 个）
- 「已自动推断」区：A（确认）+ B（纠正）[+ C（其他否定分支）]

**注意**:
- 「已自动推断」区必须列出，让用户有机会纠正错误推断
- 如果没有源码推断结果，省略「已自动推断」区
- 模糊需求（< 40%）先输出摘要再展示问题（见 Phase 4）

---

## Phase 4: 模糊需求处理

当评分 < 40% 时，在展示问题前先输出结构化摘要：

```
## 需求理解摘要

**根据您提供的内容，我的理解是：**
{一段话描述理解的功能目标}

### 已知条件
- {从 PRD 确认的事实，逐条}

### 关键缺失信息（按影响程度排序）
| 优先级 | 缺失项 | 对用例质量的影响 |
|--------|--------|----------------|
| 高 | {item} | {impact} |
| 中 | {item} | {impact} |

### 建议
1. {最重要的补充建议}
2. {次要建议}

---

```

（紧接着展示 Phase 3 的问题）

---

## Phase 5: 答案收集与迭代

### 5.1 用户回复解析规则

**字母选项响应（主流程）：**

| 用户输入格式 | 解析规则 |
|------------|---------|
| `Q1: A` / `Q1:A` / `Q1 A` | Q1 选择 A 选项，记录为 `confirmed` |
| `推断1: A  Q1: B  Q2: A` | 批量选择，逐条记录 |
| `全部推荐` | 所有问题和推断项均选择「← 推荐」选项（A），记录为 `confirmed` |
| `Q2: E 自定义输入 ...` / `Q2: E` 后接换行内容 | E（或末位字母）= 自定义，记录用户实际输入内容，标记 `user_custom` |
| 「直接开始」/ 「不用澄清」/ `skip all` | 跳过全部，记录 `bypassed`，进入 Phase 6，输出警告 |
| 部分回复（仅覆盖部分问题） | 已回复的记录 `confirmed`，未覆盖的标记 `inferred`（使用 A 选项内容） |

**当用户选择「自定义输入」选项时：**

```
请输入 Q{n} 的自定义答案（直接输入内容即可）：
```

等待用户输入后记录，然后继续处理其他未答问题。

**「已自动推断」区的 B 纠正选项：**

当用户选择 B（分支有误 / 枚举值有出入）时，追加一个定向问题：

```
【追问】请提供正确的 {推断项内容}（例如：release/6.4.10 → feature/xxx）：
```

记录用户输入，更新对应推断项为 `user_corrected`。

### 5.2 二轮追问（仅限必要时）

若用户回答中暴露了新的关键缺口（如 Q1 回答显示字段数量远多于 PRD），
允许追加 **最多 2 个跟进问题**，同样使用 A/B/C 选项格式，
追加后进入第 2 轮 Q&A（全流程最多 2 轮）。

### 5.3 跳过警告

当用户选择「直接开始」时展示：

```
⚠️ 已跳过需求澄清。当前可测试性评分 {score}%，以下维度信息不足可能导致：
- 字段定义不完整 → 表单测试用例无法覆盖所有输入场景
- 验收标准缺失 → 异常场景测试用例可能不准确

将继续生成测试用例，建议后续人工核查相关用例。
```

---

## Phase 6: 输出澄清结果

将澄清结果追加到 raw PRD 文件末尾（**不修改 PRD 原有内容，仅追加新章节**）：

```markdown

---

## 需求澄清结果（AI 生成，基于用户回答和源码分析）

<!-- elicitation-status: completed | round: {N} | questions: {asked}/{answered} | auto-inferred: {count} -->

### 目标与背景

- **业务目标**: {用户确认/推断的目标描述}
- **目标用户**: {标品/岚图定制/信永中和/等}
- **目标分支**: {branch_name}（来源: {PRD字段/用户确认/AI推断}）

### 使用场景与前置条件

- **数据源类型**: {Doris 3.x / Hive 2.x / SparkThrift 2.x / 无数据库依赖}
- **测试数据准备**: {具体说明，或「无特殊要求」}
- **其他前置条件**: {如需先创建规则集、数据源连接等}

### 字段定义补充

| 字段名 | DTO字段名 | 类型 | 是否必填 | 校验规则 | 枚举值 | 来源 |
|--------|----------|------|---------|---------|--------|------|
| {字段名} | {dtoField} | {类型} | {是/否} | {规则} | {值列表} | {PRD原文/源码推断/用户确认} |

> 注：「来源」列说明信息可信度：「用户确认」> 「源码推断」> 「AI推断」

### 验收标准

| 场景类型 | 场景描述 | 预期结果 | 来源 |
|---------|---------|---------|------|
| 正常 | {操作描述} | {具体预期} | {用户确认/推断} |
| 异常 | {错误场景} | {错误提示/行为} | {用户确认/推断} |
| 边界 | {边界条件} | {预期行为} | {用户确认/推断} |

### 风险与边界

- {识别到的风险或边界条件，逐条列出}

### 可测试性评分

- **澄清前**: {score_before}%
- **澄清后**: {score_after}%（提升 {delta}%）
- **仍待确认**: {remaining_gaps，或「无」}
```

**更新 PRD frontmatter**：将 `status` 从 `raw` 更新为 `elicited`。

---

## 错误处理

- **PRD 文件不存在或无法读取**: 提示用户检查文件路径，不继续
- **多个 PRD 文件**: 合并分析所有 PRD，生成统一的澄清问题（而不是分别澄清）
- **源码预扫描失败（grep 报错/仓库不存在）**: 跳过 Phase 2，不提示用户，继续生成问题
- **PRD 已有 `status: elicited` 或 `status: enhanced`**: 跳过澄清步骤，说明「需求已澄清，直接继续」

---

## 步骤完成后

更新 `.qa-state.json`：

```json
{
  "last_completed_step": "req-elicit",
  "elicitation": {
    "status": "completed",
    "testability_score_before": 62,
    "testability_score_after": 88,
    "questions_asked": 5,
    "questions_answered": 5,
    "auto_inferred_count": 3,
    "dimension_scores": {
      "goal": 100,
      "target_user": 100,
      "usage_scenario": 80,
      "page_inventory": 90,
      "field_definition": 75,
      "io_criteria": 85,
      "business_rules": 70,
      "time_limits": null,
      "tech_constraints": null,
      "risks_boundaries": 60
    },
    "target_branch_override": null
  }
}
```

字段说明：
- `status`: `completed`（正常完成）/ `skipped`（评分达到阈值自动跳过）/ `bypassed`（用户选择「直接开始」）
- `target_branch_override`: 若用户确认了与 `dev_version` 不同的目标分支，写入此字段；`source-sync` 步骤优先使用此值

向 `execution_log` 追加：

```json
{
  "step": "req-elicit",
  "status": "completed",
  "at": "<ISO8601>",
  "duration_ms": null,
  "summary": "需求澄清完成，可测试性评分 62%→88%，提问 5 个，回答 5 个，自动推断 3 项"
}
```
