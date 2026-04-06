# Transform Node Phase 1: Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the TypeScript infrastructure needed by the transform node — repo profile matching, selective repo sync, state management, and frontmatter support.

**Architecture:** New `repo-profile.ts` script manages repo_profiles in `config.json` (read/match/save). Existing `repo-sync.ts` gets a `--profile` batch mode. `state.ts` adds "transform" to its node lifecycle. `prd-frontmatter.ts` handles new fields (repos, confidence, repo_profile).

**Tech Stack:** TypeScript, Node.js, commander CLI, existing lib/paths.ts + lib/env.ts + lib/frontmatter.ts

---

### Task 1: Create config.json with repo_profiles

**Files:**
- Create: `config.json`
- Modify: `.claude/scripts/config.ts`

- [ ] **Step 1: Create config.json**

Create `config.json` at project root:

```json
{
  "repo_profiles": {
    "岚图": {
      "repos": [
        { "path": ".repos/CustomItem/dt-center-assets", "branch": "release_6.3.x_ltqc" },
        { "path": ".repos/CustomItem/dt-insight-studio", "branch": "dataAssets/release_6.3.x_ltqc" }
      ]
    }
  }
}
```

- [ ] **Step 2: Add RepoProfile types and config.json reading to config.ts**

Add these types after the existing `PluginEntry` interface (line 29):

```typescript
interface RepoRef {
  path: string;
  branch: string;
}

interface RepoProfile {
  repos: RepoRef[];
}

type RepoProfiles = Record<string, RepoProfile>;
```

Update `ConfigOutput` interface to include repo_profiles:

```typescript
interface ConfigOutput {
  workspace_dir: string;
  source_repos: string[];
  plugins: Record<string, PluginEntry>;
  repo_profiles: RepoProfiles;
}
```

Add a function to read config.json after `scanPlugins`:

```typescript
function readRepoProfiles(): RepoProfiles {
  const configPath = join(repoRoot(), "config.json");
  if (!existsSync(configPath)) return {};
  try {
    const raw = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
    return (raw.repo_profiles ?? {}) as RepoProfiles;
  } catch (err) {
    process.stderr.write(`[config] failed to parse config.json: ${err}\n`);
    return {};
  }
}
```

Update `buildConfig` to include repo_profiles:

```typescript
function buildConfig(): ConfigOutput {
  initEnv();

  const workspaceDir = getEnv("WORKSPACE_DIR") ?? "workspace";
  const sourceReposRaw = getEnv("SOURCE_REPOS") ?? "";
  const sourceRepos = sourceReposRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const plugins = scanPlugins(pluginsDir());
  const repoProfiles = readRepoProfiles();

  return {
    workspace_dir: workspaceDir,
    source_repos: sourceRepos,
    plugins,
    repo_profiles: repoProfiles,
  };
}
```

Add `repoRoot` to the import from paths.ts:

```typescript
import { pluginsDir, repoRoot } from "./lib/paths.ts";
```

- [ ] **Step 3: Verify config.ts outputs repo_profiles**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
npx tsx .claude/scripts/config.ts
```

Expected: JSON output includes `"repo_profiles": { "岚图": { "repos": [...] } }`

- [ ] **Step 4: Commit**

```bash
git add config.json .claude/scripts/config.ts
git commit -m "feat: add repo_profiles to config.json and config.ts"
```

---

### Task 2: Create repo-profile.ts

**Files:**
- Create: `.claude/scripts/repo-profile.ts`

- [ ] **Step 1: Create repo-profile.ts**

Create `.claude/scripts/repo-profile.ts`:

```typescript
#!/usr/bin/env npx tsx
/**
 * repo-profile.ts — Repo profile management for transform node.
 *
 * Commands:
 *   match  --text <text>         Match a profile by keyword in text (PRD title, path, etc.)
 *   save   --name <n> --repos <json>  Save/update a profile in config.json
 *   list                         List all profiles
 *
 * Usage:
 *   npx tsx .claude/scripts/repo-profile.ts match --text "岚图/15525【内置规则丰富】"
 *   npx tsx .claude/scripts/repo-profile.ts save --name "岚图" --repos '[{"path":".repos/x","branch":"dev"}]'
 *   npx tsx .claude/scripts/repo-profile.ts list
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Command } from "commander";
import { repoRoot } from "./lib/paths.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RepoRef {
  path: string;
  branch: string;
}

interface RepoProfile {
  repos: RepoRef[];
}

type RepoProfiles = Record<string, RepoProfile>;

interface ConfigJson {
  repo_profiles?: RepoProfiles;
  [key: string]: unknown;
}

interface MatchOutput {
  matched: boolean;
  profile_name: string | null;
  repos: RepoRef[];
  all_profiles: string[];
}

// ─── Config I/O ──────────────────────────────────────────────────────────────

function configPath(): string {
  return join(repoRoot(), "config.json");
}

function readConfig(): ConfigJson {
  const p = configPath();
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf8")) as ConfigJson;
  } catch {
    return {};
  }
}

function writeConfig(config: ConfigJson): void {
  writeFileSync(configPath(), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function getProfiles(config: ConfigJson): RepoProfiles {
  return config.repo_profiles ?? {};
}

// ─── Match Logic ─────────────────────────────────────────────────────────────

function matchProfile(text: string, profiles: RepoProfiles): { name: string; profile: RepoProfile } | null {
  const lowerText = text.toLowerCase();

  // Exact key match first
  for (const [name, profile] of Object.entries(profiles)) {
    if (lowerText.includes(name.toLowerCase())) {
      return { name, profile };
    }
  }

  return null;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const program = new Command("repo-profile");
program.description("Manage repo profiles for source code mapping");

// ── match ────────────────────────────────────────────────────────────────────

program
  .command("match")
  .description("Match a repo profile by keyword in text")
  .requiredOption("--text <text>", "Text to search for profile keywords (PRD title, path, etc.)")
  .action((opts: { text: string }) => {
    const config = readConfig();
    const profiles = getProfiles(config);
    const result = matchProfile(opts.text, profiles);

    const output: MatchOutput = {
      matched: result !== null,
      profile_name: result?.name ?? null,
      repos: result?.profile.repos ?? [],
      all_profiles: Object.keys(profiles),
    };

    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  });

// ── save ─────────────────────────────────────────────────────────────────────

program
  .command("save")
  .description("Save or update a repo profile in config.json")
  .requiredOption("--name <name>", "Profile name (e.g. 岚图)")
  .requiredOption("--repos <json>", 'Repos JSON array: [{"path":"...","branch":"..."}]')
  .action((opts: { name: string; repos: string }) => {
    let repos: RepoRef[];
    try {
      repos = JSON.parse(opts.repos) as RepoRef[];
    } catch {
      process.stderr.write(`[repo-profile:save] invalid --repos JSON\n`);
      process.exit(1);
      return;
    }

    const config = readConfig();
    const profiles = getProfiles(config);

    const updated: ConfigJson = {
      ...config,
      repo_profiles: {
        ...profiles,
        [opts.name]: { repos },
      },
    };

    writeConfig(updated);
    process.stdout.write(`${JSON.stringify({ saved: opts.name, repos }, null, 2)}\n`);
  });

// ── list ─────────────────────────────────────────────────────────────────────

program
  .command("list")
  .description("List all repo profiles")
  .action(() => {
    const config = readConfig();
    const profiles = getProfiles(config);

    const entries = Object.entries(profiles).map(([name, profile]) => ({
      name,
      repo_count: profile.repos.length,
      repos: profile.repos,
    }));

    process.stdout.write(`${JSON.stringify(entries, null, 2)}\n`);
  });

program.parse(process.argv);
```

- [ ] **Step 2: Test match command**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
npx tsx .claude/scripts/repo-profile.ts match --text "岚图/15525【内置规则丰富】一致性"
```

Expected:
```json
{
  "matched": true,
  "profile_name": "岚图",
  "repos": [
    { "path": ".repos/CustomItem/dt-center-assets", "branch": "release_6.3.x_ltqc" },
    { "path": ".repos/CustomItem/dt-insight-studio", "branch": "dataAssets/release_6.3.x_ltqc" }
  ],
  "all_profiles": ["岚图"]
}
```

- [ ] **Step 3: Test no-match scenario**

```bash
npx tsx .claude/scripts/repo-profile.ts match --text "标准版需求"
```

Expected:
```json
{
  "matched": false,
  "profile_name": null,
  "repos": [],
  "all_profiles": ["岚图"]
}
```

- [ ] **Step 4: Test save command**

```bash
npx tsx .claude/scripts/repo-profile.ts save --name "标准版" --repos '[{"path":".repos/dt-center-assets","branch":"dev"}]'
```

Expected: `config.json` now has both "岚图" and "标准版" profiles.

- [ ] **Step 5: Test list command**

```bash
npx tsx .claude/scripts/repo-profile.ts list
```

Expected: JSON array with 2 entries.

- [ ] **Step 6: Revert test data and commit**

Remove the "标准版" profile added in step 4 (restore config.json to only have "岚图"):

```bash
git checkout config.json
git add .claude/scripts/repo-profile.ts
git commit -m "feat: add repo-profile.ts for profile matching and management"
```

---

### Task 3: Add batch sync to repo-sync.ts

**Files:**
- Modify: `.claude/scripts/repo-sync.ts`

- [ ] **Step 1: Add --profile command to repo-sync.ts**

Add a new `sync-profile` command after the existing `program.action(...)` block (after line 142). This command takes a profile name, reads the repos from config.json, and syncs each one:

```typescript
program
  .command("sync-profile")
  .description("Sync all repositories in a named profile from config.json")
  .requiredOption("--name <name>", "Profile name (e.g. 岚图)")
  .action((opts: { name: string }) => {
    const configPath = join(repoRoot(), "config.json");
    if (!existsSync(configPath)) {
      process.stderr.write(`${JSON.stringify({ error: "config.json not found", step: "read-config" }, null, 2)}\n`);
      process.exit(1);
    }

    let profiles: Record<string, { repos: Array<{ path: string; branch: string }> }>;
    try {
      const raw = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
      profiles = (raw.repo_profiles ?? {}) as typeof profiles;
    } catch (err) {
      process.stderr.write(`${JSON.stringify({ error: `Failed to parse config.json: ${err}`, step: "read-config" }, null, 2)}\n`);
      process.exit(1);
      return;
    }

    const profile = profiles[opts.name];
    if (!profile) {
      process.stderr.write(`${JSON.stringify({ error: `Profile "${opts.name}" not found. Available: ${Object.keys(profiles).join(", ")}`, step: "find-profile" }, null, 2)}\n`);
      process.exit(1);
      return;
    }

    const results: SyncOutput[] = [];
    const errors: ErrorOutput[] = [];

    for (const repoRef of profile.repos) {
      const absolutePath = resolve(repoRoot(), repoRef.path);
      const parts = repoRef.path.split("/");
      const repoName = parts.pop() ?? "";
      const groupName = parts.pop() ?? "";

      if (!existsSync(absolutePath)) {
        errors.push({ error: `Repository not found at ${absolutePath}. Clone it first with: npx tsx .claude/scripts/repo-sync.ts --url <git-url> --branch ${repoRef.branch}`, step: "check-path" });
        continue;
      }

      try {
        git(absolutePath, ["fetch", "origin"]);
        git(absolutePath, ["checkout", repoRef.branch]);
        git(absolutePath, ["pull", "origin", repoRef.branch]);

        let commit = "unknown";
        try {
          commit = git(absolutePath, ["rev-parse", "--short", "HEAD"]);
        } catch {
          // non-fatal
        }

        results.push({
          repo: repoName,
          group: groupName,
          branch: repoRef.branch,
          commit,
          path: absolutePath,
        });
      } catch (err) {
        errors.push({
          error: `Sync failed for ${repoRef.path}@${repoRef.branch}: ${err instanceof Error ? err.message : String(err)}`,
          step: "sync",
        });
      }
    }

    const output = { profile: opts.name, synced: results, errors };
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

    if (errors.length > 0 && results.length === 0) {
      process.exit(1);
    }
  });
```

Also add missing imports at the top of the file:

```typescript
import { existsSync, mkdirSync, readFileSync } from "node:fs";
```

(Add `readFileSync` to the existing import.)

- [ ] **Step 2: Verify existing command still works**

```bash
npx tsx .claude/scripts/repo-sync.ts --help
```

Expected: Shows both the default command options AND the new `sync-profile` subcommand.

- [ ] **Step 3: Test sync-profile command (dry verification)**

```bash
npx tsx .claude/scripts/repo-sync.ts sync-profile --name "不存在的profile"
```

Expected: Error JSON with `"Profile \"不存在的profile\" not found"`.

- [ ] **Step 4: Commit**

```bash
git add .claude/scripts/repo-sync.ts
git commit -m "feat: add sync-profile command for batch repo sync by profile name"
```

---

### Task 4: Add transform node to state.ts

**Files:**
- Modify: `.claude/scripts/state.ts`

- [ ] **Step 1: Update state.ts to recognize transform as a valid node**

The `state.ts` currently doesn't have a node enum — it accepts any string for `current_node`. The node ordering is managed by the SKILL.md prompt, not by the script. So the only change needed is documenting the new node order in the file header comment.

Update the file header comment (line 1-11):

```typescript
#!/usr/bin/env npx tsx
/**
 * state.ts — Breakpoint resume state management CLI.
 *
 * Node lifecycle: init → transform → enhance → analyze → write → review → output
 *
 * Usage:
 *   npx tsx .claude/scripts/state.ts init --prd workspace/prds/202604/xxx.md --mode normal
 *   npx tsx .claude/scripts/state.ts update --prd-slug xxx --node transform --data '{"confidence":0.85}'
 *   npx tsx .claude/scripts/state.ts resume --prd-slug xxx
 *   npx tsx .claude/scripts/state.ts clean --prd-slug xxx
 *   npx tsx .claude/scripts/state.ts --help
 */
```

No functional code changes needed — `state.ts` already accepts arbitrary node names.

- [ ] **Step 2: Verify state init → update with transform node works**

```bash
cd /Users/poco/Documents/DTStack/qa-flow
npx tsx .claude/scripts/state.ts init --prd workspace/prds/202604/test-transform.md --mode normal
npx tsx .claude/scripts/state.ts update --prd-slug test-transform --node transform --data '{"confidence":0.85,"clarify_count":2}'
npx tsx .claude/scripts/state.ts resume --prd-slug test-transform
```

Expected: resume output shows `"current_node": "transform"` and `"node_outputs": { "transform": { "confidence": 0.85, "clarify_count": 2 } }`.

- [ ] **Step 3: Clean up test state and commit**

```bash
npx tsx .claude/scripts/state.ts clean --prd-slug test-transform
git add .claude/scripts/state.ts
git commit -m "docs: update state.ts node lifecycle to include transform"
```

---

### Task 5: Update prd-frontmatter.ts for new fields

**Files:**
- Modify: `.claude/scripts/prd-frontmatter.ts`
- Modify: `.claude/scripts/lib/frontmatter.ts`

- [ ] **Step 1: Update FrontMatter type to support nested objects**

The current `FrontMatter` interface only supports `string | number | boolean | string[]`. The new `repos` field needs object arrays. Update `.claude/scripts/lib/frontmatter.ts`:

Change the `FrontMatter` interface (line 1-3):

```typescript
export interface RepoFrontMatter {
  path: string;
  branch: string;
  commit?: string;
}

export interface FrontMatter {
  [key: string]: string | number | boolean | string[] | RepoFrontMatter[] | undefined;
}
```

Update `serializeFrontMatter` (line 62-81) to handle `RepoFrontMatter[]`:

```typescript
export function serializeFrontMatter(fm: FrontMatter): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(fm)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else if (typeof value[0] === "string") {
        lines.push(`${key}:`);
        for (const item of value as string[]) lines.push(`  - "${item}"`);
      } else {
        // Object array (e.g. repos)
        lines.push(`${key}:`);
        for (const item of value as RepoFrontMatter[]) {
          const obj = item as Record<string, string | undefined>;
          const parts = Object.entries(obj)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => `${k}: "${v}"`)
            .join(", ");
          lines.push(`  - { ${parts} }`);
        }
      }
    } else if (typeof value === "string") {
      lines.push(`${key}: "${value}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}
```

Update `parseFrontMatter` to handle inline object arrays. Add after the existing array item handling (after line 30):

```typescript
    // Handle inline object: `  - { path: "...", branch: "..." }`
    if (trimmed.startsWith("- {") && currentKey && currentArray) {
      const inner = trimmed.slice(3, -1).trim(); // strip "- { ... }"
      const obj: Record<string, string> = {};
      for (const pair of inner.split(",")) {
        const ci = pair.indexOf(":");
        if (ci === -1) continue;
        const k = pair.slice(0, ci).trim();
        const v = pair.slice(ci + 1).trim().replace(/^["']|["']$/g, "");
        obj[k] = v;
      }
      (currentArray as unknown[]).push(obj);
      fm[currentKey] = currentArray;
      continue;
    }
```

- [ ] **Step 2: Add confidence and repo_profile normalization to prd-frontmatter.ts**

Add after the existing status normalization block (after line 96 in prd-frontmatter.ts):

```typescript
    // Ensure confidence is a number between 0 and 1
    if (fm.confidence !== undefined) {
      const conf = Number(fm.confidence);
      if (Number.isNaN(conf) || conf < 0 || conf > 1) {
        fm.confidence = undefined;
        changes.push(`removed invalid confidence: "${fm.confidence}"`);
      }
    }

    // Normalize repo_profile (no transformation needed, just validate it exists)
    if (fm.repo_profile && typeof fm.repo_profile === "string") {
      // Valid — keep as is
    }
```

- [ ] **Step 3: Test frontmatter round-trip with new fields**

Create a temporary test file and verify:

```bash
cat > /tmp/test-fm.md << 'EOF'
---
source: "lanhu"
project: "岚图"
repo_profile: "岚图"
repos:
  - { path: ".repos/CustomItem/dt-center-assets", branch: "release_6.3.x_ltqc", commit: "abc1234" }
  - { path: ".repos/CustomItem/dt-insight-studio", branch: "dataAssets/release_6.3.x_ltqc" }
confidence: 0.85
status: "已增强"
---

# Test PRD
EOF

npx tsx .claude/scripts/prd-frontmatter.ts normalize --file /tmp/test-fm.md --dry-run
cat /tmp/test-fm.md
```

Expected: frontmatter preserved correctly, `repos` field parsed and serialized as inline objects.

- [ ] **Step 4: Clean up and commit**

```bash
rm /tmp/test-fm.md
git add .claude/scripts/lib/frontmatter.ts .claude/scripts/prd-frontmatter.ts
git commit -m "feat: support repos, repo_profile, confidence in frontmatter"
```

---

### Task 6: Create reference docs (PRD template + CLARIFY protocol)

**Files:**
- Create: `.claude/skills/test-case-gen/references/prd-template.md`
- Create: `.claude/skills/test-case-gen/references/clarify-protocol.md`

- [ ] **Step 1: Create prd-template.md**

Create `.claude/skills/test-case-gen/references/prd-template.md`:

```markdown
# 测试增强 PRD 模板

> 本模板由 transform 节点使用，将蓝湖原始素材 + 源码分析 + 归档参考转化为结构化 PRD。

## 信息来源标注（四色标注）

所有填充内容必须标注来源：

- 🟢 **蓝湖原文**：直接来自 PRD 描述或截图
- 🔵 **源码推断**：从代码中提取，格式 `🔵 \`文件名:行号\``
- 🟡 **历史参考**：从归档用例中推断，格式 `🟡 归档#需求ID`
- 🔴 **待确认**：三方均无法确定，收集到 CLARIFY 块

## 模板结构

### Part 1: Frontmatter

```yaml
---
source: lanhu
source_url: "<蓝湖URL>"
fetch_date: "<YYYY-MM-DD>"
project: "<项目名>"
version: "<版本号>"
requirement_id: <需求ID>
requirement_name: "<需求名称>"
modules:
  - "<模块名>"
repo_profile: "<匹配的profile名>"
repos:
  - { path: "<仓库路径>", branch: "<分支>", commit: "<SHA>" }
confidence: <0.0-1.0>
status: "已增强"
---
```

### Part 2: 需求概述

```markdown
# <需求名称>

## 需求概述

| 项目 | 内容 |
|------|------|
| 开发版本 | <版本号 + 分支描述> |
| 需求背景 | <从蓝湖文字描述提取> |
| 影响模块 | <模块路径> |
| 导航路径 | <从前端路由代码提取> |
| 关联需求 | <同文档其他页面> |
```

### Part 3: 页面级结构（每个蓝湖页面一个章节）

```markdown
## 页面：<页面名称>

> 📍 导航路径：<菜单 → 子菜单 → 页面>
> 📸 来源：蓝湖第 N 页

![<描述>](images/<文件名>)

### 字段定义

| 字段名 | 控件类型 | 必填 | 校验规则 | 默认值 | 来源 |
|--------|---------|------|---------|--------|------|

### 交互逻辑

1. <编号列表，每条带来源标注>

### 状态/业务规则

- <列表，每条带来源标注>

### 异常处理

| 场景 | 系统行为 | 来源 |
|------|---------|------|
```

### Part 4: 跨页面关联

```markdown
## 跨页面关联

| 触发页面 | 操作 | 目标页面 | 联动效果 | 来源 |
|----------|------|----------|---------|------|

## 权限说明

| 角色 | 操作1 | 操作2 | ... | 来源 |
|------|-------|-------|-----|------|

## 数据格式

| 数据项 | 格式 | 示例 | 来源 |
|--------|------|------|------|
```

### Part 5: 留痕

```markdown
## 待确认项

| 编号 | 问题 | 位置 | 确认结果 | 确认时间 |
|------|------|------|---------|---------|

## 变更记录

| 版本 | 日期 | 变更内容 | 来源 |
|------|------|---------|------|
```

## 健康度检查覆盖映射

| 检查项 | 模板章节 |
|--------|---------|
| W001 字段定义表 | Part 3 → 字段定义 |
| W002 权限说明 | Part 4 → 权限说明 |
| W003 异常处理 | Part 3 → 异常处理 |
| W004 状态流转 | Part 3 → 状态/业务规则 |
| W005 接口定义 | Part 3 → 交互逻辑（含接口引用）|
| W006 分页说明 | Part 4 → 数据格式 |
| W007 导航路径 | Part 2 → 需求概述 + Part 3 → 页面头部 |
| W008 数据格式 | Part 4 → 数据格式 |
```

- [ ] **Step 2: Create clarify-protocol.md**

Create `.claude/skills/test-case-gen/references/clarify-protocol.md`:

```markdown
# CLARIFY 中转协议

> transform subagent 与主 agent 之间的需求澄清交互协议。

## 触发条件

transform subagent 在分析过程中遇到**蓝湖、源码、归档三方均无法确定**的信息时，将待确认项收集到 CLARIFY 块。

## 协议格式

### subagent → 主 agent（CLARIFY 块）

在 transform 输出的 PRD 末尾附加：

```
## CLARIFY

### Q1
- **问题**: <具体问题>
- **上下文**: <为什么无法确定——蓝湖说了什么、源码中找到什么、归档中没有什么>
- **位置**: <页面名 → 章节 → 字段/规则>
- **推荐**: <推荐选项字母，如 B>
- **选项**:
  - A: <选项描述>
  - B: <选项描述>（<推荐理由>）
  - C: <选项描述>

### Q2
...
```

### 主 agent 处理流程

1. 解析 CLARIFY 块，提取所有 Q 项
2. 逐个向用户展示选择框（使用 AskUserQuestion 工具），包含：
   - 问题描述 + 上下文摘要
   - 推荐答案（默认选中）
   - 备选答案
   - "自行输入"选项（始终可用）
3. 收集所有确认结果
4. 打包为 CONFIRMED 块，通过 SendMessage 发回 subagent

### 主 agent → subagent（CONFIRMED 块）

```
## CONFIRMED

- Q1: B — 不允许，过滤掉类型不一致的字段
- Q2: A — 阻断提交，提示"主键类型不一致"
```

### subagent 处理 CONFIRMED

1. 解析每个 Q 的确认结果
2. 将确认结果合入 PRD 对应位置，将 🔴 标记替换为 🟢
3. 更新「待确认项」汇总表
4. 追加「变更记录」
5. 检查是否产生新的待确认项
   - 有新项 → 输出新的 CLARIFY 块 → 循环
   - 无新项 → 输出最终 PRD → transform 节点结束

## 循环终止

- 最多 3 轮 CLARIFY 循环
- 第 3 轮仍有待确认项时，标记为 🟡 并附注"默认采用推荐选项"
- 无待确认项时 → 输出最终 PRD

## 与 BLOCKED 协议的区别

| | CLARIFY | BLOCKED |
|---|---------|---------|
| 使用节点 | transform | write |
| 触发时机 | PRD 结构化阶段 | 用例编写阶段 |
| 问题粒度 | 需求级（字段定义、业务规则） | 用例级（某条用例的前置条件） |
| 推荐答案 | 必须提供（基于源码/归档推断） | 可选提供 |
| 循环上限 | 3 轮 | 无限制 |
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/test-case-gen/references/prd-template.md .claude/skills/test-case-gen/references/clarify-protocol.md
git commit -m "docs: add PRD template and CLARIFY protocol reference docs"
```

---

### Task 7: Verify all infrastructure components work together

**Files:** None (verification only)

- [ ] **Step 1: Verify config.ts outputs repo_profiles**

```bash
npx tsx .claude/scripts/config.ts | python3 -c "import sys,json; d=json.load(sys.stdin); print('repo_profiles:', list(d.get('repo_profiles',{}).keys()))"
```

Expected: `repo_profiles: ['岚图']`

- [ ] **Step 2: Verify repo-profile match**

```bash
npx tsx .claude/scripts/repo-profile.ts match --text "岚图/15525【内置规则丰富】"
```

Expected: `"matched": true, "profile_name": "岚图"`

- [ ] **Step 3: Verify state lifecycle with transform node**

```bash
npx tsx .claude/scripts/state.ts init --prd workspace/prds/202604/infra-test.md --mode normal
npx tsx .claude/scripts/state.ts update --prd-slug infra-test --node transform --data '{"confidence":0.85}'
npx tsx .claude/scripts/state.ts update --prd-slug infra-test --node enhance --data '{"health_score":90}'
npx tsx .claude/scripts/state.ts resume --prd-slug infra-test | python3 -c "import sys,json; d=json.load(sys.stdin); print('nodes:', d['completed_nodes'])"
npx tsx .claude/scripts/state.ts clean --prd-slug infra-test
```

Expected: `nodes: ['transform', 'enhance']`

- [ ] **Step 4: Verify frontmatter round-trip**

```bash
cat > /tmp/infra-test-fm.md << 'TESTEOF'
---
source: "lanhu"
repo_profile: "岚图"
repos:
  - { path: ".repos/CustomItem/dt-center-assets", branch: "release_6.3.x_ltqc", commit: "abc1234" }
confidence: 0.85
status: "draft"
---

# Test
TESTEOF

npx tsx .claude/scripts/prd-frontmatter.ts normalize --file /tmp/infra-test-fm.md
cat /tmp/infra-test-fm.md | head -12
rm /tmp/infra-test-fm.md
```

Expected: `status` normalized to "草稿", `repos` preserved, `confidence` preserved.

- [ ] **Step 5: Final commit if fixes needed**

Only if any step required code fixes:
```bash
git add -A && git commit -m "fix: adjustments from infrastructure integration test"
```
