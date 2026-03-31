# Phase 02: Project Structure + Shared Scripts - Research

**Researched:** 2026-03-31
**Domain:** Node.js ESM shared script refactoring, config-driven path resolution, directory scaffolding
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**目录布局设计**
- 保留 cases/ 下四分法：requirements/xmind/archive/history，职责清晰
- 顶层 cases/requirements、cases/xmind、cases/archive 通过 .gitkeep 预建，新用户 clone 后即可看到结构
- 版本目录为可选层：模块配置中指定 versioned: true/false，启用时自动创建 v{version}/ 子目录，否则扁平存放
- 根目录 latest-*.xmind 等快捷链接保留，名称通过 config.shortcuts 配置
- config/ 顶层目录移入 .claude/（repo-branch-mapping.yaml 等配置文件与 config.json 就近存放）

**Config 驱动路径解析**
- 空模块处理：modules 为空时脚本抛出明确错误并引导用户运行 /using-qa-flow init，不做默认推断
- 路径策略：约定优先 + 覆写。默认从 moduleKey 推导 cases/{type}/{moduleKey}/，允许在 config 中显式覆写特殊路径（如 custom/xyzh）
- 命名契约：output-naming-contracts 的命名模板可配置，默认使用需求名称作为文件名
- config/ 目录内容迁移至 .claude/ 下

**脚本迁移与兼容**
- load-config.mjs API 允许重新设计，不需要保持旧 API 签名向下兼容
- output-naming-contracts.mjs 全量 config 驱动：所有路径段、文件名规则从 config 读取，脚本中零字符串常量路径
- unify-directory-structure.mjs 和 build-archive-index.mjs 在本阶段同步改造适配新结构

**测试策略**
- 脚本级单元测试验证空白项目初始化场景（loadConfig、resolveModulePath 等函数在空 config 下的行为）
- 现有 test fixtures 重建以匹配新约定式路径和 config schema
- 新增硬编码检测测试：grep 所有 .mjs 文件确认无 cases/xmind/ 等硬编码路径段

### Claude's Discretion
- 新增 API 的具体签名设计（如 resolveModulePath 的参数和返回值）
- fixtures 的具体数据结构
- .gitkeep 文件的具体放置位置
- config 中覆写路径的 schema 设计细节

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STRU-01 | 重新设计项目目录结构 — 更合理的层级，支持任意项目适配 | .gitkeep scaffolding pattern, versioned/flat module config, config/ → .claude/ migration |
| STRU-02 | 共享脚本重构 — load-config.mjs 等脚本适配新 config schema | resolveModulePath() API design, hardcoded path audit, config-driven path resolution pattern |
| STRU-03 | 测试套件更新 — 适配新结构的单元测试 | node:test framework pattern, __test_* temp dir convention, hardcoded path detection test |
</phase_requirements>

---

## Summary

Phase 2 is a refactoring phase with no new external dependencies. The codebase already completed Phase 1 (generalization), leaving `config.json` schema clean and `load-config.mjs` properly structured. The remaining work is: (1) wiring directory scaffolding into config so a fresh clone gets `cases/` pre-created via `.gitkeep`; (2) eliminating the literal path strings `"cases/archive"`, `"cases/xmind"`, `"cases/requirements"`, `"cases/history"` from all shared scripts, replacing them with config-derived paths; and (3) updating tests to cover blank-config behavior and adding a hardcoded-path detection gate.

The existing patterns are well-established: ESM named exports, `node:test` for inline tests, manual `assert()` wrappers in `tests/test-*.mjs`, `__test_*` temp dirs, and `loadConfigFromPath()` + `resetConfigCache()` for test isolation. No new libraries are needed.

The single highest-risk item is `unify-directory-structure.mjs`, which contains deeply hardcoded module paths (`data-assets`, `xyzh`, `SPECIAL_XMIND_DIRS`). This script is a one-time migration utility that was already used to restructure DTStack data; for the generic codebase it should be rewritten as a generic config-driven script or retired and replaced with a simpler `scaffold-directories.mjs`.

**Primary recommendation:** Add `resolveModulePath(moduleKey, type, config)` to `load-config.mjs`, wire `cases/` root path through config, add `.gitkeep` files to pre-build directory structure, strip hardcoded paths from `build-archive-index.mjs`, `audit-md-frontmatter.mjs`, `md-content-source-resolver.mjs`, and rewrite `unify-directory-structure.mjs` as a generic init-time scaffold.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins (fs, path, url) | Node 18+ | All file operations and path resolution | Zero-dep project preference; already used throughout |
| `node:test` | built-in | Unit test framework for inline `.test.mjs` files | Already in use for `load-config.test.mjs`; no install required |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jszip | existing | XMind file operations | Already installed; needed by `unify-directory-structure.mjs` if retained |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual `assert()` wrapper tests | Vitest/Jest | Project prefers zero external test deps; manual pattern works for simple utility tests |
| `.gitkeep` files | `postinstall` script | `.gitkeep` is simpler, versionable, and doesn't require npm install |

**Installation:**
```bash
# No new packages required
```

---

## Architecture Patterns

### Recommended Project Structure

After Phase 2, the repository root gains `.gitkeep` files in `cases/` subdirectories and `config/` directory is retired:

```
qa-flow/
├── cases/
│   ├── requirements/.gitkeep   # pre-created for fresh clone
│   ├── xmind/.gitkeep          # pre-created
│   ├── archive/.gitkeep        # pre-created
│   └── history/.gitkeep        # pre-created
├── .claude/
│   ├── config.json             # now includes casesRoot, module path derivation rules
│   └── shared/scripts/
│       ├── load-config.mjs     # + resolveModulePath(), getCasesRoot()
│       ├── scaffold-directories.mjs  # replaces unify-directory-structure.mjs DTStack logic
│       └── build-archive-index.mjs  # uses config-derived ARCHIVE_DIR
```

`config/` directory (currently contains `repo-branch-mapping.yaml`) moves to `.claude/`:

```
.claude/
├── config.json
└── repo-branch-mapping.yaml    # moved from config/
```

### Pattern 1: Convention-over-Config Path Resolution

**What:** Derive directory paths from module key using a convention (`cases/{type}/{moduleKey}/`), with config-level overrides for non-standard layouts.

**When to use:** Any script that needs to resolve a module's xmind, archive, requirements, or history directory.

**Example:**
```javascript
// Source: load-config.mjs — new export
/**
 * Resolve a module's directory path for a given artifact type.
 * Convention: cases/{type}/{moduleKey}/
 * Override: use module config's explicit path if present.
 *
 * @param {string} moduleKey - e.g. "data-assets", "xyzh"
 * @param {"xmind"|"archive"|"requirements"|"history"} type
 * @param {object} [config] - optional pre-loaded config; defaults to loadConfig()
 * @returns {string} workspace-relative path with trailing slash
 */
export function resolveModulePath(moduleKey, type, config = loadConfig()) {
  const mod = config.modules?.[moduleKey];
  if (!mod) throw new Error(`Unknown module key: "${moduleKey}". Run /using-qa-flow init to configure modules.`);
  // Explicit override in config takes precedence
  if (mod[type]) return mod[type];
  // Convention fallback
  const casesRoot = config.casesRoot ?? 'cases/';
  return `${casesRoot}${type}/${moduleKey}/`;
}
```

### Pattern 2: Config-Derived Directory Roots in Scripts

**What:** Scripts that scan `cases/archive/` or `cases/requirements/` must derive the scan root from config rather than hardcoding the path segment.

**When to use:** `build-archive-index.mjs`, `audit-md-frontmatter.mjs`

**Example:**
```javascript
// Source: build-archive-index.mjs after refactoring
import { loadConfig, getWorkspaceRoot } from './load-config.mjs';

const ROOT = getWorkspaceRoot();
const config = loadConfig();
const ARCHIVE_DIR = join(ROOT, config.archive?.root ?? 'cases/archive');
// OR: derive from config.modules entries
```

### Pattern 3: .gitkeep Scaffolding

**What:** Empty `.gitkeep` files ensure directory structure is committed and present on fresh clone.

**When to use:** Any directory that must exist before the workflow runs but may otherwise be empty.

**Example:**
```
cases/requirements/.gitkeep
cases/xmind/.gitkeep
cases/archive/.gitkeep
cases/history/.gitkeep
```

### Pattern 4: Test Isolation with Temp Config

**What:** Tests create temporary config files using `os.tmpdir()` to verify behavior in isolation from the real project config.

**When to use:** Any test of config-dependent functions.

**Example:**
```javascript
// Source: load-config.test.mjs (established pattern)
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

function writeTempConfig(obj) {
  const dir = join(tmpdir(), 'qa-flow-tests-' + Date.now());
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'config.json');
  writeFileSync(path, JSON.stringify(obj), 'utf8');
  return path;
}
```

### Pattern 5: Hardcoded Path Detection Test

**What:** A test that greps all `.mjs` files in `shared/scripts/` for known literal path segments.

**When to use:** As a regression gate — prevents future accidental re-introduction of hardcoded paths.

**Example:**
```javascript
// Source: new test-no-hardcoded-paths.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const SCRIPTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../shared/scripts');
const FORBIDDEN_LITERALS = [
  '"cases/xmind/',
  '"cases/archive/',
  '"cases/requirements/',
  '"cases/history/',
  "'cases/xmind/",
  "'cases/archive/",
  "'cases/requirements/",
  "'cases/history/",
];
const ALLOWLIST_FILES = [
  // load-config.mjs may document conventions in comments — allow
];

describe('STRU-02: No hardcoded cases/ path literals in shared scripts', () => {
  const files = readdirSync(SCRIPTS_DIR).filter(f => f.endsWith('.mjs'));
  for (const file of files) {
    if (ALLOWLIST_FILES.includes(file)) continue;
    it(`${file} contains no hardcoded cases/ path literals`, () => {
      const source = readFileSync(join(SCRIPTS_DIR, file), 'utf8');
      for (const literal of FORBIDDEN_LITERALS) {
        assert.ok(
          !source.includes(literal),
          `${file} contains hardcoded path literal: ${literal}`
        );
      }
    });
  }
});
```

### Anti-Patterns to Avoid

- **Hardcoded type directories:** Never write `join(ROOT, "cases/archive")` directly in scripts; always derive from config or `resolveModulePath()`.
- **Empty-modules silent fallback:** When `config.modules` is empty, do not silently return default paths — throw an error directing the user to run `/using-qa-flow init`.
- **Keeping DTStack-specific migration logic in generic scripts:** `migrateDataAssets()` and `migrateXyzh()` in `unify-directory-structure.mjs` are DTStack-specific. The refactored script should be generic or removed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recursive directory scan | custom walk fn | `readdirSync` with recursion (already used) | Pattern already proven in codebase |
| Config validation | Ajv/Zod | existing `assertRequiredFields()` in `load-config.mjs` | Established in Phase 1; zero-dep preference |
| .gitkeep management | custom script | Plain `touch` in git commits | Static files — no runtime management needed |
| Path segment stripping | regex | `mod.xmind.match(/cases\/xmind\/(.+?)\/?$/)` (existing in `getModuleMap`) | Pattern already used; extract to helper |

**Key insight:** All needed utilities exist. This phase is about wiring them together correctly, not building new infrastructure.

---

## Common Pitfalls

### Pitfall 1: getModuleMap() Path Extraction Fragility

**What goes wrong:** `getModuleMap()` in `load-config.mjs` uses `mod.xmind.match(/cases\/xmind\/(.+?)\/?$/)` to derive the module directory. If a module's `xmind` path doesn't match this regex (e.g., uses an absolute path or non-`cases/xmind/` root), the function falls back to the module key — silently masking misconfiguration.

**Why it happens:** The regex is written specifically for the DTStack `cases/xmind/` layout, not for an arbitrary `casesRoot`.

**How to avoid:** When adding `casesRoot` to config, update the regex to `mod.xmind.match(new RegExp(casesRoot + 'xmind/(.+?)/?$'))` or replace the path extraction with a more explicit `resolveModulePath()` API.

**Warning signs:** `getModuleMap()` returns the module key itself rather than the expected subdirectory segment.

### Pitfall 2: audit-md-frontmatter.mjs and build-archive-index.mjs Hardcoded Paths

**What goes wrong:** Both scripts hardcode the scan roots `cases/archive` and `cases/requirements`. After the refactor these must be derived from config. If missed, the scripts will continue to work on DTStack layouts but will fail on projects with different `casesRoot`.

**Why it happens:** These paths were written before the config-driven design was established.

**How to avoid:** In the refactoring task for STRU-02, include `audit-md-frontmatter.mjs` and `build-archive-index.mjs` in the change list. The hardcoded-path detection test will catch any misses.

**Warning signs:** Test `test-no-hardcoded-paths.mjs` fails on these files.

### Pitfall 3: unify-directory-structure.mjs Contains DTStack Module Names

**What goes wrong:** The script hardcodes `"data-assets"` (the `cases/requirements/data-assets` migration), `"xyzh"`, and `SPECIAL_XMIND_DIRS` (a map of specific Chinese-named xmind files to special directories). These are DTStack-specific and would fail for any other project.

**Why it happens:** The script was written as a one-time migration tool before generalization.

**How to avoid:** The script should either be retired (its migration work is done on the DTStack branch) or replaced with a generic `scaffold-directories.mjs` that only creates missing directory structure based on config — no file movement logic.

**Warning signs:** The hardcoded-path test will flag `"cases/requirements/data-assets"` and `"cases/requirements/xyzh"` as forbidden literals.

### Pitfall 4: .gitkeep Commits Interfering with Workflow State Files

**What goes wrong:** The `.gitignore` already excludes state files like `.qa-state*.json` and `temp/`. Adding `.gitkeep` files to directories that also contain non-committed files (like `.qa-state*.json`) requires care — the `.gitkeep` should be at the parent level, not inside `temp/` or version-specific subdirectories that are meant to be untracked.

**Why it happens:** Overzealous `.gitkeep` placement.

**How to avoid:** Place `.gitkeep` only in the four cases/ top-level subdirectories. Version-specific subdirectories (`v6.4.10/`, `custom/xyzh/`) are created at runtime by scripts, not scaffolded.

**Warning signs:** `git status` shows unintended files being tracked.

### Pitfall 5: md-content-source-resolver.mjs Convention Fallback

**What goes wrong:** `resolveModulePaths()` in `md-content-source-resolver.mjs` already uses a convention fallback (`cases/xmind/${product}/`, etc.) but these are string literals in code, not config-derived.

**Why it happens:** The convention was written before `resolveModulePath()` existed.

**How to avoid:** After adding `resolveModulePath()` to `load-config.mjs`, update `md-content-source-resolver.mjs` to call it instead of constructing paths inline.

---

## Code Examples

Verified patterns from existing codebase:

### Config-Derived Archive Root (new pattern)

```javascript
// Source: build-archive-index.mjs after STRU-02 refactoring
import { loadConfig, getWorkspaceRoot } from './load-config.mjs';

const ROOT = getWorkspaceRoot();

function getArchiveRoot() {
  const config = loadConfig();
  // Allow override via config.casesRoot; default to 'cases/'
  const casesRoot = config.casesRoot ?? 'cases/';
  return join(ROOT, casesRoot, 'archive');
}
```

### resolveModulePath() — Recommended API Signature

```javascript
// Source: load-config.mjs — proposed new export
/**
 * Resolve module artifact directory path.
 * Convention: {casesRoot}{type}/{moduleKey}/
 * Override: module config's explicit path field if present.
 * @param {string} moduleKey
 * @param {'xmind'|'archive'|'requirements'|'history'} type
 * @param {object} [config]
 * @returns {string} workspace-relative path, trailing slash included
 */
export function resolveModulePath(moduleKey, type, config = loadConfig()) {
  const mod = config.modules?.[moduleKey];
  if (!mod) {
    throw new Error(
      `Unknown module key: "${moduleKey}". Run /using-qa-flow init to configure modules.`
    );
  }
  if (mod[type]) return mod[type].endsWith('/') ? mod[type] : mod[type] + '/';
  const casesRoot = config.casesRoot ?? 'cases/';
  return `${casesRoot}${type}/${moduleKey}/`;
}
```

### Empty Modules Guard Pattern

```javascript
// Source: load-config.mjs — use in scripts that iterate modules
export function requireNonEmptyModules(config = loadConfig()) {
  const keys = Object.keys(config.modules ?? {});
  if (keys.length === 0) {
    throw new Error(
      'config.modules is empty. Please run /using-qa-flow init to configure your project modules.'
    );
  }
  return keys;
}
```

### .gitkeep Scaffolding (static files)

```
# In git: commit these four empty files
cases/requirements/.gitkeep
cases/xmind/.gitkeep
cases/archive/.gitkeep
cases/history/.gitkeep
```

### Node:test Framework Pattern (established)

```javascript
// Source: .claude/shared/scripts/load-config.test.mjs
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

describe('STRU-02: resolveModulePath()', () => {
  it('uses convention when module has no explicit path', () => {
    const config = { modules: { 'my-module': {} }, casesRoot: 'cases/' };
    const result = resolveModulePath('my-module', 'xmind', config);
    assert.equal(result, 'cases/xmind/my-module/');
  });

  it('uses explicit path when module config overrides', () => {
    const config = { modules: { xyzh: { xmind: 'cases/xmind/custom/xyzh/' } } };
    const result = resolveModulePath('xyzh', 'xmind', config);
    assert.equal(result, 'cases/xmind/custom/xyzh/');
  });

  it('throws with guidance when module key is unknown', () => {
    const config = { modules: {} };
    assert.throws(
      () => resolveModulePath('unknown', 'xmind', config),
      /using-qa-flow init/
    );
  });
});
```

---

## Current State Audit

### Files With Hardcoded cases/ Path Literals (must fix in STRU-02)

| File | Literal(s) | Fix Strategy |
|------|-----------|--------------|
| `build-archive-index.mjs` | `join(ROOT, "cases/archive")` | Derive from config |
| `audit-md-frontmatter.mjs` | `join(ROOT, "cases/archive")`, `join(ROOT, "cases/requirements")` | Derive from config |
| `md-content-source-resolver.mjs` | `` `cases/xmind/${product}/` ``, `` `cases/requirements/${product}/` ``, `` `cases/history/${product}/` `` | Use `resolveModulePath()` |
| `unify-directory-structure.mjs` | `"cases/requirements/data-assets"`, `"cases/requirements/xyzh"`, `` `cases/xmind/${moduleDir}` `` | Replace with generic scaffold script |
| `front-matter-utils.mjs` | `includes("/cases/archive/")`, `includes("/cases/requirements/")` | These are path-matching guards; acceptable to leave as string matches since they match content patterns, not config paths — **allowlist** |

### Files That Are Already Clean

| File | Status |
|------|--------|
| `load-config.mjs` | Clean — uses `__dirname`-relative CONFIG_PATH, no cases/ literals |
| `latest-link-utils.mjs` | Clean — no cases/ references |
| `output-naming-contracts.mjs` | Clean — no path literals, operates on file names only |
| `front-matter-utils.mjs` | String matching in path detection helpers is content-pattern matching, not config-path resolution — allowlist in hardcoded-path test |

### config/ Directory Migration

| Current Location | New Location |
|-----------------|-------------|
| `config/repo-branch-mapping.yaml` | `.claude/repo-branch-mapping.yaml` |

Config reference in `config.json` via `branchMapping` field: the value `"config/repo-branch-mapping.yaml"` must be updated to `".claude/repo-branch-mapping.yaml"` (or left unset since modules are empty on the generic branch).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getDtstackModules()` | `getModuleKeys()` | Phase 1 | Callers must update |
| `repoBranchMapping` config key | `branchMapping` | Phase 1 | Already done |
| `zentaoId` module field | `trackerId` | Phase 1 | Already done |
| Hardcoded `cases/archive` in scripts | Config-derived (Phase 2 target) | Phase 2 | Scripts become project-agnostic |
| DTStack-specific migration in `unify-directory-structure.mjs` | Generic scaffold script (Phase 2 target) | Phase 2 | Fresh-clone init works without DTStack knowledge |

**Deprecated/outdated:**
- `config/` top-level directory: migrating to `.claude/`; callers using `config.branchMapping` pointing to `config/repo-branch-mapping.yaml` need path update.
- `migrateDataAssets()` and `migrateXyzh()` in `unify-directory-structure.mjs`: DTStack-specific migration logic; should be removed in the generic codebase.

---

## Open Questions

1. **casesRoot config field vs. convention**
   - What we know: All current scripts assume `cases/` as the root, but it is not in `config.json`.
   - What's unclear: Should `casesRoot` be an explicit config field or always derived from the workspace root by convention?
   - Recommendation: Add `config.casesRoot` as an optional field defaulting to `"cases/"`. This makes it overridable without breaking existing behavior.

2. **unify-directory-structure.mjs retirement scope**
   - What we know: The script contains both a generic XMind splitting function and DTStack-specific migration functions.
   - What's unclear: Whether the XMind splitting logic (splitting multi-L1 XMind into per-PRD files) should be preserved as a generic utility.
   - Recommendation: Retire the DTStack migration functions; preserve and genericize the XMind splitting logic as a separate `split-xmind.mjs` utility, or leave it for Phase 4 (Skills Redesign).

3. **versioned: true/false module flag schema**
   - What we know: Decisions specify `versioned: true/false` in module config to control v{version}/ subdirectory creation.
   - What's unclear: Where this flag is consumed — scaffold script only, or also `resolveModulePath()`?
   - Recommendation: `resolveModulePath()` should accept an optional `version` parameter. When `mod.versioned === true` and `version` is provided, return `cases/{type}/{moduleKey}/v{version}/`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js `node:test` (built-in) + manual `assert()` wrapper in legacy tests |
| Config file | None — tests discovered by `run-all.mjs` via filename pattern `test-*.mjs` |
| Quick run command | `node .claude/tests/run-all.mjs` |
| Full suite command | `node .claude/tests/run-all.mjs` (same — no separate full suite) |
| Inline test command | `node --test .claude/shared/scripts/load-config.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STRU-01 | Fresh clone has cases/ subdirs with .gitkeep | smoke | `ls cases/requirements/.gitkeep cases/xmind/.gitkeep cases/archive/.gitkeep cases/history/.gitkeep` | ❌ Wave 0 — static files |
| STRU-01 | config/ content moved to .claude/ | smoke | `ls .claude/repo-branch-mapping.yaml` (if branchMapping set) | ❌ Wave 0 |
| STRU-02 | resolveModulePath() derives convention path | unit | `node --test .claude/shared/scripts/load-config.test.mjs` | ❌ Wave 0 — extend existing file |
| STRU-02 | resolveModulePath() uses config override | unit | `node --test .claude/shared/scripts/load-config.test.mjs` | ❌ Wave 0 |
| STRU-02 | resolveModulePath() throws on empty modules | unit | `node --test .claude/shared/scripts/load-config.test.mjs` | ❌ Wave 0 |
| STRU-02 | build-archive-index.mjs uses config-derived root | integration | `node .claude/shared/scripts/build-archive-index.mjs --stats` | ✅ (script exists; test coverage ❌) |
| STRU-02 | No hardcoded cases/ literal strings in shared scripts | regression | `node --test .claude/tests/test-no-hardcoded-paths.mjs` | ❌ Wave 0 |
| STRU-03 | Full test suite green with new structure | suite | `node .claude/tests/run-all.mjs` | ✅ |

### Sampling Rate

- **Per task commit:** `node .claude/tests/run-all.mjs`
- **Per wave merge:** `node .claude/tests/run-all.mjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `cases/requirements/.gitkeep`, `cases/xmind/.gitkeep`, `cases/archive/.gitkeep`, `cases/history/.gitkeep` — STRU-01 directory scaffold
- [ ] `.claude/shared/scripts/load-config.test.mjs` additions — `resolveModulePath()` tests (extend existing file)
- [ ] `.claude/tests/test-no-hardcoded-paths.mjs` — STRU-02 regression gate (new file)
- [ ] `config/repo-branch-mapping.yaml` → `.claude/repo-branch-mapping.yaml` move + `config.json` path update

---

## Sources

### Primary (HIGH confidence)

- Direct codebase analysis — `.claude/shared/scripts/*.mjs` (all 10 files read)
- `.planning/codebase/STRUCTURE.md`, `CONVENTIONS.md`, `ARCHITECTURE.md` — codebase analysis
- `.claude/config.json` — current config schema (post Phase 1)
- `.claude/tests/test-load-config.mjs`, `load-config.test.mjs` — established test patterns

### Secondary (MEDIUM confidence)

- Phase 1 decisions in `01-CONTEXT.md` — confirmed via `STATE.md` decision log
- Phase 2 decisions in `02-CONTEXT.md` — user-locked choices

### Tertiary (LOW confidence)

- None — all claims verified from source code directly.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all patterns verified from existing codebase
- Architecture: HIGH — resolveModulePath API design derived directly from existing getModuleMap() and md-content-source-resolver.mjs patterns
- Pitfalls: HIGH — all pitfalls identified from direct code reading, not inference

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable codebase; no fast-moving dependencies)
