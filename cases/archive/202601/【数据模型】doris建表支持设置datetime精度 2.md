---
suite_name: 【数据模型】doris建表支持设置datetime精度 v6.4.7
description: 【数据模型】doris建表支持设置datetime精度 v6.4.7
prd_id: 15693
prd_version: v6.4.7
prd_path: cases/requirements/data-assets/v6.4.10/.trash/PRD-15693-raw.md
product: data-assets
tags:
  - 数据资产
  - 数据资产-数据模型
  - 数据模型
  - doris建表支持设置datetime精度
create_at: 2026-03-29
status: ""
health_warnings: []
case_count: 5
origin: csv
---
> 来源：zentao-cases/dtstack-platform/数据资产/archive-cases/v6.4.7/【数据模型】doris建表支持设置datetime精度.csv
> 用例数：5

---

## 数据资产-数据模型

##### 【P2】验证历史DATETIME字段精度正确

> 前置条件
```
历史已存在doris表table1，字段col1的字段类型为DTATETIME
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据地图】页面，搜索table1，查看表详情 | 字段新增精度列，col1的精度值为0，其他字段展示-- |
| 2 | 进入【数据模型-规范建表】，编辑table1，查看字段 | 新增精度列，col1的精度值为0，不可编辑，其他字段展示-- |

##### 【P2】验证doris编辑表功能

> 前置条件
```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据模型-规范建表】，新建表，选择doris数据源，填写信息 | 进入表结构步骤 |
| 2 | 新增多个字段，col1、col2选择DATETIME、DATETIMEV2类型 | 主键后新增精度列，col1、col2精度默认为0 |
| 3 | col1精度为0，col2精度为6，建表 | 系统提示建表成功，数据库中成功创建该表，表结构与配置字段一致 |
| 4 | 编辑模型查看展示 | 1）col1字段类型为DATETIME，精度为0，精度不可编辑2）col2字段类型为DATETIME，精度为6，精度不可编辑3）其他字段精度展示-- |
| 5 | 新增字段col3，col4，字段类型选择DATETIME、DATETIMEV2类型 | 可填写精度信息 |

##### 【P1】验证DATETIMEV2、DATETIME类型设置精度后，建表成功

> 前置条件
```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据模型-规范建表】，新建表，选择doris数据源，填写信息 | 进入表结构步骤 |
| 2 | 新增多个字段，col1、col2选择DATETIME、DATETIMEV2类型 | 主键后新增精度列，col1、col2精度默认为0 |
| 3 | col1精度为0，col2精度为6，建表 | 系统提示建表成功，数据库中成功创建该表，表结构与配置字段一致 |
| 4 | 查看表详情页 | 字段新增精度列，col1字段类型为DATETIME，精度为0；col2字段类型为DATETIME，精度为6；其他字段精度展示-- |

##### 【P2】验证DATETIMEV2、DATETIME类型支持设置精度

> 前置条件
```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据模型-规范建表】，新建表，选择doris数据源，填写信息 | 进入表结构步骤 |
| 2 | 新增多个字段，col1、col2选择DATETIME、DATETIMEV2类型 | 主键后新增精度列，col1、col2精度默认为0，其他字段精度展示-- |
| 3 | 精度输入0、1、2、3、4、5、6 | 允许输入 |
| 4 | 精度输入小数、英文、特殊字符、负数、大于6的整数 | 不允许输入 |

##### 【P2】验证doris建表，字段类型新增DATETIMEV2

> 前置条件
```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据模型-规范建表】，新建表，选择doris数据源，选择主键表，点击下一步 | 进入表结构步骤 |
| 2 | 新增字段，查看数据类型 | 数据类型DATETIME下方新增类型为“DATETIMEV2”； |
| 3 | 切换明细表/模型表，查看数据类型 | 数据类型DATETIME下方新增类型为“DATETIMEV2”； |

