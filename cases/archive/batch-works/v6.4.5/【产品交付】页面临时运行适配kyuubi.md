---
name: 【产品交付】页面临时运行适配kyuubi v6.4.5
description: 【产品交付】页面临时运行适配kyuubi v6.4.5
tags:
  - 离线开发
  - 产品交付
  - 页面临时运行适配kyuubi
module: batch-works
version: v6.4.5
source: zentao-cases/dtstack-platform/离线开发/archive-cases/v6.4.5/【产品交付】页面临时运行适配kyuubi.csv
case_count: 21
created_at: 2026-03-29
origin: csv
---
# 【产品交付】页面临时运行适配kyuubi v6.4.5
> 来源：zentao-cases/dtstack-platform/离线开发/archive-cases/v6.4.5/【产品交付】页面临时运行适配kyuubi.csv
> 用例数：21

---

## 【页面临时运行适配kyuubi】

##### 验证【手动实例】正常运行复杂查询——运行模式为【kyuubi】 「P1」

> 前置条件
```
【控制台】的Spark Thrift 组件的连接方式为kyuubi

spark脚本：
drop table ods_test
create table if not exists ods_test (
order_header_id     string comment '订单头id'
,order_date          bigint comment '订单日期'
,shop_id             string comment '店铺id'
,customer_id         string comment '客户id'
,order_status        bigint comment '订单状态'
,pay_date            bigint comment '支付日期'

)comment '销售订单明细表'
PARTITIONED BY (ds string);

select * from ods_test where 1=1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据中心-手动任务】创建spark任务，写入脚本，保存提交 | 保存提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 2 | 进入【运维中心-手动任务管理】运行spark任务 | 通过yarn运行，运行结果正确，【控制台-计算队列】有数据 |

##### 验证【手动实例】正常运行复杂查询——运行模式为【on yarn】 「P2」

> 前置条件
```
【控制台】的Spark Thrift 组件的连接方式为kyuubi

spark脚本：
drop table ods_test
create table if not exists ods_test (
order_header_id     string comment '订单头id'
,order_date          bigint comment '订单日期'
,shop_id             string comment '店铺id'
,customer_id         string comment '客户id'
,order_status        bigint comment '订单状态'
,pay_date            bigint comment '支付日期'

)comment '销售订单明细表'
PARTITIONED BY (ds string);

select * from ods_test where 1=1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据中心-手动任务】创建spark任务，写入脚本，保存提交 | 保存提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 2 | 进入【运维中心-手动任务管理】 运行spark任务 | 通过yarn运行，运行结果正确，【控制台-计算队列】有数据 |

##### 验证【周期实例】正常运行复杂查询——运行模式为【kyuubi】 「P2」

> 前置条件
```
【控制台】的Spark Thrift 组件的连接方式为kyuubi

spark脚本：
drop table ods_test
create table if not exists ods_test (
order_header_id     string comment '订单头id'
,order_date          bigint comment '订单日期'
,shop_id             string comment '店铺id'
,customer_id         string comment '客户id'
,order_status        bigint comment '订单状态'
,pay_date            bigint comment '支付日期'

)comment '销售订单明细表'
PARTITIONED BY (ds string);

select * from ods_test where 1=1

【调度属性】为“立即生成，开始时间为当前时间15分钟之后”
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据中心-周期任务】创建spark任务，写入脚本，保存提交 | 保存提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 2 | 进入【运维中心-周期实例运行】等待周期运行spark任务 | 通过yarn运行，运行结果正确，【控制台-计算队列】有数据 |

##### 验证【周期实例】正常运行复杂查询——运行模式为【on yarn】 「P1」

> 前置条件
```
【控制台】的Spark Thrift 组件的连接方式为kyuubi

spark脚本：
drop table ods_test
create table if not exists ods_test (
order_header_id     string comment '订单头id'
,order_date          bigint comment '订单日期'
,shop_id             string comment '店铺id'
,customer_id         string comment '客户id'
,order_status        bigint comment '订单状态'
,pay_date            bigint comment '支付日期'

)comment '销售订单明细表'
PARTITIONED BY (ds string);

select * from ods_test where 1=1

【调度属性】为“立即生成，开始时间为当前时间15分钟之后”
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据中心-周期任务】创建spark任务，写入脚本，保存提交 | 保存提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 2 | 进入【运维中心-周期实例运行】等待周期运行spark任务 | 通过yarn运行，运行结果正确，【控制台-计算队列】有数据 |

##### 验证【周期】sql任务正常运行【复杂查询】——控制台配置【错误】的【kyuubi】 「P3」

> 前置条件
```
【控制台】的Spark Thrift 组件的连接方式为kyuubi

spark脚本：
drop table ods_test
create table if not exists ods_test (
order_header_id     string comment '订单头id'
,order_date          bigint comment '订单日期'
,shop_id             string comment '店铺id'
,customer_id         string comment '客户id'
,order_status        bigint comment '订单状态'
,pay_date            bigint comment '支付日期'

)comment '销售订单明细表'
PARTITIONED BY (ds string);

select * from ods_test where 1=1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据开发-周期任务】新建sparksql任务，写入脚本，运行模式为kyuubi，点击运行 | 通过kyuubi运行，任务运行失败 |
| 2 | 运行模式切换为【on yanr】，点击运行 | 切换成功，任务运行成功，结果正确，内容与预期完全一致，无异常或错误 |

##### 验证【周期】sql任务正常运行【复杂查询】——控制台由【sts】切换至【kyuubi】 「P3」

> 前置条件
```
【控制台】的Spark Thrift 组件的连接方式为kyuubi

spark脚本：
drop table ods_test
create table if not exists ods_test (
order_header_id     string comment '订单头id'
,order_date          bigint comment '订单日期'
,shop_id             string comment '店铺id'
,customer_id         string comment '客户id'
,order_status        bigint comment '订单状态'
,pay_date            bigint comment '支付日期'

)comment '销售订单明细表'
PARTITIONED BY (ds string);

select * from ods_test where 1=1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据开发-周期任务】新建sparksql任务，写入脚本，点击运行 | 通过yarn运行，运行结果正确，【控制台-计算队列】有数据 |
| 2 | 切换控制台为kyuubi | 成功切换至目标页签/状态，页面内容随之刷新显示 |
| 3 | 进入上述新建任务查看 | 运行按钮右侧新增下拉框，默认值为：kyuubi |
| 4 | 点击临时运行任务 | 通过kyuubi运行，任务运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |

##### 验证【周期】sql任务正常运行【复杂查询】——控制台由【kyuubi】切换至【sts】 「P3」

> 前置条件
```
【控制台】的Spark Thrift 组件的连接方式为kyuubi

spark脚本：
drop table ods_test
create table if not exists ods_test (
order_header_id     string comment '订单头id'
,order_date          bigint comment '订单日期'
,shop_id             string comment '店铺id'
,customer_id         string comment '客户id'
,order_status        bigint comment '订单状态'
,pay_date            bigint comment '支付日期'

)comment '销售订单明细表'
PARTITIONED BY (ds string);

select * from ods_test where 1=1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据开发-周期任务】新建sparksql任务，写入脚本，运行模式为kyuubi，点击运行 | 通过kyuubi运行，任务运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 2 | 切换控制台为sts | 成功切换至目标页签/状态，页面内容随之刷新显示 |
| 3 | 进入上述新建任务查看，点击运行 | 运行按钮右侧无下拉框 |
| 4 |  | 通过yarn运行，运行结果正确，【控制台-计算队列】有数据 |

##### 验证【组件】sql任务正常运行【简单查询】——运行模式由【on yarn】切换至【kyuubi】 「P3」

> 前置条件
```
【控制台】的Spark Thrift 组件的连接方式为kyuubi

spark脚本：
select 1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据开发-组件管理】新建sparksql任务，写入脚本，运行模式为on yarn，点击运行 | 通过hdfs运行，运行结果正确，【控制台-计算队列】没有数据 |
| 2 | 切换运行模式为kyuubi，点击运行 | 通过hdfs运行，运行结果正确，运行结果正确，【控制台-计算队列】没有数据 |

##### 验证【临时查询】sql任务正常运行【简单查询】——运行模式由【on yarn】切换至【kyuubi】 「P2」

> 前置条件
```
【控制台】的Spark Thrift 组件的连接方式为kyuubi

spark脚本：
spark脚本：
select 1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据开发-临时任务】新建sparksql任务，写入脚本，运行模式为on yarn，点击运行 | 通过hdfs运行，运行结果正确，【控制台-计算队列】没有数据 |
| 2 | 切换运行模式为kyuubi，点击运行 | 通过hdfs运行，运行结果正确，【控制台-计算队列】没有数据 |

##### 验证【手动】sql任务正常运行【简单查询】——运行模式由【on yarn】切换至【kyuubi】 「P2」

> 前置条件
```
【控制台】的Spark Thrift 组件的连接方式为kyuubi

spark脚本：
spark脚本：
select 1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据开发-手动任务】新建sparksql任务，写入脚本，运行模式为on yarn，点击运行 | 通过hdfs运行，运行结果正确，【控制台-计算队列】没有数据 |
| 2 | 切换运行模式为kyuubi，点击运行 | 通过hdfs运行，运行结果正确，运行结果正确，【控制台-计算队列】没有数据 |

##### 验证【周期】sql任务正常运行【简单查询】——运行模式由【on yarn】切换至【kyuubi】 「P1」

> 前置条件
```
【控制台】的Spark Thrift 组件的连接方式为kyuubi

spark脚本：
select 1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据开发-周期任务】新建sparksql任务，写入脚本，运行模式为on yarn，点击运行 | 通过hdfs运行，运行结果正确，【控制台-计算队列】没有数据 |
| 2 | 切换运行模式为kyuubi，点击运行 | 通过hdfs运行，运行结果正确，运行结果正确，【控制台-计算队列】没有数据 |

##### 验证【组件】sql任务正常运行【复杂查询】——运行模式由【on yarn】切换至【kyuubi】 「P3」

> 前置条件
```
【控制台】的Spark Thrift 组件的连接方式为kyuubi

spark脚本：
drop table ods_test
create table if not exists ods_test (
order_header_id     string comment '订单头id'
,order_date          bigint comment '订单日期'
,shop_id             string comment '店铺id'
,customer_id         string comment '客户id'
,order_status        bigint comment '订单状态'
,pay_date            bigint comment '支付日期'

)comment '销售订单明细表'
PARTITIONED BY (ds string);

select * from ods_test where 1=1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据开发-组件管理】新建sparksql任务，写入脚本，运行模式为on yarn，点击运行 | 通过yarn运行，运行结果正确，【控制台-计算队列】有数据 |
| 2 | 切换运行模式为kyuubi，点击运行 | 通过kyuubi运行，任务运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |

##### 验证【临时查询】sql任务正常运行【复杂查询】——运行模式由【on yarn】切换至【kyuubi】 「P2」

> 前置条件
```
【控制台】的Spark Thrift 组件的连接方式为kyuubi

spark脚本：
drop table ods_test
create table if not exists ods_test (
order_header_id     string comment '订单头id'
,order_date          bigint comment '订单日期'
,shop_id             string comment '店铺id'
,customer_id         string comment '客户id'
,order_status        bigint comment '订单状态'
,pay_date            bigint comment '支付日期'

)comment '销售订单明细表'
PARTITIONED BY (ds string);

select * from ods_test where 1=1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据开发-临时任务】新建sparksql任务，写入脚本，运行模式为on yarn，点击运行 | 通过yarn运行，运行结果正确，【控制台-计算队列】有数据 |
| 2 | 切换运行模式为kyuubi，点击运行 | 通过kyuubi运行，任务运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |

##### 验证【手动】sql任务正常运行【复杂查询】——运行模式由【on yarn】切换至【kyuubi】 「P2」

> 前置条件
```
【控制台】的Spark Thrift 组件的连接方式为kyuubi

spark脚本：
drop table ods_test
create table if not exists ods_test (
order_header_id     string comment '订单头id'
,order_date          bigint comment '订单日期'
,shop_id             string comment '店铺id'
,customer_id         string comment '客户id'
,order_status        bigint comment '订单状态'
,pay_date            bigint comment '支付日期'

)comment '销售订单明细表'
PARTITIONED BY (ds string);

select * from ods_test where 1=1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据开发-手动任务】新建sparksql任务，写入脚本，运行模式为on yarn，点击运行 | 通过yarn运行，运行结果正确，【控制台-计算队列】有数据 |
| 2 | 切换运行模式为kyuubi，点击运行 | 通过kyuubi运行，任务运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |

##### 验证【周期】sql任务正常运行【复杂查询】——运行模式由【on yarn】切换至【kyuubi】 「P1」

> 前置条件
```
【控制台】的Spark Thrift 组件的连接方式为kyuubi

spark脚本：
drop table ods_test
create table if not exists ods_test (
order_header_id     string comment '订单头id'
,order_date          bigint comment '订单日期'
,shop_id             string comment '店铺id'
,customer_id         string comment '客户id'
,order_status        bigint comment '订单状态'
,pay_date            bigint comment '支付日期'

)comment '销售订单明细表'
PARTITIONED BY (ds string);

select * from ods_test where 1=1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据开发-周期任务】新建sparksql任务，写入脚本，运行模式为on yarn，点击运行 | 通过yarn运行，运行结果正确，【控制台-计算队列】有数据 |
| 2 | 切换运行模式为kyuubi，点击运行 | 通过kyuubi运行，任务运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |

##### 验证【手动实例】正常运行复杂查询——控制台选择【STS】 「P2」

> 前置条件
```
【控制台】的Spark Thrift 组件的连接方式为STS

spark脚本：
drop table ods_test
create table if not exists ods_test (
order_header_id     string comment '订单头id'
,order_date          bigint comment '订单日期'
,shop_id             string comment '店铺id'
,customer_id         string comment '客户id'
,order_status        bigint comment '订单状态'
,pay_date            bigint comment '支付日期'

)comment '销售订单明细表'
PARTITIONED BY (ds string);

select * from ods_test where 1=1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据中心-手动任务】创建spark任务，写入脚本，保存提交 | 保存提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 2 | 进入【运维中心-手动任务管理】运行spark任务 | 通过yarn运行，运行结果正确，【控制台-计算队列】有数据 |

##### 验证【周期实例】正常运行复杂查询——控制台选择【STS】 「P2」

> 前置条件
```
【控制台】的Spark Thrift 组件的连接方式为STS

spark脚本：
drop table ods_test
create table if not exists ods_test (
order_header_id     string comment '订单头id'
,order_date          bigint comment '订单日期'
,shop_id             string comment '店铺id'
,customer_id         string comment '客户id'
,order_status        bigint comment '订单状态'
,pay_date            bigint comment '支付日期'

)comment '销售订单明细表'
PARTITIONED BY (ds string);

select * from ods_test where 1=1

【调度属性】为“立即生成，开始时间为当前时间15分钟之后”
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据中心-周期任务】创建spark任务，写入脚本，保存提交 | 保存提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 2 | 进入【运维中心-周期实例运行】等待周期运行spark任务 | 通过yarn运行，运行结果正确，【控制台-计算队列】有数据 |

##### 验证任务正常运行【简单查询】——控制台选择【STS】 「P2」

> 前置条件
```
【控制台】的Spark Thrift 组件的连接方式为STS
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据中心-周期任务】创建spark任务，写入脚本，点击运行 | 通过hdfs运行，运行结果正确，【控制台-计算队列】没有数据 |
| 2 | 进入【数据中心-手动任务】创建spark任务，写入脚本，点击运行 | 通过hdfs运行，运行结果正确，【控制台-计算队列】没有数据 |
| 3 | 进入【数据中心-临时查询】创建spark任务，写入脚本，点击运行 | 通过hdfs运行，运行结果正确，【控制台-计算队列】没有数据 |
| 4 | 进入【数据中心-组件管理】创建spark任务，写入脚本，点击运行 | 通过hdfs运行，运行结果正确，【控制台-计算队列】没有数据 |

##### 验证任务正常运行【复杂查询】——控制台选择【STS】 「P2」

> 前置条件
```
【控制台】的Spark Thrift 组件的连接方式为sts

spark脚本：
drop table ods_test
create table if not exists ods_test (
order_header_id     string comment '订单头id'
,order_date          bigint comment '订单日期'
,shop_id             string comment '店铺id'
,customer_id         string comment '客户id'
,order_status        bigint comment '订单状态'
,pay_date            bigint comment '支付日期'

)comment '销售订单明细表'
PARTITIONED BY (ds string);

select * from ods_test where 1=1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据中心-周期任务】创建spark任务，写入脚本，点击运行 | 通过yarn运行，运行结果正确，【控制台-计算队列】有数据 |
| 2 | 进入【数据中心-手动任务】创建spark任务，写入脚本，点击运行 | 通过yarn运行，运行结果正确，【控制台-计算队列】有数据 |
| 3 | 进入【数据中心-临时查询】创建spark任务，写入脚本，点击运行 | 通过yarn运行，运行结果正确，【控制台-计算队列】有数据 |
| 4 | 进入【数据中心-组件管理】创建spark任务，写入脚本，点击运行 | 通过yarn运行，运行结果正确，【控制台-计算队列】有数据 |

##### 验证运行按钮右侧【有】新增选择框——控制台选择【Kyuubi】 「P2」

> 前置条件
```
验证 【控制台】的Spark Thrift 组件的连接方式为kyuubi
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据开发-周期任务】，新建sparksql任务 | 1）运行按钮右边新增运行方式下拉框 |
| 2 | 进入【数据开发-手动任务】，新建sparksql任务 | 2）下拉框默认值：Kyuubi |
| 3 | 进入【数据开发-临时查询】，新建sparksql任务 | 3）下拉框中枚举值：On YARN / Kyuubi |
| 4 | 进入【数据开发-组件管理】，新建sparksql任务 | 1）运行按钮右边新增运行方式下拉框 |
| 5 |  | 2）下拉框默认值：Kyuubi |
| 6 |  | 3）下拉框中枚举值：On YARN / Kyuubi |
| 7 |  | 1）运行按钮右边新增运行方式下拉框 |
| 8 |  | 2）下拉框默认值：Kyuubi |
| 9 |  | 3）下拉框中枚举值：On YARN / Kyuubi |
| 10 |  | 1）运行按钮右边新增运行方式下拉框 |
| 11 |  | 2）下拉框默认值：Kyuubi |
| 12 |  | 3）下拉框中枚举值：On YARN / Kyuubi |

##### 验证运行按钮右侧【无】新增选择框——控制台选择【STS】 「P2」

> 前置条件
```
【控制台】的Spark Thrift 组件的连接方式为sts
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据开发-周期任务】，新建sparksql任务 | 任务运行按钮不变 |
| 2 | 进入【数据开发-手动任务】，新建sparksql任务 | 任务运行按钮不变 |
| 3 | 进入【数据开发-临时查询】，新建sparksql任务 | 任务运行按钮不变 |
| 4 | 进入【数据开发-组件管理】，新建sparksql任务 | 任务运行按钮不变 |

