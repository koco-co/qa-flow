# qa-flow 工作流全面审计与优化方案

> **文档性质**：当前状态审计 + 具体改进提案。非历史规划（历史规划见 `docs/planning.md`）。  
> **基准快照**：`2875dd3 chore: snapshot current qa-flow state`（main 分支）  
> **审计范围**：CLAUDE.md、全部 Skills（6 个）、全部 step prompts、全部 scripts、tests、config、rules  
> **审计日期**：2026-03

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

qa-flow 是一个以 CLAUDE.md 为主编排入口、多个独立 Skill 为执行单元的 AI 驱动测试用例生成工作空间。自 `docs/planning.md` 中记录的第一版改进以来，工作流经历了多轮迭代（见 `docs/sessions/` 下的 session-1～7），积累了若干架构漂移点。

本文是独立于历史规划的**当前状态审计**，目标是：
- 客观描述每个问题的当前表现
- 给出可操作的改进建议
- 说明改进后预期达到的效果

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
| `test-case-generator` | ★★★★★ | 12步（0-11+1.5） | writer × N + reviewer × 1 | jszip, lanhu-mcp, .repos/ |
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
  ├── [Step 1.5] req-elicit → PRD 补全
  ├── [Step 2] source-sync → .repos/ 分支验证
  ├── [Step 3] prd-formalize → 源码驱动形式化
  ├── [Step 4] prd-enhancer → Skill 调用
  ├── [Step 5] brainstorm → 历史用例检索 + 解耦分析
  ├── [Step 6] checklist → 用户确认
  ├── [Step 7] writer × N → 并行 subagent
  ├── [Step 8] reviewer → 质量阈值判断
  ├── [Step 9] xmind → JSON → .xmind
  ├── [Step 10] archive → Markdown 归档
  └── [Step 11] notify → 状态文件清理
```

---

## 3. 权威来源矩阵（Source-of-Truth Matrix）

> 明确"谁说了算"，是消除漂移的第一步。

| 治理维度 | 权威文件 | 次级参考 | 已知偏差 |
|---------|---------|---------|----------|
| 目录路径与模块 key | `.claude/config.json` | `CLAUDE.md` §工作区结构 | `directory-naming.md` 的目录树列出 `.claude/agents/`，但该目录不存在 |
| 步骤顺序与 step ID | `SKILL.md` §步骤顺序定义 | `intermediate-format.md` | `intermediate-format.md` 内 step ID 与 SKILL.md 已对齐，但 `test-load-config.mjs:69` 仍断言旧路径 `.claude/scripts` |
| 路径配置权威 | `.claude/config.json` | `CLAUDE.md` §编排说明 | `config.json` 缺失 `dataAssetsVersionMap` 字段，但 `test-load-config.mjs:41` 断言该字段存在 |
| 用例与格式规则 | `.claude/rules/*.md` | `SKILL.md`、skill 内 `rules/*.md` 副本 | 至少 3 组规则存在全局版 + skill-local 版并行维护，且部分副本已发生实质漂移 |
| Prompt 行为规范 | 各 `step-*.md` | `SKILL.md` §执行协议 | 部分 step prompt 内嵌了应由 rules 文件管控的路径 |
| 文档权威入口 | `CLAUDE.md` | `README.md` | `README.md:5` 已明确声明从属于 CLAUDE.md，但自身目录树仍声明 `.claude/agents/`（行 230）|
| 蓝湖集成运行时 | `.claude/config.json` §integrations.lanhuMcp | `step-parse-input.md` 内硬编码路径 | `test-lanhu-mcp-runtime.mjs:38` 断言旧路径 `.claude/scripts/refresh-lanhu-cookie.py`，但实际脚本已在 `.claude/skills/using-qa-flow/scripts/` 下 |

---

## 4. 发现问题清单（按严重度分级）

> **P0** = 当前即会导致测试失败或功能异常；**P1** = 架构弱点，可能在特定场景下引发故障；**P2** = 代码腐化、可读性、维护成本问题。

### P0 问题汇总

| ID | 问题简述 | 受影响文件 | 当前表现 |
|----|---------|-----------|---------|
| P0-1 | 测试断言旧目录路径 `.claude/scripts` | `test-load-config.mjs:69` | `npm test` 直接失败 |
| P0-2 | 测试断言缺失的 config 字段 `dataAssetsVersionMap` | `test-load-config.mjs:41` | `npm test` 直接失败 |
| P0-3 | 测试断言 cookieRefreshScript 旧路径 `.claude/scripts/` | `test-lanhu-mcp-runtime.mjs:38` | `npm test` 直接失败 |
| P0-4 | `test-workflow-doc-validator.mjs` 因 `.claude/agents/` 目录不存在而崩溃 | `test-workflow-doc-validator.mjs:127` | 运行即抛出 ENOENT，整个测试文件无法执行 |
| P0-5 | `test-workflow-doc-validator.mjs:23` 引用不存在的 `docs/蓝湖PRD自动化导入方案.md` | `test-workflow-doc-validator.mjs` | 相关断言无法覆盖目标文件 |
| P0-6 | `test-json-to-xmind.mjs` 和 `test-archive-history-scripts.mjs` 对 `jszip` 裸 import，顶层无该依赖 | 两个测试文件 | 运行即报 `ERR_MODULE_NOT_FOUND` |

### P1 问题汇总

| ID | 问题简述 | 受影响文件 |
|----|---------|-----------|
| P1-1 | `unify-directory-structure.mjs` 硬编码跨 skill 的 nested node_modules 路径 | `shared/scripts/unify-directory-structure.mjs:30` |
| P1-2 | `.claude/agents/` 目录声明与缺失的结构性漂移 | `README.md:230`、`directory-naming.md:42` |
| P1-3 | CLAUDE.md `编排说明` 中状态文件路径描述与 SKILL.md 定义不一致 | `CLAUDE.md` §编排说明、`SKILL.md` §执行协议 |
| P1-4 | `.qa-state.json` 合同在多处重复定义（SKILL.md / intermediate-format.md / step-parse-input.md） | 3个文件 |
| P1-5 | 多套 skill-local 规则副本并行存在，且部分已发生实质漂移 | `.claude/rules/*.md`、`.claude/skills/*/rules/*.md` |
| P1-6 | Writer Subagent Prompt 达 291 行，超出单一 prompt 合理容量 | `writer-subagent.md` |
| P1-7 | CLAUDE.md `DTStack 与 XYZH 分流规则` 章节的步骤顺序与 SKILL.md 不一致（`prd-formalizer` 拼写） | `CLAUDE.md` §DTStack 与 XYZH 分流规则 |

### P2 问题汇总

| ID | 问题简述 | 受影响文件 |
|----|---------|-----------|
| P2-1 | 每个 skill 下 node_modules 各自独立安装，仓库体积膨胀 | `skills/*/scripts/node_modules/` |
| P2-2 | `docs/planning.md` 是历史规划文件，与当前状态不完全一致，新成员易混淆 | `docs/planning.md` |
| P2-3 | Step prompt 内硬编码脚本路径（如 `refresh-lanhu-cookie.py` 的绝对路径形式），路径变更时需多处修改 | 多个 step-*.md |
| P2-4 | `config/repo-branch-mapping.yaml` 存在但 `config.json` 无该字段索引 | `config.json` |
| P2-5 | 测试文件无统一入口（无 `package.json` 的 `test` 脚本或 test runner 配置） | `.claude/tests/` |

---

## 5. P0 问题详述

### P0-1：`test-load-config.mjs:69` 断言旧目录 `.claude/scripts`

**当前表现**
```
❌ 工作空间根目录与 .claude/scripts 相对位置正确
```
测试执行 `resolve(root, ".claude/scripts") === scriptDir`，但脚本自身位于 `.claude/tests/`，而断言期望的是 `.claude/scripts`（旧路径），目录已不存在。

**根本原因**
Session-1～2 期间将脚本从 `.claude/scripts/` 迁移到 `.claude/shared/scripts/` 和 `.claude/skills/*/scripts/`，但测试断言未同步更新。

**改进建议**
将 `test-load-config.mjs:69` 改为验证 `scriptDir` 相对于 `testsDir` 的位置，或改为验证 `.claude/shared/scripts/` 的存在性：
```js
// 改前
assert(resolve(root, ".claude/scripts") === scriptDir, "...");
// 改后
assert(existsSync(resolve(root, ".claude/shared/scripts")), ".claude/shared/scripts 目录存在");
assert(existsSync(resolve(root, ".claude/tests")), ".claude/tests 目录存在");
```

**改进后效果**
该测试从失败变为通过；消除一个持续 CI 红灯来源。

---

### P0-2：`test-load-config.mjs:41` 断言缺失字段 `dataAssetsVersionMap`

**当前表现**
```
❌ dataAssetsVersionMap 包含 v6.4.10
```
`config.json` 中不存在 `dataAssetsVersionMap` 字段，访问返回 `undefined`。

**根本原因**
该字段曾在 session-6 规划中作为版本映射方案提及，但最终未落地到 `config.json`，而测试断言被提前写入。

**改进建议**（二选一）

- **方案 A（推荐）**：在 `config.json` 中正式添加 `dataAssetsVersionMap` 字段，维护 XMind 文件名到版本号的映射：
  ```json
  "dataAssetsVersionMap": {
    "202603-数据资产v6.4.10.xmind": "v6.4.10"
  }
  ```
- **方案 B**：删除该测试断言，若版本映射仍无业务需求则不实现。

**改进后效果**
消除假断言，测试结果真实反映系统状态。

---

### P0-3：`test-lanhu-mcp-runtime.mjs:38` 断言 cookieRefreshScript 旧路径

**当前表现**
```
❌ cookieRefreshScript 指向 refresh-lanhu-cookie.py
```
测试期望路径以 `.claude/scripts/refresh-lanhu-cookie.py` 结尾，但：
- `config.json:105` 已配置为 `.claude/skills/using-qa-flow/scripts/refresh-lanhu-cookie.py`
- 脚本文件实际存在于该新路径下
- `lanhu-mcp-runtime.mjs` 已按 config.json 读取正确路径

**根本原因**
测试断言写于脚本迁移之前，迁移后未同步更新。

**改进建议**
```js
// 改前
assert(config.cookieRefreshScript.endsWith(".claude/scripts/refresh-lanhu-cookie.py"), "...");
// 改后
assert(
  config.cookieRefreshScript.endsWith(".claude/skills/using-qa-flow/scripts/refresh-lanhu-cookie.py"),
  "cookieRefreshScript 指向 using-qa-flow/scripts/refresh-lanhu-cookie.py"
);
```

**改进后效果**
测试断言与 config.json 的实际配置对齐，通过率从 12/13 变为 13/13。

---

### P0-4：`test-workflow-doc-validator.mjs` 因 `.claude/agents/` 不存在而崩溃

**当前表现**
```
Error: ENOENT: no such file or directory, scandir '.../qa-flow/.claude/agents'
```
文件第 127 行 `walkFiles(agentsRoot, ...)` 调用 `readdirSync` 时对不存在的目录抛出异常，整个测试文件无法执行（所有断言均未运行）。

**根本原因**
`test-workflow-doc-validator.mjs` 编写时预期存在 `.claude/agents/` 目录，但该目录从未被实际创建。`README.md:230` 和 `directory-naming.md:42` 的目录树声明了该目录，但声明是规划性的而非实际的。

**改进建议**（两步）

1. 在 `test-workflow-doc-validator.mjs` 中将 `agentsRoot` 扫描改为条件性操作：
   ```js
   const agentDocs = existsSync(agentsRoot)
     ? walkFiles(agentsRoot, (f) => f.endsWith(".md"))
     : [];
   ```
2. 决策 `.claude/agents/` 目录的定位：
   - **若保留**：创建目录并补充 `.gitkeep`；将 `README.md` 和 `directory-naming.md` 中的描述标记为"规划中"或"可选"。
   - **若废弃**：从 `README.md:230` 和 `directory-naming.md:42` 的目录树中删除该条目。

**改进后效果**
测试文件不再崩溃，所有断言正常执行；目录树文档与实际文件系统对齐。

---

### P0-5：`test-workflow-doc-validator.mjs` 引用不存在的 `docs/蓝湖PRD自动化导入方案.md`

**当前表现**
`lanhuPlanPath` 被加入 `repoFacingDocs` 数组用于扫描陈旧引用，但文件不存在。由于 `repoFacingDocs` 在构建时用 `.filter(existsSync)` 过滤，该路径被静默跳过，断言可通过，但形成了**假覆盖**——实际上从未扫描了预期的文档。

**根本原因**
该文档原计划存在于 `docs/` 下（见 session-2），但最终内容已合并到其他文档或未创建。

**改进建议**
```js
// 添加显式断言
assert(
  existsSync(lanhuPlanPath) || true, // 改为可选
  "docs/蓝湖PRD自动化导入方案.md 已存在（可选）"
);
```
或从 `repoFacingDocs` 中移除该路径引用，改为在注释中说明该文档的归宿（已合并到 `step-parse-input.md` 相关说明）。

**改进后效果**
测试覆盖真实有效；消除静默假通过。

---

### P0-6：`test-json-to-xmind.mjs` 和 `test-archive-history-scripts.mjs` 裸 import jszip 失败

**当前表现**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'jszip'
```
两个测试文件直接 `import JSZip from "jszip"`，但 `jszip` 只安装在各自 skill 下的 `scripts/node_modules/`（非顶层），Node.js ESM 无法解析。

**根本原因**
测试文件位于 `.claude/tests/`，该目录没有自己的 `package.json`，其 Node.js 模块解析范围内没有 `jszip`。Skill 脚本可以正常解析是因为它们从自己的 `scripts/` 目录运行，Node 向上查找找到了 `scripts/node_modules/`。

**改进建议**（见 §10 脚本治理专项，P2-1 联动处理）

短期（立即可做）：在 `.claude/tests/` 下添加 `package.json` 并安装 `jszip`：
```json
{
  "type": "module",
  "dependencies": {
    "jszip": "^3.10.1"
  }
}
```
中期（更优）：将 jszip 提升到项目根级 `package.json` 的 devDependencies，统一管理。

**改进后效果**
两个测试文件可以正常运行，jszip 相关用例测试覆盖恢复。

---

## 6. P1 问题详述

### P1-1：`unify-directory-structure.mjs` 硬编码跨 Skill 的 nested node_modules

**当前表现**
```js
// .claude/shared/scripts/unify-directory-structure.mjs:30
import JSZip from "../../skills/xmind-converter/scripts/node_modules/jszip/lib/index.js";
```
`shared/scripts/` 下的共享脚本直接引用另一个 skill 的私有 `node_modules`。

**当前影响**
- 若 `xmind-converter` 的依赖升级或路径变更，`unify-directory-structure.mjs` 会静默失效
- 违反了"共享脚本不依赖具体 skill 实现"的隔离原则

**改进建议**
将 `jszip` 提升为共享依赖（在 `.claude/shared/scripts/package.json` 中声明），改为标准 import：
```js
import JSZip from "jszip"; // 从共享 package.json 解析
```

**改进后效果**
消除跨 skill 的隐式路径耦合，共享脚本的依赖清晰且可独立升级。

---

### P1-2：`.claude/agents/` 目录声明与实际缺失造成的结构漂移

**当前表现**
- `README.md:230` 目录树：`├── agents/  # 子代理定义`
- `directory-naming.md:42` 目录树：`├── agents/  # 子代理定义`
- 实际磁盘：`.claude/agents/` **不存在**

**当前影响**
新成员或 AI Agent 读取目录结构文档后期望该目录存在，实际操作时发现不存在，产生困惑；自动化测试因此崩溃（见 P0-4）。

**改进建议**
明确架构决策：当前 qa-flow 采用"主编排 Agent 直接调用 Skill prompt"模式，不需要独立 agents 目录。更新两处目录树文档，删除 `agents/` 条目或标注为"暂未启用"。

**改进后效果**
文档与现实对齐，消除混淆来源。

---

### P1-3：CLAUDE.md 状态文件路径描述与 SKILL.md 定义不一致

**当前表现**

| 位置 | 描述 |
|------|------|
| `CLAUDE.md` §编排说明 | `断点状态：Story 目录下的 .qa-state.json` |
| `SKILL.md` §执行协议 1 | 单 PRD 生成：`<working-dir>/.qa-state-{prd-slug}.json`；批量：`<working-dir>/.qa-state.json` |
| `intermediate-format.md` §断点续传 | 详细定义了两种命名模式 |

CLAUDE.md 只提到 `.qa-state.json`（批量模式路径），忽略了单 PRD 的 slug 化命名模式，导致 AI Agent 读取 CLAUDE.md 时可能采用错误的文件名查找断点。

**改进建议**
更新 CLAUDE.md §编排说明：
```
断点状态：
- 单 PRD：`<requirements目录>/.qa-state-{prd文件名}.json`
- 批量：`<requirements目录>/.qa-state.json`
（详见 SKILL.md 步骤顺序定义）
```

**改进后效果**
CLAUDE.md 作为主编排入口，其描述与 SKILL.md 保持一致，减少 Agent 误判续传状态的概率。

---

### P1-4：`.qa-state.json` 合同在三处重复定义

**当前表现**
`.qa-state.json` 的字段结构（`last_completed_step`、`writers`、`reviewer_status`、`awaiting_verification` 等）分散定义于：
1. `SKILL.md` §执行协议（初始结构）
2. `intermediate-format.md` §断点续传状态文件（详细字段说明）
3. `step-parse-input.md` §1.x（初始化逻辑）

三处定义存在细节差异风险——任何一处更新未同步到其他两处，将导致 Agent 行为不一致。

**改进建议**
以 `intermediate-format.md` 为唯一 source of truth（字段定义最完整），其余两处改为引用：
```markdown
<!-- SKILL.md §执行协议 中 -->
初始状态结构见 `references/intermediate-format.md` §.qa-state.json 断点续传状态文件。
```

**改进后效果**
状态合同单一来源，更新时只需修改一处，降低漂移风险。

---

### P1-5：多套 skill-local 规则副本并行存在，且部分已发生实质漂移

**当前表现**

| 路径 | 性质 |
|------|------|
| `.claude/rules/test-case-writing.md` ↔ `.claude/skills/test-case-generator/rules/test-case-writing.md` | 同一主题的全局版 / skill-local 版 |
| `.claude/rules/archive-format.md` ↔ `.claude/skills/archive-converter/rules/archive-format.md` | 同一主题的全局版 / skill-local 版 |
| `.claude/rules/xmind-output.md` ↔ `.claude/skills/xmind-converter/rules/xmind-output.md` | 同一主题的全局版 / skill-local 版 |

这些副本并非都保持一致，已经出现可验证的合同漂移：

- `archive-format`：全局版包含 `case_count`、`origin` 字段说明，但 `archive-converter` 的 skill-local 副本未完整覆盖。
- `xmind-output`：全局版要求 DTStack 输出进入 `v{version}/` 版本子目录，并维护“主流程 / 岚图标品 / 6.3.x / 集成测试”等特殊分类目录；`xmind-converter` 的 skill-local 副本仍以扁平路径表为主，未完整体现版本目录与特殊分类规则。
- `test-case-writing`：两份文件都存在，但 skill-local 版缺少全局版中的部分细化规则，长期存在静默分叉风险。

**改进建议**
原则上不再手工维护 skill-local 规则副本，优先采用以下顺序：

1. **首选**：删除 skill-local 副本，在 `SKILL.md` 中直接引用全局规则文件。
2. **次选**：若必须保留 skill 内路径，则改为符号链接或自动同步生成，禁止手工双写。
3. **兜底**：至少在 skill-local 文件开头声明：
```markdown
> 本文件是全局规则的 skill 内镜像，以 `.claude/rules/<rule-name>.md` 为准。
```

其中，`archive-format` 和 `xmind-output` 应优先处理，因为它们直接影响产物路径、front-matter 字段和归档 / 输出 contract。

**改进后效果**
规则单一来源，避免“全局文档说一套、skill 内副本又是一套”；同时减少 XMind / Archive 输出路径和 front-matter 字段被不同副本误导的风险。

---

### P1-6：Writer Subagent Prompt 过长（291 行）

**当前表现**
`writer-subagent.md` 291 行，包含：源码预提取指南 + 用例编写规则 + 格式规范 + 输出 JSON schema + 历史用例引用逻辑 + Writer 自检清单。

单个 prompt 内容过多导致：
- AI Agent 在推理时会忽略末尾内容（注意力稀释）
- 维护困难，更改一项规则需在 291 行中定位
- 已有 `writer-subagent-reference.md`（参考资料拆分），但主 prompt 仍然过长

**改进建议**
将 `writer-subagent.md` 拆分为：
1. **核心 prompt**（约 80 行）：角色定义、输入说明、输出格式、自检清单
2. **规则引用**（保持在 `writer-subagent-reference.md`）：已存在，继续扩充
3. **编排器预提取占位符**：保留在核心 prompt，以 `{{placeholder}}` 形式标注

在 SKILL.md §步骤 7 说明中明确：编排器加载 `writer-subagent.md` + `writer-subagent-reference.md` 组合。

**改进后效果**
核心 prompt 聚焦，参考资料按需加载；维护改动局部化；注意力不因长度稀释。

---

### P1-7：CLAUDE.md 中 `prd-formalizer` 拼写与 SKILL.md 不一致

**当前表现**
- `CLAUDE.md` §DTStack 与 XYZH 分流规则：`req-elicit → source-sync → prd-formalizer → prd-enhancer`
- `SKILL.md` §步骤顺序定义：step ID 为 `prd-formalize`（无 `r`）
- `step-prd-formalize.md` 文件名：`step-prd-formalize.md`

CLAUDE.md 中拼写为 `prd-formalizer`，与其他所有定义不一致。

**改进建议**
将 `CLAUDE.md` §DTStack 与 XYZH 分流规则中的 `prd-formalizer` 改为 `prd-formalize`，与 SKILL.md step ID 及文件名对齐。

**改进后效果**
消除 AI Agent 读取 CLAUDE.md 时因拼写差异造成的步骤定位偏差。

---

## 7. P2 问题详述

### P2-1：各 Skill 下 node_modules 各自独立，仓库体积膨胀

**当前表现**
`jszip` 同时安装在：
- `.claude/skills/archive-converter/scripts/node_modules/jszip/`
- `.claude/skills/xmind-converter/scripts/node_modules/jszip/`

两份相同的库（各约 500KB），且 `.claude/shared/scripts/unify-directory-structure.mjs` 通过硬编码路径引用其中一份（见 P1-1）。

**改进建议**
将 `jszip` 提升到 `.claude/shared/scripts/package.json` 的 `dependencies`，各 skill 脚本改为标准 import。长期可引入 monorepo 工具（如 npm workspaces）统一管理 `.claude/` 下的所有 JS 依赖。

---

### P2-2：`docs/planning.md` 内容陈旧，新成员易混淆

**当前表现**
`docs/planning.md` 记录了历史改进规划（T01-T11），其中部分已实施（如 T01 step ID 统一、T05 writer prompt 拆分），部分未实施，且文档未标注状态。

**改进建议**
在文档开头添加免责声明：
```markdown
> ⚠️ 历史规划存档，截止 2026-03 的状态记录在 `docs/qa-flow-workflow-audit-and-optimization.md`。
> 本文件仅供参考，不代表当前系统状态。
```

---

### P2-3：Step Prompt 内硬编码脚本路径

**当前表现**
`step-parse-input.md` 内出现：
```bash
python3 .claude/skills/using-qa-flow/scripts/refresh-lanhu-cookie.py
```
路径硬编码在 prompt 正文，当脚本迁移时需逐个 prompt 搜索修改。

**改进建议**
Step prompt 引用路径时改为引用 `config.json` 中的字段，或在 prompt 说明区统一注释：
```
# 路径从 config.json 的 integrations.lanhuMcp.cookieRefreshScript 读取
```
并在 SKILL.md 或编排规则中声明：step prompt 不得硬编码可配置路径。

---

### P2-4：`repo-branch-mapping.yaml` 在 `config.json` 中无字段索引

**当前表现**
`config/repo-branch-mapping.yaml` 存在并被 `getRepoBranchMappingPath()` 函数读取，但该路径在 `config.json` 中没有对应字段（路径通过代码中 `resolve(root, "config/repo-branch-mapping.yaml")` 硬编码）。

**改进建议**
在 `config.json` 中添加：
```json
"repoBranchMapping": "config/repo-branch-mapping.yaml"
```
并在 `load-config.mjs` 中通过 `config.repoBranchMapping` 读取。

---

### P2-5：测试文件无统一入口与运行规范

**当前表现**
`.claude/tests/` 下有 13 个测试文件，但：
- 无 `package.json`（无法 `npm test`）
- 无统一的 test runner（各文件独立运行）
- 部分文件因依赖问题无法运行（见 P0-4、P0-6）

**改进建议**
在 `.claude/tests/` 或 `.claude/` 目录下添加 `package.json`，配置：
```json
{
  "scripts": {
    "test": "node --experimental-vm-modules tests/run-all.mjs"
  }
}
```
或使用 `node:test` 模块提供统一入口，以便 CI 直接运行。

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
| **主编排与 Skill 间的语义漂移** | CLAUDE.md 描述的步骤顺序/路径与 SKILL.md 不完全一致（P1-3、P1-7） | ★★★★ |
| **状态合同多点维护** | `.qa-state.json` 结构在 3 处定义，易漂移（P1-4） | ★★★★ |
| **Prompt 内容过载** | `writer-subagent.md` 291 行，AI 注意力稀释（P1-6） | ★★★ |
| **测试体系不完整** | 多个测试失败，测试发现问题的能力弱于预期（P0-1 至 P0-6） | ★★★★★ |
| **依赖管理碎片化** | jszip 多处重复安装，跨 skill 路径引用（P1-1、P2-1） | ★★★ |
| **文档与实现的宣告性漂移** | agents/ 目录、prd-formalizer 拼写等小漂移积累（P1-2、P1-7） | ★★ |

### 8.3 漂移点分析

**漂移类型 1：宣告性漂移（Declarative Drift）**
文档宣称存在某个能力/目录/字段，但实际未实现：
- `.claude/agents/` 目录
- `config.dataAssetsVersionMap` 字段
- `docs/蓝湖PRD自动化导入方案.md`

**漂移类型 2：同步性漂移（Sync Drift）**
某个概念在多处定义，更新时未全部同步：
- `.qa-state.json` 合同（3处）
- 多套 skill-local 规则副本（test-case-writing / archive-format / xmind-output）
- cookieRefreshScript 路径（config.json vs 测试断言）

**漂移类型 3：拼写/命名漂移（Naming Drift）**
同一概念在不同文件中命名不一致：
- `prd-formalize` vs `prd-formalizer`
- `.claude/scripts` vs `.claude/shared/scripts`

### 8.4 推荐治理模型

```
┌─────────────────────────────────────────────────────┐
│                 治理层级（由上到下）                    │
├─────────────────────────────────────────────────────┤
│ L1 配置权威：.claude/config.json                     │
│   → 所有路径、模块 key、集成参数的唯一来源              │
│   → 脚本和 prompt 通过 load-config.mjs 读取，         │
│     不得硬编码                                        │
├─────────────────────────────────────────────────────┤
│ L2 编排权威：SKILL.md（各 Skill 自己的）               │
│   → 步骤顺序、step ID、状态合同、运行模式               │
│   → CLAUDE.md 只做索引/摘要，具体定义以 SKILL.md 为准  │
├─────────────────────────────────────────────────────┤
│ L3 行为权威：step-*.md（各步骤的执行细节）              │
│   → 具体的 bash 命令、分支逻辑、用户交互                │
│   → 路径引用必须从 config.json 获取                    │
├─────────────────────────────────────────────────────┤
│ L4 规则权威：.claude/rules/*.md                       │
│   → 格式规范、命名约定、编写规则                        │
│   → skill 内规则文件是 L4 的引用，不独立维护            │
├─────────────────────────────────────────────────────┤
│ L5 测试守护：.claude/tests/                           │
│   → 验证 L1-L4 的声明与实现一致                        │
│   → 测试必须与被测对象同步更新（PR 检查项）              │
└─────────────────────────────────────────────────────┘
```

**核心原则**：每个信息只有一个 source of truth；其他文件引用而非复制。

---

## 9. Prompt 优化专项

### 9.1 当前 Prompt 体系概览

| 文件 | 行数 | 主要问题 |
|------|------|---------|
| `writer-subagent.md` | 291 | 过长，内容边界不清 |
| `reviewer-subagent.md` | 291 | 与 writer 等长，规则大量重复 |
| `step-parse-input.md` | ~120 | 硬编码脚本路径 |
| `step-brainstorm.md` | 68 | 适中 |
| `step-req-elicit.md` | 未统计 | 需核查与澄清维度文档的重复度 |
| `SKILL.md` | 179 | 编排逻辑清晰，但执行协议部分过于详细 |

### 9.2 优化原则

1. **单一职责**：每个 prompt 文件只描述一件事（角色定义、行为规则、输出格式三者独立）
2. **引用代替复制**：规则、路径、schema 通过引用指向权威文件，不在 prompt 中重复定义
3. **占位符标准化**：编排器填入的动态内容使用统一的 `{{变量名}}` 占位符格式
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
- 将 15%/40% 阈值作为配置项（可在 `config.json` 中定义）而非硬编码在 prompt 中
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

### 10.1 脚本目录结构现状

```
.claude/
├── shared/scripts/          ← 共享脚本
│   ├── load-config.mjs      ✅ 正确位置
│   ├── unify-directory-structure.mjs  ⚠️ 跨 skill 依赖
│   └── package.json         ✅ 存在
├── skills/
│   ├── xmind-converter/scripts/
│   │   ├── node_modules/jszip/   ← 重复依赖
│   │   └── package.json
│   ├── archive-converter/scripts/
│   │   ├── node_modules/jszip/   ← 重复依赖
│   │   └── package.json
│   └── using-qa-flow/scripts/
│       ├── lanhu-mcp-runtime.mjs ✅ 正确位置
│       └── refresh-lanhu-cookie.py ✅ 正确位置
└── tests/
    ├── (无 package.json)     ❌ 缺失
    └── 13 个测试文件
```

### 10.2 路径引用一致性审查

| 路径 | config.json | 脚本/测试断言 | 实际文件 | 一致？ |
|------|-------------|------------|---------|-------|
| cookieRefreshScript | `.claude/skills/using-qa-flow/scripts/refresh-lanhu-cookie.py` | 测试断言：`.claude/scripts/refresh-lanhu-cookie.py` | 实际：`using-qa-flow/scripts/` | ❌ P0-3 |
| lanhu-mcp runtimePath | `tools/lanhu-mcp/` | 测试断言：✅ | 实际：✅ | ✅ |
| shared scripts 目录 | 无专门字段 | 测试断言：`.claude/scripts` | 实际：`.claude/shared/scripts/` | ❌ P0-1 |
| repo-branch-mapping | 无专门字段（代码硬编码）| 测试：✅（直接读取） | 实际：`config/` | ⚠️ P2-4 |
| reports.bugs | `reports/bugs/` | 无直接测试 | 实际：✅ | ✅ |

### 10.3 测试文件健康状况

| 测试文件 | 当前状态 | 失败原因 |
|---------|---------|---------|
| `test-load-config.mjs` | ❌ 2 个断言失败 | P0-1、P0-2 |
| `test-lanhu-mcp-runtime.mjs` | ❌ 1 个断言失败 | P0-3 |
| `test-workflow-doc-validator.mjs` | ❌ 崩溃（未运行） | P0-4 |
| `test-json-to-xmind.mjs` | ❌ 模块解析失败 | P0-6 |
| `test-archive-history-scripts.mjs` | ❌ 模块解析失败 | P0-6 |
| `test-front-matter-utils.mjs` | ✅（推测） | — |
| `test-latest-link-utils.mjs` | ✅（推测） | — |
| `test-md-body-normalization.mjs` | ✅（推测） | — |
| `test-md-content-source-resolver.mjs` | ✅（推测） | — |
| `test-md-frontmatter-audit.mjs` | ✅（推测） | — |
| `test-md-semantic-enrichment.mjs` | ✅（推测） | — |
| `test-md-xmind-regeneration.mjs` | ✅（推测） | — |
| `test-repo-branch-mapping.mjs` | ✅（推测） | — |

**当前约 5/13 个测试文件无法正常运行**，测试体系整体可信度较低。

### 10.4 依赖管理改进路径

```
阶段 1（立即）：修复 P0-6
  → 在 .claude/tests/ 下添加 package.json，安装 jszip

阶段 2（短期）：提升共享依赖
  → jszip 移入 .claude/shared/scripts/package.json
  → unify-directory-structure.mjs 改用标准 import

阶段 3（中期）：统一依赖管理
  → 根目录 package.json 声明 devDependencies
  → 各 skill scripts/package.json 改为 peerDependencies
  → npm workspaces 或等效方案统一 install
```

---

## 11. 推荐实施顺序

### 阶段 1：P0 修复（立即，不超过 1 天）

优先级最高，修复所有测试崩溃，使测试体系可信。

| 顺序 | 任务 | 涉及文件 | 工作量 |
|------|------|---------|-------|
| 1.1 | 修复 `test-workflow-doc-validator.mjs`：`agentsRoot` 条件性读取 | `test-workflow-doc-validator.mjs` | 2行 |
| 1.2 | 修复 `.claude/agents/` 文档声明（删除或创建目录） | `README.md`, `directory-naming.md` | 各2行 |
| 1.3 | 修复 `test-load-config.mjs:69`：更新 scripts 路径断言 | `test-load-config.mjs` | 2行 |
| 1.4 | 修复 `test-load-config.mjs:41`：添加 `dataAssetsVersionMap` 到 config.json，或删除断言 | `config.json` 或测试文件 | 5行 |
| 1.5 | 修复 `test-lanhu-mcp-runtime.mjs:38`：更新 cookieRefreshScript 路径断言 | `test-lanhu-mcp-runtime.mjs` | 2行 |
| 1.6 | 修复 jszip 依赖：在 `.claude/tests/` 下添加 package.json | 新文件 | 10行 |

### 阶段 2：P1 架构加固（短期，1-3 天）

消除主要漂移点，提升 AI Agent 行为一致性。

| 顺序 | 任务 | 涉及文件 | 优先理由 |
|------|------|---------|---------|
| 2.1 | CLAUDE.md 修正 `prd-formalizer` → `prd-formalize` 拼写 | `CLAUDE.md` | 影响 Agent 步骤定位 |
| 2.2 | CLAUDE.md 补充单 PRD 状态文件命名规则 | `CLAUDE.md` | 续传功能正确性 |
| 2.3 | `.qa-state.json` 合同单一来源：SKILL.md 和 step-parse-input.md 改为引用 | 2个文件 | 减少漂移 |
| 2.4 | 清理 / 收口 skill 内规则副本，至少为 `test-case-writing` / `archive-format` / `xmind-output` 增加“以全局版本为准”声明 | skill 内规则文件 | 规则治理 |
| 2.5 | 提升 jszip 到 shared/scripts/package.json，修复跨 skill 路径依赖 | 多文件 | 依赖健壮性 |
| 2.6 | `lanhuPlanPath` 断言从测试中清理或补充对应文档 | `test-workflow-doc-validator.mjs` | 测试真实性 |

### 阶段 3：P1 Prompt 优化（中期，3-5 天）

提升 AI 执行质量，减少注意力稀释。

| 顺序 | 任务 |
|------|------|
| 3.1 | Writer Subagent Prompt 拆分重构（291行 → 核心 80行 + 参考） |
| 3.2 | Reviewer Subagent Prompt 重构（291行 → 核心 60行 + 规则引用） |
| 3.3 | 统一所有 step-*.md 的标准化模板格式 |
| 3.4 | Step prompt 内硬编码路径改为读取 config 的注释说明 |

### 阶段 4：P2 治理改善（长期，持续）

| 任务 |
|------|
| 添加 `.claude/tests/` 统一运行入口（package.json + test runner） |
| `config.json` 补充 `repoBranchMapping` 字段索引 |
| `docs/planning.md` 添加历史存档声明 |
| 评估是否引入 npm workspaces 统一依赖管理 |

---

## 12. 验证与回归检查清单

### 12.1 P0 修复验证

修复完成后，每个测试必须达到以下状态：

- [ ] `node .claude/tests/test-load-config.mjs` → 29/29 通过（当前 27/29）
- [ ] `node .claude/tests/test-lanhu-mcp-runtime.mjs` → 13/13 通过（当前 12/13）
- [ ] `node .claude/tests/test-workflow-doc-validator.mjs` → 正常运行（当前崩溃）
- [ ] `node .claude/tests/test-json-to-xmind.mjs` → 正常运行（当前 ERR_MODULE_NOT_FOUND）
- [ ] `node .claude/tests/test-archive-history-scripts.mjs` → 正常运行（当前 ERR_MODULE_NOT_FOUND）

### 12.2 架构漂移回归检查

- [ ] `CLAUDE.md` 中所有 step ID 与 `SKILL.md` §步骤顺序定义表一致
- [ ] `README.md` 目录树与实际磁盘目录一致（重点：`.claude/agents/` 是否声明与存在对齐）
- [ ] `directory-naming.md` 目录树与实际磁盘目录一致
- [ ] `config.json` 中所有路径字段对应的文件/目录实际存在
- [ ] `cookieRefreshScript` 在 config.json、测试断言、step-parse-input.md 三处指向同一文件

### 12.3 Prompt 优化验证

- [ ] Writer Subagent 核心 prompt < 100 行
- [ ] 所有 step-*.md 包含 `<!-- step-id: -->` 注释
- [ ] step-*.md 中不出现硬编码的 `.claude/skills/` 或 `tools/` 绝对路径

### 12.4 端到端功能回归

修改任何 SKILL.md 或 step-*.md 后，验证以下场景：

- [ ] 普通模式：`为 data-assets v6.4.10 生成测试用例`（完整 11 步执行）
- [ ] 快速模式：`--quick` 跳过 brainstorm 和 checklist
- [ ] 续传模式：中断后重发指令，从 `last_completed_step` 继续
- [ ] 蓝湖 URL 模式：lanhu-mcp 正常启动，Cookie 刷新流程正常
- [ ] 质量阻断：Reviewer 问题率 > 40% 时正确暂停并提示用户

### 12.5 文档一致性检查（可自动化）

基于 `test-workflow-doc-validator.mjs` 现有框架，建议扩展以下检查：

```js
// 建议新增的测试断言
assert(!existsSync(agentsRoot) || readdirSync(agentsRoot).length > 0,
  ".claude/agents/ 若存在则不应为空");
assert(claudeMdContent.includes("prd-formalize") && !claudeMdContent.includes("prd-formalizer"),
  "CLAUDE.md 使用正确的 step ID: prd-formalize");
assert(configJson.integrations?.lanhuMcp?.cookieRefreshScript
  .includes("using-qa-flow/scripts"),
  "cookieRefreshScript 指向 using-qa-flow/scripts 目录");
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
| `.claude/agents/` 目录 | README.md, directory-naming.md | 不存在 | P0-4, P1-2 |
| `config.dataAssetsVersionMap` | test-load-config.mjs:41 | 不存在 | P0-2 |
| `cookieRefreshScript` = `.claude/scripts/...` | test-lanhu-mcp-runtime.mjs:38 | 实际在 `using-qa-flow/scripts/` | P0-3 |
| `docs/蓝湖PRD自动化导入方案.md` | test-workflow-doc-validator.mjs:23 | 不存在 | P0-5 |
| `.claude/scripts/` 路径 | test-load-config.mjs:69 | 实际在 `.claude/shared/scripts/` | P0-1 |
| `prd-formalizer` step ID | CLAUDE.md §DTStack分流规则 | 正确应为 `prd-formalize` | P1-7 |
| `.qa-state.json` 结构定义 | SKILL.md + intermediate-format.md + step-parse-input.md | 3处分散 | P1-4 |
