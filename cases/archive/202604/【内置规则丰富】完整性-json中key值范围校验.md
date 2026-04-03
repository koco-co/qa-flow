---
suite_name: 【内置规则丰富】完整性-json中key值范围校验
description: 【内置规则丰富】完整性-json中key值范围校验
prd_id: 15693
prd_version: v6.4.10
prd_path: cases/prds/202604/【内置规则丰富】完整性-json中key值范围校验.md
product: data-assets
dev_version: ""
tags:
  - 内置规则丰富
  - 完整性
  - json中key值范围校验
  - data-assets
  - 规则任务管理
create_at: 2026-04-03
update_at: 2026-04-03
status: 已归档
health_warnings: []
repos: []
case_count: 13
case_types:
  normal: 10
  abnormal: 2
  boundary: 1
origin: json
---

## 规则任务管理

### 新建监控规则

#### 规则配置

##### 【P0】验证包含模式下多层级key范围校验规则保存成功

> 前置条件
```
1、已在【数据质量 → 通用配置 → json格式校验管理】维护以下 key 配置：
- key: orderInfo-user-id / 中文名称: 用户ID / 数据源类型: doris3.x
- key: orderInfo-user-profile / 中文名称: 用户画像 / 数据源类型: doris3.x
- key: orderInfo-user-profile-city / 中文名称: 用户城市 / 数据源类型: doris3.x
- key: eventDetail-headers-traceId / 中文名称: 链路ID / 数据源类型: hive2.x
- key: eventDetail-status / 中文名称: 事件状态 / 数据源类型: hive2.x
2、已在 Doris3.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_doris.t_json_key_rule;
CREATE TABLE qa_15693_doris.t_json_key_rule (
  id INT,
  payload_json JSON,
  payload_text STRING,
  event_id INT,
  dt DATE
)
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_15693_doris.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', 1001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 1002, '2026-04-02');
3、已在 Hive2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_hive.t_json_key_rule;
CREATE TABLE qa_15693_hive.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
);
INSERT INTO qa_15693_hive.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U2001","profile":{"city":"北京"}}},"eventDetail":{"headers":{"traceId":"TRACE-101"},"status":"SUCCESS"}}', 2001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U2002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 2002, '2026-04-02');
4、已在 SparkThrift2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_spark.t_json_key_rule;
CREATE TABLE qa_15693_spark.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
)
USING parquet;
INSERT INTO qa_15693_spark.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U3001","profile":{"city":"苏州"}}},"eventDetail":{"headers":{"traceId":"TRACE-201"},"status":"SUCCESS"}}', 3001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U3002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 3002, '2026-04-02');
5、已通过【数据质量 → 规则集管理 → 新增规则集】创建规则集【15693_key范围校验_自动化】。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理 → 新增规则集】页面 | 成功进入规则集创建页面，页面展示规则集名称、规则集编码、规则类型、状态和说明等表单项。 |
| 2 | 在【新增规则集】表单按顺序配置如下：<br>- 规则集名称: 15693_key范围校验_自动化<br>- 规则集编码: 15693_key_range_auto<br>- 规则类型: 完整性校验<br>- 状态: 启用<br>- 说明: 15693 回归验证<br>点击【保存】按钮 | 页面提示“保存成功”，规则集列表新增名称为【15693_key范围校验_自动化】、编码为【15693_key_range_auto】的启用记录。 |
| 3 | 进入【数据质量 → 规则任务管理】页面 | 成功进入规则任务管理页面，页面展示【新建监控规则】按钮和规则任务列表。 |
| 4 | 点击【新建监控规则】按钮 | 进入【新建监控规则】页面，页面展示数据源、数据库、数据表、字段、规则类型和规则配置区域。 |
| 5 | 在【新建监控规则】表单按顺序配置如下：<br>- 数据源: Doris3.x<br>- 数据库: qa_15693_doris<br>- 数据表: t_json_key_rule<br>- 字段: payload_json<br>- 规则类型: 完整性校验<br>- 规则名称: key范围校验<br>- 校验方法: 包含<br>- 校验内容: orderInfo-user-id；orderInfo-user-profile；eventDetail-headers-traceId<br>- 规则描述: 15693_key_range_include | 页面按已维护的层级 key 正常回显已选内容，回显结果包含 orderInfo-user-id、orderInfo-user-profile、eventDetail-headers-traceId，字段 payload_json 保持选中。 |
| 6 | 点击【保存】按钮，再点击【下一步】按钮和【完成】按钮 | 页面依次提示“保存成功”“创建成功”，规则任务列表新增名称为【15693_key_range_include】的任务记录。 |

##### 【P0】验证不包含模式下多层级key范围校验规则保存成功

> 前置条件
```
1、已在【数据质量 → 通用配置 → json格式校验管理】维护以下 key 配置：
- key: orderInfo-user-id / 中文名称: 用户ID / 数据源类型: doris3.x
- key: orderInfo-user-profile / 中文名称: 用户画像 / 数据源类型: doris3.x
- key: orderInfo-user-profile-city / 中文名称: 用户城市 / 数据源类型: doris3.x
- key: eventDetail-headers-traceId / 中文名称: 链路ID / 数据源类型: hive2.x
- key: eventDetail-status / 中文名称: 事件状态 / 数据源类型: hive2.x
2、已在 Doris3.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_doris.t_json_key_rule;
CREATE TABLE qa_15693_doris.t_json_key_rule (
  id INT,
  payload_json JSON,
  payload_text STRING,
  event_id INT,
  dt DATE
)
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_15693_doris.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', 1001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 1002, '2026-04-02');
3、已在 Hive2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_hive.t_json_key_rule;
CREATE TABLE qa_15693_hive.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
);
INSERT INTO qa_15693_hive.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U2001","profile":{"city":"北京"}}},"eventDetail":{"headers":{"traceId":"TRACE-101"},"status":"SUCCESS"}}', 2001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U2002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 2002, '2026-04-02');
4、已在 SparkThrift2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_spark.t_json_key_rule;
CREATE TABLE qa_15693_spark.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
)
USING parquet;
INSERT INTO qa_15693_spark.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U3001","profile":{"city":"苏州"}}},"eventDetail":{"headers":{"traceId":"TRACE-201"},"status":"SUCCESS"}}', 3001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U3002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 3002, '2026-04-02');
5、已通过【数据质量 → 规则集管理 → 新增规则集】创建规则集【15693_key范围校验_自动化】。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理 → 新增规则集】页面 | 成功进入规则集创建页面，页面展示规则集基础配置项。 |
| 2 | 在【新增规则集】表单按顺序配置如下：<br>- 规则集名称: 15693_key范围校验_自动化<br>- 规则集编码: 15693_key_range_auto<br>- 规则类型: 完整性校验<br>- 状态: 启用<br>- 说明: 15693 回归验证<br>点击【保存】按钮 | 页面提示“保存成功”，规则集列表出现启用状态的【15693_key范围校验_自动化】记录。 |
| 3 | 进入【数据质量 → 规则任务管理】页面 | 成功进入规则任务管理页面，页面展示【新建监控规则】按钮。 |
| 4 | 点击【新建监控规则】按钮 | 进入【新建监控规则】页面，规则配置区域可编辑。 |
| 5 | 在【新建监控规则】表单按顺序配置如下：<br>- 数据源: Hive2.x<br>- 数据库: qa_15693_hive<br>- 数据表: t_json_key_rule<br>- 字段: payload_text<br>- 规则类型: 完整性校验<br>- 规则名称: key范围校验<br>- 校验方法: 不包含<br>- 校验内容: orderInfo-user-profile-city；eventDetail-headers-traceId<br>- 规则描述: 15693_key_range_exclude | 页面展示“不包含”模式和已选层级 key 回显，校验内容仅引用已维护的 key，字段 payload_text 保持选中状态。 |
| 6 | 点击【保存】按钮，再点击【下一步】按钮和【完成】按钮 | 页面依次提示“保存成功”“创建成功”，规则任务列表新增名称为【15693_key_range_exclude】的任务记录。 |

##### 【P1】验证校验内容支持搜索并全选当前层级key后保存

> 前置条件
```
1、已在【数据质量 → 通用配置 → json格式校验管理】维护以下 key 配置：
- key: orderInfo-user-id / 中文名称: 用户ID / 数据源类型: doris3.x
- key: orderInfo-user-profile / 中文名称: 用户画像 / 数据源类型: doris3.x
- key: orderInfo-user-profile-city / 中文名称: 用户城市 / 数据源类型: doris3.x
- key: eventDetail-headers-traceId / 中文名称: 链路ID / 数据源类型: hive2.x
- key: eventDetail-status / 中文名称: 事件状态 / 数据源类型: hive2.x
2、已在 Doris3.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_doris.t_json_key_rule;
CREATE TABLE qa_15693_doris.t_json_key_rule (
  id INT,
  payload_json JSON,
  payload_text STRING,
  event_id INT,
  dt DATE
)
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_15693_doris.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', 1001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 1002, '2026-04-02');
3、已在 Hive2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_hive.t_json_key_rule;
CREATE TABLE qa_15693_hive.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
);
INSERT INTO qa_15693_hive.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U2001","profile":{"city":"北京"}}},"eventDetail":{"headers":{"traceId":"TRACE-101"},"status":"SUCCESS"}}', 2001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U2002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 2002, '2026-04-02');
4、已在 SparkThrift2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_spark.t_json_key_rule;
CREATE TABLE qa_15693_spark.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
)
USING parquet;
INSERT INTO qa_15693_spark.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U3001","profile":{"city":"苏州"}}},"eventDetail":{"headers":{"traceId":"TRACE-201"},"status":"SUCCESS"}}', 3001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U3002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 3002, '2026-04-02');
5、已通过【数据质量 → 规则集管理 → 新增规则集】创建规则集【15693_key范围校验_自动化】。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理 → 新增规则集】页面 | 成功进入规则集创建页面，可执行规则集创建操作。 |
| 2 | 在【新增规则集】表单按顺序配置如下：<br>- 规则集名称: 15693_key范围校验_自动化<br>- 规则集编码: 15693_key_range_auto<br>- 规则类型: 完整性校验<br>- 状态: 启用<br>点击【保存】按钮 | 页面提示“保存成功”，规则集创建完成。 |
| 3 | 进入【数据质量 → 规则任务管理】页面并点击【新建监控规则】按钮 | 进入【新建监控规则】页面，规则配置区域可编辑。 |
| 4 | 在【新建监控规则】页面选择【规则名称: key范围校验】和【校验方法: 包含】，在【校验内容】搜索框输入【orderInfo-user】，再展开【orderInfo】层级并执行当前层级全选 | 搜索结果仅展示 orderInfo-user 相关 key；执行当前层级全选后，当前层级可见 key 全部进入已选区域，其他根节点和未展开层级的 key 不会被一并勾选。 |
| 5 | 点击【保存】按钮 | 页面提示“保存成功”，已选区域保留本次搜索勾选的当前层级 key，层级回显与已维护的 key 路径一致。 |

##### 【P0】验证千级多层级key导入后可搜索勾选并回显

> 前置条件
```
1、已在【数据质量 → 通用配置 → json格式校验管理】维护以下 key 配置：
- key: orderInfo-user-id / 中文名称: 用户ID / 数据源类型: doris3.x
- key: orderInfo-user-profile / 中文名称: 用户画像 / 数据源类型: doris3.x
- key: orderInfo-user-profile-city / 中文名称: 用户城市 / 数据源类型: doris3.x
- key: eventDetail-headers-traceId / 中文名称: 链路ID / 数据源类型: hive2.x
- key: eventDetail-status / 中文名称: 事件状态 / 数据源类型: hive2.x
2、已在 Doris3.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_doris.t_json_key_rule;
CREATE TABLE qa_15693_doris.t_json_key_rule (
  id INT,
  payload_json JSON,
  payload_text STRING,
  event_id INT,
  dt DATE
)
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_15693_doris.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', 1001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 1002, '2026-04-02');
3、已在 Hive2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_hive.t_json_key_rule;
CREATE TABLE qa_15693_hive.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
);
INSERT INTO qa_15693_hive.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U2001","profile":{"city":"北京"}}},"eventDetail":{"headers":{"traceId":"TRACE-101"},"status":"SUCCESS"}}', 2001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U2002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 2002, '2026-04-02');
4、已在 SparkThrift2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_spark.t_json_key_rule;
CREATE TABLE qa_15693_spark.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
)
USING parquet;
INSERT INTO qa_15693_spark.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U3001","profile":{"city":"苏州"}}},"eventDetail":{"headers":{"traceId":"TRACE-201"},"status":"SUCCESS"}}', 3001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U3002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 3002, '2026-04-02');
5、已通过【数据质量 → 规则集管理 → 新增规则集】创建规则集【15693_key范围校验_自动化】。
6、执行以下 Python 脚本生成用于导入【json格式校验管理】的 xlsx 文件，脚本会生成 1201 组、共 4804 条多层级 key 数据：
python3 - <<'__BULK__'
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.sax.saxutils import escape

rows = [('key', '中文名称', '数据源类型')]
for i in range(1201):
    root = f'batch{i:04d}'
    rows.extend([
        (root, f'批量根节点{i:04d}', 'doris3.x'),
        (f'{root}-level1', f'一级节点{i:04d}', 'doris3.x'),
        (f'{root}-level1-level2', f'二级节点{i:04d}', 'doris3.x'),
        (f'{root}-level1-level2-leaf', f'叶子节点{i:04d}', 'doris3.x'),
    ])

def col_name(index: int) -> str:
    result = ''
    while index:
        index, rem = divmod(index - 1, 26)
        result = chr(65 + rem) + result
    return result

sheet_rows = []
for r, row in enumerate(rows, 1):
    cells = []
    for c, value in enumerate(row, 1):
        cell_ref = f'{col_name(c)}{r}'
        cells.append(f'<c r="{cell_ref}" t="inlineStr"><is><t>{escape(str(value))}</t></is></c>')
    sheet_rows.append(f'<row r="{r}">{"".join(cells)}</row>')

sheet_xml = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    '<sheetData>' + ''.join(sheet_rows) + '</sheetData></worksheet>'
)
workbook_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="json_keys" sheetId="1" r:id="rId1"/></sheets></workbook>'
rels_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
root_rels_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
content_types_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'
styles_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>'

target = Path('cases/prds/202604/temp/15693-json-key-bulk.xlsx')
with ZipFile(target, 'w', ZIP_DEFLATED) as zf:
    zf.writestr('[Content_Types].xml', content_types_xml)
    zf.writestr('_rels/.rels', root_rels_xml)
    zf.writestr('xl/workbook.xml', workbook_xml)
    zf.writestr('xl/_rels/workbook.xml.rels', rels_xml)
    zf.writestr('xl/worksheets/sheet1.xml', sheet_xml)
    zf.writestr('xl/styles.xml', styles_xml)
print(target)
__BULK__
执行完成后，在【数据质量 → 通用配置 → json格式校验管理】导入该文件，确认已存在 key【batch1199-level1-level2-leaf】。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理】页面 | 页面正常加载，规则任务列表展示【新建监控规则】按钮。 |
| 2 | 点击【新建监控规则】按钮 | 进入【新建监控规则】页面，规则配置区域可编辑。 |
| 3 | 在【新建监控规则】表单按顺序配置如下：<br>- 数据源: Doris3.x<br>- 数据库: qa_15693_doris<br>- 数据表: t_json_key_rule<br>- 字段: payload_json<br>- 规则类型: 完整性校验<br>- 规则名称: key范围校验<br>- 校验方法: 包含 | 页面正常加载 key 范围校验配置区域，字段 payload_json 保持选中。 |
| 4 | 展开【校验内容】选择器并查看首屏列表，再在搜索框输入【batch1199-level1-level2-leaf】 | 选择器首屏仍仅加载前 200 条 key，首屏列表中不显示 batch1199-level1-level2-leaf；输入关键字后，列表准确返回第 1200 组多层级叶子 key。 |
| 5 | 勾选【batch1199-level1-level2-leaf】并点击【保存】按钮 | 页面提示“保存成功”，已选区域正确回显【batch1199-level1-level2-leaf】，再次打开选择器时该 key 保持选中，可用于后续任务运行。 |

#### 字段类型限制

##### 【P1】验证string字段可配置key范围校验

> 前置条件
```
1、已在【数据质量 → 通用配置 → json格式校验管理】维护以下 key 配置：
- key: orderInfo-user-id / 中文名称: 用户ID / 数据源类型: doris3.x
- key: orderInfo-user-profile / 中文名称: 用户画像 / 数据源类型: doris3.x
- key: orderInfo-user-profile-city / 中文名称: 用户城市 / 数据源类型: doris3.x
- key: eventDetail-headers-traceId / 中文名称: 链路ID / 数据源类型: hive2.x
- key: eventDetail-status / 中文名称: 事件状态 / 数据源类型: hive2.x
2、已在 Doris3.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_doris.t_json_key_rule;
CREATE TABLE qa_15693_doris.t_json_key_rule (
  id INT,
  payload_json JSON,
  payload_text STRING,
  event_id INT,
  dt DATE
)
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_15693_doris.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', 1001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 1002, '2026-04-02');
3、已在 Hive2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_hive.t_json_key_rule;
CREATE TABLE qa_15693_hive.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
);
INSERT INTO qa_15693_hive.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U2001","profile":{"city":"北京"}}},"eventDetail":{"headers":{"traceId":"TRACE-101"},"status":"SUCCESS"}}', 2001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U2002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 2002, '2026-04-02');
4、已在 SparkThrift2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_spark.t_json_key_rule;
CREATE TABLE qa_15693_spark.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
)
USING parquet;
INSERT INTO qa_15693_spark.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U3001","profile":{"city":"苏州"}}},"eventDetail":{"headers":{"traceId":"TRACE-201"},"status":"SUCCESS"}}', 3001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U3002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 3002, '2026-04-02');
5、已通过【数据质量 → 规则集管理 → 新增规则集】创建规则集【15693_key范围校验_自动化】。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理 → 新增规则集】页面 | 成功进入规则集创建页面，可执行规则集创建操作。 |
| 2 | 在【新增规则集】表单输入规则集名称【15693_key范围校验_自动化】、规则集编码【15693_key_range_auto】、规则类型【完整性校验】并点击【保存】按钮 | 页面提示“保存成功”，规则集创建完成。 |
| 3 | 进入【数据质量 → 规则任务管理】页面并点击【新建监控规则】按钮 | 进入【新建监控规则】页面，规则配置区域可编辑。 |
| 4 | 在【新建监控规则】页面选择【数据源: SparkThrift2.x】【数据库: qa_15693_spark】【数据表: t_json_key_rule】【字段: payload_text】【规则名称: key范围校验】并勾选【orderInfo-user-profile-city】【eventDetail-headers-traceId】 | 字段 payload_text 可以正常选中，页面展示 key 范围校验相关配置项和所选 key 的层级回显。 |
| 5 | 点击【保存】按钮 | 页面提示“保存成功”，规则任务草稿保留 payload_text 字段和已勾选 key。 |

##### 【P1】验证非json和string字段不可配置key范围校验

> 前置条件
```
1、已在【数据质量 → 通用配置 → json格式校验管理】维护以下 key 配置：
- key: orderInfo-user-id / 中文名称: 用户ID / 数据源类型: doris3.x
- key: orderInfo-user-profile / 中文名称: 用户画像 / 数据源类型: doris3.x
- key: orderInfo-user-profile-city / 中文名称: 用户城市 / 数据源类型: doris3.x
- key: eventDetail-headers-traceId / 中文名称: 链路ID / 数据源类型: hive2.x
- key: eventDetail-status / 中文名称: 事件状态 / 数据源类型: hive2.x
2、已在 Doris3.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_doris.t_json_key_rule;
CREATE TABLE qa_15693_doris.t_json_key_rule (
  id INT,
  payload_json JSON,
  payload_text STRING,
  event_id INT,
  dt DATE
)
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_15693_doris.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', 1001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 1002, '2026-04-02');
3、已在 Hive2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_hive.t_json_key_rule;
CREATE TABLE qa_15693_hive.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
);
INSERT INTO qa_15693_hive.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U2001","profile":{"city":"北京"}}},"eventDetail":{"headers":{"traceId":"TRACE-101"},"status":"SUCCESS"}}', 2001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U2002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 2002, '2026-04-02');
4、已在 SparkThrift2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_spark.t_json_key_rule;
CREATE TABLE qa_15693_spark.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
)
USING parquet;
INSERT INTO qa_15693_spark.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U3001","profile":{"city":"苏州"}}},"eventDetail":{"headers":{"traceId":"TRACE-201"},"status":"SUCCESS"}}', 3001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U3002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 3002, '2026-04-02');
5、已通过【数据质量 → 规则集管理 → 新增规则集】创建规则集【15693_key范围校验_自动化】。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理 → 新增规则集】页面 | 成功进入规则集创建页面，可执行规则集创建操作。 |
| 2 | 在【新增规则集】表单输入规则集名称【15693_key范围校验_自动化】、规则集编码【15693_key_range_auto】、规则类型【完整性校验】并点击【保存】按钮 | 页面提示“保存成功”，规则集创建完成。 |
| 3 | 进入【数据质量 → 规则任务管理】页面并点击【新建监控规则】按钮 | 进入【新建监控规则】页面，规则配置区域可编辑。 |
| 4 | 在【新建监控规则】页面选择【数据源: Doris3.x】【数据库: qa_15693_doris】【数据表: t_json_key_rule】【字段: event_id】并查看规则配置区域 | 字段 event_id 被选中后，页面不展示【key范围校验】规则入口，校验内容选择器保持禁用状态。 |
| 5 | 点击【保存】按钮 | 页面不允许提交，并提示仅 json、string 类型字段支持 key 范围校验。 |

#### 抽样/分区

##### 【P0】验证抽样场景运行key范围校验结果正确

> 前置条件
```
1、已在【数据质量 → 通用配置 → json格式校验管理】维护以下 key 配置：
- key: orderInfo-user-id / 中文名称: 用户ID / 数据源类型: doris3.x
- key: orderInfo-user-profile / 中文名称: 用户画像 / 数据源类型: doris3.x
- key: orderInfo-user-profile-city / 中文名称: 用户城市 / 数据源类型: doris3.x
- key: eventDetail-headers-traceId / 中文名称: 链路ID / 数据源类型: hive2.x
- key: eventDetail-status / 中文名称: 事件状态 / 数据源类型: hive2.x
2、已在 Doris3.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_doris.t_json_key_rule;
CREATE TABLE qa_15693_doris.t_json_key_rule (
  id INT,
  payload_json JSON,
  payload_text STRING,
  event_id INT,
  dt DATE
)
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_15693_doris.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', 1001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 1002, '2026-04-02');
3、已在 Hive2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_hive.t_json_key_rule;
CREATE TABLE qa_15693_hive.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
);
INSERT INTO qa_15693_hive.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U2001","profile":{"city":"北京"}}},"eventDetail":{"headers":{"traceId":"TRACE-101"},"status":"SUCCESS"}}', 2001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U2002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 2002, '2026-04-02');
4、已在 SparkThrift2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_spark.t_json_key_rule;
CREATE TABLE qa_15693_spark.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
)
USING parquet;
INSERT INTO qa_15693_spark.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U3001","profile":{"city":"苏州"}}},"eventDetail":{"headers":{"traceId":"TRACE-201"},"status":"SUCCESS"}}', 3001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U3002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 3002, '2026-04-02');
5、已通过【数据质量 → 规则集管理 → 新增规则集】创建规则集【15693_key范围校验_自动化】。
6、已在 Doris3.x 集群补充抽样数据：
INSERT INTO qa_15693_doris.t_json_key_rule VALUES
(3, '{"orderInfo":{"user":{"id":"U1003","profile":{"city":"杭州"}}},"eventDetail":{"headers":{"traceId":"TRACE-003"},"status":"SUCCESS"}}', '{"orderInfo":{"user":{"id":"U1003","profile":{"city":"杭州"}}},"eventDetail":{"headers":{"traceId":"TRACE-003"},"status":"SUCCESS"}}', 1003, '2026-04-01'),
(4, '{"orderInfo":{"user":{"id":"U1004"}},"eventDetail":{"headers":{},"status":"FAIL"}}', '{"orderInfo":{"user":{"id":"U1004"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 1004, '2026-04-01');
已确认样本中同时存在通过和失败记录，用于抽样执行校验。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理】页面 | 页面正常加载，可查看已有任务并新建规则。 |
| 2 | 点击【新建监控规则】按钮 | 进入【新建监控规则】页面，页面展示规则配置和任务高级配置区域。 |
| 3 | 在【新建监控规则】表单按顺序配置如下：<br>- 数据源: Doris3.x<br>- 数据库: qa_15693_doris<br>- 数据表: t_json_key_rule<br>- 字段: payload_json<br>- 规则类型: 完整性校验<br>- 规则名称: key范围校验<br>- 校验方法: 包含<br>- 校验内容: orderInfo-user-id；eventDetail-headers-traceId<br>- 抽样: 开启<br>- 抽样比例: 10%<br>- 规则描述: 15693_key_range_sample | 页面允许保存抽样配置，抽样比例与所选 key 一并保留在任务配置中。 |
| 4 | 点击【保存】按钮并触发任务【15693_key_range_sample】执行 | 任务执行成功提交，执行记录标识本次按 10% 抽样运行。 |
| 5 | 进入【数据质量 → 规则任务管理 → 结果查询】页面查看任务【15693_key_range_sample】最近一次结果 | 结果页展示本次抽样执行记录，抽样样本中的缺失 key 数据被识别为失败，未抽中记录不计入本次结果。 |

##### 【P0】验证分区场景运行key范围校验结果正确

> 前置条件
```
1、已在【数据质量 → 通用配置 → json格式校验管理】维护以下 key 配置：
- key: orderInfo-user-id / 中文名称: 用户ID / 数据源类型: doris3.x
- key: orderInfo-user-profile / 中文名称: 用户画像 / 数据源类型: doris3.x
- key: orderInfo-user-profile-city / 中文名称: 用户城市 / 数据源类型: doris3.x
- key: eventDetail-headers-traceId / 中文名称: 链路ID / 数据源类型: hive2.x
- key: eventDetail-status / 中文名称: 事件状态 / 数据源类型: hive2.x
2、已在 Doris3.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_doris.t_json_key_rule;
CREATE TABLE qa_15693_doris.t_json_key_rule (
  id INT,
  payload_json JSON,
  payload_text STRING,
  event_id INT,
  dt DATE
)
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_15693_doris.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', 1001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 1002, '2026-04-02');
3、已在 Hive2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_hive.t_json_key_rule;
CREATE TABLE qa_15693_hive.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
);
INSERT INTO qa_15693_hive.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U2001","profile":{"city":"北京"}}},"eventDetail":{"headers":{"traceId":"TRACE-101"},"status":"SUCCESS"}}', 2001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U2002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 2002, '2026-04-02');
4、已在 SparkThrift2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_spark.t_json_key_rule;
CREATE TABLE qa_15693_spark.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
)
USING parquet;
INSERT INTO qa_15693_spark.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U3001","profile":{"city":"苏州"}}},"eventDetail":{"headers":{"traceId":"TRACE-201"},"status":"SUCCESS"}}', 3001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U3002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 3002, '2026-04-02');
5、已通过【数据质量 → 规则集管理 → 新增规则集】创建规则集【15693_key范围校验_自动化】。
6、已按分区日期准备数据：dt=2026-04-01 的记录均包含【orderInfo-user-id】与【eventDetail-headers-traceId】，dt=2026-04-02 的记录缺少【eventDetail-headers-traceId】；用于验证分区过滤后仅校验指定分区。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理】页面 | 页面正常加载，可查看已有任务并新建规则。 |
| 2 | 点击【新建监控规则】按钮 | 进入【新建监控规则】页面，规则配置区域可编辑。 |
| 3 | 在【新建监控规则】表单按顺序配置如下：<br>- 数据源: Doris3.x<br>- 数据库: qa_15693_doris<br>- 数据表: t_json_key_rule<br>- 字段: payload_json<br>- 规则类型: 完整性校验<br>- 规则名称: key范围校验<br>- 校验方法: 包含<br>- 校验内容: orderInfo-user-id；eventDetail-headers-traceId<br>- 分区字段: dt<br>- 分区值: 2026-04-01<br>- 规则描述: 15693_key_range_partition | 页面允许保存分区配置，任务配置中保留【dt=2026-04-01】筛选条件。 |
| 4 | 点击【保存】按钮并触发任务【15693_key_range_partition】执行 | 任务执行成功提交，系统仅对分区【2026-04-01】数据执行校验。 |
| 5 | 进入【数据质量 → 规则任务管理 → 结果查询】页面查看任务【15693_key_range_partition】最近一次结果 | 结果页仅统计分区【2026-04-01】的数据，分区【2026-04-02】中的缺失 key 记录不会被纳入本次结果。 |

#### 回归场景

##### 【P0】验证删除已关联key配置后历史规则回显与运行正常

> 前置条件
```
1、已在【数据质量 → 通用配置 → json格式校验管理】维护以下 key 配置：
- key: orderInfo-user-id / 中文名称: 用户ID / 数据源类型: doris3.x
- key: orderInfo-user-profile / 中文名称: 用户画像 / 数据源类型: doris3.x
- key: orderInfo-user-profile-city / 中文名称: 用户城市 / 数据源类型: doris3.x
- key: eventDetail-headers-traceId / 中文名称: 链路ID / 数据源类型: hive2.x
- key: eventDetail-status / 中文名称: 事件状态 / 数据源类型: hive2.x
2、已在 Doris3.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_doris.t_json_key_rule;
CREATE TABLE qa_15693_doris.t_json_key_rule (
  id INT,
  payload_json JSON,
  payload_text STRING,
  event_id INT,
  dt DATE
)
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_15693_doris.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', 1001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 1002, '2026-04-02');
3、已在 Hive2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_hive.t_json_key_rule;
CREATE TABLE qa_15693_hive.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
);
INSERT INTO qa_15693_hive.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U2001","profile":{"city":"北京"}}},"eventDetail":{"headers":{"traceId":"TRACE-101"},"status":"SUCCESS"}}', 2001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U2002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 2002, '2026-04-02');
4、已在 SparkThrift2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_spark.t_json_key_rule;
CREATE TABLE qa_15693_spark.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
)
USING parquet;
INSERT INTO qa_15693_spark.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U3001","profile":{"city":"苏州"}}},"eventDetail":{"headers":{"traceId":"TRACE-201"},"status":"SUCCESS"}}', 3001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U3002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 3002, '2026-04-02');
5、已通过【数据质量 → 规则集管理 → 新增规则集】创建规则集【15693_key范围校验_自动化】。
6、已创建质量任务【15693_key_range_history_keep】，其校验内容为【orderInfo-user-profile-city；eventDetail-headers-traceId】并已成功执行一次。
7、随后在【数据质量 → 通用配置 → json格式校验管理】删除 key【orderInfo-user-profile-city】，其余数据表与任务配置保持不变。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理】页面 | 页面正常加载，任务列表可查看已创建的 key 范围校验任务。 |
| 2 | 在任务列表中打开任务【15693_key_range_history_keep】的配置详情 | 页面仍能回显已保存的校验内容【orderInfo-user-profile-city；eventDetail-headers-traceId】，不会因上游 key 已删除而出现空白或报错。 |
| 3 | 在任务列表对【15693_key_range_history_keep】执行一次运行操作 | 系统成功提交执行请求，任务状态更新为运行中或已完成，不提示“key不存在”类错误。 |
| 4 | 进入【数据质量 → 规则任务管理 → 结果查询】页面查看任务【15693_key_range_history_keep】最近一次结果 | 结果页正常展示该任务最近一次执行结果，校验逻辑仍按历史保存的 key 范围运行，任务可查看结果详情与日志。 |

#### 脏数据存储

##### 【P1】验证脏数据存储目标库变更后失败数据落库正常

> 前置条件
```
1、已在【数据质量 → 通用配置 → json格式校验管理】维护以下 key 配置：
- key: orderInfo-user-id / 中文名称: 用户ID / 数据源类型: doris3.x
- key: orderInfo-user-profile / 中文名称: 用户画像 / 数据源类型: doris3.x
- key: orderInfo-user-profile-city / 中文名称: 用户城市 / 数据源类型: doris3.x
- key: eventDetail-headers-traceId / 中文名称: 链路ID / 数据源类型: hive2.x
- key: eventDetail-status / 中文名称: 事件状态 / 数据源类型: hive2.x
2、已在 Doris3.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_doris.t_json_key_rule;
CREATE TABLE qa_15693_doris.t_json_key_rule (
  id INT,
  payload_json JSON,
  payload_text STRING,
  event_id INT,
  dt DATE
)
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_15693_doris.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', 1001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 1002, '2026-04-02');
3、已在 Hive2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_hive.t_json_key_rule;
CREATE TABLE qa_15693_hive.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
);
INSERT INTO qa_15693_hive.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U2001","profile":{"city":"北京"}}},"eventDetail":{"headers":{"traceId":"TRACE-101"},"status":"SUCCESS"}}', 2001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U2002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 2002, '2026-04-02');
4、已在 SparkThrift2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_spark.t_json_key_rule;
CREATE TABLE qa_15693_spark.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
)
USING parquet;
INSERT INTO qa_15693_spark.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U3001","profile":{"city":"苏州"}}},"eventDetail":{"headers":{"traceId":"TRACE-201"},"status":"SUCCESS"}}', 3001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U3002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 3002, '2026-04-02');
5、已通过【数据质量 → 规则集管理 → 新增规则集】创建规则集【15693_key范围校验_自动化】。
6、已创建失败场景任务【15693_key_range_dirty_store】，校验方法为【包含】，校验内容为【eventDetail-headers-traceId】；任务失败时会写入脏数据。
7、已在 Doris3.x 集群执行以下 SQL，分别创建旧目标库与新目标库：
DROP TABLE IF EXISTS qa_15693_dirty_v1.t_json_key_rule_dirty;
DROP TABLE IF EXISTS qa_15693_dirty_v2.t_json_key_rule_dirty;
CREATE TABLE qa_15693_dirty_v1.t_json_key_rule_dirty (
  rule_name STRING,
  event_id INT,
  payload_text STRING
)
DUPLICATE KEY(rule_name, event_id)
DISTRIBUTED BY HASH(event_id) BUCKETS 2;
CREATE TABLE qa_15693_dirty_v2.t_json_key_rule_dirty (
  rule_name STRING,
  event_id INT,
  payload_text STRING
)
DUPLICATE KEY(rule_name, event_id)
DISTRIBUTED BY HASH(event_id) BUCKETS 2;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理】页面 | 页面正常加载，任务列表展示任务【15693_key_range_dirty_store】。 |
| 2 | 在任务列表中打开任务【15693_key_range_dirty_store】的配置详情，并将脏数据存储目标库由【qa_15693_dirty_v1】改为【qa_15693_dirty_v2】后保存 | 页面提示“保存成功”，任务配置中脏数据存储目标库更新为【qa_15693_dirty_v2】。 |
| 3 | 在任务列表对【15693_key_range_dirty_store】执行一次运行操作 | 系统成功提交执行请求，任务按失败场景运行，结果状态显示为失败。 |
| 4 | 在 Doris3.x 集群执行 SQL：<br>SELECT rule_name, event_id FROM qa_15693_dirty_v2.t_json_key_rule_dirty WHERE rule_name = "15693_key_range_dirty_store" ORDER BY event_id; | 查询结果返回本次失败记录，失败数据写入新目标库【qa_15693_dirty_v2】；旧目标库【qa_15693_dirty_v1】不新增本次记录。 |

### 结果查询

#### 结果明细

##### 【P0】验证key范围校验失败时可查看详情与日志

> 前置条件
```
1、已在【数据质量 → 通用配置 → json格式校验管理】维护以下 key 配置：
- key: orderInfo-user-id / 中文名称: 用户ID / 数据源类型: doris3.x
- key: orderInfo-user-profile / 中文名称: 用户画像 / 数据源类型: doris3.x
- key: orderInfo-user-profile-city / 中文名称: 用户城市 / 数据源类型: doris3.x
- key: eventDetail-headers-traceId / 中文名称: 链路ID / 数据源类型: hive2.x
- key: eventDetail-status / 中文名称: 事件状态 / 数据源类型: hive2.x
2、已在 Doris3.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_doris.t_json_key_rule;
CREATE TABLE qa_15693_doris.t_json_key_rule (
  id INT,
  payload_json JSON,
  payload_text STRING,
  event_id INT,
  dt DATE
)
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_15693_doris.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', 1001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 1002, '2026-04-02');
3、已在 Hive2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_hive.t_json_key_rule;
CREATE TABLE qa_15693_hive.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
);
INSERT INTO qa_15693_hive.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U2001","profile":{"city":"北京"}}},"eventDetail":{"headers":{"traceId":"TRACE-101"},"status":"SUCCESS"}}', 2001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U2002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 2002, '2026-04-02');
4、已在 SparkThrift2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_spark.t_json_key_rule;
CREATE TABLE qa_15693_spark.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
)
USING parquet;
INSERT INTO qa_15693_spark.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U3001","profile":{"city":"苏州"}}},"eventDetail":{"headers":{"traceId":"TRACE-201"},"status":"SUCCESS"}}', 3001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U3002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 3002, '2026-04-02');
5、已通过【数据质量 → 规则集管理 → 新增规则集】创建规则集【15693_key范围校验_自动化】。
6、已通过【数据质量 → 规则任务管理】创建失败任务【15693_key_range_include_fail】，最近一次执行结果为失败。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 结果查询】页面 | 页面正常加载，结果列表可展示最近执行的规则任务记录。 |
| 2 | 在结果列表中检索【15693_key_range_include_fail】并点击【查看详情】 | 列表定位到该失败记录，点击后打开失败详情区域。 |
| 3 | 查看失败详情中的未通过原因、失败明细和日志入口 | 页面展示“key 范围校验未通过”文案，失败明细保留完整字段信息，校验字段标红，且日志入口可点击查看执行日志。 |

##### 【P1】验证key范围校验通过时不记录明细

> 前置条件
```
1、已在【数据质量 → 通用配置 → json格式校验管理】维护以下 key 配置：
- key: orderInfo-user-id / 中文名称: 用户ID / 数据源类型: doris3.x
- key: orderInfo-user-profile / 中文名称: 用户画像 / 数据源类型: doris3.x
- key: orderInfo-user-profile-city / 中文名称: 用户城市 / 数据源类型: doris3.x
- key: eventDetail-headers-traceId / 中文名称: 链路ID / 数据源类型: hive2.x
- key: eventDetail-status / 中文名称: 事件状态 / 数据源类型: hive2.x
2、已在 Doris3.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_doris.t_json_key_rule;
CREATE TABLE qa_15693_doris.t_json_key_rule (
  id INT,
  payload_json JSON,
  payload_text STRING,
  event_id INT,
  dt DATE
)
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_15693_doris.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', 1001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 1002, '2026-04-02');
3、已在 Hive2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_hive.t_json_key_rule;
CREATE TABLE qa_15693_hive.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
);
INSERT INTO qa_15693_hive.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U2001","profile":{"city":"北京"}}},"eventDetail":{"headers":{"traceId":"TRACE-101"},"status":"SUCCESS"}}', 2001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U2002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 2002, '2026-04-02');
4、已在 SparkThrift2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_spark.t_json_key_rule;
CREATE TABLE qa_15693_spark.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
)
USING parquet;
INSERT INTO qa_15693_spark.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U3001","profile":{"city":"苏州"}}},"eventDetail":{"headers":{"traceId":"TRACE-201"},"status":"SUCCESS"}}', 3001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U3002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 3002, '2026-04-02');
5、已通过【数据质量 → 规则集管理 → 新增规则集】创建规则集【15693_key范围校验_自动化】。
6、已通过【数据质量 → 规则任务管理】创建通过任务【15693_key_range_exclude_pass】，最近一次执行结果为通过。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 结果查询】页面 | 页面正常加载，结果列表可展示最近执行的规则任务记录。 |
| 2 | 在结果列表中检索【15693_key_range_exclude_pass】并查看执行结果 | 列表定位到该通过记录，质检结果显示为通过。 |
| 3 | 打开该记录的详情区域 | 页面不生成失败明细，也不展示失败明细下载入口，仅展示通过结果摘要。 |

### 质量报告

#### 报表展示

##### 【P1】验证质量报告展示key范围校验通过与失败文案

> 前置条件
```
1、已在【数据质量 → 通用配置 → json格式校验管理】维护以下 key 配置：
- key: orderInfo-user-id / 中文名称: 用户ID / 数据源类型: doris3.x
- key: orderInfo-user-profile / 中文名称: 用户画像 / 数据源类型: doris3.x
- key: orderInfo-user-profile-city / 中文名称: 用户城市 / 数据源类型: doris3.x
- key: eventDetail-headers-traceId / 中文名称: 链路ID / 数据源类型: hive2.x
- key: eventDetail-status / 中文名称: 事件状态 / 数据源类型: hive2.x
2、已在 Doris3.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_doris.t_json_key_rule;
CREATE TABLE qa_15693_doris.t_json_key_rule (
  id INT,
  payload_json JSON,
  payload_text STRING,
  event_id INT,
  dt DATE
)
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 2;
INSERT INTO qa_15693_doris.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', '{"orderInfo":{"user":{"id":"U1001","profile":{"city":"上海"}}},"eventDetail":{"headers":{"traceId":"TRACE-001"},"status":"SUCCESS"}}', 1001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', '{"orderInfo":{"user":{"id":"U1002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 1002, '2026-04-02');
3、已在 Hive2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_hive.t_json_key_rule;
CREATE TABLE qa_15693_hive.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
);
INSERT INTO qa_15693_hive.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U2001","profile":{"city":"北京"}}},"eventDetail":{"headers":{"traceId":"TRACE-101"},"status":"SUCCESS"}}', 2001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U2002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 2002, '2026-04-02');
4、已在 SparkThrift2.x 集群执行以下 SQL：
DROP TABLE IF EXISTS qa_15693_spark.t_json_key_rule;
CREATE TABLE qa_15693_spark.t_json_key_rule (
  id INT,
  payload_text STRING,
  event_id INT,
  dt STRING
)
USING parquet;
INSERT INTO qa_15693_spark.t_json_key_rule VALUES
(1, '{"orderInfo":{"user":{"id":"U3001","profile":{"city":"苏州"}}},"eventDetail":{"headers":{"traceId":"TRACE-201"},"status":"SUCCESS"}}', 3001, '2026-04-01'),
(2, '{"orderInfo":{"user":{"id":"U3002"}},"eventDetail":{"headers":{},"status":"FAIL"}}', 3002, '2026-04-02');
5、已通过【数据质量 → 规则集管理 → 新增规则集】创建规则集【15693_key范围校验_自动化】。
6、已创建通过任务【15693_key_range_exclude_pass】和失败任务【15693_key_range_include_fail】并完成最近一次执行。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务管理 → 质量报告】页面 | 页面正常加载，质量报告列表展示规则类型、规则名称、字段名称、字段类型、质检结果、未通过原因、详情说明和操作列。 |
| 2 | 查看通过记录【15693_key_range_exclude_pass】与失败记录【15693_key_range_include_fail】的报告文案 | 通过记录展示“符合规则 key 范围包含/不包含 …”文案，失败记录展示“key 范围校验未通过”文案。 |
