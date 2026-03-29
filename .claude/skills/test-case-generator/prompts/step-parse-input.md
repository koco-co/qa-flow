# Step parse-input：解析用户指令 + 断点续传检测

## 1.0 蓝湖 URL 检测（前置，优先级最高）

**触发条件：** 用户输入中包含 `lanhuapp.com` URL。

**处理流程：**

1. **提取 URL 参数**：从 URL 中解析 `tid`、`pid`、`docId`、`docType`
2. **检查 MCP Server 状态**：
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/
   ```
    - 返回非 000 → Server 正在运行，继续
    - 返回 000（连接失败）→ 启动 Server：
      ```bash
      node .claude/skills/using-qa-flow/scripts/lanhu-mcp-runtime.mjs start
      ```
3. **调用 `lanhu_get_pages` 工具** 获取页面列表
   - 若返回错误码 418 → 提示用户：`蓝湖 Cookie 已过期。可执行：\nLANHU_LOGIN_EMAIL='<账号>' LANHU_LOGIN_PASSWORD='<密码>' python3 .claude/skills/using-qa-flow/scripts/refresh-lanhu-cookie.py\n或按提示手动刷新 Cookie 后再继续`
   - 若返回成功 → 展示页面列表，询问用户要导入哪些页面（默认全部）
4. **调用 `lanhu_get_ai_analyze_page_result` 工具**，参数：
   - `page_names`：用户选定的页面（`'all'` 或逗号分隔的页面名列表）
   - `mode`：`'text_only'`
   - `analysis_mode`：`'tester'`
5. **整理输出为 PRD Markdown**：
   - 文件格式：**先写 YAML front-matter，再写正文**（见下方 Schema）
   - 将工具返回的文本内容按页面组织为标准 MD 格式
   - 包含：文档标题（来自 `document_name`）、各页面标题（二级标题）、页面文本内容
   - 保存至（按模块类型区分）：
     - **DTStack 模块**（如 `data-assets`）：`cases/requirements/<module>/Story-<YYYYMMDD>/PRD-<docName>.md`（暂存目录，版本确认后由 prd-enhancer 迁移到 `v{version}/`）
     - **XYZH 定制模块**：`cases/requirements/custom/xyzh/<功能名>.md`（扁平存放，无 Story 子目录）
     - `<YYYYMMDD>` 使用今日日期（DTStack 暂存目录用）
     - `<docName>` 使用蓝湖文档名（空格替换为 `-`，DTStack 用）
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
   product: <module-key>              # data-assets / xyzh 等
   dev_version: "<开发版本字段>"      # 如 6.3岚图定制化分支，无则留空
   tags: []
   create_at: "<YYYY-MM-DD>"
   update_at: "<YYYY-MM-DD>"
   status: raw
   health_warnings: []
   repos: []
   case_path: ""
   ---
   ```

   字段说明：
   - `prd_url`：**必填**，保存用户发送的原始蓝湖 URL（完整带参数），用于追溯来源
   - `prd_id`：从 URL 参数 `docId` 提取（取数字部分）
   - `prd_version`：从文档标题（如「数据资产V6.4.10」）推断，格式为 `vX.Y.Z`
   - `dev_version`：从蓝湖页面内容中的「开发版本」字段提取，无则留空

6. **将生成的 PRD 文件路径注入 Story 目录**，继续正常 1.1 流程（此时 PRD 文件已存在）

**Cookie 自动刷新机制（后台 Playwright）：**

如遇 418 且用户不方便手动获取 Cookie，可尝试自动刷新：
```bash
LANHU_LOGIN_EMAIL='<你的蓝湖账号>' \
LANHU_LOGIN_PASSWORD='<你的蓝湖密码>' \
python3 .claude/skills/using-qa-flow/scripts/refresh-lanhu-cookie.py
```

---

## 1.1 解析指令

从用户指令中提取以下信息：

| 信息            | 来源                 | 示例                                                                                                                          |
| --------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Story 目录路径  | 用户指令             | `cases/requirements/custom/xyzh/`（XYZH）/ `cases/requirements/data-assets/Story-20260322/`（DTStack）                        |
| PRD 文件列表    | 扫描 Story 目录      | `PRD-26-xxx.md`, `PRD-27-xxx.md`                                                                                              |
| 项目名称        | 目录路径推断         | `信永中和` / `DTStack`                                                                                                        |
| 源码仓库路径    | CLAUDE.md 路径映射表 | 信永中和无源码                                                                                                                |
| 输出 XMind 路径 | CLAUDE.md 输出规范   | `cases/xmind/custom/xyzh/`                                                                                                    |
| 历史用例        | 自动查找             | - DTStack 平台模块：`cases/archive/<module>/` 目录下的 .md 文件<br>- 信永中和：`cases/archive/custom/xyzh/` 目录下的 .md 文件 |
| 运行模式        | 用户指令关键词       | `--quick` / 普通                                                                                                              |

如果用户只说了 Story 编号（如 `Story-20260322`），自动补全完整路径。
如果同一 Story 下有多个 PRD，询问用户要生成哪些（默认全部）。

**路径验证：**

- 如果 Story 目录不存在：向用户提示 `未找到 Story-xxx 目录，请确认路径是否正确` 并列出可用的 Story 目录供选择
- 如果 Story 目录下无 PRD 文件：向用户提示 `Story-xxx 下未找到 PRD 文件，请先添加 PRD 文档`

---

## 1.2 断点续传检测

检查 Story 目录下是否存在 `.qa-state.json`：

```
cases/requirements/<requirements-root>/Story-20260322/.qa-state.json
```

**如果存在：**

读取状态文件，向用户展示上次进度（中断步骤、已完成/未完成项），询问是否继续。

这一步只用于判断**是否进入续传模式**；如果用户明确要"只重跑某个模块"，应走后文的模块级重跑流程；如果用户要"从头重来"，应先删除 `.qa-state.json` 和相关 `-enhanced.md` 后再重新发起完整流程或快速模式。

- 选「是」→ 按以下逻辑恢复：
  - `awaiting_verification: true`：说明流程已停在 Step 9 的用户验证阶段。保持 `last_completed_step: 9` 不变，重新展示验证提示（XMind 路径来自 `output_xmind`，归档 MD 来自 `archive_md_path`），等待用户回复后执行 Step 10
  - 否则 → 从 `last_completed_step + 1` 继续；其中普通续传只自动重启 `pending` 或中断的 `in_progress` Writer。`failed` Writer 保持终态，需先由用户/编排器显式选择「重试」，并将其状态写回 `in_progress` 后再启动
- 选「否」→ 删除 .qa-state.json，重新开始
- 不存在 → 创建初始状态文件，开始新流程。

---

## 1.3 初始化状态文件

如果 `<story-dir>/.qa-state.json` 不存在或为空，直接写入初始状态（如文件已存在且有效则跳过）：

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
- 项目标记为「无源码」（如信永中和）→ 跳过验证，标注「无源码参考」

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

## 步骤完成后

更新 `.qa-state.json`：将 `last_completed_step` 设为 `"parse-input"`。
