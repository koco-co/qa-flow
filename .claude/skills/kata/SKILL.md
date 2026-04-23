---
name: kata
description: "QA 测试工作流入口。展示功能菜单并路由到对应 skill。触发词：kata、功能菜单、帮助。/kata init 路由到 setup skill。"
argument-hint: "[init | 功能编号 | 关键词]"
---

# kata 入口菜单

## 路由逻辑

<routing>
  <first_run_policy>
    若无项目且命令为 `init` / `setup`，则直接路由到 `setup`
    若无项目且用户请求其他功能，则先提示完成初始化并路由到 `setup`
  </first_run_policy>
</routing>

根据用户输入的参数进行菜单路由（按新菜单频率排序）：

- 空输入或 `help` → 显示功能菜单（若无项目则先路由到 `setup`）
- `init` 或 `0` → 初始化环境（`setup` skill）
- `1` 或 生成用例相关关键词 → 生成测试用例（`test-case-gen`）
- `2` 或 ui / autotest / 自动化 相关关键词 → UI 自动化测试（`ui-autotest`）
- `3` 或 编辑 / xmind 相关关键词 → 编辑 XMind 用例（`xmind-editor`）
- `4` 或 禅道 Bug 链接 / `hotfix` / `线上 bug 验证` → 生成 Hotfix 用例（`hotfix-case-gen`）
- `5` 或 `报错` / `异常` / `Exception` / `TypeError` / `Console 错误` → Bug 报告生成（`bug-report`）
- `6` 或 `冲突` / `merge conflict` / `<<<<<<< HEAD` → 合并冲突分析（`conflict-report`）
- `7` 或 标准化 / 归档 / 转化 相关关键词 → 标准化归档（`test-case-gen`）
- `8` 或 切换项目 相关关键词 → 切换项目
- 用户直接提供 `.xmind` 或 `.csv` 文件路径 → 自动路由到标准化归档
- 用户粘贴禅道 Bug URL（含 `bug-view-`）→ 自动路由到 `hotfix-case-gen`

## 项目选择

仅在已有项目或完成 `setup` 后执行：

1. 扫描 `workspace/` 下的项目目录
2. 若只有 1 个项目，自动选中
3. 若有多个项目，提示用户选择
4. 将选中项目记为 `{{project}}`

## 功能菜单

```
当前项目: {{project}}
```

| 编号 | 功能             | 触发命令                                     | 状态    |
| ---- | ---------------- | -------------------------------------------- | ------- |
| 1    | 生成测试用例     | `/kata 1` 或 `为 <需求名称> 生成测试用例` | ✅ 可用 |
| 2    | UI 自动化测试    | `/kata 2` 或 `UI自动化测试`               | ✅ 可用 |
| 3    | 编辑 XMind 用例  | `/kata 3` 或 `修改用例 "验证xxx"`         | ✅ 可用 |
| 4    | 生成 Hotfix 用例 | `/kata 4` 或 粘贴禅道 Bug 链接            | ✅ 可用 |
| 5    | 分析 Bug 报告    | `/kata 5` 或 `帮我分析这个报错`           | ✅ 可用 |
| 6    | 分析合并冲突     | `/kata 6` 或 `分析冲突`                   | ✅ 可用 |
| 7    | 标准化归档       | `/kata 7` 或 `标准化归档 xxx.xmind`       | ✅ 可用 |
| 8    | 切换项目         | `/kata 8` 或 `切换项目`                   | ✅ 可用 |
| 0    | 环境初始化       | `/kata init` 或 `/setup`                  | ✅ 可用 |

## 快速示例

请查看下方快速开始指南，或直接输入对应命令：

```
为 商品管理需求 生成测试用例
修改用例 "验证导出仅导出当前筛选结果"
帮我分析这个报错
{{ZENTAO_BASE_URL}}/zentao/bug-view-138845.html   # 自动触发 Hotfix 用例生成
生成测试用例 https://lanhuapp.com/web/#/item/project/...
标准化归档 workspace/{{project}}/history/旧用例.xmind
```

更多示例见 `.claude/skills/kata/references/quickstart.md`
