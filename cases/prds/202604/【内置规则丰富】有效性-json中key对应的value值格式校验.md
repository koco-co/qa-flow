---
prd_name: "【内置规则丰富】有效性-json中key对应的value值格式校验"
description: "有效性校验支持 json key 对应 value 格式校验，并覆盖预览、规则包、任务运行和结果回归链路"
prd_id: 15694
prd_version: "v6.4.10"
prd_source: "cases/prds/202604/【内置规则丰富】有效性-json中key对应的value值格式校验.md"
prd_url: "https://lanhuapp.com/web/#/item/project/product?tid=24a1c6b2-a52e-454c-8d51-8aff866598b1&pid=7de90493-e80f-4592-a263-38fb2d2e98c0&versionId=236fbc84-10a3-4808-9559-66c1ef54ae55&docId=fc0fee93-74f5-4eff-a769-99e68506b296&docType=axure&pageId=e08ead471bc2471489e6fc7443d060c6&image_id=fc0fee93-74f5-4eff-a769-99e68506b296&parentId=9a152fb2-6417-4ee0-8df3-6f74f7deb413"
product: "data-assets"
dev_version: "6.3岚图定制化分支"
tags:
  - "有效性校验"
  - "json value校验"
  - "格式-json格式校验"
  - "value格式预览"
  - "数据质量"
  - "结果查询"
  - "规则包"
create_at: "2026-04-03"
update_at: "2026-04-03"
status: 已增强
health_warnings:
  - "W001: value格式预览的分页大小、排序规则、搜索能力未明确"
  - "W002: value格式测试失败时的具体提示文案未明确"
repos: []
case_path: ""
---

# 【内置规则丰富】有效性-json中key对应的value值格式校验

## 需求概述

- 有效性校验新增 `格式-json格式校验`。
- 用于校验 json 字段中指定 key 对应的 value 是否满足配置好的 value 格式。
- 本需求依赖 15696 提供的 key 和 value 格式配置数据。

## 依赖关系

- 依赖 `【通用配置】json格式配置`：
  - 校验 key 来源于 15696 的 key 配置。
  - value 格式规则来源于 15696 的 value 格式配置。

## 规则配置

- 新增规则：`格式-json格式校验`
- 位置要求：
  - 放在**自定义正则**上方

| 配置项 | 规则 |
| --- | --- |
| 字段 | 仅支持 `json`、`string` 字段 |
| 统计规则 | `格式-json格式校验` |
| 校验 key | 来源于 15696；支持搜索、多选、全选；默认展示前 200 条；仅当前层级生效 |
| key 选择限制 | 仅**已配置 value 格式**的 key 可被选中 |
| value格式预览 | 仅展示勾选 key 对应数据；支持分页 |
| 支持数据源 | `doris3.x` / `sparkthrift2.x` / `hive2.x` |

## 预览与提示

- `value格式预览` 点击后展示预览弹窗。
- 悬浮提示：
  - `校验内容为key名对应的value格式是否符合要求，value格式需要在通用配置模块维护。`
- key 较多时：
  - 默认展示前 200 条
  - 需考虑千级 key 与多层级场景
  - 勾选仅对当前层级生效
  - 鼠标悬浮默认仅展示前两个 key

## 结果查询 / 质量报告 / 日志

- 校验不通过：
  - 支持查看明细
  - 明细标题：`查看“有效性校验-格式-json格式校验”明细`
  - 明细保留全部字段，校验字段标红
  - 下载明细中校验字段也标红
- 校验通过：
  - 不记录明细数据
- 校验失败：
  - 支持查看日志

### 质量报告文案

- 通过：
  - `符合规则key为“key1-key2;key11-key22…”时的value格式要求`
- 不通过原因：
  - `key对应value格式校验未通过`
- 不通过详情：
  - `不符合规则key为“key1-key2;key11-key22…”时的value格式要求`

## 配套任务场景

- 支持在规则任务配置页新建任务绑定 `格式-json格式校验`。
- 支持抽样场景、分区场景下配置并运行该规则。
- 支持在规则包中配置该规则，再由新建规则任务绑定规则包。
- 当 key 配置已关联质量任务后，在 15696 页面删除 key，历史规则仍需正常回显，质量任务仍需正常运行。
- 用户补充要求：脏数据库变更后，脏数据存储功能仍需正常。

## 重点测试关注点

1. 千级 key、多层级、前 200 条展示、仅当前层级生效的组合场景。
2. 未配置 value 格式 key 的禁选逻辑与 `value格式预览` 的已选展示逻辑。
3. 通过 / 不通过 / 失败三条结果路径的详情、日志、下载标红。
4. 抽样、分区、规则包绑定和历史 key 被删除后的回归链路。

## 非阻断待确认事项

1. `value格式预览` 的分页大小、排序规则、搜索能力未明确。
2. `value格式` 测试失败时的具体提示文案未明确。

## 图片增强结果

- 当前 PRD 未内嵌图片引用，本次增强基于蓝湖页面文本分析和用户补充截图完成。

## PRD 健康度预检

**结论：** 可继续进入测试用例生成，当前为**有警告、无阻断**状态。

| 级别 | 数量 | 说明 |
| --- | --- | --- |
| Errors | 0 | 无阻断缺口 |
| Warnings | 2 | 预览分页规则与 value 格式失败提示待确认 |

## 相关资源

| 资源类型 | 链接 / 路径 |
| --- | --- |
| 蓝湖原型 | https://lanhuapp.com/web/#/item/project/product?tid=24a1c6b2-a52e-454c-8d51-8aff866598b1&pid=7de90493-e80f-4592-a263-38fb2d2e98c0&versionId=236fbc84-10a3-4808-9559-66c1ef54ae55&docId=fc0fee93-74f5-4eff-a769-99e68506b296&docType=axure&pageId=e08ead471bc2471489e6fc7443d060c6&image_id=fc0fee93-74f5-4eff-a769-99e68506b296&parentId=9a152fb2-6417-4ee0-8df3-6f74f7deb413 |
| 依赖配置 | cases/prds/202604/【通用配置】json格式配置.md |
