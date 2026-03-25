---
name: test-case-generator
description: QA 测试用例生成主编排 Skill。一键触发完整自动化流程：PRD 增强 → 健康度预检 → Brainstorming + 解耦分析 → Checklist 预览 → 并行生成用例 → 评审 → 输出 XMind。当用户说「生成测试用例」「生成用例」「写用例」「写测试用例」「根据需求文档生成用例」「为 Story-xxx 生成用例」「test case」「重新生成 xxx 模块」「追加用例」时触发。支持 --quick 快速模式、模块级重跑和断点续传。
---

# 测试用例生成编排 Skill（主入口）

本 Skill 是整个 QA 自动化流程的主编排器，串联所有子步骤。

**执行前必须阅读本文件及所有 references/ 和 prompts/ 文件。**

> ⚠️ **用例编写硬性规则**见项目 CLAUDE.md「测试用例编写规范」章节（标题"验证"开头、禁止步骤编号、首步进入页面、正常/异常用例原则、禁止模糊词、预期结果规范）。Writer/Reviewer 必须遵循，本文件仅定义编排流程。

---

## 运行模式

### 普通模式（默认）
完整 10 步流程，包含 brainstorming、Checklist 预览和一次用户确认。

```
根据需求文档: Story-20260322 中的 PRD-26 生成测试用例
```

### 快速模式（--quick）
跳过 brainstorming 和 Checklist 确认，自动执行全流程。适合重跑、已熟悉的需求、或无暇交互的场景。

```
为 Story-20260322 快速生成测试用例
使用 --quick 为 PRD-26 生成测试用例
```

快速模式的差异：
- Step 3（brainstorming）：跳过，自动分析测试范围
- Step 4（Checklist 预览）：跳过，直接进入 Writer
- Step 5（用户确认）：跳过，自动确认

### 续传模式（自动检测）
启动时自动检测 Story 目录下的 `.qa-state.json`，如存在则从中断处继续。

```
继续 Story-20260322 的用例生成
```

### 模块级重跑模式

生成完毕后，可以单独重跑某个模块的 Writer，其他模块保持不变。

```
重新生成 Story-20260322 的「列表页」模块用例
为 Story-20260322 追加边界用例
```

模块级重跑的行为：
- 读取 `.qa-state.json` 中的 writers 记录
- 仅重新启动指定模块的 Writer
- 重跑完成后重新执行 Reviewer（对全部用例）
- 输出更新后的 XMind

---

## 完整工作流（10 步）

```
Step 1: 解析用户指令 + 断点续传检测
Step 2: prd-enhancer（增强所有 PRD + 健康度预检）
Step 3: Brainstorming + 解耦分析（--quick 时跳过）
Step 4: Checklist 预览（--quick 时跳过）
Step 5: 用户一次确认（--quick 时跳过）
Step 6: 并行 Writer Subagents
Step 7: Reviewer Subagent（含质量阈值 15%/40%）
Step 8: xmind-converter（支持 --append 追加模式）
Step 9: 归档 MD 同步 + 用户验证提示
Step 10: 用户验证后同步（条件执行）
```

每步完成后写入 `.qa-state.json`，记录进度。

---

## Step 1: 解析用户指令 + 断点续传检测

### 1.1 解析指令

从用户指令中提取以下信息：

| 信息 | 来源 | 示例 |
|------|------|------|
| Story 目录路径 | 用户指令 | `zentao-cases/customItem-platform/信永中和/Requirement/Story-20260322/` |
| PRD 文件列表 | 扫描 Story 目录 | `PRD-26-xxx.md`, `PRD-27-xxx.md` |
| 项目名称 | 目录路径推断 | `信永中和` / `DTStack` |
| 源码仓库路径 | CLAUDE.md 路径映射表 | 信永中和无源码 |
| 输出 XMind 路径 | CLAUDE.md 输出规范 | `zentao-cases/XMind/CustomItem/信永中和/` |
| 历史用例 | 自动查找 | - DTStack 平台模块：`zentao-cases/dtstack-platform/<module>/archive-cases/` 目录下的 .md 文件<br>- 信永中和：`zentao-cases/customItem-platform/信永中和/archive-cases/` 目录下的 .md 文件 |
| 运行模式 | 用户指令关键词 | `--quick` / 普通 |

如果用户只说了 Story 编号（如 `Story-20260322`），自动补全完整路径。
如果同一 Story 下有多个 PRD，询问用户要生成哪些（默认全部）。

**路径验证：**
- 如果 Story 目录不存在：向用户提示 `未找到 Story-xxx 目录，请确认路径是否正确` 并列出可用的 Story 目录供选择
- 如果 Story 目录下无 PRD 文件：向用户提示 `Story-xxx 下未找到 PRD 文件，请先添加 PRD 文档`

### 1.2 断点续传检测

检查 Story 目录下是否存在 `.qa-state.json`：

```
zentao-cases/<项目路径>/Requirement/Story-20260322/.qa-state.json
```

**如果存在：**

读取状态文件，向用户展示上次进度（中断步骤、已完成/未完成项），询问是否继续。

- 选「是」→ 从 `last_completed_step + 1` 继续
- 选「否」→ 删除 .qa-state.json，重新开始
- 不存在 → 创建初始状态文件，开始新流程。

### 1.3 初始化状态文件

在 Story 目录下创建 `.qa-state.json`（完整 Schema 见 `references/intermediate-format.md`）。

### 1.4 源码仓库验证

根据 CLAUDE.md「代码仓库路径映射」表验证源码仓库是否可用。

**验证结果处理：**
- 全部存在 → 记录到状态文件，Writer/Reviewer 使用 Grep 验证按钮名称
- 部分不存在 → 提示用户提供路径或继续无源码模式
- 项目标记为「无源码」（如信永中和）→ 跳过验证，标注「无源码参考」

---

## Step 2: prd-enhancer（增强 + 健康度预检）

对 Step 1 中识别出的所有 PRD 文件调用 prd-enhancer Skill。

**prd-enhancer 的增量检测特性（自动生效）：**
- 若 `-enhanced.md` 已存在且 PRD 未修改 → 直接使用现有版本，跳过重新增强
- 若 PRD 有更新 → 只重新处理变更章节

增强完成后，prd-enhancer 输出健康度预检报告。

**如有 ❌ 错误级问题：** 向用户展示，询问是否继续（推荐先修复 PRD）。
**如仅有 ⚠️ 警告：** 记录在报告中，不阻断流程。

更新状态文件：`last_completed_step: 2`

---

## Step 3: Brainstorming + 解耦分析

> **--quick 模式跳过此步，直接进入 Step 4（同样跳过）→ Step 6。**

### 3.1 Brainstorming

此时已有增强后的 PRD（含完整图片描述），可以进行有实质内容的测试分析。

基于增强后 PRD 的关键信息，与用户讨论：
- 本次覆盖的功能模块清单
- P0 核心路径（冒烟用例的范围）
- 高风险场景（联动逻辑复杂的字段、权限相关功能、审批流程等）
- 是否有已知的历史 Bug 需要重点覆盖

同时读取历史用例目录下的 .md 文件（DTStack 平台：`zentao-cases/dtstack-platform/<module>/archive-cases/`，信永中和：`zentao-cases/customItem-platform/信永中和/archive-cases/`），整理已覆盖的功能点，避免重复。

### 3.2 需求解耦分析

读取所有增强后的 PRD，按照 `references/decoupling-heuristics.md` 中的规则进行解耦分析：
1. 识别所有独立功能页面（列表页、新增页、详情页、设置页等）
2. 识别 CRUD 操作（增/查/改/删）
3. 判断模块间耦合度
4. 确定 Writer Subagent 数量和各自负责范围
5. 估算每个 Writer 的用例数量

更新状态文件：`last_completed_step: 3`

---

## Step 4: Checklist 预览

> **--quick 模式跳过此步。**

为每个解耦模块，启动轻量级 Checklist 生成（只需测试点列表，无需完整 steps/expected）。

**Checklist 展示格式（4 级树形，在对话中展示）：**

```
质量问题台账（菜单名）[共 ~25条]
├── 列表页 [Writer A]
│   ├── 搜索
│   │   ├── ✅ 按行动编号单条件搜索（P1）
│   │   ├── ✅ 搜索无结果边界（P2，异常）
│   │   └── ✅ 重置搜索条件（P2）
│   └── 导出
│       └── ✅ 导出 Excel（P2）
├── 新增页 [Writer B]
│   ├── ✅ 正常新增完整流程（P0）
│   ├── ✅ 「问题名称」为空时不可提交（P1，异常）
│   └── ✅ 「问题名称」超出100字符（P1，异常）
└── 详情/编辑页 [Writer C]
    └── ...
```

用户可以：直接回复「确认」、删除/新增测试点、调整优先级。

---

## Step 5: 用户一次确认

> **--quick 模式跳过此步。**

在一条消息中展示完整确认内容，包含：
- PRD 增强摘要（图片读取情况、健康度）
- 拆分方案（各 Writer 及预计用例数）
- 历史去重（现有用例排除情况）

用户可选：`[确认，开始生成]` / `[修改测试点]` / `[修改拆分方案]`

更新状态文件：`last_completed_step: 5, checklist_confirmed: true`

---

## Step 6: 并行 Writer Subagents

**重要：所有 Writer 同时启动（并行执行）。**

创建临时目录：

```bash
mkdir -p zentao-cases/<项目路径>/Requirement/Story-20260322/temp/
```

使用 `prompts/writer-subagent.md` 中的模板，为每个 Writer 填充：
- `[模块名称]` → 对应的功能模块
- `[列举具体功能点]` → 来自 Checklist 中 include=true 的测试点
- `[粘贴 PRD 中相关章节]` → 增强后 PRD 的对应章节（含图片描述）
- `[历史用例参考]` → 已覆盖功能点（XMind + CSV 来源，避免重复）
- `[临时文件路径]` → `zentao-cases/<项目路径>/Requirement/Story-20260322/temp/<模块简称>.json`

通过 Agent 工具并行启动所有 Writer。

> Writer 输出采用 4 级 JSON 结构（见 `references/intermediate-format.md`）：
> `模块（菜单名）→ 页面名 → 功能子组（可选）→ 用例`
> 编写规则见 CLAUDE.md「测试用例编写规范」。

**进度报告规范：**

每个 Writer 完成时，向用户输出简短通知：
```
✅ Writer A（质量问题台账-列表页）完成：12 条用例（P0:2 / P1:6 / P2:4）
⏳ Writer B（质量问题台账-新增）运行中...
⏳ Writer C（质量问题台账-详情/编辑）运行中...
```

**Writer 失败处理：**
- 某个 Writer 失败时，记录到 `.qa-state.json`（status: `failed`），不阻塞其他 Writer
- 所有 Writer 结束后，如有失败的 Writer，向用户展示失败原因并询问处理方式：
  - 重试该 Writer
  - 跳过该模块，继续 Reviewer
  - 终止流程

每个 Writer 完成后，更新状态文件中对应 writer 的 status 为 `completed`。

等待所有 Writer 完成，更新状态文件：`last_completed_step: 6`

---

## Step 7: Reviewer Subagent

所有 Writer 完成后，启动 Reviewer。Reviewer 按 CLAUDE.md「测试用例编写规范」逐条检查并修正。

使用 `prompts/reviewer-subagent.md` 中的模板，填充：
- 所有 Writer 输出的临时 JSON 文件路径
- 增强后 PRD 文件路径
- 源码仓库路径（如有）
- 历史 XMind 文件路径（用于去重检查）
- 最终 JSON 输出路径：`temp/final-reviewed.json`

**Reviewer 的质量阈值逻辑（在提示词中已说明）：**
- 问题率 < 15%：自动修正，继续
- 问题率 15%-40%：自动修正 + 质量警告，继续
- 问题率 > 40%：**输出阻断报告**，等待用户决策

**如果 Reviewer 输出阻断报告（问题率 > 40%）：**
1. 向用户展示阻断报告
2. 更新状态文件：`reviewer_status: "escalated"`
3. 等待用户选择：A（修复 PRD 重跑）/ B（手动修正后续传）/ C（忽略继续）

> 阻断报告详细格式见 `prompts/reviewer-subagent.md`「质量阻断报告格式」部分。

**如果 Reviewer 完成：**
更新状态文件：`last_completed_step: 7, reviewer_status: "completed"`

如有「待核实」用例，向用户展示清单，询问处理方式（无需阻断，可继续）。

---

## Step 8: xmind-converter（追加模式优先）

Reviewer 完成后，调用 xmind-converter Skill。文件命名和输出路径见 CLAUDE.md「XMind 输出规范」。

**目标文件判断：**
- 文件不存在 → 新建
- 文件已存在，本次 requirement_name 不同 → `--append` 追加模式
- 文件已存在，requirement_name 相同 → 询问用户覆盖还是跳过

完成后：验证 .xmind → 更新状态文件：`last_completed_step: 8, output_xmind: "<路径>"`

> 注意：Step 8 完成后不再删除临时文件，延迟到 Step 10 清理。

---

## Step 9: 归档 MD 同步 + 用户验证提示

### 9.1 生成归档 MD

调用 `json-to-archive-md.mjs` 将 Reviewer 输出的 final JSON 转换为 archive-cases 格式的 Markdown 文件：

```bash
node .claude/scripts/json-to-archive-md.mjs <temp/final-reviewed.json> [output-dir]
```

输出路径自动推断（根据 meta.project_name 和 meta.version），也可手动指定。

### 9.2 向用户发出验证提示

```
✅ XMind 文件已生成：<xmind-path>
📄 归档用例 MD 已同步：<archive-md-path>

请在 XMind 应用中打开文件检查用例内容。检查完毕后，请回复：
- 「确认通过」— 直接完成流程
- 「已修改，请同步」— 重新读取 XMind 并更新归档 MD
```

更新状态文件：`last_completed_step: 9, archive_md_path: "<path>", awaiting_verification: true`

---

## Step 10: 用户验证后同步（条件执行）

收到用户回复后：

**「确认通过」：**
1. 删除临时文件：`rm -rf <Story>/temp/`
2. 删除状态文件：`rm -f <Story>/.qa-state.json`
3. 向用户输出最终完成通知

**「已修改，请同步」：**
1. 调用 `json-to-archive-md.mjs --from-xmind <xmind-path> <archive-dir>` 重新生成归档 MD
2. 向用户展示变更概要（用例数变化等）
3. 删除临时文件和状态文件
4. 输出完成通知

更新状态文件：`last_completed_step: 10` → 然后删除状态文件

---

## 模块级重跑流程

当用户指定重跑某个模块时（如「重新生成 Story-xxx 的列表页模块」），执行以下精简流程：

1. **读取 `.qa-state.json`**：确认 Story 目录和之前的 Writer 拆分信息
2. **读取增强后 PRD**：复用已有的 `-enhanced.md`（不重新增强）
3. **仅启动指定 Writer**：只重跑目标模块，输出到 `temp/<模块>.json`
4. **重新执行 Reviewer**：合并所有模块的 JSON（新旧混合），重新评审
5. **更新 XMind**：使用 `--append` 模式更新现有 .xmind 文件

注意：模块级重跑不删除 `.qa-state.json`，以便后续继续操作。

---

## 完成通知

输出生成摘要：
- XMind 路径、模式（新建/追加）、用例统计
- 归档 MD 路径
- Reviewer 质量评分
- 提示用户可执行后续操作

---

## 参考文件

- `references/decoupling-heuristics.md` — 需求解耦判断规则
- `references/intermediate-format.md` — 中间 JSON 格式 + .qa-state.json Schema + Checklist 格式
- `xmind-converter/references/xmind-structure-spec.md` — XMind 层级映射规范（权威版本）
- `prompts/writer-subagent.md` — Writer Subagent 提示词模板
- `prompts/reviewer-subagent.md` — Reviewer Subagent 提示词模板（含质量阈值）
- `.claude/scripts/json-to-archive-md.mjs` — 归档 MD 转换脚本（JSON/XMind → archive MD）

## 关联 Skills

- `prd-enhancer` — PRD 增强 + 增量 diff + 健康度预检（Step 2）
- `xmind-converter` — JSON 转 XMind，支持 --append（Step 8）
- Step 3 中的 brainstorming 为内联分析流程（非独立 Skill），基于增强后 PRD 与用户讨论测试范围
