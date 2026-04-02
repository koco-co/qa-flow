<!-- step-id: parse-input | delegate: testCaseOrchestrator -->
# Step parse-input：解析用户指令 + 断点续传检测

> 前置条件: `last_completed_step` == `0`
> 快速模式: 执行
> 业务专属: 否

## 1.0 蓝湖 URL 检测（前置，优先级最高）

**触发条件：** 用户输入中包含 `lanhuapp.com` URL。

**处理流程：**

1. **提取 URL 参数**：从 URL 中解析 `tid`、`pid`、`docId`、`docType`
2. **确认 lanhu-cli 可用**：
   ```bash
   tools/lanhu-cli/.venv/bin/lanhu --help
   ```
   - 若命令不存在 → 提示用户先执行环境初始化（`/using-qa-flow init`）后重试

3. **获取页面列表**：
   ```bash
   tools/lanhu-cli/.venv/bin/lanhu pages list "<URL>"
   ```
   - 若返回 418 → Cookie 已过期，向用户展示：
     ```
     蓝湖 Cookie 已过期，请更新 tools/lanhu-cli/.env 中的 LANHU_COOKIE 值后重试。

     操作步骤：
     1. 在浏览器打开 lanhuapp.com 并登录
     2. 按 F12 → Network → 任意 api/ 请求 → 复制 Request Headers 中的 Cookie 字符串
     3. 更新 tools/lanhu-cli/.env：LANHU_COOKIE="<粘贴的完整 Cookie>"
     4. 重新发送指令继续
     ```
     **等待用户确认后重试，不自动继续下一步。**
   - 成功后向用户展示页面列表：
     ```
     蓝湖文档「xxx」包含以下页面：

     [1] ✅ 商品列表
     [2] ✅ 新增商品
     [3] ✅ 订单详情
     [4] ✅ 用户资料

     默认导入全部页面。
     - 输入编号排除（如「排除 4」或「只要 1,2,3」）
     - 直接回复「确认」继续
     - 回复「取消」中止
     ```
   - **等待用户明确回复**后才进入第 4 步
   - 不回复不继续
4. **分析页面内容**，参数根据用户选择构建：
   ```bash
   # 全部页面
   tools/lanhu-cli/.venv/bin/lanhu pages analyze "<URL>" --mode text_only --analysis-mode tester

   # 指定页面（逗号分隔）
   tools/lanhu-cli/.venv/bin/lanhu pages analyze "<URL>" --page-names "商品列表,新增商品" --mode text_only --analysis-mode tester
   ```
5. **整理输出为 PRD Markdown**：
   - 文件格式：**先写 YAML front-matter，再写正文**（见下方 Schema）
   - 将工具返回的文本内容按页面组织为标准 MD 格式
   - 包含：文档标题（来自 `document_name`）、各页面标题（二级标题）、页面文本内容
5.1. **模块确认（必须交互）**

   从文档标题和内容中推断最可能的模块 key，然后向用户展示确认菜单：

   ```
   从蓝湖文档标题推断模块为: orders (订单中心)

   请确认或选择正确的模块（候选项优先来自 config.modules）:
   [1] orders (订单中心) ← 推荐
   [2] products (商品管理)
   [3] users (用户中心)
   [4] inventory (库存管理)
   [5] 手动输入其他 module_key
   ```

   - 用户回复数字或模块名 → 使用对应模块
   - **不得跳过此确认步骤**，即使推断置信度很高
   - 用户确认后，根据当前年月决定文件保存路径：
     - 统一使用：`cases/prds/YYYYMM/PRD-<docName>.md`（YYYYMM 为当前年月）
   - `<docName>` 使用蓝湖文档名（空格替换为 `-`），版本号无法推断时询问用户
   - 向用户展示保存路径

   **PRD front-matter Schema（蓝湖导入时填写）：**

   ```yaml
   ---
   prd_name: "<document_name>（需求标题）"
   description: "<一句话描述，≤60字，从页面内容摘要推断>"
   prd_id: <docId 数字，如 15530>
   prd_version: <vX.Y.Z>              # 从文档名或内容推断，如 v6.4.10
   prd_source: "<保存后的 PRD 文件相对路径>"
   prd_url: "<用户发送的完整蓝湖 URL>"  # 必填，用于追溯来源
   product: <module-key>              # 如 orders / products 等
   dev_version: "<开发版本字段>"      # 如 release/v2.0，无则留空
   tags: []
   create_at: "<YYYY-MM-DD>"
   update_at: "<YYYY-MM-DD>"
   status: 未开始
   health_warnings: []
   repos: []
   case_path: ""
   ---
   ```

   字段说明：
   - `prd_url`：**必填**，保存用户发送的原始蓝湖 URL（完整带参数），用于追溯来源
   - `prd_id`：从 URL 参数 `docId` 提取（取数字部分）
   - `prd_version`：从文档标题（如「订单中心V2.0」）推断，格式为 `vX.Y.Z`
   - `dev_version`：从蓝湖页面内容中的「开发版本」字段提取，无则留空

6. **将生成的 PRD 文件路径注入工作目录**，继续正常 1.1 流程（此时 PRD 文件已存在）

---

## 1.1 解析指令

从用户指令中提取以下信息：

| 信息            | 来源                 | 示例                                                                                                                          |
| --------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 工作目录路径    | 用户指令             | `cases/prds/YYYYMM/`                                                                                                          |
| PRD 文件列表    | 扫描工作目录         | `PRD-26-xxx.md`, `PRD-27-xxx.md`                                                                                              |
| 项目名称        | 目录路径推断         | `订单中心` / `用户中心`                                                                                                        |
| 源码仓库路径    | `.claude/config.json` 的 `repos` 字段 | 未配置源码仓库时记为「无源码参考」                                                                                             |
| 输出 XMind 路径 | 配置解析结果         | `cases/xmind/YYYYMM/`                                                                                                         |
| 历史用例        | 自动查找             | `cases/archive/YYYYMM/` 目录下的 .md 文件                                                                                     |
| 运行模式        | 用户指令关键词       | `--quick` / 普通                                                                                                              |

**工作目录解析规则：**
- `继续 202604 的用例生成` → `cases/prds/202604/`
- `为 202604 生成测试用例` → `cases/prds/202604/`
- 路径中包含 `Story-YYYYMMDD` 的旧格式指令（向后兼容）→ 直接使用该路径

如果同一工作目录下有多个 PRD，询问用户要生成哪些（默认全部）。

**路径验证：**

- 如果工作目录不存在：向用户提示目录不存在，并列出 `cases/prds/` 下可用的年月目录
- 如果工作目录下无 PRD 文件：向用户提示目录下未找到 PRD 文件，请先添加 PRD 文档

---

## 1.2 断点续传检测

### 状态文件命名规则

| 本次生成范围 | 状态文件名 | 示例 |
|-------------|-----------|------|
| **单 PRD**（用户指定了一个具体 PRD 文件） | `.qa-state-{prd-slug}.json` | `cases/prds/202604/.qa-state-商品列表.json` |
| **批量**（用户未指定，生成目录下全部 PRD） | `.qa-state.json` | `cases/prds/202604/.qa-state.json` |

**prd-slug 生成规则：**
- 取目标 PRD 文件的 basename，去掉 `.md` 后缀
- 示例：`商品列表.md` → `.qa-state-商品列表.json`

> 这样同一版本目录下，每个 PRD 的生成进度互相独立，不会因为启动新需求而覆盖旧状态。

### 多进行中需求检测

开始新流程前，先扫描工作目录下所有 `.qa-state*.json` 文件，向用户列出正在进行中（未完成验收）的需求：

```
检测到以下需求正在进行中（未验收）：

[1] 商品列表（进度：archive，等待验收）
[2] 退款审批（进度：writer，生成中断）

本次将开始生成：【订单中心】退款审批

直接回复「继续」开始新流程，或输入编号查看/续传已有流程。
```

用户可在此选择先处理旧流程再启动新流程，也可直接继续启动新需求的生成。

### 续传逻辑

定位到当前 PRD 的状态文件后：

**如果状态文件存在：**

读取状态文件，向用户展示上次进度（中断步骤、已完成/未完成项），询问是否继续。

这一步只用于判断**是否进入续传模式**；如果用户明确要"只重跑某个模块"，应走后文的模块级重跑流程；如果用户要"从头重来"，应先删除对应状态文件和已增强的 PRD 文件（`status: 已增强`）后再重新发起完整流程或快速模式。

- 选「是」→ 按以下逻辑恢复：
  - `awaiting_verification: true`：说明流程已停在 Step `archive` 的用户验证阶段。保持 `last_completed_step: "archive"` 不变，重新展示验证提示（XMind 路径来自 `output_xmind`，归档 MD 来自 `archive_md_path`），等待用户回复后执行 `notify`
  - 否则 → 从 `last_completed_step + 1` 继续；其中普通续传只自动重启 `pending` 或中断的 `in_progress` Writer。`failed` Writer 保持终态，需先由用户/编排器显式选择「重试」，并将其状态写回 `in_progress` 后再启动
- 选「否」→ 删除对应状态文件，重新开始
- 不存在 → 创建初始状态文件，开始新流程。

---

## 1.3 初始化状态文件

如果当前 PRD 对应的状态文件（`.qa-state.json` 或 `.qa-state-{prd-slug}.json`）不存在或为空，直接写入初始状态（如文件已存在且有效则跳过）：

```json
{
  "last_completed_step": 0,
  "checklist_confirmed": false,
  "reviewer_status": "pending",
  "awaiting_verification": false,
  "writers": {},
  "created_at": "<ISO8601>"
}
```

---

## 1.4 源码仓库验证

根据 `.claude/config.json` 的 `repos` 字段验证源码仓库是否可用。

**验证结果处理：**

- 全部存在 → 记录到状态文件，Writer 深度阅读 Controller/Service/DAO 代码分析核心逻辑，Reviewer 基于源码验证覆盖率
- 部分不存在 → 提示用户提供路径或继续无源码模式
- 未配置源码仓库 → 跳过验证，标注「无源码参考」

**源码只读规则**：.repos/ 下仅允许 grep、find、cat、git log/diff/blame 操作，严禁 push/commit/修改文件。

---

## 1.5 历史用例完整性检查

调用 `convert-history-cases.mjs --detect` 检查当前模块是否有未转化的 CSV/XMind 文件：

```bash
node .claude/skills/archive-converter/scripts/convert-history-cases.mjs --detect --module <当前模块>
```

**根据检测结果处理：**

- 无未转化文件 → 继续下一步
- 有未转化文件：
  - 快速模式 → 自动执行转化（`node convert-history-cases.mjs --module <模块>`），转化完成后继续
  - 普通模式 → 向用户展示未转化文件列表，询问是否先执行归档转化
    - 选「是」→ 执行转化后继续
    - 选「否」→ 跳过，继续下一步（Writer 将无法引用这些历史用例）

> 此步骤确保 Writer 引用历史用例时，`cases/archive/` 目录中的 MD 文件是最新且完整的。

---

## 错误处理

- **蓝湖 URL 检测失败**：提示用户检查 URL 格式和网络连接
- **路径不存在**：向用户列出 `cases/prds/` 下可用的年月目录供选择
- **PRD 文件不存在**：提示用户先添加 PRD 文档
- **状态文件损坏**：询问用户是否重新开始流程

---

## 步骤完成后

更新 `.qa-state.json`：
- `last_completed_step` → `"parse-input"`

同时向 `execution_log` 数组追加：
```json
{"step": "parse-input", "status": "completed", "at": "<ISO8601>", "duration_ms": null, "summary": "解析用户指令，发现 N 个 PRD 文件，已初始化状态文件"}
```
