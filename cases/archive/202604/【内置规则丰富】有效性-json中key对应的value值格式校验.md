---
suite_name: 【内置规则丰富】有效性-json中key对应的value值格式校验
description: 【内置规则丰富】有效性-json中key对应的value值格式校验
prd_id: 15694
prd_version: v6.4.10
prd_path: cases/prds/202604/【内置规则丰富】有效性-json中key对应的value值格式校验.md
product: data-assets
dev_version: ""
tags:
  - 数据资产
  - 数据质量
  - 内置规则丰富
  - 有效性校验
  - json格式校验
  - value格式
  - 有效性
  - json中key对应的value值格式校验
  - data-assets
create_at: 2026-04-03
update_at: 2026-04-03
status: 已归档
health_warnings: []
repos: []
case_count: 18
case_types:
  normal: 14
  abnormal: 3
  boundary: 1
origin: json
---

## 数据质量

### 新建监控规则页

#### 规则入口与保存

##### 【P0】验证完成真实链路后可进入新建监控规则页并选择格式-json格式校验

> 前置条件
```
1. 测试账号具备【数据质量 → 规则集管理】、【数据质量 → 规则任务管理】、【结果查询】、【质量报告】、【规则库】页面访问权限。
2. 在“json格式校验管理”中维护以下已配置 value 格式的 key：
- user.profile.name（中文姓名） → ^[\u4e00-\u9fa5]{2,8}$
- user.profile.age（年龄） → ^(1[89]|[2-9]\d)$
- user.contact.mobile（手机号） → ^1\d{10}$
- order.items.sku（商品编码） → ^SKU-\d{6}$
- order.items.qty（商品数量） → ^[1-9]\d*$
- order.meta.tags（订单标签） → ^(vip|new|hot)(,(vip|new|hot))*$
3. 同时准备未配置 value 格式的 key：user.profile.nickname、order.meta.note。
4. 在 Hive2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_hive;
CREATE TABLE qa_json_value_hive (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_hive VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
5. 在 Doris3.x 集群执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_doris;
CREATE TABLE qa_json_value_doris (
  id INT,
  json_payload JSON,
  string_payload VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_json_value_doris VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
6. 在 SparkThrift2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_spark;
CREATE TABLE qa_json_value_spark (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_spark VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理 → 新增规则集】页面 | 新增规则集表单正常加载，可填写规则集名称、描述等基础信息 |
| 2 | 填写规则集名称“json_value_format_15694”，点击【保存】按钮 | 规则集创建成功，列表中可检索到规则集“json_value_format_15694” |
| 3 | 进入【数据质量 → 规则任务管理 → 新建监控规则】页面 | 新建监控规则页面正常加载，展示规则类型、字段类型、规则配置等区域 |
| 4 | 在规则类型区域展开有效性校验规则列表 | 规则列表正常展示，包含【格式-json格式校验】规则项 |
| 5 | 选择【格式-json格式校验】规则项 | 页面展示校验key、value格式预览、过滤条件、强弱规则、规则描述等配置区域 |

##### 【P1】验证格式-json格式校验入口位于自定义正则上方且规则解释正确

> 前置条件
```
1. 测试账号具备【数据质量 → 规则集管理】、【数据质量 → 规则任务管理】、【结果查询】、【质量报告】、【规则库】页面访问权限。
2. 在“json格式校验管理”中维护以下已配置 value 格式的 key：
- user.profile.name（中文姓名） → ^[\u4e00-\u9fa5]{2,8}$
- user.profile.age（年龄） → ^(1[89]|[2-9]\d)$
- user.contact.mobile（手机号） → ^1\d{10}$
- order.items.sku（商品编码） → ^SKU-\d{6}$
- order.items.qty（商品数量） → ^[1-9]\d*$
- order.meta.tags（订单标签） → ^(vip|new|hot)(,(vip|new|hot))*$
3. 同时准备未配置 value 格式的 key：user.profile.nickname、order.meta.note。
4. 在 Hive2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_hive;
CREATE TABLE qa_json_value_hive (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_hive VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
5. 在 Doris3.x 集群执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_doris;
CREATE TABLE qa_json_value_doris (
  id INT,
  json_payload JSON,
  string_payload VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_json_value_doris VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
6. 在 SparkThrift2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_spark;
CREATE TABLE qa_json_value_spark (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_spark VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理 → 新增规则集】页面 | 新增规则集表单正常加载，可填写规则集名称、描述等基础信息 |
| 2 | 填写规则集名称“json_value_format_15694”，点击【保存】按钮 | 规则集创建成功，列表中可检索到规则集“json_value_format_15694” |
| 3 | 进入【数据质量 → 规则任务管理 → 新建监控规则】页面 | 新建监控规则页面正常加载，展示规则类型、字段类型、规则配置等区域 |
| 4 | 在规则类型区域展开有效性校验规则列表 | 规则列表正常展示 |
| 5 | 查看【格式-json格式校验】与【自定义正则】的相对位置 | 【格式-json格式校验】显示在【自定义正则】上方 |
| 6 | 查看【格式-json格式校验】的规则说明或悬浮提示 | 规则解释展示为“校验json类型的字段中key对应的value值是否符合规范要求” |

##### 【P0】验证json字段类型下保存格式-json格式校验成功

> 前置条件
```
1. 测试账号具备【数据质量 → 规则集管理】、【数据质量 → 规则任务管理】、【结果查询】、【质量报告】、【规则库】页面访问权限。
2. 在“json格式校验管理”中维护以下已配置 value 格式的 key：
- user.profile.name（中文姓名） → ^[\u4e00-\u9fa5]{2,8}$
- user.profile.age（年龄） → ^(1[89]|[2-9]\d)$
- user.contact.mobile（手机号） → ^1\d{10}$
- order.items.sku（商品编码） → ^SKU-\d{6}$
- order.items.qty（商品数量） → ^[1-9]\d*$
- order.meta.tags（订单标签） → ^(vip|new|hot)(,(vip|new|hot))*$
3. 同时准备未配置 value 格式的 key：user.profile.nickname、order.meta.note。
4. 在 Hive2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_hive;
CREATE TABLE qa_json_value_hive (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_hive VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
5. 在 Doris3.x 集群执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_doris;
CREATE TABLE qa_json_value_doris (
  id INT,
  json_payload JSON,
  string_payload VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_json_value_doris VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
6. 在 SparkThrift2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_spark;
CREATE TABLE qa_json_value_spark (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_spark VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理 → 新增规则集】页面 | 新增规则集表单正常加载，可填写规则集名称、描述等基础信息 |
| 2 | 填写规则集名称“json_value_format_15694”，点击【保存】按钮 | 规则集创建成功，列表中可检索到规则集“json_value_format_15694” |
| 3 | 进入【数据质量 → 规则任务管理 → 新建监控规则】页面 | 新建监控规则页面正常加载，展示规则类型、字段类型、规则配置等区域 |
| 4 | 选择【格式-json格式校验】规则项，字段类型选择【json】，字段选择“json_payload” | json 类型字段可正常选中，页面允许继续配置校验key |
| 5 | 勾选“user.profile.name”“user.profile.age”“user.contact.mobile”三个已配置 value 格式的 key | 已选 key 区域展示 3 个 key，且可打开【value格式预览】按钮 |
| 6 | 按页面顺序填写规则配置：<br>- 规则名称：json_value_format_json<br>- 规则描述：校验 json 字段中指定 key 的 value 格式<br>- 过滤条件：id > 0<br>- 强弱规则：强规则 | 各配置项保存前校验通过，未出现必填项缺失提示 |
| 7 | 点击【保存】按钮并完成后续创建流程 | 规则任务保存成功，返回列表后可检索到规则名称“json_value_format_json” |

##### 【P0】验证string字段类型下保存格式-json格式校验成功

> 前置条件
```
1. 测试账号具备【数据质量 → 规则集管理】、【数据质量 → 规则任务管理】、【结果查询】、【质量报告】、【规则库】页面访问权限。
2. 在“json格式校验管理”中维护以下已配置 value 格式的 key：
- user.profile.name（中文姓名） → ^[\u4e00-\u9fa5]{2,8}$
- user.profile.age（年龄） → ^(1[89]|[2-9]\d)$
- user.contact.mobile（手机号） → ^1\d{10}$
- order.items.sku（商品编码） → ^SKU-\d{6}$
- order.items.qty（商品数量） → ^[1-9]\d*$
- order.meta.tags（订单标签） → ^(vip|new|hot)(,(vip|new|hot))*$
3. 同时准备未配置 value 格式的 key：user.profile.nickname、order.meta.note。
4. 在 Hive2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_hive;
CREATE TABLE qa_json_value_hive (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_hive VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
5. 在 Doris3.x 集群执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_doris;
CREATE TABLE qa_json_value_doris (
  id INT,
  json_payload JSON,
  string_payload VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_json_value_doris VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
6. 在 SparkThrift2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_spark;
CREATE TABLE qa_json_value_spark (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_spark VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理 → 新增规则集】页面 | 新增规则集表单正常加载，可填写规则集名称、描述等基础信息 |
| 2 | 填写规则集名称“json_value_format_15694”，点击【保存】按钮 | 规则集创建成功，列表中可检索到规则集“json_value_format_15694” |
| 3 | 进入【数据质量 → 规则任务管理 → 新建监控规则】页面 | 新建监控规则页面正常加载，展示规则类型、字段类型、规则配置等区域 |
| 4 | 选择【格式-json格式校验】规则项，字段类型选择【string】，字段选择“string_payload” | string 类型字段可正常选中，页面允许继续配置校验key |
| 5 | 勾选“order.items.sku”“order.items.qty”“order.meta.tags”三个已配置 value 格式的 key | 已选 key 区域展示 3 个 key，且 key 对应 value 格式可被系统识别 |
| 6 | 按页面顺序填写规则配置：<br>- 规则名称：json_value_format_string<br>- 规则描述：校验 string 字段中的 json key value 格式<br>- 过滤条件：id > 0<br>- 强弱规则：弱规则 | 各配置项保存前校验通过，未出现必填项缺失提示 |
| 7 | 点击【保存】按钮并完成后续创建流程 | 规则任务保存成功，返回列表后可检索到规则名称“json_value_format_string” |

##### 【P1】验证非json和string字段类型不可配置格式-json格式校验

> 前置条件
```
1. 测试账号具备【数据质量 → 规则集管理】、【数据质量 → 规则任务管理】、【结果查询】、【质量报告】、【规则库】页面访问权限。
2. 在“json格式校验管理”中维护以下已配置 value 格式的 key：
- user.profile.name（中文姓名） → ^[\u4e00-\u9fa5]{2,8}$
- user.profile.age（年龄） → ^(1[89]|[2-9]\d)$
- user.contact.mobile（手机号） → ^1\d{10}$
- order.items.sku（商品编码） → ^SKU-\d{6}$
- order.items.qty（商品数量） → ^[1-9]\d*$
- order.meta.tags（订单标签） → ^(vip|new|hot)(,(vip|new|hot))*$
3. 同时准备未配置 value 格式的 key：user.profile.nickname、order.meta.note。
4. 在 Hive2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_hive;
CREATE TABLE qa_json_value_hive (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_hive VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
5. 在 Doris3.x 集群执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_doris;
CREATE TABLE qa_json_value_doris (
  id INT,
  json_payload JSON,
  string_payload VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_json_value_doris VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
6. 在 SparkThrift2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_spark;
CREATE TABLE qa_json_value_spark (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_spark VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理 → 新增规则集】页面 | 新增规则集表单正常加载，可填写规则集名称、描述等基础信息 |
| 2 | 填写规则集名称“json_value_format_15694”，点击【保存】按钮 | 规则集创建成功，列表中可检索到规则集“json_value_format_15694” |
| 3 | 进入【数据质量 → 规则任务管理 → 新建监控规则】页面 | 新建监控规则页面正常加载，展示规则类型、字段类型、规则配置等区域 |
| 4 | 选择【格式-json格式校验】规则项，字段类型切换为【int】或【date】等非 json、string 类型字段 | 页面不允许选择该规则或字段区域展示不可配置状态 |
| 5 | 尝试继续配置校验key并点击【保存】按钮 | 系统拦截保存，明确提示该规则仅支持 json、string 字段类型 |

#### 校验key选择

##### 【P1】验证已配置value格式的key可选且未配置value格式的key不可选

> 前置条件
```
1. 测试账号具备【数据质量 → 规则集管理】、【数据质量 → 规则任务管理】、【结果查询】、【质量报告】、【规则库】页面访问权限。
2. 在“json格式校验管理”中维护以下已配置 value 格式的 key：
- user.profile.name（中文姓名） → ^[\u4e00-\u9fa5]{2,8}$
- user.profile.age（年龄） → ^(1[89]|[2-9]\d)$
- user.contact.mobile（手机号） → ^1\d{10}$
- order.items.sku（商品编码） → ^SKU-\d{6}$
- order.items.qty（商品数量） → ^[1-9]\d*$
- order.meta.tags（订单标签） → ^(vip|new|hot)(,(vip|new|hot))*$
3. 同时准备未配置 value 格式的 key：user.profile.nickname、order.meta.note。
4. 在 Hive2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_hive;
CREATE TABLE qa_json_value_hive (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_hive VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
5. 在 Doris3.x 集群执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_doris;
CREATE TABLE qa_json_value_doris (
  id INT,
  json_payload JSON,
  string_payload VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_json_value_doris VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
6. 在 SparkThrift2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_spark;
CREATE TABLE qa_json_value_spark (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_spark VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理 → 新增规则集】页面 | 新增规则集表单正常加载，可填写规则集名称、描述等基础信息 |
| 2 | 填写规则集名称“json_value_format_15694”，点击【保存】按钮 | 规则集创建成功，列表中可检索到规则集“json_value_format_15694” |
| 3 | 进入【数据质量 → 规则任务管理 → 新建监控规则】页面 | 新建监控规则页面正常加载，展示规则类型、字段类型、规则配置等区域 |
| 4 | 选择【格式-json格式校验】规则项并展开 key 选择树 | key 选择区域正常加载，展示 key（中文名称）列表 |
| 5 | 勾选“user.profile.name”“user.contact.mobile”两个已配置 value 格式的 key | 两个 key 可以正常选中并加入已选区域 |
| 6 | 尝试勾选“user.profile.nickname”“order.meta.note”两个未配置 value 格式的 key | 两个 key 保持不可选状态，无法加入已选区域 |

##### 【P1】验证已选key按层级回显并悬浮展示完整key名

> 前置条件
```
1. 测试账号具备【数据质量 → 规则集管理】、【数据质量 → 规则任务管理】、【结果查询】、【质量报告】、【规则库】页面访问权限。
2. 在“json格式校验管理”中维护以下已配置 value 格式的 key：
- user.profile.name（中文姓名） → ^[\u4e00-\u9fa5]{2,8}$
- user.profile.age（年龄） → ^(1[89]|[2-9]\d)$
- user.contact.mobile（手机号） → ^1\d{10}$
- order.items.sku（商品编码） → ^SKU-\d{6}$
- order.items.qty（商品数量） → ^[1-9]\d*$
- order.meta.tags（订单标签） → ^(vip|new|hot)(,(vip|new|hot))*$
3. 同时准备未配置 value 格式的 key：user.profile.nickname、order.meta.note。
4. 在 Hive2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_hive;
CREATE TABLE qa_json_value_hive (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_hive VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
5. 在 Doris3.x 集群执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_doris;
CREATE TABLE qa_json_value_doris (
  id INT,
  json_payload JSON,
  string_payload VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_json_value_doris VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
6. 在 SparkThrift2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_spark;
CREATE TABLE qa_json_value_spark (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_spark VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理 → 新增规则集】页面 | 新增规则集表单正常加载，可填写规则集名称、描述等基础信息 |
| 2 | 填写规则集名称“json_value_format_15694”，点击【保存】按钮 | 规则集创建成功，列表中可检索到规则集“json_value_format_15694” |
| 3 | 进入【数据质量 → 规则任务管理 → 新建监控规则】页面 | 新建监控规则页面正常加载，展示规则类型、字段类型、规则配置等区域 |
| 4 | 选择【格式-json格式校验】规则项并勾选“user.profile.name”“user.contact.mobile”“order.items.sku” | 已选 key 区域正常展示 3 个 key |
| 5 | 查看已选 key 的回显内容 | 回显内容按“key1-key2;key11-key22”格式展示，默认仅显示前两个 key |
| 6 | 将鼠标悬浮在已选 key 回显区域 | 悬浮层展示全部已选 key 的完整层级名称，包含 user.profile.name、user.contact.mobile、order.items.sku |

#### value格式预览

##### 【P0】验证value格式预览仅展示已勾选key的key和值格式

> 前置条件
```
1. 测试账号具备【数据质量 → 规则集管理】、【数据质量 → 规则任务管理】、【结果查询】、【质量报告】、【规则库】页面访问权限。
2. 在“json格式校验管理”中维护以下已配置 value 格式的 key：
- user.profile.name（中文姓名） → ^[\u4e00-\u9fa5]{2,8}$
- user.profile.age（年龄） → ^(1[89]|[2-9]\d)$
- user.contact.mobile（手机号） → ^1\d{10}$
- order.items.sku（商品编码） → ^SKU-\d{6}$
- order.items.qty（商品数量） → ^[1-9]\d*$
- order.meta.tags（订单标签） → ^(vip|new|hot)(,(vip|new|hot))*$
3. 同时准备未配置 value 格式的 key：user.profile.nickname、order.meta.note。
4. 在 Hive2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_hive;
CREATE TABLE qa_json_value_hive (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_hive VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
5. 在 Doris3.x 集群执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_doris;
CREATE TABLE qa_json_value_doris (
  id INT,
  json_payload JSON,
  string_payload VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_json_value_doris VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
6. 在 SparkThrift2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_spark;
CREATE TABLE qa_json_value_spark (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_spark VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理 → 新增规则集】页面 | 新增规则集表单正常加载，可填写规则集名称、描述等基础信息 |
| 2 | 填写规则集名称“json_value_format_15694”，点击【保存】按钮 | 规则集创建成功，列表中可检索到规则集“json_value_format_15694” |
| 3 | 进入【数据质量 → 规则任务管理 → 新建监控规则】页面 | 新建监控规则页面正常加载，展示规则类型、字段类型、规则配置等区域 |
| 4 | 选择【格式-json格式校验】规则项并勾选“user.profile.name”“user.contact.mobile” | 已选 key 区域仅展示 2 个已勾选 key |
| 5 | 点击【value格式预览】按钮 | 弹出 value 格式预览弹窗 |
| 6 | 查看弹窗中的 key 与 value格式 列表 | 弹窗仅展示 user.profile.name、user.contact.mobile 及其对应格式，不展示未勾选 key |

##### 【P2】验证key数量超过200时value格式预览默认加载前200条并支持分页

> 前置条件
```
1. 测试账号具备【数据质量 → 规则集管理】、【数据质量 → 规则任务管理】、【结果查询】、【质量报告】、【规则库】页面访问权限。
2. 在“json格式校验管理”中维护以下已配置 value 格式的 key：
- user.profile.name（中文姓名） → ^[\u4e00-\u9fa5]{2,8}$
- user.profile.age（年龄） → ^(1[89]|[2-9]\d)$
- user.contact.mobile（手机号） → ^1\d{10}$
- order.items.sku（商品编码） → ^SKU-\d{6}$
- order.items.qty（商品数量） → ^[1-9]\d*$
- order.meta.tags（订单标签） → ^(vip|new|hot)(,(vip|new|hot))*$
3. 同时准备未配置 value 格式的 key：user.profile.nickname、order.meta.note。
4. 在 Hive2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_hive;
CREATE TABLE qa_json_value_hive (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_hive VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
5. 在 Doris3.x 集群执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_doris;
CREATE TABLE qa_json_value_doris (
  id INT,
  json_payload JSON,
  string_payload VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_json_value_doris VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
6. 在 SparkThrift2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_spark;
CREATE TABLE qa_json_value_spark (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_spark VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
7. 额外准备 220 条以上已配置 value 格式的 key 数据，用于验证默认加载前 200 条与分页逻辑。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理 → 新增规则集】页面 | 新增规则集表单正常加载，可填写规则集名称、描述等基础信息 |
| 2 | 填写规则集名称“json_value_format_15694”，点击【保存】按钮 | 规则集创建成功，列表中可检索到规则集“json_value_format_15694” |
| 3 | 进入【数据质量 → 规则任务管理 → 新建监控规则】页面 | 新建监控规则页面正常加载，展示规则类型、字段类型、规则配置等区域 |
| 4 | 选择【格式-json格式校验】规则项，并确保已配置 value 格式的 key 总数超过 220 条 | key 选择区域可正常加载大量 key 数据 |
| 5 | 勾选超过 200 条中的多条 key 后点击【value格式预览】按钮 | 弹窗正常打开，首屏默认仅加载前 200 条预览数据 |
| 6 | 点击分页下一页，再返回上一页 | 分页切换成功，前后页均展示对应页的 key 与 value 格式数据 |

#### 大规模配置

##### 【P1】验证导入千级以上多层级key配置后可搜索勾选回显并运行格式-json格式校验

> 前置条件
```
1. 测试账号具备【json格式校验管理】、【数据质量 → 规则任务管理】、【结果查询】页面访问权限。
                2. 在仓库根目录执行以下 Python3 脚本，生成导入“json格式校验管理”的 xlsx 文件：
                ```bash
                python3 - <<'PY'
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile

output = Path('cases/prds/202604/temp/json-value-format-bulk-15694.xlsx')
headers = ['key', '中文名称', 'value格式']
rows = [
    ['vehicle.owner.idCard.no', '车主身份证号', r'^[1-9]\d{16}[0-9Xx]$'],
    ['vehicle.owner.phone.mobile', '车主手机号', r'^1\d{10}$'],
    ['vehicle.insurance.policy.code', '保单编号', r'^POL-\d{8}$'],
]
for i in range(4, 1006):
    rows.append([
        f'fleet{i:04d}.car{i % 30:02d}.driver{i % 50:02d}.field{i % 12:02d}',
        f'批量字段{i:04d}',
        rf'^VAL{i:04d}-\d{{2}}$'
    ])

all_rows = [headers] + rows


def col_name(idx: int) -> str:
    name = ''
    while idx:
        idx, rem = divmod(idx - 1, 26)
        name = chr(65 + rem) + name
    return name


sheet_rows = []
for r_idx, row in enumerate(all_rows, 1):
    cells = []
    for c_idx, value in enumerate(row, 1):
        ref = f'{col_name(c_idx)}{r_idx}'
        cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{escape(str(value))}</t></is></c>')
    sheet_rows.append(f'<row r="{r_idx}">' + ''.join(cells) + '</row>')

sheet_xml = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    '<sheetData>' + ''.join(sheet_rows) + '</sheetData></worksheet>'
)
workbook_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="json_format_rules" sheetId="1" r:id="rId1"/></sheets></workbook>'
rels_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
wb_rels_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
styles_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf xfId="0"/></cellXfs></styleSheet>'
content_types_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'

output.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as zf:
    zf.writestr('[Content_Types].xml', content_types_xml)
    zf.writestr('_rels/.rels', rels_xml)
    zf.writestr('xl/workbook.xml', workbook_xml)
    zf.writestr('xl/_rels/workbook.xml.rels', wb_rels_xml)
    zf.writestr('xl/worksheets/sheet1.xml', sheet_xml)
    zf.writestr('xl/styles.xml', styles_xml)
print(output)
PY
                ```
                3. 进入【json格式校验管理】页面，导入 `cases/prds/202604/temp/json-value-format-bulk-15694.xlsx`，确认导入结果显示新增 1005 条 value 格式配置。
                4. 在 Hive2.x 执行以下 SQL，准备多层级 json 样例数据：
                ```sql
                DROP TABLE IF EXISTS qa_json_value_bulk_hive;
                CREATE TABLE qa_json_value_bulk_hive (
                  id INT,
                  json_payload STRING
                );
                INSERT INTO qa_json_value_bulk_hive VALUES
                  (1, '{"vehicle":{"owner":{"idCard":{"no":"11010519491231002X"},"phone":{"mobile":"13800138000"}},"insurance":{"policy":{"code":"POL-20260401"}}}'),
                  (2, '{"vehicle":{"owner":{"idCard":{"no":"1234"},"phone":{"mobile":"23800138000"}},"insurance":{"policy":{"code":"BAD-20260401"}}}');
                ```
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【json格式校验管理】页面 | json格式校验管理列表正常加载，支持导入、搜索和删除操作 |
| 2 | 点击【导入】按钮，上传“json-value-format-bulk-15694.xlsx” | 导入成功提示显示，列表可检索到 vehicle.owner.idCard.no、vehicle.owner.phone.mobile、vehicle.insurance.policy.code 及其余批量导入 key |
| 3 | 进入【数据质量 → 规则任务管理 → 新建监控规则】页面 | 新建监控规则页面正常加载，可选择有效性校验规则 |
| 4 | 选择【格式-json格式校验】规则项，搜索并勾选“vehicle.owner.idCard.no”“vehicle.owner.phone.mobile”“vehicle.insurance.policy.code” 3 个已导入 key | 勾选成功，回显区域按层级展示 3 个 key，悬浮后可查看完整层级路径 |
| 5 | 点击【value格式预览】按钮 | 预览弹窗仅展示当前勾选的 3 个 key 与对应 value 格式，分页总数与已勾选 key 数一致，不展示未勾选的批量导入 key |
| 6 | 选择 Hive2.x 数据源表“qa_json_value_bulk_hive”的 json_payload 字段并保存规则后执行任务 | 规则保存成功，任务执行完成且成功匹配多层级 key 路径 |
| 7 | 进入【数据质量 → 结果查询】页面，查看本次执行结果 | 结果页展示 1 条通过、1 条失败记录，失败原因为 key 对应 value 格式校验未通过 |

#### 抽样/分区

##### 【P0】验证开启抽样配置后运行格式-json格式校验结果与抽样范围一致

> 前置条件
```
1. 测试账号具备【数据质量 → 规则任务管理】、【结果查询】页面访问权限。
2. 在“json格式校验管理”中维护 key `user.contact.mobile（手机号） → ^1\d{10}$`。
3. 在 Hive2.x 执行以下 SQL，准备 20 条样例数据，其中 id 为 5、10、15、20 的手机号不符合规则：
```sql
DROP TABLE IF EXISTS qa_json_value_sample_hive;
CREATE TABLE qa_json_value_sample_hive (
  id INT,
  json_payload STRING
);
INSERT INTO qa_json_value_sample_hive VALUES
  (1, '{"user":{"contact":{"mobile":"13800138001"}}}'),
  (2, '{"user":{"contact":{"mobile":"13800138002"}}}'),
  (3, '{"user":{"contact":{"mobile":"13800138003"}}}'),
  (4, '{"user":{"contact":{"mobile":"13800138004"}}}'),
  (5, '{"user":{"contact":{"mobile":"23800138005"}}}'),
  (6, '{"user":{"contact":{"mobile":"13800138006"}}}'),
  (7, '{"user":{"contact":{"mobile":"13800138007"}}}'),
  (8, '{"user":{"contact":{"mobile":"13800138008"}}}'),
  (9, '{"user":{"contact":{"mobile":"13800138009"}}}'),
  (10, '{"user":{"contact":{"mobile":"23800138010"}}}'),
  (11, '{"user":{"contact":{"mobile":"13800138011"}}}'),
  (12, '{"user":{"contact":{"mobile":"13800138012"}}}'),
  (13, '{"user":{"contact":{"mobile":"13800138013"}}}'),
  (14, '{"user":{"contact":{"mobile":"13800138014"}}}'),
  (15, '{"user":{"contact":{"mobile":"23800138015"}}}'),
  (16, '{"user":{"contact":{"mobile":"13800138016"}}}'),
  (17, '{"user":{"contact":{"mobile":"13800138017"}}}'),
  (18, '{"user":{"contact":{"mobile":"13800138018"}}}'),
  (19, '{"user":{"contact":{"mobile":"13800138019"}}}'),
  (20, '{"user":{"contact":{"mobile":"23800138020"}}}');
```
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建监控规则】页面 | 新建监控规则页面正常加载 |
| 2 | 选择【格式-json格式校验】规则项，数据源选择 Hive2.x 表“qa_json_value_sample_hive”，校验字段选择“json_payload” | 规则配置区展示校验key、抽样配置、过滤条件等可编辑区域 |
| 3 | 在抽样配置中开启抽样，抽样比例填写“20%”，并勾选 key“user.contact.mobile” | 抽样配置与校验 key 均保存到当前表单，未出现字段联动报错 |
| 4 | 点击【保存】按钮 | 规则保存成功，任务列表中生成抽样场景规则 |
| 5 | 执行该规则任务 | 任务执行完成，执行状态显示成功或完成 |
| 6 | 进入【数据质量 → 结果查询】页面，查看本次执行结果 | 结果页展示的校验记录数小于全量 20 条且大于 0，失败明细仅出现在本次抽样命中的异常记录中 |

##### 【P0】验证配置分区过滤条件后仅校验目标分区数据

> 前置条件
```
1. 测试账号具备【数据质量 → 规则任务管理】、【结果查询】、【质量报告】页面访问权限。
2. 在“json格式校验管理”中维护 key `order.meta.tags（订单标签） → ^(vip|new|hot)(,(vip|new|hot))*$`。
3. 在 Hive2.x 执行以下 SQL，准备按 dt 分区的数据：
```sql
DROP TABLE IF EXISTS qa_json_value_partition_hive;
CREATE TABLE qa_json_value_partition_hive (
  id INT,
  json_payload STRING
) PARTITIONED BY (dt STRING);
INSERT INTO qa_json_value_partition_hive PARTITION (dt='2026-04-01') VALUES
  (1, '{"order":{"meta":{"tags":"vip,new"}}}'),
  (2, '{"order":{"meta":{"tags":"vip,foo"}}}');
INSERT INTO qa_json_value_partition_hive PARTITION (dt='2026-04-02') VALUES
  (3, '{"order":{"meta":{"tags":"hot"}}}'),
  (4, '{"order":{"meta":{"tags":"new,bar"}}}');
```
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 新建监控规则】页面 | 新建监控规则页面正常加载 |
| 2 | 选择【格式-json格式校验】规则项，数据源选择 Hive2.x 表“qa_json_value_partition_hive”，校验字段选择“json_payload” | 规则配置区正常展示 |
| 3 | 勾选 key“order.meta.tags”，并在过滤条件中填写“dt='2026-04-02'” | 过滤条件保存到当前规则，仅针对目标分区执行校验 |
| 4 | 点击【保存】按钮并执行任务 | 规则保存成功，任务执行完成 |
| 5 | 进入【数据质量 → 结果查询】页面，查看本次执行结果 | 结果页仅统计 dt=2026-04-02 分区中的 2 条记录，失败明细只展示该分区内不符合标签格式的记录 |
| 6 | 进入【数据质量 → 质量报告】页面，查看该任务对应报告 | 质量报告中的规则结果与结果查询保持一致，不包含 dt=2026-04-01 分区数据 |

#### 回归场景

##### 【P0】验证已关联任务的key配置被删除后历史规则回显与任务运行仍正常

> 前置条件
```
1. 测试账号具备【json格式校验管理】、【数据质量 → 规则任务管理】、【结果查询】页面访问权限。
2. 在“json格式校验管理”中维护 key `vehicle.owner.phone.mobile（车主手机号） → ^1\d{10}$`。
3. 使用 Hive2.x 表 `qa_json_deleted_key_hive` 创建规则任务 `json_value_deleted_key_15694`，校验字段为 `json_payload`，已勾选 key 为 `vehicle.owner.phone.mobile`；该任务至少成功执行 1 次并保留历史执行记录。
4. `qa_json_deleted_key_hive` 中保留以下样例数据：
```sql
DROP TABLE IF EXISTS qa_json_deleted_key_hive;
CREATE TABLE qa_json_deleted_key_hive (
  id INT,
  json_payload STRING
);
INSERT INTO qa_json_deleted_key_hive VALUES
  (1, '{"vehicle":{"owner":{"phone":{"mobile":"13800138000"}}}}'),
  (2, '{"vehicle":{"owner":{"phone":{"mobile":"23800138000"}}}}');
```
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理】页面 | 规则任务列表正常加载，可查看已创建任务 |
| 2 | 打开规则任务“json_value_deleted_key_15694”的详情或编辑页 | 任务详情正常展示，校验 key 区域仍回显“vehicle.owner.phone.mobile”及其 value 格式信息 |
| 3 | 进入【json格式校验管理】页面，搜索“vehicle.owner.phone.mobile”并点击【删除】按钮 | 删除成功提示显示，该 key 从 json格式校验管理列表中消失 |
| 4 | 返回【数据质量 → 规则任务管理】页面，再次打开规则任务“json_value_deleted_key_15694”详情 | 历史规则配置仍正常回显已删除 key，未出现空白、乱码或配置丢失 |
| 5 | 执行规则任务“json_value_deleted_key_15694” | 任务执行完成，运行状态正常，不因上游 key 配置被删除而报错 |
| 6 | 进入【数据质量 → 结果查询】页面，查看本次执行结果 | 结果页仍能按既有规则产出 1 条通过、1 条失败记录，失败明细与历史规则定义一致 |

#### 脏数据存储

##### 【P1】验证脏数据存储目标库变更后失败数据仍写入新目标库

> 前置条件
```
1. 测试账号具备【数据质量 → 规则任务管理】、【结果查询】页面访问权限。
2. 在“json格式校验管理”中维护 key `order.items.qty（商品数量） → ^[1-9]\d*$`。
3. 在 Doris3.x 集群执行以下 SQL，准备源表与两个脏数据目标表：
```sql
DROP TABLE IF EXISTS qa_json_dirty_src_doris;
CREATE TABLE qa_json_dirty_src_doris (
  id INT,
  json_payload JSON
) DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_json_dirty_src_doris VALUES
  (1, '{"order":{"items":[{"qty":"2"}]}}'),
  (2, '{"order":{"items":[{"qty":"0"}]}}');

DROP TABLE IF EXISTS qa_dirty_json_v1;
CREATE TABLE qa_dirty_json_v1 (
  task_name VARCHAR(100),
  biz_id INT,
  dirty_payload STRING
) DISTRIBUTED BY HASH(biz_id) BUCKETS 2;

DROP TABLE IF EXISTS qa_dirty_json_v2;
CREATE TABLE qa_dirty_json_v2 (
  task_name VARCHAR(100),
  biz_id INT,
  dirty_payload STRING
) DISTRIBUTED BY HASH(biz_id) BUCKETS 2;
```
4. 已创建规则任务 `json_value_dirty_store_15694`，当前脏数据存储目标库为 `qa_dirty_json_v1`。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理】页面 | 规则任务列表正常加载 |
| 2 | 打开规则任务“json_value_dirty_store_15694”的编辑页 | 任务编辑页正常展示源表、校验规则和脏数据存储配置 |
| 3 | 在脏数据存储配置中将目标库从“qa_dirty_json_v1”改为“qa_dirty_json_v2”，点击【保存】按钮 | 规则保存成功，详情页回显新的脏数据存储目标库“qa_dirty_json_v2” |
| 4 | 执行规则任务“json_value_dirty_store_15694” | 任务执行完成，执行状态正常 |
| 5 | 进入【数据质量 → 结果查询】页面，查看本次执行结果和失败详情 | 结果页展示 1 条失败记录，失败原因为 key 对应 value 格式校验未通过 |
| 6 | 在 Doris3.x 查询脏数据目标表 | qa_dirty_json_v2 新增本次失败数据，qa_dirty_json_v1 未写入本次新增脏数据，脏数据存储功能正常 |

### 结果查询页

#### 结果与明细

##### 【P0】验证校验失败时结果查询可查看详情日志且校验字段标红

> 前置条件
```
1. 测试账号具备【数据质量 → 规则集管理】、【数据质量 → 规则任务管理】、【结果查询】、【质量报告】、【规则库】页面访问权限。
2. 在“json格式校验管理”中维护以下已配置 value 格式的 key：
- user.profile.name（中文姓名） → ^[\u4e00-\u9fa5]{2,8}$
- user.profile.age（年龄） → ^(1[89]|[2-9]\d)$
- user.contact.mobile（手机号） → ^1\d{10}$
- order.items.sku（商品编码） → ^SKU-\d{6}$
- order.items.qty（商品数量） → ^[1-9]\d*$
- order.meta.tags（订单标签） → ^(vip|new|hot)(,(vip|new|hot))*$
3. 同时准备未配置 value 格式的 key：user.profile.nickname、order.meta.note。
4. 在 Hive2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_hive;
CREATE TABLE qa_json_value_hive (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_hive VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
5. 在 Doris3.x 集群执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_doris;
CREATE TABLE qa_json_value_doris (
  id INT,
  json_payload JSON,
  string_payload VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_json_value_doris VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
6. 在 SparkThrift2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_spark;
CREATE TABLE qa_json_value_spark (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_spark VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
7. 已创建规则名称为 json_value_format_json 的规则任务，并执行失败样例数据。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理 → 新增规则集】页面 | 新增规则集表单正常加载，可填写规则集名称、描述等基础信息 |
| 2 | 填写规则集名称“json_value_format_15694”，点击【保存】按钮 | 规则集创建成功，列表中可检索到规则集“json_value_format_15694” |
| 3 | 进入【数据质量 → 规则任务管理 → 新建监控规则】页面 | 新建监控规则页面正常加载，展示规则类型、字段类型、规则配置等区域 |
| 4 | 按规则名称“json_value_format_json”执行包含失败样例数据的规则任务 | 任务执行结束，执行结果为失败 |
| 5 | 进入【数据质量 → 结果查询】页面并检索该次执行记录 | 结果查询列表展示对应失败记录 |
| 6 | 点击失败记录对应的【详情】按钮 | 页面展示失败明细，原始记录中的全部字段均保留 |
| 7 | 查看失败明细与日志入口 | 校验失败字段内容标红，且该记录支持查看执行日志 |

##### 【P1】验证校验成功时结果查询不生成失败明细

> 前置条件
```
1. 测试账号具备【数据质量 → 规则集管理】、【数据质量 → 规则任务管理】、【结果查询】、【质量报告】、【规则库】页面访问权限。
2. 在“json格式校验管理”中维护以下已配置 value 格式的 key：
- user.profile.name（中文姓名） → ^[\u4e00-\u9fa5]{2,8}$
- user.profile.age（年龄） → ^(1[89]|[2-9]\d)$
- user.contact.mobile（手机号） → ^1\d{10}$
- order.items.sku（商品编码） → ^SKU-\d{6}$
- order.items.qty（商品数量） → ^[1-9]\d*$
- order.meta.tags（订单标签） → ^(vip|new|hot)(,(vip|new|hot))*$
3. 同时准备未配置 value 格式的 key：user.profile.nickname、order.meta.note。
4. 在 Hive2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_hive;
CREATE TABLE qa_json_value_hive (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_hive VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
5. 在 Doris3.x 集群执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_doris;
CREATE TABLE qa_json_value_doris (
  id INT,
  json_payload JSON,
  string_payload VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_json_value_doris VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
6. 在 SparkThrift2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_spark;
CREATE TABLE qa_json_value_spark (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_spark VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
7. 已创建规则名称为 json_value_format_json 的规则任务，并执行通过样例数据。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理 → 新增规则集】页面 | 新增规则集表单正常加载，可填写规则集名称、描述等基础信息 |
| 2 | 填写规则集名称“json_value_format_15694”，点击【保存】按钮 | 规则集创建成功，列表中可检索到规则集“json_value_format_15694” |
| 3 | 进入【数据质量 → 规则任务管理 → 新建监控规则】页面 | 新建监控规则页面正常加载，展示规则类型、字段类型、规则配置等区域 |
| 4 | 按规则名称“json_value_format_json”执行仅包含通过样例数据的规则任务 | 任务执行结束，执行结果为成功 |
| 5 | 进入【数据质量 → 结果查询】页面并检索该次执行记录 | 结果查询列表展示对应成功记录 |
| 6 | 点击成功记录对应的【详情】按钮 | 页面不生成失败明细，或仅展示执行结果摘要信息 |

### 质量报告页

#### 结果文案

##### 【P1】验证质量报告展示通过与失败文案正确

> 前置条件
```
1. 测试账号具备【数据质量 → 规则集管理】、【数据质量 → 规则任务管理】、【结果查询】、【质量报告】、【规则库】页面访问权限。
2. 在“json格式校验管理”中维护以下已配置 value 格式的 key：
- user.profile.name（中文姓名） → ^[\u4e00-\u9fa5]{2,8}$
- user.profile.age（年龄） → ^(1[89]|[2-9]\d)$
- user.contact.mobile（手机号） → ^1\d{10}$
- order.items.sku（商品编码） → ^SKU-\d{6}$
- order.items.qty（商品数量） → ^[1-9]\d*$
- order.meta.tags（订单标签） → ^(vip|new|hot)(,(vip|new|hot))*$
3. 同时准备未配置 value 格式的 key：user.profile.nickname、order.meta.note。
4. 在 Hive2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_hive;
CREATE TABLE qa_json_value_hive (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_hive VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
5. 在 Doris3.x 集群执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_doris;
CREATE TABLE qa_json_value_doris (
  id INT,
  json_payload JSON,
  string_payload VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_json_value_doris VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
6. 在 SparkThrift2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_spark;
CREATE TABLE qa_json_value_spark (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_spark VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
7. 已创建格式-json格式校验规则任务，并完成一次通过样例执行与一次失败样例执行。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理 → 新增规则集】页面 | 新增规则集表单正常加载，可填写规则集名称、描述等基础信息 |
| 2 | 填写规则集名称“json_value_format_15694”，点击【保存】按钮 | 规则集创建成功，列表中可检索到规则集“json_value_format_15694” |
| 3 | 进入【数据质量 → 规则任务管理 → 新建监控规则】页面 | 新建监控规则页面正常加载，展示规则类型、字段类型、规则配置等区域 |
| 4 | 分别执行一条通过样例和一条失败样例的格式-json格式校验任务 | 系统生成通过和失败两类质检结果 |
| 5 | 进入【数据质量 → 质量报告】页面并筛选规则名称“格式-json格式校验” | 质量报告列表展示对应规则记录 |
| 6 | 查看通过记录和失败记录的质检结果文案 | 通过记录展示“符合规则 key 对应的 value 格式要求”，失败记录展示“key对应value格式校验未通过” |

### 规则库页

#### 规则位置与文案

##### 【P2】验证规则库中规则位置和悬浮提示文案正确

> 前置条件
```
1. 测试账号具备【数据质量 → 规则集管理】、【数据质量 → 规则任务管理】、【结果查询】、【质量报告】、【规则库】页面访问权限。
2. 在“json格式校验管理”中维护以下已配置 value 格式的 key：
- user.profile.name（中文姓名） → ^[\u4e00-\u9fa5]{2,8}$
- user.profile.age（年龄） → ^(1[89]|[2-9]\d)$
- user.contact.mobile（手机号） → ^1\d{10}$
- order.items.sku（商品编码） → ^SKU-\d{6}$
- order.items.qty（商品数量） → ^[1-9]\d*$
- order.meta.tags（订单标签） → ^(vip|new|hot)(,(vip|new|hot))*$
3. 同时准备未配置 value 格式的 key：user.profile.nickname、order.meta.note。
4. 在 Hive2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_hive;
CREATE TABLE qa_json_value_hive (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_hive VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
5. 在 Doris3.x 集群执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_doris;
CREATE TABLE qa_json_value_doris (
  id INT,
  json_payload JSON,
  string_payload VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_json_value_doris VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
6. 在 SparkThrift2.x 执行以下 SQL：
```sql
DROP TABLE IF EXISTS qa_json_value_spark;
CREATE TABLE qa_json_value_spark (
  id INT,
  json_payload STRING,
  string_payload STRING
);
INSERT INTO qa_json_value_spark VALUES
  (1, '{"user":{"profile":{"name":"张三","age":"19","nickname":"阿三"},"contact":{"mobile":"13800138000"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new","note":"通过样例"}}}', '{"user":{"profile":{"name":"张三","age":"19"}},"order":{"items":[{"sku":"SKU-100001","qty":"2"}],"meta":{"tags":"vip,new"}}}'),
  (2, '{"user":{"profile":{"name":"Tom123","age":"17","nickname":"TOM"},"contact":{"mobile":"23800138000"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo","note":"失败样例"}}}', '{"user":{"profile":{"name":"Tom123","age":"17"}},"order":{"items":[{"sku":"BAD-100001","qty":"0"}],"meta":{"tags":"vip,foo"}}}');
```
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理 → 新增规则集】页面 | 新增规则集表单正常加载，可填写规则集名称、描述等基础信息 |
| 2 | 填写规则集名称“json_value_format_15694”，点击【保存】按钮 | 规则集创建成功，列表中可检索到规则集“json_value_format_15694” |
| 3 | 进入【数据质量 → 规则任务管理 → 新建监控规则】页面 | 新建监控规则页面正常加载，展示规则类型、字段类型、规则配置等区域 |
| 4 | 进入【数据质量 → 规则库】页面 | 规则库页面正常加载，规则列表可查看 |
| 5 | 定位【格式-json格式校验】规则项并查看其上下文位置 | 【格式-json格式校验】显示在【自定义正则】上方 |
| 6 | 将鼠标悬浮在【格式-json格式校验】规则说明图标或文案区域 | 悬浮提示展示“校验内容为key名对应的value格式是否符合要求，value格式需要在通用配置模块维护。” |
