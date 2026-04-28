---
suite_name: "多表唯一性校验支持明细数据中统计重复数"
description: "多表唯一性校验支持明细数据中统计重复数用例归档"
tags:
  - "重复数"
  - "明细数据"
  - "统计正确"
  - "单个字段"
  - "多表唯一性"
  - "多字段联合查询"
  - "多表唯一性校验支持明细数据中统计重复数"
prd_version: "v6.4.5"
dev_version:
  - "袋鼠云"
create_at: "2026-04-05"
status: "草稿"
origin: "csv"
case_count: 2
case_id: 9698
---

##### 【P0】验证「多表唯一性」明细数据-多字段联合查询「重复数」统计正确

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
2. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS my_table_sink (
id int,
age string,
name string,
score string,
sex string
)USING paimon
tblproperties (
'primary-key' = 'id'
);
INSERT INTO table1 VALUES
(1, '11','林大','100','男'),
(2, '12','王二','99','男');
(3, '13','张三','99','男');
(4, '14','李四','100','女');
SELECT * FROM table1;
drop table if exists table2;
create table if not EXISTS my_table_sink (
id int,
age string,
name string,
score string,
sex string
)USING paimon
tblproperties (
'primary-key' = 'id'
);
INSERT INTO table2 VALUES
(1, '11','林大','100','男'),
(2, '12','王二','99','男');
(3, '13','张三','99','男');
(4, '14','李四','100','女');
SELECT * FROM table2;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」「选择数据源」选择「${DATASOURCE}」「选择数据库」选择「${DATABASE}」「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 「监控规则」新增「唯一性校验」「字段」选择「id」「sex」「统计函数」选择「多表唯一性校验」「过滤条件」设置为「id<100」「校验字段逻辑」选择「唯一」「和其他表的校验关系」选择为「且」「对比表」选择「table2」-「sex」「score」字段「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 4 | 配置「调度属性」，保存规则 | 规则保存成功 |
| 5 | 临时运行规则 | 规则校验失败 |
| 6 | 进入「任务实例查询」页面，查看任务实例详情-明细数据 | 明细数据内新增字段重复数统计字段 |
| 7 | 校验字段统计数量数值正确 | table1-id,sex重复值为0，table2-sex,score重复值为2 |

##### 【P0】验证「多表唯一性」明细数据-单个字段「重复数」统计正确

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
2. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS my_table_sink (
id int,
age string,
name string,
score string,
sex string
)USING paimon
tblproperties (
'primary-key' = 'id'
);
INSERT INTO table1 VALUES
(1, '11','林大','100','男'),
(2, '12','王二','99','男');
(3, '13','张三','99','男');
(4, '14','李四','100','女');
SELECT * FROM table1;
drop table if exists table2;
create table if not EXISTS my_table_sink (
id int,
age string,
name string,
score string,
sex string
)USING paimon
tblproperties (
'primary-key' = 'id'
);
INSERT INTO table2 VALUES
(1, '11','林大','100','男'),
(2, '12','王二','99','男');
(3, '13','张三','99','男');
(4, '14','李四','100','女');
SELECT * FROM table2;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」「选择数据源」选择「${DATASOURCE}」「选择数据库」选择「${DATABASE}」「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 「监控规则」新增「唯一性校验」「字段」选择「sex」「统计函数」选择「多表唯一性校验」「过滤条件」设置为「id<100」「校验字段逻辑」选择「唯一」「和其他表的校验关系」选择为「且」「对比表」选择「table2」-「score」字段「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 4 | 配置「调度属性」，保存规则 | 规则保存成功 |
| 5 | 临时运行规则 | 规则校验失败 |
| 6 | 进入「任务实例查询」页面，查看任务实例详情-明细数据 | 明细数据内新增字段重复数统计字段 |
| 7 | 校验字段统计数量数值正确 | table1-sex重复值为3，table2-score重复值为2 |
