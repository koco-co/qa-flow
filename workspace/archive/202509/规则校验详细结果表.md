---
suite_name: "规则校验详细结果表"
description: "规则校验详细结果表用例归档"
tags:
  - "多表"
  - "占比"
  - "邮箱"
  - "数值"
  - "表级"
  - "字段级"
  - "重复率"
  - "固定值"
  - "重复数"
  - "枚举值"
  - "手机号"
  - "置信区间"
  - "校验失败"
  - "逻辑正确"
  - "校验通过"
prd_version: "v6.4.3"
dev_version:
  - "袋鼠云"
create_at: "2026-04-05"
status: "草稿"
origin: "csv"
case_count: 142
case_id: 9334
---

## 统计性校验

### 字段级-异常值检测

#### Z-score置信区间

##### 【P0】验证「校验失败」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段值存在xx个值不符合规则“置信区间xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【统计性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「异常值检测」 「过滤条件」 输入「id < 100」 「校验方法」选择「Z-score置信区间」 「期望值」选择「>1」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「异常值检测未通过」 |

##### 【P0】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段值均符合规则“置信区间xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【统计性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「异常值检测」 「过滤条件」 输入「id < 100」 「校验方法」选择「Z-score置信区间」 「期望值」选择「<1」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### IQR离群点占比

##### 【P0】验证「校验失败」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段值中离群点数量为xx，表行数为xxx，离群点占比为xx，不符合规则“离群点占比xx”，根据数据判断离群点边界为【xx，xx】」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【统计性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「异常值检测」 「过滤条件」 输入「id < 100」 「校验方法」选择「IQR离群点占比」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「异常值检测未通过」 |

##### 【P0】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段值中离群点数量为xx，表行数为xxx，离群点占比为xx，符合规则“离群点占比xx”，根据数据判断离群点边界为【xx，xx】」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【统计性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「异常值检测」 「过滤条件」 输入「id < 100」 「校验方法」选择「IQR离群点占比」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### IQR离群点数量

##### 【P0】验证「校验失败」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段值中离群点数量为xx，不符合规则“离群点数量xx”，根据数据判断离群点边界为【xx，xx】」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【统计性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「异常值检测」 「过滤条件」 输入「id < 100」 「校验方法」选择「IQR离群点数量」 「期望值」选择「>1」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「异常值检测未通过」 |

##### 【P0】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段值中离群点数量为xx，符合规则“离群点数量xx”，根据数据判断离群点边界为【xx，xx】」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【统计性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「异常值检测」 「过滤条件」 输入「id < 100」 「校验方法」选择「IQR离群点数量」 「期望值」选择「<1」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

## 唯一性校验

### 多表-多表唯一性检测

##### 【P0】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「表xx字段xx唯一（/允许重复），表xx字段xx唯一（/允许重复），不符合规则“表xx字段xx唯一（/允许重复）”且（/或）“表xx字段xx唯一（/允许重复）”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「规则类型」选择「表级」 「统计函数」 选择「多表唯一性检测」 「过滤条件」 输入「id < 100」 「期望值」选择「>0」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「多表唯一性检测未通过」 |

##### 【P0】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「表xx字段xx唯一（/不唯一），表xx字段xx唯一（/不唯一），符合规则符合规则“表xx字段xx唯一（/允许重复）”且（/或）“表xx字段xx唯一（/允许重复）”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「规则类型」选择「表级」 「统计函数」 选择「多表唯一性检测」 「过滤条件」 输入「id < 100」 「期望值」选择「<0」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

### 字段级-重复率

#### 月度平均值波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复率为xx，上月同天至昨日的平均重复率为xx，重复率月度平均值波动率为xx，不符合规则“月度平均值波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复率」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均值波动检测」 「期望值」选择「 >1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「重复值检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复率为xx，上月同天至昨日的平均重复率为xx，重复率月度平均值波动率为xx，符合规则“月度平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复率」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均值波动检测」 「期望值」选择「 <1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 7天平均值波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复率为xx，近7日平均重复率为xx，重复率7天平均值波动率为xx，不符合规则“7天平均值波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复率」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均值波动检测」 「期望值」选择「 >1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「重复值检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复率为xx，近7日平均重复率为xx，重复率7天平均值波动率为xx，符合规则“7天平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复率」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均值波动检测」 「期望值」选择「 <1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 月度波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复率为xx，上月同天重复率为xx，重复率月度波动率为xx，不符合规则“月度波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复率」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度波动检测」 「期望值」选择「 >1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「重复值检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复率为xx，上月同天重复率为xx，重复率月度波动率为xx，符合规则“月度波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复率」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度波动检测」 「期望值」选择「 <1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 7天波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复率为xx，7日前重复率为xx，重复率7天波动率为xx，不符合规则“7天波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复率」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天波动检测」 「期望值」选择「 >1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「重复值检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复率为xx，7日前重复率为xx，重复率7天波动率为xx，符合规则“7天波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复率」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天波动检测」 「期望值」选择「 <1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 1天波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复率为xx，昨日重复率为xx，重复率1天波动率为xx，不符合规则“1天波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复率」 「过滤条件」 输入「id < 100」 「校验方法」选择「1天波动检测」 「期望值」选择「 >1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「重复值检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复率为xx，昨日重复率为xx，重复率1天波动率为xx，符合规则“1天波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复率」 「过滤条件」 输入「id < 100」 「校验方法」选择「1天波动检测」 「期望值」选择「 <1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 固定值

##### 【P0】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复率为xx，不符合规则“固定值xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复率」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「重复值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复率为xx，符合规则“固定值xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复率」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

### 字段级-重复数

#### 月度平均值波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复数为xx，上月同天至昨日的平均重复数为xx，重复数月度平均值波动率为xx，不符合规则“月度平均值波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均波动率检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「重复值检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复数为xx，上月同天至昨日的平均重复数为xx，重复数月度平均值波动率为xx，符合规则“月度平均值波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均波动率检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 7天平均值波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复数为xx，近7日平均重复数为xx，重复数7天平均值波动率为xx，不符合规则“7天平均值波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均波动率检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「重复值检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复数为xx，近7日平均重复数为xx，重复数7天平均值波动率为xx，符合规则“7天平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均波动率检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 月度波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复数为xx，上月同天重复数为xx，重复数月度波动率为xx，不符合规则“月度波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度波动率检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「重复值检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复数为xx，上月同天重复数为xx，重复数月度波动率为xx，符合规则“月度波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度波动率检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 7天波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复数为xx，7日前重复数为xx，重复数7天波动率为xx，不符合规则“7天波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天波动率检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「重复值检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复数为xx，7日前重复数为xx，重复数7天波动率为xx，符合规则“7天波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天波动率检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 1天波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复数为xx，昨日重复数为xx，重复数1天波动率为xx，不符合规则“1天波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复数」 「过滤条件」 输入「id < 100」 「校验方法」选择「1天波动率检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「重复值检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复数为xx，昨日重复数为xx，重复数1天波动率为xx，符合规则“1天波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复数」 「过滤条件」 输入「id < 100」 「校验方法」选择「1天波动率检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 固定值

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复数为xx，不符合规则“固定值xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复数」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「>0」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「重复值检测未通过」 |

##### 【P0】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复数为xx，符合规则“固定值xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复数」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「<0」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

## 有效性校验

### 字段级-枚举值

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，不符合规则“固定值xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「枚举值」 「期望值」 >10 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「格式检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，符合规则“固定值xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「枚举值」 「期望值」 <10 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

### 字段级-数据精度-数据精度

#### 固定值

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，不符合规则“固定值xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「数据精度」 「校验格式」选择「固定值」 「期望值」 >10 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「格式检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，符合规则“固定值xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「数据精度」 「校验格式」选择「固定值」 「期望值」 <10 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

### 字段级-字段长度-字符串长度

#### 固定值

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，不符合规则“固定值xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「字段长度-字符串长度」 「校验格式」选择「固定值」 「期望值」 >10 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「格式检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，符合规则“固定值xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「字段长度-字符串长度」 「校验格式」选择「固定值」 「期望值」 <10 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

### 字段级-格式校验-自定义正则

#### 占比

##### 【P0】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，不符合规则“固定值xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-自定义正则」 「校验格式」选择「占比」 「期望值」 >10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「格式检测未通过」 |

##### 【P0】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，符合规则“固定值xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-自定义正则」 「校验格式」选择「占比」 「期望值」 <10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 固定值

##### 【P0】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，不符合规则“固定值xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-自定义正则」 「校验格式」选择「固定值」 「期望值」 >10 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「格式检测未通过」 |

##### 【P0】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，符合规则“固定值xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-自定义正则」 「校验格式」选择「固定值」 「期望值」 <10 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

### 字段级-格式校验-日期格式datetime

#### 占比

##### 【P0】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，不符合规则“固定值xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-日期格式datetime」 「校验格式」选择「占比」 「期望值」 >10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「格式检测未通过」 |

##### 【P0】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，符合规则“固定值xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-日期格式datetime」 「校验格式」选择「占比」 「期望值」 <10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 固定值

##### 【P0】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，不符合规则“固定值xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-日期格式datetime」 「校验格式」选择「固定值」 「期望值」 >10 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「格式检测未通过」 |

##### 【P0】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，符合规则“固定值xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-日期格式datetime」 「校验格式」选择「固定值」 「期望值」 <10 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

### 字段级-格式校验-日期格式date

#### 占比

##### 【P0】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，不符合规则“固定值xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-日期格式date」 「校验格式」选择「占比」 「期望值」 >10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「格式检测未通过」 |

##### 【P0】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，总行数为xx，占比为xx，符合规则“占比xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-日期格式date」 「校验格式」选择「占比」 「期望值」 <10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 固定值

##### 【P0】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，不符合规则“固定值xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-日期格式date」 「校验格式」选择「固定值」 「期望值」 >10 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「格式检测未通过」 |

##### 【P0】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，符合规则“固定值xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-日期格式date」 「校验格式」选择「固定值」 「期望值」 <10 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

### 字段级-格式校验-手机号

#### 占比

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，总行数为xx，占比为xx，不符合规则“占比xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-手机号」 「校验格式」选择「占比」 「期望值」 >10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「格式检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，总行数为xx，占比为xx，符合规则“占比xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-手机号」 「校验格式」选择「占比」 「期望值」 <10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 固定值

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，不符合规则“符合格式个数【>/>=/</<=/=/!=XX】”，偏差率+-XX%」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-手机号」 「校验格式」选择「固定值」 「期望值」 >10 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「格式检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，符合规则“符合格式个数【>/>=/</<=/=/!=XX】””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-手机号」 「校验格式」选择「固定值」 「期望值」 <10 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

### 字段级-格式校验-邮箱

#### 占比

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，总行数为xx，占比为xx，不符合规则“占比xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-邮箱」 「校验格式」选择「占比」 「期望值」 >10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「格式检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，总行数为xx，占比为xx，符合规则“占比xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-邮箱」 「校验格式」选择「占比」 「期望值」 <10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 固定值

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，不符合规则“符合格式个数【>/>=/</<=/=/!=XX】”，偏差率+-XX%」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-邮箱」 「校验格式」选择「固定值」 「期望值」 >10 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「格式检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，符合规则“符合格式个数【>/>=/</<=/=/!=XX】””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-邮箱」 「校验格式」选择「固定值」 「期望值」 <10 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

### 字段级-格式校验-身份证号

#### 占比

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，总行数为xx，占比为xx，不符合规则“占比xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-身份证号」 「校验格式」选择「占比」 「期望值」 >10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「格式检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，总行数为xx，占比为xx，符合规则“占比xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-身份证号」 「校验格式」选择「占比」 「期望值」 <10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 固定值

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，不符合规则“符合格式个数【>/>=/</<=/=/!=XX】”，偏差率+-XX%」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-身份证号」 「校验格式」选择「固定值」 「期望值」 >10 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「格式检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，符合规则“符合格式个数【>/>=/</<=/=/!=XX】””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-身份证号」 「校验格式」选择「固定值」 「期望值」 <10 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

### 字段级-数值-枚举个数

#### 月度平均值波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段枚举个数为xx，上月同天至昨日的平均枚举个数为xx，枚举个数月度平均值波动率为xx，不符合规则“月度平均值波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「数值-枚举个数」 「校验格式」选择「月度平均值波动率」 「期望值」 >10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「数值枚举个数检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段枚举个数为xx，上月同天至昨日的平均枚举个数为xx，枚举个数月度平均值波动率为xx，符合规则“月度平均值波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「数值-枚举个数」 「校验格式」选择「月度平均值波动率」 「期望值」 <10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 7天平均值波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为字段枚举个数为xx，近7日平均枚举个数为xx，枚举个数7天平均值波动率为xx，不符合规则“7天平均值波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「数值-枚举个数」 「校验格式」选择「7天平均值波动率」 「期望值」 >10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「数值枚举个数检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段枚举个数为xx，近7日平均枚举个数为xx，枚举个数7天平均值波动率为xx，符合规则“7天平均值波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「数值-枚举个数」 「校验格式」选择「7天平均值波动率」 「期望值」 <10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 月度波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段枚举个数为xx，上月同天枚举个数为xx，枚举个数月度波动率为xx，不符合规则“月度波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「数值-枚举个数」 「校验格式」选择「月度波动率」 「期望值」 >10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「数值枚举个数检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段枚举个数为xx，上月同天枚举个数为xx，枚举个数月度波动率为xx，符合规则“月度波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「数值-枚举个数」 「校验格式」选择「月度波动率」 「期望值」 <10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 7天波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段枚举个数为xx，7日前枚举个数为xx，枚举个数7天波动率为xx，不符合规则“7天波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「数值-枚举个数」 「校验格式」选择「7天波动率」 「期望值」 >10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「数值枚举个数检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段枚举个数为xx，7日前枚举个数为xx，枚举个数7天波动率为xx，符合规则“7天波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「数值-枚举个数」 「校验格式」选择「7天波动率」 「期望值」 <10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 1天波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段枚举个数为xx，昨日枚举个数为xx，枚举个数1天波动率为xx，不符合规则“1天波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「数值-枚举个数」 「校验格式」选择「1天波动率」 「期望值」 >10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「数值枚举个数检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段枚举个数为xx，昨日枚举个数为xx，枚举个数1天波动率为xx，符合规则“1天波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「数值-枚举个数」 「校验格式」选择「1天波动率」 「期望值」 <10% 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 固定值

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段枚举个数为xx，不符合规则“枚举个数【>/>=/</<=/=/!=XX】”，偏差率+-XX%」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「数值-枚举个数」 「校验格式」选择「固定值」 「期望值」 >10 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「数值枚举个数检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段枚举个数为xx，符合规则“枚举个数【>/>=/</<=/=/!=XX】””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「数值-枚举个数」 「校验格式」选择「固定值」 「期望值」 <10 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

### 字段级-数值-取值范围检测

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「表行数为1，不符合规则“表行数<=0”，偏差率为100%」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「数值-取值范围检测」 「期望值」配置「>0 且> 100」 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「数值取值范围检测未通过」 |

##### 【P0】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段值符合取值范围区间，符合规则“取值范围xxx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「数值-取值范围检测」 「期望值」配置「>0 且 <100」 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

## 完整性校验

### 多表-多表数据内容对比

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「表xx字段xx，表xx字段xx取值内容存在异常，不符合规则“表xx字段xx（主键为xx）=1”且（/或）“表xx字段xx（主键为xx）=1””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「多表」 「规则类型」选择「表级」 「统计函数」 选择「多表数据内容比对」 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「多表数据内容比对未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「符合规则“表xx字段xx（主键为xx）=1”且（/或）“表xx字段xx（主键为xx）=1””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「多表」 「规则类型」选择「表级」 「统计函数」 选择「多表数据内容比对」 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

### 多表-多表行数比对

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「表xx行数为xx，表xx行数为xx，不符合规则中约定的行数差值不超过xx（/行数差值百分比不超过xx%/行数相等）」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「多表」 「规则类型」选择「表级」 「统计函数」 选择「多表行数比对」 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「多表行数比对检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「表xx行数为xx，表xx行数为xx，符合规则中约定的行数差值不超过xx（/行数差值百分比不超过xx%/行数相等）”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「多表」 「规则类型」选择「表级」 「统计函数」 选择「多表行数比对」 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

### 字段级-字段取值校验

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「存在字段值不符合取值范围区间，不符合规则“取值范围xxx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「字段取值校验」 「过滤条件」 输入「id < 100」 id >0 and age >100 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「数据取值范围校验未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段值符合取值范围区间，符合规则“取值范围xxx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「字段取值校验」 「过滤条件」 输入「id < 100」 id >0 and age <100 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

### 字段级-空串率检测

#### 月度平均值波动检测

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，上月同天至昨日的平均空串数为xx，空串数月度平均值波动率为xx，不符合规则“月度平均值波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均值波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，上月同天至昨日的平均空串数为xx，空串数月度平均值波动率为xx，符合规则“月度平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均值波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 7天平均值波动检测

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，近7日平均空串数为xx，空串数7天平均值波动率为xx，不符合规则“7天平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均值波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，近7日平均空串数为xx，空串数7天平均值波动率为xx，符合规则“7天平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均值波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 月度波动检测

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，上月同天空串数为xx，空串数月度波动率为xx，不符合规则“月度波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，上月同天空串数为xx，空串数月度波动率为xx，符合规则“月度波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 7天波动检测

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，7日前空串数为xx，空串数7天波动率为xx，不符合规则“7天波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，昨日空串数为xx，空串数1天波动率为xx，不符合规则“1天波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 1天波动检测

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「表行数为1，符合规则“表行数>0”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「1天波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，昨日空串数为xx，空串数1天波动率为xx，符合规则“1天波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「1天波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 固定值

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，不符合规则“空串数【>/>=/</<=/=/!=XX】”，偏差率+-XX%」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，符合规则“空串数<1%””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

### 字段级-空串数检测

#### 月度平均值波动检测

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，上月同天至昨日的平均空串率为xx，空串率月度平均值波动率为xx，不符合规则“月度平均值波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均值波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，上月同天至昨日的平均空串率为xx，空串率月度平均值波动率为xx，符合规则“月度平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均值波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 7天平均值波动检测

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，近7日平均空串率为xx，空串率7天平均值波动率为xx，不符合规则“7天平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均值波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，近7日平均空串率为xx，空串率7天平均值波动率为xx，符合规则“7天平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均值波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 月度波动检测

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，上月同天空串率为xx，空串率月度波动率为xx，不符合规则“月度波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，上月同天空串率为xx，空串率月度波动率为xx，符合规则“月度波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 7天波动检测

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，7日前空串率为xx，空串率7天波动率为xx，不符合规则“7天波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，7日前空串率为xx，空串率7天波动率为xx，符合规则“7天波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 1天波动检测

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，昨日空串率为xx，空串率1天波动率为xx，不符合规则“1天波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「1天波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，昨日空串率为xx，空串率1天波动率为xx，符合规则“1天波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「1天波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 固定值

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，不符合规则“空串率>1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，符合规则“空值率<1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

### 字段级-空值率检测

#### 月度平均值波动检测

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，上月同天至昨日的平均空值率为xx，空值率月度平均值波动率为xx，不符合规则“月度平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均值波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「NULL值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，上月同天至昨日的平均空值率为xx，空值率月度平均值波动率为xx，符合规则“月度平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均值波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 7天平均值波动检测

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，近7日平均空值率为xx，空值率7天平均值波动率为xx，不符合规则“7天平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均值波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「NULL值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，近7日平均空值率为xx，空值率7天平均值波动率为xx，符合规则“7天平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均值波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「NULL值检测未通过」 |

#### 月度波动检测

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，上月同天空值率为xx，空值率月度波动率为xx，不符合规则“月度波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，上月同天空值率为xx，空值率月度波动率为xx，符合规则“月度波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 7天波动检测

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，7日前空值率为xx，空值率7天波动率为xx，不符合规则“7天波动率>1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「NULL值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，7日前空值率为xx，空值率7天波动率为xx，符合规则“7天波动率<1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 1天波动检测

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，昨日空值率为xx，空值率1天波动率为xx，不符合规则“1天波动率>1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「1天波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「NULL值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，昨日空值率为xx，空值率1天波动率为xx，符合规则“1天波动率<1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「1天波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 固定值

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，不符合规则“空值率>1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「NULL值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，符合规则“空值率<1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

### 字段级-空值数检测

#### 月度平均值波动检测

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值数为1，上月同天至昨日的平均空值数为10，空值数月度平均值波动率为xx，不符合规则“月度平均值波动率<1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均值波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「NULL值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值数为1，上月同天至昨日的平均空值数为10，空值数月度平均值波动率为xx，符合规则“月度平均值波动率>1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均值波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 7天平均值波动检测

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值数为1，近7日平均空值数为10，空值数7天平均值波动率为xx，不符合规则“7天平均值波动率<1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均值波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1.「质检结果」为「校验未通过」，「未通过原因」展示为「NULL值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值数为1，近7日平均空值数为10，空值数7天平均值波动率为xx，符合规则“7天平均值波动率>1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均值波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 月度波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值数为1，上月同天空值数为10，空值数月度波动率为xx，不符合规则“月度波动率<1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「NULL值检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值数为1，上月同天空值数为10，空值数月度波动率为xx，符合规则“月度波动率>1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 7天波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值数为1，7日前空值数为10，空值数7天波动率为xx，不符合规则“7天波动率<1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1.「质检结果」为「校验未通过」，「未通过原因」展示为「NULL值检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值数为1，7日前空值数为10，空值数7天波动率为xx，符合规则“7天波动率>1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 1天波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值数为1，昨日空值数为10，空值数1天波动率为xx，不符合规则“1天波动率<1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值数」 「过滤条件」 输入「id < 100」 「校验方法」选择「1天波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1.「质检结果」为「校验未通过」，「未通过原因」展示为「NULL值检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值数为1，昨日空值数为10，空值数1天波动率为xx，符合规则“1天波动率>1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值数」 「过滤条件」 输入「id < 100」 「校验方法」选择「1天波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 固定值

##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值数为1，不符合规则“空值数<=0”，偏差率+-XX%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值数」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「<=0」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「NULL值检测未通过」 |

##### 【P0】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值数为0，符合规则“空值数<=0”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值数」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「<=0」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

### 表级-表行数检测

#### 月度平均波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「今日表行数为1，上月同天至昨日的平均表行数为10，表行数月度平均值波动率为xx，不符合规则“月度平均值波动率>1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「表级」 「统计函数」 选择「表行数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「表行数检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「今日表行数为1，上月同天至昨日的平均表行数为10，表行数月度平均值波动率为xx，符合规则“月度平均值波动率>1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「表级」 「统计函数」 选择「表行数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 7天平均波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「今日表行数为1，近7日平均表行数为10，表行数7天平均值波动率为xx，不符合规则“7天平均值波动率<1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「表级」 「统计函数」 选择「表行数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「表行数检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「今日表行数为1，近7日平均表行数为10，表行数7天平均值波动率为xx，符合规则“7天平均值波动率>1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「表级」 「统计函数」 选择「表行数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 月度波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「今日表行数为1，上月同天表行数为10，表行数月度波动率为xx，不符合规则“月度波动率<1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「表级」 「统计函数」 选择「表行数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「表行数检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「今日表行数为1，上月同天表行数为10，表行数月度波动率为xx，符合规则“月度波动率>1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「表级」 「统计函数」 选择「表行数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 7天波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「今日表行数为1，7日前表行数为10，表行数7天波动率为xx，不符合规则“7天波动率<1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「表级」 「统计函数」 选择「表行数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「表行数检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);


INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「今日表行数为1，7日前表行数为10，表行数7天波动率为xx，符合规则“7天波动率>1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「表级」 「统计函数」 选择「表行数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 1天波动检测

##### 【P2】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「今日表行数为1，昨日表行数为10，表行数1天波动率为xx，不符合规则“1天波动率<1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「表级」 「统计函数」 选择「表行数」 「过滤条件」 输入「id < 100」 「校验方法」选择「1天波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例校验不通过 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「表行数检测未通过」 |

##### 【P2】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「今日表行数为1，昨日表行数为10，表行数1天波动率为xx，符合规则“1天波动率>1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「表级」 「统计函数」 选择「表行数」 「过滤条件」 输入「id < 100」 「校验方法」选择「1天波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

#### 固定值

##### 【P0】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「表行数为1，不符合规则“表行数<=0”，偏差率为100%」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「表级」 「统计函数」 选择「表行数」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「<=0」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例校验不通过 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「表行数检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「表行数为1，符合规则“表行数>0”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「表级」 「统计函数」 选择「表行数」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「>0」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |
