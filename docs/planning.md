# qa-flow 工作流全面改进方案

> 基于对 CLAUDE.md + 6 个 Skills + 全部 step prompts + 全部 scripts + config 的完整审计。
> 本文件是改进工作的**唯一执行清单**。执行者应按 Task 编号逐项实施。

---

## 目录

- [一、改进总览与优先级矩阵](#一改进总览与优先级矩阵)
- [二、P0 — 端到端可靠性修复](#二p0--端到端可靠性修复)
- [三、P1 — 多 Agent 协同效率优化](#三p1--多-agent-协同效率优化)
- [四、P2 — 状态管理与可观测性](#四p2--状态管理与可观测性)
- [五、P1 — CLAUDE.md 主编排瘦身](#五p1--claudemd-主编排瘦身)
- [六、Future — 需求 Diff 功能规划](#六future--需求-diff-功能规划)
- [七、端到端测试 Prompt](#七端到端测试-prompt)

---

## 一、改进总览与优先级矩阵

| Task ID | 优先级 | 改动 | 涉及文件 | 复杂度 |
|---------|--------|------|----------|--------|
| T01 | **P0** | step ID 统一为字符串 + 步骤编号修正 | SKILL.md, intermediate-format.md, 全部 step-*.md | 低 |
| T02 | **P0** | parse-input: Lanhu Cookie 自动检测+重试 + 模块显式选择 | step-parse-input.md | 中 |
| T03 | **P0** | prd-formalize 质量闸口 | step-prd-formalize.md | 低 |
| T04 | **P0** | 步骤级错误恢复 (source-sync 部分成功 / Writer 自动重试) | step-source-sync.md, SKILL.md | 中 |
| T05 | **P1** | Writer prompt 拆分瘦身 (core + reference) | writer-subagent.md, 新增 writer-reference.md | 中 |
| T06 | **P1** | Reviewer 分层策略 (大需求拆分 / 小需求快扫) | reviewer-subagent.md, SKILL.md | 中 |
| T07 | **P1** | --quick 模式增强 (单 Writer / Reviewer 降级) | SKILL.md | 低 |
| T08 | **P1** | CLAUDE.md 瘦身 + step prompt 标准化模板 | CLAUDE.md, 全部 step-*.md | 中 |
| T09 | **P2** | .qa-state.json 字段统一 + 执行日志 | intermediate-format.md, SKILL.md | 中 |
| T10 | **P2** | config.json 补全 + .gitignore 修正 | config.json, .gitignore | 低 |
| T11 | **Future** | 需求 Diff Skill 设计 | 新增 Skill requirement-diff/ | 高 |

---

## 二、P0 — 端到端可靠性修复

### T01: step ID 统一为字符串 + 步骤编号修正

**问题**: SKILL.md 步骤表用数字 1-11，step prompt 的 `last_completed_step` 用字符串 `"parse-input"`，intermediate-format.md 用数字 0-9。三处不一致，续传逻辑有隐患。step-checklist.md 中引用的步骤编号与实际不符。

**改动清单**:

#### 1. `.claude/skills/test-case-generator/SKILL.md`

在「工作流步骤」表格上方新增**步骤顺序声明**:

```markdown
## 步骤顺序定义（canonical）

以下 step ID 为全局唯一标识，`.qa-state.json` 的 `last_completed_step` 必须使用这些字符串值：

| 序号 | step ID | 说明 |
|------|---------|------|
| 0 | (初始) | 未开始，last_completed_step = 0 (唯一保留的数字) |
| 1 | `"parse-input"` | 指令解析 |
| 2 | `"source-sync"` | DTStack 分支同步 |
| 3 | `"prd-formalize"` | DTStack PRD 形式化 |
| 4 | `"prd-enhancer"` | PRD 增强 |
| 5 | `"brainstorm"` | Brainstorming + 解耦 |
| 6 | `"checklist"` | Checklist 确认 |
| 7 | `"writer"` | 并行 Writer |
| 8 | `"reviewer"` | Reviewer 评审 |
| 9 | `"xmind"` | XMind 输出 |
| 10 | `"archive"` | 归档 MD + 验证 |
| 11 | `"notify"` | 清理（终态，写入后立即删除状态文件） |

步骤间的顺序由此表定义。续传时根据 `last_completed_step` 在此表中的位置确定下一步。
```

将原有步骤表的 `#` 列改为 `序号`，并在每行的 `说明` 列追加对应 step ID 字符串。

#### 2. `.claude/skills/test-case-generator/references/intermediate-format.md`

`.qa-state.json` Schema 部分改动:
- 将 `"last_completed_step": 4` 改为 `"last_completed_step": "prd-enhancer"`
- 将 `"steps_completed": [1, 2, 3, 4]` **删除**（此字段冗余，不再使用）
- 字段说明表中 `last_completed_step` 的描述改为：`已稳定完成的最后步骤，字符串 step ID（初始值为数字 0 表示未开始）`
- 关键状态转移表中所有数字 step 引用替换为对应字符串

#### 3. `.claude/skills/test-case-generator/prompts/step-checklist.md`

修正步骤编号引用:
- 将 `## Step 4: Checklist 预览` 改为 `## Checklist 预览`
- 将 `## Step 5: 用户一次确认` 改为 `## 用户一次确认`
- 将 `在一条消息中展示完整确认内容` 上方加注: `> 本步骤 ID: checklist，对应序号 6`

#### 4. 全部 step-*.md 的「步骤完成后」段落

统一为:
```markdown
## 步骤完成后

更新 `.qa-state.json`：
- `last_completed_step` → `"<当前step-id>"`
- （如有其他字段变更，列出）
```

逐文件确认当前写的 step ID 是否与 canonical 表一致，不一致则修正。

---

### T02: parse-input Lanhu 集成增强

**问题**: Cookie 过期时只打印手动刷新提示；模块靠文档标题自动推断容易误判；蓝湖页面选择交互不闭环。

**改动文件**: `.claude/skills/test-case-generator/prompts/step-parse-input.md`

#### 改动 1: Cookie 自动检测 + 3 次重试

将 `## 1.0 蓝湖 URL 检测` 中的第 2 步（检查 MCP Server 状态）之后、第 3 步之前，插入新的子步骤:

```markdown
2.5. **Cookie 有效性预检**：
   - 调用 `lanhu_get_pages` 并捕获返回码
   - 若返回 418（Cookie 过期）：
     a. **自动尝试刷新**（最多 3 次，每次间隔 5 秒）：
        ```bash
        LANHU_LOGIN_EMAIL="$LANHU_LOGIN_EMAIL" \
        LANHU_LOGIN_PASSWORD="$LANHU_LOGIN_PASSWORD" \
        python3 .claude/skills/using-qa-flow/scripts/refresh-lanhu-cookie.py 2>&1
        ```
     b. 刷新成功后重新调用 `lanhu_get_pages` 验证
     c. 3 次均失败 → 向用户展示:
        ```
        蓝湖 Cookie 刷新失败（已重试 3 次）。

        请手动执行以下命令后重试:
        ! LANHU_LOGIN_EMAIL='<账号>' LANHU_LOGIN_PASSWORD='<密码>' python3 .claude/skills/using-qa-flow/scripts/refresh-lanhu-cookie.py

        或手动获取 Cookie 后更新 tools/lanhu-mcp/.env 文件。
        ```
     d. 等待用户确认后重试，不自动继续下一步
```

#### 改动 2: 模块显式选择

在第 5 步（整理输出为 PRD Markdown）中，`保存至` 逻辑之前插入:

```markdown
5.1 **模块确认（必须交互）**：
   - 从文档标题和内容中推断最可能的模块 key
   - 向用户展示确认菜单:
     ```
     从蓝湖文档标题推断模块为: data-assets (数据资产)

     请确认或选择正确的模块:
     [1] data-assets (数据资产) ← 推荐
     [2] batch-works (离线开发)
     [3] data-query (统一查询)
     [4] variable-center (变量中心)
     [5] public-service (公共组件)
     [6] xyzh (信永中和/定制)
     ```
   - 用户确认后，使用确认的模块 key 决定文件保存路径
   - **不得跳过此确认步骤**，即使推断置信度很高
```

#### 改动 3: 蓝湖页面选择交互闭环

在第 3 步（展示页面列表）中，明确交互逻辑:

```markdown
3. **调用 `lanhu_get_pages` 工具** 获取页面列表
   - 成功后展示页面列表:
     ```
     蓝湖文档「xxx」包含以下页面:
     [1] ✅ 列表页-质量问题台账
     [2] ✅ 新增质量问题
     [3] ✅ 问题详情
     [4] ✅ 规则集管理

     默认导入全部页面。输入编号可排除（如 "排除 4"），或直接回复「确认」继续。
     ```
   - **等待用户明确回复**后才进入第 4 步
   - 用户可回复:
     - `确认` / `全部` → 导入全部
     - `排除 4` / `只要 1,2,3` → 按指定过滤
     - `取消` → 中止蓝湖流程
```

---

### T03: prd-formalize 质量闸口

**问题**: formalize 输出直接进入 enhance，无质量校验，低质量内容污染全链路。

**改动文件**: `.claude/skills/test-case-generator/prompts/step-prd-formalize.md`

在「执行流程」第 5 步（输出正式需求文档）之后、「步骤完成后」之前，新增:

```markdown
## 质量闸口（formalize 完成后必须执行）

对 formalized PRD 执行以下检查:

| 检查项 | 条件 | 不通过处理 |
|--------|------|-----------|
| 页面级标题 | 至少包含 1 个 `#### 4.x.y` 级标题 | 阻断 |
| 字段信息 | 正文中包含至少 1 个字段名称描述 | 警告 |
| 按钮/操作 | 正文中包含至少 1 个【xxx】格式的按钮引用 | 警告 |
| 源码补充 | 第 5 章「源码补充事实」非空（DTStack 必须） | 警告 |
| 推断标注比例 | `[基于源码推断]` 标注数量 / 总字段数 < 60% | 警告 |

**阻断处理**:
```
formalize 质量检查未通过:
- [x] 缺少页面级标题: 正式文档中未识别到独立页面的标题层级

可能原因: 蓝湖原文结构过于扁平，formalize 未能拆分页面。
建议: 请检查蓝湖文档是否包含多个页面设计，或手动在 formalized PRD 中补充页面标题后继续。

选项:
A. 手动修正 formalized PRD 后继续（推荐）
B. 跳过 formalize 质量检查，直接进入 enhance（不推荐）
```

**警告处理**: 记录到 `.qa-state.json.formalize_warnings` 数组，不阻断流程，但在后续 enhance 健康度报告中一并展示。
```

---

### T04: 步骤级错误恢复

**问题**: source-sync 单仓库失败导致整步失败；Writer 失败需用户手动重试。

#### 改动 1: source-sync 部分成功

**改动文件**: `.claude/skills/test-case-generator/prompts/step-source-sync.md`

在「执行流程」第 4 步之后新增:

```markdown
## 部分成功处理

若多个仓库中部分 sync 失败:

1. 在 `.qa-state.json.source_context` 中记录每个仓库的状态:
   ```json
   {
     "source_context": {
       "backend": [
         {"repoKey": "dt-center-assets", "branch": "release/6.4.10", "status": "synced", "commit": "abc123"},
         {"repoKey": "DAGScheduleX", "branch": "release/6.4.10", "status": "failed", "error": "branch not found"}
       ]
     }
   }
   ```

2. 向用户展示同步结果:
   ```
   源码分支同步结果:
   [v] dt-center-assets → release/6.4.10 (commit: abc123)
   [x] DAGScheduleX → release/6.4.10 (失败: branch not found)
   [v] dt-insight-studio-front → release/6.4.10 (commit: def456)

   1 个仓库同步失败。是否继续？（失败仓库在后续用例编写中不可用作源码参考）
   ```

3. 用户选「继续」→ Writer 的源码参考中排除失败仓库
4. 用户选「重试」→ 仅重新 sync 失败仓库
5. 用户选「取消」→ 中止流程
```

#### 改动 2: Writer 自动重试 1 次

**改动文件**: `.claude/skills/test-case-generator/SKILL.md`

在「执行协议」第 6 条之后新增第 6.5 条:

```markdown
6.5. **Writer 自动重试**：若某 Writer Agent 返回错误（crash / 超时 / 输出无效 JSON），自动重试 1 次：
   - 将 `writers.<name>.status` 从 `failed` 改回 `in_progress`
   - 记录 `writers.<name>.retry_count = 1`
   - 重新启动该 Writer Agent
   - 第 2 次仍失败 → 标记为终态 `failed`，向用户展示:
     ```
     Writer「列表页」在重试后仍然失败: <错误摘要>
     选项:
     A. 跳过此模块（其余模块用例正常输出）
     B. 手动排查后重试
     ```
   - 用户选 A → `writers.<name>.status = "skipped"`
   - 自动重试不需要用户确认，在编排器内部完成
```

---

## 三、P1 — 多 Agent 协同效率优化

### T05: Writer Prompt 拆分瘦身

**问题**: 当前 writer-subagent.md ~210 行，每个 Writer 都加载完整模板，占用大量 context。

**改动**:

#### 1. 拆分 `writer-subagent.md` 为两部分

**保留** `writer-subagent.md` 作为核心模板（~100 行），包含:
- 任务范围声明
- 输出 JSON 格式（精简，不含完整 Schema 描述）
- 核心编写规则（步骤格式 5 条 + 用例设计原则 3 条 + 优先级标准 3 条）
- 自评审清单（保留全部 13 项）
- 输出要求

**新增** `writer-subagent-reference.md`（~110 行），包含:
- 步骤格式正例 vs 反例完整表格
- 预期结果正例 vs 反例完整表格
- 数据禁止词完整清单
- PRD 矛盾与不确定性处理规则
- 依赖用例处理规则
- 源码分析详细要求（5 条）
- DTStack 额外要求
- Tags 推断规则

#### 2. 编排器按需加载

在 SKILL.md 的 Writer 步骤说明中新增:

```markdown
Writer Prompt 组装规则:
- 始终加载: writer-subagent.md (核心模板)
- 以下情况额外加载 writer-subagent-reference.md:
  - DTStack 模块（需要源码分析规则和 DTStack 额外要求）
  - 预估用例数 > 20 条（更复杂的需求需要完整参考）
- 以下情况不加载 reference:
  - --quick 模式 + 预估用例数 ≤ 20 条
```

---

### T06: Reviewer 分层策略

**问题**: 单 Reviewer 处理 >80 条用例时可能超时（80 maxTurns）；小需求 3 轮修正过度。

**改动文件**: `.claude/skills/test-case-generator/prompts/reviewer-subagent.md`, SKILL.md

#### 1. reviewer-subagent.md 新增「预扫描快速通道」

在「质量阈值判断」之前插入:

```markdown
## 预扫描快速通道（在 3 轮修正之前执行）

1. 快速遍历所有用例标题和 steps 数量，计算初始问题率:
   - 仅检查 F01（标题不以验证开头）、F03（步骤数≠预期数）、F08（步骤编号前缀）
   - 这 3 类问题可快速机械判断，不需要语义分析

2. 根据初始问题率决定修正深度:
   | 初始问题率 | 修正策略 | 说明 |
   |-----------|---------|------|
   | < 5% | **1 轮快速修正** | 直接执行任务 1-4 一次，跳过第 2、3 轮 |
   | 5% - 25% | **2 轮修正** | 执行 2 轮修正，第 3 轮仅验证 |
   | > 25% | **3 轮完整修正** | 执行完整 3 轮（现有逻辑不变） |
```

#### 2. SKILL.md 新增 Reviewer 拆分策略

在「执行协议」第 7 条中扩展:

```markdown
7. **Reviewer 步骤**：
   - 总用例数 ≤ 80 条 → 单个 Reviewer（现有逻辑）
   - 总用例数 > 80 条 → 拆分为 2 个并行 Reviewer:
     a. Reviewer-A: 负责前 N/2 个 Writer 的输出
     b. Reviewer-B: 负责后 N/2 个 Writer 的输出
     c. 两个 Reviewer 各自独立执行 3 轮修正
     d. 编排器合并两份 final JSON（按 module name 合并 pages）
     e. 编排器执行去重检查（跨 Reviewer 的同名用例）
   - 问题率 > 40% 时任一 Reviewer 阻断 → 整体阻断
```

---

### T07: --quick 模式增强

**问题**: 当前 quick 模式仅跳过 brainstorm + checklist，对小需求仍启动多个 Writer。

**改动文件**: `.claude/skills/test-case-generator/SKILL.md`

扩展「运行模式」表:

```markdown
## 运行模式

| 模式 | 触发方式 | 跳过步骤 | 额外优化 |
|------|----------|----------|----------|
| 普通模式 | 默认 | — | — |
| 快速模式 | `--quick` | brainstorm, checklist | 见下方 |
| 续传模式 | `继续 Story-xxx` | 自动从断点继续 | — |
| 模块级重跑 | `重新生成 xxx 模块` | 仅重跑指定 Writer | — |

### 快速模式额外优化

1. **Writer 合并**: 预估总用例数 ≤ 30 条时，使用单个 Writer（不拆分）
2. **Reviewer 降级**: 仅执行 1 轮修正（不做 3 轮），问题率阻断阈值放宽到 50%
3. **PRD formalize 简化**: 非 DTStack 模块跳过 formalize 步骤（直接 raw → enhance）
4. **Writer reference 不加载**: 不加载 writer-subagent-reference.md（减少 context）
```

---

## 四、P2 — 状态管理与可观测性

### T09: .qa-state.json 统一 + 执行日志

**改动文件**: `.claude/skills/test-case-generator/references/intermediate-format.md`

#### 1. 删除 `steps_completed` 字段

从 Schema 示例中移除 `"steps_completed": [1, 2, 3, 4]`。

#### 2. 新增 `execution_log` 字段

在 Schema 示例中新增:

```json
{
  "execution_log": [
    {
      "step": "parse-input",
      "status": "completed",
      "at": "2026-03-25T10:00:00Z",
      "duration_ms": 3200,
      "summary": "解析蓝湖 URL，提取 3 个页面"
    }
  ]
}
```

字段说明表新增:

| 字段 | 说明 |
|------|------|
| `execution_log` | 步骤执行记录数组（可选）。每步完成或失败时追加一条记录。仅用于事后排查和统计，不影响续传逻辑。 |

#### 3. step prompt 统一追加日志指令

在每个 step-*.md 的「步骤完成后」段落中追加:

```markdown
同时向 `execution_log` 数组追加:
```json
{
  "step": "<step-id>",
  "status": "completed",
  "at": "<ISO8601>",
  "duration_ms": <从步骤开始到现在的毫秒数，如无法精确计算则写 null>,
  "summary": "<一句话描述本步骤完成的关键成果>"
}
```

---

### T10: config.json 补全 + .gitignore 确认

**改动文件**: `.claude/config.json`

为缺少 `requirements` 字段的 DTStack 模块补充:

```json
"batch-works": {
  "zh": "离线开发",
  "type": "dtstack",
  "xmind": "cases/xmind/batch-works/",
  "archive": "cases/archive/batch-works/",
  "requirements": "cases/requirements/batch-works/"
},
"data-query": {
  "zh": "统一查询",
  "type": "dtstack",
  "xmind": "cases/xmind/data-query/",
  "archive": "cases/archive/data-query/",
  "requirements": "cases/requirements/data-query/"
},
"variable-center": {
  "zh": "变量中心",
  "type": "dtstack",
  "xmind": "cases/xmind/variable-center/",
  "archive": "cases/archive/variable-center/",
  "requirements": "cases/requirements/variable-center/"
},
"public-service": {
  "zh": "公共组件",
  "type": "dtstack",
  "xmind": "cases/xmind/public-service/",
  "archive": "cases/archive/public-service/",
  "requirements": "cases/requirements/public-service/"
}
```

**`.gitignore`**: 已有 `node_modules/` 全局规则，实际不需要额外修改（Glob 确认了 node_modules 目录在 skills 子目录下，被顶层规则覆盖）。

---

## 五、P1 — CLAUDE.md 主编排瘦身

### T08: CLAUDE.md 职责精简 + step prompt 标准化

**问题**: CLAUDE.md 当前 ~250 行，包含了模块路径表、层级映射、编排说明等重复内容。这些内容已在 `rules/*.md` 和 `config.json` 中有 canonical 定义，CLAUDE.md 中的副本会导致 context 浪费和维护不一致。

#### 改动 1: CLAUDE.md 瘦身

保留以下内容:
- **快速开始** 代码块（现有的 ~10 行示例）
- **工作区结构** 树形图（现有的 ~15 行）
- **Skill 索引表**（现有的 6 行表格）
- **DTStack 与 XYZH 分流规则**（关键分流逻辑，~20 行）
- **编排说明**（断点状态、质量阈值、仓库清单的简要指引，~10 行）
- **规范索引表**（指向 rules/*.md 的链接表）

移除以下内容（已在 rules/ 中有 canonical 副本）:
- `模块与路径命名` 完整表格 → 指向 `rules/directory-naming.md`
- 任何与 `rules/archive-format.md` 重复的归档格式说明
- 任何与 `rules/xmind-output.md` 重复的 XMind 输出规范
- 任何与 `rules/test-case-writing.md` 重复的用例编写规范

移除后 CLAUDE.md 预计从 ~250 行缩减到 ~100 行。

#### 改动 2: step prompt 标准化模板

每个 step-*.md 统一采用以下结构:

```markdown
<!-- step-id: <id> | delegate: testCaseOrchestrator -->
# Step <id>：<中文名称>

> 前置条件: `last_completed_step` == `"<前一步 ID>"`（或 `0` 表示初始）
> 快速模式: [执行 / **跳过**]
> DTStack 专属: [是 / 否]

## 执行流程

...（步骤具体内容）

## 错误处理

- <场景>: <处理方式>

## 步骤完成后

更新 `.qa-state.json`:
- `last_completed_step` → `"<当前 step-id>"`
- （其他字段变更）

同时向 `execution_log` 追加本步骤记录。
```

当前缺少「错误处理」段落的 step prompt:
- step-source-sync.md（T04 已补充）
- step-prd-formalize.md（T03 已补充）
- step-prd-enhancer.md（需补充: 图片失败率 > 30% 时的处理）
- step-brainstorm.md（需补充: 历史用例检索无结果时的处理）
- step-xmind.md（需补充: 脚本执行失败时的处理）

---

## 六、Future — 需求 Diff 功能规划

> 本章节仅做设计规划，不在当前批次实施。

### 6.1 用户故事

```
作为 QA 测试工程师，
当 PRD 发生变更时（如 v6.4.10 新增了批量删除功能），
我希望系统能自动分析哪些已有用例受影响，
并提供交互界面让我确认后增量更新用例，
而不需要全量重跑。
```

### 6.2 Skill 设计: `requirement-diff`

```yaml
name: requirement-diff
description: 需求变更影响分析。输入变更描述或新旧 PRD，自动识别受影响的用例并提供增量更新方案。
trigger: "需求变更"、"PRD 改了"、"diff 用例"、"影响分析"
```

### 6.3 工作流

```
Step 1: 变更输入
  ├── 模式 A: 用户描述变更点（自然语言）
  ├── 模式 B: 提供新旧 PRD 文件路径
  └── 模式 C: 提供蓝湖 URL（系统 diff 新旧版本）

Step 2: 变更解析
  ├── 语义分析: 提取变更涉及的页面、字段、按钮、交互规则
  ├── 源码 diff（DTStack）: git diff 分析代码变更范围
  └── 输出: 变更影响矩阵

Step 3: 用例影响映射
  ├── 检索 archive/ 目录匹配的用例文件
  ├── 逐条用例判断: 不受影响 / 需修改 / 需删除
  ├── 识别需新增的用例（新功能点）
  └── 输出: 影响分析报告

Step 4: 交互确认
  展示影响矩阵:
  ```
  需求变更: 列表页新增【批量删除】按钮

  影响分析:
  ┌─ 需新增 (3 条)
  │  ├── ✅ 验证批量选择后点击删除的正常流程 (P0)
  │  ├── ✅ 验证未选择任何记录时批量删除按钮状态 (P1)
  │  └── ✅ 验证批量删除后列表刷新 (P1)
  │
  ├─ 需修改 (1 条)
  │  └── ⚠️ 验证列表页默认加载: 预期结果需新增「批量删除」按钮描述
  │
  ├─ 不受影响 (25 条)
  │  └── 新增页、详情页、搜索相关用例...
  │
  └─ 建议删除 (0 条)

  请确认后开始增量生成。可修改任一条目的状态。
  ```

Step 5: 增量生成
  ├── 仅为「需新增」的用例启动 Writer（复用现有 case-writer）
  ├── 对「需修改」的用例，启动 Editor Agent 定向修改
  └── 输出: 更新后的 JSON

Step 6: 增量合并
  ├── XMind: --replace 模式替换受影响的节点
  ├── Archive MD: 定向更新对应章节
  └── 保留未受影响的用例不变
```

### 6.4 前置依赖

1. archive MD 的 front-matter 需新增 `source_prd_sections` 字段（记录用例来源的 PRD 章节编号）
2. intermediate JSON 的 test_cases 需新增 `source_section` 字段
3. 需要一个轻量级的 PRD diff 算法（章节级 diff，不是逐字 diff）

### 6.5 实现建议

- 可复用现有 Writer/Reviewer 基础设施
- 影响分析核心是**语义匹配**：变更描述 ↔ 用例标题 + 步骤内容
- 建议先用 Grep + 关键词匹配做 MVP，后续升级为向量化语义搜索

---

## 七、端到端测试 Prompt

以下 prompt 用于在新窗口中测试改进后的工作流。按顺序执行，每个 prompt 覆盖不同场景。

### Test 1: 完整流程冒烟测试（蓝湖 URL → XMind）

> 验证: T01 step ID 一致性、T02 Lanhu 集成、T03 formalize 质量闸口、T04 错误恢复、T09 执行日志

```
请阅读 docs/planning.md 了解本次改进的全部内容。

然后执行以下端到端测试:

1. 蓝湖 URL 流程冒烟:
   模拟输入一个蓝湖 URL 进入 test-case-generator 流程（不需要真正调用蓝湖 API，使用 cases/requirements/data-assets/ 下已有的任意 PRD 文件代替）。
   验证以下改进点是否已正确实现:

   a) step-parse-input.md 中是否包含:
      - Cookie 自动检测 + 3 次重试逻辑（搜索关键词: "Cookie 有效性预检"、"自动尝试刷新"、"最多 3 次"）
      - 模块显式选择菜单（搜索关键词: "模块确认（必须交互）"、"请确认或选择正确的模块"）
      - 蓝湖页面选择交互闭环（搜索关键词: "等待用户明确回复"）

   b) SKILL.md 中是否包含:
      - 步骤顺序声明（canonical 步骤 ID 表）
      - step ID 全部为字符串（搜索不应出现 "last_completed_step: 4" 这样的纯数字赋值，0 除外）
      - Writer 自动重试逻辑（搜索关键词: "Writer 自动重试"、"retry_count"）

   c) step-prd-formalize.md 中是否包含:
      - 质量闸口检查表（搜索关键词: "质量闸口"、"页面级标题"、"阻断"）

   d) step-source-sync.md 中是否包含:
      - 部分成功处理逻辑（搜索关键词: "部分成功"、"status.*failed"、"排除失败仓库"）

   e) intermediate-format.md 中:
      - 不存在 "steps_completed" 字段
      - 存在 "execution_log" 字段定义
      - last_completed_step 示例值为字符串而非纯数字

   f) 每个 step-*.md 是否都有统一的「步骤完成后」段落，且 step ID 与 canonical 表一致

2. 把检查结果整理成表格输出，格式:
   | 检查项 | 文件 | 状态 | 备注 |
   |--------|------|------|------|
```

### Test 2: Writer/Reviewer 优化验证

> 验证: T05 Writer 拆分、T06 Reviewer 分层、T07 快速模式增强

```
请阅读 docs/planning.md 了解本次改进的全部内容。

验证以下多 Agent 协同优化是否已正确实施:

1. Writer Prompt 拆分:
   a) writer-subagent.md 是否已精简到 ~100 行以内？（统计实际行数）
   b) 是否存在 writer-subagent-reference.md 新文件？
   c) writer-subagent.md 中是否仍包含完整的 JSON Schema 定义、核心编写规则、自评审清单？
   d) writer-subagent-reference.md 是否包含: 正反例表格、禁止词清单、源码分析要求、DTStack 额外规则？
   e) SKILL.md 中是否有 Writer Prompt 组装规则（描述何时加载 reference）？

2. Reviewer 分层:
   a) reviewer-subagent.md 是否包含「预扫描快速通道」逻辑？（搜索: "预扫描"、"快速通道"、"初始问题率"）
   b) 是否定义了 3 级修正深度:  <5% → 1 轮, 5-25% → 2 轮, >25% → 3 轮？
   c) SKILL.md 中是否有 Reviewer 拆分策略（>80 条用例时拆为 2 个并行 Reviewer）？

3. 快速模式:
   a) SKILL.md 运行模式表是否新增了「额外优化」列？
   b) 是否包含: 单 Writer 合并（≤30 条）、Reviewer 降级（1 轮）、formalize 简化、reference 不加载？

把结果整理成表格输出。
```

### Test 3: CLAUDE.md 瘦身 + Step Prompt 标准化验证

> 验证: T08 CLAUDE.md 精简、step prompt 统一格式

```
请阅读 docs/planning.md 了解本次改进的全部内容。

验证 CLAUDE.md 瘦身和 Step Prompt 标准化:

1. CLAUDE.md 行数检查:
   a) 当前 CLAUDE.md 有多少行？是否已从 ~250 行缩减到 ~100 行左右？
   b) 是否仍保留: 快速开始、工作区结构、Skill 索引表、DTStack/XYZH 分流规则、规范索引表？
   c) 是否已移除与 rules/ 重复的内容: 完整的模块路径表、归档格式层级映射？
   d) 移除的内容是否在对应的 rules/*.md 中有 canonical 版本？

2. Step Prompt 标准化:
   对以下每个文件，检查是否包含标准化头部:
   - step-parse-input.md
   - step-source-sync.md
   - step-prd-formalize.md
   - step-prd-enhancer.md
   - step-brainstorm.md
   - step-checklist.md
   - step-xmind.md
   - step-archive.md
   - step-notify.md

   标准化头部应包含:
   - `<!-- step-id: xxx | delegate: testCaseOrchestrator -->`
   - `> 前置条件: ...`
   - `> 快速模式: ...`
   - `## 错误处理` 段落（至少有 1 条错误处理规则）
   - `## 步骤完成后` 段落，包含 step ID 字符串和 execution_log 追加指令

3. step-checklist.md 特别检查:
   - 是否已修正步骤编号（不再出现错误的 "Step 3/4/5" 引用）

把结果整理成表格输出。
```

### Test 4: config.json + 状态管理验证

> 验证: T09, T10

```
请阅读 docs/planning.md 了解本次改进的全部内容。

验证配置和状态管理改进:

1. config.json 完整性:
   a) 以下模块是否都有 requirements 字段:
      - batch-works
      - data-query
      - variable-center
      - public-service
   b) 所有 requirements 路径是否遵循 "cases/requirements/<module>/" 格式？

2. intermediate-format.md 状态文件 Schema:
   a) last_completed_step 的示例值是否为字符串（如 "prd-enhancer"）而非纯数字？
   b) 是否不再包含 steps_completed 字段？
   c) 是否包含 execution_log 字段定义和示例？
   d) 关键状态转移表中的步骤引用是否都使用字符串 step ID？

3. SKILL.md 一致性:
   a) 步骤顺序声明表是否存在？
   b) 执行协议中的 step 引用是否都使用字符串？
   c) .qa-state.json 关键状态速查表是否与 intermediate-format.md 保持一致？

把结果整理成表格输出。
```

### Test 5: 全局一致性交叉验证

> 综合验证所有改动的一致性，检查是否有遗漏或冲突

```
请阅读 docs/planning.md 了解本次改进的全部内容。

执行全局一致性交叉验证:

1. Step ID 全局一致性:
   在以下所有文件中搜索 last_completed_step 的赋值，确认全部使用字符串 step ID（0 除外）:
   - SKILL.md
   - intermediate-format.md
   - 全部 step-*.md (9 个文件)
   列出每个文件中 last_completed_step 的赋值语句和对应值。

2. Writer/Reviewer Agent 声明一致性:
   - writer-subagent.md 中的 Agent metadata（subagent_type, model, maxTurns）是否与 SKILL.md 步骤 7 的描述一致？
   - reviewer-subagent.md 中的 Agent metadata 是否与 SKILL.md 步骤 8 的描述一致？

3. 文件引用完整性:
   SKILL.md「参考文件」章节列出的所有文件路径，逐一验证是否真实存在:
   - references/decoupling-heuristics.md
   - references/intermediate-format.md
   - prompts/writer-subagent.md
   - prompts/writer-subagent-reference.md (新增)
   - prompts/reviewer-subagent.md
   - 各 step-*.md

4. 快速模式行为一致性:
   - SKILL.md 运行模式表中 quick 模式的「跳过步骤」是否与各 step-*.md 中的 `> 快速模式: 跳过` 标注一致？

5. rules/ 与 CLAUDE.md 无重复:
   检查 CLAUDE.md 是否已移除以下表格/段落（这些内容的 canonical 版本在 rules/ 中）:
   - 完整的 6 模块路径表（→ rules/directory-naming.md）
   - Archive 层级映射表（→ rules/archive-format.md）
   - XMind 层级结构描述（→ rules/xmind-output.md）

把全部检查结果整理成表格，标注 PASS / FAIL / WARNING。
```

---

### 执行顺序建议

```
Phase 1 (本次重点 - 端到端可靠性):
  T01 → T02 → T03 → T04 → T10

Phase 2 (多 Agent 优化):
  T05 → T06 → T07

Phase 3 (编排瘦身 + 可观测):
  T08 → T09

验证:
  Test 1 → Test 4 → Test 2 → Test 3 → Test 5

Phase 4 (未来):
  T11 (需求 Diff)
```
