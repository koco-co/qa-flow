---
suite_name: "在线问题转化"
description: "验证底层库为 DmMySQL 时，元数据同步周期同步任务列表正常加载，不出现 SQL 语法错误"
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

## 元数据

### 元数据同步

##### 【141713】验证底层库为 DmMySQL 时元数据同步周期同步任务列表正常加载

> 前置条件
```
1、环境说明：dt-center-metadata 已部署 hotfix_6.3.x_141713 版本，底层数据库（metadata 存储库）为 DmMySQL

2、DmMySQL SQL语句准备（dt_metadata schema）:
-- 插入测试数据源记录
INSERT INTO dt_metadata.metadata_data_source_center
  (tenant_id, data_source_name, data_source_type, link_status, sync_status, is_deleted)
VALUES
  (1, 'qa_mysql_source', 1, 1, 1, 0);

-- 插入测试周期同步任务（关联上方数据源）
INSERT INTO dt_metadata.metadata_sync_task
  (data_source_id, schedule_conf, period_type, task_type, tenant_id, is_deleted)
SELECT id,
       '{"periodType":2,"beginDate":"2026-04-02","endDate":"2026-12-31","hour":2,"minute":0}',
       2, 1, 1, 0
FROM dt_metadata.metadata_data_source_center
WHERE data_source_name = 'qa_mysql_source'
  AND is_deleted = 0
LIMIT 1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【元数据 → 元数据同步】页面，点击【周期同步】Tab | 修复前：底层 DmMySQL 执行 `pageTask` 查询时报 SQL 语法错误（`dataSource.data_source_name` 后缺少逗号），任务列表加载失败，页面显示空数据或报错<br>修复后：周期同步任务列表正常加载，前置条件中准备的 `qa_mysql_source` 任务记录完整展示，数据源名称、同步状态、最近同步时间字段均正常显示，无报错弹窗 |
