import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

const isCi = Boolean(process.env.CI)

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
    // Base URL for actions like `await page.goto('/')`.
    baseURL: isCi ? 'http://localhost:4173' : 'http://localhost:5173',
    // Collect a trace when retrying a failed test. See https://playwright.dev/docs/trace-viewer
    trace: 'on-first-retry',
    // Headless only on CI.
    headless: isCi,
  },
  // The installed Google Chrome (`channel: 'chrome'`), the same browser the playwright-cli skill
  // drives, so no Playwright browser build is ever downloaded.
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
  // The dev server gives a faster local loop; CI tests the production preview build.
  // Playwright reuses an already running local dev server.
  webServer: {
    command: isCi ? 'pnpm preview' : 'pnpm dev',
    port: isCi ? 4173 : 5173,
    reuseExistingServer: !isCi,
  },
})

export default config
