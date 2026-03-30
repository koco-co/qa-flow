# 中间 JSON 格式 Schema

Writer Subagent 输出的 JSON 文件必须严格符合本 Schema。

---

## 完整 Schema（4 级结构）

```json
{
  "meta": {
    "project_name": "string  // 项目名称，如「信永中和」「DTStack」",
    "product": "string       // 产品名称，如「数据运营门户」",
    "version": "string       // 版本标识，如「0322版本」「202603版本」",
    "requirement_name": "string  // 需求名称，如「数据质量-质量问题台账」",
    "requirement_id": "string    // 需求ID，如「PRD-26」（可选）",
    "prd_path": "string          // PRD 文件相对路径（可选）",
    "generated_at": "string      // ISO8601 时间戳",
    "agent_id": "string          // Subagent 标识（可选）",
    "tags": "string[]            // 领域关键词列表（可选，供归档 MD front-matter 使用）",
    "module_key": "string        // 模块 key，如 data-assets / xyzh（可选）"
  },
  "modules": [
    {
      "name": "string  // L2: 菜单/模块名称，如「质量问题台账」",
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
  "name": "质量问题台账",
  "pages": [
    {
      "name": "列表页",
      "sub_groups": [
        { "name": "搜索", "test_cases": [...] },
        { "name": "导出", "test_cases": [...] }
      ]
    },
    {
      "name": "新增页",
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
  "name": "质量问题台账",
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
| `version` | `prd_version` | `prd_version` |
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
    "dev_version": "6.3岚图定制化分支",
    "repos": [".repos/DTStack/dt-center-assets"]
  }
}
```

---

## 字段约束

| 字段 | 约束 |
|------|------|
| `meta.project_name` | 必须与 XMind 输出目录对应 |
| `meta.version` | 格式：`YYYYMM版本` 或 `mmdd版本` |
| `meta.tags` | 可选；3-8 个领域关键词；产品/功能域名词、业务实体名词、客户标识（不含页面级通用词） |
| `meta.module_key` | 可选；模块 key（如 `data-assets`、`xyzh`），用于 archive 目录路由 |
| `modules[].name` | L2: 菜单/模块名称（如「质量问题台账」）|
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
cases/requirements/<project>/<working-dir>/temp/<模块简称>.json
```

示例：
- `cases/requirements/data-assets/v6.4.10/temp/list.json`（DTStack）
- `cases/requirements/custom/xyzh/temp/list.json`（XYZH）

---

## Checklist JSON 格式

Writer 在生成完整用例前，先输出轻量级 Checklist（供用户审阅和调整），格式如下：

```json
{
  "module": "质量问题台账列表",
  "writer": "Writer A",
  "items": [
    { "point": "列表默认加载显示", "priority": "P0", "type": "正常用例", "include": true },
    { "point": "按行动编号单条件搜索", "priority": "P1", "type": "正常用例", "include": true },
    { "point": "按问题分类下拉搜索", "priority": "P1", "type": "正常用例", "include": true },
    { "point": "搜索无结果边界（暂无数据提示）", "priority": "P2", "type": "边界用例", "include": true },
    { "point": "重置搜索条件", "priority": "P2", "type": "正常用例", "include": true },
    { "point": "导出 Excel 功能", "priority": "P2", "type": "正常用例", "include": true }
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

每步完成后写入工作目录，用于中断恢复：

```
cases/requirements/<project>/<working-dir>/.qa-state.json
```

示例：
- `cases/requirements/data-assets/v6.4.10/.qa-state.json`（DTStack）
- `cases/requirements/custom/xyzh/.qa-state.json`（XYZH）

```json
{
  "working_dir": "cases/requirements/data-assets/v6.4.10",
  "project_name": "信永中和",
  "prd_files": ["PRD-26-xxx.md", "PRD-27-xxx.md"],
  "last_completed_step": "prd-enhancer",
  "prd_enhanced_at": "2026-03-25T10:00:00Z",
  "enhanced_files": [
    "数据质量-质量问题台账.md"
  ],
  "checklist_confirmed": true,
  "formalize_warnings": ["字段信息不足", "源码补充章节为空"],
  "writers": {
    "list": { "status": "completed", "file": "temp/list.json", "case_count": 12 },
    "create": { "status": "completed", "file": "temp/create.json", "case_count": 15 },
    "detail": { "status": "pending", "file": null, "case_count": 0 }
  },
  "reviewer_status": "pending",
  "final_json": null,
  "output_xmind": null,
  "archive_md_path": null,
  "awaiting_verification": false,
  "mode": "normal",
  "created_at": "2026-03-25T10:00:00Z",
  "updated_at": "2026-03-25T10:30:00Z",
  "execution_log": [
    {
      "step": "parse-input",
      "status": "completed",
      "at": "2026-03-25T10:01:00Z",
      "duration_ms": 3200,
      "summary": "解析 Story 目录，发现 2 个 PRD 文件"
    }
  ]
}
```

状态字段说明：

| 字段 | 说明 |
|------|------|
| `last_completed_step` | 已稳定完成的最后步骤，字符串 step ID（初始值为数字 0 表示未开始）。取值范围见 SKILL.md 步骤顺序定义表 |
| `mode` | `normal` / `quick`（快速模式跳过 brainstorming 和确认） |
| `writers.<name>.status` | `pending` / `in_progress` / `completed` / `failed` / `skipped`（`skipped` 表示用户明确跳过该模块，Reviewer 不合并其内容） |
| `reviewer_status` | `pending` / `completed` / `escalated`（`pending` 覆盖未开始和 Reviewer 执行中；`escalated` 表示 Step 7 被阻断，需人工介入） |
| `output_xmind` | Step 9 生成并写入的 XMind 文件路径；Step 10 只读取该值用于验证提示，必须保持原值不变 |
| `awaiting_verification` | Step 10 设置为 `true`，表示流程停在用户验证阶段；恢复时只重放验证提示，不重跑 Step 10；Step 11 消费该状态后删除状态文件 |
| `archive_md_path` | Step 10 生成的归档 MD 文件路径 |
| `formalize_warnings` | prd-formalize 质量闸口产生的警告列表。非阻断警告记录于此，在后续 prd-enhancer 健康度报告中一并展示 |
| `retry_count` | Writer 自动重试次数（由编排器在 Writer 失败后递增）。达到上限（默认 2 次）后写 `failed` 并停止重试 |
| `execution_log` | 步骤执行记录数组（可选）。每步完成或失败时追加一条记录，包含 step/status/at/duration_ms/summary。仅用于事后排查，不影响续传逻辑 |

**恢复时的行为：**
- 已完成步骤直接跳过，不重新执行
- `completed` / `skipped` 状态的 Writer 不重跑
- `pending` / 中断的 `in_progress` 状态 Writer 在普通续传时重新启动
- `failed` 状态 Writer 视为终态；普通续传不自动重启，需用户/编排器显式选择重试。选择重试时，先将其状态写回 `in_progress` 再启动
- Reviewer 状态为 `escalated` 时，流程停留在 Step 7，先提示用户处理阻断决策
- `awaiting_verification: true` 时：向用户重新展示验证提示（XMind 路径 + 归档 MD 路径），保持 `last_completed_step: 9`，等待用户回复「确认通过」或「已修改，请同步」

## 关键状态转移（供实现 / 校验使用）

| 场景 | 前置条件 | 必要状态变化 | 校验要点 |
|------|----------|--------------|----------|
| Step 1：新流程初始化 | 不存在 `.qa-state.json`，或用户明确选择重置 | 创建状态文件，并写入 `last_completed_step: 0`、`checklist_confirmed: false`、`reviewer_status: "pending"`、`awaiting_verification: false` | 初始状态不得直接从 `"parse-input"` 开始 |
| Step 1：等待验证续传 | 已有状态文件，且 `awaiting_verification: true` | 保持 `last_completed_step: "archive"`、`output_xmind`、`archive_md_path` 原值 | 只能重放验证提示，不得重跑 Step 10 |
| Step 7：Writer 启动 | 模块已拆分并准备启动 Writer | 首次启动时，对应 `writers.<name>.status` 从 `pending` 写为 `in_progress`；如用户/编排器显式选择重试 `failed` Writer，也先写回 `in_progress` | `in_progress` 为启动前/启动时写入的乐观运行态；若启动失败或执行失败，必须回写为 `failed`；中断的 `in_progress` 可在普通续传时按原输入恢复执行 |
| Step 7：Writer 终态 | 单个 Writer 结束 | 成功写 `completed`；失败写 `failed`；用户显式跳过写 `skipped` | Reviewer 仅合并 `completed` 的 Writer 输出 |
| Step 7：Writer 收敛完成 | 所有 Writer 都已进入终态 | 仅当全部为 `completed` / `skipped` 时，才写 `last_completed_step: "writer"` | 只要存在 `pending` / `in_progress` / `failed`，就不能进入 Step 8 |
| Step 8：Reviewer 成功 | Step 7 已完成 | 写 `reviewer_status: "completed"`、`last_completed_step: "reviewer"`，并产出 `final_json` | `final_json` 应为非空路径 |
| Step 8：Reviewer 阻断 | 问题率 > 40% | 写 `reviewer_status: "escalated"`，`last_completed_step` 保持 `"writer"` | 流程暂停在 Step 8，等待用户决策 |
| Step 10：等待用户验证 | Step 9 已成功，归档 MD 已生成 | 保持 Step 9 写入的 `output_xmind` 原值不变，并写 `last_completed_step: "archive"`、`archive_md_path`、`awaiting_verification: true` | `output_xmind` 与 `archive_md_path` 都应可用，且 Step 10 不得重写 `output_xmind` |
| Step 11：终态清理 | 用户回复「确认通过」或「已修改，请同步」 | 完成同步 / 清理后删除 `temp/` 与 `.qa-state.json` | 写入 `last_completed_step: "notify"` 为可选；如有写入，仅允许在删除 `.qa-state.json` 前瞬时出现，且不得作为稳定可恢复状态保留 |
