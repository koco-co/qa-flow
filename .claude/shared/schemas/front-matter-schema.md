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
| `origin` | string | 可选 | — | 来源类型：xmind / csv / json / split |

## Tags 检索用法

```bash
# 按关键词快速定位相关历史用例
grep -rl "数据质量\|质量规则" cases/archive/ --include="*.md"

# 读取匹配文件的 front-matter 概览（前 20 行）
head -20 cases/archive/YYYYMM/PRD-xx-xxx.md
```
