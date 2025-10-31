import { expect, test } from '@playwright/test'

const NOT_FOUND_PATTERNS = [
  'Page Not Found',
  'The page you\'re looking for doesn\'t exist',
  '404',
  'Not Found',
  '404 Error',
  'Page not found',
  'page not found',
]

// Helper function to detect "Page Not Found" errors
// ALL "Page Not Found" patterns count as errors - even with "don't worry" messages
// The presence of these patterns indicates an error page that needs to be fixed
function isNotFoundError(html: string): boolean {
  const lowered = html.toLowerCase()

  // Check for exact error patterns - all patterns indicate an error page
  for (const pattern of NOT_FOUND_PATTERNS) {
    if (lowered.includes(pattern.toLowerCase()))
      return true
  }

  // Also check for HTTP 404 status in meta tags or structured data
  if (lowered.includes('http 404') || lowered.includes('status 404'))
    return true

  // Check for common 404 page indicators
  const errorIndicators = [
    '404 not found',
    'page not found',
    'resource not found',
    'not found error',
  ]
  for (const indicator of errorIndicators) {
    if (lowered.includes(indicator))
      return true
  }

  return false
}

test('crawl internal links: fail on non-2xx and not-found content', async ({ request }, testInfo) => {
  const base = (testInfo.project.use as any).baseURL as string | undefined
  expect(base, 'project baseURL must be defined').toBeTruthy()
  const BASE = base!.replace(/\/$/, '')

  const toVisit: string[] = [`${BASE}/`]
  const visited = new Set<string>()
  const discovered = new Set<string>(toVisit)
  const errors: { url: string; status?: number; reason: string }[] = []
  const maxPages = 500 // Safety limit to prevent infinite loops on very large sites

  while (toVisit.length && visited.size < maxPages) {
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
    // Use comprehensive error detection function
    if (isNotFoundError(html)) {
      errors.push({ url, reason: 'not-found content detected (Page Not Found error)' })
      continue
    }

    // extract internal anchors (avoid assignment in condition per lint rules)
    const hrefRegex = /href\s*=\s*"([^"]+)"/gi
    for (let m = hrefRegex.exec(html); m !== null; m = hrefRegex.exec(html)) {
      const href = m[1]
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:'))
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
      // Only crawl same-origin links under BASE
      if (!absolute.startsWith(BASE))
        continue
      if (!visited.has(absolute)) {
        if (!discovered.has(absolute))
          discovered.add(absolute)
        toVisit.push(absolute)
      }
    }
  }

  if (errors.length)
    console.error('Broken pages detected:', errors)

  if (visited.size >= maxPages)
    console.warn(`Reached maxPages limit (${maxPages}). Some links may not have been visited.`)

  expect(errors.length, 'no broken pages detected - all "Page Not Found" errors must be fixed').toBe(0)
  expect(visited.size, '100% internal-link coverage required').toBe(discovered.size)
})
