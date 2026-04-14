---
suite_name: "Hotfix 用例 - 数据标准-标准定义 下线申请并发幂等校验"
description: "验证 Bug #148633 修复效果"
tags:
  - hotfix
  - bug-148633
create_at: "2026-04-13"
status: 草稿
origin: zentao
---

## 数据标准

### 标准定义

#### 下线申请并发幂等校验

##### 【148633】验证同一数据标准存在待审批下线申请时，重复提交下线申请被拒绝并提示已存在申请

> 前置条件

```
1、环境要求：岚图生产对应测试环境，需开启审批流（下线操作需走审批）

2、数据准备：
准备一条处于「已发布」状态、且当前租户下没有任何待审批下线申请的数据标准，记录其 ID（下称 standard_id）。

可通过以下 SQL 确认该标准无待审批下线申请（执行前替换 #{tenantId} 和 #{standard_id}）：

SELECT id, resource_id, status, apply_reason, is_deleted
FROM metadata_apply
WHERE apply_resource_type = 1
  AND status = 0
  AND is_deleted = 0
  AND tenant_id = #{tenantId}
  AND resource_id = #{standard_id};

结果为空则说明该标准满足前置条件，可用于测试。

3、账号要求：两个具有「数据标准下线」操作权限的账号（账号 A、账号 B），均属于同一租户。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 使用账号 A 登录系统 | 登录成功，进入首页 |
| 2 | 导航至【数据标准 > 标准管理 > 标准定义】 | 页面正常加载，显示标准列表 |
| 3 | 找到前置条件中准备好的目标数据标准，勾选该标准行 | 标准行被选中，工具栏「下线」按钮变为可点击状态 |
| 4 | 点击工具栏「下线」按钮 | 弹出确认对话框，显示引用信息及下线影响说明 |
| 5 | 在确认对话框中点击「下线」按钮提交申请 | 申请提交成功，系统提示提交成功或跳转至审批列表；此时 metadata_apply 表中存在一条 status=0（待审批）的下线申请记录 |
| 6 | 使用账号 B 在另一浏览器或新隐身窗口中登录系统，导航至【数据标准 > 标准管理 > 标准定义】 | 页面正常加载，显示标准列表 |
| 7 | 找到与步骤 3 相同的目标数据标准，勾选该标准行，点击「下线」按钮 | 弹出确认对话框 |
| 8 | 在确认对话框中点击「下线」按钮提交申请 | 系统拒绝提交，页面显示错误提示，内容包含「以下标准已存在待审批的下线申请」及对应标准 ID |
| 9 | 执行以下 SQL 确认数据库中仅存在一条该标准的待审批下线申请（替换 #{tenantId} 和 #{standard_id}）：SELECT COUNT(*) FROM metadata_apply WHERE apply_resource_type = 1 AND status = 0 AND is_deleted = 0 AND tenant_id = #{tenantId} AND resource_id = #{standard_id}; | 查询结果为 1，不存在重复的待审批申请记录 |
