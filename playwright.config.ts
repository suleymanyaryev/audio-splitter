import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

const isCi = Boolean(process.env.CI)
const DEV_PORT = 5173
const PREVIEW_PORT = 4173
const DEV_URL = `http://localhost:${DEV_PORT}`
const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}`

// See https://playwright.dev/docs/test-configuration
const config = defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  expect: {
    // Maximum time `expect()` waits for a condition, as in `await expect(locator).toHaveText()`.
    timeout: 5000,
  },
  // Fail the build on CI if `test.only` was left in the source.
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 1 : undefined,
  reporter: 'html',
  use: {
    // Maximum time each action such as `click()` can take. 0 means no limit.
    actionTimeout: 0,
    // Collect a trace when retrying a failed test. See https://playwright.dev/docs/trace-viewer
    trace: 'on-first-retry',
    // Headless only on CI.
    headless: isCi,
  },
  /*
  The installed Google Chrome (`channel: 'chrome'`), the same browser the playwright-cli skill
  drives, so no Playwright browser build is ever downloaded. The export spec runs on the dev
  server; the offline spec on a production build, the only place the service worker is registered.
  */
  projects: [
    {
      name: 'chrome',
      testIgnore: 'offline.spec.ts',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', baseURL: DEV_URL },
    },
    {
      name: 'offline',
      testMatch: 'offline.spec.ts',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', baseURL: PREVIEW_URL },
    },
  ],
  // Playwright reuses a server that is already running locally.
  webServer: [
    { command: 'pnpm dev', port: DEV_PORT, reuseExistingServer: !isCi },
    {
      command: 'pnpm build-only && pnpm preview --strictPort',
      port: PREVIEW_PORT,
      reuseExistingServer: !isCi,
    },
  ],
})

export default config
