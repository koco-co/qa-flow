---
suite_name: 【通用配置】json格式配置
description: 【通用配置】json格式配置
prd_id: 15696
prd_version: v6.4.10
prd_path: cases/prds/202604/【通用配置】json格式配置.md
product: data-assets
dev_version: ""
tags:
  - 数据资产
  - 数据质量
  - 通用配置
  - json格式配置
  - key管理
  - 数据源类型
  - value格式
  - data-assets
create_at: 2026-04-03
update_at: 2026-04-03
status: 已归档
health_warnings: []
repos: []
case_count: 20
case_types:
  normal: 11
  abnormal: 2
  boundary: 7
origin: json
---

## 通用配置

### 列表页

#### 列表查询

##### 【P0】验证进入列表页后展示顶层key并支持按key名称模糊查询

> 前置条件
```
1、已存在顶层 key 配置：
- key: vehicle_info / 中文名称: 车辆基础信息 / value格式: ^[A-Za-z0-9_]{2,32}$ / 数据源类型: sparkthrift2.x / 含 2 个子层级
- key: driver_info / 中文名称: 驾驶员基础信息 / value格式: ^[A-Za-z0-9_]{2,32}$ / 数据源类型: hive2.x / 含 1 个子层级
- key: alarm_rule / 中文名称: 告警规则 / value格式: ^[A-Z_]{3,20}$ / 数据源类型: doris3.x / 无子层级
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 通用配置 → json格式校验管理】页面 | 页面正常加载，顶部显示「key名称」搜索框及【导入】【导出】【新增】按钮，列表展示列「key」「中文名称」「value格式」「数据源类型」「创建人」「创建时间」「更新人」「更新时间」「操作」，默认仅展示最外层 key 记录；key「vehicle_info」「driver_info」左侧显示「+」，key「alarm_rule」左侧不显示「+」 |
| 2 | 在页面顶部「key名称」搜索框输入「vehicle」后点击搜索图标 | 列表仅保留 key「vehicle_info」所在记录，中文名称显示「车辆基础信息」，其余顶层 key 记录不再显示，证明 key 名称支持模糊搜索 |
| 3 | 清空页面顶部「key名称」搜索框中的查询值后点击搜索图标 | 列表恢复展示顶层 key「vehicle_info」「driver_info」「alarm_rule」，层级标识与操作列状态恢复为初始展示结果 |

##### 【P1】验证按子层级key名称模糊搜索时可命中对应父级记录

> 前置条件
```
1、已存在层级数据：
- 顶层 key: vehicle_info / 子层级 key: plate_number、owner_phone
- 顶层 key: driver_info / 子层级 key: driver_license_no
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 通用配置 → json格式校验管理】页面 | 页面正常加载，可查看当前顶层 key 列表 |
| 2 | 在页面顶部「key名称」搜索框输入「plate」后点击搜索图标 | 列表返回命中子层级 key「plate_number」对应的父级记录「vehicle_info」，未命中的顶层 key 不显示，父级记录仍保留可展开状态 |
| 3 | 点击搜索结果中 key「vehicle_info」左侧的「+」图标 | 展开后可查看子层级 key「plate_number」，证明搜索可命中子层级 key 名称而非仅匹配最外层 key |

##### 【P1】验证展开子层级后列表展示条数仍按最外层级统计

> 前置条件
```
1、已存在 3 条顶层 key：vehicle_info、driver_info、alarm_rule
2、key「vehicle_info」下存在子层级 key「plate_number」「owner_phone」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 通用配置 → json格式校验管理】页面 | 页面默认展示 3 条最外层 key 记录，列表总数或分页统计口径按最外层 key 计算 |
| 2 | 点击 key「vehicle_info」左侧的「+」图标展开子层级 | 列表新增展示子层级 key「plate_number」「owner_phone」，父级与子级层级关系展示正确 |
| 3 | 观察展开子层级后的列表总数或分页统计信息 | 统计口径保持为 3 条最外层 key，不因展开出的子层级记录而增加统计条数 |

##### 【P2】验证按key名称查询无匹配结果时列表展示空结果状态

> 前置条件
```
已存在顶层 key 配置：vehicle_info、driver_info、alarm_rule
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 通用配置 → json格式校验管理】页面 | 页面正常加载，可查看现有 key 列表 |
| 2 | 在页面顶部「key名称」搜索框输入「not_exist_key」后点击搜索图标 | 列表展示空结果状态，不显示任何 key 记录，页面无新增、误删或报错提示 |

#### 新增与编辑

##### 【P0】验证新增顶层key时数据源类型默认值及正则测试区域显隐正确并可保存

> 前置条件
```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 通用配置 → json格式校验管理】页面 | 页面正常加载，可执行新增操作 |
| 2 | 点击页面右上角【新增】按钮 | 打开【新增key】弹窗；「数据源类型」默认选中「sparkthrift2.x」，下拉选项仅包含「sparkthrift2.x」「hive2.x」「doris3.x」，此时因「value格式」为空，不展示「测试数据」输入区和正则匹配测试按钮 |
| 3 | 在【新增key】弹窗中按顺序配置如下：<br>- 数据源类型: hive2.x<br>- key: quality_rule_code<br>- 中文名称: 质检规则编码<br>- value格式: ^[A-Z]{2}\d{4}$ | 录入「value格式」后，弹窗出现「测试数据」输入区和正则匹配测试按钮，其他已填写字段值保持不变 |
| 4 | 在「测试数据」输入区输入「AB1234」后点击正则匹配测试按钮 | 页面返回当前测试数据符合 value 格式的匹配结果，未出现弹窗关闭、字段清空或报错 |
| 5 | 点击【确定】按钮 | 弹窗关闭，列表新增一条记录，key 显示「quality_rule_code」，中文名称显示「质检规则编码」，value格式显示「^[A-Z]{2}\d{4}$」，数据源类型显示「hive2.x」 |

##### 【P0】验证编辑顶层key时已填写value格式会展示正则测试区域并同步更新列表

> 前置条件
```
已存在顶层 key：driver_phone / 中文名称: 司机联系电话 / value格式: ^1[0-9]{10}$ / 数据源类型: sparkthrift2.x
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 通用配置 → json格式校验管理】页面 | 页面正常加载，可定位到 key「driver_phone」所在行 |
| 2 | 点击 key「driver_phone」所在行的【编辑】按钮 | 打开编辑弹窗，表单回显 key「driver_phone」、中文名称「司机联系电话」、value格式「^1[0-9]{10}$」、数据源类型「sparkthrift2.x」；因已填写 value格式，弹窗同步展示「测试数据」输入区和正则匹配测试按钮 |
| 3 | 在「测试数据」输入区输入「13800138000」后点击正则匹配测试按钮 | 页面返回当前测试数据符合回显 value 格式的匹配结果，弹窗仍保持打开 |
| 4 | 在编辑弹窗中按顺序修改如下：<br>- 数据源类型: doris3.x<br>- 中文名称: 司机手机号<br>- value格式: ^1[3-9]\d{9}$<br>点击【确定】按钮 | 弹窗关闭，列表中 key「driver_phone」所在行更新为中文名称「司机手机号」、value格式「^1[3-9]\d{9}$」、数据源类型「doris3.x」 |

##### 【P1】验证新增顶层key时key重复不会被重复性校验拦截

> 前置条件
```
已存在顶层 key：driver_phone / 中文名称: 司机联系电话 / value格式: ^1[3-9]\d{9}$ / 数据源类型: sparkthrift2.x
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 通用配置 → json格式校验管理】页面 | 页面正常加载，可执行新增操作 |
| 2 | 点击页面右上角【新增】按钮 | 打开【新增key】弹窗 |
| 3 | 在【新增key】弹窗中按顺序配置如下：<br>- 数据源类型: hive2.x<br>- key: driver_phone<br>- 中文名称: 司机手机号备份<br>- value格式: ^1[3-9]\d{9}$<br>点击【确定】按钮 | 系统不因 key 与已有记录同名而拦截提交，弹窗关闭，列表新增一条 key 仍为「driver_phone」的新记录 |
| 4 | 在页面顶部「key名称」搜索框输入「driver_phone」后点击搜索图标 | 搜索结果中可查看至少 2 条 key 为「driver_phone」的记录，证明页面不做重复性校验 |

##### 【P0】验证新增子层级时不展示数据源类型且填写value格式后可进行正则测试并下钻查看

> 前置条件
```
1、已存在顶层 key：vehicle_info / 中文名称: 车辆基础信息 / value格式: ^[A-Za-z0-9_]{2,32}$ / 数据源类型: sparkthrift2.x
2、key「vehicle_info」当前无子层级数据
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 通用配置 → json格式校验管理】页面 | 页面正常加载，可定位到 key「vehicle_info」所在行 |
| 2 | 点击 key「vehicle_info」所在行的【新增子层级】按钮 | 打开【新增子层级】弹窗；弹窗仅展示「key」「中文名称」「value格式」字段，不展示「数据源类型」字段，且在「value格式」为空时不展示「测试数据」输入区和正则匹配测试按钮 |
| 3 | 在【新增子层级】弹窗中按顺序配置如下：<br>- key: plate_number<br>- 中文名称: 车牌号<br>- value格式: ^[京沪浙苏粤A-Z][A-Z0-9]{6}$ | 录入 value格式 后，弹窗出现「测试数据」输入区和正则匹配测试按钮 |
| 4 | 在「测试数据」输入区输入「京A12345」后点击正则匹配测试按钮，再点击【确定】按钮 | 页面返回当前测试数据符合 value 格式的匹配结果并保存成功，弹窗关闭，父级 key「vehicle_info」所在行左侧显示「+」 |
| 5 | 点击 key「vehicle_info」左侧的「+」图标 | 展开后显示子级记录 key「plate_number」，中文名称显示「车牌号」，value格式显示「^[京沪浙苏粤A-Z][A-Z0-9]{6}$」 |

##### 【P1】验证新增子层级时value格式为空不展示测试区域且可保存空value格式记录

> 前置条件
```
1、已存在顶层 key：doc_info / 中文名称: 证件信息 / value格式: ^[A-Za-z0-9_]{2,32}$ / 数据源类型: hive2.x
2、key「doc_info」当前无子层级数据
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 通用配置 → json格式校验管理】页面 | 页面正常加载，可定位到 key「doc_info」所在行 |
| 2 | 点击 key「doc_info」所在行的【新增子层级】按钮 | 打开【新增子层级】弹窗；弹窗不展示「数据源类型」字段，且因「value格式」为空，不展示「测试数据」输入区和正则匹配测试按钮 |
| 3 | 在【新增子层级】弹窗中按顺序配置如下：<br>- key: doc_name<br>- 中文名称: 证件名称<br>- value格式: （留空）<br>点击【确定】按钮 | 弹窗关闭，系统允许保存该子层级记录，保存过程中未出现正则测试区域 |
| 4 | 点击 key「doc_info」左侧的「+」图标 | 展开后显示子级记录 key「doc_name」，其 value格式 列为空值或空白展示 |

##### 【P1】验证新增顶层key时key为空无法提交

> 前置条件
```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 通用配置 → json格式校验管理】页面 | 页面正常加载，可执行新增操作 |
| 2 | 点击页面右上角【新增】按钮 | 打开【新增key】弹窗 |
| 3 | 在【新增key】弹窗中按顺序配置如下：<br>- 数据源类型: sparkthrift2.x<br>- key: （留空）<br>- 中文名称: 车主手机号<br>- value格式: ^1[3-9]\d{9}$<br>点击【确定】按钮 | key 输入框进入红色错误状态并显示必填校验提示，弹窗保持打开，列表不新增中文名称为「车主手机号」的记录 |

##### 【P1】验证新增顶层key时key长度超过255字符会被拦截

> 前置条件
```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 通用配置 → json格式校验管理】页面 | 页面正常加载，可执行新增操作 |
| 2 | 点击页面右上角【新增】按钮 | 打开【新增key】弹窗 |
| 3 | 在【新增key】弹窗中按顺序配置如下：<br>- 数据源类型: sparkthrift2.x<br>- key: kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk<br>- 中文名称: 超长key校验<br>- value格式: ^[0-9]{4}$<br>点击【确定】按钮 | key 输入框显示长度超限的校验提示，弹窗保持打开，列表不新增 key 为该 256 字符字符串的记录 |

##### 【P2】验证新增顶层key时中文名称长度超过255字符会被拦截

> 前置条件
```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 通用配置 → json格式校验管理】页面 | 页面正常加载，可执行新增操作 |
| 2 | 点击页面右上角【新增】按钮 | 打开【新增key】弹窗 |
| 3 | 在【新增key】弹窗中按顺序配置如下：<br>- 数据源类型: sparkthrift2.x<br>- key: owner_email<br>- 中文名称: 中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中中<br>- value格式: ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.com$<br>点击【确定】按钮 | 中文名称输入框显示长度超限的校验提示，弹窗保持打开，列表不新增 key「owner_email」记录 |

##### 【P2】验证新增顶层key时value格式长度超过255字符会被拦截

> 前置条件
```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 通用配置 → json格式校验管理】页面 | 页面正常加载，可执行新增操作 |
| 2 | 点击页面右上角【新增】按钮 | 打开【新增key】弹窗 |
| 3 | 在【新增key】弹窗中按顺序配置如下：<br>- 数据源类型: sparkthrift2.x<br>- key: owner_idcard<br>- 中文名称: 身份证号<br>- value格式: ^[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}[A-Z0-9]{1}$<br>点击【确定】按钮 | value格式输入框显示长度超限的校验提示，弹窗保持打开，列表不新增 key「owner_idcard」记录 |

#### 层级管理

##### 【P1】验证层级达到第五层时不再展示新增子层级入口

> 前置条件
```
1、已存在完整层级链路：
- 第1层 key: vehicle_info
- 第2层 key: owner_info
- 第3层 key: contact_info
- 第4层 key: mobile_rule
- 第5层 key: mask_rule
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 通用配置 → json格式校验管理】页面 | 页面正常加载，可定位到第1层 key「vehicle_info」 |
| 2 | 点击 key「vehicle_info」左侧的「+」图标 | 展开后显示第2层 key「owner_info」 |
| 3 | 点击 key「owner_info」左侧的「+」图标 | 展开后显示第3层 key「contact_info」 |
| 4 | 点击 key「contact_info」左侧的「+」图标 | 展开后显示第4层 key「mobile_rule」 |
| 5 | 点击 key「mobile_rule」左侧的「+」图标 | 展开后显示第5层 key「mask_rule」，其所在行操作列仅显示【编辑】【删除】，不显示【新增子层级】 |

#### 删除操作

##### 【P1】验证删除父级key时会联动删除子层级数据

> 前置条件
```
已存在顶层 key「vehicle_info」及其子级 key「plate_number」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 通用配置 → json格式校验管理】页面 | 页面正常加载，可定位到 key「vehicle_info」所在行 |
| 2 | 点击 key「vehicle_info」所在行的【删除】按钮 | 弹出确认框，文案为「请确认是否删除key信息，若存在子层级key信息会联动删除」 |
| 3 | 在确认框中点击【确定】按钮 | 确认框关闭，列表中不再显示 key「vehicle_info」 |
| 4 | 在页面顶部「key名称」搜索框输入「plate_number」后点击搜索图标 | 列表无匹配记录，子级 key「plate_number」已被联动删除 |

##### 【P1】验证批量删除多个key时会同步删除其子层级数据

> 前置条件
```
1、已存在顶层 key「owner_name」及其子级 key「owner_phone」
2、已存在顶层 key「vin_code」，且该 key 无子层级
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 通用配置 → json格式校验管理】页面 | 页面正常加载，可勾选待删除记录 |
| 2 | 勾选 key「owner_name」与 key「vin_code」所在行左侧复选框后点击【批量删除】按钮 | 页面弹出删除确认框，文案为「请确认是否删除key信息，若存在子层级key信息会联动删除」 |
| 3 | 在确认框中点击【确定】按钮 | 列表中不再显示 key「owner_name」与 key「vin_code」两条记录 |
| 4 | 在页面顶部「key名称」搜索框输入「owner_phone」后点击搜索图标 | 列表无匹配记录，key「owner_name」下的子级「owner_phone」已被联动删除 |

#### 导入导出

##### 【P0】验证导入合法模板后按新增逻辑批量新增key与子层级成功

> 前置条件
```
1、列表中已存在顶层 key：alarm_rule / 中文名称: 告警规则 / value格式: ^[A-Z_]{3,20}$ / 数据源类型: doris3.x
2、准备导入文件「json_format_import_template.xlsx」，包含 3 行新增配置数据：
- 上一级key: （空） / key: vehicleBase / 中文名称: 车辆基础信息 / value格式: ^[A-Za-z0-9_]{2,32}$
- 上一级key: vehicleBase / key: ownerPhone / 中文名称: 车主手机号 / value格式: ^1[3-9]\d{9}$
- 上一级key: vehicleBase / key: plateNumber / 中文名称: 车牌号 / value格式: ^[京沪浙苏粤A-Z][A-Z0-9]{6}$
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 通用配置 → json格式校验管理】页面 | 页面正常加载，可执行导入操作 |
| 2 | 点击页面右上角【导入】按钮 | 打开导入弹窗 |
| 3 | 在导入弹窗上传文件「json_format_import_template.xlsx」后点击【确定】按钮 | 导入完成后弹窗关闭，系统按新增逻辑新增父级 key「vehicleBase」，已存在的 key「alarm_rule」内容保持不变，本次导入过程不体现覆盖更新能力 |
| 4 | 点击 key「vehicleBase」左侧的「+」图标 | 展开后显示子级 key「ownerPhone」与 key「plateNumber」，中文名称分别为「车主手机号」「车牌号」，两条记录均随本次导入新增成功 |

##### 【P1】验证导入存在错误数据时整体失败并支持导出错误文件

> 前置条件
```
1、准备导入文件「json_format_import_template_error_20260403.xlsx」，包含 3 行错误数据：
- 上一级key: （空） / key: kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk / 中文名称: 超长key / value格式: ^[0-9]{4}$
- 上一级key: （空） / key: （空） / 中文名称: 缺少key / value格式: ^[A-Z]{2}$
- 上一级key: not_exists_parent / key: ownerId / 中文名称: 车主编号 / value格式: ^[A-Z0-9]{8}$
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 通用配置 → json格式校验管理】页面 | 页面正常加载，可执行导入操作 |
| 2 | 点击页面右上角【导入】按钮 | 打开导入弹窗 |
| 3 | 在导入弹窗上传文件「json_format_import_template_error_20260403.xlsx」后点击【确定】按钮 | 页面弹出导入结果窗口，明确本次导入失败，错误原因覆盖「key长度超过255字符」「key未填写」「上一层级key无法找到」，且列表不新增任何记录 |
| 4 | 在导入结果窗口点击错误文件下载链接 | 浏览器下载错误文件，文件名符合「json_format_error_YYYYMMDD.xlsx」格式，例如「json_format_error_20240520.xlsx」，错误单元格被红框标记并带有批注原因 |

##### 【P1】验证点击导出后可选择全量导出列表数据

> 前置条件
```
1、页面已存在导出数据：
- key: vehicle_info / 中文名称: 车辆基础信息 / value格式: ^[A-Za-z0-9_]{2,32}$ / 数据源类型: sparkthrift2.x
- key: owner_phone / 中文名称: 车主手机号 / value格式: ^1[3-9]\d{9}$ / 数据源类型: hive2.x
- key: alarm_rule / 中文名称: 告警规则 / value格式: ^[A-Z_]{3,20}$ / 数据源类型: doris3.x
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 通用配置 → json格式校验管理】页面 | 页面正常加载，可执行导出操作 |
| 2 | 点击页面右上角【导出】按钮 | 页面先弹出导出确认框，提示文案为「请确认是否导出列表数据」 |
| 3 | 在导出确认框中选择「全量导出」并确认导出 | 浏览器开始下载导出文件，文件名符合「json_format_YYYYMMDD.xlsx」格式，例如「json_format_20260403.xlsx」，文件中包含 vehicle_info、owner_phone、alarm_rule 等全量列表数据，工作表可正常打开 |

##### 【P1】验证点击导出后可按当前筛选结果导出列表数据

> 前置条件
```
1、页面已存在导出数据：vehicle_info、owner_phone、alarm_rule
2、当前用户具备导出权限
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 通用配置 → json格式校验管理】页面 | 页面正常加载，可执行搜索与导出操作 |
| 2 | 在页面顶部「key名称」搜索框输入「vehicle」后点击搜索图标 | 列表当前仅展示命中的筛选结果 key「vehicle_info」 |
| 3 | 点击页面右上角【导出】按钮 | 页面先弹出导出确认框，提示文案为「请确认是否导出列表数据」 |
| 4 | 在导出确认框中选择「按当前筛选结果导出」并确认导出 | 浏览器开始下载导出文件，文件内容仅包含当前筛选结果 key「vehicle_info」，不包含未命中的 key「owner_phone」「alarm_rule」 |
