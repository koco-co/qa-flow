/**
 * xmind-case-editor.mjs
 * 局部搜索和编辑 XMind 测试用例，无需读取 PRD 文件
 *
 * 用法:
 *   node xmind-case-editor.mjs search <query> [--dir cases/xmind] [--limit 20]
 *   node xmind-case-editor.mjs show --file <xmind> --title <title>
 *   node xmind-case-editor.mjs patch --file <xmind> --title <title> --case-json '<json>'
 *   node xmind-case-editor.mjs add --file <xmind> --parent-title <title> --case-json '<json>'
 *   node xmind-case-editor.mjs delete --file <xmind> --title <title> [--dry-run]
 *
 * case-json 格式（patch/add 共用）:
 *   {
 *     "title": "验证xxx",
 *     "priority": "P1",
 *     "preconditions": "1、xxx",
 *     "steps": [
 *       { "step": "进入【xxx】页面", "expected": "页面正常加载" },
 *       { "step": "操作xxx", "expected": "预期结果" }
 *     ]
 *   }
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs'
import { resolve, join, dirname, relative } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..')

const PRIORITY_LABEL = {
  'priority-1': 'P0',
  'priority-2': 'P1',
  'priority-3': 'P2',
}

const PRIORITY_MARKER = {
  P0: 'priority-1',
  P1: 'priority-2',
  P2: 'priority-3',
}

// ─── XMind I/O ───────────────────────────────────────────────────────────────

async function readXmind(filePath) {
  const { default: JSZip } = await import('jszip')
  const buffer = readFileSync(resolve(filePath))
  const zip = await JSZip.loadAsync(buffer)
  const contentStr = await zip.file('content.json').async('string')
  return { zip, sheets: JSON.parse(contentStr) }
}

async function writeXmind(filePath, zip, sheets) {
  zip.file('content.json', JSON.stringify(sheets))
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  writeFileSync(resolve(filePath), buffer)
}

function listXmindFiles(dir) {
  const results = []
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      results.push(...listXmindFiles(full))
    } else if (entry.endsWith('.xmind')) {
      results.push(full)
    }
  }
  return results
}

// ─── Tree helpers ─────────────────────────────────────────────────────────────

function getPriority(node) {
  if (!node.markers) return null
  for (const m of node.markers) {
    const label = PRIORITY_LABEL[m.markerId]
    if (label) return label
  }
  return null
}

function isCaseNode(node) {
  return getPriority(node) !== null
}

/**
 * Walk every node in the tree.
 * callback(node, parentTitles[])
 */
function walkTree(node, parentTitles, callback) {
  if (!node) return
  callback(node, parentTitles)
  const children = node.children?.attached ?? []
  for (const child of children) {
    walkTree(child, [...parentTitles, node.title], callback)
  }
}

/**
 * Find the first node whose title contains query (case-insensitive).
 * Returns { node, parentTitles, parentNode, index } or null.
 */
function findNode(sheets, query, opts = {}) {
  const { caseOnly = false } = opts
  const lower = query.toLowerCase()
  let found = null

  for (const sheet of sheets) {
    if (found) break
    const walk = (node, parentTitles, parentNode) => {
      if (found) return
      const children = node.children?.attached ?? []
      children.forEach((child, idx) => {
        if (found) return
        if (
          child.title.toLowerCase().includes(lower) &&
          (!caseOnly || isCaseNode(child))
        ) {
          found = { node: child, parentTitles: [...parentTitles, node.title], parentNode: node, index: idx }
        }
        walk(child, [...parentTitles, node.title], child)
      })
    }
    walk(sheet.rootTopic, [], null)
  }
  return found
}

function nodeToReadable(node, parentTitles) {
  const priority = getPriority(node)
  const steps = (node.children?.attached ?? []).map(stepNode => ({
    step: stepNode.title,
    expected: stepNode.children?.attached?.[0]?.title ?? '',
  }))
  return {
    title: node.title,
    priority,
    preconditions: node.note ?? null,
    steps,
    path: parentTitles,
  }
}

function buildCaseNode(caseJson, existingNode = null) {
  // Preserve existing node fields (id, structureClass, etc.) when patching
  const node = existingNode ? { ...existingNode } : { id: randomUUID().replace(/-/g, '').slice(0, 20) }

  if (caseJson.title !== undefined) node.title = caseJson.title
  if (caseJson.priority) {
    const markerId = PRIORITY_MARKER[caseJson.priority]
    node.markers = markerId ? [{ markerId }] : (node.markers ?? [])
  }
  if (caseJson.preconditions !== undefined) {
    if (caseJson.preconditions) {
      node.note = caseJson.preconditions
    } else {
      delete node.note
    }
  }
  if (Array.isArray(caseJson.steps)) {
    node.children = {
      attached: caseJson.steps.map(s => ({
        id: randomUUID().replace(/-/g, '').slice(0, 20),
        title: s.step || s.action || '⚠️步骤缺失',
        children: {
          attached: [{
            id: randomUUID().replace(/-/g, '').slice(0, 20),
            title: s.expected || s.result || '⚠️预期缺失',
          }],
        },
      })),
    }
  }
  return node
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function cmdSearch(query, opts) {
  const dir = resolve(REPO_ROOT, opts.dir || 'cases/xmind')
  const limit = parseInt(opts.limit || '20', 10)
  const files = listXmindFiles(dir)

  if (files.length === 0) {
    console.log(`未找到任何 XMind 文件（目录：${relative(REPO_ROOT, dir)}）`)
    return
  }

  const lower = query.toLowerCase()
  const results = []

  for (const filePath of files) {
    let sheets
    try {
      ;({ sheets } = await readXmind(filePath))
    } catch (err) {
      console.warn(`跳过（读取失败）：${relative(REPO_ROOT, filePath)} — ${err.message}`)
      continue
    }
    walkTree({ title: '(root)', children: { attached: sheets.map(s => s.rootTopic) } }, [], (node, parentTitles) => {
      if (results.length >= limit) return
      if (isCaseNode(node) && node.title.toLowerCase().includes(lower)) {
        results.push({
          file: relative(REPO_ROOT, filePath),
          path: parentTitles.slice(1).join(' > '), // skip the artificial (root)
          title: node.title,
          priority: getPriority(node),
        })
      }
    })
    if (results.length >= limit) break
  }

  if (results.length === 0) {
    console.log(`未找到匹配「${query}」的用例（搜索 ${files.length} 个文件）`)
    return
  }

  console.log(`📍 找到 ${results.length} 个匹配结果（搜索「${query}」）\n`)
  results.forEach((r, i) => {
    console.log(`[${i + 1}] ${r.file}`)
    console.log(`    路径: ${r.path}`)
    console.log(`    标题: ${r.title}`)
    console.log(`    优先级: ${r.priority ?? '未知'}`)
    console.log()
  })
}

async function cmdShow(opts) {
  const { file, title } = opts
  if (!file || !title) {
    console.error('用法: show --file <xmind> --title <title>')
    process.exit(1)
  }
  const filePath = resolve(REPO_ROOT, file)
  if (!existsSync(filePath)) {
    console.error(`文件不存在: ${file}`)
    process.exit(1)
  }

  const { sheets } = await readXmind(filePath)
  const found = findNode(sheets, title, { caseOnly: true })

  if (!found) {
    console.error(`未找到标题包含「${title}」的用例（文件：${file}）`)
    process.exit(1)
  }

  const readable = nodeToReadable(found.node, found.parentTitles)
  console.log(`📋 用例详情`)
  console.log(`文件:     ${relative(REPO_ROOT, filePath)}`)
  console.log(`路径:     ${readable.path.join(' > ')}`)
  console.log(`标题:     ${readable.title}`)
  console.log(`优先级:   ${readable.priority ?? '未知'}`)
  if (readable.preconditions) {
    console.log(`前置条件:\n${readable.preconditions.split('\n').map(l => '  ' + l).join('\n')}`)
  }
  console.log(`步骤:`)
  if (readable.steps.length === 0) {
    console.log('  （无步骤）')
  } else {
    readable.steps.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.step}`)
      console.log(`     → ${s.expected}`)
    })
  }
}

async function cmdPatch(opts) {
  const { file, title, caseJson: caseJsonStr, dryRun } = opts
  if (!file || !title || !caseJsonStr) {
    console.error('用法: patch --file <xmind> --title <title> --case-json \'<json>\'')
    process.exit(1)
  }
  const filePath = resolve(REPO_ROOT, file)
  if (!existsSync(filePath)) {
    console.error(`文件不存在: ${file}`)
    process.exit(1)
  }

  let caseJson
  try {
    caseJson = JSON.parse(caseJsonStr)
  } catch (err) {
    console.error(`--case-json 解析失败: ${err.message}`)
    process.exit(1)
  }

  const { zip, sheets } = await readXmind(filePath)
  const found = findNode(sheets, title, { caseOnly: true })

  if (!found) {
    console.error(`未找到标题包含「${title}」的用例（文件：${file}）`)
    process.exit(1)
  }

  const oldReadable = nodeToReadable(found.node, found.parentTitles)
  const newNode = buildCaseNode(caseJson, found.node)

  // Apply: replace the node in parent's children array
  found.parentNode.children.attached[found.index] = newNode
  const newReadable = nodeToReadable(newNode, found.parentTitles)

  console.log(`✏️  ${dryRun ? '[DRY-RUN] ' : ''}修改用例`)
  console.log(`文件: ${relative(REPO_ROOT, filePath)}`)
  console.log(`路径: ${oldReadable.path.join(' > ')}`)
  console.log()
  console.log('修改前:')
  printCaseSummary(oldReadable)
  console.log()
  console.log('修改后:')
  printCaseSummary(newReadable)

  if (!dryRun) {
    await writeXmind(filePath, zip, sheets)
    console.log(`\n✅ 已保存`)
  } else {
    console.log(`\n（dry-run，未写入文件）`)
  }
}

async function cmdAdd(opts) {
  const { file, parentTitle, caseJson: caseJsonStr, dryRun } = opts
  if (!file || !parentTitle || !caseJsonStr) {
    console.error('用法: add --file <xmind> --parent-title <title> --case-json \'<json>\'')
    process.exit(1)
  }
  const filePath = resolve(REPO_ROOT, file)
  if (!existsSync(filePath)) {
    console.error(`文件不存在: ${file}`)
    process.exit(1)
  }

  let caseJson
  try {
    caseJson = JSON.parse(caseJsonStr)
  } catch (err) {
    console.error(`--case-json 解析失败: ${err.message}`)
    process.exit(1)
  }
  if (!caseJson.title) {
    console.error('case-json 必须包含 title 字段')
    process.exit(1)
  }

  const { zip, sheets } = await readXmind(filePath)
  // Find the parent node (not restricted to case nodes)
  const found = findNode(sheets, parentTitle, { caseOnly: false })

  if (!found) {
    console.error(`未找到标题包含「${parentTitle}」的父节点（文件：${file}）`)
    process.exit(1)
  }

  const parentNode = found.node
  const parentPath = [...found.parentTitles, parentNode.title]

  if (!parentNode.children) parentNode.children = { attached: [] }
  if (!parentNode.children.attached) parentNode.children.attached = []

  const newNode = buildCaseNode(caseJson)
  const insertIndex = parentNode.children.attached.length
  parentNode.children.attached.push(newNode)

  console.log(`➕ ${dryRun ? '[DRY-RUN] ' : ''}新增用例`)
  console.log(`文件:   ${relative(REPO_ROOT, filePath)}`)
  console.log(`父节点: ${parentPath.join(' > ')}`)
  console.log(`位置:   第 ${insertIndex + 1} 条`)
  console.log()
  printCaseSummary(nodeToReadable(newNode, parentPath))

  if (!dryRun) {
    await writeXmind(filePath, zip, sheets)
    console.log(`\n✅ 已保存`)
  } else {
    console.log(`\n（dry-run，未写入文件）`)
  }
}

async function cmdDelete(opts) {
  const { file, title, dryRun } = opts
  if (!file || !title) {
    console.error('用法: delete --file <xmind> --title <title> [--dry-run]')
    process.exit(1)
  }
  const filePath = resolve(REPO_ROOT, file)
  if (!existsSync(filePath)) {
    console.error(`文件不存在: ${file}`)
    process.exit(1)
  }

  const { zip, sheets } = await readXmind(filePath)
  const found = findNode(sheets, title, { caseOnly: true })

  if (!found) {
    console.error(`未找到标题包含「${title}」的用例（文件：${file}）`)
    process.exit(1)
  }

  const readable = nodeToReadable(found.node, found.parentTitles)
  console.log(`🗑️  ${dryRun ? '[DRY-RUN] ' : ''}删除用例`)
  console.log(`文件: ${relative(REPO_ROOT, filePath)}`)
  console.log(`路径: ${readable.path.join(' > ')}`)
  console.log(`标题: ${readable.title}`)
  console.log(`优先级: ${readable.priority ?? '未知'}`)

  if (!dryRun) {
    found.parentNode.children.attached.splice(found.index, 1)
    await writeXmind(filePath, zip, sheets)
    console.log(`\n✅ 已删除`)
  } else {
    console.log(`\n（dry-run，未写入文件）`)
  }
}

// ─── Display helpers ──────────────────────────────────────────────────────────

function printCaseSummary(r) {
  console.log(`  标题:   ${r.title}`)
  console.log(`  优先级: ${r.priority ?? '未知'}`)
  if (r.preconditions) {
    const lines = r.preconditions.split('\n')
    console.log(`  前置条件: ${lines[0]}${lines.length > 1 ? ` (+${lines.length - 1} 行)` : ''}`)
  }
  if (r.steps.length > 0) {
    console.log(`  步骤数: ${r.steps.length}`)
    r.steps.forEach((s, i) => {
      console.log(`    ${i + 1}. ${s.step}`)
      console.log(`       → ${s.expected}`)
    })
  } else {
    console.log(`  步骤: （无）`)
  }
}

// ─── CLI argument parser ──────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2)
  const cmd = args[0]
  const opts = {}
  const positionals = []

  for (let i = 1; i < args.length; i++) {
    const a = args[i]
    if (a === '--dry-run') {
      opts.dryRun = true
    } else if (a.startsWith('--')) {
      const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      opts[key] = args[++i]
    } else {
      positionals.push(a)
    }
  }

  return { cmd, opts, positionals }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { cmd, opts, positionals } = parseArgs(process.argv)

  switch (cmd) {
    case 'search': {
      const query = positionals[0] || opts.query
      if (!query) {
        console.error('用法: search <query> [--dir cases/xmind] [--limit 20]')
        process.exit(1)
      }
      await cmdSearch(query, opts)
      break
    }
    case 'show':
      await cmdShow(opts)
      break
    case 'patch':
      await cmdPatch(opts)
      break
    case 'add':
      await cmdAdd(opts)
      break
    case 'delete':
      await cmdDelete(opts)
      break
    default:
      console.error(`未知命令: ${cmd}`)
      console.error('')
      console.error('可用命令:')
      console.error('  search <query>  [--dir cases/xmind] [--limit 20]')
      console.error('  show    --file <xmind> --title <title>')
      console.error('  patch   --file <xmind> --title <title> --case-json \'<json>\'')
      console.error('  add     --file <xmind> --parent-title <title> --case-json \'<json>\'')
      console.error('  delete  --file <xmind> --title <title> [--dry-run]')
      process.exit(1)
  }
}

main().catch(err => {
  console.error('错误:', err.message)
  process.exit(1)
})
