---
id: hotfix-146116
title: "【146116】验证质量报告-车辆信息汇总数据正常展示"
feature: 质量报告 / 车辆信息汇总
tags:
  - hotfix
  - bug-146116
  - ltqc
priority: P1
created_at: "2026-04-16"
status: 草稿
origin: zentao
---

## 数据质量

### 质量报告

#### 质量报告详情 - 车辆信息汇总

##### 【146116】验证质量报告详情中车辆信息汇总数据正常展示

> 前置条件

1. 已存在至少一个质量报告配置，且关联了单表规则任务（MonitorType = SINGLE_TABLE）
2. 对应规则任务已执行过，存在 status 为 Running 或 Init 的 monitor_record 记录
3. 执行以下 SQL 确认问题数据存在（验证修复前的数据残留）：
   ```sql
   SELECT id, monitor_id, tenant_id, job_key, status
   FROM assets_dq_monitor_record
   WHERE status IN (0, 1)   -- 0=Init, 1=Running
     AND monitor_type = 1   -- SINGLE_TABLE
   LIMIT 10;
   ```
4. 确认车辆信息数据是否为空：
   ```sql
   SELECT COUNT(*) FROM assets_dq_monitor_vehicle_info
   WHERE report_record_id = <目标报告记录ID>;
   ```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 > 质量报告】 | |
| 2 | 找到目标报告，点击【查看质量报告】进入详情页 | 成功进入质量报告详情页 |
| 3 | 在详情页找到【车辆信息汇总】模块，观察表格数据是否展示 | 车辆信息汇总表格有数据行，各列（车系、车型、动力类型、车辆数量等）不全为"--" |
| 4 | 若步骤 3 无数据，手动触发状态回调：<br>- 调用 POST `/dq/schedule/syncMrRunOrInit`<br>- 等待 5~10 秒后刷新页面 | 接口返回成功；刷新后车辆信息汇总表格出现数据 |
| 5 | 验证 DB monitor_record 状态已更新：<br>`SELECT id, status FROM assets_dq_monitor_record WHERE status IN (0,1) AND monitor_type = 1 LIMIT 10;` | 原 Running/Init 记录的 status 已变更为终态（成功=2 或失败=3） |
| 6 | 验证车辆信息已落表：<br>`SELECT COUNT(*) FROM assets_dq_monitor_vehicle_info WHERE report_record_id = <目标报告记录ID>;` | 查询结果 > 0，车辆信息正常写入 |
| 7 | 切换至另一租户的质量报告详情页，观察车辆信息汇总 | 只展示当前租户数据，不混入其他租户数据 |
| 8 | 对车辆信息汇总表格按"车型"列筛选 | 筛选正常，仅展示符合条件的数据行 |
