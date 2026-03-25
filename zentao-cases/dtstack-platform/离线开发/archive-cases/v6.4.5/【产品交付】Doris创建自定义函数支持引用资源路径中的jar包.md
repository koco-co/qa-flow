# 【产品交付】Doris创建自定义函数支持引用资源路径中的jar包 v6.4.5
> 来源：zentao-cases/dtstack-platform/离线开发/archive-cases/v6.4.5/【产品交付】Doris创建自定义函数支持引用资源路径中的jar包.csv
> 用例数：16

---

## 验证【资源管理】不允许替换——doris函数【已引入】的资源
**优先级**: P2
**前置条件**: 控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1
存在两个自定义函数doris_udf_1、doris_udf_3在同一个集群使用同一个资源，且doris_udf_1优先创建

**步骤**:
1. 进入资源管理-项目资源-右键ziyuan_1，点击替换资源
2. 进入资源管理-租户资源-右键ziyuan_2，点击替换资源

**预期**:
1. 弹窗提示已引入doris自定义函数，无法替换
2. 弹窗提示已引入doris自定义函数，无法替换

---

## 验证【历史】doris自定义函数【编辑】失败——编辑资源路径
**优先级**: P2
**前置条件**: 控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1
存在两个自定义函数doris_udf_1、doris_udf_3在同一个集群使用同一个资源，且doris_udf_1优先创建
存在历史doris自定义函数doris_udf_lishi

**步骤**:
1. 进入函数管理-dorissql-自定义函数，右键历史自定义函数doris_udf_lishi点击编辑自定义函数

**预期**:
1. 弹出创建自定义函数弹窗
2. 资源路径显示为置灰不可编辑

---

## 验证【历史】doris自定义函数【正常】执行
**优先级**: P2
**前置条件**: 控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1
存在两个自定义函数doris_udf_1、doris_udf_3在同一个集群使用同一个资源，且doris_udf_1优先创建
存在历史doris自定义函数doris_udf_lishi

**步骤**:
1. 进入dorissql任务test_doris_1
2. 输入SQL语句：select doris_udf_lishi('hello');
3. 点击临时运行

**预期**:
1. 自定义函数运行成功，结果返回符合预期

---

## 验证doris创建自定义函数【失败】——创建doris函数时【创建】函数失败
**优先级**: P2
**前置条件**: 控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1

**步骤**:
1. 进入控制台，删除doris_1集群下的其中一个fe节点
2. 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数
3. 输入
4. 函数名称：doris_udf_7
5. 集群名称（下拉）：doris_1
6. 类名：jar包对应类名
7. 资源（下拉）：ziyuan_2
8. 返回参数类型：jar包对应返回类型
9. 命令格式：doris_udf_7(string)
10. 点击确认
11. 进入dorissql任务test_doris_1
12. 输入SQL语句：select doris_udf_7('hello');
13. 点击临时运行

**预期**:
1. 节点删除成功，系统给出删除成功提示，该记录从列表中消失
2. 弹出创建自定义函数弹窗
3. 【资源】选择方式调整为单选下拉框
4. 默认展示文案为【请选择资源】
5. 确定按钮显示为加载状态
6. 提示函数创建失败，展示失败详情（缺失fe节点）
7. 自定义函数运行失败，提示自定义函数不存在

---

## 验证doris创建自定义函数【失败】——创建doris函数时【创建】函数失败
**优先级**: P1
**前置条件**: 控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1

**步骤**:
1. 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数
2. 输入
3. 函数名称：doris_udf_6
4. 集群名称（下拉）：doris_1
5. 类名：jar包对应类名
6. 资源（下拉）：ziyuan_2
7. 返回参数类型：jar包对应返回类型
8. 命令格式：123_add_one(string)
9. 点击确认
10. 进入dorissql任务test_doris_1
11. 输入SQL语句：select 123_add_one('hello');
12. 点击临时运行

**预期**:
1. 弹出创建自定义函数弹窗
2. 【资源】选择方式调整为单选下拉框
3. 默认展示文案为【请选择资源】
4. 确定按钮显示为加载状态
5. 提示函数创建失败，展示失败详情（名称不合法）
6. 自定义函数运行失败，提示自定义函数不存在

---

## 验证doris创建自定义函数【失败】——创建doris函数时【分发】jar包失败
**优先级**: P2
**前置条件**: 控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1

**步骤**:
1. 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数
2. 输入错误的fe账号密码

**预期**:
1. 弹出创建自定义函数弹窗
2. 【资源】选择方式调整为单选下拉框
3. 默认展示文案为【请选择资源】
4. 保存成功，联通失败

---

## 验证doris创建自定义函数【失败】——创建doris函数时【分发】jar包失败
**优先级**: P1
**前置条件**: 控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1

**步骤**:
1. 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数
2. 关闭一台fe或be节点
3. 输入
4. 函数名称：doris_udf_5
5. 集群名称（下拉）：doris_1
6. 类名：jar包对应类名
7. 资源（下拉）：ziyuan_2
8. 返回参数类型：jar包对应返回类型
9. 命令格式：doris_udf_5(string)
10. 点击确认
11. 进入dorissql任务test_doris_1
12. 输入SQL语句：select doris_udf_5('hello');
13. 点击临时运行

**预期**:
1. 弹出创建自定义函数弹窗
2. 【资源】选择方式调整为单选下拉框
3. 默认展示文案为【请选择资源】
4. 节点关闭成功，系统给出成功反馈，相关页面/数据状态更新为最新
5. 确定按钮显示为加载状态
6. 提示函数创建失败，展示失败详情
7. 同时展示异常节点及失败原因
8. 自定义函数运行失败，提示自定义函数不存在

---

## 验证doris【正常】创建自定义函数——【旧函数被删除】后创建【同名】函数
**优先级**: P1
**前置条件**: 控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1

**步骤**:
1. 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数
2. 输入
3. 函数名称：doris_udf_tmp
4. 集群名称（下拉）：doris_1
5. 类名：jar包对应类名
6. 资源（下拉）：ziyuan_2
7. 返回参数类型：jar包对应返回类型
8. 命令格式：doris_udf_tmp(string)
9. 点击确认
10. 进入dorissql任务test_doris_1
11. 输入SQL语句：select doris_udf_tmp('hello');
12. 点击临时运行

**预期**:
1. 弹出创建自定义函数弹窗
2. 【资源】选择方式调整为单选下拉框
3. 默认展示文案为【请选择资源】
4. 确定按钮显示为加载状态
5. 创建完成后提示“创建成功！”
6. 自定义函数运行成功，结果返回符合预期

---

## 验证doris【正常】【删除】自定义函数
**优先级**: P1
**前置条件**: 控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1
存在自定义函数doris_udf_tmp

**步骤**:
1. 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数
2. 输入
3. 函数名称：doris_udf_tmp
4. 集群名称（下拉）：doris_1
5. 类名：jar包对应类名
6. 资源（下拉）：ziyuan_1
7. 返回参数类型：jar包对应返回类型
8. 命令格式：doris_udf_tmp(string)
9. 点击确认
10. 右键自定义函数点击删除-确认

**预期**:
1. 弹出创建自定义函数弹窗
2. 【资源】选择方式调整为单选下拉框
3. 默认展示文案为【请选择资源】
4. 确定按钮显示为加载状态
5. 创建完成后提示“创建成功！”
6. 自定义函数被删除

---

## 验证doris【无法】创建自定义函数——【旧函数被修改】后创建【同名】函数
**优先级**: P3
**前置条件**: 控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1

**步骤**:
1. 进入函数管理-dorissql-自定义函数-右键自定义函数点击编辑
2. 修改命令格式为：doris_udf_1_xiugai
3. 点击确认
4. 点击自定义函数-基本信息、历史版本
5. 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数
6. 输入
7. 函数名称：doris_udf_1
8. 集群名称（下拉）：doris_1
9. 类名：jar包对应类名
10. 资源（下拉）：ziyuan_1
11. 返回参数类型：jar包对应返回类型
12. 命令格式：doris_udf_1(string)
13. 点击确认

**预期**:
1. 弹出修改自定义函数弹窗
2. 自定义函数修改成功，系统给出成功反馈，相关页面/数据状态更新为最新
3. 结果符合预期
4. 弹出创建自定义函数弹窗
5. 【资源】选择方式调整为单选下拉框
6. 默认展示文案为【请选择资源】
7. 确定按钮显示为加载状态
8. 创建完成后提示“创建失败”
9. 异常提示函数已存在

---

## 验证doris【正常】【修改】自定义函数——编辑自定义函数【命令格式】
**优先级**: P2
**前置条件**: 控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1
存在自定义函数doris_udf_1

**步骤**:
1. 进入函数管理-dorissql-自定义函数-右键自定义函数点击编辑
2. 修改命令格式为：doris_udf_1_xiugai
3. 点击确认
4. 点击自定义函数-基本信息、历史版本
5. 进入dorissql任务test_doris_1
6. 输入SQL语句：select doris_udf_1_xiugai('hello');
7. 点击临时运行
8. 再次输入SQL语句：select doris_udf_1('hello');
9. 点击临时运行

**预期**:
1. 弹出修改自定义函数弹窗
2. 自定义函数修改成功，系统给出成功反馈，相关页面/数据状态更新为最新
3. 结果符合预期
4. 自定义函数运行成功，结果返回符合预期
5. 自定义函数运行成功，结果返回符合预期

---

## 验证【历史】doris自定义函数【正常】执行——同一【集群】被【相同】资源覆盖时
**优先级**: P2
**前置条件**: 控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1
存在两个自定义函数doris_udf_1、doris_udf_3在同一个集群使用同一个资源，且doris_udf_1优先创建

**步骤**:
1. 进入dorissql任务test_doris_1
2. 输入SQL语句：select doris_udf_1('hello');
3. 点击临时运行

**预期**:
1. 自定义函数运行成功，结果返回符合预期

---

## 验证doris【正常】创建自定义函数——使用【不同】资源在【相同】集群创建自定义函数
**优先级**: P1
**前置条件**: 控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1

**步骤**:
1. 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数
2. 输入
3. 函数名称：doris_udf_4
4. 集群名称（下拉）：doris_1
5. 类名：jar包对应类名
6. 资源（下拉）：ziyuan_2
7. 返回参数类型：jar包对应返回类型
8. 命令格式：doris_udf_4(string)
9. 点击确认
10. 进入dorissql任务test_doris_1
11. 输入SQL语句：select doris_udf_4('hello');
12. 点击临时运行

**预期**:
1. 弹出创建自定义函数弹窗
2. 【资源】选择方式调整为单选下拉框
3. 默认展示文案为【请选择资源】
4. 确定按钮显示为加载状态
5. 创建完成后提示“创建成功！”
6. 自定义函数运行成功，结果返回符合预期

---

## 验证doris【正常】创建自定义函数——使用【重复】资源在【相同】集群创建自定义函数
**优先级**: P1
**前置条件**: 控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1

**步骤**:
1. 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数
2. 输入
3. 函数名称：doris_udf_3
4. 集群名称（下拉）：doris_1
5. 类名：jar包对应类名
6. 资源（下拉）：ziyuan_1
7. 返回参数类型：jar包对应返回类型
8. 命令格式：doris_udf_3(string)
9. 点击确认
10. 进入dorissql任务test_doris_1
11. 输入SQL语句：select doris_udf_3('hello');
12. 点击临时运行

**预期**:
1. 弹出创建自定义函数弹窗
2. 【资源】选择方式调整为单选下拉框
3. 默认展示文案为【请选择资源】
4. 确定按钮显示为加载状态
5. 创建完成后提示“创建成功！”
6. 自定义函数运行成功，结果返回符合预期

---

## 验证doris【正常】创建自定义函数——doris【引入集群】为【多个】时
**优先级**: P2
**前置条件**: 控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（doris集群doris_1、doris_2、doris_3）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1(doris_2)、test_doris_2(doris_3)

**步骤**:
1. 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数
2. 输入
3. 函数名称：doris_udf_2
4. 集群名称（下拉）：doris_2
5. 类名：jar包对应类名
6. 资源（下拉）：ziyuan_1
7. 返回参数类型：jar包对应返回类型
8. 命令格式：doris_udf_2(string)
9. 点击确认
10. 进入dorissql任务test_doris_1
11. 输入SQL语句：select doris_udf_2('hello');
12. 点击临时运行
13. 进入dorissql任务test_doris_2
14. 输入SQL语句：select doris_udf_2('hello');
15. 点击临时运行

**预期**:
1. 弹出创建自定义函数弹窗
2. 【资源】选择方式调整为单选下拉框
3. 默认展示文案为【请选择资源】
4. 确定按钮显示为加载状态
5. 创建完成后提示“创建成功！”
6. 自定义函数运行成功，结果返回符合预期
7. 自定义函数运行失败，报错函数不存在

---

## 验证doris【正常】创建自定义函数——doris【引入集群】为【一个】时
**优先级**: P1
**前置条件**: 控制台已配置多个doris集群doris_1、doris_2、doris_3
存在项目test_001（只引入一个doris集群doris_1）
资源管理存在doris自定义函数可用资源ziyuan_1（项目资源）、ziyuan_2（租户资源）
存在dorissql任务：test_doris_1

**步骤**:
1. 进入函数管理-dorissql-自定义函数，右键点击新建自定义函数
2. 输入
3. 函数名称：doris_udf_1
4. 集群名称（下拉）：doris_1
5. 类名：jar包对应类名
6. 资源（下拉）：ziyuan_1
7. 返回参数类型：jar包对应返回类型
8. 命令格式：doris_udf_1(string)
9. 点击确认
10. 进入dorissql任务test_doris_1
11. 输入SQL语句：select doris_udf_1('hello');
12. 点击临时运行

**预期**:
1. 弹出创建自定义函数弹窗
2. 【资源】选择方式调整为单选下拉框
3. 默认展示文案为【请选择资源】
4. 确定按钮显示为加载状态
5. 创建完成后提示“创建成功！”
6. 自定义函数运行成功，结果返回符合预期

---

