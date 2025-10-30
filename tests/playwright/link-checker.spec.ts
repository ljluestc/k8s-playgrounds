import { expect, test } from '@playwright/test'

const NOT_FOUND_PATTERNS = [
  'Page Not Found',
  'The page you\'re looking for doesn\'t exist',
  '404',
]

test('crawl internal links: fail on non-2xx and not-found content', async ({ request }, testInfo) => {
  const base = (testInfo.project.use as any).baseURL as string | undefined
  expect(base, 'project baseURL must be defined').toBeTruthy()
  const BASE = base!.replace(/\/$/, '')

  const toVisit: string[] = [`${BASE}/`]
  const visited = new Set<string>()
  const discovered = new Set<string>(toVisit)
  const errors: { url: string; status?: number; reason: string }[] = []

  while (toVisit.length) {
    const url = toVisit.shift()!
    if (visited.has(url))
      continue
    visited.add(url)

    const res = await request.get(url)
    if (!res.ok()) {
      errors.push({ url, status: res.status(), reason: 'non-2xx response' })
      continue
    }
    const html = await res.text()
    const lowered = html.toLowerCase()
    if (NOT_FOUND_PATTERNS.some(p => lowered.includes(p.toLowerCase()))) {
      errors.push({ url, reason: 'not-found content detected' })
      continue
    }

    // extract internal anchors (avoid assignment in condition per lint rules)
    const hrefRegex = /href\s*=\s*"([^"]+)"/gi
    for (let m = hrefRegex.exec(html); m !== null; m = hrefRegex.exec(html)) {
      const href = m[1]
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:'))
        continue
      let absolute: string
      if (href.startsWith('http')) {
        if (!href.startsWith(BASE))
          continue
        absolute = href
      }
      else if (href.startsWith('#')) {
        continue
      }
      else {
        absolute = new URL(href, url).toString()
      }
      if (!visited.has(absolute)) {
        if (!discovered.has(absolute))
          discovered.add(absolute)
        toVisit.push(absolute)
      }
    }
  }

  if (errors.length)
    console.error('Broken pages detected:', errors)

  expect(errors.length, 'no broken pages detected').toBe(0)
  expect(visited.size, '100% internal-link coverage').toBe(discovered.size)
})
