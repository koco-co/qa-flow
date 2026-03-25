/**
 * json-to-xmind.mjs
 * 将中间 JSON 格式转换为 .xmind 文件
 *
 * 用法:
 *   node json-to-xmind.mjs <input.json> <output.xmind>
 *   node json-to-xmind.mjs <input1.json> <input2.json> <output.xmind>
 *   node json-to-xmind.mjs --append <input.json> <existing.xmind>
 *
 * --append 模式:
 *   当目标 .xmind 文件已存在时，将新的 L1 节点追加进去而非覆盖。
 *   同名 rootTopic（project_name 相同）：追加新 L1 到已有 root。
 *   不同 rootTopic：作为新 sheet 添加。
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

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'
import { resolve } from 'path'
import { Topic, RootTopic, Marker, Workbook, writeLocalFile } from 'xmind-generator'

const PRIORITY_MAP = {
  P0: Marker.Priority.p1,
  P1: Marker.Priority.p2,
  P2: Marker.Priority.p3,
}

function buildCaseTopic(testCase) {
  const marker = PRIORITY_MAP[testCase.priority] ?? Marker.Priority.p3
  const steps = (testCase.steps ?? []).map(({ step, expected }) =>
    Topic(step).children([Topic(expected)])
  )

  const caseTopic = Topic(testCase.title).markers([marker])

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

async function appendToExisting(data, outputPath) {
  const { default: JSZip } = await import('jszip')

  // 1. 生成新 workbook 到临时文件，提取 L1 节点 JSON
  const tempPath = resolve(outputPath) + '.tmp_append'
  writeLocalFile(buildXmind(data), tempPath)

  const tempZip = await JSZip.loadAsync(readFileSync(tempPath))
  const newContentStr = await tempZip.file('content.json').async('string')
  const newSheets = JSON.parse(newContentStr)
  const newL1Nodes = newSheets[0]?.rootTopic?.children?.attached ?? []
  unlinkSync(tempPath)

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

// --- Main ---
const args = process.argv.slice(2)
const appendMode = args.includes('--append')
const filteredArgs = args.filter((a) => a !== '--append')

if (filteredArgs.length < 2) {
  console.error('Usage:')
  console.error('  node json-to-xmind.mjs <input.json> <output.xmind>')
  console.error('  node json-to-xmind.mjs <input1.json> <input2.json> <output.xmind>')
  console.error('  node json-to-xmind.mjs --append <input.json> <existing.xmind>')
  process.exit(1)
}

const outputPath = filteredArgs[filteredArgs.length - 1]
const inputPaths = filteredArgs.slice(0, filteredArgs.length - 1)

try {
  const data = mergeJsonFiles(inputPaths)

  if (appendMode && existsSync(resolve(outputPath))) {
    appendToExisting(data, outputPath)
      .then(() => console.log(`XMind 文件已更新（追加模式）: ${resolve(outputPath)}`))
      .catch((err) => {
        console.error('追加失败:', err.message)
        process.exit(1)
      })
  } else {
    writeLocalFile(buildXmind(data), resolve(outputPath))
    console.log(`XMind 文件已生成: ${resolve(outputPath)}`)
  }
} catch (err) {
  console.error('Error generating XMind file:', err.message)
  process.exit(1)
}
