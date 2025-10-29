import { defineConfig, devices } from '@playwright/test'

const LJ_BASE = process.env.LJL_BASE_URL || 'https://ljluestc.github.io'
const VISUALGO_BASE = process.env.VISUALGO_BASE_URL || `${LJ_BASE.replace(/\/$/, '')}/visualgo/`
const YAAPPINTRO_BASE = process.env.YAAPPINTRO_BASE_URL || `${LJ_BASE.replace(/\/$/, '')}/yaappintro/`

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
