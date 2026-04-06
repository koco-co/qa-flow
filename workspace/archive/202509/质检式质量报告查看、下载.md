---
suite_name: "质检式质量报告查看、下载"
description: "质检式质量报告查看、下载用例归档"
tags:
  - "报告详情"
  - "功能正常"
  - "未配置关联维表"
  - "与数据显示正确"
  - "查看详情功能正常"
  - "查看日志功能正常"
  - "下载报告功能正常"
  - "质检式质量报告查看、下载"
prd_version: "v6.4.3"
dev_version:
  - "袋鼠云"
create_at: "2026-04-05"
status: "草稿"
origin: "csv"
case_count: 8
case_id: 9342
---

## 报告详情

##### 【P1】验证查看详情功能正常

> 前置条件

```
1) 已在离线平台中创建Hive/Doris/Spark源的车辆信息表, 创建并执行DorisSQL语句:
DROP TABLE IF EXISTS car_compare01;
CREATE TABLE car_compare01 (
vin VARCHAR(64) COMMENT '车辆唯一识别码',
car_series STRING COMMENT '车系',
car_power STRING COMMENT '动力类型',
car_config STRING COMMENT '车型配置',
car_endurance STRING COMMENT '续航类型',
drive_type STRING COMMENT '驱动形式',
car_equipment STRING COMMENT '车辆配置版本',
is_certific INT COMMENT '是否认证',
delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
COMMENT '车辆校验表01'
PARTITION BY RANGE(`delivery_time`) (
PARTITION p20250919 VALUES LESS THAN (“2025-09-19“),
PARTITION p20250920 VALUES LESS THAN (“2025-09-20“),
PARTITION p20250921 VALUES LESS THAN (“2025-09-21“),
PARTITION p20250922 VALUES LESS THAN (“2025-09-22“),
PARTITION p20250923 VALUES LESS THAN (“2025-09-23“),
PARTITION p20250924 VALUES LESS THAN (“2025-09-24“),
PARTITION p20250925 VALUES LESS THAN (“2025-09-25“),
PARTITION p20250926 VALUES LESS THAN (“2025-09-26“),
PARTITION p20250927 VALUES LESS THAN (“2025-09-27“),
PARTITION p20250928 VALUES LESS THAN (“2025-09-28“),
PARTITION p20250929 VALUES LESS THAN (“2025-09-29“),
PARTITION p20250930 VALUES LESS THAN (“2025-09-30“),
PARTITION p20251001 VALUES LESS THAN (“2025-10-01“),
PARTITION p20251002 VALUES LESS THAN (“2025-10-02“),
PARTITION p20251003 VALUES LESS THAN (“2025-10-03“),
PARTITION p20251004 VALUES LESS THAN (“2025-10-04“),
PARTITION p20251005 VALUES LESS THAN (“2025-10-05“),
PARTITION p20251006 VALUES LESS THAN (“2025-10-06“),
PARTITION p20251007 VALUES LESS THAN (“2025-10-07“)
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

-- p20250919 分区
INSERT INTO car_compare01 VALUES
('LDP91C60PE200001','知音','EV','H60a','常规','两驱','N3',0,'2025-09-19'),
('LDP91C60PE200002','知音','EV','H60a','常规','两驱','N3',1,'2025-09-19'),
('LDP91C60PE200003','知音','EV','H60a','长续航','四驱','N5',1,'2025-09-19'),
('LDP91C60PE200004','知音','EREV','H60','长续航','四驱','N5',NULL,'2025-09-19'),
('LDP91C60PE200005','知音','EREV','H60','常规','四驱','N3',1,'2025-09-19'),
('LDP91C60PE200006','知音','EV','H60a','常规','两驱','N3',0,'2025-09-20'),
('LDP91C60PE200007','知音','EV','H60a','常规','两驱','N3',1,'2025-09-20'),
('LDP91C60PE200008','知音','EREV','H60','长续航','四驱','N5',1,'2025-09-20'),
('LDP91C60PE200009','知音','EREV','H60','长续航','四驱','N5',NULL,'2025-09-20'),
('LDP91C60PE200010','知音','EREV','H60','常规','四驱','N3',1,'2025-09-20');

select * from car_compare01;

2) 确保「通用配置-报告关联表设置」中已配置车辆数统计字段vin/车系关联字段car_series/车型关联字段car_config/动力类型关联字段car_power
Spark建表语句

DROP TABLE IF EXISTS car_base_table;
CREATE TABLE car_base_table (
vin STRING COMMENT '车辆数统计字段',
car_series STRING COMMENT '车系关联字段',
car_power STRING COMMENT '动力类型关联字段',
car_config STRING COMMENT '车型关联字段'
)COMMENT '车辆维表'
STORED AS ORC;

-- p20250919 分区
INSERT INTO car_base_table VALUES
('LDP91C60PE200001','知音','EV','H60a'),
('LDP91C60PE200002','知音','EV','H60a'),
('LDP91C60PE200004','知音','EV','H60a'),
('LDP91C60PE200003','知音','EREV','H60'),
('LDP91C60PE200005','知音','EREV','H60'),
('LDP91C60PE200006','知音','EV','H60a'),
('LDP91C60PE200007','知音','EV','H60a'),
('LDP91C60PE200008','知音','EREV','H60'),
('LDP91C60PE200009','知音','EREV','H60'),
('LDP91C60PE200010','知音','EREV','H60'),
('LDP91C60PE200011','FREE','EV','H53a'),
('LDP91C60PE200012','FREE','EV','H53a'),
('LDP91C60PE200013','FREE','EREV','H60'),
('LDP91C60PE200014','FREE','EREV','H60'),
('LDP91C60PE200015','FREE','EREV','H60'),
('LDP91C60PE200016','FREE','EREV','H60'),
('LDP91C60PE200017','FREE','EREV','H60'),
('LDP91C60PE200018','FREE','EV','H53a'),
('LDP91C60PE200019','FREE','EV','H53a'),
('LDP91C60PE200020','FREE','EV','H53a'),
('LDP91C60PE200021','梦想家','EREV','H60'),
('LDP91C60PE200022','梦想家','EREV','H60'),
('LDP91C60PE200023','梦想家','EREV','H60'),
('LDP91C60PE200024','梦想家','EV','H60'),
('LDP91C60PE200025','梦想家','EREV','H60'),
('LDP91C60PE200026','梦想家','EREV','H60'),
('LDP91C60PE200027','梦想家','EREV','H60'),
('LDP91C60PE200028','梦想家','EREV','H60'),
('LDP91C60PE200029','梦想家','EREV','H60'),
('LDP91C60PE200030','梦想家','EREV','H60'),
('LDP91C60PE200031','追光','EV','H53a'),
('LDP91C60PE200032','追光','EV','H53a'),
('LDP91C60PE200033','追光','EV','H53a'),
('LDP91C60PE200034','追光','EV','H53a'),
('LDP91C60PE200035','追光','EV','H53a'),
('LDP91C60PE200036','追光','EV','H53a'),
('LDP91C60PE200037','追光','EV','H53a'),
('LDP91C60PE200038','追光','EV','H53a'),
('LDP91C60PE200039','追光','EREV','H53b'),
('LDP91C60PE200040','追光','EREV','H53b');

SELECT * from car_base_table;

报告关联维表设置（doris）中通过catalog将car_base_table表设置为doris的外部维表

3)在「已配置报告」中新建报告, 规则范围默认「全部」, 并配置car_compare01表, 确保 「已生成报告」中存在该报告记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 成功进入「已配置报告」页面 |
| 2 | 点击「已生成报告」页签, 选择校验成功的报告记录, 点击「报告详情」按钮 | 跳转到「质量报告」详情页面, 「规则校验明细-多表规则-质检结果」中存在「校验未通过」的记录 |
| 3 | 点击操作中的「查看详情」 | 支持查看明细数据，展示内容和任务实例模块的查看明细弹窗/抽屉保持一致 |

##### 【P1】验证查看日志功能正常

> 前置条件

```
1) 已在离线平台中创建Hive/Doris/Spark源的车辆信息表, 创建并执行SparkSQL语句:

DROP TABLE IF EXISTS car_compare02;
CREATE TABLE car_compare02 (
vin STRING COMMENT '车辆唯一识别码',
car_series STRING COMMENT '车系',
car_power STRING COMMENT '动力类型',
car_config STRING COMMENT '车型配置',
car_endurance STRING COMMENT '续航类型',
drive_type STRING COMMENT '驱动形式',
car_equipment STRING COMMENT '车辆配置版本',
is_certific INT COMMENT '是否认证'
)
PARTITIONED BY (delivery_time STRING COMMENT '交付日期，yyyy-MM-dd')
COMMENT '车辆信息表'
STORED AS ORC;

INSERT INTO car_compare02 PARTITION (delivery_time='2025-10-01') VALUES
('LDP91C60PE200011','FREE','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200012','FREE','EV','H53a','常规','四驱','N3',0),
('LDP91C60PE200013','FREE','EREV','H60','常规','四驱','N3',NULL),
('LDP91C60PE200014','FREE','EREV','H60','常规','四驱','N5',1),
('LDP91C60PE200015','FREE','EREV','H60','常规','四驱','N5',0),
('LDP91C60PE200016','FREE','EREV','H60','常规','四驱','N5',1),
('LDP91C60PE200017','FREE','EREV','H60','常规','四驱','N5',0),
('LDP91C60PE200018','FREE','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200019','FREE','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200020','FREE','EV','H53a','常规','四驱','N3',NULL);

INSERT INTO car_compare02 PARTITION (delivery_time='2025-10-02') VALUES
('LDP91C60PE200021','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200022','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200023','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200024','梦想家','EV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200025','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200026','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200027','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200028','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200029','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200030','梦想家','EREV','H60','长续航','四驱','N3',NULL);

SELECT * FROM car_compare02;

2) 确保「通用配置-报告关联表设置」中已配置车辆数统计字段vin/车系关联字段car_series/车型关联字段car_config/动力类型关联字段car_power
Spark建表语句

DROP TABLE IF EXISTS car_base_table;
CREATE TABLE car_base_table (
vin STRING COMMENT '车辆数统计字段',
car_series STRING COMMENT '车系关联字段',
car_power STRING COMMENT '动力类型关联字段',
car_config STRING COMMENT '车型关联字段'
)COMMENT '车辆维表'
STORED AS ORC;

-- p20250919 分区
INSERT INTO car_base_table VALUES
('LDP91C60PE200001','知音','EV','H60a'),
('LDP91C60PE200002','知音','EV','H60a'),
('LDP91C60PE200004','知音','EV','H60a'),
('LDP91C60PE200003','知音','EREV','H60'),
('LDP91C60PE200005','知音','EREV','H60'),
('LDP91C60PE200006','知音','EV','H60a'),
('LDP91C60PE200007','知音','EV','H60a'),
('LDP91C60PE200008','知音','EREV','H60'),
('LDP91C60PE200009','知音','EREV','H60'),
('LDP91C60PE200010','知音','EREV','H60'),
('LDP91C60PE200011','FREE','EV','H53a'),
('LDP91C60PE200012','FREE','EV','H53a'),
('LDP91C60PE200013','FREE','EREV','H60'),
('LDP91C60PE200014','FREE','EREV','H60'),
('LDP91C60PE200015','FREE','EREV','H60'),
('LDP91C60PE200016','FREE','EREV','H60'),
('LDP91C60PE200017','FREE','EREV','H60'),
('LDP91C60PE200018','FREE','EV','H53a'),
('LDP91C60PE200019','FREE','EV','H53a'),
('LDP91C60PE200020','FREE','EV','H53a'),
('LDP91C60PE200021','梦想家','EREV','H60'),
('LDP91C60PE200022','梦想家','EREV','H60'),
('LDP91C60PE200023','梦想家','EREV','H60'),
('LDP91C60PE200024','梦想家','EV','H60'),
('LDP91C60PE200025','梦想家','EREV','H60'),
('LDP91C60PE200026','梦想家','EREV','H60'),
('LDP91C60PE200027','梦想家','EREV','H60'),
('LDP91C60PE200028','梦想家','EREV','H60'),
('LDP91C60PE200029','梦想家','EREV','H60'),
('LDP91C60PE200030','梦想家','EREV','H60'),
('LDP91C60PE200031','追光','EV','H53a'),
('LDP91C60PE200032','追光','EV','H53a'),
('LDP91C60PE200033','追光','EV','H53a'),
('LDP91C60PE200034','追光','EV','H53a'),
('LDP91C60PE200035','追光','EV','H53a'),
('LDP91C60PE200036','追光','EV','H53a'),
('LDP91C60PE200037','追光','EV','H53a'),
('LDP91C60PE200038','追光','EV','H53a'),
('LDP91C60PE200039','追光','EREV','H53b'),
('LDP91C60PE200040','追光','EREV','H53b');

SELECT * from car_base_table;

报告关联维表设置（hive）中将car_base_table表设置为spark的关联维表

3)在「已配置报告」中新建报告, 规则范围默认「全部」, 并配置car_compare02表, 确保 「已生成报告」中存在该报告记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入离线开发-周期任务, 创建并执行Hive SQL任务: DROP TABLE car_compare02; | 源表删除成功, 但是元数据表仍存在于资产平台 |
| 2 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 成功进入「已配置报告」页面 |
| 3 | 在「已配置报告」中新建报告, 规则范围默认「全部」,报告周期为「一次性」, 并配置car_compare02表, 点击「确定」 | 1) 表单提交成功 |
| 4 | 点击「已生成报告」页签, 进入报告详情, 点击操作中的「查看日志」 | 质量报告校验失败 |
| 5 |  | 支持查看日志数据，和任务实例模块的查看日志内容保持一致 |

##### 【P0】验证页面&功能正常(Doris 2.x)

> 前置条件

```
1) 已在离线平台中创建Hive/Doris/Spark源的车辆信息表, 创建并执行DorisSQL语句:



  

DROP
 
TABLE
 
IF
 
EXISTS
 
car_compare01

;


  

CREATE
 
TABLE
 
car_compare01
 
(


  

vin
 
VARCHAR

(

64

)
 
COMMENT
 
'车辆唯一识别码'

,


  

car_series
 
STRING
 
COMMENT
 
'车系'

,


  

car_power
 
STRING
 
COMMENT
 
'动力类型'

,


  

car_config
 
STRING
 
COMMENT
 
'车型配置'

,


  

car_endurance
 
STRING
 
COMMENT
 
'续航类型'

,


  

drive_type
 
STRING
 
COMMENT
 
'驱动形式'

,


  

car_equipment
 
STRING
 
COMMENT
 
'车辆配置版本'

,


  

is_certific
 
INT
 
COMMENT
 
'是否认证'

,


  

delivery_time
 
DATE
 
COMMENT
 
'交付日期'


  

)


  

ENGINE

=

OLAP


  

DUPLICATE
 
KEY

(

vin

)


  

COMMENT
 
'车辆校验表01'


  

PARTITION
 
BY
 
RANGE

(

`delivery_time`

)
 
(


  

PARTITION
 
p20250919
 
VALUES
 
LESS
 
THAN
 
(

“2025-09-19“

)

,


  

PARTITION
 
p20250920
 
VALUES
 
LESS
 
THAN
 
(

“2025-09-20“

)

,


  

PARTITION
 
p20250921
 
VALUES
 
LESS
 
THAN
 
(

“2025-09-21“

)

,


  

PARTITION
 
p20250922
 
VALUES
 
LESS
 
THAN
 
(

“2025-09-22“

)

,


  

PARTITION
 
p20250923
 
VALUES
 
LESS
 
THAN
 
(

“2025-09-23“

)

,


  

PARTITION
 
p20250924
 
VALUES
 
LESS
 
THAN
 
(

“2025-09-24“

)

,


  

PARTITION
 
p20250925
 
VALUES
 
LESS
 
THAN
 
(

“2025-09-25“

)

,


  

PARTITION
 
p20250926
 
VALUES
 
LESS
 
THAN
 
(

“2025-09-26“

)

,


  

PARTITION
 
p20250927
 
VALUES
 
LESS
 
THAN
 
(

“2025-09-27“

)

,


  

PARTITION
 
p20250928
 
VALUES
 
LESS
 
THAN
 
(

“2025-09-28“

)

,


  

PARTITION
 
p20250929
 
VALUES
 
LESS
 
THAN
 
(

“2025-09-29“

)

,


  

PARTITION
 
p20250930
 
VALUES
 
LESS
 
THAN
 
(

“2025-09-30“

)

,


  

PARTITION
 
p20251001
 
VALUES
 
LESS
 
THAN
 
(

“2025-10-01“

)

,


  

PARTITION
 
p20251002
 
VALUES
 
LESS
 
THAN
 
(

“2025-10-02“

)

,


  

PARTITION
 
p20251003
 
VALUES
 
LESS
 
THAN
 
(

“2025-10-03“

)

,


  

PARTITION
 
p20251004
 
VALUES
 
LESS
 
THAN
 
(

“2025-10-04“

)

,


  

PARTITION
 
p20251005
 
VALUES
 
LESS
 
THAN
 
(

“2025-10-05“

)

,


  

PARTITION
 
p20251006
 
VALUES
 
LESS
 
THAN
 
(

“2025-10-06“

)

,


  

PARTITION
 
p20251007
 
VALUES
 
LESS
 
THAN
 
(

“2025-10-07“

)


  

)


  

DISTRIBUTED
 
BY
 
HASH

(

vin

)
 
BUCKETS
 
10


  

PROPERTIES
 
(


  

“replication_num“
 
=
 
“1“


  

)

;





-- p20250919 分区


  

INSERT
 
INTO
 
car_compare01
 
VALUES


  

(

'LDP91C60PE200001'

,

'知音'

,

'EV'

,

'H60a'

,

'常规'

,

'两驱'

,

'N3'

,

0

,

'2025-09-19'

)

,


  

(

'LDP91C60PE200002'

,

'知音'

,

'EV'

,

'H60a'

,

'常规'

,

'两驱'

,

'N3'

,

1

,

'2025-09-19'

)

,


  

(

'LDP91C60PE200003'

,

'知音'

,

'EV'

,

'H60a'

,

'长续航'

,

'四驱'

,

'N5'

,

1

,

'2025-09-19'

)

,


  

(

'LDP91C60PE200004'

,

'知音'

,

'EREV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N5'

,

NULL

,

'2025-09-19'

)

,


  

(

'LDP91C60PE200005'

,

'知音'

,

'EREV'

,

'H60'

,

'常规'

,

'四驱'

,

'N3'

,

1

,

'2025-09-19'

)

,


  

(

'LDP91C60PE200006'

,

'知音'

,

'EV'

,

'H60a'

,

'常规'

,

'两驱'

,

'N3'

,

0

,

'2025-09-20'

)

,


  

(

'LDP91C60PE200007'

,

'知音'

,

'EV'

,

'H60a'

,

'常规'

,

'两驱'

,

'N3'

,

1

,

'2025-09-20'

)

,


  

(

'LDP91C60PE200008'

,

'知音'

,

'EREV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N5'

,

1

,

'2025-09-20'

)

,


  

(

'LDP91C60PE200009'

,

'知音'

,

'EREV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N5'

,

NULL

,

'2025-09-20'

)

,


  

(

'LDP91C60PE200010'

,

'知音'

,

'EREV'

,

'H60'

,

'常规'

,

'四驱'

,

'N3'

,

1

,

'2025-09-20'

)

;





select
 
*
 
from
 
car_compare01

;







2) 确保「通用配置-报告关联表设置」中已配置车辆数统计字段vin/车系关联字段car_series/车型关联字段car_config/动力类型关联字段car_power


Spark建表语句



  

    

DROP
 
TABLE
 
IF
 
EXISTS
 
car_base_table

;


    

CREATE
 
TABLE
 
car_base_table
 
(


    

vin
 
STRING
 
COMMENT
 
'车辆数统计字段'

,


    

car_series
 
STRING
 
COMMENT
 
'车系关联字段'

,


    

car_power
 
STRING
 
COMMENT
 
'动力类型关联字段'

,


    

car_config
 
STRING
 
COMMENT
 
'车型关联字段'


    

)

COMMENT
 
'车辆维表'


    

STORED
 
AS
 
ORC

;





-- p20250919 分区


    

INSERT
 
INTO
 
car_base_table
 
VALUES


    

(

'LDP91C60PE200001'

,

'知音'

,

'EV'

,

'H60a'

)

,


    

(

'LDP91C60PE200002'

,

'知音'

,

'EV'

,

'H60a'

)

,


    

(

'LDP91C60PE200004'

,

'知音'

,

'EV'

,

'H60a'

)

,


    

(

'LDP91C60PE200003'

,

'知音'

,

'EREV'

,

'H60'

)

,


    

(

'LDP91C60PE200005'

,

'知音'

,

'EREV'

,

'H60'

)

,


    

(

'LDP91C60PE200006'

,

'知音'

,

'EV'

,

'H60a'

)

,


    

(

'LDP91C60PE200007'

,

'知音'

,

'EV'

,

'H60a'

)

,


    

(

'LDP91C60PE200008'

,

'知音'

,

'EREV'

,

'H60'

)

,


    

(

'LDP91C60PE200009'

,

'知音'

,

'EREV'

,

'H60'

)

,


    

(

'LDP91C60PE200010'

,

'知音'

,

'EREV'

,

'H60'

)

,


    

(

'LDP91C60PE200011'

,

'FREE'

,

'EV'

,

'H53a'

)

,


    

(

'LDP91C60PE200012'

,

'FREE'

,

'EV'

,

'H53a'

)

,


    

(

'LDP91C60PE200013'

,

'FREE'

,

'EREV'

,

'H60'

)

,


    

(

'LDP91C60PE200014'

,

'FREE'

,

'EREV'

,

'H60'

)

,


    

(

'LDP91C60PE200015'

,

'FREE'

,

'EREV'

,

'H60'

)

,


    

(

'LDP91C60PE200016'

,

'FREE'

,

'EREV'

,

'H60'

)

,


    

(

'LDP91C60PE200017'

,

'FREE'

,

'EREV'

,

'H60'

)

,


    

(

'LDP91C60PE200018'

,

'FREE'

,

'EV'

,

'H53a'

)

,


    

(

'LDP91C60PE200019'

,

'FREE'

,

'EV'

,

'H53a'

)

,


    

(

'LDP91C60PE200020'

,

'FREE'

,

'EV'

,

'H53a'

)

,


    

(

'LDP91C60PE200021'

,

'梦想家'

,

'EREV'

,

'H60'

)

,


    

(

'LDP91C60PE200022'

,

'梦想家'

,

'EREV'

,

'H60'

)

,


    

(

'LDP91C60PE200023'

,

'梦想家'

,

'EREV'

,

'H60'

)

,


    

(

'LDP91C60PE200024'

,

'梦想家'

,

'EV'

,

'H60'

)

,


    

(

'LDP91C60PE200025'

,

'梦想家'

,

'EREV'

,

'H60'

)

,


    

(

'LDP91C60PE200026'

,

'梦想家'

,

'EREV'

,

'H60'

)

,


    

(

'LDP91C60PE200027'

,

'梦想家'

,

'EREV'

,

'H60'

)

,


    

(

'LDP91C60PE200028'

,

'梦想家'

,

'EREV'

,

'H60'

)

,


    

(

'LDP91C60PE200029'

,

'梦想家'

,

'EREV'

,

'H60'

)

,


    

(

'LDP91C60PE200030'

,

'梦想家'

,

'EREV'

,

'H60'

)

,


    

(

'LDP91C60PE200031'

,

'追光'

,

'EV'

,

'H53a'

)

,


    

(

'LDP91C60PE200032'

,

'追光'

,

'EV'

,

'H53a'

)

,


    

(

'LDP91C60PE200033'

,

'追光'

,

'EV'

,

'H53a'

)

,


    

(

'LDP91C60PE200034'

,

'追光'

,

'EV'

,

'H53a'

)

,


    

(

'LDP91C60PE200035'

,

'追光'

,

'EV'

,

'H53a'

)

,


    

(

'LDP91C60PE200036'

,

'追光'

,

'EV'

,

'H53a'

)

,


    

(

'LDP91C60PE200037'

,

'追光'

,

'EV'

,

'H53a'

)

,


    

(

'LDP91C60PE200038'

,

'追光'

,

'EV'

,

'H53a'

)

,


    

(

'LDP91C60PE200039'

,

'追光'

,

'EREV'

,

'H53b'

)

,


    

(

'LDP91C60PE200040'

,

'追光'

,

'EREV'

,

'H53b'

)

;





SELECT
 
*
 
from
 
car_base_table

;


    


    

报告关联维表设置（doris）中通过catalog将
car_base_table表设置为doris的外部维表


  





3)在「已配置报告」中新建报告, 规则范围默认「全部」, 并配置
car_compare01
表, 确保 「已生成报告」中存在该报告记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 成功进入「已配置报告」页面 |
| 2 | 点击「已生成报告」页签, 选择校验成功的报告记录, 点击「报告详情」按钮 | 跳转到「质量报告」详情页面 |
| 3 | UI CHECK | 显示一份质量评估汇总表格: 质量评估汇总(car_compare01--delivery_time=2025-09-19) |
| 4 | 点击质量评估汇总（car_compare01 -delivery_time）中的「车型」筛选图标 | 1) 支持选择car_config字段的所有枚举 |
| 5 | 勾选「H53a」 , 点击「确定」 | 按钮: 重置/确定, 重置默认置灰 |
| 6 | 重置后, 再次点击「车型」筛选图标，勾选「H53a」和「H53b」 , 点击「确定」 | 显示「车型」为「H53a」的记录 |
| 7 |  | 显示「车型」为「H53a」或「H53b」的记录 |

##### 【P1】验证页面&功能正常(SparkThrift 2.x)

> 前置条件

```
1) 已在离线平台中创建Hive/Doris/Spark源的车辆信息表, 创建并执行SparkSQL语句:



  


  

DROP
 
TABLE
 
IF
 
EXISTS
 
car_compare02

;


  

CREATE
 
TABLE
 
car_compare02
 
(


  

vin
 
STRING
 
COMMENT
 
'车辆唯一识别码'

,


  

car_series
 
STRING
 
COMMENT
 
'车系'

,


  

car_power
 
STRING
 
COMMENT
 
'动力类型'

,


  

car_config
 
STRING
 
COMMENT
 
'车型配置'

,


  

car_endurance
 
STRING
 
COMMENT
 
'续航类型'

,


  

drive_type
 
STRING
 
COMMENT
 
'驱动形式'

,


  

car_equipment
 
STRING
 
COMMENT
 
'车辆配置版本'

,


  

is_certific
 
INT
 
COMMENT
 
'是否认证'


  

)


  

PARTITIONED
 
BY
 
(

delivery_time
 
STRING
 
COMMENT
 
'交付日期，yyyy-MM-dd'

)


  

COMMENT
 
'车辆信息表'


  

STORED
 
AS
 
ORC

;





INSERT
 
INTO
 
car_compare02
 
PARTITION
 
(

delivery_time

=

'2025-10-01'

)
 
VALUES


  

(

'LDP91C60PE200011'

,

'FREE'

,

'EV'

,

'H53a'

,

'常规'

,

'四驱'

,

'N3'

,

1

)

,


  

(

'LDP91C60PE200012'

,

'FREE'

,

'EV'

,

'H53a'

,

'常规'

,

'四驱'

,

'N3'

,

0

)

,


  

(

'LDP91C60PE200013'

,

'FREE'

,

'EREV'

,

'H60'

,

'常规'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200014'

,

'FREE'

,

'EREV'

,

'H60'

,

'常规'

,

'四驱'

,

'N5'

,

1

)

,


  

(

'LDP91C60PE200015'

,

'FREE'

,

'EREV'

,

'H60'

,

'常规'

,

'四驱'

,

'N5'

,

0

)

,


  

(

'LDP91C60PE200016'

,

'FREE'

,

'EREV'

,

'H60'

,

'常规'

,

'四驱'

,

'N5'

,

1

)

,


  

(

'LDP91C60PE200017'

,

'FREE'

,

'EREV'

,

'H60'

,

'常规'

,

'四驱'

,

'N5'

,

0

)

,


  

(

'LDP91C60PE200018'

,

'FREE'

,

'EV'

,

'H53a'

,

'常规'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200019'

,

'FREE'

,

'EV'

,

'H53a'

,

'常规'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200020'

,

'FREE'

,

'EV'

,

'H53a'

,

'常规'

,

'四驱'

,

'N3'

,

NULL

)

;





INSERT
 
INTO
 
car_compare02
 
PARTITION
 
(

delivery_time

=

'2025-10-02'

)
 
VALUES


  

(

'LDP91C60PE200021'

,

'梦想家'

,

'EREV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200022'

,

'梦想家'

,

'EREV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200023'

,

'梦想家'

,

'EREV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200024'

,

'梦想家'

,

'EV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200025'

,

'梦想家'

,

'EREV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200026'

,

'梦想家'

,

'EREV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200027'

,

'梦想家'

,

'EREV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200028'

,

'梦想家'

,

'EREV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200029'

,

'梦想家'

,

'EREV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200030'

,

'梦想家'

,

'EREV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N3'

,

NULL

)

;





SELECT
 
*
 
FROM
 
car_compare02

;







2) 确保「通用配置-报告关联表设置」中已配置车辆数统计字段vin/车系关联字段car_series/车型关联字段car_config/动力类型关联字段car_power
Spark建表语句

DROP TABLE IF EXISTS car_base_table;
CREATE TABLE car_base_table (
vin STRING COMMENT '车辆数统计字段',
car_series STRING COMMENT '车系关联字段',
car_power STRING COMMENT '动力类型关联字段',
car_config STRING COMMENT '车型关联字段'
)COMMENT '车辆维表'
STORED AS ORC;

-- p20250919 分区
INSERT INTO car_base_table VALUES
('LDP91C60PE200001','知音','EV','H60a'),
('LDP91C60PE200002','知音','EV','H60a'),
('LDP91C60PE200004','知音','EV','H60a'),
('LDP91C60PE200003','知音','EREV','H60'),
('LDP91C60PE200005','知音','EREV','H60'),
('LDP91C60PE200006','知音','EV','H60a'),
('LDP91C60PE200007','知音','EV','H60a'),
('LDP91C60PE200008','知音','EREV','H60'),
('LDP91C60PE200009','知音','EREV','H60'),
('LDP91C60PE200010','知音','EREV','H60'),
('LDP91C60PE200011','FREE','EV','H53a'),
('LDP91C60PE200012','FREE','EV','H53a'),
('LDP91C60PE200013','FREE','EREV','H60'),
('LDP91C60PE200014','FREE','EREV','H60'),
('LDP91C60PE200015','FREE','EREV','H60'),
('LDP91C60PE200016','FREE','EREV','H60'),
('LDP91C60PE200017','FREE','EREV','H60'),
('LDP91C60PE200018','FREE','EV','H53a'),
('LDP91C60PE200019','FREE','EV','H53a'),
('LDP91C60PE200020','FREE','EV','H53a'),
('LDP91C60PE200021','梦想家','EREV','H60'),
('LDP91C60PE200022','梦想家','EREV','H60'),
('LDP91C60PE200023','梦想家','EREV','H60'),
('LDP91C60PE200024','梦想家','EV','H60'),
('LDP91C60PE200025','梦想家','EREV','H60'),
('LDP91C60PE200026','梦想家','EREV','H60'),
('LDP91C60PE200027','梦想家','EREV','H60'),
('LDP91C60PE200028','梦想家','EREV','H60'),
('LDP91C60PE200029','梦想家','EREV','H60'),
('LDP91C60PE200030','梦想家','EREV','H60'),
('LDP91C60PE200031','追光','EV','H53a'),
('LDP91C60PE200032','追光','EV','H53a'),
('LDP91C60PE200033','追光','EV','H53a'),
('LDP91C60PE200034','追光','EV','H53a'),
('LDP91C60PE200035','追光','EV','H53a'),
('LDP91C60PE200036','追光','EV','H53a'),
('LDP91C60PE200037','追光','EV','H53a'),
('LDP91C60PE200038','追光','EV','H53a'),
('LDP91C60PE200039','追光','EREV','H53b'),
('LDP91C60PE200040','追光','EREV','H53b');

SELECT * from car_base_table;



报告关联维表设置（hive）中将car_base_table表设置为spark的关联维表



3)在「已配置报告」中新建报告, 规则范围默认「全部」, 并配置
car_compare02
表, 确保 「已生成报告」中存在该报告记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 成功进入「已配置报告」页面 |
| 2 | 点击「已生成报告」页签, 选择校验成功的报告记录, 点击「报告详情」按钮 | 跳转到「质量报告」详情页面 |
| 3 | 点击「车型」筛选图标 | 1) 支持选择car_config字段的所有枚举2) 按钮: 重置/确定, 重置默认置灰 |
| 4 | 勾选「H53a」 , 点击「确定」 | 显示「车型」为「H53a」的记录 |
| 5 | 重置后, 再次点击「车型」筛选图标，勾选「H53a」和「H53b」 , 点击「确定」 | 显示「车型」为「H53a」或「H53b」的记录 |

##### 【P2】验证页面&功能正常(Hive 2.x)

> 前置条件

```
1) 已在离线平台中创建Hive/Doris/Spark源的车辆信息表, 创建并执行HiveSQL语句:



  


  

DROP
 
TABLE
 
IF
 
EXISTS
 
car_compare02

;


  

CREATE
 
TABLE
 
car_compare02
 
(


  

vin
 
STRING
 
COMMENT
 
'车辆唯一识别码'

,


  

car_series
 
STRING
 
COMMENT
 
'车系'

,


  

car_power
 
STRING
 
COMMENT
 
'动力类型'

,


  

car_config
 
STRING
 
COMMENT
 
'车型配置'

,


  

car_endurance
 
STRING
 
COMMENT
 
'续航类型'

,


  

drive_type
 
STRING
 
COMMENT
 
'驱动形式'

,


  

car_equipment
 
STRING
 
COMMENT
 
'车辆配置版本'

,


  

is_certific
 
INT
 
COMMENT
 
'是否认证'


  

)


  

PARTITIONED
 
BY
 
(

delivery_time
 
STRING
 
COMMENT
 
'交付日期，yyyy-MM-dd'

)


  

COMMENT
 
'车辆信息表'


  

STORED
 
AS
 
ORC

;





INSERT
 
INTO
 
car_compare02
 
PARTITION
 
(

delivery_time

=

'2025-10-01'

)
 
VALUES


  

(

'LDP91C60PE200011'

,

'FREE'

,

'EV'

,

'H53a'

,

'常规'

,

'四驱'

,

'N3'

,

1

)

,


  

(

'LDP91C60PE200012'

,

'FREE'

,

'EV'

,

'H53a'

,

'常规'

,

'四驱'

,

'N3'

,

0

)

,


  

(

'LDP91C60PE200013'

,

'FREE'

,

'EREV'

,

'H60'

,

'常规'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200014'

,

'FREE'

,

'EREV'

,

'H60'

,

'常规'

,

'四驱'

,

'N5'

,

1

)

,


  

(

'LDP91C60PE200015'

,

'FREE'

,

'EREV'

,

'H60'

,

'常规'

,

'四驱'

,

'N5'

,

0

)

,


  

(

'LDP91C60PE200016'

,

'FREE'

,

'EREV'

,

'H60'

,

'常规'

,

'四驱'

,

'N5'

,

1

)

,


  

(

'LDP91C60PE200017'

,

'FREE'

,

'EREV'

,

'H60'

,

'常规'

,

'四驱'

,

'N5'

,

0

)

,


  

(

'LDP91C60PE200018'

,

'FREE'

,

'EV'

,

'H53a'

,

'常规'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200019'

,

'FREE'

,

'EV'

,

'H53a'

,

'常规'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200020'

,

'FREE'

,

'EV'

,

'H53a'

,

'常规'

,

'四驱'

,

'N3'

,

NULL

)

;





INSERT
 
INTO
 
car_compare02
 
PARTITION
 
(

delivery_time

=

'2025-10-02'

)
 
VALUES


  

(

'LDP91C60PE200021'

,

'梦想家'

,

'EREV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200022'

,

'梦想家'

,

'EREV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200023'

,

'梦想家'

,

'EREV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200024'

,

'梦想家'

,

'EV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200025'

,

'梦想家'

,

'EREV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200026'

,

'梦想家'

,

'EREV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200027'

,

'梦想家'

,

'EREV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200028'

,

'梦想家'

,

'EREV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200029'

,

'梦想家'

,

'EREV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N3'

,

NULL

)

,


  

(

'LDP91C60PE200030'

,

'梦想家'

,

'EREV'

,

'H60'

,

'长续航'

,

'四驱'

,

'N3'

,

NULL

)

;





SELECT
 
*
 
FROM
 
car_compare02

;







2) 确保「通用配置-报告关联表设置」中已配置车辆数统计字段vin/车系关联字段car_series/车型关联字段car_config/动力类型关联字段car_power

Spark建表语句

DROP TABLE IF EXISTS car_base_table;

CREATE TABLE car_base_table (

vin STRING COMMENT '车辆数统计字段',

car_series STRING COMMENT '车系关联字段',

car_power STRING COMMENT '动力类型关联字段',

car_config STRING COMMENT '车型关联字段'

)COMMENT '车辆维表'

STORED AS ORC;

-- p20250919 分区

INSERT INTO car_base_table VALUES

('LDP91C60PE200001','知音','EV','H60a'),

('LDP91C60PE200002','知音','EV','H60a'),

('LDP91C60PE200004','知音','EV','H60a'),

('LDP91C60PE200003','知音','EREV','H60'),

('LDP91C60PE200005','知音','EREV','H60'),

('LDP91C60PE200006','知音','EV','H60a'),

('LDP91C60PE200007','知音','EV','H60a'),

('LDP91C60PE200008','知音','EREV','H60'),

('LDP91C60PE200009','知音','EREV','H60'),

('LDP91C60PE200010','知音','EREV','H60'),

('LDP91C60PE200011','FREE','EV','H53a'),

('LDP91C60PE200012','FREE','EV','H53a'),

('LDP91C60PE200013','FREE','EREV','H60'),

('LDP91C60PE200014','FREE','EREV','H60'),

('LDP91C60PE200015','FREE','EREV','H60'),

('LDP91C60PE200016','FREE','EREV','H60'),

('LDP91C60PE200017','FREE','EREV','H60'),

('LDP91C60PE200018','FREE','EV','H53a'),

('LDP91C60PE200019','FREE','EV','H53a'),

('LDP91C60PE200020','FREE','EV','H53a'),

('LDP91C60PE200021','梦想家','EREV','H60'),

('LDP91C60PE200022','梦想家','EREV','H60'),

('LDP91C60PE200023','梦想家','EREV','H60'),

('LDP91C60PE200024','梦想家','EV','H60'),

('LDP91C60PE200025','梦想家','EREV','H60'),

('LDP91C60PE200026','梦想家','EREV','H60'),

('LDP91C60PE200027','梦想家','EREV','H60'),

('LDP91C60PE200028','梦想家','EREV','H60'),

('LDP91C60PE200029','梦想家','EREV','H60'),

('LDP91C60PE200030','梦想家','EREV','H60'),

('LDP91C60PE200031','追光','EV','H53a'),

('LDP91C60PE200032','追光','EV','H53a'),

('LDP91C60PE200033','追光','EV','H53a'),

('LDP91C60PE200034','追光','EV','H53a'),

('LDP91C60PE200035','追光','EV','H53a'),

('LDP91C60PE200036','追光','EV','H53a'),

('LDP91C60PE200037','追光','EV','H53a'),

('LDP91C60PE200038','追光','EV','H53a'),

('LDP91C60PE200039','追光','EREV','H53b'),

('LDP91C60PE200040','追光','EREV','H53b');

SELECT * from car_base_table;

 

报告关联维表设置（hive）中将car_base_table表设置为spark的关联维表




3)在「已配置报告」中新建报告, 规则范围默认「全部」, 并配置

car_compare02

表, 确保 「已生成报告」中存在该报告记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 成功进入「已配置报告」页面 |
| 2 | 点击「已生成报告」页签, 选择校验成功的报告记录, 点击「报告详情」按钮 | 跳转到「质量报告」详情页面 |
| 3 | 点击「车型」筛选图标 | 1) 支持选择car_config字段的所有枚举 |
| 4 | 勾选「H53a」 , 点击「确定」 | 按钮: 重置/确定, 重置默认置灰 |
| 5 | 重置后, 再次点击「车型」筛选图标，勾选「H53a」和「H53b」 , 点击「确定」 | 显示「车型」为「H53a」的记录 |
| 6 |  | 显示「车型」为「H53a」或「H53b」的记录 |

##### 【P0】验证下载报告功能正常

> 前置条件

```
已存在校验成功和校验失败的报告记录>=1条
校验失败报告记录: 源库/表的连通性未通过, 可选择手动停止数据源服务
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 成功进入「已配置报告」页面 |
| 2 | 点击「已生成报告」页签, 选择校验成功的报告记录, 点击「报告详情」按钮 | 跳转到「质量报告」详情页面 |
| 3 | 点击「下载报告」 | 下载的报告中包含: 1个pdf文件和1个明细数据（异常数据）压缩包和多个xlsx文件, 格式如下:1) pdf文件命名为“xxx(报告名称)+20250819（生成日期）.pdf”，2) 压缩包命名为“xxx(报告名称)+异常数据+20250819（生成日期）.zip”3) 每个单独的规则生成一张明细数据表格，表格命名为“xxx(规则名称)+异常数据.xlsx” |
| 4 | 点击「已生成报告」页签, 选择校验失败的报告记录, 点击「报告详情」按钮 | 跳转到「质量报告」详情页面 |
| 5 | 点击「下载报告」 | 校验失败的日志无需下载 |

##### 【P1】验证未配置关联维表

> 前置条件

```
1) 已在离线平台中创建Hive/Doris/Spark源的车辆信息表, 创建并执行SparkSQL语句:

DROP TABLE IF EXISTS car_compare02;
CREATE TABLE car_compare02 (
vin STRING COMMENT '车辆唯一识别码',
car_series STRING COMMENT '车系',
car_power STRING COMMENT '动力类型',
car_config STRING COMMENT '车型配置',
car_endurance STRING COMMENT '续航类型',
drive_type STRING COMMENT '驱动形式',
car_equipment STRING COMMENT '车辆配置版本',
is_certific INT COMMENT '是否认证'
)
PARTITIONED BY (delivery_time STRING COMMENT '交付日期，yyyy-MM-dd')
COMMENT '车辆信息表'
STORED AS ORC;

INSERT INTO car_compare02 PARTITION (delivery_time='2025-10-01') VALUES
('LDP91C60PE200011','FREE','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200012','FREE','EV','H53a','常规','四驱','N3',0),
('LDP91C60PE200013','FREE','EREV','H60','常规','四驱','N3',NULL),
('LDP91C60PE200014','FREE','EREV','H60','常规','四驱','N5',1),
('LDP91C60PE200015','FREE','EREV','H60','常规','四驱','N5',0),
('LDP91C60PE200016','FREE','EREV','H60','常规','四驱','N5',1),
('LDP91C60PE200017','FREE','EREV','H60','常规','四驱','N5',0),
('LDP91C60PE200018','FREE','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200019','FREE','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200020','FREE','EV','H53a','常规','四驱','N3',NULL);

INSERT INTO car_compare02 PARTITION (delivery_time='2025-10-02') VALUES
('LDP91C60PE200021','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200022','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200023','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200024','梦想家','EV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200025','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200026','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200027','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200028','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200029','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200030','梦想家','EREV','H60','长续航','四驱','N3',NULL);

SELECT * FROM car_compare02;

2) 确保「通用配置-报告关联表设置」中已配置车辆数统计字段vin/车系关联字段car_series/车型关联字段car_config/动力类型关联字段car_power
Spark建表语句

DROP TABLE IF EXISTS car_base_table;
CREATE TABLE car_base_table (
vin STRING COMMENT '车辆数统计字段',
car_series STRING COMMENT '车系关联字段',
car_power STRING COMMENT '动力类型关联字段',
car_config STRING COMMENT '车型关联字段'
)COMMENT '车辆维表'
STORED AS ORC;

-- p20250919 分区
INSERT INTO car_base_table VALUES
('LDP91C60PE200001','知音','EV','H60a'),
('LDP91C60PE200002','知音','EV','H60a'),
('LDP91C60PE200004','知音','EV','H60a'),
('LDP91C60PE200003','知音','EREV','H60'),
('LDP91C60PE200005','知音','EREV','H60'),
('LDP91C60PE200006','知音','EV','H60a'),
('LDP91C60PE200007','知音','EV','H60a'),
('LDP91C60PE200008','知音','EREV','H60'),
('LDP91C60PE200009','知音','EREV','H60'),
('LDP91C60PE200010','知音','EREV','H60'),
('LDP91C60PE200011','FREE','EV','H53a'),
('LDP91C60PE200012','FREE','EV','H53a'),
('LDP91C60PE200013','FREE','EREV','H60'),
('LDP91C60PE200014','FREE','EREV','H60'),
('LDP91C60PE200015','FREE','EREV','H60'),
('LDP91C60PE200016','FREE','EREV','H60'),
('LDP91C60PE200017','FREE','EREV','H60'),
('LDP91C60PE200018','FREE','EV','H53a'),
('LDP91C60PE200019','FREE','EV','H53a'),
('LDP91C60PE200020','FREE','EV','H53a'),
('LDP91C60PE200021','梦想家','EREV','H60'),
('LDP91C60PE200022','梦想家','EREV','H60'),
('LDP91C60PE200023','梦想家','EREV','H60'),
('LDP91C60PE200024','梦想家','EV','H60'),
('LDP91C60PE200025','梦想家','EREV','H60'),
('LDP91C60PE200026','梦想家','EREV','H60'),
('LDP91C60PE200027','梦想家','EREV','H60'),
('LDP91C60PE200028','梦想家','EREV','H60'),
('LDP91C60PE200029','梦想家','EREV','H60'),
('LDP91C60PE200030','梦想家','EREV','H60'),
('LDP91C60PE200031','追光','EV','H53a'),
('LDP91C60PE200032','追光','EV','H53a'),
('LDP91C60PE200033','追光','EV','H53a'),
('LDP91C60PE200034','追光','EV','H53a'),
('LDP91C60PE200035','追光','EV','H53a'),
('LDP91C60PE200036','追光','EV','H53a'),
('LDP91C60PE200037','追光','EV','H53a'),
('LDP91C60PE200038','追光','EV','H53a'),
('LDP91C60PE200039','追光','EREV','H53b'),
('LDP91C60PE200040','追光','EREV','H53b');

SELECT * from car_base_table;

报告关联维表设置（hive）中将car_base_table表设置为spark的关联维表

3)在「已配置报告」中新建报告, 规则范围默认「全部」, 并配置car_compare02表, 确保 「已生成报告」中存在该报告记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 成功进入「已配置报告」页面 |
| 2 | 点击「已生成报告」页签, 选择校验成功的报告记录, 点击「报告详情」按钮 | 跳转到「质量报告」详情页面 |
| 3 | 检查报告详情页面显示 | 质量评估汇总(car_compare02--delivery_time=2025-10-01) |
| 4 |  | 不显示车辆数 |
| 5 |  | 不显示「车辆信息汇总」表格 |

##### 【P0】验证页面UI与数据显示正确

> 前置条件

```
1) 已在离线平台中创建Hive/Doris/Spark源的车辆信息表
2) 「通用配置-报告关联表设置」中已配置车辆数统计字段vin/车系关联字段car_series/车型关联字段car_config/动力类型关联字段car_power
3) 「已生成报告」中已存在报告记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 进入成功 |
| 2 | 点击「已生成报告」页签, 选择一条报告记录, 点击「报告详情」按钮 | 跳转到「质量报告」详情页面 |
| 3 | UI CHECK | 1) 面包屑: 质量报告 >> ${质量报告名称}, 报告生成时间 |
| 4 | DATA CHECK | 质量评估汇总 (${表名} - ${分区名}), 表名/表行数/车辆数/字段数/校验规则数/校验通过率, 若没有车辆信息则不展示车辆数, 即: 该表中没有vin字段. 同时也不展示「车辆信息汇总」. |
| 5 |  | 车辆信息汇总: 车系/车型/动力类型/车辆数/表中包含车辆数/车辆总数/表中包含车辆总数 |
| 6 |  | 规则校验明细: 多表规则/单表规则/字段规则 |
| 7 |  | 若规则校验中含N个表, 则依次向下展示N个2~4中的内容 按钮: 下载报告, 规则校验明细中的校验失败的「查看日志」和校验未通过的「查看详情」 |
| 8 |  | 1) 报告生成时间: ${与报告记录中的「生成时间」一致} |
| 9 |  | 表名/数据源/数据库/检测数据范围: ${该质量报告关联的规则校验表/源/库/分区} |
| 10 |  | 表行数: ${当前报告生成时的表行数} |
| 11 |  | 车辆数：${当前报告生成时规则校验表中vin字段的count值}, 若没有vin字段则不展示车辆数 |
| 12 |  | 字段数：${当前报告生成时的字段数} |
| 13 |  | 校验规则数：${当前报告生成范围内的规则数量} |
| 14 |  | 校验通过率：${统计校验通过的子规则/总规则数量（总规则指的是报告范围内的规则数量）*100%，保留两位小数} |
| 15 |  | 车系/车型/动力类型: ${校验表中的car_series/car_config/car_power字段的枚举值}, 车型可支持筛选 |
| 16 |  | 车辆数: ${该分区表中同一个车系-车型-动力类型的vin字段的count值} |
| 17 |  | 表中包含车辆数: ${当前校验表里面同一个车系-车型-动力类型的vin字段去重之后计算的车辆数} |
| 18 |  | 车辆总数: ${该分区表中同一个车型的的vin字段的count值}, 且车型一致的将合并单元格统计一下 |
| 19 |  | 表中包含总车辆数: ${当前校验表里面同一个车型的vin字段去重之后计算的车辆数}, 且车型一致的将合并单元格统计一下 |
| 20 |  | 规则校验明细: ${该表在「规则任务配置」中的校验规则} |
