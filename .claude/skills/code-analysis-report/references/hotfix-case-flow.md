# Hotfix 用例生成流程（模式E）

适用场景：用户提供 `应用: {org}/{repo}, 版本: hotfix_{version}_{bugId}` 输入，希望把线上问题修复转化为一条可执行、可归档的测试用例。

> ⚡ **最高优先级触发规则**：若输入同时包含 `应用: {org}/{repo}` 与 `版本: hotfix_{version}_{bugId}`，必须立即进入模式E。
> - **禁止展示模式选择菜单**
> - **禁止向用户询问任何问题**
> - **直接开始拉取后端 hotfix 分支**

---

## 触发信号

```text
应用: {org}/{repo}, 版本: hotfix_{version}_{bugId}
```

例：`应用: dt-insight-web/dt-center-assets, 版本: hotfix_6.2.x_145513`

---

## Step 1：解析输入

从输入中提取以下字段：

| 字段 | 示例值 |
| --- | --- |
| `org` | `dt-insight-web` |
| `repo` | `dt-center-assets` |
| `version` | `6.2.x` |
| `bugId` | `145513` |
| 完整分支名 | `hotfix_6.2.x_145513` |
| 禅道 URL | `http://zenpms.dtstack.cn/zentao/bug-view-145513.html` |

---

## Step 2：拉取后端 hotfix 分支（立即执行）

```bash
cd .repos/{org}/{repo}
git fetch origin hotfix_{version}_{bugId}
git checkout origin/hotfix_{version}_{bugId}
```

执行后输出确认信息：

```text
[v] 仓库：.repos/{org}/{repo}
[v] 已切换至分支：hotfix_{version}_{bugId}
    最新 commit：{hash} {message}
```

---

## Step 3：立即分析 hotfix 代码变更

```bash
cd .repos/{org}/{repo}
# 查看 hotfix 分支独有提交
git log --oneline origin/master..HEAD 2>/dev/null || git log --oneline -10
# 查看完整 diff
git diff origin/master HEAD
```

重点关注：

- 新增文件（定时任务 / 新功能）
- 修改文件（bug fix 核心逻辑）
- Mapper XML / 建表 SQL（字段名）
- 枚举类 / 常量类（状态值）

> 该步骤必须保留为“提交列表 + 完整 diff”双视角，不得简化成只看 commit title。

---

## Step 4：确定前端仓库和分支

**默认映射规则：**

| 后端 org | 前端仓库 | 前端分支格式 |
| --- | --- | --- |
| `dt-insight-web` | `dt-insight-front/dt-insight-studio` | `dataAssets/release_{version}` |

若后端 org 命中上表，直接拉取对应前端分支。若未命中上表，则先从 `.claude/config.json`、`.repos/` 目录与现有仓库命名中自动推断前端仓库和分支；如仍无法确定，则标记为“前端仓库/分支待补充”并继续后续步骤，**禁止向用户追问、禁止阻断流程**。

拉取前端分支：

```bash
cd .repos/dt-insight-front/dt-insight-studio
git fetch origin
git checkout {frontendBranch}
git pull origin {frontendBranch}
```

---

## Step 5：最后尝试获取禅道 Bug 详情（非阻塞）

```bash
curl -s --connect-timeout 5 "http://zenpms.dtstack.cn/zentao/bug-view-{bugId}.html"
```

**成功**：从页面中提取：

- Bug 标题
- Bug 描述 / 复现步骤
- 期望效果 / 备注

**失败（需要登录或网络不通）**：

- 输出：`⚠ 禅道访问失败，已基于代码变更继续生成用例`
- **不停止流程，不等待用户补料，继续执行 Step 6**
- 生成用例时，可追加备注：`> 注：禅道信息不可用，本用例基于代码变更生成。如需补充 Bug 背景，请参考：{zentao_url}`

---

## Step 6：参考历史用例

在 `cases/archive/` 下搜索同功能模块的历史用例，用于：

- 确认导航路径和菜单名称
- 参考用例步骤结构
- 避免重复或遗漏已有覆盖场景

---

## Step 7：生成测试用例

遵循以下规则，仅生成 **一条** 精准的功能测试用例：

1. **用例标题格式**：必须使用 `【{zentao_bug_id}】验证xxx`，不得使用 `【P0/P1/P2】`
2. **导航路径**：必须从前端路由配置 / 菜单配置中确认，禁止猜测
3. **表单字段**：必须从前端源码（TSX 组件）中确认，包含字段名、是否必填、长度限制
4. **SQL 字段名**：必须从 Mapper XML / 建表 SQL 中确认，禁止使用猜测字段名
5. **步骤完整性**：从零开始（包含新建测试数据），不假设数据已存在
6. **预期结果格式**：使用 `xxx（修复后）`，不得使用 `xxx（修复前）`
7. **禁止模糊词**：不得出现“应该”“可能”“大概”等不确定词汇

详细规范见 `references/hotfix-case-writing.md`

---

## Step 8：输出文件

**文件命名：**

```text
{hotfix_version}_{bugId}-{功能简述}.md
```

例：`hotfix_6.2.x_145513-资产目录列表分页.md`

**front-matter 模板：**

```yaml
---
suite_name: "在线问题转化-{bugId}-{功能简述}"
description: "{一句话描述本用例验证的内容}"
# 若已关联到 PRD，再补充 prd_id / prd_version / prd_path / prd_url；
# 若暂无 PRD，请不要写空字符串占位。
product: "{module_key}"
dev_version: "hotfix_{version}_{bugId}"
tags:
  - hotfix
  - online-case
  - {功能关键词}
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

> 说明：禅道来源信息请写入正文「问题背景 / 来源说明」段或完成报告，不要在 frontmatter 中新增 `title`、`zentao_*`，也不要把 `origin` 写成当前 schema 不支持的 `zentao`。
> 如未来确实要支持 `origin=zentao`，需同步扩展 `.claude/shared/schemas/front-matter-schema.md` 与 `.claude/rules/archive-format.md`。

**存储路径：** `cases/archive/online-cases/{filename}.md`

**创建根目录快捷链接（同名）：**

```bash
node .claude/shared/scripts/refresh-latest-link.mjs \
  "cases/archive/online-cases/{filename}.md" \
  "{filename}.md"
```

---

## Step 9：完成报告（固定模版）

```text
══════════════════════════════════════════
📋 Hotfix 用例生成完成
══════════════════════════════════════════
Bug ID   : #{bugId}
应用     : {org}/{repo}
分支     : hotfix_{version}_{bugId}
输出文件 : cases/archive/online-cases/{filename}.md
快捷链接 : ./{filename}.md（根目录）

👉 请前往以下路径查收用例：
   cases/archive/online-cases/{filename}.md
══════════════════════════════════════════
```

---

## Step 10：自审查清单（必须执行，不可跳过）

- [ ] 用例标题使用 `【{zentao_bug_id}】验证xxx`，未使用 `【P0/P1/P2】`
- [ ] 导航路径与前端菜单配置一致（已对照源码验证）
- [ ] 表单字段名称与前端 TSX 源码一致
- [ ] SQL 字段名与 Mapper XML / 建表 SQL 一致
- [ ] 预期结果使用“xxx（修复后）”格式，无“修复前”描述
- [ ] front-matter 仅使用 canonical Archive 字段；未写 `title` / `zentao_*` / 非法 `origin` 值
- [ ] `origin` 使用当前 schema 允许的值（Hotfix 示例默认 `json`），`status` 使用中文值（如 `草稿`）
- [ ] 若暂无 PRD 信息，未把 `prd_id` / `prd_version` / `prd_path` 写成空字符串占位
- [ ] 文件已保存到 `cases/archive/online-cases/`
- [ ] 根目录同名快捷链接已创建并指向正确路径
- [ ] 步骤从零开始（包含新建测试数据），无跳步假设
- [ ] 无模糊词（“应该”“可能”“参考”等）
