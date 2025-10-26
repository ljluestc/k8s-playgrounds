import { expect, test } from '@playwright/test'

test('site-wide link crawler returns 2xx for internal links', async ({ page, request }) => {
  await page.goto('/')

  const anchors = await page.locator('a').all()
  const hrefs = new Set<string>()
  for (const a of anchors) {
    const href = await a.getAttribute('href')
    if (!href)
      continue
    if (href.startsWith('http') && !href.startsWith('https://ljluestc.github.io'))
      continue
    const resolved = href.startsWith('http') ? href : new URL(href, 'https://ljluestc.github.io').toString()
    hrefs.add(resolved)
  }

  for (const url of hrefs) {
    const res = await request.get(url)
    expect(res.ok()).toBe(true)
  }
})
