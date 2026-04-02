# 中间 JSON 格式 Schema

Writer Subagent 输出的 JSON 文件必须严格符合本 Schema。

---

## 完整 Schema（4 级结构）

```json
{
  "meta": {
    "project_name": "string  // 项目名称，如「电商平台」「XXX 系统」",
    "product": "string       // 产品名称，如「商品管理」",
    "version": "string       // 版本标识：语义版本如「v1.0.0」，或日期格式如「0322版本」「202603版本」",
    "prd_version": "string   // 迭代版本号，格式 vX.Y.Z（如「v1.0.0」）。有版本子目录时必填，从 PRD frontmatter prd_version 字段获取；驱动 archive/xmind 输出子目录",
    "requirement_name": "string  // 需求名称，如「商品管理-商品列表」",
    "requirement_id": "string    // 需求ID，如「PRD-26」（可选）",
    "prd_path": "string          // PRD 文件相对路径（可选）",
    "generated_at": "string      // ISO8601 时间戳",
    "agent_id": "string          // Subagent 标识（可选）",
    "tags": "string[]            // 领域关键词列表（可选，供归档 MD front-matter 使用）",
    "module_key": "string        // 模块 key，如 orders / products（可选）"
  },
  "modules": [
    {
      "name": "string  // L2: 菜单/模块名称，如「商品管理」",
      "pages": [
        {
          "name": "string  // L3: 页面名称，如「列表页」「新增页」",
          "sub_groups": [
            {
              "name": "string  // L4: 功能子组名称，如「搜索」「字段校验」（可选层级）",
              "test_cases": [
                {
                  "title": "string       // 必须以「验证」开头",
                  "precondition": "string // 前置条件",
                  "priority": "string    // P0 / P1 / P2",
                  "case_type": "string   // 正常用例 / 异常用例 / 边界用例 / 待核实（仅 Reviewer）",
                  "steps": [
                    {
                      "step": "string     // 操作步骤（禁止「步骤N:」前缀）",
                      "expected": "string // 预期结果"
                    }
                  ]
                }
              ]
            }
          ],
          "test_cases": []  // 可选：无功能子组时直接放用例
        }
      ]
    }
  ]
}
```

---

## 使用规则

### pages 与 test_cases 的选择

- 页面包含多类操作（搜索/新增/编辑/删除）→ 使用 `sub_groups` 分组
- 页面功能单一 → 直接在 page 下放 `test_cases`

### 向后兼容

如果 JSON 中 `modules` 下直接有 `sub_groups` 或 `test_cases`（无 `pages`），按旧 3 级格式处理。

### 示例（有功能子组）

```json
{
  "name": "商品管理",
  "pages": [
    {
      "name": "列表页",
      "sub_groups": [
        { "name": "搜索", "test_cases": [...] },
        { "name": "批量导出", "test_cases": [...] }
      ]
    },
    {
      "name": "新增商品页",
      "sub_groups": [
        { "name": "表单填写", "test_cases": [...] },
        { "name": "字段校验", "test_cases": [...] }
      ]
    }
  ]
}
```

### 示例（无功能子组）

```json
{
  "name": "商品管理",
  "pages": [
    {
      "name": "权限验证",
      "test_cases": [...]
    }
  ]
}
```

---

## meta → Archive/PRD Frontmatter 映射

> meta 字段名保持稳定（不改名），以下是 `json-to-archive-md.mjs` 输出 MD 时的字段映射。

| meta 字段 | 用例归档 frontmatter | PRD frontmatter |
|-----------|---------------------|-----------------|
| `requirement_name` | `suite_name` | `prd_name` |
| `module_key` | `product` | `product` |
| `prd_version` | `prd_version` | `prd_version` |
| `version` | `prd_version`（仅当 prd_version 缺失时回退） | — |
| `prd_path` | `prd_path` | `prd_source` |
| `requirement_id` | `prd_id` | `prd_id` |
| `prd_url` | `prd_url` | `prd_url` |
| `dev_version` | `dev_version` | `dev_version` |
| `repos` | `repos` | `repos` |
| `tags` | `tags` | `tags` |

### meta 可选新增字段

Writer Subagent 输出时可包含以下可选字段（提升 frontmatter 填充质量）：

```json
{
  "meta": {
    "prd_url": "https://lanhuapp.com/...",
    "dev_version": "v1.0.0",
    "repos": [".repos/${org}/${repo}"]
  }
}
```

---

## 字段约束

| 字段 | 约束 |
|------|------|
| `meta.project_name` | 必须与 XMind 输出目录对应 |
| `meta.requirement_name` | **只写功能名称**，不含版本号或数字序号前缀。例如 PRD `prd_name` 为 `数据资产V6.4.10 - 15525【内置规则丰富】一致性校验`，则 `requirement_name` 应为 `【内置规则丰富】一致性校验`（从第一个【或功能关键词开始，去掉项目名/版本/序号） |
| `meta.prd_version` | 格式 `vX.Y.Z`（如 `v1.0.0`）；从 PRD frontmatter `prd_version` 字段获取；驱动 archive 和 xmind 输出的版本子目录（如 `product-mgmt/v1.0.0/`）。无版本子目录时可省略 |
| `meta.version` | 有版本时与 `prd_version` 保持一致（如 `v1.0.0`）；无版本时用日期格式（如 `202603版本`）供 XMind L1 标题显示 |
| `meta.tags` | 可选；3-8 个领域关键词；产品/功能域名词、业务实体名词、客户标识（不含页面级通用词） |
| `meta.module_key` | 可选；模块 key（如 `product-mgmt`、`order-center`），用于 archive 目录路由 |
| `modules[].name` | L2: 菜单/模块名称（如「商品管理」）|
| `pages[].name` | L3: 页面名称（如「列表页」「新增页」「详情页」）|
| `sub_groups[].name` | L4: 功能子组（如「搜索」「字段校验」，可选）|
| `test_cases[].title` | 必须以「验证」二字开头 |
| `test_cases[].priority` | 枚举：`P0` / `P1` / `P2` |
| `test_cases[].case_type` | 枚举：`正常用例` / `异常用例` / `边界用例` / `待核实`（仅 Reviewer 可设置） |
| `steps[].step` | 禁止「步骤N:」前缀；第一步须以「进入【xxx】页面」开头 |
| `steps[].step` 数量 | 必须与 `steps[].expected` 数量相等 |

> **注意**：`待核实` 类型仅由 Reviewer Subagent 在 3 轮修正后仍无法确认的用例上标记，Writer Subagent 不应使用此值。标记为待核实的用例会在评审报告中单独列出，提醒用户人工核实。

注：「待核实」仅用于整个用例的有效性存疑时标记，不与其他类型混合使用。如需标记某个异常/边界用例的预期存疑，请保留原 case_type，在 precondition 末尾补注 `[Reviewer注：...]`。

---

## 临时文件命名规则

Writer Subagent 输出的临时 JSON 文件命名（按工作目录隔离）：

```
cases/prds/YYYYMM/temp/<模块简称>.json
```

示例：
- `cases/prds/202604/temp/list.json`

---

## Checklist JSON 格式

Writer 在生成完整用例前，先输出轻量级 Checklist（供用户审阅和调整），格式如下：

```json
{
  "module": "商品管理列表",
  "writer": "Writer A",
  "items": [
    { "point": "列表默认加载显示", "priority": "P0", "type": "正常用例", "include": true },
    { "point": "按商品名称单条件搜索", "priority": "P1", "type": "正常用例", "include": true },
    { "point": "按商品分类下拉搜索", "priority": "P1", "type": "正常用例", "include": true },
    { "point": "搜索无结果边界（暂无数据提示）", "priority": "P2", "type": "边界用例", "include": true },
    { "point": "重置搜索条件", "priority": "P2", "type": "正常用例", "include": true },
    { "point": "批量导出 Excel 功能", "priority": "P2", "type": "正常用例", "include": true }
  ]
}
```

Checklist 字段说明：

| 字段 | 说明 |
|------|------|
| `point` | 测试点简述（非完整用例标题，用于快速浏览） |
| `priority` | 预计优先级 P0/P1/P2 |
| `type` | 预计用例类型 |
| `include` | 用户可改为 `false` 以排除该测试点 |

**Checklist 用途：**
- 用户可在此阶段快速增减测试点，比修改完整用例成本低得多
- 确认后 Writer 基于 Checklist 生成完整 steps/expected 用例
- 不需要保存为独立文件，在对话中展示即可

---

## .qa-state.json 断点续传状态文件

> 状态文件的完整定义已拆分至 [`qa-state-contract.md`](./qa-state-contract.md)。
> 包括：文件命名规则、完整字段说明、恢复行为、关键状态转移表。
