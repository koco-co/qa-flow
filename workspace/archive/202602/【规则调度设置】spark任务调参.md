---
suite_name: "【规则调度设置】spark任务调参"
description: "【规则调度设置】spark任务调参用例归档"
tags:
  - "规则任务管理"
  - "环境参数配置"
  - "环境参数配置生效"
  - "验证规则任务详情"
  - "环境参数显示正常"
  - "验证调度属性编辑"
  - "验证调度属性新增"
  - "【规则调度设置】spark任务调参"
prd_version: "v6.4.8"
dev_version:
  - "岚图汽车"
create_at: "2026-04-05"
status: "草稿"
origin: "csv"
case_count: 14
case_id: 10190
---

## 规则任务管理

##### 【P1】验证Spark环境参数配置生效(spark.driver.maxResultSize)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】, 设置spark.driver.maxResultSize=2g 后保存 | 规则任务保存成功 |
| 4 | 运行规则任务 | 任务运行成功, 校验结果正常 |
| 5 | 进入Apache Hadoop YARN界面, 点击 Tracking UI: ApplicationMaster，在 Environment 页签确认该参数值 | 应为2g |

##### 【P0】验证Spark环境参数配置生效(logLevel)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】, 设置logLevel=ERROR 后保存 | 规则任务保存成功 |
| 4 | 运行规则任务 | 任务运行成功, 校验结果正常 |
| 5 | 进入Apache Hadoop YARN界面, 点击 Tracking UI: ApplicationMaster -❯ Executors -❯ stderr/stdout | 日志不再打印 INFO 级别信息 |

##### 【P1】验证Spark环境参数配置生效(spark.speculation)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】, 设置spark.speculation=true 后保存 | 规则任务保存成功 |
| 4 | 运行规则任务 | 任务运行成功, 校验结果正常 |
| 5 | 进入Apache Hadoop YARN界面, 点击 Tracking UI: ApplicationMaster，在 Environment 页签确认 spark.speculation | 应为true |

##### 【P1】验证Spark环境参数配置生效(spark.network.timeout)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】, 设置spark.network.timeout=300s 后保存 | 规则任务保存成功 |
| 4 | 运行规则任务 | 任务运行成功, 校验结果正常 |
| 5 | 进入Apache Hadoop YARN界面, 点击 Tracking UI: ApplicationMaster，在 Environment 页签搜索该参数 | 确认 Value 为 300s |

##### 【P1】验证Spark环境参数配置生效(spark.sql.shuffle.partitions)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】, 设置spark.sql.shuffle.partitions=10 后保存 | 规则任务保存成功 |
| 4 | 运行规则任务 | 任务运行成功, 校验结果正常 |
| 5 | 进入Apache Hadoop YARN界面, 点击 Tracking UI: ApplicationMaster 进入 Spark UI，在 Stages 页签查看 Shuffle 操作的 Tasks 总数 | 应为 10 |

##### 【P1】验证Spark环境参数配置生效(spark.yarn.executor.memoryOverhead)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】, 设置spark.yarn.executor.memoryOverhead=1024(1g) 后保存 | 规则任务保存成功 |
| 4 | 运行规则任务 | 任务运行成功, 校验结果正常 |
| 5 | 进入Apache Hadoop YARN界面, 检查【 Allocated Memory MB】字段下, 对应任务的值 | Allocated Memory MB 总量会增加。例如 executor.memory 为 1g 时，该字段应显示约 2048MB |

##### 【P1】验证Spark环境参数配置生效(spark.driver.memory)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】, 设置spark.driver.memory=2g 后保存 | 规则任务保存成功 |
| 4 | 运行规则任务 | 任务运行成功, 校验结果正常 |
| 5 | 进入Apache Hadoop YARN界面, 检查【 Allocated Memory MB】字段下, 对应任务的值 | 找到 AppMaster 对应的那个 Container，其 Allocated Memory MB 应为 2048MB + Overhead |

##### 【P1】验证Spark环境参数配置生效(spark.driver.cores)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】, 设置spark.driver.cores=2 后保存 | 规则任务保存成功 |
| 4 | 运行规则任务 | 任务运行成功, 校验结果正常 |
| 5 | 进入Apache Hadoop YARN界面, 检查【Allocated CPU Vcores】字段下, 对应任务的值 | Allocated CPU Vcores 的总量应在默认基础上增加 1（因为 Driver 占用了更多核） |

##### 【P1】验证Spark环境参数配置生效(spark.executor.memory)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】, 设置spark.executor.memory=2g 后保存 | 规则任务保存成功 |
| 4 | 运行规则任务 | 任务运行成功, 校验结果正常 |
| 5 | 进入Apache Hadoop YARN界面, 检查【Allocated Memory MB】字段下, 对应任务的值 | 单个 Container 的 Allocated Memory MB 应显著增加（通常显示为 2048MB + Overhead |

##### 【P0】验证Spark环境参数配置生效(spark.executor.cores)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】, 设置spark.executor.cores=2 后保存 | 规则任务保存成功 |
| 4 | 运行规则任务 | 任务运行成功, 校验结果正常 |
| 5 | 进入Apache Hadoop YARN界面, 检查【Allocated CPU Vcores】字段下, 对应任务的值 | 【Allocated CPU Vcores】 字段应显示为：3 = instances * 2 + driver.cores |

##### 【P1】验证Spark环境参数配置生效(spark.executor.instances)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】, 设置spark.executor.instances=3 后保存 | 规则任务保存成功 |
| 4 | 运行规则任务 | 任务运行成功, 校验结果正常 |
| 5 | 进入Apache Hadoop YARN界面, 检查【Running Containers】字段下, 对应任务的值 | 【Running Containers】 字段应显示为 4 = 3 + 1 (Driver/AM) |

##### 【P0】验证规则任务详情-环境参数显示正常(SparkThrift2.x)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】 | 进入【环境参数配置】页面, 可进行编辑, 默认内容:## Driver程序使用的CPU核数,默认为1# spark.driver.cores=1## Driver程序使用内存大小,默认1g# spark.driver.memory=1g## 对Spark每个action结果集大小的限制，最少是1M，若设为0则不限制大小。## 若Job结果超过限制则会异常退出，若结果集限制过大也可能造成OOM问题，默认1g# spark.driver.maxResultSize=1g## 启动的executor的数量，默认为1# spark.executor.instances=1## 每个executor使用的CPU核数，默认为1# spark.executor.cores=1## 每个executor内存大小,默认1g# spark.executor.memory=1g## spark 日志级别可选ALL, DEBUG, ERROR, FATAL, INFO, OFF, TRACE, WARN# logLevel = INFO## spark中所有网络交互的最大超时时间# spark.network.timeout=120s## executor的OffHeap内存，和spark.executor.memory配置使用# spark.yarn.executor.memoryOverhead=## 设置spark sql shuffle分区数，默认200# spark.sql.shuffle.partitions=200## 开启spark推测行为，默认false# spark.speculation=false |
| 4 | 保存后, 进入规则任务详情页中, 点击【环境参数】 | 展开环境参数抽屉, 参数显示正常 |
| 5 | 运行规则任务 | 运行成功, 校验结果正常 |

##### 【P0】验证调度属性编辑环境参数配置(SparkThrift2.x)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】, 设置spark.executor.cores=2 后保存 | 规则任务保存成功 |
| 4 | 进入规则任务详情, 点击「环境参数」 | 进入「配置环境参数」界面, 配置参数回显正确 |
| 5 | 设置spark.executor.cores=3 后保存 | 修改成功, 配置参数回显正确 |

##### 【P1】验证调度属性新增环境参数配置(SparkThrift2.x)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 检查调度配置信息 | 新增配置: 环境参数配置 |
| 4 | 点击【环境参数配置】 | 进入【环境参数配置】页面, 可进行编辑 |
| 5 | 取消/确定 | 配置页面关闭 / 配置内容保存成功 |
