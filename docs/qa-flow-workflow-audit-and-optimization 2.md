# qa-flow 工作流全面审计与优化方案

> **文档性质**：基于快照的审计提案 + 当前主线复核结果。非历史规划（历史规划见 `docs/planning.md`）。  
> **原始审计快照**：`2875dd3 chore: snapshot current qa-flow state`（main 分支）  
> **当前复核时间**：2026-03-30（对当前 `main` 再次核验）  
> **审计范围**：CLAUDE.md、全部 Skills（6 个）、全部 step prompts、全部 scripts、tests、config、rules  
> **阅读方式**：以“当前仍待推进的问题”和“已闭环项复核”两部分理解本文；不要再把已闭环的历史 P0 视为当前缺陷。

---

## 目录

1. [背景与审计范围](#1-背景与审计范围)
2. [当前工作流架构总览](#2-当前工作流架构总览)
3. [权威来源矩阵（Source-of-Truth Matrix）](#3-权威来源矩阵source-of-truth-matrix)
4. [发现问题清单（按严重度分级）](#4-发现问题清单按严重度分级)
5. [P0 问题详述](#5-p0-问题详述)
6. [P1 问题详述](#6-p1-问题详述)
7. [P2 问题详述](#7-p2-问题详述)
8. [CLAUDE.md 主编排 + Skills 多智能体协作：优势、弱点与治理建议](#8-claudemd-主编排--skills-多智能体协作优势弱点与治理建议)
9. [Prompt 优化专项](#9-prompt-优化专项)
10. [脚本 / 测试 / 路径治理专项](#10-脚本--测试--路径治理专项)
11. [推荐实施顺序](#11-推荐实施顺序)
12. [验证与回归检查清单](#12-验证与回归检查清单)

---

## 1. 背景与审计范围

### 1.1 背景

qa-flow 是一个以 CLAUDE.md 为主编排入口、多个独立 Skill 为执行单元的 AI 驱动测试用例生成工作空间。自 `docs/planning.md` 中记录的第一版改进以来，工作流经历了多轮迭代（见 `docs/sessions/` 下的 session-1～7），期间一部分历史漂移已经在后续提交中被修复，另一部分治理问题仍然存在。

本文最初基于快照 `2875dd3` 撰写；本次又按当前 `main` 做了二次复核。因此本文的目标不再是简单罗列问题，而是：
- 客观描述每个问题的当前表现
- 给出可操作的改进建议
- 说明改进后预期达到的效果
- 区分“已经闭环的历史问题”和“当前仍值得投入的治理项”

### 1.2 审计范围

| 类别 | 文件/路径 | 审计内容 |
|------|-----------|----------|
| 主编排 | `CLAUDE.md` | 内容完整性、与下游的一致性 |
| Skill 定义 | `.claude/skills/*/SKILL.md` | 触发词、步骤定义、约定覆盖 |
| Step Prompts | `.claude/skills/test-case-generator/prompts/` | Prompt 质量、长度、内部引用 |
| 脚本 | `.claude/shared/scripts/`、`.claude/skills/*/scripts/` | 路径正确性、依赖管理 |
| 测试 | `.claude/tests/` | 测试通过率、断言与现实的偏差 |
| 配置 | `.claude/config.json` | 字段完整性、路径准确性 |
| 规则文档 | `.claude/rules/*.md` | 目录结构声明、实际目录对照 |
| 其他文档 | `README.md`、`docs/planning.md` | 已过时内容识别 |

---

## 2. 当前工作流架构总览

### 2.1 整体架构

```
用户指令
   │
   ▼
CLAUDE.md（主编排配置，由 Copilot CLI 加载）
   │  路由到对应 Skill
   ▼
Skill SKILL.md（编排逻辑定义）
   │  按步骤加载 step prompt
   ▼
step-*.md（具体步骤行为）
   │  调用共享脚本 / 子 Agent
   ├─► .claude/shared/scripts/（load-config, front-matter-utils 等）
   ├─► .claude/skills/*/scripts/（skill 专属脚本）
   └─► Sub-Agent（writer-subagent, reviewer-subagent）
```

### 2.2 核心 Skill 清单

| Skill | 编排复杂度 | 步骤数 | 子 Agent | 关键依赖 |
|-------|-----------|--------|----------|----------|
| `test-case-generator` | ★★★★★ | 13步（0-12） | writer × N + reviewer × 1 | jszip, lanhu-mcp, .repos/ |
| `prd-enhancer` | ★★★ | 4步 | 无 | 图片读取、front-matter |
| `archive-converter` | ★★★ | 3步 | 无 | jszip, convert-*.mjs |
| `xmind-converter` | ★★ | 1步 | 无 | jszip |
| `code-analysis-report` | ★★ | 2步 | 无 | git, reports/ |
| `using-qa-flow` | ★ | 路由+初始化 | 无 | lanhu-mcp-runtime.mjs |

### 2.3 工作流依赖图

```
test-case-generator 编排
  ├── [Step 0] 初始化 → .qa-state-{slug}.json
  ├── [Step 1] parse-input → 蓝湖URL/文件解析
  ├── [Step 2] req-elicit → PRD 补全
  ├── [Step 3] source-sync → .repos/ 分支验证
  ├── [Step 4] prd-formalize → 源码驱动形式化
  ├── [Step 5] prd-enhancer → Skill 调用
  ├── [Step 6] brainstorm → 历史用例检索 + 解耦分析
  ├── [Step 7] checklist → 用户确认
  ├── [Step 8] writer × N → 并行 subagent
  ├── [Step 9] reviewer → 质量阈值判断
  ├── [Step 10] xmind → JSON → .xmind
  ├── [Step 11] archive → Markdown 归档
  └── [Step 12] notify → 状态文件清理
```

---

## 3. 权威来源矩阵（Source-of-Truth Matrix）

> 明确“谁说了算”，是消除漂移的第一步。  
> **2026-03-30 复核说明**：下表已经按当前 `main` 重新核验，区分“历史已闭环”与“当前仍待治理”的偏差。

| 治理维度 | 当前权威 | 次级参考 | 当前偏差 / 说明 |
|---------|---------|---------|----------------|
| 全局入口与高层编排 | `CLAUDE.md` | `README.md` | `CLAUDE.md` 负责仓库级入口、边界和分流；`README.md` 仍应保持“导览”定位，避免承载新的硬 contract |
| Skill 级步骤 contract | `.claude/skills/*/SKILL.md` | `step-*.md`、`references/*` | `test-case-generator` 的 `.qa-state` 结构仍在 SKILL / reference / step prompt 三处维护 |
| 可配置路径与集成参数 | `.claude/config.json` | `load-config.mjs`、step prompts | `repoBranchMapping` 已进入 `config.json`，但 `getRepoBranchMappingPath()` 仍硬编码默认路径；`step-parse-input.md` 仍写死 cookie refresh 脚本路径 |
| 规则 contract | 按主题明确唯一权威文件 | skill-local `rules/*.md` 镜像 | 三套 skill-local 镜像均已声明“以全局为准”，但尚无自动同步；`xmind-output.md` 不能机械按“删除 local”处理 |
| Prompt 运行行为 | 各 `step-*.md` + `writer/reviewer-subagent.md` | `SKILL.md` §执行协议 | Writer / Reviewer prompt 仍各 291 行，且 step prompt 仍混有可配置路径信息 |
| 测试入口与守护 | `.claude/tests/*.mjs` + `.claude/tests/package.json` | `docs/` 内说明 | 13 个测试文件逐个运行均通过，但统一入口 `npm test` 仍因缺失 `run-all.mjs` 失败 |

---

## 4. 发现问题清单（按严重度分级）

> **P0** = 当前即会导致核心流程阻塞；**P1** = 已验证存在、值得优先治理的 contract/维护性问题；**P2** = 风险较低但会持续放大维护成本的问题。  
> 截至 2026-03-30 复核，本文初稿中的历史 P0 已基本闭环，当前更值得投入的是“入口 contract 半成品”“source-of-truth 未完全收口”和“prompt/rule 维护面过宽”。

### 4.1 当前未闭环问题汇总

| ID | 问题简述 | 受影响文件 | 当前影响 |
|----|---------|-----------|---------|
| P1-1 | `.claude/tests/package.json` 已声明统一入口，但 `run-all.mjs` 缺失 | `.claude/tests/package.json` | `cd .claude/tests && npm test` 直接失败，统一测试入口不可信 |
| P1-2 | `repoBranchMapping` 已进入 config，但消费链路未完全收口 | `.claude/config.json`、`.claude/shared/scripts/load-config.mjs` | 配置字段与脚本实现形成“双权威” |
| P1-3 | `.qa-state` contract 仍在 SKILL / reference / step prompt 三处维护 | `SKILL.md`、`intermediate-format.md`、`step-parse-input.md` | 状态字段更新时易产生语义漂移 |
| P1-4 | skill-local 规则镜像虽已加声明，但未建立自动同步 / 差异校验 | `.claude/rules/*.md`、`.claude/skills/*/rules/*.md` | `test-case-writing` 等文件仍会静默分叉 |
| P1-5 | Writer / Reviewer Subagent Prompt 仍各 291 行 | `writer-subagent.md`、`reviewer-subagent.md` | Agent 注意力稀释，改动面过大 |
| P1-6 | 多个 step prompt 仍硬编码可配置路径 | `step-parse-input.md`、`step-source-sync.md`、`step-req-elicit.md` | 脚本迁移时仍需多点改 prompt |
| P2-1 | README / 规则文档仍残留 `.claude/scripts/` 旧树结构 | `README.md`、`directory-naming.md` | 新成员或 Agent 仍可能去错误目录找脚本 |
| P2-2 | `docs/planning.md` 的“历史存档”属性不够显式 | `docs/planning.md` | 新成员容易把旧规划当现状 |
| P2-3 | Prompt 占位符 / 配置注入建议尚缺前置机制定义 | `SKILL.md`、step prompts、subagent prompts | 容易形成“文档提倡配置化，实际没人注入”的半成品 |

### 4.2 已闭环项（保留为审计轨迹）

| 原问题 | 当前状态 | 复核证据 |
|------|---------|---------|
| P0-1 / P0-2 / P0-3 | 已修复 | `test-load-config.mjs`、`test-lanhu-mcp-runtime.mjs` 当前已通过 |
| P0-4 / P0-5 | 已修复或原描述不成立 | `test-workflow-doc-validator.mjs` 已有 `existsSync(agentsRoot)` 防护，且不存在 `lanhuPlanPath` 引用 |
| P0-6 / 旧 P1-1 | 已修复 | `jszip` 已由 `.claude/tests/` 与 `.claude/shared/scripts/` 正常解析，相关测试逐个通过 |
| 旧 P1-3 / 旧 P1-7 / 旧 P2-4 | 已修复 | `CLAUDE.md` 与 `config.json` 已对齐当前实现 |

---

## 5. 已闭环问题复核（2026-03-30）

本轮对当前 `main` 的实测结果如下：

- `node .claude/tests/test-load-config.mjs` → 30/30 通过
- `node .claude/tests/test-lanhu-mcp-runtime.mjs` → 13/13 通过
- `node .claude/tests/test-workflow-doc-validator.mjs` → 11/11 通过
- `node .claude/tests/test-json-to-xmind.mjs` → 48/48 通过
- `node .claude/tests/test-archive-history-scripts.mjs` → 35/35 通过
- 13 个 `.claude/tests/*.mjs` 文件逐个执行全部通过

这意味着本文初稿里把多条历史问题仍标记为“当前 P0”的表述已经过时。当前更合理的治理顺序，不应再围绕“修复旧测试断言”展开，而应围绕：

1. 把**已经存在的 contract 补完整**（例如 `run-all.mjs`）
2. 把**已经进入配置的字段真正消费起来**（例如 `repoBranchMapping`）
3. 把**仍然多点维护的状态 / 规则 / prompt contract 收口**

---

## 6. 当前仍需推进的问题

### P1-1：统一测试入口 contract 仍是半成品（`run-all.mjs` 缺失）

**当前表现**
`.claude/tests/package.json` 已存在，并声明：
```json
"scripts": {
  "test": "node run-all.mjs"
}
```
但当前目录下并不存在 `run-all.mjs`。因此逐个运行测试文件是可行的，`cd .claude/tests && npm test` 仍会直接报 `MODULE_NOT_FOUND`。

**改进建议**

1. 补齐 `run-all.mjs`，顺序执行 13 个测试文件并聚合退出码。
2. 若短期不补 runner，则把 `package.json` 的 `test` 脚本改为现有可运行命令，避免“文档有入口、实际跑不起来”。
3. runner 设计上不要遇到首个失败就短路，需汇总全部文件结果，便于回归定位。

**改进后效果**
本地复核、CI 和文档说明可以共享同一个入口命令，测试 contract 才算真正闭环。

---

### P1-2：`repoBranchMapping` 已进入 config，但 `load-config.mjs` 仍硬编码默认路径

**当前表现**
`config.json` 已经包含：
```json
"repoBranchMapping": "config/repo-branch-mapping.yaml"
```
但 `.claude/shared/scripts/load-config.mjs` 中的 `getRepoBranchMappingPath()` 仍直接返回：
```js
return resolveWorkspacePath("config/repo-branch-mapping.yaml");
```

**问题本质**
字段已经进入权威配置，但消费链路没有真正使用它，导致“配置里有值”和“代码里另写一个默认值”并行存在。

**改进建议**

- **推荐**：让 `getRepoBranchMappingPath()` 优先消费 `config.repoBranchMapping`，仅在字段缺失时回退到默认值。
- **备选**：若明确不准备配置化，则删除 `config.json` 中该字段，并在文档中说明“此路径固定，不做配置项”。

**改进后效果**
避免双权威；后续若路径迁移，只需改一处。

---

### P1-3：`.qa-state` contract 仍在三处维护

**当前表现**
`.qa-state` 的结构和生命周期语义仍同时存在于：

1. `SKILL.md` 的执行协议描述
2. `references/intermediate-format.md` 的详细 schema/说明
3. `step-parse-input.md` 中的初始化与写回逻辑

其中，`SKILL.md` 已经开始引用 `intermediate-format.md`，说明治理方向是对的；但 `step-parse-input.md` 仍保留了较完整的状态结构说明，重复面仍然很大。

**改进建议**

1. 不建议简单把 `intermediate-format.md` 提升为“唯一权威”后让所有地方静态复制引用。
2. 更稳妥的做法是抽出一个独立的 `qa-state` schema/reference（可放在 `references/` 或 `shared/schemas/`）。
3. `SKILL.md` 保留高层语义和步骤边界；`step-parse-input.md` 只保留初始化/更新规则，字段结构改为引用 schema。

**改进后效果**
状态 contract 的“定义”和“执行”职责分离，未来加字段时不必同步改三份叙述文档。

---

### P1-4：skill-local 规则镜像已加声明，但尚未机械同步

**当前表现**
三套 skill-local 规则文件现在都已经加上了“以全局版本为准”的镜像说明，这是一个正向改进；但内容差异仍然存在，尤其：

- `test-case-writing.md` 的 skill-local 版本明显短于全局版，存在大段规则缺失
- `archive-format.md` 和 `xmind-output.md` 虽然也有镜像声明，但两边内容仍未做到自动对齐
- 对 `xmind-output.md` 不能机械执行“删除所有 local 副本”，因为当前 skill-local 版本更贴近脚本和测试 contract

**改进建议**

1. 按主题而不是一刀切地决定 authoritative source。
2. 为每组 rule 增加 diff check 或自动同步脚本，而不是只靠文件头声明。
3. 优先处理 `test-case-writing.md`，因为它对 Writer / Reviewer 的输出行为影响最大。

**改进后效果**
规则不再依赖“人记得同步”；同时避免把尚未对齐的全局旧规则误推回 skill 运行面。

---

### P1-5：Writer / Reviewer Subagent Prompt 仍各 291 行

**当前表现**
`writer-subagent.md` 和 `reviewer-subagent.md` 当前都为 291 行。虽然 `writer-subagent-reference.md` 已经存在，且 SKILL 也开始按章节精简加载，但主 prompt 仍过长。

**改进建议**

1. 把“必须每次都读”的核心 contract 压缩到主 prompt。
2. 把示例、扩展规则、边界样例继续沉到 reference 文件。
3. 这类改动必须和 `SKILL.md` 的 dispatch 逻辑一起原子更新，避免只改 prompt 不改加载逻辑。

**改进后效果**
减少注意力稀释；同时让 prompt 演进从“改一个大文件”变成“改核心 + 改参考”的局部修改。

---

### P1-6：Step prompt 仍硬编码可配置路径

**当前表现**
目前至少有三处 step prompt 仍直接写入可配置路径或固定配置文件位置：
```bash
python3 .claude/skills/using-qa-flow/scripts/refresh-lanhu-cookie.py
```

此外，`step-source-sync.md` 与 `step-req-elicit.md` 仍直接引用 `config/repo-branch-mapping.yaml`。

**问题本质**
这类路径已经属于 `config.json` 的治理范围；继续把它写死在 prompt 正文中，意味着路径迁移时要在配置、脚本、prompt 三处同时改。

**改进建议**

1. 真正的修复点应在编排/dispatch 层，而不是只在 prompt 里加一句“请从 config.json 读取”。
2. 若当前尚无占位符注入机制，则先在 SKILL.md 中定义“由调度层注入可配置路径”的规则，再逐步替换正文硬编码。
3. 在注入机制落地前，至少把硬编码路径集中到单一 step，而不要在多个 step 重复出现。

**改进后效果**
路径迁移的修改面显著缩小，也避免 Agent 因读取旧 prompt 而继续使用过期脚本路径。

---

## 7. P2 问题详述与落地边界

### P2-1：README / 目录规则文档仍残留 `.claude/scripts/` 旧树结构

**当前表现**
`README.md` 和 `directory-naming.md` 的部分目录树仍在用 `.claude/scripts/` 的旧表述，但当前真实结构已经拆成：

- `.claude/shared/scripts/`
- `.claude/skills/*/scripts/`

**改进建议**
更新目录树说明时，不要只替换路径名；要同时解释“共享脚本”和“skill 专属脚本”的职责边界。

**改进后效果**
新成员或 Agent 不会继续去不存在的旧目录中查找脚本。

---

### P2-2：`docs/planning.md` 的“历史存档”属性不够显式

**当前表现**
`docs/planning.md` 开头已经补了“历史规划存档”声明，但正文仍包含“唯一执行清单”等强执行语气。对首次进入仓库的人来说，仍可能把它误解为当前 roadmap。

**改进建议**
保留当前免责声明，同时把正文中的强执行语气（如“唯一执行清单”）改成历史上下文表述，并继续显式链接到本文作为当前审计视图。

**改进后效果**
把“历史过程”和“当前状态”分层，降低误读成本。

---

### P2-3：Prompt 配置化建议必须以后置能力为前提

**当前表现**
本文初稿曾提出统一使用 `{{变量名}}` 占位符、把 Reviewer 阈值移到 `config.json` 等建议；方向本身是合理的，但当前仓库里还没有一个明确的“占位符注入 / prompt 变量展开”机制。

**改进建议**

1. 先定义注入机制由谁执行：`SKILL.md`、共享脚本还是上层 orchestrator。
2. 在机制落地前，不要把未解析占位符直接写进主 prompt。
3. Reviewer 的 15% / 40% 阈值若要配置化，必须和实际注入路径一起设计，而不是先把值挪到 config。

**改进后效果**
避免出现“文档提倡配置化，但实际执行时没人把配置注入 prompt”的半成品状态。

---

## 8. CLAUDE.md 主编排 + Skills 多智能体协作：优势、弱点与治理建议

### 8.1 当前架构优势

| 优势 | 描述 |
|------|------|
| **低侵入性编排** | CLAUDE.md 作为系统 prompt 的一部分，无需代码变更即可调整工作流描述 |
| **Skill 隔离** | 每个 Skill 自包含（SKILL.md + prompts/ + rules/ + scripts/），互不干扰 |
| **步骤级断点续传** | `.qa-state.json` 机制使长流程在网络中断后可从断点恢复，显著提升用户体验 |
| **多模式支持** | 普通/快速/续传/模块重跑四种模式，同一 Skill 满足不同场景 |
| **源码集成** | 通过 `.repos/` + `config/repo-branch-mapping.yaml` 将 AI 生成的用例锚定到真实代码状态，减少幻觉 |
| **质量闸口** | Reviewer Agent 的 15%/40% 阈值机制提供量化的质量保障 |

### 8.2 当前架构弱点

| 弱点 | 具体表现 | 风险等级 |
|------|---------|---------|
| **状态合同多点维护** | `.qa-state` 结构仍在 SKILL / reference / step prompt 三处维护（P1-3） | ★★★★ |
| **Prompt 内容过载** | Writer / Reviewer 主 prompt 仍各 291 行（P1-5） | ★★★ |
| **统一入口存在半成品** | 测试文件可逐个通过，但 `npm test` 入口未真正闭环（P1-1） | ★★★ |
| **规则镜像未机械同步** | skill-local rules 已加声明，但内容仍可能与全局版分叉（P1-4） | ★★★★ |
| **文档与路径 contract 漂移** | README / 规则文档仍残留 `.claude/scripts/` 旧树结构（P2-1） | ★★ |
| **可配置项未完全配置化** | `repoBranchMapping` 与 prompt 内脚本路径仍有“配置已存在、实现未完全消费”现象（P1-2、P1-6） | ★★★ |

### 8.3 漂移点分析

**漂移类型 1：宣告性漂移（Declarative Drift）**
文档宣称存在某个能力/目录/字段，但实际未实现：
- `.claude/tests/package.json` 已声明统一入口，但 `run-all.mjs` 尚未落地
- README / `directory-naming.md` 中的 `.claude/scripts/` 旧树结构
- “配置化建议”已经写进方案，但实际注入机制尚未定义

**漂移类型 2：同步性漂移（Sync Drift）**
某个概念在多处定义，更新时未全部同步：
- `.qa-state` 合同（3处）
- 多套 skill-local 规则副本（test-case-writing / archive-format / xmind-output）
- `repoBranchMapping`（config 字段已存在，但 getter 仍硬编码）

**漂移类型 3：拼写/命名漂移（Naming Drift）**
同一概念在不同文件中命名不一致：
- `.claude/scripts` vs `.claude/shared/scripts`
- “step ID” 与 “agent/prompt 名称”在 README 架构图中容易混读

### 8.4 推荐治理模型

```
┌────────────────────────────────────────────────────────────┐
│                   治理层级（由上到下）                        │
├────────────────────────────────────────────────────────────┤
│ L1 全局编排权威：CLAUDE.md                                  │
│   → 负责仓库级入口、Skill 路由、全局边界与工作手册            │
│   → 保持“主编排”地位，但不重复展开每个 Skill 的细部 contract   │
├────────────────────────────────────────────────────────────┤
│ L2 Skill 编排权威：各 Skill 的 SKILL.md                      │
│   → 负责单 Skill 的步骤顺序、模式差异、依赖关系与调用约定      │
│   → 引用 state / rule contract，不在此处全文复制              │
├────────────────────────────────────────────────────────────┤
│ L3 执行细节：step-*.md / subagent prompts                    │
│   → 负责步骤行为、成功条件、异常处理、用户交互                │
│   → 可配置路径应由 dispatch 层注入，避免在正文中长期写死       │
├────────────────────────────────────────────────────────────┤
│ L4 配置权威：.claude/config.json + load-config.mjs           │
│   → 负责路径、快捷链接、integration 参数                      │
│   → 字段一旦进入 config，就应被真实消费，而不是保留并行硬编码   │
├────────────────────────────────────────────────────────────┤
│ L5 规则权威：按主题明确 authoritative source                 │
│   → 全局规则优先，但需允许 skill-local 在过渡期承载更新 contract │
│   → 关键不是“全部删 local”，而是“先对齐，再机械同步”           │
├────────────────────────────────────────────────────────────┤
│ L6 测试守护：.claude/tests/                                  │
│   → 验证 L1-L5 的声明与实现一致                               │
│   → 测试既要能逐个通过，也要有可信的统一入口                   │
└────────────────────────────────────────────────────────────┘
```

**核心原则**：每个事实只保留一个真实权威；其余文件可以摘要、引用、镜像，但不能长期各写一套。

---

## 9. Prompt 优化专项

### 9.1 当前 Prompt 体系概览

| 文件 | 行数 | 主要问题 |
|------|------|---------|
| `writer-subagent.md` | 291 | 过长，内容边界不清 |
| `reviewer-subagent.md` | 291 | 与 writer 等长，规则大量重复 |
| `step-parse-input.md` | ~280 | 硬编码脚本路径 + 状态初始化逻辑过重 |
| `step-brainstorm.md` | 68 | 适中 |
| `step-req-elicit.md` | ~380 | 体量已接近“子流程说明书”，且内含固定配置路径引用 |
| `SKILL.md` | 179 | 编排逻辑清晰，但执行协议部分过于详细 |

### 9.2 优化原则

1. **单一职责**：每个 prompt 文件只描述一件事（角色定义、行为规则、输出格式三者独立）
2. **引用代替复制**：规则、路径、schema 通过引用指向权威文件，不在 prompt 中重复定义
3. **占位符标准化（有前提）**：只有在编排器 / dispatch 层具备实际注入机制后，才统一使用 `{{变量名}}`；在机制落地前，不要把未解析占位符直接写进主 prompt
4. **长度控制**：
   - 编排 prompt（SKILL.md）：< 200 行
   - 步骤 prompt（step-*.md）：< 100 行
   - 子 Agent prompt（*-subagent.md）：核心部分 < 100 行，参考资料独立加载

### 9.3 Writer Subagent Prompt 重构方案

**当前结构（单文件 291 行）**：
```
writer-subagent.md
├── 角色定义（20行）
├── 编排器占位符说明（30行）
├── 用例编写规则（60行）  ← 与 rules/test-case-writing.md 重复
├── 输出 JSON schema（40行）  ← 与 intermediate-format.md 重复
├── 源码预提取指南（80行）
├── 历史用例引用（30行）
└── 自检清单（30行）
```

**推荐重构后结构**：
```
writer-subagent.md（核心，< 80行）
├── 角色定义
├── 输入说明（含编排器占位符）
├── 自检清单（5条核心项）
└── 引用声明：
    "输出格式：见 references/intermediate-format.md §modules"
    "用例规则：见 rules/test-case-writing.md"

writer-subagent-reference.md（参考资料，编排器按需注入）
├── 源码预提取示例
├── 历史用例检索逻辑
└── 常见边界案例
```

### 9.4 Reviewer Subagent Prompt 优化方向

当前 `reviewer-subagent.md` 同样 291 行，建议：
- 提取质量评分逻辑为独立参考节
- 若后续引入 reviewer 的配置注入机制，再将 15%/40% 阈值配置化；在此之前先保留显式 contract，避免出现“配置里有值但执行时没人注入”的半成品状态
- 阻断/警告的用户交互模板提取为独立的 `reviewer-escalation.md`

### 9.5 步骤 Prompt 统一模板

建议所有 `step-*.md` 遵循以下模板：

```markdown
<!-- step-id: <id> | delegate: <角色> -->
# Step <id>：<标题>

> 前置条件: `last_completed_step` == `"<上一步 ID>"`
> 快速模式: <执行|跳过|部分执行>
> DTStack 专属: <是|否>

## 输入

## 执行流程

## 成功条件

## 异常处理

## 状态写入
`last_completed_step: "<本步骤 ID>"`
```

当前多数 step prompt 已有类似结构，但不统一。标准化后 AI Agent 可更可靠地解析步骤边界。

---

## 10. 脚本 / 测试 / 路径治理专项

### 10.1 当前脚本 / 测试结构复核

```
.claude/
├── shared/scripts/                 ← 共享脚本
│   ├── load-config.mjs             ✅ 存在
│   ├── unify-directory-structure.mjs ✅ 已改为标准 import
│   └── package.json                ✅ 存在
├── skills/
│   ├── xmind-converter/scripts/    ← skill 专属脚本
│   ├── archive-converter/scripts/  ← skill 专属脚本
│   └── using-qa-flow/scripts/      ← lanhu 运行时脚本
└── tests/
    ├── package.json                ✅ 已存在
    ├── node_modules/jszip/         ✅ 已存在
    └── 13 个测试文件               ✅ 可逐个运行
       （但 `run-all.mjs` 缺失，统一入口尚未闭环）
```

### 10.2 路径引用一致性审查

| 路径 / contract | config / 代码 | 文档 / prompt / 测试 | 当前结论 |
|----------------|---------------|----------------------|---------|
| `cookieRefreshScript` / `repoBranchMapping` | `config.json` 已声明路径；`load-config.mjs` 仅部分消费 | 测试断言已对齐；`step-parse-input.md`、`step-source-sync.md`、`step-req-elicit.md` 仍保留字面量路径或固定配置文件位置 | **部分收口**：运行面正确，prompt 侧仍有维护成本 |
| shared scripts 目录 | 实际目录为 `.claude/shared/scripts/` | README / `directory-naming.md` 仍有 `.claude/scripts/` 旧树结构 | **未收口**：文档仍会误导读者去旧目录找脚本 |
| `repoBranchMapping` | 字段已进入 `config.json` | `load-config.mjs` 仍硬编码默认值 | **未收口**：字段存在但未被真实消费 |
| reports 输出目录 | `config.json` 中 `reports.bugs` / `reports.conflicts` | 当前文档与实现一致 | **已对齐** |

### 10.3 测试文件健康状况

| 维度 | 当前状态 | 说明 |
|------|---------|------|
| 单文件执行 | ✅ 13/13 全部通过 | 已逐个运行 `.claude/tests/*.mjs` 验证 |
| 统一入口 `npm test` | ❌ 当前失败 | `.claude/tests/package.json` 指向的 `run-all.mjs` 缺失 |
| 断言基线可信度 | ✅ 已恢复 | 当前主要问题不是断言失真，而是入口 contract 半成品 |

**结论**：qa-flow 当前的测试问题，已经从“多个测试根本跑不起来”，收敛为“统一入口缺失”。这属于治理问题，而不是功能性 P0。

### 10.4 依赖与入口治理路径

```
阶段 1（立即）：
  → 补齐 `.claude/tests/run-all.mjs`
  → 让 `npm test` 与逐个执行的结果保持一致

阶段 2（短期）：
  → 让 `load-config.mjs` 真正消费 `config.repoBranchMapping`
  → 清理 README / directory-naming 里的 `.claude/scripts/` 旧树结构

阶段 3（中期）：
  → 收口 prompt 中的可配置路径
  → 为 rule mirrors 增加差异校验 / 自动同步

阶段 4（长期，可选）：
  → 评估是否引入 npm workspaces 或其他统一依赖管理方案
  → 前提是先验证不会破坏现有 skill 独立 package 上下文
```

---

## 11. 推荐实施顺序

### 阶段 1：补齐现有 contract（优先）

| 顺序 | 任务 | 涉及文件 | 优先理由 |
|------|------|---------|---------|
| 1 | 补齐 `.claude/tests/run-all.mjs` 或修正 `npm test` 入口 | `.claude/tests/package.json`、新 runner 文件 | 统一入口当前直接失败，是最容易误导人的“半成品” |
| 2 | 让 `getRepoBranchMappingPath()` 消费 `config.repoBranchMapping` | `.claude/shared/scripts/load-config.mjs` | 去掉 config / 代码双权威 |
| 3 | 更新 README / `directory-naming.md` 的 `.claude/scripts/` 旧树结构 | `README.md`、`.claude/rules/directory-naming.md` | 清理新人 / Agent 最容易踩到的路径误导 |

### 阶段 2：收口多点维护的 contract

| 顺序 | 任务 | 涉及文件 | 优先理由 |
|------|------|---------|---------|
| 1 | 为 `.qa-state` 抽取单独 schema/reference，并让 step prompt 改为引用 | `SKILL.md`、`references/*`、`step-parse-input.md` | 直接影响续传与状态恢复正确性 |
| 2 | 为 `test-case-writing` / `archive-format` / `xmind-output` 建立差异校验或自动同步 | 全局 rules + skill-local rules | 规则漂移仍是当前最实质的长期风险 |
| 3 | 重新判定每组规则的 authoritative source，避免一刀切删除 local mirror | rules / SKILL.md | 避免把更贴近实现的一侧误删 |

### 阶段 3：Prompt 体积与可配置路径治理

| 顺序 | 任务 |
|------|------|
| 1 | 继续瘦身 Writer / Reviewer 主 prompt，保持 reference 文件按需加载 |
| 2 | 为 step prompt 引入真正的配置注入 / 占位符展开机制 |
| 3 | 在注入机制落地后，再把可配置路径和 reviewer 阈值逐步配置化 |

### 阶段 4：长期优化（有前提）

| 任务 |
|------|
| `docs/planning.md` 保留现有历史存档声明，并弱化正文中的强执行语气 |
| 评估统一依赖管理（如 npm workspaces）是否值得引入 |
| 在不破坏 skill 独立运行前提下，逐步减少重复依赖与重复文档 |

---

## 12. 验证与回归检查清单

### 12.1 当前基线验证

- [x] `node .claude/tests/test-load-config.mjs` 当前已通过
- [x] `node .claude/tests/test-lanhu-mcp-runtime.mjs` 当前已通过
- [x] `node .claude/tests/test-workflow-doc-validator.mjs` 当前已通过
- [x] `node .claude/tests/test-json-to-xmind.mjs` 当前已通过
- [x] `node .claude/tests/test-archive-history-scripts.mjs` 当前已通过
- [x] 13 个 `.claude/tests/*.mjs` 文件逐个运行全部通过
- [ ] `cd .claude/tests && npm test` 在补齐 `run-all.mjs` 后通过

### 12.2 架构漂移回归检查

- [ ] `CLAUDE.md` 仍保持全局入口 / 主编排手册定位
- [ ] `SKILL.md` 的步骤顺序、模式差异和 step ID 与实际 prompt 一致
- [ ] `README.md` 与 `directory-naming.md` 的目录树不再出现 `.claude/scripts/` 旧路径
- [ ] `config.json` 中进入权威配置的字段，都至少有一条真实消费链路
- [ ] `cookieRefreshScript` 不再在多个 step prompt 中重复硬编码

### 12.3 Prompt 优化验证

- [ ] Writer / Reviewer 主 prompt 的职责边界更清晰，reference 文件继续承载扩展规则
- [ ] 所有 step-*.md 保留稳定的 step ID 与成功 / 异常边界
- [ ] 若引入 `{{变量名}}`，确认 dispatch 层已具备注入能力
- [ ] prompt 中不出现“写进去了但没人会注入”的伪配置项

### 12.4 端到端功能回归

修改任何 SKILL.md、step-*.md 或 rules mirror 后，验证以下场景：

- [ ] 普通模式：完整执行测试用例生成主流程
- [ ] 快速模式：`--quick` 跳过 brainstorm 和 checklist
- [ ] 续传模式：中断后从正确的 `last_completed_step` 继续
- [ ] 蓝湖 URL 模式：lanhu-mcp 正常启动，Cookie 刷新流程正常
- [ ] 规则改动后：Writer 与 Reviewer 对同一用例格式不发生“互相打架”

### 12.5 文档一致性检查（可自动化）

基于 `test-workflow-doc-validator.mjs` 的现有框架，建议新增或扩展以下检查：

```js
assert(existsSync(resolve(repoRoot, ".claude/tests/package.json")),
  ".claude/tests/package.json 存在");
assert(existsSync(resolve(repoRoot, ".claude/tests/run-all.mjs")),
  "统一测试入口 run-all.mjs 已补齐");
assert(!readmeContent.includes(".claude/scripts/"),
  "README.md 不再引用旧的 .claude/scripts/ 目录");
assert(getRepoBranchMappingPath() === resolveWorkspacePath(loadConfig().repoBranchMapping),
  "repoBranchMapping 字段已被真实消费");
```

---

## 附录 A：关键文件快速索引

| 场景 | 应查找的文件 |
|------|-------------|
| 找某个模块的路径 | `.claude/config.json` §modules |
| 找 step ID 的标准定义 | `.claude/skills/test-case-generator/SKILL.md` §步骤顺序定义 |
| 找 `.qa-state.json` 字段含义 | `references/intermediate-format.md` §.qa-state.json |
| 找用例编写规则 | `.claude/rules/test-case-writing.md` |
| 找蓝湖集成配置 | `.claude/config.json` §integrations.lanhuMcp |
| 找源码仓库清单 | `.claude/config.json` §repos |
| 找历史改进规划 | `docs/planning.md`（历史参考） |
| 找当前审计状态 | 本文件 |

## 附录 B：漂移点速查表

| 漂移点 | 声明来源 | 实际状态 | 问题 ID |
|--------|---------|---------|--------|
| `.claude/tests` 统一入口 | `.claude/tests/package.json` | 已声明 `npm test`，但 `run-all.mjs` 缺失 | P1-1 |
| `repoBranchMapping` 权威链路 | `.claude/config.json` + `load-config.mjs` | 字段已存在，但 getter 仍硬编码默认值 | P1-2 |
| `.qa-state` 结构定义 | `SKILL.md` + `intermediate-format.md` + `step-parse-input.md` | 3 处分散维护 | P1-3 |
| rules mirror contract | 全局 rules + skill-local rules | 有镜像声明，但内容仍分叉 | P1-4 |
| 可配置脚本路径 | `config.json` + `step-parse-input.md` / `step-source-sync.md` / `step-req-elicit.md` | 运行面正确，prompt 侧仍写死路径或固定配置文件位置 | P1-6 |
| `.claude/scripts/` 旧目录树 | `README.md`、`directory-naming.md` | 实际目录已拆为 `shared/scripts` + `skills/*/scripts` | P2-1 |
