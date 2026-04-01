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

### 必须字段与示例值

```yaml
---
title: "「在线问题转化」{功能简述}"
suite_name: "在线问题转化"
description: "{一句话描述本用例验证的内容}"
prd_id: ""          # 必须为空字符串，不填禅道 ID
prd_version: ""     # 必须为空字符串
prd_path: ""        # 必须为空字符串
product: "{产品名}" # 如 metadata、dataAssets、engine 等
zentao_bug_id: {bugId}   # 数字，不加引号
zentao_url: "http://zenpms.dtstack.cn/zentao/bug-view-{bugId}.html"
dev_version: "hotfix_{version}_{bugId}"
tags:
  - hotfix
  - online-case
  - {功能关键词1}
  - {功能关键词2}
keywords: "{大版本}|{模块}|{数据源类型}|{集群类型}|{最低修复版本}|{Bug原因}"
create_at: "{YYYY-MM-DD}"
update_at: "{YYYY-MM-DD}"
status: "draft"
repos:
  - ".repos/{org}/{repo}"
case_count: 1
origin: zentao    # 必须为 zentao，不得为 xmind 或其他值
---
```

### ❌ 禁止行为

- `prd_id` / `prd_version` / `prd_path` 填写任何非空值
- `origin` 写成 `xmind`、`manual` 或其他值
- 遗漏 `zentao_bug_id` 或 `zentao_url` 字段

### keywords 字段提取规则

`keywords` 为 6 位竖线分隔字符串，对应顺序固定，未知项留空（保留竖线）：

| 位置 | 含义 | 提取来源 | 示例 |
|------|------|---------|------|
| 1 | 发现的大版本 | 禅道重现步骤中技术支持的标注，或 bug 标题前缀如 `【5.0】` | `5.0` |
| 2 | 模块 | bug 标题中的顶部菜单名，如 `【数据质量】` | `数据质量` |
| 3 | 数据源类型 | 禅道步骤/标题中提及的数据源类型 | `TiDB`、`MySQL` |
| 4 | 集群类型 | 禅道步骤/标题中提及的集群类型 | `Hadoop`、`Flink` |
| 5 | 真实解决的最低版本 | `fixBranches.version` 提取，如 `hotfix_5.0.x_138845` → `5.0` | `5.0` |
| 6 | Bug 原因 | 基于代码分析得出的根因简述 | `SQL解析失败`、`空指针异常` |

**示例**：`"5.0| 规则配置 | TiDB | | 5.0 | 自定义SQL解析报错"`

---

## 二、预期结果格式规范

### 核心规则

Hotfix 用例的预期结果必须**同时描述修复前和修复后的行为**，格式为：

```
修复前：xxx
修复后：xxx
```

- **修复前**：描述 Bug 触发时的错误表现（页面报错、状态卡死、数据异常等）
- **修复后**：描述修复后的正确行为（可观测的具体表现）

### ✅ 正确示例

```markdown
**预期结果：**
修复前：规则状态卡死在「分级中」，操作列「重新生效 / 编辑 / 删除」按钮不可用
修复后：规则状态显示为「-」（无状态文字）+ 绿色圆点，操作列恢复「重新生效 / 编辑 / 删除」按钮
```

```markdown
**预期结果：**
修复前：点击【保存】按钮后页面提示"自定义SQL解析失败"，规则无法保存
修复后：规则保存成功，页面提示"保存成功"，列表中新增该规则记录
```

### ❌ 错误示例

```markdown
# 错误：只写修复后，缺少修复前对比
- 规则状态显示为「-」，操作列恢复按钮（修复后）

# 错误：没有「修复前/修复后」标签，无法区分
- 规则状态更新为 STOP

# 错误：修复前描述的是"不应该"而非实际错误表现
修复前：规则不应卡死在「分级中」状态
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

## 五、文件命名与存储规则

**文件名格式：**

```
{hotfix_version}_{bugId}-{功能简述}.md
```

| 字段 | 规则 |
| ---- | ---- |
| `hotfix_version` | 完整版本字段，如 `hotfix_5.3.x` |
| `bugId` | 禅道 Bug ID 数字，如 `147514` |
| `功能简述` | 2-6 个中文字，描述 Bug 涉及的功能点，如「数据分级超时清理」、「资产目录列表分页」 |

**存储路径：**

```
cases/archive/online-cases/{yyyy-MM-dd}/{hotfix_version}_{bugId}-{功能简述}.md
```

按用例**生成日期**创建子目录，同一天生成的多条用例存放在同一个日期目录下。

---

## 六、禅道 Bug 信息映射规则

> 通过 `node .claude/shared/scripts/fetch-zentao-bug.mjs {bugId}` 获取禅道数据后，按以下规则注入到用例中。

| 禅道字段 | 注入位置 | 处理规则 |
|---------|---------|---------|
| `title` | `description` frontmatter + 用例标题 | 从标题中提炼功能模块和动作，去掉"server runtime error"等技术噪音 |
| `steps` | 前置条件 `>` 块 | 提炼数据环境要求（数据源、表、SQL）；图片引用（`[图片]`）跳过 |
| `result` | 预期结果，末尾加「（修复后）」 | 若为空则完全基于代码变更推断期望行为 |
| `severity` | tags 参考（不写入 frontmatter） | severity=1/2 → 核心主流程；3/4 → 边界/兼容性场景 |
| `status` | 无需写入 | 确认 Bug 已 resolved，当前测试是回归验证 |

### 禅道访问失败降级

```
⚠ 禅道访问失败，已基于代码变更继续生成用例
```

用例底部添加备注：

```markdown
> 注：禅道信息不可用，本用例基于代码变更生成。如需补充 Bug 背景，请参考：{zentao_url}
```

---

## 七、自审查清单（生成用例后必须逐项验证）

- [ ] `origin: zentao`，`prd_id/prd_version/prd_path` 均为空字符串
- [ ] `zentao_bug_id` 为数字类型（非字符串）
- [ ] `keywords` 已填写（6个位置，未知项留空，格式：`版本|模块|数据源|集群|修复版本|原因`）
- [ ] 导航路径与前端菜单配置文件一致（已对照源码）
- [ ] 表单字段与前端 TSX 源码一致（字段名、是否必填、长度限制）
- [ ] SQL 字段名与 Mapper XML / 建表 SQL 一致
- [ ] 所有预期结果同时包含「修复前：xxx」和「修复后：xxx」两行
- [ ] 步骤从零开始（包含新建测试数据），无跳步假设
- [ ] 无模糊词（"应该"、"可能"、"参考"等）
- [ ] 文件存储在 `cases/archive/online-cases/{yyyy-MM-dd}/`
- [ ] 根目录同名快捷链接已创建（使用 `refresh-latest-link.mjs`）
- [ ] 完成报告已在终端输出
