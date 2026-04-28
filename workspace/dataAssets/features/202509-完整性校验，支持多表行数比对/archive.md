---
suite_name: "完整性校验，支持多表行数比对"
description: "完整性校验，支持多表行数比对用例归档"
tags:
  - "规则校验"
  - "无效分区"
  - "数量差异"
  - "功能正常"
  - "完整性校验"
  - "任务实例详情"
  - "比对细节设置"
  - "对比库表添加"
  - "删除功能正常"
  - "校验类型新增"
  - "记录数数量差异"
  - "多表数据行数对比"
  - "规则内容显示正确"
  - "记录数百分比差异"
  - "输入框有效值校验"
prd_version: "v6.4.3"
dev_version:
  - "袋鼠云"
create_at: "2026-04-05"
status: "草稿"
origin: "csv"
case_count: 9
case_id: 9338
---

##### 【P2】验证「任务实例详情」中「多表数据行数对比」规则内容显示正确

> 前置条件

```
已存在一条「多表数据内容对比」任务实例记录, 且该实例校验未通过
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【任务实例详情】页面 | 进入成功 |
| 2 | UI CHECK | 监控报告内容如下:1) 标识: 校验未通过(1)2) 完整性校验表格: 规则类型: 多表数据行数对比/表/对比表1所属库/对比表1/分区${若存在多张对比表, 此处依次展示对比表N所属库/对比表N/分区} /强弱规则/规则描述3) 比对规则: 记录数百分比差异，对比表之间的总记录数，差距小于等于【${num}】%时候，计为成功匹配记录数数量差异，对比表之间的总记录数，差距小于等于【${num}】条时候，计为成功匹配 |
| 3 | 点击「查看明细」按钮 | 弹出「查看明细」弹窗 |
| 4 | UI CHECK | 1) 弹窗标题: 「查看“完整性校验-多表数据行数对比”明细」2) 运行时间: 可选择时间, 格式2025-10-10 10:10:103) 「下载明细」按钮4) 列表信息: 包含表名/分区/所属库/表行数 |

## 完整性校验

##### 【P0】验证「多表数据行数对比」规则校验(无效分区)

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
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「数据源」「数据库」「数据表」car_compare02等信息，选择【完整性校验】规则 | 选择成功，展示【完整性校验】规则配置项 |
| 4 | 「校验类型」选择「多表数据行数对比」 「选择对比表1所属库/对比表」选择car_compare02所在的库/表 「输入分区」选择「手动输入分区」, 并输入不存在的分区「delivery_time=“2025-01-01“」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮, 点击「下一步」，配置「周期任务」, 点击「完成」按钮 | 规则保存成功 |
| 6 | 立即运行、周期运行 | 1) 任务实例状态由「运行中」 > 「校验异常」 |
| 7 | 点击「查看日志」 | 任务实例详情页面显示「校验失败」标识, 可支持查看日志 |
| 8 |  | 完整性检验表格中新增键值对: 规则类型-多表数据行数对比 |
| 9 |  | 展示校验失败原因 |

##### 【P0】验证「多表数据行数对比」规则校验(记录数百分比差异&数量差异)

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
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「数据源」「数据库」「数据表」car_compare02等信息，选择【完整性校验】规则 | 选择成功，展示【完整性校验】规则配置项 |
| 4 | 「校验类型」选择「多表数据行数对比」「选择对比表1所属库/对比表/分区」选择car_compare02所在的库/表/分区「强弱规则」选择「弱规则」「规则描述」输入「测试规则」「比对细节设置」输入并选择两个「记录数百分比差异」「20」, 「记录数数量差异」「10」 | 配置完成 |
| 5 | 点击「保存」按钮, 点击「下一步」，配置「周期任务」, 点击「完成」按钮 | 规则保存成功 |
| 6 | 立即运行、周期运行 | 任务实例状态由「运行中」 > 「校验通过」1) 任务实例详情弹窗中存在「校验通过」的标识2) 不记录明细数据；3) 完整性检验表格中新增键值对: 规则类型-多表数据行数对比 |
| 7 | 重新编辑规则任务,  记录数数量差异改为1并确定后, 保存并重新运行规则任务 | 规则编辑成功 |
| 8 | 保存并重新运行规则任务 | 实例运行成功, 两个只要满足一个则校验通过 |

##### 【P1】验证「多表数据行数对比」规则校验(记录数数量差异)

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
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「数据源」「数据库」「数据表」car_compare02等信息，选择【完整性校验】规则 | 选择成功，展示【完整性校验】规则配置项 |
| 4 | 「校验类型」选择「多表数据行数对比」「选择对比表1所属库/对比表/分区」选择car_compare02所在的库/表/分区「强弱规则」选择「弱规则」「规则描述」输入「测试规则」「比对细节设置」输入并选择「记录数数量差异」「10」 | 配置完成 |
| 5 | 点击「保存」按钮, 点击「下一步」，配置「周期任务」, 点击「完成」按钮 | 规则保存成功 |
| 6 | 立即运行、周期运行 | 任务实例状态由「运行中」 > 「校验通过」1) 任务实例详情弹窗中存在「校验通过」的标识2) 不记录明细数据；3) 完整性检验表格中新增键值对: 规则类型-多表数据行数对比 |
| 7 | 重新编辑规则任务,  记录数数量差异改为1并确定后, 保存并重新运行规则任务 | 规则编辑成功 |
| 8 | 保存并重新运行规则任务 | 任务实例状态由「运行中」 > 「校验异常」1) 任务实例详情页面显示「校验未通过」标识, 可支持查看明细, 明细按照表和校验字段记录不符合规则的数值2) 完整性检验表格中新增键值对: 规则类型-多表数据内容对比 |
| 9 | 点击「查看明细」 | 展示校验表和所有对比表的表名/分区/所属库/表行数 |

##### 【P1】验证「多表数据行数对比」规则校验(记录数百分比差异)

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
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「数据源」「数据库」「数据表」car_compare02等信息，选择【完整性校验】规则 | 选择成功，展示【完整性校验】规则配置项 |
| 4 | 「校验类型」选择「多表数据行数对比」「选择对比表1所属库/对比表/分区」选择car_compare02所在的库/表/分区「强弱规则」选择「弱规则」「规则描述」输入「测试规则」「比对细节设置」输入并选择「记录数百分比差异」「20」 | 配置完成 |
| 5 | 点击「保存」按钮, 点击「下一步」，配置「周期任务」, 点击「完成」按钮 | 规则保存成功 |
| 6 | 立即运行、周期运行 | 任务实例状态由「运行中」 > 「校验通过」 |
| 7 | 重新编辑规则任务, 记录数百分比差异改为0.1并确定后 | 任务实例详情弹窗中存在「校验通过」的标识 |
| 8 | 保存并重新运行规则任务 | 不记录明细数据； |
| 9 | 点击「查看明细」 | 完整性检验表格中新增键值对: 规则类型-多表数据行数对比 |
| 10 |  | 规则编辑成功 |
| 11 |  | 任务实例状态由「运行中」 > 「校验异常」1) 任务实例详情页面显示「校验未通过」标识, 可支持查看明细, 明细按照表和校验字段记录不符合规则的数值2) 完整性检验表格中新增键值对: 规则类型-多表数据内容对比 |
| 12 |  | 展示校验表和所有对比表的表名/分区/所属库/表行数 |

##### 【P0】验证「比对细节设置」输入框有效值校验

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
| 4 | 「校验类型」选择「多表数据行数对比」后, 点击「比对细节设置」 | 弹出「多表数据一致性比对设置」弹窗 |
| 5 | 百分比差异选项中的【】输入非数字字符「测试」 | 前端限制, 无法输入 |
| 6 | 百分比差异选项中的【】输入最小值「0」后确定 | 重置为00.00 |
| 7 | 百分比差异选项中的【】输入「99.99」后确定 | 重置为99.99 |
| 8 | 百分比差异选项中的【】输入「99999」后确定 | 重置为最大值「100.00」 |
| 9 | 数量差异选项中的【】输入非数字字符「测试」 | 前端限制, 无法输入 |
| 10 | 数量差异选项中的【】输入最小值「0」后确定 | 显示为0 |
| 11 | 数量差异选项中的【】输入「10000」后确定 | 重置为最大值「9999」 |

##### 【P0】验证「比对细节设置」功能正常

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
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「数据源」「数据库」「数据表」等信息，选择【完整性校验】规则 | 选择成功，展示【完整性校验】规则配置项 |
| 4 | 「校验类型」选择「多表数据行数对比」后, 点击「比对细节设置」 | 弹出「多表数据一致性比对设置」弹窗 |
| 5 | UI CHECK | 1) 比对规则悬浮提示：“若不勾选配置具体规则细节，则正常校验行数是否存在差异，只要存在差异判断校验不通过; 若同时勾选, 则只要满足任意一个则校验通过.” |
| 6 | 两个都不勾选, 保存该规则任务并运行 | 支持输入内容并勾选, 可以多选:1) 「记录数百分比差异，对比表之间的总记录数，差距小于等于【】%时候，计为成功匹配」, 百分比精度最多设置两位, 只能输入数字, 由前端进行限制2) 「记录数数量差异，对比表之间的总记录数，差距小于等于【】条时候，计为成功匹配」 |
| 7 | 进入「任务实例查询」中, 查看该实例记录的详情 | 按钮: 取消 / 确定 |
| 8 | 编辑规则任务, 进入比对细节设置窗口, 勾选两个选项: 百分比差异, 数量差异, 并输入有效数据, 保存并重新运行 | 运行成功 |
| 9 | 进入「任务实例查询」中, 查看该实例记录的详情 | 详情页面未显示比对规则 |
| 10 |  | 运行成功 |
| 11 |  | 详情页面显示两条比对规则: 1) 「记录数百分比差异，对比表之间的总记录数，差距小于等于【${n}】%时候，计为成功匹配」, 百分比精度最多设置两位, 只能输入数字, 由前端进行限制2) 「记录数数量差异，对比表之间的总记录数，差距小于等于【${n}】条时候，计为成功匹配」 |

##### 【P1】验证对比库表添加/删除功能正常

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
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」后, 填写完「监控对象」表单, 点击「下一步」, 在「监控规则」表单中点击「添加规则-完整性校验」, 校验类型选择「多表数据行数对比」 | 显示「完整性校验-多表数据行数对比」表单配置项 |
| 3 | 选择第一个库/表/分区选项后, 点击「+」按钮 | 1) 新增一行库/表/分区配置项2) 第二行的数据库默认选择上一步骤选择的数据库，可修改为当前源下的其他库3) 出现「-」按钮, 可以删除配置项 |
| 4 | 依次添加至10行配置后, 再次点击「+」 | 提示: 「最多添加10个对比表」 |
| 5 | 点击“-”删除按钮 | 成功删除该行对比表 |
| 6 | 删除所有对比表 | 提示: 请选择对比表 |

##### 【P0】验证校验类型新增「多表数据行数对比」

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
| 4 | 校验类型 选择 「多表数据行数对比」 | 多表数据内容对表单配置项包含:1) 校验类型/选择对比表1所属库/选择对比表1/输入分区/规则描述2) 选择对比表1所属库/选择对比表1: 仅支持单选, 但可以添加多个库表, 最多添加至10个3) 按钮: 保存 / 取消 / 对比细节设置 |
