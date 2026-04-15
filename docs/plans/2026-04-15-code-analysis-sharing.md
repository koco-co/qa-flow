# Code-analysis Sharing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a new knowledge-base-style Obsidian slide deck plus three polished drawio diagrams for a 30-minute internal sharing focused on `code-analysis` modes A and E, Claude Code internals, and the three AI capability leaps.

**Architecture:** The final deliverables live in the user's Obsidian iCloud folder, not in this git repo. Build one new Markdown slide file, reuse the existing drafts and screenshots instead of rewriting from zero, and ground all `code-analysis` claims in repo-truth files before layering on public Claude Code analysis and generic LLM explanations. The deck should spend about 10 minutes on case walkthroughs and 20 minutes on principles: Prompt Engineering, Context Engineering, Harness Engineering, tool-use loops, agent orchestration, and LLM internals.

**Tech Stack:** Obsidian Slides Markdown, callout/table/code-block syntax, `cli-anything-drawio`, qa-flow repo skills/agents/scripts/templates, existing `workspace/` reports and issues, public Claude Code / LLM research.

> Deliverables are outside git-tracked paths, so most tasks end with a save/preview checkpoint instead of a git commit.

---

### Task 1: Create the output structure and slide skeleton

**Files:**
- Create: `/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/code-analysis-sharing-deep-dive.md`
- Create: `/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/`
- Reference: `/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/初稿.md`
- Reference: `/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/code-analysis-sharing.md`
- Reference: `docs/plans/2026-04-15-code-analysis-sharing-design.md`

**Step 1: Create the assets directory**

```bash
mkdir -p "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets"
```

**Step 2: Write the initial slide skeleton**

```markdown
---
theme: moon
transition: slide
---

<style>
.reveal { background: #0b1020; color: #e5e7eb; }
.reveal .slides section { font-size: 0.82em; }
.reveal h1, .reveal h2, .reveal h3 { color: #c4b5fd; }
.reveal code { color: #93c5fd; }
.reveal pre code { max-height: 420px; font-size: 0.52em; line-height: 1.35; }
</style>

# code-analysis 工作流拆解

> 把一个工作流讲清楚不难，难的是把它背后的 AI 编排机制讲出体系感。

---

## 为什么值得讲 `code-analysis`

---

## qa-flow 全景

---

## 模式总览：A 主讲，E 高光

---

## 模式 A · 输入解剖

---

## 模式 A · 输出解剖

---

## 模式 A · 总流程图

---

## 模式 A · Claude Code 调用链

---

## 模式 A · Agent / 模板 / 落盘

---

## 模式 E · 输入与输出

---

## 模式 E · 总流程图

---

## 模式 E · plugin / repo / diff / agent

---

## 三大跃迁：Prompt / Context / Harness

---

## Claude Code 的 agentic loop

---

## 扩展机制：skill / command / hook / MCP / subagent / agent team

---

## LLM 后台做了什么

---

## 记忆 / 检索 / 公开分析与项目实锤的边界

---

## 其他 workflow 一页带过
```

**Step 3: Open the skeleton in Obsidian**

```bash
open -a Obsidian "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/code-analysis-sharing-deep-dive.md"
```

**Step 4: Save a checkpoint**

Expected: the new file opens, slide separators render, and the overall page count matches the approved design.

---

### Task 2: Gather repo-truth for modes A and E

**Files:**
- Modify: `/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/code-analysis-sharing-deep-dive.md`
- Reference: `.claude/skills/code-analysis/SKILL.md`
- Reference: `.claude/agents/backend-bug-agent.md`
- Reference: `.claude/agents/hotfix-case-agent.md`
- Reference: `.claude/scripts/plugin-loader.ts`
- Reference: `.claude/scripts/config.ts`
- Reference: `.claude/scripts/repo-sync.ts`
- Reference: `plugins/zentao/plugin.json`
- Reference: `plugins/zentao/fetch.ts`
- Reference: `templates/bug-report-zentao.html.hbs`
- Reference: `workspace/dataAssets/reports/bugs/20260413/148824-质量报告详情页返回业务异常.html`
- Reference: `workspace/dataAssets/issues/202604/hotfix_5.3.x_147514-自动分级任务卡在运行中状态.md`

**Step 1: Read the exact source-of-truth files**

```bash
sed -n '1,260p' .claude/skills/code-analysis/SKILL.md && printf '\n---\n' && \
sed -n '1,220p' .claude/agents/backend-bug-agent.md && printf '\n---\n' && \
sed -n '1,240p' .claude/agents/hotfix-case-agent.md && printf '\n---\n' && \
sed -n '1,260p' .claude/scripts/plugin-loader.ts && printf '\n---\n' && \
sed -n '1,120p' plugins/zentao/plugin.json
```

**Step 2: Distill the Mode A call chain into slide content**

Write these concrete bullets into the Mode A slides:

```markdown
> [!info] 项目实锤
> `code-analysis` 在模式 A 会派发 `backend-bug-agent`，输出结构化 JSON，再用 HTML 模板渲染报告。

1. 用户输入 `curl + 日志`
2. Claude Code 触发 `code-analysis`
3. skill 识别为模式 A
4. 询问项目 / 源码引用门禁
5. 派发 `backend-bug-agent`
6. 生成结构化报告数据
7. 用 `bug-report-zentao.html.hbs` 渲染 HTML
8. 写入 `workspace/<project>/reports/bugs/<date>/`
```

**Step 3: Distill the Mode E call chain into slide content**

Write these concrete bullets into the Mode E slides:

```markdown
> [!info] 项目实锤
> 模式 E 本质上没有换骨架，只是把输入源换成了禅道插件，把后处理换成了 Hotfix 用例生成。

1. 用户输入禅道 `bug-view-*.html`
2. Claude Code 触发 `code-analysis`
3. skill 识别为模式 E
4. `plugin-loader` 根据 `plugins/zentao/plugin.json` 解析 fetch 命令
5. `plugins/zentao/fetch.ts` 抓取 bug 标题、严重级别、修复分支、步骤
6. 选择项目 / 锁定 repo / 可选 repo-sync
7. 读取 `git diff`
8. 派发 `hotfix-case-agent`
9. 产出 Archive Markdown 到 `workspace/<project>/issues/<YYYYMM>/`
```

**Step 4: Add the “B/C/D 一页带过” framing**

```markdown
> [!tip]
> 模式 B / C / D 与 A / E 的差异，主要在输入信号和后处理模板，编排骨架并没有本质变化。
```

**Step 5: Save a checkpoint**

Expected: slides 4-12 contain only evidence-backed statements that can be traced to repo files or real artifacts.

---

### Task 3: Gather public Claude Code and AI principle sources

**Files:**
- Modify: `/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/code-analysis-sharing-deep-dive.md`
- Reference: `docs/plans/2026-04-15-code-analysis-sharing-design.md`

**Step 1: Search for Claude Code internals and tool-use explanations**

Use `web_search` with these exact queries:

1. `Claude Code skill system prompt tool use loop analysis`
2. `Claude Code hooks MCP subagent architecture`
3. `Claude Code leaked source tool use skills analysis`

Expected: 3-5 public sources that explain how Claude Code-like agent CLIs inject prompts, select skills, and iterate on tool results.

**Step 2: Search for the three AI capability leaps**

Use `web_search` with these exact queries:

1. `prompt engineering context engineering harness engineering`
2. `AI harness engineering agent systems`
3. `context engineering agents tool use`

Expected: concise definitions that let you contrast the three leaps in one slide and map them onto qa-flow.

**Step 3: Search for LLM backend explanations**

Use `web_search` with these exact queries:

1. `tokenization attention transformer decoding explanation`
2. `agentic loop context packing tool results LLM`
3. `memory retrieval hybrid search reranking agent systems`

Expected: enough background to explain token, context packing, attention, transformer, decoding, and to separate “通用机制” from “项目实锤”.

**Step 4: Write the evidence-tier slide**

```markdown
| 层级 | 可以说多满 | 来源 |
| --- | --- | --- |
| 项目实锤 | 100% 直接断言 | repo 文件 / workspace 产物 |
| 工具可观察行为 | 90% 直接断言 | Claude Code 可见的 tool loop |
| 公开资料归纳 | 明确标注“公开分析” | 博客 / 泄漏代码解析 |
| 通用 LLM 原理 | 解释为什么可能做到 | token / attention / transformer 常识 |
```

**Step 5: Save a checkpoint**

Expected: every “Claude Code 后台干了什么” statement can be tagged as repo-truth, observable behavior, public analysis, or generic LLM theory.

---

### Task 4: Install and verify the drawio CLI harness

**Files:**
- Reference: `/Users/poco/Projects/CLI-Anything/drawio/agent-harness/cli_anything/drawio/README.md`

**Step 1: Install the CLI harness**

```bash
cd /Users/poco/Projects/CLI-Anything/drawio/agent-harness && pip install -e .
```

**Step 2: Verify the CLI surface**

```bash
cli-anything-drawio shape types && printf '\n---\n' && \
cli-anything-drawio connect styles && printf '\n---\n' && \
cli-anything-drawio export formats
```

**Step 3: Save a checkpoint**

Expected: the CLI lists shape types, connector styles, and export formats without error.

---

### Task 5: Create the Mode A flow diagram

**Files:**
- Create: `/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-mode-a-flow.drawio`
- Create: `/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-mode-a-flow.png`

**Step 1: Create the diagram project**

```bash
P="/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-mode-a-flow.drawio"
cli-anything-drawio project new --preset letter -o "$P"
```

**Step 2: Add the Mode A nodes**

```bash
P="/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-mode-a-flow.drawio"

cli-anything-drawio --project "$P" shape add rounded --id input --label "用户输入\ncurl + 日志" --x 40 --y 180 -w 140 -h 70
cli-anything-drawio --project "$P" shape add diamond --id skill --label "触发\ncode-analysis" --x 230 --y 175 -w 150 -h 80
cli-anything-drawio --project "$P" shape add diamond --id route --label "模式识别\nA / B / C / D / E" --x 440 --y 175 -w 170 -h 80
cli-anything-drawio --project "$P" shape add hexagon --id gate --label "项目选择\n源码门禁" --x 670 --y 175 -w 170 -h 80
cli-anything-drawio --project "$P" shape add process --id agent --label "backend-bug-agent" --x 900 --y 180 -w 180 -h 70
cli-anything-drawio --project "$P" shape add process --id template --label "HTML 模板渲染\nbug-report-zentao" --x 1140 --y 180 -w 180 -h 70
cli-anything-drawio --project "$P" shape add rounded --id output --label "HTML 报告\nworkspace/.../reports/bugs" --x 1380 --y 180 -w 200 -h 70

cli-anything-drawio --project "$P" shape add note --id prompt --label "Prompt 工程" --x 60 --y 80 -w 120 -h 40
cli-anything-drawio --project "$P" shape add note --id context --label "Context 工程" --x 700 --y 80 -w 120 -h 40
cli-anything-drawio --project "$P" shape add note --id harness --label "Harness 工程" --x 1160 --y 80 -w 130 -h 40
```

**Step 3: Connect and style the nodes**

```bash
P="/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-mode-a-flow.drawio"

cli-anything-drawio --project "$P" connect add input skill --style orthogonal
cli-anything-drawio --project "$P" connect add skill route --style orthogonal
cli-anything-drawio --project "$P" connect add route gate --style orthogonal
cli-anything-drawio --project "$P" connect add gate agent --style orthogonal
cli-anything-drawio --project "$P" connect add agent template --style orthogonal
cli-anything-drawio --project "$P" connect add template output --style orthogonal

for id in input output; do
  cli-anything-drawio --project "$P" shape style "$id" fillColor "#1E293B"
  cli-anything-drawio --project "$P" shape style "$id" fontColor "#F8FAFC"
done

for id in skill route; do
  cli-anything-drawio --project "$P" shape style "$id" fillColor "#7C3AED"
  cli-anything-drawio --project "$P" shape style "$id" fontColor "#F8FAFC"
done

for id in gate; do
  cli-anything-drawio --project "$P" shape style "$id" fillColor "#F97316"
  cli-anything-drawio --project "$P" shape style "$id" fontColor "#F8FAFC"
done

for id in agent template; do
  cli-anything-drawio --project "$P" shape style "$id" fillColor "#0F766E"
  cli-anything-drawio --project "$P" shape style "$id" fontColor "#ECFEFF"
done
```

**Step 4: Export the diagram**

```bash
cli-anything-drawio --project "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-mode-a-flow.drawio" export render "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-mode-a-flow.png" -f png
```

**Step 5: Verify the file exists**

```bash
ls -lh "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-mode-a-flow.png"
```

Expected: PNG exists and is non-empty.

---

### Task 6: Create the Mode E flow diagram

**Files:**
- Create: `/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-mode-e-flow.drawio`
- Create: `/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-mode-e-flow.png`

**Step 1: Create the diagram project**

```bash
P="/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-mode-e-flow.drawio"
cli-anything-drawio project new --preset letter -o "$P"
```

**Step 2: Add the Mode E nodes**

```bash
P="/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-mode-e-flow.drawio"

cli-anything-drawio --project "$P" shape add rounded --id input --label "用户输入\n禅道 bug 链接" --x 30 --y 200 -w 150 -h 70
cli-anything-drawio --project "$P" shape add diamond --id skill --label "触发\ncode-analysis" --x 220 --y 195 -w 150 -h 80
cli-anything-drawio --project "$P" shape add diamond --id route --label "模式 E\nHotfix" --x 420 --y 195 -w 150 -h 80
cli-anything-drawio --project "$P" shape add process --id plugin --label "plugin-loader\nresolve" --x 620 --y 200 -w 170 -h 70
cli-anything-drawio --project "$P" shape add process --id fetch --label "plugins/zentao/fetch.ts" --x 840 --y 200 -w 190 -h 70
cli-anything-drawio --project "$P" shape add process --id repo --label "项目选择 / repo-sync /\ngit diff" --x 1080 --y 195 -w 190 -h 80
cli-anything-drawio --project "$P" shape add process --id agent --label "hotfix-case-agent" --x 1320 --y 200 -w 180 -h 70
cli-anything-drawio --project "$P" shape add rounded --id output --label "Archive MD\nworkspace/.../issues" --x 1550 --y 200 -w 180 -h 70

cli-anything-drawio --project "$P" shape add note --id ext --label "外部系统集成" --x 860 --y 95 -w 130 -h 40
cli-anything-drawio --project "$P" shape add note --id harness --label "Harness 工程" --x 1325 --y 95 -w 130 -h 40
```

**Step 3: Connect and style the nodes**

```bash
P="/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-mode-e-flow.drawio"

cli-anything-drawio --project "$P" connect add input skill --style orthogonal
cli-anything-drawio --project "$P" connect add skill route --style orthogonal
cli-anything-drawio --project "$P" connect add route plugin --style orthogonal
cli-anything-drawio --project "$P" connect add plugin fetch --style orthogonal
cli-anything-drawio --project "$P" connect add fetch repo --style orthogonal
cli-anything-drawio --project "$P" connect add repo agent --style orthogonal
cli-anything-drawio --project "$P" connect add agent output --style orthogonal

for id in input output; do
  cli-anything-drawio --project "$P" shape style "$id" fillColor "#111827"
  cli-anything-drawio --project "$P" shape style "$id" fontColor "#F9FAFB"
done

for id in skill route; do
  cli-anything-drawio --project "$P" shape style "$id" fillColor "#8B5CF6"
  cli-anything-drawio --project "$P" shape style "$id" fontColor "#F9FAFB"
done

for id in plugin fetch repo agent; do
  cli-anything-drawio --project "$P" shape style "$id" fillColor "#1D4ED8"
  cli-anything-drawio --project "$P" shape style "$id" fontColor "#EFF6FF"
done
```

**Step 4: Export and verify**

```bash
cli-anything-drawio --project "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-mode-e-flow.drawio" export render "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-mode-e-flow.png" -f png && \
ls -lh "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/code-analysis-mode-e-flow.png"
```

Expected: PNG exists and is non-empty.

---

### Task 7: Create the Claude Code / Harness relationship diagram

**Files:**
- Create: `/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/claude-code-harness-map.drawio`
- Create: `/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/claude-code-harness-map.png`

**Step 1: Create the diagram project**

```bash
P="/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/claude-code-harness-map.drawio"
cli-anything-drawio project new --preset letter -o "$P"
```

**Step 2: Add the relationship-map nodes**

```bash
P="/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/claude-code-harness-map.drawio"

cli-anything-drawio --project "$P" shape add rounded --id user --label "User Prompt" --x 80 --y 220 -w 130 -h 60
cli-anything-drawio --project "$P" shape add process --id system --label "System Prompt\n(tool defs + rules + skills)" --x 280 --y 210 -w 180 -h 80
cli-anything-drawio --project "$P" shape add diamond --id llm --label "LLM 推理" --x 540 --y 205 -w 150 -h 90
cli-anything-drawio --project "$P" shape add process --id tools --label "Tool Use" --x 760 --y 220 -w 140 -h 60
cli-anything-drawio --project "$P" shape add process --id mcp --label "MCP" --x 760 --y 330 -w 140 -h 60
cli-anything-drawio --project "$P" shape add process --id skills --label "Skills / Commands" --x 760 --y 110 -w 170 -h 60
cli-anything-drawio --project "$P" shape add process --id agents --label "Subagent / Agent Team" --x 980 --y 220 -w 190 -h 60
cli-anything-drawio --project "$P" shape add rounded --id result --label "Tool Result / New Context" --x 1230 --y 220 -w 200 -h 60
cli-anything-drawio --project "$P" shape add note --id prompt --label "Prompt Engineering" --x 280 --y 90 -w 140 -h 40
cli-anything-drawio --project "$P" shape add note --id context --label "Context Engineering" --x 520 --y 90 -w 140 -h 40
cli-anything-drawio --project "$P" shape add note --id harness --label "Harness Engineering" --x 980 --y 90 -w 150 -h 40
```

**Step 3: Connect and style the map**

```bash
P="/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/claude-code-harness-map.drawio"

cli-anything-drawio --project "$P" connect add user system --style orthogonal
cli-anything-drawio --project "$P" connect add system llm --style orthogonal
cli-anything-drawio --project "$P" connect add llm tools --style orthogonal
cli-anything-drawio --project "$P" connect add llm mcp --style orthogonal
cli-anything-drawio --project "$P" connect add llm skills --style orthogonal
cli-anything-drawio --project "$P" connect add tools agents --style orthogonal
cli-anything-drawio --project "$P" connect add skills agents --style orthogonal
cli-anything-drawio --project "$P" connect add mcp result --style orthogonal
cli-anything-drawio --project "$P" connect add agents result --style orthogonal
cli-anything-drawio --project "$P" connect add result llm --style curved

for id in user result; do
  cli-anything-drawio --project "$P" shape style "$id" fillColor "#0F172A"
  cli-anything-drawio --project "$P" shape style "$id" fontColor "#F8FAFC"
done

cli-anything-drawio --project "$P" shape style system fillColor "#312E81"
cli-anything-drawio --project "$P" shape style system fontColor "#EEF2FF"
cli-anything-drawio --project "$P" shape style llm fillColor "#7C3AED"
cli-anything-drawio --project "$P" shape style llm fontColor "#F5F3FF"

for id in tools mcp skills agents; do
  cli-anything-drawio --project "$P" shape style "$id" fillColor "#0F766E"
  cli-anything-drawio --project "$P" shape style "$id" fontColor "#ECFEFF"
done
```

**Step 4: Export and verify**

```bash
cli-anything-drawio --project "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/claude-code-harness-map.drawio" export render "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/claude-code-harness-map.png" -f png && \
ls -lh "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/claude-code-harness-map.png"
```

Expected: PNG exists and is non-empty.

---

### Task 8: Write the case-study slides for modes A and E

**Files:**
- Modify: `/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/code-analysis-sharing-deep-dive.md`
- Reference: `/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/初稿.md`
- Reference: `/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/code-analysis-sharing.md`
- Reference: `/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/Resources/`
- Reference: `workspace/dataAssets/reports/bugs/20260413/148824-质量报告详情页返回业务异常.html`
- Reference: `workspace/dataAssets/issues/202604/hotfix_5.3.x_147514-自动分级任务卡在运行中状态.md`

**Step 1: Write the intro and mode overview slides**

Use this structure:

```markdown
## 为什么值得讲 `code-analysis`

> [!quote]
> `code-analysis` 没有最复杂，但它最适合把 AI 编排机制讲清楚。

| 输入信号 | 产物 | 价值 |
| --- | --- | --- |
| curl + 日志 | HTML Bug 报告 | 把排障经验结构化 |
| 禅道链接 | Hotfix Archive MD | 把修复验证流程模板化 |
| 冲突片段 | HTML 冲突报告 | 把合并判断标准显性化 |
```

**Step 2: Write the Mode A slides**

Use this pattern:

```markdown
## 模式 A · 输入解剖

> [!example]
> 用户并不是在“描述问题”，而是在给 AI 一份可解析信号包。

```bash
curl 'http://example/api'
...
Caused by: java.lang.NullPointerException
```

## 模式 A · 输出解剖

> [!success]
> 最终产物不是一句解释，而是一份可复用、可归档、可贴禅道的 HTML 报告。

![[01 - 个人工作台/qa-flow/Resources/148824-质量报告详情页返回业务异常.html]]
```

**Step 3: Write the Mode E slides**

Use this pattern:

```markdown
## 模式 E · 输入与输出

```text
http://zenpms.dtstack.cn/zentao/bug-view-147514.html
```

> [!info]
> 从用户视角看只是一个链接；从系统视角看，这是插件、项目、repo、diff、agent 的联合触发器。

![[01 - 个人工作台/qa-flow/Resources/Pasted image 20260415100849.png]]
```

**Step 4: Embed the diagrams**

```markdown
![](assets/code-analysis-mode-a-flow.png)

![](assets/code-analysis-mode-e-flow.png)
```

**Step 5: Save a checkpoint**

Expected: slides 1-12 are readable without live narration and visibly absorb the Mode A/E content from the old drafts.

---

### Task 9: Write the principle-heavy slides

**Files:**
- Modify: `/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/code-analysis-sharing-deep-dive.md`

**Step 1: Write the “three leaps” slide**

```markdown
## 三大跃迁：Prompt / Context / Harness

| 跃迁 | 解决的问题 | 在这次分享里的映射 |
| --- | --- | --- |
| Prompt 工程 | 让模型按要求说话 | `code-analysis` 的模式规则、输出契约、门禁提示 |
| Context 工程 | 让模型看到够用的信息 | system prompt、skill frontmatter、tool defs、repo 文件、用户输入 |
| Harness 工程 | 让模型真正能做事 | skills、commands、hooks、MCP、subagent、agent team |
```

**Step 2: Write the agentic loop and extension-mechanism slides**

```markdown
## Claude Code 的 agentic loop

1. 用户输入进入上下文
2. system prompt 注入规则与工具定义
3. LLM 决定输出文本还是 tool call
4. 外部系统执行工具
5. tool result 回灌上下文
6. LLM 继续推理直到交付

![](assets/claude-code-harness-map.png)
```

**Step 3: Write the LLM backend slide**

```markdown
## LLM 后台做了什么

- Tokenization：把输入切成 token
- Context packing：把用户输入、规则、工具结果拼进上下文窗口
- Self-attention：在当前上下文内决定“该关注谁”
- Transformer：多层表示变换，形成下一步预测分布
- Decoding：按概率逐 token 生成文本或 tool call
- State tracking：通过消息历史与 tool result 维持多轮任务连续性
```

**Step 4: Write the evidence-boundary slide**

```markdown
> [!warning]
> “项目实锤”与“公开分析”必须分开讲：前者说明 qa-flow 就是这么做的，后者说明 Claude Code 或 agent CLI 常见会这么做。
```

**Step 5: Save a checkpoint**

Expected: the deck now feels like a technical note about AI systems, not just a workflow demo.

---

### Task 10: Integrate, preview, and polish

**Files:**
- Modify: `/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/code-analysis-sharing-deep-dive.md`
- Reference: `/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/`

**Step 1: Check that all required topics are present**

```bash
rg -n "模式 A|模式 E|Prompt 工程|Context 工程|Harness 工程|agentic loop|LLM 后台|MCP|subagent" "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/code-analysis-sharing-deep-dive.md"
```

**Step 2: Ensure forbidden “PPT ending” language is gone**

```bash
rg -n "Q&A|致谢|感谢聆听|谢谢" "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/code-analysis-sharing-deep-dive.md"
```

Expected: no matches.

**Step 3: Ensure all three PNG assets exist**

```bash
ls -lh "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/assets/"*.png
```

**Step 4: Open the final deck in Obsidian and review it page by page**

```bash
open -a Obsidian "/Users/poco/Library/Mobile Documents/iCloud~md~obsidian/Documents/01 - 个人工作台/qa-flow/code-analysis-sharing-deep-dive.md"
```

**Step 5: Do a final polish pass**

Checklist:

1. Every slide can stand alone without spoken filler.
2. Mode A is clearly the main case study.
3. Mode E reads as the same orchestration skeleton with different integrations.
4. The three leaps are explicit, memorable, and tied to qa-flow.
5. The deck looks like an internal system note, not a training PPT.
