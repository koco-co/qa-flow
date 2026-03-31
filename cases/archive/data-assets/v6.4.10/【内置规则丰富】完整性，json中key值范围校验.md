---
suite_name: 【内置规则丰富】完整性，json中key值范围校验
description: 【内置规则丰富】完整性，json中key值范围校验
prd_version: v6.4.10
prd_path: cases/requirements/data-assets/v6.4.10/【内置规则丰富】完整性，json中key值范围校验.md
prd_url: ""
product: data-assets
dev_version: ""
tags:
  - 规则库配置
  - 规则任务管理
  - 数据质量报告
  - 内置规则丰富
  - 完整性
  - json中key值范围校验
create_at: 2026-03-30
update_at: 2026-03-30
status: ""
health_warnings: []
repos: []
case_count: 30
origin: xmind
---

## 规则库配置

### 列表页

#### 规则展示与说明

##### 【P0】验证内置规则列表展示key范围校验条目及分类说明

> 前置条件
```
已准备跨数据源测试环境并完成建表与插数：1）Doris3.x：库qa_key_range_doris，表tb_vehicle_json（分区dt=2026-03-30），字段payload_json（JSON）、payload_str（STRING）、speed（INT），已插入一条payload_json包含vehicleInfo.plateNo、vehicleInfo.plateType、tripInfo.startCity的完整记录和一条缺少vehicleInfo.plateType的记录；2）Hive2.x：库qa_key_range_hive，表tb_order_json（分区dt=2026-03-30），字段order_payload（STRING）、driver_payload（STRING）、order_amount（DECIMAL），已插入一条order_payload包含orderInfo.orderNo、vehicleInfo.plateNo的完整记录和一条缺少orderInfo.orderNo的记录；3）SparkThrift2.x：库qa_key_range_spark，表tb_trip_json（分区dt=2026-03-30），字段trip_payload（STRING）、ext_payload（STRING）、mileage（BIGINT），已插入一条trip_payload包含tripInfo.startCity、tripInfo.endCity、driverInfo.name的完整记录和一条缺少tripInfo.endCity的记录；已在通用配置中维护好所需key树，包含vehicleInfo-plateNo、vehicleInfo-plateType、tripInfo-startCity、tripInfo-endCity、orderInfo-orderNo、driverInfo-name；当前账号具备数据质量模块下规则库配置、规则任务管理访问权限。 当前账号具备查看内置规则库列表权限。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则库配置 → 列表页】页面 | 页面正常加载，顶部显示规则名称搜索框和【导出规则库】按钮，列表展示规则名称、规则解释、规则分类、关联范围、引用次数、启停状态、规则描述等列。 |
| 2 | 在规则名称搜索框输入“key范围校验”并执行搜索 | 列表返回“key范围校验”条目；“规则分类”显示“完整性校验”，“关联范围”显示“字段”，“规则解释”显示“对数据中包含的key范围校验”，“规则描述”显示“校验json类型的字段中key名是否完整，对key的范围进行校验”。 |

##### 【P1】验证key范围校验规则解释悬浮展示完整说明

> 前置条件
```
已准备跨数据源测试环境并完成建表与插数：1）Doris3.x：库qa_key_range_doris，表tb_vehicle_json（分区dt=2026-03-30），字段payload_json（JSON）、payload_str（STRING）、speed（INT），已插入一条payload_json包含vehicleInfo.plateNo、vehicleInfo.plateType、tripInfo.startCity的完整记录和一条缺少vehicleInfo.plateType的记录；2）Hive2.x：库qa_key_range_hive，表tb_order_json（分区dt=2026-03-30），字段order_payload（STRING）、driver_payload（STRING）、order_amount（DECIMAL），已插入一条order_payload包含orderInfo.orderNo、vehicleInfo.plateNo的完整记录和一条缺少orderInfo.orderNo的记录；3）SparkThrift2.x：库qa_key_range_spark，表tb_trip_json（分区dt=2026-03-30），字段trip_payload（STRING）、ext_payload（STRING）、mileage（BIGINT），已插入一条trip_payload包含tripInfo.startCity、tripInfo.endCity、driverInfo.name的完整记录和一条缺少tripInfo.endCity的记录；已在通用配置中维护好所需key树，包含vehicleInfo-plateNo、vehicleInfo-plateType、tripInfo-startCity、tripInfo-endCity、orderInfo-orderNo、driverInfo-name；当前账号具备数据质量模块下规则库配置、规则任务管理访问权限。 当前账号具备查看内置规则库列表权限。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则库配置 → 列表页】页面 | 页面正常加载，可执行规则名称搜索。 |
| 2 | 搜索“key范围校验”后，将鼠标悬浮在该行【规则解释】内容上 | 悬浮层完整展示“对数据中包含的key范围校验”，文本不被截断，移开鼠标后悬浮层消失。 |

##### 【P1】验证key范围校验条目的启停开关和导出规则库入口可见

> 前置条件
```
已准备跨数据源测试环境并完成建表与插数：1）Doris3.x：库qa_key_range_doris，表tb_vehicle_json（分区dt=2026-03-30），字段payload_json（JSON）、payload_str（STRING）、speed（INT），已插入一条payload_json包含vehicleInfo.plateNo、vehicleInfo.plateType、tripInfo.startCity的完整记录和一条缺少vehicleInfo.plateType的记录；2）Hive2.x：库qa_key_range_hive，表tb_order_json（分区dt=2026-03-30），字段order_payload（STRING）、driver_payload（STRING）、order_amount（DECIMAL），已插入一条order_payload包含orderInfo.orderNo、vehicleInfo.plateNo的完整记录和一条缺少orderInfo.orderNo的记录；3）SparkThrift2.x：库qa_key_range_spark，表tb_trip_json（分区dt=2026-03-30），字段trip_payload（STRING）、ext_payload（STRING）、mileage（BIGINT），已插入一条trip_payload包含tripInfo.startCity、tripInfo.endCity、driverInfo.name的完整记录和一条缺少tripInfo.endCity的记录；已在通用配置中维护好所需key树，包含vehicleInfo-plateNo、vehicleInfo-plateType、tripInfo-startCity、tripInfo-endCity、orderInfo-orderNo、driverInfo-name；当前账号具备数据质量模块下规则库配置、规则任务管理访问权限。 当前账号具备查看内置规则库列表权限。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则库配置 → 列表页】页面 | 页面正常加载，顶部可见【导出规则库】按钮。 |
| 2 | 搜索“key范围校验”并观察该行操作区域 | “key范围校验”所在行展示启停开关控件；页面顶部保持显示【导出规则库】按钮。 |
| 3 | 点击页面顶部【导出规则库】按钮 | 页面弹出确认提示“请确认是否导出规则库?”，可继续执行确认或取消操作。 |

##### 【P1】验证规则库内置规则「key范围校验」默认展示前两个key名超出悬浮可查看全部

> 前置条件
```
1. 环境说明：数据质量模块已部署，规则库配置中已存在「key范围校验」条目
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则库配置 → 列表页】页面 | 规则库配置列表页正常加载，可查看内置规则列表和规则解释信息 |
| 2 | 找到「key范围校验」条目，查看「规则描述」列的展示效果 | 「规则描述」列默认仅展示前两个 key 名，超出部分以「...」省略不显示完整文本 |
| 3 | 将鼠标悬浮在省略展示的「规则描述」内容上 | 出现悬浮提示，展示全部 key 名称 |

##### 【P1】验证规则库内置规则「key范围校验」额外提示文案正确

> 前置条件
```
1. 环境说明：数据质量模块已部署，规则库配置中已存在「key范围校验」条目
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则库配置 → 列表页】页面 | 规则库配置列表页正常加载，可查看内置规则列表和规则解释信息 |
| 2 | 找到「key范围校验」内置规则条目，查看条目下方或旁边的额外说明文案 | 条目附近显示额外提示文案「校验内容key信息需要在通用配置模块维护。」 |

## 规则任务管理

### 新建单表校验规则页

#### 规则创建

##### 【P0】验证新建单表key范围校验规则主流程保存成功并回显json字段包含配置

> 前置条件
```
已准备跨数据源测试环境并完成建表与插数：1）Doris3.x：库qa_key_range_doris，表tb_vehicle_json（分区dt=2026-03-30），字段payload_json（JSON）、payload_str（STRING）、speed（INT），已插入一条payload_json包含vehicleInfo.plateNo、vehicleInfo.plateType、tripInfo.startCity的完整记录和一条缺少vehicleInfo.plateType的记录；2）Hive2.x：库qa_key_range_hive，表tb_order_json（分区dt=2026-03-30），字段order_payload（STRING）、driver_payload（STRING）、order_amount（DECIMAL），已插入一条order_payload包含orderInfo.orderNo、vehicleInfo.plateNo的完整记录和一条缺少orderInfo.orderNo的记录；3）SparkThrift2.x：库qa_key_range_spark，表tb_trip_json（分区dt=2026-03-30），字段trip_payload（STRING）、ext_payload（STRING）、mileage（BIGINT），已插入一条trip_payload包含tripInfo.startCity、tripInfo.endCity、driverInfo.name的完整记录和一条缺少tripInfo.endCity的记录；已在通用配置中维护好所需key树，包含vehicleInfo-plateNo、vehicleInfo-plateType、tripInfo-startCity、tripInfo-endCity、orderInfo-orderNo、driverInfo-name；当前账号具备数据质量模块下规则库配置、规则任务管理访问权限。 当前账号具备新建监控规则权限。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建单表校验规则页】页面 | 页面显示“监控对象→监控规则→调度属性”三步向导，当前位于“监控对象”步骤，可见【取消】和【下一步】按钮。 |
| 2 | 在【监控对象】步骤填写：<br>- 规则名称：KR_INCLUDE_JSON_001<br>- 选择数据源：Doris3.x测试源<br>- 选择Catalog：internal<br>- 选择数据库：qa_key_range_doris<br>- 选择数据表：tb_vehicle_json<br>- 选择分区：dt=2026-03-30 | 监控对象信息加载成功，【下一步】按钮可点击。 |
| 3 | 点击【下一步】进入【监控规则】步骤并填写：<br>- 强弱规则：弱规则<br>- 规则描述：校验payload_json必须包含车辆基础key<br>- 字段：payload_json<br>- 统计函数：key范围校验<br>- 校验方法：包含<br>- 期望值（校验内容）：vehicleInfo-plateNo、vehicleInfo-plateType | “字段”保持单选样式；“统计函数”选中“key范围校验”后，“校验方法”可选“包含”，“期望值”区域回显已选key路径。 |
| 4 | 点击【下一步】进入【调度属性】步骤并填写：<br>- 调度配置：调度周期选择“手动触发”<br>- 执行周期：选择“立即生成”<br>- 报告配置：勾选“无需生成报告”<br>然后点击【新建】 | 页面提示“新建规则成功！”，系统进入已创建规则的编辑态；已保存配置回显为字段“payload_json”、统计函数“key范围校验”、校验方法“包含”、期望值“vehicleInfo-plateNo;vehicleInfo-plateType”、强弱规则“弱规则”、规则描述“校验payload_json必须包含车辆基础key”。 |

##### 【P0】验证新建单表key范围校验规则主流程保存成功并回显string字段不包含配置

> 前置条件
```
已准备跨数据源测试环境并完成建表与插数：1）Doris3.x：库qa_key_range_doris，表tb_vehicle_json（分区dt=2026-03-30），字段payload_json（JSON）、payload_str（STRING）、speed（INT），已插入一条payload_json包含vehicleInfo.plateNo、vehicleInfo.plateType、tripInfo.startCity的完整记录和一条缺少vehicleInfo.plateType的记录；2）Hive2.x：库qa_key_range_hive，表tb_order_json（分区dt=2026-03-30），字段order_payload（STRING）、driver_payload（STRING）、order_amount（DECIMAL），已插入一条order_payload包含orderInfo.orderNo、vehicleInfo.plateNo的完整记录和一条缺少orderInfo.orderNo的记录；3）SparkThrift2.x：库qa_key_range_spark，表tb_trip_json（分区dt=2026-03-30），字段trip_payload（STRING）、ext_payload（STRING）、mileage（BIGINT），已插入一条trip_payload包含tripInfo.startCity、tripInfo.endCity、driverInfo.name的完整记录和一条缺少tripInfo.endCity的记录；已在通用配置中维护好所需key树，包含vehicleInfo-plateNo、vehicleInfo-plateType、tripInfo-startCity、tripInfo-endCity、orderInfo-orderNo、driverInfo-name；当前账号具备数据质量模块下规则库配置、规则任务管理访问权限。 当前账号具备新建监控规则权限。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建单表校验规则页】页面 | 页面显示“监控对象→监控规则→调度属性”三步向导，当前位于“监控对象”步骤。 |
| 2 | 在【监控对象】步骤填写：<br>- 规则名称：KR_NOT_INCLUDE_STRING_001<br>- 选择数据源：Hive2.x测试源<br>- 选择Catalog：hive<br>- 选择数据库：qa_key_range_hive<br>- 选择数据表：tb_order_json<br>- 选择分区：dt=2026-03-30 | 监控对象信息加载成功，【下一步】按钮可点击。 |
| 3 | 点击【下一步】进入【监控规则】步骤并填写：<br>- 强弱规则：强规则<br>- 规则描述：校验order_payload不包含司机姓名key<br>- 字段：order_payload<br>- 统计函数：key范围校验<br>- 校验方法：不包含<br>- 期望值（校验内容）：driverInfo-name | “字段”允许选择string类型字段；“校验方法”选中“不包含”后，强规则值保留为“强规则”，页面显示强规则关联任务提示文案。 |
| 4 | 点击【下一步】进入【调度属性】步骤并填写：<br>- 调度配置：调度周期选择“手动触发”<br>- 执行周期：选择“立即生成”<br>- 报告配置：勾选“无需生成报告”<br>然后点击【新建】 | 页面提示“新建规则成功！”，系统进入已创建规则的编辑态；已保存配置回显为字段“order_payload”、统计函数“key范围校验”、校验方法“不包含”、期望值“driverInfo-name”、强弱规则“强规则”、规则描述“校验order_payload不包含司机姓名key”。 |

#### 字段联动与校验

##### 【P1】验证选择key范围校验后字段仅支持单选

> 前置条件
```
已准备跨数据源测试环境并完成建表与插数：1）Doris3.x：库qa_key_range_doris，表tb_vehicle_json（分区dt=2026-03-30），字段payload_json（JSON）、payload_str（STRING）、speed（INT），已插入一条payload_json包含vehicleInfo.plateNo、vehicleInfo.plateType、tripInfo.startCity的完整记录和一条缺少vehicleInfo.plateType的记录；2）Hive2.x：库qa_key_range_hive，表tb_order_json（分区dt=2026-03-30），字段order_payload（STRING）、driver_payload（STRING）、order_amount（DECIMAL），已插入一条order_payload包含orderInfo.orderNo、vehicleInfo.plateNo的完整记录和一条缺少orderInfo.orderNo的记录；3）SparkThrift2.x：库qa_key_range_spark，表tb_trip_json（分区dt=2026-03-30），字段trip_payload（STRING）、ext_payload（STRING）、mileage（BIGINT），已插入一条trip_payload包含tripInfo.startCity、tripInfo.endCity、driverInfo.name的完整记录和一条缺少tripInfo.endCity的记录；已在通用配置中维护好所需key树，包含vehicleInfo-plateNo、vehicleInfo-plateType、tripInfo-startCity、tripInfo-endCity、orderInfo-orderNo、driverInfo-name；当前账号具备数据质量模块下规则库配置、规则任务管理访问权限。 当前账号具备新建监控规则权限。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建单表校验规则页】页面 | 页面显示三步向导，当前位于“监控对象”步骤。 |
| 2 | 在【监控对象】步骤填写：<br>- 规则名称：KR_SINGLE_FIELD_ONLY_001<br>- 选择数据源：Doris3.x测试源<br>- 选择Catalog：internal<br>- 选择数据库：qa_key_range_doris<br>- 选择数据表：tb_vehicle_json<br>- 选择分区：dt=2026-03-30<br>然后点击【下一步】 | 成功进入“监控规则”步骤。 |
| 3 | 在【监控规则】步骤依次操作：<br>- 选择统计函数：key范围校验<br>- 选择字段：payload_json<br>- 再次尝试选择字段：payload_str | 字段控件始终只保留一个已选值，不会同时展示两个字段tag；若后选payload_str，则payload_json被替换为payload_str。 |

##### 【P0】验证key范围校验不支持非json和string字段

> 前置条件
```
已准备跨数据源测试环境并完成建表与插数：1）Doris3.x：库qa_key_range_doris，表tb_vehicle_json（分区dt=2026-03-30），字段payload_json（JSON）、payload_str（STRING）、speed（INT），已插入一条payload_json包含vehicleInfo.plateNo、vehicleInfo.plateType、tripInfo.startCity的完整记录和一条缺少vehicleInfo.plateType的记录；2）Hive2.x：库qa_key_range_hive，表tb_order_json（分区dt=2026-03-30），字段order_payload（STRING）、driver_payload（STRING）、order_amount（DECIMAL），已插入一条order_payload包含orderInfo.orderNo、vehicleInfo.plateNo的完整记录和一条缺少orderInfo.orderNo的记录；3）SparkThrift2.x：库qa_key_range_spark，表tb_trip_json（分区dt=2026-03-30），字段trip_payload（STRING）、ext_payload（STRING）、mileage（BIGINT），已插入一条trip_payload包含tripInfo.startCity、tripInfo.endCity、driverInfo.name的完整记录和一条缺少tripInfo.endCity的记录；已在通用配置中维护好所需key树，包含vehicleInfo-plateNo、vehicleInfo-plateType、tripInfo-startCity、tripInfo-endCity、orderInfo-orderNo、driverInfo-name；当前账号具备数据质量模块下规则库配置、规则任务管理访问权限。 当前账号具备新建监控规则权限。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建单表校验规则页】页面 | 页面显示三步向导，当前位于“监控对象”步骤。 |
| 2 | 在【监控对象】步骤填写：<br>- 规则名称：KR_FIELD_TYPE_LIMIT_001<br>- 选择数据源：Doris3.x测试源<br>- 选择Catalog：internal<br>- 选择数据库：qa_key_range_doris<br>- 选择数据表：tb_vehicle_json<br>- 选择分区：dt=2026-03-30<br>然后点击【下一步】 | 成功进入“监控规则”步骤。 |
| 3 | 在【监控规则】步骤选择：<br>- 统计函数：key范围校验<br>然后展开【字段】下拉列表 | 字段下拉列表仅展示payload_json和payload_str；INT类型字段speed不在可选列表中，输入“speed”搜索也无可选结果。 |

##### 【P0】验证key范围校验的校验方法仅显示包含和不包含

> 前置条件
```
已准备跨数据源测试环境并完成建表与插数：1）Doris3.x：库qa_key_range_doris，表tb_vehicle_json（分区dt=2026-03-30），字段payload_json（JSON）、payload_str（STRING）、speed（INT），已插入一条payload_json包含vehicleInfo.plateNo、vehicleInfo.plateType、tripInfo.startCity的完整记录和一条缺少vehicleInfo.plateType的记录；2）Hive2.x：库qa_key_range_hive，表tb_order_json（分区dt=2026-03-30），字段order_payload（STRING）、driver_payload（STRING）、order_amount（DECIMAL），已插入一条order_payload包含orderInfo.orderNo、vehicleInfo.plateNo的完整记录和一条缺少orderInfo.orderNo的记录；3）SparkThrift2.x：库qa_key_range_spark，表tb_trip_json（分区dt=2026-03-30），字段trip_payload（STRING）、ext_payload（STRING）、mileage（BIGINT），已插入一条trip_payload包含tripInfo.startCity、tripInfo.endCity、driverInfo.name的完整记录和一条缺少tripInfo.endCity的记录；已在通用配置中维护好所需key树，包含vehicleInfo-plateNo、vehicleInfo-plateType、tripInfo-startCity、tripInfo-endCity、orderInfo-orderNo、driverInfo-name；当前账号具备数据质量模块下规则库配置、规则任务管理访问权限。 当前账号具备新建监控规则权限。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建单表校验规则页】页面 | 页面显示三步向导，当前位于“监控对象”步骤。 |
| 2 | 在【监控对象】步骤填写：<br>- 规则名称：KR_VERIFY_TYPE_OPTIONS_001<br>- 选择数据源：Doris3.x测试源<br>- 选择Catalog：internal<br>- 选择数据库：qa_key_range_doris<br>- 选择数据表：tb_vehicle_json<br>- 选择分区：dt=2026-03-30<br>然后点击【下一步】 | 成功进入“监控规则”步骤。 |
| 3 | 在【监控规则】步骤填写：<br>- 字段：payload_json<br>- 统计函数：key范围校验<br>然后展开【校验方法】下拉列表 | 下拉列表仅显示“包含”和“不包含”两个选项，不显示“固定值”“占比”等其他校验方法。 |

##### 【P1】验证校验内容选择器首屏默认展示前200条并支持搜索定位超出首屏的key

> 前置条件
```
已准备跨数据源测试环境并完成建表与插数：1）Doris3.x：库qa_key_range_doris，表tb_vehicle_json（分区dt=2026-03-30），字段payload_json（JSON）、payload_str（STRING）、speed（INT），已插入一条payload_json包含vehicleInfo.plateNo、vehicleInfo.plateType、tripInfo.startCity的完整记录和一条缺少vehicleInfo.plateType的记录；2）Hive2.x：库qa_key_range_hive，表tb_order_json（分区dt=2026-03-30），字段order_payload（STRING）、driver_payload（STRING）、order_amount（DECIMAL），已插入一条order_payload包含orderInfo.orderNo、vehicleInfo.plateNo的完整记录和一条缺少orderInfo.orderNo的记录；3）SparkThrift2.x：库qa_key_range_spark，表tb_trip_json（分区dt=2026-03-30），字段trip_payload（STRING）、ext_payload（STRING）、mileage（BIGINT），已插入一条trip_payload包含tripInfo.startCity、tripInfo.endCity、driverInfo.name的完整记录和一条缺少tripInfo.endCity的记录；已在通用配置中维护好所需key树，包含vehicleInfo-plateNo、vehicleInfo-plateType、tripInfo-startCity、tripInfo-endCity、orderInfo-orderNo、driverInfo-name；当前账号具备数据质量模块下规则库配置、规则任务管理访问权限。 当前账号具备新建监控规则权限。 另已在SparkThrift2.x数据源类型下维护topicInfo-key001至topicInfo-key220共220个同层级key，用于验证首屏加载数量与搜索定位。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建单表校验规则页】页面 | 页面显示三步向导，当前位于“监控对象”步骤。 |
| 2 | 在【监控对象】步骤填写：<br>- 规则名称：KR_KEY_SELECTOR_200_001<br>- 选择数据源：SparkThrift2.x测试源<br>- 选择Catalog：spark_catalog<br>- 选择数据库：qa_key_range_spark<br>- 选择数据表：tb_trip_json<br>- 选择分区：dt=2026-03-30<br>然后点击【下一步】 | 成功进入“监控规则”步骤。 |
| 3 | 在【监控规则】步骤填写：<br>- 字段：trip_payload<br>- 统计函数：key范围校验<br>- 校验方法：包含<br>然后点击【期望值】选择器 | 选择器展开后默认展示当前层级前200条key，搜索框可用；未搜索时不展示topicInfo-key210。 |
| 4 | 在选择器搜索框输入“key210” | 列表过滤并定位到topicInfo-key210，可继续勾选该key。 |

##### 【P1】验证校验内容勾选仅对当前层级生效且不会隐式勾选其他key

> 前置条件
```
已准备跨数据源测试环境并完成建表与插数：1）Doris3.x：库qa_key_range_doris，表tb_vehicle_json（分区dt=2026-03-30），字段payload_json（JSON）、payload_str（STRING）、speed（INT），已插入一条payload_json包含vehicleInfo.plateNo、vehicleInfo.plateType、tripInfo.startCity的完整记录和一条缺少vehicleInfo.plateType的记录；2）Hive2.x：库qa_key_range_hive，表tb_order_json（分区dt=2026-03-30），字段order_payload（STRING）、driver_payload（STRING）、order_amount（DECIMAL），已插入一条order_payload包含orderInfo.orderNo、vehicleInfo.plateNo的完整记录和一条缺少orderInfo.orderNo的记录；3）SparkThrift2.x：库qa_key_range_spark，表tb_trip_json（分区dt=2026-03-30），字段trip_payload（STRING）、ext_payload（STRING）、mileage（BIGINT），已插入一条trip_payload包含tripInfo.startCity、tripInfo.endCity、driverInfo.name的完整记录和一条缺少tripInfo.endCity的记录；已在通用配置中维护好所需key树，包含vehicleInfo-plateNo、vehicleInfo-plateType、tripInfo-startCity、tripInfo-endCity、orderInfo-orderNo、driverInfo-name；当前账号具备数据质量模块下规则库配置、规则任务管理访问权限。 当前账号具备新建监控规则权限。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建单表校验规则页】页面 | 页面显示三步向导，当前位于“监控对象”步骤。 |
| 2 | 在【监控对象】步骤填写：<br>- 规则名称：KR_KEY_PATH_ECHO_001<br>- 选择数据源：Doris3.x测试源<br>- 选择Catalog：internal<br>- 选择数据库：qa_key_range_doris<br>- 选择数据表：tb_vehicle_json<br>- 选择分区：dt=2026-03-30<br>然后点击【下一步】 | 成功进入“监控规则”步骤。 |
| 3 | 在【监控规则】步骤填写：<br>- 字段：payload_json<br>- 统计函数：key范围校验<br>- 校验方法：包含<br>- 在【期望值】选择器中勾选：vehicleInfo-plateNo、tripInfo-startCity | 仅当前勾选的两个路径被选中，vehicleInfo-plateType和tripInfo-endCity不会被自动勾选；关闭选择器后输入框回显“vehicleInfo-plateNo;tripInfo-startCity”。 |

##### 【P1】验证校验内容悬浮提示明确说明key来源于通用配置

> 前置条件
```
已准备跨数据源测试环境并完成建表与插数：1）Doris3.x：库qa_key_range_doris，表tb_vehicle_json（分区dt=2026-03-30），字段payload_json（JSON）、payload_str（STRING）、speed（INT），已插入一条payload_json包含vehicleInfo.plateNo、vehicleInfo.plateType、tripInfo.startCity的完整记录和一条缺少vehicleInfo.plateType的记录；2）Hive2.x：库qa_key_range_hive，表tb_order_json（分区dt=2026-03-30），字段order_payload（STRING）、driver_payload（STRING）、order_amount（DECIMAL），已插入一条order_payload包含orderInfo.orderNo、vehicleInfo.plateNo的完整记录和一条缺少orderInfo.orderNo的记录；3）SparkThrift2.x：库qa_key_range_spark，表tb_trip_json（分区dt=2026-03-30），字段trip_payload（STRING）、ext_payload（STRING）、mileage（BIGINT），已插入一条trip_payload包含tripInfo.startCity、tripInfo.endCity、driverInfo.name的完整记录和一条缺少tripInfo.endCity的记录；已在通用配置中维护好所需key树，包含vehicleInfo-plateNo、vehicleInfo-plateType、tripInfo-startCity、tripInfo-endCity、orderInfo-orderNo、driverInfo-name；当前账号具备数据质量模块下规则库配置、规则任务管理访问权限。 当前账号具备新建监控规则权限。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建单表校验规则页】页面 | 页面显示三步向导，当前位于“监控对象”步骤。 |
| 2 | 在【监控对象】步骤填写：<br>- 规则名称：KR_KEY_TOOLTIP_001<br>- 选择数据源：Doris3.x测试源<br>- 选择Catalog：internal<br>- 选择数据库：qa_key_range_doris<br>- 选择数据表：tb_vehicle_json<br>- 选择分区：dt=2026-03-30<br>然后点击【下一步】 | 成功进入“监控规则”步骤。 |
| 3 | 在【监控规则】步骤选择：<br>- 字段：payload_json<br>- 统计函数：key范围校验<br>然后将鼠标悬浮在【期望值】旁的提示图标上 | 悬浮提示显示“校验内容key信息需要在通用配置模块维护。”。 |

##### 【P1】验证规则描述输入50个字符时可正常保存key范围校验规则

> 前置条件
```
已准备跨数据源测试环境并完成建表与插数：1）Doris3.x：库qa_key_range_doris，表tb_vehicle_json（分区dt=2026-03-30），字段payload_json（JSON）、payload_str（STRING）、speed（INT），已插入一条payload_json包含vehicleInfo.plateNo、vehicleInfo.plateType、tripInfo.startCity的完整记录和一条缺少vehicleInfo.plateType的记录；2）Hive2.x：库qa_key_range_hive，表tb_order_json（分区dt=2026-03-30），字段order_payload（STRING）、driver_payload（STRING）、order_amount（DECIMAL），已插入一条order_payload包含orderInfo.orderNo、vehicleInfo.plateNo的完整记录和一条缺少orderInfo.orderNo的记录；3）SparkThrift2.x：库qa_key_range_spark，表tb_trip_json（分区dt=2026-03-30），字段trip_payload（STRING）、ext_payload（STRING）、mileage（BIGINT），已插入一条trip_payload包含tripInfo.startCity、tripInfo.endCity、driverInfo.name的完整记录和一条缺少tripInfo.endCity的记录；已在通用配置中维护好所需key树，包含vehicleInfo-plateNo、vehicleInfo-plateType、tripInfo-startCity、tripInfo-endCity、orderInfo-orderNo、driverInfo-name；当前账号具备数据质量模块下规则库配置、规则任务管理访问权限。 当前账号具备新建监控规则权限。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建单表校验规则页】页面 | 页面显示三步向导，当前位于“监控对象”步骤。 |
| 2 | 在【监控对象】步骤填写：<br>- 规则名称：KR_DESC_50_001<br>- 选择数据源：Doris3.x测试源<br>- 选择Catalog：internal<br>- 选择数据库：qa_key_range_doris<br>- 选择数据表：tb_vehicle_json<br>- 选择分区：dt=2026-03-30<br>然后点击【下一步】 | 成功进入“监控规则”步骤。 |
| 3 | 在【监控规则】步骤填写：<br>- 强弱规则：弱规则<br>- 规则描述：KRDESC_1234567890123456789012345678901234567890123<br>- 字段：payload_json<br>- 统计函数：key范围校验<br>- 校验方法：包含<br>- 期望值（校验内容）：vehicleInfo-plateNo | 规则描述输入框不出现红色提示，页面允许继续进入下一步。 |
| 4 | 点击【下一步】进入【调度属性】步骤并填写：<br>- 调度配置：调度周期选择“手动触发”<br>- 执行周期：选择“立即生成”<br>- 报告配置：勾选“无需生成报告”<br>然后点击【新建】 | 页面提示“新建规则成功！”，保存后的规则描述完整回显为“KRDESC_1234567890123456789012345678901234567890123”。 |

##### 【P1】验证规则描述输入51个字符时无法保存key范围校验规则

> 前置条件
```
已准备跨数据源测试环境并完成建表与插数：1）Doris3.x：库qa_key_range_doris，表tb_vehicle_json（分区dt=2026-03-30），字段payload_json（JSON）、payload_str（STRING）、speed（INT），已插入一条payload_json包含vehicleInfo.plateNo、vehicleInfo.plateType、tripInfo.startCity的完整记录和一条缺少vehicleInfo.plateType的记录；2）Hive2.x：库qa_key_range_hive，表tb_order_json（分区dt=2026-03-30），字段order_payload（STRING）、driver_payload（STRING）、order_amount（DECIMAL），已插入一条order_payload包含orderInfo.orderNo、vehicleInfo.plateNo的完整记录和一条缺少orderInfo.orderNo的记录；3）SparkThrift2.x：库qa_key_range_spark，表tb_trip_json（分区dt=2026-03-30），字段trip_payload（STRING）、ext_payload（STRING）、mileage（BIGINT），已插入一条trip_payload包含tripInfo.startCity、tripInfo.endCity、driverInfo.name的完整记录和一条缺少tripInfo.endCity的记录；已在通用配置中维护好所需key树，包含vehicleInfo-plateNo、vehicleInfo-plateType、tripInfo-startCity、tripInfo-endCity、orderInfo-orderNo、driverInfo-name；当前账号具备数据质量模块下规则库配置、规则任务管理访问权限。 当前账号具备新建监控规则权限。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建单表校验规则页】页面 | 页面显示三步向导，当前位于“监控对象”步骤。 |
| 2 | 在【监控对象】步骤填写：<br>- 规则名称：KR_DESC_51_001<br>- 选择数据源：Doris3.x测试源<br>- 选择Catalog：internal<br>- 选择数据库：qa_key_range_doris<br>- 选择数据表：tb_vehicle_json<br>- 选择分区：dt=2026-03-30<br>然后点击【下一步】 | 成功进入“监控规则”步骤。 |
| 3 | 在【监控规则】步骤填写：<br>- 强弱规则：弱规则<br>- 规则描述：KRDESC_12345678901234567890123456789012345678901234<br>- 字段：payload_json<br>- 统计函数：key范围校验<br>- 校验方法：包含<br>- 期望值（校验内容）：vehicleInfo-plateNo | 页面允许输入内容，但提交前保持当前表单状态。 |
| 4 | 点击【下一步】进入【调度属性】步骤并填写：<br>- 调度配置：调度周期选择“手动触发”<br>- 执行周期：选择“立即生成”<br>- 报告配置：勾选“无需生成报告”<br>然后点击【新建】 | 系统拦截提交并在“规则描述”下方提示“不超过50个字”，页面不出现“新建规则成功！”。 |

##### 【P0】验证未选择校验方法时无法新建key范围校验规则

> 前置条件
```
已准备跨数据源测试环境并完成建表与插数：1）Doris3.x：库qa_key_range_doris，表tb_vehicle_json（分区dt=2026-03-30），字段payload_json（JSON）、payload_str（STRING）、speed（INT），已插入一条payload_json包含vehicleInfo.plateNo、vehicleInfo.plateType、tripInfo.startCity的完整记录和一条缺少vehicleInfo.plateType的记录；2）Hive2.x：库qa_key_range_hive，表tb_order_json（分区dt=2026-03-30），字段order_payload（STRING）、driver_payload（STRING）、order_amount（DECIMAL），已插入一条order_payload包含orderInfo.orderNo、vehicleInfo.plateNo的完整记录和一条缺少orderInfo.orderNo的记录；3）SparkThrift2.x：库qa_key_range_spark，表tb_trip_json（分区dt=2026-03-30），字段trip_payload（STRING）、ext_payload（STRING）、mileage（BIGINT），已插入一条trip_payload包含tripInfo.startCity、tripInfo.endCity、driverInfo.name的完整记录和一条缺少tripInfo.endCity的记录；已在通用配置中维护好所需key树，包含vehicleInfo-plateNo、vehicleInfo-plateType、tripInfo-startCity、tripInfo-endCity、orderInfo-orderNo、driverInfo-name；当前账号具备数据质量模块下规则库配置、规则任务管理访问权限。 当前账号具备新建监控规则权限。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建单表校验规则页】页面 | 页面显示三步向导，当前位于“监控对象”步骤。 |
| 2 | 在【监控对象】步骤填写：<br>- 规则名称：KR_VERIFY_REQUIRED_001<br>- 选择数据源：Doris3.x测试源<br>- 选择Catalog：internal<br>- 选择数据库：qa_key_range_doris<br>- 选择数据表：tb_vehicle_json<br>- 选择分区：dt=2026-03-30<br>然后点击【下一步】 | 成功进入“监控规则”步骤。 |
| 3 | 在【监控规则】步骤填写：<br>- 强弱规则：弱规则<br>- 规则描述：校验方法为空校验<br>- 字段：payload_json<br>- 统计函数：key范围校验<br>- 校验方法：保持空值<br>- 期望值（校验内容）：vehicleInfo-plateNo | 除“校验方法”外，其余字段均处于有效状态。 |
| 4 | 点击【下一步】进入【调度属性】步骤并填写：<br>- 调度配置：调度周期选择“手动触发”<br>- 执行周期：选择“立即生成”<br>- 报告配置：勾选“无需生成报告”<br>然后点击【新建】 | 系统拦截提交并在“校验方法”下方提示“请选择校验方法”，页面不出现“新建规则成功！”。 |

##### 【P0】验证未选择校验内容时无法新建key范围校验规则

> 前置条件
```
已准备跨数据源测试环境并完成建表与插数：1）Doris3.x：库qa_key_range_doris，表tb_vehicle_json（分区dt=2026-03-30），字段payload_json（JSON）、payload_str（STRING）、speed（INT），已插入一条payload_json包含vehicleInfo.plateNo、vehicleInfo.plateType、tripInfo.startCity的完整记录和一条缺少vehicleInfo.plateType的记录；2）Hive2.x：库qa_key_range_hive，表tb_order_json（分区dt=2026-03-30），字段order_payload（STRING）、driver_payload（STRING）、order_amount（DECIMAL），已插入一条order_payload包含orderInfo.orderNo、vehicleInfo.plateNo的完整记录和一条缺少orderInfo.orderNo的记录；3）SparkThrift2.x：库qa_key_range_spark，表tb_trip_json（分区dt=2026-03-30），字段trip_payload（STRING）、ext_payload（STRING）、mileage（BIGINT），已插入一条trip_payload包含tripInfo.startCity、tripInfo.endCity、driverInfo.name的完整记录和一条缺少tripInfo.endCity的记录；已在通用配置中维护好所需key树，包含vehicleInfo-plateNo、vehicleInfo-plateType、tripInfo-startCity、tripInfo-endCity、orderInfo-orderNo、driverInfo-name；当前账号具备数据质量模块下规则库配置、规则任务管理访问权限。 当前账号具备新建监控规则权限。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建单表校验规则页】页面 | 页面显示三步向导，当前位于“监控对象”步骤。 |
| 2 | 在【监控对象】步骤填写：<br>- 规则名称：KR_THRESHOLD_REQUIRED_001<br>- 选择数据源：Doris3.x测试源<br>- 选择Catalog：internal<br>- 选择数据库：qa_key_range_doris<br>- 选择数据表：tb_vehicle_json<br>- 选择分区：dt=2026-03-30<br>然后点击【下一步】 | 成功进入“监控规则”步骤。 |
| 3 | 在【监控规则】步骤填写：<br>- 强弱规则：弱规则<br>- 规则描述：校验内容为空校验<br>- 字段：payload_json<br>- 统计函数：key范围校验<br>- 校验方法：包含<br>- 期望值（校验内容）：保持空值 | 除“期望值（校验内容）”外，其余字段均处于有效状态。 |
| 4 | 点击【下一步】进入【调度属性】步骤并填写：<br>- 调度配置：调度周期选择“手动触发”<br>- 执行周期：选择“立即生成”<br>- 报告配置：勾选“无需生成报告”<br>然后点击【新建】 | 系统拦截提交并在“期望值”区域提示“请选择校验内容”，页面不出现“新建规则成功！”。 |

### 编辑单表校验规则页

#### 保存回显与限制

##### 【P0】验证编辑页正确回显已保存的key范围校验配置并支持修改后保存

> 前置条件
```
已准备跨数据源测试环境并完成建表与插数：1）Doris3.x：库qa_key_range_doris，表tb_vehicle_json（分区dt=2026-03-30），字段payload_json（JSON）、payload_str（STRING）、speed（INT），已插入一条payload_json包含vehicleInfo.plateNo、vehicleInfo.plateType、tripInfo.startCity的完整记录和一条缺少vehicleInfo.plateType的记录；2）Hive2.x：库qa_key_range_hive，表tb_order_json（分区dt=2026-03-30），字段order_payload（STRING）、driver_payload（STRING）、order_amount（DECIMAL），已插入一条order_payload包含orderInfo.orderNo、vehicleInfo.plateNo的完整记录和一条缺少orderInfo.orderNo的记录；3）SparkThrift2.x：库qa_key_range_spark，表tb_trip_json（分区dt=2026-03-30），字段trip_payload（STRING）、ext_payload（STRING）、mileage（BIGINT），已插入一条trip_payload包含tripInfo.startCity、tripInfo.endCity、driverInfo.name的完整记录和一条缺少tripInfo.endCity的记录；已在通用配置中维护好所需key树，包含vehicleInfo-plateNo、vehicleInfo-plateType、tripInfo-startCity、tripInfo-endCity、orderInfo-orderNo、driverInfo-name；当前账号具备数据质量模块下规则库配置、规则任务管理访问权限。 已存在规则“KR_EDIT_JSON_001”，其监控对象为Doris3.x测试源/qa_key_range_doris/tb_vehicle_json/dt=2026-03-30，字段为payload_json，统计函数为key范围校验，校验方法为包含，期望值为vehicleInfo-plateNo;tripInfo-startCity，强弱规则为弱规则，规则描述为KR_EDIT_ORIGINAL_001；当前账号具备编辑监控规则权限。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 编辑单表校验规则页】页面 | 页面显示已保存规则的三步向导，表单值加载完成。 |
| 2 | 查看已保存配置回显：<br>- 规则名称：KR_EDIT_JSON_001<br>- 选择数据源：Doris3.x测试源<br>- 选择数据库：qa_key_range_doris<br>- 选择数据表：tb_vehicle_json<br>- 字段：payload_json<br>- 统计函数：key范围校验<br>- 校验方法：包含<br>- 期望值（校验内容）：vehicleInfo-plateNo;tripInfo-startCity<br>- 强弱规则：弱规则<br>- 规则描述：KR_EDIT_ORIGINAL_001 | 监控对象、监控规则中的上述值全部正确回显，无空值或错位展示。 |
| 3 | 在【监控规则】步骤修改如下，并在【调度属性】步骤点击【保存】：<br>- 校验方法：不包含<br>- 期望值（校验内容）：vehicleInfo-plateType<br>- 强弱规则：强规则<br>- 规则描述：KR_EDIT_UPDATE_001 | 页面提示“更新成功”，当前规则保存为新配置。 |
| 4 | 刷新当前【编辑单表校验规则页】页面 | 页面继续回显修改后的值：校验方法为“不包含”，期望值为“vehicleInfo-plateType”，强弱规则为“强规则”，规则描述为“KR_EDIT_UPDATE_001”。 |

##### 【P1】验证编辑页切换到仅含数值字段的数据表后无法继续配置key范围校验

> 前置条件
```
已准备跨数据源测试环境并完成建表与插数：1）Doris3.x：库qa_key_range_doris，表tb_vehicle_json（分区dt=2026-03-30），字段payload_json（JSON）、payload_str（STRING）、speed（INT），已插入一条payload_json包含vehicleInfo.plateNo、vehicleInfo.plateType、tripInfo.startCity的完整记录和一条缺少vehicleInfo.plateType的记录；2）Hive2.x：库qa_key_range_hive，表tb_order_json（分区dt=2026-03-30），字段order_payload（STRING）、driver_payload（STRING）、order_amount（DECIMAL），已插入一条order_payload包含orderInfo.orderNo、vehicleInfo.plateNo的完整记录和一条缺少orderInfo.orderNo的记录；3）SparkThrift2.x：库qa_key_range_spark，表tb_trip_json（分区dt=2026-03-30），字段trip_payload（STRING）、ext_payload（STRING）、mileage（BIGINT），已插入一条trip_payload包含tripInfo.startCity、tripInfo.endCity、driverInfo.name的完整记录和一条缺少tripInfo.endCity的记录；已在通用配置中维护好所需key树，包含vehicleInfo-plateNo、vehicleInfo-plateType、tripInfo-startCity、tripInfo-endCity、orderInfo-orderNo、driverInfo-name；当前账号具备数据质量模块下规则库配置、规则任务管理访问权限。 已存在规则“KR_EDIT_SWITCH_001”，其监控对象为SparkThrift2.x测试源/spark_catalog/qa_key_range_spark/tb_trip_json/dt=2026-03-30，字段为trip_payload，统计函数为key范围校验，校验方法为包含，期望值为tripInfo-endCity；SparkThrift2.x库另有表tb_trip_metric_only（分区dt=2026-03-30），字段metric_value（INT）、trip_cnt（BIGINT），已插入两条数值记录；当前账号具备编辑监控规则权限。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 编辑单表校验规则页】页面 | 页面显示已保存规则的三步向导，表单值加载完成。 |
| 2 | 在【监控对象】步骤修改：<br>- 选择数据源：SparkThrift2.x测试源<br>- 选择Catalog：spark_catalog<br>- 选择数据库：qa_key_range_spark<br>- 选择数据表：tb_trip_metric_only<br>- 选择分区：dt=2026-03-30<br>然后点击【下一步】 | 成功进入“监控规则”步骤，旧表对应的字段信息已重新加载。 |
| 3 | 查看【监控规则】步骤中的【字段】下拉列表 | 原已选字段trip_payload被清空；字段下拉列表不提供metric_value、trip_cnt以外的key范围校验候选字段，页面没有可用的json或string字段可选。 |
| 4 | 点击【下一步】 | 系统停留在“监控规则”步骤，并在“字段”下方提示“请选择字段”。 |

### 规则详情页

#### 信息回显

##### 【P0】验证规则详情页正确展示key范围校验相关回显信息

> 前置条件
```
已准备跨数据源测试环境并完成建表与插数：1）Doris3.x：库qa_key_range_doris，表tb_vehicle_json（分区dt=2026-03-30），字段payload_json（JSON）、payload_str（STRING）、speed（INT），已插入一条payload_json包含vehicleInfo.plateNo、vehicleInfo.plateType、tripInfo.startCity的完整记录和一条缺少vehicleInfo.plateType的记录；2）Hive2.x：库qa_key_range_hive，表tb_order_json（分区dt=2026-03-30），字段order_payload（STRING）、driver_payload（STRING）、order_amount（DECIMAL），已插入一条order_payload包含orderInfo.orderNo、vehicleInfo.plateNo的完整记录和一条缺少orderInfo.orderNo的记录；3）SparkThrift2.x：库qa_key_range_spark，表tb_trip_json（分区dt=2026-03-30），字段trip_payload（STRING）、ext_payload（STRING）、mileage（BIGINT），已插入一条trip_payload包含tripInfo.startCity、tripInfo.endCity、driverInfo.name的完整记录和一条缺少tripInfo.endCity的记录；已在通用配置中维护好所需key树，包含vehicleInfo-plateNo、vehicleInfo-plateType、tripInfo-startCity、tripInfo-endCity、orderInfo-orderNo、driverInfo-name；当前账号具备数据质量模块下规则库配置、规则任务管理访问权限。 已存在规则“KR_DETAIL_JSON_001”，其监控对象为Doris3.x测试源/qa_key_range_doris/tb_vehicle_json/dt=2026-03-30，字段为payload_json，统计函数为key范围校验，校验方法为不包含，期望值为vehicleInfo-plateNo;tripInfo-startCity，强弱规则为强规则，规则描述为KRDETAIL_001；当前账号具备查看监控规则详情权限。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 规则详情页】页面 | 详情页加载成功，展示基础信息和监控规则信息区域。 |
| 2 | 查看详情页中的监控规则信息 | 监控规则区域准确展示：字段“payload_json”、统计函数“key范围校验”、校验方法“不包含”、期望值“vehicleInfo-plateNo;tripInfo-startCity”、强弱规则“强规则”、规则描述“KRDETAIL_001”。 |

## 数据质量报告

### 列表页

#### 报告定位

##### 【P1】验证已生成报告列表可定位key范围校验相关报告并进入详情

> 前置条件
```
使用具备【数据质量报告】访问权限的账号登录系统，并完成以下数据准备与任务执行：
1. Doris3.x：在库 qa_doris 创建表 qa_key_range_report_doris(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入 4 条数据：
   - 1, "DORIS-PASS-001", "{"vehicle":{"brand":"岚图","series":"FREE"},"battery":{"soc":88}}", "2026-03-29"
   - 2, "DORIS-FAIL-001", "{"vehicle":{"brand":"岚图","series":"FREE"}}", "2026-03-29"
   - 3, "DORIS-NOTIN-PASS-001", "{"vehicle":{"brand":"岚图"}}", "2026-03-29"
   - 4, "DORIS-NOTIN-FAIL-001", "{"vehicle":{"brand":"岚图"},"debug":{"tempKey":"X1"}}", "2026-03-29"
2. Hive2.x：在库 qa_hive 创建表 qa_key_range_report_hive(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入与 Doris 等价的 4 条数据，vin 前缀替换为 HIVE。
3. SparkThrift2.x：在库 qa_spark 创建表 qa_key_range_report_spark(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入与 Doris 等价的 4 条数据，vin 前缀替换为 SPARK。
4. 已分别对三类数据源执行两条 key范围校验规则并生成报告：
   - 规则A：统计函数=key范围校验，校验方法=包含，校验内容=vehicle-brand;vehicle-series;battery-soc，强弱规则=强规则，规则描述=校验上报 JSON 必须包含车辆品牌、车系与电池 SOC。
   - 规则B：统计函数=key范围校验，校验方法=不包含，校验内容=debug-tempKey，强弱规则=弱规则，规则描述=校验上报 JSON 不得包含临时调试 key。
5. 已生成报告【Doris_key范围校验报告_20260329】【Hive_key范围校验报告_20260329】【Spark_key范围校验报告_20260329】；三份报告均已展示 key范围校验 结果，其中 Doris 与 Hive 报告各存在一条可查看明细/日志的失败记录，Spark 报告至少存在一条校验通过记录用于验证“通过不落明细”。
6. 本用例聚焦报告列表入口，要求三份报告均已执行完成并可从【已生成报告】页签查询。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 数据质量报告 → 列表页】页面 | 页面加载成功，展示【已配置报告】【已生成报告】页签、报告名称搜索项和报告列表 |
| 2 | 点击【已生成报告】页签，在「报告名称」输入框依次输入「Doris_key范围校验报告_20260329」「Hive_key范围校验报告_20260329」「Spark_key范围校验报告_20260329」并执行搜索 | 每次搜索均返回对应报告记录，列表中的报告名称、数据源类型、数据表和生成时间与前置条件一致 |
| 3 | 选择报告「Doris_key范围校验报告_20260329」，点击【报告详情】 | 跳转到报告详情页，规则校验明细区域可定位到规则类型为「完整性校验」、规则名称为「key范围校验」的记录 |

### 详情页

#### 结果展示

##### 【P0】验证详情页展示包含场景校验通过结果且不提供失败明细入口

> 前置条件
```
使用具备【数据质量报告】访问权限的账号登录系统，并完成以下数据准备与任务执行：
1. Doris3.x：在库 qa_doris 创建表 qa_key_range_report_doris(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入 4 条数据：
   - 1, "DORIS-PASS-001", "{"vehicle":{"brand":"岚图","series":"FREE"},"battery":{"soc":88}}", "2026-03-29"
   - 2, "DORIS-FAIL-001", "{"vehicle":{"brand":"岚图","series":"FREE"}}", "2026-03-29"
   - 3, "DORIS-NOTIN-PASS-001", "{"vehicle":{"brand":"岚图"}}", "2026-03-29"
   - 4, "DORIS-NOTIN-FAIL-001", "{"vehicle":{"brand":"岚图"},"debug":{"tempKey":"X1"}}", "2026-03-29"
2. Hive2.x：在库 qa_hive 创建表 qa_key_range_report_hive(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入与 Doris 等价的 4 条数据，vin 前缀替换为 HIVE。
3. SparkThrift2.x：在库 qa_spark 创建表 qa_key_range_report_spark(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入与 Doris 等价的 4 条数据，vin 前缀替换为 SPARK。
4. 已分别对三类数据源执行两条 key范围校验规则并生成报告：
   - 规则A：统计函数=key范围校验，校验方法=包含，校验内容=vehicle-brand;vehicle-series;battery-soc，强弱规则=强规则，规则描述=校验上报 JSON 必须包含车辆品牌、车系与电池 SOC。
   - 规则B：统计函数=key范围校验，校验方法=不包含，校验内容=debug-tempKey，强弱规则=弱规则，规则描述=校验上报 JSON 不得包含临时调试 key。
5. 已生成报告【Doris_key范围校验报告_20260329】【Hive_key范围校验报告_20260329】【Spark_key范围校验报告_20260329】；三份报告均已展示 key范围校验 结果，其中 Doris 与 Hive 报告各存在一条可查看明细/日志的失败记录，Spark 报告至少存在一条校验通过记录用于验证“通过不落明细”。
6. Spark_key范围校验报告_20260329 中存在「包含」方法的通过记录，对应样本 vin 为 SPARK-PASS-001。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 数据质量报告 → 详情页】页面，打开报告「Spark_key范围校验报告_20260329」的【报告详情】 | 成功进入报告详情页，页面展示报告基础信息和规则校验明细区域 |
| 2 | 在规则校验明细中定位字段「event_json」、规则名称「key范围校验」、校验方法「包含」、校验内容「vehicle-brand;vehicle-series;battery-soc」的记录 | 该记录展示在「完整性校验」分类下，字段类型显示为「json」 |
| 3 | 查看该记录的「质检结果」「未通过原因」「详情说明」和操作列 | 该记录显示「质检结果=校验通过」「未通过原因=--」「详情说明=符合规则key范围包含"vehicle-brand;vehicle-series;battery-soc"」；操作列不展示【查看详情】 |

##### 【P0】验证详情页展示包含场景校验不通过结果并提供查看详情入口

> 前置条件
```
使用具备【数据质量报告】访问权限的账号登录系统，并完成以下数据准备与任务执行：
1. Doris3.x：在库 qa_doris 创建表 qa_key_range_report_doris(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入 4 条数据：
   - 1, "DORIS-PASS-001", "{"vehicle":{"brand":"岚图","series":"FREE"},"battery":{"soc":88}}", "2026-03-29"
   - 2, "DORIS-FAIL-001", "{"vehicle":{"brand":"岚图","series":"FREE"}}", "2026-03-29"
   - 3, "DORIS-NOTIN-PASS-001", "{"vehicle":{"brand":"岚图"}}", "2026-03-29"
   - 4, "DORIS-NOTIN-FAIL-001", "{"vehicle":{"brand":"岚图"},"debug":{"tempKey":"X1"}}", "2026-03-29"
2. Hive2.x：在库 qa_hive 创建表 qa_key_range_report_hive(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入与 Doris 等价的 4 条数据，vin 前缀替换为 HIVE。
3. SparkThrift2.x：在库 qa_spark 创建表 qa_key_range_report_spark(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入与 Doris 等价的 4 条数据，vin 前缀替换为 SPARK。
4. 已分别对三类数据源执行两条 key范围校验规则并生成报告：
   - 规则A：统计函数=key范围校验，校验方法=包含，校验内容=vehicle-brand;vehicle-series;battery-soc，强弱规则=强规则，规则描述=校验上报 JSON 必须包含车辆品牌、车系与电池 SOC。
   - 规则B：统计函数=key范围校验，校验方法=不包含，校验内容=debug-tempKey，强弱规则=弱规则，规则描述=校验上报 JSON 不得包含临时调试 key。
5. 已生成报告【Doris_key范围校验报告_20260329】【Hive_key范围校验报告_20260329】【Spark_key范围校验报告_20260329】；三份报告均已展示 key范围校验 结果，其中 Doris 与 Hive 报告各存在一条可查看明细/日志的失败记录，Spark 报告至少存在一条校验通过记录用于验证“通过不落明细”。
6. Doris_key范围校验报告_20260329 中存在「包含」方法的失败记录，对应样本 vin 为 DORIS-FAIL-001，缺少 key battery.soc。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 数据质量报告 → 详情页】页面，打开报告「Doris_key范围校验报告_20260329」的【报告详情】 | 成功进入报告详情页，规则校验明细区域已加载当前报告的 key范围校验 结果 |
| 2 | 在规则校验明细中定位字段「event_json」、规则名称「key范围校验」、校验方法「包含」、校验内容「vehicle-brand;vehicle-series;battery-soc」的失败记录 | 该记录展示规则类型「完整性校验」、字段类型「json」，并与 qa_key_range_report_doris 表的失败执行结果对应 |
| 3 | 查看该记录的「质检结果」「未通过原因」「详情说明」和操作列 | 该记录显示「质检结果=校验不通过」「未通过原因=key范围校验未通过」「详情说明=不符合规则key范围包含"vehicle-brand;vehicle-series;battery-soc"」；操作列展示【查看详情】 |

##### 【P0】验证详情页展示不包含场景校验通过结果且不提供失败明细入口

> 前置条件
```
使用具备【数据质量报告】访问权限的账号登录系统，并完成以下数据准备与任务执行：
1. Doris3.x：在库 qa_doris 创建表 qa_key_range_report_doris(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入 4 条数据：
   - 1, "DORIS-PASS-001", "{"vehicle":{"brand":"岚图","series":"FREE"},"battery":{"soc":88}}", "2026-03-29"
   - 2, "DORIS-FAIL-001", "{"vehicle":{"brand":"岚图","series":"FREE"}}", "2026-03-29"
   - 3, "DORIS-NOTIN-PASS-001", "{"vehicle":{"brand":"岚图"}}", "2026-03-29"
   - 4, "DORIS-NOTIN-FAIL-001", "{"vehicle":{"brand":"岚图"},"debug":{"tempKey":"X1"}}", "2026-03-29"
2. Hive2.x：在库 qa_hive 创建表 qa_key_range_report_hive(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入与 Doris 等价的 4 条数据，vin 前缀替换为 HIVE。
3. SparkThrift2.x：在库 qa_spark 创建表 qa_key_range_report_spark(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入与 Doris 等价的 4 条数据，vin 前缀替换为 SPARK。
4. 已分别对三类数据源执行两条 key范围校验规则并生成报告：
   - 规则A：统计函数=key范围校验，校验方法=包含，校验内容=vehicle-brand;vehicle-series;battery-soc，强弱规则=强规则，规则描述=校验上报 JSON 必须包含车辆品牌、车系与电池 SOC。
   - 规则B：统计函数=key范围校验，校验方法=不包含，校验内容=debug-tempKey，强弱规则=弱规则，规则描述=校验上报 JSON 不得包含临时调试 key。
5. 已生成报告【Doris_key范围校验报告_20260329】【Hive_key范围校验报告_20260329】【Spark_key范围校验报告_20260329】；三份报告均已展示 key范围校验 结果，其中 Doris 与 Hive 报告各存在一条可查看明细/日志的失败记录，Spark 报告至少存在一条校验通过记录用于验证“通过不落明细”。
6. Spark_key范围校验报告_20260329 中存在「不包含」方法的通过记录，对应样本 vin 为 SPARK-NOTIN-PASS-001，不包含 debug.tempKey。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 数据质量报告 → 详情页】页面，打开报告「Spark_key范围校验报告_20260329」的【报告详情】 | 成功进入报告详情页，页面展示当前报告的规则校验明细 |
| 2 | 在规则校验明细中定位字段「event_json」、规则名称「key范围校验」、校验方法「不包含」、校验内容「debug-tempKey」的记录 | 该记录展示在「完整性校验」分类下，字段类型显示为「json」 |
| 3 | 查看该记录的「质检结果」「未通过原因」「详情说明」和操作列 | 该记录显示「质检结果=校验通过」「未通过原因=--」「详情说明=符合规则key范围不包含"debug-tempKey"」；操作列不展示【查看详情】 |

##### 【P0】验证详情页展示不包含场景校验不通过结果并提供查看详情和查看日志入口

> 前置条件
```
使用具备【数据质量报告】访问权限的账号登录系统，并完成以下数据准备与任务执行：
1. Doris3.x：在库 qa_doris 创建表 qa_key_range_report_doris(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入 4 条数据：
   - 1, "DORIS-PASS-001", "{"vehicle":{"brand":"岚图","series":"FREE"},"battery":{"soc":88}}", "2026-03-29"
   - 2, "DORIS-FAIL-001", "{"vehicle":{"brand":"岚图","series":"FREE"}}", "2026-03-29"
   - 3, "DORIS-NOTIN-PASS-001", "{"vehicle":{"brand":"岚图"}}", "2026-03-29"
   - 4, "DORIS-NOTIN-FAIL-001", "{"vehicle":{"brand":"岚图"},"debug":{"tempKey":"X1"}}", "2026-03-29"
2. Hive2.x：在库 qa_hive 创建表 qa_key_range_report_hive(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入与 Doris 等价的 4 条数据，vin 前缀替换为 HIVE。
3. SparkThrift2.x：在库 qa_spark 创建表 qa_key_range_report_spark(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入与 Doris 等价的 4 条数据，vin 前缀替换为 SPARK。
4. 已分别对三类数据源执行两条 key范围校验规则并生成报告：
   - 规则A：统计函数=key范围校验，校验方法=包含，校验内容=vehicle-brand;vehicle-series;battery-soc，强弱规则=强规则，规则描述=校验上报 JSON 必须包含车辆品牌、车系与电池 SOC。
   - 规则B：统计函数=key范围校验，校验方法=不包含，校验内容=debug-tempKey，强弱规则=弱规则，规则描述=校验上报 JSON 不得包含临时调试 key。
5. 已生成报告【Doris_key范围校验报告_20260329】【Hive_key范围校验报告_20260329】【Spark_key范围校验报告_20260329】；三份报告均已展示 key范围校验 结果，其中 Doris 与 Hive 报告各存在一条可查看明细/日志的失败记录，Spark 报告至少存在一条校验通过记录用于验证“通过不落明细”。
6. Hive_key范围校验报告_20260329 中存在「不包含」方法的失败记录，对应样本 vin 为 HIVE-NOTIN-FAIL-001，event_json 中命中了 debug.tempKey。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 数据质量报告 → 详情页】页面，打开报告「Hive_key范围校验报告_20260329」的【报告详情】 | 成功进入报告详情页，规则校验明细区域已加载当前报告的 key范围校验 结果 |
| 2 | 在规则校验明细中定位字段「event_json」、规则名称「key范围校验」、校验方法「不包含」、校验内容「debug-tempKey」的失败记录 | 该记录展示规则类型「完整性校验」、字段类型「json」，并与 qa_key_range_report_hive 表的失败执行结果对应 |
| 3 | 查看该记录的「质检结果」「未通过原因」「详情说明」和操作列 | 该记录显示「质检结果=校验不通过」「未通过原因=key范围校验未通过」「详情说明=不符合规则key范围不包含"debug-tempKey"」；操作列同时展示【查看详情】和【查看日志】 |

#### 规则配置回显

##### 【P0】验证详情页规则配置详情正确回显key范围校验配置

> 前置条件
```
使用具备【数据质量报告】访问权限的账号登录系统，并完成以下数据准备与任务执行：
1. Doris3.x：在库 qa_doris 创建表 qa_key_range_report_doris(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入 4 条数据：
   - 1, "DORIS-PASS-001", "{"vehicle":{"brand":"岚图","series":"FREE"},"battery":{"soc":88}}", "2026-03-29"
   - 2, "DORIS-FAIL-001", "{"vehicle":{"brand":"岚图","series":"FREE"}}", "2026-03-29"
   - 3, "DORIS-NOTIN-PASS-001", "{"vehicle":{"brand":"岚图"}}", "2026-03-29"
   - 4, "DORIS-NOTIN-FAIL-001", "{"vehicle":{"brand":"岚图"},"debug":{"tempKey":"X1"}}", "2026-03-29"
2. Hive2.x：在库 qa_hive 创建表 qa_key_range_report_hive(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入与 Doris 等价的 4 条数据，vin 前缀替换为 HIVE。
3. SparkThrift2.x：在库 qa_spark 创建表 qa_key_range_report_spark(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入与 Doris 等价的 4 条数据，vin 前缀替换为 SPARK。
4. 已分别对三类数据源执行两条 key范围校验规则并生成报告：
   - 规则A：统计函数=key范围校验，校验方法=包含，校验内容=vehicle-brand;vehicle-series;battery-soc，强弱规则=强规则，规则描述=校验上报 JSON 必须包含车辆品牌、车系与电池 SOC。
   - 规则B：统计函数=key范围校验，校验方法=不包含，校验内容=debug-tempKey，强弱规则=弱规则，规则描述=校验上报 JSON 不得包含临时调试 key。
5. 已生成报告【Doris_key范围校验报告_20260329】【Hive_key范围校验报告_20260329】【Spark_key范围校验报告_20260329】；三份报告均已展示 key范围校验 结果，其中 Doris 与 Hive 报告各存在一条可查看明细/日志的失败记录，Spark 报告至少存在一条校验通过记录用于验证“通过不落明细”。
6. Doris_key范围校验报告_20260329 的详情页已加载出规则A、规则B 两条 key范围校验记录。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 数据质量报告 → 详情页】页面，打开报告「Doris_key范围校验报告_20260329」的【报告详情】 | 成功进入报告详情页，规则校验明细区域可查看当前报告关联的 key范围校验 记录 |
| 2 | 在规则校验明细中查看 event_json 字段的两条「key范围校验」记录，并悬浮查看「校验内容」全文 | 页面正确回显「规则类型=完整性校验」「统计函数/规则名称=key范围校验」；规则A 显示「校验方法=包含」「校验内容=vehicle-brand;vehicle-series;battery-soc」「强弱规则=强规则」「规则描述=校验上报 JSON 必须包含车辆品牌、车系与电池 SOC」，规则B 显示「校验方法=不包含」「校验内容=debug-tempKey」「强弱规则=弱规则」「规则描述=校验上报 JSON 不得包含临时调试 key」；表名显示为「qa_key_range_report_doris」 |

### 明细弹窗

#### 明细展示

##### 【P0】验证失败明细查看展示key范围校验失败记录与标题文案

> 前置条件
```
使用具备【数据质量报告】访问权限的账号登录系统，并完成以下数据准备与任务执行：
1. Doris3.x：在库 qa_doris 创建表 qa_key_range_report_doris(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入 4 条数据：
   - 1, "DORIS-PASS-001", "{"vehicle":{"brand":"岚图","series":"FREE"},"battery":{"soc":88}}", "2026-03-29"
   - 2, "DORIS-FAIL-001", "{"vehicle":{"brand":"岚图","series":"FREE"}}", "2026-03-29"
   - 3, "DORIS-NOTIN-PASS-001", "{"vehicle":{"brand":"岚图"}}", "2026-03-29"
   - 4, "DORIS-NOTIN-FAIL-001", "{"vehicle":{"brand":"岚图"},"debug":{"tempKey":"X1"}}", "2026-03-29"
2. Hive2.x：在库 qa_hive 创建表 qa_key_range_report_hive(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入与 Doris 等价的 4 条数据，vin 前缀替换为 HIVE。
3. SparkThrift2.x：在库 qa_spark 创建表 qa_key_range_report_spark(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入与 Doris 等价的 4 条数据，vin 前缀替换为 SPARK。
4. 已分别对三类数据源执行两条 key范围校验规则并生成报告：
   - 规则A：统计函数=key范围校验，校验方法=包含，校验内容=vehicle-brand;vehicle-series;battery-soc，强弱规则=强规则，规则描述=校验上报 JSON 必须包含车辆品牌、车系与电池 SOC。
   - 规则B：统计函数=key范围校验，校验方法=不包含，校验内容=debug-tempKey，强弱规则=弱规则，规则描述=校验上报 JSON 不得包含临时调试 key。
5. 已生成报告【Doris_key范围校验报告_20260329】【Hive_key范围校验报告_20260329】【Spark_key范围校验报告_20260329】；三份报告均已展示 key范围校验 结果，其中 Doris 与 Hive 报告各存在一条可查看明细/日志的失败记录，Spark 报告至少存在一条校验通过记录用于验证“通过不落明细”。
6. Doris_key范围校验报告_20260329 的「包含」失败记录已生成失败明细，失败样本为 DORIS-FAIL-001。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 数据质量报告 → 明细弹窗】页面，打开报告「Doris_key范围校验报告_20260329」详情，在「包含」失败记录操作列点击【查看详情】 | 成功打开失败明细窗口，标题显示为「查看"完整性校验-key范围校验"明细」 |
| 2 | 查看失败明细列表中的业务字段和校验字段高亮情况 | 明细列表保留 id、vin、event_json、dt 等原始业务字段；失败样本「DORIS-FAIL-001」可见，event_json 中与校验字段相关的缺失 key「battery.soc」以红色标识，页面仅展示当前失败规则对应的异常记录 |

#### 明细下载

##### 【P1】验证失败明细下载结果仅输出失败记录并保留标红字段

> 前置条件
```
使用具备【数据质量报告】访问权限的账号登录系统，并完成以下数据准备与任务执行：
1. Doris3.x：在库 qa_doris 创建表 qa_key_range_report_doris(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入 4 条数据：
   - 1, "DORIS-PASS-001", "{"vehicle":{"brand":"岚图","series":"FREE"},"battery":{"soc":88}}", "2026-03-29"
   - 2, "DORIS-FAIL-001", "{"vehicle":{"brand":"岚图","series":"FREE"}}", "2026-03-29"
   - 3, "DORIS-NOTIN-PASS-001", "{"vehicle":{"brand":"岚图"}}", "2026-03-29"
   - 4, "DORIS-NOTIN-FAIL-001", "{"vehicle":{"brand":"岚图"},"debug":{"tempKey":"X1"}}", "2026-03-29"
2. Hive2.x：在库 qa_hive 创建表 qa_key_range_report_hive(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入与 Doris 等价的 4 条数据，vin 前缀替换为 HIVE。
3. SparkThrift2.x：在库 qa_spark 创建表 qa_key_range_report_spark(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入与 Doris 等价的 4 条数据，vin 前缀替换为 SPARK。
4. 已分别对三类数据源执行两条 key范围校验规则并生成报告：
   - 规则A：统计函数=key范围校验，校验方法=包含，校验内容=vehicle-brand;vehicle-series;battery-soc，强弱规则=强规则，规则描述=校验上报 JSON 必须包含车辆品牌、车系与电池 SOC。
   - 规则B：统计函数=key范围校验，校验方法=不包含，校验内容=debug-tempKey，强弱规则=弱规则，规则描述=校验上报 JSON 不得包含临时调试 key。
5. 已生成报告【Doris_key范围校验报告_20260329】【Hive_key范围校验报告_20260329】【Spark_key范围校验报告_20260329】；三份报告均已展示 key范围校验 结果，其中 Doris 与 Hive 报告各存在一条可查看明细/日志的失败记录，Spark 报告至少存在一条校验通过记录用于验证“通过不落明细”。
6. Hive_key范围校验报告_20260329 的「不包含」失败记录已生成失败明细，失败样本为 HIVE-NOTIN-FAIL-001。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 数据质量报告 → 明细弹窗】页面，打开报告「Hive_key范围校验报告_20260329」详情，在「不包含」失败记录操作列点击【查看详情】 | 成功打开失败明细窗口，标题显示为「查看"完整性校验-key范围校验"明细」 |
| 2 | 点击明细窗口中的【下载】按钮并打开下载文件 | 浏览器开始下载当前失败规则的明细文件；下载文件仅包含失败样本「HIVE-NOTIN-FAIL-001」，不包含通过样本；文件保留原始业务字段，命中的校验字段「debug.tempKey」对应内容保持红色标识 |

### 日志弹窗

#### 日志展示

##### 【P1】验证失败日志查看展示key范围校验失败原因与上下文

> 前置条件
```
使用具备【数据质量报告】访问权限的账号登录系统，并完成以下数据准备与任务执行：
1. Doris3.x：在库 qa_doris 创建表 qa_key_range_report_doris(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入 4 条数据：
   - 1, "DORIS-PASS-001", "{"vehicle":{"brand":"岚图","series":"FREE"},"battery":{"soc":88}}", "2026-03-29"
   - 2, "DORIS-FAIL-001", "{"vehicle":{"brand":"岚图","series":"FREE"}}", "2026-03-29"
   - 3, "DORIS-NOTIN-PASS-001", "{"vehicle":{"brand":"岚图"}}", "2026-03-29"
   - 4, "DORIS-NOTIN-FAIL-001", "{"vehicle":{"brand":"岚图"},"debug":{"tempKey":"X1"}}", "2026-03-29"
2. Hive2.x：在库 qa_hive 创建表 qa_key_range_report_hive(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入与 Doris 等价的 4 条数据，vin 前缀替换为 HIVE。
3. SparkThrift2.x：在库 qa_spark 创建表 qa_key_range_report_spark(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入与 Doris 等价的 4 条数据，vin 前缀替换为 SPARK。
4. 已分别对三类数据源执行两条 key范围校验规则并生成报告：
   - 规则A：统计函数=key范围校验，校验方法=包含，校验内容=vehicle-brand;vehicle-series;battery-soc，强弱规则=强规则，规则描述=校验上报 JSON 必须包含车辆品牌、车系与电池 SOC。
   - 规则B：统计函数=key范围校验，校验方法=不包含，校验内容=debug-tempKey，强弱规则=弱规则，规则描述=校验上报 JSON 不得包含临时调试 key。
5. 已生成报告【Doris_key范围校验报告_20260329】【Hive_key范围校验报告_20260329】【Spark_key范围校验报告_20260329】；三份报告均已展示 key范围校验 结果，其中 Doris 与 Hive 报告各存在一条可查看明细/日志的失败记录，Spark 报告至少存在一条校验通过记录用于验证“通过不落明细”。
6. Doris_key范围校验报告_20260329 的「包含」失败记录已生成失败日志，失败样本为 DORIS-FAIL-001。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 数据质量报告 → 日志弹窗】页面，打开报告「Doris_key范围校验报告_20260329」详情，在「包含」失败记录操作列点击【查看日志】 | 成功打开失败日志窗口或页面，当前日志上下文与所选 key范围校验 失败记录一致 |
| 2 | 查看日志正文中的规则信息、表信息和失败原因 | 日志中展示当前报告名「Doris_key范围校验报告_20260329」、表名「qa_key_range_report_doris」、规则类型「完整性校验」、规则名称「key范围校验」、失败原因「key范围校验未通过」，并包含缺失 key 路径「battery.soc」 |

#### 日志下载

##### 【P1】验证失败日志下载结果与页面日志一致

> 前置条件
```
使用具备【数据质量报告】访问权限的账号登录系统，并完成以下数据准备与任务执行：
1. Doris3.x：在库 qa_doris 创建表 qa_key_range_report_doris(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入 4 条数据：
   - 1, "DORIS-PASS-001", "{"vehicle":{"brand":"岚图","series":"FREE"},"battery":{"soc":88}}", "2026-03-29"
   - 2, "DORIS-FAIL-001", "{"vehicle":{"brand":"岚图","series":"FREE"}}", "2026-03-29"
   - 3, "DORIS-NOTIN-PASS-001", "{"vehicle":{"brand":"岚图"}}", "2026-03-29"
   - 4, "DORIS-NOTIN-FAIL-001", "{"vehicle":{"brand":"岚图"},"debug":{"tempKey":"X1"}}", "2026-03-29"
2. Hive2.x：在库 qa_hive 创建表 qa_key_range_report_hive(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入与 Doris 等价的 4 条数据，vin 前缀替换为 HIVE。
3. SparkThrift2.x：在库 qa_spark 创建表 qa_key_range_report_spark(id BIGINT, vin STRING, event_json STRING, dt STRING)，插入与 Doris 等价的 4 条数据，vin 前缀替换为 SPARK。
4. 已分别对三类数据源执行两条 key范围校验规则并生成报告：
   - 规则A：统计函数=key范围校验，校验方法=包含，校验内容=vehicle-brand;vehicle-series;battery-soc，强弱规则=强规则，规则描述=校验上报 JSON 必须包含车辆品牌、车系与电池 SOC。
   - 规则B：统计函数=key范围校验，校验方法=不包含，校验内容=debug-tempKey，强弱规则=弱规则，规则描述=校验上报 JSON 不得包含临时调试 key。
5. 已生成报告【Doris_key范围校验报告_20260329】【Hive_key范围校验报告_20260329】【Spark_key范围校验报告_20260329】；三份报告均已展示 key范围校验 结果，其中 Doris 与 Hive 报告各存在一条可查看明细/日志的失败记录，Spark 报告至少存在一条校验通过记录用于验证“通过不落明细”。
6. Hive_key范围校验报告_20260329 的「不包含」失败记录已生成失败日志，失败样本为 HIVE-NOTIN-FAIL-001。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 数据质量报告 → 日志弹窗】页面，打开报告「Hive_key范围校验报告_20260329」详情，在「不包含」失败记录操作列点击【查看日志】 | 成功打开失败日志窗口或页面，页面日志内容与当前失败记录一一对应 |
| 2 | 点击【下载日志】并打开下载文件 | 浏览器开始下载当前失败日志文件；下载文件内容与页面日志一致，包含报告名「Hive_key范围校验报告_20260329」、表名「qa_key_range_report_hive」、规则名称「key范围校验」、失败原因「key范围校验未通过」以及命中的 key 路径「debug.tempKey」，不包含其他规则的日志内容 |
