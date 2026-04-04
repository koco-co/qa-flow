// test-ui-autotest-merge.mjs
import { buildSpecContent } from '../skills/ui-autotest/scripts/merge-spec-blocks.mjs'

let passed = 0
let failed = 0

function assert(condition, msg) {
  if (condition) { console.log(`  ✅ ${msg}`); passed++ }
  else { console.error(`  ❌ ${msg}`); failed++ }
}

// ── 测试数据 ────────────────────────────────────────────────

const RESULTS = [
  {
    pageId: '规则列表::列表页',
    status: 'completed',
    smokeBlocks: [`test('【P0】验证列表页默认加载', async ({ page }) => {\n  // smoke test\n})`],
    fullBlocks: [
      `test('【P0】验证列表页默认加载', async ({ page }) => {\n  // smoke test\n})`,
      `test('【P1】验证搜索筛选', async ({ page }) => {\n  // full test\n})`,
    ],
    mdCorrections: [],
    userQuestions: [],
    failedCases: [],
  },
  {
    pageId: '规则列表::新增页',
    status: 'completed',
    smokeBlocks: [`test('【P0】验证必填项校验', async ({ page }) => {\n  // smoke test\n})`],
    fullBlocks: [
      `test('【P0】验证必填项校验', async ({ page }) => {\n  // smoke test\n})`,
      `test('【P2】验证取消按钮', async ({ page }) => {\n  // p2 test\n})`,
    ],
    mdCorrections: [],
    userQuestions: [],
    failedCases: [],
  },
]

// ── 测试：smoke.spec.ts 内容（仅 P0） ──────────────────────
console.log('\n=== Test: buildSpecContent smoke ===')
const smoke = buildSpecContent({ featureName: '测试需求', specType: 'smoke', results: RESULTS })

assert(smoke.includes("import { test") , 'smoke 包含 import')
assert(smoke.includes('测试需求'), 'smoke 包含 featureName')
assert(smoke.includes('【P0】验证列表页默认加载'), 'smoke 包含 P0 用例')
assert(smoke.includes('【P0】验证必填项校验'), 'smoke 包含第二个 P0 用例')
assert(!smoke.includes('【P1】'), 'smoke 不含 P1 用例')
assert(!smoke.includes('【P2】'), 'smoke 不含 P2 用例')

// ── 测试：full.spec.ts 内容（全量）──────────────────────────
console.log('\n=== Test: buildSpecContent full ===')
const full = buildSpecContent({ featureName: '测试需求', specType: 'full', results: RESULTS })

assert(full.includes('【P0】验证列表页默认加载'), 'full 包含 P0')
assert(full.includes('【P1】验证搜索筛选'), 'full 包含 P1')
assert(full.includes('【P2】验证取消按钮'), 'full 包含 P2')

// ── 测试：结构头部 ──────────────────────────────────────────
console.log('\n=== Test: 文件结构 ===')
assert(smoke.startsWith('// Auto-generated'), 'smoke 以注释头开始')
assert(full.startsWith('// Auto-generated'), 'full 以注释头开始')
assert(smoke.includes("type FailedRequest"), 'smoke 包含 FailedRequest 类型定义')
assert(full.includes("type FailedRequest"), 'full 包含 FailedRequest 类型定义')

// ── 测试：空结果 ────────────────────────────────────────────
console.log('\n=== Test: 空结果集 ===')
const emptySmoke = buildSpecContent({ featureName: '空需求', specType: 'smoke', results: [] })
assert(emptySmoke.includes('import { test'), '空结果仍生成合法文件头')
assert(!emptySmoke.includes('test('), '空结果无 test() 块')

console.log(`\n══════════════════════════════════════`)
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`)
console.log(`══════════════════════════════════════`)
process.exit(failed > 0 ? 1 : 0)
