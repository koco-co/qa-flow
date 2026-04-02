---
title: "「在线问题转化」DmMySQL底层库下元数据同步任务列表加载"
suite_name: "在线问题转化"
description: "验证底层库为 DmMySQL 时，进入元数据同步周期同步列表页面正常加载，不出现 SQL 语法错误"
prd_id: ""
prd_version: ""
prd_path: ""
product: "dataAssets"
zentao_bug_id: 141713
zentao_url: "http://zenpms.dtstack.cn/zentao/bug-view-141713.html"
dev_version: "hotfix_6.3.x_141713"
tags:
  - hotfix
  - online-case
  - 元数据同步
  - DmMySQL
keywords: "6.3|元数据同步|DmMySQL||6.3|SQL查询缺少逗号"
create_at: "2026-04-02"
update_at: "2026-04-02"
status: "草稿"
repos:
  - ".repos/dt-insight-web/dt-center-metadata"
case_count: 1
origin: zentao
---

## 「在线问题转化」DmMySQL底层库下元数据同步任务列表加载

> **Bug 链接**：[#141713 【数据资产】元数据同步点击底层执行sql报错，导致元数据同步查不出来数据](http://zenpms.dtstack.cn/zentao/bug-view-141713.html)
> **修复分支**：`hotfix_6.3.x_141713`（`dt-insight-web/dt-center-metadata`）
> **根因**：`dao/src/main/resources/dmMysqlMapper/sync/SyncTaskMapper.xml` 中 `pageTask` 查询的 SELECT 列表在 `dataSource.data_source_name` 后缺少逗号，导致在 DmMySQL 底层库环境下执行时产生 SQL 语法错误，元数据同步任务列表无法加载。

---

##### 【141713】验证底层库为 DmMySQL 时元数据同步周期同步任务列表正常加载

**前置条件：**
> - 当前部署环境底层数据库（metadata 存储库）为 **DmMySQL**
> - 已登录系统，当前账号具有「元数据同步」模块操作权限
> - 平台已配置至少一个可用的数据源（如 MySQL 类型，命名示例：`test_mysql_source`）

**操作步骤：**

| 步骤 | 操作 | 预期结果 |
| --- | --- | --- |
| 1 | 点击顶部导航进入【元数据】模块 | 成功进入元数据模块主页 |
| 2 | 点击左侧菜单【元数据同步】 | 页面跳转至元数据同步页面，默认显示【周期同步】Tab |
| 3 | 点击【新增周期同步任务】按钮 | 弹出【新增周期同步任务】弹窗，进入第一步「同步规则」配置 |
| 4 | 在同步规则页：选择数据源 `test_mysql_source`，同步数据库选择「全部数据库」，点击【下一步】 | 进入第二步「调度配置」 |
| 5 | 在调度配置页：保持默认调度配置，点击【确定】 | 提示「新增周期同步任务成功」，弹窗关闭，任务列表中新增一条记录 |
| 6 | 刷新页面，重新进入【元数据 → 元数据同步】，点击【周期同步】Tab | 周期同步任务列表正常加载，步骤 5 新增的任务记录完整显示（含数据源名称、同步状态、最近同步时间等列），页面无报错弹窗、无空白列表 |

**预期结果：**

修复前：进入周期同步任务列表时，DmMySQL 底层库执行 `pageTask` 查询报 SQL 语法错误，列表区域加载失败或显示空数据
修复后：周期同步任务列表正常加载，已创建的任务记录完整展示，数据源名称、同步状态等字段显示正确（修复后）
