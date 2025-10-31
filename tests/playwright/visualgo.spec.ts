import { expect, test } from '@playwright/test'

test.describe('Visualgo pages', () => {
  test('loads landing page, content visible, no console errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error')
        consoleErrors.push(msg.text())
    })

    await page.goto('/visualgo/')

    await expect(page).toHaveTitle(/Visualgo/i)
    await expect(page.getByRole('heading', { level: 1, name: /Visualgo/i })).toBeVisible()
    await expect(page.getByText('Visualgo landing page.')).toBeVisible()

    await expect(page.getByRole('navigation', { name: 'Local' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Categories' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tags' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Archive 2025/ })).toBeVisible()

    expect(consoleErrors, `no console errors expected, got: ${consoleErrors.join('\n')}`).toHaveLength(0)
  })
})
