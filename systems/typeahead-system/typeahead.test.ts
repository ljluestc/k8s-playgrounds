import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TypeaheadConfig } from './typeahead'
import { TypeaheadSystem } from './typeahead'

describe('TypeaheadSystem', () => {
  let typeahead: TypeaheadSystem

  beforeEach(() => {
    typeahead = new TypeaheadSystem()
  })

  afterEach(() => {
    typeahead.destroy()
  })

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      expect(typeahead).toBeDefined()
      expect(typeahead.getStatistics().totalItems).toBeGreaterThan(0)
    })

    it('should initialize with custom config', () => {
      const config: Partial<TypeaheadConfig> = {
        minQueryLength: 2,
        maxResults: 5,
        debounceMs: 500,
        caseSensitive: true,
        fuzzyMatch: false,
        highlightMatches: false,
      }

      const customTypeahead = new TypeaheadSystem(config)
      expect(customTypeahead).toBeDefined()
      customTypeahead.destroy()
    })

    it('should initialize with default data', () => {
      const stats = typeahead.getStatistics()
      expect(stats.totalItems).toBeGreaterThan(0)
      expect(stats.categories.length).toBeGreaterThan(0)
    })
  })

  describe('Item Management', () => {
    it('should add an item', () => {
      const item = typeahead.addItem({
        text: 'Test Item',
        value: 'test',
        category: 'Test',
      })

      expect(item).toBeDefined()
      expect(item.id).toBeDefined()
      expect(item.text).toBe('Test Item')
      expect(item.value).toBe('test')
      expect(item.category).toBe('Test')
    })

    it('should add an item with custom id', () => {
      const item = typeahead.addItem({
        id: 'custom-id',
        text: 'Custom Item',
        value: 'custom',
      })

      expect(item.id).toBe('custom-id')
    })

    it('should remove an item', () => {
      const item = typeahead.addItem({
        text: 'To Remove',
        value: 'remove',
      })

      const removed = typeahead.removeItem(item.id)
      expect(removed).toBe(true)

      const retrieved = typeahead.getItem(item.id)
      expect(retrieved).toBeNull()
    })

    it('should return false when removing non-existent item', () => {
      const removed = typeahead.removeItem('non-existent')
      expect(removed).toBe(false)
    })

    it('should update an item', () => {
      const item = typeahead.addItem({
        text: 'Original',
        value: 'original',
      })

      const updated = typeahead.updateItem(item.id, {
        text: 'Updated',
        category: 'New Category',
      })

      expect(updated).toBeDefined()
      expect(updated?.text).toBe('Updated')
      expect(updated?.category).toBe('New Category')
      expect(updated?.value).toBe('original') // Should preserve unchanged fields
    })

    it('should return null when updating non-existent item', () => {
      const updated = typeahead.updateItem('non-existent', {
        text: 'Updated',
      })
      expect(updated).toBeNull()
    })

    it('should get an item by id', () => {
      const item = typeahead.addItem({
        text: 'Test Item',
        value: 'test',
      })

      const retrieved = typeahead.getItem(item.id)
      expect(retrieved).toBeDefined()
      expect(retrieved?.text).toBe('Test Item')
    })

    it('should return null for non-existent item', () => {
      const retrieved = typeahead.getItem('non-existent')
      expect(retrieved).toBeNull()
    })
  })

  describe('Search Functionality', () => {
    it('should search for items', () => {
      const result = typeahead.search('apple')

      expect(result).toBeDefined()
      expect(result.items.length).toBeGreaterThan(0)
      expect(result.query).toBe('apple')
      expect(result.executionTime).toBeGreaterThanOrEqual(0)
    })

    it('should return empty results for query shorter than minQueryLength', () => {
      const typeahead = new TypeaheadSystem({ minQueryLength: 3 })
      const result = typeahead.search('ap')

      expect(result.items.length).toBe(0)
      expect(result.total).toBe(0)
    })

    it('should limit results to maxResults', () => {
      const typeahead = new TypeaheadSystem({ maxResults: 3 })
      const result = typeahead.search('a')

      expect(result.items.length).toBeLessThanOrEqual(3)
    })

    it('should filter by category', () => {
      const result = typeahead.search('apple', { category: 'Fruit' })

      expect(result.items.length).toBeGreaterThan(0)
      result.items.forEach((item) => {
        expect(item.category).toBe('Fruit')
      })
    })

    it('should perform case-insensitive search by default', () => {
      const result1 = typeahead.search('APPLE')
      const result2 = typeahead.search('apple')

      expect(result1.items.length).toBe(result2.items.length)
    })

    it('should perform case-sensitive search when enabled', () => {
      // Create a clean typeahead without default data
      const cleanTypeahead = new TypeaheadSystem({
        caseSensitive: true,
        fuzzyMatch: false,
        initializeDefaultData: false,
      })

      // Add items with different cases
      cleanTypeahead.addItem({ text: 'APPLE', value: 'apple-upper' })
      cleanTypeahead.addItem({ text: 'apple', value: 'apple-lower' })

      const result1 = cleanTypeahead.search('APPLE')
      const result2 = cleanTypeahead.search('apple')

      expect(result1.items.length).toBe(1)
      expect(result2.items.length).toBe(1)
      expect(result1.items[0].text).toBe('APPLE')
      expect(result2.items[0].text).toBe('apple')

      cleanTypeahead.destroy()
    })

    it('should perform fuzzy matching when enabled', () => {
      const result = typeahead.search('apl', { fuzzy: true })

      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items.some(item => item.text.toLowerCase().includes('apple'))).toBe(true)
    })

    it('should disable fuzzy matching when specified', () => {
      const result = typeahead.search('apl', { fuzzy: false })

      expect(result.items.length).toBe(0)
    })

    it('should highlight matches when enabled', () => {
      const typeahead = new TypeaheadSystem({ highlightMatches: true })
      const result = typeahead.search('apple')

      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items[0].highlightedText).toContain('<mark>')
    })

    it('should not highlight matches when disabled', () => {
      const typeahead = new TypeaheadSystem({ highlightMatches: false })
      const result = typeahead.search('apple')

      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items[0].highlightedText).toBeUndefined()
    })

    it('should return suggestions', () => {
      const result = typeahead.search('apple')

      expect(result.suggestions).toBeDefined()
      expect(Array.isArray(result.suggestions)).toBe(true)
    })
  })

  describe('Async Search', () => {
    it('should perform async search with debouncing', async () => {
      const result = await typeahead.searchAsync('apple')

      expect(result).toBeDefined()
      expect(result.items.length).toBeGreaterThan(0)
    })

    it('should debounce multiple rapid searches', async () => {
      const typeahead = new TypeaheadSystem({ debounceMs: 50 })

      // Start multiple rapid searches
      const promise1 = typeahead.searchAsync('a')
      const promise2 = typeahead.searchAsync('ap')
      const promise3 = typeahead.searchAsync('app')
      const promise4 = typeahead.searchAsync('apple')

      // Wait for all to complete
      const results = await Promise.all([promise1, promise2, promise3, promise4])

      // All should return the same result (last search)
      expect(results[0].query).toBe('apple')
      expect(results[1].query).toBe('apple')
      expect(results[2].query).toBe('apple')
      expect(results[3].query).toBe('apple')
    })
  })

  describe('Suggestions', () => {
    it('should get suggestions for a query', () => {
      const suggestions = typeahead.getSuggestions('apple')

      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBeGreaterThan(0)
    })

    it('should limit suggestions', () => {
      const suggestions = typeahead.getSuggestions('a', 3)

      expect(suggestions.length).toBeLessThanOrEqual(3)
    })

    it('should return empty suggestions for short queries', () => {
      const typeahead = new TypeaheadSystem({ minQueryLength: 3 })
      const suggestions = typeahead.getSuggestions('ap')

      expect(suggestions.length).toBe(0)
    })
  })

  describe('Category Management', () => {
    it('should get items by category', () => {
      const fruitItems = typeahead.getItemsByCategory('Fruit')

      expect(Array.isArray(fruitItems)).toBe(true)
      expect(fruitItems.length).toBeGreaterThan(0)
      fruitItems.forEach((item) => {
        expect(item.category).toBe('Fruit')
      })
    })

    it('should return empty array for non-existent category', () => {
      const items = typeahead.getItemsByCategory('NonExistent')
      expect(items.length).toBe(0)
    })

    it('should get all categories', () => {
      const categories = typeahead.getCategories()

      expect(Array.isArray(categories)).toBe(true)
      expect(categories.length).toBeGreaterThan(0)
      expect(categories).toContain('Fruit')
    })
  })

  describe('Caching', () => {
    it('should cache search results', () => {
      const result1 = typeahead.search('apple')
      const result2 = typeahead.search('apple')

      expect(result1).toBe(result2) // Same object reference
    })

    it('should clear cache', () => {
      typeahead.search('apple')
      typeahead.clearCache()

      const result = typeahead.search('apple')
      expect(result).toBeDefined()
    })
  })

  describe('Statistics', () => {
    it('should provide statistics', () => {
      const stats = typeahead.getStatistics()

      expect(stats).toBeDefined()
      expect(typeof stats.totalQueries).toBe('number')
      expect(typeof stats.cacheHitRate).toBe('number')
      expect(typeof stats.totalItems).toBe('number')
      expect(Array.isArray(stats.categories)).toBe(true)
      expect(Array.isArray(stats.popularQueries)).toBe(true)
    })

    it('should track query statistics', () => {
      typeahead.search('apple')
      typeahead.search('banana')
      typeahead.search('apple')

      const stats = typeahead.getStatistics()
      expect(stats.totalQueries).toBeGreaterThanOrEqual(2)
      expect(stats.popularQueries.length).toBeGreaterThan(0)
      expect(stats.popularQueries[0].query).toBe('apple')
      expect(stats.popularQueries[0].count).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Configuration', () => {
    it('should update configuration', () => {
      typeahead.updateConfig({ maxResults: 5 })

      const result = typeahead.search('a')
      expect(result.items.length).toBeLessThanOrEqual(5)
    })
  })

  describe('Events', () => {
    it('should emit itemAdded event', () => {
      const listener = vi.fn()
      typeahead.on('itemAdded', listener)

      typeahead.addItem({ text: 'Test', value: 'test' })

      expect(listener).toHaveBeenCalledWith({ item: expect.any(Object) })
    })

    it('should emit itemRemoved event', () => {
      const listener = vi.fn()
      typeahead.on('itemRemoved', listener)

      const item = typeahead.addItem({ text: 'Test', value: 'test' })
      typeahead.removeItem(item.id)

      expect(listener).toHaveBeenCalledWith({ item })
    })

    it('should emit itemUpdated event', () => {
      const listener = vi.fn()
      typeahead.on('itemUpdated', listener)

      const item = typeahead.addItem({ text: 'Test', value: 'test' })
      typeahead.updateItem(item.id, { text: 'Updated' })

      expect(listener).toHaveBeenCalledWith({ item: expect.any(Object) })
    })

    it('should emit searchCompleted event', () => {
      const listener = vi.fn()
      typeahead.on('searchCompleted', listener)

      typeahead.search('apple')

      expect(listener).toHaveBeenCalledWith({
        query: 'apple',
        result: expect.any(Object),
      })
    })

    it('should emit cacheHit event', () => {
      const listener = vi.fn()
      typeahead.on('cacheHit', listener)

      typeahead.search('apple')
      typeahead.search('apple') // Second search should hit cache

      expect(listener).toHaveBeenCalledWith({
        query: 'apple',
        cacheKey: expect.any(String),
      })
    })

    it('should emit cacheCleared event', () => {
      const listener = vi.fn()
      typeahead.on('cacheCleared', listener)

      typeahead.clearCache()

      expect(listener).toHaveBeenCalled()
    })

    it('should emit configUpdated event', () => {
      const listener = vi.fn()
      typeahead.on('configUpdated', listener)

      typeahead.updateConfig({ maxResults: 5 })

      expect(listener).toHaveBeenCalledWith({ config: expect.any(Object) })
    })

    it('should emit destroyed event', () => {
      const listener = vi.fn()
      typeahead.on('destroyed', listener)

      typeahead.destroy()

      expect(listener).toHaveBeenCalled()
    })
  })

  describe('Cleanup', () => {
    it('should clear all data on destroy', () => {
      typeahead.addItem({ text: 'Test', value: 'test' })
      typeahead.search('test')

      typeahead.destroy()

      const stats = typeahead.getStatistics()
      expect(stats.totalItems).toBe(0)
      expect(stats.totalQueries).toBe(0)
    })

    it('should clear debounce timers on destroy', () => {
      typeahead.searchAsync('test')
      typeahead.destroy()

      // Should not throw any errors
      expect(true).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty search query', () => {
      const result = typeahead.search('')
      expect(result.items.length).toBe(0)
    })

    it('should handle special characters in search', () => {
      const result = typeahead.search('apple-pie')
      expect(result).toBeDefined()
    })

    it('should handle very long search queries', () => {
      const longQuery = 'a'.repeat(1000)
      const result = typeahead.search(longQuery)
      expect(result).toBeDefined()
    })

    it('should handle items with special characters', () => {
      const item = typeahead.addItem({
        text: 'Item with special chars: !@#$%^&*()',
        value: 'special',
      })

      expect(item).toBeDefined()
      expect(item.text).toBe('Item with special chars: !@#$%^&*()')
    })

    it('should handle items with unicode characters', () => {
      const item = typeahead.addItem({
        text: 'Item with unicode: 🍎🍌🍒',
        value: 'unicode',
      })

      expect(item).toBeDefined()
      expect(item.text).toBe('Item with unicode: 🍎🍌🍒')
    })
  })
})
