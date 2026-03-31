---
name: xmind-converter
description: 将中间 JSON 格式的测试用例转换为 .xmind 文件。当用户提到「转换为 XMind」「生成 XMind 文件」「输出 XMind」时触发。也被 test-case-generator skill 作为最后一步自动调用。
---

# XMind 转换 Skill

本 Skill 将测试用例的中间 JSON 格式转换为可用 XMind 打开的 `.xmind` 文件。

**在执行任何操作前，必须阅读本文件、`rules/xmind-output.md` 和 `references/xmind-structure-spec.md`。**

---

## 一、执行流程

```
Step 1: 确认输入 JSON 文件路径
Step 2: 验证 JSON 格式
Step 3: 确定输出路径和文件名
Step 4: 判断是新建还是追加模式
Step 5: 运行转换脚本
Step 6: 验证输出文件
Step 7: 通知用户
```

---

## 二、输入格式要求

接受以下输入形式：
1. **单个 JSON 文件路径** — 直接转换
2. **多个 JSON 文件路径** — 合并后转换（meta 取第一个文件，modules 全部合并）
3. **temp/ 目录路径** — 自动扫描目录下所有 `.json` 文件进行合并转换

JSON 格式必须符合 `references/intermediate-format.md` 中定义的结构。

---

## 三、输出文件规则

### 文件命名
```
<功能名>.xmind
```
- `功能名` 来自 `meta.requirement_name`，去除特殊字符

示例：`数据质量-质量问题台账.xmind`

### 输出目录

**DTStack 模块**：当 `meta.prd_version` 存在（如 `v6.4.10`）时，输出到版本子目录；否则输出到模块根目录：

| project_name | 有 prd_version（如 v6.4.10） | 无 prd_version |
|---|---|---|
| DTStack 离线开发 | `cases/xmind/batch-works/v6.4.10/` | `cases/xmind/batch-works/` |
| DTStack 数据资产 | `cases/xmind/data-assets/v6.4.10/` | `cases/xmind/data-assets/` |
| DTStack 统一查询 | `cases/xmind/data-query/v6.4.10/` | `cases/xmind/data-query/` |
| DTStack 变量中心 | `cases/xmind/variable-center/v6.4.10/` | `cases/xmind/variable-center/` |
| DTStack 公共组件 | `cases/xmind/public-service/v6.4.10/` | `cases/xmind/public-service/` |
| 信永中和 | `cases/xmind/custom/xyzh/`（无版本子目录） | `cases/xmind/custom/xyzh/` |
| 其他 | `cases/xmind/` | `cases/xmind/` |

> `meta.module_key`（如 `data-assets`）优先用于确定模块路径；`meta.prd_version` 决定是否创建版本子目录。

---

## 四、模式判断（新建 vs 追加）

在运行脚本前，先检查目标路径是否已有 .xmind 文件：

| 情况 | 默认行为 |
|------|---------|
| 目标文件不存在 | 新建模式（直接生成） |
| 目标文件已存在，新旧 requirement_name 不同 | 追加模式（`--append`）：将新需求作为新 L1 节点追加 |
| 目标文件已存在，requirement_name 相同，普通生成 | 询问用户：覆盖 or 跳过 |
| 目标文件已存在，模块级重跑场景 | 替换模式（`--replace`）：找到同名 L1 节点替换，避免重复 |

**同一 Story 多个 PRD 的推荐做法：** 全部追加到同一个 XMind 文件，文件名用 Story 编号命名：
```
Story-YYYYMMDD.xmind
```

示例：
```
Story-20260322.xmind
```
这样一个 Story 的所有 PRD 用例都在同一个文件里，方便整体评审。

> 对应的 Story 聚合 Archive Markdown 仅在明确需要汇总时生成；默认 PRD 级归档仍优先保留 `PRD-XX-<功能名>.md`。

---

## 五、转换命令

```bash
# 新建模式（目标文件不存在时自动使用）
node .claude/skills/xmind-converter/scripts/json-to-xmind.mjs <input.json> <output.xmind>

# 多文件合并转换
node .claude/skills/xmind-converter/scripts/json-to-xmind.mjs <input1.json> <input2.json> <output.xmind>

# 追加模式（向现有 .xmind 追加新需求，用于同一 Story 多 PRD 场景）
node .claude/skills/xmind-converter/scripts/json-to-xmind.mjs --append <input.json> <existing.xmind>

# 替换模式（找到同名 L1 节点并替换，用于模块级重跑）
node .claude/skills/xmind-converter/scripts/json-to-xmind.mjs --replace <input.json> <existing.xmind>
```

**追加模式行为：**
- 目标文件的 rootTopic title 与根节点标题（`${中文产品名}${版本}迭代用例(#${禅道产品ID})`）相同 → 将新 L1 节点追加到该 root 的 children
- 不匹配 → 作为新 sheet 添加

**替换模式行为：**
- 在现有文件中查找与 `【version】requirement_name` 同名的 L1 节点 → 替换其 children
- 未找到同名 L1 → 追加新 L1（降级为 --append 行为）
- 用于模块级重跑，避免同名 L1 节点重复

**注意：** 所有路径必须是绝对路径或相对于工作目录（qa-flow/）的路径。

---

## 六、验证步骤

转换完成后，执行以下验证：

```bash
# 验证文件存在且大小合理
ls -la <output.xmind>

# 解压验证 content.json 结构（检查 rootTopic.title 是否正确）
unzip -p <output.xmind> content.json | python3 -m json.tool | head -30
```

验证通过标准：
- 文件大小 > 1KB
- `rootTopic.title` 等于根节点标题（DTStack 格式: `${中文产品名}${版本}迭代用例(#${禅道产品ID})`）
- 子节点层级正确（Root → L1 → L2 → [L3] → 用例 → 步骤 → 预期）

---

## 七、清理策略

### 作为 test-case-generator 子流程

> ⚠️ 当作为 test-case-generator 流程的一部分执行时，**不在此步清理临时文件**。
> 临时文件（temp/ 和 .qa-state.json）的清理延迟到 Step 10（用户验证通过后）执行。

### 独立使用时

当独立使用 xmind-converter 时（非工作流调用），转换完成后自动提示用户是否清理：

1. 检查输入 JSON 是否位于 `temp/` 目录下
2. 如果是，输出提示：`临时文件已转换完成，是否删除 temp/ 目录？[是/否]`
3. 如不在 `temp/` 目录下，不提示清理

手动清理命令：

```bash
rm -rf cases/requirements/<project>/<Story>/temp/
rm -f cases/requirements/<project>/<Story>/.qa-state.json
```

---

## 八、完成通知

转换完成后，向用户输出：

```
XMind 文件已生成：<相对路径>/<文件名>.xmind
模式：[新建 / 追加]

文件结构摘要：
- 根节点：<中文产品名><版本>迭代用例(#<禅道产品ID>)
- 版本：<version>
- 需求：<requirement_name>
- 模块数：<N> 个
- 总用例数：<M> 条

可使用 XMind 应用打开查看。
```

如果是工作流调用，还会同步生成归档 MD 文件（由 Step 9 自动执行）。

---

## 参考文件

- `rules/xmind-output.md` — XMind 命名 contract、输出路径、追加模式规范
- `references/xmind-structure-spec.md` — XMind 层级映射规范
