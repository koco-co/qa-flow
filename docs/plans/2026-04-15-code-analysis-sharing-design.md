# code-analysis 分享设计文档

## 概述

- **主题**：用 `code-analysis` 这个切口，讲清 qa-flow、Claude Code 编排机制，以及 AI 能力如何被工程化放大。
- **时长**：30 分钟。
- **形式**：Obsidian Slides，但页面布局按内部知识库笔记组织，不做传统 PPT 演讲稿结构，不包含 Q&A / 致谢页。
- **风格**：深色科技感，黑底 + 蓝紫高亮 + 少量橙色强调，强调“系统拆解感”和“高级工程感”。
- **目标**：让听众不仅知道怎么用，更知道底层为什么能跑起来，并把“Prompt 工程、Context 工程、Harness 工程”讲透。

## 听众与定位

- **主要听众**：内部 QA / 测试同学，默认知道 AI 聊天工具，但未系统理解 Claude Code 这类 agentic CLI 的工作方式。
- **分享定位**：不是培训手册，而是一篇高密度的内部技术知识笔记；目标是“讲清楚、讲高级、讲出体系感”。
- **切入策略**：`code-analysis` 本身只作为切口，不作为唯一主角。工作流内容控制在约 10 分钟，真正重点放在底层调用链与 AI 原理。

## 核心叙事

整场分享按“10 分钟案例，20 分钟原理”组织：

1. **为什么值得讲 `code-analysis`**
   - 它离真实工作最近：`curl + 日志`、禅道链接、冲突片段都是日常输入。
   - 它足够小：方便讲清楚编排骨架。
   - 它足够全：能自然引出 skill、tool、agent、plugin、template、workspace、LLM 原理。
2. **模式 A 打样讲透**
   - 从 `curl + 日志` 到 HTML Bug 报告。
   - 讲输入结构、输出结果、调用链和工作中的落点。
3. **模式 E 高光补刀**
   - 从禅道链接到 Hotfix Archive MD。
   - 强调“骨架相同，外部集成不同”：plugin、repo/diff、hotfix-case-agent。
4. **把主角切换到原理**
   - 三大跃迁：Prompt 工程 -> Context 工程 -> Harness 工程。
   - Claude Code 如何触发 skill、进入 tool-use loop、调度 subagent / tools。
   - LLM 后台到底在做什么，以及哪些属于项目实锤、哪些属于 Claude Code 公开分析、哪些属于通用大模型知识。

## 讲解框架

模式 A 和模式 E 共用同一套四层拆解法：

1. **用户输入输出层**
   - 输入什么。
   - 产出什么。
   - 用户如何感知“AI 帮我做事了”。
2. **Claude Code 编排层**
   - system prompt / skill 描述注入。
   - 触发 code-analysis。
   - 进入 tool-use loop。
   - 调度 ask / bash / task / plugin / subagent 等能力。
3. **项目工作流层**
   - 模式识别与优先级。
   - 项目选择、源码引用门禁、plugin-loader、agent 分发、模板渲染、落盘路径。
   - 模式 A 与模式 E 在这一层发生分叉。
4. **LLM 原理层**
   - token、上下文拼装、attention、transformer、概率解码、对话状态追踪。
   - 结合外部资料补充 Claude Code / agent 系统常见的记忆、检索、工具调用解释，但明确标注证据来源层级。

## 重点范围

### 主讲内容

- **模式 A**：`curl + 日志 -> backend-bug-agent -> HTML 报告`
- **模式 E**：`禅道链接 -> plugin / repo / diff -> hotfix-case-agent -> Archive MD`
- **三大跃迁**
  - Prompt 工程：如何把模糊任务改造成可稳定执行的流程。
  - Context 工程：如何把技能说明、工具定义、仓库上下文、用户输入拼进一个可用上下文。
  - Harness 工程：如何把模型能力通过 skill、tool、hook、MCP、agent team 固化成可复用系统。
- **Claude Code 底层机制**
  - skill 触发。
  - tool-use loop。
  - subagent / task 调度。
  - command / hook / MCP / plugin 的边界和关系。
- **LLM 后台原理**
  - tokenization。
  - context packing。
  - self-attention / transformer。
  - decoding。
  - 对话状态与工具结果如何进入下一轮推理。

### 一页带过内容

- 模式 B、C、D。
- 其他 workflow：`test-case-gen`、`xmind-editor`、`ui-autotest`。

## 页级结构

正式主稿控制在约 18-20 页，知识库式布局，不做“演讲过场页”：

1. 封面与一句话立意。
2. 为什么 `code-analysis` 值得作为切口。
3. qa-flow 全景一页。
4. 模式总览：A 主讲、E 高光、B/C/D 带过。
5. 模式 A 输入解剖：`curl + 日志`。
6. 模式 A 输出解剖：HTML Bug 报告。
7. 模式 A 总流程图。
8. 模式 A 在 Claude Code 中的调用链。
9. 模式 A 的 Agent / 模板 / 报告落盘 / 工作落点。
10. 模式 E 输入与输出。
11. 模式 E 总流程图。
12. 模式 E 的 plugin / repo / diff / hotfix-case-agent。
13. 三大跃迁：Prompt / Context / Harness。
14. Claude Code 的 agentic loop 与 tool-use 协议。
15. skill、command、hook、MCP、subagent、agent team 关系图。
16. LLM 后台做了什么：token / context / attention / transformer / decoding。
17. 记忆、检索、公开分析与项目实锤的边界说明。
18. 其他 workflow 一页带过。

## 视觉与素材设计

### 视觉语言

- 深色科技感，不做传统大标题 + 大段 bullet 的 PPT。
- 每页都像一篇知识库条目：
  - 标题
  - 金句 / 引用
  - callout
  - 流程图
  - 代码块
  - 路径 / 命令 / 输出样例
  - 对照表

### 图谱设计

使用 `/Users/poco/Projects/CLI-Anything/drawio` 制作 3 张核心图：

1. **模式 A 调用链总图**
   - 用户输入 -> skill 触发 -> 模式识别 -> backend-bug-agent -> 模板渲染 -> HTML 报告。
2. **模式 E 调用链总图**
   - 禅道链接 -> skill 触发 -> plugin-loader / zentao fetch -> repo / diff -> hotfix-case-agent -> Archive MD。
3. **Claude Code / Skill / Tool / Agent / MCP 关系图**
   - 用于解释 Harness 工程和 agentic loop。

Mermaid 只用于简单关系说明；关键图必须由 drawio 绘制，保证观感和可读性。

### 素材来源

- 目标目录中现有的 `初稿.md` 必须吸收。
- `code-analysis-sharing.md` 作为参考素材，不直接沿用其演讲式结构。
- `workspace/` 下已有真实 HTML 报告和 Hotfix 用例可作为截图来源。
- 仓库中的 `.claude/skills/code-analysis/SKILL.md`、agents、plugin-loader、模板、diagram 可作为“项目实锤”依据。

## 证据分层与表达策略

为了既“讲得高级”又“不乱吹”，整份内容按四种证据层级表达：

1. **项目实锤**
   - 直接来自仓库文件、技能定义、脚本、模板、agent、plugin、workspace 产物。
   - 这部分可以明确说“这里就是这样实现的”。
2. **工具可观察行为**
   - Claude Code 在对话中可见的 skill 触发、tool use、subagent 调度、上下文循环。
   - 这部分可以明确说“从行为上可确认”。
3. **公开资料归纳**
   - Claude Code / agentic CLI 的公开分析、博客、泄漏代码解析。
   - 这部分需要标注为“公开分析显示”“常见实现方式”。
4. **通用 LLM 原理**
   - token、attention、transformer、解码、状态追踪。
   - 这部分用来解释“为什么可能做到”，而不是声明“qa-flow 自己实现了这些底层算法”。

## 交付边界

- **本阶段输出**：设计文档。
- **后续实现**：
  - 新建正式版 Obsidian 主稿，保留现有 `初稿.md` 和 `code-analysis-sharing.md`。
  - 生成 drawio 图及导出图片。
  - 将正式主稿写入用户指定的 Obsidian 目录。

## 成功标准

- 观众能在 30 分钟内理解模式 A 与模式 E 的差异和共性。
- 观众能复述 Claude Code 触发 skill、调用工具、调度 agent 的链路。
- 观众能理解三大跃迁：Prompt 工程、Context 工程、Harness 工程。
- 整份内容看起来像“内部系统设计笔记”，而不是普通 PPT。
- “装逼感”来自结构、深度、图谱和证据层次，而不是堆砌术语。
