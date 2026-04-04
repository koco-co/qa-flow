<!-- step-id: brainstorm | delegate: testCaseOrchestrator -->
# Step brainstorm：Brainstorming + 解耦分析

> 前置条件: `last_completed_step` == `"prd-enhancer"`
> 快速模式: **部分执行**（仅执行 3.1 历史用例检索，跳过 3.2 需求解耦分析和 Brainstorming 讨论）
## 3.1 历史用例检索（快速模式也执行）

基于当前需求内容，通过**归档索引**检索相关历史用例：

1. 从增强后 PRD 提取 3-5 个核心关键词（如：商品管理、订单处理、用户中心）
2. 使用索引脚本按模块 + tags 检索：
   ```bash
   node .claude/shared/scripts/build-archive-index.mjs --query <module-key> --tags 关键词1,关键词2
   ```
   输出为紧凑 JSON，包含匹配文件的路径、名称、tags 和用例数。
3. 从查询结果中选择 tags 重叠 ≥2 个的文件，直接读取完整内容
4. 整理已覆盖的功能点，避免重复
5. 将匹配的文件路径和已覆盖功能点记录到 `.qa-state.json` 的 `archive_references` 字段，供 Writer 步骤使用

> 若索引查询无结果，可回退到 Grep 搜索：`grep -rl "关键词" cases/archive/<module>/ --include="*.md"`

> **快速模式到此结束**，跳过下方 3.2 和 3.3。

## 3.2 Brainstorming（快速模式跳过）

此时已有增强后的 PRD（含完整图片描述），可以进行有实质内容的测试分析。

基于增强后 PRD 的关键信息，与用户讨论：

- 本次覆盖的功能模块清单
- P0 核心路径（冒烟用例的范围）
- **跨模块联动场景**：识别 PRD 中"创建后可执行/运行/触发/调度"的记录，梳理其完整生命周期（创建 → 执行 → 实例生成 → 状态流转 → 下游影响），明确需要验证哪些关联模块
- 高风险场景（联动逻辑复杂的字段、权限相关功能、审批流程等）
- 是否有已知的历史 Bug 需要重点覆盖

## 3.3 需求解耦分析（快速模式跳过）

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
- `last_completed_step` → `"brainstorm"`（快速模式下也更新为此值，标识历史检索已完成）
- `archive_references`：匹配的历史用例文件路径列表和已覆盖功能点
- 记录拆分方案（各 Writer 预计覆盖范围和用例数）（仅普通模式）

同时向 `execution_log` 数组追加：
```json
{"step": "brainstorm", "status": "completed", "at": "<ISO8601>", "duration_ms": null, "summary": "完成需求解耦分析，确定 N 个 Writer 方案，估算 M 条用例"}
```

快速模式下 summary 改为：
```json
{"step": "brainstorm", "status": "completed", "at": "<ISO8601>", "duration_ms": null, "summary": "快速模式：完成历史用例检索，匹配 N 个文件，跳过解耦分析"}
```
