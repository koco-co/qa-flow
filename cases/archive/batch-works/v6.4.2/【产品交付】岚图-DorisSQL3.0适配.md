---
name: 【产品交付】岚图-DorisSQL3.0适配 v6.4.2
description: 【产品交付】岚图-DorisSQL3.0适配 v6.4.2
tags:
  - 离线开发
  - 离线Doris3.x适配
  - 产品交付
  - 岚图
  - DorisSQL
  - 适配
module: batch-works
version: v6.4.2
source: zentao-cases/dtstack-platform/离线开发/archive-cases/v6.4.2/【产品交付】岚图-DorisSQL3.0适配.csv
case_count: 24
created_at: 2026-03-29
origin: csv
---
# 【产品交付】岚图-DorisSQL3.0适配 v6.4.2
> 来源：zentao-cases/dtstack-platform/离线开发/archive-cases/v6.4.2/【产品交付】岚图-DorisSQL3.0适配.csv
> 用例数：24

---

## 离线Doris3.x适配

##### 验证项目维度数据库绑定账号功能正常 「P3」

> 前置条件
```
Doris 3.x 数据源已经配置root 和 test_user账号, test_user账号仅有lantu_test 权限

-- 1. 创建用户（密码自己换）
CREATE USER 'test_user'@'%' IDENTIFIED BY 'test123456';
-- 2. 建一个专用角色
CREATE ROLE 'test_role';
-- 3. 给这个角色授予 report_db 库的全部权限（含查询、导入、DDL）
GRANT ALL ON lantu_test.* TO ROLE 'test_role';
-- 4. 把角色授予用户
GRANT 'test_role' TO 'test_user'@'%';
-- 5. 立即生效
SET PROPERTY FOR 'test_user'@'%' 'resource.tags' = '*';
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据开发-周期任务】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 新建 DorisSQL 任务 | 系统提示创建成功，列表中出现新创建的记录，记录内容与填写一致 |
| 3 | 执行SQL: SELECT * FROM ${schemaA}.${tableA}; | 查询成功, 当前为root用户在执行 |
| 4 | 进入项目管理-项目设置-开发设置-Doris配置中，开启项目绑定数据库账号, 新增test_user账号 | 新增成功, 数据回显正常，功能行为符合预期，无报错或异常 |
| 5 | 执行SQL: SELECT * FROM ${schemaA}.${tableA}; | 查询失败 |
| 6 | 执行SQL: SELECT * FROM lantu_test.${tableB}; | 查询成功, 当前为test_user用户在执行 |

##### 验证 DorisSQL任务调度功能运行正常(DQL语法) 「P2」

> 前置条件
```
1. 平台中已配置 Doris3.x 数据源，连接状态正常。
2. 当前离线项目中已存在Doris3.x表:

DROP TABLE if exists user_profile;
CREATE TABLE IF NOT EXISTS user_profile (
    id LARGEINT NOT NULL COMMENT '用户ID',
    registration_date DATETIME NOT NULL COMMENT '注册时间',
    name VARCHAR(255) COMMENT '用户名',
    age TINYINT COMMENT '年龄',
    salary DOUBLE COMMENT '薪资',
    is_active BOOLEAN COMMENT '是否活跃',
    revision INT COMMENT '版本号'
)
ENGINE=OLAP
UNIQUE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 8
PROPERTIES (
    “replication_num“ = “3“
);

DROP TABLE if exists sales_records;
-- 分区表
CREATE TABLE sales_records (
    order_id LARGEINT NOT NULL,
    user_id LARGEINT NOT NULL,
    sale_date DATE NOT NULL COMMENT '销售日期',
    amount DECIMAL(12,2) COMMENT '金额',
    region VARCHAR(50) COMMENT '地区'
)
ENGINE=OLAP
DUPLICATE KEY(order_id, user_id)
PARTITION BY RANGE(sale_date) (
    PARTITION p2023 VALUES LESS THAN ('2024-01-01'),
    PARTITION p2024 VALUES LESS THAN ('2025-01-01'),
    PARTITION pmax VALUES LESS THAN MAXVALUE
)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES (
    “replication_num“ = “2“);

INSERT INTO user_profile VALUES
(1, '2023-01-01 10:00:00', 'Alice', 30, 12000, TRUE, 1),
(2, '2023-02-15 09:30:00', 'Bob', 25, 9000, FALSE, 1),
(3, '2023-03-20 14:45:00', 'Charlie', 35, 15000, TRUE, 2);

INSERT INTO sales_records VALUES
(1001, 1, '2023-05-20', 199.99, 'East'),
(1002, 2, '2024-02-15', 299.50, 'West');

3. 准备两个对接doris3.x的离线SQL任务：
${task01}
-- 基础查询
SELECT name, age, salary 
FROM user_profile 
WHERE is_active = TRUE 
ORDER BY salary DESC LIMIT 10;

${task02}
-- 分组查询
SELECT region, SUM(amount) AS total_sales
FROM sales_records
WHERE sale_date BETWEEN '2023-01-01' AND '2023-12-31'
GROUP BY region;

-- 子查询
SELECT name, salary
FROM user_profile
WHERE salary > (SELECT AVG(salary) FROM user_profile);

-- join操作
SELECT u.name, s.amount, s.sale_date
FROM user_profile u JOIN sales_records s ON u.id = s.user_id
WHERE s.region = 'East';

${task03}

  -- 复杂聚合
  SELECT 
  region, 
  YEAR(sale_date) AS year,
  SUM(amount) AS total,
  GROUPING(region) AS grp_region
  FROM sales_records
  GROUP BY ROLLUP(region, YEAR(sale_date));

-- CUBE
  SELECT 
  is_active,
  FLOOR(age/10)*10 AS age_group,
  COUNT(*) AS user_count
  FROM user_profile
  GROUP BY CUBE(is_active, FLOOR(age/10)*10);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据开发-周期任务】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 创建Doris SQL任务${task01}、${task02}、${task03}, 并临时运行 | 任务运行成功，状态显示为【运行成功/成功】，无报错信息 |
| 3 | 保存并提交到运维中心 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 4 | 周期运行, 查看结果 | 运行成功, 周期任务实例中新增该任务的实例记录 |
| 5 | 补数据运行, 查看结果 | 运行成功, 补数据任务实例中新增该任务的实例记录 |
| 6 | 进入【离线开发-数据开发-手动任务】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 7 | 创建Doris SQL任务${task01}、${task02}、${task03}, 提交到运维中心后手动运行 | 运行成功, 手动任务实例中新增该任务的实例记录 |

##### 验证 DorisSQL任务调度功能运行正常(DML语法) 「P2」

> 前置条件
```
1. 平台中已配置 Doris3.x 数据源，连接状态正常。
2. 当前离线项目中已存在Doris3.x表:

DROP TABLE if exists user_profile;
CREATE TABLE IF NOT EXISTS user_profile (
    id LARGEINT NOT NULL COMMENT '用户ID',
    registration_date DATETIME NOT NULL COMMENT '注册时间',
    name VARCHAR(255) COMMENT '用户名',
    age TINYINT COMMENT '年龄',
    salary DOUBLE COMMENT '薪资',
    is_active BOOLEAN COMMENT '是否活跃',
    revision INT COMMENT '版本号'
)
ENGINE=OLAP
UNIQUE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 8
PROPERTIES (
    “replication_num“ = “3“
);

DROP TABLE if exists sales_records;
-- 分区表
CREATE TABLE sales_records (
    order_id LARGEINT NOT NULL,
    user_id LARGEINT NOT NULL,
    sale_date DATE NOT NULL COMMENT '销售日期',
    amount DECIMAL(12,2) COMMENT '金额',
    region VARCHAR(50) COMMENT '地区'
)
ENGINE=OLAP
DUPLICATE KEY(order_id, user_id)
PARTITION BY RANGE(sale_date) (
    PARTITION p2023 VALUES LESS THAN ('2024-01-01'),
    PARTITION p2024 VALUES LESS THAN ('2025-01-01'),
    PARTITION pmax VALUES LESS THAN MAXVALUE
)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES (
    “replication_num“ = “2“);

3. 准备两个对接doris3.x的离线SQL任务：
${task01}

  INSERT INTO doris3x_test.user_profile
  (id, registration_date, name, age, salary, is_active, revision)
  VALUES
  (1, '2023-01-01 10:00:00', 'Alice', 30, 12000, TRUE, 1),
  (2, '2023-02-15 09:30:00', 'Bob', 25, 9000, FALSE, 1),
  (3, '2023-03-20 14:45:00', 'Charlie', 35, 15000, TRUE, 2);

${task02}
INSERT INTO sales_records VALUES
(1001, 1, '2023-05-20', 199.99, 'East'),
(1002, 2, '2024-02-15', 299.50, 'West');

${task03}
-- 条件更新
UPDATE user_profile SET salary = salary * 1.1 WHERE age > 30;

-- 条件删除
DELETE FROM sales_records WHERE sale_date < '2023-01-01';
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据开发-周期任务】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 创建Doris SQL任务${task01}、${task02}、${task03}, 并临时运行 | 任务运行成功，状态显示为【运行成功/成功】，无报错信息 |
| 3 | 保存并提交到运维中心 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 4 | 周期运行, 查看结果 | 运行成功, 周期任务实例中新增该任务的实例记录 |
| 5 | 补数据运行, 查看结果 | 运行成功, 补数据任务实例中新增该任务的实例记录 |
| 6 | 进入【离线开发-数据开发-手动任务】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 7 | 创建Doris SQL任务${task01}、${task02}、${task03}, 提交到运维中心后手动运行 | 运行成功, 手动任务实例中新增该任务的实例记录 |

##### 验证 DorisSQL任务调度功能运行正常(DDL语法) 「P1」

> 前置条件
```
1. 平台中已配置 Doris3.x 数据源，连接状态正常。
2. 准备三个对接doris3.x的离线SQL任务：
${task01}
DROP TABLE if exists user_profile;
CREATE TABLE IF NOT EXISTS user_profile (
 id LARGEINT NOT NULL COMMENT '用户ID',
 registration_date DATETIME NOT NULL COMMENT '注册时间',
 name VARCHAR(255) COMMENT '用户名',
 age TINYINT COMMENT '年龄',
 salary DOUBLE COMMENT '薪资',
 is_active BOOLEAN COMMENT '是否活跃',
 revision INT COMMENT '版本号'
)
ENGINE=OLAP
UNIQUE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 8
PROPERTIES (
 “replication_num“ = “1“
);

${task02}
DROP TABLE if exists sales_records;
-- 分区表
CREATE TABLE sales_records (
 order_id LARGEINT NOT NULL,
 user_id LARGEINT NOT NULL,
 sale_date DATE NOT NULL COMMENT '销售日期',
 amount DECIMAL(12,2) COMMENT '金额',
 region VARCHAR(50) COMMENT '地区'
)
ENGINE=OLAP
DUPLICATE KEY(order_id, user_id)
PARTITION BY RANGE(sale_date) (
 PARTITION p2023 VALUES LESS THAN ('2024-01-01'),
 PARTITION p2024 VALUES LESS THAN ('2025-01-01'),
 PARTITION pmax VALUES LESS THAN MAXVALUE
)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES (
 “replication_num“ = “2“);

${task03} (上游依赖任务${task01})
-- 增加列
ALTER TABLE user_profile ADD COLUMN department VARCHAR(100) COMMENT '所属部门';
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据开发-周期任务】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 创建Doris SQL任务${task01}、${task02}、${task03}, 并临时运行 | 任务运行成功，状态显示为【运行成功/成功】，无报错信息 |
| 3 | 保存并提交到运维中心 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 4 | 周期运行, 查看结果 | 运行成功, 周期任务实例中新增该任务的实例记录 |
| 5 | 补数据运行, 查看结果 | 运行成功, 补数据任务实例中新增该任务的实例记录 |
| 6 | 进入【离线开发-数据开发-手动任务】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 7 | 创建Doris SQL任务${task01}、${task02}、${task03}, 提交到运维中心后手动运行 | 运行成功, 手动任务实例中新增该任务的实例记录 |

##### 验证Doris3.x同步元数据功能正常 「P1」

> 前置条件
```
1. 离线平台中已配置 Doris3.x 集群数据源，连接状态正常。

2. Doris 集群中存在测试表(在底层创建, 而不是平台中创建, 离线项目标识为${schemaA})：

DROP TABLE IF EXISTS ${schemaA}.doris_meta_sync_test;
CREATE TABLE ${schemaA}.doris_meta_sync_test (
 id INT,
 name STRING,
 dt DATE
)
ENGINE=OLAP
DISTRIBUTED BY HASH(id) BUCKETS 1
PROPERTIES(“replication_num“=“1“);

INSERT INTO ${schemaA}.doris_meta_sync_test VALUES (1,'a','2025-10-01');

DROP TABLE IF EXISTS ${schemaA}.doris_meta_sync_test2;
CREATE TABLE ${schemaA}.doris_meta_sync_test2 (
 id INT,
 name STRING,
 dt DATE
)
ENGINE=OLAP
DISTRIBUTED BY HASH(id) BUCKETS 1
PROPERTIES(“replication_num“=“1“);

INSERT INTO ${schemaA}.doris_meta_sync_test2 VALUES (1,'a','2025-10-01');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据开发-表查询】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 选择Doris-${schemaA}, 查询表doris_meta_sync_test | 不存在表doris_meta_sync_test |
| 3 | 进入【数据源】页面, 选择Meta Doris3.x数据源, 点击同步元数据 | 弹出同步元数据配置弹窗 |
| 4 | 配置如下:选择表: 部分表, doris_meta_sync_test表类目: ${资产数据地图下的表类目} | 系统提示同步成功，数据已更新至最新状态 |
| 5 | 再次进入表查询页面, 查询表doris_meta_sync_test | 列表按查询条件刷新，仅显示符合条件的记录，不满足条件的记录不显示 |
| 6 | 进入【数据源】页面, 再次选择Doris3.x, 同步元数据, 配置如下:选择表: 全部表表类目: ${资产数据地图下的表类目} | 系统提示同步成功，数据已更新至最新状态 |
| 7 | 再次进入表查询页面, 查询表doris_meta_sync_test2 | 列表按查询条件刷新，仅显示符合条件的记录，不满足条件的记录不显示 |
| 8 | 底层删除两张表doris_meta_sync_test, doris_meta_sync_test2后, 再次同步元数据, 配置如下:选择表: 全部表表类目: ${资产数据地图下的表类目} | 系统提示同步成功，数据已更新至最新状态 |
| 9 | 进入表查询页面, 查询表doris_meta_sync_test和doris_meta_sync_test2 | 不存在 |

##### 验证Doris3.x表查询功能正常 「P3」

> 前置条件
```
离线平台已对接多个 Doris3.x 集群${ClusterA}，${ClusterB}, 均连接正常
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据开发-表查询】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 表类型中选择Doris | 进入数据源名称列表页, 展示当前项目中已对接的Meta Doris集群列表 |
| 3 | 选择Doris3.x集群${ClusterA} | 展示该集群下的Schema列表 |
| 4 | 选择${schemaA} | 展示该schema下的table列表 |
| 5 | 选择${tableA} | 展示该表的字段信息和数据预览 |
| 6 | 点击数据预览 | 展示表${tableA}的表记录 |

##### 验证 DorisSQL 支持自定义函数 「P3」

> 前置条件
```
离线平台已成功配置UDF函数
1. 通过show backends; 获取所有doris集群节点
2. 将jar包上传到所有doris集群节点中, 且保存目录路径一致
3. 新增自定义函数, 配置如下:
类名：com.digitaljx.HelloUDF
资源路径：file://${文件所在路径}, e.g. file:///root/doris_test/27_udf_test_SM4-1.0-SNAPSHOT.jar
返回参数类型：string
用途: 接收一个参数, 返回拼接上hello后的字符串
命令格式：${函数名称}(string), e.g. addStr(string)
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据开发-周期任务】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 新建 DorisSQL 任务 | 系统提示创建成功，列表中出现新创建的记录，记录内容与填写一致 |
| 3 | 输入测试语句: select addStr(“test“);并执行 | 执行成功, 返回结果: hello test |

##### 验证 DorisSQL 支持系统函数调用 「P2」

> 前置条件
```
已存在 doris3_sql_run 表。
DROP TABLE IF EXISTS doris3_sql_run;
CREATE TABLE doris3_sql_run (
id INT,
name STRING
)
ENGINE=OLAP
DISTRIBUTED BY HASH(id) BUCKETS 1
PROPERTIES(“replication_num“=“1“);
INSERT INTO doris3_sql_run VALUES (1,'a'),(2,'b');
SELECT * FROM doris3_sql_run;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据开发-周期任务】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 新建 DorisSQL 任务 | 系统提示创建成功，列表中出现新创建的记录，记录内容与填写一致 |
| 3 | 输入测试语句: SELECT id, CURRENT_DATE() AS cur_date, NOW() AS cur_time FROM doris3_sql_run; | 执行成功, 返回两行数据 |
| 4 | 验证输出 | cur_date 与 cur_time 均为系统当前日期和时间 |

##### 验证 DorisSQL 任务支持停止运行中的任务 「P2」

> 前置条件
```
准备长时间执行 SQL： 

CREATE TABLE example_unique_table (
  id LARGEINT NOT NULL,
  name VARCHAR(255),
  age TINYINT,
  bio VARCHAR(65533),
  birth_date DATE,
  last_seen DATETIME,
  is_active BOOLEAN,
  height DECIMAL(3,2),
  email VARCHAR(255),
  registration_date DATETIME,
  profile_picture STRING,
  salary DOUBLE,
  revision INT,
  metadata STRING
  )
  UNIQUE KEY (id)
  DISTRIBUTED BY HASH(id) BUCKETS 1
  PROPERTIES (
  “replication_num“ = “1“
  );

-- 插入第一条数据
  INSERT INTO example_unique_table (
  id, name, age, bio, birth_date, last_seen, is_active, height,
  email, registration_date, profile_picture, salary, revision, metadata
  ) VALUES (
  3001,
  '黄娟',
  30,
  'UI设计师，注重界面美观与交互体验。',
  '1994-06-14',
  '2025-06-04 10:00:00',
  TRUE,
  1.62,
  'huangjuan@example.com',
  '2024-12-12 08:30:00',
  'https://example.com/pic/huangjuan.jpg',
  14000.0,
  1,
  '{“技能“: [“Sketch“, “Figma“], “城市“: “广州“}'
  );

-- 插入第二条数据
  INSERT INTO example_unique_table (
  id, name, age, bio, birth_date, last_seen, is_active, height,
  email, registration_date, profile_picture, salary, revision, metadata
  ) VALUES (
  3002,
  '周杰',
  40,
  '高级运维工程师，熟悉Kubernetes与云计算。',
  '1985-02-08',
  '2025-06-04 09:30:00',
  TRUE,
  1.76,
  'zhoujie@example.com',
  '2025-01-05 14:00:00',
  'https://example.com/pic/zhoujie.jpg',
  20000.0,
  2,
  '{“认证“: [“AWS“, “K8s“], “公司“: “某云服务商“}'
  );

-- 插入第三条数据
  INSERT INTO example_unique_table (
  id, name, age, bio, birth_date, last_seen, is_active, height,
  email, registration_date, profile_picture, salary, revision, metadata
  ) VALUES (
  3003,
  '徐丽',
  33,
  '市场营销专家，擅长品牌推广与社交媒体运营。',
  '1992-09-19',
  '2025-06-03 15:20:00',
  FALSE,
  1.67,
  'xuli@example.com',
  '2024-11-30 13:15:00',
  'https://example.com/pic/xuli.jpg',
  16000.0,
  1,
  '{“领域“: [“数字营销“, “SEO“], “国家“: “新加坡“}'
  );
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据开发-周期任务】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 新建 DorisSQL 任务 | 系统提示创建成功，列表中出现新创建的记录，记录内容与填写一致 |
| 3 | 输入SQL测试语句并执行 | 运行成功, 控制台开始打印日志 |
| 4 | 点击【停止】 | 运行终止, 日志停止打印 |

##### 验证 DorisSQL 语法提示功能正常 「P3」

> 前置条件
```
Doris3.x 数据源中已存在表${tableA}, e.g. doris3_sql_run
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据开发-周期任务】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 新建 DorisSQL 任务 | 系统提示创建成功，列表中出现新创建的记录，记录内容与填写一致 |
| 3 | 在编辑器中输入 SEL | 自动提示补全 SELECT |
| 4 | 输入 SELECT * FROM dor | 提示补全表名 doris3_sql_run |
| 5 | 输入系统函数前缀 CUR | 自动提示 CURDATE() 、 CURTIME() |

##### 验证 DorisSQL 任务可正常运行并返回结果 「P1」

> 前置条件
```
1. 平台中已配置 Doris3.x 数据源，连接状态正常。
2. 准备测试语句, 建表语句如下:
DROP table if exists example_primary_key_table;
CREATE TABLE if not exists example_primary_key_table (
 id LARGEINT NOT NULL COMMENT '主键 ID',
 registration_date DATETIME NOT NULL COMMENT '注册时间',
 name VARCHAR(255) COMMENT '用户名',
 age TINYINT COMMENT '年龄',
 bio VARCHAR(65533) COMMENT '个人简介',
 birth_date DATE COMMENT '出生日期',
 last_seen DATETIME COMMENT '最后在线时间',
 is_active BOOLEAN COMMENT '是否活跃',
 height DECIMAL(3,2) COMMENT '身高（米）',
 email VARCHAR(255) COMMENT '邮箱',
 profile_picture STRING COMMENT '头像图片',
 salary DOUBLE COMMENT '薪资',
 revision INT COMMENT '修订版本号',
 metadata STRING COMMENT '元数据'
)
UNIQUE KEY (id, registration_date)
PARTITION BY RANGE (registration_date) (
 PARTITION p2020 VALUES LESS THAN (“2021-01-01 00:00:00“),
 PARTITION p2021 VALUES LESS THAN (“2022-01-01 00:00:00“),
 PARTITION p2022 VALUES LESS THAN (“2023-01-01 00:00:00“),
 PARTITION p2023 VALUES LESS THAN (“2024-01-01 00:00:00“),
 PARTITION pmax VALUES LESS THAN (“9999-12-31 00:00:00“)
)
DISTRIBUTED BY HASH(id) BUCKETS 1
PROPERTIES (
 “replication_num“ = “1“,
 “enable_unique_key_merge_on_write“ = “true“
);

-- 插入第一条数据
INSERT INTO example_primary_key_table (
 id, registration_date, name, age, bio, birth_date, last_seen, is_active, height,
 email, profile_picture, salary, revision, metadata
) VALUES (
 5001,
 '2024-03-15 10:30:00',
 '杨帆',
 28,
 '数据库管理员，专长MySQL与PostgreSQL优化。',
 '1996-06-10',
 '2025-06-04 10:00:00',
 TRUE,
 1.74,
 'yangfan@example.com',
 'https://example.com/pic/yangfan.jpg',
 13000.0,
 1,
 '{“经验“: “DBA“, “公司“: “某金融机构“}'
);

-- 插入第二条数据
INSERT INTO example_primary_key_table (
 id, registration_date, name, age, bio, birth_date, last_seen, is_active, height,
 email, profile_picture, salary, revision, metadata
) VALUES (
 5002,
 '2024-07-22 09:15:00',
 '孙倩',
 31,
 'UX设计师，关注用户行为与界面交互设计。',
 '1993-04-18',
 '2025-06-04 09:30:00',
 TRUE,
 1.65,
 'sunqian@example.com',
 'https://example.com/pic/sunqian.jpg',
 15000.0,
 2,
 '{“技能“: [“Figma“, “Sketch“], “城市“: “杭州“}'
);

-- 插入第三条数据
INSERT INTO example_primary_key_table (
 id, registration_date, name, age, bio, birth_date, last_seen, is_active, height,
 email, profile_picture, salary, revision, metadata
) VALUES (
 5003,
 '2025-01-10 14:20:00',
 '马超',
 42,
 '技术总监，具备多年团队管理与项目规划经验。',
 '1982-11-05',
 '2025-06-03 18:45:00',
 TRUE,
 1.78,
 'machao@example.com',
 'https://example.com/pic/machao.jpg',
 24000.0,
 1,
 '{“经历“: [“创业“, “大厂“], “国家“: “中国“}'
);

select * from example_primary_key_table;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据开发-周期任务】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 新建Doris SQL任务, 输入测试SQL语句并运行 | 执行成功, 返回结果显示正常，功能行为符合预期，无报错或异常 |
| 3 | 进入【离线开发-数据开发-手动任务】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 4 | 新建Doris SQL任务, 输入测试SQL语句并运行 | 执行成功, 返回结果显示正常，功能行为符合预期，无报错或异常 |
| 5 | 进入【离线开发-数据开发-临时查询】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 6 | 新建Doris SQL任务, 输入测试SQL语句并运行 | 执行成功, 返回结果显示正常，功能行为符合预期，无报错或异常 |

##### 验证【数据开发】Doris SQL任务创建功能正常 「P3」

> 前置条件
```
「离线开发-数据源」中已存在Doris 3.x Meta数据源, 数据源名称: ${ClusterA}
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据开发-周期任务】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 右键【任务开发】, 选择Doris SQL任务 | 【新建周期任务-集群名称】中支持选择创建项目时对接的doris3.x集群名称 |
| 3 | 新建周期任务:任务名称: ${nameA}任务类型: Doris SQL集群名称: ${ClusterA} | 周期任务创建成功，系统给出创建成功提示，列表中出现新创建的记录 |
| 4 | 进入【手动任务】, 新建手动任务:任务名称: ${nameB}任务类型: Doris SQL集群名称: ${ClusterA} | 手动任务创建成功，系统给出创建成功提示，列表中出现新创建的记录 |
| 5 | 进入【临时查询】, 新建临时查询:查询名称: ${nameC}任务类型: Doris SQL集群名称: ${ClusterA} | 临时查询创建成功，系统给出创建成功提示，列表中出现新创建的记录 |

##### 验证【创建项目】添加Doris数据源显示正常(初始化方式: 不创建且不对接) 「P3」

> 前置条件
```
1) 「公共管理-控制台」中已分别存在Doris2.x、Doris3.x组件
2) Doris2.x 集群名称: ${ClusterA}、Doris3.x集群名称: ${ClusterB}
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 点击【创建项目】 | 进入创建项目页面 |
| 3 | 配置如下: 项目标识&项目名称: ${nameA}计算引擎配置: No.01: Doris2.x集群${ClusterA}、初始化方式: 【不创建且不对接 Schema】No.02: Doris3.x集群${ClusterB}、初始化方式: 【不创建且不对接 Schema】 | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 4 | 点击【创建项目】 | 系统提示创建成功，列表中出现新创建的记录，记录内容与填写一致 |
| 5 | 进入【数据源】页面 | 进入成功, 数据源列表存在如下数据源记录:1) 类型为Doris2.x, 数据源名称为${nameA}_DORIS_${ClusterA}的数据源记录2) 类型为Doris3.x, 数据源名称为${nameA}_DORIS_${ClusterB}的数据源记录 |

##### 验证【创建项目】添加Doris 数据源显示正常(初始化方式: 对接) 「P3」

> 前置条件
```
1) 「公共管理-控制台」中已分别存在Doris2.x、Doris3.x组件
2) Doris2.x 集群名称: ${ClusterA}、Doris3.x集群名称: ${ClusterB}
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 点击【创建项目】 | 进入创建项目页面 |
| 3 | 配置如下: 项目标识&项目名称: ${nameA}计算引擎配置: No.01: Doris2.x集群${ClusterA}、初始化方式: 【对接已有Doris Schema】、${schemaA}、${表类目A}No.02: Doris3.x集群${ClusterB}、初始化方式: 【对接已有Doris Schema】、${schemaB}、${表类目A} | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 4 | 点击【创建项目】 | 系统提示创建成功，列表中出现新创建的记录，记录内容与填写一致 |
| 5 | 进入【数据源】页面 | 进入成功, 数据源列表存在如下数据源记录:1) 类型为Doris2.x, 数据源名称为${nameA}_DORIS_${ClusterA}的数据源记录2) 类型为Doris3.x, 数据源名称为${nameA}_DORIS_${ClusterB}的数据源记录 |

##### 验证【创建项目】添加Doris 数据源显示正常(初始化方式: 创建) 「P1」

> 前置条件
```
1) 「公共管理-控制台」中已分别存在Doris2.x、Doris3.x组件
2) Doris2.x 集群名称: ${ClusterA}、Doris3.x集群名称: ${ClusterB}
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 点击【创建项目】 | 进入创建项目页面 |
| 3 | 配置如下: 项目标识&项目名称: ${nameA}计算引擎配置: No.01: Doris2.x集群${ClusterA}、初始化方式: 【创建】No.02: Doris3.x集群${ClusterB}、初始化方式: 【创建】 | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 4 | 点击【创建项目】 | 系统提示创建成功，列表中出现新创建的记录，记录内容与填写一致 |
| 5 | 进入【数据源】页面 | 进入成功, 数据源列表存在如下数据源记录:1) 类型为Doris2.x, 数据源名称为${nameA}_DORIS_${ClusterA}的数据源记录2) 类型为Doris3.x, 数据源名称为${nameA}_DORIS_${ClusterB}的数据源记录 |

##### 验证【控制台】新增Doris3.x组件版本 「P2」

> 前置条件
```
无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【控制台-多集群管理-集群配置-计算组件】 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 组件配置添加Doris | 系统提示添加成功，列表中出现新添加的记录，记录内容与填写一致 |
| 3 | 检查配置项 | 新增【组件版本】配置项, 位于组件名称下方 |
| 4 | 展开【组件版本】 | 默认选择2.x, 下拉支持选择2.x和3.x |

##### 验证 Doris3.x 同步任务导入前后准备语句执行有效 「P2」

> 前置条件
```
建表语句
DROP TABLE IF EXISTS doris2_src_prepare;
CREATE TABLE doris2_src_prepare (
id INT,
v STRING
)
ENGINE=OLAP
DISTRIBUTED BY HASH(id) BUCKETS 1
PROPERTIES(“replication_num“=“1“);
INSERT INTO doris2_src_prepare VALUES (1,'x');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据开发】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 新建数据同步任务 | 系统提示新增成功，列表顶部出现一条新建记录，内容与填写一致 |
| 3 | 源端配置：数据源: Doris2.xSchema: ${schemaA}表名: ${tableA} | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 4 | 目标端配置：数据源: Doris3.xSchema: ${schemaB}表: 一键生成目标表导入前准备语句：TRUNCATE TABLE ${schemaB}.${tableB};导入后准备语句: INSERT INTO ${schemaB}.${tableB} VALUES(2, 'done'); | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 5 | 其他配置: 字段映射: 同名映射通道控制: 默认 | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 6 | 保存任务后运行 | 任务运行成功，状态显示为【运行成功/成功】，无报错信息 |
| 7 | 执行SQL: SELECT * FROM ${schemaB}.${tableA}; | 查询成功, 表记录与Doris2.x表记录一致 |

##### 验证数据同步功能正常(Other → Doris3.x、per_job模式) 「P2」

> 前置条件
```
1. 「离线开发-数据源」已存在Doris3.x、SparkThrift2.x、Hive2.x、Doris2.x类型的数据源记录

2. 已存在SparkThrift2.x表和Hive2.x表, 建表语句如下:
CREATE TABLE if not exists example_managed_table (
 id INT,
 name STRING,
 age SMALLINT,
 bio STRING,
 birth_date DATE,
 last_seen TIMESTAMP,
 is_active BOOLEAN,
 height DECIMAL(3,2),
 email STRING,
 registration_date TIMESTAMP,
 profile_picture BINARY,
 salary DOUBLE,
 revision INT
)
COMMENT 'Example Managed Table'
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
STORED AS TEXTFILE;

INSERT INTO TABLE example_managed_table VALUES
(1001, '张伟', 28, '热爱编程与开源技术，擅长Java和Python开发。', '1996-05-12', '2025-06-04 10:30:00', TRUE, 1.75, 'zhangwei@example.com', '2024-03-15 10:30:00', NULL, 12000.0, 1),
(1002, '李娜', 32, '资深产品经理，拥有多年互联网产品设计经验。', '1992-08-24', '2025-06-04 09:15:00', FALSE, 1.68, 'lina@example.com', '2024-07-22 09:15:00', NULL, 15000.0, 2),
(1003, '王强', 45, '企业高管，专注于战略规划与市场拓展。', '1980-01-30', '2025-06-03 18:45:00', TRUE, 1.80, 'wangqiang@example.com', '2025-01-10 14:20:00', NULL, 25000.0, 1);

Doris2.x表, 建表语句如下:
CREATE TABLE example_primary_key_table (
 id LARGEINT NOT NULL COMMENT '主键 ID',
 registration_date DATETIME NOT NULL COMMENT '注册时间',
 name VARCHAR(255) COMMENT '用户名',
 age TINYINT COMMENT '年龄',
 bio VARCHAR(65533) COMMENT '个人简介',
 birth_date DATE COMMENT '出生日期',
 last_seen DATETIME COMMENT '最后在线时间',
 is_active BOOLEAN COMMENT '是否活跃',
 height DECIMAL(3,2) COMMENT '身高（米）',
 email VARCHAR(255) COMMENT '邮箱',
 profile_picture STRING COMMENT '头像图片',
 salary DOUBLE COMMENT '薪资',
 revision INT COMMENT '修订版本号',
 metadata STRING COMMENT '元数据'
)
UNIQUE KEY (id, registration_date)
PARTITION BY RANGE (registration_date) (
 PARTITION p2020 VALUES LESS THAN (“2021-01-01 00:00:00“),
 PARTITION p2021 VALUES LESS THAN (“2022-01-01 00:00:00“),
 PARTITION p2022 VALUES LESS THAN (“2023-01-01 00:00:00“),
 PARTITION p2023 VALUES LESS THAN (“2024-01-01 00:00:00“),
 PARTITION pmax VALUES LESS THAN (“9999-12-31 00:00:00“)
)
DISTRIBUTED BY HASH(id) BUCKETS 1
PROPERTIES (
 “replication_num“ = “1“,
 “enable_unique_key_merge_on_write“ = “true“
);

-- 插入第一条数据
INSERT INTO example_primary_key_table (
 id, registration_date, name, age, bio, birth_date, last_seen, is_active, height,
 email, profile_picture, salary, revision, metadata
) VALUES (
 5001,
 '2024-03-15 10:30:00',
 '杨帆',
 28,
 '数据库管理员，专长MySQL与PostgreSQL优化。',
 '1996-06-10',
 '2025-06-04 10:00:00',
 TRUE,
 1.74,
 'yangfan@example.com',
 'https://example.com/pic/yangfan.jpg',
 13000.0,
 1,
 '{“经验“: “DBA“, “公司“: “某金融机构“}'
);

-- 插入第二条数据
INSERT INTO example_primary_key_table (
 id, registration_date, name, age, bio, birth_date, last_seen, is_active, height,
 email, profile_picture, salary, revision, metadata
) VALUES (
 5002,
 '2024-07-22 09:15:00',
 '孙倩',
 31,
 'UX设计师，关注用户行为与界面交互设计。',
 '1993-04-18',
 '2025-06-04 09:30:00',
 TRUE,
 1.65,
 'sunqian@example.com',
 'https://example.com/pic/sunqian.jpg',
 15000.0,
 2,
 '{“技能“: [“Figma“, “Sketch“], “城市“: “杭州“}'
);

-- 插入第三条数据
INSERT INTO example_primary_key_table (
 id, registration_date, name, age, bio, birth_date, last_seen, is_active, height,
 email, profile_picture, salary, revision, metadata
) VALUES (
 5003,
 '2025-01-10 14:20:00',
 '马超',
 42,
 '技术总监，具备多年团队管理与项目规划经验。',
 '1982-11-05',
 '2025-06-03 18:45:00',
 TRUE,
 1.78,
 'machao@example.com',
 'https://example.com/pic/machao.jpg',
 24000.0,
 1,
 '{“经历“: [“创业“, “大厂“], “国家“: “中国“}'
);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据开发】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 新建周期任务:名称: Other2Doris类型: 数据同步配置模式: 向导模式向导模式: 无增量标识 | 系统提示新增成功，列表顶部出现一条新建记录，内容与填写一致 |
| 3 | 数据来源配置:数据源: SparkThrift2.xSchema: ${schemaA}表名: ${tableA} | 配置成功, 点击【数据预览】可查看表数据 |
| 4 | 选择目标配置: 数据源: Doris3.xSchema: ${schemaB}表名: 一键生成目标表写入模式: 覆盖 | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 5 | 其他配置: 字段映射: 同名映射通道控制: 默认环境参数: 开启per_job模式(取消注释: flinkTaskRunMode=per_job) | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 6 | 保存任务后运行 | 任务运行成功，状态显示为【运行成功/成功】，无报错信息 |
| 7 | 执行DorisSQL: SELECT * FROM ${schemaB}.${tableA}; | 查询成功, 表记录与SparkThrift2.x表记录一致 |
| 8 | 编辑数据同步任务Other2Doris的数据来源配置:数据源: Hive2.xSchema: ${schemaC}表名: ${tableC} | 配置成功, 点击【数据预览】可查看表数据 |
| 9 | 其他配置保持不变, 保存任务后运行 | 编辑后的任务运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 10 | 执行DorisSQL: SELECT * FROM ${schemaB}.${tableC}; | 查询成功, 表记录与Hive2.x表记录一致 |
| 11 | 编辑数据同步任务Other2Doris的数据来源配置:数据源: Doris2.xSchema: ${schemaD}表名: ${tableD} | 配置成功, 点击【数据预览】可查看表数据 |
| 12 | 其他配置保持不变, 保存任务后运行 | 编辑后的任务运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 13 | 执行DorisSQL: SELECT * FROM ${schemaB}.${tableD}; | 查询成功, 表记录与Doris2.x表记录一致 |

##### 验证数据同步功能正常(Doris3.x → Other、session模式) 「P1」

> 前置条件
```
1. 「离线开发-数据源」已存在Doris3.x、SparkThrift2.x、Hive2.x、Doris2.x类型的数据源记录

2. 已存在Doris3.x表, 建表语句如下:
CREATE TABLE if not exists example_primary_key_table (
 id LARGEINT NOT NULL COMMENT '主键 ID',
 registration_date DATETIME NOT NULL COMMENT '注册时间',
 name VARCHAR(255) COMMENT '用户名',
 age TINYINT COMMENT '年龄',
 bio VARCHAR(65533) COMMENT '个人简介',
 birth_date DATE COMMENT '出生日期',
 last_seen DATETIME COMMENT '最后在线时间',
 is_active BOOLEAN COMMENT '是否活跃',
 height DECIMAL(3,2) COMMENT '身高（米）',
 email VARCHAR(255) COMMENT '邮箱',
 profile_picture STRING COMMENT '头像图片',
 salary DOUBLE COMMENT '薪资',
 revision INT COMMENT '修订版本号',
 metadata STRING COMMENT '元数据'
)
UNIQUE KEY (id, registration_date)
PARTITION BY RANGE (registration_date) (
 PARTITION p2020 VALUES LESS THAN (“2021-01-01 00:00:00“),
 PARTITION p2021 VALUES LESS THAN (“2022-01-01 00:00:00“),
 PARTITION p2022 VALUES LESS THAN (“2023-01-01 00:00:00“),
 PARTITION p2023 VALUES LESS THAN (“2024-01-01 00:00:00“),
 PARTITION pmax VALUES LESS THAN (“9999-12-31 00:00:00“)
)
DISTRIBUTED BY HASH(id) BUCKETS 1
PROPERTIES (
 “replication_num“ = “1“,
 “enable_unique_key_merge_on_write“ = “true“
);

-- 插入第一条数据
INSERT INTO example_primary_key_table (
 id, registration_date, name, age, bio, birth_date, last_seen, is_active, height,
 email, profile_picture, salary, revision, metadata
) VALUES (
 5001,
 '2024-03-15 10:30:00',
 '杨帆',
 28,
 '数据库管理员，专长MySQL与PostgreSQL优化。',
 '1996-06-10',
 '2025-06-04 10:00:00',
 TRUE,
 1.74,
 'yangfan@example.com',
 'https://example.com/pic/yangfan.jpg',
 13000.0,
 1,
 '{“经验“: “DBA“, “公司“: “某金融机构“}'
);

-- 插入第二条数据
INSERT INTO example_primary_key_table (
 id, registration_date, name, age, bio, birth_date, last_seen, is_active, height,
 email, profile_picture, salary, revision, metadata
) VALUES (
 5002,
 '2024-07-22 09:15:00',
 '孙倩',
 31,
 'UX设计师，关注用户行为与界面交互设计。',
 '1993-04-18',
 '2025-06-04 09:30:00',
 TRUE,
 1.65,
 'sunqian@example.com',
 'https://example.com/pic/sunqian.jpg',
 15000.0,
 2,
 '{“技能“: [“Figma“, “Sketch“], “城市“: “杭州“}'
);

-- 插入第三条数据
INSERT INTO example_primary_key_table (
 id, registration_date, name, age, bio, birth_date, last_seen, is_active, height,
 email, profile_picture, salary, revision, metadata
) VALUES (
 5003,
 '2025-01-10 14:20:00',
 '马超',
 42,
 '技术总监，具备多年团队管理与项目规划经验。',
 '1982-11-05',
 '2025-06-03 18:45:00',
 TRUE,
 1.78,
 'machao@example.com',
 'https://example.com/pic/machao.jpg',
 24000.0,
 1,
 '{“经历“: [“创业“, “大厂“], “国家“: “中国“}'
);
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据开发】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 新建周期任务:名称: Doris2Other类型: 数据同步配置模式: 向导模式向导模式: 无增量标识 | 系统提示新增成功，列表顶部出现一条新建记录，内容与填写一致 |
| 3 | 数据来源配置:数据源: Doris3.xSchema: ${schemaA}表名: ${tableA} | 配置成功, 点击【数据预览】可查看表数据 |
| 4 | 选择目标配置: 数据源: SparkThrift2.xSchema: ${schemaB}表名: 一键生成目标表写入模式: 覆盖 | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 5 | 其他配置: 字段映射: 同名映射通道控制: 默认 | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 6 | 保存任务后运行 | 任务运行成功，状态显示为【运行成功/成功】，无报错信息 |
| 7 | 新建SparkSQL任务, 执行SQL: SELECT * FROM ${schemaB}.${tableA}; | 查询成功, 表记录与Doris3.x表记录一致 |
| 8 | 编辑数据同步任务Doris2Other的选择目标配置:数据源: Hive2.xSchema: ${schemaC}表名: 一键生成目标表写入模式: 覆盖 | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 9 | 其他配置保持不变, 保存任务后运行 | 编辑后的任务运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 10 | 新建HiveSQL任务, 执行SQL: SELECT * FROM ${schemaC}.${tableA}; | 查询成功, 表记录与Doris3.x表记录一致 |
| 11 | 编辑数据同步任务Doris2Other的选择目标配置:数据源: Doris2.xSchema: ${schemaD}表名: 一键生成目标表写入模式: 覆盖 | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 12 | 其他配置保持不变, 保存任务后运行 | 编辑后的任务运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 13 | 新建DorisSQL任务, 执行SQL: SELECT * FROM ${schemaD}.${tableA}; | 查询成功, 表记录与Doris3.x表记录一致 |

##### 验证整库同步功能正常(Other → Doris2.x) 「P3」

> 前置条件
```
「离线开发-数据源」已存在Doris3.x、SparkThrift2.x、Hive2.x、Doris2.x类型的数据源记录
SR

CREATE TABLE sr_example_primary_key_table (
 id LARGEINT NOT NULL COMMENT '主键 ID',
 registration_date DATETIME NOT NULL COMMENT '注册时间',
 name VARCHAR(255) COMMENT '用户名',
 age TINYINT COMMENT '年龄',
 bio VARCHAR(65533) COMMENT '个人简介',
 birth_date DATE COMMENT '出生日期',
 last_seen DATETIME COMMENT '最后在线时间',
 is_active BOOLEAN COMMENT '是否活跃',
 height DECIMAL(3,2) COMMENT '身高（米）',
 email VARCHAR(255) COMMENT '邮箱',
 profile_picture STRING COMMENT '头像图片',
 salary DOUBLE COMMENT '薪资',
 revision INT COMMENT '修订版本号',
 metadata STRING COMMENT '元数据'
)
PRIMARY KEY (id, registration_date)
PARTITION BY RANGE (registration_date) (
 PARTITION p2020 VALUES LESS THAN (“2021-01-01 00:00:00“),
 PARTITION p2021 VALUES LESS THAN (“2022-01-01 00:00:00“),
 PARTITION p2022 VALUES LESS THAN (“2023-01-01 00:00:00“),
 PARTITION p2023 VALUES LESS THAN (“2024-01-01 00:00:00“),
 PARTITION pmax VALUES LESS THAN (“9999-12-31 00:00:00“)
)
DISTRIBUTED BY HASH(id) BUCKETS 1
PROPERTIES (
 “replication_num“ = “1“
);

-- 插入第一条数据
INSERT INTO sr_example_primary_key_table (
 id, registration_date, name, age, bio, birth_date, last_seen, is_active, height,
 email, profile_picture, salary, revision, metadata
) VALUES (
 5001,
 '2024-03-15 10:30:00',
 '杨帆',
 28,
 '数据库管理员，专长MySQL与PostgreSQL优化。',
 '1996-06-10',
 '2025-06-04 10:00:00',
 TRUE,
 1.74,
 'yangfan@example.com',
 'https://example.com/pic/yangfan.jpg',
 13000.0,
 1,
 '{“经验“: “DBA“, “公司“: “某金融机构“}'
);

-- 插入第二条数据
INSERT INTO sr_example_primary_key_table (
 id, registration_date, name, age, bio, birth_date, last_seen, is_active, height,
 email, profile_picture, salary, revision, metadata
) VALUES (
 5002,
 '2024-07-22 09:15:00',
 '孙倩',
 31,
 'UX设计师，关注用户行为与界面交互设计。',
 '1993-04-18',
 '2025-06-04 09:30:00',
 TRUE,
 1.65,
 'sunqian@example.com',
 'https://example.com/pic/sunqian.jpg',
 15000.0,
 2,
 '{“技能“: [“Figma“, “Sketch“], “城市“: “杭州“}'
);

-- 插入第三条数据
INSERT INTO sr_example_primary_key_table (
 id, registration_date, name, age, bio, birth_date, last_seen, is_active, height,
 email, profile_picture, salary, revision, metadata
) VALUES (
 5003,
 '2025-01-10 14:20:00',
 '马超',
 42,
 '技术总监，具备多年团队管理与项目规划经验。',
 '1982-11-05',
 '2025-06-03 18:45:00',
 TRUE,
 1.78,
 'machao@example.com',
 'https://example.com/pic/machao.jpg',
 24000.0,
 1,
 '{“经历“: [“创业“, “大厂“], “国家“: “中国“}'
);

SELECT * from sr_example_primary_key_table;

MySQL
CREATE TABLE mysql_example_table (
 id INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键ID',
 name VARCHAR(255) NOT NULL COMMENT '用户名，不能为空',
 age TINYINT UNSIGNED COMMENT '年龄，非负数',
 bio TEXT COMMENT '个人简介',
 birth_date DATE COMMENT '出生日期',
 last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '最后一次在线时间，默认当前时间',
 is_active BOOLEAN COMMENT '是否活跃',
 height DECIMAL(3,2) COMMENT '身高，单位米，保留两位小数',
 email VARCHAR(255) UNIQUE COMMENT '邮箱，唯一',
 registration_date DATETIME COMMENT '注册日期和时间',
 profile_picture BLOB COMMENT '头像图片二进制数据',
 salary DOUBLE COMMENT '薪资',
 revision INT DEFAULT 1 COMMENT '版本号，默认1',
 metadata JSON COMMENT '额外元数据信息，JSON格式'
);

INSERT INTO mysql_example_table (name, age, bio, birth_date, is_active, height, email, registration_date, profile_picture, salary, metadata)
VALUES 
('张三', 28, '热爱编程的软件工程师', '1997-05-30', TRUE, 1.75, 'zhangsan@example.com', '2020-01-01 10:00:00', NULL, 12000.50, '{“department“:“研发部“,“level“:“中级“}'),
('李四', 34, '经验丰富的项目经理', '1989-08-15', TRUE, 1.80, 'lisi@example.com', '2019-03-12 09:30:00', NULL, 15000.75, '{“department“:“项目管理部“,“level“:“高级“}'),
('王五', 22, '新晋的数据分析师', '2003-02-20', FALSE, 1.65, 'wangwu@example.com', '2022-06-01 14:20:00', NULL, 8000.00, '{“department“:“数据分析部“,“level“:“初级“}'),
('赵六', 45, '资深的产品设计师', '1978-12-11', TRUE, 1.70, 'zhaoliu@example.com', '2018-07-23 16:45:00', NULL, 20000.00, '{“department“:“产品设计部“,“level“:“专家“}'),
('孙七', 30, '专业的前端开发人员', '1995-04-04', TRUE, 1.78, 'sunqi@example.com', '2021-02-28 11:11:11', NULL, 13000.00, '{“department“:“前端开发部“,“level“:“中级“}'),
('周八', 26, '移动应用开发者', '1999-11-22', FALSE, 1.68, 'zhouba@example.com', '2023-09-15 08:50:00', NULL, 9500.25, '{“department“:“移动端开发部“,“level“:“初级“}');

SELECT * from mysql_example_table;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据源】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 选择一条Starrocks类型的数据源记录, 点击【整库同步】 | 进入整库同步页面 |
| 3 | 配置如下: | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 4 | 源表: 勾选${tableA} | 发布成功, 【同步历史】新增同步记录 |
| 5 | 目标: Doris2.x | 查询成功, 表记录与SR表记录一致 |
| 6 | Schema: 选择${schemaA} | 进入整库同步页面 |
| 7 | 方式: 全量 | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 8 | 日期、时间: 默认 | 发布成功, 【同步历史】新增同步记录 |
| 9 | 并发配置: 整批上传 | 查询成功, 表记录与MySQL表记录一致 |
| 10 | 保存目录: 默认 |  |
| 11 | 点击发布任务 |  |
| 12 | 新建SR SQL任务, 执行SQL: SELECT * FROM ${schemaA}.${tableA}; |  |
| 13 | 选择一条MySQL类型的数据源记录, 点击【整库同步】 |  |
| 14 | 配置如下: |  |
| 15 | 源表: 勾选${tableB} |  |
| 16 | 目标: Doris2.x |  |
| 17 | Schema: 选择${schemaB} |  |
| 18 | 方式: 全量 |  |
| 19 | 日期、时间: 默认 |  |
| 20 | 并发配置: 整批上传 |  |
| 21 | 保存目录: 默认 |  |
| 22 | 点击发布任务 |  |
| 23 | 新建MySQL任务, 执行SQL: SELECT * FROM ${schemaB}.${tableB}; |  |

##### 验证整库同步功能正常(Other → Doris3.x) 「P2」

> 前置条件
```
「离线开发-数据源」已存在Doris3.x、SparkThrift2.x、Hive2.x、Doris2.x类型的数据源记录
SR

CREATE TABLE sr_example_primary_key_table (
 id LARGEINT NOT NULL COMMENT '主键 ID',
 registration_date DATETIME NOT NULL COMMENT '注册时间',
 name VARCHAR(255) COMMENT '用户名',
 age TINYINT COMMENT '年龄',
 bio VARCHAR(65533) COMMENT '个人简介',
 birth_date DATE COMMENT '出生日期',
 last_seen DATETIME COMMENT '最后在线时间',
 is_active BOOLEAN COMMENT '是否活跃',
 height DECIMAL(3,2) COMMENT '身高（米）',
 email VARCHAR(255) COMMENT '邮箱',
 profile_picture STRING COMMENT '头像图片',
 salary DOUBLE COMMENT '薪资',
 revision INT COMMENT '修订版本号',
 metadata STRING COMMENT '元数据'
)
PRIMARY KEY (id, registration_date)
PARTITION BY RANGE (registration_date) (
 PARTITION p2020 VALUES LESS THAN (“2021-01-01 00:00:00“),
 PARTITION p2021 VALUES LESS THAN (“2022-01-01 00:00:00“),
 PARTITION p2022 VALUES LESS THAN (“2023-01-01 00:00:00“),
 PARTITION p2023 VALUES LESS THAN (“2024-01-01 00:00:00“),
 PARTITION pmax VALUES LESS THAN (“9999-12-31 00:00:00“)
)
DISTRIBUTED BY HASH(id) BUCKETS 1
PROPERTIES (
 “replication_num“ = “1“
);

-- 插入第一条数据
INSERT INTO sr_example_primary_key_table (
 id, registration_date, name, age, bio, birth_date, last_seen, is_active, height,
 email, profile_picture, salary, revision, metadata
) VALUES (
 5001,
 '2024-03-15 10:30:00',
 '杨帆',
 28,
 '数据库管理员，专长MySQL与PostgreSQL优化。',
 '1996-06-10',
 '2025-06-04 10:00:00',
 TRUE,
 1.74,
 'yangfan@example.com',
 'https://example.com/pic/yangfan.jpg',
 13000.0,
 1,
 '{“经验“: “DBA“, “公司“: “某金融机构“}'
);

-- 插入第二条数据
INSERT INTO sr_example_primary_key_table (
 id, registration_date, name, age, bio, birth_date, last_seen, is_active, height,
 email, profile_picture, salary, revision, metadata
) VALUES (
 5002,
 '2024-07-22 09:15:00',
 '孙倩',
 31,
 'UX设计师，关注用户行为与界面交互设计。',
 '1993-04-18',
 '2025-06-04 09:30:00',
 TRUE,
 1.65,
 'sunqian@example.com',
 'https://example.com/pic/sunqian.jpg',
 15000.0,
 2,
 '{“技能“: [“Figma“, “Sketch“], “城市“: “杭州“}'
);

-- 插入第三条数据
INSERT INTO sr_example_primary_key_table (
 id, registration_date, name, age, bio, birth_date, last_seen, is_active, height,
 email, profile_picture, salary, revision, metadata
) VALUES (
 5003,
 '2025-01-10 14:20:00',
 '马超',
 42,
 '技术总监，具备多年团队管理与项目规划经验。',
 '1982-11-05',
 '2025-06-03 18:45:00',
 TRUE,
 1.78,
 'machao@example.com',
 'https://example.com/pic/machao.jpg',
 24000.0,
 1,
 '{“经历“: [“创业“, “大厂“], “国家“: “中国“}'
);

SELECT * from sr_example_primary_key_table;

MySQL
CREATE TABLE mysql_example_table (
 id INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键ID',
 name VARCHAR(255) NOT NULL COMMENT '用户名，不能为空',
 age TINYINT UNSIGNED COMMENT '年龄，非负数',
 bio TEXT COMMENT '个人简介',
 birth_date DATE COMMENT '出生日期',
 last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '最后一次在线时间，默认当前时间',
 is_active BOOLEAN COMMENT '是否活跃',
 height DECIMAL(3,2) COMMENT '身高，单位米，保留两位小数',
 email VARCHAR(255) UNIQUE COMMENT '邮箱，唯一',
 registration_date DATETIME COMMENT '注册日期和时间',
 profile_picture BLOB COMMENT '头像图片二进制数据',
 salary DOUBLE COMMENT '薪资',
 revision INT DEFAULT 1 COMMENT '版本号，默认1',
 metadata JSON COMMENT '额外元数据信息，JSON格式'
);

INSERT INTO mysql_example_table (name, age, bio, birth_date, is_active, height, email, registration_date, profile_picture, salary, metadata)
VALUES 
('张三', 28, '热爱编程的软件工程师', '1997-05-30', TRUE, 1.75, 'zhangsan@example.com', '2020-01-01 10:00:00', NULL, 12000.50, '{“department“:“研发部“,“level“:“中级“}'),
('李四', 34, '经验丰富的项目经理', '1989-08-15', TRUE, 1.80, 'lisi@example.com', '2019-03-12 09:30:00', NULL, 15000.75, '{“department“:“项目管理部“,“level“:“高级“}'),
('王五', 22, '新晋的数据分析师', '2003-02-20', FALSE, 1.65, 'wangwu@example.com', '2022-06-01 14:20:00', NULL, 8000.00, '{“department“:“数据分析部“,“level“:“初级“}'),
('赵六', 45, '资深的产品设计师', '1978-12-11', TRUE, 1.70, 'zhaoliu@example.com', '2018-07-23 16:45:00', NULL, 20000.00, '{“department“:“产品设计部“,“level“:“专家“}'),
('孙七', 30, '专业的前端开发人员', '1995-04-04', TRUE, 1.78, 'sunqi@example.com', '2021-02-28 11:11:11', NULL, 13000.00, '{“department“:“前端开发部“,“level“:“中级“}'),
('周八', 26, '移动应用开发者', '1999-11-22', FALSE, 1.68, 'zhouba@example.com', '2023-09-15 08:50:00', NULL, 9500.25, '{“department“:“移动端开发部“,“level“:“初级“}');

SELECT * from mysql_example_table;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据源】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 选择一条StarRocks类型的数据源记录, 点击【整库同步】 | 进入整库同步页面 |
| 3 | 配置如下: | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 4 | 源表: 勾选${tableA} | 发布成功, 【同步历史】新增同步记录 |
| 5 | 目标: Doris3.x | 查询成功, 表记录与StarRocks表记录一致 |
| 6 | Schema: 选择${schemaA} | 进入整库同步页面 |
| 7 | 方式: 全量 | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 8 | 日期、时间: 默认 | 发布成功, 【同步历史】新增同步记录 |
| 9 | 并发配置: 整批上传 | 查询成功, 表记录与MySQL表记录一致 |
| 10 | 保存目录: 默认 |  |
| 11 | 点击发布任务 |  |
| 12 | 新建StarRocks SQL任务, 执行SQL: SELECT * FROM ${schema A}.${tableA}; |  |
| 13 | 选择一条MySQL类型的数据源记录, 点击【整库同步】 |  |
| 14 | 配置如下: |  |
| 15 | 源表: 勾选${tableB} |  |
| 16 | 目标: Doris3.x |  |
| 17 | Schema: 选择${schemaB} |  |
| 18 | 方式: 全量 |  |
| 19 | 日期、时间: 默认 |  |
| 20 | 并发配置: 整批上传 |  |
| 21 | 保存目录: 默认 |  |
| 22 | 点击发布任务 |  |
| 23 | 新建MySQL任务, 执行SQL: SELECT * FROM ${schemaB}.${tableB}; |  |

##### 验证整库同步功能正常(Doris2.x → Other) 「P3」

> 前置条件
```
「离线开发-数据源」已存在Doris3.x、SparkThrift2.x、Hive2.x、Doris2.x类型的数据源记录
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据源】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 选择一条Doris2.x类型的数据源记录, 点击【整库同步】 | 进入整库同步页面 |
| 3 | 配置如下: 源表: 勾选${tableA}目标: SparkThrift2.xSchema: 选择${schemaA}方式: 全量日期、时间: 默认并发配置: 整批上传保存目录: 默认 | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 4 | 点击发布任务 | 发布成功, 【同步历史】新增同步记录 |
| 5 | 新建SparkSQL任务, 执行SQL: SELECT * FROM ${schemaA}.${tableA}; | 查询成功, 表记录与Doris2.x表记录一致 |
| 6 | 再次配置Doris2.x【整库同步】: 源表: 勾选${tableB}目标: Hive2.xSchema: ${schemaB}方式: 全量日期、时间: 默认并发配置: 整批上传保存目录: 默认 | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 7 | 点击发布任务 | 发布成功, 【同步历史】新增同步记录 |
| 8 | 新建HiveSQL任务, 执行SQL: SELECT * FROM ${schemaB}.${tableB}; | 查询成功, 表记录与Doris2.x表记录一致 |
| 9 | 再次配置Doris2.x【整库同步】: 源表: 勾选${tableC}目标: Doris2.xSchema: ${schemaC}方式: 全量日期、时间: 默认并发配置: 整批上传保存目录: 默认 | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 10 | 点击发布任务 | 发布成功, 【同步历史】新增同步记录 |
| 11 | 新建DorisSQL任务, 执行SQL: SELECT * FROM ${schemaC}.${tableC}; | 查询成功, 表记录与Doris2.x表记录一致 |

##### 验证整库同步功能正常(Doris3.x → Other) 「P1」

> 前置条件
```
「离线开发-数据源」已存在Doris3.x、SparkThrift2.x、Hive2.x、Doris2.x类型的数据源记录
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据源】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 选择一条Doris3.x类型的数据源记录, 点击【整库同步】 | 进入整库同步页面 |
| 3 | 配置如下: 源表: 勾选${tableA}目标: SparkThrift2.xSchema: 选择${schemaA}方式: 全量日期、时间: 默认并发配置: 整批上传保存目录: 默认 | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 4 | 点击发布任务 | 发布成功, 【同步历史】新增同步记录 |
| 5 | T+1后, 新建SparkSQL任务, 执行SQL: SELECT * FROM ${schemaA}.${tableA}; | 查询成功, 表记录与Doris3.x表记录一致 |
| 6 | 再次配置Doris3.x【整库同步】: 源表: 勾选${tableB}目标: Hive2.xSchema: ${schemaB}方式: 全量日期、时间: 默认并发配置: 整批上传保存目录: 默认 | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 7 | 点击发布任务 | 发布成功, 【同步历史】新增同步记录 |
| 8 | T+1后, 新建HiveSQL任务, 执行SQL: SELECT * FROM ${schemaB}.${tableB}; | 查询成功, 表记录与Doris3.x表记录一致 |
| 9 | 再次配置Doris3.x【整库同步】: 源表: 勾选${tableC}目标: Doris2.xSchema: ${schemaC}方式: 全量日期、时间: 默认并发配置: 整批上传保存目录: 默认 | 系统提示配置成功，配置项已生效，页面显示最新配置状态 |
| 10 | 点击发布任务 | 发布成功, 【同步历史】新增同步记录 |
| 11 | T+1后, 新建DorisSQL任务, 执行SQL: SELECT * FROM ${schemaC}.${tableC}; | 查询成功, 表记录与Doris3.x表记录一致 |

##### 验证【数据源】页面正确展示Doris3.x版本信息 「P3」

> 前置条件
```
「公共管理-数据源中心」已存在一条Doris3.x类型的数据源记录
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据源】页面 | 成功进入目标页面，页面内容正常加载显示，无报错 |
| 2 | 点击【引入数据源】 | 弹出可用数据源弹窗 |
| 3 | 点击【数据源类型】下拉框 | 新增可选项【Doris3.x】 |
| 4 | 选择【Doris3.x】数据源并确定 | 数据源成功引入至离线平台 |
| 5 | 检查Doris 3.x数据源记录的类型字段值 | 显示为【Doris3.x】 |
| 6 | 点击【数据源类型】下拉框 | 新增可选项【Doris3.x】 |
| 7 | 选择Doris3.x | 过滤出类型为【Doris3.x】的数据源记录 |

