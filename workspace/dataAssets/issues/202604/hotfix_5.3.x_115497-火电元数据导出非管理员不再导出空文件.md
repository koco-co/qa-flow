---
suite_name: "Hotfix 用例 - 火电元数据导出权限与结果校验"
description: "验证 Bug #115497 修复效果 - 授权账号可正常导出元数据，无权限账号不再导出空文件"
tags:
  - hotfix
  - bug-115497
  - 元数据资产
  - 元数据管理
  - 导出权限
create_at: "2026-04-10"
status: 草稿
origin: zentao
---

## 元数据资产

### 元数据管理

#### 数据库级元数据导出

##### 【115497】验证元数据管理页授权账号可成功导出且无权限账号不再得到空文件

> 前置条件
```
1、环境要求：
- 已部署包含 hotfix_5.3.x_115497 修复的 dt-center-metadata 服务。
- 数据资产应用可正常访问，左侧导航存在【元数据 > 元数据管理】，对应路由 `/manageTables`。
- 测试目标使用非 Trino 数据源；前端对 Trino 会跳转 `/manageTables/catalogMetaManage`，本用例需验证数据库导出路径 `/manageTables/databaseMetaManage`。
- 浏览器允许文件下载，下载目录可查看 CSV 文件。

2、数据准备：
- 在【元数据 > 元数据同步】(`/metaDataSync`) 中准备一个已同步成功的非 Trino 数据源 `qa_meta_export_115497`；若当前无可用数据源，则新增或重跑同步任务，直到该数据源至少同步出 1 个数据库。
- 进入【元数据 > 元数据管理】(`/manageTables`) 搜索 `qa_meta_export_115497`，确认点击数据源名称后可进入数据库页 `/manageTables/databaseMetaManage`。
- 记录一个已同步数据库名称 `qa_db_115497`；若需简化操作，也可直接在导出弹窗选择【全选】。

3、账号要求：
- 账号 A：`admin` 或租户管理员 / 租户所有者账号。
- 账号 B：普通客户账号，具备 `METADATA_METADATAMGR_VIEW` 页面访问权限，但不属于 `root / admin / tenantAdmin / tenantOwner`。

4、代码变更说明（供验证参考）：
- 前端导出入口位于 `apps/dataAssets/src/views/metaData/manageTables/databaseMetaManage.tsx` 的【导出元数据】按钮，调用接口 `/dmetadata/v1/metaDataExport/exportMetaData`。
- 后端 `MetaDataExportController.exportMetaData()` 仍要求 `METADATA_METADATAMGR_VIEW` 页面访问权限。
- `MetaDataExportService.exportExcel()` 由仅判断 `isSuperUser()` 改为按当前租户查询用户角色；`root / admin / tenantAdmin / tenantOwner` 视为可导出用户，无权限用户直接返回 `BizException("用户无权限")`，不再导出空 CSV。
- 导出响应设置为 `text/csv; charset=UTF-8` 并写入 UTF-8 BOM，导出文件名格式为 `元数据下载_*.csv`。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 使用账号 A 登录数据资产应用，进入左侧【元数据 > 元数据管理】页面，确认当前路由为 `/manageTables` | 页面正常加载，展示数据源列表；搜索框、数据源名称列可见 |
| 2 | 在 `/manageTables` 页面搜索数据源 `qa_meta_export_115497`，点击该数据源名称链接 | 成功跳转到 `/manageTables/databaseMetaManage`；页面面包屑显示 `qa_meta_export_115497(数据源类型) > 数据库` |
| 3 | 在数据库页点击右上角【导出元数据】按钮 | 打开标题为【导出元数据】的弹窗；弹窗内显示“选择导出方式”和“数据库”两个字段；导出方式默认选中 `EXCEL`；数据库下拉已加载出 `qa_db_115497` 和【全选】选项 |
| 4 | 保持导出方式为 `EXCEL`，数据库选择 `qa_db_115497`（或【全选】），点击弹窗【确定】 | 浏览器向 `/dmetadata/v1/metaDataExport/exportMetaData` 发起下载请求；页面开始下载 `元数据下载_*.csv` 文件；弹窗 loading 结束并关闭 |
| 5 | 打开步骤 4 下载的 CSV 文件，查看文件内容 | 文件大小大于 0，文件不是空白文件；至少包含 1 条来自 `qa_meta_export_115497` 的元数据记录；Excel / WPS 打开后中文表头和中文内容不乱码 |
| 6 | 退出账号 A，使用账号 B 登录；按相同路径再次进入 `/manageTables/databaseMetaManage`，点击【导出元数据】，保持导出方式 `EXCEL`，数据库仍选择 `qa_db_115497`（或【全选】），点击【确定】 | 页面不再生成空白 CSV 下载；系统返回明确的无权限结果，前端出现后端返回的错误提示（如 `用户无权限` 或等价异常信息）；弹窗 loading 结束，页面仍停留在 `/manageTables/databaseMetaManage` |
| 7 | 检查账号 B 操作后的浏览器下载列表或本地下载目录 | 不存在新生成的 0 KB / 空内容导出文件；仅授权账号 A 的导出结果保留在下载列表中 |
