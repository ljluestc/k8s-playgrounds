import { defineConfig, devices } from '@playwright/test'

const LOCAL = `http://127.0.0.1:${process.env.PLAYWRIGHT_STATIC_PORT || '4000'}`
const LJ_BASE = process.env.LJL_BASE_URL || LOCAL
const VISUALGO_BASE = process.env.VISUALGO_BASE_URL || `${LOCAL}/visualgo/`
const YAAPPINTRO_BASE = process.env.YAAPPINTRO_BASE_URL || `${LOCAL}/yaappintro/`

export default defineConfig({
  testDir: 'tests/playwright',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'node scripts/static-server.mjs',
    url: LOCAL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'site-ljluestc',
      use: { ...devices['Desktop Chrome'], baseURL: LJ_BASE },
    },
    {
      name: 'site-visualgo',
      use: { ...devices['Desktop Chrome'], baseURL: VISUALGO_BASE },
    },
    {
      name: 'site-yaappintro',
      use: { ...devices['Desktop Chrome'], baseURL: YAAPPINTRO_BASE },
    },
  ],
})
