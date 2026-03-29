# Step brainstorm：Brainstorming + 解耦分析

> **快速模式时跳过此步骤，不执行本文件内容。**

## 3.1 Brainstorming

此时已有增强后的 PRD（含完整图片描述），可以进行有实质内容的测试分析。

基于增强后 PRD 的关键信息，与用户讨论：

- 本次覆盖的功能模块清单
- P0 核心路径（冒烟用例的范围）
- 高风险场景（联动逻辑复杂的字段、权限相关功能、审批流程等）
- 是否有已知的历史 Bug 需要重点覆盖

基于当前需求内容，通过 tag 关键词检索相关历史用例：

1. 从增强后 PRD 提取 3-5 个核心关键词（如：数据质量、质量规则、质量问题台账）
2. 使用 Grep 在对应归档目录中按 tags 字段检索匹配文件：
   - DTStack 平台：`grep -rl "关键词1\|关键词2" cases/archive/<module>/ --include="*.md"`
   - 信永中和：`grep -rl "关键词1\|关键词2" cases/archive/custom/xyzh/ --include="*.md"`
3. 对匹配文件，先读取 front-matter（文件头部 `---...---` 块）获取 name/tags/case_count 概览
4. 仅对 tags 重叠 ≥2 个的文件读取完整内容
5. 整理已覆盖的功能点，避免重复

> 若归档文件尚未添加 front-matter（旧格式以 `# 标题` 开头），直接读取文件内容。

## 3.2 需求解耦分析

读取所有增强后的 PRD，按照 `references/decoupling-heuristics.md` 中的规则进行解耦分析：

1. 识别所有独立功能页面（列表页、新增页、详情页、设置页等）
2. 识别 CRUD 操作（增/查/改/删）
3. 判断模块间耦合度
4. 确定 Writer Subagent 数量和各自负责范围
5. 估算每个 Writer 的用例数量

## 步骤完成后

更新 `.qa-state.json`：将 `last_completed_step` 设为 `"brainstorm"`。
