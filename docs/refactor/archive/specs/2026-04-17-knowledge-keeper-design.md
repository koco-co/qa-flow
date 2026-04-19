# knowledge-keeper Skill 设计文档

**Phase**: 1 · `create-project` skill + `setup` 瘦身 + `knowledge-keeper` 实施（子目标 1 of 3）
**Date**: 2026-04-17
**Status**: Draft — awaiting user review
**Parent Roadmap**: [`../../refactor-roadmap.md`](../../refactor-roadmap.md)
**Upstream Contract**: [`2026-04-17-knowledge-architecture-design.md § 5`](./2026-04-17-knowledge-architecture-design.md)

---

## 1. Context

Phase 0 已落地三层信息架构（memory / rules / knowledge），并在每个 workspace 创建 `knowledge/` 空骨架，但**没有代码实施**。knowledge-keeper 作为三层架构中 `knowledge/` 层的唯一写入 API，在 Phase 1 阶段完成代码实施。

Phase 0 spec §5 已定型 contract 骨架（7 个 actions、frontmatter 约定、写入置信度分级 W2、读取懒加载 R3）。本 spec 补齐所有实施级别的决策：CLI 与 Skill 职责边界、置信度分流算法、pitfall 检索算法、lint 硬约束、_index.md 自动刷新、测试策略、向前兼容 Phase 0 骨架。

---

## 2. Goals

1. 交付可执行的 knowledge-keeper CLI 脚本（`.claude/scripts/knowledge-keeper.ts`）
2. 交付 knowledge-keeper skill（`.claude/skills/knowledge-keeper/SKILL.md`）
3. 实施 Phase 0 §5 全部 7 个 actions：`read-core` / `read-module` / `read-pitfall` / `write` / `update` / `index` / `lint`
4. 实施 W2 置信度分级写入（high 直写 / medium AskUser 后写 / low 强制升级为 medium）
5. 实施 R3 分层懒加载读取（核心层 + 模块懒加载 + 坑按关键词）
6. 向前兼容 Phase 0 骨架（自动补齐缺失的 frontmatter）
7. 补齐 `paths.ts` 对应的 knowledge 路径 helper
8. 单元测试全覆盖，集成测试走真实 CLI 调用

---

## 3. Non-Goals

- `create-project` skill 实施 → 子目标 2
- `setup` skill 瘦身 → 子目标 3
- 其他 skill（test-case-gen / ui-autotest / xmind-editor）的 knowledge-core 注入 → 后续阶段按需
- knowledge/ 内容填充 → 长期维护
- 暂存机制（低置信度 buffer + 阶段末批量问）→ 以"low 强制升级为 medium"替代，不引入
- subagent 调用写 API 的技术锁 → 仅 SKILL.md 约束 + agents 规则，不做调用方校验

---

## 4. Architecture

### 4.1 双层职责边界

```
┌──────────────── Claude Code ────────────────┐
│  主 agent / subagent                         │
│       │                                      │
│       │ 触发词 / 引用 knowledge               │
│       ▼                                      │
│  ┌──────────────────────────┐                │
│  │ knowledge-keeper (Skill) │                │
│  │ ─ 对话分支                │                │
│  │ ─ 置信度分流 + AskUser    │                │
│  │ ─ dry-run 确认 → 真写     │                │
│  └────────────┬─────────────┘                │
│               │ bun run CLI                  │
│               ▼                              │
│  ┌──────────────────────────┐                │
│  │ knowledge-keeper.ts (CLI)│                │
│  │ ─ 纯文件 I/O             │                │
│  │ ─ 无 TTY 交互             │                │
│  │ ─ stdout JSON             │                │
│  │ ─ exit code 分级          │                │
│  └────────────┬─────────────┘                │
│               ▼                              │
│    workspace/{project}/knowledge/            │
└──────────────────────────────────────────────┘
```

| 职责 | Skill 层 | CLI 层 |
|---|---|---|
| 对话/提问 | AskUserQuestion | 永不询问 |
| 置信度判断 | 分流 high/medium/low | 只按 `--confirmed` 决定是否写 |
| 写入预览 | 先 dry-run 再 AskUser | 输出 before/after JSON |
| 文件 I/O | 不 | 独占 |
| _index.md 自动刷新 | 不 | write/update 成功后自动触发 |
| subagent 可调用 | 读-only scenarios | read-* 只读 CLI |

### 4.2 CLI 输出契约

对齐 `xmind-edit.ts` / `rule-loader.ts` 范式：

- **stdout**：JSON（read 返回数据结构，write/update 返回 `{ before, after, file }`）
- **stderr**：`[knowledge-keeper] <message>\n`
- **exit code**：`0` 成功；`1` 错误（不允许继续）；`2` lint 有 warning 但未命中 error

### 4.3 数据流

**read 流**：`Skill` 调 CLI → CLI 读文件 → 解析 frontmatter 与正文 → JSON stdout → `Skill` 渲染/注入 prompt

**write 流**：
1. `Skill` 构造 content JSON 并判断 confidence
2. CLI `--dry-run` 返回 before/after
3. `Skill` 用 AskUser 展示（high 跳过此步）
4. 用户确认后 `Skill` 调 CLI `--confirmed` 真写
5. CLI 写文件 → 自动触发 index 重写 → 返回最终 before/after JSON

---

## 5. 文件布局与 Frontmatter 契约

### 5.1 目录结构

```
workspace/{project}/knowledge/
├── _index.md               # 自动维护的目录（write/update 后自动重写）
├── overview.md             # 单例：产品定位 + 主流程（按 section 追加/替换）
├── terms.md                # 单例：术语表（表格追加行）
├── modules/
│   ├── data-source.md      # kebab-case 命名
│   └── private-xxx.md      # private- 前缀受 .gitignore 排除
└── pitfalls/
    ├── ui-dom-drift.md
    └── private-xxx.md
```

### 5.2 命名约束（lint 强制）

| 位置 | 规则 |
|---|---|
| `modules/*.md`、`pitfalls/*.md` | kebab-case（`a-z0-9-`），允许 `private-` 前缀 |
| `overview.md` / `terms.md` / `_index.md` | 固定三个文件名，唯一 |
| frontmatter `type` | 必须与所在目录一致（modules/ 必须 `type: module`） |

### 5.3 Frontmatter 契约

所有非 `_index.md` 的 knowledge .md 文件统一 frontmatter：

```yaml
---
title: 质量项目创建流程
type: module                           # overview | term | module | pitfall
tags: [quality, creation, auth]        # 允许空数组（lint warning）
confidence: high                       # high | medium | low，写入时 skill 决定
source: workspace/.../quality-impl.ts:88  # 证据来源；允许空字符串（lint warning）
updated: 2026-04-17                    # ISO 日期；CLI 写入时自动填当天
---
```

**特殊规则：**

- `overview.md` / `terms.md`：文件级 frontmatter 描述整份文档的 updated；单条 term / section 不带子 frontmatter
- `_index.md`：**无 frontmatter**，全自动生成，人工不应编辑
- `source` 允许空字符串；`tags` 允许空数组（两者 lint 记 warning，不阻断）

### 5.4 _index.md 生成格式

```markdown
# {project} Knowledge Index

> 由 knowledge-keeper 自动维护，请勿手动编辑。

## Core
- [overview.md](overview.md) — 产品定位 + 主流程（updated: 2026-04-17）
- [terms.md](terms.md) — 术语表（7 条，updated: 2026-04-17）

## Modules
- [data-source.md](modules/data-source.md) — 数据源接入流程 [tags: data-source, auth] (updated: 2026-04-17, confidence: high)

## Pitfalls
- [ui-dom-drift.md](pitfalls/ui-dom-drift.md) — UI DOM 漂移修复 [tags: ui, playwright] (updated: 2026-04-15, confidence: high)

<!-- last-indexed: 2026-04-17T10:20:30Z -->
```

### 5.5 Phase 0 骨架向前兼容

Phase 0 创建的 overview.md / terms.md / _index.md 均无 frontmatter。

- CLI `index` 命令首次遇到缺 frontmatter 的模板文件：**自动补注入最小 frontmatter**（type 按文件名推断，confidence=high，updated=今天，title 从 H1 提取，tags=[] 空数组）并写回文件
- `lint` 遇到 `tags=[]` / `source=""` 仅 warning（exit 2），不阻断

---

## 6. CLI API（7 个 actions 完整签名）

CLI 入口：`bun run .claude/scripts/knowledge-keeper.ts <action> [...]`

所有 action 必带 `--project <name>`。成功的 stdout 均为 JSON。

### 6.1 `read-core`

```bash
knowledge-keeper read-core --project <name>
```

**返回：**

```json
{
  "project": "dataAssets",
  "overview": { "title": "...", "content": "<overview.md 正文>" },
  "terms": [
    { "term": "Quality Item", "zh": "质量项", "desc": "...", "alias": "QI" }
  ],
  "index": {
    "modules": [{ "name": "data-source", "title": "...", "tags": [], "updated": "2026-04-17" }],
    "pitfalls": [{ "name": "ui-dom-drift", "title": "...", "tags": [], "updated": "2026-04-15" }]
  }
}
```

消费者：所有 skill 启动时可默认调用（本阶段仅 knowledge-keeper 自己的 SKILL.md 示范，其他 skill 按需后续接入）

### 6.2 `read-module`

```bash
knowledge-keeper read-module --project <name> --module <module-name>
```

**返回：**

```json
{
  "project": "dataAssets",
  "module": "data-source",
  "frontmatter": { "title": "...", "tags": ["..."], "updated": "2026-04-17", "confidence": "high", "source": "..." },
  "content": "<module md 正文（去除 frontmatter）>"
}
```

文件不存在 → `exit 1` + `[knowledge-keeper] Module not found: <name>\n`

### 6.3 `read-pitfall`

```bash
knowledge-keeper read-pitfall --project <name> --query <keyword>
```

**算法（filename + tags 精确匹配）：**

对每个 `pitfalls/*.md`：
- 集合 A：文件名（去 `.md`）小写包含 query 小写
- 集合 B：frontmatter.tags 任一元素小写包含 query 小写
- 合并 A ∪ B 去重

**返回：**

```json
{
  "project": "dataAssets",
  "query": "dom",
  "matches": [
    {
      "name": "ui-dom-drift",
      "title": "UI DOM 漂移修复",
      "tags": ["ui", "playwright"],
      "match_by": ["filename"],
      "path": "workspace/dataAssets/knowledge/pitfalls/ui-dom-drift.md"
    }
  ]
}
```

空结果返回 `matches: []` + `exit 0`。

### 6.4 `write`

```bash
knowledge-keeper write \
  --project <name> \
  --type overview|term|module|pitfall \
  --content '<json>' \
  [--confidence high|medium|low] \
  [--confirmed] \
  [--dry-run] \
  [--overwrite]
```

**`--content` JSON schema（按 type）：**

```typescript
// type=overview
{ "section": "产品定位" | "主流程" | <自定义>, "body": "...", "mode": "append" | "replace" }

// type=term
{ "term": "...", "zh": "...", "desc": "...", "alias": "" }

// type=module
{ "name": "data-source", "title": "...", "tags": ["..."], "body": "...", "source": "" }

// type=pitfall
{ "name": "ui-dom-drift", "title": "...", "tags": ["..."], "body": "...", "source": "" }
```

**分支规则：**

| 情况 | 行为 |
|---|---|
| `--dry-run` | 输出 `{ dry_run: true, action, before, after, file }`，不落盘 |
| `--confidence=low` | 总是 `exit 1` + stderr 提示升级 |
| `--confidence=medium` 无 `--confirmed` | `exit 1` + stderr 提示需带 `--confirmed` |
| `--confidence=high` 无 `--confirmed` | 允许直接写 |
| 有 `--confirmed` 任意 confidence | 允许写（skill 层已做 AskUser） |
| 文件已存在（module/pitfall）且无 `--overwrite` | `exit 1` + stderr `File exists; use 'update' action or pass --overwrite` |
| 文件已存在 + `--overwrite` | 允许整文件覆盖（skill 层需先 read 再合并内容） |
| 正常写入 | 写文件 → 自动触发 `index` → 输出 `{ before, after, file }` |

**frontmatter 自动注入（CLI 全权）：**
- `updated` = 今天
- `confidence` = `--confidence`（默认 `medium`）
- `type` = `--type`
- `title` / `tags` / `source` 从 content JSON 取，缺省给合理默认

### 6.5 `update`

```bash
knowledge-keeper update \
  --project <name> \
  --path <relative/to/knowledge/> \
  --content '<json>' \
  [--confirmed] [--dry-run]
```

`--path` 示例：`modules/data-source.md` / `pitfalls/ui-dom-drift.md` / `overview.md` / `terms.md`

**`--content` schema：**

```typescript
{
  frontmatter_patch?: { title?: string, tags?: string[], confidence?: string, source?: string },
  body_patch?: {
    section?: string,   // overview：哪个 section
    row_id?: string,    // terms：哪个 term
    new_body?: string   // module/pitfall：整个 body 或指定 section 正文
  },
  mode: "patch" | "replace"
}
```

行为与 write 一致（`--confirmed` 强制、`--dry-run` 预览、成功后自动触发 index）。

### 6.6 `index`

```bash
knowledge-keeper index --project <name>
```

**逻辑：**
1. 扫描 `modules/*.md`、`pitfalls/*.md`
2. 读取每个文件 frontmatter
3. Phase 0 兼容：缺 frontmatter 时自动补齐，并写回文件
4. 重写 `_index.md`（格式见 5.4）
5. 输出：

```json
{
  "project": "dataAssets",
  "modules_count": 3,
  "pitfalls_count": 5,
  "fixed_frontmatter": ["modules/legacy.md"],
  "written": "workspace/dataAssets/knowledge/_index.md"
}
```

### 6.7 `lint`

```bash
knowledge-keeper lint --project <name> [--strict]
```

**检查项：**

| 档 | 项目 | exit code |
|---|---|---|
| error | frontmatter 必填字段缺失（title/type/confidence/updated） | 1 |
| error | `type` 与所在目录不一致 | 1 |
| error | 命名违反 kebab-case | 1 |
| warning | `tags=[]` 空数组 | 2 |
| warning | `source=""` 空字符串 | 2 |
| warning | 孤立文件（在 modules/ 或 pitfalls/ 存在但未列在 _index.md） | 2 |

`--strict`：将 warning 升级为 error（exit 1）

**输出：**

```json
{
  "project": "dataAssets",
  "errors": [{ "file": "modules/data-source.md", "rule": "missing-frontmatter-field", "detail": "title" }],
  "warnings": [{ "file": "pitfalls/ui-dom-drift.md", "rule": "empty-tags", "detail": "" }]
}
```

---

## 7. SKILL.md 交互流程

### 7.1 Skill 结构

```markdown
---
name: knowledge-keeper
description: "业务知识库读写。支持记录/查询业务概览、术语、模块知识、踩坑记录。触发词：记一下、沉淀到知识库、更新知识库、查业务规则、这个坑记一下、查术语、查模块知识。"
argument-hint: "[操作] [关键词或内容]"
---

# knowledge-keeper

## 前置加载
  ├─ 项目选择（对齐 xmind-editor）
  └─ 规则上下文（rule-loader）

## 场景 A：查询（read）
  ├─ A1. 查术语 → read-core + 人读 terms
  ├─ A2. 查模块知识 → read-module
  └─ A3. 查踩坑 → read-pitfall

## 场景 B：写入（write/update）
  ├─ B1. 新增术语 → write type=term
  ├─ B2. 追加概览章节 → write type=overview
  ├─ B3. 新建/更新模块 → write 或 update
  └─ B4. 记录踩坑 → write type=pitfall

## 场景 C：维护（index/lint）
  ├─ C1. 刷新目录 → index
  └─ C2. 健康检查 → lint

## 置信度分流策略
## Subagent 调用守则
```

### 7.2 写入流程模板（B 场景通用）

```
1. 识别触发词 + 解析意图
   ├─ "记一下 X 是 Y" → type=term，默认 confidence=high（用户显式）
   ├─ "项目的 XX 模块有 YY 规则" → type=module 或 overview
   └─ "踩坑：ZZ" → type=pitfall

2. 构造 content JSON
   ├─ 主 agent 根据上下文补齐 title / tags / source
   └─ 判断置信度：
       ├─ 用户显式"记一下"或提供完整信息 → high
       ├─ 从源码/PRD 提炼出的推断 → medium
       └─ 无法升级的 low → 强制 AskUser 升级为 medium（禁止写 low）

3. dry-run 预览
   bun run .claude/scripts/knowledge-keeper.ts write \
     --project {{project}} --type {{type}} \
     --content '{{json}}' --confidence {{conf}} --dry-run

4. 展示 before/after 给用户

5. 置信度分流：
   ├─ high → 直接真实写入（不 AskUser）
   └─ medium → AskUserQuestion：
       [确认写入] [调整 title/tags] [更换目标文件] [跳过]

6. 真实写入
   bun run .claude/scripts/knowledge-keeper.ts write \
     --project {{project}} --type {{type}} \
     --content '{{json}}' --confidence {{conf}} --confirmed

7. 展示结果摘要
```

### 7.3 AskUser 文案模板

**medium 置信度写入确认：**

```
检测到新的业务知识条目（置信度：medium）

类型：module
目标：workspace/dataAssets/knowledge/modules/quality.md
标题：质量项目创建流程
标签：[quality, creation, auth]
证据：workspace/dataAssets/.repos/.../quality-impl.ts:88

【内容预览】
{{body 前 200 字}}...

选项：[确认写入] [调整内容] [更换路径] [跳过]
```

**low 升级为 medium 提示：**

```
该知识条目证据不足（low 置信度），需要补充信息升级为 medium 再写入。

推断内容：{{content}}
推断依据：{{source 或 推断理由}}

请提供：
[补充证据] [直接升级为 medium 并确认] [放弃]
```

### 7.4 查询流程模板（A 场景）

```
1. 识别意图
   ├─ "查 XX 术语" → read-core + 过滤 terms
   ├─ "看 XX 模块" → read-module --module <name>
   └─ "查 XX 踩坑" → read-pitfall --query <keyword>

2. 执行 CLI
3. Markdown 渲染展示
4. 无结果时给出补救建议
```

### 7.5 其他 skill 集成（仅示范，不改造）

knowledge-keeper SKILL.md 仅提供标准 `read-core` 调用块和示例，**不强制改造** test-case-gen / ui-autotest / xmind-editor 等其他 skill。后续阶段按需接入。

### 7.6 Subagent 调用守则（写入 SKILL.md）

- subagent 禁止直接调 `write` / `update` CLI
- subagent 发现需要沉淀知识时，在返回报告中标注：「建议沉淀：{{type}} / {{content 摘要}} / 置信度 {{conf}}」
- 主 agent 收到后由 knowledge-keeper skill 统一处理写入
- subagent 可自由调 `read-core` / `read-module` / `read-pitfall`（只读安全）

---

## 8. 测试策略

### 8.1 Layer 1：单元测试

`.claude/scripts/__tests__/knowledge-keeper.test.ts` 覆盖 CLI 内部纯函数：

| 测试组 | 核心用例 |
|---|---|
| `frontmatter parser` | 正常 / 缺必填 / YAML 语法错 / 无 frontmatter 空 body |
| `parseContentJson` | 四种 type schema / 非法 JSON |
| `fillDefaultFrontmatter` | updated 自动填当天 / type 按 --type 注入 |
| `renderIndex` | 空 modules/pitfalls / 单文件 / 多文件排序 / last-indexed 时间戳 |
| `pitfallSearch` | filename 命中 / tags 命中 / 空结果 / 大小写不敏感 / 重复去重 |
| `lintChecks` | 每一条 error/warning 规则独立用例 |
| `confidenceGate` | high 无 --confirmed 允许 / medium 无 --confirmed 拒 / low 总拒 |
| `indexAutoFix` | Phase 0 骨架无 frontmatter → 补齐后可 lint 通过 |

### 8.2 Layer 2：集成测试（同文件）

通过 `Bun.spawn` 走真实 CLI 调用。`before` / `after` 创建清理临时 fixture：

```typescript
const fixtureProject = "kk-test-fixture";
const fixtureDir = join(repoRoot(), "workspace", fixtureProject, "knowledge");

before(() => mkdirSync(fixtureDir, { recursive: true }));
after(() => rmSync(join(repoRoot(), "workspace", fixtureProject), { recursive: true, force: true }));
```

覆盖场景：
- `read-core` 空骨架返回 sensible defaults
- `write type=term` dry-run 不落盘
- `write type=module` + `--confirmed` 落盘并触发 `_index.md` 重写
- `update --path modules/x.md` frontmatter_patch 只改指定字段
- `lint` 捕捉孤立文件
- `read-pitfall` 命中/未命中/大小写

**副作用清理铁律**：所有向 `workspace/kk-test-fixture/` 写入的测试必须在 `after` 中清理（遵循 CLAUDE.md）

### 8.3 Layer 3：Smoke 验证（阶段末手动）

不纳入 CI，在 spec "smoke 章节"中记录命令参考：

```bash
bun run .claude/scripts/knowledge-keeper.ts read-core --project dataAssets | jq .overview.title

bun run .claude/scripts/knowledge-keeper.ts write --project dataAssets \
  --type term --confidence high \
  --content '{"term":"SMOKE","zh":"烟雾","desc":"阶段 1 验证","alias":""}' \
  --dry-run

bun run .claude/scripts/knowledge-keeper.ts write --project dataAssets \
  --type term --confidence high \
  --content '{"term":"SMOKE","zh":"烟雾","desc":"阶段 1 验证","alias":""}' \
  --confirmed

grep -q "SMOKE" workspace/dataAssets/knowledge/terms.md || echo "FAIL"
grep -q "last-indexed" workspace/dataAssets/knowledge/_index.md || echo "FAIL"

bun run .claude/scripts/knowledge-keeper.ts lint --project dataAssets

git checkout workspace/dataAssets/knowledge/
```

---

## 9. Success Criteria

- [ ] 本 spec 入库：`docs/refactor/specs/2026-04-17-knowledge-keeper-design.md`
- [ ] Plan 入库：`docs/refactor/plans/2026-04-17-knowledge-keeper-implementation.md`
- [ ] CLI 脚本：`.claude/scripts/knowledge-keeper.ts`
- [ ] SKILL：`.claude/skills/knowledge-keeper/SKILL.md`
- [ ] `paths.ts` 新增 helper：`knowledgeDir` / `knowledgePath` / `knowledgeModulesDir` / `knowledgePitfallsDir`
- [ ] 单元 + 集成测试新增：`knowledge-keeper.test.ts`；`paths.test.ts` 补充新 helper 用例
- [ ] `bun test ./.claude/scripts/__tests__` 全绿（含原 472 条 + 新增）
- [ ] Smoke 步骤 1-6 全通过
- [ ] Phase 0 骨架兼容：首次 `index` 在 dataAssets/xyzh 运行不报错、自动补 frontmatter
- [ ] `_index.md` 自动重写：任一 write/update 后 `<!-- last-indexed -->` 刷新
- [ ] 无硬编码：脚本 / 测试中无绝对路径 / 内部服务地址 / 凭证
- [ ] commit 粒度：spec / plan / CLI 骨架 / CLI 行为 / 单测 / SKILL / smoke 各自独立

---

## 10. Risks

| 风险 | 缓解 |
|---|---|
| frontmatter 解析 YAML 复杂边界（多行值、特殊字符） | MVP 使用极简子集（单行字符串、字符串数组），不支持嵌套；lint 提示不支持的结构 |
| _index.md 自动重写与人工编辑冲突 | `_index.md` 顶部注明"请勿手动编辑"；任何 write/update 后整体覆盖；arena 协议为 "auto-owned" |
| subagent 绕过 Skill 直接调 write CLI | SKILL.md + agents 规则双重文字约束；不做技术锁，接受 trust boundary |
| confidence=high 被滥用绕过 AskUser | 依赖 Skill 层判断规则落实；Skill 文档明示"用户显式触发"才 high |
| write 误覆盖已有 module/pitfall | CLI 默认拒绝覆盖（需 `--overwrite`）；推荐走 `update` 语义 |
| Phase 0 骨架自动补 frontmatter 改动文件 | 首次运行会写 Phase 0 骨架；在 smoke 中 `git checkout` 回滚确认 |
| 并发写同一项目 | 仅单 CC session 使用，不考虑；将来多 agent 并发需加锁（超 scope） |

---

## 11. Out of Scope（转入后续阶段或 Not Do）

- `create-project` skill → Phase 1 子目标 2
- `setup` skill 瘦身 → Phase 1 子目标 3
- 其他 skill 启动时注入 knowledge-core → 按需后续接入
- 暂存机制（low buffer）→ 以"强制升级为 medium"替代，Not Do
- subagent 调用方校验 → Not Do
- knowledge/ 内容填充 → 长期维护
- 并发写锁 → 超 scope

---

## 12. 交付后下一步

1. 本 spec 由用户审查通过后，`brainstorming` skill 交棒 `writing-plans` skill
2. writing-plans 产出 `docs/refactor/plans/2026-04-17-knowledge-keeper-implementation.md`
3. 实施阶段走 `subagent-driven-development`
4. 全部 Success Criteria 对号入座 + 原子 commit 后，继续 Phase 1 子目标 2（create-project）
