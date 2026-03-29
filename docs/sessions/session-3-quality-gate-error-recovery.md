# Session 3: 质量闸口 + 错误恢复 (T03 + T04)

> 分支: `feat/qa-workflow-optimize`
> 前置: Session 1, 2 已完成

## 目标

1. prd-formalize 输出新增质量检查，防止低质量 PRD 污染下游。
2. source-sync 支持部分成功（单仓库失败不阻塞全部）。
3. Writer 失败时自动重试 1 次。

## 涉及文件

| 文件 | 改动类型 | 对应 Task |
|------|---------|-----------|
| `.claude/skills/test-case-generator/prompts/step-prd-formalize.md` | 新增质量闸口 | T03 |
| `.claude/skills/test-case-generator/prompts/step-source-sync.md` | 新增部分成功处理 | T04 |
| `.claude/skills/test-case-generator/SKILL.md` | 新增 Writer 自动重试 | T04 |

## 详细改动

### T03: prd-formalize 质量闸口

**文件**: `step-prd-formalize.md`

在「执行流程」第 5 步（输出正式需求文档）之后、「步骤完成后」之前，新增完整的质量闸口段落：

```markdown
## 质量闸口（formalize 完成后必须执行）

对 formalized PRD 文件执行以下自动检查：

| 检查项 | 通过条件 | 级别 |
|--------|---------|------|
| 页面级标题 | 正文包含至少 1 个 `####` 级标题（对应页面设计） | 阻断 |
| 字段信息 | 正文包含至少 1 处字段名称描述（中文名或 DTO 字段名） | 警告 |
| 按钮/操作 | 正文包含至少 1 处【xxx】格式的按钮引用 | 警告 |
| 源码补充 | 「源码补充事实」章节不为空（仅 DTStack） | 警告 |
| 推断标注 | `[基于源码推断]` / `[PRD 未说明]` 标注数不超过总字段数的 60% | 警告 |

**阻断处理**（任一阻断项未通过）：

向用户展示：
```text
formalize 质量检查未通过：
- [x] 缺少页面级标题：正式文档中未识别到独立页面设计

可能原因：蓝湖原文结构过于扁平，formalizer 未能正确拆分页面。

选项：
A. 手动修正 formalized PRD 后继续（推荐）
B. 跳过质量检查，直接进入 enhance（不推荐）
```

**警告处理**：
- 记录到 `.qa-state.json` 的 `formalize_warnings` 数组
- 不阻断流程
- 在后续 prd-enhancer 的健康度报告中一并展示
```

同时将「错误处理」段落（Session 1 添加的初版）扩展为包含质量闸口失败的场景。

### T04-a: source-sync 部分成功

**文件**: `step-source-sync.md`

将现有的「错误处理」段落替换/扩展为完整的部分成功处理逻辑：

```markdown
## 部分成功处理

多仓库同步时，单个仓库失败不应阻断整体流程：

1. 逐个仓库执行 `git fetch && git checkout && git pull`，记录每个仓库的结果
2. 在 `.qa-state.json` 的 `source_context` 中为每个仓库记录状态：
   ```json
   {
     "source_context": {
       "backend": [
         {"repoKey": "dt-center-assets", "branch": "release/6.4.10", "status": "synced", "commit": "abc123"},
         {"repoKey": "DAGScheduleX", "branch": "release/6.4.10", "status": "failed", "error": "branch not found"}
       ],
       "frontend": [
         {"repoKey": "dt-insight-studio-front", "branch": "release/6.4.10", "status": "synced", "commit": "def456"}
       ]
     }
   }
   ```

3. 向用户展示同步结果摘要：
   ```
   源码分支同步结果：
   [v] dt-center-assets → release/6.4.10 (commit: abc123)
   [x] DAGScheduleX → release/6.4.10 (失败: branch not found)
   [v] dt-insight-studio-front → release/6.4.10 (commit: def456)

   1 个仓库同步失败。
   - 「继续」→ 后续 Writer 不参考失败仓库的源码
   - 「重试」→ 仅重新 sync 失败仓库
   - 「取消」→ 中止流程
   ```

4. 用户选「继续」→ step 标记为完成，Writer 的源码参考中排除 `status: "failed"` 的仓库
5. 用户选「重试」→ 仅对 failed 仓库重新执行 fetch/checkout/pull，成功后更新状态
6. 用户选「取消」→ 不更新 `last_completed_step`，流程停在 source-sync
```

### T04-b: Writer 自动重试

**文件**: `SKILL.md`

在「执行协议」部分（当前第 6 条"Writer 步骤"之后），新增第 6.5 条：

```markdown
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
```

同时在「.qa-state.json 关键状态速查」表中新增 `retry_count` 的说明。

## 完成标准

- [ ] step-prd-formalize.md 包含质量闸口检查表（5 项检查，1 阻断 + 4 警告）
- [ ] 质量闸口阻断时提供 A/B 两个选项
- [ ] 质量闸口警告记录到 `formalize_warnings`
- [ ] step-source-sync.md 包含部分成功处理逻辑（每个仓库独立记录 status）
- [ ] 部分成功时提供 继续/重试/取消 三个选项
- [ ] SKILL.md 包含 Writer 自动重试逻辑（6.5 条）
- [ ] 自动重试限制为 1 次，第 2 次失败才需要用户介入
- [ ] .qa-state.json 状态速查表包含 `retry_count` 说明

## Commit

```
git add -A && git commit -m "feat: add formalize quality gate, partial sync recovery and Writer auto-retry (T03+T04)"
```
