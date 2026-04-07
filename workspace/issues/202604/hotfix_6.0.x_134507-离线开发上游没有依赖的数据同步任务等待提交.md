---
suite_name: "Hotfix 用例 - 离线开发数据同步任务Connection to jobmanager failed修复"
description: "验证 Bug #134507 修复效果 - Session Client重置与健康检查状态修正"
tags:
  - hotfix
  - bug-134507
  - 离线开发
  - 数据同步
  - Flink
  - SessionClient
create_at: "2026-04-07"
status: 草稿
origin: hotfix
---

## 离线开发

### 数据同步任务调度

#### Flink Session 连接与任务提交

##### 【134507】验证JobManager连接失败时Session Client自动重置并恢复任务提交

> 前置条件
```
1、已部署包含 hotfix_6.0.x_134507 修复的 engine-plugins

2、Flink Session 模式正常运行（支持 Flink 112 和 Flink 116 版本）

3、已配置数据同步任务，该任务上游无依赖节点

4、yarn 上 session 处于 RUNNING 状态

5、代码变更说明（供验证参考）：
   - FlinkClient/YarnSessionProvider: 捕获 Connection to jobmanager failed 异常时，
     调用 SessionClientManager.resetClusterClient() 重置 session client
   - AbstractHaSessionClientService: 新增 resetSessionClient() 方法，
     关闭旧 client 后重新创建新连接
   - YarnFlinkSessionStateService: Session 健康检查中，
     当 reason 包含 "Connection to jobmanager failed" 时返回 UNHEALTHY 状态（原逻辑返回 HEALTHY）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【离线开发】-【任务运维】页面，找到一个上游无依赖的数据同步任务 | 页面正常加载，任务列表正常展示 |
| 2 | 模拟 JobManager 连接异常场景（如凌晨时段运行、或临时中断 JobManager 网络后恢复），触发该数据同步任务运行 | 任务正常进入调度队列 |
| 3 | 观察任务运行状态：若首次连接 JobManager 失败，观察是否自动重置 session client 并重新建立连接 | 任务在短暂异常后自动恢复提交，不会长时间停留在"等待提交"状态；日志中可看到 "get session client failed" 后重新获取 client 的记录 |
| 4 | 查看 engine 日志，搜索 "Connection to jobmanager failed" 和 "resetClusterClient" 关键字 | 日志中出现 resetClusterClient 调用记录，表明 session client 已执行重置逻辑 |
| 5 | 等待任务运行完成，检查任务最终状态 | 任务运行成功，状态变为"成功"；数据同步结果正确 |

##### 【134507-2】验证Session健康检查正确识别JobManager连接失败为UNHEALTHY状态

> 前置条件
```
1、已部署包含 hotfix_6.0.x_134507 修复的 engine-plugins

2、Flink Session 模式正常运行

3、代码变更说明：
   YarnFlinkSessionStateService.java 中 session check 逻辑变更：
   - 修复前：judgeSlotsResult.getReason() 包含 "Connection to jobmanager failed" 时返回 HEALTHY
   - 修复后：返回 UNHEALTHY，触发 session 恢复机制
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | Flink Session 正常运行时，观察 session 健康检查日志 | session 状态为 HEALTHY，任务正常调度 |
| 2 | 模拟 JobManager 连接不可用（如 JobManager 进程异常重启），等待 session check 周期触发 | session check 检测到 "Connection to jobmanager failed"，将 session 状态标记为 UNHEALTHY |
| 3 | 观察 UNHEALTHY 状态后的 session 恢复流程 | session 恢复机制自动触发，重新建立与 JobManager 的连接；日志中有 resetSessionClient 调用记录 |
| 4 | 恢复完成后提交新的数据同步任务 | 任务正常提交并运行成功，不再报 "Connection to jobmanager failed" |

##### 【134507-回归】验证修复后正常场景下Session Client和任务调度不受影响

> 前置条件
```
1、已部署包含 hotfix_6.0.x_134507 修复的 engine-plugins

2、Flink Session 模式正常运行，JobManager 连接正常
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【离线开发】-【任务运维】页面 | 页面正常加载 |
| 2 | 选择一个有上游依赖的数据同步任务，手动触发运行 | 任务正常等待上游依赖完成后提交运行，最终运行成功 |
| 3 | 选择一个非数据同步类型的离线任务（如SQL任务），手动触发运行 | 任务正常提交并运行成功 |
| 4 | 检查 Flink Session 在持续运行一段时间后的稳定性 | Session 保持 HEALTHY 状态，不出现异常 resetSessionClient 调用 |
| 5 | 查看 yarn 上 Flink Session 的 application 数量 | session 数量符合预期，无多余 session 被意外创建或销毁 |

##### 【134507-补充】验证Flink 112和Flink 116两个版本均已修复

> 前置条件
```
1、已部署包含 hotfix_6.0.x_134507 修复的 engine-plugins

2、分别配置 Flink 112 和 Flink 116 的 Session 集群

3、代码变更说明：
   修复同时覆盖两个 Flink 版本：
   - flink/yarn-hdfs-flink112-core: FlinkClient.java, SessionClientManager.java, IClientManager.java, AbstractClientManager.java
   - flink/yarn-hdfs-flink116-core: YarnSessionProvider.java, SessionClientManager.java, IClientManager.java, AbstractClientManager.java
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 在 Flink 112 Session 集群上提交数据同步任务，模拟 JobManager 连接异常 | resetClusterClient 逻辑正常触发，任务恢复提交 |
| 2 | 在 Flink 116 Session 集群上提交数据同步任务，模拟 JobManager 连接异常 | resetClusterClient 逻辑正常触发，任务恢复提交 |
| 3 | 对比两个版本的 engine 日志 | 两个版本均出现 resetClusterClient 调用和 session 恢复记录，行为一致 |
