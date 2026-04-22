---
suite_name: "Hotfix 用例 - 【岚图生产环境】落标检查任务状态更新缓慢"
description: "验证 Bug #149594 修复效果"
tags:
  - hotfix
  - bug-149594
create_at: "2026-04-22"
status: 草稿
origin: zentao
---

## 数据标准

### 落标检查

#### 落标检查记录状态同步

##### 【149594】验证 Yarn 引擎任务处于运行中时落标检查记录状态及时从「等待检查」更新为「检查中」

> 前置条件

```
1. 确保当前租户下已有可用的落标检查数据源（Hive/SparkSQL 类型），且对应表已绑定数据标准。
2. 调度器轮询周期为默认值 2 分钟（StandardTableCheckRecordSyncJob.cron: * */2 * * * ?），未被覆盖配置。
3. 已有至少一条可正常提交到 Yarn 引擎并能持续运行数分钟的落标检查任务（任务运行时长需足以覆盖一个调度轮询周期）。
   如无可用任务，需在步骤 1-3 中通过 UI 新建。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据标准 > 落标检查】，点击「落标检查设置」Tab | 页面展示落标检查任务列表 |
| 2 | 若无现有任务，点击「新增检查任务」按钮：<br>- 步骤一：选择数据源、数据库、数据表<br>- 步骤二：开启至少一个字段检查项，不配置调度周期<br>- 点击底部「临时检查」按钮提交 | 提示"临时检查任务创建成功"，任务提交至 Yarn 引擎 |
| 3 | 若已有现有任务，点击该任务行「编辑」按钮进入编辑流程，在步骤二底部点击「临时检查」按钮 | 提示任务创建成功，任务提交至 Yarn 引擎 |
| 4 | 切换至「落标检查结果」Tab，找到刚触发的检查记录，观察其「检查状态」列 | 记录状态显示「等待检查」（初始化中，等待调度器写入运行状态） |
| 5 | 通过以下 SQL 查询刚提交任务对应的检查记录，记录 `job_id` 与 `flow_job_id`：<br>`SELECT id, job_id, flow_job_id, status, execute_start_time FROM metadata_standard_table_check_record WHERE status IN (0, 1) ORDER BY id DESC LIMIT 10;`<br>同时查询列级子记录：<br>`SELECT id, job_id, status, execute_start_time FROM metadata_standard_table_column_check_record WHERE job_id = '<上一步记录的 job_id>';` | 父记录 status=0（等待检查），子记录 status=0；execute_start_time 均为 NULL |
| 6 | 确认 Yarn 侧引擎任务已进入 RUNNING 状态（可在调度运维或 Yarn ResourceManager 界面确认），然后在数据库执行以下 SQL 将父记录强制回退为 INIT 状态以模拟卡住场景：<br>`UPDATE metadata_standard_table_check_record SET status = 0, execute_start_time = NULL WHERE job_id = '<步骤 5 记录的 job_id>' AND status = 1;`<br>`UPDATE metadata_standard_table_column_check_record SET status = 0, execute_start_time = NULL WHERE job_id = '<步骤 5 记录的 job_id>' AND status = 1;` | SQL 执行成功，记录状态已强制回退为 0（等待检查） |
| 7 | 等待至多 2 分钟（调度器 StandardTableCheckRecordSyncJob 一个轮询周期），随后刷新「落标检查结果」页面，观察该检查记录的「检查状态」列 | 状态由「等待检查」变更为「检查中」，无需人工干预 |
| 8 | 再次执行 SQL 查询该记录的持久化状态：<br>`SELECT id, job_id, flow_job_id, status, execute_start_time FROM metadata_standard_table_check_record WHERE job_id = '<步骤 5 记录的 job_id>';`<br>`SELECT id, job_id, status, execute_start_time FROM metadata_standard_table_column_check_record WHERE job_id = '<步骤 5 记录的 job_id>';` | 父记录与子记录的 status 均为 1（检查中），execute_start_time 已写入非 NULL 时间值，与 Yarn 引擎侧的实际开始时间一致 |
