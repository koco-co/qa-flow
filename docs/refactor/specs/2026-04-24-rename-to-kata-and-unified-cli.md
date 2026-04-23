# 项目重命名 `qa-flow` → `kata` + 统一 CLI `kata-cli` 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把项目从 `qa-flow` 全量重命名为 `kata`，把 28 个 `.claude/scripts/*.ts` 聚合到单一根 CLI `kata-cli` 下，所有 skill / 测试 / 文档统一**直接**用 `kata-cli <module> <cmd>` 调用（不带 `bun run` 前缀）。脚本不再支持独立执行，只能经 `kata-cli` 调用。

**Architecture:**
- **CLI 层：** 每个脚本仅 `export const program`，不再 parse 自身 argv、不再保留 `import.meta.main` gate。根入口 `kata-cli.ts` 用 commander `addCommand` 聚合 27 个 subprogram。
- **可执行方式：** `kata-cli.ts` 带 shebang `#!/usr/bin/env bun` + `chmod +x`，`package.json` 的 `"bin"` 字段声明 `"kata-cli": ".claude/scripts/kata-cli.ts"`。用户在项目根目录执行一次 `bun link`，`kata-cli` 即注册到 `~/.bun/bin/`（已在 `$PATH`），此后任意目录可直接调用。
- **命名迁移：** 项目名 `qa-flow` → `kata`；CLI 命令名 = `kata-cli`；文件名 `qa.ts` → `kata-cli.ts`、`qa-state.ts` → `kata-state.ts`（按用户要求统一，所有 16 处引用同步）；slash 菜单 `/qa-flow` → `/kata`；skill 目录 `.claude/skills/qa-flow/` → `.claude/skills/kata/`。
- **归档保留：** `docs/refactor/archive/**` 是历史时间点快照，原文保留。`workspace/**/.audit.jsonl` 运行时产物不改。
- **硬编码检查：** 按 `CLAUDE.md` 的反硬编码规则，脚本源码不得出现绝对路径；已有脚本都用 `repoRoot()` 动态计算，无需改动。

**Tech Stack:** Bun + TypeScript + commander@13 + node:test (via bun test) + biome

---

## 改动范围（Survey 结果）

| 类别                                                  | 数量               | 处理方式                       |
| ----------------------------------------------------- | ------------------ | ------------------------------ |
| 脚本移除 parse 调用，仅 `export program`              | 28 个              | Task 2                         |
| `kata-cli.ts` 根入口 `addCommand` 注册                | 27 个              | Task 3                         |
| `qa-state.ts` → `kata-state.ts` 改名 + 16 处引用更新  | 16 个文件          | Task 2.5                       |
| 测试里调用从 `bun run .claude/scripts/xxx.ts` → `kata-cli xxx` | 约 27 个   | Task 4                         |
| skill/agent/ref 文档里 `bun run .claude/scripts/xxx.ts` → `kata-cli xxx` | 87 个文件 | Task 5 |
| `qa-flow` → `kata` 关键词（非归档）                   | 约 50 文件 / 435 处 | Task 6                         |
| `.claude/skills/qa-flow/` 目录                        | 1 个               | Task 7                         |
| `.claude/scripts/qa.ts` + 测试                        | 2 个               | Task 1                         |
| `package.json` `name` / `scripts.qa` / `bin`          | 1 个               | Task 1                         |
| git remote URL                                         | 1 条               | Task 8                         |

---

## File Structure

### 重命名

| 原路径                                              | 新路径                                             |
| --------------------------------------------------- | -------------------------------------------------- |
| `.claude/scripts/qa.ts`                             | `.claude/scripts/kata-cli.ts`                      |
| `.claude/scripts/__tests__/qa.test.ts`              | `.claude/scripts/__tests__/kata-cli.test.ts`       |
| `.claude/scripts/qa-state.ts`                       | `.claude/scripts/kata-state.ts`                    |
| `.claude/scripts/__tests__/qa-state.test.ts`        | `.claude/scripts/__tests__/kata-state.test.ts`     |
| `.claude/skills/qa-flow/`                           | `.claude/skills/kata/`                             |

### 修改（主要）

| 路径                                        | 改动                                                                                                |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `.claude/scripts/*.ts` (28 个)              | `createCli(...).parse/parseAsync(...)` → `export const program = createCli(...);`（彻底移除 parse 和 gate） |
| `.claude/scripts/kata-cli.ts`               | shebang + `Command.name("kata-cli")` + `addCommand(所有 27 个)` + 仍需 parseAsync（唯一入口）       |
| `.claude/scripts/__tests__/*.test.ts`       | `["run", ".claude/scripts/xxx.ts", ...]` → `["kata-cli", "xxx", ...]`（改用 `execFileSync("kata-cli", ...)`）|
| `.claude/skills/**/*.md`                    | `bun run .claude/scripts/xxx.ts` → `kata-cli xxx`；`/qa-flow` → `/kata`                              |
| `package.json`                              | `"name": "qa-flow"` → `"name": "kata"`；删除 `scripts.qa`；新增 `"bin": { "kata-cli": ".claude/scripts/kata-cli.ts" }` |
| `README.md` / `README-EN.md`                | `QAFlow` → `Kata`；`qa-flow` → `kata`；新增 `bun link` 一次性 setup 说明                              |
| `CLAUDE.md`                                 | 标题 + menu 表 `/qa-flow` → `/kata`；硬编码路径示例更新；首次 setup 说明加 `bun link`                |
| `INSTALL.md`                                | 安装流程加 `bun install && bun link` 一步                                                             |
| `.env.example` / `.env.envs.example`        | 注释里 `qa-flow` → `kata`                                                                            |
| `docs/refactor-roadmap.md`                  | 首行标题 + 历史引用（如有活链接）                                                                     |

### 不改

- `docs/refactor/archive/**`
- `workspace/**/knowledge/.audit.jsonl`
- `bun.lock`（执行 `bun install` 时自动更新）

---

## Task 列表

### Task 1: 根 CLI 改名 + 设置 bin

**Files:**
- Rename: `.claude/scripts/qa.ts` → `.claude/scripts/kata-cli.ts`
- Rename: `.claude/scripts/__tests__/qa.test.ts` → `.claude/scripts/__tests__/kata-cli.test.ts`
- Modify: `.claude/scripts/kata-cli.ts`
- Modify: `.claude/scripts/__tests__/kata-cli.test.ts`
- Modify: `package.json`

- [ ] **Step 1.1: 重命名根 CLI 文件**

```bash
git mv .claude/scripts/qa.ts .claude/scripts/kata-cli.ts
git mv .claude/scripts/__tests__/qa.test.ts .claude/scripts/__tests__/kata-cli.test.ts
```

- [ ] **Step 1.2: 重写 `kata-cli.ts`**

⚠️ Task 3 会补全 27 个 subprogram 的 import + addCommand。本步只先建好骨架，保证 shebang 和 name 正确：

```ts
#!/usr/bin/env bun
/**
 * kata-cli.ts — Unified entry point for kata scripts.
 *
 * Usage:
 *   kata-cli <module> <command> [options]
 *   kata-cli --help                       # list all modules
 *   kata-cli <module> --help              # list module's subcommands
 *   kata-cli <module> <command> --help    # show command options (incl. choices)
 *
 * Setup (one-time, from repo root):
 *   bun install && bun link
 *   # afterwards, `kata-cli` is available globally via ~/.bun/bin/
 *
 * Each module is an existing script in .claude/scripts/ that exports a
 * commander `program`. Registered below via addCommand().
 */

import { Command } from "commander";
// NOTE: 27 subprogram imports added in Task 3

const kata = new Command()
  .name("kata-cli")
  .description("kata unified CLI — dispatches to scripts under .claude/scripts/")
  .showHelpAfterError();

// NOTE: 27 addCommand calls added in Task 3

kata.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`[kata-cli] Unexpected error: ${err}\n`);
  process.exit(1);
});

export { kata };
```

关键点：
- 头部 shebang 必须有（首行）
- **不再**用 `if (import.meta.main)` 包裹——此文件是唯一入口，必须始终 parse
- 其他脚本由 Task 2 全部移除 `if (import.meta.main)` 逻辑和 parse 调用，只 export program

- [ ] **Step 1.3: 给 kata-cli.ts 添加执行权限**

```bash
chmod +x .claude/scripts/kata-cli.ts
git update-index --chmod=+x .claude/scripts/kata-cli.ts
```

- [ ] **Step 1.4: 修改 `package.json`**

```diff
 {
-  "name": "qa-flow",
+  "name": "kata",
   "version": "2.0.0",
   "type": "module",
   "private": true,
-  "description": "AI-driven QA test case generation workflow built on Claude Code Skills",
+  "description": "AI-driven QA workflows codified as reusable kata, powered by Claude Code Skills.",
+  "bin": {
+    "kata-cli": ".claude/scripts/kata-cli.ts"
+  },
   "scripts": {
     "check": "biome check .",
     "check:fix": "biome check --fix .",
     "lint": "biome check .",
     "format": "biome check --fix .",
     "type-check": "tsc --noEmit",
     "ci": "bun run lint && bun run type-check && bun run test",
     "test": "bun test ./.claude/scripts/__tests__",
-    "test:watch": "bun test --watch ./.claude/scripts/__tests__",
-    "qa": "bun run .claude/scripts/qa.ts"
+    "test:watch": "bun test --watch ./.claude/scripts/__tests__"
   },
```

注意：删除 `scripts.qa`、新增 `bin`、改 `name`、改 `description`。

- [ ] **Step 1.5: 运行 `bun link` 注册全局命令**

```bash
bun install  # 重新生成 lock（包名从 qa-flow 变 kata）
bun link     # 把 bin/kata-cli 链接到 ~/.bun/bin/
which kata-cli
kata-cli --help
```

Expected: `which kata-cli` 输出 `~/.bun/bin/kata-cli`；`--help` 输出 Usage 行含 `kata-cli`（此时 subcommand 列表还是空的，Task 3 填充后才完整）。

- [ ] **Step 1.6: 修改 `kata-cli.test.ts` 测试调用**

```diff
-    const stdout = execFileSync("bun", ["run", "qa", ...args], {
+    const stdout = execFileSync("kata-cli", args, {
       cwd: REPO_ROOT,
       encoding: "utf8",
       env: { ... }
     });
```

且把所有测试里的 `bun run qa` 字串直接写成直连 `kata-cli`。断言内容（help 文本、枚举检查）不变。

- [ ] **Step 1.7: 跑测试验证**

```bash
bun test ./.claude/scripts/__tests__/kata-cli.test.ts
```

Expected: 4 pass / 0 fail。

- [ ] **Step 1.8: Commit**

```bash
git add .claude/scripts/kata-cli.ts .claude/scripts/__tests__/kata-cli.test.ts package.json bun.lock
git commit -m "refactor: rename qa to kata-cli with bin registration"
```

---

### Task 2: 所有脚本移除 parse 调用，仅 `export program`

**Files (27 个脚本，按字母序)：**

```
archive-gen auto-fixer case-signal-analyzer case-strategy-resolver
config create-project discuss format-check-script format-report-locator
history-convert image-compress knowledge-keeper plan plugin-loader
prd-frontmatter qa-state repo-profile repo-sync report-to-pdf rule-loader
run-tests-notify search-filter source-analyze ui-autotest-progress
writer-context-builder xmind-gen xmind-patch
```

（`qa-state.ts` 在 Task 2.5 才改名，本任务先按原名改造）

- [ ] **Step 2.1: 对每个脚本做统一模式替换**

底部模式识别（3 种）：

| 模式 A | `createCli({...}).parse(process.argv);` |
| 模式 B | `createCli({...}).parseAsync(process.argv);` |
| 模式 C（带 catch） | `createCli({...}).parseAsync(process.argv).catch((err) => { ... });` |

以及原型阶段已加 gate 的 3 个脚本（`rule-loader` / `knowledge-keeper` / `repo-sync`），模式为：
```ts
export const program = createCli({...});
if (import.meta.main) { program.parse(process.argv); }
```

统一改造为（不再有任何 parse 调用、不再有 gate）：

```ts
export const program = createCli({...});
```

**改法示例（模式 A）：**

```diff
-createCli({
+export const program = createCli({
   name: "xxx",
   description: "...",
   commands: [ ... ],
-}).parse(process.argv);
+});
```

**改法示例（模式 C，带 catch）：**

```diff
-createCli({
+export const program = createCli({
   name: "xxx",
   ...
-}).parseAsync(process.argv).catch((err) => {
-  process.stderr.write(`[xxx] Unexpected error: ${err}\n`);
-  process.exit(1);
-});
+});
```

错误处理现在统一由 `kata-cli.ts` 顶层的 `parseAsync(...).catch(...)` 兜底。

**改法示例（已加 gate 的原型脚本）：**

```diff
-export const program = createCli({...});
-
-if (import.meta.main) {
-  program.parse(process.argv);
-}
+export const program = createCli({...});
```

- [ ] **Step 2.2: 检查每个脚本 `export const program` 存在且仅一个**

```bash
grep -c "^export const program" .claude/scripts/*.ts
```

Expected: 每个脚本输出 `1`（含 kata-cli.ts 也应有 `export { kata }`，但 grep 不会匹配到，这是预期）。

- [ ] **Step 2.3: 跑 type-check**

```bash
bun run type-check
```

Expected: 0 error。

- [ ] **Step 2.4: Commit**

```bash
git add .claude/scripts/*.ts
git commit -m "refactor: strip parse calls and main gate from all scripts"
```

（此时测试还跑不过——测试仍以 `bun run .claude/scripts/xxx.ts` 直接调用脚本，但脚本已经不 parse 了。这是预期状态。Task 3 + Task 4 后才恢复绿色。）

---

### Task 2.5: `qa-state.ts` → `kata-state.ts`

**Files:**
- Rename: `.claude/scripts/qa-state.ts` → `.claude/scripts/kata-state.ts`
- Rename: `.claude/scripts/__tests__/qa-state.test.ts` → `.claude/scripts/__tests__/kata-state.test.ts`
- 更新 16 个引用文件里的 `qa-state` → `kata-state`

- [ ] **Step 2.5.1: 重命名文件**

```bash
git mv .claude/scripts/qa-state.ts .claude/scripts/kata-state.ts
git mv .claude/scripts/__tests__/qa-state.test.ts .claude/scripts/__tests__/kata-state.test.ts
```

- [ ] **Step 2.5.2: 文件内修改脚本名注释和 CLI name**

`.claude/scripts/kata-state.ts` 头部：

```diff
-/**
- * qa-state.ts — Breakpoint resume state management CLI.
+/**
+ * kata-state.ts — Breakpoint resume state management CLI.
  * ...
- *   bun run .claude/scripts/qa-state.ts init --project ...
+ *   kata-cli kata-state init --project ...
  * ...
  */
```

找到文件里 `createCli({ name: "qa-state", ... })` → 改为 `name: "kata-state"`（或保持 `name` 字段不变，因为它只是 commander 显示用；但建议同步改为 kata-state 保持一致）。

- [ ] **Step 2.5.3: 全仓库批量替换 `qa-state` → `kata-state`**

```bash
grep -rln "qa-state" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=archive \
  | xargs sed -i '' 's|qa-state|kata-state|g'
```

影响文件（按 survey 是 16 个）应全部更新。

- [ ] **Step 2.5.4: 核查残留**

```bash
grep -rln "qa-state" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=archive
```

Expected: 无输出。

- [ ] **Step 2.5.5: Commit**

```bash
git add -A
git commit -m "refactor: rename qa-state to kata-state"
```

---

### Task 3: `kata-cli.ts` 注册所有 27 个 subprogram

**Files:**
- Modify: `.claude/scripts/kata-cli.ts`

- [ ] **Step 3.1: 写入完整 import + addCommand（按字母序）**

⚠️ `qa-state` 已改名为 `kata-state`，import 要用新名字。

```ts
#!/usr/bin/env bun
/**
 * kata-cli.ts — Unified entry point for kata scripts.
 * (doc comment from Task 1.2)
 */

import { Command } from "commander";
import { program as archiveGen } from "./archive-gen.ts";
import { program as autoFixer } from "./auto-fixer.ts";
import { program as caseSignalAnalyzer } from "./case-signal-analyzer.ts";
import { program as caseStrategyResolver } from "./case-strategy-resolver.ts";
import { program as config } from "./config.ts";
import { program as createProject } from "./create-project.ts";
import { program as discuss } from "./discuss.ts";
import { program as formatCheckScript } from "./format-check-script.ts";
import { program as formatReportLocator } from "./format-report-locator.ts";
import { program as historyConvert } from "./history-convert.ts";
import { program as imageCompress } from "./image-compress.ts";
import { program as kataState } from "./kata-state.ts";
import { program as knowledgeKeeper } from "./knowledge-keeper.ts";
import { program as plan } from "./plan.ts";
import { program as pluginLoader } from "./plugin-loader.ts";
import { program as prdFrontmatter } from "./prd-frontmatter.ts";
import { program as repoProfile } from "./repo-profile.ts";
import { program as repoSync } from "./repo-sync.ts";
import { program as reportToPdf } from "./report-to-pdf.ts";
import { program as ruleLoader } from "./rule-loader.ts";
import { program as runTestsNotify } from "./run-tests-notify.ts";
import { program as searchFilter } from "./search-filter.ts";
import { program as sourceAnalyze } from "./source-analyze.ts";
import { program as uiAutotestProgress } from "./ui-autotest-progress.ts";
import { program as writerContextBuilder } from "./writer-context-builder.ts";
import { program as xmindGen } from "./xmind-gen.ts";
import { program as xmindPatch } from "./xmind-patch.ts";

const kata = new Command()
  .name("kata-cli")
  .description("kata unified CLI — dispatches to scripts under .claude/scripts/")
  .showHelpAfterError();

kata.addCommand(archiveGen);
kata.addCommand(autoFixer);
kata.addCommand(caseSignalAnalyzer);
kata.addCommand(caseStrategyResolver);
kata.addCommand(config);
kata.addCommand(createProject);
kata.addCommand(discuss);
kata.addCommand(formatCheckScript);
kata.addCommand(formatReportLocator);
kata.addCommand(historyConvert);
kata.addCommand(imageCompress);
kata.addCommand(kataState);
kata.addCommand(knowledgeKeeper);
kata.addCommand(plan);
kata.addCommand(pluginLoader);
kata.addCommand(prdFrontmatter);
kata.addCommand(repoProfile);
kata.addCommand(repoSync);
kata.addCommand(reportToPdf);
kata.addCommand(ruleLoader);
kata.addCommand(runTestsNotify);
kata.addCommand(searchFilter);
kata.addCommand(sourceAnalyze);
kata.addCommand(uiAutotestProgress);
kata.addCommand(writerContextBuilder);
kata.addCommand(xmindGen);
kata.addCommand(xmindPatch);

kata.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`[kata-cli] Unexpected error: ${err}\n`);
  process.exit(1);
});

export { kata };
```

- [ ] **Step 3.2: 核查全局 CLI 工作**

```bash
kata-cli --help
```

Expected: 列出 27 个 commands，exit 0。

- [ ] **Step 3.3: 抽查 3 个模块嵌套 help**

```bash
kata-cli xmind-gen --help
kata-cli kata-state --help
kata-cli archive-gen --help
```

Expected: 各自 usage + subcommands 正常显示。

- [ ] **Step 3.4: 抽查业务命令 end-to-end**

```bash
kata-cli rule-loader load --project dataAssets | head -3
kata-cli knowledge-keeper write --help | grep "choices:"
```

Expected: 第一行 JSON 起始 `{`；第二行看到 `(choices: "term", ...)` 字样。

- [ ] **Step 3.5: Commit**

```bash
git add .claude/scripts/kata-cli.ts
git commit -m "feat: register all 27 subprograms in kata-cli"
```

---

### Task 4: 测试文件统一改用 `kata-cli`

**Files:** 约 27 个测试文件（`.claude/scripts/__tests__/*.test.ts`）

- [ ] **Step 4.1: 列出待改测试**

```bash
grep -rln "\.claude/scripts/.*\.ts" .claude/scripts/__tests__/
```

- [ ] **Step 4.2: 批量替换 exec 模式**

每个测试做两种替换：

```diff
-    const stdout = execFileSync(
-      "bun",
-      ["run", ".claude/scripts/rule-loader.ts", ...args],
-      { ... }
-    );
+    const stdout = execFileSync(
+      "kata-cli",
+      ["rule-loader", ...args],
+      { ... }
+    );
```

正则批量替换：

```bash
find .claude/scripts/__tests__ -type f -name "*.test.ts" -exec \
  perl -i -pe 's#"bun",\s*\[\s*"run",\s*"\.claude/scripts/([a-z0-9-]+)\.ts"#"kata-cli", ["$1"#g' {} \;
```

（模式复杂时回退手工改——每个测试约需 2-5 分钟 review。）

另一种模式，`spawn("bun", ["run", ...])`：

```bash
find .claude/scripts/__tests__ -type f -name "*.test.ts" -exec \
  perl -i -pe 's#spawn\("bun",\s*\["run",\s*"\.claude/scripts/([a-z0-9-]+)\.ts"#spawn("kata-cli", ["$1"#g' {} \;
```

- [ ] **Step 4.3: 残留扫描**

```bash
grep -rn "\.claude/scripts/.*\.ts" .claude/scripts/__tests__/
```

Expected: 仅保留 import 语句（`import { foo } from "../lib/xxx.ts"`），不再有 `.claude/scripts/xxx.ts` 作为 CLI 调用参数的场景。

- [ ] **Step 4.4: 跑全量测试**

```bash
bun run test 2>&1 | tail -5
```

Expected: pass 数与 main 基线一致（819 pass / 2 pre-existing fail；若新增 fail 说明替换有漏洞）。

- [ ] **Step 4.5: Commit**

```bash
git add .claude/scripts/__tests__/
git commit -m "refactor: tests invoke scripts via kata-cli"
```

---

### Task 5: skill / agent / reference 替换脚本引用

**Files:** 约 87 个 `.md` 文件

- [ ] **Step 5.1: 扫描**

```bash
grep -rln "bun run \.claude/scripts/" .claude/skills/ .claude/agents/ .claude/references/
```

- [ ] **Step 5.2: 批量替换**

```bash
find .claude/skills .claude/agents .claude/references \
  -type f -name "*.md" -exec \
  sed -i '' -E 's|bun run \.claude/scripts/([a-z0-9-]+)\.ts|kata-cli \1|g' {} \;
```

- [ ] **Step 5.3: 残留检查**

```bash
grep -rln "bun run \.claude/scripts/" .claude/skills/ .claude/agents/ .claude/references/
```

Expected: 无输出。若有，按拼接字符串边缘情况手工 Edit。

- [ ] **Step 5.4: 抽查**

```bash
git diff .claude/skills/hotfix-case-gen/SKILL.md \
         .claude/skills/test-case-gen/workflow/main.md \
         .claude/skills/knowledge-keeper/workflow/write.md
```

- [ ] **Step 5.5: Commit**

```bash
git add .claude/skills/ .claude/agents/ .claude/references/
git commit -m "refactor: skills/agents/refs invoke scripts via kata-cli directly"
```

---

### Task 6: `qa-flow` → `kata` 全量关键词替换

**Files:** 约 50+ 活文件（排除 `docs/refactor/archive/**`、`bun.lock`、`workspace/**`）

- [ ] **Step 6.1: 列出待替换**

```bash
grep -rln "qa-flow" . \
  --include="*.md" --include="*.ts" --include="*.json" \
  --include="*.hbs" --include="*.example" --include="*.svg" \
  --include="*.drawio" \
  | grep -v "docs/refactor/archive/" \
  | grep -v "^bun.lock" \
  | grep -v "workspace/.*/\.audit\.jsonl" \
  | grep -v "workspace/.*/knowledge/" \
  | grep -v "^node_modules/"
```

- [ ] **Step 6.2: 分层替换（长串先行，避免误伤）**

```bash
# 1. GitHub URL
find . -type f \( -name "*.md" -o -name "*.ts" -o -name "*.json" -o -name "*.hbs" -o -name "*.example" -o -name "*.svg" -o -name "*.drawio" \) \
  -not -path "./docs/refactor/archive/*" \
  -not -path "./workspace/*" \
  -not -path "./node_modules/*" \
  -not -name "bun.lock" \
  -exec sed -i '' 's|github\.com/koco-co/qa-flow|github.com/koco-co/kata|g' {} \;

# 2. Slash 命令 /qa-flow → /kata（先处理带空格/子命令变体）
find .claude docs templates . -maxdepth 1 -type f \( -name "*.md" -o -name "*.hbs" \) \
  -not -path "*/archive/*" 2>/dev/null | while read f; do
  sed -i '' \
    -e 's|/qa-flow init|/kata init|g' \
    -e 's|/qa-flow help|/kata help|g' \
    -e 's|/qa-flow \([0-9]\)|/kata \1|g' \
    -e 's|/qa-flow$|/kata|g' \
    -e 's|/qa-flow |/kata |g' \
    "$f"
done

# 3. 展示名 QAFlow → Kata
sed -i '' 's|QAFlow|Kata|g' README.md README-EN.md

# 4. README 的 badge URL
sed -i '' 's|QAFlow-2\.0|Kata-2.0|g' README.md README-EN.md

# 5. 兜底替换剩余 qa-flow → kata
find . -type f \( -name "*.md" -o -name "*.ts" -o -name "*.json" -o -name "*.hbs" -o -name "*.example" -o -name "*.svg" -o -name "*.drawio" \) \
  -not -path "./docs/refactor/archive/*" \
  -not -path "./workspace/*" \
  -not -path "./node_modules/*" \
  -not -name "bun.lock" \
  -exec sed -i '' 's|qa-flow|kata|g' {} \;
```

- [ ] **Step 6.3: 手工 review 高风险位置**

```bash
# 关键活文档
head -20 README.md
head -20 README-EN.md
head -10 CLAUDE.md
head -10 INSTALL.md
cat package.json | head -10

# SVG/drawio 文字标签（人眼 review 是否断裂）
git diff assets/diagrams/
```

- [ ] **Step 6.4: 跑验证**

```bash
bun run type-check
bun run test 2>&1 | tail -5
```

Expected: 持平基线。

- [ ] **Step 6.5: Commit**

```bash
git add -A
git commit -m "refactor: rename qa-flow to kata across all active files"
```

---

### Task 7: 重命名 `.claude/skills/qa-flow/` 目录

**Files:**
- Rename: `.claude/skills/qa-flow/` → `.claude/skills/kata/`
- Modify: `.claude/skills/kata/SKILL.md` frontmatter

- [ ] **Step 7.1: 重命名**

```bash
git mv .claude/skills/qa-flow .claude/skills/kata
```

- [ ] **Step 7.2: 确认 frontmatter 已改**

Task 6 的批量替换应该已改到了 `.claude/skills/qa-flow/SKILL.md`（现路径 `.claude/skills/kata/SKILL.md`）。核查：

```bash
head -5 .claude/skills/kata/SKILL.md
```

Expected:
```yaml
---
name: kata
description: "QA 测试工作流入口。展示功能菜单并路由到对应 skill。触发词：kata、功能菜单、帮助。..."
---
```

如 `name:` 字段还是 `qa-flow`（没被替换或手工漏掉），手动修：

```bash
sed -i '' '1,10s|^name: qa-flow|name: kata|' .claude/skills/kata/SKILL.md
```

- [ ] **Step 7.3: 全仓库扫残留**

```bash
grep -rln "qa-flow" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=archive \
  --exclude=bun.lock | grep -v "workspace/.*/\.audit\.jsonl"
```

Expected: 0 行（或仅剩运行时产物）。

- [ ] **Step 7.4: Commit**

```bash
git add .claude/skills/
git commit -m "refactor: rename qa-flow skill directory to kata"
```

---

### Task 8: 终极验证 + git remote + push

- [ ] **Step 8.1: 再跑一次 bun install + bun link（以防 name 字段改动后 link 失效）**

```bash
bun install
bun link
which kata-cli
kata-cli --help | head -30
```

- [ ] **Step 8.2: 全量 CI**

```bash
bun run ci
```

Expected: lint + type-check + test 三阶段全绿。

- [ ] **Step 8.3: 全仓库残留扫描（终极关卡）**

```bash
# 无旧项目名
grep -rln "qa-flow" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=archive \
  --exclude=bun.lock \
  | grep -v "workspace/.*/\.audit\.jsonl"

# 无旧脚本直连调用
grep -rln "bun run \.claude/scripts/" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=archive

# 无旧 slash 命令
grep -rln "/qa-flow" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=archive
```

Expected: 三条都无输出。

- [ ] **Step 8.4: 切换 git remote**

```bash
git remote set-url origin https://github.com/koco-co/kata.git
git remote -v
```

- [ ] **Step 8.5: Push**

```bash
git push origin main
```

---

### Task 9: （用户手动执行）本地目录改名

> ⚠️ 涉及 Claude Code 工作目录切换，只能在**会话外**完成。

- [ ] **Step 9.1: 关闭 Claude Code，终端执行**

```bash
mv /Users/poco/Projects/qa-flow /Users/poco/Projects/kata
cd /Users/poco/Projects/kata
bun link  # 重建 bin symlink 指向新路径
```

- [ ] **Step 9.2: （可选）迁移 memory**

```bash
mv ~/.claude/projects/-Users-poco-Projects-qa-flow ~/.claude/projects/-Users-poco-Projects-kata
```

- [ ] **Step 9.3: 重启 Claude Code**

在新路径下 `claude` 启动新会话。

---

## Self-Review

### Spec coverage

| 需求                                   | Task                   |
| -------------------------------------- | ---------------------- |
| 直接用 `kata-cli`（无 `bun run` 前缀） | Task 1.4 bin + 1.5 bun link |
| 所有脚本统一走 `kata-cli` 调用         | Task 2 + Task 4 + Task 5 |
| `qa-state` 随大流改名                  | Task 2.5               |
| 移除 `import.meta.main` gate           | Task 2（彻底删）       |
| 全量 `qa-flow` → `kata`                | Task 6 + Task 7        |
| GitHub remote 切换                     | Task 8.4               |
| 归档文件保留                           | 所有 find/grep 都排除 archive |
| `package.json` name 字段 + bin 注册    | Task 1.4               |

### Placeholder 扫描

- ✅ 所有 sed/find 命令完整可执行
- ✅ 每步 commit message 明确
- ✅ Expected 结果每步都有
- ✅ 文件路径全是精确相对路径

### Type consistency

- ✅ 所有脚本统一 `export const program`
- ✅ `kata-cli.ts` import 27 个 program，名字与脚本文件名一一对应
- ✅ `qa-state` → `kata-state` 在 Task 2.5 完整传导到 Task 3 的 import
- ✅ 测试调用方式（`execFileSync("kata-cli", ...)`）与 bin 注册一致

### 已知风险

1. **`bun link` 需要用户在本地执行一次**——CI/其他机器环境下，`bun install` 会自动走 bin 注册（大多数情况），但如有遗漏需补执行。README/INSTALL 要写清楚首次 setup 流程。
2. **测试里 `execFileSync("kata-cli", ...)` 依赖 `$PATH` 里有 `kata-cli`**——Task 1.5 bun link 完成后才满足。Task 2 commit 后到 Task 3 commit 前测试会暂时 fail，属预期中间态。
3. **脚本移除 parse 后直接 `bun run .claude/scripts/xxx.ts` 会没有任何输出**（commander program 导出但不被调用）。这是有意为之——强制所有调用走 `kata-cli`。开发者如需调试单文件，走 `kata-cli xxx --help` 也够用。
4. **SVG / drawio 文字替换**——`architecture.svg` 里的文本节点可能影响视觉，Task 6.3 手工 review。
5. **`qa-state` → `kata-state` 影响面**——16 个文件引用，Task 2.5 批量处理后 Task 8 终极扫描兜底。

---

## Execution Handoff

计划完成。两种执行方式：

1. **Subagent-Driven（用户选择此方式）** — 每个 Task 派发独立 subagent，主 agent 在 Task 之间 two-stage review，保护主上下文。Task 1 ~ Task 8 可派发，Task 9 用户手动执行。
2. **Inline Execution** — 当前会话串行跑，checkpoint 暂停。

用户选 Subagent-Driven，新窗口执行。Prompt 已在会话中给出。
