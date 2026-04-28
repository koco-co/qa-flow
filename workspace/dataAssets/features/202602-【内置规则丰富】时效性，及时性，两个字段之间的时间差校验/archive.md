---
suite_name: "【内置规则丰富】时效性，及时性，两个字段之间的时间差校验"
description: "【内置规则丰富】时效性，及时性，两个字段之间的时间差校验用例归档"
tags:
  - "正确"
  - "类型"
  - "时效性"
  - "监控规则"
  - "内置规则"
  - "校验功能"
  - "时效性校验"
  - "任务不通过"
  - "字段类型异常"
  - "校验通过功能"
  - "区域详情正确"
  - "校验不通过功能"
  - "多个对比字段组"
  - "一个对比字段组"
  - "多字段时间差校验"
prd_version: "v6.4.8"
dev_version:
  - "岚图汽车"
create_at: "2026-04-05"
status: "草稿"
origin: "csv"
case_count: 13
case_id: 10182
---

## 监控规则

### 时效性校验

##### 【P1】验证「多字段时间差校验」任务质量报告正确

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
)
COMMENT '时效性校验表';
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「id」 「统计函数」选择「及时性校验（多字段时间差校验）」 「过滤条件」设置为「id<100」 「选择对比字段组」为「order_date1；order_date2」 「时间差」选择为「<=1秒」 「大小关系」配置为「order_date1>order_date2」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看质量报告 | 页面包含： 1）报告进入目录 2）质量评估汇总（任务名）区域，（数据源、数据库、检测数据范围、表行数、抽样行数、字段数、校验规则数、校验通过率） 3）规则校验明细，（规则类型-时效性校验、规则名称、字段名称、字段类型、质验结果、未通过原因、详情说明-鼠标悬浮展示全部、操作） |

##### 【P1】验证「多字段时间差校验」任务不通过/失败结果详情正确

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
)
COMMENT '时效性校验表';
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「id」 「统计函数」选择「及时性校验（多字段时间差校验）」 「过滤条件」设置为「id<100」 「选择对比字段组」为「order_date1；order_date2」 「时间差」选择为「<=1秒」 「大小关系」配置为「order_date1>order_date2」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则 | 实例运行结果符合预期 |
| 6 | 查看不通过的实例详情 | 抽屉式展开详情，页面包含： 任务名称、监控报告tab、表级报告tab |
| 7 | 点击【监控报告】tab | 1）都展示「时效性校验」-「多字段时间差校验」配置的详情； 2）校验未通过的规则支持查看明细 |
| 8 | 点击查看明细 | 1）标题显示为“查看“及时性校验-多字段时间差校验”明细” 2）记录不符合时间差内的数据，列表为全部列数据，配置的校验字段标红展示 |
| 9 | 点击【下载明细】按钮 | 支持下载明细，内容正确 |
| 10 | 点击【表级报告】tab | 包含： 1）数据表信息汇总（表名、总分区数量、数据源、数据源类型、数据库），空白时显示“--”； 2）表级统计（记录数、报警数），空白时显示“--”； 3）最近30次综合报告（记录数平均波动率、平均记录数、日平均告警数、平均告警数）； 4）最近30次表级统计； 5）最近30次表数据波动图 |
| 11 | 查看运行失败的示例详情 | 1）展示「时效性校验」-「多字段时间差校验」配置的详情； 2）运行失败的规则支持查看日志 |

##### 【P1】验证「多字段时间差校验」任务通过结果详情正确

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
)
COMMENT '时效性校验表';
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「id」 「统计函数」选择「及时性校验（多字段时间差校验）」 「过滤条件」设置为「id<100」 「选择对比字段组」为「order_date1；order_date2」 「时间差」选择为「<=1秒」 「大小关系」配置为「order_date1>order_date2」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则 | 实例运行结果符合预期 |
| 6 | 查看实例详情 | 抽屉式展开详情，页面包含： 任务名称、监控报告tab、表级报告tab |
| 7 | 点击【监控报告】tab | 包含「时效性校验」-「多字段时间差校验」配置的详情 |
| 8 | 点击【表级报告】tab | 包含 1）数据表信息汇总（表名、总分区数量、数据源、数据源类型、数据库），空白时显示“--”； 2）表级统计（记录数、报警数），空白时显示“--”； 3）最近30次综合报告（记录数平均波动率、平均记录数、日平均告警数、平均告警数）； 4）最近30次表级统计； 5）最近30次表数据波动图 |

##### 【P2】验证「多字段时间差校验」字段组限制个数正确

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
)
COMMENT '时效性校验表';
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 点击【添加规则】按钮，选择「时效性校验」规则 | 选择成功，页面显示「时效性校验」规则配置区域 |
| 4 | 配置10个「对比字段组」 | 配置成功 |
| 5 | 配置11个「对比字段组」 | 提示最多配置10个对比字段组 |

##### 【P2】验证「多字段时间差校验」区域配置交互正确

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
)
COMMENT '时效性校验表';
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 点击【添加规则】按钮，选择「时效性校验」规则 | 选择成功，页面显示「时效性校验」规则配置区域 |
| 4 | 查看「字段」 | 仅支持单选 |
| 5 | 查看「选择对比字段组」 | 仅支持选择两个字段，不可单选和三个以上 |
| 6 | 在「时间差」配置「>/</>=/<=/=/!= xx 毫秒/秒/分钟/小时/天」中的xx输入正小数、负整数、负小数、零、正整数 | 仅支持输入正整数 |

## 内置规则

### 时效性

#### 多字段时间差校验

##### 【P1】验证「字段类型异常」校验功能

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';
INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
-- 第一行数据
(
'2026-02-04',                     -- DATE 类型
'2026-02-04 09:30:15',            -- DATETIME 类型
'08:00:00',                       -- TIME 类型
'2026-02-04 09:30:15',            -- TIMESTAMP 类型
'2026-02-04',                     -- 字符串日期
'2026-02-04 09:30:15',            -- 字符串日期时间
'08:00:00',                       -- 字符串时间
'2026-02-04 09:30:15.123',        -- 带毫秒的字符串
'20260204',                       -- 非标准字符串
1,                                -- INT 类型
'张三',                           -- VARCHAR/STRING 类型
25,                               -- TINYINT 类型
13800138000,                      -- BIGINT 类型
'zhangsan@example.com',           -- STRING 类型
8500.50,                          -- DECIMAL 类型
TRUE,                             -- BOOLEAN 类型
'北京市朝阳区XX路88号',           -- STRING 类型
95.5,                             -- FLOAT 类型
125000.75                         -- DOUBLE 类型
),
-- 第二行数据
(
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30',
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30.456',
'20260205',
2,
'李四',
30,
13900139000,
'lisi@example.com',
9800.00,
FALSE,
'上海市浦东新区XX街66号',
88.8,
189000.99
),
-- 第三行数据
(
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20',
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20.789',
'20260206',
3,
'王五',
28,
13700137000,
'wangwu@example.com',
7999.99,
TRUE,
'广州市天河区XX大道99号',
92.0,
98500.50
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下：（6个字段组分别为int/varchar/string/decimal/boolean/double类型） 「监控规则」新增「时效性校验」 「字段」选择为「id」 「统计函数」选择「及时性校验（多字段时间差校验）」 「过滤条件」设置为「id<100」 1）「选择对比字段组1」为「id1；id2」。「时间差」选择为「<1天」。「大小关系」配置为「id1<id2」 2）「选择对比字段组2」为「user_name1；user_name2」。「时间差」选择为「>=1秒」。「大小关系」配置为「user_name1<user_name2」 3）「选择对比字段组3」为「address1；address2」。「时间差」选择为「>=1秒」。「大小关系」配置为「address1<address2」 4）「选择对比字段组4」为「salary1；salary2」。「时间差」选择为「>=1秒」。「大小关系」配置为「salary1<salary2」 5）「选择对比字段组4」为「is_active1；is_active2」。「时间差」选择为「>=1秒」。「大小关系」配置为「is_active1<is_active2」 6）「选择对比字段组4」为「total_amount1；total_amount2」。「时间差」选择为「>=1秒」。「大小关系」配置为「total_amount1<total_amount2」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 仅支持配置时间日期型、string字段，监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 立即执行规则 | 运行失败，日志显示正确失败详情 |

##### 【P1】验证「string转long」校验不通过功能

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';
INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
-- 第一行数据
(
'2026-02-04',                     -- DATE 类型
'2026-02-04 09:30:15',            -- DATETIME 类型
'08:00:00',                       -- TIME 类型
'2026-02-04 09:30:15',            -- TIMESTAMP 类型
'2026-02-04',                     -- 字符串日期
'2026-02-04 09:30:15',            -- 字符串日期时间
'08:00:00',                       -- 字符串时间
'2026-02-04 09:30:15.123',        -- 带毫秒的字符串
'20260204',                       -- 非标准字符串
1,                                -- INT 类型
'张三',                           -- VARCHAR/STRING 类型
25,                               -- TINYINT 类型
13800138000,                      -- BIGINT 类型
'zhangsan@example.com',           -- STRING 类型
8500.50,                          -- DECIMAL 类型
TRUE,                             -- BOOLEAN 类型
'北京市朝阳区XX路88号',           -- STRING 类型
95.5,                             -- FLOAT 类型
125000.75                         -- DOUBLE 类型
),
-- 第二行数据
(
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30',
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30.456',
'20260205',
2,
'李四',
30,
13900139000,
'lisi@example.com',
9800.00,
FALSE,
'上海市浦东新区XX街66号',
88.8,
189000.99
),
-- 第三行数据
(
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20',
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20.789',
'20260206',
3,
'王五',
28,
13700137000,
'wangwu@example.com',
7999.99,
TRUE,
'广州市天河区XX大道99号',
92.0,
98500.50
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「id」 「统计函数」选择「及时性校验（多字段时间差校验）」 「过滤条件」设置为「id<100」 「选择对比字段组」为「date_str_ymd_hms_ms1；date_str_ymd_hms_ms2」。「时间差」选择为「<1天」。「大小关系」配置为「date_str_ymd_hms_ms1<date_str_ymd_hms_ms2」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果不通过，且实例详情展示正确，质量报告展示正确 |

##### 【P0】验证「string转long」校验通过功能

> 前置条件

```
已存在spark表A

CREATE TABLE IF NOT EXISTS
tableA (
create_date DATE COMMENT '日期类型',
update_datetime TIMESTAMP COMMENT '日期时间类型（替代原DATETIME）',
work_time STRING COMMENT '时间类型（Spark无TIME类型，用STRING存储HH:mm:ss）',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转TIMESTAMP',
date_str_mdy STRING COMMENT '字符串时间(HH:mm:ss)，强转STRING（Spark无TIME类型）',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name STRING COMMENT '用户名（Spark中VARCHAR等价于STRING）',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';

INSERT INTO tableA (
 create_date,
 update_datetime,
 work_time,
 sync_timestamp,
 date_str_ymd,
 date_str_ymd_hms,
 date_str_mdy,
 date_str_ymd_hms_ms,
 date_str_irregular,
 id,
 user_name,
 age,
 phone,
 email,
 salary,
 is_active,
 address,
 score,
 total_amount
)
VALUES
 (
 DATE '2026-02-26',
 TIMESTAMP '2026-02-26 09:45:17',
 '08:30:00',
 CURRENT_TIMESTAMP(),
 '2026-02-26',
 '2026-02-26 09:45:17',
 '18:20:30',
 '2026-02-26 09:45:17.123',
 '20260226',
 1,
 'zhangsan',
 25,
 13800138000,
 'zhangsan@example.com',
 15000.50,
 TRUE,
 '北京市海淀区中关村',
 95.5,
 123456.789
 ),
 (
 DATE '2026-01-01',
 TIMESTAMP '2026-12-31 23:59:59',
 '23:59:59',
 TIMESTAMP '2026-02-26 12:00:00',
 '2026-01-01',
 '2026-12-31 23:59:59',
 '00:00:00',
 '2026-02-26 12:34:56.789',
 '20260101',
 2,
 'lisi',
 30,
 13900139000,
 'lisi@example.com',
 20000.00,
 FALSE,
 '上海市浦东新区陆家嘴',
 88.8,
 987654.321
 ),
 (
 DATE '1970-01-01',
 TIMESTAMP '1970-01-01 00:00:00',
 '',
 NULL,
 '',
 '',
 '',
 '',
 '20260204',
 3,
 '',
 0,
 0,
 '',
 0.00,
 NULL,
 '',
 0.0,
 0.0
 );
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「id」 「统计函数」选择「及时性校验（多字段时间差校验）」 「过滤条件」设置为「id<100」 「选择对比字段组」为「date_str_ymd_hms1；date_str_ymd_hms2」。「时间差」选择为「>=1天」。「大小关系」配置为「date_str_ymd_hms1<date_str_ymd_hms2」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果通过，且实例详情展示正确，质量报告展示正确 |

##### 【P0】验证「date/datetime/time/timestamp类型」校验不通过功能

> 前置条件

```
已存在spark表A

CREATE TABLE IF NOT EXISTS
tableA (
create_date DATE COMMENT '日期类型',
update_datetime TIMESTAMP COMMENT '日期时间类型（替代原DATETIME）',
work_time STRING COMMENT '时间类型（Spark无TIME类型，用STRING存储HH:mm:ss）',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转TIMESTAMP',
date_str_mdy STRING COMMENT '字符串时间(HH:mm:ss)，强转STRING（Spark无TIME类型）',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name STRING COMMENT '用户名（Spark中VARCHAR等价于STRING）',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';

INSERT INTO tableA (
    create_date,
    update_datetime,
    work_time,
    sync_timestamp,
    date_str_ymd,
    date_str_ymd_hms,
    date_str_mdy,
    date_str_ymd_hms_ms,
    date_str_irregular,
    id,
    user_name,
    age,
    phone,
    email,
    salary,
    is_active,
    address,
    score,
    total_amount
)
VALUES
    (
        DATE '2026-02-26',
        TIMESTAMP '2026-02-26 09:45:17',
        '08:30:00',
        CURRENT_TIMESTAMP(),
        '2026-02-26',
        '2026-02-26 09:45:17',
        '18:20:30',
        '2026-02-26 09:45:17.123',
        '20260226',
        1,
        'zhangsan',
        25,
        13800138000,
        'zhangsan@example.com',
        15000.50,
        TRUE,
        '北京市海淀区中关村',
        95.5,
        123456.789
    ),
    (
        DATE '2026-01-01',
        TIMESTAMP '2026-12-31 23:59:59',
        '23:59:59',
        TIMESTAMP '2026-02-26 12:00:00',
        '2026-01-01',
        '2026-12-31 23:59:59',
        '00:00:00',
        '2026-02-26 12:34:56.789',
        '20260101',
        2,
        'lisi',
        30,
        13900139000,
        'lisi@example.com',
        20000.00,
        FALSE,
        '上海市浦东新区陆家嘴',
        88.8,
        987654.321
    ),
    (
        DATE '1970-01-01',
        TIMESTAMP '1970-01-01 00:00:00',
        '',
        NULL,
        '',
        '',
        '',
        '',
        '20260204',
        3,
        '',
        0,
        0,
        '',
        0.00,
        NULL,
        '',
        0.0,
        0.0
    );
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下：（4个字段组不全通过） 「监控规则」新增「时效性校验」 「字段」选择为「id」 「统计函数」选择「及时性校验（多字段时间差校验）」 「过滤条件」设置为「id<100」 1）「选择对比字段组1」为「create_date 1；create_date 2」。「时间差」选择为「<1天」。「大小关系」配置为「create_date 1<create_date 2」 2）「选择对比字段组2」为「update_datetime 1；update_datetime 2」。「时间差」选择为「>=1秒」。「大小关系」配置为「update_datetime 1<update_datetime 2」 3）「选择对比字段组3」为「work_time 1；work_time 2」。「时间差」选择为「>=1秒」。「大小关系」配置为「work_time 1<work_time 2」 4）「选择对比字段组4」为「sync_timestamp 1；sync_timestamp 2」。「时间差」选择为「>=1秒」。「大小关系」配置为「sync_timestamp 1<sync_timestamp 2」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果为不通过，且实例详情展示正确，质量报告展示正确 |

##### 【P1】验证「date/datetime/time/timestamp类型」校验通过功能

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
)
COMMENT '时效性校验表';
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下：（4个字段组全通过） 「监控规则」新增「时效性校验」 「字段」选择为「id」 「统计函数」选择「及时性校验（多字段时间差校验）」 「过滤条件」设置为「id<100」 1）「选择对比字段组1」为「create_date 1；create_date 2」。「时间差」选择为「>=1天」。「大小关系」配置为「create_date 1<create_date 2」 2）「选择对比字段组2」为「update_datetime 1；update_datetime 2」。「时间差」选择为「>=1秒」。「大小关系」配置为「update_datetime 1<update_datetime 2」 3）「选择对比字段组3」为「work_time 1；work_time 2」。「时间差」选择为「>=1秒」。「大小关系」配置为「work_time 1<work_time 2」 4）「选择对比字段组4」为「sync_timestamp 1；sync_timestamp 2」。「时间差」选择为「>=1秒」。「大小关系」配置为「sync_timestamp 1<sync_timestamp 2」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果为通过，且实例详情展示正确，质量报告展示正确 |

##### 【P0】验证「date类型」校验不通过功能

> 前置条件

```
已存在spark表A

CREATE TABLE IF NOT EXISTS
tableA (
create_date DATE COMMENT '日期类型',
update_datetime TIMESTAMP COMMENT '日期时间类型（替代原DATETIME）',
work_time STRING COMMENT '时间类型（Spark无TIME类型，用STRING存储HH:mm:ss）',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转TIMESTAMP',
date_str_mdy STRING COMMENT '字符串时间(HH:mm:ss)，强转STRING（Spark无TIME类型）',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name STRING COMMENT '用户名（Spark中VARCHAR等价于STRING）',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';

INSERT INTO tableA (
 create_date,
 update_datetime,
 work_time,
 sync_timestamp,
 date_str_ymd,
 date_str_ymd_hms,
 date_str_mdy,
 date_str_ymd_hms_ms,
 date_str_irregular,
 id,
 user_name,
 age,
 phone,
 email,
 salary,
 is_active,
 address,
 score,
 total_amount
)
VALUES
 (
 DATE '2026-02-26',
 TIMESTAMP '2026-02-26 09:45:17',
 '08:30:00',
 CURRENT_TIMESTAMP(),
 '2026-02-26',
 '2026-02-26 09:45:17',
 '18:20:30',
 '2026-02-26 09:45:17.123',
 '20260226',
 1,
 'zhangsan',
 25,
 13800138000,
 'zhangsan@example.com',
 15000.50,
 TRUE,
 '北京市海淀区中关村',
 95.5,
 123456.789
 ),
 (
 DATE '2026-01-01',
 TIMESTAMP '2026-12-31 23:59:59',
 '23:59:59',
 TIMESTAMP '2026-02-26 12:00:00',
 '2026-01-01',
 '2026-12-31 23:59:59',
 '00:00:00',
 '2026-02-26 12:34:56.789',
 '20260101',
 2,
 'lisi',
 30,
 13900139000,
 'lisi@example.com',
 20000.00,
 FALSE,
 '上海市浦东新区陆家嘴',
 88.8,
 987654.321
 ),
 (
 DATE '1970-01-01',
 TIMESTAMP '1970-01-01 00:00:00',
 '',
 NULL,
 '',
 '',
 '',
 '',
 '20260204',
 3,
 '',
 0,
 0,
 '',
 0.00,
 NULL,
 '',
 0.0,
 0.0
 );
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「id」 「统计函数」选择「及时性校验（多字段时间差校验）」 「过滤条件」设置为「id<100」 「选择对比字段组」为「create_date 1；create_date 2」 「时间差」选择为「<1天」 「大小关系」配置为「create_date 1<create_date 2」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |

##### 【P0】验证「date类型」校验通过功能

> 前置条件

```
已存在spark表A

CREATE TABLE IF NOT EXISTS
tableA (
create_date DATE COMMENT '日期类型',
update_datetime TIMESTAMP COMMENT '日期时间类型（替代原DATETIME）',
work_time STRING COMMENT '时间类型（Spark无TIME类型，用STRING存储HH:mm:ss）',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转TIMESTAMP',
date_str_mdy STRING COMMENT '字符串时间(HH:mm:ss)，强转STRING（Spark无TIME类型）',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name STRING COMMENT '用户名（Spark中VARCHAR等价于STRING）',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';

INSERT INTO tableA (
 create_date,
 update_datetime,
 work_time,
 sync_timestamp,
 date_str_ymd,
 date_str_ymd_hms,
 date_str_mdy,
 date_str_ymd_hms_ms,
 date_str_irregular,
 id,
 user_name,
 age,
 phone,
 email,
 salary,
 is_active,
 address,
 score,
 total_amount
)
VALUES
 (
 DATE '2026-02-26',
 TIMESTAMP '2026-02-26 09:45:17',
 '08:30:00',
 CURRENT_TIMESTAMP(),
 '2026-02-26',
 '2026-02-26 09:45:17',
 '18:20:30',
 '2026-02-26 09:45:17.123',
 '20260226',
 1,
 'zhangsan',
 25,
 13800138000,
 'zhangsan@example.com',
 15000.50,
 TRUE,
 '北京市海淀区中关村',
 95.5,
 123456.789
 ),
 (
 DATE '2026-01-01',
 TIMESTAMP '2026-12-31 23:59:59',
 '23:59:59',
 TIMESTAMP '2026-02-26 12:00:00',
 '2026-01-01',
 '2026-12-31 23:59:59',
 '00:00:00',
 '2026-02-26 12:34:56.789',
 '20260101',
 2,
 'lisi',
 30,
 13900139000,
 'lisi@example.com',
 20000.00,
 FALSE,
 '上海市浦东新区陆家嘴',
 88.8,
 987654.321
 ),
 (
 DATE '1970-01-01',
 TIMESTAMP '1970-01-01 00:00:00',
 '',
 NULL,
 '',
 '',
 '',
 '',
 '20260204',
 3,
 '',
 0,
 0,
 '',
 0.00,
 NULL,
 '',
 0.0,
 0.0
 );
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「id」 「统计函数」选择「及时性校验（多字段时间差校验）」 「过滤条件」设置为「id<100」 「选择对比字段组」为「create_date 1；create_date 2」 「时间差」选择为「>=1天」 「大小关系」配置为「create_date 1<create_date 2」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |

## 监控规则

### 时效性校验

##### 【P1】验证「多字段时间差校验」区域详情正确

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';
INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
-- 第一行数据
(
'2026-02-04',                     -- DATE 类型
'2026-02-04 09:30:15',            -- DATETIME 类型
'08:00:00',                       -- TIME 类型
'2026-02-04 09:30:15',            -- TIMESTAMP 类型
'2026-02-04',                     -- 字符串日期
'2026-02-04 09:30:15',            -- 字符串日期时间
'08:00:00',                       -- 字符串时间
'2026-02-04 09:30:15.123',        -- 带毫秒的字符串
'20260204',                       -- 非标准字符串
1,                                -- INT 类型
'张三',                           -- VARCHAR/STRING 类型
25,                               -- TINYINT 类型
13800138000,                      -- BIGINT 类型
'zhangsan@example.com',           -- STRING 类型
8500.50,                          -- DECIMAL 类型
TRUE,                             -- BOOLEAN 类型
'北京市朝阳区XX路88号',           -- STRING 类型
95.5,                             -- FLOAT 类型
125000.75                         -- DOUBLE 类型
),
-- 第二行数据
(
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30',
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30.456',
'20260205',
2,
'李四',
30,
13900139000,
'lisi@example.com',
9800.00,
FALSE,
'上海市浦东新区XX街66号',
88.8,
189000.99
),
-- 第三行数据
(
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20',
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20.789',
'20260206',
3,
'王五',
28,
13700137000,
'wangwu@example.com',
7999.99,
TRUE,
'广州市天河区XX大道99号',
92.0,
98500.50
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 点击【添加规则】按钮，选择「时效性校验」规则 | 选择成功，页面显示「时效性校验」规则配置区域 |
| 4 | 查看配置区域详情 | 包含： 1）「字段」，可选择对应数据表下的所有字段 2）「统计函数」，可选择「及时性校验（多字段时间差校验）」 3）「过滤条件」，可选择「选项配置」、「手动配置」 4）「选择对比字段组」，选择对应数据表下的所有字段，可配置多个对比字段组 5）「时间差」，可配置「>/</>=/<=/=/!= xx 毫秒/秒/分钟/小时/天」 6）「大小关系」，可配置字段1 >/< 字段2 7）可对「对比字段组」进行新增删除操作 8）「强弱规则」，可选择「强/弱规则」 9）「规则描述」，可输入内容 10）「保存」和「取消」按钮 |
