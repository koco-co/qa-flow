---
prd_name: "【内置规则丰富】有效性，json中key对应的value值格式校验"
description: "为有效性校验新增按 JSON key 路径检查 value 格式的规则能力，并打通预览、报告和失败追踪链路"
prd_id: 15694
prd_version: "v6.4.10"
prd_source: "cases/requirements/data-assets/v6.4.10/【内置规则丰富】有效性，json中key对应的value值格式校验.md"
prd_url: "https://lanhuapp.com/web/#/item/project/product?tid=24a1c6b2-a52e-454c-8d51-8aff866598b1&pid=7de90493-e80f-4592-a263-38fb2d2e98c0&versionId=7991bb05-6f97-4b29-8ad6-de18b5869a4d&docId=fc0fee93-74f5-4eff-a769-99e68506b296&docType=axure&pageId=3035f5b47bed47fcb8a7a4a26fa7a701&image_id=fc0fee93-74f5-4eff-a769-99e68506b296&parentId=493e80b4-33c3-44cb-b880-42bee51dba19"
product: "data-assets"
dev_version: "6.3岚图定制化分支"
tags:
  - "内置规则"
  - "有效性校验"
  - "JSON格式校验"
  - "字段级规则"
  - "value格式"
  - "岚图定制化"
create_at: "2026-03-30"
update_at: "2026-03-30"
status: "enhanced"
health_warnings: []
repos:
  - ".repos/CustomItem/dt-center-assets"
  - ".repos/CustomItem/dt-insight-studio"
case_path: ""
---
<!-- enhanced-at: 2026-03-30T18:11:43.497878Z | images: lanhu+user-supplemented | health: 0 warnings -->

# [15694] 【内置规则丰富】有效性，json中key对应的value值格式校验

## 1. 基本信息

- 模块: `data-assets` / 数据质量
- 需求版本: `v6.4.10`
- 开发版本: `6.3岚图定制化分支`
- 分支上下文:
  - backend: `.repos/CustomItem/dt-center-assets` @ `release_6.3.x_ltqc`
  - frontend: `.repos/CustomItem/dt-insight-studio` @ `dataAssets/release_6.3.x_ltqc`
- 依赖需求:
  - `15696【通用配置】json格式配置`：维护 JSON key 层级与 key 对应 value 格式

## 2. 需求背景

在现有有效性校验能力中，系统已经具备字段枚举值、日期格式、自定义正则等校验框架，但还缺少“按 JSON key 路径校验对应 value 格式”的能力。本需求要求在规则库、规则配置、质量报告和失败明细链路中新增“格式-json格式校验”规则，使测试人员和业务人员可以直接对 json / string 类型字段中的指定 key 路径执行 value 格式验证。

结合蓝湖原型文本和用户补充截图，可以确认本需求的核心不是新增独立页面，而是在现有【规则任务管理】配置页内新增一类字段级有效性规则，并且依赖【通用配置 → JSON格式配置】中已维护的 key/value 格式作为候选数据源。

## 3. 变更范围

| 类别 | 影响对象 | 变更说明 |
|------|----------|----------|
| 内置规则 | 规则库配置 | 新增规则名称 `格式-json格式校验`，归属 `有效性校验 / 字段` |
| 规则配置 | 规则任务管理编辑页 | 在现有规则配置区域新增 `格式-json格式校验` 选项，提供校验 key 选择与 `value格式预览` 弹窗 |
| 通用配置依赖 | JSON格式配置 | 仅已维护 value 格式的 key 可被选择；key 路径数据来源于 15696 |
| 质量结果 | 数据质量报告详情 | 展示“符合/不符合规则 key 为 xxx 时的 value 格式要求” |
| 失败追踪 | 查看详情 / 查看日志 / 下载明细 | 失败时支持查看详情与日志，详情明细中校验字段标红，下载明细保持相同高亮语义 |

## 4. 页面与交互详细设计

### 4.1 规则库配置

- 菜单路径: `数据质量 → 规则库配置`
- 规则名称: `格式-json格式校验`
- 规则解释: `校验json类型的字段中key对应的value值是否符合规范要求`
- 规则分类: `有效性校验`
- 关联范围: `字段`
- 规则描述: 原型中展示为“校验json类型的字段中key对应的value值是否符合规范要求”
- 交互要求:
  - 悬浮提示内容复用规则库中的“规则解释”
  - 新规则在配置页的可选项位置放在“自定义正则”上方

### 4.2 规则任务管理 - 新建/编辑单表校验规则页

- 菜单路径: `数据质量 → 规则任务管理`
- 页面沿用现有三步向导: `监控对象 → 监控规则 → 调度属性`
- 在 `监控规则` 步骤新增 `格式-json格式校验` 统计函数/规则类型

#### 4.2.1 字段定义

| 字段 | 类型 | 规则 |
|------|------|------|
| 字段 | 单选 | 仅支持 `json`、`string` 类型字段 |
| 统计函数 | 单选 | 新增 `格式-json格式校验` |
| 校验 key | 树形多选 | 回显格式为 `key1-key2;key11-key22` |
| value格式预览 | 弹窗入口 | 点击后仅展示已勾选 key 对应的 value 格式 |
| 过滤条件 | 条件配置 | 沿用现有过滤条件能力 |
| 强弱规则 | 单选 | 沿用现有强规则/弱规则能力 |
| 规则描述 | 文本 | 沿用现有描述输入能力 |

#### 4.2.2 交互规则

- 配置后需按照层级进行校验，key 名按层级路径匹配是否存在对应 key 信息
- 支持数据源类型: `doris3.x`、`sparkthrift2.x`、`hive2.x`
- `格式-json格式校验` 仅支持 `json`、`string` 类型字段
- 仅已维护 value 格式的 key 可以被勾选，没有维护 value 格式的 key 置灰不可选
- 若 key 数据量很大，默认仅加载前 200 条，支持分页继续查看
- 勾选仅对当前层级生效，不因勾选父节点自动选中兄弟节点
- 已选 key 默认仅展示前两个，鼠标悬浮时展示完整 key 列表
- `value格式预览` 弹窗只展示当前已勾选 key 及其正则格式信息

### 4.3 数据质量报告与失败追踪

- 菜单路径: `数据质量 → 数据质量报告`
- 报告列表支持按报告名称检索并进入详情
- 详情页对本规则的展示要求:

| 场景 | 质检结果 | 未通过原因 | 详情说明 | 操作 |
|------|----------|------------|----------|------|
| 通过 | 校验通过 | `--` | `符合规则key为“... ”时的value格式要求` | 不展示查看详情 |
| 不通过 | 校验不通过 | `key对应value格式校验未通过` | `不符合规则key为“... ”时的value格式要求` | 展示查看详情；失败时可查看日志 |

- 查看详情标题改为: `查看“有效性校验-格式-json格式校验”明细`
- 明细数据需保留全部字段，校验字段标红展示，下载明细数据中对应字段保持相同高亮语义
- 对于“校验通过”的规则，不记录失败明细数据；对于“校验失败”的规则，支持查看日志

### 4.4 依赖模块说明

- `校验 key` 和 `value 格式` 均依赖 15696 中的 JSON 格式配置
- 用户补充截图进一步确认:
  - 校验 key 下拉树会展示中文名称
  - `value格式预览` 弹窗以表格方式展示 `key / value格式`
  - 结果查询页在失败场景中会打开右侧详情抽屉，展示未通过样本并高亮目标字段

## 5. 源码补充事实

- 前端实际菜单名已确认存在: `规则任务管理`、`规则库配置`、`数据质量报告`、`通用配置`
- 前端 `apps/dataAssets/src/views/valid/ruleConfig/edit/components/rule/index.tsx` 已具备规则配置通用容器与字段联动框架
- 前端 `apps/dataAssets/src/consts/index.ts` 中已有格式类函数枚举: `FORMAT_DATE=31`、`FORMAT_DATETIME=32`、`FORMAT_CUSTOM=33`
- 后端 `MonitorRule` / `MonitorRuleExpansion` / `FunctionConfigFactory` 已具备以 `functionId + expansion` 持久化规则扩展配置的能力
- 当前分支中尚未检出“格式-json格式校验”专属常量与页面文案，因此本需求更接近“在现有通用框架中补齐专属规则”的状态

## 6. 测试关注点

- 验证规则库中新增规则的展示、分类、解释文案和入口顺序
- 验证 `格式-json格式校验` 选择后字段范围被限制为 `json/string`
- 验证 key 选择树的层级勾选、默认 200 条加载、分页、禁选逻辑与悬浮回显
- 验证 `value格式预览` 只展示已勾选 key 对应的 regex 信息
- 验证保存、编辑回显和跨数据源的 key 数据隔离
- 验证质量报告对通过/失败的详情说明、查看详情、查看日志与下载明细行为
