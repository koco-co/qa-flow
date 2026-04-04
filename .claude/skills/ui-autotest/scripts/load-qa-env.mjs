// load-qa-env.mjs
// 读取 .env 中的 QA_ACTIVE_ENV，返回对应环境的完整配置。
// 约定：每个环境的变量以 QA_*_{ENV_KEY} 格式命名，ENV_KEY 为大写。
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '../../../../')

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {}
  const lines = readFileSync(filePath, 'utf8').split('\n')
  return lines.reduce((acc, line) => {
    const match = line.match(/^([^#=\s][^=]*)=(.*)$/)
    if (match) acc[match[1].trim()] = match[2].trim()
    return acc
  }, {})
}

/**
 * 加载当前活跃环境的 QA 配置。
 * 读取顺序：process.env > .env 文件。
 *
 * @returns {{ activeEnv: string, baseUrl: string, username: string, password: string, domain: string, cookie: string }}
 */
export function loadQaEnv() {
  const fileEnv = parseEnvFile(resolve(projectRoot, '.env'))
  const env = { ...fileEnv, ...process.env }

  const activeEnv = (env.QA_ACTIVE_ENV || '').toUpperCase()
  if (!activeEnv) throw new Error('未设置 QA_ACTIVE_ENV，请在 .env 中指定当前活跃环境（如 QA_ACTIVE_ENV=ltqc）')

  const baseUrl = env[`QA_BASE_URL_${activeEnv}`]
  const username = env[`QA_USERNAME_${activeEnv}`]
  const password = env[`QA_PASSWORD_${activeEnv}`]
  const domain = env[`QA_DOMAIN_${activeEnv}`]
  const cookie = env[`QA_COOKIE_${activeEnv}`] || ''

  if (!baseUrl) throw new Error(`未找到环境 "${activeEnv}" 的 QA_BASE_URL_${activeEnv} 配置`)

  return { activeEnv: activeEnv.toLowerCase(), baseUrl, username, password, domain, cookie }
}

// CLI：打印当前环境配置（密码和 cookie 脱敏）
if (process.argv[1].endsWith('load-qa-env.mjs')) {
  const cfg = loadQaEnv()
  console.log('当前活跃环境:', cfg.activeEnv)
  console.log('  baseUrl :', cfg.baseUrl)
  console.log('  username:', cfg.username)
  console.log('  password:', cfg.password ? '(已配置)' : '(未配置)')
  console.log('  domain  :', cfg.domain)
  console.log('  cookie  :', cfg.cookie ? `(已配置, ${cfg.cookie.length} chars)` : '(未配置)')
}
