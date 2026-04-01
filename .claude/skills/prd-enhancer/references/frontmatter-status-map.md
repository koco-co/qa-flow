# Front-Matter 状态映射

`prd-enhancer` 相关文档遵循 **读双语、写中文** 的规则：读取时兼容历史英文值与当前中文值，写回时统一落中文状态。

## PRD 状态映射

| 读取值 | canonical | 写回值 | 说明 |
| --- | --- | --- | --- |
| `raw` / `未开始` | `raw` | `未开始` | 原始或尚未进入处理链路 |
| `elicited` / `已澄清` | `elicited` | `已澄清` | 已完成需求澄清前置能力 |
| `formalized` / `已形式化` | `formalized` | `已形式化` | 已转为正式 PRD 文档 |
| `enhanced` / `已增强` | `enhanced` | `已增强` | 已完成图片增强与结构标准化 |

## 使用规则

1. **读取阶段**：兼容英文 canonical 值与中文历史值，供脚本比较、增量检测和流程分支判断使用。
2. **写回阶段**：统一写中文状态值，不再向 front-matter 写英文状态。
3. **prd-enhancer 输出**：增强完成后，`status` 必须写为 `已增强`。
4. **权威来源**：具体映射以 `.claude/shared/scripts/frontmatter-status-utils.mjs` 与 `.claude/shared/schemas/front-matter-schema.md` 为准。
