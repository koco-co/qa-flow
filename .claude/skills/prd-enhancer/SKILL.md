---
name: prd-enhancer
description: PRD 文档增强 Skill。读取 PRD 中的 Obsidian 图片引用，用多模态能力逐张解析图片，在图片下方插入「图N 页面要点」，并标准化 PRD 格式。当用户提到「增强 PRD」「读取 PRD 图片」「PRD 预处理」时触发。也被 test-case-generator skill 自动调用。
---

# PRD 文档增强 Skill

## 用途与触发词

- **用途**：将单个 PRD 中的图片内容转为可检索的结构化页面要点，并统一图片引用、front-matter 与输出骨架，供后续流程消费。
- **触发词**：`增强 PRD`、`读取 PRD 图片`、`PRD 预处理`
- **调用关系**：既可由用户直接触发，也可由 `test-case-generator` 作为上游编排自动调用。

---

## 使用口径速查

- 本 Skill 只处理**单个 PRD 的增强与标准化**，不负责生成测试用例。
- 增强文件识别以 front-matter `status` 为准：读取兼容 `enhanced` / `已增强`，写回统一 `已增强`。
- 对同一 PRD 再次执行时，先做增量检测；若原始 PRD 未变化，优先复用现有增强文件。
- 如需全量重来，删除同目录现有增强文件后重新执行。
- 本 Skill 消费的是临时整理结果或正式 PRD；**不要求在 requirements 目录保留 formalized 文件**。
- 单独调用本 Skill 时，主验收入口是仓库根目录 `latest-prd-enhanced.md`。
- `确认通过`、`已修改，请同步` 等回复口径属于 test-case-generator 验收阶段，不属于本 Skill 的单独执行口径。

---

## 输入 / 输出契约

### 输入

| 类型 | 说明 |
| --- | --- |
| 文件绝对路径 | 指向单个 PRD Markdown 文件 |
| 相对路径 | 相对于 qa-flow 根目录的 PRD 路径 |
| 模块/版本/编号 | 如 `orders/v2.0/PRD-26`，需能唯一定位到目标 PRD |
| 外部平台原始文本 | 仅在通过前置正式化门禁后才能进入本 Skill 主流程 |

### 输出

| 产物 | 说明 |
| --- | --- |
| 增强版 PRD | 与原文件同级输出，不依赖 `-enhanced` 文件名后缀识别 |
| 图片要点块 | 每张图片下方插入 `图N 页面要点`，格式见 `references/page-insight-format.md` |
| 标准化图片引用 | 统一为标准 Markdown 引用，并指向 `assets/images/` |
| front-matter | 继承原字段并按 `references/frontmatter-status-map.md` 写回中文状态 |
| 快捷入口 | 刷新仓库根目录 `latest-prd-enhanced.md` |

---

## 步骤总表

### 前置检查链路

执行顺序与判断口径见 `references/preflight-flow.md`。

### 主流程

| 步骤 | 名称 | 关键产出 / 引用 |
| --- | --- | --- |
| 1 | 扫描图片引用 | 统计 Obsidian / Markdown 两类图片引用 |
| 2 | 定位图片文件 | 得到每张图片的可用文件路径 |
| 3 | 压缩超大图片 | 将超限图片预处理到可读范围 |
| 4 | 逐张读取图片 | 产出多模态识别结果 |
| 5 | 生成页面要点 | 按 `references/page-insight-format.md` 写入 `图N 页面要点` |
| 6 | 图片重命名与引用标准化 | 统一语义化命名、归档到 `assets/images/`、修正引用 |
| 7 | 输出增强版 PRD | 按 `references/prd-template.md` 写入文档并刷新快捷链接 |
| 8 | PRD 健康度预检 | 输出 warnings / errors，暴露 PRD 缺口 |
| 9 | 向用户展示增强摘要 | 汇总图片处理结果、健康度与下一步建议 |

---

## 执行约束

- 执行前必须阅读：`rules/image-conventions.md`、`references/preflight-flow.md`、`references/page-insight-format.md`、`references/frontmatter-status-map.md`、`references/prd-template.md`。
- 当 `config.repos` 非空且输入明显来自外部平台原始文本时，必须先经过 `prd-formalizer`，本 Skill 不直接处理原始平台文本。
- 仅在用户直接调用 prd-enhancer 且前置链路判断确有缺口时，才触发独立需求澄清；由 `test-case-generator` 自动调用时跳过该前置能力。
- 读取阶段兼容英文/中文 front-matter 状态；写回阶段统一使用中文状态值。
- 不删除原文内容，不改变正文业务语义；只做图片引用标准化、页面要点补充、front-matter 对齐与必要结构补全。
- 图片下方的用户可见结构统一使用 `图N 页面要点`，不得回退到旧版图片描述块。
- `latest-prd-enhanced.md` 是本 Skill 的主验收入口；若后续进入用例生成流程，再以 `latest-output.xmind` 作为最终验收物。
- 刷新快捷链接时必须使用显式命令：`node .claude/shared/scripts/refresh-latest-link.mjs "<enhanced-path>" latest-prd-enhanced.md`

---

## 完成定义

满足以下条件，才算本 Skill 完成：

1. 前置检查链路已执行完毕，且主流程仅针对正式 PRD 运行。
2. 所有可定位图片均完成读取，失败项已在摘要中明确说明。
3. 每张已处理图片下方都写入 `图N 页面要点`。
4. 输出文件符合 `references/prd-template.md` 约定，front-matter 状态写回为中文。
5. 图片引用已标准化，快捷入口 `latest-prd-enhanced.md` 已刷新。
6. 已输出 PRD 健康度预检结果与增强摘要，便于用户决定是否继续生成测试用例。

---

## 引用索引

- `rules/image-conventions.md`：图片存放、命名、压缩与引用规则
- `references/preflight-flow.md`：前置检查链路与触发边界
- `references/page-insight-format.md`：`图N 页面要点` 标准格式
- `references/frontmatter-status-map.md`：front-matter 状态读写规则
- `references/prd-template.md`：增强版 PRD 模板与章节骨架
- `prompts/prd-formalizer.md`：正式需求文档整理要求（触发正式化门禁时使用）
