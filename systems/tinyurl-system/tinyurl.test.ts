import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TinyUrlConfig } from './tinyurl'
import { TinyUrlSystem } from './tinyurl'

describe('TinyUrlSystem', () => {
  let tinyUrl: TinyUrlSystem

  beforeEach(() => {
    tinyUrl = new TinyUrlSystem()
  })

  afterEach(() => {
    tinyUrl.destroy()
  })

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      expect(tinyUrl).toBeDefined()
      expect(tinyUrl.getStatistics().totalUrls).toBeGreaterThan(0)
    })

    it('should initialize with custom config', () => {
      const config: Partial<TinyUrlConfig> = {
        baseUrl: 'https://short.ly',
        shortCodeLength: 8,
        maxRetries: 5,
        customAlphabet: '0123456789',
        enableAnalytics: false,
        enableExpiration: false,
        defaultExpirationDays: 7,
        maxUrlLength: 1000,
        allowedDomains: ['example.com'],
        blockedDomains: ['spam.com'],
      }

      const customTinyUrl = new TinyUrlSystem(config)
      expect(customTinyUrl).toBeDefined()
      customTinyUrl.destroy()
    })

    it('should initialize with default data', () => {
      const stats = tinyUrl.getStatistics()
      expect(stats.totalUrls).toBeGreaterThan(0)
      expect(stats.activeUrls).toBeGreaterThan(0)
    })
  })

  describe('URL Creation', () => {
    it('should create a short URL', () => {
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test')

      expect(urlEntry).toBeDefined()
      expect(urlEntry?.shortCode).toBeDefined()
      expect(urlEntry?.originalUrl).toBe('https://example.com/test')
      expect(urlEntry?.shortUrl).toMatch(/^https:\/\/tiny\.url\/[a-zA-Z0-9]+$/)
      expect(urlEntry?.isActive).toBe(true)
      expect(urlEntry?.clickCount).toBe(0)
    })

    it('should create a short URL with custom code', () => {
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test', {
        customCode: 'custom123',
      })

      expect(urlEntry).toBeDefined()
      expect(urlEntry?.shortCode).toBe('custom123')
      expect(urlEntry?.shortUrl).toBe('https://tiny.url/custom123')
    })

    it('should create a short URL with metadata', () => {
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test', {
        title: 'Test Page',
        description: 'A test page',
        tags: ['test', 'example'],
        createdBy: 'user123',
      })

      expect(urlEntry).toBeDefined()
      expect(urlEntry?.metadata.title).toBe('Test Page')
      expect(urlEntry?.metadata.description).toBe('A test page')
      expect(urlEntry?.metadata.tags).toEqual(['test', 'example'])
      expect(urlEntry?.metadata.createdBy).toBe('user123')
    })

    it('should create a short URL with expiration', () => {
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test', {
        expirationDays: 7,
      })

      expect(urlEntry).toBeDefined()
      expect(urlEntry?.expiresAt).toBeDefined()
      expect(urlEntry?.expiresAt!.getTime()).toBeGreaterThan(Date.now())
    })

    it('should return null for invalid URL', () => {
      const urlEntry = tinyUrl.createShortUrl('not-a-url')
      expect(urlEntry).toBeNull()
    })

    it('should return null for URL that is too long', () => {
      const longUrl = `https://example.com/${'a'.repeat(3000)}`
      const urlEntry = tinyUrl.createShortUrl(longUrl)
      expect(urlEntry).toBeNull()
    })

    it('should return null for blocked domain', () => {
      const tinyUrl = new TinyUrlSystem({ blockedDomains: ['spam.com'] })
      const urlEntry = tinyUrl.createShortUrl('https://spam.com/test')
      expect(urlEntry).toBeNull()
    })

    it('should return null for domain not in allowed list', () => {
      const tinyUrl = new TinyUrlSystem({ allowedDomains: ['example.com'] })
      const urlEntry = tinyUrl.createShortUrl('https://other.com/test')
      expect(urlEntry).toBeNull()
    })

    it('should return existing URL if already exists', () => {
      const urlEntry1 = tinyUrl.createShortUrl('https://example.com/test')
      const urlEntry2 = tinyUrl.createShortUrl('https://example.com/test')

      expect(urlEntry1).toBeDefined()
      expect(urlEntry2).toBeDefined()
      expect(urlEntry1?.id).toBe(urlEntry2?.id)
    })

    it('should return null if custom code already exists', () => {
      tinyUrl.createShortUrl('https://example.com/test1', { customCode: 'test123' })
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test2', { customCode: 'test123' })

      expect(urlEntry).toBeNull()
    })
  })

  describe('URL Resolution', () => {
    it('should resolve a short URL', () => {
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test')
      const resolvedUrl = tinyUrl.resolveUrl(urlEntry!.shortCode)

      expect(resolvedUrl).toBe('https://example.com/test')
    })

    it('should return null for non-existent short code', () => {
      const resolvedUrl = tinyUrl.resolveUrl('nonexistent')
      expect(resolvedUrl).toBeNull()
    })

    it('should return null for inactive URL', () => {
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test')
      tinyUrl.deleteUrl(urlEntry!.shortCode)
      const resolvedUrl = tinyUrl.resolveUrl(urlEntry!.shortCode)

      expect(resolvedUrl).toBeNull()
    })

    it('should return null for expired URL', () => {
      const tinyUrl = new TinyUrlSystem({ enableExpiration: true, defaultExpirationDays: -1 })
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test')
      const resolvedUrl = tinyUrl.resolveUrl(urlEntry!.shortCode)

      expect(resolvedUrl).toBeNull()
    })

    it('should update click count when resolving', () => {
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test')
      const initialClickCount = urlEntry!.clickCount

      tinyUrl.resolveUrl(urlEntry!.shortCode)
      const updatedUrl = tinyUrl.getUrl(urlEntry!.shortCode)

      expect(updatedUrl!.clickCount).toBe(initialClickCount + 1)
    })

    it('should record analytics when resolving', () => {
      const tinyUrl = new TinyUrlSystem({ enableAnalytics: true })
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test')

      tinyUrl.resolveUrl(urlEntry!.shortCode, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        referrer: 'https://google.com',
        country: 'US',
      })

      const analytics = tinyUrl.getAnalytics(urlEntry!.shortCode)
      expect(analytics).toBeDefined()
      expect(analytics!.totalClicks).toBe(1)
    })
  })

  describe('URL Management', () => {
    it('should get URL by short code', () => {
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test')
      const retrieved = tinyUrl.getUrl(urlEntry!.shortCode)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(urlEntry!.id)
      expect(retrieved?.originalUrl).toBe('https://example.com/test')
    })

    it('should update URL metadata', () => {
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test')
      const updated = tinyUrl.updateUrl(urlEntry!.shortCode, {
        title: 'Updated Title',
        description: 'Updated Description',
        tags: ['updated', 'test'],
        expirationDays: 14,
      })

      expect(updated).toBeDefined()
      expect(updated?.metadata.title).toBe('Updated Title')
      expect(updated?.metadata.description).toBe('Updated Description')
      expect(updated?.metadata.tags).toEqual(['updated', 'test'])
      expect(updated?.expiresAt).toBeDefined()
    })

    it('should delete URL', () => {
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test')
      const deleted = tinyUrl.deleteUrl(urlEntry!.shortCode)

      expect(deleted).toBe(true)
      expect(tinyUrl.getUrl(urlEntry!.shortCode)).toBeNull()
    })

    it('should return false when deleting non-existent URL', () => {
      const deleted = tinyUrl.deleteUrl('nonexistent')
      expect(deleted).toBe(false)
    })
  })

  describe('URL Listing and Search', () => {
    it('should get all URLs', () => {
      const urls = tinyUrl.getUrls()
      expect(Array.isArray(urls)).toBe(true)
      expect(urls.length).toBeGreaterThan(0)
    })

    it('should get URLs with filters', () => {
      tinyUrl.createShortUrl('https://example.com/test1', { createdBy: 'user1' })
      tinyUrl.createShortUrl('https://example.com/test2', { createdBy: 'user2' })

      const user1Urls = tinyUrl.getUrls({ createdBy: 'user1' })
      expect(user1Urls.length).toBeGreaterThan(0)
      expect(user1Urls.every(url => url.metadata.createdBy === 'user1')).toBe(true)
    })

    it('should get URLs by tags', () => {
      tinyUrl.createShortUrl('https://example.com/test1', { tags: ['test', 'example'] })
      tinyUrl.createShortUrl('https://example.com/test2', { tags: ['demo', 'example'] })

      const testUrls = tinyUrl.getUrls({ tags: ['test'] })
      expect(testUrls.length).toBeGreaterThan(0)
      expect(testUrls.every(url => url.metadata.tags?.includes('test'))).toBe(true)
    })

    it('should get only active URLs', () => {
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test')
      tinyUrl.deleteUrl(urlEntry!.shortCode)

      const activeUrls = tinyUrl.getUrls({ activeOnly: true })
      expect(activeUrls.every(url => url.isActive)).toBe(true)
    })

    it('should limit and offset URLs', () => {
      const urls = tinyUrl.getUrls({ limit: 2, offset: 0 })
      expect(urls.length).toBeLessThanOrEqual(2)
    })

    it('should search URLs', () => {
      tinyUrl.createShortUrl('https://example.com/search-test', {
        title: 'Search Test Page',
        description: 'A page for testing search functionality',
      })

      const results = tinyUrl.searchUrls('search')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(url => url.metadata.title?.includes('Search'))).toBe(true)
    })
  })

  describe('Analytics', () => {
    it('should provide analytics when enabled', () => {
      const tinyUrl = new TinyUrlSystem({ enableAnalytics: true })
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test')

      tinyUrl.resolveUrl(urlEntry!.shortCode, {
        country: 'US',
        referrer: 'https://google.com',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      })

      const analytics = tinyUrl.getAnalytics(urlEntry!.shortCode)
      expect(analytics).toBeDefined()
      expect(analytics!.totalClicks).toBe(1)
    })

    it('should return null for analytics when disabled', () => {
      const tinyUrl = new TinyUrlSystem({ enableAnalytics: false })
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test')

      const analytics = tinyUrl.getAnalytics(urlEntry!.shortCode)
      expect(analytics).toBeNull()
    })

    it('should track clicks by date', () => {
      const tinyUrl = new TinyUrlSystem({ enableAnalytics: true })
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test')

      tinyUrl.resolveUrl(urlEntry!.shortCode)
      const analytics = tinyUrl.getAnalytics(urlEntry!.shortCode)

      expect(analytics!.clicksByDate.length).toBeGreaterThan(0)
      expect(analytics!.clicksByDate[0].clicks).toBe(1)
    })

    it('should track clicks by country', () => {
      const tinyUrl = new TinyUrlSystem({ enableAnalytics: true })
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test')

      tinyUrl.resolveUrl(urlEntry!.shortCode, { country: 'US' })
      const analytics = tinyUrl.getAnalytics(urlEntry!.shortCode)

      expect(analytics!.clicksByCountry.length).toBeGreaterThan(0)
      expect(analytics!.clicksByCountry[0].country).toBe('US')
    })

    it('should track clicks by device', () => {
      const tinyUrl = new TinyUrlSystem({ enableAnalytics: true })
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test')

      tinyUrl.resolveUrl(urlEntry!.shortCode, {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      })
      const analytics = tinyUrl.getAnalytics(urlEntry!.shortCode)

      expect(analytics!.clicksByDevice.length).toBeGreaterThan(0)
      expect(analytics!.clicksByDevice[0].device).toBe('Mobile')
    })
  })

  describe('Statistics', () => {
    it('should provide statistics', () => {
      const stats = tinyUrl.getStatistics()

      expect(stats).toBeDefined()
      expect(typeof stats.totalUrls).toBe('number')
      expect(typeof stats.activeUrls).toBe('number')
      expect(typeof stats.expiredUrls).toBe('number')
      expect(typeof stats.totalClicks).toBe('number')
      expect(typeof stats.averageClicksPerUrl).toBe('number')
      expect(typeof stats.mostPopularUrl).toBe('string')
      expect(typeof stats.averageUrlLength).toBe('number')
      expect(Array.isArray(stats.topDomains)).toBe(true)
      expect(Array.isArray(stats.recentUrls)).toBe(true)
    })

    it('should calculate average clicks per URL', () => {
      const stats = tinyUrl.getStatistics()
      expect(stats.averageClicksPerUrl).toBeGreaterThanOrEqual(0)
    })

    it('should identify most popular URL', () => {
      const stats = tinyUrl.getStatistics()
      expect(stats.mostPopularUrl).toBeDefined()
    })

    it('should calculate average URL length', () => {
      const stats = tinyUrl.getStatistics()
      expect(stats.averageUrlLength).toBeGreaterThan(0)
    })
  })

  describe('Cleanup', () => {
    it('should cleanup expired URLs', () => {
      const tinyUrl = new TinyUrlSystem({ enableExpiration: true, defaultExpirationDays: -1 })
      const _urlEntry = tinyUrl.createShortUrl('https://example.com/test')

      const cleanedCount = tinyUrl.cleanupExpiredUrls()
      expect(cleanedCount).toBeGreaterThan(0)

      const stats = tinyUrl.getStatistics()
      expect(stats.expiredUrls).toBeGreaterThan(0)
    })
  })

  describe('Configuration', () => {
    it('should update configuration', () => {
      tinyUrl.updateConfig({ shortCodeLength: 8 })

      const urlEntry = tinyUrl.createShortUrl('https://example.com/test')
      expect(urlEntry!.shortCode.length).toBe(8)
    })
  })

  describe('Events', () => {
    it('should emit urlCreated event', () => {
      const listener = vi.fn()
      tinyUrl.on('urlCreated', listener)

      tinyUrl.createShortUrl('https://example.com/test')
      expect(listener).toHaveBeenCalledWith({ url: expect.any(Object) })
    })

    it('should emit urlClicked event', () => {
      const listener = vi.fn()
      tinyUrl.on('urlClicked', listener)

      const urlEntry = tinyUrl.createShortUrl('https://example.com/test')
      tinyUrl.resolveUrl(urlEntry!.shortCode)
      expect(listener).toHaveBeenCalledWith({
        url: expect.any(Object),
        clickData: expect.any(Object),
      })
    })

    it('should emit urlUpdated event', () => {
      const listener = vi.fn()
      tinyUrl.on('urlUpdated', listener)

      const urlEntry = tinyUrl.createShortUrl('https://example.com/test')
      tinyUrl.updateUrl(urlEntry!.shortCode, { title: 'Updated' })
      expect(listener).toHaveBeenCalledWith({ url: expect.any(Object) })
    })

    it('should emit urlDeleted event', () => {
      const listener = vi.fn()
      tinyUrl.on('urlDeleted', listener)

      const urlEntry = tinyUrl.createShortUrl('https://example.com/test')
      tinyUrl.deleteUrl(urlEntry!.shortCode)
      expect(listener).toHaveBeenCalledWith({ url: expect.any(Object) })
    })

    it('should emit urlExpired event', () => {
      const listener = vi.fn()
      const tinyUrlInstance = new TinyUrlSystem({ enableExpiration: true, defaultExpirationDays: -1 })
      tinyUrlInstance.on('urlExpired', listener)

      const urlEntry = tinyUrlInstance.createShortUrl('https://example.com/test')
      tinyUrlInstance.resolveUrl(urlEntry!.shortCode) // This will trigger expiration check

      expect(listener).toHaveBeenCalledWith({ url: expect.any(Object) })

      tinyUrlInstance.destroy()
    })

    it('should emit configUpdated event', () => {
      const listener = vi.fn()
      tinyUrl.on('configUpdated', listener)

      tinyUrl.updateConfig({ shortCodeLength: 8 })
      expect(listener).toHaveBeenCalledWith({ config: expect.any(Object) })
    })

    it('should emit cleanupCompleted event', () => {
      const listener = vi.fn()
      tinyUrl.on('cleanupCompleted', listener)

      tinyUrl.cleanupExpiredUrls()
      expect(listener).toHaveBeenCalledWith({ count: expect.any(Number) })
    })

    it('should emit destroyed event', () => {
      const listener = vi.fn()
      tinyUrl.on('destroyed', listener)

      tinyUrl.destroy()
      expect(listener).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty search query', () => {
      const results = tinyUrl.searchUrls('')
      expect(Array.isArray(results)).toBe(true)
    })

    it('should handle special characters in URLs', () => {
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test?param=value&other=123')
      expect(urlEntry).toBeDefined()
      expect(urlEntry?.originalUrl).toBe('https://example.com/test?param=value&other=123')
    })

    it('should handle very long custom codes', () => {
      const longCode = 'a'.repeat(100)
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test', {
        customCode: longCode,
      })

      expect(urlEntry).toBeDefined()
      expect(urlEntry?.shortCode).toBe(longCode)
    })

    it('should handle URLs with fragments', () => {
      const urlEntry = tinyUrl.createShortUrl('https://example.com/test#section')
      expect(urlEntry).toBeDefined()
      expect(urlEntry?.originalUrl).toBe('https://example.com/test#section')
    })

    it('should handle case-sensitive short codes', () => {
      const urlEntry1 = tinyUrl.createShortUrl('https://example.com/test1', { customCode: 'ABC123' })
      const urlEntry2 = tinyUrl.createShortUrl('https://example.com/test2', { customCode: 'abc123' })

      expect(urlEntry1).toBeDefined()
      expect(urlEntry2).toBeNull() // Should conflict with case-sensitive code
    })
  })
})
