---
suite_name: "doris多集群配置"
description: "doris多集群配置用例归档"
tags:
  - "历史"
  - "操作"
  - "否正常"
  - "否正确"
  - "操作后"
  - "血缘解析"
  - "步到资产"
  - "底层创建表"
  - "离线建表后"
  - "数据是否正常"
  - "多次对接不同"
  - "数据源创建表"
  - "离线对表进行"
  - "数据是否正确"
  - "自动同步到资产"
prd_version: "v6.3.4"
dev_version:
  - "袋鼠云"
create_at: "2026-04-05"
status: "草稿"
origin: "csv"
case_count: 15
case_id: 8772
---

##### 【P1】验证底层创建表，资产元数据同步是否正常

> 前置条件

```
CREATE
 
TABLE
 ks_001 (

    
product_id 
INT
 COMMENT 
“用户ID“
,

    
amount 
int
 COMMENT 
“用户姓名“


    
)

    
DISTRIBUTED 
BY
 HASH(product_id) BUCKETS 
10


    
PROPERTIES (

    

“replication_num“
 = 
“1“


    
)
;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 在DBeaver连接数据源，创建前置条件中的表，然后进入资产-元数据同步，新增同步，选择数据源、数据库，查看数据表 | 数据表中有底层创建的表 |
| 2 | 选中表进行元数据同步 | 同步成功，表结构、数据预览、技术属性、血缘关系等正确 |
| 3 | 选择立即同步，选择负责人，同步成功后查看结果 | 负责人正确 |

##### 【P0】验证血缘解析insert into .. select ... join是否自动同步到资产

> 前置条件

```
--  ...
create table bood_1_1(
 id int,
 name varchar(10),
 phone varchar(10),
 sex varchar(10),
 adress varchar(10)
)ENGINE=OLAP
DUPLICATE KEY(`id`, `name`)
COMMENT 'OLAPhhh'
DISTRIBUTED BY HASH(`id`) BUCKETS 10
PROPERTIES (
“replication_allocation“ = “tag.location.default: 1“,
“is_being_synced“ = “false“,
“storage_format“ = “V2“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“
);
create table bood_1_2(
 id int,
 name varchar(10),
 phone varchar(10)
)ENGINE=OLAP
DUPLICATE KEY(`id`, `name`)
COMMENT 'OLAPhhh'
DISTRIBUTED BY HASH(`id`) BUCKETS 10
PROPERTIES (
“replication_allocation“ = “tag.location.default: 1“,
“is_being_synced“ = “false“,
“storage_format“ = “V2“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“
);
insert into bood_1_2 values(1,'yeluo','1234');
 
create table bood_1_3(
 id int,
 sex varchar(10)
)ENGINE=OLAP
DUPLICATE KEY(`id`)
COMMENT 'OLAPhhh'
DISTRIBUTED BY HASH(`id`) BUCKETS 10
PROPERTIES (
“replication_allocation“ = “tag.location.default: 1“,
“is_being_synced“ = “false“,
“storage_format“ = “V2“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“
);
insert into bood_1_3 values(1,'nv');
create table bood_1_4(
 id int,
 adress varchar(10)
)ENGINE=OLAP
DUPLICATE KEY(`id`)
COMMENT 'OLAPhhh'
DISTRIBUTED BY HASH(`id`) BUCKETS 10
PROPERTIES (
“replication_allocation“ = “tag.location.default: 1“,
“is_being_synced“ = “false“,
“storage_format“ = “V2“,
“light_schema_change“ = “true“,
“disable_auto_compaction“ = “false“,
“enable_single_replica_compaction“ = “false“
);
insert into bood_1_4 values(1,'galaxy');
insert into bood_1_4 values(1,'china');
-- create table bood_1_1(
--     id int,
--     name varchar(10),
--     phone varchar(10),
--     sex varchar(10),
--     adress varchar(10)
-- );

-- 血缘解析sql
insert into bood_1_1
select
a.id as id,
a.name as name,
a.phone as phone,
b.sex as sex,
t.adress as adress
from bood_1_2 as a
left join
bood_1_3 as b
on a.id = b.id
and name = 'yeluo'
left join
bood_1_4 as t
on t.adress = 'galaxy'
where a.id = 1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 离线创建前置条件中的表，进入数据资产，查看表的血缘关系 | 血缘关系正确 |
| 2 | 切换任务，对接其他doris，创建前置条件中的表，进入数据资产-数据地图，查看表的血缘关系 | 血缘关系正确 |

##### 【P0】验证血缘解析create. .. select是否自动同步到资产

> 前置条件

```
-- create. .. select
CREATE TABLE  table2 (
 id INT COMMENT “用户ID“,
 name VARCHAR(50) COMMENT “用户姓名“
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
 “replication_num“ = “1“
);
insert into table2 values(2,'wz_02'); 
CREATE TABLE table1 
PROPERTIES (
 “replication_num“ = “1“  -- 显式设置为1
) 
AS SELECT * FROM table2;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 离线创建前置条件中的表，进入数据资产，查看表的血缘关系 | 血缘关系正确 |
| 2 | 切换任务，对接其他doris，创建前置条件中的表，进入数据资产-数据地图，查看表的血缘关系 | 血缘关系正确 |

##### 【P1】验证历史mysql数据是否正常

> 前置条件

```
有mysql类型的表
wz_0107_01 
、
wz_0107_02
、
wz_0107_03
，存在血缘关系。已同步到资产。以及三张表的元数据临时同步、周期同步任务





  

CREATE
 
TABLE
 
wz_0107_01
 
(


  

id
 
INT
 
COMMENT
 
“用户ID“

,


  

name
 
VARCHAR

(

50

)
 
COMMENT
 
“用户姓名“


  

)

;


  

CREATE
 
TABLE
 
wz_0107_02
 
(


  

id
 
INT
 
COMMENT
 
“用户ID“

,


  

name
 
VARCHAR

(

50

)
 
COMMENT
 
“用户姓名“


  

)

;


  

CREATE
 
TABLE
 
wz_0107_03
 
(


  

id
 
INT
 
COMMENT
 
“用户ID“

,


  

name
 
VARCHAR

(

50

)
 
COMMENT
 
“用户姓名“


  

)

;


  

insert
 
into
 
wz_0107_01
 
values

(

1

,

'wz_01'

)

;


  

insert
 
into
 
wz_0107_02
 
values

(

2

,

'wz_02'

)

;


  

insert
 
into
 
wz_0107_03
 
select
 
wz_0107_01

.

id

,

wz_0107_02

.

name
 
from
 
wz_0107_01
 
inner
 
join
 
wz_0107_02
 
on
 
wz_0107_01

.

id
 
=
 
wz_0107_02

.

id

;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产，查看表wz_0107_01、wz_0107_02、wz_0107_03详情 | 表结构、数据预览、技术属性、血缘关系等正确 |
| 2 | 进入元数据同步页面，临时同步任务，点击立即执行 | 同步成功，表结构、数据预览、技术属性、血缘关系等正确 |
| 3 | 进入元数据同步页面，周期同步任务，点击立即执行 | 同步成功，表结构、数据预览、技术属性、血缘关系等正确 |
| 4 | 进入元数据同步页面，周期同步任务，周期时间后查看表 | 同步成功，表结构、数据预览、技术属性、血缘关系等正确 |

##### 【P0】验证历史doris元数据同步任务是否正确

> 前置条件

```
存在历史项目history，单个doris集群。
有表
wz_0107_01 
、
wz_0107_02
、
wz_0107_03
，存在血缘关系。有元数据同步临时任务和周期任务，同步以上三张表


-- insert into ..select ..
CREATE TABLE  wz_0107_01 (
    id INT COMMENT “用户ID“,
    name VARCHAR(50) COMMENT “用户姓名“
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
    “replication_num“ = “1“
);
CREATE TABLE  wz_0107_02 (
    id INT COMMENT “用户ID“,
    name VARCHAR(50) COMMENT “用户姓名“
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
    “replication_num“ = “1“
);CREATE TABLE  wz_0107_03 (
    id INT COMMENT “用户ID“,
    name VARCHAR(50) COMMENT “用户姓名“
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
    “replication_num“ = “1“
);
insert into wz_0107_01 values(1,'wz_01'); 
insert into wz_0107_02 values(2,'wz_02'); 
insert into wz_0107_03 select wz_0107_01.id,wz_0107_02.name from wz_0107_01 inner join wz_0107_02 on wz_0107_01.id = wz_0107_02.id;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产，查看元数据同步临时任务，点击立即执行 | 同步成功，表结构、技术属性、血缘关系等正确 |
| 2 | 进入数据资产，查看元数据同步周期任务，点击立即执行 | 同步成功，表结构、技术属性、血缘关系等正确 |
| 3 | 进入数据资产，查看元数据同步周期任务，周期时间后查看表数据 | 表结构、技术属性、血缘关系等正确 |

##### 【P0】验证血缘解析insert into ..select ..是否自动同步到资产

> 前置条件

```
-- insert into ..select ..
CREATE TABLE  wz_0107_01 (
 id INT COMMENT “用户ID“,
 name VARCHAR(50) COMMENT “用户姓名“
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
 “replication_num“ = “1“
);
CREATE TABLE  wz_0107_02 (
 id INT COMMENT “用户ID“,
 name VARCHAR(50) COMMENT “用户姓名“
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
 “replication_num“ = “1“
);CREATE TABLE  wz_0107_03 (
 id INT COMMENT “用户ID“,
 name VARCHAR(50) COMMENT “用户姓名“
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
 “replication_num“ = “1“
);
insert into wz_0107_01 values(1,'wz_01'); 
insert into wz_0107_02 values(2,'wz_02'); 
insert into wz_0107_03 select wz_0107_01.id,wz_0107_02.name from wz_0107_01 inner join wz_0107_02 on wz_0107_01.id = wz_0107_02.id;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 离线创建前置条件中的表，进入数据资产，查看表的血缘关系 | 血缘关系正确 |
| 2 | 切换任务，对接其他doris，创建前置条件中的表，进入数据资产-数据地图，查看表的血缘关系 | 血缘关系正确 |

##### 【P1】验证多次对接不同doris数据源创建表，资产数据表是否正确

> 前置条件

```
CREATE
 
TABLE
 doris01
(


    

id
 
INT
 
COMMENT
 
“用户ID“

,


    

name
 
VARCHAR

(

50

)
 
COMMENT
 
“用户姓名“


    

)


    

UNIQUE
 
KEY

(

id

)
 
-- 使用UNIQUE KEY替代


    

DISTRIBUTED
 
BY
 
HASH

(

id

)
 
BUCKETS
 
10


    

PROPERTIES
 
(


    

“replication_num“
 
=
 
“1“

,


    

“enable_unique_key_merge_on_write“
 
=
 
“true“
 
-- 启用Merge-On-Write


    

)

;


    

insert
 
into
 
doris01

values
 
(

1

,

'z'

)

,

(

2

,

'x'

)

;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 多次切换任务，对接不同的doris数据源，创建前置条件中的表，查看数据表是否正确 | 1）表结构、数据预览、血缘关系等正确 |
| 2 | 1）离线doris sql任务1，对接doris1，创建表doris，同步到资产； 2）编辑任务1，对接doris2，创建表doris，同步到资产 | 所属数据源、存储位置等技术属性正确 |
| 3 |  | 两张表的数据正确 |

##### 【P1】验证离线对表进行delete操作后，自动同步到资产

> 前置条件

```
1、doris01集群下已存在表

 


  

    

CREATE
 
TABLE
 doris01
(



 
id
 
INT
 
COMMENT
 
“用户ID“

,



 
name
 
VARCHAR

(

50

)
 
COMMENT
 
“用户姓名“



)


UNIQUE
 
KEY

(

id

)
 
-- 使用UNIQUE KEY替代



DISTRIBUTED
 
BY
 
HASH

(

id

)
 
BUCKETS
 
10


PROPERTIES
 
(



 
“replication_num“
 
=
 
“1“

,


 
“enable_unique_key_merge_on_write“
 
=
 
“true“
 
-- 启用Merge-On-Write



)

;


insert
 
into
 

doris01

values
 
(

1

,

'z'

)

,

(

2

,

'x'

)

;





2、


delete from doris01

 

where

 

id

 

=

 

1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 离线在对接doris01的任务中，执行前置条件2中的sql。进入资产数据地图查看表详情 | 数据预览中id为1的数据被删除 |
| 2 | 切换任务，对接其他doris，重复步骤一 | 结果正确 |

##### 【P1】验证离线对表进行update操作后，自动同步到资产

> 前置条件

```
1、doris01集群下已存在表
 


  

    

CREATE
 
TABLE

 

doris01

(


    

id
 
INT
 
COMMENT
 
“用户ID“

,


    

name
 
VARCHAR

(

50

)
 
COMMENT
 
“用户姓名“


    

)


    

UNIQUE
 
KEY

(

id

)
 
-- 使用UNIQUE KEY替代


    

DISTRIBUTED
 
BY
 
HASH

(

id

)
 
BUCKETS
 
10


    

PROPERTIES
 
(


    

“replication_num“
 
=
 
“1“

,


    

“enable_unique_key_merge_on_write“
 
=
 
“true“
 
-- 启用Merge-On-Write


    

)

;


    

insert
 
into
 

doris01

values
 
(

1

,

'z'

)

,

(

2

,

'x'

)

;


    


    
2、

    

update

 

doris01 

set

 

name

 

=

 

'new_name'

 

where

 

id

 

=

 

1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 离线在对接doris01的任务中，执行前置条件2中的sql。进入资产数据地图查看表详情 | 数据预览更新 |
| 2 | 切换任务，对接其他doris，重复步骤一 | 结果正确 |

##### 【P0】验证离线对表进行insert操作后，自动同步到资产

> 前置条件

```
已存在表

CREATE
 
TABLE
 
`doris01`
 
(
 

 
`id`
 
int

(

11

)
 
NULL
 
COMMENT
 
'用户ID'

,



 
`name`
 
varchar

(

50

)
 
NULL
 
COMMENT
 
'用户姓名'

,
 

 
`age`
 
int

(

11

)
 
NULL



)
 
ENGINE

=

OLAP
 

DUPLICATE
 
KEY

(

`id`

,
 
`name`

)



COMMENT
 
'OLAPhhh'
 

DISTRIBUTED
 
BY
 
HASH

(

`id`

)
 
BUCKETS
 
10



PROPERTIES
 
(
 

“replication_allocation“
 
=
 
“tag.location.default: 1“

,



“is_being_synced“
 
=
 
“false“

,
 

“storage_format“
 
=
 
“V2“

,



“light_schema_change“
 
=
 
“true“

,
 

“disable_auto_compaction“
 
=
 
“false“

,



“enable_single_replica_compaction“
 
=
 
“false“
 

)

;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 离线对表doris01进行insert操作，insert into doris01 values (1,'z',18);进入资产数据地图查看表详情 | 数据预览正确 |
| 2 | 切换任务，对接其他doris，重复步骤一 | 结果正确 |

##### 【P1】验证离线对表进行删除操作，自动同步到资产

> 前置条件

```
已存在表

 

CREATE
 
TABLE
 
`doris01`
 
(





`id`
 
int

(

11

)
 
NULL
 
COMMENT
 
'用户ID'

,



`name`
 
varchar

(

50

)
 
NULL
 
COMMENT
 
'用户姓名'

,



`age`
 
int

(

11

)
 
NULL



)
 
ENGINE

=

OLAP



DUPLICATE
 
KEY

(

`id`

,
 
`name`

)



COMMENT
 
'OLAPhhh'



DISTRIBUTED
 
BY
 
HASH

(

`id`

)
 
BUCKETS
 
10



PROPERTIES
 
(



“replication_allocation“
 
=
 
“tag.location.default: 1“

,



“is_being_synced“
 
=
 
“false“

,



“storage_format“
 
=
 
“V2“

,



“light_schema_change“
 
=
 
“true“

,



“disable_auto_compaction“
 
=
 
“false“

,



“enable_single_replica_compaction“
 
=
 
“false“



)

;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 离线在对应的集群任务下，执行drop table doris01，进入资产数据地图查看表 | 表不存在 |
| 2 | 切换任务，对接其他doris，新建表doris后，重复步骤一 | 结果正确 |

##### 【P1】验证离线对表进行修改操作，自动同步到资产

> 前置条件

```
1、已存在表doris01、02：

CREATE
 
TABLE
 
`doris01`
 
(
 

 
`id`
 
int

(

11

)
 
NULL
 
COMMENT
 
'用户ID'

,



 
`name`
 
varchar

(

50

)
 
NULL
 
COMMENT
 
'用户姓名'

,
 

 
`age`
 
int

(

11

)
 
NULL



)
 
ENGINE

=

OLAP
 

DUPLICATE
 
KEY

(

`id`

,
 
`name`

)



COMMENT
 
'OLAPhhh'
 

DISTRIBUTED
 
BY
 
HASH

(

`id`

)
 
BUCKETS
 
10



PROPERTIES
 
(
 

“replication_allocation“
 
=
 
“tag.location.default: 1“

,



“is_being_synced“
 
=
 
“false“

,
 

“storage_format“
 
=
 
“V2“

,



“light_schema_change“
 
=
 
“true“

,
 

“disable_auto_compaction“
 
=
 
“false“

,



“enable_single_replica_compaction“
 
=
 
“false“
 

)

;
 



 



CREATE
 
TABLE
 
`doris02`
 
(



 
`id`
 
int

(

11

)
 
NULL
 
COMMENT
 
'用户ID'

,
 

 
`name`
 
varchar

(

50

)
 
NULL
 
COMMENT
 
'用户姓名'

,



 
`age`
 
int

(

11

)
 
NULL
 

)
 
ENGINE

=

OLAP



DUPLICATE
 
KEY

(

`id`

,
 
`name`

)
 

COMMENT
 
'OLAPhhh'



DISTRIBUTED
 
BY
 
HASH

(

`id`

)
 
BUCKETS
 
10
 

PROPERTIES
 
(



“replication_allocation“
 
=
 
“tag.location.default: 1“

,
 

“is_being_synced“
 
=
 
“false“

,



“storage_format“
 
=
 
“V2“

,
 

“light_schema_change“
 
=
 
“true“

,



“disable_auto_compaction“
 
=
 
“false“

,
 

“enable_single_replica_compaction“
 
=
 
“false“



)

;
 



 



2、
 




  


  

 



-- 修改列类型



ALTER
 
TABLE
 

doris01 

MODIFY
 
COLUMN
 
age1
 
INT

;
 

 


  

--删除列


  

ALTER
 
TABLE

 

doris01 

DROP
 
COLUMN
 
age

;


  


  

--修改字段名


  

ALTER
 
TABLE
 

doris01 

RENAME
 
COLUMN
 
name
 
user_name

;





-- 添加列 


  

ALTER
 
TABLE
 

doris01 

ADD
 
COLUMN
 
email
 
VARCHAR

(

100

)
 
COMMENT
 
“邮箱“

;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 离线执行前置条件2中的【修改列类型】sql，进入数据资产-数据地图，查看表结构是否正确 | 字段类型被修改 |
| 2 | 离线执行前置条件2中的【删除列】sql，进入数据资产-数据地图，查看表结构是否正确 | 列被删除 |
| 3 | 离线执行前置条件2中的【修改字段名】sql，进入数据资产-数据地图，查看表结构是否正确 | 字段名被修改 |
| 4 | 离线执行前置条件2中的【添加列】sql，进入数据资产-数据地图，查看表结构是否正确 | 新增一个列 |
| 5 | 离线切换任务，对接其他集群，重复步骤一至步骤四，查看结果 | 结果正确 |

##### 【P0】验证离线建表后，自动同步到资产

> 前置条件

```
CREATE
 
TABLE
 
`doris01`
 
(


  

`id`
 
int

(

11

)
 
NULL
 
COMMENT
 
'用户ID'

,


  

`name`
 
varchar

(

50

)
 
NULL
 
COMMENT
 
'用户姓名'

,


  

`age`
 
int

(

11

)
 
NULL


  

)
 
ENGINE

=

OLAP


  

DUPLICATE
 
KEY

(

`id`

,
 
`name`

)


  

COMMENT
 
'OLAPhhh'


  

DISTRIBUTED
 
BY
 
HASH

(

`id`

)
 
BUCKETS
 
10


  

PROPERTIES
 
(


  

“replication_allocation“
 
=
 
“tag.location.default: 1“

,


  

“is_being_synced“
 
=
 
“false“

,


  

“storage_format“
 
=
 
“V2“

,


  

“light_schema_change“
 
=
 
“true“

,


  

“disable_auto_compaction“
 
=
 
“false“

,


  

“enable_single_replica_compaction“
 
=
 
“false“


  

)

;


  


  


  

 


  

CREATE
 
TABLE
 
`doris02`
 
(


  

`id`
 
int

(

11

)
 
NULL
 
COMMENT
 
'用户ID'

,


  

`name`
 
varchar

(

50

)
 
NULL
 
COMMENT
 
'用户姓名'

,


  

`age`
 
int

(

11

)
 
NULL


  

)
 
ENGINE

=

OLAP


  

DUPLICATE
 
KEY

(

`id`

,
 
`name`

)


  

COMMENT
 
'OLAPhhh'


  

DISTRIBUTED
 
BY
 
HASH

(

`id`

)
 
BUCKETS
 
10


  

PROPERTIES
 
(


  

“replication_allocation“
 
=
 
“tag.location.default: 1“

,


  

“is_being_synced“
 
=
 
“false“

,


  

“storage_format“
 
=
 
“V2“

,


  

“light_schema_change“
 
=
 
“true“

,


  

“disable_auto_compaction“
 
=
 
“false“

,


  

“enable_single_replica_compaction“
 
=
 
“false“


  

)

;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 创建离线doris sql任务，对接集群doris01，创建前提条件中的表doris01，进入数据资产-数据地图，查看表doris | 1）表自动同步到数据地图2）表所属数据源正确 |
| 2 | 创建离线doris sql任务，对接集群doris02，创建前提条件中的表doris02，进入数据资产-数据地图，查看表doris | 1）表自动同步到数据地图2）表所属数据源正确3）数据地图有两张doris，所属数据源不同 |

##### 【P0】验证离线生成的多个meta数据源是否自动同步到资产

> 前置条件

```
1、doris配置多个集群
2、离线创建项目test，有多个doris类型的meta数据源：test_doris、test1_doris、test2_doris
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产，查看平台管理-数据源管理页面 | 已引入数据源列表有数据源test_doris、test1_doris、test2_doris |

##### 【P0】验证历史doris数据是否正确

> 前置条件

```
存在历史项目history，单个doris集群。
有表
wz_0107_01 
、
wz_0107_02
、
wz_0107_03
，存在血缘关系。已同步到资产


-- insert into ..select ..
CREATE TABLE  wz_0107_01 (
 id INT COMMENT “用户ID“,
 name VARCHAR(50) COMMENT “用户姓名“
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
 “replication_num“ = “1“
);
CREATE TABLE  wz_0107_02 (
 id INT COMMENT “用户ID“,
 name VARCHAR(50) COMMENT “用户姓名“
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
 “replication_num“ = “1“
);CREATE TABLE  wz_0107_03 (
 id INT COMMENT “用户ID“,
 name VARCHAR(50) COMMENT “用户姓名“
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
 “replication_num“ = “1“
);
insert into wz_0107_01 values(1,'wz_01'); 
insert into wz_0107_02 values(2,'wz_02'); 
insert into wz_0107_03 select wz_0107_01.id,wz_0107_02.name from wz_0107_01 inner join wz_0107_02 on wz_0107_01.id = wz_0107_02.id;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产，查看表wz_0107_01、wz_0107_02、wz_0107_03详情 | 表结构、数据预览、技术属性等正确 |
| 2 | 查看表的血缘关系 | 血缘关系展示正确 |
