---
name: test-case-gen
description:
  "QA 测试用例生成与标准化归档。将 PRD 需求文档转化为结构化 XMind + Markdown 测试用例。
  7 节点工作流：init → transform → enhance → analyze → write → review → output。
  触发词：生成测试用例、生成用例、写用例、为 <需求名称> 生成用例、test case、
  重新生成 xxx 模块、追加用例。支持 --quick 快速模式和蓝湖 URL 输入。
  也支持标准化归档：当用户提供 .xmind 或 .csv 文件时，触发归档标准化流程。
  触发词：标准化归档、归档用例、转化用例、标准化 xmind、标准化 csv。"
argument-hint: "[PRD 路径或蓝湖 URL 或 XMind/CSV 文件] [--quick]"
---

<!-- 前置加载 -->

执行前读取 `preferences/` 目录下所有 `.md` 文件（如存在）。
偏好优先级：用户当前指令 > preferences/ 规则 > 本 skill 内置规则（references/）。
读取项目配置：执行 `npx tsx .claude/scripts/config.ts`（从 `.env` 读取模块、仓库、路径配置）。
全程遵守 `.claude/rules/test-case-writing.md` 用例编写规范。

---

## 运行模式

| 模式       | 触发条件                               | 行为差异                                          |
| ---------- | -------------------------------------- | ------------------------------------------------- |
| 普通       | 默认                                   | 全 7 节点 + 全部交互点                            |
| 快速       | `--quick`                              | 跳过交互点 B/C，analyze 简化，review 仅 1 轮      |
| 续传       | 自动检测 `.temp/.qa-state-*.json` 存在 | 从断点节点继续                                    |
| 模块重跑   | `重新生成 xxx 的「yyy」模块`           | 仅执行 write → review → output（replace 模式）    |
| 标准化归档 | 用户提供 `.xmind` 或 `.csv` 文件       | 走独立流程：parse → standardize → review → output |

---

## 标准化归档流程（XMind / CSV 输入）

> 当用户提供的输入是 `.xmind` 或 `.csv` 文件（而非 PRD）时，进入此流程。
> 此流程**不走** 7 节点工作流，而是走独立的 4 步标准化流程。

### 触发条件

用户输入文件扩展名为 `.xmind` 或 `.csv`，或包含触发词：标准化归档、归档用例、转化用例。

### 步骤 S1: 解析源文件

```bash
npx tsx .claude/scripts/history-convert.ts --path {{input_file}} --detect
```

展示解析结果：

```
已解析源文件：{{input_file}}
文件类型：{{xmind | csv}}
用例数量：{{count}} 条
模块分布：{{module_list}}

选项：
1. ✓ 标准化归档（AI 按规则重写用例，推荐）
2. 仅格式转换（保留原始内容，直接转为 Archive MD）
3. 查看原始用例内容
```

> **选项 1（标准化归档）**：AI 读取原始用例内容，按 `test-case-rules.md` 全部规则重写步骤、预期、前置条件，确保达到自动化可执行精度。原始 XMind/CSV 内容**不直接放入**产物中。
> **选项 2（仅格式转换）**：调用 `history-convert.ts` 直接转换，不经过 AI 重写。

### 步骤 S2: AI 标准化重写（仅选项 1）

读取 `${CLAUDE_SKILL_DIR}/prompts/standardize.md`，对解析出的原始用例逐模块执行标准化重写：

- 应用步骤三要素（操作位置 + 操作对象 + 操作动作）
- 补充等待条件
- 预期结果可断言化
- 前置条件操作化
- 标题格式统一为 `【P0/P1/P2】验证xxx`
- 模糊步骤具体化、占位数据替换为真实业务数据
- 合并符合条件的正向用例

输出中间 JSON 格式（与 writer 输出一致）。

### 步骤 S3: 质量审查

读取 `${CLAUDE_SKILL_DIR}/prompts/reviewer.md`，对标准化后的 JSON 执行审查。
质量门禁与普通模式一致（15% / 40%）。

### 步骤 S4: 输出

> **路径规则**：标准化产物（含 `-standardized` 后缀的 MD 和 XMind）属于中间产物，必须输出到 archive 下的 `tmp/` 子目录，不得直接放在 archive 或 xmind 根目录下。
>
> - Archive MD → `workspace/archive/{{YYYYMM}}/tmp/{{name}}-standardized.md`
> - XMind → `workspace/archive/{{YYYYMM}}/tmp/{{name}}-standardized.xmind`
> - 中间 JSON 也保留在同一 `tmp/` 目录
> - 禁止输出到 `workspace/cases/` 目录（该目录不存在且不应被创建）

```bash
# 生成标准化 Archive MD（输出到 tmp/ 子目录）
npx tsx .claude/scripts/archive-gen.ts convert --input {{final_json}} --output {{archive_tmp_path}}

# 从标准化 JSON 生成 XMind（输出到 tmp/ 子目录）
npx tsx .claude/scripts/xmind-gen.ts --input {{final_json}} --output {{xmind_tmp_path}} --mode create

# 通知
npx tsx .claude/scripts/plugin-loader.ts notify --event archive-converted --data '{"fileCount":1,"caseCount":{{count}}}'
```

### 交互点 — 完成确认

```
标准化归档完成

Archive MD：{{archive_tmp_path}}
XMind：{{xmind_tmp_path}}
共 {{n}} 条用例（标准化前 {{original_count}} 条，标准化后 {{final_count}} 条）

选项：
1. 完成
2. 修改某条用例（→ xmind-editor skill）
```

---

## 节点 1: init — 输入解析与环境准备

**目标**：解析用户输入、检查插件、检测断点、确认运行参数。

### 1.1 断点续传检测

```bash
npx tsx .claude/scripts/state.ts resume --prd-slug {{prd_slug}}
```

若返回有效状态 → 跳转到断点所在节点继续执行。

### 1.2 插件检测（蓝湖 URL 等）

```bash
npx tsx .claude/scripts/plugin-loader.ts check --input "{{user_input}}"
```

若匹配插件（如蓝湖 URL）→ 执行插件 fetch 命令获取 PRD 内容。

### 1.3 初始化状态

```bash
npx tsx .claude/scripts/state.ts init --prd {{prd_path}} --mode {{mode}}
```

### 交互点 A — 确认参数

```
已识别 PRD：{{prd_path}}
运行模式：{{mode}}

选项：
1. ✓ 继续（推荐）
2. 切换为快速模式
3. 指定其他 PRD 文件
```

等待用户选择后进入节点 2（transform）。

---

## 节点 2: transform — 源码分析与 PRD 结构化

**目标**：交叉分析蓝湖素材 + 源码 + 归档用例，产出结构化测试增强 PRD。

### 2.1 源码配置匹配

```bash
npx tsx .claude/scripts/repo-profile.ts match --text "{{prd_title_or_path}}"
```

### 2.2 源码配置确认（交互点）

向用户展示确认清单（使用 AskUserQuestion）：

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

确认后将拉取最新代码。
```

用户确认后，若提供了新的映射关系，询问是否保存：

```bash
npx tsx .claude/scripts/repo-profile.ts save --name "{{name}}" --repos '{{repos_json}}'
```

### 2.3 拉取源码

```bash
npx tsx .claude/scripts/repo-sync.ts sync-profile --name "{{profile_name}}"
```

若用户自行输入了仓库（非 profile），则逐个调用：

```bash
npx tsx .claude/scripts/repo-sync.ts --url {{repo_url}} --branch {{branch}}
```

将返回的 commit SHA 写入 PRD frontmatter。

### 2.4 PRD 结构化转换（AI 任务）

读取 `${CLAUDE_SKILL_DIR}/prompts/transform.md`，执行：

- 蓝湖素材解析
- 源码状态检测与分析（A/B 级）
- 历史用例检索
- 按 `references/prd-template.md` 模板填充
- 生成 CLARIFY 块（若有待确认项）

### 2.5 CLARIFY 中转（若有待确认项）

处理流程参见 `references/clarify-protocol.md`：

1. 解析 transform 输出中的 `## CLARIFY` 块
2. 逐个向用户展示选择框（AskUserQuestion），包含推荐答案和备选
3. 收集确认结果，打包为 `## CONFIRMED` 发回 transform subagent
4. subagent 合入确认结果，移除 🔴 标记
5. 若产生新的待确认项 → 循环（最多 3 轮）
6. 无新增 → 输出最终 PRD

### 2.6 更新状态

```bash
npx tsx .claude/scripts/state.ts update --prd-slug {{slug}} --node transform --data '{{json}}'
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

---

## 节点 3: enhance — PRD 增强

**目标**：图片识别、frontmatter 规范化、页面要点提取、需求澄清。

> fetch 阶段已从 Axure 资源中提取独立元素图片（高清）+ 整页截图（全貌参考），
> 无需再做图片压缩。images/ 目录中 `N-uXXX.png` 为独立元素，`N-fullpage-*.png` 为整页截图。

### 3.1 Frontmatter 规范化

```bash
npx tsx .claude/scripts/prd-frontmatter.ts normalize --file {{prd_path}}
```

### 3.2 PRD 增强（AI 任务）

读取 `${CLAUDE_SKILL_DIR}/prompts/enhance.md`，对 PRD 执行：

- 图片语义化描述
- 页面要点提取
- 需求歧义标注
- 健康度预检

### 3.3 更新状态

```bash
npx tsx .claude/scripts/state.ts update --prd-slug {{slug}} --node enhance --data '{{json}}'
```

### 交互点 B（--quick 模式跳过）

```
增强完成：识别 {{n}} 张图片，{{m}} 个页面要点
健康度：{{health_warnings}}

选项：
1. ✓ 继续分析（推荐）
2. 补充 PRD 信息
3. 查看增强后的文件
```

---

## 节点 4: analyze — 历史检索与测试点规划

**目标**：检索历史用例、QA 头脑风暴、生成测试点清单 JSON。

### 4.1 历史用例检索

```bash
npx tsx .claude/scripts/archive-gen.ts search --query "{{keywords}}" --dir workspace/archive
```

> 注：`workspace/archive` 中的 `workspace` 对应 `.env` 中 `WORKSPACE_DIR` 的值（默认 `workspace`）。

### 4.2 测试点清单生成（AI 任务）

读取 `${CLAUDE_SKILL_DIR}/prompts/analyze.md`，结合增强后 PRD + 历史用例，生成结构化测试点清单。

--quick 模式下简化分析：跳过历史检索，直接从 PRD 提取测试点。

### 4.3 更新状态

```bash
npx tsx .claude/scripts/state.ts update --prd-slug {{slug}} --node analyze --data '{{json}}'
```

### 交互点 C（--quick 模式跳过，普通模式为关键门控）

```
测试点清单（共 {{n}} 个模块，{{m}} 条测试点）：

┌─ {{module_a}}（{{count_a}} 条）
│  ├─ {{page_1}}: {{points}}...
│  └─ {{page_2}}: {{points}}...
└─ {{module_b}}（{{count_b}} 条）

选项：
1. ✓ 确认，开始生成（推荐）
2. 调整测试点清单
3. 增加/删除测试点
```

用户确认后方可进入 write 节点。

---

## 节点 5: write — 并行 Writer 生成用例

**目标**：按模块并行派发 Writer Sub-Agent，生成结构化用例 JSON。

### 5.1 派发 Writer Sub-Agent

读取 `${CLAUDE_SKILL_DIR}/prompts/writer.md` 作为 Writer 提示词。

为每个模块派发独立 Writer，输入包含：

- 增强后 PRD 对应模块内容
- 该模块已确认的测试点清单
- preferences/ 目录下的偏好规则（若存在）
- 历史归档用例参考（来自 analyze 步骤）

### 5.2 BLOCKED 中转

若 Writer 返回 `## BLOCKED` → 执行 BLOCKED 中转协议（见下文）。

### 5.3 更新状态

每个 Writer 完成后更新状态：

```bash
npx tsx .claude/scripts/state.ts update --prd-slug {{slug}} --node write --data '{{json}}'
```

---

## 节点 6: review — 质量审查与修正

**目标**：对 Writer 产出执行质量审查，按阈值自动决策。

### 6.1 质量审查（AI 任务）

读取 `${CLAUDE_SKILL_DIR}/prompts/reviewer.md` 作为 Reviewer 提示词。

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
npx tsx .claude/scripts/state.ts update --prd-slug {{slug}} --node review --data '{{json}}'
```

### 交互点 D

```
评审完成：共 {{n}} 条用例，修正 {{m}} 条，问题率 {{rate}}%

选项：
1. ✓ 生成产物（推荐）
2. 查看修正详情
3. 人工复核后继续
```

---

## 节点 7: output — 产物生成与通知

**目标**：生成 XMind + Archive MD，发送通知，清理状态。

> **产物路径规则**（严格遵守）：
>
> - XMind → `workspace/xmind/{{YYYYMM}}/{{需求名称}}.xmind`
> - Archive MD → `workspace/archive/{{YYYYMM}}/{{需求名称}}.md`
> - 禁止输出到 `workspace/cases/` 目录（该目录不存在且不应被创建）

### 7.1 生成 XMind

```bash
npx tsx .claude/scripts/xmind-gen.ts --input {{final_json}} --output workspace/xmind/{{YYYYMM}}/{{需求名称}}.xmind --mode create
```

### 7.2 生成 Archive MD

```bash
npx tsx .claude/scripts/archive-gen.ts convert --input {{final_json}} --output workspace/archive/{{YYYYMM}}/{{需求名称}}.md
```

### 7.3 发送通知

```bash
npx tsx .claude/scripts/plugin-loader.ts notify --event case-generated --data '{{notify_data}}'
```

notify_data 必需字段：`count`、`file`、`duration`。

### 7.4 清理状态

```bash
npx tsx .claude/scripts/state.ts clean --prd-slug {{slug}}
```

### 交互点 E — 完成确认

```
用例生成完成

XMind：{{xmind_path}}
Archive：{{archive_path}}
共 {{n}} 条用例（P0: {{p0}}, P1: {{p1}}, P2: {{p2}}）

选项：
1. 完成
2. 修改某条用例（→ xmind-editor skill）
3. 重新生成某个模块
```

---

## BLOCKED 中转协议

当 Writer Sub-Agent 返回 `## BLOCKED` 时，表示需求信息不足以继续编写。

### 处理流程

1. **解析**：从 BLOCKED 内容中提取问题列表
2. **逐条询问**：每次只向用户提出一个问题，格式如下：

```
Writer 需要确认（{{current}}/{{total}}）：

{{question_description}}

候选答案：
A. {{candidate_a}}（来源：源码分析）
B. {{candidate_b}}
C. ✓ {{ai_recommended}}（AI 推荐）
D. 自行输入

请选择或直接输入答案：
```

3. **收集完毕**：将所有答案注入 `## 已确认信息` 章节，重启该模块的 Writer
4. **注入格式**：

```markdown
## 已确认信息

- Q: {{question_1}}
  A: {{answer_1}}
- Q: {{question_2}}
  A: {{answer_2}}
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
  "mode": "normal|quick",
  "current_node": "transform|enhance|analyze|write|review|output",
  "transform": { "confidence": 0, "clarify_count": 0 },
  "enhance": { "health_warnings": [], "image_count": 0 },
  "analyze": { "checklist": {} },
  "write": { "modules": {}, "blocked": [] },
  "review": { "issue_rate": 0, "fixed_count": 0 },
  "source_context": { "branch": "", "commit": "" }
}
```

---

## 异常处理

任意节点执行失败时：

1. 更新状态文件记录失败节点
2. 发送 `workflow-failed` 通知：

```bash
npx tsx .claude/scripts/plugin-loader.ts notify --event workflow-failed --data '{"step":"{{node}}","reason":"{{error_msg}}"}'
```

3. 向用户报告错误，提供重试选项
