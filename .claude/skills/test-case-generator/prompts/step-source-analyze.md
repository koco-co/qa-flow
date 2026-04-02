<!-- step-id: source-analyze | delegate: testCaseOrchestrator -->
# Step source-analyze：源码上下文预提取

> 前置条件: `last_completed_step` == `"prd-enhancer"`
> 快速模式: 执行

> **当 config.repos 为空时跳过本步骤**：
> 1. 向 execution_log 追加 `{"step": "source-analyze", "status": "skipped", "reason": "config.repos is empty"}`
> 2. 更新 `last_completed_step` 为 `"source-analyze"`
> 3. 继续下一步（brainstorm）

## 目标

在 Writer 启动之前，集中完成一次源码分析，将前端/后端关键信息与**可直接复用的前置条件模板**写入 `source-context.md`。
Writer 和 Reviewer 直接读取该文件，**无需再全量 grep 源码仓库**。

---

## 执行流程

### 1. 准备输入

从 `.qa-state.json` 读取：

- `enhanced_files`：增强后 PRD 文件路径列表
- `source_context`：前端/后端仓库路径与分支（source-sync 步骤已写入）

### 2. 并行启动两个分析 Agent

在**同一条消息**中发出两个 Agent tool 调用（真正并行）：

| Agent | prompt 文件 | 职责 |
|-------|------------|------|
| `source-analyzer-frontend` | `prompts/source-analyzer-frontend.md` | 提取菜单路径、按钮文案、表单字段 label、多步骤向导、关键交互补充 |
| `source-analyzer-backend` | `prompts/source-analyzer-backend.md` | 提取接口路径、DTO 字段与校验注解、枚举值、业务逻辑分支、测试可直接复用的前置条件模板 |

启动时传入：
- 增强后 PRD 文件的完整路径（可多个，逐一传入）
- 对应仓库的绝对路径与分支名

### 3. 合并输出，写入 source-context.md

等两个 Agent 均返回后，编排器将结果合并为一个文件：

**输出路径**：`cases/prds/YYYYMM/temp/source-context.md`（与 PRD 同年月目录）

**文件结构**：

```markdown
# 源码上下文 — [需求名称]

> 生成时间：[ISO8601]
> PRD 文件：[enhanced PRD 路径]
> 前端分支：[branch]
> 后端分支：[branch]

---

[前端 Agent 输出的内容，以 ## 一、前端源码摘要 开头，至少包含 1.1 ~ 1.5]

---

[后端 Agent 输出的内容，以 ## 二、后端源码摘要 开头，至少包含 2.1 ~ 2.6]
```

### 4. 错误处理

| 场景 | 处理方式 |
|------|---------|
| 某个 Agent 失败 | 记录警告，用成功的那份继续；失败部分在对应章节填写「分析失败，Writer 请自行 grep」 |
| 两个 Agent 均失败 | `source_context_file` 写为空，Writer 降级为按 PRD 原文 + 轻量 grep 编写 |
| 输出文件写入失败 | 记录警告，继续流程，`source_context_file` 写为空 |

---

## 步骤完成后

更新 `.qa-state.json`：

- `last_completed_step` → `"source-analyze"`
- `source_context_file` → `cases/prds/YYYYMM/temp/source-context.md`（实际写入路径；失败时为空字符串 `""`）

向 `execution_log` 追加：

```json
{
  "step": "source-analyze",
  "status": "completed",
  "at": "<ISO8601>",
  "duration_ms": null,
  "summary": "前端/后端源码分析完成，输出 source-context.md（路径: <实际路径>）"
}
```
