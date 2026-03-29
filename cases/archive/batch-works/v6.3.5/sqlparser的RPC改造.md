---
name: sqlparser的RPC改造 v6.3.5
description: sqlparser的RPC改造 v6.3.5
tags:
  - 离线开发
  - 离线开发-数据开发-SQL语法
  - sqlparser的RPC改造
module: batch-works
version: v6.3.5
source: zentao-cases/dtstack-platform/离线开发/archive-cases/v6.3.5/sqlparser的RPC改造.csv
case_count: 2
created_at: 2026-03-29
origin: csv
---
# sqlparser的RPC改造 v6.3.5
> 来源：zentao-cases/dtstack-platform/离线开发/archive-cases/v6.3.5/sqlparser的RPC改造.csv
> 用例数：2

---

## 离线开发-数据开发-SQL语法

##### 验证sql任务运行功能正常_本地插件模式 「P1」

> 前置条件
```
1、离线配置文件已经修改，修改内容如下
  注释以下配置：
  sqlparser.deploy.mode=remote
  2、sqlparse服务停掉
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据开发-周期任务】页面，新建任意SQL任务，执行DML和DQL语句（包含create、insert、select语句） | SQL任务运行成功，查看离线日志sqlParse.parseSql method parse sql信息无报错 |
| 2 | 保存并提交SQL任务 | SQL任务保存并提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 【运维中心】页面补数据运行SQL任务 | SQL任务补数据运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |

##### 验证sql任务运行功能正常__rpc服务调用 「P1」

> 前置条件
```
离线配置文件已经修改，修改内容如下
新增参数：
sqlparser.deploy.mode=remote
sqlparser.server.nodes=127.0.0.1:8569 #sqlparse部署节点
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【离线开发-数据开发-周期任务】页面，新建任意SQL任务，执行DML和DQL语句（包含create、insert、select语句） | SQL任务运行成功，查看离线日志sqlParse.parseSql method parse sql信息无报错 |
| 2 | 保存并提交SQL任务 | SQL任务保存并提交成功，系统给出提交成功提示，状态更新为下一处理阶段 |
| 3 | 【运维中心】页面补数据运行SQL任务 | SQL任务补数据运行成功，状态更新为【成功】，运行/执行结果符合预期，日志无报错 |
| 4 | 将sqlparse服务停掉，再次运行步骤1的任务 | 运行失败 |

