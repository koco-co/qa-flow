# Coding Conventions

**Analysis Date:** 2026-03-31

## Naming Patterns

**Files:**
- Scripts use kebab-case: `load-config.mjs`, `front-matter-utils.mjs`, `json-to-xmind.mjs`
- Test files prefix with `test-`: `test-load-config.mjs`, `test-archive-history-scripts.mjs`
- All scripts use `.mjs` extension (ES module)
- CLI entry points follow verb-noun: `refresh-latest-link.mjs`, `unify-directory-structure.mjs`

**Functions:**
- camelCase throughout: `loadConfig()`, `buildFrontMatter()`, `parseFrontMatter()`, `refreshLatestLink()`
- Functions named with verb-noun pairs: `getModuleMap()`, `extractVersionFromPath()`, `inferTags()`
- Private helpers (not exported) use descriptive camelCase: `yamlStr()`, `unquoteYaml()`, `cleanPrdName()`
- Boolean predicates use is/has/looks prefix: `isDtstackMeta()`, `hasArchiveStepTable()`, `looksLikeBulletXmindTree()`

**Variables:**
- camelCase for regular variables
- SCREAMING_SNAKE_CASE for module-level constants: `PRIORITY_MAP`, `STOP_WORDS`, `RESERVED_OUTPUT_NAME`, `NAMING_CONFIG`
- `__dirname` pattern for ESM path resolution (no top-level await pattern avoided)

**Types / Data shapes:**
- JSDoc annotations for function parameters and return types (not TypeScript)
- Object shapes documented in JSDoc `@param` with `{Record<string, any>}` notation
- Frozen objects via `Object.freeze()` for contract constants: `CANONICAL_ARCHIVE_CASE_BLOCK_CONTRACT`, `ARCHIVE_BODY_STRUCTURE_CATEGORIES`

## Code Style

**Formatting:**
- No formatter config detected (no `.prettierrc`, `biome.json`, or `eslint.config.*`)
- Single quotes for strings in most scripts: `'utf8'`, `'dtstack'`
- 2-space indentation throughout
- Trailing commas in multi-line arrays and function arguments
- Arrow functions for short callbacks, named functions for reusable logic

**Module System:**
- ES modules exclusively (`"type": "module"` in `package.json`)
- Named exports only — no default exports
- `import { ... } from "..."` with destructuring

## Import Organization

**Order (observed pattern):**
1. Node.js built-ins: `fs`, `path`, `child_process`, `url`
2. Third-party packages: `jszip`, `xmind-generator`
3. Local shared scripts: `../shared/scripts/load-config.mjs`
4. Sibling scripts within skill

**Path Aliases:**
- None. All imports use relative paths.
- ESM `__dirname` via `dirname(fileURLToPath(import.meta.url))`

## Error Handling

**Patterns:**
- Throw `new Error(message)` with descriptive Chinese messages for user-facing CLIs
- `try/catch` around file I/O with silent `continue` or `return` for non-critical failures:
  ```javascript
  try {
    entries = readdirSync(dirPath);
  } catch {
    return { warnings, suggestions };
  }
  ```
- Process exit on fatal errors: `process.exit(1)` after `console.error()`
- `main().catch((err) => { console.error("FATAL:", err); process.exit(1); })` pattern for async entry points
- Validate inputs early with guard clauses before main logic

## Logging

**Framework:** `console.log` / `console.error` (no logging library)

**Patterns:**
- `console.log(msg)` for operational output in scripts
- `console.error(msg)` for errors and failures
- CLI scripts output structured Chinese messages: `"最新快捷链接已刷新：${linkPath}"`
- Test runner uses `✅`/`❌` emoji prefix for pass/fail lines
- Section dividers use `══════════════════════════════════════`

## Comments

**When to Comment:**
- File-level JSDoc block at top of every script with description and exports list
- Function-level JSDoc with `@param`, `@returns`, and inline usage notes
- Section dividers with `// ─── Section Name ──────` pattern for large files

**JSDoc usage:**
```javascript
/**
 * 在仓库根目录创建或刷新显式命名的符号链接
 * @param {string} targetPath - 实际输出文件的绝对或相对路径
 * @param {string} linkName - 根目录快捷链接文件名（如 latest-output.xmind）
 * @returns {string} 创建的链接绝对路径
 */
export function refreshLatestLink(targetPath, linkName) { ... }
```

## Function Design

**Size:** Functions are focused and typically 10-40 lines. Larger files use internal section dividers.

**Parameters:** Plain objects for option bags. Destructured in function signature when possible:
```javascript
export function inferTags({
  title = "",
  headings = [],
  modulePath = "",
  meta = {},
} = {}) { ... }
```

**Return Values:**
- Single values or structured objects `{ warnings, suggestions }`, `{ valid, missing, schemaVersion }`
- Null returned for "not found" cases (not undefined): `return null`
- Throw for contract violations rather than returning error objects

## Module Design

**Exports:**
- Named exports only, no default exports
- Utility modules export pure functions
- Config modules export lazy-loaded singletons via module-level variable:
  ```javascript
  let _config = null;
  export function loadConfig() {
    if (!_config) {
      _config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    }
    return _config;
  }
  ```

**Barrel Files:**
- Not used. Each module imported directly by path.

## Immutability

New objects are always created rather than mutated:
```javascript
const merged = docType ? { doc_type: docType, ...fields } : { ...fields };
```

Spread operator used consistently for object composition. `Object.freeze()` used for exported constants.

## Chinese / Bilingual Conventions

- Technical identifiers (function names, variables, file names) in English
- User-facing messages, comments, and documentation in Chinese
- Module keys in English (`data-assets`, `batch-works`), Chinese names stored in config `zh` field

---

*Convention analysis: 2026-03-31*
