---
suite_name: 【通用配置】json格式配置
description: 【通用配置】json格式配置
dev_version: ""
tags:
  - 通用配置
  - 数据质量
  - json格式配置
create_at: 2026-04-03
update_at: 2026-04-03
status: 已归档
health_warnings: []
repos: []
case_count: 24
origin: xmind
---

## 通用配置

### 配置页

#### 默认加载与搜索

##### 【P0】验证json格式配置页默认加载仅展示最外层记录并支持层级展开收起

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
2、在【数据资产 → 数据质量 → 通用配置 → json格式配置】页面预置配置：
- 一层 key=orderInfo，中文名称=订单信息，value格式留空，数据源类型=sparkthrift2.x
- 二层 key=buyer，上一层级key=orderInfo，中文名称=购买人，value格式留空，数据源类型=sparkthrift2.x
- 三层 key=contact，上一层级key=buyer，中文名称=联系方式，value格式留空，数据源类型=sparkthrift2.x
- 四层 key=mobile，上一层级key=contact，中文名称=手机号，value格式=^1\d{10}$，数据源类型=sparkthrift2.x
- 一层 key=deviceInfo，中文名称=设备信息，value格式留空，数据源类型=hive2.x
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面展示搜索框、【新增】【批量删除】【导入】【导出】按钮；列表仅展示顶层 key“orderInfo”与“deviceInfo”2 条记录，展示条数为 2；“orderInfo”行显示展开按钮，“deviceInfo”行不显示展开按钮 |
| 2 | 点击“orderInfo”行前的【+】按钮 | 列表在“orderInfo”下展示二层 key“buyer”，当前页展示条数仍按顶层记录统计为 2 |
| 3 | 依次点击“buyer”与“contact”行前的【+】按钮 | 列表继续展示三层 key“contact”与四层 key“mobile”，层级缩进与父子关系保持正确 |
| 4 | 点击“orderInfo”行前的【-】按钮 | “orderInfo”分支下的“buyer”“contact”“mobile”全部收起并隐藏，列表恢复仅展示 2 条顶层记录 |

##### 【P1】验证按顶层key搜索后仅返回命中记录

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
2、在【数据资产 → 数据质量 → 通用配置 → json格式配置】页面预置配置：
- 一层 key=orderInfo，中文名称=订单信息，value格式留空，数据源类型=sparkthrift2.x
- 二层 key=buyer，上一层级key=orderInfo，中文名称=购买人，value格式留空，数据源类型=sparkthrift2.x
- 三层 key=contact，上一层级key=buyer，中文名称=联系方式，value格式留空，数据源类型=sparkthrift2.x
- 四层 key=mobile，上一层级key=contact，中文名称=手机号，value格式=^1\d{10}$，数据源类型=sparkthrift2.x
- 一层 key=deviceInfo，中文名称=设备信息，value格式留空，数据源类型=hive2.x
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面默认展示顶层 key“orderInfo”与“deviceInfo”2 条记录 |
| 2 | 在搜索框输入“deviceInfo”并点击【搜索】按钮 | 搜索条件生效，列表按 key 条件重新加载 |
| 3 | 查看搜索结果 | 列表仅展示顶层 key“deviceInfo”，不展示“orderInfo”“buyer”“contact”“mobile” |
| 4 | 清空搜索框内容并点击【搜索】按钮 | 列表恢复展示“orderInfo”与“deviceInfo”2 条顶层记录 |

##### 【P0】验证按子层级key搜索后自动定位命中层级链路

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
2、在【数据资产 → 数据质量 → 通用配置 → json格式配置】页面预置配置：
- 一层 key=orderInfo，中文名称=订单信息，value格式留空，数据源类型=sparkthrift2.x
- 二层 key=buyer，上一层级key=orderInfo，中文名称=购买人，value格式留空，数据源类型=sparkthrift2.x
- 三层 key=contact，上一层级key=buyer，中文名称=联系方式，value格式留空，数据源类型=sparkthrift2.x
- 四层 key=mobile，上一层级key=contact，中文名称=手机号，value格式=^1\d{10}$，数据源类型=sparkthrift2.x
- 一层 key=deviceInfo，中文名称=设备信息，value格式留空，数据源类型=hive2.x
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面默认展示顶层 key“orderInfo”与“deviceInfo”2 条记录 |
| 2 | 在搜索框输入“mobile”并点击【搜索】按钮 | 搜索条件生效，列表开始按关键字过滤 |
| 3 | 查看搜索结果 | 列表自动展开命中链路“orderInfo → buyer → contact → mobile”，命中 key“mobile”可直接查看，未命中的顶层 key“deviceInfo”不展示 |
| 4 | 清空搜索框内容并点击【搜索】按钮 | 列表恢复为默认顶层视图，搜索结果中的自动展开状态被清空 |

##### 【P2】验证按不存在的key搜索时列表展示空结果

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
2、在【数据资产 → 数据质量 → 通用配置 → json格式配置】页面预置配置：
- 一层 key=orderInfo，中文名称=订单信息，value格式留空，数据源类型=sparkthrift2.x
- 二层 key=buyer，上一层级key=orderInfo，中文名称=购买人，value格式留空，数据源类型=sparkthrift2.x
- 三层 key=contact，上一层级key=buyer，中文名称=联系方式，value格式留空，数据源类型=sparkthrift2.x
- 四层 key=mobile，上一层级key=contact，中文名称=手机号，value格式=^1\d{10}$，数据源类型=sparkthrift2.x
- 一层 key=deviceInfo，中文名称=设备信息，value格式留空，数据源类型=hive2.x
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面默认展示顶层 key“orderInfo”与“deviceInfo”2 条记录 |
| 2 | 在搜索框输入“missingKey15696”并点击【搜索】按钮 | 搜索条件生效，列表按 key 条件重新加载 |
| 3 | 查看搜索结果 | 列表区域不展示任何 key 数据行 |
| 4 | 清空搜索框内容并点击【搜索】按钮 | 列表恢复展示“orderInfo”与“deviceInfo”2 条顶层记录 |

#### 新增与编辑

##### 【P0】验证新增顶层key后列表展示新增记录

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
2、确认【数据资产 → 数据质量 → 通用配置 → json格式配置】页面不存在 key=invoiceInfo 的记录。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面正常加载，可看到【新增】按钮 |
| 2 | 点击【新增】按钮 | 新增弹窗打开，数据源类型默认选中“sparkthrift2.x”，下拉可选项仅包含“sparkthrift2.x”“hive2.x”“doris3.x”；value格式为空时不展示测试数据输入区域 |
| 3 | 在新增弹窗按以下内容填写并点击【确定】按钮：<br>- key: invoiceInfo<br>- 中文名称: 发票信息<br>- value格式: 保持为空<br>- 数据源类型: sparkthrift2.x | 新增弹窗关闭，列表新增一条顶层记录 |
| 4 | 在搜索框输入“invoiceInfo”并点击【搜索】按钮 | 搜索结果仅展示 key“invoiceInfo”，中文名称为“发票信息”，数据源类型为“sparkthrift2.x” |

##### 【P0】验证编辑当前层级后当前行信息同步更新

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
2、在【数据资产 → 数据质量 → 通用配置 → json格式配置】页面预置配置：
- 一层 key=orderInfo，中文名称=订单信息，value格式留空，数据源类型=sparkthrift2.x
- 二层 key=buyer，上一层级key=orderInfo，中文名称=购买人，value格式留空，数据源类型=sparkthrift2.x
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面正常加载，列表可进行 key 搜索 |
| 2 | 在搜索框输入“buyer”并点击【搜索】按钮，点击搜索结果中“buyer”行的【编辑】按钮 | 搜索结果展示层级链路“orderInfo → buyer”，编辑弹窗打开且 key 回显为“buyer” |
| 3 | 在编辑弹窗按以下内容修改并点击【确定】按钮：<br>- 中文名称: 购买人信息<br>- value格式: ^[A-Za-z0-9_]{2,32}$<br>- 数据源类型: sparkthrift2.x | 编辑弹窗关闭，当前层级记录完成更新 |
| 4 | 再次搜索“buyer” | “buyer”行显示中文名称“购买人信息”、value格式“^[A-Za-z0-9_]{2,32}$”、数据源类型“hive2.x” |

##### 【P0】验证新增子层级后子key挂载到当前层级下

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
2、在【数据资产 → 数据质量 → 通用配置 → json格式配置】页面预置配置：
- 一层 key=orderInfo，中文名称=订单信息，数据源类型=sparkthrift2.x
- 二层 key=buyer，上一层级key=orderInfo，中文名称=购买人，数据源类型=sparkthrift2.x
- 三层 key=contact，上一层级key=buyer，中文名称=联系方式，数据源类型=sparkthrift2.x
- 四层 key=mobile，上一层级key=contact，中文名称=手机号，value格式=^1\d{10}$，数据源类型=sparkthrift2.x
- key=mobile 当前无子层级
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面正常加载，列表支持按 key 搜索 |
| 2 | 在搜索框输入“mobile”并点击【搜索】按钮 | 搜索结果展示层级链路“orderInfo → buyer → contact → mobile” |
| 3 | 点击“mobile”行的【新增子层级】按钮，在弹窗按以下内容填写并点击【确定】按钮：<br>- key: countryCode<br>- 中文名称: 国家区号<br>- value格式: ^\+\d{1,4}$<br>- 数据源类型: sparkthrift2.x | 新增子层级弹窗关闭，“mobile”行新增 1 个子层级 |
| 4 | 清空搜索条件后再次搜索“countryCode” | 列表展示层级链路“orderInfo → buyer → contact → mobile → countryCode”，“countryCode”挂载在“mobile”下 |

##### 【P1】验证第五层key不展示新增子层级按钮

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
2、在【数据资产 → 数据质量 → 通用配置 → json格式配置】页面预置五层配置：
- 一层 key=orderInfo
- 二层 key=buyer，上一层级key=orderInfo
- 三层 key=contact，上一层级key=buyer
- 四层 key=mobile，上一层级key=contact
- 五层 key=countryCode，上一层级key=mobile，value格式=^\+\d{1,4}$
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面正常加载，可进行 key 搜索 |
| 2 | 在搜索框输入“countryCode”并点击【搜索】按钮 | 列表展示五层链路“orderInfo → buyer → contact → mobile → countryCode” |
| 3 | 查看“countryCode”行操作区 | “countryCode”行仅展示【编辑】【删除】，不展示【新增子层级】 |
| 4 | 查看同一链路中“mobile”行操作区 | 第四层“mobile”行仍展示【新增子层级】按钮 |

#### 字段校验

##### 【P1】验证新增顶层key时key为空不可提交

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面正常加载，可看到【新增】按钮 |
| 2 | 点击【新增】按钮 | 新增弹窗打开，key 输入框为空，数据源类型默认选中“sparkthrift2.x” |
| 3 | 在新增弹窗按以下内容填写并点击【确定】按钮：<br>- key: 保持为空<br>- 中文名称: 空key校验<br>- value格式: 保持为空<br>- 数据源类型: sparkthrift2.x | key 输入框出现必填提示，新增弹窗保持打开，无法提交 |

##### 【P1】验证新增顶层key时key超过255字符不可提交

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面正常加载，可看到【新增】按钮 |
| 2 | 点击【新增】按钮 | 新增弹窗打开，可录入 key、中文名称、value格式、数据源类型 |
| 3 | 在新增弹窗按以下内容填写并点击【确定】按钮：<br>- key: 输入 256 个字母 k 组成的字符串<br>- 中文名称: key长度校验<br>- value格式: 保持为空<br>- 数据源类型: sparkthrift2.x | key 输入框出现超长校验提示，新增弹窗保持打开，无法提交 |
| 4 | 将 key 改为 255 个字母 k 组成的字符串并点击【确定】按钮 | 新增成功，列表新增 1 条顶层记录 |

##### 【P1】验证新增顶层key时中文名称超过255字符不可提交

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
2、确认【数据资产 → 数据质量 → 通用配置 → json格式配置】页面不存在 key=cnNameLimit15696 的记录。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面正常加载，可看到【新增】按钮 |
| 2 | 点击【新增】按钮 | 新增弹窗打开，可录入 key、中文名称、value格式、数据源类型 |
| 3 | 在新增弹窗按以下内容填写并点击【确定】按钮：<br>- key: cnNameLimit15696<br>- 中文名称: 输入 256 个“中”<br>- value格式: 保持为空<br>- 数据源类型: sparkthrift2.x | 中文名称输入框出现超长校验提示，新增弹窗保持打开，无法提交 |
| 4 | 将中文名称改为 255 个“中”并点击【确定】按钮 | 新增成功，列表新增 key“cnNameLimit15696”记录 |

##### 【P1】验证新增顶层key时value格式超过255字符不可提交

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
2、确认【数据资产 → 数据质量 → 通用配置 → json格式配置】页面不存在 key=regexLimit15696 的记录。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面正常加载，可看到【新增】按钮 |
| 2 | 点击【新增】按钮 | 新增弹窗打开，可录入 key、中文名称、value格式、数据源类型 |
| 3 | 在新增弹窗按以下内容填写并点击【确定】按钮：<br>- key: regexLimit15696<br>- 中文名称: 正则长度校验<br>- value格式: 输入 256 个字母 a 组成的字符串<br>- 数据源类型: sparkthrift2.x | value格式输入框出现超长校验提示，新增弹窗保持打开，无法提交 |
| 4 | 将 value格式 改为 ^[A-Za-z]{1,10}$ 并点击【确定】按钮 | 新增成功，列表新增 key“regexLimit15696”记录，value格式显示为“^[A-Za-z]{1,10}$” |

##### 【P1】验证配置value格式后可对测试数据执行正则校验

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
2、确认【数据资产 → 数据质量 → 通用配置 → json格式配置】页面不存在 key=phoneRegex15696 的记录。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面正常加载，可看到【新增】按钮 |
| 2 | 点击【新增】按钮 | 新增弹窗打开，value格式输入框可编辑 |
| 3 | 在新增弹窗按以下内容填写：<br>- key: phoneRegex15696<br>- 中文名称: 手机号校验<br>- value格式: ^1\d{10}$<br>- 数据源类型: sparkthrift2.x | value格式填写完成后，弹窗展示测试数据输入区域 |
| 4 | 在测试数据输入框输入“13800138000”并触发正则测试 | 测试结果区标记输入值“13800138000”符合“^1\d{10}$” |

##### 【P1】验证测试数据不匹配value格式时展示失败结果

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
2、确认【数据资产 → 数据质量 → 通用配置 → json格式配置】页面不存在 key=phoneRegexFail15696 的记录。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面正常加载，可看到【新增】按钮 |
| 2 | 点击【新增】按钮 | 新增弹窗打开，value格式输入框可编辑 |
| 3 | 在新增弹窗按以下内容填写：<br>- key: phoneRegexFail15696<br>- 中文名称: 手机号失败校验<br>- value格式: ^1\d{10}$<br>- 数据源类型: sparkthrift2.x | value格式填写完成后，弹窗展示测试数据输入区域 |
| 4 | 在测试数据输入框输入“abc123”并触发正则测试 | 测试结果区标记输入值“abc123”不符合“^1\d{10}$”，页面不出现匹配通过状态 |

#### 删除

##### 【P0】验证单条删除时展示级联删除提示并联动删除子层级

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
2、在【数据资产 → 数据质量 → 通用配置 → json格式配置】页面预置配置：
- 一层 key=obsoletePayload，中文名称=历史报文
- 二层 key=oldBuyer，上一层级key=obsoletePayload，中文名称=历史购买人
- 三层 key=oldMobile，上一层级key=oldBuyer，中文名称=历史手机号
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面正常加载，可看到目标配置列表 |
| 2 | 在搜索框输入“obsoletePayload”并点击【搜索】按钮 | 列表展示“obsoletePayload”根节点及其子层级展开入口 |
| 3 | 点击“obsoletePayload”行的【删除】按钮，并在确认弹窗点击【确定】按钮 | 确认弹窗文案为“请确认是否删除key信息，若存在子层级key信息会联动删除”；确认后“obsoletePayload”分支从列表移除 |
| 4 | 在搜索框输入“oldMobile”并点击【搜索】按钮 | 搜索结果为空，“obsoletePayload”“oldBuyer”“oldMobile”均不再展示 |

##### 【P1】验证批量删除时展示批量级联删除提示并删除选中分支

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
2、在【数据资产 → 数据质量 → 通用配置 → json格式配置】页面预置配置：
- 一层 key=batchDeleteA，中文名称=批量删除A
- 二层 key=batchDeleteAChild，上一层级key=batchDeleteA，中文名称=批量删除A子级
- 一层 key=batchDeleteB，中文名称=批量删除B
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面正常加载，列表支持批量勾选 |
| 2 | 在搜索框输入“batchDelete”并点击【搜索】按钮 | 列表展示顶层 key“batchDeleteA”与“batchDeleteB”2 条记录 |
| 3 | 勾选“batchDeleteA”与“batchDeleteB”，点击【批量删除】按钮，并在确认弹窗点击【确定】按钮 | 确认弹窗文案为“请确认是否批量删除key信息，若存在子层级key信息会联动删除”；确认后两条顶层记录从列表移除 |
| 4 | 在搜索框输入“batchDeleteAChild”并点击【搜索】按钮 | 搜索结果为空，batchDeleteA 的子层级已被一并删除 |

#### 导入

##### 【P1】验证导入模板包含五个Sheet与对应字段结构

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
2、浏览器下载目录已清空，可直接打开 xlsx 文件。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面正常加载，可看到【导入】按钮 |
| 2 | 点击【导入】按钮 | 页面弹出导入弹窗，弹窗内展示文件上传区域与模板下载入口 |
| 3 | 点击弹窗中的【下载模板】链接 | 浏览器开始下载文件“json_format_import_template.xlsx” |
| 4 | 打开下载的“json_format_import_template.xlsx” | 工作簿包含“一层”“二层”“三层”“四层”“五层”5 个 Sheet；“一层”表头为“key”“中文名称”“value格式”；“二层”“三层”“四层”“五层”表头为“上一层级的key名”“key”“中文名称”“value格式” |

##### 【P0】验证导入五层模板成功且重名上一层级默认取第一个

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
2、在本地准备导入文件“json_format_success_15696.xlsx”，内容如下：
- Sheet“一层”：第 2 行为 customer / 客户A / 留空；第 3 行为 customer / 客户B / 留空
- Sheet“二层”：第 2 行为 customer / identity / 身份信息 / 留空
- Sheet“三层”：第 2 行为 identity / idCard / 身份证号 / ^[0-9X]{18}$
- Sheet“四层”：第 2 行为 idCard / issueRegion / 签发地区 / 留空
- Sheet“五层”：第 2 行为 issueRegion / regionCode / 地区编码 / ^\d{6}$
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面正常加载，可执行导入操作 |
| 2 | 点击【导入】按钮，上传文件“json_format_success_15696.xlsx” | 导入弹窗展示已上传文件名“json_format_success_15696.xlsx” |
| 3 | 点击【确定】按钮 | 系统先完成内容校验，导入成功后弹窗关闭，列表新增两条顶层 key“customer”记录 |
| 4 | 在搜索框输入“customer”并点击【搜索】按钮，依次展开第一个“customer”与第二个“customer”行 | 第一个“customer”行可继续展开“identity → idCard → issueRegion → regionCode”五层链路；第二个“customer”行无子层级，说明重名上一层级默认取第一个 key 作为父节点 |

##### 【P0】验证导入时上一层级key不存在会拦截并支持导出错误文件

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
2、在本地准备导入文件“json_format_parent_missing_15696.xlsx”，内容如下：
- Sheet“一层”：第 2 行为 deviceInfo / 设备信息 / 留空
- Sheet“二层”：第 2 行为 unknownParent / model / 设备型号 / ^[A-Z0-9-]{4,20}$
- Sheet“三层”“四层”“五层”无数据行
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面正常加载，可执行导入操作 |
| 2 | 点击【导入】按钮，上传文件“json_format_parent_missing_15696.xlsx” | 导入弹窗展示已上传文件名“json_format_parent_missing_15696.xlsx” |
| 3 | 点击【确定】按钮 | 系统先完成内容校验后，页面提示“导入表格中存在错误数据，请检查后重新导入，点击导出错误文件。”，当前文件内容未写入配置列表 |
| 4 | 点击【导出错误文件】并打开下载文件 | 下载文件名以“json_format_error_”开头并带当天日期；“二层”Sheet 中 key“model”所在行被标红，批注原因为“上一层级key无法找到” |

##### 【P0】验证导入时必填项缺失会拦截并支持导出错误文件

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
2、在本地准备导入文件“json_format_required_missing_15696.xlsx”，内容如下：
- Sheet“一层”：第 2 行为 userProfile / 用户画像 / 留空
- Sheet“二层”：第 2 行为 留空 / basicInfo / 基础信息 / 留空
- Sheet“三层”“四层”“五层”无数据行
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面正常加载，可执行导入操作 |
| 2 | 点击【导入】按钮，上传文件“json_format_required_missing_15696.xlsx” | 导入弹窗展示已上传文件名“json_format_required_missing_15696.xlsx” |
| 3 | 点击【确定】按钮 | 系统先完成内容校验后，页面提示“导入表格中存在错误数据，请检查后重新导入，点击导出错误文件。”，当前文件内容未写入配置列表 |
| 4 | 点击【导出错误文件】并打开下载文件 | 下载文件名以“json_format_error_”开头并带当天日期；“二层”Sheet 中 key“basicInfo”所在行被标红，批注原因为“上一层级的key名必填” |

##### 【P1】验证导入时key名称超过255字符会被拦截

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
2、在本地准备导入文件“json_format_key_too_long_15696.xlsx”，内容如下：
- Sheet“一层”：A2 单元格使用公式 =REPT("k",256) 生成 256 个字符的 key，B2 为“超长key”，C2 留空
- Sheet“二层”“三层”“四层”“五层”无数据行
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面正常加载，可执行导入操作 |
| 2 | 点击【导入】按钮，上传文件“json_format_key_too_long_15696.xlsx” | 导入弹窗展示已上传文件名“json_format_key_too_long_15696.xlsx” |
| 3 | 点击【确定】按钮 | 系统先完成内容校验后，页面提示“导入表格中存在错误数据，请检查后重新导入，点击导出错误文件。”，当前文件内容未写入配置列表 |
| 4 | 点击【导出错误文件】并打开下载文件 | 下载文件名以“json_format_error_”开头并带当天日期；“一层”Sheet 中超长 key 所在行被标红，批注原因为“key名称过长” |

#### 导出

##### 【P2】验证导出仅导出当前筛选结果且文件命名符合规则

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
2、在【数据资产 → 数据质量 → 通用配置 → json格式配置】页面预置配置：
- 一层 key=deviceInfo，中文名称=设备信息
- 二层 key=osVersion，上一层级key=deviceInfo，中文名称=系统版本，value格式=^(Android|iOS).*$
- 一层 key=orderInfo，中文名称=订单信息
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面 | 页面正常加载，可执行搜索与导出操作 |
| 2 | 在搜索框输入“deviceInfo”并点击【搜索】按钮 | 列表仅展示 key“deviceInfo”命中的筛选结果 |
| 3 | 点击【导出】按钮，并在确认弹窗点击【确定】按钮 | 确认弹窗文案为“请确认是否导出列表数据”；浏览器开始下载导出文件 |
| 4 | 打开下载的导出文件 | 文件名以“json_format_”开头并带当天日期，扩展名为“.xlsx”；工作簿仅包含 1 个 Sheet，字段顺序在“更新时间”后新增“层级关系”，其枚举值依次为“一层”“二层”“三层”“四层”“五层”；文件内容包含“deviceInfo”筛选结果，不包含“orderInfo”记录 |

##### 【P1】验证存在五层层级时导出的xlsx文件内容正确

> 前置条件
```
1、使用账号 qa_json_admin 登录数据资产系统。
2、在【数据资产 → 数据质量 → 通用配置 → json格式配置】页面预置配置：
- 一层 key=deviceInfo，中文名称=设备信息，value格式留空
- 二层 key=hardware，上一层级key=deviceInfo，中文名称=硬件信息，value格式留空
- 三层 key=network，上一层级key=hardware，中文名称=网络信息，value格式留空
- 四层 key=sim，上一层级key=network，中文名称=SIM信息，value格式留空
- 五层 key=iccid，上一层级key=sim，中文名称=ICCID，value格式=^[0-9]{20}$
- 一层 key=orderInfo，中文名称=订单信息，value格式留空
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 通用配置 → json格式配置】页面，在搜索框输入“deviceInfo”并点击【搜索】按钮 | 页面正常加载，列表展示以 `deviceInfo` 为根节点的筛选结果，可继续执行导出操作 |
| 2 | 点击【导出】按钮，并在确认弹窗点击【确定】按钮 | 确认弹窗文案为“请确认是否导出列表数据”；浏览器开始下载导出文件 |
| 3 | 打开下载的导出文件并查看唯一 Sheet 的表头 | 工作簿仅包含 1 个 Sheet，表头包含 `key`、`中文名称`、`value格式`、`创建时间`、`更新时间`、`层级关系` 等导出字段，且 `层级关系` 位于 `更新时间` 后 |
| 4 | 校验 Sheet 中 `deviceInfo` 五层链路的导出内容 | Sheet 中存在 `deviceInfo`、`hardware`、`network`、`sim`、`iccid` 五条记录，且五条记录的 `层级关系` 依次为“一层”“二层”“三层”“四层”“五层”；`iccid` 行的 `value格式` 为 `^[0-9]{20}$`，其余四条记录的 `value格式` 为空 |
| 5 | 继续核对导出文件中的其他记录 | 导出文件不包含未命中筛选条件的 `orderInfo` 记录，说明五层内容导出时仍仅导出当前筛选结果 |

## 数据质量

### 列表页

#### 历史任务回归

##### 【P0】验证删除已关联任务的key后历史规则回显正常且任务可继续运行

> 前置条件
```
1、使用账号 qa_quality_admin 登录数据资产系统，当前项目已授权 sparkthrift2.x 数据源“qa_spark_json”。
2、在 sparkthrift2.x 数据源执行 SQL：
DROP TABLE IF EXISTS qa_quality.json_order_check;
CREATE TABLE IF NOT EXISTS qa_quality.json_order_check (
  order_id STRING,
  order_payload STRING
);
INSERT INTO qa_quality.json_order_check VALUES
('O20260403001', '{"orderInfo":{"buyer":{"contact":{"mobile":"13800138000"}}}}'),
('O20260403002', '{"orderInfo":{"buyer":{"contact":{"mobile":"13800138001"}}}}');
3、在【数据资产 → 数据质量 → 通用配置 → json格式配置】页面创建并保存层级：
- 一层 key=orderInfo，中文名称=订单信息，数据源类型=sparkthrift2.x
- 二层 key=buyer，上一层级key=orderInfo，中文名称=购买人，数据源类型=sparkthrift2.x
- 三层 key=contact，上一层级key=buyer，中文名称=联系方式，数据源类型=sparkthrift2.x
- 四层 key=mobile，上一层级key=contact，中文名称=手机号，value格式=^1\d{10}$，数据源类型=sparkthrift2.x
4、在【数据资产 → 数据质量 → 规则集管理】页面创建规则包“qa_json_mobile_rule_pkg_15696”，配置如下：
- 数据源类型: sparkthrift2.x
- 数据库: qa_quality
- 数据表: json_order_check
- 字段: order_payload
- 统计规则: 格式-json格式校验
- 校验 key: mobile
规则包保存成功。
5、在【数据资产 → 数据质量 → 规则任务管理】页面创建手动规则任务“qa_json_mobile_rule_15696”，绑定规则包“qa_json_mobile_rule_pkg_15696”，调度方式选择“手动执行”，首次运行结果为“运行成功”。
6、在【数据资产 → 数据质量 → 通用配置 → json格式配置】页面删除 key“mobile”，当前配置列表已搜索不到“mobile”。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产 → 数据质量 → 规则任务管理】页面 | 页面正常加载，任务列表可执行搜索与编辑操作 |
| 2 | 在搜索框输入“qa_json_mobile_rule_15696”并点击【搜索】按钮，点击该任务的【编辑】按钮 | 列表仅展示任务“qa_json_mobile_rule_15696”，任务编辑页成功打开 |
| 3 | 查看绑定规则包与规则明细后点击【取消】按钮返回列表 | 任务编辑页仍正常回显已绑定规则包“qa_json_mobile_rule_pkg_15696”及“校验 key: mobile”，页面未出现 key 丢失或配置为空的提示；返回列表后任务配置保持原样 |
| 4 | 在任务列表点击“qa_json_mobile_rule_15696”的【立即运行】按钮 | 系统受理运行指令，任务生成新的实例记录 |
| 5 | 进入【数据资产 → 数据质量 → 任务实例查询】页面，搜索任务“qa_json_mobile_rule_15696”的最新实例 | 最新实例状态显示为“运行成功”，质量任务未出现“key不存在”类报错，说明删除配置后历史任务仍可继续运行 |
