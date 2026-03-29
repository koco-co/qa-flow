---
name: 【数据资产】配合离线多集群doris配置改造 v6.3.4
description: 【数据资产】配合离线多集群doris配置改造 v6.3.4
tags:
  - 数据资产
  - 数据资产-数据模型
  - 配合离线多集群doris配置改造
module: data-assets
version: v6.3.4
source: zentao-cases/dtstack-platform/数据资产/archive-cases/v6.3.4/【数据资产】配合离线多集群doris配置改造.csv
case_count: 1
created_at: 2026-03-29
origin: csv
---
# 【数据资产】配合离线多集群doris配置改造 v6.3.4
> 来源：zentao-cases/dtstack-platform/数据资产/archive-cases/v6.3.4/【数据资产】配合离线多集群doris配置改造.csv
> 用例数：1

---

## 数据资产-数据模型

##### 验证底层创建表，资产元数据同步是否正常 「P2」

> 前置条件
```
CREATE TABLE ks_001 (
    product_id INT COMMENT “用户ID“,
    amount int COMMENT “用户姓名“
    )
    DISTRIBUTED BY HASH(product_id) BUCKETS 10
    PROPERTIES (
    “replication_num“ = “1“
    );
  

；在DBeaver连接数据源，创建前置条件中的表，然后
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入资产-元数据同步，新增同步，选择数据源、数据库，查看数据表 | 成功进入资产-元数据同步，新增同步，选择数据源、数据库，查看数据表，页面内容正常加载显示，无报错 |
| 2 | 选中表进行元数据同步 | 数据表中有底层创建的表 |
| 3 | 选择立即同步，选择负责人，同步成功后查看结果 | 同步成功，表结构、数据预览、技术属性、血缘关系等正确 |
| 4 |  | （补充：4. 负责人正确，页面内容与实际数据一致，各字段显示正常，无报错或异常提示） |

