---
name: prd-enhancer
description: PRD 文档增强 Skill。读取 PRD 中的 Obsidian 图片引用，用多模态能力逐张解析图片，在图片下方插入结构化文本描述，并标准化 PRD 格式。当用户提到「增强 PRD」「读取 PRD 图片」「PRD 预处理」时触发。也被 test-case-generator skill 自动调用。
---

# PRD 文档增强 Skill

本 Skill 解决 PRD 文档中图片无法被 AI 自动读取的问题，通过多模态能力逐张解析图片，生成结构化文本描述，使后续用例编写 Skill 能获取完整的 UI 信息。

**执行前必须阅读本文件、`rules/image-conventions.md` 和 `references/prd-template.md`。**

> DTStack 特殊说明：当输入来自蓝湖原始文本或低质量 PRD 时，**不得**直接把原始文本当增强结果下发给 Writer。应先经过 `prd-formalizer` 生成正式需求文档，再由本 Skill 做图片增强、结构标准化与健康度预检。

## 使用口径速查

- 本 Skill 是**单个 PRD 的增强流程**，不使用测试用例流程里的“快速模式 / 续传 / 模块级重跑”口令。
- 对同一 PRD 再次执行时，默认先走 Step 0 增量检测：优先复用已有增强文件（`status: enhanced`），只处理变更章节。
- 如需 **全量重来**，删除同目录下已有的增强 PRD 文件，再重新执行同一条增强指令。
- 单独调用本 Skill 时，主验收入口是仓库根目录 `latest-prd-enhanced.md`。
- `确认通过` / `已修改，请同步` 是 **test-case-generator Step 9 / Step 10** 的验收回复，不用于单独 PRD 增强；单独增强完成后，用户通常直接继续生成测试用例，或指出 PRD 仍需补充的内容。

---

## 一、执行流程

```
Step 0: 增量检测（是否已有 -enhanced.md）
Step 0.5: DTStack 正式需求文档检查（是否已完成 prd-formalizer）
Step 1: 定位 PRD 文件
Step 2: 扫描所有图片引用
Step 3: 定位图片文件
Step 4: 逐张读取图片（多模态）
Step 5: 生成结构化描述
Step 6: 图片重命名（语义化）
Step 7: 输出增强版 PRD（含 enhanced-at 元数据）
Step 8: PRD 健康度预检报告
Step 9: 向用户展示增强摘要
```

---

## 二、Step 0: 增量检测

在开始增强之前，检查同目录下是否已有 `status: enhanced` 的 PRD 文件：

1. 扫描同目录下所有 `.md` 文件的 front-matter，查找 `status: enhanced` 的文件
2. 如果找到已增强的文件，读取其头部 `<!-- enhanced-at: ISO8601 -->` 时间戳
3. 根据比较结果决定行为：

| 情况                                   | 行为                               |
| -------------------------------------- | ---------------------------------- |
| 已有增强文件且原始 PRD 未修改          | 跳过增强，直接使用现有增强文件     |
| 已有增强文件但原始 PRD 有更新          | 触发增量模式                       |
| 无已增强文件                           | 全量增强（Step 1 起）              |

**增量模式：**

1. 对比原始 PRD 与已增强文件的章节结构，识别新增/修改的章节
2. 只对变更章节重新提取图片描述
3. 在增强文件头部追加增量变更记录：
   ```
   <!-- incremental-update: 2026-03-25T15:00:00Z | 变更章节: 4.3新增弹窗, 4.5权限调整 -->
   ```
4. 通知用户：「检测到 PRD 有更新，仅重新处理变更章节：[章节列表]」

---

## 二点五、Step 0.5: DTStack 正式需求文档检查

如果当前输入属于 DTStack 且内容明显来自蓝湖原始提取：

1. 先检查是否已有正式需求文档（由 `prd-formalizer` 生成）
2. 若没有，则先回退到 formalizer 流程：
   - 结合 `source_context` 中的 repo/branch 阅读源码
   - 以“需求背景 / 变更范围 / 页面详细设计 / 源码补充事实 / 影响分析 / 测试关注点”模板重组内容
3. 本 Skill 只对**正式需求文档**执行后续增强，不直接向下游输出原始蓝湖文本 dump

---

## 三、Step 1: 定位 PRD 文件

接受以下输入：

- 文件绝对路径（如 `/path/to/qa-flow/cases/...`）
- 相对路径（相对于 qa-flow 根目录）
- 版本目录 + PRD 编号（如 `data-assets/v6.4.10/PRD-26`）

如用户未明确指定，询问 PRD 文件路径。

### 输出文件约定

- **命名**：直接使用需求名称作为文件名，不加 `-enhanced` 后缀
  - DTStack：文件名使用需求标题，如 `【内置规则丰富】合理性校验-多表字段值对比.md`
  - 定制项目：文件名使用需求标题，如 `数据质量-质量问题台账.md`
- **位置**：与原 PRD 文件同级目录
- **原始文件处理**：增强完成后，将原始 PRD（raw / formalized 版本）移入同目录下的 `.trash/` 子目录
  - 示例：`cases/requirements/data-assets/v6.4.10/.trash/raw-15530.md`
- **后续消费**：test-case-generator 的 Step 2 将自动查找增强后的 PRD 文件（通过 front-matter 中的 `status: enhanced` 识别）

---

## 四、Step 2: 扫描图片引用

读取 PRD 文件，使用正则提取**所有格式**的图片引用：

**Obsidian 格式（旧，需转换）：**
```
![[Pasted image YYYYMMDDHHMMSS.png]]
![[任意图片名.png]]
```

**标准 Markdown 格式（目标格式）：**
```
![alt描述](../../../../assets/images/图片名.png)
```

两种格式都要识别和提取。统计图片总数，列出所有图片引用，向用户报告：

```
发现 N 张图片引用（Obsidian 格式 X 张，标准 Markdown 格式 Y 张），开始逐张处理...
```

---

## 五、Step 3: 定位图片文件

图片文件搜索顺序：

1. **标准 Markdown 引用的路径直接解析**（如 `![alt](../../../../assets/images/xxx.png)` 按相对路径解析）
2. **仓库根目录 `assets/images/`**（所有图片的标准存放位置）
3. PRD 文件同级的 `resources/` 目录
4. PRD 文件同级的 `media/` 目录
5. PRD 文件同级目录（直接同级）
6. Obsidian vault 的全局 attachments 目录（如 `_resources/`）

> **注意**：如果图片不在根目录 `assets/images/` 中，Step 7 会自动将其移入。

---

## 六、Step 4: 压缩超大图片（读取前预处理）

**在读取图片之前，必须先对所有定位到的图片文件执行尺寸检查和压缩。**

> 原因：图片超过 2000px 时 AI 多模态能力可能跳过分析，导致描述缺失。

使用 Bash 工具，对本次 PRD 涉及的所有定位到的图片文件逐个检查并压缩：

```bash
for f in <图片绝对路径1> <图片绝对路径2> ...; do
  [ -f "$f" ] || continue
  w=$(sips -g pixelWidth "$f" | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$f" | awk '/pixelHeight/{print $2}')
  if [ "$w" -gt 2000 ] || [ "$h" -gt 2000 ]; then
    echo "压缩: $f (${w}x${h})"
    sips -Z 2000 "$f"
  fi
done
```

将占位符替换为 Step 3 中实际定位到的所有图片绝对路径。

**规则：**

- `sips -Z 2000` 等比缩放，最长边 ≤ 2000px，已达标的图片不处理
- 原位覆盖（图片仅用于 PRD 展示，不影响源文件完整性）
- 此步骤仅适用于 macOS（使用内置 `sips` 命令，无需安装依赖）
- 如果图片找不到，跳过；压缩不影响后续流程的进行

---

## 七、Step 5: 逐张读取图片（多模态）

使用 Read 工具读取图片文件（多模态能力自动解析图片内容）。

如果图片文件不存在，记录为「找不到文件」并继续处理下一张。

---

## 八、Step 6: 生成结构化描述

每张图片读取完毕后，立即生成结构化描述，格式如下：

```markdown
> **[AI图片描述]**
> 页面类型：列表页 / 表单页 / 详情页 / 弹窗 / 流程图
> UI 布局：[顶部搜索区 | 操作按钮区 | 数据列表区 | 分页区等]
> 按钮：【按钮名1】【按钮名2】...（精确到每个字）
> 表格列：列名1 | 列名2 | 列名3 | ...
> 搜索字段：字段名1 | 字段名2 | ...
> 表单字段：字段名1（文本）| 字段名2（下拉）| 字段名3（日期）
> 流程节点：节点1 → 节点2 → 节点3（仅流程图）
> 弹窗标题：xxx（仅弹窗）
> 状态/标签：状态值1 | 状态值2（如有）
> 其他关键信息：xxx
```

描述规则（严格执行）：

- 按钮名称必须精确，不得猜测
- 表格列名必须完整列出，不得省略
- 如图片模糊或无法识别，注明「图片质量不佳，部分内容无法识别」
- 禁止推断图片中不存在的内容

---

## 九、Step 7: 图片重命名与格式标准化

### 7.1 文件重命名

将无意义的图片文件名替换为语义化名称：

| 原名类型          | 示例                              | 语义化规则                |
| ----------------- | --------------------------------- | ------------------------- |
| 时间戳            | `Pasted image 20250101120000.png` | `<功能名>-<页面类型>.png` |
| UUID              | `22a6a7c3-4697-...png`            | `<功能名>-<页面类型>.png` |
| MD5 哈希          | `md5__ffe56f...png`               | `<功能名>-<页面类型>.png` |
| 已有语义化名称    | `质量问题台账列表页.png`          | 保持不变                  |

示例：

- `Pasted image 20260322143521.png` → `质量问题台账-列表页面.png`
- `22a6a7c3-4697-...png` → `流程详情页截图.png`

### 7.2 图片存放位置

所有图片统一存放到仓库根目录 `assets/images/`：
- 如果图片已在 `assets/images/` 目录中，直接重命名
- 如果图片在其他位置（resources/、media/、同级目录），移动到 `assets/images/` 并重命名

### 7.3 引用格式标准化（关键）

**无论原始 PRD 使用何种图片格式，enhanced PRD 中必须统一输出标准 Markdown 格式：**

```markdown
![语义化中文描述](../../../../assets/images/语义化文件名.png)
```

**相对路径计算方法**：从 enhanced PRD 文件所在目录到仓库根目录 `assets/images/` 的相对路径。

| 文件位置 | 相对路径前缀 |
|---------|------------|
| `cases/requirements/custom/xyzh/*.md` | `../../../../assets/images/` |
| `cases/requirements/data-assets/v{version}/*.md` | `../../../../assets/images/` |
| `cases/requirements/<module>/v{version}/*.md` | `../../../../assets/images/` |

示例（PRD 在 `cases/requirements/custom/xyzh/` 下）：

```markdown
# Obsidian 原始格式（输入）
![[Pasted image 20260322143521.png]]

# 标准 Markdown 格式（输出）
![质量问题台账列表页](../../../../assets/images/质量问题台账-列表页面.png)
```

### 7.4 操作步骤

1. 使用 Bash 重命名/移动图片文件到 `assets/images/` 目录
2. 如同名文件已存在，在新名后加 `-2`、`-3` 等后缀
3. 在 enhanced PRD 中使用标准 Markdown 格式引用（自动计算相对路径）

---

## 十、Step 8: 输出增强版 PRD

**输出文件命名规则**：直接使用需求名称，不加 `-enhanced` 后缀。

命名示例：

| 来源 | 输出文件名 |
|------|-----------|
| DTStack 蓝湖需求 `15530【内置规则丰富】合理性...` | `【内置规则丰富】合理性，多表，字段大小对比以及字段计算逻辑对比.md` |
| 定制项目 `PRD-26-数据质量-质量问题台账.md` | `数据质量-质量问题台账.md` |

输出位置：与原文件同级目录。

**原始文件处理（必须执行）：**

增强完成后，将原始 PRD（raw / formalized 版本）移入同目录下的 `.trash/` 子目录：

```bash
mkdir -p "<原文件目录>/.trash"
mv "<原始PRD文件>" "<原文件目录>/.trash/"
```

**增强版快捷入口（必须执行）：**

增强成功后，必须刷新仓库根目录快捷链接，便于用户直接验收：

```bash
node .claude/shared/scripts/refresh-latest-link.mjs "<enhanced-path>" latest-prd-enhanced.md
```

`latest-prd-enhanced.md` 是 **PRD 增强流程的主验收入口**；如果后续继续进入测试用例生成流程，最终验收对象仍以 `latest-output.xmind` 为准。

**文件格式：先写 YAML front-matter，再写 HTML comment 元数据，再写正文：**

**Step 8.1 — 读取原始 PRD front-matter（继承字段）**

在写入 enhanced 文件之前，先读取同目录的原始 PRD（或 formalized PRD）的 YAML front-matter。若原始 PRD 已有 front-matter，继承全部字段并更新 `status`；若没有，则从原始 PRD 的 blockquote header 提取关键字段：

| 提取目标 | 来源 |
|----------|------|
| `prd_name` | H1 标题（或原 `name` 字段）。**必须去除 ticket 编号前缀**：如 H1 为 `15530【内置规则丰富】合理性...`，则 `prd_name` 应为 `【内置规则丰富】合理性...`。去除规则：移除标题开头的纯数字前缀及其后的空格 |
| `prd_source` | `> 来源：` 行（保留完整内容）或原 `source` 字段 |
| `prd_version` | 文件名或 `> 来源：` 中的版本关键词，或原 `version` 字段 |
| `product` | 文件路径（`extractModuleKey` 逻辑），或原 `module` 字段 |
| `prd_id` | 原 `prd_id` 字段 |
| `prd_url` | 原 `prd_url` 字段 |
| `dev_version` | `> 开发版本：` 行或原 `dev_version` 字段 |
| `create_at` | `> 导入日期：` 行 或文件创建日期，或原 `created_at` 字段 |

**Step 8.2 — 写入 enhanced 文件，格式如下：**

```markdown
---
prd_name: "<需求标题>"
description: "<一句话描述，≤60字>"
prd_id: <需求ID数字>
prd_version: <vX.Y.Z>
prd_source: "<来源路径或描述>"
prd_url: "<蓝湖 URL，无则留空>"
product: <module-key>
dev_version: "<开发版本，无则留空>"
tags:
  - 关键词1
create_at: "<YYYY-MM-DD>"
update_at: "<ISO8601 时间戳>"
status: enhanced
health_warnings:
  - "W001: ..."
repos: []
case_path: ""
---
<!-- enhanced-at: 2026-03-25T10:00:00Z | images: 41/41 | health: 2 warnings -->

# 正文内容...
```

说明：
- `update_at` 在 enhanced 阶段设置为当前增强时间（替代旧的 `enhanced_at`）
- `health_warnings` 为警告字符串数组，空则为 `[]`
- `<!-- enhanced-at: ... -->` HTML comment 作为向后兼容标记保留
- `status: enhanced` 表示该文件已经过完整增强流程

**大纲层级规范（增强版 PRD 必须遵循）：**

增强后的 PRD 应尽量调整为以下层级结构（参见 references/prd-template.md）：
- `## 4. 功能详细设计` 下的 `### 4.x` 对应**菜单/模块名称**
- `#### 4.x.y` 对应**具体页面**（列表页、新增页、详情页等）
- 每个页面下统一包含：页面说明 → 字段定义 → 交互规则

如果原始 PRD 的章节编号已存在且合理，保留原编号但确保层级关系正确。
如果原始 PRD 缺少页面级分层，在增强时按页面拆分子章节。

**增强内容（不删除原内容，只新增/转换）：**

1. **图片格式标准化**：所有 `![[]]` Obsidian 格式转换为 `![]()` 标准 Markdown 格式
2. **图片路径标准化**：统一为从文件到根目录 `assets/images/` 的正确相对路径
3. **图片文件名语义化**：时间戳/UUID/MD5 等无意义名称替换为中文语义化名称
4. 在每张图片引用的下方插入 AI 结构化描述块
5. 如原文缺失关键章节（字段定义表、交互规则），参考 `references/prd-template.md` 补充章节标题和空框架

**不做的事：**

- 不删除原文内容
- 不改变原文的段落顺序
- 不修改原文的文字表述（图片引用格式转换除外）

---

## 十一、Step 9: PRD 健康度预检

增强完成后，自动扫描并输出健康度报告，暴露 PRD 本身的缺陷：

```
PRD 健康度预检报告：

✅ 所有图片已成功读取（41/41）
⚠️ [W001] 第 4.3 节字段「处理状态」在文本中提到，但字段定义表中未列出枚举值
⚠️ [W002] 第 4.5 节描述了「审批驳回」流程，但没有对应的流程图或状态流转说明
❌ [E001] 第 4.2 节文本提到【批量操作】按钮，但图片描述中未发现该按钮
```

问题级别：

- `✅` 正常
- `⚠️ [Wxxx]` 警告：可能遗漏信息，建议补充但不阻断流程
- `❌ [Exxx]` 错误：存在明显矛盾或缺失，建议修复后再生成用例

常见检查项：

| 检查项         | 说明                                 |
| -------------- | ------------------------------------ |
| 图片读取率     | 失败图片是否影响关键页面             |
| 字段枚举值缺失 | 文本提到的枚举字段是否有完整选项列表 |
| 按钮名称矛盾   | 文本与图片描述中的按钮名称是否一致   |
| 必填字段未标注 | 字段定义表是否缺少「是否必填」列     |
| 交互规则缺失   | 有联动字段但无交互规则说明           |
| 流程图缺失     | 文本描述了审批/状态流转但无流程图    |

**如有 ❌ 错误级问题：** 向用户说明，建议修复后再继续；用户可选择「忽略，继续」。

---

## 十二、Step 10: 向用户展示增强摘要

```
PRD 增强完成！

输出文件：<文件路径>

图片处理：N 张 → 成功 M 张（失败 P 张：[文件名列表]）
关键信息：X 个功能页面 | N 个按钮 | M 个表单字段（含 K 个必填字段）

PRD 健康度：
  ✅ 无错误
  ⚠️ 2 条警告（见上方预检报告）

下一步建议：
若健康度无阻断问题，可继续生成测试用例。
若有警告，建议通知 PRD 作者补充后再继续。
```

---

## 参考文件

- `rules/image-conventions.md` — 图片引用规范（存放位置、命名、压缩）
- `references/prd-template.md` — 标准化 PRD 模板规范和图片描述格式
- `prompts/prd-formalizer.md` — DTStack 正式需求文档生成要求
