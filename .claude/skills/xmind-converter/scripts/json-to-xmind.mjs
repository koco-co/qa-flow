/**
 * json-to-xmind.mjs
 * 将中间 JSON 格式转换为 .xmind 文件
 *
 * 用法:
 *   node json-to-xmind.mjs <input.json> <output.xmind>
 *   node json-to-xmind.mjs <input1.json> <input2.json> <output.xmind>
 *   node json-to-xmind.mjs --append <input.json> <existing.xmind>
 *   node json-to-xmind.mjs --replace <input.json> <existing.xmind>
 *
 * --append 模式:
 *   当目标 .xmind 文件已存在时，将新的 L1 节点追加进去而非覆盖。
 *   同名 rootTopic（project_name 相同）：追加新 L1 到已有 root。
 *   不同 rootTopic：作为新 sheet 添加。
 *
 * --replace 模式:
 *   找到与 requirement_name 同名的 L1 节点并替换其 children。
 *   用于模块级重跑：只更新指定需求的 L1，其他 L1 节点保持不变。
 *   如果未找到同名 L1，则追加新 L1（等同于 --append 行为）。
 *
 * XMind 层级结构:
 * Root (${中文产品名}${版本}迭代用例(#${禅道产品ID}))
 *   └── L1 (【version】requirement_name)
 *        └── L2 (modules[].name)           -- 菜单/模块名
 *             └── L3 (pages[].name)         -- 页面名
 *                  └── [L4 (sub_groups[].name)] -- 功能子组(可选)
 *                       └── 用例标题 [marker=priority, note=precondition]
 *                            └── 步骤描述
 *                                 └── 预期结果
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Topic, RootTopic, Marker, Workbook, writeLocalFile } from 'xmind-generator'
import { assertNewOutputPathMatchesContract } from '../../../shared/scripts/output-naming-contracts.mjs'
import { loadConfig } from '../../../shared/scripts/load-config.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const RESERVED_OUTPUT_NAME = 'latest-output.xmind'

const PRIORITY_MAP = {
  P0: Marker.Priority.p1,
  P1: Marker.Priority.p2,
  P2: Marker.Priority.p3,
}

function buildRootTitle(meta = {}, _config = null) {
  const config = _config || loadConfig()
  const moduleKey = meta.module_key || meta.product
  const mod = moduleKey ? config.modules?.[moduleKey] : null
  const displayName = mod?.zh || config.project?.displayName || meta.project_name || ''
  const trackerId = mod?.trackerId
  const versionPart = meta.version || ''
  const idSuffix = trackerId ? `(#${trackerId})` : ''
  if (versionPart || trackerId) {
    return `${displayName}${versionPart}迭代用例${idSuffix}`
  }
  return displayName || meta.project_name || meta.requirement_name || ''
}

function buildL1Title(meta = {}) {
  const ticketSuffix = meta.requirement_ticket ? `(#${meta.requirement_ticket})` : ''
  const versionPrefix = meta.version ? `【${meta.version}】` : ''
  return `${versionPrefix}${meta.requirement_name || ''}${ticketSuffix}`
}

function validateJson(data) {
  let totalCases = 0
  let emptyStepCases = 0
  let emptyExpectedCases = 0
  let noStepsCases = 0

  const walkCases = (testCases) => {
    for (const tc of testCases) {
      totalCases++
      if (!tc.steps || tc.steps.length === 0) {
        noStepsCases++
        continue
      }
      for (const s of tc.steps) {
        if (!s.step && !s.action && !s.操作步骤) emptyStepCases++
        if (!s.expected && !s.result && !s.预期结果) emptyExpectedCases++
      }
    }
  }

  for (const mod of data.modules ?? []) {
    if (mod.pages) {
      for (const page of mod.pages) {
        if (page.sub_groups) {
          for (const sg of page.sub_groups) {
            walkCases(sg.test_cases ?? [])
          }
        }
        walkCases(page.test_cases ?? [])
      }
    }
    if (mod.sub_groups) {
      for (const sg of mod.sub_groups) {
        walkCases(sg.test_cases ?? [])
      }
    }
    walkCases(mod.test_cases ?? [])
  }

  console.log(`\n📋 JSON 校验结果：共 ${totalCases} 条用例`)
  if (emptyStepCases > 0) console.warn(`  ⚠️ ${emptyStepCases} 处步骤描述为空`)
  if (emptyExpectedCases > 0) console.warn(`  ⚠️ ${emptyExpectedCases} 处预期结果为空`)
  if (noStepsCases > 0) console.warn(`  ⚠️ ${noStepsCases} 条用例无步骤`)
  if (emptyStepCases === 0 && emptyExpectedCases === 0 && noStepsCases === 0) {
    console.log('  ✅ 所有用例步骤格式校验通过')
  }

  return { totalCases, emptyStepCases, emptyExpectedCases, noStepsCases }
}

/** Validate JSON structure has required fields */
function validateStructure(data) {
  const errors = []
  if (!data || typeof data !== 'object') {
    errors.push('JSON 数据不是有效对象')
    return errors
  }
  if (!data.meta || typeof data.meta !== 'object') {
    errors.push('缺少 meta 字段')
  } else {
    if (!data.meta.project_name) errors.push('meta.project_name 缺失')
    if (!data.meta.requirement_name) errors.push('meta.requirement_name 缺失')
  }
  if (!Array.isArray(data.modules) || data.modules.length === 0) {
    errors.push('modules 字段缺失或为空数组')
  } else {
    data.modules.forEach((mod, i) => {
      if (!mod.name) errors.push(`modules[${i}].name 缺失`)
    })
  }
  return errors
}

function buildCaseTopic(testCase) {
  const marker = PRIORITY_MAP[testCase.priority] ?? Marker.Priority.p3
  const steps = (testCase.steps ?? []).map((s, idx) => {
    const stepText = s.step || s.action || s.操作步骤 || `⚠️步骤${idx + 1}缺失`
    const expectedText = s.expected || s.result || s.预期结果 || `⚠️预期${idx + 1}缺失`
    if (!s.step || !s.expected) {
      console.warn(`  ⚠️ 用例「${testCase.title}」步骤${idx + 1}: step=${!!s.step}, expected=${!!s.expected}`)
    }
    return Topic(stepText).children([Topic(expectedText)])
  })

  const rawTitle = testCase.title || '⚠️标题缺失'
  const cleanTitle = rawTitle.replace(/^【P\d+】\s*/, '')
  const caseTopic = Topic(cleanTitle).markers([marker])

  const preconditionText = testCase.preconditions || testCase.precondition
  if (preconditionText) {
    caseTopic.note(preconditionText)
  }

  if (steps.length > 0) {
    caseTopic.children(steps)
  }

  return caseTopic
}

function buildPageTopic(page) {
  if (page.sub_groups && page.sub_groups.length > 0) {
    const subGroupTopics = page.sub_groups.map((group) => {
      const caseTopics = (group.test_cases ?? []).map(buildCaseTopic)
      return Topic(group.name).children(caseTopics)
    })
    const directCases = (page.test_cases ?? []).map(buildCaseTopic)
    return Topic(page.name).children([...subGroupTopics, ...directCases])
  }

  const caseTopics = (page.test_cases ?? []).map(buildCaseTopic)
  return Topic(page.name).children(caseTopics)
}

function buildModuleTopic(mod) {
  // 新格式：modules → pages → sub_groups → test_cases
  if (mod.pages && mod.pages.length > 0) {
    const pageTopics = mod.pages.map(buildPageTopic)
    return Topic(mod.name).children(pageTopics)
  }

  // 向后兼容旧格式：modules → sub_groups → test_cases
  if (mod.sub_groups && mod.sub_groups.length > 0) {
    const subGroupTopics = mod.sub_groups.map((group) => {
      const caseTopics = (group.test_cases ?? []).map(buildCaseTopic)
      return Topic(group.name).children(caseTopics)
    })
    return Topic(mod.name).children(subGroupTopics)
  }

  const caseTopics = (mod.test_cases ?? []).map(buildCaseTopic)
  return Topic(mod.name).children(caseTopics)
}

function buildXmind(data) {
  const { meta, modules, requirements } = data

  // Multi-requirement: each gets its own L1 node under a shared root
  if (requirements && requirements.length > 1) {
    const l1Topics = requirements.map((req) => {
      const moduleTopics = (req.modules ?? []).map(buildModuleTopic)
      const l1Topic = Topic(buildL1Title(req.meta)).children(moduleTopics)
      if (req.meta?.requirement_id) {
        l1Topic.labels([`(#${req.meta.requirement_id})`])
      }
      return l1Topic
    })
    return Workbook(RootTopic(buildRootTitle(meta)).children(l1Topics))
  }

  const moduleTopics = (modules ?? []).map(buildModuleTopic)
  const l1Topic = Topic(buildL1Title(meta)).children(moduleTopics)

  if (meta?.requirement_id) {
    l1Topic.labels([`(#${meta.requirement_id})`])
  }

  return Workbook(
    RootTopic(buildRootTitle(meta)).children([
      l1Topic,
    ])
  )
}

async function buildWorkbookBuffer(data) {
  const wb = buildXmind(data)
  const rawBuffer = Buffer.from(await wb.archive())

  // Determine if the module has a trackerId (config-driven folding behavior)
  const config = loadConfig()
  const moduleKey = data.meta?.module_key || data.meta?.product
  const mod = moduleKey ? config.modules?.[moduleKey] : null
  const hasTrackerId = Boolean(mod?.trackerId)

  if (!hasTrackerId) {
    return rawBuffer
  }

  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(rawBuffer)
  const contentStr = await zip.file('content.json').async('string')
  const sheets = JSON.parse(contentStr)
  const root = sheets[0]?.rootTopic
  const l1Nodes = root?.children?.attached ?? []

  // Apply folded + labels to all L1 nodes (supports multi-requirement output)
  const reqs = data.requirements ?? [{ meta: data.meta }]
  l1Nodes.forEach((l1, idx) => {
    const reqMeta = reqs[idx]?.meta ?? data.meta
    l1.branch = 'folded'
    if (reqMeta?.requirement_id) {
      l1.labels = Array.from(new Set([...(l1.labels ?? []), `(#${reqMeta.requirement_id})`]))
    }
  })

  zip.file('content.json', JSON.stringify(sheets))
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

function mergeJsonFiles(inputPaths) {
  const all = inputPaths.map((p) => {
    const content = readFileSync(resolve(p), 'utf-8')
    return JSON.parse(content)
  })

  if (all.length === 1) return all[0]

  // Multiple inputs: preserve per-requirement meta for multi-L1 output
  return {
    meta: all[0].meta,
    modules: all.flatMap((d) => d.modules ?? []),
    requirements: all.map((d) => ({ meta: d.meta, modules: d.modules ?? [] })),
  }
}

function validateOutputPath(outputPath) {
  assertNewOutputPathMatchesContract('xmind', outputPath, {
    allowExistingTarget: true,
    reservedBasenames: [RESERVED_OUTPUT_NAME],
    reservedMessage:
      `${RESERVED_OUTPUT_NAME} 是保留输出文件名，仅供仓库根目录的最近输出符号链接使用，请改用其他 .xmind 文件名`,
  })
}


async function appendToExisting(data, outputPath) {
  const { default: JSZip } = await import('jszip')

  // 1. 生成新 workbook 的 buffer，直接解析提取 L1 节点 JSON（避免 writeLocalFile 的异步 bug）
  const newBuffer = await buildWorkbookBuffer(data)
  const tempZip = await JSZip.loadAsync(Buffer.from(newBuffer))
  const newContentStr = await tempZip.file('content.json').async('string')
  const newSheets = JSON.parse(newContentStr)
  const newL1Nodes = newSheets[0]?.rootTopic?.children?.attached ?? []

  // 2. 读取现有 .xmind
  const existingZip = await JSZip.loadAsync(readFileSync(resolve(outputPath)))
  const existingContentStr = await existingZip.file('content.json').async('string')
  const existingSheets = JSON.parse(existingContentStr)

  // 3. 查找同名 rootTopic（按 project_name 匹配）
  const targetSheet = existingSheets.find(
    (s) => s.rootTopic?.title === buildRootTitle(data.meta)
  )

  if (targetSheet) {
    if (!targetSheet.rootTopic.children) {
      targetSheet.rootTopic.children = { attached: [] }
    }
    if (!targetSheet.rootTopic.children.attached) {
      targetSheet.rootTopic.children.attached = []
    }
    targetSheet.rootTopic.children.attached.push(...newL1Nodes)
    console.log(
      `已追加 ${newL1Nodes.length} 个 L1 节点到 "${data.meta.project_name}" sheet`
    )
  } else {
    existingSheets.push(newSheets[0])
    console.log(`已添加新 sheet "${data.meta.project_name}" 到现有文件`)
  }

  // 4. 写回
  existingZip.file('content.json', JSON.stringify(existingSheets))
  const buffer = await existingZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  writeFileSync(resolve(outputPath), buffer)
}

async function replaceInExisting(data, outputPath) {
  const { default: JSZip } = await import('jszip')

  const l1Title = buildL1Title(data.meta)

  // 1. 生成新 workbook 的 buffer，直接解析提取新 L1 节点 JSON（避免 writeLocalFile 的异步 bug）
  const newBuffer = await buildWorkbookBuffer(data)
  const tempZip = await JSZip.loadAsync(Buffer.from(newBuffer))
  const newContentStr = await tempZip.file('content.json').async('string')
  const newSheets = JSON.parse(newContentStr)
  const newL1Node = newSheets[0]?.rootTopic?.children?.attached?.[0]

  if (!newL1Node) {
    throw new Error('无法从新 JSON 中提取 L1 节点')
  }

  // 2. 读取现有 .xmind
  const existingZip = await JSZip.loadAsync(readFileSync(resolve(outputPath)))
  const existingContentStr = await existingZip.file('content.json').async('string')
  const existingSheets = JSON.parse(existingContentStr)

  // 3. 查找同名 rootTopic（按 project_name 匹配）
  const targetSheet = existingSheets.find(
    (s) => s.rootTopic?.title === buildRootTitle(data.meta)
  )

  if (targetSheet) {
    const children = targetSheet.rootTopic.children?.attached ?? []
    const existingIdx = children.findIndex((n) => n.title === l1Title)
    if (existingIdx >= 0) {
      // 找到同名 L1，替换其 children
      children[existingIdx] = newL1Node
      console.log(`已替换 L1 节点 "${l1Title}" 的内容`)
    } else {
      // 未找到同名 L1，追加
      if (!targetSheet.rootTopic.children) {
        targetSheet.rootTopic.children = { attached: [] }
      }
      if (!targetSheet.rootTopic.children.attached) {
        targetSheet.rootTopic.children.attached = []
      }
      targetSheet.rootTopic.children.attached.push(newL1Node)
      console.log(`未找到同名 L1 "${l1Title}"，已追加新节点`)
    }
  } else {
    existingSheets.push(newSheets[0])
    console.log(`已添加新 sheet "${data.meta.project_name}" 到现有文件`)
  }

  // 4. 写回
  existingZip.file('content.json', JSON.stringify(existingSheets))
  const buffer = await existingZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  writeFileSync(resolve(outputPath), buffer)
}

// --- Exports (for unit testing) ---
export { buildRootTitle, buildL1Title }

// --- CLI Entry Guard ---
function isDirectExecution() {
  if (!process.argv[1]) return false
  return resolve(process.argv[1]) === fileURLToPath(import.meta.url)
}

// --- Main ---
if (isDirectExecution()) {
  const args = process.argv.slice(2)
  const appendMode = args.includes('--append')
  const replaceMode = args.includes('--replace')
  const filteredArgs = args.filter((a) => a !== '--append' && a !== '--replace')

  if (filteredArgs.length < 2) {
    console.error('Usage:')
    console.error('  node json-to-xmind.mjs <input.json> <output.xmind>')
    console.error('  node json-to-xmind.mjs <input1.json> <input2.json> <output.xmind>')
    console.error('  node json-to-xmind.mjs --append <input.json> <existing.xmind>')
    console.error('  node json-to-xmind.mjs --replace <input.json> <existing.xmind>')
    process.exit(1)
  }

  const outputPath = filteredArgs[filteredArgs.length - 1]
  const inputPaths = filteredArgs.slice(0, filteredArgs.length - 1)

  try {
    validateOutputPath(outputPath)
    const data = mergeJsonFiles(inputPaths)

    const structErrors = validateStructure(data)
    if (structErrors.length > 0) {
      console.error('❌ JSON 结构校验失败：')
      structErrors.forEach(e => console.error(`  - ${e}`))
      process.exit(1)
    }

    const validation = validateJson(data)

    if (replaceMode && existsSync(resolve(outputPath))) {
      await replaceInExisting(data, outputPath)
      console.log(`XMind 文件已更新（替换模式）: ${resolve(outputPath)}`)
    } else if (appendMode && existsSync(resolve(outputPath))) {
      await appendToExisting(data, outputPath)
      console.log(`XMind 文件已更新（追加模式）: ${resolve(outputPath)}`)
    } else {
      const buf = await buildWorkbookBuffer(data)
      writeFileSync(resolve(outputPath), Buffer.from(buf))
      console.log(`XMind 文件已生成: ${resolve(outputPath)}`)
    }
  } catch (err) {
    console.error('Error generating XMind file:', err.message)
    process.exit(1)
  }
}
