---
name: 【产品交付】发布映射替换schema功能代码迁移 v6.4.4
description: 【产品交付】发布映射替换schema功能代码迁移 v6.4.4
tags:
  - 离线开发
  - 离线开发-项目管理-发布管理
  - 产品交付
  - 发布映射替换schema功能代码迁移
module: batch-works
version: v6.4.4
source: zentao-cases/dtstack-platform/离线开发/archive-cases/v6.4.4/【产品交付】发布映射替换schema功能代码迁移.csv
case_count: 28
created_at: 2026-03-29
origin: csv
---
# 【产品交付】发布映射替换schema功能代码迁移 v6.4.4
> 来源：zentao-cases/dtstack-platform/离线开发/archive-cases/v6.4.4/【产品交付】发布映射替换schema功能代码迁移.csv
> 用例数：28

---

## 离线开发-项目管理-发布管理

##### 验证Hive2StarRocks多任务一键发布功能正常(映射数据源: Hive不同、SR不同, 多对一Schema映射) 「P1」

> 前置条件
```
1、项目A绑定项目B为发布目标

2、项目A引入hiveA(meta), srA(非meta)
项目B引入hiveB(meta) , srB(非meta)

3、配置数据源映射关系:
hiveA(meta) > hiveB(meta)
srA(meta)  ❯ srB(非meta)

4、Schema映射关系:
配置多对多的映射关系
hive:
schemaA > SchemaB
SchemaC > SchemaB
Schema3 不配置

sr:
schema1 > schemaA
schema2 > schemaA
schemaD 不配置

5、添加离线配置项default.data.source.show.all.schema = true
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务 | 成功进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务页面，页面内容正常加载显示，无报错 |
| 2 | 1）进入离线开发-项目A，创建doris2doris数据同步任务：source：hiveA-schemaA-table1sink:srA-scheam1-table2保存提交任务2）进入离线开发-项目A，创建数据同步任务doris2dorisB：source：hiveA-schemaC-table1sink:srA-scheam2-table2保存提交任务3）进入离线开发-项目A，创建数据同步任务doris2dorisC：source：hiveA-schema3-table1sink:srA-scheamD-table2保存提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 3 | 进入发布任务页面，打包doris2dorisA、doris2dorisB、doris2dorisC | 打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 4 | 进入发布至目标项目页面，点击发布 | 弹出校验弹窗，校验都通过 |
| 5 | 点击确定 | 系统提示发布成功，发布状态更新，相关页面可访问 |
| 6 | 查看项目B中hive2srA、B、C任务 | 1）hive2srA：source端：hiveB-schemaB-table1；sink端：srA-schemaA-table22）hive2srB：source端：hiveB-schemaB-table1；sink端：srA-schemaA-table23）hive2srC：source端：hiveB-schema3-table1；sink端：srA-schemaD-table2 |
| 7 | 查看hive2srC，点击上一步，进入source端和sink端 | source端报错schema3不存在 |
| 8 | 运行任务A、B，查看结果 | 如果scheam下表不存在，就报错表不存在 |
| 9 | 如果scheam下表不存在，就报错表不存在 | 运行成功，写入数据正确，内容与预期完全一致，无异常或错误 |

##### 验证Hive2StarRocks任务一键发布功能正常(映射数据源: Hive相同、SR不同, 多对一Schema映射) 「P1」

> 前置条件
```
1、添加离线配置项
default.data.source.show.all.schema = true

2、存在项目: ProjectA、B
ProjectA引入hiveA(meta), srA(meta)
ProjectB引入hiveA(meta), srB(meta)
Project01 (测试项目) > Project02(生产项目)

3、数据源映射关系如下:
hiveA(meta) > hiveA(meta)
srA(meta)  ❯ srB(meta)

4、Schema映射关系:
hive
schemaA-schemaB

sr
schema1-schemaA
schema2-schemaA
schemaC-schemaB
schemaD未配置
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A，创建hive2sr数据同步任务：source：hiveA-schemaA-table1sink: srA-scheam1-table2保存提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 2 | 进入发布任务页面，打包hive2sr | 打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入发布至目标项目页面，点击发布 | 弹出校验弹窗，校验都通过 |
| 4 | 点击确定 | 系统提示发布成功，发布状态更新，相关页面可访问 |
| 5 | 查看项目B中hive2sr任务 | 1）source端：hiveA-schemaB-table12)sink端：srB-schemaA-table2 |
| 6 | sr-schemaA下不存在表table1，运行任务，查看结果 | 运行报错，表不存在 |
| 7 | schemaA下创建表table1，然后临时运行，查看结果 | 运行成功，写入数据正确，内容与预期完全一致，无异常或错误 |

##### 验证Hive2StarRocks任务一键发布功能正常(映射数据源: Hive不同、SR不同, 一对一Schema映射) 「P1」

> 前置条件
```
1、项目A绑定项目B为发布目标

2、项目A引入hiveA(meta), srA(meta)
项目B引入hiveB(meta) , srB(非meta)

3、配置数据源映射关系:
hiveA(meta) > hiveB(meta)
srA(meta)  ❯ srB(非meta)

4、Schema映射关系:
配置一对一的映射关系

5、添加离线配置项default.data.source.show.all.schema = true
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A，创建Hive2StarRocks数据同步任务：source端：hiveA(meta)-schemaA-table1sink端: srA(meta)-scheamA-table2保存提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 2 | 进入发布任务页面，打包Hive2StarRocks | 打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入发布至目标项目页面，点击发布 | 弹出校验弹窗，校验通过 |
| 4 | 点击确定 | 系统提示发布成功，发布状态更新，相关页面可访问 |
| 5 | 查看项目B中Hive2StarRocks任务 | 1) source端：hiveB(meta)-schemaA-table12) sink端: srB(非meta)-scheamA-table2 |
| 6 | 点击上一步，进入sink端 | 如果srB下schemaA不存在，报错schemaA不存在，反之不报错 |
| 7 | 不报错，映射schema下表不存在，临时运行 | 报错表不存在 |
| 8 | 创建表后运行 | 结果正确，写入数据正确，内容与预期完全一致，无异常或错误 |

##### 验证Hive2StarRocks任务一键发布功能正常(映射数据源: Hive不同、SR不同, 无Schema映射, 配置项=false) 「P2」

> 前置条件
```
1、添加离线配置项
default.data.source.show.all.schema = false

2、存在四个项目: Project01~04
Project01引入hiveA(meta), srA(meta)
Project02引入hiveA(meta), srA(meta)
Project01 (测试项目) > Project02(生产项目)

Project03引入hiveA(meta), srA(非meta)
Project04引入hiveB(meta), srB(非meta)
Project03 (测试项目) > Project04(生产项目)

3、数据源映射关系如下:
hiveA(meta) > hiveB(meta)
srA(非meta)  ❯ srB(非meta)

4、Schema映射关系: 无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-Project03，创建数据同步任务: hive2sr_01, 配置如下:source端: hiveA-schemaA-table1sink端: srA-scheamA-table2其它配置项正常填写, 保存后提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 2 | 进入发布任务页面，打包hive2sr | 打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入发布至目标项目页面，点击发布 | 弹出校验弹窗，校验都通过 |
| 4 | 点击确定 | 系统提示发布成功，发布状态更新，相关页面可访问 |
| 5 | 查看项目B中hive2sr任务 | 1）source端：hiveB-schemaA-table12）sink端：srB-schema1-table2 |
| 6 | 点击上一步，进入source端 | 报错schemaA不存在 |

##### 验证Hive2StarRocks任务一键发布功能正常(映射数据源: Hive相同、SR相同, 无Schema映射, 配置项=true) 「P2」

> 前置条件
```
1、添加离线配置项
default.data.source.show.all.schema = true

2、存在四个项目: Project01~04
Project01引入hiveA(meta), srA(meta)
Project02引入hiveA(meta), srA(meta)
Project01 (测试项目) > Project02(生产项目)

Project03引入hiveA(meta), srA(非meta)
Project04引入hiveB(meta), srB(非meta)
Project03 (测试项目) > Project04(生产项目)

3、数据源映射关系如下:
hiveA(meta) > hiveA(meta)
srA(meta)  ❯ srA(meta)

4、Schema映射关系: 无
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-Project01，创建数据同步任务: hive2sr_01, 配置如下:source端: hiveA-schemaA-table1sink端: srA-scheamB-table2其它配置项正常填写, 保存后提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 2 | 进入发布任务页面，打包hive2sr_01 | 打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入发布至目标项目页面，点击发布 | 弹出校验弹窗，校验都通过 |
| 4 | 点击确定 | 系统提示发布成功，发布状态更新，相关页面可访问 |
| 5 | 查看项目B中hive2sr_01任务 | 1) source端: hiveA-schemaA-table12) sink端: srA-scheamB-table2 |
| 6 | 点击上一步，进入sink端 | 如果srA下schemaB不存在，报错schemaB不存在，反之不报错 |
| 7 | 不报错，映射schema下表不存在，临时运行 | 报错表不存在 |
| 8 | 创建表后运行 | 结果正确，写入数据正确，内容与预期完全一致，无异常或错误 |

##### 验证Doris2Doris多任务一键发布功能正常(映射数据源不同, 多对一Schema映射) 「P3」

> 前置条件
```
1、项目A绑定项目B为发布目标

2、项目A引入dorisA(meta), doris1(非meta)
项目B引入dorisB(meta) , dorisA(非meta)

3、项目A - 项目B, Doris集群映射关系如下:
dorisA(meta) ❯ dorisB(meta)
doris1(非meta) ❯ dorisA(非meta)
doris2(非meta) ❯ dorisA(非meta)
dorisC(非meta) ❯ dorisB(meta)
schemaD、schema3未配置

4、 离线配置项default.data.source.show.all.schema = false
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务 | 成功进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务页面，页面内容正常加载显示，无报错 |
| 2 | 1）进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:doris1-scheam1-table2保存提交任务2）进入离线开发-项目A，创建数据同步任务doris2dorisB：source：dorisA-schemaC-table1sink:doris1-scheam2-table2保存提交任务3）进入离线开发-项目A，创建数据同步任务doris2dorisC：source：doris1-schema3-table1sink:dorisA-scheamD-table2保存提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 3 | 进入发布任务页面，打包doris2dorisA、doris2dorisB、doris2dorisC | 打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 4 | 进入发布至目标项目页面，点击发布 | 弹出校验弹窗，校验都通过 |
| 5 | 点击确定 | 系统提示发布成功，发布状态更新，相关页面可访问 |
| 6 | 查看项目B中doris2doirsA、B、C任务 | 1）doris2dorisA：source端：dorisB-schemaB-table1；sink端：dorisA-schemaA-table22）doris2dorisB：source端：dorisB-schemaB-table1；sink端：dorisA-schemaA-table23）doris2dorisC：source端：dorisA-schema3-table1；sink端：dorisB-schemaD-table2 |
| 7 | 查看doris2dorisC，点击上一步，进入source端和sink端 | source端报错schema3不存在 |
| 8 | 运行任务A、B，查看结果 | 如果scheam下表不存在，就报错表不存在 |
| 9 | 如果scheam下表不存在，就报错表不存在 | 运行成功，写入数据正确，内容与预期完全一致，无异常或错误 |

##### 验证Doris2Doris任务一键发布功能正常(映射数据源不同, 多对一Schema映射) 「P3」

> 前置条件
```
1、“项目A”绑定“项目B”为发布目标

2、项目B引入meta数据源dorisA

3、meta数据源dorisA的映射数据源为meta：dorisB
非meta数据源doris1的映射数据源为dorisA

schema映射配置：
schemaA-schemaB
schema1-schemaA
schema2-schemaA
schemaC-schemaB
schemaD未配置

4、 离线配置项default.data.source.show.all.schema = false
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:doris1-scheam1-table2保存提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 2 | 进入发布任务页面，打包doris2doris | 打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入发布至目标项目页面，点击发布 | 弹出校验弹窗，校验都通过 |
| 4 | 点击确定 | 系统提示发布成功，发布状态更新，相关页面可访问 |
| 5 | 查看项目B中doris2doirs任务 | 1）任务数据源回填dorisB2）source端：dorisB-schemaB-table13)sink端：dorisB-schemaA-table2 |
| 6 | schemaB下不存在表table1，运行任务，查看结果 | 运行报错，表不存在 |
| 7 | schemaB下创建表table1，然后临时运行，查看结果 | 运行成功，写入数据正确，内容与预期完全一致，无异常或错误 |

##### 验证Doris2Doris任务一键发布功能正常(映射数据源不同, 一对一Schema映射) 「P3」

> 前置条件
```
1、项目A绑定项目B为发布目标

2、项目A引入dorisA(meta), doris1(非meta)
项目B引入dorisB(meta) , dorisA(非meta)

3、项目A - 项目B, Doris集群映射关系如下:
dorisA(meta) ❯ dorisB(meta)
doris1(非meta) ❯ dorisA(非meta)

4、 离线配置项default.data.source.show.all.schema = false
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:doris1-scheam1-table2保存提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 2 | 进入发布任务页面，打包doris2doris | 打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入发布至目标项目页面，点击发布 | 弹出校验弹窗，校验都通过 |
| 4 | 点击确定 | 系统提示发布成功，发布状态更新，相关页面可访问 |
| 5 | 查看项目B中doris2doirs任务 | 1）任务数据源回填dorisB2）source端：dorisB-schemaB-table13)sink端：dorisA-schemaA-table2 |
| 6 | 映射schema下表不存在，运行任务，查看结果 | 运行报错，表不存在 |
| 7 | 映射schema下创建对应表，临时运行，查看结果 | 运行成功，数据写入正确，内容与预期完全一致，无异常或错误 |

##### 验证Doris2Doris任务一键发布功能正常(映射数据源不同, 无Schema映射, 配置项=false) 「P3」

> 前置条件
```
1、项目A绑定项目B为发布目标

2、项目A引入dorisA(meta), doris1(非meta)
项目B引入dorisB(meta) , dorisA(非meta)

3、数据源映射关系:
dorisA(meta) > dorisB(meta)
doris1(非meta) ❯ dorisA(非meta)

4、Schema映射关系: 无

5、 离线配置项default.data.source.show.all.schema = false
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:doris1-scheam1-table2保存提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 2 | 进入发布任务页面，打包doris2doris | 打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入发布至目标项目页面，点击发布 | 弹出校验弹窗，校验都通过 |
| 4 | 点击确定 | 系统提示发布成功，发布状态更新，相关页面可访问 |
| 5 | 查看项目B中doris2doirs任务 | 1）source端：dorisB-schemaA-table12）sink端：dorisA-schema1-table2 |
| 6 | 点击上一步，进入source端 | 报错schemaA不存在 |

##### 验证Doris2Doris任务一键发布功能正常(映射数据源相同, 无Schema映射, 配置项=true) 「P3」

> 前置条件
```
1、项目A绑定项目B为发布目标

2、项目A引入dorisA(meta), doris1(非meta)
项目B引入dorisB(meta) , dorisA(非meta)

3、数据源映射关系如下:
dorisA(meta) > dorisB(meta)
doris1(非meta) ❯ dorisA(非meta)

4、Schema映射关系: 无

3、 离线配置项default.data.source.show.all.schema = true
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:doris1-scheam1-table2保存提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 2 | 进入发布任务页面，打包doris2doris | 打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入发布至目标项目页面，点击发布 | 弹出校验弹窗，校验都通过 |
| 4 | 点击确定 | 系统提示发布成功，发布状态更新，相关页面可访问 |
| 5 | 查看项目B中doris2doirs任务 | 1）source端：dorisB-schemaA-table12）sink端：dorisA-schema1-table2 |
| 6 | 点击上一步，进入sink端 | 如果dorisA下schema1不存在，报错schema1不存在，反之不报错 |
| 7 | 不报错，映射schema下表不存在，临时运行 | 报错表不存在 |
| 8 | 创建表后运行 | 结果正确，写入数据正确，内容与预期完全一致，无异常或错误 |

##### 验证Doris2Doris任务导入导出发布功能正常(映射数据源相同, 多对一Schema映射) 「P3」

> 前置条件
```
1、“项目A”绑定“项目B”为发布目标 项目A的非metadata数据源doris1，映射配置项目B的meta数据源dorisB。不是同一套doris schemaA、B下有对应的表

scheam映射为：
schema1-schemaA
schema2-schemaB

2、项目C引入了meta数据源dorisB

3、 离线配置项default.data.source.show.all.schema = true
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A，创建doris2doris数据同步任务：source：doris1-schema1-table1sink:doris1-scheam2-table2保存提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 2 | 进入发布任务页面，打包doris2doris | 打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入发布至目标项目，导出发布包 | 浏览器触发文件下载，导出文件格式正确，内容与页面显示数据一致 |
| 4 | 进入项目C发布页面-发布至本项目，上传发布包 | 系统提示上传成功，文件已显示在上传列表/附件区域，文件名与大小正确 |
| 5 | 点击发布 | 弹出校验弹窗 |
| 6 | 数据源映射选择dprisB，点击发布 | 系统提示发布成功，发布状态更新，相关页面可访问 |
| 7 | 查看项目C中doris2doirs任务 | 任务数据源回填dorisB，source端schema回填schema1，sink端回填schema2 |

##### 验证Doris2Doris多任务一键发布功能正常(映射数据源不同, 多对一Schema映射) 「P3」

> 前置条件
```
1、“项目A”绑定“项目B”为发布目标

2、meta数据源dorisA的映射数据源为非meta数据源doris1
schema映射配置：
schemaA-schema2
scheamB-scheam2
schemaC-schema1
schemaD未进行映射配置，doris1下不存在schemaD

3、 离线配置项default.data.source.show.all.schema = true
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务 | 成功进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务页面，页面内容正常加载显示，无报错 |
| 2 | 1）进入离线开发-项目A，创建数据同步任务doris2dorisA：source：dorisA-schemaA-table1sink:dorisA-scheamA-table2保存提交任务2）进入离线开发-项目A，创建数据同步任务doris2dorisB：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务3）进入离线开发-项目A，创建数据同步任务doris2dorisC：source：dorisA-schemaC-table1sink:dorisA-scheamD-table2保存提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 3 | 进入发布任务页面，打包doris2dorisA、doris2dorisB、doris2dorisC | 打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 4 | 进入发布至目标项目页面，点击发布 | 弹出校验弹窗，校验都通过 |
| 5 | 点击确定 | 系统提示发布成功，发布状态更新，相关页面可访问 |
| 6 | 查看项目B中doris2doirsA、B、C任务 | 1）doris2dorisA：source端：doris1-schema2-table1；sink端：doris1-schema2-table22）doris2dorisB：source端：doris1-schema2-table1；sink端：doris1-schema2-table23）doris2dorisC：source端：doris1-schema1-table1；sink端：doris1-schemaD-table2 |
| 7 | doris2dorisC点击上一步，进入sink端 | 报错scheamD不存在 |
| 8 | 映射schema下表不存在，运行任务A、B，查看结果 | 运行报错，表不存在 |
| 9 | 映射schema下创建对应表，临时运行A、B，查看结果 | 运行成功，schemaA-table2中写入scheamB-table1数据，写入正确 |

##### 验证Doris2Doris多任务一键发布功能正常(映射数据源相同, 多对一Schema映射) 「P3」

> 前置条件
```
1、“项目A”绑定“项目B”为发布目标

2、meta数据源dorisA的映射数据源为meta数据源dorisB

schema映射配置：
schemaA-schemaB
scheamB-scheamB
schemaC-schemaA
schemaD未进行映射配置

3、 离线配置项default.data.source.show.all.schema = true
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务 | 成功进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务页面，页面内容正常加载显示，无报错 |
| 2 | 1）进入离线开发-项目A，创建数据同步任务doris2dorisA：source：dorisA-schemaA-table1sink:dorisA-scheamA-table2保存提交任务2）进入离线开发-项目A，创建数据同步任务doris2dorisB：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务3）进入离线开发-项目A，创建数据同步任务doris2dorisC：source：dorisA-schemaC-table1sink:dorisA-scheamD-table2保存提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 3 | 进入发布任务页面，打包doris2dorisA、doris2dorisB、doris2dorisC | 打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 4 | 进入发布至目标项目页面，点击发布 | 弹出校验弹窗，校验都通过 |
| 5 | 点击确定 | 系统提示发布成功，发布状态更新，相关页面可访问 |
| 6 | 查看项目B中doris2doirsA、B、C任务 | 1）doris2dorisA：source端：dorisB-schemaB-table1；sink端：dorisB-schemaB-table22）doris2dorisB：source端：dorisB-schemaB-table1；sink端：dorisB-schemaB-table23）doris2dorisC：source端：dorisB-schemaA-table1；sink端：dorisB-schemaD-table2 |
| 7 | 运行任务，查看结果 | 如果scheam下表不存在，就报错表不存在 |
| 8 | 创建表后，临时运行，查看结果 | 运行成功，写入数据正确，内容与预期完全一致，无异常或错误 |

##### 验证Doris2Doris任务一键发布功能正常(映射数据源不同, 多对一Schema映射) 「P3」

> 前置条件
```
1、“项目A”绑定“项目B”为发布目标

2、meta数据源dorisA的映射数据源为非meta数据源doris1

schema映射配置：
schemaA-schema1
scheamB-scheam1

3、 离线配置项default.data.source.show.all.schema = true
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 2 | 进入发布任务页面，打包doris2doris | 打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入发布至目标项目页面，点击发布 | 弹出校验弹窗，校验都通过 |
| 4 | 点击确定 | 系统提示发布成功，发布状态更新，相关页面可访问 |
| 5 | 查看项目B中doris2doirs任务 | 1）任务数据源回填doris12）source端：doris1-schema1-table13)sink端：doris1-schema1-table2 |
| 6 | 映射schema下表不存在，运行任务，查看结果 | 运行报错，表不存在 |
| 7 | 映射schema下创建对应表，临时运行，查看结果 | 运行成功，schemaA-table2中写入scheamB-table1数据，写入正确 |

##### 验证Doris2Doris任务一键发布功能正常(映射数据源相同, 多对一Schema映射) 「P3」

> 前置条件
```
1、“项目A”绑定“项目B”为发布目标

2、meta数据源dorisA的映射数据源为meta数据源dorisB
schema映射配置：
schemaA-schemaB
scheamB-scheamB

4、 离线配置项default.data.source.show.all.schema = true
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 2 | 进入发布任务页面，打包doris2doris | 打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入发布至目标项目页面，点击发布 | 弹出校验弹窗，校验都通过 |
| 4 | 点击确定 | 系统提示发布成功，发布状态更新，相关页面可访问 |
| 5 | 查看项目B中doris2doirs任务 | 1）任务数据源回填dorisB2）source端：dorisB-schemaB-table13)sink端：dorisB-schemaB-table2 |
| 6 | schemaB下不存在表table1，运行任务，查看结果 | 运行报错，表不存在 |
| 7 | schemaB下创建表table1，然后临时运行，查看结果 | 运行成功，写入数据正确，内容与预期完全一致，无异常或错误 |

##### 验证Doris2Doris任务一键发布功能正常(映射数据源不同, 一对一Schema映射) 「P3」

> 前置条件
```
1、“项目A”绑定“项目B”为发布目标

2、meta数据源dorisA的映射数据源为非meta数据源doris1
schema映射配置：
schemaA-schema1
scheamB-scheam2

4、 离线配置项default.data.source.show.all.schema = true
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 2 | 进入发布任务页面，打包doris2doris | 打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入发布至目标项目页面，点击发布 | 弹出校验弹窗，校验都通过 |
| 4 | 点击确定 | 系统提示发布成功，发布状态更新，相关页面可访问 |
| 5 | 查看项目B中doris2doirs任务 | 1）任务数据源回填doris12）source端：doris1-schema1-table13)sink端：doris1-schema2-table2 |
| 6 | 映射schema下表不存在，运行任务，查看结果 | 运行报错，表不存在 |
| 7 | 映射schema下创建对应表，临时运行，查看结果 | 运行成功，schemaA-table2中写入scheamB-table1数据，写入正确 |

##### 验证Doris2Doris任务一键发布功能正常(映射数据源相同, 一对一Schema映射) 「P3」

> 前置条件
```
1、“项目A”绑定“项目B”为发布目标

2、meta数据源dorisA的映射数据源为meta：dorisB

schema映射配置：
schemaA-schemaB
scheamB-scheamA

4、 离线配置项default.data.source.show.all.schema = true
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 2 | 进入发布任务页面，打包doris2doris | 打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入发布至目标项目页面，点击发布 | 弹出校验弹窗，校验都通过 |
| 4 | 点击确定 | 系统提示发布成功，发布状态更新，相关页面可访问 |
| 5 | 查看项目B中doris2doirs任务 | 1）任务数据源回填dorisB2）source端：dorisB-schemaB-table13)sink端：dorisB-schemaA-table2 |
| 6 | 映射schema下表不存在，运行任务，查看结果 | 运行报错，表不存在 |
| 7 | 映射schema下创建对应表，临时运行，查看结果 | 运行成功，schemaA-table2中写入scheamB-table1数据，写入正确 |

##### 验证Doris2Doris任务一键发布功能正常(映射数据源不同, 无Schema映射) 「P3」

> 前置条件
```
1、“项目A”绑定“项目B”为发布目标
2、show.all.schema为true
3、meta数据源dorisA的映射数据源为非meta数据源doris1，不同集群 doris1下存在schemaA，不存在schemaB

4、 离线配置项default.data.source.show.all.schema = true
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 2 | 进入发布任务页面，打包doris2doris | 打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入发布至目标项目页面，点击发布 | 弹出校验弹窗，校验都通过 |
| 4 | 点击确定 | 系统提示发布成功，发布状态更新，相关页面可访问 |
| 5 | 查看项目B中doris2doirs任务 | 任务数据源回填doris1，schema和table回填与步骤一中一致 |
| 6 | 点击上一步，进入source端和sink端 | 1）source端不报错2）sink端报错schema不存在 |

##### 验证Doris2Doris任务一键发布功能正常(映射数据源相同, 无Schema映射, 配置项=false) 「P3」

> 前置条件
```
1、“项目A”绑定“项目B”为发布目标
2、meta数据源dorisA的映射数据源为meta：dorisB

离线配置项default.data.source.show.all.schema = false
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamA-table2保存提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 2 | 进入发布任务页面，打包doris2doris | 打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入发布至目标项目页面，点击发布 | 弹出校验弹窗，校验都通过 |
| 4 | 点击确定 | 系统提示发布成功，发布状态更新，相关页面可访问 |
| 5 | 查看项目B中doris2doirs任务 | 任务数据源回填dorisB，schema和table回填与步骤一中一致 |
| 6 | 点击上一步，进入source端 | 报错schema不存在 |

##### 验证Doris2Doris任务一键发布功能正常(映射数据源相同, 无Schema映射, 配置项=true) 「P3」

> 前置条件
```
1、项目A绑定项目B为发布目标

2、数据源映射关系如下:
dorisA(meta) > dorisB(meta)

3、Schema映射关系: 无

4、 离线配置项default.data.source.show.all.schema = true
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A，创建doris2doris数据同步任务：source：dorisA-schemaA-table1sink:dorisA-scheamB-table2保存提交任务 | 系统提示提交成功，记录状态更新，列表中可见该条记录 |
| 2 | 进入发布任务页面，打包doris2doris | 打包成功，系统给出成功反馈，相关页面/数据状态更新为最新 |
| 3 | 进入发布至目标项目页面，点击发布 | 弹出校验弹窗，校验都通过 |
| 4 | 点击确定 | 系统提示发布成功，发布状态更新，相关页面可访问 |
| 5 | 查看项目B中doris2doirs任务 | 任务数据源回填dorisB，schema和table回填与步骤一中一致 |
| 6 | 临时运行任务，查看结果 | 运行成功，写入数据正确，内容与预期完全一致，无异常或错误 |

##### 验证删除行按钮功能正常 「P2」

> 前置条件
```
“项目A”绑定“项目B”为发布目标
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据源，点击doris1的映射配置按钮, 发布目标选择doris2，查看目标项目schema下拉框 | 1）弹出映射配置弹窗2）返回doris2数据源下的所有schema |
| 2 | 添加多行配置：schemaA-schemaAschemaB-schemaBschemC-schemaCschemaD-schemaDschemaE-schemaE | 添加成功，每一行后边都有增加和删除按钮 |
| 3 | 删除第一行 | 删除成功：schemaB-schemaBschemC-schemaCschemaD-schemaDschemaE-schemaE |
| 4 | 删除第二行 | 删除成功：schemaB-schemaBschemaD-schemaDschemaE-schemaE |
| 5 | 删除最后一行 | 删除成功：schemaB-schemaBschemaD-schemaD |
| 6 | 删除所有 | 允许删除 |

##### 验证配置多行Schema功能正常 「P2」

> 前置条件
```
1、“项目A”绑定“项目B”为发布目标
2、default.data.source.show.all.schema为true
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据源，点击doris1的映射配置按钮, 发布目标选择doris2，查看目标项目schema下拉框 | 1）弹出映射配置弹窗2）返回doris2数据源下的所有schema |
| 2 | 本项目schema选择schemaA，目标项目schema选择schemaA | 选择项已高亮/回显选中状态，相关联动字段随之更新 |
| 3 | 点击+按钮 | 下方添加一行schema配置 |
| 4 | 查看新增行的本项目schema和目标项目schema | 1）本项目schema中，schemaA不允许选择2）目标项目schema中，所有schema都允许选择 |
| 5 | 选择schemaB-schemaA | 选择项已高亮/回显选中状态，相关联动字段随之更新 |
| 6 | 点击+按钮，查看新增行的本项目schema和目标项目schema | 1）本项目schema中，schemaA、schemaB不允许选择2）目标项目schema中，所有schema都允许选择 |
| 7 | 配置多行，点击确定 | 系统提示保存成功，修改内容已生效并在页面中更新显示 |
| 8 | 点击映射配置，查看展示 | 回填数据正确, 上限20 |

##### 验证配置一行Schema功能正常 「P2」

> 前置条件
```
“项目A”绑定“项目B”为发布目标
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据源，点击doris1的映射配置按钮, 发布目标选择doris2，查看目标项目schema下拉框 | 1）弹出映射配置弹窗2）返回doris2数据源下的所有schema |
| 2 | 本项目schema选择schemaA，目标项目schema选择schemaA，点击确定 | 系统提示保存成功，修改内容已生效并在页面中更新显示 |
| 3 | 点击映射配置查看展示 | 回填正确，内容与预期完全一致，无异常或错误 |
| 4 | 目标项目schema选择schemaB，点击确定 | 系统提示保存成功，修改内容已生效并在页面中更新显示 |

##### 验证Meta数据源-Schema下拉框数据正确(配置项=false) 「P2」

> 前置条件
```
添加或更改离线配置项: default.data.source.show.all.schema = false
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据源，点击dorisA1的映射配置按钮, 查看本项目schema下拉框 | 1）弹出映射配置弹窗2）返回dorisA1的默认Schema（数据源列表连接信息中的schema） |
| 2 | 点击dorisA2的映射配置按钮，查看本项目schema下拉框 | 返回dorisA2的默认Schema（数据源列表连接信息中的schema） |
| 3 | 点击dorisA3的映射配置按钮，查看本项目schema下拉框 | 展示该数据源下的所有schema |
| 4 | 发布目标选择meta数据源dorisB1，查看目标项目schema下拉框 | 返回dorisB1的默认Schema（数据源列表连接信息中的schema） |
| 5 | 发布目标选择meta数据源dorisB2，查看目标项目schema下拉框 | 返回dorisB2的默认Schema（数据源列表连接信息中的schema） |
| 6 | 发布目标选择meta数据源dorisB3，查看目标项目schema下拉框 | 发布目标选择meta数据源dorisB3，查看目标项目schema下拉框 |

##### 验证Meta数据源-Schema下拉框数据正确(配置项=true) 「P1」

> 前置条件
```
添加或更改离线配置项: default.data.source.show.all.schema = true

1、“项目A”绑定“项目B”为发布目标
2、项目A、B对接三个doris集群，初始化方式分别为：创建、对接已有doris schema、不创建且不对接schema。分别为dorisA1、dorisA2、dorisA3； dorisB1、dorisB2、dorisB3
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据源，点击dorisA1的映射配置按钮, 查看本项目schema下拉框 | 1）弹出映射配置弹窗2）返回dorisA1数据源下的所有schema |
| 2 | 点击dorisA2的映射配置按钮，查看本项目schema下拉框 | 返回dorisA2数据源下的所有schema |
| 3 | 点击dorisA3的映射配置按钮，查看本项目schema下拉框 | 返回dorisA3数据源下的所有schema |
| 4 | 发布目标选择meta数据源dorisB1，查看目标项目schema下拉框 | 返回dorisB1数据源下的所有schema |
| 5 | 发布目标选择meta数据源dorisB2，查看目标项目schema下拉框 | 返回dorisB2数据源下的所有schema |
| 6 | 发布目标选择meta数据源dorisB3，查看目标项目schema下拉框 | 返回dorisB3数据源下的所有schema |

##### 验证非Meta数据源-Schema下拉框数据正常 「P2」

> 前置条件
```
1、“项目A”绑定“项目B”为发布目标
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据源，点击非meta数据源doris1的映射配置按钮 | 弹出映射配置弹窗 |
| 2 | 查看本项目schema下拉框 | 返回doris1数据源下的所有schema |
| 3 | 发布目标选择非meta数据源doris1，查看目标项目schema下拉框 | 返回doris1数据源下的所有schema |
| 4 | 目标项目schema选择schameA，然后切换发布目标，查看目标项目schema回填 | 回填清空 |
| 5 | 两个下拉框分别模糊搜索test | 结果正确，内容与预期完全一致，无异常或错误 |

##### 验证Schema映射配置非必填功能 「P2」

> 前置条件
```
1、“项目A”绑定“项目B”为发布目标
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据源，点击数据源doris的映射配置按钮 | 1）弹出映射配置弹窗 |
| 2 | 不点击新增按钮，直接点击确定 | 系统提示保存成功，修改内容已生效并在页面中更新显示 |
| 3 | 点击新增按钮，不填写内容，点击保存 | 提示不能为空 |
| 4 | 点击新增按钮，添加多行，不填写内容，点击保存 | 提示不能为空 |
| 5 | 只选择本项目schema/目标项目schema，另一个为空，点击确定 | 另一个选择框提示不能为空 |

##### 验证新增Schema映射配置功能 「P2」

> 前置条件
```
1、“项目A”绑定“项目B”为发布目标
2、项目A和项目B均已引入数据源doris1、doris2
```

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入离线开发-项目A-数据源，点击数据源doris的映射配置按钮 | 1）弹出映射配置弹窗：下方新增Schema映射2）schema映射列表展示暂无数据，有本项目schema、目标项目schema、操作三个字段，和新增按钮 |
| 2 | 点击ftp映射配置按钮，查看是否新增schema映射配置 | 未新增该字段 |

