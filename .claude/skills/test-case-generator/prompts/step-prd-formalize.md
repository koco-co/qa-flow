# Step prd-formalize：DTStack 正式需求文档整理

> 本步骤仅在模块类型为 DTStack 时执行。将蓝湖原始文本 / raw PRD 结合源码上下文整理为正式需求文档。

## 触发时机

- 输入来源为蓝湖 URL（lanhu-ingest 产出 raw PRD 后）
- 或用户提供的 PRD 为蓝湖原始文本 dump，质量不足以直接写用例时

## 执行流程

调用 `prd-formalizer` agent（`.claude/skills/prd-enhancer/prompts/prd-formalizer.md`）：

1. 读取蓝湖原文 / raw PRD 文件（来自 Step parse-input 或 lanhu-ingest）
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
5. 输出正式需求文档：
   - 路径：`cases/requirements/<module>/Story-<YYYYMMDD>/PRD-XX-<功能名>-formalized.md`
   - 此文件作为后续 prd-enhancer 的输入

## 质量要求

- 字段名、按钮名、菜单名以源码与原型图交集为准
- 出现冲突时，明确标注"PRD 未说明，基于源码推断"
- 确保正式文档可独立阅读，不依赖蓝湖原文

## 步骤完成后

更新 `.qa-state.json`：将 `last_completed_step` 设为 `"prd-formalize"`。
