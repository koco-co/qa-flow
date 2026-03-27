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
 * Root (project_name)
 *   └── L1 (【version】requirement_name)
 *        └── L2 (modules[].name)           -- 菜单/模块名
 *             └── L3 (pages[].name)         -- 页面名
 *                  └── [L4 (sub_groups[].name)] -- 功能子组(可选)
 *                       └── 用例标题 [marker=priority, note=precondition]
 *                            └── 步骤描述
 *                                 └── 预期结果
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, symlinkSync } from 'fs'
import { resolve, dirname, relative, basename } from 'path'
import { fileURLToPath } from 'url'
import { Topic, RootTopic, Marker, Workbook, writeLocalFile } from 'xmind-generator'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..')
const RESERVED_OUTPUT_NAME = 'latest-output.xmind'
const LATEST_OUTPUT_PATH = resolve(REPO_ROOT, 'latest-output.xmind')

const PRIORITY_MAP = {
  P0: Marker.Priority.p1,
  P1: Marker.Priority.p2,
  P2: Marker.Priority.p3,
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

  const caseTopic = Topic(testCase.title || '⚠️标题缺失').markers([marker])

  if (testCase.precondition) {
    caseTopic.note(testCase.precondition)
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
  const { meta, modules } = data

  const l1Title = meta.version
    ? `【${meta.version}】${meta.requirement_name}`
    : meta.requirement_name

  const moduleTopics = (modules ?? []).map(buildModuleTopic)

  return Workbook(
    RootTopic(meta.project_name).children([
      Topic(l1Title).children(moduleTopics),
    ])
  )
}

function mergeJsonFiles(inputPaths) {
  const all = inputPaths.map((p) => {
    const content = readFileSync(resolve(p), 'utf-8')
    return JSON.parse(content)
  })

  if (all.length === 1) return all[0]

  return {
    meta: all[0].meta,
    modules: all.flatMap((d) => d.modules ?? []),
  }
}

function validateOutputPath(outputPath) {
  if (basename(outputPath) === RESERVED_OUTPUT_NAME) {
    throw new Error(
      `${RESERVED_OUTPUT_NAME} 是保留输出文件名，仅供仓库根目录的最近输出符号链接使用，请改用其他 .xmind 文件名`
    )
  }
}

function refreshLatestOutput(outputPath) {
  const resolvedOutputPath = resolve(outputPath)
  if (resolvedOutputPath === LATEST_OUTPUT_PATH) return

  const linkTarget = relative(REPO_ROOT, resolvedOutputPath)

  try {
    unlinkSync(LATEST_OUTPUT_PATH)
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err
    }
  }

  symlinkSync(linkTarget, LATEST_OUTPUT_PATH)
}

async function appendToExisting(data, outputPath) {
  const { default: JSZip } = await import('jszip')

  // 1. 生成新 workbook 的 buffer，直接解析提取 L1 节点 JSON（避免 writeLocalFile 的异步 bug）
  const newWb = buildXmind(data)
  const newBuffer = await newWb.archive()
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
    (s) => s.rootTopic?.title === data.meta.project_name
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

  const l1Title = data.meta.version
    ? `【${data.meta.version}】${data.meta.requirement_name}`
    : data.meta.requirement_name

  // 1. 生成新 workbook 的 buffer，直接解析提取新 L1 节点 JSON（避免 writeLocalFile 的异步 bug）
  const newWb = buildXmind(data)
  const newBuffer = await newWb.archive()
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
    (s) => s.rootTopic?.title === data.meta.project_name
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

// --- Main ---
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
    refreshLatestOutput(outputPath)
    console.log(`XMind 文件已更新（替换模式）: ${resolve(outputPath)}`)
  } else if (appendMode && existsSync(resolve(outputPath))) {
    await appendToExisting(data, outputPath)
    refreshLatestOutput(outputPath)
    console.log(`XMind 文件已更新（追加模式）: ${resolve(outputPath)}`)
  } else {
    const wb = buildXmind(data)
    const buf = await wb.archive()
    writeFileSync(resolve(outputPath), Buffer.from(buf))
    refreshLatestOutput(outputPath)
    console.log(`XMind 文件已生成: ${resolve(outputPath)}`)
  }
} catch (err) {
  console.error('Error generating XMind file:', err.message)
  process.exit(1)
}
