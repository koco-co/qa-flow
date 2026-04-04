import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    headless: false,
    storageState: '.auth/session.json',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    baseURL: process.env.QA_BASE_URL,
  },
  reporter: [
    ['html', { outputFolder: 'reports/e2e/playwright-html', open: 'never' }],
    ['list'],
  ],
  workers: 1,
})
