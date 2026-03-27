# 归档 MD 格式规范

> 所有 Archive Markdown 统一写入 `cases/archive/` 根目录；历史文档、旧 Skill 文案或 Prompt 中的 `archive-cases/` 仅是旧称呼，不代表真实目录。

## 模板

````markdown
# 需求名称

> 来源：path/to/source
> 用例数：N

---

## 模块/菜单名称

### 页面名称

#### 功能点/子组名称

##### 用例标题 「P1」

> 前置条件
> ```
> 前置内容，没有则填：无
> ```

| 编号 | 步骤         | 预期         |
| ---- | ------------ | ------------ |
| 1    | 操作步骤描述 | 预期结果描述 |
| 2    | 操作步骤描述 | 预期结果描述 |

##### 下一条用例标题 「P2」

...
````

## 层级映射

| MD 层级 | 含义        | CSV 来源     | XMind 来源       | JSON 来源             |
| ------- | ----------- | ------------ | ---------------- | --------------------- |
| `#`     | 需求/文件名 | 文件名+版本  | 根节点标题       | meta.requirement_name |
| `##`    | 模块/菜单   | 所属模块列   | depth 1          | modules[].name        |
| `###`   | 页面        | （无，跳过） | depth 2          | pages[].name          |
| `####`  | 功能点/子组 | （无，跳过） | depth 3          | sub_groups[].name     |
| `#####` | 用例标题    | 用例标题列   | depth 4 / 叶节点 | test_cases[].title    |

> CSV 数据仅有模块和用例两层，中间层级自然跳过。XMind 树型结构的深度自动映射到对应层级。

## 转化来源映射

| 来源                                  | 目标目录                               | 格式                    |
| ------------------------------------- | -------------------------------------- | ----------------------- |
| `cases/history/xyzh/v0.x.x/*.csv`     | `cases/archive/custom/xyzh/<version>/` | 完整用例（含步骤+预期） |
| `cases/history/xyzh/*.csv`            | `cases/archive/custom/xyzh/`           | 完整用例（含步骤+预期） |
| `cases/xmind/custom/xyzh/*.xmind`     | `cases/archive/custom/xyzh/`           | 标题树结构              |
| `cases/xmind/batch-works/*.xmind`     | `cases/archive/batch-works/`           | 标题树结构              |
| `cases/xmind/data-assets/*.xmind`     | `cases/archive/data-assets/`           | 标题树结构              |
| `cases/xmind/data-query/*.xmind`      | `cases/archive/data-query/`            | 标题树结构              |
| `cases/xmind/variable-center/*.xmind` | `cases/archive/variable-center/`       | 标题树结构              |
| `cases/xmind/public-service/*.xmind`  | `cases/archive/public-service/`        | 标题树结构              |

## 文件粒度与命名

- **默认粒度**：一份 PRD 对应一份 Archive Markdown，不再优先生成“一个迭代一个超大 MD”的聚合文件。
- **默认命名**：当输入文件名可识别出 `PRD-XX-<功能名>` 时，Archive 输出文件名应优先保持同 basename，例如：
  - 输入：`PRD-26-质量问题台账.json`
  - 输出：`PRD-26-质量问题台账.md`
- **Story 聚合文件** 仅在用户明确要求统一汇总时使用，命名遵循 `YYYYMM-Story-YYYYMMDD.md`。
- **新增/重跑策略**：模块级重跑或单 PRD 追加时，应优先写回对应的 PRD 级 Markdown，而不是继续扩大既有迭代总文件。
- **可读性阈值**：如单个归档文件已明显超出人工审阅范围，应进一步拆回 PRD 级文件，避免产生难以定位和 diff 的超长 Markdown。
