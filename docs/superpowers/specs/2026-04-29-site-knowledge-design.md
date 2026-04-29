# Site Knowledge — 站点操作知识集成设计

## 背景

kata 的 ui-autotest 流程目前是"一次性的"：script-case-agent 为每个测试用例生成 Playwright 脚本，跑完即弃。Agent 在脚本生成/修复过程中学到的站点交互知识（稳定 selector、等待策略、交互陷阱）没有任何沉淀，下次执行同类操作仍要重新发现。

[browser-harness](https://github.com/browser-use/browser-harness) 的 domain-skills 机制提供了参考：通过 `agent-workspace/domain-skills/` 目录让 agent 在操作前读取已有知识、操作后贡献新知识，形成学习闭环。

本设计将 domain-skills 的理念集成到 kata 现有的 ui-autotest 工作流和 knowledge 系统中。

## 目标

1. Agent 在生成 Playwright 脚本前能自动读取当前站点的操作知识
2. Agent 在完成脚本后能自动贡献新发现的知识
3. 知识存储在项目知识库 `knowledge/sites/` 中，与 `knowledge-keeper` 体系一致
4. 全过程嵌入 ui-autotest 工作流，无需人工触发

## 非目标

- 不修改 `lib/playwright/` 的职责范围（仍只存放跨站点通用的 Ant Design 交互函数）
- 不改变 knowledge-keeper 的写入纪律（subagent 建议 → 主 agent 审核 → 写入）
- 不做自动代码生成（知识是 markdown 文档，不是可执行代码）

---

## 1. 存储结构

站点知识存放在 `knowledge/sites/` 下，hostname 为目录名：

```
workspace/{project}/knowledge/
├── _index.md
├── overview.md
├── terms.md
├── modules/
│   └── *.md
├── pitfalls/
│   └── *.md
└── sites/                              ← 新增
    └── github.com/
        ├── _index.md                   ← 该站点的知识索引
        ├── overview.md                 ← 站点概况、URL 模式、登录方式
        ├── selectors.md                ← 稳定 selector / role / data-testid
        ├── api.md                      ← 后端 API 端点（处理静态度量等场景）
        └── traps.md                    ← 踩坑记录（可视为 pitfalls 的站点版）
```

关于目录位置的说明：放在 `workspace/{project}/` 下而非 repo 根或 workspace 级，原因：

- B 端产品，每个项目（如 dataAssets、xyzh）的设计风格和组件实现不同
- selector 和交互模式是项目特定的，跨项目不通用
- 与现有 `knowledge/` 体系一致，复用索引和审计机制

## 2. 文件格式

每个文件带 frontmatter，与现有 modules/pitfalls 风格一致：

```markdown
---
type: site-selectors
domain: github.com
updated_by: script-case-agent
confidence: high
updated_at: 2026-04-29
---

# GitHub - Selectors

## Issue list page

- 列表容器: `[data-testid="issue-list"]`
- 每行: `[data-testid="issue-row"]`
- 创建按钮: `a[href$="/new"]`

## 等待策略

- 创建 issue 后 URL 变为 `/{owner}/{repo}/issues/{number}`
- waitForURL 比 waitForSelector 更可靠
```

### 文件类型

| type           | 文件名       | 内容说明                             |
| -------------- | ------------ | ------------------------------------ |
| site-overview  | overview.md  | 站点 URL 模式、登录方式、整体架构    |
| site-selectors | selectors.md | 页面稳定 selector、role、data-testid |
| site-api       | api.md       | 后端 API 端点、请求参数、响应格式    |
| site-traps     | traps.md     | 交互陷阱、不稳定的选择器、已知限制   |

### confidence 说明

| confidence | 含义                 | 典型场景                            |
| ---------- | -------------------- | ----------------------------------- |
| high       | 经测试验证过的       | script-case-agent 自测通过时标记    |
| medium     | Agent 观察到但未验证 | 从 DOM 推断或根据源码确定           |
| low        | 猜测，需要人工确认   | 不确定的 selector、需要 QA 判断的坑 |

## 3. 集成到 ui-autotest 工作流

### 3.1 整体流程变化

```
当前流程:
  Step 2(Login) → Step 3(脚本生成 → 自测 → 修复) → Step 4(Merge) → Step 5(执行) → Step 6(报告)

新流程:
  Step 2(Login) → Step 3a(读取站点知识) → Step 3b(脚本生成 → 自测 → 修复) →
  Step 3c(收敛分析 + 知识贡献) → Step 4(Merge) → Step 5(执行) → Step 6(报告)
```

### 3.2 Step 3a: 读取站点知识（新增，主 agent 直接执行）

**位置**：Step 2 完成后、派发 script-case-agent 之前

**流程**：

1. 读取 `.task-state.json`，提取所有任务的 `page` 字段
2. 从 `page` 字段解析 hostname（如 `dataassets.dtstack.com` → `dataassets.dtstack.com`）
3. 检查 `knowledge/{project}/sites/{hostname}/` 是否存在
4. 存在 → 读取 `overview.md`、`selectors.md` 等，汇总为知识摘要
5. 将知识摘要注入到每个 script-case-agent 的 prompt 中

**伪代码**：

```bash
PAGES=$(bun -e "const s=require('fs').readFileSync('.task-state.json','utf-8');const j=JSON.parse(s);console.log([...new Set(j.tasks.map(t=>new URL(t.page).hostname))].join(','))")
for HOST in $(echo $PAGES | tr ',' ' '); do
  DIR="workspace/${PROJECT}/knowledge/sites/${HOST}"
  if [ -d "$DIR" ]; then
    cat "$DIR/selectors.md" "$DIR/traps.md" 2>/dev/null
  fi
done
```

如果 `page` 字段不是完整 URL（如只是描述性文字），跳过该任务的知识查找。

### 3.3 Step 3b: script-case-agent 携带知识上下文

**变化点**：script-case-agent 的 prompt 中增加 `site_knowledge` 参数

**新增输入参数**：

```
site_knowledge: |
  ## GitHub Selectors
  - Issue 列表容器: [data-testid="issue-list"]
  - 创建按钮: a[href$="/new"]

  ## GitHub Traps
  - 不要用 .Box 类选择器，会被 CSS module 重写
  - 创建 issue 后 URL 变更为 {owner}/{repo}/issues/{number}
```

**prompt 中新增指令**（追加到 script-case-agent.md 的工作流程中）：

```
### 0. 读取站点知识

主 agent 通过 prompt 传递了 site_knowledge 参数（如有）。
- 优先使用 site_knowledge 中记录的 selector，而非自行从 DOM 推断
- 如果 site_knowledge 中的 selector 无效，尝试修复后提交建议更新
- 如果 site_knowledge 为空集，正常执行（无站点知识可用）
```

### 3.4 Step 3c: 知识贡献（新增，收敛分析后执行）

script-case-agent 在返回结果中增加 `suggested_site_knowledge` 字段：

```json
{
  "task_id": "t01",
  "status": "completed",
  "script_path": "cases/t01-xxx.ts",
  "fix_result": {
    "fix_status": "FIXED",
    "summary": "修复 2 轮后通过"
  },
  "suggested_site_knowledge": [
    {
      "type": "site-selectors",
      "domain": "github.com",
      "content": "Issue 列表页使用 [data-testid=\"issue-list\"]，不使用 .Box\n",
      "confidence": "high"
    },
    {
      "type": "site-traps",
      "domain": "github.com",
      "content": "创建 Issue 后 URL 会变更为 /{owner}/{repo}/issues/{number}，不要 waitForURL '**/issues' 因为会匹配到列表页\n",
      "confidence": "high"
    }
  ]
}
```

主 agent 在 Step 3c（收敛分析阶段）汇总所有 agent 的建议：

1. 收集所有 script-case-agent 返回的 `suggested_site_knowledge`
2. 按 `domain` + `type` 去重
3. 对置信度为 `high` 的条目，直接写入 `knowledge/{project}/sites/{domain}/{type}.md`
4. 对置信度 `medium`/`low` 的条目，汇总成报告展示给用户，询问是否写入
5. 更新 `knowledge/{project}/sites/_index.md`（可选）

### 3.5 流程图

```text
Step 3 完整流程:

  主 agent
    │
    ├── Step 3a: 读取站点知识
    │   ├── 解析 .task-state.json 提取 pages
    │   ├── 查询 knowledge/sites/{hostname}/
    │   └── 汇总知识摘要
    │
    ├── Step 3b: 派发 script-case-agent
    │   ├── agent 1（携带站点知识）
    │   ├── agent 2（携带站点知识）
    │   └── agent 3（携带站点知识）
    │
    └── Step 3c: 收敛分析 + 知识贡献
        ├── 收集 agent 返回的 suggested_site_knowledge
        ├── 置信度 high → 直接写入 knowledge/sites/
        ├── 置信度 medium/low → 询问用户
        └── 更新 _index.md
```

## 4. 与 lib/playwright/ 的边界

两者有不同的职责和触发条件，不会冲突：

| 场景                       | 归宿                                   | 判断依据                             |
| -------------------------- | -------------------------------------- | ------------------------------------ |
| Ant Design Select 选中封装 | `lib/playwright/`                      | 跨站点通用，不依赖业务               |
| 某站点登录框 selector      | `knowledge/sites/traps.md`             | 站点特定，仅该站点可用               |
| 表格翻页等待通用函数       | `lib/playwright/`                      | 跨站点通用模式                       |
| 某站点 iframe 交互坑       | `knowledge/sites/traps.md`             | 站点特有实现细节                     |
| 3+ 站点同时有同一踩坑模式  | `lib/playwright/` + `knowledge/sites/` | 先在知识库记录，提炼后提升为共享函数 |

**决策树**：

```
发现交互模式
  ├── 跨站点通用？且不依赖具体业务 URL？
  │   └── 是 → lib/playwright/（封装为共享函数）
  ├── 仅当前站点有效？
  │   └── 是 → knowledge/sites/（记录为知识文档）
  └── 不确定？
      └── 先 knowledge/sites/，后续出现第二个站点时再提炼
```

### 4.1 现有提示词调整

当前 script-case-agent 中"可复用时自动封装到 lib/playwright"的指令需要加限定条件。修改 `script-case-agent.md` 中的规则：

**现有**（rules.md 第 8 行）：

> 发现交互模式可复用时，改 `lib/playwright/ant-design/` 本体

**改为**：

> 发现交互模式可复用时，判断：若为**跨站点通用、不依赖业务/URL**的模式，改 `lib/playwright/ant-design/` 本体；若为**当前站点特有**的模式，记录到 `knowledge/{project}/sites/`。

## 5. 测试设计与验证

### 5.1 测试目标

1. **知识读取** — Step 3a 能正确解析 hostname 并读取对应知识文件
2. **知识注入** — script-case-agent 的 prompt 携带了 `site_knowledge` 参数
3. **知识贡献** — Step 3c 能正确汇总并写入知识文件
4. **不污染 lib/playwright/** — 站点特定知识不写入 `lib/playwright/`

### 5.2 单元测试

在 `engine/tests/ui-autotest/` 下新增测试，覆盖：

- Hostname 提取（从 `page` 字段解析）
- 知识摘要生成
- 建议去重与合并
- 置信度过滤逻辑

### 5.3 集成验证

1. 创建测试用的站点知识文件
2. 运行 parse-cases 生成 .task-state.json
3. 运行知识读取步骤，验证输出包含预期知识
4. 模拟 script-case-agent 返回 suggested_site_knowledge
5. 运行知识贡献步骤，验证文件写入正确

## 6. 实施顺序

### Phase 1: 存储与读取（最小可行）

- [ ] 在 `knowledge-keeper` 中注册 `sites/` 类型（复用现有 verify + history 机制）
- [ ] 实现 Step 3a：主 agent 读取站点知识
- [ ] 修改 script-case-agent prompt：接受 `site_knowledge` 参数

### Phase 2: 知识贡献

- [ ] 实现 Step 3c 知识贡献流程
- [ ] 在 script-case-agent 的输出契约中增加 `suggested_site_knowledge`
- [ ] 实现置信度判断和去重逻辑

### Phase 3: 规则完善

- [ ] 修改 script-case-agent.md 中的可复用代码规则
- [ ] 修改 rules.md 第 8 行，加限定条件
- [ ] 补充 playwright-patterns.md 中的决策树

## 7. 风险与缓解

| 风险                          | 缓解                                                   |
| ----------------------------- | ------------------------------------------------------ |
| 站点知识写入质量低            | 只有 high confidence 才自动写入，medium/low 需人工确认 |
| selector 随时间过时           | 知识有 frontmatter 的 updated_at，过期的在索引中标记   |
| script-case-agent prompt 膨胀 | site_knowledge 用代码块包裹，控制在 500 行以内         |
| 知识积累过多后检索困难        | `_index.md` 按 domain 索引，支持 knowledge-keeper 查询 |
