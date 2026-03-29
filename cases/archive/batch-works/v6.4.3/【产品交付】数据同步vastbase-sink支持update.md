---
name: 【产品交付】数据同步vastbase-sink支持update v6.4.3
description: 【产品交付】数据同步vastbase-sink支持update v6.4.3
tags:
  - 离线开发
  - 数据同步vastbase支持update
  - 产品交付
  - 数据同步vastbase
  - sink支持update
module: batch-works
version: v6.4.3
source: zentao-cases/dtstack-platform/离线开发/archive-cases/v6.4.3/【产品交付】数据同步vastbase-sink支持update.csv
case_count: 16
created_at: 2026-03-29
origin: csv
---
# 【产品交付】数据同步vastbase-sink支持update v6.4.3
> 来源：zentao-cases/dtstack-platform/离线开发/archive-cases/v6.4.3/【产品交付】数据同步vastbase-sink支持update.csv
> 用例数：16

---

## 数据同步vastbase支持update

##### 验证未映射字段保持不变 「P2」

> 前置条件
```
vastbase建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255),
bir VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice','mengfei');
INSERT INTO test_table VALUES (2, 'Bob','kako');
SELECT * FROM test_table;
mysql建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255),
bir VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice_chongtu','mengfei_chongtu');
INSERT INTO test_table VALUES (3, 'keke','kako_chongtu');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建向导模式的数据同步任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 选择数据来源mysql | 进入选择目标界面 |
| 3 | schema | 进入选择字段映射界面 |
| 4 | 表名：前置表 | 进入通道控制页面 |
| 5 | 点击下一步 | 任务保存、运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 6 | 选择数据目标vastbase | 对应主键冲突的数据被update，未冲突的数据正常插入，未映射的字段数据不做更改，结果应当是： |
| 7 | schema | 1, 'Alice','mengfei_chogntu' |
| 8 | 表名：前置表 | 2, 'Bob','kako' |
| 9 | 主键冲突选择on duplicate key update | 3, 'keke','kako_chongtu' |
| 10 | 点击下一步 |  |
| 11 | 配置字段映射，name字段不进行映射，点击下一步 |  |
| 12 | 点击下一步，点击保存，点击运行 |  |
| 13 | select查询vastbase数据表结果 |  |

##### 验证数据来源为mysql数据源，vastbase作为目标端时，主键冲突选择insert任务正常运行 「P2」

> 前置条件
```
vastbase建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice');
INSERT INTO test_table VALUES (2, 'Bob');
SELECT * FROM test_table;
mysql建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice_chongtu');
INSERT INTO test_table VALUES (3, 'keke');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建向导模式的数据同步任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 选择数据来源mysql | 进入选择目标界面 |
| 3 | schema | 进入选择字段映射界面 |
| 4 | 表名：前置表 | 进入通道控制页面 |
| 5 | 点击下一步 | 任务运行失败，报错脏数据 |
| 6 | 选择数据目标vastbase | 表数据未改变，数据没有插入 |
| 7 | schema | 展示脏数据：1, 'Alice' |
| 8 | 表名：前置表 |  |
| 9 | 主键冲突选择insert |  |
| 10 | 点击下一步 |  |
| 11 | 配置同字段映射，点击下一步 |  |
| 12 | 勾选脏数据管理 |  |
| 13 | 脏数据表：dirty_01 |  |
| 14 | 点击下一步，点击保存，点击运行 |  |
| 15 | select查询vastbase数据表结果 |  |
| 16 | 进入运维中心查看脏数据表内容 |  |

##### 验证数据来源为spark数据源，vastbase作为目标端时，主键冲突无法选择on duplicate key update 「P2」

> 前置条件
```
vastbase建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice');
INSERT INTO test_table VALUES (2, 'Bob');
SELECT * FROM test_table;
inceptor建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT,
name VARCHAR(255),
PRIMARY KEY(id)
)
STORED AS ORC
TBLPROPERTIES (
'transactional' = 'true'
);
INSERT INTO test_table VALUES (1, 'Alice_chongtu');
INSERT INTO test_table VALUES (3, 'Bob');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建向导模式的数据同步任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 选择数据来源选择spark | 进入选择目标界面 |
| 3 | 表名：test_zhouqi_001 | 不展示on duplicate key update选项 |
| 4 | 点击下一步 |  |
| 5 | 点击主键冲突下拉框 |  |

##### 验证手动任务 手动任务运行——验证上述数据同步任务运维中心手动运行正常 「P2」

> 前置条件
```
vastbase建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice');
INSERT INTO test_table VALUES (2, 'Bob');
SELECT * FROM test_table;
mysql建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice_chongtu');
INSERT INTO test_table VALUES (3, 'keke');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建向导模式的数据同步任务 | 成功进入数据开发模块，新建向导模式的数据同步任务页面，页面内容正常加载显示，无报错 |
| 2 | 上述任务提交至运维中心 | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 3 | 进入运维中心-手动任务管理，选择上述任务点击运行 | 任务状态更新为【运行成功】，运行日志无错误信息，输出结果符合预期 |

##### 验证数据来源为oracle数据源，vastbase作为目标端时，主键冲突选择on duplicate key update任务正常运行 「P1」

> 前置条件
```
vastbase建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice');
INSERT INTO test_table VALUES (2, 'Bob');
SELECT * FROM test_table;
oracle建表语句：
CREATE TABLE test_table (
id NUMBER PRIMARY KEY,
name VARCHAR2(255)
);
INSERT INTO test_table VALUES (1, 'Alice_chongtu');
INSERT INTO test_table VALUES (3, 'hello');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建向导模式的数据同步任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 选择数据来源oracle | 进入选择目标界面 |
| 3 | schema | 进入选择字段映射界面 |
| 4 | 表名：前置表 | 进入通道控制页面 |
| 5 | 点击下一步 | 任务保存、运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 6 | 选择数据目标vastbase | 对应主键冲突的数据被update，未冲突的数据正常插入 |
| 7 | schema |  |
| 8 | 表名：前置表 |  |
| 9 | 主键冲突选择on duplicate key update |  |
| 10 | 点击下一步 |  |
| 11 | 配置同字段映射，点击下一步 |  |
| 12 | 点击下一步，点击保存，点击运行 |  |
| 13 | select查询vastbase数据表结果 |  |

##### 验证数据来源为mysql数据源，vastbase作为目标端时，主键冲突选择on duplicate key update任务正常运行 「P1」

> 前置条件
```
vastbase建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice');
INSERT INTO test_table VALUES (2, 'Bob');
SELECT * FROM test_table;
mysql建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice_chongtu');
INSERT INTO test_table VALUES (3, 'keke');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建向导模式的数据同步任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 选择数据来源mysql | 进入选择目标界面 |
| 3 | schema | 进入选择字段映射界面 |
| 4 | 表名：前置表 | 进入通道控制页面 |
| 5 | 点击下一步 | 任务保存、运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 6 | 选择数据目标vastbase | 对应主键冲突的数据被update，未冲突的数据正常插入 |
| 7 | schema |  |
| 8 | 表名：前置表 |  |
| 9 | 主键冲突选择on duplicate key update |  |
| 10 | 点击下一步 |  |
| 11 | 配置同字段映射，点击下一步 |  |
| 12 | 点击下一步，点击保存，点击运行 |  |
| 13 | select查询vastbase数据表结果 |  |

##### 验证数据来源为inceptor数据源，vastbase作为目标端时，主键冲突选择on duplicate key update任务正常运行 「P1」

> 前置条件
```
vastbase建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice');
INSERT INTO test_table VALUES (2, 'Bob');
SELECT * FROM test_table;
inceptor建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT,
name VARCHAR(255),
PRIMARY KEY(id)
)
STORED AS ORC
TBLPROPERTIES (
'transactional' = 'true'
);
INSERT INTO test_table VALUES (1, 'Alice_chongtu');
INSERT INTO test_table VALUES (3, 'Bob');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建向导模式的数据同步任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 选择数据来源inceptor | 进入选择目标界面 |
| 3 | schema | 进入选择字段映射界面 |
| 4 | 表名：前置表 | 进入通道控制页面 |
| 5 | 点击下一步 | 任务保存、运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 6 | 选择数据目标vastbase | 对应主键冲突的数据被update，未冲突的数据正常插入 |
| 7 | schema |  |
| 8 | 表名：前置表 |  |
| 9 | 主键冲突选择on duplicate key update |  |
| 10 | 点击下一步 |  |
| 11 | 配置同字段映射，点击下一步 |  |
| 12 | 点击下一步，点击保存，点击运行 |  |
| 13 | select查询vastbase数据表结果 |  |

##### 验证数据来源为inceptor、mysql、oracle数据源，vastbase作为目标端时，主键冲突支持可选on duplicate key update 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建向导模式的数据同步任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 选择数据来源分别选择inceptor/mysql/oracle | 进入选择目标界面 |
| 3 | schema | 展示on duplicate key update可选 |
| 4 | 表名：test_zhouqi_001 |  |
| 5 | 点击下一步 |  |
| 6 | 点击主键冲突下拉框 |  |

##### 验证未映射字段保持不变 「P2」

> 前置条件
```
vastbase建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255),
bir VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice','mengfei');
INSERT INTO test_table VALUES (2, 'Bob','kako');
SELECT * FROM test_table;
mysql建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255),
bir VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice_chongtu','mengfei_chongtu');
INSERT INTO test_table VALUES (3, 'keke','kako_chongtu');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建向导模式的数据同步任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 选择数据来源mysql | 进入选择目标界面 |
| 3 | schema | 进入选择字段映射界面 |
| 4 | 表名：前置表 | 进入通道控制页面 |
| 5 | 点击下一步 | 任务保存、运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 6 | 选择数据目标vastbase | 对应主键冲突的数据被update，未冲突的数据正常插入，未映射的字段数据不做更改，结果应当是： |
| 7 | schema | 1, 'Alice','mengfei_chogntu' |
| 8 | 表名：前置表 | 2, 'Bob','kako' |
| 9 | 主键冲突选择on duplicate key update | 3, 'keke','kako_chongtu' |
| 10 | 点击下一步 |  |
| 11 | 配置字段映射，name字段不进行映射，点击下一步 |  |
| 12 | 点击下一步，点击保存，点击运行 |  |
| 13 | select查询vastbase数据表结果 |  |

##### 验证数据来源为mysql数据源，vastbase作为目标端时，主键冲突选择insert任务正常运行 「P2」

> 前置条件
```
vastbase建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice');
INSERT INTO test_table VALUES (2, 'Bob');
SELECT * FROM test_table;
mysql建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice_chongtu');
INSERT INTO test_table VALUES (3, 'keke');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建向导模式的数据同步任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 选择数据来源mysql | 进入选择目标界面 |
| 3 | schema | 进入选择字段映射界面 |
| 4 | 表名：前置表 | 进入通道控制页面 |
| 5 | 点击下一步 | 任务运行失败，报错脏数据 |
| 6 | 选择数据目标vastbase | 表数据未改变，数据没有插入 |
| 7 | schema | 展示脏数据：1, 'Alice' |
| 8 | 表名：前置表 |  |
| 9 | 主键冲突选择insert |  |
| 10 | 点击下一步 |  |
| 11 | 配置同字段映射，点击下一步 |  |
| 12 | 勾选脏数据管理 |  |
| 13 | 脏数据表：dirty_01 |  |
| 14 | 点击下一步，点击保存，点击运行 |  |
| 15 | select查询vastbase数据表结果 |  |
| 16 | 进入运维中心查看脏数据表内容 |  |

##### 验证数据来源为spark数据源，vastbase作为目标端时，主键冲突无法选择 update 「P2」

> 前置条件
```
vastbase建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice');
INSERT INTO test_table VALUES (2, 'Bob');
SELECT * FROM test_table;
inceptor建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT,
name VARCHAR(255),
PRIMARY KEY(id)
)
STORED AS ORC
TBLPROPERTIES (
'transactional' = 'true'
);
INSERT INTO test_table VALUES (1, 'Alice_chongtu');
INSERT INTO test_table VALUES (3, 'Bob');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建向导模式的数据同步任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 选择数据来源选择spark | 进入选择目标界面 |
| 3 | 表名：test_zhouqi_001 | 不展示on duplicate key update选项 |
| 4 | 点击下一步 |  |
| 5 | 点击主键冲突下拉框 |  |

##### 验证周期任务 周期运行——验证上述数据同步任务周期运行正常 「P2」

> 前置条件
```
vastbase建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice');
INSERT INTO test_table VALUES (2, 'Bob');
SELECT * FROM test_table;
mysql建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice_chongtu');
INSERT INTO test_table VALUES (3, 'keke');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建向导模式的数据同步任务 | 成功进入数据开发模块，新建向导模式的数据同步任务页面，页面内容正常加载显示，无报错 |
| 2 | 上述任务提交至运维中心 | 系统提示任务提交成功，任务状态更新为【待运行/调度中/运行中】 |
| 3 | 进入运维中心-周期任务管理，选择上述任务点击补数据 | 任务补数据运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |

##### 验证数据来源为oracle数据源，vastbase作为目标端时，主键冲突选择on duplicate key update任务正常运行 「P1」

> 前置条件
```
vastbase建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice');
INSERT INTO test_table VALUES (2, 'Bob');
SELECT * FROM test_table;
oracle建表语句：
CREATE TABLE test_table (
id NUMBER PRIMARY KEY,
name VARCHAR2(255)
);
INSERT INTO test_table VALUES (1, 'Alice_chongtu');
INSERT INTO test_table VALUES (3, 'hello');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建向导模式的数据同步任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 选择数据来源oracle | 进入选择目标界面 |
| 3 | schema | 进入选择字段映射界面 |
| 4 | 表名：前置表 | 进入通道控制页面 |
| 5 | 点击下一步 | 任务保存、运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 6 | 选择数据目标vastbase | 对应主键冲突的数据被update，未冲突的数据正常插入 |
| 7 | schema |  |
| 8 | 表名：前置表 |  |
| 9 | 主键冲突选择on duplicate key update |  |
| 10 | 点击下一步 |  |
| 11 | 配置同字段映射，点击下一步 |  |
| 12 | 点击下一步，点击保存，点击运行 |  |
| 13 | select查询vastbase数据表结果 |  |

##### 验证数据来源为mysql数据源，vastbase作为目标端时，主键冲突选择on duplicate key update任务正常运行 「P1」

> 前置条件
```
vastbase建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice');
INSERT INTO test_table VALUES (2, 'Bob');
SELECT * FROM test_table;
mysql建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice_chongtu');
INSERT INTO test_table VALUES (3, 'keke');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建向导模式的数据同步任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 选择数据来源mysql | 进入选择目标界面 |
| 3 | schema | 进入选择字段映射界面 |
| 4 | 表名：前置表 | 进入通道控制页面 |
| 5 | 点击下一步 | 任务保存、运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 6 | 选择数据目标vastbase | 对应主键冲突的数据被update，未冲突的数据正常插入 |
| 7 | schema |  |
| 8 | 表名：前置表 |  |
| 9 | 主键冲突选择on duplicate key update |  |
| 10 | 点击下一步 |  |
| 11 | 配置同字段映射，点击下一步 |  |
| 12 | 点击下一步，点击保存，点击运行 |  |
| 13 | select查询vastbase数据表结果 |  |

##### 验证数据来源为inceptor数据源，vastbase作为目标端时，主键冲突选择on duplicate key update任务正常运行 「P1」

> 前置条件
```
vastbase建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT PRIMARY KEY,
name VARCHAR(255)
);
INSERT INTO test_table VALUES (1, 'Alice');
INSERT INTO test_table VALUES (2, 'Bob');
SELECT * FROM test_table;
inceptor建表语句：
DROP TABLE IF EXISTS test_table;
CREATE TABLE test_table (
id INT,
name VARCHAR(255),
PRIMARY KEY(id)
)
STORED AS ORC
TBLPROPERTIES (
'transactional' = 'true'
);
INSERT INTO test_table VALUES (1, 'Alice_chongtu');
INSERT INTO test_table VALUES (3, 'Bob');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建向导模式的数据同步任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 选择数据来源inceptor | 进入选择目标界面 |
| 3 | schema | 进入选择字段映射界面 |
| 4 | 表名：前置表 | 进入通道控制页面 |
| 5 | 点击下一步 | 任务保存、运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 6 | 选择数据目标vastbase | 对应主键冲突的数据被update，未冲突的数据正常插入 |
| 7 | schema |  |
| 8 | 表名：前置表 |  |
| 9 | 主键冲突选择on duplicate key update |  |
| 10 | 点击下一步 |  |
| 11 | 配置同字段映射，点击下一步 |  |
| 12 | 点击下一步，点击保存，点击运行 |  |
| 13 | select查询vastbase数据表结果 |  |

##### 验证数据来源为inceptor、mysql、oracle数据源，vastbase作为目标端时，主键冲突支持可选update 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建向导模式的数据同步任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 选择数据来源分别选择inceptor/mysql/oracle | 进入选择目标界面 |
| 3 | schema | 展示on duplicate key update可选 |
| 4 | 表名：test_zhouqi_001 |  |
| 5 | 点击下一步 |  |
| 6 | 点击主键冲突下拉框 |  |

