# Session 4: 多 Agent 协同优化 (T05 + T06 + T07)

> 分支: `feat/qa-workflow-optimize`
> 前置: Session 1, 2, 3 已完成

## 目标

1. Writer prompt 拆分为 core + reference，减少 context 占用。
2. Reviewer 新增预扫描快速通道 + 大需求拆分策略。
3. --quick 模式增强：小需求单 Writer、Reviewer 降级。

## 涉及文件

| 文件 | 改动类型 | 对应 Task |
|------|---------|-----------|
| `.claude/skills/test-case-generator/prompts/writer-subagent.md` | 精简为 core | T05 |
| `.claude/skills/test-case-generator/prompts/writer-subagent-reference.md` | **新建** | T05 |
| `.claude/skills/test-case-generator/prompts/reviewer-subagent.md` | 新增预扫描 | T06 |
| `.claude/skills/test-case-generator/SKILL.md` | Reviewer 拆分 + 快速模式增强 | T06 + T07 |

## 详细改动

### T05: Writer Prompt 拆分

#### writer-subagent.md — 精简为 core（目标 ~100 行）

保留以下内容：
- Agent metadata HTML comment（subagent_type, model, maxTurns）
- `## 提示词模板` 开头
- `## 你的任务范围`（占位符不变）
- `## PRD 相关章节`（占位符不变）
- `## 历史用例参考`（占位符不变）
- `## 源码仓库`（占位符不变，但删除 "源码分析要求" 的 5 条详细规则，改为一行引用）
- `## 核心编写规则`：
  - `### 输出格式` — JSON Schema 保留，但**删除** meta 字段的详细注释（留 2 行关键字段说明即可）
  - `### 步骤格式` — 保留 4 条核心规则（第一步格式、禁止编号前缀、具体数据、步骤=预期数量）
  - `### 范围限制` — 保留 4 条
  - `### 用例设计原则` — 保留 3 条（正常/异常/边界）
  - `### 优先级标准` — 保留 3 条
  - **删除**: 步骤格式正反例表格、预期结果正反例表格、数据禁止词清单、Tags 推断规则、PRD 矛盾处理、依赖用例处理
- `## 自评审清单` — 保留全部 13 项
- `## 输出要求` — 保留

删除的内容移入 reference 文件。

在 `## 源码仓库` 段落中原来的 `**源码分析要求**` 位置替换为：

```markdown
**源码分析要求**：详见 `writer-subagent-reference.md`「源码分析」章节。无 reference 时按以下简要规则：
1. Grep 搜索 Controller 中的接口路径，验证按钮/操作对应实际接口
2. 读取 DTO 校验注解，用于异常/边界用例设计
```

#### writer-subagent-reference.md — 新建

```markdown
# Writer Subagent 参考手册

本文件包含 Writer 的扩展参考规则。编排器根据需求复杂度决定是否加载本文件。

---

## 步骤格式正反例

| 错误写法 | 正确写法 |
|----------|---------|
| 步骤1: 进入列表页 | 进入【质量问题台账-列表页】页面 |
| 尝试提交表单 | 点击【提交】按钮 |
| 输入像"测试"这样的内容 | 在「问题名称」输入框输入"2026年3月产线温度异常" |
| 选择如"已完成"等状态 | 在「处理状态」下拉框选择"已完成" |
| 填写相关信息 | 在「问题名称」输入"原料批次不合格"，在「问题分类」选择"质量缺陷" |

## 预期结果正反例

| 错误写法 | 正确写法 |
|----------|---------|
| 操作成功 | 页面提示"新增成功"，列表页新增一条记录 |
| 显示正确 | 列表第一行显示：行动编号"QA-2026-001"，状态"待处理" |
| 提交失败 | 「问题名称」下方显示红色提示"请输入问题名称" |

## 数据禁止词

步骤和预期结果中禁止出现以下模糊词汇：
「尝试」「像」「如」「比如」「等」「相关」「合适」「某个」「一些」「适当」

## Tags 推断规则

在 `meta.tags` 中填入 3-8 个领域关键词：
- **纳入**：产品/功能域名词（如 数据质量、规则集、调度任务）
- **纳入**：业务实体名词（如 数据源、数据表、字段、规则集）
- **纳入**：客户/项目标识（如 岚图、信永中和）
- **排除**：页面级通用词（列表页、新增、编辑、删除、详情、查询、搜索）

`meta.module_key` 填入当前模块的英文 key（如 `data-assets`、`xyzh`）。

## PRD 矛盾与不确定性处理

- 前后矛盾（如字段描述与原型图不一致）→ 在 `precondition` 末尾标注 `[待核实：PRD 中 xxx 与 xxx 描述不一致]`
- 信息不足 → 跳过该功能点并在输出摘要中注明
- 禁止自行推测 PRD 未提及的功能行为

## 依赖用例处理

- 依赖另一条用例的前置状态 → 在 `precondition` 中明确引用：如 `已成功新增一条质量问题台账记录`
- 不要假设其他 Writer 的用例已存在，每条用例的前置条件必须自包含

## 源码分析（详细版）

有源码时必须执行以下 5 项：

1. **接口与字段名验证**：Grep 搜索 Controller 中的接口路径和方法名，确认 PRD 中的按钮/操作对应实际接口
2. **DTO/VO 字段名提取**：找到请求/响应 DTO 类，提取字段名及其注解（`@NotNull`、`@Length`、`@Pattern` 等），确保步骤中使用的字段名与实际一致
3. **校验规则提取**：从 DTO 校验注解和 Service 层校验逻辑中提取异常边界条件（如最大长度、必填规则、枚举范围）
4. **业务逻辑分支**：阅读 Service 层核心方法，识别 if/else 分支和异常抛出点
5. **联动关系识别**：检查 Service 层的跨模块调用（如新增后触发审批流程）

## DTStack 额外要求

当 source_context 不为空时必须执行：
- 先确认 `.repos/` 中对应仓库已切到 source_context 指定分支
- 前置条件尽量补充数据源类型、schema/table、关键字段与准备数据说明
- 复杂表单步骤优先使用多行结构化块，不得写成模糊长句
```

### T06: Reviewer 分层策略

#### reviewer-subagent.md — 新增预扫描快速通道

在 `## 质量阈值判断（必须在修正前先做）` **之前**插入：

```markdown
## 预扫描快速通道（在完整修正之前执行）

1. 快速遍历所有用例，仅检查以下可机械判断的问题：
   - F01: 标题不以「验证」开头
   - F03: steps 数组长度 ≠ expected 数量
   - F08: 步骤包含编号前缀（正则: `^步骤\d+[:：]` 或 `^Step\d+[:：]`）

2. 计算初始问题率（仅含 F01/F03/F08）

3. 根据初始问题率决定修正深度：

| 初始问题率 | 修正策略 | 说明 |
|-----------|---------|------|
| < 5% | **1 轮快速修正** | 直接执行任务 1-4 一次，输出最终 JSON |
| 5% - 25% | **2 轮修正** | 第 1 轮执行任务 1-4，第 2 轮验证修正结果，输出 JSON |
| > 25% | **3 轮完整修正** | 现有逻辑不变 |

此策略在保证质量的前提下，减少小问题率场景的处理时间。
```

#### SKILL.md — Reviewer 拆分 + 快速模式

在「执行协议」第 7 条中扩展：

```markdown
7. **Reviewer 步骤**：
   - 总用例数 ≤ 80 条 → 单个 `case-reviewer` Agent（现有逻辑）
   - 总用例数 > 80 条 → 拆分为 2 个并行 `case-reviewer` Agent：
     a. Reviewer-A：负责前 ⌈N/2⌉ 个 Writer 的输出 JSON
     b. Reviewer-B：负责后 ⌊N/2⌋ 个 Writer 的输出 JSON
     c. 两个 Reviewer 各自独立执行修正流程
     d. 编排器合并两份 final JSON（按 module name 合并 pages）
     e. 编排器做一次轻量去重扫描（跨 Reviewer 的同名用例标题）
   - 任一 Reviewer 问题率 > 40% → 整体阻断，`reviewer_status: "escalated"`
```

### T07: --quick 模式增强

在 SKILL.md 的「运行模式」部分，将现有表格替换为：

```markdown
## 运行模式

| 模式 | 触发方式 | 跳过步骤 | 额外优化 |
|------|----------|----------|----------|
| 普通模式（默认） | `为 Story-xxx 生成测试用例` | — | — |
| 快速模式 | `--quick` 或「快速生成」 | brainstorm, checklist | 见下方 |
| 续传模式 | 重发原命令或 `继续 Story-xxx` | 自动从断点继续 | — |
| 模块级重跑 | `重新生成 xxx 的「列表页」模块用例` | 仅重跑指定 Writer | — |

### 快速模式额外优化

| 优化项 | 条件 | 说明 |
|--------|------|------|
| Writer 合并 | 预估总用例数 ≤ 30 条 | 使用单个 Writer，不拆分模块 |
| Reviewer 降级 | 所有场景 | 仅执行 1 轮修正，问题率阻断阈值放宽到 50% |
| formalize 简化 | 非 DTStack 模块 | 跳过 prd-formalize 步骤，直接 raw → enhance |
| Writer reference 不加载 | 所有场景 | 不加载 writer-subagent-reference.md |
```

同时在 SKILL.md 的「参考文件」章节新增：
```markdown
- `prompts/writer-subagent-reference.md` — Writer Subagent 扩展参考（按需加载）
```

## 完成标准

- [ ] writer-subagent.md 行数 ≤ 120 行（精简后）
- [ ] writer-subagent-reference.md 已创建，包含：正反例、禁止词、Tags 规则、PRD 矛盾处理、依赖处理、源码分析详细版、DTStack 额外要求
- [ ] writer-subagent.md 中源码分析部分改为引用 reference 并保留简要版
- [ ] reviewer-subagent.md 包含「预扫描快速通道」段落（3 级修正深度）
- [ ] SKILL.md 第 7 条包含 Reviewer 拆分策略（>80 条用例）
- [ ] SKILL.md 运行模式表新增「额外优化」列
- [ ] SKILL.md 快速模式包含 4 项优化（Writer 合并、Reviewer 降级、formalize 简化、reference 不加载）
- [ ] SKILL.md 参考文件章节包含 writer-subagent-reference.md

## Commit

```
git add -A && git commit -m "feat: slim Writer prompt, add Reviewer pre-scan and enhance quick mode (T05+T06+T07)"
```
