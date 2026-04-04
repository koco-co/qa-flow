// session-login.mjs
// Session 初始化脚本：优先使用 Cookie 注入，无 Cookie 时降级为 UI 登录。
import { chromium } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { loadQaEnv } from './load-qa-env.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '../../../../')
const SESSION_PATH = resolve(projectRoot, '.auth/session.json')

/**
 * 将 cookie 字符串（"k=v; k2=v2"）解析为 Playwright storageState 的 cookies 数组。
 * @param {string} cookieStr
 * @param {string} domain
 * @returns {object[]}
 */
export function parseCookieString(cookieStr, domain) {
  return cookieStr
    .split(';')
    .map(pair => {
      const eqIdx = pair.indexOf('=')
      if (eqIdx === -1) return null
      const name = pair.slice(0, eqIdx).trim()
      const value = pair.slice(eqIdx + 1).trim()
      return { name, value, domain, path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' }
    })
    .filter(Boolean)
    .filter(c => c.name)
}

/**
 * 策略一：Cookie 注入（无需打开浏览器，毫秒级完成）
 * @param {{ cookie: string, domain: string }} params
 */
export function loginWithCookie({ cookie, domain }) {
  if (!cookie) throw new Error('cookie 为空')
  const cookies = parseCookieString(cookie, domain)
  const storageState = { cookies, origins: [] }
  mkdirSync(resolve(projectRoot, '.auth'), { recursive: true })
  writeFileSync(SESSION_PATH, JSON.stringify(storageState, null, 2), 'utf8')
  console.log(`✅ Cookie 注入完成，Session 已保存到 ${SESSION_PATH}（共 ${cookies.length} 个 cookie）`)
}

/**
 * 策略二：UI 登录（兜底，当 Cookie 未配置时使用）
 * @param {{ baseUrl: string, username: string, password: string }} params
 */
export async function loginWithBrowser({ baseUrl, username, password }) {
  if (!baseUrl || !username || !password) {
    throw new Error('缺少 baseUrl / username / password')
  }
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()
  try {
    console.log(`正在导航到登录页：${baseUrl}`)
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 })

    const userSels = ['input[name="username"]', 'input[type="text"]', '#username']
    const passSels = ['input[name="password"]', 'input[type="password"]', '#password']
    const submitSels = ['button[type="submit"]', 'button:has-text("登录")', '.login-button']

    let userFound = false
    for (const sel of userSels) {
      if (await page.locator(sel).count() > 0) {
        await page.locator(sel).first().fill(username)
        userFound = true
        break
      }
    }

    if (userFound) {
      for (const sel of passSels) {
        if (await page.locator(sel).count() > 0) {
          await page.locator(sel).first().fill(password)
          break
        }
      }
      for (const sel of submitSels) {
        if (await page.locator(sel).count() > 0) {
          await page.locator(sel).first().click()
          break
        }
      }
      await page.waitForLoadState('networkidle', { timeout: 15000 })
    } else {
      console.log('未找到标准登录表单，请手动完成登录后按 Enter 继续...')
      await new Promise(r => process.stdin.once('data', r))
    }

    mkdirSync(resolve(projectRoot, '.auth'), { recursive: true })
    await context.storageState({ path: SESSION_PATH })
    console.log(`✅ UI 登录完成，Session 已保存到 ${SESSION_PATH}`)
  } finally {
    await browser.close()
  }
}

// CLI 接口
if (process.argv[1].endsWith('session-login.mjs')) {
  const isDryRun = process.argv.includes('--dry-run')
  const cfg = loadQaEnv()

  if (isDryRun) {
    console.log('--dry-run: 当前环境配置：')
    console.log(`  activeEnv: ${cfg.activeEnv}`)
    console.log(`  baseUrl  : ${cfg.baseUrl}`)
    console.log(`  username : ${cfg.username}`)
    console.log(`  cookie   : ${cfg.cookie ? `(已配置, ${cfg.cookie.length} chars)` : '(未配置，将使用 UI 登录)'}`)
    process.exit(0)
  }

  try {
    if (cfg.cookie) {
      loginWithCookie({ cookie: cfg.cookie, domain: cfg.domain })
    } else {
      await loginWithBrowser({ baseUrl: cfg.baseUrl, username: cfg.username, password: cfg.password })
    }
  } catch (error) {
    console.error('Session 初始化失败:', error.message)
    process.exit(1)
  }
}
