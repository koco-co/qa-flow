# Session 6: 状态管理 + 配置补全 (T09 + T10)

> 分支: `feat/qa-workflow-optimize`
> 前置: Session 1-5 已完成

## 目标

1. 确认 intermediate-format.md 的状态文件 Schema 已完全对齐（Session 1 的遗留验证）。
2. config.json 补齐缺失的 requirements 路径字段。

## 涉及文件

| 文件 | 改动类型 | 对应 Task |
|------|---------|-----------|
| `.claude/skills/test-case-generator/references/intermediate-format.md` | 验证 + 补充 | T09 |
| `.claude/config.json` | 补齐字段 | T10 |

## 详细改动

### T09: intermediate-format.md 最终验证

Session 1 已对此文件做过主要修改。本 session 做最终验证和查漏补缺：

#### 检查清单

1. `.qa-state.json` Schema 示例中：
   - `last_completed_step` 的值为字符串（如 `"prd-enhancer"`），不是纯数字（`0` 除外）
   - 不存在 `steps_completed` 字段
   - 存在 `execution_log` 字段及其示例
   - 存在 `formalize_warnings` 字段说明（Session 3 引入）

2. 「状态字段说明」表中：
   - `last_completed_step` 说明引用了 SKILL.md 步骤顺序定义表
   - 包含 `execution_log` 的说明
   - 包含 `formalize_warnings` 的说明
   - 包含 `retry_count` 的说明（Session 3 在 SKILL.md 中引入）
   - 不包含已废弃的 `steps_completed`

3. 「关键状态转移」表中：
   - 所有 step 引用使用字符串 ID（`0` 除外）
   - Writer 终态判断条件中包含对 `retry_count` 的描述

如果发现任何遗漏，直接修正。

#### 补充 formalize_warnings 字段

如果 Session 3 没有在 intermediate-format.md 中补充此字段，在 Schema 示例中 `"writers"` 之前新增：

```json
"formalize_warnings": ["字段信息不足", "源码补充章节为空"],
```

在字段说明表中新增：

| 字段 | 说明 |
|------|------|
| `formalize_warnings` | prd-formalize 质量闸口产生的警告列表。非阻断警告记录于此，在后续 prd-enhancer 健康度报告中一并展示 |

### T10: config.json 补齐 requirements 字段

当前 `batch-works`、`data-query`、`variable-center`、`public-service` 四个模块缺少 `requirements` 字段。

为这 4 个模块补齐：

```json
"batch-works": {
  "zh": "离线开发",
  "type": "dtstack",
  "xmind": "cases/xmind/batch-works/",
  "archive": "cases/archive/batch-works/",
  "requirements": "cases/requirements/batch-works/"
},
```

```json
"data-query": {
  "zh": "统一查询",
  "type": "dtstack",
  "xmind": "cases/xmind/data-query/",
  "archive": "cases/archive/data-query/",
  "requirements": "cases/requirements/data-query/"
},
```

```json
"variable-center": {
  "zh": "变量中心",
  "type": "dtstack",
  "xmind": "cases/xmind/variable-center/",
  "archive": "cases/archive/variable-center/",
  "requirements": "cases/requirements/variable-center/"
},
```

```json
"public-service": {
  "zh": "公共组件",
  "type": "dtstack",
  "xmind": "cases/xmind/public-service/",
  "archive": "cases/archive/public-service/",
  "requirements": "cases/requirements/public-service/"
},
```

注意：不需要创建这些目录（它们会在第一次使用时自动创建），只需要在 config.json 中声明。

## 完成标准

- [ ] intermediate-format.md 的 Schema 示例中 last_completed_step 为字符串
- [ ] intermediate-format.md 不包含 steps_completed 字段
- [ ] intermediate-format.md 包含 execution_log 字段定义
- [ ] intermediate-format.md 包含 formalize_warnings 字段定义
- [ ] 关键状态转移表无纯数字 step 引用（0 除外）
- [ ] config.json 的 batch-works 模块包含 requirements 字段
- [ ] config.json 的 data-query 模块包含 requirements 字段
- [ ] config.json 的 variable-center 模块包含 requirements 字段
- [ ] config.json 的 public-service 模块包含 requirements 字段

## Commit

```
git add -A && git commit -m "chore: finalize state schema and add missing config requirements paths (T09+T10)"
```
