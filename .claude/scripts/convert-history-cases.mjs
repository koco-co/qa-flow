/**
 * convert-history-cases.mjs
 * 将历史测试用例（CSV + XMind）转换为 Markdown 文件
 *
 * 用法:
 *   node convert-history-cases.mjs          # 从项目根目录运行
 *   node convert-history-cases.mjs --force  # 覆盖已存在文件
 *
 * 输入来源:
 *   1. zentao-cases/customItem-platform/信永中和/v0.2.0/ *.csv
 *   2. zentao-cases/customItem-platform/信永中和/v0.2.1/ *.csv
 *   3. zentao-cases/XMind/**\/*.xmind
 *
 * 输出目标:
 *   CSV  → zentao-cases/customItem-platform/信永中和/archive-cases/<version>/<文件名>.md
 *   XMind（信永中和）→ zentao-cases/customItem-platform/信永中和/archive-cases/<文件名>.md
 *   XMind（离线开发）→ zentao-cases/dtstack-platform/离线开发/archive-cases/<文件名>.md
 *   XMind（数据资产）→ zentao-cases/dtstack-platform/数据资产/archive-cases/<文件名>.md
 *   XMind（统一查询）→ zentao-cases/dtstack-platform/统一查询/archive-cases/<文件名>.md
 *   XMind（变量中心）→ zentao-cases/dtstack-platform/变量中心/archive-cases/<文件名>.md
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { resolve, join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')  // WorkSpaces 根目录
const FORCE = process.argv.includes('--force')

// ─── 结果统计 ────────────────────────────────────────────────────────────────
const stats = { skipped: [], success: [], failed: [] }

// ─── 工具函数 ────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

/** 递归找出目录下所有匹配扩展名的文件 */
function findFiles(dir, ext) {
  if (!existsSync(dir)) return []
  const results = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const s = statSync(full)
    if (s.isDirectory()) {
      results.push(...findFiles(full, ext))
    } else if (entry.endsWith(ext)) {
      results.push(full)
    }
  }
  return results
}

/**
 * 最简 RFC-4180 CSV 解析器，支持带换行的引用字段
 * 返回二维数组（包含表头行）
 */
function parseCSV(raw) {
  // 去掉 BOM
  const text = raw.replace(/^\uFEFF/, '')
  const rows = []
  let row = []
  let field = ''
  let inQuote = false
  let i = 0

  while (i < text.length) {
    const ch = text[i]
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          // 转义双引号
          field += '"'
          i += 2
        } else {
          inQuote = false
          i++
        }
      } else {
        field += ch
        i++
      }
    } else {
      if (ch === '"') {
        inQuote = true
        i++
      } else if (ch === ',') {
        row.push(field)
        field = ''
        i++
      } else if (ch === '\r' && text[i + 1] === '\n') {
        row.push(field)
        field = ''
        rows.push(row)
        row = []
        i += 2
      } else if (ch === '\n') {
        row.push(field)
        field = ''
        rows.push(row)
        row = []
        i++
      } else {
        field += ch
        i++
      }
    }
  }
  // 最后一行（无换行符结尾）
  if (field || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  // 过滤空行
  return rows.filter(r => r.some(f => f.trim()))
}

/** 优先级数字 → P0/P1/P2... */
function formatPriority(val) {
  const s = String(val).trim()
  if (/^\d+$/.test(s)) return `P${s}`
  return s || '—'
}

/**
 * 将步骤/预期文本格式化为 Markdown 有序列表
 * 如果原文已有 "1. " 编号，保留；否则当做单条输出
 */
function formatSteps(text) {
  const s = (text || '').trim()
  if (!s || s === '无') return '无'
  // 已有编号 "1. " / "1、" 等
  if (/^[1-9][.、]\s/.test(s)) {
    return s.split(/\n/).map(line => line.trim()).filter(Boolean).join('\n')
  }
  return s
}

// ─── CSV → Markdown ──────────────────────────────────────────────────────────

function convertCSV(csvPath, version) {
  const raw = readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(raw)
  if (rows.length < 2) throw new Error('CSV 文件为空或仅有表头')

  const header = rows[0]
  const idxModule   = header.indexOf('所属模块')
  const idxTitle    = header.indexOf('用例标题')
  const idxPre      = header.indexOf('前置条件')
  const idxSteps    = header.indexOf('步骤')
  const idxExpected = header.indexOf('预期结果')
  const idxPriority = header.indexOf('优先级')

  // 按模块分组
  const groups = new Map()  // module → rows[]
  for (const row of rows.slice(1)) {
    const mod = (row[idxModule] || '').trim() || '（未分类）'
    if (!groups.has(mod)) groups.set(mod, [])
    groups.get(mod).push(row)
  }

  const csvName = basename(csvPath, '.csv')
  const totalCases = rows.length - 1
  const relPath = csvPath.replace(ROOT + '/', '')

  let md = `# ${csvName} ${version}\n`
  md += `> 来源：${relPath}\n`
  md += `> 用例数：${totalCases}\n\n---\n\n`

  for (const [mod, caseRows] of groups) {
    // 只有多个模块时才加模块子标题
    if (groups.size > 1) {
      md += `### ${mod}\n\n`
    }
    for (const row of caseRows) {
      const title    = (row[idxTitle]    || '').trim()
      const pre      = (row[idxPre]      || '').trim()
      const steps    = (row[idxSteps]    || '').trim()
      const expected = (row[idxExpected] || '').trim()
      const priority = formatPriority(row[idxPriority] || '')

      md += `## ${title}\n`
      md += `**优先级**: ${priority}\n`
      md += `**前置条件**: ${pre || '无'}\n\n`
      md += `**步骤**:\n${formatSteps(steps)}\n\n`
      md += `**预期**:\n${formatSteps(expected)}\n\n`
      md += `---\n\n`
    }
  }

  return md
}

// ─── XMind → Markdown ────────────────────────────────────────────────────────

/**
 * 遍历 content.json 树，生成 Markdown
 * root(depth=0) 跳过，depth 1→##, 2→###, 3→####, 4→#####, 5+→###### / bullet
 */
function treeToMd(node, depth) {
  const children = node.children?.attached || []
  const isLeaf = children.length === 0
  const title = (node.title || '').trim()

  if (depth === 0) {
    // 根节点：只递归子节点，不输出自身
    return children.map(c => treeToMd(c, depth + 1)).join('')
  }

  if (isLeaf) {
    return `- ${title}\n`
  }

  // 非叶节点：根据深度选择标题级别
  // depth 1 → ##   (因为 # 已被文件标题占用)
  const hashes = '#'.repeat(Math.min(depth + 1, 6))
  let out = `${hashes} ${title}\n`
  out += children.map(c => treeToMd(c, depth + 1)).join('')
  out += '\n'
  return out
}

/**
 * 用正则从 content.xml 提取层级结构（旧格式兜底）
 */
function xmlToMd(xmlText) {
  // 提取所有 <topic> 标签（可能多层嵌套，用正则做简单处理）
  const lines = []
  let depth = 0
  let i = 0
  while (i < xmlText.length) {
    const openTag = xmlText.indexOf('<topic', i)
    if (openTag === -1) break
    // 检查是否是关闭标签之前的 </topic>
    const closeIdx = xmlText.indexOf('</topic>', i)
    const selfClose = xmlText.indexOf('/>', openTag)

    // 提取 title 属性
    const titleMatch = xmlText.slice(openTag, openTag + 300).match(/title="([^"]*)"/)
    if (titleMatch) {
      const title = titleMatch[1]
      if (depth === 0) {
        // 跳过根节点
      } else {
        lines.push({ depth, title })
      }
    }

    // 寻找下一个开/关标签
    const nextOpen  = xmlText.indexOf('<topic', openTag + 1)
    const nextClose = xmlText.indexOf('</topic>', openTag + 1)

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++
      i = nextOpen
    } else {
      if (nextClose !== -1) {
        depth = Math.max(0, depth - 1)
        i = nextClose + 8
      } else {
        break
      }
    }
  }

  // 转 Markdown
  let md = ''
  for (const { depth: d, title } of lines) {
    if (d <= 0) continue
    const hashes = '#'.repeat(Math.min(d + 1, 6))
    md += `${hashes} ${title}\n`
  }
  return md
}

async function convertXMind(xmindPath) {
  const { default: JSZip } = await import('jszip')
  const buf = readFileSync(xmindPath)
  const zip = await JSZip.loadAsync(buf)
  const relPath = xmindPath.replace(ROOT + '/', '')
  const fileTitle = basename(xmindPath, '.xmind')

  let md = `# ${fileTitle}（XMind）\n`
  md += `> 来源：${relPath}\n\n---\n\n`

  const contentJsonFile = zip.file('content.json')
  if (contentJsonFile) {
    const jsonText = await contentJsonFile.async('string')
    const sheets = JSON.parse(jsonText)
    for (const sheet of sheets) {
      md += treeToMd(sheet.rootTopic, 0)
    }
  } else {
    const contentXmlFile = zip.file('content.xml')
    if (!contentXmlFile) throw new Error('XMind 文件中既无 content.json 也无 content.xml')
    const xmlText = await contentXmlFile.async('string')
    md += xmlToMd(xmlText)
  }

  return md
}

// ─── 输出路径映射 ─────────────────────────────────────────────────────────────

/**
 * 根据 xmind 路径决定 archive-cases 输出目录
 * XMind 来自 定制化/信永中和/ 或 CustomItem/信永中和/ → customItem-platform/信永中和/archive-cases/
 * XMind 来自 离线开发/ → dtstack-platform/离线开发/archive-cases/
 * XMind 来自 数据资产/ → dtstack-platform/数据资产/archive-cases/
 * XMind 来自 统一查询/ → dtstack-platform/统一查询/archive-cases/
 * XMind 来自 变量中心/ → dtstack-platform/变量中心/archive-cases/
 */
function xmindOutputDir(xmindPath) {
  const rel = xmindPath.replace(ROOT + '/', '')
  // rel 类似 zentao-cases/XMind/离线开发/xxx.xmind
  const parts = rel.split('/')
  // parts[0]='zentao-cases', parts[1]='XMind', parts[2]=一级子目录
  const top = parts[2] || ''
  if (top === '定制化' || top === 'CustomItem') {
    // parts[3] = 信永中和 etc.
    const subProject = parts[3] || top
    return join(ROOT, 'zentao-cases/customItem-platform', subProject, 'archive-cases')
  }
  // dtstack-platform modules: 离线开发, 数据资产, 统一查询, 变量中心
  return join(ROOT, 'zentao-cases/dtstack-platform', top, 'archive-cases')
}

// ─── 主流程 ──────────────────────────────────────────────────────────────────

async function processCSVFiles() {
  const csvDirs = [
    { dir: join(ROOT, 'zentao-cases/customItem-platform/信永中和/v0.2.0'), version: 'v0.2.0' },
    { dir: join(ROOT, 'zentao-cases/customItem-platform/信永中和/v0.2.1'), version: 'v0.2.1' },
  ]

  for (const { dir, version } of csvDirs) {
    const csvFiles = findFiles(dir, '.csv')
    for (const csvPath of csvFiles) {
      const name = basename(csvPath, '.csv')
      const outDir = join(ROOT, 'zentao-cases/customItem-platform/信永中和/archive-cases', version)
      const outFile = join(outDir, `${name}.md`)

      if (existsSync(outFile) && !FORCE) {
        stats.skipped.push(outFile.replace(ROOT + '/', ''))
        continue
      }

      try {
        ensureDir(outDir)
        const md = convertCSV(csvPath, version)
        writeFileSync(outFile, md, 'utf-8')
        stats.success.push(outFile.replace(ROOT + '/', ''))
      } catch (e) {
        stats.failed.push({ file: csvPath.replace(ROOT + '/', ''), error: e.message })
      }
    }
  }
}

async function processXMindFiles() {
  const xmindDir = join(ROOT, 'zentao-cases/XMind')
  const xmindFiles = findFiles(xmindDir, '.xmind')

  for (const xmindPath of xmindFiles) {
    const name = basename(xmindPath, '.xmind')
    const outDir = xmindOutputDir(xmindPath)
    const outFile = join(outDir, `${name}.md`)

    if (existsSync(outFile) && !FORCE) {
      stats.skipped.push(outFile.replace(ROOT + '/', ''))
      continue
    }

    try {
      ensureDir(outDir)
      const md = await convertXMind(xmindPath)
      writeFileSync(outFile, md, 'utf-8')
      stats.success.push(outFile.replace(ROOT + '/', ''))
    } catch (e) {
      stats.failed.push({ file: xmindPath.replace(ROOT + '/', ''), error: e.message })
    }
  }
}

async function main() {
  console.log('🔄 开始转换历史测试用例...\n')
  if (FORCE) console.log('⚠️  --force 模式：将覆盖已存在文件\n')

  await processCSVFiles()
  await processXMindFiles()

  // ── 输出摘要 ──
  console.log('─'.repeat(60))
  if (stats.success.length) {
    console.log(`✅ 成功生成 (${stats.success.length} 个):`)
    stats.success.forEach(f => console.log(`   ${f}`))
  }
  if (stats.skipped.length) {
    console.log(`⏭  已跳过 (${stats.skipped.length} 个，使用 --force 覆盖):`)
    stats.skipped.forEach(f => console.log(`   ${f}`))
  }
  if (stats.failed.length) {
    console.log(`❌ 失败 (${stats.failed.length} 个):`)
    stats.failed.forEach(({ file, error }) => console.log(`   ${file}\n     原因: ${error}`))
  }
  console.log('─'.repeat(60))
  console.log(`完成：成功 ${stats.success.length}，跳过 ${stats.skipped.length}，失败 ${stats.failed.length}`)
}

main().catch(e => {
  console.error('❌ 脚本执行失败:', e)
  process.exit(1)
})
