<!-- step-id: brainstorm | delegate: testCaseOrchestrator -->
# Step brainstorm：Brainstorming + 解耦分析

> 前置条件: `last_completed_step` == `"prd-enhancer"`
> 快速模式: **跳过**
> DTStack 专属: 否

> **快速模式时跳过此步骤，不执行本文件内容。**

## 3.1 Brainstorming

此时已有增强后的 PRD（含完整图片描述），可以进行有实质内容的测试分析。

基于增强后 PRD 的关键信息，与用户讨论：

- 本次覆盖的功能模块清单
- P0 核心路径（冒烟用例的范围）
- 高风险场景（联动逻辑复杂的字段、权限相关功能、审批流程等）
- 是否有已知的历史 Bug 需要重点覆盖

基于当前需求内容，通过**归档索引**检索相关历史用例：

1. 从增强后 PRD 提取 3-5 个核心关键词（如：数据质量、质量规则、质量问题台账）
2. 使用索引脚本按模块 + tags 检索：
   ```bash
   node .claude/shared/scripts/build-archive-index.mjs --query <module-key> --tags 关键词1,关键词2
   ```
   输出为紧凑 JSON，包含匹配文件的路径、名称、tags 和用例数。
3. 从查询结果中选择 tags 重叠 ≥2 个的文件，直接读取完整内容
4. 整理已覆盖的功能点，避免重复

> 若索引查询无结果，可回退到 Grep 搜索：`grep -rl "关键词" cases/archive/<module>/ --include="*.md"`

## 3.2 需求解耦分析

读取所有增强后的 PRD，按照 `references/decoupling-heuristics.md` 中的规则进行解耦分析：

1. 识别所有独立功能页面（列表页、新增页、详情页、设置页等）
2. 识别 CRUD 操作（增/查/改/删）
3. 判断模块间耦合度
4. 确定 Writer Subagent 数量和各自负责范围
5. 估算每个 Writer 的用例数量

## 错误处理

- **历史用例检索无结果**：跳过历史去重，向用户说明本模块无历史参考

---

## 步骤完成后

更新 `.qa-state.json`：
- `last_completed_step` → `"brainstorm"`
- 记录拆分方案（各 Writer 预计覆盖范围和用例数）

同时向 `execution_log` 数组追加：
```json
{"step": "brainstorm", "status": "completed", "at": "<ISO8601>", "duration_ms": null, "summary": "完成需求解耦分析，确定 N 个 Writer 方案，估算 M 条用例"}
```
