---
name: qa-flow
description: "QA 测试工作流入口。展示功能菜单并路由到对应 skill。触发词：qa-flow、功能菜单、帮助。/qa-flow init 路由到 setup skill。"
argument-hint: "[init | 功能编号 | 关键词]"
---

# qa-flow 入口菜单

## 路由逻辑

<routing>
  <first_run_policy>
    若无项目且命令为 `init` / `setup`，则直接路由到 `setup`
    若无项目且用户请求其他功能，则先提示完成初始化并路由到 `setup`
  </first_run_policy>
</routing>

根据用户输入的参数进行菜单路由：

- 空输入或 `help` → 显示功能菜单（若无项目则先路由到 `setup`）
- `init` 或 `0` → 初始化环境
- `1` 或 生成用例相关关键词 → 生成测试用例
- `2` 或 报错/bug 相关关键词 → 分析报错/冲突
- `3` 或 编辑/xmind 相关关键词 → 编辑 XMind 用例
- `4` 或 ui/autotest 相关关键词 → UI 自动化测试
- `5` 或 标准化/归档/转化 相关关键词 → 标准化归档
- `6` 或 切换项目 相关关键词 → 切换项目
- 用户直接提供 `.xmind` 或 `.csv` 文件路径 → 自动路由到标准化归档

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

| 编号 | 功能            | 触发命令                                     | 状态      |
| ---- | --------------- | -------------------------------------------- | --------- |
| 0    | 环境初始化      | `/qa-flow init` 或 `/setup`                  | ✅ 可用   |
| 1    | 生成测试用例    | `/qa-flow 1` 或 `为 <需求名称> 生成测试用例` | ✅ 可用   |
| 2    | 分析报错/冲突   | `/qa-flow 2` 或 `帮我分析这个报错`           | ✅ 可用   |
| 3    | 编辑 XMind 用例 | `/qa-flow 3` 或 `修改用例 "验证xxx"`         | ✅ 可用   |
| 4    | UI 自动化测试   | `/qa-flow 4` 或 `UI自动化测试`               | ✅ 可用   |
| 5    | 标准化归档      | `/qa-flow 5` 或 `标准化归档 xxx.xmind`       | ✅ 可用   |
| 6    | 切换项目        | `/qa-flow 6` 或 `切换项目`                   | ✅ 可用   |

## 快速示例

请查看下方快速开始指南，或直接输入对应命令：

```
为 商品管理需求 生成测试用例
修改用例 "验证导出仅导出当前筛选结果"
帮我分析这个报错
生成测试用例 https://lanhuapp.com/web/#/item/project/...
标准化归档 workspace/{{project}}/historys/旧用例.xmind
```

更多示例见 `.claude/skills/qa-flow/references/quickstart.md`
