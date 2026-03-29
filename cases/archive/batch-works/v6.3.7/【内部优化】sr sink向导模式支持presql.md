---
name: 【内部优化】sr sink向导模式支持presql v6.3.7
description: 【内部优化】sr sink向导模式支持presql v6.3.7
tags:
  - 离线开发
  - 离线开发-数据开发-数据同步
  - 内部优化
  - sr
  - sink向导模式支持presql
module: batch-works
version: v6.3.7
source: zentao-cases/dtstack-platform/离线开发/archive-cases/v6.3.7/【内部优化】sr sink向导模式支持presql.csv
case_count: 6
created_at: 2026-03-29
origin: csv
---
# 【内部优化】sr sink向导模式支持presql v6.3.7
> 来源：zentao-cases/dtstack-platform/离线开发/archive-cases/v6.3.7/【内部优化】sr sink向导模式支持presql.csv
> 用例数：6

---

## 离线开发-数据开发-数据同步

##### 验证历史向导模式正常运行 「P3」

> 前置条件
```
建表语句
CREATE TABLE test_001 (
id INT,
name VARCHAR(255)
)
ENGINE=OLAP
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
CREATE TABLE test_002 (
id INT,
name VARCHAR(255)
)
ENGINE=OLAP
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');

写入前语句：
ALTER TABLE test_002
ADD COLUMN bir INT DEFAULT 1;
写入后语句：
DELETE FROM test_002
WHERE id = 1;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，找到一个历史向导模式数据同步任务（starrocks-starrocks），编辑目标数据界面写入前后准备语句，点击保存 | 系统提示任务保存成功，任务已保存至任务列表，可继续编辑或提交 |
| 2 | 点击临时运行 | 任务状态更新为【运行成功】，运行日志无错误信息，输出结果符合预期 |
| 3 | 查看starrocks中test_002表数据 | 成功从starrocks中表数据同步过来，字段包含id、name、bir，同时数据不包含id=1的数据 |

##### 验证使用错误的写入后准备语句，语句不执行 「P2」

> 前置条件
```
建表语句
CREATE TABLE test_001 (
id INT,
name VARCHAR(255)
)
ENGINE=OLAP
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
CREATE TABLE test_002 (
id INT,
name VARCHAR(255)
)
ENGINE=OLAP
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');
写入前语句：
ALTER TABLE test_002
ADD COLUMN bir INT DEFAULT 1;
写入后语句：
dorp table test_22222222;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建向导模式的数据同步任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 点击数据来源--数据源下拉列表 | 来源数据源支持starrocks数据源，下拉选择数据表，可选范围为数据库连接用户下的所有数据库 |
| 3 | 选择来源数据源，选择选择starrocks数据源，选择test_001，点击下一步 | 进入选择目标页面 |
| 4 | 选择目标数据源starrocks，选择schema及表test_002，输入写入前、写入后准备语句，点击下一步 | 进入配置映射界面 |
| 5 | 配置正确的映射，点击下一步 | 进入通道控制页面 |
| 6 | 点击下一步，点击保存，进行临时运行 | 运行失败，提示表test_22222222不存在 |
| 7 | 查看starrocks中test_002表数据 | 因同步任务运行失败，故表test_002无数据 |

##### 验证使用错误的写入前准备语句，语句不执行 「P2」

> 前置条件
```
建表语句
CREATE TABLE test_001 (
id INT,
name VARCHAR(255)
)
ENGINE=OLAP
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
CREATE TABLE test_002 (
id INT,
name VARCHAR(255)
)
ENGINE=OLAP
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');
写入前语句：
dorp table test_22222222;
写入后语句：
DELETE FROM test_002
WHERE id = 1;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建向导模式的数据同步任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 点击数据来源--数据源下拉列表 | 来源数据源支持starrocks数据源，下拉选择数据表，可选范围为数据库连接用户下的所有数据库 |
| 3 | 选择来源数据源，选择选择starrocks数据源，选择test_001，点击下一步 | 进入选择目标页面 |
| 4 | 选择目标数据源starrocks，选择schema及表test_002，输入写入前、写入后准备语句，点击下一步 | 进入配置映射界面 |
| 5 | 配置正确的映射，点击下一步 | 进入通道控制页面 |
| 6 | 点击下一步，点击保存，进行临时运行 | 运行失败，提示表test_22222222不存在 |
| 7 | 查看starrocks中test_002表数据 | 因同步数据任务失败，故表test_002无数据 |

##### 验证转脚本模式正常运行，相关sql存在 「P2」

> 前置条件
```
建表语句
CREATE TABLE test_001 (
id INT,
name VARCHAR(255)
)
ENGINE=OLAP
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
CREATE TABLE test_002 (
id INT,
name VARCHAR(255)
)
ENGINE=OLAP
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');

写入前语句：
ALTER TABLE test_002
ADD COLUMN bir INT DEFAULT 1;
写入后语句：
DELETE FROM test_002
WHERE id = 1;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建向导模式的数据同步任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 点击数据来源--数据源下拉列表 | 来源数据源支持starrocks数据源，下拉选择数据表，可选范围为数据库连接用户下的所有数据库 |
| 3 | 选择来源数据源，选择选择starrocks数据源，选择test_001，点击下一步 | 进入选择目标页面 |
| 4 | 选择目标数据源starrocks，选择schema及表test_002，输入写入前、写入后准备语句，点击下一步 | 进入配置映射界面 |
| 5 | 配置正确的映射，点击下一步 | 进入通道控制页面 |
| 6 | 点击下一步，点击保存，点击转换为脚本 | 脚本转换成功，搜索对应写入前后准备语句可正常搜索 |
| 7 | 进行临时运行 | 配置以及环境无误的话，任务成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 8 | 查看starrocks中test_002表数据 | 成功从starrocks中表数据同步过来，字段包含id、name、bir，同时数据不包含id=1的数据 |

##### 验证向导模式正常运行 「P1」

> 前置条件
```
建表语句
CREATE TABLE test_001 (
id INT,
name VARCHAR(255)
)
ENGINE=OLAP
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
CREATE TABLE test_002 (
id INT,
name VARCHAR(255)
)
ENGINE=OLAP
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');

写入前语句：
ALTER TABLE test_002
ADD COLUMN bir INT DEFAULT 1;
写入后语句：
DELETE FROM test_002
WHERE id = 1;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建向导模式的数据同步任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 点击数据来源--数据源下拉列表 | 来源数据源支持starrocks数据源，下拉选择数据表，可选范围为数据库连接用户下的所有数据库 |
| 3 | 选择来源数据源，选择选择starrocks数据源，选择test_001，点击下一步 | 进入选择目标页面 |
| 4 | 选择目标数据源starrocks，选择schema及表test_002，输入写入前、写入后准备语句，点击下一步 | 进入配置映射界面 |
| 5 | 配置正确的映射，点击下一步 | 进入通道控制页面 |
| 6 | 点击下一步，点击保存，进行临时运行 | 配置以及环境无误的话，任务成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 7 | 查看starrocks中test_002表数据 | 成功从starrocks中表数据同步过来，字段包含id、name、bir，同时数据不包含id=1的数据 |

##### 验证前端交互框校验 「P1」

> 前置条件
```
建表语句
CREATE TABLE test_001 (
id INT,
name VARCHAR(255)
)
ENGINE=OLAP
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
CREATE TABLE test_002 (
id INT,
name VARCHAR(255)
)
ENGINE=OLAP
DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');

写入前语句：
ALTER TABLE test_002
ADD COLUMN bir INT DEFAULT 1;
写入后语句：
DELETE FROM test_002
WHERE id = 1;
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发模块，新建向导模式的数据同步任务 | 系统提示新建成功，列表顶部出现新建的记录，记录内容与填写一致 |
| 2 | 选择来源数据源，选择选择starrocks数据源，选择test_001，点击下一步 | 进入选择目标页面 |
| 3 | 选择目标数据源，选择starrocks数据源 | 新增导入前准备语句和导入后准备语句交互框，非必填 |

