---
suite_name: "血缘统计问题解决"
description: "血缘统计问题解决用例归档"
tags:
  - "正确"
  - "血缘统计问题解决"
  - "血缘数量统计是否"
prd_version: "v6.3.4"
dev_version:
  - "袋鼠云"
create_at: "2026-04-05"
status: "草稿"
origin: "csv"
case_count: 1
case_id: 8803
---

##### 【P0】验证血缘数量统计是否正确

> 前置条件

```
在项目bug_test_0509下，创建
create table  if not exists source(id int,name varchar(255));
-- 第一层：主表
CREATE TABLE result AS SELECT * FROM source;

-- 第二层：6张直接下游表（直接依赖主表）
CREATE TABLE  son_1 AS SELECT * FROM  result;
CREATE TABLE  son_2 AS SELECT * FROM  result;
CREATE TABLE  son_3 AS SELECT * FROM  result;
CREATE TABLE  son_4 AS SELECT * FROM  result;
CREATE TABLE  son_5 AS SELECT * FROM  result;
CREATE TABLE  son_6 AS SELECT * FROM  result;


-- 第三层：为每张第二层表创建0-2张下游表

CREATE TABLE  son_1_1 AS SELECT * FROM  son_1 ;
CREATE TABLE  son_1_2 AS SELECT * FROM  son_1 ;
CREATE TABLE  son_2_1 AS SELECT * FROM  son_2 ;
CREATE TABLE  son_4_1 AS SELECT * FROM  son_4 ;
CREATE TABLE  son_4_2 AS SELECT * FROM  son_4 ;
CREATE TABLE  son_5_1 AS SELECT * FROM  son_5 ;



在同租户项目bb_4_8下创建：
CREATE TABLE  son_1 AS SELECT * FROM  bug_test_0509.result;
CREATE TABLE  son_2 AS SELECT * FROM  bug_test_0509.result;
CREATE TABLE  son_3 AS SELECT * FROM  bug_test_0509.result;
CREATE TABLE  son_4 AS SELECT * FROM  bug_test_0509.result;
CREATE TABLE  son_5 AS SELECT * FROM  bug_test_0509.result;
CREATE TABLE  son_6 AS SELECT * FROM  bug_test_0509.result;


CREATE TABLE  son_1_1 AS SELECT * FROM  bug_test_0509.son_1;
CREATE TABLE  son_1_2 AS SELECT * FROM  bug_test_0509.son_1;
CREATE TABLE  son_2_1 AS SELECT * FROM  bug_test_0509.son_2 ;
CREATE TABLE  son_4_1 AS SELECT * FROM  bug_test_0509.son_4 ;
CREATE TABLE  son_4_2 AS SELECT * FROM  bug_test_0509.son_4 ;
CREATE TABLE  son_5_1 AS SELECT * FROM  bug_test_0509.son_5 ;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 在离线执行血缘sql，保存提交任务，进入数据地图查看血缘展示和数量统计 | 展示正确，统计正确 |
| 2 | 将相关表同步到数据资产，查看血缘展示 | 血缘正确 |
