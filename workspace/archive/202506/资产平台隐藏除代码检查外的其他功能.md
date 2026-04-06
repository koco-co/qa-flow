---
suite_name: "资产平台隐藏除代码检查外的其他功能"
description: "资产平台隐藏除代码检查外的其他功能用例归档"
tags:
  - "分区"
  - "列的"
  - "操作"
  - "含对表"
  - "仅保留"
  - "代码检查"
  - "校验正确"
  - "禁止使用"
  - "角色管理"
  - "数据治理"
  - "平台管理"
  - "用户角色管理"
  - "禁止大表查询带"
  - "分区表查询必须带"
  - "代码里面不允许包"
prd_version: "v6.3.4"
dev_version:
  - "袋鼠云"
create_at: "2026-04-05"
status: "草稿"
origin: "csv"
case_count: 7
case_id: 8897
---

##### 【P2】验证【代码检查】-【禁止大表查询带DISTINCT】校验正确

> 前置条件

```
数据源下已存在大表A
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入资产-数据治理-代码检查页面 | 进入成功 |
| 2 | 离线平台设置sparksql任务添加代码检查，新增SparkSQL任务，select * from A ;执行任务 | 阻断提示 |

##### 【P1】验证【代码检查】-【分区表查询必须带分区】校验正确

> 前置条件

```
CREATE TABLE orders (
order_id STRING,
customer_id STRING,
amount DOUBLE
)
PARTITIONED BY (dt STRING, city STRING)
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
STORED AS TEXTFILE;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入资产-数据治理-代码检查页面 | 进入成功 |
| 2 | 离线平台设置sparksql任务添加代码检查，新增SparkSQL任务，select * from orders;执行任务 | 阻断提示 |

##### 【P0】验证【代码检查】-【代码里面不允许包含对表、分区、列的DDL操作】校验正确

> 前置条件

```
已存在分区表
CREATE TABLE orders (
order_id STRING,
customer_id STRING,
amount DOUBLE
)
PARTITIONED BY (dt STRING, city STRING)
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
STORED AS TEXTFILE;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入资产-数据治理-代码检查页面 | 进入成功 |
| 2 | 离线平台设置sparksql任务添加代码检查，新增SparkSQL任务，对表进行ALTER TABLE sales ADD PARTITION (sale_date='2025-06-10');运行任务 | 阻断提示 |
| 3 | 离线平台设置sparksql任务添加代码检查，新增SparkSQL任务，对表INSERT INTO TABLE table_name PARTITION (partition_col = 'value', ...)SELECT ...FROM source_table;;运行任务 | 阻断提示 |

##### 【P2】验证【代码检查】-【SQL文件大小不超过阈值】校验正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入资产-数据治理-代码检查页面 | 进入成功 |
| 2 | 开启【SQL文件大小不超过阈值】，设置【影响类型】为阻断 | 设置成功 |
| 3 | 离线平台设置sparksql任务添加代码检查，新增SparkSQL任务，SQL文件超出阈值 | 创建成功 |
| 4 | 运行离线sparksql任务 | 阻断提示 |

##### 【P0】验证【代码检查】-【禁止使用select *】校验正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入资产-数据治理-代码检查页面 | 进入成功 |
| 2 | 开启【禁止使用select *】，设置【影响类型】为阻断 | 设置成功 |
| 3 | 离线平台设置sparksql任务添加代码检查，新增SparkSQL任务，SQLText 为“select  * from table1“； | 创建成功 |
| 4 | 运行离线sparksql任务 | 阻断提示 |

##### 【P1】验证【角色管理】仅保留【代码检查】【用户角色管理】模块

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入资产-【平台管理】页面 | 进入成功 |
| 2 | 进入【角色管理】页面 | 仅仅展示【代码检查】【用户角色管理】模块 |

##### 【P0】验证平台功能模块仅展示【数据治理】-【代码检查】及【平台管理】-【用户角色管理】

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入资产-【数据治理】页面 | 仅展示【代码检查】模块 |
| 2 | 进入资产-【平台管理】页面 | 仅展示【用户角色管理】模块 |
