---
suite_name: "支持批量删除数据库"
description: "支持批量删除数据库用例归档"
tags:
  - "互功能"
  - "内的信息"
  - "大批量删除表"
  - "删除数据库后"
  - "批量删除功能"
  - "除数据库按钮"
  - "治理任务运行报错"
  - "删除为仅删除数栈"
  - "删除数据库按钮交"
  - "元数据管理添加删"
  - "支持批量删除数据库"
prd_version: "v6.3.2"
dev_version:
  - "袋鼠云"
create_at: "2026-04-05"
status: "草稿"
origin: "csv"
case_count: 6
case_id: 8639
---

##### 【P1】验证大批量删除表

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 删除一个数据库下所有的表，查看状态 | 1）页面一直在删除中 |
| 2 | 切换页面，再返回元数据管理 | 页面操作按钮都置灰，提示正在删除中 |

##### 【P1】验证删除数据库后，治理任务运行报错功能

> 前置条件

```
数据源datasource下db1创建表：


  

CREATE
 
table
 
spark1

(


  

id
 
INT

,


  

age
 
INT

,


  

name
 
STRING


  

)

;





INSERT
 

  

INTO


  

saprk1


  

VALUES


  

(

1

,
 
25

,
 
'Alice'

)

;





INSERT
 

  

INTO


  

spark1


  

VALUES


  

(

2

,
 
30

,
 
'Bob'

)

;





INSERT
 

  

INTO


  

spark1


  

VALUES


  

(

3

,
 
22

,
 
'Charlie'

)

;





INSERT
 

  

INTO


  

spark1


  

VALUES


  

(

4

,
 
28

,
 
'David'

)

;





INSERT
 

  

INTO


  

spark1


  

VALUES


  

(

5

,
 
35

,
 
'Eva'

)

;





INSERT
 

  

INTO


  

spark1


  

VALUES


  

(

6

,
 
27

,
 
'Frank'

)

;





INSERT
 

  

INTO


  

spark1


  

VALUES


  

(

7

,
 
23

,
 
'Grace'

)

;





INSERT
 

  

INTO


  

spark1


  

VALUES


  

(

8

,
 
40

,
 
'Hannah'

)

;





INSERT
 

  

INTO


  

spark1


  

VALUES


  

(

9

,
 
26

,
 
'Ivy'

)

;





INSERT
 

  

INTO


  

spark1


  

VALUES


  

(

10

,
 
33

,
 
'Jack'

)

;





INSERT
 

  

INTO


  

spark1


  

VALUES


  

(

11

,
 
29

,
 
'Kathy'

)

;





INSERT
 

  

INTO


  

spark1


  

VALUES


  

(

12

,
 
32

,
 
'Liam'

)

;





INSERT
 

  

INTO


  

spark1


  

VALUES


  

(

13

,
 
24

,
 
'Mona'

)

;





INSERT
 

  

INTO


  

spark1


  

VALUES


  

(

14

,
 
31

,
 
'Nina'

)

;





INSERT
 

  

INTO


  

spark1


  

VALUES


  

(

15

,
 
36

,
 
'Oscar'

)

;





INSERT
 

  

INTO


  

spark1


  

VALUES


  

(

16

,
 
38

,
 
'Paul'

)

;





INSERT
 

  

INTO


  

spark1


  

VALUES


  

(

17

,
 
21

,
 
'Quincy'

)

;





INSERT
 

  

INTO


  

spark1


  

VALUES


  

(

18

,
 
30

,
 
'Rita'

)

;





INSERT
 

  

INTO


  

spark1


  

VALUES


  

(

19

,
 
25

,
 
'Sam'

)

;





INSERT
 

  

INTO


  

spark1


  

VALUES


  

(

20

,
 
34

,
 
'Tina'

)

;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-数据治理，新建文件治理规则，数据源选择datasource，文件数量>=10，查看圈定表 | 圈定表中有表db1下的表table |
| 2 | 执行治理规则 | 删除成功 |
| 3 | 进入元数据管理，删除数据库db1 | 报错提示正确 |
| 4 | 治理规则执行结束后查看结果 |  |

##### 【P1】验证删除为仅删除数栈内的信息

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 删除数据库db1、db2 | 删除成功 |
| 2 | 连接数据源信息，查看数据库是否存在 | 数据库存在 |

##### 【P0】验证批量删除功能

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-元数据-元数据管理，点击数据源datasource进入详情页，勾选数据库db1、db2、db3，点击删除按钮 | 弹窗二次弹窗 |
| 2 | 输入数据库名db2，点击删除 | 提示：数据库名不正确 |
| 3 | 输入数据库名db1，点击删除 | 删除成功，页面中不存在数据库db1、db2、db3 |

##### 【P0】验证删除数据库按钮交互功能

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-元数据-元数据管理，点击数据源datasource进入详情页，勾选1个或多个数据库，查看删除按钮 | 按钮变为可点状态 |
| 2 | 点击删除按钮 | 弹窗二次确认弹窗 |
| 3 | 查看弹窗展示 | 展示：【删除数据库后，数据库下的数据表信息也会删除，确定删除数据库“xxxx”等xx个数据库吗？】【以数据库维度删除库表操作仅针对资产平台内生效，不会影响底层数据库表信息。】数据库名输入框，删除和取消按钮 |

##### 【P1】验证元数据管理添加删除数据库按钮

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-元数据-元数据管理，点击数据源datasource进入详情页，查看页面是否有删除按钮 | 存在删除按钮，按钮置灰 |
