---
name: 【内部优化】engine-plugins稳定性优化测试 v6.3.7
description: 【内部优化】engine-plugins稳定性优化测试 v6.3.7
tags:
  - 离线开发
  - 离线开发-数据开发-计算引擎
  - 内部优化
  - engine
  - plugins稳定性优化测试
module: batch-works
version: v6.3.7
source: zentao-cases/dtstack-platform/离线开发/archive-cases/v6.3.7/【内部优化】engine-plugins稳定性优化测试.csv
case_count: 16
created_at: 2026-03-29
origin: csv
---
# 【内部优化】engine-plugins稳定性优化测试 v6.3.7
> 来源：zentao-cases/dtstack-platform/离线开发/archive-cases/v6.3.7/【内部优化】engine-plugins稳定性优化测试.csv
> 用例数：16

---

## 离线开发-数据开发-计算引擎

##### 验证开启缓存控制--缓存路径无权限--prejob--验证数据同步任务运行成功 「P2」

> 前置条件
```
执行建表语句：
CREATE TABLE if NOT EXISTS test_001(id INT,name VARCHAR(255));
CREATE TABLE if NOT EXISTS test_002(id INT,name VARCHAR(255));

INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');
控制台已经开启缓存enableRemoteCache = true
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发-创建数据同步任务 | 成功进入数据开发-创建数据同步任务页面，页面内容正常加载显示，无报错 |
| 2 | 删除hdfs路径/dtInsight/engine_plugins及dtinsight下所有文件及目录，同时修改路径权限为最低权限：chmod -R 444 /dtInsight/engine_plugins | 删除成功，路径权限修改成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入数据开发-创建数据同步任务 | 数据同步任务创建成功，系统给出创建成功提示，列表中出现新创建的记录 |
| 4 | 选择来源数据源mysql，选择schema及表test_001，点击下一步 | 表选择成功，进入选择目标界面 |
| 5 | 选择目标数据源mysql，选择schema及表test_002，点击下一步 | 表选择成功，进入字段映射界面 |
| 6 | 点击同行映射，点击下一步 | 字段正常互相映射，进入通道控制界面 |
| 7 | 配置均默认，直接点击下一步，环境参数改成flinkTaskRunMode=per_job，保存 | 数据同步任务配置完成 |
| 8 | 点击运行 | 数据同步任务运行成功，test_002表正常插入数据 |
| 9 | 进入hdfs路径/dtInsight/engine_plugins及dtinsight查看 | 路径无文件生成 |

##### 验证开启缓存控制--缓存路径无权限--session--验证数据同步任务运行成功 「P1」

> 前置条件
```
执行建表语句：
CREATE TABLE if NOT EXISTS test_001(id INT,name VARCHAR(255));
CREATE TABLE if NOT EXISTS test_002(id INT,name VARCHAR(255));

INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');
控制台已经开启缓存enableRemoteCache = true
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发-创建数据同步任务 | 成功进入数据开发-创建数据同步任务页面，页面内容正常加载显示，无报错 |
| 2 | 删除hdfs路径/dtInsight/engine_plugins及dtinsight下所有文件及目录，同时修改路径权限为最低权限：chmod -R 444 /dtInsight/engine_plugins | 删除成功，路径权限修改成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入数据开发-创建数据同步任务 | 数据同步任务创建成功，系统给出创建成功提示，列表中出现新创建的记录 |
| 4 | 选择来源数据源mysql，选择schema及表test_001，点击下一步 | 表选择成功，进入选择目标界面 |
| 5 | 选择目标数据源mysql，选择schema及表test_002，点击下一步 | 表选择成功，进入字段映射界面 |
| 6 | 点击同行映射，点击下一步 | 字段正常互相映射，进入通道控制界面 |
| 7 | 配置均默认，直接点击下一步、保存 | 数据同步任务配置完成 |
| 8 | 点击运行 | 数据同步任务运行成功，test_002表正常插入数据 |
| 9 | 进入hdfs路径/dtInsight/engine_plugins及dtinsight查看 | 路径无文件生成 |

##### 验证补数据--session--验证数据同步任务session模式运行是否使用远端文件 「P1」

> 前置条件
```
执行建表语句：
CREATE TABLE if NOT EXISTS test_001(id INT,name VARCHAR(255));
CREATE TABLE if NOT EXISTS test_002(id INT,name VARCHAR(255));

INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');
控制台已经开启缓存enableRemoteCache = true
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发-创建数据同步任务 | 数据同步任务创建成功，系统给出创建成功提示，列表中出现新创建的记录 |
| 2 | 选择来源数据源mysql，选择schema及表test_001，点击下一步 | 表选择成功，进入选择目标界面 |
| 3 | 选择目标数据源mysql，选择schema及表test_002，点击下一步 | 表选择成功，进入字段映射界面 |
| 4 | 点击同行映射，点击下一步 | 字段正常互相映射，进入通道控制界面 |
| 5 | 配置均默认，直接点击下一步，调度属性-调度周期选择小时，间隔选择一小时，点击保存 | 数据同步任务配置完成 |
| 6 | 点击提交 | 数据同步任务提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 7 | 进入运维中心-选择对应任务点击补数据，业务日期选择一周时间，点击确定 | 数据同步任务实例生成成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 8 | 进入补数据实例查看实例状态 | 实例状态为成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 9 | 进入对应yarn_application内的log搜索路径/dtInsight/engine_plugins | 路径正常搜索，代表使用远端文件 |

##### 验证关闭缓存控制--更新远端文件--验证重新部署release分支后重启调度运行数据同步任务远端文件正常更新 「P2」

> 前置条件
```
执行建表语句：
CREATE TABLE if NOT EXISTS test_001(id INT,name VARCHAR(255));
CREATE TABLE if NOT EXISTS test_002(id INT,name VARCHAR(255));

INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');
控制台已经关闭缓存enableRemoteCache = false
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发-创建数据同步任务 | 成功进入数据开发-创建数据同步任务页面，页面内容正常加载显示，无报错 |
| 2 | 删除hdfs路径/dtInsight/engine_plugins及dtinsight下所有文件及目录 | 系统提示删除成功，该条记录从列表中消失，总记录数减1 |
| 3 | 重新部署flinkx release分支 | 分支部署成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 4 | 重启调度 | 调度重启成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 5 | 进入数据开发-创建数据同步任务 | 数据同步任务创建成功，系统给出创建成功提示，列表中出现新创建的记录 |
| 6 | 选择来源数据源mysql，选择schema及表test_001，点击下一步 | 表选择成功，进入选择目标界面 |
| 7 | 选择目标数据源mysql，选择schema及表test_002，点击下一步 | 表选择成功，进入字段映射界面 |
| 8 | 点击同行映射，点击下一步 | 字段正常互相映射，进入通道控制界面 |
| 9 | 配置均默认，直接点击下一步、保存 | 数据同步任务配置完成 |
| 10 | 点击运行 | 数据同步任务运行成功，test_002表正常插入数据 |
| 11 | 进入hdfs路径/dtInsight/engine_plugins及dtinsight查看 | 路径下无文件生成 |

##### 验证开启缓存控制--更新远端文件--验证重新部署release分支后重启调度运行数据同步任务远端文件正常更新 「P1」

> 前置条件
```
执行建表语句：
CREATE TABLE if NOT EXISTS test_001(id INT,name VARCHAR(255));
CREATE TABLE if NOT EXISTS test_002(id INT,name VARCHAR(255));

INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');
控制台已经开启缓存enableRemoteCache = true
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发-创建数据同步任务 | 成功进入数据开发-创建数据同步任务页面，页面内容正常加载显示，无报错 |
| 2 | 删除hdfs路径/dtInsight/engine_plugins及dtinsight下所有文件及目录 | 系统提示删除成功，该条记录从列表中消失，总记录数减1 |
| 3 | 重新部署flinkx release分支 | 分支部署成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 4 | 重启调度 | 调度重启成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 5 | 进入数据开发-创建数据同步任务 | 数据同步任务创建成功，系统给出创建成功提示，列表中出现新创建的记录 |
| 6 | 选择来源数据源mysql，选择schema及表test_001，点击下一步 | 表选择成功，进入选择目标界面 |
| 7 | 选择目标数据源mysql，选择schema及表test_002，点击下一步 | 表选择成功，进入字段映射界面 |
| 8 | 点击同行映射，点击下一步 | 字段正常互相映射，进入通道控制界面 |
| 9 | 配置均默认，直接点击下一步、保存 | 数据同步任务配置完成 |
| 10 | 点击运行 | 数据同步任务运行成功，test_002表正常插入数据 |
| 11 | 进入hdfs路径/dtInsight/engine_plugins及dtinsight查看 | 路径下正常生成文件 |

##### 验证关闭缓存控制--prejob--验证mysql数据源执行数据同步任务控制台开启缓存prejob模式正常运行完成 「P1」

> 前置条件
```
执行建表语句：
CREATE TABLE if NOT EXISTS test_001(id INT,name VARCHAR(255));
CREATE TABLE if NOT EXISTS test_002(id INT,name VARCHAR(255));

INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');
控制台已经关闭缓存enableRemoteCache = false
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发-创建数据同步任务 | 数据同步任务创建成功，系统给出创建成功提示，列表中出现新创建的记录 |
| 2 | 选择来源数据源mysql，选择schema及表test_001，点击下一步 | 表选择成功，进入选择目标界面 |
| 3 | 选择目标数据源mysql，选择schema及表test_002，点击下一步 | 表选择成功，进入字段映射界面 |
| 4 | 点击同行映射，点击下一步 | 字段正常互相映射，进入通道控制界面 |
| 5 | 配置均默认，直接点击下一步，环境参数改成flinkTaskRunMode=per_job，保存 | 数据同步任务配置完成 |
| 6 | 点击运行 | 数据同步任务运行成功，test_002表正常插入数据 |

##### 验证关闭缓存控制--session--验证mysql数据源执行数据同步任务控制台开启缓存session模式正常运行完成 「P2」

> 前置条件
```
执行建表语句：
CREATE TABLE if NOT EXISTS test_001(id INT,name VARCHAR(255));
CREATE TABLE if NOT EXISTS test_002(id INT,name VARCHAR(255));

INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');
控制台已经关闭缓存enableRemoteCache = false
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发-创建数据同步任务 | 数据同步任务创建成功，系统给出创建成功提示，列表中出现新创建的记录 |
| 2 | 选择来源数据源mysql，选择schema及表test_001，点击下一步 | 表选择成功，进入选择目标界面 |
| 3 | 选择目标数据源mysql，选择schema及表test_002，点击下一步 | 表选择成功，进入字段映射界面 |
| 4 | 点击同行映射，点击下一步 | 字段正常互相映射，进入通道控制界面 |
| 5 | 配置均默认，直接点击下一步、保存 | 数据同步任务配置完成 |
| 6 | 点击运行 | 数据同步任务运行成功，test_002表正常插入数据 |

##### 验证开启缓存控制--prejob--验证mysql数据源执行数据同步任务控制台开启缓存prejob模式正常运行完成 「P2」

> 前置条件
```
执行建表语句：
CREATE TABLE if NOT EXISTS test_001(id INT,name VARCHAR(255));
CREATE TABLE if NOT EXISTS test_002(id INT,name VARCHAR(255));

INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');
控制台已经开启缓存enableRemoteCache = true
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发-创建数据同步任务 | 数据同步任务创建成功，系统给出创建成功提示，列表中出现新创建的记录 |
| 2 | 选择来源数据源mysql，选择schema及表test_001，点击下一步 | 表选择成功，进入选择目标界面 |
| 3 | 选择目标数据源mysql，选择schema及表test_002，点击下一步 | 表选择成功，进入字段映射界面 |
| 4 | 点击同行映射，点击下一步 | 字段正常互相映射，进入通道控制界面 |
| 5 | 配置均默认，直接点击下一步，环境参数改成flinkTaskRunMode=per_job，保存 | 数据同步任务配置完成 |
| 6 | 点击运行 | 数据同步任务运行成功，test_002表正常插入数据 |

##### 验证开启缓存控制--session--验证mysql数据源执行数据同步任务控制台开启缓存session模式正常运行完成 「P1」

> 前置条件
```
执行建表语句：
CREATE TABLE if NOT EXISTS test_001(id INT,name VARCHAR(255));
CREATE TABLE if NOT EXISTS test_002(id INT,name VARCHAR(255));

INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');
控制台已经开启缓存enableRemoteCache = true
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发-创建数据同步任务 | 数据同步任务创建成功，系统给出创建成功提示，列表中出现新创建的记录 |
| 2 | 选择来源数据源mysql，选择schema及表test_001，点击下一步 | 表选择成功，进入选择目标界面 |
| 3 | 选择目标数据源mysql，选择schema及表test_002，点击下一步 | 表选择成功，进入字段映射界面 |
| 4 | 点击同行映射，点击下一步 | 字段正常互相映射，进入通道控制界面 |
| 5 | 配置均默认，直接点击下一步、保存 | 数据同步任务配置完成 |
| 6 | 点击运行 | 数据同步任务运行成功，test_002表正常插入数据 |

##### 验证prejob--验证sqlserver数据源执行数据同步任务prejob模式正常运行完成 「P2」

> 前置条件
```
执行建表语句：
CREATE TABLE test_001(id INT,name VARCHAR(255));
CREATE TABLE test_002(id INT,name VARCHAR(255));

INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发-创建数据同步任务 | 数据同步任务创建成功，系统给出创建成功提示，列表中出现新创建的记录 |
| 2 | 选择来源数据源sqlserver，选择schema及表test_001，点击下一步 | 表选择成功，进入选择目标界面 |
| 3 | 选择目标数据源sqlserver，选择schema及表test_002，点击下一步 | 表选择成功，进入字段映射界面 |
| 4 | 点击同行映射，点击下一步 | 字段正常互相映射，进入通道控制界面 |
| 5 | 配置均默认，直接点击下一步，环境参数改成flinkTaskRunMode=per_job，保存 | 数据同步任务配置完成 |
| 6 | 点击运行 | 数据同步任务运行成功，test_002表正常插入数据 |

##### 验证prejob--验证postgresql数据源执行数据同步任务prejob模式正常运行完成 「P2」

> 前置条件
```
执行建表语句：
CREATE TABLE if NOT EXISTS test_001(id INT,name VARCHAR(255));
CREATE TABLE if NOT EXISTS test_002(id INT,name VARCHAR(255));

INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发-创建数据同步任务 | 数据同步任务创建成功，系统给出创建成功提示，列表中出现新创建的记录 |
| 2 | 选择来源数据源postgresql，选择schema及表test_001，点击下一步 | 表选择成功，进入选择目标界面 |
| 3 | 选择目标数据源postgresql，选择schema及表test_002，点击下一步 | 表选择成功，进入字段映射界面 |
| 4 | 点击同行映射，点击下一步 | 字段正常互相映射，进入通道控制界面 |
| 5 | 配置均默认，直接点击下一步，环境参数改成flinkTaskRunMode=per_job，保存 | 数据同步任务配置完成 |
| 6 | 点击运行 | 数据同步任务运行成功，test_002表正常插入数据 |

##### 验证prejob--验证mysql数据源执行数据同步任务prejob模式正常运行完成 「P1」

> 前置条件
```
执行建表语句：
CREATE TABLE if NOT EXISTS test_001(id INT,name VARCHAR(255));
CREATE TABLE if NOT EXISTS test_002(id INT,name VARCHAR(255));

INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发-创建数据同步任务 | 数据同步任务创建成功，系统给出创建成功提示，列表中出现新创建的记录 |
| 2 | 选择来源数据源mysql，选择schema及表test_001，点击下一步 | 表选择成功，进入选择目标界面 |
| 3 | 选择目标数据源mysql，选择schema及表test_002，点击下一步 | 表选择成功，进入字段映射界面 |
| 4 | 点击同行映射，点击下一步 | 字段正常互相映射，进入通道控制界面 |
| 5 | 配置均默认，直接点击下一步，环境参数改成flinkTaskRunMode=per_job，保存 | 数据同步任务配置完成 |
| 6 | 点击运行 | 数据同步任务运行成功，test_002表正常插入数据 |

##### 验证session--验证sqlserver数据源执行数据同步任务session模式正常运行完成 「P2」

> 前置条件
```
执行建表语句：
CREATE TABLE test_001(id INT,name VARCHAR(255));
CREATE TABLE test_002(id INT,name VARCHAR(255));

INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发-创建数据同步任务 | 数据同步任务创建成功，系统给出创建成功提示，列表中出现新创建的记录 |
| 2 | 选择来源数据源sqlserver，选择schema及表test_001，点击下一步 | 表选择成功，进入选择目标界面 |
| 3 | 选择目标数据源sqlserver，选择schema及表test_002，点击下一步 | 表选择成功，进入字段映射界面 |
| 4 | 点击同行映射，点击下一步 | 字段正常互相映射，进入通道控制界面 |
| 5 | 配置均默认，直接点击下一步、保存 | 数据同步任务配置完成 |
| 6 | 点击运行 | 数据同步任务运行成功，test_002表正常插入数据 |

##### 验证session--验证postgresql数据源执行数据同步任务session模式正常运行完成 「P2」

> 前置条件
```
执行建表语句：
CREATE TABLE if NOT EXISTS test_001(id INT,name VARCHAR(255));
CREATE TABLE if NOT EXISTS test_002(id INT,name VARCHAR(255));

INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发-创建数据同步任务 | 数据同步任务创建成功，系统给出创建成功提示，列表中出现新创建的记录 |
| 2 | 选择来源数据源postgresql，选择schema及表test_001，点击下一步 | 表选择成功，进入选择目标界面 |
| 3 | 选择目标数据源postgresql，选择schema及表test_002，点击下一步 | 表选择成功，进入字段映射界面 |
| 4 | 点击同行映射，点击下一步 | 字段正常互相映射，进入通道控制界面 |
| 5 | 配置均默认，直接点击下一步、保存 | 数据同步任务配置完成 |
| 6 | 点击运行 | 数据同步任务运行成功，test_002表正常插入数据 |

##### 验证session--验证mysql数据源执行数据同步任务session模式正常运行完成 「P1」

> 前置条件
```
执行建表语句：
CREATE TABLE if NOT EXISTS test_001(id INT,name VARCHAR(255));
CREATE TABLE if NOT EXISTS test_002(id INT,name VARCHAR(255));

INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发-创建数据同步任务 | 数据同步任务创建成功，系统给出创建成功提示，列表中出现新创建的记录 |
| 2 | 选择来源数据源mysql，选择schema及表test_001，点击下一步 | 表选择成功，进入选择目标界面 |
| 3 | 选择目标数据源mysql，选择schema及表test_002，点击下一步 | 表选择成功，进入字段映射界面 |
| 4 | 点击同行映射，点击下一步 | 字段正常互相映射，进入通道控制界面 |
| 5 | 配置均默认，直接点击下一步、保存 | 数据同步任务配置完成 |
| 6 | 点击运行 | 数据同步任务运行成功，test_002表正常插入数据 |

##### 验证presql, postsql长时间--验证presql, postsql长时间执行数据同步正常运行完成 「P1」

> 前置条件
```
mysql执行语句：
CREATE TABLE if NOT EXISTS test_001(id INT,name VARCHAR(255));
CREATE TABLE if NOT EXISTS test_002(id INT,name VARCHAR(255));

INSERT INTO test_001 VALUES (1,'mengfei'),(2,'kako');
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入数据开发-创建数据同步任务 | 数据同步任务创建成功，系统给出创建成功提示，列表中出现新创建的记录 |
| 2 | 选择来源数据源mysql，选择schema及表test_001，点击下一步 | 表选择成功，进入选择目标界面 |
| 3 | 选择目标数据源mysql，选择schema及表test_002，导入前后准备语句均输入DO SLEEP(600);点击下一步 | 表选择成功，进入字段映射界面 |
| 4 | 点击同行映射，点击下一步 | 字段正常互相映射，进入通道控制界面 |
| 5 | 配置均默认，直接点击下一步、保存 | 数据同步任务配置完成 |
| 6 | 点击运行 | 数据同步任务运行成功，presql, postsql执行时长>=10分钟，test_002表正常插入数据 |

