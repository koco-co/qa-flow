---
name: 【BG交付】数据同步向导模式支持kafka v6.4.0
description: 【BG交付】数据同步向导模式支持kafka v6.4.0
tags:
  - 离线开发
  - 数据同步向导模式支持kafka
  - BG交付
module: batch-works
version: v6.4.0
source: zentao-cases/dtstack-platform/离线开发/archive-cases/v6.4.0/【BG交付】数据同步向导模式支持kafka.csv
case_count: 83
created_at: 2026-03-29
origin: csv
---
# 【BG交付】数据同步向导模式支持kafka v6.4.0
> 来源：zentao-cases/dtstack-platform/离线开发/archive-cases/v6.4.0/【BG交付】数据同步向导模式支持kafka.csv
> 用例数：83

---

## 数据同步向导模式支持kafka

##### 验证写入到kafka字段映射STRING → TIMESTAMP运行是否正常 「P2」

> 前置条件
```
1、已存在kafka数据源：kafka。存在topic：test。
2、已存在hive表：
CREATE TABLE IF NOT EXISTS all_data_types_table(
txt string,
);
值：
“2023/01/01“
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-手动任务-新建数据同步任务：hive2kafka，选择hive数据源，数据表all_data_types_table，点击下一步 | 进入选择目标页面 |
| 2 | 数据源：kafka，Topic：test，读取类型：json， | 1）进入字段映射页面2）右侧框字段为空，左侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | kafka新增字段txt timestamp类型，与hive的txt字段映射 | 映射成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 4 | hive表插入前置中的第一条数据，临时运行数据同步任务，查看结果 | 运行失败 |
| 5 | 删除hive表中的数据，插入txt：“2024-01-01“，重新运行任务 | 运行失败 |

##### 验证kafka2hive字段映射STRING → TIMESTAMP运行是否正常 「P2」

> 前置条件
```
1、已存在kafka数据源：kafka。
消息：
{“txt“:“2023-01-01 12:00:00“}
{“txt“:“1672574400“}
2、已存在hive表：
CREATE TABLE IF NOT EXISTS all_data_types_table(
txt timestamp,
);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-手动任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 成功进入离线开发-手动任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步页面，页面内容正常加载显示，无报错 |
| 2 | 数据源kafka新增topic，然后写入消息前置中的消息 | 写入成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入离线开发-项目A-数据开发-手动任务-新建数据同步任务：kafka2hive，数据源：kafka，Topic：test，读取类型：json，开始时间：earliest结束时间：time，选择当前时间点击下一步 | 进入选择目标页面 |
| 4 | 选择hive数据源，数据表all_data_types_table，写入模式：覆盖，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 5 | kafka新增字段txt string类型，映射到hive的timestamp字段 | 映射成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 6 | 临时运行，查看结果 | 运行成功，hive表插入两条数据，数据为：1672574400000、1672574400000 |

##### 验证写入到kafka字段映射int-->bool运行是否正常 「P2」

> 前置条件
```
1、已存在kafka数据源：kafka。存在topic：test。
有消息：
2、已存在hive表：
CREATE TABLE IF NOT EXISTS all_data_types_table(
txt int,
);
值：
(1)
(0)
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-手动任务-新建数据同步任务：hive2kafka，选择hive数据源，数据表all_data_types_table，点击下一步 | 进入选择目标页面 |
| 2 | 数据源：kafka，Topic：test，读取类型：json， | 1）进入字段映射页面2）右侧框字段为空，左侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | kafka新增字段txt boolean类型，与hive的txt字段映射 | 映射成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 4 | hive表插入前置中的第一条数据，临时运行数据同步任务，查看结果 | 运行成功，kafka写入一条消息，txt：0，txt：1(或者展示false true) |

##### 验证kafka2hive字段映射string-->bool运行是否正常 「P2」

> 前置条件
```
1、已存在kafka数据源：kafka。
消息：
{“txt“:“true“}
{“txt“:“TRUE“}
{“txt“:“1“}
{“txt“:“0“}
2、已存在hive表：
CREATE TABLE IF NOT EXISTS all_data_types_table(
txt BOOLEAN,
);
（3.141592653589793）
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-手动任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 成功进入离线开发-手动任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步页面，页面内容正常加载显示，无报错 |
| 2 | 数据源kafka新增topic，然后写入消息前置中的消息 | 写入成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入离线开发-项目A-数据开发-手动任务-新建数据同步任务：kafka2hive，数据源：kafka，Topic：test，读取类型：json，开始时间：earliest结束时间：time，选择当前时间点击下一步 | 进入选择目标页面 |
| 4 | 选择hive数据源，数据表all_data_types_table，写入模式：覆盖，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 5 | kafka新增字段txt string类型，映射到hive的txt字段 | 映射成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 6 | 临时运行，查看结果 | 运行成功，hive表插入四条数据，值依次为 |
| 7 | kafka写入数据{“txt“:“yes“}，然后修改数据同步任务，开始时间修改为结束时间，结束时间为当前时间，保存后重新运行，查看结果 | 运行报错 |

##### 验证kafka2hive字段映射float-->double运行是否正常 「P2」

> 前置条件
```
1、已存在kafka数据源：kafka。
2、已存在hive表：
CREATE TABLE IF NOT EXISTS all_data_types_table(
txt double,
);
（3.141592653589793）
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-手动任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 成功进入离线开发-手动任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步页面，页面内容正常加载显示，无报错 |
| 2 | 数据源kafka新增topic，然后写入消息：{“txt“:3.1415927} | 写入成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入离线开发-项目A-数据开发-手动任务-新建数据同步任务：kafka2hive，数据源：kafka，Topic：test，读取类型：json，开始时间：earliest结束时间：time：选择当前时间点击下一步 | 进入选择目标页面 |
| 4 | 选择hive数据源，数据表all_data_types_table，写入模式：覆盖，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 5 | kafka新增字段txt float类型，映射到hive的txt字段 | 映射成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 6 | 临时运行，查看结果 | 运行成功，hive表插入一条数据，txt：3.1415927410125732 |

##### 验证写入到kafka字段映射double-->float运行是否正常 「P2」

> 前置条件
```
1、已存在kafka数据源：kafka。存在topic：test。
有消息：
2、已存在hive表：
CREATE TABLE IF NOT EXISTS all_data_types_table(
txt double,
);
（3.141592653589793）
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-手动任务-新建数据同步任务：hive2kafka，选择hive数据源，数据表all_data_types_table，点击下一步 | 进入选择目标页面 |
| 2 | 数据源：kafka，Topic：test，读取类型：json， | 1）进入字段映射页面2）右侧框字段为空，左侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | kafka新增字段txt float类型，与hive的txt字段映射 | 映射成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 4 | hive表插入前置中的第一条数据，临时运行数据同步任务，查看结果 | 运行成功，kafka写入一条消息，txt：3.1415927 |

##### 验证字段映射double--int运行是否正常 「P3」

> 前置条件
```
3.14  -->   3

1、已存在kafka数据源：kafka。存在topic：test。
有消息：

{txt:“3.14“} 可能报错

2、已存在hive表：
CREATE TABLE IF NOT EXISTS all_data_types_table(
column1  int，
column2 double
);

insert into all_data_types_table (1，3.14);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-手动任务-新建数据同步任务：kafka2hive，数据源：kafka，Topic：test，读取类型：json，开始时间：earliest结束时间：time选择当前时间点击下一步 | 进入选择目标页面 |
| 2 | 选择hive数据源，数据表all_data_types_table，写入模式：覆盖，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | kafka新增字段column1 double类型，映射到hive的column1 int字段 | 映射成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 4 | 保存后，临时运行，查看结果 | 运行成功，hive插入一条数据，id=3 |
| 5 | 切换source和sink，然后新增kafka字段column2 int，hive的column2 double字段映射到kafka的column2字段 | 映射成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 6 | 保存后，临时运行，查看结果 | 运行成功，kafka新写入一条消息，	{column2:3}，（也可能是报错，具体试一下） |

##### 验证写入到kafka字段映射string-->int运行是否正常 「P2」

> 前置条件
```
1、已存在kafka数据源：kafka。存在topic：test。
有消息：

2、已存在hive表：
CREATE TABLE IF NOT EXISTS all_data_types_table(
id INT COMMENT '整型ID',
txt string
);

{1,“123“}
{2,“-42“}
{3,“0123“}
{4,““}
{5,“1.23“}
{6,“123abc“}
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-手动任务-新建数据同步任务：hive2kafka，选择hive数据源，数据表all_data_types_table，点击下一步 | 进入选择目标页面 |
| 2 | 数据源：kafka，Topic：test，读取类型：json， | 1）进入字段映射页面2）右侧框字段为空，左侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | kafka新增字段txt int类型，与hive的txt字段映射 | 映射成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 4 | hive表插入前置中的第一条数据，临时运行，查看结果 | 运行成功，kafka新增一条消息，txt=123 |
| 5 | hive表删除上一条数据，插入下一条数据，然后临时运行，查看结果 | 运行成功，kafka新增一条消息，txt=-42 |
| 6 | 重复上一步骤 | 运行成功，hive表插入一条数据，id=123 |
| 7 | 重复上一步骤 | 运行成功，hive表插入一条数据，id=0或者NULL |
| 8 | 重复上一步骤 | 运行失败 |
| 9 | 重复上一步骤 | 运行失败 |

##### 验证kafka2hive字段映射string-->int运行是否正常 「P2」

> 前置条件
```
1、已存在kafka数据源：kafka。存在topic：test。
有消息：

{str:“123“}
{str:“-42“}
{str:“0123“}
{str:““}
{str:“1.23“}
{str:“123abc“}

2、已存在hive表：
CREATE TABLE IF NOT EXISTS all_data_types_table(
id INT COMMENT '整型ID',
is_active BOOLEAN COMMENT '布尔类型',
-- population LONG COMMENT '长整型',
temperature FLOAT COMMENT '单精度浮点',
-- description TEXT COMMENT '文本类型',
birth_date DATE COMMENT '日期类型',
created_at TIMESTAMP COMMENT '时间戳类型',
price DOUBLE COMMENT '双精度浮点',
name STRING COMMENT '字符串类型'
);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-手动任务-新建数据同步任务：kafka2hive，数据源：kafka，Topic：test，读取类型：json，开始时间：specific,偏移量填写：topic:test,partition:0,offset:0结束时间：specific，偏移量填写：topic:test,partition:0,offset:1点击下一步 | 进入选择目标页面 |
| 2 | 选择hive数据源，数据表all_data_types_table，写入模式：覆盖，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | kafka新增字段str string类型，映射到hive的id字段 | 映射成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 4 | 临时运行，查看结果 | 运行成功，hive表插入一条数据，id=123 |
| 5 | beginOffset和endOffset的偏移量，offset都+1，然后再次运行，查看结果 | 运行成功，hive表插入一条数据，id=-42 |
| 6 | 重复上一步骤 | 运行成功，hive表插入一条数据，id=123 |
| 7 | 重复上一步骤 | 运行成功，hive表插入一条数据，id=0或者NULL |
| 8 | 重复上一步骤 | 运行失败 |
| 9 | 重复上一步骤 | 运行失败 |

##### 验证kafka作为source添加不存在的字段/字段类型与消息不匹配，临时运行功能 「P1」

> 前置条件
```
1、已存在kafka数据源：kafka。存在topic：test。
有消息：
8.16 12:00插入：
{“id“: 101, “is_active“: true, “temperature“: 36.6, “price“: 299.99,“name“: “张三“,
“birth_date“:“1990-05-15“,“created_at“: “2023-08-01 14:30:45.123“}
8.16 13:00插入：
{“id“: 102,“is_active“: false,“temperature“: 22.5,
“price“: 159.50,“name“: “李四“,“birth_date“: “1988-11-22“,“created_at“: “2023-08-02T09:15:22.000Z“}
8.16 14:00插入：
{“id“: 103, “is_active“: true, “temperature“: 36.6, “price“: 299.99,“name“: “王五“,
“birth_date“:“1990-05-15“,“created_at“: “2023-08-01 14:30:45.123“}
8.16 15:00插入：
{“id“: 104,“is_active“: false,“temperature“: 22.5,
“price“: 159.50,“name“: “赵六“,“birth_date“: “1988-11-22“,“created_at“: “2023-08-02T09:15:22.000Z“}
2、已存在hive表：
CREATE TABLE IF NOT EXISTS all_data_types_table(
id INT COMMENT '整型ID',
is_active BOOLEAN COMMENT '布尔类型',
-- population LONG COMMENT '长整型',
temperature FLOAT COMMENT '单精度浮点',
-- description TEXT COMMENT '文本类型',
birth_date DATE COMMENT '日期类型',
created_at TIMESTAMP COMMENT '时间戳类型',
price DOUBLE COMMENT '双精度浮点',
name STRING COMMENT '字符串类型'
);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-周期任务-新建数据同步任务：kafka2hive，数据源：kafka，Topic：test，读取类型：json，开始时间：earliest，结束时间：time，日期选择8.16 14:30点击下一步 | 进入选择目标页面 |
| 2 | 选择hive数据源，数据表all_data_types_table，写入模式：覆盖，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | 点击拷贝目标字段 | 左侧框自动新增字段，数据和右侧一致 |
| 4 | 修改name的字段类型为int，同行映射 | 同行字段进行映射，无对应同行字段的不映射 |
| 5 | 一直点击下一步，点击保存 | 系统提示保存成功，修改内容已生效并在页面中更新显示 |
| 6 | 点击运行，查看运行结果 | 运行失败 |
| 7 | 修改左侧字段，name类型改回string。所有字段名称后都加1，比如id1 | 系统提示修改成功，页面显示修改后的最新内容 |
| 8 | 同行映射后，重新保存运行，查看运行结果 | 运行失败 |

##### 验证修改kafka数据源信息后，数据同步任务是否正常 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-手动任务-新建数据同步任务：kafka2hive，数据源：kafka，Topic：test，读取类型：json，开始时间：earliest，结束时间：time，日期选择8.16 14:30点击下一步 | 进入选择目标页面 |
| 2 | 选择hive数据源，数据表all_data_types_table，写入模式：覆盖，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | 点击拷贝目标字段，选择同行映射，一直点击下一步，保存 | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 进入数据源中心，修改kafka数据源的ip，保存 | 数据源保存成功，系统给出保存成功提示，配置/数据已持久化，页面更新为最新状态 |
| 5 | 进入离线开发-项目A，查看任务kafka2hive，临时运行 | 运行失败，找不到topic |

##### 验证数据同步任务kafka2hive移至回收站功能是否正常 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-手动任务-新建数据同步任务：kafka2hive，数据源：kafka，Topic：test，读取类型：json，开始时间：earliest，结束时间：time，日期选择8.16 14:30点击下一步 | 进入选择目标页面 |
| 2 | 选择hive数据源，数据表all_data_types_table，写入模式：覆盖，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | 点击拷贝目标字段，选择同行映射，一直点击下一步，保存 | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 删除任务kafka2hive-移至回收站 | 1）数据开发-手动任务中不存咋任务kafka2hive2）数据开发-回收站-手动任务新增kafka2hive任务 |
| 5 | 进入回收站，右键kafka2hive任务-还原，点击确定 | 还原成功，系统给出成功反馈，相关页面/数据状态更新为最新 |

##### 验证数据同步任务kafka2hive克隆功能是否正常 「P2」

> 前置条件
```
1、已存在kafka数据源：kafka。存在topic：test。
有消息：
8.16 12:00插入：
{“id“: 101, “is_active“: true, “temperature“: 36.6, “price“: 299.99,“name“: “张三“,
“birth_date“:“1990-05-15“,“created_at“: “2023-08-01 14:30:45.123“}

8.16 13:00插入：
{“id“: 102,“is_active“: false,“temperature“: 22.5,
“price“: 159.50,“name“: “李四“,“birth_date“: “1988-11-22“,“created_at“: “2023-08-02T09:15:22.000Z“}

8.16 14:00插入：
{“id“: 103, “is_active“: true, “temperature“: 36.6, “price“: 299.99,“name“: “王五“,
“birth_date“:“1990-05-15“,“created_at“: “2023-08-01 14:30:45.123“}

8.16 15:00插入：
{“id“: 104,“is_active“: false,“temperature“: 22.5,
“price“: 159.50,“name“: “赵六“,“birth_date“: “1988-11-22“,“created_at“: “2023-08-02T09:15:22.000Z“}

2、已存在hive表：
CREATE TABLE IF NOT EXISTS all_data_types_table(
id INT COMMENT '整型ID',
is_active BOOLEAN COMMENT '布尔类型',
-- population LONG COMMENT '长整型',
temperature FLOAT COMMENT '单精度浮点',
-- description TEXT COMMENT '文本类型',
birth_date DATE COMMENT '日期类型',
created_at TIMESTAMP COMMENT '时间戳类型',
price DOUBLE COMMENT '双精度浮点',
name STRING COMMENT '字符串类型'
);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-手动任务-新建数据同步任务：kafka2hive，数据源：kafka，Topic：test，读取类型：json，开始时间：earliest，结束时间：time，日期选择8.16 14:30点击下一步 | 进入选择目标页面 |
| 2 | 选择hive数据源，数据表all_data_types_table，写入模式：覆盖，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | 点击拷贝目标字段，选择同行映射，点击下一步 | 进入通道配置页面 |
| 4 | 勾选开启脏数据存储，点击下一步，保存 | 开启成功，保存成功，系统给出保存成功提示，配置/数据已持久化，页面更新为最新状态 |
| 5 | 进入运维中心-脏数据管理，查看脏数据表 | 新增kafka2hive任务的脏数据表dirty-XXX，存储在hive的meta数据源中 |
| 6 | 进入数据开发，克隆任务：kafka2hive_copy | 1）任务克隆成功，任务配置与hive2kafka一致2）脏数据管理中新增hive2kafka_copy的脏数据表dirty-XXX，存储在hive的meta数据源中 |

##### 验证数据同步任务kafka2hive打包发布是否正常 「P2」

> 前置条件
```
已存在项目A、项目B、项目C。项目A的发布目标项目为项目B。
资源组、数据源已进行映射配置
项目C存在hive数据源，且schema下有表all_data_types_table，且字段一致；存在kafka数据源，有相同的topic
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-手动任务-新建数据同步任务：kafka2hive，数据源：kafka，Topic：test，读取类型：json，开始时间：earliest，结束时间：time，日期选择8.16 14:30点击下一步 | 进入选择目标页面 |
| 2 | 选择hive数据源，数据表all_data_types_table，写入模式：覆盖，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | 点击拷贝目标字段，同行映射，然后一直点击下一步，点击保存，提交任务 | 保存成功，提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 4 | 1）点击发布2）选择任务kafka2hive，点击打包，输入打包描述，点击确定 | 1）进入任务发布页面2）打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 5 | 进入发布至目标项目，点击新生成发布包的导出按钮 | 浏览器触发文件下载，导出文件格式正确，内容与页面显示数据一致 |
| 6 | 进入项目C-任务发布-发布至本项目，导入发布包，选择映射数据源，导入 | 系统提示导入成功，数据已同步至对应列表中 |
| 7 | 点击发布包的发布按钮 | 发布成功，项目C新增任务kafka2hive，任务配置与项目A中一致（数据源被替换为映射数据源） |

##### 验证数据同步任务kafka2hive发布至目标项目是否正常 「P2」

> 前置条件
```
已存在项目A、项目B。项目A的发布目标项目为项目B。
资源组、数据源已进行映射配置
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-手动任务-新建数据同步任务：kafka2hive，数据源：kafka，Topic：test，读取类型：json，开始时间：earliest，结束时间：time，日期选择8.16 14:30点击下一步 | 进入选择目标页面 |
| 2 | 选择hive数据源，数据表all_data_types_table，写入模式：覆盖，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | 点击拷贝目标字段，同行映射，然后一直点击下一步，点击保存，提交任务 | 保存成功，提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 4 | 1）点击发布2）选择任务kafka2hive，点击打包，输入打包描述，点击确定 | 1）进入任务发布页面2）打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 5 | 进入发布至目标项目，点击发布按钮 | 弹出发布包校验弹窗，校验项都通过 |
| 6 | 点击发布 | 发布成功，项目B新增任务kafka2hive，任务配置与项目A中一致 |

##### 验证数据同步任务hive2kafka功能是否正常 「P2」

> 前置条件
```
1、已存在kafka数据源：kafka。存在topic：test1。
没有消息

2、已存在hive表：
CREATE TABLE IF NOT EXISTS all_data_types_table(
id INT COMMENT '整型ID',
is_active BOOLEAN COMMENT '布尔类型',
-- population LONG COMMENT '长整型',
temperature FLOAT COMMENT '单精度浮点',
-- description TEXT COMMENT '文本类型',
birth_date DATE COMMENT '日期类型',
created_at TIMESTAMP COMMENT '时间戳类型',
price DOUBLE COMMENT '双精度浮点',
name STRING COMMENT '字符串类型'
);

INSERT INTO TABLE all_data_types_table VALUES
(1002, false, 22.5, 299.99, '李四', '1985-11-22', '2023-08-02 09:15:22'),
(1003, true, 25.0, 159.50, '王五', '1978-03-08', '2023-08-03 16:45:10'),
(1004, false, 30.1, 89.99, '赵六', '1995-07-30', '2023-08-04 11:20:33'),
(1005, true, NULL, 450.50, '钱七', '1982-09-17', '2023-08-05 08:10:15');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-手动任务-新建数据同步任务：hive2kafka选择hive数据源，数据表all_data_types_table，点击下一步 | 进入选择目标页面 |
| 2 | 选择数据源kafka，Topic：test1，写入类型：json | 1）进入字段映射页面2）右侧框字段为空，左侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | 点击拷贝目标字段 | 右侧框自动新增字段，数据和左侧一致 |
| 4 | 点击同行映射 | 同行字段进行映射，无对应同行字段的不映射 |
| 5 | 一直点击下一步，点击保存 | 系统提示保存成功，修改内容已生效并在页面中更新显示 |
| 6 | 点击运行，查看运行结果 | 任务运行成功，状态显示为【运行成功/成功】，无报错信息 |
| 7 | 查看topcc：test1下的消费信息 | 新增数据和hive表一致 |
| 8 | 修改数据同步任务调度为立即生成，时间为17分钟后，提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |

##### 验证数据同步任务kafka2hive手动任务运行功能是否正常 「P2」

> 前置条件
```
1、已存在kafka数据源：kafka。存在topic：test。
有消息：
8.16 12:00插入：
{“id“: 101, “is_active“: true, “temperature“: 36.6, “price“: 299.99,“name“: “张三“,
“birth_date“:“1990-05-15“,“created_at“: “2023-08-01 14:30:45.123“}

8.16 13:00插入：
{“id“: 102,“is_active“: false,“temperature“: 22.5,
“price“: 159.50,“name“: “李四“,“birth_date“: “1988-11-22“,“created_at“: “2023-08-02T09:15:22.000Z“}

8.16 14:00插入：
{“id“: 103, “is_active“: true, “temperature“: 36.6, “price“: 299.99,“name“: “王五“,
“birth_date“:“1990-05-15“,“created_at“: “2023-08-01 14:30:45.123“}

8.16 15:00插入：
{“id“: 104,“is_active“: false,“temperature“: 22.5,
“price“: 159.50,“name“: “赵六“,“birth_date“: “1988-11-22“,“created_at“: “2023-08-02T09:15:22.000Z“}

2、已存在hive表：（字段顺序调整）
CREATE TABLE IF NOT EXISTS all_data_types_table1 (
id INT COMMENT '整型ID',
is_active BOOLEAN COMMENT '布尔类型',
-- population LONG COMMENT '长整型',
temperature FLOAT COMMENT '单精度浮点',
-- description TEXT COMMENT '文本类型',
birth_date DATE COMMENT '日期类型',
created_at TIMESTAMP COMMENT '时间戳类型',
price DOUBLE COMMENT '双精度浮点',
name STRING COMMENT '字符串类型'
);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-手动任务-新建数据同步任务：kafka2hive1，数据源：kafka，Topic：test，读取类型：csv，开始时间：time 日期选择8.16 11:30结束时间：specific，偏移量填写topic:topic,partion:0,offset:1点击下一步 | 进入选择目标页面 |
| 2 | 选择hive数据源，数据表all_data_types_table1，写入模式：覆盖，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | 点击拷贝目标字段 | 左侧框自动新增字段，数据和右侧一致 |
| 4 | 然后新增字段population，字段类型LONG；字段description，字段类型TEXT，点击确定 | 左侧框最下边新增两条字段 |
| 5 | 点击同名映射 | 同名字段进行映射，无对应同名字段的不映射 |
| 6 | 一直点击下一步，点击保存，提交任务 | 保存成功，提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 7 | 进入运维中心-手动任务实例，点击kafka2hive1的运行 | 任务运行成功，状态显示为【运行成功/成功】，无报错信息 |
| 8 | 在hive sql任务中，select * from all_data_types_table； 查看hive表中的数据 | 有两条条数据，和前置kafka插入的前两条消息数据一致 |
| 9 | 克隆步骤一中的任务Kafka2hive2_copy，转化为脚本，查看脚本中reader的读取方式 | 读取方式为csv |

##### 验证数据同步任务kafka2hive临时运行功能是否正常 「P1」

> 前置条件
```
1、已存在kafka数据源：kafka。存在topic：test。
有消息：
8.16 12:00插入：
{“id“: 101, “is_active“: true, “temperature“: 36.6, “price“: 299.99,“name“: “张三“,
“birth_date“:“1990-05-15“,“created_at“: “2023-08-01 14:30:45.123“}
8.16 13:00插入：
{“id“: 102,“is_active“: false,“temperature“: 22.5,
“price“: 159.50,“name“: “李四“,“birth_date“: “1988-11-22“,“created_at“: “2023-08-02T09:15:22.000Z“}
8.16 14:00插入：
{“id“: 103, “is_active“: true, “temperature“: 36.6, “price“: 299.99,“name“: “王五“,
“birth_date“:“1990-05-15“,“created_at“: “2023-08-01 14:30:45.123“}
8.16 15:00插入：
{“id“: 104,“is_active“: false,“temperature“: 22.5,
“price“: 159.50,“name“: “赵六“,“birth_date“: “1988-11-22“,“created_at“: “2023-08-02T09:15:22.000Z“}
2、已存在hive表：
CREATE TABLE IF NOT EXISTS all_data_types_table (
id INT COMMENT '整型ID',
is_active BOOLEAN COMMENT '布尔类型',
-- population LONG COMMENT '长整型',
temperature FLOAT COMMENT '单精度浮点',
price DOUBLE COMMENT '双精度浮点',
name STRING COMMENT '字符串类型',
-- description TEXT COMMENT '文本类型',
birth_date DATE COMMENT '日期类型',
created_at TIMESTAMP COMMENT '时间戳类型'
);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-手动任务-新建数据同步任务：kafka2hive，数据源：kafka，Topic：test，读取类型：json，开始时间：earliest，结束时间：time，日期选择8.16 14:30点击下一步 | 进入选择目标页面 |
| 2 | 选择hive数据源，数据表all_data_types_table，写入模式：覆盖，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | 点击拷贝目标字段 | 左侧框自动新增字段，数据和右侧一致 |
| 4 | 然后新增字段population，字段类型LONG；字段description，字段类型TEXT，点击确定 | 左侧框最下边新增两条字段 |
| 5 | 点击同行映射 | 同行字段进行映射，无对应同行字段的不映射 |
| 6 | 一直点击下一步，点击保存 | 系统提示保存成功，修改内容已生效并在页面中更新显示 |
| 7 | 点击运行，查看运行结果 | 任务运行成功，状态显示为【运行成功/成功】，无报错信息 |
| 8 | 在hive sql任务中，select * from all_data_types_table； 查看hive表中的数据 | 有三条数据，和前置kafka插入的前三条消息数据一致 |
| 9 | 克隆步骤一中的任务Kafka2hive_copy，转化为脚本，查看脚本中reader的读取方式 | 读取方式为json |

##### 验证字段刷新功能 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-手动任务-新建数据同步任务，选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入字段映射步骤 |
| 3 | 右侧框新增字段id、name，建立同行映射 | 系统提示新增成功，列表顶部出现一条新建记录，内容与填写一致 |
| 4 | 一直点击下一步，保存任务 | 系统提示保存成功，修改内容已生效并在页面中更新显示 |
| 5 | 给hive数据表新增字段age | 系统提示新增成功，列表顶部出现一条新建记录，内容与填写一致 |
| 6 | 编辑数据同步任务，到字段映射步骤，点击字段刷新 | 左侧框新增age字段 |

##### 验证批量添加功能 「P2」

> 前置条件
```
提示：
字段添加格式：:
column: type,
column: type,
常用数据类型：
BOOLEAN, INT, LONG, FLOAT, DOUBLE, STRING, DATE, TEXT, TIMESTAMP,
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-手动任务-新建数据同步任务，选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入字段映射步骤 |
| 3 | 点击右侧框的添加字段按钮 | 弹出添加kafka字段弹窗 |
| 4 | 输入错误的字段格式，如id int，点击确定 | 提示：字段XX 的数据类型不可为空或缺少分隔符！ |
| 5 | 输入错误的字段类型，如id:hhh点击确定 | 提示：字段XX的数据类型错误或缺少分隔符！ |
| 6 | 输入id:int,name:string，点击确定 | 保存成功，右侧框数据展示正确，内容与预期完全一致，无异常或错误 |
| 7 | 再次点击批量添加按钮 | 文本框回填右侧框的所有字段及字段类型 |

##### 验证编辑字段功能 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-手动任务-新建数据同步任务，选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入字段映射步骤 |
| 3 | 点击右侧框的添加字段按钮 | 弹出添加kafka字段弹窗 |
| 4 | 输入字段名id，类型int，点击确定 | 新增字段，右侧框新增字段id、类型int，操作列有删除和编辑按钮 |
| 5 | 点击编辑按钮 | 1）弹出修改kafka字段弹窗2）弹窗展示字段名、选择类型，数据回填正确 |
| 6 | 不修改内容直接点击确定 | 数据保存正确，内容与预期完全一致，无异常或错误 |
| 7 | 点击编辑按钮，修改字段id为id1，字段类型为string，点击确定 | 数据保存正确，内容与预期完全一致，无异常或错误 |

##### 验证字段删除功能 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-手动任务-新建数据同步任务，选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入字段映射步骤 |
| 3 | 点击右侧框的添加字段按钮 | 弹出添加kafka字段弹窗 |
| 4 | 输入字段名id，类型int，点击确定 | 新增字段，右侧框新增字段id、类型int，操作列有删除和编辑按钮 |
| 5 | 点击删除按钮 | 字段被删除，右侧框无字段id展示 |

##### 验证添加字段功能 「P2」

> 前置条件
```
已存在kafka数据源：kafka。存在topic：test。
有消息：
{“id“: 1, “name“: “刘丽娟“, “age“: 37, “gender“: 1, “phone“: “15574821630“, “address“: “广东省兴城市黄浦陈路L座 796791“}
{“id“: 2, “name“: “曹涛“, “age“: 26, “gender“: 1, “phone“: “15574821630“, “address“: “贵州省涛县双滦吴街U座 722046“}
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-手动任务-新建数据同步任务，选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入字段映射步骤 |
| 3 | 点击右侧框的添加字段按钮 | 1）弹出添加kafka字段弹窗2）弹窗展示字段名、选择类型，选择类型下拉框有类型BOOLEAN、INT、LONG、FLOAT、DOUBLE、STRING、DATE、TEXT、TIMESTAMP |
| 4 | 输入字段名id，类型int，点击取消 | 未新增字段 |
| 5 | 输入字段名id，类型int，点击确定 | 新增字段，右侧框新增字段id、类型int，操作列有删除和编辑按钮 |
| 6 | 再次新增字段id，类型int，点击确定 | 提示：添加失败：字段名不能重复 |

##### 验证字段映射页面展示 「P2」

> 前置条件
```
类型支持BOOLEAN、INT、LONG、FLOAT、DOUBLE、STRING、DATE、TEXT、TIMESTAMP，默认选择STRING
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-手动任务-新建数据同步任务，选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 选择kafka数据源，选择topic，点击下一步 | 进入字段映射步骤 |
| 3 | 查看展示 | 1）上方有提示，下方展示左右两个框以及操作栏2）左侧框展示目标表内的字段名称和类型，数据正确3）右侧框展示kafka内字段数据，默认为空，支持添加字段、批量添加操作4）操作栏有同行映射、同名映射、拷贝目标字段、自动排版、字段刷新 |

##### 验证kafka-写入类型下拉框功能 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-手动任务，新建数据同步任务，进入第二步 | 进入选择目标步骤 |
| 2 | 数据源选择kafka_test1，查看写入类型展示 | 默认选择json |
| 3 | 查看下拉框内容 | 展示json和csv，只支持单选 |
| 4 | 写入类型为空，填写其他内容，点击下一步 | 提示：请选择写入类型 |

##### 验证kakfa-Topic功能是否正常 「P2」

> 前置条件
```
1、数据源kafka_test1已引入离线项目A
2、kafka_test1存在topic1、topic2

创建topic
1、连接有kafka的服务器
2、进入/opt/dtstack/Kafka/kafka/bin
3、执行创建topic的命令
./kafka-topics.sh --zookeeper host:2181/kafka --create --replication-factor 3 --partitions 1 --topic topic_name   （修改host和topic_name）

4、删除topic的命令
./kafka-topics.sh --zookeeper host12:2181 --delete --topic topic_name
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-手动任务，新建数据同步任务，进入第二步 | 进入选择目标步骤 |
| 2 | 数据源选择kafka_test1，查看topic下拉框展 | 展示topic1、topic2 |
| 3 | 连接有kafka的服务器，创建topic:topic_new | 系统提示创建成功，列表中出现新创建的记录，记录内容与填写一致 |
| 4 | 然后查看数据同步任务的topic下拉框内容 | 1）新增topic_new |
| 5 | topic为空，填写其他内容，点击下一步 | 提示：请选择topic |

##### 验证数据同步目标下拉框功能是否正确 「P2」

> 前置条件
```
数据源中心存在数据源kafka_test1、kafka_test2、kafka_test3，且都已引入离线项目A
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-手动任务，新建数据同步任务，填写数据来源后，进入第二步 | 进入选择目标步骤 |
| 2 | 查看数据同步目标下拉框 | 展示kakfa类型的数据源 |
| 3 | 输入kakfa_test，查看数据源下拉框 | 展示kafka数据源kafka_test1、kafka_test2、kafka_test3 |
| 4 | 不选择数据源，点击下一步 | 提示：请选择数据源 |

##### 验证字段刷新功能 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-手动任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入字段映射步骤 |
| 3 | 左侧框新增字段id、name，建立同行映射 | 系统提示新增成功，列表顶部出现一条新建记录，内容与填写一致 |
| 4 | 一直点击下一步，保存任务 | 系统提示保存成功，修改内容已生效并在页面中更新显示 |
| 5 | 给hive数据表新增字段age | 系统提示新增成功，列表顶部出现一条新建记录，内容与填写一致 |
| 6 | 编辑数据同步任务，到字段映射步骤，点击字段刷新 | 右侧框新增age字段 |

##### 验证添加常量功能 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-手动任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入字段映射步骤 |
| 3 | 点击左侧框的添加常量按钮 | 弹出添加常量弹窗 |
| 4 | 输入名称date、值2025-08-16，点击确定 | 系统提示保存成功，修改内容已生效并在页面中更新显示 |
| 5 | 点击编辑按钮 | 弹出编辑弹窗，名称和字段类型置灰不可编辑 |

##### 验证批量添加功能 「P2」

> 前置条件
```
提示：
字段添加格式：:
column: type,
column: type,
常用数据类型：
BOOLEAN, INT, LONG, FLOAT, DOUBLE, STRING, DATE, TEXT, TIMESTAMP,
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-手动任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入字段映射步骤 |
| 3 | 点击左侧框的批量添加按钮 | 弹出批量添加弹窗，上方展示前置中的提示，下方展示文本框，以及取消和确认按钮 |
| 4 | 输入错误的字段格式，如id int，点击确定 | 提示：字段XX 的数据类型不可为空或缺少分隔符！ |
| 5 | 输入错误的字段类型，如id:hhh点击确定 | 提示：字段XX的数据类型错误或缺少分隔符！ |
| 6 | 输入id:int,name:string，点击确定 | 保存成功，左侧框数据展示正确，内容与预期完全一致，无异常或错误 |
| 7 | 再次点击批量添加按钮 | 文本框回填左侧框的所有字段及字段类型 |

##### 验证编辑字段功能 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-手动任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入字段映射步骤 |
| 3 | 点击左侧框的添加字段按钮 | 弹出添加kafka字段弹窗 |
| 4 | 输入字段名id，类型int，点击确定 | 新增字段，左侧框新增字段id、类型int，字段转换-，操作列有删除和编辑按钮 |
| 5 | 点击编辑按钮 | 1）弹出修改kafka字段弹窗2）弹窗展示字段名称、类型、格式化、转换方式，数据回填正确 |
| 6 | 不修改内容直接点击确定 | 数据保存正确，内容与预期完全一致，无异常或错误 |
| 7 | 点击编辑按钮，修改字段id为id1，字段类型为string，点击确定 | 数据保存正确，内容与预期完全一致，无异常或错误 |

##### 验证字段删除功能 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-手动任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入字段映射步骤 |
| 3 | 点击左侧框的添加字段按钮 | 弹出添加kafka字段弹窗 |
| 4 | 输入字段名id，类型int，点击确定 | 新增字段，左侧框新增字段id、类型int，字段转换-，操作列有删除和编辑按钮 |
| 5 | 点击删除按钮 | 字段被删除，左侧框无字段id展示 |

##### 验证添加字段功能 「P2」

> 前置条件
```
已存在kafka数据源：kafka。存在topic：test。
有消息：
{“id“: 1, “name“: “刘丽娟“, “age“: 37, “gender“: 1, “phone“: “15574821630“, “address“: “广东省兴城市黄浦陈路L座 796791“}
{“id“: 2, “name“: “曹涛“, “age“: 26, “gender“: 1, “phone“: “15574821630“, “address“: “贵州省涛县双滦吴街U座 722046“}
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-手动任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入字段映射步骤 |
| 3 | 点击左侧框的添加字段按钮 | 弹出添加kafka字段弹窗 |
| 4 | 输入字段名id，类型int，点击取消 | 未新增字段 |
| 5 | 输入字段名id，类型int，点击确定 | 新增字段，左侧框新增字段id、类型int，字段转换-，操作列有删除和编辑按钮 |
| 6 | 再次新增字段id，类型int，点击确定 | 提示：添加失败：字段名不能重复 |

##### 验证添加字段显示交互是否正确 「P2」

> 前置条件
```
已存在kafka数据源：kafka。存在topic：test
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-手动任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入字段映射步骤 |
| 3 | 点击左侧框的添加字段按钮 | 弹出添加kafka字段弹窗 |
| 4 | 查看弹窗展示 | 1）展示【字段名称】【类型】【格式化】【转换方式】2）字段名称输入框内提示：请输入字段名称3）类型默认选择STRING4）格式化输入框内提示：格式化，例如：yyyy-MM-dd；问号提示：如果源库的一个字符串类型，映射到了目标库的date或time类型，则需要配置转换规则 |
| 5 | 查看字段类型下拉框展示 | 类型支持BOOLEAN、INT、LONG、FLOAT、DOUBLE、STRING、DATE、TEXT、TIMESTAMP |
| 6 | 查看转换方式下拉框展示 | 展示目录【项目资源】【租户资源】以及目录下的资源，和数据开发-资源管理数据一致 |
| 7 | 必填、非必填验证 | 字段名称、类型为必填项；格式化、转换方式为非必填项 |

##### 验证字段映射页面展示 「P2」

> 前置条件
```
已存在kafka数据源：kafka。存在topic：test
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-手动任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入字段映射步骤 |
| 3 | 查看展示 | 1）上方有提示，下方展示左右两个框以及操作栏2）左侧框展示kafka内字段数据，默认为空，支持添加字段、批量添加、添加常量操作3）右侧框展示目标表内的字段名称和类型，数据正确4）操作栏有同行映射、同名映射、拷贝目标字段、自动排版、字段刷新 |

##### 验证目标端不支持一键生成目标表功能 「P3」

> 前置条件
```
已存在kafka数据源：kafka。存在topic：test
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-手动任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 选择hive数据源，查看表名选择框后，是否有【一键生成目标表】按钮 | 没有【一键生成目标表按钮】 |

##### 验证beginOffset/endOffset选择time，时间选择功能是否正常 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-手动任务-新建数据同步任务，选择kafka数据源，开始时间和结束时间都选择time | beginOffset和endOffset下分别新增选择时间选择框 |
| 2 | 点击选择框右侧的按钮 | 展示日期时间 |
| 3 | 切换年份、月份 | 功能操作结果符合预期，无报错或异常提示 |
| 4 | 选择非当前时刻的日期时间 | 允许选择 |
| 5 | 点击此刻 | 选中当前日期和时间 |
| 6 | 点击确定按钮 | 保存成功，选择时间选择框回填选中的日期和时间 |

##### 验证endOffset选择功能 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-手动任务-新建数据同步任务，选择kafka数据源，查看endOffset | 1）有选项time、specific，默认选择time2）问号提示：“指定kafka消费的结束点位，time代表从指定的时间点结束消费；specific代表从手动指定的某个 offset 结束读取” |
| 2 | 选择specific，查看展示 | 1）新增“偏移量”配置项，选择框内有填写样例提示 |
| 3 | 偏移量为空，填写其他内容，点击下一步 | 提示：请选择起始时间 |
| 4 | 选择time，查看展示 | 1）新增“选择时间”配置项，提示：请选择起始时间2）选择框右侧有选择时间按钮 |
| 5 | 起始时间为空，填写其他内容，点击下一步 | 提示：请选择起始时间 |
| 6 | 点击选择时间，查看展示 | 1）展示时间选择框，选择日期时间功能正常2）此刻按钮功能正常 |
| 7 | 点击确定按钮 | 回填选择的日期和时间 |

##### 验证beginOffset选择功能 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-手动任务-新建数据同步任务，选择kafka数据源，查看beginOffset | 1）有选项earliest、time、specific，默认选择earliest2）问号提示：“指定kafka消费的起始点位，earliest代表从Kafka中可用的最早的offset开始消费；time代表从指定的时间点开始消费；specific代表从手动指定的某个 offset 开始读取” |
| 2 | 选择time，查看展示 | 1）新增“选择时间”配置项，提示：请选择起始时间2）选择框右侧有选择时间按钮 |
| 3 | 起始时间为空，填写其他内容，点击下一步 | 提示：请选择起始时间 |
| 4 | 点击选择日期和时间，点击确定按钮 | 回填选择的日期和时间 |
| 5 | 选择specific，查看展示 | 1）新增“偏移量”配置项，选择框内提示：“topic:xx1,partition:0,offset:42” |
| 6 | 偏移量为空，填写其他内容，点击下一步 | 提示：请选择起始时间 |
| 7 | 选择earliest，查看展示 | 无新增配置项 |

##### 验证kafka-读取类型显示交互是否正常 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-手动任务，新建数据同步任务，数据源选择kafka_test1，查看读取类型展示 | 默认选择json |
| 2 | 查看下拉框内容 | 展示json和csv |
| 3 | 读取类型为空，选择其他内容，点击下一步 | 提示：请选择读取类型 |

##### 验证kakfa-Topic显示交互是否正常 「P3」

> 前置条件
```
1、数据源kafka_test1已引入离线项目A
2、kafka_test1存在topic1、topic2

创建topic
1、连接有kafka的服务器
2、进入/opt/dtstack/Kafka/kafka/bin
3、执行创建topic的命令
./kafka-topics.sh --zookeeper host:2181/kafka --create --replication-factor 3 --partitions 1 --topic topic_name   （修改host和topic_name）

4、删除topic的命令
./kafka-topics.sh --zookeeper host12:2181 --delete --topic topic_name
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-手动任务，新建数据同步任务，数据源选择kafka_test1，查看topic下拉框展示 | 展示topic1、topic2 |
| 2 | 连接有kafka的服务器，创建topic:topic_new | 系统提示创建成功，列表中出现新创建的记录，记录内容与填写一致 |
| 3 | 然后查看数据同步任务的topic下拉框内容 | 1）新增topic_new |
| 4 | topic为空，选择其他内容，点击下一步 | 提示：请选择topic |

##### 验证选择kafka数据源-显示交互功能 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-手动任务，新建手动同步任务，不选择数据源，点击下一步 | 提示：请选择数据源 |
| 2 | 选择kafka数据源，查看页面展示 | 展示Tpoic、读取类型、beginOffset、endOffset |

##### 验证数据源下拉框支持kafka类型数据源 「P2」

> 前置条件
```
数据源中心存在数据源kafka_test1、kafka_test2、kafka_test3，且都已引入离线项目A
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-手动任务，新建数据同步任务，查看数据源下拉框 | 展示kafka数据源kafka_test1、kafka_test2、kafka_test3 |
| 2 | 输入kakfa_test，查看数据源下拉框 | 展示kafka数据源kafka_test1、kafka_test2、kafka_test3 |

##### 验证修改kafka数据源信息后，数据同步任务是否正常 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-周期任务-新建数据同步任务：kafka2hive，数据源：kafka，Topic：test，读取类型：json，开始时间：earliest，结束时间：time，日期选择8.16 14:30点击下一步 | 进入选择目标页面 |
| 2 | 选择hive数据源，数据表all_data_types_table，写入模式：覆盖，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | 点击拷贝目标字段，选择同行映射，一直点击下一步，保存 | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 进入数据源中心，修改kafka数据源的ip，保存 | 数据源保存成功，系统给出保存成功提示，配置/数据已持久化，页面更新为最新状态 |
| 5 | 进入离线开发-项目A，查看任务kafka2hive，临时运行 | 运行失败，找不到topic |

##### 验证数据同步任务kafka2hive移至回收站功能是否正常 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-周期任务-新建数据同步任务：kafka2hive，数据源：kafka，Topic：test，读取类型：json，开始时间：earliest，结束时间：time，日期选择8.16 14:30点击下一步 | 进入选择目标页面 |
| 2 | 选择hive数据源，数据表all_data_types_table，写入模式：覆盖，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | 点击拷贝目标字段，选择同行映射，一直点击下一步，保存 | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 4 | 删除任务kafka2hive-移至回收站 | 1）数据开发-周期任务中不存咋任务kafka2hive2）数据开发-回收站-周期任务新增kafka2hive任务 |
| 5 | 进入回收站，右键kafka2hive任务-还原，点击确定 | 还原成功，系统给出成功反馈，相关页面/数据状态更新为最新 |

##### 验证数据同步任务kafka2hive克隆功能是否正常 「P2」

> 前置条件
```
1、已存在kafka数据源：kafka。存在topic：test。
有消息：
8.16 12:00插入：
{“id“: 101, “is_active“: true, “temperature“: 36.6, “price“: 299.99,“name“: “张三“,
“birth_date“:“1990-05-15“,“created_at“: “2023-08-01 14:30:45.123“}
8.16 13:00插入：
{“id“: 102,“is_active“: false,“temperature“: 22.5,
“price“: 159.50,“name“: “李四“,“birth_date“: “1988-11-22“,“created_at“: “2023-08-02T09:15:22.000Z“}
8.16 14:00插入：
{“id“: 103, “is_active“: true, “temperature“: 36.6, “price“: 299.99,“name“: “王五“,
“birth_date“:“1990-05-15“,“created_at“: “2023-08-01 14:30:45.123“}
8.16 15:00插入：
{“id“: 104,“is_active“: false,“temperature“: 22.5,
“price“: 159.50,“name“: “赵六“,“birth_date“: “1988-11-22“,“created_at“: “2023-08-02T09:15:22.000Z“}
2、已存在hive表：
CREATE TABLE IF NOT EXISTS all_data_types_table(
id INT COMMENT '整型ID',
is_active BOOLEAN COMMENT '布尔类型',
-- population LONG COMMENT '长整型',
temperature FLOAT COMMENT '单精度浮点',
-- description TEXT COMMENT '文本类型',
birth_date DATE COMMENT '日期类型',
created_at TIMESTAMP COMMENT '时间戳类型',
price DOUBLE COMMENT '双精度浮点',
name STRING COMMENT '字符串类型'
);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-周期任务-新建数据同步任务：kafka2hive，数据源：kafka，Topic：test，读取类型：json，开始时间：earliest，结束时间：time，日期选择8.16 14:30点击下一步 | 进入选择目标页面 |
| 2 | 选择hive数据源，数据表all_data_types_table，写入模式：覆盖，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | 点击拷贝目标字段，选择同行映射，点击下一步 | 进入通道配置页面 |
| 4 | 勾选开启脏数据存储，点击下一步，保存 | 开启成功，保存成功，系统给出保存成功提示，配置/数据已持久化，页面更新为最新状态 |
| 5 | 进入运维中心-脏数据管理，查看脏数据表 | 新增kafka2hive任务的脏数据表dirty-XXX，存储在hive的meta数据源中 |
| 6 | 进入数据开发，克隆任务：kafka2hive_copy | 1）任务克隆成功，任务配置与hive2kafka一致2）脏数据管理中新增hive2kafka_copy的脏数据表dirty-XXX，存储在hive的meta数据源中 |

##### 验证数据同步任务kafka2hive打包发布是否正常 「P2」

> 前置条件
```
已存在项目A、项目B、项目C。项目A的发布目标项目为项目B。
资源组、数据源已进行映射配置

项目C存在hive数据源，且schema下有表all_data_types_table，且字段一致；存在kafka数据源，有相同的topic
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-周期任务-新建数据同步任务：kafka2hive，数据源：kafka，Topic：test，读取类型：json，开始时间：earliest，结束时间：time，日期选择8.16 14:30点击下一步 | 进入选择目标页面 |
| 2 | 选择hive数据源，数据表all_data_types_table，写入模式：覆盖，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | 点击拷贝目标字段，同行映射，然后一直点击下一步，点击保存，提交任务 | 保存成功，提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 4 | 1）点击发布2）选择任务kafka2hive，点击打包，输入打包描述，点击确定 | 1）进入任务发布页面2）打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 5 | 进入发布至目标项目，点击新生成发布包的导出按钮 | 浏览器触发文件下载，导出文件格式正确，内容与页面显示数据一致 |
| 6 | 进入项目C-任务发布-发布至本项目，导入发布包，选择映射数据源，导入 | 系统提示导入成功，数据已同步至对应列表中 |
| 7 | 点击发布包的发布按钮 | 发布成功，项目C新增任务kafka2hive，任务配置与项目A中一致（数据源被替换为映射数据源） |

##### 验证数据同步任务kafka2hive发布至目标项目是否正常 「P1」

> 前置条件
```
已存在项目A、项目B。项目A的发布目标项目为项目B。
资源组、数据源已进行映射配置
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-周期任务-新建数据同步任务：kafka2hive，数据源：kafka，Topic：test，读取类型：json，开始时间：earliest，结束时间：time，日期选择8.16 14:30点击下一步 | 进入选择目标页面 |
| 2 | 选择hive数据源，数据表all_data_types_table，写入模式：覆盖，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | 点击拷贝目标字段，同行映射，然后一直点击下一步，点击保存，提交任务 | 保存成功，提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 4 | 1）点击发布2）选择任务kafka2hive，点击打包，输入打包描述，点击确定 | 1）进入任务发布页面2）打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 5 | 进入发布至目标项目，点击发布按钮 | 弹出发布包校验弹窗，校验项都通过 |
| 6 | 点击发布 | 发布成功，项目B新增任务kafka2hive，任务配置与项目A中一致 |

##### 验证连接方式为集群地址的kafka数据同步任务功能是否正常 「P2」

> 前置条件
```
1、已存在kafka数据源：kafka。
集群地址：
172.16.124.109:2181,172.16.124.130:2181,172.16.124.141:2181/kafka

存在topic：test。
有消息：
8.16 12:00插入：
{“id“: 101, “is_active“: true, “temperature“: 36.6, “price“: 299.99,“name“: “张三“,
“birth_date“:“1990-05-15“,“created_at“: “2023-08-01 14:30:45.123“}
8.16 13:00插入：
{“id“: 102,“is_active“: false,“temperature“: 22.5,
“price“: 159.50,“name“: “李四“,“birth_date“: “1988-11-22“,“created_at“: “2023-08-02T09:15:22.000Z“}
2、已存在hive表：
CREATE TABLE IF NOT EXISTS all_data_types_table(
id INT COMMENT '整型ID',
is_active BOOLEAN COMMENT '布尔类型',
-- population LONG COMMENT '长整型',
temperature FLOAT COMMENT '单精度浮点',
-- description TEXT COMMENT '文本类型',
birth_date DATE COMMENT '日期类型',
created_at TIMESTAMP COMMENT '时间戳类型',
price DOUBLE COMMENT '双精度浮点',
name STRING COMMENT '字符串类型'
);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-周期任务-新建数据同步任务：kafka2hive3，数据源：kafka，Topic：test，读取类型：csv，开始时间：earliest结束时间：time，选择当前时间点击下一步 | 进入选择目标页面 |
| 2 | 选择hive数据源，数据表all_data_types_table1，写入模式：追加，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | 点击拷贝目标字段 | 左侧框自动新增字段，数据和右侧一致 |
| 4 | 点击同行映射 | 同行字段进行映射，无对应同行字段的不映射 |
| 5 | 一直点击下一步，点击保存 | 系统提示保存成功，修改内容已生效并在页面中更新显示 |
| 6 | 点击运行，查看运行结果 | 任务运行成功，状态显示为【运行成功/成功】，无报错信息 |
| 7 | 在hive sql任务中，select * from all_data_types_table； 查看hive表中的数据 | 新增两条数据，和前置kafka插入的消息一致 |
| 8 | 修改数据同步任务调度为立即生成，时间为17分钟后，提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 9 | 进入周期任务实例，点击kafka2hive3的补数据-当前任务 | 补数据实例运行成功，hive表新增两条数据，和前置kafka插入的消息一致 |
| 10 | 17分钟后，查看周期任务实例 | 实例运行成功，hive表新增两条数据，和前置kafka插入的消息一致 |
| 11 | 克隆步骤一中的任务kafka2hive3，转化为脚本，查看脚本中writer的写入类型 | 写入类型为json |
| 12 | 修改kafka2hive3的写入类型为csv，保存任务后克隆，转化为脚本，查看脚本中的writer的写入类型 | 写入类型为csv |

##### 验证数据同步任务hive2kafka功能是否正常 「P1」

> 前置条件
```
1、已存在kafka数据源：kafka。存在topic：test1。
没有消息
2、已存在hive表：
CREATE TABLE IF NOT EXISTS all_data_types_table(
id INT COMMENT '整型ID',
is_active BOOLEAN COMMENT '布尔类型',
-- population LONG COMMENT '长整型',
temperature FLOAT COMMENT '单精度浮点',
-- description TEXT COMMENT '文本类型',
birth_date DATE COMMENT '日期类型',
created_at TIMESTAMP COMMENT '时间戳类型',
price DOUBLE COMMENT '双精度浮点',
name STRING COMMENT '字符串类型'
);
{103,true,36.6,299.99,“王五“,“1988-05-15“,“2023-08-02T09:15:22.000Z“}
{104,false,22.5,159.50,“赵六“,“1988-11-22“,“2023-08-02T09:15:22.000Z“}
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-周期任务-新建数据同步任务：hive2kafka选择hive数据源，数据表all_data_types_table，点击下一步 | 进入选择目标页面 |
| 2 | 选择数据源kafka，Topic：test1，写入类型：json | 1）进入字段映射页面2）右侧框字段为空，左侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | 点击拷贝目标字段 | 右侧框自动新增字段，数据和左侧一致 |
| 4 | 点击同行映射 | 同行字段进行映射，无对应同行字段的不映射 |
| 5 | 一直点击下一步，点击保存 | 系统提示保存成功，修改内容已生效并在页面中更新显示 |
| 6 | 点击运行，查看运行结果 | 任务运行成功，状态显示为【运行成功/成功】，无报错信息 |
| 7 | 查看topcc：test1下的消费信息 | 新增数据和hive表一致 |
| 8 | 修改数据同步任务调度为立即生成，时间为17分钟后，提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 9 | 进入周期任务实例，点击hive2kafka的补数据-当前任务 | 补数据实例运行成功，topic1新增数据和hive表一致 |
| 10 | 17分钟后，查看周期任务实例 | 实例运行成功，topic1又新增数据，数据和hive表一致 |
| 11 | 克隆步骤一中的任务hive2kafka_copy，转化为脚本，查看脚本中writer的写入类型 | 写入类型为json |
| 12 | 修改hive2kafka的写入类型为csv，保存任务后克隆，转化为脚本，查看脚本中的writer的写入类型 | 写入类型为csv |

##### 验证数据同步任务kafka2hive补数据功能是否正常 「P1」

> 前置条件
```
1、已存在kafka数据源：kafka。存在topic：test。
有消息：
8.16 12:00插入：
{“id“: 101, “is_active“: true, “temperature“: 36.6, “price“: 299.99,“name“: “张三“,
“birth_date“:“1990-05-15“,“created_at“: “2023-08-01 14:30:45.123“}
8.16 13:00插入：
{“id“: 102,“is_active“: false,“temperature“: 22.5,
“price“: 159.50,“name“: “李四“,“birth_date“: “1988-11-22“,“created_at“: “2023-08-02T09:15:22.000Z“}
8.16 14:00插入：
{“id“: 103, “is_active“: true, “temperature“: 36.6, “price“: 299.99,“name“: “王五“,
“birth_date“:“1990-05-15“,“created_at“: “2023-08-01 14:30:45.123“}
8.16 15:00插入：
{“id“: 104,“is_active“: false,“temperature“: 22.5,
“price“: 159.50,“name“: “赵六“,“birth_date“: “1988-11-22“,“created_at“: “2023-08-02T09:15:22.000Z“}
2、已存在hive表：
CREATE TABLE IF NOT EXISTS all_data_types_table(
id INT COMMENT '整型ID',
is_active BOOLEAN COMMENT '布尔类型',
-- population LONG COMMENT '长整型',
temperature FLOAT COMMENT '单精度浮点',
-- description TEXT COMMENT '文本类型',
birth_date DATE COMMENT '日期类型',
created_at TIMESTAMP COMMENT '时间戳类型',
price DOUBLE COMMENT '双精度浮点',
name STRING COMMENT '字符串类型'
);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-周期任务-新建数据同步任务：kafka2hive3，数据源：kafka，Topic：test，读取类型：csv，开始时间：specific 偏移量填写topic:topic,partion:0,offset:1结束时间：specific，偏移量填写topic:topic,partion:0,offset:2点击下一步 | 进入选择目标页面 |
| 2 | 选择hive数据源，数据表all_data_types_table1，写入模式：追加，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | 点击拷贝目标字段 | 左侧框自动新增字段，数据和右侧一致 |
| 4 | 点击同行映射，然后一直点击下一步，点击保存 | 系统提示保存成功，修改内容已生效并在页面中更新显示 |
| 5 | 提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 6 | 进入运维中心-周期任务实例，点击kafka2hive2的补数据按钮，选择当前任务 | 补数据实例运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 7 | 在hive sql任务中，select * from all_data_types_table； 查看hive表中的数据 | 有一条数据，和前置kafka插入的第二条消息数据一致 |
| 8 | 1）数据同步任务绑定下游任务2）保存提交3）进入运维中心-周期任务实例，点击kafka2hive2的补数据按钮，选择当前任务及下游 | 1）绑定成功2）保存成功，提交成功3）补数据实例运行成功 |
| 9 | 在hive sql任务中，select * from all_data_types_table； 查看hive表中的数据 | 新增一条数据，和前置kafka插入的第二条消息数据一致 |

##### 验证数据同步任务kafka2hive周期任务运行功能是否正常 「P1」

> 前置条件
```
1、已存在kafka数据源：kafka。存在topic：test。
有消息：
8.16 12:00插入：
{“id“: 101, “is_active“: true, “temperature“: 36.6, “price“: 299.99,“name“: “张三“,
“birth_date“:“1990-05-15“,“created_at“: “2023-08-01 14:30:45.123“}
8.16 13:00插入：
{“id“: 102,“is_active“: false,“temperature“: 22.5,
“price“: 159.50,“name“: “李四“,“birth_date“: “1988-11-22“,“created_at“: “2023-08-02T09:15:22.000Z“}
8.16 14:00插入：
{“id“: 103, “is_active“: true, “temperature“: 36.6, “price“: 299.99,“name“: “王五“,
“birth_date“:“1990-05-15“,“created_at“: “2023-08-01 14:30:45.123“}
8.16 15:00插入：
{“id“: 104,“is_active“: false,“temperature“: 22.5,
“price“: 159.50,“name“: “赵六“,“birth_date“: “1988-11-22“,“created_at“: “2023-08-02T09:15:22.000Z“}
2、已存在hive表：（字段顺序调整）
CREATE TABLE IF NOT EXISTS all_data_types_table1 (
id INT COMMENT '整型ID',
is_active BOOLEAN COMMENT '布尔类型',
-- population LONG COMMENT '长整型',
temperature FLOAT COMMENT '单精度浮点',
-- description TEXT COMMENT '文本类型',
birth_date DATE COMMENT '日期类型',
created_at TIMESTAMP COMMENT '时间戳类型',
price DOUBLE COMMENT '双精度浮点',
name STRING COMMENT '字符串类型'
);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-周期任务-新建数据同步任务：kafka2hive1，数据源：kafka，Topic：test，读取类型：csv，开始时间：time 日期选择8.16 11:30结束时间：specific，偏移量填写topic:topic,partion:0,offset:1点击下一步 | 进入选择目标页面 |
| 2 | 选择hive数据源，数据表all_data_types_table1，写入模式：覆盖，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | 点击拷贝目标字段 | 左侧框自动新增字段，数据和右侧一致 |
| 4 | 然后新增字段population，字段类型LONG；字段description，字段类型TEXT，点击确定 | 左侧框最下边新增两条字段 |
| 5 | 点击同名映射 | 同名字段进行映射，无对应同名字段的不映射 |
| 6 | 一直点击下一步，调度属性调整为立即生成，时间为17分钟后。点击保存 | 系统提示保存成功，修改内容已生效并在页面中更新显示 |
| 7 | 提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 8 | 17分中后，进入运维中心-周期任务实例，查看实例 | kafka2hive1的实例运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 9 | 在hive sql任务中，select * from all_data_types_table； 查看hive表中的数据 | 有一条条数据，和前置kafka插入的第一条消息数据一致 |
| 10 | 克隆步骤一中的任务Kafka2hive2_copy，转化为脚本，查看脚本中reader的读取方式 | 读取方式为csv |

##### 验证数据同步任务kafka2hive临时运行功能是否正常 「P1」

> 前置条件
```
1、已存在kafka数据源：kafka。存在topic：test。
有消息：
8.16 12:00插入：
{“id“: 101, “is_active“: true, “temperature“: 36.6, “price“: 299.99,“name“: “张三“,
“birth_date“:“1990-05-15“,“created_at“: “2023-08-01 14:30:45.123“}
8.16 13:00插入：
{“id“: 102,“is_active“: false,“temperature“: 22.5,
“price“: 159.50,“name“: “李四“,“birth_date“: “1988-11-22“,“created_at“: “2023-08-02T09:15:22.000Z“}
8.16 14:00插入：
{“id“: 103, “is_active“: true, “temperature“: 36.6, “price“: 299.99,“name“: “王五“,
“birth_date“:“1990-05-15“,“created_at“: “2023-08-01 14:30:45.123“}
8.16 15:00插入：
{“id“: 104,“is_active“: false,“temperature“: 22.5,
“price“: 159.50,“name“: “赵六“,“birth_date“: “1988-11-22“,“created_at“: “2023-08-02T09:15:22.000Z“}
2、已存在hive表：
CREATE TABLE IF NOT EXISTS all_data_types_table (
id INT COMMENT '整型ID',
is_active BOOLEAN COMMENT '布尔类型',
-- population LONG COMMENT '长整型',
temperature FLOAT COMMENT '单精度浮点',
price DOUBLE COMMENT '双精度浮点',
name STRING COMMENT '字符串类型',
-- description TEXT COMMENT '文本类型',
birth_date DATE COMMENT '日期类型',
created_at TIMESTAMP COMMENT '时间戳类型'
);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据开发-周期任务-新建数据同步任务：kafka2hive，数据源：kafka，Topic：test，读取类型：json，开始时间：earliest，结束时间：time，日期选择8.16 14:30点击下一步 | 进入选择目标页面 |
| 2 | 选择hive数据源，数据表all_data_types_table，写入模式：追加，点击下一步 | 1）进入字段映射页面2）左侧框字段为空，右侧框展示前置hive建表sql中的字段及字段类型 |
| 3 | 点击拷贝目标字段 | 左侧框自动新增字段，数据和右侧一致 |
| 4 | 然后新增字段population，字段类型LONG；字段description，字段类型TEXT，点击确定 | 左侧框最下边新增两条字段 |
| 5 | 点击同行映射 | 同行字段进行映射，无对应同行字段的不映射 |
| 6 | 一直点击下一步，点击保存 | 系统提示保存成功，修改内容已生效并在页面中更新显示 |
| 7 | 点击运行，查看运行结果 | 任务运行成功，状态显示为【运行成功/成功】，无报错信息 |
| 8 | 在hive sql任务中，select * from all_data_types_table； 查看hive表中的数据 | 有三条数据，和前置kafka插入的前三条消息数据一致 |
| 9 | 克隆步骤一中的任务Kafka2hive_copy，转化为脚本，查看脚本中reader的读取方式 | 读取方式为json |
| 10 | 运行脚本任务 | 任务运行成功，状态显示为【运行成功/成功】，无报错信息 |
| 11 | 在hive sql任务中，select * from all_data_types_table； 查看hive表中的数据 | 新增三条数据，和前置kafka插入的前三条消息数据一致 |

##### 验证字段刷新功能 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-周期任务-新建数据同步任务，选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入字段映射步骤 |
| 3 | 右侧框新增字段id、name，建立同行映射 | 系统提示新增成功，列表顶部出现一条新建记录，内容与填写一致 |
| 4 | 一直点击下一步，保存任务 | 系统提示保存成功，修改内容已生效并在页面中更新显示 |
| 5 | 给hive数据表新增字段age | 系统提示新增成功，列表顶部出现一条新建记录，内容与填写一致 |
| 6 | 编辑数据同步任务，到字段映射步骤，点击字段刷新 | 左侧框新增age字段 |

##### 验证批量添加功能 「P2」

> 前置条件
```
提示：
字段添加格式：:
column: type,
column: type,
常用数据类型：
BOOLEAN, INT, LONG, FLOAT, DOUBLE, STRING, DATE, TEXT, TIMESTAMP,
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-周期任务-新建数据同步任务，选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入字段映射步骤 |
| 3 | 点击右侧框的添加字段按钮 | 弹出添加kafka字段弹窗 |
| 4 | 输入错误的字段格式，如id int，点击确定 | 提示：字段XX 的数据类型不可为空或缺少分隔符！ |
| 5 | 输入错误的字段类型，如id:hhh点击确定 | 提示：字段XX的数据类型错误或缺少分隔符！ |
| 6 | 输入id:int,name:string，点击确定 | 保存成功，右侧框数据展示正确，内容与预期完全一致，无异常或错误 |
| 7 | 再次点击批量添加按钮 | 文本框回填右侧框的所有字段及字段类型 |

##### 验证编辑字段功能 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-周期任务-新建数据同步任务，选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入字段映射步骤 |
| 3 | 点击右侧框的添加字段按钮 | 弹出添加kafka字段弹窗 |
| 4 | 输入字段名id，类型int，点击确定 | 新增字段，右侧框新增字段id、类型int，操作列有删除和编辑按钮 |
| 5 | 点击编辑按钮 | 1）弹出修改kafka字段弹窗2）弹窗展示字段名、选择类型，数据回填正确 |
| 6 | 不修改内容直接点击确定 | 数据保存正确，内容与预期完全一致，无异常或错误 |
| 7 | 点击编辑按钮，修改字段id为id1，字段类型为string，点击确定 | 数据保存正确，内容与预期完全一致，无异常或错误 |

##### 验证字段删除功能 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-周期任务-新建数据同步任务，选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入字段映射步骤 |
| 3 | 点击右侧框的添加字段按钮 | 弹出添加kafka字段弹窗 |
| 4 | 输入字段名id，类型int，点击确定 | 新增字段，右侧框新增字段id、类型int，操作列有删除和编辑按钮 |
| 5 | 点击删除按钮 | 字段被删除，右侧框无字段id展示 |

##### 验证添加字段功能 「P2」

> 前置条件
```
已存在kafka数据源：kafka。存在topic：test。
有消息：
{“id“: 1, “name“: “刘丽娟“, “age“: 37, “gender“: 1, “phone“: “15574821630“, “address“: “广东省兴城市黄浦陈路L座 796791“}
{“id“: 2, “name“: “曹涛“, “age“: 26, “gender“: 1, “phone“: “15574821630“, “address“: “贵州省涛县双滦吴街U座 722046“}
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-周期任务-新建数据同步任务，选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入字段映射步骤 |
| 3 | 点击右侧框的添加字段按钮 | 1）弹出添加kafka字段弹窗2）弹窗展示字段名、选择类型，选择类型下拉框有类型BOOLEAN、INT、LONG、FLOAT、DOUBLE、STRING、DATE、TEXT、TIMESTAMP |
| 4 | 输入字段名id，类型int，点击取消 | 未新增字段 |
| 5 | 输入字段名id，类型int，点击确定 | 新增字段，右侧框新增字段id、类型int，操作列有删除和编辑按钮 |
| 6 | 再次新增字段id，类型int，点击确定 | 提示：添加失败：字段名不能重复 |

##### 验证字段映射页面展示 「P2」

> 前置条件
```
类型支持BOOLEAN、INT、LONG、FLOAT、DOUBLE、STRING、DATE、TEXT、TIMESTAMP，默认选择STRING
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-周期任务-新建数据同步任务，选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 选择kafka数据源，选择topic，点击下一步 | 进入字段映射步骤 |
| 3 | 查看展示 | 1）上方有提示，下方展示左右两个框以及操作栏2）左侧框展示目标表内的字段名称和类型，数据正确3）右侧框展示kafka内字段数据，默认为空，支持添加字段、批量添加操作4）操作栏有同行映射、同名映射、拷贝目标字段、自动排版、字段刷新 |

##### 验证kafka-写入类型下拉框功能 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-周期任务，新建数据同步任务，进入第二步 | 进入选择目标步骤 |
| 2 | 数据源选择kafka_test1，查看写入类型展示 | 默认选择json |
| 3 | 查看下拉框内容 | 展示json和csv，只支持单选 |

##### 验证kakfa-Topic功能是否正常 「P2」

> 前置条件
```
1、数据源kafka_test1已引入离线项目A
2、kafka_test1存在topic1、topic2

创建topic
1、连接有kafka的服务器
2、进入/opt/dtstack/Kafka/kafka/bin
3、执行创建topic的命令
./kafka-topics.sh --zookeeper host:2181/kafka --create --replication-factor 3 --partitions 1 --topic topic_name   （修改host和topic_name）

4、删除topic的命令
./kafka-topics.sh --zookeeper host12:2181 --delete --topic topic_name
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-周期任务，新建数据同步任务，进入第二步 | 进入选择目标步骤 |
| 2 | 数据源选择kafka_test1，查看topic下拉框展 | 展示topic1、topic2 |
| 3 | 连接有kafka的服务器，创建topic:topic_new | 系统提示创建成功，列表中出现新创建的记录，记录内容与填写一致 |
| 4 | 然后查看数据同步任务的topic下拉框内容 | 1）新增topic_new |
| 5 | topic为空，点击下一步 | 提示：请选择topic |

##### 验证数据同步目标下拉框功能是否正确 「P2」

> 前置条件
```
数据源中心存在数据源kafka_test1、kafka_test2、kafka_test3，且都已引入离线项目A
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-周期任务，新建数据同步任务，填写数据来源后，进入第二步 | 进入选择目标步骤 |
| 2 | 查看数据同步目标下拉框 | 展示kakfa类型的数据源 |
| 3 | 输入kakfa_test，查看数据源下拉框 | 展示kafka数据源kafka_test1、kafka_test2、kafka_test3 |
| 4 | 不选择数据源，点击下一步 | 提示：请选择数据源 |

##### 验证字段刷新功能 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-周期任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入字段映射步骤 |
| 3 | 左侧框新增字段id、name，建立同行映射 | 系统提示新增成功，列表顶部出现一条新建记录，内容与填写一致 |
| 4 | 一直点击下一步，保存任务 | 系统提示保存成功，修改内容已生效并在页面中更新显示 |
| 5 | 给hive数据表新增字段age | 系统提示新增成功，列表顶部出现一条新建记录，内容与填写一致 |
| 6 | 编辑数据同步任务，到字段映射步骤，点击字段刷新 | 右侧框新增age字段 |

##### 验证添加常量功能 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-周期任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入字段映射步骤 |
| 3 | 点击左侧框的添加常量按钮 | 弹出添加常量弹窗 |
| 4 | 输入名称date、值2025-08-16，点击确定 | 系统提示保存成功，修改内容已生效并在页面中更新显示 |
| 5 | 点击编辑按钮 | 弹出编辑弹窗，名称和字段类型置灰不可编辑 |

##### 验证批量添加功能 「P1」

> 前置条件
```
提示：
字段添加格式：:
column: type,
column: type,
常用数据类型：
BOOLEAN, INT, LONG, FLOAT, DOUBLE, STRING, DATE, TEXT, TIMESTAMP,
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-周期任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入字段映射步骤 |
| 3 | 点击左侧框的批量添加按钮 | 弹出批量添加弹窗，上方展示前置中的提示，下方展示文本框，以及取消和确认按钮 |
| 4 | 输入错误的字段格式，如id int，点击确定 | 提示：字段XX 的数据类型不可为空或缺少分隔符！ |
| 5 | 输入错误的字段类型，如id:hhh点击确定 | 提示：字段XX的数据类型错误或缺少分隔符！ |
| 6 | 输入id:int,name:string，点击确定 | 保存成功，左侧框数据展示正确，内容与预期完全一致，无异常或错误 |
| 7 | 再次点击批量添加按钮 | 文本框回填左侧框的所有字段及字段类型 |

##### 验证编辑字段功能 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-周期任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入字段映射步骤 |
| 3 | 点击左侧框的添加字段按钮 | 弹出添加kafka字段弹窗 |
| 4 | 输入字段名id，类型int，点击确定 | 新增字段，左侧框新增字段id、类型int，字段转换-，操作列有删除和编辑按钮 |
| 5 | 点击编辑按钮 | 1）弹出修改kafka字段弹窗2）弹窗展示字段名称、类型、格式化、转换方式，数据回填正确 |
| 6 | 不修改内容直接点击确定 | 数据保存正确，内容与预期完全一致，无异常或错误 |
| 7 | 点击编辑按钮，修改字段id为id1，字段类型为string，点击确定 | 数据保存正确，内容与预期完全一致，无异常或错误 |

##### 验证字段删除功能 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-周期任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入字段映射步骤 |
| 3 | 点击左侧框的添加字段按钮 | 弹出添加kafka字段弹窗 |
| 4 | 输入字段名id，类型int，点击确定 | 新增字段，左侧框新增字段id、类型int，字段转换-，操作列有删除和编辑按钮 |
| 5 | 点击删除按钮 | 字段被删除，左侧框无字段id展示 |

##### 验证添加字段功能 「P1」

> 前置条件
```
已存在kafka数据源：kafka。存在topic：test。
有消息：
{“id“: 1, “name“: “刘丽娟“, “age“: 37, “gender“: 1, “phone“: “15574821630“, “address“: “广东省兴城市黄浦陈路L座 796791“}
{“id“: 2, “name“: “曹涛“, “age“: 26, “gender“: 1, “phone“: “15574821630“, “address“: “贵州省涛县双滦吴街U座 722046“}
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-周期任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入字段映射步骤 |
| 3 | 点击左侧框的添加字段按钮 | 弹出添加kafka字段弹窗 |
| 4 | 输入字段名id，类型int，点击取消 | 未新增字段 |
| 5 | 输入字段名id，类型int，点击确定 | 新增字段，左侧框新增字段id、类型int，字段转换-，操作列 |
| 6 | 再次新增字段id，类型int，点击确定 | 提示：添加失败：字段名不能重复 |

##### 验证添加字段显示交互是否正确 「P2」

> 前置条件
```
已存在kafka数据源：kafka。存在topic：test
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-周期任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入字段映射步骤 |
| 3 | 点击左侧框的添加字段按钮 | 弹出添加kafka字段弹窗 |
| 4 | 查看弹窗展示 | 1）展示【字段名称】【类型】【格式化】【转换方式】2）字段名称输入框内提示：请输入字段名称3）类型默认选择STRING4）格式化输入框内提示：格式化，例如：yyyy-MM-dd；问号提示：如果源库的一个字符串类型，映射到了目标库的date或time类型，则需要配置转换规则 |
| 5 | 查看字段类型下拉框展示 | 类型支持BOOLEAN、INT、LONG、FLOAT、DOUBLE、STRING、DATE、TEXT、TIMESTAMP |
| 6 | 查看转换方式下拉框展示 | 展示目录【项目资源】【租户资源】以及目录下的资源，和数据开发-资源管理数据一致 |
| 7 | 必填、非必填验证 | 字段名称、类型为必填项；格式化、转换方式为非必填项 |

##### 验证字段映射页面展示 「P3」

> 前置条件
```
已存在kafka数据源：kafka。存在topic：test
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-周期任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 选择hive数据源-schema-数据表，填写信息，点击下一步 | 进入字段映射步骤 |
| 3 | 查看展示 | 1）上方有提示，下方展示左右两个框以及操作栏2）左侧框展示kafka内字段数据，默认为空，支持添加字段、批量添加、添加常量操作3）右侧框展示目标表内的字段名称和类型，数据正确4）操作栏有同行映射、同名映射、拷贝目标字段、自动排版、字段刷新 |

##### 验证目标端不支持一键生成目标表功能 「P3」

> 前置条件
```
已存在kafka数据源：kafka。存在topic：test
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-周期任务-新建数据同步任务，数据源选择kafka，topic选择test，其他参数保持默认选项，点击下一步 | 进入数据同步任务-选择目标 |
| 2 | 选择hive数据源，查看表名选择框后，是否有【一键生成目标表】按钮 | 没有【一键生成目标表按钮】 |

##### 验证beginOffset/endOffset选择time，时间选择功能是否正常 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-周期任务-新建数据同步任务，选择kafka数据源，开始时间和结束时间都选择time | beginOffset和endOffset下分别新增选择时间选择框 |
| 2 | 点击选择框右侧的按钮 | 展示日期时间 |
| 3 | 切换年份、月份 | 功能操作结果符合预期，无报错或异常提示 |
| 4 | 选择非当前时刻的日期时间 | 允许选择 |
| 5 | 点击此刻 | 选中当前日期和时间 |
| 6 | 点击确定按钮 | 保存成功，选择时间选择框回填选中的日期和时间 |

##### 验证endOffset选择功能 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-周期任务-新建数据同步任务，选择kafka数据源，查看endOffset | 1）有选项time、specific，默认选择time2）问号提示：“指定kafka消费的结束点位，time代表从指定的时间点结束消费；specific代表从手动指定的某个 offset 结束读取” |
| 2 | 选择specific，查看展示 | 1）新增“偏移量”配置项，选择框内有填写样例提示 |
| 3 | 不填写偏移量，点击下一步 | 提示：请填写偏移量 |
| 4 | 选择time，查看展示 | 1）新增“选择时间”配置项，提示：请选择起始时间2）选择框右侧有选择时间按钮 |
| 5 | 不填写时间，点击下一步 | 提示：请选择起始时间 |
| 6 | 点击选择时间，查看展示 | 1）展示时间选择框，选择日期时间功能正常2）此刻按钮功能正常 |
| 7 | 点击确定按钮 | 回填选择的日期和时间 |

##### 验证beginOffset选择功能 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-周期任务-新建数据同步任务，选择kafka数据源，查看beginOffset | 1）有选项earliest、time、specific，默认选择earliest2）问号提示：“指定kafka消费的起始点位，earliest代表从Kafka中可用的最早的offset开始消费；time代表从指定的时间点开始消费；specific代表从手动指定的某个 offset 开始读取” |
| 2 | 选择time，查看展示 | 1）新增“选择时间”配置项，提示：请选择起始时间2）选择框右侧有选择时间按钮 |
| 3 | 不填写时间，点击下一步 | 提示：请选择起始时间 |
| 4 | 点击选择日期和时间，点击确定按钮 | 回填选择的日期和时间 |
| 5 | 选择specific，查看展示 | 1）新增“偏移量”配置项，选择框内提示：“topic:xx1,partition:0,offset:42” |
| 6 | 不填写偏移量，点击下一步 | 提示：请填写偏移量 |
| 7 | 选择earliest，查看展示 | 无新增配置项 |

##### 验证kafka-读取类型显示交互是否正常 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-周期任务，新建数据同步任务，数据源选择kafka_test1，查看读取类型展示 | 默认选择json |
| 2 | 查看下拉框内容 | 展示json，只支持单选 |
| 3 | 读取类型为空，选择其他内容，点击下一步 | 提示：请选择读取类型 |

##### 验证kakfa-Topic显示交互是否正常 「P3」

> 前置条件
```
1、数据源kafka_test1已引入离线项目A
2、kafka_test1存在topic1、topic2
创建topic
1、连接有kafka的服务器
2、进入/opt/dtstack/Kafka/kafka/bin
3、执行创建topic的命令
./kafka-topics.sh --zookeeper host:2181/kafka --create --replication-factor 3 --partitions 1 --topic topic_name   （修改host和topic_name）
4、删除topic的命令
./kafka-topics.sh --zookeeper host12:2181 --delete --topic topic_name
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-周期任务，新建数据同步任务，数据源选择kafka_test1，查看topic下拉框展示 | 展示topic1、topic2 |
| 2 | 连接有kafka的服务器，创建topic:topic_new | 系统提示创建成功，列表中出现新创建的记录，记录内容与填写一致 |
| 3 | 然后查看数据同步任务的topic下拉框内容 | 新增topic_new |
| 4 | topic为空，选择其他内容，点击下一步 | 提示：请选择topic |

##### 验证选择kafka数据源-显示功能 「P3」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-周期任务，新建数据同步任务，不选择数据源，点击下一步 | 提示：请选择数据源 |
| 2 | 选择kafka数据源，查看页面展示 | 展示Tpoic、读取类型、beginOffset、endOffset、选择时间选择框 |

##### 验证数据源下拉框支持kafka类型数据源 「P2」

> 前置条件
```
数据源中心存在数据源kafka_test1、kafka_test2、kafka_test3，且都已引入离线项目A
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-周期任务，新建数据同步任务，查看数据源下拉框 | 展示kafka数据源kafka_test1、kafka_test2、kafka_test3 |
| 2 | 输入kakfa_test，查看数据源下拉框 | 展示kafka数据源kafka_test1、kafka_test2、kafka_test3 |

##### 验证kafka数据源取消引入功能 「P2」

> 前置条件
```
1、存在未被使用的数据源kafka1
2、存在被数据同步任务使用的数据源kafka2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-数据源，点击kafka1的取消引入按钮 | 弹出二次确认弹窗 |
| 2 | 点击取消按钮 | kafka1未被取消引入 |
| 3 | 点击未应用的数据源kafka1的取消引入按钮，点击确认按钮 | kafka1被取消引入，数据源列表不展示kafka1 |
| 4 | 点击已应用的数据源kafka2的取消引入按钮 | 取消引入按钮置灰 |

##### 验证kafka数据源映射配置功能 「P1」

> 前置条件
```
1、创建项目test1、test2
2、test1的发布目标为test2
3、
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源中心，创建多个kafka数据源，授权给离线全部项目 | 系统提示授权成功，目标对象已获得对应权限 |
| 2 | 进入离线开发，项目test1&test2，引入步骤一中的kakfa数据源 | 引入成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入项目test1-项目管理，配置发布目标，选择test2 | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 4 | 进入数据源页面，点击一个kafka数据源的映射配置按钮，查看展示 | 展示test2引入的，且不是其他数据源发布目标的kafka数据源 |
| 5 | 选择一个数据源，点击确定 | 映射成功，该数据源的映射状态为已配置 |

##### 验证离线开发-数据源-数据源类型新增kafka类型 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据源，点击数据源类型下拉框，查看类型 | 新增kafka |
| 2 | 勾选kafka，点击确定进行筛选 | 数据源列表只展示kafka类型的数据源 |
| 3 | 点击引入数据源，查看数据源类型下拉框，查看类型 | 新增kafka |
| 4 | 勾选kafka，进行筛选，查看数据 | 引入数据源弹窗只展示kafka类型的数据源 |

##### 验证离线开发引入kafka数据源功能 「P1」

> 前置条件
```
broker地址填写：172.16.114.9:9092
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源中心-创建kafka数据源：kafka，授权给离线开发，全部项目 | 系统提示授权成功，目标对象已获得对应权限 |
| 2 | 进入离线开发-项目A-数据源中心，点击引入数据源 | 1）弹出引入数据源弹窗2）数据源列表有数据源kafka |
| 3 | 查看kafka数据源展示 | 新增kafka类型 |
| 4 | 数据源类型勾选kafka，查看展示 | 1）最左侧展示kafka数据源图标，有V2.x标识2）数据源信息第一行展示：kafka数据源名称和描述3）数据源信息第二行展示：集群地址、broker地址、最近修改时间，集群地址、broker地址根据数据源中心配置的信息二选一展示 |
| 5 | 查看hover展示 | 展示名称，描述、集群地址、broker、最近修改时间，数据正确 |
| 6 | 勾选数据源kafka，点击确定 | 引入数据源成功，数据源列表新增数据源kafka |
| 7 | 查看列表kafka数据源数据 | 1）展示数据源名称：kafka2）展示数据源类型：kafka3）展示数据源描述4）展示数据源连接信息：集群地址、broker地址，数据与数据源中心一致。如果数据源连接方式为集群地址，broker数据站谁--；如果连接方式为broker，集群地址展示--5）连接状态、最近修改时间数据正确，应用状态为未应用，映射状态为未配置 |

##### 验证数据源中心-kafka数据源是否支持授权给离线开发 「P1」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据源中心，新增数据源，选择kafka | 进入产品授权页面 |
| 2 | 版本选择2.x，查看支持授权的产品 | 新增离线开发 |
| 3 | 勾选离线开发 | 1）展示项目选择框，默认选择所有项目2）下拉框展示所有离线项目 |
| 4 | 点击下一步，输入数据源名称kafka，broker地址填写：172.16.114.9:9092，点击确定 | 1）新增成功2）kafka授权产品展示离线开发 |
| 5 | 点击数据源：kafka对应的的授权按钮，查看展示 | 授权产品及项目有离线开发 |

