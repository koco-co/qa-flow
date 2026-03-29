---
name: 【产品交付】Doris创建自定义函数支持引用资源路径中的jar包 v6.4.5
description: 【产品交付】Doris创建自定义函数支持引用资源路径中的jar包 v6.4.5
tags:
  - 离线开发
  - 产品交付
  - Doris创建自定义函数支持引用资源路径中的jar包
module: batch-works
version: v6.4.5
source: zentao-cases/dtstack-platform/离线开发/archive-cases/v6.4.5/【产品交付】Doris创建自定义函数支持引用资源路径中的jar包.csv
case_count: 16
created_at: 2026-03-29
origin: csv
---
# 【产品交付】Doris创建自定义函数支持引用资源路径中的jar包 v6.4.5
> 来源：zentao-cases/dtstack-platform/离线开发/archive-cases/v6.4.5/【产品交付】Doris创建自定义函数支持引用资源路径中的jar包.csv
> 用例数：16

---

## 【doris创建函数时支持选择资源jar包】

##### 验证【资源管理】不允许替换——doris函数【已引入】的资源 「P2」

> 前置条件
```
控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1
存在两个自定义函数doris_udf_1、doris_udf_3在同一个集群使用同一个资源，且doris_udf_1优先创建
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入资源管理-项目资源-右键ziyuan_1，点击替换资源 | 弹窗提示已引入doris自定义函数，无法替换 |
| 2 | 进入资源管理-租户资源-右键ziyuan_2，点击替换资源 | 弹窗提示已引入doris自定义函数，无法替换 |

##### 验证【历史】doris自定义函数【编辑】失败——编辑资源路径 「P2」

> 前置条件
```
控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1
存在两个自定义函数doris_udf_1、doris_udf_3在同一个集群使用同一个资源，且doris_udf_1优先创建
存在历史doris自定义函数doris_udf_lishi
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入函数管理-dorissql-自定义函数，右键历史自定义函数doris_udf_lishi点击编辑自定义函数 | 弹出创建自定义函数弹窗 |
| 2 |  | 资源路径显示为置灰不可编辑 |

##### 验证【历史】doris自定义函数【正常】执行 「P2」

> 前置条件
```
控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1
存在两个自定义函数doris_udf_1、doris_udf_3在同一个集群使用同一个资源，且doris_udf_1优先创建
存在历史doris自定义函数doris_udf_lishi
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入dorissql任务test_doris_1 | 自定义函数运行成功，结果返回符合预期 |
| 2 | 输入SQL语句：select doris_udf_lishi('hello'); |  |
| 3 | 点击临时运行 |  |

##### 验证doris创建自定义函数【失败】——创建doris函数时【创建】函数失败 「P2」

> 前置条件
```
控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入控制台，删除doris_1集群下的其中一个fe节点 | 节点删除成功，系统给出删除成功提示，该记录从列表中消失 |
| 2 | 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数 | 弹出创建自定义函数弹窗 |
| 3 | 输入 | 【资源】选择方式调整为单选下拉框 |
| 4 | 函数名称：doris_udf_7 | 默认展示文案为【请选择资源】 |
| 5 | 集群名称（下拉）：doris_1 | 确定按钮显示为加载状态 |
| 6 | 类名：jar包对应类名 | 提示函数创建失败，展示失败详情（缺失fe节点） |
| 7 | 资源（下拉）：ziyuan_2 | 自定义函数运行失败，提示自定义函数不存在 |
| 8 | 返回参数类型：jar包对应返回类型 |  |
| 9 | 命令格式：doris_udf_7(string) |  |
| 10 | 点击确认 |  |
| 11 | 进入dorissql任务test_doris_1 |  |
| 12 | 输入SQL语句：select doris_udf_7('hello'); |  |
| 13 | 点击临时运行 |  |

##### 验证doris创建自定义函数【失败】——创建doris函数时【创建】函数失败 「P1」

> 前置条件
```
控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数 | 弹出创建自定义函数弹窗 |
| 2 | 输入 | 【资源】选择方式调整为单选下拉框 |
| 3 | 函数名称：doris_udf_6 | 默认展示文案为【请选择资源】 |
| 4 | 集群名称（下拉）：doris_1 | 确定按钮显示为加载状态 |
| 5 | 类名：jar包对应类名 | 提示函数创建失败，展示失败详情（名称不合法） |
| 6 | 资源（下拉）：ziyuan_2 | 自定义函数运行失败，提示自定义函数不存在 |
| 7 | 返回参数类型：jar包对应返回类型 |  |
| 8 | 命令格式：123_add_one(string) |  |
| 9 | 点击确认 |  |
| 10 | 进入dorissql任务test_doris_1 |  |
| 11 | 输入SQL语句：select 123_add_one('hello'); |  |
| 12 | 点击临时运行 |  |

##### 验证doris创建自定义函数【失败】——创建doris函数时【分发】jar包失败 「P2」

> 前置条件
```
控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数 | 弹出创建自定义函数弹窗 |
| 2 | 输入错误的fe账号密码 | 【资源】选择方式调整为单选下拉框 |
| 3 |  | 默认展示文案为【请选择资源】 |
| 4 |  | 保存成功，联通失败 |

##### 验证doris创建自定义函数【失败】——创建doris函数时【分发】jar包失败 「P1」

> 前置条件
```
控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数 | 弹出创建自定义函数弹窗 |
| 2 | 关闭一台fe或be节点 | 【资源】选择方式调整为单选下拉框 |
| 3 | 输入 | 默认展示文案为【请选择资源】 |
| 4 | 函数名称：doris_udf_5 | 节点关闭成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 5 | 集群名称（下拉）：doris_1 | 确定按钮显示为加载状态 |
| 6 | 类名：jar包对应类名 | 提示函数创建失败，展示失败详情 |
| 7 | 资源（下拉）：ziyuan_2 | 同时展示异常节点及失败原因 |
| 8 | 返回参数类型：jar包对应返回类型 | 自定义函数运行失败，提示自定义函数不存在 |
| 9 | 命令格式：doris_udf_5(string) |  |
| 10 | 点击确认 |  |
| 11 | 进入dorissql任务test_doris_1 |  |
| 12 | 输入SQL语句：select doris_udf_5('hello'); |  |
| 13 | 点击临时运行 |  |

##### 验证doris【正常】创建自定义函数——【旧函数被删除】后创建【同名】函数 「P1」

> 前置条件
```
控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数 | 弹出创建自定义函数弹窗 |
| 2 | 输入 | 【资源】选择方式调整为单选下拉框 |
| 3 | 函数名称：doris_udf_tmp | 默认展示文案为【请选择资源】 |
| 4 | 集群名称（下拉）：doris_1 | 确定按钮显示为加载状态 |
| 5 | 类名：jar包对应类名 | 创建完成后提示“创建成功！” |
| 6 | 资源（下拉）：ziyuan_2 | 自定义函数运行成功，结果返回符合预期 |
| 7 | 返回参数类型：jar包对应返回类型 |  |
| 8 | 命令格式：doris_udf_tmp(string) |  |
| 9 | 点击确认 |  |
| 10 | 进入dorissql任务test_doris_1 |  |
| 11 | 输入SQL语句：select doris_udf_tmp('hello'); |  |
| 12 | 点击临时运行 |  |

##### 验证doris【正常】【删除】自定义函数 「P1」

> 前置条件
```
控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1
存在自定义函数doris_udf_tmp
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数 | 弹出创建自定义函数弹窗 |
| 2 | 输入 | 【资源】选择方式调整为单选下拉框 |
| 3 | 函数名称：doris_udf_tmp | 默认展示文案为【请选择资源】 |
| 4 | 集群名称（下拉）：doris_1 | 确定按钮显示为加载状态 |
| 5 | 类名：jar包对应类名 | 创建完成后提示“创建成功！” |
| 6 | 资源（下拉）：ziyuan_1 | 自定义函数被删除 |
| 7 | 返回参数类型：jar包对应返回类型 |  |
| 8 | 命令格式：doris_udf_tmp(string) |  |
| 9 | 点击确认 |  |
| 10 | 右键自定义函数点击删除-确认 |  |

##### 验证doris【无法】创建自定义函数——【旧函数被修改】后创建【同名】函数 「P3」

> 前置条件
```
控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入函数管理-dorissql-自定义函数-右键自定义函数点击编辑 | 弹出修改自定义函数弹窗 |
| 2 | 修改命令格式为：doris_udf_1_xiugai | 自定义函数修改成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 点击确认 | 结果符合预期 |
| 4 | 点击自定义函数-基本信息、历史版本 | 弹出创建自定义函数弹窗 |
| 5 | 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数 | 【资源】选择方式调整为单选下拉框 |
| 6 | 输入 | 默认展示文案为【请选择资源】 |
| 7 | 函数名称：doris_udf_1 | 确定按钮显示为加载状态 |
| 8 | 集群名称（下拉）：doris_1 | 创建完成后提示“创建失败” |
| 9 | 类名：jar包对应类名 | 异常提示函数已存在 |
| 10 | 资源（下拉）：ziyuan_1 |  |
| 11 | 返回参数类型：jar包对应返回类型 |  |
| 12 | 命令格式：doris_udf_1(string) |  |
| 13 | 点击确认 |  |

##### 验证doris【正常】【修改】自定义函数——编辑自定义函数【命令格式】 「P2」

> 前置条件
```
控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1
存在自定义函数doris_udf_1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入函数管理-dorissql-自定义函数-右键自定义函数点击编辑 | 弹出修改自定义函数弹窗 |
| 2 | 修改命令格式为：doris_udf_1_xiugai | 自定义函数修改成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 点击确认 | 结果符合预期 |
| 4 | 点击自定义函数-基本信息、历史版本 | 自定义函数运行成功，结果返回符合预期 |
| 5 | 进入dorissql任务test_doris_1 | 自定义函数运行成功，结果返回符合预期 |
| 6 | 输入SQL语句：select doris_udf_1_xiugai('hello'); |  |
| 7 | 点击临时运行 |  |
| 8 | 再次输入SQL语句：select doris_udf_1('hello'); |  |
| 9 | 点击临时运行 |  |

##### 验证【历史】doris自定义函数【正常】执行——同一【集群】被【相同】资源覆盖时 「P2」

> 前置条件
```
控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1
存在两个自定义函数doris_udf_1、doris_udf_3在同一个集群使用同一个资源，且doris_udf_1优先创建
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入dorissql任务test_doris_1 | 自定义函数运行成功，结果返回符合预期 |
| 2 | 输入SQL语句：select doris_udf_1('hello'); |  |
| 3 | 点击临时运行 |  |

##### 验证doris【正常】创建自定义函数——使用【不同】资源在【相同】集群创建自定义函数 「P1」

> 前置条件
```
控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数 | 弹出创建自定义函数弹窗 |
| 2 | 输入 | 【资源】选择方式调整为单选下拉框 |
| 3 | 函数名称：doris_udf_4 | 默认展示文案为【请选择资源】 |
| 4 | 集群名称（下拉）：doris_1 | 确定按钮显示为加载状态 |
| 5 | 类名：jar包对应类名 | 创建完成后提示“创建成功！” |
| 6 | 资源（下拉）：ziyuan_2 | 自定义函数运行成功，结果返回符合预期 |
| 7 | 返回参数类型：jar包对应返回类型 |  |
| 8 | 命令格式：doris_udf_4(string) |  |
| 9 | 点击确认 |  |
| 10 | 进入dorissql任务test_doris_1 |  |
| 11 | 输入SQL语句：select doris_udf_4('hello'); |  |
| 12 | 点击临时运行 |  |

##### 验证doris【正常】创建自定义函数——使用【重复】资源在【相同】集群创建自定义函数 「P1」

> 前置条件
```
控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数 | 弹出创建自定义函数弹窗 |
| 2 | 输入 | 【资源】选择方式调整为单选下拉框 |
| 3 | 函数名称：doris_udf_3 | 默认展示文案为【请选择资源】 |
| 4 | 集群名称（下拉）：doris_1 | 确定按钮显示为加载状态 |
| 5 | 类名：jar包对应类名 | 创建完成后提示“创建成功！” |
| 6 | 资源（下拉）：ziyuan_1 | 自定义函数运行成功，结果返回符合预期 |
| 7 | 返回参数类型：jar包对应返回类型 |  |
| 8 | 命令格式：doris_udf_3(string) |  |
| 9 | 点击确认 |  |
| 10 | 进入dorissql任务test_doris_1 |  |
| 11 | 输入SQL语句：select doris_udf_3('hello'); |  |
| 12 | 点击临时运行 |  |

##### 验证doris【正常】创建自定义函数——doris【引入集群】为【多个】时 「P2」

> 前置条件
```
控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1(doris_2)、test_doris_2(doris_3)
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数 | 弹出创建自定义函数弹窗 |
| 2 | 输入 | 【资源】选择方式调整为单选下拉框 |
| 3 | 函数名称：doris_udf_2 | 默认展示文案为【请选择资源】 |
| 4 | 集群名称（下拉）：doris_2 | 确定按钮显示为加载状态 |
| 5 | 类名：jar包对应类名 | 创建完成后提示“创建成功！” |
| 6 | 资源（下拉）：ziyuan_1 | 自定义函数运行成功，结果返回符合预期 |
| 7 | 返回参数类型：jar包对应返回类型 | 自定义函数运行失败，报错函数不存在 |
| 8 | 命令格式：doris_udf_2(string) |  |
| 9 | 点击确认 |  |
| 10 | 进入dorissql任务test_doris_1 |  |
| 11 | 输入SQL语句：select doris_udf_2('hello'); |  |
| 12 | 点击临时运行 |  |
| 13 | 进入dorissql任务test_doris_2 |  |
| 14 | 输入SQL语句：select doris_udf_2('hello'); |  |
| 15 | 点击临时运行 |  |

##### 验证doris【正常】创建自定义函数——doris【引入集群】为【一个】时 「P1」

> 前置条件
```
控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（只引入一个doris集群doris_1）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数 | 弹出创建自定义函数弹窗 |
| 2 | 输入 | 【资源】选择方式调整为单选下拉框 |
| 3 | 函数名称：doris_udf_1 | 默认展示文案为【请选择资源】 |
| 4 | 集群名称（下拉）：doris_1 | 确定按钮显示为加载状态 |
| 5 | 类名：jar包对应类名 | 创建完成后提示“创建成功！” |
| 6 | 资源（下拉）：ziyuan_1 | 自定义函数运行成功，结果返回符合预期 |
| 7 | 返回参数类型：jar包对应返回类型 |  |
| 8 | 命令格式：doris_udf_1(string) |  |
| 9 | 点击确认 |  |
| 10 | 进入dorissql任务test_doris_1 |  |
| 11 | 输入SQL语句：select doris_udf_1('hello'); |  |
| 12 | 点击临时运行 |  |

