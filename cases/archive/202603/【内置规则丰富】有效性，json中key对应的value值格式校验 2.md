---
suite_name: 【内置规则丰富】有效性，json中key对应的value值格式校验
description: 【内置规则丰富】有效性，json中key对应的value值格式校验
prd_id: 15694
prd_version: v6.4.10
prd_path: cases/requirements/data-assets/v6.4.10/【内置规则丰富】有效性，json中key对应的value值格式校验.md
prd_url: "https://lanhuapp.com/web/#/item/project/product?tid=24a1c6b2-a52e-454c-8d51-8aff866598b1&pid=7de90493-e80f-4592-a263-38fb2d2e98c0&versionId=7991bb05-6f97-4b29-8ad6-de18b5869a4d&docId=fc0fee93-74f5-4eff-a769-99e68506b296&docType=axure&pageId=3035f5b47bed47fcb8a7a4a26fa7a701&image_id=fc0fee93-74f5-4eff-a769-99e68506b296&parentId=493e80b4-33c3-44cb-b880-42bee51dba19"
product: data-assets
dev_version: 6.3岚图定制化分支
tags:
  - 数据资产
  - 内置规则
  - 有效性校验
  - JSON格式校验
  - 字段级规则
  - value格式
  - 规则库
  - 数据质量报告
  - 岚图定制化
  - 内置规则丰富
create_at: 2026-03-30
update_at: 2026-03-30
status: ""
health_warnings: []
repos:
  - .repos/CustomItem/dt-center-assets
  - .repos/CustomItem/dt-insight-studio
case_count: 16
case_types:
  normal: 10
  abnormal: 6
  boundary: 0
origin: json
---

## 规则库配置

### 列表页

#### 规则展示与说明

##### 【P0】验证内置规则列表展示格式-json格式校验条目并悬浮显示规则解释

> 前置条件
```
当前账号具备【数据质量 → 规则库配置】访问权限；已在当前版本导入 15694 需求对应的内置规则模板。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则库配置 → 列表页】页面 | 页面正常加载，展示规则名称搜索框、规则列表和【导出规则库】按钮。 |
| 2 | 在规则名称搜索框输入“格式-json格式校验”并执行搜索 | 列表返回规则名称为“格式-json格式校验”的内置规则条目。 |
| 3 | 查看该条目的规则分类、关联范围和规则描述 | 规则分类显示“有效性校验”，关联范围显示“字段”，规则描述显示“校验json类型的字段中key对应的value值是否符合规范要求”。 |
| 4 | 将鼠标悬浮在该条目的【规则解释】内容上 | 悬浮提示完整展示规则解释，且内容与列表中的规则解释保持一致。 |

## 规则任务管理

### 新建单表校验规则页

#### 规则创建

##### 【P0】验证新建json字段格式-json格式校验规则保存成功并回显

> 前置条件
```
1、环境说明：当前账号具备【规则库配置】【规则任务管理】【数据质量报告】权限；已在【数据质量 → 通用配置 → JSON格式配置】中维护以下 key 与 value 格式：
- orderInfo-orderNo：^ORD-\d{6}$
- vehicleInfo-plateNo：^[A-Z]{2}\d{6}$
- tripInfo-startTime：^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
- amountInfo-amount：^\d+(\.\d{1,2})?$
- debug-tempKey：未配置 value 格式（用于验证不可选）

2、Doris3.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_doris;
DROP TABLE IF EXISTS qa_valid_json_fmt_doris.tb_json_value_format;
CREATE TABLE qa_valid_json_fmt_doris.tb_json_value_format (
  id BIGINT,
  order_json JSON,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_doris.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000001"},"vehicleInfo":{"plateNo":"AB123456"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000001"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', 105.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_01"},"vehicleInfo":{"plateNo":"粤A12B3"}}', '{"orderInfo":{"orderNo":"ORD_01"},"tripInfo":{"startTime":"2026/03/30 10:00:00"}}', 88.00, '2026-03-30');

3、Hive2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_hive;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_hive.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_hive.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000101"},"vehicleInfo":{"plateNo":"CD654321"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000101"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', 205.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_11"},"vehicleInfo":{"plateNo":"沪A1B23C"}}', '{"orderInfo":{"orderNo":"ORD_11"},"tripInfo":{"startTime":"2026/03/30 11:00:00"}}', 95.60, '2026-03-30');

4、SparkThrift2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_spark;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_spark.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_spark.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000201"},"vehicleInfo":{"plateNo":"EF765432"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000201"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', 305.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_21"},"vehicleInfo":{"plateNo":"京A9C88D"}}', '{"orderInfo":{"orderNo":"ORD_21"},"tripInfo":{"startTime":"2026/03/30 12:00:00"}}', 75.60, '2026-03-30');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建单表校验规则页】页面 | 页面展示“监控对象 → 监控规则 → 调度属性”三步向导，当前位于“监控对象”步骤。 |
| 2 | 在【监控对象】步骤填写如下信息：<br>- 规则名称：JSON_FMT_RULE_001<br>- 选择数据源：Doris3.x测试源<br>- 选择数据库：qa_valid_json_fmt_doris<br>- 选择数据表：tb_json_value_format<br>- 选择分区：dt=2026-03-30 | 监控对象信息加载成功，【下一步】按钮可点击。 |
| 3 | 点击【下一步】进入【监控规则】步骤，配置如下：<br>- 强弱规则：强规则<br>- 规则描述：校验订单号与车牌号格式<br>- 字段：order_json<br>- 统计函数：格式-json格式校验<br>- 校验 key：orderInfo-orderNo、vehicleInfo-plateNo<br>- 点击【value格式预览】查看已选 key 对应正则<br>- 过滤条件：无 | 统计函数下拉中“格式-json格式校验”展示在“自定义正则”上方；value格式预览弹窗中展示 orderInfo-orderNo 对应 `^ORD-\d{6}$`、vehicleInfo-plateNo 对应 `^[A-Z]{2}\d{6}$`。 |
| 4 | 点击【下一步】进入【调度属性】步骤，设置“手动触发”后点击【新建】 | 页面提示“新建规则成功！”，系统进入编辑态并回显字段“order_json”、统计函数“格式-json格式校验”、校验 key“orderInfo-orderNo;vehicleInfo-plateNo”和规则描述“校验订单号与车牌号格式”。 |

##### 【P0】验证新建string字段格式-json格式校验规则保存成功并回显

> 前置条件
```
1、环境说明：当前账号具备【规则库配置】【规则任务管理】【数据质量报告】权限；已在【数据质量 → 通用配置 → JSON格式配置】中维护以下 key 与 value 格式：
- orderInfo-orderNo：^ORD-\d{6}$
- vehicleInfo-plateNo：^[A-Z]{2}\d{6}$
- tripInfo-startTime：^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
- amountInfo-amount：^\d+(\.\d{1,2})?$
- debug-tempKey：未配置 value 格式（用于验证不可选）

2、Doris3.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_doris;
DROP TABLE IF EXISTS qa_valid_json_fmt_doris.tb_json_value_format;
CREATE TABLE qa_valid_json_fmt_doris.tb_json_value_format (
  id BIGINT,
  order_json JSON,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_doris.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000001"},"vehicleInfo":{"plateNo":"AB123456"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000001"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', 105.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_01"},"vehicleInfo":{"plateNo":"粤A12B3"}}', '{"orderInfo":{"orderNo":"ORD_01"},"tripInfo":{"startTime":"2026/03/30 10:00:00"}}', 88.00, '2026-03-30');

3、Hive2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_hive;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_hive.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_hive.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000101"},"vehicleInfo":{"plateNo":"CD654321"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000101"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', 205.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_11"},"vehicleInfo":{"plateNo":"沪A1B23C"}}', '{"orderInfo":{"orderNo":"ORD_11"},"tripInfo":{"startTime":"2026/03/30 11:00:00"}}', 95.60, '2026-03-30');

4、SparkThrift2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_spark;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_spark.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_spark.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000201"},"vehicleInfo":{"plateNo":"EF765432"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000201"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', 305.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_21"},"vehicleInfo":{"plateNo":"京A9C88D"}}', '{"orderInfo":{"orderNo":"ORD_21"},"tripInfo":{"startTime":"2026/03/30 12:00:00"}}', 75.60, '2026-03-30');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建单表校验规则页】页面 | 页面正常加载，展示三步向导。 |
| 2 | 在【监控对象】步骤填写如下信息：<br>- 规则名称：JSON_FMT_RULE_002<br>- 选择数据源：Hive2.x测试源<br>- 选择数据库：qa_valid_json_fmt_hive<br>- 选择数据表：tb_json_value_format<br>- 选择分区：dt=2026-03-30 | 监控对象信息加载成功，【下一步】按钮可点击。 |
| 3 | 进入【监控规则】步骤，配置如下：<br>- 强弱规则：弱规则<br>- 规则描述：校验字符串字段中的出发时间格式<br>- 字段：order_str<br>- 统计函数：格式-json格式校验<br>- 校验 key：tripInfo-startTime<br>- 点击【value格式预览】确认正则<br>- 过滤条件：无 | 页面允许选择 string 类型字段“order_str”；value格式预览仅展示 tripInfo-startTime 对应正则 `^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$`。 |
| 4 | 点击【下一步】进入【调度属性】步骤，设置“手动触发”后点击【新建】 | 页面提示“新建规则成功！”，编辑页回显字段“order_str”、统计函数“格式-json格式校验”、校验 key“tripInfo-startTime”和规则描述“校验字符串字段中的出发时间格式”。 |

#### 字段联动与校验

##### 【P1】验证选择格式-json格式校验后字段仅支持json和string类型

> 前置条件
```
1、环境说明：当前账号具备【规则库配置】【规则任务管理】【数据质量报告】权限；已在【数据质量 → 通用配置 → JSON格式配置】中维护以下 key 与 value 格式：
- orderInfo-orderNo：^ORD-\d{6}$
- vehicleInfo-plateNo：^[A-Z]{2}\d{6}$
- tripInfo-startTime：^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
- amountInfo-amount：^\d+(\.\d{1,2})?$
- debug-tempKey：未配置 value 格式（用于验证不可选）

2、Doris3.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_doris;
DROP TABLE IF EXISTS qa_valid_json_fmt_doris.tb_json_value_format;
CREATE TABLE qa_valid_json_fmt_doris.tb_json_value_format (
  id BIGINT,
  order_json JSON,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_doris.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000001"},"vehicleInfo":{"plateNo":"AB123456"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000001"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', 105.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_01"},"vehicleInfo":{"plateNo":"粤A12B3"}}', '{"orderInfo":{"orderNo":"ORD_01"},"tripInfo":{"startTime":"2026/03/30 10:00:00"}}', 88.00, '2026-03-30');

3、Hive2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_hive;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_hive.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_hive.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000101"},"vehicleInfo":{"plateNo":"CD654321"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000101"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', 205.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_11"},"vehicleInfo":{"plateNo":"沪A1B23C"}}', '{"orderInfo":{"orderNo":"ORD_11"},"tripInfo":{"startTime":"2026/03/30 11:00:00"}}', 95.60, '2026-03-30');

4、SparkThrift2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_spark;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_spark.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_spark.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000201"},"vehicleInfo":{"plateNo":"EF765432"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000201"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', 305.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_21"},"vehicleInfo":{"plateNo":"京A9C88D"}}', '{"orderInfo":{"orderNo":"ORD_21"},"tripInfo":{"startTime":"2026/03/30 12:00:00"}}', 75.60, '2026-03-30');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建单表校验规则页】页面 | 页面正常加载，可进入“监控规则”步骤。 |
| 2 | 在【监控对象】步骤选择 Doris3.x 数据源下的表 `tb_json_value_format` 后进入【监控规则】步骤 | 字段下拉中可见 `order_json`、`order_str`、`sale_amount` 等字段。 |
| 3 | 在当前规则行选择统计函数“格式-json格式校验”并展开字段下拉框 | 字段下拉仅保留 `order_json` 和 `order_str` 两个可选字段，数值字段 `sale_amount` 置灰不可选或不再展示。 |
| 4 | 查看统计函数下拉中的相邻选项顺序 | “格式-json格式校验”位于“自定义正则”上方，符合原型排序要求。 |

##### 【P1】验证未维护value格式的key在校验key树中置灰不可选

> 前置条件
```
1、环境说明：当前账号具备【规则库配置】【规则任务管理】【数据质量报告】权限；已在【数据质量 → 通用配置 → JSON格式配置】中维护以下 key 与 value 格式：
- orderInfo-orderNo：^ORD-\d{6}$
- vehicleInfo-plateNo：^[A-Z]{2}\d{6}$
- tripInfo-startTime：^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
- amountInfo-amount：^\d+(\.\d{1,2})?$
- debug-tempKey：未配置 value 格式（用于验证不可选）

2、Doris3.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_doris;
DROP TABLE IF EXISTS qa_valid_json_fmt_doris.tb_json_value_format;
CREATE TABLE qa_valid_json_fmt_doris.tb_json_value_format (
  id BIGINT,
  order_json JSON,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_doris.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000001"},"vehicleInfo":{"plateNo":"AB123456"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000001"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', 105.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_01"},"vehicleInfo":{"plateNo":"粤A12B3"}}', '{"orderInfo":{"orderNo":"ORD_01"},"tripInfo":{"startTime":"2026/03/30 10:00:00"}}', 88.00, '2026-03-30');

3、Hive2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_hive;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_hive.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_hive.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000101"},"vehicleInfo":{"plateNo":"CD654321"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000101"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', 205.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_11"},"vehicleInfo":{"plateNo":"沪A1B23C"}}', '{"orderInfo":{"orderNo":"ORD_11"},"tripInfo":{"startTime":"2026/03/30 11:00:00"}}', 95.60, '2026-03-30');

4、SparkThrift2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_spark;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_spark.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_spark.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000201"},"vehicleInfo":{"plateNo":"EF765432"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000201"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', 305.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_21"},"vehicleInfo":{"plateNo":"京A9C88D"}}', '{"orderInfo":{"orderNo":"ORD_21"},"tripInfo":{"startTime":"2026/03/30 12:00:00"}}', 75.60, '2026-03-30');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建单表校验规则页】页面 | 页面正常加载。 |
| 2 | 选择字段 `order_json` 和统计函数“格式-json格式校验”后，展开【校验 key】下拉树 | 下拉树展示 orderInfo、vehicleInfo、tripInfo、debug 等层级节点。 |
| 3 | 在下拉树中定位 `debug-tempKey` 节点并尝试勾选 | `debug-tempKey` 节点因未维护 value 格式而保持置灰状态，无法被勾选进入校验内容。 |

##### 【P1】验证value格式预览弹窗仅展示已勾选key及其正则格式

> 前置条件
```
1、环境说明：当前账号具备【规则库配置】【规则任务管理】【数据质量报告】权限；已在【数据质量 → 通用配置 → JSON格式配置】中维护以下 key 与 value 格式：
- orderInfo-orderNo：^ORD-\d{6}$
- vehicleInfo-plateNo：^[A-Z]{2}\d{6}$
- tripInfo-startTime：^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
- amountInfo-amount：^\d+(\.\d{1,2})?$
- debug-tempKey：未配置 value 格式（用于验证不可选）

2、Doris3.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_doris;
DROP TABLE IF EXISTS qa_valid_json_fmt_doris.tb_json_value_format;
CREATE TABLE qa_valid_json_fmt_doris.tb_json_value_format (
  id BIGINT,
  order_json JSON,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_doris.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000001"},"vehicleInfo":{"plateNo":"AB123456"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000001"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', 105.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_01"},"vehicleInfo":{"plateNo":"粤A12B3"}}', '{"orderInfo":{"orderNo":"ORD_01"},"tripInfo":{"startTime":"2026/03/30 10:00:00"}}', 88.00, '2026-03-30');

3、Hive2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_hive;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_hive.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_hive.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000101"},"vehicleInfo":{"plateNo":"CD654321"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000101"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', 205.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_11"},"vehicleInfo":{"plateNo":"沪A1B23C"}}', '{"orderInfo":{"orderNo":"ORD_11"},"tripInfo":{"startTime":"2026/03/30 11:00:00"}}', 95.60, '2026-03-30');

4、SparkThrift2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_spark;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_spark.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_spark.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000201"},"vehicleInfo":{"plateNo":"EF765432"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000201"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', 305.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_21"},"vehicleInfo":{"plateNo":"京A9C88D"}}', '{"orderInfo":{"orderNo":"ORD_21"},"tripInfo":{"startTime":"2026/03/30 12:00:00"}}', 75.60, '2026-03-30');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建单表校验规则页】页面 | 页面正常加载。 |
| 2 | 进入【监控规则】步骤后选择字段 `order_json`、统计函数“格式-json格式校验”，并勾选 `orderInfo-orderNo` 与 `tripInfo-startTime` | 已选 key 内容区域回显 `orderInfo-orderNo;tripInfo-startTime`。 |
| 3 | 点击【value格式预览】 | 弹出“value格式”预览弹窗，表格仅展示两行：`orderInfo-orderNo / ^ORD-\d{6}$` 与 `tripInfo-startTime / ^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$`。 |
| 4 | 关闭预览弹窗后返回规则配置区域 | 页面保留之前已勾选的 key 内容，不额外插入未勾选 key。 |

##### 【P1】验证校验key数量较多时默认加载前200条并支持分页查看

> 前置条件
```
1、环境说明：当前账号具备【规则库配置】【规则任务管理】【数据质量报告】权限；已在【数据质量 → 通用配置 → JSON格式配置】中维护以下 key 与 value 格式：
- orderInfo-orderNo：^ORD-\d{6}$
- vehicleInfo-plateNo：^[A-Z]{2}\d{6}$
- tripInfo-startTime：^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
- amountInfo-amount：^\d+(\.\d{1,2})?$
- debug-tempKey：未配置 value 格式（用于验证不可选）

2、Doris3.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_doris;
DROP TABLE IF EXISTS qa_valid_json_fmt_doris.tb_json_value_format;
CREATE TABLE qa_valid_json_fmt_doris.tb_json_value_format (
  id BIGINT,
  order_json JSON,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_doris.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000001"},"vehicleInfo":{"plateNo":"AB123456"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000001"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', 105.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_01"},"vehicleInfo":{"plateNo":"粤A12B3"}}', '{"orderInfo":{"orderNo":"ORD_01"},"tripInfo":{"startTime":"2026/03/30 10:00:00"}}', 88.00, '2026-03-30');

3、Hive2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_hive;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_hive.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_hive.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000101"},"vehicleInfo":{"plateNo":"CD654321"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000101"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', 205.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_11"},"vehicleInfo":{"plateNo":"沪A1B23C"}}', '{"orderInfo":{"orderNo":"ORD_11"},"tripInfo":{"startTime":"2026/03/30 11:00:00"}}', 95.60, '2026-03-30');

4、SparkThrift2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_spark;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_spark.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_spark.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000201"},"vehicleInfo":{"plateNo":"EF765432"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000201"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', 305.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_21"},"vehicleInfo":{"plateNo":"京A9C88D"}}', '{"orderInfo":{"orderNo":"ORD_21"},"tripInfo":{"startTime":"2026/03/30 12:00:00"}}', 75.60, '2026-03-30');

5、已通过 Excel 导入 230 个已维护 value 格式的 key，按一级节点 orderInfo / vehicleInfo / tripInfo 组织，用于验证默认首屏 200 条加载与分页能力。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建单表校验规则页】页面 | 页面正常加载。 |
| 2 | 进入【监控规则】步骤后选择统计函数“格式-json格式校验”，展开【校验 key】下拉树 | 下拉树首屏仅加载前 200 条已维护 value 格式的 key，页面展示分页控件。 |
| 3 | 点击分页第 2 页或下一页按钮 | 下拉树切换到后续 key 列表，能看到第 201 至第 230 条 key。 |
| 4 | 返回第一页并再次展开当前一级节点 | 页面恢复展示第一页数据且不会丢失已加载的层级结构。 |

##### 【P1】验证勾选子级key时仅对当前层级生效且不会连带勾选兄弟节点

> 前置条件
```
1、环境说明：当前账号具备【规则库配置】【规则任务管理】【数据质量报告】权限；已在【数据质量 → 通用配置 → JSON格式配置】中维护以下 key 与 value 格式：
- orderInfo-orderNo：^ORD-\d{6}$
- vehicleInfo-plateNo：^[A-Z]{2}\d{6}$
- tripInfo-startTime：^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
- amountInfo-amount：^\d+(\.\d{1,2})?$
- debug-tempKey：未配置 value 格式（用于验证不可选）

2、Doris3.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_doris;
DROP TABLE IF EXISTS qa_valid_json_fmt_doris.tb_json_value_format;
CREATE TABLE qa_valid_json_fmt_doris.tb_json_value_format (
  id BIGINT,
  order_json JSON,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_doris.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000001"},"vehicleInfo":{"plateNo":"AB123456"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000001"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', 105.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_01"},"vehicleInfo":{"plateNo":"粤A12B3"}}', '{"orderInfo":{"orderNo":"ORD_01"},"tripInfo":{"startTime":"2026/03/30 10:00:00"}}', 88.00, '2026-03-30');

3、Hive2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_hive;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_hive.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_hive.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000101"},"vehicleInfo":{"plateNo":"CD654321"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000101"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', 205.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_11"},"vehicleInfo":{"plateNo":"沪A1B23C"}}', '{"orderInfo":{"orderNo":"ORD_11"},"tripInfo":{"startTime":"2026/03/30 11:00:00"}}', 95.60, '2026-03-30');

4、SparkThrift2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_spark;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_spark.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_spark.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000201"},"vehicleInfo":{"plateNo":"EF765432"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000201"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', 305.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_21"},"vehicleInfo":{"plateNo":"京A9C88D"}}', '{"orderInfo":{"orderNo":"ORD_21"},"tripInfo":{"startTime":"2026/03/30 12:00:00"}}', 75.60, '2026-03-30');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建单表校验规则页】页面 | 页面正常加载。 |
| 2 | 进入【监控规则】步骤后展开 `orderInfo` 一级节点，观察其下包含 `orderNo` 与 `orderStatus` 两个子节点 | 两个子节点均展示在同一父级下。 |
| 3 | 仅勾选 `orderInfo-orderNo` 子节点，不勾选 `orderInfo-orderStatus` | 已选 key 内容区域只回显 `orderInfo-orderNo`，不会自动追加 `orderInfo-orderStatus`。 |

##### 【P1】验证已选校验key默认仅展示前两个且悬浮可查看完整内容

> 前置条件
```
1、环境说明：当前账号具备【规则库配置】【规则任务管理】【数据质量报告】权限；已在【数据质量 → 通用配置 → JSON格式配置】中维护以下 key 与 value 格式：
- orderInfo-orderNo：^ORD-\d{6}$
- vehicleInfo-plateNo：^[A-Z]{2}\d{6}$
- tripInfo-startTime：^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
- amountInfo-amount：^\d+(\.\d{1,2})?$
- debug-tempKey：未配置 value 格式（用于验证不可选）

2、Doris3.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_doris;
DROP TABLE IF EXISTS qa_valid_json_fmt_doris.tb_json_value_format;
CREATE TABLE qa_valid_json_fmt_doris.tb_json_value_format (
  id BIGINT,
  order_json JSON,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_doris.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000001"},"vehicleInfo":{"plateNo":"AB123456"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000001"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', 105.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_01"},"vehicleInfo":{"plateNo":"粤A12B3"}}', '{"orderInfo":{"orderNo":"ORD_01"},"tripInfo":{"startTime":"2026/03/30 10:00:00"}}', 88.00, '2026-03-30');

3、Hive2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_hive;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_hive.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_hive.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000101"},"vehicleInfo":{"plateNo":"CD654321"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000101"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', 205.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_11"},"vehicleInfo":{"plateNo":"沪A1B23C"}}', '{"orderInfo":{"orderNo":"ORD_11"},"tripInfo":{"startTime":"2026/03/30 11:00:00"}}', 95.60, '2026-03-30');

4、SparkThrift2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_spark;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_spark.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_spark.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000201"},"vehicleInfo":{"plateNo":"EF765432"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000201"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', 305.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_21"},"vehicleInfo":{"plateNo":"京A9C88D"}}', '{"orderInfo":{"orderNo":"ORD_21"},"tripInfo":{"startTime":"2026/03/30 12:00:00"}}', 75.60, '2026-03-30');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建单表校验规则页】页面 | 页面正常加载。 |
| 2 | 进入【监控规则】步骤后依次勾选 `orderInfo-orderNo`、`vehicleInfo-plateNo`、`tripInfo-startTime` 三个 key | 已选 key 区域产生三项路径回显。 |
| 3 | 观察已选 key 内容区域的默认显示效果 | 默认仅展示前两个 key 路径，超出部分以省略方式展示。 |
| 4 | 将鼠标悬浮在已选 key 内容区域上 | 悬浮提示完整展示三个已勾选的 key 路径，且顺序与勾选顺序一致。 |

### 编辑单表校验规则页

#### 配置回显

##### 【P1】验证编辑页正确回显已保存的校验key和value格式预览内容

> 前置条件
```
1、环境说明：当前账号具备【规则库配置】【规则任务管理】【数据质量报告】权限；已在【数据质量 → 通用配置 → JSON格式配置】中维护以下 key 与 value 格式：
- orderInfo-orderNo：^ORD-\d{6}$
- vehicleInfo-plateNo：^[A-Z]{2}\d{6}$
- tripInfo-startTime：^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
- amountInfo-amount：^\d+(\.\d{1,2})?$
- debug-tempKey：未配置 value 格式（用于验证不可选）

2、Doris3.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_doris;
DROP TABLE IF EXISTS qa_valid_json_fmt_doris.tb_json_value_format;
CREATE TABLE qa_valid_json_fmt_doris.tb_json_value_format (
  id BIGINT,
  order_json JSON,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_doris.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000001"},"vehicleInfo":{"plateNo":"AB123456"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000001"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', 105.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_01"},"vehicleInfo":{"plateNo":"粤A12B3"}}', '{"orderInfo":{"orderNo":"ORD_01"},"tripInfo":{"startTime":"2026/03/30 10:00:00"}}', 88.00, '2026-03-30');

3、Hive2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_hive;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_hive.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_hive.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000101"},"vehicleInfo":{"plateNo":"CD654321"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000101"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', 205.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_11"},"vehicleInfo":{"plateNo":"沪A1B23C"}}', '{"orderInfo":{"orderNo":"ORD_11"},"tripInfo":{"startTime":"2026/03/30 11:00:00"}}', 95.60, '2026-03-30');

4、SparkThrift2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_spark;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_spark.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_spark.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000201"},"vehicleInfo":{"plateNo":"EF765432"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000201"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', 305.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_21"},"vehicleInfo":{"plateNo":"京A9C88D"}}', '{"orderInfo":{"orderNo":"ORD_21"},"tripInfo":{"startTime":"2026/03/30 12:00:00"}}', 75.60, '2026-03-30');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 编辑单表校验规则页】页面 | 页面加载成功，已打开规则 `JSON_FMT_RULE_001` 的编辑页面，监控对象、监控规则和调度属性全部回显。 |
| 2 | 查看当前规则的字段、统计函数、校验 key、强弱规则和规则描述 | 字段回显为 `order_json`，统计函数回显为“格式-json格式校验”，校验 key 回显为 `orderInfo-orderNo;vehicleInfo-plateNo`，强弱规则回显为“强规则”，规则描述回显为“校验订单号与车牌号格式”。 |
| 3 | 点击【value格式预览】 | 弹窗继续仅展示 `orderInfo-orderNo` 与 `vehicleInfo-plateNo` 两个 key 及对应正则。 |
| 4 | 关闭预览弹窗并保存页面不做改动 | 页面保存成功且回显内容保持不变。 |

## 数据质量报告

### 列表页

#### 报告定位

##### 【P1】验证已生成报告列表可定位格式-json格式校验报告并进入详情

> 前置条件
```
1、环境说明：当前账号具备【规则库配置】【规则任务管理】【数据质量报告】权限；已在【数据质量 → 通用配置 → JSON格式配置】中维护以下 key 与 value 格式：
- orderInfo-orderNo：^ORD-\d{6}$
- vehicleInfo-plateNo：^[A-Z]{2}\d{6}$
- tripInfo-startTime：^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
- amountInfo-amount：^\d+(\.\d{1,2})?$
- debug-tempKey：未配置 value 格式（用于验证不可选）

2、Doris3.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_doris;
DROP TABLE IF EXISTS qa_valid_json_fmt_doris.tb_json_value_format;
CREATE TABLE qa_valid_json_fmt_doris.tb_json_value_format (
  id BIGINT,
  order_json JSON,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_doris.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000001"},"vehicleInfo":{"plateNo":"AB123456"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000001"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', 105.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_01"},"vehicleInfo":{"plateNo":"粤A12B3"}}', '{"orderInfo":{"orderNo":"ORD_01"},"tripInfo":{"startTime":"2026/03/30 10:00:00"}}', 88.00, '2026-03-30');

3、Hive2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_hive;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_hive.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_hive.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000101"},"vehicleInfo":{"plateNo":"CD654321"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000101"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', 205.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_11"},"vehicleInfo":{"plateNo":"沪A1B23C"}}', '{"orderInfo":{"orderNo":"ORD_11"},"tripInfo":{"startTime":"2026/03/30 11:00:00"}}', 95.60, '2026-03-30');

4、SparkThrift2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_spark;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_spark.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_spark.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000201"},"vehicleInfo":{"plateNo":"EF765432"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000201"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', 305.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_21"},"vehicleInfo":{"plateNo":"京A9C88D"}}', '{"orderInfo":{"orderNo":"ORD_21"},"tripInfo":{"startTime":"2026/03/30 12:00:00"}}', 75.60, '2026-03-30');5、已基于上述数据创建并执行以下规则：
- 规则A：字段=order_json，统计函数=格式-json格式校验，校验 key=orderInfo-orderNo;vehicleInfo-plateNo，强弱规则=强规则，规则描述=校验订单号与车牌号格式。
- 规则B：字段=order_str，统计函数=格式-json格式校验，校验 key=tripInfo-startTime，强弱规则=弱规则，规则描述=校验出发时间格式。

6、已生成以下报告：
- Doris_JSON格式校验报告_20260330
- Hive_JSON格式校验报告_20260330
- Spark_JSON格式校验报告_20260330
其中 Doris 报告至少存在 1 条失败记录，Spark 报告至少存在 1 条通过记录。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 数据质量报告 → 列表页】页面 | 页面展示【已配置报告】、【已生成报告】页签以及报告名称搜索区域。 |
| 2 | 点击【已生成报告】页签，在“报告名称”输入框中输入 `Doris_JSON格式校验报告_20260330` 并执行搜索 | 列表返回 `Doris_JSON格式校验报告_20260330` 报告记录。 |
| 3 | 核对返回记录中的数据源、数据表和生成时间 | 数据源与数据表信息对应 `qa_valid_json_fmt_doris.tb_json_value_format`，生成时间为本次执行时间。 |
| 4 | 点击该报告记录的【报告详情】 | 页面成功跳转到当前报告的详情页。 |

### 详情页

#### 结果展示

##### 【P0】验证详情页展示格式-json格式校验通过结果且不提供查看详情入口

> 前置条件
```
1、环境说明：当前账号具备【规则库配置】【规则任务管理】【数据质量报告】权限；已在【数据质量 → 通用配置 → JSON格式配置】中维护以下 key 与 value 格式：
- orderInfo-orderNo：^ORD-\d{6}$
- vehicleInfo-plateNo：^[A-Z]{2}\d{6}$
- tripInfo-startTime：^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
- amountInfo-amount：^\d+(\.\d{1,2})?$
- debug-tempKey：未配置 value 格式（用于验证不可选）

2、Doris3.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_doris;
DROP TABLE IF EXISTS qa_valid_json_fmt_doris.tb_json_value_format;
CREATE TABLE qa_valid_json_fmt_doris.tb_json_value_format (
  id BIGINT,
  order_json JSON,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_doris.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000001"},"vehicleInfo":{"plateNo":"AB123456"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000001"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', 105.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_01"},"vehicleInfo":{"plateNo":"粤A12B3"}}', '{"orderInfo":{"orderNo":"ORD_01"},"tripInfo":{"startTime":"2026/03/30 10:00:00"}}', 88.00, '2026-03-30');

3、Hive2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_hive;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_hive.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_hive.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000101"},"vehicleInfo":{"plateNo":"CD654321"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000101"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', 205.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_11"},"vehicleInfo":{"plateNo":"沪A1B23C"}}', '{"orderInfo":{"orderNo":"ORD_11"},"tripInfo":{"startTime":"2026/03/30 11:00:00"}}', 95.60, '2026-03-30');

4、SparkThrift2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_spark;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_spark.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_spark.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000201"},"vehicleInfo":{"plateNo":"EF765432"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000201"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', 305.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_21"},"vehicleInfo":{"plateNo":"京A9C88D"}}', '{"orderInfo":{"orderNo":"ORD_21"},"tripInfo":{"startTime":"2026/03/30 12:00:00"}}', 75.60, '2026-03-30');5、已基于上述数据创建并执行以下规则：
- 规则A：字段=order_json，统计函数=格式-json格式校验，校验 key=orderInfo-orderNo;vehicleInfo-plateNo，强弱规则=强规则，规则描述=校验订单号与车牌号格式。
- 规则B：字段=order_str，统计函数=格式-json格式校验，校验 key=tripInfo-startTime，强弱规则=弱规则，规则描述=校验出发时间格式。

6、已生成以下报告：
- Doris_JSON格式校验报告_20260330
- Hive_JSON格式校验报告_20260330
- Spark_JSON格式校验报告_20260330
其中 Doris 报告至少存在 1 条失败记录，Spark 报告至少存在 1 条通过记录。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 数据质量报告 → 详情页】页面 | 页面成功进入 `Spark_JSON格式校验报告_20260330` 的报告详情，规则校验明细区域已加载。 |
| 2 | 在规则校验明细中定位字段 `order_json`、规则名称“格式-json格式校验”的通过记录 | 该记录归属“有效性校验”，字段类型显示为 `json`。 |
| 3 | 查看该记录的“质检结果”“未通过原因”“详情说明” | 该记录显示“质检结果=校验通过”“未通过原因=--”“详情说明=符合规则key为“orderInfo-orderNo;vehicleInfo-plateNo”时的value格式要求”。 |
| 4 | 观察该记录的操作列 | 操作列不展示【查看详情】按钮。 |

##### 【P0】验证详情页展示格式-json格式校验不通过结果并提供查看详情入口

> 前置条件
```
1、环境说明：当前账号具备【规则库配置】【规则任务管理】【数据质量报告】权限；已在【数据质量 → 通用配置 → JSON格式配置】中维护以下 key 与 value 格式：
- orderInfo-orderNo：^ORD-\d{6}$
- vehicleInfo-plateNo：^[A-Z]{2}\d{6}$
- tripInfo-startTime：^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
- amountInfo-amount：^\d+(\.\d{1,2})?$
- debug-tempKey：未配置 value 格式（用于验证不可选）

2、Doris3.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_doris;
DROP TABLE IF EXISTS qa_valid_json_fmt_doris.tb_json_value_format;
CREATE TABLE qa_valid_json_fmt_doris.tb_json_value_format (
  id BIGINT,
  order_json JSON,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_doris.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000001"},"vehicleInfo":{"plateNo":"AB123456"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000001"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', 105.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_01"},"vehicleInfo":{"plateNo":"粤A12B3"}}', '{"orderInfo":{"orderNo":"ORD_01"},"tripInfo":{"startTime":"2026/03/30 10:00:00"}}', 88.00, '2026-03-30');

3、Hive2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_hive;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_hive.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_hive.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000101"},"vehicleInfo":{"plateNo":"CD654321"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000101"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', 205.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_11"},"vehicleInfo":{"plateNo":"沪A1B23C"}}', '{"orderInfo":{"orderNo":"ORD_11"},"tripInfo":{"startTime":"2026/03/30 11:00:00"}}', 95.60, '2026-03-30');

4、SparkThrift2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_spark;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_spark.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_spark.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000201"},"vehicleInfo":{"plateNo":"EF765432"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000201"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', 305.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_21"},"vehicleInfo":{"plateNo":"京A9C88D"}}', '{"orderInfo":{"orderNo":"ORD_21"},"tripInfo":{"startTime":"2026/03/30 12:00:00"}}', 75.60, '2026-03-30');5、已基于上述数据创建并执行以下规则：
- 规则A：字段=order_json，统计函数=格式-json格式校验，校验 key=orderInfo-orderNo;vehicleInfo-plateNo，强弱规则=强规则，规则描述=校验订单号与车牌号格式。
- 规则B：字段=order_str，统计函数=格式-json格式校验，校验 key=tripInfo-startTime，强弱规则=弱规则，规则描述=校验出发时间格式。

6、已生成以下报告：
- Doris_JSON格式校验报告_20260330
- Hive_JSON格式校验报告_20260330
- Spark_JSON格式校验报告_20260330
其中 Doris 报告至少存在 1 条失败记录，Spark 报告至少存在 1 条通过记录。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 数据质量报告 → 详情页】页面 | 页面成功进入 `Doris_JSON格式校验报告_20260330` 的报告详情。 |
| 2 | 在规则校验明细中定位字段 `order_json`、规则名称“格式-json格式校验”的失败记录 | 失败记录与样本 `id=2` 对应。 |
| 3 | 查看该记录的“质检结果”“未通过原因”“详情说明”与操作列 | 该记录显示“质检结果=校验不通过”“未通过原因=key对应value格式校验未通过”“详情说明=不符合规则key为“orderInfo-orderNo;vehicleInfo-plateNo”时的value格式要求”，并展示【查看详情】按钮。 |

#### 失败明细与日志

##### 【P1】验证格式-json格式校验失败记录支持查看日志

> 前置条件
```
1、环境说明：当前账号具备【规则库配置】【规则任务管理】【数据质量报告】权限；已在【数据质量 → 通用配置 → JSON格式配置】中维护以下 key 与 value 格式：
- orderInfo-orderNo：^ORD-\d{6}$
- vehicleInfo-plateNo：^[A-Z]{2}\d{6}$
- tripInfo-startTime：^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
- amountInfo-amount：^\d+(\.\d{1,2})?$
- debug-tempKey：未配置 value 格式（用于验证不可选）

2、Doris3.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_doris;
DROP TABLE IF EXISTS qa_valid_json_fmt_doris.tb_json_value_format;
CREATE TABLE qa_valid_json_fmt_doris.tb_json_value_format (
  id BIGINT,
  order_json JSON,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_doris.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000001"},"vehicleInfo":{"plateNo":"AB123456"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000001"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', 105.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_01"},"vehicleInfo":{"plateNo":"粤A12B3"}}', '{"orderInfo":{"orderNo":"ORD_01"},"tripInfo":{"startTime":"2026/03/30 10:00:00"}}', 88.00, '2026-03-30');

3、Hive2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_hive;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_hive.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_hive.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000101"},"vehicleInfo":{"plateNo":"CD654321"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000101"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', 205.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_11"},"vehicleInfo":{"plateNo":"沪A1B23C"}}', '{"orderInfo":{"orderNo":"ORD_11"},"tripInfo":{"startTime":"2026/03/30 11:00:00"}}', 95.60, '2026-03-30');

4、SparkThrift2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_spark;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_spark.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_spark.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000201"},"vehicleInfo":{"plateNo":"EF765432"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000201"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', 305.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_21"},"vehicleInfo":{"plateNo":"京A9C88D"}}', '{"orderInfo":{"orderNo":"ORD_21"},"tripInfo":{"startTime":"2026/03/30 12:00:00"}}', 75.60, '2026-03-30');5、已基于上述数据创建并执行以下规则：
- 规则A：字段=order_json，统计函数=格式-json格式校验，校验 key=orderInfo-orderNo;vehicleInfo-plateNo，强弱规则=强规则，规则描述=校验订单号与车牌号格式。
- 规则B：字段=order_str，统计函数=格式-json格式校验，校验 key=tripInfo-startTime，强弱规则=弱规则，规则描述=校验出发时间格式。

6、已生成以下报告：
- Doris_JSON格式校验报告_20260330
- Hive_JSON格式校验报告_20260330
- Spark_JSON格式校验报告_20260330
其中 Doris 报告至少存在 1 条失败记录，Spark 报告至少存在 1 条通过记录。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 数据质量报告 → 详情页】页面 | 页面成功进入 `Doris_JSON格式校验报告_20260330` 的报告详情。 |
| 2 | 在失败记录所在行点击【查看日志】 | 页面弹出日志面板或日志弹窗。 |
| 3 | 查看日志面板中的任务编号、执行时间和错误日志内容 | 日志中可定位到本次规则执行信息，并能看到与 value 格式校验失败相关的执行日志。 |
| 4 | 关闭日志面板返回详情页 | 页面返回详情页且失败记录仍保持可查看状态。 |

##### 【P1】验证查看详情弹窗标题和校验字段标红展示符合需求

> 前置条件
```
1、环境说明：当前账号具备【规则库配置】【规则任务管理】【数据质量报告】权限；已在【数据质量 → 通用配置 → JSON格式配置】中维护以下 key 与 value 格式：
- orderInfo-orderNo：^ORD-\d{6}$
- vehicleInfo-plateNo：^[A-Z]{2}\d{6}$
- tripInfo-startTime：^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
- amountInfo-amount：^\d+(\.\d{1,2})?$
- debug-tempKey：未配置 value 格式（用于验证不可选）

2、Doris3.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_doris;
DROP TABLE IF EXISTS qa_valid_json_fmt_doris.tb_json_value_format;
CREATE TABLE qa_valid_json_fmt_doris.tb_json_value_format (
  id BIGINT,
  order_json JSON,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_doris.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000001"},"vehicleInfo":{"plateNo":"AB123456"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000001"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', 105.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_01"},"vehicleInfo":{"plateNo":"粤A12B3"}}', '{"orderInfo":{"orderNo":"ORD_01"},"tripInfo":{"startTime":"2026/03/30 10:00:00"}}', 88.00, '2026-03-30');

3、Hive2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_hive;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_hive.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_hive.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000101"},"vehicleInfo":{"plateNo":"CD654321"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000101"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', 205.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_11"},"vehicleInfo":{"plateNo":"沪A1B23C"}}', '{"orderInfo":{"orderNo":"ORD_11"},"tripInfo":{"startTime":"2026/03/30 11:00:00"}}', 95.60, '2026-03-30');

4、SparkThrift2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_spark;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_spark.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_spark.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000201"},"vehicleInfo":{"plateNo":"EF765432"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000201"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', 305.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_21"},"vehicleInfo":{"plateNo":"京A9C88D"}}', '{"orderInfo":{"orderNo":"ORD_21"},"tripInfo":{"startTime":"2026/03/30 12:00:00"}}', 75.60, '2026-03-30');5、已基于上述数据创建并执行以下规则：
- 规则A：字段=order_json，统计函数=格式-json格式校验，校验 key=orderInfo-orderNo;vehicleInfo-plateNo，强弱规则=强规则，规则描述=校验订单号与车牌号格式。
- 规则B：字段=order_str，统计函数=格式-json格式校验，校验 key=tripInfo-startTime，强弱规则=弱规则，规则描述=校验出发时间格式。

6、已生成以下报告：
- Doris_JSON格式校验报告_20260330
- Hive_JSON格式校验报告_20260330
- Spark_JSON格式校验报告_20260330
其中 Doris 报告至少存在 1 条失败记录，Spark 报告至少存在 1 条通过记录。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 数据质量报告 → 详情页】页面 | 页面成功进入 `Doris_JSON格式校验报告_20260330` 的报告详情。 |
| 2 | 在失败记录所在行点击【查看详情】 | 页面打开失败明细抽屉。 |
| 3 | 查看抽屉标题、表格字段和高亮样式 | 抽屉标题显示“查看“有效性校验-格式-json格式校验”明细”；明细表保留全部字段，未通过的目标字段以红色高亮展示。 |
| 4 | 关闭失败明细抽屉返回详情页 | 页面关闭抽屉后返回报告详情。 |

##### 【P2】验证下载失败明细后导出文件中的校验字段保持高亮语义

> 前置条件
```
1、环境说明：当前账号具备【规则库配置】【规则任务管理】【数据质量报告】权限；已在【数据质量 → 通用配置 → JSON格式配置】中维护以下 key 与 value 格式：
- orderInfo-orderNo：^ORD-\d{6}$
- vehicleInfo-plateNo：^[A-Z]{2}\d{6}$
- tripInfo-startTime：^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$
- amountInfo-amount：^\d+(\.\d{1,2})?$
- debug-tempKey：未配置 value 格式（用于验证不可选）

2、Doris3.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_doris;
DROP TABLE IF EXISTS qa_valid_json_fmt_doris.tb_json_value_format;
CREATE TABLE qa_valid_json_fmt_doris.tb_json_value_format (
  id BIGINT,
  order_json JSON,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_doris.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000001"},"vehicleInfo":{"plateNo":"AB123456"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000001"},"tripInfo":{"startTime":"2026-03-30 10:00:00"}}', 105.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_01"},"vehicleInfo":{"plateNo":"粤A12B3"}}', '{"orderInfo":{"orderNo":"ORD_01"},"tripInfo":{"startTime":"2026/03/30 10:00:00"}}', 88.00, '2026-03-30');

3、Hive2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_hive;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_hive.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_hive.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000101"},"vehicleInfo":{"plateNo":"CD654321"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000101"},"tripInfo":{"startTime":"2026-03-30 11:00:00"}}', 205.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_11"},"vehicleInfo":{"plateNo":"沪A1B23C"}}', '{"orderInfo":{"orderNo":"ORD_11"},"tripInfo":{"startTime":"2026/03/30 11:00:00"}}', 95.60, '2026-03-30');

4、SparkThrift2.x SQL语句准备:
CREATE DATABASE IF NOT EXISTS qa_valid_json_fmt_spark;
CREATE TABLE IF NOT EXISTS qa_valid_json_fmt_spark.tb_json_value_format (
  id BIGINT,
  order_json STRING,
  order_str STRING,
  sale_amount DOUBLE,
  dt STRING
);
INSERT INTO qa_valid_json_fmt_spark.tb_json_value_format VALUES
(1, '{"orderInfo":{"orderNo":"ORD-000201"},"vehicleInfo":{"plateNo":"EF765432"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', '{"orderInfo":{"orderNo":"ORD-000201"},"tripInfo":{"startTime":"2026-03-30 12:00:00"}}', 305.20, '2026-03-30'),
(2, '{"orderInfo":{"orderNo":"ORD_21"},"vehicleInfo":{"plateNo":"京A9C88D"}}', '{"orderInfo":{"orderNo":"ORD_21"},"tripInfo":{"startTime":"2026/03/30 12:00:00"}}', 75.60, '2026-03-30');5、已基于上述数据创建并执行以下规则：
- 规则A：字段=order_json，统计函数=格式-json格式校验，校验 key=orderInfo-orderNo;vehicleInfo-plateNo，强弱规则=强规则，规则描述=校验订单号与车牌号格式。
- 规则B：字段=order_str，统计函数=格式-json格式校验，校验 key=tripInfo-startTime，强弱规则=弱规则，规则描述=校验出发时间格式。

6、已生成以下报告：
- Doris_JSON格式校验报告_20260330
- Hive_JSON格式校验报告_20260330
- Spark_JSON格式校验报告_20260330
其中 Doris 报告至少存在 1 条失败记录，Spark 报告至少存在 1 条通过记录。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 数据质量报告 → 详情页】页面 | 页面成功进入 `Doris_JSON格式校验报告_20260330` 的报告详情。 |
| 2 | 在失败记录所在行点击【查看详情】并在抽屉中点击【下载明细】 | 浏览器开始下载失败明细文件。 |
| 3 | 打开已下载的失败明细文件并查看目标字段列 | 文件中保留失败样本的完整字段，未通过的目标字段带有明显高亮语义，能与页面红色高亮保持一致。 |
