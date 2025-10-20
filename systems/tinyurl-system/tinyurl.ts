import { EventEmitter } from 'node:events'

export interface TinyUrlConfig {
  baseUrl: string
  shortCodeLength: number
  maxRetries: number
  customAlphabet: string
  enableAnalytics: boolean
  enableExpiration: boolean
  defaultExpirationDays: number
  maxUrlLength: number
  allowedDomains: string[]
  blockedDomains: string[]
}

export interface UrlEntry {
  id: string
  shortCode: string
  originalUrl: string
  shortUrl: string
  createdAt: Date
  expiresAt?: Date
  isActive: boolean
  clickCount: number
  lastClickedAt?: Date
  metadata: {
    title?: string
    description?: string
    tags?: string[]
    createdBy?: string
    ipAddress?: string
    userAgent?: string
  }
}

export interface AnalyticsData {
  totalClicks: number
  uniqueClicks: number
  clicksByDate: Array<{ date: string; clicks: number }>
  clicksByCountry: Array<{ country: string; clicks: number }>
  clicksByReferrer: Array<{ referrer: string; clicks: number }>
  clicksByDevice: Array<{ device: string; clicks: number }>
  topUrls: Array<{ shortCode: string; clicks: number }>
}

export interface TinyUrlStats {
  totalUrls: number
  activeUrls: number
  expiredUrls: number
  totalClicks: number
  averageClicksPerUrl: number
  mostPopularUrl: string
  averageUrlLength: number
  topDomains: Array<{ domain: string; count: number }>
  recentUrls: UrlEntry[]
}

export class TinyUrlSystem extends EventEmitter {
  private urls: Map<string, UrlEntry> = new Map()
  private shortCodeToId: Map<string, string> = new Map()
  private config: TinyUrlConfig
  private analytics: Map<string, any> = new Map()
  private startTime: Date

  constructor(config: Partial<TinyUrlConfig> = {}) {
    super()
    this.config = {
      baseUrl: 'https://tiny.url',
      shortCodeLength: 6,
      maxRetries: 3,
      customAlphabet: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      enableAnalytics: true,
      enableExpiration: true,
      defaultExpirationDays: 30,
      maxUrlLength: 2048,
      allowedDomains: [],
      blockedDomains: [],
      ...config,
    }
    this.startTime = new Date()
    this.initializeDefaultData()
  }

  private initializeDefaultData(): void {
    // Add some default URLs for testing
    const defaultUrls = [
      {
        id: '1',
        shortCode: 'abc123',
        originalUrl: 'https://example.com/page1',
        shortUrl: 'https://tiny.url/abc123',
        createdAt: new Date(),
        isActive: true,
        clickCount: 0,
        metadata: {
          title: 'Example Page 1',
          description: 'A sample page for testing',
          tags: ['example', 'test'],
          createdBy: 'system',
        },
      },
      {
        id: '2',
        shortCode: 'def456',
        originalUrl: 'https://example.com/page2',
        shortUrl: 'https://tiny.url/def456',
        createdAt: new Date(),
        isActive: true,
        clickCount: 5,
        lastClickedAt: new Date(),
        metadata: {
          title: 'Example Page 2',
          description: 'Another sample page',
          tags: ['example', 'demo'],
          createdBy: 'system',
        },
      },
      {
        id: '3',
        shortCode: 'ghi789',
        originalUrl: 'https://example.com/expired',
        shortUrl: 'https://tiny.url/ghi789',
        createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
        expiresAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        isActive: false,
        clickCount: 2,
        metadata: {
          title: 'Expired Page',
          description: 'This page has expired',
          tags: ['expired'],
          createdBy: 'system',
        },
      },
    ]

    defaultUrls.forEach((url) => {
      this.urls.set(url.id, url)
      this.shortCodeToId.set(url.shortCode, url.id)
    })
  }

  public createShortUrl(originalUrl: string, options: {
    customCode?: string
    expirationDays?: number
    title?: string
    description?: string
    tags?: string[]
    createdBy?: string
    ipAddress?: string
    userAgent?: string
  } = {}): UrlEntry | null {
    // Validate URL
    if (!this.isValidUrl(originalUrl)) {
      this.emit('urlCreationFailed', { url: originalUrl, reason: 'Invalid URL' })
      return null
    }

    // Check URL length
    if (originalUrl.length > this.config.maxUrlLength) {
      this.emit('urlCreationFailed', { url: originalUrl, reason: 'URL too long' })
      return null
    }

    // Check domain restrictions
    if (!this.isDomainAllowed(originalUrl)) {
      this.emit('urlCreationFailed', { url: originalUrl, reason: 'Domain not allowed' })
      return null
    }

    // Check if URL already exists
    const existingUrl = this.findExistingUrl(originalUrl)
    if (existingUrl && existingUrl.isActive) {
      this.emit('urlAlreadyExists', { url: existingUrl })
      return existingUrl
    }

    // Generate short code
    let shortCode: string
    if (options.customCode) {
      if (this.shortCodeToId.has(options.customCode)) {
        this.emit('urlCreationFailed', { url: originalUrl, reason: 'Custom code already exists' })
        return null
      }
      shortCode = options.customCode
    }
    else {
      shortCode = this.generateShortCode()
    }

    // Create URL entry
    const id = this.generateId()
    const now = new Date()
    const expiresAt = options.expirationDays
      ? new Date(now.getTime() + options.expirationDays * 24 * 60 * 60 * 1000)
      : (this.config.enableExpiration ? new Date(now.getTime() + this.config.defaultExpirationDays * 24 * 60 * 60 * 1000) : undefined)

    const urlEntry: UrlEntry = {
      id,
      shortCode,
      originalUrl,
      shortUrl: `${this.config.baseUrl}/${shortCode}`,
      createdAt: now,
      expiresAt,
      isActive: true,
      clickCount: 0,
      metadata: {
        title: options.title,
        description: options.description,
        tags: options.tags,
        createdBy: options.createdBy,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
      },
    }

    this.urls.set(id, urlEntry)
    this.shortCodeToId.set(shortCode, id)

    this.emit('urlCreated', { url: urlEntry })
    return urlEntry
  }

  public getUrl(shortCode: string): UrlEntry | null {
    const id = this.shortCodeToId.get(shortCode)
    if (!id)
      return null

    const urlEntry = this.urls.get(id)
    if (!urlEntry || !urlEntry.isActive)
      return null

    // Check if URL has expired
    if (urlEntry.expiresAt && urlEntry.expiresAt < new Date()) {
      urlEntry.isActive = false
      this.emit('urlExpired', { url: urlEntry })
      return null
    }

    return urlEntry
  }

  public resolveUrl(shortCode: string, options: {
    ipAddress?: string
    userAgent?: string
    referrer?: string
    country?: string
  } = {}): string | null {
    const urlEntry = this.getUrl(shortCode)
    if (!urlEntry)
      return null

    // Update click count and analytics
    urlEntry.clickCount++
    urlEntry.lastClickedAt = new Date()

    if (this.config.enableAnalytics)
      this.recordClick(urlEntry.id, options)

    this.emit('urlClicked', { url: urlEntry, clickData: options })
    return urlEntry.originalUrl
  }

  public updateUrl(shortCode: string, updates: {
    title?: string
    description?: string
    tags?: string[]
    expirationDays?: number
  }): UrlEntry | null {
    const urlEntry = this.getUrl(shortCode)
    if (!urlEntry)
      return null

    if (updates.title !== undefined)
      urlEntry.metadata.title = updates.title

    if (updates.description !== undefined)
      urlEntry.metadata.description = updates.description

    if (updates.tags !== undefined)
      urlEntry.metadata.tags = updates.tags

    if (updates.expirationDays !== undefined)
      urlEntry.expiresAt = new Date(Date.now() + updates.expirationDays * 24 * 60 * 60 * 1000)

    this.urls.set(urlEntry.id, urlEntry)
    this.emit('urlUpdated', { url: urlEntry })
    return urlEntry
  }

  public deleteUrl(shortCode: string): boolean {
    const id = this.shortCodeToId.get(shortCode)
    if (!id)
      return false

    const urlEntry = this.urls.get(id)
    if (!urlEntry)
      return false

    urlEntry.isActive = false
    this.urls.set(id, urlEntry)
    this.shortCodeToId.delete(shortCode)

    this.emit('urlDeleted', { url: urlEntry })
    return true
  }

  public getUrls(options: {
    createdBy?: string
    tags?: string[]
    activeOnly?: boolean
    limit?: number
    offset?: number
  } = {}): UrlEntry[] {
    let urls = Array.from(this.urls.values())

    if (options.createdBy)
      urls = urls.filter(url => url.metadata.createdBy === options.createdBy)

    if (options.tags && options.tags.length > 0) {
      urls = urls.filter(url =>
        url.metadata.tags
        && options.tags!.some(tag => url.metadata.tags!.includes(tag)),
      )
    }

    if (options.activeOnly)
      urls = urls.filter(url => url.isActive)

    // Sort by creation date (newest first)
    urls.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Apply pagination
    const offset = options.offset || 0
    const limit = options.limit || 50
    return urls.slice(offset, offset + limit)
  }

  public searchUrls(query: string): UrlEntry[] {
    const searchTerm = query.toLowerCase()
    return Array.from(this.urls.values()).filter(url =>
      url.originalUrl.toLowerCase().includes(searchTerm)
      || url.metadata.title?.toLowerCase().includes(searchTerm)
      || url.metadata.description?.toLowerCase().includes(searchTerm)
      || url.metadata.tags?.some(tag => tag.toLowerCase().includes(searchTerm)),
    )
  }

  public getAnalytics(shortCode: string): AnalyticsData | null {
    if (!this.config.enableAnalytics)
      return null

    const urlEntry = this.getUrl(shortCode)
    if (!urlEntry)
      return null

    const analytics = this.analytics.get(urlEntry.id) || {
      totalClicks: 0,
      uniqueClicks: 0,
      clicksByDate: [],
      clicksByCountry: [],
      clicksByReferrer: [],
      clicksByDevice: [],
      topUrls: [],
    }

    return analytics
  }

  public getStatistics(): TinyUrlStats {
    const urls = Array.from(this.urls.values())
    const activeUrls = urls.filter(url => url.isActive)
    const expiredUrls = urls.filter(url => !url.isActive)
    const totalClicks = urls.reduce((sum, url) => sum + url.clickCount, 0)
    const averageClicksPerUrl = urls.length > 0 ? totalClicks / urls.length : 0

    const mostPopularUrl = urls.reduce((max, url) =>
      url.clickCount > max.clickCount ? url : max,
    urls[0] || { clickCount: 0, shortCode: '' },
    )

    const averageUrlLength = urls.length > 0
      ? urls.reduce((sum, url) => sum + url.originalUrl.length, 0) / urls.length
      : 0

    // Count domains
    const domainCounts = new Map<string, number>()
    urls.forEach((url) => {
      try {
        const domain = new URL(url.originalUrl).hostname
        domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1)
      }
      catch {
        // Ignore invalid URLs
      }
    })

    const topDomains = Array.from(domainCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }))

    const recentUrls = urls
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)

    return {
      totalUrls: urls.length,
      activeUrls: activeUrls.length,
      expiredUrls: expiredUrls.length,
      totalClicks,
      averageClicksPerUrl,
      mostPopularUrl: mostPopularUrl.shortCode,
      averageUrlLength,
      topDomains,
      recentUrls,
    }
  }

  public cleanupExpiredUrls(): number {
    const now = new Date()
    let cleanedCount = 0

    for (const [_id, url] of this.urls.entries()) {
      if (url.expiresAt && url.expiresAt < now && url.isActive) {
        url.isActive = false
        this.shortCodeToId.delete(url.shortCode)
        cleanedCount++
        this.emit('urlExpired', { url })
      }
    }

    this.emit('cleanupCompleted', { count: cleanedCount })
    return cleanedCount
  }

  public updateConfig(newConfig: Partial<TinyUrlConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.emit('configUpdated', { config: this.config })
  }

  public destroy(): void {
    this.urls.clear()
    this.shortCodeToId.clear()
    this.analytics.clear()
    this.emit('destroyed')
  }

  private isValidUrl(url: string): boolean {
    try {
      const _url = new URL(url)
      return true
    }
    catch {
      return false
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

  private findExistingUrl(originalUrl: string): UrlEntry | null {
    for (const url of this.urls.values()) {
      if (url.originalUrl === originalUrl)
        return url
    }
    return null
  }

  private generateShortCode(): string {
    let attempts = 0
    let shortCode: string

    do {
      shortCode = ''
      for (let i = 0; i < this.config.shortCodeLength; i++)
        shortCode += this.config.customAlphabet[Math.floor(Math.random() * this.config.customAlphabet.length)]

      attempts++
    } while (this.shortCodeToId.has(shortCode) && attempts < this.config.maxRetries)

    if (attempts >= this.config.maxRetries)
      throw new Error('Unable to generate unique short code')

    return shortCode
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  private recordClick(urlId: string, clickData: any): void {
    const analytics = this.analytics.get(urlId) || {
      totalClicks: 0,
      uniqueClicks: 0,
      clicksByDate: [],
      clicksByCountry: [],
      clicksByReferrer: [],
      clicksByDevice: [],
      topUrls: [],
    }

    analytics.totalClicks++

    // Record click by date
    const today = new Date().toISOString().split('T')[0]
    const dateEntry = analytics.clicksByDate.find(entry => entry.date === today)
    if (dateEntry)
      dateEntry.clicks++
    else
      analytics.clicksByDate.push({ date: today, clicks: 1 })

    // Record click by country
    if (clickData.country) {
      const countryEntry = analytics.clicksByCountry.find(entry => entry.country === clickData.country)
      if (countryEntry)
        countryEntry.clicks++
      else
        analytics.clicksByCountry.push({ country: clickData.country, clicks: 1 })
    }

    // Record click by referrer
    if (clickData.referrer) {
      const referrerEntry = analytics.clicksByReferrer.find(entry => entry.referrer === clickData.referrer)
      if (referrerEntry)
        referrerEntry.clicks++
      else
        analytics.clicksByReferrer.push({ referrer: clickData.referrer, clicks: 1 })
    }

    // Record click by device
    if (clickData.userAgent) {
      const device = this.detectDevice(clickData.userAgent)
      const deviceEntry = analytics.clicksByDevice.find(entry => entry.device === device)
      if (deviceEntry)
        deviceEntry.clicks++
      else
        analytics.clicksByDevice.push({ device, clicks: 1 })
    }

    this.analytics.set(urlId, analytics)
  }

  private detectDevice(userAgent: string): string {
    if (/mobile|android|iphone|ipad/i.test(userAgent))
      return 'Mobile'
    else if (/tablet|ipad/i.test(userAgent))
      return 'Tablet'
    else
      return 'Desktop'
  }
}
