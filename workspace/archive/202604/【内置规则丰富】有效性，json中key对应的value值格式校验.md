---
suite_name: "【内置规则丰富】有效性，json中key对应的value值格式校验"
description: "有效性校验支持对json类型字段做key对应的value值格式校验"
prd_id: 15694
prd_version: "v6.3"
product: ""
tags:
  - "【内置规则丰富】有效性，json中key对应的value值格式校验"
  - "数据质量"
  - "规则任务管理"
create_at: "2026-04-06"
status: "草稿"
case_count: 30
origin: "xmind"
---

## 数据质量

### 规则任务管理

#### P0-主流程

##### 【P0】验证选择格式-json格式校验规则并配置校验key后保存执行，校验通过时质量报告展示正确

> 前置条件
```
1. 使用 admin 账号登录系统
2. 数据源中心已添加数据源「测试数据源_Doris」并授权给资产平台
3. 已在「通用配置 → json格式校验管理」中维护如下数据：
   - key路径「person-name」，中文名称「人员姓名」，value格式正则：^[\u4e00-\u9fa5]+$
   - key路径「person-age」，中文名称「人员年龄」，value格式正则：^\d{1,3}$
   - key路径「person-email」，中文名称「人员邮箱」，未配置value格式
4. 资产平台已引入该数据源，数据源下存在 quality_test_db 数据库
5. 已执行以下 SQL 创建测试表并灌入数据：
   CREATE TABLE quality_test_db.json_format_test (
     id INT,
     info JSON,
     name VARCHAR(255)
   );
   INSERT INTO quality_test_db.json_format_test VALUES
     (1, '{"person":{"name":"张三","age":"25","email":"test@example.com"}}', 'row1'),
     (2, '{"person":{"name":"李四","age":"30","email":"admin@test.com"}}', 'row2');
6. 已在资产平台引入该表，且元数据中 info 字段类型识别为 json
7. 已创建规则任务「json格式校验任务_P0」并关联 quality_test_db.json_format_test 表
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「json格式校验任务_P0」，点击操作列的【编辑规则】按钮，进入规则配置页面；在有效性校验区域点击【添加规则】，按如下配置填写：<br>- 字段：info（json）<br>- 统计规则：格式-json格式校验<br>- 校验key：勾选「person-name」和「person-age」<br>点击【保存】按钮 | 规则保存成功：<br>1) 规则列表中显示新增规则行<br>2) 「统计规则」列显示「格式-json格式校验」<br>3) 「校验key」列回显「person-name;person-age」 |
| 3 | 返回规则任务列表，找到「json格式校验任务_P0」，点击操作列的【立即执行】按钮，等待任务状态变为「已完成」（最长等待30秒） | 任务执行完成：<br>1) 状态列显示「已完成」<br>2) 最新校验结果列显示「校验通过」 |
| 4 | 点击「json格式校验任务_P0」行的【查看报告】入口，进入质量报告页面，找到「格式-json格式校验」规则对应行，查看各列内容 | 质量报告中该规则行展示：<br>1) 规则类型列=「有效性校验」<br>2) 规则名称列=「格式-json格式校验」<br>3) 字段类型列=「json」<br>4) 质检结果列=「校验通过」<br>5) 未通过原因列=「--」<br>6) 详情说明列=「符合规则key为"person-name;person-age"时的value格式要求」<br>7) 操作列无「查看详情」链接 |

##### 【P0】验证选择格式-json格式校验规则后校验不通过时，质量报告展示正确且支持查看明细

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已在「通用配置 → json格式校验管理」中维护：
   - key路径「order-amount」，中文名称「订单金额」，value格式正则：^\d+\.\d{2}$
   - key路径「order-status」，中文名称「订单状态」，value格式正则：^(pending|paid|cancelled)$
3. 已执行以下 SQL 创建测试表并灌入包含不合规数据的数据：
   CREATE TABLE quality_test_db.json_invalid_test (
     id INT,
     order_info JSON,
     remark VARCHAR(255)
   );
   INSERT INTO quality_test_db.json_invalid_test VALUES
     (1, '{"order":{"amount":"100.00","status":"paid"}}', 'row_valid'),
     (2, '{"order":{"amount":"abc","status":"unknown"}}', 'row_invalid'),
     (3, '{"order":{"amount":"50.5","status":"pending"}}', 'row_invalid2');
4. 已创建规则任务「json格式校验任务_不通过」并关联该表
5. 已为该规则任务配置「格式-json格式校验」规则：
   - 字段：order_info（json）
   - 校验key：order-amount、order-status
   已执行完成，结果为「校验不通过」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「json格式校验任务_不通过」，点击【查看报告】入口，进入质量报告页面，查看「格式-json格式校验」规则行各列内容 | 质量报告中该规则行展示：<br>1) 规则类型列=「有效性校验」<br>2) 规则名称列=「格式-json格式校验」<br>3) 字段类型列=「json」<br>4) 质检结果列=「校验不通过」<br>5) 未通过原因列=「key对应value格式校验未通过」<br>6) 详情说明列=「不符合规则key为"order-amount;order-status"时的value格式要求」<br>7) 操作列显示「查看详情」链接 |
| 3 | 点击操作列的【查看详情】链接，等待明细弹窗加载完成 | 弹窗标题显示「查看"有效性校验-格式-json格式校验"明细」；明细列表加载完成，显示不符合要求的数据行（id=2和id=3的记录） |
| 4 | 查看明细列表的列结构及校验字段标红展示情况 | 1) 明细列表保留全部字段（id、order_info、remark）<br>2) 「order_info」校验字段以红色高亮标红展示<br>3) 其余字段正常展示 |

#### 规则配置-选项UI

##### 【P1】验证规则库中「格式-json格式校验」内置规则展示信息正确

> 前置条件
```
1. 使用 admin 账号登录系统
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则库】页面，等待内置规则列表加载完成 | 规则库页面正常加载，内置规则列表展示完成 |
| 2 | 在「内置规则」列表的搜索框中输入「格式-json格式校验」，点击搜索 | 搜索结果展示「格式-json格式校验」规则条目，各字段显示：<br>1) 规则名称=「格式-json格式校验」<br>2) 规则解释=「格式-json格式校验」<br>3) 规则分类=「有效性校验」<br>4) 关联范围=「字段」<br>5) 规则描述=「校验json类型的字段中key对应的value值是否符合规范要求」 |

##### 【P1】验证规则配置页「统计规则」下拉框中「格式-json格式校验」选项位置在自定义正则上方

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已创建规则任务「json格式UI测试任务」并关联包含 json 字段的数据表 quality_test_db.json_format_test
3. 已在「通用配置 → json格式校验管理」中维护key路径「person-name」，中文名称「人员姓名」，value格式正则：^[\u4e00-\u9fa5]+$
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「json格式UI测试任务」，点击【编辑规则】，在规则配置页面点击【添加规则】，选择「有效性校验」，「字段」下拉框选择「info（json）」，展开「统计规则」下拉框，查看选项列表 | 「统计规则」下拉框中出现「格式-json格式校验」选项，且该选项位于「自定义正则」选项的上方 |

##### 【P1】验证「格式-json格式校验」统计规则悬浮提示内容正确

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已创建规则任务「json格式提示测试任务」并关联包含 json 字段的数据表 quality_test_db.json_format_test
3. 已在「通用配置 → json格式校验管理」中维护key路径「person-name」，中文名称「人员姓名」，value格式正则：^[\u4e00-\u9fa5]+$
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「json格式提示测试任务」，点击【编辑规则】，在规则配置页面点击【添加规则】，选择「有效性校验」，「字段」下拉框选择「info（json）」，「统计规则」下拉框选择「格式-json格式校验」，将鼠标悬浮在「格式-json格式校验」选项或其旁边的提示图标上 | 悬浮提示内容显示为：「校验内容为key名对应的value格式是否符合要求，value格式需要在通用配置模块维护。」 |

#### 规则配置-字段类型限制

##### 【P1】验证「格式-json格式校验」仅支持json和string类型字段，选择其他类型字段时不显示该统计规则选项

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已执行以下 SQL 创建包含多种字段类型的测试表：
   CREATE TABLE quality_test_db.multi_type_test (
     id INT,
     name VARCHAR(255),
     age INT,
     salary DECIMAL(10,2),
     info JSON,
     created_at DATETIME
   );
3. 已在资产平台引入该表，且元数据字段类型识别正确
4. 已创建规则任务「字段类型限制测试任务」并关联 quality_test_db.multi_type_test 表
5. 已在「通用配置 → json格式校验管理」中维护key路径「person-name」，中文名称「人员姓名」，value格式正则：^[\u4e00-\u9fa5]+$
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「字段类型限制测试任务」，点击【编辑规则】，添加有效性校验规则，分别将「字段」依次选择为「age（int）」「salary（decimal）」「created_at（datetime）」，观察每次选择后「统计规则」下拉框的可选项 | 选择 int、decimal、datetime 类型字段时，「统计规则」下拉框中均不出现「格式-json格式校验」选项 |
| 3 | 将「字段」切换选择为「info（json）」，展开「统计规则」下拉框查看选项 | 选择 json 类型字段后，「统计规则」下拉框中出现「格式-json格式校验」选项 |
| 4 | 将「字段」切换选择为「name（varchar）」，展开「统计规则」下拉框查看选项 | 选择 varchar 类型字段后，「统计规则」下拉框中同样出现「格式-json格式校验」选项 |

#### 规则配置-校验key选择

##### 【P1】验证校验key列表中仅配置了value格式的key可被选中，未配置value格式的key不可选中

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已在「通用配置 → json格式校验管理」中维护以下数据：
   - key路径「product-name」，中文名称「产品名称」，value格式正则：^.{1,50}$
   - key路径「product-code」，中文名称「产品编码」，value格式正则：^[A-Z]{2}\d{6}$
   - key路径「product-desc」，中文名称「产品描述」，未配置value格式
3. 已创建规则任务「key选择测试任务」并关联包含 json 字段的数据表 quality_test_db.json_format_test
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「key选择测试任务」，点击【编辑规则】，添加有效性校验规则，按如下配置：<br>- 字段：info（json）<br>- 统计规则：格式-json格式校验<br>展开「校验key」下拉选择框，查看列表中各key的可选状态 | 「校验key」下拉框列表中：<br>1) 「product-name」（已配置value格式）显示为可选状态，可点击勾选<br>2) 「product-code」（已配置value格式）显示为可选状态，可点击勾选<br>3) 「product-desc」（未配置value格式）显示为不可选状态，置灰禁用 |
| 3 | 尝试点击「product-desc」进行选中操作 | 「product-desc」无法被选中，复选框保持未勾选状态 |
| 4 | 点击勾选「product-name」和「product-code」 | 「product-name」和「product-code」均成功勾选，下拉框输入框内回显「product-name;product-code」 |

##### 【P1】验证校验key支持多选和全选操作

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已在「通用配置 → json格式校验管理」中维护以下配置了value格式的key：
   - key路径「user-name」，中文名称「用户姓名」，value格式正则：^[\u4e00-\u9fa5a-zA-Z]{1,20}$
   - key路径「user-phone」，中文名称「用户手机号」，value格式正则：^1[3-9]\d{9}$
   - key路径「user-id」，中文名称「用户身份证号」，value格式正则：^\d{18}$
3. 已创建规则任务「多选全选测试任务」并关联包含 json 字段的数据表 quality_test_db.json_format_test
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「多选全选测试任务」，点击【编辑规则】，添加有效性校验规则，按如下配置：<br>- 字段：info（json）<br>- 统计规则：格式-json格式校验<br>展开「校验key」下拉框，分别勾选「user-name」「user-phone」「user-id」三个key | 三个key均成功勾选，复选框显示为选中状态 |
| 3 | 查看输入框的回显内容 | 输入框回显格式为「user-name;user-phone;user-id」，多个key以分号分隔 |
| 4 | 点击下拉框中的「全部」选项 | 列表中所有可选key（已配置value格式的key）全部被勾选，「全部」选项复选框显示为选中状态 |
| 5 | 再次点击「全部」选项取消全选 | 所有key均取消勾选，「全部」选项复选框恢复为未选中状态，输入框回显清空 |

##### 【P1】验证校验key搜索功能正常

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已在「通用配置 → json格式校验管理」中维护以下配置了value格式的key：
   - key路径「order-amount」，中文名称「订单金额」，value格式正则：^\d+\.\d{2}$
   - key路径「order-status」，中文名称「订单状态」，value格式正则：^(paid|pending)$
   - key路径「user-name」，中文名称「用户姓名」，value格式正则：^.{1,20}$
3. 已创建规则任务「key搜索测试任务」并关联包含 json 字段的数据表 quality_test_db.json_format_test
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「key搜索测试任务」，点击【编辑规则】，添加有效性校验规则，按如下配置：<br>- 字段：info（json）<br>- 统计规则：格式-json格式校验<br>展开「校验key」下拉框，在搜索框中输入「order」 | 下拉列表过滤展示，仅显示包含「order」的key：「order-amount」和「order-status」；「user-name」不在列表中显示 |
| 3 | 清空搜索框内容，查看下拉列表 | 下拉列表恢复展示全部key，「order-amount」「order-status」「user-name」均重新显示 |

##### 【P1】验证校验key数据量超过200条时默认加载前200条展示

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已在「通用配置 → json格式校验管理」中维护超过200条配置了value格式的key（共210条，key命名规则为 test-key-001 至 test-key-210，中文名称分别为「测试键001」至「测试键210」，每条均配置value格式正则 ^.+$）
3. 已创建规则任务「大数据量key测试任务」并关联包含 json 字段的数据表 quality_test_db.json_format_test
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「大数据量key测试任务」，点击【编辑规则】，添加有效性校验规则，按如下配置：<br>- 字段：info（json）<br>- 统计规则：格式-json格式校验<br>展开「校验key」下拉框，观察初始加载的key列表 | 「校验key」下拉框初始展示前200条key（test-key-001 至 test-key-200），第201条及以后的key（test-key-201至test-key-210）不在初始列表中显示 |
| 3 | 在搜索框中输入「test-key-205」进行搜索 | 搜索结果中显示「test-key-205」，可正常选中 |

##### 【P1】验证校验key回显格式及勾选仅对当前层级生效

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已在「通用配置 → json格式校验管理」中维护以下配置了value格式的key（层级结构）：
   - 一级key「person」下二级key「name」，路径「person-name」，中文名称「人员姓名」，value格式正则：^[\u4e00-\u9fa5]+$
   - 一级key「person」下二级key「age」，路径「person-age」，中文名称「人员年龄」，value格式正则：^\d{1,3}$
   - 一级key「address」下二级key「city」，路径「address-city」，中文名称「地址城市」，value格式正则：^.{1,20}$
3. 已创建规则任务「层级key测试任务」并关联包含 json 字段的数据表 quality_test_db.json_format_test
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「层级key测试任务」，点击【编辑规则】，添加有效性校验规则，按如下配置：<br>- 字段：info（json）<br>- 统计规则：格式-json格式校验<br>展开「校验key」下拉框，勾选「person-name」和「address-city」，点击【保存】 | 规则保存成功；规则行的「校验key」列回显内容为「person-name;address-city」，分号分隔不同key路径，连字符分隔层级 |
| 3 | 编辑该规则，重新展开「校验key」下拉框，查看已勾选的key是否正确回显 | 1) 「person-name」复选框显示为勾选状态<br>2) 「address-city」复选框显示为勾选状态<br>3) 「person-age」复选框显示为未勾选状态 |

##### 【P1】验证校验key输入框悬浮时展示全部key名，默认仅显示前两个

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已在「通用配置 → json格式校验管理」中维护以下配置了value格式的key：
   - key路径「field-key1」，中文名称「字段键1」，value格式正则：^.+$
   - key路径「field-key2」，中文名称「字段键2」，value格式正则：^.+$
   - key路径「field-key3」，中文名称「字段键3」，value格式正则：^.+$
   - key路径「field-key4」，中文名称「字段键4」，value格式正则：^.+$
3. 已创建规则任务「悬浮展示测试任务」并关联包含 json 字段的数据表 quality_test_db.json_format_test
4. 已配置「格式-json格式校验」规则，校验key选择了4个key：「field-key1」「field-key2」「field-key3」「field-key4」，并已保存
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「悬浮展示测试任务」，点击【编辑规则】，查看已保存的「格式-json格式校验」规则行中「校验key」字段的展示内容 | 「校验key」字段区域默认仅展示前两个key「field-key1」和「field-key2」，后续key以省略符截断 |
| 3 | 将鼠标悬浮在「校验key」字段区域 | 浮层展示全部4个key名：「field-key1」「field-key2」「field-key3」「field-key4」 |

#### 规则配置-value格式预览

##### 【P1】验证点击「value格式预览」弹窗仅展示已勾选key的格式信息且支持分页

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已在「通用配置 → json格式校验管理」中维护以下配置了value格式的key（共15条）：
   - key路径「check-key-01」，中文名称「校验键01」，value格式正则：^[A-Z]{2}\d{4}$
   - key路径「check-key-02」，中文名称「校验键02」，value格式正则：^1[3-9]\d{9}$
   - key路径「check-key-03」至「check-key-15」，中文名称「校验键03」至「校验键15」，各配置不同正则
3. 已创建规则任务「value预览测试任务」并关联包含 json 字段的数据表 quality_test_db.json_format_test
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「value预览测试任务」，点击【编辑规则】，添加有效性校验规则，按如下配置：<br>- 字段：info（json）<br>- 统计规则：格式-json格式校验<br>展开「校验key」下拉框，勾选「check-key-01」「check-key-02」「check-key-03」共3个key | 3个key成功勾选 |
| 3 | 点击「value格式预览」按钮，等待弹窗加载完成 | 弹窗正常打开：<br>1) 弹窗内列表仅展示已勾选的3个key对应的信息，未勾选的「check-key-04」至「check-key-15」不显示<br>2) 列表包含两列：「key」列和「value格式」列<br>3) 「check-key-01」对应「^[A-Z]{2}\d{4}$」<br>4) 「check-key-02」对应「^1[3-9]\d{9}$」 |
| 4 | 关闭弹窗，取消勾选「check-key-03」，再次点击「value格式预览」按钮，等待弹窗加载完成 | 弹窗内列表更新为仅展示「check-key-01」和「check-key-02」共2条记录，「check-key-03」不再显示 |
| 5 | 关闭弹窗，重新勾选「check-key-03」至「check-key-12」共12个key（合计12个），点击「value格式预览」按钮，查看弹窗分页情况 | 1) 弹窗展示分页控件<br>2) 默认展示第1页数据<br>3) 可翻页查看剩余key的格式信息 |

#### 规则配置-逆向用例

##### 【P1】验证选择非json或string类型字段时「格式-json格式校验」统计规则选项不可选

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已执行以下 SQL 创建包含 int 类型字段的测试表：
   CREATE TABLE quality_test_db.int_type_test (
     id INT,
     count_val INT,
     note VARCHAR(255)
   );
3. 已在资产平台引入该表，元数据中 count_val 字段类型识别为 int
4. 已创建规则任务「int类型限制测试任务」并关联 quality_test_db.int_type_test 表
5. 已在「通用配置 → json格式校验管理」中维护key路径「person-name」，中文名称「人员姓名」，value格式正则：^[\u4e00-\u9fa5]+$
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「int类型限制测试任务」，点击【编辑规则】，在规则配置页面点击【添加规则】，选择「有效性校验」，「字段」下拉框选择「count_val（int）」，展开「统计规则」下拉框 | 「统计规则」下拉框中不出现「格式-json格式校验」选项 |

##### 【P1】验证未选择校验key时保存规则提示「请选择校验key」

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已创建规则任务「必填校验测试任务」并关联包含 json 字段的数据表 quality_test_db.json_format_test
3. 已在「通用配置 → json格式校验管理」中维护key路径「person-name」，中文名称「人员姓名」，value格式正则：^[\u4e00-\u9fa5]+$
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「必填校验测试任务」，点击【编辑规则】，点击【添加规则】，选择「有效性校验」，按如下配置：<br>- 字段：info（json）<br>- 统计规则：格式-json格式校验<br>- 校验key：不选择任何key<br>直接点击【保存】按钮 | 保存失败；「校验key」输入框下方显示错误提示「请选择校验key」；规则未被添加到列表 |

#### 结果查询-明细与日志

##### 【P1】验证校验不通过时明细数据下载功能中校验字段标红

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已执行以下 SQL 创建测试表并灌入包含不合规数据的数据：
   CREATE TABLE quality_test_db.json_dl_test (
     id INT,
     payload JSON,
     name VARCHAR(255)
   );
   INSERT INTO quality_test_db.json_dl_test VALUES
     (1, '{"product":{"code":"AB123456","price":"100.00"}}', 'valid'),
     (2, '{"product":{"code":"invalid_code","price":"abc"}}', 'invalid');
3. 已在「通用配置 → json格式校验管理」中维护：
   - key路径「product-code」，中文名称「产品编码」，value格式正则：^[A-Z]{2}\d{6}$
   - key路径「product-price」，中文名称「产品价格」，value格式正则：^\d+\.\d{2}$
4. 已创建规则任务「下载明细测试任务」并关联 quality_test_db.json_dl_test 表
5. 已配置「格式-json格式校验」规则：
   - 字段：payload（json）
   - 校验key：product-code、product-price
   已执行完成，结果为「校验不通过」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「下载明细测试任务」，进入质量报告，点击「格式-json格式校验」规则行操作列的【查看详情】，等待明细弹窗加载 | 明细弹窗打开，显示不符合规则的数据行（id=2的记录） |
| 3 | 在明细弹窗中点击【下载明细数据】按钮，等待文件下载完成 | 文件成功下载：<br>1) 打开下载的 Excel 文件，文件内容包含全部字段列（id、payload、name）<br>2) 「payload」列（校验字段）以红色填充或红色字体标红展示<br>3) 其他字段列正常展示 |

##### 【P1】验证校验通过时不记录明细数据，查看详情入口不显示

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已执行以下 SQL 创建测试表并灌入合规数据：
   CREATE TABLE quality_test_db.json_pass_test (
     id INT,
     info JSON
   );
   INSERT INTO quality_test_db.json_pass_test VALUES
     (1, '{"meta":{"version":"v1.0"}}'),
     (2, '{"meta":{"version":"v2.5"}}');
3. 已在「通用配置 → json格式校验管理」中维护key路径「meta-version」，中文名称「版本号」，value格式正则：^v\d+\.\d+$
4. 已创建规则任务「通过场景测试任务」并关联 quality_test_db.json_pass_test 表
5. 已配置「格式-json格式校验」规则（字段=info，校验key=meta-version）并执行，结果为「校验通过」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「通过场景测试任务」，进入质量报告，找到「格式-json格式校验」规则行，查看「质检结果」列和「操作」列内容 | 1) 「质检结果」列显示「校验通过」<br>2) 「操作」列不显示「查看详情」链接<br>3) 「未通过原因」列显示「--」 |

##### 【P2】验证校验失败时支持查看日志

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已创建规则任务「日志查看测试任务」并关联包含 json 字段的数据表
3. 已配置「格式-json格式校验」规则，且由于数据源连接异常导致任务执行状态为「校验失败」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「日志查看测试任务」（执行状态为「校验失败」），进入质量报告页面，找到「格式-json格式校验」规则对应行，点击「查看日志」操作链接 | 弹出日志查看弹窗，显示本次任务执行的错误日志内容，日志内容包含数据源连接异常的错误描述信息 |

#### 质量报告展示

##### 【P1】验证质量报告中「格式-json格式校验」规则行各列字段展示正确（校验通过场景）

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已在「通用配置 → json格式校验管理」中维护key路径「meta-version」，中文名称「版本号」，value格式正则：^v\d+\.\d+$
3. 已执行以下 SQL 创建测试表并灌入合规数据：
   CREATE TABLE quality_test_db.json_report_pass (
     id INT,
     info JSON
   );
   INSERT INTO quality_test_db.json_report_pass VALUES
     (1, '{"meta":{"version":"v1.0"}}'),
     (2, '{"meta":{"version":"v2.3"}}');
4. 已创建规则任务「报告通过展示任务」并关联 quality_test_db.json_report_pass 表
5. 已配置「格式-json格式校验」规则（字段=info，校验key=meta-version），执行后结果为「校验通过」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「报告通过展示任务」，进入质量报告页面，找到「格式-json格式校验」规则行，逐列核对各字段内容 | 1) 规则类型列=「有效性校验」<br>2) 规则名称列=「格式-json格式校验」<br>3) 字段类型列=「json」<br>4) 质检结果列=「校验通过」<br>5) 未通过原因列=「--」<br>6) 详情说明列=「符合规则key为"meta-version"时的value格式要求」<br>7) 操作列无内容 |

##### 【P1】验证质量报告中「格式-json格式校验」规则行各列字段展示正确（校验不通过场景）

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已在「通用配置 → json格式校验管理」中维护：
   - key路径「log-level」，中文名称「日志级别」，value格式正则：^(INFO|WARN|ERROR)$
   - key路径「log-code」，中文名称「日志编码」，value格式正则：^[A-Z]{3}\d{5}$
3. 已执行以下 SQL 创建测试表并灌入包含不合规数据的数据：
   CREATE TABLE quality_test_db.json_report_fail (
     id INT,
     log_info JSON
   );
   INSERT INTO quality_test_db.json_report_fail VALUES
     (1, '{"log":{"level":"INFO","code":"ERR00001"}}'),
     (2, '{"log":{"level":"DEBUG","code":"invalid"}}');
4. 已创建规则任务「报告不通过展示任务」并关联 quality_test_db.json_report_fail 表
5. 已配置「格式-json格式校验」规则（字段=log_info，校验key=log-level;log-code），执行后结果为「校验不通过」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「报告不通过展示任务」，进入质量报告页面，找到「格式-json格式校验」规则行，逐列核对各字段内容 | 1) 规则类型列=「有效性校验」<br>2) 规则名称列=「格式-json格式校验」<br>3) 字段类型列=「json」<br>4) 质检结果列=「校验不通过」<br>5) 未通过原因列=「key对应value格式校验未通过」<br>6) 详情说明列=「不符合规则key为"log-level;log-code"时的value格式要求」<br>7) 操作列显示「查看详情」链接 |

#### 规则配置参数展示

##### 【P1】验证保存后规则配置参数展示区域各字段内容正确

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已在「通用配置 → json格式校验管理」中维护key路径「device-type」，中文名称「设备类型」，value格式正则：^(mobile|pc|tablet)$
3. 已创建规则任务「参数展示测试任务」并关联包含 json 字段（字段名 device_info，类型 json）的数据表
4. 已配置「格式-json格式校验」规则：
   - 字段：device_info
   - 校验key：device-type
   - 强弱规则：强规则
   并已保存
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「参数展示测试任务」，进入规则配置页面，查看「格式-json格式校验」规则行的参数展示区域 | 规则配置参数展示区域各字段内容如下：<br>1) 规则类型=「字段级」<br>2) 字段=「device_info」<br>3) 统计规则=「格式-json校验」<br>4) 校验key=「device-type」<br>5) 强弱规则=「强规则」 |

#### 数据源兼容性

##### 【P1】验证「格式-json格式校验」规则在Doris 3.x数据源下执行正确

> 前置条件
```
1. 使用 admin 账号登录系统
2. 数据源中心已添加 Doris 3.x 版本数据源「测试数据源_Doris3」并授权给资产平台
3. 已在「通用配置 → json格式校验管理」中维护key路径「item-sku」，中文名称「商品SKU」，value格式正则：^SKU\d{8}$
4. 已执行以下 SQL 创建测试表并灌入数据：
   CREATE TABLE quality_doris3_test.json_sku_test (
     id INT,
     item_info JSON
   ) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES ("replication_num" = "1");
   INSERT INTO quality_doris3_test.json_sku_test VALUES
     (1, '{"item":{"sku":"SKU12345678"}}'),
     (2, '{"item":{"sku":"invalid_sku"}}');
5. 已创建规则任务「Doris3兼容性测试任务」并关联 Doris3 数据源的 json_sku_test 表
6. 已配置「格式-json格式校验」规则：
   - 字段：item_info（json）
   - 校验key：item-sku
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「Doris3兼容性测试任务」，点击【立即执行】按钮，等待任务状态变为「已完成」（最长等待60秒） | 1) 任务执行完成，状态列显示「已完成」<br>2) 质检结果列显示「校验不通过」 |
| 3 | 进入质量报告，点击「格式-json格式校验」规则行的【查看详情】 | 明细列表正确显示 id=2 的不合规记录，「item_info」字段标红展示 |

##### 【P1】验证「格式-json格式校验」规则在SparkThrift 2.x数据源下执行正确

> 前置条件
```
1. 使用 admin 账号登录系统
2. 数据源中心已添加 SparkThrift 2.x 版本数据源「测试数据源_Spark2」并授权给资产平台
3. 已在「通用配置 → json格式校验管理」中维护key路径「event-type」，中文名称「事件类型」，value格式正则：^(click|view|purchase)$
4. 已在 Spark 数据源的 spark_test_db 数据库中创建测试表并灌入数据：
   CREATE TABLE spark_test_db.json_event_test (
     id INT,
     event_data STRING
   );
   INSERT INTO spark_test_db.json_event_test VALUES
     (1, '{"event":{"type":"click"}}'),
     (2, '{"event":{"type":"unknown"}}');
5. 已创建规则任务「Spark2兼容性测试任务」并关联该 Spark 数据源的 json_event_test 表
6. 已配置「格式-json格式校验」规则：
   - 字段：event_data（string）
   - 校验key：event-type
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「Spark2兼容性测试任务」，点击【立即执行】按钮，等待任务状态变为「已完成」（最长等待120秒） | 1) 任务执行完成，状态列显示「已完成」<br>2) 质检结果列显示「校验不通过」（id=2的记录 event.type 值为「unknown」，不符合格式要求） |

##### 【P1】验证「格式-json格式校验」规则在Hive 2.x数据源下执行正确

> 前置条件
```
1. 使用 admin 账号登录系统
2. 数据源中心已添加 Hive 2.x 版本数据源「测试数据源_Hive2」并授权给资产平台
3. 已在「通用配置 → json格式校验管理」中维护key路径「score-value」，中文名称「分数值」，value格式正则：^\d{1,3}$
4. 已在 Hive 数据源的 hive_test_db 数据库中创建测试表并灌入数据：
   CREATE TABLE hive_test_db.json_score_test (
     id INT,
     score_info STRING
   ) ROW FORMAT DELIMITED FIELDS TERMINATED BY ',';
   INSERT INTO hive_test_db.json_score_test VALUES
     (1, '{"score":{"value":"95"}}'),
     (2, '{"score":{"value":"1000"}}');
5. 已创建规则任务「Hive2兼容性测试任务」并关联该 Hive 数据源的 json_score_test 表
6. 已配置「格式-json格式校验」规则：
   - 字段：score_info（string）
   - 校验key：score-value
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「Hive2兼容性测试任务」，点击【立即执行】按钮，等待任务状态变为「已完成」（最长等待120秒） | 1) 任务执行完成，状态列显示「已完成」<br>2) 质检结果列显示「校验不通过」（id=2的记录 score.value 值为「1000」，不符合1-3位整数格式要求） |

#### 弱规则切换

##### 【P2】验证「格式-json格式校验」规则切换为弱规则后校验不通过不影响整体任务状态

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已在「通用配置 → json格式校验管理」中维护key路径「tag-code」，中文名称「标签编码」，value格式正则：^TAG\d{4}$
3. 已执行以下 SQL 创建测试表并灌入包含不合规数据的数据：
   CREATE TABLE quality_test_db.json_weak_test (
     id INT,
     tag_info JSON
   );
   INSERT INTO quality_test_db.json_weak_test VALUES
     (1, '{"tag":{"code":"TAG0001"}}'),
     (2, '{"tag":{"code":"invalid"}}');
4. 已创建规则任务「弱规则测试任务」并关联 quality_test_db.json_weak_test 表
5. 规则任务中同时配置了：
   - 一条强规则：完整性校验（期望通过）
   - 一条弱规则：「格式-json格式校验」（字段=tag_info，校验key=tag-code，强弱规则=弱规则）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「弱规则测试任务」，点击【编辑规则】，确认「格式-json格式校验」规则的「强弱规则」参数已设置为「弱规则」 | 「格式-json格式校验」规则行的「强弱规则」列显示「弱规则」 |
| 3 | 返回规则任务列表，找到「弱规则测试任务」，点击【立即执行】，等待任务执行完成 | 1) 任务执行完成<br>2) 整体任务的最新校验结果列显示「校验通过」（弱规则不通过不影响整体结果）<br>3) 质量报告中「格式-json格式校验」规则行的质检结果列单独显示「校验不通过」 |

#### 大数据量场景

##### 【P1】验证json格式配置中维护上千个key时校验key选择列表加载、筛选和执行校验正常

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已在「通用配置 → json格式校验管理」中维护1200条key，其中：
   - key路径「perf-key-0001」至「perf-key-1000」，中文名称「性能键0001」至「性能键1000」，每条均配置value格式正则：^.+$（共1000条已配置value格式）
   - key路径「perf-novalue-1001」至「perf-novalue-1200」，中文名称「无格式键1001」至「无格式键1200」，未配置value格式（共200条未配置value格式）
3. 已执行以下 SQL 创建测试表并灌入数据：
   CREATE TABLE quality_test_db.json_perf_test (
     id INT,
     big_info JSON
   );
   INSERT INTO quality_test_db.json_perf_test VALUES
     (1, '{"perf":{"key":{"0001":"valid_data"}}}'),
     (2, '{"perf":{"key":{"0001":"also_valid"}}}');
4. 已创建规则任务「大数据量key校验任务」并关联 quality_test_db.json_perf_test 表
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「大数据量key校验任务」，点击【编辑规则】，添加有效性校验规则，按如下配置：<br>- 字段：big_info（json）<br>- 统计规则：格式-json格式校验<br>展开「校验key」下拉框，观察列表加载情况 | 1) 下拉框在3秒内加载完成，无页面卡顿或白屏<br>2) 初始展示前200条key（perf-key-0001 至 perf-key-0200）<br>3) 未配置value格式的key（perf-novalue-1001 至 perf-novalue-1200）不在可选列表中显示 |
| 3 | 在搜索框中输入「perf-key-0999」进行搜索 | 搜索结果中显示「perf-key-0999」，可正常选中 |
| 4 | 清空搜索框，在搜索框中输入「perf-novalue-1100」进行搜索 | 搜索结果为空，不显示该key（因为未配置value格式） |
| 5 | 清空搜索框，勾选「perf-key-0001」和「perf-key-0002」，点击【保存】 | 规则保存成功，「校验key」列回显「perf-key-0001;perf-key-0002」 |
| 6 | 返回规则任务列表，找到「大数据量key校验任务」，点击【立即执行】按钮，等待任务状态变为「已完成」（最长等待60秒） | 任务执行完成，状态列显示「已完成」，质检结果列正常展示校验结果 |

#### key删除后关联影响

##### 【P1】验证删除已被有效性规则引用的key后规则配置页面回显和编辑功能正常

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已在「通用配置 → json格式校验管理」中维护以下key：
   - key路径「del-key-a」，中文名称「待删除键A」，value格式正则：^[A-Z]+$
   - key路径「del-key-b」，中文名称「待删除键B」，value格式正则：^\d+$
3. 已执行以下 SQL 创建测试表并灌入数据：
   CREATE TABLE quality_test_db.json_del_test (
     id INT,
     del_info JSON
   );
   INSERT INTO quality_test_db.json_del_test VALUES
     (1, '{"del":{"key":{"a":"ABC","b":"123"}}}');
4. 已创建规则任务「key删除影响测试任务」并关联 quality_test_db.json_del_test 表
5. 已配置「格式-json格式校验」规则：
   - 字段：del_info（json）
   - 校验key：del-key-a、del-key-b
   并已保存
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【通用配置 → json格式校验管理】页面，等待列表加载完成 | json格式校验管理页面正常加载，列表中显示「del-key-a」和「del-key-b」 |
| 2 | 找到「del-key-a」行，点击操作列的【删除】按钮，在确认弹窗中点击【确定】，等待删除完成 | 删除成功，列表中不再显示「del-key-a」，仅保留「del-key-b」 |
| 3 | 进入【数据质量 → 规则任务管理】页面，找到「key删除影响测试任务」，点击【编辑规则】，查看「格式-json格式校验」规则行的「校验key」回显内容 | 规则配置页面正常加载，「校验key」列回显内容中「del-key-a」已移除或标记为无效，「del-key-b」正常显示 |
| 4 | 点击该规则行的【编辑】按钮，展开「校验key」下拉框 | 下拉框正常打开，列表中不再显示已删除的「del-key-a」，「del-key-b」显示为已勾选状态 |
| 5 | 点击【保存】按钮 | 规则保存成功，「校验key」列回显「del-key-b」 |

##### 【P1】验证删除已被规则引用的key后value格式预览弹窗和执行校验任务正常

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已在「通用配置 → json格式校验管理」中维护以下key：
   - key路径「preview-key-x」，中文名称「预览键X」，value格式正则：^[0-9]+$
   - key路径「preview-key-y」，中文名称「预览键Y」，value格式正则：^[a-z]+$
3. 已执行以下 SQL 创建测试表并灌入数据：
   CREATE TABLE quality_test_db.json_preview_del (
     id INT,
     preview_info JSON
   );
   INSERT INTO quality_test_db.json_preview_del VALUES
     (1, '{"preview":{"key":{"x":"123","y":"abc"}}}'),
     (2, '{"preview":{"key":{"x":"456","y":"def"}}}');
4. 已创建规则任务「key删除预览测试任务」并关联 quality_test_db.json_preview_del 表
5. 已配置「格式-json格式校验」规则：
   - 字段：preview_info（json）
   - 校验key：preview-key-x、preview-key-y
   并已保存
6. 已在「通用配置 → json格式校验管理」中删除「preview-key-x」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「key删除预览测试任务」，点击【编辑规则】，找到「格式-json格式校验」规则行，点击「value格式预览」按钮，等待弹窗加载 | 弹窗正常打开，仅展示「preview-key-y」的格式信息，已删除的「preview-key-x」不在列表中 |
| 3 | 关闭弹窗，返回规则任务列表，找到「key删除预览测试任务」，点击【立即执行】按钮，等待任务执行完成（最长等待60秒） | 质量任务正常执行完成，状态列显示「已完成」，质量任务不受已删除key的影响 |

#### 抽样场景

##### 【P1】验证配置格式-json格式校验规则时结合抽样功能执行校验结果正确

> 前置条件
```
1. 使用 admin 账号登录系统
2. 已在「通用配置 → json格式校验管理」中维护key路径「sample-code」，中文名称「样本编码」，value格式正则：^S\d{6}$
3. 已执行以下 SQL 创建测试表并灌入20条数据：
   CREATE TABLE quality_test_db.json_sample_test (
     id INT,
     sample_info JSON
   );
   INSERT INTO quality_test_db.json_sample_test VALUES
     (1, '{"sample":{"code":"S000001"}}'),
     (2, '{"sample":{"code":"S000002"}}'),
     (3, '{"sample":{"code":"S000003"}}'),
     (4, '{"sample":{"code":"S000004"}}'),
     (5, '{"sample":{"code":"S000005"}}'),
     (6, '{"sample":{"code":"S000006"}}'),
     (7, '{"sample":{"code":"S000007"}}'),
     (8, '{"sample":{"code":"S000008"}}'),
     (9, '{"sample":{"code":"S000009"}}'),
     (10, '{"sample":{"code":"S000010"}}'),
     (11, '{"sample":{"code":"invalid1"}}'),
     (12, '{"sample":{"code":"invalid2"}}'),
     (13, '{"sample":{"code":"S000013"}}'),
     (14, '{"sample":{"code":"S000014"}}'),
     (15, '{"sample":{"code":"S000015"}}'),
     (16, '{"sample":{"code":"S000016"}}'),
     (17, '{"sample":{"code":"S000017"}}'),
     (18, '{"sample":{"code":"S000018"}}'),
     (19, '{"sample":{"code":"S000019"}}'),
     (20, '{"sample":{"code":"S000020"}}');
4. 已创建规则任务「抽样校验测试任务」并关联 quality_test_db.json_sample_test 表
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「抽样校验测试任务」，点击【编辑规则】，添加有效性校验规则，按如下配置：<br>- 字段：sample_info（json）<br>- 统计规则：格式-json格式校验<br>- 校验key：勾选「sample-code」<br>- 抽样方式：随机抽样<br>- 抽样比例：50%<br>点击【保存】按钮 | 规则保存成功，规则行显示抽样比例为50% |
| 3 | 返回规则任务列表，找到「抽样校验测试任务」，点击【立即执行】按钮，等待任务执行完成（最长等待60秒） | 任务执行完成，状态列显示「已完成」，质检结果正常展示（根据抽样到的数据判定通过或不通过） |
| 4 | 进入质量报告，查看「格式-json格式校验」规则行的详情说明列 | 详情说明列展示校验信息，质量报告中显示本次校验基于抽样数据执行 |

#### 分区场景

##### 【P1】验证对分区表配置格式-json格式校验规则后指定分区下的数据校验正确

> 前置条件
```
1. 使用 admin 账号登录系统
2. 数据源中心已添加 Hive 2.x 版本数据源「测试数据源_Hive2」并授权给资产平台
3. 已在「通用配置 → json格式校验管理」中维护key路径「part-code」，中文名称「分区编码」，value格式正则：^P\d{4}$
4. 已在 Hive 数据源的 hive_test_db 数据库中创建分区表并灌入数据：
   CREATE TABLE hive_test_db.json_partition_test (
     id INT,
     part_info STRING
   ) PARTITIONED BY (dt STRING)
   ROW FORMAT DELIMITED FIELDS TERMINATED BY ',';
   ALTER TABLE hive_test_db.json_partition_test ADD PARTITION (dt='2026-04-01');
   ALTER TABLE hive_test_db.json_partition_test ADD PARTITION (dt='2026-04-02');
   INSERT INTO hive_test_db.json_partition_test PARTITION (dt='2026-04-01') VALUES
     (1, '{"part":{"code":"P0001"}}'),
     (2, '{"part":{"code":"invalid"}}');
   INSERT INTO hive_test_db.json_partition_test PARTITION (dt='2026-04-02') VALUES
     (3, '{"part":{"code":"P0003"}}'),
     (4, '{"part":{"code":"P0004"}}');
5. 已创建规则任务「分区校验测试任务」并关联 hive_test_db.json_partition_test 表
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ------------ | ------------ |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载，页面无报错 |
| 2 | 找到「分区校验测试任务」，点击【编辑规则】，添加有效性校验规则，按如下配置：<br>- 字段：part_info（string）<br>- 统计规则：格式-json格式校验<br>- 校验key：勾选「part-code」<br>- 过滤条件：分区字段 dt = '2026-04-01'<br>点击【保存】按钮 | 规则保存成功，规则行显示过滤条件为 dt='2026-04-01' |
| 3 | 返回规则任务列表，找到「分区校验测试任务」，点击【立即执行】按钮，等待任务执行完成（最长等待120秒） | 1) 任务执行完成，状态列显示「已完成」<br>2) 质检结果列显示「校验不通过」（仅校验 dt='2026-04-01' 分区，id=2的记录不符合格式要求） |
| 4 | 进入质量报告，点击「格式-json格式校验」规则行的【查看详情】，查看明细数据 | 1) 明细列表仅显示 dt='2026-04-01' 分区内不符合规则的记录（id=2）<br>2) dt='2026-04-02' 分区的数据（id=3、id=4）不在明细中 |