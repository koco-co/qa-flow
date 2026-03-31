/**
 * test-init-wizard.mjs
 * Unit tests for init-wizard.mjs: scan + parse-file behaviors
 *
 * Covers:
 *   - inferModuleKeyFromFilename edge cases
 *   - scanProject module inference from cases/xmind/
 *   - scanProject versioned module detection (INIT-03)
 *   - scanProject empty directory
 *   - scanProject signal detection (.repos, images, history, PRD versions)
 *   - scanProject read-only constraint (D-03)
 *   - parseHistoryFile CSV parsing (BOM handling)
 *   - parseHistoryFile XMind parsing (INIT-02)
 *   - scanProject PRD version patterns
 *
 * Run: node .claude/tests/test-init-wizard.mjs
 */
import {
  scanProject,
  parseHistoryFile,
  inferModuleKeyFromFilename,
  writeOutputs,
  loadExistingConfig,
  renderTemplate,
  buildConfigObject,
  mergeConfigGroups,
} from '../skills/using-qa-flow/scripts/init-wizard.mjs';
import { mkdirSync, writeFileSync, readdirSync, rmSync, existsSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ ${msg}`);
    failed++;
  }
}

/**
 * Create a unique temp directory for test isolation.
 * @returns {string} Absolute path to temp dir
 */
function createTempDir() {
  const prefix = join(tmpdir(), `qa-flow-test-init-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(prefix, { recursive: true });
  return prefix;
}

/**
 * Recursively list all files/dirs under a directory (for snapshot comparison).
 * @param {string} dir
 * @param {string} [base='']
 * @returns {string[]} Sorted list of relative paths
 */
function snapshotDir(dir, base = '') {
  const results = [];
  if (!existsSync(dir)) return results;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    results.push(rel);
    if (entry.isDirectory()) {
      results.push(...snapshotDir(join(dir, entry.name), rel));
    }
  }
  return results.sort();
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 1: inferModuleKeyFromFilename
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== Test: inferModuleKeyFromFilename ===');

assert(
  inferModuleKeyFromFilename('20260311-data-assets-v0.2.0.csv') === 'data-assets',
  "strips date prefix + version suffix: '20260311-data-assets-v0.2.0.csv' → 'data-assets'"
);

assert(
  inferModuleKeyFromFilename('my-module.xmind') === 'my-module',
  "strips extension only: 'my-module.xmind' → 'my-module'"
);

assert(
  inferModuleKeyFromFilename('20260311_report.csv') === 'report',
  "strips date prefix with underscore: '20260311_report.csv' → 'report'"
);

assert(
  inferModuleKeyFromFilename('data-assets-v1.2.3.xmind') === 'data-assets',
  "strips version suffix: 'data-assets-v1.2.3.xmind' → 'data-assets'"
);

assert(
  inferModuleKeyFromFilename('simple.csv') === 'simple',
  "strips extension only: 'simple.csv' → 'simple'"
);

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 2: scanProject — module inference
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== Test: scanProject — module inference ===');
{
  const tempDir = createTempDir();
  try {
    mkdirSync(join(tempDir, 'cases', 'xmind', 'my-module'), { recursive: true });

    const result = scanProject(tempDir);

    assert(result.modules.length >= 1, 'modules array has at least 1 entry');
    assert(
      result.modules.some(m => m.key === 'my-module'),
      "modules contains entry with key 'my-module'"
    );
    const mod = result.modules.find(m => m.key === 'my-module');
    assert(mod.versioned === false, 'module without version subdirs has versioned === false');
    assert(
      mod.inferredFrom.includes('cases/xmind'),
      "inferredFrom includes 'cases/xmind'"
    );
    assert(result.signals.hasCasesDir === true, 'hasCasesDir is true when cases/ exists');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 3: scanProject — versioned module (INIT-03)
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== Test: scanProject — versioned module (INIT-03) ===');
{
  const tempDir = createTempDir();
  try {
    mkdirSync(join(tempDir, 'cases', 'xmind', 'data-assets', 'v6.4.10'), { recursive: true });

    const result = scanProject(tempDir);
    const mod = result.modules.find(m => m.key === 'data-assets');

    assert(mod !== undefined, "found module with key 'data-assets'");
    assert(mod.versioned === true, 'module with v6.4.10/ subdir has versioned === true');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 4: scanProject — empty directory
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== Test: scanProject — empty directory ===');
{
  const tempDir = createTempDir();
  try {
    const result = scanProject(tempDir);

    assert(result.modules.length === 0, 'empty dir → modules.length === 0');
    assert(result.signals.hasCasesDir === false, 'empty dir → hasCasesDir === false');
    assert(result.signals.hasReposDir === false, 'empty dir → hasReposDir === false');
    assert(result.signals.hasImages === false, 'empty dir → hasImages === false');
    assert(result.signals.historyFiles.length === 0, 'empty dir → historyFiles.length === 0');
    assert(result.signals.prdVersionPatterns.length === 0, 'empty dir → prdVersionPatterns.length === 0');
    assert(result.signals.existingConfig === null, 'empty dir → existingConfig === null');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 5: scanProject — signal detection
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== Test: scanProject — signal detection ===');
{
  const tempDir = createTempDir();
  try {
    // Create .repos/ directory
    mkdirSync(join(tempDir, '.repos'), { recursive: true });
    // Create assets/images/ with an image file
    mkdirSync(join(tempDir, 'assets', 'images'), { recursive: true });
    writeFileSync(join(tempDir, 'assets', 'images', 'test.png'), Buffer.from([0x89]));
    // Create cases/history/ with a CSV file
    mkdirSync(join(tempDir, 'cases', 'history'), { recursive: true });
    writeFileSync(join(tempDir, 'cases', 'history', 'test.csv'), '"col1","col2"\n"val1","val2"');

    const result = scanProject(tempDir);

    assert(result.signals.hasReposDir === true, '.repos/ dir → hasReposDir === true');
    assert(result.signals.hasImages === true, 'assets/images/test.png → hasImages === true');
    assert(result.signals.historyFiles.length >= 1, 'cases/history/test.csv → historyFiles >= 1');
    assert(
      result.signals.historyFiles.some(f => f.type === '.csv'),
      "historyFiles contains entry with type '.csv'"
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 6: scanProject — read-only (D-03)
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== Test: scanProject — read-only (D-03) ===');
{
  const tempDir = createTempDir();
  try {
    mkdirSync(join(tempDir, 'cases', 'xmind', 'mod1'), { recursive: true });

    const before = snapshotDir(tempDir);
    scanProject(tempDir);
    const after = snapshotDir(tempDir);

    assert(
      JSON.stringify(before) === JSON.stringify(after),
      'scan does not create/modify any files (read-only, D-03)'
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 7: parseHistoryFile — CSV
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== Test: parseHistoryFile — CSV ===');
{
  const tempDir = createTempDir();
  try {
    // Write CSV with BOM
    const csvContent = '\uFEFF"模块名","用例标题"\n"登录","验证密码"';
    const csvPath = join(tempDir, '20260311-my-module-v1.0.csv');
    writeFileSync(csvPath, csvContent, 'utf8');

    const result = await parseHistoryFile(csvPath);

    assert(result.source === 'csv', "CSV → source === 'csv'");
    assert(result.candidates.length >= 1, 'CSV → candidates has at least 1 entry');
    assert(
      result.candidates.includes('my-module'),
      "CSV → candidates includes filename-derived 'my-module'"
    );
    assert(
      result.candidates.includes('模块名'),
      "CSV → candidates includes header-derived '模块名'"
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 8: parseHistoryFile — XMind (INIT-02)
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== Test: parseHistoryFile — XMind (INIT-02) ===');
{
  const tempDir = createTempDir();
  try {
    // Dynamically import JSZip to create a minimal .xmind fixture
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    zip.file('content.json', JSON.stringify([{
      rootTopic: { title: '数据资产测试用例' }
    }]));
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    const xmindPath = join(tempDir, 'test-module.xmind');
    writeFileSync(xmindPath, buf);

    const result = await parseHistoryFile(xmindPath);

    assert(result.source === 'xmind', "XMind → source === 'xmind'");
    assert(
      result.candidates.includes('数据资产测试用例'),
      "XMind → candidates includes root topic title '数据资产测试用例'"
    );
    assert(
      result.candidates.includes('test-module'),
      "XMind → candidates includes filename-derived 'test-module'"
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 9: scanProject — PRD version patterns
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== Test: scanProject — PRD version patterns ===');
{
  const tempDir = createTempDir();
  try {
    const versionDir = join(tempDir, 'cases', 'requirements', 'data-assets', 'v1.2.3');
    mkdirSync(versionDir, { recursive: true });
    writeFileSync(join(versionDir, 'prd-v1.2.3.md'), '# PRD v1.2.3');

    const result = scanProject(tempDir);

    assert(
      result.signals.prdVersionPatterns.includes('v1.2.3'),
      "PRD version patterns includes 'v1.2.3'"
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 10: buildConfigObject
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== Test: buildConfigObject ===');
{
  const result = buildConfigObject({
    projectName: 'test-proj',
    displayName: 'Test Project',
    casesRoot: 'cases/',
    modules: {
      'mod-a': { versioned: false },
    },
  });

  assert(result.project.name === 'test-proj', "project.name === 'test-proj'");
  assert(result.project.displayName === 'Test Project', "project.displayName === 'Test Project'");
  assert(result.casesRoot === 'cases/', "casesRoot === 'cases/'");
  assert(result.modules['mod-a'].versioned === false, "modules['mod-a'].versioned === false");
  assert(result.trash.dir === '.trash/', "trash.dir === '.trash/'");
  assert(result.shortcuts.latestXmind === 'latest-output.xmind', "shortcuts.latestXmind is populated");
  assert(Boolean(result.integrations.lanhuMcp), 'default lanhuMcp config is present');
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 11: buildConfigObject — displayName defaults to projectName
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== Test: buildConfigObject — displayName defaults to projectName ===');
{
  const result = buildConfigObject({
    projectName: 'my-proj',
    modules: {},
  });

  assert(result.project.displayName === 'my-proj', "displayName defaults to projectName");
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 12: writeOutputs — valid config (INIT-05)
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== Test: writeOutputs — valid config (INIT-05) ===');
{
  const tempDir = createTempDir();
  try {
    const config = buildConfigObject({
      projectName: 'write-test',
      modules: {
        m1: { versioned: true },
      },
    });

    writeOutputs({
      configJson: JSON.stringify(config),
      claudeMdContent: '# Test\n',
      rootDir: tempDir,
    });

    assert(existsSync(join(tempDir, '.claude', 'config.json')), '.claude/config.json is written');
    assert(existsSync(join(tempDir, 'CLAUDE.md')), 'CLAUDE.md is written');

    const parsed = JSON.parse(readFileSync(join(tempDir, '.claude', 'config.json'), 'utf8'));
    assert(parsed.project.name === 'write-test', "written config.project.name === 'write-test'");
    assert(parsed.modules.m1.versioned === true, 'written config preserves module versioned flag');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 13: writeOutputs — rejects missing projectName
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== Test: writeOutputs — rejects missing projectName ===');
{
  const tempDir = createTempDir();
  try {
    let threw = false;
    let message = '';

    try {
      writeOutputs({
        configJson: JSON.stringify({ modules: {} }),
        rootDir: tempDir,
      });
    } catch (error) {
      threw = true;
      message = String(error.message);
    }

    assert(threw === true, 'writeOutputs throws for invalid config without projectName');
    assert(message.includes('project'), 'error message mentions missing project');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 14: renderTemplate — placeholder replacement (INIT-04)
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== Test: renderTemplate — placeholder replacement (INIT-04) ===');
{
  const tempDir = createTempDir();
  try {
    const templatePath = join(tempDir, 'CLAUDE.md.template');
    writeFileSync(
      templatePath,
      '# {{PROJECT_NAME}} Handbook\nRoot: {{CASES_ROOT}}\nExample: {{MODULE_KEY_EXAMPLE}}\n',
      'utf8'
    );

    const rendered = renderTemplate(templatePath, {
      '{{PROJECT_NAME}}': 'My Project',
      '{{CASES_ROOT}}': 'cases/',
      '{{MODULE_KEY_EXAMPLE}}': 'login-module',
    });

    assert(rendered.includes('# My Project Handbook'), 'rendered template includes project name');
    assert(rendered.includes('Root: cases/'), 'rendered template includes cases root');
    assert(rendered.includes('Example: login-module'), 'rendered template includes module key example');
    assert(!rendered.includes('{{'), 'rendered template has no residual placeholders');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 15: renderTemplate — throws on unreplaced placeholders
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== Test: renderTemplate — throws on unreplaced placeholders ===');
{
  const tempDir = createTempDir();
  try {
    const templatePath = join(tempDir, 'broken.template');
    writeFileSync(templatePath, '# {{PROJECT_NAME}} {{UNKNOWN_VAR}}', 'utf8');

    let threw = false;
    let message = '';

    try {
      renderTemplate(templatePath, {
        '{{PROJECT_NAME}}': 'X',
      });
    } catch (error) {
      threw = true;
      message = String(error.message);
    }

    assert(threw === true, 'renderTemplate throws when placeholders remain');
    assert(message.includes('UNKNOWN_VAR'), 'error mentions UNKNOWN_VAR');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 16: loadExistingConfig — empty dir returns null
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== Test: loadExistingConfig — empty dir returns null ===');
{
  const tempDir = createTempDir();
  try {
    const result = loadExistingConfig(tempDir);
    assert(result === null, 'loadExistingConfig returns null when config is missing');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 17: loadExistingConfig — reads existing config
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== Test: loadExistingConfig — reads existing config ===');
{
  const tempDir = createTempDir();
  try {
    mkdirSync(join(tempDir, '.claude'), { recursive: true });
    writeFileSync(
      join(tempDir, '.claude', 'config.json'),
      JSON.stringify({
        project: { name: 'existing' },
        modules: {},
      }),
      'utf8'
    );

    const result = loadExistingConfig(tempDir);
    assert(result !== null, 'loadExistingConfig returns an object for existing config');
    assert(result.project.name === 'existing', "loaded config.project.name === 'existing'");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 18: mergeConfigGroups — preserves unselected (D-15)
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== Test: mergeConfigGroups — preserves unselected (D-15) ===');
{
  const existing = {
    project: { name: 'old' },
    casesRoot: 'cases/',
    modules: { a: {} },
    repos: { r1: { path: '/r1' } },
    integrations: { lanhuMcp: { runtimePath: 'custom/' } },
  };
  const updated = {
    project: { name: 'new' },
    casesRoot: 'new-cases/',
    modules: { b: {} },
    repos: {},
    integrations: {},
  };

  const result = mergeConfigGroups(existing, updated, ['basic', 'modules']);

  assert(result.project.name === 'new', 'basic group updates project');
  assert(result.modules.b !== undefined, 'modules group is replaced from updated config');
  assert(result.repos.r1.path === '/r1', 'repos group is preserved when not selected');
  assert(result.integrations.lanhuMcp.runtimePath === 'custom/', 'integrations group is preserved when not selected');
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Group 19: mergeConfigGroups — updates selected groups
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== Test: mergeConfigGroups — updates selected groups ===');
{
  const existing = {
    project: { name: 'old' },
    repos: { r1: { path: '/r1' } },
  };
  const updated = {
    repos: { r2: { path: '/r2' } },
    branchMapping: null,
    stackTrace: {},
  };

  const result = mergeConfigGroups(existing, updated, ['repos']);

  assert(result.project.name === 'old', 'unselected basic group stays unchanged');
  assert(result.repos.r2 !== undefined, 'selected repos group is replaced');
  assert(result.repos.r1 === undefined, 'previous repos entries are removed when repos group is replaced');
}

console.log(`\n══════════════════════════════════════`);
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log(`══════════════════════════════════════`);

process.exit(failed > 0 ? 1 : 0);
