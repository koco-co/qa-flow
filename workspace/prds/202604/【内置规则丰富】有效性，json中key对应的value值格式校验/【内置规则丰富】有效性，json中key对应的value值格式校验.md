---
source: "lanhu"
source_url: "https://lanhuapp.com/web/#/item/project/product?tid=24a1c6b2-a52e-454c-8d51-8aff866598b1&pid=7de90493-e80f-4592-a263-38fb2d2e98c0&versionId=236fbc84-10a3-4808-9559-66c1ef54ae55&docId=fc0fee93-74f5-4eff-a769-99e68506b296&docType=axure&pageId=e08ead471bc2471489e6fc7443d060c6&image_id=fc0fee93-74f5-4eff-a769-99e68506b296&parentId=9a152fb2-6417-4ee0-8df3-6f74f7deb413"
fetch_date: "2026-04-05"
requirement_id: "15694"
project: "岚图"
status: "原始"
---

# 【内置规则丰富】有效性，json中key对应的value值格式校验

## 页面元素截图

![页面元素-1](images/1-u101.png)

![页面元素-2](images/2-u102.png)

![页面元素-3](images/3-u109.png)

![页面元素-4](images/4-u125.png)

![页面元素-5](images/5-u126.png)

![页面元素-6](images/6-u129.png)

![页面元素-7](images/7-u3.png)

![页面元素-8](images/8-u36.png)

![页面元素-9](images/9-u6.png)

![页面元素-10](images/10-u62.png)

![页面元素-11](images/11-u64.png)

![页面元素-12](images/12-u76.png)

![页面元素-13](images/13-u8.png)

![页面元素-14](images/14-u80.png)

## 控件文本

开发版本：6.3岚图定制化分支需求内容：有效性校验支持对json类型的字段做key对应的value值格式的校验 | 规则配置 | 结果查询 | 针对“校验不通过”的规则，支持查看明细，明细记录不符合规则的数值 | 查看“有效性校验-格式-json格式校验”明细 | 记录不符合要求的数据，数据列表保留全部字段，校验字段标红展示，下载明细数据中校验字段也标红展示 | 标题文案修改为： | 针对“校验通过”的规则，不记录明细数据；针对“校验失败”的规则，支持查看日志 | 规则类型 | 字段级 | 字段 | xxx | 统计规则 | 格式-json校验 | 校验key | key1-key2;key11-key22… | 过滤条件 | 强弱规则 | 强规则 | 规则描述

## 整页截图

![全页截图-1](images/15-fullpage-15694_内置规则丰富_有效性_json中key对应的value值格式校验.png)

## 页面完整文本

开发版本：6.3岚图定制化分支




需求内容：有效性校验支持对json类型的字段做key对应的value值格式的校验

规则配置

结果查询

针对“校验不通过”的规则，支持查看明细，明细记录不符合规则的数值

查看“有效性校验-格式-json格式校验”明细

记录不符合要求的数据，数据列表保留全部字段，校验字段标红展示，下载明细数据中校验字段也标红展示

标题文案修改为：

针对“校验通过”的规则，不记录明细数据；

针对“校验失败”的规则，支持查看日志

规则类型

字段级

字段

xxx

统计规则

格式-json校验

校验key

key1-key2;key11-key22…

过滤条件

xxx

强弱规则

强规则

规则描述

xxx

有效性校验

质量报告

规则类型

规则名称

字段名称

字段类型

质检结果

未通过原因

详情说明

操作

有效性校验

  格式-json格式校验

xxxx

json

· 校验通过

- -

符合规则key为“key1-key2;key11-key22…”时的value格式要求

- -

` 校验不通过

key对应value格式校验未通过

不符合规则key为“key1-key2;key11-key22…”时的value格式要求

查看详情

规则名称

规则解释

规则分类

关联范围

规则描述

格式校验

格式-json格式校验

有效性校验

字段

校验json类型的字段中key对应的value值是否符合规范要求

规则库-内置规则增加

悬浮提示内容为规则库中的“规则解释”内容

格式-json格式校验

新增“格式-json格式校验”选项，位置放在自定义正则的上方

请选择校验key

全部

key1（中文名称）

key2（中文名称）

key3（中文名称）

key11（中文名称）

key22（中文名称）

key33（中文名称）

注意：




1、配置后需要按照层级进行校验，key名需要按照层级匹配是否存在key信息；【要考虑key数量几千个的情况】




2、支持doris3.x、sparkthrift2.x、hive2.x数据源




3、json格式校验仅支持数据类型为json、string的字段

value格式预览

悬浮提示内容“校验内容为key名对应的value格式是否符合要求，value格式需要在通用配置模块维护。”

value格式

key

xxxxx

xxxxx

xxxxx

xxxxx

xxxxx

value格式

xxx(正则信息)

xxx(正则信息)

xxx(正则信息)

xxx(正则信息)

xxx(正则信息)

仅展示勾选的key对应的信息，分页展示

点击“value格式预览”展示下面的弹窗

列表仅配置过value格式信息的key可以被选择，没有配置过的不支持选中




若key数据量多，默认加载前200条展示，勾选仅对当前层级生效，回显内容为“key1-key2;key11-key22”

鼠标悬浮展示全部的key名信息，默认仅展示前两个
