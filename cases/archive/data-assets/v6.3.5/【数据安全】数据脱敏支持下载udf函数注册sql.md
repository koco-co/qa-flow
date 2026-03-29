---
name: 【数据安全】数据脱敏支持下载udf函数注册sql v6.3.5
description: 【数据安全】数据脱敏支持下载udf函数注册sql v6.3.5
tags:
  - 数据资产
  - 数据资产-数据安全
  - 数据安全
  - 数据脱敏支持下载udf函数注册sql
module: data-assets
version: v6.3.5
source: zentao-cases/dtstack-platform/数据资产/archive-cases/v6.3.5/【数据安全】数据脱敏支持下载udf函数注册sql.csv
case_count: 1
created_at: 2026-03-29
origin: csv
---
# 【数据安全】数据脱敏支持下载udf函数注册sql v6.3.5
> 来源：zentao-cases/dtstack-platform/数据资产/archive-cases/v6.3.5/【数据安全】数据脱敏支持下载udf函数注册sql.csv
> 用例数：1

---

## 数据资产-数据安全

##### 验证udf函数下载功能 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据安全-数据脱敏管理-脱敏应用-添加脱敏表，选择doris数据源 | 在数据源类型上方弹出提示内容 |
| 2 | 点击下载按钮 | 下载成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 查看下载的内容 | 为udf函数jar包和执行sql信息的压缩包 |

