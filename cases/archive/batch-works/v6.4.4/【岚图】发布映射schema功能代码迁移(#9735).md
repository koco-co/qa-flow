---
name: "【岚图】发布映射schema功能代码迁移(#9735)（XMind）"
description: "【岚图】发布映射schema功能代码迁移(#9735)（XMind）"
tags:
  - 离线开发
  - 数据同步Source和Sink端数据源相同
  - 数据同步Source和Sink端数据源不同
  - 岚图
  - 发布映射schema功能代码迁移
module: batch-works
version: v6.4.4
source: zentao-cases/XMind/离线开发/202512-离线开发v6.4.4.xmind
created_at: 2026-03-29
origin: xmind
---
# 【岚图】发布映射schema功能代码迁移(#9735)（XMind）
> 来源：zentao-cases/XMind/离线开发/202512-离线开发v6.4.4.xmind

---

### 验证新增Schema映射配置功能
#### 进入离线开发-项目A-数据源，点击数据源doris的映射配置按钮
- 1）弹出映射配置弹窗：下方新增Schema映射
2）schema映射列表展示暂无数据，有本项目schema、目标项目schema、操作三个字段，和新增按钮
#### 点击ftp映射配置按钮，查看是否新增schema映射配置
- 未新增该字段

### 验证Schema映射配置非必填功能
#### 进入离线开发-项目A-数据源，点击数据源doris的映射配置按钮
- 1）弹出映射配置弹窗
#### 不点击新增按钮，直接点击确定
- 保存成功
#### 点击新增按钮，不填写内容，点击保存
- 提示不能为空
#### 点击新增按钮，添加多行，不填写内容，点击保存
- 提示不能为空
#### 只选择本项目schema/目标项目schema，另一个为空，点击确定
- 另一个选择框提示不能为空

### 验证非Meta数据源-Schema下拉框数据正常
#### 进入离线开发-项目A-数据源，点击非meta数据源doris1的映射配置按钮
- 弹出映射配置弹窗
#### 查看本项目schema下拉框
- 返回doris1数据源下的所有schema
#### 发布目标选择非meta数据源doris1，查看目标项目schema下拉框
- 返回doris1数据源下的所有schema
#### 目标项目schema选择schameA，然后切换发布目标，查看目标项目schema回填
- 回填清空
#### 两个下拉框分别模糊搜索test
- 结果正确

### 验证Meta数据源-Schema下拉框数据正确(配置项=true)
#### 进入离线开发-项目A-数据源，点击dorisA1的映射配置按钮, 查看本项目schema下拉框
- 1）弹出映射配置弹窗
2）返回dorisA1数据源下的所有schema
#### 点击dorisA2的映射配置按钮，查看本项目schema下拉框
- 返回dorisA2数据源下的所有schema
#### 点击dorisA3的映射配置按钮，查看本项目schema下拉框
- 返回dorisA3数据源下的所有schema
#### 发布目标选择meta数据源dorisB1，查看目标项目schema下拉框
- 返回dorisB1数据源下的所有schema
#### 发布目标选择meta数据源dorisB2，查看目标项目schema下拉框
- 返回dorisB2数据源下的所有schema
#### 发布目标选择meta数据源dorisB3，查看目标项目schema下拉框
- 返回dorisB3数据源下的所有schema

### 验证Meta数据源-Schema下拉框数据正确(配置项=false)
#### 进入离线开发-项目A-数据源，点击dorisA1的映射配置按钮, 查看本项目schema下拉框
- 1）弹出映射配置弹窗
2）返回dorisA1的默认Schema（数据源列表连接信息中的schema）
#### 点击dorisA2的映射配置按钮，查看本项目schema下拉框
- 返回dorisA2的默认Schema（数据源列表连接信息中的schema）
#### 点击dorisA3的映射配置按钮，查看本项目schema下拉框
- 展示该数据源下的所有schema
#### 发布目标选择meta数据源dorisB1，查看目标项目schema下拉框
- 返回dorisB1的默认Schema（数据源列表连接信息中的schema）
#### 发布目标选择meta数据源dorisB2，查看目标项目schema下拉框
- 返回dorisB2的默认Schema（数据源列表连接信息中的schema）
#### 发布目标选择meta数据源dorisB3，查看目标项目schema下拉框
- 发布目标选择meta数据源dorisB3，查看目标项目schema下拉框

### 验证配置一行Schema功能正常
#### 进入离线开发-项目A-数据源，点击doris1的映射配置按钮, 发布目标选择doris2，查看目标项目schema下拉框
- 1）弹出映射配置弹窗
2）返回doris2数据源下的所有schema
#### 本项目schema选择schemaA，目标项目schema选择schemaA，点击确定
- 保存成功
#### 点击映射配置查看展示
- 回填正确
#### 目标项目schema选择schemaB，点击确定
- 保存成功

### 验证配置多行Schema功能正常
#### 进入离线开发-项目A-数据源，点击doris1的映射配置按钮, 发布目标选择doris2，查看目标项目schema下拉框
- 1）弹出映射配置弹窗
2）返回doris2数据源下的所有schema
#### 本项目schema选择schemaA，目标项目schema选择schemaA
- 选择成功
#### 点击+按钮
- 下方添加一行schema配置
#### 查看新增行的本项目schema和目标项目schema
- 1）本项目schema中，schemaA不允许选择
2）目标项目schema中，所有schema都允许选择
#### 选择schemaB-schemaA
- 选择成功
#### 点击+按钮，查看新增行的本项目schema和目标项目schema
- 1）本项目schema中，schemaA、schemaB不允许选择
2）目标项目schema中，所有schema都允许选择
#### 配置多行，点击确定
- 保存成功
#### 点击映射配置，查看展示
- 回填数据正确, 上限20

### 验证删除行按钮功能正常
#### 进入离线开发-项目A-数据源，点击doris1的映射配置按钮, 发布目标选择doris2，查看目标项目schema下拉框
- 1）弹出映射配置弹窗
2）返回doris2数据源下的所有schema
#### 添加多行配置：schemaA-schemaA
schemaB-schemaB
schemC-schemaC
schemaD-schemaD
schemaE-schemaE
- 添加成功，每一行后边都有增加和删除按钮
#### 删除第一行
- 删除成功：schemaB-schemaB
schemC-schemaC
schemaD-schemaD
schemaE-schemaE
#### 删除第二行
- 删除成功：schemaB-schemaB
schemaD-schemaD
schemaE-schemaE
#### 删除最后一行
- 删除成功：schemaB-schemaB
schemaD-schemaD
#### 删除所有
- 允许删除

### 数据同步Source和Sink端数据源相同 ❯
#### 验证Doris2Doris任务一键发布功能正常(映射数据源相同, 无Schema映射, 配置项=true)
##### 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务
  - 提交成功
##### 进入发布任务页面，打包doris2doris
  - 打包成功
##### 进入发布至目标项目页面，点击发布
  - 弹出校验弹窗，校验都通过
##### 点击确定
  - 发布成功
##### 查看项目B中doris2doirs任务
  - 任务数据源回填dorisB，schema和table回填与步骤一中一致
##### 临时运行任务，查看结果
  - 运行成功，写入数据正确
#### 验证Doris2Doris任务一键发布功能正常(映射数据源相同, 无Schema映射, 配置项=false)
##### 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamA-table2保存提交任务
  - 提交成功
##### 进入发布任务页面，打包doris2doris
  - 打包成功
##### 进入发布至目标项目页面，点击发布
  - 弹出校验弹窗，校验都通过
##### 点击确定
  - 发布成功
##### 查看项目B中doris2doirs任务
  - 任务数据源回填dorisB，schema和table回填与步骤一中一致
##### 点击上一步，进入source端
  - 报错schema不存在
#### 验证Doris2Doris任务一键发布功能正常(映射数据源不同, 无Schema映射)
##### 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务
  - 提交成功
##### 进入发布任务页面，打包doris2doris
  - 打包成功
##### 进入发布至目标项目页面，点击发布
  - 弹出校验弹窗，校验都通过
##### 点击确定
  - 发布成功
##### 查看项目B中doris2doirs任务
  - 任务数据源回填doris1，schema和table回填与步骤一中一致
##### 点击上一步，进入source端和sink端
  - 1）source端不报错2）sink端报错schema不存在
#### 验证Doris2Doris任务一键发布功能正常(映射数据源相同, 一对一Schema映射)
##### 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务
  - 提交成功
##### 进入发布任务页面，打包doris2doris
  - 打包成功
##### 进入发布至目标项目页面，点击发布
  - 弹出校验弹窗，校验都通过
##### 点击确定
  - 发布成功
##### 查看项目B中doris2doirs任务
  - 1）任务数据源回填dorisB2）source端：dorisB-schemaB-table13)sink端：dorisB-schemaA-table2
##### 映射schema下表不存在，运行任务，查看结果
  - 运行报错，表不存在
##### 映射schema下创建对应表，临时运行，查看结果
  - 运行成功，schemaA-table2中写入scheamB-table1数据，写入正确
#### 验证Doris2Doris任务一键发布功能正常(映射数据源不同, 一对一Schema映射)
##### 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务
  - 提交成功
##### 进入发布任务页面，打包doris2doris
  - 打包成功
##### 进入发布至目标项目页面，点击发布
  - 弹出校验弹窗，校验都通过
##### 点击确定
  - 发布成功
##### 查看项目B中doris2doirs任务
  - 1）任务数据源回填doris1
2）source端：doris1-schema1-table1
3)sink端：doris1-schema2-table2
##### 映射schema下表不存在，运行任务，查看结果
  - 运行报错，表不存在
##### 映射schema下创建对应表，临时运行，查看结果
  - 运行成功，schemaA-table2中写入scheamB-table1数据，写入正确
#### 验证Doris2Doris任务一键发布功能正常(映射数据源相同, 多对一Schema映射)
##### 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务
  - 提交成功
##### 进入发布任务页面，打包doris2doris
  - 打包成功
##### 进入发布至目标项目页面，点击发布
  - 弹出校验弹窗，校验都通过
##### 点击确定
  - 发布成功
##### 查看项目B中doris2doirs任务
  - 1）任务数据源回填dorisB
2）source端：dorisB-schemaB-table1
3)sink端：dorisB-schemaB-table2
##### schemaB下不存在表table1，运行任务，查看结果
  - 运行报错，表不存在
##### schemaB下创建表table1，然后临时运行，查看结果
  - 运行成功，写入数据正确
#### 验证Doris2Doris任务一键发布功能正常(映射数据源不同, 多对一Schema映射)
##### 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务
  - 提交成功
##### 进入发布任务页面，打包doris2doris
  - 打包成功
##### 进入发布至目标项目页面，点击发布
  - 弹出校验弹窗，校验都通过
##### 点击确定
  - 发布成功
##### 查看项目B中doris2doirs任务
  - 1）任务数据源回填doris1
2）source端：doris1-schema1-table1
3)sink端：doris1-schema1-table2
##### 映射schema下表不存在，运行任务，查看结果
  - 运行报错，表不存在
##### 映射schema下创建对应表，临时运行，查看结果
  - 运行成功，schemaA-table2中写入scheamB-table1数据，写入正确
#### 验证Doris2Doris多任务一键发布功能正常(映射数据源相同, 多对一Schema映射)
##### 1）进入离线开发-项目A，创建数据同步任务doris2dorisA：source：dorisA-schemaA-table1sink:dorisA-scheamA-table2保存提交任务
2）进入离线开发-项目A，创建数据同步任务doris2dorisB：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务
3）进入离线开发-项目A，创建数据同步任务doris2dorisC：source：dorisA-schemaC-table1sink:dorisA-scheamD-table2保存提交任务
  - 提交成功
##### 进入发布任务页面，打包doris2dorisA、doris2dorisB、doris2dorisC
  - 打包成功
##### 进入发布至目标项目页面，点击发布
  - 弹出校验弹窗，校验都通过
##### 点击确定
  - 发布成功
##### 查看项目B中doris2doirsA、B、C任务
  - 1）doris2dorisA：source端：dorisB-schemaB-table1；sink端：dorisB-schemaB-table2
2）doris2dorisB：source端：dorisB-schemaB-table1；sink端：dorisB-schemaB-table2
3）doris2dorisC：source端：dorisB-schemaA-table1；sink端：dorisB-schemaD-table2
##### 运行任务，查看结果
  - 如果scheam下表不存在，就报错表不存在
##### 创建表后，临时运行，查看结果
  - 运行成功，写入数据正确
#### 验证Doris2Doris多任务一键发布功能正常(映射数据源不同, 多对一Schema映射)
##### 1）进入离线开发-项目A，创建数据同步任务doris2dorisA：source：dorisA-schemaA-table1sink:dorisA-scheamA-table2保存提交任务
2）进入离线开发-项目A，创建数据同步任务doris2dorisB：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务
3）进入离线开发-项目A，创建数据同步任务doris2dorisC：source：dorisA-schemaC-table1sink:dorisA-scheamD-table2保存提交任务
  - 提交成功
##### 进入发布任务页面，打包doris2dorisA、doris2dorisB、doris2dorisC
  - 打包成功
##### 进入发布至目标项目页面，点击发布
  - 弹出校验弹窗，校验都通过
##### 点击确定
  - 发布成功
##### 查看项目B中doris2doirsA、B、C任务
  - 1）doris2dorisA：source端：doris1-schema2-table1；sink端：doris1-schema2-table2
2）doris2dorisB：source端：doris1-schema2-table1；sink端：doris1-schema2-table2
3）doris2dorisC：source端：doris1-schema1-table1；sink端：doris1-schemaD-table2
##### doris2dorisC点击上一步，进入sink端
  - 报错scheamD不存在
##### 映射schema下表不存在，运行任务A、B，查看结果
  - 运行报错，表不存在
##### 映射schema下创建对应表，临时运行A、B，查看结果
  - 运行成功，schemaA-table2中写入scheamB-table1数据，写入正确
#### 验证Doris2Doris任务导入导出发布功能正常(映射数据源相同, 多对一Schema映射)
##### 进入离线开发-项目A，创建doris2doris数据同步任务：source：doris1-schema1-table1sink:doris1-scheam2-table2保存提交任务
  - 提交成功
##### 进入发布任务页面，打包doris2doris
  - 打包成功
##### 进入发布至目标项目，导出发布包
  - 导出成功
##### 进入项目C发布页面-发布至本项目，上传发布包
  - 上传成功
##### 点击发布
  - 弹出校验弹窗
##### 数据源映射选择dprisB，点击发布
  - 发布成功
##### 查看项目C中doris2doirs任务
  - 任务数据源回填dorisB，source端schema回填schema1，sink端回填schema2

### 数据同步Source和Sink端数据源不同 ❯
#### 验证Doris2Doris任务一键发布功能正常(映射数据源相同, 无Schema映射, 配置项=true)
##### 进入离线开发-项目A，创建doris2doris数据同步任务：
source：dorisA-schemaA-table1
sink:doris1-scheam1-table2
保存提交任务
  - 提交成功
##### 进入发布任务页面，打包doris2doris
  - 打包成功
##### 进入发布至目标项目页面，点击发布
  - 弹出校验弹窗，校验都通过
##### 点击确定
  - 发布成功
##### 查看项目B中doris2doirs任务
  - 1）source端：dorisB-schemaA-table1
2）sink端：dorisA-schema1-table2
##### 点击上一步，进入sink端
  - 如果dorisA下schema1不存在，报错schema1不存在，反之不报错
##### 不报错，映射schema下表不存在，临时运行
  - 报错表不存在
##### 创建表后运行
  - 结果正确，写入数据正确
#### 验证Doris2Doris任务一键发布功能正常(映射数据源不同, 无Schema映射, 配置项=false)
##### 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:doris1-scheam1-table2保存提交任务
  - 提交成功
##### 进入发布任务页面，打包doris2doris
  - 打包成功
##### 进入发布至目标项目页面，点击发布
  - 弹出校验弹窗，校验都通过
##### 点击确定
  - 发布成功
##### 查看项目B中doris2doirs任务
  - 1）source端：dorisB-schemaA-table1
2）sink端：dorisA-schema1-table2
##### 点击上一步，进入source端
  - 报错schemaA不存在
#### 验证Doris2Doris任务一键发布功能正常(映射数据源不同, 一对一Schema映射)
##### 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:doris1-scheam1-table2保存提交任务
  - 提交成功
##### 进入发布任务页面，打包doris2doris
  - 打包成功
##### 进入发布至目标项目页面，点击发布
  - 弹出校验弹窗，校验都通过
##### 点击确定
  - 发布成功
##### 查看项目B中doris2doirs任务
  - 1）任务数据源回填dorisB
2）source端：dorisB-schemaB-table1
3)sink端：dorisA-schemaA-table2
##### 映射schema下表不存在，运行任务，查看结果
  - 运行报错，表不存在
##### 映射schema下创建对应表，临时运行，查看结果
  - 运行成功，数据写入正确
#### 验证Doris2Doris任务一键发布功能正常(映射数据源不同, 多对一Schema映射)
##### 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:doris1-scheam1-table2保存提交任务
  - 提交成功
##### 进入发布任务页面，打包doris2doris
  - 打包成功
##### 进入发布至目标项目页面，点击发布
  - 弹出校验弹窗，校验都通过
##### 点击确定
  - 发布成功
##### 查看项目B中doris2doirs任务
  - 1）任务数据源回填dorisB
2）source端：dorisB-schemaB-table1
3)sink端：dorisB-schemaA-table2
##### schemaB下不存在表table1，运行任务，查看结果
  - 运行报错，表不存在
##### schemaB下创建表table1，然后临时运行，查看结果
  - 运行成功，写入数据正确
#### 验证Doris2Doris多任务一键发布功能正常(映射数据源不同, 多对一Schema映射)
##### 1）进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:doris1-scheam1-table2保存提交任务
2）进入离线开发-项目A，创建数据同步任务doris2dorisB：source：dorisA-schemaC-table1sink:doris1-scheam2-table2保存提交任务
3）进入离线开发-项目A，创建数据同步任务doris2dorisC：source：doris1-schema3-table1sink:dorisA-scheamD-table2保存提交任务
  - 提交成功
##### 进入发布任务页面，打包doris2dorisA、doris2dorisB、doris2dorisC
  - 打包成功
##### 进入发布至目标项目页面，点击发布
  - 弹出校验弹窗，校验都通过
##### 点击确定
  - 发布成功
##### 查看项目B中doris2doirsA、B、C任务
  - 1）doris2dorisA：source端：dorisB-schemaB-table1；sink端：dorisA-schemaA-table2
2）doris2dorisB：source端：dorisB-schemaB-table1；sink端：dorisA-schemaA-table2
3）doris2dorisC：source端：dorisA-schema3-table1；sink端：dorisB-schemaD-table2
##### 查看doris2dorisC，点击上一步，进入source端和sink端
  - source端报错schema3不存在
##### 运行任务A、B，查看结果
  - 如果scheam下表不存在，就报错表不存在
##### 如果scheam下表不存在，就报错表不存在
  - 运行成功，写入数据正确
#### 验证Hive2StarRocks任务一键发布功能正常(映射数据源: Hive相同、SR相同, 无Schema映射, 配置项=true)
##### 进入离线开发-Project01，创建数据同步任务: hive2sr_01, 配置如下:
source端: hiveA-schemaA-table1
sink端: srA-scheamB-table2
其它配置项正常填写, 保存后提交任务
  - 提交成功
##### 进入发布任务页面，打包hive2sr_01
  - 打包成功
##### 进入发布至目标项目页面，点击发布
  - 弹出校验弹窗，校验都通过
##### 点击确定
  - 发布成功
##### 查看项目B中hive2sr_01任务
  - 1) source端: hiveA-schemaA-table1
2) sink端: srA-scheamB-table2
##### 点击上一步，进入sink端
  - 如果srA下schemaB不存在，报错schemaB不存在，反之不报错
##### 不报错，映射schema下表不存在，临时运行
  - 报错表不存在
##### 创建表后运行
  - 结果正确，写入数据正确
#### 验证Hive2StarRocks任务一键发布功能正常(映射数据源: Hive不同、SR不同, 无Schema映射, 配置项=false)
##### 进入离线开发-Project03，创建数据同步任务: hive2sr_01, 配置如下:
source端: hiveA-schemaA-table1
sink端: srA-scheamA-table2
其它配置项正常填写, 保存后提交任务
  - 提交成功
##### 进入发布任务页面，打包hive2sr
  - 打包成功
##### 进入发布至目标项目页面，点击发布
  - 弹出校验弹窗，校验都通过
##### 点击确定
  - 发布成功
##### 查看项目B中hive2sr任务
  - 1）source端：hiveB-schemaA-table1
2）sink端：srB-schema1-table2
##### 点击上一步，进入source端
  - 报错schemaA不存在
#### 验证Hive2StarRocks任务一键发布功能正常(映射数据源: Hive不同、SR不同, 一对一Schema映射)
##### 进入离线开发-项目A，创建Hive2StarRocks数据同步任务：
source端：hiveA(meta)-schemaA-table1
sink端: srA(meta)-scheamA-table2
保存提交任务
  - 提交成功
##### 进入发布任务页面，打包Hive2StarRocks
  - 打包成功
##### 进入发布至目标项目页面，点击发布
  - 弹出校验弹窗，校验通过
##### 点击确定
  - 发布成功
##### 查看项目B中Hive2StarRocks任务
  - 1) source端：hiveB(meta)-schemaA-table1
2) sink端: srB(非meta)-scheamA-table2
##### 点击上一步，进入sink端
  - 如果srB下schemaA不存在，报错schemaA不存在，反之不报错
##### 不报错，映射schema下表不存在，临时运行
  - 报错表不存在
##### 创建表后运行
  - 结果正确，写入数据正确
#### 验证Hive2StarRocks任务一键发布功能正常(映射数据源: Hive相同、SR不同, 多对一Schema映射)
##### 进入离线开发-项目A，创建hive2sr数据同步任务：
source：hiveA-schemaA-table1
sink: srA-scheam1-table2
保存提交任务
  - 提交成功
##### 进入发布任务页面，打包hive2sr
  - 打包成功
##### 进入发布至目标项目页面，点击发布
  - 弹出校验弹窗，校验都通过
##### 点击确定
  - 发布成功
##### 查看项目B中hive2sr任务
  - 1）source端：hiveA-schemaB-table1
2)sink端：srB-schemaA-table2
##### sr-schemaA下不存在表table1，运行任务，查看结果
  - 运行报错，表不存在
##### schemaA下创建表table1，然后临时运行，查看结果
  - 运行成功，写入数据正确
#### 验证Hive2StarRocks多任务一键发布功能正常(映射数据源: Hive不同、SR不同, 多对一Schema映射)
##### 1）进入离线开发-项目A，创建doris2doris数据同步任务：
source：hiveA-schemaA-table1
sink:srA-scheam1-table2
保存提交任务
2）进入离线开发-项目A，创建数据同步任务doris2dorisB：
source：hiveA-schemaC-table1
sink:srA-scheam2-table2
保存提交任务
3）进入离线开发-项目A，创建数据同步任务doris2dorisC：
source：hiveA-schema3-table1
sink:srA-scheamD-table2
保存提交任务
  - 提交成功
##### 进入发布任务页面，打包doris2dorisA、doris2dorisB、doris2dorisC
  - 打包成功
##### 进入发布至目标项目页面，点击发布
  - 弹出校验弹窗，校验都通过
##### 点击确定
  - 发布成功
##### 查看项目B中hive2srA、B、C任务
  - 1）hive2srA：source端：hiveB-schemaB-table1；sink端：srA-schemaA-table2
2）hive2srB：source端：hiveB-schemaB-table1；sink端：srA-schemaA-table2
3）hive2srC：source端：hiveB-schema3-table1；sink端：srA-schemaD-table2
##### 查看hive2srC，点击上一步，进入source端和sink端
  - source端报错schema3不存在
##### 运行任务A、B，查看结果
  - 如果scheam下表不存在，就报错表不存在
##### 如果scheam下表不存在，就报错表不存在
  - 运行成功，写入数据正确

