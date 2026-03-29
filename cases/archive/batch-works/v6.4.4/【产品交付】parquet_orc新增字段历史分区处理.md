---
name: 【产品交付】parquet_orc新增字段历史分区处理 v6.4.4
description: 【产品交付】parquet_orc新增字段历史分区处理 v6.4.4
tags:
  - 离线开发
  - parquet-orc新增字段历史分区处理
  - 产品交付
  - parquet_orc新增字段历史分区处理
module: batch-works
version: v6.4.4
source: zentao-cases/dtstack-platform/离线开发/archive-cases/v6.4.4/【产品交付】parquet_orc新增字段历史分区处理.csv
case_count: 14
created_at: 2026-03-29
origin: csv
---
# 【产品交付】parquet_orc新增字段历史分区处理 v6.4.4
> 来源：zentao-cases/dtstack-platform/离线开发/archive-cases/v6.4.4/【产品交付】parquet_orc新增字段历史分区处理.csv
> 用例数：14

---

## parquet-orc新增字段历史分区处理

##### 验证orc分区表新增字段且包含默认值，只同步历史分区正常同步至starrocks表内 「P2」

> 前置条件
```
1.存在hive3.x的orc表
-- orc表
drop table if EXISTS ods_orders_orc;
CREATE TABLE IF NOT EXISTS ods_orders_orc (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    TIMESTAMP
)
PARTITIONED BY (dt STRING)   -- 分区字段
STORED AS ORC                -- 典型数据仓库存储格式
TBLPROPERTIES (
“orc.compress“ = “SNAPPY“
);
INSERT INTO ods_orders_orc PARTITION  (dt='2025-11-20')
VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp());
2.存在3.x的starrocks表：
drop table if EXISTS ods_orders;
CREATE TABLE IF NOT EXISTS ods_orders (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    DATETIME,
remark         DOUBLE,
dt             DATE      -- 分区字段
)
ENGINE=OLAP
PARTITIONED  BY RANGE(dt) (
PARTITIONED  p20251125 VALUES LESS THAN ('2025-11-26')
)
DISTRIBUTED BY HASH(order_id) BUCKETS 4
PROPERTIES (
“replication_num“ = “1“
);
3.存在数据同步任务test_hive_sr_1（hive3.x-starrocks），数据来源和选择目标分别为上述表
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建hivesql任务test_orc_1 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 输入sql语句： | 任务运行成功，表ods_orders_orc新增一个字段new_col |
| 3 | ALTER TABLE ods_orders_orc ADD COLUMNS (new_col STRING DEFAULT 'abc'); | 任务运行成功，表ods_orders_orc新增一条分区数据 |
| 4 | 点击保存，临时运行 | 数据同步任务运行成功，数据被同步至目标表ods_orders， |
| 5 | 再次输入sql： | 只有分区2025-11-20数据被同步，字段new_col分别同步数据orc、abc写入目标表 |
| 6 | INSERT INTO ods_orders_orc PARTITION (dt='2025-11-20') |  |
| 7 | VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp(), 'orc'); |  |
| 8 | 点击保存、临时运行 |  |
| 9 | 修改数据同步任务test_hive_sr_1-数据来源，分区输入dt=2025-11-20 |  |
| 10 | 点击保存、临时运行 |  |

##### 验证orc分区表删除一个字段且在历史分区文件插入数据后，同步历史文件正常 「P2」

> 前置条件
```
1.存在hive3.x的orc表
-- orc表
drop table if EXISTS ods_orders_orc;
CREATE TABLE IF NOT EXISTS ods_orders_orc (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    TIMESTAMP
)
PARTITIONED BY (dt STRING)   -- 分区字段
STORED AS ORC                -- 典型数据仓库存储格式
TBLPROPERTIES (
“orc.compress“ = “SNAPPY“
);
INSERT INTO ods_orders_orc PARTITION  (dt='2025-11-20')
VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp());
2.存在3.x的starrocks表：
drop table if EXISTS ods_orders;
CREATE TABLE IF NOT EXISTS ods_orders (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    DATETIME,
remark         DOUBLE,
dt             DATE      -- 分区字段
)
ENGINE=OLAP
PARTITIONED  BY RANGE(dt) (
PARTITIONED  p20251125 VALUES LESS THAN ('2025-11-26')
)
DISTRIBUTED BY HASH(order_id) BUCKETS 4
PROPERTIES (
“replication_num“ = “1“
);
3.存在数据同步任务test_hive_sr_1（hive3.x-starrocks），数据来源和选择目标分别为上述表
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建hivesql任务test_orc_1 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 输入sql语句： | 任务运行成功，表ods_orders_orc字段order_status被删除 |
| 3 | ALTER TABLE ods_orders_orc DROP COLUMN order_status; | 任务运行成功，表ods_orders_orc新增一条分区数据 |
| 4 | 点击保存，临时运行 | 数据同步任务运行成功，数据被同步至目标表ods_orders， |
| 5 | 再次输入sql： | 只有分区2025-11-20数据被同步，目标表字段order_status值为NULL |
| 6 | INSERT INTO ods_orders_orc PARTITION (dt='2025-11-20') |  |
| 7 | VALUES (1, 1001, 2001, 20.5, current_timestamp(), 'orc'); |  |
| 8 | 点击保存、临时运行 |  |
| 9 | 修改数据同步任务test_hive_sr_1-数据来源，分区输入dt=2025-11-20 |  |
| 10 | 点击保存、临时运行 |  |

##### 验证orc分区表修改字段名称且在历史分区文件插入数据后，同步历史文件正常 「P2」

> 前置条件
```
1.存在hive3.x的orc表
-- orc表
drop table if EXISTS ods_orders_orc;
CREATE TABLE IF NOT EXISTS ods_orders_orc (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    TIMESTAMP
)
PARTITIONED BY (dt STRING)   -- 分区字段
STORED AS ORC                -- 典型数据仓库存储格式
TBLPROPERTIES (
“orc.compress“ = “SNAPPY“
);
INSERT INTO ods_orders_orc PARTITION  (dt='2025-11-20')
VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp());
2.存在3.x的starrocks表：
drop table if EXISTS ods_orders;
CREATE TABLE IF NOT EXISTS ods_orders (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    DATETIME,
remark         DOUBLE,
dt             DATE      -- 分区字段
)
ENGINE=OLAP
PARTITIONED  BY RANGE(dt) (
PARTITIONED  p20251125 VALUES LESS THAN ('2025-11-26')
)
DISTRIBUTED BY HASH(order_id) BUCKETS 4
PROPERTIES (
“replication_num“ = “1“
);
3.存在数据同步任务test_hive_sr_1（hive3.x-starrocks），数据来源和选择目标分别为上述表
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建hivesql任务test_orc_1 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 输入sql语句： | 任务运行成功，表ods_orders_orc字段名称被修改 |
| 3 | ALTER TABLE ods_orders_orc CHANGE create_time new_create_time TIMESTAMP; | 任务运行成功，表ods_orders_orc新增一条分区数据 |
| 4 | 点击保存，临时运行 | 数据同步任务运行成功，数据被同步至目标表ods_orders， |
| 5 | 再次输入sql： | 只有分区2025-11-20数据被同步，字段remark同步数据NULL写入目标表 |
| 6 | INSERT INTO ods_orders_orc PARTITION (dt='2025-11-20') |  |
| 7 | VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp(), 'orc'); |  |
| 8 | 点击保存、临时运行 |  |
| 9 | 修改数据同步任务test_hive_sr_1-数据来源，分区输入dt=2025-11-20 |  |
| 10 | 点击保存、临时运行 |  |

##### 验证orc分区表新增字段后，在历史分区文件插入数据后，同步历史文件正常 「P2」

> 前置条件
```
1.存在hive3.x的orc表
-- orc表
drop table if EXISTS ods_orders_orc;
CREATE TABLE IF NOT EXISTS ods_orders_orc (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    TIMESTAMP
)
PARTITIONED BY (dt STRING)   -- 分区字段
STORED AS ORC                -- 典型数据仓库存储格式
TBLPROPERTIES (
“orc.compress“ = “SNAPPY“
);
INSERT INTO ods_orders_orc PARTITION  (dt='2025-11-20')
VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp());
2.存在3.x的starrocks表：
drop table if EXISTS ods_orders;
CREATE TABLE IF NOT EXISTS ods_orders (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    DATETIME,
remark         DOUBLE,
dt             DATE      -- 分区字段
)
ENGINE=OLAP
PARTITIONED  BY RANGE(dt) (
PARTITIONED  p20251125 VALUES LESS THAN ('2025-11-26')
)
DISTRIBUTED BY HASH(order_id) BUCKETS 4
PROPERTIES (
“replication_num“ = “1“
);
3.存在数据同步任务test_hive_sr_1（hive3.x-starrocks），数据来源和选择目标分别为上述表
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建hivesql任务test_orc_1 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 输入sql语句： | 任务运行成功，表ods_orders_orc新增一个字段remark |
| 3 | ALTER TABLE ods_orders_orc | 任务运行成功，表ods_orders_orc新增一条分区数据 |
| 4 | ADD COLUMNS ( | 数据同步任务运行成功，数据被同步至目标表ods_orders， |
| 5 | remark STRING COMMENT '备注说明' | 只有分区2025-11-20数据被同步，字段remark同步两条数据数据NULL、PAR写入目标表 |
| 6 | ); |  |
| 7 | 点击保存，临时运行 |  |
| 8 | 再次输入sql： |  |
| 9 | INSERT INTO ods_orders_orc PARTITION (dt='2025-11-20') |  |
| 10 | VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp(), 'orc'); |  |
| 11 | 点击保存、临时运行 |  |
| 12 | 修改数据同步任务test_hive_sr_1-数据来源，分区输入dt=2025-11-20 |  |
| 13 | 点击保存、临时运行 |  |

##### 验证orc分区表新增字段且插入数据后，只同步新分区正常同步至starrocks表内 「P2」

> 前置条件
```
1.存在hive3.x的orc表
-- orc表
drop table if EXISTS ods_orders_orc;
CREATE TABLE IF NOT EXISTS ods_orders_orc (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    TIMESTAMP
)
PARTITIONED BY (dt STRING)   -- 分区字段
STORED AS ORC                -- 典型数据仓库存储格式
TBLPROPERTIES (
“orc.compress“ = “SNAPPY“
);
INSERT INTO ods_orders_orc PARTITION  (dt='2025-11-20')
VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp());
2.存在3.x的starrocks表：
drop table if EXISTS ods_orders;
CREATE TABLE IF NOT EXISTS ods_orders (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    DATETIME,
remark         DOUBLE,
dt             DATE      -- 分区字段
)
ENGINE=OLAP
PARTITIONED  BY RANGE(dt) (
PARTITIONED  p20251125 VALUES LESS THAN ('2025-11-26')
)
DISTRIBUTED BY HASH(order_id) BUCKETS 4
PROPERTIES (
“replication_num“ = “1“
);
3.存在数据同步任务test_hive_sr_1（hive3.x-starrocks），数据来源和选择目标分别为上述表
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建hivesql任务test_orc_1 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 输入sql语句： | 任务运行成功，表ods_orders_orc新增一个字段remark |
| 3 | ALTER TABLE ods_orders_orc | 任务运行成功，表ods_orders_orc新增一条分区数据 |
| 4 | ADD COLUMNS ( | 数据同步任务运行成功，数据被同步至目标表ods_orders， |
| 5 | remark STRING COMMENT '备注说明' | 只有分区2025-11-21数据被同步，字段remark同步数据PAR写入目标表 |
| 6 | ); |  |
| 7 | 点击保存，临时运行 |  |
| 8 | 再次输入sql： |  |
| 9 | INSERT INTO ods_orders_orc PARTITION (dt='2025-11-21') |  |
| 10 | VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp(), 'orc'); |  |
| 11 | 点击保存、临时运行 |  |
| 12 | 修改数据同步任务test_hive_sr_1-数据来源，分区输入dt=2025-11-21 |  |
| 13 | 点击保存、临时运行 |  |

##### 验证orc分区表新增字段后，不插入数据只同步历史文件正常 「P2」

> 前置条件
```
1.存在hive3.x的orc表
-- orc表
drop table if EXISTS ods_orders_orc;
CREATE TABLE IF NOT EXISTS ods_orders_orc (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    TIMESTAMP
)
PARTITIONED BY (dt STRING)   -- 分区字段
STORED AS ORC                -- 典型数据仓库存储格式
TBLPROPERTIES (
“orc.compress“ = “SNAPPY“
);
INSERT INTO ods_orders_orc PARTITION  (dt='2025-11-20')
VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp());
2.存在3.x的starrocks表：
drop table if EXISTS ods_orders;
CREATE TABLE IF NOT EXISTS ods_orders (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    DATETIME,
remark         DOUBLE,
dt             DATE      -- 分区字段
)
ENGINE=OLAP
PARTITIONED  BY RANGE(dt) (
PARTITIONED  p20251125 VALUES LESS THAN ('2025-11-26')
)
DISTRIBUTED BY HASH(order_id) BUCKETS 4
PROPERTIES (
“replication_num“ = “1“
);
3.存在数据同步任务test_hive_sr_1（hive3.x-starrocks），数据来源和选择目标分别为上述表
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建hivesql任务test_orc_1 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 输入sql语句： | 任务运行成功，表ods_orders_orc新增一个字段remark |
| 3 | ALTER TABLE ods_orders_orc | 数据同步任务运行成功，数据被同步至目标表ods_orders， |
| 4 | ADD COLUMNS ( | 只有分区2025-11-20数据被同步，字段remark同步数据NULL写入目标表 |
| 5 | remark STRING COMMENT '备注说明' |  |
| 6 | ); |  |
| 7 | 点击保存，临时运行 |  |
| 8 | 修改数据同步任务test_hive_sr_1-数据来源，分区输入dt=2025-11-20 |  |
| 9 | 点击保存、临时运行 |  |

##### 验证orc分区表新增字段且插入数据后，历史分区正常同步至starrocks表内 「P1」

> 前置条件
```
1.存在hive3.x的orc表
-- orc表
drop table if EXISTS ods_orders_orc;
CREATE TABLE IF NOT EXISTS ods_orders_orc (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    TIMESTAMP
)
PARTITIONED BY (dt STRING)   -- 分区字段
STORED AS ORC                -- 典型数据仓库存储格式
TBLPROPERTIES (
“orc.compress“ = “SNAPPY“
);
INSERT INTO ods_orders_orc PARTITION  (dt='2025-11-20')
VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp());
2.存在3.x的starrocks表：
drop table if EXISTS ods_orders;
CREATE TABLE IF NOT EXISTS ods_orders (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    DATETIME,
remark         DOUBLE,
dt             DATE      -- 分区字段
)
ENGINE=OLAP
PARTITIONED  BY RANGE(dt) (
PARTITIONED  p20251125 VALUES LESS THAN ('2025-11-26')
)
DISTRIBUTED BY HASH(order_id) BUCKETS 4
PROPERTIES (
“replication_num“ = “1“
);
3.存在数据同步任务test_hive_sr_1（hive3.x-starrocks），数据来源和选择目标分别为上述表
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建hivesql任务test_orc_1 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 输入sql语句： | 任务运行成功，表ods_orders_orc新增一个字段remark |
| 3 | ALTER TABLE ods_orders_orc | 任务运行成功，表ods_orders_orc新增一条分区数据 |
| 4 | ADD COLUMNS ( | 数据同步任务运行成功，数据被同步至目标表ods_orders， |
| 5 | remark STRING COMMENT '备注说明' | 在分区2025-11-21中，字段remark同步数据PAR写入目标表 |
| 6 | ); | 在分区2025-11-20中，字段remark同步数据Null写入目标表 |
| 7 | 点击保存，临时运行 |  |
| 8 | 再次输入sql： |  |
| 9 | INSERT INTO ods_orders_orc PARTITION (dt='2025-11-21') |  |
| 10 | VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp(), 'ORC'); |  |
| 11 | 点击保存、临时运行 |  |
| 12 | 进入数据同步任务，点击临时运行 |  |

##### 验证parquet分区表新增字段且包含默认值，只同步历史分区正常同步至starrocks表内 「P3」

> 前置条件
```
1.存在hive3.x的parquet表
-- parquet表
drop table if EXISTS ods_orders_par;
CREATE TABLE IF NOT EXISTS ods_orders_par (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    TIMESTAMP
)
PARTITIONED BY (dt STRING)          -- 分区字段
STORED AS PARQUET                   -- 使用 Parquet 格式
TBLPROPERTIES (
“parquet.compress“ = “SNAPPY“
);
INSERT INTO ods_orders_par PARTITION (dt='2025-11-20')
VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp());
2.存在3.x的starrocks表：
drop table if EXISTS ods_orders;
CREATE TABLE IF NOT EXISTS ods_orders (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    DATETIME,
remark         DOUBLE,
dt             DATE      -- 分区字段
)
ENGINE=OLAP
PARTITION BY RANGE(dt) (
PARTITION p20251125 VALUES LESS THAN ('2025-11-26')
)
DISTRIBUTED BY HASH(order_id) BUCKETS 4
PROPERTIES (
“replication_num“ = “1“
);
3.存在数据同步任务test_hive_sr_1（hive3.x-starrocks），数据来源和选择目标分别为上述表
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建hivesql任务test_par_1 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 输入sql语句： | 任务运行成功，表ods_orders_par新增一个字段new_col |
| 3 | ALTER TABLE ods_orders_par ADD COLUMNS (new_col STRING DEFAULT 'abc'); | 任务运行成功，表ods_orders_par新增一条分区数据 |
| 4 | 点击保存，临时运行 | 数据同步任务运行成功，数据被同步至目标表ods_orders， |
| 5 | 再次输入sql： | 只有分区2025-11-20数据被同步，字段new_col分别同步数据PAR、abc写入目标表 |
| 6 | INSERT INTO ods_orders_par PARTITION (dt='2025-11-20') |  |
| 7 | VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp(), 'PAR'); |  |
| 8 | 点击保存、临时运行 |  |
| 9 | 修改数据同步任务test_hive_sr_1-数据来源，分区输入dt=2025-11-20 |  |
| 10 | 点击保存、临时运行 |  |

##### 验证parquet分区表删除一个字段且在历史分区文件插入数据后，同步历史文件正常 「P2」

> 前置条件
```
1.存在hive3.x的parquet表
-- parquet表
drop table if EXISTS ods_orders_par;
CREATE TABLE IF NOT EXISTS ods_orders_par (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    TIMESTAMP
)
PARTITIONED BY (dt STRING)          -- 分区字段
STORED AS PARQUET                   -- 使用 Parquet 格式
TBLPROPERTIES (
“parquet.compress“ = “SNAPPY“
);
INSERT INTO ods_orders_par PARTITION (dt='2025-11-20')
VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp());
2.存在3.x的starrocks表：
drop table if EXISTS ods_orders;
CREATE TABLE IF NOT EXISTS ods_orders (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    DATETIME,
remark         DOUBLE,
dt             DATE      -- 分区字段
)
ENGINE=OLAP
PARTITION BY RANGE(dt) (
PARTITION p20251125 VALUES LESS THAN ('2025-11-26')
)
DISTRIBUTED BY HASH(order_id) BUCKETS 4
PROPERTIES (
“replication_num“ = “1“
);
3.存在数据同步任务test_hive_sr_1（hive3.x-starrocks），数据来源和选择目标分别为上述表
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建hivesql任务test_par_1 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 输入sql语句： | 任务运行成功，表ods_orders_par字段order_status被删除 |
| 3 | ALTER TABLE ods_orders_par DROP COLUMN order_status; | 任务运行成功，表ods_orders_par新增一条分区数据 |
| 4 | 点击保存，临时运行 | 数据同步任务运行成功，数据被同步至目标表ods_orders， |
| 5 | 再次输入sql： | 只有分区2025-11-20数据被同步，目标表字段order_status值为NULL |
| 6 | INSERT INTO ods_orders_par PARTITION (dt='2025-11-20') |  |
| 7 | VALUES (1, 1001, 2001, 20.5, current_timestamp(), 'PAR'); |  |
| 8 | 点击保存、临时运行 |  |
| 9 | 修改数据同步任务test_hive_sr_1-数据来源，分区输入dt=2025-11-20 |  |
| 10 | 点击保存、临时运行 |  |

##### 验证parquet分区表修改字段名称且在历史分区文件插入数据后，同步历史文件正常 「P2」

> 前置条件
```
1.存在hive3.x的parquet表
-- parquet表
drop table if EXISTS ods_orders_par;
CREATE TABLE IF NOT EXISTS ods_orders_par (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    TIMESTAMP
)
PARTITIONED BY (dt STRING)          -- 分区字段
STORED AS PARQUET                   -- 使用 Parquet 格式
TBLPROPERTIES (
“parquet.compress“ = “SNAPPY“
);
INSERT INTO ods_orders_par PARTITION (dt='2025-11-20')
VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp());
2.存在3.x的starrocks表：
drop table if EXISTS ods_orders;
CREATE TABLE IF NOT EXISTS ods_orders (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    DATETIME,
remark         DOUBLE,
dt             DATE      -- 分区字段
)
ENGINE=OLAP
PARTITION BY RANGE(dt) (
PARTITION p20251125 VALUES LESS THAN ('2025-11-26')
)
DISTRIBUTED BY HASH(order_id) BUCKETS 4
PROPERTIES (
“replication_num“ = “1“
);
3.存在数据同步任务test_hive_sr_1（hive3.x-starrocks），数据来源和选择目标分别为上述表
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建hivesql任务test_par_1 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 输入sql语句： | 任务运行成功，表ods_orders_par字段名称被修改 |
| 3 | ALTER TABLE ods_orders_par CHANGE create_time new_create_time TIMESTAMP; | 任务运行成功，表ods_orders_par新增一条分区数据 |
| 4 | 点击保存，临时运行 | 数据同步任务运行成功，数据被同步至目标表ods_orders， |
| 5 | 再次输入sql： | 只有分区2025-11-20数据被同步，字段remark同步数据NULL写入目标表 |
| 6 | INSERT INTO ods_orders_par PARTITION (dt='2025-11-20') |  |
| 7 | VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp(), 'PAR'); |  |
| 8 | 点击保存、临时运行 |  |
| 9 | 修改数据同步任务test_hive_sr_1-数据来源，分区输入dt=2025-11-20 |  |
| 10 | 点击保存、临时运行 |  |

##### 验证parquet分区表新增字段后，在历史分区文件插入数据后，同步历史文件正常 「P2」

> 前置条件
```
1.存在hive3.x的parquet表
-- parquet表
drop table if EXISTS ods_orders_par;
CREATE TABLE IF NOT EXISTS ods_orders_par (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    TIMESTAMP
)
PARTITIONED BY (dt STRING)          -- 分区字段
STORED AS PARQUET                   -- 使用 Parquet 格式
TBLPROPERTIES (
“parquet.compress“ = “SNAPPY“
);
INSERT INTO ods_orders_par PARTITION (dt='2025-11-20')
VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp());
2.存在3.x的starrocks表：
drop table if EXISTS ods_orders;
CREATE TABLE IF NOT EXISTS ods_orders (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    DATETIME,
remark         DOUBLE,
dt             DATE      -- 分区字段
)
ENGINE=OLAP
PARTITION BY RANGE(dt) (
PARTITION p20251125 VALUES LESS THAN ('2025-11-26')
)
DISTRIBUTED BY HASH(order_id) BUCKETS 4
PROPERTIES (
“replication_num“ = “1“
);
3.存在数据同步任务test_hive_sr_1（hive3.x-starrocks），数据来源和选择目标分别为上述表
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建hivesql任务test_par_1 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 输入sql语句： | 任务运行成功，表ods_orders_par新增一个字段remark |
| 3 | ALTER TABLE ods_orders_par | 任务运行成功，表ods_orders_par新增一条分区数据 |
| 4 | ADD COLUMNS ( | 数据同步任务运行成功，数据被同步至目标表ods_orders， |
| 5 | remark STRING COMMENT '备注说明' | 只有分区2025-11-20数据被同步，字段remark同步两条数据数据NULL、PAR写入目标表 |
| 6 | ); |  |
| 7 | 点击保存，临时运行 |  |
| 8 | 再次输入sql： |  |
| 9 | INSERT INTO ods_orders_par PARTITION (dt='2025-11-20') |  |
| 10 | VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp(), 'PAR'); |  |
| 11 | 点击保存、临时运行 |  |
| 12 | 修改数据同步任务test_hive_sr_1-数据来源，分区输入dt=2025-11-20 |  |
| 13 | 点击保存、临时运行 |  |

##### 验证parquet分区表新增字段且插入数据后，只同步新分区正常同步至starrocks表内 「P2」

> 前置条件
```
1.存在hive3.x的parquet表
-- parquet表
drop table if EXISTS ods_orders_par;
CREATE TABLE IF NOT EXISTS ods_orders_par (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    TIMESTAMP
)
PARTITIONED BY (dt STRING)          -- 分区字段
STORED AS PARQUET                   -- 使用 Parquet 格式
TBLPROPERTIES (
“parquet.compress“ = “SNAPPY“
);
INSERT INTO ods_orders_par PARTITION (dt='2025-11-20')
VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp());
2.存在3.x的starrocks表：
drop table if EXISTS ods_orders;
CREATE TABLE IF NOT EXISTS ods_orders (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    DATETIME,
remark         DOUBLE,
dt             DATE      -- 分区字段
)
ENGINE=OLAP
PARTITION BY RANGE(dt) (
PARTITION p20251125 VALUES LESS THAN ('2025-11-26')
)
DISTRIBUTED BY HASH(order_id) BUCKETS 4
PROPERTIES (
“replication_num“ = “1“
);
3.存在数据同步任务test_hive_sr_1（hive3.x-starrocks），数据来源和选择目标分别为上述表
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建hivesql任务test_par_1 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 输入sql语句： | 任务运行成功，表ods_orders_par新增一个字段remark |
| 3 | ALTER TABLE ods_orders_par | 任务运行成功，表ods_orders_par新增一条分区数据 |
| 4 | ADD COLUMNS ( | 数据同步任务运行成功，数据被同步至目标表ods_orders， |
| 5 | remark STRING COMMENT '备注说明' | 只有分区2025-11-21数据被同步，字段remark同步数据PAR写入目标表 |
| 6 | ); |  |
| 7 | 点击保存，临时运行 |  |
| 8 | 再次输入sql： |  |
| 9 | INSERT INTO ods_orders_par PARTITION (dt='2025-11-21') |  |
| 10 | VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp(), 'PAR'); |  |
| 11 | 点击保存、临时运行 |  |
| 12 | 修改数据同步任务test_hive_sr_1-数据来源，分区输入dt=2025-11-21 |  |
| 13 | 点击保存、临时运行 |  |

##### 验证parquet分区表新增字段后，不插入数据只同步历史文件正常 「P2」

> 前置条件
```
1.存在hive3.x的parquet表
-- parquet表
drop table if EXISTS ods_orders_par;
CREATE TABLE IF NOT EXISTS ods_orders_par (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    TIMESTAMP
)
PARTITIONED BY (dt STRING)          -- 分区字段
STORED AS PARQUET                   -- 使用 Parquet 格式
TBLPROPERTIES (
“parquet.compress“ = “SNAPPY“
);
INSERT INTO ods_orders_par PARTITION (dt='2025-11-20')
VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp());
2.存在3.x的starrocks表：
drop table if EXISTS ods_orders;
CREATE TABLE IF NOT EXISTS ods_orders (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    DATETIME,
remark         DOUBLE,
dt             DATE      -- 分区字段
)
ENGINE=OLAP
PARTITION BY RANGE(dt) (
PARTITION p20251125 VALUES LESS THAN ('2025-11-26')
)
DISTRIBUTED BY HASH(order_id) BUCKETS 4
PROPERTIES (
“replication_num“ = “1“
);
3.存在数据同步任务test_hive_sr_1（hive3.x-starrocks），数据来源和选择目标分别为上述表
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建hivesql任务test_par_1 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 输入sql语句： | 任务运行成功，表ods_orders_par新增一个字段remark |
| 3 | ALTER TABLE ods_orders_par | 数据同步任务运行成功，数据被同步至目标表ods_orders， |
| 4 | ADD COLUMNS ( | 只有分区2025-11-20数据被同步，字段remark同步数据NULL写入目标表 |
| 5 | remark STRING COMMENT '备注说明' |  |
| 6 | ); |  |
| 7 | 点击保存，临时运行 |  |
| 8 | 修改数据同步任务test_hive_sr_1-数据来源，分区输入dt=2025-11-20 |  |
| 9 | 点击保存、临时运行 |  |

##### 验证parquet分区表新增字段且插入数据后，历史分区正常同步至starrocks表内 「P1」

> 前置条件
```
1.存在hive3.x的parquet表
-- parquet表
drop table if EXISTS ods_orders_par;
CREATE TABLE IF NOT EXISTS ods_orders_par (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    TIMESTAMP
)
PARTITIONED BY (dt STRING)          -- 分区字段
STORED AS PARQUET                   -- 使用 Parquet 格式
TBLPROPERTIES (
“parquet.compress“ = “SNAPPY“
);
INSERT INTO ods_orders_par PARTITION (dt='2025-11-20')
VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp());
2.存在3.x的starrocks表：
drop table if EXISTS ods_orders;
CREATE TABLE IF NOT EXISTS ods_orders (
order_id       BIGINT,
user_id        BIGINT,
product_id     BIGINT,
price          DOUBLE,
order_status   STRING,
create_time    DATETIME,
remark         DOUBLE,
dt             DATE      -- 分区字段
)
ENGINE=OLAP
PARTITION BY RANGE(dt) (
PARTITION p20251125 VALUES LESS THAN ('2025-11-26')
)
DISTRIBUTED BY HASH(order_id) BUCKETS 4
PROPERTIES (
“replication_num“ = “1“
);
3.存在数据同步任务test_hive_sr_1（hive3.x-starrocks），数据来源和选择目标分别为上述表
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建hivesql任务test_par_1 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 输入sql语句： | 任务运行成功，表ods_orders_par新增一个字段remark |
| 3 | ALTER TABLE ods_orders_par | 任务运行成功，表ods_orders_par新增一条分区数据 |
| 4 | ADD COLUMNS ( | 数据同步任务运行成功，数据被同步至目标表ods_orders， |
| 5 | remark STRING COMMENT '备注说明' | 在分区2025-11-21中，字段remark同步数据PAR写入目标表 |
| 6 | ); | 在分区2025-11-20中，字段remark同步数据Null写入目标表 |
| 7 | 点击保存，临时运行 |  |
| 8 | 再次输入sql： |  |
| 9 | INSERT INTO ods_orders_par PARTITION (dt='2025-11-21') |  |
| 10 | VALUES (1, 1001, 2001, 20.5, 'SUCCESS', current_timestamp(), 'PAR'); |  |
| 11 | 点击保存、临时运行 |  |
| 12 | 进入数据同步任务，点击临时运行 |  |

