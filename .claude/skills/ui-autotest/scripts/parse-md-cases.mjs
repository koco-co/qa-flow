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

  return {
    featureName,
    yyyymm,
    tasks: filteredTasks,
    totalCases: p0Count + p1Count + p2Count,
    p0Count,
    p1Count,
    p2Count,
  }
}

// CLI 接口
if (process.argv[1].endsWith('parse-md-cases.mjs')) {
  const filePath = process.argv[2]
  if (!filePath) { console.error('Usage: node parse-md-cases.mjs <md-file-path>'); process.exit(1) }
  const content = readFileSync(filePath, 'utf8')
  console.log(JSON.stringify(parseMdCases(content, filePath), null, 2))
}
