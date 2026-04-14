---
suite_name: "完整性校验，支持多表数据内容对比"
description: "完整性校验，支持多表数据内容对比用例归档"
tags:
  - "条件"
  - "串条件"
  - "下的校验"
  - "条件校验"
  - "完整性校验"
  - "对比表添加"
  - "仅一个表通过"
  - "删除功能正常"
  - "校验类型新增"
  - "记录满足期望值"
  - "分区表在主键匹配"
  - "包含与不包含字符"
  - "多主键联合匹配下"
  - "部分记录不满足条"
  - "单主键匹配下交集"
prd_version: "v6.4.3"
dev_version:
  - "袋鼠云"
create_at: "2026-04-05"
status: "草稿"
origin: "csv"
case_count: 9
case_id: 9339
---

##### 【P2】验证分区表在主键匹配下的校验

> 前置条件

```
DROP TABLE IF EXISTS doris_check_table;
DROP TABLE IF EXISTS doris_compare_table_1;
-- 实际 Doris 中需使用 RANGE 或 LIST 分区，此处简化表示
-- 假设系统支持运行时指定分区过滤条件
CREATE TABLE doris_check_table (
id INT,
dt VARCHAR(8),
value INT
) ENGINE=OLAP
PARTITION BY RANGE(`dt`) (
PARTITION p20250401 VALUES LESS THAN (“20250402“),
PARTITION p20250402 VALUES LESS THAN (“20250403“)
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
CREATE TABLE doris_compare_table_1 (
user_id INT,
dt VARCHAR(8),
value INT
) ENGINE=OLAP
PARTITION BY RANGE(`dt`) (
PARTITION p20250401 VALUES LESS THAN (“20250402“),
PARTITION p20250402 VALUES LESS THAN (“20250403“)
)
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
INSERT INTO doris_check_table VALUES
(1, '20250401', 100),
(2, '20250401', 200);
INSERT INTO doris_compare_table_1 VALUES
(1, '20250401', 150),
(2, '20250401', 250);
-- 运行规则时选择分区 dt='20250401'
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「监控对象」后, 选择规则类型为「多表数据内容对比」 | 选择成功 |
| 4 | 校验表：表：doris_check_table分区：选择 dt='20250401'字段：value期望值：> 50主键：id | 配置成功 |
| 5 | 对比表：表：doris_compare_table_1分区：选择 dt='20250401'字段：value期望值：> 100主键：user_id | 添加成功 |
| 6 | 选择判断关系为「或」 | 选择成功 |
| 7 | 保存并运行规则任务 | 运行成功, 状态为「校验通过」 |

##### 【P1】验证包含与不包含字符串条件

> 前置条件

```
DROP TABLE IF EXISTS doris_check_table;
DROP TABLE IF EXISTS doris_compare_table_1;
CREATE TABLE doris_check_table (
id INT,
name VARCHAR(50)
) ENGINE=OLAP
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
CREATE TABLE doris_compare_table_1 (
user_id INT,
name VARCHAR(50)
) ENGINE=OLAP
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
INSERT INTO doris_check_table VALUES
(1, 'Alice'),
(2, 'Bob'),
(3, 'Charlie');  -- 包含 'lie'
INSERT INTO doris_compare_table_1 VALUES
(101, 'David'),
(102, 'Eve');  -- 均不包含 'son'
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「监控对象」后, 选择规则类型为「多表数据内容对比」 | 选择成功 |
| 4 | 校验表：表：doris_check_table字段：name期望值：包含 lie主键：不选 | 配置成功 |
| 5 | 对比表：表：doris_compare_table_1字段：name期望值：不包含 son主键：不选 | 添加成功 |
| 6 | 选择判断关系为「或」 | 选择成功 |
| 7 | 保存并运行规则任务 | 运行成功, 状态为「校验通过」 |
| 8 | 编辑规则任务, 选择判断关系修改为「且」 | 编辑成功 |
| 9 | 保存并运行规则任务 | 运行成功, 状态为「校验失败」 |

##### 【P1】验证 in 和 not in 条件校验

> 前置条件

```
DROP TABLE IF EXISTS doris_check_table;
DROP TABLE IF EXISTS doris_compare_table_1;
CREATE TABLE doris_check_table (
id INT,
category VARCHAR(10)
) ENGINE=OLAP
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
CREATE TABLE doris_compare_table_1 (
user_id INT,
category VARCHAR(10)
) ENGINE=OLAP
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
INSERT INTO doris_check_table VALUES
(1, 'A'),
(2, 'B'),
(3, 'C');  -- C 不在 (A,B) 中
INSERT INTO doris_compare_table_1 VALUES
(101, 'X'),
(102, 'Y');  -- 均不在 (A,B,C) 中
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「监控对象」后, 选择规则类型为「多表数据内容对比」 | 选择成功 |
| 4 | 校验表：表：doris_check_table字段：category期望值：in A,B主键：不选 | 配置成功 |
| 5 | 对比表：表：doris_compare_table_1字段：category期望值：not in A,B,C主键：不选 | 添加成功 |
| 6 | 选择判断关系为「且」 | 选择成功 |
| 7 | 保存并运行规则任务 | 运行成功, 状态为「校验失败」 |

##### 【P0】验证多主键联合匹配下部分记录不满足条件

> 前置条件

```
DROP TABLE IF EXISTS doris_check_table;
DROP TABLE IF EXISTS doris_compare_table_1;
CREATE TABLE doris_check_table (
dept_id INT,
emp_id INT,
salary INT
) ENGINE=OLAP
DISTRIBUTED BY HASH(dept_id, emp_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
CREATE TABLE doris_compare_table_1 (
department_id INT,
employee_id INT,
salary INT
) ENGINE=OLAP
DISTRIBUTED BY HASH(department_id, employee_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
INSERT INTO doris_check_table VALUES
(1, 101, 8000),
(1, 102, 9000),  -- 正常
(2, 201, 7000);  -- 小于8000
INSERT INTO doris_compare_table_1 VALUES
(1, 101, 8500),
(1, 102, 9200),
(2, 201, 7800);  -- 小于8000
-- 联合主键 (dept_id, emp_id) 与 (department_id, employee_id) 匹配
-- 交集为 (1,101), (1,102), (2,201)
-- 校验表中 salary >=8000 的只有前两条 → 不满足
-- 对比表同理 → 不满足
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「监控对象」后, 选择规则类型为「多表数据内容对比」 | 选择成功 |
| 4 | 校验表：表：doris_check_table字段：salary期望值：>= 8000主键：选择 dept_id 和 emp_id（按顺序） | 配置成功 |
| 5 | 对比表：表：doris_compare_table_1字段：salary期望值：>= 8000主键：选择 department_id 和 employee_id | 添加成功 |
| 6 | 选择判断关系为「且」 | 选择成功 |
| 7 | 保存并运行规则任务 | 运行成功, 状态为「校验失败」 |
| 8 | 编辑规则任务, 选择判断关系修改为「或」, 对比表期望值: >=7500 | 编辑成功 |
| 9 | 保存并运行规则任务 | 运行成功, 状态为「校验通过」 |

##### 【P0】验证单主键匹配下交集记录满足期望值

> 前置条件

```
DROP TABLE IF EXISTS doris_check_table;
DROP TABLE IF EXISTS doris_compare_table_1;
CREATE TABLE doris_check_table (
id INT,
amount DECIMAL(10,2)
) ENGINE=OLAP
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
CREATE TABLE doris_compare_table_1 (
user_id INT,
amount DECIMAL(10,2)
) ENGINE=OLAP
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
INSERT INTO doris_check_table VALUES
(1, 100.00),
(2, 200.00),
(3, 150.00);
INSERT INTO doris_compare_table_1 VALUES
(1, 100.00),
(2, 200.00),
(4, 300.00);
-- 主键交集为 id=1 和 id=2
-- 校验表中这两条记录 amount 均 >= 100 → 通过
-- 对比表中 user_id=1 和 2 的 amount 均 >= 100 → 通过
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「监控对象」后, 选择规则类型为「多表数据内容对比」 | 选择成功 |
| 4 | 配置校验表：表：doris_check_table字段：amount期望值：>= 100主键：选择 id | 配置成功 |
| 5 | 添加对比表：表：doris_compare_table_1字段：amount期望值：>= 100主键：选择 user_id（字段名不同但值可关联） | 添加成功 |
| 6 | 选择判断关系为「且」 | 选择成功 |
| 7 | 保存并运行规则任务 | 运行成功, 状态为「校验通过」 |

##### 【P1】验证无主键时或关系下仅一个表通过

> 前置条件

```
DROP TABLE IF EXISTS doris_check_table;
DROP TABLE IF EXISTS doris_compare_table_1;
CREATE TABLE doris_check_table (
id INT,
score INT
) ENGINE=OLAP
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
CREATE TABLE doris_compare_table_1 (
user_id INT,
score INT
) ENGINE=OLAP
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
INSERT INTO doris_check_table VALUES
(1, 85),
(2, 90),
(3, 78);  -- 有小于90的值
INSERT INTO doris_compare_table_1 VALUES
(101, 95),
(102, 92),
(103, 98);  -- 全部 >=90
SELECT * FROM doris_check_table;
SELECT * FROM doris_compare_table_1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「监控对象」后, 选择规则类型为「多表数据内容对比」 | 选择成功 |
| 4 | 配置校验表：表：doris_check_table字段：score期望值：>= 90主键：不选 | 配置成功 |
| 5 | 添加对比表：表：doris_compare_table_1字段：score期望值：>= 90主键：不选 | 添加成功 |
| 6 | 选择判断关系为「或」 | 选择成功 |
| 7 | 保存并运行规则任务 | 运行成功, 状态为「校验通过」 |
| 8 | 编辑规则任务, 选择判断关系修改为「且」 | 编辑成功 |
| 9 | 保存并运行规则任务 | 运行成功, 状态为「校验失败」 |

##### 【P1】验证无主键时且关系下字段值全满足期望条件

> 前置条件

```
-- 删除表（如果存在）
DROP TABLE IF EXISTS doris_check_table;
DROP TABLE IF EXISTS doris_compare_table_1;
-- 创建校验表
CREATE TABLE doris_check_table (
id INT,
status VARCHAR(20)
) ENGINE=OLAP
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
-- 创建对比表1
CREATE TABLE doris_compare_table_1 (
user_id INT,
status VARCHAR(20)
) ENGINE=OLAP
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
-- 插入数据
INSERT INTO doris_check_table VALUES
(1, 'active'),
(2, 'active'),
(3, 'active');
INSERT INTO doris_compare_table_1 VALUES
(101, 'active'),
(102, 'active');
-- 查询验证
SELECT * FROM doris_check_table;
SELECT * FROM doris_compare_table_1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「监控对象」后, 选择规则类型为「多表数据内容对比」 | 选择成功 |
| 4 | 配置校验表：选择表：doris_check_table字段：status期望值：= “active“主键：不选择 | 配置成功 |
| 5 | 添加对比表：选择对比表：doris_compare_table_1分区：无分区，跳过对比字段：status期望值：= “active“主键：不选择 | 添加成功 |
| 6 | 选择判断关系为「且」 | 选择成功 |
| 7 | 保存并运行规则任务 | 运行成功, 状态为「校验通过」 |

## 完整性校验

##### 【P2】验证对比表添加/删除功能正常

> 前置条件

```
1. 「数据资产-平台管理-数据源管理」中已存在Hive数据源并且已授权.
2. 数据源下存在10张Spark表, 可进入离线平台中创建并执行SparkSQL任务:
-- 创建表1
DROP TABLE IF EXISTS vehicle_info_test_01;
CREATE TABLE vehicle_info_test_01 (
vin            STRING COMMENT '车辆唯一识别码',
car_series     STRING COMMENT '车系',
car_power      STRING COMMENT '动力类型',
car_config     STRING COMMENT '车型配置',
car_endurance  STRING COMMENT '续航类型',
drive_type     STRING COMMENT '驱动形式',
car_equipment  STRING COMMENT '车辆配置版本',
is_certific    INT COMMENT '是否认证'
)
COMMENT '车辆信息表 - 测试表01'
PARTITIONED BY (delivery_time STRING COMMENT '交付日期，yyyy-MM-dd')
STORED AS ORC;
-- 创建表2
DROP TABLE IF EXISTS vehicle_info_test_02;
CREATE TABLE vehicle_info_test_02 (
vin            STRING COMMENT '车辆唯一识别码',
car_series     STRING COMMENT '车系',
car_power      STRING COMMENT '动力类型',
car_config     STRING COMMENT '车型配置',
car_endurance  STRING COMMENT '续航类型',
drive_type     STRING COMMENT '驱动形式',
car_equipment  STRING COMMENT '车辆配置版本',
is_certific    INT COMMENT '是否认证'
)
COMMENT '车辆信息表 - 测试表02'
PARTITIONED BY (delivery_time STRING COMMENT '交付日期，yyyy-MM-dd')
STORED AS ORC;
-- 创建表3
DROP TABLE IF EXISTS vehicle_info_test_03;
CREATE TABLE vehicle_info_test_03 (
vin            STRING COMMENT '车辆唯一识别码',
car_series     STRING COMMENT '车系',
car_power      STRING COMMENT '动力类型',
car_config     STRING COMMENT '车型配置',
car_endurance  STRING COMMENT '续航类型',
drive_type     STRING COMMENT '驱动形式',
car_equipment  STRING COMMENT '车辆配置版本',
is_certific    INT COMMENT '是否认证'
)
COMMENT '车辆信息表 - 测试表03'
PARTITIONED BY (delivery_time STRING COMMENT '交付日期，yyyy-MM-dd')
STORED AS ORC;
-- 创建表4
DROP TABLE IF EXISTS vehicle_info_test_04;
CREATE TABLE vehicle_info_test_04 (
vin            STRING COMMENT '车辆唯一识别码',
car_series     STRING COMMENT '车系',
car_power      STRING COMMENT '动力类型',
car_config     STRING COMMENT '车型配置',
car_endurance  STRING COMMENT '续航类型',
drive_type     STRING COMMENT '驱动形式',
car_equipment  STRING COMMENT '车辆配置版本',
is_certific    INT COMMENT '是否认证'
)
COMMENT '车辆信息表 - 测试表04'
PARTITIONED BY (delivery_time STRING COMMENT '交付日期，yyyy-MM-dd')
STORED AS ORC;
-- 创建表5
DROP TABLE IF EXISTS vehicle_info_test_05;
CREATE TABLE vehicle_info_test_05 (
vin            STRING COMMENT '车辆唯一识别码',
car_series     STRING COMMENT '车系',
car_power      STRING COMMENT '动力类型',
car_config     STRING COMMENT '车型配置',
car_endurance  STRING COMMENT '续航类型',
drive_type     STRING COMMENT '驱动形式',
car_equipment  STRING COMMENT '车辆配置版本',
is_certific    INT COMMENT '是否认证'
)
COMMENT '车辆信息表 - 测试表05'
PARTITIONED BY (delivery_time STRING COMMENT '交付日期，yyyy-MM-dd')
STORED AS ORC;
-- 创建表6
DROP TABLE IF EXISTS vehicle_info_test_06;
CREATE TABLE vehicle_info_test_06 (
vin            STRING COMMENT '车辆唯一识别码',
car_series     STRING COMMENT '车系',
car_power      STRING COMMENT '动力类型',
car_config     STRING COMMENT '车型配置',
car_endurance  STRING COMMENT '续航类型',
drive_type     STRING COMMENT '驱动形式',
car_equipment  STRING COMMENT '车辆配置版本',
is_certific    INT COMMENT '是否认证'
)
COMMENT '车辆信息表 - 测试表06'
PARTITIONED BY (delivery_time STRING COMMENT '交付日期，yyyy-MM-dd')
STORED AS ORC;
-- 创建表7
DROP TABLE IF EXISTS vehicle_info_test_07;
CREATE TABLE vehicle_info_test_07 (
vin            STRING COMMENT '车辆唯一识别码',
car_series     STRING COMMENT '车系',
car_power      STRING COMMENT '动力类型',
car_config     STRING COMMENT '车型配置',
car_endurance  STRING COMMENT '续航类型',
drive_type     STRING COMMENT '驱动形式',
car_equipment  STRING COMMENT '车辆配置版本',
is_certific    INT COMMENT '是否认证'
)
COMMENT '车辆信息表 - 测试表07'
PARTITIONED BY (delivery_time STRING COMMENT '交付日期，yyyy-MM-dd')
STORED AS ORC;
-- 创建表8
DROP TABLE IF EXISTS vehicle_info_test_08;
CREATE TABLE vehicle_info_test_08 (
vin            STRING COMMENT '车辆唯一识别码',
car_series     STRING COMMENT '车系',
car_power      STRING COMMENT '动力类型',
car_config     STRING COMMENT '车型配置',
car_endurance  STRING COMMENT '续航类型',
drive_type     STRING COMMENT '驱动形式',
car_equipment  STRING COMMENT '车辆配置版本',
is_certific    INT COMMENT '是否认证'
)
COMMENT '车辆信息表 - 测试表08'
PARTITIONED BY (delivery_time STRING COMMENT '交付日期，yyyy-MM-dd')
STORED AS ORC;
-- 创建表9
DROP TABLE IF EXISTS vehicle_info_test_09;
CREATE TABLE vehicle_info_test_09 (
vin            STRING COMMENT '车辆唯一识别码',
car_series     STRING COMMENT '车系',
car_power      STRING COMMENT '动力类型',
car_config     STRING COMMENT '车型配置',
car_endurance  STRING COMMENT '续航类型',
drive_type     STRING COMMENT '驱动形式',
car_equipment  STRING COMMENT '车辆配置版本',
is_certific    INT COMMENT '是否认证'
)
COMMENT '车辆信息表 - 测试表09'
PARTITIONED BY (delivery_time STRING COMMENT '交付日期，yyyy-MM-dd')
STORED AS ORC;
-- 创建表10
DROP TABLE IF EXISTS vehicle_info_test_10;
CREATE TABLE vehicle_info_test_10 (
vin            STRING COMMENT '车辆唯一识别码',
car_series     STRING COMMENT '车系',
car_power      STRING COMMENT '动力类型',
car_config     STRING COMMENT '车型配置',
car_endurance  STRING COMMENT '续航类型',
drive_type     STRING COMMENT '驱动形式',
car_equipment  STRING COMMENT '车辆配置版本',
is_certific    INT COMMENT '是否认证'
)
COMMENT '车辆信息表 - 测试表10'
PARTITIONED BY (delivery_time STRING COMMENT '交付日期，yyyy-MM-dd')
STORED AS ORC;
-- 为表01插入5条数据
INSERT INTO vehicle_info_test_01 PARTITION(delivery_time='2025-10-01')
VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1);
-- 为表02插入8条数据（可包含重复VIN，模拟数据问题）
INSERT INTO vehicle_info_test_02 PARTITION(delivery_time='2025-10-02')
VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200006','追光','EV','H53a','长续航','四驱','N3',1),
('LDP91C60PE200007','追光','EV','H53a','长续航','两驱','N5',1),
('LDP91C60PE200008','梦想家','PHEV','H72','常规','四驱','N3',0);
-- 为表03插入5条数据
INSERT INTO vehicle_info_test_03 PARTITION(delivery_time='2025-10-03')
VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1);
-- 为表04插入5条数据
INSERT INTO vehicle_info_test_04 PARTITION(delivery_time='2025-10-04')
VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1);
-- 为表05插入5条数据
INSERT INTO vehicle_info_test_05 PARTITION(delivery_time='2025-10-05')
VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1);
INSERT INTO vehicle_info_test_06 PARTITION(delivery_time='2025-10-06')
VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200006','追光','EV','H53a','长续航','四驱','N3',1);
INSERT INTO vehicle_info_test_07 PARTITION(delivery_time='2025-10-07')
VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200006','追光','EV','H53a','长续航','四驱','N3',1);
INSERT INTO vehicle_info_test_08 PARTITION(delivery_time='2025-10-08')
VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200006','追光','EV','H53a','长续航','四驱','N3',1);
INSERT INTO vehicle_info_test_09 PARTITION(delivery_time='2025-10-09')
VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200006','追光','EV','H53a','长续航','四驱','N3',1);
INSERT INTO vehicle_info_test_10 PARTITION(delivery_time='2025-10-10')
VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200006','追光','EV','H53a','长续航','四驱','N3',1);
SELECT * from vehicle_info_test_02;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 「新建监控规则」, 校验类型选择「多表数据内容对比」 | 配置成功 |
| 3 | 在对比表部分中, 选择第一个表/分区/字段/期望值/主键选项后, 点击「+」按钮 | 1) 新增一行对比表配置项2) 出现「-」按钮, 可以删除对比表配置项 |
| 4 | 依次添加至10行对比表配置后, 再次点击「+」 | 提示 「最多可配置10张表」 |
| 5 | 点击“-”删除按钮 | 成功删除该行对比表 |

##### 【P0】验证校验类型新增「多表数据内容对比」

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「数据源」「数据库」「数据表」等信息，选择【完整性校验】规则 | 选择成功，展示【完整性校验】规则配置项 |
| 4 | 校验类型 选择 「多表数据内容对比」 | 选择成功 |
| 5 | UI CHECK | 多表数据内容对表单配置项包含:1) 校验类型/字段/期望值/选择校验表主键/选择对比表1/输入分区/选择对比字段1/期望值/选择对比表1主键/选择判断关系/强弱规则/规则描述2) 选择校验表主键: 主键非必选，支持多选，多选后按照联合主键判断. 悬浮提示：“若没有选择主键则不按照主键匹配的数据进行对比，分开校验均通过则校验通过。若选择多个主键则按照联合主键判断，按选择主键的字段顺序进行映射匹配”3) 选择对比表1/选择对比字段: 仅支持单选, 但可以添加多个对比表, 最多添加至10个4) 选择判断关系: 支持且 / 或5) 按钮: 保存 / 取消 |
