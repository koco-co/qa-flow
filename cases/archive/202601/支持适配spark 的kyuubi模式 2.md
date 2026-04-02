---
suite_name: 支持适配spark 的kyuubi模式 v6.4.7
description: 支持适配spark 的kyuubi模式 v6.4.7
prd_id: 15693
prd_version: v6.4.7
prd_path: cases/requirements/data-assets/v6.4.10/.trash/PRD-15693-raw.md
product: data-assets
tags:
  - 数据资产
  - 数据资产-元数据
  - 支持适配spark
  - 的kyuubi模式
create_at: 2026-03-29
status: ""
health_warnings: []
case_count: 29
origin: csv
---
> 来源：zentao-cases/dtstack-platform/数据资产/archive-cases/v6.4.7/支持适配spark 的kyuubi模式.csv
> 用例数：29

---

## 数据资产-元数据

##### 【P1】验证血缘解析功能正常

> 前置条件
```
创建spark sql的血缘表
-- 1. 服务商状态表
CREATE TABLE IF NOT EXISTS batch_base60.ods_ztpc_jc_fuwustz_df (

FuWuSID      STRING COMMENT '服务商ID',
 ZhuangTai    STRING COMMENT '状态（合格/黑名单）',
 sys_date     DATE   COMMENT '业务时间',
 sys_mdate    TIMESTAMP COMMENT '修改时间'
) COMMENT 'ODS层-服务商状态表'
PARTITIONED BY (dt STRING COMMENT '分区字段，yyyymmdd')
STORED AS ORC;

-- 2. 供应商状态表
CREATE TABLE IF NOT EXISTS batch_base60.ods_ztpc_jc_gongyingstz_df (
 GongYingSID  STRING COMMENT '供应商ID',
 ZhuangTai    STRING COMMENT '状态（合格/黑名单）',
 sys_date     DATE   COMMENT '业务时间',
 sys_mdate    TIMESTAMP COMMENT '修改时间'
) COMMENT 'ODS层-供应商状态表'
PARTITIONED BY (dt STRING COMMENT '分区字段，yyyymmdd')
STORED AS ORC;

-- 3. 分包商状态表
CREATE TABLE IF NOT EXISTS batch_base60.ods_ztpc_jc_fenbaostz_df (
 FenBaoSID    STRING COMMENT '分包商ID',
 ZhuangTai    STRING COMMENT '状态（合格/黑名单）',
 sys_date     DATE   COMMENT '业务时间',
 sys_mdate    TIMESTAMP COMMENT '修改时间'
) COMMENT 'ODS层-分包商状态表'
PARTITIONED BY (dt STRING COMMENT '分区字段，yyyymmdd')
STORED AS ORC;

CREATE TABLE IF NOT EXISTS
 ads_cp_blacklist_suppliers_quantity_statistics_df (
 current_ym STRING COMMENT '时间年月',
 current_year STRING COMMENT '时间年',
 type STRING COMMENT '类型',
 cur_qualified_num STRING COMMENT '本期合格数量',
 total_qualified_num STRING COMMENT '累计合格数量',
 cur_black_num STRING COMMENT '本期黑名单数量',
 total_black_num STRING COMMENT '累计黑名单数量',
 `update_time` STRING COMMENT '更新时间'
 ) COMMENT '合规管理-采购异常监测-供方_黑名单数量统计表' PARTITIONED BY (dt STRING COMMENT '分区字段') STORED AS ORC;

CREATE TABLE IF NOT EXISTS dim_pub_day_mdm_info_df (
 cur_year_month STRING COMMENT '当前年月，格式为 yyyy-MM',
 cur_year STRING COMMENT '当前年，格式为 yyyy'
) COMMENT '公共时间维度表'
PARTITIONED BY (dt STRING COMMENT '分区字段，格式为 yyyyMMdd')
STORED AS ORC;

INSERT OVERWRITE TABLE
 ads_cp_blacklist_suppliers_quantity_statistics_df PARTITION (dt = '${bdp.system.bizdate}')
select
 current_ym,
 current_year,
 type,
 SUM(if (current_ym = date_ym, qualified_num, 0)) as cur_qualified_num,
 SUM(qualified_num) as total_qualified_num,
 SUM(if (current_ym = date_ym, black_num, 0)) as cur_black_num,
 SUM(black_num) as black_num,
 '${bdp.system.runtime}' as update_time
from
 (
 SELECT DISTINCT
 cur_year_month AS current_ym --当前年月（年月日）
,
 cur_year as current_year --当前年
 FROM
 dim_pub_day_mdm_info_df
 WHERE
 dt = '${bdp.system.bizdate}'
 -- AND cur_year>='2023'
 AND REPLACE(cur_year_month, '-', '') = t2.date_ym
group by
 current_ym,
 current_year,
 type;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 1）执行并提交离线任务； | 表级血缘/字段级血缘正确，内容与预期完全一致，无异常或错误 |
| 3 | 2）查看对应表血缘关系 |  |

##### 【P2】验证视图血缘关系

> 前置条件
```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 1）提交离线任务 | 表级血缘关系正确： |
| 3 | 2）查看数据地图视图的血缘关系-表级血缘 | 字段级血缘关系正确，内容与预期完全一致，无异常或错误 |
| 4 | 1）提交离线任务 | 表级血缘和字段级血缘正常，功能行为符合预期，无报错或异常 |
| 5 | 2）查看数据地图视图的血缘关系-字段级血缘 |  |
| 6 | 查看跨库血缘 |  |

##### 【P1】验证离线建表【自动同步】到资产功能正常

> 前置条件
```
输入spark的建表语句
CREATE TABLE IF NOT EXISTS batch_base60.ods_ztpc_jc_fuwustz_df (
  FuWuSID      STRING COMMENT '服务商ID',

  ZhuangTai    STRING COMMENT '状态（合格/黑名单）',
  sys_date     DATE   COMMENT '业务时间',
  sys_mdate    TIMESTAMP COMMENT '修改时间'
) COMMENT 'ODS层-服务商状态表'
PARTITIONED BY (dt STRING COMMENT '分区字段，yyyymmdd')
STORED AS ORC;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线】页面，执行前置中的spark建表语句 | 系统提示建表成功，数据库中成功创建该表，表结构与配置字段一致 |
| 2 | 进入资产数据地图，搜索表test_001 | 能搜索到新建的表 |
| 3 | 查看表详情 | 信息正确，内容与预期完全一致，无异常或错误 |

##### 【P2】验证【元数据同步】_【常规表】_【全类型字段】同步正常

> 前置条件
```
已存在包含全类型字段的表A，DDL/DML如下
CREATE TABLE example_all_types (
-- 整数类型
id INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键',
tinyint_col TINYINT COMMENT '范围: -128 到 127',
smallint_col SMALLINT COMMENT '范围: -32,768 到 32,767',
mediumint_col MEDIUMINT COMMENT '范围: -8,388,608 到 8,388,607',
int_col INT COMMENT '标准整数',
bigint_col BIGINT COMMENT '大整数',

-- 浮点数类型
float_col FLOAT(10, 2) COMMENT '单精度浮点数，总10位，小数点后2位',
double_col DOUBLE(15, 4) COMMENT '双精度浮点数，总15位，小数点后4位',

-- 定点数类型 (精确数值，常用于金额)
decimal_col DECIMAL(10, 2) COMMENT '精确小数，总10位，小数点后2位',

-- 字符串类型
char_col CHAR(10) COMMENT '定长字符串，最多10个字符',
varchar_col VARCHAR(255) COMMENT '变长字符串，最多255个字符',
text_col TEXT COMMENT '长文本，最多 65,535 字节',
mediumtext_col MEDIUMTEXT COMMENT '中等长文本，最多 16,777,215 字节',
longtext_col LONGTEXT COMMENT '超长文本，最多 4,294,967,295 字节',

-- 二进制类型
binary_col BINARY(10) COMMENT '定长二进制字符串',
varbinary_col VARBINARY(255) COMMENT '变长二进制字符串',
blob_col BLOB COMMENT '二进制大对象，用于存储图片、文件等',

-- 日期和时间类型
date_col DATE COMMENT '日期，格式: YYYY-MM-DD',
time_col TIME COMMENT '时间，格式: HH:MM:SS',
datetime_col DATETIME COMMENT '日期和时间，格式: YYYY-MM-DD HH:MM:SS',
timestamp_col TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '时间戳，自动记录当前时间',
year_col YEAR COMMENT '年份',

-- 布尔类型 (MySQL 中 BOOLEAN 是 TINYINT(1) 的别名)
boolean_col BOOLEAN COMMENT '布尔值，存储 0 或 1',

-- 枚举类型
enum_col ENUM('Active', 'Inactive', 'Pending') COMMENT '枚举，只能从预定义列表中选择',

-- 集合类型
set_col SET('Red', 'Green', 'Blue') COMMENT '集合，可存储多个预定义值的组合'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='包含所有常见数据类型的示例表';

INSERT INTO example_all_types (
tinyint_col, smallint_col, mediumint_col, int_col, bigint_col,
float_col, double_col, decimal_col,
char_col, varchar_col, text_col, mediumtext_col, longtext_col,
binary_col, varbinary_col, blob_col,
date_col, time_col, datetime_col, year_col, boolean_col,
enum_col, set_col
) VALUES (
100, 30000, 500000, 123456789, 9876543210,
123.45, 12345.6789, 9999999.99,
'Fixed', 'Variable Text', 'This is a short text.', 'This is a medium-length text for demonstration purposes.', 'This is a very long text that could go on for many characters and paragraphs...',
'Binary123', 'VarBin456', 'BinaryDataBlob',
'2025-10-30', '10:30:45', '2025-10-30 10:30:45', 2025, TRUE,
'Active', 'Red,Green'
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 1）点击【元数据】-【元数据同步】-【新增周期同步任务】 | 表同步成功， 且表详情信息展示正确， 数据预览正确，内容与预期完全一致，无异常或错误 |
| 3 | 2）选择数据源${DATASOURCE_TYPE} |  |
| 4 | 3）选择数据库${DATABASE} |  |
| 5 | 4）选择数据表${TABLE} |  |
| 6 | 5）依次点击【添加】_【下一步】_【新增】按钮 |  |

##### 【P1】验证【元数据同步-临时运行】功能正常

> 前置条件
```
样例一：全部数据库 
样例二：数据库test-全部表 
样例三：数据库test-表demo、demo1 
样例四：数据库test-表demo
样例五：数据库test-全部表，过滤表demo.* 
同步结果： 
样例一：同步所选数据源下的所有数据库下的所有表 
样例二：同步数据库test下的所有表
样例三：只同步数据库下的表demo、demo1 
样例四：只同步数据库下的表demo 
样例五：同步数据库下的除去demo开头的所有表
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 新增【元数据同步任务】，选择spark的数据源，选择库表，库表选择情况见前置条件，点击【临时运行】 | 新增一条元数据同步实例，运行中 |
| 3 | 结束后查看同步结果 | 同步成功，同步结果与前置结果一致 |
| 4 | 进入数据地图首页查看 | 数据源类型表数量及数据表数量统计新增正确，内容与预期完全一致，无异常或错误 |
| 5 | 在数据地图查看表 | 存在元数据同步选择的表，表信息正确，内容与预期完全一致，无异常或错误 |

##### 【P2】验证【联动】验证质量和离线绑定，多规则包-【表行数-弱规则-校验不通过】-校验结果正确

> 前置条件
```
1、doris数据源已存在表
建表语句：
drop table if exists doris1;
CREATE TABLE IF NOT EXISTS doris_demo_data_types_source (
user_id BIGINT COMMENT “用户ID“,
created_date DATE COMMENT “创建日期“,
name VARCHAR(50) COMMENT “姓名“,
age TINYINT COMMENT “年龄“,
status SMALLINT COMMENT “状态码“,
price DECIMAL(10, 2) COMMENT “价格“,
weight FLOAT COMMENT “重量“,
rating DOUBLE COMMENT “评分“,
description STRING COMMENT “描述信息“,
gender VARCHAR(10) COMMENT “性别“,
department VARCHAR(20) COMMENT “部门“,
created_time DATETIME COMMENT “创建时间“,
birth_date DATE COMMENT “出生日期“,
is_active BOOLEAN COMMENT “是否激活“,
tags VARCHAR(100) COMMENT “标签“,
total_amount BIGINT COMMENT “总金额“,
order_count INT COMMENT “订单数量“
)
ENGINE=olap
DUPLICATE KEY(user_id, created_date, name)
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

-- 插入示例数据
INSERT INTO doris1 VALUES
(
1001, '2024-01-15', '张三', 25, 1,
99.99, 65.5, 4.5,
'技术部员工', '男', '技术部',
'2024-01-15 10:30:00', '1998-05-20',
true, '科技,财经', 1500, 5
),
(
1002, '2024-01-16', '李四', 30, 2,
199.50, 55.2, 4.8,
'市场部经理', '女', '市场部',
'2024-01-16 14:20:00', '1993-12-10',
true, '娱乐', 2500, 8
),
(
1003, '2024-01-17', '王五', 22, 0,
49.99, 70.1, 3.9,
'销售专员', '其他', '销售部',
'2024-01-17 16:45:00', '2001-08-25',
false, '科技,体育', 800, 3
);

2、离线已存在doris2doris数据同步任务：doris1-->doris2 覆盖

3、doris2为空表，doris1中有3条表数据，覆盖模式
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 规则：选择表行数，固定值>3,弱规则。再任意添加其他两种类型的规则，使校验通过 | 1）页面生成一条实例，校验未通过 |
| 3 | 调度：自动关联离线调度周期。规则包个数3 | 2）查看明细展示doris1中的三条数据 |
| 4 | 绑定任务：前置条件doris2doris | 离线任务运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 5 | 等待离线周期实例运行，进入【数据资产-数据质量-任务实例查询】 | 1）补数据质量工作流中有3个规则包，任务都运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 6 | 进入【离线开发-运维中心-周期任务实例】 | 2）质量生成一条实例，校验未通过 |
| 7 | 进入【离线开发-运维中心-周期任务】，对doris2doris任务补当前数据及下游，查看结果 |  |

##### 【P2】验证【联动】验证质量和离线绑定，多规则包-【表行数-校验通过】-校验结果正确

> 前置条件
```
1、doris数据源已存在表
建表语句：
drop table if exists doris1;
CREATE TABLE IF NOT EXISTS doris_demo_data_types_source (
user_id BIGINT COMMENT “用户ID“,
created_date DATE COMMENT “创建日期“,
name VARCHAR(50) COMMENT “姓名“,
age TINYINT COMMENT “年龄“,
status SMALLINT COMMENT “状态码“,
price DECIMAL(10, 2) COMMENT “价格“,
weight FLOAT COMMENT “重量“,
rating DOUBLE COMMENT “评分“,
description STRING COMMENT “描述信息“,
gender VARCHAR(10) COMMENT “性别“,
department VARCHAR(20) COMMENT “部门“,
created_time DATETIME COMMENT “创建时间“,
birth_date DATE COMMENT “出生日期“,
is_active BOOLEAN COMMENT “是否激活“,
tags VARCHAR(100) COMMENT “标签“,
total_amount BIGINT COMMENT “总金额“,
order_count INT COMMENT “订单数量“
)
ENGINE=olap
DUPLICATE KEY(user_id, created_date, name)
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

-- 插入示例数据
INSERT INTO doris1 VALUES
(
1001, '2024-01-15', '张三', 25, 1,
99.99, 65.5, 4.5,
'技术部员工', '男', '技术部',
'2024-01-15 10:30:00', '1998-05-20',
true, '科技,财经', 1500, 5
),
(
1002, '2024-01-16', '李四', 30, 2,
199.50, 55.2, 4.8,
'市场部经理', '女', '市场部',
'2024-01-16 14:20:00', '1993-12-10',
true, '娱乐', 2500, 8
),
(
1003, '2024-01-17', '王五', 22, 0,
49.99, 70.1, 3.9,
'销售专员', '其他', '销售部',
'2024-01-17 16:45:00', '2001-08-25',
false, '科技,体育', 800, 3
);

2、离线已存在doris2doris数据同步任务：doris1-->doris2 覆盖

3、doris2为空表，doris1中有3条表数据，覆盖模式
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 规则：选择表行数固定值=3，弱规则。再任意添加其他两种类型的规则，使校验通过 | 页面生成一条实例，校验通过 |
| 3 | 调度：自动关联离线调度周期。规则包个数3 | 离线任务运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 4 | 绑定任务：前置条件doris2doris | 1）补数据质量工作流中有3个规则包，任务都运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 5 | 等待离线周期实例运行，进入【数据资产-数据质量-任务实例查询】 | 2）质量生成一条实例，校验通过 |
| 6 | 进入【离线开发-运维中心-周期任务实例】 |  |
| 7 | 进入【离线开发-运维中心-周期任务】，对doris2doris任务补当前数据及下游，查看结果 |  |

##### 【P2】验证【联动】验证质量和离线绑定，单规则包-【表行数-弱规则-校验不通过】结果正确

> 前置条件
```
1、doris数据源已存在表
建表语句：
drop table if exists doris1;
CREATE TABLE IF NOT EXISTS doris_demo_data_types_source (
user_id BIGINT COMMENT “用户ID“,
created_date DATE COMMENT “创建日期“,
name VARCHAR(50) COMMENT “姓名“,
age TINYINT COMMENT “年龄“,
status SMALLINT COMMENT “状态码“,
price DECIMAL(10, 2) COMMENT “价格“,
weight FLOAT COMMENT “重量“,
rating DOUBLE COMMENT “评分“,
description STRING COMMENT “描述信息“,
gender VARCHAR(10) COMMENT “性别“,
department VARCHAR(20) COMMENT “部门“,
created_time DATETIME COMMENT “创建时间“,
birth_date DATE COMMENT “出生日期“,
is_active BOOLEAN COMMENT “是否激活“,
tags VARCHAR(100) COMMENT “标签“,
total_amount BIGINT COMMENT “总金额“,
order_count INT COMMENT “订单数量“
)
ENGINE=olap
DUPLICATE KEY(user_id, created_date, name)
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

-- 插入示例数据
INSERT INTO doris1 VALUES
(
1001, '2024-01-15', '张三', 25, 1,
99.99, 65.5, 4.5,
'技术部员工', '男', '技术部',
'2024-01-15 10:30:00', '1998-05-20',
true, '科技,财经', 1500, 5
),
(
1002, '2024-01-16', '李四', 30, 2,
199.50, 55.2, 4.8,
'市场部经理', '女', '市场部',
'2024-01-16 14:20:00', '1993-12-10',
true, '娱乐', 2500, 8
),
(
1003, '2024-01-17', '王五', 22, 0,
49.99, 70.1, 3.9,
'销售专员', '其他', '销售部',
'2024-01-17 16:45:00', '2001-08-25',
false, '科技,体育', 800, 3
);

2、离线已存在doris2doris数据同步任务：doris1-->doris2 覆盖

3、doris2为空表，doris1中有3条表数据，覆盖模式
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 新建单表校验，选择表doris2 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 3 | 规则：选择表行数固定值固定值>3,弱规则 | 质量新增一条实例，状态为运行中 |
| 4 | 调度：自动关联离线调度周期。规则包个数1 | 1）质量实例：校验未通过，查看明细展示doris1中的三条数据 |
| 5 | 绑定任务：前置条件doris2doris | 2）离线实例：运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 6 | 等待离线实例运行，查看质量实例 | 1）补数据质量工作流中有1个规则包，任务都运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 7 | 运行结束后，查看离线和质量实例的运行结果 | 2）质量生成一条实例，校验未通过 |
| 8 | 进入【离线开发-运维中心-周期任务】，对doris2doris任务补当前数据及下游，查看结果 |  |

##### 【P2】验证【联动】验证质量和离线绑定，单规则包-【表行数-校验通过】结果正确

> 前置条件
```
1、doris数据源已存在表
建表语句：
drop table if exists doris1;
CREATE TABLE IF NOT EXISTS doris_demo_data_types_source (
user_id BIGINT COMMENT “用户ID“,
created_date DATE COMMENT “创建日期“,
name VARCHAR(50) COMMENT “姓名“,
age TINYINT COMMENT “年龄“,
status SMALLINT COMMENT “状态码“,
price DECIMAL(10, 2) COMMENT “价格“,
weight FLOAT COMMENT “重量“,
rating DOUBLE COMMENT “评分“,
description STRING COMMENT “描述信息“,
gender VARCHAR(10) COMMENT “性别“,
department VARCHAR(20) COMMENT “部门“,
created_time DATETIME COMMENT “创建时间“,
birth_date DATE COMMENT “出生日期“,
is_active BOOLEAN COMMENT “是否激活“,
tags VARCHAR(100) COMMENT “标签“,
total_amount BIGINT COMMENT “总金额“,
order_count INT COMMENT “订单数量“
)
ENGINE=olap
DUPLICATE KEY(user_id, created_date, name)
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

-- 插入示例数据
INSERT INTO doris1 VALUES
(
1001, '2024-01-15', '张三', 25, 1,
99.99, 65.5, 4.5,
'技术部员工', '男', '技术部',
'2024-01-15 10:30:00', '1998-05-20',
true, '科技,财经', 1500, 5
),
(
1002, '2024-01-16', '李四', 30, 2,
199.50, 55.2, 4.8,
'市场部经理', '女', '市场部',
'2024-01-16 14:20:00', '1993-12-10',
true, '娱乐', 2500, 8
),
(
1003, '2024-01-17', '王五', 22, 0,
49.99, 70.1, 3.9,
'销售专员', '其他', '销售部',
'2024-01-17 16:45:00', '2001-08-25',
false, '科技,体育', 800, 3
);

2、离线已存在doris2doris数据同步任务：doris1-->doris2 覆盖

3、doris2为空表，doris1中有3条表数据，覆盖模式
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 新建单表校验，选择表doris2 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 3 | 规则：选择表行数固定值=3，弱规则 | 质量新增一条实例，状态为运行中 |
| 4 | 调度：自动关联离线调度周期。规则包个数1 | 1）质量实例：校验通过 |
| 5 | 绑定任务：前置条件doris2doris | 2）离线实例：运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 6 | 等待离线实例运行，查看质量实例 | 同步骤2-3 |
| 7 | 运行结束后，查看离线和质量实例的运行结果 |  |
| 8 | 进入离线，对doris2doris任务补数据-当前任务及下游，查看结果 |  |

##### 【P2】验证【多表-doris-doris跨源比对】功能正常

> 前置条件
```
不同doris数据库下，
已存在表doris1（id ,name）,包含昨天写入数据：
（1,'zx'），今天写入数据：（3,'zx'）,(4,'ls')
表doris2（id ,name）,包含昨天写入数据：
（1,'zx'），今天写入数据：（3,'zx'）,(4,'ww')
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 新建多表比对，选择前置中的表doris1、doris2,过滤条件都为part_date='${utc0yyyy_MM_dd_1d}' | 进入选择字段页面 |
| 3 | 同名映射，勾选id为主键 | 勾选成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 4 | 勾选【记录数百分比差异】-34% | 勾选成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 5 | 创建规则 | 系统提示创建成功，列表中出现新创建的记录，记录内容与填写一致 |
| 6 | 立即运行规则，查看结果 | 质量实例校验不通过 |
| 7 | 编辑规则，修改【记录数百分比差异】-50% | 系统提示修改成功，页面显示修改后的最新内容 |
| 8 | 立即运行规则，查看结果 | 质量实例校验通过 |

##### 【P2】验证【多表-数据预览】结果正确

> 前置条件
```
doris数据源存在表：
建表语句：
drop table if exists doris_demo_data_types_source;
CREATE TABLE IF NOT EXISTS doris_demo_data_types_source (
user_id BIGINT COMMENT “用户ID“,
created_date DATE COMMENT “创建日期“,
name VARCHAR(50) COMMENT “姓名“,
age TINYINT COMMENT “年龄“,
status SMALLINT COMMENT “状态码“,
price DECIMAL(10, 2) COMMENT “价格“,
weight FLOAT COMMENT “重量“,
rating DOUBLE COMMENT “评分“,
description STRING COMMENT “描述信息“,
gender VARCHAR(10) COMMENT “性别“,
department VARCHAR(20) COMMENT “部门“,
created_time DATETIME COMMENT “创建时间“,
birth_date DATE COMMENT “出生日期“,
is_active BOOLEAN COMMENT “是否激活“,
tags VARCHAR(100) COMMENT “标签“,
total_amount BIGINT COMMENT “总金额“,
order_count INT COMMENT “订单数量“
)
ENGINE=olap
DUPLICATE KEY(user_id, created_date, name)
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

-- 插入示例数据
INSERT INTO doris_demo_data_types_source VALUES
(
1001, '2024-01-15', '张三', 25, 1,
99.99, 65.5, 4.5,
'技术部员工', '男', '技术部',
'2024-01-15 10:30:00', '1998-05-20',
true, '科技,财经', 1500, 5
),
(
1002, '2024-01-16', '李四', 30, 2,
199.50, 55.2, 4.8,
'市场部经理', '女', '市场部',
'2024-01-16 14:20:00', '1993-12-10',
true, '娱乐', 2500, 8
),
(
1003, '2024-01-17', '王五', 22, 0,
49.99, 70.1, 3.9,
'销售专员', '其他', '销售部',
'2024-01-17 16:45:00', '2001-08-25',
false, '科技,体育', 800, 3
);新建多表比对，左表选择前置中的表doris_demo_data_types_source，点击数据预览查看结果
数据预览展示三条数据，数据正确
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 新建多表比对，左表选择前置中的表doris_demo_data_types_source，点击数据预览查看结果 | 数据预览展示三条数据，数据正确，内容与预期完全一致，无异常或错误 |
| 3 | 右表选择前置中的表doris_demo_data_types_source，点击数据预览查看结果 | 数据预览展示三条数据，数据正确，内容与预期完全一致，无异常或错误 |

##### 【P2】验证【多表-doris-mysql跨源比对】功能正常

> 前置条件
```
1、doris数据源已存在表
建表语句：
drop table if exists doris_demo_data_types_source;
CREATE TABLE IF NOT EXISTS doris_demo_data_types_source (
user_id BIGINT COMMENT “用户ID“,
created_date DATE COMMENT “创建日期“,
name VARCHAR(50) COMMENT “姓名“,
age TINYINT COMMENT “年龄“,
status SMALLINT COMMENT “状态码“,
price DECIMAL(10, 2) COMMENT “价格“,
weight FLOAT COMMENT “重量“,
rating DOUBLE COMMENT “评分“,
description STRING COMMENT “描述信息“,
gender VARCHAR(10) COMMENT “性别“,
department VARCHAR(20) COMMENT “部门“,
created_time DATETIME COMMENT “创建时间“,
birth_date DATE COMMENT “出生日期“,
is_active BOOLEAN COMMENT “是否激活“,
tags VARCHAR(100) COMMENT “标签“,
total_amount BIGINT COMMENT “总金额“,
order_count INT COMMENT “订单数量“
)
ENGINE=olap
DUPLICATE KEY(user_id, created_date, name)
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

-- 插入示例数据
INSERT INTO doris_demo_data_types_source VALUES
(
1001, '2024-01-15', '张三', 25, 1,
99.99, 65.5, 4.5,
'技术部员工', '男', '技术部',
'2024-01-15 10:30:00', '1998-05-20',
true, '科技,财经', 1500, 5
),
(
1002, '2024-01-16', '李四', 30, 2,
199.50, 55.2, 4.8,
'市场部经理', '女', '市场部',
'2024-01-16 14:20:00', '1993-12-10',
true, '娱乐', 2500, 8
),
(
1003, '2024-01-17', '王五', 22, 0,
49.99, 70.1, 3.9,
'销售专员', '其他', '销售部',
'2024-01-17 16:45:00', '2001-08-25',
false, '科技,体育', 800, 3
);

2、mysql数据源已存在表：
-- 删除已存在的表（如果存在）
DROP TABLE IF EXISTS mysql_demo_data_types_source;
CREATE TABLE IF NOT EXISTS mysql_demo_data_types_source (
user_id VARCHAR(20) COMMENT '用户ID',
created_date VARCHAR(20) COMMENT '创建日期',
name VARCHAR(50) COMMENT '姓名',
age VARCHAR(10) COMMENT '年龄',
status VARCHAR(10) COMMENT '状态码',
price VARCHAR(20) COMMENT '价格',
weight VARCHAR(20) COMMENT '重量',
rating VARCHAR(20) COMMENT '评分',
description VARCHAR(500) COMMENT '描述信息',
gender VARCHAR(10) COMMENT '性别',
department VARCHAR(20) COMMENT '部门',
created_time VARCHAR(30) COMMENT '创建时间',
birth_date VARCHAR(20) COMMENT '出生日期',
is_active VARCHAR(10) COMMENT '是否激活(是/否)',
tags VARCHAR(100) COMMENT '标签',
total_amount VARCHAR(20) COMMENT '总金额',
order_count VARCHAR(10) COMMENT '订单数量',
PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='MySQL数据源表';

INSERT INTO mysql_demo_data_types_source VALUES
('1001', '2024-01-15', '张三', '25', '1', '99.99', '65.5', '4.5', '技术部员工', '男', '技术部', '2024-01-15 10:30:00', '1998-05-20', '是', '科技,财经', '1500', '5'),
('1002', '2024-01-16', '李四', '30', '2', '199.50', '55.2', '4.8', '市场部经理', '女', '市场部', '2024-01-16 14:20:00', '1993-12-10', '是', '娱乐', '2500', '8')
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 新建多表比对，左表选择前置中的表doris_demo_data_types_source,过滤条件为part_date='${utc0yyyy_MM_dd_1d}' | 右表数据源不会默认回填左表选择的数据源，下拉框允许选择所有授权给质量项目的数据源 |
| 3 | 右表选择前置中的表mysql_demo_data_types_source，点击下一步 |  |
| 4 | 同名映射 | 1）字段类型一致的进行映射 |
| 5 | 勾选user_id为主键 | 2）不一致的不映射并提示：主表与对照表字段类型不一致，无法比对 |
| 6 | 勾选【记录数百分比差异】-0% | 勾选成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 7 | 创建规则 | 勾选成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 8 | 立即运行规则，查看结果 | 系统提示创建成功，列表中出现新创建的记录，记录内容与填写一致 |
| 9 | 编辑规则，修改【记录数百分比差异】-50% | 质量实例校验不通过 |
| 10 | 立即运行规则，查看结果 | 系统提示修改成功，页面显示修改后的最新内容 |
| 11 |  | 质量实例校验通过 |
| 12 |  | 功能操作成功，页面数据状态更新为最新，无报错提示 |

##### 【P2】验证【多表-同源比对】功能正常

> 前置条件
```
doris数据源已存在表doris_demo_data_types_source、doris_demo1_data_types_source

建表语句：
drop table if exists doris_demo_data_types_source;
CREATE TABLE IF NOT EXISTS doris_demo_data_types_source (
user_id BIGINT COMMENT “用户ID“,
created_date DATE COMMENT “创建日期“,
name VARCHAR(50) COMMENT “姓名“,
age TINYINT COMMENT “年龄“,
status SMALLINT COMMENT “状态码“,
price DECIMAL(10, 2) COMMENT “价格“,
weight FLOAT COMMENT “重量“,
rating DOUBLE COMMENT “评分“,
description STRING COMMENT “描述信息“,
gender VARCHAR(10) COMMENT “性别“,
department VARCHAR(20) COMMENT “部门“,
created_time DATETIME COMMENT “创建时间“,
birth_date DATE COMMENT “出生日期“,
is_active BOOLEAN COMMENT “是否激活“,
tags VARCHAR(100) COMMENT “标签“,
total_amount BIGINT COMMENT “总金额“,
order_count INT COMMENT “订单数量“
)
ENGINE=olap
DUPLICATE KEY(user_id, created_date, name)
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

-- 插入示例数据
INSERT INTO doris_demo_data_types_source VALUES
(
1001, '2024-01-15', '张三', 25, 1,
99.99, 65.5, 4.5,
'技术部员工', '男', '技术部',
'2024-01-15 10:30:00', '1998-05-20',
true, '科技,财经', 1500, 5
),
(
1002, '2024-01-16', '李四', 30, 2,
199.50, 55.2, 4.8,
'市场部经理', '女', '市场部',
'2024-01-16 14:20:00', '1993-12-10',
true, '娱乐', 2500, 8
),
(
1003, '2024-01-17', '王五', 22, 0,
49.99, 70.1, 3.9,
'销售专员', '其他', '销售部',
'2024-01-17 16:45:00', '2001-08-25',
false, '科技,体育', 800, 3
);

drop table if exists doris_demo1_data_types_source;
CREATE TABLE IF NOT EXISTS doris_demo1_data_types_source (
user_id BIGINT COMMENT “用户ID“,
created_date VARCHAR(20) COMMENT “创建日期“,
name VARCHAR(50) COMMENT “姓名“,
age INT COMMENT “年龄“,
status INT COMMENT “状态码“,
price VARCHAR(20) COMMENT “价格“,
weight VARCHAR(20) COMMENT “重量“,
rating VARCHAR(20) COMMENT “评分“,
description VARCHAR(500) COMMENT “描述信息“,
gender VARCHAR(10) COMMENT “性别“,
department VARCHAR(20) COMMENT “部门“,
created_time VARCHAR(30) COMMENT “创建时间“,
birth_date VARCHAR(20) COMMENT “出生日期“,
is_active VARCHAR(10) COMMENT “是否激活“,
tags VARCHAR(100) COMMENT “标签“,
total_amount INT COMMENT “总金额“,
order_count INT COMMENT “订单数量“
)
ENGINE=olap
DUPLICATE KEY(user_id, created_date, name)
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

-- 插入示例数据
INSERT INTO doris_demo_data_types_source VALUES
(
1001, '2024-01-15', '张三', 25, 1,
99, 65, 4,
'技术部员工', '男', '技术部',
'2024-01-15 10:30:00', '1998-05-20',
'true', '科技,财经', 1500, 5
),
(
1002, '2024-01-16', '李四', 30, 2,
199, 55, 4,
'市场部经理', '女', '市场部',
'2024-01-16 14:20:00', '1993-12-10',
'true', '娱乐', 2500, 8
)
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 新建多表比对，左表选择前置中的表doris_demo_data_types_source | 右表数据源默认回填左表选择的数据源，置灰不可修改 |
| 3 | 右表选择前置中的表doris_demo1_data_types_source，点击下一步 | 进入选择字段步骤 |
| 4 | 同名映射 | 1）字段类型一致的进行映射 |
| 5 | 勾选user_id为主键 | 2）不一致的不映射并提示：主表与对照表字段类型不一致，无法比对 |
| 6 | 勾选【记录数百分比差异】-0% | 勾选成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 7 | 创建规则 | 勾选成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 8 | 立即运行规则，查看结果 | 系统提示创建成功，列表中出现新创建的记录，记录内容与填写一致 |
| 9 | 编辑规则，修改【记录数百分比差异】-100% | 质量实例校验不通过 |
| 10 | 立即运行规则，查看结果 | 系统提示修改成功，页面显示修改后的最新内容 |
| 11 |  | 质量实例校验通过 |

##### 【P2】验证【规则集】功能正常

> 前置条件
```
1、doris数据源已存在表：
建表语句：
drop table if exists doris_demo_data_types_source;
CREATE TABLE IF NOT EXISTS doris_demo_data_types_source (
user_id BIGINT COMMENT “用户ID“,
created_date DATE COMMENT “创建日期“,
name VARCHAR(50) COMMENT “姓名“,
age TINYINT COMMENT “年龄“,
status SMALLINT COMMENT “状态码“,
price DECIMAL(10, 2) COMMENT “价格“,
weight FLOAT COMMENT “重量“,
rating DOUBLE COMMENT “评分“,
description STRING COMMENT “描述信息“,
gender VARCHAR(10) COMMENT “性别“,
department VARCHAR(20) COMMENT “部门“,
created_time DATETIME COMMENT “创建时间“,
birth_date DATE COMMENT “出生日期“,
is_active BOOLEAN COMMENT “是否激活“,
tags VARCHAR(100) COMMENT “标签“,
total_amount BIGINT COMMENT “总金额“,
order_count INT COMMENT “订单数量“
)
ENGINE=olap
DUPLICATE KEY(user_id, created_date, name)
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

-- 插入示例数据
INSERT INTO doris_demo_data_types_source VALUES
(
1001, '2024-01-15', '张三', 25, 1,
99.99, 65.5, 4.5,
'技术部员工', '男', '技术部',
'2024-01-15 10:30:00', '1998-05-20',
true, '科技,财经', 1500, 5
),
(
1002, '2024-01-16', '李四', 30, 2,
199.50, 55.2, 4.8,
'市场部经理', '女', '市场部',
'2024-01-16 14:20:00', '1993-12-10',
true, '娱乐', 2500, 8
),
(
1003, '2024-01-17', '王五', 22, 0,
49.99, 70.1, 3.9,
'销售专员', '其他', '销售部',
'2024-01-17 16:45:00', '2001-08-25',
false, '科技,体育', 800, 3
);

规则集sql：

1）select * from doris_demo_data_types_source；
2）select user_id，name from doris_demo_data_types_source；
3）select * from doris_demo_data_types_source where user_id >1005;
4)select 1 from doris_demo_data_types_source;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 新建规则集，选择前置的doris表，点击下一步 | 进入规则配置 |
| 3 | 下载规则模板，填写前置中的规则sql，上传 | 上传成功,规则导入正确，内容与预期完全一致，无异常或错误 |
| 4 | 配置周期调度，点击创建 | 系统提示创建成功，列表中出现新创建的记录，记录内容与填写一致 |
| 5 | 立即执行，查看运行结果 | 运行结果正确，内容与预期完全一致，无异常或错误 |

##### 【P2】验证【单表-数据预览】结果正确

> 前置条件
```
doris数据源存在表：
建表语句：
drop table if exists doris_demo_data_types_source;
CREATE TABLE IF NOT EXISTS doris_demo_data_types_source (
user_id BIGINT COMMENT “用户ID“,
created_date DATE COMMENT “创建日期“,
name VARCHAR(50) COMMENT “姓名“,
age TINYINT COMMENT “年龄“,
status SMALLINT COMMENT “状态码“,
price DECIMAL(10, 2) COMMENT “价格“,
weight FLOAT COMMENT “重量“,
rating DOUBLE COMMENT “评分“,
description STRING COMMENT “描述信息“,
gender VARCHAR(10) COMMENT “性别“,
department VARCHAR(20) COMMENT “部门“,
created_time DATETIME COMMENT “创建时间“,
birth_date DATE COMMENT “出生日期“,
is_active BOOLEAN COMMENT “是否激活“,
tags VARCHAR(100) COMMENT “标签“,
total_amount BIGINT COMMENT “总金额“,
order_count INT COMMENT “订单数量“
)
ENGINE=olap
DUPLICATE KEY(user_id, created_date, name)
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

-- 插入示例数据
INSERT INTO doris_demo_data_types_source VALUES
(
1001, '2024-01-15', '张三', 25, 1,
99.99, 65.5, 4.5,
'技术部员工', '男', '技术部',
'2024-01-15 10:30:00', '1998-05-20',
true, '科技,财经', 1500, 5
),
(
1002, '2024-01-16', '李四', 30, 2,
199.50, 55.2, 4.8,
'市场部经理', '女', '市场部',
'2024-01-16 14:20:00', '1993-12-10',
true, '娱乐', 2500, 8
),
(
1003, '2024-01-17', '王五', 22, 0,
49.99, 70.1, 3.9,
'销售专员', '其他', '销售部',
'2024-01-17 16:45:00', '2001-08-25',
false, '科技,体育', 800, 3
);新建多表比对，左表选择前置中的表doris_demo_data_types_source，点击数据预览查看结果
数据预览展示三条数据，数据正确
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 新建单表校验，选择前置中的doris表，点击数据预览，查看结果 | 数据预览展示三条数据，数据正确，内容与预期完全一致，无异常或错误 |

##### 【P2】验证单表校验-【完整性校验-字段级-多字段】校验结果正确

> 前置条件
```
DROP TABLE IF EXISTS doris_test;
CREATE TABLE IF NOT EXISTS doris_test (
id INT,
name STRING,
age INT
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

insert into doris_test values (null,'zx',18),(null,'ls',19),(3,'ww',null)
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 新建单表规则，选择doris表 | 新增【字段间规则逻辑】下拉框，值为and/or |
| 3 | 规则选择完整性校验-字段级，选择字段id、age | 运行不通过 |
| 4 | 选择and-空值数-固定值>1,保存后立即运行 | 运行通过 |
| 5 | 修改规则and-空值数-固定值>=1,保存后立即运行 | 运行通过 |
| 6 | 修改规则or-空值数-固定值>1,保存后立即运行 |  |

##### 【P2】验证单表校验-【完整性校验-字段级-单字段】结果正确

> 前置条件
```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 新建单表规则，选择doris表 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 3 | 规则选择完整性校验-字段级，分别创建空值数、空值率、空串数、空串率的子规则，配置使校验通过 | 结果正确，内容与预期完全一致，无异常或错误 |
| 4 | 立即运行查看结果 | 系统提示编辑成功，修改内容已更新，页面显示最新内容 |
| 5 | 修改规则，配置使其都校验不通过 | 结果正确，内容与预期完全一致，无异常或错误 |
| 6 | 立即运行查看结果 |  |

##### 【P1】验证【联动】验证质量和离线绑定，多规则包-【表行数-强规则-校验不通过】-校验结果正确

> 前置条件
```
1、doris数据源已存在表
建表语句： 

DROP TABLE IF EXISTS doris_demo_data_types_source;
CREATE TABLE IF NOT EXISTS doris_demo_data_types_source (
  user_id BIGINT COMMENT '用户ID',
  created_date DATE COMMENT '创建日期',
  name STRING COMMENT '姓名',
  age TINYINT COMMENT '年龄',
  status SMALLINT COMMENT '状态码',
  price DECIMAL(10,2) COMMENT '价格',
  weight FLOAT COMMENT '重量',
  rating DOUBLE COMMENT '评分',
  description STRING COMMENT '描述信息',
  gender STRING COMMENT '性别',
  department STRING COMMENT '部门',
  created_time TIMESTAMP COMMENT '创建时间',
  birth_date DATE COMMENT '出生日期',
  is_active BOOLEAN COMMENT '是否激活',
  tags STRING COMMENT '标签',
  total_amount BIGINT COMMENT '总金额',
  order_count INT COMMENT '订单数量'
)
STORED AS PARQUET;

INSERT INTO doris_demo_data_types_source VALUES
( 1001, DATE '2024-01-15', '张三', 25, 1, 99.99, 65.5, 4.5, '技术部员工', '男', '技术部', TIMESTAMP '2024-01-15 10:30:00', DATE '1998-05-20', true,  '科技,财经', 1500, 5 ),
( 1002, DATE '2024-01-16', '李四', 30, 2, 199.50, 55.2, 4.8, '市场部经理', '女', '市场部', TIMESTAMP '2024-01-16 14:20:00', DATE '1993-12-10', true,  '娱乐',     2500, 8 ),
( 1003, DATE '2024-01-17', '王五', 22, 0, 49.99, 70.1, 3.9, '销售专员',   '其他', '销售部', TIMESTAMP '2024-01-17 16:45:00', DATE '2001-08-25', false, '科技,体育', 800,  3 );

2、离线已存在doris2doris数据同步任务：doris1-->doris2 覆盖
3、doris2为空表，doris1中有3条表数据，覆盖模式
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 规则：选择表行数，固定值>3,强规则。再任意添加其他两种类型的规则，使校验通过 | 1）页面生成一条实例，校验未通过 |
| 3 | 调度：自动关联离线调度周期。规则包个数3 | 2）查看明细展示doris_demo_data_types_source中的三条数据 |
| 4 | 绑定任务：前置条件saprk2spark | 离线任务运行失败 |
| 5 | 等待离线周期实例运行，进入【数据资产-数据质量-任务实例查询】 | 1）补数据质量工作流中有3个规则包，离线任务运行失败，报错质量任务校验不通过 |
| 6 | 进入【离线开发-运维中心-周期任务实例】 | 2）质量生成一条实例，校验不通过 |
| 7 | 进入【离线开发-运维中心-周期任务】，对saprk2spark任务补当前数据及下游，查看结果 |  |

##### 【P1】验证【联动】验证质量和离线绑定，单规则包-【表行数-添加过滤条件】-校验结果正确

> 前置条件
```
1.spark数据源已存在表
建表语句：
DROP TABLE IF EXISTS spark1;
CREATE TABLE IF NOT EXISTS spark1(
 user_id BIGINT COMMENT '用户ID',
 created_date DATE COMMENT '创建日期',
 name STRING COMMENT '姓名',
 age TINYINT COMMENT '年龄',
 status SMALLINT COMMENT '状态码',
 price DECIMAL(10, 2) COMMENT '价格',
 weight FLOAT COMMENT '重量',
 rating DOUBLE COMMENT '评分',
 description STRING COMMENT '描述信息',
 gender STRING COMMENT '性别',
 department STRING COMMENT '部门',
 created_time TIMESTAMP COMMENT '创建时间',
 birth_date DATE COMMENT '出生日期',
 is_active BOOLEAN COMMENT '是否激活',
 tags STRING COMMENT '标签',
 total_amount BIGINT COMMENT '总金额',
 order_count INT COMMENT '订单数量'
)
STORED AS PARQUET;

-- 插入示例数据
INSERT INTO spark1VALUES
(
 1001, DATE '2024-01-15', '张三', 25, 1, 99.99, 65.5, 4.5, '技术部员工', '男', '技术部',
 TIMESTAMP '2024-01-15 10:30:00', DATE '1998-05-20', true, '科技,财经', 1500, 5
),
(
 1002, DATE '2024-01-16', '李四', 30, 2, 199.50, 55.2, 4.8, '市场部经理', '女', '市场部',
 TIMESTAMP '2024-01-16 14:20:00', DATE '1993-12-10', true, '娱乐', 2500, 8
),
(
 1003, DATE '2024-01-17', '王五', 22, 0, 49.99, 70.1, 3.9, '销售专员', '其他', '销售部',
 TIMESTAMP '2024-01-17 16:45:00', DATE '2001-08-25', false, '科技,体育', 800, 3
);

2、离线已存在spark2spark数据同步任务：spark1-->spark1覆盖
3、spark1为空表，spark1中有3条表数据，覆盖模式
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 新建单表校验，选择表spark1 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 3 | 规则：选择表行数固定值>0，强规则 | 质量新增一条实例，状态为运行中 |
| 4 | 过滤条件： | 1）质量实例：校验通过 |
| 5 | time >= '${utc0yyyy_MM_dd_HH_3H_00_00}' | 2）离线实例：运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 6 | and time <  '${utc0yyyy_MM_dd_HH_00_00}' | 同步骤2-3 |
| 7 | 调度：自动关联离线调度周期。规则包个数1 |  |
| 8 | 绑定任务：前置条件spark2spark |  |
| 9 | 等待离线实例运行，查看质量实例 |  |
| 10 | 运行结束后，查看离线和质量实例的运行结果 |  |
| 11 | 进入离线，对spark2spark任务补数据-当前任务及下游，查看结果 |  |

##### 【P1】验证【联动】验证质量和离线绑定，单规则包-【表行数-强规则-校验不通过】结果正确

> 前置条件
```
1、saprk数据源已存在表
建表语句：

DROP TABLE IF EXISTS spark1;
CREATE TABLE IF NOT EXISTS spark1(
user_id BIGINT COMMENT '用户ID',
created_date DATE COMMENT '创建日期',
name STRING COMMENT '姓名',
age TINYINT COMMENT '年龄',
status SMALLINT COMMENT '状态码',
price DECIMAL(10, 2) COMMENT '价格',
weight FLOAT COMMENT '重量',
rating DOUBLE COMMENT '评分',
description STRING COMMENT '描述信息',
gender STRING COMMENT '性别',
department STRING COMMENT '部门',
created_time TIMESTAMP COMMENT '创建时间',
birth_date DATE COMMENT '出生日期',
is_active BOOLEAN COMMENT '是否激活',
tags STRING COMMENT '标签',
total_amount BIGINT COMMENT '总金额',
order_count INT COMMENT '订单数量'
)
STORED AS PARQUET;
-- 插入示例数据
INSERT INTO spark1VALUES
(
1001, DATE '2024-01-15', '张三', 25, 1, 99.99, 65.5, 4.5, '技术部员工', '男', '技术部',
TIMESTAMP '2024-01-15 10:30:00', DATE '1998-05-20', true, '科技,财经', 1500, 5
),
(
1002, DATE '2024-01-16', '李四', 30, 2, 199.50, 55.2, 4.8, '市场部经理', '女', '市场部',
TIMESTAMP '2024-01-16 14:20:00', DATE '1993-12-10', true, '娱乐', 2500, 8
),
(
1003, DATE '2024-01-17', '王五', 22, 0, 49.99, 70.1, 3.9, '销售专员', '其他', '销售部',
TIMESTAMP '2024-01-17 16:45:00', DATE '2001-08-25', false, '科技,体育', 800, 3
);

2、离线已存在spark_2_spark数据同步任务：spark1-->spark2覆盖
3、spark2为空表，saprk1中有3条表数据，覆盖模式
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 修改质量规则，固定值>3,强规则 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 3 | 等待离线实例运行，查看质量实例 | 质量新增一条实例，状态为运行中 |
| 4 | 运行结束后，查看离线和质量实例的运行结果 | 1）质量实例：校验未通过，查看明细展示doris1中的三条数据 |
| 5 | 进入【离线开发-运维中心-周期任务】，对spark_2_spark任务补当前数据及下游，查看结果 | 2）离线实例：运行失败，失败原因：上游质量任务失败 |
| 6 |  | 1）补数据质量工作流中有1个规则包，离线任务运行失败，报错质量任务校验不通过 |
| 7 |  | 2）质量生成一条实例，校验不通过 |

##### 【P2】验证周期调度-【T+1】功能正常

> 前置条件
```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 新建单表规则，选择doris表 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 3 | 规则选择完整性校验-字段级，涵盖字段级下的所有子规则类型，配置使校验通过 | 没有生成实例 |
| 4 | 调度时间为17分钟后，调度方式：T+1 | 周期时间生成一条实例 |
| 5 | 17分钟后，查看质量实例 | 运行结果正确，内容与预期完全一致，无异常或错误 |
| 6 | 第二天查看实例 |  |
| 7 | 运行后查看结果 |  |

##### 【P2】验证周期调度-【立即生成】功能正常

> 前置条件
```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 新建单表规则，选择doris表 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 3 | 规则选择完整性校验-字段级，涵盖字段级下的所有子规则类型，配置使校验通过 | 生成一条实例，运行中 |
| 4 | 调度时间为17分钟后，调度方式：立即生成 | 运行结果正确，内容与预期完全一致，无异常或错误 |
| 5 | 17分钟后，查看质量实例 | 周期时间生成一条实例，运行正确，内容与预期完全一致，无异常或错误 |
| 6 | 运行后查看结果 |  |
| 7 | 第二天查看实例 |  |

##### 【P1】验证单表校验-【自定义sql-多表逻辑】结果正确

> 前置条件
```
-- 创建部门表
CREATE TABLE departments (
department_id INT PRIMARY KEY,
department_name VARCHAR(100) NOT NULL,
location VARCHAR(100),
manager_id INT,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)DISTRIBUTED BY HASH(department_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

-- 创建员工表
CREATE TABLE employees (
employee_id INT PRIMARY KEY,
employee_name VARCHAR(100) NOT NULL,
department_id INT,
salary DECIMAL(10, 2),
hire_date DATE,
email VARCHAR(100),
FOREIGN KEY (department_id) REFERENCES departments(department_id)
)DISTRIBUTED BY HASH(employee_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

-- 插入示例数据
INSERT INTO departments (department_id, department_name, location) VALUES
(1, '技术部', '北京'),
(2, '销售部', '上海'),
(3, '市场部', '广州'),
(4, '人力资源部', '深圳'),
(5, '财务部', '北京');

INSERT INTO employees (employee_id, employee_name, department_id, salary, hire_date, email) VALUES
(101, '张三', 1, 8000.00, '2023-01-15', 'zhangsan@example.com'),
(102, '李四', 1, 7500.00, '2023-03-20', 'lisi@example.com'),
(103, '王五', 2, 6000.00, '2023-02-10', 'wangwu@example.com'),
(104, '赵六', 2, 5500.00, '2023-04-05', 'zhaoliu@example.com'),
(105, '钱七', 3, 4800.00, '2023-05-12', 'qianqi@example.com'),
(106, '孙八', 4, 9000.00, '2023-01-08', 'sunba@example.com'),
(107, '周九', 1, 8500.00, '2023-06-25', 'zhoujiu@example.com'),
(108, '吴十', 5, 7000.00, '2023-03-18', 'wushi@example.com'),
(109, '郑十一', 3, 5200.00, '2023-07-30', 'zhengshiyi@example.com'),
(110, '王十二', NULL, 6500.00, '2023-08-14', 'wangshier@example.com');

样例一：
SELECT
e.employee_id,
e.employee_name,
e.salary,
d.department_name,
d.location
FROM
employees e
INNER JOIN
departments d ON e.department_id = d.department_id
WHERE
e.salary > 5000
ORDER BY
e.salary DESC;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 新建单表规则，选择前置中的doris表 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 3 | 规则选择自定义sql，输入sql使校验通过，如：[⚠️F04 请替换为具体测试数据]select * from doris;固定值<10000 | 结果正确，内容与预期完全一致，无异常或错误 |
| 4 | 立即运行查看结果 | 系统提示编辑成功，修改内容已更新，页面显示最新内容 |
| 5 | 修改规则，配置使其校验不通过 | 结果正确，内容与预期完全一致，无异常或错误 |
| 6 | 立即运行查看结果 |  |

##### 【P1】验证单表校验-【自定义sql-单表逻辑】结果正确

> 前置条件
```
doris数据源已存在表
DROP TABLE IF EXISTS doris_test;
CREATE TABLE IF NOT EXISTS doris_test (
id INT,
name STRING,
age INT
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
insert into doris_test values(1,'qq',11);
select * from doris_test;

样例一：
select * from doris

样例二：
select id,name,age from doris

样例三：
select id,name from doris

样例四：
select id，name,1 from doris

样例五：
select id，name，SUM(id) from doris
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 新建单表规则，选择前置中的doris表 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 3 | 规则选择自定义sql，输入样例sql，固定值<10000 | 结果正确，内容与预期完全一致，无异常或错误 |
| 4 | 立即运行查看结果 | 系统提示编辑成功，修改内容已更新，页面显示最新内容 |
| 5 | 修改规则，配置使其校验不通过 | 结果正确，内容与预期完全一致，无异常或错误 |
| 6 | 立即运行查看结果 |  |

##### 【P2】验证单表校验-【唯一性校验】结果正确

> 前置条件
```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 新建单表规则，选择doris表 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 3 | 规则选择唯一性校验，分别创建重复数、重复率、非重复个数、非重复占比的子规则，配置使校验通过 | 结果正确，内容与预期完全一致，无异常或错误 |
| 4 | 立即运行查看结果 | 系统提示编辑成功，修改内容已更新，页面显示最新内容 |
| 5 | 修改规则，配置使其都校验不通过 | 结果正确，内容与预期完全一致，无异常或错误 |
| 6 | 立即运行查看结果 |  |

##### 【P2】验证单表校验-【规范性校验】结果正确

> 前置条件
```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 新建单表规则，选择doris表 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 3 | 规则选择规范性校验，分别创建取值范围、枚举范围、枚举个数、身份证号、手机号、邮箱、最大长度、最小长度、字符串长度、数据精度、空值数、重复数、枚举值的子规则，配置使校验通过 | 结果正确，内容与预期完全一致，无异常或错误 |
| 4 | 立即运行查看结果 | 系统提示编辑成功，修改内容已更新，页面显示最新内容 |
| 5 | 修改规则，配置使其都校验不通过 | 结果正确，内容与预期完全一致，无异常或错误 |
| 6 | 立即运行查看结果 |  |

##### 【P2】验证单表校验-【准确性校验】结果正确

> 前置条件
```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 新建单表规则，选择doris表 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 3 | 规则选择准确性校验，分别创建求和、求平均、负值比、零值比、正值比的子规则，配置使校验通过 | 结果正确，内容与预期完全一致，无异常或错误 |
| 4 | 立即运行查看结果 | 系统提示编辑成功，修改内容已更新，页面显示最新内容 |
| 5 | 修改规则，配置使其都校验不通过 | 结果正确，内容与预期完全一致，无异常或错误 |
| 6 | 立即运行查看结果 |  |

##### 【P1】验证单表校验-【表行数-过滤条件】校验结果正确

> 前置条件
```
检测目标表：
DROP TABLE IF EXISTS doris_test;
CREATE TABLE IF NOT EXISTS doris_test (
id INT,
name STRING,
age INT
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

该表每天固定写入5条数据
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 新建单表规则，选择doris表 | 校验通过 |
| 3 | 规则选择表行数，过滤条件：part_date='${utc0yyyy_MM_dd_1d}'，配置固定值=5 | 校验通过 |
| 4 | 立即运行查看结果 | 系统提示编辑成功，修改内容已更新，页面显示最新内容 |
| 5 | 修改规则，配置固定值>5 | 校验不通过，展示每天写入的5条数据 |
| 6 | 立即运行查看结果 |  |

##### 【P1】验证项目增删改查功能

> 前置条件
```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产-数据质量】，新建单表校验，选择表doris2 | 成功进入【数据资产-数据质量】，新建单表校验，选择表doris2页面，页面内容正常加载显示，无报错 |
| 2 | 点击【创建项目】按钮，配置如下 | 提示【项目名称】输入框64字符限制； |
| 3 | 【项目名称】输入【超64字符文本】 | 提示【项目标识】输入框64字符限制以及特殊字符不支持提示； |
| 4 | 【项目标识】输入【超64字符文本&特殊字符】 | 【管理员】必填项未填提示； |
| 5 | 【管理员】不选择 | 质量项目创建成功，系统给出创建成功提示，列表中出现新创建的记录 |
| 6 | 【项目描述】输入【测试项目描述信息】 | 项目置顶成功，提示“操作成功” |
| 7 | 点击【确定】按钮 | 项目删除成功，系统给出删除成功提示，该记录从列表中消失 |
| 8 | 点击【创建项目】按钮，配置如下 |  |
| 9 | 【项目名称】输入【测试项目】 |  |
| 10 | 【项目标识】输入【测试项目标识】 |  |
| 11 | 【管理员】选择${已引入到资产平台的用户,例如admin@dtstack.com} |  |
| 12 | 【项目描述】输入【测试项目描述信息】 |  |
| 13 | 点击【确定】按钮 |  |
| 14 | 选择新增项目，点击【置顶】按钮 |  |
| 15 | 删除项目，二次确认 |  |

