---
suite_name: "Hotfix 用例 - SQL Server 全库同步后数据资产库表正常展示"
description: "验证 Bug #148224 修复效果 - SQL Server 表名带 schema 前缀时不会导致库表元数据被误删"
tags:
  - hotfix
  - bug-148224
  - 元数据资产
  - SQLServer
  - 元数据同步
create_at: "2026-04-08"
status: 草稿
origin: zentao
---

## 元数据资产

### 元数据同步与元数据管理

#### SQL Server 全库同步后数据库元数据展示

##### 【148224】验证 SQL Server 周期同步完成后数据库页正常展示且保留库表元数据

> 前置条件
```
1、环境要求：
- 已部署包含 hotfix_5.2.x_148224 修复的 dt-center-metadata 服务。
- 元数据资产应用可正常访问，前端路由 `/metaDataSync`、`/manageTables` 可用。
- 测试账号具备“元数据同步”和“元数据管理”页面访问权限，以及 `METADATA_SYNC_OPERATION` 操作权限。

2、数据准备：
- 在 SQL Server 执行以下脚本，准备一个带 dbo schema 的测试库表：

IF DB_ID(N'qa_hotfix_148224') IS NULL
BEGIN
    CREATE DATABASE [qa_hotfix_148224];
END
GO

USE [qa_hotfix_148224];
GO

IF OBJECT_ID(N'[dbo].[user_info]', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[user_info];
END
GO

CREATE TABLE [dbo].[user_info] (
    [id] INT NOT NULL PRIMARY KEY,
    [user_name] NVARCHAR(64) NOT NULL,
    [gmt_modified] DATETIME NOT NULL DEFAULT GETDATE()
);
GO

INSERT INTO [dbo].[user_info] ([id], [user_name]) VALUES (1, N'hotfix_user');
GO

- 资产平台中已引入 SQL Server 数据源 `qa_hotfix_sqlserver_148224`；若不存在，进入【元数据资产 > 数据源管理】(`/dataSourceManage`) 点击【引入数据源】补充引入。
- 确保该数据源可以读取数据库 `qa_hotfix_148224`。

3、账号要求：
- 使用元数据资产管理员账号登录。

4、代码变更说明（供验证参考）：
- `dt-center-metadata/service/src/main/java/com/dtstack/metadata/service/sync/SyncTaskService.java` 中的 `deleteDbTable()` 会在同步结束后处理已删除的库表。
- 修复前，SQL Server 返回的表名可能是 `[dbo].[user_info]`，而资产侧保存的是 `user_info`，清理逻辑会误判源端不存在该表并删除资产平台中的表元数据。
- 修复后，会先将 `[schema].[table]` 形式的表名归一化后再比对，因此周期同步成功后不应再误删数据库 `qa_hotfix_148224` 下的表元数据，数据库页也不应再出现 `Error querying database`。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 使用管理员账号登录元数据资产，进入【元数据资产 > 元数据同步】页面，确认当前路由为 `/metaDataSync`，默认停留在【周期同步】页签 | 页面正常加载，页签显示“周期同步 / 实时同步 / 自动同步”，列表可见“数据源、数据库、数据表、最近一次实例状态”等字段 |
| 2 | 点击右上角【新增周期同步任务】 | 打开“新增周期同步任务”弹窗，步骤条显示“同步内容、调度配置” |
| 3 | 在“同步内容”步骤中选择数据源 `qa_hotfix_sqlserver_148224(SQLServer)`，在“元数据同步内容”中保持【全部内容】 | 数据源选择成功，页面展示“选择数据”区域，可继续配置数据库和数据表 |
| 4 | 在“选择数据”表格中新增一行，数据库选择 `qa_hotfix_148224`，数据表选择【全部】，然后点击【下一步】 | 成功进入“调度配置”步骤；表格中保存的同步范围为“数据库 `qa_hotfix_148224` + 全部数据表”，不会被重置为空 |
| 5 | 在“调度配置”步骤中将“最大连接数”保留为 `20`，设置一个有效的日调度时间后，点击【新增并立即执行】 | 页面提示“新增周期同步任务成功”，任务返回周期同步列表；新任务出现在 `/metaDataSync` 列表中 |
| 6 | 在新建任务所在行点击【查看实例】，进入 `/syncInstance` 页面查看最近一次实例执行结果 | 最近一次实例状态显示为“成功”；实例列表不出现失败状态，操作列不出现【查看日志】入口 |
| 7 | 返回【元数据资产 > 元数据管理】页面，进入路由 `/manageTables`，搜索并点击数据源 `qa_hotfix_sqlserver_148224` | 成功进入数据库管理页 `/manageTables/databaseMetaManage`，面包屑显示“数据源名称 > 数据库” |
| 8 | 在数据库管理页搜索数据库 `qa_hotfix_148224` | 页面正常返回数据库列表，数据库 `qa_hotfix_148224` 可见，页面不出现 `Error querying database` 报错提示 |
| 9 | 点击数据库 `qa_hotfix_148224` 进入数据表管理页 `/manageTables/tableMetaManage` | 页面正常加载，能看到表 `user_info`，表数量大于 0，未发生库存在但表被误删的情况 |
| 10 | 点击表 `user_info` 进入元数据详情页，查看表结构或基础信息 | 表详情可以正常打开，`id`、`user_name`、`gmt_modified` 字段可见，说明同步后的库表元数据被正确保留 |
