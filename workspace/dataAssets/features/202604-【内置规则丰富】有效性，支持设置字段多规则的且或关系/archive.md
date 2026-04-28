---
suite_name: "【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695)"
root_name: "v6.3.10迭代用例(#23)"
description: "【内置规则丰富】有效性，支持设置字段多规则的且或关系(#15695)"
prd_id: 15695
prd_version: "v6.3.10"
product: ""
project: "dataAssets"
tags:
  - "内置规则丰富"
  - "有效性，支持设置字段多规则的且或关系(#15695)"
  - "v6.3.10"
  - "数据质量"
  - "规则集管理"
  - "规则配置-新增取值范围&枚举范围规则（P0核心流程）"
  - "规则配置-或关系"
  - "规则配置-仅取值范围配置"
  - "规则配置-仅枚举值配置"
  - "枚举值 in/not in 切换"
create_at: "2026-04-21"
status: "草稿"
case_count: 27
origin: "xmind"
---

## 数据质量

### 规则集管理

#### 规则配置-新增取值范围&枚举范围规则（P0核心流程）

##### 【P0】验证在规则集中配置取值范围&枚举范围规则且关系完整流程（数值类型字段）

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已分别在 SparkThrift2.x 与 Doris3.x 数据源中准备同名测试表及数据：
SparkThrift2.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT,
  score DOUBLE,
  category STRING
) STORED AS PARQUET;
INSERT INTO TABLE test_db.quality_test_num
SELECT 1, 5.0, '2'
UNION ALL
SELECT 2, 15.0, '4'
UNION ALL
SELECT 3, 3.0, '1'
UNION ALL
SELECT 4, -1.0, '3'
UNION ALL
SELECT 5, 8.0, '5';

Doris3.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');

-- 说明：score 字段期望 >1 且 <10；category 枚举值期望 in '1,2,3'
-- 符合且关系（两者均满足）的记录：id=1(score=5,category=2)、id=3(score=3,category=1)
-- 不符合的记录：id=2(score=15越界)、id=4(score=-1越界)、id=5(category=5不在枚举)
3) 已通过【数据质量 → 规则集管理】页面创建规则集"ruleset_15695_and"，关联 sparkthrift2.x 数据源 test_db 库 quality_test_num 表，规则包名称"且关系校验包"
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成，无报错 |
| 2 | 找到规则集"ruleset_15695_and"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在规则包"且关系校验包"中点击【新增规则】，在统计函数下拉框中选择【取值范围&枚举范围】 | 规则配置区域展开，显示「有效性校验」标题，包含字段下拉框、统计规则配置区域（取值范围行和枚举值行）、强弱规则下拉框和规则描述输入框 |
| 3 | 在规则配置表单中按顺序填写如下：<br>- 字段: score<br>- 取值范围行-第一组: 期望值输入 1，操作符选择 ><br>- 取值范围行-第二组: 点击右侧【+】添加第二条，期望值输入 10，操作符选择 <<br>- 取值范围行-且或关系: 选择【且】单选按钮<br>- 枚举值行-枚举值类型: 选择 in<br>- 枚举值行-枚举值信息: 依次输入 1、2、3<br>- 强弱规则: 强规则<br>- 规则描述: score取值范围1到10且枚举值in 1,2,3 | 各表单项可正常输入/选择，无异常提示 |
| 4 | 点击【保存】按钮，再点击页面底部【保存】完成规则集保存 | 规则保存成功，规则配置页规则列表中新增一条规则，显示如下：<br>1) 规则类型显示「取值范围&枚举范围」<br>2) 字段显示 score<br>3) 取值范围显示 >1 且 <10<br>4) 枚举值显示 in '1,2,3'<br>5) 且或关系显示「且」<br>6) 强弱规则显示「强规则」 |
| 5 | 切换至 doris3.x 数据源，按相同表、规则包和配置重复以上步骤。 | 切换至 doris3.x 数据源重复以上步骤后，规则新增、保存、回显结果与 sparkthrift2.x 场景一致。 |

#### 规则配置-或关系

##### 【P1】验证在规则集中配置取值范围&枚举范围规则或关系时保存成功

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已分别在 SparkThrift2.x 与 Doris3.x 数据源中准备同名测试表及数据：
SparkThrift2.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT,
  score DOUBLE,
  category STRING
) STORED AS PARQUET;
INSERT INTO TABLE test_db.quality_test_num
SELECT 1, 5.0, '2'
UNION ALL
SELECT 2, 15.0, '4'
UNION ALL
SELECT 3, 3.0, '1'
UNION ALL
SELECT 4, -1.0, '3'
UNION ALL
SELECT 5, 8.0, '5';

Doris3.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');

-- 说明：score 字段期望 >1 且 <10；category 枚举值期望 in '1,2,3'
-- 符合且关系（两者均满足）的记录：id=1(score=5,category=2)、id=3(score=3,category=1)
-- 不符合的记录：id=2(score=15越界)、id=4(score=-1越界)、id=5(category=5不在枚举)
3) 已通过【数据质量 → 规则集管理】页面创建规则集"ruleset_15695_or"，关联 sparkthrift2.x 数据源 test_db 库 quality_test_num 表，规则包名称"或关系校验包"
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成，无报错 |
| 2 | 找到"ruleset_15695_or"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在"或关系校验包"中点击【新增规则】，在统计函数下拉框中选择【取值范围&枚举范围】，按顺序填写如下：<br>- 字段: score<br>- 取值范围行: 期望值输入 1，操作符选择 ><br>- 取值范围行-且或关系: 选择【或】单选按钮<br>- 枚举值行-枚举值类型: 选择 in<br>- 枚举值行-枚举值信息: 依次输入 1、2、3<br>- 强弱规则: 强规则 | 规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确 |
| 3 | 点击【保存】按钮，再点击页面底部【保存】完成规则集保存 | 规则保存成功，规则列表中新增规则的且或关系列显示「或」 |
| 4 | 切换至 doris3.x 数据源，按相同表、规则包和配置重复以上步骤。 | 切换至 doris3.x 数据源重复以上步骤后，规则新增、保存、回显结果与 sparkthrift2.x 场景一致。 |

#### 规则配置-仅取值范围配置

##### 【P1】验证在规则集中仅填写取值范围可正常保存

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已分别在 SparkThrift2.x 与 Doris3.x 数据源中准备同名测试表及数据：
SparkThrift2.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT,
  score DOUBLE,
  category STRING
) STORED AS PARQUET;
INSERT INTO TABLE test_db.quality_test_num
SELECT 1, 5.0, '2'
UNION ALL
SELECT 2, 15.0, '4'
UNION ALL
SELECT 3, 3.0, '1'
UNION ALL
SELECT 4, -1.0, '3'
UNION ALL
SELECT 5, 8.0, '5';

Doris3.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');

-- 说明：score 字段期望 >1 且 <10；category 枚举值期望 in '1,2,3'
-- 符合且关系（两者均满足）的记录：id=1(score=5,category=2)、id=3(score=3,category=1)
-- 不符合的记录：id=2(score=15越界)、id=4(score=-1越界)、id=5(category=5不在枚举)
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成，无报错 |
| 2 | 找到"ruleset_15695_range"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在"仅取值范围包"中点击【新增规则】，在统计函数下拉框中选择【取值范围&枚举范围】，按顺序填写如下：<br>- 字段: score<br>- 取值范围行: 期望值输入 0，操作符选择 >=<br>- 枚举值行: 不填写，保持为空<br>- 强弱规则: 强规则 | 规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确 |
| 3 | 点击【保存】按钮，再点击页面底部【保存】完成规则集保存 | 规则保存成功，规则列表中对应规则显示如下：<br>1) 取值范围列显示 >=0<br>2) 枚举值设置列显示 -- 或为空<br>3) 且或关系列不显示（仅一项规则时无需关系） |
| 4 | 切换至 doris3.x 数据源，按相同表、规则包和配置重复以上步骤。 | 切换至 doris3.x 数据源重复以上步骤后，规则新增、保存、回显结果与 sparkthrift2.x 场景一致。 |

#### 规则配置-仅枚举值配置

##### 【P1】验证在规则集中仅填写枚举值可正常保存

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已分别在 SparkThrift2.x 与 Doris3.x 数据源中准备同名测试表及数据：
SparkThrift2.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT,
  score DOUBLE,
  category STRING
) STORED AS PARQUET;
INSERT INTO TABLE test_db.quality_test_num
SELECT 1, 5.0, '2'
UNION ALL
SELECT 2, 15.0, '4'
UNION ALL
SELECT 3, 3.0, '1'
UNION ALL
SELECT 4, -1.0, '3'
UNION ALL
SELECT 5, 8.0, '5';

Doris3.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');

-- 说明：score 字段期望 >1 且 <10；category 枚举值期望 in '1,2,3'
-- 符合且关系（两者均满足）的记录：id=1(score=5,category=2)、id=3(score=3,category=1)
-- 不符合的记录：id=2(score=15越界)、id=4(score=-1越界)、id=5(category=5不在枚举)
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成，无报错 |
| 2 | 找到"ruleset_15695_enum"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在"仅枚举值包"中点击【新增规则】，在统计函数下拉框中选择【取值范围&枚举范围】，按顺序填写如下：<br>- 字段: category<br>- 取值范围行: 不填写，保持为空<br>- 枚举值行-枚举值类型: 选择 in<br>- 枚举值行-枚举值信息: 依次输入 1、2、3<br>- 强弱规则: 强规则 | 规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确 |
| 3 | 点击【保存】按钮，再点击页面底部【保存】完成规则集保存 | 规则保存成功，规则列表中对应规则的枚举值列显示 in '1,2,3'，取值范围列显示 -- 或为空 |
| 4 | 切换至 doris3.x 数据源，按相同表、规则包和配置重复以上步骤。 | 切换至 doris3.x 数据源重复以上步骤后，规则新增、保存、回显结果与 sparkthrift2.x 场景一致。 |

#### 枚举值 in/not in 切换

##### 【P1】验证在规则集中枚举值选择not in保存成功

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已分别在 SparkThrift2.x 与 Doris3.x 数据源中准备同名测试表及数据：
SparkThrift2.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT,
  score DOUBLE,
  category STRING
) STORED AS PARQUET;
INSERT INTO TABLE test_db.quality_test_num
SELECT 1, 5.0, '2'
UNION ALL
SELECT 2, 15.0, '4'
UNION ALL
SELECT 3, 3.0, '1'
UNION ALL
SELECT 4, -1.0, '3'
UNION ALL
SELECT 5, 8.0, '5';

Doris3.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');

-- 说明：score 字段期望 >1 且 <10；category 枚举值期望 in '1,2,3'
-- 符合且关系（两者均满足）的记录：id=1(score=5,category=2)、id=3(score=3,category=1)
-- 不符合的记录：id=2(score=15越界)、id=4(score=-1越界)、id=5(category=5不在枚举)
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成，无报错 |
| 2 | 找到"ruleset_15695_notin"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在"notin校验包"中点击【新增规则】，在统计函数下拉框中选择【取值范围&枚举范围】，按顺序填写如下：<br>- 字段: category<br>- 取值范围行: 不填写，保持为空<br>- 枚举值行-枚举值类型: 选择 not in<br>- 枚举值行-枚举值信息: 依次输入 4、5<br>- 强弱规则: 强规则 | 规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确 |
| 3 | 点击【保存】按钮，再点击页面底部【保存】完成规则集保存 | 规则保存成功，规则列表中对应规则的枚举值设置列显示 not in '4,5' |
| 4 | 切换至 doris3.x 数据源，按相同表、规则包和配置重复以上步骤。 | 切换至 doris3.x 数据源重复以上步骤后，规则新增、保存、回显结果与 sparkthrift2.x 场景一致。 |

##### 【P1】验证原有枚举值规则同步新增not in选项且可正常保存

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已分别在 SparkThrift2.x 与 Doris3.x 数据源中准备同名测试表及数据：
SparkThrift2.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT,
  score DOUBLE,
  category STRING
) STORED AS PARQUET;
INSERT INTO TABLE test_db.quality_test_num
SELECT 1, 5.0, '2'
UNION ALL
SELECT 2, 15.0, '4'
UNION ALL
SELECT 3, 3.0, '1'
UNION ALL
SELECT 4, -1.0, '3'
UNION ALL
SELECT 5, 8.0, '5';

Doris3.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');

-- 说明：score 字段期望 >1 且 <10；category 枚举值期望 in '1,2,3'
-- 符合且关系（两者均满足）的记录：id=1(score=5,category=2)、id=3(score=3,category=1)
-- 不符合的记录：id=2(score=15越界)、id=4(score=-1越界)、id=5(category=5不在枚举)
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成，无报错 |
| 2 | 找到"ruleset_15695_enum_orig"，点击操作列的【编辑】按钮，进入 Step 2 监控规则，在"原枚举值包"中点击【新增规则】，在统计函数下拉框中选择原有的【枚举值】规则类型，查看枚举值设置行中下拉框选项 | 枚举值设置下拉框中包含【in】和【not in】两个选项 |
| 3 | 在枚举值设置下拉框中选择【not in】，按顺序填写如下：<br>- 字段: category<br>- 枚举值信息: 依次输入 4、5<br>- 强弱规则: 强规则<br>点击【保存】按钮，再点击页面底部【保存】 | 规则保存成功，规则列表中对应规则的枚举值列显示 not in '4,5' |
| 4 | 切换至 doris3.x 数据源，按相同表、规则包和配置重复以上步骤。 | 切换至 doris3.x 数据源重复以上步骤后，规则新增、保存、回显结果与 sparkthrift2.x 场景一致。 |

#### string类型字段强转double验证

##### 【P1】验证string类型字段在规则集中配置取值范围&枚举范围规则时系统可正常保存

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已分别在 SparkThrift2.x 与 Doris3.x 数据源中准备同名测试表及数据：
SparkThrift2.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_str;
CREATE TABLE test_db.quality_test_str (
  id INT,
  score_str STRING,
  category STRING
) STORED AS PARQUET;
INSERT INTO TABLE test_db.quality_test_str
SELECT 1, '5', '2'
UNION ALL
SELECT 2, '5.0', '4'
UNION ALL
SELECT 3, '15.0', '1'
UNION ALL
SELECT 4, 'abc', '3'
UNION ALL
SELECT 5, '-1.0', '5';

Doris3.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_str;
CREATE TABLE test_db.quality_test_str (
  id INT NOT NULL,
  score_str VARCHAR(50),
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_str VALUES
  (1, '5', '2'),
  (2, '5.0', '4'),
  (3, '15.0', '1'),
  (4, 'abc', '3'),
  (5, '-1.0', '5');

-- 说明：score_str 需要按数值含义参与取值范围计算，category 枚举值期望 in '1,2,3'
3) 已通过【数据质量 → 规则集管理】页面创建规则集"ruleset_15695_str"，关联 sparkthrift2.x 数据源 test_db 库 quality_test_str 表，规则包名称"string强转包"
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成，无报错 |
| 2 | 找到"ruleset_15695_str"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在"string强转包"中点击【新增规则】，在统计函数下拉框中选择【取值范围&枚举范围】，按顺序填写如下：<br>- 字段: score_str（字段类型为 STRING）<br>- 取值范围行: 期望值输入 1，操作符选择 ><br>- 取值范围行-且或关系: 选择【且】单选按钮<br>- 枚举值行-枚举值类型: 选择 in<br>- 枚举值行-枚举值信息: 依次输入 5、5.5、15<br>- 强弱规则: 强规则 | 字段下拉框中 score_str（STRING 类型）可被选中，规则配置表单正常展开 |
| 3 | 点击【保存】按钮，再点击页面底部【保存】完成规则集保存 | 规则保存成功，string 类型字段可正常配置取值范围&枚举范围规则 |
| 4 | 切换至 doris3.x 数据源，按相同表、规则包和配置重复以上步骤。 | 切换至 doris3.x 数据源重复以上步骤后，规则新增、保存、回显结果与 sparkthrift2.x 场景一致。 |

#### 逆向用例-表单校验

##### 【P1】验证取值范围设置期望值已填写但操作符未选择时点击保存提示校验错误

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已进入任意规则集编辑页 Step 2 监控规则
3) 已点击【新增规则】，统计函数已选择【取值范围&枚举范围】
4) 字段已选择 score
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 在规则集 Step 2 监控规则页面，当前规则配置表单中按顺序填写如下：<br>- 字段: score<br>- 取值范围行-期望值: 输入 5<br>- 取值范围行-操作符: 保持默认空选项（不选择任何操作符）<br>- 枚举值行-枚举值类型: 选择 in<br>- 枚举值行-枚举值信息: 依次输入 1、2、3<br>- 取值范围行-且或关系: 选择【且】 | 各表单项可正常输入/选择，无异常提示 |
| 2 | 点击【保存】按钮 | 保存失败，页面在取值范围设置操作符位置展示红色校验错误提示「请选择操作符」，规则未被保存 |

##### 【P1】验证枚举值下拉框已选择in但值输入框为空时点击保存提示校验错误

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已进入任意规则集编辑页 Step 2 监控规则
3) 已点击【新增规则】，统计函数已选择【取值范围&枚举范围】
4) 字段已选择 score
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 在规则集 Step 2 监控规则页面，当前规则配置表单中按顺序填写如下：<br>- 字段: score<br>- 取值范围行: 期望值输入 1，操作符选择 ><br>- 枚举值行-枚举值类型: 选择 in<br>- 枚举值行-枚举值信息: 留空不输入任何值<br>- 取值范围行-且或关系: 选择【且】 | 各表单项可正常输入/选择，无异常提示 |
| 2 | 点击【保存】按钮 | 保存失败，页面在枚举值信息输入框位置展示红色校验错误提示「请输入枚举值」，规则未被保存 |

##### 【P1】验证取值范围和枚举值均已填写但关系未选择时点击保存提示校验错误

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已进入任意规则集编辑页 Step 2 监控规则
3) 已点击【新增规则】，统计函数已选择【取值范围&枚举范围】
4) 字段已选择 score
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 在规则集 Step 2 监控规则页面，当前规则配置表单中按顺序填写如下：<br>- 字段: score<br>- 取值范围行: 期望值输入 1，操作符选择 ><br>- 枚举值行-枚举值类型: 选择 in<br>- 枚举值行-枚举值信息: 依次输入 1、2、3<br>- 取值范围行-且或关系: 保持默认空选项（不选择且/或） | 各表单项可正常输入/选择，无异常提示 |
| 2 | 点击【保存】按钮 | 保存失败，页面在且或关系设置位置展示红色校验错误提示「请选择规则关系」，规则未被保存 |

##### 【P1】验证取值范围和枚举值均未填写时点击保存提示至少填写一项

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已进入任意规则集编辑页 Step 2 监控规则
3) 已点击【新增规则】，统计函数已选择【取值范围&枚举范围】
4) 字段已选择 score
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 在规则集 Step 2 监控规则页面，当前规则配置表单中按顺序填写如下：<br>- 字段: score<br>- 取值范围行: 期望值和操作符均不填写，保持为空<br>- 枚举值行: 不填写，保持为空 | 各表单项可正常输入/选择，无异常提示 |
| 2 | 点击【保存】按钮 | 保存失败，页面展示红色校验错误提示「取值范围和枚举值至少填写一项」，规则未被保存 |

#### 规则编辑-且或关系切换

##### 【P1】验证在规则集中已保存的且关系规则编辑切换为或关系后保存成功

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 规则集"ruleset_15695_and"已配置取值范围&枚举范围规则，当前关系为「且」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成，无报错 |
| 2 | 找到"ruleset_15695_and"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，找到已配置的取值范围&枚举范围规则，将且或关系从【且】切换为【或】单选按钮 | 且或关系单选按钮切换为「或」被选中 |
| 3 | 点击【保存】按钮，再点击页面底部【保存】完成规则集保存 | 规则保存成功，规则列表中且或关系列由「且」变更为「或」 |

#### 规则克隆与删除

##### 【P2】验证在规则集中取值范围&枚举范围规则支持克隆且克隆后配置内容与原规则一致

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 规则集"ruleset_15695_and"已配置至少一条取值范围&枚举范围规则（score>1且<10，in '1,2,3'，且关系，强规则）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成，无报错 |
| 2 | 找到"ruleset_15695_and"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，找到取值范围&枚举范围规则区域右上角的【克隆】按钮，点击【克隆】 | 页面新增一条与原规则配置完全相同的规则区域，包含：<br>1) 字段显示 score<br>2) 取值范围显示 >1 且 <10<br>3) 枚举值显示 in '1,2,3'<br>4) 且或关系显示「且」<br>5) 强弱规则显示「强规则」 |
| 3 | 点击克隆出的规则区域右上角的【删除】按钮（垃圾桶图标），确认删除操作 | 克隆的规则被删除，页面恢复为仅一条取值范围&枚举范围规则 |

#### 过滤条件配置验证

##### 【P1】验证在规则集中配置过滤条件后规则保存成功

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已分别在 SparkThrift2.x 与 Doris3.x 数据源中准备同名测试表及数据：
SparkThrift2.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT,
  score DOUBLE,
  category STRING
) STORED AS PARQUET;
INSERT INTO TABLE test_db.quality_test_num
SELECT 1, 5.0, '2'
UNION ALL
SELECT 2, 15.0, '4'
UNION ALL
SELECT 3, 3.0, '1'
UNION ALL
SELECT 4, -1.0, '3'
UNION ALL
SELECT 5, 8.0, '5';

Doris3.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');

-- 说明：score 字段期望 >1 且 <10；category 枚举值期望 in '1,2,3'
-- 符合且关系（两者均满足）的记录：id=1(score=5,category=2)、id=3(score=3,category=1)
-- 不符合的记录：id=2(score=15越界)、id=4(score=-1越界)、id=5(category=5不在枚举)
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成，无报错 |
| 2 | 找到"ruleset_15695_filter"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在"过滤条件包"中点击【新增规则】，在统计函数下拉框中选择【取值范围&枚举范围】，按顺序填写如下：<br>- 字段: score<br>- 取值范围行: 期望值输入 1，操作符选择 ><br>- 取值范围行-过滤条件: 选项配置下拉框选择对应列，点击【点击配置】按钮进行过滤条件配置，设置 category in ('1','2','3')<br>- 枚举值行: 不填写<br>- 强弱规则: 强规则 | 规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确 |
| 3 | 点击【保存】按钮，再点击页面底部【保存】完成规则集保存 | 规则保存成功，规则列表中对应规则显示过滤条件已配置 |
| 4 | 切换至 doris3.x 数据源，按相同表、规则包和配置重复以上步骤。 | 切换至 doris3.x 数据源重复以上步骤后，规则新增、保存、回显结果与 sparkthrift2.x 场景一致。 |

### 规则任务管理

#### P0执行流程-且关系

##### 【P0】验证执行含取值范围&枚举范围且关系规则的任务后质量报告展示正确

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已分别在 SparkThrift2.x 与 Doris3.x 数据源中准备同名测试表及数据：
SparkThrift2.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT,
  score DOUBLE,
  category STRING
) STORED AS PARQUET;
INSERT INTO TABLE test_db.quality_test_num
SELECT 1, 5.0, '2'
UNION ALL
SELECT 2, 15.0, '4'
UNION ALL
SELECT 3, 3.0, '1'
UNION ALL
SELECT 4, -1.0, '3'
UNION ALL
SELECT 5, 8.0, '5';

Doris3.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');

-- 说明：score 字段期望 >1 且 <10；category 枚举值期望 in '1,2,3'
-- 符合且关系（两者均满足）的记录：id=1(score=5,category=2)、id=3(score=3,category=1)
-- 不符合的记录：id=2(score=15越界)、id=4(score=-1越界)、id=5(category=5不在枚举)
3) 已通过【数据质量 → 规则集管理】创建规则集"ruleset_15695_and"并配置取值范围&枚举范围规则（score>1且<10，category in '1,2,3'，且关系，强规则），规则包名称"且关系校验包"
4) 已通过【数据质量 → 规则任务管理】页面，点击【新建监控规则】创建任务"task_15695_and"，Step 1 关联 sparkthrift2.x 数据源 test_db.quality_test_num 表，Step 2 监控规则中通过【导入规则包】导入规则集"ruleset_15695_and"的"且关系校验包"，已完成 Step 3 调度属性并保存
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务管理页面正常打开，列表加载完成，无报错 |
| 2 | 在规则任务列表中点击任务 task_15695_and 对应行的【执行】按钮，等待任务状态变更为【执行成功】（最长等待 120 秒） | 任务状态列显示「执行成功」 |
| 3 | 点击任务 task_15695_and 对应行的【质量报告】入口，在质量报告列表中找到规则名称为【取值范围&枚举范围】、字段为 score 的报告行，查看各列内容 | 质量报告中该规则行显示如下：<br>1) 规则类型列显示「有效性校验」<br>2) 规则名称列显示「取值范围&枚举范围」<br>3) 质检结果列显示「校验不通过」<br>4) 未通过原因列显示「不符合有效性规则」<br>5) 详情说明列显示「不符合规则"取值范围>1"且"枚举值in '1,2,3'"」<br>6) 操作列显示【查看详情】链接 |
| 4 | 切换至 doris3.x 数据源，按相同表、规则包和配置重复以上步骤。 | 切换至 doris3.x 数据源重复以上步骤后，规则任务创建、执行、结果展示与 sparkthrift2.x 场景一致。 |

#### P0执行流程-或关系

##### 【P1】验证执行含取值范围&枚举范围或关系规则的任务后校验通过

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已分别在 SparkThrift2.x 与 Doris3.x 数据源中准备同名测试表及数据：
SparkThrift2.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT,
  score DOUBLE,
  category STRING
) STORED AS PARQUET;
INSERT INTO TABLE test_db.quality_test_num
SELECT 1, 5.0, '2'
UNION ALL
SELECT 2, 15.0, '4'
UNION ALL
SELECT 3, 3.0, '1'
UNION ALL
SELECT 4, -1.0, '3'
UNION ALL
SELECT 5, 8.0, '5';

Doris3.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');

-- 说明：score 字段期望 >1 且 <10；category 枚举值期望 in '1,2,3'
-- 符合且关系（两者均满足）的记录：id=1(score=5,category=2)、id=3(score=3,category=1)
-- 不符合的记录：id=2(score=15越界)、id=4(score=-1越界)、id=5(category=5不在枚举)
3) 已通过【数据质量 → 规则集管理】创建规则集"ruleset_15695_or"并配置取值范围&枚举范围规则（score>1，category in '1,2,3'，或关系，强规则），规则包名称"或关系校验包"
4) 已通过【数据质量 → 规则任务管理】页面，点击【新建监控规则】创建任务"task_15695_or"，Step 1 关联同一 Doris 表，Step 2 通过【导入规则包】导入"ruleset_15695_or"的"或关系校验包"，已完成 Step 3 调度属性并保存
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务管理页面正常打开，列表加载完成，无报错 |
| 2 | 点击任务 task_15695_or 对应行的【执行】按钮，等待任务状态变更为【执行成功】（最长等待 120 秒），点击【质量报告】入口查看报告行 | 质量报告中该规则行显示如下：<br>1) 质检结果列显示「校验通过」<br>2) 详情说明列显示「符合规则"取值范围>1"或"枚举值in '1,2,3'"」<br>3) 操作列不显示【查看详情】链接（显示 -- 或为空） |
| 3 | 切换至 doris3.x 数据源，按相同表、规则包和配置重复以上步骤。 | 切换至 doris3.x 数据源重复以上步骤后，规则任务创建、执行、结果展示与 sparkthrift2.x 场景一致。 |

#### 弱规则与校验失败查看日志

##### 【P2】验证弱规则标识在质量报告中展示正确

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已分别在 SparkThrift2.x 与 Doris3.x 数据源中准备同名测试表及数据：
SparkThrift2.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT,
  score DOUBLE,
  category STRING
) STORED AS PARQUET;
INSERT INTO TABLE test_db.quality_test_num
SELECT 1, 5.0, '2'
UNION ALL
SELECT 2, 15.0, '4'
UNION ALL
SELECT 3, 3.0, '1'
UNION ALL
SELECT 4, -1.0, '3'
UNION ALL
SELECT 5, 8.0, '5';

Doris3.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');

-- 说明：score 字段期望 >1 且 <10；category 枚举值期望 in '1,2,3'
-- 符合且关系（两者均满足）的记录：id=1(score=5,category=2)、id=3(score=3,category=1)
-- 不符合的记录：id=2(score=15越界)、id=4(score=-1越界)、id=5(category=5不在枚举)
3) 已通过【数据质量 → 规则集管理】创建规则集"ruleset_15695_weak"并配置取值范围&枚举范围规则（score>1，category in '1,2,3'，且关系，弱规则），规则包名称"弱规则校验包"
4) 已通过【数据质量 → 规则任务管理】页面，点击【新建监控规则】创建任务"task_15695_weak"，Step 1 关联同一 Doris 表，Step 2 通过【导入规则包】导入"ruleset_15695_weak"的"弱规则校验包"，已完成 Step 3 调度属性并保存
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务管理页面正常打开，列表加载完成，无报错 |
| 2 | 点击任务 task_15695_weak 对应行的【执行】按钮，等待任务状态变更为【执行成功】（最长等待 120 秒），点击【质量报告】入口查看规则行强弱规则标识 | 质量报告中该规则行显示如下：<br>1) 强弱规则列标识为「弱规则」<br>2) 整体任务质量评分不因该弱规则不通过而降级 |
| 3 | 切换至 doris3.x 数据源，按相同表、规则包和配置重复以上步骤。 | 切换至 doris3.x 数据源重复以上步骤后，规则任务创建、执行、结果展示与 sparkthrift2.x 场景一致。 |

##### 【P2】验证取值范围&枚举范围规则执行失败时可查看日志

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已有规则任务执行状态为【执行失败】，失败任务中包含取值范围&枚举范围规则
3) 可通过断开数据源连接或制造 SQL 执行错误来模拟执行失败
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务管理页面正常打开，列表加载完成，无报错 |
| 2 | 在规则任务列表中找到状态为【执行失败】且包含取值范围&枚举范围规则的任务，点击对应行【质量报告】入口，在报告列表中找到取值范围&枚举范围规则行，点击操作列【查看日志】链接 | 日志弹窗正常打开，显示任务执行失败的详细日志信息，包含失败时间戳、错误类型及错误详情 |

#### 抽样场景验证

##### 【P2】验证结合抽样功能执行取值范围&枚举范围校验结果正确

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已分别在 SparkThrift2.x 与 Doris3.x 数据源中准备同名测试表及数据：
SparkThrift2.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_sample;
CREATE TABLE test_db.quality_test_sample (
  id INT,
  score DOUBLE,
  category STRING
) STORED AS PARQUET;
INSERT INTO TABLE test_db.quality_test_sample
SELECT 1, 5.0, '2'
UNION ALL
SELECT 2, 15.0, '4'
UNION ALL
SELECT 3, 3.0, '1'
UNION ALL
SELECT 4, -1.0, '3'
UNION ALL
SELECT 5, 8.0, '5'
UNION ALL
SELECT 6, 7.0, '1'
UNION ALL
SELECT 7, 9.0, '2'
UNION ALL
SELECT 8, 2.0, '3'
UNION ALL
SELECT 9, 6.0, '1'
UNION ALL
SELECT 10, 4.0, '2';

Doris3.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_sample;
CREATE TABLE test_db.quality_test_sample (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_sample VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5'),
  (6, 7.0, '1'),
  (7, 9.0, '2'),
  (8, 2.0, '3'),
  (9, 6.0, '1'),
  (10, 4.0, '2');

-- 说明：抽样校验场景使用 10 条样本数据验证结果统计
3) 已通过【数据质量 → 规则集管理】创建规则集"ruleset_15695_sample"并配置取值范围&枚举范围规则（score>1，category in '1,2,3'，且关系，强规则），规则包名称"抽样校验包"
4) 已通过【数据质量 → 规则任务管理】页面，点击【新建监控规则】创建任务"task_15695_sample"，Step 1 关联 sparkthrift2.x 数据源 test_db.quality_test_sample 表，Step 2 通过【导入规则包】导入"ruleset_15695_sample"的"抽样校验包"，在任务配置中设置抽样比例为 50%，已完成 Step 3 调度属性并保存
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务管理页面正常打开，列表加载完成，无报错 |
| 2 | 点击任务 task_15695_sample 对应行的【执行】按钮，等待任务状态变更为【执行成功】（最长等待 120 秒），点击【质量报告】入口查看报告行 | 质量报告中该规则行显示如下：<br>1) 质检结果列显示校验结果（通过或不通过取决于抽样到的数据）<br>2) 报告中参与校验的数据量约为总数据量的 50%（约5条）<br>3) 详情说明中规则描述与配置一致 |
| 3 | 切换至 doris3.x 数据源，按相同表、规则包和配置重复以上步骤。 | 切换至 doris3.x 数据源重复以上步骤后，规则任务创建、执行、结果展示与 sparkthrift2.x 场景一致。 |

#### 分区表场景验证

##### 【P2】验证对分区表指定分区执行取值范围&枚举范围校验结果正确

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已分别在 SparkThrift2.x 与 Doris3.x 数据源中准备同名测试表及数据：
SparkThrift2.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_partition;
CREATE TABLE test_db.quality_test_partition (
  id INT,
  score DOUBLE,
  category STRING
) PARTITIONED BY (dt STRING) STORED AS PARQUET;
INSERT INTO TABLE test_db.quality_test_partition PARTITION (dt='2026-04-01')
SELECT 1, 5.0, '2'
UNION ALL
SELECT 2, 15.0, '4';
INSERT INTO TABLE test_db.quality_test_partition PARTITION (dt='2026-04-02')
SELECT 3, 3.0, '1'
UNION ALL
SELECT 4, -1.0, '3';

Doris3.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_partition;
CREATE TABLE test_db.quality_test_partition (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50),
  dt DATE NOT NULL
) PARTITION BY RANGE(dt) (
  PARTITION p20260401 VALUES LESS THAN ('2026-04-02'),
  PARTITION p20260402 VALUES LESS THAN ('2026-04-03')
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_partition VALUES
  (1, 5.0, '2', '2026-04-01'),
  (2, 15.0, '4', '2026-04-01'),
  (3, 3.0, '1', '2026-04-02'),
  (4, -1.0, '3', '2026-04-02');

-- 说明：分区场景使用 dt=2026-04-01 与 dt=2026-04-02 两个分区验证执行结果
3) 已通过【数据质量 → 规则集管理】创建规则集"ruleset_15695_partition"并配置取值范围&枚举范围规则（score>1，category in '1,2,3'，且关系，强规则），规则包名称"分区校验包"
4) 已通过【数据质量 → 规则任务管理】页面，点击【新建监控规则】创建任务"task_15695_partition"，Step 1 关联 sparkthrift2.x 数据源 test_db.quality_test_partition 表并指定分区为 p20260401，Step 2 通过【导入规则包】导入"ruleset_15695_partition"的"分区校验包"，已完成 Step 3 调度属性并保存
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务管理页面正常打开，列表加载完成，无报错 |
| 2 | 点击任务 task_15695_partition 对应行的【执行】按钮，等待任务状态变更为【执行成功】（最长等待 120 秒），点击【质量报告】入口查看报告行 | 质量报告中该规则行显示如下：<br>1) 质检结果列显示「校验不通过」<br>2) 仅 p20260401 分区数据参与校验（id=1 和 id=2）<br>3) 不通过记录为 id=2(score=15 不满足 >1 且 <10 范围)<br>4) p20260402 分区数据（id=3、id=4）未参与校验 |
| 3 | 切换至 doris3.x 数据源，按相同表、规则包和配置重复以上步骤。 | 切换至 doris3.x 数据源重复以上步骤后，规则任务创建、执行、结果展示与 sparkthrift2.x 场景一致。 |

### 规则库配置

#### 规则库展示验证

##### 【P1】验证规则库中新增取值范围&枚举范围内置规则展示正确

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 账号具有数据质量模块查看权限
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则库配置】页面，等待规则库配置列表加载完成 | 规则库配置页面正常打开，列表加载完成，无报错 |
| 2 | 点击页面顶部【内置规则】Tab 页签，在规则分类筛选下拉框中勾选【有效性校验】，点击【确定】按钮，等待列表刷新完成 | 列表按筛选条件刷新完成，结果正确展示 |
| 3 | 在规则列表中查找规则名称为【取值范围&枚举范围】的规则条目，查看该行各列内容 | 规则库列表中存在规则名称为【取值范围&枚举范围】的条目，各列显示如下：<br>1) 规则解释列显示「取值范围和枚举范围的联合校验」<br>2) 规则分类列显示「有效性校验」<br>3) 关联范围列显示「字段」<br>4) 规则描述列显示「校验字段值取值范围和枚举范围是否符合要求，支持配置规则且或关系」 |

### 校验结果查询

#### 校验不通过时明细查看与下载

##### 【P1】验证取值范围&枚举范围规则校验不通过时可查看明细且校验字段标红展示

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已分别在 SparkThrift2.x 与 Doris3.x 数据源中准备同名测试表及数据：
SparkThrift2.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT,
  score DOUBLE,
  category STRING
) STORED AS PARQUET;
INSERT INTO TABLE test_db.quality_test_num
SELECT 1, 5.0, '2'
UNION ALL
SELECT 2, 15.0, '4'
UNION ALL
SELECT 3, 3.0, '1'
UNION ALL
SELECT 4, -1.0, '3'
UNION ALL
SELECT 5, 8.0, '5';

Doris3.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');

-- 说明：score 字段期望 >1 且 <10；category 枚举值期望 in '1,2,3'
-- 符合且关系（两者均满足）的记录：id=1(score=5,category=2)、id=3(score=3,category=1)
-- 不符合的记录：id=2(score=15越界)、id=4(score=-1越界)、id=5(category=5不在枚举)
3) 数据表 test_db.quality_test_num 不符合规则的记录为 id=2(score=15)、id=4(score=-1)、id=5(category=5)
4) 质量报告中取值范围&枚举范围规则行操作列显示【查看详情】链接
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 校验结果查询】页面，等待列表加载完成 | 校验结果查询页面正常打开，列表加载完成，无报错 |
| 2 | 在列表中找到任务 task_15695_and 对应的规则【取值范围&枚举范围】行，点击操作列【查看详情】链接 | 明细数据页面正常打开 |
| 3 | 在明细数据页面中查看数据列表的字段展示情况和记录内容 | 明细数据展示如下：<br>1) 数据列表保留全部字段（id、score、category 均显示）<br>2) 校验字段 score 以标红方式展示（红色背景或红色字体）<br>3) 列表中仅包含不符合规则的记录（id=2、id=4、id=5），共 3 条<br>4) 符合规则的记录（id=1、id=3）不出现在明细中 |
| 4 | 切换至 doris3.x 数据源，按相同表、规则包和配置重复以上步骤。 | 切换至 doris3.x 数据源重复以上步骤后，校验结果列表、实例详情与 sparkthrift2.x 场景一致。 |

##### 【P1】验证取值范围&枚举范围规则校验不通过时下载明细数据中校验字段标红展示

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 任务 task_15695_and 明细数据页面已打开，数据列表已显示不通过记录（id=2、id=4、id=5）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 校验结果查询】页面，找到任务 task_15695_and 对应的取值范围&枚举范围规则明细页 | 明细数据页面正常打开，数据加载完成 |
| 2 | 点击【下载明细】按钮，等待文件下载完成 | 浏览器触发文件下载 |
| 3 | 打开下载的明细文件（Excel 格式），查看 score 字段列的单元格格式及颜色标注 | 下载文件展示如下：<br>1) 文件可正常打开，包含所有字段列（id、score、category）<br>2) score 字段列中不符合规则记录对应单元格以红色背景或红色字体标红展示<br>3) 文件中记录数为 3 条（id=2、id=4、id=5），与页面明细列表数量一致 |

##### 【P1】验证取值范围&枚举范围规则校验通过时不记录明细数据且操作列不显示查看详情

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 规则任务 task_15695_or 已执行完成，或关系下全部记录均满足，校验结果为通过
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 校验结果查询】页面，等待列表加载完成 | 校验结果查询页面正常打开，列表加载完成，无报错 |
| 2 | 在列表中找到任务 task_15695_or 对应的规则【取值范围&枚举范围】行，查看质检结果列、详情说明列和操作列内容 | 质量报告中该规则行显示如下：<br>1) 质检结果列显示「校验通过」<br>2) 详情说明列显示「符合规则"取值范围>1"或"枚举值in '1,2,3'"」<br>3) 操作列不显示【查看详情】链接（显示 --），明细数据不可访问 |

### 数据质量报告

#### 枚举值单独使用时质量报告说明

##### 【P1】验证仅配置枚举值in校验通过时质量报告详情说明使用枚举值独立说明模板

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已分别在 SparkThrift2.x 与 Doris3.x 数据源中准备同名测试表及数据：
SparkThrift2.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_enum_pass;
CREATE TABLE test_db.quality_test_enum_pass (
  id INT,
  category STRING
) STORED AS PARQUET;
INSERT INTO TABLE test_db.quality_test_enum_pass
SELECT 1, '1'
UNION ALL
SELECT 2, '2'
UNION ALL
SELECT 3, '3';

Doris3.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_enum_pass;
CREATE TABLE test_db.quality_test_enum_pass (
  id INT NOT NULL,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_enum_pass VALUES (1, '1'), (2, '2'), (3, '3');

-- 说明：category 全量命中枚举值 in 1,2,3，用于验证通过态报告表现
3) 已通过【数据质量 → 规则集管理】创建规则集"ruleset_15695_enum_pass"并配置仅枚举值规则（category in '1,2,3'，强规则），规则包名称"枚举通过包"
4) 已通过【数据质量 → 规则任务管理】创建任务"task_15695_enum_pass"，通过【导入规则包】导入"ruleset_15695_enum_pass"的"枚举通过包"，已执行完成且校验结果为通过
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 数据质量报告】页面，等待报告列表加载完成 | 数据质量报告页面正常打开，报告列表加载完成，无报错 |
| 2 | 找到任务 task_15695_enum_pass 对应的枚举值规则行，查看详情说明列内容 | 详情说明列显示「字段枚举值不存在约定范围外的值，符合规则"枚举值in '1,2,3'"」，不显示取值范围相关说明 |
| 3 | 切换至 doris3.x 数据源，按相同表、规则包和配置重复以上步骤。 | 切换至 doris3.x 数据源重复以上步骤后，质量报告结果与详情展示与 sparkthrift2.x 场景一致。 |

##### 【P1】验证仅配置枚举值in校验不通过时质量报告详情说明包含越界值数量统计

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已分别在 SparkThrift2.x 与 Doris3.x 数据源中准备同名测试表及数据：
SparkThrift2.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT,
  score DOUBLE,
  category STRING
) STORED AS PARQUET;
INSERT INTO TABLE test_db.quality_test_num
SELECT 1, 5.0, '2'
UNION ALL
SELECT 2, 15.0, '4'
UNION ALL
SELECT 3, 3.0, '1'
UNION ALL
SELECT 4, -1.0, '3'
UNION ALL
SELECT 5, 8.0, '5';

Doris3.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');

-- 说明：score 字段期望 >1 且 <10；category 枚举值期望 in '1,2,3'
-- 符合且关系（两者均满足）的记录：id=1(score=5,category=2)、id=3(score=3,category=1)
-- 不符合的记录：id=2(score=15越界)、id=4(score=-1越界)、id=5(category=5不在枚举)
3) 已通过【数据质量 → 规则集管理】创建规则集"ruleset_15695_enum_fail"并配置仅枚举值规则（category in '1,2,3'，强规则），规则包名称"枚举失败包"
4) 已通过【数据质量 → 规则任务管理】创建任务"task_15695_enum_fail"，通过【导入规则包】导入"ruleset_15695_enum_fail"的"枚举失败包"，已执行完成且校验结果为不通过
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 数据质量报告】页面，等待报告列表加载完成 | 数据质量报告页面正常打开，报告列表加载完成，无报错 |
| 2 | 找到任务 task_15695_enum_fail 对应的枚举值规则行，查看详情说明列内容 | 详情说明列显示「字段枚举值存在约定范围外的值，约定范围外的值的数量总计为2个，不符合规则"枚举值in '1,2,3'"」，操作列显示【查看详情】链接 |
| 3 | 切换至 doris3.x 数据源，按相同表、规则包和配置重复以上步骤。 | 切换至 doris3.x 数据源重复以上步骤后，质量报告结果与详情展示与 sparkthrift2.x 场景一致。 |

##### 【P1】验证仅配置枚举值not in校验不通过时质量报告详情说明展示not in规则描述

> 前置条件
```
1) 使用 admin 账号登录数据资产平台
2) 已分别在 SparkThrift2.x 与 Doris3.x 数据源中准备同名测试表及数据：
SparkThrift2.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT,
  score DOUBLE,
  category STRING
) STORED AS PARQUET;
INSERT INTO TABLE test_db.quality_test_num
SELECT 1, 5.0, '2'
UNION ALL
SELECT 2, 15.0, '4'
UNION ALL
SELECT 3, 3.0, '1'
UNION ALL
SELECT 4, -1.0, '3'
UNION ALL
SELECT 5, 8.0, '5';

Doris3.x 数据源建表及数据准备 SQL：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');

-- 说明：score 字段期望 >1 且 <10；category 枚举值期望 in '1,2,3'
-- 符合且关系（两者均满足）的记录：id=1(score=5,category=2)、id=3(score=3,category=1)
-- 不符合的记录：id=2(score=15越界)、id=4(score=-1越界)、id=5(category=5不在枚举)
3) 已通过【数据质量 → 规则集管理】创建规则集"ruleset_15695_enum_notin"并配置仅枚举值规则（category not in '4,5'，强规则），规则包名称"notin失败包"
4) 已通过【数据质量 → 规则任务管理】创建任务"task_15695_enum_notin_fail"，通过【导入规则包】导入"ruleset_15695_enum_notin"的"notin失败包"，已执行完成且校验结果为不通过
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 数据质量报告】页面，等待报告列表加载完成 | 数据质量报告页面正常打开，报告列表加载完成，无报错 |
| 2 | 找到任务 task_15695_enum_notin_fail 对应的枚举值规则行，查看详情说明列内容 | 详情说明列中规则描述部分显示「枚举值not in '4,5'」，约定范围外的值数量统计准确，操作列显示【查看详情】链接 |
| 3 | 切换至 doris3.x 数据源，按相同表、规则包和配置重复以上步骤。 | 切换至 doris3.x 数据源重复以上步骤后，质量报告结果与详情展示与 sparkthrift2.x 场景一致。 |