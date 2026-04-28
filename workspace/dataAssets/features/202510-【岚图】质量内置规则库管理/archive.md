---
suite_name: "【岚图】质量内置规则库管理"
description: "【岚图】质量内置规则库管理用例归档"
tags:
  - "多表"
  - "格式"
  - "占比"
  - "邮箱"
  - "数值"
  - "表级"
  - "完整性"
  - "字段级"
  - "统计性"
  - "有效性"
  - "固定值"
  - "唯一性"
  - "重复数"
  - "值检测"
  - "空值数"
prd_version: "v6.4.4"
dev_version:
  - "岚图汽车"
create_at: "2026-04-05"
status: "草稿"
origin: "csv"
case_count: 109
case_id: 9410
---

## 内置规则

### 完整性

#### 多表

##### 【P0】验证「多表数据对比」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「多表数据内容对比」2. 「规则解释」展示为「多表数据内容对比」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「多表」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「比较多个数据表之间的字段取值校验，可根据选择的主键按照多表之间主键相同的行数据进行对比判断」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「规则类型-多表」-「统计函数-多表数据内容对比」 查看「校验方法」 | 不展示「多表数据内容对比」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「多表数据内容对比」 |
| 8 | 「监控规则」配置如下：「规则类型」选择「多表数据内容对比」「字段」选择「id」「期望值」选择「<=100」「选择校验表主键」为「id」「选择对比表」-「对比表」选择「table2」「对比表字段」选择「id2」「期望值」选择「<=100」「选择判断关系」为「且」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P0】验证「多表行数比对」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「多表行数对比」2. 「规则解释」展示为「多表行数比对」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「多表」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「比较多个数据表之间的表行数差异」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「规则类型-多表」-「统计函数-多表行数比对」 查看「校验方法」 | 不展示「多表行数比对」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「多表行数比对」 |
| 8 | 「监控规则」配置如下：「规则类型」选择「多表数据行数对比」「选择对比表」-「对比表所属库」选择「databases2」「对比表」选择「table2」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

#### 字段级

##### 【P0】验证「字段值取值校验」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「字段值校验」2. 「规则解释」展示为「字段取值校验」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段值取值的校验，支持配置表内多个字段的取值校验，可配置字段值>/>=/</<=/=/!=/包含/不包含逻辑，若配置了多个字段支持设置字段之间的且或关系。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「规则类型-字段」-「统计函数-字段值校验」 查看「校验方法」 | 不展示「字段取值校验」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「字段取值校验」 |
| 8 | 「监控规则」配置如下：「规则类型」选择「字段级」「字段」选择「id」「统计函数」 选择「字段取值范围校验」「过滤条件」 输入「id < 100」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

### 统计性

#### 字段级

##### 【P0】验证异常值检测，Z- score置信区间」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「异常值检测」2. 「规则解释」展示为「异常值检测，Z- score置信区间」3. 「规则分类」展示为「统计性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段值置信区间的计算，可配置置信区间>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「统计性校验」-「统计函数-异常值检测」 查看「校验方法」 | 不展示「异常值检测，Z- score置信区间」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「异常值检测，Z- score置信区间」 |
| 8 | 「规则类型」选择「字段级」「统计函数」 选择「异常值检测」「过滤条件」 输入「id < 100」「校验方法」选择「Z-score置信区间」「期望值」选择「<1」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P0】验证「异常值检测，IQR离群点占比」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「异常值检测」2. 「规则解释」展示为「异常值检测，IQR离群点占比」3. 「规则分类」展示为「统计性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段值存在离群点的数量的占比计算，可配置离群点数占比>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「统计性校验」-「统计函数-异常值检测」 查看「校验方法」 | 不展示「异常值检测，IQR离群点占比」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「异常值检测，IQR离群点占比」 |
| 8 | 「规则类型」选择「字段级」「统计函数」 选择「异常值检测」「过滤条件」 输入「id < 100」「校验方法」选择「IQR离群点占比」「期望值」选择「<1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P0】验证「异常值检测，IQR离群点数量」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「异常值检测」2. 「规则解释」展示为「异常值检测，IQR离群点数量」3. 「规则分类」展示为「统计性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段值存在离群点的数量的计算，可配置离群点数>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「统计性校验」-「统计函数-异常值检测」 查看「校验方法」 | 不展示「异常值检测，IQR离群点数量」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「异常值检测，IQR离群点数量」 |
| 8 | 「规则类型」选择「字段级」「统计函数」 选择「异常值检测」「过滤条件」 输入「id < 100」「校验方法」选择「IQR离群点数量」「期望值」选择「<1」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

### 有效性

#### 字段级

##### 【P1】验证「格式-自定义正则-xxx(规则名称)」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「格式校验」2. 「规则解释」展示为「格式-自定义正则-xxx(规则名称)」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「校验字段值符合xxx(规则名称)的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-格式校验」 查看「校验方法」 | 不展示「格式-自定义正则-xxx(规则名称)」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「格式-自定义正则-xxx(规则名称)」 |
| 8 | 「字段」选择「id」「统计规则」 选择「格式校验-自定义正则」「校验格式」选择「占比」「期望值」 <10%「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P1】验证「格式-自定义正则-xxx(规则名称)」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「格式校验」2. 「规则解释」展示为「格式-自定义正则-xxx(规则名称)」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「校验字段值符合xxx(规则名称)的数量，可配置符合格式个数>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-格式校验」 查看「校验方法」 | 不展示「格式-自定义正则-xxx(规则名称)」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「格式-自定义正则-xxx(规则名称)」 |
| 8 | 「字段」选择「id」「统计规则」 选择「格式校验-自定义正则」「校验格式」选择「固定值」「期望值」 <10「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P1】验证「格式-日期格式datetime，占比」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「格式校验」2. 「规则解释」展示为「格式-日期格式datetime，占比」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「校验字段值符合日期格式datetime格式的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-格式校验」 查看「校验方法」 | 不展示「格式-日期格式datetime，占比」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「格式-日期格式datetime，占比」 |
| 8 | 「字段」选择「id」「统计规则」 选择「格式校验-日期格式datetime」「校验格式」选择「占比」「期望值」 <10%「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P1】验证「格式-日期格式datetime，固定值」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「格式校验」2. 「规则解释」展示为「格式-日期格式datetime，固定值」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「校验字段值符合日期格式date格式的数量，可配置符合格式个数>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-格式校验」 查看「校验方法」 | 不展示「格式-日期格式datetime，固定值」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「格式-日期格式datetime，固定值」 |
| 8 | 「字段」选择「id」「统计规则」 选择「格式校验-日期格式datetime」「校验格式」选择「固定值」「期望值」 <10「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P0】验证「格式-日期格式date，占比」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「格式校验」2. 「规则解释」展示为「格式-日期格式date，占比」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「校验字段值符合日期格式date格式的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-格式校验」 查看「校验方法」 | 不展示「格式-日期格式date，占比」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「格式-日期格式date，占比」 |
| 8 | 「字段」选择「id」「统计规则」 选择「格式校验-日期格式date」「校验格式」选择「占比」「期望值」 <10%「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P0】验证「格式-日期格式date，固定值」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「格式校验」2. 「规则解释」展示为「格式-日期格式date，固定值」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「校验字段值符合日期格式date格式的数量，可配置符合格式个数>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-格式校验」 查看「校验方法」 | 不展示「格式-日期格式date，固定值」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「格式-日期格式date，固定值」 |
| 8 | 「字段」选择「id」「统计规则」 选择「格式校验-日期格式date」「校验格式」选择「固定值」「期望值」 <10「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

### 唯一性

#### 多表

##### 【P0】验证「多表唯一性判断」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「多表唯一性检测」2. 「规则解释」展示为「多表唯一性判断」3. 「规则分类」展示为「唯一性」4. 「关联范围」展示为「多表」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「校验多张表的多个字段的唯一性判断。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「唯一性校验」-「统计函数-多表唯一性判断」 查看「校验方法」 | 不展示「多表唯一性检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「多表唯一性检测」 |
| 8 | 「监控规则」配置如下：「字段」选择「id」「统计函数」 选择「多表唯一性判断」「过滤条件」 输入「id < 100」「校验字段逻辑」选择「唯一」「选择对比表」选择「table2」「字段」选择「id」「校验字段逻辑」选择「唯一」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

### 有效性

#### 字段级

##### 【P2】验证「重复数，月度平均值波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「重复值检测」2. 「规则解释」展示为「重复数，月度平均值波动检测」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「重复数计算逻辑为，字段的值有2条记录以上是一样的，则记为1次，最后对总次数相加。针对字段重复数的月度平均值波动率校验，计算方法为｜（今日字段重复数-上月同天至昨日的平均字段重复数）｜/上月同天至昨日的平均字段重复数。可配置月度平均值波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-重复值检测」 查看「校验方法」 | 不展示「重复数，月度平均值波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「重复数，月度平均值波动检测」 |
| 8 | 「监控规则」配置如下：「字段」选择「id」「统计函数」 选择「重复数」「过滤条件」 输入「id < 100」「校验方法」选择「重复数，月度平均值波动检测」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「重复数，7天平均值波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「重复值检测」2. 「规则解释」展示为「重复数，7天平均值波动检测」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「重复数计算逻辑为，字段的值有2条记录以上是一样的，则记为1次，最后对总次数相加。针对字段重复数的7天平均值波动率校验，计算方法为｜（今日字段重复数-近7日平均字段重复数）｜/近7日平均字段重复数。可配置7天平均值波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-重复值检测」 查看「校验方法」 | 不展示「重复数，7天平均值波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「重复数，7天平均值波动检测」 |
| 8 | 「监控规则」配置如下：「字段」选择「id」「统计函数」 选择「重复数」「过滤条件」 输入「id < 100」「校验方法」选择「重复数，7天平均值波动检测」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「重复数，月度波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「重复值检测」2. 「规则解释」展示为「重复数，月度波动检测」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「重复数计算逻辑为，字段的值有2条记录以上是一样的，则记为1次，最后对总次数相加。针对字段重复数的月度波动率校验，计算方法为｜（今日字段重复数-上月同天字段重复数）｜/上月同天字段重复数。可配置月度波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-重复值检测」 查看「校验方法」 | 不展示「重复数，月度波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「重复数，月度波动检测」 |
| 8 | 「监控规则」配置如下：「字段」选择「id」「统计函数」 选择「重复数」「过滤条件」 输入「id < 100」「校验方法」选择「重复数，月度波动检测」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「重复数，7天波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「重复值检测」2. 「规则解释」展示为「重复数，7天波动检测」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「重复数计算逻辑为，字段的值有2条记录以上是一样的，则记为1次，最后对总次数相加。针对字段重复数的7天波动率校验，计算方法为｜（今日字段重复数-7日前字段重复数）｜/7日前字段重复数。可配置7天波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-重复值检测」 查看「校验方法」 | 不展示「重复数，7天波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「重复数，7天波动检测」 |
| 8 | 「监控规则」配置如下：「字段」选择「id」「统计函数」 选择「重复数」「过滤条件」 输入「id < 100」「校验方法」选择「重复数，7天波动检测」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「重复数，1天波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「重复值检测」2. 「规则解释」展示为「重复数，1天波动检测」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「重复数计算逻辑为，字段的值有2条记录以上是一样的，则记为1次，最后对总次数相加。针对字段重复数的1天波动率校验，计算方法为｜（今日字段重复数-昨日字段重复数）｜/昨日字段重复数。可配置1天波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-重复值检测」 查看「校验方法」 | 不展示「重复数，1天波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「重复数，1天波动检测」 |
| 8 | 「监控规则」配置如下：「字段」选择「id」「统计函数」 选择「重复数」「过滤条件」 输入「id < 100」「校验方法」选择「重复数，1天波动检测」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P0】验证「重复数，固定值」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「重复值检测」2. 「规则解释」展示为「重复数，固定值」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「重复数计算逻辑为，字段的值有2条记录以上是一样的，则记为1次，最后对总次数相加。针对字段重复数的数量校验，可配置字段重复数>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-重复值检测」 查看「校验方法」 | 不展示「重复数，固定值」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「重复数，固定值」 |
| 8 | 「监控规则」配置如下：「字段」选择「id」「统计函数」 选择「重复数」「过滤条件」 输入「id < 100」「校验方法」选择「重复数，固定值」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空值数，月度平均值波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「NULL值检测」2. 「规则解释」展示为「空值数，月度平均值波动检测」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空值数的月度平均值波动率校验，计算方法为｜（今日字段空值数-上月同天至昨日的平均字段空值数）｜/上月同天至昨日的平均字段空值数。可配置月度平均值波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-NULL值检测」 查看「校验方法」 | 不展示「空值数，月度平均值波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空值数，月度平均值波动检测」 |
| 8 | 「监控规则」配置如下：「字段」选择「id」「统计函数」 选择「空值数」「过滤条件」 输入「id < 100」「校验方法」选择「空值数，月度平均值波动检测」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空值数，7天平均值波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「NULL值检测」2. 「规则解释」展示为「空值数，7天平均值波动检测」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空值数的7天平均值波动率校验，计算方法为｜（今日字段空值数-近7日平均字段空值数）｜/近7日平均字段空值数。可配置7天平均值波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-NULL值检测」 查看「校验方法」 | 不展示「空值数，7天平均值波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空值数，7天平均值波动检测」 |
| 8 | 「监控规则」配置如下：「字段」选择「id」「统计函数」 选择「空值数」「过滤条件」 输入「id < 100」「校验方法」选择「空值数，7天平均值波动检测」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空值数，月度波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「NULL值检测」2. 「规则解释」展示为「空值数，月度波动检测」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空值数的月度波动率校验，计算方法为｜（今日字段空值数-上月同天字段空值数）｜/上月同天字段空值数。可配置月度波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-NULL值检测」 查看「校验方法」 | 不展示「空值数，月度波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空值数，月度波动检测」 |
| 8 | 「监控规则」配置如下：「字段」选择「id」「统计函数」 选择「空值数」「过滤条件」 输入「id < 100」「校验方法」选择「空值数，月度波动检测」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空值数，7天波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「NULL值检测」2. 「规则解释」展示为「空值数，7天波动检测」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空值数的7天波动率校验，计算方法为｜（今日字段空值数-7日前字段空值数）｜/7日前字段空值数。可配置7天波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-NULL值检测」 查看「校验方法」 | 不展示「空值数，7天波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空值数，7天波动检测」 |
| 8 | 「监控规则」配置如下：「字段」选择「id」「统计函数」 选择「空值数」「过滤条件」 输入「id < 100」「校验方法」选择「空值数，7天波动检测」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空值数，1天波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「NULL值检测」2. 「规则解释」展示为「空值数，1天波动检测」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空值数的1天波动率校验，计算方法为｜（今日字段空值数-昨日字段空值数）｜/昨日字段空值数。可配置1天波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-NULL值检测」 查看「校验方法」 | 不展示「空值数，1天波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空值数，1天波动检测」 |
| 8 | 「监控规则」配置如下：「字段」选择「id」「统计函数」 选择「空值数」「过滤条件」 输入「id < 100」「校验方法」选择「空值数，1天波动检测」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P0】验证「空值数，固定值」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「NULL值检测」2. 「规则解释」展示为「空值数，固定值」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空值数的数量校验，可配置字段空值数>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-NULL值检测」 查看「校验方法」 | 不展示「空值数，固定值」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空值数，固定值」 |
| 8 | 「监控规则」配置如下：「字段」选择「id」「统计函数」 选择「空值数」「过滤条件」 输入「id < 100」「校验方法」选择「固定值」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

### 唯一性

#### 字段级

##### 【P2】验证「重复率，月度平均值波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「重复值检测」2. 「规则解释」展示为「重复率，月度平均值波动检测」3. 「规则分类」展示为「唯一性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「重复率指重复值个数/总行数。针对字段重复率的月度平均值波动率校验，计算方法为｜（今日字段重复率-上月同天至昨日的平均字段重复率）｜/上月同天至昨日的平均字段重复率。可配置月度平均值波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「唯一性校验」-「统计函数-重复值检测」 查看「校验方法」 | 不展示「重复率，月度平均值波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「重复率，月度平均值波动检测」 |
| 8 | 「规则类型」选择「字段级」「统计函数」 选择「重复率」「过滤条件」 输入「id < 100」「校验方法」选择「重复率，月度平均值波动检测」「期望值」选择「<1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「重复率，7天平均值波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「重复值检测」2. 「规则解释」展示为「重复率，7天平均值波动检测」3. 「规则分类」展示为「唯一性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「重复率指重复值个数/总行数。针对字段重复率的7天平均值波动率校验，计算方法为｜（今日字段重复率-近7日平均字段重复率）｜/近7日平均字段重复率。可配置7天平均值波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「唯一性校验」-「统计函数-重复值检测」 查看「校验方法」 | 不展示「重复率，7天平均值波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「重复率，7天平均值波动检测」 |
| 8 | 「规则类型」选择「字段级」「统计函数」 选择「重复率」「过滤条件」 输入「id < 100」「校验方法」选择「重复率，7天平均值波动检测」「期望值」选择「<1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「重复率，月度波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「重复值检测」2. 「规则解释」展示为「重复率，月度波动检测」3. 「规则分类」展示为「唯一性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「重复率指重复值个数/总行数。针对字段重复率的月度波动率校验，计算方法为｜（今日字段重复率-上月同天字段重复率）｜/上月同天字段重复率。可配置月度波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「唯一性校验」-「统计函数-重复值检测」 查看「校验方法」 | 不展示「重复率，月度波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「重复率，月度波动检测」 |
| 8 | 「规则类型」选择「字段级」「统计函数」 选择「重复率」「过滤条件」 输入「id < 100」「校验方法」选择「重复率，月度波动检测」「期望值」选择「<1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「重复率，7天波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「重复值检测」2. 「规则解释」展示为「重复率，7天波动检测」3. 「规则分类」展示为「唯一性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「重复率指重复值个数/总行数。针对字段重复率的7天波动率校验，计算方法为｜（今日字段重复率-7日前字段重复率）｜/7日前字段重复率。可配置7天波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「唯一性校验」-「统计函数-重复值检测」 查看「校验方法」 | 不展示「重复率，7天波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「重复率，7天波动检测」 |
| 8 | 「规则类型」选择「字段级」「统计函数」 选择「重复率」「过滤条件」 输入「id < 100」「校验方法」选择「重复率，7天波动检测」「期望值」选择「<1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「重复率，1天波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「重复值检测」2. 「规则解释」展示为「重复率，1天波动检测」3. 「规则分类」展示为「唯一性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「重复率指重复值个数/总行数。针对字段重复率的1天波动率校验，计算方法为｜（今日字段重复率-昨日字段重复率）｜/昨日字段重复率。可配置1天波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「唯一性校验」-「统计函数-重复值检测」 查看「校验方法」 | 不展示「重复率，1天波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「重复率，1天波动检测」 |
| 8 | 「规则类型」选择「字段级」「统计函数」 选择「重复率」「过滤条件」 输入「id < 100」「校验方法」选择「重复率，1天波动检测」「期望值」选择「<1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P0】验证「重复率，固定值」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「重复值检测」2. 「规则解释」展示为「重复率，固定值」3. 「规则分类」展示为「唯一性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「重复率指重复值个数/总行数。针对字段重复率的数量校验，可配置字段重复率>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「唯一性校验」-「统计函数-重复值检测」 查看「校验方法」 | 不展示「重复率，固定值」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「重复率，固定值」 |
| 8 | 「规则类型」选择「字段级」「统计函数」 选择「重复率」「过滤条件」 输入「id < 100」「校验方法」选择「固定值」「期望值」选择「<1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「重复数，月度平均值波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「重复值检测」2. 「规则解释」展示为「重复数，月度平均值波动检测」3. 「规则分类」展示为「唯一性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「重复数计算逻辑为，字段的值有2条记录以上是一样的，则记为1次，最后对总次数相加。针对字段重复数的月度平均值波动率校验，计算方法为｜（今日字段重复数-上月同天至昨日的平均字段重复数）｜/上月同天至昨日的平均字段重复数。可配置月度平均值波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「唯一性校验」-「统计函数-重复值检测」 查看「校验方法」 | 不展示「重复数，月度平均值波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「重复数，月度平均值波动检测」 |
| 8 | 「规则类型」选择「字段级」「统计函数」 选择「重复数」「过滤条件」 输入「id < 100」「校验方法」选择「重复数，月度平均值波动检测」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「重复数，7天平均值波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「重复值检测」2. 「规则解释」展示为「重复数，7天平均值波动检测」3. 「规则分类」展示为「唯一性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「重复数计算逻辑为，字段的值有2条记录以上是一样的，则记为1次，最后对总次数相加。针对字段重复数的7天平均值波动率校验，计算方法为｜（今日字段重复数-近7日平均字段重复数）｜/近7日平均字段重复数。可配置7天平均值波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「唯一性校验」-「统计函数-重复值检测」 查看「校验方法」 | 不展示「重复数，7天平均值波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「重复数，7天平均值波动检测」 |
| 8 | 「规则类型」选择「字段级」「统计函数」 选择「重复数」「过滤条件」 输入「id < 100」「校验方法」选择「重复数，7天平均值波动检测」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「重复数，月度波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「重复值检测」2. 「规则解释」展示为「重复数，月度波动检测」3. 「规则分类」展示为「唯一性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「重复数计算逻辑为，字段的值有2条记录以上是一样的，则记为1次，最后对总次数相加。针对字段重复数的月度波动率校验，计算方法为｜（今日字段重复数-上月同天字段重复数）｜/上月同天字段重复数。可配置月度波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「唯一性校验」-「统计函数-重复值检测」 查看「校验方法」 | 不展示「重复数，月度波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「重复数，月度波动检测」 |
| 8 | 「规则类型」选择「字段级」「统计函数」 选择「重复数」「过滤条件」 输入「id < 100」「校验方法」选择「重复数，月度波动检测」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「重复数，7天波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「重复值检测」2. 「规则解释」展示为「重复数，7天波动检测」3. 「规则分类」展示为「唯一性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「重复数计算逻辑为，字段的值有2条记录以上是一样的，则记为1次，最后对总次数相加。针对字段重复数的7天波动率校验，计算方法为｜（今日字段重复数-7日前字段重复数）｜/7日前字段重复数。可配置7天波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「唯一性校验」-「统计函数-重复值检测」 查看「校验方法」 | 不展示「重复数，7天波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「重复数，7天波动检测」 |
| 8 | 「规则类型」选择「字段级」「统计函数」 选择「重复数」「过滤条件」 输入「id < 100」「校验方法」选择「重复数，7天波动检测」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「重复数，1天波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「重复值检测」2. 「规则解释」展示为「重复数，1天波动检测」3. 「规则分类」展示为「唯一性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「重复数计算逻辑为，字段的值有2条记录以上是一样的，则记为1次，最后对总次数相加。针对字段重复数的1天波动率校验，计算方法为｜（今日字段重复数-昨日字段重复数）｜/昨日字段重复数。可配置1天波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「唯一性校验」-「统计函数-重复值检测」 查看「校验方法」 | 不展示「重复数，1天波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「重复数，1天波动检测」 |
| 8 | 「规则类型」选择「字段级」「统计函数」 选择「重复数」「过滤条件」 输入「id < 100」「校验方法」选择「重复数，1天波动检测」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P0】验证「重复数，固定值」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「重复值检测」2. 「规则解释」展示为「重复数，固定值」3. 「规则分类」展示为「唯一性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「重复数计算逻辑为，字段的值有2条记录以上是一样的，则记为1次，最后对总次数相加。针对字段重复数的数量校验，可配置字段重复数>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「唯一性校验」-「统计函数-重复值检测」 查看「校验方法」 | 不展示「重复数，固定值」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「重复数，固定值」 |
| 8 | 「规则类型」选择「字段级」「统计函数」 选择「重复数」「过滤条件」 输入「id < 100」「校验方法」选择「固定值」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

### 有效性

#### 枚举值

##### 【P2】验证「固定值」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「数值枚举个数」2. 「规则解释」展示为「枚举值」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「校验字段值中的枚举范围，支持配置多个枚举值」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-枚举值」 查看「校验方法」 | 不展示「枚举值」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「枚举值」 |
| 8 | 「字段」选择「id」「统计规则」 选择「枚举值」「期望值」 <10「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

#### 字段级

##### 【P2】验证「数据精度，固定值」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「数值枚举个数」2. 「规则解释」展示为「数据精度，固定值」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「校验字段值中数据精度，可配置小数点前最大位数、小数点后最大位数。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-数据精度」 查看「校验方法」 | 不展示「数据精度，固定值」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「数据精度，固定值」 |
| 8 | 「字段」选择「id」「统计规则」 选择「数据精度」「校验格式」选择「固定值」「期望值」 <10「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「字符串长度，固定值」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「字段长度」2. 「规则解释」展示为「字符串长度，固定值」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「校验字符串长度范围，可配置长度>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-字段长度」 查看「校验方法」 | 不展示「字符串长度，固定值」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「字符串长度，固定值」 |
| 8 | 「字段」选择「id」「统计规则」 选择「字段长度-字符串长度」「校验格式」选择「固定值」「期望值」 <10「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「格式-手机号，占比」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「格式校验」2. 「规则解释」展示为「格式-手机号，占比」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「校验字段值符合手机号格式的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-格式校验」 查看「校验方法」 | 不展示「格式-手机号，占比」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「格式-手机号，占比」 |
| 8 | 「字段」选择「id」「统计规则」 选择「格式校验-手机号」「校验格式」选择「占比」「期望值」 <10%「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「格式-手机号，固定值」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「格式校验」2. 「规则解释」展示为「格式-手机号，固定值」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「校验字段值符合手机号格式的数量，可配置符合格式个数>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-格式校验」 查看「校验方法」 | 不展示「格式-手机号，固定值」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「格式-手机号，固定值」 |
| 8 | 「字段」选择「id」「统计规则」 选择「格式校验-手机号」「校验格式」选择「固定值」「期望值」 <10「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「格式-邮箱，占比」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「格式校验」2. 「规则解释」展示为「格式-邮箱，占比」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「校验字段值符合邮箱格式的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-格式校验」 查看「校验方法」 | 不展示「格式-邮箱，占比」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「格式-邮箱，占比」 |
| 8 | 「字段」选择「id」「统计规则」 选择「格式校验-邮箱」「校验格式」选择「占比」「期望值」 <10%「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「格式-邮箱，固定值」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「格式校验」2. 「规则解释」展示为「格式-邮箱，固定值」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「校验字段值符合邮箱格式的数量，可配置符合格式个数>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-格式校验」 查看「校验方法」 | 不展示「格式-邮箱，固定值」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「格式-邮箱，固定值」 |
| 8 | 「字段」选择「id」「统计规则」 选择「格式校验-邮箱」「校验格式」选择「固定值」「期望值」 <10「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「格式-身份证号，占比」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「格式校验」2. 「规则解释」展示为「格式-身份证号，占比」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「校验字段值符合身份证号格式的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-格式校验」 查看「校验方法」 | 不展示「格式-身份证号，占比」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「格式-身份证号，占比」 |
| 8 | 「字段」选择「id」「统计规则」 选择「格式校验-身份证号」「校验格式」选择「占比」「期望值」 <10%「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P0】验证「格式-身份证号，固定值」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「格式校验」2. 「规则解释」展示为「格式-身份证号，固定值」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「校验字段值符合身份证号格式的数量，可配置符合格式个数>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-格式校验」 查看「校验方法」 | 不展示「格式-身份证号，固定值」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「格式-身份证号，固定值」 |
| 8 | 「字段」选择「id」「统计规则」 选择「格式校验-身份证号」「校验格式」选择「格式-身份证号，固定值」「期望值」 <10「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「数值-枚举个数，月度平均值波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「数值枚举个数」2. 「规则解释」展示为「数值-枚举个数，月度平均值波动检测」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「枚举个数表示，校验字段值中存在的枚举数量，用count(distinct{fieldName})计算。针对字段求枚举个数后的月度平均值波动率校验，计算方法为｜（今日字段值枚举个数-上月同天至昨日的平均字段值枚举个数）｜/上月同天至昨日的平均字段值枚举个数。可配置月度平均值波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-数值枚举个数」 查看「校验方法」 | 不展示「数值-枚举个数，月度平均值波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「数值-枚举个数，月度平均值波动检测」 |
| 8 | 「字段」选择「id」「统计规则」 选择「数值-枚举个数」「校验格式」选择「数值-枚举个数，月度平均值波动检测」「期望值」 <10「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「数值-枚举个数，7天平均值波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「数值枚举个数」2. 「规则解释」展示为「数值-枚举个数，7天平均值波动检测」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「枚举个数表示，校验字段值中存在的枚举数量，用count(distinct{fieldName})计算。针对字段求枚举个数后的7天平均值波动率校验，计算方法为｜（今日字段值枚举个数-近7日平均字段值枚举个数）｜/近7日平均字段值枚举个数。可配置7天平均值波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-数值枚举个数」 查看「校验方法」 | 不展示「数值-枚举个数，7天平均值波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「数值-枚举个数，7天平均值波动检测」 |
| 8 | 「字段」选择「id」「统计规则」 选择「数值-枚举个数」「校验格式」选择「数值-枚举个数，7天平均值波动检测」「期望值」 <10「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「数值-枚举个数，月度波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「数值枚举个数」2. 「规则解释」展示为「数值-枚举个数，月度波动检测」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「枚举个数表示，校验字段值中存在的枚举数量，用count(distinct{fieldName})计算。针对字段求枚举个数后的月度波动率校验，计算方法为｜（今日字段值枚举个数-上月同天字段值枚举个数）｜/上月同天字段值枚举个数。可配置月度波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-数值枚举个数」 查看「校验方法」 | 不展示「数值-枚举个数，月度波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「数值-枚举个数，月度波动检测」 |
| 8 | 「字段」选择「id」「统计规则」 选择「数值-枚举个数」「校验格式」选择「数值-枚举个数，月度波动检测」「期望值」 <10「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「数值-枚举个数，7天波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「数值枚举个数」2. 「规则解释」展示为「数值-枚举个数，7天波动检测」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「枚举个数表示，校验字段值中存在的枚举数量，用count(distinct{fieldName})计算。针对字段求枚举个数后的7天波动率校验，计算方法为｜（今日字段值枚举个数-7日前字段值枚举个数）｜/7日前字段值枚举个数。可配置7天波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-数值枚举个数」 查看「校验方法」 | 不展示「数值-枚举个数，7天波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「数值-枚举个数，7天波动检测」 |
| 8 | 「字段」选择「id」「统计规则」 选择「数值-枚举个数」「校验格式」选择「数值-枚举个数，7天波动检测」「期望值」 <10「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「数值-枚举个数，1天波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「数值枚举个数」2. 「规则解释」展示为「数值-枚举个数，1天波动检测」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「枚举个数表示，校验字段值中存在的枚举数量，用count(distinct{fieldName})计算。针对枚举个数的1天波动率校验，计算方法为｜（今日字段值枚举个数-昨日字段值枚举个数）｜/昨日字段值枚举个数。可配置1天波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-数值枚举个数」 查看「校验方法」 | 不展示「数值-枚举个数，1天波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「数值-枚举个数，1天波动检测」 |
| 8 | 「字段」选择「id」「统计规则」 选择「数值-枚举个数」「校验格式」选择「数值-枚举个数，1天波动检测」「期望值」 <10「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P0】验证「数值-枚举个数，固定值」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「数值枚举个数」2. 「规则解释」展示为「数值-枚举个数，固定值」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「枚举个数表示，校验字段值中存在的枚举数量，用count(distinct{fieldName})计算。可配置字段枚举个数>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-数值枚举个数」 查看「校验方法」 | 不展示「数值-枚举个数，固定值」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「数值-枚举个数，固定值」 |
| 8 | 「字段」选择「id」「统计规则」 选择「数值-枚举个数」「校验格式」选择「固定值」「期望值」 <10「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P0】验证「数值-取值范围」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「数值取值范围」2. 「规则解释」展示为「数值-取值范围」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段值的取值范围校验，可配置取值范围区间，支持>/>=/</<=/=/!=判断符。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」--「统计函数-数值枚举个数」 查看「校验方法」 | 不展示「数值-取值范围」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「数值-取值范围」 |
| 8 | 「字段」选择「id」「统计规则」 选择「数值-取值范围检测」「期望值」配置「>0 且 <100」「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

### 完整性

#### 字段级

##### 【P2】验证「空串数，月度平均值波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「空串检测」2. 「规则解释」展示为「空串数，月度平均值波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空串数的月度平均值波动率校验，计算方法为｜（今日字段空串数-上月同天至昨日的平均字段空串数）｜/上月同天至昨日的平均字段空串数。可配置月度平均值波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-空串检测」 查看「校验方法」 | 不展示「空串数，月度平均值波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空串数，月度平均值波动检测」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空串数」「过滤条件」 输入「id < 100」「校验方法」选择「空串数，月度平均值波动检测」「期望值」选择「<1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空串数，7天平均值波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「空串检测」2. 「规则解释」展示为「空串数，7天平均值波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空串数的7天平均值波动率校验，计算方法为｜（今日字段空串数-近7日平均字段空串数）｜/近7日平均字段空串数。可配置7天平均值波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-空串检测」 查看「校验方法」 | 不展示「空串数，7天平均值波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空串数，7天平均值波动检测」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空串数」「过滤条件」 输入「id < 100」「校验方法」选择「空串数，7天平均值波动检测」「期望值」选择「<1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空串数，月度波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「空串检测」2. 「规则解释」展示为「空串数，月度波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空串数的月度波动率校验，计算方法为｜（今日字段空串数-上月同天字段空串数）｜/上月同天字段空串数。可配置月度波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-空串检测」 查看「校验方法」 | 不展示「空串数，月度波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空串数，月度波动检测」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空串数」「过滤条件」 输入「id < 100」「校验方法」选择「空串数，月度波动检测」「期望值」选择「<1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空串数，7天波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「空串检测」2. 「规则解释」展示为「空串数，7天波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空串数的7天波动率校验，计算方法为｜（今日字段空串数-7日前字段空串数）｜/7日前字段空串数。可配置7天波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-空串检测」 查看「校验方法」 | 不展示「空串数，7天波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空串数，7天波动检测」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空串数」「过滤条件」 输入「id < 100」「校验方法」选择「空串数，7天波动检测」「期望值」选择「<1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空串数，1天波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「空串检测」2. 「规则解释」展示为「空串数，1天波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空串数的1天波动率校验，计算方法为｜（今日字段空串数-昨日字段空串数）｜/昨日字段空串数。可配置1天波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-空串检测」 查看「校验方法」 | 不展示「空串数，1天波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空串数，1天波动检测」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空串数」「过滤条件」 输入「id < 100」「校验方法」选择「空串数，1天波动检测」「期望值」选择「<1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P0】验证「空串数，固定值」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「空串检测」2. 「规则解释」展示为「空串数，固定值」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空串数的数量校验，可配置字段空串数>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-空串检测」 查看「校验方法」 | 不展示「空串数，固定值」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空串数，固定值」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空串数」「过滤条件」 输入「id < 100」「校验方法」选择「空串数，固定值」「期望值」选择「<1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空串率，月度平均值波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「空串检测」2. 「规则解释」展示为「空串率，月度平均值波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空串率的月度平均值波动率校验，计算方法为｜（今日字段空串率-上月同天至昨日的平均字段空串率）｜/上月同天至昨日的平均字段空串率。可配置月度平均值波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-空串检测」 查看「校验方法」 | 不展示「空串率，月度平均值波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空串率，月度平均值波动检测」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空串率」「过滤条件」 输入「id < 100」「校验方法」选择「空串率，月度平均值波动检测」「期望值」选择「>1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空串率，7天平均值波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「空串检测」2. 「规则解释」展示为「空串率，7天平均值波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空串率的7天平均值波动率校验，计算方法为｜（今日字段空串率-近7日平均字段空串率）｜/近7日平均字段空串率。可配置7天平均值波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-空串检测」 查看「校验方法」 | 不展示「空串率，7天平均值波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空串率，7天平均值波动检测」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空串率」「过滤条件」 输入「id < 100」「校验方法」选择「空串率，7天平均值波动检测」「期望值」选择「>1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空串率，月度波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「空串检测」2. 「规则解释」展示为「空串率，月度波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空串率的月度波动率校验，计算方法为｜（今日字段空串率-上月同天字段空串率）｜/上月同天字段空串率。可配置月度波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-空串检测」 查看「校验方法」 | 不展示「空串率，月度波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空串率，月度波动检测」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空串率」「过滤条件」 输入「id < 100」「校验方法」选择「空串率，月度波动检测」「期望值」选择「>1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空串率，7天波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「空串检测」2. 「规则解释」展示为「空串率，7天波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空串率的7天波动率校验，计算方法为｜（今日字段空串率-7日前字段空串率）｜/7日前字段空串率。可配置7天波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-空串检测」 查看「校验方法」 | 不展示「空串率，7天波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空串率，7天波动检测」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空串率」「过滤条件」 输入「id < 100」「校验方法」选择「空串率，7天波动检测」「期望值」选择「>1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空串率，1天波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「空串检测」2. 「规则解释」展示为「空串率，1天波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空串率的1天波动率校验，计算方法为｜（今日字段空串率-昨日字段空串率）｜/昨日字段空串率。可配置1天波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-空串检测」 查看「校验方法」 | 不展示「空串率，1天波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空串率，1天波动检测」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空串率」「过滤条件」 输入「id < 100」「校验方法」选择「空串率，1天波动检测」「期望值」选择「>1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P0】验证「空串率，固定值」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「空串检测」2. 「规则解释」展示为「空串率，固定值」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空串率的数量校验，可配置字段空串率>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-空串检测」 查看「校验方法」 | 不展示「空串率，固定值」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空串率，固定值」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空串率」「过滤条件」 输入「id < 100」「校验方法」选择「空串率，固定值」「期望值」选择「>1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空值率，月度平均值波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「NULL值检测」2. 「规则解释」展示为「空值率，月度平均值波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空值率的月度平均值波动率校验，计算方法为｜（今日字段空值率-上月同天至昨日的平均字段空值率）｜/上月同天至昨日的平均字段空值率。可配置月度平均值波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-NULL值检测」 查看「校验方法」 | 不展示「空值率，月度平均值波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空值率，月度平均值波动检测」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空值率」「过滤条件」 输入「id < 100」「校验方法」选择「空值率，7天平均值波动检测」「期望值」选择「<1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空值率，7天平均值波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「NULL值检测」2. 「规则解释」展示为「空值率，7天平均值波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空值率的7天平均值波动率校验，计算方法为｜（今日字段空值率-近7日平均字段空值率）｜/近7日平均字段空值率。可配置7天平均值波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-NULL值检测」 查看「校验方法」 | 不展示「空值率，7天平均值波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空值率，7天平均值波动检测」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空值率」「过滤条件」 输入「id < 100」「校验方法」选择「空值率，7天平均值波动检测」「期望值」选择「<1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空值率，月度波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「NULL值检测」2. 「规则解释」展示为「空值率，月度波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空值率的月度波动率校验，计算方法为｜（今日字段空值率-上月同天字段空值率）｜/上月同天字段空值率。可配置月度波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-NULL值检测」 查看「校验方法」 | 不展示「空值率，月度波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空值率，月度波动检测」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空值率」「过滤条件」 输入「id < 100」「校验方法」选择「空值率，月度波动检测」「期望值」选择「<1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空值率，7天波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「NULL值检测」2. 「规则解释」展示为「空值率，7天波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空值率的7天波动率校验，计算方法为｜（今日字段空值率-7日前字段空值率）｜/7日前字段空值率。可配置7天波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-NULL值检测」 查看「校验方法」 | 不展示「空值率，7天波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空值率，7天波动检测」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空值率」「过滤条件」 输入「id < 100」「校验方法」选择「空值率，7天波动检测」「期望值」选择「<1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空值率，1天波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「NULL值检测」2. 「规则解释」展示为「空值率，1天波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空值率的1天波动率校验，计算方法为｜（今日字段空值率-昨日字段空值率）｜/昨日字段空值率。可配置1天波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-NULL值检测」 查看「校验方法」 | 不展示「空值率，1天波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空值率，1天波动检测」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空值率」「过滤条件」 输入「id < 100」「校验方法」选择「空值率，1天波动检测」「期望值」选择「<1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P0】验证「空值率，固定值」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「NULL值检测」2. 「规则解释」展示为「空值率，固定值」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空值率的数量校验，可配置字段空值率>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-NULL值检测」 查看「校验方法」 | 不展示「空值率，固定值」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空值率，固定值」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空值率」「过滤条件」 输入「id < 100」「校验方法」选择「固定值」「期望值」选择「<1%」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空值数，月度平均值波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「NULL值检测」2. 「规则解释」展示为「空值数，月度平均值波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空值数的月度平均值波动率校验，计算方法为｜（今日字段空值数-上月同天至昨日的平均字段空值数）｜/上月同天至昨日的平均字段空值数。可配置月度平均值波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-NULL值检测」 查看「校验方法」 | 不展示「空值数，月度平均值波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空值数，月度平均值波动检测」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空值数」「过滤条件」 输入「id < 100」「校验方法」选择「空值数，月度平均值波动检测」「期望值」选择「<=0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空值数，7天平均值波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「NULL值检测」2. 「规则解释」展示为「空值数，7天平均值波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空值数的7天平均值波动率校验，计算方法为｜（今日字段空值数-近7日平均字段空值数）｜/近7日平均字段空值数。可配置7天平均值波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-NULL值检测」 查看「校验方法」 | 不展示「空值数，7天平均值波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空值数，7天平均值波动检测」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空值数」「过滤条件」 输入「id < 100」「校验方法」选择「空值数，7天平均值波动检测」「期望值」选择「<=0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空值数，月度波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「NULL值检测」2. 「规则解释」展示为「空值数，月度波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空值数的月度波动率校验，计算方法为｜（今日字段空值数-上月同天字段空值数）｜/上月同天字段空值数。可配置月度波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-NULL值检测」 查看「校验方法」 | 不展示「空值数，月度波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空值数，月度波动检测」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空值数」「过滤条件」 输入「id < 100」「校验方法」选择「空值数，月度波动检测」「期望值」选择「<=0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空值数，7天波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「NULL值检测」2. 「规则解释」展示为「空值数，7天波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空值数的7天波动率校验，计算方法为｜（今日字段空值数-7日前字段空值数）｜/7日前字段空值数。可配置7天波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-NULL值检测」 查看「校验方法」 | 不展示「空值数，7天波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空值数，7天波动检测」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空值数」「过滤条件」 输入「id < 100」「校验方法」选择「空值数，7天波动检测」「期望值」选择「<=0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「空值数，1天波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「NULL值检测」2. 「规则解释」展示为「空值数，1天波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空值数的1天波动率校验，计算方法为｜（今日字段空值数-昨日字段空值数）｜/昨日字段空值数。可配置1天波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-NULL值检测」 查看「校验方法」 | 不展示「空值数，1天波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空值数，1天波动检测」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空值数」「过滤条件」 输入「id < 100」「校验方法」选择「1天波动检测」「期望值」选择「<=0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P0】验证「空值数，固定值」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「NULL值检测」2. 「规则解释」展示为「空值数，固定值」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对字段空值数的数量校验，可配置字段空值数>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「统计函数-NULL值检测」 查看「校验方法」 | 不展示「空值数，固定值」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「空值数，固定值」 |
| 8 | 「校验类型」选择「单表」「规则类型」选择「字段级」「统计函数」 选择「空值数」「过滤条件」 输入「id < 100」「校验方法」选择「固定值」「期望值」选择「<=0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

#### 表级

##### 【P2】验证「表行数，月度平均值波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「表行数检测」2. 「规则解释」展示为「表行数，月度平均值波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「表级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对表行数的月度平均值波动率校验，计算方法为｜（今日表行数-上月同天至昨日的平均表行数）｜/上月同天至昨日的平均表行数。可配置月度平均值波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「规则类型-单表」-「统计函数-表行数」 查看「校验方法」 | 不展示「表行数，月度平均值波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「表行数，月度平均值波动检测」 |
| 8 | 「监控规则」配置如下：「校验类型」选择「单表」「规则类型」选择「表级」「统计函数」 选择「表行数」「过滤条件」 输入「id < 100」「校验方法」选择「表行数，月度平均值波动检测」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「表行数，7天平均值波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「表行数检测」2. 「规则解释」展示为「表行数，7天平均值波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「表级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对表行数的7天平均值波动率校验，计算方法为｜（今日表行数-近7日平均表行数）｜/近7日平均表行数。可配置7天平均值波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「规则类型-单表」-「统计函数-表行数」 查看「校验方法」 | 不展示「表行数，7天平均值波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「表行数，7天平均值波动检测」 |
| 8 | 「监控规则」配置如下：「校验类型」选择「单表」「规则类型」选择「表级」「统计函数」 选择「表行数」「过滤条件」 输入「id < 100」「校验方法」选择「表行数，7天平均值波动检测」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「表行数，月度波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「表行数检测」2. 「规则解释」展示为「表行数，月度波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「表级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对表行数的月度波动率校验，计算方法为｜（今日表行数-上月同天表行数）｜/上月同天表行数。可配置月度波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「规则类型-单表」-「统计函数-表行数」 查看「校验方法」 | 不展示「表行数，月度波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「表行数，月度波动检测」 |
| 8 | 「监控规则」配置如下：「校验类型」选择「单表」「规则类型」选择「表级」「统计函数」 选择「表行数」「过滤条件」 输入「id < 100」「校验方法」选择「表行数，月度波动检测」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「表行数，7天波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「表行数检测」2. 「规则解释」展示为「表行数，7天波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「表级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对表行数的7天波动率校验，计算方法为｜（今日表行数-7日前表行数）｜/7日前表行数。可配置7天波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「规则类型-单表」-「统计函数-表行数」 查看「校验方法」 | 不展示「表行数，7天波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「表行数，7天波动检测」 |
| 8 | 「监控规则」配置如下：「校验类型」选择「单表」「规则类型」选择「表级」「统计函数」 选择「表行数」「过滤条件」 输入「id < 100」「校验方法」选择「表行数，7天波动检测」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P2】验证「表行数，1天波动检测」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「表行数检测」2. 「规则解释」展示为「表行数，1天波动检测」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「表级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对表行数的1天波动率校验，计算方法为｜（今日表行数-昨日表行数）｜/昨日表行数。可配置1天波动率>/>=/</<=/=/!=某个百分比。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「规则类型-单表」-「统计函数-表行数」 查看「校验方法」 | 不展示「表行数，1天波动检测」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「表行数，1天波动检测」 |
| 8 | 「监控规则」配置如下：「校验类型」选择「单表」「规则类型」选择「表级」「统计函数」 选择「表行数」「过滤条件」 输入「id < 100」「校验方法」选择「表行数，1天波动检测」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P0】验证「固定值」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「表行数检测」2. 「规则解释」展示为「表行数，固定值」3. 「规则分类」展示为「完整性」4. 「关联范围」展示为「表级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「针对表行数的数量校验，可配置表行数>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「完整性校验」-「规则类型-单表」-「统计函数-表行数」 查看「校验方法」 | 不展示「固定值」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「固定值」 |
| 8 | 「监控规则」配置如下：「校验类型」选择「单表」「规则类型」选择「表级」「统计函数」 选择「表行数」「过滤条件」 输入「id < 100」「校验方法」选择「固定值」「期望值」选择「>0」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

### 统计性校验

##### 【P1】验证「校验方法」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「统计性」-「统计函数」-「异常值检测，IQR离群点数量」「异常值检测，IQR离群点占比」「异常值检测，Z- score置信区间」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，点击「添加规则」下拉框 | 不展示「统计性校验」 |
| 4 | 在「内置规则」中开启任一「统计性」-「统计函数」-「异常值检测，IQR离群点数量」「异常值检测，IQR离群点占比」「异常值检测，Z- score置信区间」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「统计性校验」规则，选择「统计函数」，点击「校验方法」下拉框 | 展示「统计性」-「校验方法」-「异常值检测，IQR离群点数量」「异常值检测，IQR离群点占比」「异常值检测，Z- score置信区间」可选项 |

##### 【P1】验证「统计函数」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「统计性」-「统计函数」-「异常值检测」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，点击「添加规则」下拉框 | 不展示「统计性校验」选项 |
| 4 | 在「内置规则」中开启任一「统计性」-「统计函数」-「异常值检测」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「统计性校验」规则，点击「统计函数」下拉框 | 展示「统计性」-「统计函数」-「异常值检测」可选项 |

### 有效性校验

##### 【P1】验证「校验方法」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「有效性」-「校验方法」-「占比」「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，添加「有效性校验」规则，选择「字段」，点击「统计规则」下拉框 | 不展示「有效性」-「校验方法」-「占比」「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」可选项 |
| 4 | 在「内置规则」中开启任一「有效性」-「校验方法」-「占比」「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「有效性校验」规则，选择「字段」，点击「统计规则」下拉框 | 展示「有效性」-「校验方法」-「占比」「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」可选项 |

##### 【P1】验证「统计函数」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「有效性」-「统计函数」-「数值取值范围」「数值枚举个数」「格式校验」「字段长度」「数据精度」「枚举值」「NULL值检测」「重复值检测」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，点击「添加规则」下拉框 | 不展示「有效性校验」选项 |
| 4 | 在「内置规则」中开启任一「有效性」-「统计函数」-「数值取值范围」「数值枚举个数」「格式校验」「字段长度」「数据精度」「枚举值」「NULL值检测」「重复值检测」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「有效性校验」规则，点击「统计函数」下拉框 | 展示「有效性」-「统计函数」-「数值取值范围」「数值枚举个数」「格式校验」「字段长度」「数据精度」「枚举值」「NULL值检测」「重复值检测」可选项 |

### 唯一性校验

##### 【P1】验证「校验方法」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「唯一性」-「校验方法」-「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，添加「唯一性校验」规则，点击「统计函数」下拉框 | 不展示「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」可选项 |
| 4 | 在「内置规则」中开启任一「唯一性」-「校验方法」-「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「唯一性校验」规则，点击「统计函数」下拉框 | 不展示「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」可选项 |

##### 【P1】验证「统计函数」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「唯一性」-「统计函数」-「重复数」「重复率」「多表唯一性判断」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，点击「添加规则」下拉框 | 不展示「唯一性校验」可选项 |
| 4 | 在「内置规则」中开启任一「唯一性」-「统计函数」-「重复数」「重复率」「多表唯一性判断」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「唯一性校验」规则，点击「统计函数」下拉框 | 展示「统计函数」-「重复数」「重复率」「多表唯一性判断」可选项 |

### 完整性校验

##### 【P1】验证「校验方法」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「完整性」-「校验方法」-「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，添加「完整性校验」规则，选择「规则类型」为「单表」或「字段」，点击「统计函数」下拉框 | 「规则类型」只展示「字段」，「统计函数」下拉框只展示「字段取值校验」 |
| 4 | 在「内置规则」中开启任一「完整性」-「校验方法」-「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「完整性校验」规则，选择「规则类型」为「单表」或「字段」，点击「统计函数」下拉框 | 展示「校验方法」-「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」可选项 |

##### 【P1】验证「统计函数」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「完整性」-「统计函数」-「空值数」「空值率」「空串数」「空串率」「字段取值范围校验」「表行数」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，添加「完整性校验」规则，选择「规则类型」 | 不展示任何关于「单表」和「字段」可选项 |
| 4 | 在「内置规则」中开启任一「完整性」-「统计函数」-「空值数」「空值率」「空串数」「空串率」「字段取值范围校验」「表行数」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「完整性校验」规则，选择「规则类型」为「单表」或「字段」，点击「统计函数」下拉框 | 展示「统计函数」-「空值数」「空值率」「空串数」「空串率」「字段取值范围校验」「表行数」可选项 |

#### 规则类型

##### 【P1】验证「多表」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「完整性」-「规则类型」-「多表」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，添加「完整性校验」规则，点击「规则类型」下拉框 | 不展示「多表」选项 |
| 4 | 在「内置规则」中开启任一「完整性」-「规则类型」-「多表」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「完整性校验」规则，点击「规则类型」下拉框 | 展示「多表」选项 |

##### 【P1】验证「表级」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「完整性」-「规则类型」-「表级」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，添加「完整性校验」规则，点击「规则类型」下拉框 | 不展示「表级」选项 |
| 4 | 在「内置规则」中开启任一「完整性」-「规则类型」-「表级」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「完整性校验」规则，点击「规则类型」下拉框 | 展示「表级」选项 |

##### 【P1】验证「字段级」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「完整性」-「规则类型」-「字段级」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，添加「完整性校验」规则，点击「规则类型」下拉框 | 不展示「字段级」选项 |
| 4 | 在「内置规则」中开启任一「完整性」-「规则类型」-「字段级」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「完整性校验」规则，点击「规则类型」下拉框 | 展示「字段级」选项 |

##### 【P1】验证「统计性」相关规则均未开启时，「监控规则」模块展示正确

> 前置条件

```
所有统计性相关的规则均未关联子规则
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入页面成功 |
| 2 | 将所有统计性相关的规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则」配置页面 | 进入成功 |
| 4 | 鼠标hover「添加规则」按钮处 | 不展示「统计性校验」选项 |

##### 【P1】验证「唯一性」相关规则均未开启时，「监控规则」模块展示正确

> 前置条件

```
所有唯一性相关的规则均未关联子规则
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入页面成功 |
| 2 | 将所有唯一性相关的规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则」配置页面 | 进入成功 |
| 4 | 鼠标hover「添加规则」按钮处 | 不展示「唯一性校验」选项 |

##### 【P1】验证「有效性」相关规则均未开启时，「监控规则」模块展示正确

> 前置条件

```
所有有效性相关的规则均未关联子规则
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入页面成功 |
| 2 | 将所有有效性相关的规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则」配置页面 | 进入成功 |
| 4 | 鼠标hover「添加规则」按钮处 | 不展示「有效性校验」选项 |

##### 【P1】验证「完整性」相关规则均未开启时，「监控规则」模块展示正确

> 前置条件

```
所有完整性相关的规则均未关联子规则
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入页面成功 |
| 2 | 将所有完整性相关的规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则」配置页面 | 进入成功 |
| 4 | 鼠标hover「添加规则」按钮处 | 不展示「完整性校验」选项 |

### 关联规则数

##### 【P0】验证新增规则统计正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 新增「完整性」-「表级」-「表行数检测」-「固定值」校验规则A | 新增成功 |
| 3 | 查看「完整性」-「表级」-「表行数检测」-「固定值」-「关联规则数」 | 规则关联数统计+1 |
| 4 | 新增「统计性」-「字段级」-「异常值检测」-「IQR离群点数量」检验规则B | 新增成功 |
| 5 | 查看「统计性」-「字段级」-「异常值检测」-「IQR离群点数量」-「关联规则数」 | 规则关联数统计+1 |
| 6 | 新增「有效性」-「字段级」-「字段长度」-「固定值」检验规则C | 新增成功 |
| 7 | 查看「有效性」-「字段级」-「字段长度」-「固定值」-「关联规则数」 | 规则关联数统计+1 |
| 8 | 新增「唯一性」-「字段级」-「重复值检测」-「重复数-固定值」检验规则D | 新增成功 |
| 9 | 查看「唯一性」-「字段级」-「重复值检测」-「重复数-固定值」-「关联规则数」 | 规则关联数统计+1 |

##### 【P0】验证历史已配置规则统计正确

> 前置条件

```
1. 升级前已存在「完整性」-「表级」-「表行数检测」-「固定值」校验规则A
2. 升级前已存在「统计性」-「字段级」-「异常值检测」-「IQR离群点数量」检验规则B
3. 升级前已存在「有效性」-「字段级」-「多表唯一性检测」-「多表唯一性判断」规则C
4. 升级前已存在「唯一性」-「字段级」-「重复值检测」-「重复数-固定值」规则D
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看「完整性」-「表级」-「表行数检测」-「固定值」-「关联规则数」 | 历史规则统计正确 |
| 3 | 查看「统计性」-「字段级」-「异常值检测」-「IQR离群点数量」-「关联规则数」 | 历史规则统计正确 |
| 4 | 查看「有效性」-「字段级」-「字段长度」-「固定值」-「关联规则数」 | 历史规则统计正确 |
| 5 | 查看「唯一性」-「字段级」-「重复值检测」-「重复数-固定值」-「关联规则数」 | 历史规则统计正确 |

##### 【P1】验证筛选框联合查询功能正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 「规则分类」选择「完整性」「有效性」 | 选择成功 |
| 3 | 「关联范围」选择「表级」「字段级」 | 选择成功 |
| 4 | 「规则状态」选择「开启」 | 选择成功 |
| 5 | 联合查询 | 成功筛选出所有状态为开启的「完整性」+「有效性」的「表级」和「字段级」的规则 |

##### 【P2】验证「规则状态」筛选功能正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 点击「规则状态」筛选框 | 筛选框选项展示「开启」「关闭」选项 |
| 3 | 选择「开启」，确认 | 仅展示「开启」状态的规则 |
| 4 | 选择「关闭」，确认 | 仅展示「关闭」状态的规则 |
| 5 | 全部勾选，确认 | 展示所有规则 |
| 6 | 全部不勾选，确认 | 展示所有规则 |

##### 【P2】验证「关联范围」筛选功能正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 点击「关联范围」筛选框 | 筛选框选项展示「表级」「字段级」「多表」 |
| 3 | 选择「表级」，确认 | 仅展示「表级」相关规则 |
| 4 | 选择「字段级」，确认 | 仅展示「字段级」相关规则 |
| 5 | 选择「多表」，确认 | 仅展示「多表」相关规则 |
| 6 | 选择「表级」「多表」，确认 | 展示「表级」+「多表」相关规则 |
| 7 | 选择「字段级」+「多表」，确认 | 展示「字段级」+「多表」相关规则 |
| 8 | 勾选全部，确认 | 展示所有规则 |
| 9 | 所有均不勾选，确认 | 展示所有规则 |

##### 【P1】验证「规则分类」筛选功能正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 点击「规则分类」筛选框 | 筛选框选项展示「完整性」「唯一性」「有效性」「统计性」 |
| 3 | 选择「完整性」，确认 | 仅展示「完整性」相关规则 |
| 4 | 选择「唯一性」，确认 | 仅展示「唯一性」相关规则 |
| 5 | 选择「有效性」，确认 | 仅展示「有效性」相关规则 |
| 6 | 选择「统计性」，确认 | 仅展示「统计性」相关规则 |
| 7 | 选择「完整性」「统计性」，确认 | 展示「完整性」+「统计性」相关规则 |
| 8 | 选择「唯一性」「有效性」，确认 | 展示「唯一性」+「有效性」相关规则 |
| 9 | 选择「完整性」「唯一性」「有效性」「统计性」，确认 | 展示所有规则 |
| 10 | 全部不勾选，确认 | 展示所有规则 |

##### 【P2】验证「内置规则」页面分页器功能正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 点击分页器 | 展示10/20/50/100条/页 |
| 3 | 分别选择10/20/50/100 | 对应页面展示10/20/50/100条/页 |
| 4 | 点击<按钮 | 跳转到上一页 |
| 5 | 点击>按钮 | 跳转到下一页 |
| 6 | 搜索「规则」，然后分页 | 搜索后分页跳转等功能正常 |

##### 【P1】验证「内置规则」页面「导出规则库」功能正确

> 前置条件

```
公共管理页面已配置全局水印并勾选资产产品
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 点击「导出规则库」按钮 | 提示“请确认是否导出规则库” |
| 3 | 点击“取消” | 提示隐藏，不导出规则库数据 |
| 4 | 点击“确认” | 导出规则库数据，表命名为“内置规则库_currentTime()” |
| 5 | 查看内置规则库内容 | 1. 正确展示所有检测规则明细内容 |
| 6 | 子主题 6 | 2. 水印信息展示正确 |

##### 【P2】验证「内置规则」页面「规则名称」搜索功能正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 输入已存在的规则名称「表行数检测」，点击搜索 | 成功匹配出表行数相关所有的检测规则 |
| 3 | 输入不存在的规则名称「！@#¥%」，点击搜索 | 返回暂无数据缺省页 |
| 4 | 输入「行数」，点击搜索 | 模糊匹配出所有包含行数的检测规则 |
| 5 | 不输入内容，点击搜索 | 默认返回所有的校验规则 |
| 6 | 输入超长字符，点击搜索 | 提示字符超长 |

## 规则库配置

##### 【P2】验证「内置规则」页面UI展示正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 点击「内置规则」按钮 | 默认进入「内置规则」页面 |
| 3 | UI CHECK | 1. 展示「规则名称」搜索框2. 展示列「规则名称、规则解释、规则分类、关联范围、关联规则数、规则状态、规则描述」3. 展示按钮「导出规则库、分页器」4. 展示条件筛选框「规则分类、关联范围、规则状态」 |

##### 【P2】验证「规则库配置」页面新增「内置规则」Tab页

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」页面 | 进入成功 |
| 2 | 进入「规则任务配置」-「规则库配置」 | 进入成功 |
| 3 | 查看「规则库配置」页面 | 新增「内置规则」Tab页 |
