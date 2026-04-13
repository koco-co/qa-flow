# 数据资产主流程测试用例编写 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于源码分析生成标品 v6.3 和岚图定制版数据资产的主流程回归测试用例 MD 文件。

**Architecture:** 两份独立 MD 文件可并行编写。每份文件按 14 个模块组织，每个模块的用例基于 CSV 骨架 + 源码增强。岚图版在标品基础上追加 3 个定制模块（车辆维度统计、自定义规则引擎、JSON 字段校验），数据质量模块为重点扩展。

**Tech Stack:** Markdown（archive MD 格式）、XMind 层级映射（H2-H5）

**关键参考文件：**
- 设计文档：`docs/superpowers/specs/2026-04-10-data-assets-main-flow-testcases-design.md`
- CSV 参考：`workspace/historys/数据资产_STD-主流程用例.csv`
- 偏好规则：`preferences/case-writing.md`（按钮名称、菜单路径、数据质量菜单结构）
- XMind 结构偏好：`preferences/xmind-structure.md`（层级映射规范）

**输出目录：** `workspace/archive/数据资产-主流程用例/`

---

## Task 1: 创建输出目录

**Files:**
- Create: `workspace/archive/数据资产-主流程用例/` (目录)

- [ ] **Step 1: 创建目录**

```bash
mkdir -p /Users/poco/Projects/qa-flow/workspace/archive/数据资产-主流程用例
```

---

## Task 2: 编写标品v6.3-主流程用例.md — 元数据模块（5 个子模块，30 个用例）

**Files:**
- Create: `workspace/archive/数据资产-主流程用例/标品v6.3-主流程用例.md`（起始部分）

**参考源码：**
- 前端菜单/页面：`workspace/.repos/dt-insight-studio/apps/dataAssets/src/views/metaDataCenter/`、`metaDataSync/`、`metaModalManage/`、`metaData/`
- 前端 API 调用：`workspace/.repos/dt-insight-studio/apps/dataAssets/src/api/metaDataCenter.ts`、`metaData.ts`、`metaDataSync.ts`
- 后端 Controller：`workspace/.repos/dt-insight-web/dt-center-metadata/web/src/main/java/com/dtstack/metadata/controller/`

**偏好规则要点（必须遵循）：**
- 纯功能测试视角，不出现路由/API/技术实现信息
- 按钮名称必须与 UI 一致（参照 preferences/case-writing.md 第 5 节）
- 数据源类型：标品使用 Hive2.x / Doris3.x 混合验证

- [ ] **Step 1: 写入 frontmatter 和通用前置条件**

```markdown
---
suite_name: "标品v6.3-主流程用例"
description: "数据资产标品v6.3主流程回归测试用例"
tags:
  - "主流程"
  - "回归"
  - "标品"
  - "v6.3"
create_at: "2026-04-10"
status: "草稿"
case_count: 0
---

## 通用前置条件

> 适用于本测试套件所有用例的全局环境约定

- 已部署数据资产标品 v6.3.x 环境
- 已引入至少一个 Hive2.x 数据源和一个 Doris3.x 数据源
- 数据源下已创建测试数据库及测试表
- 当前用户具有管理员权限
```

- [ ] **Step 2: 编写元数据-数据地图用例（6 个）**

阅读源码获取实际页面结构：
- `workspace/.repos/dt-insight-studio/apps/dataAssets/src/views/metaDataCenter/`（首页统计、搜索）
- `workspace/.repos/dt-insight-studio/apps/dataAssets/src/views/metaDataSearch/`（搜索结果页）
- `workspace/.repos/dt-insight-studio/apps/dataAssets/src/views/metaDataDetails/`（详情页）

结合 CSV 用例 #146425~#146430 的测试点，编写 6 个用例：
1. 【P2】验证数据地图首页资产类型统计正确
2. 【P2】验证搜索结果页支持按数据源类型筛选查询
3. 【P2】验证视图搜索功能正常
4. 【P2】验证表详情页-批量编辑功能
5. 【P2】验证表删除功能（删除元数据表/删除源表）
6. 【P2】验证离线任务详情页-血缘解析功能

每个用例包含：前置条件（如需）、步骤表格（编号/步骤/预期）。步骤必须具体到点击哪个按钮、填写哪个字段、预期看到什么文案。

- [ ] **Step 3: 编写元数据-元数据同步用例（8 个）**

阅读源码：
- `workspace/.repos/dt-insight-studio/apps/dataAssets/src/views/metaDataSync/`

结合 CSV 用例 #146432~#146436，编写 8 个用例：
1. 【P2】验证元数据同步任务创建与执行
2. 【P2】验证同步数据正确性（数据库/数据表/字段）
3. 【P2】验证过滤表功能
4. 【P2】验证离线建表自动同步至数据地图
5. 【P3】验证离线建视图同步至数据地图
6. 【P3】验证同步任务编辑功能
7. 【P3】验证同步任务删除功能
8. 【P2】验证同步实例日志查看

- [ ] **Step 4: 编写元数据-元模型管理用例（6 个）**

阅读源码：
- `workspace/.repos/dt-insight-studio/apps/dataAssets/src/views/metaModalManage/`

结合 CSV 用例 #146440~#146444，编写 6 个用例：
1. 【P2】验证技术属性初始化显示正确
2. 【P2】验证通用业务属性CRUD功能
3. 【P3】验证个性业务属性-新增（枚举/文本框/树形目录）
4. 【P3】验证个性业务属性-编辑
5. 【P3】验证个性业务属性-删除
6. 【P2】验证业务属性在数据表详情页生效

- [ ] **Step 5: 编写元数据-元数据管理用例（5 个）**

阅读源码：
- `workspace/.repos/dt-insight-studio/apps/dataAssets/src/views/metaData/manageTables/`
- `workspace/.repos/dt-insight-studio/apps/dataAssets/src/views/metaData/tablesDetails/`

结合 CSV 用例 #146445~#146448，编写 5 个用例。

- [ ] **Step 6: 编写元数据-元数据质量用例（5 个）**

阅读源码：
- `workspace/.repos/dt-insight-studio/apps/dataAssets/src/views/metaData/metadataValid/integrityAnalysis/`
- `workspace/.repos/dt-insight-studio/apps/dataAssets/src/views/metaData/metadataValid/kinshipAnalysis/`

结合 CSV 用例 #146449~#146453，编写 5 个用例。

---

## Task 3: 编写标品v6.3-主流程用例.md — 数据标准 + 数据模型（13 个用例）

**Files:**
- Modify: `workspace/archive/数据资产-主流程用例/标品v6.3-主流程用例.md`（追加）

**参考源码：**
- 数据标准前端：`workspace/.repos/dt-insight-studio/apps/dataAssets/src/views/dataStandard/`
- 数据标准后端：`workspace/.repos/dt-insight-web/dt-center-metadata/` 中 DataStandardController
- 数据模型前端：`workspace/.repos/dt-insight-studio/apps/dataAssets/src/views/dataModel/`

- [ ] **Step 1: 编写数据标准用例（9 个）**

用例清单及对应源码位置：
1. 【P3】验证标准目录CRUD — `views/dataStandard/` 中目录树组件
2. 【P2】验证数据标准-新增 — `views/dataStandard/dataStandard/` 新增表单
3. 【P2】验证数据标准-编辑与发布 — 编辑表单 + 发布按钮
4. 【P3】验证数据标准-下线与删除 — 状态流转逻辑
5. 【P2】验证数据标准-导入导出 — 导入/导出功能
6. 【P2】验证标准映射-创建映射关系 — `views/dataStandard/standardMapping/`
7. 【P3】验证标准映射-查看与编辑
8. 【P3】验证词根管理CRUD — `views/dataStandard/standardBasis/rootManage/`
9. 【P2】验证码表管理CRUD — `views/dataStandard/standardBasis/codeTableManage/`

- [ ] **Step 2: 编写数据模型用例（4 个）**

1. 【P2】验证建表语句解析功能 — `views/dataModel/builtSpecificationTable/`
2. 【P2】验证CSV创建数据表
3. 【P2】验证模型发布与审批流程 — `views/dataModel/myModel/`
4. 【P3】验证建表查询与版本管理

---

## Task 4: 编写标品v6.3-主流程用例.md — 数据质量（10 个用例，重点模块）

**Files:**
- Modify: `workspace/archive/数据资产-主流程用例/标品v6.3-主流程用例.md`（追加）

**参考源码（核心）：**
- 前端页面：`workspace/.repos/dt-insight-studio/apps/dataAssets/src/views/valid/`
- 前端 API：`workspace/.repos/dt-insight-studio/apps/dataAssets/src/api/ruleConfig.ts`、`dataCheck.ts`、`qualityReport.ts`
- 后端 Controller：`workspace/.repos/dt-insight-web/dt-center-assets/web/src/main/java/com/dtstack/assets/controller/valid/`
  - MonitorController、MonitorRuleController、RuleCollectionController、MonitorRecordController

**偏好规则（必须严格遵循 preferences/case-writing.md）：**
- 核心业务关系：规则库配置 → 规则集管理 → 规则任务管理
- 用例中不得跳过规则集直接在规则任务中创建质量规则
- 规则任务通过"导入规则包"引用规则集
- 按钮名称：【新建规则集】、【新建监控规则】、【下一步】、【保存】、【导入规则包】
- 规则集数据源类型限制：仅支持 Hive2.x、SparkThrift2.x、Doris3.x
- 数据质量菜单顺序：总览 → 规则库配置 → 规则集管理 → 规则任务管理 → 校验结果查询 → 数据质量报告 → 通用配置 → 项目管理

- [ ] **Step 1: 编写规则库配置用例（3 个）**

阅读源码了解内置规则/自定义规则/SQL 模板三个 Tab 的具体字段和操作：
1. 【P2】验证规则库配置-内置规则列表与启停
2. 【P2】验证规则库配置-自定义规则CRUD
3. 【P3】验证规则库配置-SQL模板CRUD

- [ ] **Step 2: 编写规则集管理用例（2 个）**

阅读源码了解两步表单结构（基础信息 → 监控规则）：
- 表单字段参照 preferences/case-writing.md 第 2 节
4. 【P2】验证规则集管理-新建规则集（两步表单）
5. 【P3】验证规则集管理-编辑与删除

- [ ] **Step 3: 编写规则任务管理用例（2 个）**

阅读源码了解三步表单结构（监控对象 → 监控规则 → 调度属性）：
- 表单字段参照 preferences/case-writing.md 第 3 节
6. 【P2】验证规则任务-新建单表监控规则（三步表单）
7. 【P2】验证规则任务-开启/关闭检测与立即执行

- [ ] **Step 4: 编写校验结果/报告/项目管理用例（3 个）**

8. 【P2】验证校验结果查询-查看执行结果与报告
9. 【P2】验证质量报告配置与查看
10. 【P3】验证项目管理-脏数据管理

---

## Task 5: 编写标品v6.3-主流程用例.md — 数据治理 + 数据安全（22 个用例）

**Files:**
- Modify: `workspace/archive/数据资产-主流程用例/标品v6.3-主流程用例.md`（追加）

**参考源码：**
- 数据治理：`workspace/.repos/dt-insight-studio/apps/dataAssets/src/views/dataGovernance/fileGovernance/`
- 数据安全：`workspace/.repos/dt-insight-studio/apps/dataAssets/src/views/dataSecurity/`、`views/platformManage/dataClassify/`、`views/platformManage/dataDesensitization/`

- [ ] **Step 1: 编写数据治理用例（2 个）**

1. 【P2】验证小文件治理-规则配置
2. 【P2】验证小文件治理-执行与查看记录

- [ ] **Step 2: 编写数据安全-分级分类用例（10 个）**

结合 CSV 用例 #146419~#146423，阅读源码 `views/platformManage/dataClassify/`：
1. 【P3】验证级别管理-新增级别
2. 【P3】验证级别管理-编辑级别
3. 【P3】验证级别管理-删除级别
4. 【P2】验证自动分级规则-创建与配置
5. 【P2】验证自动分级规则-执行自动分级
6. 【P2】验证分级数据-查询（级别+搜索+分类组合筛选）
7. 【P2】验证分级数据-发布（同字段多级别取高）
8. 【P2】验证分级数据-下架
9. 【P2】验证分级数据-字段删除后显示标记
10. 【P3】验证分级数据-字段修改后显示标记

- [ ] **Step 3: 编写数据安全-脱敏 + 权限用例（10 个）**

阅读源码 `views/platformManage/dataDesensitization/`、`views/dataSecurity/dataAuth/`：
11-13. 脱敏规则管理（新增/编辑/删除）
14-16. 脱敏表配置与生效验证
17-20. 数据权限（分配/查看/转让/收回）

---

## Task 6: 编写标品v6.3-主流程用例.md — 平台管理 + 资产盘点（34 个用例）

**Files:**
- Modify: `workspace/archive/数据资产-主流程用例/标品v6.3-主流程用例.md`（追加）

**参考源码：**
- 数据源管理：`workspace/.repos/dt-insight-studio/apps/dataAssets/src/views/dataSourceManage/`
- 用户角色：`workspace/.repos/dt-insight-studio/apps/dataAssets/src/views/platformManage/userManage/`、`roleManage/`
- 通知中心：`workspace/.repos/dt-insight-studio/apps/dataAssets/src/views/platformManage/notificationCenter/`
- 资产盘点：`workspace/.repos/dt-insight-studio/apps/dataAssets/src/views/assetsStatistics/`

- [ ] **Step 1: 编写数据源管理用例（8 个）**
- [ ] **Step 2: 编写用户角色管理用例（8 个）**
- [ ] **Step 3: 编写通知中心用例（11 个）**
- [ ] **Step 4: 编写资产盘点用例（7 个）**
- [ ] **Step 5: 更新 frontmatter 中的 case_count 为实际用例总数**

---

## Task 7: 编写岚图-主流程用例.md — 全部 14 个标品模块（SparkThrift2.x 适配）

**Files:**
- Create: `workspace/archive/数据资产-主流程用例/岚图-主流程用例.md`

**参考源码：**
- 前端：`workspace/.repos/customltem/dt-insight-studio/apps/dataAssets/src/`（分支 dataAssets/release_6.3.x_ltqc）
- 后端：`workspace/.repos/customltem/dt-center-assets/`（分支 release_6.3.x_ltqc）
- 元数据：`workspace/.repos/customltem/dt-center-metadata/`

**关键差异（必须体现在每个用例中）：**
- 数据源类型统一为 SparkThrift2.x
- 建表语法用 Hive 风格（STRING 代替 VARCHAR）
- 脱敏 UDF 限定 Hive 系数据源

- [ ] **Step 1: 写入 frontmatter 和通用前置条件**

```markdown
---
suite_name: "岚图-主流程用例"
description: "数据资产岚图定制版主流程回归测试用例"
tags:
  - "主流程"
  - "回归"
  - "岚图"
  - "定制"
  - "SparkThrift2.x"
create_at: "2026-04-10"
status: "草稿"
case_count: 0
---

## 通用前置条件

> 适用于本测试套件所有用例的全局环境约定

- 已部署数据资产岚图定制版 v6.3.x 环境
- 已引入至少一个 SparkThrift2.x 数据源
- 数据源下已创建测试数据库及测试表（使用 Hive 语法）
- 当前用户具有管理员权限
```

- [ ] **Step 2: 编写 14 个标品模块用例（约 119 个）**

逐模块编写，结构与标品一致，但所有用例中：
- 数据源类型替换为 SparkThrift2.x
- 建表语句使用 STRING 类型
- 前置条件中的数据源描述适配岚图环境

模块列表（同标品 Task 2-6 的结构）：
1. 元数据-数据地图（6 个）
2. 元数据-元数据同步（8 个）
3. 元数据-元模型管理（6 个）
4. 元数据-元数据管理（5 个）
5. 元数据-元数据质量（5 个）
6. 数据标准（9 个）
7. 数据模型（4 个）
8. 数据质量（10 个）— 遵循 case-writing.md 偏好
9. 数据治理（2 个）
10. 数据安全（20 个）
11. 数据源管理（8 个）
12. 用户角色管理（8 个）
13. 通知中心（11 个）
14. 资产盘点（7 个）

---

## Task 8: 编写岚图-主流程用例.md — 岚图定制模块（16 个用例，重点中的重点）

**Files:**
- Modify: `workspace/archive/数据资产-主流程用例/岚图-主流程用例.md`（追加）

**参考源码（核心）：**
- 车辆维度：`workspace/.repos/customltem/dt-center-assets/` 中 MonitorSideTableController、MonitorVehicleInfoService、MonitorSideTableService
- 自定义规则：`workspace/.repos/customltem/dt-center-assets/` 中 MonitorRuleCustomController、MonitorRuleCustomService、CustomConfigParam
- JSON 校验：`workspace/.repos/customltem/dt-center-assets/` 中 MonitorRuleExpansion、RuleTaskType
- 前端页面：`workspace/.repos/customltem/dt-insight-studio/apps/dataAssets/src/views/valid/`
- SQL 增量：`workspace/.repos/customltem/dt-center-assets/sql/increment/` 中相关 SQL 文件

- [ ] **Step 1: 编写车辆维度统计用例（6 个）**

必须阅读以下源码获取实际字段名和交互逻辑：
- MonitorSideTableConfig.java — 了解维表配置字段（vehicleStatisticsField、vehicleSystemAssociationField 等在 UI 上的展示名称）
- MonitorVehicleInfo.java — 了解车辆信息字段（vehicleModel/vehicleSystem/vehiclePowerType 在 UI 上的展示名称）
- MonitorReport.java 中 needCar 字段 — 了解报告配置的 UI 展示

用例：
1. 【P2】验证通用配置-维表配置新建
2. 【P2】验证维表配置-多数据源类型适配（Hive/Doris）
3. 【P2】验证车辆统计定时任务触发与结果查看
4. 【P2】验证质量报告-车辆详情维度数据展示
5. 【P2】验证规则任务执行结果包含车辆维度统计
6. 【P3】验证维表配置-编辑与删除

- [ ] **Step 2: 编写自定义规则引擎用例（5 个）**

必须阅读以下源码：
- MonitorRuleCustom.java — 了解自定义规则实体结构
- CustomParamType.java — 了解参数类型枚举（NUMBER/ARRAY/LOGIC_RELATION/CURRENT_TABLE/CURRENT_TABLE_FIELD/CUSTOM_PARAM）在 UI 上的下拉选项名称
- MonitorRuleCustomController.java — 了解 CRUD 操作

用例：
1. 【P2】验证自定义规则-新增（数值参数类型）
2. 【P2】验证自定义规则-新增（数组/逻辑关系/表字段引用参数）
3. 【P3】验证自定义规则-编辑与详情查看
4. 【P3】验证自定义规则-删除
5. 【P2】验证自定义规则在规则任务中引用与执行

- [ ] **Step 3: 编写 JSON 字段校验用例（5 个）**

必须阅读以下源码：
- MonitorRuleExpansion.java — 了解 JSON 配置的存储结构
- RuleTaskType.java — 了解支持的校验类型（COMPLETE/NORMATIVE/ONLY/STATICS/TIMELINESS/REASONABLE）
- 前端相关页面中 JSON 校验配置的 UI 组件

用例：
1. 【P2】验证通用配置-JSON格式配置
2. 【P2】验证完整性校验-JSON中Key值范围校验
3. 【P2】验证有效性校验-JSON中Key对应Value格式校验
4. 【P3】验证JSON校验规则导入导出
5. 【P2】验证JSON校验规则与普通规则混合执行

- [ ] **Step 4: 更新 frontmatter 中的 case_count 为实际用例总数**

---

## Task 9: 最终审查与修正

**Files:**
- Review: `workspace/archive/数据资产-主流程用例/标品v6.3-主流程用例.md`
- Review: `workspace/archive/数据资产-主流程用例/岚图-主流程用例.md`

- [ ] **Step 1: 检查按钮名称一致性**

对照 preferences/case-writing.md 第 5 节，确认所有用例中的按钮名称正确：
- 【新建规则集】而非【新增规则】
- 【新建监控规则】而非【新建规则任务】
- 【导入规则包】而非【引用规则】
- 【保存】而非【确定】
- 【取消】而非【返回】

- [ ] **Step 2: 检查数据源类型一致性**

- 标品：Hive2.x / Doris3.x 混合
- 岚图：SparkThrift2.x 为主

- [ ] **Step 3: 检查用例完整性**

- 每个用例必须有：标题（含优先级）、步骤表格（编号/步骤/预期）
- 预期结果必须具体可验证，不使用模糊描述
- 前置条件在需要时必须明确

- [ ] **Step 4: 更新两份文件的 case_count**
