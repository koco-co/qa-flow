# Hotfix 用例生成流程（模式E）

适用场景：用户提供 `应用: {org}/{repo}, 版本: hotfix_{version}_{bugId}` 输入，希望把线上问题修复转化为一条可执行、可归档的测试用例。

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

## Step 2：获取禅道 Bug 详情

尝试访问禅道页面：

```bash
curl -s "http://zenpms.dtstack.cn/zentao/bug-view-{bugId}.html"
```

**成功**：从页面中提取：

- Bug 标题
- Bug 描述 / 复现步骤
- 期望效果 / 备注

**失败（需要登录或网络不通）**：提示用户补充以下信息后继续：

```text
⚠ 无法自动访问禅道（可能需要登录），请提供以下信息（可直接粘贴禅道页面截图或文字）：
1. Bug 标题
2. Bug 描述 / 复现步骤
3. 期望效果 / 备注
```

---

## Step 3：拉取后端 hotfix 分支

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

## Step 4：分析 hotfix 代码变更

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

## Step 5：确定前端仓库和分支

**默认映射规则：**

| 后端 org | 前端仓库 | 前端分支格式 |
| --- | --- | --- |
| `dt-insight-web` | `dt-insight-front/dt-insight-studio` | `dataAssets/release_{version}` |

若后端 org 不在上表中，必须询问用户确认前端仓库和分支，不得猜测。

拉取前端分支：

```bash
cd .repos/dt-insight-front/dt-insight-studio
git fetch origin
git checkout {frontendBranch}
git pull origin {frontendBranch}
```

---

## Step 6：参考历史用例

在 `cases/archive/` 下搜索同功能模块的历史用例，用于：

- 确认导航路径和菜单名称
- 参考用例步骤结构
- 避免重复或遗漏已有覆盖场景

---

## Step 7：生成测试用例

遵循以下规则，仅生成 **一条** 精准的功能测试用例：

1. **导航路径**：必须从前端路由配置 / 菜单配置中确认，禁止猜测
2. **表单字段**：必须从前端源码（TSX 组件）中确认，包含字段名、是否必填、长度限制
3. **SQL 字段名**：必须从 Mapper XML / 建表 SQL 中确认，禁止使用猜测字段名
4. **步骤完整性**：从零开始（包含新建测试数据），不假设数据已存在
5. **预期结果格式**：使用 `xxx（修复后）`，不得使用 `xxx（修复前）`
6. **禁止模糊词**：不得出现“应该”“可能”“大概”等不确定词汇

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
title: "「在线问题转化」{功能简述}"
suite_name: "在线问题转化"
description: "{一句话描述本用例验证的内容}"
prd_id: ""
prd_version: ""
prd_path: ""
product: "{产品名}"
zentao_bug_id: {bugId}
zentao_url: "http://zenpms.dtstack.cn/zentao/bug-view-{bugId}.html"
dev_version: "hotfix_{version}_{bugId}"
tags:
  - hotfix
  - online-case
  - {功能关键词}
create_at: "{YYYY-MM-DD}"
update_at: "{YYYY-MM-DD}"
status: "draft"
repos:
  - ".repos/{org}/{repo}"
case_count: 1
origin: zentao
---
```

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

- [ ] 导航路径与前端菜单配置一致（已对照源码验证）
- [ ] 表单字段名称与前端 TSX 源码一致
- [ ] SQL 字段名与 Mapper XML / 建表 SQL 一致
- [ ] 预期结果使用“xxx（修复后）”格式，无“修复前”描述
- [ ] front-matter 中 `origin: zentao`，且 `prd_id` / `prd_version` / `prd_path` 为空字符串
- [ ] 文件已保存到 `cases/archive/online-cases/`
- [ ] 根目录同名快捷链接已创建并指向正确路径
- [ ] 步骤从零开始（包含新建测试数据），无跳步假设
- [ ] 无模糊词（“应该”“可能”“参考”等）
