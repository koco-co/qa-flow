# code-analysis 分享会实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 制作一份 30 分钟的 Obsidian Slides 分享会材料，含流程图，主题为 code-analysis 工作流实战

**Architecture:** Obsidian Slides Markdown 作为主文件，drawio 绘制流程图导出 PNG 嵌入。分三幕结构：效果展示 -> 上手教学 -> 揭秘拆解

**Tech Stack:** Obsidian Slides（Markdown `---` 分页）、cli-anything-drawio（流程图）、Mermaid（辅助图表）

**输出目录:** `/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/`（下文简称 `$OUT`）

**drawio CLI:** `cli-anything-drawio`

**已有素材:**
- 真实 Bug 报告: `workspace/dataAssets/reports/bugs/20260413/*.html`
- 真实 Hotfix 用例: `workspace/dataAssets/issues/` 下的 Archive MD 文件

---

### Task 1: 创建 drawio 架构流程图

绘制 code-analysis 整体工作流图，展示从用户输入到报告输出的完整链路，每个节点标注对应的 AI 概念。

**Files:**
- Create: `$OUT/assets/code-analysis-flow.drawio`
- Create: `$OUT/assets/code-analysis-flow.png`

- [ ] **Step 1: 创建 drawio 项目文件**

```bash
mkdir -p "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets"
cli-anything-drawio project new -o "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-flow.drawio"
```

- [ ] **Step 2: 添加主流程节点**

从左到右排列，y=200 保持水平对齐，间距 200px：

```bash
P="/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-flow.drawio"

# 起点：用户输入
cli-anything-drawio --project "$P" shape add rounded --label "用户输入" --x 50 --y 200 -w 120 -h 60 --id input

# 模式识别
cli-anything-drawio --project "$P" shape add diamond --label "模式识别" --x 250 --y 190 -w 130 -h 80 --id router

# 项目选择
cli-anything-drawio --project "$P" shape add rounded --label "项目选择" --x 460 --y 200 -w 120 -h 60 --id project

# 双门禁
cli-anything-drawio --project "$P" shape add hexagon --label "双门禁确认" --x 660 --y 195 -w 130 -h 70 --id gate

# Agent 分析
cli-anything-drawio --project "$P" shape add process --label "Agent 分析" --x 870 --y 200 -w 120 -h 60 --id agent

# 模板渲染
cli-anything-drawio --project "$P" shape add rounded --label "模板渲染" --x 1070 --y 200 -w 120 -h 60 --id render

# 输出报告
cli-anything-drawio --project "$P" shape add rounded --label "输出报告" --x 1270 --y 200 -w 120 -h 60 --id output
```

- [ ] **Step 3: 添加 5 种模式分支标注**

在模式识别节点下方添加 5 种模式：

```bash
P="/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-flow.drawio"

cli-anything-drawio --project "$P" shape add note --label "A: 后端 Bug" --x 170 --y 320 -w 100 -h 40 --id modeA
cli-anything-drawio --project "$P" shape add note --label "B: 合并冲突" --x 280 --y 320 -w 100 -h 40 --id modeB
cli-anything-drawio --project "$P" shape add note --label "C: 前端 Bug" --x 170 --y 370 -w 100 -h 40 --id modeC
cli-anything-drawio --project "$P" shape add note --label "D: 信息不足" --x 280 --y 370 -w 100 -h 40 --id modeD
cli-anything-drawio --project "$P" shape add note --label "E: Hotfix" --x 225 --y 420 -w 100 -h 40 --id modeE
```

- [ ] **Step 4: 添加 4 个 Agent 标注**

在 Agent 分析节点下方展示 4 个子 Agent：

```bash
P="/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-flow.drawio"

cli-anything-drawio --project "$P" shape add note --label "backend-bug\n-agent" --x 810 --y 320 -w 110 -h 45 --id agentA
cli-anything-drawio --project "$P" shape add note --label "frontend-bug\n-agent" --x 930 --y 320 -w 110 -h 45 --id agentC
cli-anything-drawio --project "$P" shape add note --label "conflict\n-agent" --x 810 --y 375 -w 110 -h 45 --id agentB
cli-anything-drawio --project "$P" shape add note --label "hotfix-case\n-agent" --x 930 --y 375 -w 110 -h 45 --id agentE
```

- [ ] **Step 5: 添加 AI 概念标注行**

在主流程上方添加对应的 AI 概念标签：

```bash
P="/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-flow.drawio"

cli-anything-drawio --project "$P" shape add text --label "Prompt" --x 80 --y 130 -w 80 -h 30 --id labelPrompt
cli-anything-drawio --project "$P" shape add text --label "提示词工程" --x 260 --y 130 -w 100 -h 30 --id labelPE
cli-anything-drawio --project "$P" shape add text --label "Skill" --x 480 --y 130 -w 80 -h 30 --id labelSkill
cli-anything-drawio --project "$P" shape add text --label "Hook" --x 690 --y 130 -w 80 -h 30 --id labelHook
cli-anything-drawio --project "$P" shape add text --label "Agent / SubAgent" --x 870 --y 130 -w 140 -h 30 --id labelAgent
cli-anything-drawio --project "$P" shape add text --label "Token" --x 1090 --y 130 -w 80 -h 30 --id labelToken
cli-anything-drawio --project "$P" shape add text --label "MCP" --x 1290 --y 130 -w 80 -h 30 --id labelMCP
```

- [ ] **Step 6: 连接主流程箭头**

```bash
P="/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-flow.drawio"

cli-anything-drawio --project "$P" connect add input router --style orthogonal
cli-anything-drawio --project "$P" connect add router project --style orthogonal
cli-anything-drawio --project "$P" connect add project gate --style orthogonal
cli-anything-drawio --project "$P" connect add gate agent --style orthogonal
cli-anything-drawio --project "$P" connect add agent render --style orthogonal
cli-anything-drawio --project "$P" connect add render output --style orthogonal
```

- [ ] **Step 7: 连接模式分支和 Agent 分支**

```bash
P="/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-flow.drawio"

# 模式识别 -> 5 种模式
cli-anything-drawio --project "$P" connect add router modeA --style curved
cli-anything-drawio --project "$P" connect add router modeB --style curved
cli-anything-drawio --project "$P" connect add router modeC --style curved
cli-anything-drawio --project "$P" connect add router modeD --style curved
cli-anything-drawio --project "$P" connect add router modeE --style curved

# Agent -> 4 个子 Agent
cli-anything-drawio --project "$P" connect add agent agentA --style curved
cli-anything-drawio --project "$P" connect add agent agentC --style curved
cli-anything-drawio --project "$P" connect add agent agentB --style curved
cli-anything-drawio --project "$P" connect add agent agentE --style curved
```

- [ ] **Step 8: 设置样式美化**

```bash
P="/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-flow.drawio"

# 主流程节点：深蓝背景白字
for id in input project render output; do
  cli-anything-drawio --project "$P" shape style $id fillColor "#2D5F8A"
  cli-anything-drawio --project "$P" shape style $id fontColor "#FFFFFF"
  cli-anything-drawio --project "$P" shape style $id strokeColor "#1A3A5C"
  cli-anything-drawio --project "$P" shape style $id fontSize 14
done

# 路由节点：橙色
cli-anything-drawio --project "$P" shape style router fillColor "#E8943A"
cli-anything-drawio --project "$P" shape style router fontColor "#FFFFFF"
cli-anything-drawio --project "$P" shape style router fontSize 14

# 门禁节点：红色
cli-anything-drawio --project "$P" shape style gate fillColor "#C0504D"
cli-anything-drawio --project "$P" shape style gate fontColor "#FFFFFF"
cli-anything-drawio --project "$P" shape style gate fontSize 14

# Agent 节点：绿色
cli-anything-drawio --project "$P" shape style agent fillColor "#4CAF50"
cli-anything-drawio --project "$P" shape style agent fontColor "#FFFFFF"
cli-anything-drawio --project "$P" shape style agent fontSize 14

# 概念标签：灰色斜体
for id in labelPrompt labelPE labelSkill labelHook labelAgent labelToken labelMCP; do
  cli-anything-drawio --project "$P" shape style $id fontColor "#666666"
  cli-anything-drawio --project "$P" shape style $id fontSize 12
done

# 子节点：浅色背景
for id in modeA modeB modeC modeD modeE; do
  cli-anything-drawio --project "$P" shape style $id fillColor "#FFF2CC"
  cli-anything-drawio --project "$P" shape style $id fontSize 11
done
for id in agentA agentB agentC agentE; do
  cli-anything-drawio --project "$P" shape style $id fillColor "#D5E8D4"
  cli-anything-drawio --project "$P" shape style $id fontSize 11
done
```

- [ ] **Step 9: 导出为 PNG**

```bash
cli-anything-drawio --project "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-flow.drawio" export render "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-flow.png" -f png --scale 2.0 --crop --overwrite
```

- [ ] **Step 10: 验证图片生成成功**

```bash
ls -la "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-flow.png"
```

Expected: 文件存在且大小 > 0

---

### Task 2: 制作 Obsidian Slides 主文件

将分享会全部内容写入一个 Obsidian Slides Markdown 文件，使用 `---` 分页。

**Files:**
- Create: `$OUT/code-analysis-sharing.md`

**依赖:** Task 1（流程图 PNG）

- [ ] **Step 1: 编写 Slides Markdown 文件**

写入完整的 Obsidian Slides 文件到 `$OUT/code-analysis-sharing.md`。内容结构如下（每个 `---` 是一页 slide）：

**封面页** -> **痛点引入** -> **场景 1-4 各两页（输入+输出）** -> **第一幕小结** -> **环境准备** -> **初始化 qa-flow** -> **4 种触发方式** -> **关键提醒** -> **揭秘引入** -> **架构流程图** -> **8 个概念各一页** -> **设计思想** -> **其他能力** -> **Q&A 页**

完整 Markdown 内容见 Step 2 的代码块。

- [ ] **Step 2: 写入文件内容**

使用 Write 工具写入以下完整内容到 `"/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/code-analysis-sharing.md"`：

````markdown
---
theme: moon
---

# 让 AI 帮你分析 Bug

**code-analysis 工作流实战**

<!-- .slide: data-background-color="#1a1a2e" -->

---

## 日常痛点

- 收到一个 Java 堆栈，定位根因要多久？
- 合并冲突 20 个文件，哪些能自动合并？
- 禅道新 Bug，Hotfix 验证用例谁来写？

> **如果 AI 能帮你做这些呢？**

---

## code-analysis 能做什么

把 **报错日志 / 冲突代码 / 禅道链接** 直接变成 **结构化分析报告**

支持 5 种场景，覆盖日常 80% 的代码分析需求

---

<!-- .slide: data-background-color="#2d2d44" -->

## 第一幕：效果展示

---

### 场景 1：后端 Java 异常

**输入：** 一段 NPE 堆栈日志

```
java.lang.NullPointerException
  at ...MonitorReportDetailService
    .getMonitorReportRecordDetail(
      MonitorReportDetailService.java:1046)
```

---

### 场景 1：输出

**HTML 报告** -- 可直接粘贴到禅道

- 根因定位：精确到源码行号
- 调用链可视化：从 Controller 到根因帧
- 环境问题 vs 代码问题：自动分类
- 修复建议：按优先级排列

> 截图：真实报告 `148824-质量报告详情页返回业务异常.html`

---

### 场景 2：前端 Console 错误

**输入：** 浏览器控制台 TypeError

```
TypeError: Cannot read properties of undefined
  (reading 'map')
  at DataTable (DataTable.tsx:42)
```

---

### 场景 2：输出

**HTML 报告** -- 四层分析

| 分析层 | 内容 |
|-------|------|
| 组件层 | 报错组件、props 类型 |
| 数据层 | 接口返回结构、空值链 |
| 环境层 | 浏览器、CDN、构建配置 |
| 框架层 | 版本兼容性、生命周期 |

---

### 场景 3：Git 合并冲突

**输入：** 含 `<<<<<<< HEAD` 的冲突代码块

---

### 场景 3：输出

**HTML 报告** -- 冲突分类 + 合并建议

| 冲突类型 | 处理方式 |
|---------|---------|
| 逻辑冲突 | 需人工决策 |
| 格式冲突 | 可自动合并 |
| 依赖冲突 | 需人工决策（通常取高版本） |

---

### 场景 4：禅道 Hotfix

**输入：** 禅道 Bug 链接

```
https://zentao.example.com/zentao/bug-view-148824.html
```

---

### 场景 4：输出

**Archive MD 验证用例** -- 可直接执行

- 自动拉取 Bug 信息 + 代码 diff
- 生成前置条件（含 SQL）
- 步骤表格：每步有预期结果
- 参考源码填写真实字段值

---

### 第一幕小结

| 场景 | 输入 | 输出 |
|------|------|------|
| 后端 Bug | Java 堆栈 | HTML 报告 |
| 前端 Bug | Console 错误 | HTML 报告 |
| 合并冲突 | 冲突代码 | HTML 报告 |
| 禅道 Hotfix | Bug 链接 | MD 验证用例 |

> 怎么用？**3 步就行**

---

<!-- .slide: data-background-color="#2d2d44" -->

## 第二幕：上手教学

---

### Step 1：安装 Claude Code

> 终端里的 AI 编程助手

```bash
# 安装
npm install -g @anthropic-ai/claude-code

# 启动
claude
```

---

### Step 2：初始化 qa-flow

```
/qa-flow init
```

6 步引导：
1. 选择项目管理工具（禅道）
2. 创建工作区目录
3. 安装依赖（bun）
4. 配置源码仓库
5. 配置插件
6. 环境验证

> 重点关注：**项目选择** 和 **源码仓库配置**

---

### Step 3：使用 code-analysis

**4 种触发方式：**

| 方式 | 操作 |
|------|------|
| 粘贴堆栈日志 | 自动识别后端/前端 |
| 粘贴冲突代码 | 自动进入冲突分析 |
| 粘贴禅道链接 | 自动生成 Hotfix 用例 |
| 输入 `/code-analysis` | 主动触发 |

---

### 关键提醒

**双门禁机制：**

1. "是否允许同步源码？" -- 选 **仅本次**
2. "是否写回配置？" -- 选 **仅本次**

**输出位置：**

- 报告 -> `workspace/项目名/reports/`
- Hotfix 用例 -> `workspace/项目名/issues/`

---

<!-- .slide: data-background-color="#2d2d44" -->

## 第三幕：揭秘拆解

---

### 背后是怎么实现的？

用 code-analysis 的工作流来拆解 AI 核心概念

![code-analysis 架构流程图](assets/code-analysis-flow.png)

---

### 概念 1：Prompt（提示词）

> 给 AI 的指令文本

**在 code-analysis 中：**

SKILL.md 文件就是一份 Prompt，告诉 AI：
- 如何识别 5 种输入模式
- 每种模式的分析步骤
- 输出格式要求

---

### 概念 2：提示词工程

> 设计 Prompt 使 AI 输出 **稳定可控**

**关键技巧：**

- **优先级规则** -- 5 种模式按优先级匹配，避免误判
- **JSON Schema** -- 约束输出格式，保证模板能渲染
- **Few-shot 示例** -- 给 AI 看"好的输出长什么样"

---

### 概念 3：Token

> AI 的 **计费单位** 和 **上下文容量**

**类比：** Token 就像手机流量

| 模型 | 能力 | 成本 | 用途 |
|------|------|------|------|
| Haiku | 基础 | 低 | 简单编排 |
| Sonnet | 强 | 中 | Agent 分析 |
| Opus | 最强 | 高 | 复杂推理 |

> code-analysis 用 Sonnet 跑 Agent，性价比最优

---

### 概念 4：Agent

> 能 **自主完成任务** 的 AI 子进程

**类比：** Agent 就像一个实习生

- 你给它一个任务描述（Prompt）
- 它自己去读代码、分析、写报告
- 最后把结果交回给你

---

### 概念 5：SubAgent

> 被主流程 **调度** 的专用 Agent

```
code-analysis (主编排)
  ├── backend-bug-agent   (后端分析)
  ├── frontend-bug-agent  (前端分析)
  ├── conflict-agent      (冲突分析)
  └── hotfix-case-agent   (用例生成)
```

> 每个 Agent 专注一件事，各司其职

---

### 概念 6：Skill

> 可复用的 **工作流模板**

**类比：** Skill 就像一份 SOP

- `/code-analysis` 是一个 Skill
- `/test-case-gen` 也是一个 Skill
- 每个 Skill 定义了完整的输入-处理-输出流程

---

### 概念 7：Hook

> 事件触发的 **自动化动作**

**类比：** Hook 就像 Git 的 pre-commit 钩子

| 触发时机 | 动作 |
|---------|------|
| 编辑文件后 | 自动格式化 |
| 提交代码前 | 安全检查 |
| 会话结束时 | 审计检查 |

---

### 概念 8：MCP

> AI 连接 **外部工具** 的标准协议

**Model Context Protocol**

```
Claude Code  <--MCP-->  浏览器自动化
             <--MCP-->  Git 操作
             <--MCP-->  GitHub API
             <--MCP-->  ...更多工具
```

> 让 AI 不只是"聊天"，而是能"动手"

---

### 三个设计思想

**1. 模式路由**
不同输入走不同分析链路，而非一个万能 Prompt

**2. 双门禁**
AI 不能悄悄改你的配置，每步需确认

**3. 结构化输出**
Agent 输出 JSON -> 模板渲染 HTML，保证格式稳定

---

### qa-flow 还能做什么

| 命令 | 功能 |
|------|------|
| `/test-case-gen` | PRD -> 测试用例（XMind + MD） |
| `/xmind-editor` | 直接编辑 XMind 用例 |
| `/ui-autotest` | 用例 -> Playwright 脚本 |

> 感兴趣的可以找我一起试

---

<!-- .slide: data-background-color="#1a1a2e" -->

## Q & A

感谢聆听
````

- [ ] **Step 3: 验证文件写入成功**

```bash
wc -l "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/code-analysis-sharing.md"
```

Expected: 约 280-320 行

- [ ] **Step 4: 验证 slide 页数**

```bash
grep -c "^---$" "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/code-analysis-sharing.md"
```

Expected: 约 30-35 个分隔符（对应 31-36 页 slides）

---

### Task 3: 端到端验证

确认所有产出物完整且可用。

**Files:**
- Verify: `$OUT/code-analysis-sharing.md`
- Verify: `$OUT/assets/code-analysis-flow.drawio`
- Verify: `$OUT/assets/code-analysis-flow.png`

- [ ] **Step 1: 检查目录结构**

```bash
find "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/" -type f | sort
```

Expected:
```
.../qa-flow/assets/code-analysis-flow.drawio
.../qa-flow/assets/code-analysis-flow.png
.../qa-flow/code-analysis-sharing.md
```

- [ ] **Step 2: 检查图片引用路径一致性**

```bash
grep "code-analysis-flow" "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/code-analysis-sharing.md"
```

Expected: `![code-analysis 架构流程图](assets/code-analysis-flow.png)` -- 路径与实际文件位置匹配

- [ ] **Step 3: 在 Obsidian 中预览确认**

手动步骤：在 Obsidian 中打开 `code-analysis-sharing.md`，使用 Slides 模式预览，确认：
- 分页正确
- 流程图显示正常
- 表格渲染正确
- 代码块高亮正常
