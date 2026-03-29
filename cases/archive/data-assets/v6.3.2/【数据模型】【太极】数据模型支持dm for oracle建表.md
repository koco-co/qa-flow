---
name: 【数据模型】【太极】数据模型支持dm for oracle建表 v6.3.2
description: 【数据模型】【太极】数据模型支持dm for oracle建表 v6.3.2
tags:
  - 数据资产
  - 数据资产-数据模型
  - 数据模型
  - 太极
  - 数据模型支持dm
  - for
  - oracle建表
module: data-assets
version: v6.3.2
source: zentao-cases/dtstack-platform/数据资产/archive-cases/v6.3.2/【数据模型】【太极】数据模型支持dm for oracle建表.csv
case_count: 1
created_at: 2026-03-29
origin: csv
---
# 【数据模型】【太极】数据模型支持dm for oracle建表 v6.3.2
> 来源：zentao-cases/dtstack-platform/数据资产/archive-cases/v6.3.2/【数据模型】【太极】数据模型支持dm for oracle建表.csv
> 用例数：1

---

## 数据资产-数据模型

##### 验证DM For Oracle模型建表审批功能 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产】-【数据模型】页面 | 成功进入【数据资产】-【数据模型】页面，页面内容正常加载显示，无报错 |
| 2 | 管理员新建表，数据源选择DM For Oracle类型 | 建表成功，直接审批通过 |
| 3 | 非管理员新建表，数据源选择DM For Oracle类型 | 1）表状态为待审批2）审批通过后，建表成功3）审批拒绝后，建表失败，列表中不存在该表 |

