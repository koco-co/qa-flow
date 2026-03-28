---
name: test-case-generator
description: QA 测试用例生成主编排 Skill。一键触发完整自动化流程：PRD 增强 → 健康度预检 → Brainstorming + 解耦分析 → Checklist 预览 → 并行生成用例 → 评审 → 输出 XMind。当用户说「生成测试用例」「生成用例」「写用例」「写测试用例」「根据需求文档生成用例」「为 Story-xxx 生成用例」「test case」「重新生成 xxx 模块」「追加用例」时触发。支持 --quick 快速模式、模块级重跑和断点续传。**也支持直接输入蓝湖 URL**：当用户提供 lanhuapp.com 链接时，自动通过 lanhu-mcp 提取 PRD 内容后进入完整流程；相关触发词：「从蓝湖导入」「蓝湖 URL」「lanhuapp.com」。
---

# 测试用例生成编排 Skill（Harness Protocol）

本 Skill 遵循 `.claude/harness/workflows/test-case-generation.json` 工作流，
workflow JSON 是唯一执行依据；每个步骤的详细行为在 `prompts/step-<id>.md` 中。

> DTStack 特殊规则：测试用例生成前必须先读取 `config/repo-branch-mapping.yaml`，完成源码分支同步，并将 Lanhu/raw PRD 先整理为**正式需求文档**；不要直接拿原始蓝湖文本写用例。

> ⚠️ **用例编写硬性规则**见项目 CLAUDE.md「测试用例编写规范」章节（标题"验证"开头、禁止步骤编号、首步进入页面、正常/异常用例原则、禁止模糊词、预期结果规范）。Writer/Reviewer 必须遵循，本文件仅定义编排流程。

---

## 运行模式

| 模式 | 触发方式 | 跳过步骤 |
|------|----------|----------|
| 普通模式（默认） | `为 Story-20260322 生成测试用例` | — |
| 快速模式 | `--quick` 或"快速生成" | brainstorm、checklist |
| 续传模式 | 重发原命令或`继续 Story-xxx` | 自动从断点继续 |
| 模块级重跑 | `重新生成 Story-xxx 的「列表页」模块用例` | 仅重跑指定 Writer |

---

## Harness 执行协议

### 一、确定状态文件路径

```bash
STATE_PATH="cases/requirements/<module>/Story-YYYYMMDD/.qa-state.json"
MODE="full"      # 或 "quick"（--quick 时）
INPUT_TYPE="story-path"  # 或 "lanhu-url" / "prd-path"
```

### 二、初始化或加载状态

```bash
node .claude/scripts/harness-state-machine.mjs \
  --init testCaseGeneration --state-path $STATE_PATH
```

### 三、执行循环

重复以下循环，直到 `isComplete: true`：

```bash
# 获取下一步骤
node .claude/scripts/harness-step-resolver.mjs \
  --workflow testCaseGeneration \
  --state $STATE_PATH \
  --action next \
  --mode $MODE \
  --input-type $INPUT_TYPE
```

**解析输出：**
- `nextStep.id` → 加载 `prompts/step-<id>.md` 获取该步骤的详细行为指导
- `nextStep.delegate` → 确认执行方式（script / skill / agent）
- `skippedSteps` → 记录跳过的步骤（如 brainstorm、checklist 在 quick-mode 下）
- `isComplete: true` → 流程结束

**执行步骤后推进状态：**
```bash
node .claude/scripts/harness-state-machine.mjs \
  --advance <step-id> --state-path $STATE_PATH
```

**步骤失败时：**
```bash
node .claude/scripts/harness-state-machine.mjs \
  --fail <step-id> --reason "<msg>" --state-path $STATE_PATH
```

### 四、per-step 行为指导文件

| 步骤 ID | 文件 | 说明 |
|---------|------|------|
| parse-input | `prompts/step-parse-input.md` | 蓝湖 URL 检测、指令解析、续传检测、状态初始化、源码验证、历史检查 |
| lanhu-ingest | `prompts/step-parse-input.md` §1.0 | 蓝湖导入子流程（在 parse-input 中处理） |
| source-sync | `prompts/step-source-sync.md` | DTStack 分支同步 |
| prd-formalize | `prompts/step-prd-formalize.md` | DTStack 正式需求文档整理（结合源码） |
| prd-enhancer | `prompts/step-prd-enhancer.md` | PRD 增强 + 健康度预检 |
| brainstorm | `prompts/step-brainstorm.md` | Brainstorming + 解耦分析（quick-mode 跳过） |
| checklist | `prompts/step-checklist.md` | Checklist 预览 + 用户一次确认（quick-mode 跳过） |
| writer | `prompts/writer-subagent.md` | 并行 Writer Subagents |
| reviewer | `prompts/reviewer-subagent.md` | Reviewer Subagent（含质量阈值 15%/40%） |
| xmind | `prompts/step-xmind.md` | XMind 输出（支持 --append 追加模式） |
| archive | `prompts/step-archive.md` | 归档 MD 同步 + 用户验证提示 |
| notify | `prompts/step-notify.md` | 用户验证后同步与清理 |

---

## .qa-state.json 关键状态速查

- `writers[*].status`：`pending` / `in_progress` / `completed` / `failed` / `skipped`
- `reviewer_status`：`pending` / `completed` / `escalated`

| 场景 | 状态行为 |
|------|----------|
| 新流程初始化 | `last_completed_step: 0`、`awaiting_verification: false`、`reviewer_status: "pending"` |
| 等待验证续传 | `awaiting_verification: true` → 重新展示验证提示，不重跑 archive |
| Writer 收敛 | 所有 Writer `completed/skipped` 后，state-machine 才允许 advance writer |
| Reviewer 阻断 | `reviewer_status: "escalated"` → 等待用户决策，last_completed_step 保持在 writer |
| 终态清理 | notify 完成后删除 `.qa-state.json`，不保留稳定可恢复状态 |

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
- `prompts/reviewer-subagent.md` — Reviewer Subagent 提示词模板（含质量阈值）
- `.claude/harness/workflows/test-case-generation.json` — Workflow manifest（执行权威）
- `.claude/harness/delegates.json` — Delegate 注册表
- `.claude/harness/hooks.json` — Hook 注册表（conditions、prechecks、recovery）
- `.claude/scripts/json-to-archive-md.mjs` — 归档 MD 转换脚本
- `.claude/scripts/convert-history-cases.mjs` — 历史用例转化脚本

## 关联 Skills

- `prd-enhancer` — PRD 增强 + 增量 diff + 健康度预检（step prd-enhancer）
- `xmind-converter` — JSON 转 XMind，支持 --append（step xmind）
- `archive-converter` — 历史用例归档转化，CSV/XMind → MD（step parse-input 1.5）
