# qa-flow v2.0 P0: Foundation + Core Scripts + test-case-gen

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete foundation layer (project skeleton, shared TS scripts, plugin loader) and the core test-case-gen skill, producing a working CLI toolset where every script responds to `--help` and passes its tests.

**Architecture:** Shell-orchestrated SKILL.md (< 500 lines) dispatches to TS scripts via explicit commands. Scripts output JSON to stdout, logs to stderr. Plugin system discovers integrations from `plugins/*/plugin.json` based on `.env` variables.

**Tech Stack:** TypeScript (ESM) / Node.js 22+ / tsx / xmind-generator / JSZip / Biome / Handlebars

**Spec:** `docs/superpowers/specs/2026-04-05-qa-flow-v2-design.md`

**Scope:** P0 only. P1 (setup/qa-flow/xmind-editor skills) and P2/P3 (code-analysis/plugins/ui-autotest) are separate plans.

---

## File Structure

### New files to create

```
# Project root
package.json
tsconfig.json
biome.json
.gitignore
.env.example
CLAUDE.md
preferences.md
LICENSE

# Shared library
.claude/scripts/lib/env.ts
.claude/scripts/lib/paths.ts
.claude/scripts/lib/frontmatter.ts
.claude/scripts/tsconfig.json

# Core scripts
.claude/scripts/config.ts
.claude/scripts/state.ts
.claude/scripts/plugin-loader.ts
.claude/scripts/xmind-gen.ts
.claude/scripts/xmind-edit.ts
.claude/scripts/archive-gen.ts
.claude/scripts/prd-frontmatter.ts
.claude/scripts/repo-sync.ts
.claude/scripts/image-compress.ts
.claude/scripts/history-convert.ts

# Tests
.claude/scripts/__tests__/config.test.ts
.claude/scripts/__tests__/state.test.ts
.claude/scripts/__tests__/plugin-loader.test.ts
.claude/scripts/__tests__/xmind-gen.test.ts
.claude/scripts/__tests__/xmind-edit.test.ts
.claude/scripts/__tests__/archive-gen.test.ts
.claude/scripts/__tests__/lib/env.test.ts
.claude/scripts/__tests__/lib/paths.test.ts
.claude/scripts/__tests__/lib/frontmatter.test.ts

# Templates
templates/archive.md.hbs

# test-case-gen skill
.claude/skills/test-case-gen/SKILL.md
.claude/skills/test-case-gen/prompts/enhance.md
.claude/skills/test-case-gen/prompts/analyze.md
.claude/skills/test-case-gen/prompts/writer.md
.claude/skills/test-case-gen/prompts/reviewer.md
.claude/skills/test-case-gen/references/test-case-rules.md
.claude/skills/test-case-gen/references/intermediate-format.md
.claude/skills/test-case-gen/references/xmind-structure.md

# Plugin stubs (structure only, implementation in Plan 3)
plugins/lanhu/plugin.json
plugins/zentao/plugin.json
plugins/notify/plugin.json

# Workspace template
workspace/.gitkeep
```

### Files to delete (clean v1 artifacts from branch)

All files under `.claude/skills/` (v1 skills), `.claude/shared/`, `.claude/rules/`, `.claude/tests/`, `.claude/config.json`, `tools/`, `config/`, `cases/`, `reports/`, `tests/`, old `CLAUDE.md`, old `package.json`, `skills-lock.json`, `bun.lock`, `playwright.config.ts`, `CHANGELOG.md`.

> **Critical:** This is a new project on the `qa-flow-v2.0` branch. Remove all v1 artifacts first, then build v2 from scratch.

---

## Task 1: Clean Branch + Project Skeleton

**Files:**
- Delete: all v1 files (see list above)
- Create: `package.json`, `tsconfig.json`, `biome.json`, `.gitignore`, `.env.example`, `LICENSE`

- [ ] **Step 1: Remove v1 artifacts**

```bash
# Remove all v1 directories and files, keeping only .git and docs/
git rm -r --cached .claude/skills .claude/shared .claude/rules .claude/tests .claude/config.json .claude/settings.json .claude/settings.local.json .claude/tmp tools config cases reports tests .playwright-cli .auth assets CLAUDE.md CHANGELOG.md README.md package.json bun.lock skills-lock.json playwright.config.ts .vscode 2>/dev/null || true
rm -rf .claude/skills .claude/shared .claude/rules .claude/tests .claude/config.json .claude/settings.json .claude/settings.local.json .claude/tmp tools config cases reports tests .playwright-cli .auth assets CHANGELOG.md bun.lock skills-lock.json playwright.config.ts .vscode
```

- [ ] **Step 2: Create directory structure**

```bash
mkdir -p .claude/scripts/lib
mkdir -p .claude/scripts/__tests__/lib
mkdir -p .claude/skills/test-case-gen/prompts
mkdir -p .claude/skills/test-case-gen/references
mkdir -p plugins/lanhu
mkdir -p plugins/zentao
mkdir -p plugins/notify
mkdir -p templates
mkdir -p workspace
touch workspace/.gitkeep
```

- [ ] **Step 3: Create package.json**

```json
{
  "name": "qa-flow",
  "version": "2.0.0",
  "type": "module",
  "private": true,
  "description": "AI-driven QA test case generation workflow built on Claude Code Skills",
  "scripts": {
    "check": "biome check .",
    "check:fix": "biome check --fix .",
    "test": "npx tsx --test .claude/scripts/__tests__/**/*.test.ts",
    "test:watch": "npx tsx --test --watch .claude/scripts/__tests__/**/*.test.ts"
  },
  "dependencies": {
    "commander": "^13.1.0",
    "handlebars": "^4.7.8",
    "jszip": "^3.10.1",
    "xmind-generator": "^1.0.1"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.0.0",
    "@playwright/test": "^1.59.1",
    "tsx": "^4.19.0",
    "typescript": "^5.8.0"
  },
  "engines": {
    "node": ">=22.0.0"
  }
}
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2024"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": false,
    "noEmit": true,
    "rootDir": ".",
    "baseUrl": "."
  },
  "include": [".claude/scripts/**/*.ts", "plugins/**/*.ts"],
  "exclude": ["node_modules", "workspace"]
}
```

- [ ] **Step 5: Create biome.json**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "organizeImports": { "enabled": true },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "warn",
        "noUnusedImports": "warn"
      },
      "style": {
        "noNonNullAssertion": "off"
      }
    }
  },
  "files": {
    "ignore": ["node_modules", "workspace", "*.md", "*.hbs"]
  }
}
```

- [ ] **Step 6: Create .gitignore**

```
node_modules/
workspace/
!workspace/.gitkeep
.env
.DS_Store
*.log
.temp/
.auth/
.trash/
```

- [ ] **Step 7: Create .env.example**

```bash
# ══════════════════════════════════════════════
# qa-flow v2.0 统一配置
# 复制为 .env 并填入实际值。.env 已加入 .gitignore
# ══════════════════════════════════════════════

# 核心
WORKSPACE_DIR=workspace

# 源码仓库（逗号分隔 git URL，可留空）
SOURCE_REPOS=

# ── 插件配置（填了即启用） ──

# 蓝湖 PRD 导入
LANHU_COOKIE=

# 禅道 Bug 集成
ZENTAO_BASE_URL=
ZENTAO_ACCOUNT=
ZENTAO_PASSWORD=

# IM 通知（至少配一个通道即启用 notify 插件）
DINGTALK_WEBHOOK_URL=
DINGTALK_KEYWORD=qa-flow
FEISHU_WEBHOOK_URL=
WECOM_WEBHOOK_URL=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_TO=
```

- [ ] **Step 8: Create LICENSE**

MIT license with current year and "qa-flow contributors".

- [ ] **Step 9: Create scripts tsconfig**

Create `.claude/scripts/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "."
  },
  "include": ["**/*.ts"],
  "exclude": ["__tests__"]
}
```

- [ ] **Step 10: Install dependencies and verify**

```bash
npm install
npx biome --version
npx tsx --version
```

Expected: all install successfully, commands output version numbers.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: initialize qa-flow v2.0 project skeleton

- Clean all v1 artifacts
- Set up TypeScript + Biome + xmind-generator
- Create directory structure per spec Section 4
- Add .env.example with unified plugin config"
```

---

## Task 2: Shared Library (lib/)

**Files:**
- Create: `.claude/scripts/lib/env.ts`, `.claude/scripts/lib/paths.ts`, `.claude/scripts/lib/frontmatter.ts`
- Test: `.claude/scripts/__tests__/lib/env.test.ts`, `.claude/scripts/__tests__/lib/paths.test.ts`, `.claude/scripts/__tests__/lib/frontmatter.test.ts`

- [ ] **Step 1: Write tests for lib/env.ts**

Create `.claude/scripts/__tests__/lib/env.test.ts`:

```typescript
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { loadDotEnv, getEnv, getEnvOrThrow } from "../../lib/env.ts";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const TMP = join(import.meta.dirname, "__tmp_env");

describe("lib/env", () => {
  beforeEach(() => {
    mkdirSync(TMP, { recursive: true });
  });
  afterEach(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it("loads .env file and returns values", () => {
    const envPath = join(TMP, ".env");
    writeFileSync(envPath, "FOO=bar\nBAZ=qux\n");
    const env = loadDotEnv(envPath);
    assert.equal(env.FOO, "bar");
    assert.equal(env.BAZ, "qux");
  });

  it("ignores comments and blank lines", () => {
    const envPath = join(TMP, ".env");
    writeFileSync(envPath, "# comment\n\nKEY=val\n");
    const env = loadDotEnv(envPath);
    assert.equal(env.KEY, "val");
    assert.equal(Object.keys(env).length, 1);
  });

  it("getEnv returns undefined for missing keys", () => {
    assert.equal(getEnv("NONEXISTENT_KEY_12345"), undefined);
  });

  it("getEnvOrThrow throws for missing keys", () => {
    assert.throws(() => getEnvOrThrow("NONEXISTENT_KEY_12345"), /NONEXISTENT_KEY_12345/);
  });
});
```

- [ ] **Step 2: Implement lib/env.ts**

```typescript
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

let _cached: Record<string, string> | null = null;

export function loadDotEnv(envPath?: string): Record<string, string> {
  const target = envPath ?? resolve(process.cwd(), ".env");
  const parsed: Record<string, string> = {};
  if (!existsSync(target)) return parsed;

  const content = readFileSync(target, "utf8");
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  _cached = { ..._cached, ...parsed };
  return parsed;
}

export function getEnv(key: string): string | undefined {
  return process.env[key] ?? _cached?.[key];
}

export function getEnvOrThrow(key: string): string {
  const val = getEnv(key);
  if (val === undefined || val === "") {
    throw new Error(`Required environment variable "${key}" is not set. Check .env file.`);
  }
  return val;
}

export function initEnv(envPath?: string): Record<string, string> {
  const parsed = loadDotEnv(envPath);
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
  return parsed;
}
```

- [ ] **Step 3: Run env tests**

```bash
npx tsx --test .claude/scripts/__tests__/lib/env.test.ts
```

Expected: all tests pass.

- [ ] **Step 4: Write and implement lib/paths.ts with tests**

Create `.claude/scripts/lib/paths.ts`:

```typescript
import { resolve, join } from "node:path";
import { getEnv } from "./env.ts";

export function repoRoot(): string {
  return resolve(import.meta.dirname, "../../..");
}

export function workspaceDir(): string {
  const dir = getEnv("WORKSPACE_DIR") ?? "workspace";
  return resolve(repoRoot(), dir);
}

export function workspacePath(...segments: string[]): string {
  return join(workspaceDir(), ...segments);
}

export function scriptsDir(): string {
  return resolve(repoRoot(), ".claude/scripts");
}

export function pluginsDir(): string {
  return resolve(repoRoot(), "plugins");
}

export function templatesDir(): string {
  return resolve(repoRoot(), "templates");
}

export function skillsDir(): string {
  return resolve(repoRoot(), ".claude/skills");
}

/** Generate YYYYMM string for current month */
export function currentYYYYMM(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Extract group/repo from git URL: http://gitlab.xxx/group/repo.git → { group, repo } */
export function parseGitUrl(url: string): { group: string; repo: string } {
  const cleaned = url.replace(/\.git$/, "").replace(/\/$/, "");
  const parts = cleaned.split("/");
  const repo = parts.pop() ?? "";
  const group = parts.pop() ?? "";
  return { group, repo };
}
```

Create `.claude/scripts/__tests__/lib/paths.test.ts`:

```typescript
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseGitUrl, currentYYYYMM } from "../../lib/paths.ts";

describe("lib/paths", () => {
  it("parseGitUrl extracts group and repo", () => {
    const result = parseGitUrl("http://gitlab.prod.dtstack.cn/customItem/dt-center-assets.git");
    assert.equal(result.group, "customItem");
    assert.equal(result.repo, "dt-center-assets");
  });

  it("parseGitUrl handles URL without .git suffix", () => {
    const result = parseGitUrl("https://github.com/org/repo");
    assert.equal(result.group, "org");
    assert.equal(result.repo, "repo");
  });

  it("currentYYYYMM returns 6 digit string", () => {
    const ym = currentYYYYMM();
    assert.match(ym, /^\d{6}$/);
  });
});
```

- [ ] **Step 5: Write and implement lib/frontmatter.ts with tests**

Create `.claude/scripts/lib/frontmatter.ts`:

```typescript
/**
 * Minimal YAML front-matter parser/serializer for Markdown files.
 * Does NOT depend on external YAML libraries — handles the flat key-value
 * and simple array subset used by qa-flow archive/PRD files.
 */

export interface FrontMatter {
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface ParsedMarkdown {
  frontMatter: FrontMatter;
  body: string;
}

export function parseFrontMatter(content: string): ParsedMarkdown {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontMatter: {}, body: content };

  const yamlBlock = match[1];
  const body = match[2];
  const fm: FrontMatter = {};
  let currentKey: string | null = null;
  let currentArray: string[] | null = null;

  for (const line of yamlBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("- ") && currentKey && currentArray) {
      currentArray.push(trimmed.slice(2).trim().replace(/^["']|["']$/g, ""));
      fm[currentKey] = currentArray;
      continue;
    }

    if (currentArray) currentArray = null;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let value = trimmed.slice(colonIdx + 1).trim();

    if (value === "" || value === "[]") {
      currentKey = key;
      currentArray = [];
      fm[key] = currentArray;
      continue;
    }

    value = value.replace(/^["']|["']$/g, "");
    if (value === "true") fm[key] = true;
    else if (value === "false") fm[key] = false;
    else if (/^\d+$/.test(value)) fm[key] = Number.parseInt(value, 10);
    else fm[key] = value;
    currentKey = key;
    currentArray = null;
  }

  return { frontMatter: fm, body };
}

export function serializeFrontMatter(fm: FrontMatter): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(fm)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) lines.push(`  - "${item}"`);
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

export function buildMarkdown(fm: FrontMatter, body: string): string {
  return `${serializeFrontMatter(fm)}\n\n${body}`;
}

/** Count H5 headings (##### ) in body — each is one test case */
export function countCases(body: string): number {
  return (body.match(/^#{5}\s+/gm) ?? []).length;
}

export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}
```

Create `.claude/scripts/__tests__/lib/frontmatter.test.ts`:

```typescript
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseFrontMatter, serializeFrontMatter, countCases } from "../../lib/frontmatter.ts";

describe("lib/frontmatter", () => {
  it("parses front-matter and body", () => {
    const md = '---\nsuite_name: "Test"\ncase_count: 5\n---\n\n## Body';
    const { frontMatter, body } = parseFrontMatter(md);
    assert.equal(frontMatter.suite_name, "Test");
    assert.equal(frontMatter.case_count, 5);
    assert.ok(body.includes("## Body"));
  });

  it("handles tags array", () => {
    const md = '---\ntags:\n  - "a"\n  - "b"\n---\n\nbody';
    const { frontMatter } = parseFrontMatter(md);
    assert.deepEqual(frontMatter.tags, ["a", "b"]);
  });

  it("returns empty frontMatter for plain markdown", () => {
    const { frontMatter, body } = parseFrontMatter("# Just a heading\n\nText");
    assert.deepEqual(frontMatter, {});
    assert.ok(body.includes("Just a heading"));
  });

  it("serializes front-matter", () => {
    const fm = { suite_name: "Test", case_count: 5, tags: ["a", "b"] };
    const result = serializeFrontMatter(fm);
    assert.ok(result.startsWith("---"));
    assert.ok(result.includes('suite_name: "Test"'));
    assert.ok(result.includes("case_count: 5"));
  });

  it("countCases counts H5 headings", () => {
    const body = "##### Case 1\n\ntext\n\n##### Case 2\n\ntext";
    assert.equal(countCases(body), 2);
  });
});
```

- [ ] **Step 6: Run all lib tests**

```bash
npx tsx --test .claude/scripts/__tests__/lib/*.test.ts
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add .claude/scripts/lib/ .claude/scripts/__tests__/lib/
git commit -m "feat: add shared library (env, paths, frontmatter)"
```

---

## Task 3: Infrastructure Scripts (config, state, plugin-loader)

**Files:**
- Create: `.claude/scripts/config.ts`, `.claude/scripts/state.ts`, `.claude/scripts/plugin-loader.ts`
- Test: `.claude/scripts/__tests__/config.test.ts`, `.claude/scripts/__tests__/state.test.ts`, `.claude/scripts/__tests__/plugin-loader.test.ts`

- [ ] **Step 1: Write tests for config.ts**

Create `.claude/scripts/__tests__/config.test.ts`. Test that `config.ts` outputs merged JSON from `.env` + `preferences.md`. Key tests:
- Returns JSON with `workspace_dir` from .env
- Returns empty `source_repos` array when not configured
- Returns `plugins` object with active/inactive status
- Exits with code 0 and valid JSON to stdout

- [ ] **Step 2: Implement config.ts**

CLI script with no subcommands. Reads `.env` via `lib/env.ts`, scans `plugins/*/plugin.json`, checks which are active, outputs merged config JSON to stdout.

```typescript
#!/usr/bin/env npx tsx
/**
 * config.ts — Load and merge all configuration sources.
 *
 * Usage: npx tsx .claude/scripts/config.ts
 * Output: JSON to stdout with workspace, plugins, source_repos
 */
import { initEnv, getEnv } from "./lib/env.ts";
import { repoRoot, pluginsDir } from "./lib/paths.ts";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// ... implement loadPluginManifests(), checkPluginActive(), main()
// Output: { workspace_dir, source_repos, plugins: { name: { active, description, commands } } }
```

Full implementation: read `.env`, scan `plugins/*/plugin.json`, for each plugin check `env_required` (all must be set) or `env_required_any` (any one set), output JSON.

- [ ] **Step 3: Run config tests**

```bash
npx tsx --test .claude/scripts/__tests__/config.test.ts
```

- [ ] **Step 4: Write tests and implement state.ts**

CLI with subcommands: `init`, `update`, `resume`, `clean`.

```
npx tsx .claude/scripts/state.ts init --prd workspace/prds/202604/xxx.md --mode normal
npx tsx .claude/scripts/state.ts update --prd-slug xxx --node enhance --data '{"health_score":85}'
npx tsx .claude/scripts/state.ts resume --prd-slug xxx
npx tsx .claude/scripts/state.ts clean --prd-slug xxx
```

State file format per spec Section 6.6. Store in `workspace/.temp/.qa-state-{prd-slug}.json`.

Key tests:
- `init` creates state file with correct initial structure
- `update` advances `current_node` and appends to `completed_nodes`
- `resume` reads and outputs current state
- `clean` deletes state file
- Non-existent state file returns error JSON

- [ ] **Step 5: Write tests and implement plugin-loader.ts**

CLI with subcommands: `check`, `resolve`, `notify`, `list`.

```
npx tsx .claude/scripts/plugin-loader.ts list
npx tsx .claude/scripts/plugin-loader.ts check --input "https://lanhuapp.com/..."
npx tsx .claude/scripts/plugin-loader.ts resolve --url "https://lanhuapp.com/..."
npx tsx .claude/scripts/plugin-loader.ts notify --event case-generated --data '{"count":42}'
```

- `list`: scan plugins/, output JSON array of { name, active, description }
- `check`: determine if input is a URL matched by any active plugin
- `resolve`: return the matching plugin's command with `{{url}}` replaced
- `notify`: find active notify plugin, execute its send command; skip silently if inactive

Key tests:
- `list` discovers plugin.json files
- `resolve` returns correct command for lanhu URL
- `resolve` returns null for unmatched URL
- `notify` skips when no notify plugin active

- [ ] **Step 6: Verify all --help outputs**

```bash
npx tsx .claude/scripts/config.ts --help
npx tsx .claude/scripts/state.ts --help
npx tsx .claude/scripts/plugin-loader.ts --help
```

Expected: each prints usage info.

- [ ] **Step 7: Run all infrastructure tests**

```bash
npx tsx --test .claude/scripts/__tests__/config.test.ts .claude/scripts/__tests__/state.test.ts .claude/scripts/__tests__/plugin-loader.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add .claude/scripts/config.ts .claude/scripts/state.ts .claude/scripts/plugin-loader.ts .claude/scripts/__tests__/
git commit -m "feat: add infrastructure scripts (config, state, plugin-loader)"
```

---

## Task 4: XMind Generation Script

**Files:**
- Create: `.claude/scripts/xmind-gen.ts`
- Test: `.claude/scripts/__tests__/xmind-gen.test.ts`

This is the most complex script. It converts intermediate JSON to .xmind files using xmind-generator.

- [ ] **Step 1: Write tests for xmind-gen.ts**

Key test cases:
- `--help` outputs usage
- Creates .xmind file from valid JSON input
- Generated .xmind contains correct root title, L1, L2, L3 hierarchy
- `--mode append` adds L1 to existing .xmind
- `--mode replace` replaces matching L1 node
- Validates input JSON (rejects missing `meta.project_name`)
- Outputs JSON to stdout: `{ output_path, mode, root_title, l1_count }`

Use a test fixture JSON file at `.claude/scripts/__tests__/fixtures/sample-cases.json` matching the intermediate format from v1.

- [ ] **Step 2: Implement xmind-gen.ts**

Port logic from v1's `json-to-xmind.mjs` to TypeScript:
- Use `commander` for CLI: `--input <path>`, `--output <path>`, `--mode create|append|replace`
- Use `xmind-generator` for creating topics: `RootTopic`, `Topic`, `Marker`, `Workbook`, `writeLocalFile`
- Use `JSZip` for reading existing .xmind in append/replace mode
- Implement `buildRootTitle(meta)`, `buildL1Title(meta)`, `buildTopicTree(modules)`, `main()`
- JSON stdout: `{ output_path, mode, root_title, l1_count, case_count }`
- Logs to stderr

Reference v1 implementation at `.claude/skills/xmind-converter/scripts/json-to-xmind.mjs` for the topic building logic, priority mapping, and append/replace merge strategies.

- [ ] **Step 3: Run tests**

```bash
npx tsx --test .claude/scripts/__tests__/xmind-gen.test.ts
```

- [ ] **Step 4: Manual verification**

```bash
npx tsx .claude/scripts/xmind-gen.ts --help
npx tsx .claude/scripts/xmind-gen.ts --input .claude/scripts/__tests__/fixtures/sample-cases.json --output /tmp/test.xmind --mode create
```

Expected: creates valid .xmind file openable in XMind.

- [ ] **Step 5: Commit**

```bash
git add .claude/scripts/xmind-gen.ts .claude/scripts/__tests__/xmind-gen.test.ts .claude/scripts/__tests__/fixtures/
git commit -m "feat: add xmind-gen.ts (JSON to XMind converter)"
```

---

## Task 5: XMind Editing Script

**Files:**
- Create: `.claude/scripts/xmind-edit.ts`
- Test: `.claude/scripts/__tests__/xmind-edit.test.ts`

- [ ] **Step 1: Write tests**

Key test cases:
- `search` finds cases by keyword across .xmind files in a directory
- `show` displays case details (title, priority, steps) as JSON
- `patch` modifies case steps/priority and writes back
- `add` inserts new case under parent node
- `delete --dry-run` shows what would be deleted without writing

- [ ] **Step 2: Implement xmind-edit.ts**

Port from v1's `xmind-case-editor.mjs`. Subcommands via `commander`:
- `search <query> [--dir <path>] [--limit 20]`
- `show --file <xmind> --title <title>`
- `patch --file <xmind> --title <title> --case-json '<json>'`
- `add --file <xmind> --parent <title> --case-json '<json>'`
- `delete --file <xmind> --title <title> [--dry-run]`

Uses JSZip to read/write .xmind `content.json`. Tree traversal to find nodes by title (fuzzy match).

- [ ] **Step 3: Run tests and verify**

```bash
npx tsx --test .claude/scripts/__tests__/xmind-edit.test.ts
npx tsx .claude/scripts/xmind-edit.ts --help
```

- [ ] **Step 4: Commit**

```bash
git add .claude/scripts/xmind-edit.ts .claude/scripts/__tests__/xmind-edit.test.ts
git commit -m "feat: add xmind-edit.ts (search, show, patch, add, delete)"
```

---

## Task 6: Archive Generation Script

**Files:**
- Create: `.claude/scripts/archive-gen.ts`
- Test: `.claude/scripts/__tests__/archive-gen.test.ts`

- [ ] **Step 1: Write tests**

Key test cases:
- `convert` transforms intermediate JSON to Archive Markdown using Handlebars template
- Output matches spec: front-matter (suite_name, description, tags, etc.) + body (## → ### → #### → #####)
- `search` finds matching archive files by keyword in front-matter tags/suite_name
- Search returns JSON array of `{ path, suite_name, tags, case_count }`

- [ ] **Step 2: Implement archive-gen.ts**

Subcommands:
- `convert --input <json> --template <hbs> --output <path>`
- `search --query <keywords> [--dir workspace/archive]`

Convert: read JSON, apply Handlebars template, write .md with front-matter.
Search: scan archive dir, parse front-matter of each .md, match by tags/suite_name.

- [ ] **Step 3: Run tests and verify**

```bash
npx tsx --test .claude/scripts/__tests__/archive-gen.test.ts
npx tsx .claude/scripts/archive-gen.ts --help
```

- [ ] **Step 4: Commit**

```bash
git add .claude/scripts/archive-gen.ts .claude/scripts/__tests__/archive-gen.test.ts
git commit -m "feat: add archive-gen.ts (convert + search)"
```

---

## Task 7: Utility Scripts

**Files:**
- Create: `.claude/scripts/image-compress.ts`, `.claude/scripts/prd-frontmatter.ts`, `.claude/scripts/repo-sync.ts`, `.claude/scripts/history-convert.ts`

These are simpler scripts. Grouped into one task.

- [ ] **Step 1: Implement image-compress.ts**

Wraps macOS `sips -Z 2000` for images > 2000px. Falls back to warning on non-macOS.

```
npx tsx .claude/scripts/image-compress.ts --dir workspace/prds/202604/images [--max-size 2000] [--dry-run]
```

Output: JSON `{ processed: number, skipped: number, files: [...] }`

- [ ] **Step 2: Implement prd-frontmatter.ts**

Normalizes PRD front-matter: ensures required fields, writes Chinese status values.

```
npx tsx .claude/scripts/prd-frontmatter.ts normalize --file workspace/prds/202604/xxx.md [--dry-run]
```

Uses `lib/frontmatter.ts` for parsing/serializing.

- [ ] **Step 3: Implement repo-sync.ts**

Git operations for source repo sync.

```
npx tsx .claude/scripts/repo-sync.ts --url <git-url> --branch <branch> [--base-dir workspace/.repos]
```

Auto-creates group directory from URL: `parseGitUrl(url)` → `workspace/.repos/{group}/{repo}`.
Runs: `git clone` (if not exists) → `git fetch origin` → `git checkout {branch}` → `git pull origin {branch}`.
Output: JSON `{ repo, branch, commit, path }`

- [ ] **Step 4: Implement history-convert.ts**

Converts CSV/XMind history files to Archive Markdown.

```
npx tsx .claude/scripts/history-convert.ts --path <file-or-dir> [--module <key>] [--detect] [--force]
```

- `--detect`: scan and report without writing
- `--force`: overwrite existing archive files

Port logic from v1's `convert-history-cases.mjs`.

- [ ] **Step 5: Verify all --help outputs**

```bash
npx tsx .claude/scripts/image-compress.ts --help
npx tsx .claude/scripts/prd-frontmatter.ts --help
npx tsx .claude/scripts/repo-sync.ts --help
npx tsx .claude/scripts/history-convert.ts --help
```

- [ ] **Step 6: Commit**

```bash
git add .claude/scripts/image-compress.ts .claude/scripts/prd-frontmatter.ts .claude/scripts/repo-sync.ts .claude/scripts/history-convert.ts
git commit -m "feat: add utility scripts (image-compress, prd-frontmatter, repo-sync, history-convert)"
```

---

## Task 8: Archive Template

**Files:**
- Create: `templates/archive.md.hbs`

- [ ] **Step 1: Create Handlebars template**

```handlebars
---
suite_name: "{{meta.requirement_name}}"
description: "{{meta.description}}"
{{#if meta.requirement_id}}
prd_id: {{meta.requirement_id}}
{{/if}}
{{#if meta.version}}
prd_version: "{{meta.version}}"
{{/if}}
{{#if meta.prd_path}}
prd_path: "{{meta.prd_path}}"
{{/if}}
product: "{{meta.module_key}}"
tags:
{{#each tags}}
  - "{{this}}"
{{/each}}
create_at: "{{today}}"
status: "草稿"
case_count: {{case_count}}
origin: xmind
---

{{#each modules}}
## {{this.name}}

{{#each this.pages}}
### {{this.name}}

{{#each this.sub_groups}}
#### {{this.name}}

{{#each this.test_cases}}
##### 【{{this.priority}}】{{this.title}}

{{#if this.preconditions}}
> 前置条件
```
{{this.preconditions}}
```

{{/if}}
> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
{{#each this.steps}}
| {{add @index 1}} | {{this.step}} | {{this.expected}} |
{{/each}}

{{/each}}
{{/each}}
{{#each this.test_cases}}
##### 【{{this.priority}}】{{this.title}}

{{#if this.preconditions}}
> 前置条件
```
{{this.preconditions}}
```

{{/if}}
> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
{{#each this.steps}}
| {{add @index 1}} | {{this.step}} | {{this.expected}} |
{{/each}}

{{/each}}
{{/each}}
{{/each}}
```

Note: Register Handlebars helper `add` for 1-based indexing.

- [ ] **Step 2: Commit**

```bash
git add templates/
git commit -m "feat: add archive Markdown template (Handlebars)"
```

---

## Task 9: Plugin Stubs

**Files:**
- Create: `plugins/lanhu/plugin.json`, `plugins/zentao/plugin.json`, `plugins/notify/plugin.json`

- [ ] **Step 1: Create plugin.json files**

`plugins/lanhu/plugin.json`:
```json
{
  "name": "lanhu",
  "description": "蓝湖 PRD 导入插件：从蓝湖 URL 爬取需求文档内容和截图",
  "version": "1.0.0",
  "env_required": ["LANHU_COOKIE"],
  "hooks": {
    "test-case-gen:init": "input-adapter"
  },
  "commands": {
    "fetch": "npx tsx plugins/lanhu/fetch.ts --url {{url}} --output {{output_dir}}"
  },
  "url_patterns": ["lanhuapp.com"]
}
```

`plugins/zentao/plugin.json`:
```json
{
  "name": "zentao",
  "description": "禅道 Bug 集成插件：从禅道链接提取 Bug 信息和修复分支",
  "version": "1.0.0",
  "env_required": ["ZENTAO_BASE_URL", "ZENTAO_ACCOUNT", "ZENTAO_PASSWORD"],
  "hooks": {
    "code-analysis:init": "input-adapter"
  },
  "commands": {
    "fetch": "npx tsx plugins/zentao/fetch.ts --bug-id {{bug_id}} --output {{output_dir}}"
  },
  "url_patterns": ["zentao", "zenpms"]
}
```

`plugins/notify/plugin.json`:
```json
{
  "name": "notify",
  "description": "IM 通知插件：钉钉/飞书/企微/邮件",
  "version": "1.0.0",
  "env_required_any": ["DINGTALK_WEBHOOK_URL", "FEISHU_WEBHOOK_URL", "WECOM_WEBHOOK_URL", "SMTP_HOST"],
  "hooks": {
    "*:output": "post-action"
  },
  "commands": {
    "send": "npx tsx plugins/notify/send.ts --event {{event}} --data '{{json}}'"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add plugins/
git commit -m "feat: add plugin stubs (lanhu, zentao, notify)"
```

---

## Task 10: test-case-gen SKILL.md

**Files:**
- Create: `.claude/skills/test-case-gen/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

This is the core skill entry point. Must be < 500 lines. Contains:
- Frontmatter (name, description, argument-hint)
- 6-node workflow orchestration
- Exact TS commands for each node
- Interactive checkpoint protocol
- BLOCKED relay protocol
- Run modes (normal/quick/resume/module-rerun)

The SKILL.md must:
1. Load `preferences.md` before executing
2. Use `${CLAUDE_SKILL_DIR}` for relative path references
3. Reference prompts/ and references/ files by relative path
4. Specify exact `npx tsx` commands with `{{placeholder}}` syntax
5. Define each interactive checkpoint format

Write the complete SKILL.md (target ~400 lines) following Anthropic Skills spec. Body structure:

```markdown
---
name: test-case-gen
description: "QA test case generator. Transforms PRD documents into structured
  XMind + Markdown test cases via 6-node workflow. Triggers: '生成测试用例',
  '生成用例', '写用例', '为 Story-xxx 生成用例', 'test case', '--quick',
  '重新生成 xxx 模块', '追加用例', lanhuapp.com URLs"
argument-hint: "[PRD path or lanhu URL] [--quick]"
---

# test-case-gen

执行前先读取项目根目录的 `preferences.md`（如存在）。
偏好规则优先级：用户当前指令 > preferences.md > 本 skill 内置规则。

## 运行模式
(table: normal/quick/resume/module-rerun)

## 工作流（6 节点）

### 节点 1: init
(exact commands + interactive checkpoint A)

### 节点 2: enhance
(exact commands + read prompts/enhance.md + checkpoint B)

### 节点 3: analyze
(exact commands + read prompts/analyze.md + checkpoint C)

### 节点 4: write
(read prompts/writer.md + sub-agent dispatch + BLOCKED protocol)

### 节点 5: review
(read prompts/reviewer.md + quality gates)

### 节点 6: output
(exact commands + checkpoint E)

## BLOCKED 中转协议
(relay format)

## 断点续传
(state.ts usage)
```

- [ ] **Step 2: Verify line count**

```bash
wc -l .claude/skills/test-case-gen/SKILL.md
```

Expected: < 500 lines.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/test-case-gen/SKILL.md
git commit -m "feat: add test-case-gen SKILL.md (6-node workflow orchestrator)"
```

---

## Task 11: test-case-gen Prompts

**Files:**
- Create: `prompts/enhance.md`, `prompts/analyze.md`, `prompts/writer.md`, `prompts/reviewer.md`

These are AI instruction templates loaded at Level 3 (on demand).

- [ ] **Step 1: Write prompts/enhance.md**

PRD enhancement prompt. Instructs AI to:
1. Scan image references (Obsidian and standard Markdown)
2. Read each image and generate structured page insights
3. Standardize image references to `assets/images/` path
4. Normalize front-matter
5. Run health check (missing fields, ambiguity)
6. Collect uncertain items and ask user

Reference: v1's `prd-enhancer/SKILL.md` for the logic, but rewrite as a clean prompt template.

- [ ] **Step 2: Write prompts/analyze.md**

QA-specific brainstorming prompt. Instructs AI to:
1. Search historical archive cases via `npx tsx .claude/scripts/archive-gen.ts search --query {{keywords}}`
2. Perform QA brainstorming across dimensions: functional, boundary, negative, compatibility, performance, security, UX
3. Generate checklist JSON: `{ modules: [{ name, pages: [{ name, test_points: [...] }] }] }`
4. Present checklist to user for confirmation

This is the custom QA brainstorm (not superpowers:brainstorming).

- [ ] **Step 3: Write prompts/writer.md**

Writer sub-agent prompt template. Instructs AI to:
1. Read enhanced PRD + confirmed checklist + preferences.md
2. Generate test cases in intermediate JSON format (see references/intermediate-format.md)
3. Follow test-case-rules.md strictly
4. Return `## BLOCKED` if information insufficient (with structured question format)
5. Output valid JSON to be consumed by reviewer

Include `{{confirmed_answers}}` placeholder for BLOCKED relay answers.

- [ ] **Step 4: Write prompts/reviewer.md**

Reviewer sub-agent prompt. Instructs AI to:
1. Validate all cases against test-case-rules.md
2. Check: title format, step format, forbidden words, data specificity, expected result specificity
3. Auto-fix issues < 15% rate
4. Warn + fix for 15-40% rate
5. Block for > 40% rate
6. Check for duplicate cases across modules
7. Output reviewed JSON

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/test-case-gen/prompts/
git commit -m "feat: add test-case-gen prompts (enhance, analyze, writer, reviewer)"
```

---

## Task 12: test-case-gen References

**Files:**
- Create: `references/test-case-rules.md`, `references/intermediate-format.md`, `references/xmind-structure.md`

- [ ] **Step 1: Write test-case-rules.md**

Consolidate from v1's `.claude/rules/test-case-writing.md` + `.claude/skills/test-case-generator/rules/test-case-writing.md` (they were duplicated). Single authoritative source for:
- XMind hierarchy (L1-L4 + case + step + expected)
- Title format: `【P0/P1/P2】验证xxx`
- Step format: first step = `进入【xxx】页面`, no step numbering, specific data
- Positive/negative/boundary case design rules
- Form field merge rules
- Precondition SQL format
- Quality thresholds (15%/40%)

- [ ] **Step 2: Write intermediate-format.md**

JSON schema for data exchange between writer and reviewer. Port from v1's `references/intermediate-format.md`:

```json
{
  "meta": { "project_name", "requirement_name", "version", "module_key", ... },
  "modules": [{
    "name": "模块名",
    "pages": [{
      "name": "页面名",
      "sub_groups": [{
        "name": "功能子组",
        "test_cases": [{
          "title": "验证xxx",
          "priority": "P0",
          "preconditions": "...",
          "steps": [{ "step": "...", "expected": "..." }]
        }]
      }]
    }]
  }]
}
```

- [ ] **Step 3: Write xmind-structure.md**

XMind layer mapping spec. Consolidate from v1's `.claude/rules/xmind-output.md` + `references/xmind-structure-spec.md`:
- Root → L1 → L2 → L3 → [L4] → case → step → expected
- Naming contracts for PRD-level vs Story-level output
- Output path rules: `workspace/xmind/YYYYMM/<功能名>.xmind`

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/test-case-gen/references/
git commit -m "feat: add test-case-gen references (rules, format, xmind structure)"
```

---

## Task 13: Project Entry Files

**Files:**
- Create: `CLAUDE.md`, `preferences.md`

- [ ] **Step 1: Write CLAUDE.md**

```markdown
# qa-flow

使用中文回复。

## 快速开始

输入 `/qa-flow` 查看功能菜单，首次使用请先执行 `/qa-flow init`。

## 功能索引

| 命令 | 功能 |
|------|------|
| `/qa-flow` | 功能菜单 |
| `/qa-flow init` | 环境初始化 |
| `/test-case-gen` | 生成测试用例 |
| `/code-analysis` | 分析报错/冲突 |
| `/xmind-editor` | 编辑 XMind 用例 |
| `/ui-autotest` | UI 自动化测试 |

## 核心约束

- workspace/.repos/ 下的源码仓库为只读，禁止 push/commit
- 用户偏好规则见 preferences.md，优先级高于 skill 内置规则
- 所有输出产物写入 workspace/ 目录，不污染框架代码
```

- [ ] **Step 2: Write preferences.md template**

```markdown
# 用户偏好规则

> 优先级：用户当前指令 > 本文件规则 > skill 内置规则
> 本文件由 AI 辅助维护，用户也可直接编辑

## 用例编写

(用户反馈会自动追加到此处)

## XMind 结构

(用户反馈会自动追加到此处)

## PRD 识别

(用户反馈会自动追加到此处)

## 数据准备

(用户反馈会自动追加到此处)
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md preferences.md
git commit -m "feat: add CLAUDE.md and preferences.md template"
```

---

## Task 14: Integration Verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run Biome check**

```bash
npm run check
```

Expected: no errors (warnings acceptable for now).

- [ ] **Step 3: Verify all scripts respond to --help**

```bash
for script in config state plugin-loader xmind-gen xmind-edit archive-gen image-compress prd-frontmatter repo-sync history-convert; do
  echo "=== $script ==="
  npx tsx .claude/scripts/$script.ts --help
done
```

Expected: each prints usage information.

- [ ] **Step 4: Verify test-case-gen SKILL.md loads**

```bash
# Check frontmatter is valid
head -5 .claude/skills/test-case-gen/SKILL.md
# Check line count
wc -l .claude/skills/test-case-gen/SKILL.md
# Check all referenced files exist
grep -oP '(?<=prompts/|references/)\S+\.md' .claude/skills/test-case-gen/SKILL.md | while read f; do
  test -f ".claude/skills/test-case-gen/$f" && echo "OK: $f" || echo "MISSING: $f"
done
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: P0 integration verification complete

All scripts pass --help and tests.
test-case-gen SKILL.md and prompts are complete.
Ready for P1 (setup, qa-flow, xmind-editor skills)."
```

---

## Dependency Graph

```
Task 1 (skeleton)
    │
    ▼
Task 2 (lib/) ──────────────────────┐
    │                                │
    ▼                                ▼
Task 3 (config/state/plugin-loader)  Task 7 (utility scripts)
    │                                │
    ├──────────┬─────────────────────┤
    ▼          ▼                     ▼
Task 4     Task 5              Task 6
(xmind-gen) (xmind-edit)      (archive-gen)
    │          │                     │
    ├──────────┴─────────────────────┤
    ▼                                ▼
Task 8 (template)              Task 9 (plugin stubs)
    │                                │
    ├────────────────────────────────┤
    ▼
Task 10 (SKILL.md)
    │
    ▼
Task 11 (prompts) ← depends on knowing exact script commands from Tasks 3-7
    │
    ▼
Task 12 (references)
    │
    ▼
Task 13 (CLAUDE.md + preferences.md)
    │
    ▼
Task 14 (integration verification)
```

Tasks 4, 5, 6, 7 can run in parallel after Task 2+3.
Tasks 8 and 9 can run in parallel.
Tasks 10-12 are sequential (SKILL.md → prompts → references).

---

## Next Plans

After this plan completes:
- **Plan 2**: P1 — setup skill (init wizard) + qa-flow skill (menu router) + xmind-editor skill
- **Plan 3**: P2/P3 — code-analysis skill + plugin implementations (lanhu, zentao, notify) + ui-autotest skill + README.md
