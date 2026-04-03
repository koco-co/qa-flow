---
suite_name: 【内置规则丰富】完整性-json中key值范围校验
description: 【内置规则丰富】完整性-json中key值范围校验
prd_id: 15693
prd_version: v6.4.10
prd_path: cases/prds/202604/【内置规则丰富】完整性-json中key值范围校验.md
prd_url: "https://lanhuapp.com/web/#/item/project/product?tid=24a1c6b2-a52e-454c-8d51-8aff866598b1&pid=7de90493-e80f-4592-a263-38fb2d2e98c0&versionId=236fbc84-10a3-4808-9559-66c1ef54ae55&docId=fc0fee93-74f5-4eff-a769-99e68506b296&docType=axure&pageId=e08ead471bc2471489e6fc7443d060c6&image_id=fc0fee93-74f5-4eff-a769-99e68506b296&parentId=9a152fb2-6417-4ee0-8df3-6f74f7deb413"
product: data-assets
dev_version: 6.3岚图定制化分支
tags:
  - 数据质量
  - 完整性校验
  - json key校验
  - key范围校验
  - 规则包
  - 结果查询
  - 质量报告
  - 内置规则丰富
  - 完整性
  - json中key值范围校验
create_at: 2026-04-03
update_at: 2026-04-03
status: 已归档
health_warnings: []
repos: []
case_count: 18
case_types:
  normal: 12
  abnormal: 2
  boundary: 1
origin: json
---

## 数据质量

### 规则集管理页

#### 规则入口与字段限制

##### 【P0】验证规则集管理页展示key范围校验入口与提示信息

> 前置条件
```
1、在【通用配置 → json格式配置】页面选择数据源类型 `doris3.x`，导入文件 `json_format_import_template_15693.xlsx`，导入内容如下：
- 一层 Sheet：A2~A5 依次填写 `profile`、`order`、`items`、`meta`；A6~A261 连续填写 `ext001`~`ext256`
- 二层 Sheet：`profile` 下填写 `name`、`address`、`contact`；`order` 下填写 `id`、`amount`；`items` 下填写 `sku`、`qty`
- 三层 Sheet：`profile-address` 下填写 `city`、`street`；`profile-contact` 下填写 `mobile`、`email`
- 四层 Sheet：`profile-address-city` 下填写 `code`
- 五层 Sheet：`profile-address-city-code` 下填写 `value`
导入成功后，确认 `ext256`、`order-id`、`profile-address-city-code-value` 可在 15696 页面搜索到。
2、在 Doris3.x 执行建表与灌数 SQL，准备 json 字段 `payload_json`、string 字段 `payload_str`、分区字段 `dt`、抽样标记字段 `region`：
DROP TABLE IF EXISTS qa_data_assets.key_scope_orders_15693;
CREATE TABLE qa_data_assets.key_scope_orders_15693 (
  row_id INT,
  dt DATE,
  region VARCHAR(32),
  payload_json JSON,
  payload_str STRING
)
DISTRIBUTED BY HASH(row_id) BUCKETS 3
PROPERTIES("replication_num" = "1");
INSERT INTO qa_data_assets.key_scope_orders_15693 VALUES
(1, '2026-04-01', 'sample_pass', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}'),
(2, '2026-04-01', 'sample_pass', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}'),
(3, '2026-04-01', 'history_pass', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}'),
(4, '2026-04-02', 'partition_fail', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}');
3、抽样场景使用过滤条件 `region='sample_pass'` 且抽样比例 100%，分区场景使用分区表达式 `dt='2026-04-02'`。
4、在【数据质量 → 规则集管理】页面创建规则包草稿 `qa_key_scope_rule_ui_draft_15693`，监控对象选择 `qa_data_assets.key_scope_orders_15693`，当前停留在【规则配置】步骤，字段下拉可见 `payload_json(JSON)`、`payload_str(STRING)`、`row_id(INT)`。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理页】页面 | 页面正常加载，草稿 `qa_key_scope_rule_ui_draft_15693` 对应的监控对象与字段信息展示完整。 |
| 2 | 在【完整性校验】规则列表中选择【key范围校验】 | 规则列表新增【key范围校验】入口；选中后展示【字段】【校验方法】【校验内容】配置项。 |
| 3 | 将鼠标依次悬停在【key范围校验】规则说明图标和【校验内容】提示图标上 | 字段提示显示“当选择key范围校验时，字段仅支持单选”；校验内容提示显示“校验内容key信息需要在通用配置模块维护。”。 |
| 4 | 点击【字段】下拉框与【校验方法】下拉框 | 字段下拉仅展示 `payload_json(JSON)`、`payload_str(STRING)` 两个可选项，不展示 `row_id(INT)`；校验方法下拉仅展示“包含”“不包含”。 |

##### 【P0】验证规则集管理页选择key范围校验时字段仅支持单选

> 前置条件
```
1、在【通用配置 → json格式配置】页面选择数据源类型 `doris3.x`，导入文件 `json_format_import_template_15693.xlsx`，导入内容如下：
- 一层 Sheet：A2~A5 依次填写 `profile`、`order`、`items`、`meta`；A6~A261 连续填写 `ext001`~`ext256`
- 二层 Sheet：`profile` 下填写 `name`、`address`、`contact`；`order` 下填写 `id`、`amount`；`items` 下填写 `sku`、`qty`
- 三层 Sheet：`profile-address` 下填写 `city`、`street`；`profile-contact` 下填写 `mobile`、`email`
- 四层 Sheet：`profile-address-city` 下填写 `code`
- 五层 Sheet：`profile-address-city-code` 下填写 `value`
导入成功后，确认 `ext256`、`order-id`、`profile-address-city-code-value` 可在 15696 页面搜索到。
2、在 Doris3.x 执行建表与灌数 SQL，准备 json 字段 `payload_json`、string 字段 `payload_str`、分区字段 `dt`、抽样标记字段 `region`：
DROP TABLE IF EXISTS qa_data_assets.key_scope_orders_15693;
CREATE TABLE qa_data_assets.key_scope_orders_15693 (
  row_id INT,
  dt DATE,
  region VARCHAR(32),
  payload_json JSON,
  payload_str STRING
)
DISTRIBUTED BY HASH(row_id) BUCKETS 3
PROPERTIES("replication_num" = "1");
INSERT INTO qa_data_assets.key_scope_orders_15693 VALUES
(1, '2026-04-01', 'sample_pass', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}'),
(2, '2026-04-01', 'sample_pass', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}'),
(3, '2026-04-01', 'history_pass', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}'),
(4, '2026-04-02', 'partition_fail', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}');
3、抽样场景使用过滤条件 `region='sample_pass'` 且抽样比例 100%，分区场景使用分区表达式 `dt='2026-04-02'`。
4、在【数据质量 → 规则集管理】页面创建规则包草稿 `qa_key_scope_rule_ui_draft_15693`，监控对象选择 `qa_data_assets.key_scope_orders_15693`，当前停留在【规则配置】步骤，字段下拉可见 `payload_json(JSON)`、`payload_str(STRING)`、`row_id(INT)`。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理页】页面 | 页面正常加载，草稿 `qa_key_scope_rule_ui_draft_15693` 保持在【规则配置】步骤。 |
| 2 | 选择【完整性校验】-【key范围校验】，并在【字段】下拉框中先选择 `payload_json` | 字段区域成功选中 `payload_json`，页面未出现多选标签。 |
| 3 | 在不清空已选值的情况下再次打开【字段】下拉框并选择 `payload_str` | 字段区域仍只保留 1 个已选值，系统不允许同时保留 `payload_json` 与 `payload_str` 两个字段。 |
| 4 | 点击页面空白处后重新打开【字段】下拉框 | 字段回显为最后一次有效选择的单个字段，控件仍保持单选状态，无复选框样式或多值回显。 |

#### key选择与回显

##### 【P0】验证规则集管理页在千级多层级key场景下按当前层级选择并正确回显

> 前置条件
```
1、在【通用配置 → json格式配置】页面选择数据源类型 `doris3.x`，导入文件 `json_format_import_template_15693.xlsx`，导入内容如下：
- 一层 Sheet：A2~A5 依次填写 `profile`、`order`、`items`、`meta`；A6~A261 连续填写 `ext001`~`ext256`
- 二层 Sheet：`profile` 下填写 `name`、`address`、`contact`；`order` 下填写 `id`、`amount`；`items` 下填写 `sku`、`qty`
- 三层 Sheet：`profile-address` 下填写 `city`、`street`；`profile-contact` 下填写 `mobile`、`email`
- 四层 Sheet：`profile-address-city` 下填写 `code`
- 五层 Sheet：`profile-address-city-code` 下填写 `value`
导入成功后，确认 `ext256`、`order-id`、`profile-address-city-code-value` 可在 15696 页面搜索到。
2、在 Doris3.x 执行建表与灌数 SQL，准备 json 字段 `payload_json`、string 字段 `payload_str`、分区字段 `dt`、抽样标记字段 `region`：
DROP TABLE IF EXISTS qa_data_assets.key_scope_orders_15693;
CREATE TABLE qa_data_assets.key_scope_orders_15693 (
  row_id INT,
  dt DATE,
  region VARCHAR(32),
  payload_json JSON,
  payload_str STRING
)
DISTRIBUTED BY HASH(row_id) BUCKETS 3
PROPERTIES("replication_num" = "1");
INSERT INTO qa_data_assets.key_scope_orders_15693 VALUES
(1, '2026-04-01', 'sample_pass', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}'),
(2, '2026-04-01', 'sample_pass', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}'),
(3, '2026-04-01', 'history_pass', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}'),
(4, '2026-04-02', 'partition_fail', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}');
3、抽样场景使用过滤条件 `region='sample_pass'` 且抽样比例 100%，分区场景使用分区表达式 `dt='2026-04-02'`。
4、在【数据质量 → 规则集管理】页面创建规则包草稿 `qa_key_scope_rule_ui_draft_15693`，监控对象选择 `qa_data_assets.key_scope_orders_15693`，当前停留在【规则配置】步骤，字段下拉可见 `payload_json(JSON)`、`payload_str(STRING)`、`row_id(INT)`。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理页】页面 | 页面正常加载，草稿 `qa_key_scope_rule_ui_draft_15693` 可继续配置。 |
| 2 | 选择【完整性校验】-【key范围校验】后点击【校验内容】选择面板 | 校验内容面板成功打开，可见搜索框、层级树和选择操作区。 |
| 3 | 观察顶层列表并依次点击【全选】和【取消全选】 | 顶层列表默认仅加载前 200 条 key；【全选】与【取消全选】只作用于当前顶层列表，不联动未展开的下级节点。 |
| 4 | 在搜索框输入 `ext256` 勾选搜索结果，展开 `profile → address → city → code` 勾选 `value`，展开 `order` 勾选 `id`，勾选【仅对当前层级生效】后点击【确定】 | 面板支持命中首屏 200 条之外的 `ext256`；勾选结果仅对当前选中层级生效，配置区回显为 `profile-address-city-code-value;order-id;ext256`。 |
| 5 | 重新打开【校验内容】选择面板查看已选内容 | 重新打开【校验内容】选择面板后，已选 key 与保存前完全一致，`profile-address-city-code-value`、`order-id`、`ext256` 对应节点保持选中，父级、兄弟节点和其他未选层级均未被误选。 |

##### 【P2】验证规则集管理页搜索不存在key时展示无结果

> 前置条件
```
1、在【通用配置 → json格式配置】页面选择数据源类型 `doris3.x`，导入文件 `json_format_import_template_15693.xlsx`，导入内容如下：
- 一层 Sheet：A2~A5 依次填写 `profile`、`order`、`items`、`meta`；A6~A261 连续填写 `ext001`~`ext256`
- 二层 Sheet：`profile` 下填写 `name`、`address`、`contact`；`order` 下填写 `id`、`amount`；`items` 下填写 `sku`、`qty`
- 三层 Sheet：`profile-address` 下填写 `city`、`street`；`profile-contact` 下填写 `mobile`、`email`
- 四层 Sheet：`profile-address-city` 下填写 `code`
- 五层 Sheet：`profile-address-city-code` 下填写 `value`
导入成功后，确认 `ext256`、`order-id`、`profile-address-city-code-value` 可在 15696 页面搜索到。
2、在 Doris3.x 执行建表与灌数 SQL，准备 json 字段 `payload_json`、string 字段 `payload_str`、分区字段 `dt`、抽样标记字段 `region`：
DROP TABLE IF EXISTS qa_data_assets.key_scope_orders_15693;
CREATE TABLE qa_data_assets.key_scope_orders_15693 (
  row_id INT,
  dt DATE,
  region VARCHAR(32),
  payload_json JSON,
  payload_str STRING
)
DISTRIBUTED BY HASH(row_id) BUCKETS 3
PROPERTIES("replication_num" = "1");
INSERT INTO qa_data_assets.key_scope_orders_15693 VALUES
(1, '2026-04-01', 'sample_pass', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}'),
(2, '2026-04-01', 'sample_pass', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}'),
(3, '2026-04-01', 'history_pass', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}'),
(4, '2026-04-02', 'partition_fail', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}');
3、抽样场景使用过滤条件 `region='sample_pass'` 且抽样比例 100%，分区场景使用分区表达式 `dt='2026-04-02'`。
4、在【数据质量 → 规则集管理】页面创建规则包草稿 `qa_key_scope_rule_ui_draft_15693`，监控对象选择 `qa_data_assets.key_scope_orders_15693`，当前停留在【规则配置】步骤，字段下拉可见 `payload_json(JSON)`、`payload_str(STRING)`、`row_id(INT)`。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理页】页面 | 页面正常加载，草稿 `qa_key_scope_rule_ui_draft_15693` 可继续配置。 |
| 2 | 选择【完整性校验】-【key范围校验】后点击【校验内容】选择面板 | 校验内容面板成功打开，默认展示首屏 key 列表。 |
| 3 | 在搜索框输入 `not_exist_key_15693` 并执行搜索 | 搜索结果为空，面板展示无匹配 key 的空状态提示，已选 key 数量保持不变。 |
| 4 | 清空搜索关键词并重新观察列表 | 面板恢复默认首屏 key 列表展示，已勾选的历史 key 不丢失，仍可继续进行选择。 |

#### 保存校验

##### 【P1】验证规则集管理页未选择校验内容时不可保存

> 前置条件
```
1、在【通用配置 → json格式配置】页面选择数据源类型 `doris3.x`，导入文件 `json_format_import_template_15693.xlsx`，导入内容如下：
- 一层 Sheet：A2~A5 依次填写 `profile`、`order`、`items`、`meta`；A6~A261 连续填写 `ext001`~`ext256`
- 二层 Sheet：`profile` 下填写 `name`、`address`、`contact`；`order` 下填写 `id`、`amount`；`items` 下填写 `sku`、`qty`
- 三层 Sheet：`profile-address` 下填写 `city`、`street`；`profile-contact` 下填写 `mobile`、`email`
- 四层 Sheet：`profile-address-city` 下填写 `code`
- 五层 Sheet：`profile-address-city-code` 下填写 `value`
导入成功后，确认 `ext256`、`order-id`、`profile-address-city-code-value` 可在 15696 页面搜索到。
2、在 Doris3.x 执行建表与灌数 SQL，准备 json 字段 `payload_json`、string 字段 `payload_str`、分区字段 `dt`、抽样标记字段 `region`：
DROP TABLE IF EXISTS qa_data_assets.key_scope_orders_15693;
CREATE TABLE qa_data_assets.key_scope_orders_15693 (
  row_id INT,
  dt DATE,
  region VARCHAR(32),
  payload_json JSON,
  payload_str STRING
)
DISTRIBUTED BY HASH(row_id) BUCKETS 3
PROPERTIES("replication_num" = "1");
INSERT INTO qa_data_assets.key_scope_orders_15693 VALUES
(1, '2026-04-01', 'sample_pass', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}'),
(2, '2026-04-01', 'sample_pass', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}'),
(3, '2026-04-01', 'history_pass', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}'),
(4, '2026-04-02', 'partition_fail', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}');
3、抽样场景使用过滤条件 `region='sample_pass'` 且抽样比例 100%，分区场景使用分区表达式 `dt='2026-04-02'`。
4、在【数据质量 → 规则集管理】页面创建规则包草稿 `qa_key_scope_rule_ui_draft_15693`，监控对象选择 `qa_data_assets.key_scope_orders_15693`，当前停留在【规则配置】步骤，字段下拉可见 `payload_json(JSON)`、`payload_str(STRING)`、`row_id(INT)`。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理页】页面 | 页面正常加载，草稿 `qa_key_scope_rule_ui_draft_15693` 保持在【规则配置】步骤。 |
| 2 | 在【规则包配置】区域选择【完整性校验】-【key范围校验】，并将【字段】设置为 `payload_json`、【校验方法】设置为【包含】 | 字段和校验方法选择成功，页面仍保留待填写的【校验内容】空值状态。 |
| 3 | 保持【校验内容】为空并点击【保存】 | 系统阻止保存，本次配置不会提交成功。 |
| 4 | 观察表单提示与任务草稿状态 | 【校验内容】字段展示明确的必填校验提示，草稿仍停留在当前页面，页面不出现保存成功提示，也不会生成新的执行记录。 |

#### 查询筛选与导出

##### 【P1】验证规则集管理页按规则名称查询可命中key范围校验

> 前置条件
```
1、使用账号 qa_rule_admin 登录数据资产系统，账号具备【规则集管理】权限。
2、当前环境规则集管理页的内置规则列表至少包含【key范围校验】【空值校验】【唯一性校验】三条规则，其中【key范围校验】规则分类为“完整性校验”，关联范围为“字段”。
3、规则集管理页提供【规则名称】搜索框、【规则分类】【关联范围】【规则状态】筛选项及【导出规则库】按钮。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理页】页面 | 页面正常加载，列表展示内置规则数据，可进行查询操作。 |
| 2 | 在【规则名称】搜索框输入 `key范围` 并点击【查询】 | 列表返回包含“key范围”关键字的规则，命中新增内置规则【key范围校验】，不展示无关规则。 |
| 3 | 将关键词改为 `key范围校验` 并再次点击【查询】 | 列表精确命中【key范围校验】1 条记录，规则分类展示为“完整性校验”，关联范围展示为“字段”。 |
| 4 | 清空关键词后点击【查询】 | 列表恢复默认规则库结果，新增内置规则【key范围校验】仍可在结果集中查看。 |

##### 【P1】验证规则集管理页按分类和关联范围筛选可定位key范围校验

> 前置条件
```
1、使用账号 qa_rule_admin 登录数据资产系统，账号具备【规则集管理】权限。
2、当前环境规则集管理页的内置规则列表至少包含【key范围校验】【空值校验】【唯一性校验】以及其它非完整性规则。
3、【key范围校验】规则分类为“完整性校验”，关联范围为“字段”，当前规则状态为“启用”。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理页】页面 | 页面正常加载，筛选区默认为空，列表展示全部内置规则。 |
| 2 | 在筛选区选择【规则分类=完整性校验】【关联范围=字段】后点击【查询】 | 列表仅返回满足筛选条件的规则，结果中包含【key范围校验】，不再展示无效性类规则。 |
| 3 | 继续选择【规则状态=启用】并点击【查询】 | 列表结果继续保持可用，仅返回状态为“启用”的完整性字段规则，【key范围校验】仍在结果中。 |
| 4 | 点击【重置】后再次点击【查询】 | 所有筛选项恢复默认状态，列表重新展示完整规则库数据。 |

##### 【P1】验证规则集管理页导出规则库包含key范围校验

> 前置条件
```
1、使用账号 qa_rule_admin 登录数据资产系统，账号具备【规则集管理】权限。
2、当前环境规则集管理页的内置规则列表至少包含【key范围校验】【空值校验】【唯一性校验】三条规则。
3、页面存在【导出规则库】按钮，且浏览器下载目录可正常保存 xlsx 文件。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理页】页面 | 页面正常加载，可查看规则列表并执行导出操作。 |
| 2 | 点击【导出规则库】按钮 | 页面弹出导出确认提示，可继续确认或取消导出。 |
| 3 | 在确认提示中先点击【取消】，再重新点击【导出规则库】并点击【确认】 | 首次取消后不产生下载文件；再次确认后浏览器开始下载规则库文件。 |
| 4 | 打开下载的规则库文件并查看导出内容 | 导出文件名以“内置规则库_”开头；文件中包含【key范围校验】规则，且规则分类、关联范围、规则解释、规则描述等信息与页面展示一致。 |

### 规则任务管理页

#### 抽样与分区

##### 【P0】验证规则任务管理页在抽样场景下对json字段执行key范围校验

> 前置条件
```
1、在【通用配置 → json格式配置】页面选择数据源类型 `doris3.x`，导入文件 `json_format_import_template_15693.xlsx`，导入内容如下：
- 一层 Sheet：A2~A5 依次填写 `profile`、`order`、`items`、`meta`；A6~A261 连续填写 `ext001`~`ext256`
- 二层 Sheet：`profile` 下填写 `name`、`address`、`contact`；`order` 下填写 `id`、`amount`；`items` 下填写 `sku`、`qty`
- 三层 Sheet：`profile-address` 下填写 `city`、`street`；`profile-contact` 下填写 `mobile`、`email`
- 四层 Sheet：`profile-address-city` 下填写 `code`
- 五层 Sheet：`profile-address-city-code` 下填写 `value`
导入成功后，确认 `ext256`、`order-id`、`profile-address-city-code-value` 可在 15696 页面搜索到。
2、在 Doris3.x 执行建表与灌数 SQL，准备 json 字段 `payload_json`、string 字段 `payload_str`、分区字段 `dt`、抽样标记字段 `region`：
DROP TABLE IF EXISTS qa_data_assets.key_scope_orders_15693;
CREATE TABLE qa_data_assets.key_scope_orders_15693 (
  row_id INT,
  dt DATE,
  region VARCHAR(32),
  payload_json JSON,
  payload_str STRING
)
DISTRIBUTED BY HASH(row_id) BUCKETS 3
PROPERTIES("replication_num" = "1");
INSERT INTO qa_data_assets.key_scope_orders_15693 VALUES
(1, '2026-04-01', 'sample_pass', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}'),
(2, '2026-04-01', 'sample_pass', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}'),
(3, '2026-04-01', 'history_pass', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}'),
(4, '2026-04-02', 'partition_fail', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}');
3、抽样场景使用过滤条件 `region='sample_pass'` 且抽样比例 100%，分区场景使用分区表达式 `dt='2026-04-02'`。
4、在【数据质量 → 规则任务管理页】创建规则任务草稿 `qa_key_scope_sample_draft_15693`，监控对象选择 `qa_data_assets.key_scope_orders_15693`，过滤条件 `region='sample_pass'`，抽样方式选择“随机抽样”，抽样比例 100%，其余公共必填项使用有效默认值并停留在【规则包绑定】步骤，且已存在可绑定的规则包。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理页】页面 | 页面正常加载，可找到草稿 `qa_key_scope_sample_draft_15693`。 |
| 2 | 打开草稿 `qa_key_scope_sample_draft_15693` 并进入【规则包绑定】步骤 | 监控对象保持为 `qa_data_assets.key_scope_orders_15693`，抽样配置回显为过滤条件 `region=sample_pass`、抽样比例 100%。 |
| 3 | 在【规则包绑定】区域选择已在【规则集管理】中创建的规则包，并确认包内规则如下：<br>- 规则类型: 完整性校验<br>- 规则: key范围校验<br>- 字段: payload_json<br>- 校验方法: 包含<br>- 校验内容: order-id、items-sku、items-qty | 增量配置保存前校验通过，字段只允许单选 `payload_json`，key 回显为 `order-id;items-sku;items-qty`。 |
| 4 | 点击【保存】并在保存成功后点击【立即执行】 | 任务 `qa_key_scope_sample_pass_15693` 保存成功并开始执行，无公共配置缺失提示。 |
| 5 | 打开该任务最近一次执行记录查看执行摘要 | 本次执行仅命中 `region=sample_pass` 的 row_id=1、2 两条样本数据；任务运行成功，校验结果为“通过”。 |

##### 【P0】验证规则任务管理页在分区场景下对string字段执行key范围校验

> 前置条件
```
1、在【通用配置 → json格式配置】页面选择数据源类型 `doris3.x`，导入文件 `json_format_import_template_15693.xlsx`，导入内容如下：
- 一层 Sheet：A2~A5 依次填写 `profile`、`order`、`items`、`meta`；A6~A261 连续填写 `ext001`~`ext256`
- 二层 Sheet：`profile` 下填写 `name`、`address`、`contact`；`order` 下填写 `id`、`amount`；`items` 下填写 `sku`、`qty`
- 三层 Sheet：`profile-address` 下填写 `city`、`street`；`profile-contact` 下填写 `mobile`、`email`
- 四层 Sheet：`profile-address-city` 下填写 `code`
- 五层 Sheet：`profile-address-city-code` 下填写 `value`
导入成功后，确认 `ext256`、`order-id`、`profile-address-city-code-value` 可在 15696 页面搜索到。
2、在 Doris3.x 执行建表与灌数 SQL，准备 json 字段 `payload_json`、string 字段 `payload_str`、分区字段 `dt`、抽样标记字段 `region`：
DROP TABLE IF EXISTS qa_data_assets.key_scope_orders_15693;
CREATE TABLE qa_data_assets.key_scope_orders_15693 (
  row_id INT,
  dt DATE,
  region VARCHAR(32),
  payload_json JSON,
  payload_str STRING
)
DISTRIBUTED BY HASH(row_id) BUCKETS 3
PROPERTIES("replication_num" = "1");
INSERT INTO qa_data_assets.key_scope_orders_15693 VALUES
(1, '2026-04-01', 'sample_pass', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}'),
(2, '2026-04-01', 'sample_pass', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}'),
(3, '2026-04-01', 'history_pass', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}'),
(4, '2026-04-02', 'partition_fail', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}');
3、抽样场景使用过滤条件 `region='sample_pass'` 且抽样比例 100%，分区场景使用分区表达式 `dt='2026-04-02'`。
4、在【数据质量 → 规则任务管理页】创建规则任务草稿 `qa_key_scope_partition_draft_15693`，监控对象选择 `qa_data_assets.key_scope_orders_15693`，分区方式选择“手动输入分区”，分区表达式 `dt='2026-04-02'`，其余公共必填项使用有效默认值并停留在【规则包绑定】步骤，且已存在可绑定的规则包。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理页】页面 | 页面正常加载，可找到草稿 `qa_key_scope_partition_draft_15693`。 |
| 2 | 打开草稿 `qa_key_scope_partition_draft_15693` 并进入【规则包绑定】步骤 | 监控对象保持为 `qa_data_assets.key_scope_orders_15693`，分区配置回显为 `dt=2026-04-02`。 |
| 3 | 在【规则包绑定】区域选择已在【规则集管理】中创建的规则包，并确认包内规则如下：<br>- 规则类型: 完整性校验<br>- 规则: key范围校验<br>- 字段: payload_str<br>- 校验方法: 不包含<br>- 校验内容: hack | 增量配置保存前校验通过，字段只保留 `payload_str`，key 回显为 `hack`。 |
| 4 | 点击【保存】并在保存成功后点击【立即执行】 | 任务 `qa_key_scope_partition_fail_15693` 保存成功并开始执行。 |
| 5 | 打开该任务最近一次执行记录查看执行摘要 | 任务运行成功但校验结果为“不通过”；仅分区 `dt=2026-04-02` 的 row_id=4 被命中并识别出非法 key `hack`。 |

#### 历史兼容

##### 【P0】验证规则任务管理页在15696删除已配置key后历史规则仍可回显并运行

> 前置条件
```
1、在【通用配置 → json格式配置】页面选择数据源类型 `doris3.x`，导入文件 `json_format_import_template_15693.xlsx`，导入内容如下：
- 一层 Sheet：A2~A5 依次填写 `profile`、`order`、`items`、`meta`；A6~A261 连续填写 `ext001`~`ext256`
- 二层 Sheet：`profile` 下填写 `name`、`address`、`contact`；`order` 下填写 `id`、`amount`；`items` 下填写 `sku`、`qty`
- 三层 Sheet：`profile-address` 下填写 `city`、`street`；`profile-contact` 下填写 `mobile`、`email`
- 四层 Sheet：`profile-address-city` 下填写 `code`
- 五层 Sheet：`profile-address-city-code` 下填写 `value`
导入成功后，确认 `ext256`、`order-id`、`profile-address-city-code-value` 可在 15696 页面搜索到。
2、在 Doris3.x 执行建表与灌数 SQL，准备 json 字段 `payload_json`、string 字段 `payload_str`、分区字段 `dt`、抽样标记字段 `region`：
DROP TABLE IF EXISTS qa_data_assets.key_scope_orders_15693;
CREATE TABLE qa_data_assets.key_scope_orders_15693 (
  row_id INT,
  dt DATE,
  region VARCHAR(32),
  payload_json JSON,
  payload_str STRING
)
DISTRIBUTED BY HASH(row_id) BUCKETS 3
PROPERTIES("replication_num" = "1");
INSERT INTO qa_data_assets.key_scope_orders_15693 VALUES
(1, '2026-04-01', 'sample_pass', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}'),
(2, '2026-04-01', 'sample_pass', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}'),
(3, '2026-04-01', 'history_pass', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}'),
(4, '2026-04-02', 'partition_fail', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}');
3、抽样场景使用过滤条件 `region='sample_pass'` 且抽样比例 100%，分区场景使用分区表达式 `dt='2026-04-02'`。
4、已存在历史任务 `qa_key_scope_history_15693`，已绑定规则包，规则包内容为 `payload_json + 包含 + profile-address-city-code-value;order-id;items-sku`，过滤条件 `region='history_pass'`，最近一次执行状态为“通过”。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理页】页面 | 页面正常加载，可找到历史任务 `qa_key_scope_history_15693`。 |
| 2 | 进入【通用配置 → json格式校验管理】页面，删除五层 key `profile-address-city-code-value` 并确认删除成功 | 15696 页面删除成功，`profile-address-city-code-value` 不再出现在当前配置列表中。 |
| 3 | 返回【数据质量 → 规则任务管理页】并打开历史任务 `qa_key_scope_history_15693` | 历史任务可正常打开，页面无“key 不存在”阻断提示。 |
| 4 | 查看绑定规则包中的【校验内容】回显值 | 已删除 key 仍按历史配置完整回显为 `profile-address-city-code-value;order-id;items-sku`，未出现空值、乱码或自动丢失。 |
| 5 | 点击【保存】并在保存成功后点击【立即执行】 | 历史任务可正常再次保存并触发执行，无需重新选择已删除 key。 |
| 6 | 打开最近一次执行记录查看执行摘要 | 最新执行仍运行成功且校验结果为“通过”，历史规则未因 15696 删除 key 而失效。 |

#### 脏数据存储

##### 【P1】验证规则任务管理页在脏数据库变更后脏数据存储仍正常

> 前置条件
```
1、在【通用配置 → json格式配置】页面选择数据源类型 `doris3.x`，导入文件 `json_format_import_template_15693.xlsx`，导入内容如下：
- 一层 Sheet：A2~A5 依次填写 `profile`、`order`、`items`、`meta`；A6~A261 连续填写 `ext001`~`ext256`
- 二层 Sheet：`profile` 下填写 `name`、`address`、`contact`；`order` 下填写 `id`、`amount`；`items` 下填写 `sku`、`qty`
- 三层 Sheet：`profile-address` 下填写 `city`、`street`；`profile-contact` 下填写 `mobile`、`email`
- 四层 Sheet：`profile-address-city` 下填写 `code`
- 五层 Sheet：`profile-address-city-code` 下填写 `value`
导入成功后，确认 `ext256`、`order-id`、`profile-address-city-code-value` 可在 15696 页面搜索到。
2、在 Doris3.x 执行建表与灌数 SQL，准备 json 字段 `payload_json`、string 字段 `payload_str`、分区字段 `dt`、抽样标记字段 `region`：
DROP TABLE IF EXISTS qa_data_assets.key_scope_orders_15693;
CREATE TABLE qa_data_assets.key_scope_orders_15693 (
  row_id INT,
  dt DATE,
  region VARCHAR(32),
  payload_json JSON,
  payload_str STRING
)
DISTRIBUTED BY HASH(row_id) BUCKETS 3
PROPERTIES("replication_num" = "1");
INSERT INTO qa_data_assets.key_scope_orders_15693 VALUES
(1, '2026-04-01', 'sample_pass', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}'),
(2, '2026-04-01', 'sample_pass', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}'),
(3, '2026-04-01', 'history_pass', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}'),
(4, '2026-04-02', 'partition_fail', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}');
3、抽样场景使用过滤条件 `region='sample_pass'` 且抽样比例 100%，分区场景使用分区表达式 `dt='2026-04-02'`。
4、在 Doris3.x 执行以下 SQL 创建脏数据存储目标库表：
CREATE DATABASE IF NOT EXISTS qa_dirty_old_15693;
CREATE DATABASE IF NOT EXISTS qa_dirty_new_15693;
DROP TABLE IF EXISTS qa_dirty_old_15693.key_scope_dirty_15693;
DROP TABLE IF EXISTS qa_dirty_new_15693.key_scope_dirty_15693;
CREATE TABLE qa_dirty_old_15693.key_scope_dirty_15693 (
  task_name STRING,
  row_id INT,
  payload_str STRING,
  dt DATE
)
DISTRIBUTED BY HASH(row_id) BUCKETS 1
PROPERTIES("replication_num" = "1");
CREATE TABLE qa_dirty_new_15693.key_scope_dirty_15693 LIKE qa_dirty_old_15693.key_scope_dirty_15693;
5、已存在任务 `qa_key_scope_dirty_store_15693`，监控对象为 `qa_data_assets.key_scope_orders_15693`，已绑定规则包，规则包内容为 `payload_str + 不包含 + hack`，分区表达式 `dt='2026-04-02'`，已开启脏数据存储，当前目标库表为 `qa_dirty_old_15693.key_scope_dirty_15693`，最近一次执行状态为“不通过”且已写入脏数据。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理页】页面 | 页面正常加载，可找到任务 `qa_key_scope_dirty_store_15693`。 |
| 2 | 打开任务 `qa_key_scope_dirty_store_15693`，将【脏数据存储】目标库表从 `qa_dirty_old_15693.key_scope_dirty_15693` 修改为 `qa_dirty_new_15693.key_scope_dirty_15693` 后点击【保存】 | 任务保存成功，任务详情回显新的脏数据存储目标库表 `qa_dirty_new_15693.key_scope_dirty_15693`。 |
| 3 | 点击【立即执行】 | 任务重新开始执行，执行过程中无脏数据存储配置异常或目标库不可用提示。 |
| 4 | 打开最近一次执行记录查看执行摘要 | 本次执行正常完成，校验结论仍为“不通过”，异常数据仍命中 row_id=4 且非法 key 为 `hack`。 |
| 5 | 检查本次执行的脏数据存储结果 | 本次执行产生的脏数据写入 `qa_dirty_new_15693.key_scope_dirty_15693`，原目标库 `qa_dirty_old_15693.key_scope_dirty_15693` 无新增本次执行数据，说明脏数据库变更后脏数据存储功能仍正常。 |

### 规则集管理页

#### 规则包绑定

##### 【P1】验证规则集管理页配置key范围校验规则包后新建任务可继承配置

> 前置条件
```
1、在【通用配置 → json格式配置】页面选择数据源类型 `doris3.x`，导入文件 `json_format_import_template_15693.xlsx`，导入内容如下：
- 一层 Sheet：A2~A5 依次填写 `profile`、`order`、`items`、`meta`；A6~A261 连续填写 `ext001`~`ext256`
- 二层 Sheet：`profile` 下填写 `name`、`address`、`contact`；`order` 下填写 `id`、`amount`；`items` 下填写 `sku`、`qty`
- 三层 Sheet：`profile-address` 下填写 `city`、`street`；`profile-contact` 下填写 `mobile`、`email`
- 四层 Sheet：`profile-address-city` 下填写 `code`
- 五层 Sheet：`profile-address-city-code` 下填写 `value`
导入成功后，确认 `ext256`、`order-id`、`profile-address-city-code-value` 可在 15696 页面搜索到。
2、在 Doris3.x 执行建表与灌数 SQL，准备 json 字段 `payload_json`、string 字段 `payload_str`、分区字段 `dt`、抽样标记字段 `region`：
DROP TABLE IF EXISTS qa_data_assets.key_scope_orders_15693;
CREATE TABLE qa_data_assets.key_scope_orders_15693 (
  row_id INT,
  dt DATE,
  region VARCHAR(32),
  payload_json JSON,
  payload_str STRING
)
DISTRIBUTED BY HASH(row_id) BUCKETS 3
PROPERTIES("replication_num" = "1");
INSERT INTO qa_data_assets.key_scope_orders_15693 VALUES
(1, '2026-04-01', 'sample_pass', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}'),
(2, '2026-04-01', 'sample_pass', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}'),
(3, '2026-04-01', 'history_pass', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}'),
(4, '2026-04-02', 'partition_fail', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}');
3、抽样场景使用过滤条件 `region='sample_pass'` 且抽样比例 100%，分区场景使用分区表达式 `dt='2026-04-02'`。
4、在【数据质量 → 规则任务管理页】创建空白任务草稿 `qa_key_scope_pkg_task_draft_15693`，监控对象选择 `qa_data_assets.key_scope_orders_15693`，过滤条件 `region='sample_pass'`，抽样比例 100%，任务尚未绑定规则包。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理页】页面 | 页面正常加载，可进行规则包新增操作。 |
| 2 | 点击【新建规则包】并在完整性规则列表中选择【key范围校验】 | 规则集管理页展示【key范围校验】入口，且可继续配置字段、校验方法与校验内容。 |
| 3 | 在【规则集管理】区域按顺序完成以下配置并悬停说明图标：<br>- 规则包名称: pkg_key_scope_15693<br>- 规则类型: 完整性校验<br>- 规则: key范围校验<br>- 字段: payload_json<br>- 校验方法: 包含<br>- 校验内容: order-id、items-sku、items-qty | 规则解释显示“对数据中包含的key范围校验”，规则描述显示“校验json类型的字段中key名是否完整，对key的范围进行校验”，校验内容提示显示“校验内容key信息需要在通用配置模块维护。”；规则包保存校验通过。 |
| 4 | 保存规则包后点击【基于规则包新建任务】，选择空白草稿 `qa_key_scope_pkg_task_draft_15693` 进行绑定 | 系统成功带出规则包 `pkg_key_scope_15693`，任务页面自动回填字段 `payload_json`、校验方法“包含”和 key 列表 `order-id;items-sku;items-qty`。 |
| 5 | 点击【保存】并在保存成功后点击【立即执行】 | 任务 `qa_key_scope_pkg_15693` 保存成功并运行通过，说明规则包中的 key范围校验配置已被新任务正确继承。 |

### 结果查询页

#### 结果详情与日志

##### 【P1】验证结果查询页对key范围校验通过记录不生成明细

> 前置条件
```
1、在【通用配置 → json格式配置】页面选择数据源类型 `doris3.x`，导入文件 `json_format_import_template_15693.xlsx`，导入内容如下：
- 一层 Sheet：A2~A5 依次填写 `profile`、`order`、`items`、`meta`；A6~A261 连续填写 `ext001`~`ext256`
- 二层 Sheet：`profile` 下填写 `name`、`address`、`contact`；`order` 下填写 `id`、`amount`；`items` 下填写 `sku`、`qty`
- 三层 Sheet：`profile-address` 下填写 `city`、`street`；`profile-contact` 下填写 `mobile`、`email`
- 四层 Sheet：`profile-address-city` 下填写 `code`
- 五层 Sheet：`profile-address-city-code` 下填写 `value`
导入成功后，确认 `ext256`、`order-id`、`profile-address-city-code-value` 可在 15696 页面搜索到。
2、在 Doris3.x 执行建表与灌数 SQL，准备 json 字段 `payload_json`、string 字段 `payload_str`、分区字段 `dt`、抽样标记字段 `region`：
DROP TABLE IF EXISTS qa_data_assets.key_scope_orders_15693;
CREATE TABLE qa_data_assets.key_scope_orders_15693 (
  row_id INT,
  dt DATE,
  region VARCHAR(32),
  payload_json JSON,
  payload_str STRING
)
DISTRIBUTED BY HASH(row_id) BUCKETS 3
PROPERTIES("replication_num" = "1");
INSERT INTO qa_data_assets.key_scope_orders_15693 VALUES
(1, '2026-04-01', 'sample_pass', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}'),
(2, '2026-04-01', 'sample_pass', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}'),
(3, '2026-04-01', 'history_pass', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}'),
(4, '2026-04-02', 'partition_fail', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}');
3、抽样场景使用过滤条件 `region='sample_pass'` 且抽样比例 100%，分区场景使用分区表达式 `dt='2026-04-02'`。
4、已存在任务 `qa_key_scope_sample_pass_15693`，规则为 `payload_json + 包含 + order-id;items-sku;items-qty`，过滤条件 `region='sample_pass'`，最近一次执行状态为“通过”。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 结果查询页】页面 | 页面正常加载，可使用任务名称和规则类型筛选执行记录。 |
| 2 | 在筛选区按顺序输入如下条件后点击【查询】：<br>- 任务名称: qa_key_scope_sample_pass_15693<br>- 规则类型: 完整性校验<br>- 规则名称: key范围校验 | 列表返回 `qa_key_scope_sample_pass_15693` 最近一次执行记录，状态为“通过”。 |
| 3 | 点击该条通过记录查看结果摘要 | 结果摘要展示规则名称【完整性校验-key范围校验】、命中样本范围和通过结论。 |
| 4 | 打开该记录的操作菜单 | 操作菜单不展示【查看明细】与明细下载入口，页面也不生成明细数量，符合“校验通过不记录明细数据”的要求。 |

##### 【P0】验证结果查询页对key范围校验不通过记录支持查看详情与下载标红

> 前置条件
```
1、在【通用配置 → json格式配置】页面选择数据源类型 `doris3.x`，导入文件 `json_format_import_template_15693.xlsx`，导入内容如下：
- 一层 Sheet：A2~A5 依次填写 `profile`、`order`、`items`、`meta`；A6~A261 连续填写 `ext001`~`ext256`
- 二层 Sheet：`profile` 下填写 `name`、`address`、`contact`；`order` 下填写 `id`、`amount`；`items` 下填写 `sku`、`qty`
- 三层 Sheet：`profile-address` 下填写 `city`、`street`；`profile-contact` 下填写 `mobile`、`email`
- 四层 Sheet：`profile-address-city` 下填写 `code`
- 五层 Sheet：`profile-address-city-code` 下填写 `value`
导入成功后，确认 `ext256`、`order-id`、`profile-address-city-code-value` 可在 15696 页面搜索到。
2、在 Doris3.x 执行建表与灌数 SQL，准备 json 字段 `payload_json`、string 字段 `payload_str`、分区字段 `dt`、抽样标记字段 `region`：
DROP TABLE IF EXISTS qa_data_assets.key_scope_orders_15693;
CREATE TABLE qa_data_assets.key_scope_orders_15693 (
  row_id INT,
  dt DATE,
  region VARCHAR(32),
  payload_json JSON,
  payload_str STRING
)
DISTRIBUTED BY HASH(row_id) BUCKETS 3
PROPERTIES("replication_num" = "1");
INSERT INTO qa_data_assets.key_scope_orders_15693 VALUES
(1, '2026-04-01', 'sample_pass', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}'),
(2, '2026-04-01', 'sample_pass', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}'),
(3, '2026-04-01', 'history_pass', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}'),
(4, '2026-04-02', 'partition_fail', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}');
3、抽样场景使用过滤条件 `region='sample_pass'` 且抽样比例 100%，分区场景使用分区表达式 `dt='2026-04-02'`。
4、已存在任务 `qa_key_scope_partition_fail_15693`，规则为 `payload_str + 不包含 + hack`，分区表达式 `dt='2026-04-02'`，最近一次执行状态为“不通过”，命中 row_id=4。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 结果查询页】页面 | 页面正常加载，可查看 `qa_key_scope_partition_fail_15693` 的执行记录。 |
| 2 | 在筛选区按顺序输入如下条件后点击【查询】：<br>- 任务名称: qa_key_scope_partition_fail_15693<br>- 规则类型: 完整性校验<br>- 规则名称: key范围校验 | 列表返回最近一次“不通过”记录，命中 row_id=4。 |
| 3 | 点击该条记录的【查看明细】按钮 | 弹窗标题精确显示为“查看“完整性校验-key范围校验”明细”；明细保留 `row_id`、`dt`、`region`、`payload_json`、`payload_str` 全部字段，校验字段 `payload_str` 标红显示。 |
| 4 | 在明细弹窗中点击【下载】按钮并检查导出文件 | 导出的明细文件与页面字段保持一致，`payload_str` 字段继续标红，异常 key `hack` 所在内容可被直接识别。 |

##### 【P0】验证结果查询页对key范围校验执行失败记录支持查看日志

> 前置条件
```
1、在【通用配置 → json格式配置】页面选择数据源类型 `doris3.x`，导入文件 `json_format_import_template_15693.xlsx`，导入内容如下：
- 一层 Sheet：A2~A5 依次填写 `profile`、`order`、`items`、`meta`；A6~A261 连续填写 `ext001`~`ext256`
- 二层 Sheet：`profile` 下填写 `name`、`address`、`contact`；`order` 下填写 `id`、`amount`；`items` 下填写 `sku`、`qty`
- 三层 Sheet：`profile-address` 下填写 `city`、`street`；`profile-contact` 下填写 `mobile`、`email`
- 四层 Sheet：`profile-address-city` 下填写 `code`
- 五层 Sheet：`profile-address-city-code` 下填写 `value`
导入成功后，确认 `ext256`、`order-id`、`profile-address-city-code-value` 可在 15696 页面搜索到。
2、在 Doris3.x 执行建表与灌数 SQL，准备 json 字段 `payload_json`、string 字段 `payload_str`、分区字段 `dt`、抽样标记字段 `region`：
DROP TABLE IF EXISTS qa_data_assets.key_scope_orders_15693;
CREATE TABLE qa_data_assets.key_scope_orders_15693 (
  row_id INT,
  dt DATE,
  region VARCHAR(32),
  payload_json JSON,
  payload_str STRING
)
DISTRIBUTED BY HASH(row_id) BUCKETS 3
PROPERTIES("replication_num" = "1");
INSERT INTO qa_data_assets.key_scope_orders_15693 VALUES
(1, '2026-04-01', 'sample_pass', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}'),
(2, '2026-04-01', 'sample_pass', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}'),
(3, '2026-04-01', 'history_pass', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}'),
(4, '2026-04-02', 'partition_fail', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}');
3、抽样场景使用过滤条件 `region='sample_pass'` 且抽样比例 100%，分区场景使用分区表达式 `dt='2026-04-02'`。
4、在 Doris3.x 执行以下 SQL 预置失败场景：
DROP TABLE IF EXISTS qa_data_assets.key_scope_missing_15693;
CREATE TABLE qa_data_assets.key_scope_missing_15693 (
  row_id INT,
  payload_json JSON
)
DISTRIBUTED BY HASH(row_id) BUCKETS 1
PROPERTIES("replication_num" = "1");
INSERT INTO qa_data_assets.key_scope_missing_15693 VALUES (1, '{"order":{"id":"ORDX01"}}');
5、在【数据质量 → 规则任务管理页】保存任务 `qa_key_scope_exec_failed_15693`，监控对象使用 `qa_data_assets.key_scope_missing_15693`，已绑定规则包，规则包内容为 `payload_json + 包含 + order-id`；保存后执行 `DROP TABLE qa_data_assets.key_scope_missing_15693;`，再触发一次立即执行，使最近一条记录状态为“执行失败”。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 结果查询页】页面 | 页面正常加载，可查看失败任务的执行记录。 |
| 2 | 在筛选区按顺序输入如下条件后点击【查询】：<br>- 任务名称: qa_key_scope_exec_failed_15693<br>- 规则类型: 完整性校验<br>- 规则名称: key范围校验 | 列表返回 `qa_key_scope_exec_failed_15693` 最近一次执行失败记录，状态为“失败”或“执行失败”。 |
| 3 | 打开该条失败记录的操作菜单并点击【查看日志】 | 系统成功打开日志面板，失败记录可查看完整执行日志。 |
| 4 | 检查日志内容中的报错信息与任务元数据 | 日志包含源表 `qa_data_assets.key_scope_missing_15693` 不存在或读取失败的报错信息，同时展示当前任务名和规则名【完整性校验-key范围校验】。 |

### 质量报告页

#### 报告文案

##### 【P1】验证质量报告页展示key范围校验通过文案

> 前置条件
```
1、在【通用配置 → json格式配置】页面选择数据源类型 `doris3.x`，导入文件 `json_format_import_template_15693.xlsx`，导入内容如下：
- 一层 Sheet：A2~A5 依次填写 `profile`、`order`、`items`、`meta`；A6~A261 连续填写 `ext001`~`ext256`
- 二层 Sheet：`profile` 下填写 `name`、`address`、`contact`；`order` 下填写 `id`、`amount`；`items` 下填写 `sku`、`qty`
- 三层 Sheet：`profile-address` 下填写 `city`、`street`；`profile-contact` 下填写 `mobile`、`email`
- 四层 Sheet：`profile-address-city` 下填写 `code`
- 五层 Sheet：`profile-address-city-code` 下填写 `value`
导入成功后，确认 `ext256`、`order-id`、`profile-address-city-code-value` 可在 15696 页面搜索到。
2、在 Doris3.x 执行建表与灌数 SQL，准备 json 字段 `payload_json`、string 字段 `payload_str`、分区字段 `dt`、抽样标记字段 `region`：
DROP TABLE IF EXISTS qa_data_assets.key_scope_orders_15693;
CREATE TABLE qa_data_assets.key_scope_orders_15693 (
  row_id INT,
  dt DATE,
  region VARCHAR(32),
  payload_json JSON,
  payload_str STRING
)
DISTRIBUTED BY HASH(row_id) BUCKETS 3
PROPERTIES("replication_num" = "1");
INSERT INTO qa_data_assets.key_scope_orders_15693 VALUES
(1, '2026-04-01', 'sample_pass', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}'),
(2, '2026-04-01', 'sample_pass', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}'),
(3, '2026-04-01', 'history_pass', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}'),
(4, '2026-04-02', 'partition_fail', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}');
3、抽样场景使用过滤条件 `region='sample_pass'` 且抽样比例 100%，分区场景使用分区表达式 `dt='2026-04-02'`。
4、已存在任务 `qa_key_scope_sample_pass_15693`，规则为 `payload_json + 包含 + order-id;items-sku;items-qty`，过滤条件 `region='sample_pass'`，最近一次执行状态为“通过”。
5、`qa_key_scope_sample_pass_15693` 的质量报告已生成。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 质量报告页】页面 | 页面正常加载，可按任务名称查看最新质量报告。 |
| 2 | 在筛选区输入任务名称 `qa_key_scope_sample_pass_15693` 后点击【查询】 | 列表返回该任务最近一次已生成的质量报告。 |
| 3 | 打开 `qa_key_scope_sample_pass_15693` 的最新质量报告详情 | 报告详情页成功打开，可见规则结论区域。 |
| 4 | 查看报告中的【校验结论】内容 | 报告文案精确展示为“符合规则key范围包含“order-id;items-sku;items-qty””；页面不展示未通过原因和未通过详情区块。 |

##### 【P0】验证质量报告页展示key范围校验未通过原因与详情说明

> 前置条件
```
1、在【通用配置 → json格式配置】页面选择数据源类型 `doris3.x`，导入文件 `json_format_import_template_15693.xlsx`，导入内容如下：
- 一层 Sheet：A2~A5 依次填写 `profile`、`order`、`items`、`meta`；A6~A261 连续填写 `ext001`~`ext256`
- 二层 Sheet：`profile` 下填写 `name`、`address`、`contact`；`order` 下填写 `id`、`amount`；`items` 下填写 `sku`、`qty`
- 三层 Sheet：`profile-address` 下填写 `city`、`street`；`profile-contact` 下填写 `mobile`、`email`
- 四层 Sheet：`profile-address-city` 下填写 `code`
- 五层 Sheet：`profile-address-city-code` 下填写 `value`
导入成功后，确认 `ext256`、`order-id`、`profile-address-city-code-value` 可在 15696 页面搜索到。
2、在 Doris3.x 执行建表与灌数 SQL，准备 json 字段 `payload_json`、string 字段 `payload_str`、分区字段 `dt`、抽样标记字段 `region`：
DROP TABLE IF EXISTS qa_data_assets.key_scope_orders_15693;
CREATE TABLE qa_data_assets.key_scope_orders_15693 (
  row_id INT,
  dt DATE,
  region VARCHAR(32),
  payload_json JSON,
  payload_str STRING
)
DISTRIBUTED BY HASH(row_id) BUCKETS 3
PROPERTIES("replication_num" = "1");
INSERT INTO qa_data_assets.key_scope_orders_15693 VALUES
(1, '2026-04-01', 'sample_pass', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}', '{"profile":{"name":"张三","address":{"city":{"code":{"value":"310000"}}},"contact":{"mobile":"13800000001"}},"order":{"id":"ORD001","amount":88.8},"items":{"sku":"SKU001","qty":1}}'),
(2, '2026-04-01', 'sample_pass', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}', '{"profile":{"name":"李四","address":{"city":{"code":{"value":"320000"}}},"contact":{"mobile":"13800000002"}},"order":{"id":"ORD002","amount":108.5},"items":{"sku":"SKU002","qty":2}}'),
(3, '2026-04-01', 'history_pass', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}', '{"profile":{"name":"王五","address":{"city":{"code":{"value":"330000"}}},"contact":{"mobile":"13800000003"}},"order":{"id":"ORD003","amount":66.6},"items":{"sku":"SKU003","qty":1}}'),
(4, '2026-04-02', 'partition_fail', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}', '{"profile":{"name":"Lucy","contact":{"email":"lucy@example.com"}},"order":{"id":"ORD004","amount":199.0},"items":{"sku":"SKU004","qty":3},"hack":"badKey"}');
3、抽样场景使用过滤条件 `region='sample_pass'` 且抽样比例 100%，分区场景使用分区表达式 `dt='2026-04-02'`。
4、已存在任务 `qa_key_scope_partition_fail_15693`，规则为 `payload_str + 不包含 + hack`，分区表达式 `dt='2026-04-02'`，最近一次执行状态为“不通过”，命中 row_id=4。
5、`qa_key_scope_partition_fail_15693` 的质量报告已生成。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 质量报告页】页面 | 页面正常加载，可按任务名称查看最新质量报告。 |
| 2 | 在筛选区输入任务名称 `qa_key_scope_partition_fail_15693` 后点击【查询】 | 列表返回该任务最近一次已生成的质量报告。 |
| 3 | 打开 `qa_key_scope_partition_fail_15693` 的最新质量报告详情 | 报告详情页成功打开，可见未通过说明区域。 |
| 4 | 查看报告中的【未通过原因】内容 | 未通过原因精确展示为“key范围校验未通过”。 |
| 5 | 查看报告中的【未通过详情】内容 | 未通过详情精确展示为“不符合规则key范围不包含“hack””，并与结果查询页的异常 key 保持一致。 |
