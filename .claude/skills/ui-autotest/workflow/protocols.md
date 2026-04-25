# 共享协议（ui-autotest）

> 各步骤以 `protocols.md#section` 引用。主 agent 启动时一次性加载。

## 1. 确认策略

| 规则 | 行为 |
|------|------|
| `status_only` | 步骤完成统计、通过/失败摘要、报告路径展示仅作状态展示，不要求确认 |
| `scope_selection` | 仅在 URL、执行范围或登录方式不明确时使用 AskUserQuestion |
| `reference_permission` | 允许用实际 DOM、playwright-cli snapshot 与只读源码来修正脚本的**操作步骤部分**（选择器、按钮文本、流程顺序）；断言/预期必须严格忠实于用例 `expected` 列原文，禁止为了通过而放宽断言 |
| `archive_writeback` | **任何**与前端实际 DOM 不一致的偏差一律由主 agent 通过 AskUserQuestion 让用户确认是「Bug / 用例描述错误 / 需求变更」三类之一后才能动作；禁止 sub-agent 自主判断 |
| `subagent_no_guess` | Sub-agent 遇到任何无法靠"读源码 + 看 DOM"机械确定的偏差，**必须**返回 `NEED_USER_INPUT` 状态把决策权交还主 agent |
| `assertion_fidelity` | 断言文本必须严格对齐用例预期原文。禁止扩大正则匹配、禁止用祖先元素全局 `filter({ hasText })`、禁止用 `toBeVisible()` 替代文本断言、禁止 try/catch 吞断言 |

## 2. 模板变量

| 变量 | 说明 |
|------|------|
| `{{project}}` | 项目名称（如 `dataAssets`） |
| `{{suite_name}}` | 套件名称，来自 parse-cases.ts 输出的 `suite_name` 字段 |
| `{{suite_slug}}` | suite 名称 slug 化结果：`echo "{{suite_name}}" \| sed 's/[^A-Za-z0-9_-]/-/g' \| sed 's/--*/-/g; s/^-//;s/-$//'` |
| `{{env}}` | 环境标识（如 `ltqcdev`、`ci63`） |
| `{{id}}` | 用例 ID（如 `t1`、`t2`） |
| `{{output_dir}}` | 临时代码块输出目录：`.kata/{{project}}/ui-blocks/{{suite_slug}}/` |

## 3. 命令别名

> 以下别名供速查，步骤文件中使用完整命令以确保可读性。

| 别名 | 完整命令 |
|------|---------|
| `@progress:create` | `kata-cli progress session-create --workflow ui-autotest --project {{project}} ...` + `kata-cli progress task-add --project {{project}} --session "$SESSION_ID" --tasks '[...]'` |
| `@progress:update` | `kata-cli progress task-update --project {{project}} --session "$SESSION_ID" --task {{id}} ...` |
| `@progress:summary` | `kata-cli progress session-summary --project {{project}} --session "$SESSION_ID"` |
| `@progress:reset` | `kata-cli progress session-delete --project {{project}} --session "$SESSION_ID"` |
| `@progress:resume` | `kata-cli progress session-resume --project {{project}} --session "$SESSION_ID"` |
| `@parse-cases` | `bun run .claude/skills/ui-autotest/scripts/parse-cases.ts --file {{md_path}}` |
| `@merge-specs` | `bun run .claude/skills/ui-autotest/scripts/merge-specs.ts ...` |

> SESSION_ID 在步骤 1 完成后通过以下 bash 推导：
> ```bash
> SUITE_SLUG=$(echo "{{suite_name}}" | sed 's/[^A-Za-z0-9_-]/-/g' | sed 's/--*/-/g; s/^-//;s/-$//')
> SESSION_ID="ui-autotest/${SUITE_SLUG}-${ACTIVE_ENV:-default}"
> ```

## 4. Task Schema

全流程使用 `TaskCreate` / `TaskUpdate` 工具展示实时进度。workflow 启动时一次性创建主任务，按顺序设置 `addBlockedBy` 依赖：

| 任务 subject | activeForm |
|---|---|
| `步骤 1 — 解析输入与确认范围` | `解析用例并确认范围` |
| `步骤 2 — 登录态准备` | `准备登录 session` |
| `步骤 3 — Subagent A（生成+修复+合拢）` | `脚本生成与自修复` |
| `步骤 4 — 合并脚本` | `合并验证通过的脚本` |
| `步骤 5 — Subagent B（执行测试）` | `执行全量回归` |
| `步骤 6 — 处理结果与通知` | `处理结果并发送通知` |

**状态推进规则**：
- 步骤开始 → `TaskUpdate status=in_progress`
- 步骤完成 → `TaskUpdate status=completed`，subject 末尾追加结果摘要
- 步骤失败 → 保持 `in_progress`，不标记 `completed`

## 5. 输出目录约定

| 类型 | 路径 |
|------|------|
| 临时代码块 | `.kata/{{project}}/ui-blocks/{{suite_slug}}/` |
| E2E spec 文件 | `workspace/{{project}}/tests/{{YYYYMM}}/{{suite_name}}/` |
| Playwright HTML 报告 | `workspace/{{project}}/reports/allure/{{YYYYMM}}/{{suite_name}}/{{env}}/allure-report/index.html` |
| Bug 报告 | `workspace/{{project}}/reports/bugs/{{YYYYMM}}/ui-autotest-{{suite_name}}.html` |
| Session 文件 | `.auth/{{project}}/session-{{env}}.json` |

## 6. 引用

异常处理已拆分为 [`protocols-exception.md`](protocols-exception.md)，按需加载。
