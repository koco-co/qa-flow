/**
 * prompts-generalization.test.mjs
 *
 * Smoke test: verifies that all prompt files and skill files have been
 * generalized — no hardcoded Doris/Hive/SparkThrift references outside
 * conditional guard blocks, and no hardcoded DTStack or repoBranchMapping
 * references outside conditional sections.
 *
 * Run: node --test .planning/tests/prompts-generalization.test.mjs
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(__dirname, '../..')

/**
 * Recursively collect all .md files under a directory.
 */
function collectMdFiles(dir) {
  const files = []
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return files
  }
  for (const entry of entries) {
    const full = join(dir, entry)
    let stat
    try {
      stat = statSync(full)
    } catch {
      continue
    }
    if (stat.isDirectory()) {
      files.push(...collectMdFiles(full))
    } else if (entry.endsWith('.md')) {
      files.push(full)
    }
  }
  return files
}

/**
 * Returns true if a line is inside a conditional guard block.
 * A conditional guard block is introduced by lines containing:
 *   - "仅在 config" or "仅当 config"
 *   - "当 config.repos 非空"
 *   - "（需要 config"
 *   - "config.repos 非空时启用"
 *   - "conditional" (English guard marker)
 *   - "仅在模块类型为 DTStack 时"
 *   - "DTStack only" or "DTStack 专属"
 *   - "DTStack 用例" (in test-case sections describing DTStack-specific behaviors)
 *   - HTML comment guard: <!-- ... DTStack ... -->
 *
 * This is a heuristic, not a full parser. For this project's files, it is sufficient.
 */
function isInsideConditionalBlock(lines, lineIndex) {
  // Look backward for a guard marker within the last 20 lines
  const searchStart = Math.max(0, lineIndex - 20)
  for (let i = lineIndex - 1; i >= searchStart; i--) {
    const line = lines[i]
    if (
      line.includes('仅在 config') ||
      line.includes('仅当 config') ||
      line.includes('当 config.repos 非空') ||
      line.includes('config.repos 非空时启用') ||
      line.includes('仅在模块类型为 DTStack 时') ||
      line.includes('DTStack only') ||
      line.includes('DTStack 专属: 是') ||
      line.includes('DTStack 专属：是') ||
      line.includes('仅在 config.json') ||
      line.includes('conditional') ||
      line.match(/<!--.*DTStack.*-->/) ||
      line.includes('源码优先规则（需要 config.repos') ||
      line.includes('以下规则仅在 config.json')
    ) {
      return true
    }
    // A new section header (## or ###) without a guard resets the context
    if (line.match(/^#{1,4} /) && i < lineIndex - 1) {
      break
    }
  }
  return false
}

// ────────────────────────────────────────────────────────────────────────────
// Test: No "Doris" / "Hive" / "SparkThrift" outside conditional blocks in prompts
// ────────────────────────────────────────────────────────────────────────────

const PROMPTS_DIR = join(ROOT, '.claude/skills/test-case-generator/prompts')
const SKILL_RULES_DIR = join(ROOT, '.claude/skills/test-case-generator/rules')
const SKILL_REFS_DIR = join(ROOT, '.claude/skills/test-case-generator/references')
const XMIND_RULES_DIR = join(ROOT, '.claude/skills/xmind-converter/rules')
const USING_QA_PROMPTS_DIR = join(ROOT, '.claude/skills/using-qa-flow/prompts')

const promptFiles = [
  ...collectMdFiles(PROMPTS_DIR),
  ...collectMdFiles(SKILL_RULES_DIR),
  ...collectMdFiles(SKILL_REFS_DIR),
]

const DATASOURCE_TERMS = ['\\bDoris\\b', '\\bHive\\b', '\\bSparkThrift\\b']

test('No hardcoded Doris/Hive/SparkThrift in test-case-generator prompts and rules outside conditional blocks', () => {
  const violations = []

  for (const file of promptFiles) {
    const content = readFileSync(file, 'utf8')
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      for (const term of DATASOURCE_TERMS) {
        if (new RegExp(term).test(line)) {
          if (!isInsideConditionalBlock(lines, i)) {
            violations.push(`${file.replace(ROOT + '/', '')}:${i + 1}: "${line.trim()}"`)
          }
        }
      }
    }
  }

  if (violations.length > 0) {
    assert.fail(
      `Found ${violations.length} unconditioned datasource references:\n` +
        violations.map((v) => `  - ${v}`).join('\n')
    )
  }
})

// ────────────────────────────────────────────────────────────────────────────
// Test: No "repoBranchMapping" in skill prompts, rules, or SKILL.md
// ────────────────────────────────────────────────────────────────────────────

const SKILL_MD = join(ROOT, '.claude/skills/test-case-generator/SKILL.md')
const SOURCE_REPO_SETUP = join(ROOT, '.claude/skills/using-qa-flow/prompts/source-repo-setup.md')

const repoBranchMappingFiles = [
  ...promptFiles,
  SKILL_MD,
  SOURCE_REPO_SETUP,
  ...collectMdFiles(XMIND_RULES_DIR),
  ...collectMdFiles(USING_QA_PROMPTS_DIR),
]

test('No "repoBranchMapping" in skill files — should use "branchMapping"', () => {
  const violations = []

  for (const file of repoBranchMappingFiles) {
    let content
    try {
      content = readFileSync(file, 'utf8')
    } catch {
      continue
    }
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('repoBranchMapping')) {
        violations.push(`${file.replace(ROOT + '/', '')}:${i + 1}: "${lines[i].trim()}"`)
      }
    }
  }

  if (violations.length > 0) {
    assert.fail(
      `Found ${violations.length} "repoBranchMapping" occurrences (should use "branchMapping"):\n` +
        violations.map((v) => `  - ${v}`).join('\n')
    )
  }
})

// ────────────────────────────────────────────────────────────────────────────
// Test: No "zentaoId" in xmind-converter rules
// ────────────────────────────────────────────────────────────────────────────

test('No "zentaoId" in xmind-converter/rules — should use "trackerId"', () => {
  const xmindRuleFiles = collectMdFiles(XMIND_RULES_DIR)
  const violations = []

  for (const file of xmindRuleFiles) {
    let content
    try {
      content = readFileSync(file, 'utf8')
    } catch {
      continue
    }
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('zentaoId')) {
        violations.push(`${file.replace(ROOT + '/', '')}:${i + 1}: "${lines[i].trim()}"`)
      }
    }
  }

  if (violations.length > 0) {
    assert.fail(
      `Found ${violations.length} "zentaoId" occurrences (should use "trackerId"):\n` +
        violations.map((v) => `  - ${v}`).join('\n')
    )
  }
})

// ────────────────────────────────────────────────────────────────────────────
// Test: CLAUDE.md contains conditional guard (config.repos) and no DTStack
// ────────────────────────────────────────────────────────────────────────────

test('CLAUDE.md uses conditional guard for repo-dependent behavior (contains "config.repos")', () => {
  const claudeMd = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8')
  assert.ok(
    claudeMd.includes('config.repos'),
    'CLAUDE.md must contain "config.repos" conditional guard'
  )
})

test('CLAUDE.md does not contain hardcoded "DTStack" references outside conditional sections', () => {
  const claudeMd = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8')
  const lines = claudeMd.split('\n')
  const violations = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/\bDTStack\b/.test(line)) {
      if (!isInsideConditionalBlock(lines, i)) {
        violations.push(`CLAUDE.md:${i + 1}: "${line.trim()}"`)
      }
    }
  }

  if (violations.length > 0) {
    assert.fail(
      `Found ${violations.length} unconditioned "DTStack" references in CLAUDE.md:\n` +
        violations.map((v) => `  - ${v}`).join('\n')
    )
  }
})

test('CLAUDE.md does not contain hardcoded "dt-insight-studio-front" reference', () => {
  const claudeMd = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8')
  assert.ok(
    !claudeMd.includes('dt-insight-studio-front'),
    'CLAUDE.md must not hardcode "dt-insight-studio-front"'
  )
})

test('step-source-sync.md contains "branchMapping" (not "repoBranchMapping")', () => {
  const file = join(ROOT, '.claude/skills/test-case-generator/prompts/step-source-sync.md')
  const content = readFileSync(file, 'utf8')
  assert.ok(content.includes('branchMapping'), 'step-source-sync.md must reference "branchMapping"')
  assert.ok(
    !content.includes('repoBranchMapping'),
    'step-source-sync.md must not contain "repoBranchMapping"'
  )
})

test('elicitation-dimensions.md contains "branchMapping" (not "repoBranchMapping")', () => {
  const file = join(
    ROOT,
    '.claude/skills/test-case-generator/references/elicitation-dimensions.md'
  )
  const content = readFileSync(file, 'utf8')
  assert.ok(
    content.includes('branchMapping'),
    'elicitation-dimensions.md must reference "branchMapping"'
  )
  assert.ok(
    !content.includes('repoBranchMapping'),
    'elicitation-dimensions.md must not contain "repoBranchMapping"'
  )
})
