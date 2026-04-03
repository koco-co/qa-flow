# UI 自动化测试 (ui-autotest) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `ui-autotest` Skill，通过主 Orchestrator + 多个 Script-Writer Sub-Agent 并行完成「页面探索 → Playwright 脚本生成 → 执行验证 → Bug 报告」的完整 UI 自动化测试闭环。

**Architecture:** 主 Orchestrator Agent 管理动态任务队列（≤5 个并发），每个 Script-Writer Sub-Agent 负责 MD 中一个 L3 页面的全部用例：使用 claude-in-chrome MCP 探索真实 UI → 结合前端源码写 TypeScript Playwright `test()` 块 → 执行临时 spec 验证 → 返回 SubAgentResult。主 Agent 合并结果写入 `smoke.spec.ts`（P0）和 `full.spec.ts`（全量），并在失败时通过 Bug-Reporter Sub-Agent 生成含完整 curl 信息的 HTML 报告。

**Tech Stack:** TypeScript + Playwright v1.50+、Node.js ESM、claude-in-chrome MCP、现有 xmind-converter skill、notify.mjs

---

## 文件结构映射

### 新建文件

| 文件 | 职责 |
|------|------|
| `playwright.config.ts` | Playwright 项目级配置（有头模式、storageState、reporter） |
| `.auth/.gitkeep` | 登录态目录占位符 |
| `tests/e2e/.gitkeep` | E2E 脚本根目录占位符 |
| `reports/e2e/.gitkeep` | E2E 报告根目录占位符 |
| `.claude/skills/ui-autotest/SKILL.md` | Skill 元数据 + 触发词 + 步骤总表 |
| `.claude/skills/ui-autotest/prompts/00-orchestrator.md` | 主 Agent 编排指令（动态队列 + 用户中转协议） |
| `.claude/skills/ui-autotest/prompts/01-script-writer.md` | Script-Writer Sub-Agent 指令（探索 + 写脚本 + 执行） |
| `.claude/skills/ui-autotest/prompts/02-bug-reporter.md` | Bug-Reporter Sub-Agent 指令（两级策略 + HTML 报告） |
| `.claude/skills/ui-autotest/scripts/parse-md-cases.mjs` | MD → 任务队列 JSON（导出函数 + CLI 接口） |
| `.claude/skills/ui-autotest/scripts/session-login.mjs` | 登录 + 保存 `.auth/session.json` |
| `.claude/skills/ui-autotest/scripts/merge-spec-blocks.mjs` | 合并 test() 块 → smoke.spec.ts + full.spec.ts |
| `.claude/tests/test-ui-autotest-parse.mjs` | parse-md-cases.mjs 单元测试 |
| `.claude/tests/test-ui-autotest-merge.mjs` | merge-spec-blocks.mjs 单元测试 |

### 修改文件

| 文件 | 变更内容 |
|------|----------|
| `package.json` | 添加 `@playwright/test` devDependency |
| `.gitignore` | 添加 `.auth/`、`tests/e2e/.tmp/`、`reports/e2e/playwright-html/` |
| `.claude/rules/notification-hook.md` | 新增 `ui-test-completed` 事件行 |
| `CLAUDE.md` | Skill 索引表添加 `ui-autotest` 行 |

---

## Task 1: 项目环境配置

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `.auth/.gitkeep`
- Create: `tests/e2e/.gitkeep`
- Create: `reports/e2e/.gitkeep`

- [ ] **Step 1: 添加 @playwright/test 开发依赖**

```bash
npm install -D @playwright/test
```

Expected: `package.json` devDependencies 中新增 `"@playwright/test": "^1.50.x"`

- [ ] **Step 2: 安装 Chromium 浏览器**

```bash
npx playwright install chromium
```

Expected: 输出 `Chromium 已安装` 类似信息，无报错

- [ ] **Step 3: 更新 .gitignore**

在 `.gitignore` 末尾追加：

```gitignore
# UI 自动化
.auth/
tests/e2e/.tmp/
reports/e2e/playwright-html/
```

- [ ] **Step 4: 创建目录占位符**

```bash
mkdir -p .auth tests/e2e reports/e2e
touch .auth/.gitkeep tests/e2e/.gitkeep reports/e2e/.gitkeep
```

- [ ] **Step 5: 确认 .env 包含必要字段（检查，不创建）**

```bash
grep -E "QA_USERNAME|QA_PASSWORD|QA_BASE_URL" .env || echo "MISSING - 需要在 .env 中添加这三个字段"
```

如果缺少，手动在 `.env` 末尾追加（值由用户填写）：

```bash
# UI 自动化测试账号
QA_USERNAME=
QA_PASSWORD=
QA_BASE_URL=
```

- [ ] **Step 6: 提交**

```bash
git add package.json package-lock.json .gitignore .auth/.gitkeep tests/e2e/.gitkeep reports/e2e/.gitkeep
git commit -m "chore: setup playwright environment for ui-autotest skill"
```

---

## Task 2: playwright.config.ts

**Files:**
- Create: `playwright.config.ts`

- [ ] **Step 1: 创建配置文件**

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    headless: false,
    storageState: '.auth/session.json',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    baseURL: process.env.QA_BASE_URL,
  },
  reporter: [
    ['html', { outputFolder: 'reports/e2e/playwright-html', open: 'never' }],
    ['list'],
  ],
  workers: 1,
})
```

- [ ] **Step 2: 验证配置可解析**

```bash
npx playwright --version
```

Expected: 输出版本号，无报错

- [ ] **Step 3: 提交**

```bash
git add playwright.config.ts
git commit -m "feat: add playwright.config.ts for ui-autotest"
```

---

## Task 3: parse-md-cases.mjs（TDD）

**Files:**
- Create: `.claude/skills/ui-autotest/scripts/parse-md-cases.mjs`
- Create: `.claude/tests/test-ui-autotest-parse.mjs`

- [ ] **Step 1: 先写失败测试**

创建 `.claude/tests/test-ui-autotest-parse.mjs`：

```javascript
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
```

- [ ] **Step 2: 运行测试（应该失败）**

```bash
node .claude/tests/test-ui-autotest-parse.mjs
```

Expected: 报错 `Cannot find module '../skills/ui-autotest/scripts/parse-md-cases.mjs'`

- [ ] **Step 3: 实现 parse-md-cases.mjs**

创建 `.claude/skills/ui-autotest/scripts/parse-md-cases.mjs`：

```javascript
// parse-md-cases.mjs
import { readFileSync } from 'fs'
import { basename, dirname } from 'path'

/**
 * @typedef {{ title: string, priority: 'P0'|'P1'|'P2', fullTitle: string }} CaseEntry
 * @typedef {{ id: string, l2: string, l3: string, cases: CaseEntry[] }} Task
 * @typedef {{ featureName: string, yyyymm: string, tasks: Task[], totalCases: number, p0Count: number, p1Count: number, p2Count: number }} ParseResult
 */

/**
 * 解析归档 MD 文件，提取 L2/L3 分组的测试用例任务队列。
 * @param {string} mdContent
 * @param {string} mdFilePath
 * @returns {ParseResult}
 */
export function parseMdCases(mdContent, mdFilePath) {
  const lines = mdContent.split('\n')
  const tasks = []
  let currentL2 = null
  let currentL3 = null
  let inFrontmatter = false
  let frontmatterDone = false

  for (const line of lines) {
    const trimmed = line.trim()

    // 跳过 frontmatter
    if (trimmed === '---') {
      if (!frontmatterDone) { inFrontmatter = !inFrontmatter; if (!inFrontmatter) frontmatterDone = true }
      continue
    }
    if (inFrontmatter) continue

    // L2: ## 模块名
    const l2Match = trimmed.match(/^## (.+)$/)
    if (l2Match) {
      currentL2 = l2Match[1].trim()
      currentL3 = null
      continue
    }

    // L3: ### 页面名
    const l3Match = trimmed.match(/^### (.+)$/)
    if (l3Match && currentL2) {
      currentL3 = l3Match[1].trim()
      const id = `${currentL2}::${currentL3}`
      if (!tasks.find(t => t.id === id)) {
        tasks.push({ id, l2: currentL2, l3: currentL3, cases: [] })
      }
      continue
    }

    // 用例: ##### 【P0/P1/P2】验证xxx
    const caseMatch = trimmed.match(/^##### (【(P[012])】(.+))$/)
    if (caseMatch && currentL2) {
      const fullTitle = caseMatch[1].trim()
      const priority = caseMatch[2]
      const title = caseMatch[3].trim()

      // 无 L3 时以 L2 作为 L3（扁平结构）
      const effectiveL3 = currentL3 ?? currentL2
      const id = `${currentL2}::${effectiveL3}`
      let task = tasks.find(t => t.id === id)
      if (!task) {
        task = { id, l2: currentL2, l3: effectiveL3, cases: [] }
        tasks.push(task)
      }
      task.cases.push({ title, priority, fullTitle })
    }
  }

  const filteredTasks = tasks.filter(t => t.cases.length > 0)
  let p0Count = 0, p1Count = 0, p2Count = 0
  for (const task of filteredTasks) {
    for (const c of task.cases) {
      if (c.priority === 'P0') p0Count++
      else if (c.priority === 'P1') p1Count++
      else p2Count++
    }
  }

  const featureName = basename(mdFilePath, '.md')
  const dirName = basename(dirname(mdFilePath))
  const yyyymm = /^\d{6}$/.test(dirName) ? dirName : new Date().toISOString().slice(0, 7).replace('-', '')

  return { featureName, yyyymm, tasks: filteredTasks, totalCases: p0Count + p1Count + p2Count, p0Count, p1Count, p2Count }
}

// CLI 接口
if (process.argv[1].endsWith('parse-md-cases.mjs')) {
  const filePath = process.argv[2]
  if (!filePath) { console.error('Usage: node parse-md-cases.mjs <md-file-path>'); process.exit(1) }
  const content = readFileSync(filePath, 'utf8')
  console.log(JSON.stringify(parseMdCases(content, filePath), null, 2))
}
```

- [ ] **Step 4: 运行测试（应该通过）**

```bash
node .claude/tests/test-ui-autotest-parse.mjs
```

Expected: 全部 ✅，`failed = 0`

- [ ] **Step 5: 提交**

```bash
git add .claude/skills/ui-autotest/scripts/parse-md-cases.mjs .claude/tests/test-ui-autotest-parse.mjs
git commit -m "feat: add parse-md-cases.mjs with unit tests"
```

---

## Task 4: session-login.mjs

**Files:**
- Create: `.claude/skills/ui-autotest/scripts/session-login.mjs`

注：此脚本直接操作浏览器，不适合纯单元测试；通过 `--dry-run` flag 验证配置读取逻辑。

- [ ] **Step 1: 创建登录脚本**

```javascript
// session-login.mjs
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '../../../../')
const SESSION_PATH = resolve(projectRoot, '.auth/session.json')

function loadEnv() {
  try {
    const envPath = resolve(projectRoot, '.env')
    const lines = readFileSync(envPath, 'utf8').split('\n')
    const env = {}
    for (const line of lines) {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) env[match[1].trim()] = match[2].trim()
    }
    return env
  } catch {
    return {}
  }
}

async function login({ baseUrl, username, password }) {
  if (!baseUrl || !username || !password) {
    throw new Error('缺少必要参数：QA_BASE_URL、QA_USERNAME、QA_PASSWORD 均不能为空')
  }

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    console.log(`正在导航到登录页：${baseUrl}`)
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 })

    // 尝试自动填写常见登录表单
    const usernameSelectors = ['input[name="username"]', 'input[type="text"]', '#username', '.username-input input']
    const passwordSelectors = ['input[name="password"]', 'input[type="password"]', '#password', '.password-input input']
    const submitSelectors = ['button[type="submit"]', 'button.login-btn', '.login-button', 'button:has-text("登录")']

    let loginFormFound = false
    for (const sel of usernameSelectors) {
      if (await page.locator(sel).count() > 0) {
        await page.locator(sel).first().fill(username)
        loginFormFound = true
        break
      }
    }

    if (loginFormFound) {
      for (const sel of passwordSelectors) {
        if (await page.locator(sel).count() > 0) {
          await page.locator(sel).first().fill(password)
          break
        }
      }
      for (const sel of submitSelectors) {
        if (await page.locator(sel).count() > 0) {
          await page.locator(sel).first().click()
          break
        }
      }
      await page.waitForLoadState('networkidle', { timeout: 15000 })
      console.log('自动登录完成，等待页面稳定...')
    } else {
      console.log('未找到标准登录表单，请在浏览器中手动完成登录，完成后按 Enter 继续...')
      await new Promise(resolve => process.stdin.once('data', resolve))
    }

    mkdirSync(resolve(projectRoot, '.auth'), { recursive: true })
    await context.storageState({ path: SESSION_PATH })
    console.log(`✅ Session 已保存到 ${SESSION_PATH}`)
  } finally {
    await browser.close()
  }
}

// CLI 接口
if (process.argv[1].endsWith('session-login.mjs')) {
  const env = loadEnv()
  const baseUrl = process.env.QA_BASE_URL || env.QA_BASE_URL
  const username = process.env.QA_USERNAME || env.QA_USERNAME
  const password = process.env.QA_PASSWORD || env.QA_PASSWORD

  const isDryRun = process.argv.includes('--dry-run')
  if (isDryRun) {
    console.log('--dry-run: 配置读取结果：')
    console.log(`  QA_BASE_URL = ${baseUrl || '(未配置)'}`)
    console.log(`  QA_USERNAME = ${username ? '(已配置)' : '(未配置)'}`)
    console.log(`  QA_PASSWORD = ${password ? '(已配置)' : '(未配置)'}`)
    process.exit(0)
  }

  try {
    await login({ baseUrl, username, password })
  } catch (error) {
    console.error('登录失败:', error.message)
    process.exit(1)
  }
}

export { login }
```

- [ ] **Step 2: 验证 dry-run 模式**

```bash
node .claude/skills/ui-autotest/scripts/session-login.mjs --dry-run
```

Expected: 输出三个配置项的状态（已配置/未配置），无浏览器打开，退出码 0

- [ ] **Step 3: 提交**

```bash
git add .claude/skills/ui-autotest/scripts/session-login.mjs
git commit -m "feat: add session-login.mjs for playwright auth"
```

---

## Task 5: merge-spec-blocks.mjs（TDD）

**Files:**
- Create: `.claude/skills/ui-autotest/scripts/merge-spec-blocks.mjs`
- Create: `.claude/tests/test-ui-autotest-merge.mjs`

- [ ] **Step 1: 先写失败测试**

创建 `.claude/tests/test-ui-autotest-merge.mjs`：

```javascript
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
```

- [ ] **Step 2: 运行测试（应该失败）**

```bash
node .claude/tests/test-ui-autotest-merge.mjs
```

Expected: `Cannot find module '../skills/ui-autotest/scripts/merge-spec-blocks.mjs'`

- [ ] **Step 3: 实现 merge-spec-blocks.mjs**

```javascript
// merge-spec-blocks.mjs
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

/**
 * @typedef {{ title: string, priority: 'P0'|'P1'|'P2', fullTitle: string }} CaseEntry
 * @typedef {{ pageId: string, status: string, smokeBlocks: string[], fullBlocks: string[], mdCorrections: object[], userQuestions: object[], failedCases: object[] }} SubAgentResult
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '../../../../')

const SPEC_HEADER = (featureName, specType) => `\
// Auto-generated by ui-autotest skill — DO NOT EDIT MANUALLY
// Feature: ${featureName}
// Type: ${specType === 'smoke' ? '冒烟测试 (P0)' : '完整回归 (P0+P1+P2)'}
// Generated: ${new Date().toISOString().slice(0, 10)}

import { test } from '@playwright/test'

type FailedRequest = {
  url: string
  method: string
  status: number
  requestHeaders: Record<string, string>
  requestBody: string
  responseBody: string
}
`

/**
 * 根据 SubAgentResult[] 构建 spec 文件内容字符串。
 * @param {{ featureName: string, specType: 'smoke'|'full', results: SubAgentResult[] }} opts
 * @returns {string}
 */
export function buildSpecContent({ featureName, specType, results }) {
  const header = SPEC_HEADER(featureName, specType)
  const blocks = results.flatMap(r => specType === 'smoke' ? r.smokeBlocks : r.fullBlocks)
  if (blocks.length === 0) return header
  return header + '\n' + blocks.join('\n\n') + '\n'
}

/**
 * 将合并后的 spec 写入磁盘。
 * @param {{ featureName: string, yyyymm: string, results: SubAgentResult[], outputDir?: string }} opts
 * @returns {{ smokeFile: string, fullFile: string }}
 */
export function writeSpecFiles({ featureName, yyyymm, results, outputDir }) {
  const dir = outputDir ?? resolve(projectRoot, 'tests/e2e', yyyymm, featureName)
  mkdirSync(dir, { recursive: true })

  const smokeFile = resolve(dir, 'smoke.spec.ts')
  const fullFile = resolve(dir, 'full.spec.ts')

  writeFileSync(smokeFile, buildSpecContent({ featureName, specType: 'smoke', results }), 'utf8')
  writeFileSync(fullFile, buildSpecContent({ featureName, specType: 'full', results }), 'utf8')

  return { smokeFile, fullFile }
}
```

- [ ] **Step 4: 运行测试（应该通过）**

```bash
node .claude/tests/test-ui-autotest-merge.mjs
```

Expected: 全部 ✅，`failed = 0`

- [ ] **Step 5: 提交**

```bash
git add .claude/skills/ui-autotest/scripts/merge-spec-blocks.mjs .claude/tests/test-ui-autotest-merge.mjs
git commit -m "feat: add merge-spec-blocks.mjs with unit tests"
```

---

## Task 6: SKILL.md

**Files:**
- Create: `.claude/skills/ui-autotest/SKILL.md`

- [ ] **Step 1: 创建 SKILL.md**

```markdown
---
name: ui-autotest
description: UI 自动化测试 Skill。当用户提到「UI自动化测试」「自动化回归」「执行UI测试」「生成测试脚本」「e2e回归」「冒烟测试」时触发。接收 MD 测试用例文件 + 目标 URL + 提测分支，通过多 Sub-Agent 并行完成页面探索、Playwright 脚本生成、执行验证，输出 smoke.spec.ts（P0）和 full.spec.ts（全量），并在失败时生成含完整 curl 信息的 HTML Bug 报告。
---

# UI 自动化测试 Skill

## 用途与触发词

- **用途**：将 MD 测试用例转化为 Playwright TypeScript 自动化脚本，执行验证，并将执行结果反向同步到 MD 和 XMind。
- **触发词**：`UI自动化测试`、`自动化回归`、`执行UI测试`、`生成测试脚本`、`e2e回归`、`冒烟测试`
- **调用关系**：独立执行，收尾阶段调用 `xmind-converter` 和 `notify.mjs`。

---

## 使用口径速查

```bash
# 完整流程
为 【功能名】 执行UI自动化测试
为 【功能名】 执行UI自动化测试 https://xxx.dtstack.cn

# 仅执行已有脚本（跳过生成阶段）
回归测试 【功能名】
冒烟测试 【功能名】
```

---

## 输入 / 输出契约

### 输入

| 参数 | 来源 | 说明 |
|------|------|------|
| MD 文件路径 | 用户提供 / 从功能名推断 | `cases/archive/YYYYMM/【功能名】.md` |
| 目标 URL | 用户提供 | 已部署的测试环境地址 |
| 前端分支 | 用户确认（主 agent 推断候选项） | `.repos/dt-insight-studio-front` 对应分支 |
| 后端分支 | 用户确认（通常一个） | `.repos/dt-center-*` 对应分支 |

### 输出

| 产物 | 路径 | 说明 |
|------|------|------|
| 冒烟脚本 | `tests/e2e/YYYYMM/【功能名】/smoke.spec.ts` | 仅 P0 用例 |
| 完整脚本 | `tests/e2e/YYYYMM/【功能名】/full.spec.ts` | P0+P1+P2 全量 |
| Bug 报告 | `reports/e2e/YYYYMM/【功能名】-e2e-report.html` | 仅在有失败时生成 |
| 更新 MD | `cases/archive/YYYYMM/【功能名】.md` | 仅在发现 MD 与实际 UI 不符时更新 |
| 更新 XMind | `cases/xmind/YYYYMM/【功能名】.xmind` | 仅在 MD 有变更时重新生成 |

---

## 步骤总表

| 步骤 | 动作 | 关键产物 |
|------|------|----------|
| 1 | 读取 MD，解析任务队列 | tasks[] |
| 2 | 向用户确认 URL + 前端分支 + 后端分支 + 部署状态 | branches 配置 |
| 3 | 拉取源码，执行 session-login.mjs | `.auth/session.json` |
| 4 | 写入状态文件，启动编排循环 | `.qa-state-ui-*.json` |
| 5 | 动态分发 Script-Writer Sub-Agent（≤5 并发） | SubAgentResult[] |
| 6 | 处理 blocked 任务（用户中转协议） | userAnswers |
| 7 | 合并 code blocks → smoke.spec.ts + full.spec.ts | spec 文件 |
| 8 | 应用 mdCorrections → 更新 MD | MD 更新 |
| 9 | MD 有变更 → 调用 xmind-converter | XMind 更新 |
| 10 | 有 failedCases → 触发 Bug-Reporter Sub-Agent | HTML 报告 |
| 11 | notify.mjs --event ui-test-completed | IM 通知 |

---

## 重跑策略

- 每个 L3 任务最多执行 **3 次**（首次 + 2 次修正重试），达到上限仍失败则上报 Bug-Reporter。
- 整体重跑时，状态文件 `attempts` 计数清零，spec 文件覆盖。

---

## 环境初始化检查（首次运行时自动执行）

```bash
# 检查 @playwright/test 是否安装
npm ls @playwright/test 2>/dev/null || npm install -D @playwright/test

# 检查 Chromium 是否安装
npx playwright install chromium

# 检查 .env 配置
node -e "
const fs = require('fs');
const env = fs.readFileSync('.env','utf8');
['QA_USERNAME','QA_PASSWORD','QA_BASE_URL'].forEach(k => {
  if (!env.includes(k+'=') || env.match(new RegExp(k+'=\\\\s*$','m'))) {
    console.warn('缺少配置:', k);
  }
});
"

# 检查 .auth/ 在 .gitignore
grep -q '.auth/' .gitignore || echo '.auth/' >> .gitignore
```

---

## 详细编排流程

执行时读取 `prompts/00-orchestrator.md`，以其为主 Agent 的行动指南。

**Sub-Agent 读取文件映射：**
- Script-Writer → `prompts/01-script-writer.md`
- Bug-Reporter → `prompts/02-bug-reporter.md`
```

- [ ] **Step 2: 提交**

```bash
git add .claude/skills/ui-autotest/SKILL.md
git commit -m "feat: add ui-autotest SKILL.md"
```

---

## Task 7: 00-orchestrator.md

**Files:**
- Create: `.claude/skills/ui-autotest/prompts/00-orchestrator.md`

- [ ] **Step 1: 创建编排提示词**

```markdown
# ui-autotest 主 Agent 编排指南

你是 ui-autotest Skill 的主 Orchestrator Agent，负责管理整个 UI 自动化测试流程。

---

## 第一阶段：输入解析与用户确认

### 1.1 解析 MD 文件

运行以下命令，获取任务队列：

```bash
node .claude/skills/ui-autotest/scripts/parse-md-cases.mjs <md-file-path>
```

### 1.2 推断仓库和分支

读取 `config/repo-branch-mapping.yaml` 和 `.claude/config.json`，为前端和后端仓库推断提测分支候选项。

### 1.3 向用户一次性确认

将以下信息整合为单条消息发给用户，等待回复：

```
已解析【{featureName}】共 {totalCases} 个用例：
  P0: {p0Count} 个（冒烟）
  P1: {p1Count} 个
  P2: {p2Count} 个
  任务队列：{taskCount} 个页面

请确认以下提测信息：

目标地址：{如用户未提供，请填写}

【前端】{frontend_repo_name}
  推断分支：{inferred_branch}（✅ 确认 / ✏️ 修改）

【后端】{backend_repo_name}（如有多个请补充）
  推断分支：{inferred_branch}（✅ 确认 / ✏️ 修改）

部署是否完成？✅ 已完成 / ⏳ 等我通知
```

**等待用户确认部署完成后，才进入第二阶段。**

---

## 第二阶段：环境准备

### 2.1 拉取源码（并行执行）

```bash
git -C .repos/{frontend_repo} fetch origin && git -C .repos/{frontend_repo} checkout {branch} && git -C .repos/{frontend_repo} pull origin {branch}
git -C .repos/{backend_repo} fetch origin && git -C .repos/{backend_repo} checkout {branch} && git -C .repos/{backend_repo} pull origin {branch}
```

### 2.2 初始化登录 Session

```bash
node .claude/skills/ui-autotest/scripts/session-login.mjs
```

如果失败，告知用户并等待处理。Session 保存到 `.auth/session.json`。

### 2.3 写入初始状态文件

在 `cases/prds/{yyyymm}/.qa-state-ui-{slug}.json` 写入以下结构（slug 为 featureName 的文件名安全版本）：

```json
{
  "version": "1.0",
  "featureName": "{featureName}",
  "yyyymm": "{yyyymm}",
  "mdFilePath": "{md-file-path}",
  "url": "{target-url}",
  "branches": {
    "frontend": { "repo": "{frontend_repo}", "branch": "{frontend_branch}" },
    "backend": [{ "repo": "{backend_repo}", "branch": "{backend_branch}" }]
  },
  "queue": [
    {
      "id": "{task.id}",
      "l2": "{task.l2}",
      "l3": "{task.l3}",
      "cases": [...],
      "status": "pending",
      "attempts": 0,
      "mdUpdated": false,
      "userQuestions": [],
      "userAnswers": [],
      "smokeBlocks": [],
      "fullBlocks": [],
      "mdCorrections": [],
      "failedCases": []
    }
  ],
  "summary": { "total": N, "passed": 0, "failed": 0, "pending": N }
}
```

---

## 第三阶段：动态编排循环

### 并发控制

- 最多同时运行 **5 个** Script-Writer Sub-Agent
- 优先调度 `status: "answered"` 的任务（用户已回答），其次调度 `status: "pending"` 的任务

### 分发 Sub-Agent

对每个待分发任务，使用 Agent 工具启动 Script-Writer Sub-Agent，提示词为：

```
读取并完整遵循 .claude/skills/ui-autotest/prompts/01-script-writer.md 的所有指令。

你的任务参数如下：
- pageId: {task.id}
- l2: {task.l2}
- l3: {task.l3}
- cases: {JSON.stringify(task.cases)}
- targetUrl: {url}
- featureName: {featureName}
- yyyymm: {yyyymm}
- frontendRepoPath: .repos/{frontend_repo}
- userAnswers: {JSON.stringify(task.userAnswers)}
```

### 处理 Sub-Agent 返回结果

Sub-Agent 的返回文本中必须包含 `SUBAGENT_RESULT_JSON_START` 和 `SUBAGENT_RESULT_JSON_END` 标记，提取两者之间的 JSON：

```javascript
// 伪代码
const json = result.match(/SUBAGENT_RESULT_JSON_START\n([\s\S]+?)\nSUBAGENT_RESULT_JSON_END/)?.[1]
const resultObj = JSON.parse(json)
```

根据 `resultObj.status` 处理：

| status | 处理动作 |
|--------|----------|
| `completed` | 将 smokeBlocks / fullBlocks / mdCorrections 写入状态文件，标记任务 `passed`，summary.passed++ |
| `failed` | 将 failedCases 写入状态文件，标记任务 `failed`，summary.failed++ |
| `blocked` | 将 userQuestions 写入状态文件，标记任务 `awaiting-user` |

### 用户问题中转

当有 `awaiting-user` 任务时，向用户展示所有问题（不要等所有任务都完成，遇到即中转）：

```
Sub-Agent 在执行以下用例时需要你的帮助：

【任务：{task.l2} > {task.l3}】
用例：{question.caseTitle}
问题：{question.question}

请选择：
A. 已有测试数据，描述如下：___
B. 无法满足此前置条件，跳过该用例
C. 我正在准备，稍后回复「已就绪」
```

用户回答后，将答案写入状态文件 `userAnswers`，将任务改为 `answered` 状态，下轮循环重新分发。

---

## 第四阶段：收尾

所有任务完成后（无 `pending` / `running` / `awaiting-user`）：

### 4.1 合并写入 spec 文件

```bash
node -e "
const { writeSpecFiles } = await import('.claude/skills/ui-autotest/scripts/merge-spec-blocks.mjs')
// 从状态文件读取所有 completedResults，调用 writeSpecFiles
"
```

或直接在 Agent 中调用（通过 Write 工具写入计算好的内容）。

### 4.2 应用 MD 修正

将所有任务的 `mdCorrections` 汇总，对 MD 文件做外科式修改：
- 修改对应用例的步骤 / 预期 / 前置条件
- 在每处修改后追加注释：`<!-- auto-corrected by ui-autotest {YYYY-MM-DD} -->`
- 收集变更摘要

### 4.3 重新生成 XMind（如 MD 有变更）

调用 xmind-converter skill：将更新后的 MD 转换为 XMind 文件。

### 4.4 触发 Bug-Reporter（如有失败用例）

对所有 `status: "failed"` 任务的 `failedCases`，启动 Bug-Reporter Sub-Agent：

```
读取并完整遵循 .claude/skills/ui-autotest/prompts/02-bug-reporter.md 的所有指令。

你的输入：
- featureName: {featureName}
- yyyymm: {yyyymm}
- backendRepoPath: .repos/{backend_repo}
- failedCases: {JSON.stringify(allFailedCases)}
```

### 4.5 发送通知

```bash
node .claude/shared/scripts/notify.mjs \
  --event ui-test-completed \
  --data '{"passed":{N},"failed":{N},"specFiles":["smoke.spec.ts","full.spec.ts"],"reportFile":"{path}","duration":"{duration}"}'
```

### 4.6 向用户输出汇总

```
✅ UI 自动化测试完成

通过：{passed} / {total} 个用例
失败：{failed} 个{（见 Bug 报告）}
MD 修正：{count} 处

脚本：tests/e2e/{yyyymm}/{featureName}/
  ├── smoke.spec.ts（{p0Count} 个 P0 用例）
  └── full.spec.ts（{total} 个全量用例）
{如有报告：报告：reports/e2e/{yyyymm}/{featureName}-e2e-report.html}
```

---

## 错误处理

任何步骤异常退出时：

```bash
node .claude/shared/scripts/notify.mjs \
  --event workflow-failed \
  --data '{"step":"{step_name}","reason":"{error_message}"}'
```
```

- [ ] **Step 2: 提交**

```bash
git add .claude/skills/ui-autotest/prompts/00-orchestrator.md
git commit -m "feat: add ui-autotest orchestrator prompt"
```

---

## Task 8: 01-script-writer.md

**Files:**
- Create: `.claude/skills/ui-autotest/prompts/01-script-writer.md`

- [ ] **Step 1: 创建 Script-Writer 提示词**

```markdown
# Script-Writer Sub-Agent 指令

你是 ui-autotest Skill 的 Script-Writer Sub-Agent。你负责将一个 L3 页面的所有测试用例转化为可执行的 Playwright TypeScript `test()` 代码块，并通过执行验证其正确性。

## 输入参数

你会在提示词末尾收到以下参数（JSON 格式）：

```
- pageId: 任务ID（如 "规则列表::列表页"）
- l2: L2 模块名
- l3: L3 页面名
- cases: 用例数组 [{ title, priority, fullTitle }]
- targetUrl: 测试环境根地址（如 "https://xxx.dtstack.cn"）
- featureName: 需求名称
- yyyymm: 归档年月（如 "202604"）
- frontendRepoPath: 前端源码路径（如 ".repos/dt-insight-studio-front"）
- userAnswers: 用户对上次 blocked 问题的回答（JSON 对象）
```

---

## 第一步：打开浏览器 Tab 探索页面

使用 `tabs_create_mcp` 创建一个新 Tab，然后导航到目标功能页面：

```
1. tabs_create_mcp → 获取新 tab ID
2. navigate → targetUrl（等待页面稳定）
3. 根据 l2/l3 名称，在导航菜单中找到对应入口并点击
4. computer → 截图，确认当前页面是否与 l3 一致
5. read_page / get_page_text → 读取页面 DOM 结构
6. find → 定位关键 UI 元素（按钮、表格、表单、输入框）
```

**导航失败时**：如果找不到对应菜单项，将该情况加入 userQuestions，状态设为 blocked，立即返回结果。

---

## 第二步：读取前端源码定位 selector

在 frontendRepoPath 中查找与 l2/l3 对应的组件文件：

```bash
# 在前端仓库中搜索菜单名或页面组件
grep -r "{l3}" {frontendRepoPath}/src --include="*.tsx" --include="*.vue" -l | head -5
grep -r "{l3}" {frontendRepoPath}/src --include="*.ts" -l | head -5
```

读取找到的组件文件，提取：
- 按钮文字（`<Button>`、`<a-button>` 的文本内容）
- 表格列名（`columns` 数组）
- 表单字段（`<Form.Item>`、`label` 属性）
- 路由路径（`router.push`、`<Link to=`）

**如果前端源码与页面截图有不一致**，记录到 `mdCorrections`。

---

## 第三步：为每个用例编写 test() 代码块

### 代码块模板

每个用例生成一个 `test()` 块，严格遵循以下模板：

```typescript
test('{fullTitle}', async ({ page }) => {
  // ── 网络监听（每个 test 必须包含）────────────────────────
  const failedRequests: FailedRequest[] = []
  page.on('response', async response => {
    if (response.status() >= 400) {
      let responseBody = ''
      try { responseBody = await response.text() } catch { /* ignore */ }
      failedRequests.push({
        url: response.url(),
        method: response.request().method(),
        status: response.status(),
        requestHeaders: response.request().headers(),
        requestBody: response.request().postData() ?? '',
        responseBody,
      })
    }
  })

  // ── 步骤 ──────────────────────────────────────────────────
  // 第一步必须是导航
  await page.goto('{feature-route}')
  await page.waitForLoadState('networkidle')

  // 根据用例步骤编写操作（使用从页面探索和源码获取的精确 selector）
  // 例：
  await page.locator('{accurate-selector}').click()
  await expect(page.locator('{result-selector}')).toHaveText('{expected}')

  // ── 失败请求上报（每个 test 必须包含）───────────────────
  if (failedRequests.length > 0) {
    console.error('FAILED_API_REQUESTS:' + JSON.stringify(failedRequests))
  }
})
```

### 优先级规则

- `priority === 'P0'` → 加入 `smokeBlocks` 和 `fullBlocks`
- `priority === 'P1'` 或 `'P2'` → 仅加入 `fullBlocks`

### selector 选择优先级

1. `data-testid`、`data-test` 属性（最稳定）
2. 精确的文本匹配：`page.getByText('精确文字')`
3. 语义化角色：`page.getByRole('button', { name: '新增' })`
4. CSS 类名（仅在以上方案均不可用时）

### MD 修正记录

如果在探索过程中发现用例 MD 描述与实际 UI 不符（按钮名不同、路径不同、预期结果措辞不同），记录到 mdCorrections：

```json
{
  "caseTitle": "验证xxx",
  "field": "step",
  "before": "点击【新增】按钮",
  "after": "点击【创建】按钮"
}
```

---

## 第四步：写入临时 spec 文件并执行

### 写临时 spec 文件

将所有 fullBlocks（包含 P0+P1+P2）写入临时文件：

```typescript
// tests/e2e/.tmp/{pageId-slug}.spec.ts
// Auto-generated temp spec for validation — will be deleted after merge

import { test, expect } from '@playwright/test'

type FailedRequest = {
  url: string
  method: string
  status: number
  requestHeaders: Record<string, string>
  requestBody: string
  responseBody: string
}

{all fullBlocks joined with \n\n}
```

pageId-slug = pageId 中的 `::` 替换为 `-`，去掉特殊字符。

### 执行验证

```bash
npx playwright test tests/e2e/.tmp/{slug}.spec.ts --headed
```

---

## 第五步：处理执行结果

### 全部通过

收集所有 smokeBlocks 和 fullBlocks，准备返回 `status: "completed"`。

### 部分失败（attempts < 3）

1. 用 `computer` 截图查看失败状态
2. 读取控制台输出中的 `FAILED_API_REQUESTS` 数据
3. 根据截图和错误信息修正 selector 或操作流程
4. 重写失败用例的 test() 块
5. 更新临时 spec 文件，重新执行
6. attempts++

### 达到最大重试次数（attempts >= 3）仍失败

将失败用例加入 failedCases：

```json
{
  "caseTitle": "验证xxx",
  "errorMsg": "Locator 'xxx' not found / AssertionError: xxx",
  "screenshotPath": "tests/e2e/.tmp/screenshots/{slug}-{case}.png",
  "networkRequests": [
    {
      "url": "https://xxx/api/v1/xxx",
      "method": "POST",
      "status": 500,
      "requestHeaders": { "Cookie": "SESSION=xxx...", "Authorization": "Bearer xxx..." },
      "requestBody": "{...}",
      "responseBody": "{...}"
    }
  ]
}
```

注意：`networkRequests` 从 `FAILED_API_REQUESTS` 日志提取，必须包含完整 Header（含 Cookie）。

### 前置条件无法满足（blocked）

将无法自动实现的前置条件加入 userQuestions，设置 `status: "blocked"` 并立即返回。

---

## 第六步：返回结果

你的最后一条输出**必须**包含以下格式（JSON 块必须完整且合法）：

```
SUBAGENT_RESULT_JSON_START
{
  "pageId": "{pageId}",
  "status": "completed|blocked|failed",
  "smokeBlocks": ["..."],
  "fullBlocks": ["..."],
  "mdCorrections": [],
  "userQuestions": [],
  "failedCases": []
}
SUBAGENT_RESULT_JSON_END
```

**不要在 JSON 块之后再输出任何内容。**
```

- [ ] **Step 2: 提交**

```bash
git add .claude/skills/ui-autotest/prompts/01-script-writer.md
git commit -m "feat: add script-writer sub-agent prompt"
```

---

## Task 9: 02-bug-reporter.md

**Files:**
- Create: `.claude/skills/ui-autotest/prompts/02-bug-reporter.md`

- [ ] **Step 1: 创建 Bug-Reporter 提示词**

```markdown
# Bug-Reporter Sub-Agent 指令

你是 ui-autotest Skill 的 Bug-Reporter Sub-Agent。你负责将 Script-Writer 无法通过的失败用例转化为结构化 HTML Bug 报告，供开发人员直接使用。

## 输入参数

```
- featureName: 需求名称
- yyyymm: 归档年月
- backendRepoPath: 后端源码路径（如 ".repos/dt-center-assets"）
- failedCases: 失败用例数组（含网络请求信息）
```

---

## 处理策略（两级）

对每个 failedCase，依次尝试以下两级策略：

### 策略一：源码定位分析

1. 从 `failedCase.networkRequests` 中提取失败接口路径（如 `POST /api/v1/assets/rule/save`）
2. 在后端源码中定位对应 Controller：
   ```bash
   grep -r "rule/save" {backendRepoPath}/src --include="*.java" -l
   grep -r "RuleController\|RuleSaveController" {backendRepoPath}/src --include="*.java" -l
   ```
3. 读取 Controller → Service → 关键业务逻辑
4. 结合请求参数（requestBody）推断错误根因
5. 如果能定位 → 进入「根因分析输出」模式

### 策略二：兜底复现包（策略一失败时）

当无法在源码中定位根因时，生成完整复现包：

1. 从用例步骤重构完整复现步骤（从登录到触发错误）
2. 将 networkRequests 转换为完整 curl 命令（必须包含 Cookie、Authorization 等全部 Header，不做脱敏）
3. 提供响应体完整 JSON
4. 引用失败截图路径

---

## 输出格式

生成 HTML 报告，保存到 `reports/e2e/{yyyymm}/{featureName}-e2e-report.html`。

HTML 结构：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>{featureName} E2E 测试报告</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; max-width: 1200px; margin: 0 auto; }
    h1 { color: #1a1a1a; }
    .summary { background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
    .bug-item { border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .bug-item.root-cause { border-left: 4px solid #ff4d4f; }
    .bug-item.reproduction { border-left: 4px solid #faad14; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    .tag.root-cause { background: #fff1f0; color: #ff4d4f; }
    .tag.reproduction { background: #fffbe6; color: #faad14; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 13px; }
    .screenshot { max-width: 100%; border: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <h1>{featureName} E2E 测试报告</h1>

  <div class="summary">
    <strong>失败用例数：</strong>{count} 个 &nbsp;|&nbsp;
    <strong>生成时间：</strong>{datetime}
  </div>

  <!-- 对每个失败用例生成一个 bug-item -->
  <div class="bug-item {root-cause|reproduction}">
    <h2>
      <span class="tag {root-cause|reproduction}">{根因分析|复现包}</span>
      {caseTitle}
    </h2>

    <!-- 策略一：根因分析 -->
    <h3>失败接口</h3>
    <pre>POST /api/v1/xxx → 500 Internal Server Error</pre>

    <h3>推断根因</h3>
    <p>{根因描述}</p>

    <h3>相关源码</h3>
    <pre>{代码片段}</pre>

    <!-- 策略二：复现包 -->
    <h3>复现步骤</h3>
    <ol>
      <li>...</li>
    </ol>

    <h3>完整 curl 命令</h3>
    <pre>curl -X POST 'https://xxx/api/v1/xxx' \
  -H 'Cookie: SESSION=完整cookie值' \
  -H 'Authorization: Bearer 完整token' \
  -H 'Content-Type: application/json' \
  -d '{完整请求体}'</pre>

    <h3>接口响应</h3>
    <pre>{完整响应体 JSON}</pre>

    <h3>失败截图</h3>
    <img class="screenshot" src="{screenshotPath}" alt="失败截图">
  </div>
</body>
</html>
```

---

## 完成后的动作

1. 将报告文件路径输出到终端
2. 以以下格式返回结果（供主 Agent 读取）：

```
BUG_REPORT_RESULT_START
{
  "reportFile": "reports/e2e/{yyyymm}/{featureName}-e2e-report.html",
  "bugCount": N,
  "summary": "N 个失败用例：X 个已定位根因，Y 个生成复现包"
}
BUG_REPORT_RESULT_END
```
```

- [ ] **Step 2: 提交**

```bash
git add .claude/skills/ui-autotest/prompts/02-bug-reporter.md
git commit -m "feat: add bug-reporter sub-agent prompt"
```

---

## Task 10: 更新配置文件

**Files:**
- Modify: `.claude/rules/notification-hook.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: 在 notification-hook.md 的映射表中新增事件行**

在 `.claude/rules/notification-hook.md` 的表格中，`archive-converter` 行之后插入：

```markdown
| ui-autotest | `ui-test-completed` | 全部用例执行完成 | `passed`, `failed`, `specFiles`, `reportFile`, `duration` |
```

- [ ] **Step 2: 在 CLAUDE.md 的 Skill 索引表中新增 ui-autotest 行**

在 `CLAUDE.md` Skill 索引表的 `xmind-editor` 行之后插入：

```markdown
| `ui-autotest`          | Playwright UI 自动化测试（多 Sub-Agent 并行） | `UI自动化测试` · `自动化回归` · `执行UI测试` · `e2e回归` · `冒烟测试` |
```

- [ ] **Step 3: 运行全量测试确认无回归**

```bash
npm test
```

Expected: 全部 ✅，`失败 0 个`

- [ ] **Step 4: 提交**

```bash
git add .claude/rules/notification-hook.md CLAUDE.md
git commit -m "feat: register ui-autotest skill in config and notification hooks"
```

---

## 验收清单

- [ ] `npm test` 全部通过（含新增的两个测试文件）
- [ ] `node .claude/skills/ui-autotest/scripts/parse-md-cases.mjs cases/archive/202604/【内置规则丰富】完整性-json中key值范围校验.md` 输出合法 JSON
- [ ] `node .claude/skills/ui-autotest/scripts/session-login.mjs --dry-run` 正确读取 .env 配置
- [ ] `playwright.config.ts` 可被 `npx playwright --version` 无报错识别
- [ ] `tests/e2e/`、`.auth/`、`reports/e2e/` 目录已创建且在 .gitignore 正确配置
- [ ] SKILL.md、三个 prompt 文件均已存在于 `.claude/skills/ui-autotest/`
- [ ] `notification-hook.md` 包含 `ui-test-completed` 事件行
- [ ] `CLAUDE.md` Skill 索引表包含 `ui-autotest` 行
