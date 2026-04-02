/**
 * patch-xmind-roots.mjs
 * 将现有 xmind 文件的根节点名称更新为新格式:
 *   ${中文产品名}${版本}迭代用例(#${trackerId})
 *
 * 用法:
 *   node patch-xmind-roots.mjs [--dry-run]
 *
 * 仅处理满足以下条件的文件:
 *   1. 位于版本化目录 (v\d+) 下
 *   2. 所属模块在 config.json 中配置了 trackerId
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { resolve, join, relative, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..')
const isDryRun = process.argv.includes('--dry-run')

function loadConfig() {
  const configPath = resolve(REPO_ROOT, '.claude', 'config.json')
  return JSON.parse(readFileSync(configPath, 'utf8'))
}

function findVersionedXmindFiles(config) {
  const results = []
  for (const [moduleKey, mod] of Object.entries(config.modules)) {
    if (!mod.trackerId) continue
    const xmindBase = resolve(REPO_ROOT, mod.xmind)
    let entries
    try {
      entries = readdirSync(xmindBase)
    } catch {
      continue
    }
    for (const entry of entries) {
      if (!/^v\d/.test(entry)) continue
      const versionDir = join(xmindBase, entry)
      let stat
      try {
        stat = statSync(versionDir)
      } catch {
        continue
      }
      if (!stat.isDirectory()) continue
      const version = entry
      let files
      try {
        files = readdirSync(versionDir).filter((f) => f.endsWith('.xmind'))
      } catch {
        continue
      }
      for (const file of files) {
        results.push({ filePath: join(versionDir, file), moduleKey, mod, version })
      }
    }
  }
  return results
}

function buildExpectedRoot(mod, version) {
  const idSuffix = mod.trackerId ? `(#${mod.trackerId})` : ''
  return `${mod.zh}${version}迭代用例${idSuffix}`
}

async function patchFile(JSZip, { filePath, mod, version }) {
  const expectedRoot = buildExpectedRoot(mod, version)
  const relPath = relative(REPO_ROOT, filePath)

  let zip, sheets
  try {
    const buffer = readFileSync(filePath)
    zip = await JSZip.loadAsync(buffer)
    const contentStr = await zip.file('content.json').async('string')
    sheets = JSON.parse(contentStr)
  } catch (err) {
    console.warn(`SKIP (parse error): ${relPath} — ${err.message}`)
    return 'error'
  }

  const currentRoot = sheets[0]?.rootTopic?.title
  if (currentRoot === expectedRoot) {
    console.log(`SKIP (already correct): ${relPath}`)
    return 'skip'
  }

  console.log(`${isDryRun ? 'DRY-RUN' : 'PATCH'}: ${relPath}`)
  console.log(`  "${currentRoot}" → "${expectedRoot}"`)

  if (!isDryRun) {
    sheets[0].rootTopic.title = expectedRoot
    zip.file('content.json', JSON.stringify(sheets))
    const newBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
    writeFileSync(filePath, newBuffer)
  }

  return 'patched'
}

async function main() {
  const config = loadConfig()
  const { default: JSZip } = await import('jszip')
  const files = findVersionedXmindFiles(config)

  if (files.length === 0) {
    console.log('未找到需要处理的 xmind 文件')
    return
  }

  console.log(`找到 ${files.length} 个 xmind 文件（${isDryRun ? 'dry-run 预览' : '实际修改'}）`)
  console.log('---')

  const counts = { patched: 0, skip: 0, error: 0 }
  for (const file of files) {
    const status = await patchFile(JSZip, file)
    counts[status] = (counts[status] ?? 0) + 1
  }

  console.log('---')
  console.log(`完成: ${counts.patched} 个已修改, ${counts.skip} 个已跳过, ${counts.error ?? 0} 个错误`)
}

main().catch(console.error)
