#!/usr/bin/env node
/**
 * render-report.mjs — 将 HTML 模板 + JSON 数据合并为最终报告
 *
 * 用法: node render-report.mjs <template.html> <data.json> [output.html]
 *   若不提供 output.html，输出到 stdout
 *
 * 模板语法:
 *   {{KEY}}          文本占位符（自动 HTML 转义）
 *   {{{KEY}}}        HTML 片段占位符（原样插入，不转义）
 *   {{#IF KEY}}...{{/IF KEY}}      条件块，KEY 为真值时渲染
 *   {{#EACH KEY}}...{{/EACH KEY}}  重复块，KEY 为数组时逐项渲染
 *
 * severity 字段自动映射颜色（用于后端 Bug 报告）:
 *   P0 → gradient "#c0392b, #96281b", badge "#c0392b", label "P0 致命"
 *   P1 → gradient "#e67e22, #ca6f1e", badge "#e67e22", label "P1 严重"
 *   P2 → gradient "#2980b9, #1a6fa0", badge "#2980b9", label "P2 一般"
 *   P3 → gradient "#27ae60, #1e8449", badge "#27ae60", label "P3 轻微"
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const SEVERITY_MAP = {
  P0: { gradient: '#c0392b, #96281b', badge: '#c0392b', label: 'P0 致命' },
  P1: { gradient: '#e67e22, #ca6f1e', badge: '#e67e22', label: 'P1 严重' },
  P2: { gradient: '#2980b9, #1a6fa0', badge: '#2980b9', label: 'P2 一般' },
  P3: { gradient: '#27ae60, #1e8449', badge: '#27ae60', label: 'P3 轻微' },
}

function escapeHtml(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderTemplate(template, data) {
  let result = template

  // 注入 severity 颜色字段
  const severity = String(data.severity || 'P1').toUpperCase()
  const severityColors = SEVERITY_MAP[severity] || SEVERITY_MAP.P1
  const enriched = {
    ...data,
    SEVERITY_GRADIENT: severityColors.gradient,
    SEVERITY_BADGE_BG: severityColors.badge,
    SEVERITY_LABEL: severityColors.label,
  }

  // 处理条件块 {{#IF KEY}}...{{/IF KEY}}
  result = result.replace(/\{\{#IF ([A-Z0-9_]+)\}\}([\s\S]*?)\{\{\/IF \1\}\}/g, (_, key, inner) => {
    const val = enriched[key]
    return (val && (Array.isArray(val) ? val.length > 0 : true)) ? inner : ''
  })

  // 处理重复块 {{#EACH KEY}}...{{/EACH KEY}}
  result = result.replace(/\{\{#EACH ([A-Z0-9_]+)\}\}([\s\S]*?)\{\{\/EACH \1\}\}/g, (_, key, inner) => {
    const arr = enriched[key]
    if (!Array.isArray(arr)) return ''
    return arr.map(item => renderTemplate(inner, { ...enriched, ...item })).join('\n')
  })

  // 处理 HTML 片段占位符 {{{KEY}}} (三括号，先于双括号处理)
  result = result.replace(/\{\{\{([A-Z0-9_]+)\}\}\}/g, (match, key) => {
    const val = enriched[key]
    if (val == null) {
      process.stderr.write(`[warn] unfilled HTML placeholder: {{{${key}}}}\n`)
      return match
    }
    return String(val)
  })

  // 处理文本占位符 {{KEY}} (双括号)
  result = result.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key) => {
    const val = enriched[key]
    if (val == null) {
      process.stderr.write(`[warn] unfilled text placeholder: {{${key}}}\n`)
      return match
    }
    return escapeHtml(val)
  })

  return result
}

function main() {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    process.stderr.write('Usage: node render-report.mjs <template.html> <data.json> [output.html]\n')
    process.exit(1)
  }

  const [templatePath, dataPath, outputPath] = args
  const template = readFileSync(resolve(templatePath), 'utf8')
  const data = JSON.parse(readFileSync(resolve(dataPath), 'utf8'))

  const rendered = renderTemplate(template, data)

  if (outputPath) {
    writeFileSync(resolve(outputPath), rendered, 'utf8')
    process.stderr.write(`[ok] report written to ${outputPath}\n`)
  } else {
    process.stdout.write(rendered)
  }
}

main()
