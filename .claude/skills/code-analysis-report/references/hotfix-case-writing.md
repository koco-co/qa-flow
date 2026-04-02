# Hotfix 用例编写规范

> 本规范专用于 **Mode E（Hotfix 用例生成）**，覆盖 `.claude/rules/test-case-writing.md` 中未涉及的 Hotfix 场景特有规则。
> 当本规范与 `test-case-writing.md` 冲突时，**本规范优先**。
> Frontmatter Schema 权威定义见 `.claude/shared/schemas/front-matter-schema.md` 的「线上问题用例」节。

---

## 零、用例标题格式（覆盖通用规范）

通用规范使用优先级前缀：`【P0】验证xxx`

**Hotfix 用例使用禅道 Bug ID 前缀**，不标注优先级：

```
【{zentao_bug_id}】验证xxx
```

### ✅ 正确示例

```markdown
##### 【147514】验证 STARTING 状态超时 24 小时以上的分级规则被定时任务自动重置为可操作状态
##### 【141713】验证底层库为 DmMySQL 时元数据同步周期同步任务列表正常加载
```

### ❌ 错误示例

```markdown
##### 【P0】验证超时分级规则被自动重置      # 错误：使用优先级前缀
##### 验证分级规则超时自动重置              # 错误：无前缀
```

---

## 一、Frontmatter 规范

### 模板

```yaml
---
suite_name: "在线问题转化"
description: "{一句话描述本用例验证的内容（≤60字）}"
# 无关联 PRD，整段省略 prd_id / prd_version / prd_path / prd_url，不写空字符串占位
product: "{模块key}"          # 如 dataAssets、metadata、engine 等
zentao_bug_id: {bugId}        # 数字，不加引号
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
status: "草稿"
repos:
  - ".repos/{org}/{repo}"
case_count: 1
origin: zentao
---
```

### 禁止行为

- `prd_id` / `prd_version` / `prd_path` 写任何值（包括空字符串），Hotfix 用例无 PRD，整段省略
- `origin` 写成 `xmind`、`json`、`manual` 等，必须为 `zentao`
- `status` 写英文 `draft`，必须写中文 `草稿`
- 写 `title` 字段（不在 canonical schema 中）
- 遗漏 `zentao_bug_id` 或 `zentao_url`

### keywords 字段提取规则

`keywords` 为 6 位竖线分隔字符串，未知项留空（保留竖线）：

| 位置 | 含义 | 提取来源 |
|------|------|---------|
| 1 | 大版本 | 禅道步骤标注或 bug 标题前缀，如 `【5.0】` |
| 2 | 模块 | bug 标题中的顶部菜单名 |
| 3 | 数据源类型 | 禅道步骤/标题中提及的数据源 |
| 4 | 集群类型 | 禅道步骤/标题中提及的集群 |
| 5 | 最低修复版本 | 从 `hotfix_{version}` 提取 |
| 6 | Bug 原因 | 基于代码分析的根因简述 |

示例：`"6.3|元数据同步|DmMySQL||6.3|SQL查询缺少逗号"`

---

## 二、Body 层级结构

Hotfix 用例 body 从 `##` 开始，遵循与 Archive 相同的层级规则：

```
## 模块名称          ← 顶级菜单，如「元数据」「数据资产」
### 页面/菜单名称    ← 如「元数据同步」「资产目录」
##### 【bugId】验证xxx   ← 用例标题（无 #### 功能子组时可直接到 #####）
```

### ✅ 正确示例

```markdown
## 元数据
### 元数据同步
##### 【141713】验证底层库为 DmMySQL 时元数据同步周期同步任务列表正常加载
```

### ❌ 错误示例

```markdown
## 「在线问题转化」DmMySQL底层库下元数据同步任务列表加载   # 错误：标题描述写成 ## 层级
##### 【141713】验证...                                    # 错误：缺少中间层级
```

---

## 三、前置条件格式

格式固定为 `> 前置条件` 标签 + 紧跟代码块，内含编号条目和完整 SQL：

````markdown
> 前置条件
```
1、{环境说明，如：dt-center-metadata 已部署 hotfix_6.3.x_141713 版本，底层数据库为 DmMySQL}

2、{数据源类型} SQL语句准备:
DROP TABLE IF EXISTS {schema}.{table};
CREATE TABLE {schema}.{table} (
  id          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  name        VARCHAR(100) NOT NULL COMMENT '任务名称',
  data_source VARCHAR(50)  NOT NULL COMMENT '数据源名称',
  state       VARCHAR(20)  NOT NULL COMMENT '任务状态',
  create_time DATETIME     NOT NULL COMMENT '创建时间',
  PRIMARY KEY (id)
);
INSERT INTO {schema}.{table} (name, data_source, state, create_time) VALUES
  ('test_sync_task', 'test_mysql_source', 'RUNNING', NOW());
```
````

### 规则

- `> 前置条件` 与代码块之间不换行，紧跟在同一块内
- 条目编号使用中文顿号格式：`1、` `2、` `3、`
- **涉及数据库操作、任务状态、分页数据等场景，前置条件必须包含完整建表 + 插入语句**
- 字段名必须与 Mapper XML / Entity 类一致，禁止猜测
- 多数据源时每种数据源单独给出

### ❌ 禁止格式

```markdown
**前置条件：** >           # 错误：混用加粗和引用
**操作步骤：**             # 错误
前置条件：                 # 错误：无 > 标签、无代码块
```

---

## 四、步骤表格格式

步骤表前必须有 `> 用例步骤` 标签，表头固定为 `| 编号 | 步骤 | 预期 |`：

```markdown
> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【{一级菜单} → {二级菜单}】页面 | 页面正常加载 |
```

### ❌ 禁止格式

```markdown
**操作步骤：**                        # 错误：应为 > 用例步骤
| 步骤 | 操作 | 预期结果 |            # 错误：列名不对
```

---

## 五、预期结果格式（覆盖通用规范）

Hotfix 用例在触发验证的步骤的「预期」列中，**同时写修复前和修复后**，两行对比：

```
修复前：{Bug 触发时的错误表现}
修复后：{修复后的正确行为}
```

预期结果写在表格「预期」列内，不单独列出，不加 `**预期结果：**` 标题。

### ✅ 正确示例

```markdown
> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【元数据 → 元数据同步】页面，点击【周期同步】Tab | 页面正常加载 |
| 2 | 在弹窗中选择数据源 `test_mysql_source`，完成调度配置后点击【确定】 | 提示「新增周期同步任务成功」 |
| 3 | 刷新页面，重新进入【元数据 → 元数据同步】，点击【周期同步】Tab | 修复前：列表报 SQL 语法错误，区域加载失败或显示空数据<br>修复后：周期同步任务列表正常加载，新增任务记录完整展示 |
```

### ❌ 错误示例

```markdown
# 错误：修复前/修复后单独列在表格外
**预期结果：**
修复前：列表报SQL语法错误
修复后：列表正常加载

# 错误：只写修复后，无修复前对比
| 3 | 重新进入页面 | 列表正常加载（修复后）|

# 错误：修复前描述"不应该"而非实际错误表现
修复前：列表不应该报错
```

---

## 六、步骤完整性要求

1. **从新建数据开始**，不假设测试数据已存在
2. **包含所有必填表单字段**，给出具体示例值
3. **需要强制构造特定数据状态时**（如超时卡死），必须在前置条件或步骤中提供完整可执行的 SQL

SQL 字段名写入前必须对照：
- Mapper XML（`src/main/resources/mapper/`）
- 建表 SQL（`src/main/resources/sql/`）
- Entity 类（注意驼峰 vs 下划线转换）

---

## 七、导航路径确认规则

优先从前端源码确认，若前端仓库不可用则从历史用例交叉验证，并标记「待前端源码确认」：

| 来源文件 | 说明 |
|----------|------|
| `apps/{product}/src/consts/navData/*.ts` | 菜单层级配置 |
| `apps/{product}/src/routers.tsx` | 路由配置 |

写法：`进入【{一级菜单} → {二级菜单}】页面`

---

## 八、文件命名与存储

```
cases/issues/YYYYMM/{hotfix_version}_{bugId}-{功能简述}.md
```

- `YYYYMM`：用例生成的年月，如 `202604`
- `功能简述`：2-6 个中文字，如 `元数据同步列表加载`、`资产目录列表分页`

---

## 九、禅道 Bug 信息映射

通过 `node .claude/shared/scripts/fetch-zentao-bug.mjs {bugId}` 获取禅道数据：

| 禅道字段 | 注入位置 | 处理规则 |
|---------|---------|---------|
| `title` | `description` frontmatter + 用例标题 | 提炼功能模块和动作，去掉技术噪音 |
| `steps` | 前置条件代码块 | 提炼数据环境要求；图片引用跳过 |
| `result` | 步骤表格「修复前」行 | 对照填写错误表现 |
| `severity` | tags 参考（不写入 frontmatter）| severity=1/2 → 核心主流程 |

**禅道访问失败降级**：用例底部添加备注：

```markdown
> 注：禅道信息不可用，本用例基于代码变更生成。如需补充 Bug 背景，请参考：{zentao_url}
```

---

## 十、自审查清单

- [ ] `origin: zentao`，`status: "草稿"`（中文）
- [ ] 无 `title` 字段；无 `prd_id / prd_version / prd_path`（整段省略，不写空字符串）
- [ ] `zentao_bug_id` 为数字类型，`zentao_url` 已填写
- [ ] `keywords` 已填写（6位竖线分隔，未知项留空）
- [ ] body 层级正确：`## 模块 → ### 菜单 → ##### 【bugId】验证xxx`
- [ ] 前置条件使用 `> 前置条件` + 代码块格式，含完整建表/插入 SQL
- [ ] 步骤表头为 `| 编号 | 步骤 | 预期 |`，步骤表前有 `> 用例步骤` 标签
- [ ] 修复前/修复后写在步骤表格「预期」列内，不单独列出
- [ ] 导航路径已确认（或标记待确认）
- [ ] SQL 字段名与 Mapper XML / 建表 SQL 一致
- [ ] 步骤从零开始，无跳步假设
- [ ] 无模糊词（"应该"、"可能"、"参考"等）
- [ ] 文件存储在 `cases/issues/YYYYMM/`
