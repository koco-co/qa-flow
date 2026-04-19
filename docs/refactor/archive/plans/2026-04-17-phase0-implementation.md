# Phase 0 · Knowledge Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 phase 0 的 `preferences/ → rules/` 物理 + 代码 + 文档三层迁移、创建 `knowledge/` 空骨架、并在 CLAUDE.md 增加"三层信息架构"章节。

**Architecture:** 渐进式重构，顺序为：lib 层 → 主脚本 → 引用脚本 → 测试 → 物理目录 → 文档 → 新骨架 → 最终验证。每一步独立 commit；代码先改后测，确保重构前后行为等价；最后批量改文档。

**Tech Stack:** TypeScript + Bun + Commander CLI + `bun:test`（mocha-style）+ Markdown。

**Spec:** [`../specs/2026-04-17-knowledge-architecture-design.md`](../specs/2026-04-17-knowledge-architecture-design.md)

**Roadmap:** [`../../refactor-roadmap.md`](../../refactor-roadmap.md)

---

## 重构 symbol 对照表（全局生效）

| 旧 symbol | 新 symbol | 位置 |
|---|---|---|
| `PreferenceMap` (type) | `RuleMap` | `preference-loader.ts` |
| `XmindPreferences` (interface) | `XmindRules` | `lib/preferences.ts` |
| `globalPreferencesDir()` | `globalRulesDir()` | `preference-loader.ts` |
| `parsePreferenceFile()` | `parseRuleFile()` | `preference-loader.ts` |
| `loadPreferencesFromDir()` | `loadRulesFromDir()` | `preference-loader.ts` |
| `mergePreferenceMaps()` | `mergeRuleMaps()` | `preference-loader.ts` |
| `loadPreferences()` | `loadRules()` | `preference-loader.ts` |
| `loadXmindPreferences()` | `loadXmindRules()` | `lib/preferences.ts` |
| `projectPreferencesDir()` | `projectRulesDir()` | `lib/paths.ts` |
| Env `QA_PREFERENCES_DIR` | `QA_RULES_DIR` | `preference-loader.ts` |
| File `.claude/scripts/preference-loader.ts` | `rule-loader.ts` | filesystem |
| File `.claude/scripts/lib/preferences.ts` | `rules.ts` | filesystem |
| File `.claude/scripts/__tests__/preference-loader.test.ts` | `rule-loader.test.ts` | filesystem |
| File `.claude/scripts/__tests__/lib/preferences.test.ts` | `rules.test.ts` | filesystem |
| Commander `.name("preference-loader")` | `.name("rule-loader")` | `preference-loader.ts` |
| Output file `preferences-merged.json` | `rules-merged.json` | `test-case-gen`/`ui-autotest` SKILL.md |
| Dir `preferences/` | `rules/` | filesystem |
| Dir `workspace/{project}/preferences/` | `workspace/{project}/rules/` | filesystem |

**不改动白名单：**
- `.claude/skills/playwright-cli/references/storage-state.md:118` 的 `{ name: 'preferences', ... }` 是 cookie/localStorage 的 key 示例，与 qa-flow 的 preferences 目录无关
- `memory/feedback_*.md`（用户 AI 协作偏好，仍用"偏好"一词）
- `SKILL.md` 里出现的"偏好"这个术语，若语境指的是 memory 里的内容则保留；若指 rules/ 层则改为"规则"（由主 agent 按语境判断）

---

### Task 1: 迁移 lib 层（preferences.ts → rules.ts）

**Files:**
- Rename: `.claude/scripts/lib/preferences.ts` → `.claude/scripts/lib/rules.ts`
- Modify: `.claude/scripts/lib/rules.ts`（内部符号重命名 + 全局路径字面量）
- Modify: `.claude/scripts/lib/paths.ts:64-66`

- [ ] **Step 1: `git mv` 文件**

```bash
git -C /Users/poco/Projects/qa-flow mv .claude/scripts/lib/preferences.ts .claude/scripts/lib/rules.ts
```

- [ ] **Step 2: 内部符号更新（在 rules.ts 里）**

应用以下 Edit（使用 `replace_all: true` 批量替换）：

| old_string | new_string |
|---|---|
| `XmindPreferences` | `XmindRules` |
| `loadXmindPreferences` | `loadXmindRules` |
| `projectPreferencesDir` | `projectRulesDir` |
| `"preferences/xmind-structure.md"` | `"rules/xmind-structure.md"` |

验证最终 import 行为：

```typescript
// 第 3 行：
import { repoRoot, projectRulesDir } from "./paths.ts";
```

- [ ] **Step 3: 更新 `lib/paths.ts:64-66`**

```typescript
// old:
export function projectPreferencesDir(project: string): string {
  return join(projectDir(project), "preferences");
}
// new:
export function projectRulesDir(project: string): string {
  return join(projectDir(project), "rules");
}
```

- [ ] **Step 4: TypeScript 编译验证**

```bash
cd /Users/poco/Projects/qa-flow && bunx tsc --noEmit .claude/scripts/lib/rules.ts .claude/scripts/lib/paths.ts
```

Expected: 无 error。

- [ ] **Step 5: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/scripts/lib/
git -C /Users/poco/Projects/qa-flow commit -m "refactor(phase0): rename lib/preferences.ts to lib/rules.ts"
```

---

### Task 2: 迁移主加载器（preference-loader.ts → rule-loader.ts）

**Files:**
- Rename: `.claude/scripts/preference-loader.ts` → `.claude/scripts/rule-loader.ts`
- Modify: `.claude/scripts/rule-loader.ts`（内部符号 + 环境变量 + Commander name）

- [ ] **Step 1: `git mv` 文件**

```bash
git -C /Users/poco/Projects/qa-flow mv .claude/scripts/preference-loader.ts .claude/scripts/rule-loader.ts
```

- [ ] **Step 2: 批量 Edit（rule-loader.ts 内部）**

依次应用（每条都 `replace_all: true`）：

| old_string | new_string |
|---|---|
| `PreferenceMap` | `RuleMap` |
| `globalPreferencesDir` | `globalRulesDir` |
| `parsePreferenceFile` | `parseRuleFile` |
| `loadPreferencesFromDir` | `loadRulesFromDir` |
| `mergePreferenceMaps` | `mergeRuleMaps` |
| `loadPreferences` | `loadRules` |
| `projectPreferencesDir` | `projectRulesDir` |
| `QA_PREFERENCES_DIR` | `QA_RULES_DIR` |
| `resolve(repoRoot(), "preferences")` | `resolve(repoRoot(), "rules")` |
| `preference-loader.ts` | `rule-loader.ts` |
| `"preference-loader"` | `"rule-loader"` |
| `globalPrefs` | `globalRules` |
| `projectPrefs` | `projectRules` |

文件头注释行（第 3-5 行）同步改写：

```typescript
/**
 * rule-loader.ts — 一次性加载并合并多级规则，输出 JSON。
 * Usage:
 *   bun run .claude/scripts/rule-loader.ts load --project <name>
 */
```

- [ ] **Step 3: TypeScript 编译验证**

```bash
cd /Users/poco/Projects/qa-flow && bunx tsc --noEmit .claude/scripts/rule-loader.ts
```

Expected: 无 error。

- [ ] **Step 4: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/scripts/rule-loader.ts
git -C /Users/poco/Projects/qa-flow commit -m "refactor(phase0): rename preference-loader.ts to rule-loader.ts"
```

---

### Task 3: 更新引用脚本（archive-gen / xmind-gen / writer-context-builder）

**Files:**
- Modify: `.claude/scripts/archive-gen.ts:22`
- Modify: `.claude/scripts/xmind-gen.ts:25,102`
- Modify: `.claude/scripts/writer-context-builder.ts`（需先 grep 确认具体引用行）

- [ ] **Step 1: 更新 archive-gen.ts**

```typescript
// old (line 22):
import { buildRootName } from "./lib/preferences.ts";
// new:
import { buildRootName } from "./lib/rules.ts";
```

注：`buildRootName` 函数名不变。

- [ ] **Step 2: 更新 xmind-gen.ts**

```typescript
// old (line 25):
import { loadXmindPreferences } from "./lib/preferences.ts";
// new:
import { loadXmindRules } from "./lib/rules.ts";

// old (line 102):
const prefs = loadXmindPreferences(project);
// new:
const prefs = loadXmindRules(project);
```

- [ ] **Step 3: 查 writer-context-builder.ts 引用并更新**

```bash
grep -n "preference" /Users/poco/Projects/qa-flow/.claude/scripts/writer-context-builder.ts
```

按结果更新。通常至少会命中 `"preferences-merged.json"` 字面量（在 `.temp/` 下的中间文件名）→ 改为 `"rules-merged.json"`。如命中其他 import 或调用，同步改。

- [ ] **Step 4: 查 `.claude/scripts/` 下其他潜在漏网**

```bash
grep -rn "preference" /Users/poco/Projects/qa-flow/.claude/scripts/ --include="*.ts" | grep -v __tests__ | grep -v "rule-loader.ts" | grep -v "lib/rules.ts"
```

Expected: 无输出（若有，逐一修复）。

- [ ] **Step 5: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/scripts/archive-gen.ts .claude/scripts/xmind-gen.ts .claude/scripts/writer-context-builder.ts
git -C /Users/poco/Projects/qa-flow commit -m "refactor(phase0): update 3 scripts to import from lib/rules.ts"
```

---

### Task 4: 迁移测试层

**Files:**
- Rename: `.claude/scripts/__tests__/preference-loader.test.ts` → `rule-loader.test.ts`
- Rename: `.claude/scripts/__tests__/lib/preferences.test.ts` → `lib/rules.test.ts`
- Modify: `.claude/scripts/__tests__/lib/paths.test.ts:19,199,201`
- Modify: `.claude/scripts/__tests__/writer-context-builder.test.ts`（若有引用）
- Modify 两个重命名后的测试文件内部（同 Task 1/2 的符号规则）

- [ ] **Step 1: 批量重命名**

```bash
git -C /Users/poco/Projects/qa-flow mv .claude/scripts/__tests__/preference-loader.test.ts .claude/scripts/__tests__/rule-loader.test.ts
git -C /Users/poco/Projects/qa-flow mv .claude/scripts/__tests__/lib/preferences.test.ts .claude/scripts/__tests__/lib/rules.test.ts
```

- [ ] **Step 2: 更新 rule-loader.test.ts 内部**

应用 Task 2 的所有 Edit 规则。此外：
- import 路径：`../preference-loader.ts` → `../rule-loader.ts`
- `describe("preference-loader", ...)` → `describe("rule-loader", ...)`
- 测试 fixture 里的 `preferences/` 目录路径 → `rules/`（按 grep 定位）

```bash
grep -n "preference" /Users/poco/Projects/qa-flow/.claude/scripts/__tests__/rule-loader.test.ts
```

逐行修复。

- [ ] **Step 3: 更新 rules.test.ts（原 preferences.test.ts）**

应用 Task 1 的 Edit 规则。同时：
- import 路径 `../../lib/preferences.ts` → `../../lib/rules.ts`
- `describe("preferences", ...)` → `describe("rules", ...)`（如存在）

```bash
grep -n "preference" /Users/poco/Projects/qa-flow/.claude/scripts/__tests__/lib/rules.test.ts
```

- [ ] **Step 4: 更新 paths.test.ts**

Edit：

```typescript
// line 19 (import clause):
// old: projectPreferencesDir,
// new: projectRulesDir,

// line 199:
// old: describe("projectPreferencesDir", () => {
// new: describe("projectRulesDir", () => {

// line 201:
// old: const dir = projectPreferencesDir("dataAssets");
// new: const dir = projectRulesDir("dataAssets");
```

同时查看后续几行的断言，如果断言包含字符串 `"preferences"` 则改为 `"rules"`：

```bash
sed -n '195,210p' /Users/poco/Projects/qa-flow/.claude/scripts/__tests__/lib/paths.test.ts
```

按实际内容修正。

- [ ] **Step 5: 更新 writer-context-builder.test.ts**

```bash
grep -n "preference" /Users/poco/Projects/qa-flow/.claude/scripts/__tests__/writer-context-builder.test.ts
```

按结果更新（通常是 `preferences-merged.json` → `rules-merged.json` 或 fixture 路径）。

- [ ] **Step 6: 不改物理目录直接跑测试（可能部分失败）**

```bash
cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__
```

预期：部分失败（因为物理目录还叫 preferences/，而测试期望 rules/）。记录失败清单，Task 5 后再跑一次确认全绿。

- [ ] **Step 7: Commit（测试代码层迁移）**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/scripts/__tests__/
git -C /Users/poco/Projects/qa-flow commit -m "refactor(phase0): migrate tests to rule-loader/rules (expected partial fail until dirs renamed)"
```

---

### Task 5: 物理目录改名 + 全量测试

**Files:**
- Rename: `preferences/` → `rules/`
- Rename: `workspace/dataAssets/preferences/` → `workspace/dataAssets/rules/`
- Rename: `workspace/xyzh/preferences/` → `workspace/xyzh/rules/`

- [ ] **Step 1: 改名全局目录**

```bash
git -C /Users/poco/Projects/qa-flow mv preferences rules
```

- [ ] **Step 2: 改名项目级目录**

```bash
git -C /Users/poco/Projects/qa-flow mv workspace/dataAssets/preferences workspace/dataAssets/rules
git -C /Users/poco/Projects/qa-flow mv workspace/xyzh/preferences workspace/xyzh/rules
```

- [ ] **Step 3: 全量测试必须通过**

```bash
cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__
```

Expected: **全绿**。若有失败，排查：
- 是否漏改了某个 import
- 是否漏改了某个字符串字面量
- 是否漏改了某个环境变量名

若主 agent 调试超过 10 分钟无果，按 memory 规则派 subagent 排查（但尽量主 agent 自己修复，因为这是迁移类的机械问题）。

- [ ] **Step 4: Smoke：CLI 加载验证**

```bash
cd /Users/poco/Projects/qa-flow && bun run .claude/scripts/rule-loader.ts load --project dataAssets
```

Expected: 输出合并后的 JSON，至少包含 `case-writing`、`hotfix-frontmatter`、`xmind-structure` 三个顶级 key（对应 `workspace/dataAssets/rules/` 下三个 md 文件的文件名）。

- [ ] **Step 5: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add -A
git -C /Users/poco/Projects/qa-flow commit -m "refactor(phase0): rename preferences/ directories to rules/ (global + project-level)"
```

---

### Task 6: 更新 6 个 SKILL / reference 文件

**Files:**
- Modify: `.claude/skills/test-case-gen/SKILL.md`（lines 21, 23, 26, 52, 572）
- Modify: `.claude/skills/test-case-gen/references/test-case-rules.md`（line 4）
- Modify: `.claude/skills/test-case-gen/references/xmind-gen.ts`（line 116）
- Modify: `.claude/skills/setup/SKILL.md`（lines 11, 14, 15, 101, 112, 123, 137）
- Modify: `.claude/skills/ui-autotest/SKILL.md`（lines 182, 185）
- Modify: `.claude/skills/xmind-editor/SKILL.md`（lines 31, 32, 35, 84, 145, 146, 155）

**白名单：** `.claude/skills/playwright-cli/references/storage-state.md:118` 不改。

- [ ] **Step 1: 批量字符串替换（每个文件独立 Edit，replace_all 配合 context）**

对上面每个文件应用以下替换（按需调整，每条都 `replace_all: true` 或精确定位）：

| old_string | new_string |
|---|---|
| `preference-loader.ts` | `rule-loader.ts` |
| `preferences-merged.json` | `rules-merged.json` |
| `\`preferences/\`` | `` `rules/` `` |
| `workspace/{{project}}/preferences/` | `workspace/{{project}}/rules/` |
| `项目级 preferences` | `项目级 rules` |
| `全局 preferences` | `全局 rules` |

**语义词保留**：`项目级偏好`、`全局偏好`、`用户偏好规则`、`用户偏好`、`偏好优先级` 这些文案类表述**保留不改**（用户层对"偏好"一词有情感记忆，且 memory 仍用"偏好"），除非某一句明显指的是 rules/ 层再改。**主 agent 按语境逐句判断**，不做机械替换。

- [ ] **Step 2: 特殊处理 setup SKILL.md 的 mkdir 命令**

`.claude/skills/setup/SKILL.md:101` 和 `123`（两处相同）：

```bash
# old:
mkdir -p workspace/{{project}}/{prds,xmind,archive,issues,historys,reports,tests,preferences,.repos,.temp}
# new:
mkdir -p workspace/{{project}}/{prds,xmind,archive,issues,historys,reports,tests,rules,knowledge,.repos,.temp}
```

注意新增 `knowledge` 目录（phase 0 同步交付）。

- [ ] **Step 3: 更新 setup SKILL.md:137 的目录树示意图**

找到类似结构：

```
├── tests/         # 测试产物
├── preferences/   # 用户偏好规则
├── .repos/        # 源码仓库（只读）
```

替换为：

```
├── tests/         # 测试产物
├── rules/         # 规则库（编写规范/格式约束）
├── knowledge/     # 业务知识库
├── .repos/        # 源码仓库（只读）
```

- [ ] **Step 4: 特殊处理 references/xmind-gen.ts:116**

```typescript
// old:
"../../preferences/xmind-structure.md",
// new:
"../../rules/xmind-structure.md",
```

- [ ] **Step 5: grep 扫描无漏**

```bash
grep -rn "preferences/" /Users/poco/Projects/qa-flow/.claude/skills/ --include="*.md" | grep -v "storage-state.md"
grep -rn "preference-loader" /Users/poco/Projects/qa-flow/.claude/skills/
grep -rn "preferences-merged" /Users/poco/Projects/qa-flow/.claude/skills/
```

Expected: 均无输出。

- [ ] **Step 6: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add .claude/skills/
git -C /Users/poco/Projects/qa-flow commit -m "refactor(phase0): update 6 skill/reference files to use rules/ path and rule-loader"
```

---

### Task 7: 更新 CLAUDE.md + README.md + README-EN.md

**Files:**
- Modify: `CLAUDE.md`（lines 32, 41, 46, 48 + 新增"三层信息架构"章节 + 新增 knowledge/ 到目录树）
- Modify: `README.md`（lines 319, 439, 468, 473 + 目录树）
- Modify: `README-EN.md`（lines 86, 311, 440, 445, 449 + 目录树）

- [ ] **Step 1: 更新 CLAUDE.md 现有行**

逐行 Edit：

| 行号 | old_string（片段） | new_string（片段） |
|---|---|---|
| 32 | `│   ├── preferences/     # 项目级偏好（覆盖全局）` | `│   ├── rules/            # 项目级规则（覆盖全局）` |
| 41 | `偏好优先级：用户当前指令 > 项目级 \`workspace/{project}/preferences/\` > 全局 \`preferences/\` > skill 内置规则` | `规则优先级：用户当前指令 > 项目级 \`workspace/{project}/rules/\` > 全局 \`rules/\` > skill 内置规则` |
| 46 | `用户偏好规则见 \`preferences/\` 目录（全局）和 \`workspace/{project}/preferences/\`（项目级），优先级高于 skill 内置规则` | `规则见 \`rules/\` 目录（全局）和 \`workspace/{project}/rules/\`（项目级），优先级高于 skill 内置规则` |
| 48 | `配置类修改（如 \`.env\`、\`config.json\`、project preferences）` | `配置类修改（如 \`.env\`、\`config.json\`、project rules、project knowledge）` |

同时在 line 32 附近的目录树插入 `knowledge/`：

```
│   ├── rules/            # 项目级规则（覆盖全局）
│   ├── knowledge/        # 项目级业务知识库
│   ├── .repos/           # 源码仓库（只读）
│   └── .temp/            # 状态文件
```

- [ ] **Step 2: 插入 CLAUDE.md "三层信息架构"章节**

在 `## 核心约束` 之后、`## 脚本变更规则` 之前插入：

```markdown
## 三层信息架构

qa-flow 的协作偏好、规则、业务知识分三层存放，职责互斥：

| 层 | 路径 | 寿命 | 作用域 | 语义 | 典型内容 |
|---|---|---|---|---|---|
| **偏好（memory）** | `~/.claude/projects/.../memory/` | 长（跨项目） | 用户级 | AI 协作偏好 + 项目状态小便签 | `feedback_*`（AI 协作风格）、`project_*`（如"当前迭代 15695"） |
| **规则（rules）** | `rules/` + `workspace/{project}/rules/` | 中（项目周期） | 项目 + 全局（双层） | 硬约束 | 用例编写规范、XMind 结构约束、格式/命名约定 |
| **知识（knowledge）** | `workspace/{project}/knowledge/` | 短-中（业务迭代更新） | 仅项目级 | 业务知识库 | 主流程、术语表、业务规则、踩坑 |

**边界判断口诀：**
- 跨项目可复用的 AI 协作偏好 → memory
- 项目内硬性编写/格式约束 → rules
- 项目内业务事实（"是什么"、"怎么做业务"）→ knowledge

**读写约束：**
- `rules/` 通过 `bun run .claude/scripts/rule-loader.ts load --project {{project}}` 合并加载；主 agent 读、skill 读；AI 在 xmind-editor 等场景下可追加写入
- `knowledge/` 由 `knowledge-keeper` skill（阶段 1 实施）统一读写；subagent 不得直接改文件
- `memory/` 由 Claude Code 自动持久化；AI 主动写入

详见 [`docs/refactor/specs/2026-04-17-knowledge-architecture-design.md`](docs/refactor/specs/2026-04-17-knowledge-architecture-design.md)。
```

- [ ] **Step 3: 更新 README.md**

| 行号 | old | new |
|---|---|---|
| 319 | `preferences/case-writing.md` | `rules/case-writing.md` |
| 439 | `│   │   │   ├── preferences.ts    #   偏好读取工具` | `│   │   │   ├── rules.ts          #   规则读取工具` |
| 468 | `│   │   ├── preferences/          # 项目级偏好（覆盖全局）` | `│   │   ├── rules/               # 项目级规则（覆盖全局）` |
| 473 | `├── preferences/                  # 用户偏好规则（自动写入）` | `├── rules/                       # 编写规则库（覆盖优先级：项目 > 全局）` |

同时在 line 468 附近新增：

```
│   │   ├── rules/               # 项目级规则（覆盖全局）
│   │   ├── knowledge/           # 项目级业务知识库
│   │   ├── .repos/              # 源码仓库
```

- [ ] **Step 4: 更新 README-EN.md**

| 行号 | old | new |
|---|---|---|
| 86 | `project-level preferences` | `project-level rules` |
| 311 | `preferences/case-writing.md` | `rules/case-writing.md` |
| 440 | `│   │   ├── preferences/          # Project-level overrides` | `│   │   ├── rules/               # Project-level rule overrides` |
| 445 | `├── preferences/                  # User preference rules (auto-written)` | `├── rules/                       # Writing rule library (project > global)` |
| 449 | `│   └── xmind-structure.md        # XMind structure preferences` | `│   └── xmind-structure.md        # XMind structure rules` |

同时在 line 440 附近新增 `knowledge/` 条目（与中文 README 对齐）。

- [ ] **Step 5: grep 扫描顶层文档**

```bash
grep -n "preferences" /Users/poco/Projects/qa-flow/CLAUDE.md /Users/poco/Projects/qa-flow/README.md /Users/poco/Projects/qa-flow/README-EN.md
```

Expected: 仅剩 `memory` 层语义相关的"偏好"术语残留（如"协作偏好"这类），无 `preferences/` 路径字样。

- [ ] **Step 6: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add CLAUDE.md README.md README-EN.md
git -C /Users/poco/Projects/qa-flow commit -m "docs(phase0): add 三层信息架构 section to CLAUDE.md; rename preferences to rules in READMEs"
```

---

### Task 8: 创建 knowledge/ 空骨架

**Files (per workspace):**
- Create: `workspace/{project}/knowledge/overview.md`
- Create: `workspace/{project}/knowledge/terms.md`
- Create: `workspace/{project}/knowledge/modules/.gitkeep`
- Create: `workspace/{project}/knowledge/pitfalls/.gitkeep`
- Create: `workspace/{project}/knowledge/_index.md`

两个 workspace：`dataAssets`、`xyzh`（动态以 `ls workspace/` 为准，但当前只有这两个）。

- [ ] **Step 1: 为每个项目创建目录结构**

```bash
for proj in dataAssets xyzh; do
  mkdir -p /Users/poco/Projects/qa-flow/workspace/$proj/knowledge/modules
  mkdir -p /Users/poco/Projects/qa-flow/workspace/$proj/knowledge/pitfalls
  touch /Users/poco/Projects/qa-flow/workspace/$proj/knowledge/modules/.gitkeep
  touch /Users/poco/Projects/qa-flow/workspace/$proj/knowledge/pitfalls/.gitkeep
done
```

- [ ] **Step 2: Write `overview.md` 模板（每项目一份）**

对 `workspace/dataAssets/knowledge/overview.md` 和 `workspace/xyzh/knowledge/overview.md`（`{PROJECT}` 替换为实际项目名）：

```markdown
# {PROJECT} 业务概览

> 本文件由 `knowledge-keeper` skill（阶段 1 实施后）维护。
> 用户可直接编辑，但 AI 写入前应经过 knowledge-keeper API。
> 填充指南：见 [phase 0 spec 第 4.2 节](../../../docs/refactor/specs/2026-04-17-knowledge-architecture-design.md#42-目录结构目标态)。

## 产品定位

（占位：一句话描述该项目是做什么的，服务对象是谁，核心价值主张）

## 主流程

（占位：列出 2-5 条主要业务流程，每条一段简短描述 + 关键步骤）

1. …
2. …

## 术语入口

详见 [terms.md](terms.md)。

## 模块入口

详见 [modules/](modules/) 目录。每个业务模块一个 .md 文件。

## 踩坑入口

详见 [pitfalls/](pitfalls/) 目录。每个典型坑一个 .md 文件。
```

- [ ] **Step 3: Write `terms.md` 模板**

```markdown
# {PROJECT} 术语表

> 由 `knowledge-keeper` skill（阶段 1 实施后）维护。

| 术语 | 中文 | 解释 | 别名 |
|---|---|---|---|
| （示例，可删）Quality Item | 质量项 | 用户在项目中定义的数据质量规则实体 | QI |

<!--
  填入业务术语时遵循：
  - 一行一个术语
  - 中英文、解释、别名按列对齐
  - 大小写按业务约定
-->
```

- [ ] **Step 4: Write `_index.md` 模板**

```markdown
# {PROJECT} Knowledge Index

> 由 `knowledge-keeper` skill（阶段 1 实施后）自动维护。
> 本文件是知识库目录页，AI 读取 `knowledge/` 时优先读此文件。

## Core（启动时默认注入）

- [overview.md](overview.md) — 产品定位 + 主流程（最后更新：2026-04-17）
- [terms.md](terms.md) — 术语表（最后更新：2026-04-17）

## Modules（懒加载）

（knowledge-keeper 将在阶段 1 实施后自动维护此节）

## Pitfalls（按关键词检索）

（knowledge-keeper 将在阶段 1 实施后自动维护此节）
```

- [ ] **Step 5: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add workspace/dataAssets/knowledge workspace/xyzh/knowledge
git -C /Users/poco/Projects/qa-flow commit -m "feat(phase0): add empty knowledge/ skeleton for all workspaces (dataAssets, xyzh)"
```

---

### Task 9: 最终验证 + 更新 roadmap 状态

- [ ] **Step 1: 全量单元测试**

```bash
cd /Users/poco/Projects/qa-flow && bun test ./.claude/scripts/__tests__
```

Expected: **全部通过**。

- [ ] **Step 2: 全量 grep 漏网扫描（四维度）**

```bash
cd /Users/poco/Projects/qa-flow

echo "=== [1] 源码层（不应有 preference 字样） ==="
grep -rn "preference" .claude/scripts/ --include="*.ts" | grep -v __tests__

echo "=== [2] 测试层 ==="
grep -rn "preference" .claude/scripts/__tests__/ --include="*.ts"

echo "=== [3] skill / reference / 根级文档 ==="
grep -rn "preferences/" . --include="*.md" 2>/dev/null | grep -v node_modules | grep -v ".repos" | grep -v "storage-state.md"

echo "=== [4] 物理目录 ==="
find . -type d -name "preferences" 2>/dev/null | grep -v node_modules | grep -v .repos
```

Expected: 四段均无输出；如 [3] 命中任何文档里的"偏好/preference"词汇，判断是 memory 语义（保留）还是 rules 语义（修复）。

- [ ] **Step 3: Skill-level smoke**

```bash
cd /Users/poco/Projects/qa-flow && bun run .claude/scripts/rule-loader.ts load --project dataAssets | head -30
```

Expected: 非空 JSON 输出，含 `case-writing` / `hotfix-frontmatter` / `xmind-structure` 三个顶级 key。

- [ ] **Step 4: TypeScript 编译健康**

```bash
cd /Users/poco/Projects/qa-flow && bunx tsc --noEmit -p .claude/scripts/tsconfig.json 2>&1 | head -20
```

Expected: 无 error（若 tsconfig.json 不存在，改为 `bunx tsc --noEmit .claude/scripts/*.ts`）。

- [ ] **Step 5: 更新 roadmap 阶段 0 状态**

Edit `docs/refactor-roadmap.md`：

```markdown
<!-- old: -->
| **0** | 信息架构 + `rules/` 迁移 | 🟡 IN PROGRESS | [`2026-04-17-knowledge-architecture-design.md`](refactor/specs/2026-04-17-knowledge-architecture-design.md) | ... |
<!-- new: -->
| **0** | 信息架构 + `rules/` 迁移 | ✅ DONE | [`2026-04-17-knowledge-architecture-design.md`](refactor/specs/2026-04-17-knowledge-architecture-design.md) | ... |
```

- [ ] **Step 6: Commit**

```bash
git -C /Users/poco/Projects/qa-flow add docs/refactor-roadmap.md
git -C /Users/poco/Projects/qa-flow commit -m "docs(phase0): mark roadmap phase 0 as DONE"
```

---

### Task 10: 生成 phase 1 启动 prompt（阶段收尾）

不产生代码，仅生成一份 prompt 供用户新开 CC 实例粘贴。

- [ ] **Step 1: 组装 prompt 内容**

按下述模板呈现给用户（包裹在代码块中以便复制）：

```
# qa-flow 重构 · Phase 1 启动

## 上下文
我正在对 `qa-flow` 项目分阶段重构。请先读以下文档建立认识：
- **Roadmap**: `docs/refactor-roadmap.md` — 11 阶段的总索引
- **Phase 0 Spec（已完成）**: `docs/refactor/specs/2026-04-17-knowledge-architecture-design.md`
- **Phase 0 Plan（已完成）**: `docs/refactor/plans/2026-04-17-phase0-implementation.md`

Phase 0 交付已完成：preferences→rules 物理+代码+文档三层迁移、knowledge/ 空骨架、CLAUDE.md 三层架构章节。

## Phase 1 目标
1. 新增 `create-project` skill：交互式创建新项目 + 初始化 workspace/{project}/ 完整子结构
2. `setup` skill 瘦身：移除第 2 步"项目管理"（职责转给 create-project），保留 5 步
3. 实施 `knowledge-keeper` skill：按 phase 0 spec 第 5 节 contract 写代码

## 工作方式
- 按 brainstorming → writing-plans → subagent-driven-development 推进
- 每个子目标独立 spec → plan → 实施 → smoke → commit
- 有任何疑问用 AskUserQuestion 向用户确认，不推测
- 阶段 1 结束时再生成 phase 2 启动 prompt

## 现在开始
先读 Roadmap + Phase 0 Spec，然后给出 phase 1 三个子目标的推进顺序推荐，并向用户问第一个子目标的 brainstorming 澄清问题。
```

- [ ] **Step 2: 向用户展示**

> 「**阶段 0 完成**，所有 success criteria 全部通过：
> - Spec + roadmap 已入库
> - preferences → rules 迁移完毕（代码、测试、物理目录、文档）
> - knowledge/ 空骨架已创建（2 个 workspace）
> - CLAUDE.md 增加"三层信息架构"章节
> - 单元测试全量通过 / smoke 验证通过 / 无 preference 残留
>
> **建议 `/clear` 或新开 CC 实例，粘贴上面的 prompt 继续 Phase 1**。如想在当前实例继续，直接说"继续"即可。」

- [ ] **Step 3: TaskUpdate 标记完成**

```
TaskUpdate #3 status=completed
TaskUpdate #4 status=completed
TaskUpdate #5 status=completed  (writing-plans invoked task)
TaskUpdate #1 status=completed
```

---

## Self-review

### Spec 覆盖检查
- [x] 三层边界（方案 C） → Task 7 CLAUDE.md 新章节
- [x] knowledge/ P3 混合结构 → Task 8 空骨架
- [x] W2 写入策略 → 在 CLAUDE.md 章节说明 + phase 0 spec 引用
- [x] R3 读取策略 → 同上
- [x] knowledge-keeper contract → phase 0 spec 已写；代码推迟到 phase 1（Task 10 启动 prompt 写明）
- [x] preferences → rules 迁移（路径 + 脚本 + 测试 + 文档） → Task 1-7
- [x] memory 边界重定义（无物理迁移） → CLAUDE.md 章节
- [x] success criteria 全部（spec 第 7 节） → Task 9 验证清单对号入座

### Placeholder 扫描
- 无 TBD / TODO / 占位未填

### Symbol 一致性
- 对照表已统一（见文档开头），每个 task 内的符号引用与对照表一致
- 函数 `buildRootName` 全程未改名（函数名中无 preferences/rules 字样），所有调用点保持

### 风险
- Task 3 Step 3 依赖 grep writer-context-builder.ts 的结果，若该文件结构出乎预料需要临时调整
- Task 6 Step 1 的"语义词保留"需要主 agent 按语境逐句判断，不可全自动化
- Task 5 Step 3 测试若失败，按 memory 规则 ≥10 分钟未修复派 subagent

---

## 执行选择（交付后用户选）

**Phase 0 plan 已写完。请选择执行方式：**

1. **Subagent-Driven（推荐）** — 我 dispatch fresh subagent per task，review between tasks，保护主 agent context
2. **Inline Execution** — 在当前 session 按 executing-plans skill 批量执行，中间有 checkpoint

**你选哪个？**
