---
name: xmind-converter
description: 将中间 JSON 格式的测试用例转换为 .xmind 文件。当用户提到「转换为 XMind」「生成 XMind 文件」「输出 XMind」时触发。也被 test-case-generator skill 作为最后一步自动调用。
---

# XMind 转换 Skill

## 用途与触发词

- **用途**：将中间 JSON 测试用例数据转换为可直接打开的 `.xmind` 文件，并在终端输出文件路径。
- **触发词**：`转换为 XMind`、`生成 XMind 文件`、`输出 XMind`
- **调用关系**：既可独立调用，也可作为 `test-case-generator` 的末端输出步骤自动执行。

---

## 使用口径速查

- 支持**单文件**、**多文件合并**、**temp/ 目录扫描**三种输入形态。
- 目标文件不存在时默认新建；目标文件已存在时，根据场景选择 `--append`（Story 聚合）或 `--replace`（模块级重跑）。
- 真实输出路径按模块与版本落盘，完成后在终端输出绝对路径。
- 作为 `test-case-generator` 子流程时，不在此步清理 `temp/` 与 `.qa-state.json`。

---

## 输入 / 输出契约

### 输入

| 输入类型 | 示例 | 说明 |
| --- | --- | --- |
| 单个 JSON 文件 | `cases/prds/202604/temp/final-reviewed.json` | 直接转换为一个 `.xmind` |
| 多个 JSON 文件 | `input1.json input2.json` | 合并后输出；`meta` 取首个文件，L1 按需求拆分 |
| `temp/` 目录 | `cases/prds/202604/temp/` | 自动扫描目录内全部 `.json` |

**结构门槛：**

- `meta.project_name` 必填
- `meta.requirement_name` 必填
- `modules` 必须是非空数组
- `modules[].name` 必填

### 输出

| 输出类型 | 路径规则 | 说明 |
| --- | --- | --- |
| PRD 级 XMind | `cases/xmind/YYYYMM/<功能名>.xmind` | 默认输出粒度 |
| Story 聚合 XMind | `cases/xmind/YYYYMM/Story-YYYYMMDD.xmind` | 多 PRD 追加到同一文件时使用 |
| 输出路径 | 按模块与版本落盘的真实文件路径 | 在终端输出完整绝对路径 |

---

## Canonical 步骤总表

| 步骤 | 名称 | 关键动作 |
| --- | --- | --- |
| 1 | 确认输入 | 识别单文件 / 多文件 / `temp/` 目录，并解析真实 JSON 列表 |
| 2 | 校验结构 | 验证 `meta.project_name`、`meta.requirement_name`、`modules[].name` 与步骤数据完整性 |
| 3 | 计算输出路径 | 结合 `config.modules`、版本信息与命名 contract 生成目标 `.xmind` 路径 |
| 4 | 判断写入模式 | 新建 / `--append` / `--replace` 三选一；**默认新建**，`--append` 仅在用户明确要求时使用，模块重跑用 `--replace` |
| 5 | 执行转换 | 调用 `json-to-xmind.mjs` 生成或更新 `.xmind`，并输出文件路径 |
| 6 | 验证产物 | 检查文件存在、大小合理、`content.json` 中 root / L1 层级符合规范 |
| 7 | 输出通知 | 返回输出路径、模式、根节点摘要；独立执行时按需提示清理临时文件 |

---

## 执行约束

- 执行前必须阅读：本文件、`.claude/rules/xmind-output.md`、`.claude/skills/xmind-converter/references/xmind-structure-spec.md`、`.claude/skills/xmind-converter/scripts/json-to-xmind.mjs`。
- 所有路径必须是绝对路径或相对于 qa-flow 根目录的有效路径。
- **每个 PRD 始终生成独立 XMind 文件**（`<功能名>.xmind`），不受同目录其他 PRD 文件影响。`--append`（Story 聚合）仅在用户**明确要求**将多需求追加到同一文件时才允许使用；模块级重跑使用 `--replace`；其余情况默认新建。
- 输出路径必须遵守 XMind naming contract，不得把真实产物命名为保留文件名 `latest-output.xmind`。
- 仅在独立调用且输入来自 `temp/` 目录时，才提示用户是否清理临时文件。

---

## 完成定义

满足以下条件，才算本 Skill 完成：

1. 输入 JSON 已完成结构校验，且关键字段满足脚本门槛。
2. 目标 `.xmind` 已落盘到 canonical 目录，并在终端输出绝对路径。
3. 新建 / 追加 / 替换模式与实际场景匹配，没有误覆盖已有需求节点。
4. `content.json` 中的 Root → L1 → L2 → [L3] → 用例 → 步骤 → 预期层级符合规范。
5. 输出通知明确给出模式、真实路径与结构摘要；若需要清理临时文件，也已明确提示。

---

## 引用索引

- `.claude/rules/xmind-output.md`：XMind 命名 contract、路径规则、追加 / 替换口径
- `.claude/skills/xmind-converter/references/xmind-structure-spec.md`：XMind 层级映射规范
- `.claude/skills/xmind-converter/scripts/json-to-xmind.mjs`：JSON → XMind 转换脚本与结构校验规则
