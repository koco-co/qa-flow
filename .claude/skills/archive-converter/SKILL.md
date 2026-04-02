---
name: archive-converter
description: 历史用例归档转化 Skill。将非 Markdown 格式的历史测试用例（CSV、XMind）转化为标准化 Markdown 归档用例。当用户说「转化历史用例」「归档用例」「将XMind转为MD」「转换用例格式」「convert cases」「archive convert」「更新归档用例」时触发。支持全量转化、指定文件/模块转化和检测模式。
---

# 历史用例归档转化 Skill

## 用途与触发词

- **用途**：将历史 CSV / XMind 用例转化为标准化 Archive Markdown，统一存放到 `cases/archive/` 目录，供后续 Writer / Reviewer / 检索流程复用。
- **触发词**：`转化历史用例`、`归档用例`、`将XMind转为MD`、`转换用例格式`、`convert cases`、`archive convert`、`更新归档用例`
- **调用关系**：既可由用户单独触发，也可被 `test-case-generator` 在前置归档阶段自动调用。

---

## 使用口径速查

- 默认是**增量转化**：已有归档文件会跳过；需要强制覆盖时显式使用 `--force`。
- 支持三种运行视角：**全量模式**、**指定模式**、**检测模式**；检测模式只列待处理项，不写文件。
- 已配置模块优先走 `resolveModulePath(moduleKey, 'archive', config, version)`；未知模块或 `custom/`、特殊分类子目录保留 source-relative `cases/archive/...` fallback。
- 归档 front-matter 的文档状态按共享 schema 写回中文值；Archive 示例统一写作 `status: "已归档"`。

---

## 输入 / 输出契约

### 输入

| 输入类型 | 示例 | 说明 |
| --- | --- | --- |
| 全量命令 | `转化所有历史用例` | 扫描全部历史来源并增量转化 |
| 指定文件 | `将 cases/xmind/orders/Story-20260322.xmind 转为MD` | 只处理单个文件或目录 |
| 指定模块 | `转化 orders 的历史用例` | 接受模块 key 或 `config.modules[key].zh` |
| 检测命令 | `检查哪些历史用例还没转化` | 只输出待处理结果，不写文件 |

### 输出

| 来源 | 输出目录 | 说明 |
| --- | --- | --- |
| 已配置模块的历史来源 | `resolveModulePath(moduleKey, 'archive', config, version)` | 配置驱动的 canonical 路由 |
| 按年月归档 | `cases/archive/YYYYMM/` | 新约定落盘形态 |
| 未配置模块 / `custom/` / 特殊分类目录 | `cases/archive/...` | 保留 source-relative fallback，避免模板仓库或历史目录失联 |

**归档 front-matter 示例：**

```yaml
status: "已归档"
origin: xmind
```

---

## Canonical 步骤总表

| 步骤 | 名称 | 关键动作 |
| --- | --- | --- |
| 1 | 解析用户指令 | 确定运行模式（全量 / 指定 / 检测）与目标范围（全部 / 模块 / 文件） |
| 2 | 解析来源与输出路径 | 识别 CSV / XMind 来源，结合 `config.modules` 与版本信息计算 Archive 目录 |
| 3 | 执行转化脚本 | 调用 `convert-history-cases.mjs`，按需附加 `--path` / `--module` / `--detect` / `--force` |
| 4 | 汇总结果 | 收集成功 / 跳过 / 失败统计；检测模式仅输出待转化项 |
| 5 | 输出完成通知 | 返回输出目录、失败原因与后续建议；若被主流程调用，则把结果交给后续步骤消费 |

---

## 执行约束

- 执行前必须阅读：本文件、`.claude/rules/archive-format.md`、`.claude/skills/archive-converter/scripts/convert-history-cases.mjs`。
- `--module` 参数接受中文名或 key；映射关系来自 `.claude/config.json` 的 `modules`，不得在文档中手写固定模块映射表。
- 只对当前目标范围内的历史文件做转化，不改写无关 Archive 文档。
- `--detect` 模式只做盘点；除非用户明确要求或传入 `--force`，否则不覆盖已存在的归档文件。
- 输出 Markdown 必须符合 Archive 层级规范与中文状态写回约定。

---

## 完成定义

满足以下条件，才算本 Skill 完成：

1. 目标范围、运行模式与脚本参数已经对应正确。
2. 所有成功转化的文件都写入 `cases/archive/` 下的 canonical 目录。
3. 结果摘要明确给出成功 / 跳过 / 失败统计；失败项附带原因。
4. 归档文档符合 `.claude/rules/archive-format.md`，且示例状态、写回状态统一为中文 Archive 状态。
5. 若由 `test-case-generator` 自动调用，后续步骤可以直接消费新生成的 Archive Markdown。

---

## 引用索引

本 Skill 也会被 test-case-generator 在 Step 1.4 自动调用——当检测到目标模块存在未转化的历史用例时，自动触发归档转化，确保后续 Brainstorming 和 Writer 能引用到完整的历史用例上下文。

自动调用时等价于：

```bash
node .claude/skills/archive-converter/scripts/convert-history-cases.mjs --module <当前模块名或key>
```

---

## 八、完成通知

转化完成后，向用户输出：

```
✅ 历史用例归档转化完成

转化统计：
- 成功：<N> 个文件
- 跳过（已存在）：<M> 个文件
- 失败：<K> 个文件

输出目录：<cases/archive/... 路径>
```

如有失败文件，额外展示：

```
❌ 失败文件：
- <文件路径>：<失败原因>
```

---

### IM 通知

在终端输出转化统计后，调用通知模块：

```bash
node .claude/shared/scripts/notify.mjs \
  --event archive-converted \
  --data '{"fileCount":<成功转化文件数>,"caseCount":<总用例数>}'
```

参数说明：
- `fileCount`：成功转化的文件数量（数字）
- `caseCount`：总用例条数（数字）

> ⚠️ 若 notify.mjs 执行失败，仅 console.error 记录，不影响已转化的归档文件。
> 💡 调试：添加 `--dry-run` 查看发送内容。

---

## 参考文件

- `.claude/rules/archive-format.md`：Archive Markdown 模板、front-matter 与层级映射
- `.claude/skills/archive-converter/scripts/convert-history-cases.mjs`：历史用例批量 / 增量转化脚本
