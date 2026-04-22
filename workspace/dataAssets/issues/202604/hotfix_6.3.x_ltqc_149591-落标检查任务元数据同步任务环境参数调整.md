---
suite_name: "Hotfix 用例 - 【岚图生产环境】落标检查任务、元数据同步任务，环境参数调整"
description: "验证 Bug #149591 修复效果"
tags:
  - hotfix
  - bug-149591
create_at: "2026-04-22"
status: 草稿
origin: zentao
---

## 数据资产

### {{待确认：落标检查 / 元数据同步任务管理页面}}

#### Spark 环境参数默认值

##### 【149591】验证落标检查与元数据同步任务新建时 Spark 环境参数默认值正确生效

> 前置条件

```
1. 当前租户在调度引擎侧未配置 Spark SQL 环境参数模板（即 EnvironmentParamTemplate 为空），
   确保落标检查任务创建时走 TASK_PARAMS 常量兜底逻辑。
   可执行以下 SQL 确认（无记录或记录为空则满足条件）：
   SELECT * FROM environment_param_template
   WHERE job_type = 3 AND app_type = 5 AND is_deleted = 0;
   （字段值待确认：job_type=SPARK_SQL, app_type=METADATA；若表不在本库请联系数开同学确认）

2. 已存在可用的数据源和数据表，供落标检查任务绑定。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【{{待确认：一级菜单}} > {{待确认：落标检查}}】任务列表页 | 页面正常加载，显示落标检查任务列表 |
| 2 | 点击「新建」，填写落标检查任务基础信息：<br>- \*绑定数据源：选择一个可用数据源<br>- \*绑定表：选择一张数据表<br>- \*检查列：勾选至少一列<br>不手动填写「任务参数」字段，保持默认 | 表单填写正常，任务参数区域展示系统默认参数模板 |
| 3 | 点击「保存」/「确定」 | 提示保存成功，任务出现在列表中 |
| 4 | 记录新建任务 ID，执行 SQL 查询落标检查任务参数：<br>`SELECT id, task_params FROM metadata_standard_table_check WHERE is_deleted = 0 ORDER BY id DESC LIMIT 1;` | 查询返回刚新建的任务记录 |
| 5 | 检查 `task_params` 字段内容，确认以下参数**均未注释**（行首无 `#`）且值正确：<br>- `spark.driver.cores=2`<br>- `spark.driver.memory=4g`<br>- `spark.executor.instances=12`<br>- `spark.executor.cores=4`<br>- `spark.executor.memory=8g` | `task_params` 中上述 5 项参数均以未注释形式存在，值与预期完全一致；不存在 `# spark.driver.cores=1` 等旧的注释行 |
| 6 | 进入【{{待确认：一级菜单}} > {{待确认：元数据同步}}】任务列表页 | 页面正常加载，显示元数据同步任务列表 |
| 7 | 点击「新建」，填写元数据同步任务基础信息：<br>- \*数据源：选择一个可用数据源<br>- \*同步数据库：选择至少一个数据库<br>- \*同步类型：{{待确认：周期同步 / 手动同步}}<br>不手动填写「任务参数」字段，保持默认 | 表单填写正常，任务参数区域展示系统默认参数模板 |
| 8 | 点击「保存」/「确定」 | 提示保存成功，任务出现在列表中 |
| 9 | 进入刚新建的元数据同步任务详情页，查看「任务参数」/「运行参数」展示区域，确认以下参数**均未注释**且值正确：<br>- `spark.driver.cores=2`<br>- `spark.driver.memory=4g`<br>- `spark.executor.instances=4`<br>- `spark.executor.cores=4`<br>- `spark.executor.memory=8g`<br>- `job.priority=10` | 页面展示的任务参数中，上述 6 项均以未注释形式存在，值与预期完全一致；不存在旧的注释参数行（如 `# spark.executor.instances=1`） |
| 10 | 手动触发一次元数据同步任务执行（点击「立即运行」或「手动同步」） | 任务提交成功，调度引擎侧收到的 taskParams 包含正确的资源配置（可在调度引擎任务详情 / 运行日志中确认 `spark.executor.instances=4` 等参数生效） |
