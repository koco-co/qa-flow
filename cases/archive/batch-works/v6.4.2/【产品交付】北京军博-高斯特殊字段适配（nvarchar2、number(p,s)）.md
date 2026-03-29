---
name: "【产品交付】北京军博-高斯特殊字段适配（nvarchar2、number(p,s)） v6.4.2"
description: "【产品交付】北京军博-高斯特殊字段适配（nvarchar2、number(p,s)） v6.4.2"
tags:
  - 离线开发
  - gaussdb特殊字段适配
  - 产品交付
  - 北京军博
  - 高斯特殊字段适配
module: batch-works
version: v6.4.2
source: "zentao-cases/dtstack-platform/离线开发/archive-cases/v6.4.2/【产品交付】北京军博-高斯特殊字段适配（nvarchar2、number(p,s)）.csv"
case_count: 4
created_at: 2026-03-29
origin: csv
---
# 【产品交付】北京军博-高斯特殊字段适配（nvarchar2、number(p,s)） v6.4.2
> 来源：zentao-cases/dtstack-platform/离线开发/archive-cases/v6.4.2/【产品交付】北京军博-高斯特殊字段适配（nvarchar2、number(p,s)）.csv
> 用例数：4

---

## gaussdb特殊字段适配

##### 验证手动任务-pg2pg，字段映射功能 「P2」

> 前置条件
```
1、源端pg数据源，底层创建表source，source下有字段：
CREATE TABLE source (
id NUMBER(10) PRIMARY KEY,
number_int NUMBER(10,0),           -- 整数类型
number_decimal NUMBER(10,4),       -- 小数类型
number_large_precision NUMBER(20,8), -- 大精度小数
number_small_scale NUMBER(5,2),    -- 小范围数值
nvarchar2_field NVARCHAR2(100),    -- 常规长度
nvarchar2_short NVARCHAR2(10),     -- 短文本
nvarchar2_long NVARCHAR2(500)     -- 长文本
）

插入数据：
INSERT INTO source (
id,
number_int,
number_decimal,
number_large_precision,
number_small_scale,
nvarchar2_field,
nvarchar2_short,
nvarchar2_long
) VALUES
(
1,
1234567890,                    -- 最大10位整数
123456.7890,                   -- 10位数字，4位小数
123456789012.12345678,         -- 20位精度，8位小数
999.99,                        -- 边界值：最大正数
N'测试NVARCHAR2中文字符',       -- 中文字符测试
N'ShortText',                  -- 刚好10字符
N'这是一个很长的NVARCHAR2字段测试字符串，包含各种字符：ABCabc123!@#$%^&*()_+-=[]{}|;:,.<>?/，用于测试长文本字段的兼容性和数据处理能力。' -- 长文本测试
),
(
2,
-987654321,                    -- 负整数
-123.4567,                     -- 负小数
-987654321.87654321,           -- 负大精度小数
-99.99,                        -- 边界值：最小负数
N'Unicode测试
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-数据开发-新建手动任务，source端选择pg数据源，source表，点击下一步 | 进入目标端配置页面 |
| 2 | 目标端选择pg数据源，选择pg表sink1，点击下一步，进入字段映射页面，查看展示 | 源端和目标端的字段及字段类型展示与各自的建表语句一致 |
| 3 | 同名映射，保存后运行，查看结果 | 运行报错（底层建的表没有转化） |
| 4 | 目标端选择pg数据源，选择pg表sink2，点击下一步，查看展示 | 源端和目标端的字段及字段类型展示与各自的建表语句一致 |
| 5 | 同名映射，保存后运行，查看结果 | 运行成功，sink表数据写入正常，功能行为符合预期，无报错或异常 |
| 6 | 保存后提交，运行手动任务，查看结果 | 运行成功，sink表数据写入正常，功能行为符合预期，无报错或异常 |

##### 验证周期任务-pg2pg，字段映射功能 「P2」

> 前置条件
```
1、源端pg数据源，底层创建表source，source下有字段：
CREATE TABLE source (
id NUMBER(10) PRIMARY KEY,
number_int NUMBER(10,0),           -- 整数类型
number_decimal NUMBER(10,4),       -- 小数类型
number_large_precision NUMBER(20,8), -- 大精度小数
number_small_scale NUMBER(5,2),    -- 小范围数值
nvarchar2_field NVARCHAR2(100),    -- 常规长度
nvarchar2_short NVARCHAR2(10),     -- 短文本
nvarchar2_long NVARCHAR2(500)     -- 长文本
）

插入数据：
INSERT INTO source (
id,
number_int,
number_decimal,
number_large_precision,
number_small_scale,
nvarchar2_field,
nvarchar2_short,
nvarchar2_long
) VALUES
(
1,
1234567890,                    -- 最大10位整数
123456.7890,                   -- 10位数字，4位小数
123456789012.12345678,         -- 20位精度，8位小数
999.99,                        -- 边界值：最大正数
N'测试NVARCHAR2中文字符',       -- 中文字符测试
N'ShortText',                  -- 刚好10字符
N'这是一个很长的NVARCHAR2字段测试字符串，包含各种字符：ABCabc123!@#$%^&*()_+-=[]{}|;:,.<>?/，用于测试长文本字段的兼容性和数据处理能力。' -- 长文本测试
),
(
2,
-987654321,                    -- 负整数
-123.4567,                     -- 负小数
-987654321.87654321,           -- 负大精度小数
-99.99,                        -- 边界值：最小负数
N'Unicode测试
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-数据开发-新建手动任务，source端选择pg数据源，source表，点击下一步 | 进入目标端配置页面 |
| 2 | 目标端选择pg数据源，选择pg表sink1，点击下一步，进入字段映射页面，查看展示 | 源端和目标端的字段及字段类型展示与各自的建表语句一致 |
| 3 | 同名映射，保存后运行，查看结果 | 运行报错（底层建的表没有转化） |
| 4 | 目标端选择pg数据源，选择pg表sink2，点击下一步，查看展示 | 源端和目标端的字段及字段类型展示与各自的建表语句一致 |
| 5 | 同名映射，保存后运行，查看结果 | 运行成功，sink表数据写入正常，功能行为符合预期，无报错或异常 |

##### 验证手动任务-pg2pg，一键生成目标表功能 「P2」

> 前置条件
```
1、源端pg数据源，底层创建表source，source下有字段：
CREATE TABLE source (
id NUMBER(10) PRIMARY KEY,
number_int NUMBER(10,0),           -- 整数类型
number_decimal NUMBER(10,4),       -- 小数类型
number_large_precision NUMBER(20,8), -- 大精度小数
number_small_scale NUMBER(5,2),    -- 小范围数值
nvarchar2_field NVARCHAR2(100),    -- 常规长度
nvarchar2_short NVARCHAR2(10),     -- 短文本
nvarchar2_long NVARCHAR2(500)     -- 长文本
）

2、同步表到离线项目
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-数据开发-新建手动任务，source端选择pg数据源，source表，点击下一步 | 进入目标端配置页面 |
| 2 | 目标端选择pg数据源，点击一键生成目标表，查看建表sql | CREATE TABLE source ( id numeric(10) PRIMARY KEY, number_int numeric(10,0), -- 整数类型 number_decimal numeric(10,4), -- 小数类型 number_large_precision numeric(20,8), -- 大精度小数 number_small_scale numeric(5,2), -- 小范围数值 nvarchar2_field varchar(100), -- 常规长度 nvarchar2_short varchar(10), -- 短文本 nvarchar2_long varchar(500) -- 长文本） |
| 3 | 点击下一步，进入字段映射页面，查看展示 | 源端和目标端的字段及字段类型展示与各自的建表语句一致 |
| 4 | 同名映射，保存后运行，查看结果 | 运行成功，sink表数据写入正常，功能行为符合预期，无报错或异常 |
| 5 | 保存后提交，运行手动任务，查看结果 | 运行成功，sink表数据写入正常，功能行为符合预期，无报错或异常 |

##### 验证周期任务-pg2pg，一键生成目标表功能 「P1」

> 前置条件
```
1、源端pg数据源，底层创建表source，source下有字段：
CREATE TABLE source (
    id NUMBER(10) PRIMARY KEY,
    number_int NUMBER(10,0),           -- 整数类型
    number_decimal NUMBER(10,4),       -- 小数类型
    number_large_precision NUMBER(20,8), -- 大精度小数
    number_small_scale NUMBER(5,2),    -- 小范围数值
    nvarchar2_field NVARCHAR2(100),    -- 常规长度
    nvarchar2_short NVARCHAR2(10),     -- 短文本
    nvarchar2_long NVARCHAR2(500)     -- 长文本
）

2、同步表到离线项目
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-数据开发-新建周期任务，source端选择pg数据源，source表，点击下一步 | 进入目标端配置页面 |
| 2 | 目标端选择pg数据源，点击一键生成目标表，查看建表sql | CREATE TABLE source ( |
| 3 | 点击下一步，进入字段映射页面，查看展示 | id numeric(10) PRIMARY KEY, |
| 4 | 同名映射，保存后运行，查看结果 | number_int numeric(10,0),           -- 整数类型 |
| 5 | 保存后提交，查看周期运行结果 | number_decimal numeric(10,4),       -- 小数类型 |
| 6 | 补数据查看结果 | number_large_precision numeric(20,8), -- 大精度小数 |
| 7 |  | number_small_scale numeric(5,2),    -- 小范围数值 |
| 8 |  | nvarchar2_field varchar(100),    -- 常规长度 |
| 9 |  | nvarchar2_short  varchar(10),     -- 短文本 |
| 10 |  | nvarchar2_long  varchar(500)     -- 长文本 |
| 11 |  | ） |
| 12 |  | 源端和目标端的字段及字段类型展示与各自的建表语句一致 |
| 13 |  | 运行成功，sink表数据写入正常，功能行为符合预期，无报错或异常 |
| 14 |  | 运行成功，sink表数据写入正常，功能行为符合预期，无报错或异常 |
| 15 |  | 运行成功，sink表数据写入正常，功能行为符合预期，无报错或异常 |

