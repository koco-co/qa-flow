/**
 * test_json-to-xmind_root-title.mjs
 * Unit tests for buildRootTitle() and buildL1Title() in json-to-xmind.mjs (SKIL-04)
 *
 * Tests:
 *   1. buildRootTitle({project_name: 'MyShop'}) with config having no modules returns 'MyShop'
 *   2. buildRootTitle({module_key: 'orders', version: 'v2.0'}) with config.modules.orders.zh='订单管理'
 *      and trackerId='T100' returns '订单管理v2.0迭代用例(#T100)'
 *   3. buildRootTitle({module_key: 'orders', version: 'v2.0'}) with config.modules.orders.zh='订单管理'
 *      and NO trackerId returns '订单管理v2.0迭代用例'
 *   4. buildRootTitle({}) with config.project.displayName='电商平台' returns '电商平台'
 *   5. buildL1Title({requirement_name: '商品管理', requirement_ticket: 'REQ-001', version: 'v2.0'})
 *      returns '【v2.0】商品管理(#REQ-001)'
 *   6. buildL1Title({requirement_name: '商品管理'}) returns '商品管理' (no version, no ticket)
 *
 * Run: node --test .claude/tests/test_json-to-xmind_root-title.mjs
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Import loadConfigFromPath for isolated config loading
import { loadConfigFromPath } from '../shared/scripts/load-config.mjs'

// Dynamically import the functions under test
// These are exported from json-to-xmind.mjs for testing
const scriptPath = resolve(__dirname, '../skills/xmind-converter/scripts/json-to-xmind.mjs')

let buildRootTitle
let buildL1Title

try {
  const mod = await import(scriptPath)
  buildRootTitle = mod.buildRootTitle
  buildL1Title = mod.buildL1Title
} catch (e) {
  buildRootTitle = undefined
  buildL1Title = undefined
}

// Helper: write a temp config.json and return the loaded config object
// This avoids writing to the real config.json and enables full test isolation
function makeTestConfig(modules, projectOverrides = {}) {
  const dir = join(tmpdir(), `qa-flow-test-root-title-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  mkdirSync(dir, { recursive: true })
  const configPath = join(dir, 'config.json')
  const configData = {
    project: { name: 'test-project', ...projectOverrides },
    modules: modules ?? {},
    repos: {},
  }
  writeFileSync(configPath, JSON.stringify(configData), 'utf8')
  return loadConfigFromPath(configPath)
}

describe('buildRootTitle()', () => {
  it('Test 1: returns project_name when config has no modules and no displayName', () => {
    if (typeof buildRootTitle !== 'function') {
      assert.fail('buildRootTitle is not exported from json-to-xmind.mjs')
    }
    const config = makeTestConfig({})
    const result = buildRootTitle({ project_name: 'MyShop' }, config)
    assert.equal(result, 'MyShop', "Should return 'MyShop' when no module or displayName configured")
  })

  it('Test 2: returns displayName+version+迭代用例(#trackerId) when module has trackerId', () => {
    if (typeof buildRootTitle !== 'function') {
      assert.fail('buildRootTitle is not exported from json-to-xmind.mjs')
    }
    const config = makeTestConfig({ orders: { zh: '订单管理', trackerId: 'T100' } })
    const result = buildRootTitle({ module_key: 'orders', version: 'v2.0' }, config)
    assert.equal(result, '订单管理v2.0迭代用例(#T100)',
      "Should return '订单管理v2.0迭代用例(#T100)' when module has trackerId")
  })

  it('Test 3: returns displayName+version+迭代用例 (no suffix) when module has no trackerId', () => {
    if (typeof buildRootTitle !== 'function') {
      assert.fail('buildRootTitle is not exported from json-to-xmind.mjs')
    }
    const config = makeTestConfig({ orders: { zh: '订单管理' } })
    const result = buildRootTitle({ module_key: 'orders', version: 'v2.0' }, config)
    assert.equal(result, '订单管理v2.0迭代用例',
      "Should return '订单管理v2.0迭代用例' when module has no trackerId")
  })

  it('Test 4: returns config.project.displayName when meta is empty and displayName is set', () => {
    if (typeof buildRootTitle !== 'function') {
      assert.fail('buildRootTitle is not exported from json-to-xmind.mjs')
    }
    const config = makeTestConfig({}, { displayName: '电商平台' })
    const result = buildRootTitle({}, config)
    assert.equal(result, '电商平台',
      "Should return '电商平台' from config.project.displayName")
  })
})

describe('buildL1Title()', () => {
  it('Test 5: returns 【version】requirement_name(#ticket) with version and ticket', () => {
    if (typeof buildL1Title !== 'function') {
      assert.fail('buildL1Title is not exported from json-to-xmind.mjs')
    }
    const result = buildL1Title({
      requirement_name: '商品管理',
      requirement_ticket: 'REQ-001',
      version: 'v2.0',
    })
    assert.equal(result, '【v2.0】商品管理(#REQ-001)',
      "Should return '【v2.0】商品管理(#REQ-001)' with version and ticket")
  })

  it('Test 6: returns just requirement_name when no version and no ticket', () => {
    if (typeof buildL1Title !== 'function') {
      assert.fail('buildL1Title is not exported from json-to-xmind.mjs')
    }
    const result = buildL1Title({ requirement_name: '商品管理' })
    assert.equal(result, '商品管理',
      "Should return '商品管理' with no version or ticket prefix/suffix")
  })
})
