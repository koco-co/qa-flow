# Transform Node Phase 2: Prompt & Workflow Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the transform node prompt, integrate it into the 7-node workflow, and slim down enhance to avoid duplicate responsibilities.

**Architecture:** New `transform.md` prompt guides source code analysis + PRD template filling + CLARIFY protocol. `SKILL.md` gets a new node 2 (transform) inserted between init and enhance, with renumbered nodes. `enhance.md` removes steps 5 (需求澄清) and source sync references.

**Tech Stack:** Markdown prompt engineering, SKILL.md workflow definition

---

### Task 1: Create transform.md prompt

**Files:**
- Create: `.claude/skills/test-case-gen/prompts/transform.md`

- [ ] **Step 1: Create the transform prompt file**

Create `.claude/skills/test-case-gen/prompts/transform.md`:

```markdown
# PRD 结构化转换提示词

> 本提示词在节点 2（transform）加载，指导 AI 将蓝湖原始 PRD 素材结合源码分析和历史用例，转化为结构化测试增强 PRD。

---

## 任务概述

你是一名资深 QA 架构师，正在将蓝湖导入的原始 PRD 素材转化为结构化的测试增强 PRD。你有三个信息来源：

1. **蓝湖素材**：截图 + Axure 提取文本（raw-prd.md）
2. **源码分析**：前后端代码中的路由、接口、校验规则、状态流转、权限配置
3. **归档参考**：同模块历史测试用例

你的目标是交叉比对三方信息，按 PRD 模板填充结构化内容，只有三方都无法确定时才通过 CLARIFY 协议向用户确认。

**输出**：符合 `references/prd-template.md` 格式的增强 PRD 文件。

---

## 信息来源标注（四色标注）

所有填充内容必须标注来源，贯穿整个文档：

- 🟢 **蓝湖原文**：直接来自 PRD 描述或截图
- 🔵 **源码推断**：从代码中提取，格式 `🔵 \`文件名:行号\``
- 🟡 **历史参考**：从归档用例中推断，格式 `🟡 归档#需求ID`
- 🔴 **待确认**：三方均无法确定，收集到 CLARIFY 块

---

## 前置步骤：源码配置确认

transform 节点开始前，主 agent 已完成以下准备（你无需重复执行）：

1. 使用 `repo-profile.ts match` 匹配 PRD 标题/路径
2. 向用户展示确认清单并获得确认
3. 使用 `repo-sync.ts sync-profile` 拉取最新代码
4. 将确认的仓库信息写入 PRD frontmatter 的 `repos` 字段

你在执行时可直接从 PRD frontmatter 读取 `repos` 字段获取源码路径和分支信息。

---

## 步骤 1：解析蓝湖原始素材

读取 raw-prd.md，识别以下结构：

1. **页面清单**：从 `## 页面名` 或蓝湖 bridge 输出的 page 结构提取
2. **每页内容分区**：
   - `[Flowchart/Component Text]`：UI 控件文本（按钮、表单字段、标签）
   - `[Full Page Text]`：页面完整文本描述
   - 截图（`![描述](images/xxx.png)`）
3. **需求元信息**：版本号、需求背景（通常在页面开头"开发版本：xxx"、"需求内容：xxx"）
4. **页面间关系**：从路径结构（如"岚图/15525【xxx】"）识别同组需求

输出：内部页面清单，用于后续逐页分析。

---

## 步骤 2：源码状态检测与分析

### 2.1 检测源码状态

对 frontmatter 中 `repos` 列出的每个仓库，检测与当前需求的相关性：

| 检测方法 | 判定结果 |
|----------|---------|
| 在前端路由/菜单配置中找到 PRD 提到的页面路径 | **已开发** → B 级分析 |
| 仓库存在但搜索不到相关代码（仅有骨架或空文件） | **开发中** → A 级分析 |
| 未配置源码仓库 | **无源码** → 跳过源码分析 |

### 2.2 A 级分析（路由 + API 接口层）

搜索范围：

**前端**：
- 路由配置文件（搜索 `route`, `menu`, `path` 关键词）
- 页面组件入口文件

**后端**：
- Controller 层（搜索 API 路径、`@RequestMapping`、`@GetMapping` 等注解）
- 接口入参出参定义

标注所有内容为 `🟡 [推测: 基于同模块 xxx 页面推断]`。

### 2.3 B 级分析（深入业务逻辑层）

在 A 级基础上增加：

**前端**：
- 表单校验规则（搜索 `rules`, `validator`, `required`, `pattern`）
- 字段联动逻辑（搜索 `useEffect`, `watch`, `onChange` + 字段名）
- 状态管理（搜索 `useState`, `useReducer`, `store`）
- 权限判断（搜索 `permission`, `auth`, `role`）

**后端**：
- Service 层业务规则（字段校验、状态流转）
- 权限配置（搜索 `@PreAuthorize`, `PermissionConfig`, `role`）
- 异常处理（搜索 `throw`, `Exception`, `BusinessException`）
- 数据格式化（搜索 `DateFormat`, `NumberFormat`, `pattern`）

直接标注为 `🔵 [源码: 文件名:行号]`。

### 2.4 搜索策略

使用 Grep 工具在仓库目录中搜索。搜索顺序：

1. 先搜索 PRD 中提到的关键词（功能名、字段名、中文标签）
2. 从找到的文件向上/向下追踪关联代码
3. 对每个发现记录：文件路径、行号、提取的信息、置信度

**注意**：
- 源码仓库位于 `workspace/.repos/` 下，为只读，禁止修改
- 每次搜索限制在 PRD 相关的模块目录内，避免全仓库扫描
- 若搜索 3 次以上仍未找到相关代码，判定为"开发中"降级到 A 级

---

## 步骤 3：历史用例检索

```bash
npx tsx .claude/scripts/archive-gen.ts search --query "{{模块关键词}}" --dir workspace/archive
```

从返回的 `SearchResult[]` 中：

1. 读取相关 archive MD 文件
2. 提取可参考的：
   - 字段定义和校验规则
   - 交互逻辑描述
   - 异常场景处理方式
   - 测试数据样例
3. 标注所有引用为 `🟡 归档#需求ID`

---

## 步骤 4：按模板填充结构化 PRD

参考 `references/prd-template.md`，逐部分填充：

### Part 1: Frontmatter

补充/更新以下字段：
- `project`：从 PRD 路径或标题提取项目名
- `version`：从页面文本"开发版本：xxx"提取
- `requirement_id`：从页面名"15525【xxx】"提取数字
- `requirement_name`：从页面名提取
- `modules`：从功能分析推断所属模块
- `confidence`：根据源码匹配程度计算（B 级完整匹配 0.8-0.95，A 级推测 0.5-0.7，无源码 0.3-0.5）

### Part 2: 需求概述

| 字段 | 填充来源优先级 |
|------|---------------|
| 开发版本 | 🟢 页面文本 > 🔵 分支名推断 |
| 需求背景 | 🟢 页面文本"需求内容：" |
| 影响模块 | 🔵 前端路由 > 🟢 蓝湖路径 |
| 导航路径 | 🔵 菜单配置代码 > 🟢 蓝湖截图 > 🟡 归档同模块 |
| 关联需求 | 🟢 同文档其他页面自动识别 |

### Part 3: 页面级结构

对蓝湖每个页面，生成：

**字段定义表**（覆盖 W001）：
1. 从截图识别控件类型和字段名
2. 从 `[Flowchart/Component Text]` 提取字段标签
3. 从前端代码提取校验规则（rules、required、pattern）
4. 从后端代码交叉验证字段约束
5. 无法确定的标注 🔴

**交互逻辑**（编号列表）：
1. 从截图识别操作流程
2. 从前端 useEffect/watch 提取联动规则
3. 从 `[Full Page Text]` 提取描述性逻辑
4. 无法确定的标注 🔴

**状态/业务规则**：
1. 从后端 Service 层提取状态流转
2. 从页面文本提取业务规则描述
3. 无法确定的标注 🔴

**异常处理**（覆盖 W003）：
1. 从后端 catch/throw 提取异常场景
2. 从归档同模块用例提取常见异常
3. 无法确定的标注 🔴

### Part 4: 跨页面关联

**跨页面联动**：从前端路由跳转代码和蓝湖页面间关系推断
**权限说明**（覆盖 W002）：优先从后端权限配置提取
**数据格式**（覆盖 W008）：从截图识别 + 前端格式化代码提取

### Part 5: 留痕

- **待确认项**：汇总所有 🔴 标记项
- **变更记录**：记录 `v1.0 初始生成`

---

## 步骤 5：生成 CLARIFY 块

收集所有 🔴 标记的待确认项，按 `references/clarify-protocol.md` 格式生成 CLARIFY 块：

```markdown
## CLARIFY

### Q1
- **问题**: <具体问题>
- **上下文**: <蓝湖说了什么、源码中找到什么、归档中查到什么>
- **位置**: <页面名 → 章节 → 字段/规则>
- **推荐**: <推荐选项字母>
- **选项**:
  - A: <选项描述>
  - B: <选项描述>（<推荐理由>）
  - C: <选项描述>
```

**要求**：
- 每个问题必须提供推荐答案（基于源码分析或归档经验推断）
- 推荐理由必须明确来源（"源码中 xxx 文件第 N 行的逻辑暗示..."）
- 如果某个待确认项可以通过合理推断得出高置信度答案，则不放入 CLARIFY，直接标注为 🟡 并注明推断依据

---

## 步骤 6：置信度计算

根据以下维度计算整体 `confidence` 值：

| 维度 | 权重 | 评分标准 |
|------|------|---------|
| 字段定义完整度 | 30% | 已定义字段数 / 总字段数 |
| 交互逻辑覆盖度 | 25% | 有来源标注的逻辑数 / 总逻辑数 |
| 源码匹配程度 | 25% | 🔵 标注数 / (🔵 + 🔴 标注数) |
| 待确认项比例 | 20% | 1 - (🔴 标注数 / 总标注数) |

将计算结果写入 frontmatter 的 `confidence` 字段。

---

## 输出要求

1. **增强后的 PRD 文件**：覆盖写入原 PRD 路径，格式符合 `references/prd-template.md`
2. **CLARIFY 块**（若有待确认项）：附在 PRD 末尾
3. **状态更新数据**：

```json
{
  "confidence": 0.85,
  "page_count": 14,
  "field_count": 42,
  "source_hit": "B",
  "clarify_count": 3,
  "repos_used": ["dt-center-assets@release_6.3.x_ltqc", "dt-insight-studio@dataAssets/release_6.3.x_ltqc"]
}
```

---

## 重要约束

- **只读源码**：workspace/.repos/ 下的代码禁止修改
- **不猜测**：无法确定的内容必须标注 🔴 或 🟡，不得凭空捏造
- **CLARIFY 而非阻断**：遇到不确定项时收集到 CLARIFY 块，不要停止分析
- **效率优先**：源码搜索每个维度最多 3 次尝试，超过则降级标注
- **偏好规则**：检查 `preferences/` 目录下的规则文件，优先级高于本提示词内置规则
```

- [ ] **Step 2: Verify file created correctly**

```bash
wc -l .claude/skills/test-case-gen/prompts/transform.md
head -5 .claude/skills/test-case-gen/prompts/transform.md
```

Expected: ~200 lines, starts with `# PRD 结构化转换提示词`

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/test-case-gen/prompts/transform.md
git commit -m "feat: add transform node prompt for structured PRD generation"
```

---

### Task 2: Slim down enhance.md

**Files:**
- Modify: `.claude/skills/test-case-gen/prompts/enhance.md`

- [ ] **Step 1: Remove step 5 (需求澄清问答)**

Delete lines 105-139 (the entire `## 步骤 5：需求澄清问答` section). This responsibility has moved to the transform node's CLARIFY protocol.

- [ ] **Step 2: Renumber step 6 to step 5**

Change `## 步骤 6：健康度预检` to `## 步骤 5：健康度预检`.

- [ ] **Step 3: Update task overview**

Change line 14 from:
```
4. 识别需求中的模糊点和缺失项，收集澄清问题
```
To:
```
4. 执行健康度预检，输出检查报告
```

Remove line 15 (`5. 输出健康度预检报告`) since it's now combined with item 4.

- [ ] **Step 4: Update output section**

In the `## 输出要求` section (lines 173-183), remove line 181:
```
4. **需求澄清问题列表**（若有）
```

And renumber remaining items. Also update the final sentence about what to write to state:

Change:
```
将图片数量、要点数量、健康度警告列表写入状态文件，供后续节点使用。
```
To:
```
将图片数量、要点数量、健康度评分和警告列表写入状态文件，供后续节点使用。
```

- [ ] **Step 5: Add note about transform dependency**

Add after line 1 (`# PRD 增强提示词`):

```markdown
# PRD 增强提示词

> 本提示词在节点 3（enhance）加载。
> **前置依赖**：transform 节点已完成 PRD 结构化转换（源码分析、字段定义、CLARIFY 澄清），
> 本节点仅负责图片处理、格式标准化和健康度最终检查。
```

(Replace the existing line 3 `> 本提示词在节点 2（enhance）加载...`)

- [ ] **Step 6: Verify and commit**

```bash
wc -l .claude/skills/test-case-gen/prompts/enhance.md
git add .claude/skills/test-case-gen/prompts/enhance.md
git commit -m "refactor: slim enhance.md - remove clarify (moved to transform)"
```

---

### Task 3: Update SKILL.md workflow

**Files:**
- Modify: `.claude/skills/test-case-gen/SKILL.md`

- [ ] **Step 1: Update description frontmatter**

Change line 5 from:
```
  6 节点工作流：init → enhance → analyze → write → review → output。
```
To:
```
  7 节点工作流：init → transform → enhance → analyze → write → review → output。
```

- [ ] **Step 2: Insert new transform node section**

Insert the following BETWEEN `节点 1: init` (ends at line 158 `等待用户选择后进入节点 2。`) and `节点 2: enhance` (starts at line 162):

Replace line 158:
```
等待用户选择后进入节点 2。
```
With:
```
等待用户选择后进入节点 2（transform）。
```

Then insert the new transform node section after the `---` following init:

```markdown
## 节点 2: transform — 源码分析与 PRD 结构化

**目标**：交叉分析蓝湖素材 + 源码 + 归档用例，产出结构化测试增强 PRD。

### 2.1 源码配置匹配

```bash
npx tsx .claude/scripts/repo-profile.ts match --text "{{prd_title_or_path}}"
```

### 2.2 源码配置确认（交互点）

向用户展示确认清单（使用 AskUserQuestion）：

```
📋 源码配置确认

命中映射规则：{{profile_name}}（若未命中则显示"未匹配"）

仓库 1：
  ● {{path}} @ {{branch}}（映射表默认）
  ○ 自行输入仓库路径和分支

仓库 2：
  ● {{path}} @ {{branch}}
  ○ 自行输入

  ○ 添加更多仓库
  ○ 不使用源码参考

确认后将拉取最新代码。
```

用户确认后，若用户提供了新的映射关系，询问是否保存：

```bash
npx tsx .claude/scripts/repo-profile.ts save --name "{{name}}" --repos '{{repos_json}}'
```

### 2.3 拉取源码

```bash
npx tsx .claude/scripts/repo-sync.ts sync-profile --name "{{profile_name}}"
```

若用户自行输入了仓库（非 profile），则逐个调用：

```bash
npx tsx .claude/scripts/repo-sync.ts --url {{repo_url}} --branch {{branch}}
```

将返回的 commit SHA 写入 PRD frontmatter。

### 2.4 PRD 结构化转换（AI 任务）

读取 `${CLAUDE_SKILL_DIR}/prompts/transform.md`，执行：

- 蓝湖素材解析
- 源码状态检测与分析（A/B 级）
- 历史用例检索
- 按 `references/prd-template.md` 模板填充
- 生成 CLARIFY 块（若有待确认项）

### 2.5 CLARIFY 中转（若有待确认项）

处理流程参见 `references/clarify-protocol.md`：

1. 解析 transform 输出中的 `## CLARIFY` 块
2. 逐个向用户展示选择框（AskUserQuestion），包含推荐答案和备选
3. 收集确认结果，打包为 `## CONFIRMED` 发回 transform subagent
4. subagent 合入确认结果，移除 🔴 标记
5. 若产生新的待确认项 → 循环（最多 3 轮）
6. 无新增 → 输出最终 PRD

### 2.6 更新状态

```bash
npx tsx .claude/scripts/state.ts update --prd-slug {{slug}} --node transform --data '{{json}}'
```

数据结构：
```json
{
  "confidence": 0.85,
  "page_count": 14,
  "field_count": 42,
  "source_hit": "B",
  "clarify_count": 3
}
```
```

- [ ] **Step 3: Renumber enhance from 节点 2 to 节点 3**

Change `## 节点 2: enhance` to `## 节点 3: enhance`

Update all internal references:
- "2.1" → "3.1", "2.2" → "3.2", etc.

- [ ] **Step 4: Remove source sync from enhance section**

Delete the `### 2.4 源码同步` block (the one with `repo-sync.ts --url`) from the (now renumbered) enhance section. This is handled by transform node.

- [ ] **Step 5: Renumber remaining nodes**

- `节点 3: analyze` → `节点 4: analyze`
- `节点 4: write` → `节点 5: write`
- `节点 5: review` → `节点 6: review`
- `节点 6: output` → `节点 7: output`

Update all internal section references (3.1→4.1, 4.1→5.1, etc.)

- [ ] **Step 6: Update state structure in 断点续传说明**

Change the `current_node` example values to include `transform`:

```json
{
  "prd_slug": "xxx",
  "mode": "normal|quick",
  "current_node": "transform|enhance|analyze|write|review|output",
  "transform": { "confidence": 0, "clarify_count": 0 },
  "enhance": { "health_warnings": [], "image_count": 0 },
  "analyze": { "checklist": {} },
  "write": { "modules": {}, "blocked": [] },
  "review": { "issue_rate": 0, "fixed_count": 0 },
  "source_context": { "branch": "", "commit": "" }
}
```

- [ ] **Step 7: Update the init node text**

Where init says `等待用户选择后进入节点 2。`, ensure it says `等待用户选择后进入节点 2（transform）。`

- [ ] **Step 8: Verify and commit**

```bash
# Verify the file is valid markdown and the node count is correct
grep "^## 节点" .claude/skills/test-case-gen/SKILL.md
```

Expected: 7 lines showing 节点 1 through 节点 7.

```bash
git add .claude/skills/test-case-gen/SKILL.md
git commit -m "feat: insert transform node into 7-node workflow"
```

---

### Task 4: End-to-end workflow verification

**Files:** None (verification only)

- [ ] **Step 1: Verify all prompt files exist and are coherent**

```bash
echo "=== Prompt files ==="
ls -la .claude/skills/test-case-gen/prompts/
echo "=== Reference files ==="
ls -la .claude/skills/test-case-gen/references/
echo "=== Node count in SKILL.md ==="
grep "^## 节点" .claude/skills/test-case-gen/SKILL.md
echo "=== Transform prompt line count ==="
wc -l .claude/skills/test-case-gen/prompts/transform.md
echo "=== Enhance prompt has no clarify ==="
grep -c "澄清" .claude/skills/test-case-gen/prompts/enhance.md || echo "0 matches (good)"
echo "=== SKILL.md mentions transform ==="
grep -c "transform" .claude/skills/test-case-gen/SKILL.md
```

Expected:
- 7 节点 lines
- transform.md exists (~200 lines)
- enhance.md has 0 or minimal "澄清" mentions (only in historical context, not as a step)
- SKILL.md mentions "transform" multiple times

- [ ] **Step 2: Verify cross-references are consistent**

Check that:
- SKILL.md references `prompts/transform.md` ✓
- SKILL.md references `references/clarify-protocol.md` ✓
- SKILL.md references `references/prd-template.md` ✓
- transform.md references `references/prd-template.md` ✓
- transform.md references `references/clarify-protocol.md` ✓
- enhance.md does NOT reference "需求澄清" as a step ✓

```bash
grep "transform.md" .claude/skills/test-case-gen/SKILL.md
grep "clarify-protocol.md" .claude/skills/test-case-gen/SKILL.md
grep "prd-template.md" .claude/skills/test-case-gen/prompts/transform.md
grep "clarify-protocol.md" .claude/skills/test-case-gen/prompts/transform.md
```

- [ ] **Step 3: Final commit if fixes needed**

Only if steps 1-2 revealed issues:
```bash
git add -A && git commit -m "fix: adjustments from phase 2 integration verification"
```
