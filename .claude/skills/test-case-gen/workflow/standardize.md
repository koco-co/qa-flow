# test-case-gen · standardize workflow（XMind/CSV → 标准化 Archive MD）

> 由 SKILL.md 路由后加载。触发：输入文件扩展名为 `.xmind` 或 `.csv`，或含「标准化归档 / 归档用例 / 转化用例」触发词。
> 此流程不走 10 节点主流程，独立 4 步完成。

---

## 标准化归档流程（XMind / CSV 输入）

> 当用户提供的输入是 `.xmind` 或 `.csv` 文件（而非 PRD）时，进入此流程。
> 此流程**不走** 7 节点工作流，而是走独立的 4 步标准化流程。

### 触发条件

用户输入文件扩展名为 `.xmind` 或 `.csv`，或包含触发词：标准化归档、归档用例、转化用例。

**⏳ Task**：使用 `TaskCreate` 创建 4 个标准化归档任务（`S1 解析源文件`、`S2 标准化重写`、`S3 质量审查`、`S4 输出`），按顺序设置 `addBlockedBy` 依赖。将 `S1` 标记为 `in_progress`。

### 步骤 S1: 解析源文件

```bash
kata-cli history-convert --path {{input_file}} --project {{project}} --detect
```

展示解析结果后，使用 AskUserQuestion 工具向用户确认：

- 问题：`已解析源文件 {{input_file}}（{{xmind|csv}}），共 {{count}} 条用例。选择处理方式？`
- 选项 1：标准化归档 — AI 按规则重写用例（推荐）
- 选项 2：仅格式转换 — 保留原始内容，直接转为 Archive MD
- 选项 3：查看原始用例内容

> **选项 1（标准化归档）**：AI 读取原始用例内容，按 `test-case-rules.md` 全部规则重写步骤、预期、前置条件，确保达到自动化可执行精度。原始 XMind/CSV 内容**不直接放入**产物中。
> **选项 2（仅格式转换）**：调用 `history-convert.ts` 直接转换，不经过 AI 重写。

**✅ Task**：将 `S1` 标记为 `completed`（subject: `S1 解析源文件 — {{count}} 条用例`）。

### 步骤 S2: AI 标准化重写（仅选项 1）

**⏳ Task**：将 `S2` 标记为 `in_progress`。

派发 `standardize-agent`（model: sonnet）对解析出的原始用例逐模块执行标准化重写：

- 应用步骤三要素（操作位置 + 操作对象 + 操作动作）
- 补充等待条件
- 预期结果可断言化
- 前置条件操作化
- 标题与优先级遵循 Contract A（见 Contract A/B 定义）：`title=验证xxx`，`priority` 独立存放
- 模糊步骤具体化、占位数据替换为真实业务数据
- 合并符合条件的正向用例

输出中间 JSON 格式（见 Contract A/B 定义）：与 writer 输出一致，使用 Contract A；如需 `【P1】验证xxx`，仅在 Archive MD / 展示面按 Contract B 组装。

**✅ Task**：将 `S2` 标记为 `completed`（subject: `S2 标准化重写 — 完成`）。

### 步骤 S3: 质量审查

**⏳ Task**：将 `S3` 标记为 `in_progress`。

派发 `reviewer-agent`（model: opus）对标准化后的 JSON 执行审查。
质量门禁与普通模式一致（15% / 40%）。

**✅ Task**：将 `S3` 标记为 `completed`（subject: `S3 质量审查 — 问题率 {{rate}}%`）。

### 步骤 S4: 输出

**⏳ Task**：将 `S4` 标记为 `in_progress`。

> **路径规则**：标准化产物（含 `-standardized` 后缀的 MD 和 XMind）属于中间产物，必须输出到 archive 下的 `tmp/` 子目录，不得直接放在 archive 或 xmind 根目录下。
>
> - Archive MD → `workspace/{{project}}/archive/{{YYYYMM}}/tmp/{{name}}-standardized.md`
> - XMind → `workspace/{{project}}/archive/{{YYYYMM}}/tmp/{{name}}-standardized.xmind`
> - 中间 JSON 也保留在同一 `tmp/` 目录
> - 禁止输出到 `workspace/cases/` 目录（该目录不存在且不应被创建）

```bash
# 生成标准化 Archive MD（输出到 tmp/ 子目录）
kata-cli archive-gen convert --input {{final_json}} --project {{project}} --output {{archive_tmp_path}}

# 从标准化 JSON 生成 XMind（输出到 tmp/ 子目录）
kata-cli xmind-gen --input {{final_json}} --project {{project}} --output {{xmind_tmp_path}} --mode create

# 通知
kata-cli plugin-loader notify --event archive-converted --data '{"fileCount":1,"caseCount":{{count}}}'
```

**✅ Task**：将 `S4` 标记为 `completed`（subject: `S4 输出 — {{count}} 条用例已归档`）。

### 完成摘要（状态展示，无需确认）

标准化归档完成后，直接展示摘要并结束当前流程：

- Archive MD：`{{archive_tmp_path}}`
- XMind：`{{xmind_tmp_path}}`
- 用例数：标准化前 `{{original_count}}` 条，标准化后 `{{final_count}}` 条
- 如用户后续提出编辑意图，再路由到 `xmind-editor` skill

