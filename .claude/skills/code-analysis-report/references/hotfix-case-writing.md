# Hotfix 用例编写规范

> 本规范专用于 **Mode E（Hotfix 用例生成）**，补充 `.claude/rules/test-case-writing.md` 中未覆盖的 Hotfix 场景特有规则。  
> 当本规范与 `test-case-writing.md` 冲突时，**本规范优先**。

---

## 零、用例标题格式（覆盖通用规范）

**通用规范** 使用优先级前缀：`【P0】验证xxx`

**Hotfix 用例使用禅道 Bug ID 前缀**，不标注优先级：

```
【{zentao_bug_id}】验证xxx
```

### ✅ 正确示例

```markdown
##### 【147514】验证 STARTING 状态超时 24 小时以上的分级规则被定时任务自动重置为可操作状态
##### 【145513】验证资产目录列表第二页数据正常加载
```

### ❌ 错误示例

```markdown
# 错误：使用优先级前缀
##### 【P0】验证超时分级规则被自动重置

# 错误：无前缀
##### 验证分级规则超时自动重置
```

---

## 一、frontmatter 规范

### Canonical Archive frontmatter 示例

```yaml
---
suite_name: "在线问题转化-{bugId}-{功能简述}"
description: "{一句话描述本用例验证的内容}"
# 若已关联到 PRD，再补充 prd_id / prd_version / prd_path / prd_url；
# 若暂无 PRD，请不要写空字符串占位。
product: "{module_key}" # 使用 .claude/config.json 中的模块 key
dev_version: "hotfix_{version}_{bugId}"
tags:
  - hotfix
  - online-case
  - {功能关键词1}
  - {功能关键词2}
create_at: "{YYYY-MM-DD}"
update_at: "{YYYY-MM-DD}"
status: "草稿"
health_warnings: []
repos:
  - ".repos/{org}/{repo}"
case_count: 1
origin: json
---
```

### Hotfix 来源信息记录方式

- Hotfix 场景来源于禅道 Bug 时，不要在 frontmatter 中新增 `title`、`zentao_bug_id`、`zentao_url` 等非 canonical 字段。
- `origin` 只能使用当前 shared schema 支持的值；Hotfix 示例统一写作 `origin: json`，表示该归档由结构化生成流程产出。
- 禅道 Bug ID / URL 写在正文的「问题背景 / 来源说明」段或完成报告中，例如：`> 来源：禅道 Bug #145513（http://zenpms.dtstack.cn/zentao/bug-view-145513.html）`
- 若未来确实要支持 `origin=zentao` 或专用 `zentao_*` frontmatter 字段，必须同步扩展 `.claude/shared/schemas/front-matter-schema.md` 与 `.claude/rules/archive-format.md`。

### ❌ 禁止行为

- 使用非 canonical `title` 字段
- `origin` 写成 `zentao`、`manual` 或其他当前 schema 不支持的值
- 在暂无 PRD 时把 `prd_id` / `prd_version` / `prd_path` 写成空字符串占位
- 将 `zentao_bug_id` / `zentao_url` 塞进当前 canonical Archive frontmatter

---

## 二、预期结果格式规范

### 核心规则

Hotfix 用例的预期结果，描述的是 **修复后的正确行为**，格式为：

```
xxx（修复后）
```

### ✅ 正确示例

```markdown
**预期结果：**
- 规则状态显示为「-」（无状态文字）+ 绿色圆点（修复后）
- 操作列显示「重新生效 / 编辑 / 删除」按钮（修复后）
- 数据库中该规则的 state 字段值变更为 STOP（修复后）
```

### ❌ 错误示例

```markdown
# 错误：描述修复前的失败行为
- 规则不应卡死在「分级中」状态（修复前）

# 错误：没有标注"修复后"
- 规则状态更新为 STOP

# 错误：使用"修复前"标注
- 状态不再卡死（修复前已修复）
```

---

## 三、步骤完整性要求

### 必须从零开始

Hotfix 用例通常需要构造特定的数据状态（如超时卡死的规则），步骤必须：

1. **从新建数据开始**，不假设测试数据已存在
2. **包含所有必填表单字段**，并给出具体示例值
3. **包含 SQL 操作步骤**（如需要强制修改状态），必须提供完整可执行的 SQL

### SQL 字段名验证

写 SQL 前，**必须**对照以下来源确认字段名：

1. Mapper XML 文件（`src/main/resources/mapper/`）
2. 建表 SQL（`src/main/resources/sql/`）
3. Entity 类字段名（注意驼峰 vs 下划线转换）

❌ **禁止猜测字段名**（常见错误：`deleted` vs `is_deleted`，`createTime` vs `create_time`）

### SQL 示例格式

```sql
-- 强制将规则设置为超时状态（模拟 24 小时前开始分级）
UPDATE {table_name}
SET state = 'STARTING',
    latest_start_time = DATE_SUB(NOW(), INTERVAL 25 HOUR)
WHERE name = '{规则名称}'
  AND is_deleted = 0;
```

---

## 四、导航路径确认规则

**必须**从以下来源确认导航路径，不得猜测：

| 来源文件 | 说明 |
| -------- | ---- |
| `apps/{product}/src/consts/navData/*.ts` | 菜单配置，包含完整的层级结构 |
| `apps/{product}/src/routers.tsx` | 路由配置，path → 页面名称映射 |

### 导航路径写法

```markdown
【{一级菜单} → {二级菜单} → {三级菜单}】
```

例：`【数据安全 → 数据分级分类 → 自动分级】`

---

## 五、文件命名规则

```
{hotfix_version}_{bugId}-{功能简述}.md
```

| 字段 | 规则 |
| ---- | ---- |
| `hotfix_version` | 完整版本字段，如 `hotfix_5.3.x` |
| `bugId` | 禅道 Bug ID 数字，如 `147514` |
| `功能简述` | 2-6 个中文字，描述 Bug 涉及的功能点，如「数据分级超时清理」、「资产目录列表分页」 |

---

## 六、自审查清单（生成用例后必须逐项验证）

- [ ] frontmatter 仅使用 canonical Archive 字段，未写 `title` / `zentao_*`
- [ ] `origin` 使用当前 schema 允许的值（Hotfix 示例默认 `json`），禅道来源信息写在正文说明或完成报告
- [ ] `status` 使用中文文档状态（如 `草稿`）
- [ ] 若暂无 PRD 信息，未把 `prd_id` / `prd_version` / `prd_path` 写成空字符串占位
- [ ] 导航路径与前端菜单配置文件一致（已对照源码）
- [ ] 表单字段与前端 TSX 源码一致（字段名、是否必填、长度限制）
- [ ] SQL 字段名与 Mapper XML / 建表 SQL 一致
- [ ] 所有预期结果末尾标注「（修复后）」
- [ ] 步骤从零开始（包含新建测试数据），无跳步假设
- [ ] 无模糊词（"应该"、"可能"、"参考"等）
- [ ] 文件存储在 `cases/archive/online-cases/`
- [ ] 根目录同名快捷链接已创建（使用 `refresh-latest-link.mjs`）
- [ ] 完成报告已在终端输出
