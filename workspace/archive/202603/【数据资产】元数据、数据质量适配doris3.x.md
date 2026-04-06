---
suite_name: "【数据资产】元数据、数据质量适配doris3.x"
description: "【数据资产】元数据、数据质量适配doris3.x用例归档"
tags:
  - "正常"
  - "表级"
  - "概览"
  - "通知"
  - "元数据"
  - "从离线"
  - "数据源"
  - "规则集"
  - "自定义"
  - "字段级"
  - "页面中"
  - "置功能"
  - "能正常"
  - "无血缘"
  - "平台管理"
prd_version: "v6.4.9"
dev_version:
  - "袋鼠云"
create_at: "2026-04-05"
status: "草稿"
origin: "csv"
case_count: 41
case_id: 10306
---

## 平台管理

### 数据源管理

##### 【P0】验证「平台管理」中 Doris 3.x 数据源质量项目授权功能正常

> 前置条件

```
1) 「公共管理-数据源中心」已存在Doris 3.x数据源${datasource1}
2) 「离线开发」已存在Meta标识的Doris 3.x数据源${datasource2}
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【平台管理】-【数据源管理】页面 | 进入成功 |
| 2 | 点击「引入数据源」 | 显示平台中所有还未被引入至资产平台的数据源 |
| 3 | 选择${datasource1}数据源后引入 | 成功引入至资产平台 |
| 4 | 点击「质量项目授权」, 选择质量项目后确定 | 1) 质量项目授权成功 |
| 5 | 选择${datasource2}数据源后引入 | 资产平台其他模块都可以加载到该数据源 |
| 6 | 点击「质量项目授权」, 选择质量项目后确定 | 成功引入至资产平台 |
| 7 |  | 1) 质量项目授权成功 |
| 8 |  | 资产平台其他模块都可以加载到该数据源 |

##### 【P0】验证 「元数据」中 Doris 3.x 从离线 Meta 到资产的自动引入与同步功能

> 前置条件

```
控制台-多集群管理-计算组件中已配置Doris 3.x数据源
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【离线开发】页面, 点击创建项目, 「计算引擎」中对接Doris 3.x集群, 其他必填项正常填写后, 点击「创建项目」 | 离线项目创建成功 |
| 2 | 进入离线项目, 点击「数据源」 | 1) 从数据开发界面切换到数据源界面, 展示已对接的数据源列表 |
| 3 | 进入【数据资产】-【平台管理】-【数据源管理】页面 | 存在带Meta标识的Doris 3.x数据源记录 |
| 4 | 进入【数据资产】-【元数据】-【元数据同步】页面 | 1) 进入成功 |
| 5 |  | 资产平台自动引入离线平台中的带Meta标识的Doris 3.x数据源, 并且已授权给质量项目 |
| 6 |  | 1) 进入成功 |
| 7 |  | 自动为Doris 3.x数据源新增了一条周期同步任务, 并且自动「立即同步」一次 |
| 8 |  | 周期同步任务配置为: 数据库: ${离线平台中创建项目时指定的项目标识} 数据表: 「全部」 调度周期为「周」 |

## 数据质量

### 脏数据管理

##### 【P2】验证「脏数据管理」中 Doris 3.x 数据源处理脏数据功能正常

> 前置条件

```
Doris 3.x 数据源已成功接入数据资产平台，并完成元数据同步配置；

建表语句如下:
CREATE TABLE IF NOT EXISTS vehicle_sales (
    sale_id BIGINT COMMENT '销售记录ID',
    vin VARCHAR(17) COMMENT '车辆VIN码',
    model_name VARCHAR(50) COMMENT '车型名称',
    sale_price DECIMAL(18,2) COMMENT '销售价格(万元)',
    sale_date DATE COMMENT '销售日期',
    dealer_name VARCHAR(100) COMMENT '经销商名称',
    customer_name VARCHAR(50) COMMENT '客户姓名'
)
ENGINE=OLAP
DUPLICATE KEY(sale_id)
DISTRIBUTED BY HASH(sale_id) BUCKETS 10
PROPERTIES (
    replication_num = 1);

INSERT INTO vehicle_sales VALUES 
(1001, 'LFPHFDEB3R2S12345', '岚图FREE', 31.88, '2025-09-01', '武汉岚图中心', '张三'),
(1002, 'LFPHFDEB3R2S12346', '岚图梦想家', 45.99, '2025-09-02', '北京岚图体验店', '李四');

INSERT INTO vehicle_sales VALUES 
(1003, 'LFPHFDEB3R2S12347', '岚图追光', -5.00, '2025-09-03', '上海岚图空间', '王五'),  -- 价格非法
(1004, '', '岚图FREE', 32.88, '2025-09-04', '广州岚图展厅', '赵六');               -- VIN为空
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【脏数据管理】页面 | 1) 进入成功 |
| 2 | 点击「编辑」按钮, 「数据存储时效」改为1天后确定 | 授权的质量项目的数据源默认开启脏数据存储 |
| 3 | 进入「规则任务配置」页面, 点击「新建监控规则」按钮，进入监控规则配置页面 | 修改成功 |
| 4 | 配置「数据源」「数据库」「数据表」等信息，选择【完整性校验】规则 | 进入成功 |
| 5 | 「校验类型」选择「字段级」 「字段」选择「vin」 「统计函数」 选择「空值数」 「期望值」选择「=0」 「过滤条件」 无 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 选择成功，展示【完整性校验】规则配置项 |
| 6 | 保存后, 配置周期调度后完成新建监控规则 | 配置完成 |
| 7 | 立即执行 | 规则添加成功 |
| 8 | 第二天查看该脏数据表 | 1) 执行成功, 任务实例的状态由运行中 > 校验失败 |
| 9 |  | 脏数据表生成，且表数据正确 |
| 10 |  | 该脏数据表被删除 |

### 质量报告

##### 【P0】验证「质量报告」中 Doris 3.x 功能正常

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
| 4 | 「校验类型」选择「表级」 「统计函数」 选择「表行数」 「过滤条件」 无 「校验方法」选择「固定值」 「期望值」选择「>5」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「调度属性」 | 调度属性配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 任务实例状态由「运行中」 > 「校验通过」 |
| 9 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 任务运行完成后, 自动生成对应质量报告 |
| 10 | 点击查看报告 | 下钻到数据表质量报告页面, 数据显示正常 |

##### 【P1】验证「质量报告」中 Doris 3.x 数据源质量报告的查询功能正常

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 进入成功 |
| 2 | 输入报告名称 ${name}, 进行查询 | 查询出报告名称中所有包含${name}的记录 |
| 3 | 置空所有查询条件, 输入表名${name3}, 修改人${person3}, 进行查询 | 查询出表名包含${name3}且最近修改人为${person3}的规则记录 |
| 4 | 置空所有查询条件, 切换分页组件为「10条/页」 | 当前页面规则数量变更为10条 |
| 5 | 点击页码 | 跳转至对应的页码页面 |
| 6 | 点击“<” | 向前翻页 |
| 7 | 点击“>” | 向后翻页 |
| 8 | 切换每页展示数量 | 每页展示记录数为切换后的数量 |

### 任务实例查询

##### 【P1】验证「任务实例查询」中 Doris 3.x 数据源任务实例的查询功能正常

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【任务实例查询】页面 | 进入成功 |
| 2 | 输入表名/任务名称 ${name}, 进行查询 | 查询出「表」的表名中所有包含${name}的规则记录 |
| 3 | 置空所有查询条件, 输入不存在表名${name2}, 进行查询 | 显示「暂无数据」 |
| 4 | 置空所有查询条件, 输入表名${name3}, 修改人${person3}, 进行查询 | 查询出表名包含${name3}且最近修改人为${person3}的规则记录 |
| 5 | 置空所有查询条件, 勾选「我收藏的表」 | 查询出操作中仅为「取消收藏」的表 |
| 6 | 置空所有查询条件, 切换分页组件为「10条/页」 | 当前页面规则数量变更为10条 |
| 7 | 点击页码 | 跳转至对应的页码页面 |
| 8 | 点击“<” | 向前翻页 |
| 9 | 点击“>” | 向后翻页 |
| 10 | 切换每页展示数量 | 每页展示记录数为切换后的数量 |

### 规则任务配置

##### 【P0】验证「规则任务配置」中 Doris 3.x 数据源规则任务的周期调度设置功能正常

> 前置条件

```
「数据资产-平台管理-数据源管理」中已存在Doris 3.x数据源并且已授权.
数据源下存在Doirs表, 可进入离线平台中创建并执行DorisSQL任务:

DROP TABLE IF EXISTS vehicle_info_part6;

CREATE TABLE vehicle_info_part6 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part6 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

SELECT * FROM vehicle_info_part6;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「数据源」「数据库」「数据表」等信息，选择【完整性校验】规则 | 选择成功，展示【完整性校验】规则配置项 |
| 4 | 「校验类型」选择「表级」 「统计函数」 选择「表行数」 「过滤条件」 无 「校验方法」选择「固定值」 「期望值」选择「>5」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，保持默认「调度配置」 | 调度属性配置完成 |
| 7 | 点击「保存」按钮 | 规则保存成功 |
| 8 | 等待周期运行 | T+1 00:00 生成任务实例, 状态由「运行中」 > 「校验通过」 |

##### 【P2】验证「规则任务配置」中 Doris 3.x 数据源规则任务的删除功能正常

> 前置条件

```
已存在至少一条规则任务
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 选择一条规则任务, 点击删除按钮 | 删除成功 |

##### 【P2】验证「规则任务配置」中 Doris 3.x 数据源规则任务的查询功能正常

> 前置条件

```
已存在不同表名的规则任务>=11个
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 输入表名${name}, 进行查询 | 查询出「表」的表名中所有包含${name}的规则记录 |
| 3 | 置空所有查询条件, 输入不存在表名${name2}, 进行查询 | 显示「暂无数据」 |
| 4 | 置空所有查询条件, 输入表名${name3}, 修改人${person3}, 进行查询 | 查询出表名包含${name3}且最近修改人为${person3}的规则记录 |
| 5 | 置空所有查询条件, 勾选「我收藏的表」 | 查询出操作中仅为「取消收藏」的表 |
| 6 | 置空所有查询条件, 切换分页组件为「10条/页」 | 当前页面规则数量变更为10条 |
| 7 | 点击页码 | 跳转至对应的页码页面 |
| 8 | 点击“<” | 向前翻页 |
| 9 | 点击“>” | 向后翻页 |
| 10 | 切换每页展示数量 | 每页展示记录数为切换后的数量 |

##### 【P2】验证「规则任务配置」中 Doris 3.x 数据源规则任务的编辑功能正常

> 前置条件

```
「规则任务配置」页面已存在一条「完整性校验-单表校验」规则配置记录${rule}
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 选择规则${rule}, 点击「编辑」 | 进入编辑页面的「监控对象」部分 |
| 3 | 点击「下一步」 | 配置项回显内容为${最近保存的数据} |
| 4 | 编辑「完整性校验」规则: 「校验类型」选择「单表」 「统计函数」 选择「表行数」 「过滤条件」 无 「校验方法」选择「固定值」 「期望值」选择「<5」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 支持修改规则名称 |
| 5 | 点击「保存」按钮 | 数据源/库/表呈现置灰状态, 不支持修改 |
| 6 | 点击「下一步」, 点击「完成」 | 进入编辑页面的「监控规则」部分 |
| 7 | 立即运行、周期运行 | 配置项回显内容为${最近保存的数据} |
| 8 |  | 所有选项均支持修改 |
| 9 |  | 配置完成 |
| 10 |  | 规则配置保存正确 |
| 11 |  | 规则编辑成功 |
| 12 |  | 任务实例状态由「运行中」 > 「校验异常」 |

##### 【P0】验证「规则任务配置」中 Doris 3.x 数据源「规则集」功能正常

> 前置条件

```
「数据资产-平台管理-数据源管理」中已存在Doris 3.x数据源并且已授权.
数据源下存在Doirs表, 可进入离线平台中创建并执行DorisSQL任务:

DROP TABLE IF EXISTS vehicle_info_part1;

CREATE TABLE vehicle_info_part1 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part1 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

-- p20251002 分区（2025-10-02）
INSERT INTO vehicle_info_part1 VALUES
('LDP91C60PE200006','追光','EV','H53a','长续航','四驱','N3',1,'2025-10-02'),
('LDP91C60PE200007','追光','EV','H53a','长续航','两驱','N5',1,'2025-10-02'),
('LDP91C60PE200008','梦想家','PHEV','H72','常规','四驱','N3',0,'2025-10-02'),
('LDP91C60PE200009','梦想家','PHEV','H72','常规','四驱','N5',1,'2025-10-02'),
('LDP91C60PE200010','梦想家','PHEV','H72','长续航','两驱','N3',1,'2025-10-02');

SELECT * FROM vehicle_info_part1;

DROP TABLE IF EXISTS vehicle_info_part2;

CREATE TABLE vehicle_info_part2 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251003 VALUES [('2025-10-03'), ('2025-10-04')),
  PARTITION p20251004 VALUES [('2025-10-04'), ('2025-10-05'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251003 分区（2025-10-03）
INSERT INTO vehicle_info_part2 VALUES
('LDP91C60PE200001','追光','PHEV','H53a','常规','四驱','N3',1,'2025-10-03'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-03'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-03'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-03'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-03');

-- p20251004 分区（2025-10-04）
INSERT INTO vehicle_info_part2 VALUES
('LDP91C60PE200006','追光','EV','H53a','长续航','四驱','N3',1,'2025-10-04'),
('LDP91C60PE200007','追光','EV','H53a','长续航','两驱','N5',1,'2025-10-04'),
('LDP91C60PE200008','梦想家','PHEV','H72','常规','四驱','N3',0,'2025-10-04'),
('LDP91C60PE200009','梦想家','PHEV','H72','常规','四驱','N5',1,'2025-10-04'),
('LDP91C60PE200010','梦想家','PHEV','H72','长续航','两驱','N3',1,'2025-10-04'),
('LDP91C60PE200011','梦想家','PHEV','H72','长续航','两驱','N3',1,'2025-10-04');

SELECT * FROM vehicle_info_part2;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 成功进入【规则任务配置】页面，页面内容正常加载显示，无报错 |
| 2 | 点击【新建规则集】按钮，配置基础信息 | 进入规则集配置页面 |
| 3 | 导入规则集文件，点击【下一步】按钮 | 规则集文件导入成功，显示规则内容 |
| 4 | 点击【完成】按钮保存规则集 | 规则集保存成功 |
| 5 | 选择该规则集，点击【立即运行】按钮，等待任务执行完成 | 任务执行完成，校验结果为「不通过」 |

##### 【P0】验证「规则任务配置」中 Doris 3.x 数据源「多表比对规则」功能正常

> 前置条件

```
「数据资产-平台管理-数据源管理」中已存在Doris 3.x数据源并且已授权.
数据源下存在Doirs表, 可进入离线平台中创建并执行DorisSQL任务:

DROP TABLE IF EXISTS vehicle_info_part1;

CREATE TABLE vehicle_info_part1 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part1 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

-- p20251002 分区（2025-10-02）
INSERT INTO vehicle_info_part1 VALUES
('LDP91C60PE200006','追光','EV','H53a','长续航','四驱','N3',1,'2025-10-02'),
('LDP91C60PE200007','追光','EV','H53a','长续航','两驱','N5',1,'2025-10-02'),
('LDP91C60PE200008','梦想家','PHEV','H72','常规','四驱','N3',0,'2025-10-02'),
('LDP91C60PE200009','梦想家','PHEV','H72','常规','四驱','N5',1,'2025-10-02'),
('LDP91C60PE200010','梦想家','PHEV','H72','长续航','两驱','N3',1,'2025-10-02');

SELECT * FROM vehicle_info_part1;

DROP TABLE IF EXISTS vehicle_info_part2;

CREATE TABLE vehicle_info_part2 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251003 VALUES [('2025-10-03'), ('2025-10-04')),
  PARTITION p20251004 VALUES [('2025-10-04'), ('2025-10-05'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251003 分区（2025-10-03）
INSERT INTO vehicle_info_part2 VALUES
('LDP91C60PE200001','追光','PHEV','H53a','常规','四驱','N3',1,'2025-10-03'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-03'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-03'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-03'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-03');

-- p20251004 分区（2025-10-04）
INSERT INTO vehicle_info_part2 VALUES
('LDP91C60PE200006','追光','EV','H53a','长续航','四驱','N3',1,'2025-10-04'),
('LDP91C60PE200007','追光','EV','H53a','长续航','两驱','N5',1,'2025-10-04'),
('LDP91C60PE200008','梦想家','PHEV','H72','常规','四驱','N3',0,'2025-10-04'),
('LDP91C60PE200009','梦想家','PHEV','H72','常规','四驱','N5',1,'2025-10-04'),
('LDP91C60PE200010','梦想家','PHEV','H72','长续航','两驱','N3',1,'2025-10-04'),
('LDP91C60PE200011','梦想家','PHEV','H72','长续航','两驱','N3',1,'2025-10-04');

SELECT * FROM vehicle_info_part2;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 成功进入【规则任务配置】页面，页面内容正常加载显示，无报错 |
| 2 | 点击【新建监控规则】按钮，选择「多表比对」规则类型 | 进入多表比对规则配置页面 |
| 3 | 配置源表和目标表，选择比对字段和比对规则 | 源表和目标表配置成功 |
| 4 | 点击【下一步】按钮, 点击【完成】按钮保存规则 | 规则保存成功 |
| 5 | 选择该规则，点击【立即运行】按钮，等待任务执行完成 | 任务执行完成，校验结果为「不通过」 |

##### 【P2】验证「规则任务配置」中 Doris 3.x 数据源「自定义SQL」功能正常

> 前置条件

```
「数据资产-平台管理-数据源管理」中已存在Doris 3.x数据源并且已授权.
数据源下存在Doirs表, 可进入离线平台中创建并执行DorisSQL任务:

DROP TABLE IF EXISTS vehicle_info_part1;

CREATE TABLE vehicle_info_part1 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part1 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

-- p20251002 分区（2025-10-02）
INSERT INTO vehicle_info_part1 VALUES
('LDP91C60PE200006','追光','EV','H53a','长续航','四驱','N3',1,'2025-10-02'),
('LDP91C60PE200007','追光','EV','H53a','长续航','两驱','N5',1,'2025-10-02'),
('LDP91C60PE200008','梦想家','PHEV','H72','常规','四驱','N3',0,'2025-10-02'),
('LDP91C60PE200009','梦想家','PHEV','H72','常规','四驱','N5',1,'2025-10-02'),
('LDP91C60PE200010','梦想家','PHEV','H72','长续航','两驱','N3',1,'2025-10-02');

SELECT * FROM vehicle_info_part1;

DROP TABLE IF EXISTS vehicle_info_part2;

CREATE TABLE vehicle_info_part2 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251003 VALUES [('2025-10-03'), ('2025-10-04')),
  PARTITION p20251004 VALUES [('2025-10-04'), ('2025-10-05'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251003 分区（2025-10-03）
INSERT INTO vehicle_info_part2 VALUES
('LDP91C60PE200001','追光','PHEV','H53a','常规','四驱','N3',1,'2025-10-03'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-03'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-03'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-03'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-03');

-- p20251004 分区（2025-10-04）
INSERT INTO vehicle_info_part2 VALUES
('LDP91C60PE200006','追光','EV','H53a','长续航','四驱','N3',1,'2025-10-04'),
('LDP91C60PE200007','追光','EV','H53a','长续航','两驱','N5',1,'2025-10-04'),
('LDP91C60PE200008','梦想家','PHEV','H72','常规','四驱','N3',0,'2025-10-04'),
('LDP91C60PE200009','梦想家','PHEV','H72','常规','四驱','N5',1,'2025-10-04'),
('LDP91C60PE200010','梦想家','PHEV','H72','长续航','两驱','N3',1,'2025-10-04'),
('LDP91C60PE200011','梦想家','PHEV','H72','长续航','两驱','N3',1,'2025-10-04');

SELECT * FROM vehicle_info_part2;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「数据源」「数据库」「数据表」vehicle_info_part1等信息，选择【自定义SQL】规则 | 选择成功，展示【自定义SQL】规则配置项 |
| 4 | 「sql」输入「SELECT * FROM vehicle_info_part1 WHERE is_certific IS NULL;」 「校验方法」选择「固定值」 「期望值」选择「=1」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「调度属性」 | 调度属性配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 任务实例状态由「运行中」 > 「校验通过」 |
| 9 | 进入「规则任务配置」页面, 重新编辑任务规则: 「期望值」改为「=0」 其他保持不变, 重新运行 | 任务实例详情弹窗中存在「校验通过」的标识 |
| 10 | 点击「查看明细」 | 不记录明细数据； |
| 11 | 进入「离线开发-周期任务」页面, 执行DROP语句删除vehicle_info_part1表后, 返回资产平台重新运行规则任务 | 1) 任务实例状态由「运行中」 > 「校验异常」 |
| 12 | 点击「查看日志」 | 任务实例详情页面显示「校验未通过」标识, 可支持查看明细, 明细按照表和校验字段记录不符合规则的数值 |
| 13 |  | 展示校验表明细数据 |
| 14 |  | 1) 任务实例状态由「运行中」 > 「校验异常」 |
| 15 |  | 任务实例详情页面显示「校验失败」标识, 可支持查看日志 |
| 16 |  | 表已删除, Unknown table 'test_iqr_outliers' |

##### 【P1】验证「规则任务配置」中 Doris 3.x 数据源「唯一性校验」功能正常

> 前置条件

```
「数据资产-平台管理-数据源管理」中已存在Doris 3.x数据源并且已授权.
数据源下存在Doirs表, 可进入离线平台中创建并执行DorisSQL任务:

DROP TABLE IF EXISTS vehicle_info_part1;

CREATE TABLE vehicle_info_part1 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part1 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

-- p20251002 分区（2025-10-02）
INSERT INTO vehicle_info_part1 VALUES
('LDP91C60PE200006','追光','EV','H53a','长续航','四驱','N3',1,'2025-10-02'),
('LDP91C60PE200007','追光','EV','H53a','长续航','两驱','N5',1,'2025-10-02'),
('LDP91C60PE200008','梦想家','PHEV','H72','常规','四驱','N3',0,'2025-10-02'),
('LDP91C60PE200009','梦想家','PHEV','H72','常规','四驱','N5',1,'2025-10-02'),
('LDP91C60PE200010','梦想家','PHEV','H72','长续航','两驱','N3',1,'2025-10-02');

SELECT * FROM vehicle_info_part1;

DROP TABLE IF EXISTS vehicle_info_part2;

CREATE TABLE vehicle_info_part2 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251003 VALUES [('2025-10-03'), ('2025-10-04')),
  PARTITION p20251004 VALUES [('2025-10-04'), ('2025-10-05'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251003 分区（2025-10-03）
INSERT INTO vehicle_info_part2 VALUES
('LDP91C60PE200001','追光','PHEV','H53a','常规','四驱','N3',1,'2025-10-03'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-03'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-03'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-03'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-03');

-- p20251004 分区（2025-10-04）
INSERT INTO vehicle_info_part2 VALUES
('LDP91C60PE200006','追光','EV','H53a','长续航','四驱','N3',1,'2025-10-04'),
('LDP91C60PE200007','追光','EV','H53a','长续航','两驱','N5',1,'2025-10-04'),
('LDP91C60PE200008','梦想家','PHEV','H72','常规','四驱','N3',0,'2025-10-04'),
('LDP91C60PE200009','梦想家','PHEV','H72','常规','四驱','N5',1,'2025-10-04'),
('LDP91C60PE200010','梦想家','PHEV','H72','长续航','两驱','N3',1,'2025-10-04'),
('LDP91C60PE200011','梦想家','PHEV','H72','长续航','两驱','N3',1,'2025-10-04');

SELECT * FROM vehicle_info_part2;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「数据源」「数据库」「数据表」vehicle_info_part1等信息，选择【唯一性校验】规则 | 选择成功，展示【唯一性校验】规则配置项 |
| 4 | 「字段」选择「vin」 「统计函数」选择「重复数」 「校验方法」选择「固定值」 「期望值」选择「=0」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「调度属性」 | 调度属性配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 任务实例状态由「运行中」 > 「校验通过」 |
| 9 | 进入「规则任务配置」页面, 重新编辑任务规则: 「期望值」改为「>0」 其他保持不变, 重新运行 | 任务实例详情弹窗中存在「校验通过」的标识 |
| 10 | 点击「查看明细」 | 不记录明细数据； |
| 11 | 进入「离线开发-周期任务」页面, 执行DROP语句删除vehicle_info_part1表后, 返回资产平台重新运行规则任务 | 1) 任务实例状态由「运行中」 > 「校验异常」 |
| 12 | 点击「查看日志」 | 任务实例详情页面显示「校验未通过」标识, 可支持查看明细, 明细按照表和校验字段记录不符合规则的数值 |
| 13 |  | 展示校验表明细数据 |
| 14 |  | 1) 任务实例状态由「运行中」 > 「校验异常」 |
| 15 |  | 任务实例详情页面显示「校验失败」标识, 可支持查看日志 |
| 16 |  | 表已删除, Unknown table 'vehicle_info_part1' |

##### 【P1】验证「规则任务配置」中 Doris 3.x 数据源「有效性校验」功能正常

> 前置条件

```
「数据资产-平台管理-数据源管理」中已存在Doris 3.x数据源并且已授权.
数据源下存在Doirs表, 可进入离线平台中创建并执行DorisSQL任务:

DROP TABLE IF EXISTS vehicle_info_part1;

CREATE TABLE vehicle_info_part1 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part1 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

-- p20251002 分区（2025-10-02）
INSERT INTO vehicle_info_part1 VALUES
('LDP91C60PE200006','追光','EV','H53a','长续航','四驱','N3',1,'2025-10-02'),
('LDP91C60PE200007','追光','EV','H53a','长续航','两驱','N5',1,'2025-10-02'),
('LDP91C60PE200008','梦想家','PHEV','H72','常规','四驱','N3',0,'2025-10-02'),
('LDP91C60PE200009','梦想家','PHEV','H72','常规','四驱','N5',1,'2025-10-02'),
('LDP91C60PE200010','梦想家','PHEV','H72','长续航','两驱','N3',1,'2025-10-02');

SELECT * FROM vehicle_info_part1;

DROP TABLE IF EXISTS vehicle_info_part2;

CREATE TABLE vehicle_info_part2 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251003 VALUES [('2025-10-03'), ('2025-10-04')),
  PARTITION p20251004 VALUES [('2025-10-04'), ('2025-10-05'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251003 分区（2025-10-03）
INSERT INTO vehicle_info_part2 VALUES
('LDP91C60PE200001','追光','PHEV','H53a','常规','四驱','N3',1,'2025-10-03'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-03'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-03'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-03'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-03');

-- p20251004 分区（2025-10-04）
INSERT INTO vehicle_info_part2 VALUES
('LDP91C60PE200006','追光','EV','H53a','长续航','四驱','N3',1,'2025-10-04'),
('LDP91C60PE200007','追光','EV','H53a','长续航','两驱','N5',1,'2025-10-04'),
('LDP91C60PE200008','梦想家','PHEV','H72','常规','四驱','N3',0,'2025-10-04'),
('LDP91C60PE200009','梦想家','PHEV','H72','常规','四驱','N5',1,'2025-10-04'),
('LDP91C60PE200010','梦想家','PHEV','H72','长续航','两驱','N3',1,'2025-10-04'),
('LDP91C60PE200011','梦想家','PHEV','H72','长续航','两驱','N3',1,'2025-10-04');

SELECT * FROM vehicle_info_part2;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「数据源」「数据库」「数据表」vehicle_info_part1等信息，选择【有效性校验】规则 | 选择成功，展示【有效性校验】规则配置项 |
| 4 | 「字段」选择「vin」 「统计规则」选择「字符串长度」「固定值」「=16」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「调度属性」 | 调度属性配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 任务实例状态由「运行中」 > 「校验通过」 |
| 9 | 进入「规则任务配置」页面, 重新编辑任务规则: 「期望值」改为「>16」 其他保持不变, 重新运行 | 任务实例详情弹窗中存在「校验通过」的标识 |
| 10 | 点击「查看明细」 | 不记录明细数据； |
| 11 | 进入「离线开发-周期任务」页面, 执行DROP语句删除vehicle_info_part1表后, 返回资产平台重新运行规则任务 | 1) 任务实例状态由「运行中」 > 「校验异常」 |
| 12 | 点击「查看日志」 | 任务实例详情页面显示「校验未通过」标识, 可支持查看明细, 明细按照表和校验字段记录不符合规则的数值 |
| 13 |  | 展示校验表明细数据 |
| 14 |  | 1) 任务实例状态由「运行中」 > 「校验异常」 |
| 15 |  | 任务实例详情页面显示「校验失败」标识, 可支持查看日志 |
| 16 |  | 表已删除, Unknown table 'vehicle_info_part1' |

##### 【P1】验证「规则任务配置」中 Doris 3.x 数据源 「完整性校验-表级」功能正常

> 前置条件

```
「数据资产-平台管理-数据源管理」中已存在Doris 3.x数据源并且已授权.
数据源下存在Doirs表, 可进入离线平台中创建并执行DorisSQL任务:

DROP TABLE IF EXISTS vehicle_info_part6;

CREATE TABLE vehicle_info_part6 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part6 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

SELECT * FROM vehicle_info_part6;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「数据源」「数据库」「数据表」等信息，选择【完整性校验】规则 | 选择成功，展示【完整性校验】规则配置项 |
| 4 | 「校验类型」选择「表级」 「统计函数」 选择「表行数」 「过滤条件」 无 「校验方法」选择「固定值」 「期望值」选择「>5」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，「调度属性」默认配置 | 调度属性配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 任务实例状态由「运行中」 > 「校验通过」 |
| 9 | 进入「规则任务配置」页面, 重新编辑任务规则, 将「期望值」改为「<5」, 其他保持不变, 重新运行 | 任务实例详情页面显示「校验未通过」标识 |
| 10 | 进入「离线开发-周期任务」页面, 执行DROP语句删除vehicle_info_part6表后, 返回资产平台重新运行规则任务 | 1) 任务实例状态由「运行中」 > 「校验异常」 |
| 11 | 点击「查看日志」 | 任务实例详情页面显示「校验失败」标识, 可支持查看日志 |
| 12 |  | 表已删除, Unknown table 'vehicle_info_part6' |

##### 【P0】验证「规则任务配置」中 Doris 3.x 数据源 「完整性校验-字段级」功能正常

> 前置条件

```
「数据资产-平台管理-数据源管理」中已存在Doris 3.x数据源并且已授权.
数据源下存在Doirs表, 可进入离线平台中创建并执行DorisSQL任务:

DROP TABLE IF EXISTS vehicle_info_part6;

CREATE TABLE vehicle_info_part6 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part6 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

SELECT * FROM vehicle_info_part6;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「数据源」「数据库」「数据表」等信息，选择【完整性校验】规则 | 选择成功，展示【完整性校验】规则配置项 |
| 4 | 「校验类型」选择「字段级」 「字段」选择「is_certific」 「统计函数」 选择「空值数」 「期望值」选择「=1」 「过滤条件」 无 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，「调度属性」默认配置 | 调度属性配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 任务实例状态由「运行中」 > 「校验通过」 |
| 9 | 进入「规则任务配置」页面, 重新编辑任务规则, 将「期望值」改为「=0」, 其他保持不变, 重新运行 | 1) 任务实例状态由「运行中」 > 「校验异常」 |
| 10 | 点击「查看明细」 | 任务实例详情页面显示「校验未通过」标识, 可支持查看明细 |
| 11 | 进入「离线开发-周期任务」页面, 执行DROP语句删除vehicle_info_part6表后, 返回资产平台重新运行规则任务 | 展示is_certific为--的行记录 |
| 12 | 点击「查看日志」 | 1) 任务实例状态由「运行中」 > 「校验异常」 |
| 13 |  | 任务实例详情页面显示「校验失败」标识, 可支持查看日志 |
| 14 |  | 表已删除, Unknown table 'vehicle_info_part6' |

### 概览

##### 【P1】验证「数据质量概览」页面中 Doris 3.x 数据源的规则任务统计展示正常

> 前置条件

```
1) Doris 3.x 数据源已引入资产平台并授权给质量项目
2) 已配置并执行了至少一条 Doris 3.x 数据源的规则任务，且存在校验通过和校验失败的实例记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【概览】页面 | 进入成功，概览页面正常加载 |
| 2 | 查看概览中的规则任务统计数据 | 1) 概览中的规则任务总数统计包含 Doris 3.x 数据源的任务 |
| 3 | 查看告警列表中的 Doris 3.x 相关记录 | 校验通过/校验失败/校验异常的统计数据准确反映 Doris 3.x 规则任务的执行结果 |
| 4 | 点击告警列表中 Doris 3.x 表的表名链接 | 如 Doris 3.x 规则任务存在告警，告警列表中正确展示告警记录，包含表名、告警次数等信息 |
| 5 |  | 跳转至对应的规则任务详情页面，展示该 Doris 3.x 表的规则配置和执行结果信息 |

## 元数据

### 元数据管理

##### 【P1】验证「元数据管理」中 Doris 3.x 表详情页各tab信息展示完整性

> 前置条件

```
1) Doris 3.x 数据源已引入资产平台，元数据同步完成
2) 存在已同步的 Doris 3.x 数据表 vehicle_info_part1，且已配置过业务属性
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【元数据】-【元数据管理】页面 | 进入成功 |
| 2 | 选择数据源类型为「Doris 3.x」的数据源，点击进入 | 进入成功，展示 Doris 3.x 数据源下的数据库列表 |
| 3 | 点击数据库，进入数据表页面，点击 vehicle_info_part1 表名进入表详情 | 进入 vehicle_info_part1 表详情页面 |
| 4 | 查看「基本信息」tab中的技术属性 | 技术属性正确展示: 表名、所属数据源(Doris 3.x)、所属数据库、表引擎、建表时间、最近同步时间等 |
| 5 | 查看「基本信息」tab中的业务属性 | 业务属性正确展示: 表中文名、负责人等已维护的通用业务属性值与之前配置一致 |
| 6 | 点击「字段信息」tab | 1) 展示所有字段列表 |
| 7 | 点击「变更记录」tab | 每个字段显示: 字段名、字段类型、字段注释等信息 |
| 8 |  | 字段信息与实际 Doris 表结构一致 |
| 9 |  | 展示该表的元数据变更记录（如有），包含变更时间、变更类型、变更内容 |

##### 【P1】验证 「元数据」中 Doris 3.x 数据源删除库操作

> 前置条件

```
「元数据管理」页面中已存在从离线平台中同步过来的Doris 3.x数据源
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【元数据】-【元数据管理】页面 | 进入成功 |
| 2 | 选择数据源类型为「Doris 3.x」的数据源, 点击进入 | 进入成功 |
| 3 | 点击数据库, 选择一条记录, 点击「删除」按钮 | 1) 弹出二次确认弹窗 |
| 4 | 输入「数据库名」后, 点击删除按钮 | 删除库表操作仅针对资产平台内生效，不会影响底层数据库表信息 |
| 5 | 进入「离线开发-数据开发-周期任务」, 创建DorisSQL任务, 执行查询语句: USE ${db_name}; | 1) 弹窗关闭, 该表信息从资产平台中删除完成 |
| 6 |  | 可以通过元数据同步中, 重新将该库表同步至资产平台 |
| 7 |  | SQL任务运行成功, 源库仍存在 |

##### 【P2】验证 「元数据」中 Doris 3.x 数据表生命周期设置功能

> 前置条件

```
「元数据管理」页面中已存在同步过来的Doris 3.x数据表记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【元数据】-【元数据管理】页面 | 进入成功 |
| 2 | 选择数据源类型为「Doris 3.x」的数据源, 点击进入 | 进入成功 |
| 3 | 点击数据库, 进入数据表页面, 选择一条记录, 点击「批量编辑生命周期」按钮 | 1) 弹出「批量编辑生命周期」弹窗 |
| 4 | 「生命周期」选择3天, 点击「确定」 | 支持修改Doris 3.x数据表的生命周期 |
| 5 | 点击「元数据管理」, 返回到数据源列表页面 | 生命周期支持: 3天/7天/30天/90天/365天/自定义 |
| 6 | 选择数据源类型为Doris 3.x的数据源, 点击「批量编辑生命周期」 | 选择「自定义」后最大输入9999天 |
| 7 | 「生命周期」选择3天, 点击「确定」 | 弹窗关闭, 该表的「表生命周期」变更为3天 |
| 8 |  | 返回成功 |
| 9 |  | 弹出「批量修改生命周期」弹窗 |
| 10 |  | 1) 弹窗关闭, 该数据源下所有的「表生命周期」变更为3天 |
| 11 |  | 后续在该数据源内新增的数据表也会默认配置为3天 |

##### 【P1】验证 「元数据」中 Doris 3.x 数据源删除表操作

> 前置条件

```
「元数据管理」页面中已存在从离线平台中同步过来的Doris 3.x数据源
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【元数据】-【元数据管理】页面 | 进入成功 |
| 2 | 选择数据源类型为「Doris 3.x」的数据源, 点击进入 | 进入成功 |
| 3 | 点击数据库, 进入数据表页面, 选择一条记录, 点击「删除」按钮 | 1) 弹出二次确认弹窗: 「确定删除表${table}吗?」 |
| 4 | 「删除方式」选择「删除元数据表」, 输入${表名}后, 点击「确定」 | 删除方式支持删除元数据表和删除源表 |
| 5 | 进入「离线开发-数据开发-周期任务」, 创建DorisSQL任务, 执行查询语句: SELECT * FROM ${table}; | 输入的表名一致后可删除表 |
| 6 | 返回「资产平台-元数据管理」中, 再次选择一条记录, 点击删除按钮, 选择「删除源表」, 输入${表名2}后, 点击「确定」 | 1) 弹窗关闭, 该表信息从资产平台及其他子产品中删除完成 |
| 7 | 进入「离线开发-数据开发-周期任务」, 创建DorisSQL任务, 执行查询语句: SELECT * FROM ${table2}; | 可以通过元数据同步中, 重新将该表同步至资产平台 |
| 8 |  | SQL任务运行成功, 源表仍存在 |
| 9 |  | 弹窗关闭, 该表信息从源库中删除 |
| 10 |  | SQL任务运行失败, 源表不存在 |

### 元模型管理

##### 【P2】验证 「元数据」中 Doris 3.x 元模型配置功能正常

> 前置条件

```
资产平台已自动对接离线平台中带Meta标识的Doris 3.x数据源
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【元数据】-【元模型管理】页面 | 进入成功 |
| 2 | 下滑找到Doris 3.x元模型 | doris3.x元模型位置在2.x的右侧 |
| 3 | 点击「编辑元模型」 | Doris 3.x支持采集的技术属性信息和Doris 2.x保持一致 |

##### 【P2】验证 「元数据」中 Doris 3.x 数据表业务/个性属性维护功能

> 前置条件

```
「元数据管理」页面中已存在同步过来的Doris 3.x数据表记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【元数据】-【元模型管理】页面 | 进入成功 |
| 2 | 下滑找到Doris 3.x元模型, 点击「编辑元模型」 | 1) 展示的技术属性与Doris 2.x保持一致 |
| 3 | 进入【数据资产】-【元数据】-【元数据管理】页面 | 支持维护通用业务属性、个性业务属性 |
| 4 | 选择数据源类型为「Doris 3.x」的数据源, 点击进入 | 通用业务属性默认存在两个字段: 表中文名和负责人 |
| 5 | 点击数据库, 进入数据表页面, 选择一条记录, 点击「编辑」按钮 | 进入成功 |
| 6 | 「负责人」选择选项 「表中文名」输入测试 配置完成后, 点击保存 | 进入成功 |
| 7 |  | 1) 弹出「表元数据」弹窗 |
| 8 |  | 支持编辑通用业务属性中的字段值 |
| 9 |  | 返回数据表列表页面, toast提示: 业务属性保存成功, 数据表预览内容同步更新 |

### 元数据同步

##### 【P2】验证 Doris 3.x 特有字段类型（JSON/ARRAY/MAP）的元数据采集正确性

> 前置条件

```
| 1) Doris 3.x 数据源已引入资产平台
2) 已在 Doris 3.x 中创建包含特有字段类型的测试表:
CREATE TABLE IF NOT EXISTS doris3x_type_test (
    id BIGINT COMMENT '主键',
    json_data JSON COMMENT 'JSON数据',
    map_data MAP COMMENT 'MAP类型',
    arr_data ARRAY COMMENT '数组类型',
    struct_data STRUCT COMMENT '结构体类型'
) ENGINE=OLAP
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (replication_num = 1);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【元数据】-【元数据同步】页面 | 进入成功 |
| 2 | 新增周期同步任务，「数据源」选择 Doris 3.x 数据源，「数据库」选择建表所在数据库，「数据表」选择 doris3x_type_test | 配置成功 |
| 3 | 点击「临时同步」按钮，等待同步完成 | 同步状态由「同步中」变更为「同步完成」 |
| 4 | 进入【数据资产】-【元数据】-【数据地图】页面，搜索「doris3x_type_test」 | 搜索结果中显示 doris3x_type_test 表记录，表来源显示 Doris 3.x |
| 5 | 点击表名进入表详情页面，查看「字段信息」tab | 1) 字段列表展示5个字段: id、json_data、map_data、arr_data、struct_data |
| 6 |  | 字段类型分别正确显示为: BIGINT、JSON、MAP<STRING,INT>、ARRAY<STRING>、STRUCTname:STRING,age:INT |
| 7 |  | 字段注释正确显示: 主键、JSON数据、MAP类型、数组类型、结构体类型 |
| 8 |  | 特有字段类型未被截断或显示为Unknown |

##### 【P1】验证「元数据同步」中 Doris 3.x 周期同步任务的编辑与删除功能正常

> 前置条件

```
已存在一条 Doris 3.x 的周期同步任务，「数据表」选择范围为指定表，「调度周期」为「周」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【元数据】-【元数据同步】页面 | 进入成功，列表中显示已配置的周期同步任务 |
| 2 | 选择 Doris 3.x 周期同步任务记录，点击「编辑」按钮 | 弹出编辑弹窗，展示当前同步任务的配置信息，数据源为 Doris 3.x |
| 3 | 修改「数据表」选择范围为「全部」，修改「调度周期」为「天」，点击「确定」 | 1) 编辑成功，Toast提示操作成功 |
| 4 | 选择该条同步任务记录，点击「删除」按钮 | 列表中该任务的配置信息更新: 「数据表」显示为「全部」，「调度周期」显示为「天」 |
| 5 | 在确认弹窗中，点击「确定」 | 弹出确认弹窗 |
| 6 |  | 1) 删除成功，Toast提示删除成功 |
| 7 |  | 列表中该条同步任务记录消失 |

##### 【P0】验证元数据同步后 Doris 3.x 表结构与字段信息采集正确性

> 前置条件

```
| 1) Doris 3.x 数据源已引入资产平台
2) 已在 Doris 3.x 中创建测试表:
CREATE TABLE IF NOT EXISTS sync_verify_test (
    id BIGINT COMMENT '主键ID',
    name VARCHAR(100) COMMENT '名称',
    amount DECIMAL(18,2) COMMENT '金额',
    created_date DATE COMMENT '创建日期',
    status TINYINT COMMENT '状态'
) ENGINE=OLAP
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (replication_num = 1);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【元数据】-【元数据同步】页面 | 进入成功 |
| 2 | 新增周期同步任务，「数据源」选择 Doris 3.x 数据源，「数据库」选择建表所在的数据库，「数据表」选择 sync_verify_test | 配置成功 |
| 3 | 点击「临时同步」按钮，等待同步完成 | 1) Toast提示「临时同步成功」 |
| 4 | 进入【数据资产】-【元数据】-【数据地图】页面，搜索「sync_verify_test」 | 同步状态由「同步中」变更为「同步完成」 |
| 5 | 点击表名进入表详情页面，查看「基本信息」 | 搜索结果中显示 sync_verify_test 表记录，表名右侧icon显示 Doris 3.x |
| 6 | 查看「字段信息」tab | 1) 「基本信息」中表名显示「sync_verify_test」 |
| 7 |  | 所属数据源显示正确的 Doris 3.x 数据源名称 |
| 8 |  | 所属数据库显示正确 |
| 9 |  | 表引擎、建表时间等技术属性正确展示 |
| 10 |  | 1) 字段列表展示5个字段: id、name、amount、created_date、status |
| 11 |  | 字段类型分别为: BIGINT、VARCHAR(100)、DECIMAL(18,2)、DATE、TINYINT |
| 12 |  | 字段注释(COMMENT)分别为: 主键ID、名称、金额、创建日期、状态 |
| 13 |  | 字段信息与实际 Doris 建表语句完全一致 |

##### 【P0】验证 「元数据」中 Doris 3.x 元数据周期同步功能正常

> 前置条件

```
1) 数据资产-平台管理-数据源管理中已存在Doris3.x数据源
2) Doris3.x数据源已授权给质量项目
3) Doris3.x底层数据源已存在数据表, 建表语句如下:

DROP TABLE IF EXISTS vehicle_info_part1;

CREATE TABLE vehicle_info_part1 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part1 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

SELECT * FROM vehicle_info_part1;

DROP TABLE IF EXISTS vehicle_info_part2;

CREATE TABLE vehicle_info_part2 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251003 VALUES [('2025-10-03'), ('2025-10-04')),
  PARTITION p20251004 VALUES [('2025-10-04'), ('2025-10-05'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251003 分区（2025-10-03）
INSERT INTO vehicle_info_part2 VALUES
('LDP91C60PE200011','知音','EREV','H60','常规','两驱','N3',0,'2025-10-03'),
('LDP91C60PE200012','知音','EREV','H60','常规','两驱','N3',1,'2025-10-03'),
('LDP91C60PE200013','知音','EREV','H60','长续航','四驱','N5',1,'2025-10-03'),
('LDP91C60PE200014','知音','EREV','H60','长续航','四驱','N5',NULL,'2025-10-03'),
('LDP91C60PE200015','知音','EREV','H60','常规','四驱','N3',1,'2025-10-03');

SELECT * FROM vehicle_info_part2;

DROP TABLE IF EXISTS vehicle_info_part3;

CREATE TABLE vehicle_info_part3 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part3 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

SELECT * FROM vehicle_info_part3;

DROP TABLE IF EXISTS vehicle_info_part4;

CREATE TABLE vehicle_info_part4 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part4 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

SELECT * FROM vehicle_info_part4;

DROP TABLE IF EXISTS vehicle_info_part5;

CREATE TABLE vehicle_info_part5 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part5 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

SELECT * FROM vehicle_info_part5;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【元数据】-【元数据同步】页面 | 进入成功 |
| 2 | 点击「新增周期同步任务」 | 弹出「新增周期同步任务」弹窗 |
| 3 | 「数据源」: ${建表所在的Doris 3.x数据源} 「数据库」: ${建表所在的Doris 3.x数据库} 「数据表」: vehicle_info_part4 ~5 | 配置成功 |
| 4 | 点击「下一步」, 保持默认选项, 点击「新增」按钮 | 1) 「新增周期同步任务」弹窗关闭, 并Toast提示: 新增周期同步任务成功 |
| 5 | 进入数据地图页面, 查询关键词vehicle_info_part | 同步状态为等待同步 |
| 6 |  | 等到第二天00:00, 同步状态变更为同步中, 等待一段时间后, 状态变更为同步完成 |
| 7 |  | 显示已同步的Doris 3.x的两张表 |

##### 【P1】验证 「元数据」中 Doris 3.x 元数据临时同步功能正常

> 前置条件

```
1) 数据资产-平台管理-数据源管理中已存在Doris3.x数据源
2) Doris3.x数据源已授权给质量项目
3) Doris3.x底层数据源已存在数据表, 建表语句如下:

DROP TABLE IF EXISTS vehicle_info_part1;

CREATE TABLE vehicle_info_part1 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part1 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

SELECT * FROM vehicle_info_part1;

DROP TABLE IF EXISTS vehicle_info_part2;

CREATE TABLE vehicle_info_part2 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251003 VALUES [('2025-10-03'), ('2025-10-04')),
  PARTITION p20251004 VALUES [('2025-10-04'), ('2025-10-05'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251003 分区（2025-10-03）
INSERT INTO vehicle_info_part2 VALUES
('LDP91C60PE200011','知音','EREV','H60','常规','两驱','N3',0,'2025-10-03'),
('LDP91C60PE200012','知音','EREV','H60','常规','两驱','N3',1,'2025-10-03'),
('LDP91C60PE200013','知音','EREV','H60','长续航','四驱','N5',1,'2025-10-03'),
('LDP91C60PE200014','知音','EREV','H60','长续航','四驱','N5',NULL,'2025-10-03'),
('LDP91C60PE200015','知音','EREV','H60','常规','四驱','N3',1,'2025-10-03');

SELECT * FROM vehicle_info_part2;

DROP TABLE IF EXISTS vehicle_info_part3;

CREATE TABLE vehicle_info_part3 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part3 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

SELECT * FROM vehicle_info_part3;

DROP TABLE IF EXISTS vehicle_info_part4;

CREATE TABLE vehicle_info_part4 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part4 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

SELECT * FROM vehicle_info_part4;

DROP TABLE IF EXISTS vehicle_info_part5;

CREATE TABLE vehicle_info_part5 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part5 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

SELECT * FROM vehicle_info_part5;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【元数据】-【元数据同步】页面 | 进入成功 |
| 2 | 点击「新增周期同步任务」 | 弹出「新增周期同步任务」弹窗 |
| 3 | 「数据源」: ${建表所在的Doris 3.x数据源} 「数据库」: ${建表所在的Doris 3.x数据库} 「数据表」: vehicle_info_part1 ~3 | 配置成功 |
| 4 | 点击「临时同步」按钮 | 1) 「新增周期同步任务」弹窗关闭, 并Toast提示: 临时同步成功 |
| 5 | 进入数据地图页面, 查询关键词vehicle_info_part | 同步状态为同步中, 等待一段时间后, 同步状态变更为同步完成 |
| 6 |  | 显示已同步的Doris 3.x的三张表 |

##### 【P1】验证 「元数据」中 Doris 3.x 元数据同步任务中过滤规则的有效性

> 前置条件

```
1) 资产平台已自动对接离线平台中带Meta标识的Doris 3.x数据源
2) 在离线开发平台中创建DorisSQL任务并执行, 建表语句如下:
DROP TABLE IF EXISTS vehicle_info_part6;

CREATE TABLE vehicle_info_part6 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part6 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

SELECT * FROM vehicle_info_part6;

DROP TABLE IF EXISTS vehicle_info_part7;

CREATE TABLE vehicle_info_part7 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251003 VALUES [('2025-10-03'), ('2025-10-04')),
  PARTITION p20251004 VALUES [('2025-10-04'), ('2025-10-05'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251003 分区（2025-10-03）
INSERT INTO vehicle_info_part7 VALUES
('LDP91C60PE200011','知音','EREV','H60','常规','两驱','N3',0,'2025-10-03'),
('LDP91C60PE200012','知音','EREV','H60','常规','两驱','N3',1,'2025-10-03'),
('LDP91C60PE200013','知音','EREV','H60','长续航','四驱','N5',1,'2025-10-03'),
('LDP91C60PE200014','知音','EREV','H60','长续航','四驱','N5',NULL,'2025-10-03'),
('LDP91C60PE200015','知音','EREV','H60','常规','四驱','N3',1,'2025-10-03');

SELECT * FROM vehicle_info_part7;

DROP TABLE IF EXISTS vehicle_info_part8;

CREATE TABLE vehicle_info_part8 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part8 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

SELECT * FROM vehicle_info_part8;

DROP TABLE IF EXISTS vehicle_info_part9;

CREATE TABLE vehicle_info_part9 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part9 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

SELECT * FROM vehicle_info_part9;

DROP TABLE IF EXISTS vehicle_info_part10;

CREATE TABLE vehicle_info_part10 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part10 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

SELECT * FROM vehicle_info_part10;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【元数据】-【元数据同步】页面 | 进入成功 |
| 2 | 点击「自动同步」页签, 点击新增过滤规则 | 1) 从周期同步页面切换到自动同步页面 |
| 3 | 1) 配置内容如下: 规则名称: test_rule 自动同步过滤维度: 数据表表名 过滤内容: vehicle_info_part* 数据源:  Doirs 3.x 数据库: ${离线平台中创建项目时指定的项目标识} | 弹出「新增过滤规则」弹窗 |
| 4 | 配置完毕后,点击确定 | 新增过滤规则成功 |
| 5 | 1) 点击「周期同步」页签, 新增周期同步任务, 配置如下: 数据源:  Doirs 3.x 数据库: ${离线平台中创建项目时指定的项目标识} 数据表: vehicle_info_part6~10 | 1) 「新增周期同步任务」弹窗关闭, 并Toast提示: 临时同步成功 |
| 6 | 配置完毕后, 点击「临时同步」 | 同步状态为同步中, 等待一段时间后, 同步状态变更为同步完成 |
| 7 | 进入数据地图页面, 查询关键词vehicle_info_part | 过滤规则已生效, 未显示vehicle_info_part6~10这五个Doris表 |
| 8 | 点击「自动同步」页签, 点击test_rule规则记录的「是否生效」按钮 | Toast提示: 自动同步规则切换状态成功，规则已关闭！ |
| 9 | 点击「周期同步」页签, 点击Doris 3.x同步任务记录的立即同步按钮 | 同步状态为同步中, 等待一段时间后, 同步状态变更为同步完成 |
| 10 | 进入数据地图页面, 查询关键词vehicle_info_part | 过滤规则已失效, 数据表成功同步至资产平台 |

### 血缘分析

##### 【P2】验证「血缘分析」中 Doris 3.x 数据源的孤立血缘表（无血缘）统计功能正常

> 前置条件

```
1) Doris 3.x 数据源已引入资产平台，元数据同步完成
2) Doris 3.x 数据库中存在多张表，部分表已通过离线任务建立血缘关系（如通过INSERT INTO/CREATE TABLE AS SELECT等SQL），部分表无任何上下游血缘关系
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【元数据】-【血缘分析】页面 | 进入成功，展示已添加监控的数据库列表 |
| 2 | 点击「添加数据库」按钮 | 弹出「添加数据库」弹窗 |
| 3 | 「数据源」选择 Doris 3.x 数据源，「数据库」选择已同步的数据库，点击确定 | 添加成功，列表中新增一条 Doris 3.x 数据库记录，「数据源类型」列显示 Doris 3.x |
| 4 | 查看列表中新增的 Doris 3.x 数据库记录的「表数量（总数）」和「表数量（无血缘）」列 | 1) 「表数量（总数）」列显示该数据库的总表数，与实际同步的表数一致 |
| 5 | 点击该数据库记录的「查看」按钮 | 「表数量（无血缘）」列显示无上下游血缘关系的孤立表数量 |
| 6 |  | 「表数量（无血缘）」≤「表数量（总数）」 |
| 7 |  | 跳转至该数据库下的表列表页，可查看各表的血缘状态详情 |

### 订阅的数据

##### 【P1】验证订阅 Doris 3.x 数据表后元数据发生变更时收到变更通知

> 前置条件

```
1) 已订阅 Doris 3.x 数据表 vehicle_info_part1，提醒方式已配置
2) 离线开发中已对接 Doris 3.x 集群
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「离线开发-数据开发」，创建 DorisSQL 任务，执行SQL: ALTER TABLE vehicle_info_part1 ADD COLUMN test_notify_col VARCHAR(50) COMMENT '测试通知字段'; | DDL 变更执行成功 |
| 2 | 进入【数据资产】-【元数据】-【元数据同步】页面，找到包含 vehicle_info_part1 的同步任务，点击「立即同步」 | Toast提示同步成功，同步状态变为「同步中」 |
| 3 | 等待同步完成 | 同步状态由「同步中」变更为「同步完成」 |
| 4 | 查看系统通知/消息中心 | 1) 收到元数据变更通知 |
| 5 |  | 通知内容包含变更的表名 vehicle_info_part1 |
| 6 |  | 通知方式与订阅时设置的提醒方式一致 |

##### 【P1】验证修改 Doris 3.x 已订阅数据表的提醒方式功能正常

> 前置条件

```
1) 已订阅 Doris 3.x 数据表 vehicle_info_part1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【元数据】-【订阅的数据】页面 | 进入成功，列表中显示 vehicle_info_part1 的订阅记录 |
| 2 | 选择 vehicle_info_part1 记录，点击「修改提醒方式」按钮 | 弹出「修改提醒方式」弹窗，展示当前配置的提醒方式 |
| 3 | 修改提醒方式后，点击确定 | Toast提示「提醒方式修改成功!」，列表中该记录的「提醒方式」列更新为修改后的值 |

##### 【P1】验证取消订阅 Doris 3.x 数据表功能正常

> 前置条件

```
1) 已订阅 Doris 3.x 数据表 vehicle_info_part1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【元数据】-【订阅的数据】页面 | 进入成功，列表中显示已订阅的数据表记录 |
| 2 | 在搜索框输入「vehicle_info_part1」进行查询 | 列表筛选，仅显示表名包含 vehicle_info_part1 的记录 |
| 3 | 选择 vehicle_info_part1 记录，点击「取消订阅」按钮 | 弹出确认弹窗，显示「确定取消订阅吗？」 |
| 4 | 在确认弹窗中，点击「取消订阅」按钮 | Toast提示「取消订阅成功！」，「订阅的数据」列表中 vehicle_info_part1 记录消失 |
| 5 | 进入【数据资产】-【元数据】-【数据地图】页面，搜索「vehicle_info_part1」并进入表详情 | 表详情页中按钮恢复为「订阅」状态（非「取消订阅」） |

##### 【P0】验证订阅 Doris 3.x 数据表并在「订阅的数据」页面查看订阅记录

> 前置条件

```
| 1) Doris 3.x 数据源已引入资产平台，元数据同步完成
2) 存在已同步的 Doris 3.x 数据表 vehicle_info_part1，该表尚未被当前用户订阅
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【元数据】-【数据地图】页面 | 进入成功，页面正常加载 |
| 2 | 在搜索框输入关键词「vehicle_info_part1」并查询 | 搜索结果中显示 vehicle_info_part1 数据表记录，表来源显示 Doris 3.x |
| 3 | 点击「vehicle_info_part1」表名，进入表详情页面 | 进入表详情页面，展示基本信息、字段信息等tab |
| 4 | 点击「订阅」按钮 | Toast提示「订阅成功!」，按钮状态变为「取消订阅」 |
| 5 | 进入【数据资产】-【元数据】-【订阅的数据】页面 | 1) 「订阅的数据」列表中显示 vehicle_info_part1 的订阅记录 |
| 6 |  | 记录中展示: 表名为「vehicle_info_part1」、表中文名、数据路径、提醒方式、订阅时间 |
| 7 |  | 订阅时间为当前时间 |

### 数据地图

##### 【P2】验证血缘解析（CREATE TABLE LIKE）

> 前置条件

```
离线对接Meta Doris数据源并引入至资产平台

建表语句
Doris任务A
CREATE TABLE if not exists doris_table_template (
    id INT,
    name VARCHAR(100),
    age TINYINT,
    salary DECIMAL(10,2),
    hire_date DATE,
    create_time DATETIME
)
ENGINE=OLAP
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES(
    replication_num = 1
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「离线开发-数据开发-周期任务」页面 | 进入成功 |
| 2 | 新建 DorisSQL 任务, 并执行测试语句 | 执行成功 |
| 3 | 创建Doris任务B, 执行SQL:  CREATE TABLE doris_table_copy LIKE doris_table_template; | 执行成功 |
| 4 | 保存并提交 | 提交成功 |
| 5 | 查看任务B调度属性-任务间依赖 | 显示自动依赖于任务A |
| 6 | 查看任务A,B的依赖视图 | 显示 doris_table_copy → doris_table_template 依赖箭头 |
| 7 | 进入「数据资产-元数据-数据地图」, 搜索表doris_table_copy | 搜索成功 |
| 8 | 进入表详情页, 查看血缘关系和任务依赖 | 显示依赖于上游任务A中的表doris_table_template |

##### 【P2】验证血缘解析（CREATE TABLE AS SELECT）

> 前置条件

```
离线对接Meta Doris数据源并引入至资产平台

建表语句
Doris任务A
CREATE TABLE if not exists doris_table_src (
    id INT,
    name VARCHAR(100),
    age TINYINT,
    salary DECIMAL(10,2),
    hire_date DATE,
    create_time DATETIME
)
ENGINE=OLAP
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES(
    replication_num = 1
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「离线开发-数据开发-周期任务」页面 | 进入成功 |
| 2 | 新建 DorisSQL 任务, 并执行测试语句 | 执行成功 |
| 3 | 创建Doris任务B, 执行SQL:  CREATE TABLE doris_table_new PROPERTIES(replication_num = 1) AS SELECT * FROM doris_table_src; | 执行成功 |
| 4 | 保存并提交 | 提交成功 |
| 5 | 查看任务B调度属性-任务间依赖 | 显示自动依赖于任务A |
| 6 | 查看任务A,B的依赖视图 | 显示 doris_table_new → doris_table_src 依赖箭头 |
| 7 | 进入「数据资产-元数据-数据地图」, 搜索表doris_table_new | 搜索成功 |
| 8 | 进入表详情页, 查看血缘关系和任务依赖 | 显示依赖于上游任务A中的表doris_table_src |

##### 【P2】验证血缘解析（INSERT OVERWRITE）

> 前置条件

```
离线对接Meta Doris数据源并引入至资产平台

测试语句
DorisSQL任务A
DROP TABLE IF EXISTS doris_table_a;
CREATE TABLE doris_table_a (id INT, val STRING)
ENGINE=OLAP
DISTRIBUTED BY HASH(id) BUCKETS 1
PROPERTIES(replication_num=1);

DorisSQL任务B
DROP TABLE IF EXISTS doris_table_b;
CREATE TABLE doris_table_b (id INT, val STRING)
ENGINE=OLAP
DISTRIBUTED BY HASH(id) BUCKETS 1
PROPERTIES(replication_num=1);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「离线开发-数据开发-周期任务」页面 | 进入成功 |
| 2 | 新建 DorisSQL 任务, 并执行测试语句 | 执行成功 |
| 3 | 执行SQL:  INSERT OVERWRITE doris_table_b SELECT * FROM doris_table_a; | 执行成功 |
| 4 | 保存并提交 | 提交成功 |
| 5 | 查看任务B调度属性-任务间依赖 | 显示自动依赖于任务A |
| 6 | 查看任务A,B的依赖视图 | 显示 doris_table_a → doris_table_b 依赖箭头 |
| 7 | 进入「数据资产-元数据-数据地图」, 搜索表doris_table_b | 搜索成功 |
| 8 | 进入表详情页, 查看血缘关系和任务依赖 | 显示依赖于上游任务A中的表doris_table_a |

##### 【P2】验证血缘解析（INSERT INTO）

> 前置条件

```
离线对接Meta Doris数据源并引入至资产平台

测试语句
DorisSQL任务A
DROP TABLE IF EXISTS doris_table_a;
CREATE TABLE doris_table_a (id INT, val STRING)
ENGINE=OLAP
DISTRIBUTED BY HASH(id) BUCKETS 1
PROPERTIES(replication_num=1);

DorisSQL任务B
DROP TABLE IF EXISTS doris_table_b;
CREATE TABLE doris_table_b (id INT, val STRING)
ENGINE=OLAP
DISTRIBUTED BY HASH(id) BUCKETS 1
PROPERTIES(replication_num=1);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「离线开发-数据开发-周期任务」页面 | 进入成功 |
| 2 | 新建 DorisSQL 任务, 并执行测试语句 | 执行成功 |
| 3 | 执行SQL:  INSERT INTO doris_table_b SELECT * FROM doris_table_a; | 执行成功 |
| 4 | 保存并提交 | 提交成功 |
| 5 | 查看任务B调度属性-任务间依赖 | 显示自动依赖于任务A |
| 6 | 查看任务A,B的依赖视图 | 显示 doris_table_a → doris_table_b 依赖箭头 |
| 7 | 进入「数据资产-元数据-数据地图」, 搜索表doris_table_b | 搜索成功 |
| 8 | 进入表详情页, 查看血缘关系和任务依赖 | 显示依赖于上游任务A中的表doris_table_a |

##### 【P0】验证 「元数据」中 Doris 3.x 数据表查询和表数量显示正常

> 前置条件

```
1) 数据资产-平台管理-数据源管理中已存在Doris3.x数据源
2) Doris3.x数据源已授权给质量项目
3) Doris3.x数据源已在「元数据同步」模块中自动同步或手动同步5条数据表, 建表语句如下:

DROP TABLE IF EXISTS vehicle_info_part1;

CREATE TABLE vehicle_info_part1 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part1 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

SELECT * FROM vehicle_info_part1;

DROP TABLE IF EXISTS vehicle_info_part2;

CREATE TABLE vehicle_info_part2 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251003 VALUES [('2025-10-03'), ('2025-10-04')),
  PARTITION p20251004 VALUES [('2025-10-04'), ('2025-10-05'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251003 分区（2025-10-03）
INSERT INTO vehicle_info_part2 VALUES
('LDP91C60PE200011','知音','EREV','H60','常规','两驱','N3',0,'2025-10-03'),
('LDP91C60PE200012','知音','EREV','H60','常规','两驱','N3',1,'2025-10-03'),
('LDP91C60PE200013','知音','EREV','H60','长续航','四驱','N5',1,'2025-10-03'),
('LDP91C60PE200014','知音','EREV','H60','长续航','四驱','N5',NULL,'2025-10-03'),
('LDP91C60PE200015','知音','EREV','H60','常规','四驱','N3',1,'2025-10-03');

SELECT * FROM vehicle_info_part2;

DROP TABLE IF EXISTS vehicle_info_part3;

CREATE TABLE vehicle_info_part3 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part3 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

SELECT * FROM vehicle_info_part3;

DROP TABLE IF EXISTS vehicle_info_part4;

CREATE TABLE vehicle_info_part4 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part4 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

SELECT * FROM vehicle_info_part4;

DROP TABLE IF EXISTS vehicle_info_part5;

CREATE TABLE vehicle_info_part5 (
  vin           VARCHAR(64) COMMENT '车辆唯一识别码',
  car_series    STRING COMMENT '车系',
  car_power     STRING COMMENT '动力类型',
  car_config    STRING COMMENT '车型配置',
  car_endurance STRING COMMENT '续航类型',
  drive_type    STRING COMMENT '驱动形式',
  car_equipment STRING COMMENT '车辆配置版本',
  is_certific   INT COMMENT '是否认证',
  delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
PARTITION BY RANGE(delivery_time) (
  PARTITION p20251001 VALUES [('2025-10-01'), ('2025-10-02')),
  PARTITION p20251002 VALUES [('2025-10-02'), ('2025-10-03'))
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
  replication_num = 1
);
-- p20251001 分区（2025-10-01）
INSERT INTO vehicle_info_part5 VALUES
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',0,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200004','追光','EV','H53a','常规','四驱','N3',NULL,'2025-10-01'),
('LDP91C60PE200005','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200001','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200002','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01'),
('LDP91C60PE200003','追光','EV','H53a','常规','四驱','N3',1,'2025-10-01');

SELECT * FROM vehicle_info_part5;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【元数据】-【数据地图】页面 | 进入成功 |
| 2 | UI CHECK | 「表来源」中新增Doris 3.x数据源, 并显示5条数据 |
| 3 | 点击「表来源」中的Doris 3.x | 1) 跳转至数据表查询列表界面 |
| 4 | 进入「数据地图」主页面, 输入关键词vehicle_info_part 并查询 | 自动载入Doris 3.x数据源类型的查询结果, 显示5条数据表 |
| 5 | 选择Doris 3.x表进入表详情页面, 检查表来源显示 | 1) 显示5条Doris 3.x数据表 |
| 6 |  | 表名中的关键词被标红 |
| 7 |  | 表名右侧的icon显示Doris 3.x |
| 8 |  | 表详情-基本信息-表来源中显示为Doris 3.x |

## 资产盘点

##### 【P1】验证 Doris 3.x 资产盘点页面显示正常

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【资产盘点】页面 | 进入成功 |
| 2 | 检查「已接入数据源」 | 存在Doris 3.x数据源, 数据显示正常 |
| 3 | 检查「数据地图分布」 | 可选Doris 3.x数据源, 数据显示正常 |
| 4 | 检查「数据价值排行」 | 可选Doris 3.x数据源, 数据显示正常 |
| 5 | 检查「资源存储情况」 | 可选Doris 3.x数据源, 数据显示正常 |
| 6 | 检查「元数据变化趋势」 | 可选Doris 3.x数据源, 数据显示正常 |
