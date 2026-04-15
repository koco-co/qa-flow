---
suite_name: "Hotfix 用例 - #147514 部分自动分级任务卡在运行中状态"
description: "验证 Bug #147514 修复效果：线程池缩小、异常兜底、定时清理超时任务"
keywords: "5.3 | 数据安全 | | | 5.3 | 代码缺陷"
tags:
  - hotfix
  - bug-147514
create_at: "2026-04-15"
status: 草稿
origin: zentao
---

## 数据资产

### 数据安全 - 数据分级

#### 分级设置 - 自动分级规则

##### 【147514】验证超时 STARTING 状态的分级规则被定时任务自动重置为 STOP

> 前置条件

```sql
-- 向 metadata_data_rank_rule 表写入一条 STARTING 状态且 latest_start_time 超过 24 小时的规则记录
-- tenant_id 替换为当前测试环境实际租户 ID
INSERT INTO dt_metadata.metadata_data_rank_rule
  (tenant_id, name, rule_desc, rank_id, class_id, state, latest_start_time, latest_start_uid, is_deleted, create_at, update_at)
VALUES
  (1, 'hotfix_147514_test_rule', '超时兜底验证用例', 1, 1, 'starting', DATE_SUB(NOW(), INTERVAL 25 HOUR), UUID(), 0, NOW(), NOW());
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 执行前置 SQL，确认记录写入成功 | `metadata_data_rank_rule` 表中存在 name=`hotfix_147514_test_rule`、state=`starting`、`latest_start_time` 为 25 小时前的记录 |
| 2 | 触发定时任务 `UpdateOutTimeRankRuleJob`:<br>方式一：等待凌晨 03:00 自动触发<br>方式二：临时将 cron 配置 `UpdateOutTimeRankRuleJob.cron` 改为近期时间触发 | 应用日志出现 `开始执行超时分级任务清理任务` 和 `发现1个超时的分级任务，准备清理` |
| 3 | 查询数据库验证状态:<br>`SELECT state FROM dt_metadata.metadata_data_rank_rule WHERE name = 'hotfix_147514_test_rule';` | state 由 `starting` 变更为 `stop` |
| 4 | 进入【数据安全 > 数据分级 > 分级设置】，找到 `hotfix_147514_test_rule` | 规则状态显示为已停止，可被重新操作 |
| 5 | 查看应用日志 | 日志出现 `超时分级任务清理完成，共处理1个任务，成功1个`，无 Error 异常 |
| 6 | 清理测试数据:<br>`DELETE FROM dt_metadata.metadata_data_rank_rule WHERE name = 'hotfix_147514_test_rule';` | |

##### 【147514】验证正常自动分级任务能正常完成且状态正确流转

> 前置条件

无

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据安全 > 数据分级 > 分级设置】，选择一条已配置好的分级规则 | |
| 2 | 点击【生效】触发自动分级任务 | 规则状态变为"分级中"（STARTING） |
| 3 | 等待分级任务执行完毕 | 规则状态自动变为"已完成"（FINISH），不卡在"分级中" |
| 4 | 进入该规则关联的表，查看分级结果 | 字段分级标签已正确标注 |

##### 【147514】验证分级任务异常时状态不卡在 STARTING

> 前置条件

构造一条会执行失败的分级规则（如关联一个不可达的数据源，或数据量极大触发超时）

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据安全 > 数据分级 > 分级设置】，对异常规则点击【生效】 | 规则状态变为"分级中" |
| 2 | 等待任务执行结束 | 规则状态最终变为"已停止"（STOP）或"已完成"（FINISH），不会一直卡在"分级中" |
| 3 | 查看应用日志 | 日志中出现 `分级任务执行失败，分级结束 error`，且后续有状态更新记录 |

##### 【147514】验证未超时的 STARTING 任务不被定时清理误清

> 前置条件

```sql
-- 写入一条 STARTING 状态但 latest_start_time 仅 2 小时前的记录（未超时）
INSERT INTO dt_metadata.metadata_data_rank_rule
  (tenant_id, name, rule_desc, rank_id, class_id, state, latest_start_time, latest_start_uid, is_deleted, create_at, update_at)
VALUES
  (1, 'hotfix_147514_not_timeout', '未超时验证用例', 1, 1, 'starting', DATE_SUB(NOW(), INTERVAL 2 HOUR), UUID(), 0, NOW(), NOW());
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 执行前置 SQL，确认记录写入成功 | 记录 state=`starting`，`latest_start_time` 为 2 小时前 |
| 2 | 触发定时任务 `UpdateOutTimeRankRuleJob` | 日志出现 `未发现超时的分级任务` 或该记录不在清理列表中 |
| 3 | 查询数据库:<br>`SELECT state FROM dt_metadata.metadata_data_rank_rule WHERE name = 'hotfix_147514_not_timeout';` | state 仍为 `starting`，未被误改 |
| 4 | 清理测试数据:<br>`DELETE FROM dt_metadata.metadata_data_rank_rule WHERE name = 'hotfix_147514_not_timeout';` | |
