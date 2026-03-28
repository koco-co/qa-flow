<!-- enhanced-at: 2026-03-28T12:12:17Z -->

# 【内置规则丰富】一致性，多表数据一致性比对

> Formalized from Lanhu raw page `15525` and target-branch source inspection.
>
> Source repos:
> - backend: `.repos/CustomItem/dt-center-assets` @ `release_6.3.x_ltqc`
> - frontend: `.repos/CustomItem/dt-insight-studio` @ `dataAssets/release_6.3.x_ltqc`

## 1. 基本信息

- 模块: 数据资产 / 数据质量
- 版本: `v6.4.10`
- 开发版本: `6.3岚图定制化分支`
- Story: `Story-20260328`
- 蓝湖页面: `15525【内置规则丰富】一致性，多表数据一致性比对`
- 参考菜单:
  - `数据质量 > 规则集配置`
  - `数据质量 > 质量报告`

## 2. 需求背景

本次迭代希望在数据质量规则集中新增「一致性校验」能力，面向一个校验表和多个对比表，按逻辑主键判断多表数据是否一致，并支持在质量报告中查看失败结果与失败明细。

Lanhu 原始文本把「表行数差异阈值设置」与「按逻辑主键比对字段值」写在同一页。结合源码看，这一页实际落在两类已有能力之上：

- 多表行数差异配置：`verifySettingDTO`，用于配置记录数差异百分比 / 记录数差异条数阈值
- 多表内容比对配置：`relationKeys`、`verifyTables`，用于按逻辑主键映射并校验字段值

因此，测试与实现都不能把本页简单理解为“只做行数比对”。

## 3. 变更范围

### 3.1 规则集配置页

涉及真实页面文案与交互入口：

- 页面标题/入口:
  - `规则集配置`
  - `新建规则集`
- 规则内容区核心字段:
  - `校验类型`
  - `选择校验字段`
  - `多表数据一致性比对设置`
  - `比对规则`
  - `选择对比表1`
  - `选择对比表1主键`
  - `选择校验表主键`

### 3.2 任务实例 / 查看明细

涉及失败结果查看能力：

- 质量报告中支持 `查看详情`
- 失败场景区分为：
  - `逻辑主键匹配但数据不匹配`
  - `逻辑主键不匹配`

### 3.3 质量报告

报告字段至少覆盖：

- `规则类型`
- `规则名称`
- `字段名称`
- `字段类型`
- `质检结果`
- `未通过原因`
- `详情说明`
- `操作`

## 4. 页面/交互详细设计

### 4.1 新建规则集 - 基础入口

用户从 `数据质量 > 规则集配置` 页面点击【新建规则集】进入配置页。

基础信息仍沿用现有规则集创建流程，至少需要先选定：

- 数据源
- 数据库 / schema
- 校验表
- 规则包 / 规则集名称

### 4.2 一致性校验主配置

进入规则内容区后，选择：

- 校验类型: `一致性校验`
- 校验函数/能力: `多表数据一致性比对`

随后页面应出现两类配置能力。

#### A. 比对表与主键信息

- 至少选择 1 个对比表
- 最多支持添加 10 个对比表
- 校验表主键支持多选
- 对比表主键支持多选
- 多选主键时按照联合主键处理

当存在多个主键时，主键字段顺序本身就是映射关系的一部分，测试时需要验证顺序不一致是否导致匹配异常。

#### B. 比对细节设置

点击【多表数据一致性比对设置】后，弹出「多表数据一致性比对设置」弹窗，弹窗内存在两种可选阈值：

- 记录数百分比差异，对比表之间的总记录数，差距小于等于 `%`
- 记录数数量差异，对比表之间的总记录数，差距小于等于 `条`

源码中这两个阈值分别对应：

- `diverseRatio`
- `diverseNum`

若两个阈值均不勾选，则默认只要存在差异就判定不通过。

### 4.3 校验字段与字段映射

- `选择校验字段` 为非必选
- 最大支持选择 10 个字段
- 当未选择校验字段时:
  - 不展示 `比对字段设置`
  - 仅校验主键一致性 / 表间差异
- 当选择校验字段后:
  - 需要展示 `比对字段设置`
  - 校验表字段与各对比表字段按列映射

结合现有多表内容比对组件，字段映射的关键约束是：

- 若未配置逻辑主键，不按主键匹配记录，分表校验均通过才算通过
- 若配置多个逻辑主键，则按联合主键匹配
- 对比表主键数量必须与校验表主键数量一致

### 4.4 结果展示

规则执行后：

- `校验通过`:
  - 不记录明细数据
- `校验失败`:
  - 支持查看日志
  - 支持查看明细
  - 明细只记录校验主键和校验字段
  - 失败类型至少区分为：
    - 逻辑主键未匹配
    - 逻辑主键匹配但数据不匹配

## 5. 源码补充事实

### 5.1 已确认的前端事实

- `apps/dataAssets/src/locales/zh-CN/index.ts`
  - 存在 `规则集配置`、`新建规则集`、`质量报告` 文案
  - 存在 `多表数据一致性比对设置`、`比对规则`、`选择对比表主键`、`选择对比表主键` 等比对弹窗文案
- `apps/dataAssets/src/views/valid/ruleConfig/edit/components/rule/compareSettingModal.tsx`
  - 弹窗真实标题为 `多表数据一致性比对设置`
  - 支持配置 `diverseRatio` / `diverseNum`
- `apps/dataAssets/src/views/valid/ruleConfig/edit/components/rule/compareTableContentList.tsx`
  - 主键支持多选
  - 对比表主键数量必须与校验表主键数量一致
- `apps/dataAssets/src/views/valid/taskQuery/components/ruleDetail/taskDetailPane/components/ruleDetailDataDrawer.tsx`
  - 一致性规则存在专门的详情展示分支

### 5.2 已确认的后端事实

- `service/.../MultiTableRowsConfig.java`
  - 多表行数能力使用 `mainTableDTO`、`verifySettingDTO`、`verifyTableDTOList`
- `service/.../MultiTableRowsFunctionServiceImpl.java`
  - 行数校验会比较主表与各对比表总记录数
  - 阈值逻辑使用 `diverseNum` / `diverseRatio`
- `service/.../IntegralityMultiTableContentConfig.java`
  - 多表内容比对使用 `relationKeys`、`verifyTables`、`tableCondition`
- `service/.../IntegralityMultiTableContentTemplateHandler.java`
  - 内容比对支持按逻辑主键拼接失败描述
  - 无逻辑主键与有逻辑主键是两套不同表达

### 5.3 需要明确记录的风险

- 当前前端 `BuiltInRuleTaskTypeOptions` 仍把 `一致性校验` 入口注释掉，说明“规则库 / 内置规则入口”可能尚未完全放开
- 当前后端公开枚举 `RuleTaskType` 片段中未看到 `CONSISTENCY = 7`，但前端和局部实现已存在一致性相关能力
- 因此需要在联调前确认：
  - 一致性规则是否已经在当前分支完全开放入口
  - 规则类型与函数 ID 的后端注册是否完整

## 6. 影响分析

### 6.1 对规则配置的影响

- 需要同时关注“表行数差异阈值”和“按逻辑主键映射字段值”两类配置
- 不同于简单的双表比对，本页允许多个对比表

### 6.2 对历史数据的影响

- 未看到需要迁移历史数据的源码逻辑
- 更可能影响新增 / 编辑后的规则定义以及后续生成的质量报告

### 6.3 对权限与菜单的影响

- 菜单仍复用现有 `规则集配置` 与 `质量报告`
- 未发现新增独立权限点，默认应沿用原数据质量规则集权限
- 若一致性入口仍被隐藏，需要研发确认是否受开关 / 权限 / 发布状态控制

## 7. 测试关注点

### 7.1 推荐测试数据准备

建议先使用 `Doris 2.x` 数据源验证，因为源码已明确该类数据源支持分区相关能力；如现场更常用 `Hive 3.x`，可补一轮回归。

推荐准备库表：

```sql
CREATE DATABASE IF NOT EXISTS qa_data_quality;

CREATE TABLE qa_data_quality.ods_sales_order (
  order_id        BIGINT,
  tenant_id       BIGINT,
  order_amount    DECIMAL(18,2),
  discount_amount DECIMAL(18,2),
  dt              DATE
);

CREATE TABLE qa_data_quality.dwd_sales_order (
  order_id        BIGINT,
  tenant_id       BIGINT,
  order_amount    DECIMAL(18,2),
  discount_amount DECIMAL(18,2),
  dt              DATE
);

CREATE TABLE qa_data_quality.ads_sales_order_summary (
  order_id        BIGINT,
  tenant_id       BIGINT,
  order_amount    DECIMAL(18,2),
  discount_amount DECIMAL(18,2),
  dt              DATE
);
```

### 7.2 核心测试点

- 联合主键顺序一致 / 不一致
- 未选择校验字段时仅按主键 / 行数规则处理
- 选择校验字段后字段映射是否正确回显
- 对比表数量上限是否为 10
- `diverseRatio` / `diverseNum` 单独启用、同时启用、均不启用
- 失败详情是否区分“主键不匹配”和“数据不匹配”
- 校验通过时是否确实不落明细

### 7.3 需研发确认的开放问题

- 一致性规则在当前分支是否已经开放到最终用户入口
- 当前质量报告和失败明细是否已经完全按本 PRD 页面文案落地

