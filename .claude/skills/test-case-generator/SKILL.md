---
name: test-case-generator
description: QA 测试用例生成主编排 Skill。一键触发完整自动化流程：PRD 增强 → 健康度预检 → Brainstorming + 解耦分析 → Checklist 预览 → 并行生成用例 → 评审 → 输出 XMind。当用户说「生成测试用例」「生成用例」「写用例」「写测试用例」「根据需求文档生成用例」「为 Story-xxx 生成用例」「test case」「重新生成 xxx 模块」「追加用例」时触发。支持 --quick 快速模式、模块级重跑和断点续传。**也支持直接输入蓝湖 URL**：当用户提供 lanhuapp.com 链接时，自动通过 lanhu-mcp 提取 PRD 内容后进入完整流程；相关触发词：「从蓝湖导入」「蓝湖 URL」「lanhuapp.com」。
---

# 测试用例生成编排 Skill

本 Skill 遵循 CLAUDE.md「工作流总览（10 步）」章节，按步骤自主执行。
每个步骤的详细行为在 `prompts/step-<id>.md` 中。

> DTStack 特殊规则：测试用例生成前必须先读取 `config/repo-branch-mapping.yaml`，完成源码分支同步，并将 Lanhu/raw PRD 先整理为**正式需求文档**；不要直接拿原始蓝湖文本写用例。

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
| Writer 合并 | 预估总用例数 ≤ 30 条 | 使用单个 Writer，不拆分模块 |
| Reviewer 降级 | 所有场景 | 仅执行 1 轮修正，问题率阻断阈值放宽到 50% |
| formalize 简化 | 非 DTStack 模块 | 跳过 prd-formalize 步骤，直接 raw → enhance |
| Writer reference 精简加载 | 所有场景 | 加载「源码分析」和「DTStack 额外要求」章节，跳过其余章节 |
| 历史用例检索 | 所有场景 | **执行**（仅索引检索+文件路径传入，不做解耦讨论） |
| 需求解耦分析 | 所有场景 | 跳过（快速模式用单 Writer） |

---

## 步骤顺序定义（canonical）

以下 step ID 为全局唯一标识，`.qa-state.json` 的 `last_completed_step` 必须使用这些字符串值：

| 序号 | step ID | 快速模式 | 说明 |
|------|---------|----------|------|
| 0 | _(初始)_ | — | 未开始，`last_completed_step` = `0`（唯一保留的数字值） |
| 1 | `parse-input` | 执行 | 指令解析、蓝湖 URL 检测、断点续传 |
| 2 | `source-sync` | 执行 | DTStack 分支同步（非 DTStack 跳过） |
| 3 | `prd-formalize` | 执行 | DTStack PRD 形式化（非 DTStack 跳过） |
| 4 | `prd-enhancer` | 执行 | PRD 增强 + 图片描述 + 健康度预检 |
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
| 2 | source-sync | `step-source-sync.md` | 执行 | DTStack 分支同步（非 DTStack 模块跳过） |
| 3 | prd-formalize | `step-prd-formalize.md` | 执行 | DTStack PRD 形式化（结合源码，非 DTStack 跳过） |
| 4 | prd-enhancer | `step-prd-enhancer.md` | 执行 | PRD 增强 + 图片描述 + 健康度预检 |
| 5 | brainstorm | `step-brainstorm.md` | **部分执行** | 历史用例检索（快速模式也执行） + Brainstorming + 解耦分析（快速模式跳过） |
| 6 | checklist | `step-checklist.md` | **跳过** | Checklist 预览 + 用户一次确认 |
| 7 | writer | `writer-subagent.md` | 执行 | 并行 Writer Subagents（多 agent 同时生成） |
| 8 | reviewer | `reviewer-subagent.md` | 执行 | Reviewer Subagent（含质量阈值 15%/40%） |
| 9 | xmind | `step-xmind.md` | 执行 | XMind 输出（支持 --append 追加模式） |
| 10 | archive | `step-archive.md` | 执行 | 归档 MD 同步 + 用户验证提示 |
| 11 | notify | `step-notify.md` | 执行 | 用户验证后清理 |

---

## 执行协议

1. 读取 `<story-dir>/.qa-state.json`，确定当前进度；若不存在则创建初始状态
2. 初始状态：`{ "last_completed_step": 0, "writers": {}, "reviewer_status": "pending", "awaiting_verification": false, "created_at": "<ISO8601>" }`
3. 从 `last_completed_step` 的下一步开始，按工作流步骤表顺序执行
4. **快速模式**：步骤 5（brainstorm）仅执行历史用例检索，跳过 Brainstorming 讨论和解耦分析；跳过步骤 6（checklist）
5. 每步完成后，将 `.qa-state.json` 的 `last_completed_step` 更新为该步骤 ID
6. **Writer 步骤**：
   - **6a. 源码预提取（DTStack 必须，编排器执行）**：在启动 Writer Agent 前，编排器必须从 `.repos/` 中预提取以下关键信息，格式化后填入 Writer prompt 的「编排器预提取的关键信息」占位符：
     - **后端源码**（dt-center-assets 等 `source_context.backend` 指定的仓库）：
       1. 接口路径：Grep `@RequestMapping|@GetMapping|@PostMapping|@DeleteMapping` + 模块/功能关键词
       2. DTO/VO 字段：找到对应 DTO/VO/Param 类，提取字段名 + 校验注解（`@NotNull`、`@NotBlank`、`@Length`、`@Size`、`@Min`、`@Max`、`@Pattern`）
       3. 枚举值：Grep `enum` + 模块关键词，提取下拉选项的实际可选值
     - **前端源码**（dt-insight-studio-front 等 `source_context.frontend` 指定的仓库）：
       4. 菜单导航：Grep `menuConfig|routes|path:|menu` + 模块关键词，确认实际菜单层级和路由路径
       5. 按钮文案：Grep `Button|<button|onClick|btn` + 页面关键词，提取按钮显示文本（如「新建规则集」「添加规则」「保存」）
       6. 表单字段标签：Grep `label|FormItem|<Form.Item|placeholder` + 页面关键词，提取表单项中文 label
       7. 多步骤向导：Grep `Steps|Step|Wizard|current|StepForm` + 模块关键词，确认是否有分步表单及各步骤名称
     - 若某项 grep 无结果，记录为「未找到」并在 Writer prompt 中标注，Writer 需自行深入搜索
   - **6b. 历史用例检索（快速模式也执行）**：若 brainstorm 步骤已跳过，编排器在此处执行历史用例检索（同 step-brainstorm.md 3.1 中的索引查询逻辑），将匹配的文件路径和已覆盖功能点填入 Writer prompt
   - **6c. 启动 Writer Agents**：并行启动 `case-writer` agents，在 `writers` 字典中跟踪各 agent 状态，等所有 Writer 均为 `completed` 或 `skipped` 后才进入 Reviewer
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
7. **Reviewer 步骤**：
   - 总用例数 ≤ 80 条 → 单个 `case-reviewer` Agent（现有逻辑）
   - 总用例数 > 80 条 → 拆分为 2 个并行 `case-reviewer` Agent：
     a. Reviewer-A：负责前 ⌈N/2⌉ 个 Writer 的输出 JSON
     b. Reviewer-B：负责后 ⌊N/2⌋ 个 Writer 的输出 JSON
     c. 两个 Reviewer 各自独立执行修正流程
     d. 编排器合并两份 final JSON（按 module name 合并 pages）
     e. 编排器做一次轻量去重扫描（跨 Reviewer 的同名用例标题）
   - 任一 Reviewer 问题率 > 40% → 整体阻断，`reviewer_status: "escalated"`
8. 全部步骤完成后删除 `.qa-state.json`

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
| 终态清理 | notify 完成后删除 `.qa-state.json` |

---

## 模块级重跑流程

1. 读取 `.qa-state.json` 确认 Writer 拆分信息
2. 复用已有 `-enhanced.md`（不重新增强）
3. 仅重启指定 Writer，输出到 `temp/<模块>.json`
4. 重新执行 Reviewer（合并新旧 JSON）
5. 更新 XMind（`--replace` 模式替换同名 L1 节点）
6. 不删除 `.qa-state.json`

---

## 参考文件

- `references/decoupling-heuristics.md` — 需求解耦判断规则
- `references/intermediate-format.md` — 中间 JSON 格式 + .qa-state.json Schema
- `prompts/writer-subagent.md` — Writer Subagent 提示词模板
- `prompts/writer-subagent-reference.md` — Writer Subagent 扩展参考（按需加载）
- `prompts/reviewer-subagent.md` — Reviewer Subagent 提示词模板（含质量阈值）
- `.claude/skills/archive-converter/scripts/json-to-archive-md.mjs` — 归档 MD 转换脚本
- `.claude/skills/archive-converter/scripts/convert-history-cases.mjs` — 历史用例转化脚本

## 关联 Skills

- `prd-enhancer` — PRD 增强 + 增量 diff + 健康度预检（step prd-enhancer）
- `xmind-converter` — JSON 转 XMind，支持 --append（step xmind）
- `archive-converter` — 历史用例归档转化，CSV/XMind → MD（step parse-input 1.5）
