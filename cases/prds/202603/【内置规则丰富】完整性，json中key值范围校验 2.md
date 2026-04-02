---
prd_name: "【内置规则丰富】完整性，json中key值范围校验"
description: "为完整性校验新增 JSON key 范围校验能力并补齐报告链路"
prd_id: 15693
prd_version: v6.4.10
prd_source: "cases/requirements/data-assets/v6.4.10/【内置规则丰富】完整性，json中key值范围校验.md"
prd_url: "https://lanhuapp.com/web/#/item/project/product?tid=24a1c6b2-a52e-454c-8d51-8aff866598b1&pid=7de90493-e80f-4592-a263-38fb2d2e98c0&versionId=7991bb05-6f97-4b29-8ad6-de18b5869a4d&docId=fc0fee93-74f5-4eff-a769-99e68506b296&docType=axure&pageId=3035f5b47bed47fcb8a7a4a26fa7a701&image_id=fc0fee93-74f5-4eff-a769-99e68506b296&parentId=493e80b4-33c3-44cb-b880-42bee51dba19"
product: data-assets
dev_version: "6.3岚图定制化分支"
tags:
  - 内置规则
  - 完整性校验
  - key范围校验
  - JSON
  - 岚图定制化
create_at: 2026-03-30
update_at: "2026-03-30T16:02:42Z"
status: enhanced
health_warnings: []
repos:
  - .repos/CustomItem/dt-center-assets
  - .repos/CustomItem/dt-insight-studio
case_path: ""
---
<!-- enhanced-at: 2026-03-30T16:02:42Z | images: 0/0 | health: 0 warnings -->

# [15693] 【内置规则丰富】完整性，json中key值范围校验

## 1. 基本信息

- 模块: `data-assets` / 数据质量
- 需求版本: `v6.4.10`
- 开发版本: `6.3岚图定制化分支`
- 分支上下文:
  - backend: `.repos/CustomItem/dt-center-assets` @ `release_6.3.x_ltqc` (`1bc09577e77a911ecb6549288360b76914bfb622`)
  - frontend: `.repos/CustomItem/dt-insight-studio` @ `dataAssets/release_6.3.x_ltqc` (`8f3aff0947d680df26c38780370080d82a63dbba`)
- 前置依赖:
  - `15696【通用配置】json格式配置`：维护 JSON key 清单、层级结构、数据源维度
- 关联但不纳入本次主输出的同批需求:
  - `15694【内置规则丰富】有效性，json中key对应的value值格式校验`

## 2. 需求背景

现有数据质量规则配置页已经具备字段级规则、统计函数、校验方法、质量报告、失败日志等通用能力，但对于 `json` / `string` 类型字段，尚缺少“按 JSON key 层级范围判断是否满足预期”的内置规则。

本需求在“完整性校验”分类下新增“key范围校验”规则，用于校验待检字段中是否包含或不包含指定 key 路径集合。校验内容不直接手输，而是依赖 `15696` 中的“JSON格式配置”维护出的 key 树形清单，以保证数据源类型、层级结构和中文名称统一维护。

除规则配置本身外，本需求还要求打通质量报告、失败明细、失败日志的查询链路，确保规则执行后可以在报告端看到“通过/不通过”的清晰解释，并仅在失败时暴露明细与日志能力。

## 3. 变更范围

| 类别 | 影响对象 | 变更说明 | 依据 |
|------|----------|----------|------|
| 内置规则 | 规则库 / 内置规则模板 | 新增“key范围校验”规则条目，归属“完整性校验 / 字段级” | PRD 原文 |
| 规则配置 | `/dq/rule/add`、`/dq/rule/edit/:id` | 在规则编辑页新增可选统计函数“key范围校验”，并约束字段单选、校验方法、校验内容选择行为 | PRD 原文 + 源码 |
| 依赖配置 | `15696 JSON格式配置` | 提供按数据源类型维护的 key 层级清单，供本规则引用 | 依赖 PRD |
| 质量结果 | `/dq/qualityReport`、`/dq/qualityReportDetail` | 展示通过/不通过结果、原因、详情说明 | PRD 原文 + 源码 |
| 失败追踪 | `/valid/monitorRecord/getLogByNum`、`/valid/monitorRecord/monitorRuleRecordResult` | 失败时支持查看日志和问题明细 | PRD 原文 + 源码 |
| 范围边界 | `15694 value 格式校验` | 同属 JSON 内置规则扩展，但不作为本次主文档的实现范围 | 需求拆分结论 |

## 4. 页面/交互详细设计

### 4.1 内置规则库与规则配置入口

#### 4.1.1 内置规则库

- 入口参考现有规则库能力：前端通过 `GET_BUILT_IN_RULE_LIST = /valid/monitorRuleTemplate/pageQuery` 获取内置规则列表，并支持 `openOrClose`、`export`
- 本需求新增规则条目:
  - 规则名称: `key范围校验`
  - 规则分类: `完整性校验`
  - 关联范围: `字段`
  - 规则解释: `对数据中包含的key范围校验`
  - 规则描述: `校验json类型的字段中key名是否完整，对key的范围进行校验`
- 悬浮提示要求:
  - 规则解释悬浮内容使用规则库中的“规则解释”
  - 校验内容悬浮提示文案为: `校验内容key信息需要在通用配置模块维护。`
  - 鼠标悬浮时支持展示全部或部分 key 信息，默认仅展示前两个

#### 4.1.2 规则配置入口

- 菜单归属: `数据质量 -> 规则配置`
- 前端路由已存在:
  - 列表页: `/dq/rule`
  - 新增页: `/dq/rule/add`
  - 编辑页: `/dq/rule/edit/:id`
- 列表页操作按钮文案已存在 `【新建监控规则】`，点击后跳转 `/dq/rule/add`

### 4.2 规则配置页（新增 / 编辑）

#### 4.2.1 页面定位

规则编辑页沿用现有监控规则编辑框架，前端已有字段标签与基础结构:

- `强弱规则`
- `规则描述`
- `字段`
- `统计函数`
- `校验方法`
- `期望值`

现有前端组件会根据 `builtInRuleList`、`type`、`level`、`functionId`、`verifyType` 控制可选规则与校验方法，因此“key范围校验”要在规则模板侧正确开放后，才能在编辑页被选中。

#### 4.2.2 字段定义

| 字段名称 | 前端/后端字段 | 类型 | 是否必填 | 规则 | 说明 | 来源 |
|---------|---------------|------|---------|------|------|------|
| 规则类型 | `type` | 单选 | 是 | 固定为完整性校验 | `RuleVO.type` / `SaveParam.type` 使用统一规则分类字段 | PRD 原文 + 源码 |
| 字段 | `columnName` / `columnNameStr` | 单选字段选择 | 是 | 仅允许选择 `json`、`string` 类型字段 | 选择 `key范围校验` 时字段仅支持单选 | PRD 原文 + 用户确认 + 源码 |
| 统计函数 | `functionId` / `functionName` | 单选 | 是 | 新增 `key范围校验` | 前端通过 `/valid/function/getFunctions` 获取函数列表 | PRD 原文 + 源码 |
| 校验方法 | `verifyType` / `verifyTypeValue` | 单选 | 是 | 仅支持 `包含` / `不包含` | 前端已有“请选择校验方法”通用文案与下拉结构 | PRD 原文 + 源码 |
| 校验内容 | `threshold` / `expansion` | 树形多选 | 是 | 支持多选、全选、搜索、层级回显 | 回显格式 `key1-key2;key11-key22` | PRD 原文 + 依赖 PRD |
| 过滤条件 | `filter` | 文本或配置型条件 | 否 | 沿用现有过滤条件配置 | 由 `/valid/monitorRule/buildFilterSql` 生成 SQL 片段 | 源码 |
| 强弱规则 | `ruleStrength` | 单选 | 是 | `1=弱规则`、`2=强规则` | 前端已有“强规则/弱规则”文案和说明 | 源码 |
| 规则描述 | `description` | 文本 | 否 | 前端当前页文案限制 `不超过50个字` | 后端字段已存在，UI 负责输入限制 | 源码 |

#### 4.2.3 交互规则

- 选择统计函数为 `key范围校验` 后:
  - 字段选择仅允许单选
  - 仅允许 `json`、`string` 类型字段进入可配置状态
  - 校验方法只展示 `包含`、`不包含`
- 校验内容选择器:
  - 数据来源为 `15696 JSON格式配置` 维护的 key 树
  - 支持关键字搜索
  - 支持“全部”与多选
  - 默认仅加载前 200 条用于首屏展示
  - 当 key 数量达到数千条时仍需支持按层级检索与勾选
  - 勾选仅对当前层级生效，不能隐式选中其他层级
- 层级回显:
  - 按父子路径回显为 `父key-子key`
  - 多个路径之间使用英文分号 `;` 连接
- 悬浮说明:
  - 规则说明悬浮内容复用规则库中的解释文本
  - 校验内容区域需提示“key 信息需在通用配置模块维护”

#### 4.2.4 保存与回显

- 保存接口: `/valid/monitorRule/save`
- 查询已有规则接口: `/valid/monitorRule/getRules`
- 保存请求对象 `SaveParam` 已包含:
  - `monitorId`
  - `rules`
  - `ruleStrength`
  - `description`
  - `type`
- 单条规则对象 `MonitorRule` / `RuleVO` 已具备:
  - `columnName`
  - `functionId`
  - `verifyType`
  - `threshold`
  - `filter`
  - `description`
  - `expansion`
- 保存成功后，前端沿用现有规则编辑成功反馈文案（当前分支存在 `新增成功` / `更新成功` / `新建规则成功！` 等成功提示）

### 4.3 JSON格式配置（依赖页面）

#### 4.3.1 页面职责

本页面不属于 `15693` 主页面，但它是“校验内容”选择器的数据来源，因此必须作为前置条件纳入正式需求。

依赖页面应提供以下能力:

- 菜单路径: `数据质量 -> 通用配置 -> JSON格式配置`
- 按数据源类型维护 key 清单:
  - `sparkthrift2.x`
  - `hive2.x`
  - `doris3.x`
- 支持最多 5 层树形结构
- 支持新增、编辑、新增子层级、删除、批量删除
- 支持 Excel 导入、导出
- 支持 key 名称模糊搜索
- 节点可配置中文名称和值格式

#### 4.3.2 当前源码状态

- 当前前端导航中，`/dq/generalConfig` 下仅检出 `维度配置` 子页，即 `/dq/generalConfig/dimension`
- 未在当前分支检出 `JSON格式配置` 对应路由、页面组件或前端文案
- [基于源码推断] 当前分支尚未落地该依赖页面，或尚未开放到导航层

### 4.4 质量报告与失败追踪

#### 4.4.1 质量报告展示

- 报告入口已存在:
  - 列表页 `/dq/qualityReport`
  - 详情页 `/dq/qualityReportDetail`
- 相关接口已存在:
  - `/valid/monitorTableValid/pageQuery`
  - `/valid/monitorTableValid/getTableValidDetail`
  - `/valid/monitorTableValid/getValidationExceptionRules`
- 本需求下的期望展示:
  - 规则类型: `完整性校验`
  - 规则名称: `key范围校验`
  - 字段类型: `json`
  - 校验通过时:
    - `质检结果 = 校验通过`
    - `未通过原因 = --`
    - `详情说明 = 符合规则key范围包含/不包含"..."`
  - 校验不通过时:
    - `质检结果 = 校验不通过`
    - `未通过原因 = key范围校验未通过`
    - `详情说明 = 不符合规则key范围包含/不包含"..."`
    - 操作列展示 `查看详情`

#### 4.4.2 失败明细与日志

- 失败明细接口: `/valid/monitorRecord/monitorRuleRecordResult`
  - 必填参数: `ruleId`、`recordId`
- 失败日志接口: `/valid/monitorRecord/getLogByNum`
  - 必填参数: `ruleId`、`recordId`
- 下载日志接口: `/valid/monitorRecord/downloadLogByNum`
- 业务要求:
  - 仅“校验不通过”时支持查看明细
  - 明细标题改为 `查看"完整性校验-key范围校验"明细`
  - 明细列表保留全部字段，校验字段标红
  - 下载出的明细数据中，校验字段同样标红
  - 校验通过时不记录明细数据
  - 校验失败时支持查看日志

## 5. 源码补充事实

- 前端导航已确认存在 `规则配置`、`任务查询`、`质量报告`、`通用配置` 四组主入口，且 `规则配置` 与 `质量报告` 路由链路完整。
- `规则配置` 编辑页当前已经具备通用的内置规则过滤机制:
  - 按 `ruleTaskType`、`relationRange`、`functionId`、`verifyType` 过滤可选项
  - 完整性校验在编辑组件中属于独立分支处理
- 后端规则保存与回显对象已具备承载该规则所需的通用字段:
  - `SaveParam.rules`
  - `MonitorRule.columnName`
  - `MonitorRule.functionId`
  - `MonitorRule.verifyType`
  - `MonitorRule.threshold`
  - `MonitorRule.expansion`
  - `MonitorRule.description`
- 内置规则模板接口链路已存在:
  - `pageQuery`
  - `openOrClose`
  - `export`
- 当前源码中**未检出**以下明确实现痕迹:
  - `key范围校验`
  - `json中key值范围校验`
  - `JSON格式配置`
- [基于源码推断] 这意味着当前分支对 `15693` 的主要状态更接近“需求已定义，通用骨架已具备，但专属规则和依赖配置页尚未在源码中显式落地”。

## 6. 影响分析

- 规则模板层:
  - 若内置规则模板未补充“key范围校验”，前端规则配置页即使具备通用框架，也无法让用户选到该规则
- 依赖配置层:
  - 若 `15696 JSON格式配置` 未落地，校验内容树无法获得数据来源，`多选/搜索/层级回显` 无法闭环
- 保存与回显层:
  - `MonitorRule` 当前具备通用字段，但 `key路径树` 的持久化格式需要前后端统一约定在 `threshold` 或 `expansion` 中的存储结构
- 报告与失败追踪层:
  - 报告展示、失败日志、失败明细链路已存在，可直接承接新规则结果
  - 但“通过不落明细、失败可查看详情”的规则语义仍需在规则执行结果侧准确实现
- 权限与导航层:
  - 若后续新增 `JSON格式配置` 子页，需要明确是复用 `DATAVALID_GENERALCONFIG` 体系，还是新增更细的子权限
- 兼容性与性能:
  - key 数量可达数千级，首屏只加载前 200 条时，必须兼顾搜索、懒加载与层级选择准确性

## 7. 测试关注点

- 验证 `key范围校验` 是否出现在“完整性校验 / 字段级”场景下，且悬浮提示与规则解释一致
- 验证选择 `key范围校验` 后，字段只允许单选，且非 `json` / `string` 字段不可配置
- 验证校验方法仅提供 `包含`、`不包含`
- 验证校验内容选择器的全量能力:
  - 搜索
  - 多选
  - 全选
  - 当前层级勾选
  - 默认前 200 条展示
  - 数千 key 场景的性能与正确性
- 验证回显格式必须保持 `父key-子key;父key-子key`
- 验证不同数据源类型下的 key 清单隔离
- 验证依赖页缺失或 key 清单为空时的提示行为
- 验证保存后重新进入编辑页，字段、校验方法、校验内容、规则描述、强弱规则均能正确回显
- 验证质量报告:
  - 通过场景不记录明细
  - 不通过场景可查看详情和日志
  - 详情标题、失败原因、详情说明符合 PRD 文案
- 验证强规则与弱规则在任务关联场景下的影响差异不被本需求破坏

## 8. 验收标准

| 场景类型 | 场景描述 | 预期结果 | 来源 |
|---------|---------|---------|------|
| 正常 | 新增或编辑 key 范围校验规则并保存 | 调用 `/valid/monitorRule/save` 成功，页面提示保存成功并可回显规则配置 | 源码 + PRD 原文 |
| 正常 | 校验方法为“包含”，待检数据 key 集合满足配置范围 | 质量报告展示“校验通过”，未通过原因为空，详情说明为符合规则描述 | PRD 原文 |
| 异常 | 校验方法为“包含”，待检数据缺失必需 key | 质量报告展示“校验不通过”，未通过原因显示“key范围校验未通过” | PRD 原文 |
| 正常 | 规则执行通过 | 不生成失败明细数据 | PRD 原文 |
| 异常 | 规则执行失败/不通过 | 支持通过 `/valid/monitorRecord/getLogByNum` 查看日志，并通过 `/valid/monitorRecord/monitorRuleRecordResult` 查看失败明细 | PRD 原文 + 源码 |
| 异常 | 校验内容依赖的 key 清单未维护 | 页面需明确提示“校验内容key信息需要在通用配置模块维护” | PRD 原文 |
