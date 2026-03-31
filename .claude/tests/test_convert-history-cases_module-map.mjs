/**
 * test_convert-history-cases_module-map.mjs
 * Unit tests for buildModuleMap() in convert-history-cases.mjs (SKIL-05)
 *
 * Tests:
 *   1. buildModuleMap() with config.modules = {orders: {zh: '订单管理'}, products: {zh: '商品管理'}}
 *      returns map where '订单管理' -> 'orders', 'orders' -> 'orders', '商品管理' -> 'products'
 *   2. buildModuleMap() with empty config.modules = {} returns empty object
 *   3. resolveOutputDir(meta) with module_key='orders' and version='v2.0' uses resolveModulePath
 *      to produce correct archive path
 *
 * Run: node --test .claude/tests/test_convert-history-cases_module-map.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Helper: write a temp config.json for test isolation
function writeTempConfig(modules) {
  const dir = join(tmpdir(), `qa-flow-test-module-map-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(dir, { recursive: true });
  const configPath = join(dir, 'config.json');
  writeFileSync(configPath, JSON.stringify({
    project: { name: 'test-project' },
    modules,
    repos: {},
  }), 'utf8');
  return configPath;
}

// Dynamically import the module under test to pick up exports
const { buildModuleMap, resolveOutputDir } = await (async () => {
  try {
    return await import('../skills/archive-converter/scripts/convert-history-cases.mjs');
  } catch (e) {
    // If module doesn't export these, we return stubs so tests fail cleanly (RED)
    return { buildModuleMap: undefined, resolveOutputDir: undefined };
  }
})();

describe('buildModuleMap()', () => {
  it('Test 1: maps zh names and keys to module key for non-empty config.modules', async () => {
    const configPath = writeTempConfig({
      orders: { zh: '订单管理' },
      products: { zh: '商品管理' },
    });

    if (typeof buildModuleMap !== 'function') {
      assert.fail('buildModuleMap is not exported from convert-history-cases.mjs');
    }

    const map = buildModuleMap(configPath);

    assert.equal(map['订单管理'], 'orders', "'订单管理' should map to 'orders'");
    assert.equal(map['orders'], 'orders', "'orders' should map to 'orders' (passthrough)");
    assert.equal(map['商品管理'], 'products', "'商品管理' should map to 'products'");
  });

  it('Test 2: returns empty object for empty config.modules', async () => {
    const configPath = writeTempConfig({});

    if (typeof buildModuleMap !== 'function') {
      assert.fail('buildModuleMap is not exported from convert-history-cases.mjs');
    }

    const map = buildModuleMap(configPath);

    assert.deepEqual(map, {}, 'empty config.modules should produce empty map');
  });
});

describe('resolveOutputDir()', () => {
  it('Test 3: uses resolveModulePath to produce archive path with version', async () => {
    const configPath = writeTempConfig({
      orders: { zh: '订单管理', versioned: true },
    });

    if (typeof resolveOutputDir !== 'function') {
      assert.fail('resolveOutputDir is not exported from convert-history-cases.mjs');
    }

    const meta = { module_key: 'orders', version: 'v2.0' };
    const outputDir = resolveOutputDir(meta, configPath);

    assert.ok(
      outputDir.includes('archive') && outputDir.includes('orders'),
      `outputDir "${outputDir}" should contain "archive" and "orders"`
    );
    assert.ok(
      outputDir.includes('v2.0') || outputDir.includes('2.0'),
      `outputDir "${outputDir}" should contain version "v2.0"`
    );
  });
});
