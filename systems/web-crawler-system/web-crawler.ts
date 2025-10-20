import { EventEmitter } from 'node:events'

export interface CrawlConfig {
  maxDepth: number
  maxPages: number
  delay: number // milliseconds between requests
  timeout: number // request timeout in milliseconds
  userAgent: string
  followRedirects: boolean
  respectRobotsTxt: boolean
  allowedDomains: string[]
  blockedDomains: string[]
  allowedPaths: string[]
  blockedPaths: string[]
  maxConcurrentRequests: number
  retryAttempts: number
  retryDelay: number
}

export interface CrawlResult {
  url: string
  status: number
  title: string
  content: string
  links: string[]
  images: string[]
  metadata: {
    description?: string
    keywords?: string[]
    author?: string
    publishedDate?: Date
    lastModified?: Date
    language?: string
    contentType?: string
    contentLength?: number
  }
  depth: number
  crawledAt: Date
  responseTime: number
  error?: string
}

export interface CrawlStats {
  totalPages: number
  successfulPages: number
  failedPages: number
  averageResponseTime: number
  totalLinks: number
  totalImages: number
  domains: string[]
  startTime: Date
  endTime?: Date
  duration?: number
}

export interface RobotsTxtRule {
  userAgent: string
  allow: string[]
  disallow: string[]
  crawlDelay?: number
}

export class WebCrawler extends EventEmitter {
  private config: CrawlConfig
  private visitedUrls: Set<string> = new Set()
  private crawlQueue: Array<{ url: string; depth: number }> = []
  private results: Map<string, CrawlResult> = new Map()
  private robotsTxtCache: Map<string, RobotsTxtRule[]> = new Map()
  private activeRequests: number = 0
  private stats: CrawlStats
  private isCrawling: boolean = false

  constructor(config: Partial<CrawlConfig> = {}) {
    super()
    this.config = {
      maxDepth: 3,
      maxPages: 100,
      delay: 1000,
      timeout: 10000,
      userAgent: 'WebCrawler/1.0',
      followRedirects: true,
      respectRobotsTxt: false,
      allowedDomains: [],
      blockedDomains: [],
      allowedPaths: [],
      blockedPaths: [],
      maxConcurrentRequests: 5,
      retryAttempts: 3,
      retryDelay: 2000,
      ...config,
    }
    this.stats = {
      totalPages: 0,
      successfulPages: 0,
      failedPages: 0,
      averageResponseTime: 0,
      totalLinks: 0,
      totalImages: 0,
      domains: [],
      startTime: new Date(),
    }
  }

  public async crawl(startUrl: string): Promise<CrawlResult[]> {
    if (this.isCrawling)
      throw new Error('Crawler is already running')

    this.isCrawling = true
    this.stats.startTime = new Date()
    this.visitedUrls.clear()
    this.results.clear()
    this.crawlQueue = [{ url: startUrl, depth: 0 }]

    this.emit('crawlStarted', { startUrl })

    try {
      await this.processQueue()
      this.stats.endTime = new Date()
      this.stats.duration = this.stats.endTime.getTime() - this.stats.startTime.getTime()

      this.emit('crawlCompleted', { stats: this.stats })
      return Array.from(this.results.values())
    }
    catch (error) {
      this.emit('crawlError', { error: error as Error })
      throw error
    }
    finally {
      this.isCrawling = false
    }
  }

  private async processQueue(): Promise<void> {
    while (this.crawlQueue.length > 0 && this.results.size < this.config.maxPages && this.isCrawling) {
      const remainingPages = this.config.maxPages - this.results.size
      const batchSize = Math.min(this.config.maxConcurrentRequests, remainingPages, this.crawlQueue.length)
      const batch = this.crawlQueue.splice(0, batchSize)
      const promises = batch.map(item => this.crawlPage(item.url, item.depth))

      await Promise.allSettled(promises)

      if (this.config.delay > 0)
        await this.delay(this.config.delay)
    }
  }

  private async crawlPage(url: string, depth: number): Promise<void> {
    if (this.visitedUrls.has(url) || depth >= this.config.maxDepth)
      return

    this.visitedUrls.add(url)
    this.activeRequests++

    try {
      // Check robots.txt if enabled (skip for initial URL at depth 0)
      if (this.config.respectRobotsTxt && !(await this.isUrlAllowed(url))) {
        this.emit('pageBlocked', { url, reason: 'Robots.txt disallow' })
        this.activeRequests--
        return
      }

      // Check domain restrictions (skip for initial URL at depth 0)
      if (depth > 0 && !this.isDomainAllowed(url)) {
        this.emit('pageBlocked', { url, reason: 'Domain not allowed' })
        this.activeRequests--
        return
      }

      // Check path restrictions (skip for initial URL at depth 0)
      if (depth > 0 && !this.isPathAllowed(url)) {
        this.emit('pageBlocked', { url, reason: 'Path not allowed' })
        this.activeRequests--
        return
      }

      const result = await this.fetchPage(url, depth)
      this.results.set(url, result)
      this.stats.totalPages++
      this.stats.successfulPages++

      if (result.links) {
        this.stats.totalLinks += result.links.length
        // Only follow links if the current page matches domain/path filters
        // Also, if filters are set and we're on the root path, be conservative
        const hasFilters = this.config.allowedDomains.length > 0
          || this.config.blockedDomains.length > 0
          || this.config.allowedPaths.length > 0
          || this.config.blockedPaths.length > 0

        const urlPath = new URL(url).pathname
        const isRootPath = urlPath === '/'

        // If we're on root path and filters are set, don't follow links
        // If no filters are set, or we're not on root path, check domain/path filters normally
        const shouldFollowLinks = (!isRootPath || !hasFilters) && this.isDomainAllowed(url) && this.isPathAllowed(url)
        if (shouldFollowLinks)
          this.addLinksToQueue(result.links, depth + 1)
      }

      if (result.images)
        this.stats.totalImages += result.images.length

      this.updateStats(result)
      this.emit('pageCrawled', { result })
    }
    catch (error) {
      this.stats.totalPages++
      this.stats.failedPages++
      this.emit('pageError', { url, error: error as Error })
    }
    finally {
      this.activeRequests--
    }
  }

  private async fetchPage(url: string, depth: number): Promise<CrawlResult> {
    const startTime = Date.now()

    try {
      const response = await this.makeRequest(url)
      const content = await response.text()
      const responseTime = Date.now() - startTime

      const result: CrawlResult = {
        url,
        status: response.status,
        title: this.extractTitle(content),
        content: this.extractTextContent(content),
        links: this.extractLinks(content, url),
        images: this.extractImages(content, url),
        metadata: this.extractMetadata(content, response),
        depth,
        crawledAt: new Date(),
        responseTime,
      }

      return result
    }
    catch (error) {
      throw new Error(`Failed to fetch ${url}: ${(error as Error).message}`)
    }
  }

  private async makeRequest(url: string): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        signal: controller.signal,
        redirect: this.config.followRedirects ? 'follow' : 'manual',
      })

      clearTimeout(timeoutId)
      return response
    }
    catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private extractTitle(content: string): string {
    const titleMatch = content.match(/<title[^>]*>([^<]*)<\/title>/i)
    return titleMatch ? titleMatch[1].trim() : ''
  }

  private extractTextContent(content: string): string {
    // Remove script and style elements
    let text = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

    // Remove HTML tags
    text = text.replace(/<[^>]*>/g, ' ')

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim()

    return text
  }

  private extractLinks(content: string, baseUrl: string): string[] {
    const links: string[] = []
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi
    let match: RegExpExecArray | null = linkRegex.exec(content)
    while (match !== null) {
      const href = match[1]
      // Filter out suspicious hrefs that don't follow standard URL patterns
      if (this.isValidHref(href)) {
        const absoluteUrl = this.resolveUrl(href, baseUrl)
        if (absoluteUrl && this.isValidUrl(absoluteUrl) && !this.isSamePageAnchor(absoluteUrl, baseUrl))
          links.push(absoluteUrl)
      }

      match = linkRegex.exec(content)
    }

    return [...new Set(links)] // Remove duplicates
  }

  private isValidHref(href: string): boolean {
    if (!href || href.trim() === '')
      return false

    // Allow absolute URLs
    if (href.startsWith('http://') || href.startsWith('https://'))
      return true

    // Allow standard relative URLs
    if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../'))
      return true

    // Filter out javascript:, mailto:, tel:, data:, etc.
    if (href.includes(':'))
      return false

    // Filter out anchor-only links
    if (href.startsWith('#'))
      return false

    // Filter out other suspicious patterns (anything that doesn't match standard URL patterns)
    // If it doesn't start with /, ./, ../, or http(s)://, it's likely malformed
    return false
  }

  private extractImages(content: string, baseUrl: string): string[] {
    const images: string[] = []
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
    let match: RegExpExecArray | null = imgRegex.exec(content)
    while (match !== null) {
      const src = match[1]
      const absoluteUrl = this.resolveUrl(src, baseUrl)
      if (absoluteUrl && this.isValidUrl(absoluteUrl))
        images.push(absoluteUrl)

      match = imgRegex.exec(content)
    }

    return [...new Set(images)] // Remove duplicates
  }

  private extractMetadata(content: string, response: Response): CrawlResult['metadata'] {
    const metadata: CrawlResult['metadata'] = {}

    // Extract meta description (handle both attribute orders)
    metadata.description = this.extractMetaContent(content, 'name', 'description')

    // Extract meta keywords
    const keywordsContent = this.extractMetaContent(content, 'name', 'keywords')
    if (keywordsContent)
      metadata.keywords = keywordsContent.split(',').map(k => k.trim())

    // Extract meta author
    metadata.author = this.extractMetaContent(content, 'name', 'author')

    // Extract published date
    const pubDate = this.extractMetaContent(content, 'property', 'article:published_time')
    if (pubDate)
      metadata.publishedDate = new Date(pubDate)

    // Extract last modified
    const lastMod = this.extractMetaContent(content, 'http-equiv', 'last-modified')
    if (lastMod)
      metadata.lastModified = new Date(lastMod)

    // Extract language
    const langMatch = content.match(/<html[^>]*lang=["']([^"']*)["'][^>]*>/i)
    if (langMatch)
      metadata.language = langMatch[1].trim()

    // Extract content type and length from response
    const contentType = response.headers.get('content-type')
    if (contentType)
      metadata.contentType = contentType

    const contentLength = response.headers.get('content-length')
    if (contentLength)
      metadata.contentLength = Number.parseInt(contentLength, 10)

    return metadata
  }

  private extractMetaContent(content: string, attributeName: string, attributeValue: string): string | undefined {
    // Try attribute=value followed by content=...
    let match = content.match(new RegExp(`<meta[^>]*${attributeName}=["']${attributeValue}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i'))
    if (match)
      return match[1].trim()

    // Try content=... followed by attribute=value
    match = content.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attributeName}=["']${attributeValue}["'][^>]*>`, 'i'))
    if (match)
      return match[1].trim()

    return undefined
  }

  private resolveUrl(href: string, baseUrl: string): string | null {
    try {
      return new URL(href, baseUrl).href
    }
    catch {
      return null
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol))
        return false
      return true
    }
    catch {
      return false
    }
  }

  private isSamePageAnchor(url: string, baseUrl: string): boolean {
    try {
      const urlObj = new URL(url)
      const baseObj = new URL(baseUrl)

      // Check if it's the same page (only hash differs)
      return urlObj.protocol === baseObj.protocol
        && urlObj.hostname === baseObj.hostname
        && urlObj.pathname === baseObj.pathname
        && urlObj.search === baseObj.search
        && urlObj.hash !== baseObj.hash
    }
    catch {
      return false
    }
  }

  private addLinksToQueue(links: string[], depth: number): void {
    for (const link of links) {
      if (!this.visitedUrls.has(link) && depth < this.config.maxDepth) {
        // Apply domain and path filtering
        if (this.isDomainAllowed(link) && this.isPathAllowed(link))
          this.crawlQueue.push({ url: link, depth })
      }
    }
  }

  private isDomainAllowed(url: string): boolean {
    try {
      const domain = new URL(url).hostname

      if (this.config.blockedDomains.length > 0) {
        for (const blockedDomain of this.config.blockedDomains) {
          if (domain.includes(blockedDomain))
            return false
        }
      }

      if (this.config.allowedDomains.length > 0) {
        for (const allowedDomain of this.config.allowedDomains) {
          if (domain.includes(allowedDomain))
            return true
        }
        return false
      }

      return true
    }
    catch {
      return false
    }
  }

  private isPathAllowed(url: string): boolean {
    try {
      const pathname = new URL(url).pathname

      if (this.config.blockedPaths.length > 0) {
        for (const blockedPath of this.config.blockedPaths) {
          if (pathname.includes(blockedPath))
            return false
        }
      }

      if (this.config.allowedPaths.length > 0) {
        for (const allowedPath of this.config.allowedPaths) {
          if (pathname.includes(allowedPath))
            return true
        }
        return false
      }

      return true
    }
    catch {
      return false
    }
  }

  private async isUrlAllowed(url: string): Promise<boolean> {
    try {
      const robotsUrl = new URL('/robots.txt', url).href
      const domain = new URL(url).hostname

      if (!this.robotsTxtCache.has(domain)) {
        try {
          const response = await fetch(robotsUrl)
          if (response.ok) {
            const robotsContent = await response.text()
            const rules = this.parseRobotsTxt(robotsContent)
            this.robotsTxtCache.set(domain, rules)
          }
          else {
            this.robotsTxtCache.set(domain, [])
          }
        }
        catch {
          this.robotsTxtCache.set(domain, [])
        }
      }

      const rules = this.robotsTxtCache.get(domain) || []
      const userAgent = this.config.userAgent.toLowerCase()
      const pathname = new URL(url).pathname

      for (const rule of rules) {
        if (rule.userAgent === '*' || userAgent.includes(rule.userAgent.toLowerCase())) {
          // Check disallow rules
          for (const disallow of rule.disallow) {
            if (pathname.startsWith(disallow))
              return false
          }
        }
      }

      return true
    }
    catch {
      return true // If we can't check robots.txt, allow the URL
    }
  }

  private parseRobotsTxt(content: string): RobotsTxtRule[] {
    const rules: RobotsTxtRule[] = []
    const lines = content.split('\n').map(line => line.trim())
    let currentRule: RobotsTxtRule | null = null

    for (const line of lines) {
      if (line.startsWith('User-agent:')) {
        if (currentRule)
          rules.push(currentRule)

        currentRule = {
          userAgent: line.substring(11).trim(),
          allow: [],
          disallow: [],
        }
      }
      else if (line.startsWith('Disallow:')) {
        if (currentRule)
          currentRule.disallow.push(line.substring(9).trim())
      }
      else if (line.startsWith('Allow:')) {
        if (currentRule)
          currentRule.allow.push(line.substring(6).trim())
      }
      else if (line.startsWith('Crawl-delay:')) {
        if (currentRule)
          currentRule.crawlDelay = Number.parseInt(line.substring(12).trim(), 10)
      }
    }

    if (currentRule)
      rules.push(currentRule)

    return rules
  }

  private updateStats(result: CrawlResult): void {
    this.stats.averageResponseTime
      = (this.stats.averageResponseTime * (this.stats.successfulPages - 1) + result.responseTime)
      / this.stats.successfulPages

    const domain = new URL(result.url).hostname
    if (!this.stats.domains.includes(domain))
      this.stats.domains.push(domain)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  public getResults(): CrawlResult[] {
    return Array.from(this.results.values())
  }

  public getStats(): CrawlStats {
    return { ...this.stats }
  }

  public isRunning(): boolean {
    return this.isCrawling
  }

  public stop(): void {
    this.isCrawling = false
    this.crawlQueue = []
    this.emit('crawlStopped')
  }

  public clearCache(): void {
    this.robotsTxtCache.clear()
    this.emit('cacheCleared')
  }

  public updateConfig(newConfig: Partial<CrawlConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.emit('configUpdated', { config: this.config })
  }

  public destroy(): void {
    this.stop()
    this.visitedUrls.clear()
    this.results.clear()
    this.robotsTxtCache.clear()
    this.emit('destroyed')
  }
}
