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

优先使用与 Hotfix 版本对应的 release 分支作为 diff 基线；**禁止直接固定对比 `origin/master`**。

```bash
cd .repos/{org}/{repo}
git fetch origin "release_{version}" 2>/dev/null || true
BASE_REF="origin/release_{version}"
MERGE_BASE="$(git merge-base HEAD "${BASE_REF}" 2>/dev/null || true)"
if [ -n "${MERGE_BASE}" ]; then
  # 查看 hotfix 分支独有提交
  git log --oneline "${MERGE_BASE}"..HEAD
  # 查看完整 diff
  git diff "${MERGE_BASE}" HEAD
else
  FALLBACK_BASE="$(git rev-parse HEAD^ 2>/dev/null || true)"
  if [ -n "${FALLBACK_BASE}" ]; then
    echo "⚠ 未找到 release_{version}，暂以最近父提交作为 fallback 基线；完成报告中必须注明该限制"
    git log --oneline "${FALLBACK_BASE}"..HEAD
    git diff "${FALLBACK_BASE}" HEAD
  else
    git show --stat --patch HEAD
  fi
fi
```

重点关注：

- 新增文件（定时任务 / 新功能）
- 修改文件（bug fix 核心逻辑）
- Mapper XML / 建表 SQL（字段名）
- 枚举类 / 常量类（状态值）

> 若无法直接命中 `release_{version}`，必须显式写出 fallback 基线；禁止静默退回 `origin/master`。
> 该步骤必须保留为“提交列表 + 完整 diff”双视角，不得简化成只看 commit title。

---

## Step 4：确定前端仓库和分支

**默认映射规则：**

| 后端 org | 前端仓库 | 前端分支格式 |
| --- | --- | --- |
| `dt-insight-web` | `dt-insight-front/dt-insight-studio` | `dataAssets/release_{version}` |

若后端 org 命中上表，直接拉取对应前端分支。若未命中上表，则先从 `.claude/config.json`、`.repos/` 目录与现有仓库命名中自动推断前端仓库和分支；如仍无法确定，则标记为“前端仓库/分支待补充”并继续后续步骤，但后续只允许基于历史用例 / 现有文档 / 后端 diff 填写**已确认**的内容，并在正文或 `health_warnings` 中显式标记待确认项；**禁止向用户追问、禁止阻断流程、禁止猜测前端导航或字段规则**。

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
2. **导航路径**：优先从前端路由配置 / 菜单配置中确认；若 Step 4 未能定位前端仓库，则只能引用历史用例或现有文档中可交叉验证的路径，并在正文或 `health_warnings` 标记”待前端仓库确认”，禁止猜测
3. **表单字段**：优先从前端源码（TSX 组件）中确认，包含字段名、是否必填、长度限制；若前端仓库不可用且修复涉及表单，则必须显式写出”字段待前端源码确认”，不得凭空补字段约束
4. **SQL 字段名**：必须从 Mapper XML / 建表 SQL 中确认，禁止使用猜测字段名
5. **步骤完整性**：从零开始（包含新建测试数据），不假设数据已存在
6. **预期结果格式**：必须同时包含「修复前：xxx」和「修复后：xxx」两行对比，不得只写修复后
7. **禁止模糊词**：不得出现”应该””可能””大概”等不确定词汇

详细规范见 `.claude/skills/code-analysis-report/references/hotfix-case-writing.md`

---

## Step 8：输出文件

**文件命名：**

```text
{hotfix_version}_{bugId}-{功能简述}.md
```

例：`hotfix_6.2.x_145513-资产目录列表分页.md`

**front-matter 与字段规范**：见 `references/hotfix-case-writing.md` 第一节。

**存储路径：** `cases/issues/YYYYMM/`（YYYYMM 为用例生成的年月，如 `202604`）

---

## Step 9：完成报告（固定模版）

```text
══════════════════════════════════════════
📋 Hotfix 用例生成完成
══════════════════════════════════════════
Bug ID   : #{bugId}
应用     : {org}/{repo}
分支     : hotfix_{version}_{bugId}
输出文件 : cases/issues/YYYYMM/{filename}.md

👉 请前往以下路径查收用例：
   cases/issues/YYYYMM/{filename}.md
══════════════════════════════════════════
```

---

## Step 10：IM 通知（必须执行）

完成报告输出后，调用通知模块：

```bash
node .claude/shared/scripts/notify.mjs \
  --event hotfix-case-generated \
  --data '{"bugId":<bugId>,"branch":"hotfix_{version}_{bugId}","file":"cases/issues/{filename}.md","changedFiles":<变更文件数>}'
```

> ⚠️ 若 notify.mjs 执行失败，仅 console.error 记录，不影响已生成的用例文件。

---

## Step 11：自审查清单（必须执行，不可跳过）

- [ ] 用例标题使用 `【{zentao_bug_id}】验证xxx`，未使用 `【P0/P1/P2】`
- [ ] `origin: zentao`，`status: “草稿”`（中文）
- [ ] 无 `title` 字段；无 `prd_id / prd_version / prd_path`（整段省略，不写空字符串）
- [ ] `zentao_bug_id` 为数字类型，`zentao_url` 已填写
- [ ] `keywords` 已填写（6位竖线分隔，未知项留空）
- [ ] body 层级正确：`## 模块 → ### 菜单 → ##### 【bugId】验证xxx`
- [ ] 步骤表头为 `| 编号 | 步骤 | 预期 |`，步骤表前有 `> 用例步骤` 标签
- [ ] 前置条件使用 `> 前置条件` blockquote 格式
- [ ] 所有预期结果同时包含「修复前：xxx」和「修复后：xxx」两行
- [ ] 前端仓库可定位时，导航路径已与前端菜单配置一致；不可定位时，已标记待确认项且未猜测
- [ ] 前端仓库可定位且修复涉及表单时，字段名称已与前端 TSX 源码一致；若仓库不可用，已显式标注字段待确认
- [ ] SQL 字段名与 Mapper XML / 建表 SQL 一致
- [ ] 文件已保存到 `cases/issues/YYYYMM/`
- [ ] 步骤从零开始（包含新建测试数据），无跳步假设
- [ ] 无模糊词（”应该””可能””参考”等）
