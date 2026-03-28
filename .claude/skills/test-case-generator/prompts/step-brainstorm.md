<!-- step-id: brainstorm | delegate: testCaseOrchestrator -->
# Step brainstorm：Brainstorming + 解耦分析

> **快速模式（quick-mode）时此步骤已被 workflow 跳过，不执行本文件内容。**

## 3.1 Brainstorming

此时已有增强后的 PRD（含完整图片描述），可以进行有实质内容的测试分析。

基于增强后 PRD 的关键信息，与用户讨论：

- 本次覆盖的功能模块清单
- P0 核心路径（冒烟用例的范围）
- 高风险场景（联动逻辑复杂的字段、权限相关功能、审批流程等）
- 是否有已知的历史 Bug 需要重点覆盖

同时读取历史用例目录下的 .md 文件（DTStack 平台：`cases/archive/<module>/`，信永中和：`cases/archive/custom/xyzh/`），整理已覆盖的功能点，避免重复。

## 3.2 需求解耦分析

读取所有增强后的 PRD，按照 `references/decoupling-heuristics.md` 中的规则进行解耦分析：

1. 识别所有独立功能页面（列表页、新增页、详情页、设置页等）
2. 识别 CRUD 操作（增/查/改/删）
3. 判断模块间耦合度
4. 确定 Writer Subagent 数量和各自负责范围
5. 估算每个 Writer 的用例数量

## 步骤完成后

```bash
node .claude/scripts/harness-state-machine.mjs \
  --advance brainstorm \
  --state-path <story-dir>/.qa-state.json
```
