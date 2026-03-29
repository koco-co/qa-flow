---
name: 【Gate交付】任务依赖配错提示 v6.3.7
description: 【Gate交付】任务依赖配错提示 v6.3.7
tags:
  - 离线开发
  - 离线开发-数据开发-任务依赖
  - Gate交付
  - 任务依赖配错提示
module: batch-works
version: v6.3.7
source: zentao-cases/dtstack-platform/离线开发/archive-cases/v6.3.7/【Gate交付】任务依赖配错提示.csv
case_count: 69
created_at: 2026-03-29
origin: csv
---
# 【Gate交付】任务依赖配错提示 v6.3.7
> 来源：zentao-cases/dtstack-platform/离线开发/archive-cases/v6.3.7/【Gate交付】任务依赖配错提示.csv
> 用例数：69

---

## 离线开发-数据开发-任务依赖

##### 验证【任务依赖配置有误】页面显示正确 「P1」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql_A数据源；
b）数据源B：hive_A数据源（非meta数据源，但与hive_meta数据源为同一个hive源）；
c）数据源C：hive_B数据源（非meta数据源，但与hive_meta数据源不是同一个hive源）；
2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源A下schema_A.table_B；
b）数据同步任务G：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务A1，源表：数据源A下schema_A.table_B，目标表：数据源A下schema_A.table_C，其余内容均正常填写，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 2 | 查看【任务依赖配置有误】弹窗 | 1）title：任务依赖配置有误 |
| 3 | 点击【任务依赖配置有误】页面的“确定”按钮后，进入数据同步任务A1的【调度属性-任务间依赖】添加依赖任务：项目A下的数据同步任务G，保存后点击“提交” | 2）展示字段依次为：任务、租户、项目 |
| 4 | 点击【任务依赖配置有误】页面的“确定”按钮后，进入数据同步任务A1的【调度属性-任务间依赖】添加依赖任务：项目A下的数据同步任务A，项目B下的数据同步任务A，保存后点击“提交” | 3）“任务”右侧展示问号icon，hover展示：“当前任务配置存在缺失或者多余的上游依赖任务” |
| 5 | 点击【任务依赖配置有误】页面的“确定”按钮后，进入数据同步任务A1的【调度属性-任务间依赖】移除依赖任务：项目A下的数据同步任务G，保存后点击“提交” | 4）“确定、仍要提交”按钮 |
| 6 |  | 展示任务如下： |
| 7 |  | 1）项目A下的数据同步任务A的任务名称右侧展示“缺失” |
| 8 |  | 2）项目B下的数据同步任务A的任务名称右侧展示“缺失” |
| 9 |  | 展示任务如下（类型上下排序关系为缺失-多余）： |
| 10 |  | 1）项目A下的数据同步任务A的任务名称右侧展示“缺失” |
| 11 |  | 2）项目B下的数据同步任务A的任务名称右侧展示“缺失” |
| 12 |  | 3）项目A下的数据同步任务G的任务名称右侧展示“多余” |
| 13 |  | 展示任务如下： |
| 14 |  | 1）项目A下的数据同步任务G的任务名称右侧展示“多余” |
| 15 |  | 不进入【任务依赖配置有误】弹窗，直接提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |

##### 验证数据同步任务间任务依赖功能正常_mysql2other 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql_A数据源；
b）数据源B：hive_A数据源（非meta数据源，但与hive_meta数据源为同一个hive源）；
c）数据源C：hive_B数据源（非meta数据源，但与hive_meta数据源不是同一个hive源）；

2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源A下schema_A.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源A下schema_B.table_A；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源A下schema_B.table_B；
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务A1，源表：数据源A下schema_A.table_B，目标表：数据源A下schema_A.table_C，其余内容均正常填写，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 2 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务B1，源表：数据源A下schema_B.table_A，目标表：数据源A下schema_A.table_C，其余内容均正常填写，保存并提交 | 1）展示缺失上游依赖任务如下： |
| 3 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务C1，源表：数据源A下schema_B.table_B，目标表：数据源A下schema_A.table_C，其余内容均正常填写，保存并提交 | a）租户A，项目A下的数据同步任务A |
| 4 |  | b）租户A，项目B下的数据同步任务A |
| 5 |  | 2）点击“确定”：回到任务编辑页面 |
| 6 |  | 3）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 7 |  | 进入【任务依赖配置有误】弹窗： |
| 8 |  | 1）展示缺失上游依赖任务如下： |
| 9 |  | a）租户A，项目A下的数据同步任务B |
| 10 |  | b）租户A，项目B下的数据同步任务B |
| 11 |  | 2）点击“确定”：回到任务编辑页面 |
| 12 |  | 3）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 13 |  | 进入【任务依赖配置有误】弹窗： |
| 14 |  | 1）展示缺失上游依赖任务如下： |
| 15 |  | a）租户A，项目A下的数据同步任务C |
| 16 |  | b）租户A，项目B下的数据同步任务C |
| 17 |  | 2）点击“确定”：回到任务编辑页面 |
| 18 |  | 3）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证数据同步任务间任务依赖功能正常_hive2other 「P1」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql_A数据源；
b）数据源B：hive_A数据源（非meta数据源，但与hive_meta数据源为同一个hive源）；
c）数据源C：hive_B数据源（非meta数据源，但与hive_meta数据源不是同一个hive源）；
2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务D：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_A.table_A；
b）数据同步任务E：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_A.table_B；
c）数据同步任务F：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_A；
d）数据同步任务G：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
e）数据同步任务H：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_A；
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务D1，源表：数据源B下schema_A.table_A，目标表：数据源A下schema_A.table_C，其余内容均正常填写，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 2 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务E1，源表：数据源B下schema_A.table_B，目标表：数据源A下schema_A.table_C，其余内容均正常填写，保存并提交 | 1）展示缺失上游依赖任务如下： |
| 3 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务F1，源表：数据源B下schema_B.table_A，目标表：数据源A下schema_A.table_C，其余内容均正常填写，保存并提交 | a）租户A，项目A下的数据同步任务D |
| 4 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务G1，源表：数据源B下schema_B.table_B，目标表：数据源A下schema_A.table_C，其余内容均正常填写，保存并提交 | b）租户A，项目B下的数据同步任务D |
| 5 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务H1，源表：数据源C下schema_A.table_B，目标表：数据源A下schema_A.table_C，其余内容均正常填写，保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 6 |  | 进入【任务依赖配置有误】弹窗： |
| 7 |  | 1）展示缺失上游依赖任务如下： |
| 8 |  | a）租户A，项目A下的数据同步任务E |
| 9 |  | b）租户A，项目B下的数据同步任务E |
| 10 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 11 |  | 进入【任务依赖配置有误】弹窗： |
| 12 |  | 1）展示缺失上游依赖任务如下： |
| 13 |  | a）租户A，项目A下的数据同步任务F |
| 14 |  | b）租户A，项目B下的数据同步任务F |
| 15 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 16 |  | 进入【任务依赖配置有误】弹窗： |
| 17 |  | 1）展示缺失上游依赖任务如下： |
| 18 |  | a）租户A，项目A下的数据同步任务G |
| 19 |  | b）租户A，项目B下的数据同步任务G |
| 20 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 21 |  | 没有【任务依赖配置有误】弹窗，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |

##### 验证hivesql任务与数据同步间任务依赖功能正常_数据同步任务 「P1」

> 前置条件
```
1）数据源信息：
a）数据源A：hive_A数据源（meta数据源）；
b）数据源B：hive_B数据源（非meta数据源，与hive_meta数据源不是同一个hive源）；
c）数据源C：hive_B数据源（非meta数据源，与hive_meta数据源是是同一个hive源）；
2)hviesql任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）hivesql任务A：create table table_A;
b）hivesql任务B：create table schema_B.table_A;
c）hivesql任务C：create table table_B as select * from table_A;
d）hivesql任务D：insert into table_B select * from table_A;
e）hivesql任务E：insert overwrite table table_B select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;
3）建表&插数据脚本：
--hivesql建表&插数据
CREATE TABLE if not exists hivesql_test
(
id int,
name string,
age int
);
insert into hivesql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务A，源表：数据源A下schema_meta.table_A，其余内容均正常填写，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 2 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务B，源表：数据源A下schema_B.table_A，其余内容均正常填写，保存并提交 | 1）展示缺失上游依赖任务如下： |
| 3 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务C，源表：数据源A下table_B，其余内容均正常填写，保存并提交 | a）租户A，项目B下的hivesql任务A |
| 4 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务D，源表：数据源B下schema_B.table_A，其余内容均正常填写，保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 5 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务E，源表：数据源C下schema_B.table_A，其余内容均正常填写，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 6 |  | 1）展示缺失上游依赖任务如下： |
| 7 |  | a）租户A，项目A下的hivesql任务B |
| 8 |  | B）租户A，项目B下的hivesql任务B |
| 9 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 10 |  | 进入【任务依赖配置有误】弹窗： |
| 11 |  | 1）展示缺失上游依赖任务如下： |
| 12 |  | a）租户A，项目B下的hivesql任务C、D、E |
| 13 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 14 |  | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 15 |  | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |

##### 验证mysql任务与数据同步间任务依赖功能正常_数据同步任务 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql_A数据源（meta数据源）；
b）数据源B：mysql_B数据源（非meta数据源，与mysql_meta数据源不是同一个mysql源）；
c）数据源B：mysql_B数据源（非meta数据源，与mysql_meta数据源是同一个mysql源）；
2)hviesql任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）mysqlsql任务A：create table table_A;
b）mysqlsql任务B：create table schema_B.table_A;
c）mysqlsql任务C：create table table_B as select * from table_A;
d）mysqlsql任务D：insert into table_B select * from table_A; 3）建表&插数据脚本：
--mysql建表&插数据
CREATE TABLE if not exists mysql_test
(
id int,
name varchar(256),
age int
);
insert into mysql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务A，源表：数据源A下schema_meta.table_A，其余内容均正常填写，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 2 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务B，源表：数据源A下schema_B.table_A，其余内容均正常填写，保存并提交 | 1）展示缺失上游依赖任务如下： |
| 3 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务C，源表：数据源A下table_B，其余内容均正常填写，保存并提交 | a）租户A，项目B下的mysql任务A |
| 4 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务D，源表：数据源B下schema_B.table_A，其余内容均正常填写，保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 5 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务E，源表：数据源C下schema_B.table_A，其余内容均正常填写，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 6 |  | 1）展示缺失上游依赖任务如下： |
| 7 |  | a）租户A，项目A下的mysql任务B |
| 8 |  | B）租户A，项目B下的mysql任务B |
| 9 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 10 |  | 进入【任务依赖配置有误】弹窗： |
| 11 |  | 1）展示缺失上游依赖任务如下： |
| 12 |  | a）租户A，项目B下的mysql任务C、D |
| 13 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 14 |  | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 15 |  | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |

##### 验证dorissql任务与数据同步间任务依赖功能正常_数据同步任务 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：doris_A数据源（meta数据源）；
b）数据源B：doris_B数据源（非meta数据源，与doris_meta数据源不是同一个doris源）；
c）数据源B：doris_B数据源（非meta数据源，与doris_meta数据源是同一个doris源）；
2)hviesql任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）dorissql任务A：create table table_A;
b）dorissql任务B：create table schema_B.table_A;
c）dorissql任务C：create table table_B as select * from table_A;
d）dorissql任务D：insert into table_B select * from table_A;
e）dorissql任务E：insert overwrite table table_B select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;
3）建表&插数据脚本：
--dorissql建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务A，源表：数据源A下schema_meta.table_A，其余内容均正常填写，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 2 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务B，源表：数据源A下schema_B.table_A，其余内容均正常填写，保存并提交 | 1）展示缺失上游依赖任务如下： |
| 3 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务D，源表：数据源B下schema_B.table_A，其余内容均正常填写，保存并提交 | a）租户A，项目B下的dorissql任务A |
| 4 | 进入租户A下项目B的【数据开发-周期任务】页面，新建数据同步任务E，源表：数据源A下schema_B.table_A，其余内容均正常填写，保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 5 |  | 进入【任务依赖配置有误】弹窗： |
| 6 |  | 1）展示缺失上游依赖任务如下： |
| 7 |  | a）租户A，项目A下的dorissql任务B |
| 8 |  | B）租户A，项目B下的dorissql任务B |
| 9 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 10 |  | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 11 |  | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |

##### 验证hivesql任务间任务依赖功能正常_hivesql初始化方式创建_自动依赖 「P2」

> 前置条件
```
1）项目A、项目B的hadoop引擎的初始化方式均为创建
2）hivesql任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）hivesql任务A：create table table_A;
b）hivesql任务B：create table schema_B.table_B_1;
c）hivesql任务C：create table table_B_2 as select * from table_A;
d）hivesql任务D：insert into table_B_1 select * from table_A;
e）hivesql任务E：insert overwrite table table_B_2 select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;

3）建表&插数据脚本：
--hive建表&插数据
CREATE TABLE if not exists hivesql_test
(
id int,
name string,
age int
);
insert into hivesql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建hivesql任务A1，脚本如下：select * from table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下： |
| 2 | 修改脚本如下：select * from table_B_1;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的hivesql任务A |
| 3 | 修改脚本如下：select * from table_B_2;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 4 | 修改脚本如下：select * from schema_B.table_B_2;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的hivesql任务D |
| 6 | 修改脚本如下：create table table_C_1 like table_A;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的hivesql任务C、E |
| 9 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 10 | 修改脚本如下：select * from table_A;select * from table_B_1;select * from table_B_2;select * from schema_B.table_B_2;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下：空 |
| 11 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 12 |  | 1）自动依赖任务如下： |
| 13 |  | a）租户A，项目B下的hivesql任务A、B |
| 14 |  | b）租户A，项目A下的hivesql任务B |
| 15 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 16 |  | 1）自动依赖任务如下： |
| 17 |  | a）租户A，项目B下的hivesql任务A |
| 18 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 19 |  | 1）自动依赖任务如下： |
| 20 |  | a）租户A，项目B下的hivesql任务A |
| 21 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 22 |  | 1）自动依赖任务如下： |
| 23 |  | a）租户A，项目B下的hivesql任务A、B |
| 24 |  | b）租户A，项目A下的hivesql任务B |
| 25 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 26 |  | 1）自动依赖任务如下： |
| 27 |  | a）租户A，项目B下的hivesql任务A |
| 28 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 29 |  | 1）自动依赖任务如下： |
| 30 |  | a）租户A，项目B下的hivesql任务A、B、C、D、E |
| 31 |  | b）租户A，项目A下的hivesql任务B |
| 32 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |

##### 验证hivesql任务间任务依赖功能正常_hivesql初始化方式创建_手动依赖_手动添加 「P2」

> 前置条件
```
1）项目A、项目B的hadoop引擎的初始化方式均为创建
2）hivesql任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）hivesql任务A：create table table_A;
b）hivesql任务B：create table schema_B.table_B_1;
c）hivesql任务C：create table table_B_2 as select * from table_A;
d）hivesql任务D：insert into table_B_1 select * from table_A;
e）hivesql任务E：insert overwrite table table_B_2 select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;

3）建表&插数据脚本：
--hive建表&插数据
CREATE TABLE if not exists hivesql_test
(
id int,
name string,
age int
);
insert into hivesql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建hivesql任务A1，脚本如下：select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 2 | 修改脚本如下：select * from table_B_1;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 3 | 修改脚本如下：select * from table_B_2;保存并提交 | a）租户A，项目B下的hivesql任务A |
| 4 | 修改脚本如下：select * from schema_B.table_B_2;保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 6 | 修改脚本如下：create table table_C_1 like table_A;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;保存并提交 | a）租户A，项目B下的hivesql任务D |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 9 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 10 | 修改脚本如下：select * from table_A;select * from table_B_1;select * from table_B_2;select * from schema_B.table_B_2;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 11 |  | a）租户A，项目B下的hivesql任务C、E |
| 12 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 13 |  | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 14 |  | 进入【任务依赖配置有误】弹窗： |
| 15 |  | 1）展示缺失上游依赖任务如下： |
| 16 |  | a）租户A，项目B下的hivesql任务A、B |
| 17 |  | b）租户A，项目A下的hivesql任务B |
| 18 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 19 |  | 进入【任务依赖配置有误】弹窗： |
| 20 |  | 1）展示缺失上游依赖任务如下： |
| 21 |  | a）租户A，项目B下的hivesql任务A |
| 22 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 23 |  | 进入【任务依赖配置有误】弹窗： |
| 24 |  | 1）展示缺失上游依赖任务如下： |
| 25 |  | a）租户A，项目B下的hivesql任务A |
| 26 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 27 |  | 进入【任务依赖配置有误】弹窗： |
| 28 |  | 1）展示缺失上游依赖任务如下： |
| 29 |  | a）租户A，项目B下的hivesql任务A、B |
| 30 |  | b）租户A，项目A下的hivesql任务B |
| 31 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 32 |  | 进入【任务依赖配置有误】弹窗： |
| 33 |  | 1）展示缺失上游依赖任务如下： |
| 34 |  | a）租户A，项目B下的hivesql任务A |
| 35 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 36 |  | 进入【任务依赖配置有误】弹窗： |
| 37 |  | 1）展示缺失上游依赖任务如下： |
| 38 |  | a）租户A，项目B下的hivesql任务A、B、C、D、E |
| 39 |  | b）租户A，项目A下的hivesql任务B |
| 40 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证hivesql任务间任务依赖功能正常_hivesql初始化方式创建_手动依赖_依赖推荐 「P2」

> 前置条件
```
1）项目A、项目B的hadoop引擎的初始化方式均为创建
2）hivesql任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）hivesql任务A：create table table_A;
b）hivesql任务B：create table schema_B.table_B_1;
c）hivesql任务C：create table table_B_2 as select * from table_A;
d）hivesql任务D：insert into table_B_1 select * from table_A;
e）hivesql任务E：insert overwrite table table_B_2 select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;

3）建表&插数据脚本：
--hive建表&插数据
CREATE TABLE if not exists hivesql_test
(
id int,
name string,
age int
);
insert into hivesql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建hivesql任务A1，脚本如下：select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 2 | 修改脚本如下：select * from table_B_1;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的hivesql任务A |
| 3 | 修改脚本如下：select * from table_B_2;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 4 | 修改脚本如下：select * from schema_B.table_B_2;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）展示缺失上游依赖任务如下： |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | i）租户A，项目B下的hivesql任务A |
| 6 | 修改脚本如下：create table table_C_1 like table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的hivesql任务D |
| 9 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 10 | 修改脚本如下：select * from table_A;select * from table_B_1;select * from table_B_2;select * from schema_B.table_B_2;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）展示缺失上游依赖任务如下： |
| 11 |  | i）租户A，项目B下的hivesql任务D |
| 12 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 13 |  | 1）依赖推荐任务如下： |
| 14 |  | a）租户A，项目B下的hivesql任务C、E |
| 15 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 16 |  | a）展示缺失上游依赖任务如下： |
| 17 |  | i）租户A，项目B下的hivesql任务C、E |
| 18 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 19 |  | 1）依赖推荐任务如下：空 |
| 20 |  | 2）未添加推荐依赖，保存并提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 21 |  | 1）依赖推荐任务如下： |
| 22 |  | a）租户A，项目B下的hivesql任务A、B |
| 23 |  | b）租户A，项目A下的hivesql任务B |
| 24 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 25 |  | a）展示缺失上游依赖任务如下： |
| 26 |  | i）租户A，项目B下的hivesql任务A、B |
| 27 |  | ii）租户A，项目A下的hivesql任务B |
| 28 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 29 |  | 1）依赖推荐任务如下： |
| 30 |  | a）租户A，项目B下的hivesql任务A |
| 31 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 32 |  | a）展示缺失上游依赖任务如下： |
| 33 |  | i）租户A，项目B下的hivesql任务A |
| 34 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 35 |  | 1）依赖推荐任务如下： |
| 36 |  | a）租户A，项目B下的hivesql任务A |
| 37 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 38 |  | a）展示缺失上游依赖任务如下： |
| 39 |  | i）租户A，项目B下的hivesql任务A |
| 40 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 41 |  | 1）依赖推荐任务如下： |
| 42 |  | a）租户A，项目B下的hivesql任务A、B |
| 43 |  | b）租户A，项目A下的hivesql任务B |
| 44 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 45 |  | a）展示缺失上游依赖任务如下： |
| 46 |  | i）租户A，项目B下的hivesql任务A、B |
| 47 |  | ii）租户A，项目A下的hivesql任务B |
| 48 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 49 |  | 1）依赖推荐任务如下： |
| 50 |  | a）租户A，项目B下的hivesql任务A |
| 51 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 52 |  | a）展示缺失上游依赖任务如下： |
| 53 |  | i）租户A，项目B下的hivesql任务A |
| 54 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 55 |  | 1）依赖推荐任务如下： |
| 56 |  | a）租户A，项目B下的hivesql任务A、B、C、D、E |
| 57 |  | b）租户A，项目A下的hivesql任务B |
| 58 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 59 |  | a）展示缺失上游依赖任务如下： |
| 60 |  | i）租户A，项目B下的hivesql任务A、B、C、D、E |
| 61 |  | ii）租户A，项目A下的hivesql任务B |
| 62 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证hivesql任务间任务依赖功能正常_hivesql初始化方式不创建且不对接schema_自动依赖 「P2」

> 前置条件
```
1）项目A、项目B的hadoop引擎的初始化方式均为不创建且不对接schema
2）hivesql任务（租户A下，在项目A、项目B均配置以下任务且已提交，所选schema均为schema_C）：
a）hivesql任务A：create table table_A;
b）hivesql任务B：create table schema_B.table_B_1;
c）hivesql任务C：create table schema_B.table_B_2 as select * from table_A;
d）hivesql任务D：insert into schema_B.table_B_1 select * from table_A;
e）hivesql任务E：insert overwrite table schema_B.table_B_2 select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;

3）建表&插数据脚本：
--hive建表&插数据
CREATE TABLE if not exists hivesql_test
(
id int,
name string,
age int
);
insert into hivesql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建hivesql任务A1，选择schema_C，脚本如下：select * from schema_B.table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下：空 |
| 2 | 修改脚本如下：select * from schema_B.table_B_1;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 修改脚本如下：select * from schema_B.table_B_2;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下： |
| 4 | 修改脚本如下：select * from table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | a）租户A，项目A下的hivesql任务B、D |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;【调度属性-任务间依赖】选择“自动依赖”，刷新 | b）租户A，项目B下的hivesql任务B、D |
| 6 | 修改脚本如下：create table table_C_1 like table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下： |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | a）租户A，项目A下的hivesql任务C、E |
| 9 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“自动依赖”，刷新 | b）租户A，项目B下的hivesql任务C、E |
| 10 | 修改脚本如下：select * from schema_B.table_A;select * from schema_B.table_B_1;select * from schema_B.table_B_2;select * from table_A;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 11 |  | 1）自动依赖任务如下： |
| 12 |  | a）租户A，项目A下的hivesql任务A |
| 13 |  | b）租户A，项目B下的hivesql任务A |
| 14 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 15 |  | 1）自动依赖任务如下： |
| 16 |  | a）租户A，项目A下的hivesql任务A、B、C、D、E |
| 17 |  | b）租户A，项目B下的hivesql任务A、B、C、D、E |
| 18 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 19 |  | 1）自动依赖任务如下： |
| 20 |  | a）租户A，项目A下的hivesql任务A |
| 21 |  | b）租户A，项目B下的hivesql任务A |
| 22 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 23 |  | 1）自动依赖任务如下： |
| 24 |  | a）租户A，项目A下的hivesql任务A |
| 25 |  | b）租户A，项目B下的hivesql任务A |
| 26 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 27 |  | 1）自动依赖任务如下： |
| 28 |  | a）租户A，项目A下的hivesql任务A、B、D |
| 29 |  | b）租户A，项目B下的hivesql任务A、B、D |
| 30 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 31 |  | 1）自动依赖任务如下： |
| 32 |  | a）租户A，项目A下的hivesql任务A |
| 33 |  | b）租户A，项目B下的hivesql任务A |
| 34 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 35 |  | 1）自动依赖任务如下： |
| 36 |  | a）租户A，项目A下的hivesql任务A、B、C、D、E |
| 37 |  | b）租户A，项目B下的hivesql任务A、B、C、D、E |
| 38 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |

##### 验证hivesql任务间任务依赖功能正常_hivesql初始化方式不创建且不对接schema_手动依赖_手动添加 「P2」

> 前置条件
```
1）项目A、项目B的hadoop引擎的初始化方式均为不创建且不对接schema
2）hivesql任务（租户A下，在项目A、项目B均配置以下任务且已提交，所选schema均为schema_C）：
a）hivesql任务A：create table table_A;
b）hivesql任务B：create table schema_B.table_B_1;
c）hivesql任务C：create table schema_B.table_B_2 as select * from table_A;
d）hivesql任务D：insert into schema_B.table_B_1 select * from table_A;
e）hivesql任务E：insert overwrite table schema_B.table_B_2 select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;

3）建表&插数据脚本：
--hive建表&插数据
CREATE TABLE if not exists hivesql_test
(
id int,
name string,
age int
);
insert into hivesql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建hivesql任务A1，选择schema_C，脚本如下：select * from schema_B.table_A;【调度属性-任务间依赖】选择“手动依赖”，保存并提交 | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 2 | 修改脚本如下：select * from schema_B.table_B_1;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 3 | 修改脚本如下：select * from schema_B.table_B_2;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 4 | 修改脚本如下：select * from table_A;保存并提交 | a）租户A，项目A下的hivesql任务B、D |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;保存并提交 | b）租户A，项目B下的hivesql任务B、D |
| 6 | 修改脚本如下：create table table_C_1 like table_A;保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 9 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;保存并提交 | a）租户A，项目A下的hivesql任务C、E |
| 10 | 修改脚本如下：select * from schema_B.table_A;select * from schema_B.table_B_1;select * from schema_B.table_B_2;select * from table_A;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;保存并提交 | b）租户A，项目B下的hivesql任务C、E |
| 11 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 12 |  | 进入【任务依赖配置有误】弹窗： |
| 13 |  | 1）展示缺失上游依赖任务如下： |
| 14 |  | a）租户A，项目A下的hivesql任务A |
| 15 |  | b）租户A，项目B下的hivesql任务A |
| 16 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 17 |  | 进入【任务依赖配置有误】弹窗： |
| 18 |  | 1）展示缺失上游依赖任务如下： |
| 19 |  | a）租户A，项目A下的hivesql任务A、B、C、D、E |
| 20 |  | b）租户A，项目B下的hivesql任务A、B、C、D、E |
| 21 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 22 |  | 进入【任务依赖配置有误】弹窗： |
| 23 |  | 1）展示缺失上游依赖任务如下： |
| 24 |  | a）租户A，项目A下的hivesql任务A |
| 25 |  | b）租户A，项目B下的hivesql任务A |
| 26 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 27 |  | 进入【任务依赖配置有误】弹窗： |
| 28 |  | 1）展示缺失上游依赖任务如下： |
| 29 |  | a）租户A，项目A下的hivesql任务A |
| 30 |  | b）租户A，项目B下的hivesql任务A |
| 31 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 32 |  | 进入【任务依赖配置有误】弹窗： |
| 33 |  | 1）展示缺失上游依赖任务如下： |
| 34 |  | a）租户A，项目A下的hivesql任务A、B、D |
| 35 |  | b）租户A，项目B下的hivesql任务A、B、D |
| 36 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 37 |  | 进入【任务依赖配置有误】弹窗： |
| 38 |  | 1）展示缺失上游依赖任务如下： |
| 39 |  | a）租户A，项目A下的hivesql任务A |
| 40 |  | b）租户A，项目B下的hivesql任务A |
| 41 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 42 |  | 进入【任务依赖配置有误】弹窗： |
| 43 |  | 1）展示缺失上游依赖任务如下： |
| 44 |  | a）租户A，项目A下的hivesql任务A、B、C、D、E |
| 45 |  | b）租户A，项目B下的hivesql任务A、B、C、D、E |
| 46 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证hivesql任务间任务依赖功能正常_hivesql初始化方式不创建且不对接schema_手动依赖_依赖推荐 「P2」

> 前置条件
```
1）项目A、项目B的hadoop引擎的初始化方式均为不创建且不对接schema
2）hivesql任务（租户A下，在项目A、项目B均配置以下任务且已提交，所选schema均为schema_C）：
a）hivesql任务A：create table table_A;
b）hivesql任务B：create table schema_B.table_B_1;
c）hivesql任务C：create table schema_B.table_B_2 as select * from table_A;
d）hivesql任务D：insert into schema_B.table_B_1 select * from table_A;
e）hivesql任务E：insert overwrite table schema_B.table_B_2 select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;

3）建表&插数据脚本：
--hive建表&插数据
CREATE TABLE if not exists hivesql_test
(
id int,
name string,
age int
);
insert into hivesql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建hivesql任务A1，选择schema_C，脚本如下：select * from schema_B.table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下：空 |
| 2 | 修改脚本如下：select * from schema_B.table_B_1;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 修改脚本如下：select * from schema_B.table_B_2;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 4 | 修改脚本如下：select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目A下的hivesql任务B、D |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | b）租户A，项目B下的hivesql任务B、D |
| 6 | 修改脚本如下：create table table_C_1 like table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）展示缺失上游依赖任务如下： |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | i）租户A，项目A下的hivesql任务B、D |
| 9 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | ii）租户A，项目B下的hivesql任务B、D |
| 10 | 修改脚本如下：select * from schema_B.table_A;select * from schema_B.table_B_1;select * from schema_B.table_B_2;select * from table_A;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 11 |  | 1）依赖推荐任务如下： |
| 12 |  | a）租户A，项目A下的hivesql任务C、E |
| 13 |  | b）租户A，项目B下的hivesql任务C、E |
| 14 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 15 |  | a）展示缺失上游依赖任务如下： |
| 16 |  | i）租户A，项目A下的hivesql任务C、E |
| 17 |  | ii）租户A，项目B下的hivesql任务C、E |
| 18 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 19 |  | 1）依赖推荐任务如下： |
| 20 |  | a）租户A，项目A下的hivesql任务A |
| 21 |  | b）租户A，项目B下的hivesql任务A |
| 22 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 23 |  | a）展示缺失上游依赖任务如下： |
| 24 |  | i）租户A，项目A下的hivesql任务A |
| 25 |  | ii）租户A，项目B下的hivesql任务A |
| 26 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 27 |  | 1）依赖推荐任务如下： |
| 28 |  | a）租户A，项目A下的hivesql任务A、B、C、D、E |
| 29 |  | b）租户A，项目B下的hivesql任务A、B、C、D、E |
| 30 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 31 |  | a）展示缺失上游依赖任务如下： |
| 32 |  | a）租户A，项目A下的hivesql任务A、B、C、D、E |
| 33 |  | b）租户A，项目B下的hivesql任务A、B、C、D、E |
| 34 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 35 |  | 1）依赖推荐任务如下： |
| 36 |  | a）租户A，项目A下的hivesql任务A |
| 37 |  | b）租户A，项目B下的hivesql任务A |
| 38 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 39 |  | a）展示缺失上游依赖任务如下： |
| 40 |  | i）租户A，项目A下的hivesql任务A |
| 41 |  | ii）租户A，项目B下的hivesql任务A |
| 42 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 43 |  | 1）依赖推荐任务如下： |
| 44 |  | a）租户A，项目A下的hivesql任务A |
| 45 |  | b）租户A，项目B下的hivesql任务A |
| 46 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 47 |  | a）展示缺失上游依赖任务如下： |
| 48 |  | i）租户A，项目A下的hivesql任务A |
| 49 |  | ii）租户A，项目B下的hivesql任务A |
| 50 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 51 |  | 1）依赖推荐任务如下： |
| 52 |  | a）租户A，项目A下的hivesql任务A、B、D |
| 53 |  | b）租户A，项目B下的hivesql任务A、B、D |
| 54 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 55 |  | a）展示缺失上游依赖任务如下： |
| 56 |  | i）租户A，项目A下的hivesql任务A、B、D |
| 57 |  | ii）租户A，项目B下的hivesql任务A、B、D |
| 58 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 59 |  | 1）依赖推荐任务如下： |
| 60 |  | a）租户A，项目A下的hivesql任务A |
| 61 |  | b）租户A，项目B下的hivesql任务A |
| 62 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 63 |  | a）展示缺失上游依赖任务如下： |
| 64 |  | i）租户A，项目A下的hivesql任务A |
| 65 |  | ii）租户A，项目B下的hivesql任务A |
| 66 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 67 |  | 1）依赖推荐任务如下： |
| 68 |  | a）租户A，项目A下的hivesql任务A、B、C、D、E |
| 69 |  | b）租户A，项目B下的hivesql任务A、B、C、D、E |
| 70 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 71 |  | a）展示缺失上游依赖任务如下： |
| 72 |  | i）租户A，项目A下的hivesql任务A、B、C、D、E |
| 73 |  | ii）租户A，项目B下的hivesql任务A、B、C、D、E |
| 74 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证hivesql任务与数据同步间任务依赖功能正常_hivesql初始化方式创建_自动依赖 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：hive_B数据源（meta数据源）
c）数据源C：hive_C数据源（非meta数据源，但与hive_meta数据源不是同一个hive源）

2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_meta.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；

3）建表&插数据脚本：
--hive建表&插数据
CREATE TABLE if not exists hivesql_test
(
id int,
name string,
age int
);
insert into hivesql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建hivesql任务A1，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下： |
| 2 | 修改脚本如下：select * from schema_B.table_B;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的数据同步任务A |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 4 | 修改脚本如下：create table table_C_1 like table_B;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的数据同步任务B |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;【调度属性-任务间依赖】的自动依赖，刷新 | b）租户A，项目A下的数据同步任务B |
| 7 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 8 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 9 |  | a）租户A，项目B下的数据同步任务A、B |
| 10 |  | b）租户A，项目A下的数据同步任务B |
| 11 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 12 |  | 1）自动依赖任务如下： |
| 13 |  | a）租户A，项目B下的数据同步任务A |
| 14 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 15 |  | 1）自动依赖任务如下： |
| 16 |  | a）租户A，项目B下的数据同步任务B |
| 17 |  | b）租户A，项目A下的数据同步任务B |
| 18 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 19 |  | 1）自动依赖任务如下： |
| 20 |  | a）租户A，项目B下的数据同步任务A、B |
| 21 |  | b）租户A，项目A下的数据同步任务B |
| 22 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 23 |  | 1）自动依赖任务如下： |
| 24 |  | a）租户A，项目B下的数据同步任务A、B |
| 25 |  | b）租户A，项目A下的数据同步任务B |
| 26 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 27 |  | 1）自动依赖任务如下： |
| 28 |  | a）租户A，项目B下的数据同步任务A、B |
| 29 |  | b）租户A，项目A下的数据同步任务B |
| 30 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |

##### 验证hivesql任务与数据同步间任务依赖功能正常_hivesql初始化方式创建_手动依赖_手动添加 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：hive_B数据源（meta数据源）
c）数据源C：hive_C数据源（非meta数据源，但与hive_meta数据源不是同一个hive源）

2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_meta.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；

3）建表&插数据脚本：
--hive建表&插数据
CREATE TABLE if not exists hivesql_test
(
id int,
name string,
age int
);
insert into hivesql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建hivesql任务A1，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 2 | 修改脚本如下：select * from schema_B.table_B;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;保存并提交 | a）租户A，项目B下的数据同步任务A |
| 4 | 修改脚本如下：create table table_C_1 like table_B;保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 7 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;保存并提交 | a）租户A，项目B下的数据同步任务B |
| 8 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;保存并提交 | b）租户A，项目A下的数据同步任务B |
| 9 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 10 |  | 进入【任务依赖配置有误】弹窗： |
| 11 |  | 1）展示缺失上游依赖任务如下： |
| 12 |  | a）租户A，项目B下的数据同步任务A、B |
| 13 |  | b）租户A，项目A下的数据同步任务B |
| 14 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 15 |  | 进入【任务依赖配置有误】弹窗： |
| 16 |  | 1）展示缺失上游依赖任务如下： |
| 17 |  | a）租户A，项目B下的数据同步任务A |
| 18 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 19 |  | 进入【任务依赖配置有误】弹窗： |
| 20 |  | 1）展示缺失上游依赖任务如下： |
| 21 |  | a）租户A，项目B下的数据同步任务B |
| 22 |  | b）租户A，项目A下的数据同步任务B |
| 23 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 24 |  | 进入【任务依赖配置有误】弹窗： |
| 25 |  | 1）展示缺失上游依赖任务如下： |
| 26 |  | a）租户A，项目B下的数据同步任务A、B |
| 27 |  | b）租户A，项目A下的数据同步任务B |
| 28 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 29 |  | 进入【任务依赖配置有误】弹窗： |
| 30 |  | 1）展示缺失上游依赖任务如下： |
| 31 |  | a）租户A，项目B下的数据同步任务A、B |
| 32 |  | b）租户A，项目A下的数据同步任务B |
| 33 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 34 |  | 进入【任务依赖配置有误】弹窗： |
| 35 |  | 1）展示缺失上游依赖任务如下： |
| 36 |  | a）租户A，项目B下的数据同步任务A、B |
| 37 |  | b）租户A，项目A下的数据同步任务B |
| 38 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证hivesql任务与数据同步间任务依赖功能正常_hivesql初始化方式创建_手动依赖_依赖推荐 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：hive_B数据源（meta数据源）
c）数据源C：hive_C数据源（非meta数据源，但与hive_meta数据源不是同一个hive源）

2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_meta.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；

3）建表&插数据脚本：
--hive建表&插数据
CREATE TABLE if not exists hivesql_test
(
id int,
name string,
age int
);
insert into hivesql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建hivesql任务A1，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）自动依赖任务如下： |
| 2 | 修改脚本如下：select * from schema_B.table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的数据同步任务A |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 4 | 修改脚本如下：create table table_C_1 like table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）展示缺失上游依赖任务如下： |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | i）租户A，项目B下的数据同步任务A |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 7 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 8 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的数据同步任务B |
| 9 |  | b）租户A，项目A下的数据同步任务B |
| 10 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 11 |  | a）展示缺失上游依赖任务如下： |
| 12 |  | i）租户A，项目B下的数据同步任务B |
| 13 |  | ii）租户A，项目A下的数据同步任务B |
| 14 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 15 |  | 1）依赖推荐任务如下： |
| 16 |  | a）租户A，项目B下的数据同步任务A、B |
| 17 |  | b）租户A，项目A下的数据同步任务B |
| 18 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 19 |  | a）展示缺失上游依赖任务如下： |
| 20 |  | i）租户A，项目B下的数据同步任务A、B |
| 21 |  | ii）租户A，项目A下的数据同步任务B |
| 22 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 23 |  | 1）依赖推荐任务如下： |
| 24 |  | a）租户A，项目B下的数据同步任务A |
| 25 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 26 |  | a）展示缺失上游依赖任务如下： |
| 27 |  | i）租户A，项目B下的数据同步任务A |
| 28 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 29 |  | 1）依赖推荐任务如下： |
| 30 |  | a）租户A，项目B下的数据同步任务B |
| 31 |  | b）租户A，项目A下的数据同步任务B |
| 32 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 33 |  | a）展示缺失上游依赖任务如下： |
| 34 |  | i）租户A，项目B下的数据同步任务B |
| 35 |  | ii）租户A，项目A下的数据同步任务B |
| 36 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 37 |  | 1）依赖推荐任务如下： |
| 38 |  | a）租户A，项目B下的数据同步任务A、B |
| 39 |  | b）租户A，项目A下的数据同步任务B |
| 40 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 41 |  | a）展示缺失上游依赖任务如下： |
| 42 |  | i）租户A，项目B下的数据同步任务A、B |
| 43 |  | ii）租户A，项目A下的数据同步任务B |
| 44 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 45 |  | 1）依赖推荐任务如下： |
| 46 |  | a）租户A，项目B下的数据同步任务A、B |
| 47 |  | b）租户A，项目A下的数据同步任务B |
| 48 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 49 |  | a）展示缺失上游依赖任务如下： |
| 50 |  | i）租户A，项目B下的数据同步任务A、B |
| 51 |  | ii）租户A，项目A下的数据同步任务B |
| 52 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 53 |  | 1）依赖推荐任务如下： |
| 54 |  | a）租户A，项目B下的数据同步任务A、B |
| 55 |  | b）租户A，项目A下的数据同步任务B |
| 56 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 57 |  | a）展示缺失上游依赖任务如下： |
| 58 |  | i）租户A，项目B下的数据同步任务A、B |
| 59 |  | ii）租户A，项目A下的数据同步任务B |
| 60 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证hivesql任务与数据同步间任务依赖功能正常_hivesql初始化方式不创建且不对接schema_自动依赖 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：hive_B数据源（meta数据源）
c）数据源C：hive_C数据源（非meta数据源，但与hive_meta数据源不是同一个hive源）
2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_A.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；
3）建表&插数据脚本：
--hive建表&插数据
CREATE TABLE if not exists hivesql_test
(
id int,
name string,
age int
);
insert into hivesql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建hivesql任务A1，选择schema_C，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下：无 |
| 2 | 修改脚本如下：select * from schema_B.table_B;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 4 | 修改脚本如下：create table table_C_1 like table_B;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的数据同步任务B |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;【调度属性-任务间依赖】的自动依赖，刷新 | b）租户A，项目A下的数据同步任务B |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 7 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 8 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的数据同步任务B |
| 9 |  | b）租户A，项目A下的数据同步任务B |
| 10 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 11 |  | 1）自动依赖任务如下：无 |
| 12 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 13 |  | 1）自动依赖任务如下： |
| 14 |  | a）租户A，项目B下的数据同步任务B |
| 15 |  | b）租户A，项目A下的数据同步任务B |
| 16 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 17 |  | 1）自动依赖任务如下： |
| 18 |  | a）租户A，项目B下的数据同步任务B |
| 19 |  | b）租户A，项目A下的数据同步任务B |
| 20 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 21 |  | 1）自动依赖任务如下： |
| 22 |  | a）租户A，项目B下的数据同步任务B |
| 23 |  | b）租户A，项目A下的数据同步任务B |
| 24 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 25 |  | 1）自动依赖任务如下： |
| 26 |  | a）租户A，项目B下的数据同步任务B |
| 27 |  | b）租户A，项目A下的数据同步任务B |
| 28 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |

##### 验证hivesql任务与数据同步间任务依赖功能正常_hivesql初始化方式不创建且不对接schema_手动依赖_手动添加 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：hive_B数据源（meta数据源）
c）数据源C：hive_C数据源（非meta数据源，但与hive_meta数据源不是同一个hive源）
2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_A.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；
3）建表&插数据脚本：
--hive建表&插数据
CREATE TABLE if not exists hivesql_test
(
id int,
name string,
age int
);
insert into hivesql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建hivesql任务A1，选择schema_C，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，保存并提交 | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 2 | 修改脚本如下：select * from schema_B.table_B;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 4 | 修改脚本如下：create table table_C_1 like table_B;保存并提交 | a）租户A，项目B下的数据同步任务B |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;保存并提交 | b）租户A，项目A下的数据同步任务B |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 7 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 8 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 9 |  | a）租户A，项目B下的数据同步任务B |
| 10 |  | b）租户A，项目A下的数据同步任务B |
| 11 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 12 |  | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 13 |  | 进入【任务依赖配置有误】弹窗： |
| 14 |  | 1）展示缺失上游依赖任务如下： |
| 15 |  | a）租户A，项目B下的数据同步任务B |
| 16 |  | b）租户A，项目A下的数据同步任务B |
| 17 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 18 |  | 进入【任务依赖配置有误】弹窗： |
| 19 |  | 1）展示缺失上游依赖任务如下： |
| 20 |  | a）租户A，项目B下的数据同步任务B |
| 21 |  | b）租户A，项目A下的数据同步任务B |
| 22 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 23 |  | 进入【任务依赖配置有误】弹窗： |
| 24 |  | 1）展示缺失上游依赖任务如下： |
| 25 |  | a）租户A，项目B下的数据同步任务B |
| 26 |  | b）租户A，项目A下的数据同步任务B |
| 27 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 28 |  | 进入【任务依赖配置有误】弹窗： |
| 29 |  | 1）展示缺失上游依赖任务如下： |
| 30 |  | a）租户A，项目B下的数据同步任务B |
| 31 |  | b）租户A，项目A下的数据同步任务B |
| 32 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证hivesql任务与数据同步间任务依赖功能正常_hivesql初始化方式不创建且不对接schema_手动依赖_依赖推荐 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：hive_B数据源（meta数据源）
c）数据源C：hive_C数据源（非meta数据源，但与hive_meta数据源不是同一个hive源）
2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_A.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；
3）建表&插数据脚本：
--hive建表&插数据
CREATE TABLE if not exists hivesql_test
(
id int,
name string,
age int
);
insert into hivesql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建hivesql任务A1，选择schema_C，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）自动依赖任务如下：无 |
| 2 | 修改脚本如下：select * from schema_B.table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 4 | 修改脚本如下：create table table_C_1 like table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的数据同步任务B |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | b）租户A，项目A下的数据同步任务B |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 7 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）展示缺失上游依赖任务如下： |
| 8 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | i）租户A，项目B下的数据同步任务B |
| 9 |  | ii）租户A，项目A下的数据同步任务B |
| 10 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 11 |  | 1）依赖推荐任务如下： |
| 12 |  | a）租户A，项目B下的数据同步任务B |
| 13 |  | b）租户A，项目A下的数据同步任务B |
| 14 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 15 |  | a）展示缺失上游依赖任务如下： |
| 16 |  | i）租户A，项目B下的数据同步任务B |
| 17 |  | ii）租户A，项目A下的数据同步任务B |
| 18 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 19 |  | 1）依赖推荐任务如下：无 |
| 20 |  | 2）未添加推荐依赖，保存并提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 21 |  | 1）依赖推荐任务如下： |
| 22 |  | a）租户A，项目B下的数据同步任务B |
| 23 |  | b）租户A，项目A下的数据同步任务B |
| 24 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 25 |  | a）展示缺失上游依赖任务如下： |
| 26 |  | i）租户A，项目B下的数据同步任务B |
| 27 |  | ii）租户A，项目A下的数据同步任务B |
| 28 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 29 |  | 1）依赖推荐任务如下： |
| 30 |  | a）租户A，项目B下的数据同步任务B |
| 31 |  | b）租户A，项目A下的数据同步任务B |
| 32 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 33 |  | a）展示缺失上游依赖任务如下： |
| 34 |  | i）租户A，项目B下的数据同步任务B |
| 35 |  | ii）租户A，项目A下的数据同步任务B |
| 36 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 37 |  | 1）依赖推荐任务如下： |
| 38 |  | a）租户A，项目B下的数据同步任务B |
| 39 |  | b）租户A，项目A下的数据同步任务B |
| 40 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 41 |  | a）展示缺失上游依赖任务如下： |
| 42 |  | i）租户A，项目B下的数据同步任务B |
| 43 |  | ii）租户A，项目A下的数据同步任务B |
| 44 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 45 |  | 1）依赖推荐任务如下： |
| 46 |  | a）租户A，项目B下的数据同步任务B |
| 47 |  | b）租户A，项目A下的数据同步任务B |
| 48 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 49 |  | a）展示缺失上游依赖任务如下： |
| 50 |  | i）租户A，项目B下的数据同步任务B |
| 51 |  | ii）租户A，项目A下的数据同步任务B |
| 52 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证hivesql任务间任务依赖功能正常_50个依赖任务 「P2」

> 前置条件
```
1）项目A、项目B的hadoop引擎的初始化方式均为创建
2）hivesql任务（租户A下，在项目B配置以下任务且已提交）：
a）hivesql任务A1-A50：create table table_A;
b）hivesql任务B1-B50：create table table_B_${1-50};

3）建表&插数据脚本：
--hivesql建表&插数据
CREATE TABLE if not exists hivesql_test
(
id int,
name string,
age int
);
insert into hivesql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建hivesql任务C，脚本如下：select * from table_A;【调度属性-任务间依赖】选择“自动依赖”，查看依赖任务 | 1）自动依赖任务如下： |
| 2 | 【调度属性-任务间依赖】切换为“手动依赖”，保存并提交 | a）租户A，项目B下的hivesql任务A1-A50 |
| 3 | 【调度属性-任务间依赖】切换为“手动依赖”，“添加依赖”选择“依赖推荐” | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 4 | 进入租户A下项目B的【数据开发-周期任务】页面，新建hivesql任务D，脚本如下：select * from table_B_1;...select * from table_B_50;【调度属性-任务间依赖】选择“自动依赖”，查看依赖任务 | 进入【任务依赖配置有误】弹窗： |
| 5 | 【调度属性-任务间依赖】切换为“手动依赖”，保存并提交 | 1）展示缺失上游依赖任务如下： |
| 6 | 【调度属性-任务间依赖】切换为“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的hivesql任务A1-A50 |
| 7 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 8 |  | 1）依赖推荐任务如下： |
| 9 |  | a）租户A，项目B下的hivesql任务A1-A50 |
| 10 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 11 |  | a）展示缺失上游依赖任务如下： |
| 12 |  | i）租户A，项目B下的hivesql任务A1-A50 |
| 13 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 14 |  | 1）自动依赖任务如下： |
| 15 |  | a）租户A，项目B下的hivesql任务B1-B50 |
| 16 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 17 |  | 进入【任务依赖配置有误】弹窗： |
| 18 |  | 1）展示缺失上游依赖任务如下： |
| 19 |  | a）租户A，项目B下的hivesql任务B1-B50 |
| 20 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 21 |  | 1）依赖推荐任务如下： |
| 22 |  | a）租户A，项目B下的hivesql任务B1-B50 |
| 23 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 24 |  | a）展示缺失上游依赖任务如下： |
| 25 |  | i）租户A，项目B下的hivesql任务B1-B50 |
| 26 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证mysql任务间任务依赖功能正常_mysql初始化方式创建_自动依赖 「P2」

> 前置条件
```
1）项目A、项目B的mysql引擎的初始化方式均为创建
2）mysql任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）mysql任务A：create table table_A;
b）mysql任务B：create table schema_B.table_B_1;
c）mysql任务C：create table table_B_2 as select * from table_A;
d）mysql任务D：insert into table_B_1 select * from table_A;

3）建表&插数据脚本：
--mysql建表&插数据
CREATE TABLE if not exists mysql_test
(
id int,
name varchar(256),
age int
);
insert into mysql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建mysql任务A1，脚本如下：select * from table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下： |
| 2 | 修改脚本如下：select * from table_B_1;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的mysql任务A |
| 3 | 修改脚本如下：select * from table_B_2;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 4 | 修改脚本如下：select * from schema_B.table_B_2;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的mysql任务D |
| 6 | 修改脚本如下：create table table_C_1 like table_A;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的mysql任务C |
| 9 | 修改脚本如下：select * from table_A;select * from table_B_1;select * from table_B_2;select * from schema_B.table_B_2;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 10 |  | 1）自动依赖任务如下：空 |
| 11 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 12 |  | 1）自动依赖任务如下： |
| 13 |  | a）租户A，项目B下的mysql任务A、B |
| 14 |  | b）租户A，项目A下的mysql任务B |
| 15 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 16 |  | 1）自动依赖任务如下： |
| 17 |  | a）租户A，项目B下的mysql任务A |
| 18 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 19 |  | 1）自动依赖任务如下： |
| 20 |  | a）租户A，项目B下的mysql任务A |
| 21 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 22 |  | 1）自动依赖任务如下： |
| 23 |  | a）租户A，项目B下的mysql任务A、B |
| 24 |  | b）租户A，项目A下的mysql任务B |
| 25 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 26 |  | 1）自动依赖任务如下： |
| 27 |  | a）租户A，项目B下的mysql任务A、B、C、D |
| 28 |  | b）租户A，项目A下的mysql任务B |
| 29 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |

##### 验证mysql任务间任务依赖功能正常_mysql初始化方式创建_手动依赖_手动添加 「P2」

> 前置条件
```
1）项目A、项目B的mysql引擎的初始化方式均为创建
2）mysql任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）mysql任务A：create table table_A;
b）mysql任务B：create table schema_B.table_B_1;
c）mysql任务C：create table table_B_2 as select * from table_A;
d）mysql任务D：insert into table_B_1 select * from table_A;

3）建表&插数据脚本：
--mysql建表&插数据
CREATE TABLE if not exists mysql_test
(
id int,
name varchar(256),
age int
);
insert into mysql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建mysql任务A1，脚本如下：select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 2 | 修改脚本如下：select * from table_B_1;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 3 | 修改脚本如下：select * from table_B_2;保存并提交 | a）租户A，项目B下的mysql任务A |
| 4 | 修改脚本如下：select * from schema_B.table_B_2;保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 6 | 修改脚本如下：create table table_C_1 like table_A;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;保存并提交 | a）租户A，项目B下的mysql任务D |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 9 | 修改脚本如下：select * from table_A;select * from table_B_1;select * from table_B_2;select * from schema_B.table_B_2;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 10 |  | 1）展示缺失上游依赖任务如下： |
| 11 |  | a）租户A，项目B下的mysql任务C |
| 12 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 13 |  | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 14 |  | 进入【任务依赖配置有误】弹窗： |
| 15 |  | 1）展示缺失上游依赖任务如下： |
| 16 |  | a）租户A，项目B下的mysql任务A、B |
| 17 |  | b）租户A，项目A下的mysql任务B |
| 18 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 19 |  | 进入【任务依赖配置有误】弹窗： |
| 20 |  | 1）展示缺失上游依赖任务如下： |
| 21 |  | a）租户A，项目B下的mysql任务A |
| 22 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 23 |  | 进入【任务依赖配置有误】弹窗： |
| 24 |  | 1）展示缺失上游依赖任务如下： |
| 25 |  | a）租户A，项目B下的mysql任务A |
| 26 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 27 |  | 进入【任务依赖配置有误】弹窗： |
| 28 |  | 1）展示缺失上游依赖任务如下： |
| 29 |  | a）租户A，项目B下的mysql任务A、B |
| 30 |  | b）租户A，项目A下的mysql任务B |
| 31 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 32 |  | 进入【任务依赖配置有误】弹窗： |
| 33 |  | 1）展示缺失上游依赖任务如下： |
| 34 |  | a）租户A，项目B下的mysql任务A、B、C、D |
| 35 |  | b）租户A，项目A下的mysql任务B |
| 36 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证mysql任务间任务依赖功能正常_mysql初始化方式创建_手动依赖_依赖推荐 「P2」

> 前置条件
```
1）项目A、项目B的mysql引擎的初始化方式均为创建
2）mysql任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）mysql任务A：create table table_A;
b）mysql任务B：create table schema_B.table_B_1;
c）mysql任务C：create table table_B_2 as select * from table_A;
d）mysql任务D：insert into table_B_1 select * from table_A;

3）建表&插数据脚本：
--mysql建表&插数据
CREATE TABLE if not exists mysql_test
(
id int,
name varchar(256),
age int
);
insert into mysql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建mysql任务A1，脚本如下：select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 2 | 修改脚本如下：select * from table_B_1;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的mysql任务A |
| 3 | 修改脚本如下：select * from table_B_2;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 4 | 修改脚本如下：select * from schema_B.table_B_2;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）展示缺失上游依赖任务如下： |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | i）租户A，项目B下的mysql任务A |
| 6 | 修改脚本如下：create table table_C_1 like table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的mysql任务D |
| 9 | 修改脚本如下：select * from table_A;select * from table_B_1;select * from table_B_2;select * from schema_B.table_B_2;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 10 |  | a）展示缺失上游依赖任务如下： |
| 11 |  | i）租户A，项目B下的mysql任务D |
| 12 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 13 |  | 1）依赖推荐任务如下： |
| 14 |  | a）租户A，项目B下的mysql任务C |
| 15 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 16 |  | a）展示缺失上游依赖任务如下： |
| 17 |  | i）租户A，项目B下的mysql任务C |
| 18 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 19 |  | 1）依赖推荐任务如下：空 |
| 20 |  | 2）未添加推荐依赖，保存并提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 21 |  | 1）依赖推荐任务如下： |
| 22 |  | a）租户A，项目B下的mysql任务A、B |
| 23 |  | b）租户A，项目A下的mysql任务B |
| 24 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 25 |  | a）展示缺失上游依赖任务如下： |
| 26 |  | i）租户A，项目B下的mysql任务A、B |
| 27 |  | ii）租户A，项目A下的mysql任务B |
| 28 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 29 |  | 1）依赖推荐任务如下： |
| 30 |  | a）租户A，项目B下的mysql任务A |
| 31 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 32 |  | a）展示缺失上游依赖任务如下： |
| 33 |  | i）租户A，项目B下的mysql任务A |
| 34 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 35 |  | 1）依赖推荐任务如下： |
| 36 |  | a）租户A，项目B下的mysql任务A |
| 37 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 38 |  | a）展示缺失上游依赖任务如下： |
| 39 |  | i）租户A，项目B下的mysql任务A |
| 40 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 41 |  | 1）依赖推荐任务如下： |
| 42 |  | a）租户A，项目B下的mysql任务A、B |
| 43 |  | b）租户A，项目A下的mysql任务B |
| 44 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 45 |  | a）展示缺失上游依赖任务如下： |
| 46 |  | i）租户A，项目B下的mysql任务A、B |
| 47 |  | ii）租户A，项目A下的mysql任务B |
| 48 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 49 |  | 1）依赖推荐任务如下： |
| 50 |  | a）租户A，项目B下的mysql任务A、B、C、D |
| 51 |  | b）租户A，项目A下的mysql任务B |
| 52 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 53 |  | a）展示缺失上游依赖任务如下： |
| 54 |  | i）租户A，项目B下的mysql任务A、B、C、D |
| 55 |  | ii）租户A，项目A下的mysql任务B |
| 56 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证mysql任务间任务依赖功能正常_mysql初始化方式不创建且不对接schema_自动依赖 「P2」

> 前置条件
```
1）项目A、项目B的mysql引擎的初始化方式均为不创建且不对接schema
2）mysql任务（租户A下，在项目A、项目B均配置以下任务且已提交，所选schema均为schema_C）：
a）mysql任务A：create table table_A;
b）mysql任务B：create table schema_B.table_B_1;
c）mysql任务C：create table schema_B.table_B_2 as select * from table_A;
d）mysql任务D：insert into schema_B.table_B_1 select * from table_A;

3）建表&插数据脚本：
--mysql建表&插数据
CREATE TABLE if not exists mysql_test
(
id int,
name varchar(256),
age int
);
insert into mysql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建mysql任务A1，选择schema_C，脚本如下：select * from schema_B.table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下：空 |
| 2 | 修改脚本如下：select * from schema_B.table_B_1;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 修改脚本如下：select * from schema_B.table_B_2;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下： |
| 4 | 修改脚本如下：select * from table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | a）租户A，项目A下的mysql任务B、D |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;【调度属性-任务间依赖】选择“自动依赖”，刷新 | b）租户A，项目B下的mysql任务B、D |
| 6 | 修改脚本如下：create table table_C_1 like table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下： |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | a）租户A，项目A下的mysql任务C |
| 9 | 修改脚本如下：select * from schema_B.table_A;select * from schema_B.table_B_1;select * from schema_B.table_B_2;select * from table_A;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | b）租户A，项目B下的mysql任务C |
| 10 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 11 |  | 1）自动依赖任务如下： |
| 12 |  | a）租户A，项目A下的mysql任务A |
| 13 |  | b）租户A，项目B下的mysql任务A |
| 14 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 15 |  | 1）自动依赖任务如下： |
| 16 |  | a）租户A，项目A下的mysql任务A、B、C、D |
| 17 |  | b）租户A，项目B下的mysql任务A、B、C、D |
| 18 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 19 |  | 1）自动依赖任务如下： |
| 20 |  | a）租户A，项目A下的mysql任务A |
| 21 |  | b）租户A，项目B下的mysql任务A |
| 22 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 23 |  | 1）自动依赖任务如下： |
| 24 |  | a）租户A，项目A下的mysql任务A |
| 25 |  | b）租户A，项目B下的mysql任务A |
| 26 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 27 |  | 1）自动依赖任务如下： |
| 28 |  | a）租户A，项目A下的mysql任务A、B、D |
| 29 |  | b）租户A，项目B下的mysql任务A、B、D |
| 30 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 31 |  | 1）自动依赖任务如下： |
| 32 |  | a）租户A，项目A下的mysql任务A、B、C、D |
| 33 |  | b）租户A，项目B下的mysql任务A、B、C、D |
| 34 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |

##### 验证mysql任务间任务依赖功能正常_mysql初始化方式不创建且不对接schema_手动依赖_手动添加 「P2」

> 前置条件
```
1）项目A、项目B的mysql引擎的初始化方式均为不创建且不对接schema
2）mysql任务（租户A下，在项目A、项目B均配置以下任务且已提交，所选schema均为schema_C）：
a）mysql任务A：create table table_A;
b）mysql任务B：create table schema_B.table_B_1;
c）mysql任务C：create table schema_B.table_B_2 as select * from table_A;
d）mysql任务D：insert into schema_B.table_B_1 select * from table_A;

3）建表&插数据脚本：
--mysql建表&插数据
CREATE TABLE if not exists mysql_test
(
id int,
name varchar(256),
age int
);
insert into mysql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建mysql任务A1，选择schema_C，脚本如下：select * from schema_B.table_A;【调度属性-任务间依赖】选择“手动依赖”，保存并提交 | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 2 | 修改脚本如下：select * from schema_B.table_B_1;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 3 | 修改脚本如下：select * from schema_B.table_B_2;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 4 | 修改脚本如下：select * from table_A;保存并提交 | a）租户A，项目A下的mysql任务B、D |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;保存并提交 | b）租户A，项目B下的mysql任务B、D |
| 6 | 修改脚本如下：create table table_C_1 like table_A;保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 9 | 修改脚本如下：select * from schema_B.table_A;select * from schema_B.table_B_1;select * from schema_B.table_B_2;select * from table_A;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;保存并提交 | a）租户A，项目A下的mysql任务C |
| 10 |  | b）租户A，项目B下的mysql任务C |
| 11 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 12 |  | 进入【任务依赖配置有误】弹窗： |
| 13 |  | 1）展示缺失上游依赖任务如下： |
| 14 |  | a）租户A，项目A下的mysql任务A |
| 15 |  | b）租户A，项目B下的mysql任务A |
| 16 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 17 |  | 进入【任务依赖配置有误】弹窗： |
| 18 |  | 1）展示缺失上游依赖任务如下： |
| 19 |  | a）租户A，项目A下的mysql任务A、B、C、D |
| 20 |  | b）租户A，项目B下的mysql任务A、B、C、D |
| 21 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 22 |  | 进入【任务依赖配置有误】弹窗： |
| 23 |  | 1）展示缺失上游依赖任务如下： |
| 24 |  | a）租户A，项目A下的mysql任务A |
| 25 |  | b）租户A，项目B下的mysql任务A |
| 26 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 27 |  | 进入【任务依赖配置有误】弹窗： |
| 28 |  | 1）展示缺失上游依赖任务如下： |
| 29 |  | a）租户A，项目A下的mysql任务A |
| 30 |  | b）租户A，项目B下的mysql任务A |
| 31 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 32 |  | 进入【任务依赖配置有误】弹窗： |
| 33 |  | 1）展示缺失上游依赖任务如下： |
| 34 |  | a）租户A，项目A下的mysql任务A、B、D |
| 35 |  | b）租户A，项目B下的mysql任务A、B、D |
| 36 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 37 |  | 进入【任务依赖配置有误】弹窗： |
| 38 |  | 1）展示缺失上游依赖任务如下： |
| 39 |  | a）租户A，项目A下的mysql任务A、B、C、D |
| 40 |  | b）租户A，项目B下的mysql任务A、B、C、D |
| 41 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证mysql任务间任务依赖功能正常_mysql初始化方式不创建且不对接schema_手动依赖_依赖推荐 「P2」

> 前置条件
```
1）项目A、项目B的mysql引擎的初始化方式均为不创建且不对接schema
2）mysql任务（租户A下，在项目A、项目B均配置以下任务且已提交，所选schema均为schema_C）：
a）mysql任务A：create table table_A;
b）mysql任务B：create table schema_B.table_B_1;
c）mysql任务C：create table schema_B.table_B_2 as select * from table_A;
d）mysql任务D：insert into schema_B.table_B_1 select * from table_A;

3）建表&插数据脚本：
--mysql建表&插数据
CREATE TABLE if not exists mysql_test
(
id int,
name varchar(256),
age int
);
insert into mysql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建mysql任务A1，选择schema_C，脚本如下：select * from schema_B.table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下：空 |
| 2 | 修改脚本如下：select * from schema_B.table_B_1;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 修改脚本如下：select * from schema_B.table_B_2;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 4 | 修改脚本如下：select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目A下的mysql任务B、D |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | b）租户A，项目B下的mysql任务B、D |
| 6 | 修改脚本如下：create table table_C_1 like table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）展示缺失上游依赖任务如下： |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | i）租户A，项目A下的mysql任务B、D |
| 9 | 修改脚本如下：select * from schema_B.table_A;select * from schema_B.table_B_1;select * from schema_B.table_B_2;select * from table_A;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | ii）租户A，项目B下的mysql任务B、D |
| 10 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 11 |  | 1）依赖推荐任务如下： |
| 12 |  | a）租户A，项目A下的mysql任务C |
| 13 |  | b）租户A，项目B下的mysqlC |
| 14 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 15 |  | a）展示缺失上游依赖任务如下： |
| 16 |  | i）租户A，项目A下的mysqlC |
| 17 |  | ii）租户A，项目B下的mysqlC |
| 18 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 19 |  | 1）依赖推荐任务如下： |
| 20 |  | a）租户A，项目A下的mysql任务A |
| 21 |  | b）租户A，项目B下的mysql任务A |
| 22 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 23 |  | a）展示缺失上游依赖任务如下： |
| 24 |  | i）租户A，项目A下的mysql任务A |
| 25 |  | ii）租户A，项目B下的mysql任务A |
| 26 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 27 |  | 1）依赖推荐任务如下： |
| 28 |  | a）租户A，项目A下的mysql任务A、B、C、D |
| 29 |  | b）租户A，项目B下的mysql任务A、B、C、D |
| 30 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 31 |  | a）展示缺失上游依赖任务如下： |
| 32 |  | a）租户A，项目A下的mysql任务A、B、C、D |
| 33 |  | b）租户A，项目B下的mysql任务A、B、C、D |
| 34 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 35 |  | 1）依赖推荐任务如下： |
| 36 |  | a）租户A，项目A下的mysql任务A |
| 37 |  | b）租户A，项目B下的mysql任务A |
| 38 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 39 |  | a）展示缺失上游依赖任务如下： |
| 40 |  | i）租户A，项目A下的mysql任务A |
| 41 |  | ii）租户A，项目B下的mysql任务A |
| 42 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 43 |  | 1）依赖推荐任务如下： |
| 44 |  | a）租户A，项目A下的mysql任务A |
| 45 |  | b）租户A，项目B下的mysql任务A |
| 46 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 47 |  | a）展示缺失上游依赖任务如下： |
| 48 |  | i）租户A，项目A下的mysql任务A |
| 49 |  | ii）租户A，项目B下的mysql任务A |
| 50 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 51 |  | 1）依赖推荐任务如下： |
| 52 |  | a）租户A，项目A下的mysql任务A、B、D |
| 53 |  | b）租户A，项目B下的mysql任务A、B、D |
| 54 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 55 |  | a）展示缺失上游依赖任务如下： |
| 56 |  | i）租户A，项目A下的mysql任务A、B、D |
| 57 |  | ii）租户A，项目B下的mysql任务A、B、D |
| 58 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 59 |  | 1）依赖推荐任务如下： |
| 60 |  | a）租户A，项目A下的mysql任务A、B、C、D |
| 61 |  | b）租户A，项目B下的mysql任务A、B、C、D |
| 62 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 63 |  | a）展示缺失上游依赖任务如下： |
| 64 |  | i）租户A，项目A下的mysql任务A、B、C、D |
| 65 |  | ii）租户A，项目B下的mysql任务A、B、C、D |
| 66 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证mysql任务与数据同步间任务依赖功能正常_mysql初始化方式创建_自动依赖 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：mysql_B数据源（meta数据源）
c）数据源C：mysql_C数据源（非meta数据源，但与mysql_meta数据源不是同一个mysql源）

2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_meta.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；

3）建表&插数据脚本：
--mysql建表&插数据
CREATE TABLE if not exists mysql_test
(
id int,
name varchar(256),
age int
);
insert into mysql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建mysql任务A1，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下： |
| 2 | 修改脚本如下：select * from schema_B.table_B;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的数据同步任务A |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 4 | 修改脚本如下：create table table_C_1 like table_B;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的数据同步任务B |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;【调度属性-任务间依赖】的自动依赖，刷新 | b）租户A，项目A下的数据同步任务B |
| 7 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 8 |  | 1）自动依赖任务如下： |
| 9 |  | a）租户A，项目B下的数据同步任务A、B |
| 10 |  | b）租户A，项目A下的数据同步任务B |
| 11 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 12 |  | 1）自动依赖任务如下： |
| 13 |  | a）租户A，项目B下的数据同步任务A |
| 14 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 15 |  | 1）自动依赖任务如下： |
| 16 |  | a）租户A，项目B下的数据同步任务B |
| 17 |  | b）租户A，项目A下的数据同步任务B |
| 18 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 19 |  | 1）自动依赖任务如下： |
| 20 |  | a）租户A，项目B下的数据同步任务A、B |
| 21 |  | b）租户A，项目A下的数据同步任务B |
| 22 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 23 |  | 1）自动依赖任务如下： |
| 24 |  | a）租户A，项目B下的数据同步任务A、B |
| 25 |  | b）租户A，项目A下的数据同步任务B |
| 26 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |

##### 验证mysql任务与数据同步间任务依赖功能正常_mysql初始化方式创建_手动依赖_手动添加 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：mysql_B数据源（meta数据源）
c）数据源C：mysql_C数据源（非meta数据源，但与mysql_meta数据源不是同一个mysql源）

2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_meta.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；

3）建表&插数据脚本：
--mysql建表&插数据
CREATE TABLE if not exists mysql_test
(
id int,
name varchar(256),
age int
);
insert into mysql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建mysql任务A1，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 2 | 修改脚本如下：select * from schema_B.table_B;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;保存并提交 | a）租户A，项目B下的数据同步任务A |
| 4 | 修改脚本如下：create table table_C_1 like table_B;保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 7 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;保存并提交 | a）租户A，项目B下的数据同步任务B |
| 8 |  | b）租户A，项目A下的数据同步任务B |
| 9 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 10 |  | 进入【任务依赖配置有误】弹窗： |
| 11 |  | 1）展示缺失上游依赖任务如下： |
| 12 |  | a）租户A，项目B下的数据同步任务A、B |
| 13 |  | b）租户A，项目A下的数据同步任务B |
| 14 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 15 |  | 进入【任务依赖配置有误】弹窗： |
| 16 |  | 1）展示缺失上游依赖任务如下： |
| 17 |  | a）租户A，项目B下的数据同步任务A |
| 18 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 19 |  | 进入【任务依赖配置有误】弹窗： |
| 20 |  | 1）展示缺失上游依赖任务如下： |
| 21 |  | a）租户A，项目B下的数据同步任务B |
| 22 |  | b）租户A，项目A下的数据同步任务B |
| 23 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 24 |  | 进入【任务依赖配置有误】弹窗： |
| 25 |  | 1）展示缺失上游依赖任务如下： |
| 26 |  | a）租户A，项目B下的数据同步任务A、B |
| 27 |  | b）租户A，项目A下的数据同步任务B |
| 28 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 29 |  | 进入【任务依赖配置有误】弹窗： |
| 30 |  | 1）展示缺失上游依赖任务如下： |
| 31 |  | a）租户A，项目B下的数据同步任务A、B |
| 32 |  | b）租户A，项目A下的数据同步任务B |
| 33 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证mysql任务与数据同步间任务依赖功能正常_mysql初始化方式创建_手动依赖_依赖推荐 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：mysql_B数据源（meta数据源）
c）数据源C：mysql_C数据源（非meta数据源，但与mysql_meta数据源不是同一个mysql源）

2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_meta.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；

3）建表&插数据脚本：
--mysql建表&插数据
CREATE TABLE if not exists mysql_test
(
id int,
name varchar(256),
age int
);
insert into mysql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建mysql任务A1，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）自动依赖任务如下： |
| 2 | 修改脚本如下：select * from schema_B.table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的数据同步任务A |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 4 | 修改脚本如下：create table table_C_1 like table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）展示缺失上游依赖任务如下： |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | i）租户A，项目B下的数据同步任务A |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 7 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 8 |  | a）租户A，项目B下的数据同步任务B |
| 9 |  | b）租户A，项目A下的数据同步任务B |
| 10 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 11 |  | a）展示缺失上游依赖任务如下： |
| 12 |  | i）租户A，项目B下的数据同步任务B |
| 13 |  | ii）租户A，项目A下的数据同步任务B |
| 14 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 15 |  | 1）依赖推荐任务如下： |
| 16 |  | a）租户A，项目B下的数据同步任务A、B |
| 17 |  | b）租户A，项目A下的数据同步任务B |
| 18 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 19 |  | a）展示缺失上游依赖任务如下： |
| 20 |  | i）租户A，项目B下的数据同步任务A、B |
| 21 |  | ii）租户A，项目A下的数据同步任务B |
| 22 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 23 |  | 1）依赖推荐任务如下： |
| 24 |  | a）租户A，项目B下的数据同步任务A |
| 25 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 26 |  | a）展示缺失上游依赖任务如下： |
| 27 |  | i）租户A，项目B下的数据同步任务A |
| 28 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 29 |  | 1）依赖推荐任务如下： |
| 30 |  | a）租户A，项目B下的数据同步任务B |
| 31 |  | b）租户A，项目A下的数据同步任务B |
| 32 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 33 |  | a）展示缺失上游依赖任务如下： |
| 34 |  | i）租户A，项目B下的数据同步任务B |
| 35 |  | ii）租户A，项目A下的数据同步任务B |
| 36 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 37 |  | 1）依赖推荐任务如下： |
| 38 |  | a）租户A，项目B下的数据同步任务A、B |
| 39 |  | b）租户A，项目A下的数据同步任务B |
| 40 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 41 |  | a）展示缺失上游依赖任务如下： |
| 42 |  | i）租户A，项目B下的数据同步任务A、B |
| 43 |  | ii）租户A，项目A下的数据同步任务B |
| 44 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 45 |  | 1）依赖推荐任务如下： |
| 46 |  | a）租户A，项目B下的数据同步任务A、B |
| 47 |  | b）租户A，项目A下的数据同步任务B |
| 48 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 49 |  | a）展示缺失上游依赖任务如下： |
| 50 |  | i）租户A，项目B下的数据同步任务A、B |
| 51 |  | ii）租户A，项目A下的数据同步任务B |
| 52 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证mysql任务与数据同步间任务依赖功能正常_mysql初始化方式不创建且不对接schema_自动依赖 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：mysql_B数据源（meta数据源）
c）数据源C：mysql_C数据源（非meta数据源，但与mysql_meta数据源不是同一个mysql源）
2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_A.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；
3）建表&插数据脚本：
--mysql建表&插数据
CREATE TABLE if not exists mysql_test
(
id int,
name varchar(256),
age int
);
insert into mysql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建mysql任务A1，选择schema_C，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下：无 |
| 2 | 修改脚本如下：select * from schema_B.table_B;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 4 | 修改脚本如下：create table table_C_1 like table_B;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的数据同步任务B |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;【调度属性-任务间依赖】的自动依赖，刷新 | b）租户A，项目A下的数据同步任务B |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 7 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 8 |  | a）租户A，项目B下的数据同步任务B |
| 9 |  | b）租户A，项目A下的数据同步任务B |
| 10 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 11 |  | 1）自动依赖任务如下：无 |
| 12 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 13 |  | 1）自动依赖任务如下： |
| 14 |  | a）租户A，项目B下的数据同步任务B |
| 15 |  | b）租户A，项目A下的数据同步任务B |
| 16 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 17 |  | 1）自动依赖任务如下： |
| 18 |  | a）租户A，项目B下的数据同步任务B |
| 19 |  | b）租户A，项目A下的数据同步任务B |
| 20 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 21 |  | 1）自动依赖任务如下： |
| 22 |  | a）租户A，项目B下的数据同步任务B |
| 23 |  | b）租户A，项目A下的数据同步任务B |
| 24 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |

##### 验证mysql任务与数据同步间任务依赖功能正常_mysql初始化方式不创建且不对接schema_手动依赖_手动添加 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：mysql_B数据源（meta数据源）
c）数据源C：mysql_C数据源（非meta数据源，但与mysql_meta数据源不是同一个mysql源）
2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_A.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；
3）建表&插数据脚本：
--mysql建表&插数据
CREATE TABLE if not exists mysql_test
(
id int,
name varchar(256),
age int
);
insert into mysql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建mysql任务A1，选择schema_C，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，保存并提交 | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 2 | 修改脚本如下：select * from schema_B.table_B;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 4 | 修改脚本如下：create table table_C_1 like table_B;保存并提交 | a）租户A，项目B下的数据同步任务B |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;保存并提交 | b）租户A，项目A下的数据同步任务B |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 7 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 8 |  | 1）展示缺失上游依赖任务如下： |
| 9 |  | a）租户A，项目B下的数据同步任务B |
| 10 |  | b）租户A，项目A下的数据同步任务B |
| 11 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 12 |  | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 13 |  | 进入【任务依赖配置有误】弹窗： |
| 14 |  | 1）展示缺失上游依赖任务如下： |
| 15 |  | a）租户A，项目B下的数据同步任务B |
| 16 |  | b）租户A，项目A下的数据同步任务B |
| 17 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 18 |  | 进入【任务依赖配置有误】弹窗： |
| 19 |  | 1）展示缺失上游依赖任务如下： |
| 20 |  | a）租户A，项目B下的数据同步任务B |
| 21 |  | b）租户A，项目A下的数据同步任务B |
| 22 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 23 |  | 进入【任务依赖配置有误】弹窗： |
| 24 |  | 1）展示缺失上游依赖任务如下： |
| 25 |  | a）租户A，项目B下的数据同步任务B |
| 26 |  | b）租户A，项目A下的数据同步任务B |
| 27 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证mysql任务与数据同步间任务依赖功能正常_mysql初始化方式不创建且不对接schema_手动依赖_依赖推荐 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：mysql_B数据源（meta数据源）
c）数据源C：mysql_C数据源（非meta数据源，但与mysql_meta数据源不是同一个mysql源）
2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_A.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；
3）建表&插数据脚本：
--mysql建表&插数据
CREATE TABLE if not exists mysql_test
(
id int,
name varchar(256),
age int
);
insert into mysql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建mysql任务A1，选择schema_C，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）自动依赖任务如下：无 |
| 2 | 修改脚本如下：select * from schema_B.table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 4 | 修改脚本如下：create table table_C_1 like table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的数据同步任务B |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | b）租户A，项目A下的数据同步任务B |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 7 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）展示缺失上游依赖任务如下： |
| 8 |  | i）租户A，项目B下的数据同步任务B |
| 9 |  | ii）租户A，项目A下的数据同步任务B |
| 10 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 11 |  | 1）依赖推荐任务如下： |
| 12 |  | a）租户A，项目B下的数据同步任务B |
| 13 |  | b）租户A，项目A下的数据同步任务B |
| 14 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 15 |  | a）展示缺失上游依赖任务如下： |
| 16 |  | i）租户A，项目B下的数据同步任务B |
| 17 |  | ii）租户A，项目A下的数据同步任务B |
| 18 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 19 |  | 1）依赖推荐任务如下：无 |
| 20 |  | 2）未添加推荐依赖，保存并提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 21 |  | 1）依赖推荐任务如下： |
| 22 |  | a）租户A，项目B下的数据同步任务B |
| 23 |  | b）租户A，项目A下的数据同步任务B |
| 24 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 25 |  | a）展示缺失上游依赖任务如下： |
| 26 |  | i）租户A，项目B下的数据同步任务B |
| 27 |  | ii）租户A，项目A下的数据同步任务B |
| 28 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 29 |  | 1）依赖推荐任务如下： |
| 30 |  | a）租户A，项目B下的数据同步任务B |
| 31 |  | b）租户A，项目A下的数据同步任务B |
| 32 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 33 |  | a）展示缺失上游依赖任务如下： |
| 34 |  | i）租户A，项目B下的数据同步任务B |
| 35 |  | ii）租户A，项目A下的数据同步任务B |
| 36 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 37 |  | 1）依赖推荐任务如下： |
| 38 |  | a）租户A，项目B下的数据同步任务B |
| 39 |  | b）租户A，项目A下的数据同步任务B |
| 40 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 41 |  | a）展示缺失上游依赖任务如下： |
| 42 |  | i）租户A，项目B下的数据同步任务B |
| 43 |  | ii）租户A，项目A下的数据同步任务B |
| 44 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证mysql任务间任务依赖功能正常_50个依赖任务 「P2」

> 前置条件
```
1）项目A、项目B的mysql引擎的初始化方式均为创建
2）mysql任务（租户A下，在项目B配置以下任务且已提交）：
a）mysql任务A1-A50：create table table_A;
b）mysql任务B1-B50：create table table_B_${1-50};

3）建表&插数据脚本：
--mysql建表&插数据
CREATE TABLE if not exists mysql_test
(
id int,
name varchar(256),
age int
);
insert into mysql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建mysql任务C，脚本如下：select * from table_A;【调度属性-任务间依赖】选择“自动依赖”，查看依赖任务 | 1）自动依赖任务如下： |
| 2 | 【调度属性-任务间依赖】切换为“手动依赖”，保存并提交 | a）租户A，项目B下的mysql任务A1-A50 |
| 3 | 【调度属性-任务间依赖】切换为“手动依赖”，“添加依赖”选择“依赖推荐” | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 4 | 进入租户A下项目B的【数据开发-周期任务】页面，新建mysql任务D，脚本如下：select * from table_B_1;...select * from table_B_50;【调度属性-任务间依赖】选择“自动依赖”，查看依赖任务 | 进入【任务依赖配置有误】弹窗： |
| 5 | 【调度属性-任务间依赖】切换为“手动依赖”，保存并提交 | 1）展示缺失上游依赖任务如下： |
| 6 | 【调度属性-任务间依赖】切换为“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的mysql任务A1-A50 |
| 7 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 8 |  | 1）依赖推荐任务如下： |
| 9 |  | a）租户A，项目B下的mysql任务A1-A50 |
| 10 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 11 |  | a）展示缺失上游依赖任务如下： |
| 12 |  | i）租户A，项目B下的mysql任务A1-A50 |
| 13 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 14 |  | 1）自动依赖任务如下： |
| 15 |  | a）租户A，项目B下的mysql任务B1-B50 |
| 16 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 17 |  | 进入【任务依赖配置有误】弹窗： |
| 18 |  | 1）展示缺失上游依赖任务如下： |
| 19 |  | a）租户A，项目B下的mysql任务B1-B50 |
| 20 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 21 |  | 1）依赖推荐任务如下： |
| 22 |  | a）租户A，项目B下的mysql任务B1-B50 |
| 23 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 24 |  | a）展示缺失上游依赖任务如下： |
| 25 |  | i）租户A，项目B下的mysql任务B1-B50 |
| 26 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证dorissql任务间任务依赖功能正常_dorissql初始化方式创建_自动依赖 「P1」

> 前置条件
```
1）项目A、项目B的dorissql引擎的初始化方式均为创建
2）dorissql任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）dorissql任务A：create table table_A;
b）dorissql任务B：create table schema_B.table_B_1;
c）dorissql任务C：create table table_B_2 as select * from table_A;
d）dorissql任务D：insert into table_B_1 select * from table_A;
e）dorissql任务E：insert overwrite table table_B_2 select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;

3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建dorissql任务A1，脚本如下：select * from table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下： |
| 2 | 修改脚本如下：select * from table_B_1;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的dorissql任务A |
| 3 | 修改脚本如下：select * from table_B_2;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 4 | 修改脚本如下：select * from schema_B.table_B_2;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的dorissql任务D |
| 6 | 修改脚本如下：create table table_C_1 like table_A;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的dorissql任务C、E |
| 9 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 10 | 修改脚本如下：select * from table_A;select * from table_B_1;select * from table_B_2;select * from schema_B.table_B_2;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下：空 |
| 11 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 12 |  | 1）自动依赖任务如下： |
| 13 |  | a）租户A，项目B下的dorissql任务A、B |
| 14 |  | b）租户A，项目A下的dorissql任务B |
| 15 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 16 |  | 1）自动依赖任务如下： |
| 17 |  | a）租户A，项目B下的dorissql任务A |
| 18 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 19 |  | 1）自动依赖任务如下： |
| 20 |  | a）租户A，项目B下的dorissql任务A |
| 21 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 22 |  | 1）自动依赖任务如下： |
| 23 |  | a）租户A，项目B下的dorissql任务A、B |
| 24 |  | b）租户A，项目A下的dorissql任务B |
| 25 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 26 |  | 1）自动依赖任务如下： |
| 27 |  | a）租户A，项目B下的dorissql任务A |
| 28 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 29 |  | 1）自动依赖任务如下： |
| 30 |  | a）租户A，项目B下的dorissql任务A、B、C、D、E |
| 31 |  | b）租户A，项目A下的dorissql任务B |
| 32 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |

##### 验证dorissql任务间任务依赖功能正常_dorissql初始化方式创建_手动依赖_手动添加 「P1」

> 前置条件
```
1）项目A、项目B的dorissql引擎的初始化方式均为创建
2）dorissql任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）dorissql任务A：create table table_A;
b）dorissql任务B：create table schema_B.table_B_1;
c）dorissql任务C：create table table_B_2 as select * from table_A;
d）dorissql任务D：insert into table_B_1 select * from table_A;
e）dorissql任务E：insert overwrite table table_B_2 select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;

3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建dorissql任务A1，脚本如下：select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 2 | 修改脚本如下：select * from table_B_1;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 3 | 修改脚本如下：select * from table_B_2;保存并提交 | a）租户A，项目B下的dorissql任务A |
| 4 | 修改脚本如下：select * from schema_B.table_B_2;保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 6 | 修改脚本如下：create table table_C_1 like table_A;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;保存并提交 | a）租户A，项目B下的dorissql任务D |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 9 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 10 | 修改脚本如下：select * from table_A;select * from table_B_1;select * from table_B_2;select * from schema_B.table_B_2;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 11 |  | a）租户A，项目B下的dorissql任务C、E |
| 12 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 13 |  | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 14 |  | 进入【任务依赖配置有误】弹窗： |
| 15 |  | 1）展示缺失上游依赖任务如下： |
| 16 |  | a）租户A，项目B下的dorissql任务A、B |
| 17 |  | b）租户A，项目A下的dorissql任务B |
| 18 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 19 |  | 进入【任务依赖配置有误】弹窗： |
| 20 |  | 1）展示缺失上游依赖任务如下： |
| 21 |  | a）租户A，项目B下的dorissql任务A |
| 22 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 23 |  | 进入【任务依赖配置有误】弹窗： |
| 24 |  | 1）展示缺失上游依赖任务如下： |
| 25 |  | a）租户A，项目B下的dorissql任务A |
| 26 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 27 |  | 进入【任务依赖配置有误】弹窗： |
| 28 |  | 1）展示缺失上游依赖任务如下： |
| 29 |  | a）租户A，项目B下的dorissql任务A、B |
| 30 |  | b）租户A，项目A下的dorissql任务B |
| 31 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 32 |  | 进入【任务依赖配置有误】弹窗： |
| 33 |  | 1）展示缺失上游依赖任务如下： |
| 34 |  | a）租户A，项目B下的dorissql任务A |
| 35 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 36 |  | 进入【任务依赖配置有误】弹窗： |
| 37 |  | 1）展示缺失上游依赖任务如下： |
| 38 |  | a）租户A，项目B下的dorissql任务A、B、C、D、E |
| 39 |  | b）租户A，项目A下的dorissql任务B |
| 40 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证dorissql任务间任务依赖功能正常_dorissql初始化方式创建_手动依赖_依赖推荐 「P2」

> 前置条件
```
1）项目A、项目B的dorissql引擎的初始化方式均为创建
2）dorissql任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）dorissql任务A：create table table_A;
b）dorissql任务B：create table schema_B.table_B_1;
c）dorissql任务C：create table table_B_2 as select * from table_A;
d）dorissql任务D：insert into table_B_1 select * from table_A;
e）dorissql任务E：insert overwrite table table_B_2 select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;

3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建dorissql任务A1，脚本如下：select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 2 | 修改脚本如下：select * from table_B_1;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的dorissql任务A |
| 3 | 修改脚本如下：select * from table_B_2;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 4 | 修改脚本如下：select * from schema_B.table_B_2;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）展示缺失上游依赖任务如下： |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | i）租户A，项目B下的dorissql任务A |
| 6 | 修改脚本如下：create table table_C_1 like table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的dorissql任务D |
| 9 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 10 | 修改脚本如下：select * from table_A;select * from table_B_1;select * from table_B_2;select * from schema_B.table_B_2;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）展示缺失上游依赖任务如下： |
| 11 |  | i）租户A，项目B下的dorissql任务D |
| 12 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 13 |  | 1）依赖推荐任务如下： |
| 14 |  | a）租户A，项目B下的dorissql任务C、E |
| 15 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 16 |  | a）展示缺失上游依赖任务如下： |
| 17 |  | i）租户A，项目B下的dorissql任务C、E |
| 18 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 19 |  | 1）依赖推荐任务如下：空 |
| 20 |  | 2）未添加推荐依赖，保存并提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 21 |  | 1）依赖推荐任务如下： |
| 22 |  | a）租户A，项目B下的dorissql任务A、B |
| 23 |  | b）租户A，项目A下的dorissql任务B |
| 24 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 25 |  | a）展示缺失上游依赖任务如下： |
| 26 |  | i）租户A，项目B下的dorissql任务A、B |
| 27 |  | ii）租户A，项目A下的dorissql任务B |
| 28 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 29 |  | 1）依赖推荐任务如下： |
| 30 |  | a）租户A，项目B下的dorissql任务A |
| 31 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 32 |  | a）展示缺失上游依赖任务如下： |
| 33 |  | i）租户A，项目B下的dorissql任务A |
| 34 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 35 |  | 1）依赖推荐任务如下： |
| 36 |  | a）租户A，项目B下的dorissql任务A |
| 37 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 38 |  | a）展示缺失上游依赖任务如下： |
| 39 |  | i）租户A，项目B下的dorissql任务A |
| 40 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 41 |  | 1）依赖推荐任务如下： |
| 42 |  | a）租户A，项目B下的dorissql任务A、B |
| 43 |  | b）租户A，项目A下的dorissql任务B |
| 44 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 45 |  | a）展示缺失上游依赖任务如下： |
| 46 |  | i）租户A，项目B下的dorissql任务A、B |
| 47 |  | ii）租户A，项目A下的dorissql任务B |
| 48 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 49 |  | 1）依赖推荐任务如下： |
| 50 |  | a）租户A，项目B下的dorissql任务A |
| 51 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 52 |  | a）展示缺失上游依赖任务如下： |
| 53 |  | i）租户A，项目B下的dorissql任务A |
| 54 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 55 |  | 1）依赖推荐任务如下： |
| 56 |  | a）租户A，项目B下的dorissql任务A、B、C、D、E |
| 57 |  | b）租户A，项目A下的dorissql任务B |
| 58 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 59 |  | a）展示缺失上游依赖任务如下： |
| 60 |  | i）租户A，项目B下的dorissql任务A、B、C、D、E |
| 61 |  | ii）租户A，项目A下的dorissql任务B |
| 62 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证dorissql任务间任务依赖功能正常_dorissql初始化方式不创建且不对接schema_自动依赖 「P2」

> 前置条件
```
1）项目A、项目B的dorissql引擎的初始化方式均为不创建且不对接schema
2）dorissql任务（租户A下，在项目A、项目B均配置以下任务且已提交，所选schema均为schema_C）：
a）dorissql任务A：create table table_A;
b）dorissql任务B：create table schema_B.table_B_1;
c）dorissql任务C：create table schema_B.table_B_2 as select * from table_A;
d）dorissql任务D：insert into schema_B.table_B_1 select * from table_A;
e）dorissql任务E：insert overwrite table schema_B.table_B_2 select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;

3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建dorissql任务A1，选择schema_C，脚本如下：select * from schema_B.table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下：空 |
| 2 | 修改脚本如下：select * from schema_B.table_B_1;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 修改脚本如下：select * from schema_B.table_B_2;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下： |
| 4 | 修改脚本如下：select * from table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | a）租户A，项目A下的dorissql任务B、D |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;【调度属性-任务间依赖】选择“自动依赖”，刷新 | b）租户A，项目B下的dorissql任务B、D |
| 6 | 修改脚本如下：create table table_C_1 like table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下： |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | a）租户A，项目A下的dorissql任务C、E |
| 9 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“自动依赖”，刷新 | b）租户A，项目B下的dorissql任务C、E |
| 10 | 修改脚本如下：select * from schema_B.table_A;select * from schema_B.table_B_1;select * from schema_B.table_B_2;select * from table_A;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 11 |  | 1）自动依赖任务如下： |
| 12 |  | a）租户A，项目A下的dorissql任务A |
| 13 |  | b）租户A，项目B下的dorissql任务A |
| 14 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 15 |  | 1）自动依赖任务如下： |
| 16 |  | a）租户A，项目A下的dorissql任务A、B、C、D、E |
| 17 |  | b）租户A，项目B下的dorissql任务A、B、C、D、E |
| 18 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 19 |  | 1）自动依赖任务如下： |
| 20 |  | a）租户A，项目A下的dorissql任务A |
| 21 |  | b）租户A，项目B下的dorissql任务A |
| 22 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 23 |  | 1）自动依赖任务如下： |
| 24 |  | a）租户A，项目A下的dorissql任务A |
| 25 |  | b）租户A，项目B下的dorissql任务A |
| 26 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 27 |  | 1）自动依赖任务如下： |
| 28 |  | a）租户A，项目A下的dorissql任务A、B、D |
| 29 |  | b）租户A，项目B下的dorissql任务A、B、D |
| 30 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 31 |  | 1）自动依赖任务如下： |
| 32 |  | a）租户A，项目A下的dorissql任务A |
| 33 |  | b）租户A，项目B下的dorissql任务A |
| 34 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 35 |  | 1）自动依赖任务如下： |
| 36 |  | a）租户A，项目A下的dorissql任务A、B、C、D、E |
| 37 |  | b）租户A，项目B下的dorissql任务A、B、C、D、E |
| 38 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |

##### 验证dorissql任务间任务依赖功能正常_dorissql初始化方式不创建且不对接schema_手动依赖_手动添加 「P1」

> 前置条件
```
1）项目A、项目B的dorissql引擎的初始化方式均为不创建且不对接schema
2）dorissql任务（租户A下，在项目A、项目B均配置以下任务且已提交，所选schema均为schema_C）：
a）dorissql任务A：create table table_A;
b）dorissql任务B：create table schema_B.table_B_1;
c）dorissql任务C：create table schema_B.table_B_2 as select * from table_A;
d）dorissql任务D：insert into schema_B.table_B_1 select * from table_A;
e）dorissql任务E：insert overwrite table schema_B.table_B_2 select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;

3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建dorissql任务A1，选择schema_C，脚本如下：select * from schema_B.table_A;【调度属性-任务间依赖】选择“手动依赖”，保存并提交 | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 2 | 修改脚本如下：select * from schema_B.table_B_1;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 3 | 修改脚本如下：select * from schema_B.table_B_2;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 4 | 修改脚本如下：select * from table_A;保存并提交 | a）租户A，项目A下的dorissql任务B、D |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;保存并提交 | b）租户A，项目B下的dorissql任务B、D |
| 6 | 修改脚本如下：create table table_C_1 like table_A;保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 9 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;保存并提交 | a）租户A，项目A下的dorissql任务C、E |
| 10 | 修改脚本如下：select * from schema_B.table_A;select * from schema_B.table_B_1;select * from schema_B.table_B_2;select * from table_A;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;保存并提交 | b）租户A，项目B下的dorissql任务C、E |
| 11 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 12 |  | 进入【任务依赖配置有误】弹窗： |
| 13 |  | 1）展示缺失上游依赖任务如下： |
| 14 |  | a）租户A，项目A下的dorissql任务A |
| 15 |  | b）租户A，项目B下的dorissql任务A |
| 16 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 17 |  | 进入【任务依赖配置有误】弹窗： |
| 18 |  | 1）展示缺失上游依赖任务如下： |
| 19 |  | a）租户A，项目A下的dorissql任务A、B、C、D、E |
| 20 |  | b）租户A，项目B下的dorissql任务A、B、C、D、E |
| 21 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 22 |  | 进入【任务依赖配置有误】弹窗： |
| 23 |  | 1）展示缺失上游依赖任务如下： |
| 24 |  | a）租户A，项目A下的dorissql任务A |
| 25 |  | b）租户A，项目B下的dorissql任务A |
| 26 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 27 |  | 进入【任务依赖配置有误】弹窗： |
| 28 |  | 1）展示缺失上游依赖任务如下： |
| 29 |  | a）租户A，项目A下的dorissql任务A |
| 30 |  | b）租户A，项目B下的dorissql任务A |
| 31 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 32 |  | 进入【任务依赖配置有误】弹窗： |
| 33 |  | 1）展示缺失上游依赖任务如下： |
| 34 |  | a）租户A，项目A下的dorissql任务A、B、D |
| 35 |  | b）租户A，项目B下的dorissql任务A、B、D |
| 36 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 37 |  | 进入【任务依赖配置有误】弹窗： |
| 38 |  | 1）展示缺失上游依赖任务如下： |
| 39 |  | a）租户A，项目A下的dorissql任务A |
| 40 |  | b）租户A，项目B下的dorissql任务A |
| 41 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 42 |  | 进入【任务依赖配置有误】弹窗： |
| 43 |  | 1）展示缺失上游依赖任务如下： |
| 44 |  | a）租户A，项目A下的dorissql任务A、B、C、D、E |
| 45 |  | b）租户A，项目B下的dorissql任务A、B、C、D、E |
| 46 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证dorissql任务间任务依赖功能正常_dorissql初始化方式不创建且不对接schema_手动依赖_依赖推荐 「P1」

> 前置条件
```
1）项目A、项目B的dorissql引擎的初始化方式均为不创建且不对接schema
2）dorissql任务（租户A下，在项目A、项目B均配置以下任务且已提交，所选schema均为schema_C）：
a）dorissql任务A：create table table_A;
b）dorissql任务B：create table schema_B.table_B_1;
c）dorissql任务C：create table schema_B.table_B_2 as select * from table_A;
d）dorissql任务D：insert into schema_B.table_B_1 select * from table_A;
e）dorissql任务E：insert overwrite table schema_B.table_B_2 select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;

3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建dorissql任务A1，选择schema_C，脚本如下：select * from schema_B.table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下：空 |
| 2 | 修改脚本如下：select * from schema_B.table_B_1;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 修改脚本如下：select * from schema_B.table_B_2;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 4 | 修改脚本如下：select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目A下的dorissql任务B、D |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | b）租户A，项目B下的dorissql任务B、D |
| 6 | 修改脚本如下：create table table_C_1 like table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）展示缺失上游依赖任务如下： |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | i）租户A，项目A下的dorissql任务B、D |
| 9 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | ii）租户A，项目B下的dorissql任务B、D |
| 10 | 修改脚本如下：select * from schema_B.table_A;select * from schema_B.table_B_1;select * from schema_B.table_B_2;select * from table_A;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 11 |  | 1）依赖推荐任务如下： |
| 12 |  | a）租户A，项目A下的dorissql任务C、E |
| 13 |  | b）租户A，项目B下的dorissql任务C、E |
| 14 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 15 |  | a）展示缺失上游依赖任务如下： |
| 16 |  | i）租户A，项目A下的dorissql任务C、E |
| 17 |  | ii）租户A，项目B下的dorissql任务C、E |
| 18 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 19 |  | 1）依赖推荐任务如下： |
| 20 |  | a）租户A，项目A下的dorissql任务A |
| 21 |  | b）租户A，项目B下的dorissql任务A |
| 22 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 23 |  | a）展示缺失上游依赖任务如下： |
| 24 |  | i）租户A，项目A下的dorissql任务A |
| 25 |  | ii）租户A，项目B下的dorissql任务A |
| 26 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 27 |  | 1）依赖推荐任务如下： |
| 28 |  | a）租户A，项目A下的dorissql任务A、B、C、D、E |
| 29 |  | b）租户A，项目B下的dorissql任务A、B、C、D、E |
| 30 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 31 |  | a）展示缺失上游依赖任务如下： |
| 32 |  | a）租户A，项目A下的dorissql任务A、B、C、D、E |
| 33 |  | b）租户A，项目B下的dorissql任务A、B、C、D、E |
| 34 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 35 |  | 1）依赖推荐任务如下： |
| 36 |  | a）租户A，项目A下的dorissql任务A |
| 37 |  | b）租户A，项目B下的dorissql任务A |
| 38 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 39 |  | a）展示缺失上游依赖任务如下： |
| 40 |  | i）租户A，项目A下的dorissql任务A |
| 41 |  | ii）租户A，项目B下的dorissql任务A |
| 42 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 43 |  | 1）依赖推荐任务如下： |
| 44 |  | a）租户A，项目A下的dorissql任务A |
| 45 |  | b）租户A，项目B下的dorissql任务A |
| 46 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 47 |  | a）展示缺失上游依赖任务如下： |
| 48 |  | i）租户A，项目A下的dorissql任务A |
| 49 |  | ii）租户A，项目B下的dorissql任务A |
| 50 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 51 |  | 1）依赖推荐任务如下： |
| 52 |  | a）租户A，项目A下的dorissql任务A、B、D |
| 53 |  | b）租户A，项目B下的dorissql任务A、B、D |
| 54 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 55 |  | a）展示缺失上游依赖任务如下： |
| 56 |  | i）租户A，项目A下的dorissql任务A、B、D |
| 57 |  | ii）租户A，项目B下的dorissql任务A、B、D |
| 58 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 59 |  | 1）依赖推荐任务如下： |
| 60 |  | a）租户A，项目A下的dorissql任务A |
| 61 |  | b）租户A，项目B下的dorissql任务A |
| 62 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 63 |  | a）展示缺失上游依赖任务如下： |
| 64 |  | i）租户A，项目A下的dorissql任务A |
| 65 |  | ii）租户A，项目B下的dorissql任务A |
| 66 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 67 |  | 1）依赖推荐任务如下： |
| 68 |  | a）租户A，项目A下的dorissql任务A、B、C、D、E |
| 69 |  | b）租户A，项目B下的dorissql任务A、B、C、D、E |
| 70 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 71 |  | a）展示缺失上游依赖任务如下： |
| 72 |  | i）租户A，项目A下的dorissql任务A、B、C、D、E |
| 73 |  | ii）租户A，项目B下的dorissql任务A、B、C、D、E |
| 74 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证dorissql任务与数据同步间任务依赖功能正常_dorissql初始化方式创建_自动依赖 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：doris_B数据源（meta数据源）
c）数据源C：doris_C数据源（非meta数据源，但与doris_meta数据源不是同一个doris源）

2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_meta.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；

3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建dorissql任务A1，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下： |
| 2 | 修改脚本如下：select * from schema_B.table_B;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的数据同步任务A |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 4 | 修改脚本如下：create table table_C_1 like table_B;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的数据同步任务B |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;【调度属性-任务间依赖】的自动依赖，刷新 | b）租户A，项目A下的数据同步任务B |
| 7 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 8 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 9 |  | a）租户A，项目B下的数据同步任务A、B |
| 10 |  | b）租户A，项目A下的数据同步任务B |
| 11 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 12 |  | 1）自动依赖任务如下： |
| 13 |  | a）租户A，项目B下的数据同步任务A |
| 14 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 15 |  | 1）自动依赖任务如下： |
| 16 |  | a）租户A，项目B下的数据同步任务B |
| 17 |  | b）租户A，项目A下的数据同步任务B |
| 18 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 19 |  | 1）自动依赖任务如下： |
| 20 |  | a）租户A，项目B下的数据同步任务A、B |
| 21 |  | b）租户A，项目A下的数据同步任务B |
| 22 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 23 |  | 1）自动依赖任务如下： |
| 24 |  | a）租户A，项目B下的数据同步任务A、B |
| 25 |  | b）租户A，项目A下的数据同步任务B |
| 26 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 27 |  | 1）自动依赖任务如下： |
| 28 |  | a）租户A，项目B下的数据同步任务A、B |
| 29 |  | b）租户A，项目A下的数据同步任务B |
| 30 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |

##### 验证dorissql任务与数据同步间任务依赖功能正常_dorissql初始化方式创建_手动依赖_手动添加 「P1」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：doris_B数据源（meta数据源）
c）数据源C：doris_C数据源（非meta数据源，但与doris_meta数据源不是同一个doris源）

2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_meta.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；

3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建dorissql任务A1，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 2 | 修改脚本如下：select * from schema_B.table_B;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;保存并提交 | a）租户A，项目B下的数据同步任务A |
| 4 | 修改脚本如下：create table table_C_1 like table_B;保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 7 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;保存并提交 | a）租户A，项目B下的数据同步任务B |
| 8 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;保存并提交 | b）租户A，项目A下的数据同步任务B |
| 9 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 10 |  | 进入【任务依赖配置有误】弹窗： |
| 11 |  | 1）展示缺失上游依赖任务如下： |
| 12 |  | a）租户A，项目B下的数据同步任务A、B |
| 13 |  | b）租户A，项目A下的数据同步任务B |
| 14 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 15 |  | 进入【任务依赖配置有误】弹窗： |
| 16 |  | 1）展示缺失上游依赖任务如下： |
| 17 |  | a）租户A，项目B下的数据同步任务A |
| 18 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 19 |  | 进入【任务依赖配置有误】弹窗： |
| 20 |  | 1）展示缺失上游依赖任务如下： |
| 21 |  | a）租户A，项目B下的数据同步任务B |
| 22 |  | b）租户A，项目A下的数据同步任务B |
| 23 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 24 |  | 进入【任务依赖配置有误】弹窗： |
| 25 |  | 1）展示缺失上游依赖任务如下： |
| 26 |  | a）租户A，项目B下的数据同步任务A、B |
| 27 |  | b）租户A，项目A下的数据同步任务B |
| 28 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 29 |  | 进入【任务依赖配置有误】弹窗： |
| 30 |  | 1）展示缺失上游依赖任务如下： |
| 31 |  | a）租户A，项目B下的数据同步任务A、B |
| 32 |  | b）租户A，项目A下的数据同步任务B |
| 33 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 34 |  | 进入【任务依赖配置有误】弹窗： |
| 35 |  | 1）展示缺失上游依赖任务如下： |
| 36 |  | a）租户A，项目B下的数据同步任务A、B |
| 37 |  | b）租户A，项目A下的数据同步任务B |
| 38 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证dorissql任务与数据同步间任务依赖功能正常_dorissql初始化方式创建_手动依赖_依赖推荐 「P1」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：doris_B数据源（meta数据源）
c）数据源C：doris_C数据源（非meta数据源，但与doris_meta数据源不是同一个doris源）

2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_meta.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；

3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建dorissql任务A1，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）自动依赖任务如下： |
| 2 | 修改脚本如下：select * from schema_B.table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的数据同步任务A |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 4 | 修改脚本如下：create table table_C_1 like table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）展示缺失上游依赖任务如下： |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | i）租户A，项目B下的数据同步任务A |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 7 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 8 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的数据同步任务B |
| 9 |  | b）租户A，项目A下的数据同步任务B |
| 10 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 11 |  | a）展示缺失上游依赖任务如下： |
| 12 |  | i）租户A，项目B下的数据同步任务B |
| 13 |  | ii）租户A，项目A下的数据同步任务B |
| 14 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 15 |  | 1）依赖推荐任务如下： |
| 16 |  | a）租户A，项目B下的数据同步任务A、B |
| 17 |  | b）租户A，项目A下的数据同步任务B |
| 18 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 19 |  | a）展示缺失上游依赖任务如下： |
| 20 |  | i）租户A，项目B下的数据同步任务A、B |
| 21 |  | ii）租户A，项目A下的数据同步任务B |
| 22 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 23 |  | 1）依赖推荐任务如下： |
| 24 |  | a）租户A，项目B下的数据同步任务A |
| 25 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 26 |  | a）展示缺失上游依赖任务如下： |
| 27 |  | i）租户A，项目B下的数据同步任务A |
| 28 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 29 |  | 1）依赖推荐任务如下： |
| 30 |  | a）租户A，项目B下的数据同步任务B |
| 31 |  | b）租户A，项目A下的数据同步任务B |
| 32 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 33 |  | a）展示缺失上游依赖任务如下： |
| 34 |  | i）租户A，项目B下的数据同步任务B |
| 35 |  | ii）租户A，项目A下的数据同步任务B |
| 36 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 37 |  | 1）依赖推荐任务如下： |
| 38 |  | a）租户A，项目B下的数据同步任务A、B |
| 39 |  | b）租户A，项目A下的数据同步任务B |
| 40 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 41 |  | a）展示缺失上游依赖任务如下： |
| 42 |  | i）租户A，项目B下的数据同步任务A、B |
| 43 |  | ii）租户A，项目A下的数据同步任务B |
| 44 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 45 |  | 1）依赖推荐任务如下： |
| 46 |  | a）租户A，项目B下的数据同步任务A、B |
| 47 |  | b）租户A，项目A下的数据同步任务B |
| 48 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 49 |  | a）展示缺失上游依赖任务如下： |
| 50 |  | i）租户A，项目B下的数据同步任务A、B |
| 51 |  | ii）租户A，项目A下的数据同步任务B |
| 52 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 53 |  | 1）依赖推荐任务如下： |
| 54 |  | a）租户A，项目B下的数据同步任务A、B |
| 55 |  | b）租户A，项目A下的数据同步任务B |
| 56 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 57 |  | a）展示缺失上游依赖任务如下： |
| 58 |  | i）租户A，项目B下的数据同步任务A、B |
| 59 |  | ii）租户A，项目A下的数据同步任务B |
| 60 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证dorissql任务与数据同步间任务依赖功能正常_dorissql初始化方式不创建且不对接schema_自动依赖 「P1」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：doris_B数据源（meta数据源）
c）数据源C：doris_C数据源（非meta数据源，但与doris_meta数据源不是同一个doris源）
2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_A.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；
3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建dorissql任务A1，选择schema_C，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下：无 |
| 2 | 修改脚本如下：select * from schema_B.table_B;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 4 | 修改脚本如下：create table table_C_1 like table_B;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的数据同步任务B |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;【调度属性-任务间依赖】的自动依赖，刷新 | b）租户A，项目A下的数据同步任务B |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 7 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 8 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的数据同步任务B |
| 9 |  | b）租户A，项目A下的数据同步任务B |
| 10 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 11 |  | 1）自动依赖任务如下：无 |
| 12 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 13 |  | 1）自动依赖任务如下： |
| 14 |  | a）租户A，项目B下的数据同步任务B |
| 15 |  | b）租户A，项目A下的数据同步任务B |
| 16 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 17 |  | 1）自动依赖任务如下： |
| 18 |  | a）租户A，项目B下的数据同步任务B |
| 19 |  | b）租户A，项目A下的数据同步任务B |
| 20 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 21 |  | 1）自动依赖任务如下： |
| 22 |  | a）租户A，项目B下的数据同步任务B |
| 23 |  | b）租户A，项目A下的数据同步任务B |
| 24 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 25 |  | 1）自动依赖任务如下： |
| 26 |  | a）租户A，项目B下的数据同步任务B |
| 27 |  | b）租户A，项目A下的数据同步任务B |
| 28 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |

##### 验证dorissql任务与数据同步间任务依赖功能正常_dorissql初始化方式不创建且不对接schema_手动依赖_手动添加 「P1」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：doris_B数据源（meta数据源）
c）数据源C：doris_C数据源（非meta数据源，但与doris_meta数据源不是同一个doris源）
2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_A.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；
3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建dorissql任务A1，选择schema_C，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，保存并提交 | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 2 | 修改脚本如下：select * from schema_B.table_B;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 4 | 修改脚本如下：create table table_C_1 like table_B;保存并提交 | a）租户A，项目B下的数据同步任务B |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;保存并提交 | b）租户A，项目A下的数据同步任务B |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 7 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 8 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 9 |  | a）租户A，项目B下的数据同步任务B |
| 10 |  | b）租户A，项目A下的数据同步任务B |
| 11 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 12 |  | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 13 |  | 进入【任务依赖配置有误】弹窗： |
| 14 |  | 1）展示缺失上游依赖任务如下： |
| 15 |  | a）租户A，项目B下的数据同步任务B |
| 16 |  | b）租户A，项目A下的数据同步任务B |
| 17 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 18 |  | 进入【任务依赖配置有误】弹窗： |
| 19 |  | 1）展示缺失上游依赖任务如下： |
| 20 |  | a）租户A，项目B下的数据同步任务B |
| 21 |  | b）租户A，项目A下的数据同步任务B |
| 22 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 23 |  | 进入【任务依赖配置有误】弹窗： |
| 24 |  | 1）展示缺失上游依赖任务如下： |
| 25 |  | a）租户A，项目B下的数据同步任务B |
| 26 |  | b）租户A，项目A下的数据同步任务B |
| 27 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 28 |  | 进入【任务依赖配置有误】弹窗： |
| 29 |  | 1）展示缺失上游依赖任务如下： |
| 30 |  | a）租户A，项目B下的数据同步任务B |
| 31 |  | b）租户A，项目A下的数据同步任务B |
| 32 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证dorissql任务与数据同步间任务依赖功能正常_dorissql初始化方式不创建且不对接schema_手动依赖_依赖推荐 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：doris_B数据源（meta数据源）
c）数据源C：doris_C数据源（非meta数据源，但与doris_meta数据源不是同一个doris源）
2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_A.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；
3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建dorissql任务A1，选择schema_C，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）自动依赖任务如下：无 |
| 2 | 修改脚本如下：select * from schema_B.table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 4 | 修改脚本如下：create table table_C_1 like table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的数据同步任务B |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | b）租户A，项目A下的数据同步任务B |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 7 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）展示缺失上游依赖任务如下： |
| 8 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | i）租户A，项目B下的数据同步任务B |
| 9 |  | ii）租户A，项目A下的数据同步任务B |
| 10 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 11 |  | 1）依赖推荐任务如下： |
| 12 |  | a）租户A，项目B下的数据同步任务B |
| 13 |  | b）租户A，项目A下的数据同步任务B |
| 14 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 15 |  | a）展示缺失上游依赖任务如下： |
| 16 |  | i）租户A，项目B下的数据同步任务B |
| 17 |  | ii）租户A，项目A下的数据同步任务B |
| 18 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 19 |  | 1）依赖推荐任务如下：无 |
| 20 |  | 2）未添加推荐依赖，保存并提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 21 |  | 1）依赖推荐任务如下： |
| 22 |  | a）租户A，项目B下的数据同步任务B |
| 23 |  | b）租户A，项目A下的数据同步任务B |
| 24 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 25 |  | a）展示缺失上游依赖任务如下： |
| 26 |  | i）租户A，项目B下的数据同步任务B |
| 27 |  | ii）租户A，项目A下的数据同步任务B |
| 28 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 29 |  | 1）依赖推荐任务如下： |
| 30 |  | a）租户A，项目B下的数据同步任务B |
| 31 |  | b）租户A，项目A下的数据同步任务B |
| 32 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 33 |  | a）展示缺失上游依赖任务如下： |
| 34 |  | i）租户A，项目B下的数据同步任务B |
| 35 |  | ii）租户A，项目A下的数据同步任务B |
| 36 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 37 |  | 1）依赖推荐任务如下： |
| 38 |  | a）租户A，项目B下的数据同步任务B |
| 39 |  | b）租户A，项目A下的数据同步任务B |
| 40 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 41 |  | a）展示缺失上游依赖任务如下： |
| 42 |  | i）租户A，项目B下的数据同步任务B |
| 43 |  | ii）租户A，项目A下的数据同步任务B |
| 44 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 45 |  | 1）依赖推荐任务如下： |
| 46 |  | a）租户A，项目B下的数据同步任务B |
| 47 |  | b）租户A，项目A下的数据同步任务B |
| 48 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 49 |  | a）展示缺失上游依赖任务如下： |
| 50 |  | i）租户A，项目B下的数据同步任务B |
| 51 |  | ii）租户A，项目A下的数据同步任务B |
| 52 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证dorissql任务依赖功能正常_切换doris运行集群_自动依赖 「P1」

> 前置条件
```
1）dorissql任务（租户A下，在项目B均配置以下任务且已提交）：
a）dorissql任务A（doris_A引擎初始化方式为创建）：create table table_A;
b）dorissql任务B（doris_A引擎初始化方式为创建）：create table schema_B.table_A;
c）dorissql任务C（doris_A引擎初始化方式为创建）：insert into table_C_1 select * from table_A;
d）dorissql任务D（doris_A引擎初始化方式为创建）：insert into schema_B.table_C_1 select * from table_A;
e）dorissql任务E（doris_B引擎初始化方式为创建）：create table table_A;
f）dorissql任务F（doris_B引擎初始化方式为创建）：create table schema_B.table_A;
g）dorissql任务G（doris_B引擎初始化方式为创建）：insert into table_C_1 select * from table_A;
h）dorissql任务H（doris_B引擎初始化方式为创建）：insert into schema_B.table_C_1 select * from table_A;
2）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建dorissql任务A1（运行集群为doris_A），脚本如下：select * from table_A;select * from schema_B.table_A;select * from table_C_1;select * from schema_B.table_C_1;【调度属性-任务间依赖】选择“自动依赖”，点击“刷新” | 1）自动依赖任务如下： |
| 2 | 运行集群切换至doris_B | a）租户A，项目B下的dorissql任务A、B、C、D |
| 3 | 修改前置dorissql任务F的运行集群为“doris_A”，保存并提交 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 4 | 进入dorissql任务A1任务的【调度属性-任务间依赖】页面，点击“刷新” | 【调度属性-任务间依赖】刷新自动依赖任务： |
| 5 |  | 1）自动依赖任务如下： |
| 6 |  | a）租户A，项目B下的dorissql任务E、F、G、H |
| 7 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 8 |  | 前置dorissql任务F保存并提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 9 |  | 【调度属性-任务间依赖】刷新自动依赖任务： |
| 10 |  | 1）自动依赖任务如下： |
| 11 |  | a）租户A，项目B下的dorissql任务E、G、H |
| 12 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |

##### 验证dorissql任务依赖功能正常_切换doris运行集群_手动依赖_手动添加 「P1」

> 前置条件
```
1）dorissql任务（租户A下，在项目B均配置以下任务且已提交）：
a）dorissql任务A（doris_A引擎初始化方式为创建）：create table table_A;
b）dorissql任务B（doris_A引擎初始化方式为创建）：create table schema_B.table_A;
c）dorissql任务C（doris_A引擎初始化方式为创建）：insert into table_C_1 select * from table_A;
d）dorissql任务D（doris_A引擎初始化方式为创建）：insert into schema_B.table_C_1 select * from table_A;
e）dorissql任务E（doris_B引擎初始化方式为创建）：create table table_A;
f）dorissql任务F（doris_B引擎初始化方式为创建）：create table schema_B.table_A;
g）dorissql任务G（doris_B引擎初始化方式为创建）：insert into table_C_1 select * from table_A;
h）dorissql任务H（doris_B引擎初始化方式为创建）：insert into schema_B.table_C_1 select * from table_A;
2）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建dorissql任务A1（运行集群为doris_A），脚本如下：select * from table_A;select * from schema_B.table_A;select * from table_C_1;select * from schema_B.table_C_1;【调度属性-任务间依赖】选择“自动依赖”，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 2 | 运行集群切换至doris_B，保存并提交任务 | 1）展示缺失上游依赖任务如下： |
| 3 | 修改前置dorissql任务F的运行集群为“doris_A”，保存并提交 | a）租户A，项目B下的dorissql任务A、B、C、D |
| 4 | 进入dorissql任务A1任务的【调度属性-任务间依赖】页面，保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 5 |  | 进入【任务依赖配置有误】弹窗： |
| 6 |  | 1）展示缺失上游依赖任务如下： |
| 7 |  | a）租户A，项目B下的dorissql任务E、F、G、H |
| 8 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 9 |  | 前置dorissql任务F保存并提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 10 |  | 进入【任务依赖配置有误】弹窗： |
| 11 |  | 1）展示缺失上游依赖任务如下： |
| 12 |  | a）租户A，项目B下的dorissql任务E、G、H |
| 13 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证dorissql任务依赖功能正常_切换doris运行集群_手动依赖_依赖推荐 「P2」

> 前置条件
```
1）dorissql任务（租户A下，在项目B均配置以下任务且已提交）：
a）dorissql任务A（doris_A引擎初始化方式为创建）：create table table_A;
b）dorissql任务B（doris_A引擎初始化方式为创建）：create table schema_B.table_A;
c）dorissql任务C（doris_A引擎初始化方式为创建）：insert into table_C_1 select * from table_A;
d）dorissql任务D（doris_A引擎初始化方式为创建）：insert into schema_B.table_C_1 select * from table_A;
e）dorissql任务E（doris_B引擎初始化方式为创建）：create table table_A;
f）dorissql任务F（doris_B引擎初始化方式为创建）：create table schema_B.table_A;
g）dorissql任务G（doris_B引擎初始化方式为创建）：insert into table_C_1 select * from table_A;
h）dorissql任务H（doris_B引擎初始化方式为创建）：insert into schema_B.table_C_1 select * from table_A;
2）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建dorissql任务A1（运行集群为doris_A），脚本如下：select * from table_A;select * from schema_B.table_A;select * from table_C_1;select * from schema_B.table_C_1;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 2 | 运行集群切换至doris_B，【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的dorissql任务A、B、C、D |
| 3 | 修改前置dorissql任务F的运行集群为“doris_A”，保存并提交 | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 4 | 进入dorissql任务A1任务的【调度属性-任务间依赖】页面，选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）展示缺失上游依赖任务如下： |
| 5 |  | i）租户A，项目B下的dorissql任务A、B、C、D |
| 6 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 7 |  | 1）依赖推荐任务如下： |
| 8 |  | a）租户A，项目B下的dorissql任务E、F、G、H |
| 9 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 10 |  | a）展示缺失上游依赖任务如下： |
| 11 |  | i）租户A，项目B下的dorissql任务E、F、G、H |
| 12 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 13 |  | 前置dorissql任务F保存并提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 14 |  | 1）依赖推荐任务如下： |
| 15 |  | a）租户A，项目B下的dorissql任务E、G、H |
| 16 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 17 |  | a）展示缺失上游依赖任务如下： |
| 18 |  | i）租户A，项目B下的dorissql任务E、G、H |
| 19 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证dorissql任务间任务依赖功能正常_50个依赖任务 「P2」

> 前置条件
```
1）项目A、项目B的dorissql引擎的初始化方式均为创建
2）dorissql任务（租户A下，在项目B配置以下任务且已提交）：
a）dorissql任务A1-A50：create table table_A;
b）dorissql任务B1-B50：create table table_B_${1-50};
3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-周期任务】页面，新建dorissql任务C，脚本如下：select * from table_A;【调度属性-任务间依赖】选择“自动依赖”，查看依赖任务 | 1）自动依赖任务如下： |
| 2 | 【调度属性-任务间依赖】切换为“手动依赖”，保存并提交 | a）租户A，项目B下的dorissql任务A1-A50 |
| 3 | 【调度属性-任务间依赖】切换为“手动依赖”，“添加依赖”选择“依赖推荐” | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 4 | 进入租户A下项目B的【数据开发-周期任务】页面，新建dorissql任务D，脚本如下：select * from table_B_1;...select * from table_B_50;【调度属性-任务间依赖】选择“自动依赖”，查看依赖任务 | 进入【任务依赖配置有误】弹窗： |
| 5 | 【调度属性-任务间依赖】切换为“手动依赖”，保存并提交 | 1）展示缺失上游依赖任务如下： |
| 6 | 【调度属性-任务间依赖】切换为“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的dorissql任务A1-A50 |
| 7 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 8 |  | 1）依赖推荐任务如下： |
| 9 |  | a）租户A，项目B下的dorissql任务A1-A50 |
| 10 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 11 |  | a）展示缺失上游依赖任务如下： |
| 12 |  | i）租户A，项目B下的dorissql任务A1-A50 |
| 13 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 14 |  | 1）自动依赖任务如下： |
| 15 |  | a）租户A，项目B下的dorissql任务B1-B50 |
| 16 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 17 |  | 进入【任务依赖配置有误】弹窗： |
| 18 |  | 1）展示缺失上游依赖任务如下： |
| 19 |  | a）租户A，项目B下的dorissql任务B1-B50 |
| 20 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 21 |  | 1）依赖推荐任务如下： |
| 22 |  | a）租户A，项目B下的dorissql任务B1-B50 |
| 23 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 24 |  | a）展示缺失上游依赖任务如下： |
| 25 |  | i）租户A，项目B下的dorissql任务B1-B50 |
| 26 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证数据同步任务间任务依赖功能正常_mysql2other 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql_A数据源；
b）数据源B：hive_A数据源（非meta数据源，但与hive_meta数据源为同一个hive源）；
c）数据源C：hive_B数据源（非meta数据源，但与hive_meta数据源不是同一个hive源）；

2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源A下schema_A.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源A下schema_B.table_A；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源A下schema_B.table_B；
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务A1，源表：数据源A下schema_A.table_B，目标表：数据源A下schema_A.table_C，其余内容均正常填写，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 2 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务B1，源表：数据源A下schema_B.table_A，目标表：数据源A下schema_A.table_C，其余内容均正常填写，保存并提交 | 1）展示缺失上游依赖任务如下： |
| 3 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务C1，源表：数据源A下schema_B.table_B，目标表：数据源A下schema_A.table_C，其余内容均正常填写，保存并提交 | a）租户A，项目A下的数据同步任务A |
| 4 |  | b）租户A，项目B下的数据同步任务A |
| 5 |  | 2）点击“确定”：回到任务编辑页面 |
| 6 |  | 3）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 7 |  | 进入【任务依赖配置有误】弹窗： |
| 8 |  | 1）展示缺失上游依赖任务如下： |
| 9 |  | a）租户A，项目A下的数据同步任务B |
| 10 |  | b）租户A，项目B下的数据同步任务B |
| 11 |  | 2）点击“确定”：回到任务编辑页面 |
| 12 |  | 3）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 13 |  | 进入【任务依赖配置有误】弹窗： |
| 14 |  | 1）展示缺失上游依赖任务如下： |
| 15 |  | a）租户A，项目A下的数据同步任务C |
| 16 |  | b）租户A，项目B下的数据同步任务C |
| 17 |  | 2）点击“确定”：回到任务编辑页面 |
| 18 |  | 3）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证数据同步任务间任务依赖功能正常_hive2other 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql_A数据源；
b）数据源B：hive_A数据源（非meta数据源，但与hive_meta数据源为同一个hive源）；
c）数据源C：hive_B数据源（非meta数据源，但与hive_meta数据源不是同一个hive源）；
2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务D：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_A.table_A；
b）数据同步任务E：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_A.table_B；
c）数据同步任务F：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_A；
d）数据同步任务G：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
e）数据同步任务G：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_A；
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务D1，源表：数据源B下schema_A.table_A，目标表：数据源A下schema_A.table_C，其余内容均正常填写，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 2 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务E1，源表：数据源B下schema_A.table_B，目标表：数据源A下schema_A.table_C，其余内容均正常填写，保存并提交 | 1）展示缺失上游依赖任务如下： |
| 3 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务F1，源表：数据源B下schema_B.table_A，目标表：数据源A下schema_A.table_C，其余内容均正常填写，保存并提交 | a）租户A，项目A下的数据同步任务D |
| 4 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务G1，源表：数据源B下schema_B.table_B，目标表：数据源A下schema_A.table_C，其余内容均正常填写，保存并提交 | b）租户A，项目B下的数据同步任务D |
| 5 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务H1，源表：数据源C下schema_A.table_B，目标表：数据源A下schema_A.table_C，其余内容均正常填写，保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 6 |  | 进入【任务依赖配置有误】弹窗： |
| 7 |  | 1）展示缺失上游依赖任务如下： |
| 8 |  | a）租户A，项目A下的数据同步任务E |
| 9 |  | b）租户A，项目B下的数据同步任务E |
| 10 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 11 |  | 进入【任务依赖配置有误】弹窗： |
| 12 |  | 1）展示缺失上游依赖任务如下： |
| 13 |  | a）租户A，项目A下的数据同步任务F |
| 14 |  | b）租户A，项目B下的数据同步任务F |
| 15 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 16 |  | 进入【任务依赖配置有误】弹窗： |
| 17 |  | 1）展示缺失上游依赖任务如下： |
| 18 |  | a）租户A，项目A下的数据同步任务G |
| 19 |  | b）租户A，项目B下的数据同步任务G |
| 20 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 21 |  | 没有【任务依赖配置有误】弹窗，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |

##### 验证hivesql任务与数据同步间任务依赖功能正常_数据同步任务 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：hive_A数据源（meta数据源）；
b）数据源B：hive_B数据源（非meta数据源，与hive_meta数据源不是同一个hive源）；
c）数据源C：hive_B数据源（非meta数据源，与hive_meta数据源是是同一个hive源）；
2)hviesql任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）hivesql任务A：create table table_A;
b）hivesql任务B：create table schema_B.table_A;
c）hivesql任务C：create table table_B as select * from table_A;
d）hivesql任务D：insert into table_B select * from table_A;
e）hivesql任务E：insert overwrite table table_B select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;
3）建表&插数据脚本：
--hivesql建表&插数据
CREATE TABLE if not exists hivesql_test
(
id int,
name string,
age int
);
insert into hivesql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务A，源表：数据源A下schema_meta.table_A，其余内容均正常填写，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 2 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务B，源表：数据源A下schema_B.table_A，其余内容均正常填写，保存并提交 | 1）展示缺失上游依赖任务如下： |
| 3 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务C，源表：数据源A下table_B，其余内容均正常填写，保存并提交 | a）租户A，项目B下的hivesql任务A |
| 4 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务D，源表：数据源B下schema_B.table_A，其余内容均正常填写，保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 5 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务E，源表：数据源C下schema_B.table_A，其余内容均正常填写，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 6 |  | 1）展示缺失上游依赖任务如下： |
| 7 |  | a）租户A，项目A下的hivesql任务B |
| 8 |  | B）租户A，项目B下的hivesql任务B |
| 9 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 10 |  | 进入【任务依赖配置有误】弹窗： |
| 11 |  | 1）展示缺失上游依赖任务如下： |
| 12 |  | a）租户A，项目B下的hivesql任务C、D、E |
| 13 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 14 |  | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 15 |  | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |

##### 验证mysql任务与数据同步间任务依赖功能正常_数据同步任务 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql_A数据源（meta数据源）；
b）数据源B：mysql_B数据源（非meta数据源，与mysql_meta数据源不是同一个mysql源）；
c）数据源B：mysql_B数据源（非meta数据源，与mysql_meta数据源是同一个mysql源）；
2)hviesql任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）mysqlsql任务A：create table table_A;
b）mysqlsql任务B：create table schema_B.table_A;
c）mysqlsql任务C：create table table_B as select * from table_A;
d）mysqlsql任务D：insert into table_B select * from table_A;
e）mysqlsql任务E：insert overwrite table table_B select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;
3）建表&插数据脚本：
--mysql建表&插数据
CREATE TABLE if not exists mysql_test
(
id int,
name varchar(256),
age int
);
insert into mysql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务A，源表：数据源A下schema_meta.table_A，其余内容均正常填写，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 2 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务B，源表：数据源A下schema_B.table_A，其余内容均正常填写，保存并提交 | 1）展示缺失上游依赖任务如下： |
| 3 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务C，源表：数据源A下table_B，其余内容均正常填写，保存并提交 | a）租户A，项目B下的mysql任务A |
| 4 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务D，源表：数据源B下schema_B.table_A，其余内容均正常填写，保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 5 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务E，源表：数据源C下schema_B.table_A，其余内容均正常填写，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 6 |  | 1）展示缺失上游依赖任务如下： |
| 7 |  | a）租户A，项目A下的mysql任务B |
| 8 |  | B）租户A，项目B下的mysql任务B |
| 9 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 10 |  | 进入【任务依赖配置有误】弹窗： |
| 11 |  | 1）展示缺失上游依赖任务如下： |
| 12 |  | a）租户A，项目B下的mysql任务C、D、E |
| 13 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 14 |  | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 15 |  | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |

##### 验证dorissql任务与数据同步间任务依赖功能正常_数据同步任务 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：doris_A数据源（meta数据源）；
b）数据源B：doris_B数据源（非meta数据源，与doris_meta数据源不是同一个doris源）；
c）数据源B：doris_B数据源（非meta数据源，与doris_meta数据源是同一个doris源）；
2)hviesql任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）dorissql任务A：create table table_A;
b）dorissql任务B：create table schema_B.table_A;
c）dorissql任务C：create table table_B as select * from table_A;
d）dorissql任务D：insert into table_B select * from table_A;
e）dorissql任务E：insert overwrite table table_B select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;
3）建表&插数据脚本：
--dorissql建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务A，源表：数据源A下schema_meta.table_A，其余内容均正常填写，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 2 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务B，源表：数据源A下schema_B.table_A，其余内容均正常填写，保存并提交 | 1）展示缺失上游依赖任务如下： |
| 3 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务D，源表：数据源B下schema_B.table_A，其余内容均正常填写，保存并提交 | a）租户A，项目B下的dorissql任务A |
| 4 | 进入租户A下项目B的【数据开发-手动任务】页面，新建数据同步任务E，源表：数据源A下schema_B.table_A，其余内容均正常填写，保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 5 |  | 进入【任务依赖配置有误】弹窗： |
| 6 |  | 1）展示缺失上游依赖任务如下： |
| 7 |  | a）租户A，项目A下的dorissql任务B |
| 8 |  | B）租户A，项目B下的dorissql任务B |
| 9 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 10 |  | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 11 |  | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |

##### 验证dorissql任务间任务依赖功能正常_dorissql初始化方式创建_自动依赖 「P2」

> 前置条件
```
1）项目A、项目B的dorissql引擎的初始化方式均为创建
2）dorissql任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）dorissql任务A：create table table_A;
b）dorissql任务B：create table schema_B.table_B_1;
c）dorissql任务C：create table table_B_2 as select * from table_A;
d）dorissql任务D：insert into table_B_1 select * from table_A;
e）dorissql任务E：insert overwrite table table_B_2 select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;

3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-手动任务】页面，新建dorissql任务A1，脚本如下：select * from table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下： |
| 2 | 修改脚本如下：select * from table_B_1;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的dorissql任务A |
| 3 | 修改脚本如下：select * from table_B_2;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 4 | 修改脚本如下：select * from schema_B.table_B_2;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的dorissql任务D |
| 6 | 修改脚本如下：create table table_C_1 like table_A;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的dorissql任务C、E |
| 9 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 10 | 修改脚本如下：select * from table_A;select * from table_B_1;select * from table_B_2;select * from schema_B.table_B_2;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下：空 |
| 11 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 12 |  | 1）自动依赖任务如下： |
| 13 |  | a）租户A，项目B下的dorissql任务A、B |
| 14 |  | b）租户A，项目A下的dorissql任务B |
| 15 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 16 |  | 1）自动依赖任务如下： |
| 17 |  | a）租户A，项目B下的dorissql任务A |
| 18 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 19 |  | 1）自动依赖任务如下： |
| 20 |  | a）租户A，项目B下的dorissql任务A |
| 21 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 22 |  | 1）自动依赖任务如下： |
| 23 |  | a）租户A，项目B下的dorissql任务A、B |
| 24 |  | b）租户A，项目A下的dorissql任务B |
| 25 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 26 |  | 1）自动依赖任务如下： |
| 27 |  | a）租户A，项目B下的dorissql任务A |
| 28 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 29 |  | 1）自动依赖任务如下： |
| 30 |  | a）租户A，项目B下的dorissql任务A、B、C、D、E |
| 31 |  | b）租户A，项目A下的dorissql任务B |
| 32 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |

##### 验证dorissql任务间任务依赖功能正常_dorissql初始化方式创建_手动依赖_手动添加 「P2」

> 前置条件
```
1）项目A、项目B的dorissql引擎的初始化方式均为创建
2）dorissql任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）dorissql任务A：create table table_A;
b）dorissql任务B：create table schema_B.table_B_1;
c）dorissql任务C：create table table_B_2 as select * from table_A;
d）dorissql任务D：insert into table_B_1 select * from table_A;
e）dorissql任务E：insert overwrite table table_B_2 select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;

3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-手动任务】页面，新建dorissql任务A1，脚本如下：select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 2 | 修改脚本如下：select * from table_B_1;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 3 | 修改脚本如下：select * from table_B_2;保存并提交 | a）租户A，项目B下的dorissql任务A |
| 4 | 修改脚本如下：select * from schema_B.table_B_2;保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 6 | 修改脚本如下：create table table_C_1 like table_A;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;保存并提交 | a）租户A，项目B下的dorissql任务D |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 9 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 10 | 修改脚本如下：select * from table_A;select * from table_B_1;select * from table_B_2;select * from schema_B.table_B_2;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 11 |  | a）租户A，项目B下的dorissql任务C、E |
| 12 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 13 |  | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 14 |  | 进入【任务依赖配置有误】弹窗： |
| 15 |  | 1）展示缺失上游依赖任务如下： |
| 16 |  | a）租户A，项目B下的dorissql任务A、B |
| 17 |  | b）租户A，项目A下的dorissql任务B |
| 18 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 19 |  | 进入【任务依赖配置有误】弹窗： |
| 20 |  | 1）展示缺失上游依赖任务如下： |
| 21 |  | a）租户A，项目B下的dorissql任务A |
| 22 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 23 |  | 进入【任务依赖配置有误】弹窗： |
| 24 |  | 1）展示缺失上游依赖任务如下： |
| 25 |  | a）租户A，项目B下的dorissql任务A |
| 26 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 27 |  | 进入【任务依赖配置有误】弹窗： |
| 28 |  | 1）展示缺失上游依赖任务如下： |
| 29 |  | a）租户A，项目B下的dorissql任务A、B |
| 30 |  | b）租户A，项目A下的dorissql任务B |
| 31 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 32 |  | 进入【任务依赖配置有误】弹窗： |
| 33 |  | 1）展示缺失上游依赖任务如下： |
| 34 |  | a）租户A，项目B下的dorissql任务A |
| 35 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 36 |  | 进入【任务依赖配置有误】弹窗： |
| 37 |  | 1）展示缺失上游依赖任务如下： |
| 38 |  | a）租户A，项目B下的dorissql任务A、B、C、D、E |
| 39 |  | b）租户A，项目A下的dorissql任务B |
| 40 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证dorissql任务间任务依赖功能正常_dorissql初始化方式创建_手动依赖_依赖推荐 「P2」

> 前置条件
```
1）项目A、项目B的dorissql引擎的初始化方式均为创建
2）dorissql任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）dorissql任务A：create table table_A;
b）dorissql任务B：create table schema_B.table_B_1;
c）dorissql任务C：create table table_B_2 as select * from table_A;
d）dorissql任务D：insert into table_B_1 select * from table_A;
e）dorissql任务E：insert overwrite table table_B_2 select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;

3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-手动任务】页面，新建dorissql任务A1，脚本如下：select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 2 | 修改脚本如下：select * from table_B_1;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的dorissql任务A |
| 3 | 修改脚本如下：select * from table_B_2;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 4 | 修改脚本如下：select * from schema_B.table_B_2;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）展示缺失上游依赖任务如下： |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | i）租户A，项目B下的dorissql任务A |
| 6 | 修改脚本如下：create table table_C_1 like table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的dorissql任务D |
| 9 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 10 | 修改脚本如下：select * from table_A;select * from table_B_1;select * from table_B_2;select * from schema_B.table_B_2;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）展示缺失上游依赖任务如下： |
| 11 |  | i）租户A，项目B下的dorissql任务D |
| 12 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 13 |  | 1）依赖推荐任务如下： |
| 14 |  | a）租户A，项目B下的dorissql任务C、E |
| 15 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 16 |  | a）展示缺失上游依赖任务如下： |
| 17 |  | i）租户A，项目B下的dorissql任务C、E |
| 18 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 19 |  | 1）依赖推荐任务如下：空 |
| 20 |  | 2）未添加推荐依赖，保存并提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 21 |  | 1）依赖推荐任务如下： |
| 22 |  | a）租户A，项目B下的dorissql任务A、B |
| 23 |  | b）租户A，项目A下的dorissql任务B |
| 24 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 25 |  | a）展示缺失上游依赖任务如下： |
| 26 |  | i）租户A，项目B下的dorissql任务A、B |
| 27 |  | ii）租户A，项目A下的dorissql任务B |
| 28 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 29 |  | 1）依赖推荐任务如下： |
| 30 |  | a）租户A，项目B下的dorissql任务A |
| 31 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 32 |  | a）展示缺失上游依赖任务如下： |
| 33 |  | i）租户A，项目B下的dorissql任务A |
| 34 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 35 |  | 1）依赖推荐任务如下： |
| 36 |  | a）租户A，项目B下的dorissql任务A |
| 37 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 38 |  | a）展示缺失上游依赖任务如下： |
| 39 |  | i）租户A，项目B下的dorissql任务A |
| 40 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 41 |  | 1）依赖推荐任务如下： |
| 42 |  | a）租户A，项目B下的dorissql任务A、B |
| 43 |  | b）租户A，项目A下的dorissql任务B |
| 44 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 45 |  | a）展示缺失上游依赖任务如下： |
| 46 |  | i）租户A，项目B下的dorissql任务A、B |
| 47 |  | ii）租户A，项目A下的dorissql任务B |
| 48 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 49 |  | 1）依赖推荐任务如下： |
| 50 |  | a）租户A，项目B下的dorissql任务A |
| 51 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 52 |  | a）展示缺失上游依赖任务如下： |
| 53 |  | i）租户A，项目B下的dorissql任务A |
| 54 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 55 |  | 1）依赖推荐任务如下： |
| 56 |  | a）租户A，项目B下的dorissql任务A、B、C、D、E |
| 57 |  | b）租户A，项目A下的dorissql任务B |
| 58 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 59 |  | a）展示缺失上游依赖任务如下： |
| 60 |  | i）租户A，项目B下的dorissql任务A、B、C、D、E |
| 61 |  | ii）租户A，项目A下的dorissql任务B |
| 62 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证dorissql任务间任务依赖功能正常_dorissql初始化方式不创建且不对接schema_自动依赖 「P2」

> 前置条件
```
1）项目A、项目B的dorissql引擎的初始化方式均为不创建且不对接schema
2）dorissql任务（租户A下，在项目A、项目B均配置以下任务且已提交，所选schema均为schema_C）：
a）dorissql任务A：create table table_A;
b）dorissql任务B：create table schema_B.table_B_1;
c）dorissql任务C：create table schema_B.table_B_2 as select * from table_A;
d）dorissql任务D：insert into schema_B.table_B_1 select * from table_A;
e）dorissql任务E：insert overwrite table schema_B.table_B_2 select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;

3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-手动任务】页面，新建dorissql任务A1，选择schema_C，脚本如下：select * from schema_B.table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下：空 |
| 2 | 修改脚本如下：select * from schema_B.table_B_1;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 修改脚本如下：select * from schema_B.table_B_2;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下： |
| 4 | 修改脚本如下：select * from table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | a）租户A，项目A下的dorissql任务B、D |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;【调度属性-任务间依赖】选择“自动依赖”，刷新 | b）租户A，项目B下的dorissql任务B、D |
| 6 | 修改脚本如下：create table table_C_1 like table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下： |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;【调度属性-任务间依赖】选择“自动依赖”，刷新 | a）租户A，项目A下的dorissql任务C、E |
| 9 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“自动依赖”，刷新 | b）租户A，项目B下的dorissql任务C、E |
| 10 | 修改脚本如下：select * from schema_B.table_A;select * from schema_B.table_B_1;select * from schema_B.table_B_2;select * from table_A;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 11 |  | 1）自动依赖任务如下： |
| 12 |  | a）租户A，项目A下的dorissql任务A |
| 13 |  | b）租户A，项目B下的dorissql任务A |
| 14 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 15 |  | 1）自动依赖任务如下： |
| 16 |  | a）租户A，项目A下的dorissql任务A、B、C、D、E |
| 17 |  | b）租户A，项目B下的dorissql任务A、B、C、D、E |
| 18 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 19 |  | 1）自动依赖任务如下： |
| 20 |  | a）租户A，项目A下的dorissql任务A |
| 21 |  | b）租户A，项目B下的dorissql任务A |
| 22 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 23 |  | 1）自动依赖任务如下： |
| 24 |  | a）租户A，项目A下的dorissql任务A |
| 25 |  | b）租户A，项目B下的dorissql任务A |
| 26 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 27 |  | 1）自动依赖任务如下： |
| 28 |  | a）租户A，项目A下的dorissql任务A、B、D |
| 29 |  | b）租户A，项目B下的dorissql任务A、B、D |
| 30 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 31 |  | 1）自动依赖任务如下： |
| 32 |  | a）租户A，项目A下的dorissql任务A |
| 33 |  | b）租户A，项目B下的dorissql任务A |
| 34 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 35 |  | 1）自动依赖任务如下： |
| 36 |  | a）租户A，项目A下的dorissql任务A、B、C、D、E |
| 37 |  | b）租户A，项目B下的dorissql任务A、B、C、D、E |
| 38 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |

##### 验证dorissql任务间任务依赖功能正常_dorissql初始化方式不创建且不对接schema_手动依赖_手动添加 「P2」

> 前置条件
```
1）项目A、项目B的dorissql引擎的初始化方式均为不创建且不对接schema
2）dorissql任务（租户A下，在项目A、项目B均配置以下任务且已提交，所选schema均为schema_C）：
a）dorissql任务A：create table table_A;
b）dorissql任务B：create table schema_B.table_B_1;
c）dorissql任务C：create table schema_B.table_B_2 as select * from table_A;
d）dorissql任务D：insert into schema_B.table_B_1 select * from table_A;
e）dorissql任务E：insert overwrite table schema_B.table_B_2 select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;

3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-手动任务】页面，新建dorissql任务A1，选择schema_C，脚本如下：select * from schema_B.table_A;【调度属性-任务间依赖】选择“手动依赖”，保存并提交 | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 2 | 修改脚本如下：select * from schema_B.table_B_1;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 3 | 修改脚本如下：select * from schema_B.table_B_2;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 4 | 修改脚本如下：select * from table_A;保存并提交 | a）租户A，项目A下的dorissql任务B、D |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;保存并提交 | b）租户A，项目B下的dorissql任务B、D |
| 6 | 修改脚本如下：create table table_C_1 like table_A;保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 9 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;保存并提交 | a）租户A，项目A下的dorissql任务C、E |
| 10 | 修改脚本如下：select * from schema_B.table_A;select * from schema_B.table_B_1;select * from schema_B.table_B_2;select * from table_A;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;保存并提交 | b）租户A，项目B下的dorissql任务C、E |
| 11 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 12 |  | 进入【任务依赖配置有误】弹窗： |
| 13 |  | 1）展示缺失上游依赖任务如下： |
| 14 |  | a）租户A，项目A下的dorissql任务A |
| 15 |  | b）租户A，项目B下的dorissql任务A |
| 16 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 17 |  | 进入【任务依赖配置有误】弹窗： |
| 18 |  | 1）展示缺失上游依赖任务如下： |
| 19 |  | a）租户A，项目A下的dorissql任务A、B、C、D、E |
| 20 |  | b）租户A，项目B下的dorissql任务A、B、C、D、E |
| 21 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 22 |  | 进入【任务依赖配置有误】弹窗： |
| 23 |  | 1）展示缺失上游依赖任务如下： |
| 24 |  | a）租户A，项目A下的dorissql任务A |
| 25 |  | b）租户A，项目B下的dorissql任务A |
| 26 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 27 |  | 进入【任务依赖配置有误】弹窗： |
| 28 |  | 1）展示缺失上游依赖任务如下： |
| 29 |  | a）租户A，项目A下的dorissql任务A |
| 30 |  | b）租户A，项目B下的dorissql任务A |
| 31 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 32 |  | 进入【任务依赖配置有误】弹窗： |
| 33 |  | 1）展示缺失上游依赖任务如下： |
| 34 |  | a）租户A，项目A下的dorissql任务A、B、D |
| 35 |  | b）租户A，项目B下的dorissql任务A、B、D |
| 36 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 37 |  | 进入【任务依赖配置有误】弹窗： |
| 38 |  | 1）展示缺失上游依赖任务如下： |
| 39 |  | a）租户A，项目A下的dorissql任务A |
| 40 |  | b）租户A，项目B下的dorissql任务A |
| 41 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 42 |  | 进入【任务依赖配置有误】弹窗： |
| 43 |  | 1）展示缺失上游依赖任务如下： |
| 44 |  | a）租户A，项目A下的dorissql任务A、B、C、D、E |
| 45 |  | b）租户A，项目B下的dorissql任务A、B、C、D、E |
| 46 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证dorissql任务间任务依赖功能正常_dorissql初始化方式不创建且不对接schema_手动依赖_依赖推荐 「P2」

> 前置条件
```
1）项目A、项目B的dorissql引擎的初始化方式均为不创建且不对接schema
2）dorissql任务（租户A下，在项目A、项目B均配置以下任务且已提交，所选schema均为schema_C）：
a）dorissql任务A：create table table_A;
b）dorissql任务B：create table schema_B.table_B_1;
c）dorissql任务C：create table schema_B.table_B_2 as select * from table_A;
d）dorissql任务D：insert into schema_B.table_B_1 select * from table_A;
e）dorissql任务E：insert overwrite table schema_B.table_B_2 select t1.id,t2.name,t2.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;

3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-手动任务】页面，新建dorissql任务A1，选择schema_C，脚本如下：select * from schema_B.table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下：空 |
| 2 | 修改脚本如下：select * from schema_B.table_B_1;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 修改脚本如下：select * from schema_B.table_B_2;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 4 | 修改脚本如下：select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目A下的dorissql任务B、D |
| 5 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | b）租户A，项目B下的dorissql任务B、D |
| 6 | 修改脚本如下：create table table_C_1 like table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 7 | 修改脚本如下：create table table_C_2 as select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）展示缺失上游依赖任务如下： |
| 8 | 修改脚本如下：insert into schema_B.table_B_1 select * from table_A;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | i）租户A，项目A下的dorissql任务B、D |
| 9 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | ii）租户A，项目B下的dorissql任务B、D |
| 10 | 修改脚本如下：select * from schema_B.table_A;select * from schema_B.table_B_1;select * from schema_B.table_B_2;select * from table_A;select * from (select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_B_1 t2 on t1.col=t2.col) t3 left join schema_B.table_B_2 t4 on t3.col=t4.col;create table table_C_1 like table_A;create table table_C_2 as select * from table_A;insert into schema_B.table_B_1 select * from table_A;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_A t1 left join schema_B.table_A t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 11 |  | 1）依赖推荐任务如下： |
| 12 |  | a）租户A，项目A下的dorissql任务C、E |
| 13 |  | b）租户A，项目B下的dorissql任务C、E |
| 14 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 15 |  | a）展示缺失上游依赖任务如下： |
| 16 |  | i）租户A，项目A下的dorissql任务C、E |
| 17 |  | ii）租户A，项目B下的dorissql任务C、E |
| 18 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 19 |  | 1）依赖推荐任务如下： |
| 20 |  | a）租户A，项目A下的dorissql任务A |
| 21 |  | b）租户A，项目B下的dorissql任务A |
| 22 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 23 |  | a）展示缺失上游依赖任务如下： |
| 24 |  | i）租户A，项目A下的dorissql任务A |
| 25 |  | ii）租户A，项目B下的dorissql任务A |
| 26 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 27 |  | 1）依赖推荐任务如下： |
| 28 |  | a）租户A，项目A下的dorissql任务A、B、C、D、E |
| 29 |  | b）租户A，项目B下的dorissql任务A、B、C、D、E |
| 30 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 31 |  | a）展示缺失上游依赖任务如下： |
| 32 |  | a）租户A，项目A下的dorissql任务A、B、C、D、E |
| 33 |  | b）租户A，项目B下的dorissql任务A、B、C、D、E |
| 34 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 35 |  | 1）依赖推荐任务如下： |
| 36 |  | a）租户A，项目A下的dorissql任务A |
| 37 |  | b）租户A，项目B下的dorissql任务A |
| 38 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 39 |  | a）展示缺失上游依赖任务如下： |
| 40 |  | i）租户A，项目A下的dorissql任务A |
| 41 |  | ii）租户A，项目B下的dorissql任务A |
| 42 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 43 |  | 1）依赖推荐任务如下： |
| 44 |  | a）租户A，项目A下的dorissql任务A |
| 45 |  | b）租户A，项目B下的dorissql任务A |
| 46 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 47 |  | a）展示缺失上游依赖任务如下： |
| 48 |  | i）租户A，项目A下的dorissql任务A |
| 49 |  | ii）租户A，项目B下的dorissql任务A |
| 50 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 51 |  | 1）依赖推荐任务如下： |
| 52 |  | a）租户A，项目A下的dorissql任务A、B、D |
| 53 |  | b）租户A，项目B下的dorissql任务A、B、D |
| 54 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 55 |  | a）展示缺失上游依赖任务如下： |
| 56 |  | i）租户A，项目A下的dorissql任务A、B、D |
| 57 |  | ii）租户A，项目B下的dorissql任务A、B、D |
| 58 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 59 |  | 1）依赖推荐任务如下： |
| 60 |  | a）租户A，项目A下的dorissql任务A |
| 61 |  | b）租户A，项目B下的dorissql任务A |
| 62 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 63 |  | a）展示缺失上游依赖任务如下： |
| 64 |  | i）租户A，项目A下的dorissql任务A |
| 65 |  | ii）租户A，项目B下的dorissql任务A |
| 66 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 67 |  | 1）依赖推荐任务如下： |
| 68 |  | a）租户A，项目A下的dorissql任务A、B、C、D、E |
| 69 |  | b）租户A，项目B下的dorissql任务A、B、C、D、E |
| 70 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 71 |  | a）展示缺失上游依赖任务如下： |
| 72 |  | i）租户A，项目A下的dorissql任务A、B、C、D、E |
| 73 |  | ii）租户A，项目B下的dorissql任务A、B、C、D、E |
| 74 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证dorissql任务与数据同步间任务依赖功能正常_dorissql初始化方式创建_自动依赖 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：doris_B数据源（meta数据源）
c）数据源C：doris_C数据源（非meta数据源，但与doris_meta数据源不是同一个doris源）
2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_A.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；
3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-手动任务】页面，新建dorissql任务A1，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下： |
| 2 | 修改脚本如下：select * from schema_B.table_B;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的数据同步任务A |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 4 | 修改脚本如下：create table table_C_1 like table_B;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的数据同步任务B |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;【调度属性-任务间依赖】的自动依赖，刷新 | b）租户A，项目A下的数据同步任务B |
| 7 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 8 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 9 |  | a）租户A，项目B下的数据同步任务A、B |
| 10 |  | b）租户A，项目A下的数据同步任务B |
| 11 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 12 |  | 1）自动依赖任务如下： |
| 13 |  | a）租户A，项目B下的数据同步任务A |
| 14 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 15 |  | 1）自动依赖任务如下： |
| 16 |  | a）租户A，项目B下的数据同步任务B |
| 17 |  | b）租户A，项目A下的数据同步任务B |
| 18 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 19 |  | 1）自动依赖任务如下： |
| 20 |  | a）租户A，项目B下的数据同步任务A、B |
| 21 |  | b）租户A，项目A下的数据同步任务B |
| 22 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 23 |  | 1）自动依赖任务如下： |
| 24 |  | a）租户A，项目B下的数据同步任务A、B |
| 25 |  | b）租户A，项目A下的数据同步任务B |
| 26 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 27 |  | 1）自动依赖任务如下： |
| 28 |  | a）租户A，项目B下的数据同步任务A、B |
| 29 |  | b）租户A，项目A下的数据同步任务B |
| 30 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |

##### 验证dorissql任务与数据同步间任务依赖功能正常_dorissql初始化方式创建_手动依赖_手动添加 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：doris_B数据源（meta数据源）
c）数据源C：doris_C数据源（非meta数据源，但与doris_meta数据源不是同一个doris源）

2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_meta.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；

3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-手动任务】页面，新建dorissql任务A1，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 2 | 修改脚本如下：select * from schema_B.table_B;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;保存并提交 | a）租户A，项目B下的数据同步任务A |
| 4 | 修改脚本如下：create table table_C_1 like table_B;保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 7 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;保存并提交 | a）租户A，项目B下的数据同步任务B |
| 8 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;保存并提交 | b）租户A，项目A下的数据同步任务B |
| 9 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 10 |  | 进入【任务依赖配置有误】弹窗： |
| 11 |  | 1）展示缺失上游依赖任务如下： |
| 12 |  | a）租户A，项目B下的数据同步任务A、B |
| 13 |  | b）租户A，项目A下的数据同步任务B |
| 14 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 15 |  | 进入【任务依赖配置有误】弹窗： |
| 16 |  | 1）展示缺失上游依赖任务如下： |
| 17 |  | a）租户A，项目B下的数据同步任务A |
| 18 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 19 |  | 进入【任务依赖配置有误】弹窗： |
| 20 |  | 1）展示缺失上游依赖任务如下： |
| 21 |  | a）租户A，项目B下的数据同步任务B |
| 22 |  | b）租户A，项目A下的数据同步任务B |
| 23 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 24 |  | 进入【任务依赖配置有误】弹窗： |
| 25 |  | 1）展示缺失上游依赖任务如下： |
| 26 |  | a）租户A，项目B下的数据同步任务A、B |
| 27 |  | b）租户A，项目A下的数据同步任务B |
| 28 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 29 |  | 进入【任务依赖配置有误】弹窗： |
| 30 |  | 1）展示缺失上游依赖任务如下： |
| 31 |  | a）租户A，项目B下的数据同步任务A、B |
| 32 |  | b）租户A，项目A下的数据同步任务B |
| 33 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 34 |  | 进入【任务依赖配置有误】弹窗： |
| 35 |  | 1）展示缺失上游依赖任务如下： |
| 36 |  | a）租户A，项目B下的数据同步任务A、B |
| 37 |  | b）租户A，项目A下的数据同步任务B |
| 38 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证dorissql任务与数据同步间任务依赖功能正常_dorissql初始化方式创建_手动依赖_依赖推荐 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：doris_B数据源（meta数据源）
c）数据源C：doris_C数据源（非meta数据源，但与doris_meta数据源不是同一个doris源）

2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_meta.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；

3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-手动任务】页面，新建dorissql任务A1，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）自动依赖任务如下： |
| 2 | 修改脚本如下：select * from schema_B.table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的数据同步任务A |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 4 | 修改脚本如下：create table table_C_1 like table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）展示缺失上游依赖任务如下： |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | i）租户A，项目B下的数据同步任务A |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 7 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 8 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的数据同步任务B |
| 9 |  | b）租户A，项目A下的数据同步任务B |
| 10 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 11 |  | a）展示缺失上游依赖任务如下： |
| 12 |  | i）租户A，项目B下的数据同步任务B |
| 13 |  | ii）租户A，项目A下的数据同步任务B |
| 14 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 15 |  | 1）依赖推荐任务如下： |
| 16 |  | a）租户A，项目B下的数据同步任务A、B |
| 17 |  | b）租户A，项目A下的数据同步任务B |
| 18 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 19 |  | a）展示缺失上游依赖任务如下： |
| 20 |  | i）租户A，项目B下的数据同步任务A、B |
| 21 |  | ii）租户A，项目A下的数据同步任务B |
| 22 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 23 |  | 1）依赖推荐任务如下： |
| 24 |  | a）租户A，项目B下的数据同步任务A |
| 25 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 26 |  | a）展示缺失上游依赖任务如下： |
| 27 |  | i）租户A，项目B下的数据同步任务A |
| 28 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 29 |  | 1）依赖推荐任务如下： |
| 30 |  | a）租户A，项目B下的数据同步任务B |
| 31 |  | b）租户A，项目A下的数据同步任务B |
| 32 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 33 |  | a）展示缺失上游依赖任务如下： |
| 34 |  | i）租户A，项目B下的数据同步任务B |
| 35 |  | ii）租户A，项目A下的数据同步任务B |
| 36 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 37 |  | 1）依赖推荐任务如下： |
| 38 |  | a）租户A，项目B下的数据同步任务A、B |
| 39 |  | b）租户A，项目A下的数据同步任务B |
| 40 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 41 |  | a）展示缺失上游依赖任务如下： |
| 42 |  | i）租户A，项目B下的数据同步任务A、B |
| 43 |  | ii）租户A，项目A下的数据同步任务B |
| 44 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 45 |  | 1）依赖推荐任务如下： |
| 46 |  | a）租户A，项目B下的数据同步任务A、B |
| 47 |  | b）租户A，项目A下的数据同步任务B |
| 48 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 49 |  | a）展示缺失上游依赖任务如下： |
| 50 |  | i）租户A，项目B下的数据同步任务A、B |
| 51 |  | ii）租户A，项目A下的数据同步任务B |
| 52 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 53 |  | 1）依赖推荐任务如下： |
| 54 |  | a）租户A，项目B下的数据同步任务A、B |
| 55 |  | b）租户A，项目A下的数据同步任务B |
| 56 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 57 |  | a）展示缺失上游依赖任务如下： |
| 58 |  | i）租户A，项目B下的数据同步任务A、B |
| 59 |  | ii）租户A，项目A下的数据同步任务B |
| 60 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证dorissql任务与数据同步间任务依赖功能正常_dorissql初始化方式不创建且不对接schema_自动依赖 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：doris_B数据源（meta数据源）
c）数据源C：doris_C数据源（非meta数据源，但与doris_meta数据源不是同一个doris源）
2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_A.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；
3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-手动任务】页面，新建dorissql任务A1，选择schema_C，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“自动依赖”，刷新 | 1）自动依赖任务如下：无 |
| 2 | 修改脚本如下：select * from schema_B.table_B;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 4 | 修改脚本如下：create table table_C_1 like table_B;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的数据同步任务B |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;【调度属性-任务间依赖】的自动依赖，刷新 | b）租户A，项目A下的数据同步任务B |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;【调度属性-任务间依赖】的自动依赖，刷新 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 7 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】的自动依赖，刷新 | 1）自动依赖任务如下： |
| 8 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】的自动依赖，刷新 | a）租户A，项目B下的数据同步任务B |
| 9 |  | b）租户A，项目A下的数据同步任务B |
| 10 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 11 |  | 1）自动依赖任务如下：无 |
| 12 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 13 |  | 1）自动依赖任务如下： |
| 14 |  | a）租户A，项目B下的数据同步任务B |
| 15 |  | b）租户A，项目A下的数据同步任务B |
| 16 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 17 |  | 1）自动依赖任务如下： |
| 18 |  | a）租户A，项目B下的数据同步任务B |
| 19 |  | b）租户A，项目A下的数据同步任务B |
| 20 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 21 |  | 1）自动依赖任务如下： |
| 22 |  | a）租户A，项目B下的数据同步任务B |
| 23 |  | b）租户A，项目A下的数据同步任务B |
| 24 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 25 |  | 1）自动依赖任务如下： |
| 26 |  | a）租户A，项目B下的数据同步任务B |
| 27 |  | b）租户A，项目A下的数据同步任务B |
| 28 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |

##### 验证dorissql任务与数据同步间任务依赖功能正常_dorissql初始化方式不创建且不对接schema_手动依赖_手动添加 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：doris_B数据源（meta数据源）
c）数据源C：doris_C数据源（非meta数据源，但与doris_meta数据源不是同一个doris源）

2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_meta.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；

3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-手动任务】页面，新建dorissql任务A1，选择schema_C，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，保存并提交 | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 2 | 修改脚本如下：select * from schema_B.table_B;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 4 | 修改脚本如下：create table table_C_1 like table_B;保存并提交 | a）租户A，项目B下的数据同步任务B |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;保存并提交 | b）租户A，项目A下的数据同步任务B |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 7 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 8 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;保存并提交 | 1）展示缺失上游依赖任务如下： |
| 9 |  | a）租户A，项目B下的数据同步任务B |
| 10 |  | b）租户A，项目A下的数据同步任务B |
| 11 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 12 |  | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 13 |  | 进入【任务依赖配置有误】弹窗： |
| 14 |  | 1）展示缺失上游依赖任务如下： |
| 15 |  | a）租户A，项目B下的数据同步任务B |
| 16 |  | b）租户A，项目A下的数据同步任务B |
| 17 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 18 |  | 进入【任务依赖配置有误】弹窗： |
| 19 |  | 1）展示缺失上游依赖任务如下： |
| 20 |  | a）租户A，项目B下的数据同步任务B |
| 21 |  | b）租户A，项目A下的数据同步任务B |
| 22 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 23 |  | 进入【任务依赖配置有误】弹窗： |
| 24 |  | 1）展示缺失上游依赖任务如下： |
| 25 |  | a）租户A，项目B下的数据同步任务B |
| 26 |  | b）租户A，项目A下的数据同步任务B |
| 27 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 28 |  | 进入【任务依赖配置有误】弹窗： |
| 29 |  | 1）展示缺失上游依赖任务如下： |
| 30 |  | a）租户A，项目B下的数据同步任务B |
| 31 |  | b）租户A，项目A下的数据同步任务B |
| 32 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证dorissql任务与数据同步间任务依赖功能正常_dorissql初始化方式不创建且不对接schema_手动依赖_依赖推荐 「P2」

> 前置条件
```
1）数据源信息：
a）数据源A：mysql数据源
b）数据源B：doris_B数据源（meta数据源）
c）数据源C：doris_C数据源（非meta数据源，但与doris_meta数据源不是同一个doris源）
2）数据同步任务（租户A下，在项目A、项目B均配置以下任务且已提交）：
a）数据同步任务A：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_A.table_B；
b）数据同步任务B：源表：数据源A下schema_A.table_A，目标表：数据源B下schema_B.table_B；
c）数据同步任务C：源表：数据源A下schema_A.table_A，目标表：数据源C下schema_B.table_B；
3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-手动任务】页面，新建dorissql任务A1，选择schema_C，脚本如下：select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）自动依赖任务如下：无 |
| 2 | 修改脚本如下：select * from schema_B.table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 修改脚本如下：select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 4 | 修改脚本如下：create table table_C_1 like table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的数据同步任务B |
| 5 | 修改脚本如下：create table table_C_2 as select * from schema_B.table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | b）租户A，项目A下的数据同步任务B |
| 6 | 修改脚本如下：insert into schema_B.table_B select * from table_B;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 7 | 修改脚本如下：insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）展示缺失上游依赖任务如下： |
| 8 | 修改脚本如下：select * from table_B;select * from schema_B.table_B;select * from (select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col) t3 left join schema_B.table_C_1 t4 on t3.col=t4.col;create table table_C_1 like table_B;create table table_C_2 as select * from schema_B.table_B;insert into schema_B.table_B select * from table_B;insert overwrite table table_C_2 select t1.id,t2.name,t3.age from table_B t1 left join schema_B.table_B t2 on t1.col=t2.col;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | i）租户A，项目B下的数据同步任务B |
| 9 |  | ii）租户A，项目A下的数据同步任务B |
| 10 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 11 |  | 1）依赖推荐任务如下： |
| 12 |  | a）租户A，项目B下的数据同步任务B |
| 13 |  | b）租户A，项目A下的数据同步任务B |
| 14 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 15 |  | a）展示缺失上游依赖任务如下： |
| 16 |  | i）租户A，项目B下的数据同步任务B |
| 17 |  | ii）租户A，项目A下的数据同步任务B |
| 18 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 19 |  | 1）依赖推荐任务如下：无 |
| 20 |  | 2）未添加推荐依赖，保存并提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 21 |  | 1）依赖推荐任务如下： |
| 22 |  | a）租户A，项目B下的数据同步任务B |
| 23 |  | b）租户A，项目A下的数据同步任务B |
| 24 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 25 |  | a）展示缺失上游依赖任务如下： |
| 26 |  | i）租户A，项目B下的数据同步任务B |
| 27 |  | ii）租户A，项目A下的数据同步任务B |
| 28 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 29 |  | 1）依赖推荐任务如下： |
| 30 |  | a）租户A，项目B下的数据同步任务B |
| 31 |  | b）租户A，项目A下的数据同步任务B |
| 32 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 33 |  | a）展示缺失上游依赖任务如下： |
| 34 |  | i）租户A，项目B下的数据同步任务B |
| 35 |  | ii）租户A，项目A下的数据同步任务B |
| 36 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 37 |  | 1）依赖推荐任务如下： |
| 38 |  | a）租户A，项目B下的数据同步任务B |
| 39 |  | b）租户A，项目A下的数据同步任务B |
| 40 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 41 |  | a）展示缺失上游依赖任务如下： |
| 42 |  | i）租户A，项目B下的数据同步任务B |
| 43 |  | ii）租户A，项目A下的数据同步任务B |
| 44 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 45 |  | 1）依赖推荐任务如下： |
| 46 |  | a）租户A，项目B下的数据同步任务B |
| 47 |  | b）租户A，项目A下的数据同步任务B |
| 48 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 49 |  | a）展示缺失上游依赖任务如下： |
| 50 |  | i）租户A，项目B下的数据同步任务B |
| 51 |  | ii）租户A，项目A下的数据同步任务B |
| 52 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证dorissql任务依赖功能正常_切换doris运行集群_自动依赖 「P2」

> 前置条件
```
1）dorissql任务（租户A下，在项目B均配置以下任务且已提交）：
a）dorissql任务A（doris_A引擎初始化方式为创建）：create table table_A;
b）dorissql任务B（doris_A引擎初始化方式为创建）：create table schema_B.table_A;
c）dorissql任务C（doris_A引擎初始化方式为创建）：insert into table_C_1 select * from table_A;
d）dorissql任务D（doris_A引擎初始化方式为创建）：insert into schema_B.table_C_1 select * from table_A;
e）dorissql任务E（doris_B引擎初始化方式为创建）：create table table_A;
f）dorissql任务F（doris_B引擎初始化方式为创建）：create table schema_B.table_A;
g）dorissql任务G（doris_B引擎初始化方式为创建）：insert into table_C_1 select * from table_A;
h）dorissql任务H（doris_B引擎初始化方式为创建）：insert into schema_B.table_C_1 select * from table_A;
2）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-手动任务】页面，新建dorissql任务A1（运行集群为doris_A），脚本如下：select * from table_A;select * from schema_B.table_A;select * from table_C_1;select * from schema_B.table_C_1;【调度属性-任务间依赖】选择“自动依赖”，点击“刷新” | 1）自动依赖任务如下： |
| 2 | 运行集群切换至doris_B | a）租户A，项目B下的dorissql任务A、B、C、D |
| 3 | 修改前置dorissql任务F的运行集群为“doris_A”，运行后，保存并提交 | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 4 | 进入dorissql任务A1任务的【调度属性-任务间依赖】页面，点击“刷新” | 【调度属性-任务间依赖】刷新自动依赖任务： |
| 5 |  | 1）自动依赖任务如下： |
| 6 |  | a）租户A，项目B下的dorissql任务E、F、G、H |
| 7 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 8 |  | 前置dorissql任务F保存并提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 9 |  | 【调度属性-任务间依赖】刷新自动依赖任务： |
| 10 |  | 1）自动依赖任务如下： |
| 11 |  | a）租户A，项目B下的dorissql任务E、G、H |
| 12 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |

##### 验证dorissql任务依赖功能正常_切换doris运行集群_手动依赖_手动添加 「P2」

> 前置条件
```
1）dorissql任务（租户A下，在项目B均配置以下任务且已提交）：
a）dorissql任务A（doris_A引擎初始化方式为创建）：create table table_A;
b）dorissql任务B（doris_A引擎初始化方式为创建）：create table schema_B.table_A;
c）dorissql任务C（doris_A引擎初始化方式为创建）：insert into table_C_1 select * from table_A;
d）dorissql任务D（doris_A引擎初始化方式为创建）：insert into schema_B.table_C_1 select * from table_A;
e）dorissql任务E（doris_B引擎初始化方式为创建）：create table table_A;
f）dorissql任务F（doris_B引擎初始化方式为创建）：create table schema_B.table_A;
g）dorissql任务G（doris_B引擎初始化方式为创建）：insert into table_C_1 select * from table_A;
h）dorissql任务H（doris_B引擎初始化方式为创建）：insert into schema_B.table_C_1 select * from table_A;
2）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-手动任务】页面，新建dorissql任务A1（运行集群为doris_A），脚本如下：select * from table_A;select * from schema_B.table_A;select * from table_C_1;select * from schema_B.table_C_1;【调度属性-任务间依赖】选择“自动依赖”，保存并提交 | 进入【任务依赖配置有误】弹窗： |
| 2 | 运行集群切换至doris_B，保存并提交任务 | 1）展示缺失上游依赖任务如下： |
| 3 | 修改前置dorissql任务F的运行集群为“doris_A”，保存并提交 | a）租户A，项目B下的dorissql任务A、B、C、D |
| 4 | 进入dorissql任务A1任务的【调度属性-任务间依赖】页面，保存并提交 | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 5 |  | 进入【任务依赖配置有误】弹窗： |
| 6 |  | 1）展示缺失上游依赖任务如下： |
| 7 |  | a）租户A，项目B下的dorissql任务E、F、G、H |
| 8 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 9 |  | 前置dorissql任务F保存并提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 10 |  | 进入【任务依赖配置有误】弹窗： |
| 11 |  | 1）展示缺失上游依赖任务如下： |
| 12 |  | a）租户A，项目B下的dorissql任务E、G、H |
| 13 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证dorissql任务依赖功能正常_切换doris运行集群_手动依赖_依赖推荐 「P2」

> 前置条件
```
1）dorissql任务（租户A下，在项目B均配置以下任务且已提交）：
a）dorissql任务A（doris_A引擎初始化方式为创建）：create table table_A;
b）dorissql任务B（doris_A引擎初始化方式为创建）：create table schema_B.table_A;
c）dorissql任务C（doris_A引擎初始化方式为创建）：insert into table_C_1 select * from table_A;
d）dorissql任务D（doris_A引擎初始化方式为创建）：insert into schema_B.table_C_1 select * from table_A;
e）dorissql任务E（doris_B引擎初始化方式为创建）：create table table_A;
f）dorissql任务F（doris_B引擎初始化方式为创建）：create table schema_B.table_A;
g）dorissql任务G（doris_B引擎初始化方式为创建）：insert into table_C_1 select * from table_A;
h）dorissql任务H（doris_B引擎初始化方式为创建）：insert into schema_B.table_C_1 select * from table_A;
2）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-手动任务】页面，新建dorissql任务A1（运行集群为doris_A），脚本如下：select * from table_A;select * from schema_B.table_A;select * from table_C_1;select * from schema_B.table_C_1;【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | 1）依赖推荐任务如下： |
| 2 | 运行集群切换至doris_B，【调度属性-任务间依赖】选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的dorissql任务A、B、C、D |
| 3 | 修改前置dorissql任务F的运行集群为“doris_A”，保存并提交 | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 4 | 进入dorissql任务A1任务的【调度属性-任务间依赖】页面，选择“手动依赖”，“添加依赖”选择“依赖推荐” | a）展示缺失上游依赖任务如下： |
| 5 |  | i）租户A，项目B下的dorissql任务A、B、C、D |
| 6 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 7 |  | 1）依赖推荐任务如下： |
| 8 |  | a）租户A，项目B下的dorissql任务E、F、G、H |
| 9 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 10 |  | a）展示缺失上游依赖任务如下： |
| 11 |  | i）租户A，项目B下的dorissql任务E、F、G、H |
| 12 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 13 |  | 前置dorissql任务F保存并提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 14 |  | 1）依赖推荐任务如下： |
| 15 |  | a）租户A，项目B下的dorissql任务E、G、H |
| 16 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 17 |  | a）展示缺失上游依赖任务如下： |
| 18 |  | i）租户A，项目B下的dorissql任务E、G、H |
| 19 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

##### 验证dorissql任务间任务依赖功能正常_50个依赖任务 「P2」

> 前置条件
```
1）项目A、项目B的dorissql引擎的初始化方式均为创建
2）dorissql任务（租户A下，在项目B配置以下任务且已提交）：
a）dorissql任务A1-A50：create table table_A;
b）dorissql任务B1-B50：create table table_B_${1-50};

3）建表&插数据脚本：
--doris建表&插数据
CREATE TABLE if not exists dorissql_test
(
id int,
name varchar(256),
age int
)
DISTRIBUTED BY HASH(id) BUCKETS 32
PROPERTIES
(
“replication_num“ = “1“
);
insert into dorissql_test values(1,'qq',11);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入租户A下项目B的【数据开发-手动任务】页面，新建dorissql任务C，脚本如下：select * from table_A;【调度属性-任务间依赖】选择“自动依赖”，查看依赖任务 | 1）自动依赖任务如下： |
| 2 | 【调度属性-任务间依赖】切换为“手动依赖”，保存并提交 | a）租户A，项目B下的dorissql任务A1-A50 |
| 3 | 【调度属性-任务间依赖】切换为“手动依赖”，“添加依赖”选择“依赖推荐” | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 4 | 进入租户A下项目B的【数据开发-手动任务】页面，新建dorissql任务D，脚本如下：select * from table_B_1;...select * from table_B_50;【调度属性-任务间依赖】选择“自动依赖”，查看依赖任务 | 进入【任务依赖配置有误】弹窗： |
| 5 | 【调度属性-任务间依赖】切换为“手动依赖”，保存并提交 | 1）展示缺失上游依赖任务如下： |
| 6 | 【调度属性-任务间依赖】切换为“手动依赖”，“添加依赖”选择“依赖推荐” | a）租户A，项目B下的dorissql任务A1-A50 |
| 7 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 8 |  | 1）依赖推荐任务如下： |
| 9 |  | a）租户A，项目B下的dorissql任务A1-A50 |
| 10 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 11 |  | a）展示缺失上游依赖任务如下： |
| 12 |  | i）租户A，项目B下的dorissql任务A1-A50 |
| 13 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 14 |  | 1）自动依赖任务如下： |
| 15 |  | a）租户A，项目B下的dorissql任务B1-B50 |
| 16 |  | 2）提交任务，任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 17 |  | 进入【任务依赖配置有误】弹窗： |
| 18 |  | 1）展示缺失上游依赖任务如下： |
| 19 |  | a）租户A，项目B下的dorissql任务B1-B50 |
| 20 |  | 2）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |
| 21 |  | 1）依赖推荐任务如下： |
| 22 |  | a）租户A，项目B下的dorissql任务B1-B50 |
| 23 |  | 2）未添加推荐依赖，保存并提交任务，进入【任务依赖配置有误】弹窗： |
| 24 |  | a）展示缺失上游依赖任务如下： |
| 25 |  | i）租户A，项目B下的dorissql任务B1-B50 |
| 26 |  | b）点击“仍要提交”：进入提交弹窗，确认后，任务提交成功 |

