# Skills 模板统一与 `prd-enhancer` 规范化设计

## 背景

当前仓库中的 skill 文档已经出现明显分层差异：

- `test-case-generator/SKILL.md` 已经具备“主文件薄、细节外置”的结构特征。
- `prd-enhancer/SKILL.md` 仍然承载了大量流程细则、输出模板、状态说明与示例，文件达到 526 行，维护成本最高。
- `using-qa-flow/SKILL.md` 与 `code-analysis-report/SKILL.md` 也开始接近“说明书化”，后续继续增长会加重查找和改动成本。
- 现有用户可见产物中仍存在 `AI图片描述`、`需求澄清结果（AI 生成）` 等直出痕迹，不符合“结果中性化”的目标。
- PRD / Archive frontmatter 的 `status` 当前采用英文值，但用户希望文档层面改为中文，同时保持运行态与编排态兼容。

本次设计的目标不是只修一处文案，而是统一 skill 模板、收敛 `prd-enhancer` 的职责边界，并在不破坏现有编排节点的前提下完成一次规范化升级。

## 外部参考结论

结合近期通行做法，当前更成熟的 agent/skill 模板一般有以下共性：

- 主文件只保留入口、约束、流程总表、引用索引，不承载大段细则。
- 复用规则、输出格式、长示例优先拆到 `references/`、`rules/`、`prompts/`。
- 步骤顺序必须围绕“前置条件 → 主流程 → 验收出口”设计，避免跨步骤依赖倒置。
- 面向用户的产物更强调中性、可审阅、可维护，而不是暴露“AI 正在做什么”。
- 模板应跨 skill 保持相同骨架，降低后续横向维护成本。

## 设计目标

1. 统一所有核心 skill 的主文件骨架与章节语义。
2. 将 `prd-enhancer` 重构为“主文件编排 + 引用文件承载细则”的结构。
3. 修正 `prd-enhancer` 中前置步骤顺序不规范的问题。
4. 将图片解析输出改为完全中性化表达，不再出现 `AI图片描述`。
5. 将文档 frontmatter 的 `status` 改为中文，并通过兼容映射避免影响运行态逻辑。
6. 在收尾阶段新增一条强制性的“集成自审 / 自验证”闸门，确保 `CLAUDE.md`、各 skill、prompts、references、scripts 之间的编排关系不被破坏。

## 非目标

- 不改动 `.qa-state.json`、Writer/Reviewer 执行日志等运行时状态枚举。
- 不借此次设计调整测试用例生成主流程的业务意图。
- 不引入新的工作流节点，只对现有节点的文档结构、命名、顺序和引用关系做规范化。

## 现状审计摘要

### Skill 主文件体量

| 文件 | 行数 | 结论 |
| --- | ---: | --- |
| `prd-enhancer/SKILL.md` | 526 | 必须拆分 |
| `using-qa-flow/SKILL.md` | 373 | 建议拆分 |
| `code-analysis-report/SKILL.md` | 284 | 中度拆分 |
| `xmind-converter/SKILL.md` | 193 | 小改即可 |
| `archive-converter/SKILL.md` | 182 | 小改即可 |
| `test-case-generator/SKILL.md` | 179 | 结构最佳，少量同步 |

### 当前最突出的问题

#### `prd-enhancer`

- 还未定位目标 PRD 文件，就要求先执行增量检测，依赖顺序倒置。
- `Step 0.3` 在 `Step 0.5` 之前执行，但独立澄清应建立在“已拿到可消费的正式 PRD”之上。
- `Step 6` 的格式说明与 `references/prd-template.md` 中的图片描述规范重复。
- 主文件中同时混有流程、模板、示例、输出格式、状态说明，维护时容易遗漏联动改动。

#### 跨 skill 关联

- `CLAUDE.md` 的 skill 索引、各 skill 的 description、`test-case-generator` 中的 step 引用，彼此存在联动。
- `test-case-generator` 的多个 prompts 直接依赖 `prd-enhancer` 的状态与阶段语义。
- `frontmatter status` 已被 schema、审计脚本、backfill 脚本、测试夹具和示例文档同时使用，不能只改文档不改校验链路。

## 统一模板设计

所有核心 skill 的 `SKILL.md` 统一收敛为以下骨架：

1. 用途与触发词
2. 使用口径速查
3. 输入 / 输出契约
4. Canonical 步骤总表
5. 模式 / 分支规则
6. 执行约束
7. 完成定义
8. 引用索引

设计原则如下：

- 主文件只保留“做什么、何时做、做到什么算完成”。
- 长步骤说明外置到 `references/`。
- 约束类内容外置到 `rules/`。
- 需要被子 agent 或其他 skill 直接消费的长文本保留在 `prompts/`。
- 示例优先放在 `references/`，避免主文件被示例淹没。

## 各 Skill 调整策略

### `prd-enhancer`

主文件瘦身为编排入口，以下内容拆出：

- 前置检查链路：`references/preflight-flow.md`
- 页面信息提炼格式：`references/page-insight-format.md`
- 中文状态映射：`references/frontmatter-status-map.md`
- 增强输出模板：保留在 `references/prd-template.md`，但移除重复的图片描述格式细节

### `using-qa-flow`

保留菜单入口、路由逻辑、初始化总览；将大段问答细则外置：

- `references/init-wizard-flow.md`
- `references/config-questionnaire.md`

### `code-analysis-report`

保留模式识别、执行入口与报告产出路径；将模式细节和报告结构外置：

- 后端 bug 分析格式
- 前端报错分析格式
- 冲突分析格式
- 报告模板 / Schema

### `test-case-generator`

保持现有主文件骨架，只同步以下口径：

- 对 PRD frontmatter 状态的说明改为中文值
- 对 `prd-enhancer` 阶段名称与产出措辞的引用同步更新
- 不改动 `.qa-state.json` 与 writer/reviewer 运行态定义

### `archive-converter` / `xmind-converter`

保持轻量主文件结构，只做统一模板对齐：

- 增补输入 / 输出契约段
- 统一完成定义与引用索引写法
- `archive-converter` 同步中文 `status` 文档口径

## `prd-enhancer` 流程重排设计

### 现有问题

当前的 `Step 0`、`Step 0.3`、`Step 0.5` 同时承担来源判断、正式化门禁、文件定位、增量检测、独立澄清等职责，顺序不清晰，且使用小数步骤编号不利于维护。

### 新的前置链路

取消当前“0 / 0.3 / 0.5”的表达方式，统一改为“前置检查链路 + 主流程整数步骤”。

推荐顺序如下：

1. 来源识别
2. 正式化门禁
3. 定位目标 PRD
4. 增量检测
5. 独立调用需求澄清
6. 扫描图片引用
7. 定位图片文件
8. 压缩超大图片
9. 逐张读取图片
10. 提炼页面关键信息
11. 图片重命名与引用标准化
12. 输出增强版 PRD
13. PRD 健康度预检
14. 向用户展示增强摘要

### 顺序调整原因

- “正式化门禁”必须早于“需求澄清”，否则会在原始平台文本上直接做澄清。
- “定位目标 PRD”必须早于“增量检测”，否则无法判断同目录内已有增强版文件。
- “增量检测”必须早于“图片处理主流程”，否则无法复用已有增强结果。

## `Step 6` 中性化设计

### 命名调整

- 旧名称：`生成结构化描述`
- 新名称：`提炼页面关键信息`

### 用户可见输出格式

不再使用 `> **[AI图片描述]**` 块，而改为完全中性的页面要点块：

```markdown
#### 图N 页面要点

- 页面类型：
- 区域构成：
- 关键操作：
- 列表信息：
- 检索条件：
- 输入项：
- 流程/状态：
- 识别限制：
```

### 设计理由

- “页面要点”是结果导向而非生成导向，更适合被 QA、产品、研发共同阅读。
- 使用列表结构替代 blockquote，可读性更高，也更便于后续脚本和 reviewer 处理。
- `识别限制` 明确承载“不确定”信息，避免为了完整度而过度推断。

### 一致性规则

所有用户可见文档中，原则上不再出现直接暴露生成痕迹的 `AI` 前缀，包括但不限于：

- `AI图片描述`
- `需求澄清结果（AI 生成）`

对应改法：

- `需求澄清结果（AI 生成）` → `需求澄清结果`
- 图片说明块统一迁移为“图N 页面要点”

## Frontmatter 中文状态设计

### PRD 状态映射

| 文档状态（写入 frontmatter） | 内部语义 |
| --- | --- |
| `未开始` | `raw` |
| `已澄清` | `elicited` |
| `已形式化` | `formalized` |
| `已增强` | `enhanced` |

### Archive 状态映射

| 文档状态（写入 frontmatter） | 内部语义 |
| --- | --- |
| `草稿` | `draft` |
| `已评审` | `reviewed` |
| `已归档` | `archived` |

### 兼容策略

- 文档层写入中文值。
- 运行态与脚本内部仍使用英文 canonical 枚举。
- 所有读取 frontmatter 的脚本先执行 normalize：
  - 读到中文，映射到英文内部值。
  - 读到旧英文，也视为合法输入。
- 所有写回 frontmatter 的脚本统一写中文，形成“读双语、写中文”的迁移策略。

### 保持不变的范围

以下状态不在本轮中文化范围内：

- `.qa-state.json` 中的状态字段
- execution log 中的 `completed` / `skipped` / `failed`
- writer / reviewer / brainstorm 等运行态枚举

## 必须同步的文件范围

### 直接改动的 Skill 主文件

- `prd-enhancer/SKILL.md`
- `using-qa-flow/SKILL.md`
- `code-analysis-report/SKILL.md`
- `archive-converter/SKILL.md`
- `xmind-converter/SKILL.md`
- `test-case-generator/SKILL.md`

### 必须同步的非 Skill 文件

- `.claude/shared/schemas/front-matter-schema.md`
- `.claude/shared/scripts/audit-md-frontmatter.mjs`
- `.claude/shared/scripts/build-archive-index.mjs`
- `.claude/skills/prd-enhancer/references/prd-template.md`
- `.claude/skills/prd-enhancer/prompts/prd-formalizer.md`
- `.claude/skills/prd-enhancer/scripts/backfill-prd-frontmatter.mjs`
- `.claude/skills/archive-converter/rules/archive-format.md`
- `.claude/skills/archive-converter/scripts/backfill-archive-frontmatter.mjs`
- `.claude/skills/archive-converter/scripts/json-to-archive-md.mjs`
- `.claude/skills/test-case-generator/prompts/step-parse-input.md`
- `.claude/skills/test-case-generator/prompts/step-req-elicit.md`
- `.claude/skills/test-case-generator/prompts/step-prd-enhancer.md`
- `.claude/tests/test-md-frontmatter-audit.mjs`
- `.claude/tests/test-md-content-source-resolver.mjs`
- `.claude/tests/test-md-semantic-enrichment.mjs`

### 建议一并迁移的示例 / 产物

- `cases/requirements/custom/xyzh/*.md` 中现存的旧版图片说明块

不迁移这些示例会造成仓库内长期并存两套格式，影响后续 agents 的检索与模仿。

## 集成自审 / 自验证 Gate

所有改动完成后，必须执行一次收尾前的集成审查。该任务不是可选项，而是最终关闭任务前的强制 gate。

### 审查对象

- `CLAUDE.md`
- 各 `SKILL.md`
- `prompts/`
- `references/`
- `rules/`
- `scripts/`

### 必查维度

1. 触发词是否仍与 `CLAUDE.md` 的 skill 索引一致
2. step ID、步骤顺序、阶段命名是否仍与 orchestrator 文档一致
3. 相对路径引用是否全部有效
4. `test-case-generator → prd-enhancer → xmind/archive` 的阶段关系是否保持不变
5. `/using-qa-flow` 菜单与 skill 索引是否仍对应真实能力
6. 用户主验收入口是否仍然唯一且明确

### 结果要求

- 文案统一
- 路径可达
- 编排节点不变形
- 不新增隐式依赖

## 验证方案

### 脚本与测试

1. 运行 frontmatter 审计脚本：

```bash
node .claude/shared/scripts/audit-md-frontmatter.mjs --dry-run
```

2. 运行受影响的现有测试：

```bash
node .claude/tests/test-md-frontmatter-audit.mjs
node .claude/tests/test-md-content-source-resolver.mjs
node .claude/tests/test-md-semantic-enrichment.mjs
```

3. 完成改动后做 grep 校验：

```bash
rg "AI图片描述|需求澄清结果（AI 生成）" .claude cases/requirements
```

### 手工校验

- 人工确认 `CLAUDE.md` 中的 Skill 索引未失真
- 人工确认 `prd-enhancer` 的新步骤总表与 `test-case-generator` 的调用关系一致
- 人工确认 `frontmatter.status` 新旧输入均可被识别

## 推荐实施顺序

1. 先完成统一模板和 `prd-enhancer` 的结构重排
2. 再处理中性化文案与页面要点格式
3. 再接入 frontmatter 中文状态兼容层
4. 再同步其它 skill、prompts、rules、references
5. 最后执行集成自审与验证

## 结论

本次改造应视为一次“模板统一 + 编排去耦 + 文档语义规范化”的联动调整，而不是单点文案修复。只有把主文件瘦身、步骤顺序理顺、文档状态中文化兼容、以及跨 skill 引用关系一起处理，才能在不破坏整体 agent 工作流的前提下，真正降低后续维护成本。
