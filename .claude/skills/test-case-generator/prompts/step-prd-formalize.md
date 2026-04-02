<!-- step-id: prd-formalize | delegate: testCaseOrchestrator -->
# Step prd-formalize：正式需求文档整理

> 前置条件: `last_completed_step` == `"source-sync"`
> 快速模式: 执行

> 本步骤仅在 config.json 中 `repos` 字段为非空对象时执行。将原始 PRD 文本结合源码上下文整理为正式需求文档。
> **若 `repos: {}` 则跳过**：
> 1. 向 execution_log 追加 `{"step": "prd-formalize", "status": "skipped", "reason": "config.repos is empty"}`
> 2. 更新 `last_completed_step` 为 `"prd-formalize"`
> 3. 继续下一步（prd-enhancer）

## 触发时机

- 输入来源为蓝湖 URL（lanhu-ingest 产出 raw PRD 后）
- 或用户提供的 PRD 为蓝湖原始文本 dump，质量不足以直接写用例时

## 执行流程

调用 `prd-formalizer` agent（`.claude/skills/prd-enhancer/prompts/prd-formalizer.md`）：

1. 读取蓝湖原文 / raw PRD 文件（来自 Step parse-input 或 lanhu-ingest）
   - **优先读取 `## 需求澄清结果` 章节**（若存在）：将其中的字段定义、验收标准、使用场景等信息作为补充输入，与 PRD 原文合并分析
2. 读取 `.qa-state.json.source_context` 中的分支信息
3. 在 `.repos/` 目标分支源码中查找：
   - 对应的 Controller / Service / DAO 类
   - DTO/VO 校验注解和字段定义
   - 接口路径和参数
   - 前端组件和状态枚举
4. 结合源码上下文，将 raw PRD 整理为结构化正式需求文档，包含：
   - 功能概述
   - 页面/模块拆分（按系统菜单对齐）
   - 各字段真实名称（以源码为准，标注"基于源码推断"）
   - 主流程和异常流程描述
   - 前置条件（数据源/环境依赖）
5. 输出正式需求整理结果：
   - 产物形态：临时整理结果 / formalize 摘要
   - 持久化策略：**不在 `cases/prds` 下持久化 formalized.md**
   - 如需短暂落盘，仅允许写入当前会话目录或 prds 目录下的 `.trash/` 临时区，并在增强完成后清理
   - 后续 prd-enhancer 直接消费上述临时整理结果或摘要，不再依赖稳定的 `PRD-*-formalized.md` 文件

## 质量要求

- 字段名、按钮名、菜单名以源码与原型图交集为准
- 出现冲突时，明确标注"PRD 未说明，基于源码推断"
- 确保正式文档可独立阅读，不依赖蓝湖原文

## 质量闸口（formalize 完成后必须执行）

对 formalize 产出的临时整理结果执行以下自动检查：

| 检查项 | 通过条件 | 级别 |
|--------|---------|------|
| 页面级标题 | 正文包含至少 1 个 `####` 级标题（对应页面设计） | 阻断 |
| 字段信息 | 正文包含至少 1 处字段名称描述（中文名或 DTO 字段名） | 警告 |
| 按钮/操作 | 正文包含至少 1 处【xxx】格式的按钮引用 | 警告 |
| 源码补充 | 「源码补充事实」章节不为空（仅当 config.repos 非空） | 警告 |
| 推断标注 | `[基于源码推断]` / `[PRD 未说明]` 标注数不超过总字段数的 60% | 警告 |

**阻断处理**（任一阻断项未通过）：

向用户展示：
```
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

## 错误处理

- **prd-formalizer 输出为空或缺少关键章节**：提示用户检查 PRD 质量，建议先修改 PRD 后重试
- **质量闸口阻断（缺少页面级标题）**：向用户展示阻断原因和 A/B 选项，等待用户决策后继续

---

## 步骤完成后

更新 `.qa-state.json`：
- `last_completed_step` → `"prd-formalize"`

同时向 `execution_log` 数组追加：
```json
{"step": "prd-formalize", "status": "completed", "at": "<ISO8601>", "duration_ms": null, "summary": "完成 PRD 形式化整理，已生成临时整理结果供 prd-enhancer 使用"}
```
