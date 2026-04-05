# 中间 JSON 格式定义

> 本文件定义 Writer、Reviewer 与输出脚本之间的数据交换格式（中间 JSON Schema）。
> 所有 Subagent 输出均应符合此格式；`xmind-converter` 和 `archive-converter` 以此为输入。

---

## 顶层结构

```json
{
  "meta": { ... },
  "modules": [ ModuleObject, ... ]
}
```

---

## `meta` 对象

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `project_name` | `string` | 是 | 项目名称，用于 XMind Root 标题 |
| `requirement_name` | `string` | 是 | 需求名称，用于 XMind L1 标题 |
| `version` | `string` | 否 | 版本号，如 `"v6.4.10"`；无 trackerId 时前缀到 L1 |
| `module_key` | `string` | 否 | 模块 key，对应 `config.json` 的 `modules[].key` |
| `requirement_id` | `number` | 否 | 需求 ID（整数），写入 XMind L1 labels，对应 Archive frontmatter `prd_id` |
| `requirement_ticket` | `string` | 否 | 需求编号（如 `"#10287"`），追加到 XMind L1 标题 |
| `description` | `string` | 否 | 一句话描述（≤60字），写入 Archive frontmatter `description` |
| `prd_path` | `string` | 否 | 关联 PRD 文件的相对路径，如 `"cases/prds/202604/【功能名】需求标题.md"` |

### meta 示例

```json
{
  "meta": {
    "project_name": "数据资产平台",
    "requirement_name": "商品管理功能优化",
    "version": "v6.4.10",
    "module_key": "asset",
    "requirement_id": 10287,
    "requirement_ticket": "#10287",
    "description": "支持商品多维度搜索、批量导出及状态管理",
    "prd_path": "cases/prds/202604/【商品管理】功能优化需求.md"
  }
}
```

---

## `ModuleObject` 对象

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | 是 | 模块 / 菜单名称，对应 XMind L2、Archive `##` |
| `pages` | `PageObject[]` | 是 | 页面列表（至少包含一个页面） |

---

## `PageObject` 对象

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | 是 | 页面名称，如「列表页」「新增页」，对应 XMind L3、Archive `###` |
| `sub_groups` | `SubGroupObject[]` | 否 | 功能子组列表；无子组时直接使用 `test_cases` |
| `test_cases` | `CaseObject[]` | 否 | 直属于页面的用例（不属于任何子组） |

> `sub_groups` 和 `test_cases` 至少存在一个，不可同时为空。

---

## `SubGroupObject` 对象

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | 是 | 功能子组名称，如「搜索」「字段校验」，对应 XMind L4、Archive `####` |
| `test_cases` | `CaseObject[]` | 是 | 该子组下的用例列表（至少包含一个用例） |

---

## `CaseObject` 对象

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | `string` | 是 | 用例标题，**必须**以「验证」开头，不含优先级前缀（由 `priority` 字段单独存储） |
| `priority` | `"P0" \| "P1" \| "P2"` | 是 | 优先级；输出时格式化为 `【P0】验证xxx` |
| `preconditions` | `string` | 否 | 前置条件文本；含多条时用换行分隔 |
| `steps` | `StepObject[]` | 是 | 步骤列表（至少包含一个步骤） |

### CaseObject 验证规则

- `title` 不得含有「步骤」「Step」等步骤相关词
- `title` 不得含有优先级括号（如 `【P0】`），优先级统一由 `priority` 字段表达
- `steps[0].step` 必须以「进入【」开头（即第一步为导航步骤）
- `priority` 仅允许 `"P0"`、`"P1"`、`"P2"` 三个值

---

## `StepObject` 对象

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `step` | `string` | 是 | 操作步骤描述，具体可执行 |
| `expected` | `string` | 是 | 预期结果描述，精确可观测 |

---

## 完整示例

```json
{
  "meta": {
    "project_name": "数据资产平台",
    "requirement_name": "商品管理功能优化",
    "version": "v6.4.10",
    "module_key": "asset",
    "requirement_id": 10287,
    "description": "支持商品多维度搜索、批量导出及状态管理"
  },
  "modules": [
    {
      "name": "商品管理",
      "pages": [
        {
          "name": "列表页",
          "sub_groups": [
            {
              "name": "搜索筛选",
              "test_cases": [
                {
                  "title": "验证按商品名称关键词搜索返回正确结果",
                  "priority": "P1",
                  "preconditions": "已存在商品名称含"运动鞋"的记录至少 3 条",
                  "steps": [
                    {
                      "step": "进入【商品管理 → 商品列表】页面",
                      "expected": "页面正常加载，列表展示所有商品"
                    },
                    {
                      "step": "在「商品名称」搜索框输入"运动鞋"，点击【搜索】按钮",
                      "expected": "列表仅显示名称含"运动鞋"的商品，共 3 条记录"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "name": "新增页",
          "test_cases": [
            {
              "title": "验证填写完整表单后成功新增商品",
              "priority": "P0",
              "preconditions": "当前账号具有「商品管理」新增权限",
              "steps": [
                {
                  "step": "进入【商品管理 → 商品列表】页面",
                  "expected": "页面正常加载"
                },
                {
                  "step": "点击【新增】按钮，在弹出表单中按顺序填写：\n- 商品名称: 2026春季新款运动鞋\n- 商品分类: 运动鞋\n- 价格: 299.00\n- 库存数量: 100\n- 状态: 上架",
                  "expected": "表单字段均可正常输入，无异常提示"
                },
                {
                  "step": "点击【保存】按钮",
                  "expected": "页面提示"新增成功"，列表新增一条记录，商品名称显示"2026春季新款运动鞋"，状态显示"上架""
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```
