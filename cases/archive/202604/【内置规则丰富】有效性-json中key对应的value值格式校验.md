---
suite_name: 【内置规则丰富】有效性-json中key对应的value值格式校验
description: 【内置规则丰富】有效性-json中key对应的value值格式校验
prd_id: 15694
prd_version: v6.4.10
prd_path: cases/prds/202604/【内置规则丰富】有效性-json中key对应的value值格式校验.md
prd_url: "https://lanhuapp.com/web/#/item/project/product?tid=24a1c6b2-a52e-454c-8d51-8aff866598b1&pid=7de90493-e80f-4592-a263-38fb2d2e98c0&versionId=236fbc84-10a3-4808-9559-66c1ef54ae55&docId=fc0fee93-74f5-4eff-a769-99e68506b296&docType=axure&pageId=e08ead471bc2471489e6fc7443d060c6&image_id=fc0fee93-74f5-4eff-a769-99e68506b296&parentId=9a152fb2-6417-4ee0-8df3-6f74f7deb413"
product: data-assets
dev_version: 6.3岚图定制化分支
tags:
  - 有效性校验
  - json value校验
  - 格式-json格式校验
  - value格式预览
  - 数据质量
  - 结果查询
  - 规则包
  - 内置规则丰富
  - 有效性
  - json中key对应的value值格式校验
create_at: 2026-04-03
update_at: 2026-04-03
status: 已归档
health_warnings: []
repos: []
case_count: 14
case_types:
  normal: 10
  abnormal: 3
  boundary: 1
origin: json
---

## 数据质量

### 规则集管理页

#### 入口位置

##### 【P0】验证格式-json格式校验入口位于自定义正则上方且仅支持json/string字段

> 前置条件
```
1、在【通用配置 → json格式配置】页面下载 json_format_import_template.xlsx 并导入以下配置（数据源类型统一选 doris3.x）：
- 一层 Sheet：录入 order、user、device、eventTime，并用 Excel 序列填充 root_001~root_1005 共 1005 条一级 key；root_001~root_060 的 value格式 填 ^T-[0-9]{4}$，root_061~root_1005 的 value格式 留空
- 二层/三层 Sheet：order → orderNo(^ORD-[0-9]{8}$)、payAmount(^\d+(\.\d{2})?$)、payTime(^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$)；user → profile → mobile(^1[3-9]\d{9}$)、email(^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$)；device → region → code(^[A-Z]{2}$)、name(留空)；device → sn(留空)；eventTime(^\d{13}$)
2、在 doris3.x 数据源执行 SQL：
CREATE DATABASE IF NOT EXISTS qa_quality;
DROP TABLE IF EXISTS qa_quality.json_value_rule_cfg;
CREATE TABLE qa_quality.json_value_rule_cfg (
  id BIGINT,
  dt DATE,
  payload_json JSON,
  payload_text STRING,
  amount DECIMAL(10,2)
)
DUPLICATE KEY(id)
PARTITION BY RANGE(dt) (
  PARTITION p20260401 VALUES [('2026-04-01'), ('2026-04-02')),
  PARTITION p20260402 VALUES [('2026-04-02'), ('2026-04-03'))
)
DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES('replication_num'='1');
INSERT INTO qa_quality.json_value_rule_cfg VALUES
(1,'2026-04-01','{"order":{"orderNo":"ORD-20260401","payAmount":"199.00","payTime":"2026-04-01 10:15:30"},"user":{"profile":{"mobile":"13812345678","email":"qa_user01@dtstack.com"}},"device":{"region":{"code":"BJ","name":"北京"},"sn":"SN0001"},"eventTime":"1711937730000"}','{"order":{"orderNo":"ORD-20260401","payAmount":"199.00","payTime":"2026-04-01 10:15:30"},"user":{"profile":{"mobile":"13812345678","email":"qa_user01@dtstack.com"}},"device":{"region":{"code":"BJ","name":"北京"},"sn":"SN0001"},"eventTime":"1711937730000"}',199.00),
(2,'2026-04-01','{"order":{"orderNo":"BAD-20260401","payAmount":"199.123","payTime":"2026/04/01 10:15:30"},"user":{"profile":{"mobile":"12345678901","email":"qa_user01dtstack.com"}},"device":{"region":{"code":"be","name":"北京"},"sn":"SN0002"},"eventTime":"17119"}','{"order":{"orderNo":"BAD-20260401","payAmount":"199.123","payTime":"2026/04/01 10:15:30"},"user":{"profile":{"mobile":"12345678901","email":"qa_user01dtstack.com"}},"device":{"region":{"code":"be","name":"北京"},"sn":"SN0002"},"eventTime":"17119"}',199.12),
(3,'2026-04-02','{"order":{"orderNo":"ORD-20260402","payAmount":"88.80","payTime":"2026-04-02 09:30:00"},"user":{"profile":{"mobile":"13912345678","email":"qa_user02@dtstack.com"}},"device":{"region":{"code":"SH","name":"上海"},"sn":"SN0003"},"eventTime":"1712024130000"}','{"order":{"orderNo":"ORD-20260402","payAmount":"88.80","payTime":"2026-04-02 09:30:00"},"user":{"profile":{"mobile":"13912345678","email":"qa_user02@dtstack.com"}},"device":{"region":{"code":"SH","name":"上海"},"sn":"SN0003"},"eventTime":"1712024130000"}',88.80);
3、确认规则集管理中的规则包配置区域字段下拉可见 payload_json(JSON)、payload_text(STRING)，且存在 id、dt、amount 等非支持字段供字段过滤校验使用。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理】页面 | 规则集管理页正常加载，可进入规则包基础信息与规则配置区域。 |
| 2 | 在【规则包基础信息】区域按以下内容配置：<br>- 规则包名称: json_value_entry_order_01<br>- 数据源: doris3.x_qa<br>- 数据库: qa_quality<br>- 数据表: json_value_rule_cfg<br>然后点击【下一步】 | 进入【规则包配置】步骤，字段下拉可见 payload_json(JSON) 与 payload_text(STRING)，不展示 id、dt、amount 作为可选校验字段。 |
| 3 | 在【规则配置】步骤在规则包中点击【添加规则】，选择“有效性校验”后展开「统计规则」下拉框 | 下拉选项中展示“格式-json格式校验”，且该选项位于“格式校验-自定义正则”上方。 |
| 4 | 选择统计规则“格式-json格式校验”，鼠标悬浮规则说明图标 | 页面展示悬浮提示“校验内容为key名对应的value格式是否符合要求，value格式需要在通用配置模块维护。”。 |

#### 千级key层级选择

##### 【P0】验证千级key多层级场景默认展示前200条且勾选仅对当前层级生效

> 前置条件
```
1、在【通用配置 → json格式配置】页面下载 json_format_import_template.xlsx 并导入以下配置（数据源类型统一选 doris3.x）：
- 一层 Sheet：录入 order、user、device、eventTime，并用 Excel 序列填充 root_001~root_1005 共 1005 条一级 key；root_001~root_060 的 value格式 填 ^T-[0-9]{4}$，root_061~root_1005 的 value格式 留空
- 二层/三层 Sheet：order → orderNo(^ORD-[0-9]{8}$)、payAmount(^\d+(\.\d{2})?$)、payTime(^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$)；user → profile → mobile(^1[3-9]\d{9}$)、email(^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$)；device → region → code(^[A-Z]{2}$)、name(留空)；device → sn(留空)；eventTime(^\d{13}$)
2、在 doris3.x 数据源执行 SQL：
CREATE DATABASE IF NOT EXISTS qa_quality;
DROP TABLE IF EXISTS qa_quality.json_value_rule_cfg;
CREATE TABLE qa_quality.json_value_rule_cfg (
  id BIGINT,
  dt DATE,
  payload_json JSON,
  payload_text STRING,
  amount DECIMAL(10,2)
)
DUPLICATE KEY(id)
PARTITION BY RANGE(dt) (
  PARTITION p20260401 VALUES [('2026-04-01'), ('2026-04-02')),
  PARTITION p20260402 VALUES [('2026-04-02'), ('2026-04-03'))
)
DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES('replication_num'='1');
INSERT INTO qa_quality.json_value_rule_cfg VALUES
(1,'2026-04-01','{"order":{"orderNo":"ORD-20260401","payAmount":"199.00","payTime":"2026-04-01 10:15:30"},"user":{"profile":{"mobile":"13812345678","email":"qa_user01@dtstack.com"}},"device":{"region":{"code":"BJ","name":"北京"},"sn":"SN0001"},"eventTime":"1711937730000"}','{"order":{"orderNo":"ORD-20260401","payAmount":"199.00","payTime":"2026-04-01 10:15:30"},"user":{"profile":{"mobile":"13812345678","email":"qa_user01@dtstack.com"}},"device":{"region":{"code":"BJ","name":"北京"},"sn":"SN0001"},"eventTime":"1711937730000"}',199.00),
(2,'2026-04-01','{"order":{"orderNo":"BAD-20260401","payAmount":"199.123","payTime":"2026/04/01 10:15:30"},"user":{"profile":{"mobile":"12345678901","email":"qa_user01dtstack.com"}},"device":{"region":{"code":"be","name":"北京"},"sn":"SN0002"},"eventTime":"17119"}','{"order":{"orderNo":"BAD-20260401","payAmount":"199.123","payTime":"2026/04/01 10:15:30"},"user":{"profile":{"mobile":"12345678901","email":"qa_user01dtstack.com"}},"device":{"region":{"code":"be","name":"北京"},"sn":"SN0002"},"eventTime":"17119"}',199.12),
(3,'2026-04-02','{"order":{"orderNo":"ORD-20260402","payAmount":"88.80","payTime":"2026-04-02 09:30:00"},"user":{"profile":{"mobile":"13912345678","email":"qa_user02@dtstack.com"}},"device":{"region":{"code":"SH","name":"上海"},"sn":"SN0003"},"eventTime":"1712024130000"}','{"order":{"orderNo":"ORD-20260402","payAmount":"88.80","payTime":"2026-04-02 09:30:00"},"user":{"profile":{"mobile":"13912345678","email":"qa_user02@dtstack.com"}},"device":{"region":{"code":"SH","name":"上海"},"sn":"SN0003"},"eventTime":"1712024130000"}',88.80);
3、确认规则集管理中的规则包配置区域字段下拉可见 payload_json(JSON)、payload_text(STRING)，且存在 id、dt、amount 等非支持字段供字段过滤校验使用。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理】页面 | 规则集管理页正常加载，可进入规则包基础信息与规则配置区域。 |
| 2 | 在【规则包基础信息】区域按以下内容配置：<br>- 规则包名称: json_value_key_scope_01<br>- 数据源: doris3.x_qa<br>- 数据库: qa_quality<br>- 数据表: json_value_rule_cfg<br>然后点击【下一步】 | 进入【规则包配置】步骤，可新增 json value 校验规则。 |
| 3 | 在规则包中点击【添加规则】，选择字段 payload_json(JSON) 与统计规则“格式-json格式校验”，再点击【校验key】 | 校验 key 选择弹窗打开，可查看一级 key、搜索框和层级导航。 |
| 4 | 在校验key弹窗先观察一级列表，再搜索“root_988”，清空搜索后依次展开 user → profile 并勾选当前层级全部 key，随后切换到 device → region 层级 | 首次打开仅默认展示前 200 条一级 key，搜索 root_988 可命中对应 key；在 user → profile 层级勾选“当前层级全部”后，仅选中 user-profile-mobile 与 user-profile-email，切换到 device → region 时不会自动勾选 code、name。 |
| 5 | 鼠标悬浮已选 key 区域 | 已选 key 悬浮内容默认仅展示前两个 key，其余 key 以省略形式展示。 |

#### 禁选key

##### 【P1】验证未配置value格式的key在校验key列表中禁选

> 前置条件
```
1、在【通用配置 → json格式配置】页面下载 json_format_import_template.xlsx 并导入以下配置（数据源类型统一选 doris3.x）：
- 一层 Sheet：录入 order、user、device、eventTime，并用 Excel 序列填充 root_001~root_1005 共 1005 条一级 key；root_001~root_060 的 value格式 填 ^T-[0-9]{4}$，root_061~root_1005 的 value格式 留空
- 二层/三层 Sheet：order → orderNo(^ORD-[0-9]{8}$)、payAmount(^\d+(\.\d{2})?$)、payTime(^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$)；user → profile → mobile(^1[3-9]\d{9}$)、email(^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$)；device → region → code(^[A-Z]{2}$)、name(留空)；device → sn(留空)；eventTime(^\d{13}$)
2、在 doris3.x 数据源执行 SQL：
CREATE DATABASE IF NOT EXISTS qa_quality;
DROP TABLE IF EXISTS qa_quality.json_value_rule_cfg;
CREATE TABLE qa_quality.json_value_rule_cfg (
  id BIGINT,
  dt DATE,
  payload_json JSON,
  payload_text STRING,
  amount DECIMAL(10,2)
)
DUPLICATE KEY(id)
PARTITION BY RANGE(dt) (
  PARTITION p20260401 VALUES [('2026-04-01'), ('2026-04-02')),
  PARTITION p20260402 VALUES [('2026-04-02'), ('2026-04-03'))
)
DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES('replication_num'='1');
INSERT INTO qa_quality.json_value_rule_cfg VALUES
(1,'2026-04-01','{"order":{"orderNo":"ORD-20260401","payAmount":"199.00","payTime":"2026-04-01 10:15:30"},"user":{"profile":{"mobile":"13812345678","email":"qa_user01@dtstack.com"}},"device":{"region":{"code":"BJ","name":"北京"},"sn":"SN0001"},"eventTime":"1711937730000"}','{"order":{"orderNo":"ORD-20260401","payAmount":"199.00","payTime":"2026-04-01 10:15:30"},"user":{"profile":{"mobile":"13812345678","email":"qa_user01@dtstack.com"}},"device":{"region":{"code":"BJ","name":"北京"},"sn":"SN0001"},"eventTime":"1711937730000"}',199.00),
(2,'2026-04-01','{"order":{"orderNo":"BAD-20260401","payAmount":"199.123","payTime":"2026/04/01 10:15:30"},"user":{"profile":{"mobile":"12345678901","email":"qa_user01dtstack.com"}},"device":{"region":{"code":"be","name":"北京"},"sn":"SN0002"},"eventTime":"17119"}','{"order":{"orderNo":"BAD-20260401","payAmount":"199.123","payTime":"2026/04/01 10:15:30"},"user":{"profile":{"mobile":"12345678901","email":"qa_user01dtstack.com"}},"device":{"region":{"code":"be","name":"北京"},"sn":"SN0002"},"eventTime":"17119"}',199.12),
(3,'2026-04-02','{"order":{"orderNo":"ORD-20260402","payAmount":"88.80","payTime":"2026-04-02 09:30:00"},"user":{"profile":{"mobile":"13912345678","email":"qa_user02@dtstack.com"}},"device":{"region":{"code":"SH","name":"上海"},"sn":"SN0003"},"eventTime":"1712024130000"}','{"order":{"orderNo":"ORD-20260402","payAmount":"88.80","payTime":"2026-04-02 09:30:00"},"user":{"profile":{"mobile":"13912345678","email":"qa_user02@dtstack.com"}},"device":{"region":{"code":"SH","name":"上海"},"sn":"SN0003"},"eventTime":"1712024130000"}',88.80);
3、确认规则集管理中的规则包配置区域字段下拉可见 payload_json(JSON)、payload_text(STRING)，且存在 id、dt、amount 等非支持字段供字段过滤校验使用。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理】页面 | 规则集管理页正常加载，可进入规则包基础信息与规则配置区域。 |
| 2 | 在【规则包基础信息】区域按以下内容配置：<br>- 规则包名称: json_value_disabled_key_01<br>- 数据源: doris3.x_qa<br>- 数据库: qa_quality<br>- 数据表: json_value_rule_cfg<br>然后点击【下一步】 | 进入【规则包配置】步骤，可新增 json value 校验规则。 |
| 3 | 在规则包中点击【添加规则】，选择字段 payload_json(JSON) 与统计规则“格式-json格式校验”，再点击【校验key】 | 校验 key 选择弹窗打开。 |
| 4 | 依次点击 device-sn、device-region-name、root_061 的勾选框，并勾选已配置 value格式 的 user-profile-mobile | device-sn、device-region-name、root_061 的勾选框为禁用状态且无法加入已选列表；user-profile-mobile 可正常勾选并回显到已选 key 区域。 |

#### value格式预览

##### 【P0】验证value格式预览仅展示已选key且超出单页时支持分页

> 前置条件
```
1、在【通用配置 → json格式配置】页面下载 json_format_import_template.xlsx 并导入以下配置（数据源类型统一选 doris3.x）：
- 一层 Sheet：录入 order、user、device、eventTime，并用 Excel 序列填充 root_001~root_1005 共 1005 条一级 key；root_001~root_060 的 value格式 填 ^T-[0-9]{4}$，root_061~root_1005 的 value格式 留空
- 二层/三层 Sheet：order → orderNo(^ORD-[0-9]{8}$)、payAmount(^\d+(\.\d{2})?$)、payTime(^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$)；user → profile → mobile(^1[3-9]\d{9}$)、email(^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$)；device → region → code(^[A-Z]{2}$)、name(留空)；device → sn(留空)；eventTime(^\d{13}$)
2、在 doris3.x 数据源执行 SQL：
CREATE DATABASE IF NOT EXISTS qa_quality;
DROP TABLE IF EXISTS qa_quality.json_value_rule_cfg;
CREATE TABLE qa_quality.json_value_rule_cfg (
  id BIGINT,
  dt DATE,
  payload_json JSON,
  payload_text STRING,
  amount DECIMAL(10,2)
)
DUPLICATE KEY(id)
PARTITION BY RANGE(dt) (
  PARTITION p20260401 VALUES [('2026-04-01'), ('2026-04-02')),
  PARTITION p20260402 VALUES [('2026-04-02'), ('2026-04-03'))
)
DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES('replication_num'='1');
INSERT INTO qa_quality.json_value_rule_cfg VALUES
(1,'2026-04-01','{"order":{"orderNo":"ORD-20260401","payAmount":"199.00","payTime":"2026-04-01 10:15:30"},"user":{"profile":{"mobile":"13812345678","email":"qa_user01@dtstack.com"}},"device":{"region":{"code":"BJ","name":"北京"},"sn":"SN0001"},"eventTime":"1711937730000"}','{"order":{"orderNo":"ORD-20260401","payAmount":"199.00","payTime":"2026-04-01 10:15:30"},"user":{"profile":{"mobile":"13812345678","email":"qa_user01@dtstack.com"}},"device":{"region":{"code":"BJ","name":"北京"},"sn":"SN0001"},"eventTime":"1711937730000"}',199.00),
(2,'2026-04-01','{"order":{"orderNo":"BAD-20260401","payAmount":"199.123","payTime":"2026/04/01 10:15:30"},"user":{"profile":{"mobile":"12345678901","email":"qa_user01dtstack.com"}},"device":{"region":{"code":"be","name":"北京"},"sn":"SN0002"},"eventTime":"17119"}','{"order":{"orderNo":"BAD-20260401","payAmount":"199.123","payTime":"2026/04/01 10:15:30"},"user":{"profile":{"mobile":"12345678901","email":"qa_user01dtstack.com"}},"device":{"region":{"code":"be","name":"北京"},"sn":"SN0002"},"eventTime":"17119"}',199.12),
(3,'2026-04-02','{"order":{"orderNo":"ORD-20260402","payAmount":"88.80","payTime":"2026-04-02 09:30:00"},"user":{"profile":{"mobile":"13912345678","email":"qa_user02@dtstack.com"}},"device":{"region":{"code":"SH","name":"上海"},"sn":"SN0003"},"eventTime":"1712024130000"}','{"order":{"orderNo":"ORD-20260402","payAmount":"88.80","payTime":"2026-04-02 09:30:00"},"user":{"profile":{"mobile":"13912345678","email":"qa_user02@dtstack.com"}},"device":{"region":{"code":"SH","name":"上海"},"sn":"SN0003"},"eventTime":"1712024130000"}',88.80);
3、确认规则集管理中的规则包配置区域字段下拉可见 payload_json(JSON)、payload_text(STRING)，且存在 id、dt、amount 等非支持字段供字段过滤校验使用。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理】页面 | 规则集管理页正常加载，可进入规则包基础信息与规则配置区域。 |
| 2 | 在【规则包基础信息】区域按以下内容配置：<br>- 规则包名称: json_value_preview_01<br>- 数据源: doris3.x_qa<br>- 数据库: qa_quality<br>- 数据表: json_value_rule_cfg<br>然后点击【下一步】 | 进入【规则包配置】步骤，可新增 json value 校验规则。 |
| 3 | 在规则包中点击【添加规则】，选择字段 payload_text(STRING) 与统计规则“格式-json格式校验” | 规则配置行正常展示【校验key】与【value格式预览】入口。 |
| 4 | 在【校验key】中勾选 order-orderNo、order-payAmount、order-payTime、user-profile-mobile、user-profile-email、device-region-code、eventTime 以及 root_001~root_060 后点击【value格式预览】 | 预览弹窗仅展示已勾选 key 及对应 value 格式，不展示未勾选的 device-sn、device-region-name、root_061。 |
| 5 | 在预览弹窗点击下一页，再返回上一页 | 当已选 key 数量超过单页容量时弹窗展示分页控件，翻页后继续展示剩余已选 key，返回上一页后已选内容保持不变。 |

#### key搜索

##### 【P2】验证校验key搜索无结果时仅展示空状态且不影响已选key

> 前置条件
```
1、在【通用配置 → json格式配置】页面下载 json_format_import_template.xlsx 并导入以下配置（数据源类型统一选 doris3.x）：
- 一层 Sheet：录入 order、user、device、eventTime，并用 Excel 序列填充 root_001~root_1005 共 1005 条一级 key；root_001~root_060 的 value格式 填 ^T-[0-9]{4}$，root_061~root_1005 的 value格式 留空
- 二层/三层 Sheet：order → orderNo(^ORD-[0-9]{8}$)、payAmount(^\d+(\.\d{2})?$)、payTime(^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$)；user → profile → mobile(^1[3-9]\d{9}$)、email(^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$)；device → region → code(^[A-Z]{2}$)、name(留空)；device → sn(留空)；eventTime(^\d{13}$)
2、在 doris3.x 数据源执行 SQL：
CREATE DATABASE IF NOT EXISTS qa_quality;
DROP TABLE IF EXISTS qa_quality.json_value_rule_cfg;
CREATE TABLE qa_quality.json_value_rule_cfg (
  id BIGINT,
  dt DATE,
  payload_json JSON,
  payload_text STRING,
  amount DECIMAL(10,2)
)
DUPLICATE KEY(id)
PARTITION BY RANGE(dt) (
  PARTITION p20260401 VALUES [('2026-04-01'), ('2026-04-02')),
  PARTITION p20260402 VALUES [('2026-04-02'), ('2026-04-03'))
)
DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES('replication_num'='1');
INSERT INTO qa_quality.json_value_rule_cfg VALUES
(1,'2026-04-01','{"order":{"orderNo":"ORD-20260401","payAmount":"199.00","payTime":"2026-04-01 10:15:30"},"user":{"profile":{"mobile":"13812345678","email":"qa_user01@dtstack.com"}},"device":{"region":{"code":"BJ","name":"北京"},"sn":"SN0001"},"eventTime":"1711937730000"}','{"order":{"orderNo":"ORD-20260401","payAmount":"199.00","payTime":"2026-04-01 10:15:30"},"user":{"profile":{"mobile":"13812345678","email":"qa_user01@dtstack.com"}},"device":{"region":{"code":"BJ","name":"北京"},"sn":"SN0001"},"eventTime":"1711937730000"}',199.00),
(2,'2026-04-01','{"order":{"orderNo":"BAD-20260401","payAmount":"199.123","payTime":"2026/04/01 10:15:30"},"user":{"profile":{"mobile":"12345678901","email":"qa_user01dtstack.com"}},"device":{"region":{"code":"be","name":"北京"},"sn":"SN0002"},"eventTime":"17119"}','{"order":{"orderNo":"BAD-20260401","payAmount":"199.123","payTime":"2026/04/01 10:15:30"},"user":{"profile":{"mobile":"12345678901","email":"qa_user01dtstack.com"}},"device":{"region":{"code":"be","name":"北京"},"sn":"SN0002"},"eventTime":"17119"}',199.12),
(3,'2026-04-02','{"order":{"orderNo":"ORD-20260402","payAmount":"88.80","payTime":"2026-04-02 09:30:00"},"user":{"profile":{"mobile":"13912345678","email":"qa_user02@dtstack.com"}},"device":{"region":{"code":"SH","name":"上海"},"sn":"SN0003"},"eventTime":"1712024130000"}','{"order":{"orderNo":"ORD-20260402","payAmount":"88.80","payTime":"2026-04-02 09:30:00"},"user":{"profile":{"mobile":"13912345678","email":"qa_user02@dtstack.com"}},"device":{"region":{"code":"SH","name":"上海"},"sn":"SN0003"},"eventTime":"1712024130000"}',88.80);
3、确认规则集管理中的规则包配置区域字段下拉可见 payload_json(JSON)、payload_text(STRING)，且存在 id、dt、amount 等非支持字段供字段过滤校验使用。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理】页面 | 规则集管理页正常加载，可进入规则包基础信息与规则配置区域。 |
| 2 | 在【规则包基础信息】区域按以下内容配置：<br>- 规则包名称: json_value_key_search_empty_01<br>- 数据源: doris3.x_qa<br>- 数据库: qa_quality<br>- 数据表: json_value_rule_cfg<br>然后点击【下一步】 | 进入【规则包配置】步骤，可新增 json value 校验规则。 |
| 3 | 在规则包中点击【添加规则】，选择字段 payload_json(JSON) 与统计规则“格式-json格式校验”，再点击【校验key】 | 校验 key 选择弹窗打开，默认展示一级 key 列表与搜索框。 |
| 4 | 在搜索框输入 root_not_exist_9999 | 列表仅展示空状态，不新增任何已选 key，当前已选 key 数量保持为 0。 |
| 5 | 清空搜索关键字并观察一级 key 列表 | 一级 key 列表恢复为默认展示状态，仍按首次打开时的前 200 条结果显示。 |

#### 规则包绑定

##### 【P0】验证规则集管理格式-json格式校验后新建规则任务绑定规则包成功

> 前置条件
```
1、在【通用配置 → json格式配置】页面新增以下 key 与 value格式：order → orderNo(^ORD-[0-9]{8}$)、user → profile → email(^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$)、device → region → code(^[A-Z]{2}$)。
2、在 doris3.x 数据源执行 SQL：
DROP TABLE IF EXISTS qa_quality.json_value_package_valid;
CREATE TABLE qa_quality.json_value_package_valid (
  id BIGINT,
  payload_json JSON,
  payload_text STRING
)
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES('replication_num'='1');
INSERT INTO qa_quality.json_value_package_valid VALUES
(1,'{"order":{"orderNo":"ORD-20260411"},"user":{"profile":{"email":"pkg_user01@dtstack.com"}},"device":{"region":{"code":"BJ"}}}','{"order":{"orderNo":"ORD-20260411"},"user":{"profile":{"email":"pkg_user01@dtstack.com"}},"device":{"region":{"code":"BJ"}}}'),
(2,'{"order":{"orderNo":"ORD-20260412"},"user":{"profile":{"email":"pkg_user02@dtstack.com"}},"device":{"region":{"code":"SH"}}}','{"order":{"orderNo":"ORD-20260412"},"user":{"profile":{"email":"pkg_user02@dtstack.com"}},"device":{"region":{"code":"SH"}}}');
3、确认当前账号同时具备【规则集管理】和【规则任务管理】权限。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理】页面 | 规则集管理页面正常加载，可新建规则包。 |
| 2 | 点击【新建规则包】，按以下内容配置：<br>- 规则包名称: json_value_pkg_01<br>- 数据源: doris3.x_qa<br>- 数据库: qa_quality<br>- 数据表: json_value_package_valid<br>- 规则1 字段: payload_json(JSON)；统计规则: 格式-json格式校验；校验key: order-orderNo、user-profile-email、device-region-code<br>- 规则2 字段: payload_text(STRING)；统计规则: 格式-json格式校验；校验key: order-orderNo、user-profile-email、device-region-code<br>然后点击【保存】 | 规则包保存成功，规则包详情中展示两条“格式-json格式校验”规则及对应 key。 |
| 3 | 进入【数据质量 → 规则任务管理 → 单表校验规则】页面，新建任务 json_value_pkg_task_01 并绑定规则包 json_value_pkg_01，点击【立即执行】 | 任务创建成功并继承规则包中的 json value 校验规则，最新实例状态显示校验通过。 |
| 4 | 打开任务 json_value_pkg_task_01 的详情查看继承规则内容 | 任务详情中回显 payload_json(JSON)、payload_text(STRING) 两条规则以及 order-orderNo;user-profile-email;device-region-code 的 key 组合。 |

### 规则任务管理页

#### 抽样执行

##### 【P0】验证抽样场景下json value校验在json字段和string字段均执行通过

> 前置条件
```
1、在【通用配置 → json格式配置】页面新增以下 key 与 value格式：order → orderNo(^ORD-[0-9]{8}$)、user → profile → mobile(^1[3-9]\d{9}$)、device → region → code(^[A-Z]{2}$)。
2、在 doris3.x 数据源执行 SQL：
DROP TABLE IF EXISTS qa_quality.json_value_sample_valid;
CREATE TABLE qa_quality.json_value_sample_valid (
  id BIGINT,
  payload_json JSON,
  payload_text STRING,
  sample_batch STRING
)
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES('replication_num'='1');
INSERT INTO qa_quality.json_value_sample_valid VALUES
(101,'{"order":{"orderNo":"ORD-20260421"},"user":{"profile":{"mobile":"13800000001"}},"device":{"region":{"code":"BJ"}}}','{"order":{"orderNo":"ORD-20260421"},"user":{"profile":{"mobile":"13800000001"}},"device":{"region":{"code":"BJ"}}}','S1'),
(102,'{"order":{"orderNo":"ORD-20260422"},"user":{"profile":{"mobile":"13800000002"}},"device":{"region":{"code":"SH"}}}','{"order":{"orderNo":"ORD-20260422"},"user":{"profile":{"mobile":"13800000002"}},"device":{"region":{"code":"SH"}}}','S1'),
(103,'{"order":{"orderNo":"ORD-20260423"},"user":{"profile":{"mobile":"13800000003"}},"device":{"region":{"code":"GZ"}}}','{"order":{"orderNo":"ORD-20260423"},"user":{"profile":{"mobile":"13800000003"}},"device":{"region":{"code":"GZ"}}}','S2'),
(104,'{"order":{"orderNo":"ORD-20260424"},"user":{"profile":{"mobile":"13800000004"}},"device":{"region":{"code":"SZ"}}}','{"order":{"orderNo":"ORD-20260424"},"user":{"profile":{"mobile":"13800000004"}},"device":{"region":{"code":"SZ"}}}','S2'),
(105,'{"order":{"orderNo":"ORD-20260425"},"user":{"profile":{"mobile":"13800000005"}},"device":{"region":{"code":"CD"}}}','{"order":{"orderNo":"ORD-20260425"},"user":{"profile":{"mobile":"13800000005"}},"device":{"region":{"code":"CD"}}}','S3');
3、确认抽样配置对 payload_json(JSON) 与 payload_text(STRING) 两个字段都可生效。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 单表校验规则】页面 | 单表校验规则向导正常加载，可进入监控对象配置步骤。 |
| 2 | 在【监控对象】步骤按以下内容配置：<br>- 规则名称: json_value_sample_pass_01<br>- 数据源: doris3.x_qa<br>- 数据库: qa_quality<br>- 数据表: json_value_sample_valid<br>- 抽样方式: 按比例抽样<br>- 抽样比例: 50%<br>然后点击【下一步】 | 监控对象配置保存成功，页面进入【规则包绑定】步骤，任务摘要中展示抽样比例 50%。 |
| 3 | 在【规则包绑定】步骤绑定已在【规则集管理】中创建的规则包，并确认包内包含以下规则：<br>- 规则1 字段: payload_json(JSON)；统计规则: 格式-json格式校验；校验key: order-orderNo、user-profile-mobile、device-region-code<br>- 规则2 字段: payload_text(STRING)；统计规则: 格式-json格式校验；校验key: order-orderNo、user-profile-mobile、device-region-code<br>然后点击【保存】并完成任务创建 | 规则包绑定成功，任务详情中可回显 json 字段与 string 字段的 json value 校验配置。 |
| 4 | 点击任务 json_value_sample_pass_01 的【立即执行】并打开最新实例 | 最新实例状态显示校验通过，抽样场景下 payload_json(JSON) 与 payload_text(STRING) 两条规则都执行成功。 |

#### 分区执行

##### 【P0】验证分区场景下json value校验仅扫描指定分区并返回校验结果

> 前置条件
```
1、在【通用配置 → json格式配置】页面新增以下 key 与 value格式：order → orderNo(^ORD-[0-9]{8}$)、user → profile → mobile(^1[3-9]\d{9}$)、device → region → code(^[A-Z]{2}$)。
2、在 doris3.x 数据源执行 SQL：
DROP TABLE IF EXISTS qa_quality.json_value_partitioned;
CREATE TABLE qa_quality.json_value_partitioned (
  id BIGINT,
  dt DATE,
  payload_json JSON,
  payload_text STRING
)
DUPLICATE KEY(id)
PARTITION BY RANGE(dt) (
  PARTITION p20260401 VALUES [('2026-04-01'), ('2026-04-02')),
  PARTITION p20260402 VALUES [('2026-04-02'), ('2026-04-03'))
)
DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES('replication_num'='1');
INSERT INTO qa_quality.json_value_partitioned VALUES
(201,'2026-04-01','{"order":{"orderNo":"BAD-20260401"},"user":{"profile":{"mobile":"12345678901"}},"device":{"region":{"code":"be"}}}','{"order":{"orderNo":"BAD-20260401"},"user":{"profile":{"mobile":"12345678901"}},"device":{"region":{"code":"be"}}}'),
(202,'2026-04-01','{"order":{"orderNo":"BAD-20260402"},"user":{"profile":{"mobile":"11111111111"}},"device":{"region":{"code":"gz"}}}','{"order":{"orderNo":"BAD-20260402"},"user":{"profile":{"mobile":"11111111111"}},"device":{"region":{"code":"gz"}}}'),
(203,'2026-04-02','{"order":{"orderNo":"ORD-20260426"},"user":{"profile":{"mobile":"13800000006"}},"device":{"region":{"code":"BJ"}}}','{"order":{"orderNo":"ORD-20260426"},"user":{"profile":{"mobile":"13800000006"}},"device":{"region":{"code":"BJ"}}}'),
(204,'2026-04-02','{"order":{"orderNo":"ORD-20260427"},"user":{"profile":{"mobile":"13800000007"}},"device":{"region":{"code":"SH"}}}','{"order":{"orderNo":"ORD-20260427"},"user":{"profile":{"mobile":"13800000007"}},"device":{"region":{"code":"SH"}}}');
3、确认规则任务支持按分区字段 dt 过滤执行。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 单表校验规则】页面 | 单表校验规则向导正常加载，可进入监控对象配置步骤。 |
| 2 | 在【监控对象】步骤按以下内容配置：<br>- 规则名称: json_value_partition_fail_01<br>- 数据源: doris3.x_qa<br>- 数据库: qa_quality<br>- 数据表: json_value_partitioned<br>- 分区字段: dt<br>- 分区值: 2026-04-01<br>然后点击【下一步】 | 监控对象配置保存成功，任务摘要中回显仅扫描 dt=2026-04-01 分区。 |
| 3 | 在【规则包绑定】步骤绑定已在【规则集管理】中创建的规则包，并确认包内包含以下规则：<br>- 规则1 字段: payload_json(JSON)；统计规则: 格式-json格式校验；校验key: order-orderNo、user-profile-mobile、device-region-code<br>- 规则2 字段: payload_text(STRING)；统计规则: 格式-json格式校验；校验key: order-orderNo、user-profile-mobile、device-region-code<br>然后点击【保存】并完成任务创建 | 规则包绑定成功，任务详情中保留分区配置与已选 key。 |
| 4 | 点击任务 json_value_partition_fail_01 的【立即执行】并打开最新实例 | 最新实例正常完成且结果显示校验不通过，统计结果仅基于 dt=2026-04-01 分区数据计算，不会串扫 dt=2026-04-02 分区。 |

#### 支持数据源

##### 【P1】验证hive2.x和sparkthrift2.x数据源可执行格式-json格式校验

> 前置条件
```
1、在【通用配置 → json格式配置】页面已配置以下 key 与 value格式：order → orderNo(^ORD-[0-9]{8}$)、user → profile → mobile(^1[3-9]\d{9}$)、device → region → code(^[A-Z]{2}$)。
2、在 hive2.x_qa 执行 SQL：
CREATE DATABASE IF NOT EXISTS qa_quality_hive;
DROP TABLE IF EXISTS qa_quality_hive.json_value_multi_engine;
CREATE TABLE qa_quality_hive.json_value_multi_engine (
  id BIGINT,
  payload_text STRING
) STORED AS ORC;
INSERT INTO qa_quality_hive.json_value_multi_engine VALUES
(1,'{"order":{"orderNo":"ORD-20260531"},"user":{"profile":{"mobile":"13800000531"}},"device":{"region":{"code":"BJ"}}}'),
(2,'{"order":{"orderNo":"ORD-20260532"},"user":{"profile":{"mobile":"13800000532"}},"device":{"region":{"code":"SH"}}}');
3、在 sparkthrift2.x_qa 执行 SQL：
CREATE DATABASE IF NOT EXISTS qa_quality_spark;
DROP TABLE IF EXISTS qa_quality_spark.json_value_multi_engine;
CREATE TABLE qa_quality_spark.json_value_multi_engine (
  id BIGINT,
  payload_text STRING
) USING PARQUET;
INSERT INTO qa_quality_spark.json_value_multi_engine VALUES
(1,'{"order":{"orderNo":"ORD-20260541"},"user":{"profile":{"mobile":"13800000541"}},"device":{"region":{"code":"GZ"}}}'),
(2,'{"order":{"orderNo":"ORD-20260542"},"user":{"profile":{"mobile":"13800000542"}},"device":{"region":{"code":"SZ"}}}');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 单表校验规则】页面 | 单表校验规则向导正常加载，可进入监控对象配置步骤。 |
| 2 | 在【监控对象】步骤按以下内容配置 hive 任务：<br>- 规则名称: json_value_hive_pass_01<br>- 数据源: hive2.x_qa<br>- 数据库: qa_quality_hive<br>- 数据表: json_value_multi_engine<br>然后点击【下一步】 | 进入【规则包绑定】步骤，可选择已在【规则集管理】中创建、覆盖 payload_text(STRING) 场景的规则包。 |
| 3 | 在 hive 任务的【规则包绑定】步骤绑定规则包“json_value_hive_pkg_01”，保存任务后点击【立即执行】并打开最新实例 | hive2.x 任务保存成功并执行完成，最新实例状态显示校验通过。 |
| 4 | 返回【单表校验规则】列表，新建 spark 任务并在【监控对象】步骤按以下内容配置：<br>- 规则名称: json_value_spark_pass_01<br>- 数据源: sparkthrift2.x_qa<br>- 数据库: qa_quality_spark<br>- 数据表: json_value_multi_engine<br>然后进入【规则包绑定】步骤，绑定规则包“json_value_spark_pkg_01”并保存任务 | sparkthrift2.x 任务保存成功，规则包绑定页与 hive2.x 场景一致展示 json value 校验能力。 |
| 5 | 点击任务 json_value_spark_pass_01 的【立即执行】并打开最新实例 | sparkthrift2.x 任务执行完成，最新实例状态显示校验通过，满足 hive2.x 与 sparkthrift2.x 两类数据源支持要求。 |

#### 删除key兼容

##### 【P0】验证15696删除已配置key后历史json value规则仍正常回显且任务可继续运行

> 前置条件
```
1、在【通用配置 → json格式配置】页面已配置以下 key 与 value格式：order → orderNo(^ORD-[0-9]{8}$)、user → profile → mobile(^1[3-9]\d{9}$)、device → region → code(^[A-Z]{2}$)。
2、在 doris3.x 数据源执行 SQL：
DROP TABLE IF EXISTS qa_quality.json_value_history_key;
CREATE TABLE qa_quality.json_value_history_key (
  id BIGINT,
  payload_json JSON,
  payload_text STRING
)
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES('replication_num'='1');
INSERT INTO qa_quality.json_value_history_key VALUES
(301,'{"order":{"orderNo":"ORD-20260431"},"user":{"profile":{"mobile":"13800000031"}},"device":{"region":{"code":"BJ"}}}','{"order":{"orderNo":"ORD-20260431"},"user":{"profile":{"mobile":"13800000031"}},"device":{"region":{"code":"BJ"}}}'),
(302,'{"order":{"orderNo":"ORD-20260432"},"user":{"profile":{"mobile":"13800000032"}},"device":{"region":{"code":"SH"}}}','{"order":{"orderNo":"ORD-20260432"},"user":{"profile":{"mobile":"13800000032"}},"device":{"region":{"code":"SH"}}}');
3、在【数据质量 → 规则任务管理 → 单表校验规则】已创建并绑定规则包的任务 json_value_history_key_01：
- 字段 payload_json(JSON)、payload_text(STRING) 都配置统计规则“格式-json格式校验”
- 校验 key 勾选 order-orderNo、user-profile-mobile、device-region-code
- 最新实例已执行成功一次。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 单表校验规则】页面 | 规则任务管理页面正常加载，可查看已有任务列表。 |
| 2 | 在任务列表打开 json_value_history_key_01 的详情，确认已选 key 为 order-orderNo、user-profile-mobile、device-region-code；随后进入【通用配置 → json格式配置】页面删除叶子 key mobile | json格式配置页面删除 user → profile → mobile 成功，当前配置列表不再展示该 key。 |
| 3 | 返回任务 json_value_history_key_01 的详情页与编辑页，查看 json value 校验规则回显 | 历史任务详情和编辑页仍回显 user-profile-mobile 及其存量 value 格式 ^1[3-9]\d{9}$，未出现空值、丢失或页面报错。 |
| 4 | 对任务 json_value_history_key_01 点击【立即执行】并查看最新实例 | 任务可正常执行并产出与删除前一致的校验结果；新建规则时校验 key 列表不再提供 user-profile-mobile。 |

#### 脏数据存储

##### 【P1】验证脏数据库变更后json value校验产生的脏数据仍正常存储

> 前置条件
```
1、在【通用配置 → json格式配置】页面已配置以下 key 与 value格式：order → orderNo(^ORD-[0-9]{8}$)、user → profile → mobile(^1[3-9]\d{9}$)、device → region → code(^[A-Z]{2}$)。
2、在 doris3.x 数据源执行 SQL：
CREATE DATABASE IF NOT EXISTS qa_dirty_a;
CREATE DATABASE IF NOT EXISTS qa_dirty_b;
DROP TABLE IF EXISTS qa_quality.json_value_dirty_fail;
CREATE TABLE qa_quality.json_value_dirty_fail (
  id BIGINT,
  payload_json JSON,
  payload_text STRING
)
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES('replication_num'='1');
INSERT INTO qa_quality.json_value_dirty_fail VALUES
(701,'{"order":{"orderNo":"BAD-20260521"},"user":{"profile":{"mobile":"12345678901"}},"device":{"region":{"code":"be"}}}','{"order":{"orderNo":"BAD-20260521"},"user":{"profile":{"mobile":"12345678901"}},"device":{"region":{"code":"be"}}}'),
(702,'{"order":{"orderNo":"BAD-20260522"},"user":{"profile":{"mobile":"11111111111"}},"device":{"region":{"code":"sz"}}}','{"order":{"orderNo":"BAD-20260522"},"user":{"profile":{"mobile":"11111111111"}},"device":{"region":{"code":"sz"}}}');
3、在【平台管理 → 数据源管理】中已为 doris3.x_qa 开启脏数据存储，初始脏数据存储库设置为 qa_dirty_a。
4、在【数据质量 → 规则任务管理 → 单表校验规则】已创建并绑定规则包的任务 json_value_dirty_fail_01，规则包内为 payload_json(JSON)、payload_text(STRING) 两条“格式-json格式校验”规则，校验 key 勾选 order-orderNo、user-profile-mobile、device-region-code。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 单表校验规则】页面 | 规则任务管理页面正常加载，可查看任务 json_value_dirty_fail_01。 |
| 2 | 进入【平台管理 → 数据源管理】页面，将 doris3.x_qa 的脏数据存储库从 qa_dirty_a 修改为 qa_dirty_b 后返回任务 json_value_dirty_fail_01 点击【立即执行】 | 数据源保存成功，任务执行完成并返回校验不通过。 |
| 3 | 根据最新实例详情中展示的脏数据表名，连接 doris3.x_qa 分别查询 qa_dirty_b 和 qa_dirty_a 库中的对应表 | 最新执行产生的脏数据写入 qa_dirty_b 中的目标表，qa_dirty_a 中不新增本次执行记录。 |
| 4 | 进入【数据质量 → 结果查询】页面，打开 json_value_dirty_fail_01 最新实例的【查看明细】 | 结果查询中的明细可正常查看，明细数据与 qa_dirty_b 中的脏数据记录一致。 |

### 结果查询页

#### 通过结果

##### 【P0】验证json value校验通过结果不记录明细并展示正确质量报告文案

> 前置条件
```
1、在【通用配置 → json格式配置】页面已配置以下 key 与 value格式：order → orderNo(^ORD-[0-9]{8}$)、user → profile → mobile(^1[3-9]\d{9}$)、device → region → code(^[A-Z]{2}$)。
2、在 doris3.x 数据源执行 SQL：
DROP TABLE IF EXISTS qa_quality.json_value_result_pass;
CREATE TABLE qa_quality.json_value_result_pass (
  id BIGINT,
  payload_json JSON,
  payload_text STRING
)
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES('replication_num'='1');
INSERT INTO qa_quality.json_value_result_pass VALUES
(401,'{"order":{"orderNo":"ORD-20260501"},"user":{"profile":{"mobile":"13800000101"}},"device":{"region":{"code":"BJ"}}}','{"order":{"orderNo":"ORD-20260501"},"user":{"profile":{"mobile":"13800000101"}},"device":{"region":{"code":"BJ"}}}'),
(402,'{"order":{"orderNo":"ORD-20260502"},"user":{"profile":{"mobile":"13800000102"}},"device":{"region":{"code":"SH"}}}','{"order":{"orderNo":"ORD-20260502"},"user":{"profile":{"mobile":"13800000102"}},"device":{"region":{"code":"SH"}}}');
3、在【数据质量 → 规则任务管理 → 单表校验规则】已创建并执行任务 json_value_result_pass_01：
- 字段 payload_json(JSON)、payload_text(STRING) 都配置统计规则“格式-json格式校验”
- 校验 key 勾选 order-orderNo、user-profile-mobile、device-region-code
- 最新实例状态为“校验通过”。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 结果查询】页面 | 结果查询页面正常加载，可按任务名称检索实例。 |
| 2 | 搜索任务 json_value_result_pass_01，打开最新实例详情 | 最新实例状态显示校验通过，页面不记录明细数据，【查看明细】入口不展示或不可点击。 |
| 3 | 点击【质量报告】查看报告内容 | 质量报告中展示文案：符合规则key为“order-orderNo;user-profile-mobile;device-region-code”时的value格式要求，且无失败原因、无失败详情区域。 |

#### 不通过详情下载

##### 【P0】验证json value校验不通过结果支持查看详情和下载明细标红

> 前置条件
```
1、在【通用配置 → json格式配置】页面已配置以下 key 与 value格式：order → orderNo(^ORD-[0-9]{8}$)、user → profile → mobile(^1[3-9]\d{9}$)、device → region → code(^[A-Z]{2}$)。
2、在 doris3.x 数据源执行 SQL：
DROP TABLE IF EXISTS qa_quality.json_value_result_fail;
CREATE TABLE qa_quality.json_value_result_fail (
  id BIGINT,
  payload_json JSON,
  payload_text STRING
)
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES('replication_num'='1');
INSERT INTO qa_quality.json_value_result_fail VALUES
(501,'{"order":{"orderNo":"BAD-20260501"},"user":{"profile":{"mobile":"12345678901"}},"device":{"region":{"code":"be"}}}','{"order":{"orderNo":"BAD-20260501"},"user":{"profile":{"mobile":"12345678901"}},"device":{"region":{"code":"be"}}}'),
(502,'{"order":{"orderNo":"BAD-20260502"},"user":{"profile":{"mobile":"11111111111"}},"device":{"region":{"code":"sz"}}}','{"order":{"orderNo":"BAD-20260502"},"user":{"profile":{"mobile":"11111111111"}},"device":{"region":{"code":"sz"}}}');
3、在【数据质量 → 规则任务管理 → 单表校验规则】已创建并执行任务 json_value_result_fail_01：
- 字段 payload_json(JSON)、payload_text(STRING) 都配置统计规则“格式-json格式校验”
- 校验 key 勾选 order-orderNo、user-profile-mobile、device-region-code
- 最新实例状态为“校验不通过”。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 结果查询】页面 | 结果查询页面正常加载，可按任务名称检索实例。 |
| 2 | 搜索任务 json_value_result_fail_01，打开最新实例详情 | 最新实例状态显示校验不通过，并可查看明细。 |
| 3 | 点击【查看明细】并下载明细文件 | 明细弹窗标题显示为 查看“有效性校验-格式-json格式校验”明细，明细保留全部源字段且校验字段 payload_json、payload_text 标红；下载文件中的对应校验字段同样标红。 |
| 4 | 点击【质量报告】查看报告内容 | 质量报告中失败原因显示为 key对应value格式校验未通过，失败详情显示为 不符合规则key为“order-orderNo;user-profile-mobile;device-region-code”时的value格式要求。 |

#### 执行失败日志

##### 【P1】验证json value校验执行失败时结果查询支持查看日志

> 前置条件
```
1、在【通用配置 → json格式配置】页面已配置以下 key 与 value格式：order → orderNo(^ORD-[0-9]{8}$)、user → profile → mobile(^1[3-9]\d{9}$)、device → region → code(^[A-Z]{2}$)。
2、在 doris3.x 数据源执行 SQL 创建任务来源表：
DROP TABLE IF EXISTS qa_quality.json_value_exec_fail;
CREATE TABLE qa_quality.json_value_exec_fail (
  id BIGINT,
  payload_json JSON,
  payload_text STRING
)
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES('replication_num'='1');
INSERT INTO qa_quality.json_value_exec_fail VALUES
(601,'{"order":{"orderNo":"ORD-20260511"},"user":{"profile":{"mobile":"13800000111"}},"device":{"region":{"code":"BJ"}}}','{"order":{"orderNo":"ORD-20260511"},"user":{"profile":{"mobile":"13800000111"}},"device":{"region":{"code":"BJ"}}}');
3、在【数据质量 → 规则任务管理 → 单表校验规则】已创建并绑定规则包的任务 json_value_exec_fail_01，规则包内为 payload_json(JSON)、payload_text(STRING) 两条“格式-json格式校验”规则，校验 key 勾选 order-orderNo、user-profile-mobile、device-region-code。
4、执行 DROP TABLE qa_quality.json_value_exec_fail; 后重新触发任务，确保最新实例状态为“校验失败”。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 结果查询】页面 | 结果查询页面正常加载，可按任务名称检索实例。 |
| 2 | 搜索任务 json_value_exec_fail_01，打开最新实例 | 最新实例状态显示校验失败，实例行展示可点击的【查看日志】入口。 |
| 3 | 点击【查看日志】 | 日志弹窗正常打开，记录本次 json value 校验执行异常信息，包含任务 json_value_exec_fail_01、来源表 qa_quality.json_value_exec_fail 不存在或读取失败的报错信息。 |
