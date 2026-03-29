---
name: 【产品交付】江苏银行-Sparksql3.3支持读写hudi0.15.0 v6.4.2
description: 【产品交付】江苏银行-Sparksql3.3支持读写hudi0.15.0 v6.4.2
tags:
  - 离线开发
  - sparksql支持hudi
  - 产品交付
  - 江苏银行
  - Sparksql
  - 支持读写hudi
module: batch-works
version: v6.4.2
source: zentao-cases/dtstack-platform/离线开发/archive-cases/v6.4.2/【产品交付】江苏银行-Sparksql3.3支持读写hudi0.15.0.csv
case_count: 7
created_at: 2026-03-29
origin: csv
---
# 【产品交付】江苏银行-Sparksql3.3支持读写hudi0.15.0 v6.4.2
> 来源：zentao-cases/dtstack-platform/离线开发/archive-cases/v6.4.2/【产品交付】江苏银行-Sparksql3.3支持读写hudi0.15.0.csv
> 用例数：7

---

## sparksql支持hudi

##### 验证sparksql-验证spark3.3版本sql正常使用 「P2」

> 前置条件
```
paimon文档：https://paimon.apache.org/docs/1.2/spark/sql-ddl/#create-catalog
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建3.3版本的spark sql周期任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 输入sql语句：前置条件内sql（普通sql） | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 3 | 点击保存 | 任务正常运行，运行结果符合预期 |
| 4 | 点击临时运行 |  |

##### 验证函数管理-spark3.3版本hudi系统函数正常使用 「P2」

> 前置条件
```
控制台计算引擎已配置spark3.3版本
创建项目时引入hadoop组件
项目管理开发设置已经勾选spark sql
sql语句列表：
DROP TABLE if EXISTS ods_pof_holding_share_info;

CREATE TABLE IF NOT EXISTS `ods_pof_holding_share_info`(
`client_id` bigint COMMENT'公募客户编号',
`fund_code` bigint COMMENT'基金代码',
`holding_cost` decimal(24,8) COMMENT'持仓总金额',
`holding_income` decimal(24,8) COMMENT'持仓总收益',
`source` string COMMENT'来源'
)comment'客户持有共享信息'partitioned by(
pt string
)stored as orc
lifecycle 100;

INSERT
INTO
TABLE
ods_pof_holding_share_info PARTITION(pt = '${bdp.system.bizdate}')
VALUES
(   1,1,'10000','10000','1'
),(
2,2,'20000','20000','2'
),(
3,3,'30000','30000','1'
);

SELECT * FROM ods_pof_holding_share_info;

-- 客户账户视图
DROP TABLE if EXISTS ods_11_customer_account_view;

CREATE TABLE IF NOT EXISTS `ods_11_customer_account_view`(
`customer_no` bigint COMMENT'统一客户编号',
`pub_no` bigint COMMENT'公募客户编号',
`is_delete` string COMMENT'是否删除 0,1'
)comment'客户账户视图'partitioned by(
pt string
)stored as orc
lifecycle 100;

INSERT
INTO
TABLE
ods_11_customer_account_view PARTITION(pt = '${bdp.system.bizdate}')
values
(   1,1,'0'
),(
2,2,'1'
),(
3,3,'0'
);

SELECT * FROM ods_11_customer_account_view;

-- 客户最新持仓收益信息
DROP TABLE if EXISTS ads_product_posit_cust_list;

CREATE TABLE IF NOT EXISTS `ads_product_posit_cust_list`(
`cust_no` bigint COMMENT'客编',
`fun_code` bigint COMMENT'基金代码',
`posit_amt` decimal(24,8)  COMMENT'持仓总金额',
`posit_profit` decimal(24,8) COMMENT'持仓总收益',
`posit_prof_rat` string COMMENT'持仓收益率	持仓总收益/累计支出',
`posit_type` string COMMENT'汇总类别	公募，私募',
`create_date` string COMMENT'时间'
)comment'客户最新持仓收益信息'partitioned by(
pt string
)stored as orc
lifecycle 100;

INSERT OVERWRITE TABLE ads_product_posit_cust_list PARTITION(pt = '${bdp.system.bizdate}')
select
t1.customer_no
,t.fund_code
, t.posit_amt--持仓总金额
, t.posit_profit-- 持仓总收益
, t.posit_prof_rat--持仓收益率
, t.posit_type -- 汇总类别公募
, t.create_date --数据日期
from (
select
client_id
,fund_code
,sum(holding_cost) as posit_amt--持仓总金额
,sum(holding_income) as posit_profit--持仓总收益
,sum(holding_income) as posit_prof_rat--持仓收益率.
,'公募' as posit_type --汇总类别 公募，私募，汇总
,'${bdp.system.bizdate}' as create_date--数据日期
from  ods_pof_holding_share_info
where pt='${bdp.system.bizdate}'
and source='1'
group by client_id,fund_code
)t
left join (
select
customer_no--统一客户编号
,pub_no--公募客户编号
from ods_11_customer_account_view
where pt='${bdp.system.bizdate}'
and is_delete='0'--正常
and pub_no is not NULL
) t1
on t.client_id=t1.pub_no;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建3.3版本的spark sql周期任务 | 成功进入数据开发模块，新建3.3版本的spark sql周期任务页面，页面内容正常加载显示，无报错 |
| 2 | 新建3.3版本的spark sql任务，点击确认，输入hudi系统函数，点击保存 | 任务创建、保存成功，系统给出保存成功提示，配置/数据已持久化，页面更新为最新状态 |
| 3 | 点击临时运行 | 任务正常运行，运行结果符合预期 |

##### 验证补数据运行-spark3.3版本任务补数据运行正常运行 「P2」

> 前置条件
```
控制台计算引擎已配置spark3.5版本
创建项目时引入hadoop组件
项目管理开发设置已经勾选spark sql
sql语句列表：
DROP TABLE if EXISTS ods_pof_holding_share_info;

CREATE TABLE IF NOT EXISTS `ods_pof_holding_share_info`(
`client_id` bigint COMMENT'公募客户编号',
`fund_code` bigint COMMENT'基金代码',
`holding_cost` decimal(24,8) COMMENT'持仓总金额',
`holding_income` decimal(24,8) COMMENT'持仓总收益',
`source` string COMMENT'来源'
)comment'客户持有共享信息'partitioned by(
pt string
)stored as orc
lifecycle 100;

INSERT
INTO
TABLE
ods_pof_holding_share_info PARTITION(pt = '${bdp.system.bizdate}')
VALUES
(   1,1,'10000','10000','1'
),(
2,2,'20000','20000','2'
),(
3,3,'30000','30000','1'
);

SELECT * FROM ods_pof_holding_share_info;

-- 客户账户视图
DROP TABLE if EXISTS ods_11_customer_account_view;

CREATE TABLE IF NOT EXISTS `ods_11_customer_account_view`(
`customer_no` bigint COMMENT'统一客户编号',
`pub_no` bigint COMMENT'公募客户编号',
`is_delete` string COMMENT'是否删除 0,1'
)comment'客户账户视图'partitioned by(
pt string
)stored as orc
lifecycle 100;

INSERT
INTO
TABLE
ods_11_customer_account_view PARTITION(pt = '${bdp.system.bizdate}')
values
(   1,1,'0'
),(
2,2,'1'
),(
3,3,'0'
);

SELECT * FROM ods_11_customer_account_view;

-- 客户最新持仓收益信息
DROP TABLE if EXISTS ads_product_posit_cust_list;

CREATE TABLE IF NOT EXISTS `ads_product_posit_cust_list`(
`cust_no` bigint COMMENT'客编',
`fun_code` bigint COMMENT'基金代码',
`posit_amt` decimal(24,8)  COMMENT'持仓总金额',
`posit_profit` decimal(24,8) COMMENT'持仓总收益',
`posit_prof_rat` string COMMENT'持仓收益率	持仓总收益/累计支出',
`posit_type` string COMMENT'汇总类别	公募，私募',
`create_date` string COMMENT'时间'
)comment'客户最新持仓收益信息'partitioned by(
pt string
)stored as orc
lifecycle 100;

INSERT OVERWRITE TABLE ads_product_posit_cust_list PARTITION(pt = '${bdp.system.bizdate}')
select
t1.customer_no
,t.fund_code
, t.posit_amt--持仓总金额
, t.posit_profit-- 持仓总收益
, t.posit_prof_rat--持仓收益率
, t.posit_type -- 汇总类别公募
, t.create_date --数据日期
from (
select
client_id
,fund_code
,sum(holding_cost) as posit_amt--持仓总金额
,sum(holding_income) as posit_profit--持仓总收益
,sum(holding_income) as posit_prof_rat--持仓收益率.
,'公募' as posit_type --汇总类别 公募，私募，汇总
,'${bdp.system.bizdate}' as create_date--数据日期
from  ods_pof_holding_share_info
where pt='${bdp.system.bizdate}'
and source='1'
group by client_id,fund_code
)t
left join (
select
customer_no--统一客户编号
,pub_no--公募客户编号
from ods_11_customer_account_view
where pt='${bdp.system.bizdate}'
and is_delete='0'--正常
and pub_no is not NULL
) t1
on t.client_id=t1.pub_no;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建3.3版本的spark sql周期任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 输入sql语句：前置条件内sql | 任务保存、提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 点击保存、提交 | 任务补数据实例生成成功，实例运行结果成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 4 | 进入运维中心-周期任务管理，点击上述任务操作列补数据按钮-确定 |  |

##### 验证周期运行-spark3.3版本任务周期运行正常运行 「P2」

> 前置条件
```
控制台计算引擎已配置spark3.5版本
创建项目时引入hadoop组件
项目管理开发设置已经勾选spark sql
sql语句列表：
DROP TABLE if EXISTS ods_pof_holding_share_info;

CREATE TABLE IF NOT EXISTS `ods_pof_holding_share_info`(
`client_id` bigint COMMENT'公募客户编号',
`fund_code` bigint COMMENT'基金代码',
`holding_cost` decimal(24,8) COMMENT'持仓总金额',
`holding_income` decimal(24,8) COMMENT'持仓总收益',
`source` string COMMENT'来源'
)comment'客户持有共享信息'partitioned by(
pt string
)stored as orc
lifecycle 100;

INSERT
INTO
TABLE
ods_pof_holding_share_info PARTITION(pt = '${bdp.system.bizdate}')
VALUES
(   1,1,'10000','10000','1'
),(
2,2,'20000','20000','2'
),(
3,3,'30000','30000','1'
);

SELECT * FROM ods_pof_holding_share_info;

-- 客户账户视图
DROP TABLE if EXISTS ods_11_customer_account_view;

CREATE TABLE IF NOT EXISTS `ods_11_customer_account_view`(
`customer_no` bigint COMMENT'统一客户编号',
`pub_no` bigint COMMENT'公募客户编号',
`is_delete` string COMMENT'是否删除 0,1'
)comment'客户账户视图'partitioned by(
pt string
)stored as orc
lifecycle 100;

INSERT
INTO
TABLE
ods_11_customer_account_view PARTITION(pt = '${bdp.system.bizdate}')
values
(   1,1,'0'
),(
2,2,'1'
),(
3,3,'0'
);

SELECT * FROM ods_11_customer_account_view;

-- 客户最新持仓收益信息
DROP TABLE if EXISTS ads_product_posit_cust_list;

CREATE TABLE IF NOT EXISTS `ads_product_posit_cust_list`(
`cust_no` bigint COMMENT'客编',
`fun_code` bigint COMMENT'基金代码',
`posit_amt` decimal(24,8)  COMMENT'持仓总金额',
`posit_profit` decimal(24,8) COMMENT'持仓总收益',
`posit_prof_rat` string COMMENT'持仓收益率	持仓总收益/累计支出',
`posit_type` string COMMENT'汇总类别	公募，私募',
`create_date` string COMMENT'时间'
)comment'客户最新持仓收益信息'partitioned by(
pt string
)stored as orc
lifecycle 100;

INSERT OVERWRITE TABLE ads_product_posit_cust_list PARTITION(pt = '${bdp.system.bizdate}')
select
t1.customer_no
,t.fund_code
, t.posit_amt--持仓总金额
, t.posit_profit-- 持仓总收益
, t.posit_prof_rat--持仓收益率
, t.posit_type -- 汇总类别公募
, t.create_date --数据日期
from (
select
client_id
,fund_code
,sum(holding_cost) as posit_amt--持仓总金额
,sum(holding_income) as posit_profit--持仓总收益
,sum(holding_income) as posit_prof_rat--持仓收益率.
,'公募' as posit_type --汇总类别 公募，私募，汇总
,'${bdp.system.bizdate}' as create_date--数据日期
from  ods_pof_holding_share_info
where pt='${bdp.system.bizdate}'
and source='1'
group by client_id,fund_code
)t
left join (
select
customer_no--统一客户编号
,pub_no--公募客户编号
from ods_11_customer_account_view
where pt='${bdp.system.bizdate}'
and is_delete='0'--正常
and pub_no is not NULL
) t1
on t.client_id=t1.pub_no;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建3.3版本的spark sql周期任务 | 成功进入数据开发模块，新建3.3版本的spark sql周期任务页面，页面内容正常加载显示，无报错 |
| 2 | 针对上述sparksql任务，次日后进入运维中心-周期任务实例查看 | 周期实例生成成功，实例运行结果成功，系统给出成功反馈，相关页面/数据状态更新为最新 |

##### 验证临时查询-spark3.3版本临时查询正常运行 「P1」

> 前置条件
```
控制台计算引擎已配置spark3.5版本
创建项目时引入hadoop组件
项目管理开发设置已经勾选spark sql
sql语句列表：
DROP TABLE if EXISTS ods_pof_holding_share_info;

CREATE TABLE IF NOT EXISTS `ods_pof_holding_share_info`(
`client_id` bigint COMMENT'公募客户编号',
`fund_code` bigint COMMENT'基金代码',
`holding_cost` decimal(24,8) COMMENT'持仓总金额',
`holding_income` decimal(24,8) COMMENT'持仓总收益',
`source` string COMMENT'来源'
)comment'客户持有共享信息'partitioned by(
pt string
)stored as orc
lifecycle 100;

INSERT
INTO
TABLE
ods_pof_holding_share_info PARTITION(pt = '${bdp.system.bizdate}')
VALUES
(   1,1,'10000','10000','1'
),(
2,2,'20000','20000','2'
),(
3,3,'30000','30000','1'
);

SELECT * FROM ods_pof_holding_share_info;

-- 客户账户视图
DROP TABLE if EXISTS ods_11_customer_account_view;

CREATE TABLE IF NOT EXISTS `ods_11_customer_account_view`(
`customer_no` bigint COMMENT'统一客户编号',
`pub_no` bigint COMMENT'公募客户编号',
`is_delete` string COMMENT'是否删除 0,1'
)comment'客户账户视图'partitioned by(
pt string
)stored as orc
lifecycle 100;

INSERT
INTO
TABLE
ods_11_customer_account_view PARTITION(pt = '${bdp.system.bizdate}')
values
(   1,1,'0'
),(
2,2,'1'
),(
3,3,'0'
);

SELECT * FROM ods_11_customer_account_view;

-- 客户最新持仓收益信息
DROP TABLE if EXISTS ads_product_posit_cust_list;

CREATE TABLE IF NOT EXISTS `ads_product_posit_cust_list`(
`cust_no` bigint COMMENT'客编',
`fun_code` bigint COMMENT'基金代码',
`posit_amt` decimal(24,8)  COMMENT'持仓总金额',
`posit_profit` decimal(24,8) COMMENT'持仓总收益',
`posit_prof_rat` string COMMENT'持仓收益率	持仓总收益/累计支出',
`posit_type` string COMMENT'汇总类别	公募，私募',
`create_date` string COMMENT'时间'
)comment'客户最新持仓收益信息'partitioned by(
pt string
)stored as orc
lifecycle 100;

INSERT OVERWRITE TABLE ads_product_posit_cust_list PARTITION(pt = '${bdp.system.bizdate}')
select
t1.customer_no
,t.fund_code
, t.posit_amt--持仓总金额
, t.posit_profit-- 持仓总收益
, t.posit_prof_rat--持仓收益率
, t.posit_type -- 汇总类别公募
, t.create_date --数据日期
from (
select
client_id
,fund_code
,sum(holding_cost) as posit_amt--持仓总金额
,sum(holding_income) as posit_profit--持仓总收益
,sum(holding_income) as posit_prof_rat--持仓收益率.
,'公募' as posit_type --汇总类别 公募，私募，汇总
,'${bdp.system.bizdate}' as create_date--数据日期
from  ods_pof_holding_share_info
where pt='${bdp.system.bizdate}'
and source='1'
group by client_id,fund_code
)t
left join (
select
customer_no--统一客户编号
,pub_no--公募客户编号
from ods_11_customer_account_view
where pt='${bdp.system.bizdate}'
and is_delete='0'--正常
and pub_no is not NULL
) t1
on t.client_id=t1.pub_no;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建3.3版本的spark sql临时查询 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 输入sql语句：前置条件内sql | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 3 | 点击保存 | 任务正常运行，运行结果符合预期 |
| 4 | 点击临时运行 |  |

##### 验证手动任务-spark3.3版本手动任务正常运行 「P1」

> 前置条件
```
控制台计算引擎已配置spark3.5版本
创建项目时引入hadoop组件
项目管理开发设置已经勾选spark sql
sql语句列表：
DROP TABLE if EXISTS ods_pof_holding_share_info;

CREATE TABLE IF NOT EXISTS `ods_pof_holding_share_info`(
`client_id` bigint COMMENT'公募客户编号',
`fund_code` bigint COMMENT'基金代码',
`holding_cost` decimal(24,8) COMMENT'持仓总金额',
`holding_income` decimal(24,8) COMMENT'持仓总收益',
`source` string COMMENT'来源'
)comment'客户持有共享信息'partitioned by(
pt string
)stored as orc
lifecycle 100;

INSERT
INTO
TABLE
ods_pof_holding_share_info PARTITION(pt = '${bdp.system.bizdate}')
VALUES
(   1,1,'10000','10000','1'
),(
2,2,'20000','20000','2'
),(
3,3,'30000','30000','1'
);

SELECT * FROM ods_pof_holding_share_info;

-- 客户账户视图
DROP TABLE if EXISTS ods_11_customer_account_view;

CREATE TABLE IF NOT EXISTS `ods_11_customer_account_view`(
`customer_no` bigint COMMENT'统一客户编号',
`pub_no` bigint COMMENT'公募客户编号',
`is_delete` string COMMENT'是否删除 0,1'
)comment'客户账户视图'partitioned by(
pt string
)stored as orc
lifecycle 100;

INSERT
INTO
TABLE
ods_11_customer_account_view PARTITION(pt = '${bdp.system.bizdate}')
values
(   1,1,'0'
),(
2,2,'1'
),(
3,3,'0'
);

SELECT * FROM ods_11_customer_account_view;

-- 客户最新持仓收益信息
DROP TABLE if EXISTS ads_product_posit_cust_list;

CREATE TABLE IF NOT EXISTS `ads_product_posit_cust_list`(
`cust_no` bigint COMMENT'客编',
`fun_code` bigint COMMENT'基金代码',
`posit_amt` decimal(24,8)  COMMENT'持仓总金额',
`posit_profit` decimal(24,8) COMMENT'持仓总收益',
`posit_prof_rat` string COMMENT'持仓收益率	持仓总收益/累计支出',
`posit_type` string COMMENT'汇总类别	公募，私募',
`create_date` string COMMENT'时间'
)comment'客户最新持仓收益信息'partitioned by(
pt string
)stored as orc
lifecycle 100;

INSERT OVERWRITE TABLE ads_product_posit_cust_list PARTITION(pt = '${bdp.system.bizdate}')
select
t1.customer_no
,t.fund_code
, t.posit_amt--持仓总金额
, t.posit_profit-- 持仓总收益
, t.posit_prof_rat--持仓收益率
, t.posit_type -- 汇总类别公募
, t.create_date --数据日期
from (
select
client_id
,fund_code
,sum(holding_cost) as posit_amt--持仓总金额
,sum(holding_income) as posit_profit--持仓总收益
,sum(holding_income) as posit_prof_rat--持仓收益率.
,'公募' as posit_type --汇总类别 公募，私募，汇总
,'${bdp.system.bizdate}' as create_date--数据日期
from  ods_pof_holding_share_info
where pt='${bdp.system.bizdate}'
and source='1'
group by client_id,fund_code
)t
left join (
select
customer_no--统一客户编号
,pub_no--公募客户编号
from ods_11_customer_account_view
where pt='${bdp.system.bizdate}'
and is_delete='0'--正常
and pub_no is not NULL
) t1
on t.client_id=t1.pub_no;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建3.3版本的spark sql手动任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 输入sql语句：前置条件内sql | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 3 | 点击保存 | 任务正常运行，运行结果符合预期 |
| 4 | 点击临时运行 |  |

##### 验证周期任务-spark3.3版本周期任务正常运行 「P1」

> 前置条件
```
控制台计算引擎已配置spark3.5版本
创建项目时引入hadoop组件
项目管理开发设置已经勾选spark sql
sql语句列表：
DROP TABLE if EXISTS ods_pof_holding_share_info;

CREATE TABLE IF NOT EXISTS `ods_pof_holding_share_info`(
`client_id` bigint COMMENT'公募客户编号',
`fund_code` bigint COMMENT'基金代码',
`holding_cost` decimal(24,8) COMMENT'持仓总金额',
`holding_income` decimal(24,8) COMMENT'持仓总收益',
`source` string COMMENT'来源'
)comment'客户持有共享信息'partitioned by(
pt string
)stored as orc
lifecycle 100;

INSERT
INTO
TABLE
ods_pof_holding_share_info PARTITION(pt = '${bdp.system.bizdate}')
VALUES
(   1,1,'10000','10000','1'
),(
2,2,'20000','20000','2'
),(
3,3,'30000','30000','1'
);

SELECT * FROM ods_pof_holding_share_info;

-- 客户账户视图
DROP TABLE if EXISTS ods_11_customer_account_view;

CREATE TABLE IF NOT EXISTS `ods_11_customer_account_view`(
`customer_no` bigint COMMENT'统一客户编号',
`pub_no` bigint COMMENT'公募客户编号',
`is_delete` string COMMENT'是否删除 0,1'
)comment'客户账户视图'partitioned by(
pt string
)stored as orc
lifecycle 100;

INSERT
INTO
TABLE
ods_11_customer_account_view PARTITION(pt = '${bdp.system.bizdate}')
values
(   1,1,'0'
),(
2,2,'1'
),(
3,3,'0'
);

SELECT * FROM ods_11_customer_account_view;

-- 客户最新持仓收益信息
DROP TABLE if EXISTS ads_product_posit_cust_list;

CREATE TABLE IF NOT EXISTS `ads_product_posit_cust_list`(
`cust_no` bigint COMMENT'客编',
`fun_code` bigint COMMENT'基金代码',
`posit_amt` decimal(24,8)  COMMENT'持仓总金额',
`posit_profit` decimal(24,8) COMMENT'持仓总收益',
`posit_prof_rat` string COMMENT'持仓收益率	持仓总收益/累计支出',
`posit_type` string COMMENT'汇总类别	公募，私募',
`create_date` string COMMENT'时间'
)comment'客户最新持仓收益信息'partitioned by(
pt string
)stored as orc
lifecycle 100;

INSERT OVERWRITE TABLE ads_product_posit_cust_list PARTITION(pt = '${bdp.system.bizdate}')
select
t1.customer_no
,t.fund_code
, t.posit_amt--持仓总金额
, t.posit_profit-- 持仓总收益
, t.posit_prof_rat--持仓收益率
, t.posit_type -- 汇总类别公募
, t.create_date --数据日期
from (
select
client_id
,fund_code
,sum(holding_cost) as posit_amt--持仓总金额
,sum(holding_income) as posit_profit--持仓总收益
,sum(holding_income) as posit_prof_rat--持仓收益率.
,'公募' as posit_type --汇总类别 公募，私募，汇总
,'${bdp.system.bizdate}' as create_date--数据日期
from  ods_pof_holding_share_info
where pt='${bdp.system.bizdate}'
and source='1'
group by client_id,fund_code
)t
left join (
select
customer_no--统一客户编号
,pub_no--公募客户编号
from ods_11_customer_account_view
where pt='${bdp.system.bizdate}'
and is_delete='0'--正常
and pub_no is not NULL
) t1
on t.client_id=t1.pub_no;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建3.3版本的spark sql周期任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 输入sql语句：前置条件内sql | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 3 | 点击保存 | 任务正常运行，运行结果符合预期 |
| 4 | 点击临时运行 |  |

