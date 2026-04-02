# Front-Matter 统一 Schema

> 本文件是 qa-flow 所有 Markdown 文档 front-matter 的权威 Schema 定义。
> 所有 backfill 脚本、Writer/Reviewer Subagent 输出模板必须与本 Schema 保持一致。
> 全量审计/修复入口：`node .claude/shared/scripts/audit-md-frontmatter.mjs --dry-run`（预览） / `--fix`（写回可推断字段）。

## 用例归档（Archive）Front-Matter

```yaml
suite_name: "需求名称（与蓝湖/PRD 一致）"
description: "一句话描述（≤60字）"
# 若已关联 PRD，再填写以下字段；若暂无 PRD，请整段省略，不写空字符串占位
prd_id: 10287                          # 需求 ID（数字）
prd_version: v6.4.10                   # 迭代版本
prd_path: "关联 PRD 文档相对路径"
prd_url: "https://lanhuapp.com/..."    # 蓝湖 URL，无则留空
product: data-assets                   # 模块 key（data-assets / xyzh 等）
dev_version: "6.3岚图定制化分支"       # 开发版本，无则留空
tags:
  - 关键词1
  - 关键词2
create_at: "YYYY-MM-DD"
update_at: "YYYY-MM-DD"
status: ""                             # 草稿 / 已评审 / 已归档（脚本内部 canonical 归一化为 draft / reviewed / archived）
health_warnings:
  - "W001: ..."
repos:
  - ".repos/DTStack/dt-center-assets"
```

可选字段（脚本自动写入）：`case_count`（用例总数，统计 `#####` 标题数）、`origin`（来源：xmind/csv/json/split）

## PRD 文档 Front-Matter

```yaml
prd_name: "需求名称（与蓝湖一致）"
description: "一句话描述（≤60字）"
prd_id: 10287                          # 需求 ID（数字）
prd_version: v6.4.10                   # 迭代版本
prd_source: "PRD 文档相对路径或来源描述"
prd_url: "https://lanhuapp.com/..."    # 蓝湖 URL，无则留空
product: data-assets                   # 模块 key
dev_version: "6.3岚图定制化分支"       # 开发版本，无则留空
tags:
  - 关键词1
create_at: "YYYY-MM-DD"
update_at: "YYYY-MM-DD"
status: ""                             # 未开始 / 已澄清 / 已形式化 / 已增强（脚本内部 canonical 归一化为 raw / elicited / formalized / enhanced）
health_warnings: []                    # 增强后填入，如 ["W001: 缺少字段定义表"]
repos:
  - ".repos/DTStack/dt-center-assets"
case_path: ""                          # 关联的用例文件路径
```

## 字段说明

| 字段 | 类型 | Archive | PRD | 说明 |
|------|------|---------|-----|------|
| `suite_name` | string | 必填 | — | 需求名称（用例侧） |
| `prd_name` | string | — | 必填 | 需求名称（PRD 侧） |
| `description` | string | 必填 | 必填 | 一句话描述（≤60字） |
| `prd_id` | number | 有关联 PRD 时填写 | 必填 | 需求 ID |
| `prd_version` | string | 有关联 PRD 时填写 | 必填 | 迭代版本号，如 v6.4.10 |
| `prd_path` | string | 有关联 PRD 时填写 | — | 关联 PRD 文档相对路径 |
| `prd_source` | string | — | 必填 | PRD 来源路径或描述 |
| `prd_url` | string | 有关联 PRD 时可选 | 可选 | 蓝湖 URL |
| `product` | string | 必填 | 必填 | 模块 key（同原 module 字段值） |
| `dev_version` | string | 可选 | 可选 | 开发版本 / 分支描述 |
| `tags` | string[] | 必填 | 可选 | 领域关键词（检索核心，3-10个） |
| `create_at` | string | 必填 | 必填 | 创建日期（YYYY-MM-DD） |
| `update_at` | string | 可选 | 可选 | 最后更新日期 |
| `status` | string | 可选 | 可选 | Archive 写回：`草稿 / 已评审 / 已归档`；PRD 写回：`未开始 / 已澄清 / 已形式化 / 已增强` |
| `health_warnings` | string[] | 可选 | 可选 | 健康检查警告列表 |
| `repos` | string[] | 可选 | 可选 | 参考仓库相对路径列表 |
| `case_path` | string | — | 可选 | 关联用例文件路径 |
| `case_count` | number | 可选 | — | 用例总数（自动统计 body 中 `#####` 标题数量） |
| `origin` | string | 可选 | — | 来源类型：xmind / csv / json / split / zentao |
| `zentao_bug_id` | number | Issues 专用 | — | 禅道 Bug ID（数字，不加引号） |
| `zentao_url` | string | Issues 专用 | — | 禅道 Bug 完整 URL |
| `keywords` | string | Issues 专用 | — | 6位竖线分隔：`版本\|模块\|数据源\|集群\|修复版本\|Bug原因` |

## 线上问题用例（Issues）Front-Matter

> 存储路径：`cases/issues/YYYYMM/`，与 `cases/archive/` 完全分离，不混用。

```yaml
suite_name: "在线问题转化"
description: "一句话描述本用例验证的内容（≤60字）"
# 无关联 PRD，整段省略 prd_id / prd_version / prd_path / prd_url，不写空字符串占位
product: "dataAssets"              # 模块 key
zentao_bug_id: 141713              # 数字，不加引号
zentao_url: "http://zenpms.dtstack.cn/zentao/bug-view-141713.html"
dev_version: "hotfix_6.3.x_141713"
tags:
  - hotfix
  - online-case
  - 功能关键词1
  - 功能关键词2
keywords: "6.3|元数据同步|DmMySQL||6.3|SQL缺少逗号"  # 6位竖线分隔，未知项留空
create_at: "YYYY-MM-DD"
update_at: "YYYY-MM-DD"
status: "草稿"                     # 与 Archive 统一使用中文：草稿 / 已评审 / 已归档
repos:
  - ".repos/{org}/{repo}"
case_count: 1
origin: zentao                     # 固定值，不得写 xmind / json 等其他值
```

**与 Archive 用例的关键区别：**

| 维度 | Archive 用例 | Issues 用例 |
|---|---|---|
| 存储路径 | `cases/archive/YYYYMM/` | `cases/issues/YYYYMM/` |
| `origin` | xmind / csv / json / split | zentao（固定）|
| `suite_name` | 需求名称 | 固定写 `"在线问题转化"` |
| prd 字段 | 有关联 PRD 时填写 | 整段省略（无 PRD）|
| 禅道字段 | 无 | `zentao_bug_id` / `zentao_url` 必填 |
| `keywords` | 无 | 必填（6位竖线分隔）|
| 用例标题前缀 | `【P0/P1/P2】` | `【bugId】`（禅道 Bug ID）|
| 预期结果格式 | 描述正确行为 | 修复前 + 修复后 双行对比 |

## Tags 检索用法

```bash
# 按关键词快速定位相关历史用例
grep -rl "数据质量\|质量规则" cases/archive/ --include="*.md"

# 读取匹配文件的 front-matter 概览（前 20 行）
head -20 cases/archive/YYYYMM/PRD-xx-xxx.md
```
