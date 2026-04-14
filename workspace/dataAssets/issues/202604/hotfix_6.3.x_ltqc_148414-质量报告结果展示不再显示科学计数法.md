---
suite_name: "Hotfix 用例 - 质量报告结果展示不再显示科学计数法"
description: "验证 Bug #148414 修复效果"
tags:
  - hotfix
  - bug-148414
create_at: "2026-04-13"
status: 草稿
origin: zentao
---

## 数据质量

### 质量报告

#### SparkThrift2.x 全链路回归

##### 【148414】验证从离线建表到数据质量报告的异常明细数值均以常规数字格式展示

> 前置条件

```
1、环境要求：岚图环境已部署 customltem/DatasourceX 的 hotfix_6.3.x_ltqc_148414 修复版本；测试账号可访问【离线开发】、【数据质量】相关菜单。

2、资源要求：
（1）已准备 sparkthrift2.x 类型数据源 `{{sparkthrift2.x数据源}}`，并确认该数据源在当前项目下存在可选资源组 `{{资源组}}`。
（2）当前项目已开启脏数据存储；否则【校验结果查询】与【数据质量报告】中无法查看异常明细。

3、账号要求：具备离线开发 Spark SQL 建表/执行、通用配置、规则集管理、规则任务管理、校验结果查询、数据质量报告查看及操作权限。

4、测试 SQL：以下 SQL 在 sparkthrift2.x 对应测试库执行，用于同时准备校验表和报告关联维表。

DROP TABLE IF EXISTS ltqc_quality_report_148414;
CREATE TABLE ltqc_quality_report_148414 (
  id BIGINT,
  vin STRING,
  vehicle_series STRING,
  vehicle_model STRING,
  power_type STRING,
  measure_double DOUBLE,
  measure_decimal DECIMAL(20,10)
)
STORED AS PARQUET;

INSERT INTO TABLE ltqc_quality_report_148414
SELECT
  1,
  'LTQC148414A',
  'FREE',
  'FREE-01',
  'EV',
  CAST(123456789012.34567 AS DOUBLE),
  CAST(1234567890.1234567890 AS DECIMAL(20,10))
UNION ALL
SELECT
  2,
  'LTQC148414B',
  'FREE',
  'FREE-01',
  'EV',
  CAST(0.000000123456 AS DOUBLE),
  CAST(0.0000001234 AS DECIMAL(20,10));

DROP TABLE IF EXISTS ltqc_vehicle_dim_148414;
CREATE TABLE ltqc_vehicle_dim_148414 (
  vin STRING,
  vehicle_series STRING,
  vehicle_model STRING,
  power_type STRING
)
STORED AS PARQUET;

INSERT INTO TABLE ltqc_vehicle_dim_148414
SELECT 'LTQC148414A', 'FREE', 'FREE-01', 'EV'
UNION ALL
SELECT 'LTQC148414B', 'FREE', 'FREE-01', 'EV';
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 登录系统，进入【离线开发】，新建一个【Spark SQL】任务，在 `{{sparkthrift2.x数据源}}` 对应测试库执行前置 SQL | SQL 执行成功，表 `ltqc_quality_report_148414`、`ltqc_vehicle_dim_148414` 创建完成；业务表中存在 2 条测试数据 |
| 2 | 进入【数据质量 > 通用配置 > 报告关联维表设置】，切换到页签【报告关联维表设置（hive）】，选择数据源 `{{sparkthrift2.x数据源}}`、目标数据库和表 `ltqc_vehicle_dim_148414`，依次设置【车辆数统计字段】=`vin`、【车系关联字段】=`vehicle_series`、【车型关联字段】=`vehicle_model`、【动力类型关联字段】=`power_type`，点击【保存】 | 页面提示保存成功，sparkthrift2.x 数据源可以正常保存维表关联配置 |
| 3 | 进入【数据质量 > 规则集管理】，点击【新建规则集】；在【基础信息】页选择数据源 `{{sparkthrift2.x数据源}}`、目标数据库、数据表 `ltqc_quality_report_148414`，填写【规则集描述】=`hotfix_148414_科学计数法校验`，在【规则包】中新增并选择规则包名称 `pkg_num_range_148414`，点击【下一步】 | 成功进入【监控规则】页，页面标题与步骤条显示【基础信息】、【监控规则】 |
| 4 | 在【监控规则】页的规则包 `pkg_num_range_148414` 中点击【添加规则】并选择【有效性校验】；新增第 1 条规则，填写【规则描述】=`measure_double取值范围校验`，【字段】选择 `measure_double`，【统计函数】选择 `取值范围`，设置区间为 `>= 1` 且 `<= 1000` | 第 1 条规则配置成功，`measure_double` 的超大值与超小值均会落入异常范围 |
| 5 | 继续在规则包 `pkg_num_range_148414` 中点击【添加规则】并选择【有效性校验】；新增第 2 条规则，填写【规则描述】=`measure_decimal取值范围校验`，【字段】选择 `measure_decimal`，【统计函数】选择 `取值范围`，设置区间为 `>= 1` 且 `<= 1000`，点击【保存】 | 页面提示新增规则集成功，规则集内已保存 2 条有效性校验规则 |
| 6 | 进入【数据质量 > 规则任务管理】，点击【新建监控规则】；在【监控对象】页填写【规则名称】=`ltqc_task_148414`，选择数据源 `{{sparkthrift2.x数据源}}`、目标数据库、数据表 `ltqc_quality_report_148414`，点击【下一步】 | 成功进入【监控规则】页，当前监控对象与规则集所属表一致 |
| 7 | 在【监控规则】页的【规则包】中选择 `pkg_num_range_148414`，【规则类型】选择【有效性校验】，点击【引入】后再点击【下一步】 | 页面提示引入成功，任务中成功带出 2 条有效性校验规则 |
| 8 | 在【调度属性】页设置【规则拼接包】=`1`，选择【资源组】=`{{资源组}}`，将【实例生成方式】设置为【立即生成】；在【报告配置】区域保持【无需生成报告】未勾选，填写【报告名称】=`ltqc_quality_report_148414_report`，规则范围保持【全部】，将【是否需要车辆信息】设置为【是】，点击【保存】 | 页面提示新增成功；任务保存成功且未报“请先前往通用配置模块，设置报告关联的维表信息”错误 |
| 9 | 回到【数据质量 > 规则任务管理】列表，搜索 `ltqc_task_148414`，点击对应数据表名称进入任务详情抽屉，再点击【立即执行】 | 页面提示“操作成功，稍后可在任务查询中查看详情”，任务开始执行 |
| 10 | 进入【数据质量 > 校验结果查询】，在搜索框输入 `ltqc_task_148414` 并刷新列表，等待最新执行记录完成后点击对应表名打开详情抽屉 | 最新任务状态为【校验未通过】，详情抽屉中可见页签【监控报告】、【表级报告】 |
| 11 | 在【监控报告】页分别找到 `measure_double取值范围校验` 和 `measure_decimal取值范围校验` 两条失败规则，点击各自的【查看明细】；若存在多次运行记录，在明细抽屉的【运行时间】中选择最新一次运行，核对 `LTQC148414A`、`LTQC148414B` 两行的 `measure_double`、`measure_decimal` 展示值 | `LTQC148414A` 显示为 `123456789012.34567`、`1234567890.1234567890`；`LTQC148414B` 显示为 `0.000000123456`、`0.0000001234`；页面中不出现 `E`/`e` 科学计数法展示 |
| 12 | 进入【数据质量 > 数据质量报告】，切换到【已生成报告】页签，搜索 `ltqc_quality_report_148414_report` 并点击【查询】 | 列表返回本次生成的报告记录，报告状态为成功，操作列可见【报告详情】 |
| 13 | 点击【报告详情】，在质量报告详情页定位到表 `ltqc_quality_report_148414` 的失败规则，点击【查看详情】并核对异常明细中 `LTQC148414A`、`LTQC148414B` 的 `measure_double`、`measure_decimal` 展示值 | 报告详情异常明细中的数值与【校验结果查询】保持一致，均以常规数字格式展示，不出现 `1.2345678901234567E11`、`1.23456E-7` 等科学计数法文本 |
