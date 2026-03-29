# Session 1: Step ID 统一化 (T01)

> 这是 qa-flow 工作流优化的第一步，也是所有后续改动的基础。
> 分支: `feat/qa-workflow-optimize`

## 目标

消除 step ID 在数字和字符串之间的不一致，统一为字符串。修正 step-checklist.md 中的错误步骤编号引用。为全部 step prompt 添加标准化头部和「错误处理」段落。

## 背景

当前存在 3 处不一致：
- `SKILL.md` 步骤表用序号 1-11
- `step-*.md` 的 `last_completed_step` 赋值用字符串如 `"parse-input"`
- `intermediate-format.md` 的 Schema 示例用数字如 `"last_completed_step": 4`

此外 `step-checklist.md` 中写了 "Step 4: Checklist 预览" 和 "Step 5: 用户一次确认"，但 checklist 实际是步骤序号 6（step ID `"checklist"`）。

## 涉及文件（只改这些）

| 文件 | 改动类型 |
|------|---------|
| `.claude/skills/test-case-generator/SKILL.md` | 新增步骤顺序声明表 |
| `.claude/skills/test-case-generator/references/intermediate-format.md` | Schema 示例和字段说明修正 |
| `.claude/skills/test-case-generator/prompts/step-parse-input.md` | 标准化头部 + 错误处理段落 |
| `.claude/skills/test-case-generator/prompts/step-source-sync.md` | 标准化头部 + 错误处理段落 |
| `.claude/skills/test-case-generator/prompts/step-prd-formalize.md` | 标准化头部 + 错误处理段落 |
| `.claude/skills/test-case-generator/prompts/step-prd-enhancer.md` | 标准化头部 + 错误处理段落 |
| `.claude/skills/test-case-generator/prompts/step-brainstorm.md` | 标准化头部 + 错误处理段落 |
| `.claude/skills/test-case-generator/prompts/step-checklist.md` | **修正步骤编号** + 标准化头部 + 错误处理段落 |
| `.claude/skills/test-case-generator/prompts/step-xmind.md` | 标准化头部 + 错误处理段落 |
| `.claude/skills/test-case-generator/prompts/step-archive.md` | 标准化头部 + 错误处理段落 |
| `.claude/skills/test-case-generator/prompts/step-notify.md` | 标准化头部 + 错误处理段落 |

## 详细改动

### 1. SKILL.md — 新增步骤顺序声明

在 `## 工作流步骤` 表格**上方**插入以下内容：

```markdown
## 步骤顺序定义（canonical）

以下 step ID 为全局唯一标识，`.qa-state.json` 的 `last_completed_step` 必须使用这些字符串值：

| 序号 | step ID | 快速模式 | 说明 |
|------|---------|----------|------|
| 0 | _(初始)_ | — | 未开始，`last_completed_step` = `0`（唯一保留的数字值） |
| 1 | `parse-input` | 执行 | 指令解析、蓝湖 URL 检测、断点续传 |
| 2 | `source-sync` | 执行 | DTStack 分支同步（非 DTStack 跳过） |
| 3 | `prd-formalize` | 执行 | DTStack PRD 形式化（非 DTStack 跳过） |
| 4 | `prd-enhancer` | 执行 | PRD 增强 + 图片描述 + 健康度预检 |
| 5 | `brainstorm` | **跳过** | Brainstorming + 解耦分析 |
| 6 | `checklist` | **跳过** | Checklist 预览 + 用户确认 |
| 7 | `writer` | 执行 | 并行 Writer Subagents |
| 8 | `reviewer` | 执行 | Reviewer Subagent（质量阈值 15%/40%） |
| 9 | `xmind` | 执行 | XMind 输出 |
| 10 | `archive` | 执行 | 归档 MD 同步 + 用户验证 |
| 11 | `notify` | 执行 | 清理（终态，写入后立即删除状态文件） |

续传时根据 `last_completed_step` 在此表中的位置确定下一步。
```

然后将原有的 `## 工作流步骤` 表格中的 `#` 列改为 `序号`，确保两张表对应一致。

### 2. intermediate-format.md — Schema 修正

a) 在 `.qa-state.json` 的 JSON Schema 示例中：
   - 将 `"last_completed_step": 4` 改为 `"last_completed_step": "prd-enhancer"`
   - **删除** `"steps_completed": [1, 2, 3, 4]` 这一行
   - 将 `"updated_at": "2026-03-25T10:30:00Z"` 之后新增：
     ```json
     "execution_log": [
       {
         "step": "parse-input",
         "status": "completed",
         "at": "2026-03-25T10:01:00Z",
         "duration_ms": 3200,
         "summary": "解析 Story 目录，发现 2 个 PRD 文件"
       }
     ]
     ```

b) 在「状态字段说明」表中：
   - `last_completed_step` 的说明改为：`已稳定完成的最后步骤，字符串 step ID（初始值为数字 0 表示未开始）。取值范围见 SKILL.md 步骤顺序定义表`
   - 删除 `steps_completed` 行（如有）
   - 新增 `execution_log` 行：`步骤执行记录数组（可选）。每步完成或失败时追加一条记录，包含 step/status/at/duration_ms/summary。仅用于事后排查，不影响续传逻辑`

c) 在「关键状态转移」表中，所有出现纯数字步骤引用的地方替换为字符串：
   - `last_completed_step: 0` 保留（唯一的数字）
   - `last_completed_step: 6` → `last_completed_step: "checklist"`
   - `last_completed_step: 7` → `last_completed_step: "reviewer"`
   - `last_completed_step: 9` → `last_completed_step: "archive"`
   - `last_completed_step: 10` → `last_completed_step: "notify"`（注明：写入后立即删除状态文件）
   - 类推其他引用

### 3. step-checklist.md — 修正步骤编号

- 将 `## Step 4: Checklist 预览` 改为 `## Checklist 预览`
- 将 `## Step 5: 用户一次确认` 改为 `## 用户一次确认`
- 移除正文中任何引用错误序号的地方

### 4. 全部 step-*.md — 标准化头部

为每个 step prompt 文件添加标准化头部（如果已有部分内容则合并，不要重复）。模板：

```markdown
<!-- step-id: <id> | delegate: testCaseOrchestrator -->
# Step <id>：<中文名称>

> 前置条件: `last_completed_step` == `"<前一步ID>"`（或 `0`）
> 快速模式: [执行 / **跳过**]
> DTStack 专属: [是 / 否]
```

每个文件的具体值：

| 文件 | step-id | 前置条件 | 快速模式 | DTStack 专属 |
|------|---------|----------|----------|-------------|
| step-parse-input.md | parse-input | 0 | 执行 | 否 |
| step-source-sync.md | source-sync | "parse-input" | 执行 | 是 |
| step-prd-formalize.md | prd-formalize | "source-sync" | 执行 | 是 |
| step-prd-enhancer.md | prd-enhancer | "prd-formalize" | 执行 | 否 |
| step-brainstorm.md | brainstorm | "prd-enhancer" | **跳过** | 否 |
| step-checklist.md | checklist | "brainstorm" | **跳过** | 否 |
| step-xmind.md | xmind | "reviewer" | 执行 | 否 |
| step-archive.md | archive | "xmind" | 执行 | 否 |
| step-notify.md | notify | "archive" | 执行 | 否 |

注意：writer 和 reviewer 没有独立的 step-*.md 文件（它们由 writer-subagent.md 和 reviewer-subagent.md 定义），所以不需要处理。

### 5. 全部 step-*.md — 补充「错误处理」段落

对每个 step-*.md，如果没有「错误处理」段落，在「步骤完成后」之前新增。每个文件至少需要 1 条错误处理规则：

| 文件 | 需要补充的错误处理内容 |
|------|----------------------|
| step-parse-input.md | 已有较完整的错误处理（路径不存在等），检查是否需要补充即可 |
| step-source-sync.md | `git fetch/checkout 失败时的处理`（Session 3 会进一步扩展为部分成功处理） |
| step-prd-formalize.md | `prd-formalizer 输出为空或缺少关键章节时的处理`（Session 3 会扩展为质量闸口） |
| step-prd-enhancer.md | `图片读取失败率 > 50% 时暂停并提示用户` |
| step-brainstorm.md | `历史用例检索无结果时: 跳过历史去重，向用户说明本模块无历史参考` |
| step-checklist.md | `用户超过 2 轮修改仍未确认时: 提示是否切换为快速模式跳过 checklist` |
| step-xmind.md | `json-to-xmind.mjs 脚本执行失败时: 展示错误日志，建议用户检查 JSON 格式` |
| step-archive.md | `json-to-archive-md.mjs 失败时: 展示错误，但不阻断（XMind 已生成可用）` |
| step-notify.md | `临时文件删除失败时: 发出警告但不阻断完成通知` |

### 6. 全部 step-*.md — 统一「步骤完成后」段落

确保每个文件的「步骤完成后」段落格式统一：

```markdown
## 步骤完成后

更新 `.qa-state.json`：
- `last_completed_step` → `"<当前step-id>"`
- （如有其他字段变更，逐条列出）

同时向 `execution_log` 数组追加：
```json
{"step": "<step-id>", "status": "completed", "at": "<ISO8601>", "duration_ms": null, "summary": "<本步骤一句话成果>"}
```

逐文件核对当前写的 step ID 是否与 canonical 表一致。

## 完成标准

- [ ] SKILL.md 包含步骤顺序定义表，且与工作流步骤表完全对应
- [ ] intermediate-format.md 的 .qa-state.json 示例中 `last_completed_step` 为字符串
- [ ] intermediate-format.md 不再包含 `steps_completed` 字段
- [ ] intermediate-format.md 包含 `execution_log` 字段定义和示例
- [ ] step-checklist.md 不再出现错误的 "Step 4" / "Step 5" 引用
- [ ] 全部 9 个 step-*.md 都有标准化头部（step-id comment + 前置条件 + 快速模式 + DTStack 标注）
- [ ] 全部 9 个 step-*.md 都有「错误处理」段落
- [ ] 全部 9 个 step-*.md 的「步骤完成后」段落格式统一，包含 execution_log 追加指令
- [ ] 关键状态转移表中无纯数字步骤引用（0 除外）

## Commit

```
git add -A && git commit -m "refactor: unify step IDs to string format and standardize step prompts (T01)"
```
