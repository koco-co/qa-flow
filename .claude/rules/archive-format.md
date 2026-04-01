# 归档 MD 格式规范

> 所有 Archive Markdown 统一写入 `cases/archive/` 根目录；历史文档、旧 Skill 文案或 Prompt 中的 `archive-cases/` 仅是旧称呼，不代表真实目录。

## 模板

````markdown
---
suite_name: "需求名称（与 PRD 一致）"
description: "一句话描述（≤60字）"
prd_id: 10001
prd_version: v1.0.0
prd_path: "cases/requirements/${module}/v${version}/【功能名】需求标题.md"
prd_url: "https://your-prd-url/..."
product: ${module_key}
dev_version: "${version}"
tags:
  - 关键词1
  - 关键词2
create_at: "YYYY-MM-DD"
update_at: "YYYY-MM-DD"
status: ""
health_warnings: []
repos:
  - ".repos/${org}/${repo}"
case_count: 0
origin: xmind
---

## 模块名称

### 菜单名称

#### 功能点名称

##### 【P1】验证xxxx

> 前置条件
```
1、xxx前置环境说明

2、${datasource_type} SQL语句准备:
DROP TABLE IF EXISTS ${schema}.${table};
CREATE TABLE ${schema}.${table} (...);
INSERT INTO ${schema}.${table} VALUES (...);
```

> 用例步骤

| 编号 | 步骤         | 预期         |
| ---- | ------------ | ------------ |
| 1    | 进入【xxx】页面 | 页面正常加载 |
| 2    | 操作步骤描述 | 预期结果描述 |

##### 【P2】验证xxxx

...
````

### Front-Matter 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `suite_name` | 是 | 需求名称（与蓝湖/PRD 一致），用于快速识别 |
| `description` | 是 | 一句话描述（≤60字） |
| `prd_id` | 是 | 需求 ID（数字，如 `10287`） |
| `prd_version` | 否 | 迭代版本号（如 `v6.4.10`） |
| `prd_path` | 是 | 关联 PRD 文档的相对路径 |
| `prd_url` | 否 | 蓝湖需求 URL |
| `product` | 是 | 模块 key（如 `${module_key}`） |
| `dev_version` | 否 | 开发版本 / 分支描述 |
| `tags` | 是 | 领域关键词（3-10个），核心检索字段；由脚本/Writer 自动推断 |
| `create_at` | 是 | 创建日期（YYYY-MM-DD） |
| `update_at` | 否 | 最后更新日期（YYYY-MM-DD） |
| `status` | 否 | 文档状态（draft / reviewed / archived） |
| `health_warnings` | 否 | 健康检查警告列表，如 `["W001: 缺少字段定义表"]` |
| `repos` | 否 | 参考仓库相对路径列表，如 `[".repos/${org}/${repo}"]` |
| `case_count` | 否 | 用例总数（自动统计 `#####` 标题数量，backfill 脚本写入） |
| `origin` | 否 | 来源类型：`xmind` / `csv` / `json` / `split` |

### Tags 检索用法

```bash
# 按关键词快速定位相关历史用例
grep -rl "${keyword}" cases/archive/ --include="*.md"

# 读取匹配文件的 front-matter 概览（前 15 行）
head -15 cases/archive/${module}/v${version}/PRD-xx-xxx.md
```

### Backfill 命令（为现有文件添加 front-matter）

```bash
node .claude/skills/archive-converter/scripts/backfill-archive-frontmatter.mjs --dry-run   # 预览
node .claude/skills/archive-converter/scripts/backfill-archive-frontmatter.mjs              # 执行
node .claude/skills/archive-converter/scripts/backfill-archive-frontmatter.mjs --force      # 强制覆盖
```

### 全量审计 / 安全修复

```bash
# 全量只读审计（archive + requirements）
node .claude/shared/scripts/audit-md-frontmatter.mjs --dry-run

# 仅审计某个目录/文件
node .claude/shared/scripts/audit-md-frontmatter.mjs --path cases/archive/${module}/
node .claude/shared/scripts/audit-md-frontmatter.mjs --path cases/requirements/${module}/v${version}/某需求.md

# 对可推断字段执行安全修复（仅修改 frontmatter）
node .claude/shared/scripts/audit-md-frontmatter.mjs --fix
```

- 默认只输出审计报告，不写文件；必须显式传 `--fix` 才会写回。
- 审计阶段会报告 body 规范问题（如 H1、优先级前缀、步骤标记），但自动修复只会改 frontmatter。
- 对 legacy frontmatter（`name/module/version/source/created_at`）会在 `--fix` 时迁移到 canonical 新字段。

## 层级映射

> 需求名称（`suite_name`）已移入 frontmatter，MD body 从 `##` 开始。

| MD 层级 | 含义     | CSV 来源     | XMind 来源       | JSON 来源          |
| ------- | -------- | ------------ | ---------------- | ------------------ |
| `##`    | 模块名称 | 所属模块列   | depth 1          | modules[].name     |
| `###`   | 菜单名称 | （无，跳过） | depth 2          | pages[].name       |
| `####`  | 功能点   | （无，跳过） | depth 3          | sub_groups[].name  |
| `#####` | 用例标题 | 用例标题列   | depth 4 / 叶节点 | test_cases[].title |

> CSV 数据仅有模块和用例两层，中间层级自然跳过。XMind 树型结构的深度自动映射到对应层级。

## 转化来源映射

实际模块列表定义在 `.claude/config.json` 的 `modules` 字段中。通用转化规则如下：

| 来源                              | 目标目录                          | 格式                    |
| --------------------------------- | --------------------------------- | ----------------------- |
| `cases/history/${module}/*.csv`   | `cases/archive/${module}/`        | 完整用例（含步骤+预期） |
| `cases/xmind/${module}/*.xmind`   | `cases/archive/${module}/`        | 标题树结构              |

## 文件粒度与命名

- **默认粒度**：一份 PRD 对应一份 Archive Markdown，不再优先生成“一个迭代一个超大 MD”的聚合文件。
- **默认命名**：当输入文件名可识别出 `PRD-XX-<功能名>` 时，Archive 输出文件名应优先保持同 basename，例如：
  - 输入：`PRD-26-质量问题台账.json`
  - 输出：`PRD-26-质量问题台账.md`
- **Story 聚合文件** 仅在用户明确要求统一汇总时使用，命名遵循 `Story-YYYYMMDD.md`。
- **新增/重跑策略**：模块级重跑或单 PRD 追加时，应优先写回对应的 PRD 级 Markdown，而不是继续扩大既有迭代总文件。
- **可读性阈值**：如单个归档文件已明显超出人工审阅范围，应进一步拆回 PRD 级文件，避免产生难以定位和 diff 的超长 Markdown。

## 版本目录归档规则（当模块配置了 trackerId 时适用）

> 以下规则仅在模块的 config 配置中包含 `trackerId` 字段时适用。

- 如模块配置了 `trackerId` 且可识别语义版本（如 `v${version}`），归档目录优先为 `cases/archive/${module}/v${version}/`。
- 如输入来自形式化需求页，文件名优先使用需求标题（`meta.archive_file_name` / `meta.requirement_title`），例如：
  - `【功能名】需求标题.md`
- 不再默认把整份需求文档聚合成一份归档；优先”一页需求 / 一份 MD”。
