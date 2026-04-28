# 策略模板

> 单点维护 5 套策略（S1-S5）在 transform / analyze / writer 三个 agent 下的 prompt 变体。
> 本文件为静态定义；agent 在任务提示收到 `strategy_id` 时读取对应 section。

## 命中顺序

S5 → S2 → S3 → S1 → S4（默认兜底）

先判断可否外转（S5），再按高优先级能力型（S2 源码 / S3 历史）路由，完整型 S1 需三维度同时强，否则一律 S4。

---

## S1 / transform

- **prompt_variant**：`standard`
- **关键差异**：基准行为，无特殊差异；三方（PRD / 源码 / 历史）信号均强时，transform 按常规流程填充字段定义表，🔵 源码标注优先，🟢 蓝湖原文兜底，🟡 历史参考辅助
- **override 字段**：

```json
{
  "transform": {
    "prompt_variant": "standard",
    "prd_fill_priority": "source_cross_prd",
    "skip_field_table_healthcheck": false
  }
}
```

- **引用**：spec §4.3.1 / §4.3.3

---

## S1 / analyze

- **prompt_variant**：`standard`
- **关键差异**：7 维度头脑风暴全量展开（功能正向、功能逆向、边界、异常、权限、并发、回归）；不裁剪维度，writer 并发数按 analyze 建议上限
- **override 字段**：

```json
{
  "analyze": {
    "prompt_variant": "standard",
    "dimensions": [
      "functional_positive",
      "functional_negative",
      "boundary",
      "exception",
      "permission",
      "concurrent",
      "regression"
    ],
    "regression_baseline": false
  }
}
```

- **引用**：spec §4.3.1

---

## S1 / writer

- **prompt_variant**：`standard`
- **关键差异**：基准写作行为；knowledge 按档位决定注入模式（strong → read-module + read-core；weak → read-core；missing → 跳过）；历史模板复用无强制比例要求
- **override 字段**：

```json
{
  "writer": {
    "prompt_variant": "standard",
    "knowledge_injection": "read-module",
    "reuse_history_ratio": null
  }
}
```

- **引用**：spec §4.3.1 / §4.3.3

---

## S2 / transform

- **prompt_variant**：`standard`
- **关键差异**：相比 S1，PRD 信号弱或缺失；transform 重源码、轻 PRD 填充——字段定义表优先从源码 A 级命中中提取 API/字段定义，PRD 字段表仅作补充；🔵 标注比例预期高于 S1
- **override 字段**：

```json
{
  "transform": {
    "prompt_variant": "standard",
    "prd_fill_priority": "source_first",
    "skip_field_table_healthcheck": true
  }
}
```

- **引用**：spec §4.3.1

---

## S2 / analyze

- **prompt_variant**：`standard`
- **关键差异**：相比 S1，维度不裁剪，但 analyze 在生成测试点时优先从源码 API/字段推断接口行为，而非从 PRD 字段表推断；PRD 字段表为辅助信源
- **override 字段**：

```json
{
  "analyze": {
    "prompt_variant": "standard",
    "dimensions": [
      "functional_positive",
      "functional_negative",
      "boundary",
      "exception",
      "permission",
      "concurrent",
      "regression"
    ],
    "source_inference_priority": true,
    "regression_baseline": false
  }
}
```

- **引用**：spec §4.3.1

---

## S2 / writer

- **prompt_variant**：`source_first`
- **关键差异**：相比 S1，writer prompt 强调"优先从源码推断 API 行为和字段约束"；knowledge 注入按档位决定（strong → read-module + read-core；weak → read-core；missing → 跳过）；历史模板复用无强制比例要求
- **override 字段**：

```json
{
  "writer": {
    "prompt_variant": "source_first",
    "knowledge_injection": "read-core",
    "reuse_history_ratio": null
  }
}
```

- **引用**：spec §4.3.1 / §4.3.3

---

## S3 / transform

- **prompt_variant**：`standard`
- **关键差异**：相比 S1，源码信号弱；transform 允许 🟡 历史参考标注比例更高；字段定义表中源码 A 级不足时，以历史归档用例中的前置条件、入参描述作为字段约束的补充依据
- **override 字段**：

```json
{
  "transform": {
    "prompt_variant": "standard",
    "prd_fill_priority": "history_first",
    "skip_field_table_healthcheck": false
  }
}
```

- **引用**：spec §4.3.1

---

## S3 / analyze

- **prompt_variant**：`standard`
- **关键差异**：相比 S1，7 维度裁剪为 4 维（正向 / 逆向 / 边界 / 回归），去掉权限、并发、异常三个维度；同时生成回归基线（列举历史用例中与当前模块高相关的用例 ID，标记为"回归必跑"）
- **override 字段**：

```json
{
  "analyze": {
    "prompt_variant": "standard",
    "dimensions": [
      "functional_positive",
      "functional_negative",
      "boundary",
      "regression"
    ],
    "regression_baseline": true
  }
}
```

- **引用**：spec §4.3.1

---

## S3 / writer

- **prompt_variant**：`regression_focused`
- **关键差异**：相比 S1，writer 需要复用历史模板 ≥ 50%，并在 prompt 中强调"与历史一致性"；knowledge 按 knowledge 档位决定注入模式；review 阈值不收紧（problem_rate_block 保持 0.4）
- **override 字段**：

```json
{
  "writer": {
    "prompt_variant": "regression_focused",
    "reuse_history_ratio": 0.5,
    "knowledge_injection": "read-core"
  }
}
```

- **引用**：spec §4.3.1 / §4.3.3

---

## S4 / transform

- **prompt_variant**：`standard`
- **关键差异**：相比 S1，三维度信号均弱或缺失；transform 降低期望，🟡 阈值放宽至 0.5（即字段填充率 < 0.5 时仍继续而非报错）；字段定义表中大量字段标注为"待确认"
- **override 字段**：

```json
{
  "transform": {
    "prompt_variant": "standard",
    "prd_fill_priority": "source_cross_prd",
    "skip_field_table_healthcheck": false,
    "yellow_threshold": 0.5
  }
}
```

- **引用**：spec §4.3.1

---

## S4 / analyze

- **prompt_variant**：`standard`
- **关键差异**：相比 S1，analyze 维度不裁剪，但测试点生成时标注置信度（低置信度的测试点打"❓待确认"标记）；不生成回归基线（历史信号弱）
- **override 字段**：

```json
{
  "analyze": {
    "prompt_variant": "standard",
    "dimensions": [
      "functional_positive",
      "functional_negative",
      "boundary",
      "exception",
      "permission",
      "concurrent",
      "regression"
    ],
    "regression_baseline": false,
    "annotate_low_confidence": true
  }
}
```

- **引用**：spec §4.3.1

---

## S4 / writer

- **prompt_variant**：`conservative`
- **关键差异**：相比 S1，writer 进入保守模式：🟡 阈值降到 0.5（更多字段标为历史参考）；review 节点 problem_rate 阈值收紧至 30% 就阻断；clarify_default_severity=blocking_unknown（遇到不确定项直接标为阻断，不推默认值）；knowledge 注入按档位决定（missing 时跳过）
- **override 字段**：

```json
{
  "writer": {
    "prompt_variant": "conservative",
    "knowledge_injection": "none",
    "reuse_history_ratio": null
  },
  "review": {
    "problem_rate_block": 0.3
  },
  "thresholds": {
    "clarify_default_severity": "blocking_unknown"
  }
}
```

- **引用**：spec §4.3.1 / §4.3.3

---

## S5 / transform

- **prompt_variant**：`standard`
- **关键差异**：S5 为路由外转策略，transform 节点不执行（skip=true）；主 agent 在 probe 节点即通过 AskUserQuestion 引导用户切换到 hotfix-case-gen，不会到达 transform
- **override 字段**：

```json
{
  "transform": {
    "skip": true
  }
}
```

- **引用**：spec §4.3.1

---

## S5 / analyze

- **prompt_variant**：`standard`
- **关键差异**：S5 为路由外转策略，analyze 节点不执行（skip=true）；主 agent 在 probe 节点即通过 AskUserQuestion 引导用户切换到 hotfix-case-gen，不会到达 analyze
- **override 字段**：

```json
{
  "analyze": {
    "skip": true
  }
}
```

- **引用**：spec §4.3.1

---

## S5 / writer

- **prompt_variant**：`blocked`
- **关键差异**：S5 为路由外转策略，writer 不下发；主 agent 在 probe 节点即 AskUserQuestion："检测到 PRD 缺失但源码变更明显，建议切换到 hotfix-case-gen skill"；用户选择继续则降级 S4，选切换则 workflow 停止
- **override 字段**：

```json
{
  "writer": {
    "prompt_variant": "blocked",
    "skip": true
  }
}
```

- **引用**：spec §4.3.1
