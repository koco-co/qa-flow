// test-ui-autotest-parse.mjs
import { parseMdCases } from '../skills/ui-autotest/scripts/parse-md-cases.mjs'

let passed = 0
let failed = 0

function assert(condition, msg) {
  if (condition) { console.log(`  ✅ ${msg}`); passed++ }
  else { console.error(`  ❌ ${msg}`); failed++ }
}

// ── 测试数据 ────────────────────────────────────────────────

const SAMPLE_MD = `---
suite_name: "测试需求"
---

## 规则列表

### 列表页

##### 【P0】验证列表页默认加载

> 用例步骤

| 编号 | 步骤 | 预期 |
| 1 | 进入【规则列表】页面 | 页面正常加载 |

##### 【P1】验证搜索筛选

> 用例步骤

| 编号 | 步骤 | 预期 |
| 1 | 进入【规则列表】页面 | 页面正常加载 |

### 新增页

##### 【P0】验证必填项校验

##### 【P2】验证取消按钮

## 规则详情

##### 【P1】验证详情展示
`

const FLAT_MD = `---
suite_name: "扁平需求"
---

## 配置管理

##### 【P0】验证配置加载
##### 【P1】验证配置保存
`

// ── 测试：基础解析 ──────────────────────────────────────────
console.log('\n=== Test: 基础解析 ===')
const result = parseMdCases(SAMPLE_MD, 'cases/archive/202604/测试需求.md')

assert(result.featureName === '测试需求', `featureName = ${result.featureName}`)
assert(result.yyyymm === '202604', `yyyymm = ${result.yyyymm}`)
assert(result.totalCases === 5, `totalCases = ${result.totalCases}`)
assert(result.p0Count === 2, `p0Count = ${result.p0Count}`)
assert(result.p1Count === 2, `p1Count = ${result.p1Count}`)
assert(result.p2Count === 1, `p2Count = ${result.p2Count}`)

// ── 测试：L2/L3 分组 ───────────────────────────────────────
console.log('\n=== Test: L2/L3 任务分组 ===')
assert(result.tasks.length === 3, `tasks 数量 = ${result.tasks.length}`)

const listTask = result.tasks.find(t => t.l3 === '列表页')
assert(listTask !== undefined, '找到「列表页」任务')
assert(listTask?.l2 === '规则列表', `l2 = ${listTask?.l2}`)
assert(listTask?.cases.length === 2, `列表页用例数 = ${listTask?.cases.length}`)
assert(listTask?.cases[0].priority === 'P0', `第一个用例优先级 = P0`)
assert(listTask?.cases[1].priority === 'P1', `第二个用例优先级 = P1`)

const addTask = result.tasks.find(t => t.l3 === '新增页')
assert(addTask?.cases.length === 2, `新增页用例数 = ${addTask?.cases.length}`)

const detailTask = result.tasks.find(t => t.l2 === '规则详情')
assert(detailTask !== undefined, '找到「规则详情」无 L3 的平级任务')
assert(detailTask?.l3 === '规则详情', `无 L3 时 l3 退化为 l2: ${detailTask?.l3}`)

// ── 测试：扁平结构（无 L3） ─────────────────────────────────
console.log('\n=== Test: 扁平 MD（无 L3）===')
const flat = parseMdCases(FLAT_MD, 'cases/archive/202605/扁平需求.md')
assert(flat.tasks.length === 1, `扁平结构只有 1 个任务: ${flat.tasks.length}`)
assert(flat.tasks[0].l3 === '配置管理', `l3 退化为 l2: ${flat.tasks[0].l3}`)
assert(flat.totalCases === 2, `totalCases = ${flat.totalCases}`)

// ── 测试：空内容 ────────────────────────────────────────────
console.log('\n=== Test: 空内容 ===')
const empty = parseMdCases('', 'cases/archive/202604/empty.md')
assert(empty.tasks.length === 0, '空 MD 返回空任务列表')
assert(empty.totalCases === 0, '空 MD 总用例数为 0')

// ── 结果 ────────────────────────────────────────────────────
console.log(`\n══════════════════════════════════════`)
console.log(`总计: ${passed + failed} 测试, ✅ ${passed} 通过, ❌ ${failed} 失败`)
console.log(`══════════════════════════════════════`)
process.exit(failed > 0 ? 1 : 0)
