---
suite_name: "【数据质量】支持kingbase8.6数据源"
description: "【数据质量】支持kingbase8.6数据源用例归档"
tags:
  - "设置"
  - "文件"
  - "运行"
  - "创建"
  - "找到"
  - "规则"
  - "规则集"
  - "查看详情"
  - "多表比对"
  - "校验通过"
  - "单表校验"
  - "质量报告"
  - "脏数据管理"
  - "枚举值检验"
  - "据标准码表"
prd_version: "v6.3.0"
dev_version:
  - "袋鼠云"
create_at: "2026-04-05"
status: "草稿"
origin: "csv"
case_count: 25
case_id: 8387
---

##### 【P1】验证脏数据管理- 到期删除脏数据表

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 1）配置${DATASOURCE_TYPE}数据源类型的数据源的脏数据库2）“数据存储时效”为1天3）运行${DATASOURCE_TYPE}数据源类型的单表校验任务，并使其校验不通过 | 脏数据表生成，且表数据正确 |
| 2 | 第二天查看该脏数据表 | 该脏数据表被删除 |

##### 【P2】验证脏数据管理- 设置

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
----
开启独立存储
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 开启“脏数据存储” | 异常任务，查看明细显示异常数据并能下载成功 |
| 2 | 关闭“脏数据存储” | 异常任务，查看明细不显示异常数据且不支持下载 |

##### 【P2】验证脏数据管理- 查询

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 开启“独立存储” | 列表展示${DATASOURCE_TYPE}数据源类型的数据源记录 |
| 2 | 查看“数据源类型”下拉项 | 下拉项包含${DATASOURCE_TYPE}数据源类型 |
| 3 | “数据源类型”选择${DATASOURCE_TYPE}数据源类型 | 列表返回${DATASOURCE_TYPE}数据源类型的数据源记录 |

##### 【P1】验证规则集- 下载不同版本规则文件

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 1）进入“查看详情”抽贴2）查看规则内容历史版本号-下载规则文件 | 1）下载功能正常，文件名格式：${版本}_rule_collection_${下载日期}.xls2）下载的文件内容正确，为对应版本的规则信息 |
| 2 | 下载另一个版本的规则文件 | 不同版本的对应规则文件内容正确 |

##### 【P1】验证规则集- 查看详情

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 1）数据质量页面，点击规则任务配置 2）选择规则集A点击右上角三点 | 1）顶部显示“规则集名称-查看详情” 2）基础信息展示正确：规则集名称、数据源、描述 3）规则内容展示正确：规则名称、描述、表名、中文名、字段名、字段中文名、校验sql、分页展示 |
| 2 | 1）数据质量页面，点击规则任务配置 2）选择规则集A点击右上角三点 3）查看调度配置 | 调度配置展示正确：调度周期、执行时间、告警方式、接收人、规则拼接包 5）规则历史内容版本展示正确：版本号、操作人、操作时间、操作、分页展示 |
| 3 | 1）数据质量页面，点击规则任务配置 2）选择规则集A点击右上角三点 3）查看规则内容历史版本号-版本号 | 展示内容正确：调度周期、执行时间、告警方式、接收人、规则拼接包 |
| 4 |  | 展示内容正确：版本号、操作人、操作时间、操作 |

##### 【P1】验证规则集- 运行

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 1）创建规则集，“校验数据源”选择${DATASOURCE_TYPE}数据源类型的数据源；2）导入规则集文件（文件中包含所选数据源下表的校验SQL，且SQL可执行）；3）立即执行 | 规则集运行正常 |

##### 【P1】验证规则集- 编辑

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 1）点击进入${DATASOURCE_TYPE}数据源类型的的规则集编辑页；2）重新导入规则集文件（文件中包含所选数据源下表的校验SQL） | 编辑规则集流程正常 |

##### 【P0】验证规则集- 创建

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 1）创建规则集，“校验数据源”选择${DATASOURCE_TYPE}数据源类型的数据源；2）导入规则集文件（文件中包含所选数据源下表的校验SQL） | 创建规则集流程正常 |

##### 【P1】验证多表比对- 运行-右表逻辑主键为空

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 1）【规则任务配置】新建多表比对规则；2）数据表选择${DATASOURCE_TYPE}数据源类型的表，且右表逻辑主键为空3）按流程完善信息 | 任务状态流转正确 |
| 2 | 任务运行失败 | 任务状态为校验不通过 |
| 3 | 查看“监控报告”（点击表名） | 1）监控报告显示数据正确；2）异常数据-“右表逻辑主键为空”TAB页显示异常数据 |
| 4 | 下载异常数据 | 1）下载功能正常；2）文件内容显示异常数据正确 |
| 5 | 查看“表级报告”（点击表名） | 表级报告展示的数据正确 |

##### 【P1】验证多表比对- 运行-左表逻辑主键为空

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 1）【规则任务配置】新建多表比对规则；2）数据表选择${DATASOURCE_TYPE}数据源类型的表，且左表逻辑主键为空3）按流程完善信息 | 任务状态流转正确 |
| 2 | 任务运行失败 | 任务状态为校验不通过 |
| 3 | 查看“监控报告”（点击表名） | 1）监控报告显示数据正确；2）异常数据-“左表逻辑主键为空”TAB页显示异常数据 |
| 4 | 下载异常数据 | 1）下载功能正常；2）文件内容显示异常数据正确 |
| 5 | 查看“表级报告”（点击表名） | 表级报告展示的数据正确 |

##### 【P1】验证多表比对- 运行-右表数据在左表未找到

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 1）【规则任务配置】新建多表比对规则；2）数据表选择${DATASOURCE_TYPE}数据源类型的表，且存在右表数据在左表未找到3）按流程完善信息 | 任务状态流转正确 |
| 2 | 任务运行失败 | 任务状态为校验不通过 |
| 3 | 查看“监控报告”（点击表名） | 1）监控报告显示数据正确；2）异常数据-“右表数据在左表未找到”TAB页显示异常数据 |
| 4 | 下载异常数据 | 1）下载功能正常；2）文件内容显示异常数据正确 |
| 5 | 查看“表级报告”（点击表名） | 表级报告展示的数据正确 |

##### 【P1】验证多表比对- 运行-左表数据在右表未找到

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 1）【规则任务配置】新建多表比对规则；2）数据表选择${DATASOURCE_TYPE}数据源类型的表，且存在左表数据在右表未找到3）按流程完善信息 | 任务状态流转正确 |
| 2 | 任务运行失败 | 任务状态为校验不通过 |
| 3 | 查看“监控报告”（点击表名） | 1）监控报告显示数据正确；2）异常数据-“左表数据在右表未找到”TAB页显示异常数据 |
| 4 | 下载异常数据 | 1）下载功能正常；2）文件内容显示异常数据正确 |
| 5 | 查看“表级报告”（点击表名） | 表级报告展示的数据正确 |

##### 【P1】验证多表比对- 运行-逻辑主键匹配，但数据不匹配

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 1）【规则任务配置】新建多表比对规则；2）数据表选择${DATASOURCE_TYPE}数据源类型的表，且两张表存在逻辑主键匹配，但数据不匹配3）按流程完善信息 | 任务状态流转正确 |
| 2 | 任务运行失败 | 任务状态为校验不通过 |
| 3 | 查看“监控报告”（点击表名） | 1）监控报告显示数据正确；2）异常数据-“逻辑主键匹配，但数据不匹配”TAB页显示异常数据 |
| 4 | 下载异常数据 | 1）下载功能正常；2）文件内容显示异常数据正确 |
| 5 | 查看“表级报告”（点击表名） | 表级报告展示的数据正确 |

##### 【P1】验证多表比对- 运行-校验通过

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 1）【规则任务配置】新建多表比对规则；2）数据表选择${DATASOURCE_TYPE}数据源类型的表，且两张表数据一致3）按流程完善信息 | 任务状态流转正确 |
| 2 | 任务运行成功 | 任务状态为校验通过 |
| 3 | 查看“监控报告”（点击表名） | 监控报告显示数据正确 |
| 4 | 查看“表级报告”（点击表名） | 表级报告展示的数据正确 |

##### 【P1】验证多表比对- 编辑

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 修改规则名称 | 名称能够修改成功 |
| 2 | 修改规则 | 修改规则流程正常 |
| 3 | 编辑调度属性 | 调度属性编辑成功 |

##### 【P0】验证多表比对- 创建

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 1）【规则任务配置】新建多表比对规则；2）数据表选择${DATASOURCE_TYPE}数据源类型的表；3）按流程完善信息； | 任务创建流程正常 |
| 2 | 规则列表页，点击表名 | 1）弹出任务详情抽屉；2）任务详情显示正确 |

##### 【P1】验证单表校验- 规则- 枚举值检验 验证单表校验-枚举值自动引入数据标准码表

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
----
创建测试表：
CREATE TABLE `ods_trad_user`(
`cust_id` int COMMENT '客户编号',
`cust_name` string COMMENT '客户姓名',
`gender` int COMMENT '性别: 0-男，1-女',
`degree` string COMMENT '学历：初中、高中、专科、本科、研究生'
)
COMMENT 'user'
PARTITIONED BY (
`in_city_year` int COMMENT '您来本市的年份');
INSERT INTO ods_trad_user partition (in_city_year='2019') VALUES(3, '李华', 0, '高中');
INSERT INTO ods_trad_user partition (in_city_year='2019') VALUES(4, '张三', 0, '研究生');
INSERT INTO ods_trad_user partition (in_city_year='2019') VALUES(5, '梁恒', 1, '本科');
INSERT INTO ods_trad_user partition (in_city_year='2019') VALUES(6, '付泉', 1, '本科');
INSERT INTO ods_trad_user partition (in_city_year='2019') VALUES(7, '刘岩', 0, '高中');
----
准备数据标准：
gender，码表属性值为：1、2、3
degree，码表属性值为：初中、高中、专科、本科、研究生

ods_trad_user表进行标准映射
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 1）创建ods_trad_user表的单表校验任务；2）添加规范性校验，选择引入数据标准 | gender、degree枚举值校验规则引入正确 |
| 2 | 保存任务后并运行 | 任务运行结果正确 |

##### 【P2】验证单表校验- 规则- 枚举值检验 验证单表校验-枚举值校验结果异常数据正确

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
----
创建测试表：
CREATE TABLE `ods_trad_user`(
`cust_id` int COMMENT '客户编号',
`cust_name` string COMMENT '客户姓名',
`gender` int COMMENT '性别: 0-男，1-女',
`degree` string COMMENT '学历：初中、高中、专科、本科、研究生'
)
COMMENT 'user'
PARTITIONED BY (
`in_city_year` int COMMENT '您来本市的年份');
INSERT INTO ods_trad_user partition (in_city_year='2019') VALUES(3, '李华', 0, '高中');
INSERT INTO ods_trad_user partition (in_city_year='2019') VALUES(4, '张三', 0, '研究生');
INSERT INTO ods_trad_user partition (in_city_year='2019') VALUES(5, '梁恒', 1, '本科');
INSERT INTO ods_trad_user partition (in_city_year='2019') VALUES(6, '付泉', 1, '本科');
INSERT INTO ods_trad_user partition (in_city_year='2019') VALUES(7, '刘岩', 0, '高中');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 任务实例中查看异常数据 | 1）异常数据正确；2）导出异常数据正确 |

##### 【P1】验证单表校验- 规则- 枚举值检验 验证单表校验-枚举值校验结果正确

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
----
创建测试表：
CREATE TABLE `ods_trad_user`(
`cust_id` int COMMENT '客户编号',
`cust_name` string COMMENT '客户姓名',
`gender` int COMMENT '性别: 0-男，1-女',
`degree` string COMMENT '学历：初中、高中、专科、本科、研究生'
)
COMMENT 'user'
PARTITIONED BY (
`in_city_year` int COMMENT '您来本市的年份');
INSERT INTO ods_trad_user partition (in_city_year='2019') VALUES(3, '李华', 0, '高中');
INSERT INTO ods_trad_user partition (in_city_year='2019') VALUES(4, '张三', 0, '研究生');
INSERT INTO ods_trad_user partition (in_city_year='2019') VALUES(5, '梁恒', 1, '本科');
INSERT INTO ods_trad_user partition (in_city_year='2019') VALUES(6, '付泉', 1, '本科');
INSERT INTO ods_trad_user partition (in_city_year='2019') VALUES(7, '刘岩', 0, '高中');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 表数据字段实际数据在任务配置的枚举范围内：1）创建ods_trad_user（in_city_year='2019'）表的单表校验任务：- 添加一条gender字段的枚举值校验，枚举范围配置为：0 、1- 添加一条degree字段的枚举值校验，枚举范围配置为：初中、高中、专科、本科、研究生2）运行任务 | 任务实例校验成功 |
| 2 | 表数据字段实际数据不在任务配置的枚举范围内：1）创建ods_trad_user（in_city_year='2019'）表的单表校验任务：- 添加一条gender字段的枚举值校验，枚举范围配置为：0 、2- 添加一条degree字段的枚举值校验，枚举范围配置为：小学、高中、专科、本科、研究生、2）运行任务 | 任务实例校验不通过； |

##### 【P1】验证单表校验- 规则- 枚举值检验 验证单表校验-规范性校验支持枚举值校验配置

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
----
创建测试表：
CREATE TABLE `ods_trad_user`(
`cust_id` int COMMENT '客户编号',
`cust_name` string COMMENT '客户姓名',
`gender` int COMMENT '性别: 0-男，1-女',
`degree` string COMMENT '学历：初中、高中、专科、本科、研究生'
)
COMMENT 'user'
PARTITIONED BY (
`in_city_year` int COMMENT '您来本市的年份');
INSERT INTO ods_trad_user partition (in_city_year='2019') VALUES(3, '李华', 0, '高中');
INSERT INTO ods_trad_user partition (in_city_year='2019') VALUES(4, '张三', 0, '研究生');
INSERT INTO ods_trad_user partition (in_city_year='2019') VALUES(5, '梁恒', 1, '本科');
INSERT INTO ods_trad_user partition (in_city_year='2019') VALUES(6, '付泉', 1, '本科');
INSERT INTO ods_trad_user partition (in_city_year='2019') VALUES(7, '刘岩', 0, '高中');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 1）创建单表校验任务；2）添加规范性校验；3）统计规则选择“枚举值”；4）“枚举值”信息输入多个枚举值；5）完善其他信息并保存任务 | 任务保存成功 |
| 2 | 规则任务列表点击表名，查看详情抽屉 | 规则显示正确 |
| 3 | 1）编辑规则任务；2）添加规范性校验-枚举值规则；3）编辑已有规范性校验-枚举值规则，增加删除枚举值 | 规则任务能够保存成功 |
| 4 | 运行该任务 | 任务校验结果正确 |

##### 【P1】验证单表校验- 质量报告

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 运行${DATASOURCE_TYPE}数据源类型的单表校验任务 | 该任务质量评分数据以及其他统计信息正确 |
| 2 | 查看“最近30次表级统计” | 记录数：只统计每次表行数规则校验失败时的实际表行数；总告警数：只统计每次校验不通过的规则数 |

##### 【P1】验证单表校验- 运行-校验不通过

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 1）准备${DATASOURCE_TYPE}数据源类型的表单表校验任务；2）规则配置完整性校验、准确性校验、规范性校验、唯一性校验、自定义SQL；且配置的规则会使任务校验不通过；3）开启脏数据存储3）运行该任务；4）进入【任务实例查询】查看该任务实例 | 任务状态流转正确 |
| 2 | 任务运行失败 | 任务状态为校验不通过 |
| 3 | 查看“监控报告”（点击表名） | 监控报告显示校验规则正确 |
| 4 | “监控报告“-查看明细 | 异常数据展示正确 |
| 5 | “监控报告”-“查看明细”-下载 | 1）下载文件成功；2）文件显示异常数据正确 |
| 6 | 查看“表级报告”（点击表名） | 表级报告展示的数据正确 |

##### 【P0】验证单表校验- 运行-校验通过

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 1）准备${DATASOURCE_TYPE}数据源类型的表单表校验任务；2）规则配置完整性校验、准确性校验、规范性校验、唯一性校验、自定义SQL；且配置的规则会使任务校验通过3）运行该任务；4）进入【任务实例查询】查看该任务实例 | 任务状态流转正确 |
| 2 | 任务运行成功 | 任务状态为校验通过 |
| 3 | 查看“监控报告”（点击表名） | 监控报告显示校验规则正确 |
| 4 | 查看“表级报告”（点击表名） | 表级报告展示的数据正确 |

##### 【P1】验证单表校验- 编辑

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 修改规则名称 | 名称能够修改成功 |
| 2 | 修改监控规则 | 规则修改成功 |
| 3 | 添加监控规则 | 规则添加成功 |
| 4 | 删除监控规则 | 规则删除成功 |
| 5 | 编辑调度属性 | 调度属性编辑成功 |

##### 【P0】验证单表校验- 创建

> 前置条件

```
待测数据源类型：MySQL、Oracle、SQLServer、Hive1.下、Hive2.x、Hive3.x、Doris2.下、SR2.x、SR3.x、Greenplumn、ADB for PG
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 1）【规则任务配置】新建单表校验规则；2）数据表选择${DATASOURCE_TYPE}数据源类型的表；3）规则配置完整性校验、准确性校验、规范性校验、唯一性校验、自定义SQL； | 任务创建成功 |
| 2 | 规则列表页，点击表名 | 1）弹出任务详情抽屉；2）任务详情显示正确 |
| 3 | 详情抽屉中点击“规则SQL”的【查看】 | 显示当前任务拼接的SQL |
