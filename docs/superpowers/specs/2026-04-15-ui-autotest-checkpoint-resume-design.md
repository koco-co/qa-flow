# UI 自动化测试断点续传设计

## 概述

为 `ui-autotest` skill 的步骤 4（脚本生成）、步骤 5（逐条自测）、步骤 6（合并脚本）增加断点续传机制。通过持久化 JSON 状态文件，跨会话保留执行进度，避免中断后从头开始。

## 动机

27 条用例逐条调试时，session 中断（超时、context 压缩、手动换窗口）后所有进度丢失。前置条件（建表、数据源引入、元数据同步）也需要重跑。每次恢复成本约 10~30 分钟。

## 覆盖范围

步骤 4~6（生成 → 自测 → 合并），不覆盖步骤 1~3（解析、范围确认、登录态）和步骤 7~9（执行回归、报告、通知），因为这些步骤执行快且幂等。

## 方案选型

**方案 A：单一 JSON 状态文件**（已选）

- 一个文件记录全貌，恢复时只需读一次
- 主流程单线程写入，无并发冲突
- sub-agent 不感知状态文件，由主流程统一管控

## 状态文件

### 路径

```
workspace/{{project}}/.temp/ui-autotest-progress-{{suite_name_slug}}.json
```

`suite_name_slug` 转换规则：保留中文和字母数字，将 `()（）#【】&` 等特殊字符和空格替换为 `-`，合并连续 `-`，去除首尾 `-`。例如 `【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695)` → `内置规则丰富-有效性-支持设置字段多规则的且或关系-15695`。多个 suite 各自独立文件，互不干扰。

### 结构

```json
{
  "version": 1,
  "suite_name": "有效性-取值范围枚举范围规则",
  "archive_md": "workspace/dataAssets/archive/202604/【内置规则丰富】有效性，支持设置字段多规则的且或关系.md",
  "url": "http://shuzhan63-ltqc-dev.k8s.dtstack.cn",
  "selected_priorities": ["P0", "P1", "P2"],
  "output_dir": "workspace/dataAssets/tests/202604/有效性-取值范围枚举范围规则/",
  "started_at": "2026-04-15T10:00:00Z",
  "updated_at": "2026-04-15T10:35:00Z",
  "current_step": 5,
  "preconditions_ready": true,
  "cases": {
    "t1": {
      "title": "【P0】验证xxx",
      "priority": "P0",
      "generated": true,
      "script_path": "workspace/dataAssets/tests/202604/有效性-取值范围枚举范围规则/t1.spec.ts",
      "test_status": "passed",
      "attempts": 1,
      "last_error": null
    }
  },
  "merge_status": "pending"
}
```

### 字段说明

| 字段 | 类型 | 用途 |
|------|------|------|
| `version` | `number` | 状态文件格式版本，用于未来兼容升级 |
| `suite_name` | `string` | 测试套件名称 |
| `archive_md` | `string` | 源 Archive MD 文件路径 |
| `url` | `string` | 目标测试 URL |
| `selected_priorities` | `string[]` | 执行范围 |
| `output_dir` | `string` | 脚本输出目录 |
| `started_at` | `string` | 首次创建时间 (ISO 8601) |
| `updated_at` | `string` | 最近一次更新时间 (ISO 8601) |
| `current_step` | `4 \| 5 \| 6` | 当前所处步骤 |
| `preconditions_ready` | `boolean` | 前置条件（建表/引入/同步）是否已就绪 |
| `cases[id].generated` | `boolean` | 步骤 4 是否已生成脚本 |
| `cases[id].script_path` | `string \| null` | 生成的脚本路径 |
| `cases[id].test_status` | `"pending" \| "running" \| "passed" \| "failed"` | 步骤 5 自测状态 |
| `cases[id].attempts` | `number` | 已重试轮次 |
| `cases[id].last_error` | `string \| null` | 最后一次失败的错误信息 |
| `merge_status` | `"pending" \| "completed"` | 步骤 6 合并状态 |

## 写入时机

状态由主流程在以下节点写入：

| 时机 | 写入内容 |
|------|----------|
| 步骤 4 启动 | 创建文件，`current_step: 4`，所有 case 初始化 `generated: false, test_status: "pending"` |
| 步骤 4 每条生成完成 | `cases[id].generated = true`，写入 `script_path` |
| 步骤 4 全部完成 | `current_step: 5` |
| 步骤 5 前置条件就绪 | `preconditions_ready: true` |
| 步骤 5 每条自测开始 | `cases[id].test_status = "running"`，`attempts += 1` |
| 步骤 5 每条自测结果 | `test_status = "passed"` 或 `"failed"` + `last_error` |
| 步骤 5 全部完成 | `current_step: 6` |
| 步骤 6 合并完成 | `merge_status: "completed"` |

写入方式：读取整个 JSON → 修改字段（不可变模式，返回新对象）→ 写回文件 + 更新 `updated_at`。

## 恢复逻辑

### 触发时机

每次 ui-autotest 启动时，步骤 1 完成后**无条件检查**状态文件：

- 文件不存在 → 正常流程
- 文件存在且 `merge_status === "completed"` → 提示上次已完成，询问是否重新开始
- 文件存在且未完成 → 展示恢复选项

### 恢复提示

```
检测到上次未完成的执行进度：

套件：有效性-取值范围枚举范围规则
中断于：步骤 5（逐条自测）
进度：t1~t5 已通过, t6 失败(3轮), t7~t27 待执行
上次更新：2026-04-15 10:35

请选择：
1. 继续执行（跳过已通过，从 t7 继续）
2. 重试失败项（重跑 t6，再继续 t7~t27）
3. 全部重新开始（清空进度，从头来）
```

### 恢复策略

| 选项 | 行为 |
|------|------|
| 继续执行 | 跳过 `passed`，跳过 `attempts >= 3` 的 `failed`，从第一个 `pending` 开始 |
| 重试失败项 | 将所有 `failed` 重置为 `pending`、`attempts` 清零，然后从第一个非 `passed` 开始 |
| 全部重新开始 | 删除状态文件，走正常流程 |

### 各步骤恢复行为

| `current_step` | 恢复动作 |
|----------------|----------|
| 4（生成中断） | 跳过 `generated: true` 的用例，只生成剩余的 |
| 5（自测中断） | 按用户选择的恢复策略处理 |
| 6（合并中断） | 重新执行合并（幂等操作） |

### 前置条件恢复

`preconditions_ready: true` 时跳过前置条件。选「全部重新开始」会重置此标记。

### 过期判断

`updated_at` 距今超过 7 天时提示：

```
上次进度已超过 7 天，环境可能已变化。建议选择「全部重新开始」。
```

仍允许用户选择继续。

## 边界情况

| 场景 | 处理 |
|------|------|
| 脚本文件被手动删了，但状态标记 `generated: true` | 恢复时校验 `script_path` 是否存在，不存在则重置为 `generated: false` |
| 用户手动改了脚本内容 | 不影响，状态不校验脚本内容 hash |
| 多个 suite 同时执行 | 状态文件名含 suite_name_slug，各自独立 |
| `test_status` 为 `"running"` 时中断 | 恢复时将所有 `"running"` 重置为 `"pending"` |
| 步骤 5 选择「继续执行」但 cookie 过期 | 步骤 3（登录态准备）始终执行，不被状态文件跳过 |

## 新窗口集成

有断点续传后，新窗口提示词简化为：

```
继续执行数据质量「有效性-取值范围枚举范围规则」的 UI 自动化测试。
项目：dataAssets

请先检查 workspace/dataAssets/.temp/ui-autotest-progress-*.json，
按断点续传机制恢复执行。
```

## 改动范围

### 需要改动

| 文件 | 改动 |
|------|------|
| `.claude/skills/ui-autotest/SKILL.md` | 步骤 1 后插入恢复检查，步骤 4/5/6 增加状态写入指令 |
| `.claude/scripts/ui-autotest-progress.ts` | **新建** — 状态文件读写 CLI 工具 |
| `.claude/scripts/__tests__/ui-autotest-progress.test.ts` | **新建** — 单元测试 |

### 不需要改动

| 文件 | 原因 |
|------|------|
| `script-writer-agent.md` | sub-agent 不感知进度，由主流程管控 |
| `merge-specs.ts` | 合并是幂等操作 |
| `parse-cases.ts` | 解析逻辑不变 |
| `assets-sql-sync` 插件 | 前置条件逻辑不变 |

## `ui-autotest-progress.ts` API

```typescript
export function createProgress(project: string, init: ProgressInit): Progress
export function readProgress(project: string, suiteName: string): Progress | null
export function updateCase(progress: Progress, caseId: string, update: CaseUpdate): Progress
export function updateStep(progress: Progress, step: number): Progress
export function updateMergeStatus(progress: Progress, status: string): Progress
export function writeProgress(project: string, progress: Progress): void
export function getResumeSummary(progress: Progress): ResumeSummary
export function isExpired(progress: Progress, days?: number): boolean
export function resetFailed(progress: Progress): Progress
export function resetAll(project: string, suiteName: string): void
```

所有函数遵循不可变模式。`writeProgress` 负责持久化。

## SKILL.md 中的状态写入表达

通过 CLI 命令调用，主流程的 Claude 用 Bash 执行：

```bash
bun run .claude/scripts/ui-autotest-progress.ts create --project {{project}} --suite "{{suite_name}}" --archive "{{archive_md}}" --url "{{url}}"
bun run .claude/scripts/ui-autotest-progress.ts update --project {{project}} --suite "{{suite_name}}" --case t1 --field test_status --value passed
bun run .claude/scripts/ui-autotest-progress.ts read --project {{project}} --suite "{{suite_name}}"
bun run .claude/scripts/ui-autotest-progress.ts reset --project {{project}} --suite "{{suite_name}}"
```
