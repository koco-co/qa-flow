---
suite_name: "相似数据源"
description: "相似数据源用例归档"
tags:
  - "据源"
  - "指标"
  - "能正常"
  - "其他的"
  - "引入的"
  - "对应的"
  - "数据源"
  - "下建表"
  - "第一个"
  - "产功能"
  - "是否生效"
  - "数据地图"
  - "手动引入"
  - "验证其他"
  - "同步功能"
prd_version: "v6.3.4"
dev_version:
  - "袋鼠云"
create_at: "2026-04-05"
status: "草稿"
origin: "csv"
case_count: 41
case_id: 8842
---

##### 【P1】验证离线联想功能正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 创建离线项目一、离线项目二，分别建表test1、test2 | 创建成功 |
| 2 | 在离线项目一，输入以下sql查看联想是否正确：1）select * from one.test1;2)select * from test1;3)select * from two.test2查看输入schema和表时，联想是否正确 | 联想正确 |
| 3 | 项目二同理 | 联想正确 |

##### 【P1】验证离线表查询是否正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入离线开发，新建项目schema，查看表查询 | 表查询对应数据源类型下有该项目的schema |
| 2 | 新建临时查询任务，新建表，查看表查询 | 对应schema下有新建的表 |
| 3 | 进入另一个项目schema1，给schema新建表，然后进入表查询，查看schema下的表 | 有新建的表 |

##### 【P1】验证离线元数据同步功能正常

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 有离线项目one、two，分别在底层创建表test、test1 | 创建成功 |
| 2 | 在离线两个项目进行元数据同步，查看可以选择的表 | 返回数据正确 |
| 3 | 在离线两个项目进行整库同步，查看可以选择的表 | 返回正确 |
| 4 | 进行元数据同步和整库同步 | 同步成功 |

##### 【P1】验证跨schema血缘脱敏是否正确

> 前置条件

```
离线有项目one，two，都有表ks0526_0_1
离线项目one创建表
create table ks0526_0_2  as select * from two.ks0526_0_1;
离线项目two创建表
create table ks0526_0_2  as select * from one.ks0526_0_1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 在数据资产-脱敏，选择one_HADOOP、one、ks0526_0_1，查看两个schema下ks0526_0_1、ks0526_0_2的脱敏效果 | one的ks0526_0_1被脱敏、ks0526_0_2未被脱敏two的ks0526_0_1未被脱敏、ks0526_0_1被脱敏 |
| 2 | 在数据资产-脱敏，选择one_HADOOP、two、ks0526_0_1，查看两个schema下ks0526_0_1、ks0526_0_2的脱敏效果 | one的ks0526_0_1未被脱敏、ks0526_0_2被脱敏two的ks0526_0_1被脱敏、ks0526_0_1未被脱敏 |

##### 【P1】验证资产脱敏是否正确

> 前置条件

```
离线有项目one、two，分别有表
CREATE TABLE  ks0526_0_1 (
id INT COMMENT “用户ID“,
name VARCHAR(50) COMMENT “用户姓名“
);
insert into ks0526_0_1 values (1,'zhangsan'),(2222,'lisi');
-- ok
create table ks0526_0_2 as select * from ks0526_0_1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 在数据资产-脱敏，选择one_HADOOP、one、ks0526_0_1，查看两个schema下ks0526_0_1、ks0526_0_2的脱敏效果 | one的ks0526_0_1、ks0526_0_2被脱敏two的ks0526_0_1、ks0526_0_1未被脱敏 |
| 2 | 在数据资产-脱敏，选择one_HADOOP、two、ks0526_0_1，查看两个schema下ks0526_0_1、ks0526_0_2的脱敏效果 | one的ks0526_0_1、ks0526_0_2未被脱敏two的ks0526_0_1、ks0526_0_1被脱敏 |

## 数据权限管理是否在离线生效-->

### doris

##### 【P1】验证同一数据表配置多次权限，权限生效功能

> 前置条件

```
1、引入的meta数据源是，当前资产第一个引入的meta数据源，one_doris
2、在引入同类型的meta相似数据源，two_doris
3、有非管理员用户user1、user2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据权限管理选择one_doris、one、表test，表级权限选择ddl、生效用户选择user1 | 配置成功 |
| 2 | 进入数据权限管理选择two_doris、one、表test，表级权限选择ddl、生效用户选择user2 | 配置成功 |
| 3 | 用户user1，进入离线项目one，执行sql：ALTER TABLE test RENAME COLUMN name  user_name; | 报错没权限 |
| 4 | 用户user2，进入离线项目one，执行sql：ALTER TABLE test RENAME COLUMN name  user_name; | 执行成功 |

##### 【P1】验证引入的相似数据源，其他的schema，配置数据权限管理ddl是否生效

> 前置条件

```
1、引入的meta数据源是，当前资产第一个引入的meta数据源，one_doris
2、在引入同类型的meta相似数据源，two_doris
3、有非管理员用户user1、user2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据权限管理选择two_doris、two、表test1，表级权限选择ddl、生效用户选择user1 | 配置成功 |
| 2 | 用户user1，进入离线项目two，执行sql：ALTER TABLE test1 RENAME COLUMN name  user_name; | 执行成功 |
| 3 | 用户user2，进入离线项目two，执行sql：ALTER TABLE test1 RENAME COLUMN name  user_name; | 报错没权限 |

##### 【P1】验证引入的相似数据源数据源-引入的meta对应的schema，配置数据权限管理ddl是否生效

> 前置条件

```
1、引入的meta数据源是，当前资产第一个引入的meta数据源，one_doris
2、在引入同类型的meta相似数据源，two_doris
3、有非管理员用户user1、user2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据权限管理选择two_doris、one、表test，表级权限选择ddl、生效用户选择user1 | 配置成功 |
| 2 | 用户user1，进入离线项目two，执行sql：ALTER TABLE one.test RENAME COLUMN name  user_name; | 执行成功 |
| 3 | 用户user2，进入离线项目two，执行sql：ALTER TABLE one.test RENAME COLUMN name  user_name; | 报错没权限 |

##### 【P1】验证引入的meta数据源，其他的schema，配置数据权限管理ddl是否生效

> 前置条件

```
1、引入的meta数据源是，当前资产第一个引入的meta数据源，one_doris
2、在引入同类型的meta相似数据源，two_doris
3、有非管理员用户user1、user2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据权限管理选择one_doris、two、表test1，表级权限选择ddl、生效用户选择user1 | 配置成功 |
| 2 | 用户user1，进入离线项目one，执行sql：ALTER TABLE two.test1 RENAME COLUMN name  user_name; | 执行成功 |
| 3 | 用户user2，进入离线项目one，执行sql：ALTER TABLE two.test1 RENAME COLUMN name  user_name; | 报错没权限 |
| 4 | 1、引入的meta数据源是，当前资产第一个引入的meta数据源，one_doris |  |
| 5 | 2、在引入同类型的meta相似数据源，two_doris |  |
| 6 | 3、有非管理员用户user1、user2 |  |

##### 【P1】验证引入的meta数据源，对应的schema，配置数据权限管理ddl是否生效

> 前置条件

```
1、引入的meta数据源是，当前资产第一个引入的meta数据源，one_doris
2、在引入同类型的meta相似数据源，two_doris
3、有非管理员用户user1、user2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据权限管理选择one_doris、one、表test，表级权限选择ddl、生效用户选择user1 | 配置成功 |
| 2 | 用户user1，进入离线项目one，执行sql：ALTER TABLE test RENAME COLUMN name  user_name; | 执行成功 |
| 3 | 用户user2，进入离线项目one，执行sql：ALTER TABLE test RENAME COLUMN name  user_name; | 报错没权限 |

### StarRocks

##### 【P1】验证同一数据表配置多次权限，权限生效功能

> 前置条件

```
1、引入的meta数据源是，当前资产第一个引入的meta数据源，one_StarRocks
2、在引入同类型的meta相似数据源，two_StarRocks
3、有非管理员用户user1、user2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据权限管理选择one_StarRocks、one、表test，表级权限选择ddl、生效用户选择user1 | 配置成功 |
| 2 | 进入数据权限管理选择two_StarRocks、one、表test，表级权限选择ddl、生效用户选择user2 | 配置成功 |
| 3 | 用户user1，进入离线项目one，执行sql：ALTER TABLE test RENAME COLUMN name  user_name; | 报错没权限 |
| 4 | 用户user2，进入离线项目one，执行sql：ALTER TABLE test RENAME COLUMN name  user_name; | 执行成功 |

##### 【P1】验证引入的相似数据源，其他的schema，配置数据权限管理ddl是否生效

> 前置条件

```
1、引入的meta数据源是，当前资产第一个引入的meta数据源，one_StarRocks
2、在引入同类型的meta相似数据源，two_StarRocks
3、有非管理员用户user1、user2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据权限管理选择two_StarRocks、two、表test1，表级权限选择ddl、生效用户选择user1 | 配置成功 |
| 2 | 用户user1，进入离线项目two，执行sql：ALTER TABLE test1 RENAME COLUMN name  user_name; | 执行成功 |
| 3 | 用户user2，进入离线项目two，执行sql：ALTER TABLE test1 RENAME COLUMN name  user_name; | 报错没权限 |

##### 【P1】验证引入的相似数据源数据源-引入的meta对应的schema，配置数据权限管理ddl是否生效

> 前置条件

```
1、引入的meta数据源是，当前资产第一个引入的meta数据源，one_StarRocks
2、在引入同类型的meta相似数据源，two_StarRocks
3、有非管理员用户user1、user2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据权限管理选择two_StarRocks、one、表test，表级权限选择ddl、生效用户选择user1 | 配置成功 |
| 2 | 用户user1，进入离线项目two，执行sql：ALTER TABLE one.test RENAME COLUMN name  user_name; | 执行成功 |
| 3 | 用户user2，进入离线项目two，执行sql：ALTER TABLE one.test RENAME COLUMN name  user_name; | 报错没权限 |

##### 【P1】验证引入的meta数据源，其他的schema，配置数据权限管理ddl是否生效

> 前置条件

```
1、引入的meta数据源是，当前资产第一个引入的meta数据源，one_StarRocks
2、在引入同类型的meta相似数据源，two_StarRocks
3、有非管理员用户user1、user2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据权限管理选择one_StarRocks、two、表test1，表级权限选择ddl、生效用户选择user1 | 配置成功 |
| 2 | 用户user1，进入离线项目one，执行sql：ALTER TABLE two.test1 RENAME COLUMN name  user_name; | 执行成功 |
| 3 | 用户user2，进入离线项目one，执行sql：ALTER TABLE two.test1 RENAME COLUMN name  user_name; | 报错没权限 |

##### 【P1】验证引入的meta数据源，对应的schema，配置数据权限管理ddl是否生效

> 前置条件

```
1、引入的meta数据源是，当前资产第一个引入的meta数据源，one_StarRocks
2、在引入同类型的meta相似数据源，two_StarRocks
3、有非管理员用户user1、user2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据权限管理选择one_StarRocks、one、表test，表级权限选择ddl、生效用户选择user1 | 配置成功 |
| 2 | 用户user1，进入离线项目one，执行sql：ALTER TABLE test RENAME COLUMN name  user_name; | 执行成功 |
| 3 | 用户user2，进入离线项目one，执行sql：ALTER TABLE test RENAME COLUMN name  user_name; | 报错没权限 |

### hive

##### 【P1】验证同一数据表配置多次权限，权限生效功能

> 前置条件

```
1、引入的meta数据源是，当前资产第一个引入的meta数据源，one_hive
2、在引入同类型的meta相似数据源，two_hive
3、有非管理员用户user1、user2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据权限管理选择one_hive、one、表test，表级权限选择ddl、生效用户选择user1 | 配置成功 |
| 2 | 进入数据权限管理选择two_hive、one、表test，表级权限选择ddl、生效用户选择user2 | 配置成功 |
| 3 | 用户user1，进入离线项目one，执行sql：ALTER TABLE test RENAME COLUMN name  user_name; | 报错没权限 |
| 4 | 用户user2，进入离线项目one，执行sql：ALTER TABLE test RENAME COLUMN name  user_name; | 执行成功 |

##### 【P1】验证引入的相似数据源，其他的schema，配置数据权限管理ddl是否生效

> 前置条件

```
1、引入的meta数据源是，当前资产第一个引入的meta数据源，one_HADOOP
2、在引入同类型的meta相似数据源，two_HADOOP
3、有非管理员用户user1、user2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据权限管理选择two_HADOOP、two、表test1，表级权限选择ddl、生效用户选择user1 | 配置成功 |
| 2 | 用户user1，进入离线项目two，执行sql：ALTER TABLE test1 RENAME COLUMN name  user_name; | 执行成功 |
| 3 | 用户user2，进入离线项目two，执行sql：ALTER TABLE test1 RENAME COLUMN name  user_name; | 报错没权限 |

##### 【P1】验证引入的相似数据源数据源-引入的meta对应的schema，配置数据权限管理ddl是否生效

> 前置条件

```
1、引入的meta数据源是，当前资产第一个引入的meta数据源，one_HADOOP
2、在引入同类型的meta相似数据源，two_HADOOP
3、有非管理员用户user1、user2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据权限管理选择two_HADOOP、one、表test，表级权限选择ddl、生效用户选择user1 | 配置成功 |
| 2 | 用户user1，进入离线项目two，执行sql：ALTER TABLE one.test RENAME COLUMN name  user_name; | 执行成功 |
| 3 | 用户user2，进入离线项目two，执行sql：ALTER TABLE one.test RENAME COLUMN name  user_name; | 报错没权限 |

##### 【P1】验证引入的meta数据源，其他的schema，配置数据权限管理ddl是否生效

> 前置条件

```
1、引入的meta数据源是，当前资产第一个引入的meta数据源，one_HADOOP
2、在引入同类型的meta相似数据源，two_HADOOP
3、有非管理员用户user1、user2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据权限管理选择one_HADOOP、two、表test1，表级权限选择ddl、生效用户选择user1 | 配置成功 |
| 2 | 用户user1，进入离线项目one，执行sql：ALTER TABLE two.test1 RENAME COLUMN name  user_name; | 执行成功 |
| 3 | 用户user2，进入离线项目one，执行sql：ALTER TABLE two.test1 RENAME COLUMN name  user_name; | 报错没权限 |

##### 【P1】验证引入的meta数据源，对应的schema，配置数据权限管理ddl是否生效

> 前置条件

```
1、引入的meta数据源是，当前资产第一个引入的meta数据源，one_HADOOP
2、在引入同类型的meta相似数据源，two_HADOOP
3、有非管理员用户user1、user2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据权限管理选择one_HADOOP、one、表test，表级权限选择ddl、生效用户选择user1 | 配置成功 |
| 2 | 用户user1，进入离线项目one，执行sql：ALTER TABLE test RENAME COLUMN name  user_name; | 执行成功 |
| 3 | 用户user2，进入离线项目one，执行sql：ALTER TABLE test RENAME COLUMN name  user_name; | 报错没权限 |

### inceptor

##### 【P0】验证同一数据表配置多次权限，权限生效功能

> 前置条件

```
1、引入的meta数据源是，当前资产第一个引入的meta数据源，one_inceptor
2、在引入同类型的meta相似数据源，two_inceptor
3、有非管理员用户user1、user2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据权限管理选择one_inceptor、one、表test，表级权限选择ddl、生效用户选择user1 | 配置成功 |
| 2 | 进入数据权限管理选择two_inceptor、one、表test，表级权限选择ddl、生效用户选择user2 | 配置成功 |
| 3 | 用户user1，进入离线项目one，执行sql：ALTER TABLE test RENAME COLUMN name  user_name; | 执行成功 |
| 4 | 用户user2，进入离线项目one，执行sql：ALTER TABLE test RENAME COLUMN name  user_name; | 执行成功 |

##### 【P1】验证引入的相似数据源，其他的schema，配置数据权限管理ddl是否生效

> 前置条件

```
1、引入的meta数据源是，当前资产第一个引入的meta数据源，one_Inceptor
2、在引入同类型的meta相似数据源，two_Inceptor
3、有非管理员用户user1、user2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据权限管理选择two_Inceptor、two、表test1，表级权限选择ddl、生效用户选择user1 | 配置成功 |
| 2 | 用户user1，进入离线项目two，执行sql：ALTER TABLE test1 RENAME COLUMN name  user_name; | 执行成功 |
| 3 | 用户user2，进入离线项目two，执行sql：ALTER TABLE test1 RENAME COLUMN name  user_name; | 报错没权限 |

##### 【P1】验证引入的相似数据源数据源-引入的meta对应的schema，配置数据权限管理ddl是否生效

> 前置条件

```
1、引入的meta数据源是，当前资产第一个引入的meta数据源，one_Inceptor
2、在引入同类型的meta相似数据源，two_Inceptor
3、有非管理员用户user1、user2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据权限管理选择two_Inceptor、one、表test，表级权限选择ddl、生效用户选择user1 | 配置成功 |
| 2 | 用户user1，进入离线项目two，执行sql：ALTER TABLE one.test RENAME COLUMN name  user_name; | 执行成功 |
| 3 | 用户user2，进入离线项目two，执行sql：ALTER TABLE one.test RENAME COLUMN name  user_name; | 报错没权限 |

##### 【P1】验证引入的meta数据源，其他的schema，配置数据权限管理ddl是否生效

> 前置条件

```
1、引入的meta数据源是，当前资产第一个引入的meta数据源，one_Inceptor
2、在引入同类型的meta相似数据源，two_Inceptor
3、有非管理员用户user1、user2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据权限管理选择one_Inceptor、two、表test1，表级权限选择ddl、生效用户选择user1 | 配置成功 |
| 2 | 用户user1，进入离线项目one，执行sql：ALTER TABLE two.test1 RENAME COLUMN name  user_name; | 执行成功 |
| 3 | 用户user2，进入离线项目one，执行sql：ALTER TABLE two.test1 RENAME COLUMN name  user_name; | 报错没权限 |

##### 【P0】验证引入的meta数据源，对应的schema，配置数据权限管理ddl是否生效

> 前置条件

```
1、引入的meta数据源是，当前资产第一个引入的meta数据源，one_Inceptor
2、在引入同类型的meta相似数据源，two_Inceptor
3、有非管理员用户user1、user2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据权限管理选择one_Inceptor、one、表test，表级权限选择ddl、生效用户选择user1 | 配置成功 |
| 2 | 用户user1，进入离线项目one，执行sql：ALTER TABLE test RENAME COLUMN name  user_name; | 执行成功 |
| 3 | 用户user2，进入离线项目one，执行sql：ALTER TABLE test RENAME COLUMN name  user_name; | 报错没权限 |

##### 【P1】验证已同步进来的历史数据源是否正确

> 前置条件

```
历史数据源有history_HADOOP
histoy下有表test，在第一个meta数据源的对应库下也有test
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 查看数据源列表，history_HADOOP，是否依旧被引入资产 | 依旧被引入 |
| 2 | 数据地图搜索表test | 有多张test |
| 3 | 在数据地图的搜索表test，查看history_HADOOP下的表展示 | 数据源展示本身的数据源和数据库 |
| 4 | 详情页，数据源展示 | 本身数据源+查看更多 |

##### 【P0】验证数据地图-数据表展示是否正确

> 前置条件

```
第一个hadoop类型的meta数据源：one_HADOOP
第二个hadoop类型的meta数据源：two_HADOOP
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入离线开发-项目one，创建spark sql类型的任务，创建表test | 表test自动同步到资产数据地图 |
| 2 | 查看test在数据地图列表的展示 | 数据源为one_HADOOP、数据库为one |
| 3 | 进入test表详情查看数据源 | 数据源只展示one_HADOOP和查看更多 |
| 4 | 点击查看更多 | 数据源为空，分页 |
| 5 | 进入离线开发-项目two，创建spark sql类型的任务，创建表test，查看数据地图 | 数据地图有两个表test，数据源都为one_HADOOP，数据库分别为one、two |
| 6 | 进入表详情查看数据源 | 数据源只展示one_HADOOP和查看更多 |
| 7 | 点击查看更多 | 数据源有two_HADOOP |

##### 【P0】验证跨schema血缘解析是否正确

> 前置条件

```
在项目bug_test_0509下，创建 create table if not exists source(id int,name varchar(255)); -- 第一层：主表 CREATE TABLE result AS SELECT * FROM source; -- 第二层：6张直接下游表（直接依赖主表） CREATE TABLE son_1 AS SELECT * FROM result; CREATE TABLE son_2 AS SELECT * FROM result; CREATE TABLE son_3 AS SELECT * FROM result; CREATE TABLE son_4 AS SELECT * FROM result; CREATE TABLE son_5 AS SELECT * FROM result; CREATE TABLE son_6 AS SELECT * FROM result; -- 第三层：为每张第二层表创建0-2张下游表 CREATE TABLE son_1_1 AS SELECT * FROM son_1 ; CREATE TABLE son_1_2 AS SELECT * FROM son_1 ; CREATE TABLE son_2_1 AS SELECT * FROM son_2 ; CREATE TABLE son_4_1 AS SELECT * FROM son_4 ; CREATE TABLE son_4_2 AS SELECT * FROM son_4 ; CREATE TABLE son_5_1 AS SELECT * FROM son_5 ;
在同租户项目bb_4_8下创建： CREATE TABLE son_1 AS SELECT * FROM bug_test_0509.result; CREATE TABLE son_2 AS SELECT * FROM bug_test_0509.result; CREATE TABLE son_3 AS SELECT * FROM bug_test_0509.result; CREATE TABLE son_4 AS SELECT * FROM bug_test_0509.result; CREATE TABLE son_5 AS SELECT * FROM bug_test_0509.result; CREATE TABLE son_6 AS SELECT * FROM bug_test_0509.result; CREATE TABLE son_1_1 AS SELECT * FROM bug_test_0509.son_1; CREATE TABLE son_1_2 AS SELECT * FROM bug_test_0509.son_1; CREATE TABLE son_2_1 AS SELECT * FROM bug_test_0509.son_2 ; CREATE TABLE son_4_1 AS SELECT * FROM bug_test_0509.son_4 ; CREATE TABLE son_4_2 AS SELECT * FROM bug_test_0509.son_4 ; CREATE TABLE son_5_1 AS SELECT * FROM bug_test_0509.son_5 ;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 1）项目bug_test_0509为第一个meta数据源的项目2）在项目中执行sql，然后进入离线数据地图查看表详情3）进入数据资产-数据地图，查看表详情 | 1）血缘解析正确，上下游表数量、直接上下游表数量正确2）表级血缘和字段级血缘都解析正确，相似数据源下的表也正确展示 |
| 2 | 1）项目bug_test_0509、bb_4_8都不是第一个meta数据源的项目2）在项目中执行sql，然后进入离线数据地图查看表详情3）进入数据资产-数据地图，查看表详情 | 1）血缘解析正确，上下游表数量、直接上下游表数量正确2）表级血缘和字段级血缘都解析正确，相似数据源下的表也正确展示3）血缘图上，表的数据源为第一个meta数据源名称，schema为表实际所在的schema |

##### 【P1】验证手动引入meta数据源功能

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 在同一租户下，创建多个项目，进入数据资产-平台管理-数据源管理-引入数据源，查看列表 | 每种类型数据源的第一个meta数据源不在列表展示，其他meta数据源均在列表展示 |
| 2 | 引入一个meta数据源 | 提示：xxx数据源已存在相似数据源，请确认是否进行引入？若引入后进行元数据同步可能会导致数据地图存在重复表。 |
| 3 | 引入多个meta数据源为相似数据源 | 提示“xxx数据源、xxx数据源等已存在相似数据源，请确认是否进行引入？若引入后进行元数据同步可能会导致数据地图存在重复表。” |
| 4 | 点击确定 | 1）引入成功2）元数据同步列表没有自动生成该数据源的同步任务 |

## 自动引入的meta数据源-->

##### 【P0】验证其他schema下建表，进行自动同步

> 前置条件

```
CREATE TABLE   `new0526_1` (
`id` int(11)
`name` varchar(50)
`age` int
) ;
ALTER TABLE new0526_1 DROP COLUMN age;
-- 添加列
ALTER TABLE new0526_1 ADD COLUMN age4 INT ;
ALTER TABLE new0526_1 RENAME COLUMN name  user_name;
-- 修改列类型
ALTER TABLE new0526_1 MODIFY COLUMN age varchar(20);
insert into new0526_1 values (1,'z',18);
update new0526_1 set age = 19 where id = '1';
-- 修改表名
ALTER TABLE new0526_1 RENAME new0526_2;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入其他项目，执行建表语句、插入数据、select查询、更新字段、修改表名、修改字段值等操作，查看是否自动同步 | 同步成功 |
| 2 | 进入元数据同步，新增元数据同步任务，选择步骤一中的表 | 同步成功 |

### 第一个meta的schema-->

##### 【P1】验证修改字段值自动同步功能

> 前置条件

```
CREATE TABLE   `new0526_1` (
`id` int(11)
`name` varchar(50)
`age` int
) ;
insert into new0526_1 values (1,'z',18);
update new0526_1 set age = 19 where id = '1';
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 在离线执行前置条件的sql，查看数据地图表详情 | 表数据正确 |
| 2 | 查看操作记录 | 有对应操作记录生成 |

##### 【P1】验证修改表名自动同步功能

> 前置条件

```
CREATE TABLE   `new0526_1` (
`id` int(11)
`name` varchar(50)
`age` int
) ;
-- 修改表名
ALTER TABLE new0526_1 RENAME new0526_2;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 在离线执行前置条件的sql，查看数据地图表详情 | 表数据正确 |
| 2 | 查看操作记录 | 有对应操作记录生成 |

##### 【P1】验证更新字段自动同步功能

> 前置条件

```
CREATE TABLE   `new0526_1` (
`id` int(11)
`name` varchar(50)
`age` int
) ;
-- 添加列
ALTER TABLE new0526_1 ADD COLUMN age4 INT ;
--删除列
ALTER TABLE new0526_1 DROP COLUMN age;
--修改列名
ALTER TABLE new0526_1 RENAME COLUMN name  user_name;
-- 修改列类型
ALTER TABLE new0526_1 MODIFY COLUMN age varchar(20);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 在离线执行前置条件的sql，查看数据地图表详情 | 表数据正确 |
| 2 | 查看操作记录 | 有对应操作记录生成 |

##### 【P1】验证select操作自动同步功能

> 前置条件

```
CREATE TABLE   `new0526_1` (
`id` int(11)
`name` varchar(50)
`age` int
) ;
insert into new0526_1 values (1,'z',18);
select * from new0526_1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 在离线执行前置条件的sql，查看数据地图表详情 | 表数据正确 |
| 2 | 查看操作记录 | 有对应操作记录生成 |

##### 【P1】验证插入数据自动同步功能

> 前置条件

```
CREATE TABLE   `new0526_1` (
`id` int(11)
`name` varchar(50)
`age` int
) ;
insert into new0526_1 values (1,'z',18);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 在离线执行前置条件的sql，查看数据地图表详情 | 表数据预览正确 |
| 2 | 查看操作记录 | 有对应操作记录生成 |

##### 【P0】验证建表自动同步功能

> 前置条件

```
CREATE TABLE   `new0526_1` (
`id` int(11)
`name` varchar(50)
`age` int
) ;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进行建表，create table spark (id int,name varchar(20));，查看数据资产数据地图是否有表 | 表被自动同步到资产 |

##### 【P0】验证meta数据源，数据同步功能

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 资产没有mysql类型的meta数据源，创建离线项目one，查看one_MYSQL是否自动引入资产 | 1）meta数据源one_MYSQL自动引入到资产2）元数据同步列表生成一条one_MYSL——one的元数据同步任务 |
| 2 | 再次创建离线项目two，查看two_MYSQL是否自动同步到资产 | 1）meta数据源two_MYSQL没有自动引入到资产2）引入数据源弹窗中存在two_MYSQL2）元数据同步列表新生成一条one_MYSL——two的元数据同步任务 |

## 【6.3】

##### 【P0】验证doris多集群配置下，meta数据源同步功能

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 资产没有doris的meta数据源，创建离线项目，对接多个doris，查看doris的meta数据源是否都同步到资产 | 该项目的所有doris类型meta数据源都自动同步到资产 |
| 2 | 再次创建离线项目，对接任意一个或多个doris，查看meta数据源是否被同步到资产 | 1）和项目一相同集群的doris数据源没有自动引入到资产2）和项目一不同集群的doris数据源，自动引入到资产 |

##### 【P1】验证同一集群、同一计算引擎，指标/标签生成的第一个meta数据源默认引入资产功能

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 资产没有trino类型的meta数据源，创建指标/标签，查看项目trino类型的meta数据源是否自动同步到资产 | 自动引入到资产 |
| 2 | 再次创建指标/标签项目，查看新项目的trino类型meta数据源是否自动引入到资产 | 没有自动引入到资产 |

##### 【P0】验证同一集群、同一计算引擎，离线生成的第一个meta数据源默认引入资产功能

> 前置条件

```
hive、mysql、doris、starrocks...，以mysql为例
数据源自动引入设置，离线选择全部数据源
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 资产没有mysql类型的meta数据源，创建离线项目一，查看mysql类型的meta数据源是否自动同步到资产 | meta数据源自动引入到资产 |
| 2 | 再次创建离线项目二，新项目的meta数据源是否自动引入到资产 | meta数据源没有自动引入到资产 |
| 3 | 其他类型数据源同理 |  |

##### 【P1】验证【数据源自动引入设置】页面的文案调整

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入平台管理-数据源管理-数据源自动引入设置，查看上方文案展示 | 展示：针对离线开发、指标、标签子产品自动引入的数据源信息，支持按照子产品、数据源类型维度进行设置开启/关闭自动引入功能，关闭后在其他子产品生成的meta数据源将不会自动引入/自动创建周期同步任务，只能通过手动引入数据源的方式实现。注意：资产默认取同一个子产品、同一个计算引擎下的第一个meta数据源作为同步数据源，后续生成的meta数据源会自动取对应的schema在资产创建同步任务，不会再同步相似数据源。 |
