# XMind 层级映射规范

## JSON 中间格式 → XMind 节点映射

## L1 标题规则

| 场景 | L1 格式 | 说明 |
| --- | --- | --- |
| 模块在 config.json 中配置了 `trackerId` | `meta.requirement_name(#requirement_ticket)` | 版本已体现在 Root，L1 不重复加版本前缀 |
| 模块无 `trackerId` | `【meta.version】meta.requirement_name` | 无 Root 版本信息，L1 带版本前缀 |

- `requirement_ticket` 可选，来自 `meta.requirement_ticket`；无则省略 `(#...)` 后缀
- `requirement_id` 写入 L1 节点的 `labels`：`(#requirement_id)`

### 基本结构（无功能子组）

```
Root (${项目展示名}${版本标签}迭代用例(#${trackerId}))
  └── L1 (meta.requirement_name)                  ← trackerId 模块，无版本前缀
       └── L2 (modules[].name)                    ← 菜单/模块名
            └── L3 (pages[].name)                  ← 页面名
                 └── 用例标题 (test_cases[].title)
                      [marker = priority, note = precondition]
                      └── 步骤描述 (steps[].step)
                           └── 预期结果 (steps[].expected)
```

### 含功能子组结构

```
Root (${项目展示名}${版本标签}迭代用例(#${trackerId}))
  └── L1 (meta.requirement_name)                  ← trackerId 模块，无版本前缀
       └── L2 (modules[].name)                    ← 菜单/模块名
            └── L3 (pages[].name)                  ← 页面名
                 └── L4 (sub_groups[].name)         ← 功能子组
                      └── 用例标题 (test_cases[].title)
                           [marker = priority, note = precondition]
                           └── 步骤描述 (steps[].step)
                                └── 预期结果 (steps[].expected)
```

### 向后兼容（旧格式，无 pages 层级）

```
Root (${项目展示名}${版本标签}迭代用例(#${trackerId}))
  └── L1 (meta.requirement_name)                  ← trackerId 模块，无版本前缀
       └── L2 (modules[].name)
            └── [L3 (sub_groups[].name)]
                 └── 用例标题
```

## Priority 映射规则

| JSON priority | XMind marker | 含义     |
| ------------- | ------------ | -------- |
| P0            | `priority-1` | 冒烟测试 |
| P1            | `priority-2` | 核心功能 |
| P2            | `priority-3` | 扩展场景 |

## 前置条件处理

- `test_cases[].precondition` → XMind 节点的 `notes.plain.content`
- 如 precondition 为空字符串或 null，则不设置 note

## 文件命名规则

```
<功能名>.xmind
```

示例：`订单中心-异常订单处理.xmind`

Story 聚合输出：

```
Story-YYYYMMDD.xmind
```

## 输出目录规则

```
cases/xmind/<module_key>/
```

示例：

- 订单中心：`cases/xmind/orders/`
- 商品管理：`cases/xmind/products/`
- 库存中心：`cases/xmind/inventory/`
