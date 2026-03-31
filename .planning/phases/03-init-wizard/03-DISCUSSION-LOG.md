# Phase 3: Init Wizard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 03-init-wizard
**Areas discussed:** 结构推断策略, 历史文件解析, Config 生成交互模式, CLAUDE.md 模板内容, Re-init / 增量更新

---

## 结构推断策略

### Q1: 向导启动后如何获取模块信息？

| Option | Description | Selected |
|--------|-------------|----------|
| 先扫描再确认 | 扫描项目目录自动推断模块列表和版本信息，展示给用户确认/修改 | |
| 纯问答引导 | 不扫描，直接问用户有哪些模块，是否需要版本管理 | |
| 智能混合 | 先扫描，有意义结构则推断+确认，完全空目录退化为问答引导 | ✓ |

**User's choice:** 智能混合模式
**Notes:** 兼顾已有项目迁移场景和全新空白项目场景

---

### Q2: 扫描应识别哪些信号？

| Option | Description | Selected |
|--------|-------------|----------|
| 五类信号全量采集 | cases/子目录、PRD版本号、XMind/CSV历史文件、.repos/仓库、assets/images/图片 | ✓ |

**User's choice:** 足够，五类信号全量采集
**Notes:** 用户确认这五类信号覆盖了所有需要检测的项目特征

---

### Q3: 推断结果如何展示给用户确认？

| Option | Description | Selected |
|--------|-------------|----------|
| JSON 预览 | 直接展示即将写入的 config.json 片段 | |
| 结构化摘要 | Markdown 表格展示推断摘要（模块名/是否版本化/路径） | ✓ |
| 逐项问答 | 每推断出一个模块就立即询问确认 | |

**User's choice:** 结构化摘要（Markdown 表格）
**Notes:** 整体确认后再生成 config，扫描阶段不写任何文件

---

### Q4: 推断结果有误时如何修正？

| Option | Description | Selected |
|--------|-------------|----------|
| 对话式修正 | 用户用自然语言描述修改，向导理解后重新展示 | |
| 让用户直接编辑 | 展示摘要后让用户去手动改草稿 config.json | |
| 向导内问答修正 | 显示摘要后逐项问，用户输入新值 | ✓ |

**User's choice:** 向导内问答修正
**Notes:** 向导实时更新后重新展示确认表格

---

## 历史文件解析

### Q1: 历史文件解析的触发时机？

| Option | Description | Selected |
|--------|-------------|----------|
| 主动上传 | init 流程中专门有一步询问历史文件路径 | |
| 自动检测 | 扫描阶段发现 cases/history/ 下有文件则自动解析 | |
| 两者皆可 | 自动检测 cases/history/，确认后还追问是否有其他历史文件 | ✓ |

**User's choice:** 两者皆可
**Notes:** 自动检测为主，主动提供路径为补充

---

### Q2: 模块 key 推断命名规则？

| Option | Description | Selected |
|--------|-------------|----------|
| 文件名提取 | 正则剥离日期前缀/版本号后缀，剩余部分作为候选 key | |
| 内容解析优先 | 从 CSV 表头或 XMind 根/L1 节点提取，文件名作 fallback | |
| 向导询问 | 解析后展示候选名，用户确认或输入正确 key | ✓ |

**User's choice:** 向导询问确认
**Notes:** 文件名+内容两路提取候选名，用户最终拍板

---

### Q3: 多来源推断结果如何合并？

| Option | Description | Selected |
|--------|-------------|----------|
| 去重合并 | 相同 key 只保留一条，来源合并标注 | |
| CSV 优先 | 文件内容解析结果覆盖目录扫描结果 | |
| 分别展示再合并 | 先展示目录扫描结果，再展示文件解析新增/冲突项，用户逐项决定 | ✓ |

**User's choice:** 分别展示再合并
**Notes:** 透明度优先，让用户清楚了解每条推断的来源

---

## Config 生成交互模式

### Q1: 非模块字段如何收集？

| Option | Description | Selected |
|--------|-------------|----------|
| 全量问答 | 逐一询问所有字段，包括 repos、branchMapping、lanhu 等 | ✓ |
| 最小化问答 | 只问必填字段，其余默认值，用户事后手动编辑 | |
| 分层问答 | 先核心字段，高级配置单独一步按需展开 | |

**User's choice:** 全量问答
**Notes:** 确保用户完整配置所有功能，不遗漏重要选项

---

### Q2: 全量问答的顺序和分组？

| Option | Description | Selected |
|--------|-------------|----------|
| 线性顺序 | 按 config schema key 顺序逐一问 | |
| 功能分组 | ①基础信息→②模块配置→③源码仓库→④集成工具→⑤确认写入 | ✓ |
| 布尔门控 | 每组先问「是否需要配置xxx？」，否则跳过整组 | |

**User's choice:** 功能分组（五步顺序）
**Notes:** 清晰的认知分组，避免字段堆砌感

---

### Q3: 写入前如何最终确认？

| Option | Description | Selected |
|--------|-------------|----------|
| 纯文字摘要 | 列出所有配置项的值，问「确认写入吗？」 | ✓ |
| 完整 JSON 预览 | 展示即将写入的完整 config.json | |
| 差异对比 | re-init 展示 diff，全新展示完整 JSON | |

**User's choice:** 纯文字摘要
**Notes:** 简洁清晰，避免技术细节干扰用户决策

---

## CLAUDE.md 模板内容

### Q1: Skill 菜单是固定还是动态生成？

| Option | Description | Selected |
|--------|-------------|----------|
| 固定模板 | CLAUDE.md 完整复制标准模板，不管实际安装了什么 | |
| 动态生成 | 检测 .claude/skills/ 下实际存在的 Skill，只列已安装的 | |
| 模板+占位符 | 固定标准模板，关键变量自动替换为用户真实配置值 | ✓ |

**User's choice:** 模板 + 占位符替换
**Notes:** 保持模板稳定性，同时让示例命令有实际意义

---

### Q2: 快速示例如何填充模块名？

| Option | Description | Selected |
|--------|-------------|----------|
| 取第一个模块 | 把推断出的第一个模块 key 和版本号填入示例 | |
| 每个模块各生成一行 | 模块≤3 个时每个都生成一条示例 | |
| 通用占位符 | 示例写成 `为 <module-key> 生成测试用例` 形式 | ✓ |

**User's choice:** 保留通用占位符格式
**Notes:** 模板通用性优先，用户一看就知道需要替换成自己的模块名

---

### Q3: repos 条件块如何处理？

| Option | Description | Selected |
|--------|-------------|----------|
| 始终写入完整模板 | 所有条件块都保留，靠注释告知 Claude 何时生效 | |
| 按配置裁剪 | init 时检测 repos 是否配置，决定是否写入条件段落 | |
| Agent's Discretion | 交给 Claude 实现时判断 | ✓ |

**User's choice:** Agent's Discretion
**Notes:** 用户认为这个技术细节交由实现者决定更合适

---

## Re-init / 增量更新

### Q1: 已有 config.json 时 init 的默认行为？

| Option | Description | Selected |
|--------|-------------|----------|
| 总是覆盖 | 重新走完整流程，原内容丢失 | |
| 总是合并 | 加载已有 config 作为默认值，走问答后合并写入 | |
| 先问再决定 | 检测到已有 config 时先问用户意图 | ✓ |

**User's choice:** 先问再决定
**Notes:** 安全第一，不自动覆盖用户已有配置

---

### Q2: 增量更新的粒度？

| Option | Description | Selected |
|--------|-------------|----------|
| 按功能组 | 展示五个功能组，用户勾选要重新配置的 | ✓ |
| 按字段 | 展示所有字段当前值，用户指定要修改哪个字段 | |
| 自然语言 | 用户说「加一个模块」，向导理解后跳转对应步骤 | |

**User's choice:** 按功能组
**Notes:** 与初始化时的五步分组保持一致，降低认知负担

---

### Q3: re-init 时 CLAUDE.md 如何处理？

| Option | Description | Selected |
|--------|-------------|----------|
| 始终重新生成 | 用新模板 + 最新 config 值重写 CLAUDE.md | |
| 不动 CLAUDE.md | init 只更新 config.json，CLAUDE.md 不触碰 | |
| 询问 | 每次 re-init 都问「是否同时更新 CLAUDE.md？」 | ✓ |

**User's choice:** 询问
**Notes:** 用户可能手动定制过 CLAUDE.md，不应自动覆盖

---

## Agent's Discretion

- CLAUDE.md 中 repos 条件块的写入策略（始终写入 vs 按配置裁剪）
- `cases/history/` 内文件的具体解析逻辑（XMind 节点深度映射、CSV 表头列识别规则）
- 模块 key 候选名的中文转英文 slug 策略
- init 向导的具体实现载体（新增 Node.js 脚本 vs 纯 Claude 对话编排）

## Deferred Ideas

- 生成 `.env.example` 文件 — 属于 Phase 5/6 范畴
- init 完成后自动批量归档历史 CSV/XMind — 可作为 Phase 4 Skills 重设计的一部分
