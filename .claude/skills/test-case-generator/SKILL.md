---
name: test-case-generator
description: QA 测试用例生成主编排 Skill。一键触发完整自动化流程：PRD 增强（页面要点提炼 + 健康度预检）→ Brainstorming + 解耦分析 → Checklist 预览 → 并行生成用例 → 评审 → 输出 XMind。当用户说「生成测试用例」「生成用例」「写用例」「写测试用例」「根据需求文档生成用例」「为 Story-xxx 生成用例」「test case」「重新生成 xxx 模块」「追加用例」时触发。支持 --quick 快速模式、模块级重跑和断点续传。**也支持直接输入蓝湖 URL**：当用户提供 lanhuapp.com 链接时，自动通过蓝湖 MCP 工具提取 PRD 内容后进入完整流程；相关触发词：「从蓝湖导入」「蓝湖 URL」「lanhuapp.com」。
---

# 测试用例生成编排 Skill

本 Skill 遵循 CLAUDE.md「编排说明」章节，按步骤自主执行。
每个步骤的详细行为在 `prompts/step-<id>.md` 中。

> 当 config.repos 非空时：测试用例生成前必须先读取 config.json 的 `branchMapping` 字段所指向的映射文件，完成源码分支同步，并将 Lanhu/raw PRD 先整理为**正式需求文档**；不要直接拿原始蓝湖文本写用例。

> ⚠️ **用例编写硬性规则**见 `rules/test-case-writing.md`（标题"验证"开头、禁止步骤编号、首步进入页面、正常/异常用例原则、禁止模糊词、预期结果规范）。Writer/Reviewer 必须遵循，本文件仅定义编排流程。

---

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
| 澄清简化 | 所有场景 | 最多 3 个问题，仅 Tier 1（字段定义/页面清单/验收标准），1 轮 Q&A；评分 >= 70% 自动跳过 |
| Writer 合并 | 预估总用例数 ≤ 30 条 | 使用单个 Writer，不拆分模块 |
| Reviewer 降级 | 所有场景 | 仅执行 1 轮修正，问题率阻断阈值放宽到 50% |
| formalize 简化 | config.repos 为空时 | 跳过 prd-formalize 步骤，直接 raw → enhance |
| Writer reference 精简加载 | 所有场景 | 加载「源码分析」章节，跳过其余章节 |
| 历史用例检索 | 所有场景 | **执行**（仅索引检索+文件路径传入，不做解耦讨论） |
| 需求解耦分析 | 所有场景 | 跳过（快速模式用单 Writer） |

---

## 步骤顺序定义（canonical）

以下 step ID 为全局唯一标识，`.qa-state.json` 的 `last_completed_step` 必须使用这些字符串值：

| 序号 | step ID | 快速模式 | 说明 |
|------|---------|----------|------|
| 0 | _(初始)_ | — | 未开始，`last_completed_step` = `0`（唯一保留的数字值） |
| 1 | `parse-input` | 执行 | 指令解析、蓝湖 URL 检测、断点续传 |
| 1.5 | `req-elicit` | **简化执行** | 需求澄清：可测试性评估 + 3-7 个问题 + 补全 raw PRD（快速模式最多 3 问） |
| 2 | `source-sync` | 执行 | 源码分支同步（config.repos 为空时跳过） |
| 3 | `prd-formalize` | 执行 | PRD 形式化（config.repos 为空时跳过） |
| 4 | `prd-enhancer` | 执行 | PRD 增强 + 页面要点提炼 + 健康度预检 |
| 5 | `brainstorm` | **部分执行** | 历史用例检索（执行） + Brainstorming + 解耦分析（跳过） |
| 6 | `checklist` | **跳过** | Checklist 预览 + 用户确认 |
| 7 | `writer` | 执行 | 并行 Writer Subagents |
| 8 | `reviewer` | 执行 | Reviewer Subagent（质量阈值 15%/40%） |
| 9 | `xmind` | 执行 | XMind 输出 |
| 10 | `archive` | 执行 | 归档 MD 同步 + 用户验证 |
| 11 | `notify` | 执行 | 清理（终态，写入后立即删除状态文件） |

续传时根据 `last_completed_step` 在此表中的位置确定下一步。

---

## 工作流步骤

| 序号 | 步骤 ID | prompt 文件 | 快速模式 | 说明 |
|------|---------|-------------|----------|------|
| 1 | parse-input | `step-parse-input.md` | 执行 | 指令解析、蓝湖 URL 检测、断点续传检测、状态初始化、源码验证、历史检查 |
| 1.5 | req-elicit | `step-req-elicit.md` | **简化执行** | 需求澄清：可测试性评估 + 问题提问 + 答案收集 + 追加澄清结果到 PRD |
| 2 | source-sync | `step-source-sync.md` | 执行 | 源码分支同步（config.repos 为空时跳过） |
| 3 | prd-formalize | `step-prd-formalize.md` | 执行 | PRD 形式化（结合源码，config.repos 为空时跳过） |
| 4 | prd-enhancer | `step-prd-enhancer.md` | 执行 | PRD 增强 + 页面要点提炼 + 健康度预检 |
| 5 | brainstorm | `step-brainstorm.md` | **部分执行** | 历史用例检索（快速模式也执行） + Brainstorming + 解耦分析（快速模式跳过） |
| 6 | checklist | `step-checklist.md` | **跳过** | Checklist 预览 + 用户一次确认 |
| 7 | writer | `writer-subagent.md` | 执行 | 并行 Writer Subagents（多 agent 同时生成） |
| 8 | reviewer | `reviewer-subagent.md` | 执行 | Reviewer Subagent（含质量阈值 15%/40%） |
| 9 | xmind | `step-xmind.md` | 执行 | XMind 输出（支持 --append 追加模式） |
| 10 | archive | `step-archive.md` | 执行 | 归档 MD 同步 + 用户验证提示 |
| 11 | notify | `step-notify.md` | 执行 | 用户验证后清理 |

---

## 执行协议

1. 定位状态文件路径（规则见 `step-parse-input.md` 1.2 节）：
   - 单 PRD 生成：`<working-dir>/.qa-state-{prd-slug}.json`（prd-slug = 目标 PRD 文件名去掉 .md）
   - 批量生成（目录下全部 PRD）：`<working-dir>/.qa-state.json`
2. 读取状态文件，确定当前进度；若不存在则创建初始状态
3. 初始状态：`{ "last_completed_step": 0, "writers": {}, "reviewer_status": "pending", "awaiting_verification": false, "created_at": "<ISO8601>" }`
4. 从 `last_completed_step` 的下一步开始，按工作流步骤表顺序执行
5. **快速模式**：步骤 5（brainstorm）仅执行历史用例检索，跳过 Brainstorming 讨论和解耦分析；跳过步骤 6（checklist）
6. 每步完成后，将状态文件的 `last_completed_step` 更新为该步骤 ID
6. **Writer 步骤**：
   - **6a. 注入源码仓库路径**：从 `.qa-state.json` 的 `source_context`（source-sync 步骤已写入）读取前端/后端仓库绝对路径与分支名，填入 Writer prompt 的对应占位符。若 config.repos 为空，填入「无」，Writer 仅按 PRD 编写
   - **6b. 历史用例检索（快速模式也执行）**：若 brainstorm 步骤已跳过，编排器在此处执行历史用例检索（同 step-brainstorm.md 3.1 中的索引查询逻辑），将匹配的文件路径和已覆盖功能点填入 Writer prompt
   - **6c. 启动 Writer Agents**：并行启动 `case-writer` agents，在 `writers` 字典中跟踪各 agent 状态，每个 Agent 返回后立即检查是否包含 `## BLOCKED` 标记（见 6d），等所有 Writer 均为 `completed` 或 `skipped` 后才进入 Reviewer
   - **6d. BLOCKED 中转协议**（Writer 或 Reviewer 返回 `## BLOCKED` 时触发）：
     1. 将该 Writer 状态写为 `blocked`，解析 BLOCKED 内容，将所有问题（含推测答案、所在位置）写入 `writers.<name>.blocked_questions`
     2. **逐条确认**：编排器对每个问题**单独**向用户提问，每次只展示一个，等收到答案后再展示下一个：
        ```
        ⚠️ Writer「<模块名>」在编写「<所在位置>」时需要你确认（第 X/N 个问题）：

        **[类型]** <问题描述>

        源码中找到的候选：
          ① <候选1>
          ② <候选2>
          （若源码未找到，展示执行过的查找命令）

        PRD 线索：<PRD中的相关原文或"无">

        请回复序号（如「①」）选择候选，或直接输入正确答案：
        ```
        > 如果 `源码候选` 是"源码未找到"，则展示为：
        > `源码中未找到相关配置（已搜索：<查找命令摘要>），请直接告诉我：`
     3. 每收到一个答案立即记录，继续展示下一个问题，直到该 Writer 的所有问题确认完毕
     4. **多个 Writer 同时 blocked 时**：先处理完第一个 Writer 的所有问题，再处理下一个 Writer 的问题，不混合展示
     5. 所有问题确认完毕后，将答案汇总写入 `writers.<name>.confirmed_answers`，重新启动该 Writer Agent，在 prompt 末尾追加：
        ```
        ## 已确认信息（用户提供，优先于 PRD，不可覆盖）

        1. <问题1> → <用户答案1>
        2. <问题2> → <用户答案2>
        ```
     6. 若重新启动后仍返回 `## BLOCKED`（新问题），重复上述流程；同一问题不得重复追问（答案已给出则必须直接使用）
6.5. **Writer 自动重试**：若 Writer Agent 返回错误（crash / 超时 / 输出非法 JSON），编排器自动重试 1 次：
   - 将 `writers.<name>.status` 从 `failed` 改为 `in_progress`
   - 在 `writers.<name>` 中记录 `retry_count: 1`
   - 使用相同输入重新启动该 Writer Agent
   - 第 2 次仍失败 → 标记为终态 `failed`（`retry_count: 1` 保留），向用户展示：
     ```
     Writer「<模块名>」重试后仍然失败：<错误摘要>

     选项：
     A. 跳过此模块，其余用例正常输出
     B. 手动排查后告诉我重试
     ```
   - 用户选 A → `writers.<name>.status = "skipped"`，进入 Writer 收敛判断
   - 用户选 B → 等待用户指令
   - **自动重试在编排器内部完成，第 1 次重试不需要用户确认**
7. **Reviewer 步骤（两层模型）**：
   - **Layer 1 — 分片审查**：
     - 总用例数 ≤ 80 条 → 单个 `case-reviewer` Agent，执行完整流程（任务 1-4 + 查漏补缺 + 去重）
     - 总用例数 > 80 条 → 拆分为 2 个并行 `case-reviewer` Agent，各自执行任务 1-2（格式修正）+ 任务 4（优化建议）
   - **Layer 2 — 全局总审**（仅 >80 条时触发）：
     a. 编排器合并两份 Shard JSON（按 module name 合并 pages）
     b. 启动 1 个 `case-reviewer` Agent，传入合并后的完整 JSON，仅执行**任务 3（查漏补缺）+ 历史用例去重 + 跨分片同名用例去重**
     c. 该 Agent 的 prompt 中标注 `mode: "global-review"`，跳过任务 1/2/4
   - 任一 Layer 1 Reviewer 问题率 > 40% → 整体阻断，`reviewer_status: "escalated"`
8. 全部步骤完成后删除当前 PRD 对应的状态文件（`.qa-state-{prd-slug}.json` 或 `.qa-state.json`）

---

## .qa-state.json 关键状态速查

- `last_completed_step`：已完成的最后一步编号（数字 0 = 未开始，或步骤 ID 字符串）
- `writers[*].status`：`pending` / `in_progress` / `completed` / `failed` / `skipped`
- `reviewer_status`：`pending` / `completed` / `escalated`
- `awaiting_verification`：`true` 时说明 archive 已完成，等待用户验收后执行 notify

| 场景 | 状态行为 |
|------|----------|
| 新流程初始化 | `last_completed_step: 0`、`awaiting_verification: false`、`reviewer_status: "pending"` |
| 等待验证续传 | `awaiting_verification: true` → 重新展示验证提示，不重跑 archive |
| Writer 收敛 | 所有 Writer `completed/skipped` 后才推进至 reviewer |
| Reviewer 阻断 | `reviewer_status: "escalated"` → 等待用户决策 |
| Writer 自动重试 | `writers[*].retry_count: 1` → 已重试 1 次；第 2 次失败才需要用户介入 |
| 终态清理 | notify 完成后删除当前 PRD 对应的状态文件（`.qa-state-{prd-slug}.json` 或 `.qa-state.json`） |

---

## 模块级重跑流程

1. 读取当前 PRD 的状态文件（`.qa-state-{prd-slug}.json` 或 `.qa-state.json`）确认 Writer 拆分信息
2. 复用已有 `-enhanced.md`（不重新增强）
3. 仅重启指定 Writer，输出到 `temp/<模块>.json`
4. 重新执行 Reviewer（合并新旧 JSON）
5. 更新 XMind（`--replace` 模式替换同名 L1 节点）
6. 不删除当前 PRD 的状态文件

---

## 参考文件

- `references/elicitation-dimensions.md` — 需求澄清维度定义、评分规则和问题模板
- `references/decoupling-heuristics.md` — 需求解耦判断规则
- `references/intermediate-format.md` — 中间 JSON 输出格式 Schema
- `references/qa-state-contract.md` — .qa-state.json 断点续传状态定义（从 intermediate-format 拆出）
- `prompts/writer-subagent.md` — Writer Subagent 提示词模板
- `prompts/writer-subagent-reference.md` — Writer Subagent 扩展参考（按需加载）
- `prompts/reviewer-subagent.md` — Reviewer Subagent 提示词模板（含质量阈值）
- `.claude/skills/archive-converter/scripts/json-to-archive-md.mjs` — 归档 MD 转换脚本
- `.claude/skills/archive-converter/scripts/convert-history-cases.mjs` — 历史用例转化脚本

## 关联 Skills

- `prd-enhancer` — PRD 增强 + 页面信息提炼 + 增量 diff + 健康度预检（step prd-enhancer）
- `xmind-converter` — JSON 转 XMind，支持 --append（step xmind）
- `archive-converter` — 历史用例归档转化，CSV/XMind → MD（step parse-input 1.5）
