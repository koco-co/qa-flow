# Phase 1: Generalization Refactor - Research

**Researched:** 2026-03-31
**Domain:** Configuration schema design, codebase decoupling, branch-based data migration, ESM module refactoring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- `repos` and `stackTrace` retained as optional fields with default `{}` — users can configure if they have source repos
- DTStack-specific field renames: `zentaoId` → `trackerId`, `repoBranchMapping` → `branchMapping`, `dataAssetsVersionMap` → remove or generalize
- CLAUDE.md uses conditional syntax: DTStack-specific content becomes "when config has X configured, enable Y" rather than hardcoded
- Rules examples use variable templates: `${module}`, `${table}`, `${datasource}` as placeholders
- `test-case-writing.md` "DTStack append rules" generalized as conditional block: enabled when config has `repos` field configured
- `repo-safety.md` Java package→repo hardcoded table deleted; replaced with guidance pointing to `config.json` `stackTrace` field

### Claude's Discretion
- Config schema `type` field design (delete, keep optional, or other)
- Minimum required fields boundary
- Which files migrate to dtstack-data branch vs. in-place rewrite
- `loadConfig()` validation library choice (Ajv / Zod / hand-written)
- Missing-field error style (all-at-once vs. one-by-one)
- Schema validation strictness (whether to allow extra fields)
- dtstack-data branch creation timing

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GEN-01 | Config schema 解耦 — 移除所有 DTStack 硬编码，引入 JSON Schema 验证 | Config schema design, field renaming, Ajv/Zod comparison |
| GEN-02 | loadConfig() 添加 schema 验证 — 缺失字段给出明确错误而非中途崩溃 | Validation library selection, error message patterns |
| GEN-03 | 所有 Rules 文件通用化 — 移除 DTStack 特定示例，替换为电商平台等通用场景 | Rules file coupling inventory, placeholder template patterns |
| GEN-04 | 所有 Prompts/Steps 通用化 — 移除 Doris/Hive/SparkThrift 等业务数据引用 | Prompt coupling inventory, conditional step patterns |
| GEN-05 | 中间 JSON schema 通用化 — 移除 DTStack 特定字段，保持格式稳定 | Intermediate JSON analysis, backward-compat strategy |
| GEN-06 | DTStack 业务数据迁移至 dtstack-data 分支 | Branch strategy, migration file list, git workflow |
</phase_requirements>

---

## Summary

Phase 1 is a pure refactoring phase with no new features. The work falls into four distinct streams: (1) config schema redesign with validation, (2) rules/prompts text generalization, (3) intermediate JSON schema cleanup, and (4) git branch migration of DTStack business data. The codebase already has good separation between config-loading logic and business logic — `load-config.mjs` is the single entry point for all scripts, making it the ideal place to add validation.

The most critical dependency chain is: **config schema redesign (GEN-01) must be settled before any other work begins**, because `loadConfig()` validation (GEN-02) depends on the final schema shape, and rules/prompts generalization (GEN-03/GEN-04) needs to know what placeholder conventions to reference. The branch migration (GEN-06) is independent and can proceed in parallel once the file migration list is agreed.

The project runs pure Node.js ESM with no test framework currently in place for shared scripts. Tests must be written from scratch in Wave 0 before implementation. The existing `output-naming-contracts.mjs` contains the one remaining DTStack-specific function (`getDtstackPreferredArchiveBaseName`) that needs generalization.

**Primary recommendation:** Use hand-written validation in `loadConfig()` (no new dependencies), rename DTStack-specific fields per CONTEXT.md decisions, create dtstack-data branch before modifying any files on main/release, generalize rules with `${placeholder}` variable templates and conditional-block syntax.

---

## Standard Stack

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Node.js ESM | 25.x (project-set) | All shared scripts runtime | Already the project's module format (`"type": "module"`) |
| JSON (config.json) | — | Central configuration store | Already established pattern, no migration cost |
| Git branches | — | DTStack data isolation | Zero-dependency, backward-compat, reversible |

### Supporting
| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| Ajv | ^8 | JSON Schema validation | If `loadConfig()` needs strict schema enforcement with detailed errors |
| Zod | ^3 | TypeScript-first schema validation | If type safety is important downstream |
| Hand-written validation | — | Simple required-field checks | When the schema is small and error messages need custom formatting |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-written validation | Ajv v8 | Ajv adds a dependency but gives standard JSON Schema format; hand-written is simpler and zero-dep |
| Hand-written validation | Zod | Zod is TypeScript-native but project uses plain JS ESM; overkill for config validation |
| Conditional blocks in rules | Separate DTStack-rules files | Separate files are cleaner but require Skills to load different files based on config — more complex orchestration |

**Recommendation for Claude's Discretion (validation library):** Use hand-written validation. The config schema is small (~10 required fields). Hand-written validation gives full control over error message format, has zero new dependencies, and matches the project's preference for simplicity (package.json has only `jszip` as a dependency). Throw a descriptive error naming the missing field — one-at-once style is sufficient.

**Recommendation for Claude's Discretion (schema strictness):** Allow extra fields (lenient). Users may add project-specific keys; breaking on unknown keys would hurt extensibility and create friction for new adopters.

**Recommendation for Claude's Discretion (`type` field):** Remove the `type` field from module definitions. The original `"type": "dtstack"` vs `"type": "custom"` distinction was used only by `getDtstackModules()` — a function that encodes DTStack-specific logic. Generalized code should not distinguish module types at the config level. Any conditional behavior should be driven by presence/absence of optional fields (e.g., `repos`, `trackerId`) rather than a hardcoded type string.

**Installation:**
```bash
# No new dependencies needed if hand-written validation is chosen
# If Ajv is chosen:
npm install ajv
```

---

## Architecture Patterns

### Recommended Project Structure (after refactor)

The directory structure does not change. Only file contents change.

```
.claude/
├── config.json                    # Generalized schema (no DTStack module names)
├── rules/
│   ├── test-case-writing.md       # Conditional DTStack block, generic examples
│   ├── repo-safety.md             # Remove Java package table, point to stackTrace
│   ├── archive-format.md          # Remove DTStack version-dir rules, use generic
│   ├── directory-naming.md        # Remove DTStack module key table, use generic
│   └── xmind-output.md            # Remove DTStack sample-driven rules
└── shared/scripts/
    └── load-config.mjs            # + schema validation, remove getDtstackModules()
config/
└── repo-branch-mapping.yaml       # Migrate to dtstack-data branch
cases/
├── archive/                       # Existing DTStack cases stay on dtstack-data branch
└── requirements/                  # Existing DTStack PRDs migrate to dtstack-data branch
CLAUDE.md                          # DTStack split-rule sections made conditional
```

### Pattern 1: Conditional Block Syntax in Rules/CLAUDE.md

**What:** Replace hardcoded DTStack-specific instructions with conditional guards that Claude reads at runtime.
**When to use:** Any rule that only applies when the user has configured source repos or DTStack-style modules.
**Example:**
```markdown
<!-- BEFORE (hardcoded) -->
## DTStack 追加规则
- **源码优先**：用例编写前必须先确认 `.repos/` 已切到目标分支

<!-- AFTER (conditional) -->
## 源码优先规则（当 config.repos 非空时启用）
> 以下规则仅适用于配置了 `repos` 字段的项目。若 config.json 中 `repos` 为空对象 `{}`，跳过本节。
- 确认 `.repos/` 中相关仓库已切到目标分支
- SQL 前置条件应包含数据源类型、表名、建表语句等
```

### Pattern 2: Variable Template Placeholders in Examples

**What:** Replace concrete DTStack business values in rule examples with `${variable}` style placeholders.
**When to use:** Any example that references Doris, Hive, SparkThrift, data-assets, or other DTStack-specific terms.
**Example:**
```markdown
<!-- BEFORE -->
2、Doris2.x SQL语句准备:
DROP TABLE IF EXISTS test_db.test_table;

<!-- AFTER -->
2、${datasource_type} SQL语句准备:
DROP TABLE IF EXISTS ${schema}.${table};
INSERT INTO ${schema}.${table} VALUES (...);
```

### Pattern 3: Generalized Config Schema

**What:** Rename DTStack-specific keys and remove hardcoded module/repo entries.
**When to use:** Config schema redesign in GEN-01.

```json
// BEFORE (DTStack-specific)
{
  "modules": {
    "data-assets": { "type": "dtstack", "zentaoId": 23, ... }
  },
  "repoBranchMapping": "config/repo-branch-mapping.yaml",
  "dataAssetsVersionMap": { ... }
}

// AFTER (generalized)
{
  "project": {
    "name": "my-project",
    "displayName": "My Project"
  },
  "modules": {
    "my-module": {
      "zh": "我的模块",
      "trackerId": null,         // optional: issue tracker ID (was zentaoId)
      "xmind": "cases/xmind/my-module/",
      "archive": "cases/archive/my-module/",
      "requirements": "cases/requirements/my-module/"
    }
  },
  "repos": {},                   // optional: source repo paths
  "stackTrace": {},              // optional: package-prefix → repo mapping
  "branchMapping": null,         // optional: path to branch mapping file (was repoBranchMapping)
  "trash": { "dir": ".trash/", "retentionDays": 30 },
  "assets": { "images": "assets/images/" },
  "reports": { "bugs": "reports/bugs/", "conflicts": "reports/conflicts/" },
  "shortcuts": { ... },
  "integrations": { ... }
}
```

### Pattern 4: loadConfig() with Validation

**What:** Add required-field validation to `loadConfig()` that throws a descriptive error naming the missing field.
**When to use:** GEN-02.

```javascript
// Source: hand-written, project convention
const REQUIRED_FIELDS = [
  { path: 'project.name', description: 'project name' },
  { path: 'modules', description: 'modules map (can be empty object)' },
];

export function loadConfig() {
  if (!_config) {
    let raw;
    try {
      raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    } catch (err) {
      throw new Error(
        `Failed to read config at ${CONFIG_PATH}: ${err.message}`
      );
    }
    for (const { path: fieldPath, description } of REQUIRED_FIELDS) {
      const value = getNestedValue(raw, fieldPath);
      if (value === undefined || value === null) {
        throw new Error(
          `config.json is missing required field "${fieldPath}" (${description}). ` +
          `Please check ${CONFIG_PATH}.`
        );
      }
    }
    _config = raw;
  }
  return _config;
}
```

### Pattern 5: getDtstackModules() Generalization

**What:** Replace `getDtstackModules()` (which filters by `type: "dtstack"`) with a generic function that doesn't encode a business-specific type.
**When to use:** GEN-01/GEN-02, any downstream script that currently calls `getDtstackModules()`.

```javascript
// BEFORE (DTStack-specific)
export function getDtstackModules() {
  // filters by mod.type !== "custom"
}

// AFTER (generic): callers decide filtering logic based on config fields
export function getModuleKeys() {
  return Object.keys(loadConfig().modules || {});
}

// For source-repo-aware modules (replaces DTStack-type filter)
export function getModulesWithBranchMapping() {
  const config = loadConfig();
  if (!config.branchMapping) return [];
  return Object.keys(config.modules || {});
}
```

### Anti-Patterns to Avoid

- **Hardcoding DTStack module names in script logic:** Any `if (module === 'data-assets')` pattern must be replaced with config-driven conditionals.
- **Assuming `repos` is always populated:** After generalization, `config.repos` defaults to `{}`. Always check `Object.keys(config.repos || {}).length > 0` before using repo paths.
- **Deleting DTStack data from main before creating dtstack-data branch:** Always create the target branch and verify data is on it before removing from main/release.
- **Modifying files in `.repos/`:** These are read-only source repos per `repo-safety.md`. Never commit or push to them.
- **Using `getDtstackModules()` after GEN-01:** This function encodes DTStack business logic and must be removed. Any call site must be updated.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Config schema validation | Custom deep-validation framework | Simple required-field loop or Ajv | Schema is small; over-engineering adds maintenance burden |
| Git branch creation + file migration | Custom scripting | Standard `git checkout -b`, `git rm`, `git mv` commands | Git handles this correctly; custom tooling adds risk |
| Conditional text processing in rules | Runtime template engine | Static Markdown conditional blocks (human-readable) | Claude reads Markdown natively; runtime templating adds complexity |
| Module type classification | Type hierarchy / class system | Config field presence checks (duck typing) | Simpler, more flexible, aligns with existing config-driven patterns |

**Key insight:** This is a text/config refactoring phase, not a feature-building phase. Most "solutions" here are deletion and simplification, not new construction. The less new code written, the better.

---

## Common Pitfalls

### Pitfall 1: Breaking Downstream Scripts Without Noticing

**What goes wrong:** Renaming `repoBranchMapping` → `branchMapping` in config.json without updating all callers causes silent failures — scripts fall through to a default value rather than crashing.
**Why it happens:** `getRepoBranchMappingPath()` in `load-config.mjs` uses `config.repoBranchMapping ?? "config/repo-branch-mapping.yaml"` — the `??` fallback masks the breakage.
**How to avoid:** Do a project-wide grep for each renamed field key before changing config.json. Update all call sites atomically.
**Warning signs:** `getRepoBranchMappingPath()` returning the default path instead of the configured value.

### Pitfall 2: dtstack-data Branch Missing Files from `.repos/`

**What goes wrong:** `.repos/` is excluded from git tracking (gitignore or submodules). If the dtstack-data branch is created from a state where `.repos/` is absent, the branch won't have source repo data — but that's expected behavior.
**Why it happens:** Source repos are runtime-cloned, not committed. The dtstack-data branch should contain DTStack *config and cases data*, not the actual source repos.
**How to avoid:** Clarify the migration scope: dtstack-data branch holds `config.json` (DTStack version), `config/repo-branch-mapping.yaml`, `cases/archive/` DTStack subdirs, `cases/requirements/` DTStack content, and `.claude/rules/` DTStack-heavy versions. Not `.repos/`.
**Warning signs:** Trying to `git add .repos/` — this will fail or create enormous commits.

### Pitfall 3: Intermediate JSON Schema "Generalization" Breaking Existing Converters

**What goes wrong:** Removing `meta.prd_version` or `meta.module_key` from the intermediate JSON schema breaks `json-to-archive-md.mjs`, which uses these fields to compute output paths.
**Why it happens:** The intermediate format is consumed by converters that make assumptions about DTStack-style versioned directories.
**How to avoid:** Keep all existing `meta` fields in the intermediate JSON but make them optional (not required). Add `source_standard` field — `getDtstackPreferredArchiveBaseName()` already checks `meta.source_standard !== "dtstack"`. This is the correct gating mechanism.
**Warning signs:** Archive converter writing to wrong output directory, or `prd_version` path component missing from output path.

### Pitfall 4: Conditional Blocks in Rules Becoming Unreadable

**What goes wrong:** Rules files become cluttered with nested conditions, making them harder to read than the original DTStack-specific versions.
**Why it happens:** Each conditional block adds visual noise. If there are too many conditions, Claude may misread or skip sections.
**How to avoid:** Use clear section headers: `## 源码优先规则（需要 config.repos 非空）` rather than inline `if` syntax. Put conditional blocks at the end of each rules file, not interspersed with generic rules.
**Warning signs:** A rules file where more than 40% of content is inside conditional guards.

### Pitfall 5: `getDtstackModules()` Call Sites Not Updated

**What goes wrong:** Scripts that call `getDtstackModules()` continue to work with the old function after GEN-01, but break when the function is removed or the `type` field is removed from config.
**Why it happens:** The function is exported and may be called from skills scripts not listed in CONTEXT.md's coupling inventory.
**How to avoid:** Do a full grep for `getDtstackModules` across the entire `.claude/` directory before removing the function.
**Warning signs:** Any script importing `getDtstackModules` from `load-config.mjs`.

### Pitfall 6: CLAUDE.md Conditional Syntax Not Recognized at Runtime

**What goes wrong:** DTStack sections are converted to conditional guards but Claude misreads the syntax and applies DTStack rules to all users.
**Why it happens:** Claude reads Markdown prose. Conditional blocks must be written in plain, unambiguous prose — not in programming-language `if` syntax.
**How to avoid:** Use explicit, prose-form guards: "以下规则仅在 config.json 中 `repos` 字段为非空对象时适用。若 `repos: {}` 则跳过本节。" Test the conditional by running with a blank config.
**Warning signs:** Reviewer or Writer referencing SQL setup steps (Doris/Hive/SparkThrift) when using a non-DTStack config.

---

## Code Examples

Verified patterns from project codebase:

### Required-Field Validation (GEN-02)

```javascript
// .claude/shared/scripts/load-config.mjs
// Pattern: validate at load time, throw with field name
function assertRequiredFields(config) {
  const checks = [
    ['project', config.project],
    ['project.name', config.project?.name],
    ['modules', config.modules],
  ];
  for (const [fieldPath, value] of checks) {
    if (value === undefined || value === null) {
      throw new Error(
        `config.json missing required field: "${fieldPath}". ` +
        `Please ensure ${CONFIG_PATH} contains this field.`
      );
    }
  }
}
```

### Config Field Rename Migration (GEN-01)

```javascript
// Old field: config.repoBranchMapping
// New field: config.branchMapping
// Migration: update getRepoBranchMappingPath()
export function getRepoBranchMappingPath() {
  const config = loadConfig();
  // Support both old and new field names during migration
  const mappingPath = config.branchMapping ?? config.repoBranchMapping ?? null;
  if (!mappingPath) return null;
  return resolveWorkspacePath(mappingPath);
}
```

### Conditional Prose Block Pattern (GEN-03/GEN-04)

```markdown
## 源码分析要求

以下规则**仅在 config.json 中 `repos` 字段为非空对象时适用**。
若项目未配置源码仓库（`repos: {}`），跳过本节所有内容。

---
（when repos is configured）
确认 `.repos/` 中对应仓库已切换到目标分支后，参考以下规则...
```

### getDtstackModules() Replacement (GEN-01)

```javascript
// output-naming-contracts.mjs: getDtstackPreferredArchiveBaseName
// BEFORE: checks meta.source_standard !== "dtstack"
// AFTER: same check — this is already the correct generic gate
// No code change needed here; just remove the function name implication

// load-config.mjs: getDtstackModules() → remove
// Callers: use config.modules directly with optional filtering
export function getModuleKeys() {
  return Object.keys(loadConfig().modules ?? {});
}
```

### Minimal Blank Config (for testing GEN-02 success criteria)

```json
{
  "project": {
    "name": "my-project",
    "displayName": "My Project"
  },
  "modules": {},
  "repos": {},
  "stackTrace": {},
  "trash": { "dir": ".trash/", "retentionDays": 30 },
  "assets": { "images": "assets/images/" },
  "reports": { "bugs": "reports/bugs/", "conflicts": "reports/conflicts/" },
  "shortcuts": {
    "latestXmind": "latest-output.xmind",
    "latestEnhancedPrd": "latest-prd-enhanced.md",
    "latestBugReport": "latest-bug-report.html",
    "latestConflictReport": "latest-conflict-report.html"
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded DTStack module list in `config.json` | Generic `modules` map with optional `trackerId` | Phase 1 (this phase) | Any project can define its own modules |
| `getDtstackModules()` type-filter function | `getModuleKeys()` — returns all module keys | Phase 1 (this phase) | Removes business logic from shared utility |
| Java package→repo table in `repo-safety.md` | Pointer to `config.stackTrace` field | Phase 1 (this phase) | Users configure their own package mappings |
| Doris/Hive/SparkThrift examples in rules | `${datasource_type}` placeholder templates | Phase 1 (this phase) | Rules work for any database/datasource |
| `repoBranchMapping`, `zentaoId`, `dataAssetsVersionMap` keys | `branchMapping`, `trackerId`, removed | Phase 1 (this phase) | Neutral field names, no vendor lock-in |

**Deprecated/outdated:**
- `getDtstackModules()`: Remove after ensuring all call sites are updated
- `config.dataAssetsVersionMap`: Remove (DTStack-only, no generic equivalent needed)
- `config.repoBranchMapping`: Rename to `config.branchMapping`
- `config.modules[*].zentaoId`: Rename to `trackerId` (or remove if unused by non-DTStack users)

---

## Migration File Inventory

### Files to Rewrite In-Place (main/release branch)

These files lose their DTStack-specific content via conditional blocks or placeholder substitution:

| File | Change Type | DTStack References |
|------|-----------|--------------------|
| `.claude/config.json` | Schema redesign | 6 modules, 18 repo paths, 8 Java mappings, zentaoId, repoBranchMapping, dataAssetsVersionMap |
| `.claude/rules/test-case-writing.md` | Conditional block | 7 DTStack refs (SQL setup, Doris/Hive/SparkThrift) |
| `.claude/rules/repo-safety.md` | Remove table + add pointer | 10 DTStack refs (Java→repo table) |
| `.claude/rules/archive-format.md` | Conditional block | 8 DTStack refs (version dirs, DTStack special rules) |
| `.claude/rules/directory-naming.md` | Replace table with generic | 7 DTStack refs (module key mapping) |
| `.claude/rules/xmind-output.md` | Conditional block | 4 DTStack refs (sample-driven rules) |
| `.claude/shared/scripts/load-config.mjs` | Remove `getDtstackModules()`, add validation | 1 DTStack function |
| `.claude/shared/scripts/output-naming-contracts.mjs` | Rename function, keep logic | 4 DTStack refs (function naming) |
| `CLAUDE.md` | Conditional blocks | DTStack/XYZH split rule section |

### Files to Migrate to dtstack-data Branch (leave only minimal/empty version on main)

| File/Directory | Content | Action |
|----------------|---------|--------|
| `config/repo-branch-mapping.yaml` | DTStack repo profiles, branch rules, 岚图 custom profile | Move to dtstack-data; replace with empty template on main |
| `cases/requirements/data-assets/` | DTStack PRD documents | Move to dtstack-data |
| `cases/requirements/batch-works/` | DTStack PRD documents | Move to dtstack-data (if exists) |
| `cases/archive/data-assets/` | DTStack test case archives | Move to dtstack-data |
| `cases/archive/batch-works/` | DTStack test case archives | Move to dtstack-data |
| `cases/archive/data-query/` | DTStack test case archives | Move to dtstack-data |
| `cases/archive/variable-center/` | DTStack test case archives | Move to dtstack-data |
| `cases/archive/public-service/` | DTStack test case archives | Move to dtstack-data |
| `cases/history/` | Historical CSV source material | Move to dtstack-data |
| `cases/xmind/data-assets/` | DTStack XMind files | Move to dtstack-data |
| `cases/xmind/batch-works/` | DTStack XMind files | Move to dtstack-data |
| `cases/xmind/data-query/` | DTStack XMind files | Move to dtstack-data |
| `cases/xmind/variable-center/` | DTStack XMind files | Move to dtstack-data |
| `cases/xmind/public-service/` | DTStack XMind files | Move to dtstack-data |

Note: `cases/archive/custom/xyzh/` stays on main — XYZH is a separate client, not DTStack.

**Recommendation for Claude's Discretion (branch timing):** Create dtstack-data branch as the very first action in GEN-06, before any file deletions on main. This ensures no data is ever lost.

---

## Open Questions

1. **`cases/requirements/custom/xyzh/` scope**
   - What we know: xyzh is a client project, not DTStack. It has its own `requirements` and `archive` directories.
   - What's unclear: Does xyzh content stay on main, or does it also move to a separate branch? CONTEXT.md and REQUIREMENTS.md do not specify.
   - Recommendation: Keep xyzh content on main — it's an example of a non-DTStack project that the generalized framework supports. Only DTStack-specific content moves.

2. **Skill prompts (test-case-generator/prompts/step-*.md) scope for GEN-04**
   - What we know: `step-source-sync.md` is explicitly DTStack-only. `step-prd-formalize.md` is DTStack-only. Writer template references `dt-center-assets` and Java annotations.
   - What's unclear: GEN-04 says "all Prompts/Steps generalized" — does this mean these DTStack-only steps are converted to conditional steps, or does GEN-04 only apply to steps shared across all users?
   - Recommendation: DTStack-only steps (source-sync, prd-formalize) become conditional steps with a prose guard at the top: "このステップは config.repos が設定されている場合のみ実行される". Writer template's "编排器预提取" section becomes conditional on repos being configured.

3. **`getDtstackPreferredArchiveBaseName()` in output-naming-contracts.mjs**
   - What we know: The function checks `meta.source_standard !== "dtstack"` — this is already the correct generic gate. The function name is DTStack-specific.
   - What's unclear: Should this function be renamed to something generic, or is it a low-risk internal function that can stay as-is for now?
   - Recommendation: Rename to `getPreferredArchiveBaseName()` and remove the `source_standard` check entirely — the function should use `meta.archive_file_name || meta.requirement_title` for any project, not just DTStack.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` (v25, no external deps) |
| Config file | none — use `--test` flag |
| Quick run command | `node --test .claude/shared/scripts/*.test.mjs` |
| Full suite command | `node --test .claude/shared/scripts/*.test.mjs` |

Note: No test files exist yet. All test infrastructure must be created in Wave 0.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GEN-01 | loadConfig() returns schema without DTStack field names (zentaoId, repoBranchMapping, dataAssetsVersionMap) | unit | `node --test .claude/shared/scripts/load-config.test.mjs` | Wave 0 |
| GEN-01 | getModuleMap() works with generalized config (no `type` field) | unit | `node --test .claude/shared/scripts/load-config.test.mjs` | Wave 0 |
| GEN-02 | loadConfig() throws error naming missing field when `project.name` absent | unit | `node --test .claude/shared/scripts/load-config.test.mjs` | Wave 0 |
| GEN-02 | loadConfig() throws error naming missing field when `modules` absent | unit | `node --test .claude/shared/scripts/load-config.test.mjs` | Wave 0 |
| GEN-02 | loadConfig() succeeds with minimal blank config | unit | `node --test .claude/shared/scripts/load-config.test.mjs` | Wave 0 |
| GEN-05 | intermediate JSON with no `source_standard: dtstack` still converts via json-to-archive-md.mjs | integration | `node --test .claude/shared/scripts/output-naming-contracts.test.mjs` | Wave 0 |
| GEN-05 | deriveArchiveBaseName() works without DTStack meta fields | unit | `node --test .claude/shared/scripts/output-naming-contracts.test.mjs` | Wave 0 |
| GEN-03 | No DTStack-specific terms in rules files (grep check) | smoke | `node --test .planning/tests/rules-generalization.test.mjs` | Wave 0 |
| GEN-04 | No Doris/Hive/SparkThrift literal terms in non-conditional prompt blocks | smoke | `node --test .planning/tests/prompts-generalization.test.mjs` | Wave 0 |
| GEN-06 | DTStack data dirs absent from main/release branch after migration | smoke | `node --test .planning/tests/branch-migration.test.mjs` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test .claude/shared/scripts/load-config.test.mjs`
- **Per wave merge:** `node --test .claude/shared/scripts/*.test.mjs && node --test .planning/tests/*.test.mjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `.claude/shared/scripts/load-config.test.mjs` — covers GEN-01, GEN-02
- [ ] `.claude/shared/scripts/output-naming-contracts.test.mjs` — covers GEN-05
- [ ] `.planning/tests/rules-generalization.test.mjs` — smoke: grep for hardcoded DTStack terms in rules files
- [ ] `.planning/tests/prompts-generalization.test.mjs` — smoke: grep for Doris/Hive/SparkThrift outside conditional blocks
- [ ] `.planning/tests/branch-migration.test.mjs` — smoke: verify expected dirs absent from release branch
- [ ] `.planning/tests/` directory — create this directory
- [ ] Framework install: none required (`node:test` is built-in)

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `.claude/config.json` — full schema with all DTStack fields enumerated
- Direct codebase read: `.claude/shared/scripts/load-config.mjs` — current implementation, `getDtstackModules()` confirmed
- Direct codebase read: `.claude/shared/scripts/output-naming-contracts.mjs` — `getDtstackPreferredArchiveBaseName()` confirmed
- Direct codebase read: `.claude/skills/test-case-generator/SKILL.md` — step inventory, DTStack-conditional steps identified
- Direct codebase read: `.claude/skills/test-case-generator/prompts/step-source-sync.md` — DTStack-only step confirmed
- Direct codebase read: `config/repo-branch-mapping.yaml` — full DTStack repo profile + 岚图 custom profile
- Direct codebase read: `.claude/shared/scripts/package.json` — `jszip` is only dependency, confirming zero-dep approach preferred

### Secondary (MEDIUM confidence)
- Node.js v22+ documentation: `node:test` built-in test runner is stable and production-ready as of Node 22; project uses Node 25 so it is fully supported
- Project conventions: ESM modules, no TypeScript, minimal dependencies — hand-written validation preferred over Ajv/Zod

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — read directly from codebase, no external research needed
- Architecture: HIGH — patterns derived from existing code structure and CONTEXT.md locked decisions
- Pitfalls: HIGH — derived from actual code analysis (the `??` fallback pitfall, the `getDtstackModules` grep requirement)
- Migration file list: MEDIUM — derived from CONTEXT.md coupling inventory; actual directory contents not exhaustively enumerated

**Research date:** 2026-03-31
**Valid until:** Stable — this is a pure refactoring phase with no external dependencies
