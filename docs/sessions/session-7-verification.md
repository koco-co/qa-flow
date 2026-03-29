# Session 7: 端到端验证 (Test 1-5)

> 分支: `feat/qa-workflow-optimize`
> 前置: Session 1-6 **全部完成**
> 本 session 不做任何修改，只做验证。发现问题就地修复。

## 目标

逐项验证 Session 1-6 的全部改动是否正确实施、是否彼此一致。

---

## Test 1: Step ID 全局一致性

在以下所有文件中搜索 `last_completed_step` 的赋值/引用，确认：
- 全部使用字符串 step ID（`0` 除外）
- 取值与 SKILL.md 步骤顺序定义表完全一致

**检查文件列表**：
1. `.claude/skills/test-case-generator/SKILL.md`
2. `.claude/skills/test-case-generator/references/intermediate-format.md`
3. `.claude/skills/test-case-generator/prompts/step-parse-input.md`
4. `.claude/skills/test-case-generator/prompts/step-source-sync.md`
5. `.claude/skills/test-case-generator/prompts/step-prd-formalize.md`
6. `.claude/skills/test-case-generator/prompts/step-prd-enhancer.md`
7. `.claude/skills/test-case-generator/prompts/step-brainstorm.md`
8. `.claude/skills/test-case-generator/prompts/step-checklist.md`
9. `.claude/skills/test-case-generator/prompts/step-xmind.md`
10. `.claude/skills/test-case-generator/prompts/step-archive.md`
11. `.claude/skills/test-case-generator/prompts/step-notify.md`

**输出格式**：

| 文件 | last_completed_step 赋值 | 正确? |
|------|-------------------------|-------|

---

## Test 2: Step Prompt 标准化

对 9 个 step-*.md 文件逐一检查：

| 检查项 | 说明 |
|--------|------|
| 标准化头部 | 包含 `<!-- step-id: xxx -->` comment |
| 前置条件 | 包含 `> 前置条件: ...` |
| 快速模式标注 | 包含 `> 快速模式: ...` |
| 错误处理段落 | 包含 `## 错误处理` 且至少 1 条规则 |
| 步骤完成后段落 | 包含统一格式的 `## 步骤完成后` |
| execution_log 指令 | 步骤完成后包含 execution_log 追加指令 |

**输出格式**：

| 文件 | 头部 | 前置 | 快速 | 错误处理 | 完成后 | 日志 |
|------|------|------|------|---------|--------|------|

---

## Test 3: Lanhu 集成检查

在 `step-parse-input.md` 中搜索：

| 关键词 | 应存在? | 说明 |
|--------|---------|------|
| `Cookie 有效性预检` 或 `自动尝试刷新` | 是 | Cookie 3 次重试逻辑 |
| `最多 3 次` 或 `3 次均失败` | 是 | 重试次数限制 |
| `模块确认` 或 `请确认或选择正确的模块` | 是 | 模块显式选择菜单 |
| `不得跳过此确认步骤` | 是 | 强制交互 |
| `等待用户明确回复` | 是 | 页面选择闭环 |
| `取消` | 是 | 取消选项 |

---

## Test 4: 质量闸口 + 错误恢复检查

### step-prd-formalize.md

| 关键词 | 应存在? |
|--------|---------|
| `质量闸口` | 是 |
| `页面级标题` | 是 |
| `阻断` | 是 |
| `formalize_warnings` | 是 |

### step-source-sync.md

| 关键词 | 应存在? |
|--------|---------|
| `部分成功` 或 `partial` | 是 |
| `status.*failed` 或 `status.*synced` | 是 |
| `继续.*重试.*取消` | 是 |

### SKILL.md

| 关键词 | 应存在? |
|--------|---------|
| `Writer 自动重试` 或 `auto.*retry` | 是 |
| `retry_count` | 是 |
| `第 2 次仍失败` | 是 |

---

## Test 5: Writer/Reviewer 优化检查

### Writer 拆分

| 检查项 | 预期 |
|--------|------|
| `writer-subagent.md` 行数 | ≤ 120 |
| `writer-subagent-reference.md` 存在 | 是 |
| reference 包含正反例表格 | 是 |
| reference 包含禁止词清单 | 是 |
| reference 包含源码分析详细版 | 是 |
| SKILL.md 参考文件列出 reference | 是 |

### Reviewer 分层

| 检查项 | 预期 |
|--------|------|
| reviewer-subagent.md 包含「预扫描快速通道」 | 是 |
| 3 级修正深度定义 (<5% / 5-25% / >25%) | 是 |
| SKILL.md 包含 Reviewer 拆分策略 (>80 条) | 是 |

### 快速模式

| 检查项 | 预期 |
|--------|------|
| SKILL.md 运行模式表包含「额外优化」列 | 是 |
| Writer 合并 (≤30 条单 Writer) | 是 |
| Reviewer 降级 (1 轮) | 是 |
| formalize 简化 (非 DTStack 跳过) | 是 |

---

## Test 6: CLAUDE.md 瘦身检查

| 检查项 | 预期 |
|--------|------|
| CLAUDE.md 行数 | ≤ 120 |
| 包含：快速开始 | 是 |
| 包含：工作区结构 | 是 |
| 包含：Skill 索引表 | 是 |
| 包含：DTStack/XYZH 分流 | 是 |
| 包含：规范索引表 | 是 |
| 不包含：完整 6 模块路径表 | 是 |
| 不包含：层级映射表 | 是 |
| 规范索引中每个链接文件存在 | 是 |

---

## Test 7: config.json + 状态 Schema

| 检查项 | 预期 |
|--------|------|
| batch-works 有 requirements 字段 | 是 |
| data-query 有 requirements 字段 | 是 |
| variable-center 有 requirements 字段 | 是 |
| public-service 有 requirements 字段 | 是 |
| intermediate-format.md 无 steps_completed | 是 |
| intermediate-format.md 有 execution_log | 是 |
| intermediate-format.md 有 formalize_warnings | 是 |

---

## Test 8: 文件引用完整性

验证 SKILL.md「参考文件」章节列出的每个路径都实际存在：

```
references/decoupling-heuristics.md
references/intermediate-format.md
prompts/writer-subagent.md
prompts/writer-subagent-reference.md  ← 新增
prompts/reviewer-subagent.md
prompts/step-parse-input.md
prompts/step-source-sync.md
prompts/step-prd-formalize.md
prompts/step-prd-enhancer.md
prompts/step-brainstorm.md
prompts/step-checklist.md
prompts/step-xmind.md
prompts/step-archive.md
prompts/step-notify.md
```

---

## 发现问题后

如果任何测试项 FAIL：
1. 定位到具体文件和行号
2. 直接修复
3. 用 `git diff` 确认修复范围
4. commit: `fix: <描述修复内容>`

全部 PASS 后：

```bash
# 确认所有改动
git log --oneline feat/qa-workflow-optimize ^main

# 如果准备合并
git checkout main
git merge feat/qa-workflow-optimize
```

## 最终输出

将全部测试结果汇总为一张大表：

| Test | 检查项总数 | PASS | FAIL | WARNING |
|------|-----------|------|------|---------|
| Test 1 | 11 | | | |
| Test 2 | 54 | | | |
| Test 3 | 6 | | | |
| Test 4 | 10 | | | |
| Test 5 | 12 | | | |
| Test 6 | 9 | | | |
| Test 7 | 7 | | | |
| Test 8 | 14 | | | |
| **Total** | **123** | | | |
