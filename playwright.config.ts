import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/playwright',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    baseURL: 'https://ljluestc.github.io',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
