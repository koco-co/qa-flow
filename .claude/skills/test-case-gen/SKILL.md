---
name: test-case-gen
description: "QA 测试用例生成。将 PRD 需求文档转化为结构化 XMind + Markdown 测试用例。
  6 节点工作流：init → enhance → analyze → write → review → output。
  触发词：生成测试用例、生成用例、写用例、为 Story-xxx 生成用例、test case、
  重新生成 xxx 模块、追加用例。支持 --quick 快速模式和蓝湖 URL 输入。"
argument-hint: "[PRD 路径或蓝湖 URL] [--quick]"
---

<!-- 前置加载 -->

执行前检查 `${CLAUDE_SKILL_DIR}/preferences.md` 是否存在，若存在则读取。
偏好优先级：用户当前指令 > preferences.md > 本 skill 内置规则（references/）。
读取项目配置：`.claude/config.json`（模块、仓库、路径的唯一权威来源）。
全程遵守 `.claude/rules/test-case-writing.md` 用例编写规范。

---

## 运行模式

| 模式     | 触发条件                                | 行为差异                                           |
| -------- | --------------------------------------- | -------------------------------------------------- |
| 普通     | 默认                                    | 全 6 节点 + 全部交互点                             |
| 快速     | `--quick`                               | 跳过交互点 B/C，analyze 简化，review 仅 1 轮       |
| 续传     | 自动检测 `.temp/.qa-state-*.json` 存在  | 从断点节点继续                                     |
| 模块重跑 | `重新生成 xxx 的「yyy」模块`            | 仅执行 write → review → output（replace 模式）     |

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

等待用户选择后进入节点 2。

---

## 节点 2: enhance — PRD 增强

**目标**：图片压缩与识别、frontmatter 规范化、页面要点提取、需求澄清。

### 2.1 图片压缩

```bash
npx tsx .claude/scripts/image-compress.ts --dir {{prd_images_dir}}
```

### 2.2 Frontmatter 规范化

```bash
npx tsx .claude/scripts/prd-frontmatter.ts normalize --file {{prd_path}}
```

### 2.3 PRD 增强（AI 任务）

读取 `${CLAUDE_SKILL_DIR}/prompts/enhance.md`，对 PRD 执行：
- 图片语义化描述
- 页面要点提取
- 需求歧义标注
- 健康度预检

### 2.4 源码同步（仅当 config.repos 非空时）

```bash
npx tsx .claude/scripts/repo-sync.ts --url {{repo_url}} --branch {{branch}}
```

### 2.5 更新状态

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

## 节点 3: analyze — 历史检索与测试点规划

**目标**：检索历史用例、QA 头脑风暴、生成测试点清单 JSON。

### 3.1 历史用例检索

```bash
npx tsx .claude/scripts/archive-gen.ts search --query "{{keywords}}" --dir workspace/archive
```

### 3.2 测试点清单生成（AI 任务）

读取 `${CLAUDE_SKILL_DIR}/prompts/analyze.md`，结合增强后 PRD + 历史用例，生成结构化测试点清单。

--quick 模式下简化分析：跳过历史检索，直接从 PRD 提取测试点。

### 3.3 更新状态

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

## 节点 4: write — 并行 Writer 生成用例

**目标**：按模块并行派发 Writer Sub-Agent，生成结构化用例 JSON。

### 4.1 派发 Writer Sub-Agent

读取 `${CLAUDE_SKILL_DIR}/prompts/writer.md` 作为 Writer 提示词。

为每个模块派发独立 Writer，输入包含：
- 增强后 PRD 对应模块内容
- 该模块已确认的测试点清单
- preferences.md 规则（若存在）
- 历史归档用例参考（来自 analyze 步骤）

### 4.2 BLOCKED 中转

若 Writer 返回 `## BLOCKED` → 执行 BLOCKED 中转协议（见下文）。

### 4.3 更新状态

每个 Writer 完成后更新状态：

```bash
npx tsx .claude/scripts/state.ts update --prd-slug {{slug}} --node write --data '{{json}}'
```

---

## 节点 5: review — 质量审查与修正

**目标**：对 Writer 产出执行质量审查，按阈值自动决策。

### 5.1 质量审查（AI 任务）

读取 `${CLAUDE_SKILL_DIR}/prompts/reviewer.md` 作为 Reviewer 提示词。

质量阈值决策：

| 问题率   | 行为                           |
| -------- | ------------------------------ |
| < 15%    | 静默修正                       |
| 15% - 40%| 自动修正 + 质量警告            |
| > 40%    | 阻断，输出问题报告，等用户决策 |

问题率 = 含问题用例数 / 总用例数。

--quick 模式仅执行 1 轮审查。普通模式最多 2 轮（修正后复审）。

### 5.2 合并产出

将所有 Writer 输出合并为最终 JSON。

### 5.3 更新状态

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

## 节点 6: output — 产物生成与通知

**目标**：生成 XMind + Archive MD，发送通知，清理状态。

### 6.1 生成 XMind

```bash
npx tsx .claude/scripts/xmind-gen.ts --input {{final_json}} --output {{xmind_path}} --mode create
```

### 6.2 生成 Archive MD

```bash
npx tsx .claude/scripts/archive-gen.ts convert --input {{final_json}} --output {{archive_path}}
```

### 6.3 发送通知

```bash
npx tsx .claude/scripts/plugin-loader.ts notify --event case-generated --data '{{notify_data}}'
```

notify_data 必需字段：`count`、`file`、`duration`。

### 6.4 清理状态

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
  "current_node": "enhance|analyze|write|review|output",
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
