# ui-autotest skill 全量审查

## 审查范围

对整个 ui-autotest skill 及其关联文件做 8 维度系统审计，目标是发现本次优化后所有剩余的不一致、错误和遗漏。

---

## 维度 1：文件命名约定一致性

检查以下约定冲突：

1. **子步骤命名双标准**：
   - `step-1.5-resume.md` — 使用十进制 `.5` 表示子步骤
   - `step-3a-script-writer.md`、`step-3b-test-fix.md`、`step-3c-convergence.md` — 使用字母 `a/b/c` 表示子步骤
   - → 应在两种风格中选一个统一

2. **文件名与 agent 名脱节**：
   - `step-3a-script-writer.md` — agent 已从 `script-writer-agent` 更名为 `subagent-a-agent`，但 step 文件名仍叫 `script-writer`
   - `step-3b-test-fix.md` — 同上，与 agent 命名体系不一致
   - → 确定 step 文件名的命名规范（动词+名词? 与 agent 对齐?）

3. **step 文件命名规范**（现有模式）：
   - `step-N-verb-noun.md`（如 `step-4-merge.md`）
   - 子步骤则用了 `step-3a/b/c` 和 `step-1.5` 两种风格
   - → 需要为子步骤确立单一命名规则

## 维度 2：文件头格式一致性

所有 workflow step 文件的第 1 行 header 格式：

- `step-1-parse-and-scope.md`: `# ui-autotest · step 1 — 解析输入与确认范围`
- `step-1.5-resume.md`: `# ui-autotest · step 1.5 — 断点续传检查`
- `step-2-login.md`: `# ui-autotest · step 2 — 登录态准备`
- `step-3a-script-writer.md`: `# Subagent A · 阶段 1 — 脚本生成`（⚠️ 格式不同）
- `step-3b-test-fix.md`: `# Subagent A · 阶段 2 — 逐条自测与修复`（⚠️ 格式不同）
- `step-3c-convergence.md`: `# Subagent A · 阶段 3 — 共性收敛（条件触发）`（⚠️ 格式不同）
- `step-4-merge.md`: `# ui-autotest · step 4 — 合并脚本`
- `step-5-execute.md`: `# ui-autotest · step 5 — 执行测试（全量回归）`
- `step-6-result-notify.md`: `# ui-autotest · step 6 — 处理结果与通知`

→ 检查是否应该统一格式，比如 `# ui-autotest · step 3a — 脚本生成`

## 维度 3：步骤引用完整性

逐文件核对所有数字步骤引用是否与新 6 步结构一致：

**已知已修改的但需二次确认：**
- `step-1.5-resume.md` — 模板中的步骤进度条、恢复跳转逻辑
- `step-5-execute.md` — 引用 `步骤 3` 表示 subagent A，引用 `步骤 4` 表示合并
- `step-6-result-notify.md` — 引用 `步骤 4`（合并）、`步骤 5`（全量回归）
- `step-4-merge.md` — 引用 `步骤 3`（Subagent A）

**需要重点检查：**
- `step-1.5-resume.md` 第 58 行：`直接跳到 current_step 对应的步骤（3/4/5）` — 这些数字对应新结构的哪几步? 是否合理?
  - 3 = subagent A（生成脚本），4 = 合并，5 = subagent B（执行）
  - 那为啥不从"写脚本"开始跳? 合并和执行都是后续步骤，如果步骤 3 卡住了，跳到 3 有意义吗?
  - → 检查 resume 跳转逻辑的合理性

## 维度 4：agent 描述准确性与工具集

**agents/subagent-a-agent.md：**
- desc 写的是"脚本生成+自测修复+共性收敛" — 与实际三阶段一致
- tools 已加 Agent, Edit — 阶段 3 可以派发 pattern-analyzer-agent
- 但 step-3c-convergence.md 派发 pattern-analyzer-agent 的输入格式是否与 agent 期望的 schema 一致?

**agents/subagent-b-agent.md：**
- desc 写"全量回归执行，执行合并后的 spec 文件并报告结果"
- 但 step-5-execute.md 内容里包含大量修复逻辑（定位器修复、3 轮重试），这与 agent 职责是否匹配?
- subagent B 到底执行什么? 只是跑测试，还是也要修脚本? 如果也要修，和 subagent A 阶段 2 的职责边界是什么?
- → 需要理清 subagent B 与 subagent A 阶段 2 的职责边界

**agents/pattern-analyzer-agent.md：**
- desc 已更新为"步骤 3 阶段 3 派发" — 正确
- tools: Read, Grep, Glob（无 Bash, 无 Edit）— 只读，合理
- 但阶段 3 派发它之后，subagent A 需要读它的输出改 helper — 这个流程可执行吗?
- 输入 schema：step-3c-convergence.md 说的输入字段（probe_summaries, all_failure_signatures, helpers_inventory），pattern-analyzer-agent 文档里的输入 schema 是否完整匹配?

**agents/bug-reporter-agent.md：**
- desc 提到"步骤 6 时派发" — 步骤 6 = result-notify
- tools: Read（只读）— 合理，只分析不修改
- 但 step-6-result-notify.md 说"为每个失败用例派发 bug-reporter-agent" — 失败信息从哪来? 步骤 5 执行后是否有汇总输出?

## 维度 5：内容合理性与职责边界

**问题 1：步骤 5（subagent B 执行）与步骤 3 阶段 2（自测修复）职责重叠**
- 步骤 3 阶段 2（step-3b-test-fix.md）已经逐条执行并修复了所有脚本
- 步骤 5（step-5-execute.md）又执行一次全量回归
- 那阶段 2 的"执行"和执行在步骤 5 的"执行"有什么区别?
  - 阶段 2: 逐条执行，目的是验证每个脚本能否跑通
  - 步骤 5: 合并后全量执行，目的是回归验证
- 但如果阶段 2 全部通过了，步骤 5 预期也是全部通过，那步骤 5 的意义是什么? 只是 double-check?

**问题 2：合并脚本时机**
- step-4-merge.md 说"仅合并步骤 3 中验证通过的脚本"
- 但步骤 3 中可能有些案例 3 轮修复仍失败，这些怎么办?
  - 跳过? 合并时需要列出跳过的
  - → 这涉及 NEED_USER_INPUT 案例的处置流程

**问题 3：NEED_USER_INPUT 流程**
- subagent-a-agent.md 说"主 agent 在 gate R1（步骤 4 合并前）扫描 NEED_USER_INPUT"
- 但 gate R1 是"脚本生成后"的 review，不是"合并前"的阻断
- → R1 的执行时机和职责是否需要调整?

**问题 4：步骤 5（subagent B）的工具集**
- subagent-b-agent 有 Edit 工具
- 但如果步骤 3 阶段 2 已经 3 轮修复过了，步骤 5 应该是纯执行
- 那 Edit 工具给 subagent B 是让它在执行失败时自己修? 还是不应该有 Edit?
- → 需要明确 subagent B 遇到失败时的行为: 自己修? 还是标记失败走 bug 报告?

**问题 5：step-5-execute.md 的并发策略**
- 大量篇幅描述并发方案（方案 A/B、@serial 标签、数据冲突检查）
- 但 subagent B 是 haiku agent，它有能力做这些复杂决策吗?
- 还是要 main agent 来决策并发策略，subagent B 只是执行?

## 维度 6：代码文件的引用一致性

**scripts/lib/workflow/ui-autotest.ts（已更新但需验证）：**
- step ID: `parse-and-scope` → `login` → `subagent-a` → `merge` → `subagent-b` → `result-notify`
- dependsOn 链是否正确?
- 这个文件会被谁调用? 是否真的被使用?

**scripts/plan.ts（已更新）:**
- ui-autotest 步骤模板从 5 步改为 6 步
- depends_on 链: `step-1` → `step-2` → `step-3` → `step-4` → `step-5`
- 注意：`depends_on` 数组里写的 `step-1` 是 plan 内部的 step ID（自动从 index 生成）
- 验证 `depends_on` 链是否正确

**scripts/__tests__/plan.test.ts：**
- 第 180 行: `result.steps[7].depends_on` — 索引 7 代表第 8 步
- plan.ts 的 ui-autotest 现在是 6 步（索引 0-5），test-case-gen 是 8 步（索引 0-7）
- 验证这个断言对应哪个 workflow

## 维度 7：skill 间交叉引用

**claude/skills/ui-autotest/SKILL.md（已更新）：**
- description 中"依赖 playwright-cli skill" — 是否仍然准确? playwright-cli skill 是否有变化?

**playwright-cli skill：**
- 是否有对 ui-autotest 步骤的引用需要更新?

**其他 skills（daily-task, test-case-gen 等）：**
- 是否有对 ui-autotest 步骤编号或 agent 名称的引用?

## 维度 8：门控（gates）合理性

**gates/R1.md（subagent A 返回后）：**
```
- [ ] 选择器是否合理
- [ ] 断言是否与 Archive MD 一致
- [ ] 所有用例都被脚本覆盖
- [ ] 是否有合理的错误处理
```
- "所有用例都被脚本覆盖" — 如果收敛阶段跳过了某些用例，这里会 false
- "是否有合理的错误处理" — 指的是 NEED_USER_INPUT 的处置?
- → 检查 R1 的 checklist 与新结构的匹配度

**gates/R2.md（subagent B 返回后）：**
- "测试通过率是否在阈值以上（默认 80%）" — 80% 是怎么定的? 是否合理?
- "严重失败是否已自动转为 Bug 报告" — 但 bug 报告是在步骤 6（result-notify）生成的，R2 在步骤 5 后执行时 bug 报告还没生成
- → R2 的定位可能需要调整，或在 R2 中只检查阈值，bug 报告交给步骤 6

---

## 审查方法

1. 逐文件阅读，每发现一个问题记录到 `[文件:行号] 问题描述` 格式
2. 分类为: BUG（逻辑错误） / INCONSISTENCY（不一致） / DESIGN（设计问题）
3. 对每个问题给出修复建议
4. 最后汇总所有问题，按优先级排序

## 审查文件清单

```
.claude/skills/ui-autotest/
├── SKILL.md
└── workflow/
    ├── main.md
    ├── protocols.md
    ├── protocols-exception.md
    ├── step-1-parse-and-scope.md
    ├── step-1.5-resume.md
    ├── step-2-login.md
    ├── step-3a-script-writer.md
    ├── step-3b-test-fix.md
    ├── step-3c-convergence.md
    ├── step-4-merge.md
    ├── step-5-execute.md
    ├── step-6-result-notify.md
    └── gates/
        ├── R1.md
        └── R2.md

.claude/agents/
├── subagent-a-agent.md
├── subagent-b-agent.md
├── pattern-analyzer-agent.md
└── bug-reporter-agent.md

.claude/scripts/lib/workflow/ui-autotest.ts
.claude/scripts/plan.ts
.claude/scripts/__tests__/plan.test.ts
.claude/references/assertion-fidelity.md
.claude/references/playwright-patterns.md
```
