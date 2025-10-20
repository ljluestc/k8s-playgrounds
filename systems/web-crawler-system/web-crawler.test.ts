import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CrawlConfig } from './web-crawler'
import { WebCrawler } from './web-crawler'

// Mock fetch for testing
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

describe('WebCrawler', () => {
  let crawler: WebCrawler

  beforeEach(() => {
    crawler = new WebCrawler()
    vi.clearAllMocks()
  })

  afterEach(() => {
    crawler.destroy()
  })

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      expect(crawler).toBeDefined()
      expect(crawler.isRunning()).toBe(false)
    })

    it('should initialize with custom config', () => {
      const config: Partial<CrawlConfig> = {
        maxDepth: 5,
        maxPages: 50,
        delay: 500,
        timeout: 5000,
        userAgent: 'CustomBot/1.0',
        followRedirects: false,
        respectRobotsTxt: false,
        allowedDomains: ['example.com'],
        blockedDomains: ['spam.com'],
        maxConcurrentRequests: 3,
        retryAttempts: 2,
        retryDelay: 1000,
      }

      const customCrawler = new WebCrawler(config)
      expect(customCrawler).toBeDefined()
      customCrawler.destroy()
    })
  })

  describe('Basic Crawling', () => {
    it('should crawl a single page', async () => {
      const mockHtml = `
        <html>
          <head>
            <title>Test Page</title>
            <meta name="description" content="A test page">
            <meta name="keywords" content="test, page, example">
          </head>
          <body>
            <h1>Hello World</h1>
            <p>This is a test page with some content.</p>
            <a href="https://example.com/page2">Link to page 2</a>
            <img src="https://example.com/image.jpg" alt="Test image">
          </body>
        </html>
      `

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([
          ['content-type', 'text/html; charset=utf-8'],
          ['content-length', '500'],
        ]),
        text: () => Promise.resolve(mockHtml),
      })

      const results = await crawler.crawl('https://example.com/page1')

      expect(results).toHaveLength(1)
      expect(results[0].url).toBe('https://example.com/page1')
      expect(results[0].status).toBe(200)
      expect(results[0].title).toBe('Test Page')
      expect(results[0].content).toContain('Hello World')
      expect(results[0].links).toContain('https://example.com/page2')
      expect(results[0].images).toContain('https://example.com/image.jpg')
      expect(results[0].metadata.description).toBe('A test page')
      expect(results[0].metadata.keywords).toEqual(['test', 'page', 'example'])
    })

    it('should handle crawling errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const results = await crawler.crawl('https://example.com/error')

      expect(results).toHaveLength(0)
      const stats = crawler.getStats()
      expect(stats.failedPages).toBe(1)
    })

    it('should respect maxPages limit', async () => {
      const crawler = new WebCrawler({ maxPages: 2 })

      const mockHtml = `
        <html>
          <head><title>Test Page</title></head>
          <body>
            <a href="https://example.com/page2">Link 1</a>
            <a href="https://example.com/page3">Link 2</a>
            <a href="https://example.com/page4">Link 3</a>
          </body>
        </html>
      `

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(mockHtml),
      })

      const results = await crawler.crawl('https://example.com/page1')

      expect(results.length).toBeLessThanOrEqual(2)
    })

    it('should respect maxDepth limit', async () => {
      const crawler = new WebCrawler({ maxDepth: 1 })

      const mockHtml = `
        <html>
          <head><title>Test Page</title></head>
          <body>
            <a href="https://example.com/page2">Link 1</a>
            <a href="https://example.com/page3">Link 2</a>
          </body>
        </html>
      `

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(mockHtml),
      })

      const results = await crawler.crawl('https://example.com/page1')

      // Should only crawl the initial page due to depth limit
      expect(results.length).toBe(1)
    })
  })

  describe('Content Extraction', () => {
    it('should extract title correctly', async () => {
      const mockHtml = '<html><head><title>Test Title</title></head><body></body></html>'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(mockHtml),
      })

      const results = await crawler.crawl('https://example.com')
      expect(results[0].title).toBe('Test Title')
    })

    it('should extract text content correctly', async () => {
      const mockHtml = `
        <html>
          <head><title>Test</title></head>
          <body>
            <h1>Main Title</h1>
            <p>This is a paragraph with <strong>bold text</strong>.</p>
            <script>console.log('This should be removed');</script>
            <style>body { color: red; }</style>
          </body>
        </html>
      `

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(mockHtml),
      })

      const results = await crawler.crawl('https://example.com')
      const content = results[0].content

      expect(content).toContain('Main Title')
      expect(content).toContain('This is a paragraph with bold text')
      expect(content).not.toContain('console.log')
      expect(content).not.toContain('body { color: red; }')
    })

    it('should extract links correctly', async () => {
      const mockHtml = `
        <html>
          <head><title>Test</title></head>
          <body>
            <a href="/relative-link">Relative Link</a>
            <a href="https://example.com/absolute-link">Absolute Link</a>
            <a href="mailto:test@example.com">Email Link</a>
            <a href="tel:+1234567890">Phone Link</a>
          </body>
        </html>
      `

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(mockHtml),
      })

      const results = await crawler.crawl('https://example.com')
      const links = results[0].links

      expect(links).toContain('https://example.com/relative-link')
      expect(links).toContain('https://example.com/absolute-link')
      expect(links).not.toContain('mailto:test@example.com')
      expect(links).not.toContain('tel:+1234567890')
    })

    it('should extract images correctly', async () => {
      const mockHtml = `
        <html>
          <head><title>Test</title></head>
          <body>
            <img src="/relative-image.jpg" alt="Relative Image">
            <img src="https://example.com/absolute-image.jpg" alt="Absolute Image">
            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" alt="Data Image">
          </body>
        </html>
      `

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(mockHtml),
      })

      const results = await crawler.crawl('https://example.com')
      const images = results[0].images

      expect(images).toContain('https://example.com/relative-image.jpg')
      expect(images).toContain('https://example.com/absolute-image.jpg')
      expect(images).not.toContain('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
    })

    it('should extract metadata correctly', async () => {
      const mockHtml = `
        <html lang="en">
          <head>
            <title>Test Page</title>
            <meta name="description" content="A test page description">
            <meta name="keywords" content="test, page, example, metadata">
            <meta name="author" content="Test Author">
            <meta property="article:published_time" content="2023-01-01T00:00:00Z">
            <meta http-equiv="last-modified" content="2023-01-02T00:00:00Z">
          </head>
          <body></body>
        </html>
      `

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([
          ['content-type', 'text/html; charset=utf-8'],
          ['content-length', '1000'],
        ]),
        text: () => Promise.resolve(mockHtml),
      })

      const results = await crawler.crawl('https://example.com')
      const metadata = results[0].metadata

      expect(metadata.description).toBe('A test page description')
      expect(metadata.keywords).toEqual(['test', 'page', 'example', 'metadata'])
      expect(metadata.author).toBe('Test Author')
      expect(metadata.publishedDate).toEqual(new Date('2023-01-01T00:00:00Z'))
      expect(metadata.lastModified).toEqual(new Date('2023-01-02T00:00:00Z'))
      expect(metadata.language).toBe('en')
      expect(metadata.contentType).toBe('text/html; charset=utf-8')
      expect(metadata.contentLength).toBe(1000)
    })
  })

  describe('Domain and Path Filtering', () => {
    it('should allow only specified domains', async () => {
      const crawler = new WebCrawler({
        allowedDomains: ['example.com'],
        maxPages: 5,
      })

      const mockHtml = `
        <html>
          <head><title>Test</title></head>
          <body>
            <a href="https://example.com/allowed">Allowed Link</a>
            <a href="https://other.com/blocked">Blocked Link</a>
          </body>
        </html>
      `

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(mockHtml),
      })

      const results = await crawler.crawl('https://example.com')

      // Should only crawl the initial page since other.com is blocked
      expect(results.length).toBe(1)
    })

    it('should block specified domains', async () => {
      const crawler = new WebCrawler({
        blockedDomains: ['spam.com'],
        maxPages: 5,
      })

      const mockHtml = `
        <html>
          <head><title>Test</title></head>
          <body>
            <a href="https://example.com/allowed">Allowed Link</a>
            <a href="https://spam.com/blocked">Blocked Link</a>
          </body>
        </html>
      `

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(mockHtml),
      })

      const results = await crawler.crawl('https://example.com')

      // Should only crawl the initial page since spam.com is blocked
      expect(results.length).toBe(1)
    })

    it('should allow only specified paths', async () => {
      const crawler = new WebCrawler({
        allowedPaths: ['/blog/', '/articles/'],
        maxPages: 5,
      })

      const mockHtml = `
        <html>
          <head><title>Test</title></head>
          <body>
            <a href="https://example.com/blog/post1">Allowed Link</a>
            <a href="https://example.com/other/page">Blocked Link</a>
          </body>
        </html>
      `

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(mockHtml),
      })

      const results = await crawler.crawl('https://example.com')

      // Should only crawl the initial page since /other/ is blocked
      expect(results.length).toBe(1)
    })

    it('should block specified paths', async () => {
      const crawler = new WebCrawler({
        blockedPaths: ['/admin/', '/private/'],
        maxPages: 5,
      })

      const mockHtml = `
        <html>
          <head><title>Test</title></head>
          <body>
            <a href="https://example.com/public/page">Allowed Link</a>
            <a href="https://example.com/admin/dashboard">Blocked Link</a>
          </body>
        </html>
      `

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(mockHtml),
      })

      const results = await crawler.crawl('https://example.com')

      // Should only crawl the initial page since /admin/ is blocked
      expect(results.length).toBe(1)
    })
  })

  describe('Robots.txt Handling', () => {
    it('should respect robots.txt when enabled', async () => {
      const crawler = new WebCrawler({
        respectRobotsTxt: true,
        maxPages: 5,
      })

      // Mock robots.txt response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map(),
          text: () => Promise.resolve(`
            User-agent: *
            Disallow: /private/
            Disallow: /admin/
          `),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map(),
          text: () => Promise.resolve('<html><head><title>Test</title></head><body><a href="/private/page">Private Link</a></body></html>'),
        })

      const results = await crawler.crawl('https://example.com')

      // Should only crawl the initial page since /private/ is disallowed
      expect(results.length).toBe(1)
    })

    it('should ignore robots.txt when disabled', async () => {
      const crawler = new WebCrawler({
        respectRobotsTxt: false,
        maxPages: 5,
      })

      const mockHtml = `
        <html>
          <head><title>Test</title></head>
          <body>
            <a href="https://example.com/private/page">Private Link</a>
          </body>
        </html>
      `

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(mockHtml),
      })

      const results = await crawler.crawl('https://example.com')

      // Should crawl both pages since robots.txt is ignored
      expect(results.length).toBe(2)
    })
  })

  describe('Statistics and Monitoring', () => {
    it('should provide crawling statistics', async () => {
      const mockHtml = `
        <html>
          <head><title>Test</title></head>
          <body>
            <a href="https://example.com/page2">Link 1</a>
            <img src="https://example.com/image1.jpg" alt="Image 1">
            <img src="https://example.com/image2.jpg" alt="Image 2">
          </body>
        </html>
      `

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(mockHtml),
      })

      await crawler.crawl('https://example.com')
      const stats = crawler.getStats()

      expect(stats.totalPages).toBeGreaterThan(0)
      expect(stats.successfulPages).toBeGreaterThan(0)
      expect(stats.totalLinks).toBeGreaterThan(0)
      expect(stats.totalImages).toBeGreaterThan(0)
      expect(stats.domains).toContain('example.com')
      expect(stats.startTime).toBeDefined()
      expect(stats.endTime).toBeDefined()
      expect(stats.duration).toBeGreaterThan(0)
    })

    it('should track response times', async () => {
      const mockHtml = '<html><head><title>Test</title></head><body></body></html>'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => new Promise((resolve) => {
          setTimeout(() => resolve(mockHtml), 100)
        }),
      })

      await crawler.crawl('https://example.com')
      const stats = crawler.getStats()

      expect(stats.averageResponseTime).toBeGreaterThan(0)
    })
  })

  describe('Crawler Control', () => {
    it('should prevent multiple concurrent crawls', async () => {
      const mockHtml = '<html><head><title>Test</title></head><body></body></html>'

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(mockHtml),
      })

      // Start first crawl
      const firstCrawl = crawler.crawl('https://example.com')

      // Try to start second crawl
      await expect(crawler.crawl('https://example.com/page2')).rejects.toThrow('Crawler is already running')

      await firstCrawl
    })

    it('should stop crawling when requested', async () => {
      const crawler = new WebCrawler({ maxPages: 10 })

      const mockHtml = `
        <html>
          <head><title>Test</title></head>
          <body>
            <a href="https://example.com/page2">Link 1</a>
            <a href="https://example.com/page3">Link 2</a>
          </body>
        </html>
      `

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(mockHtml),
      })

      // Start crawling
      const crawlPromise = crawler.crawl('https://example.com')

      // Stop after a short delay
      setTimeout(() => crawler.stop(), 50)

      await crawlPromise
      expect(crawler.isRunning()).toBe(false)
    })

    it('should clear cache', () => {
      crawler.clearCache()
      // Should not throw any errors
      expect(true).toBe(true)
    })
  })

  describe('Configuration', () => {
    it('should update configuration', () => {
      crawler.updateConfig({ maxPages: 50, delay: 2000 })

      // Should not throw any errors
      expect(true).toBe(true)
    })
  })

  describe('Events', () => {
    it('should emit crawlStarted event', async () => {
      const listener = vi.fn()
      crawler.on('crawlStarted', listener)

      const mockHtml = '<html><head><title>Test</title></head><body></body></html>'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(mockHtml),
      })

      await crawler.crawl('https://example.com')
      expect(listener).toHaveBeenCalledWith({ startUrl: 'https://example.com' })
    })

    it('should emit pageCrawled event', async () => {
      const listener = vi.fn()
      crawler.on('pageCrawled', listener)

      const mockHtml = '<html><head><title>Test</title></head><body></body></html>'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(mockHtml),
      })

      await crawler.crawl('https://example.com')
      expect(listener).toHaveBeenCalledWith({ result: expect.any(Object) })
    })

    it('should emit pageError event', async () => {
      const listener = vi.fn()
      crawler.on('pageError', listener)

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await crawler.crawl('https://example.com')
      expect(listener).toHaveBeenCalledWith({
        url: 'https://example.com',
        error: expect.any(Error),
      })
    })

    it('should emit crawlCompleted event', async () => {
      const listener = vi.fn()
      crawler.on('crawlCompleted', listener)

      const mockHtml = '<html><head><title>Test</title></head><body></body></html>'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(mockHtml),
      })

      await crawler.crawl('https://example.com')
      expect(listener).toHaveBeenCalledWith({ stats: expect.any(Object) })
    })

    it('should emit crawlStopped event', () => {
      const listener = vi.fn()
      crawler.on('crawlStopped', listener)

      crawler.stop()
      expect(listener).toHaveBeenCalled()
    })

    it('should emit destroyed event', () => {
      const listener = vi.fn()
      crawler.on('destroyed', listener)

      crawler.destroy()
      expect(listener).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle malformed URLs gracefully', async () => {
      const mockHtml = `
        <html>
          <head><title>Test</title></head>
          <body>
            <a href="not-a-url">Invalid Link</a>
            <a href="javascript:void(0)">JS Link</a>
            <a href="#anchor">Anchor Link</a>
          </body>
        </html>
      `

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(mockHtml),
      })

      const results = await crawler.crawl('https://example.com')

      // Should not include invalid URLs in links
      expect(results[0].links).toHaveLength(0)
    })

    it('should handle empty HTML content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: () => Promise.resolve(''),
      })

      const results = await crawler.crawl('https://example.com')

      expect(results[0].title).toBe('')
      expect(results[0].content).toBe('')
      expect(results[0].links).toHaveLength(0)
      expect(results[0].images).toHaveLength(0)
    })

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Map(),
        text: () => Promise.resolve('Not Found'),
      })

      const results = await crawler.crawl('https://example.com/notfound')

      expect(results[0].status).toBe(404)
    })

    it('should handle timeout errors', async () => {
      const crawler = new WebCrawler({ timeout: 100 })

      mockFetch.mockImplementationOnce(() =>
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 200),
        ),
      )

      const results = await crawler.crawl('https://example.com/slow')

      expect(results).toHaveLength(0)
      const stats = crawler.getStats()
      expect(stats.failedPages).toBe(1)
    })
  })
})
