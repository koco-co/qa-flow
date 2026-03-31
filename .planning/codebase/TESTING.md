# Testing Patterns

**Analysis Date:** 2026-03-31

## Test Framework

**Runner:**
- No external test framework (no Jest, Vitest, Mocha). Custom homegrown runner.
- Entry point: `.claude/tests/run-all.mjs`
- Config: `.claude/tests/package.json` (`"scripts": { "test": "node run-all.mjs" }`)

**Assertion Library:**
- None. Custom `assert(condition, msg, details?)` function defined inline in each test file.

**Run Commands:**
```bash
# From .claude/tests/
node run-all.mjs           # Run all test files
node test-load-config.mjs  # Run single test file

# With filter (supported in some test files)
TEST_FILTER="DTStack" node test-json-to-xmind.mjs
```

## Test File Organization

**Location:**
- All test files in `.claude/tests/`
- Completely separate from source scripts in `.claude/shared/scripts/` and `.claude/skills/`

**Naming:**
- All test files follow `test-<subject>.mjs` pattern
- Subject name matches the script or feature being tested:
  - `test-load-config.mjs` → tests `.claude/shared/scripts/load-config.mjs`
  - `test-json-to-xmind.mjs` → tests `.claude/skills/xmind-converter/scripts/json-to-xmind.mjs`
  - `test-archive-history-scripts.mjs` → tests archive converter scripts
  - `test-workflow-doc-validator.mjs` → tests document/code contract alignment
  - `test-output-convention-migration.mjs` → tests file system state invariants

**Structure:**
```
.claude/tests/
├── package.json             # { "type": "module", "scripts": { "test": "node run-all.mjs" } }
├── run-all.mjs              # Discovery runner: reads test-*.mjs, spawns each via spawnSync
├── test-archive-history-scripts.mjs
├── test-formalized-prd-contract.mjs
├── test-front-matter-utils.mjs
├── test-json-to-xmind.mjs
├── test-lanhu-mcp-runtime.mjs
├── test-latest-link-utils.mjs
├── test-load-config.mjs
├── test-md-body-normalization.mjs
├── test-md-content-source-resolver.mjs
├── test-md-frontmatter-audit.mjs
├── test-md-semantic-enrichment.mjs
├── test-md-xmind-regeneration.mjs
├── test-output-convention-migration.mjs
├── test-repo-branch-mapping.mjs
└── test-workflow-doc-validator.mjs
```

## Test Structure

**Suite Organization:**

Each test file is a standalone script. Suites are delimited by `console.log` banners:

```javascript
/**
 * test-<subject>.mjs
 * <Description of what is tested>
 *
 * 运行: node test-<subject>.mjs
 */
import { ... } from "../shared/scripts/<subject>.mjs";

let passed = 0;
let failed = 0;

function assert(condition, msg, details = []) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
    return;
  }
  console.error(`  ❌ ${msg}`);
  details.forEach((detail) => console.error(`     - ${detail}`));
  failed++;
}

console.log("\n=== Test: <suite name> ===");
// ... assertions ...

console.log(`\n══════════════════════════════════════`);
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log(`══════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
```

**Patterns:**
- `process.on("exit", cleanup)` for guaranteed temporary file/dir cleanup
- Async tests use top-level `await` or an explicit `async function main()` called at end
- `TEST_FILTER` env variable supported in some files to run subset of tests

## Mocking

**Framework:** None. No mocking library.

**Patterns:**

Scripts under test are invoked via `spawnSync` / `execSync` as child processes, making them true black-box tests:

```javascript
// From test-json-to-xmind.mjs
function runScript(args) {
  try {
    const result = execSync(`node ${jsonToXmindScriptPath} ${args}`, {
      cwd: __dirname,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { stdout: result, stderr: "", code: 0 };
  } catch (err) {
    return { stdout: err.stdout || "", stderr: err.stderr || "", code: err.status };
  }
}

// From test-archive-history-scripts.mjs
function runNodeScript(scriptPath, args = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: __dirname,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  return {
    code: result.status ?? 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}
```

Utility functions (e.g., `loadConfig`, `parseFrontMatter`) are imported directly and called without mocking.

**What to Mock:**
- Not applicable — no mocking framework. Tests use real file system with temp directories.

**What NOT to Mock:**
- File system operations — tests create real temp files and dirs, then clean up.
- Config loading — `loadConfig()` reads the real `.claude/config.json`.

## Fixtures and Factories

**Test Data:**

Inline fixture factory functions are defined within the test file:

```javascript
// From test-archive-history-scripts.mjs
function createJsonFixture({
  projectName,
  requirementName,
  version,
  requirementId,
  prdPath,
  story,
}) {
  return {
    meta: {
      project_name: projectName,
      requirement_name: requirementName,
      version,
      ...(requirementId ? { requirement_id: requirementId } : {}),
      generated_at: new Date().toISOString(),
      agent_id: "test-archive-history-scripts",
    },
    modules: [ /* realistic structure */ ],
  };
}
```

For XMind binary format fixtures, `JSZip` is used to build `.xmind` buffers in-memory:

```javascript
async function createXmindFixtureBuffer(title) {
  const xmindContent = [ /* content.json structure */ ];
  const zip = new JSZip();
  zip.file("content.json", JSON.stringify(xmindContent, null, 2));
  return zip.generateAsync({ type: "nodebuffer" });
}
```

**Location:**
- Fixtures are created inline in test setup, not in separate fixture files.
- Temporary files written to `.claude/tests/__test_<name>_<pid>-<timestamp>/` directories.
- Cleanup via `process.on("exit", cleanup)` with explicit `rmSync(..., { recursive: true, force: true })`.

## Coverage

**Requirements:** None enforced. No coverage tooling configured.

**View Coverage:**
```bash
# Not available — no coverage tooling
```

## Test Types

**Unit Tests:**
- Pure function tests: `test-load-config.mjs`, `test-latest-link-utils.mjs`, `test-front-matter-utils.mjs`
- Import functions directly and assert return values

**Integration Tests:**
- CLI integration tests: invoke scripts as child processes via `execSync`/`spawnSync`, verify exit codes, stdout/stderr content, and resulting file system state
- Examples: `test-json-to-xmind.mjs`, `test-archive-history-scripts.mjs`

**Contract / Regression Tests:**
- `test-workflow-doc-validator.mjs` — reads source files and docs, validates cross-file contracts (e.g., CLAUDE.md headings referenced in Skill docs are real, scripts implement documented features)
- `test-output-convention-migration.mjs` — validates file system state (repo-level invariants like no legacy-named files, symlinks point to real files)
- `test-formalized-prd-contract.mjs` — validates no stale artifact types exist in `cases/requirements/`

**E2E Tests:** Not used.

## Common Patterns

**Temp directory isolation:**
```javascript
const runId = `${process.pid}-${Date.now()}`;
const tempRoot = resolve(__dirname, `__test_archive_history_${runId}`);
// ... use tempRoot for all temp files
process.on("exit", cleanup);
```

**Exit code assertion:**
```javascript
const result = runScript(`${tmpInput} ${tmpOutput}`);
assert(result.code === 0, "退出码为 0");
assert(existsSync(tmpOutput), "生成了 .xmind 文件");
assert(result.stdout.includes("XMind 文件已生成"), "输出包含成功消息");
```

**File system state assertion after script run:**
```javascript
assert(existsSync(outputPath), "输出文件已生成", [outputPath]);
const content = readFileSync(outputPath, "utf8");
assert(content.includes("suite_name:"), "frontmatter 包含 suite_name");
```

**XMind binary content assertion:**
```javascript
async function readXmindContent(outputPath) {
  const zip = await JSZip.loadAsync(readFileSync(outputPath));
  const contentStr = await zip.file("content.json").async("string");
  return JSON.parse(contentStr);
}
const content = await readXmindContent(dtOutput);
const root = content[0]?.rootTopic;
assert(root?.title === "数据资产v6.4.10迭代用例", "DTStack root title 正确");
```

**Snapshot/restore for shared symlinks:**
```javascript
const preservedLatestOutput = captureExistingPath(latestOutputLink);
process.on("exit", () => {
  cleanup();
  restorePath(latestOutputLink, preservedLatestOutput);
});
```

**Error path assertion:**
```javascript
const result = runScript(`${tmpInput} ${invalidNamedOutput}`);
assert(result.code !== 0, "退出码非 0");
assert(result.stderr.includes("命名 contract"), "错误消息说明命名约定");
assert(!pathExists(invalidNamedOutput), "未生成不合规命名文件");
```

## Run-All Runner

`.claude/tests/run-all.mjs` auto-discovers all `test-*.mjs` files in the same directory, runs them sequentially via `spawnSync`, collects exit codes, and prints a final summary. A non-zero exit from any test file counts as a failure.

```bash
cd .claude/tests && node run-all.mjs
# or
cd .claude/tests && npm test
```

---

*Testing analysis: 2026-03-31*
