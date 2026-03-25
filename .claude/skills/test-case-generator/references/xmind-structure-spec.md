# XMind 层级映射规范

（与 xmind-converter/references/xmind-structure-spec.md 内容相同，此处为 test-case-generator 的本地副本）

## JSON 中间格式 → XMind 节点映射

### 基本结构（无功能子组）

```
Root (meta.project_name)
  └── L1 (【meta.version】meta.requirement_name)
       └── L2 (modules[].name)                    ← 菜单/模块名
            └── L3 (pages[].name)                  ← 页面名
                 └── 用例标题 (test_cases[].title)
                      [marker = priority, note = precondition]
                      └── 步骤描述 (steps[].step)
                           └── 预期结果 (steps[].expected)
```

### 含功能子组结构

```
Root (meta.project_name)
  └── L1 (【meta.version】meta.requirement_name)
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
Root (meta.project_name)
  └── L1 (【meta.version】meta.requirement_name)
       └── L2 (modules[].name)
            └── [L3 (sub_groups[].name)]
                 └── 用例标题
```

## Priority 映射规则

| JSON priority | XMind marker | 含义 |
|---------------|--------------|------|
| P0 | `priority-1` | 冒烟测试 |
| P1 | `priority-2` | 核心功能 |
| P2 | `priority-3` | 扩展场景 |

## 前置条件处理

- `test_cases[].precondition` → XMind 节点的 `notes.plain.content`
- 如 precondition 为空字符串或 null，则不设置 note

## 文件命名规则

```
YYYYMM-<功能名>.xmind
```

示例：`202603-数据质量-质量问题台账.xmind`

## 输出目录规则

```
zentao-cases/XMind/<项目名>/
```

示例：
- 信永中和：`zentao-cases/XMind/CustomItem/信永中和/`
- DTStack 数据资产：`zentao-cases/XMind/DataAssets/`
- DTStack 离线开发：`zentao-cases/XMind/BatchWorks/`
